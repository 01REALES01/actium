# ACTIUM — Brief de Sistema / Design System
## Prompt maestro para todos los agentes AI (Claude Code, Codex, v0)

> **INSTRUCCIÓN:** Pega este documento al inicio de cada conversación con cualquier agente AI que trabaje en el proyecto ACTIUM. Es la fuente de verdad para decisiones visuales, técnicas y de tono.

---

## 1. IDENTIDAD DE MARCA

**Nombre:** Actium — Infraestructura y Activos
**Sector:** Fabricación, instalación y mantenimiento de estructuras y tuberías en acero
**Concepto:** Fortaleza y modernidad
**Arquetipo:** El Sabio (conocimiento técnico → confianza)
**North Star:** Posicionarnos como el referente regional garantizando confianza a través del rigor técnico en el acero.

**Voz del software:**
- Segura pero cercana — transmite autoridad sin ser distante
- Precisa pero humana — claridad sin perder empatía
- Técnica pero clara — explica lo complejo de forma simple

**Lo que NUNCA debe sentirse el software:** improvisado, genérico, amateur, frío, aburrido.
**Lo que SIEMPRE debe sentirse:** sólido, moderno, premium, confiable, controlado.

---

## 2. PALETA DE COLORES

### Colores principales (usar como CSS variables y en Tailwind config)

```css
:root {
  /* === MARCA ACTIUM === */
  --actium-orange:       #F25C05;   /* Color primario — acciones, CTAs, acentos */
  --actium-orange-hover: #D94F04;   /* Hover de botones primarios */
  --actium-amber:        #F27405;   /* Secundario cálido — badges, tags */
  --actium-sandy:        #F28729;   /* Terciario — highlights suaves */
  --actium-saddle:       #8C470B;   /* Profundidad — bordes activos, focus rings */
  --actium-espresso:     #592C12;   /* Texto sobre fondos claros — headings premium */

  /* === NEUTROS === */
  --actium-graphite:     #282828;   /* Fondo dark mode — superficie principal */
  --actium-dim:          #424242;   /* Fondo dark mode — superficie elevada (cards, modals) */
  --actium-gray:         #6B6B6B;   /* Texto secundario, placeholders */
  --actium-seashell:     #FFF5EE;   /* Fondo light mode — superficie principal */
  --actium-white:        #FFFFFF;   /* Fondo light mode — cards */

  /* === SEMÁNTICOS === */
  --actium-success:      #22C55E;   /* Verde — completado, aprobado, en rango */
  --actium-warning:      #F59E0B;   /* Ámbar — atención, umbral cercano */
  --actium-danger:       #EF4444;   /* Rojo — error, rechazado, incidente, sobre presupuesto */
  --actium-info:         #3B82F6;   /* Azul — informativo, en progreso */

  /* === SUPERFICIES DARK MODE (por defecto) === */
  --bg-primary:          #282828;
  --bg-secondary:        #333333;
  --bg-elevated:         #3D3D3D;
  --bg-hover:            #484848;
  --text-primary:        #FFF5EE;
  --text-secondary:      #A0A0A0;
  --text-muted:          #6B6B6B;
  --border-default:      #404040;
  --border-subtle:       #353535;

  /* === SUPERFICIES LIGHT MODE === */
  --bg-primary-light:    #FFF5EE;
  --bg-secondary-light:  #FFFFFF;
  --bg-elevated-light:   #FFFFFF;
  --text-primary-light:  #282828;
  --text-secondary-light:#6B6B6B;
  --border-default-light:#E5E5E5;
}
```

