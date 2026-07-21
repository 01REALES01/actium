import type { TypedSupabaseClient } from "@/types/database.types";

type Client = TypedSupabaseClient;

// Path convention per storage policies: {empresa_id}/{subempresa_id}/{...}/{filename}

export async function uploadFotoProyecto(
  supabase: Client,
  file: File,
  opts: {
    empresaId: string;
    subempresaId: string;
    proyectoId: string;
    lat?: number;
    lng?: number;
    capturadaAt?: string;
  },
): Promise<{ storagePath: string; fotoId: string }> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${opts.empresaId}/${opts.subempresaId}/${opts.proyectoId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-proyectos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("fotos")
    .insert({
      proyecto_id: opts.proyectoId,
      storage_path: storagePath,
      nombre: file.name,
      descripcion: null,
      autor_id: null,
      exif_json: null,
      tamano_bytes: file.size,
      lat: opts.lat ?? null,
      lng: opts.lng ?? null,
      capturada_at: opts.capturadaAt ?? null,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  return { storagePath, fotoId: data.id };
}

export async function uploadDocumentoEmpleado(
  supabase: Client,
  file: File,
  opts: {
    empresaId: string;
    subempresaId: string;
    empleadoId: string;
  },
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "pdf";
  const storagePath = `${opts.empresaId}/${opts.subempresaId}/${opts.empleadoId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("documentos-empleados")
    .upload(storagePath, file, { contentType: file.type });

  if (error) throw error;
  return storagePath;
}

export async function uploadPdfFormulario(
  supabase: Client,
  pdfBlob: Blob,
  opts: {
    empresaId: string;
    subempresaId: string;
    formularioId: string;
  },
): Promise<string> {
  const storagePath = `${opts.empresaId}/${opts.subempresaId}/${opts.formularioId}/${crypto.randomUUID()}.pdf`;

  const { error } = await supabase.storage
    .from("pdfs-formularios")
    .upload(storagePath, pdfBlob, { contentType: "application/pdf" });

  if (error) throw error;
  return storagePath;
}

export async function uploadComprobanteMovimiento(
  supabase: Client,
  file: File | { bytes: Uint8Array; nombre: string; tipo: string },
  opts: {
    empresaId: string;
    subempresaId: string | null;
    proyectoId: string;
  },
): Promise<string> {
  const nombre = file instanceof File ? file.name : file.nombre;
  const tipo = file instanceof File ? file.type : file.tipo;
  const cuerpo = file instanceof File ? file : file.bytes;

  const ext = (nombre.split(".").pop() || "pdf").toLowerCase();
  const subseg = opts.subempresaId ?? opts.proyectoId;
  const storagePath = `${opts.empresaId}/${subseg}/${opts.proyectoId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("comprobantes-finanzas")
    .upload(storagePath, cuerpo, { contentType: tipo || "application/octet-stream" });

  if (error) throw error;
  return storagePath;
}

export async function getSignedUrl(
  supabase: Client,
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
