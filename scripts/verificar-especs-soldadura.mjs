// =============================================================================
// Verificación de las especificaciones de los documentos de soldadura.
// =============================================================================
// Los seis formatos son datos, no código, y dos errores en esos datos fallan en
// silencio en vez de romper el build:
//
//   1. Un `id` repetido dentro de un formato: el segundo campo pisa al primero
//      en el payload y uno de los dos renglones del papel deja de guardarse.
//   2. Un `claves.*` que apunta a un campo inexistente: la columna de búsqueda
//      correspondiente se guarda siempre en null y el documento nunca aparece
//      al buscarlo por su número.
//
// Ninguno de los dos produce un error visible al diligenciar: se descubren
// meses después, con el archivo ya lleno. Por eso existe esta comprobación.
//
// Uso: node scripts/verificar-especs-soldadura.mjs
// No necesita framework de pruebas: transpila las constantes con el tsc que ya
// está instalado y comprueba los invariantes con assert.
// =============================================================================

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const salida = mkdtempSync(join(tmpdir(), "especs-soldadura-"));

try {
  execFileSync(
    "node_modules/.bin/tsc",
    [
      "src/constants/soldadura/index.ts",
      "--outDir", salida,
      // CommonJS y no ESM: los imports de las especificaciones no llevan
      // extensión, y solo la resolución de CJS los encuentra sin reescribirlos.
      "--module", "commonjs",
      "--target", "es2022",
      "--moduleResolution", "node",
      "--skipLibCheck",
    ],
    { stdio: "inherit" },
  );

  const { obtenerEspec, valoresIniciales } = createRequire(import.meta.url)(
    join(salida, "index.js"),
  );

  const tipos = ["wps", "pqr", "wpq"];
  const variantes = ["asme_ix", "aws_d1_2"];
  let campos = 0;

  for (const variante of variantes) {
    for (const tipo of tipos) {
      const espec = obtenerEspec(tipo, variante);
      const rotulo = `${tipo}/${variante} (${espec.formulario})`;

      assert.equal(espec.tipo, tipo, `${rotulo}: el tipo declarado no coincide con el mapa`);
      assert.equal(espec.variante, variante, `${rotulo}: la variante declarada no coincide con el mapa`);
      assert.ok(espec.secciones.length > 0, `${rotulo}: sin secciones`);
      assert.ok(espec.firmas.length > 0, `${rotulo}: sin bloque de firmas`);

      // 1. Ids únicos, contando también los de las firmas: comparten el payload.
      const ids = [
        ...espec.secciones.flatMap((s) => s.campos.filter((c) => c.t !== "nota").map((c) => c.id)),
        ...espec.firmas.map((f) => f.id),
      ];
      const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
      assert.deepEqual(repetidos, [], `${rotulo}: ids repetidos → ${repetidos.join(", ")}`);
      campos += ids.length;

      // 2. Toda clave de búsqueda apunta a un campo que existe.
      for (const [clave, id] of Object.entries(espec.claves)) {
        assert.ok(ids.includes(id), `${rotulo}: claves.${clave} apunta a "${id}", que no es un campo del formato`);
      }

      // El número identifica el documento en el archivo: sin él no se busca nada.
      assert.ok(espec.claves.numero, `${rotulo}: falta claves.numero`);

      // 3. Las columnas de cada tabla también tienen id único, y las tablas de
      //    rótulos fijos necesitan al menos una columna más que el rótulo.
      for (const seccion of espec.secciones) {
        for (const campo of seccion.campos) {
          if (campo.t !== "tabla") continue;
          const cols = campo.columnas.map((c) => c.id);
          assert.equal(new Set(cols).size, cols.length, `${rotulo}: columnas repetidas en la tabla ${campo.id}`);
          if (campo.filasFijas) {
            assert.ok(cols.length >= 2, `${rotulo}: la tabla ${campo.id} tiene rótulos fijos pero ninguna columna que diligenciar`);
          }
        }
      }

      // 4. El formato en blanco cubre todos los ids, incluidas las firmas.
      const iniciales = valoresIniciales(espec);
      for (const id of ids) {
        assert.ok(id in iniciales, `${rotulo}: valoresIniciales no incluye "${id}"`);
      }
    }
  }

  console.log(`OK — 6 formatos, ${campos} campos, sin ids repetidos ni claves rotas.`);
} finally {
  rmSync(salida, { recursive: true, force: true });
}