### Tailwind config extendido

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        actium: {
          orange:   '#F25C05',
          amber:    '#F27405',
          sandy:    '#F28729',
          saddle:   '#8C470B',
          espresso: '#592C12',
          graphite: '#282828',
          dim:      '#424242',
          gray:     '#6B6B6B',
          seashell: '#FFF5EE',
        },
        // Semánticos para dashboard
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],  // Títulos (sustituto de Ancorli)
        body:    ['"Plus Jakarta Sans"', 'sans-serif'],   // Textos (sustituto de Axiforma)
      },
      borderRadius: {
        'actium': '12px',  // Radio estándar de cards y contenedores
      },
      boxShadow: {
        'actium':      '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'actium-lg':   '0 4px 12px rgba(0,0,0,0.4)',
        'actium-glow': '0 0 20px rgba(242,92,5,0.15)',  // Glow naranja sutil
      },
    },
  },
}
```

---

## 3. TIPOGRAFÍA

### Fuentes (Google Fonts — gratuitas)

| Uso | Fuente | Peso | Tamaño referencia |
|-----|--------|------|-------------------|
| Títulos de página (H1) | Plus Jakarta Sans | 700 (Bold) | 28-32px |
| Subtítulos (H2) | Plus Jakarta Sans | 600 (SemiBold) | 22-24px |
| Sección (H3) | Plus Jakarta Sans | 600 (SemiBold) | 18-20px |
| Cuerpo de texto | Plus Jakarta Sans | 400 (Regular) | 14-16px |
| Labels de formularios | Plus Jakarta Sans | 500 (Medium) | 13-14px |
| Captions y metadata | Plus Jakarta Sans | 400 (Regular) | 12px |
| Datos numéricos en dashboards | Plus Jakarta Sans | 700 (Bold) | 24-48px |
| Badges y tags | Plus Jakarta Sans | 600 (SemiBold) | 11-12px |

### Importar en Next.js

```typescript
// app/layout.tsx
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});
```

---

## 4. COMPONENTES BASE

### 4.1 Botones

```
Primario:    bg-actium-orange text-white hover:bg-[#D94F04] rounded-xl px-6 py-2.5 font-semibold
             transition-all duration-200 shadow-actium hover:shadow-actium-lg
Secundario:  bg-transparent border border-actium-orange text-actium-orange hover:bg-actium-orange/10
             rounded-xl px-6 py-2.5 font-semibold transition-all duration-200
Ghost:       bg-transparent text-[--text-secondary] hover:bg-[--bg-hover] rounded-xl px-4 py-2
Danger:      bg-danger text-white hover:bg-red-600 rounded-xl px-6 py-2.5 font-semibold
Disabled:    opacity-50 cursor-not-allowed pointer-events-none
```

**Reglas:**
- Siempre `rounded-xl` (nunca `rounded-full` ni `rounded-sm`)
- Siempre `transition-all duration-200`
- El naranja SOLO se usa en acciones primarias. No en fondos decorativos.

### 4.2 Cards

```
Card base:   bg-[--bg-elevated] rounded-actium border border-[--border-subtle]
             shadow-actium p-6 transition-all duration-200
Card hover:  hover:border-actium-orange/30 hover:shadow-actium-glow
KPI card:    Mismo base + número grande (text-3xl font-bold) + label (text-sm text-[--text-muted])
```

### 4.3 Inputs

```
Input base:  bg-[--bg-secondary] border border-[--border-default] rounded-xl px-4 py-2.5
             text-[--text-primary] placeholder:text-[--text-muted]
             focus:border-actium-orange focus:ring-2 focus:ring-actium-orange/20
             transition-all duration-200
Label:       text-sm font-medium text-[--text-secondary] mb-1.5
Error:       border-danger focus:ring-danger/20 + texto rojo debajo
```

### 4.4 Tablas

```
Header:      bg-actium-espresso text-white text-sm font-semibold uppercase tracking-wider
Row:         border-b border-[--border-subtle] hover:bg-[--bg-hover] transition-colors
Cell:        px-4 py-3 text-sm text-[--text-primary]
```

### 4.5 Badges / Status

```
Activo:      bg-success/15 text-success border border-success/20 rounded-full px-3 py-0.5 text-xs font-semibold
Pendiente:   bg-warning/15 text-warning border border-warning/20
Error:       bg-danger/15 text-danger border border-danger/20
Info:        bg-info/15 text-info border border-info/20
Neutro:      bg-[--bg-hover] text-[--text-secondary] border border-[--border-default]
```

### 4.6 Sidebar / Navegación

```
Sidebar:     bg-[--bg-secondary] border-r border-[--border-subtle] w-64
Nav item:    px-3 py-2 rounded-lg text-sm text-[--text-secondary] hover:bg-[--bg-hover]
             hover:text-[--text-primary] transition-all duration-150
Nav active:  bg-actium-orange/10 text-actium-orange border-l-2 border-actium-orange font-medium
Logo:        Ícono Actium (colmillo) en sidebar header, 32x32px
```

### 4.7 Charts y gráficas (Recharts)

```javascript
// Colores para series de datos
const CHART_COLORS = {
  primary:   '#F25C05', // Naranja Actium — serie principal
  secondary: '#F28729', // Sandy Brown — serie secundaria
  tertiary:  '#8C470B', // Saddle Brown — serie terciaria
  grid:      '#404040', // Líneas de grid (dark mode)
  axis:      '#6B6B6B', // Texto de ejes
  tooltip: {
    bg:      '#333333',
    border:  '#404040',
    text:    '#FFF5EE',
  },
};
// NUNCA usar azul, verde o morado como color principal de gráfica.
// Los colores semánticos (success/danger) solo se usan para indicar estados.
```

---

## 5. LAYOUT Y ESPACIADO

### Grid del dashboard

```
Layout:      Sidebar (w-64 fija) + Main content (flex-1)
Main:        max-w-[1400px] mx-auto px-6 py-6
Grid KPIs:   grid grid-cols-2 md:grid-cols-4 gap-4
Grid cards:  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
Spacing:     Secciones entre sí: mb-8. Cards internas: gap-4. Elementos dentro de card: space-y-3
```

### Responsive breakpoints

```
mobile:      < 768px  → sidebar como drawer, grid 1 col
tablet:      768-1024 → sidebar colapsable, grid 2 col
desktop:     > 1024   → sidebar fija, grid 3-4 col
```

---

## 6. ANIMACIONES (Framer Motion)

```javascript
// Transiciones estándar
const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };
const stagger = { transition: { staggerChildren: 0.05 } };
const scaleIn = { initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 } };

