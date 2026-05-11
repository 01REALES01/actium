"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart } from "recharts";

type DataPoint = {
  fecha: string;
  avance: number;
  proyectado: number;
};

type ProjectProgressChartProps = {
  data: DataPoint[];
};

const CHART_COLORS = {
  primary: "#FF916E", // Salmon/Orange from screenshot
  projected: "#6B6B6B",
  axis: "#4D4D4D",
  grid: "#262626",
};

export function ProjectProgressChart({ data }: ProjectProgressChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[--text-muted]">
        Sin datos de avance registrados.
      </p>
    );
  }

  // Calculate deviation from last point
  const lastPoint = data[data.length - 1];
  const deviation = lastPoint.avance - lastPoint.proyectado;
  const deviationFormatted = (deviation >= 0 ? "+" : "") + deviation.toFixed(1) + "%";

  return (
    <div className="relative flex h-full flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
          AVANCE TOTAL DEL PROYECTO
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
          <div className="flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-[#FF916E]" />
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
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: CHART_COLORS.axis, fontSize: 10, fontWeight: "bold" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#262626] p-3 shadow-xl">
                      <p className="text-[10px] font-bold text-white/40 uppercase">{payload[0].payload.fecha}</p>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm font-bold text-[#FF916E]">Real: {payload[1]?.value}%</p>
                        <p className="text-sm font-bold text-white/60">Proyectado: {payload[0]?.value}%</p>
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
            />
            <Line
              type="monotone"
              dataKey="avance"
              stroke={CHART_COLORS.primary}
              strokeWidth={4}
              dot={{ r: 0 }}
              activeDot={{ r: 6, fill: CHART_COLORS.primary, stroke: "#1A1A1A", strokeWidth: 2 }}
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Deviation Box */}
        <div className="absolute bottom-10 right-10 rounded-lg border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Desviación</p>
          <p className="text-2xl font-bold text-[#FF916E]">{deviationFormatted}</p>
        </div>
      </div>
    </div>
  );
}
