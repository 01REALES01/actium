"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCOP } from "@/lib/format";
import type { CategoriaFlujo, Tables } from "@/types/database.types";

const CATEGORIA_LABEL: Record<CategoriaFlujo, string> = {
  costos_operativos: "Costos operativos",
  gastos_administrativos: "Gastos administrativos",
  gastos_financieros: "Gastos financieros",
  ingresos: "Ingresos",
};

const ORDEN: CategoriaFlujo[] = [
  "costos_operativos",
  "gastos_administrativos",
  "gastos_financieros",
];

export function RubrosDonutChart({
  rubros,
}: {
  rubros: Tables<"vw_rubro_balance">[];
}) {
  const porCategoria = new Map<CategoriaFlujo, { total: number; ejecutado: number }>();
  for (const r of rubros) {
    if (!r.categoria || r.categoria === "ingresos") continue;
    const prev = porCategoria.get(r.categoria) ?? { total: 0, ejecutado: 0 };
    porCategoria.set(r.categoria, {
      total: prev.total + (r.monto_maximo ?? 0),
      ejecutado: prev.ejecutado + (r.ejecutado ?? 0),
    });
  }

  const data = ORDEN.filter((cat) => porCategoria.has(cat)).map((cat) => {
    const { total, ejecutado } = porCategoria.get(cat)!;
    return { categoria: cat, nombre: CATEGORIA_LABEL[cat], total, ejecutado };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-sans text-base font-semibold">
          Distribución por categoría
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {data.length === 0 ? (
          <p className="py-4 text-center text-sm text-[--text-secondary]">
            Aún no hay rubros de egreso registrados.
          </p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={4} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#404040" strokeDasharray="3 3" />
                <XAxis
                  dataKey="nombre"
                  tick={{ fill: "#6B6B6B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}K`
                      : String(v)
                  }
                  tick={{ fill: "#6B6B6B", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    color: "var(--text-primary)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    formatCOP(value),
                    name === "total" ? "Total presupuestado" : "Ejecutado",
                  ]}
                  labelFormatter={(label: unknown) => String(label)}
                />
                <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={36} name="total" />
                <Bar dataKey="ejecutado" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={36} name="ejecutado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex gap-4 text-xs text-[--text-secondary]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-info" />
            Total presupuestado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-danger" />
            Ejecutado
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
