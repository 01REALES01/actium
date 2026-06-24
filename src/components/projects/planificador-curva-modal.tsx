"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Save, BarChart3, Trash2 } from "lucide-react";
import { guardarProyectoMetasAction } from "@/lib/actions/proyectos";

export function PlanificadorCurvaModal({
  proyectoId,
  unidad = "MT",
  etiquetaEjeY,
  fechaInicio,
  fechaFin,
  totalEsperado,
  metasIniciales = [],
}: {
  proyectoId: string;
  unidad?: string;
  etiquetaEjeY?: string;
  fechaInicio?: string;
  fechaFin?: string;
  totalEsperado?: number;
  metasIniciales?: { fecha: string; avanceEsperado: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metas, setMetas] = useState(metasIniciales);

  const nombreVariable = etiquetaEjeY || `Avance (${unidad})`;
  const hayTotal = totalEsperado != null && totalEsperado > 0;

  function handleClose() {
    setOpen(false);
    setError(null);
    setMetas(metasIniciales);
  }

  function addMeta() {
    setMetas([...metas, { fecha: "", avanceEsperado: 0 }]);
  }

  function removeMeta(index: number) {
    setMetas(metas.filter((_, i) => i !== index));
  }

  function updateMetaCantidad(index: number, cantidad: number) {
    const newMetas = [...metas];
    newMetas[index] = { ...newMetas[index], avanceEsperado: cantidad };
    setMetas(newMetas);
  }

  function updateMetaPorcentaje(index: number, pct: number) {
    if (!hayTotal) return;
    const cantidad = Number(((pct / 100) * totalEsperado!).toFixed(2));
    const newMetas = [...metas];
    newMetas[index] = { ...newMetas[index], avanceEsperado: cantidad };
    setMetas(newMetas);
  }

  function updateMetaFecha(index: number, fecha: string) {
    const newMetas = [...metas];
    newMetas[index] = { ...newMetas[index], fecha };
    setMetas(newMetas);
  }

  function autogenerarSemanas() {
    if (!fechaInicio || !fechaFin) {
      setError("El proyecto no tiene fecha de inicio o fin. Edita el proyecto primero.");
      return;
    }
    
    const start = new Date(fechaInicio + "T12:00:00Z");
    const end = new Date(fechaFin + "T12:00:00Z");
    
    if (start >= end) {
      setError("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }

    const weeks: { fecha: string; avanceEsperado: number }[] = [];
    const current = new Date(start);

    while (current < end) {
      current.setUTCDate(current.getUTCDate() + 7);
      if (current > end) current.setTime(end.getTime());
      
      weeks.push({
        fecha: current.toISOString().split("T")[0],
        avanceEsperado: 0,
      });
    }

    if (hayTotal && weeks.length > 0) {
      const step = totalEsperado! / weeks.length;
      weeks.forEach((w, i) => {
        w.avanceEsperado = Number((step * (i + 1)).toFixed(2));
      });
      weeks[weeks.length - 1].avanceEsperado = totalEsperado!;
    }

    setMetas(weeks);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const metasValidas = metas
        .filter((m) => m.fecha !== "")
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      await guardarProyectoMetasAction({
        proyectoId,
        metas: metasValidas,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la gráfica");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/50 transition-all hover:bg-white/5 hover:text-white"
        title="Configurar Gráfica del Proyecto"
      >
        <BarChart3 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Gráfica</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1A1A1A] shadow-2xl"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Gráfica del Proyecto</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Define las metas esperadas a lo largo del tiempo.
                  {etiquetaEjeY && <span className="text-[#F25C05]"> · {etiquetaEjeY}</span>}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Info bar */}
              <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Eje Y</span>
                  <span className="text-sm font-bold text-white">{nombreVariable}</span>
                </div>
                {hayTotal ? (
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Meta Total</span>
                    <span className="text-sm font-bold text-white">{totalEsperado!.toLocaleString()} {unidad}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Meta Total</span>
                    <span className="text-xs text-white/30">Sin definir (edita el proyecto)</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={autogenerarSemanas}
                  className="shrink-0 rounded-lg border border-[#F25C05]/30 bg-[#F25C05]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#F25C05] transition-colors hover:bg-[#F25C05]/20"
                >
                  Autogenerar
                </button>
              </div>

              {/* Metas list */}
              <div className="mb-4 flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {metas.length === 0 ? (
                  <p className="text-sm text-white/30 text-center py-6">
                    Sin hitos planificados. Usa <span className="text-[#F25C05]">Autogenerar</span> o añade uno manualmente.
                  </p>
                ) : (
                  <>
                    {/* Table header */}
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white/30">
                      <span className="w-[140px] shrink-0">Fecha</span>
                      <span className="flex-1">Cantidad ({unidad})</span>
                      {hayTotal && <span className="w-[72px] text-center">%</span>}
                      <span className="w-8" />
                    </div>
                    {metas.map((meta, i) => {
                      const pct = hayTotal
                        ? Number(((meta.avanceEsperado / totalEsperado!) * 100).toFixed(1))
                        : null;
                      return (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                          <input
                            type="date"
                            required
                            value={meta.fecha}
                            onChange={(e) => updateMetaFecha(i, e.target.value)}
                            className="w-[140px] shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-[#F25C05]/50 focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all [color-scheme:dark]"
                          />
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={meta.avanceEsperado}
                            onChange={(e) => updateMetaCantidad(i, parseFloat(e.target.value) || 0)}
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-[#F25C05]/50 focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all"
                          />
                          {hayTotal && (
                            <div className="relative w-[72px] shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={pct ?? ""}
                                onChange={(e) => updateMetaPorcentaje(i, parseFloat(e.target.value) || 0)}
                                className="w-full rounded-lg border border-[#F25C05]/20 bg-[#F25C05]/5 px-2 py-1.5 pr-6 text-xs text-[#F25C05] font-bold text-center focus:border-[#F25C05]/50 focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#F25C05]/50 pointer-events-none">%</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMeta(i)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/20 hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={addMeta}
                className="w-full mb-5 flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:bg-white/5 hover:text-white/60 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir Hito
              </button>

              {error && (
                <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 border-t border-white/5 pt-5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/60 hover:bg-white/10 transition-colors uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#F25C05] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#F25C05]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                >
                  <Save className="h-3.5 w-3.5" />
                  {loading ? "Guardando..." : "Guardar Gráfica"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
