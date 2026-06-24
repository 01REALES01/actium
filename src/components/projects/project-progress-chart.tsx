"use client";

import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Maximize2, Minimize2 } from "lucide-react";

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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const wrapperClasses = isExpanded 
    ? "fixed inset-0 z-50 flex flex-col gap-6 bg-[#121212] p-4 sm:p-8 overflow-hidden" 
    : "relative flex h-full flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl overflow-hidden backdrop-blur-xl group transition-all";

  return (
    <div className={wrapperClasses}>
      {!isExpanded && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
      )}
      
      <div className="relative z-10 flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
          {chartTitle} ({unidad})
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-[#F25C05]" />
            Real
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-1 w-4 rounded-full border-t border-dashed border-[#6B6B6B]" />
            Proyectado
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            title={isExpanded ? "Minimizar" : "Expandir pantalla completa"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className={`relative w-full ${isExpanded ? "flex-1" : "h-[300px]"}`}>
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
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4", fill: "transparent" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const avanceData = payload.find(p => p.dataKey === "avance");
                  const proyectadoData = payload.find(p => p.dataKey === "proyectado");
                  
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#262626] p-3 shadow-xl">
                      <p className="text-[10px] font-bold text-white/40 uppercase mb-2 border-b border-white/5 pb-1">{payload[0].payload.fecha}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-8">
                          <span className="text-[10px] font-bold text-[#F25C05] uppercase">Real</span>
                          <span className="text-sm font-bold text-[#F25C05]">{avanceData?.value != null ? `${avanceData.value} ${unidad}` : "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-8">
                          <span className="text-[10px] font-bold text-white/40 uppercase">Proyectado</span>
                          <span className="text-sm font-bold text-white/60">{proyectadoData?.value != null ? `${proyectadoData.value} ${unidad}` : "N/A"}</span>
                        </div>
                        {avanceData?.value != null && proyectadoData?.value != null && Number(proyectadoData.value) > 0 && (
                          <div className="flex items-center justify-between gap-8 pt-1.5 border-t border-white/5 mt-1.5">
                            <span className="text-[10px] font-bold text-green-400 uppercase">Cumplimiento</span>
                            <span className="text-sm font-bold text-green-400">
                              {((Number(avanceData.value) / Number(proyectadoData.value)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
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
              activeDot={{ r: 4, fill: CHART_COLORS.projected, stroke: "#1A1A1A", strokeWidth: 2 }}
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
        <div className={`absolute rounded-lg border border-white/5 bg-white/5 backdrop-blur-sm ${
          isExpanded ? "top-4 left-10 p-4" : "bottom-4 right-4 md:bottom-10 md:right-10 p-2 md:p-4"
        }`}>
          <p className="text-[8px] md:text-[10px] font-bold text-white/40 uppercase tracking-wider">Desviación</p>
          <p className={`text-lg md:text-2xl font-bold ${deviation >= 0 ? "text-[#F25C05]" : "text-red-500"}`}>{deviationFormatted}</p>
        </div>
      </div>
    </div>
  );
}
