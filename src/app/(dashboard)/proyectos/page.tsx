import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { listProyectos } from "@/lib/data/proyectos";
import type { ProyectoEstado } from "@/types/database.types";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function estadoVariant(estado: ProyectoEstado | null | undefined) {
  if (estado === "cancelado") return "destructive";
  if (estado === "pausado") return "warning";
  if (estado === "completado") return "success";
  if (estado === "en_curso") return "info";
  return "default";
}

export default async function ProyectosPage() {
  const supabase = createClient();
  let proyectos: Awaited<ReturnType<typeof listProyectos>> = [];
  let errorMessage: string | null = null;

  try {
    proyectos = await listProyectos(supabase);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "No se pudieron cargar los proyectos.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-[--text-primary]">Proyectos</h2>
        <p className="mt-1 text-sm text-[--text-secondary]">
          Vista general de proyectos disponibles para su cuenta.
        </p>
      </div>

      {errorMessage ? (
        <Card className="border-danger/20 bg-danger/10">
          <CardContent className="pt-6 text-sm text-danger">{errorMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {proyectos.map((proyecto) => (
          <Link key={proyecto.id} href={`/proyectos/${proyecto.id}`}>
            <Card className="h-full hover:border-actium-orange/30 hover:shadow-actium-glow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{proyecto.nombre}</CardTitle>
                    <CardDescription>{proyecto.codigo}</CardDescription>
                  </div>
                  <Badge variant={estadoVariant(proyecto.estado)}>{proyecto.estado}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[--text-secondary]">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-actium-orange" strokeWidth={1.5} />
                  <span>Inicio: {formatDate(proyecto.fecha_inicio)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[--text-muted]" strokeWidth={1.5} />
                  <span>Fin: {formatDate(proyecto.fecha_fin_proyectada)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!errorMessage && proyectos.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-[--text-secondary]">
            Aún no hay proyectos registrados para esta cuenta.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
