"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPuedeFinanzas } from "@/lib/auth/guards";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

const CuotaSchema = z.object({
  monto: z.number().positive(),
  fecha: FechaSchema,
});

const CrearCxPSchema = z.object({
  proyectoId: z.string().uuid(),
  rubroId: z.string().uuid(),
  proveedorNombre: z.string().min(1).max(200),
  proveedorNit: z.string().max(40).optional(),
  numeroFactura: z.string().min(1).max(60),
  fechaEmision: FechaSchema,
  notas: z.string().max(500).optional(),
  cuotas: z.array(CuotaSchema).min(1).max(60),
});

export async function crearCxPAction(
  input: z.infer<typeof CrearCxPSchema>,
): Promise<{ id: string }> {
  const parsed = CrearCxPSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeFinanzas();
  const { data, error } = await supabase.rpc("crear_cxp_con_cuotas", {
    p_proyecto_id: parsed.data.proyectoId,
    p_rubro_id: parsed.data.rubroId,
    p_proveedor_nombre: parsed.data.proveedorNombre,
    p_proveedor_nit: parsed.data.proveedorNit ?? null,
    p_numero_factura: parsed.data.numeroFactura,
    p_fecha_emision: parsed.data.fechaEmision,
    p_notas: parsed.data.notas ?? null,
    p_cuotas: parsed.data.cuotas,
  });

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe una factura con ese número para ese proveedor en el proyecto.");
    if (error.code === "23514") throw new Error("El rubro seleccionado no puede tener categoría Ingresos.");
    throw new Error(error.message);
  }
  if (!data) throw new Error("La RPC no devolvió el id de la cuenta por pagar creada.");

  revalidatePath("/finanzas/cxp");
  return { id: data };
}

const RegistrarPagoCuotaSchema = z.object({
  cuotaId: z.string().uuid(),
  monto: z.number().positive(),
  fecha: FechaSchema.optional(),
});

export async function registrarPagoCuotaCxpAction(
  input: z.infer<typeof RegistrarPagoCuotaSchema>,
): Promise<{ id: string }> {
  const parsed = RegistrarPagoCuotaSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeFinanzas();
  const { data, error } = await supabase.rpc("registrar_pago_cuota_cxp", {
    p_cuota_id: parsed.data.cuotaId,
    p_monto: parsed.data.monto,
    p_fecha: parsed.data.fecha,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("La RPC no devolvió el id del movimiento creado.");

  revalidatePath("/finanzas/cxp");
  revalidatePath("/finanzas/flujo-caja/[proyectoId]", "page");
  revalidatePath("/finanzas/flujo-caja");
  return { id: data };
}

export async function anularCxPAction(cxpId: string): Promise<void> {
  const { supabase } = await assertPuedeFinanzas();
  const { error } = await supabase
    .from("cuentas_por_pagar")
    .update({ estado: "anulada" })
    .eq("id", cxpId);
  if (error) throw new Error(error.message);
  revalidatePath("/finanzas/cxp");
}
