import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProyectoConEmpresa } from "@/lib/data/inventario";

export function EppProyectosTable({
  proyectos,
}: {
  proyectos: { proyecto: ProyectoConEmpresa; totalItems: number; itemsBajoMinimo: number }[];
}) {
  if (proyectos.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        Aún no hay proyectos registrados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {proyectos.map(({ proyecto, totalItems, itemsBajoMinimo }) => (
        <Link
          key={proyecto.id}
          href={`/inventario/epp/${proyecto.id}`}
          className="flex items-center justify-between gap-3 rounded-actium border border-[--border-subtle] bg-[--bg-elevated] p-4 transition-all duration-200 hover:border-actium-orange/30"
        >
          <div>
            <p className="font-sans text-sm font-semibold text-[--text-primary]">{proyecto.nombre}</p>
            <p className="text-xs text-[--text-secondary]">{proyecto.empresas?.nombre ?? "Sin empresa"}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={totalItems > 0 ? "secondary" : "outline"}>
                {totalItems} elemento{totalItems === 1 ? "" : "s"}
              </Badge>
              {itemsBajoMinimo > 0 ? (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                  {itemsBajoMinimo} bajo mínimo
                </Badge>
              ) : null}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[--text-muted]" strokeWidth={1.5} />
        </Link>
      ))}
    </div>
  );
}
