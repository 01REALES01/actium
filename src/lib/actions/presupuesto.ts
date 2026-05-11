"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = createClient();
  const { data, error } = await supabase.rpc("solicitar_movimiento_rubro", {
    p_proyecto_id: parsed.data.proyectoId,
    p_rubro_destino_id: parsed.data.rubroDestinoId,
    p_tipo: parsed.data.tipo,
    p_monto: parsed.data.monto,
    p_justificacion: parsed.data.justificacion,
    p_rubro_origen_id: parsed.data.rubroOrigenId ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/presupuesto`);
  return { id: data as string };
}

export async function aprobarMovimientoAction(movimientoId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("aprobar_movimiento", { p_movimiento_id: movimientoId });
  if (error) throw new Error(error.message);
  revalidatePath("/presupuesto");
}

export async function rechazarMovimientoAction(movimientoId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("rechazar_movimiento", { p_movimiento_id: movimientoId });
  if (error) throw new Error(error.message);
  revalidatePath("/presupuesto");
}

export async function ejecutarMovimientoAction(movimientoId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("ejecutar_movimiento", { p_movimiento_id: movimientoId });
  if (error) throw new Error(error.message);
  revalidatePath("/presupuesto");
}
