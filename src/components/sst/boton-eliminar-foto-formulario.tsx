"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { eliminarFotoFormularioAction } from "@/lib/actions/formulario-fotos";

type Props = {
  fotoId: string;
  /** Se ejecuta tras un borrado exitoso (por ejemplo, para cerrar el visor). */
  onEliminada?: (fotoId: string) => void;
};

export function BotonEliminarFotoFormulario({ fotoId, onEliminada }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [eliminando, startTransition] = useTransition();

  const handleEliminar = (e: React.MouseEvent) => {
    // La miniatura abre el visor: este botón no debe propagar el clic.
    e.preventDefault();
    e.stopPropagation();

    const confirmar = window.confirm(
      "¿Está seguro de que desea eliminar esta foto de forma permanente? Es evidencia de la inspección y la acción no se puede deshacer.",
    );
    if (!confirmar) return;

    setError(null);
    startTransition(async () => {
      try {
        await eliminarFotoFormularioAction({ fotoId });
        onEliminada?.(fotoId);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No fue posible eliminar la foto. Intenta de nuevo.",
        );
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleEliminar}
        disabled={eliminando}
        title="Eliminar foto"
        aria-label="Eliminar foto"
        className="absolute right-1.5 top-1.5 z-20 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-danger/30 bg-black/60 text-danger backdrop-blur-sm transition-all duration-200 hover:bg-danger/20 disabled:opacity-50"
      >
        {eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
      {error && (
        <p className="absolute inset-x-0 bottom-0 z-20 bg-danger/90 px-2 py-1 text-[10px] font-medium text-white">
          {error}
        </p>
      )}
    </>
  );
}
