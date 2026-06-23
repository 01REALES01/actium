"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";

type DataPoint = {
  fecha: string;
  avance?: number | null;
  proyectado?: number | null;
};

type ProjectProgressChartProps = {
  data: DataPoint[];
  unidad?: string;
  etiquetaEjeY?: string;
};

const CHART_COLORS = {
  primary: "#F25C05", // actium-orange
  projected: "#6B6B6B",
  axis: "#4D4D4D",
  grid: "#262626",
};

export function ProjectProgressChart({ data, unidad = "MT", etiquetaEjeY }: ProjectProgressChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[--text-muted]">
        Sin datos de avance registrados.
      </p>
    );
  }

  // Calculate deviation from last available points
  const currentReal = data.filter(d => d.avance != null).pop()?.avance ?? 0;
  const currentProyectado = data.filter(d => d.proyectado != null).pop()?.proyectado ?? 0;
  const deviation = currentReal - currentProyectado;
  const deviationFormatted = (deviation >= 0 ? "+" : "") + deviation.toFixed(1) + " " + unidad;

  const chartTitle = etiquetaEjeY || `Avance del Proyecto`;

  return (
    <div className="relative flex h-full flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl overflow-hidden backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
          {chartTitle} ({unidad})
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
          <div className="flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-[#F25C05]" />
            Real
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-4 rounded-full border-t border-dashed border-[#6B6B6B]" />
            Proyectado
          </div>
        </div>
      </div>

      <div className="relative h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis 
              dataKey="fecha" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: CHART_COLORS.axis, fontSize: 10, fontWeight: "bold" }} 
              dy={10}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              tick={{ fill: CHART_COLORS.axis, fontSize: 10, fontWeight: "bold" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#262626] p-3 shadow-xl">
                      <p className="text-[10px] font-bold text-white/40 uppercase">{payload[0].payload.fecha}</p>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm font-bold text-[#F25C05]">Real: {payload[1]?.value} {unidad}</p>
                        <p className="text-sm font-bold text-white/60">Proyectado: {payload[0]?.value} {unidad}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="proyectado"
              stroke={CHART_COLORS.projected}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              animationDuration={1500}
              connectNulls={true}
            />
            <Line
              type="monotone"
              dataKey="avance"
              stroke={CHART_COLORS.primary}
              strokeWidth={4}
              dot={{ r: 0 }}
              activeDot={{ r: 6, fill: CHART_COLORS.primary, stroke: "#1A1A1A", strokeWidth: 2 }}
              animationDuration={2000}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Deviation Box */}
        <div className="absolute bottom-4 right-4 md:bottom-10 md:right-10 rounded-lg border border-white/5 bg-white/5 p-2 md:p-4 backdrop-blur-sm">
          <p className="text-[8px] md:text-[10px] font-bold text-white/40 uppercase tracking-wider">Desviación</p>
          <p className="text-lg md:text-2xl font-bold text-[#F25C05]">{deviationFormatted}</p>
        </div>
      </div>
    </div>
  );
}
