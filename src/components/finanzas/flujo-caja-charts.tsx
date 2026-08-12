"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCOP, formatFechaCorta } from "@/lib/format";

export type FlujoCajaSeries = {
  quincenas: string[];
  saldoBanco: number[];
  acumulado: number[];
  ingresos: number[];
  egresos: number[];
};

function ejeY(v: number): string {
  const abs = Math.abs(v);
  const signo = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${signo}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${signo}${(abs / 1_000).toFixed(0)}K`;
  return String(v);
}

function ChartSection({
  titulo,
  descripcion,
  quincenas,
  valores,
  color,
  defaultOpen = false,
}: {
  titulo: string;
  descripcion: string;
  quincenas: string[];
  valores: number[];
  color: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [desde, setDesde] = useState(0);
  const [hasta, setHasta] = useState(quincenas.length - 1);

  const iniValido = Math.min(desde, hasta);
  const finValido = Math.max(desde, hasta);

  const chartData = quincenas.slice(iniValido, finValido + 1).map((q, i) => ({
    label: formatFechaCorta(q),
    valor: valores[iniValido + i],
  }));

  return (
    <div className="overflow-hidden rounded-actium border border-[--border-subtle] bg-[--bg-elevated] transition-all duration-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[--bg-hover]"
      >
        <ChevronRight
          className={
            "h-5 w-5 shrink-0 text-[--text-secondary] transition-transform duration-200 " +
            (open ? "rotate-90" : "")
          }
          strokeWidth={1.5}
        />
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="min-w-0">
          <h3 className="font-subtitle text-base font-semibold text-[--text-primary]">{titulo}</h3>
          <p className="text-xs text-[--text-secondary]">{descripcion}</p>
        </div>
      </button>

      {open ? (
        <div className="border-t border-[--border-subtle] px-4 pb-5 pt-4">
          {/* Control de rango de quincenas */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-[--text-secondary]">
              Desde
              <select
                value={desde}
                onChange={(e) => setDesde(Number(e.target.value))}
                className="rounded-lg border border-[--border-default] bg-[--bg-secondary] px-3 py-2 text-sm text-[--text-primary] focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20"
              >
                {quincenas.map((q, i) => (
                  <option key={q} value={i}>
                    {formatFechaCorta(q)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[--text-secondary]">
              Hasta
              <select
                value={hasta}
                onChange={(e) => setHasta(Number(e.target.value))}
                className="rounded-lg border border-[--border-default] bg-[--bg-secondary] px-3 py-2 text-sm text-[--text-primary] focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20"
              >
                {quincenas.map((q, i) => (
                  <option key={q} value={i}>
                    {formatFechaCorta(q)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#404040" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6B6B6B", fontSize: 11 }}
                  axisLine={{ stroke: "#404040" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={ejeY}
                  tick={{ fill: "#6B6B6B", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    color: "var(--text-primary)",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatCOP(value), titulo]}
                />
                <Line
                  type="linear"
                  dataKey="valor"
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: color, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: color, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FlujoCajaCharts({ series }: { series: FlujoCajaSeries }) {
  return (
    <div className="flex flex-col gap-3">
      <ChartSection
        titulo="Saldo en banco"
        descripcion="Saldo acumulado por quincena, sin considerar lo proyectado a pagar/cobrar."
        quincenas={series.quincenas}
        valores={series.saldoBanco}
        color="#8C470B"
      />
      <ChartSection
        titulo="Flujo de caja acumulado"
        descripcion="Saldo acumulado por quincena, incluyendo proyectados."
        quincenas={series.quincenas}
        valores={series.acumulado}
        color="#F25C05"
        defaultOpen
      />
      <ChartSection
        titulo="Ingresos"
        descripcion="Ingresos por quincena."
        quincenas={series.quincenas}
        valores={series.ingresos}
        color="#22C55E"
      />
      <ChartSection
        titulo="Egresos"
        descripcion="Egresos por quincena."
        quincenas={series.quincenas}
        valores={series.egresos}
        color="#EF4444"
      />
    </div>
  );
}
