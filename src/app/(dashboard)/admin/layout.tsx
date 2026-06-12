import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/auth/roles";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  // Guard fuerte: solo super_admin entra al panel de administración.
  if (perfil?.rol !== "super_admin") {
    redirect("/proyectos");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl text-white">Administración</h1>
          <span className="rounded-full border border-actium-orange/30 bg-actium-orange/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-actium-orange">
            Super Admin
          </span>
        </div>
        <p className="mt-1 text-sm text-white/40">
          Gestión global de empresas, usuarios y roles de la plataforma.
        </p>
      </div>

      <AdminTabs />

      <div>{children}</div>
    </div>
  );
}
