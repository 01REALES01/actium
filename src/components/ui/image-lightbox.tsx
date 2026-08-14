"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  Image as ImageIcon,
} from "lucide-react";

export interface LightboxImage {
  id: string;
  url: string;
  title?: string | null;
  description?: string | null;
  date?: string | null;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  // Bloquear scroll de fondo cuando el lightbox está abierto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Atajos de teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Scroll automático a la miniatura activa
  useEffect(() => {
    if (!isOpen || !thumbnailsRef.current) return;
    const activeThumb = thumbnailsRef.current.children[currentIndex] as HTMLElement;
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentIndex, isOpen]);

  // Manejo de gestos táctiles (Swipe en móvil)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    setTouchStart(null);

    // Si el deslizamiento horizontal es mayor a 40px y más horizontal que vertical
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  if (!isOpen || !mounted || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const formatFecha = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const fechaFormateada = formatFecha(currentImage.date);

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-between bg-black/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-200"
      onClick={(e) => {
        // Cierra al hacer clic en el fondo directo
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* ── BARRA SUPERIOR (HEADER) ── */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider text-white/90 border border-white/10">
            <ImageIcon className="h-3.5 w-3.5 text-[#F25C05]" />
            <span>
              {currentIndex + 1} / {images.length}
            </span>
          </div>
          {currentImage.title && (
            <span className="hidden sm:inline-block max-w-xs truncate text-xs font-medium text-white/70">
              {currentImage.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentImage.url && (
            <a
              href={currentImage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95"
              title="Abrir imagen original"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={onClose}
            aria-label="Cerrar visor"
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL DE LA IMAGEN ── */}
      <div
        className="relative flex-1 flex items-center justify-center px-2 sm:px-12 py-2 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Botón Anterior */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Imagen anterior"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/60 text-white/90 border border-white/15 backdrop-blur-md hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Imagen Activa */}
        <div className="relative max-h-[65vh] sm:max-h-[76vh] max-w-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentImage.id || currentImage.url}
            src={currentImage.url}
            alt={currentImage.description || currentImage.title || "Foto ampliada"}
            className="max-h-[65vh] sm:max-h-[76vh] max-w-[94vw] sm:max-w-[85vw] object-contain rounded-xl shadow-2xl border border-white/10 transition-all animate-in zoom-in-95 duration-200"
          />
        </div>

        {/* Botón Siguiente */}
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Siguiente imagen"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/60 text-white/90 border border-white/15 backdrop-blur-md hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* ── BARRA INFERIOR (CAPTION + MINIATURAS) ── */}
      <div className="flex flex-col gap-2.5 px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-10">
        {/* Descripción y Metadatos */}
        {(currentImage.description || fechaFormateada || currentImage.title) && (
          <div className="mx-auto max-w-2xl text-center px-2">
            {currentImage.description && (
              <p className="text-xs sm:text-sm font-medium text-white/90 leading-snug">
                {currentImage.description}
              </p>
            )}
            <div className="mt-1 flex items-center justify-center gap-3 text-[11px] text-white/50">
              {currentImage.title && !currentImage.description && (
                <span>{currentImage.title}</span>
              )}
              {fechaFormateada && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#F25C05]" />
                  {fechaFormateada}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tira de Miniaturas (si hay más de 1 imagen) */}
        {images.length > 1 && (
          <div
            ref={thumbnailsRef}
            className="flex items-center gap-2 overflow-x-auto py-1 px-2 mx-auto max-w-full no-scrollbar justify-start sm:justify-center"
          >
            {images.map((img, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={img.id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative flex-shrink-0 h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? "border-[#F25C05] ring-2 ring-[#F25C05]/50 scale-105 opacity-100"
                      : "border-white/10 opacity-40 hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(lightboxContent, document.body);
}
