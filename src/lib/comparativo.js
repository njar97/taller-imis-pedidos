// Comparativo de cotizaciones — arma una sola hoja imprimible con N
// opciones (ej. mismo producto en 3 técnicas/precios) para mostrarle al
// cliente sin sumar los montos. Recibe cotizaciones en formato app
// (camelCase) y devuelve HTML listo para nuevaVentanaImpresion().

import { imgSrc } from "./imagenes.js";
import { comparativoOpciones } from "./dominio.js";

const esc = s =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const money = n => "$" + n.toFixed(2).replace(/\.00$/, "");

// Lista "Tela / Color / Tallas..." de una opción. Sin esto la tarjeta salía
// con foto y precio nada más, y el cliente no sabía qué diferenciaba a una
// opción de la otra.
const specsHTML = (specs, clase) =>
  specs.length
    ? `<ul class="${clase}">${specs
        .map(s => `<li><b>${esc(s.k)}:</b> ${esc(s.v)}</li>`)
        .join("")}</ul>`
    : "";

export function htmlComparativoCotizaciones(cots) {
  const cliente = (cots[0] && cots[0].cliente) || "Cliente";
  const contacto = (cots[0] && cots[0].nombreContacto) || "";
  const fecha = new Date().toLocaleDateString("es-SV");
  const validez = (cots[0] && cots[0].validezDias) || 15;
  // Producto común, specs compartidas y cantidad — se muestran 1 sola vez.
  const { comun, comunes, descComun, opciones } = comparativoOpciones(cots);
  const qtyComun = opciones[0] ? opciones[0].qty : 0;

  const cards = opciones
    .map((op, i) => {
      const im = (cots[i].imagenes || [])[0];
      // imgSrc y no la URL cruda: driveUrl es un link /view de Drive, no una
      // imagen — usado como <img src> salía la foto rota en el comparativo.
      const img = imgSrc(im);
      return `
      <div class="op">
        <div class="badge">Opción ${i + 1}</div>
        ${img ? `<div class="foto"><img src="${esc(img)}" alt=""></div>` : ""}
        <h3>${esc(op.etiqueta)}</h3>
        ${specsHTML(op.specs, "specs")}
        ${op.descripcion ? `<div class="desc">${esc(op.descripcion)}</div>` : ""}
        <div class="precio">
          <div class="cu">${money(op.unit)} <span>c/u</span></div>
          ${op.qty > 0 ? `<div class="tot">${money(op.total)} · ${op.qty} u.</div>` : ""}
        </div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comparativo — ${esc(cliente)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f4f4f4;color:#2b2b2b;padding:24px}
  @media print{body{background:#fff;padding:0}.no-print{display:none!important}@page{margin:12mm;size:A4}.op{break-inside:avoid}}
  .hoja{max-width:820px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.08)}
  .top{background:#1c1c1c;color:#fff;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start}
  .marca{font-family:Georgia,serif;font-size:24px;font-weight:800;color:#C9A227}
  .marca small{display:block;font-family:'Segoe UI';font-size:11px;color:#cfcfcf;font-weight:400;letter-spacing:1px;margin-top:3px}
  .top .meta{text-align:right;font-size:12px;color:#ddd;line-height:1.6}
  .sub{padding:18px 28px 6px}
  .sub h1{font-size:19px;color:#1c1c1c}
  .sub .gold{color:#C9A227}
  .sub p{font-size:13px;color:#666;margin-top:4px}
  .comunes{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
  .comunes li{font-size:11.5px;color:#444;background:#f3f3f3;border-radius:20px;padding:4px 11px}
  .comunes li b{color:#1c1c1c}
  .nota{font-size:12.5px;color:#555;line-height:1.5;margin-top:10px;padding:9px 12px;background:#fbf7ec;border-left:3px solid #C9A227;border-radius:6px}
  .ops{padding:14px 28px 6px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .op{border:1.5px solid #e6e6e6;border-radius:12px;padding:16px;display:flex;flex-direction:column}
  .badge{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#C9A227;margin-bottom:6px}
  .op .foto{margin:0 0 10px;border-radius:8px;overflow:hidden;background:#f7f7f7;border:1px solid #eee}
  .op .foto img{width:100%;height:175px;object-fit:contain;display:block}
  .op h3{font-size:15px;color:#1c1c1c;margin-bottom:8px}
  .op .specs{list-style:none;font-size:12px;color:#555;line-height:1.6}
  .op .specs b{color:#1c1c1c;font-weight:700}
  .op .desc{font-size:12px;color:#555;line-height:1.5;margin-top:8px;flex:1}
  .op .tag{display:inline-block;font-size:10.5px;font-weight:700;color:#444;background:#f3f3f3;border-radius:20px;padding:3px 9px;margin-top:10px;align-self:flex-start}
  .precio{margin-top:12px;padding-top:10px;border-top:1px dashed #e0e0e0}
  .precio .cu{font-size:24px;font-weight:900;color:#1c1c1c}
  .precio .cu span{font-size:13px;font-weight:700;color:#888}
  .precio .tot{font-size:12px;color:#C9A227;font-weight:800;margin-top:2px}
  .pie{padding:14px 28px 24px;font-size:12px;color:#777;border-top:1px solid #eee;margin-top:10px;line-height:1.6}
  .pie b{color:#444}
  .imprimir{max-width:820px;margin:14px auto 0;text-align:center}
  .imprimir button{background:#C9A227;color:#1c1c1c;border:none;border-radius:8px;padding:11px 26px;font-weight:800;font-size:14px;cursor:pointer}
</style></head><body>
  <div class="hoja">
    <div class="top">
      <div class="marca">🧵 Taller IMIS<small>UDP CONFECCIONES IMIS</small></div>
      <div class="meta">Cotización<br><b style="color:#fff">${cots.length} opciones</b><br>${fecha} · válida ${validez} días</div>
    </div>
    <div class="sub">
      <h1><span class="gold">${esc(comun)}</span></h1>
      <p>Para ${esc(cliente)}${contacto ? ` · Attn. ${esc(contacto)}` : ""}${qtyComun > 0 ? ` · ${qtyComun} unidades` : ""} · elegí una opción</p>
      ${specsHTML(comunes, "comunes")}
      ${descComun ? `<div class="nota">${esc(descComun)}</div>` : ""}
    </div>
    <div class="ops">${cards}</div>
    <div class="pie">Los precios son por unidad. <b>Se elige una sola opción</b> — los montos no se suman. Precios sujetos a confirmación de tallas.</div>
  </div>
  <div class="imprimir no-print">
    <button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    <!-- Sin Cerrar, cancelar la impresion dejaba al usuario atrapado en el
         overlay. window.close() funciona porque nuevaVentanaImpresion lo
         remapea al cierre del overlay. -->
    <button onclick="window.close()" style="background:#fff;color:#444;border:1.5px solid #ccc;border-radius:8px;padding:11px 18px;font-weight:700;font-size:14px;cursor:pointer;margin-left:8px">✕ Cerrar</button>
  </div>
</body></html>`;
}
