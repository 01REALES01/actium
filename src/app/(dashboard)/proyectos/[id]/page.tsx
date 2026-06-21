import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ClipboardList, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerfilActual, puedeGestionarProyectos, puedeEditarParteDiario } from "@/lib/auth/roles";
import { getProyecto, getProyectoAvances, getObservaciones, getFotos } from "@/lib/data/proyectos";
import {
  getSSTStats,
  getEmpleadosAsignados,
  getAusentismosHistorial,
  getIncidentesPorProyecto,
  getAvancesSemanaActual,
  getAvanceHoy,
} from "@/lib/data/sst";
import { getParteDelDia, listPartes } from "@/lib/data/partes-sst";
import { hoyLocal } from "@/lib/fecha";
import { SSTCard } from "@/components/projects/sst-card";
import { ProjectProgressChart } from "@/components/projects/project-progress-chart";
import { DailyProgressChart } from "@/components/projects/daily-progress-chart";
import { WeeklyComplianceChart } from "@/components/projects/weekly-compliance-chart";
import { PhotoGallery } from "@/components/projects/photo-gallery";
import { ObservationsSection } from "@/components/projects/observations-section";

type ProjectPageProps = {
  params: { id: string };
};

function EmptyPanel({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col rounded-3xl border-0 bg-white/[0.02] p-8 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50 relative z-10">{titulo}</h3>
      <div className="flex flex-1 flex-col items-center justify-center text-center relative z-10">
        <p className="text-sm font-medium text-white/30 uppercase tracking-widest">{mensaje}</p>
      </div>
    </div>
  );
}

