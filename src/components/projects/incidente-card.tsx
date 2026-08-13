"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, AlertTriangle, Archive, RotateCcw, Trash2, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  archivarIncidenteAction,
  restaurarIncidenteAction,
  eliminarIncidenteDefinitivoAction,
} from "@/lib/actions/sst-actions";
import type { EventoDia } from "@/lib/data/partes-sst";

const TIPO_EVENTO_LABEL: Record<string, string> = {
  incidente: "Incidente",
  accidente: "Accidente",
  casi_accidente: "Casi accidente",
};

interface IncidenteCardProps {
  evento: EventoDia;
  proyectoId: string;
  fecha: string;
  puedeEditar: boolean;
}

export function IncidenteCard({ evento, proyectoId, fecha, puedeEditar }: IncidenteCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const archivado = evento.deleted_at !== null;

  async function archivar() {
    setLoading(true);
    setError(null);
    try {
      await archivarIncidenteAction({ incidenteId: evento.id, proyectoId, fecha });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible archivar el evento.");
    } finally {
      setLoading(false);
    }
  }

  async function restaurar() {
    setLoading(true);
    setError(null);
    try {
      await restaurarIncidenteAction({ incidenteId: evento.id, proyectoId, fecha });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible restaurar el evento.");
    } finally {
      setLoading(false);
    }
  }

  async function eliminarDefinitivo() {
    setLoading(true);
    setError(null);
    try {
      await eliminarIncidenteDefinitivoAction({ incidenteId: evento.id, proyectoId, fecha });
      setConfirmarEliminar(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar el evento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-4 transition-opacity ${
        evento.tipo === "accidente" ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"
      } ${archivado ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {evento.tipo === "accidente" ? (
          <ShieldAlert className="h-4 w-4 text-red-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-white">
          {TIPO_EVENTO_LABEL[evento.tipo] ?? evento.tipo}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/60">
          {evento.severidad}
        </span>
        {archivado && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
            Archivado
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {evento.nombre && <span className="text-[11px] text-white/50">{evento.nombre}</span>}
          {puedeEditar && !archivado && (
            <button
              type="button"
              onClick={archivar}
              disabled={loading}
              title="Archivar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-white/80">{evento.descripcion}</p>

      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          {error}
        </p>
      )}

      {puedeEditar && archivado && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={loading}
            onClick={restaurar}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            Restaurar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-danger hover:bg-danger/10 hover:text-danger"
            disabled={loading}
            onClick={() => setConfirmarEliminar(true)}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Eliminar definitivamente
          </Button>
        </div>
      )}

      <Dialog open={confirmarEliminar} onOpenChange={(next) => !loading && setConfirmarEliminar(next)}>
        <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-semibold text-danger">
              Eliminar definitivamente
            </DialogTitle>
            <DialogDescription className="text-[--text-secondary]">
              Esta acción es <span className="font-semibold text-danger">irreversible</span>. Se borrará este{" "}
              {evento.tipo === "accidente" ? "accidente" : "incidente"} y su registro no podrá recuperarse.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmarEliminar(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={eliminarDefinitivo}
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
    </div>
  );
}
