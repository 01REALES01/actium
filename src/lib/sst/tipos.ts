// =============================================================================
// Los tipos de formulario SST y cómo se nombran en la interfaz.
// =============================================================================
// Una sola fuente para el rótulo, la ruta y el comportamiento de cada tipo:
// agregar un formato nuevo es agregar una entrada aquí, no repartir ternarios
// por el historial, la bitácora y el detalle.
// =============================================================================

import type { FormularioTipo } from "@/types/database.types";

/** Nombre completo, para títulos y encabezados de detalle. */
export const NOMBRE_TIPO_SST: Record<FormularioTipo, string> = {
  ats: "Análisis de Trabajo Seguro",
  permiso_altura: "Permiso de Trabajo en Alturas",
  permiso_caliente: "Permiso de Trabajo en Caliente",
  preoperacional: "Inspecciones Preoperacionales",
  entrega_epp: "Formato Entrega EPP",
  charla_seguridad: "Registro de Capacitación / Charla de Seguridad",
};

/** Rótulo corto, para tablas, filtros y tarjetas de la bitácora. */
export const ETIQUETA_TIPO_SST: Record<FormularioTipo, string> = {
  ats: "ATS",
  permiso_altura: "Alturas",
  permiso_caliente: "Caliente",
  preoperacional: "Preoperacional",
  entrega_epp: "Entrega EPP",
  charla_seguridad: "Charla",
};

/** Ruta del formulario de cada tipo, para continuar borradores o cerrar permisos. */
export const RUTA_FORMULARIO_SST: Record<FormularioTipo, string> = {
  ats: "/sst/nuevo-ats",
  permiso_altura: "/sst/permiso-altura",
  permiso_caliente: "/sst/permiso-caliente",
  preoperacional: "/sst/preoperacional",
  entrega_epp: "/sst/entrega-epp",
  charla_seguridad: "/sst/charla-seguridad",
};

/**
 * Tipos que se cierran con firmas al terminar la labor. La inspección
 * preoperacional se realiza una sola vez, antes de iniciar: no tiene cierre.
 */
export const TIPOS_CON_CIERRE: FormularioTipo[] = [
  "ats",
  "permiso_altura",
  "permiso_caliente",
];

export function tieneCierre(tipo: FormularioTipo): boolean {
  return TIPOS_CON_CIERRE.includes(tipo);
}

/** Todos los tipos, en el orden en que se presentan en la interfaz. */
export const TIPOS_SST: FormularioTipo[] = [
  "ats",
  "permiso_altura",
  "permiso_caliente",
  "preoperacional",
  "entrega_epp",
  "charla_seguridad",
];
