import type { TypedSupabaseClient, CategoriaFlujo, MovimientoTipo } from "@/types/database.types";
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

/**
 * Tipos de movimiento que la vista vw_flujo_caja_quincenal suma. Los 'ajuste'
 * (cambios de techo y transferencias entre rubros) quedan fuera: mueven el
 * presupuesto, no la caja. Se exporta para que el detalle por celda filtre con
 * el mismo criterio que el total que muestra.
 */
export const TIPOS_EN_FLUJO: MovimientoTipo[] = ["gasto", "traslado_entre_rubros"];

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

/**
 * Primer y último día calendario cubiertos por un rango de quincenas. Las
 * quincenas siempre abarcan meses completos, así que sirve para acotar por
 * fecha_efectiva las consultas que alimentan la tabla.
 */
export function limitesDelRango(rango: { desde: Date; hasta: Date }): {
  desde: string;
  hasta: string;
} {
  const fin = new Date(rango.hasta.getFullYear(), rango.hasta.getMonth() + 1, 0);
  return {
    desde: isoDate(rango.desde.getFullYear(), rango.desde.getMonth(), 1),
    hasta: isoDate(fin.getFullYear(), fin.getMonth(), fin.getDate()),
  };
}

/** Rango default: desde el 15 del mes anterior hasta el cierre del mes actual + 4 (ventana semestral). */
export function rangoDefault(hoy: Date = new Date()): { desde: Date; hasta: Date } {
  return {
    desde: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
    hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 4, 28),
  };
}

/** Quincenas seleccionables en los selectores de rango: 12 meses atrás a 24 meses adelante de hoy. */
export function opcionesQuincena(hoy: Date = new Date()): string[] {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 12, 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 24, 1);
  return quincenasEnRango(desde, hasta);
}

/**
 * Resuelve el rango desde/hasta a partir de los query params `desde`/`hasta` (quincenas
 * ISO, p.ej. "2026-07-15"). Si faltan o no son válidos, usa el default semestral. También
 * devuelve las quincenas seleccionadas y las opciones disponibles, listas para el selector.
 */
