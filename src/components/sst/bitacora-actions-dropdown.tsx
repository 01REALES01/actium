"use client";

import Link from "next/link";
import { Plus, ClipboardList, ShieldAlert, AlertTriangle, Flame } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function BitacoraActionsDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F25C05] px-6 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90 focus:outline-none">
        <Plus className="h-4 w-4" /> Registrar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-[#1A1A1A] border-white/10 text-white">
        <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5 cursor-pointer py-3">
          <Link href="/sst/bitacora/nuevo" className="flex items-center gap-3 w-full">
            <ClipboardList className="h-4 w-4 text-[#F25C05]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wide">Parte Diario</span>
              <span className="text-[10px] text-white/40">Asistencia y eventos de hoy</span>
            </div>
          </Link>
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
  );
}
