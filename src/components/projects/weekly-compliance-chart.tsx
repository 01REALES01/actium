"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

type WeeklyProgressData = {
  dia: string;
  proyectado: number;
  real: number;
};

interface WeeklyComplianceChartProps {
  data: WeeklyProgressData[];
  unidad?: string;
  weekOffset?: number;
}

export function WeeklyComplianceChart({ data, unidad = "MT", weekOffset = 0 }: WeeklyComplianceChartProps) {
  const router = useRouter();

  function changeWeek(delta: number) {
    const newOffset = weekOffset + delta;
    if (newOffset > 0) return; // Prevent going to future weeks
    router.push(`?weekOffset=${newOffset}`, { scroll: false });
  }
  return (
    <div className="flex h-full flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-bl from-[#F25C05]/5 to-transparent opacity-50 pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => changeWeek(-1)} 
              className="rounded bg-white/5 p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              SEMANA {weekOffset === 0 ? "ACTUAL" : weekOffset < 0 ? weekOffset : `+${weekOffset}`}
            </h3>
            <button 
              onClick={() => changeWeek(1)} 
              disabled={weekOffset >= 0}
              className={`rounded bg-white/5 p-1 text-white/40 transition-colors ${weekOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 hover:text-white"}`}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest ml-7">DESEMPEÑO ({unidad})</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-3 rounded-full bg-white/20" />
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Proy.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-3 rounded-full bg-[#F25C05]" />
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Real</span>
          </div>
        </div>
      </div>

      <div className="h-[180px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis 
              dataKey="dia" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: "#4D4D4D", fontSize: 10, fontWeight: "bold" }}
              dy={10}
            />
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: "#4D4D4D", fontSize: 10 }}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 4", fill: "transparent" }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const avanceData = payload.find(p => p.dataKey === "real");
                  const proyectadoData = payload.find(p => p.dataKey === "proyectado");
                  
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#262626] p-3 shadow-2xl">
                      <p className="text-[10px] font-bold text-white/40 uppercase mb-2 border-b border-white/5 pb-1">{label}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-8">
                          <span className="text-[10px] font-bold text-[#F25C05] uppercase">Real</span>
                          <span className="text-sm font-bold text-[#F25C05]">{avanceData?.value != null ? `${avanceData.value} ${unidad}` : "0 " + unidad}</span>
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
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: "rgba(255, 255, 255, 0.2)" }}
            />
            <Line
              type="monotone"
              dataKey="real"
              stroke="#F25C05"
              strokeWidth={3}
              dot={{ r: 4, fill: "#F25C05", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#F25C05", stroke: "#1A1A1A", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
