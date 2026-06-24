"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";

const RegistrarAvanceSchema = z.object({
  proyectoId: z.string(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  avanceReal: z.number().min(0).max(100000000), // Allowing large units like budget, kg, etc.
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
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para registrar avances de obra.");
  }

  // Calcular avance_proyectado para la fecha
  let avanceProyectado = 0;
  const db = createAdminClient();
  const [{ data: metas }, { data: proyectoData }] = await Promise.all([
    db.from("proyecto_metas").select("fecha, avance_esperado").eq("proyecto_id", parsed.data.proyectoId).order("fecha", { ascending: true }),
    db.from("proyectos").select("fecha_inicio").eq("id", parsed.data.proyectoId).single(),
  ]);

  const hitosRaw = (metas || []).map(m => ({
    fecha: m.fecha,
    valor: Number(m.avance_esperado),
    ms: new Date(m.fecha + "T12:00:00Z").getTime(),
  }));

  const hitos = [...hitosRaw];
  if (hitos.length > 0) {
    let origenFecha: string;
    const fechaInicioRaw = (proyectoData as any)?.fecha_inicio;
    if (fechaInicioRaw) {
      const fechaInicioMs = new Date(fechaInicioRaw + "T12:00:00Z").getTime();
      const d = new Date(fechaInicioMs - 24 * 60 * 60 * 1000);
      origenFecha = d.toISOString().split("T")[0];
    } else {
      const d = new Date(hitos[0].ms - 7 * 24 * 60 * 60 * 1000);
      origenFecha = d.toISOString().split("T")[0];
    }
    const origenMs = new Date(origenFecha + "T12:00:00Z").getTime();
    if (origenMs < hitos[0].ms) {
      hitos.unshift({ fecha: origenFecha, valor: 0, ms: origenMs });
    }
  }

  if (hitos.length > 0) {
    const ms = new Date(parsed.data.fecha + "T12:00:00Z").getTime();
    if (ms >= hitos[hitos.length - 1].ms) {
      avanceProyectado = hitos[hitos.length - 1].valor;
    } else if (ms > hitos[0].ms) {
      for (let i = 0; i < hitos.length - 1; i++) {
        const a = hitos[i];
        const b = hitos[i + 1];
        if (ms > a.ms && ms < b.ms) {
          const ratio = (ms - a.ms) / (b.ms - a.ms);
          avanceProyectado = Number((a.valor + ratio * (b.valor - a.valor)).toFixed(2));
          break;
        }
        if (ms === b.ms) {
          avanceProyectado = b.valor;
          break;
        }
      }
    }
  }

  if (typeof avanceProyectado !== "number" || isNaN(avanceProyectado)) {
    avanceProyectado = 0;
  }

  // Escritura con admin client (rol ya validado): evita el bloqueo de RLS.
  const { data, error } = await (db.from("proyecto_avances") as any).upsert({
    proyecto_id: parsed.data.proyectoId,
    fecha: parsed.data.fecha,
    avance_real: parsed.data.avanceReal,
    avance_proyectado: avanceProyectado,
    notas: parsed.data.notas,
    registrado_por: perfil.id,
  }, { onConflict: 'proyecto_id, fecha' }).select('id').single();

  if (error) throw new Error(error.message);

  revalidatePath(`/proyectos/${parsed.data.proyectoId}`);
  return { id: (data as { id: string }).id };
}

// ─── Metas (Curva S) ─────────────────────────────────────────────────────────

const GuardarProyectoMetasSchema = z.object({
  proyectoId: z.string().min(1),
  metas: z.array(
    z.object({
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      avanceEsperado: z.number().min(0),
    })
  ),
});

export async function guardarProyectoMetasAction(
  input: z.infer<typeof GuardarProyectoMetasSchema>,
): Promise<void> {
  const parsed = GuardarProyectoMetasSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Datos inválidos: ${parsed.error.issues[0]?.message ?? parsed.error.message}`);
  }

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  // Aquí asumiendo que los que pueden gestionar proyectos pueden planificar las metas:
  // Se podría hacer check de puedeGestionarProyectos(perfil.rol)

  const db = createAdminClient();

  // Borrar metas actuales
  await db.from("proyecto_metas").delete().eq("proyecto_id", parsed.data.proyectoId);

  if (parsed.data.metas.length > 0) {
    const metasInsert = parsed.data.metas.map((m) => ({
      proyecto_id: parsed.data.proyectoId,
      fecha: m.fecha,
      avance_esperado: m.avanceEsperado,
    }));
    const { error } = await db.from("proyecto_metas").insert(metasInsert);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/proyectos/${parsed.data.proyectoId}`);
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
  unidadMedida: z.string().min(1).max(20).optional(),
  etiquetaEjeY: z.string().max(100).optional(),
  metaTotalCantidad: z.number().min(0).optional(),
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
      unidad_medida: parsed.data.unidadMedida ?? "MT",
      etiqueta_eje_y: parsed.data.etiquetaEjeY ?? null,
      meta_total_cantidad: parsed.data.metaTotalCantidad ?? null,
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
  unidadMedida: z.string().min(1).max(20).optional(),
  etiquetaEjeY: z.string().max(100).optional(),
  metaTotalCantidad: z.number().min(0).optional(),
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
      unidad_medida: parsed.data.unidadMedida ?? "MT",
      etiqueta_eje_y: parsed.data.etiquetaEjeY ?? null,
      meta_total_cantidad: parsed.data.metaTotalCantidad ?? null,
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
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");

  const db = createAdminClient();
  const { error } = await (db.from("observaciones") as any).insert({
    proyecto_id: parsed.data.proyectoId,
    contenido: parsed.data.contenido,
    importante: parsed.data.importante ?? false,
    autor_id: perfil.id,
  });

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
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");

  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${empresaId}/${subempresaId}/${proyectoId}/${crypto.randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();

  // Subida + registro con admin client (rol ya autenticado): evita el bloqueo
  // de RLS en storage y en la tabla fotos.
  const db = createAdminClient();
  const { error: uploadError } = await db.storage
    .from("fotos-proyectos")
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await (db.from("fotos") as any).insert({
    proyecto_id: proyectoId,
    storage_path: storagePath,
    nombre: file.name,
    tamano_bytes: file.size,
    autor_id: perfil.id,
  });

  if (insertError) throw new Error(insertError.message);
  revalidatePath(`/proyectos/${proyectoId}`);
}

