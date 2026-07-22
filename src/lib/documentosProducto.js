// Documentos imprimibles de un producto del catálogo:
//   - Ficha técnica (referencia de construcción + bordados + imagen)
//   - Planilla de toma de tallas (lista de personas + medidas especiales)
//
// Ambos se abren desde el detalle del producto (SeccionCatalogo) y usan el
// mismo motor de impresión que el resto de la app: nuevaVentanaImpresion()
// monta un iframe a pantalla completa y dispara print() — el usuario elige
// "Guardar como PDF" en el diálogo del sistema. Ver [[taller_imis_decisiones_ux]].

import { nuevaVentanaImpresion } from "./imprimir.js";
import { MEDIDAS_DEF } from "./constants.js";

const ACCENT = "#2C1654"; // morado Taller IMIS

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
  ));
}

// Extrae los bordados/estampados del producto desde sus técnicas.
function tecnicasDe(prod) {
  const out = [];
  for (const t of prod.tecnicas || []) {
    for (const d of t.disenos || []) {
      const dim = [d.ancho, d.alto].filter(Boolean).join(" × ");
      out.push({
        tipo: t.tipo || "Aplicación",
        ubicacion: d.ubicacion || "—",
        medida: dim ? dim + " cm" : "",
        notas: d.notas || "",
      });
    }
  }
  return out;
}

// Medidas relevantes para prendas superiores (excluye pierna/tiro de pantalón).
const MED_SUP = ["hombro", "pecho", "cintura", "base", "largo", "lManga", "sisa", "escote", "lAtras"];
function medidasSuperior() {
  return MEDIDAS_DEF.filter(m => MED_SUP.includes(m.k));
}

const BASE_CSS = `
  *{box-sizing:border-box}
  body{margin:0;color:#1E2024;font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,Arial,sans-serif;line-height:1.4}
  .page{padding:14mm 13mm}
  .hd{display:flex;align-items:flex-start;gap:14px;border-bottom:2.5px solid #1E2024;padding-bottom:10px}
  .hd .ico{width:52px;height:52px;flex:none;border:1px solid #C9C6BD;border-radius:8px;display:grid;place-items:center;font-size:30px}
  .hd .ico img{max-width:100%;max-height:100%;border-radius:6px}
  .hd .t{flex:1}
  .eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:10.5px;font-weight:700;color:${ACCENT};margin:0}
  h1{font-size:23px;font-weight:800;letter-spacing:.01em;margin:2px 0 0;line-height:1.05;text-transform:uppercase}
  .sub{font-size:12px;color:#6B6B64;margin:3px 0 0}
  .fill{display:flex;flex-direction:column;gap:7px;min-width:190px}
  .fld{display:flex;align-items:baseline;gap:6px;font-size:11px;color:#6B6B64}
  .fld b{text-transform:uppercase;letter-spacing:.05em;font-weight:700;color:#1E2024}
  .fld .ln{flex:1;border-bottom:1px solid #C9C6BD;min-width:70px;height:15px}
  h2{text-transform:uppercase;letter-spacing:.07em;font-size:12px;color:#6B6B64;font-weight:700;margin:16px 0 8px}
  @page{size:A4;margin:0}
  .bar{position:sticky;top:0;z-index:20;background:${ACCENT};padding:10px 14px;display:flex;gap:8px;justify-content:center}
  .bar button{padding:10px 20px;border-radius:8px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit}
  .bar .go{border:none;background:#fff;color:${ACCENT}}
  .bar .x{border:1.5px solid rgba(255,255,255,.6);background:transparent;color:#fff}
  @media print{.no-print{display:none!important}.page{page-break-after:always}.page:last-child{page-break-after:auto}}
`;

// Barra superior (no se imprime) + script para reimprimir. El print se dispara
// solo al cargar (nuevaVentanaImpresion lo llama); estos botones permiten
// reimprimir si el usuario canceló, y cerrar el overlay (window.close está
// monkey-patcheado a cerrar el iframe).
const BARRA = `<div class="bar no-print">
    <button class="go" onclick="window.print()">🖨️ Guardar PDF</button>
    <button class="x" onclick="window.close()">✕ Cerrar</button>
  </div>`;

function encabezado(prod, subtitulo, campos) {
  const img = (prod.imagenes || []).find(i => i.supabaseUrl || i.driveUrl);
  const ico = img
    ? `<img src="${esc(img.supabaseUrl || img.driveUrl)}" alt="">`
    : esc(prod.icono || "✂️");
  const flds = campos.map(c => `<div class="fld"><b>${esc(c)}</b><span class="ln"></span></div>`).join("");
  return `<header class="hd">
    <div class="ico">${ico}</div>
    <div class="t">
      <p class="eyebrow">${esc(subtitulo)}</p>
      <h1>${esc(prod.nombre)}</h1>
      <p class="sub">Taller IMIS · UDP Confecciones</p>
    </div>
    <div class="fill">${flds}</div>
  </header>`;
}

