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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { archivarProyectoAction } from "@/lib/actions/proyectos";

export function ArchivarProyectoButton({
  proyectoId,
  proyectoNombre,
}: {
  proyectoId: string;
  proyectoNombre: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onArchivar() {
    setLoading(true);
    setError(null);
    try {
      await archivarProyectoAction({ proyectoId });
      setOpen(false);
      router.push("/proyectos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible archivar el proyecto.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/50 transition-all hover:bg-white/5 hover:text-white"
          title="Archivar proyecto"
        >
          <Archive className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Archivar</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Archivar proyecto</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Se ocultará <span className="font-semibold text-[--text-primary]">{proyectoNombre}</span> de
            los listados, conservando todo su historial. Podrás restaurarlo cuando quieras desde
            Proyectos.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
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
