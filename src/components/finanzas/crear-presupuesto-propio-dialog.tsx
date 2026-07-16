"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { crearPresupuestoPropioAction } from "@/lib/actions/presupuesto";
import type { Tables } from "@/types/database.types";

export function CrearPresupuestoPropioDialog({
  empresas,
}: {
  empresas: Pick<Tables<"empresas">, "id" | "nombre">[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");

  function handleOpenChange(next: boolean) {
    if (!next && loading) return;
    setOpen(next);
    if (!next) setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!empresaId) {
      setError("Selecciona una empresa.");
      return;
    }

    setLoading(true);
    try {
      const { id } = await crearPresupuestoPropioAction({ empresaId });
      setOpen(false);
      router.push(`/finanzas/presupuesto/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el presupuesto propio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          Configurar presupuesto propio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Presupuesto propio</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Es para el manejo interno de la empresa (nómina, arriendo, servicios...), no un proyecto de cliente.
            Se configura una sola vez.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || empresas.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
