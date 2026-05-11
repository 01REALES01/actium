import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PresupuestoPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Presupuesto</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-[--text-secondary]">
        Base del módulo de presupuesto preparada para la siguiente fase.
      </CardContent>
    </Card>
  );
}
