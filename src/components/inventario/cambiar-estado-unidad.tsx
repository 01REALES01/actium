"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cambiarEstadoUnidadAction } from "@/lib/actions/inventario";
import { ESTADO_HERRAMIENTA_LABEL } from "@/constants/inventario";
import type { HerramientaEstado } from "@/types/database.types";

const ESTADOS_DISPONIBLES: HerramientaEstado[] = ["disponible", "mantenimiento", "baja", "perdida"];

/** Cambia el estado de una unidad que NO está asignada (bodega/mantenimiento/baja/perdida). */
export function CambiarEstadoUnidad({ unidadId, estadoActual }: { unidadId: string; estadoActual: HerramientaEstado }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(value: string) {
    if (value === estadoActual) return;
    setError(null);
    setLoading(true);
    try {
      await cambiarEstadoUnidadAction({ unidadId, estado: value as "disponible" | "mantenimiento" | "baja" | "perdida" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cambiar el estado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={estadoActual} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="h-9 w-[9.5rem] text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {ESTADOS_DISPONIBLES.map((e) => (
            <SelectItem key={e} value={e}>
              {ESTADO_HERRAMIENTA_LABEL[e]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
