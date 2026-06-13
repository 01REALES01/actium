"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Loader2, ShieldCheck } from "lucide-react";
import { cerrarAtsAction, duplicarAtsAction } from "@/lib/actions/ats";

type Props = {
  formularioId: string;
  estado: string;
  /** El usuario tiene permisos para gestionar SST. */
  puedeGestionar: boolean;
  /** Hay al menos una firma de trabajador registrada (requisito para cerrar). */
  hayFirmas: boolean;
};

export function AtsAcciones({ formularioId, estado, puedeGestionar, hayFirmas }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cerrando, startCerrar] = useTransition();
  const [duplicando, startDuplicar] = useTransition();

  if (!puedeGestionar) return null;

  const puedeCerrar = estado === "completado" && hayFirmas;
  const puedeDuplicar = estado !== "borrador"; // duplicar tiene sentido sobre un ATS ya emitido

  const handleCerrar = () => {
    setError(null);
    startCerrar(async () => {
      try {
        await cerrarAtsAction(formularioId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No fue posible cerrar el formulario.");
      }
    });
  };

  const handleDuplicar = () => {
    setError(null);
    startDuplicar(async () => {
      try {
        const { id } = await duplicarAtsAction(formularioId);
        router.push(`/sst/${id}/editar`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No fue posible duplicar el formulario.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {puedeCerrar && (
          <button
            type="button"
            onClick={handleCerrar}
            disabled={cerrando}
            className="flex h-11 items-center gap-2 rounded-lg bg-[#F25C05] px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90 disabled:opacity-50"
          >
            {cerrando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Cerrar y firmar
          </button>
        )}
        {puedeDuplicar && (
          <button
            type="button"
            onClick={handleDuplicar}
            disabled={duplicando}
            className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10 disabled:opacity-50"
          >
            {duplicando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            Duplicar para hoy
          </button>
        )}
      </div>
      {estado === "completado" && !hayFirmas && puedeGestionar && (
        <p className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
          <CheckCircle2 className="h-3 w-3" /> Registre al menos una firma para poder cerrar el formulario.
        </p>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
