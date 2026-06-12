"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleUsuarioActivoAction } from "@/lib/actions/admin";

export function UsuarioActivoToggle({
  usuarioId,
  activo,
  disabled,
}: {
  usuarioId: string;
  activo: boolean;
  disabled?: boolean;
}) {
  const [estado, setEstado] = useState(activo);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onToggle() {
    const siguiente = !estado;
    setError(null);
    setEstado(siguiente);
    startTransition(async () => {
      try {
        await toggleUsuarioActivoAction({ usuarioId, activo: siguiente });
      } catch (e) {
        setEstado(!siguiente);
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || isPending}
        aria-pressed={estado}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
          estado ? "bg-success" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            estado ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
      ) : error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : null}
    </div>
  );
}
