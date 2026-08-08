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
import { rankTalla, cantidadComponente } from "./dominio.js";
// imgSrc y no la URL cruda: driveUrl es un link /view, no una imagen — la
// foto legacy de Drive salía rota en la ficha técnica.
import { imgSrc } from "./imagenes.js";

// Paleta pensada para impresión en BLANCO Y NEGRO: todo lo que se imprime usa
// negro + grises con buen contraste; nada depende del color para distinguirse.
// (La barra de controles es no-print, así que su color da igual.)
const ACCENT = "#1c1c1c"; // negro — imprime nítido en B/N

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
  ));
}

// Extrae los bordados/estampados del producto desde sus técnicas, incluyendo
// el diseño vinculado (preview + archivo de máquina + formato) si lo tiene.
function tecnicasDe(prod) {
  const out = [];
  for (const t of prod.tecnicas || []) {
    for (const d of t.disenos || []) {
      const dim = [d.ancho, d.alto].filter(Boolean).join(" × ");
      let archivoNom = "";
      if (d.disenoArchivo) {
        try { archivoNom = decodeURIComponent(d.disenoArchivo.split("/").pop()); }
        catch { archivoNom = d.disenoArchivo.split("/").pop(); }
      }
      out.push({
        tipo: t.tipo || "Aplicación",
        ubicacion: d.ubicacion || "—",
        medida: dim ? dim + " cm" : "",
        notas: d.notas || "",
        img: d.disenoImg || "",
        diseno: d.disenoNombre || "",
        formato: d.formato || "",
        archivo: archivoNom,
      });
    }
  }
  return out;
}

