"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarFaltantesPerdidasAction } from "@/lib/actions/inventario";

export function MarcarPerdidasButton({ conteoId, cantidad }: { conteoId: string; cantidad: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [pendiente, startTransition] = useTransition();

  function handleClick() {
    const confirmar = window.confirm(
      `¿Marcar las ${cantidad} herramientas faltantes como perdidas? Esto cierra su préstamo y las quita de la obra.`,
    );
    if (!confirmar) return;

    setError(null);
    startTransition(async () => {
      try {
        await marcarFaltantesPerdidasAction(conteoId);
        setHecho(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible actualizar las herramientas faltantes.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="lg"
        variant="secondary"
        className="min-h-[44px] gap-1.5 border border-danger/30 text-danger hover:bg-danger/10"
        onClick={handleClick}
        disabled={pendiente || hecho}
      >
        {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />}
        {hecho ? "Herramientas marcadas como perdidas" : `Marcar las ${cantidad} como perdidas`}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
