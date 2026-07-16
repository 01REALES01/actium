"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSuperAdmin } from "@/lib/auth/guards";

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

