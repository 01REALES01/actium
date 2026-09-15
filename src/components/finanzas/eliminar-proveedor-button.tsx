"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eliminarProveedorAction } from "@/lib/actions/proveedores";

export function EliminarProveedorButton({ proveedorId, proveedorNombre }: { proveedorId: string; proveedorNombre: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [eliminando, startTransition] = useTransition();

  function handleEliminar() {
    const confirmar = window.confirm(
      `¿Eliminar el proveedor "${proveedorNombre}"? Las facturas ya registradas conservan su nombre y NIT.`,
    );
    if (!confirmar) return;

    setError(null);
    startTransition(async () => {
      try {
        await eliminarProveedorAction(proveedorId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible eliminar el proveedor.");
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
        aria-label={`Eliminar ${proveedorNombre}`}
      >
        {eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
        Eliminar
      </Button>
      {error ? <p className="max-w-xs text-right text-xs text-danger">{error}</p> : null}
    </div>
  );
}
