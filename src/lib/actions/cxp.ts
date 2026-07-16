"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSuperAdmin } from "@/lib/auth/guards";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

const CrearCxPSchema = z
  .object({
    proyectoId: z.string().uuid(),
    rubroId: z.string().uuid(),
    proveedorNombre: z.string().min(1).max(200),
    proveedorNit: z.string().max(40).optional(),
    numeroFactura: z.string().min(1).max(60),
    montoTotal: z.number().positive(),
    fechaEmision: FechaSchema,
    fechaVencimiento: FechaSchema,
    notas: z.string().max(500).optional(),
  })
  .refine((v) => v.fechaVencimiento >= v.fechaEmision, {
    message: "La fecha de vencimiento no puede ser anterior a la de emisión",
    path: ["fechaVencimiento"],
  });

export async function crearCxPAction(
  input: z.infer<typeof CrearCxPSchema>,
): Promise<{ id: string }> {
  const parsed = CrearCxPSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertSuperAdmin();
  const { data, error } = await supabase
    .from("cuentas_por_pagar")
    .insert({
      proyecto_id: parsed.data.proyectoId,
      rubro_id: parsed.data.rubroId,
      proveedor_nombre: parsed.data.proveedorNombre,
      proveedor_nit: parsed.data.proveedorNit ?? null,
      numero_factura: parsed.data.numeroFactura,
      monto_total: parsed.data.montoTotal,
      fecha_emision: parsed.data.fechaEmision,
      fecha_vencimiento: parsed.data.fechaVencimiento,
      notas: parsed.data.notas ?? null,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe una factura con ese número para ese proveedor en el proyecto.");
    if (error.code === "23514") throw new Error("El rubro seleccionado no puede tener categoría Ingresos.");
    throw new Error(error.message);
  }

  revalidatePath("/finanzas/cxp");
  return { id: data.id };
}

const RegistrarPagoSchema = z.object({
  cxpId: z.string().uuid(),
  monto: z.number().positive(),
  fecha: FechaSchema.optional(),
});

export async function registrarPagoAction(
  input: z.infer<typeof RegistrarPagoSchema>,
): Promise<{ id: string }> {
  const parsed = RegistrarPagoSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertSuperAdmin();
  const { data, error } = await supabase.rpc("registrar_pago_cxp", {
    p_cxp_id: parsed.data.cxpId,
    p_monto: parsed.data.monto,
    p_fecha: parsed.data.fecha,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("La RPC no devolvió el id del movimiento creado.");

  revalidatePath("/finanzas/cxp");
  revalidatePath("/finanzas/flujo-caja/[proyectoId]", "page");
  return { id: data };
}

export async function anularCxPAction(cxpId: string): Promise<void> {
  const { supabase } = await assertSuperAdmin();
  const { error } = await supabase
    .from("cuentas_por_pagar")
    .update({ estado: "anulada" })
    .eq("id", cxpId);
  if (error) throw new Error(error.message);
  revalidatePath("/finanzas/cxp");
}
