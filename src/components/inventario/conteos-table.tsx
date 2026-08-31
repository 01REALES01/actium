import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CONTEO_ESTADO_LABEL } from "@/constants/inventario";
import { etiquetaFechaCorta } from "@/lib/fecha";
import type { ConteoResumen } from "@/lib/data/inventario";

export function ConteosTable({
  conteos,
  nombresPorProyecto,
}: {
  conteos: ConteoResumen[];
  nombresPorProyecto: Record<string, string>;
}) {
  if (conteos.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        Aún no se ha hecho ningún conteo de herramientas. Empieza el primero.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {conteos.map((c) => {
        if (!c.conteo_id) return null;
        const ambitoNombre = c.proyecto_id ? nombresPorProyecto[c.proyecto_id] ?? "Proyecto" : "Bodega";
        return (
          <Link key={c.conteo_id} href={`/inventario/herramientas/conteos/${c.conteo_id}`}>
            <Card className="flex flex-row items-center justify-between gap-3 p-4 hover:border-actium-orange/30 hover:shadow-actium-glow">
              <div>
                <p className="font-sans text-sm font-semibold text-[--text-primary]">{ambitoNombre}</p>
                <p className="text-xs text-[--text-secondary]">
                  {c.fecha_conteo ? etiquetaFechaCorta(c.fecha_conteo) : "—"} · {c.total_items ?? 0} herramientas
                  {(c.faltantes ?? 0) > 0 ? ` · ${c.faltantes} faltantes` : ""}
                </p>
              </div>
              {c.estado ? (
                <Badge variant={c.estado === "cerrado" ? "success" : "warning"}>
                  {CONTEO_ESTADO_LABEL[c.estado]}
                </Badge>
              ) : null}
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
