"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cerrarFormularioAction(formularioId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cerrar_formulario_sst", {
    p_formulario_id: formularioId,
  } as any);
  if (error) throw new Error(error.message);
  revalidatePath("/sst");
}

import { createAdminClient } from "@/lib/supabase/admin";
import { getPerfilActual, puedeGestionarSST } from "@/lib/auth/roles";

export async function eliminarFormularioAction(formularioId: string): Promise<void> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeGestionarSST(perfil?.rol)) {
    throw new Error("No tiene permisos para eliminar formularios SST.");
  }

  // 1. Obtener la ruta del PDF del formulario antes de borrarlo
  const { data: rawForm } = await supabase
    .from("formularios")
    .select("pdf_generado_path")
    .eq("id", formularioId)
    .single();

  const form = rawForm as { pdf_generado_path: string | null } | null;

  // 2. Si tiene un PDF en storage, eliminarlo
  if (form?.pdf_generado_path) {
    const adminSupabase = createAdminClient();
    await adminSupabase.storage.from("pdfs-formularios").remove([form.pdf_generado_path]);
  }

  // 3. Eliminar el formulario (en cascada se borran los registros de las tablas hijas)
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("formularios")
    .delete()
    .eq("id", formularioId);

  if (error) {
    throw new Error("No fue posible eliminar el formulario: " + error.message);
  }

  revalidatePath("/sst");
}


