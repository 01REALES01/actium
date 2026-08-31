"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2, AlertCircle } from "lucide-react";
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
import { SignaturePad } from "@/components/sst/signature-pad";
import { cerrarConteoAction } from "@/lib/actions/inventario";
import { hoyLocal, etiquetaFechaLarga } from "@/lib/fecha";
import type { ItemConteo } from "@/lib/data/inventario";

export function ConteoCerrarDialog({
  conteoId,
  ambitoNombre,
  empresaNombre,
  items,
}: {
  conteoId: string;
  ambitoNombre: string;
  empresaNombre: string | null;
  items: ItemConteo[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [responsableNombre, setResponsableNombre] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [firma, setFirma] = useState("");

  function resetForm() {
    setResponsableNombre("");
    setObservaciones("");
    setFirma("");
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

    if (!responsableNombre.trim()) {
      setError("Indica el nombre de quien hizo el conteo.");
      return;
    }
    if (!firma) {
      setError("La firma del responsable es obligatoria para cerrar el conteo.");
      return;
    }

    setLoading(true);
    try {
      const { buildConteoPDFBlob } = await import("@/components/inventario/conteo-pdf-document");
      const blob = await buildConteoPDFBlob({
        ambitoNombre,
        empresaNombre,
        fecha: etiquetaFechaLarga(hoyLocal()),
        responsableNombre: responsableNombre.trim(),
        observaciones: observaciones.trim(),
        firma,
        items: items.map((i) => ({
          codigo: i.unidad_codigo,
          nombre: i.catalogo_nombre,
          resultado: i.resultado ?? "existe",
          nota: i.nota ?? "",
        })),
      });

      const formData = new FormData();
      formData.append("conteoId", conteoId);
      formData.append("responsableNombre", responsableNombre.trim());
      formData.append("observaciones", observaciones.trim());
      formData.append("pdfFile", blob, `acta-inventario-${conteoId}.pdf`);

      await cerrarConteoAction(formData);
      setOpen(false);
      resetForm();
      router.push(`/inventario/herramientas/conteos/${conteoId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cerrar el conteo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="min-h-[44px] gap-1.5">
          <ClipboardCheck className="h-4 w-4" strokeWidth={1.5} />
          Cerrar conteo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Cerrar conteo de {ambitoNombre}</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Al cerrar, el conteo queda inmutable y se genera el acta en PDF.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conteo-responsable">Responsable del conteo</Label>
            <Input
              id="conteo-responsable"
              value={responsableNombre}
              onChange={(e) => setResponsableNombre(e.target.value)}
              placeholder="Nombre de quien hizo el conteo"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conteo-observaciones">Observaciones (opcional)</Label>
            <Input
              id="conteo-observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <SignaturePad onSave={setFirma} label="Firma del responsable del conteo" />

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
              Cerrar conteo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
