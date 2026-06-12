"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { registrarAvanceAction } from "@/lib/actions/proyectos";

export function NuevoRegistroModal({ proyectoId }: { proyectoId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [avanceReal, setAvanceReal] = useState("");
  const [avanceProyectado, setAvanceProyectado] = useState("");
  const [notas, setNotas] = useState("");

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registrarAvanceAction({
        proyectoId,
        fecha,
        avanceReal: parseFloat(avanceReal),
        avanceProyectado: parseFloat(avanceProyectado),
        notas: notas.trim() || undefined,
      });
      handleClose();
      setAvanceReal("");
      setAvanceProyectado("");
      setNotas("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar los cambios. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg bg-[#FF916E] px-4 md:px-6 py-3 text-[10px] md:text-xs font-bold text-[#1A1A1A] transition-all hover:bg-[#FF916E]/90"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nuevo Registro</span>
        <span className="sm:hidden">Registro</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-white">
                  Registrar Avance de Obra
                </h2>
                <p className="mt-0.5 text-[10px] text-white/40">
                  Los datos actualizan las gráficas en tiempo real.
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
                  Fecha del registro
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-[#FF916E]/50 focus:outline-none focus:ring-1 focus:ring-[#FF916E]/30 transition-all [color-scheme:dark]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Avance Real (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={avanceReal}
                    onChange={(e) => setAvanceReal(e.target.value)}
                    placeholder="0.00"
                    required
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#FF916E]/50 focus:outline-none focus:ring-1 focus:ring-[#FF916E]/30 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Proyectado (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={avanceProyectado}
                    onChange={(e) => setAvanceProyectado(e.target.value)}
                    placeholder="0.00"
                    required
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#FF916E]/50 focus:outline-none focus:ring-1 focus:ring-[#FF916E]/30 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Notas del día (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones generales de la jornada..."
                  rows={3}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#FF916E]/50 focus:outline-none focus:ring-1 focus:ring-[#FF916E]/30 transition-all resize-none"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
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
                  className="flex-1 rounded-lg bg-[#FF916E] px-4 py-2.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#FF916E]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Guardando..." : "Guardar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
