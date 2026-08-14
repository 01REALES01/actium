import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Users,
  UserCheck,
  UserMinus,
  AlertTriangle,
  ShieldAlert,
  Camera,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParteCockpitDelDia } from "@/lib/data/partes-sst";
import { getEmpleadosAsignados, getAvancesSemanaActual } from "@/lib/data/sst";
import { getProyectoAvances, getProyecto, getProyectoMetas } from "@/lib/data/proyectos";
import { hoyLocal } from "@/lib/fecha";
import { getPerfilActual, puedeEditarParteDiario } from "@/lib/auth/roles";
import { GraficaAsistencia, GraficaEventos } from "@/components/sst/parte-graficas";
import { DailyProgressChart } from "@/components/projects/daily-progress-chart";
import { ParteDescargarPDF, type PartePDFData } from "@/components/sst/parte-pdf";
import { NuevoRegistroModal } from "@/components/projects/nuevo-registro-modal";
import { NuevoIncidenteModal } from "@/components/projects/nuevo-incidente-modal";
import { IncidenteCard } from "@/components/projects/incidente-card";
import { NuevoAusentismoModal } from "@/components/projects/nuevo-ausentismo-modal";
import { PasarAsistenciaModal } from "@/components/projects/pasar-asistencia-modal";
import { ParteDiaFotos } from "@/components/projects/parte-dia-fotos";

const TIPO_AUSENCIA_LABEL: Record<string, string> = {
  medico: "Médica",
  incapacidad: "Incapacidad",
  personal: "Personal",
  vacaciones: "Vacaciones",
  otro: "Otra",
};

function addDays(fecha: string, delta: number): string {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().split("T")[0];
}

