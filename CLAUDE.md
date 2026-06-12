# CLAUDE.md — ACTIUM

Este archivo es la **fuente de verdad** para cualquier agente AI (Claude Code, Codex, v0) que toque este repositorio. Antes de generar UI, refactorizar componentes o crear pantallas, lee este documento completo.

---

## 1. Identidad de marca

- **Producto:** Actium — Infraestructura y Activos
- **Sector:** Fabricación, instalación y mantenimiento de estructuras y tuberías en acero
- **Arquetipo:** El Sabio (rigor técnico → confianza)
- **Voz del software:** segura pero cercana, precisa pero humana, técnica pero clara
- **Nunca debe sentirse:** improvisado, genérico, amateur, frío, aburrido
- **Siempre debe sentirse:** sólido, moderno, premium, confiable, controlado

---

## 2. Paleta — única fuente de color

Usar SIEMPRE los tokens (`bg-actium-*`, `text-actium-*`, variables CSS). Nunca `bg-blue-*`, `bg-zinc-*`, `bg-orange-500` ni grises inventados.

| Token | Hex | Uso |
|---|---|---|
| `actium-orange` | `#F25C05` | Primario — CTAs, acentos, indicadores activos |
| `actium-orange-hover` | `#D94F04` | Hover de botones primarios |
| `actium-amber` | `#F27405` | Secundario cálido — badges, tags |
| `actium-sandy` | `#F28729` | Terciario — highlights suaves |
| `actium-saddle` | `#8C470B` | Profundidad — bordes activos, focus rings, headers de tabla |
| `actium-espresso` | `#592C12` | Texto premium sobre fondos claros, headers de tabla |
| `actium-graphite` | `#282828` | Fondo dark mode — superficie principal (NO negro puro) |
| `actium-dim` | `#424242` | Superficie elevada (cards, modals) |
| `actium-gray` | `#6B6B6B` | Texto secundario, placeholders |
| `actium-seashell` | `#FFF5EE` | Fondo light mode (NO blanco puro) |
| `actium-white` | `#FFFFFF` | Cards en light mode |
| `success` | `#22C55E` | Estado completado/aprobado |
| `warning` | `#F59E0B` | Atención, umbral cercano |
| `danger` | `#EF4444` | Error, rechazado, sobre presupuesto |
| `info` | `#3B82F6` | Informativo, en progreso |

**Dark mode es el DEFAULT.** Toggle con clase `.dark` en `<html>`.

---

## 3. Tipografía

Dos familias, usos bien delimitados:

| Familia | Clase Tailwind | Archivo | Uso |
|---|---|---|---|
| **Ancorli** | `font-display` | `public/fonts/Ancorli.woff2` | H1, H2, logotipo, datos KPI grandes |
| **Plus Jakarta Sans** | `font-sans` / `font-body` | Google Fonts `--font-jakarta` | H3, body, labels, captions, badges |

- Ancorli es una sola familia sin pesos variables — **nunca agregar `font-bold` a `font-display`**.
- Jakarta Sans: pesos disponibles 300, 400, 500, 600, 700, 800.
- Máximo **2 pesos Jakarta por pantalla**.

| Uso | Familia | Peso | Tamaño |
|---|---|---|---|
| H1 página | Ancorli (`font-display`) | — | 28–32px |
| H2 | Ancorli (`font-display`) | — | 22–24px |
| Logotipo / marca | Ancorli (`font-display`) | — | libre |
| Dato KPI | Ancorli (`font-display`) | — | 24–48px |
| H3 sección | Jakarta (`font-sans`) | 600 | 18–20px |
| Body | Jakarta (`font-sans`) | 400 | 14–16px |
| Label form | Jakarta (`font-sans`) | 500 | 13–14px |
| Caption | Jakarta (`font-sans`) | 400 | 12px |
| Badge | Jakarta (`font-sans`) | 600 | 11–12px |

---

