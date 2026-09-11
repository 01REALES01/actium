"use server";

// =============================================================================
// Documentos de soldadura: borrador, emisión, reutilización y eliminación.
// =============================================================================
// Misma mecánica que los permisos SST (`permisos-sst.ts`): el PDF y un JSON de
// respaldo con los datos estructurados viajan al mismo path del bucket, y la
// fila en base de datos solo guarda lo que se busca. La diferencia es que aquí
// no hay proyecto: un procedimiento de soldadura es de la empresa.
//
// Todas las escrituras pasan por `createAdminClient()` DESPUÉS de validar el
// rol en el servidor: `auth_rol()` no lee bien el JWT y la RLS rechazaría la
// escritura aunque el usuario sí sea super_admin.
// =============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esSuperAdmin, type PerfilUsuario } from "@/lib/auth/roles";
import { hoyLocal } from "@/lib/fecha";
import {
  obtenerEspec,
  textoDe,
  type DocumentoTipo,
  type DocumentoVariante,
  type EspecDocumento,
  type ValoresDocumento,
} from "@/constants/soldadura";

const BUCKET = "pdfs-formularios";

/**
 * Error cuyo mensaje está escrito para el usuario y puede mostrarse tal cual.
 * Se distingue de un fallo inesperado —Supabase caído, un bug— porque ese no
 * debe enseñarse: se registra en el servidor y al usuario le llega un texto
 * genérico.
 */
class ErrorDeUso extends Error {}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

/**
 * Ejecuta el cuerpo de una acción y devuelve sus errores COMO VALOR.
 *
 * Existe por una razón concreta: en un build de producción, Next.js reemplaza
 * el mensaje de cualquier error LANZADO desde una Server Action por el texto
 * "An error occurred in the Server Components render…", para no filtrar
 * detalles internos. Es decir, ningún mensaje escrito aquí llegaría nunca al
 * usuario en producción —solo ese bloque en inglés—, y el usuario no sabría si
 * le falta llenar un campo o si el sistema está caído.
 *
 * Un valor de retorno, en cambio, viaja intacto. Por eso las acciones de este
 * módulo no lanzan hacia el cliente: devuelven `{ ok: false, error }`.
 */
async function conResultado<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await fn() };
  } catch (e) {
    if (e instanceof ErrorDeUso) return { ok: false, error: e.message };
    console.error("[soldadura] fallo inesperado en una acción:", e);
    return {
      ok: false,
      error: "No fue posible completar la operación. Intenta de nuevo o avisa al administrador.",
    };
  }
}

/**
 * Perfil autenticado con permiso de escritura, o error.
 *
 * No usa `getPerfilActual` porque ese ayudante devuelve `null` ante cualquier
 * tropiezo y aquí las causas hay que separarlas. `auth.getUser()` sale a la red
 * a validar el token contra Supabase: si esa petición se agota —red lenta,
 * Supabase caído— no significa que el usuario no tenga sesión, sino que no se
 * pudo comprobar. Responder "No autenticado" en ese caso lo manda a iniciar
 * sesión de nuevo por un problema de conexión, y su sesión estaba intacta.
 */
async function exigirSuperAdmin() {
  const supabase = createClient();

  let usuarioId: string;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) {
      throw new ErrorDeUso("Su sesión expiró. Vuelva a iniciar sesión.");
    }
    usuarioId = data.user.id;
  } catch (e) {
    if (e instanceof ErrorDeUso) throw e;
    console.error("[soldadura] no se pudo verificar la sesión contra Supabase:", e);
    throw new ErrorDeUso(
      "No fue posible verificar su sesión: el servidor no respondió a tiempo. " +
        "Revise su conexión e intente de nuevo; sus datos no se han perdido.",
    );
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, cargo, rol, email, empresa_id, subempresa_id, avatar_path")
    .eq("id", usuarioId)
    .single();

  const perfil = data as PerfilUsuario | null;

  if (error || !perfil) {
    console.error("[soldadura] no se pudo leer el perfil del usuario:", error);
    throw new ErrorDeUso("No fue posible leer su perfil de usuario. Contacte al administrador.");
  }

  if (!esSuperAdmin(perfil.rol)) {
    throw new ErrorDeUso("No tiene permisos para gestionar documentos de soldadura.");
  }

  return perfil;
}

/**
 * Empresa y subempresa propietarias del documento.
 *
 * NO salen del perfil: `super_admin` —el único rol que entra a este módulo— no
 * tiene empresa propia justamente porque las administra todas, y exigírsela
 * bloqueaba el guardado para el único usuario autorizado. El dueño se elige en
 * el formulario, que es lo mismo que hacen los formatos SST cuando toman la
 * empresa del proyecto que se selecciona.
 *
 * El par llega del cliente, así que se verifica contra la base: una subempresa
 * de otra empresa dejaría el documento con un dueño imposible y contaminaría su
 * consecutivo, que se numera por empresa.
 */
