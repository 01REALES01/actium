// Filtros y ordenamiento compartidos por Cuentas por cobrar y Cuentas por pagar.
// Se usan tanto en la capa de datos (servidor) como en el selector (cliente).

export const ESTADO_FILTRO_OPCIONES = [
  { value: "pendientes", label: "Solo pendientes" },
  { value: "todas", label: "Todas" },
  { value: "saldadas", label: "Saldadas" },
  { value: "anuladas", label: "Anuladas" },
] as const;

export type EstadoFiltro = (typeof ESTADO_FILTRO_OPCIONES)[number]["value"];

export const ESTADO_FILTRO_DEFAULT: EstadoFiltro = "pendientes";

export const ORDEN_OPCIONES = [
  { value: "recientes", label: "Registro: más reciente" },
  { value: "antiguas", label: "Registro: más antiguo" },
  { value: "vence_pronto", label: "Vencimiento: más próximo" },
  { value: "vence_tarde", label: "Vencimiento: más lejano" },
  { value: "monto_mayor", label: "Monto: mayor a menor" },
  { value: "monto_menor", label: "Monto: menor a mayor" },
] as const;

export type OrdenCuentas = (typeof ORDEN_OPCIONES)[number]["value"];

export const ORDEN_DEFAULT: OrdenCuentas = "recientes";

/** Columna y dirección de Postgres para cada opción de orden. */
export const ORDEN_QUERY: Record<OrdenCuentas, { columna: string; ascending: boolean }> = {
  recientes: { columna: "created_at", ascending: false },
  antiguas: { columna: "created_at", ascending: true },
  vence_pronto: { columna: "fecha_vencimiento", ascending: true },
  vence_tarde: { columna: "fecha_vencimiento", ascending: false },
  monto_mayor: { columna: "monto_total", ascending: false },
  monto_menor: { columna: "monto_total", ascending: true },
};

/** Estados de factura que agrupa cada opción del filtro. `todas` no filtra. */
export const ESTADO_FILTRO_QUERY: Record<EstadoFiltro, string[] | null> = {
  pendientes: ["pendiente", "parcial"],
  todas: null,
  saldadas: ["pagada"],
  anuladas: ["anulada"],
};

export function parseEstadoFiltro(valor: string | undefined): EstadoFiltro {
  return ESTADO_FILTRO_OPCIONES.some((o) => o.value === valor)
    ? (valor as EstadoFiltro)
    : ESTADO_FILTRO_DEFAULT;
}

export function parseOrden(valor: string | undefined): OrdenCuentas {
  return ORDEN_OPCIONES.some((o) => o.value === valor) ? (valor as OrdenCuentas) : ORDEN_DEFAULT;
}
