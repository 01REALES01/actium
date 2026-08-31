import { revalidatePath } from "next/cache";

/**
 * Invalida las vistas de Inventario que dependen del catálogo, las unidades o
 * el stock de EPP. Molde: revalidar-finanzas.ts.
 */
export function revalidarInventario(): void {
  revalidatePath("/inventario");
  revalidatePath("/inventario/herramientas");
  revalidatePath("/inventario/herramientas/[catalogoId]", "page");
  revalidatePath("/inventario/herramientas/conteos");
  revalidatePath("/inventario/herramientas/conteos/nuevo");
  revalidatePath("/inventario/herramientas/conteos/[conteoId]", "page");
  revalidatePath("/inventario/epp");
  revalidatePath("/inventario/epp/[proyectoId]", "page");
}
