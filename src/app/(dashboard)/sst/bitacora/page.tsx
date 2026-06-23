import Link from "next/link";
import { ClipboardList, Plus, List, UserCheck, UserMinus, AlertTriangle, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPartes } from "@/lib/data/partes-sst";
import { getPerfilActual, puedeEditarParteDiario } from "@/lib/auth/roles";
import { BitacoraViewToggle } from "@/components/sst/bitacora-view-toggle";
import { BitacoraActionsDropdown } from "@/components/sst/bitacora-actions-dropdown";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BitacoraPage() {
  noStore();
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  const puedeRegistrar = puedeEditarParteDiario(perfil?.rol);

  // Lectura por admin: tablas SST con RLS activo y auth_rol() rota.
  const db = createAdminClient();
  const partes = await listPartes(db);
  const { data: formulariosRaw, error } = await db
    .from("formularios")
    .select("id, tipo, fecha_inicio, pdf_generado_path, proyecto_id, proyectos(nombre)")
    .in("tipo", ["ats", "permiso_altura", "permiso_caliente"])
    .not("pdf_generado_path", "is", null);

  if (error) {
    console.error("Error fetching formularios:", error);
  }

  const formulariosSST = (formulariosRaw || []).map((f) => ({
    id: f.id,
    tipo: f.tipo,
    fecha: (f.fecha_inicio || "").split("T")[0],
    pdf_generado_path: f.pdf_generado_path || "",
    proyecto_id: f.proyecto_id,
    proyecto_nombre: (f.proyectos as any)?.nombre || "Proyecto Desconocido",
  }));

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
          <BitacoraActionsDropdown />
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
      <BitacoraViewToggle partes={partes} formularios={formulariosSST} />
    </div>
  );
}