export default async function ProyectoDashboardPage({ params }: ProjectPageProps) {
  const supabase = createClient();

  const hoy = hoyLocal();

  // Las LECTURAS de SST/avances/fotos/observaciones van por el cliente admin:
  // esas tablas tienen RLS activo y la función auth_rol() del proyecto está rota,
  // por lo que con el cliente de sesión devuelven vacío sin error. El perfil
  // (identidad) sí se lee con el cliente de sesión.
  const db = createAdminClient();

  const [
    proyecto,
    avances,
    sstStats,
    empleados,
    ausentismos,
    incidentes,
    accidentes,
    avancesSemana,
    avanceHoy,
    observaciones,
    fotos,
    perfil,
    parteHoy,
    historialPartes,
  ] = await Promise.all([
    getProyecto(db, params.id),
    getProyectoAvances(db, params.id),
    getSSTStats(db, params.id),
    getEmpleadosAsignados(db, params.id),
    getAusentismosHistorial(db, params.id),
    getIncidentesPorProyecto(db, params.id, "incidente"),
    getIncidentesPorProyecto(db, params.id, "accidente"),
    getAvancesSemanaActual(db, params.id),
    getAvanceHoy(db, params.id),
    getObservaciones(db, params.id),
    getFotos(db, params.id),
    getPerfilActual(supabase),
    getParteDelDia(db, params.id, hoy),
    listPartes(db, { proyectoId: params.id }),
  ]);

  if (!proyecto) notFound();

  const puedeEditar = puedeGestionarProyectos(perfil?.rol);

  const chartData = avances.map((a) => ({
    fecha: new Date(a.fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
    }),
    avance: Number(a.avance_real),
    proyectado: Number(a.avance_proyectado),
  }));

  const accidentesHoy = parteHoy ? parteHoy.incidentes.filter((e) => e.tipo === "accidente").length : 0;
  const incidentesHoy = parteHoy ? parteHoy.incidentes.filter((e) => e.tipo !== "accidente").length : 0;

  // Presentes hoy = asignados que NO tienen inasistencia registrada hoy.
  const ausentesHoyIds = new Set((parteHoy?.inasistencias ?? []).map((i) => i.empleado_id));
  const empleadosEnOperacion = empleados.filter((e) => !ausentesHoyIds.has(e.id));

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* Fondo sutil con ruido visual */}
      <div className="pointer-events-none fixed inset-0 z-[-1] opacity-20" style={{ backgroundImage: "url('https://grainy-gradients.core.s3.amazonaws.com/noise.svg')", mixBlendMode: "overlay" }} />
      
      {/* Header */}
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between rounded-3xl border border-white/5 bg-[#1A1A1A] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-[#ff4500]/10 to-transparent opacity-50" />
        <div className="text-center md:text-left relative z-10 flex-1 min-w-0 pr-0 md:pr-8">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-white md:text-6xl break-words">
              {proyecto.nombre}
            </h1>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/40 shrink-0 mt-2 md:mt-0">
              #{proyecto.codigo}
            </span>
          </div>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-widest text-white/40 md:text-sm truncate md:whitespace-normal">
            {proyecto.descripcion ?? proyecto.ubicacion ?? "Infraestructura Metalmecánica"}
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row w-full shrink-0 md:w-auto mt-4 md:mt-0 gap-3">
          <Link
            href={`/proyectos/${proyecto.id}/parte/${hoy}`}
            className="group flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-[#ff4500] px-6 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-[#ff4500]/90 hover:shadow-[#ff4500]/20"
          >
            <ClipboardList className="h-4 w-4 transition-transform group-hover:scale-110" />
            Parte de Hoy
          </Link>
          <Link
            href={`/sst/bitacora`}
            className="group flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
          >
            <Calendar className="h-4 w-4 text-white/50 transition-colors group-hover:text-white" />
            Bitácora
          </Link>
        </div>
      </div>

      {/* KPIs SST + Gráfica histórica */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <SSTCard
            stats={sstStats}
            proyectoId={proyecto.id}
            fecha={hoy}
            parteExiste={Boolean(parteHoy?.parte)}
            presentesHoy={parteHoy?.presentes ?? sstStats.enOperacion}
            incidentesHoyCount={incidentesHoy}
            accidentesHoyCount={accidentesHoy}
            proyectoNombre={proyecto.nombre}
            empleados={empleados}
            empleadosEnOperacion={empleadosEnOperacion}
            ausentismos={ausentismos}
            incidentes={incidentes}
            accidentes={accidentes}
            puedeEditarParte={puedeEditarParteDiario(perfil?.rol)}
          />
        </div>
        <div className="lg:col-span-8">
          {chartData.length > 0 ? (
            <ProjectProgressChart data={chartData} />
          ) : (
            <EmptyPanel
              titulo="Avance total del proyecto"
              mensaje="Aún no hay avance registrado. Usa “Nuevo Registro” para empezar."
            />
          )}
        </div>
      </div>

      {/* Avance diario + Semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          {avanceHoy ? (
            <DailyProgressChart real={avanceHoy.real} proyectado={avanceHoy.proyectado} />
          ) : (
            <EmptyPanel
              titulo="Avance diario"
              mensaje="Aún no se registra el avance de hoy."
            />
          )}
        </div>
        <div className="lg:col-span-7">
          {avancesSemana.length > 0 ? (
            <WeeklyComplianceChart data={avancesSemana} />
          ) : (
            <EmptyPanel
              titulo="Desempeño semanal"
              mensaje="Aún no hay avance registrado esta semana."
            />
          )}
        </div>
      </div>

      {/* Últimos Partes (Historial Rápido) */}
      <div className="w-full">
        <div className="flex flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl group">
          <div className="absolute inset-0 bg-gradient-to-t from-white/[0.01] to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Historial de Partes Recientes</h3>
            <Link href="/sst/bitacora" className="text-[10px] font-bold text-[#ff4500] uppercase tracking-widest hover:text-[#ff4500]/80">
              Ver Todos →
            </Link>
          </div>
          <div className="relative z-10 overflow-x-auto">
            {historialPartes.length > 0 ? (
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Fecha</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Presentes</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Ausentes</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Eventos</th>
                    <th className="pb-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historialPartes.slice(0, 5).map(p => (
                    <tr key={p.fecha} className="transition-colors hover:bg-white/[0.02] group/row">
                      <td className="py-4 text-sm font-bold text-white">
                        {new Date(`${p.fecha}T12:00:00`).toLocaleDateString("es-CO", { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
                      </td>
                      <td className="py-4 text-sm text-emerald-400 font-bold">{p.presentes} <span className="text-[10px] text-white/30">/ {p.total_programado}</span></td>
                      <td className="py-4 text-sm text-amber-500 font-bold">{p.ausentes}</td>
                      <td className="py-4 text-sm">
                        {p.accidentes > 0 ? (
                          <span className="text-red-500 font-bold">{p.accidentes} Acc</span>
                        ) : p.incidentes > 0 ? (
                          <span className="text-amber-500 font-bold">{p.incidentes} Inc</span>
                        ) : (
                          <span className="text-white/20">Ninguno</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          href={`/proyectos/${params.id}/parte/${p.fecha}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50 transition-all hover:bg-white/5 hover:text-white"
                        >
                          Ver Detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-white/30 italic">No hay partes registrados aún.</p>
            )}
          </div>
        </div>
      </div>

      {/* Galería fotográfica */}
      <div className="w-full">
        <PhotoGallery
          fotos={fotos}
          proyectoId={proyecto.id}
          empresaId={proyecto.empresa_id}
          subempresaId={proyecto.subempresa_id}
        />
      </div>

      {/* Observaciones */}
      <div className="w-full">
        <ObservationsSection
          observaciones={observaciones}
          proyectoId={proyecto.id}
          puedeAgregar={perfil?.rol === "super_admin"}
        />
      </div>

      {/* Configuración del proyecto — acción poco frecuente, al fondo */}
      {puedeEditar && (
        <div className="flex justify-center border-t border-white/5 pt-6">
          <Link
            href={`/proyectos/${proyecto.id}/editar`}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30 transition-colors hover:text-white/70"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar datos del proyecto
          </Link>
        </div>
      )}
    </div>
  );
}
