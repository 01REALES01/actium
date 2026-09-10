// =============================================================================
// Render de humo de los PDF de soldadura.
// =============================================================================
// Dibuja los seis formatos dos veces —con todos los campos llenos y con el
// documento en blanco— y falla si alguno revienta. Existe porque un PDF roto no
// lo detecta nada más: `tsc`, `next lint` y `next build` compilan sin quejarse
// un documento que lanza al renderizarse, y el fallo aparece recién cuando
// alguien pulsa "Emitir" con el formato ya diligenciado.
//
// En su primera ejecución encontró dos defectos reales: el glifo "≤" no existe
// en Manrope y react-pdf lo dibujaba como una "d", y una banda de sección
// quedaba pegada al pie de página con su contenido en la hoja siguiente.
//
//   node scripts/render-pdfs-soldadura.mjs            # solo reporta
//   node scripts/render-pdfs-soldadura.mjs --guardar  # deja los PDF para verlos
//
// Con --guardar, revisa los archivos contra el checklist de PDF-PAGINACION.md:
// ninguna página con más de un tercio en blanco, salvo la última.
// =============================================================================

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const RAIZ = process.cwd();
const GUARDAR = process.argv.includes("--guardar");
const DESTINO = path.join(RAIZ, "pdf-soldadura");
const trabajo = mkdtempSync(path.join(tmpdir(), "render-soldadura-"));
const BUILD = path.join(trabajo, "build");

try {
  // 1. Transpilar el documento y las especificaciones a CommonJS.
  writeFileSync(
    path.join(trabajo, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "es2022", module: "commonjs", moduleResolution: "node",
        jsx: "react-jsx", esModuleInterop: true, skipLibCheck: true,
        baseUrl: RAIZ, paths: { "@/*": ["src/*"] }, outDir: BUILD,
      },
      include: [
        path.join(RAIZ, "src/components/soldadura/documento-soldadura-pdf-document.tsx"),
        path.join(RAIZ, "src/constants/soldadura/index.ts"),
      ],
    }),
  );
  execFileSync(path.join(RAIZ, "node_modules/.bin/tsc"), ["-p", trabajo], { stdio: "inherit" });

  // El código transpilado vive fuera del proyecto: sin este enlace no resuelve
  // react ni @react-pdf/renderer.
  const enlace = path.join(trabajo, "node_modules");
  if (!existsSync(enlace)) symlinkSync(path.join(RAIZ, "node_modules"), enlace, "dir");

  // tsc no reescribe los alias "@/..." al emitir: se resuelven aquí.
  const require_ = createRequire(path.join(trabajo, "x.cjs"));
  const Module = require_("module");
  const resolver = Module._resolveFilename;
  Module._resolveFilename = function (peticion, ...resto) {
    if (peticion.startsWith("@/")) peticion = path.join(BUILD, peticion.slice(2));
    return resolver.call(this, peticion, ...resto);
  };

  // 2. El logo y las fuentes se resuelven contra el origen del navegador; aquí
  //    se apuntan a los archivos reales de /public.
  require_(path.join(BUILD, "lib/pdf-logo.js")).getLogoSrc = () =>
    path.join(RAIZ, "public/logo-actium-coffee.png");

  const f = (n) => path.join(RAIZ, "public/fonts", n);
  require_("@react-pdf/renderer").Font.register({
    family: "Manrope",
    fonts: [
      { src: f("Manrope-Regular.ttf"), fontWeight: 400 },
      { src: f("Manrope-Medium.ttf"), fontWeight: 500 },
      { src: f("Manrope-SemiBold.ttf"), fontWeight: 600 },
      { src: f("Manrope-Bold.ttf"), fontWeight: 700 },
      { src: f("Manrope-Regular.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: f("Manrope-Bold.ttf"), fontWeight: 700, fontStyle: "italic" },
    ],
  });

  const { buildDocumentoSoldaduraPDFBlob } = require_(
    path.join(BUILD, "components/soldadura/documento-soldadura-pdf-document.js"),
  );
  const { obtenerEspec, valoresIniciales } = require_(path.join(BUILD, "constants/soldadura/index.js"));

  // PNG de 1x1: hace las veces de firma, retrato, croquis y fotografía.
  const PIXEL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  /** Diligencia cada campo con un valor largo: el caso que más estira el diseño. */
  function llenar(espec) {
    const v = valoresIniciales(espec);
    for (const seccion of espec.secciones) {
      for (const campo of seccion.campos) {
        if (campo.t === "nota") continue;
        if (campo.t === "texto") v[campo.id] = `Valor de ${campo.label}`.slice(0, 60);
        else if (campo.t === "fecha") v[campo.id] = "2026-09-06";
        else if (campo.t === "area") v[campo.id] = "Descripción larga ".repeat(12);
        else if (campo.t === "check") v[campo.id] = true;
        else if (campo.t === "checks") v[campo.id] = campo.opciones.map((o) => o.id);
        else if (campo.t === "sino") v[campo.id] = "si";
        else if (campo.t === "croquis" || campo.t === "foto") v[campo.id] = PIXEL;
        else if (campo.t === "galeria") v[campo.id] = Array(6).fill(PIXEL);
        else if (campo.t === "tabla") {
          const base = campo.filasFijas ? v[campo.id] : Array.from({ length: campo.filas || 4 }, () => ({}));
          v[campo.id] = base.map((fila, i) => {
            const nueva = { ...fila };
            for (const c of campo.columnas) if (!nueva[c.id]) nueva[c.id] = `${c.label.slice(0, 10)} ${i + 1}`;
            return nueva;
          });
        }
      }
    }
    for (const firma of espec.firmas) v[firma.id] = PIXEL;
    return v;
  }

  const empresa = { nombre: "Actium — Infraestructura y Activos", nit: "900.000.000-0", email: "gerencia@actium.com" };
  if (GUARDAR) mkdirSync(DESTINO, { recursive: true });

  for (const variante of ["asme_ix", "aws_d1_2"]) {
    for (const tipo of ["wps", "pqr", "wpq"]) {
      const espec = obtenerEspec(tipo, variante);
      for (const [caso, valores] of [["lleno", llenar(espec)], ["vacio", valoresIniciales(espec)]]) {
        const rotulo = `${tipo}/${variante} ${caso.padEnd(6)}`;
        const blob = await buildDocumentoSoldaduraPDFBlob({
          espec, valores, codigo: `${tipo.toUpperCase()}-2026-0001`, empresa,
        });
        const buf = Buffer.from(await blob.arrayBuffer());
        const paginas = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;

        assert.ok(buf.length > 5000, `${rotulo}: el PDF salió vacío`);
        assert.ok(paginas > 0, `${rotulo}: sin páginas`);

        if (GUARDAR) writeFileSync(path.join(DESTINO, `${tipo}-${variante}-${caso}.pdf`), buf);
        console.log(`${rotulo} → ${String(paginas).padStart(2)} pág  ${(buf.length / 1024).toFixed(0).padStart(4)} KB`);
      }
    }
  }

  console.log(GUARDAR ? `\nOK — PDF en ${DESTINO}` : "\nOK — los 6 formatos renderizan lleno y vacío.");
} finally {
  rmSync(trabajo, { recursive: true, force: true });
}
