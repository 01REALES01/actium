import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerfilActual, puedeGestionarProyectos } from "@/lib/auth/roles";
import { getProyecto, getProyectoAvances, getObservaciones, getFotos } from "@/lib/data/proyectos";
import {
  getSSTStats,
  getEmpleadosAsignados,
  getAusentismosHistorial,
  getIncidentesPorProyecto,
  getAvancesSemanaActual,
  getAvanceHoy,
} from "@/lib/data/sst";
import { getParteDelDia } from "@/lib/data/partes-sst";
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
    <div className="flex h-full min-h-[220px] flex-col rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
      <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">{titulo}</h3>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm text-white/40">{mensaje}</p>
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
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white uppercase">
              {proyecto.nombre}{" "}
              <span className="text-white/30 ml-2">#{proyecto.codigo}</span>
            </h1>
          </div>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            {proyecto.descripcion ?? proyecto.ubicacion ?? "Infraestructura Metalmecánica"}
          </p>
        </div>

        <div className="flex w-full md:w-auto mt-4 md:mt-0">
          <Link
            href={`/proyectos/${proyecto.id}/parte/${hoy}`}
            className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-lg bg-[#F25C05] px-6 py-3 text-xs font-bold text-white transition-all hover:bg-[#F25C05]/90"
          >
            <ClipboardList className="h-4 w-4" />
            Parte de hoy
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
