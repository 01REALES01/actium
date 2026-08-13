import { formatFechaCorta } from "@/lib/format";

function labelQuincena(iso: string): string {
  const [year] = iso.split("-");
  return `${formatFechaCorta(iso)} ${year}`;
}

export function QuincenaRangoSelector({
  opciones,
  desde,
  hasta,
  basePath,
}: {
  opciones: string[];
  desde: string;
  hasta: string;
  basePath: string;
}) {
  return (
    <form action={basePath} method="GET" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-[--text-secondary]">
        Quincena inicial
        <select
          name="desde"
          defaultValue={desde}
          className="rounded-xl border border-[--border-default] bg-[--bg-secondary] px-4 py-2.5 text-sm text-[--text-primary] focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20"
        >
          {opciones.map((q) => (
            <option key={q} value={q}>
              {labelQuincena(q)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-[--text-secondary]">
        Quincena final
        <select
          name="hasta"
          defaultValue={hasta}
          className="rounded-xl border border-[--border-default] bg-[--bg-secondary] px-4 py-2.5 text-sm text-[--text-primary] focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20"
        >
          {opciones.map((q) => (
            <option key={q} value={q}>
              {labelQuincena(q)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-xl bg-actium-orange px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-actium-orange-hover"
      >
        Aplicar
      </button>
    </form>
  );
}
