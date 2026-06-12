"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/auth/roles";

// Todas estas acciones son de super_admin. La RLS de la base de datos ya
// restringe insert/update/delete de empresas y usuarios a super_admin, pero
// añadimos una verificación explícita en servidor como defensa en profundidad
// (evita ejecutar la mutación si el perfil no corresponde).

async function assertSuperAdmin() {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (perfil?.rol !== "super_admin") {
    throw new Error("No tiene permisos para esta acción.");
  }
  return supabase;
}

// ─── Empresas ─────────────────────────────────────────────────────────────────

const CrearEmpresaSchema = z.object({
  nombre: z.string().min(2).max(160),
  nit: z.string().min(1).max(40),
  ciudad: z.string().max(120).optional(),
  direccion: z.string().max(200).optional(),
  telefono: z.string().max(40).optional(),
  email: z.string().email().max(160).optional().or(z.literal("")),
});

export async function crearEmpresaAction(
  input: z.infer<typeof CrearEmpresaSchema>,
): Promise<{ id: string }> {
  const parsed = CrearEmpresaSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Datos inválidos: ${parsed.error.issues[0]?.message ?? parsed.error.message}`);
  }

  const supabase = await assertSuperAdmin();
  const { data, error } = await supabase
    .from("empresas")
    .insert({
      nombre: parsed.data.nombre,
      nit: parsed.data.nit,
      ciudad: parsed.data.ciudad ?? null,
      direccion: parsed.data.direccion ?? null,
      telefono: parsed.data.telefono ?? null,
      email: parsed.data.email || null,
    } as any)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya existe una empresa con ese NIT.");
    throw new Error(error.message);
  }

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
  return { id: (data as { id: string }).id };
}

const ToggleEmpresaSchema = z.object({
  empresaId: z.string().min(1),
  activa: z.boolean(),
});

export async function toggleEmpresaActivaAction(
  input: z.infer<typeof ToggleEmpresaSchema>,
): Promise<void> {
  const parsed = ToggleEmpresaSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const supabase = await assertSuperAdmin();
  const { error } = await (supabase.from("empresas") as any)
    .update({ activa: parsed.data.activa })
    .eq("id", parsed.data.empresaId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/empresas");
}

// ─── Usuarios ──────────────────────────────────────────────────────────────────

const ROL_VALUES = [
  "super_admin",
  "admin",
  "cliente_principal",
  "subcliente",
  "sst",
  "operativo",
  "financiero",
] as const;

const CambiarRolSchema = z.object({
  usuarioId: z.string().min(1),
  rol: z.enum(ROL_VALUES),
});

export async function cambiarRolUsuarioAction(
  input: z.infer<typeof CambiarRolSchema>,
): Promise<void> {
  const parsed = CambiarRolSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const supabase = await assertSuperAdmin();
  const { error } = await (supabase.from("usuarios") as any)
    .update({ rol: parsed.data.rol })
    .eq("id", parsed.data.usuarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}

const ToggleUsuarioSchema = z.object({
  usuarioId: z.string().min(1),
  activo: z.boolean(),
});

export async function toggleUsuarioActivoAction(
  input: z.infer<typeof ToggleUsuarioSchema>,
): Promise<void> {
  const parsed = ToggleUsuarioSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const supabase = await assertSuperAdmin();
  const { error } = await (supabase.from("usuarios") as any)
    .update({ activo: parsed.data.activo })
    .eq("id", parsed.data.usuarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}

const AsignarEmpresaSchema = z.object({
  usuarioId: z.string().min(1),
  empresaId: z.string().min(1).nullable(),
});

export async function asignarEmpresaUsuarioAction(
  input: z.infer<typeof AsignarEmpresaSchema>,
): Promise<void> {
  const parsed = AsignarEmpresaSchema.safeParse(input);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const supabase = await assertSuperAdmin();
  const { error } = await (supabase.from("usuarios") as any)
    .update({ empresa_id: parsed.data.empresaId })
    .eq("id", parsed.data.usuarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/usuarios");
}
