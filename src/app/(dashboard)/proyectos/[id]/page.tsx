import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
import { SSTCard } from "@/components/projects/sst-card";
import { ProjectProgressChart } from "@/components/projects/project-progress-chart";
import { DailyProgressChart } from "@/components/projects/daily-progress-chart";
import { WeeklyComplianceChart } from "@/components/projects/weekly-compliance-chart";
import { PhotoGallery } from "@/components/projects/photo-gallery";
import { ObservationsSection } from "@/components/projects/observations-section";
import { NuevoRegistroModal } from "@/components/projects/nuevo-registro-modal";
import { NuevoIncidenteModal } from "@/components/projects/nuevo-incidente-modal";
import { NuevoAusentismoModal } from "@/components/projects/nuevo-ausentismo-modal";

type ProjectPageProps = {
  params: { id: string };
};

const FALLBACK_WEEKLY = [
  { dia: "LUN", proyectado: 45, real: 42 },
  { dia: "MAR", proyectado: 45, real: 48 },
  { dia: "MIE", proyectado: 45, real: 40 },
  { dia: "JUE", proyectado: 45, real: 35 },
  { dia: "VIE", proyectado: 45, real: 42 },
];
const FALLBACK_CHART = [
  { fecha: "01 May", avance: 10, proyectado: 12 },
  { fecha: "05 May", avance: 25, proyectado: 22 },
  { fecha: "10 May", avance: 45, proyectado: 40 },
  { fecha: "15 May", avance: 60, proyectado: 58 },
];

export default async function ProyectoDashboardPage({ params }: ProjectPageProps) {
  const supabase = createClient();

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
  ] = await Promise.all([
    getProyecto(supabase, params.id),
    getProyectoAvances(supabase, params.id),
    getSSTStats(supabase, params.id),
    getEmpleadosAsignados(supabase, params.id),
    getAusentismosHistorial(supabase, params.id),
    getIncidentesPorProyecto(supabase, params.id, "incidente"),
    getIncidentesPorProyecto(supabase, params.id, "accidente"),
    getAvancesSemanaActual(supabase, params.id),
    getAvanceHoy(supabase, params.id),
    getObservaciones(supabase, params.id),
    getFotos(supabase, params.id),
    getPerfilActual(supabase),
  ]);

  if (!proyecto) notFound();

  const puedeEditar = puedeGestionarProyectos(perfil?.rol);

  const chartData =
    avances.length > 0
      ? avances.map((a) => ({
          fecha: new Date(a.fecha).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
          }),
          avance: Number(a.avance_real),
          proyectado: Number(a.avance_proyectado),
        }))
      : FALLBACK_CHART;

  const weeklyData = avancesSemana.length > 0 ? avancesSemana : FALLBACK_WEEKLY;

  const avanceDiario = avanceHoy ?? {
    real: avances.length > 0 ? Number(avances[avances.length - 1].avance_real) : 42.5,
    proyectado:
      avances.length > 0 ? Number(avances[avances.length - 1].avance_proyectado) : 38.0,
  };

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

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          {puedeEditar ? (
            <Link
              href={`/proyectos/${proyecto.id}/editar`}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-bold text-white transition-all hover:bg-white/10"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar Proyecto</span>
              <span className="sm:hidden">Editar</span>
            </Link>
          ) : null}
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-xs font-bold text-white transition-all hover:bg-white/10">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Reporte</span>
            <span className="sm:hidden">Reporte</span>
          </button>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <NuevoRegistroModal proyectoId={proyecto.id} />
            <NuevoIncidenteModal proyectoId={proyecto.id} empleadosActivos={empleados} />
            <NuevoAusentismoModal proyectoId={proyecto.id} empleadosActivos={empleados} />
          </div>
        </div>
      </div>

      {/* KPIs SST + Gráfica histórica */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <SSTCard
            stats={sstStats}
            proyectoNombre={proyecto.nombre}
            empleados={empleados}
            ausentismos={ausentismos}
            incidentes={incidentes}
            accidentes={accidentes}
          />
        </div>
        <div className="lg:col-span-8">
          <ProjectProgressChart data={chartData} />
        </div>
      </div>

      {/* Avance diario + Semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <DailyProgressChart
            real={avanceDiario.real}
            proyectado={avanceDiario.proyectado}
          />
        </div>
        <div className="lg:col-span-7">
          <WeeklyComplianceChart data={weeklyData} />
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
    </div>
  );
}
