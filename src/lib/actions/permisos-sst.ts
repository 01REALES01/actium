"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";
import { limpiarDatosPersonales, type FallbackFormularioSST } from "@/lib/sst/prefill";
import { hoyLocal } from "@/lib/fecha";
import { ELEMENTOS_EPP } from "@/constants/entrega-epp";
import { revalidarInventario } from "@/lib/actions/revalidar-inventario";
import type { FormularioTipo } from "@/types/database.types";

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
  fallback: FallbackFormularioSST;
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

// ─── Entrega de EPP: tabla hija ──────────────────────────────────────────────

/**
 * Sincroniza la cabecera y los elementos entregados del cargo de EPP con lo que
 * hay en el payload. A diferencia de ats/altura/caliente, aquí la cabecera
 * (`epp_entregas`) y sus filas (`epp_entrega_items`) pueden cambiar en cada
 * guardado —se agregan o quitan elementos mientras se diligencia—, así que se
 * reescriben por completo en cada guardado de borrador y en la emisión final.
 * Esto es lo que permite consultar el historial de dotación de un trabajador
 * sin tener que abrir cada PDF.
 */
async function sincronizarEntregaEpp(db: any, formularioId: string, payloadStr: string): Promise<void> {
  let data: any;
  try {
    data = JSON.parse(payloadStr);
  } catch {
    return;
  }

  const fechaEntrega = data.fecha || hoyLocal();

  await db.from("epp_entregas").upsert({
    formulario_id: formularioId,
    empleado_id: data.empleadoId || null,
    trabajador_nombre: (data.trabajadorNombre || "").trim() || "Sin definir",
    trabajador_cedula: (data.trabajadorCedula || "").trim() || null,
    trabajador_cargo: (data.trabajadorCargo || "").trim() || null,
    area: (data.area || "").trim() || null,
    fecha_entrega: fechaEntrega,
  });

  await db.from("epp_entrega_items").delete().eq("formulario_id", formularioId);

  const filas: {
    elemento_id: string;
    elemento: string;
    unidad: string;
    cantidad: string;
    fechaRecepcion: string;
    inventarioId: string | null;
  }[] = [];
  for (const el of ELEMENTOS_EPP) {
    const estado = data.elementos?.[el.id];
    if (!estado?.entregado || !estado.cantidad || !estado.fechaRecepcion) continue;
    filas.push({
      elemento_id: el.id,
      elemento: el.nombre,
      unidad: el.unidad,
      cantidad: estado.cantidad,
      fechaRecepcion: estado.fechaRecepcion,
      inventarioId: estado.inventarioId || null,
    });
  }
  for (const ad of data.adicionales ?? []) {
    if (!ad.nombre?.trim() || !ad.cantidad || !ad.fechaRecepcion) continue;
    // Las filas libres pueden conciliarse con un ítem del inventario del
    // proyecto que no pertenezca al catálogo ELEMENTOS_EPP (arnés, careta de
    // soldadura, ...), elegido desde el formulario. Si se escribió el nombre
    // a mano, inventarioId llega null y la fila no descuenta, como siempre.
    filas.push({
      elemento_id: "adicional",
      elemento: ad.nombre.trim(),
      unidad: ad.unidad,
      cantidad: ad.cantidad,
      fechaRecepcion: ad.fechaRecepcion,
      inventarioId: ad.inventarioId || null,
    });
  }

  if (filas.length > 0) {
    await db.from("epp_entrega_items").insert(
      filas.map((f) => ({
        formulario_id: formularioId,
        elemento_id: f.elemento_id,
        elemento: f.elemento,
        unidad: f.unidad,
        cantidad: Number(f.cantidad),
        fecha_recepcion: f.fechaRecepcion,
        inventario_id: f.inventarioId,
      })),
    );
  }
}

// ─── Charla de seguridad: tabla hija ─────────────────────────────────────────

/**
 * Sincroniza la cabecera y los asistentes de la charla con lo que hay en el
 * payload. A diferencia de ats/altura/caliente, aquí los asistentes pueden
 * cambiar en cada guardado —se agregan o quitan mientras se diligencia—, así
 * que se reescriben por completo en cada guardado de borrador y en la emisión
 * final. Esto es lo que permite consultar qué charlas recibió un trabajador
 * sin tener que abrir cada PDF. La firma (PNG) vive solo en el JSON: aquí se
 * guarda únicamente el hecho de haber firmado.
 */
