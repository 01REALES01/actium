import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarFinanzas } from "@/lib/auth/roles";
import { listProveedores } from "@/lib/data/proveedores";
import { ProveedorFormDialog } from "@/components/finanzas/proveedor-form-dialog";
import { EliminarProveedorButton } from "@/components/finanzas/eliminar-proveedor-button";

export default async function ProveedoresPage() {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect("/proyectos");
  }

  const proveedores = await listProveedores(supabase);
  const puedeEscribir = puedeGestionarFinanzas(perfil.rol);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <Link
          href="/finanzas"
          className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Finanzas
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-[--text-primary]">Proveedores</h1>
            <p className="mt-2 text-sm text-[--text-secondary]">
              Nombre y NIT de sus proveedores frecuentes, para seleccionarlos al crear una factura.
            </p>
          </div>
          {puedeEscribir ? <ProveedorFormDialog modo="crear" /> : null}
        </div>
      </div>

      {proveedores.length === 0 ? (
        <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
          Aún no hay proveedores registrados. Crea el primero.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {proveedores.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-actium border border-[--border-subtle] bg-[--bg-elevated] p-4"
            >
              <div>
                <p className="font-sans text-sm font-semibold text-[--text-primary]">{p.nombre}</p>
                <p className="text-xs text-[--text-secondary]">{p.nit ? `NIT: ${p.nit}` : "Sin NIT registrado"}</p>
              </div>
              {puedeEscribir ? (
                <div className="flex items-center gap-2">
                  <ProveedorFormDialog modo="editar" proveedor={p} />
                  <EliminarProveedorButton proveedorId={p.id} proveedorNombre={p.nombre} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
