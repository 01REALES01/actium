import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type Proyecto = {
  id: string;
  nombre?: string | null;
  estado?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function estadoVariant(estado?: string | null) {
  const normalized = estado?.toLowerCase();
  if (normalized?.includes("cancel") || normalized?.includes("paus")) return "secondary";
  if (normalized?.includes("riesgo") || normalized?.includes("atras")) return "destructive";
  return "default";
}

export default async function ProyectosPage() {
  const supabase = createClient();
  let proyectos: Proyecto[] = [];
  let errorMessage: string | null = null;

  try {
    const { data, error } = await supabase
      .from("proyectos")
      .select("id,nombre,estado,fecha_inicio,fecha_fin,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    proyectos = data ?? [];
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "No se pudieron cargar los proyectos.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">Proyectos</h2>
        <p className="mt-1 text-sm text-slate-500">Vista general de proyectos disponibles para tu cuenta.</p>
      </div>

      {errorMessage ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-sm text-amber-900">{errorMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {proyectos.map((proyecto) => {
          const nombre = proyecto.nombre ?? "Proyecto sin nombre";

          return (
            <Link key={proyecto.id} href={`/proyectos/${proyecto.id}`}>
              <Card className="h-full transition hover:border-blue-300 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{nombre}</CardTitle>
                      <CardDescription>ID {proyecto.id.slice(0, 8)}</CardDescription>
                    </div>
                    <Badge variant={estadoVariant(proyecto.estado)}>{proyecto.estado ?? "activo"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                    <span>Inicio: {formatDate(proyecto.fecha_inicio ?? proyecto.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>Fin: {formatDate(proyecto.fecha_fin)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {!errorMessage && proyectos.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-slate-500">No hay proyectos disponibles para esta cuenta.</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
