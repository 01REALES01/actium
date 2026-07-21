"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSuperAdmin, assertPuedeFinanzas } from "@/lib/auth/guards";
import { uploadComprobanteMovimiento, getSignedUrl } from "@/lib/storage";

const MovimientoTipoEnum = z.enum(["gasto", "traslado_entre_rubros", "ajuste"]);

const SolicitarMovimientoSchema = z.object({
  proyectoId: z.string().uuid(),
  rubroDestinoId: z.string().uuid(),
  tipo: MovimientoTipoEnum,
  monto: z.number().positive(),
  justificacion: z.string().min(1),
  rubroOrigenId: z.string().uuid().optional(),
});

export async function solicitarMovimientoAction(
  input: z.infer<typeof SolicitarMovimientoSchema>,
): Promise<{ id: string }> {
  const parsed = SolicitarMovimientoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertSuperAdmin();
  const { data, error } = await supabase.rpc("solicitar_movimiento_rubro", {
    p_proyecto_id: parsed.data.proyectoId,
    p_rubro_destino_id: parsed.data.rubroDestinoId,
    p_tipo: parsed.data.tipo,
    p_monto: parsed.data.monto,
    p_justificacion: parsed.data.justificacion,
    p_rubro_origen_id: parsed.data.rubroOrigenId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("La RPC no devolvió el id del movimiento creado.");

  revalidatePath("/finanzas/presupuesto");
  return { id: data };
}

export async function aprobarMovimientoAction(movimientoId: string): Promise<void> {
  const { supabase } = await assertSuperAdmin();
  const { error } = await supabase.rpc("aprobar_movimiento", { p_movimiento_id: movimientoId });
  if (error) throw new Error(error.message);
  revalidatePath("/finanzas/presupuesto");
}

export async function rechazarMovimientoAction(movimientoId: string): Promise<void> {
  const { supabase } = await assertSuperAdmin();
  const { error } = await supabase.rpc("rechazar_movimiento", { p_movimiento_id: movimientoId });
  if (error) throw new Error(error.message);
  revalidatePath("/finanzas/presupuesto");
}

export async function ejecutarMovimientoAction(movimientoId: string): Promise<void> {
  const { supabase } = await assertSuperAdmin();
  const { error } = await supabase.rpc("ejecutar_movimiento", { p_movimiento_id: movimientoId });
  if (error) throw new Error(error.message);
  revalidatePath("/finanzas/presupuesto");
  // Solo la transición a 'ejecutado' afecta el flujo de caja (la vista solo
  // suma movimientos ejecutados) — se invalida aquí, no en solicitar/aprobar.
  revalidatePath("/finanzas/flujo-caja/[proyectoId]", "page");
}

/**
 * Encadena solicitar -> aprobar -> ejecutar en una sola llamada desde la UI.
 * Valida previamente que el rubro destino tenga cupo suficiente para evitar
 * dejar movimientos en estado intermedio cuando el techo se supera.
 */
export async function registrarYEjecutarMovimientoAction(
  input: z.infer<typeof SolicitarMovimientoSchema>,
): Promise<{ id: string }> {
  const parsed = SolicitarMovimientoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  // Pre-validación de cupo solo para gastos (no aplica a ingresos)
  if (parsed.data.tipo === "gasto" || parsed.data.tipo === "traslado_entre_rubros") {
    const { supabase } = await assertSuperAdmin();
    const { data: balance } = await supabase
      .from("vw_rubro_balance")
      .select("disponible, categoria")
      .eq("rubro_id", parsed.data.rubroDestinoId)
      .single();

    if (balance && balance.categoria !== "ingresos") {
      const disponible = balance.disponible ?? 0;
      if (parsed.data.monto > disponible) {
        throw new Error(
          `El movimiento supera el cupo disponible del rubro (disponible: ${disponible.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}).`,
        );
      }
    }
  }

  const { id } = await solicitarMovimientoAction(input);
  await aprobarMovimientoAction(id);
  await ejecutarMovimientoAction(id);
  return { id };
}

const TIPOS_COMPROBANTE = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
];
const TAMANO_MAX_COMPROBANTE = 10 * 1024 * 1024; // 10 MiB

/**
 * Registra y ejecuta el movimiento y, si viene un archivo, lo sube al bucket
 * de comprobantes y lo asocia al movimiento. Recibe FormData porque los
 * archivos no se serializan en payloads JSON de Server Actions.
 */
export async function registrarMovimientoConComprobanteAction(
  formData: FormData,
): Promise<{ id: string }> {
  const raw = {
    proyectoId: String(formData.get("proyectoId") ?? ""),
    rubroDestinoId: String(formData.get("rubroDestinoId") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    monto: Number(formData.get("monto") ?? 0),
    justificacion: String(formData.get("justificacion") ?? ""),
    rubroOrigenId: formData.get("rubroOrigenId")
      ? String(formData.get("rubroOrigenId"))
      : undefined,
  };

  const parsed = SolicitarMovimientoSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const file = formData.get("comprobante");
  const tieneArchivo = file instanceof File && file.size > 0;

  if (tieneArchivo) {
    if (!TIPOS_COMPROBANTE.includes(file.type)) {
      throw new Error("El comprobante debe ser un PDF o una imagen (PNG, JPG, WEBP).");
    }
    if (file.size > TAMANO_MAX_COMPROBANTE) {
      throw new Error("El comprobante no puede superar los 10 MB.");
    }
  }

  const { id } = await registrarYEjecutarMovimientoAction(parsed.data);

  if (tieneArchivo) {
    const { supabase } = await assertSuperAdmin();
    const { data: proy, error: proyErr } = await supabase
      .from("proyectos")
      .select("empresa_id, subempresa_id")
      .eq("id", parsed.data.proyectoId)
      .single();

    if (proyErr || !proy) {
      throw new Error("El movimiento se registró, pero no fue posible ubicar el proyecto para adjuntar el comprobante.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = await uploadComprobanteMovimiento(
      supabase,
      { bytes, nombre: file.name, tipo: file.type },
      { empresaId: proy.empresa_id, subempresaId: proy.subempresa_id, proyectoId: parsed.data.proyectoId },
    );

    const { error: updErr } = await supabase
      .from("movimientos")
      .update({ comprobante_path: path, comprobante_nombre: file.name })
      .eq("id", id);

    if (updErr) {
      throw new Error(`El comprobante se subió pero no fue posible asociarlo al movimiento: ${updErr.message}`);
    }
  }

  revalidatePath("/finanzas/presupuesto/[proyectoId]", "page");
  return { id };
}

const SobregiroSchema = z.object({
  proyectoId: z.string().uuid(),
  activo: z.boolean(),
});

/**
 * Activa/desactiva el "extra presupuesto" (sobregiro) del proyecto. Una vez
 * activo, los movimientos pueden superar el techo de cualquier rubro (con
 * trazabilidad). Permitido a super_admin y financiero.
 */
export async function setSobregiroAction(
  input: z.infer<typeof SobregiroSchema>,
): Promise<{ activo: boolean }> {
  const parsed = SobregiroSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeFinanzas();
  const { error } = await supabase.rpc("set_sobregiro_proyecto", {
    p_proyecto_id: parsed.data.proyectoId,
    p_activo: parsed.data.activo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/finanzas/presupuesto/[proyectoId]", "page");
  return { activo: parsed.data.activo };
}

/** Devuelve una URL firmada temporal para ver/descargar el comprobante de un movimiento. */
export async function getComprobanteUrlAction(movimientoId: string): Promise<string> {
  const { supabase } = await assertSuperAdmin();
  const { data: mov, error } = await supabase
    .from("movimientos")
    .select("comprobante_path")
    .eq("id", movimientoId)
    .single();

  if (error || !mov?.comprobante_path) {
    throw new Error("Este movimiento no tiene comprobante adjunto.");
  }

  return getSignedUrl(supabase, "comprobantes-finanzas", mov.comprobante_path, 300);
}

const CrearPresupuestoPropioSchema = z.object({
  empresaId: z.string().uuid(),
});

/**
 * Provisiona el "presupuesto propio" de una empresa con un clic, sin pasar
 * por el formulario completo de Proyectos: bajo el capó sigue siendo un
 * proyecto con es_interno=true (reutiliza toda la infraestructura de
 * rubros/movimientos/RLS), pero el usuario nunca necesita pensar en
 * "crear un proyecto" para esto — es manejo interno, no un negocio.
 */
export async function crearPresupuestoPropioAction(
  input: z.infer<typeof CrearPresupuestoPropioSchema>,
): Promise<{ id: string }> {
  const parsed = CrearPresupuestoPropioSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase, perfil } = await assertSuperAdmin();

  const { data: subempresa, error: subError } = await supabase
    .from("subempresas")
    .select("id")
    .eq("empresa_id", parsed.data.empresaId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (subError) throw new Error(subError.message);
  if (!subempresa) throw new Error("Esa empresa no tiene ninguna subempresa registrada todavía.");

  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      empresa_id: parsed.data.empresaId,
      subempresa_id: subempresa.id,
      nombre: "Presupuesto propio",
      codigo: "INTERNO",
      estado: "en_curso",
      es_interno: true,
      created_by: perfil.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Esta empresa ya tiene un presupuesto propio configurado.");
    throw new Error(error.message);
  }
  if (!data) throw new Error("No fue posible crear el presupuesto propio.");

  revalidatePath("/finanzas");
  revalidatePath("/finanzas/presupuesto");
  return { id: data.id };
}

