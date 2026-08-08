// Helpers de impresión y exportación extraídos de main.jsx.
// Usados por App (via imprimirPedido) y por los modales de detalle.

import { agruparPrendas } from "../ListaPrendas.jsx";
import { EMPRESA } from "./empresa.js";
import { nombrePDF } from "./pdfNombre.js";
import { agujasTejido, conjuntosResueltos, itemsResumen, medidaCuelloParaTalla, PLANTILLA_TEJIDO, rankTalla, resumenTallas, sumarAbonos } from "./dominio.js";
import { dbMoldesLeer, dbTejidosLeer } from "./db.js";
import { mensajeWA, mensajeCotizacionWA } from "./whatsapp.js";
import { imgSrc } from "./imagenes.js";
import { MEDIDAS_DEF, TALLER, EC } from "./constants.js";
import { diagramaCamisaPNG, techColor } from "./diagrama.js";
import QRCode from "qrcode";

// Genera el HTML de "Detalle por persona" — tabla donde cada fila es una
// persona con sus prendas agrupadas (3× Pantalón 32 — $69, etc.) y un
// subtotal por persona. Devuelve "" si el pedido no tiene personas con
// prendas (ej. pedido en modo "Por tallas" agregadas).
//
// `mostrarPrecios`: si false (operario), oculta columna Subtotal y los
// montos por línea — el operario no necesita ver $ para confeccionar.
// `mostrarInternos`: si false (cliente), oculta info interna del taller
// (talla taller / gafete). Cliente solo ve nombre + cargo + prendas.
export function tablaPorPersonaHTML(p, color = "#1A5276", mostrarPrecios = false, mostrarInternos = false) {
  const personasConPrendas = (p.personas || []).filter(per =>
    Array.isArray(per.prendas) &&
    per.prendas.some(pr => pr.tipo || pr.talla)
  );
  if (personasConPrendas.length === 0) return "";

  let totalPedido = 0;
  const filas = personasConPrendas.map((per, i) => {
    const grupos = agruparPrendas(per.prendas).sort((a, b) => {
      const ta = (a.tipo || "zzz").toLowerCase(), tb = (b.tipo || "zzz").toLowerCase();
      if (ta !== tb) return ta.localeCompare(tb);
      return rankTalla(a.talla) - rankTalla(b.talla);
    });
    const subtotal = grupos.reduce(
      (s, g) => s + (parseFloat(g.precio) || 0) * g.qty,
      0
    );
    totalPedido += subtotal;
    const lineas = grupos
      .filter(g => g.tipo || g.talla)
      .map(g => {
        const label = [g.tipo, g.talla].filter(Boolean).join(" ");
        const tieneP = g.precio != null && g.precio !== "" && parseFloat(g.precio) > 0;
        const sub = mostrarPrecios && tieneP ? parseFloat(g.precio) * g.qty : null;
        return `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;">
          <span><strong style="color:${color};">${g.qty}×</strong> ${label}${g.spec ? ` <span style="color:#888;font-size:11px;">(${g.spec})</span>` : ""}</span>
          ${sub != null ? `<span style="color:#27AE60;font-weight:700;white-space:nowrap;">$${sub.toFixed(2)}</span>` : ""}
        </div>`;
      })
      .join("");
    const tallaTaller = mostrarInternos && per.gafete
      ? `<span style="font-size:10px;color:#666;background:#eef;padding:1px 6px;border-radius:8px;margin-left:6px;">Talla taller ${per.gafete}</span>`
      : "";
    const cargo = per.cargo ? `<div style="font-size:10px;color:#888;margin-top:1px;">${per.cargo}</div>` : "";
    return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9fa"};border-bottom:1px solid #eee;">
      <td style="padding:8px 10px;color:#aaa;font-size:11px;width:24px;vertical-align:top;">${i + 1}</td>
      <td style="padding:8px 10px;vertical-align:top;width:35%;">
        <div style="font-weight:800;color:#2C1654;">${per.nombre || "Sin nombre"}${tallaTaller}</div>
        ${cargo}
      </td>
      <td style="padding:8px 10px;vertical-align:top;font-size:12px;">${lineas}</td>
      ${mostrarPrecios ? `<td style="padding:8px 10px;vertical-align:top;text-align:right;font-weight:800;color:${color};white-space:nowrap;">${subtotal > 0 ? "$" + subtotal.toFixed(2) : "—"}</td>` : ""}
    </tr>`;
  }).join("");

  const colsHeader = `
    <th style="padding:7px 10px;text-align:left;width:24px;">#</th>
    <th style="padding:7px 10px;text-align:left;">Persona</th>
    <th style="padding:7px 10px;text-align:left;">Prendas</th>
    ${mostrarPrecios ? `<th style="padding:7px 10px;text-align:right;width:90px;">Subtotal</th>` : ""}
  `;
  const totalRow = mostrarPrecios && totalPedido > 0
    ? `<tfoot><tr style="background:#f0f0f0;font-weight:800;border-top:2px solid ${color};">
        <td colspan="3" style="padding:8px 10px;color:${color};">TOTAL</td>
        <td style="padding:8px 10px;text-align:right;font-size:15px;color:${color};">$${totalPedido.toFixed(2)}</td>
      </tr></tfoot>`
    : "";

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;border:1px solid #eee;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:${color};color:#fff;">${colsHeader}</tr></thead>
      <tbody>${filas}</tbody>
      ${totalRow}
    </table>`;
}

export async function imprimirPedido(p, esAdmin, todosPedidos = []) {
  if (esAdmin) imprimirRecibo(p);
  else await imprimirProduccion(p, todosPedidos);
}

// Reemplazo de window.open para imprimir / guardar PDF. Monta un overlay
// full-screen con un iframe visible — necesario para que html2canvas pueda
// capturar el contenido y generar un PDF compartible por WhatsApp.
// Expone window.__shareWithPDF__(tituloArch, waText) en el padre, que el
// iframe llama al pulsar el botón "Compartir WA".
export function nuevaVentanaImpresion(titulo = null) {
  const prev = document.getElementById("__print_overlay__");
  if (prev) {
    prev.remove();
    document.body.style.overflow = "";
    delete window.__shareWithPDF__;
    delete window.__closeFrame__;
  }

  const overlay = document.createElement("div");
  overlay.id = "__print_overlay__";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#f5f5f5;overflow:hidden;";

  const iframe = document.createElement("iframe");
  iframe.id = "__print_frame__";
  iframe.style.cssText = "display:block;width:100%;height:100%;border:0;background:#fff;";
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const closeOverlay = () => {
    overlay.remove();
    document.body.style.overflow = "";
    delete window.__shareWithPDF__;
    delete window.__closeFrame__;
  };
  window.__closeFrame__ = closeOverlay;

  window.__shareWithPDF__ = async (tituloArch, waText) => {
    const idoc = iframe.contentWindow.document;
    const btn = idoc.getElementById("wa-pdf-btn");
    const setBtn = (text, disabled = false) => {
      if (btn) { btn.textContent = text; btn.disabled = disabled; }
    };

    try {
      setBtn("⏳ Generando PDF...", true);

      // Ocultar elementos no-print para captura limpia
      const noPrints = Array.from(idoc.querySelectorAll(".no-print"));
      noPrints.forEach(el => { el._pd = el.style.display; el.style.display = "none"; });

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const body = idoc.body;

      // Forzar ancho ≥ 800 px para PDF con layout de escritorio.
      // En móvil, body.scrollWidth ≈ 375 px → el contenido se dobla en altura
      // y el corte fijo de A4 cae a mitad de una fila.
      const origIframeW = iframe.style.width;
      const origBodyMinW = body.style.minWidth;
      body.style.minWidth = "800px";
      if (iframe.offsetWidth < 800) iframe.style.width = "800px";
      await new Promise(r => setTimeout(r, 80));

      const fullH = body.scrollHeight;
      const origH = iframe.style.height;
      // Expandir iframe para que html2canvas vea el contenido completo
      iframe.style.height = fullH + "px";
      await new Promise(r => setTimeout(r, 80));

      // Medir bordes inferiores de las filas ANTES de capturar.
      // scale=1.5 → canvas px = CSS px × 1.5
      const HCS = 1.5;
      const bodyTop = body.getBoundingClientRect().top;
      const rowEndsPx = Array.from(idoc.querySelectorAll("tbody tr, table tr"))
        .map(r => (r.getBoundingClientRect().bottom - bodyTop) * HCS)
        .filter(v => v > 10)
        .sort((a, b) => a - b);

      const canvas = await html2canvas(body, {
        scale: HCS,
        useCORS: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(body.scrollWidth || 0, 800),
        windowHeight: fullH,
      });

      // Restaurar dimensiones originales del iframe
      iframe.style.height = origH;
      iframe.style.width = origIframeW;
      body.style.minWidth = origBodyMinW;
      noPrints.forEach(el => { el.style.display = el._pd || ""; delete el._pd; });

      // Construir PDF A4 con cortes inteligentes (no partir filas).
      // En vez del corte fijo cada A4H, buscamos el último fin-de-fila
      // antes del límite de página y cortamos ahí.
      const A4W = 595.28; // pt
      const A4H = 841.89; // pt
      const pxPerPt = canvas.width / A4W;
      const pageHpx = A4H * pxPerPt; // alto de página en canvas px

      const pageCuts = [0]; // posición de inicio de cada página en canvas px
      let cur = 0;
      while (cur < canvas.height) {
        const pageEnd = cur + pageHpx;
        if (pageEnd >= canvas.height) break;
        let cut = pageEnd;
        // Retroceder al borde inferior de la última fila completa
        for (let i = rowEndsPx.length - 1; i >= 0; i--) {
          if (rowEndsPx[i] <= pageEnd && rowEndsPx[i] > cur + 20) {
            cut = rowEndsPx[i];
            break;
          }
        }
        pageCuts.push(cut);
        cur = cut;
      }
      pageCuts.push(canvas.height);

      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      for (let pg = 0; pg < pageCuts.length - 1; pg++) {
        if (pg > 0) pdf.addPage();
        const startPx = pageCuts[pg];
        const sliceH = Math.ceil(pageCuts[pg + 1] - startPx);
        // Sub-canvas con el slice exacto de esta página
        const pc = document.createElement("canvas");
        pc.width = canvas.width;
        pc.height = sliceH;
        pc.getContext("2d").drawImage(
          canvas, 0, startPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH
        );
        const ptH = sliceH / pxPerPt;
        pdf.addImage(pc.toDataURL("image/jpeg", 0.88), "JPEG", 0, 0, A4W, ptH);
      }

      const blob = pdf.output("blob");
      const fileName = (tituloArch || "documento") + ".pdf";
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: waText || "" });
        setBtn("✅ Compartido");
      } else {
        // Fallback: descarga el PDF + copia el texto
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        if (waText) { try { await navigator.clipboard.writeText(waText); } catch {} }
        setBtn("⬇️ PDF descargado");
      }
      setTimeout(() => setBtn("💬 Compartir WA", false), 3500);
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("shareWithPDF:", err);
        if (waText) {
          try {
            if (navigator.share) await navigator.share({ text: waText });
            else await navigator.clipboard.writeText(waText);
          } catch {}
        }
      }
      setBtn("💬 Compartir WA", false);
    }
  };

  const idoc = iframe.contentWindow.document;
  return {
    document: {
      write: html => idoc.write(html),
      close: () => {
        idoc.close();
        const doImprimir = () => {
          // Monkey-patch close del iframe para que onclick="window.close()" cierre el overlay
          try { iframe.contentWindow.close = closeOverlay; } catch {}
          try {
            const prevTitle = document.title;
            if (titulo) document.title = titulo;
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            const restore = () => { document.title = prevTitle; };
            iframe.contentWindow.addEventListener("afterprint", restore, { once: true });
            setTimeout(restore, 15000);
          } catch (e) {
            console.warn("print():", e);
          }
        };
        if (idoc.readyState === "complete") setTimeout(doImprimir, 300);
        else iframe.contentWindow.onload = () => setTimeout(doImprimir, 300);
      },
    },
  };
}

