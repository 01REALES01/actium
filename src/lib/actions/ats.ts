"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";

// =============================================================================
// Acciones de formularios ATS (Análisis de Trabajo Seguro)
//
// Toda la mutación ocurre en el servidor para poder:
//   1. Verificar permisos (rol) antes de tocar la BD — defensa en profundidad
//      sobre la RLS.
//   2. Derivar el tenant (empresa_id / subempresa_id) del PROYECTO, no del
//      usuario, de modo que admins/sst sin subempresa propia también puedan
//      crear formularios coherentes con el tenant del proyecto.
//   3. Garantizar atomicidad: si falla cualquier inserción hija, se elimina el
//      formulario padre (cascade) para no dejar registros huérfanos.
//
// La firma se sube en el cliente al bucket `firmas` (storage) y aquí solo se
// recibe la ruta resultante.
// =============================================================================

const PasoSchema = z.object({
  paso: z.string().min(1, "Cada paso requiere descripción"),
  peligros: z.string().optional().default(""),
  consecuencias: z.string().optional().default(""),
  controles: z.string().optional().default(""),
});

const CrearAtsSchema = z.object({
  proyectoId: z.string().min(1, "Seleccione un proyecto"),
  ubicacion: z.string().min(1, "Indique la ubicación"),
  area: z.string().optional().default(""),
  // Para borrador, pasos/trabajadores/firma pueden ir vacíos; se exigen al
  // emitir (estado completado). La validación dura se hace abajo según estado.
  estado: z.enum(["borrador", "completado"]).default("completado"),
  pasos: z.array(PasoSchema).default([]),
  trabajadoresIds: z.array(z.string().min(1)).default([]),
  firmaPath: z.string().nullable().optional(),
  responsableNombre: z.string().min(1),
});

