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

const CHART_COLORS = {
  primary: "#F25C05",
  tertiary: "#8C470B",
  axis: "#6B6B6B",
};

export function ProjectProgressChart({ data }: ProjectProgressChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-sm text-[--text-muted]">
        Sin datos de avance registrados.
      </p>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
          />
          <Tooltip
            formatter={(v) => `${v}%`}
            contentStyle={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              color: "var(--text-primary)",
            }}
          />
          <Line type="monotone" dataKey="proyectado" stroke={CHART_COLORS.tertiary} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avance" stroke={CHART_COLORS.primary} strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
