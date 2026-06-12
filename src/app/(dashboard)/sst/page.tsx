import Link from "next/link";
import {
  Plus,
  ShieldAlert,
  CheckCircle2,
  FileText,
  AlertTriangle,
  FileSignature,
  List,
  CalendarDays,
  UserMinus,
  Flame,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listFormularios } from "@/lib/data/sst";
import { listProyectos } from "@/lib/data/proyectos";
import { Badge } from "@/components/ui/badge";
import { SSTFilters } from "@/components/sst/sst-filters";

export default async function SstDashboardPage({
  searchParams,
}: {
  searchParams?: { tipo?: string; estado?: string };
}) {
  const supabase = createClient();

  // Filtros desde query params
  const filtros: { tipo?: any; estado?: any } = {};
  if (searchParams?.tipo && searchParams.tipo !== "todos") filtros.tipo = searchParams.tipo;
  if (searchParams?.estado && searchParams.estado !== "todos") filtros.estado = searchParams.estado;

  const [formularios, proyectos] = await Promise.all([
    listFormularios(supabase, filtros),
    listProyectos(supabase),
  ]);

  // KPIs consolidados — contar todos los incidentes y ausentismos a nivel global
  const [
    { count: totalIncidentes },
    { count: totalAccidentesGraves },
    { count: totalAusentismosActivos },
  ] = await Promise.all([
    supabase.from("incidentes").select("*", { count: "exact", head: true }),
    supabase
      .from("incidentes")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "accidente")
      .in("severidad", ["grave", "critico"]),
    supabase
      .from("ausentismos")
      .select("*", { count: "exact", head: true })
      .lte("fecha_inicio", new Date().toISOString().split("T")[0])
      .gte("fecha_fin", new Date().toISOString().split("T")[0]),
  ]);

  // Mapa de proyectos para nombres rápidos
  const proyectosMap = new Map(proyectos.map((p) => [p.id, p.nombre]));

  const tipoIcon: Record<string, React.ReactNode> = {
    ats: <ShieldAlert className="h-4 w-4 text-[#F25C05]" />,
    permiso_altura: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    permiso_caliente: <Flame className="h-4 w-4 text-red-500" />,
  };

  const tipoLabel: Record<string, string> = {
    ats: "ATS",
    permiso_altura: "Alturas",
    permiso_caliente: "Caliente",
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="text-center lg:text-left">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">
            Gestión SST
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest max-w-2xl mx-auto lg:mx-0">
            Control de permisos de trabajo, análisis de seguridad y registros digitales en campo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 lg:mt-0">
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 w-fit hidden lg:flex mr-4">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg">
              <List className="h-4 w-4 text-orange-500" />
              <span className="hidden sm:inline">Historial</span>
            </div>
            <Link
              href="/sst/calendario"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </Link>
          </div>

          <Link 
            href="/sst/nuevo-ats"
            className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#F25C05] px-6 text-xs font-bold text-white transition-all hover:bg-[#F25C05]/90"
          >
            <ShieldAlert className="h-4 w-4" />
            Crear Análisis (ATS)
          </Link>
          <div className="relative group">
            <button className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 text-xs font-bold text-white/30 transition-all cursor-not-allowed">
              <Lock className="h-3.5 w-3.5" />
              Permiso en Alturas
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1A1A1A] border border-white/10 rounded-lg text-[10px] text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
              Próximamente disponible
            </div>
          </div>
        </div>
      </div>

      <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 w-fit lg:hidden mb-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg">
          <List className="h-4 w-4 text-orange-500" />
          <span className="hidden sm:inline">Historial</span>
        </div>
        <Link
          href="/sst/calendario"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Calendario</span>
        </Link>
      </div>

      {/* KPI Cards — Ahora con métricas SST reales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-2xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F25C05]/10 shrink-0">
            <FileSignature className="h-5 w-5 text-[#F25C05]" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Total Formularios</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {formularios.length}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-2xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Completados</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {formularios.filter(f => f.estado === 'completado' || f.estado === 'firmado').length}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-2xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Incidentes</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {totalIncidentes ?? 0}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-2xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 shrink-0">
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Accidentes Graves</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {totalAccidentesGraves ?? 0}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-2xl flex items-center gap-4 col-span-2 md:col-span-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 shrink-0">
            <UserMinus className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ausentes Hoy</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {totalAusentismosActivos ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
            Historial de Registros
          </h3>
          <SSTFilters
            currentTipo={searchParams?.tipo || "todos"}
            currentEstado={searchParams?.estado || "todos"}
          />
        </div>
        
        {formularios.length === 0 ? (
          <div className="py-12 text-center border-t border-white/5">
            <FileText className="mx-auto h-8 w-8 text-white/20 mb-3" />
            <p className="text-sm text-white/40 font-medium">
              {searchParams?.tipo || searchParams?.estado
                ? "No hay formularios que coincidan con los filtros."
                : "Aún no hay formularios registrados."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">ID / Fecha</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Tipo</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Proyecto</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Ubicación</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {formularios.map((form) => (
                  <tr key={form.id} className="transition-colors hover:bg-white/[0.03] group">
                    <td className="py-4">
                      <Link href={`/sst/${form.id}`} className="block">
                        <p className="text-xs font-bold text-white group-hover:text-[#F25C05] transition-colors">
                          {new Date(form.created_at).toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mt-1">
                          {form.id.split('-')[0]}
                        </p>
                      </Link>
                    </td>
                    <td className="py-4">
                      <Link href={`/sst/${form.id}`} className="flex items-center gap-2">
                        {tipoIcon[form.tipo] || <FileText className="h-4 w-4 text-white/40" />}
                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                          {tipoLabel[form.tipo] || form.tipo}
                        </span>
                      </Link>
                    </td>
                    <td className="py-4">
                      <Link href={`/sst/${form.id}`} className="block">
                        <p className="text-sm text-white/80 max-w-[200px] truncate">
                          {proyectosMap.get(form.proyecto_id) || "Desconocido"}
                        </p>
                      </Link>
                    </td>
                    <td className="py-4">
                      <Link href={`/sst/${form.id}`} className="block">
                        <p className="text-xs text-white/60">{form.ubicacion || form.ciudad || "—"}</p>
                      </Link>
                    </td>
                    <td className="py-4 text-center">
                      <Link href={`/sst/${form.id}`} className="block">
                        <Badge 
                          variant="outline" 
                          className={`px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border ${
                            form.estado === 'completado' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                            form.estado === 'firmado' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                            form.estado === 'borrador' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                            'border-white/10 bg-white/5 text-white/40'
                          }`}
                        >
                          {form.estado}
                        </Badge>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
