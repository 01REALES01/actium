"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Pencil, X } from "lucide-react";
import { ParteCheckinForm } from "@/components/sst/parte-checkin-form";

type EmpleadoOpt = {
  id: string;
  nombre: string;
  cedula: string | null;
  cargo: string | null;
  proyecto_id: string;
};

type Estado = {
  presente: boolean;
  tipo: "medico" | "personal" | "vacaciones" | "incapacidad" | "otro";
  razon: string;
};

export function PasarAsistenciaModal({
  proyectoId,
  proyectoNombre,
  fecha,
  empleados,
  estadoInicial,
  observacionInicial = "",
  parteExiste = false,
  variant = "cluster",
  customTrigger,
}: {
  proyectoId: string;
  proyectoNombre: string;
  fecha: string;
  empleados: EmpleadoOpt[];
  estadoInicial?: Record<string, Estado>;
  observacionInicial?: string;
  parteExiste?: boolean;
  /** "cluster" = botón verde junto a los otros registros; "header" = botón prominente del encabezado. */
  variant?: "cluster" | "header";
  customTrigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSaved() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {customTrigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {customTrigger}
        </div>
      ) : variant === "header" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10"
        >
          <Pencil className="h-3.5 w-3.5" /> {parteExiste ? "Editar parte" : "Registrar parte"}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20"
        >
          <ClipboardCheck className="h-4 w-4" />
          <span className="hidden sm:inline">{parteExiste ? "Editar asistencia" : "Pasar asistencia"}</span>
          <span className="sm:hidden">Asistencia</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden border-white/10 bg-[#141414] shadow-2xl sm:max-h-[90vh] sm:rounded-xl sm:border">
            {/* Cabecera fija del modal */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-400">
                  {parteExiste ? "Editar asistencia" : "Pasar asistencia"}
                </h2>
                <p className="mt-0.5 text-[10px] text-white/40">{proyectoNombre}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cuerpo desplazable: el formulario de check-in */}
            <div className="overflow-y-auto px-6 py-5">
              <ParteCheckinForm
                proyectos={[{ id: proyectoId, nombre: proyectoNombre }]}
                empleados={empleados}
                fechaInicial={fecha}
                proyectoInicial={proyectoId}
                proyectoFijo
                compact
                estadoInicial={estadoInicial}
                observacionInicial={observacionInicial}
                onSaved={handleSaved}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