async function sincronizarCharlaSeguridad(db: any, formularioId: string, payloadStr: string): Promise<void> {
  let data: any;
  try {
    data = JSON.parse(payloadStr);
  } catch {
    return;
  }

  const fecha = data.fecha || hoyLocal();

  await db.from("charla_seguridad").upsert({
    formulario_id: formularioId,
    tipo_actividad: data.tipoActividad || null,
    modalidad: data.modalidad || null,
    tema: (data.tema || "").trim() || "Sin definir",
    objetivo: (data.objetivo || "").trim() || null,
    capacitador_nombre: (data.capacitadorNombre || "").trim() || "Sin definir",
    capacitador_cargo: (data.capacitadorCargo || "").trim() || null,
    lugar: (data.lugar || "").trim() || null,
    fecha,
    hora_inicio: data.horaInicio || null,
    hora_fin: data.horaFin || null,
    duracion_minutos: data.duracionMinutos || null,
    resultado_general: data.resultadoGeneral || null,
  });

  await db.from("charla_asistentes").delete().eq("formulario_id", formularioId);

  const asistentes: any[] = (data.asistentes ?? []).filter((a: any) => a.nombre?.trim());
  if (asistentes.length > 0) {
    await db.from("charla_asistentes").insert(
      asistentes.map((a, i) => ({
        formulario_id: formularioId,
        empleado_id: a.empleadoId || null,
        orden: i + 1,
        nombre: a.nombre.trim(),
        identificacion: (a.identificacion || "").trim() || null,
        cargo: (a.cargo || "").trim() || null,
        empresa: (a.empresa || "").trim() || null,
        evaluacion: a.evaluacion || null,
        firmo: Boolean(a.firma),
      })),
    );
  }
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
  const tipo = (formData.get("tipo") as FormularioTipo) || "permiso_caliente";
  const proyectoId = (formData.get("proyectoId") as string) || "";
  // `cierreId` llega desde la vista de firmas de cierre; `formularioId`, desde un
  // borrador que se está finalizando. Ambos significan "actualizar esta fila".
  const existingId =
    (formData.get("cierreId") as string) || (formData.get("formularioId") as string) || "";
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
    // Modo cierre o finalización de borrador: actualizar ruta y marcar firmado.
    const { data: prev } = await (db.from("formularios") as any)
      .select("estado")
      .eq("id", existingId)
      .single();

    const cambios: Record<string, unknown> = {
      pdf_generado_path: storagePath,
      estado: "firmado",
      firmado_at: new Date().toISOString(),
    };

    // Un borrador pudo cambiar de área, ubicación o fecha mientras se
    // diligenciaba; en un cierre esos datos ya son definitivos y no se tocan.
    if (prev?.estado === "borrador") {
      cambios.area = area || null;
      cambios.ubicacion = ubicacion || "N/A";
      cambios.fecha_inicio = fechaInicio;
    }

    const { error: errUpd } = await (db.from("formularios") as any)
      .update(cambios)
      .eq("id", existingId);

    if (errUpd) throw new Error(`Error actualizando formulario: ${errUpd.message}`);

    if (tipo === "entrega_epp") {
      await sincronizarEntregaEpp(db, existingId, payloadStr);
      await aplicarDescuentoEpp(supabase, existingId);
    } else if (tipo === "charla_seguridad") {
      await sincronizarCharlaSeguridad(db, existingId, payloadStr);
    }
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
    } else if (tipo === "entrega_epp") {
      await sincronizarEntregaEpp(db, formularioId, payloadStr);
      await aplicarDescuentoEpp(supabase, formularioId);
    } else if (tipo === "charla_seguridad") {
      await sincronizarCharlaSeguridad(db, formularioId, payloadStr);
    }
  }

  revalidatePath("/sst");
  if (formularioId) revalidatePath(`/sst/${formularioId}`);
  revalidatePath("/sst/bitacora");
  if (proyectoId) revalidatePath(`/sst/bitacora/${proyectoId}`);
  if (tipo === "entrega_epp") revalidarInventario();

  return { id: formularioId, pdfPath: storagePath };
}

