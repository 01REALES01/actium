"use server";

import { z } from "zod";
import { assertPuedeFinanzas } from "@/lib/auth/guards";
import { revalidarFinanzas } from "@/lib/actions/revalidar-finanzas";
import { parseResultadoAnulacion, type ResultadoAnulacion } from "@/lib/actions/anulacion";

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

  revalidarFinanzas();
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

  revalidarFinanzas();
  return { id: data };
}

/**
 * Anula la factura y revierte su rastro contable: los movimientos de sus abonos
 * pasan a 'anulado' y sus cuotas a 'anulada', de modo que la factura deja de
 * afectar el flujo de caja del proyecto y el consolidado, y libera el techo del
 * rubro. Nada se borra — todo queda en el ledger y en auditoria_logs.
 */
export async function anularCxPAction(cxpId: string): Promise<ResultadoAnulacion> {
  const parsed = z.string().uuid().safeParse(cxpId);
  if (!parsed.success) throw new Error("Identificador de factura inválido.");

  const { supabase } = await assertPuedeFinanzas();
  const { data, error } = await supabase.rpc("anular_cxp", { p_cxp_id: parsed.data });
  if (error) throw new Error(error.message);

  revalidarFinanzas();
  return parseResultadoAnulacion(data);
}
