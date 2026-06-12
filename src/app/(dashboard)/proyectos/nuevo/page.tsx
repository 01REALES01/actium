import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarProyectos } from "@/lib/auth/roles";
import { listEmpresas, listSubempresas } from "@/lib/data/organizacion";
import { ProyectoForm } from "@/components/projects/proyecto-form";

export default async function NuevoProyectoPage() {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!puedeGestionarProyectos(perfil?.rol)) {
    redirect("/proyectos");
  }

  const [empresas, subempresas] = await Promise.all([
    listEmpresas(supabase),
    listSubempresas(supabase),
  ]);

  // Para admin (no super_admin) la empresa queda fija a la suya.
  const empresaFija = perfil?.rol === "super_admin" ? null : perfil?.empresa_id ?? null;

  return (
    <ProyectoForm
      modo="crear"
      empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
      subempresas={subempresas.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        empresa_id: s.empresa_id,
      }))}
      empresaFija={empresaFija}
    />
  );
}
