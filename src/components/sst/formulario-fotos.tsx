"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X, ZoomIn } from "lucide-react";
import { subirFotoFormularioAction } from "@/lib/actions/formulario-fotos";
import { comprimirImagen } from "@/lib/imagen";
import type { FotoFormularioConUrl } from "@/lib/data/formularios-fotos";
import { ImageLightbox, type LightboxImage } from "@/components/ui/image-lightbox";
import { BotonEliminarFotoFormulario } from "@/components/sst/boton-eliminar-foto-formulario";

const MAX_FOTOS = 20;

type Props = {
  /** Null mientras el formulario todavía no existe en base de datos. */
  formularioId: string | null;
  fotosIniciales?: FotoFormularioConUrl[];
  puedeSubir?: boolean;
  puedeEliminar?: boolean;
  /**
   * Crea el formulario y devuelve su id. Lo usa el formulario de diligenciamiento,
   * donde la fila no existe hasta guardar el borrador: la primera foto lo guarda.
   */
  asegurarFormulario?: () => Promise<string>;
  /** Número de sección, cuando se embebe en un formulario numerado. */
  numero?: number;
};

export function FormularioFotos({
  formularioId: formularioIdInicial,
  fotosIniciales = [],
  puedeSubir = false,
  puedeEliminar = false,
  asegurarFormulario,
  numero,
}: Props) {
  const [formularioId, setFormularioId] = useState(formularioIdInicial);
  const [fotos, setFotos] = useState<FotoFormularioConUrl[]>(fotosIniciales);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<{ hechas: number; total: number } | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  // Las fotos recién subidas siguen mostrándose desde su object URL en lugar de
  // pedir una URL firmada: la imagen ya está en memoria. Eso obliga a mantener
  // vivos los object URLs mientras la sección exista y a liberarlos al salir,
  // que en un celular en obra no es un detalle menor.
  const objectUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const visibles: LightboxImage[] = fotos
    .filter((f) => !!f.signedUrl)
    .map((f) => ({
      id: f.id,
      url: f.signedUrl as string,
      title: f.nombre,
      description: f.descripcion,
      date: f.uploaded_at,
    }));

  const abrirVisor = (fotoId: string) => {
    const idx = visibles.findIndex((v) => v.id === fotoId);
    if (idx !== -1) {
      setSelectedIndex(idx);
      setLightboxOpen(true);
    }
  };

  const handleEliminada = (fotoId: string) => {
    setFotos((prev) => prev.filter((f) => f.id !== fotoId));
    setLightboxOpen(false);
  };

  async function handleArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const seleccionados = Array.from(input.files ?? []);
    input.value = "";
    if (seleccionados.length === 0) return;

    setError(null);

    if (fotos.length + seleccionados.length > MAX_FOTOS) {
      setError(`Puede adjuntar hasta ${MAX_FOTOS} fotos por inspección.`);
      return;
    }

    // El formulario puede no existir todavía: la primera foto guarda el borrador.
    let destino = formularioId;
    if (!destino) {
      if (!asegurarFormulario) {
        setError("No fue posible adjuntar la foto. Intenta de nuevo.");
        return;
      }
      try {
        setSubiendo({ hechas: 0, total: seleccionados.length });
        destino = await asegurarFormulario();
        setFormularioId(destino);
      } catch (err) {
        setSubiendo(null);
        setError(err instanceof Error ? err.message : "No fue posible preparar la inspección.");
        return;
      }
    }

    // Secuencial y no en paralelo: en obra la subida compite por una conexión
    // pobre, y varias peticiones simultáneas con fotos se estorban entre sí.
    for (let i = 0; i < seleccionados.length; i++) {
      const original = seleccionados[i];
      setSubiendo({ hechas: i, total: seleccionados.length });

      if (!original.type.startsWith("image/")) {
        setError("Solo se permiten archivos de imagen.");
        continue;
      }

      const objectUrl = URL.createObjectURL(original);
      objectUrls.current.push(objectUrl);
      const temporalId = `temp-${crypto.randomUUID()}`;
      const optimista: FotoFormularioConUrl = {
        id: temporalId,
        formulario_id: destino,
        storage_path: "",
        nombre: original.name,
        descripcion: null,
        tamano_bytes: original.size,
        subido_por: null,
        uploaded_at: new Date().toISOString(),
        herramienta_id: null,
        equipo_uid: null,
        signedUrl: objectUrl,
      };
      setFotos((prev) => [optimista, ...prev]);

      try {
        const archivo = await comprimirImagen(original);

        const formData = new FormData();
        formData.append("foto", archivo);
        formData.append("formularioId", destino);

        const res = await subirFotoFormularioAction(formData);

        // Se conserva el objectUrl como fuente de la miniatura: ya está en
        // memoria y evita pedir una URL firmada solo para lo recién subido.
        setFotos((prev) =>
          prev.map((f) =>
            f.id === temporalId ? { ...f, id: res.id, storage_path: res.storagePath } : f,
          ),
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.current = objectUrls.current.filter((u) => u !== objectUrl);
        setFotos((prev) => prev.filter((f) => f.id !== temporalId));
        setError(err instanceof Error ? err.message : "No fue posible subir la foto.");
      }
    }

    setSubiendo(null);
  }

  const vacio = fotos.length === 0;
  const enProgreso = subiendo !== null;

  return (
    <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 shadow-2xl sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {numero !== undefined ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-actium-orange/10 text-xs text-actium-orange">
              {numero}
            </span>
          ) : (
            <Camera className="h-4 w-4 text-actium-orange" />
          )}
          <h3 className="text-sm font-bold uppercase tracking-widest text-actium-orange">
            Registro fotográfico
          </h3>
          {!vacio && (
            <span className="text-[10px] font-bold text-white/30">
              ({fotos.length} de {MAX_FOTOS})
            </span>
          )}
        </div>

        {puedeSubir && (
          <div className="flex items-center gap-2">
            {enProgreso && (
              <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-white/40">
                <Loader2 className="h-4 w-4 animate-spin" />
                {subiendo.total > 1 ? `${subiendo.hechas + 1} de ${subiendo.total}` : "Subiendo"}
              </span>
            )}
            {/* Dos entradas separadas: un solo input con `capture` fuerza la
                cámara y deja sin forma de adjuntar una foto ya tomada. */}
            <button
              type="button"
              onClick={() => inputCamaraRef.current?.click()}
              disabled={enProgreso}
              className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-xl bg-actium-orange px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all duration-200 hover:bg-actium-orange-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Camera className="h-4 w-4" />
              Tomar foto
            </button>
            <button
              type="button"
              onClick={() => inputGaleriaRef.current?.click()}
              disabled={enProgreso}
              className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-xl border border-actium-orange bg-transparent px-4 text-[10px] font-bold uppercase tracking-widest text-actium-orange transition-all duration-200 hover:bg-actium-orange/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ImagePlus className="h-4 w-4" />
              Adjuntar
            </button>
            <input
              ref={inputCamaraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleArchivos}
            />
            <input
              ref={inputGaleriaRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleArchivos}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-2.5">
          <p className="text-xs text-danger">{error}</p>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar aviso">
            <X className="h-3.5 w-3.5 text-danger/60 transition-colors hover:text-danger" />
          </button>
        </div>
      )}

      {vacio ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
          <Camera className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-xs text-white/40">
            {puedeSubir
              ? "Aún no hay fotos en esta inspección. Adjunte la evidencia de los hallazgos."
              : "Aún no hay fotos en esta inspección."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {fotos.map((foto) => {
            const pendiente = !foto.storage_path;
            return (
              <div
                key={foto.id}
                onClick={foto.signedUrl && !pendiente ? () => abrirVisor(foto.id) : undefined}
                className={`group relative aspect-[4/3] overflow-hidden rounded-xl border border-border-subtle bg-white/5 transition-all duration-200 ${
                  foto.signedUrl && !pendiente
                    ? "cursor-pointer hover:border-actium-orange/30"
                    : ""
                }`}
              >
                {foto.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={foto.signedUrl}
                    alt={foto.nombre ?? "Evidencia de la inspección"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Camera className="h-6 w-6 text-white/20" />
                  </div>
                )}

                {pendiente && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}

                {puedeEliminar && !pendiente && (
                  <BotonEliminarFotoFormulario fotoId={foto.id} onEliminada={handleEliminada} />
                )}

                {foto.signedUrl && !pendiente && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <ZoomIn className="h-5 w-5 text-actium-orange" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-white/30">
        Las fotos quedan asociadas a esta inspección y se consultan desde la aplicación. No se
        incorporan al PDF emitido.
      </p>

      <ImageLightbox
        images={visibles}
        initialIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
