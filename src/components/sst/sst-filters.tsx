"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface SSTFiltersProps {
  currentTipo: string;
  currentEstado: string;
}

export function SSTFilters({ currentTipo, currentEstado }: SSTFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "todos") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/sst?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <select
        value={currentTipo}
        onChange={(e) => updateFilter("tipo", e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all cursor-pointer [&>option]:bg-[#1A1A1A]"
      >
        <option value="todos">Todos los tipos</option>
        <option value="ats">ATS</option>
        <option value="permiso_altura">Alturas</option>
        <option value="permiso_caliente">Caliente</option>
      </select>

      <select
        value={currentEstado}
        onChange={(e) => updateFilter("estado", e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-[#F25C05]/30 transition-all cursor-pointer [&>option]:bg-[#1A1A1A]"
      >
        <option value="todos">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="completado">Completado</option>
        <option value="firmado">Firmado</option>
        <option value="archivado">Archivado</option>
      </select>
    </div>
  );
}
