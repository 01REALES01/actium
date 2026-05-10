"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DataPoint = {
  fecha: string;
  avance: number;
  proyectado: number;
};

type ProjectProgressChartProps = {
  data: DataPoint[];
};

export function ProjectProgressChart({ data }: ProjectProgressChartProps) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">Sin datos de avance registrados.</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis dataKey="fecha" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Line type="monotone" dataKey="proyectado" stroke="#94A3B8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avance" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