const ActualizarAtsSchema = z.object({
  formularioId: z.string().min(1),
  ubicacion: z.string().min(1, "Indique la ubicación"),
  area: z.string().optional().default(""),
  pasos: z.array(PasoSchema).min(1, "Agregue al menos un paso"),
  trabajadoresIds: z.array(z.string().min(1)).min(1, "Seleccione al menos un trabajador"),
  firmaPath: z.string().nullable().optional(),
  responsableNombre: z.string().min(1),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}

// ─── Crear ────────────────────────────────────────────────────────────────────

export async function crearAtsAction(
  input: z.infer<typeof CrearAtsSchema>,
): Promise<{ id: string }> {
  const parsed = CrearAtsSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstError(parsed.error));
  const data = parsed.data;

  // Al emitir (completado) se exige el contenido mínimo de un ATS válido.
  if (data.estado === "completado") {
    if (data.pasos.length === 0) throw new Error("Agregue al menos un paso.");
    if (data.trabajadoresIds.length === 0) throw new Error("Seleccione al menos un trabajador.");
    if (!data.firmaPath) throw new Error("Debe registrar la firma del responsable.");
  }

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para crear formularios SST.");
  }

  // Tenant derivado del proyecto (empresa_id / subempresa_id son NOT NULL).
  const { data: proyecto, error: errProy } = await supabase
    .from("proyectos")
    .select("empresa_id, subempresa_id")
    .eq("id", data.proyectoId)
    .single();

  if (errProy || !proyecto) throw new Error("Proyecto no encontrado o sin acceso.");
  const tenant = proyecto as { empresa_id: string; subempresa_id: string };

  // 1. Formulario padre
  const { data: formRow, error: errForm } = await (supabase.from("formularios") as any)
    .insert({
      tipo: "ats",
      estado: data.estado,
      proyecto_id: data.proyectoId,
      empresa_id: tenant.empresa_id,
      subempresa_id: tenant.subempresa_id,
      ubicacion: data.ubicacion,
      area: data.area || null,
      creado_por: perfil.id,
      fecha_inicio: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (errForm || !formRow) {
    throw new Error("No fue posible crear el formulario. Verifique sus permisos.");
  }
  const formularioId = (formRow as { id: string }).id;

  try {
    // 2. Detalle 1:1 (permisos requeridos quedan en sus valores por defecto)
    const { error: errDet } = await (supabase.from("ats_detalles") as any).insert({
      formulario_id: formularioId,
    });
    if (errDet) throw errDet;

    // 3. Pasos (columnas reales: paso / peligros / consecuencias / controles)
    if (data.pasos.length > 0) {
      const pasosRows = data.pasos.map((p, idx) => ({
        formulario_id: formularioId,
        orden: idx + 1,
        paso: p.paso,
        peligros: p.peligros || null,
        consecuencias: p.consecuencias || null,
        controles: p.controles || null,
      }));
      const { error: errPasos } = await (supabase.from("ats_pasos") as any).insert(pasosRows);
      if (errPasos) throw errPasos;
    }

    // 4. Trabajadores: fila del responsable (solo si ya firmó) + ejecutores
    const trabajadoresRows: any[] = [];
    if (data.firmaPath) {
      trabajadoresRows.push({
        formulario_id: formularioId,
        empleado_id: null,
        nombre_libre: data.responsableNombre,
        cargo: "Responsable",
        firma_path: data.firmaPath,
      });
    }
    for (const empId of data.trabajadoresIds) {
      trabajadoresRows.push({
        formulario_id: formularioId,
        empleado_id: empId,
        nombre_libre: null,
        cargo: null,
        firma_path: null,
      });
    }
    if (trabajadoresRows.length > 0) {
      const { error: errTrab } = await (supabase.from("ats_trabajadores") as any).insert(
        trabajadoresRows,
      );
      if (errTrab) throw errTrab;
    }
  } catch (e) {
    // Rollback: elimina el padre (cascade borra los hijos ya insertados).
    await supabase.from("formularios").delete().eq("id", formularioId);
    throw new Error(
      e instanceof Error ? `No fue posible guardar el ATS: ${e.message}` : "No fue posible guardar el ATS.",
    );
  }

  revalidatePath("/sst");
  return { id: formularioId };
}

// ─── Actualizar ─────────────────────────────────────────────────────────────

export async function actualizarAtsAction(
  input: z.infer<typeof ActualizarAtsSchema>,
): Promise<void> {
  const parsed = ActualizarAtsSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstError(parsed.error));
  const data = parsed.data;

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para editar formularios SST.");
  }

  // Verifica estado: no se edita un formulario ya firmado o archivado.
  const { data: formActual, error: errGet } = await supabase
    .from("formularios")
    .select("estado, tipo")
    .eq("id", data.formularioId)
    .single();

  if (errGet || !formActual) throw new Error("Formulario no encontrado o sin acceso.");
  const actual = formActual as { estado: string; tipo: string };
  if (actual.tipo !== "ats") throw new Error("Este formulario no es un ATS.");
  if (actual.estado === "firmado" || actual.estado === "archivado") {
    throw new Error("No se puede editar un formulario ya firmado o archivado.");
  }

  // 1. Cabecera
  const { error: errUpd } = await (supabase.from("formularios") as any)
    .update({ ubicacion: data.ubicacion, area: data.area || null })
    .eq("id", data.formularioId);
  if (errUpd) throw new Error("No fue posible actualizar el formulario.");

  // 2. Reemplazar pasos
  await supabase.from("ats_pasos").delete().eq("formulario_id", data.formularioId);
  const pasosRows = data.pasos.map((p, idx) => ({
    formulario_id: data.formularioId,
    orden: idx + 1,
    paso: p.paso,
    peligros: p.peligros || null,
    consecuencias: p.consecuencias || null,
    controles: p.controles || null,
  }));
  const { error: errPasos } = await (supabase.from("ats_pasos") as any).insert(pasosRows);
  if (errPasos) throw new Error("No fue posible actualizar los pasos.");

  // 3. Reemplazar trabajadores ejecutores (se conserva la firma del responsable)
  // Borra solo las filas de ejecutores (empleado_id no nulo); la fila del
  // responsable con firma permanece salvo que llegue una firma nueva.
  await supabase
    .from("ats_trabajadores")
    .delete()
    .eq("formulario_id", data.formularioId)
    .not("empleado_id", "is", null);

  const ejecutoresRows = data.trabajadoresIds.map((empId) => ({
    formulario_id: data.formularioId,
    empleado_id: empId,
    nombre_libre: null,
    cargo: null,
    firma_path: null,
  }));
  const { error: errTrab } = await (supabase.from("ats_trabajadores") as any).insert(
    ejecutoresRows,
  );
  if (errTrab) throw new Error("No fue posible actualizar el personal.");

  // 4. Firma nueva (opcional): reemplaza la fila del responsable
  if (data.firmaPath) {
    await supabase
      .from("ats_trabajadores")
      .delete()
      .eq("formulario_id", data.formularioId)
      .is("empleado_id", null);
    const { error: errFirma } = await (supabase.from("ats_trabajadores") as any).insert({
      formulario_id: data.formularioId,
      empleado_id: null,
      nombre_libre: data.responsableNombre,
      cargo: "Responsable",
      firma_path: data.firmaPath,
    });
    if (errFirma) throw new Error("No fue posible actualizar la firma.");
  }

  revalidatePath("/sst");
  revalidatePath(`/sst/${data.formularioId}`);
}

// ─── Firma individual de un trabajador ────────────────────────────────────────

const FirmarTrabajadorSchema = z.object({
  trabajadorId: z.string().min(1),
  firmaPath: z.string().min(1),
});

