import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfiguracionPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-[--text-secondary]">
        Módulo de configuración preparado para la siguiente fase.
      </CardContent>
    </Card>
  );
}