async function resolverPropietario(
  db: any,
  formData: FormData,
  perfil: { empresa_id: string | null; subempresa_id: string | null },
): Promise<{ empresaId: string; subempresaId: string }> {
  const empresaId = ((formData.get("empresaId") as string) || perfil.empresa_id || "").trim();
  const subempresaId = ((formData.get("subempresaId") as string) || perfil.subempresa_id || "").trim();

  if (!empresaId || !subempresaId) {
    throw new ErrorDeUso("Seleccione la empresa y la subempresa propietarias del documento.");
  }

  const { data } = await db
    .from("subempresas")
    .select("empresa_id")
    .eq("id", subempresaId)
    .maybeSingle();

  if (!data) throw new ErrorDeUso("La subempresa seleccionada no existe.");
  if (data.empresa_id !== empresaId) {
    throw new ErrorDeUso("La subempresa seleccionada no pertenece a la empresa indicada.");
  }

  return { empresaId, subempresaId };
}

/** Columnas de búsqueda que se copian del payload en cada guardado. */
function clavesDesdeValores(espec: EspecDocumento, valores: ValoresDocumento) {
  const { claves } = espec;
  return {
    numero: textoDe(valores, claves.numero) || null,
    titulo: textoDe(valores, claves.titulo) || null,
    proceso: textoDe(valores, claves.proceso) || null,
    wps_ref: textoDe(valores, claves.wpsRef) || null,
    pqr_ref: textoDe(valores, claves.pqrRef) || null,
    revision: textoDe(valores, claves.revision) || null,
    fecha: textoDe(valores, claves.fecha) || null,
  };
}

function leerFormData(formData: FormData) {
  const tipo = formData.get("tipo") as DocumentoTipo;
  const variante = formData.get("variante") as DocumentoVariante;
  const espec = obtenerEspec(tipo, variante);
  if (!espec) throw new ErrorDeUso("Formato de soldadura no reconocido.");

  const payloadStr = (formData.get("payload") as string) || "{}";
  let valores: ValoresDocumento;
  try {
    valores = JSON.parse(payloadStr);
  } catch {
    throw new ErrorDeUso("No fue posible leer los datos del documento.");
  }

  return {
    espec,
    tipo,
    variante,
    payloadStr,
    valores,
    documentoId: (formData.get("documentoId") as string) || "",
    existingPdfPath: (formData.get("existingPdfPath") as string) || "",
  };
}

