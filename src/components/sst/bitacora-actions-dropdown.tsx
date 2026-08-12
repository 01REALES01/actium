"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ClipboardList, ShieldAlert, AlertTriangle, Flame, X, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hoyLocal } from "@/lib/fecha";

type ProyectoOpt = { id: string; nombre: string };

export function BitacoraActionsDropdown({ proyectos }: { proyectos: ProyectoOpt[] }) {
  const router = useRouter();
  const [parteOpen, setParteOpen] = useState(false);
  // Sin preselección: obliga a elegir la obra explícitamente para no registrar
  // por error el parte de un proyecto distinto al que el usuario quería.
  const [proyectoId, setProyectoId] = useState("");
  const [fecha, setFecha] = useState(hoyLocal());

  const abrirModal = () => {
    setProyectoId("");
    setFecha(hoyLocal());
    setParteOpen(true);
  };

  const handleContinuar = () => {
    if (!proyectoId) return;
    setParteOpen(false);
    router.push(`/proyectos/${proyectoId}/parte/${fecha}?abrir=asistencia`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F25C05] px-6 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90 focus:outline-none">
          <Plus className="h-4 w-4" /> Registrar
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-[#1A1A1A] border-white/10 text-white">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              abrirModal();
            }}
            className="hover:bg-white/5 focus:bg-white/5 cursor-pointer py-3"
          >
            <div className="flex items-center gap-3 w-full">
              <ClipboardList className="h-4 w-4 text-[#F25C05]" />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wide">Parte Diario</span>
                <span className="text-[10px] text-white/40">Asistencia y eventos de hoy</span>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer py-3 border-t border-white/5">
            <Link href="/sst/nuevo-ats" className="flex items-center gap-3 w-full">
              <ShieldAlert className="h-4 w-4 text-orange-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wide">Análisis Seguro (ATS)</span>
                <span className="text-[10px] text-white/40">Crear formato ATS diario</span>
              </div>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer py-3">
            <Link href="/sst/permiso-altura" className="flex items-center gap-3 w-full">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wide">Permiso Alturas</span>
                <span className="text-[10px] text-white/40">Trabajo en alturas (Res. 1409)</span>
              </div>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer py-3">
            <Link href="/sst/permiso-caliente" className="flex items-center gap-3 w-full">
              <Flame className="h-4 w-4 text-red-500" />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wide">Permiso Caliente</span>
                <span className="text-[10px] text-white/40">Soldadura y corte</span>
              </div>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {parteOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setParteOpen(false)} />
          <div className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden border-white/10 bg-[#141414] shadow-2xl sm:max-h-[90vh] sm:rounded-xl sm:border">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-400">Pasar asistencia</h2>
                <p className="mt-0.5 text-[10px] text-white/40">Selecciona la obra y la fecha</p>
              </div>
              <button
                onClick={() => setParteOpen(false)}
                className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Obra / Proyecto
                </label>
                <select
                  value={proyectoId}
                  onChange={(e) => setProyectoId(e.target.value)}
                  className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white focus:border-[#F25C05] focus:outline-none"
                >
                  <option value="" className="bg-[#1A1A1A]">
                    {proyectos.length === 0 ? "Sin proyectos" : "Selecciona una obra..."}
                  </option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#1A1A1A]">
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Fecha del parte
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white focus:border-[#F25C05] focus:outline-none [color-scheme:dark]"
                />
              </div>

              <button
                type="button"
                onClick={handleContinuar}
                disabled={!proyectoId}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F25C05] px-6 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90 disabled:opacity-50"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
