// Etiquetas, categorías y filtros del módulo Inventario (Herramientas y EPP).
// Compartido entre la capa de datos (servidor) y los selectores (cliente),
// siguiendo el molde de src/constants/cuentas.ts.

import type { HerramientaEstado, HerramientaCondicion, EppMovimientoTipo } from "@/types/database.types";

// ─── Herramientas ──────────────────────────────────────────────────────────

export const ESTADO_HERRAMIENTA_LABEL: Record<HerramientaEstado, string> = {
  disponible: "Disponible",
  asignada: "Asignada",
  mantenimiento: "En mantenimiento",
  baja: "De baja",
  perdida: "Perdida",
};

export const ESTADO_HERRAMIENTA_VARIANT: Record<
  HerramientaEstado,
  "success" | "info" | "warning" | "destructive" | "secondary"
> = {
  disponible: "success",
  asignada: "info",
  mantenimiento: "warning",
  baja: "secondary",
  perdida: "destructive",
};

export const CONDICION_LABEL: Record<HerramientaCondicion, string> = {
  bueno: "Buen estado",
  regular: "Estado regular",
  malo: "Mal estado",
};

export const CONDICION_OPCIONES: { value: HerramientaCondicion; label: string }[] = (
  Object.keys(CONDICION_LABEL) as HerramientaCondicion[]
).map((value) => ({ value, label: CONDICION_LABEL[value] }));

/** Categorías sugeridas para el catálogo. El campo admite texto libre. */
export const CATEGORIAS_HERRAMIENTA = [
  "Eléctrica",
  "Manual",
  "Soldadura",
  "Izaje",
  "Medición",
  "Andamiaje",
  "Seguridad en altura",
  "Otra",
] as const;

export const ESTADO_HERRAMIENTA_FILTRO_OPCIONES = [
  { value: "todas", label: "Todas" },
  { value: "disponibles", label: "Disponibles" },
  { value: "asignadas", label: "Asignadas" },
  { value: "mantenimiento", label: "En mantenimiento" },
  { value: "fuera_de_servicio", label: "Fuera de servicio" },
] as const;

export type EstadoHerramientaFiltro = (typeof ESTADO_HERRAMIENTA_FILTRO_OPCIONES)[number]["value"];

export const ESTADO_HERRAMIENTA_FILTRO_DEFAULT: EstadoHerramientaFiltro = "todas";

export function parseEstadoHerramientaFiltro(valor: string | undefined): EstadoHerramientaFiltro {
  return ESTADO_HERRAMIENTA_FILTRO_OPCIONES.some((o) => o.value === valor)
    ? (valor as EstadoHerramientaFiltro)
    : ESTADO_HERRAMIENTA_FILTRO_DEFAULT;
}

// ─── EPP ───────────────────────────────────────────────────────────────────

export const EPP_MOVIMIENTO_LABEL: Record<EppMovimientoTipo, string> = {
  ingreso: "Ingreso",
  salida: "Salida",
  ajuste: "Ajuste",
};

export const EPP_MOVIMIENTO_OPCIONES: { value: EppMovimientoTipo; label: string }[] = (
  Object.keys(EPP_MOVIMIENTO_LABEL) as EppMovimientoTipo[]
).map((value) => ({ value, label: EPP_MOVIMIENTO_LABEL[value] }));

export const UNIDAD_EPP_OPCIONES = ["UND.", "PAR."] as const;
