---
name: creacion-permiso
description: Convierte un formato en papel (PDF, imagen, foto o Excel) en un formato SST completo de Actium — extracción de campos, migración, catálogo, formulario, PDF y detalle. Úsala siempre que se pida agregar un formato/permiso nuevo (ATS, altura, caliente, preoperacional, EPP, charla, permisos de soldadura PQR/WPS/WPQ) o modificar los campos de uno existente. Dispara con "crear permiso", "nuevo formato", "agregar formulario SST", "sacar los campos de este PDF/imagen/Excel".
---

# Creación de un formato SST en Actium

Todos los formatos de Actium son el mismo animal: un papel del cliente convertido en
formulario móvil que produce un PDF firmado, un JSON de respaldo y filas consultables.
Esta skill es el procedimiento que ya se aplicó seis veces (ats, permiso_altura,
permiso_caliente, preoperacional, entrega_epp, charla_seguridad).

**Referencia canónica: `charla_seguridad`** — el más reciente y el más limpio. Cuando
dudes de cómo se hace algo, `git show ca2bcea` es la respuesta.

Lee también `CLAUDE.md` (paleta, tipografía, mobile-first) y `PDF-PAGINACION.md`
(obligatorio antes de tocar cualquier `*-pdf-document.tsx`).

---

## Fase 1 — Extracción de campos (antes de escribir una sola línea)

No empieces por el código. Empieza por leer el documento fuente con la herramienta
Read (soporta PNG/JPG y PDF por rangos de página) y producir una **ficha de
extracción** que el usuario aprueba. Esto es lo que evita rehacer el formulario
entero por un campo mal leído.

Recorre el papel de arriba abajo y anota, por cada bloque:

1. **Secciones numeradas.** El papel ya viene seccionado; respeta ese orden y esa
   numeración en el formulario y en el PDF. Si el papel no numera, numera tú.
2. **Campos sueltos.** Por cada uno: rótulo exacto del papel, tipo (`text`, `date`,
   `time`, `number`, `select`, `textarea`), y si es obligatorio para emitir.
   - Rótulos: cópialos literal del papel, no los "mejores". El inspector busca el
     mismo texto que tiene impreso.
3. **Catálogos.** Toda casilla con opciones cerradas (tipo de actividad, modalidad,
   resultado, método) es un `OpcionCatalogo[]` en `src/constants/`, no un string libre.
   Anota el `id` (snake_case, estable, va a la BD) y el `label` (lo que ve el usuario).
4. **Listas de chequeo Sí / No / N.A.** Muy comunes. Anota si el papel admite N.A. y
   si exige observación cuando la respuesta es "No".
5. **Tablas dinámicas.** ¿Filas fijas o "agregar fila"? ¿Cuántas caben en el papel
   (suele indicar el máximo razonable)? ¿Cada fila lleva firma propia?
6. **Firmas.** Cuántas, de quién, y **cuándo** se firman: al emitir o al cerrar la
   labor. Un formato con cierre entra en `TIPOS_CON_CIERRE`; uno que se firma una
   sola vez (preoperacional, charla) no.
7. **Registro fotográfico.** ¿El papel pide evidencia? Entonces monta
   `<FormularioFotos>`; es genérico por `formulario_id`, no se construye nada nuevo.
8. **Textos legales.** Nota legal al pie, leyenda de constancia sobre la firma,
   normas citadas. Van tal cual a `src/constants/` como constantes con nombre.
9. **Variantes normativas.** Si un mismo formato existe bajo dos normas (p. ej.
   ASME IX vs AWS D1.2), no son dos tipos de formulario: es **un tipo con una
   pregunta previa**. Se elige la variante antes de abrir el formulario, se guarda
   como columna `variante` en la tabla hija, y cada variante tiene su propio
   catálogo de campos en `src/constants/`.

Entrega la ficha así antes de codificar:

```
Sección 3 — Asistentes (tabla dinámica, hasta 20 filas)
  nombre           text      obligatorio
  identificacion   text      opcional, inputMode numeric
  cargo            text      opcional
  evaluacion       select    catálogo EVALUACIONES_ASISTENTE
  firma            firma     una por fila, obligatoria para emitir
```

