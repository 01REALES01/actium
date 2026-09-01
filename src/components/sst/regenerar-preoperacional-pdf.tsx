"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

type Props = {
  formularioId: string;
  /** Nombre de quien está autenticado, para el pie del PDF regenerado. */
  usuarioNombre: string;
  /** Última regeneración ya registrada, si la hubo. */
  ultimaRegeneracion?: string | null;
};

/**
 * Reemplaza el PDF de un preoperacional ya firmado, para reflejar una foto de
 * equipo agregada después de emitido.
 *
 * NUNCA toca `estado` ni `firmado_at` (ver `regenerarPdfFormularioAction`): el
 * documento se reemplaza en su mismo `pdf_generado_path`, así que el enlace no
 * cambia, y el pie queda marcado como regenerado para que nunca se confunda
 * con el original.
 */
export function RegenerarPreoperacionalPdf({ formularioId, usuarioNombre, ultimaRegeneracion }: Props) {
  const router = useRouter();
  const [regenerando, setRegenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleRegenerar() {
    setError(null);
    setOk(false);
    setRegenerando(true);
    try {
      const { obtenerDatosCierreAction, regenerarPdfFormularioAction } = await import(
        "@/lib/actions/permisos-sst"
      );
      const { listarFotosFormularioAction } = await import("@/lib/actions/formulario-fotos");
      const { buildPreoperacionalPDFBlob } = await import("./preoperacional-pdf-document");
      const { aDataUrlParaPdf } = await import("@/lib/imagen");

      const [datos, fotos] = await Promise.all([
        obtenerDatosCierreAction(formularioId),
        listarFotosFormularioAction(formularioId),
      ]);

      if (!datos.payload) {
        throw new Error("No fue posible leer los datos de la inspección para regenerar el PDF.");
      }

      const mapaFotos: Record<string, string> = {};
      const conFoto = fotos.filter((f) => f.herramienta_id && f.equipo_uid && f.signedUrl);
      for (const f of conFoto) {
        try {
          const res = await fetch(f.signedUrl as string);
          const blob = await res.blob();
          mapaFotos[`${f.herramienta_id}:${f.equipo_uid}`] = await aDataUrlParaPdf(blob);
        } catch (e) {
          console.error(`No fue posible preparar la foto de ${f.herramienta_id}:${f.equipo_uid}`, e);
        }
      }

      const ahora = new Date().toLocaleString("es-CO");
      const blob = await buildPreoperacionalPDFBlob(datos.payload, mapaFotos, {
        fecha: ahora,
        usuario: usuarioNombre,
      });

      const formData = new FormData();
      formData.append("formularioId", formularioId);
      formData.append("pdfFile", blob, "instrucciones-preoperacionales.pdf");

      await regenerarPdfFormularioAction(formData);

      setOk(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible regenerar el PDF. Intenta de nuevo.");
    } finally {
      setRegenerando(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            Regenerar PDF con las fotos actuales
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/40">
            Reemplaza el documento emitido para incluir fotos de equipo agregadas después de la
            firma. La fecha de firma no cambia; el pie del documento queda marcado como
            regenerado.
            {ultimaRegeneracion ? ` Última regeneración: ${ultimaRegeneracion}.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRegenerar}
          disabled={regenerando}
          className="flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-actium-orange/40 bg-actium-orange/10 px-4 text-[10px] font-bold uppercase tracking-widest text-actium-orange transition-all duration-200 hover:bg-actium-orange/20 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {regenerando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Regenerar PDF
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {ok && !error && (
        <p className="mt-3 text-xs text-success">PDF regenerado correctamente.</p>
      )}
    </div>
  );
}