/**
 * Descuenta del inventario del proyecto los elementos del cargo que quedaron
 * conciliados con un ítem (ver `aplicar_salidas_epp_formulario`). Se invoca
 * con el cliente ligado al JWT del usuario (no el admin `db` de arriba): la
 * RPC es SECURITY DEFINER pero su guard interno lee `auth_rol()` del llamador
 * para exigir super_admin o sst, y eso solo existe bajo el JWT real — con el
 * service role de `createAdminClient()` no hay claim de rol que evaluar.
 *
 * La entrega física ya ocurrió al firmarse el cargo: si el descuento falla
 * (elemento sin conciliar en todo el cargo, error de la RPC, etc.) NO se
 * revierte la firma — el cargo queda firmado igual y el hallazgo se puede
 * seguir desde el panel de vacíos de Inventario. Perder la firma sería peor
 * que un descuento pendiente.
 */
async function aplicarDescuentoEpp(supabase: any, formularioId: string): Promise<void> {
  const { error } = await supabase.rpc("aplicar_salidas_epp_formulario", { p_formulario_id: formularioId });
  if (error) {
    console.error("[entrega_epp] No fue posible descontar el inventario del cargo", formularioId, error);
  }
}

/**
 * Reemplaza el PDF de un formulario YA FIRMADO, sin tocar su firma.
 *
 * Existe para el caso del preoperacional: se puede agregar la foto de un
 * equipo después de emitido, y el documento debe reflejarla. A diferencia de
 * `guardarPdfYDatosFormularioAction`, que siempre sella `estado: "firmado"` y
 * `firmado_at: now()`, esta acción NUNCA toca esas dos columnas — solo
 * reemplaza el archivo en su mismo `pdf_generado_path` (por eso el enlace no
 * cambia) y deja constancia de la regeneración en `pdf_regenerado_at` /
 * `pdf_regenerado_por`. Usar la acción genérica para este caso falsificaría la
 * fecha real de la firma, que es justo el dato que un formulario SST no puede
 * perder.
 */
export async function regenerarPdfFormularioAction(formData: FormData): Promise<{
  pdfPath: string;
}> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para gestionar formularios SST.");
  }

  const formularioId = (formData.get("formularioId") as string) || "";
  if (!formularioId) throw new Error("Formulario requerido.");

  const pdfFile = formData.get("pdfFile") as File;
  if (!pdfFile) throw new Error("Archivo PDF requerido.");

  const db = createAdminClient();

  const { data: form, error: formError } = await (db.from("formularios") as any)
    .select("pdf_generado_path")
    .eq("id", formularioId)
    .single();

  if (formError || !form?.pdf_generado_path) {
    throw new Error("Este formulario aún no tiene un PDF generado que regenerar.");
  }

  const pdfBytes = await pdfFile.arrayBuffer();
  const { error: errPdf } = await db.storage
    .from("pdfs-formularios")
    .upload(form.pdf_generado_path, Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (errPdf) {
    throw new Error(`Error reemplazando el PDF: ${errPdf.message}`);
  }

  const { error: errUpd } = await (db.from("formularios") as any)
    .update({
      pdf_regenerado_at: new Date().toISOString(),
      pdf_regenerado_por: perfil.id,
    })
    .eq("id", formularioId);

  if (errUpd) throw new Error(`Error registrando la regeneración: ${errUpd.message}`);

  revalidatePath(`/sst/${formularioId}`);
  return { pdfPath: form.pdf_generado_path as string };
}

// ─── Reutilizar el último permiso ────────────────────────────────────────────

/**
 * Devuelve el payload del último permiso emitido de este tipo para prellenar uno
 * nuevo. Busca de lo más parecido a lo más general: mismo proyecto antes que
 * cualquier proyecto y permisos propios antes que los de otro coordinador de la
 * empresa. Los borradores no cuentan: solo se copia de un permiso ya emitido.
 *
 * El payload vuelve SIN datos de personal ni firmas — ver `limpiarDatosPersonales`.
 */
