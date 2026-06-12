"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { asignarEmpresaUsuarioAction } from "@/lib/actions/admin";

type EmpresaOpcion = { id: string; nombre: string };

export function UsuarioEmpresaSelect({
  usuarioId,
  empresaId,
  empresas,
  disabled,
}: {
  usuarioId: string;
  empresaId: string | null;
  empresas: EmpresaOpcion[];
  disabled?: boolean;
}) {
  const [valor, setValor] = useState<string>(empresaId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevo = e.target.value;
    const anterior = valor;
    setError(null);
    setValor(nuevo);
    startTransition(async () => {
      try {
        await asignarEmpresaUsuarioAction({ usuarioId, empresaId: nuevo || null });
      } catch (err) {
        setValor(anterior);
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={valor}
        onChange={onChange}
        disabled={disabled || isPending}
        className={cn(
          "max-w-[180px] rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white focus:border-actium-orange focus:outline-none disabled:opacity-50",
        )}
      >
        <option value="" className="bg-[#1A1A1A]">
          Sin empresa
        </option>
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id} className="bg-[#1A1A1A]">
            {empresa.nombre}
          </option>
        ))}
      </select>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" /> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
