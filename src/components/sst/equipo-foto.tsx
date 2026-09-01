"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, ZoomIn } from "lucide-react";
import { subirFotoFormularioAction } from "@/lib/actions/formulario-fotos";
import { comprimirImagen } from "@/lib/imagen";
import type { FotoFormularioConUrl } from "@/lib/data/formularios-fotos";
import { ImageLightbox, type LightboxImage } from "@/components/ui/image-lightbox";

type Props = {
  herramientaId: string;
  equipoUid: string;
  /** Rótulo del equipo ("Taladro 2"), para el visor. */
  etiqueta: string;
  foto?: FotoFormularioConUrl;
  /** Null mientras el formulario todavía no existe en base de datos. */
  formularioId: string | null;
  /** Crea el borrador y devuelve su id, si aún no existe. Ver preoperacional-form.tsx. */
  asegurarFormulario?: () => Promise<string>;
  puedeSubir?: boolean;
  puedeEliminar?: boolean;
  onSubida: (foto: FotoFormularioConUrl) => void;
  onEliminada: (fotoId: string) => void;
};

/**
 * Foto de UN equipo dentro del preoperacional: "una pieza, una foto". A
 * diferencia de `FormularioFotos` (galería general, varias fotos sueltas),
 * este componente vive dentro de `EquipoCard` y solo administra una sola
 * imagen, que además sale en el PDF — por eso solo admite JPG/PNG, lo que ya
 * filtra `subirFotoFormularioAction` en el servidor.
 */
export function EquipoFoto({
  herramientaId,
  equipoUid,
  etiqueta,
  foto,
  formularioId,
  asegurarFormulario,
  puedeSubir = false,
  puedeEliminar = false,
  onSubida,
  onEliminada,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // Solo un object URL a la vez: cada "Cambiar" reemplaza al anterior. Se
  // libera antes de crear el siguiente y al desmontar el equipo.
  const objectUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const archivo = input.files?.[0];
    input.value = "";
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen.");
      return;
    }

    setError(null);
    setSubiendo(true);
    try {
      // El equipo puede no tener formulario todavía: la primera foto de la
      // inspección guarda el borrador por su cuenta.
      let destino = formularioId;
      if (!destino) {
        if (!asegurarFormulario) throw new Error("No fue posible adjuntar la foto. Intenta de nuevo.");
        destino = await asegurarFormulario();
      }

      const comprimido = await comprimirImagen(archivo);

      const formData = new FormData();
      formData.append("foto", comprimido);
      formData.append("formularioId", destino);
      formData.append("herramientaId", herramientaId);
      formData.append("equipoUid", equipoUid);

      const res = await subirFotoFormularioAction(formData);

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const objectUrl = URL.createObjectURL(comprimido);
      objectUrlRef.current = objectUrl;

      onSubida({
        id: res.id,
        formulario_id: destino,
        storage_path: res.storagePath,
        nombre: comprimido.name,
        descripcion: null,
        tamano_bytes: comprimido.size,
        subido_por: null,
        uploaded_at: new Date().toISOString(),
        herramienta_id: herramientaId,
        equipo_uid: equipoUid,
        signedUrl: objectUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible subir la foto.");
    } finally {
      setSubiendo(false);
    }
  }

  async function handleEliminar() {
    if (!foto) return;
    const confirmar = window.confirm(
      `¿Eliminar la foto de ${etiqueta}? Es evidencia de la inspección y la acción no se puede deshacer.`,
    );
    if (!confirmar) return;

    setError(null);
    setEliminando(true);
    try {
      const { eliminarFotoFormularioAction } = await import("@/lib/actions/formulario-fotos");
      await eliminarFotoFormularioAction({ fotoId: foto.id });
      onEliminada(foto.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar la foto.");
    } finally {
      setEliminando(false);
    }
  }

  const visibles: LightboxImage[] = foto?.signedUrl
    ? [{ id: foto.id, url: foto.signedUrl, title: etiqueta, date: foto.uploaded_at }]
    : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          Registro fotográfico
        </span>
        {error && (
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-right text-[10px] text-danger"
          >
            {error}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          onClick={foto?.signedUrl ? () => setLightboxOpen(true) : undefined}
          className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 ${
            foto?.signedUrl ? "cursor-pointer" : ""
          }`}
        >
          {foto?.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto.signedUrl}
              alt={`Evidencia de ${etiqueta}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Camera className="h-5 w-5 text-white/20" />
            </div>
          )}

          {subiendo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}

          {foto?.signedUrl && !subiendo && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <ZoomIn className="h-4 w-4 text-actium-orange" />
            </div>
          )}
        </div>

        {puedeSubir && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-xl border border-actium-orange/40 bg-actium-orange/10 px-3 text-[10px] font-bold uppercase tracking-widest text-actium-orange transition-all duration-200 hover:bg-actium-orange/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Camera className="h-4 w-4" />
            {foto ? "Cambiar" : "Tomar foto"}
          </button>
        )}

        {puedeEliminar && foto && (
          <button
            type="button"
            onClick={handleEliminar}
            disabled={eliminando || subiendo}
            aria-label={`Eliminar foto de ${etiqueta}`}
            className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger transition-all duration-200 hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleArchivo}
        />
      </div>

      <ImageLightbox
        images={visibles}
        initialIndex={0}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
