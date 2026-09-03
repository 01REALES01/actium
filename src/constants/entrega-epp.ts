// =============================================================================
// Catálogo del formato Cargo de Entrega de Elementos de Protección Personal.
// =============================================================================
// El formato original diligencia una fila por elemento con su unidad de medida
// (UND. o PAR.), la cantidad entregada, la fecha de recepción y una casilla de
// chequeo. Aquí la casilla de chequeo pasa a ser "Entregado" y habilita la fila;
// la columna de firma por elemento del papel se reemplaza por una única firma
// del trabajador al pie, como constancia de todo lo recibido.
//
// Agregar un elemento nuevo es agregar una entrada a ELEMENTOS_EPP: el
// formulario y el PDF se construyen a partir de este catálogo.
// =============================================================================

export type UnidadEpp = "UND." | "PAR.";

export type ElementoEpp = {
  id: string;
  nombre: string;
  unidad: UnidadEpp;
};

export const ELEMENTOS_EPP: ElementoEpp[] = [
  { id: "casco", nombre: "Casco", unidad: "UND." },
  { id: "barbiquejo", nombre: "Barbiquejo", unidad: "UND." },
  { id: "lentes", nombre: "Lentes de seguridad", unidad: "UND." },
  { id: "auditivos", nombre: "Protectores auditivos", unidad: "UND." },
  { id: "polo", nombre: "Polo o camisa manga larga", unidad: "UND." },
  { id: "pantalon", nombre: "Pantalón naranja con cintas reflectivas", unidad: "UND." },
  { id: "guantes_cuero", nombre: "Guantes de cuero", unidad: "PAR." },
  { id: "guantes_latex", nombre: "Guantes de látex/lana - Multiflex", unidad: "PAR." },
  { id: "guantes_nitron", nombre: "Guantes de nitrón", unidad: "PAR." },
  { id: "zapato", nombre: "Zapato punta de acero", unidad: "PAR." },
];

/** Busca una entrada del catálogo por su id. */
export function elementoEppPorId(id: string): ElementoEpp | undefined {
  return ELEMENTOS_EPP.find((el) => el.id === id);
}

/**
 * Resuelve el id del catálogo a partir de un nombre libre, normalizando
 * mayúsculas/espacios (misma comparación exacta que usa el backfill de la
 * migración 20260903000000_epp_vinculo_catalogo.sql). Devuelve null si el
 * nombre no coincide con ningún elemento del formato — no es un fuzzy match,
 * solo evita pedirle al usuario que re-elija algo que ya escribió igual.
 */
export function normalizarNombreElemento(nombre: string): string | null {
  const normalizado = nombre.trim().toLowerCase();
  const encontrado = ELEMENTOS_EPP.find((el) => el.nombre.trim().toLowerCase() === normalizado);
  return encontrado?.id ?? null;
}

/** Base legal que se imprime en el PDF, en normativa colombiana. */
export const NOTA_LEGAL_EPP =
  "El empleador debe suministrar a sus trabajadores los elementos de protección personal adecuados al tipo de labor y a los riesgos específicos presentes en el desempeño de sus funciones, conforme al Decreto 1072 de 2015 (artículo 2.2.4.6.24) y a la Resolución 2400 de 1979 (artículo 176).";

/** Leyenda de constancia que acompaña la firma única del trabajador. */
export const CONSTANCIA_TRABAJADOR_EPP =
  "Declaro haber recibido a satisfacción los elementos de protección personal relacionados en este cargo, en buen estado y completos, y me comprometo a darles el uso adecuado durante el desarrollo de mis labores.";

// ─── Estado de una fila del cargo ───────────────────────────────────────────

export type EstadoElementoEpp = {
  entregado: boolean;
  cantidad: string;
  fechaRecepcion: string;
  /**
   * Ítem de epp_inventario del que se descuenta esta fila al firmar el
   * cargo. NULL = no se encontró un ítem del inventario del proyecto que
   * coincida (o el proyecto aún no tiene ese elemento registrado): la
   * entrega queda sin conciliar, visible en el panel de vacíos de
   * Inventario, pero la firma nunca se bloquea por esto.
   */
  inventarioId: string | null;
};

/** Fila libre, para las casillas en blanco del formato original. */
export type ElementoAdicionalEpp = {
  id: number;
  nombre: string;
  unidad: UnidadEpp;
  cantidad: string;
  fechaRecepcion: string;
  /**
   * Ítem de epp_inventario del que se descuenta esta fila, cuando el
   * elemento elegido no pertenece a ELEMENTOS_EPP pero sí existe en el
   * inventario del proyecto (p. ej. arnés, careta de soldadura). NULL cuando
   * el nombre se escribió a mano: esas filas nunca descuentan.
   */
  inventarioId: string | null;
};

export function estadoInicialEpp(): Record<string, EstadoElementoEpp> {
  return Object.fromEntries(
    ELEMENTOS_EPP.map((el) => [el.id, { entregado: false, cantidad: "", fechaRecepcion: "", inventarioId: null }]),
  );
}

export function elementoAdicionalVacio(id: number): ElementoAdicionalEpp {
  return { id, nombre: "", unidad: "UND.", cantidad: "", fechaRecepcion: "", inventarioId: null };
}

/** Fila normalizada, lista para tabla o PDF: catálogo primero, adicionales después. */
export type FilaEntregaEpp = {
  nombre: string;
  unidad: UnidadEpp;
  cantidad: string;
  fechaRecepcion: string;
};

/** Elementos marcados como entregados, en el orden del formato. */
export function filasEntregadas(
  estado: Record<string, EstadoElementoEpp>,
  adicionales: ElementoAdicionalEpp[],
): FilaEntregaEpp[] {
  const filas: FilaEntregaEpp[] = ELEMENTOS_EPP.filter((el) => estado[el.id]?.entregado).map((el) => ({
    nombre: el.nombre,
    unidad: el.unidad,
    cantidad: estado[el.id].cantidad,
    fechaRecepcion: estado[el.id].fechaRecepcion,
  }));

  for (const ad of adicionales) {
    if (!ad.nombre.trim()) continue;
    filas.push({ nombre: ad.nombre.trim(), unidad: ad.unidad, cantidad: ad.cantidad, fechaRecepcion: ad.fechaRecepcion });
  }

  return filas;
}

/** Rótulos de las filas marcadas pero sin cantidad o sin fecha de recepción. */
export function filasIncompletas(
  estado: Record<string, EstadoElementoEpp>,
  adicionales: ElementoAdicionalEpp[],
): string[] {
  const incompletas: string[] = [];

  for (const el of ELEMENTOS_EPP) {
    const e = estado[el.id];
    if (!e?.entregado) continue;
    if (!e.cantidad || !e.fechaRecepcion) incompletas.push(el.nombre.toLowerCase());
  }

  for (const ad of adicionales) {
    if (!ad.nombre.trim()) continue;
    if (!ad.cantidad || !ad.fechaRecepcion) incompletas.push(ad.nombre.trim().toLowerCase());
  }

  return incompletas;
}

/** Cuántos elementos quedaron marcados como entregados (catálogo + adicionales con nombre). */
export function contarEntregados(
  estado: Record<string, EstadoElementoEpp>,
  adicionales: ElementoAdicionalEpp[],
): number {
  const delCatalogo = ELEMENTOS_EPP.filter((el) => estado[el.id]?.entregado).length;
  const adicionalesValidos = adicionales.filter((a) => a.nombre.trim()).length;
  return delCatalogo + adicionalesValidos;
}
