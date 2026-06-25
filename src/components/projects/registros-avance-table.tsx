"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Pencil,
  X,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { eliminarAvanceAction, registrarAvanceAction } from "@/lib/actions/proyectos";

type AvanceRecord = {
  id: string;
  fecha: string;
  avance_real: number;
  avance_proyectado: number;
  notas: string | null;
  proyecto_id: string;
  registrado_por: string | null;
  created_at: string;
};

type AvanceConAcumulado = AvanceRecord & {
  acumuladoReal: number;
  acumuladoProyectado: number;
};

type Props = {
  avances: AvanceRecord[];
  proyectoId: string;
  unidad: string;
  puedeEditar: boolean;
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteConfirmModal({
  registro,
  unidad,
  onConfirm,
  onCancel,
  loading,
}: {
  registro: AvanceConAcumulado;
  unidad: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const fechaDisplay = new Date(registro.fecha + "T12:00:00").toLocaleDateString(
    "es-CO",
    { weekday: "long", day: "2-digit", month: "long", year: "numeric" }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
      />
      <div className="relative w-full max-w-sm rounded-xl border border-red-500/20 bg-[#1A1A1A] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-center text-sm font-bold text-white uppercase tracking-widest mb-2">
          Eliminar Registro
        </h3>
        <p className="text-center text-xs text-white/40 mb-6">
          Esta acción no se puede deshacer. Las gráficas se recalcularán automáticamente.
        </p>

        {/* Record details */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Fecha
            </span>
            <span className="text-xs font-bold text-white capitalize">
              {fechaDisplay}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Real (día)
            </span>
            <span className="text-xs font-bold text-[#F25C05]">
              {Number(registro.avance_real).toLocaleString("es-CO")} {unidad}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Acumulado
            </span>
            <span className="text-xs font-bold text-white/60">
              {registro.acumuladoReal.toLocaleString("es-CO")} {unidad}
            </span>
          </div>
          {registro.notas && (
            <div className="flex items-start justify-between gap-3 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 shrink-0">
                Notas
              </span>
              <span className="text-[10px] text-white/50 text-right">
                {registro.notas}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Inline Row ──────────────────────────────────────────────────────────

function EditRow({
  registro,
  unidad,
  proyectoId,
  onDone,
  onCancel,
}: {
  registro: AvanceConAcumulado;
  unidad: string;
  proyectoId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [avanceReal, setAvanceReal] = useState(String(Number(registro.avance_real)));
  const [avanceProyectado, setAvanceProyectado] = useState(
    String(Number(registro.avance_proyectado))
  );
  const [notas, setNotas] = useState(registro.notas || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await registrarAvanceAction({
        proyectoId,
        fecha: registro.fecha,
        avanceReal: parseFloat(avanceReal),
        avanceProyectado:
          avanceProyectado !== "" && !isNaN(parseFloat(avanceProyectado))
            ? parseFloat(avanceProyectado)
            : undefined,
        notas: notas.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setLoading(false);
    }
  }

  const fechaDisplay = new Date(registro.fecha + "T12:00:00").toLocaleDateString(
    "es-CO",
    { day: "2-digit", month: "short" }
  );

  return (
    <tr className="bg-[#F25C05]/[0.04] border-l-2 border-l-[#F25C05]">
      {/* Fecha (no editable) */}
      <td className="py-3 pl-4 pr-2 text-xs font-bold text-white uppercase">
        {fechaDisplay}
      </td>

      {/* Real del día */}
      <td className="py-3 px-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={avanceReal}
          onChange={(e) => setAvanceReal(e.target.value)}
          className="w-full max-w-[100px] rounded border border-[#F25C05]/30 bg-[#F25C05]/10 px-2 py-1.5 text-xs text-white focus:border-[#F25C05] focus:outline-none transition-all"
        />
      </td>

      {/* Acumulado (read-only, se recalcula) */}
      <td className="py-3 px-2">
        <span className="text-[10px] text-white/25 italic">Se recalcula</span>
      </td>

      {/* Proyectado del día */}
      <td className="py-3 px-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={avanceProyectado}
          onChange={(e) => setAvanceProyectado(e.target.value)}
          className="w-full max-w-[100px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-white/30 focus:outline-none transition-all"
        />
      </td>

      {/* Notas */}
      <td className="py-3 px-2 hidden sm:table-cell">
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="—"
          className="w-full max-w-[200px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none transition-all"
        />
      </td>

      {/* Actions */}
      <td className="py-3 pl-2 pr-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {error && (
            <span className="text-[9px] text-red-400 mr-1 max-w-[80px] truncate" title={error}>
              Error
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-[#F25C05] p-1.5 text-white transition-colors hover:bg-[#F25C05]/80 disabled:opacity-50"
            title="Guardar"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-md bg-white/5 p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Cancelar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RegistrosAvanceTable({ avances, proyectoId, unidad, puedeEditar }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<AvanceConAcumulado | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calcular acumulados: ordenar ascendente por fecha, ir sumando
  const avancesConAcumulado = useMemo(() => {
    const ascendente = [...avances].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    let runningReal = 0;
    let runningProyectado = 0;

    return ascendente.map((a) => {
      runningReal += Number(a.avance_real);
      runningProyectado += Number(a.avance_proyectado);
      return {
        ...a,
        acumuladoReal: runningReal,
        acumuladoProyectado: runningProyectado,
      };
    });
  }, [avances]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await eliminarAvanceAction({
        avanceId: deleteTarget.id,
        proyectoId,
      });
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      console.error("Error eliminando avance:", err);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, proyectoId, router]);

  const handleEditDone = useCallback(() => {
    setEditingId(null);
    router.refresh();
  }, [router]);

  if (avances.length === 0) return null;

  // Show most recent first (reverse the accumulated array)
  const sortedAvances = [...avancesConAcumulado].reverse();

  const visibleAvances = isExpanded ? sortedAvances : sortedAvances.slice(0, 5);
  const hasMore = sortedAvances.length > 5;

  return (
    <>
      <div className="flex flex-col gap-6 rounded-3xl border-0 bg-white/[0.02] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl group transition-all">
        <div className="absolute inset-0 bg-gradient-to-t from-white/[0.01] to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F25C05]/10">
              <FileText className="h-4 w-4 text-[#F25C05]" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
                Registros de Avance
              </h3>
              <p className="text-[10px] text-white/25 mt-0.5">
                {sortedAvances.length} registro{sortedAvances.length !== 1 ? "s" : ""} — {unidad}
              </p>
            </div>
          </div>
          {puedeEditar && (
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
              Click para editar
            </span>
          )}
        </div>

        {/* Table */}
        <div className="relative z-10 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-3 pl-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Fecha
                </th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-[#F25C05]/60">
                  Día ({unidad})
                </th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Acumulado
                </th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Proy. ({unidad})
                </th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/30 hidden sm:table-cell">
                  Notas
                </th>
                {puedeEditar && (
                  <th className="pb-3 pr-4 text-right text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {visibleAvances.map((avance) => {
                if (editingId === avance.id && puedeEditar) {
                  return (
                    <EditRow
                      key={avance.id}
                      registro={avance}
                      unidad={unidad}
                      proyectoId={proyectoId}
                      onDone={handleEditDone}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                }

                const fechaDisplay = new Date(avance.fecha + "T12:00:00").toLocaleDateString(
                  "es-CO",
                  { day: "2-digit", month: "short" }
                );

                // Cumplimiento: acumulado real vs acumulado proyectado
                const cumplimiento =
                  avance.acumuladoProyectado > 0
                    ? (avance.acumuladoReal / avance.acumuladoProyectado) * 100
                    : null;

                return (
                  <tr
                    key={avance.id}
                    className={`transition-colors group/row ${
                      puedeEditar
                        ? "hover:bg-white/[0.03] cursor-pointer"
                        : "hover:bg-white/[0.015]"
                    }`}
                    onClick={
                      puedeEditar && editingId !== avance.id
                        ? () => setEditingId(avance.id)
                        : undefined
                    }
                  >
                    {/* Fecha */}
                    <td className="py-3.5 pl-4 pr-2">
                      <span className="text-xs font-bold text-white uppercase">
                        {fechaDisplay}
                      </span>
                    </td>

                    {/* Día (valor de ese día) */}
                    <td className="py-3.5 px-2">
                      <span className="text-sm font-bold text-[#F25C05]">
                        +{Number(avance.avance_real).toLocaleString("es-CO")}
                      </span>
                    </td>

                    {/* Acumulado (hasta ese día) */}
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {avance.acumuladoReal.toLocaleString("es-CO")}
                        </span>
                        {cumplimiento !== null && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              cumplimiento >= 100
                                ? "bg-emerald-500/10 text-emerald-400"
                                : cumplimiento >= 80
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {cumplimiento.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Proyectado del día */}
                    <td className="py-3.5 px-2">
                      <span className="text-sm font-bold text-white/40">
                        {Number(avance.avance_proyectado).toLocaleString("es-CO")}
                      </span>
                    </td>

                    {/* Notas */}
                    <td className="py-3.5 px-2 hidden sm:table-cell">
                      {avance.notas ? (
                        <span className="text-[10px] text-white/35 max-w-[200px] truncate block">
                          {avance.notas}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/15">—</span>
                      )}
                    </td>

                    {/* Acciones */}
                    {puedeEditar && (
                      <td className="py-3.5 pl-2 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(avance.id);
                            }}
                            className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white"
                            title="Editar registro"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(avance);
                            }}
                            className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            title="Eliminar registro"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Show more/less toggle */}
        {hasMore && (
          <div className="relative z-10 flex justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
            >
              {isExpanded ? (
                <>
                  Mostrar menos <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Ver todos ({sortedAvances.length}) <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          registro={deleteTarget}
          unidad={unidad}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}