// Medidas relevantes para prendas superiores (excluye las de pantalón).
const MED_SUP = ["hombro", "pecho", "cintura", "cadera", "largo", "manga",
                 "sisa", "puno", "cuello", "escote", "costado"];
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
  @page{size:A4;margin:14mm 13mm}
  .bar{position:sticky;top:0;z-index:20;background:${ACCENT};padding:10px 14px;display:flex;gap:8px;justify-content:center}
  .bar button{padding:10px 20px;border-radius:8px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit}
  .bar .go{border:none;background:#fff;color:${ACCENT}}
  .bar .x{border:1.5px solid rgba(255,255,255,.6);background:transparent;color:#fff}
  @media print{
    .no-print{display:none!important}
    /* el margen lo pone @page (se repite en TODAS las hojas); el padding del
       .page solo aplicaria a la primera y dejaria las siguientes sin margen */
    .page{padding:0;page-break-after:always}
    .page:last-child{page-break-after:auto}
    thead{display:table-header-group}
    tr,img{page-break-inside:avoid}
  }
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
  const img = (prod.imagenes || []).find(i => imgSrc(i));
  const ico = img
    ? `<img src="${esc(imgSrc(img))}" alt="">`
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
  const img = (prod.imagenes || []).find(i => imgSrc(i));
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

  const tecCards = tec.length
    ? tec.map((t, i) => {
        const thumb = t.img
          ? `<img class="dz" src="${esc(t.img)}" alt="${esc(t.diseno)}">`
          : `<div class="dz none">sin<br>preview</div>`;
        const archivoLn = t.archivo
          ? `<div class="af"><span class="afl">Archivo</span> <b>${esc(t.archivo)}</b>${t.formato ? ` <span class="fmt">${esc(t.formato)}</span>` : ""}</div>`
          : (t.diseno ? `<div class="af"><span class="afl">Diseño</span> <b>${esc(t.diseno)}</b></div>` : "");
        return `<div class="bc">
          <span class="bn">${i + 1}</span>
          ${thumb}
          <div class="bd">
            <div class="bu">${esc(t.ubicacion)}</div>
            <div class="bmeta">${esc(t.tipo)}${t.medida ? " · " + esc(t.medida) : ""}</div>
            ${archivoLn}
            ${t.notas ? `<div class="bnt">${esc(t.notas)}</div>` : ""}
          </div>
        </div>`;
      }).join("")
    : `<div class="empty">Sin bordados/estampados registrados</div>`;

  const imgBlock = img
    ? `<div class="fig"><img src="${esc(imgSrc(img))}" alt="${esc(prod.nombre)}"></div>`
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
    .bcards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}
    .bc{position:relative;display:flex;gap:11px;align-items:flex-start;border:1px solid #E4E2DB;border-radius:10px;padding:10px 11px 10px 30px}
    .bc .bn{position:absolute;left:9px;top:10px;width:17px;height:17px;border-radius:50%;background:${ACCENT};color:#fff;font-size:10px;font-weight:800;display:grid;place-items:center}
    .bc .dz{width:80px;height:56px;object-fit:contain;background:#fff;border:1px solid #EDEBE4;border-radius:6px;flex:none}
    .bc .dz.none{display:grid;place-items:center;color:#bbb;font-size:9px;text-align:center;line-height:1.1}
    .bc .bd{flex:1;min-width:0}
    .bc .bu{font-weight:800;font-size:12.5px;color:#1E2024}
    .bc .bmeta{font-size:10.5px;color:#6b6b64;margin-top:1px}
    .bc .af{font-size:11px;color:#333;margin-top:5px;word-break:break-all}
    .bc .af .afl{text-transform:uppercase;font-size:8.5px;letter-spacing:.04em;color:#888;font-weight:700}
    .bc .af b{color:${ACCENT}}
    .bc .fmt{background:#EDEDED;color:${ACCENT};border:1px solid #333;border-radius:4px;padding:0 5px;font-size:9px;font-weight:800;letter-spacing:.03em}
    .bc .bnt{font-size:10.5px;color:#666;margin-top:4px}
    .empty{text-align:center;color:#999;font-style:italic;padding:16px;border:1px dashed #ddd;border-radius:10px}
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
      <h2>Bordados y aplicaciones · diseño y archivo</h2>
      <div class="bcards">${tecCards}</div>
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

// ─────────────────────────────────────────────────────────────
//  HOJA DE PRODUCCIÓN (para el taller / corte / costura)
// ─────────────────────────────────────────────────────────────
// Formato claro para quien corta y cose: agrupado por talla, cada persona
// bajo su talla con las medidas especiales al lado, y un resumen de totales
// arriba (para comprar tela de un vistazo). Reemplaza la tabla-arriba +
// lista-abajo que costaba relacionar. Genérico: sirve para cualquier pedido
// con personas[].talla (no solo filipinas).

const MED_LBL = {
  hombro: "Hombro", pecho: "Pecho", cintura: "Cintura", cadera: "Cadera",
  largo: "Largo", sisa: "Sisa", manga: "L. manga", puno: "Puño", cuello: "Cuello",
  escote: "Escote", costado: "Costado", alto: "Alto", talle: "Talle", sep: "Sep.",
  ctcodo: "Cont. codo", altcodo: "Alto codo", base: "Base", muslo: "Muslo",
  rodilla: "Rodilla", ruedo: "Ruedo", tiroD: "Tiro del.", tiroT: "Tiro tras.",
  ajuste: "Ajuste", contornoCabeza: "Contorno cabeza",
};
// Distinción por SÍMBOLO + texto (no por color) para que se lea impreso en B/N:
// ● cocinero · ○ pastelero · ★ chef. Todo en negro.
const ESP_SIMBOLO = { cocinero: "●", pastelero: "○", chef: "★" };

function medidasDePersona(per) {
  const out = [];
  const m = per.medidas || {};
  // Recorre TODAS las secciones de medidas (chaqueta, pantalon, quepi,
  // filipina, etc.) para no perder ajustes especiales como el escote de
  // filipina. "abono" es dinero, no medida: se omite.
  for (const [sec, obj] of Object.entries(m)) {
    if (sec === "abono" || !obj || typeof obj !== "object") continue;
    for (const [k, v] of Object.entries(obj)) {
      if (v !== "" && v != null) out.push([MED_LBL[k] || k, v]);
    }
  }
  return out;
}

export function imprimirHojaTaller(p) {
  const win = nuevaVentanaImpresion("Producción — " + (p.tipoPrenda || p.cliente || "Pedido"));
  const personas = Array.isArray(p.personas) ? p.personas : [];

  // Agrupar por talla (las sin talla van aparte).
  //
  // La talla vive en DOS sitios según cómo se cargó el pedido: suelta en la
  // persona, o dentro de cada prenda (per.prendas[].talla). Mirar solo la
  // primera imprimía pedidos ENTEROS como "PENDIENTE DE TALLA" — le pasó al
  // 63 (INSO) — el mismo bug ya corregido en las hojas de corte. Una persona
  // con varias prendas aparece bajo cada talla, con la prenda anotada, y el
  // conteo de cada talla cuenta PRENDAS (lo que se cose), no personas.
  const lineasDe = per => {
    const t = (per.talla || "").trim();
    if (t) return [{ talla: t, prenda: "" }];
    return (per.prendas || [])
      .map(pr => ({ talla: (pr.talla || "").trim(), prenda: (pr.tipo || "").trim() }))
      .filter(l => l.talla);
  };

  const porTalla = new Map();          // talla -> [{per, prenda}]
  const pendientes = [];
  for (const per of personas) {
    const lineas = lineasDe(per);
    if (!lineas.length) { pendientes.push(per); continue; }
    for (const l of lineas) {
      if (!porTalla.has(l.talla)) porTalla.set(l.talla, []);
      porTalla.get(l.talla).push({ per, prenda: l.prenda });
    }
  }
  const tallasOrd = [...porTalla.keys()].sort((a, b) => rankTalla(a) - rankTalla(b));
  const totalConTalla = [...porTalla.values()].reduce((s, arr) => s + arr.length, 0);

  // Colores de especialidad solo si el pedido las usa.
  const cargos = new Set(personas.map(per => (per.cargo || "").trim().toLowerCase()).filter(Boolean));
  const usaEsp = [...cargos].some(c => ESP_SIMBOLO[c]);

  const badge = (per) => {
    const c = (per.cargo || "").trim();
    if (!c) return "";
    const sim = ESP_SIMBOLO[c.toLowerCase()] || "◆";
    return `<span class="esp">${sim} ${esc(c)}</span>`;
  };

  const filaPersona = (per, prenda = "") => {
    const meds = medidasDePersona(per);
    const medBox = meds.length
      ? `<div class="med">✂ A LA MEDIDA — ${meds.map(([l, v]) => `${esc(l)}: <b>${esc(v)}</b>`).join(" · ")}</div>`
      : "";
    const nota = per.nota ? `<div class="nota">📌 ${esc(per.nota)}</div>` : "";
    // La prenda se anota cuando la persona pide varias: sin esto, dos
    // renglones de la misma persona no dicen cuál camiseta es cuál.
    const pr = prenda ? ` <span class="pr">${esc(prenda)}</span>` : "";
    return `<div class="prow">
      <span class="ck"></span>
      <div class="who"><div class="nm">${esc(per.nombre || "Sin nombre")}${pr}</div>${medBox}${nota}</div>
      ${badge(per)}
    </div>`;
  };

  const seccionTalla = (t) => {
    const arr = porTalla.get(t);
    return `<section class="tsec">
      <div class="thd">TALLA ${esc(t)} <span class="cnt">${arr.length}</span></div>
      ${arr.map(x => filaPersona(x.per, x.prenda)).join("")}
    </section>`;
  };

  const seccionPend = pendientes.length ? `<section class="tsec">
      <div class="thd falta">⚠ PENDIENTE DE TALLA <span class="cnt">${pendientes.length}</span></div>
      ${pendientes.map(per => filaPersona(per)).join("")}
    </section>` : "";

  // Componentes adicionales del kit (gabacha, gorro, etc.): prendas de talla
  // única que NO se toman por persona pero SÍ hay que cortar/coser. Sin este
  // bloque, la costurera no ve que el pedido lleva más que la prenda base.
  const comps = (Array.isArray(p.componentes) ? p.componentes : [])
    .filter(c => c && (c.nombre || c.cantidad || c.tallasQty));
  const seccionComps = comps.length ? `<section class="tsec">
      <div class="thd comp">➕ OTRAS PRENDAS DEL PEDIDO</div>
      ${comps.map(c => {
        const tq = c.tallasQty && typeof c.tallasQty === "object" ? c.tallasQty : null;
        const porTalla = tq ? Object.entries(tq).filter(([, v]) => parseInt(v, 10) > 0) : [];
        const total = cantidadComponente(c);
        return `<div class="prow">
        <span class="ck"></span>
        <div class="who"><div class="nm">${esc(c.nombre || "Prenda")}${
          !porTalla.length && c.talla
            ? ` <span class="tu">${/[úu]nica/i.test(String(c.talla)) ? "Talla única" : "Talla " + esc(c.talla)}</span>`
            : ""
        }</div>${
          // el desglose va en la hoja: sin esto la costurera ve el total pero no
          // cuántas cortar de cada talla
          porTalla.length
            ? `<div class="nota">${porTalla.map(([t, v]) => `<b>${esc(t)}</b>&nbsp;${esc(v)}`).join(" &nbsp;·&nbsp; ")}</div>`
            : ""
        }${c.nota ? `<div class="nota">📌 ${esc(c.nota)}</div>` : ""}</div>
        ${total ? `<span class="qcomp">${total}</span>` : ""}
      </div>`;
      }).join("")}
    </section>` : "";

  // Resumen (tabla general compacta) — vinculado: mismos números que las secciones.
  const resumen = tallasOrd.map(t =>
    `<span class="rchip"><b>${esc(t)}</b> ${porTalla.get(t).length}</span>`
  ).join("") + (pendientes.length ? `<span class="rchip pend"><b>s/talla</b> ${pendientes.length}</span>` : "");

  const leyenda = usaEsp
    ? `<div class="leg">${[["cocinero", "Cocinero"], ["pastelero", "Pastelero"], ["chef", "Chef"]]
        .filter(([k]) => cargos.has(k))
        .map(([k, l]) => `<span>${ESP_SIMBOLO[k]} ${l}</span>`).join("")}</div>`
    : "";

  const css = BASE_CSS + `
    .rsum{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 4px}
    .rsum .t{font-family:var(--body);font-size:11px;font-weight:700;color:#6B6B64;text-transform:uppercase;letter-spacing:.05em;margin-right:4px}
    .rchip{background:#F1EFEA;border:1px solid #E0DDD5;border-radius:20px;padding:4px 14px;font-size:15px;font-variant-numeric:tabular-nums}
    .rchip b{color:${ACCENT};margin-right:3px}
    .rchip.pend{background:#EDEDED;border-color:#B9C0C7;color:#333}
    .leg{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px;font-size:13px;font-weight:700}
    .leg span{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:8px;border:1.5px solid #1c1c1c}
    .hint{font-size:12px;color:#777;margin:4px 0 14px;line-height:1.5}
    .tsec{margin-bottom:16px;break-inside:avoid}
    .thd{font-size:22px;font-weight:800;background:#1c1c1c;color:#fff;padding:8px 15px;border-radius:9px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;letter-spacing:.4px}
    .thd.falta{background:#fff;color:#1c1c1c;border:2.5px dashed #1c1c1c}
    .thd.falta .cnt{background:#1c1c1c;color:#fff}
    .thd.comp{background:#565656}
    .tu{font-size:12px;font-weight:800;border:1.5px solid #1c1c1c;border-radius:6px;padding:1px 8px;margin-left:6px;white-space:nowrap}
    .qcomp{font-size:20px;font-weight:800;min-width:44px;text-align:center;font-variant-numeric:tabular-nums;flex:none}
    .thd .cnt{background:#fff;color:#1c1c1c;border-radius:20px;padding:0 15px;font-size:19px;min-width:40px;text-align:center;font-variant-numeric:tabular-nums}
    .prow{display:flex;align-items:center;gap:13px;padding:11px 6px;border-bottom:1.5px solid #eee;break-inside:avoid}
    .ck{width:26px;height:26px;border:2.2px solid #1c1c1c;border-radius:6px;flex:none}
    .who{flex:1;min-width:0}
    .nm{font-size:18px;font-weight:700;line-height:1.15}
    .pr{font-size:12px;font-weight:700;border:1.3px solid #333;border-radius:5px;padding:1px 7px;margin-left:6px;white-space:nowrap}
    .med{margin-top:4px;font-size:13px;background:#F0F0F0;border:1.4px solid #333;border-radius:7px;padding:4px 9px;color:#1c1c1c;display:inline-block;font-weight:600}
    .nota{margin-top:4px;font-size:12.5px;color:#333;font-weight:600}
    .esp{font-size:13px;font-weight:800;padding:6px 13px;border-radius:8px;white-space:nowrap;flex:none;border:1.5px solid #1c1c1c;color:#1c1c1c;background:#fff}
    .refs{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 4px}
    .refs img{height:110px;max-width:170px;object-fit:contain;border:1.5px solid #1c1c1c;border-radius:8px;background:#fff}
    .refs .rt{font-size:10.5px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:.05em;width:100%}
  `;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Producción — ${esc(p.tipoPrenda || p.cliente || "Pedido")}</title><style>${css}</style></head>
    <body>${BARRA}<section class="page">
      ${encabezado({ nombre: (p.tipoPrenda || "Pedido") + " — " + (p.cliente || ""), icono: "🏭", imagenes: [] }, "Hoja de producción", ["Fecha", "Costurera"])}
      <div class="rsum"><span class="t">Total ${totalConTalla}${pendientes.length ? " + " + pendientes.length + " pend." : ""}:</span>${resumen}</div>
      ${(() => {
        // Imágenes de referencia del pedido (el diseño, la muestra): esto lo
        // tenía la hoja de producción vieja y era su único aporte real. Sin
        // ellas la costurera cose sin ver cómo debe quedar.
        const refs = (p.imagenes || []).map(im => imgSrc(im)).filter(Boolean).slice(0, 4);
        return refs.length
          ? `<div class="refs"><span class="rt">Referencia del diseño</span>${refs.map(u => `<img src="${esc(u)}" alt="">`).join("")}</div>`
          : "";
      })()}
      ${leyenda}
      <div class="hint">Cada renglón es una prenda. Tachá ▢ al terminar. Las que dicen «A la medida» se cortan con esas medidas, no por talla.${usaEsp ? " El símbolo (● ○ ★) indica qué lleva bordado en la manga." : ""}</div>
      ${tallasOrd.map(seccionTalla).join("")}
      ${seccionPend}
      ${seccionComps}
    </section></body></html>`;

  win.document.write(html);
  win.document.close();
}
