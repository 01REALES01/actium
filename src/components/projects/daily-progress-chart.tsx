"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { hoyLocal, etiquetaFechaCorta } from "@/lib/fecha";

interface DailyProgressChartProps {
  real: number;
  proyectado: number;
  title?: string;
  unidad?: string;
  /** Fecha (YYYY-MM-DD) de los datos mostrados. Sin esto, el badge asume hoy en el navegador. */
  fecha?: string;
}

export function DailyProgressChart({ real, proyectado, title, unidad = "MT", fecha }: DailyProgressChartProps) {
  const displayTitle = title || `AVANCE DIARIO (${unidad})`;
  const data = [
    { name: "PROYECTADO", valor: proyectado, color: "rgba(255, 255, 255, 0.1)" },
    { name: "REAL", valor: real, color: "#F25C05" },
  ];
  const cumplimiento = proyectado > 0 ? `${((real / proyectado) * 100).toFixed(1)}%` : "—";
  const etiquetaBadge = fecha
    ? fecha === hoyLocal()
      ? `HOY · ${etiquetaFechaCorta(fecha).toUpperCase()}`
      : etiquetaFechaCorta(fecha).toUpperCase()
    : `HOY: ${new Date().toLocaleDateString("es-ES", { weekday: "long" }).toUpperCase()}`;

  return (
    <div className="flex h-full flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#F25C05]/5 to-transparent opacity-50 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
          {displayTitle}
        </h3>
        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">
          {etiquetaBadge}
        </span>
      </div>
      
      <div className="h-[180px] w-full mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 20, left: 20, bottom: 20 }} barSize={60}>
            <XAxis 
              dataKey="name" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: "#4D4D4D", fontSize: 10, fontWeight: "bold" }}
              dy={10}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#262626] p-3 shadow-2xl">
                      <p className="text-[10px] font-bold text-white/40 uppercase mb-1">{payload[0].payload.name}</p>
                      <p className="text-xl font-bold text-white">{payload[0].value} <span className="text-xs text-white/40">{unidad}</span></p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="valor" 
              radius={[12, 12, 12, 12]} 
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="transition-all duration-500"
                  style={{
                    filter: entry.name === "REAL" ? "drop-shadow(0 0 8px rgba(242, 92, 5, 0.3))" : "none"
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="relative z-10 mt-auto flex items-center justify-between border-t border-white/5 pt-6">
        <div className="flex flex-col">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Cumplimiento</p>
          <p className="text-lg font-bold text-white">{cumplimiento}</p>
        </div>
        <div className="flex flex-col text-right">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Desviación</p>
          <p className={`text-lg font-bold ${real >= proyectado ? 'text-emerald-500' : 'text-red-500'}`}>
            {real >= proyectado ? '+' : ''}{(real - proyectado).toFixed(1)} {unidad}
          </p>
        </div>
      </div>
    </div>
  );
}
