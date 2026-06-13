import { createClient } from "@/lib/supabase/server";
import { SSTCalendar, SSTEvent } from "@/components/sst/sst-calendar";
import { listPartes } from "@/lib/data/partes-sst";
import { CalendarDays, List, ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function SSTCalendarioPage() {
  const supabase = createClient();

  // Recuperar todos los formularios (ATS), incidentes, ausentismos y partes diarios.
  // En un sistema en producción se filtraría por empresa y por rango de fechas (mes actual).
  const [ formRes, incRes, ausRes, partes ] = await Promise.all([
    supabase.from("formularios").select("id, tipo, estado, fecha_inicio, area, ubicacion"),
    supabase.from("incidentes").select("id, tipo, severidad, fecha, descripcion, proyecto_id"),
    supabase.from("ausentismos").select(`
      id, tipo, fecha_inicio, fecha_fin, razon,
      empleados:empleado_id ( nombre )
    `),
    listPartes(supabase),
  ]);

  const formularios = (formRes.data ?? []) as { id: string; tipo: string; estado: string; fecha_inicio: string | null; area: string | null; ubicacion: string | null }[];
  const incidentes = (incRes.data ?? []) as { id: string; tipo: string; severidad: string; fecha: string; descripcion: string; proyecto_id: string }[];
  const ausentismos = (ausRes.data ?? []) as any[];

  const eventos: SSTEvent[] = [];

  // Mapear Partes diarios (enlazan a su detalle con descarga de PDF)
  partes.forEach((p) => {
    eventos.push({
      id: `parte-${p.proyecto_id}-${p.fecha}`,
      fecha: new Date(`${p.fecha}T12:00:00`),
      tipo: "parte",
      titulo: `${p.proyecto_nombre}`,
      subtitulo: `${p.presentes}/${p.total_programado} presentes · ${p.ausentes} ausentes`,
      href: `/sst/bitacora/${p.proyecto_id}/${p.fecha}`,
    });
  });

  // Mapear Formularios
  if (formularios) {
    formularios.forEach((f) => {
      if (f.fecha_inicio) {
        eventos.push({
          id: `form-${f.id}`,
          fecha: new Date(`${f.fecha_inicio}T12:00:00`), // Evita desfase horario
          tipo: "ats",
          titulo: `Permiso ${f.tipo.toUpperCase()}`,
          subtitulo: `${f.ubicacion} - ${f.area}`,
          estado: f.estado,
        });
      }
    });
  }

  // Mapear Incidentes
  if (incidentes) {
    incidentes.forEach((i) => {
      if (i.fecha) {
        eventos.push({
          id: `inc-${i.id}`,
          fecha: new Date(i.fecha),
          tipo: "incidente",
          titulo: i.tipo.replace("_", " ").toUpperCase(),
          subtitulo: i.descripcion || "Sin detalles",
          severidad: i.severidad,
        });
      }
    });
  }

  // Mapear Ausentismos (Puede expandirse para cada día del rango, pero aquí marcaremos el día de inicio)
  if (ausentismos) {
    ausentismos.forEach((a: any) => {
      if (a.fecha_inicio) {
        eventos.push({
          id: `aus-${a.id}`,
          fecha: new Date(`${a.fecha_inicio}T12:00:00`),
          tipo: "ausentismo",
          titulo: `Ausencia: ${a.tipo}`,
          subtitulo: `${a.empleados?.nombre} - ${a.razon}`,
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header & Navegación de Vistas */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white uppercase flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-orange-500" />
            Calendario SST
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            Visión global de eventos y permisos
          </p>
        </div>

        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
          <Link
            href="/sst"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Permisos</span>
          </Link>
          <Link
            href="/sst/bitacora"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Bitácora</span>
          </Link>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg">
            <CalendarDays className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">Calendario</span>
          </div>
        </div>
      </div>

      <SSTCalendar eventos={eventos} />
    </div>
  );
}
