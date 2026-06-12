"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RegistrarAvanceSchema = z.object({
  proyectoId: z.string(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  avanceReal: z.number().min(0).max(100),
  avanceProyectado: z.number().min(0).max(100),
  notas: z.string().optional(),
});

export async function registrarAvanceAction(
  input: z.infer<typeof RegistrarAvanceSchema>,
): Promise<{ id: string }> {
  const parsed = RegistrarAvanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Datos inválidos: ${parsed.error.message}`);
  }

  const supabase = createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    throw new Error("No autenticado");
  }

  const { data, error } = await supabase.from("proyecto_avances").upsert({
    proyecto_id: parsed.data.proyectoId,
    fecha: parsed.data.fecha,
    avance_real: parsed.data.avanceReal,
    avance_proyectado: parsed.data.avanceProyectado,
    registrado_por: userData.user.id,
  } as any, { onConflict: 'proyecto_id, fecha' }).select('id').single();

  if (error) throw new Error(error.message);

  revalidatePath(`/proyectos/${parsed.data.proyectoId}`);
  return { id: data as string };
}

// ─── Crear / editar proyecto ──────────────────────────────────────────────────

const ProyectoEstadoEnum = z.enum([
  "planificacion",
  "en_curso",
  "pausado",
  "completado",
  "cancelado",
]);

const CrearProyectoSchema = z.object({
  empresaId: z.string().min(1),
  subempresaId: z.string().min(1),
  nombre: z.string().min(2).max(160),
  codigo: z.string().min(1).max(40),
  descripcion: z.string().max(2000).optional(),
  ubicacion: z.string().max(200).optional(),
  ciudad: z.string().max(120).optional(),
  estado: ProyectoEstadoEnum.optional(),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFinProyectada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  presupuestoTotal: z.number().min(0).optional(),
});

export async function crearProyectoAction(
  input: z.infer<typeof CrearProyectoSchema>,
): Promise<{ id: string }> {
  const parsed = CrearProyectoSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Datos inválidos: ${parsed.error.issues[0]?.message ?? parsed.error.message}`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión expirada. Inicia sesión de nuevo.");

  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      empresa_id: parsed.data.empresaId,
      subempresa_id: parsed.data.subempresaId,
      nombre: parsed.data.nombre,
      codigo: parsed.data.codigo,
      descripcion: parsed.data.descripcion ?? null,
      ubicacion: parsed.data.ubicacion ?? null,
      ciudad: parsed.data.ciudad ?? null,
      estado: parsed.data.estado ?? "planificacion",
      fecha_inicio: parsed.data.fechaInicio ?? null,
      fecha_fin_proyectada: parsed.data.fechaFinProyectada ?? null,
      presupuesto_total: parsed.data.presupuestoTotal ?? null,
      created_by: user.id,
    } as any)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un proyecto con ese código en la empresa.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/proyectos");
  return { id: (data as { id: string }).id };
}

const EditarProyectoSchema = z.object({
  proyectoId: z.string().min(1),
  nombre: z.string().min(2).max(160),
  codigo: z.string().min(1).max(40),
  descripcion: z.string().max(2000).optional(),
  ubicacion: z.string().max(200).optional(),
  ciudad: z.string().max(120).optional(),
  estado: ProyectoEstadoEnum,
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaFinProyectada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  presupuestoTotal: z.number().min(0).optional(),
});

export async function editarProyectoAction(
  input: z.infer<typeof EditarProyectoSchema>,
): Promise<void> {
  const parsed = EditarProyectoSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Datos inválidos: ${parsed.error.issues[0]?.message ?? parsed.error.message}`);
  }

  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("proyectos")
    .update({
      nombre: parsed.data.nombre,
      codigo: parsed.data.codigo,
      descripcion: parsed.data.descripcion ?? null,
      ubicacion: parsed.data.ubicacion ?? null,
      ciudad: parsed.data.ciudad ?? null,
      estado: parsed.data.estado,
      fecha_inicio: parsed.data.fechaInicio ?? null,
      fecha_fin_proyectada: parsed.data.fechaFinProyectada ?? null,
      presupuesto_total: parsed.data.presupuestoTotal ?? null,
    })
    .eq("id", parsed.data.proyectoId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un proyecto con ese código en la empresa.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${parsed.data.proyectoId}`);
}

const AddObservacionSchema = z.object({
  proyectoId: z.string(),
  contenido: z.string().min(1).max(2000),
  importante: z.boolean().optional(),
});

export async function addObservacionAction(
  input: z.infer<typeof AddObservacionSchema>,
): Promise<void> {
  const parsed = AddObservacionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Datos inválidos: ${parsed.error.message}`);
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("observaciones").insert({
    proyecto_id: parsed.data.proyectoId,
    contenido: parsed.data.contenido,
    importante: parsed.data.importante ?? false,
    autor_id: user?.id ?? null,
  } as any);

  if (error) throw new Error(error.message);
  revalidatePath(`/proyectos/${parsed.data.proyectoId}`);
}

export async function uploadFotoAction(formData: FormData): Promise<void> {
  const proyectoId = formData.get("proyectoId") as string;
  const empresaId = formData.get("empresaId") as string;
  const subempresaId = formData.get("subempresaId") as string;
  const file = formData.get("foto") as File;

  if (!file || file.size === 0) throw new Error("No se seleccionó ningún archivo.");
  if (!proyectoId || !empresaId || !subempresaId) throw new Error("Faltan datos del proyecto.");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${empresaId}/${subempresaId}/${proyectoId}/${crypto.randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("fotos-proyectos")
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("fotos").insert({
    proyecto_id: proyectoId,
    storage_path: storagePath,
    nombre: file.name,
    tamano_bytes: file.size,
    autor_id: user?.id ?? null,
  } as any);

  if (insertError) throw new Error(insertError.message);
  revalidatePath(`/proyectos/${proyectoId}`);
}

