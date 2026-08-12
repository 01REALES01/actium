"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { UsuarioEliminarDialog } from "./usuario-eliminar-dialog";

type Usuario = { id: string; nombre: string; email: string };

export function UsuariosTableAcciones({
  usuario,
  disabled,
}: {
  usuario: Usuario;
  disabled?: boolean;
}) {
  const [aEliminar, setAEliminar] = useState<Usuario | null>(null);

  return (
    <>
      <button
        type="button"
        title="Eliminar usuario"
        disabled={disabled}
        onClick={() => setAEliminar(usuario)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
      </button>

      <UsuarioEliminarDialog usuario={aEliminar} onClose={() => setAEliminar(null)} />
    </>
  );
}
