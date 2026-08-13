"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Trash2, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { restaurarTrabajadorAction, eliminarTrabajadorDefinitivoAction } from "@/lib/actions/sst-actions";

type EmpleadoArchivado = {
  id: string;
  nombre: string;
  cedula: string;
  deleted_at: string | null;
};

function formatFecha(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export function EmpleadosArchivadosSection({ archivados }: { archivados: EmpleadoArchivado[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<EmpleadoArchivado | null>(null);

  if (archivados.length === 0) return null;

  async function restaurar(id: string) {
    setRestaurandoId(id);
    setError(null);
    try {
      await restaurarTrabajadorAction({ empleadoId: id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible restaurar al trabajador.");
    } finally {
      setRestaurandoId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1A1A1A]">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <ChevronRight
          className={"h-5 w-5 shrink-0 text-white/40 transition-transform " + (abierto ? "rotate-90" : "")}
          strokeWidth={1.5}
        />
        <Archive className="h-4 w-4 text-white/40" strokeWidth={1.5} />
        <span className="text-xs font-bold uppercase tracking-widest text-white/60">
          Trabajadores archivados ({archivados.length})
        </span>
      </button>

      {abierto ? (
        <div className="border-t border-white/5 px-4 pb-4 pt-2">
          {error ? (
            <p className="mb-3 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            {archivados.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{e.nombre}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                    CC {e.cedula} · Archivado {formatFecha(e.deleted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={restaurandoId === e.id}
                    onClick={() => restaurar(e.id)}
                  >
                    {restaurandoId === e.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    Restaurar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => setAEliminar(e)}
                    title="Eliminar definitivamente"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Eliminar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <EliminarDefinitivoDialog
        empleado={aEliminar}
        onClose={() => setAEliminar(null)}
        onDeleted={() => {
          setAEliminar(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function EliminarDefinitivoDialog({
  empleado,
  onClose,
  onDeleted,
}: {
  empleado: EmpleadoArchivado | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abierto = empleado !== null;

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) {
      setError(null);
      onClose();
    }
  }

  async function onEliminar() {
    if (!empleado) return;
    setLoading(true);
    setError(null);
    try {
      await eliminarTrabajadorDefinitivoAction({ empleadoId: empleado.id });
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar al trabajador.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold text-danger">
            Eliminar definitivamente
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Esta acción es <span className="font-semibold text-danger">irreversible</span>. Se borrará
            {" "}
            <span className="font-semibold text-[--text-primary]">{empleado?.nombre}</span> y todo su
            historial: documentos, asignaciones a proyectos, ausentismos e incidentes.
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.5} />}
            Eliminar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
