import { Building2, Users, UserCheck, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminStats } from "@/lib/data/organizacion";

export const dynamic = "force-dynamic";

type StatCard = {
  label: string;
  value: number;
  icon: typeof Building2;
  hint: string;
};

export default async function AdminOverviewPage() {
  const supabase = createClient();
  const stats = await getAdminStats(supabase);

  const cards: StatCard[] = [
    { label: "Empresas", value: stats.totalEmpresas, icon: Building2, hint: "Total registradas" },
    { label: "Usuarios", value: stats.totalUsuarios, icon: Users, hint: "Cuentas en la plataforma" },
    { label: "Usuarios activos", value: stats.usuariosActivos, icon: UserCheck, hint: "Con acceso habilitado" },
    { label: "Proyectos en curso", value: stats.proyectosEnCurso, icon: Activity, hint: "Estado en curso" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-actium border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-actium-orange/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                  {card.label}
                </span>
                <Icon className="h-5 w-5 text-actium-orange" strokeWidth={1.5} />
              </div>
              <p className="mt-3 font-display text-4xl text-white">{card.value}</p>
              <p className="mt-1 text-xs text-white/30">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-actium border border-white/5 bg-white/[0.03] p-6">
        <h2 className="font-sans text-lg font-semibold text-white">Gestión de la plataforma</h2>
        <p className="mt-1 text-sm text-white/40">
          Desde este panel puede administrar empresas, asignar roles y habilitar o
          deshabilitar el acceso de los usuarios existentes.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-white/50">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-actium-orange" />
            <span>
              <span className="text-white/70">Empresas:</span> crear nuevas organizaciones y
              activar o desactivar su operación.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-actium-orange" />
            <span>
              <span className="text-white/70">Usuarios:</span> cambiar el rol, asignar empresa y
              controlar el acceso de cada cuenta.
            </span>
          </li>
        </ul>
        <p className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-white/30">
          Nota: la creación de cuentas nuevas se realiza desde el registro de la plataforma. Este
          panel administra los usuarios ya existentes.
        </p>
      </div>
    </div>
  );
}
