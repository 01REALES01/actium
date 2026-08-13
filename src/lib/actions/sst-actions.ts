"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertSuperAdmin } from "@/lib/auth/guards";
import type { FormularioTipo, FormularioEstado, DocumentoEmpleadoTipo } from "@/types/database.types";

export async function addEmployeeDocumentAction(
  empleadoId: string,
  tipo: DocumentoEmpleadoTipo,
  storagePath: string,
  vigenciaDesde: string,
  vigenciaHasta: string
) {
  const { supabase, perfil } = await assertSuperAdmin();

  const { error } = await supabase.from("empleado_documentos").insert({
    empleado_id: empleadoId,
    tipo: tipo,
    storage_path: storagePath,
    vigencia_desde: vigenciaDesde,
    vigencia_hasta: vigenciaHasta,
    uploaded_by: perfil.id,
  } as any);

  if (error) {
    console.error("Error guardando documento de empleado:", error);
    throw new Error("Error al guardar el documento en la base de datos");
  }

  revalidatePath("/field-workers");
  revalidatePath(`/field-workers/${empleadoId}`);
  return { success: true };
}

export async function registrarIncidenteAction(data: {
  proyectoId: string;
  empleadoId?: string;
  tipo: "incidente" | "accidente" | "casi_accidente";
  severidad: "leve" | "moderado" | "grave" | "critico";
  fecha: string;
  descripcion: string;
  accionesTomadas?: string;
}) {
  const { perfil } = await assertSuperAdmin();

  if (!data.empleadoId) {
    throw new Error("Debe seleccionar un empleado involucrado para registrar el incidente.");
  }

  const db = createAdminClient();
  const { error } = await (db.from("incidentes") as any).insert({
    proyecto_id: data.proyectoId,
    empleado_id: data.empleadoId,
    tipo: data.tipo,
    severidad: data.severidad,
    fecha: data.fecha,
    descripcion: data.descripcion,
    acciones_tomadas: data.accionesTomadas || null,
    registrado_por: perfil.id,
  });

  if (error) {
    console.error("Error registrando incidente:", error);
    throw new Error(`Error al registrar el incidente: ${error.message}`);
  }

  revalidatePath(`/proyectos/${data.proyectoId}`);
  return { success: true };
}

export async function registrarAusentismoAction(data: {
  proyectoId: string;
  empleadoId: string;
  tipo: "medico" | "personal" | "vacaciones" | "incapacidad" | "otro";
  fechaInicio: string;
  fechaFin: string;
  razon: string;
}) {
  const { perfil } = await assertSuperAdmin();

  const db = createAdminClient();
  const { error } = await (db.from("ausentismos") as any).insert({
    proyecto_id: data.proyectoId,
    empleado_id: data.empleadoId,
    tipo: data.tipo,
    fecha_inicio: data.fechaInicio,
    fecha_fin: data.fechaFin,
    razon: data.razon,
    registrado_por: perfil.id,
  });

  if (error) {
    console.error("Error registrando ausentismo:", error);
    throw new Error(`Error al registrar el ausentismo: ${error.message}`);
  }

  revalidatePath(`/proyectos/${data.proyectoId}`);
  return { success: true };
}

export async function registrarTrabajadorAction(data: {
  cedula: string;
  nombre: string;
  cargo?: string;
  profesion?: string;
  eps?: string;
  arl?: string;
  fondoPension?: string;
  proyectoId?: string;
  empresaId: string;
  subempresaId: string;
}) {
  const { perfil } = await assertSuperAdmin();

  if (!data.empresaId || !data.subempresaId) {
    throw new Error("Debe seleccionar la empresa y la subempresa del trabajador.");
  }

  const db = createAdminClient();

  // 1. Insertar empleado
  const { data: empData, error: empError } = await (db.from("empleados") as any).insert({
    cedula: data.cedula,
    nombre: data.nombre,
    cargo: data.cargo || null,
    profesion: data.profesion || null,
    eps: data.eps || null,
    arl: data.arl || null,
    fondo_pension: data.fondoPension || null,
    empresa_id: data.empresaId,
    subempresa_id: data.subempresaId,
    activo: true,
  }).select("id").single();

  if (empError) {
    console.error("Error registrando trabajador:", empError);
    if (empError.code === "23505") { // Unique violation
      throw new Error("Ya existe un trabajador con esta cédula.");
    }
    throw new Error(`Error al registrar trabajador: ${empError.message}`);
  }

  const empleadoId = empData.id;

  // 2. Si hay proyecto, asignarlo inmediatamente
  if (data.proyectoId) {
    await asignarEmpleadoAProyecto(db, empleadoId, data.proyectoId, perfil.id, {
      throwOnError: false,
    });
  }

  revalidatePath("/field-workers");
  return { success: true, empleadoId };
}

