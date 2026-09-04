// Hoja de corte ARMABLE: una sola opción que se compone con perillas, en vez
// de cuatro hojas fijas (Javier, 4-sep-2026: «no quiero un formato establecido
// sino una serie de combinaciones en una sola opción»).
//
// Se construye sobre itemsResumen(p), que resuelve las dos formas de cargar un
// pedido (lista de personas o cuadro de tallas). agruparColorTalla NO servía:
// cuenta desde `personas`, y un pedido como el #78 (Sunza) no tiene ninguna.
//
// El aspecto es el de las demás hojas de la app (encabezado «Taller IMIS»,
// franja gris, tabla #2C1654, casilla ☐, pie «Cortó / Tela usada»): lo único
// que cambia entre combinaciones es qué se cuenta y cómo se reparte.

import { itemsResumen, rankTalla, medidaCuelloParaTalla } from "./dominio.js";
import { nuevaVentanaImpresion, recetaParaCorte } from "./imprimir.js";
import { dbMoldesLeer } from "./db.js";

const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const OPCIONES_DEFAULT = {
  filas: "talla",                    // 'talla' | 'persona'
  contar: "uniforme",                // 'uniforme' | 'prenda' | 'pieza'
  columnas: ["spec"],                // subconjunto de 'spec' | 'color' | 'tipo'
  mostrar: ["sueltas", "listo", "avisos"],   // + 'tejidos'
  tamano: "normal",                  // 'normal' | 'grande'
};

const ETIQ_COL = { spec: "detalle", color: "color", tipo: "prenda" };
// «pantalón» → «pantalones», «camisa» → «camisas».
const plural = (s, n) => n === 1 ? s : (/ón$/.test(s) ? s.replace(/ón$/, "ones") : s + "s");

// Un ítem «suelto» es una prenda que va aparte de los conjuntos: la app los
// carga con tipo «Camisa (suelta)» / «Pantalón (suelto)».
const esSuelta = it => /suelt/i.test(it.tipo || "");
// Nombre de la prenda sin el paréntesis: «Camisa (suelta)» → «Camisa».
const prendaDe = it => (it.tipo || "").replace(/\s*\(.*?\)\s*/g, "").trim();

const colorDe = it => {
  const s = ((it.color || "") + " " + (it.spec || "")).toLowerCase();
  const m = s.match(/\b(rojo|roja|verde|azul|amarillo|amarilla|blanco|blanca|negro|negra|gris|celeste|naranja|morado|rosado|rosa|beige|caf[eé]|vino|turquesa|marino)\b/);
  return m ? m[1] : "";
};

// Qué perillas tienen sentido para ESTE pedido. Lo que no aplica no se ofrece:
// un botón «por color» en un pedido de un color solo confunde.
export function perillasCorte(p) {
  const items = itemsResumen(p) || [];
  const distintos = f => new Set(items.map(f).filter(Boolean));
  const conjuntos = items.filter(it => !esSuelta(it));
  return {
    persona: (p.personas || []).some(per => per.talla || (per.prendas || []).length),
    spec: distintos(it => (it.spec || "").trim()).size > 1,
    color: distintos(colorDe).size > 1,
    tipo: distintos(it => prendaDe(it)).size > 1 || items.some(esSuelta),
    sueltas: items.some(esSuelta),
    uniforme: conjuntos.length > 0,
    tejidos: /polo|deportiv|camisa|cuello/i.test(p.tipoPrenda || "") || items.some(it => /polo|camisa/i.test(it.tipo || "")),
  };
}

function valorCol(it, col) {
  if (col === "spec") return (it.spec || "").trim() || "—";
  if (col === "color") return colorDe(it) || "—";
  if (col === "tipo") return prendaDe(it) || "—";
  return "—";
}

// Prendas que componen un uniforme completo. Se infieren de las sueltas que
// trae el pedido («Camisa (suelta)» + «Pantalón (suelto)» → camisa y pantalón);
// si no hay sueltas, el conjunto es una sola prenda: la del pedido.
function prendasDelConjunto(p, items) {
  const desdeSueltas = [...new Set(items.filter(esSuelta).map(prendaDe).filter(Boolean))];
  if (desdeSueltas.length) return desdeSueltas;
  const tipos = [...new Set(items.map(prendaDe).filter(Boolean))];
  return tipos.length ? tipos : [p.tipoPrenda || "prenda"];
}

