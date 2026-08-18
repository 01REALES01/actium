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

const CrearCxCSchema = z.object({
  proyectoId: z.string().uuid(),
  rubroId: z.string().uuid(),
  clienteNombre: z.string().min(1).max(200),
  clienteNit: z.string().max(40).optional(),
  numeroFactura: z.string().min(1).max(60),
  fechaEmision: FechaSchema,
  notas: z.string().max(500).optional(),
  cuotas: z.array(CuotaSchema).min(1).max(60),
});

export async function crearCxCAction(
  input: z.infer<typeof CrearCxCSchema>,
): Promise<{ id: string }> {
  const parsed = CrearCxCSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeFinanzas();
  const { data, error } = await supabase.rpc("crear_cxc_con_cuotas", {
    p_proyecto_id: parsed.data.proyectoId,
    p_rubro_id: parsed.data.rubroId,
    p_cliente_nombre: parsed.data.clienteNombre,
    p_cliente_nit: parsed.data.clienteNit ?? null,
    p_numero_factura: parsed.data.numeroFactura,
    p_fecha_emision: parsed.data.fechaEmision,
    p_notas: parsed.data.notas ?? null,
    p_cuotas: parsed.data.cuotas,
  });

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe una factura con ese número en el proyecto.");
    if (error.code === "23514") throw new Error("El rubro seleccionado debe tener categoría Ingresos.");
    throw new Error(error.message);
  }
  if (!data) throw new Error("La RPC no devolvió el id de la cuenta por cobrar creada.");

  revalidarFinanzas();
  return { id: data };
}

const RegistrarCobroCuotaSchema = z.object({
  cuotaId: z.string().uuid(),
  monto: z.number().positive(),
  fecha: FechaSchema.optional(),
});

export async function registrarCobroCuotaAction(
  input: z.infer<typeof RegistrarCobroCuotaSchema>,
): Promise<{ id: string }> {
  const parsed = RegistrarCobroCuotaSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeFinanzas();
  const { data, error } = await supabase.rpc("registrar_cobro_cuota_cxc", {
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
export async function anularCxCAction(cxcId: string): Promise<ResultadoAnulacion> {
  const parsed = z.string().uuid().safeParse(cxcId);
  if (!parsed.success) throw new Error("Identificador de factura inválido.");

  const { supabase } = await assertPuedeFinanzas();
  const { data, error } = await supabase.rpc("anular_cxc", { p_cxc_id: parsed.data });
  if (error) throw new Error(error.message);

  revalidarFinanzas();
  return parseResultadoAnulacion(data);
}
