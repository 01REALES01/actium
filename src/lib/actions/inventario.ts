"use server";

import { z } from "zod";
import { assertPuedeGestionarInventario } from "@/lib/auth/guards";
import { revalidarInventario } from "@/lib/actions/revalidar-inventario";
import { uploadPdfConteo } from "@/lib/storage";

const HerramientaCondicionEnum = z.enum(["bueno", "regular", "malo"]);
const EppMovimientoTipoEnum = z.enum(["ingreso", "salida", "ajuste"]);

// ─── Catálogo de herramientas ───────────────────────────────────────────────

const CatalogoSchema = z.object({
  nombre: z.string().min(1).max(160),
  categoria: z.string().max(60).optional(),
  marca: z.string().max(60).optional(),
  descripcion: z.string().max(500).optional(),
  unidadMedida: z.string().max(20).optional(),
});

export async function crearCatalogoAction(
  input: z.infer<typeof CatalogoSchema>,
): Promise<{ id: string }> {
  const parsed = CatalogoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase, perfil } = await assertPuedeGestionarInventario();
  const { data, error } = await supabase
    .from("herramientas_catalogo")
    .insert({
      nombre: parsed.data.nombre,
      categoria: parsed.data.categoria ?? null,
      marca: parsed.data.marca ?? null,
      descripcion: parsed.data.descripcion ?? null,
      unidad_medida: parsed.data.unidadMedida ?? "UND.",
      created_by: perfil.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un tipo de herramienta con ese nombre.");
    throw new Error(error.message);
  }

  revalidarInventario();
  return { id: data.id };
}

const EditarCatalogoSchema = CatalogoSchema.extend({
  catalogoId: z.string().uuid(),
  activo: z.boolean().optional(),
});

export async function editarCatalogoAction(
  input: z.infer<typeof EditarCatalogoSchema>,
): Promise<void> {
  const parsed = EditarCatalogoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeGestionarInventario();
  const { error } = await supabase
    .from("herramientas_catalogo")
    .update({
      nombre: parsed.data.nombre,
      categoria: parsed.data.categoria ?? null,
      marca: parsed.data.marca ?? null,
      descripcion: parsed.data.descripcion ?? null,
      unidad_medida: parsed.data.unidadMedida ?? "UND.",
      ...(parsed.data.activo !== undefined ? { activo: parsed.data.activo } : {}),
    })
    .eq("id", parsed.data.catalogoId);

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un tipo de herramienta con ese nombre.");
    throw new Error(error.message);
  }

  revalidarInventario();
}

/**
 * Elimina (soft delete) un tipo de herramienta del catálogo. Se bloquea si aún
 * tiene unidades activas: borrarlo las dejaría huérfanas, sin ninguna pantalla
 * desde la que consultarlas o devolverlas.
 */
export async function eliminarCatalogoAction(catalogoId: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(catalogoId);
  if (!parsed.success) throw new Error("Identificador de catálogo inválido.");

  const { supabase } = await assertPuedeGestionarInventario();

  const { error } = await supabase.rpc("eliminar_catalogo_herramienta", {
    p_catalogo_id: parsed.data,
  });

  if (error) {
    if (error.code === "23514")
      throw new Error("No es posible eliminar este tipo: todavía tiene unidades registradas. Elimínalas primero.");
    if (error.code === "P0002") throw new Error("Catálogo no encontrado.");
    throw new Error(error.message);
  }

  revalidarInventario();
}

// ─── Unidades ───────────────────────────────────────────────────────────────

const UnidadSchema = z.object({
  catalogoId: z.string().uuid(),
  codigo: z.string().min(1).max(60),
  serial: z.string().max(120).optional(),
  fechaAdquisicion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  costoAdquisicion: z.number().nonnegative().optional(),
  notas: z.string().max(500).optional(),
});

export async function crearUnidadAction(
  input: z.infer<typeof UnidadSchema>,
): Promise<{ id: string }> {
  const parsed = UnidadSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase, perfil } = await assertPuedeGestionarInventario();
  const { data, error } = await supabase
    .from("herramienta_unidades")
    .insert({
      catalogo_id: parsed.data.catalogoId,
      codigo: parsed.data.codigo,
      serial: parsed.data.serial ?? null,
      fecha_adquisicion: parsed.data.fechaAdquisicion ?? null,
      costo_adquisicion: parsed.data.costoAdquisicion ?? null,
      notas: parsed.data.notas ?? null,
      created_by: perfil.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe una herramienta con ese código.");
    throw new Error(error.message);
  }

  revalidarInventario();
  return { id: data.id };
}

const EditarUnidadSchema = UnidadSchema.omit({ catalogoId: true }).extend({
  unidadId: z.string().uuid(),
});