**Si el documento fuente no se puede leer** (foto ilegible, Excel con macros), dilo y
pide la parte que falta. No inventes campos: un campo inventado en un formato SST es
un hallazgo en auditoría del cliente.

---

## Fase 2 — Decisiones de modelo

Cuatro preguntas, y las cuatro se responden desde la ficha:

| Pregunta | Cómo se decide |
|---|---|
| ¿Va dentro de `formularios`? | Solo si el formato pertenece a una OBRA. `formularios.proyecto_id` es NOT NULL y toda su RLS cuelga de `auth_tiene_acceso_proyecto`, así que un documento de empresa —un WPS de soldadura, un procedimiento— necesita tabla propia con su secuencia y su RLS. Ver `documentos_soldadura`. |
| ¿Necesita tablas hijas? | Solo si alguien va a **consultar por SQL** sin abrir el PDF ("qué charlas recibió este trabajador", "qué EPP se entregó"). Si no, basta el JSON de respaldo en Storage y una fila de detalles vacía como `ats_detalles`. |
| ¿Tiene cierre? | ¿El papel tiene un bloque de firmas "al finalizar la labor"? Sí → `TIPOS_CON_CIERRE`. |
| ¿Lleva fotos? | ¿El papel pide evidencia fotográfica? |
| ¿Qué hereda "Rellenar con el último"? | El encabezado y los controles sí; el objeto del permiso y las firmas nunca (ver Reglas invariantes). |

El prefijo del consecutivo son **3 letras** en mayúscula: ATS, ALT, CAL, PRE, EPP, CHA.

---

## Fase 3 — Los 12 archivos, en este orden

El orden importa: la migración primero porque los tipos se generan de ella.

### 1. `supabase/migrations/AAAAMMDD000000_formulario_tipo_<tipo>.sql`

```sql
ALTER TYPE formulario_tipo ADD VALUE IF NOT EXISTS '<tipo>';
```

Luego **recrea completa** `public.generar_codigo_formulario()` agregando la rama del
prefijo nuevo, repitiendo todas las ramas anteriores (las migraciones pueden aplicarse
fuera del orden de producción). El `CASE` compara sobre `NEW.tipo::TEXT`, **nunca sobre
el enum**: usar un valor de enum recién creado en la misma transacción es un error de
PostgreSQL.

Tablas hijas, si aplican: cabecera 1:1 con `formularios(id) ON DELETE CASCADE` como
PK, y detalle con `orden SMALLINT` + índice por `formulario_id`. Los datos de la
persona se **congelan** en la fila (nombre, cédula, cargo al momento de firmar): si el
empleado se retira, el registro firmado debe seguir diciendo lo que decía. La firma PNG
vive solo en el JSON; en la BD queda `firmo BOOLEAN`.

RLS en las dos tablas, copiando el patrón de `charla_seguridad` / `charla_asistentes`:
SELECT por `auth_tiene_acceso_proyecto(f.proyecto_id)`, INSERT/UPDATE con
`auth_rol() IN ('super_admin','sst')`, DELETE agregando `'admin'`.

Aplica la migración en Supabase **antes** de desplegar (CLAUDE.md §10).

### 2. `src/types/database.types.ts`
`npm run db:types`. No lo edites a mano.

Necesita `SUPABASE_ACCESS_TOKEN` o `supabase login`; sin eso el CLI falla. El
script escribe a un temporal y solo entonces reemplaza el archivo, así que un
fallo ya no lo deja vacío —antes el `>` lo truncaba con el mensaje de error
dentro—, pero el archivo se queda sin los tipos nuevos. Si no puedes
autenticarte, agrega a mano el bloque de la tabla, sus enums en `Enums` y sus
arrays en `Constants`, y avisa al usuario de regenerarlo.

### 3. `src/constants/<tipo>.ts`
La ficha de extracción convertida en código: catálogos `OpcionCatalogo[]`, tipos de
fila (`type AsistenteCharla = {...}`), constructores (`asistenteVacio`,
`asistenteDesdeEmpleado`), selectores (`asistentesValidos`, `asistentesSinFirma`),
cálculos derivados (`calcularDuracionMinutos`) y los textos legales.

