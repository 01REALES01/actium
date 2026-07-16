const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** "$25.000.000" */
export function formatCOP(monto: number): string {
  return COP_FORMATTER.format(monto);
}

/** Convención financiera: negativos entre paréntesis, cero como "—". */
export function formatMontoContable(monto: number): string {
  if (monto === 0) return "—";
  if (monto < 0) return `(${COP_FORMATTER.format(Math.abs(monto))})`;
  return COP_FORMATTER.format(monto);
}

/** "15 may" a partir de un ISO date (YYYY-MM-DD), sin desfase de zona horaria. */
export function formatFechaCorta(fechaISO: string): string {
  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

/** "15 de mayo de 2026" a partir de un ISO date (YYYY-MM-DD). */
export function formatFechaLarga(fechaISO: string): string {
  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}
