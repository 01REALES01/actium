import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, getRutaInicio } from "@/lib/auth/roles";

export default async function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect(getRutaInicio(perfil?.rol));
  }

  return children;
}