Todo lo que el formulario y el PDF comparten vive aquí. Si el PDF necesita traducir un
`id` a rótulo, importa el catálogo — no duplica el `switch`.

### 4. `src/components/sst/<tipo>-pdf-document.tsx`
Exporta `type <Tipo>PDFData` (el payload serializable — es el contrato entre
formulario, PDF y JSON de respaldo) y `build<Tipo>PDFBlob(data)`.

Copia los estilos de `charla-seguridad-pdf-document.tsx`: `ACTIUM_PDF` de
`@/lib/pdf-fonts`, `getLogoSrc()` de `@/lib/pdf-logo`, `page: { paddingTop: 30,
paddingBottom: 34, paddingHorizontal: 40 }`. **Sin colores inventados** — espresso para
encabezados de tabla, seashell para paneles, beigeBorder para bordes.

Antes de escribirlo lee `PDF-PAGINACION.md`. En corto: `wrap={false}` solo por fila,
`minPresenceAhead={40..70}` en títulos de sección, `fixed` en `s.trHead`, `break` solo
condicionado por datos, nunca `overflow: "hidden"` en tablas.

### 5. `src/components/sst/<tipo>-form.tsx`
`"use client"`. Copia el esqueleto de `charla-seguridad-form.tsx`:

- Constantes de estilo del archivo: `CARD`, `SECTION_TITLE_INLINE`, `NUM`, `LABEL`,
  `FIELD`, `TEXTAREA`. Subcomponentes `CampoForm` y `ChipToggle`.
- Una sección = una card numerada, en el orden del papel.
- `aplicarPayload(payload, opciones?)` — hidrata desde borrador y desde "rellenar con
  el último"; el segundo parámetro dice qué **no** se hereda.
- `construirPayload(): <Tipo>PDFData`.
- Dos listas de validación separadas:
  - `faltantesParaGuardar()` — lo que **impide** guardar el borrador (en la práctica,
    solo el proyecto).
  - `pendientesPorDiligenciar()` — lo que falta para emitir, redactado con
    `listarFaltantes()` de `@/lib/sst/faltantes`.
  Un borrador se guarda incompleto a propósito: para eso existe.
- `guardarBorrador()` → `guardarBorradorAction`, y `asegurarBorrador()` para que la
  primera foto cree la fila.
- `handleGenerar()` → `build<Tipo>PDFBlob` + `guardarPdfYDatosFormularioAction`, y
  `router.push('/sst/' + id)`.
- Firmas con `<SignaturePad onSave={...} initialValue={...} label="..." />`.
- Fotos con `<FormularioFotos formularioId={borradorId} asegurarFormulario={asegurarBorrador} .../>`.
- Botonera al final: "Guardar borrador" (secundario) + "Generar … en PDF" (naranja).

Mobile-first, sin excepción: `grid-cols-1 md:grid-cols-2`, targets ≥ 44px
(`h-11`/`h-12`/`min-h-[44px]`), `inputMode` correcto en cédulas y números.

### 6. `src/app/(dashboard)/sst/<ruta>/page.tsx`
Server component: `getPerfilActual` → `puedeCrearFormularioSST` o `redirect("/sst")`,
carga `listProyectos` / `listEmpleados` en paralelo, renderiza el form dentro de
`<Suspense>` (el form usa `useSearchParams`). Encabezado con logo, `font-display`
uppercase y el enlace "Volver a SST".

### 7. `src/lib/sst/tipos.ts`
Cuatro entradas: `NOMBRE_TIPO_SST`, `ETIQUETA_TIPO_SST`, `RUTA_FORMULARIO_SST`,
`TIPOS_SST`. Y `TIPOS_CON_CIERRE` solo si tiene cierre.

### 8. `src/lib/actions/permisos-sst.ts`
Si hay tablas hijas, agrega `sincronizar<Tipo>(db, formularioId, payloadStr)` y
engánchala en los **cuatro** puntos donde se ramifica por tipo:
`guardarPdfYDatosFormularioAction` (rama `existingId` y rama `proyectoId`) y
`guardarBorradorAction` (rama `borradorId` y rama nueva). Olvidar uno hace que las
filas se pierdan justo en el camino que no probaste.