export function resolverRango(
  params: { desde?: string; hasta?: string },
  hoy: Date = new Date(),
): {
  rango: { desde: Date; hasta: Date };
  desdeQuincena: string;
  hastaQuincena: string;
  opciones: string[];
} {
  const opciones = opcionesQuincena(hoy);
  const defecto = rangoDefault(hoy);
  const quincenasDefault = quincenasEnRango(defecto.desde, defecto.hasta);
  const desdeDefault = quincenasDefault[0];
  const hastaDefault = quincenasDefault[quincenasDefault.length - 1];

  const desdeQuincena = params.desde && opciones.includes(params.desde) ? params.desde : desdeDefault;
  const hastaQuincena = params.hasta && opciones.includes(params.hasta) ? params.hasta : hastaDefault;

  let desde = parseISODate(desdeQuincena);
  let hasta = parseISODate(hastaQuincena);
  if (desde > hasta) [desde, hasta] = [hasta, desde];

  return { rango: { desde, hasta }, desdeQuincena, hastaQuincena, opciones };
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

/** Aporte de un rubro (de un proyecto puntual) a una celda del flujo agregado. */
export type RubroDesglose = {
  nombre: string;
  codigo: string | null;
  proyectoNombre: string;
  real: number;
  proyectado: number;
};

export type FlujoCajaAgregadoCategoria = {
  categoria: CategoriaFlujo;
  totalPorQuincena: number[];
  proyectadoPorQuincena: number[];
  /** Desglose por rubro, alineado por índice con `quincenas`. */
  rubrosPorQuincena: RubroDesglose[][];
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

  const [vistaResult, rubrosResult, proyectosResult, cuotasResult, cxpCuotasResult] = await Promise.all([
    supabase
      .from("vw_flujo_caja_quincenal")
      .select("categoria, quincena, total_periodo, rubro_id, rubro_nombre, rubro_codigo, proyecto_id")
      .gte("quincena", quincenas[0])
      .lte("quincena", quincenas[quincenas.length - 1]),
    supabase.from("rubros").select("id, categoria, nombre, codigo, proyecto_id").eq("activo", true),
    supabase.from("proyectos").select("id, nombre"),
    supabase
      .from("cuentas_por_cobrar_cuotas")
      .select("monto, monto_cobrado, fecha_vencimiento, cxc_id")
      .in("estado", ["pendiente", "parcial"]),
    supabase
      .from("cuentas_por_pagar_cuotas")
      .select("monto, monto_pagado, fecha_vencimiento, cxp_id")
      .in("estado", ["pendiente", "parcial"]),
  ]);

  const proyectoNombreMap: Record<string, string> = {};
  for (const p of proyectosResult.data ?? []) {
    if (p.id) proyectoNombreMap[p.id] = p.nombre;
  }

  const realMap: Record<string, number> = {};
  // Desglose por rubro (rubro_id es único por proyecto): clave `categoria|quincena|rubro_id`.
  const desgloseMap: Record<string, RubroDesglose> = {};
  for (const row of vistaResult.data ?? []) {
    if (!row.categoria || !row.quincena) continue;
    const key = `${row.categoria}|${row.quincena}`;
    realMap[key] = (realMap[key] ?? 0) + (row.total_periodo ?? 0);

    if (row.rubro_id && row.rubro_nombre) {
      const dKey = `${row.categoria}|${row.quincena}|${row.rubro_id}`;
      const entry = desgloseMap[dKey] ?? {
        nombre: row.rubro_nombre,
        codigo: row.rubro_codigo ?? null,
        proyectoNombre: (row.proyecto_id && proyectoNombreMap[row.proyecto_id]) || "Proyecto sin nombre",
        real: 0,
        proyectado: 0,
      };
      entry.real += row.total_periodo ?? 0;
      desgloseMap[dKey] = entry;
    }
  }

  const rubroCatMap: Record<string, CategoriaFlujo> = {};
  const rubroInfoMap: Record<
    string,
    { nombre: string; codigo: string | null; proyectoNombre: string }
  > = {};
  for (const r of rubrosResult.data ?? []) {
    if (r.id && r.categoria) rubroCatMap[r.id] = r.categoria as CategoriaFlujo;
    if (r.id) {
      rubroInfoMap[r.id] = {
        nombre: r.nombre,
        codigo: r.codigo ?? null,
        proyectoNombre: (r.proyecto_id && proyectoNombreMap[r.proyecto_id]) || "Proyecto sin nombre",
      };
    }
  }

  /** Suma un monto proyectado al desglose por rubro, agrupando por rubro_id. */
  function sumarProyectadoDesglose(
    rubroId: string,
    cat: CategoriaFlujo,
    quincena: string,
    monto: number,
  ) {
    const info = rubroInfoMap[rubroId];
    if (!info) return;
    const dKey = `${cat}|${quincena}|${rubroId}`;
    const entry = desgloseMap[dKey] ?? {
      nombre: info.nombre,
      codigo: info.codigo,
      proyectoNombre: info.proyectoNombre,
      real: 0,
      proyectado: 0,
    };
    entry.proyectado += monto;
    desgloseMap[dKey] = entry;
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
      sumarProyectadoDesglose(rubroId, cat, q, saldo);
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
      sumarProyectadoDesglose(rubroId, cat, q, -saldo);
    }
  }

  // Agrupa el desglose por `categoria|quincena` para poblar `rubrosPorQuincena`.
  const desglosePorCelda: Record<string, RubroDesglose[]> = {};
  for (const [dKey, entry] of Object.entries(desgloseMap)) {
    if (entry.real === 0 && entry.proyectado === 0) continue;
    const [cat, quincena] = dKey.split("|");
    const cKey = `${cat}|${quincena}`;
    (desglosePorCelda[cKey] ??= []).push(entry);
  }
  for (const rubros of Object.values(desglosePorCelda)) {
    rubros.sort((a, b) => Math.abs(b.real + b.proyectado) - Math.abs(a.real + a.proyectado));
  }

  const categorias: FlujoCajaAgregadoCategoria[] = ORDEN_CATEGORIAS.map((cat) => ({
    categoria: cat,
    totalPorQuincena: quincenas.map((q) => realMap[`${cat}|${q}`] ?? 0),
    proyectadoPorQuincena: quincenas.map((q) => proyMap[`${cat}|${q}`] ?? 0),
    rubrosPorQuincena: quincenas.map((q) => desglosePorCelda[`${cat}|${q}`] ?? []),
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
    saldoBanco: data.flujoAcumulado,
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
    saldoBanco: data.flujoAcumulado,
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