// Arma la tabla en datos (filas/columnas/totales). Separado del HTML para
// poder probarlo con números y no a ojo.
export function armarCorte(p, opts = {}, moldes = []) {
  const o = { ...OPCIONES_DEFAULT, ...opts };
  const items = (itemsResumen(p) || []).filter(it => it.talla);
  const conj = items.filter(it => !esSuelta(it));
  const sueltas = items.filter(esSuelta);
  const tallas = [...new Set(items.map(it => it.talla))].sort((a, b) => rankTalla(a) - rankTalla(b));
  const cols = (o.columnas || []).filter(c => ["spec", "color", "tipo"].includes(c));
  const prendas = prendasDelConjunto(p, items);

  // Clave de columna: combinación de las perillas prendidas («Básica · azul»).
  const claveDe = it => cols.map(c => valorCol(it, c)).join(" · ") || "Total";

  let filas = [];
  let columnas = [];
  const totales = {};

  if (o.filas === "persona") {
    const personas = (p.personas || []).filter(per => per.talla || (per.prendas || []).length);
    filas = personas.map(per => ({
      etiqueta: per.nombre || "(sin nombre)",
      talla: per.talla || (per.prendas || []).map(pr => pr.talla).filter(Boolean).join("/"),
      detalle: per.cargo || (per.prendas || []).map(pr => [pr.tipo, pr.spec].filter(Boolean).join(" ")).join(", "),
      n: (per.prendas || []).length || 1,
    }));
    return { modo: o, filas, columnas: [], totales: { n: filas.reduce((s, f) => s + f.n, 0) }, prendas, tallas, sueltas: [], avisos: avisosDe(p) };
  }

  if (o.contar === "uniforme") {
    // Número grande = conjuntos completos; las sueltas van aparte, en su talla.
    columnas = [...new Set(conj.map(claveDe))];
    filas = tallas.map(t => {
      const mios = conj.filter(it => it.talla === t);
      const porCol = {};
      for (const it of mios) porCol[claveDe(it)] = (porCol[claveDe(it)] || 0) + (it.qty || 0);
      const n = mios.reduce((s, it) => s + (it.qty || 0), 0);
      const ap = sueltas.filter(it => it.talla === t).map(it => ({ qty: it.qty, prenda: prendaDe(it).toLowerCase(), detalle: (it.spec || "").trim() }));
      return { etiqueta: t, n, porCol, aparte: ap };
    });
    for (const f of filas) for (const c of columnas) totales[c] = (totales[c] || 0) + (f.porCol[c] || 0);
    totales.n = filas.reduce((s, f) => s + f.n, 0);
    totales.sueltas = sueltas.reduce((acc, it) => { const k = prendaDe(it).toLowerCase(); acc[k] = (acc[k] || 0) + (it.qty || 0); return acc; }, {});
  } else if (o.contar === "prenda") {
    // Cada conjunto aporta una de cada prenda; las sueltas se suman a la suya.
    const colsPrenda = prendas.map(pr => pr);
    columnas = [];
    for (const pr of colsPrenda) {
      const sub = cols.length ? [...new Set(items.map(claveDe))] : ["Total"];
      for (const s of sub) columnas.push(pr + (cols.length ? " · " + s : ""));
    }
    filas = tallas.map(t => {
      const porCol = {};
      for (const it of conj.filter(it => it.talla === t)) {
        for (const pr of colsPrenda) {
          const k = pr + (cols.length ? " · " + claveDe(it) : "");
          porCol[k] = (porCol[k] || 0) + (it.qty || 0);
        }
      }
      for (const it of sueltas.filter(it => it.talla === t)) {
        const pr = colsPrenda.find(x => x.toLowerCase() === prendaDe(it).toLowerCase()) || prendaDe(it);
        const k = pr + (cols.length ? " · " + claveDe(it) : "");
        if (!columnas.includes(k)) columnas.push(k);
        porCol[k] = (porCol[k] || 0) + (it.qty || 0);
      }
      const n = Object.values(porCol).reduce((s, v) => s + v, 0);
      return { etiqueta: t, n, porCol, aparte: [] };
    });
    for (const f of filas) for (const c of columnas) totales[c] = (totales[c] || 0) + (f.porCol[c] || 0);
    totales.n = filas.reduce((s, f) => s + f.n, 0);
  } else {
    // Piezas de molde: lo que ya hacía la hoja de corte vieja, por talla.
    const receta = t => recetaParaCorte(moldes, p.tipoPrenda, t) || [];
    columnas = [...new Set(tallas.flatMap(t => receta(t).map(r => r.rotulo)))];
    filas = tallas.map(t => {
      const prendasTalla = items.filter(it => it.talla === t).reduce((s, it) => s + (it.qty || 0), 0);
      const r = receta(t);
      const porCol = {};
      for (const x of r) porCol[x.rotulo] = prendasTalla * (x.veces || 1);
      return { etiqueta: t, n: prendasTalla, porCol, aparte: [], sinMolde: !r.length };
    });
    for (const f of filas) for (const c of columnas) totales[c] = (totales[c] || 0) + (f.porCol[c] || 0);
    totales.n = filas.reduce((s, f) => s + f.n, 0);
  }

  const tejidos = (o.mostrar || []).includes("tejidos") ? tejidosPorMedida(items) : null;
  return { modo: o, filas, columnas, totales, prendas, tallas, sueltas, tejidos, avisos: avisosDe(p) };
}

