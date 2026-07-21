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

/**
 * Construye el registro de proyectados por `rubroId|quincena` a partir de las
 * cuotas pendientes de CxC y CxP. Convención de signo: los cobros proyectados
 * (CxC, ingresos) suman (positivo) y los pagos proyectados (CxP, egresos) restan
 * (negativo). Así el flujo proyectado refleja el efecto real sobre la caja.
 */
async function getProyectadoMap(
  supabase: Client,
  proyectoId: string,
): Promise<Record<string, number>> {
  const proyectado: Record<string, number> = {};

  const [cxcCuotas, cxpCuotas] = await Promise.all([
    supabase
      .from("cuentas_por_cobrar_cuotas")
      .select("monto, monto_cobrado, fecha_vencimiento, cxc_id")
      .eq("proyecto_id", proyectoId)
      .in("estado", ["pendiente", "parcial"]),
    supabase
      .from("cuentas_por_pagar_cuotas")
      .select("monto, monto_pagado, fecha_vencimiento, cxp_id")
      .eq("proyecto_id", proyectoId)
      .in("estado", ["pendiente", "parcial"]),
  ]);

  // CxC (ingresos): suma. Rubro viene del header de la CxC.
  if (!cxcCuotas.error && cxcCuotas.data.length > 0) {
    const ids = Array.from(new Set(cxcCuotas.data.map((c) => c.cxc_id)));
    const { data: headers } = await supabase
      .from("cuentas_por_cobrar")
      .select("id, rubro_id")
      .in("id", ids);
    const rubroPorId = new Map<string, string>((headers ?? []).map((h) => [h.id, h.rubro_id]));

    for (const cuota of cxcCuotas.data) {
      const rubroId = rubroPorId.get(cuota.cxc_id);
      if (!rubroId) continue;
      const saldo = cuota.monto - cuota.monto_cobrado;
      if (saldo <= 0) continue;
      const quincena = quincenaDe(parseISODate(cuota.fecha_vencimiento));
      const key = `${rubroId}|${quincena}`;
      proyectado[key] = (proyectado[key] ?? 0) + saldo;
    }
  }

  // CxP (egresos): resta. Rubro viene del header de la CxP.
  if (!cxpCuotas.error && cxpCuotas.data.length > 0) {
    const ids = Array.from(new Set(cxpCuotas.data.map((c) => c.cxp_id)));
    const { data: headers } = await supabase
      .from("cuentas_por_pagar")
      .select("id, rubro_id")
      .in("id", ids);
    const rubroPorId = new Map<string, string>((headers ?? []).map((h) => [h.id, h.rubro_id]));

    for (const cuota of cxpCuotas.data) {
      const rubroId = rubroPorId.get(cuota.cxp_id);
      if (!rubroId) continue;
      const saldo = cuota.monto - cuota.monto_pagado;
      if (saldo <= 0) continue;
      const quincena = quincenaDe(parseISODate(cuota.fecha_vencimiento));
      const key = `${rubroId}|${quincena}`;
      proyectado[key] = (proyectado[key] ?? 0) - saldo;
    }
  }

  return proyectado;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Flujo agregado (todos los proyectos) ────────────────────────────────────

export type FlujoCajaAgregadoCategoria = {
  categoria: CategoriaFlujo;
  totalPorQuincena: number[];
  proyectadoPorQuincena: number[];
};

export type FlujoCajaAgregado = {
  quincenas: string[];
  categorias: FlujoCajaAgregadoCategoria[];
  totalEgresosPorQuincena: number[];
  ingresosPorQuincena: number[];
  saldoPorQuincena: number[];
  flujoAcumulado: number[];
  totalProyectadoPorQuincena: number[];
  acumuladoConProyectado: number[];
};

export async function getFlujoAgregado(
  supabase: Client,
  rango: { desde: Date; hasta: Date } = rangoDefault(),
): Promise<FlujoCajaAgregado> {
  const quincenas = quincenasEnRango(rango.desde, rango.hasta);

  const [vistaResult, rubrosResult, cuotasResult, cxpCuotasResult] = await Promise.all([
    supabase
      .from("vw_flujo_caja_quincenal")
      .select("categoria, quincena, total_periodo")
      .gte("quincena", quincenas[0])
      .lte("quincena", quincenas[quincenas.length - 1]),
    supabase.from("rubros").select("id, categoria").eq("activo", true),
    supabase
      .from("cuentas_por_cobrar_cuotas")
      .select("monto, monto_cobrado, fecha_vencimiento, cxc_id")
      .in("estado", ["pendiente", "parcial"]),
    supabase
      .from("cuentas_por_pagar_cuotas")
      .select("monto, monto_pagado, fecha_vencimiento, cxp_id")
      .in("estado", ["pendiente", "parcial"]),
  ]);

  const realMap: Record<string, number> = {};
  for (const row of vistaResult.data ?? []) {
    if (!row.categoria || !row.quincena) continue;
    const key = `${row.categoria}|${row.quincena}`;
    realMap[key] = (realMap[key] ?? 0) + (row.total_periodo ?? 0);
  }

  const rubroCatMap: Record<string, CategoriaFlujo> = {};
  for (const r of rubrosResult.data ?? []) {
    if (r.id && r.categoria) rubroCatMap[r.id] = r.categoria as CategoriaFlujo;
  }

  const proyMap: Record<string, number> = {};
  const cxcIds = Array.from(new Set((cuotasResult.data ?? []).map((c) => c.cxc_id)));
  if (cxcIds.length > 0) {
    const { data: cxcHeaders } = await supabase
      .from("cuentas_por_cobrar")
      .select("id, rubro_id")
      .in("id", cxcIds);
    const cxcRubroMap: Record<string, string> = {};
    for (const h of cxcHeaders ?? []) cxcRubroMap[h.id] = h.rubro_id;
    for (const cuota of cuotasResult.data ?? []) {
      const rubroId = cxcRubroMap[cuota.cxc_id];
      if (!rubroId) continue;
      const cat = rubroCatMap[rubroId];
      if (!cat) continue;
      const saldo = cuota.monto - cuota.monto_cobrado;
      if (saldo <= 0) continue;
      const q = quincenaDe(parseISODate(cuota.fecha_vencimiento));
      const key = `${cat}|${q}`;
      proyMap[key] = (proyMap[key] ?? 0) + saldo;
    }
  }
  const cxpIds = Array.from(new Set((cxpCuotasResult.data ?? []).map((c) => c.cxp_id)));
  if (cxpIds.length > 0) {
    const { data: cxpHeaders } = await supabase
      .from("cuentas_por_pagar")
      .select("id, rubro_id")
      .in("id", cxpIds);
    const cxpRubroMap: Record<string, string> = {};
    for (const h of cxpHeaders ?? []) cxpRubroMap[h.id] = h.rubro_id;
    for (const cuota of cxpCuotasResult.data ?? []) {
      const rubroId = cxpRubroMap[cuota.cxp_id];
      if (!rubroId) continue;
      const cat = rubroCatMap[rubroId];
      if (!cat) continue;
      const saldo = cuota.monto - cuota.monto_pagado;
      if (saldo <= 0) continue;
      const q = quincenaDe(parseISODate(cuota.fecha_vencimiento));
      const key = `${cat}|${q}`;
      // Egresos proyectados restan del flujo
      proyMap[key] = (proyMap[key] ?? 0) - saldo;
    }
  }

  const categorias: FlujoCajaAgregadoCategoria[] = ORDEN_CATEGORIAS.map((cat) => ({
    categoria: cat,
    totalPorQuincena: quincenas.map((q) => realMap[`${cat}|${q}`] ?? 0),
    proyectadoPorQuincena: quincenas.map((q) => proyMap[`${cat}|${q}`] ?? 0),
  }));

  const ingresosCat = categorias.find((c) => c.categoria === "ingresos")!;
  const ingresosPorQuincena = ingresosCat.totalPorQuincena;
  const totalEgresosPorQuincena = quincenas.map((_, i) =>
    categorias.filter((c) => c.categoria !== "ingresos").reduce((s, c) => s + c.totalPorQuincena[i], 0),
  );
  const saldoPorQuincena = quincenas.map((_, i) => ingresosPorQuincena[i] + totalEgresosPorQuincena[i]);

  const flujoAcumulado: number[] = [];
  saldoPorQuincena.reduce((acc, s, i) => { flujoAcumulado[i] = acc + s; return acc + s; }, 0);

  const totalProyectadoPorQuincena = quincenas.map((_, i) =>
    categorias.reduce((s, c) => s + c.proyectadoPorQuincena[i], 0),
  );
  const saldoConProyectado = quincenas.map((_, i) => saldoPorQuincena[i] + totalProyectadoPorQuincena[i]);
  const acumuladoConProyectado: number[] = [];
  saldoConProyectado.reduce((acc, s, i) => { acumuladoConProyectado[i] = acc + s; return acc + s; }, 0);

  return {
    quincenas,
    categorias,
    totalEgresosPorQuincena,
    ingresosPorQuincena,
    saldoPorQuincena,
    flujoAcumulado,
    totalProyectadoPorQuincena,
    acumuladoConProyectado,
  };
}

/** Series listas para graficar (línea) a partir del flujo agregado. */
export function derivarSeriesAgregado(data: FlujoCajaAgregado) {
  return {
    quincenas: data.quincenas,
    acumulado: data.acumuladoConProyectado,
    ingresos: data.ingresosPorQuincena,
    egresos: data.totalEgresosPorQuincena.map((v) => Math.abs(v)),
  };
}

// ─── Flujo por proyecto ───────────────────────────────────────────────────────

/** Series listas para graficar (línea) a partir del flujo de un proyecto. */
export function derivarSeriesProyecto(data: FlujoCajaData) {
  const proyectadoPorQuincena = data.quincenas.map((q) => {
    let suma = 0;
    for (const cat of data.categorias) {
      for (const r of cat.rubros) suma += data.proyectado[`${r.id}|${q}`] ?? 0;
    }
    return suma;
  });

  const saldoCombinado = data.quincenas.map(
    (_, i) => data.saldoPorQuincena[i] + proyectadoPorQuincena[i],
  );

  const acumulado: number[] = [];
  saldoCombinado.reduce((acc, s, i) => {
    acumulado[i] = acc + s;
    return acc + s;
  }, 0);

  return {
    quincenas: data.quincenas,
    acumulado,
    ingresos: data.ingresosPorQuincena,
    egresos: data.totalEgresosPorQuincena.map((v) => Math.abs(v)),
  };
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
