"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPuedeFinanzas } from "@/lib/auth/guards";
import type { Proveedor } from "@/lib/data/proveedores";

function revalidarProveedores() {
  revalidatePath("/finanzas/proveedores");
  revalidatePath("/finanzas/presupuesto/[proyectoId]", "page");
}

const ProveedorSchema = z.object({
  nombre: z.string().trim().min(1).max(200),
  nit: z.string().trim().max(40).optional(),
});

export async function crearProveedorAction(
  input: z.infer<typeof ProveedorSchema>,
): Promise<Proveedor> {
  const parsed = ProveedorSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase, perfil } = await assertPuedeFinanzas();
  const { data, error } = await supabase
    .from("proveedores")
    .insert({
      nombre: parsed.data.nombre,
      nit: parsed.data.nit ?? null,
      created_by: perfil.id,
    })
    .select("id, nombre, nit")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un proveedor con ese nombre.");
    throw new Error(error.message);
  }

  revalidarProveedores();
  return data;
}

const EditarProveedorSchema = ProveedorSchema.extend({
  proveedorId: z.string().uuid(),
});

export async function actualizarProveedorAction(
  input: z.infer<typeof EditarProveedorSchema>,
): Promise<void> {
  const parsed = EditarProveedorSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Datos inválidos: ${parsed.error.message}`);

  const { supabase } = await assertPuedeFinanzas();
  const { error } = await supabase
    .from("proveedores")
    .update({ nombre: parsed.data.nombre, nit: parsed.data.nit ?? null })
    .eq("id", parsed.data.proveedorId);

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un proveedor con ese nombre.");
    throw new Error(error.message);
  }

  revalidarProveedores();
}

export async function eliminarProveedorAction(proveedorId: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(proveedorId);
  if (!parsed.success) throw new Error("Identificador de proveedor inválido.");

  const { supabase } = await assertPuedeFinanzas();
  const { error } = await supabase
    .from("proveedores")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data);

  if (error) throw new Error(error.message);

  revalidarProveedores();
}
