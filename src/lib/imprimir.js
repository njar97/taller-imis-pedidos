// Helpers de impresión y exportación extraídos de main.jsx.
// Usados por App (via imprimirPedido) y por los modales de detalle.

import { agruparPrendas } from "../ListaPrendas.jsx";
import { EMPRESA } from "./empresa.js";
import { nombrePDF } from "./pdfNombre.js";
import { itemsResumen, medidaCuelloParaTalla, rankTalla, resumenTallas, sumarAbonos } from "./dominio.js";
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
    const grupos = agruparPrendas(per.prendas);
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
  @media print{body{padding:0;}.no-print{display:none!important;}@page{margin:8mm 12mm;size:A4;}}
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
        <td style="padding:7px 7px;text-align:center;font-weight:700;color:#777;">${i+1}</td>
        <td style="padding:7px 9px;color:#111;">${descripcion}</td>
        <td style="padding:7px 7px;text-align:center;font-weight:800;color:#111;">${medida}</td>
        <td style="padding:7px 7px;text-align:center;font-weight:800;">${it.qty}</td>
        <td style="padding:7px 9px;text-align:right;font-weight:700;">${pr>0?"$"+pr.toFixed(2):"—"}</td>
        <td style="padding:7px 9px;text-align:right;font-weight:900;">${pr>0?"$"+sub.toFixed(2):"—"}</td>
      </tr>`;
    }
    return `<tr style="background:${i%2===0?"#fff":"#f5f5f5"};">
      <td style="padding:7px 7px;text-align:center;font-weight:700;color:#777;border:1px solid #ddd;">${i+1}</td>
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
    <th style="padding:6px 7px;text-align:center;width:32px;">N°</th>
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
    <th style="padding:6px 7px;text-align:center;width:32px;border:1px solid #555;">N°</th>
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
      <span style="font-weight:900;">$${(unitPrice * 0.5).toFixed(2)} c/u</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:3px 0;">
      <span>Saldo contra entrega <strong>(50%)</strong></span>
      <span style="font-weight:900;">$${(unitPrice * 0.5).toFixed(2)} c/u</span>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:6px;">
      Total estimado (${totPzas} uds.): <strong>~$${precioFinal.toFixed(2)}</strong><br>
      <em>Cantidad sujeta a confirmación de participantes</em>
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
  const tieneItems = (p.tallasItems || []).length > 0;
  const itemsHTML = tieneItems ? `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;">
      <thead><tr style="background:#2C1654;color:#fff;">
        <th style="padding:6px 10px;text-align:left;">Talla</th>
        <th style="padding:6px 10px;text-align:center;">Cantidad</th>
        <th style="padding:6px 10px;text-align:left;">Especificación</th>
        <th style="padding:6px 10px;text-align:right;">Precio u.</th>
        <th style="padding:6px 10px;text-align:right;">Subtotal</th>
      </tr></thead>
      <tbody>
        ${p.tallasItems.map((it, i) => {
    const tieneP = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0;
    const sub = tieneP ? parseFloat(it.precio) * it.qty : null;
    return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"};">
            <td style="padding:6px 10px;font-weight:800;color:#E67E22;">${it.talla}</td>
            <td style="padding:6px 10px;text-align:center;font-weight:700;">${it.qty}</td>
            <td style="padding:6px 10px;color:#555;">${it.spec || "—"}</td>
            <td style="padding:6px 10px;text-align:right;color:#27AE60;font-weight:700;">${tieneP ? "$" + parseFloat(it.precio).toFixed(2) : "—"}</td>
            <td style="padding:6px 10px;text-align:right;font-weight:800;color:#2C1654;">${sub != null ? "$" + sub.toFixed(2) : "—"}</td>
          </tr>`;
  }).join("")}
        ${(() => {
    const tot = p.tallasItems.filter(it => it.precio != null && it.precio !== "").reduce((s, it) => s + parseFloat(it.precio || 0) * it.qty, 0);
    const totPzas = p.tallasItems.reduce((s, it) => s + it.qty, 0);
    return `<tr style="background:#f0f0f0;font-weight:800;border-top:2px solid #2C1654;">
            <td style="padding:7px 10px;color:#2C1654;">TOTAL</td>
            <td style="padding:7px 10px;text-align:center;color:#2C1654;">${totPzas} prendas</td>
            <td></td><td></td>
            <td style="padding:7px 10px;text-align:right;font-size:15px;color:#2C1654;">${tot > 0 ? "$" + tot.toFixed(2) : ""}</td>
          </tr>`;
  })()}
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
    @media print{body{padding:14px 20px;}.no-print{display:none!important;}@page{margin:10mm;size:A4;}}
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

  <!-- PAGO -->
  ${p.precio ? `
  <div class="sec">💰 Estado de pago</div>
  <div style="background:#f8fff9;border:1.5px solid #d4edda;border-radius:10px;padding:16px;margin-bottom:16px;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;">
      <div style="background:#fff;border-radius:8px;padding:12px;border:1px solid #eee;">
        <div style="font-size:10px;color:#aaa;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Precio total</div>
        <div style="font-size:22px;font-weight:900;color:#2C1654;">$${parseFloat(p.precio).toFixed(2)}</div>
      </div>
      <div style="background:#fff;border-radius:8px;padding:12px;border:1px solid #eee;">
        <div style="font-size:10px;color:#aaa;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Anticipo recibido</div>
        <div style="font-size:22px;font-weight:900;color:#27AE60;">$${abonado.toFixed(2)}</div>
      </div>
      <div style="background:${saldo > 0 ? "#FFF5F5" : "#F0FFF4"};border-radius:8px;padding:12px;border:2px solid ${saldo > 0 ? "#E74C3C" : "#27AE60"};">
        <div style="font-size:10px;color:#aaa;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Saldo pendiente</div>
        <div style="font-size:22px;font-weight:900;color:${saldo > 0 ? "#E74C3C" : "#27AE60"};">${saldo > 0 ? "$" + saldo.toFixed(2) : "✅ Pagado"}</div>
      </div>
    </div>
  </div>` : ""}

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
export async function imprimirProduccion(p, todosPedidos = []) {
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
  const grupos = [];
  for (const it of ordenados) {
    const talla = it.talla || "S/T";
    const ult = grupos[grupos.length - 1];
    if (ult && ult.talla === talla) ult.items.push(it);
    else grupos.push({ talla, items: [it] });
  }
  const iconoSpec = s =>
    /parvulari/i.test(s || "") ? "🧒 " :
    /b[aá]sica/i.test(s || "") ? "🎒 " :
    /bachillerato|t[eé]cnic/i.test(s || "") ? "🎓 " : "";
  const casillas = n => {
    const q = parseInt(n) || 0;
    if (q <= 0 || q > 40) return "";
    return `<span style="line-height:1.9;">${`<span style="display:inline-block;width:14px;height:14px;border:1.5px solid #888;border-radius:3px;margin:0 3px 0 0;vertical-align:middle;"></span>`.repeat(q)}</span>`;
  };
  const tablaPrendasHTML = grupos.length ? `
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:2px solid #1A5276;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#1A5276;color:#fff;">
        <th style="padding:9px 12px;text-align:center;width:90px;">TALLA</th>
        <th style="padding:9px 12px;text-align:center;width:70px;">CUÁNTOS</th>
        <th style="padding:9px 12px;text-align:left;">De qué es</th>
        <th style="padding:9px 12px;text-align:left;width:180px;">Tache al terminar ✔</th>
      </tr></thead>
      <tbody>
        ${grupos.map((g, gi) => {
          const totalTalla = g.items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
          const bg = gi % 2 === 0 ? "#fff" : "#f4f9f4";
          return g.items.map((it, i) => `
            <tr style="background:${bg};${i === 0 ? "border-top:3px solid #1A5276;" : "border-top:1px dashed #ccd;"}">
              ${i === 0 ? `<td rowspan="${g.items.length}" style="padding:10px 12px;text-align:center;vertical-align:middle;border-right:2px solid #1A5276;">
                <div style="font-weight:900;font-size:30px;color:#E67E22;line-height:1;">${g.talla}</div>
                ${g.items.length > 1 ? `<div style="font-size:10px;font-weight:800;color:#888;margin-top:3px;">${totalTalla} en total</div>` : ""}
              </td>` : ""}
              <td style="padding:10px 12px;text-align:center;font-weight:900;font-size:24px;color:#1A5276;">${it.qty}</td>
              <td style="padding:10px 12px;color:#333;font-size:14px;font-weight:700;">${iconoSpec(it.spec)}${[it.tipo, it.spec].filter(Boolean).join(" — ") || "—"}</td>
              <td style="padding:10px 12px;">${casillas(it.qty)}</td>
            </tr>`).join("");
        }).join("")}
        <tr style="background:#1A5276;color:#fff;font-weight:800;">
          <td colspan="2" style="padding:11px 12px;text-align:right;font-size:14px;">TOTAL</td>
          <td colspan="2" style="padding:11px 12px;font-size:22px;">${totalPzas} piezas</td>
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
    @media print{body{padding:12px 16px;}.no-print{display:none!important;}@page{margin:8mm;size:A4;}}
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

  <!-- ESPECIFICACIONES DE DISEÑO -->
  ${diagramaURL ? `
  <div style="font-size:11px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🎨 Especificaciones de diseño</div>
  <div style="display:flex;gap:16px;align-items:flex-start;background:#faf6ff;border:1.5px solid #D7BDE2;border-radius:10px;padding:12px;margin-bottom:14px;">
    <div style="flex-shrink:0;text-align:center;">
      <img src="${diagramaURL}" style="width:140px;height:auto;border-radius:6px;display:block;" alt="diagrama diseños"/>
      <div style="font-size:7px;color:#bbb;margin-top:3px;font-style:italic;">vista frontal · D=portador derecho · I=portador izquierdo</div>
    </div>
    <div style="flex:1;">
      ${(p.disenos||[]).filter(d=>d.ubicacion).map((d,i)=>{
        const col={"Sublimación":"#2980B9","DTF":"#D35400","Bordado":"#8E44AD","Serigrafía":"#27AE60"}[d.tecnica]||"#7F8C8D";
        const size=d.ancho&&d.alto?`${d.ancho}×${d.alto}cm`:"";
        const pos=d.posicionCuello?`↕ ${d.posicionCuello}cm desde cuello`:"";
        return `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:3px;background:${col};color:#fff;font-size:9px;font-weight:900;flex-shrink:0;margin-top:1px;">${i+1}</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:#2C1654;">${d.ubicacion||""}</div>
            <div style="font-size:11px;color:${col};font-weight:700;">${d.tecnica||""}${size?" · "+size:""}${pos?" · "+pos:""}</div>
            ${d.notas?`<div style="font-size:10px;color:#888;font-style:italic;">${d.notas}</div>`:""}
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>` : ""}

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
      @media print{body{padding:14px 20px}.no-print{display:none!important}@page{margin:10mm;size:A4}}
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
export function imprimirProduccionCuellos(c, pedidosConf = []) {
  const num = String(c.id).padStart(3, "0");
  const fecha = new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
  const conf = c.confRef
    ? (pedidosConf || []).find(x => String(x.id) === String(c.confRef))
    : null;
  const items = conf ? itemsResumen(conf) : [];

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
    return piezas.map((z, i) => `
      <tr style="background:${bg};${i === 0 ? "border-top:3px solid #B85C00;" : "border-top:1px dashed #e0cdb5;"}">
        ${i === 0 ? `<td rowspan="${piezas.length}" style="padding:10px 12px;text-align:center;vertical-align:middle;border-right:2px solid #B85C00;">
          <div style="font-weight:900;font-size:30px;color:#B85C00;line-height:1;">${medida}</div>
          <div style="font-size:10px;font-weight:800;color:#888;margin-top:3px;">${g.prendas} prenda${g.prendas !== 1 ? "s" : ""}</div>
          <div style="font-size:10px;color:#aaa;margin-top:2px;">${tallasTxt}</div>
        </td>` : ""}
        <td style="padding:10px 12px;color:#333;font-size:14px;font-weight:700;white-space:nowrap;">${z.icon} ${z.label}</td>
        <td style="padding:10px 12px;text-align:center;font-weight:900;font-size:24px;color:#1A5276;">${g.prendas * z.porPrenda}</td>
        <td style="padding:10px 12px;">${casillas(g.prendas * z.porPrenda)}</td>
      </tr>`).join("");
  };

  const totalesPiezas = piezas.map(z => `${z.icon} ${totalPrendas * z.porPrenda} ${z.label.toLowerCase()}`).join(" · ");

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
    @media print{body{padding:12px 16px;}.no-print{display:none!important;}@page{margin:8mm;size:A4;}}
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

  ${tablaHTML}

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
