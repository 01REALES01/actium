import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, esSuperAdmin } from "@/lib/auth/roles";
import { obtenerDocumentoSoldadura } from "@/lib/data/soldadura";
import { listEmpresas, listSubempresas } from "@/lib/data/organizacion";
import { DocumentoSoldaduraForm, type OpcionEmpresa } from "@/components/soldadura/documento-soldadura-form";
import {
  obtenerEspec,
  esTipoSoldadura,
  esVarianteSoldadura,
  SIGLA_TIPO_SOLDADURA,
  NOMBRE_TIPO_SOLDADURA,
  NOMBRE_VARIANTE,
  NORMA_VARIANTE,
  DESCRIPCION_VARIANTE,
  VARIANTES_SOLDADURA,
  type ValoresDocumento,
} from "@/constants/soldadura";

type Props = {
  params: { tipo: string };
  searchParams: { variante?: string; borradorId?: string };
};

export default async function NuevoDocumentoSoldaduraPage({ params, searchParams }: Props) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!esSuperAdmin(perfil?.rol)) redirect("/proyectos");

  if (!esTipoSoldadura(params.tipo)) notFound();
  const tipo = params.tipo;

  // Un borrador ya sabe bajo qué norma se abrió: no se vuelve a preguntar.
  const borrador = searchParams.borradorId
    ? await obtenerDocumentoSoldadura(supabase, searchParams.borradorId)
    : null;

  const varianteParam = borrador?.variante ?? searchParams.variante;
  const variante = varianteParam && esVarianteSoldadura(varianteParam) ? varianteParam : null;

  const cabecera = (
    <div className="flex flex-col gap-6">
      <Link
        href="/soldadura"
        className="flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a documentos de soldadura
      </Link>
      <div>
        <Image
          src="/logo-actium.png"
          alt="Actium"
          width={140}
          height={38}
          priority
          className="mb-4 h-9 w-auto brightness-0 invert"
        />
        <h1 className="font-display text-3xl uppercase tracking-tight text-white md:text-4xl">
          {SIGLA_TIPO_SOLDADURA[tipo]}
        </h1>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-white/40 md:text-sm">
          {NOMBRE_TIPO_SOLDADURA[tipo]}
        </p>
      </div>
    </div>
  );

  // ─── Paso 1: bajo qué norma se emite ───────────────────────────────────────
  // Los dos formatos comparten propósito pero no campos, así que la norma se
  // elige ANTES de diligenciar: cambiarla después obligaría a descartar lo
  // escrito, porque ningún campo del QW-482 tiene equivalente exacto en el
  // Form E(a) del D1.2.
  if (!variante) {
    return (
      <div className="flex flex-col gap-8 pb-12">
        {cabecera}
        <div className="max-w-3xl">
          <h2 className="font-subtitle text-lg font-semibold text-white">
            ¿Bajo qué formato se emite este documento?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/40">
            Los dos formatos piden variables distintas. Seleccione el que corresponde al alcance del
            trabajo: la elección no puede cambiarse después de empezar a diligenciar.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {VARIANTES_SOLDADURA.map((v) => {
              const espec = obtenerEspec(tipo, v);
              return (
                <Link
                  key={v}
                  href={`/soldadura/nuevo/${tipo}?variante=${v}`}
                  className="group flex min-h-[44px] flex-col gap-3 rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl transition-all duration-200 hover:border-[#F25C05]/40 hover:bg-white/[0.03]"
                >
                  <p className="font-display text-2xl uppercase tracking-tight text-white">
                    {NOMBRE_VARIANTE[v]}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#F25C05]">
                    {espec.formulario}
                  </p>
                  <p className="text-xs leading-relaxed text-white/40">{DESCRIPCION_VARIANTE[v]}</p>
                  <p className="mt-auto pt-2 text-[10px] uppercase tracking-widest text-white/30">
                    {NORMA_VARIANTE[v]}
                  </p>
                  <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F25C05]">
                    Continuar <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Paso 2: el formato ────────────────────────────────────────────────────
  const espec = obtenerEspec(tipo, variante);

  // Empresas a las que se puede adscribir el documento. No se derivan del
  // perfil: `super_admin` no tiene empresa propia porque las administra todas,
  // así que la propietaria se elige en el formulario y su nombre y NIT son los
  // que salen impresos en el encabezado del PDF.
  const [empresasRaw, subempresasRaw] = await Promise.all([
    listEmpresas(supabase),
    listSubempresas(supabase),
  ]);

  const empresas: OpcionEmpresa[] = empresasRaw
    .filter((e) => e.activa)
    .map((e) => ({
      id: e.id,
      nombre: e.nombre,
      nit: e.nit,
      email: e.email ?? "",
      subempresas: subempresasRaw
        .filter((sub) => sub.empresa_id === e.id)
        .map((sub) => ({ id: sub.id, nombre: sub.nombre })),
    }))
    // Sin subempresa no se puede adscribir el documento: la fila las exige.
    .filter((e) => e.subempresas.length > 0);

  // Los valores de un borrador viven en el JSON de respaldo, junto al PDF.
  let valoresGuardados: ValoresDocumento | null = null;
  if (borrador?.pdf_generado_path) {
    const { data: archivo } = await supabase.storage
      .from("pdfs-formularios")
      .download(borrador.pdf_generado_path.replace(/\.pdf$/, ".json"));
    if (archivo) {
      try {
        valoresGuardados = JSON.parse(await archivo.text());
      } catch (e) {
        console.error("Respaldo JSON ilegible del borrador de soldadura:", e);
      }
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {cabecera}
      <DocumentoSoldaduraForm
        espec={espec}
        empresas={empresas}
        empresaIdInicial={borrador?.empresa_id ?? perfil?.empresa_id ?? ""}
        subempresaIdInicial={borrador?.subempresa_id ?? perfil?.subempresa_id ?? ""}
        documentoIdInicial={borrador?.id ?? null}
        valoresGuardados={valoresGuardados}
        pdfPathInicial={borrador?.pdf_generado_path ?? null}
        codigoInicial={borrador?.codigo_consecutivo ?? ""}
      />
    </div>
  );
}
