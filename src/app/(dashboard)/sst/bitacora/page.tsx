import Link from "next/link";
import { ClipboardList, Plus, CalendarDays, List, UserCheck, UserMinus, AlertTriangle, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPartes } from "@/lib/data/partes-sst";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";

export default async function BitacoraPage() {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  const puedeRegistrar = puedeCrearFormularioSST(perfil?.rol);

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
        <Link href="/sst/calendario" className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/40 transition-all hover:text-white">
          <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Calendario</span>
        </Link>
      </div>

      {/* Lista de partes */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Historial de partes</h3>

        {partes.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-white/20" />
            <p className="text-sm text-white/40">
              Aún no hay partes registrados. Registre el parte del primer día de operación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Fecha</th>
                  <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Obra</th>
                  <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Programado</th>
                  <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Presentes</th>
                  <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Ausentes</th>
                  <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Eventos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {partes.map((p) => (
                  <tr key={`${p.proyecto_id}-${p.fecha}`} className="group transition-colors hover:bg-white/[0.03]">
                    <td className="py-4">
                      <Link href={`/proyectos/${p.proyecto_id}/parte/${p.fecha}`} className="block">
                        <p className="text-xs font-bold text-white transition-colors group-hover:text-[#F25C05]">
                          {fmtFecha(p.fecha)}
                        </p>
                      </Link>
                    </td>
                    <td className="py-4">
                      <Link href={`/proyectos/${p.proyecto_id}/parte/${p.fecha}`} className="block">
                        <p className="max-w-[220px] truncate text-sm text-white/80">{p.proyecto_nombre}</p>
                      </Link>
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-white">{p.total_programado}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-400">
                        <UserCheck className="h-3.5 w-3.5" />
                        {p.presentes}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-400">
                        <UserMinus className="h-3.5 w-3.5" />
                        {p.ausentes}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {p.incidentes}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {p.accidentes}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
