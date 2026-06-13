"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormularioTipo, FormularioEstado, DocumentoEmpleadoTipo } from "@/types/database.types";

export async function addEmployeeDocumentAction(
  empleadoId: string,
  tipo: DocumentoEmpleadoTipo,
  storagePath: string,
  vigenciaDesde: string,
  vigenciaHasta: string
) {
  const supabase = createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    throw new Error("No autenticado");
  }

  const { error } = await supabase.from("empleado_documentos").insert({
    empleado_id: empleadoId,
    tipo: tipo,
    storage_path: storagePath,
    vigencia_desde: vigenciaDesde,
    vigencia_hasta: vigenciaHasta,
    uploaded_by: userData.user.id,
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
  const supabase = createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    throw new Error("No autenticado");
  }

  if (!data.empleadoId) {
    throw new Error("Debe seleccionar un empleado involucrado para registrar el incidente.");
  }

  const { error } = await supabase.from("incidentes").insert({
    proyecto_id: data.proyectoId,
    empleado_id: data.empleadoId,
    tipo: data.tipo,
    severidad: data.severidad,
    fecha: data.fecha,
    descripcion: data.descripcion,
    acciones_tomadas: data.accionesTomadas || null,
    registrado_por: userData.user.id,
  } as any);

  if (error) {
    console.error("Error registrando incidente:", error);
    throw new Error("Error al registrar el incidente");
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
  const supabase = createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    throw new Error("No autenticado");
  }

  const { error } = await supabase.from("ausentismos").insert({
    proyecto_id: data.proyectoId,
    empleado_id: data.empleadoId,
    tipo: data.tipo,
    fecha_inicio: data.fechaInicio,
    fecha_fin: data.fechaFin,
    razon: data.razon,
    registrado_por: userData.user.id,
  } as any);

  if (error) {
    console.error("Error registrando ausentismo:", error);
    throw new Error("Error al registrar el ausentismo");
  }

  revalidatePath(`/proyectos/${data.proyectoId}`);
  return { success: true };
}