// Cotización formal — para mandar al cliente. Formato basado en el
// template real de UDP Confecciones IMIS (encabezado con datos
// fiscales, tabla descripción/medida/cant/precio, IVA 13% desglosado,
// firma del representante legal). Sin desglose interno de costos —
// solo lo que el cliente debe ver.
export async function imprimirCotizacion(p) {
  // Si el pedido pide anexo de capacidad, leemos los equipos antes
  // de armar el HTML.
  let equiposCapacidad = null;
  if (p.incluirAnexoCapacidad) {
    try {
      const mod = await import("./capacidad.js");
      equiposCapacidad = await mod.leerEquipos();
    } catch (e) { console.warn("No pude leer equipos:", e); }
  }
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
  const validez = p.validezDias || 15;
  const vence = new Date();
  vence.setDate(vence.getDate() + validez);
  const venceStr = vence.toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
  const items = itemsResumen(p);
  // Código corto por renglón (P-01, P-02…). Va en la tabla y en las fotos, para
  // que el cliente sepa a qué prenda corresponde cada imagen sin adivinar.
  const codigoDe = i => "P-" + String(i + 1).padStart(2, "0");
  const tot = items.reduce((s, it) => {
    const pr = parseFloat(it.precio) || 0;
    return s + pr * it.qty;
  }, 0);
  const totPzas = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
  // El precio total puede venir como string desde p.precio (sobreescrito
  // manualmente) o calcularse desde los items. Damos prioridad al manual.
  const precioFinal = parseFloat(p.precio) > 0 ? parseFloat(p.precio) : tot;
  // Asumimos que el precio total incluye IVA (modelo SV). Si NO incluye
  // IVA, basta con cambiar este cálculo. SUBTOTAL = TOTAL / 1.13.
  const ivaRate = 0.13;
  const subtotal = precioFinal / (1 + ivaRate);
  const iva = precioFinal - subtotal;

  const titulo = nombrePDF("COT", p.id, p.cliente);
  const waMsg = mensajeCotizacionWA(p);
  const w = nuevaVentanaImpresion(titulo);
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${titulo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#111;padding:22px 30px;font-size:12px;line-height:1.45;}
  @media print{body{padding:0;}.no-print{display:none!important;}@page{margin:12mm;size:A4;}thead{display:table-header-group}tr,img{page-break-inside:avoid}}
  table{border-collapse:collapse;width:100%;}
  .lbl{font-size:9px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:.8px;}
  .sec-title{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:1.5px solid #333;padding-bottom:2px;margin-bottom:6px;}
</style></head><body>

<div class="no-print" style="margin-bottom:14px;">
  <div style="background:#f5f5f5;border:1px solid #ccc;border-radius:6px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#333;">
    Tip: al imprimir, en "Destino" elegí <strong>"Guardar como PDF"</strong>. El archivo se llamará <strong>${titulo}.pdf</strong>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
    <button id="wa-pdf-btn" onclick="window.parent.__shareWithPDF__(document.title,_waMsg)" style="padding:11px 20px;border-radius:6px;border:none;background:#25D366;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">Compartir WA</button>
    <button onclick="_print()" style="padding:11px 24px;border-radius:6px;border:none;background:#111;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">Guardar PDF</button>
    <button onclick="window.close()" style="padding:11px 16px;border-radius:6px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">Cerrar</button>
  </div>
</div>

<!-- ENCABEZADO -->
<div style="border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
  <div style="flex:1;">
    <div style="font-size:18px;font-weight:900;color:#111;font-family:Georgia,serif;line-height:1.15;">${EMPRESA.razonSocial}</div>
    <div style="font-size:10px;color:#555;margin-top:4px;line-height:1.55;">
      ${EMPRESA.actividadEconomica}<br>
      ${EMPRESA.direccion}<br>
      Tel: ${EMPRESA.telefonos.join(" · ")}<br>
      ${EMPRESA.email}<br>
      <strong>NIT:</strong> ${EMPRESA.nit} &nbsp; <strong>NRC:</strong> ${EMPRESA.nrc}
    </div>
  </div>
  <div style="text-align:right;border-left:2px solid #888;padding-left:14px;min-width:120px;">
    <div style="font-size:9px;color:#777;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Cotización</div>
    <div style="font-size:28px;font-weight:900;color:#111;line-height:1.1;letter-spacing:-1px;">N° ${num}</div>
    <div style="font-size:10.5px;color:#555;margin-top:4px;">Fecha: <strong>${fecha}</strong></div>
  </div>
</div>

<!-- DIRIGIDA A -->
<div style="border:1.5px solid #bbb;border-radius:5px;padding:8px 12px;margin-bottom:10px;">
  <div class="lbl" style="margin-bottom:3px;">Cotización dirigida a</div>
  <div style="font-size:15px;font-weight:800;color:#111;">${p.cliente || "Cliente"}</div>
  ${p.nombreContacto ? `<div style="font-size:11px;color:#444;margin-top:2px;">Atención: <strong>${p.nombreContacto}</strong></div>` : ""}
  ${p.telefono ? `<div style="font-size:11px;color:#444;">Tel: ${p.telefono}</div>` : ""}
  ${p.procesoRef ? `<div style="font-size:11px;color:#333;margin-top:3px;font-weight:700;">Ref. proceso: ${p.procesoRef}</div>` : ""}
</div>

<p style="font-size:11px;color:#444;margin-bottom:10px;">
  Por medio de la presente nos permitimos presentar la cotización de los productos solicitados con los siguientes detalles:
</p>

<!-- TABLA DETALLE -->
${items.length ? (() => {
  // Si todos los items son del mismo tipo (o ninguno tiene tipo) → encabezado de producto
  // + tabla sin columna Descripción. Si hay múltiples tipos → columna Descripción por fila.
  const tiposDistintos = [...new Set(items.map(it => it.tipo || "").filter(Boolean))];
  const multiTipo = tiposDistintos.length > 1;
  // Quitar paréntesis internos de la tela (ej: "Jersey básico (más económico que piqué)" → "Jersey básico")
  const telaCorta = p.tela ? p.tela.replace(/\s*\([^)]*\)/g, "").trim() : "";
  const prodDesc = [p.tipoPrenda, telaCorta, p.color].filter(Boolean).join(" · ");

  const filas = items.map((it, i) => {
    const pr = parseFloat(it.precio) || 0;
    const sub = pr * it.qty;
    const medida = it.talla || (it.spec && /[\dxm,.]/i.test(it.spec) ? it.spec : "") || "—";
    if (multiTipo) {
      const descripcion = it.tipo || p.tipoPrenda || "—";
      return `<tr style="background:${i%2===0?"#fff":"#f5f5f5"};border-bottom:1px solid #ddd;">
        <td style="padding:7px 7px;text-align:center;font-weight:800;color:#555;white-space:nowrap;">${codigoDe(i)}</td>
        <td style="padding:7px 9px;color:#111;">${descripcion}</td>
        <td style="padding:7px 7px;text-align:center;font-weight:800;color:#111;">${medida}</td>
        <td style="padding:7px 7px;text-align:center;font-weight:800;">${it.qty}</td>
        <td style="padding:7px 9px;text-align:right;font-weight:700;">${pr>0?"$"+pr.toFixed(2):"—"}</td>
        <td style="padding:7px 9px;text-align:right;font-weight:900;">${pr>0?"$"+sub.toFixed(2):"—"}</td>
      </tr>`;
    }
    return `<tr style="background:${i%2===0?"#fff":"#f5f5f5"};">
      <td style="padding:7px 7px;text-align:center;font-weight:800;color:#555;border:1px solid #ddd;white-space:nowrap;">${codigoDe(i)}</td>
      <td style="padding:7px 7px;text-align:center;font-weight:800;color:#111;border:1px solid #ddd;">${medida}</td>
      <td style="padding:7px 7px;text-align:center;font-weight:800;border:1px solid #ddd;">${it.qty}</td>
      <td style="padding:7px 9px;text-align:right;font-weight:700;border:1px solid #ddd;">${pr>0?"$"+pr.toFixed(2):"—"}</td>
      <td style="padding:7px 9px;text-align:right;font-weight:900;border:1px solid #ddd;">${pr>0?"$"+sub.toFixed(2):"—"}</td>
    </tr>`;
  }).join("");

  if (multiTipo) {
    return `
<table style="border:1.5px solid #333;font-size:11.5px;margin-bottom:4px;">
  <thead><tr style="background:#111;color:#fff;">
    <th style="padding:6px 7px;text-align:center;width:48px;">Cód.</th>
    <th style="padding:6px 9px;text-align:left;">Descripción</th>
    <th style="padding:6px 7px;text-align:center;width:75px;">Talla</th>
    <th style="padding:6px 7px;text-align:center;width:55px;">Cant.</th>
    <th style="padding:6px 9px;text-align:right;width:88px;">Precio U.</th>
    <th style="padding:6px 9px;text-align:right;width:95px;">Subtotal</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>`;
  }

  return `
${prodDesc ? `<div style="font-size:11.5px;font-weight:800;color:#111;margin-bottom:4px;padding-bottom:3px;border-bottom:2px solid #333;">${prodDesc}</div>` : ""}
<table style="border-collapse:collapse;width:100%;font-size:11.5px;margin-bottom:4px;">
  <thead><tr style="background:#333;color:#fff;">
    <th style="padding:6px 7px;text-align:center;width:48px;border:1px solid #555;">Cód.</th>
    <th style="padding:6px 7px;text-align:center;width:90px;border:1px solid #555;">Talla</th>
    <th style="padding:6px 7px;text-align:center;width:65px;border:1px solid #555;">Cantidad</th>
    <th style="padding:6px 9px;text-align:right;width:95px;border:1px solid #555;">Precio U.</th>
    <th style="padding:6px 9px;text-align:right;width:100px;border:1px solid #555;">Subtotal</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>`;
})() : ""}
<div style="font-size:10px;color:#888;text-align:right;margin-bottom:10px;">
  Total piezas: <strong>${totPzas}</strong>
</div>

<!-- UNIFORMES COMPLETOS — agrupa las prendas de arriba en kits (uniforme de
     chef, de mesero, traje de banda...). Es informativo: los precios salen de
     las mismas prendas y NO se suman al total del documento. -->
${(() => {
  const kits = conjuntosResueltos(p);
  if (!kits.length) return "";
  const filas = kits.map((k, i) => {
    const detalle = k.piezas
      .map(pz => (pz.qty > 1 ? `${pz.qty}× ` : "") + pz.nombre)
      .join(" + ");
    return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f5f5f5"};">
      <td style="padding:7px 9px;border:1px solid #ddd;font-weight:800;color:#111;">${k.nombre}</td>
      <td style="padding:7px 9px;border:1px solid #ddd;color:#555;font-size:10.5px;">${detalle}</td>
      <td style="padding:7px 9px;border:1px solid #ddd;text-align:right;font-weight:900;">$${k.total.toFixed(2)}</td>
    </tr>`;
  }).join("");
  return `
<div style="font-size:11.5px;font-weight:800;color:#111;margin-bottom:4px;padding-bottom:3px;border-bottom:2px solid #333;">
  Precio por uniforme completo
</div>
<table style="border-collapse:collapse;width:100%;font-size:11.5px;margin-bottom:4px;">
  <thead><tr style="background:#333;color:#fff;">
    <th style="padding:6px 9px;text-align:left;border:1px solid #555;">Uniforme</th>
    <th style="padding:6px 9px;text-align:left;border:1px solid #555;">Prendas que incluye</th>
    <th style="padding:6px 9px;text-align:right;width:100px;border:1px solid #555;">Total</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>
<div style="font-size:10px;color:#888;margin-bottom:10px;">
  Precio de un uniforme para una persona, calculado con las prendas del detalle anterior.
  No se suma al total de esta cotización.
</div>`;
})()}

<!-- TOTALES -->
${p.cotizacionAbierta ? (() => {
  const unitPrice = items.length > 0 && parseFloat(items[0].precio) > 0
    ? parseFloat(items[0].precio)
    : totPzas > 0 ? precioFinal / totPzas : precioFinal;
  const unitSub = unitPrice / (1 + ivaRate);
  const unitIva = unitPrice - unitSub;
  return `
<div style="display:flex;gap:12px;margin-bottom:12px;align-items:stretch;">
  <div style="flex:1;border:2.5px solid #111;border-radius:6px;padding:12px 16px;background:#f9f9f9;">
    <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:6px;">Precio por unidad</div>
    <div style="font-size:32px;font-weight:900;color:#111;line-height:1;">$${unitPrice.toFixed(2)}</div>
    <div style="font-size:10px;color:#666;margin-top:4px;">Subtotal: $${unitSub.toFixed(2)} + IVA: $${unitIva.toFixed(2)}</div>
  </div>
  <div style="flex:1;border:1.5px solid #bbb;border-radius:6px;padding:12px 16px;font-size:11.5px;">
    <div class="sec-title" style="margin-bottom:6px;">Condiciones de pago</div>
    <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #ccc;">
      <span>Anticipo al confirmar <strong>(50%)</strong></span>
      <span style="font-weight:900;">$${(unitPrice * 0.5).toFixed(2)} c/u · $${(precioFinal * 0.5).toFixed(2)} total</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:3px 0;">
      <span>Saldo contra entrega <strong>(50%)</strong></span>
      <span style="font-weight:900;">$${(unitPrice * 0.5).toFixed(2)} c/u · $${(precioFinal * 0.5).toFixed(2)} total</span>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:6px;">
      Total estimado (${totPzas} uds.): <strong>~$${precioFinal.toFixed(2)}</strong><br>
      <em>Cantidad sujeta a confirmación de participantes — anticipo total varía con la cantidad final</em>
    </div>
  </div>
</div>
${p.descripcion ? `
<div style="border:1.5px solid #bbb;border-radius:5px;padding:8px 12px;font-size:11.5px;margin-bottom:10px;">
  <div class="sec-title">Observaciones</div>
  <div style="color:#222;line-height:1.5;">${p.descripcion}</div>
</div>` : ""}`;
})() : `
<div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
  <table style="width:auto;min-width:240px;font-size:12px;border-collapse:collapse;border:1.5px solid #333;">
    <tr style="border-bottom:1px solid #ddd;">
      <td style="padding:5px 14px;text-align:right;color:#555;">Subtotal:</td>
      <td style="padding:5px 14px;text-align:right;font-weight:700;width:100px;">$${subtotal.toFixed(2)}</td>
    </tr>
    <tr style="border-bottom:1.5px solid #333;">
      <td style="padding:5px 14px;text-align:right;color:#555;">IVA (13%):</td>
      <td style="padding:5px 14px;text-align:right;font-weight:700;">$${iva.toFixed(2)}</td>
    </tr>
    <tr style="background:#111;color:#fff;">
      <td style="padding:7px 14px;text-align:right;font-weight:800;font-size:12px;">TOTAL:</td>
      <td style="padding:7px 14px;text-align:right;font-weight:900;font-size:16px;">$${precioFinal.toFixed(2)}</td>
    </tr>
  </table>
</div>

<div style="display:flex;gap:12px;margin-bottom:10px;">
  <div style="flex:1;border:1.5px solid #bbb;border-radius:5px;padding:8px 12px;font-size:11.5px;">
    <div class="sec-title">Condiciones de pago</div>
    <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #ccc;">
      <span>Anticipo al confirmar <strong>(50%)</strong></span>
      <span style="font-weight:900;">$${(precioFinal * 0.5).toFixed(2)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:3px 0;">
      <span>Saldo contra entrega <strong>(50%)</strong></span>
      <span style="font-weight:900;">$${(precioFinal * 0.5).toFixed(2)}</span>
    </div>
  </div>
  ${p.descripcion ? `
  <div style="flex:1;border:1.5px solid #bbb;border-radius:5px;padding:8px 12px;font-size:11.5px;">
    <div class="sec-title">Observaciones</div>
    <div style="color:#222;line-height:1.5;">${p.descripcion}</div>
  </div>` : ""}
</div>`}

<!-- REFERENCIA VISUAL — las mismas fotos del pedido, con el código del renglón
     al que corresponde cada una (P-01, P-02…) para que el cliente sepa qué
     prenda está viendo. El bloque fluye entre páginas: el page-break-inside va
     en cada foto, no en el contenedor, si no una galería larga empuja una
     página entera en blanco antes de empezar. -->
${(() => {
  const imgs = (p.imagenes || []).filter(img => imgSrc(img));
  if (!imgs.length) return "";
  // Cruza cada foto con su renglón por nombre. La foto suele llamarse más
  // corto que la descripción de la tabla ("Pantalón" vs "Pantalón verde oliva
  // (gabardina...)"), así que basta con que uno contenga al otro.
  const norm = s => String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
  const codigoDeImagen = img => {
    const n = norm(img.nombre);
    if (!n) return "";
    // 1) Uno contiene al otro — resuelve la mayoría y no confunde variantes
    //    cercanas ("Camisa manga corta" vs "…manga larga"), porque el nombre
    //    completo de la foto solo cabe dentro de su propio renglón.
    const directo = items.findIndex(it => {
      const t = norm(it.tipo);
      return t && (t.includes(n) || n.includes(t));
    });
    if (directo >= 0) return codigoDe(directo);
    // 2) Si no, por palabras compartidas: la foto puede llamarse "Camiseta con
    //    logo" y el renglón "Camiseta beige con logo bordado". Pide 70% de las
    //    palabras de la foto para no pegar cualquier cosa.
    const palabras = n.split(" ").filter(w => w.length > 2);
    if (!palabras.length) return "";
    let mejor = -1, mejorPunt = 0;
    items.forEach((it, i) => {
      const t = norm(it.tipo);
      if (!t) return;
      const suyas = new Set(t.split(" "));
      const punt = palabras.filter(w => suyas.has(w)).length / palabras.length;
      if (punt > mejorPunt) { mejorPunt = punt; mejor = i; }
    });
    return mejorPunt >= 0.7 ? codigoDe(mejor) : "";
  };
  return `
<div style="border:1.5px solid #bbb;border-radius:5px;padding:8px 12px;margin-bottom:10px;">
  <div class="sec-title">Referencia visual</div>
  <div style="font-size:9.5px;color:#888;margin-bottom:6px;">
    El código de cada foto corresponde al renglón del detalle.
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
    ${imgs.map(img => {
      const cod = codigoDeImagen(img);
      return `<div style="text-align:center;max-width:170px;page-break-inside:avoid;">
      <img src="${imgSrc(img)}" style="max-width:170px;max-height:200px;border-radius:6px;border:1px solid #ddd;display:block;" alt="${img.nombre || ""}" />
      ${cod ? `<div style="font-size:9.5px;font-weight:800;color:#111;margin-top:3px;">${cod}</div>` : ""}
      ${img.nombre ? `<div style="font-size:9px;color:#888;margin-top:${cod ? 1 : 3}px;">${img.nombre}</div>` : ""}
    </div>`;
    }).join("")}
  </div>
</div>`;
})()}

<!-- CONDICIONES FORMALES (solo plazo/lugar, sin forma de pago — ya está arriba) -->
${(p.plazoEntrega || p.lugarEntrega) ? `
<div style="border:1.5px solid #bbb;border-radius:5px;padding:8px 12px;margin-bottom:10px;font-size:11.5px;color:#333;line-height:1.5;">
  ${p.plazoEntrega ? `<div style="margin-bottom:3px;"><strong>Plazo de entrega:</strong> ${p.plazoEntrega}</div>` : ""}
  ${p.lugarEntrega ? `<div><strong>Lugar de entrega:</strong> ${p.lugarEntrega}</div>` : ""}
</div>` : ""}

<!-- VALIDEZ -->
<div style="border:1.5px dashed #999;border-radius:5px;padding:7px 12px;margin-bottom:10px;font-size:11.5px;color:#333;">
  <strong>Validez:</strong> ${validez} días a partir de la fecha de emisión — vence el <strong>${venceStr}</strong>.
</div>

<div style="font-size:10.5px;color:#555;line-height:1.65;margin-bottom:16px;border-top:1px solid #ddd;padding-top:8px;">
  <strong>Condiciones generales:</strong><br>
  • Los precios incluyen IVA, mano de obra y materiales según especificación.<br>
  ${parseFloat(p.recargoTalla || 0) > 0 ? `• Precio válido hasta talla L; tallas XL o mayores tienen un recargo de $${parseFloat(p.recargoTalla).toFixed(2)} por unidad.<br>` : ""}
  • Fecha de entrega a coordinar al momento de la confirmación.<br>
  • Cambios al diseño o cantidades pueden modificar el precio final.<br>
  • Cotización emitida con base a especificaciones recibidas del cliente.
</div>

<!-- FIRMA DEL REPRESENTANTE LEGAL + SELLO -->
${(() => {
  const cfg = (typeof window !== "undefined" ? window.__TALLER_CONFIG__ : null) || {};
  const firma = cfg.firma?.url;
  const sello = cfg.sello?.url;
  return `
  <div style="margin-top:24px;text-align:center;position:relative;">
    ${sello ? `<img src="${sello}" style="position:absolute;right:10%;top:-20px;max-width:90px;max-height:90px;opacity:0.85;" alt="sello" />` : ""}
    <div style="display:inline-block;text-align:center;max-width:340px;position:relative;">
      ${firma ? `<img src="${firma}" style="max-width:200px;max-height:60px;display:block;margin:0 auto -10px;position:relative;z-index:1;" alt="firma" />` : ""}
      <div style="border-top:1.5px solid #333;padding-top:8px;">
        <div style="font-size:12px;font-weight:800;color:#2C1654;">${EMPRESA.representanteLegal.nombre}</div>
        <div style="font-size:10px;color:#666;margin-top:2px;">${EMPRESA.representanteLegal.cargo} — ${EMPRESA.razonSocial}</div>
        <div style="font-size:10px;color:#666;">DUI: ${EMPRESA.representanteLegal.dui}</div>
      </div>
    </div>
  </div>`;
})()}

<div style="margin-top:12px;text-align:center;font-size:9px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:8px;">
  Cotización N° ${num} · ${EMPRESA.razonSocial} · ${fecha}
</div>

${(p.incluirAnexoCapacidad && equiposCapacidad && equiposCapacidad.length > 0) ? (() => {
  const propios = equiposCapacidad.filter(e => e.tipo === "propio");
  const subc    = equiposCapacidad.filter(e => e.tipo === "subcontratado");
  const filaEq = (e) => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-weight:700;color:#2C1654;">${e.nombre}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center;font-weight:700;">${e.cantidad}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:11px;color:#555;">${e.especificacion || "—"}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:11px;color:#666;">${e.proposito || "—"}</td>
    </tr>`;
  return `
<!-- ============ ANEXO: CAPACIDAD INSTALADA ============ -->
<div style="page-break-before:always;"></div>

<div style="text-align:center;margin-bottom:24px;border-bottom:3px double #2C1654;padding-bottom:14px;">
  <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Anexo a la cotización N° ${num}</div>
  <div style="font-size:18px;font-weight:900;color:#2C1654;font-family:Georgia,serif;">DECLARACIÓN DE CAPACIDAD INSTALADA</div>
  <div style="font-size:11px;color:#666;margin-top:4px;">${EMPRESA.razonSocial}</div>
</div>

<div style="font-size:11px;color:#333;line-height:1.6;margin-bottom:16px;">
  Por medio de la presente, <strong>${EMPRESA.razonSocial}</strong>, representada legalmente por
  <strong>${EMPRESA.representanteLegal.nombre}</strong> (DUI ${EMPRESA.representanteLegal.dui}),
  declara contar con la capacidad instalada que se detalla a continuación para la ejecución del
  contrato/orden derivado de la presente cotización.
</div>

${propios.length > 0 ? `
<div style="font-size:11px;font-weight:800;color:#27AE60;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #27AE60;padding-bottom:4px;margin:14px 0 8px;">
  🏛️ Equipo propio del taller
</div>
<table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
  <thead>
    <tr style="background:#27AE60;color:#fff;">
      <th style="padding:8px 10px;text-align:left;">Equipo / Maquinaria</th>
      <th style="padding:8px 10px;text-align:center;width:70px;">Cant.</th>
      <th style="padding:8px 10px;text-align:left;width:30%;">Especificación</th>
      <th style="padding:8px 10px;text-align:left;width:30%;">Propósito</th>
    </tr>
  </thead>
  <tbody>${propios.map(filaEq).join("")}</tbody>
</table>
` : ""}

${subc.length > 0 ? `
<div style="font-size:11px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #9B59B6;padding-bottom:4px;margin:18px 0 8px;">
  🤝 Servicios subcontratados
</div>
<div style="font-size:10px;color:#666;font-style:italic;margin-bottom:6px;line-height:1.5;">
  Para procesos específicos, ${EMPRESA.razonSocial} subcontrata a proveedores externos especializados
  con quienes mantiene relación comercial vigente para garantizar la disponibilidad del servicio durante
  la ejecución del contrato.
</div>
<table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
  <thead>
    <tr style="background:#9B59B6;color:#fff;">
      <th style="padding:8px 10px;text-align:left;">Servicio / Equipo</th>
      <th style="padding:8px 10px;text-align:center;width:70px;">Cant.</th>
      <th style="padding:8px 10px;text-align:left;width:30%;">Especificación</th>
      <th style="padding:8px 10px;text-align:left;width:30%;">Propósito</th>
    </tr>
  </thead>
  <tbody>${subc.map(filaEq).join("")}</tbody>
</table>
` : ""}

<div style="font-size:10px;color:#666;line-height:1.6;margin-top:18px;padding:10px 12px;background:#FFF8E1;border:1px solid #FFE082;border-radius:6px;">
  <strong>Declaración:</strong> ${EMPRESA.representanteLegal.nombre}, en su calidad de
  ${EMPRESA.representanteLegal.cargo} de ${EMPRESA.razonSocial}, declara bajo juramento que la
  información contenida en el presente anexo es veraz y que el equipo y servicios listados están
  disponibles para la ejecución del objeto contractual.
</div>

${(() => {
  const cfg = (typeof window !== "undefined" ? window.__TALLER_CONFIG__ : null) || {};
  const firma = cfg.firma?.url;
  const sello = cfg.sello?.url;
  return `
  <div style="margin-top:48px;text-align:center;position:relative;">
    ${sello ? `<img src="${sello}" style="position:absolute;right:14%;top:-20px;max-width:90px;max-height:90px;opacity:0.85;" alt="sello" />` : ""}
    <div style="display:inline-block;text-align:center;max-width:340px;position:relative;">
      ${firma ? `<img src="${firma}" style="max-width:200px;max-height:60px;display:block;margin:0 auto -10px;position:relative;z-index:1;" alt="firma" />` : ""}
      <div style="border-top:1.5px solid #333;padding-top:8px;">
        <div style="font-size:12px;font-weight:800;color:#2C1654;">${EMPRESA.representanteLegal.nombre}</div>
        <div style="font-size:10px;color:#666;margin-top:2px;">${EMPRESA.representanteLegal.cargo} — ${EMPRESA.razonSocial}</div>
        <div style="font-size:10px;color:#666;">DUI: ${EMPRESA.representanteLegal.dui}</div>
      </div>
    </div>
  </div>`;
})()}

<div style="margin-top:24px;text-align:center;font-size:9px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:10px;">
  Anexo de capacidad · Cotización N° ${num} · ${fecha}
</div>
`;
})() : ""}
<script>
const _waMsg=${JSON.stringify(waMsg)};
const _pt=(function(){try{return window.parent.document.title;}catch(e){return '';}})();
function _print(){try{window.parent.document.title=document.title;}catch(e){}window.print();window.addEventListener('afterprint',function(){try{window.parent.document.title=_pt;}catch(e){}},{once:true});setTimeout(function(){try{window.parent.document.title=_pt;}catch(e){}},15000);}
</script>
</body></html>`);
  w.document.close();
}
export function imprimirRecibo(p) {
  const abonado = sumarAbonos(p);
  const saldo = parseFloat(p.precio || 0) - abonado;
  const tallas = resumenTallas(p);
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  // Helpers de dinero — alineación tabular (decimales cuadrados) estilo factura.
  const esCF = String(p.tipoDocumento || "").includes("Crédito Fiscal");
  const money = n => "$" + (parseFloat(n) || 0).toFixed(2);
  const NUM = "font-variant-numeric:tabular-nums;white-space:nowrap;";

  const tieneItems = (p.tallasItems || []).length > 0;
  // Tallas ordenadas de la MÁS PEQUEÑA a la MÁS GRANDE (rankTalla: numéricas
  // por número, luego XS<S<M<L<XL<XXL<XXXL).
  const itemsOrd = tieneItems
    ? [...p.tallasItems].sort((a, b) => rankTalla(a.talla) - rankTalla(b.talla))
    : [];
  const itemsTotal = itemsOrd.reduce((s, it) => s + (parseFloat(it.precio) || 0) * it.qty, 0);
  const itemsPzas = itemsOrd.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
  const itemsHTML = tieneItems ? `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px;">
      <thead><tr style="background:#2C1654;color:#fff;">
        <th style="padding:7px 12px;text-align:left;">Talla</th>
        <th style="padding:7px 12px;text-align:center;width:64px;">Cant.</th>
        <th style="padding:7px 12px;text-align:right;width:92px;">P. unit.</th>
        <th style="padding:7px 12px;text-align:right;width:104px;">Importe</th>
      </tr></thead>
      <tbody>
        ${itemsOrd.map((it, i) => {
    const tieneP = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0;
    const sub = tieneP ? parseFloat(it.precio) * it.qty : null;
    return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9f7fc"};border-bottom:1px solid #eee;">
            <td style="padding:7px 12px;">
              <span style="font-weight:800;color:#2C1654;">${it.talla || "—"}</span>
              ${it.spec ? `<span style="color:#999;font-size:11px;"> · ${it.spec}</span>` : ""}
            </td>
            <td style="padding:7px 12px;text-align:center;font-weight:700;${NUM}">${it.qty}</td>
            <td style="padding:7px 12px;text-align:right;color:#555;${NUM}">${tieneP ? money(it.precio) : "—"}</td>
            <td style="padding:7px 12px;text-align:right;font-weight:800;color:#2C1654;${NUM}">${sub != null ? money(sub) : "—"}</td>
          </tr>`;
  }).join("")}
        <tr style="border-top:2px solid #2C1654;">
          <td style="padding:8px 12px;font-weight:800;color:#2C1654;">Total</td>
          <td style="padding:8px 12px;text-align:center;font-weight:800;color:#2C1654;${NUM}">${itemsPzas}</td>
          <td></td>
          <td style="padding:8px 12px;text-align:right;font-weight:900;color:#2C1654;font-size:14px;${NUM}">${itemsTotal > 0 ? money(itemsTotal) : "—"}</td>
        </tr>
      </tbody>
    </table>` : tallas ? `<div style="margin-top:6px;font-size:14px;color:#E67E22;font-weight:700;">📦 ${tallas}</div>` : "";
  const waText = mensajeWA(p, true);
  const tituloRecibo = nombrePDF("Recibo", p.id, p.cliente);
  const w = nuevaVentanaImpresion(tituloRecibo);
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${tituloRecibo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 36px;font-size:13px;}
    @media print{body{padding:0;}.no-print{display:none!important;}@page{margin:14mm 15mm;size:A4;}thead{display:table-header-group}tr,img{page-break-inside:avoid}}
    table{border-collapse:collapse;width:100%;}
    .sec{font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #9B59B6;padding-bottom:4px;margin:16px 0 10px;}
  </style></head><body>

  <!-- Botones no-print -->
  <div class="no-print" style="margin-bottom:20px;">
    <div style="background:#EBF5FB;border:1px solid #BBDEFB;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#1A5276;">
      💾 <strong>Tip:</strong> tocá <strong>"📤 Enviar PDF por WA"</strong> → guardá el PDF cuando aparezca el diálogo → se abre WA automáticamente → adjuntá el PDF desde Descargas.
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
      <button id="wa-pdf-btn" onclick="enviarPorWA()" style="padding:11px 20px;border-radius:8px;border:none;background:#25D366;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">📤 Enviar PDF por WA</button>
      <button onclick="_print()" style="padding:11px 20px;border-radius:8px;border:none;background:#2C1654;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Guardar PDF</button>
      <button onclick="window.close()" style="padding:11px 14px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
    </div>
  </div>

  <!-- ENCABEZADO -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2C1654;padding-bottom:14px;margin-bottom:20px;">
    <div>
      <div style="font-size:24px;font-weight:900;color:#2C1654;font-family:Georgia,serif;">${TALLER}</div>
      <div style="font-size:12px;color:#888;margin-top:2px;">Comprobante de Pedido</div>
      <div style="font-size:11px;color:#aaa;margin-top:2px;">Fecha: ${fecha}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Recibo</div>
      <div style="font-size:34px;font-weight:900;color:#9B59B6;line-height:1;">N°${num}</div>
      <div style="margin-top:6px;display:inline-block;padding:3px 12px;border-radius:20px;font-weight:700;font-size:12px;background:${(EC[p.estatus] || {}).bg || "#eee"};color:${(EC[p.estatus] || {}).fg || "#333"};">${p.estatus}</div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;">
    <div style="background:#f8f4ff;border-radius:10px;padding:14px;border-left:4px solid #9B59B6;">
      <div style="font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
        ${p.tipoCliente === "escuela" ? "🏫 Institución" : p.tipoCliente === "empresa" ? "🏢 Empresa" : "👤 Cliente"}
      </div>
      <div style="font-size:17px;font-weight:800;color:#2C1654;">${p.cliente}</div>
      ${p.nombreContacto ? `<div style="font-size:12px;color:#555;margin-top:3px;">Contacto: <strong>${p.nombreContacto}</strong></div>` : ""}
      ${p.telefono ? `<div style="font-size:12px;color:#555;margin-top:2px;">📱 ${p.telefono}</div>` : ""}
    </div>
    <div style="background:#f0fff4;border-radius:10px;padding:14px;border-left:4px solid #27AE60;">
      <div style="font-size:10px;font-weight:800;color:#27AE60;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">📌 Fechas</div>
      <div style="font-size:13px;color:#C0392B;font-weight:800;">Entrega: ${p.fechaEntrega || "Por confirmar"}</div>
    </div>
  </div>

  <!-- DETALLE DEL PEDIDO -->
  <div class="sec">📋 Detalle del pedido</div>
  <div style="background:#fafafa;border:1.5px solid #eee;border-radius:10px;padding:14px;margin-bottom:16px;">
    <div style="font-size:16px;font-weight:800;color:#2C1654;margin-bottom:6px;">✂️ ${p.tipoPrenda || "(sin especificar)"}</div>
    ${p.tela || p.color ? `<div style="font-size:13px;color:#555;margin-bottom:4px;">🧵 ${[p.tela, p.color].filter(Boolean).join(" — ")}</div>` : ""}
    ${p.descripcion ? `<div style="font-size:12px;color:#666;margin-top:6px;padding:8px 10px;background:#fff;border-radius:6px;border-left:3px solid #9B59B6;">${p.descripcion}</div>` : ""}
    ${tablaPorPersonaHTML(p, "#2C1654", true, false) || itemsHTML}
  </div>

  <!-- TOTALES Y PAGO (estilo factura: bloque apilado, decimales alineados) -->
  ${p.precio ? (() => {
    const total = parseFloat(p.precio) || 0;
    const sub = esCF ? total / 1.13 : null;
    const iva = esCF ? total - sub : null;
    const line = (lbl, val, o = {}) => `
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding:${o.pad || "4px 0"};${o.borderTop ? "border-top:" + o.borderTop + ";" : ""}">
        <span style="color:${o.lblColor || "#666"};font-weight:${o.lblW || 600};font-size:${o.lblSize || "12px"};${o.upper ? "text-transform:uppercase;letter-spacing:.5px;" : ""}">${lbl}</span>
        <span style="text-align:right;font-weight:${o.valW || 700};font-size:${o.valSize || "13px"};color:${o.valColor || "#2C1654"};${NUM}">${val}</span>
      </div>`;
    return `
  <div class="sec">💰 Totales y pago</div>
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
    <div style="width:340px;max-width:100%;border:1.5px solid #e6e1ef;border-radius:12px;padding:14px 18px;background:#fbfafd;">
      ${esCF ? line("Subtotal", money(sub)) : ""}
      ${esCF ? line("IVA (13%)", money(iva)) : ""}
      ${line("Total", money(total), { borderTop: esCF ? "1px solid #e6e1ef" : "", pad: esCF ? "8px 0 4px" : "4px 0", lblW: 800, lblColor: "#2C1654", lblSize: "13px", valW: 800, valSize: "15px" })}
      ${line("Anticipo recibido", "−" + money(abonado), { valColor: "#27AE60" })}
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;margin-top:8px;padding-top:10px;border-top:2px solid #2C1654;">
        <span style="font-weight:900;color:#2C1654;text-transform:uppercase;letter-spacing:.5px;font-size:13px;">${saldo > 0 ? "Saldo pendiente" : "Estado"}</span>
        <span style="font-weight:900;font-size:23px;color:${saldo > 0 ? "#E74C3C" : "#27AE60"};${NUM}">${saldo > 0 ? money(saldo) : "✅ Pagado"}</span>
      </div>
    </div>
  </div>`;
  })() : ""}

  <!-- CRÉDITO FISCAL -->
  ${(p.tipoDocumento || "Consumidor Final") !== "Consumidor Final" ? `
  <div class="sec">🧾 Datos fiscales</div>
  <div style="background:#f0f8ff;border:1.5px solid #cce5ff;border-radius:10px;padding:14px;margin-bottom:16px;">
    ${(p.tipoDocumento || "").includes("pendiente") ? `<div style="color:#856404;font-weight:700;margin-bottom:8px;">⚠️ Pendiente recibir datos fiscales completos</div>` : ""}
    ${p.razonSocial ? `<div style="font-weight:700;font-size:14px;margin-bottom:4px;">${p.razonSocial}</div>` : ""}
    <div style="display:flex;gap:20px;font-size:12px;color:#555;">
      ${p.nit ? `<span>NIT: <strong>${p.nit}</strong></span>` : ""}
      ${p.nrc ? `<span>NRC: <strong>${p.nrc}</strong></span>` : ""}
    </div>
    ${p.dirFiscal ? `<div style="font-size:12px;color:#555;margin-top:4px;">${p.dirFiscal}</div>` : ""}
  </div>` : ""}

  <!-- FIRMAS -->
  <div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:32px;">
    <div style="text-align:center;">
      <div style="border-top:1.5px solid #333;padding-top:8px;margin-top:40px;">
        <div style="font-size:11px;font-weight:700;color:#333;">Entregado por — ${TALLER}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">Firma y nombre</div>
      </div>
    </div>
    <div style="text-align:center;">
      <div style="border-top:1.5px solid #333;padding-top:8px;margin-top:40px;">
        <div style="font-size:11px;font-weight:700;color:#333;">Recibido por — Cliente</div>
        <div style="font-size:12px;color:#555;margin-top:2px;">${p.cliente}</div>
      </div>
    </div>
  </div>

  <div style="margin-top:24px;text-align:center;font-size:10px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:12px;">
    ${TALLER} · Recibo N°${num} · Generado el ${fecha}
  </div>
  <script>
  const _waMsg=${JSON.stringify(waText)};
  const _pt=(function(){try{return window.parent.document.title;}catch(e){return '';}})();
  function _print(){
    try{window.parent.document.title=document.title;}catch(e){}
    window.print();
    window.addEventListener('afterprint',function(){try{window.parent.document.title=_pt;}catch(e){}},{once:true});
    setTimeout(function(){try{window.parent.document.title=_pt;}catch(e){}},15000);
  }
  async function enviarPorWA(){
    await window.parent.__shareWithPDF__(document.title,_waMsg);
  }
  </script>
  </body></html>`);
  w.document.close();
}
// Hoja de entrega — documento para llevar al entregar las prendas al
// cliente. El formato se decide solo, con el mismo criterio que
// itemsResumen en dominio.js:
//   - Pedido por LISTA (personas con prendas): una fila por prenda con
//     nombre, talla y firma de recibido individual; filas en blanco hasta
//     completar el total de piezas.
//   - Pedido por TALLAS (ej. uniformes escolares, sin nombres): tabla
//     resumen talla × cantidad con columna "cantidad recibida" para
//     verificar el conteo en la entrega — sin filas de firma individual.
// En ambos casos: sin precios (solo la nota de saldo pendiente si lo hay)
// y firmas ENTREGÓ / RECIBIÓ al pie.
export function imprimirEntrega(p) {
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const saldo = parseFloat(p.precio || 0) - sumarAbonos(p);

  // Filas con nombre: personas del pedido con sus prendas agrupadas.
  const personasConPrendas = (p.personas || []).filter(per =>
    Array.isArray(per.prendas) &&
    per.prendas.some(pr => pr.tipo || pr.talla)
  );
  const filasNombradas = personasConPrendas.map(per => {
    const grupos = agruparPrendas(per.prendas)
      .filter(g => g.tipo || g.talla)
      .sort((a, b) => {
        const ta = (a.tipo || "zzz").toLowerCase(), tb = (b.tipo || "zzz").toLowerCase();
        if (ta !== tb) return ta.localeCompare(tb);
        return rankTalla(a.talla) - rankTalla(b.talla);
      });
    const prendas = grupos
      .map(g => `${g.qty > 1 ? g.qty + "× " : ""}${[g.tipo, g.talla].filter(Boolean).join(" — ")}`)
      .join(" · ");
    const obs = grupos.map(g => g.spec).filter(Boolean).join(" · ");
    return { nombre: per.nombre || "", prendas, obs };
  });

  // Total de piezas: por items de talla si existen, si no por prendas.
  const totalPiezas =
    (p.tallasItems || []).reduce((s, it) => s + (parseInt(it.qty) || 0), 0) ||
    personasConPrendas.reduce((s, per) => s + per.prendas.filter(pr => pr.tipo || pr.talla).length, 0) ||
    filasNombradas.length;

  const esLista = personasConPrendas.length > 0;
  const th = `padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;`;
  const td = `border:1px solid #bbb;padding:0 8px;height:30px;`;

  let tablaHTML;
  if (esLista) {
    // Formato por LISTA: una fila por prenda, firma individual. Filas en
    // blanco hasta cubrir todas las piezas.
    const blancas = Math.max(0, totalPiezas - filasNombradas.length);
    const filas = [
      ...filasNombradas,
      ...Array.from({ length: blancas }, () => ({ nombre: "", prendas: "", obs: "" })),
    ];
    tablaHTML = `<table>
      <thead><tr style="background:#2C1654;color:#fff;">
        <th style="${th}text-align:center;width:26px;">N°</th>
        <th style="${th}text-align:left;">Nombre</th>
        <th style="${th}text-align:left;">Prenda / Talla</th>
        <th style="${th}text-align:left;">Observación</th>
        <th style="${th}text-align:left;width:150px;">Firma de recibido</th>
      </tr></thead>
      <tbody>${filas.map((f, i) => `
        <tr style="background:${i % 2 === 0 ? "#fff" : "#faf8fc"};">
          <td style="${td}width:26px;text-align:center;color:#888;font-size:11px;">${i + 1}</td>
          <td style="${td}font-weight:600;">${f.nombre}</td>
          <td style="${td}font-size:12px;">${f.prendas}</td>
          <td style="${td}font-size:11px;color:#666;font-style:italic;">${f.obs}</td>
          <td style="${td}width:150px;"></td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  } else {
    // Formato por TALLAS: resumen talla × cantidad con columna para anotar
    // lo recibido/contado en la entrega.
    const items = (p.tallasItems || [])
      .filter(it => (parseInt(it.qty) || 0) > 0)
      .sort((a, b) => rankTalla(a.talla) - rankTalla(b.talla));
    const filasT = items.length
      ? items.map((it, i) => `
        <tr style="background:${i % 2 === 0 ? "#fff" : "#faf8fc"};">
          <td style="${td}width:70px;text-align:center;font-weight:800;">${it.talla || ""}</td>
          <td style="${td}width:80px;text-align:center;font-weight:700;">${it.qty}</td>
          <td style="${td}font-size:12px;color:#555;">${it.spec || ""}</td>
          <td style="${td}width:110px;"></td>
          <td style="${td}width:130px;"></td>
        </tr>`).join("")
      : `<tr>
          <td style="${td}text-align:center;">—</td>
          <td style="${td}text-align:center;font-weight:700;">${totalPiezas}</td>
          <td style="${td}font-size:12px;color:#555;">${resumenTallas(p) || ""}</td>
          <td style="${td}width:110px;"></td>
          <td style="${td}width:130px;"></td>
        </tr>`;
    tablaHTML = `<table>
      <thead><tr style="background:#2C1654;color:#fff;">
        <th style="${th}text-align:center;width:70px;">Talla</th>
        <th style="${th}text-align:center;width:80px;">Cantidad</th>
        <th style="${th}text-align:left;">Especificación</th>
        <th style="${th}text-align:center;width:110px;">Cant. recibida</th>
        <th style="${th}text-align:left;width:130px;">Observación</th>
      </tr></thead>
      <tbody>${filasT}</tbody>
      <tfoot><tr style="background:#f0f0f0;font-weight:800;">
        <td style="${td}text-align:center;color:#2C1654;">TOTAL</td>
        <td style="${td}text-align:center;color:#2C1654;">${totalPiezas}</td>
        <td style="${td}"></td><td style="${td}"></td><td style="${td}"></td>
      </tr></tfoot>
    </table>`;
  }

  const waText = mensajeWA(p, true);
  const titulo = nombrePDF("Entrega", p.id, p.cliente);
  const w = nuevaVentanaImpresion(titulo);
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 36px;font-size:13px;}
    @media print{body{padding:0;}.no-print{display:none!important;}@page{margin:11mm 12mm;size:letter;}thead{display:table-header-group}tr,img{page-break-inside:avoid}}
    table{border-collapse:collapse;width:100%;}
  </style></head><body>

  <div class="no-print" style="margin-bottom:20px;">
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
      <button id="wa-pdf-btn" onclick="enviarPorWA()" style="padding:11px 20px;border-radius:8px;border:none;background:#25D366;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">📤 Enviar PDF por WA</button>
      <button onclick="_print()" style="padding:11px 20px;border-radius:8px;border:none;background:#2C1654;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir / PDF</button>
      <button onclick="window.close()" style="padding:11px 14px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
    </div>
  </div>

  <!-- ENCABEZADO -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2C1654;padding-bottom:12px;margin-bottom:14px;">
    <div>
      <div style="font-size:22px;font-weight:900;color:#2C1654;font-family:Georgia,serif;">${TALLER}</div>
      <div style="font-size:11px;color:#888;margin-top:2px;">${EMPRESA.razonSocial || ""}${EMPRESA.nit ? " · NIT " + EMPRESA.nit : ""}${EMPRESA.nrc ? " · NRC " + EMPRESA.nrc : ""}</div>
      <div style="font-size:11px;color:#aaa;">${EMPRESA.direccion || ""}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:900;color:#2C1654;">HOJA DE ENTREGA</div>
      <div style="font-size:12px;color:#555;margin-top:2px;">Pedido N°${num}<br>Fecha: ${fecha}</div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div style="display:flex;gap:24px;margin-bottom:10px;">
    <div style="flex:1;">
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:1px;">Cliente</div>
      <div style="font-size:14px;font-weight:800;color:#2C1654;">${p.cliente || ""}</div>
      ${p.nombreContacto ? `<div style="font-size:12px;color:#555;">Contacto: ${p.nombreContacto}</div>` : ""}
    </div>
    <div style="max-width:200px;">
      ${p.telefono ? `<div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:1px;">Teléfono</div><div style="font-size:12px;">${p.telefono}</div>` : ""}
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Cantidad entregada</div>
      <div style="font-size:13px;font-weight:800;">${totalPiezas} prenda(s)</div>
    </div>
  </div>

  <!-- PRODUCTO -->
  <div style="background:#f5f2f8;border:1px solid #ded5ea;border-radius:6px;padding:8px 12px;font-size:12px;margin-bottom:12px;line-height:1.5;">
    <strong>Producto:</strong> ${p.tipoPrenda || "(sin especificar)"}${p.tela || p.color ? ` — ${[p.tela, p.color].filter(Boolean).join(", ")}` : ""}${p.descripcion ? `. ${p.descripcion}` : ""}
  </div>

  <!-- TABLA DE ENTREGA -->
  ${tablaHTML}
  <div style="margin-top:8px;font-size:13px;font-weight:800;text-align:right;">Total entregado: ${totalPiezas} prenda(s)</div>

  <!-- OBSERVACIONES -->
  <div style="margin-top:12px;border:1.5px solid #2C1654;border-radius:6px;padding:9px 12px;font-size:11.5px;line-height:1.6;">
    <strong style="color:#2C1654;">Observaciones:</strong>
    ${esLista
      ? "Las prendas se entregan para verificación y prueba de talla por el cliente. Cualquier ajuste necesario será realizado por el taller."
      : "El cliente verifica cantidades por talla al recibir y anota lo contado en la columna correspondiente."}
    ${saldo > 0 ? `<strong>El pago del saldo pendiente queda sujeto a la conformidad del cliente.</strong>` : ""}
  </div>

  <!-- FIRMAS -->
  <div style="display:flex;gap:40px;margin-top:34px;">
    <div style="flex:1;text-align:center;">
      <div style="height:28px;"></div>
      <div style="border-top:1.5px solid #111;padding-top:5px;font-size:11px;line-height:1.8;">
        <strong>ENTREGÓ</strong> — ${TALLER}<br>Nombre: ______________________________<br>DUI: ____________________
      </div>
    </div>
    <div style="flex:1;text-align:center;">
      <div style="height:28px;"></div>
      <div style="border-top:1.5px solid #111;padding-top:5px;font-size:11px;line-height:1.8;">
        <strong>RECIBIÓ</strong> — ${p.cliente || "Cliente"}<br>Nombre: ______________________________<br>DUI: ____________________ &nbsp; Hora: ________
      </div>
    </div>
  </div>

  <script>
  const _waMsg=${JSON.stringify(waText)};
  const _pt=(function(){try{return window.parent.document.title;}catch(e){return '';}})();
  function _print(){
    try{window.parent.document.title=document.title;}catch(e){}
    window.print();
    window.addEventListener('afterprint',function(){try{window.parent.document.title=_pt;}catch(e){}},{once:true});
    setTimeout(function(){try{window.parent.document.title=_pt;}catch(e){}},15000);
  }
  async function enviarPorWA(){
    await window.parent.__shareWithPDF__(document.title,_waMsg);
  }
  </script>
  </body></html>`);
  w.document.close();
}

// ─────────────────────────────────────────────────────────────────────────
// HOJA DE CORTE
//
// La hoja de producción dice QUIÉN lleva cada prenda. Esta dice QUÉ PIEZAS
// hay que cortar y de qué tela: es la que se lleva a la mesa de corte.
//
// Las piezas salen de `taller_moldes`, no de una receta escrita a mano. Cada
// molde trae una `nota` que dice qué es realmente ("cuello redondo",
// "trasera", "NO es cuerpo: por forma y medidas es una manga larga"), porque
// el pack comprado numera las filas del PDF sin decir cuál es cuál. Eso ya se
// midió y se anotó una vez; acá solo se lee.
// ─────────────────────────────────────────────────────────────────────────

const sinTildes = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Del "Camiseta Intramuros 2026 (DTF)" del pedido al `prenda` de taller_moldes.
// Se busca cuál de las prendas con molde aparece nombrada en el tipo de prenda.
const prendaConMolde = (tipoPrenda, moldes) => {
  const t = sinTildes(tipoPrenda);
  const nombres = [...new Set(moldes.map(m => m.prenda).filter(Boolean))];
  return nombres.find(n => t.includes(sinTildes(n))) || "";
};

// Qué cortar para UNA prenda de esta talla. Devuelve [] si no hay molde.
// El pack trae varias variantes por talla (cuello redondo, cuello en V, manga
// larga); acá se elige la que corresponde a la camiseta de cuello redondo con
// manga, que es lo que se produce.
const recetaTalla = (moldes, prenda, talla) => {
  const dela = moldes.filter(m => m.prenda === prenda && m.talla === talla);
  if (!dela.length) return [];
  const busca = (re, enNota) => dela.find(m =>
    re.test(m.pieza || "") && (!enNota || enNota.test(sinTildes(m.nota || ""))));
  const partes = [
    ["Delantera", busca(/^cuerpo/, /cuello redondo/) || busca(/^delantera/), 1],
    ["Espalda",   busca(/^cuerpo/, /trasera/)        || busca(/^trasera/),   1],
    ["Manga",     busca(/^manga-/, /con manga/),                             2],
    ["Tira cuello", dela.find(m => /^tira-cuello/.test(m.pieza || "")),      1],
  ];
  return partes.filter(([, m]) => m).map(([rotulo, m, veces]) => ({
    rotulo, veces,
    medida: m.ancho_cm != null && m.alto_cm != null
      ? `${Math.round(m.ancho_cm)}×${Math.round(m.alto_cm)}` : "",
  }));
};

// Cuenta las personas del pedido por color y talla. Lo comparten la hoja de
// corte (piezas por molde) y la de cantidades (cuántas prendas): las dos
// necesitan exactamente el mismo conteo y no pueden discrepar.
//
// Devuelve { bloques: Map<color, Map<talla, n>>, nombresSinColor, aMedida }.
export function agruparColorTalla(p) {
  const personas = (p.personas || []).filter(per => per.talla || per.nombre);

  // La talla vive en dos sitios segun como se cargo el pedido: directa en la
  // persona (uniformes escolares) o dentro de cada prenda (cuando una persona
  // pide varias piezas). Si solo se mira `per.talla`, pedidos enteros salen
  // en blanco — le pasaba al 63 (INSO), 7 camisetas y la hoja vacia.
  const lineasDe = per => {
    const t = (per.talla || "").trim();
    if (t) return [{ talla: t, color: (per.color || "").trim() }];
    return (per.prendas || [])
      .map(pr => ({
        talla: (pr.talla || "").trim(),
        color: (per.color || "").trim() || colorDeItem(pr),
      }))
      .filter(l => l.talla);
  };

  const conColor = personas.some(per => lineasDe(per).some(l => l.color));
  const bloques = new Map();
  const nombresSinColor = [];
  const aMedida = [];
  for (const per of personas) {
    for (const linea of lineasDe(per)) {
      if (/medida/i.test(linea.talla)) { aMedida.push(per); continue; }
      const c = linea.color || (conColor ? "sin color" : (p.color || ""));
      // Si a alguien no se le sabe el color hay que poder identificarlo: un
      // bloque "sin color" con solo un numero no le dice nada a quien corta.
      if (c === "sin color" && per.nombre && !nombresSinColor.includes(per.nombre)) {
        nombresSinColor.push(per.nombre);
      }
      if (!bloques.has(c)) bloques.set(c, new Map());
      const t = bloques.get(c);
      t.set(linea.talla, (t.get(linea.talla) || 0) + 1);
    }
  }
  return { bloques, nombresSinColor, aMedida };
}

// Arma el documento completo. Se separa de imprimirCorte para poder probarla
// y previsualizarla sin abrir la app (la app pide login por codigo de correo).
export function hojaCorteHTML(p, moldesTodos = []) {
  const moldes = (moldesTodos || []).filter(m => !m.deleted_at);
  const prenda = prendaConMolde(p.tipoPrenda, moldes);

  const { bloques, nombresSinColor, aMedida } = agruparColorTalla(p);

  const th = "padding:7px 8px;border:1px solid #bbb;font-size:11px;font-weight:800;";
  const td = "padding:6px 8px;border:1px solid #ccc;font-size:12.5px;";
  const faltanMolde = new Set();

  const bloqueHTML = (color, tallas) => {
    const orden = [...tallas.keys()].sort((a, b) => rankTalla(a) - rankTalla(b));
    const prendasColor = orden.reduce((s, t) => s + tallas.get(t), 0);
    // Las columnas de pieza salen de la primera talla que tenga molde, para
    // que todas las filas del bloque compartan encabezado.
    const cols = orden.map(t => recetaTalla(moldes, prenda, t)).find(r => r.length) || [];
    const filas = orden.map(t => {
      const r = recetaTalla(moldes, prenda, t);
      const n = tallas.get(t);
      if (!r.length) faltanMolde.add(t);
      const celdas = cols.map(c => {
        const mia = r.find(x => x.rotulo === c.rotulo);
        if (!mia) return `<td style="${td}text-align:center;color:#C0392B;font-weight:800;">sin molde</td>`;
        return `<td style="${td}text-align:center;">
          <span style="font-size:17px;font-weight:900;color:#1A5276;">${n * mia.veces}</span>
          ${mia.medida ? `<div style="font-size:9px;color:#999;">${mia.medida} cm</div>` : ""}
        </td>`;
      }).join("");
      return `<tr>
        <td style="${td}text-align:center;font-size:19px;font-weight:900;color:#2C1654;">${t}</td>
        <td style="${td}text-align:center;font-size:17px;font-weight:900;">${n}</td>
        ${celdas}
        <td style="${td}text-align:center;font-size:20px;color:#bbb;">☐</td>
      </tr>`;
    }).join("");
    const totales = cols.map(c => {
      const n = orden.reduce((s, t) =>
        s + (recetaTalla(moldes, prenda, t).some(x => x.rotulo === c.rotulo) ? tallas.get(t) * c.veces : 0), 0);
      return `<td style="${td}text-align:center;font-weight:900;color:#2C1654;">${n}</td>`;
    }).join("");
    return `
    <div style="page-break-inside:avoid;margin-bottom:18px;">
      <div style="display:flex;align-items:baseline;gap:10px;border-bottom:2px solid #2C1654;padding-bottom:5px;margin-bottom:7px;">
        <span style="font-size:16px;font-weight:900;color:${color === "sin color" ? "#C0392B" : "#2C1654"};text-transform:uppercase;">${color || "Tela"}</span>
        <span style="font-size:13px;color:#666;">${prendasColor} prenda(s)</span>
        ${color === "sin color" && nombresSinColor.length
          ? `<span style="font-size:12px;color:#C0392B;font-weight:700;">${nombresSinColor.join(", ")} — falta decir de qué color va</span>` : ""}
      </div>
      <table>
        <thead><tr style="background:#2C1654;color:#fff;">
          <th style="${th}text-align:center;width:64px;">Talla</th>
          <th style="${th}text-align:center;width:70px;">Prendas</th>
          ${cols.map(c => `<th style="${th}text-align:center;">${c.rotulo}${c.veces > 1 ? ` <span style="font-weight:600;opacity:.75;">×${c.veces}</span>` : ""}</th>`).join("")}
          <th style="${th}text-align:center;width:60px;">Listo</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr style="background:#f0f0f0;font-weight:800;">
          <td style="${td}text-align:center;color:#2C1654;">TOTAL</td>
          <td style="${td}text-align:center;color:#2C1654;">${prendasColor}</td>
          ${totales}
          <td style="${td}"></td>
        </tr></tfoot>
      </table>
    </div>`;
  };

  const cuerpo = [...bloques.entries()].map(([c, t]) => bloqueHTML(c, t)).join("");
  const totalPrendas = [...bloques.values()].reduce((s, t) => s + [...t.values()].reduce((a, b) => a + b, 0), 0);

  const avisoMolde = faltanMolde.size ? `
    <div style="border:2px solid #C0392B;background:#fdf2f0;border-radius:6px;padding:9px 12px;margin-bottom:14px;font-size:12px;line-height:1.6;">
      <strong style="color:#C0392B;">Sin molde digitalizado:</strong>
      talla${faltanMolde.size > 1 ? "s" : ""} ${[...faltanMolde].join(", ")}.
      Hay que sacar el molde a mano antes de cortar esas prendas.
    </div>` : "";

  const aMedidaHTML = aMedida.length ? `
    <div style="border:1.5px solid #B7791F;background:#fffdf5;border-radius:6px;padding:9px 12px;margin-bottom:14px;font-size:12px;line-height:1.7;">
      <strong style="color:#B7791F;">A la medida — no entran en el cuadro de arriba:</strong><br>
      ${aMedida.map(per => `${per.nombre || "sin nombre"}${per.color ? ` (${per.color})` : ""}`).join(" · ")}.
      Cortar con las medidas del pedido.
    </div>` : "";

  const titulo = nombrePDF("Corte", p.id, p.cliente);
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 36px;font-size:13px;}
    @media print{body{padding:0;}.no-print{display:none!important;}@page{margin:11mm 12mm;size:letter;}thead{display:table-header-group}tr{page-break-inside:avoid}}
    table{border-collapse:collapse;width:100%;}
  </style></head><body>

  <div class="no-print" style="margin-bottom:20px;">
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
      <button onclick="_print()" style="padding:11px 20px;border-radius:8px;border:none;background:#2C1654;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir / PDF</button>
      <button onclick="window.parent.__closeFrame__()" style="padding:11px 14px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2C1654;padding-bottom:12px;margin-bottom:12px;">
    <div>
      <div style="font-size:22px;font-weight:900;color:#2C1654;font-family:Georgia,serif;">${TALLER}</div>
      <div style="font-size:12px;color:#555;margin-top:3px;">${p.cliente || ""}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:900;color:#2C1654;">HOJA DE CORTE</div>
      <div style="font-size:12px;color:#555;margin-top:2px;">Pedido N°${num}<br>Fecha: ${fecha}</div>
    </div>
  </div>

  <div style="background:#f5f2f8;border:1px solid #ded5ea;border-radius:6px;padding:8px 12px;font-size:12px;margin-bottom:12px;line-height:1.5;">
    <strong>${p.tipoPrenda || "(sin especificar)"}</strong>${p.tela ? ` — ${p.tela}` : ""} · <strong>${totalPrendas}</strong> prendas
    ${prenda ? ` · moldes de <strong>${prenda}</strong>` : ` · <span style="color:#C0392B;font-weight:800;">sin moldes digitalizados para este tipo de prenda</span>`}
  </div>

  ${avisoMolde}
  ${aMedidaHTML}
  ${cuerpo || `<div style="padding:20px;text-align:center;color:#888;">Este pedido no tiene personas con talla.</div>`}

  <div style="margin-top:16px;border:1.5px solid #2C1654;border-radius:6px;padding:10px 12px;font-size:11.5px;line-height:1.9;">
    <strong style="color:#2C1654;">Antes de cortar:</strong> verificar el sentido de la tela y que el tendido esté parejo.
    Las cantidades de arriba son piezas, no prendas.<br>
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

export async function imprimirCorte(p) {
  let moldes = [];
  try {
    moldes = (await dbMoldesLeer()) || [];
  } catch (e) {
    console.warn("No se pudieron leer los moldes:", e.message);
  }
  const w = nuevaVentanaImpresion(nombrePDF("Corte", p.id, p.cliente));
  w.document.write(hojaCorteHTML(p, moldes));
  w.document.close();
}

// Nombres de cliente y de persona entran a la hoja como HTML. El resto de
// este archivo interpola sin escapar; acá no, porque un apellido con "&" o
// unas comillas bastan para romper el documento.
const esc = s => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// ── Cuántas cortar ───────────────────────────────────────────────────────
// La hoja de corte responde "qué piezas saco de cada talla". Esta responde
// la pregunta anterior y más simple: "cuántas prendas van de cada talla y
// color". Un solo cuadro talla × color con números grandes.
//
// Por qué existiendo la de corte: ahí cada talla ocupa 5 columnas
// (prendas, delantera, espalda, manga, tira) que casi siempre repiten el
// mismo número, porque las piezas por prenda son fijas. Eso se lee mal en
// la mesa. Acá las piezas se dicen UNA vez, al pie, y el cuadro queda
// limpio para contar y marcar.
export function hojaCantidadesHTML(p, moldesTodos = []) {
  const moldes = (moldesTodos || []).filter(m => !m.deleted_at);
  const prenda = prendaConMolde(p.tipoPrenda, moldes);
  const { bloques, nombresSinColor, aMedida } = agruparColorTalla(p);

  // Columnas = colores (el "sin color" siempre al final, va marcado).
  const colores = [...bloques.keys()].sort((a, b) =>
    a === "sin color" ? 1 : b === "sin color" ? -1 : a.localeCompare(b));
  // Filas = todas las tallas que aparecen en cualquier color.
  const tallas = [...new Set(colores.flatMap(c => [...bloques.get(c).keys()]))]
    .sort((a, b) => rankTalla(a) - rankTalla(b));

  const n = (c, t) => bloques.get(c)?.get(t) || 0;
  const totalTalla = t => colores.reduce((s, c) => s + n(c, t), 0);
  const totalColor = c => tallas.reduce((s, t) => s + n(c, t), 0);
  const total = tallas.reduce((s, t) => s + totalTalla(t), 0);

  const esSin = c => c === "sin color";
  // Con un solo color la columna "Total" repetiria el mismo numero al lado:
  // dos veces el mismo dato es una invitacion a dudar de cual es el bueno.
  const unSoloColor = colores.length === 1;
  // El color va en una barra en el encabezado, no en el número: un 11 en
  // amarillo no se lee ni en pantalla ni fotocopiado. Los números, negros.
  const barraCol = c => esSin(c) ? "#C0392B" : (CSS_COLOR[sinTildes(c)] || "#9b9b9b");

  // La hoja se lee de pie en la mesa de corte, no sentado frente al monitor:
  // el cuadro ocupa toda la página y el número es lo más grande que hay.
  // Las filas se estiran para llenar el alto disponible (var --fh), así una
  // hoja de 4 tallas no queda con media página en blanco.
  const th = "padding:7px 4px;border:1px solid #2C1654;font-size:13px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.04em;";
  const td = "border:1px solid #b9b9b9;text-align:center;height:var(--fh);padding:2px;";

  const filas = tallas.map(t => `
    <tr>
      <td style="${td}background:#efeaf5;font-size:40px;font-weight:900;color:#2C1654;line-height:1;">${esc(t)}</td>
      ${colores.map(c => {
        const v = n(c, t);
        return `<td style="${td}font-size:52px;font-weight:900;line-height:1;color:${v ? (esSin(c) ? "#C0392B" : "#111") : "#dcdcdc"};">${v || "·"}</td>`;
      }).join("")}
      ${unSoloColor ? "" : `<td style="${td}font-size:36px;font-weight:800;color:#4a4a4a;background:#fafafa;line-height:1;">${totalTalla(t)}</td>`}
      <td style="${td}font-size:30px;color:#c8c8c8;line-height:1;">☐</td>
    </tr>`).join("");

  // Las piezas por prenda son fijas: se dicen una vez, no en cada fila.
  const receta = tallas.map(t => recetaTalla(moldes, prenda, t)).find(r => r.length) || [];
  const piezasLinea = receta.length
    ? `<div style="flex:1 1 340px;border:1.5px solid #2C1654;border-radius:6px;padding:9px 13px;font-size:13.5px;line-height:1.7;">
         <strong style="color:#2C1654;">Cada ${esc((prenda || "prenda").toLowerCase())} lleva:</strong>
         ${receta.map(r => `<span style="display:inline-block;margin-right:13px;white-space:nowrap;"><b style="font-size:18px;color:#1A5276;">${r.veces}</b> ${esc(r.rotulo.toLowerCase())}</span>`).join("")}
       </div>`
    : "";

  const faltanMolde = tallas.filter(t => !recetaTalla(moldes, prenda, t).length);
  const avisos = [
    faltanMolde.length
      ? `<strong style="color:#C0392B;">Sin molde:</strong> talla${faltanMolde.length > 1 ? "s" : ""} ${faltanMolde.join(", ")} — hay que sacar el molde a mano.`
      : "",
    nombresSinColor.length
      ? `<strong style="color:#C0392B;">Falta el color de:</strong> ${nombresSinColor.map(esc).join(", ")} — preguntar antes de cortar.`
      : "",
    aMedida.length
      ? `<strong style="color:#B7791F;">A la medida (aparte):</strong> ${aMedida.map(per => esc(per.nombre || "sin nombre") + (per.color ? ` (${esc(per.color)})` : "")).join(" · ")} — cortar con las medidas del pedido.`
      : "",
  ].filter(Boolean);

  const titulo = nombrePDF("Cantidades", p.id, p.cliente);
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    /* --fh: alto de fila. Se reparte el espacio libre entre las tallas que
       haya, para que el cuadro llene la hoja y no quede media pagina vacia. */
    :root{--fh:${Math.max(52, Math.min(96, Math.round(430 / Math.max(tallas.length, 1))))}px;}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:22px 26px;font-size:13px;
         display:flex;flex-direction:column;min-height:100vh;}
    @media print{
      body{padding:0;min-height:auto;}
      .no-print{display:none!important;}
      @page{margin:10mm 11mm;size:letter portrait;}
      thead{display:table-header-group}tr{page-break-inside:avoid}
    }
    table{border-collapse:collapse;width:100%;}
    .cab{display:flex;justify-content:space-between;align-items:baseline;
         border-bottom:3px solid #2C1654;padding-bottom:7px;margin-bottom:9px;gap:16px;}
  </style></head><body>

  <div class="no-print" style="margin-bottom:14px;">
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
      <button onclick="_print()" style="padding:11px 20px;border-radius:8px;border:none;background:#2C1654;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir / PDF</button>
      <button onclick="window.parent.__closeFrame__()" style="padding:11px 14px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
    </div>
  </div>

  <!-- Cabecera en una sola linea: el titulo grande a la izquierda porque es
       lo primero que se busca, y los datos del pedido chicos a la derecha. -->
  <div class="cab">
    <div>
      <div style="font-size:30px;font-weight:900;color:#2C1654;line-height:1;">CUÁNTAS CORTAR</div>
      <div style="font-size:14px;color:#333;margin-top:5px;">
        <strong>${esc(p.tipoPrenda || "(sin especificar)")}</strong>${p.tela ? ` — ${esc(p.tela)}` : ""}
        · <b style="font-size:17px;color:#2C1654;">${total}</b> por talla${
          // Sin esto el encabezado dice 56 y el pedido tiene 57: la diferencia
          // son los "a la medida", que no entran en el cuadro.
          aMedida.length ? ` <span style="color:#B7791F;">+ ${aMedida.length} a la medida = ${total + aMedida.length}</span>` : ""
        }
      </div>
    </div>
    <div style="text-align:right;font-size:12px;color:#555;white-space:nowrap;">
      <div style="font-weight:800;color:#2C1654;font-size:14px;">${esc(p.cliente || "")}</div>
      <div>Pedido N°${num} · ${fecha}</div>
    </div>
  </div>

  ${tallas.length ? `
  <table style="flex:1;">
    <thead><tr style="background:#2C1654;">
      <th style="${th}width:80px;">Talla</th>
      ${colores.map(c => `<th style="${th}">
        <div style="height:7px;background:${barraCol(c)};border-radius:3px;margin:0 auto 5px;width:72%;border:1px solid rgba(255,255,255,.45);"></div>
        ${esc(esSin(c) ? "⚠ sin color" : c)}
      </th>`).join("")}
      ${unSoloColor ? "" : `<th style="${th}width:80px;background:#463067;">Total</th>`}
      <th style="${th}width:64px;background:#463067;">Listo</th>
    </tr></thead>
    <tbody>${filas}</tbody>
    <tfoot><tr style="background:#2C1654;">
      <td style="${td}height:auto;padding:9px 4px;font-size:15px;font-weight:900;color:#fff;">TOTAL</td>
      ${colores.map(c => `<td style="${td}height:auto;padding:9px 4px;font-size:30px;font-weight:900;color:#fff;line-height:1;">${totalColor(c)}</td>`).join("")}
      ${unSoloColor ? "" : `<td style="${td}height:auto;padding:9px 4px;font-size:30px;font-weight:900;color:#fff;line-height:1;background:#463067;">${total}</td>`}
      <td style="${td}height:auto;background:#463067;"></td>
    </tr></tfoot>
  </table>` : `<div style="padding:20px;text-align:center;color:#888;">Este pedido no tiene personas con talla.</div>`}

  <div style="margin-top:10px;display:flex;gap:10px;align-items:stretch;flex-wrap:wrap;">
    ${piezasLinea}
    ${avisos.length ? `
    <div style="flex:1 1 300px;border:1.5px solid #E0C9A6;background:#fffdf7;border-radius:6px;padding:9px 13px;font-size:12.5px;line-height:1.75;">
      ${avisos.join("<br>")}
    </div>` : ""}
  </div>

  <div style="margin-top:9px;font-size:12px;color:#666;border-top:1px dashed #ccc;padding-top:8px;">
    Cortó: _________________________ &nbsp;&nbsp; Fecha: __________ &nbsp;&nbsp; Tela usada: ______ yardas
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

export async function imprimirCantidades(p) {
  let moldes = [];
  try {
    moldes = (await dbMoldesLeer()) || [];
  } catch (e) {
    console.warn("No se pudieron leer los moldes:", e.message);
  }
  const w = nuevaVentanaImpresion(nombrePDF("Cantidades", p.id, p.cliente));
  w.document.write(hojaCantidadesHTML(p, moldes));
  w.document.close();
}

// Detección de color en el spec de un item ("Rojo", "Azul · cuello V"...).
// Compartido entre la hoja de producción y la UI (para ofrecer al usuario
// elegir cómo agrupar al imprimir).
const COLOR_RE = /^(rojo|roja|verde|azul|amarillo|amarilla|blanco|blanca|negro|negra|gris|celeste|naranja|morado|morada|rosado|rosada|rosa|beige|caf[eé]|vino|turquesa|corinto|lila|fucsia)s?$/i;
const CSS_COLOR = { rojo: "#C0392B", roja: "#C0392B", verde: "#27AE60", azul: "#1A5276", amarillo: "#F1C40F", amarilla: "#F1C40F", blanco: "#ECF0F1", blanca: "#ECF0F1", negro: "#2C3E50", negra: "#2C3E50", gris: "#95A5A6", celeste: "#5DADE2", naranja: "#E67E22", morado: "#8E44AD", morada: "#8E44AD", rosado: "#F06292", rosada: "#F06292", rosa: "#F06292", beige: "#D7CCC8", "café": "#795548", cafe: "#795548", vino: "#7B241C", turquesa: "#1ABC9C", corinto: "#7B241C", lila: "#BB8FCE", fucsia: "#D81B60" };
const colorDeItem = it => {
  const pref = (it.spec || "").split("·")[0].trim();
  return COLOR_RE.test(pref) ? pref.replace(/s$/i, "") : "";
};
// true si el pedido tiene items de 2+ colores distintos — la UI lo usa para
// ofrecer el botón "imprimir agrupado por color".
export const tieneVariosColores = p =>
  new Set(itemsResumen(p).map(colorDeItem).filter(Boolean)).size > 1;

// Opciones de agrupación disponibles para la hoja de producción de un
// pedido, según la variedad real de sus items. La UI pinta un botón por
// opción; con una sola opción queda el botón clásico "Producción".
export const opcionesAgrupacion = p => {
  const items = itemsResumen(p);
  const distintos = f => new Set(items.map(f).filter(Boolean));
  const ops = [{ id: "talla", label: "Por talla" }];
  const colores = distintos(colorDeItem);
  if (colores.size > 1) ops.push({ id: "color", label: "Por color" });
  if (distintos(it => (it.tipo || "").trim()).size > 1) ops.push({ id: "tipo", label: "Por prenda" });
  // "Por detalle" agrupa por spec (nivel escolar, variante...). Solo se
  // ofrece si el spec no es en la práctica el color (evita duplicar botón).
  if (colores.size < 2 && distintos(it => (it.spec || "").trim()).size > 1) ops.push({ id: "spec", label: "Por detalle" });
  return ops;
};

// opts.agruparPor: 'talla' (clásico), 'color' (secciones por color) o
// 'auto' (por color solo si hay 2+ colores). El usuario elige desde el
// detalle del pedido; los call sites viejos siguen funcionando igual.
export async function imprimirProduccion(p, todosPedidos = [], opts = {}) {
  const num = String(p.id).padStart(4, "0");
  // QR con URL del pedido — el query param ?p=<id> se puede usar en
  // un futuro deeplink para abrir el detalle del pedido al instante.
  const baseURL = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const qrURL = baseURL ? `${baseURL}?p=${p.id}` : `Pedido #${num}`;
  let qrDataURL = "";
  try {
    qrDataURL = await QRCode.toDataURL(qrURL, { margin: 1, width: 110, color: { dark: "#1A5276", light: "#fff" } });
  } catch (e) {
    console.warn("QR falló:", e.message);
  }
  // Historial: últimos 3 pedidos del mismo cliente (excluyendo el actual
  // y los borrados). Ordenados por fecha descendente.
  const historial = (todosPedidos || [])
    .filter(x =>
      x.id !== p.id &&
      !x.deletedAt &&
      x.cliente &&
      x.cliente.trim().toLowerCase() === (p.cliente || "").trim().toLowerCase()
    )
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
    .slice(0, 3);
  const fecha = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const imagenes = (p.imagenes || []).filter(img => imgSrc(img));
  const meds = MEDIDAS_DEF.filter(m => (p.medidas || {})[m.k]);
  // Medidas anidadas por persona (ej. uniforme: pantalon + chaqueta + quepi)
  const PANT_MEDS = [
    ["cintura","Cintura"],["base","Base"],["muslo","Muslo"],["largo","Largo"],
    ["rodilla","Rodilla"],["ruedo","Ruedo"],["tiroD","Tiro D."],["tiroT","Tiro T."],
  ];
  const CHAQ_MEDS = [
    ["hombro","Hombro"],["pecho","Pecho"],["cintura","Cintura"],["cadera","Cadera"],
    ["largo","Largo"],["sisa","Sisa"],["manga","Manga"],["puno","Puño"],
    ["cuello","Cuello"],["escote","Escote"],["costado","Costado"],["alto","Alto"],
    ["talle","Talle"],["sep","Sep."],["ctcodo","Ct.Codo"],["altcodo","Alt.Codo"],
  ];
  const medsNestedHTML = (() => {
    const pers = (p.personas || []).filter(per =>
      per.medidas && (per.medidas.pantalon || per.medidas.chaqueta || per.medidas.quepi)
    );
    if (!pers.length) return "";
    const renderGrid = (obj, fields) => {
      if (!obj) return "";
      const vals = fields.filter(([k]) => obj[k] != null && obj[k] !== "");
      if (!vals.length) return "";
      return `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px 8px;">${vals.map(([k, l]) =>
        `<div style="display:flex;gap:3px;align-items:baseline;white-space:nowrap;">
          <span style="font-size:8.5px;color:#999;">${l}:</span>
          <span style="font-size:12px;font-weight:800;color:#1A5276;">${obj[k]}</span>
        </div>`).join("")}</div>`;
    };
    const cards = pers.map((per, i) => {
      const pant = renderGrid(per.medidas.pantalon, PANT_MEDS);
      const chaq = renderGrid(per.medidas.chaqueta, CHAQ_MEDS);
      const quep = per.medidas.quepi?.contornoCabeza != null
        ? `<span style="font-size:12px;font-weight:800;color:#1A5276;">Contorno: ${per.medidas.quepi.contornoCabeza} cm</span>` : "";
      const abonoBadge = per.medidas.abono != null
        ? `<span style="font-size:9px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:4px;padding:1px 5px;color:#2e7d32;font-weight:700;">Abono $${per.medidas.abono}</span>` : "";
      return `<div style="border:1px solid #d0d8e4;border-radius:8px;padding:9px 11px;margin-bottom:8px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid #eee;">
          <div>
            <span style="font-size:12px;font-weight:900;color:#2C1654;">${i + 1}. ${per.nombre || "Sin nombre"}</span>
            ${per.talla ? `<span style="font-size:11px;font-weight:800;background:#1A5276;color:#fff;border-radius:5px;padding:2px 8px;margin-left:6px;">Talla ${per.talla}</span>` : `<span style="font-size:9px;font-weight:800;background:#fff3cd;color:#856404;border:1px solid #ffe08a;border-radius:5px;padding:1px 6px;margin-left:6px;">sin talla</span>`}
            ${per.cargo ? `<span style="font-size:10px;color:#888;margin-left:6px;">${per.cargo}</span>` : ""}
            ${per.gafete ? `<span style="font-size:9px;background:#eef;border-radius:4px;padding:1px 5px;margin-left:4px;color:#555;font-weight:700;">Gafete ${per.gafete}</span>` : ""}
          </div>
          ${abonoBadge}
        </div>
        ${pant ? `<div style="margin-bottom:5px;"><span style="font-size:9px;font-weight:800;color:#7D6608;text-transform:uppercase;letter-spacing:.5px;margin-right:6px;">Pantalón</span>${pant}</div>` : ""}
        ${chaq ? `<div style="margin-bottom:5px;"><span style="font-size:9px;font-weight:800;color:#6C3483;text-transform:uppercase;letter-spacing:.5px;margin-right:6px;">Chaqueta</span>${chaq}</div>` : ""}
        ${quep ? `<div><span style="font-size:9px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:.5px;margin-right:6px;">Quepi</span>${quep}</div>` : ""}
      </div>`;
    }).join("");
    return `
      <div style="font-size:11px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:1px;margin-top:14px;margin-bottom:6px;">
        📐 Medidas individuales
      </div>
      ${cards}`;
  })();
  // itemsResumen agrupa por tipo+talla+precio+spec — soporta los 2 modos
  // (lista y tallas) y devuelve items con tipo, lo que necesitamos para
  // la tabla de producción.
  const items = itemsResumen(p);
  const totalPzas = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
  const tallasTxt = resumenTallas(p);
  const medsHTML = meds.length ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #1A5276;padding-bottom:3px;margin-bottom:8px;">📐 Medidas</div>
      <table style="border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        ${(() => {
    const rows = [];
    for (let i = 0; i < meds.length; i += 4) {
      rows.push(`<tr>${meds.slice(i, i + 4).map((m, j) => `<td style="padding:6px 9px;border:1px solid #ddd;font-size:11px;background:${j % 2 === 0 ? "#f9f9f9" : "#fff"};color:#888;font-weight:700;">${m.l}</td><td style="padding:6px 10px;border:1px solid #ddd;font-size:13px;font-weight:800;color:#1A5276;">${p.medidas[m.k]} cm</td>`).join("")}</tr>`);
    }
    return rows.join("");
  })()}
      </table>
    </div>` : "";
  // Tabla principal pensada para el taller (lectura mínima): ordenada y
  // AGRUPADA por talla (la talla se imprime una sola vez, gigante, con el
  // total de esa talla), icono por nivel escolar, y una casilla por pieza
  // para ir tachando con lapicero lo que va saliendo — contar casillas es
  // más fácil que leer números.
  const ordenados = [...items].sort(
    (a, b) =>
      rankTalla(a.talla) - rankTalla(b.talla) ||
      (a.tipo || "").localeCompare(b.tipo || "") ||
      (a.spec || "").localeCompare(b.spec || "")
  );
  // Secciones: encabezado con subtotal y adentro agrupado por talla — el
  // taller termina una sección completa antes de pasar a la siguiente.
  // opts.agruparPor: 'talla' (sin secciones), 'color', 'tipo' (prenda),
  // 'spec' (detalle/nivel) o 'auto' (por color solo si hay 2+ colores).
  const coloresDistintos = [...new Set(ordenados.map(colorDeItem).filter(Boolean))];
  const modo = opts.agruparPor || "auto";
  const KEY_FNS = {
    color: colorDeItem,
    tipo: it => (it.tipo || "").trim(),
    spec: it => (it.spec || "").trim(),
  };
  const keyFn =
    modo === "talla" ? null :
    KEY_FNS[modo] || (coloresDistintos.length > 1 ? colorDeItem : null);
  const bloques = keyFn
    ? [...new Set(ordenados.map(keyFn))].map(k => ({
        nombre: k,
        items: ordenados.filter(it => keyFn(it) === k),
      }))
    : [{ nombre: "", items: ordenados }];
  const porGrupo = !!keyFn;
  const agruparPorTalla = arr => {
    const gs = [];
    for (const it of arr) {
      const talla = it.talla || "S/T";
      const ult = gs[gs.length - 1];
      if (ult && ult.talla === talla) ult.items.push(it);
      else gs.push({ talla, items: [it] });
    }
    return gs;
  };
  const iconoSpec = s =>
    /parvulari/i.test(s || "") ? "🧒 " :
    /b[aá]sica/i.test(s || "") ? "🎒 " :
    /bachillerato|t[eé]cnic/i.test(s || "") ? "🎓 " : "";
  const caja = lado =>
    `<span style="display:inline-block;width:${lado}px;height:${lado}px;border:1.5px solid #888;border-radius:3px;margin-right:5px;vertical-align:middle;flex:none;"></span>`;
  const casillas = (n, grande = false) => {
    const q = parseInt(n) || 0;
    if (q <= 0 || q > 40) return "";
    return `<span style="line-height:1.9;">${caja(grande ? 19 : 14).repeat(q)}</span>`;
  };
  // Si el pedido se registró por lista, cada prenda tiene dueño. Poner el
  // nombre al lado de su casilla aprovecha el espacio que sobraba en la fila
  // y hace la hoja mas util: se tacha POR NIÑO, no contando cuadritos. Solo
  // se usa cuando los nombres encontrados son exactamente los de esa fila;
  // si no cuadran se vuelve a las casillas sueltas, que nunca mienten.
  const nombresDeItem = it => {
    const dueños = [];
    for (const per of p.personas || []) {
      for (const pr of per.prendas || []) {
        if ((pr.talla || "") === (it.talla || "") &&
            (pr.spec || "") === (it.spec || "") &&
            (pr.tipo || "") === (it.tipo || "")) dueños.push(per.nombre || "");
      }
    }
    return dueños.length === (parseInt(it.qty) || 0) && dueños.every(Boolean) ? dueños : null;
  };
  const casillasConNombre = it => {
    const nombres = nombresDeItem(it);
    if (!nombres) return casillas(it.qty, true);
    return `<div style="display:flex;flex-wrap:wrap;gap:4px 16px;">${nombres.map(n =>
      `<span style="display:inline-flex;align-items:center;font-size:13px;font-weight:700;color:#333;white-space:nowrap;">${caja(17)}${n}</span>`
    ).join("")}</div>`;
  };
  // La columna "De qué es" repetía la misma frase en todas las filas del
  // bloque ("Camiseta Intramuros — Amarillo", cinco veces seguidas) y dejaba
  // media fila en blanco, con las casillas apretadas en un rincón. Si dentro
  // de cada bloque la descripción no cambia, se dice UNA vez en el encabezado
  // y la fila queda para lo único que el taller usa ahí: tachar.
  const descDe = it => `${iconoSpec(it.spec)}${[it.tipo, it.spec].filter(Boolean).join(" — ") || "—"}`;
  const descBloque = b => {
    const s = new Set(b.items.map(descDe));
    return s.size === 1 ? [...s][0] : null;
  };
  const colapsarDesc = bloques.every(b => descBloque(b) !== null);
  const NCOLS = colapsarDesc ? 3 : 4;
  // Sin bloques no hay encabezado donde ponerla, así que va sobre la tabla.
  const descGlobal = colapsarDesc && !porGrupo ? descBloque(bloques[0]) : null;
  const tablaPrendasHTML = ordenados.length ? `
    ${descGlobal ? `<div style="font-size:14px;font-weight:800;color:#333;margin-bottom:6px;">${descGlobal}</div>` : ""}
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:2px solid #1A5276;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#1A5276;color:#fff;">
        <th style="padding:9px 12px;text-align:center;width:90px;">TALLA</th>
        <th style="padding:9px 12px;text-align:center;width:70px;">CUÁNTOS</th>
        ${colapsarDesc ? "" : `<th style="padding:9px 12px;text-align:left;">De qué es</th>`}
        <th style="padding:9px 12px;text-align:left;${colapsarDesc ? "" : "width:180px;"}">Tache al terminar ✔</th>
      </tr></thead>
      <tbody>
        ${bloques.map(b => {
          const grupos = agruparPorTalla(b.items);
          const subtotal = b.items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
          const css = CSS_COLOR[(b.nombre || "").toLowerCase()];
          const dot = css ? `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;background:${css};border:1px solid rgba(0,0,0,.25);vertical-align:middle;margin-right:8px;"></span>` : "";
          const header = porGrupo ? `
            <tr style="background:#EAF2F8;">
              <td colspan="${NCOLS}" style="padding:9px 12px;border-top:3px solid #1A5276;">
                ${dot}<span style="font-size:17px;font-weight:900;color:#1A5276;text-transform:uppercase;letter-spacing:.5px;">${b.nombre || "Sin especificar"}</span>
                <span style="font-size:11px;font-weight:800;color:#888;margin-left:9px;">${subtotal} piezas</span>
                ${colapsarDesc ? `<span style="font-size:13px;font-weight:700;color:#555;margin-left:12px;">${descBloque(b)}</span>` : ""}
              </td>
            </tr>` : "";
          return header + grupos.map((g, gi) => {
            const totalTalla = g.items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
            const bg = gi % 2 === 0 ? "#fff" : "#f4f9f4";
            return g.items.map((it, i) => `
            <tr style="background:${bg};${i === 0 ? "border-top:3px solid #1A5276;" : "border-top:1px dashed #ccd;"}">
              ${i === 0 ? `<td rowspan="${g.items.length}" style="padding:10px 12px;text-align:center;vertical-align:middle;border-right:2px solid #1A5276;">
                <div style="font-weight:900;font-size:30px;color:#E67E22;line-height:1;">${g.talla}</div>
                ${g.items.length > 1 ? `<div style="font-size:10px;font-weight:800;color:#888;margin-top:3px;">${totalTalla} en total</div>` : ""}
              </td>` : ""}
              <td style="padding:10px 12px;text-align:center;font-weight:900;font-size:24px;color:#1A5276;">${it.qty}</td>
              ${colapsarDesc ? "" : `<td style="padding:10px 12px;color:#333;font-size:14px;font-weight:700;">${descDe(it)}</td>`}
              <td style="padding:10px 12px;">${colapsarDesc ? casillasConNombre(it) : casillas(it.qty)}</td>
            </tr>`).join("");
          }).join("");
        }).join("")}
        <tr style="background:#1A5276;color:#fff;font-weight:800;">
          <td colspan="2" style="padding:11px 12px;text-align:right;font-size:14px;">TOTAL</td>
          <td colspan="${NCOLS - 2}" style="padding:11px 12px;font-size:22px;">${totalPzas} piezas</td>
        </tr>
      </tbody>
    </table>` : tallasTxt ? `<div style="font-size:14px;color:#E67E22;font-weight:700;margin-top:6px;">📦 ${tallasTxt}</div>` : `<div style="color:#aaa;font-style:italic;">(sin prendas especificadas)</div>`;
  const imgHTML = imagenes.length ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:10px;font-weight:800;color:#E91E8C;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #E91E8C;padding-bottom:4px;margin-bottom:10px;">📸 Imágenes de referencia</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${imagenes.map(img => `<div style="text-align:center;"><img src="${imgSrc(img)}" style="max-width:160px;max-height:160px;border-radius:8px;border:1.5px solid #e0e0e0;display:block;"/><div style="font-size:9px;color:#aaa;margin-top:3px;">${img.nombre || ""}</div></div>`).join("")}
      </div>
    </div>` : "";
  const diagramaURL = diagramaCamisaPNG(p.disenos, { ancho: 280, alto: 320 });
  const tituloProd = nombrePDF("Produccion", p.id, p.cliente);
  const w = nuevaVentanaImpresion(tituloProd);
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${tituloProd}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:24px 30px;font-size:13px;}
    @media print{body{padding:0;}.no-print{display:none!important;}@page{margin:11mm 12mm;size:A4;}thead{display:table-header-group}tr,img{page-break-inside:avoid}}
    table{border-collapse:collapse;width:100%;}
    .sec{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid currentColor;padding-bottom:3px;margin:14px 0 9px;}
    .ficha{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;}
    .campo{display:flex;flex-direction:column;padding:8px 10px;background:#f9f9f9;border-radius:7px;border-left:3px solid #ddd;}
    .campo-lbl{font-size:9px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;}
    .campo-val{font-size:13px;font-weight:700;color:#222;}
    .urgente{background:#FFF5F5;border-left-color:#E74C3C;}
    .urgente .campo-val{color:#C0392B;}
    .ok{border-left-color:#27AE60;}
    .ok .campo-val{color:#155724;}
  </style></head><body>

  <div class="no-print" style="margin-bottom:16px;">
    <div style="background:#EBF5FB;border:1px solid #BBDEFB;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#1A5276;">
      💾 <strong>Tip:</strong> al imprimir, en "Destino" elegí <strong>"Guardar como PDF"</strong>. El archivo se llamará <strong>${tituloProd}.pdf</strong>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button onclick="_print()" style="padding:11px 24px;border-radius:8px;border:none;background:#1A5276;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Guardar PDF</button>
      <button onclick="window.close()" style="padding:11px 16px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
    </div>
  </div>

  <!-- ENCABEZADO: taller + N° + entrega + QR -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1A5276;padding-bottom:10px;margin-bottom:14px;gap:14px;">
    <div style="flex:1;">
      <div style="font-size:18px;font-weight:900;color:#1A5276;font-family:Georgia,serif;line-height:1;">${TALLER}</div>
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-top:3px;">Hoja de Producción · ${fecha}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:34px;font-weight:900;color:#1A5276;line-height:1;">N°${num}</div>
      <div style="margin-top:4px;display:inline-block;padding:4px 12px;border-radius:20px;background:#FFF5E6;border:1.5px solid #E67E22;font-size:13px;font-weight:800;color:#E67E22;">
        📌 Entregar: ${p.fechaEntrega || "⚠️ Sin fecha"}
      </div>
    </div>
    ${qrDataURL ? `<div style="text-align:center;flex-shrink:0;">
      <img src="${qrDataURL}" style="width:80px;height:80px;display:block;" alt="QR pedido" />
      <div style="font-size:8px;color:#aaa;margin-top:2px;letter-spacing:.5px;">ESCANEAR</div>
    </div>` : ""}
  </div>

  <!-- CLIENTE (una sola tarjeta amplia) -->
  <div style="background:#f8f4ff;border-radius:10px;padding:12px 14px;border-left:4px solid #9B59B6;margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <div style="font-size:17px;font-weight:800;color:#2C1654;">👤 ${p.cliente}</div>
      ${p.telefono ? `<div style="font-size:12px;color:#555;">📱 ${p.telefono}</div>` : ""}
    </div>
    ${p.nombreContacto ? `<div style="font-size:12px;color:#555;margin-top:2px;">Contacto: <strong>${p.nombreContacto}</strong></div>` : ""}
  </div>

  <!-- FICHA DE PRODUCCIÓN compacta (todo en línea horizontal de chips) -->
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
    <div style="flex:1;min-width:140px;padding:8px 10px;background:${p.costurera && p.costurera !== "(Sin asignar)" ? "#E8F5E9" : "#FFF5E6"};border-radius:8px;border-left:3px solid ${p.costurera && p.costurera !== "(Sin asignar)" ? "#27AE60" : "#E67E22"};">
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.4px;">✂️ Costurera</div>
      <div style="font-size:13px;font-weight:700;color:#222;">${p.costurera || "⚠️ Sin asignar"}</div>
    </div>
    ${p.tela || p.color ? `<div style="flex:1;min-width:140px;padding:8px 10px;background:${p.telaComprada ? "#E8F5E9" : "#FFF5E6"};border-radius:8px;border-left:3px solid ${p.telaComprada ? "#27AE60" : "#E67E22"};">
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.4px;">🧵 Tela ${p.telaComprada ? "(comprada)" : "(pend.)"}</div>
      <div style="font-size:13px;font-weight:700;color:#222;">${[p.tela, p.color].filter(Boolean).join(" — ") || "—"}</div>
    </div>` : ""}
    ${p.tieneBordado ? `<div style="flex:1;min-width:140px;padding:8px 10px;background:#F3E5F5;border-radius:8px;border-left:3px solid #9B59B6;">
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.4px;">🪡 Bordado</div>
      <div style="font-size:13px;font-weight:700;color:#6B2D8B;">SÍ${p.estatusDiseno ? ` — ${p.estatusDiseno}` : ""}</div>
    </div>` : ""}
  </div>

  <!-- TIMELINE DE FECHAS -->
  <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#FAFAFA;border-radius:8px;margin-bottom:14px;font-size:11px;">
    <div style="text-align:center;flex:1;">
      <div style="color:#888;font-weight:800;text-transform:uppercase;letter-spacing:.4px;font-size:8px;">📅 Pedido</div>
      <div style="font-weight:700;color:#222;">${p.fecha || "—"}</div>
    </div>
    <div style="color:#ccc;font-size:14px;">→</div>
    <div style="text-align:center;flex:1;">
      <div style="color:#888;font-weight:800;text-transform:uppercase;letter-spacing:.4px;font-size:8px;">🛠️ Inicio</div>
      <div style="font-weight:700;color:${p.fechaInicio ? "#222" : "#bbb"};">${p.fechaInicio || "—"}</div>
    </div>
    <div style="color:#ccc;font-size:14px;">→</div>
    <div style="text-align:center;flex:1;">
      <div style="color:#888;font-weight:800;text-transform:uppercase;letter-spacing:.4px;font-size:8px;">📌 Entrega</div>
      <div style="font-weight:800;color:#E67E22;">${p.fechaEntrega || "—"}</div>
    </div>
  </div>

  <!-- PRENDAS A CONFECCIONAR — el bloque más prominente -->
  <div style="font-size:11px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
    📋 Prendas a confeccionar${p.tipoPrenda ? ` — ${p.tipoPrenda}` : ""}
  </div>
  ${tablaPrendasHTML}

  <!-- DETALLE POR PERSONA (solo modo lista con personas) -->
  ${p.personas && p.personas.length ? `
    <div style="font-size:11px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:1px;margin-top:14px;margin-bottom:6px;">
      👥 Detalle por persona
    </div>
    ${tablaPorPersonaHTML(p, "#1A5276", false, true)}
  ` : ""}

  <!-- MEDIDAS INDIVIDUALES POR PERSONA (uniforme multi-prenda) -->
  ${medsNestedHTML}

  <!-- DESCRIPCIÓN E INSTRUCCIONES (fusionada con notas) -->
  ${p.descripcion || p.notas ? `
  <div class="sec" style="color:#6C3483;">📝 Descripción e instrucciones</div>
  <div style="background:#F9F0FF;border:1.5px solid #D7BDE2;border-radius:9px;padding:13px;margin-bottom:14px;font-size:13px;color:#4A235A;line-height:1.6;">
    ${p.descripcion ? `<div>${p.descripcion}</div>` : ""}
    ${p.descripcion && p.notas ? `<div style="border-top:1px dashed #D7BDE2;margin:8px 0;"></div>` : ""}
    ${p.notas ? `<div>${p.notas}</div>` : ""}
  </div>` : ""}

  <!-- Especificaciones de diseño: removidas de la hoja de producción (van en el módulo de bordado) -->

  <!-- MEDIDAS -->
  ${medsHTML}

  <!-- IMÁGENES -->
  ${imgHTML}

  <!-- HISTORIAL DEL CLIENTE -->
  ${historial.length ? `
    <div style="margin-top:14px;padding:10px 12px;background:#FAFAFA;border:1px dashed #ccc;border-radius:8px;">
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">
        📜 Pedidos anteriores de ${p.cliente}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        ${historial.map(h => `<tr>
          <td style="padding:3px 6px;color:#9B59B6;font-weight:700;white-space:nowrap;">N°${String(h.id).padStart(4, "0")}</td>
          <td style="padding:3px 6px;color:#666;white-space:nowrap;">${h.fecha || "—"}</td>
          <td style="padding:3px 6px;color:#444;">${h.tipoPrenda || "—"}</td>
          <td style="padding:3px 6px;text-align:right;color:#888;font-size:10px;">${h.estatus || ""}</td>
        </tr>`).join("")}
      </table>
    </div>` : ""}

  <!-- ESPACIO PARA ANOTAR A MANO -->
  <div style="margin-top:14px;">
    <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">
      ✏️ Anotaciones / correcciones durante la producción
    </div>
    <div style="border:1px solid #e0e0e0;border-radius:8px;padding:10px 12px;">
      ${Array.from({ length: 6 }, () => `<div style="height:22px;border-bottom:1px solid #f0f0f0;"></div>`).join("")}
    </div>
  </div>
  <script>
  const _pt=(function(){try{return window.parent.document.title;}catch(e){return '';}})();
  function _print(){try{window.parent.document.title=document.title;}catch(e){}window.print();window.addEventListener('afterprint',function(){try{window.parent.document.title=_pt;}catch(e){}},{once:true});setTimeout(function(){try{window.parent.document.title=_pt;}catch(e){}},15000);}
  </script>
  </body></html>`);
  w.document.close();
}
export function exportarExcelMes(pedidos, bordados, cuellos, periodo) {
  const pM = v => {
    const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const todos = [...pedidos.filter(p => !p.esCotizacion).map(p => ({
    ID: "CONF-" + String(p.id).padStart(3, "0"),
    Módulo: "Confección",
    Cliente: p.cliente || "",
    Prenda: p.tipoPrenda || "",
    Telas: p.tela || "",
    "Precio ($)": pM(p.precio),
    "Abonado ($)": (p.abonos || []).length > 0 ? p.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(p.anticipo),
    "Saldo ($)": Math.max(0, pM(p.precio) - ((p.abonos || []).length > 0 ? p.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(p.anticipo))),
    Estatus: p.estatus || "",
    "Fecha pedido": p.fecha || "",
    "Fecha entrega": p.fechaEntrega || "",
    Costurera: p.costurera || "",
    Notas: p.notas || ""
  })), ...bordados.map(b => ({
    ID: "BORD-" + String(b.id).padStart(3, "0"),
    Módulo: "Bordados",
    Cliente: b.cliente || "",
    Prenda: b.diseño || b.soporte || "",
    Telas: b.soporte || "",
    "Precio ($)": pM(b.precioT),
    "Abonado ($)": (b.abonos || []).length > 0 ? b.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(b.anticipo),
    "Saldo ($)": Math.max(0, pM(b.precioT) - ((b.abonos || []).length > 0 ? b.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(b.anticipo))),
    Estatus: b.estatus || "",
    "Fecha pedido": b.fecha || "",
    "Fecha entrega": b.fechaEntrega || "",
    Costurera: "",
    Notas: b.notas || ""
  })), ...cuellos.map(cu => ({
    ID: "CUEL-" + String(cu.id).padStart(3, "0"),
    Módulo: "Cuellos",
    Cliente: cu.cliente || "",
    Prenda: [cu.cuello && cu.cuello.activa ? "Cuello" : "", cu.puno && cu.puno.activa ? "Puño" : "", cu.banda && cu.banda.activa ? "Banda" : ""].filter(Boolean).join("+"),
    Telas: cu.material || "",
    "Precio ($)": pM(cu.precioT),
    "Abonado ($)": (cu.abonos || []).length > 0 ? cu.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(cu.anticipo),
    "Saldo ($)": Math.max(0, pM(cu.precioT) - ((cu.abonos || []).length > 0 ? cu.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(cu.anticipo))),
    Estatus: cu.estatus || "",
    "Fecha pedido": cu.fecha || "",
    "Fecha entrega": cu.fechaEntrega || "",
    Costurera: "",
    Notas: cu.notas || ""
  }))].filter(p => p.Estatus !== "Cancelado");
  const resumenMod = ["Confección", "Bordados", "Cuellos"].map(mod => {
    const lst = todos.filter(p => p["Módulo"] === mod);
    const facturado = lst.reduce((s, p) => s + p["Precio ($)"], 0);
    const cobrado = lst.reduce((s, p) => s + p["Abonado ($)"], 0);
    return {
      Módulo: mod,
      Pedidos: lst.length,
      "Facturado ($)": facturado.toFixed(2),
      "Cobrado ($)": cobrado.toFixed(2),
      "Por cobrar ($)": (facturado - cobrado).toFixed(2)
    };
  });
  resumenMod.push({
    Módulo: "TOTAL",
    Pedidos: todos.length,
    "Facturado ($)": todos.reduce((s, p) => s + p["Precio ($)"], 0).toFixed(2),
    "Cobrado ($)": todos.reduce((s, p) => s + p["Abonado ($)"], 0).toFixed(2),
    "Por cobrar ($)": todos.reduce((s, p) => s + p["Saldo ($)"], 0).toFixed(2)
  });
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(todos);
  ws1["!cols"] = [{
    wch: 12
  }, {
    wch: 12
  }, {
    wch: 22
  }, {
    wch: 20
  }, {
    wch: 14
  }, {
    wch: 11
  }, {
    wch: 11
  }, {
    wch: 11
  }, {
    wch: 14
  }, {
    wch: 13
  }, {
    wch: 13
  }, {
    wch: 14
  }, {
    wch: 30
  }];
  XLSX.utils.book_append_sheet(wb, ws1, "Pedidos");
  const ws2 = XLSX.utils.json_to_sheet(resumenMod);
  ws2["!cols"] = [{
    wch: 14
  }, {
    wch: 10
  }, {
    wch: 14
  }, {
    wch: 14
  }, {
    wch: 14
  }];
  XLSX.utils.book_append_sheet(wb, ws2, "Resumen");
  ["Confección", "Bordados", "Cuellos"].forEach(mod => {
    const lst = todos.filter(p => p["Módulo"] === mod);
    if (lst.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(lst);
    ws["!cols"] = [{
      wch: 12
    }, {
      wch: 12
    }, {
      wch: 22
    }, {
      wch: 20
    }, {
      wch: 14
    }, {
      wch: 11
    }, {
      wch: 11
    }, {
      wch: 11
    }, {
      wch: 14
    }, {
      wch: 13
    }, {
      wch: 13
    }];
    XLSX.utils.book_append_sheet(wb, ws, mod.substring(0, 15));
  });
  const fecha = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `TallerIMIS_${periodo}_${fecha}.xlsx`);
}
export function exportarPedidoPDF(pedido, tipo) {
  if (tipo === "confeccion") {
    imprimirRecibo(pedido, true);
  } else {
    const tituloExport = nombrePDF(tipo === "bordado" ? "Bordado" : "Cuello", pedido.id, pedido.cliente || "");
    const w = nuevaVentanaImpresion(tituloExport);
    const pM = v => {
      const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
      return isNaN(n) ? 0 : n;
    };
    const abonado = (pedido.abonos || []).length > 0 ? pedido.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(pedido.anticipo);
    const saldo = pM(pedido.precioT) - abonado;
    const idStr = tipo === "bordado" ? "BORD-" + String(pedido.id).padStart(3, "0") : "CUEL-" + String(pedido.id).padStart(3, "0");
    const color = tipo === "bordado" ? "#1A5F5A" : "#B85C00";
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Pedido ${idStr}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 36px;font-size:13px}
      @media print{body{padding:0}.no-print{display:none!important}@page{margin:14mm 15mm;size:A4}thead{display:table-header-group}tr,img{page-break-inside:avoid}}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid ${color}}
      .logo{font-size:22px;font-weight:900;color:${color};font-family:Georgia,serif}
      .id{font-size:28px;font-weight:900;color:${color};font-family:monospace}
      .sec{font-size:10px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid ${color};padding-bottom:4px;margin:16px 0 10px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
      .campo{display:flex;flex-direction:column;padding:8px 10px;background:#f9f9f9;border-radius:7px}
      .campo-lbl{font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px}
      .campo-val{font-size:13px;font-weight:700;color:#222}
      .total-box{background:${color};color:#fff;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:16px}
    </style></head><body>
    <div class="no-print" style="text-align:right;margin-bottom:10px">
      <button onclick="_print()" style="padding:8px 20px;background:${color};color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:700;font-size:14px">🖨️ Guardar PDF</button>
    </div>
    <div class="header">
      <div><div class="logo">🧵 Taller IMIS</div><div style="font-size:11px;color:#aaa;margin-top:3px">${tipo === "bordado" ? "Bordado" : "Tejido de cuello"}</div></div>
      <div style="text-align:right"><div class="id">${idStr}</div><div style="font-size:11px;color:#aaa;margin-top:3px">${new Date().toLocaleDateString("es-SV")}</div></div>
    </div>
    <div class="sec">👤 Cliente</div>
    <div class="grid">
      <div class="campo"><div class="campo-lbl">Nombre</div><div class="campo-val">${pedido.cliente || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Teléfono</div><div class="campo-val">${pedido.telefono || "—"}</div></div>
    </div>
    <div class="sec">📋 Detalle del pedido</div>
    <div class="grid">
      ${tipo === "bordado" ? `
      <div class="campo"><div class="campo-lbl">Soporte</div><div class="campo-val">${pedido.soporte || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Posición</div><div class="campo-val">${pedido.posicion || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Diseño</div><div class="campo-val">${pedido.diseno || pedido.diseño || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Puntadas est.</div><div class="campo-val">${pedido.puntadas || "—"}</div></div>
      ` : `
      <div class="campo"><div class="campo-lbl">Material</div><div class="campo-val">${pedido.material || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Calibre</div><div class="campo-val">${pedido.calibre || "—"}</div></div>
      ${pedido.cuello && pedido.cuello.activa ? `<div class="campo"><div class="campo-lbl">Cuello</div><div class="campo-val">Largo ${pedido.cuello.largo || "—"}cm × Ancho ${pedido.cuello.ancho || "—"}cm</div></div>` : ""}
      ${pedido.puno && pedido.puno.activa ? `<div class="campo"><div class="campo-lbl">Puño</div><div class="campo-val">Largo ${pedido.puno.largo || "—"}cm × Ancho ${pedido.puno.ancho || "—"}cm</div></div>` : ""}
      `}
      <div class="campo"><div class="campo-lbl">Cantidad</div><div class="campo-val">${pedido.cantidad || "1"} pieza(s)</div></div>
      <div class="campo"><div class="campo-lbl">Fecha entrega</div><div class="campo-val">${pedido.fechaEntrega || "—"}</div></div>
    </div>
    ${saldo >= 0 ? `<div class="sec">💰 Pago</div>
    <div class="total-box">
      <div><div style="font-size:11px;opacity:.8">Precio total</div><div style="font-size:24px;font-weight:900">$${pM(pedido.precioT).toFixed(2)}</div></div>
      <div style="text-align:right"><div style="font-size:11px;opacity:.8">Saldo pendiente</div><div style="font-size:24px;font-weight:900">$${saldo.toFixed(2)}</div></div>
    </div>` : ""}
    ${pedido.notas ? `<div class="sec">📝 Notas</div><p style="font-size:12px;color:#555;padding:8px 10px;background:#f9f9f9;border-radius:7px">${pedido.notas}</p>` : ""}
    <script>
    const _pt=(function(){try{return window.parent.document.title;}catch(e){return '';}})();
    function _print(){try{window.parent.document.title=document.title;}catch(e){}window.print();window.addEventListener('afterprint',function(){try{window.parent.document.title=_pt;}catch(e){}},{once:true});setTimeout(function(){try{window.parent.document.title=_pt;}catch(e){}},15000);}
    </script>
    </body></html>`);
    w.document.close();
  }
}

// ── Hoja de producción de TEJIDO (cuellos/puños) ─────────────────────────
// Mismo espíritu que imprimirProduccion pero para un pedido de la sección
// Cuellos: si el pedido referencia una confección (confRef), deriva las
// cantidades por medida de cuello desde las tallas reales de ese pedido
// (1 cuello y 2 puños por prenda — dos mangas), agrupadas con el mapa
// medidaCuelloParaTalla. Sin confRef cae al total simple (cantidad).
export async function imprimirProduccionCuellos(c, pedidosConf = []) {
  const num = String(c.id).padStart(3, "0");
  const fecha = new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
  const conf = c.confRef
    ? (pedidosConf || []).find(x => String(x.id) === String(c.confRef))
    : null;
  const items = conf ? itemsResumen(conf) : [];

  // Catálogo de diseños de tejido — para avisar en la hoja qué medidas ya
  // tienen diseño listo para la máquina y cuáles hay que crear en HxPDS.
  // Si la consulta falla (sin red), la hoja sale igual pero sin el aviso.
  let catalogoTejidos = [];
  try {
    catalogoTejidos = await dbTejidosLeer();
  } catch { /* hoja sin info de catálogo */ }
  const CAT_POR_PIEZA = { cuello: "Cuello", puno: "Puño", banda: "Banda" };
  const disenosDe = (medida, piezaKey) =>
    catalogoTejidos.filter(d =>
      (d.talla || "").trim() === medida &&
      (d.categoria || "") === CAT_POR_PIEZA[piezaKey]
    );

  // Piezas activas del pedido de tejido (legacy: solo tipoCuello ⇒ cuello)
  const hayToggles = c.cuello || c.puno || c.banda;
  const piezas = [
    { key: "cuello", label: "CUELLOS", icon: "🔵", porPrenda: 1, activa: hayToggles ? !!(c.cuello || {}).activa : true },
    { key: "puno",   label: "PUÑOS",   icon: "🟡", porPrenda: 2, activa: !!(c.puno || {}).activa },
    { key: "banda",  label: "BANDAS",  icon: "🟢", porPrenda: 1, activa: !!(c.banda || {}).activa },
  ].filter(z => z.activa);

  // Agrupar prendas del pedido de confección por medida de cuello
  const grupos = new Map(); // medida -> { prendas, tallas: Map(talla->qty) }
  const sinMapa = [];
  for (const it of items) {
    const qty = parseInt(it.qty) || 0;
    if (!qty) continue;
    const medida = medidaCuelloParaTalla(it.talla);
    if (!medida) { sinMapa.push(it); continue; }
    if (!grupos.has(medida)) grupos.set(medida, { prendas: 0, tallas: new Map() });
    const g = grupos.get(medida);
    g.prendas += qty;
    g.tallas.set(it.talla, (g.tallas.get(it.talla) || 0) + qty);
  }
  const medidasOrden = [...grupos.keys()].sort((a, b) => parseInt(a) - parseInt(b));
  const totalPrendas = [...grupos.values()].reduce((s, g) => s + g.prendas, 0);

  const casillas = n => {
    const q = parseInt(n) || 0;
    if (q <= 0 || q > 40) return "";
    return `<span style="line-height:1.9;">${`<span style="display:inline-block;width:14px;height:14px;border:1.5px solid #888;border-radius:3px;margin:0 3px 0 0;vertical-align:middle;"></span>`.repeat(q)}</span>`;
  };

  const filaMedida = (medida, g, gi) => {
    const bg = gi % 2 === 0 ? "#fff" : "#fdf6ee";
    const tallasTxt = [...g.tallas.entries()]
      .sort((a, b) => rankTalla(a[0]) - rankTalla(b[0]))
      .map(([t, q]) => `${t}(${q})`)
      .join(" · ");
    const pl = PLANTILLA_TEJIDO[medida];
    return piezas.map((z, i) => {
      const ds = disenosDe(medida, z.key);
      // Diseño estipulado por la plantilla (autoritativo). Si el puño usa otra
      // medida que el cuello (rib estira), se anota. Fallback al catálogo.
      const codPlantilla = pl && (z.key === "cuello" ? pl.cuello : z.key === "puno" ? pl.puno : null);
      const notaPuno = pl && z.key === "puno" && pl.punoMedida !== medida ? ` (puño ${pl.punoMedida})` : "";
      const disenoHTML = codPlantilla
        ? `<div style="font-size:10px;color:#1D6A3A;font-weight:800;margin-top:2px;white-space:normal;">🧵 ${codPlantilla}${notaPuno ? `<span style="color:#B85C00;">${notaPuno}</span>` : ""}</div>`
        : catalogoTejidos.length
          ? (ds.length
            ? `<div style="font-size:9px;color:#1D6A3A;font-weight:700;margin-top:2px;white-space:normal;">✓ ${ds.map(d => d.nombre).join(" · ")}</div>`
            : `<div style="font-size:9px;color:#C0392B;font-weight:800;margin-top:2px;white-space:normal;">⚠️ SIN DISEÑO EN CATÁLOGO</div>`)
          : "";
      return `
      <tr style="background:${bg};${i === 0 ? "border-top:3px solid #B85C00;" : "border-top:1px dashed #e0cdb5;"}">
        ${i === 0 ? `<td rowspan="${piezas.length}" style="padding:10px 12px;text-align:center;vertical-align:middle;border-right:2px solid #B85C00;">
          <div style="font-weight:900;font-size:30px;color:#B85C00;line-height:1;">${medida}</div>
          <div style="font-size:10px;font-weight:800;color:#888;margin-top:3px;">${g.prendas} prenda${g.prendas !== 1 ? "s" : ""}</div>
          <div style="font-size:10px;color:#aaa;margin-top:2px;">${tallasTxt}</div>
        </td>` : ""}
        <td style="padding:10px 12px;color:#333;font-size:14px;font-weight:700;">${z.icon} ${z.label}${disenoHTML}</td>
        <td style="padding:10px 12px;text-align:center;font-weight:900;font-size:24px;color:#1A5276;">${g.prendas * z.porPrenda}</td>
        <td style="padding:10px 12px;">${casillas(g.prendas * z.porPrenda)}</td>
      </tr>`;
    }).join("");
  };

  // Resumen de diseños faltantes (solo si pudimos leer el catálogo)
  const faltantes = catalogoTejidos.length
    ? medidasOrden.flatMap(m =>
      piezas
        .filter(z => z.key !== "banda" && disenosDe(m, z.key).length === 0)
        .map(z => `${z.icon} ${CAT_POR_PIEZA[z.key]} ${m}`))
    : [];

  const totalesPiezas = piezas.map(z => `${z.icon} ${totalPrendas * z.porPrenda} ${z.label.toLowerCase()}`).join(" · ");

  const avisoFaltantes = faltantes.length ? `
    <div style="margin-bottom:10px;padding:10px 14px;background:#FDECEA;border:2px solid #C0392B;border-radius:10px;">
      <div style="font-size:12px;font-weight:900;color:#C0392B;">⚠️ ANTES DE TEJER — Faltan ${faltantes.length} diseño(s) en el catálogo:</div>
      <div style="font-size:12px;color:#7B241C;font-weight:700;margin-top:3px;">${faltantes.join(" · ")}</div>
      <div style="font-size:10px;color:#922B21;margin-top:3px;">Crearlos en HxPDS, compilar y probar con muestra antes de producir. Verificá también que la variante (grosor de líneas) del pedido exista — el catálogo puede tener la medida en otra variante.</div>
    </div>` : "";

  // ── Orden de MÁQUINA: agrupar piezas por AGUJAS (emparejando cuello+puño) ──
  // El cambio de agujas es lo caro; tejiendo de menor a mayor agujas solo se
  // agregan (candado), nunca se bota tejido. Cuando un cuello y un puño de
  // distinta medida caen en las mismas agujas, se tejen en el mismo montaje.
  const SINGULAR = { cuello: "Cuello", puno: "Puño", banda: "Banda" };
  const montajes = new Map(); // agujas -> [{medida, icon, nombre, qty}]
  for (const medida of medidasOrden) {
    const g = grupos.get(medida);
    for (const z of piezas) {
      const ag = agujasTejido(medida, z.key);
      if (!ag) continue; // banda u otra pieza sin agujas mapeadas
      if (!montajes.has(ag)) montajes.set(ag, []);
      montajes.get(ag).push({ medida, icon: z.icon, nombre: SINGULAR[z.key] || z.label, qty: g.prendas * z.porPrenda });
    }
  }
  const agujasOrden = [...montajes.keys()].sort((a, b) => a - b);
  const montajeHTML = agujasOrden.map((ag, idx) => {
    const its = montajes.get(ag);
    const totalPz = its.reduce((s, x) => s + x.qty, 0);
    const esPar = new Set(its.map(x => x.nombre + x.medida)).size > 1;
    const col = esPar ? "#1D6A3A" : "#B85C00";
    const flecha = idx > 0
      ? `<div style="text-align:center;color:#B85C00;font-size:11px;font-weight:800;margin:3px 0;">↓ +${ag - agujasOrden[idx - 1]} agujas (candado)</div>`
      : "";
    const filas = its.map(x => `
      <tr>
        <td style="padding:6px 12px;font-size:14px;font-weight:700;color:#333;">${x.icon} ${x.nombre} ${x.medida}</td>
        <td style="padding:6px 12px;text-align:center;font-weight:900;font-size:20px;color:#1A5276;">×${x.qty}</td>
        <td style="padding:6px 12px;">${casillas(x.qty)}</td>
      </tr>`).join("");
    return `${flecha}
      <table style="width:100%;border-collapse:collapse;border:2.5px solid ${col};border-radius:10px;overflow:hidden;">
        <thead><tr style="background:${col};color:#fff;">
          <td style="padding:8px 12px;font-weight:900;font-size:20px;">${ag} <span style="font-size:12px;font-weight:700;">agujas</span></td>
          <td colspan="2" style="padding:8px 12px;text-align:right;font-weight:800;font-size:12px;">${esPar ? "⭐ MISMO MONTAJE (cuello + puño) &nbsp;·&nbsp; " : ""}${totalPz} pieza${totalPz !== 1 ? "s" : ""}</td>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>`;
  }).join("");
  const tablaMaquinaHTML = agujasOrden.length ? `
    <div style="margin-top:16px;page-break-inside:avoid;">
      <div style="font-size:13px;font-weight:900;color:#B85C00;border-bottom:2px solid #B85C00;padding-bottom:4px;margin-bottom:8px;">
        🔧 ORDEN DE MÁQUINA — por agujas
        <span style="font-weight:600;font-size:11px;color:#888;">· tejé de arriba a abajo: solo agregás agujas (candado), nunca botás tejido</span>
      </div>
      ${montajeHTML}
      <div style="margin-top:6px;font-size:10px;color:#1D6A3A;font-weight:700;">⭐ Los bloques verdes tejen cuello y puño de distinta medida en el MISMO montaje — no cambiés agujas entre esas piezas.</div>
    </div>` : "";

  // ── Plantilla de diseños por talla (referencia REUTILIZABLE) ──────────────
  // Qué archivo de cuello y de puño va para cada grupo de tallas. Base fijada
  // con el pedido El Sunza; sirve tal cual para próximos pedidos del estilo.
  const TALLAS_PLANTILLA = {
    '11"': "4, 6, 8 (niño)", '12"': "10, 12", '14"': "13, 14, XS, S",
    '15"': "M, L", '17"': "XL, XXL, 3XL, 4XL",
  };
  const plantillaRefHTML = `
    <div style="margin-top:16px;page-break-inside:avoid;">
      <div style="font-size:13px;font-weight:900;color:#6D4C41;border-bottom:2px solid #6D4C41;padding-bottom:4px;margin-bottom:8px;">
        📋 PLANTILLA DE DISEÑOS POR TALLA
        <span style="font-weight:600;font-size:11px;color:#888;">· referencia fija para próximos pedidos de este estilo</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:2px solid #6D4C41;border-radius:10px;overflow:hidden;">
        <thead><tr style="background:#6D4C41;color:#fff;">
          <th style="padding:7px 10px;text-align:center;width:60px;">Medida</th>
          <th style="padding:7px 10px;text-align:left;">Tallas de prenda</th>
          <th style="padding:7px 10px;text-align:left;">🔵 Cuello (×1)</th>
          <th style="padding:7px 10px;text-align:left;">🟡 Puño (×2)</th>
        </tr></thead>
        <tbody>
          ${Object.entries(PLANTILLA_TEJIDO).map(([m, pl], i) => `
            <tr style="background:${i % 2 === 0 ? "#fff" : "#f7f2ee"};border-top:1px solid #e0d5cc;">
              <td style="padding:8px 10px;text-align:center;font-weight:900;font-size:18px;color:#6D4C41;">${m}</td>
              <td style="padding:8px 10px;color:#555;">${TALLAS_PLANTILLA[m] || "—"}</td>
              <td style="padding:8px 10px;font-weight:800;color:#1D6A3A;">${pl.cuello}</td>
              <td style="padding:8px 10px;font-weight:800;color:#1D6A3A;">${pl.puno}${pl.punoMedida !== m ? `<span style="color:#B85C00;font-weight:700;font-size:10px;"> (puño ${pl.punoMedida})</span>` : ""}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      <div style="margin-top:5px;font-size:10px;color:#8a6d5c;">Puño de 12" y 14" es el mismo archivo (P14-2L-196) — el rib estira y cubre ambas. Optimización futura: emparejar agujas para tejer cuello+puño en un montaje (ver hoja de máquina).</div>
    </div>`;

  const tablaHTML = medidasOrden.length ? `
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:2px solid #B85C00;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#B85C00;color:#fff;">
        <th style="padding:9px 12px;text-align:center;width:110px;">MEDIDA</th>
        <th style="padding:9px 12px;text-align:left;width:110px;">Pieza</th>
        <th style="padding:9px 12px;text-align:center;width:80px;">CUÁNTOS</th>
        <th style="padding:9px 12px;text-align:left;">Tache al terminar ✔</th>
      </tr></thead>
      <tbody>
        ${medidasOrden.map((m, gi) => filaMedida(m, grupos.get(m), gi)).join("")}
        <tr style="background:#B85C00;color:#fff;font-weight:800;">
          <td colspan="2" style="padding:11px 12px;text-align:right;font-size:14px;">TOTAL (${totalPrendas} prendas)</td>
          <td colspan="2" style="padding:11px 12px;font-size:16px;">${totalesPiezas}</td>
        </tr>
      </tbody>
    </table>
    ${sinMapa.length ? `<div style="margin-top:8px;padding:8px 12px;background:#FFF8E1;border:1.5px solid #B8860B66;border-radius:8px;font-size:12px;color:#7D6608;">
      ⚠️ Tallas sin medida de cuello asignada (resolver a mano): ${sinMapa.map(it => `${it.talla || "?"}(${it.qty})`).join(" · ")}
    </div>` : ""}` : `
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:2px solid #B85C00;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#B85C00;color:#fff;">
        <th style="padding:9px 12px;text-align:left;width:140px;">Pieza</th>
        <th style="padding:9px 12px;text-align:center;width:90px;">CUÁNTOS</th>
        <th style="padding:9px 12px;text-align:left;">Tache al terminar ✔</th>
      </tr></thead>
      <tbody>
        ${piezas.map((z, i) => {
    const qty = (parseInt(c.cantidad) || 0) * z.porPrenda;
    return `<tr style="background:${i % 2 === 0 ? "#fff" : "#fdf6ee"};border-top:1px solid #e0cdb5;">
            <td style="padding:10px 12px;font-weight:700;font-size:14px;">${z.icon} ${z.label}</td>
            <td style="padding:10px 12px;text-align:center;font-weight:900;font-size:24px;color:#1A5276;">${qty}</td>
            <td style="padding:10px 12px;">${casillas(qty)}</td>
          </tr>`;
  }).join("")}
      </tbody>
    </table>
    <div style="margin-top:8px;padding:8px 12px;background:#FFF8E1;border:1.5px solid #B8860B66;border-radius:8px;font-size:12px;color:#7D6608;">
      ⚠️ Este pedido no está enlazado a una confección — cantidades calculadas del total (${c.cantidad || 0} prendas). Enlazalo con "¿Viene de pedido de confección?" para el desglose por medida.
    </div>`;

  // Especificaciones de las piezas (largo/ancho/colores por pieza activa)
  const specPiezas = piezas.map(z => {
    const pz = c[z.key] || {};
    const dims = [pz.largo && `largo ${pz.largo}cm`, pz.ancho && `ancho ${pz.ancho}cm`].filter(Boolean).join(" · ");
    return `<div style="flex:1;min-width:150px;padding:8px 10px;background:#fdf6ee;border-radius:8px;border-left:3px solid #B85C00;">
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.4px;">${z.icon} ${z.label}</div>
      <div style="font-size:13px;font-weight:700;color:#222;">${dims || "—"}</div>
      ${pz.colores ? `<div style="font-size:11px;color:#555;">🎨 ${pz.colores}</div>` : ""}
    </div>`;
  }).join("");

  const titulo = nombrePDF("ProduccionTejido", c.id, c.cliente);
  const w = nuevaVentanaImpresion(titulo);
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:24px 30px;font-size:13px;}
    @media print{body{padding:0;}.no-print{display:none!important;}@page{margin:11mm 12mm;size:A4;}thead{display:table-header-group}tr,img{page-break-inside:avoid}}
    table{border-collapse:collapse;width:100%;}
  </style></head><body>

  <div class="no-print" style="margin-bottom:16px;">
    <div style="background:#FFF4E6;border:1px solid #FFCC80;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#B85C00;">
      💾 <strong>Tip:</strong> al imprimir, en "Destino" elegí <strong>"Guardar como PDF"</strong>. El archivo se llamará <strong>${titulo}.pdf</strong>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button onclick="_print()" style="padding:11px 24px;border-radius:8px;border:none;background:#B85C00;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Guardar PDF</button>
      <button onclick="window.parent.__closeFrame__ && window.parent.__closeFrame__()" style="padding:11px 16px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #B85C00;padding-bottom:10px;margin-bottom:14px;gap:14px;">
    <div style="flex:1;">
      <div style="font-size:18px;font-weight:900;color:#B85C00;font-family:Georgia,serif;line-height:1;">${TALLER}</div>
      <div style="font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-top:3px;">Hoja de Producción — Tejido de cuellos · ${fecha}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:30px;font-weight:900;color:#B85C00;line-height:1;">CUEL-${num}</div>
      <div style="margin-top:4px;display:inline-block;padding:4px 12px;border-radius:20px;background:#FFF5E6;border:1.5px solid #E67E22;font-size:13px;font-weight:800;color:#E67E22;">
        📌 Entregar: ${c.fechaEntrega || "⚠️ Sin fecha"}
      </div>
    </div>
  </div>

  <div style="background:#fdf6ee;border-radius:10px;padding:12px 14px;border-left:4px solid #B85C00;margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <div style="font-size:17px;font-weight:800;color:#5a3200;">👤 ${c.cliente || "—"}</div>
      ${c.telefono ? `<div style="font-size:12px;color:#555;">📱 ${c.telefono}</div>` : ""}
    </div>
    ${conf ? `<div style="font-size:12px;color:#9B59B6;font-weight:700;margin-top:2px;">🔗 Derivado del pedido de confección N°${String(conf.id).padStart(4, "0")} — 1 cuello y 2 puños por prenda</div>` : ""}
  </div>

  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
    <div style="flex:1;min-width:150px;padding:8px 10px;background:#f9f9f9;border-radius:8px;border-left:3px solid #6D4C41;">
      <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.4px;">🧵 Material</div>
      <div style="font-size:13px;font-weight:700;color:#222;">${[c.material, c.calibre].filter(Boolean).join(" · ") || "—"}</div>
    </div>
    ${specPiezas}
  </div>

  ${avisoFaltantes}
  ${tablaHTML}
  ${tablaMaquinaHTML}
  ${plantillaRefHTML}

  ${c.descripcion ? `<div style="margin-top:12px;padding:10px 12px;background:#f9f9f9;border-radius:8px;border-left:3px solid #9B59B6;">
    <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;">📝 Diseño / instrucciones</div>
    <div style="font-size:13px;color:#333;">${c.descripcion}</div>
  </div>` : ""}

  <div style="margin-top:14px;">
    <div style="font-size:9px;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">
      ✏️ Anotaciones durante la producción (muestras, ajustes de tensión, agujas)
    </div>
    <div style="border:1px solid #e0e0e0;border-radius:8px;padding:10px 12px;">
      ${Array.from({ length: 5 }, () => `<div style="height:22px;border-bottom:1px solid #f0f0f0;"></div>`).join("")}
    </div>
  </div>
  <script>
  const _pt=(function(){try{return window.parent.document.title;}catch(e){return '';}})();
  function _print(){try{window.parent.document.title=document.title;}catch(e){}window.print();window.addEventListener('afterprint',function(){try{window.parent.document.title=_pt;}catch(e){}},{once:true});setTimeout(function(){try{window.parent.document.title=_pt;}catch(e){}},15000);}
  </script>
  </body></html>`);
  w.document.close();
}
