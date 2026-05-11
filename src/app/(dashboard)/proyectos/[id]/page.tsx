import { notFound } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProyecto, getProyectoAvances } from "@/lib/data/proyectos";
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

type ProjectPageProps = {
  params: { id: string };
};

// Fallbacks mock para cuando no haya datos seed suficientes
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

  // Fetch en paralelo para reducir latencia
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
  ]);

  if (!proyecto) notFound();

  // Gráfica de progreso acumulado (histórico)
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

  // Gráfica semanal: usa datos reales si hay, sino fallback visual
  const weeklyData = avancesSemana.length > 0 ? avancesSemana : FALLBACK_WEEKLY;

  // Avance de hoy: usa datos reales si hay, sino el último avance disponible como referencia
  const avanceDiario = avanceHoy ?? {
    real: avances.length > 0 ? Number(avances[avances.length - 1].avance_real) : 42.5,
    proyectado:
      avances.length > 0 ? Number(avances[avances.length - 1].avance_proyectado) : 38.0,
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white uppercase">
              {proyecto.nombre}{" "}
              <span className="text-white/30 ml-2">#{proyecto.codigo}</span>
            </h1>
          </div>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            {proyecto.descripcion ??
              "Infraestructura Metalmecánica — Terminal Logística Norte"}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 md:px-6 py-3 text-[10px] md:text-xs font-bold text-white transition-all hover:bg-white/10">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Reporte</span>
            <span className="sm:hidden">Reporte</span>
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg bg-[#FF916E] px-4 md:px-6 py-3 text-[10px] md:text-xs font-bold text-[#1A1A1A] transition-all hover:bg-[#FF916E]/90">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Registro</span>
            <span className="sm:hidden">Registro</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SST Section — datos reales de Supabase */}
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

        {/* Main Progress Chart — histórico acumulado */}
        <div className="lg:col-span-8">
          <ProjectProgressChart data={chartData} />
        </div>
      </div>

      {/* Secondary Row: Mini Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Avance de hoy — 2 barras */}
        <div className="lg:col-span-5">
          <DailyProgressChart
            real={avanceDiario.real}
            proyectado={avanceDiario.proyectado}
          />
        </div>
        {/* Desempeño semanal — líneas y puntos */}
        <div className="lg:col-span-7">
          <WeeklyComplianceChart data={weeklyData} />
        </div>
      </div>

      {/* Tertiary Row: Photo Gallery */}
      <div className="w-full">
        <PhotoGallery />
      </div>

      {/* Quaternary Row: Observations */}
      <div className="w-full">
        <ObservationsSection />
      </div>
    </div>
  );
}
