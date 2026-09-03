import { Badge } from "@/components/ui/badge";
import { EppItemFormDialog } from "@/components/inventario/epp-item-form-dialog";
import { EppMovimientoDialog } from "@/components/inventario/epp-movimiento-dialog";
import type { EppSaldoRow } from "@/lib/data/inventario";

export function EppStockTable({
  proyectoId,
  items,
  puedeEscribir,
}: {
  proyectoId: string;
  items: EppSaldoRow[];
  puedeEscribir: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        Este proyecto aún no tiene elementos de EPP registrados. Crea el primero.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: tarjetas apiladas */}
      <div className="flex flex-col gap-3 md:hidden">
        {items.map((it) => (
          <div key={it.inventario_id} className="rounded-actium border border-[--border-subtle] bg-[--bg-elevated] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-sm font-semibold text-[--text-primary]">
                  {it.nombre}
                  {it.talla ? ` · talla ${it.talla}` : ""}
                </p>
                <p className="text-xs text-[--text-secondary]">{it.unidad}</p>
              </div>
              {it.bajo_minimo ? <Badge variant="warning">Bajo mínimo</Badge> : null}
            </div>
            {!it.elemento_id ? (
              <p className="mt-2 text-xs text-warning" title="Este elemento no se descontará al firmar un cargo de entrega hasta vincularlo.">
                Sin vincular al formato
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[--text-muted]">Ingresado</p>
                <p className="font-medium text-[--text-primary]">{it.ingresado ?? 0}</p>
              </div>
              <div>
                <p className="text-[--text-muted]">Entregado</p>
                <p className="font-medium text-[--text-primary]">{it.entregado ?? 0}</p>
              </div>
              <div>
                <p className="text-[--text-muted]">Saldo</p>
                <p className="font-display text-lg text-actium-orange">{it.saldo ?? 0}</p>
              </div>
            </div>
            {puedeEscribir ? (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <EppItemFormDialog modo="editar" proyectoId={proyectoId} item={it} />
                <EppMovimientoDialog inventarioId={it.inventario_id!} itemNombre={it.nombre!} saldoActual={it.saldo ?? 0} />
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
              <th className="px-4 py-3 text-left">Elemento</th>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-right">Ingresado</th>
              <th className="px-4 py-3 text-right">Entregado</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.inventario_id} className="border-b border-[--border-subtle] transition-colors hover:bg-[--bg-hover]">
                <td className="px-4 py-3 font-medium text-[--text-primary]">
                  {it.nombre}
                  {it.talla ? ` · talla ${it.talla}` : ""}
                  {it.bajo_minimo ? (
                    <Badge variant="warning" className="ml-2">
                      Bajo mínimo
                    </Badge>
                  ) : null}
                  {!it.elemento_id ? (
                    <span
                      className="ml-2 text-xs font-normal text-warning"
                      title="Este elemento no se descontará al firmar un cargo de entrega hasta vincularlo."
                    >
                      Sin vincular al formato
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[--text-secondary]">{it.unidad}</td>
                <td className="px-4 py-3 text-right text-[--text-primary]">{it.ingresado ?? 0}</td>
                <td className="px-4 py-3 text-right text-[--text-primary]">{it.entregado ?? 0}</td>
                <td className="px-4 py-3 text-right font-display text-actium-orange">{it.saldo ?? 0}</td>
                <td className="px-4 py-3">
                  {puedeEscribir ? (
                    <div className="flex justify-end gap-2">
                      <EppItemFormDialog modo="editar" proyectoId={proyectoId} item={it} />
                      <EppMovimientoDialog
                        inventarioId={it.inventario_id!}
                        itemNombre={it.nombre!}
                        saldoActual={it.saldo ?? 0}
                      />
                    </div>
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