export default async function ParteDiaProyectoPage({
  params,
  searchParams,
}: {
  params: { id: string; fecha: string };
  searchParams?: { abrir?: string };
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.fecha)) notFound();

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  const puedeEditar = puedeEditarParteDiario(perfil?.rol);

  // Lecturas por admin: las tablas SST tienen RLS activo y auth_rol() está rota.
  const db = createAdminClient();
  const [d, empleadosActivos, avancesSemana, avancesProyecto, proyecto, metas] = await Promise.all([
    getParteCockpitDelDia(db, params.id, params.fecha),
    getEmpleadosAsignados(db, params.id),
    getAvancesSemanaActual(db, params.id),
    getProyectoAvances(db, params.id),
    getProyecto(db, params.id),
    getProyectoMetas(db, params.id),
  ]);
  if (!d || !proyecto) notFound();

  const eventosActivos = d.incidentes.filter((e) => !e.deleted_at);
  const accidentes = eventosActivos.filter((e) => e.tipo === "accidente");
  const otrosIncidentes = eventosActivos.filter((e) => e.tipo !== "accidente");
  const ausentes = d.programado - d.presentes;

  // Datos para el check-in de asistencia (modal "Pasar asistencia").
  const empleadosCheckin = d.roster.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    cedula: null,
    cargo: e.cargo,
    proyecto_id: params.id,
  }));
  const estadoInicialCheckin: Record<
    string,
    { presente: boolean; tipo: "medico" | "personal" | "vacaciones" | "incapacidad" | "otro"; razon: string }
  > = {};
  for (const a of d.inasistencias) {
    estadoInicialCheckin[a.empleado_id] = {
      presente: false,
      tipo: a.tipo as "medico" | "personal" | "vacaciones" | "incapacidad" | "otro",
      razon: a.razon,
    };
  }

  const hoy = hoyLocal();
  const prev = addDays(params.fecha, -1);
  const next = addDays(params.fecha, 1);
  const esHoy = params.fecha === hoy;

  const fechaLarga = new Date(`${d.fecha}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pdfData: PartePDFData = {
    proyectoNombre: d.proyectoNombre,
    fecha: d.fecha,
    programado: d.programado,
    presentes: d.presentes,
    ausentes,
    inasistencias: d.inasistencias.map((a) => ({
      nombre: a.nombre ?? "—",
      cargo: a.cargo ?? "",
      tipo: a.tipo,
      razon: a.razon,
    })),
    incidentes: otrosIncidentes.map((e) => ({
      tipo: e.tipo,
      severidad: e.severidad,
      descripcion: e.descripcion,
      involucrado: e.nombre ?? "",
    })),
    accidentes: accidentes.map((e) => ({
      tipo: e.tipo,
      severidad: e.severidad,
      descripcion: e.descripcion,
      involucrado: e.nombre ?? "",
    })),
    observaciones: d.parte?.observaciones ?? null,
    avance: d.avance ? { real: d.avance.real, proyectado: d.avance.proyectado } : null,
    avanceSemana: avancesSemana.map((a) => ({
      etiqueta: a.dia,
      real: a.real,
      proyectado: a.proyectado,
    })),
    avanceProyecto: avancesProyecto.map((a) => ({
      etiqueta: new Date(`${a.fecha}T12:00:00`).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
      }),
      real: Number(a.avance_real),
      proyectado: Number(a.avance_proyectado),
    })),
    notasCampo: d.observaciones.map((o) => ({
      contenido: o.contenido,
      autor: o.autor,
      importante: o.importante,
    })),
    fotos: d.fotos
      .filter((f) => f.signedUrl)
      .map((f) => ({ url: f.signedUrl as string, descripcion: f.descripcion })),
  };

  const kpis = [
    { label: "Programado", value: d.programado, icon: Users, color: "text-white" },
    { label: "Presentes", value: d.presentes, icon: UserCheck, color: "text-emerald-400" },
    { label: "Ausentes", value: ausentes, icon: UserMinus, color: "text-orange-400" },
    { label: "Incidentes", value: otrosIncidentes.length, icon: AlertTriangle, color: "text-amber-400" },
    { label: "Accidentes", value: accidentes.length, icon: ShieldAlert, color: "text-red-400" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header + navegación de día */}
      <div className="flex flex-col gap-6">
        <Link
          href={`/proyectos/${params.id}`}
          className="flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al proyecto
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F25C05]">
              Parte diario · {d.proyectoNombre}
            </p>
            <h1 className="mt-1 text-2xl font-bold capitalize tracking-tight text-white md:text-4xl">
              {fechaLarga}
              {esHoy && (
                <span className="ml-3 rounded-full bg-emerald-500/15 px-3 py-1 align-middle text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Hoy
                </span>
              )}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {puedeEditar && (
              <NuevoRegistroModal 
                proyectoId={params.id} 
                unidad={proyecto.unidad_medida} 
                metaTotal={(proyecto as any).meta_total_cantidad ?? null} 
                fechaInicio={proyecto.fecha_inicio ?? null}
                metas={metas}
              />
            )}
            <ParteDescargarPDF data={pdfData} />
          </div>
        </div>

        {/* Navegación ayer / hoy / mañana */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-1">
          <Link
            href={`/proyectos/${params.id}/parte/${prev}`}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 transition-all hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Día anterior
          </Link>
          {!esHoy && (
            <Link
              href={`/proyectos/${params.id}/parte/${hoy}`}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#F28729] transition-all hover:bg-white/10"
            >
              <CalendarDays className="h-4 w-4" /> Ir a hoy
            </Link>
          )}
          <Link
            href={`/proyectos/${params.id}/parte/${next}`}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 transition-all hover:bg-white/10 hover:text-white"
          >
            Día siguiente <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Registros rápidos del día (Rediseñado) */}
        {puedeEditar && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <PasarAsistenciaModal
              proyectoId={params.id}
              proyectoNombre={d.proyectoNombre}
              fecha={params.fecha}
              empleados={empleadosCheckin}
              estadoInicial={estadoInicialCheckin}
              observacionInicial={d.parte?.observaciones ?? ""}
              parteExiste={Boolean(d.parte)}
              defaultOpen={searchParams?.abrir === "asistencia"}
              customTrigger={
                <div className="group flex h-full flex-col justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 transition-all hover:bg-emerald-500/10 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <UserCheck className="h-6 w-6 text-emerald-400" />
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400">Asistencia</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {d.parte ? "Editar asistencia" : "Pasar asistencia"}
                    </h3>
                    <p className="mt-1 text-xs text-white/50">Gestionar check-in de {empleadosCheckin.length} trabajadores</p>
                  </div>
                </div>
              }
            />

            <NuevoAusentismoModal
              proyectoId={params.id}
              empleadosActivos={empleadosActivos}
              customTrigger={
                <div className="group flex h-full flex-col justify-between rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 transition-all hover:bg-orange-500/10 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <UserMinus className="h-6 w-6 text-orange-400" />
                    <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-orange-400">Personal</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                      Reportar Ausencia
                    </h3>
                    <p className="mt-1 text-xs text-white/50">Registrar incapacidades, permisos o vacaciones</p>
                  </div>
                </div>
              }
            />

            <NuevoIncidenteModal
              proyectoId={params.id}
              empleadosActivos={empleadosActivos}
              customTrigger={
                <div className="group flex h-full flex-col justify-between rounded-2xl border border-red-500/20 bg-red-500/5 p-5 transition-all hover:bg-red-500/10 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <ShieldAlert className="h-6 w-6 text-red-500" />
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-red-400">SST</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                      Registrar Evento
                    </h3>
                    <p className="mt-1 text-xs text-white/50">Reportar incidentes o accidentes de trabajo</p>
                  </div>
                </div>
              }
            />
          </div>
        )}
      </div>

      {!d.parte && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-400">
          Aún no se registró el parte de este día. Lo que ves se deriva de ausencias, incidentes,
          fotos y observaciones existentes. {puedeEditar ? "Registra el check-in para consolidarlo." : ""}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-2xl">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">{k.label}</p>
              <p className={`mt-0.5 text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GraficaAsistencia presentes={d.presentes} ausentes={ausentes} />
        {d.avance ? (
          <DailyProgressChart real={d.avance.real} proyectado={d.avance.proyectado} unidad={proyecto.unidad_medida} fecha={params.fecha} />
        ) : (
          <GraficaEventos incidentes={otrosIncidentes.length} accidentes={accidentes.length} />
        )}
      </div>
      {d.avance && (
        <div className="grid grid-cols-1">
          <GraficaEventos incidentes={otrosIncidentes.length} accidentes={accidentes.length} />
        </div>
      )}

      {/* Inasistencias */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Inasistencias del día</h3>
        {d.inasistencias.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">Sin inasistencias registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Trabajador</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Cargo</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Tipo</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Razón</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {d.inasistencias.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 text-sm font-bold text-white">{a.nombre ?? "—"}</td>
                    <td className="py-3 text-xs text-white/60">{a.cargo ?? "—"}</td>
                    <td className="py-3">
                      <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-orange-400">
                        {TIPO_AUSENCIA_LABEL[a.tipo] ?? a.tipo}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-white/70">{a.razon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incidentes y accidentes */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Incidentes y accidentes</h3>
        {d.incidentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">Sin incidentes ni accidentes registrados.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[
              ...d.incidentes.filter((e) => e.tipo === "accidente"),
              ...d.incidentes.filter((e) => e.tipo !== "accidente"),
            ].map((e) => (
              <IncidenteCard
                key={e.id}
                evento={e}
                proyectoId={params.id}
                fecha={params.fecha}
                puedeEditar={puedeEditar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fotos del día */}
      <ParteDiaFotos fotos={d.fotos} />

      {/* Observaciones de campo del día */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#F25C05]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Observaciones de campo</h3>
        </div>
        {d.observaciones.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">Sin observaciones registradas este día.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {d.observaciones.map((o) => (
              <div
                key={o.id}
                className={`rounded-xl border p-4 ${
                  o.importante ? "border-amber-500/20 bg-amber-500/5" : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <p className="text-sm leading-relaxed text-white/80">{o.contenido}</p>
                <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">
                  {o.autor ?? "Sin autor"}
                  {o.importante ? " · Importante" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observación del parte (check-in) */}
      {d.parte?.observaciones && (
        <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Nota del parte</h3>
          <p className="text-sm leading-relaxed text-white/70">{d.parte.observaciones}</p>
        </div>
      )}
    </div>
  );
}
