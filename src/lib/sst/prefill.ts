// =============================================================================
// Reutilización de permisos SST: rellenar un formulario con el último emitido.
// =============================================================================
// En obra se repite el mismo permiso casi a diario (mismo trabajo, misma área,
// mismos EPP y controles) y casi siempre con la misma cuadrilla. Copiar el
// último ahorra el diligenciamiento completo, incluidos los nombres y las
// cédulas del personal, que el equipo pidió heredar para no reescribirlos.
//
// Lo que NUNCA se hereda es la FIRMA. Un trazo capturado otro día no puede dar
// por firmado el documento de hoy, así que las firmas se vacían aquí, en el
// servidor: ni siquiera viajan al navegador.
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

// Se heredan el nombre y la cédula de quienes firman el permiso —emisor,
// coordinador, inspector, supervisor, quien bloqueó energías— y del personal
// ejecutor, porque la cuadrilla suele ser la misma día tras día.
//
// El destinatario del cargo de EPP es la excepción: ese documento se emite a
// nombre de UNA persona concreta, así que su identidad no se arrastra de un
// cargo a otro.
const CAMPOS_DESTINATARIO_EPP = [
  "empleadoId",
  "trabajadorNombre",
  "trabajadorCedula",
  "trabajadorCargo",
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
  "trabajadorFirma",
] as const;

/** Listas de personal (ejecutores en ATS/altura, trabajadores en caliente). */
const CAMPOS_PERSONAL = ["ejecutores", "trabajadores"] as const;

/** Fechas que se mueven al día de hoy en lugar de arrastrar la del permiso previo. */
const CAMPOS_FECHA = ["fecha", "desde", "hasta"] as const;

/**
 * Devuelve una copia del payload apta para prellenar un permiso nuevo: conserva
 * la descripción del trabajo, los controles, las listas de chequeo y el personal
 * con su nombre y cédula; vacía únicamente las firmas y sitúa las fechas en el
 * día de hoy.
 */
export function limpiarDatosPersonales<T extends Record<string, any>>(payload: T): T {
  const limpio: Record<string, any> = { ...payload };

  for (const campo of CAMPOS_FIRMA) {
    if (campo in limpio) limpio[campo] = "";
  }
  for (const campo of CAMPOS_DESTINATARIO_EPP) {
    if (campo in limpio) limpio[campo] = "";
  }

  // El personal se conserva con nombre y cédula, pero sin su firma.
  for (const campo of CAMPOS_PERSONAL) {
    const lista = limpio[campo];
    if (!Array.isArray(lista)) continue;
    limpio[campo] = lista.map((persona: Record<string, unknown>) => ({
      ...persona,
      firma: "",
      firmaCierre: "",
    }));
  }

  const hoy = hoyLocal();
  for (const campo of CAMPOS_FECHA) {
    if (campo in limpio) limpio[campo] = hoy;
  }

  return limpio as T;
}
