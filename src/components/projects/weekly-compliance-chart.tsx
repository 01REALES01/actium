"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

type WeeklyProgressData = {
  dia: string;
  proyectado: number;
  real: number;
};

interface WeeklyComplianceChartProps {
  data: WeeklyProgressData[];
}

export function WeeklyComplianceChart({ data }: WeeklyComplianceChartProps) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
          DESEMPEÑO SEMANAL (MT)
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-3 rounded-full bg-white/20" />
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Proy.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-3 rounded-full bg-orange-500" />
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
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#262626] p-3 shadow-2xl">
                      <p className="text-[10px] font-bold text-white/40 uppercase mb-2 border-b border-white/5 pb-1">{label}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-8">
                          <span className="text-[10px] font-bold text-white/40 uppercase">Real</span>
                          <span className="text-sm font-bold text-orange-500">{payload[1]?.value} MT</span>
                        </div>
                        <div className="flex items-center justify-between gap-8">
                          <span className="text-[10px] font-bold text-white/40 uppercase">Proyectado</span>
                          <span className="text-sm font-bold text-white/60">{payload[0]?.value} MT</span>
                        </div>
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
              stroke="#FF916E"
              strokeWidth={3}
              dot={{ r: 4, fill: "#FF916E", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#FF916E", stroke: "#1A1A1A", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
