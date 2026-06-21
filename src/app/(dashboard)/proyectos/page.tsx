import Link from "next/link";
import { CalendarDays, Plus, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { listProyectos } from "@/lib/data/proyectos";
import { getPerfilActual, puedeGestionarProyectos } from "@/lib/auth/roles";
import type { ProyectoEstado } from "@/types/database.types";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function estadoVariant(estado: ProyectoEstado | null | undefined) {
  if (estado === "cancelado") return "destructive";
  if (estado === "pausado") return "warning";
  if (estado === "completado") return "success";
  if (estado === "en_curso") return "info";
  return "default";
}

export default async function ProyectosPage() {
  const supabase = createClient();
  let proyectos: Awaited<ReturnType<typeof listProyectos>> = [];
  let errorMessage: string | null = null;

  const perfil = await getPerfilActual(supabase);
  const puedeCrear = puedeGestionarProyectos(perfil?.rol);

  try {
    proyectos = await listProyectos(supabase);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "No se pudieron cargar los proyectos.";
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white uppercase">Proyectos</h1>
          <p className="mt-3 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest max-w-2xl">
            Centro de control de infraestructura y obras
          </p>
        </div>
        {puedeCrear ? (
          <Link
            href="/proyectos/nuevo"
            className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-[#ff4500] px-6 text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-[#ff4500]/90 hover:shadow-[#ff4500]/20"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" strokeWidth={2} />
            Nuevo Proyecto
          </Link>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 shadow-2xl">
          <p className="text-sm font-medium text-red-500">{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {proyectos.map((proyecto) => (
          <Link key={proyecto.id} href={`/proyectos/${proyecto.id}`} className="group relative block overflow-hidden rounded-2xl border border-white/5 bg-[#1A1A1A] p-6 transition-all hover:-translate-y-1 hover:border-[#ff4500]/50 hover:shadow-2xl hover:shadow-[#ff4500]/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff4500]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            
            <div className="relative z-10 mb-6 flex items-start justify-between gap-4">
              <div>
                <Badge 
                  variant="outline" 
                  className={`mb-3 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border ${
                    proyecto.estado === 'completado' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                    proyecto.estado === 'en_curso' ? 'border-[#ff4500]/30 bg-[#ff4500]/10 text-[#ff4500]' :
                    proyecto.estado === 'pausado' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                    'border-white/10 bg-white/5 text-white/40'
                  }`}
                >
                  {proyecto.estado === "en_curso" ? "En curso" : proyecto.estado}
                </Badge>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white group-hover:text-[#ff4500] transition-colors">{proyecto.nombre}</h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/30">{proyecto.codigo}</p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <CalendarDays className="h-3.5 w-3.5 text-white/40" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Inicio</p>
                  <p className="text-xs font-medium text-white/80">{formatDate(proyecto.fecha_inicio)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <CalendarDays className="h-3.5 w-3.5 text-white/20" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Fin Proyectado</p>
                  <p className="text-xs font-medium text-white/60">{formatDate(proyecto.fecha_fin_proyectada)}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!errorMessage && proyectos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#1A1A1A] py-24 shadow-2xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4">
            <FolderKanban className="h-8 w-8 text-white/20" />
          </div>
          <p className="text-sm font-medium text-white/40 uppercase tracking-widest">Aún no hay proyectos</p>
        </div>
      ) : null}
    </div>
  );
}
