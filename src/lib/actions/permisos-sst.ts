"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";

export async function crearPermisoAlturaAction(data: {
  proyectoId: string;
  ubicacion: string;
  area: string;
  fechaInicio: string;
  pdfPath: string;
}): Promise<{ id: string }> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para crear formularios SST.");
  }

  const { data: proyecto, error: errProy } = await (supabase as any)
    .from("proyectos")
    .select("empresa_id, subempresa_id")
    .eq("id", data.proyectoId)
    .single();

  if (errProy || !proyecto) throw new Error("Proyecto no encontrado o sin acceso.");

  const { data: formRow, error: errForm } = await (supabase.from("formularios") as any)
    .insert({
      tipo: "permiso_altura",
      estado: "firmado", // Queda inmediatamente emitido y firmado
      proyecto_id: data.proyectoId,
      empresa_id: proyecto.empresa_id,
      subempresa_id: proyecto.subempresa_id,
      ubicacion: data.ubicacion,
      area: data.area || null,
      creado_por: perfil.id,
      fecha_inicio: data.fechaInicio,
      pdf_generado_path: data.pdfPath,
    })
    .select("id")
    .single();

  if (errForm || !formRow) {
    console.error("Error al guardar permiso_altura en formularios:", errForm);
    throw new Error(`No fue posible guardar el permiso en la base de datos. Detalle: ${errForm?.message || "sin detalle"}`);
  }

  // Insertar fila en altura_detalles requerida por RLS o modelo de datos
  const { error: errDet } = await (supabase.from("altura_detalles") as any).insert({
    formulario_id: formRow.id,
  });

  if (errDet) {
    console.error("Error al guardar en altura_detalles:", errDet);
    throw new Error(`No fue posible inicializar los detalles del permiso de altura. Detalle: ${errDet.message}`);
  }

  revalidatePath("/sst");
  revalidatePath("/sst/bitacora");
  revalidatePath(`/sst/bitacora/${data.proyectoId}`);
  return { id: formRow.id };
}

export async function crearPermisoCalienteAction(data: {
  proyectoId: string;
  ubicacion: string;
  area: string;
  fechaInicio: string;
  pdfPath: string;
}): Promise<{ id: string }> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para crear formularios SST.");
  }

  const { data: proyecto, error: errProy } = await (supabase as any)
    .from("proyectos")
    .select("empresa_id, subempresa_id")
    .eq("id", data.proyectoId)
    .single();

  if (errProy || !proyecto) throw new Error("Proyecto no encontrado o sin acceso.");

  const { data: formRow, error: errForm } = await (supabase.from("formularios") as any)
    .insert({
      tipo: "permiso_caliente",
      estado: "firmado",
      proyecto_id: data.proyectoId,
      empresa_id: proyecto.empresa_id,
      subempresa_id: proyecto.subempresa_id,
      ubicacion: data.ubicacion,
      area: data.area || null,
      creado_por: perfil.id,
      fecha_inicio: data.fechaInicio,
      pdf_generado_path: data.pdfPath,
    })
    .select("id")
    .single();

  if (errForm || !formRow) {
    console.error("Error al guardar permiso_caliente en formularios:", errForm);
    throw new Error(`No fue posible guardar el permiso en la base de datos. Detalle: ${errForm?.message || "sin detalle"}`);
  }

  const { error: errDet } = await (supabase.from("caliente_detalles") as any).insert({
    formulario_id: formRow.id,
  });

  if (errDet) {
    console.error("Error al guardar en caliente_detalles:", errDet);
    throw new Error(`No fue posible inicializar los detalles del permiso caliente. Detalle: ${errDet.message}`);
  }

  revalidatePath("/sst");
  revalidatePath("/sst/bitacora");
  revalidatePath(`/sst/bitacora/${data.proyectoId}`);
  return { id: formRow.id };
}

export async function actualizarFormularioPdfAction(
  formularioId: string,
  pdfPath: string
) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para diligenciar permisos SST.");
  }

  const { error } = await (supabase.from("formularios") as any)
    .update({ pdf_generado_path: pdfPath, estado: "firmado" })
    .eq("id", formularioId);

  if (error) throw new Error("Error actualizando la ruta del PDF.");
  revalidatePath("/sst");
}

export async function guardarPdfAtsAction(data: {
  proyectoId: string;
  ubicacion: string;
  area: string;
  fechaInicio: string;
  pdfPath: string;
}): Promise<{ id: string }> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para crear formularios SST.");
  }

  const { data: proyecto, error: errProy } = await (supabase as any)
    .from("proyectos")
    .select("empresa_id, subempresa_id")
    .eq("id", data.proyectoId)
    .single();

  if (errProy || !proyecto) throw new Error("Proyecto no encontrado o sin acceso.");

  const { data: formRow, error: errForm } = await (supabase.from("formularios") as any)
    .insert({
      tipo: "ats",
      estado: "firmado",
      proyecto_id: data.proyectoId,
      empresa_id: proyecto.empresa_id,
      subempresa_id: proyecto.subempresa_id,
      ubicacion: data.ubicacion,
      area: data.area || null,
      creado_por: perfil.id,
      fecha_inicio: data.fechaInicio,
      pdf_generado_path: data.pdfPath,
    })
    .select("id")
    .single();

  if (errForm || !formRow) {
    console.error("Error al guardar ATS en formularios:", errForm);
    throw new Error(`No fue posible guardar el ATS en la base de datos. Detalle: ${errForm?.message || "sin detalle"}`);
  }

  const { error: errDet } = await (supabase.from("ats_detalles") as any).insert({
    formulario_id: formRow.id,
  });

  if (errDet) {
    console.error("Error al guardar en ats_detalles:", errDet);
    throw new Error(`No fue posible inicializar los detalles del ATS. Detalle: ${errDet.message}`);
  }

  revalidatePath("/sst");
  revalidatePath("/sst/bitacora");
  revalidatePath(`/sst/bitacora/${data.proyectoId}`);
  return { id: formRow.id };
}
