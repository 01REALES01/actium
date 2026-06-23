"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, X } from "lucide-react";
import { registrarAusentismoAction } from "@/lib/actions/sst-actions";
import { hoyLocal } from "@/lib/fecha";
import { Tables } from "@/types/database.types";

export function NuevoAusentismoModal({
  proyectoId,
  empleadosActivos
}: {
  proyectoId: string,
  empleadosActivos: Tables<"empleados">[]
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fechaInicio, setFechaInicio] = useState(hoyLocal());
  const [fechaFin, setFechaFin] = useState(hoyLocal());
  const [tipo, setTipo] = useState<"medico" | "personal" | "vacaciones" | "incapacidad" | "otro">("medico");
  const [empleadoId, setEmpleadoId] = useState("");
  const [razon, setRazon] = useState("");

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empleadoId) {
      setError("Debe seleccionar un empleado.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await registrarAusentismoAction({
        proyectoId,
        empleadoId,
        tipo,
        fechaInicio,
        fechaFin,
        razon: razon.trim(),
      });
      handleClose();
      // Reset form
      setRazon("");
      setEmpleadoId("");
      setTipo("medico");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar el ausentismo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 px-4 py-2 text-xs font-bold text-orange-500 transition-all hover:bg-orange-500/20"
      >
        <UserMinus className="h-4 w-4" />
        <span className="hidden sm:inline">Reportar Ausencia</span>
        <span className="sm:hidden">Ausencia</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
                  <UserMinus className="h-5 w-5" />
                  Reporte de Ausentismo
                </h2>
                <p className="mt-1 text-[10px] text-white/40 uppercase">
                  Esto afectará el indicador de personal en operación.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Empleado Ausente
                </label>
                <select
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(e.target.value)}
                  required
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all [&>option]:bg-[#1A1A1A] [&>option]:text-white"
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
                  Tipo de Ausencia
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all [&>option]:bg-[#1A1A1A] [&>option]:text-white"
                >
                  <option value="medico">Cita Médica</option>
                  <option value="incapacidad">Incapacidad</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="personal">Asunto Personal</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    required
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    required
                    min={fechaInicio}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Razón / Justificación
                </label>
                <textarea
                  value={razon}
                  onChange={(e) => setRazon(e.target.value)}
                  placeholder="Detalles de la ausencia..."
                  rows={2}
                  required
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all resize-none"
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
                  className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-bold text-[#1A1A1A] hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Registrando..." : "Confirmar Ausencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
