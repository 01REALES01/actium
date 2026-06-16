"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  AlertTriangle,
  UserMinus,
  ClipboardList,
  CalendarRange,
  FileClock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEventDTO } from "@/lib/data/calendario";

type Tipo = CalendarEventDTO["tipo"];

// Color del punto indicador por tipo de evento.
const DOT_COLOR: Record<Tipo, string> = {
  parte: "bg-[#F25C05]",
  ats: "bg-success",
  incidente: "bg-danger",
  ausentismo: "bg-warning",
  proyecto: "bg-info",
  vencimiento: "bg-warning",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function EventIcon({ tipo }: { tipo: Tipo }) {
  switch (tipo) {
    case "ats":
      return <ShieldCheck className="h-3.5 w-3.5 text-success" />;
    case "incidente":
      return <AlertTriangle className="h-3.5 w-3.5 text-danger" />;
    case "ausentismo":
      return <UserMinus className="h-3.5 w-3.5 text-warning" />;
    case "parte":
      return <ClipboardList className="h-3.5 w-3.5 text-[#F25C05]" />;
    case "proyecto":
      return <CalendarRange className="h-3.5 w-3.5 text-info" />;
    case "vencimiento":
      return <FileClock className="h-3.5 w-3.5 text-warning" />;
  }
}

export function SidebarCalendar() {
  const pathname = usePathname();
  const router = useRouter();

  // Detección de contexto de proyecto para usar el calendario como selector de fecha.
  const proyectoMatch = pathname.match(/^\/proyectos\/([^/]+)/);
  const contextProjectId = proyectoMatch?.[1] ?? null;
  const fechaMatch = pathname.match(/\/parte\/(\d{4}-\d{2}-\d{2})/);
  const contextFecha = fechaMatch?.[1] ?? null;

  const [cursor, setCursor] = useState(() => {
    // Si hay una fecha activa de contexto, iniciar en ese mes.
    if (contextFecha) {
      const d = new Date(`${contextFecha}T12:00:00`);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [eventos, setEventos] = useState<CalendarEventDTO[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const fetchMes = useCallback(async () => {
    const desde = ymd(new Date(year, month, 1));
    const hasta = ymd(new Date(year, month + 1, 0));
    setLoading(true);
    try {
      const res = await fetch(`/api/calendario?desde=${desde}&hasta=${hasta}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setEventos([]);
        return;
      }
      const json = (await res.json()) as { eventos: CalendarEventDTO[] };
      setEventos(json.eventos ?? []);
    } catch {
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMes();
    setSelectedDay(null);
  }, [fetchMes]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Dom
  const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1; // semana inicia lunes

  const eventosPorDia = eventos.reduce<Record<string, CalendarEventDTO[]>>((acc, ev) => {
    (acc[ev.fecha] ??= []).push(ev);
    return acc;
  }, {});

  const hoy = ymd(new Date());
  const selectedEvents = selectedDay ? eventosPorDia[selectedDay] ?? [] : [];

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      {/* Encabezado */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-orange-500" strokeWidth={2} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">
            {cursor.toLocaleString("es-CO", { month: "long" })} {year}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            aria-label="Mes anterior"
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            aria-label="Mes siguiente"
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cabecera de días */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div
            key={i}
            className="text-center text-[9px] font-bold uppercase text-white/30"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grilla del mes */}
      <div className={cn("grid grid-cols-7 gap-0.5", loading && "opacity-50")}>
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dia = i + 1;
          const key = `${year}-${pad(month + 1)}-${pad(dia)}`;
          const dayEvents = eventosPorDia[key] ?? [];
          const isToday = key === hoy;
          const isSelected = key === selectedDay;
          const isContextDate = !isToday && key === contextFecha;
          const tiposUnicos = Array.from(new Set(dayEvents.map((e) => e.tipo))).slice(0, 3);

          return (
            <button
              key={key}
              onClick={() => {
                if (contextProjectId) {
                  router.push(`/proyectos/${contextProjectId}/parte/${key}`);
                } else {
                  setSelectedDay(isSelected ? null : key);
                }
              }}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-md text-[11px] transition-colors",
                isToday ? "font-bold text-orange-500" : "text-white/60",
                isContextDate && "ring-1 ring-[#F25C05]/50",
                isSelected ? "bg-white/15" : "hover:bg-white/5",
              )}
            >
              <span>{dia}</span>
              {tiposUnicos.length > 0 && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {tiposUnicos.map((t) => (
                    <span key={t} className={cn("h-1 w-1 rounded-full", DOT_COLOR[t])} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel de detalle del día seleccionado (solo en modo global, no en contexto de proyecto) */}
      {selectedDay && !contextProjectId && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
              })}{" "}
              · {selectedEvents.length}
            </span>
            <button
              onClick={() => setSelectedDay(null)}
              aria-label="Cerrar detalle"
              className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="py-2 text-center text-[10px] text-white/30">
              Sin eventos para esta fecha.
            </p>
          ) : (
            <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
              {selectedEvents.map((ev) => {
                const inner = (
                  <>
                    <div className="mt-0.5 shrink-0">
                      <EventIcon tipo={ev.tipo} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-white">{ev.titulo}</p>
                      {ev.subtitulo && (
                        <p className="truncate text-[10px] text-white/50">{ev.subtitulo}</p>
                      )}
                    </div>
                    {ev.href && <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />}
                  </>
                );
                const clase =
                  "flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.03] p-2";
                return ev.href ? (
                  <Link key={ev.id} href={ev.href} className={cn(clase, "hover:bg-white/[0.06]")}>
                    {inner}
                  </Link>
                ) : (
                  <div key={ev.id} className={clase}>
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