## 4. Componentes — clases canónicas

### Botones
- **Primario:** `bg-actium-orange text-white hover:bg-actium-orange-hover rounded-xl px-6 py-2.5 font-semibold transition-all duration-200 shadow-actium hover:shadow-actium-lg`
- **Secundario:** `bg-transparent border border-actium-orange text-actium-orange hover:bg-actium-orange/10 rounded-xl px-6 py-2.5 font-semibold`
- **Ghost:** `bg-transparent text-text-secondary hover:bg-bg-hover rounded-xl px-4 py-2`
- **Danger:** `bg-danger text-white hover:bg-red-600 rounded-xl px-6 py-2.5 font-semibold`
- Siempre `rounded-xl` (NUNCA `rounded-full` ni `rounded-md` en CTAs).
- Siempre `transition-all duration-200`.

### Cards
- **Base:** `bg-bg-elevated rounded-actium border border-border-subtle shadow-actium p-6 transition-all duration-200`
- **Hover:** `hover:border-actium-orange/30 hover:shadow-actium-glow` (scale máximo 1.01)

### Inputs
- `bg-bg-secondary border border-border-default rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:border-actium-orange focus:ring-2 focus:ring-actium-orange/20 transition-all duration-200`

### Badges
- Activo: `bg-success/15 text-success border border-success/20 rounded-full px-3 py-0.5 text-xs font-semibold`
- Pendiente: `bg-warning/15 text-warning border border-warning/20`
- Error: `bg-danger/15 text-danger border border-danger/20`
- Info: `bg-info/15 text-info border border-info/20`

### Tablas
- Header: `bg-actium-espresso text-white text-sm font-semibold uppercase tracking-wider`
- Row: `border-b border-border-subtle hover:bg-bg-hover transition-colors`

### Sidebar / Nav
- Sidebar: `bg-bg-secondary border-r border-border-subtle w-64`
- Nav item: `px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary`
- Nav activo: `bg-actium-orange/10 text-actium-orange border-l-2 border-actium-orange font-medium`

### Charts (Recharts)
```ts
const CHART_COLORS = {
  primary:   '#F25C05',
  secondary: '#F28729',
  tertiary:  '#8C470B',
  grid:      '#404040',
  axis:      '#6B6B6B',
};
```
NUNCA azul/verde/morado como color principal de gráfica. Semánticos solo para estados.

---

## 5. Layout

> **MOBILE FIRST — regla rectora.** La mayoría del uso real es en obra, desde un celular. Diseña y construye para móvil PRIMERO, luego escala a tablet/desktop. Nunca al revés.
>
> - Escribe las clases base de Tailwind para móvil (sin prefijo) y añade `md:` / `lg:` solo para agrandar en pantallas grandes — nunca uses el desktop como base y `max-md:` para "arreglar" el móvil.
> - El layout debe ser usable y completo a **375px de ancho** sin scroll horizontal, sin texto cortado y sin elementos solapados.
> - Targets táctiles mínimo **44×44px** (botones, toggles, items de nav, filas de tabla accionables). Nada de hovers como única forma de interacción.
> - Tablas: en móvil deben colapsar a tarjetas apiladas o permitir scroll horizontal contenido (`overflow-x-auto`), nunca romper el layout.
> - Sidebar es drawer en móvil (oculta por defecto, abre con botón). El contenido principal ocupa el ancho completo en móvil.
> - Formularios SST en una sola columna en móvil; campos a ancho completo, teclados apropiados (`type="tel"`, `inputMode`, etc.).
> - Modales: a pantalla completa o casi en móvil, no centrados con márgenes que dejen el contenido apretado.

- Sidebar fija `w-64` (desktop) + main `flex-1 max-w-[1400px] mx-auto px-6 py-6`
- KPI grid: `grid grid-cols-2 md:grid-cols-4 gap-4` (móvil arranca en 2 columnas, máximo 4 KPIs por fila)
- Card grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Secciones entre sí: `mb-8`. Dentro de card: `space-y-3`
- Breakpoints: < 768 mobile (sidebar drawer, base de diseño), 768–1024 tablet, > 1024 desktop

