"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegistrarPagoCuotaCxpDialog } from "@/components/finanzas/registrar-pago-cuota-cxp-dialog";
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
    <div className="flex flex-col gap-4">
      {cuentas.map((c) => {
        const estadoEfectivo: FacturaEstado = c.vencida ? "vencida" : c.estado;
        const activa = c.estado === "pendiente" || c.estado === "parcial";

        return (
          <div key={c.id} className="rounded-actium border border-[--border-subtle] bg-[--bg-elevated]">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-sans text-sm font-semibold text-[--text-primary]">{c.proveedor_nombre}</p>
                <p className="text-xs text-[--text-secondary]">
                  Factura {c.numero_factura}
                  {mostrarProyecto && c.proyectos?.nombre ? ` · ${c.proyectos.nombre}` : ""}
                  {c.cuotas.length > 1 ? ` · ${c.cuotas.length} cuotas` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-[--text-primary]">
                    {formatCOP(c.monto_pagado)} / {formatCOP(c.monto_total)}
                  </p>
                  <Badge variant={ESTADO_VARIANT[estadoEfectivo]}>{ESTADO_LABEL[estadoEfectivo]}</Badge>
                </div>
                {puedeEscribir && activa ? (
                  <Button variant="ghost" size="sm" disabled={isPending} onClick={() => anular(c.id)} title="Anular">
                    <Ban className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="overflow-x-auto border-t border-[--border-subtle]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white">
                    <th className="px-4 py-2 text-left">Cuota</th>
                    <th className="px-4 py-2 text-right">Monto</th>
                    <th className="px-4 py-2 text-right">Pagado</th>
                    <th className="px-4 py-2 text-left">Vence</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {c.cuotas.map((cuota) => {
                    const cuotaEstadoEfectivo: FacturaEstado = cuota.vencida ? "vencida" : cuota.estado;
                    const cuotaActiva = cuota.estado === "pendiente" || cuota.estado === "parcial";
                    const saldoCuota = cuota.monto - cuota.monto_pagado;
                    return (
                      <tr key={cuota.id} className="border-b border-[--border-subtle] last:border-b-0 hover:bg-[--bg-hover]">
                        <td className="px-4 py-2 text-[--text-primary]">#{cuota.numero_cuota}</td>
                        <td className="px-4 py-2 text-right text-[--text-primary]">{formatCOP(cuota.monto)}</td>
                        <td className="px-4 py-2 text-right text-[--text-secondary]">{formatCOP(cuota.monto_pagado)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-[--text-secondary]">
                          {formatFechaCorta(cuota.fecha_vencimiento)}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={ESTADO_VARIANT[cuotaEstadoEfectivo]}>{ESTADO_LABEL[cuotaEstadoEfectivo]}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {puedeEscribir && cuotaActiva ? (
                            <RegistrarPagoCuotaCxpDialog
                              cuotaId={cuota.id}
                              numeroCuota={cuota.numero_cuota}
                              numeroFactura={c.numero_factura}
                              saldoPendiente={saldoCuota}
                            />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
