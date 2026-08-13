import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listEmpleados, listEmpleadosArchivados } from "@/lib/data/sst";
import { listProyectos } from "@/lib/data/proyectos";
import { listEmpresas, listSubempresas } from "@/lib/data/organizacion";
import { getPerfilActual, esSuperAdmin } from "@/lib/auth/roles";
import { WorkersTable } from "@/components/workers/workers-table";
import { AlertCircle, Plus, Download } from "lucide-react";
import { WorkerFormModal } from "@/components/workers/worker-form-modal";
import { EmpleadosArchivadosSection } from "@/components/workers/empleados-archivados-section";

import { FieldWorkersFilters } from "@/components/workers/field-workers-filters";

export default async function FieldWorkersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = createClient();

  const [todosLosEmpleados, proyectos, perfil, empresas, subempresas] = await Promise.all([
    listEmpleados(supabase),
    listProyectos(supabase),
    getPerfilActual(supabase),
    listEmpresas(supabase),
    listSubempresas(supabase),
  ]);

  const empresaFija = perfil?.rol === "super_admin" ? null : perfil?.empresa_id ?? null;
  const puedeEditar = esSuperAdmin(perfil?.rol);

  const archivados = puedeEditar ? await listEmpleadosArchivados(createAdminClient()) : [];

  // KPIs (sobre personal activo, como antes)
  const empleadosActivos = todosLosEmpleados.filter((e) => e.activo);
  const totalActivos = empleadosActivos.length;

  // Alertas: empleados activos con algún doc expirado o por vencer en 30 días
  const hoy = new Date();
  const alertasVencimiento = empleadosActivos.filter((e) =>
    e.documentos.some((d) => {
      if (!d.vigencia_hasta) return false;
      const diff = (new Date(d.vigencia_hasta).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
      return diff < 30;
    })
  );

  // Filtrado
  let empleadosFiltrados = todosLosEmpleados;
  const proyectoFilter = searchParams.proyecto as string | undefined;
  const cargoFilter = searchParams.cargo as string | undefined;
  const statusFilter = searchParams.status as string | undefined;
  const laboralFilter = (searchParams.laboral as string | undefined) ?? "activos";

  if (laboralFilter === "activos") {
    empleadosFiltrados = empleadosFiltrados.filter((e) => e.activo);
  } else if (laboralFilter === "inactivos") {
    empleadosFiltrados = empleadosFiltrados.filter((e) => !e.activo);
  }

  if (proyectoFilter && proyectoFilter !== "all") {
    empleadosFiltrados = empleadosFiltrados.filter((e) =>
      e.proyectos.some((p) => p.id === proyectoFilter)
    );
  }

  if (cargoFilter && cargoFilter !== "all") {
    empleadosFiltrados = empleadosFiltrados.filter((e) => e.cargo === cargoFilter);
  }

  if (statusFilter && statusFilter !== "all") {
    empleadosFiltrados = empleadosFiltrados.filter(emp => {
      let hasExpired = false;
      let hasWarning = false;
      for (const doc of emp.documentos) {
        if (!doc.vigencia_hasta) continue;
        const diff = (new Date(doc.vigencia_hasta).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
        if (diff < 0) { hasExpired = true; break; }
        if (diff < 30) hasWarning = true;
      }
      const status = hasExpired ? "expired" : hasWarning ? "warning" : "ok";
      return status === statusFilter;
    });
  }

  const cargosDisponibles = Array.from(new Set(todosLosEmpleados.map((e) => e.cargo).filter(Boolean))) as string[];

  // Asignación por proyecto (para la tarjeta inferior), sobre personal activo
  const asignacionPorProyecto = proyectos
    .map((p) => ({
      proyecto: p,
      cantidad: empleadosActivos.filter((e) => e.proyectos.some((ep) => ep.id === p.id)).length,
    }))
    .filter((p) => p.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad);

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
            <div className="flex-1 sm:flex-none rounded-2xl border-0 bg-white/[0.02] p-5 sm:min-w-[140px] text-center sm:text-left relative overflow-hidden backdrop-blur-md group shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest relative z-10">Personal Activo</p>
              <p className="text-xl md:text-2xl font-bold text-white mt-1 relative z-10">{totalActivos.toLocaleString("es-CO")}</p>
            </div>
            <div className="flex-1 sm:flex-none rounded-2xl border-0 bg-white/[0.02] p-5 sm:min-w-[140px] text-center sm:text-left relative overflow-hidden backdrop-blur-md group shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff4500]/5 to-transparent pointer-events-none" />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest relative z-10">Alertas</p>
              <p className={`text-xl md:text-2xl font-bold mt-1 relative z-10 ${alertasVencimiento.length > 0 ? "text-[#ff4500]" : "text-white"}`}>
                {alertasVencimiento.length}
              </p>
            </div>
          </div>
          {puedeEditar && (
            <WorkerFormModal
              modo="crear"
              proyectos={proyectos}
              empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
              subempresas={subempresas.map((s) => ({
                id: s.id,
                nombre: s.nombre,
                empresa_id: s.empresa_id,
              }))}
              empresaFija={empresaFija}
            />
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <FieldWorkersFilters proyectos={proyectos} cargos={cargosDisponibles} />

      {/* Table Section */}
      <WorkersTable
        empleados={empleadosFiltrados}
        proyectos={proyectos}
        empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        subempresas={subempresas.map((s) => ({ id: s.id, nombre: s.nombre, empresa_id: s.empresa_id }))}
        puedeEditar={puedeEditar}
      />

      {puedeEditar && (
        <EmpleadosArchivadosSection
          archivados={archivados.map((e) => ({
            id: e.id,
            nombre: e.nombre,
            cedula: e.cedula,
            deleted_at: e.deleted_at,
          }))}
        />
      )}

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Compliance Alerts */}
        <div className="flex flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff4500]/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Alertas de Vencimiento</h3>
            <AlertCircle className={`h-5 w-5 ${alertasVencimiento.length > 0 ? "text-[#ff4500]" : "text-white/10"}`} />
          </div>
          <div className="relative z-10 space-y-4">
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
                  <div key={emp.id} className="flex gap-4 border-l-2 border-[#ff4500]/50 pl-4 py-1">
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
        <div className="flex flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl group">
          <div className="absolute inset-0 bg-gradient-to-bl from-white/[0.01] to-transparent pointer-events-none" />
          <h3 className="relative z-10 text-xs font-bold tracking-widest text-white/50 uppercase">Asignación por Proyecto</h3>
          <div className="relative z-10 space-y-5">
            {asignacionPorProyecto.slice(0, 3).map(({ proyecto, cantidad }) => {
              const pct = totalActivos > 0 ? Math.round((cantidad / totalActivos) * 100) : 0;
              return (
                <div key={proyecto.id}>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate max-w-[180px]">
                      {proyecto.nombre}
                    </p>
                    <p className="text-sm font-bold text-white ml-2 shrink-0">{cantidad} pax</p>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff4500] rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {asignacionPorProyecto.length === 0 && (
              <p className="text-sm text-white/20 italic">Sin proyectos activos.</p>
            )}
          </div>
        </div>

        {/* Site Map View */}
        <div className="group relative flex flex-col justify-end gap-2 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl overflow-hidden min-h-[220px]">
          <div className="absolute inset-0 bg-[url('/images/gallery/tower.png')] bg-cover bg-center opacity-20 grayscale transition-all duration-700 group-hover:scale-110 group-hover:opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/80 to-transparent" />
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
