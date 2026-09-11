"use client";

// =============================================================================
// Formulario de los documentos de soldadura (WPS / PQR / WPQ).
// =============================================================================
// Recorre la especificación del formato y dibuja un control por campo. Es el
// mismo componente para los seis formatos: lo que cambia entre un QW-482 y un
// Form E(a) son datos, no interfaz.
//
// El estado es un único objeto `valores` indexado por el `id` del campo, y no
// sesenta `useState` sueltos: ese objeto es exactamente lo que se serializa al
// JSON de respaldo y lo que recibe el PDF, así que no hay que armarlo ni
// desarmarlo en cada guardado.
// =============================================================================

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Download, History, Save, ImagePlus, Camera, X } from "lucide-react";
import { SignaturePad } from "@/components/sst/signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { comprimirImagen } from "@/lib/imagen";
import { listarFaltantes } from "@/lib/sst/faltantes";
import { hoyLocal } from "@/lib/fecha";
import {
  filaVacia,
  valoresIniciales,
  camposObligatorios,
  NOMBRE_VARIANTE,
  type CampoSpec,
  type EspecDocumento,
  type FilaTabla,
  type ValoresDocumento,
} from "@/constants/soldadura";

/** Empresa a la que se puede adscribir un documento, con sus subempresas. */
export type OpcionEmpresa = {
  id: string;
  nombre: string;
  nit: string;
  email: string;
  subempresas: { id: string; nombre: string }[];
};

const MAX_FOTOS = 12;

const CARD = "rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE = "flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase";
const NUM = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs";
const LABEL = "text-[10px] font-bold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20";
const TEXTAREA = "w-full min-h-[88px] bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:border-[#F25C05] focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 transition-all";
const CELL = "h-11 w-full min-w-[120px] rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-[#F25C05] focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 transition-all";
const BTN_SEC = "flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F25C05]/40 bg-[#F25C05]/10 px-4 text-[10px] font-bold uppercase tracking-widest text-[#F25C05] transition-all hover:bg-[#F25C05]/20 disabled:cursor-not-allowed disabled:opacity-50";

