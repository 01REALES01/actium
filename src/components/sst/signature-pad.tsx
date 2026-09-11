"use client";

import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PenTool, RotateCcw, Check, Upload, Stamp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { recortarFirma, firmaDesdeArchivo } from "@/lib/firma";

const ALTO_LIENZO = 200;

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  className?: string;
  label?: string;
  /**
   * Firma ya registrada (data URL) que debe verse al abrir el formulario: al
   * retomar un borrador o al firmar el cierre de un permiso. Se muestra como
   * imagen, no repintada en el lienzo: `fromDataURL` estira la imagen a la caja
   * completa sin respetar el aspecto, y una firma recortada (proporción ~4:1)
   * saldría aplastada en un lienzo 1.6:1.
   */
  initialValue?: string;
  /**
   * Habilita subir una imagen de firma y reutilizar la guardada en el perfil.
   *
   * Por defecto NO: la mayoría de las firmas del sistema son de trabajadores
   * (ejecutores, quien recibe el EPP, asistentes a la charla) y poder
   * estamparles una firma guardada sería un problema de control documental.
   * Solo se activa donde el firmante ES el usuario que tiene la sesión.
   */
  permitirFirmaPropia?: boolean;
  /** Firma guardada en el perfil del usuario, para aplicarla con un toque. */
  firmaPropia?: string | null;
}

