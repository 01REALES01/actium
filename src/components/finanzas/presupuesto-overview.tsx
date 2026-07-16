import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCOP } from "@/lib/format";
import type { Tables } from "@/types/database.types";

export function PresupuestoOverview({
  proyectos,
}: {
  proyectos: Tables<"vw_proyectos_finanzas">[];
}) {
  const totalPresupuestado = proyectos.reduce((acc, p) => acc + (p.presupuesto_total ?? 0), 0);
  const totalEjecutado = proyectos.reduce((acc, p) => acc + (p.presupuesto_ejecutado ?? 0), 0);
  const totalDisponible = proyectos.reduce((acc, p) => acc + (p.presupuesto_disponible ?? 0), 0);
  const proyectosEnAlerta = proyectos.filter((p) => (p.porcentaje_ejecutado ?? 0) >= 80).length;

  const kpis = [
    { label: "Presupuestado", valor: formatCOP(totalPresupuestado) },
    { label: "Ejecutado", valor: formatCOP(totalEjecutado) },
    { label: "Disponible", valor: formatCOP(totalDisponible) },
    { label: "Proyectos en alerta", valor: String(proyectosEnAlerta), alerta: proyectosEnAlerta > 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
              {kpi.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={
                "font-display text-2xl md:text-3xl " +
                (kpi.alerta ? "text-warning" : "text-actium-orange")
              }
            >
              {kpi.valor}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
