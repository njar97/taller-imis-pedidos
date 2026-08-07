// Previsualiza la hoja de corte de un pedido sin abrir la app (la app pide
// login por codigo de correo). Uso:  node scripts/preview-corte.mjs 60
import { writeFileSync } from "node:fs";
import { hojaCantidadesHTML } from "../src/lib/imprimir.js";

const SUPA = "https://kszdievqesveluzcnzsh.supabase.co/rest/v1";
const ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const H = { apikey: ANON, Authorization: "Bearer " + ANON };

const camel = o => {
  if (Array.isArray(o)) return o.map(camel);
  if (!o || typeof o !== "object") return o;
  const out = {};
  for (const k in o) out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = o[k];
  return out;
};

const id = process.argv[2] || "60";
const [ped] = await fetch(`${SUPA}/taller_pedidos?id=eq.${id}&select=*`, { headers: H }).then(r => r.json());
const moldes = await fetch(`${SUPA}/taller_moldes?select=*&limit=5000`, { headers: H }).then(r => r.json());

const html = hojaCantidadesHTML(camel(ped), moldes.map(camel));
const out = process.argv[3] || `preview-cant-${id}.html`;
writeFileSync(out, html, "utf8");
console.log(`${out}  —  ${ped.cliente}  —  ${Math.round(html.length / 1024)} KB`);
