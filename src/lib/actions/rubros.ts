"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSuperAdmin } from "@/lib/auth/guards";

const CategoriaFlujoEnum = z.enum([
  "costos_operativos",
  "gastos_administrativos",
  "gastos_financieros",
  "ingresos",
]);

const CrearRubroSchema = z.object({
  proyectoId: z.string().uuid(),
  nombre: z.string().min(1).max(160),
  descripcion: z.string().max(500).optional(),
  categoria: CategoriaFlujoEnum,
  codigo: z.string().max(20).optional(),
  montoMaximo: z.number().positive(),
  orden: z.number().int().optional(),
});

export async function crearRubroAction(
  input: z.infer<typeof CrearRubroSchema>,
): Promise<{ id: string }> {
  const parsed = CrearRubroSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertSuperAdmin();
  const { data, error } = await supabase
    .from("rubros")
    .insert({
      proyecto_id: parsed.data.proyectoId,
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion ?? null,
      categoria: parsed.data.categoria,
      codigo: parsed.data.codigo ?? null,
      monto_maximo: parsed.data.montoMaximo,
      orden: parsed.data.orden ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un rubro con ese nombre en el proyecto.");
    throw new Error(error.message);
  }

  revalidatePath("/finanzas/presupuesto");
  return { id: data.id };
}

const AjustarTechoSchema = z.object({
  rubroId: z.string().uuid(),
  nuevoMonto: z.number().positive(),
  justificacion: z.string().min(1).max(500),
});

export async function ajustarTechoRubroAction(
  input: z.infer<typeof AjustarTechoSchema>,
): Promise<{ id: string }> {
  const parsed = AjustarTechoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertSuperAdmin();
  const { data, error } = await supabase.rpc("ajustar_techo_rubro", {
    p_rubro_id: parsed.data.rubroId,
    p_nuevo_monto: parsed.data.nuevoMonto,
    p_justificacion: parsed.data.justificacion,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("La RPC no devolvió el id del movimiento creado.");

  revalidatePath("/finanzas/presupuesto");
  return { id: data };
}

const TransferirPresupuestoSchema = z.object({
  proyectoId: z.string().uuid(),
  rubroOrigenId: z.string().uuid(),
  rubroDestinoId: z.string().uuid(),
  monto: z.number().positive(),
});

export async function transferirPresupuestoAction(
  input: z.infer<typeof TransferirPresupuestoSchema>,
): Promise<void> {
  const parsed = TransferirPresupuestoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertSuperAdmin();
  const { error } = await supabase.rpc("transferir_presupuesto_rubros", {
    p_proyecto_id: parsed.data.proyectoId,
    p_rubro_origen_id: parsed.data.rubroOrigenId,
    p_rubro_destino_id: parsed.data.rubroDestinoId,
    p_monto: parsed.data.monto,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/finanzas/presupuesto");
}

const FijarPresupuestoSchema = z.object({
  proyectoId: z.string().uuid(),
  monto: z.number().positive().optional(),
});

export async function fijarPresupuestoAction(
  input: z.infer<typeof FijarPresupuestoSchema>,
): Promise<number> {
  const parsed = FijarPresupuestoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertSuperAdmin();
  const { data, error } = await supabase.rpc("fijar_presupuesto_proyecto", {
    p_proyecto_id: parsed.data.proyectoId,
    p_monto: parsed.data.monto ?? null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/finanzas/presupuesto");
  return data as number;
}

export async function desactivarRubroAction(rubroId: string): Promise<void> {
  const { supabase } = await assertSuperAdmin();
  const { error } = await supabase.from("rubros").update({ activo: false }).eq("id", rubroId);
  if (error) throw new Error(error.message);
  revalidatePath("/finanzas/presupuesto");
}
