"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type HoverTooltipProps = {
  /** Contenido del cuadrito. Si es `null`/`undefined`, el trigger no es interactivo. */
  content: React.ReactNode | null;
  children: React.ReactNode;
  className?: string;
};

const VIEWPORT_MARGIN = 12;
const GAP = 8;

/**
 * Cuadrito de información que se muestra al posar el cursor, enfocar con teclado
 * o tocar (móvil) sobre el elemento hijo. Se renderiza en un portal a `document.body`
 * con posición `fixed` para no quedar recortado por contenedores con `overflow-x-auto`
 * ni por filas `sticky`, y mide su propio tamaño tras montarse para no solaparse con
 * celdas vecinas angostas.
 */
export function HoverTooltip({ content, children, className }: HoverTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const [style, setStyle] = React.useState<React.CSSProperties>({ opacity: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const reposition = React.useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const anchor = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const width = panelRect.width || 260;
    const height = panelRect.height || 60;

    const fitsAbove = anchor.top - height - GAP >= VIEWPORT_MARGIN;
    const top = fitsAbove ? anchor.top - height - GAP : anchor.bottom + GAP;

    const centerX = anchor.left + anchor.width / 2;
    const minLeft = VIEWPORT_MARGIN;
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
    const left = Math.min(Math.max(centerX - width / 2, minLeft), Math.max(maxLeft, minLeft));

    setStyle({ top, left, opacity: 1 });
  }, []);

  const show = React.useCallback(() => {
    if (!content) return;
    setOpen(true);
  }, [content]);

  const hide = React.useCallback(() => {
    setOpen(false);
    setPinned(false);
  }, []);

  React.useLayoutEffect(() => {
    if (!open) {
      setStyle({ opacity: 0 });
      return;
    }
    // Primer paint invisible para medir el panel, luego se posiciona.
    reposition();
  }, [open, reposition, content]);

  React.useEffect(() => {
    if (!open) return;
    const onScroll = () => reposition();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) hide();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, hide, reposition]);

  return (
    <>
      <div
        ref={triggerRef}
        tabIndex={content ? 0 : undefined}
        role={content ? "button" : undefined}
        className={cn("min-h-11 outline-none md:min-h-0", className)}
        onMouseEnter={show}
        onMouseLeave={() => {
          if (!pinned) hide();
        }}
        onFocus={show}
        onBlur={() => {
          if (!pinned) hide();
        }}
        onClick={(e) => {
          if (!content) return;
          e.stopPropagation();
          setPinned((p) => {
            const next = !p;
            setOpen(next);
            return next;
          });
        }}
      >
        {children}
      </div>
      {open &&
        content &&
        createPortal(
          <div
            ref={panelRef}
            className="pointer-events-none fixed z-50 w-max max-w-[260px] rounded-actium border border-[--border-subtle] bg-[--bg-elevated] px-3 py-2 text-xs text-[--text-primary] shadow-actium transition-opacity duration-150"
            style={style}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
