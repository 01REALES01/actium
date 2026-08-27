import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CatalogoConDisponibilidad } from "@/lib/data/inventario";

export function HerramientasTable({
  catalogo,
  mensajeVacio,
}: {
  catalogo: CatalogoConDisponibilidad[];
  mensajeVacio: string;
}) {
  if (catalogo.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        {mensajeVacio}
      </p>
    );
  }

  return (
    <>
      {/* Mobile: tarjetas apiladas */}
      <div className="flex flex-col gap-3 md:hidden">
        {catalogo.map((c) => (
          <Link
            key={c.catalogo_id}
            href={`/inventario/herramientas/${c.catalogo_id}`}
            className="block rounded-actium border border-[--border-subtle] bg-[--bg-elevated] p-4 transition-all duration-200 hover:border-actium-orange/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-sans text-sm font-semibold text-[--text-primary]">{c.nombre}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.categoria ? <Badge variant="secondary">{c.categoria}</Badge> : null}
                  {c.activo === false ? <Badge variant="outline">Descontinuado</Badge> : null}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[--text-muted]" strokeWidth={1.5} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              <div>
                <p className="text-[--text-muted]">Total</p>
                <p className="font-medium text-[--text-primary]">{c.total ?? 0}</p>
              </div>
              <div>
                <p className="text-[--text-muted]">Disponibles</p>
                <p className="font-medium text-success">{c.disponibles ?? 0}</p>
              </div>
              <div>
                <p className="text-[--text-muted]">Asignadas</p>
                <p className="font-medium text-info">{c.asignadas ?? 0}</p>
              </div>
              <div>
                <p className="text-[--text-muted]">Mantenim.</p>
                <p className="font-medium text-warning">{c.en_mantenimiento ?? 0}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto rounded-actium border border-[--border-subtle] md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white">
              <th className="px-4 py-3 text-left">Herramienta</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Disponibles</th>
              <th className="px-4 py-3 text-right">Asignadas</th>
              <th className="px-4 py-3 text-right">Mantenimiento</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {catalogo.map((c) => (
              <tr key={c.catalogo_id} className="border-b border-[--border-subtle] transition-colors hover:bg-[--bg-hover]">
                <td className="px-4 py-3 font-medium text-[--text-primary]">
                  {c.nombre}
                  {c.activo === false ? (
                    <Badge variant="outline" className="ml-2">
                      Descontinuado
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[--text-secondary]">{c.categoria ?? "—"}</td>
                <td className="px-4 py-3 text-right text-[--text-primary]">{c.total ?? 0}</td>
                <td className="px-4 py-3 text-right text-success">{c.disponibles ?? 0}</td>
                <td className="px-4 py-3 text-right text-info">{c.asignadas ?? 0}</td>
                <td className="px-4 py-3 text-right text-warning">{c.en_mantenimiento ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/inventario/herramientas/${c.catalogo_id}`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-actium-orange hover:bg-actium-orange/10"
                  >
                    Ver unidades
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