export async function editarUnidadAction(
  input: z.infer<typeof EditarUnidadSchema>,
): Promise<void> {
  const parsed = EditarUnidadSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeGestionarInventario();
  const { error } = await supabase
    .from("herramienta_unidades")
    .update({
      codigo: parsed.data.codigo,
      serial: parsed.data.serial ?? null,
      fecha_adquisicion: parsed.data.fechaAdquisicion ?? null,
      costo_adquisicion: parsed.data.costoAdquisicion ?? null,
      notas: parsed.data.notas ?? null,
    })
    .eq("id", parsed.data.unidadId);

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe una herramienta con ese código.");
    throw new Error(error.message);
  }

  revalidarInventario();
}

const CambiarEstadoUnidadSchema = z.object({
  unidadId: z.string().uuid(),
  estado: z.enum(["disponible", "mantenimiento", "baja", "perdida"]),
});

/**
 * Cambia el estado de una unidad fuera del flujo de préstamo (por ejemplo,
 * enviarla a mantenimiento preventivo o darla de baja). No admite 'asignada':
 * ese estado solo lo asigna `asignarHerramientaAction`, porque requiere abrir
 * un movimiento en el ledger, no solo escribir la columna.
 */
export async function cambiarEstadoUnidadAction(
  input: z.infer<typeof CambiarEstadoUnidadSchema>,
): Promise<void> {
  const parsed = CambiarEstadoUnidadSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeGestionarInventario();
  const { error } = await supabase
    .from("herramienta_unidades")
    .update({ estado: parsed.data.estado, proyecto_id: null })
    .eq("id", parsed.data.unidadId);

  if (error) {
    if (error.code === "23514")
      throw new Error("La herramienta está asignada; debe devolverse antes de cambiar su estado.");
    throw new Error(error.message);
  }

  revalidarInventario();
}

/**
 * Elimina (soft delete) una unidad. Se bloquea si está asignada: hay que
 * devolverla primero, para que el proyecto no quede con un préstamo abierto
 * de una herramienta que ya no existe en el catálogo.
 */
export async function eliminarUnidadAction(unidadId: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(unidadId);
  if (!parsed.success) throw new Error("Identificador de herramienta inválido.");

  const { supabase } = await assertPuedeGestionarInventario();

  const { error } = await supabase.rpc("eliminar_unidad_herramienta", {
    p_unidad_id: parsed.data,
  });

  if (error) {
    if (error.code === "23514")
      throw new Error("La herramienta está asignada; debe devolverse antes de eliminarla.");
    if (error.code === "P0002") throw new Error("Herramienta no encontrada.");
    throw new Error(error.message);
  }

  revalidarInventario();
}

// ─── Préstamos ──────────────────────────────────────────────────────────────

const AsignarHerramientaSchema = z.object({
  unidadId: z.string().uuid(),
  proyectoId: z.string().uuid(),
  responsableId: z.string().uuid().optional(),
  responsableNombre: z.string().max(160).optional(),
  notas: z.string().max(500).optional(),
});

export async function asignarHerramientaAction(
  input: z.infer<typeof AsignarHerramientaSchema>,
): Promise<{ id: string }> {
  const parsed = AsignarHerramientaSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeGestionarInventario();
  const { data, error } = await supabase.rpc("asignar_herramienta", {
    p_unidad_id: parsed.data.unidadId,
    p_proyecto_id: parsed.data.proyectoId,
    p_responsable_id: parsed.data.responsableId ?? null,
    p_responsable_nombre: parsed.data.responsableNombre ?? null,
    p_notas: parsed.data.notas ?? null,
  });

  if (error) {
    if (error.code === "23514") throw new Error("La herramienta no está disponible para asignar.");
    if (error.code === "P0002") throw new Error("Herramienta o proyecto no encontrado.");
    throw new Error(error.message);
  }
  if (!data) throw new Error("La RPC no devolvió el id del movimiento creado.");

  revalidarInventario();
  return { id: data };
}

const DevolverHerramientaSchema = z.object({
  unidadId: z.string().uuid(),
  condicion: HerramientaCondicionEnum,
  notas: z.string().max(500).optional(),
});

export async function devolverHerramientaAction(
  input: z.infer<typeof DevolverHerramientaSchema>,
): Promise<{ id: string }> {
  const parsed = DevolverHerramientaSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeGestionarInventario();
  const { data, error } = await supabase.rpc("devolver_herramienta", {
    p_unidad_id: parsed.data.unidadId,
    p_condicion: parsed.data.condicion,
    p_notas: parsed.data.notas ?? null,
  });

  if (error) {
    if (error.code === "P0002") throw new Error("La herramienta no tiene un préstamo abierto que devolver.");
    throw new Error(error.message);
  }
  if (!data) throw new Error("La RPC no devolvió el id del movimiento actualizado.");

  revalidarInventario();
  return { id: data };
}

