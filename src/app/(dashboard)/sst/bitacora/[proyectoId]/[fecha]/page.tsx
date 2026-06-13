import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Users, UserCheck, UserMinus, AlertTriangle, ShieldAlert, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getParteDelDia } from "@/lib/data/partes-sst";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";
import { GraficaAsistencia, GraficaEventos } from "@/components/sst/parte-graficas";
import { ParteDescargarPDF, type PartePDFData } from "@/components/sst/parte-pdf";

const TIPO_AUSENCIA_LABEL: Record<string, string> = {
  medico: "Médica",
  incapacidad: "Incapacidad",
  personal: "Personal",
  vacaciones: "Vacaciones",
  otro: "Otra",
};

const TIPO_EVENTO_LABEL: Record<string, string> = {
  incidente: "Incidente",
  accidente: "Accidente",
  casi_accidente: "Casi accidente",
};

export default async function ParteDetallePage({
  params,
}: {
  params: { proyectoId: string; fecha: string };
}) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  const puedeEditar = puedeCrearFormularioSST(perfil?.rol);

  const detalle = await getParteDelDia(supabase, params.proyectoId, params.fecha);
  if (!detalle) notFound();

  const accidentes = detalle.incidentes.filter((e) => e.tipo === "accidente");
  const otrosIncidentes = detalle.incidentes.filter((e) => e.tipo !== "accidente");
  const ausentes = detalle.programado - detalle.presentes;

  const fechaLarga = new Date(`${detalle.fecha}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pdfData: PartePDFData = {
    proyectoNombre: detalle.proyectoNombre,
    fecha: detalle.fecha,
    programado: detalle.programado,
    presentes: detalle.presentes,
    ausentes,
    inasistencias: detalle.inasistencias.map((a) => ({
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
    observaciones: detalle.parte?.observaciones ?? null,
  };

  const kpis = [
    { label: "Programado", value: detalle.programado, icon: Users, color: "text-white" },
    { label: "Presentes", value: detalle.presentes, icon: UserCheck, color: "text-emerald-400" },
    { label: "Ausentes", value: ausentes, icon: UserMinus, color: "text-orange-400" },
    { label: "Incidentes", value: otrosIncidentes.length, icon: AlertTriangle, color: "text-amber-400" },
    { label: "Accidentes", value: accidentes.length, icon: ShieldAlert, color: "text-red-400" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link
          href="/sst/bitacora"
          className="flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a la bitácora
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-white md:text-4xl">
              {detalle.proyectoNombre}
            </h1>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-white/40 md:text-sm">
              Parte diario SST · {fechaLarga}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {puedeEditar && (
              <Link
                href={`/sst/bitacora/nuevo?proyecto=${detalle.proyectoId}&fecha=${detalle.fecha}`}
                className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar parte
              </Link>
            )}
            <ParteDescargarPDF data={pdfData} />
          </div>
        </div>
      </div>

      {!detalle.parte && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-400">
          Aún no se ha registrado el parte de este día. Los datos mostrados se derivan de las
          inasistencias e incidentes existentes. Registre el check-in para consolidarlo.
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
        <GraficaAsistencia presentes={detalle.presentes} ausentes={ausentes} />
        <GraficaEventos incidentes={otrosIncidentes.length} accidentes={accidentes.length} />
      </div>

      {/* Inasistencias */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Inasistencias del día</h3>
        {detalle.inasistencias.length === 0 ? (
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
                {detalle.inasistencias.map((a) => (
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
        {detalle.incidentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">Sin incidentes ni accidentes registrados.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...accidentes, ...otrosIncidentes].map((e) => (
              <div
                key={e.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 ${
                  e.tipo === "accidente" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {e.tipo === "accidente" ? (
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                    {TIPO_EVENTO_LABEL[e.tipo] ?? e.tipo}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/60">
                    {e.severidad}
                  </span>
                  {e.nombre && (
                    <span className="ml-auto text-[11px] text-white/50">{e.nombre}</span>
                  )}
                </div>
                <p className="text-xs text-white/80">{e.descripcion}</p>
                {e.acciones_tomadas && (
                  <p className="text-[11px] text-white/50">Acciones: {e.acciones_tomadas}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observaciones */}
      {detalle.parte?.observaciones && (
        <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Observaciones</h3>
          <p className="text-sm leading-relaxed text-white/70">{detalle.parte.observaciones}</p>
        </div>
      )}
    </div>
  );
}
