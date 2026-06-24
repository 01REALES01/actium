"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, UserCheck, UserMinus, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { guardarParteDiarioAction } from "@/lib/actions/partes-sst";

type EmpleadoOpt = {
  id: string;
  nombre: string;
  cedula: string | null;
  cargo: string | null;
  proyecto_id: string;
};

type ProyectoOpt = { id: string; nombre: string };

type AusenciaTipo = "medico" | "personal" | "vacaciones" | "incapacidad" | "otro";

const TIPOS_AUSENCIA: { value: AusenciaTipo; label: string }[] = [
  { value: "medico", label: "Médica" },
  { value: "incapacidad", label: "Incapacidad" },
  { value: "personal", label: "Personal" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "otro", label: "Otra" },
];

type Estado = { presente: boolean; tipo: AusenciaTipo; razon: string };

export function ParteCheckinForm({
  proyectos,
  empleados,
  fechaInicial,
  proyectoInicial,
  proyectoFijo = false,
  estadoInicial,
  observacionInicial = "",
  destino = "bitacora",
  onSaved,
  compact = false,
}: {
  proyectos: ProyectoOpt[];
  empleados: EmpleadoOpt[];
  fechaInicial: string;
  proyectoInicial?: string;
  /** Bloquea el selector de proyecto (contexto de una obra concreta). */
  proyectoFijo?: boolean;
  /** Estado inicial de asistencia por empleado (para editar un parte existente). */
  estadoInicial?: Record<string, Estado>;
  observacionInicial?: string;
  /** A dónde redirigir tras guardar. Se ignora si se pasa onSaved. */
  destino?: "bitacora" | "proyecto";
  /** Si se provee, se llama tras guardar en lugar de navegar (uso en modal). */
  onSaved?: () => void;
  /** Oculta la cabecera proyecto/fecha (redundante dentro de un modal). */
  compact?: boolean;
}) {
  const router = useRouter();
  const [proyectoId, setProyectoId] = useState<string>(
    proyectoInicial && proyectos.some((p) => p.id === proyectoInicial)
      ? proyectoInicial
      : proyectos[0]?.id ?? "",
  );
  const [fecha, setFecha] = useState<string>(fechaInicial);
  const [observaciones, setObservaciones] = useState(observacionInicial);
  const [estados, setEstados] = useState<Record<string, Estado>>(estadoInicial ?? {});
  const [error, setError] = useState<string | null>(null);
  const [guardando, startGuardar] = useTransition();

  const roster = useMemo(
    () => empleados.filter((e) => e.proyecto_id === proyectoId),
    [empleados, proyectoId],
  );

  const getEstado = (id: string): Estado =>
    estados[id] ?? { presente: true, tipo: "otro", razon: "" };

  const setEstado = (id: string, patch: Partial<Estado>) =>
    setEstados((prev) => ({ ...prev, [id]: { ...getEstado(id), ...patch } }));

  const presentes = roster.filter((e) => getEstado(e.id).presente).length;
  const ausentes = roster.length - presentes;

  const handleSubmit = () => {
    setError(null);
    if (!proyectoId) return setError("Seleccione un proyecto.");
    if (roster.length === 0) return setError("No hay personal asignado a esta obra.");

    const asistencias = roster.map((e) => {
      const st = getEstado(e.id);
      return {
        empleadoId: e.id,
        presente: st.presente,
        tipoAusencia: st.tipo,
        razon: st.presente ? "" : st.razon,
      };
    });

    // Validación previa: cada ausente con razón.
    const sinRazon = asistencias.find((a) => !a.presente && a.razon.trim().length === 0);
    if (sinRazon) return setError("Indique la razón de cada inasistencia.");

    startGuardar(async () => {
      try {
        const res = await guardarParteDiarioAction({
          proyectoId,
          fecha,
          observaciones,
          asistencias,
        });
        if (onSaved) {
          onSaved();
          return;
        }
        router.push(
          destino === "proyecto"
            ? `/proyectos/${res.proyectoId}/parte/${res.fecha}`
            : `/sst/bitacora/${res.proyectoId}/${res.fecha}`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "No fue posible guardar el parte.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera: proyecto + fecha */}
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Obra / Proyecto
            </label>
            {proyectoFijo ? (
              <div className="flex h-12 items-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white">
                {proyectos.find((p) => p.id === proyectoId)?.nombre ?? "Proyecto"}
              </div>
            ) : (
              <select
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white focus:border-[#F25C05] focus:outline-none"
              >
                {proyectos.length === 0 && <option value="">Sin proyectos</option>}
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1A1A1A]">
                    {p.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Fecha del parte
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white focus:border-[#F25C05] focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>
      )}

      {/* KPIs en vivo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-4 text-center shadow-2xl">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Programado</p>
          <p className="mt-1 text-3xl font-bold text-white">{roster.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center shadow-2xl">
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/70">Presentes</p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">{presentes}</p>
        </div>
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-center shadow-2xl">
          <p className="text-[9px] font-bold uppercase tracking-widest text-orange-400/70">Ausentes</p>
          <p className="mt-1 text-3xl font-bold text-orange-400">{ausentes}</p>
        </div>
      </div>

      {/* Lista de personal (check-in) */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[#F25C05]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
            Asistencia del personal
          </h3>
        </div>

        {roster.length === 0 ? (
          <div className="py-10 text-center">
            <UserMinus className="mx-auto h-8 w-8 text-white/20 mb-3" />
            <p className="text-sm text-white/40">
              No hay personal asignado a esta obra. Asigne personal en el módulo de Personal.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {roster.map((emp) => {
              const st = getEstado(emp.id);
              return (
                <div
                  key={emp.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                    st.presente
                      ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                      : "border-orange-500/20 bg-orange-500/[0.04]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{emp.nombre}</p>
                      <p className="truncate text-[11px] text-white/40">
                        {emp.cargo || "Sin cargo"}
                        {emp.cedula ? ` · ${emp.cedula}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 rounded-lg border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => setEstado(emp.id, { presente: true })}
                        className={cn(
                          "flex h-9 items-center gap-1.5 rounded-md px-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                          st.presente ? "bg-emerald-500 text-white" : "text-white/40 hover:text-white",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" /> Vino
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstado(emp.id, { presente: false })}
                        className={cn(
                          "flex h-9 items-center gap-1.5 rounded-md px-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                          !st.presente ? "bg-orange-500 text-white" : "text-white/40 hover:text-white",
                        )}
                      >
                        <X className="h-3.5 w-3.5" /> Faltó
                      </button>
                    </div>
                  </div>

                  {!st.presente && (
                    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2">
                      <select
                        value={st.tipo}
                        onChange={(e) => setEstado(emp.id, { tipo: e.target.value as AusenciaTipo })}
                        className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F25C05] focus:outline-none"
                      >
                        {TIPOS_AUSENCIA.map((t) => (
                          <option key={t.value} value={t.value} className="bg-[#1A1A1A]">
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={st.razon}
                        onChange={(e) => setEstado(emp.id, { razon: e.target.value })}
                        placeholder="Razón de la inasistencia"
                        className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white placeholder:text-white/30 focus:border-[#F25C05] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Observaciones */}
      <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          Observaciones del día (opcional)
        </label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Novedades generales de la operación, clima, retrasos, etc."
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#F25C05] focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={guardando || roster.length === 0}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F25C05] px-6 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90 disabled:opacity-50 sm:w-auto sm:self-end"
      >
        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
        Guardar parte del día
      </button>
    </div>
  );
}
