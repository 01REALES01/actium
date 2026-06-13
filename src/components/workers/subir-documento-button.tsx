"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { WorkerDetailsModal } from "./worker-details-modal";
import type { EmpleadoConDocumentos } from "@/lib/data/sst";

type Props = {
  empleado: EmpleadoConDocumentos;
  empresaId?: string;
};

/** Abre el side panel del expediente para subir documentos sin salir del perfil. */
export function SubirDocumentoButton({ empleado, empresaId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF916E] px-4 text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A] transition-all hover:bg-[#FF916E]/90"
      >
        <Upload className="h-4 w-4" />
        Subir documento
      </button>

      <WorkerDetailsModal
        open={open}
        onOpenChange={setOpen}
        empleado={empleado}
        empresaId={empresaId}
      />
    </>
  );
}