export function SignaturePad({
  onSave,
  className,
  label = "Firma del Supervisor o Responsable",
  initialValue,
  permitirFirmaPropia = false,
  firmaPropia,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [valor, setValor] = useState(initialValue ?? "");
  const [modo, setModo] = useState<"lienzo" | "vista">(initialValue ? "vista" : "lienzo");
  const [ancho, setAncho] = useState(0);
  // Hay trazo sin confirmar en el lienzo actual.
  const [trazoNuevo, setTrazoNuevo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [guardadaEnPerfil, setGuardadaEnPerfil] = useState(false);

  // Mantiene el último valor que vino del padre para distinguir "el padre lo
  // cambió por fuera" de "lo cambiamos nosotros al firmar".
  const ultimoExterno = useRef(initialValue);

  /**
   * El valor del padre manda. Sin esto, cuando el formulario limpia la firma
   * por fuera (rellenar con el último documento, por ejemplo) el lienzo seguía
   * mostrando tinta y el usuario creía tener firmado un documento que la
   * emisión iba a rechazar.
   */
  useEffect(() => {
    if (initialValue === ultimoExterno.current) return;
    ultimoExterno.current = initialValue;
    setValor(initialValue ?? "");
    setModo(initialValue ? "vista" : "lienzo");
  }, [initialValue]);

  /**
   * El ancho real del contenedor, observado.
   *
   * Se usa como `key` del lienzo a propósito. Con `clearOnResize={false}` el
   * backing store no se reajusta nunca, y signature_pad calcula los puntos con
   * `clientX - rect.left` sin reescalar: si el ancho CSS cambiara (rotar el
   * teléfono, abrir el drawer) el trazo aparecería desplazado respecto al dedo.
   * Remontar por `key` lo recalcula con la densidad correcta. La altura del
   * teclado no cambia el ancho, así que escribir en un campo no remonta nada.
   */
  useEffect(() => {
    const nodo = containerRef.current;
    if (!nodo) return;
    const observer = new ResizeObserver(([entrada]) => {
      setAncho(Math.round(entrada.contentRect.width));
    });
    observer.observe(nodo);
    return () => observer.disconnect();
  }, []);

  /**
   * Registra el valor propio y lo anota como si viniera del padre.
   *
   * Sin esa anotación el formulario nos devuelve la firma recién guardada como
   * `initialValue`, el efecto de arriba la lee como un cambio externo y saltaría
   * a la vista previa a mitad de una firma, dejando el trazo a medias.
   */
  const registrar = (dataUrl: string) => {
    ultimoExterno.current = dataUrl;
    setValor(dataUrl);
    onSave(dataUrl);
  };

  const aplicar = (dataUrl: string) => {
    registrar(dataUrl);
    setTrazoNuevo(false);
    setModo(dataUrl ? "vista" : "lienzo");
  };

  const clear = () => {
    sigCanvas.current?.clear();
    setErrorMsg("");
    setGuardadaEnPerfil(false);
    setTrazoNuevo(false);
    registrar("");
    setModo("lienzo");
  };

  /**
   * Captura el trazo recortado. Corre en cada fin de trazo para no perder nada,
   * pero NO sale del lienzo: cambiar a la vista previa a mitad de una firma
   * impediría seguir trazando.
   */
  const save = () => {
    const pad = sigCanvas.current;
    if (!pad || pad.isEmpty()) return;
    // `getTrimmedCanvas` devuelve una copia, no muta el lienzo en pantalla.
    const dataUrl = recortarFirma(pad.getTrimmedCanvas());
    if (!dataUrl) return;
    registrar(dataUrl);
  };

  const confirmar = () => {
    save();
    if (!sigCanvas.current?.isEmpty()) {
      setTrazoNuevo(false);
      setModo("vista");
    }
  };

  const editar = () => {
    // La firma anterior sigue valiendo hasta que haya una nueva: entrar a
    // corregir no debe dejar el documento sin firmar.
    setModo("lienzo");
    setTrazoNuevo(false);
    setErrorMsg("");
  };

  const usarMiFirma = () => {
    if (!firmaPropia) return;
    setErrorMsg("");
    setGuardadaEnPerfil(false);
    aplicar(firmaPropia);
  };

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo tras un error.
    e.target.value = "";
    if (!file) return;

    setProcesando(true);
    setErrorMsg("");
    setGuardadaEnPerfil(false);
    try {
      const dataUrl = await firmaDesdeArchivo(file);
      aplicar(dataUrl);

      // La firma ya quedó aplicada al documento: si el guardado en el perfil
      // falla, se avisa pero no se pierde lo que el usuario acaba de subir.
      const { guardarMiFirmaAction } = await import("@/lib/actions/perfil");
      const res = await guardarMiFirmaAction(dataUrl);
      if (res.ok) setGuardadaEnPerfil(true);
      else setErrorMsg(res.error);
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible procesar la imagen.");
    } finally {
      setProcesando(false);
    }
  };

  const firmado = Boolean(valor);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
          <PenTool className="h-3 w-3 text-[#F25C05]" />
          {label}
        </label>

        {firmado && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <Check className="h-3 w-3" />
            Firma Guardada
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        onMouseLeave={modo === "lienzo" ? save : undefined}
        className={cn(
          "relative rounded-xl border overflow-hidden bg-white/5 transition-all duration-300",
          firmado ? "border-emerald-500/30 ring-1 ring-emerald-500/10" : "border-white/10 hover:border-white/20"
        )}
      >
        {modo === "vista" ? (
          <div className="flex items-center justify-center p-6" style={{ height: ALTO_LIENZO }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={valor}
              alt="Firma registrada"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          // Sin `width`/`height` en canvasProps, react-signature-canvas escala
          // el lienzo por devicePixelRatio: es lo que evita que una firma hecha
          // en el celular se guarde a un tercio de resolución y salga pixelada
          // en el PDF. La altura tiene que venir del CSS por eso mismo.
          ancho > 0 && (
            <SignatureCanvas
              key={ancho}
              ref={sigCanvas}
              clearOnResize={false}
              canvasProps={{
                className: "signature-canvas block w-full h-[200px] cursor-crosshair touch-none",
              }}
              penColor="#F25C05"
              // El fondo transparente no es decorativo: el recorte de `firma.ts`
              // localiza la tinta por su canal alfa y un fondo opaco lo anularía.
              backgroundColor="transparent"
              onBegin={() => {
                setErrorMsg("");
                setTrazoNuevo(true);
              }}
              onEnd={save}
            />
          )
        )}

        {modo === "lienzo" && (
          <>
            {/* Guía base para la firma */}
            <div className="absolute bottom-10 left-10 right-10 h-px bg-white/10 pointer-events-none border-b border-dashed border-white/20" />
            <div className="absolute bottom-5 left-10 text-[9px] text-white/20 font-bold tracking-widest uppercase pointer-events-none">
              Firme sobre la línea
            </div>
          </>
        )}

        {/* Controles superpuestos */}
        <div className="absolute top-3 right-3 flex gap-2">
          {modo === "lienzo" && trazoNuevo && (
            <button
              type="button"
              onClick={confirmar}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white backdrop-blur-md transition-all border border-emerald-500/50"
              title="Confirmar Firma"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {modo === "vista" && (
            <button
              type="button"
              onClick={editar}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-black/40 px-3 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all border border-white/5"
              title="Firmar de nuevo"
            >
              <PenTool className="h-3 w-3" />
              Cambiar
            </button>
          )}
          <button
            type="button"
            onClick={clear}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white/40 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all border border-white/5"
            title="Limpiar Firma"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {permitirFirmaPropia && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {firmaPropia && (
              <button
                type="button"
                onClick={usarMiFirma}
                disabled={procesando}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#F25C05] bg-transparent px-4 text-[11px] font-bold uppercase tracking-widest text-[#F25C05] transition-all duration-200 hover:bg-[#F25C05]/10 disabled:opacity-40 md:flex-none"
              >
                <Stamp className="h-4 w-4" />
                Usar mi firma
              </button>
            )}
            <label
              className={cn(
                "flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-[11px] font-bold uppercase tracking-widest text-white/60 transition-all duration-200 hover:border-white/20 hover:text-white md:flex-none",
                procesando && "pointer-events-none opacity-40",
              )}
            >
              {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {procesando ? "Procesando" : firmaPropia ? "Cambiar mi firma" : "Subir mi firma"}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={handleArchivo}
                disabled={procesando}
              />
            </label>
          </div>

          <p className="text-[9px] font-medium uppercase tracking-widest text-white/30">
            La imagen debe ser de tinta oscura sobre fondo claro. Se le quita el fondo y queda guardada
            como su firma para los próximos documentos.
          </p>

          {guardadaEnPerfil && (
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">
              La firma quedó guardada en su perfil.
            </p>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium leading-relaxed text-red-400">
          {errorMsg}
        </p>
      )}

      <p className="text-[9px] font-medium text-white/30 uppercase tracking-widest text-justify leading-relaxed">
        <strong>Aviso Legal:</strong> Esta firma tiene carácter de registro informativo interno de la plataforma Actium y
        no constituye una firma electrónica o digital certificada según la Ley 527 de 1999 de la República de Colombia.
      </p>
    </div>
  );
}