/** Sube el JSON de respaldo al path hermano del PDF. */
async function subirRespaldo(db: any, storagePath: string, payloadStr: string): Promise<void> {
  const { error } = await db.storage
    .from(BUCKET)
    .upload(storagePath.replace(/\.pdf$/, ".json"), Buffer.from(payloadStr), {
      // El bucket solo admite application/pdf; el respaldo se declara así para
      // pasar la restricción MIME, igual que en los formatos SST.
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw new ErrorDeUso(`No fue posible guardar el respaldo. Detalle: ${error.message}`);
}

// ─── Borrador ────────────────────────────────────────────────────────────────

/**
 * Guarda el documento a medio diligenciar, sin generar PDF. Reserva la ruta que
 * ocupará el PDF y reutiliza esa misma ruta en cada guardado, para que un
 * borrador no multiplique archivos en Storage.
 */
export async function guardarBorradorSoldaduraAction(
  formData: FormData,
): Promise<Resultado<{ id: string; pdfPath: string; codigo: string }>> {
  return conResultado(() => guardarBorrador(formData));
}

async function guardarBorrador(formData: FormData): Promise<{
  id: string;
  pdfPath: string;
  codigo: string;
}> {
  const perfil = await exigirSuperAdmin();
  const { espec, tipo, variante, payloadStr, valores, documentoId, existingPdfPath } =
    leerFormData(formData);

  const db = createAdminClient();
  const { empresaId, subempresaId } = await resolverPropietario(db, formData, perfil);
  const storagePath =
    existingPdfPath || `${empresaId}/${subempresaId}/soldadura/${crypto.randomUUID()}.pdf`;

  await subirRespaldo(db, storagePath, payloadStr);

  const columnas = { ...clavesDesdeValores(espec, valores), pdf_generado_path: storagePath };
  let id = documentoId;
  let codigo = "";

  if (documentoId) {
    // Solo mientras siga siendo borrador: si otra pestaña ya lo emitió, esta no
    // puede devolverlo a borrador ni pisar su PDF.
    const { data, error } = await (db.from("documentos_soldadura") as any)
      .update(columnas)
      .eq("id", documentoId)
      .eq("estado", "borrador")
      .select("id, codigo_consecutivo");

    if (error) throw new ErrorDeUso(`No fue posible actualizar el borrador: ${error.message}`);
    if (!data?.length) {
      throw new ErrorDeUso("Este documento ya fue emitido y no puede guardarse como borrador.");
    }
    codigo = data[0].codigo_consecutivo ?? "";
  } else {
    const { data, error } = await (db.from("documentos_soldadura") as any)
      .insert({
        ...columnas,
        tipo,
        variante,
        estado: "borrador",
        empresa_id: empresaId,
        subempresa_id: subempresaId,
        creado_por: perfil.id,
      })
      .select("id, codigo_consecutivo")
      .single();

    if (error || !data) throw new ErrorDeUso(`No fue posible registrar el borrador: ${error?.message}`);
    id = data.id;
    codigo = data.codigo_consecutivo ?? "";
  }

  revalidatePath("/soldadura");
  revalidatePath(`/soldadura/${id}`);
  return { id, pdfPath: storagePath, codigo };
}

// ─── Emisión ─────────────────────────────────────────────────────────────────

/** Sube el PDF firmado y deja el documento en estado `firmado`. */
export async function guardarPdfSoldaduraAction(
  formData: FormData,
): Promise<Resultado<{ id: string; pdfPath: string }>> {
  return conResultado(() => guardarPdf(formData));
}

async function guardarPdf(formData: FormData): Promise<{
  id: string;
  pdfPath: string;
}> {
  const perfil = await exigirSuperAdmin();
  const { espec, tipo, variante, payloadStr, valores, documentoId, existingPdfPath } =
    leerFormData(formData);

  const pdfFile = formData.get("pdfFile") as File;
  if (!pdfFile) throw new ErrorDeUso("Archivo PDF requerido.");

  const db = createAdminClient();
  const { empresaId, subempresaId } = await resolverPropietario(db, formData, perfil);

  // Si la fila ya estaba emitida, esto es una REEMISIÓN, y hay que saberlo
  // ANTES de tocar el bucket: `firmado_at` conserva la fecha real de la firma y
  // la sustitución del archivo se anota aparte. Sellar hoy la firma de un
  // documento de hace ocho meses falsificaría el dato que un registro de
  // calidad no puede perder. De paso cierra un hueco: el `update` de más abajo
  // no lleva `.select()`, así que con un id inexistente afectaría cero filas y
  // devolvería éxito.
  let reemision = false;
  if (documentoId) {
    const { data: previo, error: errPrevio } = await db
      .from("documentos_soldadura")
      .select("estado")
      .eq("id", documentoId)
      .maybeSingle();
    if (errPrevio) throw new ErrorDeUso(`No fue posible leer el documento: ${errPrevio.message}`);
    if (!previo) throw new ErrorDeUso("El documento que intenta emitir ya no existe.");
    reemision = (previo as { estado: string }).estado !== "borrador";
  }

  const storagePath =
    existingPdfPath || `${empresaId}/${subempresaId}/soldadura/${crypto.randomUUID()}.pdf`;

  const { error: errPdf } = await db.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(await pdfFile.arrayBuffer()), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (errPdf) throw new ErrorDeUso(`Error guardando el PDF: ${errPdf.message}`);

  await subirRespaldo(db, storagePath, payloadStr);

  const ahora = new Date().toISOString();
  const columnas = {
    ...clavesDesdeValores(espec, valores),
    pdf_generado_path: storagePath,
    estado: "firmado" as const,
    ...(reemision
      ? { pdf_regenerado_at: ahora, pdf_regenerado_por: perfil.id }
      : { firmado_at: ahora }),
  };

  let id = documentoId;

  if (documentoId) {
    const { error } = await (db.from("documentos_soldadura") as any)
      .update(columnas)
      .eq("id", documentoId);
    if (error) throw new ErrorDeUso(`Error actualizando el documento: ${error.message}`);
  } else {
    const { data, error } = await (db.from("documentos_soldadura") as any)
      .insert({
        ...columnas,
        tipo,
        variante,
        empresa_id: empresaId,
        subempresa_id: subempresaId,
        creado_por: perfil.id,
      })
      .select("id")
      .single();
    if (error || !data) throw new ErrorDeUso(`Error registrando el documento: ${error?.message}`);
    id = data.id;
  }

  revalidatePath("/soldadura");
  revalidatePath(`/soldadura/${id}`);
  return { id, pdfPath: storagePath };
}

// ─── Reutilizar el último ────────────────────────────────────────────────────

/**
 * Vacía del payload lo que identifica a un documento concreto para poder
 * partir de él sin heredar su identidad. Ninguna IMAGEN se hereda —ni firmas,
 * ni croquis, ni el retrato del soldador, ni el registro fotográfico—: una
 * firma de otro día daría por certificado el documento de hoy, y arrastrar la
 * foto de un soldador al WPQ del siguiente calificaría a la persona equivocada.
 */
function limpiarParaReutilizar(espec: EspecDocumento, valores: ValoresDocumento): ValoresDocumento {
  const limpio: ValoresDocumento = { ...valores };

  for (const firma of espec.firmas) limpio[firma.id] = "";

  for (const seccion of espec.secciones) {
    for (const campo of seccion.campos) {
      if (campo.t === "galeria") limpio[campo.id] = [];
      else if (campo.t === "croquis" || campo.t === "foto") limpio[campo.id] = "";
    }
  }

  const { numero, revision, fecha } = espec.claves;
  if (numero) limpio[numero] = "";
  if (revision) limpio[revision] = "";
  if (fecha) limpio[fecha] = hoyLocal();

  return limpio;
}

export async function obtenerUltimoSoldaduraAction(
  tipo: DocumentoTipo,
  variante: DocumentoVariante,
): Promise<Resultado<{
  encontrado: boolean;
  valores: ValoresDocumento | null;
  referencia: { numero: string | null; fecha: string | null } | null;
  motivo?: string;
}>> {
  return conResultado(() => obtenerUltimo(tipo, variante));
}

async function obtenerUltimo(
  tipo: DocumentoTipo,
  variante: DocumentoVariante,
): Promise<{
  encontrado: boolean;
  valores: ValoresDocumento | null;
  referencia: { numero: string | null; fecha: string | null } | null;
  motivo?: string;
}> {
  await exigirSuperAdmin();
  const espec = obtenerEspec(tipo, variante);
  const db = createAdminClient();

  // Varios candidatos: un documento emitido puede haber perdido su respaldo y
  // hay que seguir buscando hacia atrás en lugar de rendirse en el primero.
  const { data: filas } = await (db.from("documentos_soldadura") as any)
    .select("numero, fecha, created_at, pdf_generado_path")
    .eq("tipo", tipo)
    .eq("variante", variante)
    .neq("estado", "borrador")
    .not("pdf_generado_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  for (const candidato of filas ?? []) {
    const { data: archivo } = await db.storage
      .from(BUCKET)
      .download(candidato.pdf_generado_path.replace(/\.pdf$/, ".json"));
    if (!archivo) continue;

    try {
      const valores = JSON.parse(await archivo.text()) as ValoresDocumento;
      return {
        encontrado: true,
        valores: limpiarParaReutilizar(espec, valores),
        referencia: {
          numero: candidato.numero,
          fecha: candidato.fecha || candidato.created_at?.split("T")[0] || null,
        },
      };
    } catch (e) {
      console.error("Respaldo JSON ilegible al reutilizar documento de soldadura:", e);
    }
  }

  return {
    encontrado: false,
    valores: null,
    referencia: null,
    motivo: filas?.length
      ? "El documento anterior no conserva sus datos estructurados: solo existe su PDF y no hay nada que copiar."
      : "Aún no hay un documento anterior de este formato para copiar.",
  };
}

// ─── Eliminación ─────────────────────────────────────────────────────────────

export async function eliminarDocumentoSoldaduraAction(id: string): Promise<Resultado<null>> {
  return conResultado(async () => {
    await eliminarDocumento(id);
    return null;
  });
}

async function eliminarDocumento(id: string): Promise<void> {
  await exigirSuperAdmin();
  const db = createAdminClient();

  const { data } = await (db.from("documentos_soldadura") as any)
    .select("pdf_generado_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await (db.from("documentos_soldadura") as any).delete().eq("id", id);
  if (error) throw new ErrorDeUso(`No fue posible eliminar el documento: ${error.message}`);

  // El archivo se borra después de la fila: si falla, queda un huérfano en
  // Storage —molesto pero inocuo—, mientras que al revés quedaría una fila
  // apuntando a un PDF que ya no existe.
  if (data?.pdf_generado_path) {
    await db.storage
      .from(BUCKET)
      .remove([data.pdf_generado_path, data.pdf_generado_path.replace(/\.pdf$/, ".json")]);
  }

  revalidatePath("/soldadura");
}
