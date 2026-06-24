"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { registrarAvanceAction } from "@/lib/actions/proyectos";
import { hoyLocal } from "@/lib/fecha";

export function NuevoRegistroModal({ 
  proyectoId, 
  unidad = "MT",
  metaTotal,
  customTrigger 
}: { 
  proyectoId: string; 
  unidad?: string;
  /** Meta total del proyecto en unidades (para calcular %) */
  metaTotal?: number | null;
  customTrigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState(hoyLocal());
  const [avanceReal, setAvanceReal] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [notas, setNotas] = useState("");

  const puedeConvertir = metaTotal && metaTotal > 0;

  function handleCantidadChange(val: string) {
    setAvanceReal(val);
    if (puedeConvertir && val !== "") {
      const n = parseFloat(val);
      if (!isNaN(n)) setPorcentaje(((n / metaTotal!) * 100).toFixed(2));
    } else {
      setPorcentaje("");
    }
  }

  function handlePorcentajeChange(val: string) {
    setPorcentaje(val);
    if (puedeConvertir && val !== "") {
      const p = parseFloat(val);
      if (!isNaN(p)) setAvanceReal(((p / 100) * metaTotal!).toFixed(2));
    } else {
      setAvanceReal("");
    }
  }

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
        notas: notas.trim() || undefined,
      });
      handleClose();
      setAvanceReal("");
      setPorcentaje("");
      setNotas("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar los cambios. Intenta de nuevo.");
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
          className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg bg-[#F25C05] px-4 md:px-6 py-3 text-[10px] md:text-xs font-bold text-white transition-all hover:bg-[#F25C05]/90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo Registro</span>
          <span className="sm:hidden">Registro</span>
        </button>
      )}

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
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-[#F25C05]/50 focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all [color-scheme:dark]"
                />
              </div>

              {/* Cantidad y porcentaje — bidireccional */}
              <div className={`grid gap-3 ${puedeConvertir ? "grid-cols-2" : "grid-cols-1"}`}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Avance Real ({unidad})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={avanceReal}
                    onChange={(e) => handleCantidadChange(e.target.value)}
                    placeholder="0.00"
                    required
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#F25C05]/50 focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all"
                  />
                </div>

                {puedeConvertir && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      Porcentaje (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={porcentaje}
                        onChange={(e) => handlePorcentajeChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#F25C05]/50 focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">%</span>
                    </div>
                    <p className="text-[9px] text-white/20 font-medium tracking-wide">
                      Meta total: {metaTotal} {unidad}
                    </p>
                  </div>
                )}
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
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#F25C05]/50 focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all resize-none"
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
                  className="flex-1 rounded-lg bg-[#F25C05] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#F25C05]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