// ─── Helper compartido: asignar un empleado a un proyecto ─────────────────────

async function asignarEmpleadoAProyecto(
  db: ReturnType<typeof createAdminClient>,
  empleadoId: string,
  proyectoId: string,
  asignadoPor: string,
  opts: { throwOnError: boolean } = { throwOnError: true },
) {
  const { error } = await (db.from("empleado_proyectos") as any).insert({
    empleado_id: empleadoId,
    proyecto_id: proyectoId,
    asignado_por: asignadoPor,
  });

  if (error) {
    console.error("Error asignando trabajador a proyecto:", error);
    if (opts.throwOnError) {
      if (error.code === "23505") {
        throw new Error("El trabajador ya está asignado a ese proyecto.");
      }
      throw new Error(`Error al asignar el trabajador al proyecto: ${error.message}`);
    }
    // No lanzamos error fatal porque el empleado ya se creó, pero la asignación falló
  }
}

// ─── Editar trabajador (super_admin) ──────────────────────────────────────────

const ActualizarTrabajadorSchema = z.object({
  empleadoId: z.string().min(1),
  cedula: z.string().min(1),
  nombre: z.string().min(1),
  cargo: z.string().max(160).optional(),
  profesion: z.string().max(160).optional(),
  telefono: z.string().max(40).optional(),
  email: z.string().email().max(160).optional().or(z.literal("")),
  eps: z.string().max(160).optional(),
  arl: z.string().max(160).optional(),
  fondoPension: z.string().max(160).optional(),
  fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  fechaRetiro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  empresaId: z.string().min(1),
  subempresaId: z.string().min(1),
});

