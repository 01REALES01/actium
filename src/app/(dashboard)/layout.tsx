import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, getNavItems } from "@/lib/auth/roles";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const perfil = await getPerfilActual(supabase);
  const navItems = getNavItems(perfil?.rol);

  return (
    <DashboardShell
      userEmail={user.email}
      nombre={perfil?.nombre ?? user.email ?? "Usuario"}
      rol={perfil?.rol ?? null}
      cargo={perfil?.cargo ?? null}
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
