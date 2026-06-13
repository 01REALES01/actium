"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { PartePDFData } from "@/components/sst/parte-pdf-document";

// Re-export del tipo para que las páginas no dependan del módulo pesado.
export type { PartePDFData, ParteInasistencia, ParteEvento } from "@/components/sst/parte-pdf-document";

/**
 * Botón ligero: el motor de PDF (@react-pdf/renderer, ~400 kB) solo se carga
 * vía import dinámico al pulsar descargar, para no inflar el bundle de la página.
 */
export function ParteDescargarPDF({ data }: { data: PartePDFData }) {
  const [generando, setGenerando] = useState(false);

  const descargar = async () => {
    setGenerando(true);
    try {
      const { buildPartePDFBlob } = await import("@/components/sst/parte-pdf-document");
      const blob = await buildPartePDFBlob(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `parte-sst-${data.proyectoNombre.replace(/\s+/g, "-").toLowerCase()}-${data.fecha}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={descargar}
      disabled={generando}
      className="flex h-11 items-center gap-2 rounded-xl bg-[#F25C05] px-5 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90 disabled:opacity-50"
    >
      {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Descargar PDF
    </button>
  );
}
