"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { eliminarFormularioAction } from "@/lib/actions/sst";

type Props = {
  formularioId: string;
};

export function BotonEliminarSST({ formularioId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [eliminando, startTransition] = useTransition();

  const handleEliminar = () => {
    const confirmar = window.confirm(
      "¿Está seguro de que desea eliminar este permiso de forma permanente? Esta acción no se puede deshacer y borrará todos los registros y firmas asociados."
    );
    if (!confirmar) return;

    setError(null);
    startTransition(async () => {
      try {
        await eliminarFormularioAction(formularioId);
        router.push("/sst");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No fue posible eliminar el formulario.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleEliminar}
        disabled={eliminando}
        className="flex h-9 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
      >
        {eliminando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Eliminar Permiso
      </button>
      {error && <span className="text-[10px] text-red-400 font-medium">{error}</span>}
    </div>
  );
}
