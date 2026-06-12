"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_OPTIONS } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database.types";
import { cambiarRolUsuarioAction } from "@/lib/actions/admin";

export function UsuarioRolSelect({
  usuarioId,
  rol,
  disabled,
}: {
  usuarioId: string;
  rol: UserRole;
  disabled?: boolean;
}) {
  const [valor, setValor] = useState<UserRole>(rol);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevo = e.target.value as UserRole;
    const anterior = valor;
    setError(null);
    setValor(nuevo);
    startTransition(async () => {
      try {
        await cambiarRolUsuarioAction({ usuarioId, rol: nuevo });
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
          "rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white focus:border-actium-orange focus:outline-none disabled:opacity-50",
        )}
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1A1A1A]">
            {opt.label}
          </option>
        ))}
      </select>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" /> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
