// =============================================================================
// Documentos de soldadura: vocabulario común de los seis formatos.
// =============================================================================
// Son tres documentos (WPS, PQR, WPQ) en dos variantes normativas (ASME IX y
// AWS D1.2). Seis formatos en papel con entre 40 y 70 campos cada uno y una
// estructura idéntica: secciones con campos rotulados, tablas, croquis y un
// bloque de certificación al pie.
//
// Escribir seis formularios y seis PDF a mano sería copiar el mismo archivo
// seis veces. En su lugar cada formato se declara aquí como datos —la ficha de
// extracción del papel, literal— y un único formulario y un único documento PDF
// los renderizan. Agregar un séptimo formato es escribir un archivo de
// especificación, no un componente.
// =============================================================================

export type DocumentoTipo = "wps" | "pqr" | "wpq";
export type DocumentoVariante = "asme_ix" | "aws_d1_2";

/** Nombre completo del documento, para títulos y encabezados. */
export const NOMBRE_TIPO_SOLDADURA: Record<DocumentoTipo, string> = {
  wps: "Especificación del Procedimiento de Soldadura",
  pqr: "Registro de Calificación del Procedimiento",
  wpq: "Calificación de Desempeño del Soldador",
};

/** Sigla, que es como el taller los nombra. */
export const SIGLA_TIPO_SOLDADURA: Record<DocumentoTipo, string> = {
  wps: "WPS",
  pqr: "PQR",
  wpq: "WPQ",
};

/** Para qué sirve cada uno, en una línea. Se muestra bajo la tarjeta. */
export const DESCRIPCION_TIPO_SOLDADURA: Record<DocumentoTipo, string> = {
  wps: "Cómo debe ejecutarse la soldadura: juntas, metales, posiciones y parámetros.",
  pqr: "Evidencia de los ensayos que respaldan un WPS con valores reales del cupón.",
  wpq: "Calificación del soldador que ejecuta un WPS ya calificado.",
};

export const NOMBRE_VARIANTE: Record<DocumentoVariante, string> = {
  asme_ix: "ASME IX",
  aws_d1_2: "AWS D1.2",
};

export const NORMA_VARIANTE: Record<DocumentoVariante, string> = {
  asme_ix: "ASME BPVC.IX-2023",
  aws_d1_2: "AWS D1.2/D1.2M:2014",
};

export const DESCRIPCION_VARIANTE: Record<DocumentoVariante, string> = {
  asme_ix: "Código de calderas y recipientes a presión. Formatos QW-482, QW-483 y QW-484A.",
  aws_d1_2: "Código estructural de soldadura en aluminio. Formatos E(a), E(b) y E(c) del Anexo E.",
};

export const TIPOS_SOLDADURA: DocumentoTipo[] = ["wps", "pqr", "wpq"];
export const VARIANTES_SOLDADURA: DocumentoVariante[] = ["asme_ix", "aws_d1_2"];

export function esTipoSoldadura(v: string): v is DocumentoTipo {
  return (TIPOS_SOLDADURA as string[]).includes(v);
}

export function esVarianteSoldadura(v: string): v is DocumentoVariante {
  return (VARIANTES_SOLDADURA as string[]).includes(v);
}

// ─── Especificación de un formato ────────────────────────────────────────────

export type OpcionCasilla = { id: string; label: string };

export type ColumnaTabla = {
  id: string;
  label: string;
  /** Peso relativo del ancho de la columna. 1 si se omite. */
  peso?: number;
};

/**
 * Un campo del formato en papel. `t` es el tipo de control; `id` es la clave
 * estable con la que el valor viaja en el payload, el JSON de respaldo y el PDF
 * —nunca se renombra, o los documentos ya emitidos dejan de leerse.
 */
export type CampoSpec =
  /** Renglón de texto. `nota` es la letra pequeña impresa bajo la línea. */
  | { t: "texto"; id: string; label: string; full?: boolean; nota?: string }
  | { t: "fecha"; id: string; label: string; full?: boolean }
  /** Bloque de varias líneas: descripciones y observaciones. */
  | { t: "area"; id: string; label: string; full?: boolean; nota?: string }
  /** Casilla suelta del papel. */
  | { t: "check"; id: string; label: string }
  /** Grupo de casillas marcables a la vez. */
  | { t: "checks"; id: string; label: string; opciones: OpcionCasilla[] }
  /** Par Sí / No del papel. */
  | { t: "sino"; id: string; label: string; full?: boolean }
  /** Caja de croquis: se adjunta una imagen (data URL en el payload). */
  | { t: "croquis"; id: string; label: string; nota?: string }
  /**
   * Retrato de quien se califica. Va en el encabezado del documento, junto a
   * sus datos, como en el formato del cliente: la calificación es de una
   * persona concreta y la foto es parte de su identificación.
   */
  | { t: "foto"; id: string; label: string; nota?: string }
  /**
   * Registro fotográfico: evidencia de los ensayos (probetas dobladas, macros,
   * cordones). El formato en papel lo referencia como "View Photographic
   * Record"; aquí las fotos viajan con el documento.
   */
  | { t: "galeria"; id: string; label: string; nota?: string }
  /**
   * Tabla. `filas` es cuántas trae en blanco el papel y el usuario puede agregar
   * o quitar. `filasFijas` es lo contrario: el papel ya trae los rótulos de cada
   * renglón impresos (los metales de aporte del QW-482, por ejemplo) y solo se
   * diligencian las columnas — ni se agregan ni se quitan filas.
   */
  | {
      t: "tabla";
      id: string;
      label?: string;
      columnas: ColumnaTabla[];
      filas: number;
      filasFijas?: string[];
      nota?: string;
    }
  /** Texto impreso en el formato original. No captura nada. */
  | { t: "nota"; texto: string };

