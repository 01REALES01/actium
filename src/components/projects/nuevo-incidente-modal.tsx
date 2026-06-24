"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { registrarIncidenteAction } from "@/lib/actions/sst-actions";
import { ahoraLocalInput } from "@/lib/fecha";
import { Tables } from "@/types/database.types";

export function NuevoIncidenteModal({
  proyectoId,
  empleadosActivos,
  customTrigger
}: {
  proyectoId: string;
  empleadosActivos: Tables<"empleados">[];
  customTrigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState(ahoraLocalInput());
  const [tipo, setTipo] = useState<"incidente" | "accidente" | "casi_accidente">("incidente");
  const [severidad, setSeveridad] = useState<"leve" | "moderado" | "grave" | "critico">("leve");
  const [empleadoId, setEmpleadoId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [accionesTomadas, setAccionesTomadas] = useState("");

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registrarIncidenteAction({
        proyectoId,
        empleadoId: empleadoId || undefined,
        tipo,
        severidad,
        fecha: new Date(fecha).toISOString(),
        descripcion: descripcion.trim(),
        accionesTomadas: accionesTomadas.trim() || undefined,
      });
      handleClose();
      // Reset form
      setDescripcion("");
      setAccionesTomadas("");
      setEmpleadoId("");
      setTipo("incidente");
      setSeveridad("leve");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar el incidente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {customTrigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {customTrigger}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-500 transition-all hover:bg-red-500/20"
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Registrar Incidente</span>
          <span className="sm:hidden">Incidente</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Reporte de Incidente / Accidente
                </h2>
                <p className="mt-1 text-[10px] text-white/40 uppercase">
                  El registro afectará los KPIs de seguridad del proyecto.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Tipo de Evento
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all [&>option]:bg-[#1A1A1A] [&>option]:text-white"
                  >
                    <option value="incidente">Incidente</option>
                    <option value="casi_accidente">Casi Accidente</option>
                    <option value="accidente">Accidente</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Severidad
                  </label>
                  <select
                    value={severidad}
                    onChange={(e) => setSeveridad(e.target.value as any)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all [&>option]:bg-[#1A1A1A] [&>option]:text-white"
                  >
                    <option value="leve">Leve</option>
                    <option value="moderado">Moderado</option>
                    <option value="grave">Grave</option>
                    <option value="critico">Crítico</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Fecha y Hora
                </label>
                <input
                  type="datetime-local"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all [color-scheme:dark]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Empleado Involucrado
                </label>
                <select
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(e.target.value)}
                  required
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all [&>option]:bg-[#1A1A1A] [&>option]:text-white"
                >
                  <option value="" disabled>Seleccione un empleado...</option>
                  {empleadosActivos.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} - {emp.cargo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Descripción del suceso
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe cómo y dónde ocurrió..."
                  rows={3}
                  required
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Acciones Tomadas Inmediatamente
                </label>
                <textarea
                  value={accionesTomadas}
                  onChange={(e) => setAccionesTomadas(e.target.value)}
                  placeholder="¿Qué se hizo al respecto para controlar la situación?"
                  rows={2}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all resize-none"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Registrando..." : "Confirmar Reporte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
