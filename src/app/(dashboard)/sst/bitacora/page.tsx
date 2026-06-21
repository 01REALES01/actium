import Link from "next/link";
import { ClipboardList, Plus, List, UserCheck, UserMinus, AlertTriangle, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPartes } from "@/lib/data/partes-sst";
import { getPerfilActual, puedeEditarParteDiario } from "@/lib/auth/roles";
import { BitacoraViewToggle } from "@/components/sst/bitacora-view-toggle";

export default async function BitacoraPage() {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  const puedeRegistrar = puedeEditarParteDiario(perfil?.rol);

  // Lectura por admin: tablas SST con RLS activo y auth_rol() rota.
  const partes = await listPartes(createAdminClient());

  const fmtFecha = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold uppercase tracking-tight text-white md:text-4xl">
            <ClipboardList className="h-8 w-8 text-[#F25C05]" />
            Bitácora SST
          </h1>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-white/40 md:text-sm">
            Parte diario de operación por obra · asistencia, inasistencias y eventos
          </p>
        </div>
        {puedeRegistrar && (
          <Link
            href="/sst/bitacora/nuevo"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#F25C05] px-6 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90"
          >
            <Plus className="h-4 w-4" /> Registrar parte de hoy
          </Link>
        )}
      </div>

      {/* Tabs de vistas */}
      <div className="flex w-fit rounded-xl border border-white/10 bg-white/5 p-1">
        <Link href="/sst" className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 transition-all hover:text-white">
          <List className="h-4 w-4" /> <span className="hidden sm:inline">Permisos</span>
        </Link>
        <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg">
          <ClipboardList className="h-4 w-4 text-orange-500" /> <span className="hidden sm:inline">Bitácora</span>
        </div>
      </div>

      {/* Componente Toggle Cliente: Calendario o Lista */}
      <BitacoraViewToggle partes={partes} />
    </div>
  );
}