export type SeccionSpec = {
  id: string;
  titulo: string;
  /** Referencia del código impresa junto al título: "QW-402", "3.6". */
  ref?: string;
  nota?: string;
  campos: CampoSpec[];
};

export type FirmaSpec = { id: string; label: string };

/**
 * Qué campo del formato alimenta cada columna de búsqueda de la tabla. Es lo
 * único que se copia del payload a la fila: el resto del documento se lee
 * abriéndolo, pero por número, proceso y referencias cruzadas sí se busca.
 */
export type ClavesBusqueda = {
  numero?: string;
  titulo?: string;
  proceso?: string;
  wpsRef?: string;
  pqrRef?: string;
  fecha?: string;
  revision?: string;
};

export type EspecDocumento = {
  tipo: DocumentoTipo;
  variante: DocumentoVariante;
  /** Código del formato en el papel: "QW-482", "Form E(a)". */
  formulario: string;
  norma: string;
  titulo: string;
  /** Línea de referencia bajo el título, tal como la imprime la norma. */
  referencia?: string;
  secciones: SeccionSpec[];
  firmas: FirmaSpec[];
  /** Declaración de conformidad impresa sobre las firmas. */
  certificacion?: string;
  notaPie?: string;
  claves: ClavesBusqueda;
};

// ─── Valores diligenciados ───────────────────────────────────────────────────

export type FilaTabla = Record<string, string>;
export type ValorCampo = string | boolean | string[] | FilaTabla[];

/** Lo que el formulario captura y el PDF renderiza, indexado por `id` de campo. */
export type ValoresDocumento = Record<string, ValorCampo>;

export function filaVacia(columnas: ColumnaTabla[]): FilaTabla {
  return Object.fromEntries(columnas.map((c) => [c.id, ""]));
}

/** Todos los campos capturables del formato, aplanados (omite las notas). */
export function camposCapturables(espec: EspecDocumento): Exclude<CampoSpec, { t: "nota" }>[] {
  return espec.secciones
    .flatMap((s) => s.campos)
    .filter((c): c is Exclude<CampoSpec, { t: "nota" }> => c.t !== "nota");
}

/** Valor inicial de un formato en blanco: las tablas nacen con sus filas del papel. */
export function valoresIniciales(espec: EspecDocumento): ValoresDocumento {
  const valores: ValoresDocumento = {};
  for (const campo of camposCapturables(espec)) {
    if (campo.t === "tabla") {
      valores[campo.id] = campo.filasFijas
        ? campo.filasFijas.map((rotulo) => ({
            ...filaVacia(campo.columnas),
            [campo.columnas[0].id]: rotulo,
          }))
        : Array.from({ length: campo.filas }, () => filaVacia(campo.columnas));
    } else if (campo.t === "check") {
      valores[campo.id] = false;
    } else if (campo.t === "checks" || campo.t === "galeria") {
      valores[campo.id] = [];
    } else {
      valores[campo.id] = "";
    }
  }
  for (const firma of espec.firmas) valores[firma.id] = "";
  return valores;
}

/**
 * Filas con contenido real, en orden. En una tabla de rótulos fijos el rótulo no
 * cuenta como contenido: la fila "Flux Type" sin valor sigue estando vacía y no
 * debe imprimirse en el PDF ocupando espacio.
 */
export function filasDiligenciadas(
  filas: FilaTabla[] | undefined,
  columnaRotulo?: string,
): FilaTabla[] {
  return (filas ?? []).filter((f) =>
    Object.entries(f).some(([col, v]) => col !== columnaRotulo && (v || "").trim()),
  );
}

/** Lee un valor de texto del payload sin que el llamador tenga que castear. */
export function textoDe(valores: ValoresDocumento, id: string | undefined): string {
  if (!id) return "";
  const v = valores[id];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Los campos que el formato del papel marca con asterisco o que identifican el
 * documento: sin ellos no se emite. El resto puede quedar en blanco porque el
 * papel mismo admite renglones vacíos cuando la variable no aplica.
 */
export function camposObligatorios(espec: EspecDocumento): { id: string; label: string }[] {
  const ids = [espec.claves.numero, espec.claves.fecha].filter(Boolean) as string[];
  return camposCapturables(espec)
    .filter((c) => ids.includes(c.id) && "label" in c)
    .map((c) => ({ id: c.id, label: (c as { label: string }).label }));
}