// ─────────────────────────────────────────────────────────────
//  FICHA TÉCNICA
// ─────────────────────────────────────────────────────────────
export function imprimirFichaProducto(prod) {
  const win = nuevaVentanaImpresion("Ficha técnica — " + prod.nombre);
  const img = (prod.imagenes || []).find(i => i.supabaseUrl || i.driveUrl);
  const tec = tecnicasDe(prod);

  const specs = [
    ["Registro", prod.modoDefault === "lista" ? "Lista de prendas" : "Por tallas"],
    ["Telas", (prod.telas || []).join(", ") || "Por definir"],
    ["Colores", (prod.colores || []).join(", ") || "—"],
    ["Requiere medidas", prod.requiereMedidas ? "Sí" : "No"],
    ["Cuello tejido", prod.requiereCuello ? "Sí (coordinar Cuellos)" : "No"],
    ["Precio base", prod.precioBase ? "$" + prod.precioBase : "Por confirmar"],
  ];
  const specRows = specs.map(([k, v]) =>
    `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`
  ).join("");

  const tecRows = tec.length
    ? tec.map((t, i) => `<tr>
        <td class="n">${i + 1}</td>
        <td><b>${esc(t.ubicacion)}</b></td>
        <td>${esc(t.tipo)}</td>
        <td>${esc(t.medida)}</td>
        <td class="nt">${esc(t.notas)}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty">Sin bordados/estampados registrados</td></tr>`;

  const imgBlock = img
    ? `<div class="fig"><img src="${esc(img.supabaseUrl || img.driveUrl)}" alt="${esc(prod.nombre)}"></div>`
    : "";

  const notas = prod.notas
    ? `<h2>Notas</h2><div class="notas">${esc(prod.notas).replace(/\n/g, "<br>")}</div>`
    : "";

  const css = BASE_CSS + `
    .cols{display:grid;grid-template-columns:${img ? "1fr 1fr" : "1fr"};gap:22px;margin-top:16px;align-items:start}
    .fig{border:1px solid #E4E2DB;border-radius:12px;overflow:hidden}
    .fig img{display:block;width:100%;height:auto}
    table.sp{border-collapse:collapse;width:100%;font-size:13px}
    table.sp td{padding:9px 6px;border-top:1px solid #E4E2DB}
    table.sp td.k{text-transform:uppercase;letter-spacing:.04em;font-size:11px;color:#6B6B64;font-weight:700;white-space:nowrap;width:1%;padding-right:14px}
    table.tec{border-collapse:collapse;width:100%;font-size:12px;margin-top:4px}
    table.tec th{background:${ACCENT};color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.04em;padding:7px 8px;text-align:left;font-weight:700}
    table.tec td{border:1px solid #E4E2DB;padding:7px 8px;vertical-align:top}
    table.tec td.n{text-align:center;font-weight:800;color:${ACCENT};width:22px}
    table.tec td.nt{color:#555;font-size:11px}
    table.tec td.empty{text-align:center;color:#999;font-style:italic}
    .notas{font-size:12.5px;color:#333;background:#FAF9F5;border:1px solid #EDEBE4;border-radius:10px;padding:12px 14px;white-space:normal}
  `;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Ficha técnica — ${esc(prod.nombre)}</title><style>${css}</style></head>
    <body>${BARRA}<section class="page">
      ${encabezado(prod, "Ficha técnica de prenda", ["Fecha", "Pedido / Cliente"])}
      <div class="cols">
        ${imgBlock}
        <div>
          <h2>Construcción</h2>
          <table class="sp"><tbody>${specRows}</tbody></table>
        </div>
      </div>
      <h2>Bordados y aplicaciones</h2>
      <table class="tec">
        <thead><tr><th>#</th><th>Ubicación</th><th>Técnica</th><th>Medida</th><th>Notas</th></tr></thead>
        <tbody>${tecRows}</tbody>
      </table>
      ${notas}
    </section></body></html>`;

  win.document.write(html);
  win.document.close();
}

// ─────────────────────────────────────────────────────────────
//  PLANILLA DE TOMA DE TALLAS
// ─────────────────────────────────────────────────────────────
export function imprimirPlanillaTallas(prod, opts = {}) {
  const filas = opts.filas || 48;
  const porHoja = 24;
  const nombres = Array.isArray(opts.nombres) ? opts.nombres : null;
  const total = nombres ? Math.max(nombres.length, 1) : filas;
  const win = nuevaVentanaImpresion("Planilla de tallas — " + prod.nombre);

  const filaTr = (n) => {
    const nombre = nombres ? esc(nombres[n - 1] || "") : "";
    return `<tr>
      <td class="cN">${n}</td>
      <td class="cNom">${nombre}</td>
      <td class="cVar"></td>
      <td class="cT"></td>
      <td class="cM"></td>
      <td class="cF"><span class="sq"></span></td>
    </tr>`;
  };

  const hojaLista = (desde, hasta, hoja, hojas) => {
    let rows = "";
    for (let i = desde; i <= hasta; i++) rows += filaTr(i);
    return `<section class="page">
      ${encabezado(prod, "Toma de tallas", ["Fecha", "Grupo / Sede", "Tomó tallas"])}
      <h2>Lista de personas · talla y largo de manga</h2>
      <table class="grid">
        <thead><tr>
          <th class="cN">#</th><th>Nombre completo</th><th class="cVar">Variante / Esp.</th>
          <th class="cT">Talla</th><th class="cM">L. manga</th><th class="cF">Med. esp.</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="lg">
        <span><span class="sq"></span> Med. esp. = requiere medida completa (última hoja)</span>
        <span>Largo de manga en cm.</span>
        <span class="pg">Hoja ${hoja} de ${hojas}</span>
      </div>
    </section>`;
  };

  const meds = medidasSuperior();
  const mcard = (n) => {
    const gs = meds.map(m => `<div class="m"><label>${esc(m.l)}</label><span class="v"></span></div>`).join("");
    return `<div class="mc">
      <div class="mt"><span class="mn">${n}</span><span class="mnm"></span></div>
      <div class="mgrid">${gs}</div>
    </div>`;
  };
  const hojaEspecial = (hojas) => {
    let cards = "";
    for (let i = 1; i <= 8; i++) cards += mcard(i);
    return `<section class="page">
      ${encabezado(prod, "Medidas especiales", ["Fecha", "Grupo / Sede"])}
      <h2>Medida completa · solo para quienes no calzan en talla estándar</h2>
      <div class="cards">${cards}</div>
      <div class="lg"><span>Anotar el # de la lista y el nombre. Medidas en cm.</span>
        <span class="pg">Hoja ${hojas} de ${hojas}</span></div>
    </section>`;
  };

  const hojasLista = Math.max(1, Math.ceil(total / porHoja));
  const hojasTot = hojasLista + 1;
  let listas = "";
  for (let h = 0; h < hojasLista; h++) {
    listas += hojaLista(h * porHoja + 1, (h + 1) * porHoja, h + 1, hojasTot);
  }

  const css = BASE_CSS + `
    table.grid{border-collapse:collapse;width:100%;table-layout:fixed;margin-top:2px}
    table.grid th{background:${ACCENT};color:#fff;text-transform:uppercase;letter-spacing:.04em;font-size:10px;font-weight:700;padding:7px 5px;border:1px solid ${ACCENT}}
    table.grid td{border:1px solid #C9C6BD;height:30px;padding:0 6px;font-size:12px}
    table.grid tbody tr:nth-child(even) td{background:#FAF9F5}
    .cN{width:26px;text-align:center;font-weight:700;color:#6B6B64;background:#F3F1EA !important}
    .cVar{width:96px}.cT{width:54px}.cM{width:64px}.cF{width:44px;text-align:center}
    .sq{width:13px;height:13px;border:1.4px solid #6B6B64;border-radius:3px;display:inline-block;vertical-align:middle}
    .lg{display:flex;gap:18px;flex-wrap:wrap;margin-top:9px;font-size:10.5px;color:#6B6B64;align-items:center}
    .lg .pg{margin-left:auto;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
    .cards{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:2px}
    .mc{border:1px solid #C9C6BD;border-radius:8px;padding:9px 11px 11px}
    .mt{display:flex;gap:8px;align-items:baseline;margin-bottom:8px}
    .mn{font-weight:800;color:#fff;background:${ACCENT};width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;flex:none}
    .mnm{flex:1;border-bottom:1px solid #C9C6BD;height:17px}
    .mgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 10px}
    .mgrid .m{display:flex;flex-direction:column;gap:2px}
    .mgrid .m label{text-transform:uppercase;letter-spacing:.03em;font-size:8.5px;color:#6B6B64;font-weight:700}
    .mgrid .m .v{border-bottom:1px solid #C9C6BD;height:19px}
  `;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Planilla de tallas — ${esc(prod.nombre)}</title><style>${css}</style></head>
    <body>${BARRA}${listas}${hojaEspecial(hojasTot)}</body></html>`;

  win.document.write(html);
  win.document.close();
}
