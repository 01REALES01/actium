import type { TypedSupabaseClient, Tables } from "@/types/database.types";

type Client = TypedSupabaseClient;

export type FotoFormularioConUrl = Tables<"formulario_fotos"> & {
  signedUrl: string | null;
};

/**
 * Fotos anexas a un formulario SST, con URL firmada para mostrarlas.
 *
 * Las URLs vencen en una hora. La página que las consume es un server component,
 * así que un refresco las renueva; no hay estado que refrescar en cliente.
 */
export async function getFotosFormulario(
  supabase: Client,
  formularioId: string,
): Promise<FotoFormularioConUrl[]> {
  const { data, error } = await supabase
    .from("formulario_fotos")
    .select("*")
    .eq("formulario_id", formularioId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  const fotos = data ?? [];
  if (fotos.length === 0) return [];

  return Promise.all(
    fotos.map(async (foto) => {
      try {
        const { data: urlData } = await supabase.storage
          .from("fotos-proyectos")
          .createSignedUrl(foto.storage_path, 3600);
        return { ...foto, signedUrl: urlData?.signedUrl ?? null };
      } catch {
        return { ...foto, signedUrl: null };
      }
    }),
  );
}
