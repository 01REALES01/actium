"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { asignarHerramientaAction } from "@/lib/actions/inventario";
import type { ProyectoConEmpresa } from "@/lib/data/inventario";

export function AsignarHerramientaDialog({
  unidadId,
  unidadCodigo,
  proyectos,
}: {
  unidadId: string;
  unidadCodigo: string;
  proyectos: ProyectoConEmpresa[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proyectoId, setProyectoId] = useState("");
  const [responsableNombre, setResponsableNombre] = useState("");
  const [notas, setNotas] = useState("");

  const porEmpresa = useMemo(() => {
    const grupos = new Map<string, { empresaNombre: string; proyectos: ProyectoConEmpresa[] }>();
    for (const p of proyectos) {
      const key = p.empresa_id ?? "sin-empresa";
      const nombre = p.empresas?.nombre ?? "Sin empresa";
      const grupo = grupos.get(key) ?? { empresaNombre: nombre, proyectos: [] };
      grupo.proyectos.push(p);
      grupos.set(key, grupo);
    }
    return Array.from(grupos.values());
  }, [proyectos]);

  function resetForm() {
    setProyectoId("");
    setResponsableNombre("");
    setNotas("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next && loading) return;
    setOpen(next);
    if (!next) resetForm();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proyectoId) {
      setError("Selecciona el proyecto de destino.");
      return;
    }

    setLoading(true);
    try {
      await asignarHerramientaAction({
        unidadId,
        proyectoId,
        responsableNombre: responsableNombre.trim() || undefined,
        notas: notas.trim() || undefined,
      });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible asignar la herramienta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} />
          Asignar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Asignar {unidadCodigo} a un proyecto</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            El proyecto puede ser de cualquier empresa: el inventario es de Actium.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label>Proyecto de destino</Label>
            <Select value={proyectoId} onValueChange={setProyectoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el proyecto" />
              </SelectTrigger>
              <SelectContent>
                {porEmpresa.map((grupo) => (
                  <SelectGroup key={grupo.empresaNombre}>
                    <SelectLabel>{grupo.empresaNombre}</SelectLabel>
                    {grupo.proyectos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asignar-responsable">Responsable en obra (opcional)</Label>
            <Input
              id="asignar-responsable"
              value={responsableNombre}
              onChange={(e) => setResponsableNombre(e.target.value)}
              placeholder="Nombre de quien recibe"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asignar-notas">Notas (opcional)</Label>
            <Input id="asignar-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
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
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Asignar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
