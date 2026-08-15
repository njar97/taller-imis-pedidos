// Previsualiza la lista de beneficiarios con DATOS REALES, sin pasar el OTP.
//
//     npx vite-node scripts/preview-personas.jsx
//
// Trae el pedido mas largo de la base y muestra que filtros ofrece y como
// responden. No dibuja la tabla: comprueba la parte que puede estar mal, que es
// que las facetas salgan de los datos y que el filtro acorte lo que debe.
import {
  facetasDe, filtrarPersonas, ordenarPersonas, resumenPorTalla,
} from "../src/lib/personas.js";

const REST = "https://kszdievqesveluzcnzsh.supabase.co/rest/v1";
const KEY = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

const r = await fetch(
  `${REST}/taller_pedidos?select=id,cliente,tipo_prenda,personas&deleted_at=is.null`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
const pedidos = (await r.json())
  .filter(p => (p.personas || []).length > 0)
  .sort((a, b) => b.personas.length - a.personas.length);

for (const p of pedidos.slice(0, 3)) {
  const gente = p.personas;
  console.log(`\n━━ #${p.id} ${p.cliente} · ${gente.length} personas`);
  console.log("   talla:", resumenPorTalla(gente).map(t => `${t.talla}·${t.n}`).join("  "));

  const facetas = facetasDe(gente);
  if (!facetas.length) console.log("   (este pedido no ofrece ningun filtro)");
  for (const f of facetas) {
    const muestra = f.valores.slice(0, 6).map(v => `${v.v}(${v.n})`).join(" ");
    console.log(`   ▸ ${f.etiqueta.padEnd(14)} ${f.valores.length} opciones:  ${muestra}`
      + (f.valores.length > 6 ? " …" : ""));
  }

  // una busqueda de verdad: las primeras letras del primer apellido
  const alguien = gente.find(x => x.nombre)?.nombre || "";
  const trozo = alguien.split(/[\s,]+/)[0].slice(0, 5);
  if (trozo) {
    console.log(`   buscar "${trozo}" -> ${filtrarPersonas(gente, trozo).length} de ${gente.length}`);
  }
  const f0 = facetas[0];
  if (f0) {
    const v = f0.valores[0];
    console.log(`   filtrar ${f0.etiqueta}="${v.v}" -> `
      + `${filtrarPersonas(gente, "", { [f0.clave]: v.v }).length} (esperado ${v.n})`);
  }
  const ord = ordenarPersonas(gente, "nombre");
  console.log(`   ordenado por nombre: ${ord.slice(0, 3).map(x => x.p.nombre).join(" · ")}`);
  console.log(`   ⚠ el # NO se renumera: los tres primeros llevan #`
    + ord.slice(0, 3).map(x => x.orden + 1).join(", "));
}
