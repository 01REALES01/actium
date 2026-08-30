"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerfilActual, puedeCrearFormularioSST, puedeGestionarSST } from "@/lib/auth/roles";
import { getFotosFormulario, type FotoFormularioConUrl } from "@/lib/data/formularios-fotos";

/** Bucket compartido con las fotos de obra; el prefijo del path las separa. */
const BUCKET = "fotos-proyectos";

/**
 * Tope por formulario. Con la compresión del cliente (~300 KB por foto) son
 * unos 6 MB por inspección en el peor caso, que es un crecimiento de storage
 * predecible sin volver engorroso el registro fotográfico.
 */
const MAX_FOTOS_POR_FORMULARIO = 20;

/** Lo que acepta el bucket `fotos-proyectos`. */
const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/webp", "image/heic"];

const TAMANO_MAX = 8 * 1024 * 1024;

const EXTENSIONES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
};

/**
 * Sube una foto y la asocia al formulario.
 *
 * A diferencia de `uploadFotoAction` de proyectos, los identificadores de tenant
 * (empresa, subempresa, proyecto) NO se reciben del cliente: se leen de la fila
 * del formulario. El navegador solo dice a qué formulario adjuntar, y el acceso
 * a ese formulario ya está validado por rol. Así el path del objeto no puede
 * fabricarse desde el cliente para escribir bajo otra empresa.
 */
export async function subirFotoFormularioAction(
  formData: FormData,
): Promise<{ id: string; storagePath: string }> {
  const perfil = await getPerfilActual(createClient());
  if (!perfil) throw new Error("No autenticado.");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para adjuntar fotos a formularios SST.");
  }

  const formularioId = String(formData.get("formularioId") ?? "");
  if (!z.string().uuid().safeParse(formularioId).success) {
    throw new Error("Formulario inválido.");
  }

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No se recibió ninguna imagen.");
  }
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error("Formato no admitido. Use JPG, PNG, WEBP o HEIC.");
  }
  if (file.size > TAMANO_MAX) {
    throw new Error("La imagen supera el tamaño permitido.");
  }

  const db = createAdminClient();

  const { data: formulario, error: formError } = await db
    .from("formularios")
    .select("id, empresa_id, subempresa_id, proyecto_id")
    .eq("id", formularioId)
    .maybeSingle();

  if (formError) throw new Error(formError.message);
  if (!formulario) throw new Error("El formulario no existe.");

  const { count, error: countError } = await db
    .from("formulario_fotos")
    .select("id", { count: "exact", head: true })
    .eq("formulario_id", formularioId);

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= MAX_FOTOS_POR_FORMULARIO) {
    throw new Error(
      `Este formulario ya tiene el máximo de ${MAX_FOTOS_POR_FORMULARIO} fotos. Elimine alguna para agregar otra.`,
    );
  }

  const ext = EXTENSIONES[file.type] ?? "jpg";
  const storagePath = `${formulario.empresa_id}/${formulario.subempresa_id}/${formulario.proyecto_id}/formularios/${formularioId}/${crypto.randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { data: foto, error: insertError } = await db
    .from("formulario_fotos")
    .insert({
      formulario_id: formularioId,
      storage_path: storagePath,
      nombre: file.name,
      tamano_bytes: file.size,
      subido_por: perfil.id,
    })
    .select("id")
    .single();

  // Sin la fila el archivo es inalcanzable: no dejarlo huérfano en el bucket.
  if (insertError) {
    await db.storage.from(BUCKET).remove([storagePath]);
    throw new Error(insertError.message);
  }

  revalidatePath(`/sst/${formularioId}`);
  return { id: foto.id as string, storagePath };
}

/**
 * Fotos ya adjuntas a un formulario, con URL firmada.
 *
 * La consume el formulario de diligenciamiento al retomar un borrador
 * (`?borradorId=`), que es un client component y no puede leer de la base
 * directamente como sí hace el detalle en el servidor.
 */
export async function listarFotosFormularioAction(
  formularioId: string,
): Promise<FotoFormularioConUrl[]> {
  if (!z.string().uuid().safeParse(formularioId).success) return [];

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado.");

  return getFotosFormulario(supabase, formularioId);
}

const EliminarFotoFormularioSchema = z.object({
  fotoId: z.string().uuid(),
});

/**
 * Borra la foto del bucket y su registro.
 *
 * Exige `puedeGestionarSST`, un nivel más estricto que subir: eliminar evidencia
 * de una inspección ya firmada es una acción sensible y queda al mismo nivel que
 * borrar el formulario completo.
 *
 * El archivo se elimina antes que la fila, por el mismo criterio de
 * `eliminarFotoAction`: una fila sin archivo se ve como miniatura rota y es
 * rastreable; un archivo sin fila es basura invisible en el bucket.
 */
export async function eliminarFotoFormularioAction(
  input: z.infer<typeof EliminarFotoFormularioSchema>,
): Promise<void> {
  const parsed = EliminarFotoFormularioSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const perfil = await getPerfilActual(createClient());
  if (!perfil) throw new Error("No autenticado.");
  if (!puedeGestionarSST(perfil.rol)) {
    throw new Error("No tiene permisos para eliminar fotos de formularios SST.");
  }

  const db = createAdminClient();
  const { data: foto, error: selectError } = await db
    .from("formulario_fotos")
    .select("storage_path, formulario_id")
    .eq("id", parsed.data.fotoId)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (!foto) throw new Error("La foto ya no existe.");

  const { error: storageError } = await db.storage.from(BUCKET).remove([foto.storage_path]);
  if (storageError) throw new Error(storageError.message);

  const { error: deleteError } = await db
    .from("formulario_fotos")
    .delete()
    .eq("id", parsed.data.fotoId);

  if (deleteError) throw new Error(deleteError.message);

  revalidatePath(`/sst/${foto.formulario_id}`);
}
