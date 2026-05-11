import Image from "next/image";
import { Camera } from "lucide-react";

const photos = [
  { id: 1, src: "/images/gallery/welding.png", alt: "Soldadura" },
  { id: 2, src: "/images/gallery/tower.png", alt: "Estructura" },
  { id: 3, src: "/images/gallery/blueprint.png", alt: "Planos" },
  { id: 4, src: "/images/gallery/truck.png", alt: "Logística" },
];

export function PhotoGallery() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-orange-500" />
          <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">REGISTRO FOTOGRÁFICO DE OBRA</h3>
        </div>
        <button className="text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors">
          VER TODO EL HISTORIAL
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-video overflow-hidden rounded-lg bg-white/5">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover opacity-80 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100 grayscale hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
