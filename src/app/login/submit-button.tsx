"use client";

import { useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      <LogIn className="h-4 w-4" />
      {pending ? "Ingresando..." : "Ingresar"}
    </Button>
  );
}
