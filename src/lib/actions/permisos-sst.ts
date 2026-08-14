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

import { createAdminClient } from "@/lib/supabase/admin";

export async function guardarDatosFormularioAction(
  pdfStoragePath: string,
  payload: any
): Promise<void> {
  const admin = createAdminClient();
  const jsonPath = pdfStoragePath.replace(/\.pdf$/, ".json");
  const jsonContent = JSON.stringify(payload);

  const { error } = await admin.storage
    .from("pdfs-formularios")
    .upload(jsonPath, Buffer.from(jsonContent), {
      contentType: "application/pdf", // Cumple la restricción MIME del bucket
      upsert: true,
    });

  if (error) {
    console.error("Error guardando JSON de respaldo SST en storage:", error);
    throw new Error(`Error guardando datos estructurados: ${error.message}`);
  }
}

export async function obtenerDatosCierreAction(formularioId: string): Promise<{
  success: boolean;
  pdfPath: string | null;
  proyectoId: string | null;
  payload: any | null;
  fallback: {
    empresa: string;
    area: string;
    ubicacion: string;
    fechaInicio: string;
  };
}> {
  const admin = createAdminClient();
  const { data: formData, error } = await (admin.from("formularios") as any)
    .select("pdf_generado_path, proyecto_id, area, fecha_inicio, ubicacion, proyectos(nombre, empresas(nombre))")
    .eq("id", formularioId)
    .single();

  if (error || !formData) {
    throw new Error("Formulario no encontrado en la base de datos.");
  }

  const fallback = {
    empresa: formData.proyectos?.empresas?.nombre || formData.proyectos?.nombre || "ACTIUM",
    area: formData.area || "",
    ubicacion: formData.ubicacion || "",
    fechaInicio: formData.fecha_inicio ? formData.fecha_inicio.split("T")[0] : "",
  };

  if (!formData.pdf_generado_path) {
    return {
      success: false,
      pdfPath: null,
      proyectoId: formData.proyecto_id || null,
      payload: null,
      fallback,
    };
  }

  const jsonPath = formData.pdf_generado_path.replace(/\.pdf$/, ".json");
  const { data: fileData } = await admin.storage
    .from("pdfs-formularios")
    .download(jsonPath);

  if (fileData) {
    try {
      const text = await fileData.text();
      const payload = JSON.parse(text);
      return {
        success: true,
        pdfPath: formData.pdf_generado_path,
        proyectoId: formData.proyecto_id || null,
        payload,
        fallback,
      };
    } catch (parseErr) {
      console.error("Error parseando JSON de respaldo SST:", parseErr);
    }
  }

  return {
    success: false,
    pdfPath: formData.pdf_generado_path,
    proyectoId: formData.proyecto_id || null,
    payload: null,
    fallback,
  };
}

export async function guardarPdfYDatosFormularioAction(formData: FormData): Promise<{
  id: string;
  pdfPath: string;
}> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para gestionar formularios SST.");
  }

  const pdfFile = formData.get("pdfFile") as File;
  if (!pdfFile) throw new Error("Archivo PDF requerido.");

  const payloadStr = (formData.get("payload") as string) || "{}";
  const tipo = (formData.get("tipo") as "permiso_caliente" | "permiso_altura" | "ats") || "permiso_caliente";
  const proyectoId = (formData.get("proyectoId") as string) || "";
  const existingId = (formData.get("cierreId") as string) || "";
  const existingPdfPath = (formData.get("existingPdfPath") as string) || "";
  const area = (formData.get("area") as string) || "";
  const ubicacion = (formData.get("ubicacion") as string) || "";
  const fechaInicio = (formData.get("fechaInicio") as string) || new Date().toISOString().split("T")[0];

  const db = createAdminClient();

  // Determinar empresa_id y subempresa_id
  let empresaId = "";
  let subempresaId = "";

  if (proyectoId) {
    const { data: proyecto } = await (db.from("proyectos") as any)
      .select("empresa_id, subempresa_id")
      .eq("id", proyectoId)
      .single();
    if (proyecto) {
      empresaId = proyecto.empresa_id;
      subempresaId = proyecto.subempresa_id;
    }
  }

  if (!empresaId) {
    empresaId = "temp-empresa";
    subempresaId = "temp-subempresa";
  }

  const storagePath =
    existingPdfPath ||
    `${empresaId}/${subempresaId}/${proyectoId || crypto.randomUUID()}/${crypto.randomUUID()}.pdf`;
  const jsonPath = storagePath.replace(/\.pdf$/, ".json");

  // 1. Subir PDF con admin client (evita RLS)
  const pdfBytes = await pdfFile.arrayBuffer();
  const { error: errPdf } = await db.storage
    .from("pdfs-formularios")
    .upload(storagePath, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (errPdf) {
    console.error("Error subiendo PDF con admin client:", errPdf);
    throw new Error(`Error guardando PDF: ${errPdf.message}`);
  }

  // 2. Subir JSON de respaldo estructurado con admin client
  const { error: errJson } = await db.storage
    .from("pdfs-formularios")
    .upload(jsonPath, Buffer.from(payloadStr), {
      contentType: "application/pdf", // Cumple restricción MIME del bucket
      upsert: true,
    });

  if (errJson) {
    console.error("Error guardando JSON de respaldo con admin client:", errJson);
  }

  // 3. Actualizar o Insertar en BD
  let formularioId = existingId;

  if (existingId) {
    // Modo cierre: actualizar ruta y marcar firmado
    const { error: errUpd } = await (db.from("formularios") as any)
      .update({
        pdf_generado_path: storagePath,
        estado: "firmado",
        firmado_at: new Date().toISOString(),
      })
      .eq("id", existingId);

    if (errUpd) throw new Error(`Error actualizando formulario: ${errUpd.message}`);
  } else if (proyectoId) {
    // Modo creación con proyecto
    const { data: formRow, error: errInsert } = await (db.from("formularios") as any)
      .insert({
        tipo,
        estado: "firmado",
        proyecto_id: proyectoId,
        empresa_id: empresaId,
        subempresa_id: subempresaId,
        ubicacion: ubicacion || "N/A",
        area: area || null,
        creado_por: perfil.id,
        fecha_inicio: fechaInicio,
        pdf_generado_path: storagePath,
      })
      .select("id")
      .single();

    if (errInsert || !formRow) {
      throw new Error(`Error registrando formulario: ${errInsert?.message}`);
    }
    formularioId = formRow.id;

    // Inicializar fila en tabla de detalles si aplica
    if (tipo === "permiso_caliente") {
      await (db.from("caliente_detalles") as any).insert({ formulario_id: formularioId });
    } else if (tipo === "permiso_altura") {
      await (db.from("altura_detalles") as any).insert({ formulario_id: formularioId });
    } else if (tipo === "ats") {
      await (db.from("ats_detalles") as any).insert({ formulario_id: formularioId });
    }
  }

  revalidatePath("/sst");
  if (formularioId) revalidatePath(`/sst/${formularioId}`);
  revalidatePath("/sst/bitacora");
  if (proyectoId) revalidatePath(`/sst/bitacora/${proyectoId}`);

  return { id: formularioId, pdfPath: storagePath };
}
