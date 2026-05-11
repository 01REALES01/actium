"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cerrarFormularioAction(formularioId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cerrar_formulario_sst", {
    p_formulario_id: formularioId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/sst");
}
