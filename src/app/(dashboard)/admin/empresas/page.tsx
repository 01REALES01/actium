import { createClient } from "@/lib/supabase/server";
import { listEmpresas } from "@/lib/data/organizacion";
import { CrearEmpresaModal } from "@/components/admin/crear-empresa-modal";
import { EmpresaToggle } from "@/components/admin/empresa-toggle";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export default async function AdminEmpresasPage() {
  const supabase = createClient();
  const empresas = await listEmpresas(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/40">
          {empresas.length} {empresas.length === 1 ? "empresa registrada" : "empresas registradas"}
        </p>
        <CrearEmpresaModal />
      </div>

      {empresas.length === 0 ? (
        <div className="rounded-actium border border-white/5 bg-white/[0.03] p-10 text-center text-sm text-white/40">
          Aún no hay empresas registradas. Crea la primera.
        </div>
      ) : (
        <div className="overflow-hidden rounded-actium border border-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">NIT</th>
                <th className="px-4 py-3 font-medium">Ciudad</th>
                <th className="px-4 py-3 font-medium">Registrada</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr
                  key={empresa.id}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{empresa.nombre}</p>
                    {empresa.email ? (
                      <p className="text-xs text-white/30">{empresa.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-white/60">{empresa.nit}</td>
                  <td className="px-4 py-3 text-white/60">{empresa.ciudad ?? "—"}</td>
                  <td className="px-4 py-3 text-white/40">{formatDate(empresa.created_at)}</td>
                  <td className="px-4 py-3">
                    <EmpresaToggle empresaId={empresa.id} activa={empresa.activa} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
