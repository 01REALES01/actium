import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SstPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SST</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-[--text-secondary]">
        Base del módulo SST preparada para la siguiente fase.
      </CardContent>
    </Card>
  );
}
