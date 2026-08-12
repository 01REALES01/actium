import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Phone,
  Mail,
  IdCard,
  Briefcase,
  CalendarDays,
  ShieldCheck,
  HeartPulse,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  FileText,
  CalendarOff,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEmpleadoPerfil } from "@/lib/data/sst";
import { listProyectos } from "@/lib/data/proyectos";
import { listEmpresas, listSubempresas } from "@/lib/data/organizacion";
import { getPerfilActual, esSuperAdmin } from "@/lib/auth/roles";
import { SubirDocumentoButton } from "@/components/workers/subir-documento-button";
import { WorkerProfileActions } from "@/components/workers/worker-profile-actions";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

const DOC_LABELS: Record<string, string> = {
  arl: "ARL",
  eps: "EPS",
  certificacion_altura: "Certificación de Alturas",
  examen_medico: "Examen Médico",
  contrato: "Contrato",
  hoja_vida: "Hoja de Vida",
  otro: "Otro",
};

const AUSENTISMO_LABELS: Record<string, string> = {
  medico: "Cita Médica",
  personal: "Personal",
  incapacidad: "Incapacidad",
  vacaciones: "Vacaciones",
  otro: "Otro",
};

const SEVERIDAD_LABELS: Record<string, string> = {
  leve: "Leve",
  moderado: "Moderado",
  grave: "Grave",
  critico: "Crítico",
};

function docVigencia(vigencia_hasta: string | null): "valid" | "warning" | "expired" | "sin_fecha" {
  if (!vigencia_hasta) return "sin_fecha";
  const diff = (new Date(vigencia_hasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "expired";
  if (diff < 30) return "warning";
  return "valid";
}

function fmtFecha(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha.length <= 10 ? fecha + "T12:00:00" : fecha).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function EmpleadoPerfilPage({ params }: Props) {
  const supabase = createClient();
  const [perfil, usuarioActual, todosLosProyectos, empresas, subempresas] = await Promise.all([
    getEmpleadoPerfil(supabase, params.id),
    getPerfilActual(supabase),
    listProyectos(supabase),
    listEmpresas(supabase),
    listSubempresas(supabase),
  ]);

  if (!perfil) notFound();

  const { empleado, documentos, ausentismos, incidentes, proyectos } = perfil;
  const puedeEditar = esSuperAdmin(usuarioActual?.rol);

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-5xl">
      {/* Navegación */}
      <Link
        href="/field-workers"
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" /> Volver al Registro de Personal
      </Link>

      {/* Encabezado del empleado */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#FF916E]/10 text-2xl font-bold uppercase text-[#FF916E]">
            {empleado.nombre.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{empleado.nombre}</h1>
              <span
                className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  empleado.activo
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-white/5 text-white/40 border border-white/10"
                }`}
              >
                {empleado.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/50">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> {empleado.cargo ?? empleado.profesion ?? "Sin cargo"}
              </span>
              <span className="flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5" /> CC {empleado.cedula}
              </span>
              {empleado.telefono && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {empleado.telefono}
                </span>
              )}
              {empleado.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {empleado.email}
                </span>
              )}
            </div>
          </div>
          {puedeEditar && (
            <WorkerProfileActions
              empleado={{ ...empleado, documentos, proyectos }}
              proyectos={todosLosProyectos}
              empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
              subempresas={subempresas.map((s) => ({ id: s.id, nombre: s.nombre, empresa_id: s.empresa_id }))}
            />
          )}
        </div>

        {/* Datos de afiliación */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, label: "ARL", value: empleado.arl },
            { icon: HeartPulse, label: "EPS", value: empleado.eps },
            { icon: PiggyBank, label: "Fondo de Pensión", value: empleado.fondo_pension },
            { icon: CalendarDays, label: "Fecha de Ingreso", value: fmtFecha(empleado.fecha_ingreso) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <Icon className="h-4 w-4 text-white/30 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{label}</p>
                <p className="text-sm font-medium text-white/80 truncate">{value || "—"}</p>
              </div>
            </div>
          ))}
        </div>

        {proyectos.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Proyectos:</span>
            {proyectos.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {p.nombre}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Documentos / cumplimiento */}
      <section className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-white/50 uppercase">
            <FileText className="h-4 w-4 text-[#FF916E]" /> Documentación y Certificaciones
          </h2>
          {puedeEditar && (
            <SubirDocumentoButton
              empleado={{ ...empleado, documentos }}
              empresaId={empleado.empresa_id}
            />
          )}
        </div>
        {documentos.length === 0 ? (
          <p className="text-sm text-white/20 italic">Aún no hay documentos cargados para este empleado.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {documentos.map((doc) => {
              const estado = docVigencia(doc.vigencia_hasta);
              const ok = estado === "valid" || estado === "sin_fecha";
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                >
                  {ok ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle
                      className={`h-5 w-5 shrink-0 ${estado === "expired" ? "text-red-500" : "text-amber-500"}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {DOC_LABELS[doc.tipo] ?? doc.nombre ?? doc.tipo}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-white/30">
                      {estado === "sin_fecha"
                        ? "Sin vencimiento"
                        : estado === "expired"
                          ? `Vencido el ${fmtFecha(doc.vigencia_hasta)}`
                          : `Vence ${fmtFecha(doc.vigencia_hasta)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Inasistencias / ausentismos */}
      <section className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-white/50 uppercase mb-5">
          <CalendarOff className="h-4 w-4 text-amber-500" /> Inasistencias
          <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
            {ausentismos.length}
          </span>
        </h2>
        {ausentismos.length === 0 ? (
          <p className="text-sm text-white/20 italic">Sin inasistencias registradas.</p>
        ) : (
          <div className="space-y-3">
            {ausentismos.map((aus) => (
              <div key={aus.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded px-2 py-1 text-[9px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500">
                    {AUSENTISMO_LABELS[aus.tipo] ?? aus.tipo}
                  </span>
                  <span className="text-[11px] font-bold text-white/40">
                    {fmtFecha(aus.fecha_inicio)} — {fmtFecha(aus.fecha_fin)}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Motivo</p>
                  <p className="text-sm text-white/80 mt-0.5">{aus.razon}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-white/30">
                  {aus.proyectos?.nombre && (
                    <span className="uppercase tracking-widest">Proyecto: {aus.proyectos.nombre}</span>
                  )}
                  {aus.soporte_pdf_path && (
                    <span className="flex items-center gap-1 text-[#FF916E]">
                      <FileText className="h-3 w-3" /> Soporte adjunto
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Incidentes */}
      {incidentes.length > 0 && (
        <section className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-white/50 uppercase mb-5">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Incidentes y Accidentes
            <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
              {incidentes.length}
            </span>
          </h2>
          <div className="space-y-3">
            {incidentes.map((inc) => (
              <div key={inc.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    {inc.tipo} · {SEVERIDAD_LABELS[inc.severidad] ?? inc.severidad}
                  </span>
                  <span className="text-[11px] font-bold text-white/40">{fmtFecha(inc.fecha)}</span>
                </div>
                <p className="mt-2 text-sm text-white/80">{inc.descripcion}</p>
                {inc.proyectos?.nombre && (
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">
                    Proyecto: {inc.proyectos.nombre}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
