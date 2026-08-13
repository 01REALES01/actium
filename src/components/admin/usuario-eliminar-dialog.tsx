"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { eliminarUsuarioDefinitivoAction } from "@/lib/actions/admin";

type Usuario = { id: string; nombre: string; email: string };

export function UsuarioEliminarDialog({
  usuario,
  onClose,
}: {
  usuario: Usuario | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = usuario !== null;

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) {
      setError(null);
      onClose();
    }
  }

  async function onEliminar() {
    if (!usuario) return;
    setLoading(true);
    setError(null);
    try {
      await eliminarUsuarioDefinitivoAction({ usuarioId: usuario.id });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar el usuario.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold text-danger">
            Eliminar usuario
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Esta acción es <span className="font-semibold text-danger">irreversible</span>. Se
            eliminará la cuenta de{" "}
            <span className="font-semibold text-[--text-primary]">{usuario?.nombre}</span> (
            {usuario?.email}) y perderá acceso a la plataforma de inmediato.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onEliminar}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            )}
            Eliminar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