// ─── Conteos de herramientas (Hacer Inventario) ────────────────────────────

const AbrirConteoSchema = z.object({
  proyectoId: z.string().uuid().nullable(),
});

export async function abrirConteoAction(
  input: z.infer<typeof AbrirConteoSchema>,
): Promise<{ id: string }> {
  const parsed = AbrirConteoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeGestionarInventario();
  const { data, error } = await supabase.rpc("abrir_conteo_herramientas", {
    p_proyecto_id: parsed.data.proyectoId,
  });

  if (error) {
    if (error.code === "23514") throw new Error(error.message);
    if (error.code === "P0002") throw new Error("Proyecto no encontrado.");
    throw new Error(error.message);
  }
  if (!data) throw new Error("La RPC no devolvió el id del conteo creado.");

  revalidarInventario();
  return { id: data };
}

const MarcarItemConteoSchema = z.object({
  itemId: z.string().uuid(),
  resultado: z.enum(["existe", "novedad", "faltante"]),
  nota: z.string().max(300).optional(),
});

export async function marcarItemConteoAction(
  input: z.infer<typeof MarcarItemConteoSchema>,
): Promise<void> {
  const parsed = MarcarItemConteoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeGestionarInventario();
  const { error } = await supabase.rpc("marcar_item_conteo", {
    p_item_id: parsed.data.itemId,
    p_resultado: parsed.data.resultado,
    p_nota: parsed.data.nota ?? null,
  });

  if (error) {
    if (error.code === "23514") throw new Error("Este conteo ya está cerrado y no admite cambios.");
    if (error.code === "P0002") throw new Error("Ítem de conteo no encontrado.");
    throw new Error(error.message);
  }

  revalidarInventario();
}

/**
 * Cierra el conteo (exige todos los ítems marcados) y sube el acta en PDF ya
 * generada en el cliente. El PDF se sube después de que la RPC confirma el
 * cierre: no tiene sentido guardar un acta de un conteo que no pudo cerrarse.
 */
export async function cerrarConteoAction(formData: FormData): Promise<{ id: string }> {
  const conteoId = z.string().uuid().parse(formData.get("conteoId"));
  const responsableNombre = z.string().min(1).max(160).parse(formData.get("responsableNombre"));
  const observacionesRaw = formData.get("observaciones");
  const observaciones = z
    .string()
    .max(1000)
    .optional()
    .parse(typeof observacionesRaw === "string" && observacionesRaw ? observacionesRaw : undefined);
  const pdfFile = formData.get("pdfFile");
  if (!(pdfFile instanceof Blob)) throw new Error("Falta el PDF del acta.");

  const { supabase } = await assertPuedeGestionarInventario();

  const { error: cerrarError } = await supabase.rpc("cerrar_conteo_herramientas", {
    p_conteo_id: conteoId,
    p_responsable_nombre: responsableNombre,
    p_observaciones: observaciones ?? null,
  });

  if (cerrarError) {
    if (cerrarError.code === "23514") throw new Error(cerrarError.message);
    if (cerrarError.code === "P0002") throw new Error("Conteo no encontrado.");
    throw new Error(cerrarError.message);
  }

  const pdfPath = await uploadPdfConteo(supabase, pdfFile, { conteoId });

  const { error: updateError } = await supabase
    .from("herramienta_conteos")
    .update({ pdf_path: pdfPath })
    .eq("id", conteoId);

  if (updateError) throw new Error(updateError.message);

  revalidarInventario();
  return { id: conteoId };
}

export async function marcarFaltantesPerdidasAction(conteoId: string): Promise<{ afectadas: number }> {
  const parsed = z.string().uuid().safeParse(conteoId);
  if (!parsed.success) throw new Error("Identificador de conteo inválido.");

  const { supabase } = await assertPuedeGestionarInventario();
  const { data, error } = await supabase.rpc("marcar_faltantes_como_perdidas", {
    p_conteo_id: parsed.data,
  });

  if (error) {
    if (error.code === "23514") throw new Error(error.message);
    if (error.code === "P0002") throw new Error("Conteo no encontrado.");
    throw new Error(error.message);
  }

  revalidarInventario();
  return { afectadas: data ?? 0 };
}

/** Elimina un conteo en borrador (cascada a sus ítems). Un conteo cerrado es el acta y no se borra. */
export async function eliminarConteoAction(conteoId: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(conteoId);
  if (!parsed.success) throw new Error("Identificador de conteo inválido.");

  const { supabase } = await assertPuedeGestionarInventario();

  const { data: conteo, error: conteoError } = await supabase
    .from("herramienta_conteos")
    .select("estado")
    .eq("id", parsed.data)
    .maybeSingle();

  if (conteoError) throw new Error(conteoError.message);
  if (!conteo) throw new Error("Conteo no encontrado.");
  if (conteo.estado !== "borrador") {
    throw new Error("Solo se puede eliminar un conteo que aún esté en progreso.");
  }

  const { error } = await supabase.from("herramienta_conteos").delete().eq("id", parsed.data);
  if (error) throw new Error(error.message);

  revalidarInventario();
}

