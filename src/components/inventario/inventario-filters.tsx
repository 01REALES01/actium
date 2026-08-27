"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ESTADO_HERRAMIENTA_FILTRO_OPCIONES,
  ESTADO_HERRAMIENTA_FILTRO_DEFAULT,
  type EstadoHerramientaFiltro,
} from "@/constants/inventario";

const selectClass =
  "h-11 min-h-[44px] w-full rounded-xl border border-border-default bg-bg-secondary px-4 text-sm font-medium text-text-primary focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20 transition-all duration-200 cursor-pointer [&>option]:bg-bg-elevated";

export function InventarioFilters({
  estado,
  busqueda,
  total,
}: {
  estado: EstadoHerramientaFiltro;
  busqueda: string;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string, valorPorDefecto: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === valorPorDefecto) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[--text-secondary]" htmlFor="inv-busqueda">
            Buscar
          </label>
          <input
            id="inv-busqueda"
            type="text"
            defaultValue={busqueda}
            placeholder="Nombre de la herramienta"
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("q", e.currentTarget.value.trim(), "");
            }}
            onBlur={(e) => updateParam("q", e.currentTarget.value.trim(), "")}
            className={selectClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[--text-secondary]" htmlFor="inv-estado">
            Estado
          </label>
          <select
            id="inv-estado"
            value={estado}
            onChange={(e) => updateParam("estado", e.target.value, ESTADO_HERRAMIENTA_FILTRO_DEFAULT)}
            className={selectClass}
          >
            {ESTADO_HERRAMIENTA_FILTRO_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-[--text-secondary]">
        {total} tipo{total === 1 ? "" : "s"} de herramienta en vista.
      </p>
    </div>
  );
}
