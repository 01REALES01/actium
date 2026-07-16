import type { TypedSupabaseClient, CategoriaFlujo } from "@/types/database.types";
import { getRubrosPorProyecto } from "@/lib/data/presupuesto";

type Client = TypedSupabaseClient;

export type FlujoCajaRubro = {
  id: string;
  codigo: string | null;
  nombre: string;
  valoresPorQuincena: number[];
};

export type FlujoCajaCategoria = {
  categoria: CategoriaFlujo;
  totalPorQuincena: number[];
};

export type FlujoCajaCategoriaConRubros = FlujoCajaCategoria & {
  rubros: FlujoCajaRubro[];
};

export type FlujoCajaData = {
  quincenas: string[];
  categorias: FlujoCajaCategoriaConRubros[];
  totalEgresosPorQuincena: number[];
  ingresosPorQuincena: number[];
  saldoPorQuincena: number[];
  flujoAcumulado: number[];
  /** Montos proyectados (CxC/CxP pendientes) por clave `rubroId|quincena`. */
  proyectado: Record<string, number>;
};

const ORDEN_CATEGORIAS: CategoriaFlujo[] = [
  "costos_operativos",
  "gastos_administrativos",
  "gastos_financieros",
  "ingresos",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

/** Replica en JS el bucket de dia 15 / dia 30 (o ultimo dia del mes) de la vista SQL. */
export function quincenaDe(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = fecha.getMonth();
  const day = fecha.getDate();

  if (day <= 15) return isoDate(year, month, 15);

  const dia30 = new Date(year, month, 30);
  if (dia30.getMonth() === month) return isoDate(year, month, 30);

  const ultimoDia = new Date(year, month + 1, 0);
  return isoDate(year, month, ultimoDia.getDate());
}

/** Lista ordenada de quincenas (buckets) entre dos fechas, ambas inclusive. */
export function quincenasEnRango(desde: Date, hasta: Date): string[] {
  const quincenas: string[] = [];
  const cursor = new Date(desde.getFullYear(), desde.getMonth(), 1);
  const fin = new Date(hasta.getFullYear(), hasta.getMonth(), 1);

  while (cursor <= fin) {
    const primera = quincenaDe(new Date(cursor.getFullYear(), cursor.getMonth(), 15));
    const segunda = quincenaDe(new Date(cursor.getFullYear(), cursor.getMonth(), 28));
    quincenas.push(primera, segunda);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return quincenas;
}

/** Rango default: mes actual +- 1 (mes anterior, actual y siguiente). */
export function rangoDefault(hoy: Date = new Date()): { desde: Date; hasta: Date } {
  return {
    desde: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
    hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 28),
  };
}

/** Construye el registro de proyectados a partir de CxC cuotas y CxP pendientes. */
async function getProyectadoMap(
  supabase: Client,
  proyectoId: string,
): Promise<Record<string, number>> {
  const proyectado: Record<string, number> = {};

  // CxC cuotas pendientes: rubro viene del header de la CxC
  const [cuotasResult, cxpResult] = await Promise.all([
    supabase
      .from("cuentas_por_cobrar_cuotas")
      .select("monto, monto_cobrado, fecha_vencimiento, estado, cxc_id")
      .eq("proyecto_id", proyectoId)
      .in("estado", ["pendiente", "parcial"]),
    supabase
      .from("cuentas_por_pagar")
      .select("rubro_id, monto_total, monto_pagado, fecha_vencimiento")
      .eq("proyecto_id", proyectoId)
      .in("estado", ["pendiente", "parcial"]),
  ]);

  if (!cuotasResult.error && cuotasResult.data.length > 0) {
    // Necesitamos el rubro_id del header CxC para cada cuota
    const cxcIdsSet = new Set(cuotasResult.data.map((c) => c.cxc_id));
    const cxcIds = Array.from(cxcIdsSet);
    const { data: cxcHeaders } = await supabase
      .from("cuentas_por_cobrar")
      .select("id, rubro_id")
      .in("id", cxcIds);

    const ruborPorCxc = new Map<string, string>(
      (cxcHeaders ?? []).map((h) => [h.id, h.rubro_id]),
    );

    for (const cuota of cuotasResult.data) {
      const rubroId = ruborPorCxc.get(cuota.cxc_id);
      if (!rubroId) continue;
      const saldo = cuota.monto - cuota.monto_cobrado;
      if (saldo <= 0) continue;
      const quincena = quincenaDe(parseISODate(cuota.fecha_vencimiento));
      const key = `${rubroId}|${quincena}`;
      proyectado[key] = (proyectado[key] ?? 0) + saldo;
    }
  }

  if (!cxpResult.error) {
    for (const cxp of cxpResult.data ?? []) {
      const saldo = cxp.monto_total - cxp.monto_pagado;
      if (saldo <= 0) continue;
      const quincena = quincenaDe(parseISODate(cxp.fecha_vencimiento));
      const key = `${cxp.rubro_id}|${quincena}`;
      proyectado[key] = (proyectado[key] ?? 0) + saldo;
    }
  }

  return proyectado;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function getFlujoQuincenal(
  supabase: Client,
  proyectoId: string,
  rango: { desde: Date; hasta: Date } = rangoDefault(),
): Promise<FlujoCajaData> {
  const quincenas = quincenasEnRango(rango.desde, rango.hasta);
  const primeraQuincena = quincenas[0];
  const ultimaQuincena = quincenas[quincenas.length - 1];

  const [rubros, vistaResult, proyectado] = await Promise.all([
    getRubrosPorProyecto(supabase, proyectoId),
    supabase
      .from("vw_flujo_caja_quincenal")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .gte("quincena", primeraQuincena)
      .lte("quincena", ultimaQuincena),
    getProyectadoMap(supabase, proyectoId),
  ]);

  if (vistaResult.error) throw vistaResult.error;

  const totales = new Map<string, number>(); // key: `${rubroId}|${quincena}`
  for (const fila of vistaResult.data ?? []) {
    if (!fila.rubro_id || !fila.quincena) continue;
    totales.set(`${fila.rubro_id}|${fila.quincena}`, fila.total_periodo ?? 0);
  }

  const categorias: FlujoCajaCategoriaConRubros[] = ORDEN_CATEGORIAS.map((categoria) => {
    const rubrosDeCategoria = rubros
      .filter((r) => r.categoria === categoria)
      .map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        valoresPorQuincena: quincenas.map((q) => totales.get(`${r.id}|${q}`) ?? 0),
      }));

    const totalPorQuincena = quincenas.map((_, i) =>
      rubrosDeCategoria.reduce((acc, r) => acc + r.valoresPorQuincena[i], 0),
    );

    return { categoria, rubros: rubrosDeCategoria, totalPorQuincena };
  });

  const ingresosPorQuincena =
    categorias.find((c) => c.categoria === "ingresos")?.totalPorQuincena ?? quincenas.map(() => 0);

  const totalEgresosPorQuincena = quincenas.map((_, i) =>
    categorias
      .filter((c) => c.categoria !== "ingresos")
      .reduce((acc, c) => acc + c.totalPorQuincena[i], 0),
  );

  const saldoPorQuincena = quincenas.map((_, i) => ingresosPorQuincena[i] + totalEgresosPorQuincena[i]);

  const flujoAcumulado: number[] = [];
  saldoPorQuincena.reduce((acc, saldo, i) => {
    const nuevoAcumulado = acc + saldo;
    flujoAcumulado[i] = nuevoAcumulado;
    return nuevoAcumulado;
  }, 0);

  return {
    quincenas,
    categorias,
    totalEgresosPorQuincena,
    ingresosPorQuincena,
    saldoPorQuincena,
    flujoAcumulado,
    proyectado,
  };
}
