"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ESTADO_FILTRO_OPCIONES,
  ESTADO_FILTRO_DEFAULT,
  ORDEN_OPCIONES,
  ORDEN_DEFAULT,
  type EstadoFiltro,
  type OrdenCuentas,
} from "@/constants/cuentas";

interface CuentasFiltersProps {
  estado: EstadoFiltro;
  orden: OrdenCuentas;
  /** Cantidad de cuentas visibles con el filtro aplicado. */
  total: number;
}

const selectClass =
  "h-11 min-h-[44px] w-full rounded-xl border border-border-default bg-bg-secondary px-4 text-sm font-medium text-text-primary focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20 transition-all duration-200 cursor-pointer [&>option]:bg-bg-elevated";

export function CuentasFilters({ estado, orden, total }: CuentasFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string, valorPorDefecto: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === valorPorDefecto) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-medium uppercase tracking-wider text-[--text-secondary]"
            htmlFor="filtro-estado-cuentas"
          >
            Estado
          </label>
          <select
            id="filtro-estado-cuentas"
            value={estado}
            onChange={(e) => updateFilter("estado", e.target.value, ESTADO_FILTRO_DEFAULT)}
            className={selectClass}
          >
            {ESTADO_FILTRO_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-medium uppercase tracking-wider text-[--text-secondary]"
            htmlFor="filtro-orden-cuentas"
          >
            Ordenar por
          </label>
          <select
            id="filtro-orden-cuentas"
            value={orden}
            onChange={(e) => updateFilter("orden", e.target.value, ORDEN_DEFAULT)}
            className={selectClass}
          >
            {ORDEN_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-[--text-secondary]">
        {total} factura{total === 1 ? "" : "s"} en vista.
      </p>
    </div>
  );
}
