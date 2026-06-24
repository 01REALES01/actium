"use server";

import { revalidatePath } from "next/cache";
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
    const { error: asigError } = await (db.from("empleado_proyectos") as any).insert({
      empleado_id: empleadoId,
      proyecto_id: data.proyectoId,
      asignado_por: perfil.id,
    });
    if (asigError) {
      console.error("Error asignando trabajador a proyecto:", asigError);
      // No lanzamos error fatal porque el empleado ya se creó, pero la asignación falló
    }
  }

  revalidatePath("/field-workers");
  return { success: true, empleadoId };
}
