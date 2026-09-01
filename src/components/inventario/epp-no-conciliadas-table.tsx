import Link from "next/link";
import { Eye } from "lucide-react";
import type { EntregaNoConciliada } from "@/lib/data/inventario";

/**
 * Panel de vacíos: elementos de un cargo de EPP firmado que no se
 * conciliaron con ningún ítem del inventario del proyecto, y por lo tanto no
 * descontaron stock. Cada fila es una discrepancia auditable frente al
 * conteo físico.
 */
export function EppNoConciliadasTable({ entregas }: { entregas: EntregaNoConciliada[] }) {
  if (entregas.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-subtitle text-lg font-semibold text-[--text-primary]">Entregas sin conciliar</h2>
      <p className="text-xs text-[--text-secondary]">
        Elementos de cargos firmados que no quedaron vinculados a ningún ítem del inventario y por eso no
        descontaron stock. Concílielos editando el ítem correspondiente o revise el cargo.
      </p>

      {/* Mobile: tarjetas apiladas */}
      <div className="flex flex-col gap-3 md:hidden">
        {entregas.map((e) => (
          <div key={e.item_id} className="rounded-actium border border-warning/20 bg-warning/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-sm font-semibold text-[--text-primary]">{e.elemento}</p>
                <p className="text-xs text-[--text-secondary]">
                  {e.trabajador_nombre} · {e.fecha_entrega}
                </p>
              </div>
              <span className="shrink-0 font-display text-lg text-warning">
                {e.cantidad} {e.unidad}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[--text-muted]">{e.codigo_consecutivo || "Sin consecutivo"}</span>
              {e.formulario_id ? (
                <Link
                  href={`/sst/${e.formulario_id}`}
                  className="flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-actium-orange"
                >
                  <Eye className="h-4 w-4" strokeWidth={1.5} /> Ver cargo
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto rounded-actium border border-warning/20 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white">
              <th className="px-4 py-3 text-left">Elemento</th>
              <th className="px-4 py-3 text-left">Trabajador</th>
              <th className="px-4 py-3 text-left">Fecha de entrega</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-left">Cargo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {entregas.map((e) => (
              <tr key={e.item_id} className="border-b border-[--border-subtle] bg-warning/5 transition-colors hover:bg-warning/10">
                <td className="px-4 py-3 font-medium text-[--text-primary]">{e.elemento}</td>
                <td className="px-4 py-3 text-[--text-secondary]">{e.trabajador_nombre}</td>
                <td className="px-4 py-3 text-[--text-secondary]">{e.fecha_entrega}</td>
                <td className="px-4 py-3 text-right text-warning">
                  {e.cantidad} {e.unidad}
                </td>
                <td className="px-4 py-3 text-[--text-secondary]">{e.codigo_consecutivo || "Sin consecutivo"}</td>
                <td className="px-4 py-3 text-right">
                  {e.formulario_id ? (
                    <Link
                      href={`/sst/${e.formulario_id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-actium-orange hover:text-actium-orange-hover"
                    >
                      <Eye className="h-4 w-4" strokeWidth={1.5} /> Ver cargo
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