// REGLAS:
// - Duración máxima: 300ms para micro-interacciones, 500ms para transiciones de página
// - Easing: siempre [0.25, 0.1, 0.25, 1] o 'easeOut'
// - NUNCA bounce, NUNCA spring exagerado. La marca es seria y precisa.
// - Hover en cards: scale 1.01 máximo (sutil, no exagerado)
```

---

## 7. DARK MODE / LIGHT MODE

- **Dark mode es el DEFAULT.** El software se presenta en dark mode primero.
- Fondo principal: Graphite `#282828` (no negro puro `#000000`)
- El naranja `#F25C05` es el color de acento — se usa en CTAs, bordes activos, iconos de acción, indicadores seleccionados
- Light mode usa Seashell `#FFF5EE` como fondo (no blanco puro `#FFFFFF`)
- Toggle de modo: ícono sol/luna en la esquina del sidebar

---

## 8. RESTRICCIONES — LO QUE NO HACER

1. **NO usar gradientes en botones** — los gradientes son para el logo y fondos decorativos, no para UI interactiva
2. **NO usar bordes redondeados `rounded-full`** en cards o contenedores — solo en badges y avatares
3. **NO usar más de 2 pesos tipográficos** en una misma pantalla (Regular + Bold o Medium + Bold)
4. **NO usar iconos con relleno (filled)** — usar siempre iconos outline/stroke (lucide-react)
5. **NO usar sombras coloreadas** excepto el glow naranja sutil en hover de cards
6. **NO usar colores fuera de la paleta** — nada de azul, morado, rosado o verde como color decorativo
7. **NO usar imágenes de stock** como backgrounds — fondos siempre sólidos de la paleta
8. **NO usar texto centrado** en contenido principal — siempre alineado a la izquierda excepto en modals y estados vacíos
9. **NO usar más de 4 KPI cards** en una misma fila
10. **NO inventar nuevos patrones de UI** — si shadcn/ui tiene un componente, usarlo y estilizarlo con la paleta

---

## 9. ICONOGRAFÍA

