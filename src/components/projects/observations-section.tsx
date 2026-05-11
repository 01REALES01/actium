import { CheckCircle2, Circle, Paperclip, AtSign, Send } from "lucide-react";

const observations = [
  {
    id: 1,
    text: "Retraso en entrega de vigas tipo H por parte del proveedor central. Ajustar cronograma de izaje para semana 22.",
    author: "ING. SOTO",
    time: "HACE 2 HORAS",
    done: true,
  },
  {
    id: 2,
    text: "Revisión de soldaduras en el cuadrante norte aprobada por interventoría. Proceder con pintura anticorrosiva.",
    author: "SUP. MARTÍNEZ",
    time: "HACE 5 HORAS",
    done: false,
  },
  {
    id: 3,
    text: "Se requiere refuerzo de iluminación en túnel de acceso para turno nocturno.",
    author: "SST EQUIPO",
    time: "AYER",
    done: false,
  },
];

export function ObservationsSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-1 w-4 rounded-full bg-orange-500" />
          <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
            OBSERVACIONES DE CAMPO
          </h3>
        </div>

        <div className="space-y-4">
          {observations.map((obs) => (
            <div key={obs.id} className="flex gap-4 rounded-lg border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/[0.08]">
              <div className="mt-1">
                {obs.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-white/20" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/90 leading-relaxed">{obs.text}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{obs.author}</span>
                  <span className="h-1 w-1 rounded-full bg-white/10" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{obs.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-2">
          AGREGAR NOTA MANUAL
        </h3>

        <div className="relative flex-1 group">
          <textarea
            placeholder="Escribe una nueva observación sobre el estado de la obra..."
            className="h-full w-full min-h-[120px] rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all resize-none"
          />
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <button className="p-2 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <Paperclip className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <AtSign className="h-4 w-4" />
            </button>
          </div>
          <button className="absolute bottom-4 right-4 flex items-center gap-2 rounded-md bg-[#FF916E] px-4 py-2 text-xs font-bold text-[#1A1A1A] hover:bg-[#FF916E]/90 transition-colors">
            Publicar Observación
          </button>
        </div>
      </div>
    </div>
  );
}
