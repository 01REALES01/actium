"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { archivarTrabajadorAction } from "@/lib/actions/sst-actions";

type Props = {
  empleado: { id: string; nombre: string } | null;
  onClose: () => void;
  /** Si se provee, se navega ahí tras archivar (ej. desde el expediente). */
  redirectTo?: string;
};

export function ArchivarTrabajadorDialog({ empleado, onClose, redirectTo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = empleado !== null;

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) {
      setError(null);
      onClose();
    }
  }

  async function onArchivar() {
    if (!empleado) return;
    setLoading(true);
    setError(null);
    try {
      await archivarTrabajadorAction({ empleadoId: empleado.id });
      onClose();
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible archivar al trabajador.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Archivar trabajador</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Se ocultará <span className="font-semibold text-[--text-primary]">{empleado?.nombre}</span> de
            los listados, conservando todo su historial. Podrás restaurarlo cuando quieras desde
            Personal.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onClose()} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={onArchivar} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" strokeWidth={1.5} />}
            Archivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