// ─── EPP ────────────────────────────────────────────────────────────────────

const EppItemSchema = z.object({
  proyectoId: z.string().uuid(),
  nombre: z.string().min(1).max(160),
  unidad: z.enum(["UND.", "PAR."]).optional(),
  talla: z.string().max(20).optional(),
  stockMinimo: z.number().int().nonnegative().optional(),
  elementoId: z.string().max(60).optional(),
});

export async function crearItemEppAction(
  input: z.infer<typeof EppItemSchema>,
): Promise<{ id: string }> {
  const parsed = EppItemSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase, perfil } = await assertPuedeGestionarInventario();
  const { data, error } = await supabase
    .from("epp_inventario")
    .insert({
      proyecto_id: parsed.data.proyectoId,
      nombre: parsed.data.nombre,
      unidad: parsed.data.unidad ?? "UND.",
      talla: parsed.data.talla ?? null,
      stock_minimo: parsed.data.stockMinimo ?? 0,
      elemento_id: parsed.data.elementoId ?? null,
      created_by: perfil.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ese elemento ya existe en el inventario del proyecto.");
    throw new Error(error.message);
  }

  revalidarInventario();
  return { id: data.id };
}

const EditarItemEppSchema = z.object({
  inventarioId: z.string().uuid(),
  nombre: z.string().min(1).max(160),
  unidad: z.enum(["UND.", "PAR."]).optional(),
  talla: z.string().max(20).optional(),
  stockMinimo: z.number().int().nonnegative().optional(),
  elementoId: z.string().max(60).nullable().optional(),
});

export async function editarItemEppAction(
  input: z.infer<typeof EditarItemEppSchema>,
): Promise<void> {
  const parsed = EditarItemEppSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeGestionarInventario();
  const { error } = await supabase
    .from("epp_inventario")
    .update({
      nombre: parsed.data.nombre,
      unidad: parsed.data.unidad ?? "UND.",
      talla: parsed.data.talla ?? null,
      stock_minimo: parsed.data.stockMinimo ?? 0,
      elemento_id: parsed.data.elementoId ?? null,
    })
    .eq("id", parsed.data.inventarioId);

  if (error) {
    if (error.code === "23505") throw new Error("Ese elemento ya existe en el inventario del proyecto.");
    throw new Error(error.message);
  }

  revalidarInventario();
}

export async function eliminarItemEppAction(inventarioId: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(inventarioId);
  if (!parsed.success) throw new Error("Identificador de elemento inválido.");

  const { supabase } = await assertPuedeGestionarInventario();
  const { error } = await supabase
    .from("epp_inventario")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data);

  if (error) throw new Error(error.message);
  revalidarInventario();
}

const RegistrarMovimientoEppSchema = z.object({
  inventarioId: z.string().uuid(),
  tipo: EppMovimientoTipoEnum,
  cantidad: z.number().int().refine((v) => v !== 0, "La cantidad no puede ser cero."),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  motivo: z.string().max(300).optional(),
  entregadoA: z.string().max(160).optional(),
  empleadoId: z.string().uuid().optional(),
});

export async function registrarMovimientoEppAction(
  input: z.infer<typeof RegistrarMovimientoEppSchema>,
): Promise<{ id: string }> {
  const parsed = RegistrarMovimientoEppSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  if (parsed.data.tipo !== "ajuste" && parsed.data.cantidad <= 0) {
    throw new Error("La cantidad debe ser mayor que cero.");
  }

  const { supabase } = await assertPuedeGestionarInventario();
  const { data, error } = await supabase.rpc("registrar_movimiento_epp", {
    p_inventario_id: parsed.data.inventarioId,
    p_tipo: parsed.data.tipo,
    p_cantidad: parsed.data.tipo === "ajuste" ? parsed.data.cantidad : Math.abs(parsed.data.cantidad),
    p_fecha: parsed.data.fecha ?? null,
    p_motivo: parsed.data.motivo ?? null,
    p_entregado_a: parsed.data.entregadoA ?? null,
    p_empleado_id: parsed.data.empleadoId ?? null,
  });

  if (error) {
    if (error.code === "23514") throw new Error("El movimiento dejaría el saldo en negativo.");
    if (error.code === "P0002") throw new Error("Elemento de EPP no encontrado.");
    throw new Error(error.message);
  }
  if (!data) throw new Error("La RPC no devolvió el id del movimiento creado.");

  revalidarInventario();
  return { id: data };
}
