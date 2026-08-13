import { createClient } from "@/lib/supabase/server";
import { listUsuarios, listEmpresas, listSubempresas } from "@/lib/data/organizacion";
import { getPerfilActual } from "@/lib/auth/roles";
import { UsuarioRolSelect } from "@/components/admin/usuario-rol-select";
import { UsuarioEmpresaSelect } from "@/components/admin/usuario-empresa-select";
import { UsuarioSubempresaSelect } from "@/components/admin/usuario-subempresa-select";
import { UsuarioActivoToggle } from "@/components/admin/usuario-activo-toggle";
import { CrearUsuarioModal } from "@/components/admin/crear-usuario-modal";
import { UsuariosTableAcciones } from "@/components/admin/usuarios-table-acciones";

export const dynamic = "force-dynamic";

function getInitials(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AdminUsuariosPage() {
  const supabase = createClient();
  const [usuarios, empresas, subempresas, perfil] = await Promise.all([
    listUsuarios(supabase),
    listEmpresas(supabase),
    listSubempresas(supabase),
    getPerfilActual(supabase),
  ]);

  const empresasOpciones = empresas.map((e) => ({ id: e.id, nombre: e.nombre }));
  const subempresasOpciones = subempresas.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    empresaId: s.empresa_id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/40">
          {usuarios.length} {usuarios.length === 1 ? "usuario registrado" : "usuarios registrados"}
        </p>
        <CrearUsuarioModal empresas={empresasOpciones} subempresas={subempresasOpciones} />
      </div>

      {usuarios.length === 0 ? (
        <div className="rounded-actium border border-white/5 bg-white/[0.03] p-10 text-center text-sm text-white/40">
          Aún no hay usuarios registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-actium border border-white/5">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Subempresa</th>
                <th className="px-4 py-3 font-medium">Acceso</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => {
                const esYoMismo = usuario.id === perfil?.id;
                return (
                  <tr
                    key={usuario.id}
                    className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-actium-orange/15 text-xs font-semibold text-actium-orange">
                          {getInitials(usuario.nombre)}
                        </div>
                        <div>
                          <p className="flex items-center gap-2 font-medium text-white">
                            {usuario.nombre}
                            {esYoMismo ? (
                              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                                Tú
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-white/30">{usuario.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <UsuarioRolSelect
                        usuarioId={usuario.id}
                        rol={usuario.rol}
                        disabled={esYoMismo}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <UsuarioEmpresaSelect
                        usuarioId={usuario.id}
                        empresaId={usuario.empresa_id}
                        empresas={empresasOpciones}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <UsuarioSubempresaSelect
                        usuarioId={usuario.id}
                        subempresaId={usuario.subempresa_id}
                        empresaId={usuario.empresa_id}
                        subempresas={subempresasOpciones}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <UsuarioActivoToggle
                        usuarioId={usuario.id}
                        activo={usuario.activo}
                        disabled={esYoMismo}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UsuariosTableAcciones
                        usuario={{ id: usuario.id, nombre: usuario.nombre, email: usuario.email }}
                        disabled={esYoMismo}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-white/30">
        Por seguridad, no puede modificar su propio rol ni desactivar su propia cuenta. Al cambiar
        la empresa de un usuario se restablece su subempresa. Si modifica la subempresa de un
        usuario con sesión activa, este deberá volver a iniciar sesión para ver sus proyectos.
      </p>
    </div>
  );
}
