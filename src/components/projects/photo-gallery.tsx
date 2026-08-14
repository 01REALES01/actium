"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Upload, X, Loader2, ZoomIn } from "lucide-react";
import { uploadFotoAction } from "@/lib/actions/proyectos";
import type { FotoConUrl } from "@/lib/data/proyectos";
import { ImageLightbox, type LightboxImage } from "@/components/ui/image-lightbox";

type Props = {
  fotos: FotoConUrl[];
  proyectoId: string;
  empresaId: string;
  subempresaId: string;
  puedeEditar?: boolean;
};

export function PhotoGallery({ fotos: initialFotos, proyectoId, empresaId, subempresaId, puedeEditar = false }: Props) {
  const [fotos, setFotos] = useState(initialFotos);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const validFotos: LightboxImage[] = fotos
    .filter((f) => !!f.signedUrl)
    .map((f) => ({
      id: f.id,
      url: f.signedUrl as string,
      title: f.nombre,
      description: f.descripcion,
      date: f.uploaded_at,
    }));

  const handleOpenPhoto = (fotoId: string) => {
    const idx = validFotos.findIndex((vf) => vf.id === fotoId);
    if (idx !== -1) {
      setSelectedIndex(idx);
      setLightboxOpen(true);
    }
  };

  const handleOpenExtra = () => {
    if (validFotos.length > 8) {
      setSelectedIndex(8);
      setLightboxOpen(true);
    } else if (validFotos.length > 0) {
      setSelectedIndex(0);
      setLightboxOpen(true);
    }
  };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo no puede superar 10 MB.");
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append("foto", file);
    formData.append("proyectoId", proyectoId);
    formData.append("empresaId", empresaId);
    formData.append("subempresaId", subempresaId);

    const optimisticFoto: FotoConUrl = {
      id: crypto.randomUUID(),
      proyecto_id: proyectoId,
      storage_path: "",
      nombre: file.name,
      descripcion: null,
      autor_id: null,
      exif_json: null,
      tamano_bytes: file.size,
      lat: null,
      lng: null,
      capturada_at: null,
      uploaded_at: new Date().toISOString(),
      signedUrl: objectUrl,
    };

    setFotos((prev) => [optimisticFoto, ...prev]);

    startTransition(async () => {
      try {
        await uploadFotoAction(formData);
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible subir la foto. Intenta de nuevo.");
        setFotos(initialFotos);
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  const displayFotos = fotos.slice(0, 8);
  const empty = displayFotos.length === 0;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 rounded-3xl border-0 bg-white/[0.02] p-5 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-[#ff4500]" />
          <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
            Registro Fotográfico de Obra
          </h3>
          {!empty && (
            <span className="text-[10px] font-bold text-white/30">
              ({fotos.length} foto{fotos.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>

        {puedeEditar && (
          <div className="flex items-center gap-3">
            {isPending && (
              <Loader2 className="h-4 w-4 text-white/40 animate-spin" />
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/60 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="h-3.5 w-3.5" />
              Subir Foto
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5">
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5 text-red-400/60 hover:text-red-400" />
          </button>
        </div>
      )}

      {empty ? (
        <div
          onClick={puedeEditar ? () => fileInputRef.current?.click() : undefined}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 transition-all ${
            puedeEditar ? "cursor-pointer hover:border-white/20 hover:bg-white/[0.04]" : ""
          }`}
        >
          <Camera className="h-8 w-8 text-white/20" />
          <p className="text-xs text-white/30">
            {puedeEditar
              ? "Aún no hay fotos registradas. Haz clic para subir la primera."
              : "Aún no hay fotos registradas."}
          </p>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {displayFotos.map((foto) => (
            <div
              key={foto.id}
              onClick={foto.signedUrl ? () => handleOpenPhoto(foto.id) : undefined}
              className={`group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#ff4500]/10 ${
                foto.signedUrl ? "cursor-pointer" : ""
              }`}
            >
              {foto.signedUrl ? (
                <Image
                  src={foto.signedUrl}
                  alt={foto.nombre ?? foto.descripcion ?? "Foto de obra"}
                  fill
                  className="object-cover opacity-80 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100 grayscale group-hover:grayscale-0"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                  <Camera className="h-6 w-6 text-white/20" />
                </div>
              )}
              
              {/* Overlay hover con icono de zoom */}
              {foto.signedUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 shadow-md transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <ZoomIn className="h-4 w-4 text-[#ff4500]" />
                  </div>
                </div>
              )}

              {foto.nombre && (
                <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-black/50 backdrop-blur-sm">
                  <p className="text-[9px] font-bold text-white/90 uppercase tracking-wider truncate">
                    {foto.nombre}
                  </p>
                </div>
              )}
              {foto.signedUrl === foto.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
          ))}

          {fotos.length > 8 && (
            <div
              onClick={handleOpenExtra}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/10 cursor-pointer hover:border-[#ff4500]/50 hover:bg-white/10 transition-all duration-300 group shadow-xl hover:-translate-y-1"
            >
              <span className="text-lg sm:text-xl font-bold text-white/60 group-hover:text-white group-hover:scale-110 transition-all">
                +{fotos.length - 8}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 group-hover:text-white/80 mt-1">
                Ver todas
              </span>
            </div>
          )}
        </div>
      )}

      {/* Visor Lightbox a pantalla completa */}
      <ImageLightbox
        images={validFotos}
        initialIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