export async function obtenerUltimoFormularioAction(
  tipo: FormularioTipo,
  proyectoId?: string,
): Promise<{
  encontrado: boolean;
  payload: any | null;
  referencia: { fecha: string | null; proyecto: string | null } | null;
  /** Por qué no se pudo copiar, cuando sí existen permisos anteriores. */
  motivo?: string;
}> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para diligenciar permisos SST.");
  }

  const db = createAdminClient();

  const consulta = (mismoProyecto: boolean) => {
    let q = (db.from("formularios") as any)
      .select("id, created_at, fecha_inicio, codigo_consecutivo, pdf_generado_path, proyectos(nombre)")
      .eq("tipo", tipo)
      .neq("estado", "borrador")
      .not("pdf_generado_path", "is", null)
      .order("created_at", { ascending: false })
      // Varios candidatos: los permisos anteriores al respaldo estructurado no
      // tienen JSON que copiar y hay que seguir buscando hacia atrás.
      .limit(5);
    if (mismoProyecto && proyectoId) q = q.eq("proyecto_id", proyectoId);
    return q;
  };

  // Se busca de lo más parecido a lo más general: mismo proyecto antes que
  // cualquier proyecto, y permisos propios antes que los de otro coordinador.
  const intentos: (() => any)[] = [
    () => consulta(true).eq("creado_por", perfil.id),
  ];
  if (perfil.empresa_id) {
    intentos.push(() => consulta(true).eq("empresa_id", perfil.empresa_id));
  }
  if (proyectoId) {
    intentos.push(() => consulta(false).eq("creado_por", perfil.id));
    if (perfil.empresa_id) {
      intentos.push(() => consulta(false).eq("empresa_id", perfil.empresa_id));
    }
  }

  let filas: any[] | null = null;
  for (const intento of intentos) {
    ({ data: filas } = await intento());
    if (filas?.length) break;
  }

  for (const candidato of filas ?? []) {
    if (!candidato.pdf_generado_path) continue;

    const jsonPath = candidato.pdf_generado_path.replace(/\.pdf$/, ".json");
    const { data: archivo } = await db.storage.from("pdfs-formularios").download(jsonPath);
    if (!archivo) continue; // Emitido antes del respaldo estructurado: solo existe el PDF.

    try {
      const payload = JSON.parse(await archivo.text());
      return {
        encontrado: true,
        payload: limpiarDatosPersonales(payload),
        referencia: {
          fecha: candidato.fecha_inicio || candidato.created_at?.split("T")[0] || null,
          proyecto: candidato.proyectos?.nombre || null,
        },
      };
    } catch (parseErr) {
      console.error("Error parseando el JSON de un permiso SST previo:", parseErr);
    }
  }

  // Hay permisos anteriores, pero ninguno guarda los datos estructurados: se
  // emitieron antes de que existiera el respaldo JSON y de ellos solo queda el
  // PDF, que no es reutilizable. Decirlo explícitamente evita que el usuario
  // crea que la función está rota cuando ve permisos en el historial.
  const anterior = filas?.[0];
  if (anterior) {
    const fecha = anterior.fecha_inicio || anterior.created_at?.split("T")[0] || "";
    return {
      encontrado: false,
      payload: null,
      referencia: null,
      motivo:
        `El permiso anterior${anterior.codigo_consecutivo ? ` (${anterior.codigo_consecutivo})` : ""}` +
        `${fecha ? `, del ${fecha},` : ""} se emitió antes de que se guardaran los datos del formulario, ` +
        "así que solo existe su PDF y no hay nada que copiar. Los permisos que emita desde ahora sí quedan disponibles para reutilizar.",
    };
  }

  return { encontrado: false, payload: null, referencia: null };
}

// ─── Borradores ──────────────────────────────────────────────────────────────

/**
 * Guarda el permiso a medio diligenciar sin generar PDF: sube el payload como
 * JSON al mismo path que ocupará el PDF y deja la fila en estado `borrador`.
 * Reutiliza la ruta ya reservada al volver a guardar, así el borrador no
 * multiplica archivos en Storage.
 */
