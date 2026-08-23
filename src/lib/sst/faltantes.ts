// =============================================================================
// Redacción de los faltantes de un formulario SST.
// =============================================================================
// Un borrador puede guardarse incompleto — para eso existe —, pero al guardarlo
// hay que decirle al usuario qué le queda por diligenciar, y si algo impide el
// guardado, exactamente qué es. Ambas listas se redactan aquí para que los tres
// formatos hablen igual.
// =============================================================================

/** Une los faltantes en una enumeración legible: "empresa, fecha y firma del emisor". */
export function listarFaltantes(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Pluraliza un conteo de faltantes: "1 ítem" / "8 ítems". */
export function contar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}
