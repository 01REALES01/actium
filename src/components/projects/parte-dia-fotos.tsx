"use client";

import { useState } from "react";
import { Camera, ZoomIn } from "lucide-react";
import { ImageLightbox, type LightboxImage } from "@/components/ui/image-lightbox";
import type { FotoDia } from "@/lib/data/partes-sst";

interface ParteDiaFotosProps {
  fotos: FotoDia[];
}

export function ParteDiaFotos({ fotos }: ParteDiaFotosProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filtrar solo las fotos que tengan URL válida para el visor
  const validFotos: LightboxImage[] = fotos
    .filter((f) => !!f.signedUrl)
    .map((f) => ({
      id: f.id,
      url: f.signedUrl as string,
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

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-[#F25C05]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
            Registro fotográfico
          </h3>
          {fotos.length > 0 && (
            <span className="text-[10px] font-bold text-white/30">
              ({fotos.length} foto{fotos.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
        {validFotos.length > 0 && (
          <span className="text-[10px] text-white/40 hidden sm:inline-block">
            Haz clic en una imagen para ampliar
          </span>
        )}
      </div>

      {fotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Camera className="h-8 w-8 text-white/15 mb-2" />
          <p className="text-sm text-white/40">Sin fotos registradas este día.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {fotos.map((f) => {
            const hasUrl = !!f.signedUrl;
            return (
              <div
                key={f.id}
                onClick={hasUrl ? () => handleOpenPhoto(f.id) : undefined}
                className={`group relative overflow-hidden rounded-xl border border-white/10 bg-black/30 transition-all duration-300 ${
                  hasUrl
                    ? "cursor-pointer hover:border-[#F25C05]/50 hover:shadow-lg hover:shadow-[#F25C05]/10 hover:-translate-y-0.5 active:scale-[0.98]"
                    : "opacity-60"
                }`}
              >
                {hasUrl ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.signedUrl!}
                      alt={f.descripcion ?? "Foto de obra"}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Overlay al hacer hover / tap */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <ZoomIn className="h-4 w-4 text-[#F25C05]" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-white/[0.02] text-white/20">
                    <Camera className="h-6 w-6" />
                  </div>
                )}

                {/* Pie de foto */}
                {f.descripcion && (
                  <div className="p-2.5 bg-black/40 border-t border-white/5">
                    <p
                      className="truncate text-[11px] font-medium text-white/70 group-hover:text-white transition-colors"
                      title={f.descripcion}
                    >
                      {f.descripcion}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Visor Lightbox */}
      <ImageLightbox
        images={validFotos}
        initialIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
