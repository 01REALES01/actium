"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { asignarSubempresaUsuarioAction } from "@/lib/actions/admin";

type SubempresaOpcion = { id: string; nombre: string; empresaId: string };

export function UsuarioSubempresaSelect({
  usuarioId,
  subempresaId,
  empresaId,
  subempresas,
  disabled,
}: {
  usuarioId: string;
  subempresaId: string | null;
  empresaId: string | null;
  subempresas: SubempresaOpcion[];
  disabled?: boolean;
}) {
  const [valor, setValor] = useState<string>(subempresaId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const opciones = empresaId
    ? subempresas.filter((s) => s.empresaId === empresaId)
    : [];
  const sinEmpresa = !empresaId;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevo = e.target.value;
    const anterior = valor;
    setError(null);
    setValor(nuevo);
    startTransition(async () => {
      try {
        await asignarSubempresaUsuarioAction({ usuarioId, subempresaId: nuevo || null });
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
        disabled={disabled || sinEmpresa || isPending}
        className={cn(
          "max-w-[180px] rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white focus:border-actium-orange focus:outline-none disabled:opacity-50",
        )}
      >
        <option value="" className="bg-[#1A1A1A]">
          {sinEmpresa ? "Seleccione una empresa primero" : "Sin subempresa"}
        </option>
        {opciones.map((subempresa) => (
          <option key={subempresa.id} value={subempresa.id} className="bg-[#1A1A1A]">
            {subempresa.nombre}
          </option>
        ))}
      </select>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" /> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