export function DocumentoSoldaduraForm({
  espec,
  empresas,
  empresaIdInicial = "",
  subempresaIdInicial = "",
  documentoIdInicial = null,
  valoresGuardados,
  pdfPathInicial = null,
  codigoInicial = "",
  estadoInicial = "borrador",
  firmaPropia = null,
  usuarioNombre = "",
}: {
  espec: EspecDocumento;
  empresas: OpcionEmpresa[];
  empresaIdInicial?: string;
  subempresaIdInicial?: string;
  documentoIdInicial?: string | null;
  valoresGuardados?: ValoresDocumento | null;
  pdfPathInicial?: string | null;
  codigoInicial?: string;
  /** `firmado` reabre un documento ya emitido para corregirlo y reemitirlo. */
  estadoInicial?: "borrador" | "firmado";
  /** Firma guardada en el perfil de quien tiene la sesión, si cargó alguna. */
  firmaPropia?: string | null;
  /** Nombre de quien tiene la sesión, para estampar la reemisión en el PDF. */
  usuarioNombre?: string;
}) {
  const router = useRouter();

  /**
   * Modo corrección de un documento ya emitido.
   *
   * Cambia tres cosas que en un borrador son inofensivas y aquí no: no hay
   * guardado intermedio (el JSON de respaldo tiene que seguir correspondiendo
   * al PDF vigente), no se puede rellenar con otro documento (sustituiría en
   * silencio el contenido de un registro de calidad), y el dueño queda fijo
   * (la ruta del archivo y el consecutivo ya se numeraron por esa empresa).
   */
  const esEdicion = estadoInicial === "firmado";

  // El formato en blanco define la forma; lo guardado la sobreescribe. Así un
  // borrador de antes de que el formato creciera sigue abriendo con los campos
  // nuevos vacíos en lugar de romperse.
  const [valores, setValores] = useState<ValoresDocumento>(() => ({
    ...valoresIniciales(espec),
    ...(valoresGuardados ?? {}),
  }));

  const [documentoId, setDocumentoId] = useState<string | null>(documentoIdInicial);
  const [pdfPath, setPdfPath] = useState<string | null>(pdfPathInicial);
  const [codigo, setCodigo] = useState(codigoInicial);

  // El documento pertenece a una empresa, no al usuario: `super_admin` las
  // administra todas y no tiene una propia. Con una sola empresa disponible se
  // preselecciona, que es el caso corriente y ahorra un clic.
  const [empresaId, setEmpresaId] = useState(
    empresaIdInicial || (empresas.length === 1 ? empresas[0].id : ""),
  );
  const [subempresaId, setSubempresaId] = useState(subempresaIdInicial);

  const empresaSel = empresas.find((e) => e.id === empresaId) ?? null;
  const subempresasDisponibles = empresaSel?.subempresas ?? [];

  // Cambiar de empresa invalida la subempresa elegida; si la nueva tiene una
  // sola, se toma esa.
  const cambiarEmpresa = (id: string) => {
    setEmpresaId(id);
    const subs = empresas.find((e) => e.id === id)?.subempresas ?? [];
    setSubempresaId(subs.length === 1 ? subs[0].id : "");
  };

  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [rellenando, setRellenando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [avisoMsg, setAvisoMsg] = useState("");
  const [avisoPendiente, setAvisoPendiente] = useState(false);

  const set = (id: string, valor: ValoresDocumento[string]) =>
    setValores((prev) => ({ ...prev, [id]: valor }));

  const leerTexto = (id: string): string => {
    const v = valores[id];
    return typeof v === "string" ? v : "";
  };
  const leerLista = (id: string): string[] => (Array.isArray(valores[id]) ? (valores[id] as string[]) : []);
  const leerFilas = (id: string): FilaTabla[] =>
    Array.isArray(valores[id]) ? (valores[id] as FilaTabla[]) : [];

  // ─── Tablas ────────────────────────────────────────────────────────────────

  const actualizarCelda = (tablaId: string, indice: number, columna: string, valor: string) =>
    setValores((prev) => {
      const filas = [...((prev[tablaId] as FilaTabla[]) ?? [])];
      filas[indice] = { ...filas[indice], [columna]: valor };
      return { ...prev, [tablaId]: filas };
    });

  const agregarFila = (campo: Extract<CampoSpec, { t: "tabla" }>) =>
    setValores((prev) => ({
      ...prev,
      [campo.id]: [...((prev[campo.id] as FilaTabla[]) ?? []), filaVacia(campo.columnas)],
    }));

  const eliminarFila = (tablaId: string, indice: number) =>
    setValores((prev) => ({
      ...prev,
      [tablaId]: ((prev[tablaId] as FilaTabla[]) ?? []).filter((_, i) => i !== indice),
    }));

  // ─── Croquis ───────────────────────────────────────────────────────────────

  /**
   * Las imágenes viajan dentro del JSON de respaldo, no como archivos aparte:
   * comprimirlas es lo que mantiene ese respaldo por debajo del límite del
   * bucket. Un retrato no necesita el mismo lado que un croquis de junta.
   */
  const leerImagen = async (file: File, maxLado: number): Promise<string> => {
    const comprimido = await comprimirImagen(file, { maxLado, calidad: 0.8 });
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result || ""));
      lector.onerror = () => reject(new Error("No fue posible leer la imagen."));
      lector.readAsDataURL(comprimido);
    });
  };

  const adjuntarImagen = async (campoId: string, file: File | undefined, maxLado: number) => {
    if (!file) return;
    setErrorMsg("");
    try {
      set(campoId, await leerImagen(file, maxLado));
    } catch {
      setErrorMsg("No fue posible procesar la imagen. Intenta con otro archivo.");
    }
  };

  const adjuntarAGaleria = async (campoId: string, archivos: FileList | null) => {
    if (!archivos?.length) return;
    setErrorMsg("");

    const actuales = leerLista(campoId);
    const cupo = MAX_FOTOS - actuales.length;
    if (cupo <= 0) {
      setErrorMsg(`El registro fotográfico admite hasta ${MAX_FOTOS} fotografías.`);
      return;
    }

    try {
      const nuevas = await Promise.all(
        Array.from(archivos).slice(0, cupo).map((f) => leerImagen(f, 1200)),
      );
      set(campoId, [...actuales, ...nuevas]);
      if (archivos.length > cupo) {
        setAvisoPendiente(true);
        setAvisoMsg(`Se agregaron ${cupo} fotografías: el registro admite hasta ${MAX_FOTOS}.`);
      }
    } catch {
      setErrorMsg("No fue posible procesar alguna de las fotografías.");
    }
  };

  // ─── Validación ────────────────────────────────────────────────────────────

  // El papel admite renglones vacíos cuando la variable no aplica, así que solo
  // se exige lo que identifica al documento: sin número no se puede archivar.
  const obligatorios = camposObligatorios(espec);

  const pendientes = (): string[] => {
    const faltan = obligatorios.filter((c) => !leerTexto(c.id).trim()).map((c) => c.label);
    if (espec.firmas.some((f) => !leerTexto(f.id))) {
      faltan.push(`firma de ${espec.firmas.map((f) => f.label).join(" y ")}`);
    }
    return faltan;
  };

  // ─── Persistencia ──────────────────────────────────────────────────────────

  const construirFormData = (ref?: { id: string; pdfPath: string }): FormData => {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(valores));
    fd.append("tipo", espec.tipo);
    fd.append("variante", espec.variante);
    fd.append("empresaId", empresaId);
    fd.append("subempresaId", subempresaId);
    const id = ref?.id ?? documentoId;
    const ruta = ref?.pdfPath ?? pdfPath;
    if (id) fd.append("documentoId", id);
    if (ruta) fd.append("existingPdfPath", ruta);
    return fd;
  };

  /**
   * Guarda el borrador y devuelve la fila resultante. El consecutivo lo genera
   * un trigger AL INSERTAR, así que el documento tiene que existir antes de
   * dibujar el PDF: de otro modo la primera emisión imprimiría un encabezado
   * sin número, que es justamente lo que identifica al documento en el archivo.
   */
  const asegurarDocumento = async () => {
    // Un documento emitido ya tiene consecutivo y ruta, y el trigger que numera
    // es BEFORE INSERT: no hay nada que pedirle al servidor. Además `guardarBorrador`
    // rechaza a propósito cualquier fila que no siga en borrador.
    if (esEdicion && documentoId && pdfPath) {
      return { id: documentoId, pdfPath, codigo };
    }

    const { guardarBorradorSoldaduraAction } = await import("@/lib/actions/soldadura");
    const res = await guardarBorradorSoldaduraAction(construirFormData());
    // El servidor devuelve sus errores como valor: lanzarlos aquí los deja en
    // el `catch` de quien llamó, con el mensaje real intacto.
    if (!res.ok) throw new Error(res.error);
    setDocumentoId(res.datos.id);
    setPdfPath(res.datos.pdfPath);
    setCodigo(res.datos.codigo);
    return res.datos;
  };

  /** Lo que impide guardar siquiera un borrador. Molde: los formatos SST. */
  const faltantesParaGuardar = (): string[] => {
    const faltan: string[] = [];
    if (empresas.length === 0) faltan.push("una empresa registrada a la cual adscribir el documento");
    else if (!empresaId) faltan.push("seleccionar la empresa propietaria");
    else if (!subempresaId) faltan.push("seleccionar la subempresa propietaria");
    return faltan;
  };

  const handleGuardarBorrador = async () => {
    setErrorMsg("");
    setAvisoMsg("");

    const bloqueantes = faltantesParaGuardar();
    if (bloqueantes.length > 0) {
      setErrorMsg(`Para guardar el borrador falta ${listarFaltantes(bloqueantes)}.`);
      return;
    }

    setGuardando(true);
    try {
      await asegurarDocumento();

      const faltan = pendientes();
      setAvisoPendiente(faltan.length > 0);
      setAvisoMsg(
        faltan.length === 0
          ? "Borrador guardado. El documento está completo: puede emitirlo cuando lo requiera."
          : `Borrador guardado. Queda pendiente por diligenciar: ${listarFaltantes(faltan)}.`,
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible guardar el borrador. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleGenerar = async () => {
    setErrorMsg("");
    setAvisoMsg("");

    const faltan = [...faltantesParaGuardar(), ...pendientes()];
    if (faltan.length > 0) {
      setErrorMsg(`No fue posible emitir el documento. Falta ${listarFaltantes(faltan)}.`);
      return;
    }

    setGenerando(true);
    try {
      const doc = await asegurarDocumento();

      // @react-pdf/renderer pesa medio megabyte: se carga al emitir, no al
      // abrir el formulario. Es el mismo trato que le dan los formatos SST.
      const { buildDocumentoSoldaduraPDFBlob } = await import("./documento-soldadura-pdf-document");
      const blob = await buildDocumentoSoldaduraPDFBlob({
        espec,
        valores,
        codigo: doc.codigo,
        reemision: esEdicion ? { fecha: hoyLocal(), usuario: usuarioNombre } : undefined,
        empresa: {
          nombre: empresaSel?.nombre ?? "",
          nit: empresaSel?.nit ?? "",
          email: empresaSel?.email ?? "",
        },
      });

      const fd = construirFormData(doc);
      fd.append("pdfFile", blob, `${espec.formulario}.pdf`);

      const { guardarPdfSoldaduraAction } = await import("@/lib/actions/soldadura");
      const res = await guardarPdfSoldaduraAction(fd);
      if (!res.ok) throw new Error(res.error);
      router.push(`/soldadura/${res.datos.id}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible generar el PDF. Intenta de nuevo.");
      setGenerando(false);
    }
  };

  const handleRellenarUltimo = async () => {
    setErrorMsg("");
    setAvisoMsg("");
    setRellenando(true);
    try {
      const { obtenerUltimoSoldaduraAction } = await import("@/lib/actions/soldadura");
      const res = await obtenerUltimoSoldaduraAction(espec.tipo, espec.variante);

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      if (!res.datos.encontrado || !res.datos.valores) {
        setErrorMsg(res.datos.motivo || "Aún no hay un documento anterior para copiar.");
        return;
      }

      setValores({ ...valoresIniciales(espec), ...res.datos.valores });
      setAvisoPendiente(false);
      setAvisoMsg(
        `Se copiaron las variables del documento ${res.datos.referencia?.numero || "anterior"}${
          res.datos.referencia?.fecha ? ` del ${res.datos.referencia.fecha}` : ""
        }. El número, los croquis y las firmas se diligencian de nuevo.`,
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible recuperar el último documento.");
    } finally {
      setRellenando(false);
    }
  };

  // ─── Controles por tipo de campo ───────────────────────────────────────────

  const renderCampo = (campo: CampoSpec, clave: string) => {
    switch (campo.t) {
      case "nota":
        return (
          <p key={clave} className="sm:col-span-2 text-[11px] leading-relaxed text-white/30 italic">
            {campo.texto}
          </p>
        );

      case "texto":
      case "fecha":
        return (
          <CampoForm key={clave} label={campo.label} nota={"nota" in campo ? campo.nota : undefined} full={campo.full}>
            <Input
              type={campo.t === "fecha" ? "date" : "text"}
              value={leerTexto(campo.id)}
              onChange={(e) => set(campo.id, e.target.value)}
              className={FIELD}
            />
          </CampoForm>
        );

      case "area":
        return (
          <CampoForm key={clave} label={campo.label} nota={campo.nota} full>
            <textarea
              value={leerTexto(campo.id)}
              onChange={(e) => set(campo.id, e.target.value)}
              className={TEXTAREA}
            />
          </CampoForm>
        );

      case "check":
        return (
          <div key={clave} className="sm:col-span-2">
            <Chip
              label={campo.label}
              activo={Boolean(valores[campo.id])}
              onClick={() => set(campo.id, !valores[campo.id])}
            />
          </div>
        );

      case "checks": {
        const marcadas = leerLista(campo.id);
        return (
          <div key={clave} className="sm:col-span-2 space-y-3">
            <Label className={LABEL}>{campo.label}</Label>
            <div className="flex flex-wrap gap-2">
              {campo.opciones.map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  activo={marcadas.includes(o.id)}
                  onClick={() =>
                    set(
                      campo.id,
                      marcadas.includes(o.id)
                        ? marcadas.filter((x) => x !== o.id)
                        : [...marcadas, o.id],
                    )
                  }
                />
              ))}
            </div>
          </div>
        );
      }

      case "sino": {
        const v = leerTexto(campo.id);
        return (
          <div key={clave} className={`space-y-3 ${campo.full ? "sm:col-span-2" : ""}`}>
            <Label className={LABEL}>{campo.label}</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "si", label: "Yes" },
                { id: "no", label: "No" },
              ].map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  activo={v === o.id}
                  onClick={() => set(campo.id, v === o.id ? "" : o.id)}
                />
              ))}
            </div>
          </div>
        );
      }

      case "croquis": {
        const src = leerTexto(campo.id);
        return (
          <div key={clave} className="sm:col-span-2 space-y-3">
            <Label className={LABEL}>{campo.label}</Label>
            {campo.nota && <p className="text-[11px] text-white/30 italic">{campo.nota}</p>}
            {src ? (
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={campo.label} className="mx-auto max-h-72 w-auto object-contain" />
                <button
                  type="button"
                  onClick={() => set(campo.id, "")}
                  className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl bg-black/70 text-white transition-colors hover:bg-red-500/80"
                  aria-label="Quitar croquis"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-colors hover:border-[#F25C05]/40 hover:bg-white/5">
                <ImagePlus className="h-6 w-6 text-white/30" strokeWidth={1.5} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Adjuntar croquis
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => adjuntarImagen(campo.id, e.target.files?.[0], 1400)}
                />
              </label>
            )}
          </div>
        );
      }

      case "foto": {
        const src = leerTexto(campo.id);
        return (
          <div key={clave} className="space-y-3">
            <Label className={LABEL}>{campo.label}</Label>
            {campo.nota && <p className="text-[11px] italic text-white/30">{campo.nota}</p>}
            {src ? (
              <div className="relative w-40 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={campo.label} className="aspect-[3/4] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set(campo.id, "")}
                  className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-xl bg-black/70 text-white transition-colors hover:bg-red-500/80"
                  aria-label="Quitar fotografía"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex aspect-[3/4] w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center transition-colors hover:border-[#F25C05]/40 hover:bg-white/5">
                <Camera className="h-6 w-6 text-white/30" strokeWidth={1.5} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Adjuntar foto
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => adjuntarImagen(campo.id, e.target.files?.[0], 900)}
                />
              </label>
            )}
          </div>
        );
      }

      case "galeria": {
        const fotos = leerLista(campo.id);
        return (
          <div key={clave} className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <Label className={LABEL}>{campo.label}</Label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                {fotos.length} de {MAX_FOTOS}
              </span>
            </div>
            {campo.nota && <p className="text-[11px] italic text-white/30">{campo.nota}</p>}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {fotos.map((src, i) => (
                <div key={i} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Fotografía ${i + 1}`} className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => set(campo.id, fotos.filter((_, j) => j !== i))}
                    className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-xl bg-black/70 text-white transition-colors hover:bg-red-500/80"
                    aria-label={`Quitar fotografía ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {fotos.length < MAX_FOTOS && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-center transition-colors hover:border-[#F25C05]/40 hover:bg-white/5">
                  <Camera className="h-6 w-6 text-white/30" strokeWidth={1.5} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Agregar
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => adjuntarAGaleria(campo.id, e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>
        );
      }

      case "tabla":
        return (
          <div key={clave} className="sm:col-span-2 space-y-3">
            {campo.label && <Label className={LABEL}>{campo.label}</Label>}
            {campo.filasFijas ? (
              <TablaRotulos
                campo={campo}
                filas={leerFilas(campo.id)}
                onCelda={(i, col, v) => actualizarCelda(campo.id, i, col, v)}
              />
            ) : (
              <TablaLibre
                campo={campo}
                filas={leerFilas(campo.id)}
                onCelda={(i, col, v) => actualizarCelda(campo.id, i, col, v)}
                onAgregar={() => agregarFila(campo)}
                onEliminar={(i) => eliminarFila(campo.id, i)}
              />
            )}
            {campo.nota && <p className="text-[11px] text-white/30 italic">{campo.nota}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  const faltanAhora = pendientes();

  return (
    <div className="flex max-w-4xl flex-col gap-6 sm:gap-8">
      <div className={CARD}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {espec.formulario} · {NOMBRE_VARIANTE[espec.variante]}
            </p>
            <p className="mt-1 text-sm font-medium text-white/70">{espec.norma}</p>
            {codigo && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#F25C05]">
                Consecutivo {codigo}
              </p>
            )}
          </div>
          {!esEdicion && (
            <button type="button" onClick={handleRellenarUltimo} disabled={rellenando} className={`${BTN_SEC} w-full sm:w-auto`}>
              {rellenando ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
              Rellenar con el último
            </button>
          )}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 border-t border-white/5 pt-6 sm:grid-cols-2">
          <CampoForm label="Empresa propietaria">
            <select
              value={empresaId}
              onChange={(e) => cambiarEmpresa(e.target.value)}
              disabled={esEdicion}
              className={FIELD + " w-full px-3 disabled:opacity-40 [&>option]:bg-[#1A1A1A] [&>option]:text-white"}
            >
              <option value="">Seleccione una empresa...</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </CampoForm>
          <CampoForm label="Subempresa / división">
            <select
              value={subempresaId}
              onChange={(e) => setSubempresaId(e.target.value)}
              disabled={esEdicion || !empresaId}
              className={FIELD + " w-full px-3 disabled:opacity-40 [&>option]:bg-[#1A1A1A] [&>option]:text-white"}
            >
              <option value="">
                {empresaId ? "Seleccione una subempresa..." : "Elija primero la empresa"}
              </option>
              {subempresasDisponibles.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nombre}
                </option>
              ))}
            </select>
          </CampoForm>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-white/30">
          {esEdicion ? (
            <>
              El documento ya fue emitido: conserva su consecutivo y su empresa, y por eso no pueden
              cambiarse. Al emitir se reemplaza el PDF vigente, el enlace del documento no cambia y la
              fecha de la firma original se conserva.
            </>
          ) : (
            <>
              El documento queda archivado a nombre de esta empresa y su consecutivo se numera por ella.
              &ldquo;Rellenar con el último&rdquo; copia las variables del documento anterior de este mismo
              formato: el número, los croquis y las firmas se diligencian de nuevo cada vez.
            </>
          )}
        </p>
      </div>

      {espec.secciones.map((seccion, i) => (
        <div key={seccion.id} className={CARD}>
          <h2 className={`${SECTION_TITLE} mb-6`}>
            <span className={NUM}>{i + 1}</span>
            <span className="min-w-0">
              {seccion.titulo}
              {seccion.ref && <span className="ml-2 text-white/30">({seccion.ref})</span>}
            </span>
          </h2>
          {seccion.nota && (
            <p className="mb-5 text-[11px] leading-relaxed text-white/30 italic">{seccion.nota}</p>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {seccion.campos.map((campo, j) =>
              renderCampo(campo, "id" in campo ? campo.id : `${seccion.id}-nota-${j}`),
            )}
          </div>
        </div>
      ))}

      <div className={CARD}>
        <h2 className={`${SECTION_TITLE} mb-6`}>
          <span className={NUM}>{espec.secciones.length + 1}</span> Certificación y firmas
        </h2>

        {espec.certificacion && (
          <p className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-white/60">
            {espec.certificacion}
          </p>
        )}

        <div className="space-y-8">
          {espec.firmas.map((firma) => (
            <SignaturePad
              key={firma.id}
              label={firma.label}
              initialValue={leerTexto(firma.id)}
              onSave={(dataUrl) => set(firma.id, dataUrl)}
              // Es la única firma del sistema que pone el propio usuario: los
              // demás formatos recogen firmas de trabajadores, donde estampar
              // una firma guardada sería un problema de control documental.
              permitirFirmaPropia
              firmaPropia={firmaPropia}
            />
          ))}
        </div>

        <p className="mt-6 text-[10px] italic leading-relaxed text-white/30">
          Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según
          la Ley 527 de 1999.
        </p>

        {errorMsg && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium leading-relaxed text-red-400">
            {errorMsg}
          </div>
        )}
        {avisoMsg && (
          <div
            className={`mt-6 rounded-xl border p-4 text-sm font-medium leading-relaxed ${
              avisoPendiente
                ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {avisoMsg}
          </div>
        )}
        {esEdicion && espec.claves.revision && (
          <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-[11px] font-medium leading-relaxed text-amber-400">
            Si cambió el contenido técnico del procedimiento, actualice el número de revisión antes de
            emitir. Si solo corrige una errata, déjelo como está.
          </p>
        )}
        {!errorMsg && !avisoMsg && faltanAhora.length > 0 && (
          <p className="mt-6 text-[11px] leading-relaxed text-white/30">
            Para emitir falta: {listarFaltantes(faltanAhora)}.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-white/5 pt-6 sm:flex-row sm:justify-end">
          {/* Sin guardado intermedio en edición: un JSON de respaldo guardado
              sin regenerar el PDF dejaría de corresponder al archivo vigente, y
              ese JSON es el que alimenta la reapertura y "rellenar con el último". */}
          {!esEdicion && (
            <button
              type="button"
              onClick={handleGuardarBorrador}
              disabled={guardando || generando}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-8 text-sm font-bold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {guardando ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" /> Guardar borrador
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerar}
            disabled={generando || guardando}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#F25C05] px-10 text-sm font-bold text-white shadow-lg shadow-[#F25C05]/20 transition-all hover:bg-[#F25C05]/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {generando ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Generando...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" /> {esEdicion ? "Emitir nueva versión" : "Emitir documento en PDF"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function CampoForm({
  label,
  nota,
  full,
  children,
}: {
  label: string;
  nota?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label className={LABEL}>{label}</Label>
      {children}
      {nota && <p className="text-[10px] italic text-white/25">{nota}</p>}
    </div>
  );
}

function Chip({ label, activo, onClick }: { label: string; activo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] items-center rounded-xl border px-4 text-left text-xs font-semibold transition-all ${
        activo
          ? "border-[#F25C05] bg-[#F25C05]/15 text-[#F25C05]"
          : "border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Tabla cuyos renglones vienen impresos en el papel (los metales de aporte del
 * QW-482, las variables del QW-484A). Se apila en tarjetas en vez de dibujar
 * una rejilla: el rótulo es largo y en un teléfono una tabla de tres columnas
 * con esos textos es ilegible.
 */
function TablaRotulos({
  campo,
  filas,
  onCelda,
}: {
  campo: Extract<CampoSpec, { t: "tabla" }>;
  filas: FilaTabla[];
  onCelda: (indice: number, columna: string, valor: string) => void;
}) {
  const [rotulo, ...columnas] = campo.columnas;

  return (
    <div className="space-y-2">
      {filas.map((fila, i) => (
        <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-bold text-white/70">{fila[rotulo.id]}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {columnas.map((c) => (
              <div key={c.id} className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-white/30">{c.label}</Label>
                <input
                  value={fila[c.id] ?? ""}
                  onChange={(e) => onCelda(i, c.id, e.target.value)}
                  className={CELL}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Tabla de filas agregables: se desplaza dentro de su caja, nunca la página. */
function TablaLibre({
  campo,
  filas,
  onCelda,
  onAgregar,
  onEliminar,
}: {
  campo: Extract<CampoSpec, { t: "tabla" }>;
  filas: FilaTabla[];
  onCelda: (indice: number, columna: string, valor: string) => void;
  onAgregar: () => void;
  onEliminar: (indice: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              {campo.columnas.map((c) => (
                <th
                  key={c.id}
                  className="px-2 pb-1 text-left text-[10px] font-bold uppercase tracking-widest text-white/30"
                >
                  {c.label}
                </th>
              ))}
              <th className="w-11" />
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={i}>
                {campo.columnas.map((c) => (
                  <td key={c.id} className="px-1 align-middle">
                    <input
                      value={fila[c.id] ?? ""}
                      onChange={(e) => onCelda(i, c.id, e.target.value)}
                      className={CELL}
                    />
                  </td>
                ))}
                <td className="px-1 align-middle">
                  <button
                    type="button"
                    onClick={() => onEliminar(i)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-400/10"
                    aria-label="Eliminar fila"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={onAgregar} className={BTN_SEC}>
        <Plus className="h-4 w-4" /> Agregar fila
      </button>
    </div>
  );
}
