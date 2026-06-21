"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FieldWorkersFilters({
  proyectos,
  cargos,
}: {
  proyectos: { id: string; nombre: string }[];
  cargos: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProyecto = searchParams.get("proyecto") || "all";
  const currentCargo = searchParams.get("cargo") || "all";
  const currentStatus = searchParams.get("status") || "all";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl lg:flex-row lg:items-center backdrop-blur-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-1 flex-col gap-4 md:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Proyecto:</label>
          <Select value={currentProyecto} onValueChange={(v) => updateFilter("proyecto", v)}>
            <SelectTrigger className="h-10 border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Todos los Proyectos" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
              <SelectItem value="all">Todos los Proyectos</SelectItem>
              {proyectos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Cargo:</label>
          <Select value={currentCargo} onValueChange={(v) => updateFilter("cargo", v)}>
            <SelectTrigger className="h-10 border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Todos los Cargos" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
              <SelectItem value="all">Todos los Cargos</SelectItem>
              {cargos.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Cumplimiento:</label>
          <Select value={currentStatus} onValueChange={(v) => updateFilter("status", v)}>
            <SelectTrigger className="h-10 border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Todos los Estados" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="ok">Al Día</SelectItem>
              <SelectItem value="warning">Por Vencer</SelectItem>
              <SelectItem value="expired">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="relative z-10 lg:mt-5">
        <button className="flex items-center gap-2 px-4 text-xs font-bold text-white/40 uppercase tracking-widest hover:text-[#ff4500] transition-colors">
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>
    </div>
  );
}
