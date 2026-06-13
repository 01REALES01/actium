"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertTriangle, UserMinus, ShieldCheck, X, ClipboardList, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type SSTEvent = {
  id: string;
  fecha: Date; // Usado para posicionarlo en el día exacto
  tipo: "ats" | "incidente" | "ausentismo" | "parte";
  titulo: string;
  subtitulo?: string;
  estado?: string;
  severidad?: string;
  href?: string; // Si está presente, el evento enlaza a su detalle (ej. parte diario)
};

export function SSTCalendar({ eventos }: { eventos: SSTEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Navegación de mes
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Cálculos de calendario
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Dom) - 6 (Sab)

  // Ajuste para que empiece en lunes (1) en vez de domingo (0)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  const blanks = Array.from({ length: startOffset }, (_, i) => i);

  // Obtener eventos para un día específico
  const getEventsForDate = (date: Date) => {
    return eventos.filter(
      (ev) =>
        ev.fecha.getDate() === date.getDate() &&
        ev.fecha.getMonth() === date.getMonth() &&
        ev.fecha.getFullYear() === date.getFullYear()
    );
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Vista de Calendario */}
      <div className="flex-1 rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">
              {currentDate.toLocaleString("es-CO", { month: "long" })} {year}
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Calendario de Eventos SST
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextMonth}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {blanks.map((b) => (
            <div key={`blank-${b}`} className="h-24 md:h-28 rounded-xl bg-transparent" />
          ))}

          {days.map((date) => {
            const dayEvents = getEventsForDate(date);
            const isToday =
              date.getDate() === new Date().getDate() &&
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();
            
            const isSelected = selectedDate && date.getTime() === selectedDate.getTime();

            return (
              <div
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "relative flex flex-col h-24 md:h-28 cursor-pointer rounded-xl border p-2 transition-all hover:bg-white/5",
                  isToday ? "border-orange-500/50 bg-orange-500/5" : "border-white/5 bg-white/[0.02]",
                  isSelected && "border-white/30 bg-white/10 ring-2 ring-white/10"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-bold",
                    isToday ? "text-orange-500" : "text-white/60"
                  )}
                >
                  {date.getDate()}
                </span>

                <div className="mt-auto flex flex-col gap-1 overflow-y-auto hide-scrollbar">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={cn(
                        "w-full truncate rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        ev.tipo === "ats" && "bg-green-500/20 text-green-400",
                        ev.tipo === "incidente" && "bg-red-500/20 text-red-400",
                        ev.tipo === "ausentismo" && "bg-orange-500/20 text-orange-400",
                        ev.tipo === "parte" && "bg-[#F25C05]/20 text-[#F28729]"
                      )}
                    >
                      {ev.tipo === "ats" ? "ATS" : ev.tipo === "incidente" ? "INC" : ev.tipo === "parte" ? "PARTE" : "AUS"}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest pl-1">
                      + {dayEvents.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle del Día Seleccionado */}
      {selectedDate && (
        <div className="w-full lg:w-96 shrink-0 rounded-2xl border border-white/10 bg-[#1A1A1A] shadow-2xl flex flex-col h-[500px] lg:h-auto">
          <div className="flex items-center justify-between border-b border-white/5 p-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                {selectedDate.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
              </h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">
                {selectedEvents.length} Eventos registrados
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {selectedEvents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-white/40">
                <ShieldCheck className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-xs uppercase tracking-widest font-bold">Sin Novedades</p>
                <p className="text-[10px]">No hay registros para esta fecha.</p>
              </div>
            ) : (
              selectedEvents.map((ev) => {
                const inner = (
                  <>
                    <div className="flex items-center gap-2">
                      {ev.tipo === "ats" && <ShieldCheck className="h-4 w-4 text-green-500" />}
                      {ev.tipo === "incidente" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {ev.tipo === "ausentismo" && <UserMinus className="h-4 w-4 text-orange-500" />}
                      {ev.tipo === "parte" && <ClipboardList className="h-4 w-4 text-[#F25C05]" />}

                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                        {ev.tipo}
                      </span>

                      {ev.severidad && (
                        <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-red-400">
                          {ev.severidad}
                        </span>
                      )}
                      {ev.estado && ev.tipo === "ats" && (
                        <span className="ml-auto rounded-full bg-green-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-green-400">
                          {ev.estado}
                        </span>
                      )}
                      {ev.href && (
                        <ArrowRight className="ml-auto h-4 w-4 text-[#F28729]" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{ev.titulo}</p>
                      {ev.subtitulo && (
                        <p className="mt-1 text-[10px] text-white/60">{ev.subtitulo}</p>
                      )}
                    </div>
                  </>
                );

                const cardClass = cn(
                  "flex flex-col gap-2 rounded-xl border p-4 transition-colors",
                  ev.tipo === "ats" && "border-green-500/20 bg-green-500/5",
                  ev.tipo === "incidente" && "border-red-500/20 bg-red-500/5",
                  ev.tipo === "ausentismo" && "border-orange-500/20 bg-orange-500/5",
                  ev.tipo === "parte" && "border-[#F25C05]/20 bg-[#F25C05]/5 hover:bg-[#F25C05]/10"
                );

                return ev.href ? (
                  <Link key={ev.id} href={ev.href} className={cardClass}>
                    {inner}
                  </Link>
                ) : (
                  <div key={ev.id} className={cardClass}>
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
