"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, UserCheck, UserMinus, AlertTriangle, ShieldAlert } from "lucide-react";

type ParteRow = {
  proyecto_id: string;
  fecha: string;
  proyecto_nombre: string;
  total_programado: number;
  presentes: number;
  ausentes: number;
  incidentes: number;
  accidentes: number;
};

export function BitacoraCalendarView({ partes = [] }: { partes?: ParteRow[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Ajustar para que la semana empiece el Lunes (1) en lugar de Domingo (0)
  const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Agrupar partes por fecha local (YYYY-MM-DD)
  const partesByDate = partes.reduce((acc, p) => {
    if (!acc[p.fecha]) acc[p.fecha] = [];
    acc[p.fecha].push(p);
    return acc;
  }, {} as Record<string, ParteRow[]>);

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[120px] rounded-xl border border-transparent bg-transparent p-2"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayPartes = partesByDate[dateStr] || [];
    
    const isToday = dateStr === new Date().toISOString().split("T")[0];

    days.push(
      <div 
        key={dateStr} 
        className={`min-h-[120px] rounded-xl border p-3 flex flex-col gap-2 transition-colors ${
          isToday 
            ? "border-[#F25C05]/30 bg-[#F25C05]/5" 
            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold ${isToday ? "text-[#F25C05]" : "text-white/60"}`}>
            {d}
          </span>
          {dayPartes.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white">
              {dayPartes.length}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-1">
          {dayPartes.map((p) => {
            const hasAlerts = p.incidentes > 0 || p.accidentes > 0 || p.ausentes > 0;
            return (
              <Link 
                key={`${p.proyecto_id}-${p.fecha}`}
                href={`/proyectos/${p.proyecto_id}/parte/${p.fecha}`}
                className={`group flex flex-col rounded-lg border p-2 transition-all hover:scale-[1.02] ${
                  hasAlerts 
                    ? "border-amber-500/20 bg-amber-500/10 hover:border-amber-500/40" 
                    : "border-emerald-500/20 bg-emerald-500/10 hover:border-emerald-500/40"
                }`}
              >
                <p className="truncate text-[10px] font-bold text-white/90 group-hover:text-white">
                  {p.proyecto_nombre}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {p.presentes > 0 && <span className="flex items-center text-[9px] text-emerald-400 font-medium"><UserCheck className="w-3 h-3 mr-0.5"/> {p.presentes}</span>}
                    {p.ausentes > 0 && <span className="flex items-center text-[9px] text-orange-400 font-medium"><UserMinus className="w-3 h-3 mr-0.5"/> {p.ausentes}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {p.incidentes > 0 && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                    {p.accidentes > 0 && <ShieldAlert className="w-3 h-3 text-red-400" />}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#1A1A1A] p-4 shadow-xl">
        <h2 className="text-lg font-bold text-white uppercase tracking-widest">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            Hoy
          </button>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button onClick={prevMonth} className="bg-white/5 p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="w-[1px] bg-white/10" />
            <button onClick={nextMonth} className="bg-white/5 p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => (
          <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40 pb-2">
            {day}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
}
