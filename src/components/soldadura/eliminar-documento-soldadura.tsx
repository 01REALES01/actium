"use client";

// Eliminación definitiva de un documento de soldadura: borra la fila y sus
// archivos. Sin papelera, porque estos documentos no se anulan —se reemplazan
// por una revisión nueva—, así que la única razón para borrar uno es que se
// creó por error. La confirmación pide escribir el rótulo para que no ocurra
// por un toque accidental en un teléfono.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function EliminarDocumentoSoldadura({ id, rotulo }: { id: string; rotulo: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  const objetivo = rotulo.trim();

  const eliminar = async () => {
    setError("");
    setEliminando(true);
    try {
      const { eliminarDocumentoSoldaduraAction } = await import("@/lib/actions/soldadura");
      const res = await eliminarDocumentoSoldaduraAction(id);
      if (!res.ok) {
        setError(res.error);
        setEliminando(false);
        return;
      }
      router.push("/soldadura");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "No fue posible eliminar el documento. Intenta de nuevo.");
      setEliminando(false);
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-danger/30 px-6 py-2.5 font-semibold text-danger transition-all duration-200 hover:bg-danger/10"
      >
        <Trash2 className="h-4 w-4" /> Eliminar
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm text-text-primary">
        Esta acción elimina el documento y su PDF de forma definitiva. Escriba{" "}
        <span className="font-semibold text-danger">{objetivo}</span> para confirmar.
      </p>
      <input
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        className="mt-3 h-11 w-full rounded-xl border border-border-default bg-bg-secondary px-4 text-sm text-text-primary focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
        placeholder={objetivo}
      />
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={eliminar}
          disabled={confirmacion.trim() !== objetivo || eliminando}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-6 py-2.5 font-semibold text-white transition-all duration-200 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Eliminar definitivamente
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setConfirmacion("");
            setError("");
          }}
          className="min-h-[44px] rounded-xl px-6 py-2.5 font-semibold text-text-secondary transition-colors hover:bg-bg-hover"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
