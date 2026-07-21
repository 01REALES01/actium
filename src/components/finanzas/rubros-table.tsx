import { AjustarTechoDialog } from "@/components/finanzas/ajustar-techo-dialog";
import { Badge } from "@/components/ui/badge";
import { formatCOP } from "@/lib/format";
import type { CategoriaFlujo, Tables } from "@/types/database.types";

const CATEGORIA_LABEL: Record<CategoriaFlujo, string> = {
  costos_operativos: "Costos operativos",
  gastos_administrativos: "Gastos administrativos",
  gastos_financieros: "Gastos financieros",
  ingresos: "Ingresos",
};

function colorBarra(porcentaje: number): string {
  if (porcentaje >= 100) return "bg-danger";
  if (porcentaje >= 90) return "bg-warning";
  return "bg-success";
}

function BarraProgreso({ porcentaje }: { porcentaje: number }) {
  const pct = Math.min(100, Math.max(0, porcentaje));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[--bg-hover]">
      <div className={`h-full rounded-full transition-all ${colorBarra(porcentaje)}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RubrosTable({
  rubros,
  puedeEscribir = false,
}: {
  rubros: Tables<"vw_rubro_balance">[];
  puedeEscribir?: boolean;
}) {
  if (rubros.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        Aún no hay rubros registrados. Crea el primero.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: tarjetas apiladas */}
      <div className="flex flex-col gap-3 md:hidden">
        {rubros.map((r) => (
          <div
            key={r.rubro_id}
            className="rounded-actium border border-[--border-subtle] bg-[--bg-elevated] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-sm font-semibold text-[--text-primary]">
                  {r.codigo ? `${r.codigo} · ` : ""}
                  {r.nombre}
                </p>
                {r.categoria ? (
                  <Badge variant="secondary" className="mt-1">
                    {CATEGORIA_LABEL[r.categoria]}
                  </Badge>
                ) : null}
              </div>
              <p className="font-display text-lg text-actium-orange">
                {(r.porcentaje_ejecutado ?? 0).toFixed(0)}%
              </p>
            </div>
            <div className="mt-3">
              <BarraProgreso porcentaje={r.porcentaje_ejecutado ?? 0} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[--text-muted]">Techo</p>
                <p className="font-medium text-[--text-primary]">{formatCOP(r.monto_maximo ?? 0)}</p>
              </div>
              <div>
                <p className="text-[--text-muted]">Ejecutado</p>
                <p className="font-medium text-[--text-primary]">{formatCOP(r.ejecutado ?? 0)}</p>
              </div>
              <div>
                <p className="text-[--text-muted]">Disponible</p>
                <p className="font-medium text-[--text-primary]">{formatCOP(r.disponible ?? 0)}</p>
              </div>
            </div>
            {puedeEscribir && r.rubro_id && r.nombre ? (
              <div className="mt-3 flex justify-end">
                <AjustarTechoDialog
                  rubroId={r.rubro_id}
                  rubroNombre={r.nombre}
                  montoActual={r.monto_maximo ?? 0}
                  categoria={r.categoria}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto rounded-actium border border-[--border-subtle] md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white">
              <th className="px-4 py-3 text-left">Rubro</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-right">Techo</th>
              <th className="px-4 py-3 text-right">Ejecutado</th>
              <th className="px-4 py-3 text-right">Disponible</th>
              <th className="px-4 py-3">Consumo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rubros.map((r) => (
              <tr
                key={r.rubro_id}
                className="border-b border-[--border-subtle] transition-colors hover:bg-[--bg-hover]"
              >
                <td className="px-4 py-3 font-medium text-[--text-primary]">
                  {r.codigo ? `${r.codigo} · ` : ""}
                  {r.nombre}
                </td>
                <td className="px-4 py-3 text-[--text-secondary]">
                  {r.categoria ? CATEGORIA_LABEL[r.categoria] : "—"}
                </td>
                <td className="px-4 py-3 text-right text-[--text-primary]">{formatCOP(r.monto_maximo ?? 0)}</td>
                <td className="px-4 py-3 text-right text-[--text-primary]">{formatCOP(r.ejecutado ?? 0)}</td>
                <td className="px-4 py-3 text-right text-[--text-primary]">{formatCOP(r.disponible ?? 0)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <BarraProgreso porcentaje={r.porcentaje_ejecutado ?? 0} />
                    </div>
                    <span className="w-10 text-xs text-[--text-secondary]">
                      {(r.porcentaje_ejecutado ?? 0).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {puedeEscribir && r.rubro_id && r.nombre ? (
                    <AjustarTechoDialog
                      rubroId={r.rubro_id}
                      rubroNombre={r.nombre}
                      montoActual={r.monto_maximo ?? 0}
                      categoria={r.categoria}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