- **Librería:** lucide-react (ya incluida en shadcn/ui)
- **Tamaño estándar:** 20px en navegación, 16px en botones, 24px en headers
- **Stroke width:** 1.5 (default de lucide)
- **Color:** siempre hereda del texto (`currentColor`), excepto naranja en items activos

---

## 10. FORMULARIOS SST — GUÍAS DE DIGITALIZACIÓN

Al construir los formularios SST digitales:

1. **Respetar la estructura del formulario original** pero mejorar la experiencia (agrupación visual, validaciones inline)
2. **Secciones colapsables** — los formularios tienen muchos campos; usar accordions para no abrumar
3. **Checkboxes/toggles** para ítems de verificación (Sí/No/N.A.)
4. **Tablas dinámicas** para listas de trabajadores y pasos de tarea (botón "Agregar fila")
5. **Canvas de firma** al final — con disclaimer visible: "Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según la Ley 527 de 1999"
6. **Generación de PDF** al completar — el PDF debe verse profesional con el logo de Actium y la paleta de colores
7. **Auto-guardado** cada 30 segundos en estado borrador

---

## 11. TEXTOS DE INTERFAZ (UX WRITING)

### Tono del software

El software habla como Actium: experto, directo, sin rodeos pero amable.

| Contexto | ✅ Correcto | ❌ Incorrecto |
|----------|-----------|-------------|
| Estado vacío | "Aún no hay proyectos registrados. Crea el primero." | "¡Ups! No encontramos nada 😅" |
| Error | "No fue posible guardar los cambios. Intenta de nuevo." | "¡Algo salió mal! 🙈" |
| Éxito | "Formulario guardado correctamente." | "¡Genial! Todo listo 🎉" |
| Confirmación | "¿Confirmas el movimiento de $5.000.000 al rubro X?" | "¿Estás seguro? Esta acción no se puede deshacer!!!" |
| Loading | "Cargando proyecto..." | "Espera un momentito..." |

**Reglas:**
- Sin emojis en la interfaz
- Sin signos de exclamación dobles
- Sin diminutivos ("momentito", "cosita")
- Siempre tratar de usted al usuario
- Los labels de formulario en español formal: "Fecha de realización", no "Cuándo se hizo"

---

## 12. ESTRUCTURA DE ARCHIVOS (Referencia)

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Rutas de autenticación
│   │   ├── login/
│   │   └── recovery/
│   ├── (dashboard)/        # Layout con sidebar
│   │   ├── proyectos/
│   │   ├── sst/
│   │   ├── presupuesto/
│   │   └── configuracion/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                 # shadcn/ui components (estilizados con paleta Actium)
│   ├── dashboard/          # KPI cards, charts, summaries
│   ├── sst/                # Formularios SST, firma, PDF
│   ├── presupuesto/        # Rubros, movimientos, auditoría
│   └── shared/             # Sidebar, header, breadcrumbs
├── lib/
│   ├── supabase/           # Cliente, queries, policies
│   ├── hooks/              # Custom hooks
│   └── utils/              # Helpers, formatters
├── types/                  # TypeScript types
└── constants/              # Colores, roles, estados
```

---

## 13. CHECKLIST PRE-COMMIT

Antes de hacer merge de cualquier pantalla, verificar:

- [ ] Usa SOLO colores de la paleta Actium (no hay grises o azules inventados)
- [ ] Tipografía es Plus Jakarta Sans en todos los textos
- [ ] Botón primario es naranja `#F25C05`, no otro color
- [ ] Cards tienen `rounded-xl` y borde sutil
- [ ] Dark mode se ve correcto (fondo `#282828`, no negro puro)
- [ ] Los textos usan la jerarquía definida (H1 > H2 > H3 > body)
- [ ] No hay emojis en la interfaz
- [ ] Los formularios tienen validación inline
- [ ] La pantalla es responsive (probada en 375px, 768px, 1440px)
- [ ] Las animaciones son sutiles (max 300ms, sin bounce)

---

**Última actualización:** Mayo 2026 | **Versión:** 1.0
**Mantenido por:** Equipo ACTIUM
