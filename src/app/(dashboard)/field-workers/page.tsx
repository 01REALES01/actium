import { createClient } from "@/lib/supabase/server";
import { getEmpleadosAsignados } from "@/lib/data/sst";
import { listProyectos } from "@/lib/data/proyectos";
import { WorkersTable } from "@/components/workers/workers-table";
import { AlertCircle, Plus, Download } from "lucide-react";
import type { EmpleadoConDocumentos } from "@/lib/data/sst";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function FieldWorkersPage() {
  const supabase = createClient();

  // Cargar todos los proyectos accesibles para el usuario
  const proyectos = await listProyectos(supabase);

  // Cargar empleados de todos los proyectos activos en paralelo
  const empleadosPorProyecto = await Promise.all(
    proyectos.map(async (p) => ({
      proyecto: p,
      empleados: await getEmpleadosAsignados(supabase, p.id),
    }))
  );

  // Aplanar con info del proyecto adjunta
  type EmpleadoConProyecto = EmpleadoConDocumentos & { proyecto_nombre: string };
  const todosLosEmpleados: EmpleadoConProyecto[] = empleadosPorProyecto.flatMap(
    ({ proyecto, empleados }) =>
      empleados.map((e) => ({ ...e, proyecto_nombre: proyecto.nombre }))
  );

  // Deduplicar por empleado_id (un empleado puede estar en varios proyectos)
  const seen = new Set<string>();
  const empleadosUnicos = todosLosEmpleados.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // KPIs
  const totalActivos = empleadosUnicos.filter((e) => e.activo).length;

  // Alertas: empleados con algún doc expirado o por vencer en 30 días
  const hoy = new Date();
  const alertasVencimiento = empleadosUnicos.filter((e) =>
    e.documentos.some((d) => {
      if (!d.vigencia_hasta) return false;
      const diff = (new Date(d.vigencia_hasta).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
      return diff < 30;
    })
  );

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="text-center lg:text-left">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">
            Registro de Personal
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest max-w-2xl mx-auto lg:mx-0">
            Gestión de cumplimiento de certificaciones y despliegue en sitios industriales activos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none rounded-xl border border-white/5 bg-[#1A1A1A] p-4 sm:min-w-[140px] text-center sm:text-left">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Personal Activo</p>
              <p className="text-xl md:text-2xl font-bold text-white mt-1">{totalActivos.toLocaleString("es-CO")}</p>
            </div>
            <div className="flex-1 sm:flex-none rounded-xl border border-white/5 bg-[#1A1A1A] p-4 sm:min-w-[140px] text-center sm:text-left">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Alertas</p>
              <p className={`text-xl md:text-2xl font-bold mt-1 ${alertasVencimiento.length > 0 ? "text-amber-500" : "text-white"}`}>
                {alertasVencimiento.length}
              </p>
            </div>
          </div>
          <button className="flex h-12 md:h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#FF916E] px-6 text-xs font-bold text-[#1A1A1A] transition-all hover:bg-[#FF916E]/90">
            <Plus className="h-4 w-4" />
            Registrar Nuevo Trabajador
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-4 md:flex-row">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Proyecto:</label>
            <Select>
              <SelectTrigger className="h-10 border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Todos los Proyectos" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                <SelectItem value="all">Todos los Proyectos</SelectItem>
                {proyectos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Cargo:</label>
            <Select>
              <SelectTrigger className="h-10 border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Todos los Cargos" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                <SelectItem value="all">Todos los Cargos</SelectItem>
                {Array.from(new Set(empleadosUnicos.map((e) => e.cargo).filter(Boolean))).map((c) => (
                  <SelectItem key={c!} value={c!}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Cumplimiento:</label>
            <Select>
              <SelectTrigger className="h-10 border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Todos los Estados" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="ok">Al Día</SelectItem>
                <SelectItem value="warning">Por Vencer</SelectItem>
                <SelectItem value="expired">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="lg:mt-5">
          <button className="flex items-center gap-2 px-4 text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors">
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table Section */}
      <WorkersTable empleados={empleadosUnicos} proyectos={proyectos} />

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Compliance Alerts */}
        <div className="flex flex-col gap-6 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Alertas de Vencimiento</h3>
            <AlertCircle className={`h-5 w-5 ${alertasVencimiento.length > 0 ? "text-amber-500" : "text-white/10"}`} />
          </div>
          <div className="space-y-4">
            {alertasVencimiento.length === 0 ? (
              <p className="text-sm text-white/20 italic">Sin alertas activas.</p>
            ) : (
              alertasVencimiento.slice(0, 4).map((emp) => {
                const docsCriticos = emp.documentos.filter((d) => {
                  if (!d.vigencia_hasta) return false;
                  const diff = (new Date(d.vigencia_hasta).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
                  return diff < 30;
                });
                return (
                  <div key={emp.id} className="flex gap-4 border-l-2 border-amber-500/50 pl-4 py-1">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{emp.nombre}</p>
                      <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                        {docsCriticos.map((d) => d.tipo.replace("_", " ")).join(", ")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Personnel Allocation por proyecto */}
        <div className="flex flex-col gap-6 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Asignación por Proyecto</h3>
          <div className="space-y-5">
            {empleadosPorProyecto.slice(0, 3).map(({ proyecto, empleados }) => {
              const pct = totalActivos > 0 ? Math.round((empleados.length / totalActivos) * 100) : 0;
              return (
                <div key={proyecto.id}>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate max-w-[180px]">
                      {proyecto.nombre}
                    </p>
                    <p className="text-sm font-bold text-white ml-2 shrink-0">{empleados.length} pax</p>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {empleadosPorProyecto.length === 0 && (
              <p className="text-sm text-white/20 italic">Sin proyectos activos.</p>
            )}
          </div>
        </div>

        {/* Site Map View */}
        <div className="group relative flex flex-col justify-end gap-2 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl overflow-hidden min-h-[180px]">
          <div className="absolute inset-0 bg-[url('/images/gallery/tower.png')] bg-cover bg-center opacity-20 grayscale transition-all duration-500 group-hover:scale-110 group-hover:opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
          <div className="relative z-10">
            <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Vista de Mapa</h3>
            <p className="mt-1 text-[10px] text-white/30 leading-relaxed max-w-[200px]">
              Distribución geográfica de equipos de campo en proyectos activos.
            </p>
            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-3 text-[10px] font-bold text-white uppercase tracking-widest transition-all hover:bg-white/10">
              Iniciar Seguimiento GIS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
