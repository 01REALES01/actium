import Link from "next/link";
import { redirect } from "next/navigation";
import { Landmark, FileText, FileMinus, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/auth/roles";
import { listProyectosFinanzas } from "@/lib/data/presupuesto";
import { getCxCResumen } from "@/lib/data/cxc";
import { getCxPResumen } from "@/lib/data/cxp";
import { PresupuestoOverview } from "@/components/finanzas/presupuesto-overview";
import { formatCOP } from "@/lib/format";

export default async function FinanzasPage() {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect("/proyectos");
  }

  const [proyectos, cxcResumen, cxpResumen] = await Promise.all([
    listProyectosFinanzas(supabase),
    getCxCResumen(supabase),
    getCxPResumen(supabase),
  ]);

  const accesos = [
    {
      href: "/finanzas/presupuesto",
      icon: Landmark,
      titulo: "Presupuesto",
      descripcion: "Rubros, techos y movimientos por proyecto.",
    },
    {
      href: "/finanzas/cxc",
      icon: FileText,
      titulo: "Cuentas por cobrar",
      descripcion: `${formatCOP(cxcResumen.pendiente)} pendientes, ${formatCOP(cxcResumen.vencido)} vencidas.`,
    },
    {
      href: "/finanzas/cxp",
      icon: FileMinus,
      titulo: "Cuentas por pagar",
      descripcion: `${formatCOP(cxpResumen.pendiente)} pendientes, ${formatCOP(cxpResumen.vencido)} vencidas.`,
    },
    {
      href: "/finanzas/flujo-caja",
      icon: LineChart,
      titulo: "Flujo de caja",
      descripcion: "Ingresos, egresos y saldo acumulado de todos los proyectos.",
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div>
        <h1 className="font-display text-3xl text-[--text-primary] md:text-4xl">Finanzas</h1>
        <p className="mt-2 text-sm text-[--text-secondary]">
          Presupuesto, cuentas por cobrar y por pagar de todos los proyectos.
        </p>
      </div>

      <PresupuestoOverview proyectos={proyectos} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {accesos.map((a) => (
          <Link key={a.titulo} href={a.href}>
            <Card className="h-full hover:border-actium-orange/30 hover:shadow-actium-glow">
              <CardHeader>
                <a.icon className="h-8 w-8 text-actium-orange" strokeWidth={1.5} />
                <CardTitle className="mt-2 font-sans text-base font-semibold">{a.titulo}</CardTitle>
                <CardDescription>{a.descripcion}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
