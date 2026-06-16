import { createClient } from "@/lib/supabase/server";
import { listEmpresas, listSubempresasConEmpresa } from "@/lib/data/organizacion";
import { CrearSubempresaModal } from "@/components/admin/crear-subempresa-modal";
import { SubempresaToggle } from "@/components/admin/subempresa-toggle";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export default async function AdminSubempresasPage() {
  const supabase = createClient();
  const [empresas, subempresas] = await Promise.all([
    listEmpresas(supabase),
    listSubempresasConEmpresa(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/40">
          {subempresas.length}{" "}
          {subempresas.length === 1 ? "subempresa registrada" : "subempresas registradas"}
        </p>
        <CrearSubempresaModal
          empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        />
      </div>

      {subempresas.length === 0 ? (
        <div className="rounded-actium border border-white/5 bg-white/[0.03] p-10 text-center text-sm text-white/40">
          Aún no hay subempresas registradas. Crea la primera.
        </div>
      ) : (
        <div className="overflow-hidden rounded-actium border border-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-3 font-medium">Subempresa</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">NIT</th>
                <th className="px-4 py-3 font-medium">Registrada</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {subempresas.map((subempresa) => (
                <tr
                  key={subempresa.id}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{subempresa.nombre}</p>
                    {subempresa.descripcion ? (
                      <p className="text-xs text-white/30">{subempresa.descripcion}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-white/60">{subempresa.empresas?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">{subempresa.nit ?? "—"}</td>
                  <td className="px-4 py-3 text-white/40">{formatDate(subempresa.created_at)}</td>
                  <td className="px-4 py-3">
                    <SubempresaToggle subempresaId={subempresa.id} activa={subempresa.activa} />
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
