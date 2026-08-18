import { revalidatePath } from "next/cache";

/**
 * Invalida todas las vistas de Finanzas que dependen del ledger de movimientos.
 *
 * Una sola transacción financiera (registrar un abono, anular una factura)
 * mueve cifras en seis pantallas: el hub, el listado de presupuesto, el detalle
 * del proyecto, CxC/CxP y los dos flujos de caja. Antes cada acción revalidaba
 * un subconjunto distinto y algunas pantallas quedaban con datos viejos hasta
 * recargar a mano; centralizar el listado evita que vuelva a desincronizarse.
 */
export function revalidarFinanzas(): void {
  revalidatePath("/finanzas");
  revalidatePath("/finanzas/cxc");
  revalidatePath("/finanzas/cxp");
  revalidatePath("/finanzas/presupuesto");
  revalidatePath("/finanzas/presupuesto/[proyectoId]", "page");
  revalidatePath("/finanzas/flujo-caja");
  revalidatePath("/finanzas/flujo-caja/[proyectoId]", "page");
}
