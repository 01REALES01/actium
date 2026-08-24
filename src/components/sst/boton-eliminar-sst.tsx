"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { eliminarFormularioAction } from "@/lib/actions/sst";
import { cn } from "@/lib/utils";

type Props = {
  formularioId: string;
  /** `completo` en ficha y móvil; `icono` en la tabla de escritorio. */
  variante?: "completo" | "icono";
  className?: string;
};

export function BotonEliminarSST({ formularioId, variante = "completo", className }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [eliminando, startTransition] = useTransition();

  const handleEliminar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmar = window.confirm(
      "¿Está seguro de que desea eliminar este permiso de forma permanente? Esta acción no se puede deshacer y borrará todos los registros y firmas asociados.",
    );
    if (!confirmar) return;

    setError(null);
    startTransition(async () => {
      try {
        await eliminarFormularioAction(formularioId);
        router.push("/sst");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible eliminar el formulario.");
      }
    });
  };

  const esIcono = variante === "icono";

  return (
    <div className={cn("flex flex-col gap-1", esIcono ? "items-center" : "w-full sm:w-auto sm:items-end", className)}>
      <button
        type="button"
        onClick={handleEliminar}
        disabled={eliminando}
        title="Eliminar permiso"
        aria-label="Eliminar permiso"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 text-danger transition-all duration-200 hover:bg-danger/20 disabled:opacity-50",
          esIcono
            ? "h-11 w-11 min-h-[44px] min-w-[44px]"
            : "h-11 min-h-[44px] w-full px-4 text-[11px] font-semibold uppercase tracking-widest sm:w-auto",
        )}
      >
        {eliminando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {!esIcono && <span>Eliminar permiso</span>}
      </button>
      {error && <span className="text-[10px] font-medium text-danger">{error}</span>}
    </div>
  );
}
