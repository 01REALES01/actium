import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDown } from "lucide-react";
import { RESULTADO_CONTEO_LABEL, RESULTADO_CONTEO_VARIANT } from "@/constants/inventario";
import { MarcarPerdidasButton } from "@/components/inventario/marcar-perdidas-button";
import type { Tables } from "@/types/database.types";
import type { ConteoResumen as ConteoResumenRow, ItemConteo } from "@/lib/data/inventario";

export function ConteoResumen({
  conteo,
  resumen,
  items,
  pdfUrl,
}: {
  conteo: Tables<"herramienta_conteos">;
  resumen: ConteoResumenRow;
  items: ItemConteo[];
  pdfUrl: string | null;
}) {
  const faltantes = items.filter((i) => i.resultado === "faltante");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Verificadas" valor={resumen.existentes ?? 0} color="text-success" />
        <Kpi label="Con novedad" valor={resumen.novedades ?? 0} color="text-warning" />
        <Kpi label="No existen" valor={resumen.faltantes ?? 0} color="text-danger" />
        <Kpi label="Total" valor={resumen.total_items ?? 0} color="text-[--text-primary]" />
      </div>

      {conteo.observaciones ? (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[--text-secondary]">Observaciones</p>
          <p className="mt-1 text-sm text-[--text-primary]">{conteo.observaciones}</p>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-actium-orange px-6 py-2.5 text-sm font-semibold text-actium-orange transition-all duration-200 hover:bg-actium-orange/10"
          >
            <FileDown className="h-4 w-4" strokeWidth={1.5} />
            Descargar acta en PDF
          </a>
        ) : null}
        {faltantes.length > 0 ? <MarcarPerdidasButton conteoId={conteo.id} cantidad={faltantes.length} /> : null}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-subtitle text-sm font-semibold text-[--text-secondary]">Detalle del conteo</h2>
        {items.map((item) => (
          <Card key={item.id} className="flex flex-row items-center justify-between gap-3 p-4">
            <div>
              <p className="font-sans text-sm font-semibold text-[--text-primary]">{item.catalogo_nombre}</p>
              <p className="text-xs text-[--text-secondary]">{item.unidad_codigo}</p>
              {item.nota ? <p className="mt-1 text-xs text-[--text-secondary]">{item.nota}</p> : null}
            </div>
            {item.resultado ? (
              <Badge variant={RESULTADO_CONTEO_VARIANT[item.resultado]}>{RESULTADO_CONTEO_LABEL[item.resultado]}</Badge>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`font-display text-2xl ${color}`}>{valor}</p>
      </CardContent>
    </Card>
  );
}
