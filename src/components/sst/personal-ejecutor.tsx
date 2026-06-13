"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Loader2, PenLine, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { firmarTrabajadorAction } from "@/lib/actions/ats";
import { SignaturePad } from "@/components/sst/signature-pad";

export type TrabajadorItem = {
  id: string;
  nombre: string;
  cargo: string;
  cedula: string | null;
  firmada: boolean;
};

type Props = {
  trabajadores: TrabajadorItem[];
  empresaId: string;
  subempresaId: string | null;
  /** Solo se puede firmar si el formulario está abierto (borrador/completado) y hay permisos. */
  editable: boolean;
};

export function PersonalEjecutor({ trabajadores, empresaId, subempresaId, editable }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [firmaData, setFirmaData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const handleFirmar = (trabajadorId: string) => {
    if (!firmaData) {
      setError("Capture la firma antes de continuar.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const blob = await (await fetch(firmaData)).blob();
        const ruta = `${empresaId}/${subempresaId ?? "sin-subempresa"}/firmas-trabajadores/${trabajadorId}-${Date.now()}.png`;
        const { error: upErr } = await supabase.storage
          .from("firmas")
          .upload(ruta, blob, { contentType: "image/png", upsert: true });
        if (upErr) throw new Error("No fue posible subir la firma: " + upErr.message);

        await firmarTrabajadorAction({ trabajadorId, firmaPath: ruta });
        setAbierto(null);
        setFirmaData(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No fue posible registrar la firma.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {trabajadores.map((t) => {
        const estaAbierto = abierto === t.id;
        return (
          <div
            key={t.id}
            className="flex flex-col gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F25C05]/10 text-xs font-bold text-[#F25C05] shrink-0">
                {t.nombre.charAt(0) || "?"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{t.nombre}</p>
                <p className="text-[9px] text-white/40 uppercase tracking-widest truncate">
                  {t.cargo}
                  {t.cedula ? ` • CC: ${t.cedula}` : ""}
                </p>
              </div>
              {t.firmada ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-white/20 ml-auto shrink-0" />
              )}
            </div>

            {editable && !t.firmada && !estaAbierto && (
              <button
                type="button"
                onClick={() => {
                  setAbierto(t.id);
                  setFirmaData(null);
                  setError(null);
                }}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#F25C05]/30 bg-[#F25C05]/10 text-[10px] font-bold uppercase tracking-widest text-[#F25C05] transition-all hover:bg-[#F25C05]/20"
              >
                <PenLine className="h-3.5 w-3.5" /> Firmar
              </button>
            )}

            {estaAbierto && (
              <div className="flex flex-col gap-2">
                <SignaturePad onSave={setFirmaData} label={`Firma de ${t.nombre}`} />
                {error && <p className="text-[10px] text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleFirmar(t.id)}
                    disabled={pendiente}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#F25C05] text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90 disabled:opacity-50"
                  >
                    {pendiente ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAbierto(null);
                      setFirmaData(null);
                      setError(null);
                    }}
                    disabled={pendiente}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
