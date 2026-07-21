import type { TypedSupabaseClient, Tables } from "@/types/database.types";
import { sumarMovimientosPorCategoriaDelMes, CATEGORIAS_EGRESO } from "@/lib/data/presupuesto";

type Client = TypedSupabaseClient;

export type CuotaCxPConVencida = Tables<"cuentas_por_pagar_cuotas"> & { vencida: boolean };

export type CxPConRelaciones = Tables<"cuentas_por_pagar"> & {
  proyectos: Pick<Tables<"proyectos">, "nombre"> | null;
  rubros: Pick<Tables<"rubros">, "nombre"> | null;
  cuotas: CuotaCxPConVencida[];
  vencida: boolean;
};

function marcarVencidaCuota(hoy: string) {
  return (cuota: Tables<"cuentas_por_pagar_cuotas">): CuotaCxPConVencida => ({
    ...cuota,
    vencida: (cuota.estado === "pendiente" || cuota.estado === "parcial") && cuota.fecha_vencimiento < hoy,
  });
}

function marcarVencidas(
  rows: (Tables<"cuentas_por_pagar"> & { cuotas: Tables<"cuentas_por_pagar_cuotas">[] } & Record<string, unknown>)[],
): CxPConRelaciones[] {
  const hoy = new Date().toISOString().slice(0, 10);
  return rows.map((row) => {
    const cuotas = [...(row.cuotas ?? [])]
      .sort((a, b) => a.numero_cuota - b.numero_cuota)
      .map(marcarVencidaCuota(hoy));
    return {
      ...row,
      cuotas,
      vencida: (row.estado === "pendiente" || row.estado === "parcial") && row.fecha_vencimiento < hoy,
    } as CxPConRelaciones;
  });
}

export async function listCxP(
  supabase: Client,
  opts: { proyectoId?: string } = {},
): Promise<CxPConRelaciones[]> {
  let query = supabase
    .from("cuentas_por_pagar")
    .select("*, proyectos:proyecto_id (nombre), rubros:rubro_id (nombre), cuotas:cuentas_por_pagar_cuotas (*)");

  if (opts.proyectoId) query = query.eq("proyecto_id", opts.proyectoId);

  const { data, error } = await query.order("fecha_vencimiento", { ascending: true });

  if (error) throw error;
  return marcarVencidas(data ?? []);
}

export async function getCxPResumen(
  supabase: Client,
  proyectoId?: string,
): Promise<{ pendiente: number; vencido: number; pagadoMes: number }> {
  let query = supabase
    .from("cuentas_por_pagar")
    .select("monto_total, monto_pagado, fecha_vencimiento, estado");

  if (proyectoId) query = query.eq("proyecto_id", proyectoId);

  const { data, error } = await query;
  if (error) throw error;

  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 7) + "-01";

  let pendiente = 0;
  let vencido = 0;
  for (const row of data ?? []) {
    const saldo = row.monto_total - row.monto_pagado;
    if (row.estado === "pendiente" || row.estado === "parcial") {
      pendiente += saldo;
      if (row.fecha_vencimiento < hoy) vencido += saldo;
    }
  }

  const pagadoMes = await sumarMovimientosPorCategoriaDelMes(supabase, inicioMes, {
    categorias: CATEGORIAS_EGRESO,
    proyectoId,
  });

  return { pendiente, vencido, pagadoMes };
}