export async function actualizarTrabajadorAction(
  input: z.infer<typeof ActualizarTrabajadorSchema>,
): Promise<void> {
  const parsed = ActualizarTrabajadorSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Datos inválidos: ${parsed.error.issues[0]?.message ?? parsed.error.message}`);
  }
  const data = parsed.data;

  await assertSuperAdmin();
  const db = createAdminClient();

  const { error } = await (db.from("empleados") as any)
    .update({
      cedula: data.cedula,
      nombre: data.nombre,
      cargo: data.cargo || null,
      profesion: data.profesion || null,
      telefono: data.telefono || null,
      email: data.email || null,
      eps: data.eps || null,
      arl: data.arl || null,
      fondo_pension: data.fondoPension || null,
      fecha_ingreso: data.fechaIngreso || null,
      fecha_retiro: data.fechaRetiro || null,
      empresa_id: data.empresaId,
      subempresa_id: data.subempresaId,
    })
    .eq("id", data.empleadoId);

  if (error) {
    console.error("Error actualizando trabajador:", error);
    if (error.code === "23505") {
      throw new Error("Ya existe un trabajador con esta cédula.");
    }
    if (error.message?.includes("no pertenece a empresa")) {
      throw new Error("La subempresa no pertenece a la empresa seleccionada.");
    }
    throw new Error(`Error al actualizar el trabajador: ${error.message}`);
  }

  revalidatePath("/field-workers");
  revalidatePath(`/field-workers/${data.empleadoId}`);
}

// ─── Inactivar / reactivar trabajador ─────────────────────────────────────────

const ToggleTrabajadorActivoSchema = z.object({
  empleadoId: z.string().min(1),
  activo: z.boolean(),
});

export async function toggleTrabajadorActivoAction(
  input: z.infer<typeof ToggleTrabajadorActivoSchema>,
): Promise<void> {
  const parsed = ToggleTrabajadorActivoSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  await assertSuperAdmin();
  const db = createAdminClient();

  const update: Record<string, unknown> = { activo: parsed.data.activo };
  if (!parsed.data.activo) {
    update.fecha_retiro = new Date().toISOString().split("T")[0];
  } else {
    update.fecha_retiro = null;
  }

  const { error } = await (db.from("empleados") as any)
    .update(update)
    .eq("id", parsed.data.empleadoId);

  if (error) throw new Error(error.message);

  revalidatePath("/field-workers");
  revalidatePath(`/field-workers/${parsed.data.empleadoId}`);
}

// ─── Archivar / restaurar / eliminar trabajador (solo super_admin) ───────────

const TrabajadorIdSchema = z.object({ empleadoId: z.string().uuid() });

/** Archiva un trabajador (borrado lógico reversible: marca deleted_at). */
export async function archivarTrabajadorAction(
  input: z.infer<typeof TrabajadorIdSchema>,
): Promise<void> {
  const parsed = TrabajadorIdSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  await assertSuperAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("empleados")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.empleadoId);

  if (error) throw new Error(error.message);

  revalidatePath("/field-workers");
  revalidatePath(`/field-workers/${parsed.data.empleadoId}`);
}

/** Restaura un trabajador archivado (deleted_at = null). */
export async function restaurarTrabajadorAction(
  input: z.infer<typeof TrabajadorIdSchema>,
): Promise<void> {
  const parsed = TrabajadorIdSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  await assertSuperAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("empleados")
    .update({ deleted_at: null })
    .eq("id", parsed.data.empleadoId);

  if (error) throw new Error(error.message);

  revalidatePath("/field-workers");
}

/**
 * Elimina definitivamente un trabajador y TODO su historial (documentos,
 * asignaciones, ausentismos, incidentes). Irreversible. El borrado en BD es
 * atómico (RPC); la limpieza de archivos en storage es best-effort.
 */
export async function eliminarTrabajadorDefinitivoAction(
  input: z.infer<typeof TrabajadorIdSchema>,
): Promise<void> {
  const parsed = TrabajadorIdSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  // El RPC es SECURITY DEFINER con guard interno de super_admin: se llama con
  // el cliente del usuario (su JWT) para que la verificación de rol funcione.
  const { supabase } = await assertSuperAdmin();
  const db = createAdminClient();

  const { data: documentos } = await db
    .from("empleado_documentos")
    .select("storage_path")
    .eq("empleado_id", parsed.data.empleadoId);

  const { error } = await supabase.rpc("eliminar_empleado_definitivo", {
    p_empleado_id: parsed.data.empleadoId,
  });
  if (error) throw new Error(error.message);

  const docPaths = (documentos ?? []).map((d) => d.storage_path).filter(Boolean);
  if (docPaths.length > 0) {
    await db.storage.from("documentos-empleados").remove(docPaths);
  }

  revalidatePath("/field-workers");
}

// ─── Asignación de trabajador a proyecto ──────────────────────────────────────

const AsignarProyectoSchema = z.object({
  empleadoId: z.string().min(1),
  proyectoId: z.string().min(1),
});

export async function asignarTrabajadorProyectoAction(
  input: z.infer<typeof AsignarProyectoSchema>,
): Promise<void> {
  const parsed = AsignarProyectoSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const { perfil } = await assertSuperAdmin();
  const db = createAdminClient();

  await asignarEmpleadoAProyecto(db, parsed.data.empleadoId, parsed.data.proyectoId, perfil.id);

  revalidatePath("/field-workers");
  revalidatePath(`/field-workers/${parsed.data.empleadoId}`);
  revalidatePath(`/proyectos/${parsed.data.proyectoId}`);
}

const RetirarProyectoSchema = z.object({
  empleadoId: z.string().min(1),
  proyectoId: z.string().min(1),
});

/** Retira a un trabajador de un proyecto (marca retirado_at; conserva historial). */
export async function retirarTrabajadorProyectoAction(
  input: z.infer<typeof RetirarProyectoSchema>,
): Promise<void> {
  const parsed = RetirarProyectoSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  await assertSuperAdmin();
  const db = createAdminClient();

  const { error } = await (db.from("empleado_proyectos") as any)
    .update({ retirado_at: new Date().toISOString() })
    .eq("empleado_id", parsed.data.empleadoId)
    .eq("proyecto_id", parsed.data.proyectoId)
    .is("retirado_at", null);

  if (error) throw new Error(error.message);

  revalidatePath("/field-workers");
  revalidatePath(`/field-workers/${parsed.data.empleadoId}`);
  revalidatePath(`/proyectos/${parsed.data.proyectoId}`);
}
