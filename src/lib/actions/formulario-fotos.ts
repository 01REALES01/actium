"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerfilActual, puedeCrearFormularioSST, puedeGestionarSST } from "@/lib/auth/roles";
import { getFotosFormulario, type FotoFormularioConUrl } from "@/lib/data/formularios-fotos";
import { HERRAMIENTAS_PREOP } from "@/constants/preoperacional";

/** Bucket compartido con las fotos de obra; el prefijo del path las separa. */
const BUCKET = "fotos-proyectos";

/**
 * Tope de fotos GENERALES por formulario (sin equipo asociado). Las fotos de
 * equipo no cuentan aquí: las limita el índice único de la migración
 * `formulario_fotos_por_equipo` (una por equipo, la cantidad la fija el
 * catálogo de herramientas, no un tope arbitrario).
 */
const MAX_FOTOS_POR_FORMULARIO = 20;

/**
 * Lo que acepta esta acción. Es más estricto que el bucket `fotos-proyectos`
 * (que también admite WEBP y HEIC): toda foto que pasa por aquí puede terminar
 * incrustada en el PDF del preoperacional, y `@react-pdf/renderer` no
 * decodifica WEBP ni HEIC. Aceptar un formato que después no se puede mostrar
 * en el documento sería peor que rechazarlo al subir.
 */
const TIPOS_PERMITIDOS = ["image/png", "image/jpeg"];

const TAMANO_MAX = 8 * 1024 * 1024;

const EXTENSIONES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

const HERRAMIENTA_IDS = new Set(HERRAMIENTAS_PREOP.map((h) => h.id));

/**
 * Sube una foto y la asocia al formulario, opcionalmente a un equipo concreto.
 *
 * A diferencia de `uploadFotoAction` de proyectos, los identificadores de tenant
 * (empresa, subempresa, proyecto) NO se reciben del cliente: se leen de la fila
 * del formulario. El navegador solo dice a qué formulario adjuntar, y el acceso
 * a ese formulario ya está validado por rol. Así el path del objeto no puede
 * fabricarse desde el cliente para escribir bajo otra empresa.
 *
 * `herramientaId` y `equipoUid`, cuando vienen, atan la foto a "esa pieza": es
 * el requisito "una pieza, una foto" del preoperacional. Una segunda foto para
 * el mismo equipo reemplaza a la primera en vez de acumularse, para que la
 * restricción de unicidad de la base nunca se dispare por una carrera.
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

  const herramientaIdRaw = formData.get("herramientaId");
  const equipoUidRaw = formData.get("equipoUid");
  const herramientaId = typeof herramientaIdRaw === "string" && herramientaIdRaw ? herramientaIdRaw : null;
  const equipoUid = typeof equipoUidRaw === "string" && equipoUidRaw ? equipoUidRaw : null;

  if ((herramientaId && !equipoUid) || (!herramientaId && equipoUid)) {
    throw new Error("Datos de equipo incompletos.");
  }
  if (herramientaId && !HERRAMIENTA_IDS.has(herramientaId)) {
    throw new Error("Herramienta no reconocida.");
  }

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No se recibió ninguna imagen.");
  }
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error(
      "Formato no admitido. Esta foto se incrusta en el PDF de la inspección y solo admite JPG o PNG.",
    );
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

  if (equipoUid && herramientaId) {
    // Reemplazo: la foto anterior de este equipo se borra antes de insertar
    // la nueva. Así "una pieza, una foto" es literal y nunca choca con el
    // índice único (formulario_id, herramienta_id, equipo_uid).
    const { data: anterior } = await db
      .from("formulario_fotos")
      .select("id, storage_path")
      .eq("formulario_id", formularioId)
      .eq("herramienta_id", herramientaId)
      .eq("equipo_uid", equipoUid)
      .maybeSingle();

    if (anterior) {
      await db.storage.from(BUCKET).remove([anterior.storage_path]);
      await db.from("formulario_fotos").delete().eq("id", anterior.id);
    }
  } else {
    const { count, error: countError } = await db
      .from("formulario_fotos")
      .select("id", { count: "exact", head: true })
      .eq("formulario_id", formularioId)
      .is("equipo_uid", null);

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= MAX_FOTOS_POR_FORMULARIO) {
      throw new Error(
        `Este formulario ya tiene el máximo de ${MAX_FOTOS_POR_FORMULARIO} fotos generales. Elimine alguna para agregar otra.`,
      );
    }
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
      herramienta_id: herramientaId,
      equipo_uid: equipoUid,
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
 * El nivel de permiso depende del estado del formulario: mientras está en
 * `borrador`, quien lo diligencia (`puedeCrearFormularioSST`, rol sst o
 * super_admin) puede corregir su propia foto — con "una pieza, una foto" es
 * normal repetir la toma. Una vez `firmado`, eliminar evidencia de un
 * documento ya emitido pasa a exigir `puedeGestionarSST` (solo super_admin),
 * el mismo nivel que borrar el formulario completo.
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

  const db = createAdminClient();
  const { data: foto, error: selectError } = await db
    .from("formulario_fotos")
    .select("storage_path, formulario_id, formularios(estado)")
    .eq("id", parsed.data.fotoId)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (!foto) throw new Error("La foto ya no existe.");

  const estadoFormulario = (foto as unknown as { formularios: { estado: string } | null }).formularios
    ?.estado;
  const permitido =
    estadoFormulario === "borrador"
      ? puedeCrearFormularioSST(perfil.rol)
      : puedeGestionarSST(perfil.rol);

  if (!permitido) {
    throw new Error("No tiene permisos para eliminar fotos de este formulario.");
  }

  const { error: storageError } = await db.storage.from(BUCKET).remove([foto.storage_path]);
  if (storageError) throw new Error(storageError.message);

  const { error: deleteError } = await db
    .from("formulario_fotos")
    .delete()
    .eq("id", parsed.data.fotoId);

  if (deleteError) throw new Error(deleteError.message);

  revalidatePath(`/sst/${foto.formulario_id}`);
}