export async function guardarBorradorAction(formData: FormData): Promise<{
  id: string;
  pdfPath: string;
}> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para gestionar formularios SST.");
  }

  const payloadStr = (formData.get("payload") as string) || "{}";
  const tipo = (formData.get("tipo") as FormularioTipo) || "permiso_caliente";
  const proyectoId = (formData.get("proyectoId") as string) || "";
  const borradorId = (formData.get("borradorId") as string) || "";
  const existingPdfPath = (formData.get("existingPdfPath") as string) || "";
  const area = (formData.get("area") as string) || "";
  const ubicacion = (formData.get("ubicacion") as string) || "";
  const fechaInicio = (formData.get("fechaInicio") as string) || hoyLocal();

  if (!proyectoId) {
    throw new Error("Seleccione el proyecto asociado para guardar el borrador.");
  }

  const db = createAdminClient();

  const { data: proyecto } = await (db.from("proyectos") as any)
    .select("empresa_id, subempresa_id")
    .eq("id", proyectoId)
    .single();

  if (!proyecto) throw new Error("Proyecto no encontrado o sin acceso.");

  const storagePath =
    existingPdfPath ||
    `${proyecto.empresa_id}/${proyecto.subempresa_id}/${proyectoId}/${crypto.randomUUID()}.pdf`;
  const jsonPath = storagePath.replace(/\.pdf$/, ".json");

  const { error: errJson } = await db.storage
    .from("pdfs-formularios")
    .upload(jsonPath, Buffer.from(payloadStr), {
      contentType: "application/pdf", // Cumple la restricción MIME del bucket
      upsert: true,
    });

  if (errJson) {
    console.error("Error guardando el borrador SST en storage:", errJson);
    throw new Error(`No fue posible guardar el borrador. Detalle: ${errJson.message}`);
  }

  let formularioId = borradorId;

  if (borradorId) {
    // Solo se actualiza mientras siga siendo borrador: si otro dispositivo ya lo
    // emitió, esta pestaña no puede devolverlo a borrador ni pisar su PDF.
    const { data: actualizado, error: errUpd } = await (db.from("formularios") as any)
      .update({
        area: area || null,
        ubicacion: ubicacion || "N/A",
        fecha_inicio: fechaInicio,
        proyecto_id: proyectoId,
        empresa_id: proyecto.empresa_id,
        subempresa_id: proyecto.subempresa_id,
        pdf_generado_path: storagePath,
      })
      .eq("id", borradorId)
      .eq("estado", "borrador")
      .select("id");

    if (errUpd) throw new Error(`No fue posible actualizar el borrador: ${errUpd.message}`);
    if (!actualizado?.length) {
      throw new Error("Este permiso ya fue emitido y no puede guardarse como borrador.");
    }

    if (tipo === "entrega_epp") {
      await sincronizarEntregaEpp(db, borradorId, payloadStr);
    } else if (tipo === "charla_seguridad") {
      await sincronizarCharlaSeguridad(db, borradorId, payloadStr);
    }
  } else {
    const { data: formRow, error: errInsert } = await (db.from("formularios") as any)
      .insert({
        tipo,
        estado: "borrador",
        proyecto_id: proyectoId,
        empresa_id: proyecto.empresa_id,
        subempresa_id: proyecto.subempresa_id,
        ubicacion: ubicacion || "N/A",
        area: area || null,
        creado_por: perfil.id,
        fecha_inicio: fechaInicio,
        pdf_generado_path: storagePath,
      })
      .select("id")
      .single();

    if (errInsert || !formRow) {
      throw new Error(`No fue posible registrar el borrador: ${errInsert?.message}`);
    }
    formularioId = formRow.id;

    if (tipo === "permiso_caliente") {
      await (db.from("caliente_detalles") as any).insert({ formulario_id: formularioId });
    } else if (tipo === "permiso_altura") {
      await (db.from("altura_detalles") as any).insert({ formulario_id: formularioId });
    } else if (tipo === "ats") {
      await (db.from("ats_detalles") as any).insert({ formulario_id: formularioId });
    } else if (tipo === "entrega_epp") {
      await sincronizarEntregaEpp(db, formularioId, payloadStr);
    } else if (tipo === "charla_seguridad") {
      await sincronizarCharlaSeguridad(db, formularioId, payloadStr);
    }
  }

  revalidatePath("/sst");
  revalidatePath(`/sst/${formularioId}`);

  return { id: formularioId, pdfPath: storagePath };
}
