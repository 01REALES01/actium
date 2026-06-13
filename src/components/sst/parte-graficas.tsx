"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie } from "recharts";

const GREEN = "#16A34A";
const ORANGE = "#F25C05";
const AMBER = "#F28729";
const RED = "#DC2626";

export function GraficaAsistencia({ presentes, ausentes }: { presentes: number; ausentes: number }) {
  const data = [
    { name: "PRESENTES", valor: presentes, color: GREEN },
    { name: "AUSENTES", valor: ausentes, color: ORANGE },
  ];
  const total = presentes + ausentes;
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Asistencia a operación</h3>
        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
          {pct}% asistencia
        </span>
      </div>
      <div className="mt-2 h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 20, left: 20, bottom: 20 }} barSize={60}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#6B6B6B", fontSize: 10, fontWeight: "bold" }} dy={10} />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={({ active, payload }) =>
                active && payload && payload.length ? (
                  <div className="rounded-lg border border-white/10 bg-[#262626] p-3 shadow-2xl">
                    <p className="mb-1 text-[10px] font-bold uppercase text-white/40">{payload[0].payload.name}</p>
                    <p className="text-xl font-bold text-white">{payload[0].value}</p>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="valor" radius={[12, 12, 12, 12]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GraficaEventos({ incidentes, accidentes }: { incidentes: number; accidentes: number }) {
  const total = incidentes + accidentes;
  const data = [
    { name: "Incidentes", value: incidentes, color: AMBER },
    { name: "Accidentes", value: accidentes, color: RED },
  ];

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
      <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Eventos del día</h3>
      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p className="text-3xl font-bold text-emerald-500">0</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">Sin eventos registrados</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-[150px] w-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-3">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded" style={{ backgroundColor: d.color }} />
                <span className="text-sm font-bold text-white">{d.value}</span>
                <span className="text-[11px] uppercase tracking-widest text-white/40">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
