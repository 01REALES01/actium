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

  const selectClass =
    "h-11 min-h-[44px] w-full rounded-xl border border-border-default bg-bg-secondary px-4 text-sm font-medium text-text-primary focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20 transition-all duration-200 cursor-pointer [&>option]:bg-bg-elevated";

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">
      <label className="sr-only" htmlFor="filtro-tipo-sst">
        Tipo de permiso
      </label>
      <select
        id="filtro-tipo-sst"
        value={currentTipo}
        onChange={(e) => updateFilter("tipo", e.target.value)}
        className={selectClass}
      >
        <option value="todos">Todos los tipos</option>
        <option value="ats">ATS</option>
        <option value="permiso_altura">Alturas</option>
        <option value="permiso_caliente">Caliente</option>
        <option value="preoperacional">Preoperacional</option>
        <option value="entrega_epp">Entrega EPP</option>
      </select>

      <label className="sr-only" htmlFor="filtro-estado-sst">
        Estado del permiso
      </label>
      <select
        id="filtro-estado-sst"
        value={currentEstado}
        onChange={(e) => updateFilter("estado", e.target.value)}
        className={selectClass}
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
