"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eliminarUnidadAction } from "@/lib/actions/inventario";

export function EliminarUnidadButton({ unidadId, unidadCodigo }: { unidadId: string; unidadCodigo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [eliminando, startTransition] = useTransition();

  function handleEliminar() {
    const confirmar = window.confirm(
      `¿Está seguro de que desea eliminar la herramienta ${unidadCodigo}? Esta acción no se puede deshacer.`,
    );
    if (!confirmar) return;

    setError(null);
    startTransition(async () => {
      try {
        await eliminarUnidadAction(unidadId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible eliminar la herramienta.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 text-danger hover:bg-danger/10 hover:text-danger"
        onClick={handleEliminar}
        disabled={eliminando}
        aria-label={`Eliminar ${unidadCodigo}`}
      >
        {eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
        Eliminar
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
