// =============================================================================
// Utilidades de fecha en hora local de operación (Colombia / Bogotá, UTC-5).
//
// El servidor corre en UTC: `new Date().toISOString()` da el día UTC, que en la
// tarde/noche colombiana ya es "mañana". Eso hacía que "hoy" y los rangos de día
// no coincidieran con el día real en obra y los eventos no se mostraran.
//
// Bogotá no tiene horario de verano, así que el offset fijo -05:00 es seguro.
// =============================================================================

export const ZONA_HORARIA = "America/Bogota";
const OFFSET = "-05:00";

/** Fecha de HOY en hora de Colombia, como YYYY-MM-DD. */
export function hoyLocal(): string {
  // 'en-CA' formatea como YYYY-MM-DD.
  return new Date().toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });
}

/**
 * Límites de un día local (Bogotá) para comparar contra columnas timestamptz.
 * Devuelve los bordes con offset -05:00 para que Postgres los interprete bien.
 */
export function rangoDiaLocal(fecha: string): { start: string; end: string } {
  return {
    start: `${fecha}T00:00:00.000${OFFSET}`,
    end: `${fecha}T23:59:59.999${OFFSET}`,
  };
}

/** Momento actual en hora de Colombia con formato para input datetime-local: YYYY-MM-DDTHH:mm */
export function ahoraLocalInput(): string {
  // 'sv-SE' produce "YYYY-MM-DD HH:mm:ss".
  const s = new Date().toLocaleString("sv-SE", { timeZone: ZONA_HORARIA });
  return s.slice(0, 16).replace(" ", "T");
}
