import Link from "next/link";
import { Wrench, HardHat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getHerramientasResumen, listProyectosConEpp } from "@/lib/data/inventario";

export default async function InventarioPage() {
  const supabase = createClient();

  const [resumen, proyectosEpp] = await Promise.all([
    getHerramientasResumen(supabase),
    listProyectosConEpp(supabase),
  ]);

  const eppBajoMinimo = proyectosEpp.reduce((acc, p) => acc + p.itemsBajoMinimo, 0);

  const kpis = [
    { label: "Tipos de herramienta", valor: resumen.tipos },
    { label: "Unidades disponibles", valor: resumen.disponibles },
    { label: "Unidades asignadas", valor: resumen.asignadas },
    { label: "EPP bajo mínimo", valor: eppBajoMinimo, alerta: eppBajoMinimo > 0 },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div>
        <h1 className="font-display text-3xl text-[--text-primary] md:text-4xl">Inventario</h1>
        <p className="mt-2 text-sm text-[--text-secondary]">
          Herramientas de Actium y elementos de protección personal por proyecto.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1">
              <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`font-display text-2xl ${kpi.alerta ? "text-danger" : "text-actium-orange"}`}>
                {kpi.valor}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link href="/inventario/herramientas">
          <Card className="h-full hover:border-actium-orange/30 hover:shadow-actium-glow">
            <CardHeader>
              <Wrench className="h-8 w-8 text-actium-orange" strokeWidth={1.5} />
              <CardTitle className="mt-2 font-sans text-base font-semibold">Herramientas</CardTitle>
              <p className="text-sm text-[--text-secondary]">
                Catálogo maestro, disponibilidad y préstamos a proyectos.
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/inventario/epp">
          <Card className="h-full hover:border-actium-orange/30 hover:shadow-actium-glow">
            <CardHeader>
              <HardHat className="h-8 w-8 text-actium-orange" strokeWidth={1.5} />
              <CardTitle className="mt-2 font-sans text-base font-semibold">
                Elementos de protección personal
              </CardTitle>
              <p className="text-sm text-[--text-secondary]">
                Stock de EPP por proyecto, alimentado según la necesidad de la obra.
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
