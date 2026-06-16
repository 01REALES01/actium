import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SoportePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Soporte</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-[--text-secondary]">
        Módulo de soporte preparado para la siguiente fase.
      </CardContent>
    </Card>
  );
}