// Cuellos (1 por camisa) y puños (2 por camisa), agrupados por medida de cuello.
function tejidosPorMedida(items) {
  const acc = {};
  for (const it of items) {
    if (!/camisa|polo|uniform|deportiv|^$/i.test(it.tipo || "") && !esSuelta(it)) continue;
    if (esSuelta(it) && !/camisa|polo/i.test(it.tipo || "")) continue;
    let med = "";
    try { med = medidaCuelloParaTalla(it.talla) || ""; } catch { med = ""; }
    const k = med ? String(med) : "?";
    acc[k] = acc[k] || { cuellos: 0, punos: 0 };
    acc[k].cuellos += it.qty || 0;
    acc[k].punos += 2 * (it.qty || 0);
  }
  return acc;
}

// Lo que el pedido dice que falta confirmar. Se sacan de las notas las líneas
// con ⚠ o «pendiente»/«confirmar», que es como las escribe Javier.
function avisosDe(p) {
  const notas = String(p.notas || "");
  return notas.split(/\n|(?=⚠)/).map(s => s.trim())
    .filter(s => /⚠|pendiente|confirmar/i.test(s)).map(s => s.replace(/^⚠\s*/, "")).slice(0, 4);
}

export function hojaCorteArmableHTML(p, opts = {}, moldes = []) {
  const d = armarCorte(p, opts, moldes);
  const o = d.modo;
  const grande = o.tamano === "grande";
  const F = grande
    ? { talla: 56, n: 72, cel: 40, txt: 24, sub: 18, fh: 92 }
    : { talla: 40, n: 52, cel: 30, txt: 17, sub: 13, fh: Math.max(52, Math.min(96, Math.round(430 / Math.max(d.filas.length, 1)))) };
  const th = "padding:7px 4px;border:1px solid #2C1654;font-size:13px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.04em;";
  const td = "border:1px solid #b9b9b9;text-align:center;height:var(--fh);padding:2px;";
  const mostrar = new Set(o.mostrar || []);
  const conListo = mostrar.has("listo");
  const conSueltas = mostrar.has("sueltas") && o.contar === "uniforme" && d.sueltas.length;
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
  const unidad = o.contar === "uniforme" ? "uniformes completos" : o.contar === "prenda" ? "prendas" : "piezas";
  const titulo = `Corte ${num} - ${p.cliente || ""}`;

  let thead = "", tbody = "", tfoot = "";
  if (o.filas === "persona") {
    thead = `<tr style="background:#2C1654;"><th style="${th}text-align:left;padding-left:12px;">Nombre</th><th style="${th}width:90px;">Talla</th><th style="${th}text-align:left;padding-left:12px;">Detalle</th>${conListo ? `<th style="${th}width:64px;background:#463067;">Listo</th>` : ""}</tr>`;
    tbody = d.filas.map(f => `<tr>
      <td style="${td}text-align:left;padding-left:12px;font-size:${F.txt}px;font-weight:700;">${esc(f.etiqueta)}</td>
      <td style="${td}background:#efeaf5;font-size:${F.talla}px;font-weight:900;color:#2C1654;line-height:1;">${esc(f.talla)}</td>
      <td style="${td}text-align:left;padding-left:12px;font-size:${F.sub + 2}px;color:#333;">${esc(f.detalle)}</td>
      ${conListo ? `<td style="${td}font-size:${F.cel}px;color:#c8c8c8;line-height:1;">☐</td>` : ""}
    </tr>`).join("");
    tfoot = `<tr style="background:#2C1654;"><td style="${td}height:auto;padding:9px 12px;font-size:15px;font-weight:900;color:#fff;text-align:left;">TOTAL</td><td style="${td}height:auto;padding:9px 4px;font-size:30px;font-weight:900;color:#fff;line-height:1;">${d.totales.n}</td><td style="${td}height:auto;"></td>${conListo ? `<td style="${td}height:auto;background:#463067;"></td>` : ""}</tr>`;
  } else {
    const unaCol = d.columnas.length <= 1;
    thead = `<tr style="background:#2C1654;">
      <th style="${th}width:80px;">Talla</th>
      <th style="${th}width:${grande ? 130 : 110}px;background:#463067;">${esc(unidad)}</th>
      ${unaCol ? "" : d.columnas.map(c => `<th style="${th}">${esc(c)}</th>`).join("")}
      ${conSueltas ? `<th style="${th}text-align:left;padding-left:12px;">Aparte (sueltas)</th>` : ""}
      ${conListo ? `<th style="${th}width:64px;background:#463067;">Listo</th>` : ""}
    </tr>`;
    tbody = d.filas.map(f => `<tr>
      <td style="${td}background:#efeaf5;font-size:${F.talla}px;font-weight:900;color:#2C1654;line-height:1;">${esc(f.etiqueta)}</td>
      <td style="${td}font-size:${F.n}px;font-weight:900;line-height:1;color:${f.n ? "#111" : "#dcdcdc"};background:#fafafa;">${f.sinMolde ? `<span style="font-size:14px;color:#C0392B;font-weight:800;">sin molde</span>` : (f.n || "·")}</td>
      ${unaCol ? "" : d.columnas.map(c => { const v = f.porCol[c] || 0; return `<td style="${td}font-size:${F.cel}px;font-weight:900;line-height:1;color:${v ? "#111" : "#dcdcdc"};">${v || "·"}</td>`; }).join("")}
      ${conSueltas ? `<td style="${td}text-align:left;padding-left:12px;font-size:${F.txt}px;font-weight:700;line-height:1.35;">${
        f.aparte.length ? f.aparte.map(a => `<b style="color:#C0392B;">+${a.qty} ${esc(a.prenda)}</b>${a.detalle ? ` <span style="color:#666;font-weight:600;">${esc(a.detalle)}</span>` : ""}`).join("<br>") : `<span style="color:#dcdcdc;">·</span>`
      }</td>` : ""}
      ${conListo ? `<td style="${td}font-size:${F.cel}px;color:#c8c8c8;line-height:1;">☐</td>` : ""}
    </tr>`).join("");
    const sueltasTxt = Object.entries(d.totales.sueltas || {}).map(([k, v]) => `+${v} ${esc(plural(k, v))}`).join(", ");
    tfoot = `<tr style="background:#2C1654;">
      <td style="${td}height:auto;padding:9px 4px;font-size:15px;font-weight:900;color:#fff;">TOTAL</td>
      <td style="${td}height:auto;padding:9px 4px;font-size:30px;font-weight:900;color:#fff;line-height:1;background:#463067;">${d.totales.n}</td>
      ${unaCol ? "" : d.columnas.map(c => `<td style="${td}height:auto;padding:9px 4px;font-size:22px;font-weight:900;color:#fff;line-height:1;">${d.totales[c] || 0}</td>`).join("")}
      ${conSueltas ? `<td style="${td}height:auto;padding:9px 12px;font-size:14px;font-weight:800;color:#fff;text-align:left;">${sueltasTxt}</td>` : ""}
      ${conListo ? `<td style="${td}height:auto;background:#463067;"></td>` : ""}
    </tr>`;
  }

  const franja = `<strong>${esc(p.tipoPrenda || "(sin especificar)")}</strong>${p.tela ? ` — ${esc(p.tela)}` : ""}${p.color ? `, ${esc(p.color)}` : ""}
    · <b style="color:#2C1654;">${d.totales.n}</b> ${esc(unidad)}${o.contar === "uniforme" && d.prendas.length > 1 ? ` (${d.prendas.map(x => esc(x.toLowerCase())).join(" + ")})` : ""}${
      o.contar === "uniforme" && d.sueltas.length ? ` · ${d.sueltas.reduce((s, it) => s + (it.qty || 0), 0)} sueltas` : ""}
    ${d.columnas.length > 1 && (o.columnas || []).length ? ` · separado por ${(o.columnas || []).map(c => ETIQ_COL[c]).join(" y ")}` : ""}`;

  const tej = d.tejidos ? `<div style="flex:1 1 300px;border:1.5px solid #2C1654;border-radius:6px;padding:9px 13px;font-size:13.5px;line-height:1.7;">
      <strong style="color:#2C1654;">Tejidos (no se cortan):</strong>
      ${Object.entries(d.tejidos).map(([m, v]) => `<span style="display:inline-block;margin-right:14px;white-space:nowrap;">cuello <b>${esc(m)}</b>: <b style="color:#1A5276;">${v.cuellos}</b> cuellos · <b style="color:#1A5276;">${v.punos}</b> puños</span>`).join("")}
    </div>` : "";
  const avisos = mostrar.has("avisos") && d.avisos.length ? `<div style="flex:1 1 300px;border:1.5px solid #B7791F;background:#fffdf5;border-radius:6px;padding:9px 13px;font-size:12.5px;line-height:1.75;">
      <strong style="color:#B7791F;">Sin confirmar:</strong> ${d.avisos.map(esc).join("<br>")}
    </div>` : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${esc(titulo)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--fh:${F.fh}px;}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:22px 26px;font-size:13px;}
    @media print{body{padding:0;}.no-print{display:none!important;}@page{margin:10mm 11mm;size:letter portrait;}thead{display:table-header-group}tr{page-break-inside:avoid}}
    table{border-collapse:collapse;width:100%;}
  </style></head><body>

  <div class="no-print" style="margin-bottom:14px;">
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
      <button onclick="_print()" style="padding:11px 20px;border-radius:8px;border:none;background:#2C1654;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir / PDF</button>
      <button onclick="window.parent.__closeFrame__()" style="padding:11px 14px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2C1654;padding-bottom:12px;margin-bottom:12px;">
    <div>
      <div style="font-size:22px;font-weight:900;color:#2C1654;font-family:Georgia,serif;">Taller IMIS</div>
      <div style="font-size:12px;color:#555;margin-top:3px;">${esc(p.cliente || "")}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:900;color:#2C1654;">HOJA DE CORTE</div>
      <div style="font-size:12px;color:#555;margin-top:2px;">Pedido N°${num}<br>Fecha: ${fecha}</div>
    </div>
  </div>

  <div style="background:#f5f2f8;border:1px solid #ded5ea;border-radius:6px;padding:8px 12px;font-size:12px;margin-bottom:12px;line-height:1.5;">${franja}</div>

  ${d.filas.length ? `<table><thead>${thead}</thead><tbody>${tbody}</tbody><tfoot>${tfoot}</tfoot></table>`
    : `<div style="padding:20px;text-align:center;color:#888;">Este pedido no tiene tallas cargadas.</div>`}

  ${(tej || avisos) ? `<div style="margin-top:10px;display:flex;gap:10px;align-items:stretch;flex-wrap:wrap;">${tej}${avisos}</div>` : ""}

  <div style="margin-top:12px;border:1.5px solid #2C1654;border-radius:6px;padding:10px 12px;font-size:11.5px;line-height:1.9;">
    <strong style="color:#2C1654;">Antes de cortar:</strong> verificar el sentido de la tela y que el tendido esté parejo.${
      o.contar === "uniforme" && d.prendas.length > 1 ? ` Cada uniforme = ${d.prendas.map(x => "1 " + esc(x.toLowerCase())).join(" + ")}; lo de «Aparte» se corta además.` : ""}<br>
    Tela usada: ______ yardas &nbsp;&nbsp; Sobrante: ______ &nbsp;&nbsp; Cortó: _________________________ &nbsp;&nbsp; Fecha: __________
  </div>

  <script>
  const _pt=(function(){try{return window.parent.document.title;}catch(e){return '';}})();
  function _print(){
    try{window.parent.document.title=document.title;}catch(e){}
    window.print();
    window.addEventListener('afterprint',function(){try{window.parent.document.title=_pt;}catch(e){}},{once:true});
    setTimeout(function(){try{window.parent.document.title=_pt;}catch(e){}},15000);
  }
  </script>
  </body></html>`;
}

export async function imprimirCorteArmable(p, opts = {}) {
  let moldes = [];
  if ((opts.contar || OPCIONES_DEFAULT.contar) === "pieza") {
    try { moldes = (await dbMoldesLeer()) || []; }
    catch (e) { console.warn("No se pudieron leer los moldes:", e.message); }
  }
  const w = nuevaVentanaImpresion(`Corte ${String(p.id).padStart(4, "0")} - ${p.cliente || ""}`);
  w.document.write(hojaCorteArmableHTML(p, opts, moldes));
  w.document.close();
}
