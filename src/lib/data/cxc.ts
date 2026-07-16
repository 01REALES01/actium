import type { TypedSupabaseClient, Tables } from "@/types/database.types";
import { sumarMovimientosPorCategoriaDelMes, CATEGORIAS_INGRESO } from "@/lib/data/presupuesto";

type Client = TypedSupabaseClient;

export type CuotaConVencida = Tables<"cuentas_por_cobrar_cuotas"> & { vencida: boolean };

export type CxCConRelaciones = Tables<"cuentas_por_cobrar"> & {
  proyectos: Pick<Tables<"proyectos">, "nombre"> | null;
  rubros: Pick<Tables<"rubros">, "nombre"> | null;
  cuotas: CuotaConVencida[];
  vencida: boolean;
};

function marcarVencidaCuota(hoy: string) {
  return (cuota: Tables<"cuentas_por_cobrar_cuotas">): CuotaConVencida => ({
    ...cuota,
    vencida: (cuota.estado === "pendiente" || cuota.estado === "parcial") && cuota.fecha_vencimiento < hoy,
  });
}

function marcarVencidas(
  rows: (Tables<"cuentas_por_cobrar"> & { cuotas: Tables<"cuentas_por_cobrar_cuotas">[] })[],
): CxCConRelaciones[] {
  const hoy = new Date().toISOString().slice(0, 10);
  return rows.map((row) => {
    const cuotas = [...row.cuotas].sort((a, b) => a.numero_cuota - b.numero_cuota).map(marcarVencidaCuota(hoy));
    return {
      ...row,
      cuotas,
      vencida: cuotas.some((c) => c.vencida),
    } as CxCConRelaciones;
  });
}

export async function listCxC(
  supabase: Client,
  opts: { proyectoId?: string } = {},
): Promise<CxCConRelaciones[]> {
  let query = supabase
    .from("cuentas_por_cobrar")
    .select("*, proyectos:proyecto_id (nombre), rubros:rubro_id (nombre), cuotas:cuentas_por_cobrar_cuotas (*)");

  if (opts.proyectoId) query = query.eq("proyecto_id", opts.proyectoId);

  const { data, error } = await query.order("fecha_vencimiento", { ascending: true });

  if (error) throw error;
  return marcarVencidas(data ?? []);
}

export async function getCxCResumen(
  supabase: Client,
  proyectoId?: string,
): Promise<{ pendiente: number; vencido: number; cobradoMes: number }> {
  // Se calcula por cuota (no por factura completa) para que una cuota vencida
  // no quede oculta detras de otras cuotas de la misma factura aun no vencidas.
  let query = supabase
    .from("cuentas_por_cobrar_cuotas")
    .select("monto, monto_cobrado, fecha_vencimiento, estado");

  if (proyectoId) query = query.eq("proyecto_id", proyectoId);

  const { data, error } = await query;
  if (error) throw error;

  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = hoy.slice(0, 7) + "-01";

  let pendiente = 0;
  let vencido = 0;
  for (const row of data ?? []) {
    const saldo = row.monto - row.monto_cobrado;
    if (row.estado === "pendiente" || row.estado === "parcial") {
      pendiente += saldo;
      if (row.fecha_vencimiento < hoy) vencido += saldo;
    }
  }

  const cobradoMes = await sumarMovimientosPorCategoriaDelMes(supabase, inicioMes, {
    categorias: CATEGORIAS_INGRESO,
    proyectoId,
  });

  return { pendiente, vencido, cobradoMes };
}
