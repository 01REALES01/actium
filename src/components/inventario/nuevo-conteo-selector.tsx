"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ClipboardCheck, Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { abrirConteoAction } from "@/lib/actions/inventario";
import type { AmbitoConteo } from "@/lib/data/inventario";

export function NuevoConteoSelector({ ambitos }: { ambitos: AmbitoConteo[] }) {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const porEmpresa = useMemo(() => {
    const bodega = ambitos.find((a) => a.proyectoId === null);
    const proyectos = ambitos.filter((a) => a.proyectoId !== null);
    const grupos = new Map<string, { empresaNombre: string; ambitos: AmbitoConteo[] }>();
    for (const a of proyectos) {
      const key = a.empresaNombre ?? "Sin empresa";
      const grupo = grupos.get(key) ?? { empresaNombre: key, ambitos: [] };
      grupo.ambitos.push(a);
      grupos.set(key, grupo);
    }
    return { bodega, grupos: Array.from(grupos.values()) };
  }, [ambitos]);

  async function handleAbrir(ambito: AmbitoConteo) {
    const clave = ambito.proyectoId ?? "bodega";
    setError(null);
    setCargando(clave);
    try {
      const { id } = await abrirConteoAction({ proyectoId: ambito.proyectoId });
      router.push(`/inventario/herramientas/conteos/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible abrir el conteo.");
      setCargando(null);
    }
  }

  if (ambitos.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        No hay herramientas asignadas a proyectos ni en bodega para contar en este momento.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {error}
        </p>
      ) : null}

      {porEmpresa.bodega ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-subtitle text-sm font-semibold text-[--text-secondary]">Bodega</h2>
          <AmbitoCard ambito={porEmpresa.bodega} cargando={cargando} onAbrir={handleAbrir} icono="bodega" />
        </div>
      ) : null}

      {porEmpresa.grupos.map((grupo) => (
        <div key={grupo.empresaNombre} className="flex flex-col gap-3">
          <h2 className="font-subtitle text-sm font-semibold text-[--text-secondary]">{grupo.empresaNombre}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {grupo.ambitos.map((ambito) => (
              <AmbitoCard key={ambito.proyectoId} ambito={ambito} cargando={cargando} onAbrir={handleAbrir} icono="proyecto" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AmbitoCard({
  ambito,
  cargando,
  onAbrir,
  icono,
}: {
  ambito: AmbitoConteo;
  cargando: string | null;
  onAbrir: (ambito: AmbitoConteo) => void;
  icono: "bodega" | "proyecto";
}) {
  const clave = ambito.proyectoId ?? "bodega";
  const isLoading = cargando === clave;
  const Icono = icono === "bodega" ? Warehouse : ClipboardCheck;

  return (
    <button
      type="button"
      onClick={() => onAbrir(ambito)}
      disabled={cargando !== null}
      className="w-full text-left disabled:opacity-60"
    >
      <Card className="flex min-h-[44px] flex-row items-center gap-4 p-4 transition-all duration-200 hover:border-actium-orange/30 hover:shadow-actium-glow">
        <Icono className="h-6 w-6 shrink-0 text-actium-orange" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="font-sans text-sm font-semibold text-[--text-primary]">{ambito.nombre}</p>
          <p className="text-xs text-[--text-secondary]">
            {ambito.totalHerramientas} herramienta{ambito.totalHerramientas === 1 ? "" : "s"} para contar
          </p>
        </div>
        {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-actium-orange" /> : null}
      </Card>
    </button>
  );
}
