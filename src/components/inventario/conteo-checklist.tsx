"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, AlertTriangle, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { marcarItemConteoAction } from "@/lib/actions/inventario";
import type { ItemConteo } from "@/lib/data/inventario";
import type { ConteoResultado } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { ConteoCerrarDialog } from "@/components/inventario/conteo-cerrar-dialog";

const OPCIONES: { value: ConteoResultado; label: string; icon: typeof Check }[] = [
  { value: "existe", label: "Existe", icon: Check },
  { value: "novedad", label: "Con novedad", icon: AlertTriangle },
  { value: "faltante", label: "No existe", icon: X },
];

export function ConteoChecklist({
  conteoId,
  ambitoNombre,
  empresaNombre,
  itemsIniciales,
}: {
  conteoId: string;
  ambitoNombre: string;
  empresaNombre: string | null;
  itemsIniciales: ItemConteo[];
}) {
  const [items, setItems] = useState(itemsIniciales);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; mensaje: string } | null>(null);
  const [, startTransition] = useTransition();

  const marcadas = items.filter((i) => i.resultado !== null).length;
  const total = items.length;
  const todasMarcadas = total > 0 && marcadas === total;

  const visibles = useMemo(
    () => (soloPendientes ? items.filter((i) => i.resultado === null) : items),
    [items, soloPendientes],
  );

  function handleMarcar(item: ItemConteo, resultado: ConteoResultado, nota: string) {
    setErrorId(null);
    setGuardandoId(item.id);

    const anterior = items;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, resultado, nota: nota || null } : i)));

    startTransition(async () => {
      try {
        await marcarItemConteoAction({ itemId: item.id, resultado, nota: nota || undefined });
      } catch (err) {
        setItems(anterior);
        setErrorId({ id: item.id, mensaje: err instanceof Error ? err.message : "No fue posible guardar la marca." });
      } finally {
        setGuardandoId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex flex-col gap-2 rounded-actium border border-[--border-subtle] bg-[--bg-elevated] p-4">
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm font-semibold text-[--text-primary]">
            {marcadas} de {total} marcadas
          </p>
          <button
            type="button"
            onClick={() => setSoloPendientes((v) => !v)}
            className="min-h-[44px] rounded-lg px-3 text-xs font-medium text-actium-orange hover:bg-actium-orange/10"
          >
            {soloPendientes ? "Ver todas" : "Ver solo pendientes"}
          </button>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[--bg-secondary]">
          <div
            className="h-full bg-actium-orange transition-all duration-200"
            style={{ width: total > 0 ? `${(marcadas / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {visibles.length === 0 ? (
          <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
            No quedan herramientas pendientes por marcar.
          </p>
        ) : (
          visibles.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              guardando={guardandoId === item.id}
              error={errorId?.id === item.id ? errorId.mensaje : null}
              onMarcar={handleMarcar}
            />
          ))
        )}
      </div>

      {todasMarcadas ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[--border-subtle] bg-[--bg-elevated] p-4 shadow-actium-lg">
          <div className="mx-auto flex max-w-[1400px] justify-end">
            <ConteoCerrarDialog
              conteoId={conteoId}
              ambitoNombre={ambitoNombre}
              empresaNombre={empresaNombre}
              items={items}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemCard({
  item,
  guardando,
  error,
  onMarcar,
}: {
  item: ItemConteo;
  guardando: boolean;
  error: string | null;
  onMarcar: (item: ItemConteo, resultado: ConteoResultado, nota: string) => void;
}) {
  const [nota, setNota] = useState(item.nota ?? "");
  const necesitaNota = item.resultado === "novedad" || item.resultado === "faltante";

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-sans text-sm font-semibold text-[--text-primary]">{item.catalogo_nombre}</p>
          <p className="text-xs text-[--text-secondary]">{item.unidad_codigo}</p>
        </div>
        {guardando ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-actium-orange" /> : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {OPCIONES.map((op) => {
          const activo = item.resultado === op.value;
          return (
            <button
              key={op.value}
              type="button"
              disabled={guardando}
              onClick={() => onMarcar(item, op.value, nota)}
              className={cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-all duration-200 disabled:opacity-60",
                activo && op.value === "existe" && "border-success/40 bg-success/15 text-success",
                activo && op.value === "novedad" && "border-warning/40 bg-warning/15 text-warning",
                activo && op.value === "faltante" && "border-danger/40 bg-danger/15 text-danger",
                !activo && "border-[--border-default] bg-[--bg-secondary] text-[--text-secondary] hover:bg-[--bg-hover]",
              )}
            >
              <op.icon className="h-4 w-4" strokeWidth={1.5} />
              {op.label}
            </button>
          );
        })}
      </div>

      {necesitaNota ? (
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => {
            if (item.resultado && nota !== (item.nota ?? "")) onMarcar(item, item.resultado, nota);
          }}
          placeholder="Nota (opcional)"
          className="min-h-[44px] rounded-xl border border-[--border-default] bg-[--bg-secondary] px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20"
        />
      ) : null}

      {error ? (
        <p className="flex items-center gap-2 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          {error}
        </p>
      ) : null}
    </Card>
  );
}
