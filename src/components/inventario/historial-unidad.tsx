"use client";

import { useState } from "react";
import { History, ArrowRight, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CONDICION_LABEL } from "@/constants/inventario";
import type { MovimientoConRelaciones } from "@/lib/data/inventario";

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistorialUnidad({
  unidadCodigo,
  movimientos,
}: {
  unidadCodigo: string;
  movimientos: MovimientoConRelaciones[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5">
          <History className="h-4 w-4" strokeWidth={1.5} />
          Historial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Historial de {unidadCodigo}</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Préstamos y devoluciones registrados para esta unidad.
          </DialogDescription>
        </DialogHeader>

        {movimientos.length === 0 ? (
          <p className="rounded-actium border border-dashed border-[--border-subtle] p-6 text-center text-sm text-[--text-secondary]">
            Esta unidad todavía no registra préstamos.
          </p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            {movimientos.map((m) => (
              <div key={m.id} className="rounded-actium border border-[--border-subtle] p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[--text-primary]">
                  <ArrowRight className="h-4 w-4 text-actium-orange" strokeWidth={1.5} />
                  {m.proyectos?.nombre ?? "Proyecto eliminado"}
                </div>
                <p className="mt-1 text-xs text-[--text-secondary]">
                  Salida: {formatFechaHora(m.fecha_salida)}
                  {m.responsable?.nombre || m.responsable_nombre
                    ? ` · ${m.responsable?.nombre ?? m.responsable_nombre}`
                    : ""}
                </p>
                {m.notas_salida ? (
                  <p className="mt-1 text-xs text-[--text-secondary]">&ldquo;{m.notas_salida}&rdquo;</p>
                ) : null}

                {m.fecha_devolucion ? (
                  <div className="mt-2 border-t border-[--border-subtle] pt-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-success">
                      <Undo2 className="h-4 w-4" strokeWidth={1.5} />
                      Devuelta
                    </div>
                    <p className="mt-1 text-xs text-[--text-secondary]">
                      {formatFechaHora(m.fecha_devolucion)}
                      {m.condicion_devolucion ? ` · ${CONDICION_LABEL[m.condicion_devolucion]}` : ""}
                    </p>
                    {m.notas_devolucion ? (
                      <p className="mt-1 text-xs text-[--text-secondary]">&ldquo;{m.notas_devolucion}&rdquo;</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-medium text-info">Préstamo abierto</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
