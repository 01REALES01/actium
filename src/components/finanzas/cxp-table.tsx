"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegistrarPagoDialog } from "@/components/finanzas/registrar-pago-dialog";
import { anularCxPAction } from "@/lib/actions/cxp";
import { formatCOP, formatFechaCorta } from "@/lib/format";
import type { FacturaEstado } from "@/types/database.types";
import type { CxPConRelaciones } from "@/lib/data/cxp";

const ESTADO_VARIANT: Record<FacturaEstado, "info" | "success" | "warning" | "destructive" | "secondary"> = {
  pendiente: "info",
  parcial: "warning",
  pagada: "success",
  vencida: "destructive",
  anulada: "secondary",
};

const ESTADO_LABEL: Record<FacturaEstado, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagada: "Pagada",
  vencida: "Vencida",
  anulada: "Anulada",
};

export function CxPTable({
  cuentas,
  mostrarProyecto = false,
  puedeEscribir = false,
}: {
  cuentas: CxPConRelaciones[];
  mostrarProyecto?: boolean;
  puedeEscribir?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function anular(id: string) {
    startTransition(async () => {
      try {
        await anularCxPAction(id);
        router.refresh();
      } catch {
        // el error se refleja simplemente no anulando; sin toast global en este módulo
      }
    });
  }

  if (cuentas.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        Aún no hay cuentas por pagar registradas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-actium border border-[--border-subtle]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white">
            {mostrarProyecto ? <th className="px-4 py-3 text-left">Proyecto</th> : null}
            <th className="px-4 py-3 text-left">Proveedor</th>
            <th className="px-4 py-3 text-left">Factura</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Pagado</th>
            <th className="px-4 py-3 text-left">Vence</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {cuentas.map((c) => {
            const estadoEfectivo: FacturaEstado = c.vencida ? "vencida" : c.estado;
            const saldo = c.monto_total - c.monto_pagado;
            const activa = c.estado === "pendiente" || c.estado === "parcial";
            return (
              <tr key={c.id} className="border-b border-[--border-subtle] hover:bg-[--bg-hover]">
                {mostrarProyecto ? (
                  <td className="px-4 py-3 text-[--text-secondary]">{c.proyectos?.nombre ?? "—"}</td>
                ) : null}
                <td className="px-4 py-3 font-medium text-[--text-primary]">{c.proveedor_nombre}</td>
                <td className="px-4 py-3 text-[--text-secondary]">{c.numero_factura}</td>
                <td className="px-4 py-3 text-right text-[--text-primary]">{formatCOP(c.monto_total)}</td>
                <td className="px-4 py-3 text-right text-[--text-primary]">{formatCOP(c.monto_pagado)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[--text-secondary]">
                  {formatFechaCorta(c.fecha_vencimiento)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={ESTADO_VARIANT[estadoEfectivo]}>{ESTADO_LABEL[estadoEfectivo]}</Badge>
                </td>
                <td className="px-4 py-3">
                  {puedeEscribir && activa ? (
                    <div className="flex justify-end gap-1.5">
                      <RegistrarPagoDialog id={c.id} numeroFactura={c.numero_factura} saldoPendiente={saldo} />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => anular(c.id)}
                        title="Anular"
                      >
                        <Ban className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
