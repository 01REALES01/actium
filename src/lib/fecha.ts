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

/** Ancla mediodía UTC para un YYYY-MM-DD: evita que la aritmética de días cruce a otra fecha. */
function anclaMediodiaMs(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getTime();
}

/** Suma (o resta, con negativo) días a un YYYY-MM-DD sin desfase de zona horaria. */
export function sumarDias(fecha: string, dias: number): string {
  const ms = anclaMediodiaMs(fecha) + dias * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().split("T")[0];
}

/** Fecha de AYER en hora de Colombia, como YYYY-MM-DD. */
export function ayerLocal(): string {
  return sumarDias(hoyLocal(), -1);
}

/** "mar, 12 ago" a partir de un YYYY-MM-DD, sin desfase de zona horaria. */
export function etiquetaFechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

/** "martes, 12 de agosto" a partir de un YYYY-MM-DD, sin desfase de zona horaria. */
export function etiquetaFechaLarga(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