---

## 6. Animaciones

- Máximo **300ms** micro-interacciones, 500ms transiciones de página.
- Easing: `[0.25, 0.1, 0.25, 1]` o `easeOut`.
- **NUNCA** bounce ni spring exagerado.
- Hover en cards: `scale 1.01` máximo.

---

## 7. Iconografía

- `lucide-react` exclusivamente, stroke `1.5`, outline (nunca filled).
- Tamaños: 20px nav, 16px botones, 24px headers.
- Color: hereda `currentColor`. Naranja solo en items activos.

---

## 8. UX Writing

- Tono de usted, español formal, sin emojis, sin signos de exclamación dobles, sin diminutivos.
- Estado vacío: "Aún no hay proyectos registrados. Crea el primero."
- Error: "No fue posible guardar los cambios. Intenta de nuevo."
- Éxito: "Formulario guardado correctamente."
- Loading: "Cargando proyecto..."

---

## 9. Restricciones — lo que NO hacer

1. NO gradientes en botones (solo logo / fondos decorativos puntuales).
2. NO `rounded-full` en cards/contenedores (solo badges y avatares).
3. NO más de 2 pesos tipográficos por pantalla.
4. NO iconos filled — solo outline lucide-react.
5. NO sombras coloreadas excepto el glow naranja sutil en hover.
6. NO colores fuera de paleta (azul, morado, rosado, verde decorativo).
7. NO imágenes de stock como background.
8. NO texto centrado en contenido principal (solo modals y empty states).
9. NO más de 4 KPI cards por fila.
10. NO inventar componentes — si shadcn/ui lo tiene, úsalo y estilízalo con tokens.
11. NO `bg-zinc-*`, `bg-orange-500`, `text-orange-400`, etc. — usa los tokens `actium-*`.

---

## 10. Estructura

```
src/
├── app/
│   ├── login/                 # Auth
│   ├── (dashboard)/           # Layout con sidebar
│   │   ├── proyectos/
│   │   ├── sst/
│   │   ├── presupuesto/
│   │   └── configuracion/
│   ├── layout.tsx             # Plus Jakarta Sans, dark default
│   └── globals.css            # Tokens CSS Actium
├── components/
│   ├── ui/                    # shadcn estilizado con paleta Actium
│   ├── dashboard/, sst/, presupuesto/, projects/, shared/
├── lib/supabase/, hooks/, utils/
└── types/, constants/
```

---

## 11. Formularios SST

- Secciones colapsables (accordions), checkboxes Sí/No/N.A., tablas dinámicas con "Agregar fila".
- Canvas de firma con disclaimer: *"Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según la Ley 527 de 1999"*.
- Auto-guardado cada 30s en estado borrador.
- PDF profesional con logo Actium y paleta.

---

## 12. Checklist pre-commit (UI)

- [ ] **Mobile first:** diseñado desde 375px hacia arriba, sin scroll horizontal ni texto cortado
- [ ] **Targets táctiles ≥ 44×44px**, sin depender solo de hover
- [ ] Tablas colapsan a tarjetas o scroll contenido en móvil
- [ ] Solo colores de la paleta Actium (sin grises/azules inventados)
- [ ] Plus Jakarta Sans en todos los textos
- [ ] CTA primario es `bg-actium-orange`
- [ ] Cards con `rounded-actium` (12px) y borde sutil
- [ ] Dark mode con fondo `#282828` (no negro puro)
- [ ] Jerarquía tipográfica respetada
- [ ] Sin emojis en interfaz
- [ ] Validación inline en formularios
- [ ] Responsive probado en 375 / 768 / 1440
- [ ] Animaciones ≤ 300ms, sin bounce