export async function firmarTrabajadorAction(
  input: z.infer<typeof FirmarTrabajadorSchema>,
): Promise<void> {
  const parsed = FirmarTrabajadorSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstError(parsed.error));

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para registrar firmas.");
  }

  // Verifica que el formulario asociado no esté ya cerrado.
  const { data: row, error: errRow } = await supabase
    .from("ats_trabajadores")
    .select("formulario_id, formularios:formulario_id (estado)")
    .eq("id", parsed.data.trabajadorId)
    .single();

  if (errRow || !row) throw new Error("Trabajador no encontrado o sin acceso.");
  const estado = (row as any).formularios?.estado as string | undefined;
  if (estado === "firmado" || estado === "archivado") {
    throw new Error("El formulario ya está cerrado.");
  }
  const formularioId = (row as any).formulario_id as string;

  const { error } = await (supabase.from("ats_trabajadores") as any)
    .update({ firma_path: parsed.data.firmaPath })
    .eq("id", parsed.data.trabajadorId);

  if (error) throw new Error("No fue posible registrar la firma.");

  revalidatePath(`/sst/${formularioId}`);
}

// ─── Cerrar / firmar formulario (completado → firmado) ────────────────────────

export async function cerrarAtsAction(formularioId: string): Promise<void> {
  if (!formularioId) throw new Error("Formulario inválido.");

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para cerrar formularios.");
  }

  // La RPC valida estado=completado y exige ≥1 firma de trabajador.
  const { error } = await supabase.rpc("cerrar_formulario_sst", {
    p_formulario_id: formularioId,
  } as any);

  if (error) throw new Error(error.message);

  revalidatePath("/sst");
  revalidatePath(`/sst/${formularioId}`);
}

// ─── Duplicar un ATS existente (para el uso diario) ──────────────────────────

export async function duplicarAtsAction(formularioId: string): Promise<{ id: string }> {
  if (!formularioId) throw new Error("Formulario inválido.");

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para duplicar formularios SST.");
  }

  // Carga el formulario origen + sus pasos + ejecutores (sin firmas).
  const [origenRes, pasosRes, trabRes] = await Promise.all([
    supabase
      .from("formularios")
      .select("proyecto_id, empresa_id, subempresa_id, ubicacion, area, tipo")
      .eq("id", formularioId)
      .single(),
    supabase.from("ats_pasos").select("*").eq("formulario_id", formularioId).order("orden"),
    supabase
      .from("ats_trabajadores")
      .select("empleado_id")
      .eq("formulario_id", formularioId)
      .not("empleado_id", "is", null),
  ]);

  if (origenRes.error || !origenRes.data) throw new Error("Formulario origen no encontrado.");
  const origen = (origenRes as any).data as {
    proyecto_id: string;
    empresa_id: string;
    subempresa_id: string;
    ubicacion: string | null;
    area: string | null;
    tipo: string;
  };
  if (origen.tipo !== "ats") throw new Error("Solo se pueden duplicar formularios ATS.");

  // 1. Nuevo formulario en borrador, fechado hoy.
  const { data: nuevo, error: errNuevo } = await (supabase.from("formularios") as any)
    .insert({
      tipo: "ats",
      estado: "borrador",
      proyecto_id: origen.proyecto_id,
      empresa_id: origen.empresa_id,
      subempresa_id: origen.subempresa_id,
      ubicacion: origen.ubicacion,
      area: origen.area,
      creado_por: perfil.id,
      fecha_inicio: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (errNuevo || !nuevo) throw new Error("No fue posible duplicar el formulario.");
  const nuevoId = (nuevo as { id: string }).id;

  try {
    await (supabase.from("ats_detalles") as any).insert({ formulario_id: nuevoId });

    const pasos = (pasosRes.data ?? []) as any[];
    if (pasos.length > 0) {
      const pasosRows = pasos.map((p, idx) => ({
        formulario_id: nuevoId,
        orden: idx + 1,
        paso: p.paso,
        peligros: p.peligros,
        consecuencias: p.consecuencias,
        controles: p.controles,
      }));
      const { error: e } = await (supabase.from("ats_pasos") as any).insert(pasosRows);
      if (e) throw e;
    }

    const trabajadores = (trabRes.data ?? []) as any[];
    if (trabajadores.length > 0) {
      const trabRows = trabajadores.map((t) => ({
        formulario_id: nuevoId,
        empleado_id: t.empleado_id,
        nombre_libre: null,
        cargo: null,
        firma_path: null, // las firmas no se copian
      }));
      const { error: e } = await (supabase.from("ats_trabajadores") as any).insert(trabRows);
      if (e) throw e;
    }
  } catch (e) {
    await supabase.from("formularios").delete().eq("id", nuevoId);
    throw new Error(
      e instanceof Error ? `No fue posible duplicar el ATS: ${e.message}` : "No fue posible duplicar el ATS.",
    );
  }

  revalidatePath("/sst");
  return { id: nuevoId };
}
