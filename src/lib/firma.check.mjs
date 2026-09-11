/**
 * Comprobación de la rampa de transparencia de las firmas.
 *
 *   node --experimental-strip-types src/lib/firma.check.mjs
 *
 * No hay runner de pruebas en el repo y el resto de `firma.ts` es canvas puro,
 * o sea navegador. Esto cubre lo único que no es evidente a la lectura y que
 * falla en silencio: que un PNG con transparencia no acabe convertido en un
 * rectángulo negro sobre la línea de firma del PDF.
 */
import assert from "node:assert/strict";
import { alfaDeFirma } from "./firma.ts";

// Papel blanco de un escaneo: desaparece.
assert.equal(alfaDeFirma(255, 255, 255, 255), 0, "el papel blanco debe quedar transparente");
assert.equal(alfaDeFirma(240, 238, 242, 255), 0, "el blanco sucio del escaneo debe quedar transparente");

// Tinta: opaca del todo.
assert.equal(alfaDeFirma(0, 0, 0, 255), 255, "la tinta negra debe quedar opaca");
assert.equal(alfaDeFirma(30, 30, 40, 255), 255, "la tinta azul oscura debe quedar opaca");

// Gris intermedio: parcial, que es lo que suaviza el borde del trazo.
const medio = alfaDeFirma(177, 177, 177, 255);
assert.ok(medio > 0 && medio < 255, `el gris intermedio debe quedar parcial, quedo ${medio}`);

// El fallo clásico: un PNG que YA viene transparente tiene los píxeles vacíos
// en rgba(0,0,0,0), cuya luminancia es 0, o sea "tinta negrísima".
assert.equal(alfaDeFirma(0, 0, 0, 0), 0, "el pixel ya transparente NO debe volverse tinta");
assert.equal(alfaDeFirma(255, 255, 255, 0), 0, "el blanco ya transparente debe seguir transparente");

// Nunca fuera de rango, sea cual sea la entrada.
for (const v of [0, 1, 60, 120, 180, 235, 254, 255]) {
  const a = alfaDeFirma(v, v, v, 255);
  assert.ok(a >= 0 && a <= 255, `alfa fuera de rango para ${v}: ${a}`);
}

console.log("firma: rampa de transparencia correcta");
