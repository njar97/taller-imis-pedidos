// Comparativo de cotizaciones — arma una sola hoja imprimible con N
// opciones (ej. mismo producto en 3 técnicas/precios) para mostrarle al
// cliente sin sumar los montos. Recibe cotizaciones en formato app
// (camelCase) y devuelve HTML listo para nuevaVentanaImpresion().

const esc = s =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Precio unitario y total de una cotización a partir de sus ítems.
function resumen(c) {
  const items = c.tallasItems || [];
  const qty = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
  const total = parseFloat(c.precio || 0);
  const unit =
    qty > 0
      ? total / qty
      : items[0] && items[0].precio != null
      ? parseFloat(items[0].precio)
      : total;
  return { qty, total, unit };
}

const money = n => "$" + n.toFixed(2).replace(/\.00$/, "");

export function htmlComparativoCotizaciones(cots) {
  const cliente = (cots[0] && cots[0].cliente) || "Cliente";
  const fecha = new Date().toLocaleDateString("es-SV");

  const cards = cots
    .map((c, i) => {
      const { qty, total, unit } = resumen(c);
      const tela = [c.tela, c.color].filter(Boolean).join(" · ");
      const im = (c.imagenes || [])[0];
      const img = im && (im.supabaseUrl || im.driveUrl || im.data);
      return `
      <div class="op">
        <div class="badge">Opción ${i + 1}</div>
        ${img ? `<div class="foto"><img src="${esc(img)}" alt=""></div>` : ""}
        <h3>${esc(c.tipoPrenda || "Opción " + (i + 1))}</h3>
        <div class="desc">${esc(c.descripcion || "")}</div>
        ${tela ? `<span class="tag">${esc(tela)}</span>` : ""}
        <div class="precio">
          <div class="cu">${money(unit)} <span>c/u</span></div>
          ${qty > 0 ? `<div class="tot">${money(total)} · ${qty} u.</div>` : ""}
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
  @media print{body{background:#fff;padding:0}.no-print{display:none!important}@page{margin:12mm;size:A4}}
  .hoja{max-width:820px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.08)}
  .top{background:#1c1c1c;color:#fff;padding:22px 28px;display:flex;justify-content:space-between;align-items:flex-start}
  .marca{font-family:Georgia,serif;font-size:24px;font-weight:800;color:#C9A227}
  .marca small{display:block;font-family:'Segoe UI';font-size:11px;color:#cfcfcf;font-weight:400;letter-spacing:1px;margin-top:3px}
  .top .meta{text-align:right;font-size:12px;color:#ddd;line-height:1.6}
  .sub{padding:18px 28px 6px}
  .sub h1{font-size:19px;color:#1c1c1c}
  .sub .gold{color:#C9A227}
  .sub p{font-size:13px;color:#666;margin-top:4px}
  .ops{padding:14px 28px 6px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .op{border:1.5px solid #e6e6e6;border-radius:12px;padding:16px;display:flex;flex-direction:column}
  .badge{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#C9A227;margin-bottom:6px}
  .op .foto{margin:0 0 10px;border-radius:8px;overflow:hidden;background:#f7f7f7;border:1px solid #eee}
  .op .foto img{width:100%;height:175px;object-fit:contain;display:block}
  .op h3{font-size:15px;color:#1c1c1c;margin-bottom:8px}
  .op .desc{font-size:12px;color:#555;line-height:1.5;flex:1}
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
      <div class="meta">Cotización<br><b style="color:#fff">${cots.length} opciones</b><br>${fecha} · válida 15 días</div>
    </div>
    <div class="sub">
      <h1>Opciones para <span class="gold">${esc(cliente)}</span></h1>
      <p>Elegí la opción que más te convenga.</p>
    </div>
    <div class="ops">${cards}</div>
    <div class="pie">Los precios son por unidad. <b>Se elige una sola opción</b> — los montos no se suman. Precios sujetos a confirmación de tallas.</div>
  </div>
  <div class="imprimir no-print"><button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button></div>
</body></html>`;
}
