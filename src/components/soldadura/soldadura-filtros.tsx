"use client";

// Filtros del archivo de documentos de soldadura. La búsqueda no dispara en
// cada tecla: el archivo puede tener cientos de documentos y cada consulta va
// al servidor, así que se envía al presionar Enter o al salir del campo.

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { TIPOS_SOLDADURA, VARIANTES_SOLDADURA, SIGLA_TIPO_SOLDADURA, NOMBRE_VARIANTE } from "@/constants/soldadura";

const SELECT =
  "h-11 min-h-[44px] w-full rounded-xl border border-border-default bg-bg-secondary px-4 text-sm font-medium text-text-primary focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20 transition-all duration-200 cursor-pointer [&>option]:bg-bg-elevated";

export function SoldaduraFiltros({
  tipo,
  variante,
  q,
}: {
  tipo: string;
  variante: string;
  q: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [termino, setTermino] = useState(q);

  const aplicar = (clave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!valor || valor === "todos") params.delete(clave);
    else params.set(clave, valor);
    router.push(`/soldadura?${params.toString()}`);
  };

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.5} />
        <input
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          onBlur={() => aplicar("q", termino.trim())}
          onKeyDown={(e) => e.key === "Enter" && aplicar("q", termino.trim())}
          placeholder="Buscar por número, proceso, soldador o referencia"
          className="h-11 min-h-[44px] w-full rounded-xl border border-border-default bg-bg-secondary pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20 transition-all duration-200"
        />
      </div>

      <select value={tipo} onChange={(e) => aplicar("tipo", e.target.value)} className={SELECT} aria-label="Tipo de documento">
        <option value="todos">Todos los documentos</option>
        {TIPOS_SOLDADURA.map((t) => (
          <option key={t} value={t}>
            {SIGLA_TIPO_SOLDADURA[t]}
          </option>
        ))}
      </select>

      <select value={variante} onChange={(e) => aplicar("variante", e.target.value)} className={SELECT} aria-label="Formato normativo">
        <option value="todos">Ambos formatos</option>
        {VARIANTES_SOLDADURA.map((v) => (
          <option key={v} value={v}>
            {NOMBRE_VARIANTE[v]}
          </option>
        ))}
      </select>
    </div>
  );
}
