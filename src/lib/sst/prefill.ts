// =============================================================================
// Reutilización de permisos SST: rellenar un formulario con el último emitido.
// =============================================================================
// En obra se repite el mismo permiso casi a diario (mismo trabajo, misma área,
// mismos EPP y controles). Copiar el último ahorra el diligenciamiento completo,
// PERO los datos de personas NUNCA se heredan: el personal ejecutor, el emisor,
// el coordinador y todas las firmas deben registrarse de nuevo en cada permiso.
// Heredarlos daría por presente a alguien que no lo está y firmaría por él.
// =============================================================================

import { hoyLocal } from "@/lib/fecha";

/**
 * Datos del formulario que se recuperan de la fila en BD cuando el JSON de
 * respaldo no existe (permisos emitidos antes del respaldo estructurado).
 */
export type FallbackFormularioSST = {
  empresa: string;
  area: string;
  ubicacion: string;
  fechaInicio: string;
};

/** Nombres de persona que se limpian siempre (van acompañados de firma). */
const CAMPOS_PERSONA = [
  "emisorNombre",
  "emisorCedula",
  "coordinadorNombre",
  "bloqueadoPor",
  "inspectorNombre",
  "inspectorCedula",
  "supervisorNombre",
  "supervisorCedula",
] as const;

/** Firmas de canvas (data URL). Nunca se heredan. */
const CAMPOS_FIRMA = [
  "firmaDataUrl",
  "emisorFirma",
  "emisorFirmaCierre",
  "coordinadorFirma",
  "coordinadorFirmaCierre",
  "inspectorFirma",
  "supervisorFirma",
] as const;

/** Listas de personal (ejecutores en ATS/altura, trabajadores en caliente). */
const CAMPOS_PERSONAL = ["ejecutores", "trabajadores"] as const;

/** Fechas que se mueven al día de hoy en lugar de arrastrar la del permiso previo. */
const CAMPOS_FECHA = ["fecha", "desde", "hasta"] as const;

/**
 * Devuelve una copia del payload apta para prellenar un permiso nuevo: conserva
 * la descripción del trabajo, los controles y las listas de chequeo; vacía todo
 * dato de personal y firma, y sitúa las fechas en el día de hoy.
 */
export function limpiarDatosPersonales<T extends Record<string, any>>(payload: T): T {
  const limpio: Record<string, any> = { ...payload };

  for (const campo of CAMPOS_PERSONA) {
    if (campo in limpio) limpio[campo] = "";
  }
  for (const campo of CAMPOS_FIRMA) {
    if (campo in limpio) limpio[campo] = "";
  }
  for (const campo of CAMPOS_PERSONAL) {
    if (campo in limpio) limpio[campo] = [];
  }

  const hoy = hoyLocal();
  for (const campo of CAMPOS_FECHA) {
    if (campo in limpio) limpio[campo] = hoy;
  }

  return limpio as T;
}
