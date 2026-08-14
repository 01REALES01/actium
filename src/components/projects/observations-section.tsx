"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Pencil, Send, AlertCircle } from "lucide-react";
import { addObservacionAction, updateObservacionAction } from "@/lib/actions/proyectos";
import type { ObservacionConAutor } from "@/lib/data/proyectos";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "AHORA";
  if (diffMins < 60) return `HACE ${diffMins} MIN`;
  if (diffHours < 24) return `HACE ${diffHours} H`;
  if (diffDays === 1) return "AYER";
  return `HACE ${diffDays} DÍAS`;
}

/** Una observación se considera editada si su `updated_at` se separó del alta. */
function fueEditada(obs: ObservacionConAutor): boolean {
  return new Date(obs.updated_at).getTime() - new Date(obs.created_at).getTime() > 1000;
}

type Props = {
  observaciones: ObservacionConAutor[];
  proyectoId: string;
  /** Solo `super_admin`: habilita publicar y editar observaciones. */
  puedeGestionar: boolean;
};

export function ObservationsSection({ observaciones: initialObs, proyectoId, puedeGestionar }: Props) {
  const [observaciones, setObservaciones] = useState(initialObs);
  const [contenido, setContenido] = useState("");
  const [importante, setImportante] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Observaciones optimistas todavía sin confirmar en base de datos: su id es
  // temporal, así que no se pueden editar hasta que el servidor devuelva el real.
  const [pendientes, setPendientes] = useState<string[]>([]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editContenido, setEditContenido] = useState("");
  const [editImportante, setEditImportante] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenido.trim()) return;
    setError(null);

    const optimisticObs: ObservacionConAutor = {
      id: crypto.randomUUID(),
      proyecto_id: proyectoId,
      contenido: contenido.trim(),
      importante,
      autor_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usuarios: null,
    };

    const previas = observaciones;
    setObservaciones((prev) => [optimisticObs, ...prev]);
    setPendientes((prev) => [...prev, optimisticObs.id]);
    const texto = contenido.trim();
    const marcada = importante;
    setContenido("");
    setImportante(false);

    startTransition(async () => {
      try {
        const creada = await addObservacionAction({ proyectoId, contenido: texto, importante: marcada });
        setObservaciones((prev) => prev.map((o) => (o.id === optimisticObs.id ? creada : o)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible guardar los cambios. Intenta de nuevo.");
        setObservaciones(previas);
      } finally {
        setPendientes((prev) => prev.filter((id) => id !== optimisticObs.id));
      }
    });
  }

  function handleStartEdit(obs: ObservacionConAutor) {
    setEditError(null);
    setEditandoId(obs.id);
    setEditContenido(obs.contenido);
    setEditImportante(obs.importante);
  }

  function handleCancelEdit() {
    setEditandoId(null);
    setEditContenido("");
    setEditImportante(false);
    setEditError(null);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const observacionId = editandoId;
    const texto = editContenido.trim();
    if (!observacionId || !texto) return;

    const previas = observaciones;
    const marcada = editImportante;
    setEditError(null);
    setObservaciones((prev) =>
      prev.map((o) =>
        o.id === observacionId
          ? { ...o, contenido: texto, importante: marcada, updated_at: new Date().toISOString() }
          : o,
      ),
    );
    handleCancelEdit();

    startSaving(async () => {
      try {
        await updateObservacionAction({
          observacionId,
          proyectoId,
          contenido: texto,
          importante: marcada,
        });
      } catch (err) {
        setEditError(err instanceof Error ? err.message : "No fue posible guardar los cambios. Intenta de nuevo.");
        setObservaciones(previas);
      }
    });
  }

  return (
    <div className={`grid grid-cols-1 gap-6 ${puedeGestionar ? "lg:grid-cols-2" : ""}`}>
      {/* Lista de observaciones */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-1 w-4 rounded-full bg-orange-500" />
          <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
            Observaciones de Campo
          </h3>
          <span className="ml-auto text-[10px] font-bold text-white/30">
            {observaciones.length} nota{observaciones.length !== 1 ? "s" : ""}
          </span>
        </div>

        {editError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {editError}
          </p>
        )}

        {observaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Circle className="h-8 w-8 text-white/10 mb-3" />
            <p className="text-xs text-white/30">Aún no hay observaciones registradas.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {observaciones.map((obs) =>
              editandoId === obs.id ? (
                <form
                  key={obs.id}
                  onSubmit={handleSaveEdit}
                  className="flex flex-col gap-3 rounded-lg border border-[#FF916E]/30 bg-white/5 p-4"
                >
                  <textarea
                    value={editContenido}
                    onChange={(e) => setEditContenido(e.target.value)}
                    autoFocus
                    maxLength={2000}
                    className="w-full min-h-[96px] rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#FF916E]/50 focus:border-[#FF916E]/30 transition-all resize-none"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex min-h-[44px] items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editImportante}
                        onChange={(e) => setEditImportante(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#FF916E]"
                      />
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Importante
                      </span>
                    </label>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex min-h-[44px] items-center justify-center rounded-lg px-4 text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white/80"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving || !editContenido.trim()}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#FF916E] px-4 text-xs font-bold text-[#1A1A1A] transition-colors hover:bg-[#FF916E]/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSaving ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div
                  key={obs.id}
                  className="flex gap-4 rounded-lg border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/[0.08]"
                >
                  <div className="mt-0.5 shrink-0">
                    {obs.importante ? (
                      <AlertCircle className="h-5 w-5 text-[#FF916E]" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/90 leading-relaxed">{obs.contenido}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">
                        {obs.usuarios?.nombre ?? "Usuario"}
                        {obs.usuarios?.cargo ? ` · ${obs.usuarios.cargo}` : ""}
                      </span>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-white/10" />
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest shrink-0">
                        {formatRelativeTime(obs.created_at)}
                      </span>
                      {fueEditada(obs) && (
                        <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest shrink-0">
                          · Editada
                        </span>
                      )}
                    </div>
                  </div>
                  {puedeGestionar && !pendientes.includes(obs.id) && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(obs)}
                      aria-label="Editar observación"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/5 hover:text-[#FF916E]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* Formulario de nueva observación */}
      {puedeGestionar && (
        <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-2">
            Agregar Nota Manual
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
            <div className="relative flex-1">
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                maxLength={2000}
                placeholder="Escribe una nueva observación sobre el estado de la obra..."
                className="h-full w-full min-h-[140px] rounded-lg border border-white/10 bg-white/5 p-4 pb-12 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#FF916E]/50 focus:border-[#FF916E]/30 transition-all resize-none"
              />
              <div className="absolute bottom-3 left-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importante}
                    onChange={(e) => setImportante(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#FF916E]"
                  />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    Importante
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !contenido.trim()}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#FF916E] px-4 py-2.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#FF916E]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              {isPending ? "Publicando..." : "Publicar Observación"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
