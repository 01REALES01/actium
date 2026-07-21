"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setSobregiroAction } from "@/lib/actions/presupuesto";

export function AutorizarSobregiroButton({
  proyectoId,
  activo,
}: {
  proyectoId: string;
  activo: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setLoading(true);
    try {
      await setSobregiroAction({ proyectoId, activo: !activo });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la autorización.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={activo ? "secondary" : "outline"}
        size="sm"
        onClick={toggle}
        disabled={loading}
        className="gap-1.5"
        title={
          activo
            ? "Los movimientos pueden superar el techo de los rubros. Clic para revertir."
            : "Permite que los movimientos superen el techo de los rubros (con trazabilidad)."
        }
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : activo ? (
          <ShieldCheck className="h-4 w-4 text-warning" strokeWidth={1.5} />
        ) : (
          <ShieldAlert className="h-4 w-4" strokeWidth={1.5} />
        )}
        {activo ? "Extra presupuesto autorizado" : "Autorizar extra presupuesto"}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
