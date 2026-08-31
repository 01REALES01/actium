# Paginación de PDFs — guía de referencia

Este documento existe porque un cliente reportó, en el PDF de Inspecciones Preoperacionales, páginas en blanco a la mitad o casi completas entre bloques de información que podían ir de corrido. Al revisar el ejemplo entregado (12 páginas para una inspección de 2 máquinas de soldar, 2 pulidoras, 7 extensiones eléctricas y un botiquín) se confirmó que el contenido cabía holgadamente en 7–8 páginas. Al auditar los 8 documentos PDF del repositorio se encontró que **el defecto no era exclusivo de ese formato**: el mismo patrón de estilos se copió de PDF en PDF, así que "casi todos" los permisos SST lo arrastraban.

Léelo antes de tocar cualquier archivo `*-pdf-document.tsx`, y antes de crear uno nuevo.

## La causa raíz

Todos los PDFs de Actium usan [`@react-pdf/renderer`](https://react-pdf.org/), cuyo motor de layout decide solo, página a página, dónde partir el contenido — igual que el navegador decide dónde partir una página web al imprimirla. El error sistemático en este repositorio fue usar **`break`** (salto de página duro e incondicional) para evitar que un bloque quedara partido a la mitad entre dos páginas. `break` no sabe si el bloque cabe o no: siempre salta. Si el bloque anterior deja 20 cm libres en la hoja, esos 20 cm quedan en blanco.

Las herramientas correctas para "no partas esto a la mitad" son otras, y **`minPresenceAhead` no se usaba ni una sola vez en los 8 archivos** antes de esta corrección.

## Las tres props y cuándo usar cada una

### `wrap={false}` — "esto es indivisible"
Úsala en bloques **cortos**: una fila de tabla, el encabezado de una tarjeta, el bloque completo de firmas. El motor los trata como una unidad: si no caben en lo que queda de página, saltan enteros a la siguiente — pero solo si de verdad no caben.

**Nunca la pongas sobre una sección completa o una tabla completa.** Si el bloque es grande (una tabla de 20 filas, una sección con varias subtablas), `wrap={false}` fuerza el mismo problema que `break`: si no cabe entero, se empuja entero y deja hueco. Este fue el error concreto que abría la página en blanco tras "Máquina de soldar 1" en el PDF reportado — un grupo de 20 aspectos completo tenía `wrap={false}`.

```tsx
// Mal — el bloque es grande, puede no caber entero
<View wrap={false}>{/* toda una sección con 20 filas */}</View>

// Bien — solo la fila individual es indivisible
<View style={s.tr} wrap={false}>{/* una fila de tabla */}</View>
```

### `minPresenceAhead={n}` — "no me dejes huérfano"
Úsala en **títulos de sección y encabezados**. Le dice al motor: si no hay al menos `n` puntos de espacio libre después de este elemento, empieza página nueva. Así el título nunca queda solo al pie de una hoja con su contenido en la siguiente.

```tsx
<Text style={s.sectionTitle} minPresenceAhead={50}>
  4. Bloqueo de energías peligrosas
</Text>
```

`n` orientativo: 40–50 para un título seguido de una tabla; 60–70 para un encabezado de tarjeta de equipo que debe arrastrar consigo la cabecera de su tabla y las primeras filas.

### `break` — solo condicional, nunca fijo
Es válido *únicamente* cuando la condición depende de los datos, no de la posición en el documento. El único uso correcto en el repo, antes y después de esta corrección:

```tsx
// parte-pdf-document.tsx — solo abre página nueva si hay más de 4 fotos
<Text style={s.sectionTitle} break={data.fotos.length > 4}>
```

Si ves `break` sin condición (`<Text break>` o `<View break>`), es casi siempre un error: reemplázalo por `minPresenceAhead` en el título, o quítalo y deja que el flujo decida.

## Reglas fijas de estilo

- `page.paddingTop: 30, paddingBottom: 34` (antes 36/48 en la mayoría de los archivos). El footer vive en `bottom: 22` con ~12 pt de alto; `paddingBottom: 48` desperdiciaba ~14 pt de área útil en **cada página de cada documento**.
- **Nunca `overflow: "hidden"`** en `s.table` ni en `s.sigTable`. En `@react-pdf/renderer` degrada el corte de una tabla entre páginas — es la razón por la que se terminó protegiendo las tablas con `break`. El borde redondeado (`borderRadius: 4`) se ve igual sin `overflow: "hidden"`.
- El encabezado de una tabla (`s.trHead`) que puede partirse entre páginas **siempre lleva `fixed`**, para que se repita en cada página nueva:
  ```tsx
  <View style={s.trHead} fixed>
  ```
  Nunca lo apliques a la cabecera de una `sigTable` de firmas — esa tabla debe protegerse con `wrap={false}` en su lugar, no partirse.

## Plantilla del bloque de firmas

El patrón que reemplaza el `break` que tenían los 8 documentos: envolver título + texto legal + tabla de firmas + disclaimer en un único `wrap={false}`. Cae de corrido tras el contenido anterior y solo salta de página si de verdad no cabe.

```tsx
<View wrap={false}>
  <Text style={s.sectionTitle}>Firmas y compromiso</Text>
  <Text style={s.legalText}>{TEXTO_LEGAL}</Text>
  <View style={s.sigTable}>
    {/* ... */}
  </View>
  <Text style={s.disclaimer}>
    Esta firma tiene carácter informativo y NO constituye firma electrónica
    certificada según la Ley 527 de 1999.
  </Text>
</View>
```

Excepción: cuando la tabla de firmas puede crecer mucho (una fila por trabajador, como en Permiso en Caliente o Permiso en Altura), no envuelvas todo el bloque — solo marca la cabecera de la tabla `fixed` y cada fila `wrap={false}`, y deja que el título use `minPresenceAhead`. Envolver un bloque potencialmente largo en `wrap={false}` reproduce el mismo problema que se está corrigiendo.

## Documento de referencia

`src/components/sst/charla-seguridad-pdf-document.tsx` fue, antes de esta auditoría, el único de los 8 que ya usaba `<View style={s.trHead} fixed>` y `wrap={false}` solo por fila. Es el ejemplo más simple para copiar el patrón de tabla larga.

## Checklist pre-commit para cualquier PDF nuevo o modificado

- [ ] Ningún `break` sin condición de datos — solo `break={condición}` cuando aplica, como `parte-pdf-document.tsx:511`.
- [ ] `minPresenceAhead` en todo título de sección que antes llevaba `break`.
- [ ] `wrap={false}` solo en unidades cortas (fila, encabezado de tarjeta, bloque de firmas corto) — nunca en una sección o tabla completa.
- [ ] `s.trHead` con `fixed` en toda tabla de datos que puede partirse entre páginas.
- [ ] Sin `overflow: "hidden"` en `s.table` ni `s.sigTable`.
- [ ] `page.paddingTop: 30, paddingBottom: 34`.
- [ ] Generar el PDF con datos representativos y de caso borde (mínimo y máximo contenido) y revisar visualmente que no queden páginas con más de ~1/3 en blanco, salvo la última.

## Registro de la auditoría (2026-08-31)

Hallazgos verificados en los 8 documentos antes de la corrección:

| Causa | Archivos afectados |
|---|---|
| `break` incondicional (12 ocurrencias) | `charla-seguridad` (×3), `permiso-caliente` (×2), `permiso-altura` (×2), `ats-formato` (×2), `preoperacional` (×2, incluyendo un `break` por herramienta calculado con un IIFE), `entrega-epp` (×1), `conteo` (×1) |
| `overflow: "hidden"` en `table`/`sigTable` | los 8 archivos |
| `s.trHead` sin `fixed` | los 8 archivos salvo `charla-seguridad` (que ya lo hacía bien) |
| `page.paddingBottom: 48` | 7 de 8 archivos (`parte-pdf-document.tsx` ya usaba valores más ajustados) |
| `wrap={false}` sobre un bloque grande en vez de por fila | `preoperacional` (grupo completo de 20 items de la máquina de soldar — causa directa de las páginas en blanco reportadas), `permiso-caliente` (sección completa) |
| Sello / etiqueta desbordada en el encabezado de equipo | `preoperacional-pdf-document.tsx` (nombres de equipo largos cortaban el sello "Apto para operar") |

Todos corregidos en el commit que introduce este documento. Si el problema reaparece en un PDF nuevo, es casi seguro que se copió el patrón antiguo de otro archivo — revisa contra esta lista antes de depurar desde cero.
