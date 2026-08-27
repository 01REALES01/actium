"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eliminarCatalogoAction } from "@/lib/actions/inventario";

export function EliminarCatalogoButton({ catalogoId, catalogoNombre }: { catalogoId: string; catalogoNombre: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [eliminando, startTransition] = useTransition();

  function handleEliminar() {
    const confirmar = window.confirm(
      `¿Está seguro de que desea eliminar "${catalogoNombre}" del catálogo? Esta acción no se puede deshacer.`,
    );
    if (!confirmar) return;

    setError(null);
    startTransition(async () => {
      try {
        await eliminarCatalogoAction(catalogoId);
        router.push("/inventario/herramientas");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible eliminar el tipo de herramienta.");
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
        aria-label={`Eliminar ${catalogoNombre}`}
      >
        {eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
        Eliminar
      </Button>
      {error ? <p className="max-w-xs text-right text-xs text-danger">{error}</p> : null}
    </div>
  );
}