La sincronización **reescribe** el detalle completo (`delete` + `insert`) en cada
guardado: las filas cambian mientras se diligencia.

### 9. `src/app/(dashboard)/sst/page.tsx`
Una entrada en `tipoIcon` y una tarjeta en `tarjetas` (href, título, subtítulo, icono
lucide `strokeWidth={1.5}`, color de la paleta: `actium-orange`, `warning`, `danger`,
`actium-sandy`, `actium-amber`, `info`).

### 10. `src/components/sst/sst-filters.tsx`
Un `<option value="<tipo>">Etiqueta</option>`.

### 11. `src/app/(dashboard)/sst/bitacora/page.tsx`
Agrega el tipo al `.in("tipo", [...])`, o la bitácora lo ignora en silencio.

### 12. `src/app/(dashboard)/sst/[id]/page.tsx`
Consulta las tablas hijas cuando `form.tipo === "<tipo>"` y renderiza el bloque de
resumen (los datos clave + la tabla de filas). Si lleva fotos, súmalo a `conFotos`.

---

## Fase 4 — Verificación

```bash
npm run lint && npm run build
```

Y a mano, siempre:
- Emitir un PDF con datos mínimos y otro con datos máximos (tabla llena, textos
  largos): ninguna página con más de ~1/3 en blanco salvo la última.
- Guardar borrador → recargar con `?borradorId=` → los datos vuelven, las firmas
  también.
- "Rellenar con el último" no trae ninguna firma.
- 375 px sin scroll horizontal.

Si el formato se declara como datos (varias variantes de un mismo documento),
deja dos comprobaciones ejecutables:

- **Los datos.** Un `id` repetido o una clave que apunta a un campo inexistente
  no rompen el build: fallan en silencio meses después.
  Molde: `scripts/verificar-especs-soldadura.mjs`.
- **El render del PDF.** `tsc`, `next lint` y `next build` compilan sin quejarse
  un documento que lanza al renderizarse; el fallo aparece cuando alguien pulsa
  "Emitir" con el formato ya diligenciado. Molde:
  `scripts/render-pdfs-soldadura.mjs`, que dibuja cada formato lleno y vacío.
  Con `--guardar` deja los PDF para revisarlos contra `PDF-PAGINACION.md`.

No hagas commit sin que el usuario lo pida (CLAUDE.md §9.12).

---

## Reglas invariantes

1. **Ninguna imagen se hereda.** Ni firmas, ni croquis, ni el retrato de la
   persona que se califica, ni el registro fotográfico.
   `limpiarDatosPersonales` (`src/lib/sst/prefill.ts`) los vacía en el servidor;
   si el formato nuevo trae un campo de firma con nombre distinto, **agrégalo a
   `CAMPOS_FIRMA`**. Un trazo de ayer da por firmado el documento de hoy, y una
   foto arrastrada califica a la persona equivocada.
2. **Toda escritura va con `createAdminClient()`** tras validar el rol en el servidor:
   `auth_rol()` lee mal el JWT y RLS bloquea las escrituras. El único caso que usa el
   cliente del usuario es la RPC de descuento de EPP, que evalúa el rol del llamador.
3. **El JSON de respaldo es el que permite reutilizar y retomar.** Se sube al mismo
   path del PDF con extensión `.json` y `contentType: "application/pdf"` (restricción
   MIME del bucket). Sin él el permiso solo existe como imagen.
4. **Disclaimer de firma, literal:** "Esta firma tiene carácter informativo y NO
   constituye firma electrónica certificada según la Ley 527 de 1999."
5. **Voz:** usted, español formal, sin emojis, sin exclamaciones. "No fue posible
   guardar los cambios. Intenta de nuevo."
6. **Paleta:** solo tokens `actium-*` y semánticos. En los PDF, solo `ACTIUM_PDF`.
7. **Comentarios en español**, explicando *por qué* — el estilo del repositorio.
