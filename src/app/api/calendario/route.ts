import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeVerPersonal } from "@/lib/auth/roles";
import { getCalendarEvents } from "@/lib/data/calendario";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta || !FECHA.test(desde) || !FECHA.test(hasta)) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const eventos = await getCalendarEvents(supabase, {
    desde,
    hasta,
    verPersonal: puedeVerPersonal(perfil.rol),
  });

  return NextResponse.json({ eventos });
}
