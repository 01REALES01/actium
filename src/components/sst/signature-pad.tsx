"use client";

import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PenTool, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  className?: string;
  label?: string;
}

export function SignaturePad({ onSave, className, label = "Firma del Supervisor o Responsable" }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saved, setSaved] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 200 });

  // Ajustar el canvas al contenedor padre
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 200,
        });
      }
    };
    
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setSaved(false);
    onSave("");
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) {
      return;
    }
    const dataUrl = sigCanvas.current?.getCanvas().toDataURL("image/png");
    if (dataUrl) {
      setSaved(true);
      onSave(dataUrl);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
          <PenTool className="h-3 w-3 text-[#F25C05]" />
          {label}
        </label>
        
        {saved && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <Check className="h-3 w-3" />
            Firma Guardada
          </span>
        )}
      </div>

      <div 
        ref={containerRef}
        onMouseLeave={save}
        className={cn(
          "relative rounded-xl border overflow-hidden bg-white/5 transition-all duration-300",
          saved ? "border-emerald-500/30 ring-1 ring-emerald-500/10" : "border-white/10 hover:border-white/20"
        )}
      >
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            width: dimensions.width,
            height: dimensions.height,
            className: "signature-canvas w-full cursor-crosshair touch-none"
          }}
          penColor="#F25C05"
          backgroundColor="transparent"
          onBegin={() => {
            setIsEmpty(false);
            setSaved(false);
          }}
          onEnd={() => {
            // Auto save when stroke ends
            save();
          }}
        />

        {/* Guía base para la firma */}
        <div className="absolute bottom-10 left-10 right-10 h-px bg-white/10 pointer-events-none border-b border-dashed border-white/20" />
        <div className="absolute bottom-5 left-10 text-[9px] text-white/20 font-bold tracking-widest uppercase pointer-events-none">
          Firme sobre la línea
        </div>

        {/* Controles superpuestos */}
        <div className="absolute top-3 right-3 flex gap-2">
          {!saved && !isEmpty && (
            <button
              type="button"
              onClick={save}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white backdrop-blur-md transition-all border border-emerald-500/50"
              title="Confirmar Firma"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={clear}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white/40 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all border border-white/5"
            title="Limpiar Firma"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-[9px] font-medium text-white/30 uppercase tracking-widest text-justify leading-relaxed">
        <strong>Aviso Legal:</strong> Esta firma tiene carácter de registro informativo interno de la plataforma Actium y 
        no constituye una firma electrónica o digital certificada según la Ley 527 de 1999 de la República de Colombia.
      </p>
    </div>
  );
}
