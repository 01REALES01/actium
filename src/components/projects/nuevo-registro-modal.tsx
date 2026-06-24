"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { registrarAvanceAction } from "@/lib/actions/proyectos";
import { hoyLocal } from "@/lib/fecha";

export function NuevoRegistroModal({ 
  proyectoId, 
  unidad = "MT",
  metaTotal,
  fechaInicio,
  metas,
  customTrigger 
}: { 
  proyectoId: string; 
  unidad?: string;
  /** Meta total del proyecto en unidades (para calcular %) */
  metaTotal?: number | null;
  fechaInicio?: string | null;
  metas?: { fecha: string; avance_esperado: number }[];
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

  // Calculamos la proyección esperada al vuelo dependiendo de la fecha elegida
  const proyectadoDia = useMemo(() => {
    if (!metas || metas.length === 0) return null;
    
    const hitosRaw = metas.map(m => ({
      fecha: m.fecha,
      valor: Number(m.avance_esperado),
      ms: new Date(m.fecha + "T12:00:00Z").getTime(),
    }));

    const hitos = [...hitosRaw];
    let origenFecha: string;
    if (fechaInicio) {
      const fechaInicioMs = new Date(fechaInicio + "T12:00:00Z").getTime();
      origenFecha = new Date(fechaInicioMs - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    } else {
      origenFecha = new Date(hitos[0].ms - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    }
    const origenMs = new Date(origenFecha + "T12:00:00Z").getTime();
    if (origenMs < hitos[0].ms) {
      hitos.unshift({ fecha: origenFecha, valor: 0, ms: origenMs });
    }

    const ms = new Date(fecha + "T12:00:00Z").getTime();
    if (ms <= hitos[0].ms) return 0;
    if (ms >= hitos[hitos.length - 1].ms) return hitos[hitos.length - 1].valor;

    for (let i = 0; i < hitos.length - 1; i++) {
      const a = hitos[i];
      const b = hitos[i + 1];
      if (ms > a.ms && ms < b.ms) {
        const ratio = (ms - a.ms) / (b.ms - a.ms);
        return Number((a.valor + ratio * (b.valor - a.valor)).toFixed(2));
      }
      if (ms === b.ms) return b.valor;
    }
    return 0;
  }, [fecha, metas, fechaInicio]);

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

  function preCargarProyectado() {
    if (proyectadoDia != null) {
      handleCantidadChange(proyectadoDia.toString());
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex justify-between items-center">
                    <span>Avance Real ({unidad})</span>
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
                  {proyectadoDia != null && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                      <span className="text-white/30 uppercase tracking-widest font-bold">Proyectado:</span>
                      <button 
                        type="button" 
                        onClick={preCargarProyectado}
                        className="text-[#F25C05] font-bold hover:underline transition-all hover:text-[#F25C05]/80"
                        title="Haz clic para usar este valor"
                      >
                        {proyectadoDia} {unidad}
                      </button>
                    </div>
                  )}
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
                    {proyectadoDia != null && metaTotal && (
                      <p className="mt-1 text-[10px] font-bold text-white/30">
                        {((proyectadoDia / metaTotal) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
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

              <div className="flex gap-3 pt-4">
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
