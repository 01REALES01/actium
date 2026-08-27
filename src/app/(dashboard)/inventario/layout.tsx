import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeVerInventario, getRutaInicio } from "@/lib/auth/roles";

export default async function InventarioLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !puedeVerInventario(perfil.rol)) {
    redirect(getRutaInicio(perfil?.rol));
  }

  return children;
}
