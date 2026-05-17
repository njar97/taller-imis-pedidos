
// Lector de archivos de bordado (.dst/.pes/.jef/.emb) en chunk lazy.
// Importar bajo demanda con: (await import("./leerBordado.js")).leerMetadataBordado
const cargarLectorBordado = () => import("./leerBordado.js").then(m => m.leerMetadataBordado);

// Vista de Papelera (admin, lazy)
const SeccionPapeleraLazy = React.lazy(() => import("./SeccionPapelera.jsx"));

// Pantalla de login (decompilada a JSX legible)
import PantallaLogin from "./PantallaLogin.jsx";

// Estadísticas (decompilada a JSX legible)
import SeccionEstadisticas from "./SeccionEstadisticas.jsx";

// Cartera de clientes (decompilada a JSX legible)
import SeccionClientes from "./SeccionClientes.jsx";

// Catálogo de productos (decompilado a JSX legible)
import SeccionCatalogo from "./SeccionCatalogo.jsx";

// Inventario del taller (decompilado a JSX legible)
import SeccionInventario from "./SeccionInventario.jsx";

// Registro de abonos (decompilado a JSX legible)
// Usado por FormPedido, BordadoModal y CuelloModal.
import RegistroAbonos from "./RegistroAbonos.jsx";

// Lista de prendas por persona (uniformes) — decompilado a JSX.
// El módulo también exporta TablaPersonasInternas (dead code histórico
// nunca referenciado desde call-sites), por simetría con el original.
import { ListaPrendas } from "./ListaPrendas.jsx";

// Selector de tallas estándar + chips de resumen (decompilados a JSX)
import { SelectorTallas, TallasChips } from "./SelectorTallas.jsx";

// Buscador de pedidos de confección (para vincular desde Bordados/Cuellos)
import BuscadorConfRef from "./BuscadorConfRef.jsx";

// Carrusel de próximas entregas (decompilado a JSX)
import ProximasEntregas from "./ProximasEntregas.jsx";

// Tarjeta de pedido (decompilada a JSX)
import CardPedido from "./CardPedido.jsx";

// Modal del asistente IA (chat con Claude) — decompilado a JSX
import ModalAsistenteIA from "./ModalAsistenteIA.jsx";

// Formulario de pedido (decompilado a JSX)
import FormPedido from "./FormPedido.jsx";

// Catálogo de productos por defecto (fallback cuando la BD está vacía)
import { CATALOGO_BASE } from "./lib/catalogoBase.js";

// Hook compartido: debounce de callbacks
import { useDebouncedCallback } from "./lib/hooks.js";

// Sección de Bordados + BordadoModal (decompilado a JSX)
import SeccionBordados from "./SeccionBordados.jsx";

// Sección de Cuellos + CuelloModal (decompilado a JSX)
import SeccionCuellos from "./SeccionCuellos.jsx";

// Indicador offline + prompt de nueva versión (PWA)
import ConexionStatus from "./ConexionStatus.jsx";

// Banner "Instalar como app" (PWA — Android/Chrome + iOS Safari)
import InstallPrompt from "./InstallPrompt.jsx";

// ErrorBoundary — pantalla de fallback si React revienta
import ErrorBoundary from "./ErrorBoundary.jsx";

// Modal genérico — usado en muchos sitios de main.js
import { Modal } from "./lib/Modal.jsx";

// Helpers UI compartidos (decompilados a JSX legible)
import {
  Toaster,
  ConfirmDialog,
  Check,
  UploaderImagenes,
  BarraProgreso,
  Chips,
  FechasRapidas,
  SeccionOpcional,
  BannerMedidas,
  WABtn,
} from "./lib/ui.jsx";

// Texto y portapapeles para WhatsApp (extraído de main.js)
import { copiarWA } from "./lib/whatsapp.js";

// Cliente liviano de Supabase Storage (fetch directo, sin deps).
import { subirFotoSupabase, subirArchivoSupabase } from "./supabaseStorage.js";

// Bus de notificaciones (toast + confirm) accesible desde cualquier módulo.
import {
  pushToast,
  pushConfirm,
  _subscribeToasts,
  _getToasts,
  _subscribeConfirm,
  _getConfirm,
  _clearConfirm,
  buzz,
} from "./lib/feedback.js";

// Backend de datos: Postgres vía PostgREST (Supabase).
// Las funciones se exportan con los nombres viejos (gsLeer, gsGuardar, ...)
// para no tocar las ~50 call-sites en main.js. Cambio en cero líneas posteriores.
import {
  dbLeer            as gsLeer,
  dbGuardar         as gsGuardar,
  dbBorrar          as gsBorrar,
  dbBordLeer        as gsBordLeer,
  dbBordGuardar     as gsBordGuardar,
  dbBordBorrar      as gsBordBorrar,
  dbCuelLeer        as gsCuelLeer,
  dbCuelGuardar     as gsCuelGuardar,
  dbCuelBorrar      as gsCuelBorrar,
  dbClientesLeer    as gsClientesLeer,
  dbClientesGuardar as gsClientesGuardar,
  dbClientesBorrar  as gsClientesBorrar,
  dbCatalogoLeer,
  dbCatalogoGuardar,
} from "./lib/db.js";

// Constantes de dominio (estados, opciones, tallas, medidas)
import {
  TALLER,
  ANTHROPIC_KEY,
  ESTATUS,
  EC,
  BORD_E,
  BORD_EC,
  SOPORTES_BORD,
  POSICIONES_BORD,
  DISENO_EST,
  CUEL_E,
  CUEL_EC,
  TIPOS_CUELLO,
  MATS_CUELLO,
  CALS_CUELLO,
  TALLAS_CUELLO,
  TIPO_DOC,
  COLABORADORAS,
  TALLAS_A,
  TALLAS_N,
  TALLAS_NUM,
  MEDIDAS_DEF,
} from "./lib/constants.js";

// Helpers de dominio (formato, plantilla de pedido)
import {
  medInit,
  hoy,
  fmt$,
  tallasTexto,
  tallasItemsTexto,
  resumenTallas,
  PEDIDO_BASE,
} from "./lib/dominio.js";

// Helpers de imágenes
import {
  imgSrc,
  driveViewUrl,
  driveDownloadUrl,
  extractDriveId,
  comprimirImagen,
} from "./lib/imagenes.js";

// Cache local de imágenes en IndexedDB
import { idbGuardar, idbLeerTodas, idbBorrar } from "./lib/idb.js";

// Suscripción a cambios en Postgres (WebSocket, sin SDK)
import { suscribirCambios } from "./lib/realtime.js";

const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} = React;
function imprimirPedido(p, esAdmin) {
  if (esAdmin) imprimirRecibo(p);else imprimirProduccion(p);
}
function imprimirRecibo(p) {
  const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
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
  const w = window.open("", "_blank", "width=780,height=1050");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Recibo N°${num}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 36px;font-size:13px;}
    @media print{body{padding:14px 20px;}.no-print{display:none!important;}@page{margin:10mm;size:A4;}}
    table{border-collapse:collapse;width:100%;}
    .sec{font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #9B59B6;padding-bottom:4px;margin:16px 0 10px;}
  </style></head><body>

  <!-- Botones no-print -->
  <div class="no-print" style="text-align:right;margin-bottom:20px;display:flex;gap:8px;justify-content:flex-end;">
    <button onclick="window.print()" style="padding:10px 22px;border-radius:8px;border:none;background:#2C1654;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir</button>
    <button onclick="window.close()" style="padding:10px 16px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
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
      <div style="font-size:10px;font-weight:800;color:#27AE60;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">📅 Fechas</div>
      ${p.fechaInicio ? `<div style="font-size:12px;color:#555;margin-bottom:3px;">Inicio: <strong>${p.fechaInicio}</strong></div>` : ""}
      <div style="font-size:13px;color:#C0392B;font-weight:800;">Entrega: ${p.fechaEntrega || "Por confirmar"}</div>
    </div>
  </div>

  <!-- DETALLE DEL PEDIDO -->
  <div class="sec">📋 Detalle del pedido</div>
  <div style="background:#fafafa;border:1.5px solid #eee;border-radius:10px;padding:14px;margin-bottom:16px;">
    <div style="font-size:16px;font-weight:800;color:#2C1654;margin-bottom:6px;">✂️ ${p.tipoPrenda || "(sin especificar)"}</div>
    ${p.tela || p.color ? `<div style="font-size:13px;color:#555;margin-bottom:4px;">🧵 ${[p.tela, p.color].filter(Boolean).join(" — ")}</div>` : ""}
    ${p.descripcion ? `<div style="font-size:12px;color:#666;margin-top:6px;padding:8px 10px;background:#fff;border-radius:6px;border-left:3px solid #9B59B6;">${p.descripcion}</div>` : ""}
    ${itemsHTML}
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
        <div style="font-size:22px;font-weight:900;color:#27AE60;">$${parseFloat(p.anticipo || 0).toFixed(2)}</div>
      </div>
      <div style="background:${saldo > 0 ? "#FFF5F5" : "#F0FFF4"};border-radius:8px;padding:12px;border:2px solid ${saldo > 0 ? "#E74C3C" : "#27AE60"};">
        <div style="font-size:10px;color:#aaa;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Saldo pendiente</div>
        <div style="font-size:22px;font-weight:900;color:${saldo > 0 ? "#E74C3C" : "#27AE60"};">${saldo > 0 ? "$" + saldo.toFixed(2) : "✅ Pagado"}</div>
      </div>
    </div>
  </div>` : ""}

  <!-- CRÉDITO FISCAL -->
  ${p.tipoDocumento !== "Consumidor Final" ? `
  <div class="sec">🧾 Datos fiscales</div>
  <div style="background:#f0f8ff;border:1.5px solid #cce5ff;border-radius:10px;padding:14px;margin-bottom:16px;">
    ${p.tipoDocumento.includes("pendiente") ? `<div style="color:#856404;font-weight:700;margin-bottom:8px;">⚠️ Pendiente recibir datos fiscales completos</div>` : ""}
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
  </body></html>`);
  w.document.close();
}
function imprimirProduccion(p) {
  const tallas = resumenTallas(p);
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const imagenes = (p.imagenes || []).filter(img => imgSrc(img));
  const meds = MEDIDAS_DEF.filter(m => (p.medidas || {})[m.k]);
  const tieneItems = (p.tallasItems || []).length > 0;
  const medsHTML = meds.length ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:10px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #1A5276;padding-bottom:4px;margin-bottom:10px;">📐 Medidas</div>
      <table style="border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        ${(() => {
    const rows = [];
    for (let i = 0; i < meds.length; i += 4) {
      rows.push(`<tr>${meds.slice(i, i + 4).map((m, j) => `<td style="padding:7px 10px;border:1px solid #ddd;font-size:11px;background:${j % 2 === 0 ? "#f9f9f9" : "#fff"};color:#888;font-weight:700;">${m.l}</td><td style="padding:7px 12px;border:1px solid #ddd;font-size:14px;font-weight:800;color:#1A5276;">${p.medidas[m.k]} cm</td>`).join("")}</tr>`);
    }
    return rows.join("");
  })()}
      </table>
    </div>` : "";
  const itemsHTML = tieneItems ? `
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
      <thead><tr style="background:#1A5276;color:#fff;">
        <th style="padding:6px 10px;text-align:left;">Talla</th>
        <th style="padding:6px 10px;text-align:center;">Cant.</th>
        <th style="padding:6px 10px;text-align:left;">Especificación / instrucción</th>
      </tr></thead>
      <tbody>
        ${p.tallasItems.map((it, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f4f9f4"};">
          <td style="padding:7px 10px;font-weight:900;font-size:14px;color:#E67E22;border-bottom:1px solid #eee;">${it.talla}</td>
          <td style="padding:7px 10px;text-align:center;font-weight:800;font-size:14px;border-bottom:1px solid #eee;">${it.qty}</td>
          <td style="padding:7px 10px;color:#444;border-bottom:1px solid #eee;">${it.spec || "—"}</td>
        </tr>`).join("")}
        <tr style="background:#e8f5e9;font-weight:800;border-top:2px solid #27AE60;">
          <td style="padding:7px 10px;color:#155724;">TOTAL</td>
          <td style="padding:7px 10px;text-align:center;font-size:15px;color:#155724;">${p.tallasItems.reduce((s, it) => s + it.qty, 0)}</td>
          <td style="padding:7px 10px;color:#888;font-size:11px;">prendas a confeccionar</td>
        </tr>
      </tbody>
    </table>` : tallas ? `<div style="font-size:14px;color:#E67E22;font-weight:700;margin-top:6px;">📦 ${tallas}</div>` : "";
  const imgHTML = imagenes.length ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:10px;font-weight:800;color:#E91E8C;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #E91E8C;padding-bottom:4px;margin-bottom:10px;">📸 Imágenes de referencia</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${imagenes.map(img => `<div style="text-align:center;"><img src="${imgSrc(img)}" style="max-width:160px;max-height:160px;border-radius:8px;border:1.5px solid #e0e0e0;display:block;"/><div style="font-size:9px;color:#aaa;margin-top:3px;">${img.nombre || ""}</div></div>`).join("")}
      </div>
    </div>` : "";
  const w = window.open("", "_blank", "width=820,height=1100");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Orden Producción N°${num}</title>
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

  <div class="no-print" style="text-align:right;margin-bottom:16px;display:flex;gap:8px;justify-content:flex-end;">
    <button onclick="window.print()" style="padding:10px 22px;border-radius:8px;border:none;background:#1A5276;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir</button>
    <button onclick="window.close()" style="padding:10px 16px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
  </div>

  <!-- ENCABEZADO -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1A5276;padding-bottom:12px;margin-bottom:16px;">
    <div>
      <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Hoja de Producción</div>
      <div style="font-size:20px;font-weight:900;color:#1A5276;font-family:Georgia,serif;">${TALLER}</div>
      <div style="font-size:11px;color:#aaa;margin-top:2px;">Impreso: ${fecha}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Orden</div>
      <div style="font-size:40px;font-weight:900;color:#1A5276;line-height:1;">N°${num}</div>
      <div style="margin-top:6px;font-size:15px;font-weight:800;color:#E67E22;">
        📅 Entregar: ${p.fechaEntrega || "⚠️ Sin fecha"}
      </div>
    </div>
  </div>

  <!-- CLIENTE Y PRENDA -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
    <div style="background:#f8f4ff;border-radius:10px;padding:13px;border-left:4px solid #9B59B6;">
      <div style="font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;margin-bottom:5px;">👤 Cliente</div>
      <div style="font-size:16px;font-weight:800;color:#2C1654;">${p.cliente}</div>
      ${p.nombreContacto ? `<div style="font-size:12px;color:#555;margin-top:2px;">Contacto: ${p.nombreContacto}</div>` : ""}
      ${p.telefono ? `<div style="font-size:12px;color:#555;">📱 ${p.telefono}</div>` : ""}
    </div>
    <div style="background:#EBF5FB;border-radius:10px;padding:13px;border-left:4px solid #1A5276;">
      <div style="font-size:10px;font-weight:800;color:#1A5276;text-transform:uppercase;margin-bottom:5px;">✂️ Prenda</div>
      <div style="font-size:16px;font-weight:800;color:#1A5276;">${p.tipoPrenda || "(sin especificar)"}</div>
      ${p.tela ? `<div style="font-size:12px;color:#555;margin-top:3px;">🧵 Tela: <strong>${p.tela}</strong></div>` : ""}
      ${p.color ? `<div style="font-size:12px;color:#555;">🎨 Color: <strong>${p.color}</strong></div>` : ""}
    </div>
  </div>

  <!-- FICHA DE PRODUCCIÓN -->
  <div class="sec" style="color:#1A5276;">⚙️ Ficha de producción</div>
  <div class="ficha">
    <div class="campo ${p.costurera && p.costurera !== "(Sin asignar)" ? "ok" : ""}">
      <div class="campo-lbl">Costurera asignada</div>
      <div class="campo-val">${p.costurera || "⚠️ Sin asignar"}</div>
    </div>
    <div class="campo">
      <div class="campo-lbl">Fecha inicio</div>
      <div class="campo-val">${p.fechaInicio || "—"}</div>
    </div>
    <div class="campo ${p.tieneBordado ? "urgente" : ""}">
      <div class="campo-lbl">Bordado</div>
      <div class="campo-val">${p.tieneBordado ? "✅ SÍ LLEVA BORDADO" : "No"}</div>
    </div>
    <div class="campo ${p.telaComprada ? "ok" : "urgente"}">
      <div class="campo-lbl">Tela</div>
      <div class="campo-val">${p.telaComprada ? "✅ Ya comprada" : "⚠️ Pendiente comprar"}</div>
    </div>
    ${p.tieneBordado && p.estatusDiseno ? `<div class="campo" style="grid-column:span 2">
      <div class="campo-lbl">Estado del diseño de bordado</div>
      <div class="campo-val">${p.estatusDiseno}</div>
    </div>` : ""}
  </div>

  <!-- TALLAS Y CANTIDADES -->
  <div class="sec" style="color:#E67E22;">📦 Tallas y cantidades a confeccionar</div>
  ${itemsHTML}

  <!-- DESCRIPCIÓN E INSTRUCCIONES -->
  ${p.descripcion ? `
  <div class="sec" style="color:#6C3483;">📝 Descripción e instrucciones</div>
  <div style="background:#F9F0FF;border:1.5px solid #D7BDE2;border-radius:9px;padding:13px;margin-bottom:14px;font-size:13px;color:#4A235A;line-height:1.6;">
    ${p.descripcion}
  </div>` : ""}

  <!-- NOTAS INTERNAS -->
  ${p.notas ? `
  <div style="background:#FFF9C4;border:1.5px solid #F1C40F;border-radius:9px;padding:12px;margin-bottom:14px;">
    <div style="font-size:10px;font-weight:800;color:#856404;text-transform:uppercase;margin-bottom:4px;">⚠️ Notas / Observaciones internas</div>
    <div style="font-size:13px;color:#856404;">${p.notas}</div>
  </div>` : ""}

  <!-- MEDIDAS -->
  ${medsHTML}

  <!-- PERSONAS INTERNAS -->
  ${p.personas && p.personas.length ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:10px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #1A5276;padding-bottom:4px;margin-bottom:10px;">👥 Beneficiarios del pedido</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#1A5276;color:#fff;">
          <th style="padding:5px 8px;text-align:left;">#</th>
          <th style="padding:5px 8px;text-align:left;">Nombre</th>
          <th style="padding:5px 8px;text-align:left;">Cargo / Área</th>
          <th style="padding:5px 8px;text-align:center;">Gafete</th>
          <th style="padding:5px 8px;text-align:center;">Talla</th>
          <th style="padding:5px 8px;text-align:center;">✅ OK</th>
        </tr></thead>
        <tbody>
          ${p.personas.map((per, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f4f9f4"};border-bottom:1px solid #eee;">
            <td style="padding:5px 8px;color:#aaa;">${i + 1}</td>
            <td style="padding:5px 8px;font-weight:700;">${per.nombre || "—"}</td>
            <td style="padding:5px 8px;color:#555;">${per.cargo || "—"}</td>
            <td style="padding:5px 8px;text-align:center;">${per.gafete || "—"}</td>
            <td style="padding:5px 8px;text-align:center;font-weight:800;color:#1A5276;">${per.talla || "—"}</td>
            <td style="padding:5px 8px;text-align:center;">☐</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : ""}

  <!-- IMÁGENES -->
  ${imgHTML}

  <!-- CHECK DE PRODUCCIÓN -->
  <div class="sec" style="color:#27AE60;margin-top:20px;">✅ Control de calidad y entrega</div>
  <table style="border:1px solid #ddd;border-radius:8px;overflow:hidden;font-size:12px;">
    ${["Tela cortada correctamente", "Costuras revisadas", "Bordado aplicado", "Acabados y detalles", "Revisión final — lista para entregar"].map((paso, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"};">
      <td style="padding:9px 14px;width:50%;border-bottom:1px solid #eee;">${paso}</td>
      <td style="padding:9px 14px;width:50%;border-bottom:1px solid #eee;text-align:right;">
        <div style="display:inline-flex;align-items:center;gap:16px;">
          <span>☐ OK</span>
          <span>☐ Corrección</span>
        </div>
      </td>
    </tr>`).join("")}
  </table>

  <div style="margin-top:16px;text-align:center;font-size:10px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:10px;">
    ${TALLER} · Hoja de Producción N°${num} · ${fecha}
  </div>
  </body></html>`);
  w.document.close();
}
const INP = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#FAFAFA",
  fontFamily: "inherit"
};
const LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#888",
  marginBottom: 3,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: .4
};
const SEC = (c = "#9B59B6") => ({
  fontSize: 11,
  fontWeight: 800,
  color: c,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "14px 0 8px",
  borderBottom: "1px solid " + c + "33",
  paddingBottom: 3
});
const BTN = (bg = "#9B59B6", disabled = false) => ({
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: disabled ? "#ccc" : bg,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  fontSize: 14
});
function exportarExcelMes(pedidos, bordados, cuellos, periodo) {
  const pM = v => {
    const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const todos = [...pedidos.map(p => ({
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
function exportarPedidoPDF(pedido, tipo) {
  if (tipo === "confeccion") {
    imprimirRecibo(pedido, true);
  } else {
    const w = window.open("", "_blank", "width=820,height=1100");
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
      <button onclick="window.print()" style="padding:8px 20px;background:${color};color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:700;font-size:14px">🖨️ Imprimir / Guardar PDF</button>
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
    </body></html>`);
    w.document.close();
  }
}
async function gsCatalogoLeer() {
  const rows = await dbCatalogoLeer();
  return rows && rows.length > 0 ? rows : CATALOGO_BASE;
}
const gsCatalogoGuardar = dbCatalogoGuardar;
function App() {
  const [rol, setRol] = useState(null);
  const [seccion, setSec] = useState("pedidos");
  const [pedidos, setPedidos] = useState(() => {
    try {
      const d = localStorage.getItem("imis_pedidos");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextId, setNextId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_pedidos");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(p => Number(p.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  const [inventario, setInventario] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [modal, setModal] = useState(null);
  const [detalle, setDet] = useState(null);
  const [confirmar, setConf] = useState(null);
  const [busqueda, setBusq] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [sync, setSync] = useState("idle");
  const [progreso, setProgreso] = useState(null);
  const [errorFotos, setErrorFotos] = useState([]);
  const [visor, setVisor] = useState(null); // {imgs:[], idx:0}
  const [modalIA, setModalIA] = useState(false);
  const [modalArchivar, setModalArchivar] = useState(null);
  const [modalActMedidas, setModalActMedidas] = useState(null);
  const [masOpen, setMasOpen] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const pullStartRef = useRef(null);
  function refrescar() {
    if (refrescando) return;
    setRefrescando(true);
    pushToast("Actualizando datos...", "info", 1000);
    setTimeout(() => window.location.reload(), 250);
  }
  function onMainTouchStart(e) {
    const main = e.currentTarget;
    if (main.scrollTop > 5) {
      pullStartRef.current = null;
      return;
    }
    pullStartRef.current = e.touches[0].clientY;
  }
  function onMainTouchMove(e) {
    if (pullStartRef.current === null) return;
    const delta = e.touches[0].clientY - pullStartRef.current;
    if (delta > 0) {
      setPullDist(Math.min(delta * 0.5, 80));
    }
  }
  function onMainTouchEnd() {
    if (pullStartRef.current === null) return;
    pullStartRef.current = null;
    if (pullDist > 60) {
      refrescar();
    }
    setPullDist(0);
  }
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState(CATALOGO_BASE);
  const [bordados, setBordados] = useState(() => {
    try {
      const d = localStorage.getItem("imis_bordados");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextBordId, setNextBordId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_bordados");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(b => Number(b.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  const [cuellos, setCuellos] = useState(() => {
    try {
      const d = localStorage.getItem("imis_cuellos");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextCuelId, setNextCuelId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_cuellos");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(c => Number(c.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      const sinData = pedidos.map(p => ({
        ...p,
        imagenes: (p.imagenes || []).map(img => ({
          nombre: img.nombre,
          tipo: img.tipo,
          driveUrl: img.driveUrl || null,
          driveId: img.driveId || null,
          supabaseUrl: img.supabaseUrl || null,
          supabasePath: img.supabasePath || null
        }))
      }));
      localStorage.setItem("imis_pedidos", JSON.stringify(sinData));
    } catch {}
  }, [pedidos]);
  useEffect(() => {
    try {
      localStorage.setItem("imis_bordados", JSON.stringify(bordados));
    } catch {}
  }, [bordados]);
  useEffect(() => {
    try {
      localStorage.setItem("imis_cuellos", JSON.stringify(cuellos));
    } catch {}
  }, [cuellos]);
  const rolBase = (rol || "").startsWith("operario_") ? "operario" : rol;
  const esAdmin = rolBase === "admin";
  useEffect(() => {
    if (!rolBase) return;
    if (rol && rol.startsWith("operario_")) {
      const mod = rol.replace("operario_", "");
      if (["pedidos", "bordados", "cuellos"].includes(mod)) setSec(mod);
    }
    setSync("cargando");
    Promise.all([gsLeer(), idbLeerTodas(), gsBordLeer(), gsCuelLeer(), gsClientesLeer(), gsCatalogoLeer()]).then(([sheetsData, idbData, bordSh, cuelSh, cliSh, catSh]) => {
      console.log("Datos cargados — confección:", sheetsData.length, "bordados:", bordSh.length, "cuellos:", cuelSh.length, "clientes:", cliSh.length);
      if (sheetsData.length > 0) {
        const idbMap = Object.fromEntries(idbData.map(r => [String(r.pedidoId), r.imagenes || []]));
        const normFecha = v => {
          if (!v) return "";
          const s = String(v).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          try {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
              const yr = d.getFullYear();
              const mo = String(d.getMonth() + 1).padStart(2, "0");
              const da = String(d.getDate()).padStart(2, "0");
              return yr + "-" + mo + "-" + da;
            }
          } catch (e) {}
          return s;
        };
        const parseCampo = v => {
          if (Array.isArray(v) || typeof v === "object") return v;
          if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
            try {
              return JSON.parse(v);
            } catch {
              return [];
            }
          }
          return v;
        };
        const merged = sheetsData.map(p => {
          const rawImgs = parseCampo(p.imagenes);
          const sheetsImgs = Array.isArray(rawImgs) ? rawImgs : [];
          const localImgs = idbMap[String(p.id)] || [];
          const imgsMerged = sheetsImgs.map(sImg => {
            const local = localImgs.find(l => l.nombre === sImg.nombre && (l.data || l.driveUrl));
            return local ? {
              ...sImg,
              ...local,
              driveUrl: sImg.driveUrl || local.driveUrl
            } : sImg;
          });
          return {
            ...p,
            imagenes: imgsMerged,
            tallasItems: parseCampo(p.tallasItems),
            tallasQty: parseCampo(p.tallasQty),
            medidas: parseCampo(p.medidas),
            abonos: parseCampo(p.abonos) || [],
            personas: parseCampo(p.personas) || [],
            modoRegistro: p.modoRegistro || "tallas",
            fecha: normFecha(p.fecha),
            fechaEntrega: normFecha(p.fechaEntrega),
            fechaInicio: normFecha(p.fechaInicio)
          };
        });
        setPedidos(merged);
        setNextId(Math.max(...merged.map(p => Number(p.id) || 0)) + 1);
      }
      if (bordSh.length > 0) {
        const bordParsed = bordSh.map(b => ({
          ...b,
          abonos: parseCampo(b.abonos) || []
        }));
        setBordados(bordParsed);
        setNextBordId(Math.max(...bordParsed.map(b => Number(b.id) || 0)) + 1);
      }
      if (cuelSh.length > 0) {
        const cuelParsed = cuelSh.map(cu => ({
          ...cu,
          abonos: parseCampo(cu.abonos) || [],
          cuello: parseCampo(cu.cuello) || null,
          puno: parseCampo(cu.puno) || null,
          banda: parseCampo(cu.banda) || null
        }));
        setCuellos(cuelParsed);
        setNextCuelId(Math.max(...cuelParsed.map(c => Number(c.id) || 0)) + 1);
      }
      if (cliSh.length > 0) {
        setClientes(cliSh);
      } else {
        const mapaC = {};
        [...sheetsData, ...bordSh, ...cuelSh].forEach(p => {
          const nombre = (p.cliente || "").trim();
          if (!nombre) return;
          const key = nombre.toLowerCase();
          if (!mapaC[key]) mapaC[key] = {
            id: Object.keys(mapaC).length + 1,
            nombre,
            telefono: p.telefono || "",
            tipo: p.tipoCliente || "persona",
            contacto: p.nombreContacto || "",
            nit: p.nit || "",
            nrc: p.nrc || "",
            razonSocial: p.razonSocial || "",
            dirFiscal: p.dirFiscal || "",
            notas: "",
            fecha: hoy()
          };else {
            const ex = mapaC[key];
            if (!ex.telefono && p.telefono) ex.telefono = p.telefono;
            if (!ex.nit && p.nit) ex.nit = p.nit;
            if (!ex.nrc && p.nrc) ex.nrc = p.nrc;
          }
        });
        const listaCli = Object.values(mapaC);
        if (listaCli.length > 0) {
          setClientes(listaCli);
          listaCli.forEach(cli => gsClientesGuardar(cli));
        }
      }
      if (catSh && catSh.length > 0) setCatalogo(catSh);
      setSync("ok");
    }).catch(err => { console.warn("Carga parcial:", err); setSync("ok"); });
  }, [rolBase]);

  // Realtime: cuando otro dispositivo cambia algo en Postgres, refrescamos
  // sólo la tabla afectada (sin recargar toda la app). Debounce 300ms en el
  // cliente WS — varios eventos seguidos = una sola refetch.
  useEffect(() => {
    if (!rolBase) return;
    const refetchTabla = async (tabla) => {
      try {
        if (tabla === "pedidos" || tabla === "*") {
          const data = await gsLeer();
          if (data) setPedidos(prev => data.length > 0 ? data.map(p => ({
            ...p,
            tallasItems: Array.isArray(p.tallasItems) ? p.tallasItems : [],
            tallasQty: typeof p.tallasQty === "object" ? p.tallasQty : {},
            medidas: typeof p.medidas === "object" ? p.medidas : {},
            abonos: Array.isArray(p.abonos) ? p.abonos : [],
            personas: Array.isArray(p.personas) ? p.personas : [],
            imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
            modoRegistro: p.modoRegistro || "tallas"
          })) : prev);
        }
        if (tabla === "bordados" || tabla === "*") {
          const data = await gsBordLeer();
          if (data) setBordados(data);
        }
        if (tabla === "cuellos" || tabla === "*") {
          const data = await gsCuelLeer();
          if (data) setCuellos(data);
        }
        if (tabla === "clientes" || tabla === "*") {
          const data = await gsClientesLeer();
          if (data) setClientes(data);
        }
        if (tabla === "catalogo" || tabla === "*") {
          const data = await gsCatalogoLeer();
          if (data && data.length > 0) setCatalogo(data);
        }
      } catch (e) {
        console.warn("Refetch realtime falló:", e);
      }
    };
    const sub = suscribirCambios(
      ["pedidos","bordados","cuellos","clientes","catalogo"],
      refetchTabla
    );
    return () => sub.cerrar();
  }, [rolBase]);
  async function guardarPedido(form, _esNuevo) {
    const esNuevo = _esNuevo !== undefined ? _esNuevo : modal === "nuevo";
    const idPedido = esNuevo ? nextId : (modal || {}).id || form.id;
    const baseP = esNuevo ? {
      ...form,
      id: idPedido,
      fecha: hoy()
    } : {
      ...(modal || {}),
      ...form,
      id: idPedido
    };
    setModal(null);
    setSync("guardando");
    const pendientes = (baseP.imagenes || []).filter(i => i.data && !i.driveUrl && !i.supabaseUrl);
    let imagenesFinales = [...(baseP.imagenes || [])];
    const erroresSubida = [];
    if (pendientes.length > 0) {
      setProgreso({
        actual: 0,
        total: pendientes.length,
        errores: 0
      });
      let completadas = 0;
      imagenesFinales = await Promise.all((baseP.imagenes || []).map(async img => {
        if (!img.data || img.driveUrl || img.supabaseUrl) return img;
        const res = await subirFotoSupabase(img.data, img.nombre, "confeccion", baseP.cliente);
        let imgResult = img;
        if (res.ok) {
          imgResult = {
            ...img,
            supabaseUrl: res.url,
            supabasePath: res.path
          };
        } else {
          erroresSubida.push({
            nombre: img.nombre || "foto",
            err: res.err
          });
        }
        completadas++;
        setProgreso({
          actual: completadas,
          total: pendientes.length,
          errores: erroresSubida.length
        });
        return imgResult;
      }));
      setProgreso(null);
    }
    const p = {
      ...baseP,
      imagenes: imagenesFinales
    };
    if (esNuevo) {
      setPedidos(prev => [...prev, p]);
      setNextId(n => n + 1);
    } else {
      setPedidos(prev => prev.map(x => x.id === p.id ? p : x));
    }
    upsertClienteLocal(p.cliente, {
      telefono: p.telefono,
      tipo: p.tipoCliente,
      contacto: p.nombreContacto,
      nit: p.nit,
      nrc: p.nrc,
      razonSocial: p.razonSocial,
      dirFiscal: p.dirFiscal
    });
    const tieneMedsNuevas = p.medidas && Object.values(p.medidas).some(v => v);
    if (tieneMedsNuevas) {
      const cliIdx = clientes.findIndex(cl => cl.nombre.toLowerCase() === p.cliente.toLowerCase());
      if (cliIdx >= 0) {
        const cliActual = clientes[cliIdx];
        const medsCli = cliActual.medidas || {};
        const hayDiferencia = Object.entries(p.medidas).some(([k, v]) => v && medsCli[k] !== v);
        if (hayDiferencia) {
          setModalActMedidas({
            pedido: p,
            cliente: cliActual
          });
        }
      }
    }
    try {
      await Promise.all([gsGuardar(p), idbGuardar(p.id, p.imagenes)]);
      if (erroresSubida.length > 0) {
        setSync("error_fotos");
        setErrorFotos(erroresSubida);
        pushToast("Pedido guardado, pero " + erroresSubida.length + " foto" + (erroresSubida.length === 1 ? "" : "s") + " no se subieron", "error", 5000);
      } else {
        setSync("ok");
        pushToast("Pedido " + (esNuevo ? "creado" : "actualizado") + " ✓", "success");
      }
    } catch (err) {
      setSync("error");
      const msg = err && err.name === "AbortError" ? "Servidor no responde. El pedido quedó local — sincronizará cuando vuelva la red." : "Error al guardar. Revisá la conexión.";
      pushToast(msg, "error", 5000);
    }
  }
  function upsertClienteLocal(nombre, extra = {}) {
    if (!nombre || !nombre.trim()) return;
    const key = nombre.trim().toLowerCase();
    setClientes(prev => {
      const idx = prev.findIndex(c => c.nombre.toLowerCase() === key);
      if (idx >= 0) {
        const ex = {
          ...prev[idx]
        };
        if (!ex.telefono && extra.telefono) ex.telefono = extra.telefono;
        if (!ex.tipo && extra.tipo) ex.tipo = extra.tipo;
        if (!ex.contacto && extra.contacto) ex.contacto = extra.contacto;
        if (!ex.nit && extra.nit) ex.nit = extra.nit;
        if (!ex.nrc && extra.nrc) ex.nrc = extra.nrc;
        if (!ex.razonSocial && extra.razonSocial) ex.razonSocial = extra.razonSocial;
        if (!ex.dirFiscal && extra.dirFiscal) ex.dirFiscal = extra.dirFiscal;
        gsClientesGuardar(ex);
        const nuevos = [...prev];
        nuevos[idx] = ex;
        return nuevos;
      } else {
        const nuevo = {
          id: prev.length ? Math.max(...prev.map(c => c.id || 0)) + 1 : 1,
          nombre: nombre.trim(),
          fecha: hoy(),
          ...extra
        };
        gsClientesGuardar(nuevo);
        return [...prev, nuevo];
      }
    });
  }
  async function cambiarEstatus(id, est) {
    const lista = pedidos.map(p => p.id === id ? {
      ...p,
      estatus: est
    } : p);
    setPedidos(lista);
    try {
      await gsGuardar(lista.find(p => p.id === id));
    } catch {}
  }
  async function eliminar(id) {
    setPedidos(p => p.filter(x => x.id !== id));
    setConf(null);
    try {
      await Promise.all([gsBorrar(id), idbBorrar(id)]);
    } catch {}
  }
  const diasPara = f => f ? Math.ceil((new Date(f + "T12:00:00") - new Date()) / 86400000) : null;
  const vencidosSinArchivar = useMemo(() => pedidos.filter(p => {
    if (["Entregado", "Cancelado", "Listo", "Archivado"].includes(p.estatus)) return false;
    const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
    if (saldo > 0) return false;
    const d = diasPara(p.fechaEntrega);
    return d !== null && d < 0;
  }), [pedidos]);
  function archivarPedido(p, fechaEntregaReal) {
    const actualizado = {
      ...p,
      estatus: "Entregado",
      fechaEntrega: fechaEntregaReal || p.fechaEntrega
    };
    setPedidos(prev => prev.map(x => x.id === p.id ? actualizado : x));
    gsGuardar(actualizado);
    setModalArchivar(null);
  }
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return pedidos.filter(p => {
      const match = !q || [p.cliente, p.tipoPrenda, p.tela, p.color, p.costurera, p.notas, p.descripcion, p.nombreContacto, p.estatus, String(p.id || ""), p.fechaEntrega, p.tipoDocumento].some(v => v && String(v).toLowerCase().includes(q));
      return match && (filtro === "Todos" || p.estatus === filtro);
    });
  }, [pedidos, busqueda, filtro]);
  const conteos = useMemo(() => ESTATUS.reduce((a, e) => ({
    ...a,
    [e]: pedidos.filter(p => p.estatus === e).length
  }), {}), [pedidos]);
  const parseMonto = v => {
    const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const porCobrar = useMemo(() => [...pedidos.filter(p => p.estatus !== "Cancelado"), ...bordados.filter(b => b.estatus !== "Cancelado"), ...cuellos.filter(c => c.estatus !== "Cancelado")].reduce((s, p) => {
    const precio = parseMonto(p.precio || p.precioT);
    const anticipo = parseMonto(p.anticipo);
    const saldo = precio - anticipo;
    return saldo > 0 ? s + saldo : s;
  }, 0), [pedidos, bordados, cuellos]);
  const alertaCF = useMemo(() => pedidos.filter(p => p.tipoDocumento === "Crédito Fiscal (pendiente datos)").length, [pedidos]);
  const activos = useMemo(() => pedidos.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).length + bordados.filter(b => !["Entregado", "Cancelado"].includes(b.estatus)).length + cuellos.filter(c => !["Entregado", "Cancelado"].includes(c.estatus)).length, [pedidos, bordados, cuellos]);
  const matAgotados = useMemo(() => inventario.filter(m => m.categoria === "material" && m.cantidad - asignaciones.filter(a => a.materialId === m.id).reduce((s, a) => s + a.cantidad, 0) <= 0).length, [inventario, asignaciones]);
  const syncInfo = {
    idle: {
      c: "#aaa",
      t: ""
    },
    cargando: {
      c: "#FFC107",
      t: "⏳ Cargando..."
    },
    guardando: {
      c: "#FFC107",
      t: "⏳ Guardando..."
    },
    ok: {
      c: "#28A745",
      t: "✅ Sync"
    },
    error: {
      c: "#DC3545",
      t: "⚠️ Sin conexión"
    },
    error_fotos: {
      c: "#E67E22",
      t: "⚠️ Fotos no subidas"
    }
  }[sync];
  if (!rolBase) return /*#__PURE__*/React.createElement(PantallaLogin, {
    onLogin: setRol
  });
  const moduloOperario = (rol || "").startsWith("operario_") ? rol.replace("operario_", "") : null;
  const NAV = esAdmin ? [{
    id: "estadisticas",
    label: "Estadísticas",
    icon: "📊"
  }, {
    id: "pedidos",
    label: "Confección",
    icon: "✂️"
  }, {
    id: "bordados",
    label: "Bordados",
    icon: "🪡"
  }, {
    id: "cuellos",
    label: "Cuellos",
    icon: "🧶"
  }, {
    id: "inventario",
    label: "Inventario",
    icon: "📦",
    soloAdmin: true
  }, {
    id: "catalogo",
    label: "Catálogo",
    icon: "🧵"
  }, {
    id: "clientes",
    label: "Clientes",
    icon: "👥"
  }, {
    id: "papelera",
    label: "Papelera",
    icon: "🗑️",
    soloAdmin: true
  }] : moduloOperario === "pedidos" ? [{
    id: "pedidos",
    label: "Confección",
    icon: "✂️"
  }] : moduloOperario === "bordados" ? [{
    id: "bordados",
    label: "Bordados",
    icon: "🪡"
  }] : moduloOperario === "cuellos" ? [{
    id: "cuellos",
    label: "Cuellos",
    icon: "🧶"
  }] : [{
    id: "pedidos",
    label: "Confección",
    icon: "✂️"
  }];
  const NAV_IDS_VISIBLES = ["pedidos", "bordados", "cuellos", "inventario"];
  const renderItemBottom = item => {
    const bloqueado = item.pronto || item.soloAdmin && !esAdmin;
    const activo = seccion === item.id;
    const badgeCount = item.id === "pedidos" ? vencidosSinArchivar.length : item.id === "inventario" ? matAgotados : 0;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      onClick: () => {
        if (bloqueado) return;
        setSec(item.id);
        setMasOpen(false);
      },
      style: {
        flex: 1,
        border: "none",
        background: "transparent",
        cursor: bloqueado ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 0",
        opacity: bloqueado ? 0.3 : 1,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20,
        position: "relative"
      }
    }, item.icon, badgeCount > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: -4,
        right: -10,
        background: "#DC3545",
        color: "#fff",
        fontSize: 9,
        fontWeight: 800,
        padding: "1px 5px",
        borderRadius: 10,
        minWidth: 16,
        textAlign: "center",
        lineHeight: 1.2
      }
    }, badgeCount > 9 ? "9+" : badgeCount)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: activo ? "#CE93D8" : "#888"
      }
    }, item.label));
  };
  function renderBottomNav() {
    const navVisible = NAV.filter(item => NAV_IDS_VISIBLES.includes(item.id));
    const navOculto = NAV.filter(item => !NAV_IDS_VISIBLES.includes(item.id));
    const ultBoton = navOculto.length > 0 ? /*#__PURE__*/React.createElement("button", {
      key: "_mas",
      onClick: () => setMasOpen(true),
      style: {
        flex: 1,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 0"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, "···"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: masOpen ? "#CE93D8" : "#888"
      }
    }, "Más")) : /*#__PURE__*/React.createElement("button", {
      key: "_salir",
      onClick: () => setRol(null),
      style: {
        flex: 1,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 0"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, "🚪"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: "#888"
      }
    }, "Salir"));
    return /*#__PURE__*/React.createElement("nav", {
      className: "bottomnav",
      style: {
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#2C1654",
        borderTop: "1px solid #3a1f6b",
        zIndex: 50,
        padding: "6px 0 8px"
      }
    }, navVisible.map(renderItemBottom), ultBoton);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100vh"
    }
  }, progreso && /*#__PURE__*/React.createElement(BarraProgreso, {
    actual: progreso.actual,
    total: progreso.total,
    errores: progreso.errores || 0
  }), /*#__PURE__*/React.createElement("aside", {
    className: "sidebar-desktop",
    style: {
      width: 196,
      background: "#2C1654",
      flexDirection: "column",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 16px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 2,
      color: "#9B59B6",
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, TALLER), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "#fff",
      fontFamily: "Georgia,serif",
      lineHeight: 1.3
    }
  }, "Sistema de", /*#__PURE__*/React.createElement("br", null), "Pedidos"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      background: esAdmin ? "#9B59B6" : "#3a1f6b",
      color: "#fff",
      padding: "2px 8px",
      borderRadius: 20,
      fontWeight: 700
    }
  }, esAdmin ? "🔐 Admin" : "✂️ Operario")), (sync === "ok" || sync === "error" || sync === "error_fotos") && syncInfo && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: syncInfo.c,
      fontWeight: 700,
      marginTop: 6
    }
  }, syncInfo.t)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: "4px 8px"
    }
  }, NAV.map(item => {
    const bloqueado = item.pronto || item.soloAdmin && !esAdmin;
    const activo = seccion === item.id;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      onClick: () => !bloqueado && setSec(item.id),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 10px",
        borderRadius: 8,
        border: "none",
        background: activo ? "rgba(155,89,182,0.25)" : "transparent",
        color: bloqueado ? "#3a2060" : activo ? "#CE93D8" : "#bbb",
        cursor: bloqueado ? "default" : "pointer",
        fontSize: 12,
        fontWeight: activo ? 700 : 400,
        textAlign: "left",
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", null, item.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, item.label), item.id === "inventario" && matAgotados > 0 && !bloqueado && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: "#DC3545",
        color: "#fff",
        padding: "1px 5px",
        borderRadius: 10,
        fontWeight: 700
      }
    }, "\u26A0\uFE0F"), item.pronto && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        background: "#3a1f6b",
        color: "#555",
        padding: "2px 5px",
        borderRadius: 8
      }
    }, "PRONTO"), item.soloAdmin && !esAdmin && !item.pronto && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        background: "#3a1f6b",
        color: "#555",
        padding: "2px 5px",
        borderRadius: 8
      }
    }, "\uD83D\uDD10"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderTop: "1px solid #3a1f6b"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#666",
      marginBottom: 2
    }
  }, "Pedidos activos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: "#CE93D8",
      marginBottom: 6
    }
  }, activos), esAdmin && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#666",
      marginBottom: 2
    }
  }, "Por cobrar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "#28A745",
      marginBottom: 8
    }
  }, fmt$(porCobrar)), alertaCF > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFF3CD",
      borderRadius: 8,
      padding: "5px 8px",
      fontSize: 10,
      color: "#856404",
      fontWeight: 700,
      marginBottom: 8
    }
  }, "\u26A0\uFE0F ", alertaCF, " CF pend.")), /*#__PURE__*/React.createElement("button", {
    onClick: refrescar,
    disabled: refrescando,
    style: {
      width: "100%",
      padding: "7px",
      borderRadius: 8,
      border: "1px solid #3a1f6b",
      background: "transparent",
      color: "#9B59B6",
      cursor: refrescando ? "default" : "pointer",
      fontSize: 11,
      marginBottom: 6,
      opacity: refrescando ? 0.5 : 1
    }
  }, refrescando ? "\u23F3 Actualizando..." : "\uD83D\uDD04 Actualizar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setRol(null),
    style: {
      width: "100%",
      padding: "7px",
      borderRadius: 8,
      border: "1px solid #3a1f6b",
      background: "transparent",
      color: "#555",
      cursor: "pointer",
      fontSize: 11
    }
  }, "\uD83D\uDEAA Cerrar sesi\xF3n"))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar-mobile",
    style: {
      display: "none",
      background: "#2C1654",
      padding: "10px 16px",
      alignItems: "center",
      gap: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: "#fff"
    }
  }, TALLER), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#9B59B6"
    }
  }, esAdmin ? "🔐 Admin" : "✂️ Operario", (sync === "ok" || sync === "error" || sync === "error_fotos") && syncInfo ? ` · ` + syncInfo.t : "")), esAdmin && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#28A745",
      fontWeight: 700
    }
  }, fmt$(porCobrar)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#9B59B6"
    }
  }, "Por cobrar")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "6px 10px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#CE93D8"
    }
  }, activos), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#9B59B6"
    }
  }, "activos")), /*#__PURE__*/React.createElement("button", {
    onClick: refrescar,
    disabled: refrescando,
    title: "Actualizar datos",
    style: {
      background: "rgba(255,255,255,0.1)",
      border: "none",
      color: "#CE93D8",
      width: 40,
      height: 40,
      borderRadius: 8,
      fontSize: 18,
      cursor: refrescando ? "default" : "pointer",
      opacity: refrescando ? 0.5 : 1
    }
  }, refrescando ? "⏳" : "🔄")), seccion === "estadisticas" && esAdmin && /*#__PURE__*/React.createElement(SeccionEstadisticas, {
    pedidos: pedidos,
    bordados: bordados,
    cuellos: cuellos,
    onExportarExcel: exportarExcelMes
  }), seccion === "inventario" && /*#__PURE__*/React.createElement(SeccionInventario, {
    pedidos: pedidos,
    inventario: inventario,
    setInventario: setInventario,
    asignaciones: asignaciones,
    setAsignaciones: setAsignaciones,
    esAdmin: esAdmin
  }), seccion === "bordados" && /*#__PURE__*/React.createElement(SeccionBordados, {
    bordados: bordados,
    setBordados: setBordados,
    nextBordId: nextBordId,
    setNextBordId: setNextBordId,
    pedidosConf: pedidos,
    esAdmin: esAdmin,
    clientes: clientes,
    upsertClienteLocal: upsertClienteLocal,
    exportarPedidoPDF: exportarPedidoPDF
  }), seccion === "cuellos" && /*#__PURE__*/React.createElement(SeccionCuellos, {
    cuellos: cuellos,
    setCuellos: setCuellos,
    nextCuelId: nextCuelId,
    setNextCuelId: setNextCuelId,
    pedidosConf: pedidos,
    esAdmin: esAdmin,
    clientes: clientes,
    upsertClienteLocal: upsertClienteLocal,
    exportarPedidoPDF: exportarPedidoPDF
  }), seccion === "catalogo" && /*#__PURE__*/React.createElement(SeccionCatalogo, {
    catalogo: catalogo,
    setCatalogo: setCatalogo,
    esAdmin: esAdmin
  }), seccion === "clientes" && esAdmin && /*#__PURE__*/React.createElement(SeccionClientes, {
    clientes: clientes,
    setClientes: setClientes,
    pedidos: pedidos,
    bordados: bordados,
    cuellos: cuellos,
    esAdmin: esAdmin
  }), seccion === "papelera" && esAdmin && /*#__PURE__*/React.createElement(React.Suspense, {
    fallback: /*#__PURE__*/React.createElement("div", { style: { padding: 32, textAlign: "center", color: "#999" } }, "⏳ Cargando papelera...")
  }, /*#__PURE__*/React.createElement(SeccionPapeleraLazy, {
    onRestaurado: refrescar
  })), seccion === "pedidos" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      background: "#fff",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "#2C1654",
      fontWeight: 800,
      fontFamily: "Georgia,serif"
    }
  }, "Registro de Pedidos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, pedidos.length, " pedido(s)")), /*#__PURE__*/React.createElement("input", {
    className: "search-pedidos",
    value: busqueda,
    onChange: e => setBusq(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar...",
    style: {
      ...INP,
      padding: "7px 10px",
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal("nuevo"),
    style: {
      ...BTN("#9B59B6"),
      whiteSpace: "nowrap",
      padding: "9px 14px",
      fontSize: 13
    }
  }, "\u2702\uFE0F Nuevo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      background: "#fff",
      borderBottom: "1px solid #eee",
      padding: "0 12px",
      overflowX: "auto",
      flexShrink: 0
    }
  }, ["Todos", ...ESTATUS].map(s => {
    const count = s === "Todos" ? pedidos.length : conteos[s] || 0;
    const active = filtro === s;
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => setFiltro(s),
      style: {
        padding: "7px 8px",
        border: "none",
        background: "none",
        borderBottom: active ? "2.5px solid #9B59B6" : "2.5px solid transparent",
        color: active ? "#9B59B6" : "#999",
        fontWeight: active ? 700 : 400,
        cursor: "pointer",
        fontSize: 10,
        display: "flex",
        alignItems: "center",
        gap: 3,
        whiteSpace: "nowrap"
      }
    }, s, /*#__PURE__*/React.createElement("span", {
      style: {
        background: active ? "#9B59B6" : "#eee",
        color: active ? "#fff" : "#aaa",
        borderRadius: 20,
        padding: "1px 5px",
        fontSize: 10,
        fontWeight: 700
      }
    }, count));
  })), /*#__PURE__*/React.createElement("div", {
    className: "main-area",
    onTouchStart: onMainTouchStart,
    onTouchMove: onMainTouchMove,
    onTouchEnd: onMainTouchEnd,
    style: {
      flex: 1,
      overflow: "auto",
      padding: 12,
      transform: pullDist > 0 ? "translateY(" + pullDist + "px)" : undefined,
      transition: pullDist === 0 ? "transform 0.2s" : undefined
    }
  }, pullDist > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -pullDist,
      left: 0,
      right: 0,
      height: pullDist,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#9B59B6",
      fontWeight: 700,
      fontSize: 13,
      pointerEvents: "none"
    }
  }, pullDist > 60 ? "↓ Soltá para actualizar" : "↓ Tirá para actualizar"), vencidosSinArchivar.length > 0 && /*#__PURE__*/React.createElement("div", {
    onClick: () => setModalArchivar(vencidosSinArchivar[0]),
    style: {
      background: "#FFF3CD",
      border: "1.5px solid #FFE082",
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "📦"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#856404"
    }
  }, vencidosSinArchivar.length, " pedido", vencidosSinArchivar.length === 1 ? "" : "s", " vencido", vencidosSinArchivar.length === 1 ? "" : "s", " sin archivar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#a07c0a"
    }
  }, "Toc\xE1 para revisar y marcar como entregado")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      color: "#856404",
      fontWeight: 700
    }
  }, "→")), /*#__PURE__*/React.createElement(ProximasEntregas, {
    pedidos: pedidos,
    diasPara: diasPara,
    esAdmin: esAdmin,
    onVer: setDet,
    onEditar: setModal,
    onWA: p => copiarWA(p, esAdmin)
  }), filtrados.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 60,
      color: "#ccc"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 10
    }
  }, "\uD83E\uDDF5"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "#aaa"
    }
  }, sync === "cargando" ? "Cargando pedidos..." : "No hay pedidos registrados"), sync === "ok" && pedidos.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "#FFF8E1",
      border: "1px solid #FFE082",
      borderRadius: 8,
      padding: "10px 16px",
      fontSize: 12,
      color: "#856404",
      maxWidth: 380,
      margin: "12px auto 0"
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Diagn\xF3stico:"), " No hay datos en la base.", /*#__PURE__*/React.createElement("br", null), "Verifica en la consola del navegador (F12 \u2192 Console) el mensaje \"Datos cargados\".")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("table", {
    className: "tabla-pedidos",
    style: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0 4px"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ["#", "Cliente", "Prenda / Tallas", "Fotos", esAdmin ? "Factura" : null, esAdmin ? "$ / Saldo" : null, "Entrega", "Estatus", ""].filter(Boolean).map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      textAlign: "left",
      padding: "5px 10px",
      fontSize: 9,
      fontWeight: 700,
      color: "#ccc",
      textTransform: "uppercase"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtrados.map(p => {
    const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
    const dias = diasPara(p.fechaEntrega);
    const urgent = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(p.estatus);
    const esCFp = p.tipoDocumento === "Crédito Fiscal (pendiente datos)";
    const tallasR = resumenTallas(p);
    const imgs = (p.imagenes || []).filter(i => imgSrc(i));
    const nFotos = imgs.length;
    const nAsig = asignaciones.filter(a => a.pedidoId === String(p.id)).length;
    return /*#__PURE__*/React.createElement("tr", {
      key: p.id,
      onClick: () => setDet(p),
      style: {
        background: "#fff",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px",
        borderRadius: "10px 0 0 10px",
        color: "#ccc",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }
    }, "N\xB0", String(p.id).padStart(4, "0")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#2C1654",
        fontSize: 13
      }
    }, p.tipoCliente === "escuela" ? "🏫 " : p.tipoCliente === "empresa" ? "🏢 " : "", p.cliente), p.nombreContacto && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#555"
      }
    }, "\uD83D\uDC64 ", p.nombreContacto), p.costurera && p.costurera !== "(Sin asignar)" && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#9B59B6"
      }
    }, "\u2702\uFE0F ", p.costurera), esAdmin && nAsig > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#27AE60"
      }
    }, "\uD83E\uDDF5 ", nAsig)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#444",
        marginBottom: p.tallasItems && p.tallasItems.length ? 4 : 0
      }
    }, p.tipoPrenda), p.tallasItems && p.tallasItems.length ? /*#__PURE__*/React.createElement(TallasChips, {
      items: p.tallasItems,
      compact: true
    }) : tallasR ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#E67E22",
        fontWeight: 700
      }
    }, tallasR) : null), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, nFotos > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, imgs.slice(0, 2).map((img, i) => /*#__PURE__*/React.createElement("img", {
      key: i,
      src: imgSrc(img),
      onClick: () => setVisor({
        imgs: imgs.map(imgSrc),
        idx: i
      }),
      style: {
        width: 32,
        height: 32,
        borderRadius: 5,
        objectFit: "cover",
        border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e0e0e0"),
        cursor: "zoom-in"
      }
    })), nFotos > 2 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#888",
        fontWeight: 700
      }
    }, "+", nFotos - 2)) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd",
        fontSize: 11
      }
    }, "\u2014")), esAdmin && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, p.tipoDocumento === "Consumidor Final" ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#ccc"
      }
    }, "Consumidor") : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: esCFp ? "#FFF3CD" : "#D4EDDA",
        color: esCFp ? "#856404" : "#155724",
        padding: "2px 7px",
        borderRadius: 20,
        fontWeight: 700
      }
    }, esCFp ? "⚠️ CF pend." : "✅ CF")), esAdmin && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px",
        whiteSpace: "nowrap"
      }
    }, p.precio ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#2C1654",
        fontSize: 13
      }
    }, fmt$(p.precio)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: saldo > 0 ? "#E63946" : "#28A745"
      }
    }, saldo > 0 ? "Resta " + fmt$(saldo) : "✅ Pagado")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd"
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px",
        whiteSpace: "nowrap"
      }
    }, p.fechaEntrega ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: urgent ? "#E63946" : "#555",
        fontWeight: urgent ? 700 : 400
      }
    }, urgent ? "⚠️ " : "", p.fechaEntrega), dias !== null && !["Entregado", "Cancelado"].includes(p.estatus) && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: dias < 0 ? "#E63946" : dias <= 2 ? "#FD7E14" : "#aaa"
      }
    }, dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd",
        fontSize: 11
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, /*#__PURE__*/React.createElement("select", {
      value: p.estatus,
      onChange: e => cambiarEstatus(p.id, e.target.value),
      style: {
        border: "none",
        background: (EC[p.estatus] || {}).bg,
        color: (EC[p.estatus] || {}).fg,
        padding: "3px 8px",
        borderRadius: 20,
        fontWeight: 700,
        fontSize: 10,
        cursor: "pointer"
      }
    }, ESTATUS.map(e => /*#__PURE__*/React.createElement("option", {
      key: e
    }, e)))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px",
        borderRadius: "0 10px 10px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3
      }
    }, /*#__PURE__*/React.createElement(WABtn, {
      p: p,
      esAdmin: esAdmin
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => imprimirPedido(p, esAdmin),
      title: "Imprimir hoja",
      style: {
        padding: "4px 8px",
        borderRadius: 6,
        border: "1.5px solid #d8c0f0",
        background: "#f8f4ff",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\uD83D\uDDA8\uFE0F"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(p),
      style: {
        padding: "4px 8px",
        borderRadius: 6,
        border: "1.5px solid #e0e0e0",
        background: "#fff",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\u270F\uFE0F"), esAdmin && /*#__PURE__*/React.createElement("button", {
      onClick: () => setConf(p.id),
      style: {
        padding: "4px 7px",
        borderRadius: 6,
        border: "1.5px solid #fdd",
        background: "#fff8f8",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\uD83D\uDDD1\uFE0F"))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cards-pedidos",
    style: {
      flexDirection: "column",
      display: "none"
    }
  }, filtrados.map(p => /*#__PURE__*/React.createElement(CardPedido, {
    key: p.id,
    p: p,
    esAdmin: esAdmin,
    onVer: setDet,
    onEditar: setModal,
    onCambiarEstatus: cambiarEstatus,
    onEliminar: setConf,
    onDuplicar: p => {
      const copia = Object.assign({}, p, {
        id: nextId,
        fecha: new Date().toISOString().split("T")[0],
        estatus: "Tomado",
        anticipo: "",
        abonos: [],
        fechaEntrega: ""
      });
      setModal(copia);
    },
    onImprimir: p => imprimirPedido(p, esAdmin),
    onVerFoto: v => setVisor(v)
  })))))), renderBottomNav(), masOpen && /*#__PURE__*/React.createElement("div", {
    onClick: () => setMasOpen(false),
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 150
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "#2C1654",
      borderRadius: "16px 16px 0 0",
      width: "100%",
      maxWidth: 480,
      padding: "16px 8px",
      paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 4,
      background: "#9B59B6",
      borderRadius: 2,
      margin: "0 auto 14px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 4
    }
  }, NAV.filter(item => !["pedidos", "bordados", "cuellos", "inventario"].includes(item.id)).map(item => {
    const bloqueado = item.pronto || item.soloAdmin && !esAdmin;
    const activo = seccion === item.id;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      onClick: () => {
        if (bloqueado) return;
        setSec(item.id);
        setMasOpen(false);
      },
      style: {
        border: "none",
        background: activo ? "rgba(155,89,182,0.25)" : "transparent",
        cursor: bloqueado ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "12px 4px",
        borderRadius: 10,
        opacity: bloqueado ? 0.3 : 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 26
      }
    }, item.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: activo ? "#CE93D8" : "#bbb"
      }
    }, item.label));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRol(null);
      setMasOpen(false);
    },
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      padding: "12px 4px",
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 26
    }
  }, "\uD83D\uDEAA"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#bbb"
    }
  }, "Salir")))))), modalArchivar && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 28,
      maxWidth: 420,
      width: "100%",
      boxShadow: "0 24px 60px rgba(0,0,0,0.3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 8
    }
  }, "\uD83D\uDCE6"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 6px",
      color: "#2C1654",
      fontSize: 17
    }
  }, "Pedido vencido \u2014 \xBFfue entregado?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: "0 0 4px"
    }
  }, "El pedido de ", /*#__PURE__*/React.createElement("strong", null, modalArchivar.cliente), " ya venci\xF3 su fecha de entrega."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 12
    }
  }, "Si fue entregado, se archivar\xE1 autom\xE1ticamente.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8f4ff",
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#2C1654"
    }
  }, "N\xB0", String(modalArchivar.id).padStart(4, "0"), " \u2014 ", modalArchivar.cliente), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#666",
      marginTop: 2
    }
  }, modalArchivar.tipoPrenda), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#C0392B",
      fontWeight: 700,
      marginTop: 2
    }
  }, "Fecha pactada: ", modalArchivar.fechaEntrega)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 4,
      display: "block"
    }
  }, "\xBFCu\xE1ndo fue entregado?"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    id: "fecha-entrega-real",
    defaultValue: hoy(),
    style: {
      width: "100%",
      padding: "9px 12px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      fontSize: 14,
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const f = document.getElementById("fecha-entrega-real") ? document.getElementById("fecha-entrega-real").value : hoy();
      archivarPedido(modalArchivar, f);
    },
    style: {
      padding: "11px",
      borderRadius: 8,
      border: "none",
      background: "#28A745",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14
    }
  }, "\u2705 S\xED, fue entregado \u2014 archivar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const actualizado = {
        ...modalArchivar,
        estatus: "Listo"
      };
      setPedidos(prev => prev.map(x => x.id === modalArchivar.id ? actualizado : x));
      gsGuardar(actualizado);
      setModalArchivar(null);
    },
    style: {
      padding: "11px",
      borderRadius: 8,
      border: "1.5px solid #E67E22",
      background: "#fff",
      color: "#E67E22",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13
    }
  }, "\uD83D\uDD50 Todav\xEDa no \u2014 cambiar a \"Listo\""), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalArchivar(null),
    style: {
      padding: "9px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      color: "#aaa",
      cursor: "pointer",
      fontSize: 12
    }
  }, "Recordar despu\xE9s")))), modalIA && /*#__PURE__*/React.createElement(ModalAsistenteIA, {
    rol: rol,
    onCrearPedido: p => {
      setModalIA(false);
      guardarPedido(p, true);
    },
    onAbrir: p => {
      setModalIA(false);
      setModal(p || "nuevo");
    },
    onCerrar: () => setModalIA(false)
  }), modal && /*#__PURE__*/React.createElement(Modal, {
    title: modal === "nuevo" ? "✂️ Nuevo Pedido" : "✏️ Editar N°" + String(modal.id).padStart(4, "0"),
    onClose: () => setModal(null)
  }, modal === "nuevo" && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(null);
      setModalIA(true);
    },
    style: {
      width: "100%",
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid #1A5276",
      background: "#EBF5FB",
      color: "#1A5276",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, "\uD83E\uDD16 Registrar con Asistente IA (voz o texto)"), /*#__PURE__*/React.createElement(FormPedido, {
    initial: modal !== "nuevo" ? modal : null,
    onSave: guardarPedido,
    onCancel: () => setModal(null),
    rol: rol,
    pedidosExistentes: pedidos,
    clientes: clientes,
    catalogo: catalogo
  })), detalle && /*#__PURE__*/React.createElement(Modal, {
    title: "📋 N°" + String(detalle.id).padStart(4, "0") + " — " + detalle.cliente,
    onClose: () => setDet(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, "Estatus"), /*#__PURE__*/React.createElement("select", {
    value: detalle.estatus,
    onChange: e => {
      const nuevo = {
        ...detalle,
        estatus: e.target.value
      };
      setDet(nuevo);
      cambiarEstatus(detalle.id, e.target.value);
    },
    style: {
      width: "100%",
      padding: "9px 10px",
      borderRadius: 8,
      border: "1.5px solid " + ((EC[detalle.estatus] || {}).bg || "#e0e0e0"),
      background: (EC[detalle.estatus] || {}).bg || "#f5f5f5",
      color: (EC[detalle.estatus] || {}).fg || "#333",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      outline: "none"
    }
  }, ESTATUS.map(e => /*#__PURE__*/React.createElement("option", {
    key: e
  }, e)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, "Costurera"), /*#__PURE__*/React.createElement("select", {
    value: detalle.costurera || "(Sin asignar)",
    onChange: e => {
      const nuevo = {
        ...detalle,
        costurera: e.target.value
      };
      setDet(nuevo);
      setPedidos(prev => prev.map(p => p.id === detalle.id ? nuevo : p));
      gsGuardar(nuevo);
    },
    style: {
      width: "100%",
      padding: "9px 10px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#f8f4ff",
      color: "#2C1654",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      outline: "none"
    }
  }, COLABORADORAS.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c))))), [["Cliente", (detalle.tipoCliente === "escuela" ? "🏫 " : detalle.tipoCliente === "empresa" ? "🏢 " : "") + detalle.cliente], detalle.nombreContacto ? ["Contacto", detalle.nombreContacto] : null, ["Teléfono", detalle.telefono], ["Prenda", detalle.tipoPrenda], ["Tallas", detalle.tallasItems && detalle.tallasItems.length ? "§chips§" : resumenTallas(detalle)], detalle.personas && detalle.personas.length ? ["👥 Beneficiarios", detalle.personas.length + " persona" + (detalle.personas.length !== 1 ? "s" : "")] : null, ["Tela", detalle.tela], esAdmin ? ["Facturación", detalle.tipoDocumento] : null, esAdmin && detalle.nit ? ["NIT", detalle.nit] : null, esAdmin ? ["Precio", fmt$(detalle.precio)] : null, esAdmin ? ["Abonado", fmt$((detalle.abonos || []).length > 0 ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0) : parseFloat(detalle.anticipo || 0))] : null, esAdmin ? ["Saldo", fmt$(parseFloat(detalle.precio || 0) - ((detalle.abonos || []).length > 0 ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0) : parseFloat(detalle.anticipo || 0)))] : null, ["Entrega", detalle.fechaEntrega], ["Notas", detalle.notas]].filter(Boolean).map(([k, v]) => !v ? null : /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "9px 0",
      borderBottom: "1px solid #f5f5f5",
      gap: 10,
      flexWrap: k === "Tallas" ? "wrap" : "nowrap",
      flexDirection: k === "Tallas" ? "column" : "row"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#aaa",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, k), k === "Tallas" && v === "§chips§" ? /*#__PURE__*/React.createElement(TallasChips, {
    items: detalle.tallasItems,
    compact: false
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#333",
      textAlign: "right",
      fontWeight: 600
    }
  }, v))), (detalle.abonos || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#27AE60",
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "\uD83D\uDCB5 Abonos registrados"), (detalle.abonos || []).map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 8,
      padding: "5px 0",
      borderBottom: "1px solid #f5f5f5",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: "#155724"
    }
  }, "$", parseFloat(a.monto).toFixed(2)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      background: "#d4edda",
      color: "#155724",
      padding: "1px 7px",
      borderRadius: 10,
      fontWeight: 700
    }
  }, a.metodo), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#666",
      flex: 1
    }
  }, a.nota), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#aaa"
    }
  }, a.fecha)))), (detalle.imagenes || []).filter(i => imgSrc(i)).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#28A745",
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, "\u2601\uFE0F Im\xE1genes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, (detalle.imagenes || []).filter(i => imgSrc(i)).map((img, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: imgSrc(img),
    alt: img.nombre,
    style: {
      width: 80,
      height: 80,
      borderRadius: 8,
      objectFit: "cover",
      border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e0e0e0"),
      cursor: "zoom-in"
    },
    onClick: () => setVisor({
      imgs: (detalle.imagenes || []).filter(x => imgSrc(x)).map(imgSrc),
      idx: i
    })
  }), img.driveUrl && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 3,
      right: 3,
      background: "rgba(40,167,69,0.9)",
      borderRadius: 4,
      padding: "1px 4px",
      fontSize: 9,
      color: "#fff",
      fontWeight: 700
    }
  }, "\u2601\uFE0F"))))), (detalle.personas || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#1A5276",
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "\uD83D\uDC65 Beneficiarios"), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#EBF5FB"
    }
  }, ["#", "Nombre", "Cargo", "Gafete", "Talla"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "5px 8px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 700,
      color: "#1A5276",
      textTransform: "uppercase"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, (detalle.personas || []).map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: p.id || i,
    style: {
      borderBottom: "1px solid #f0f8ff",
      background: i % 2 === 0 ? "#fff" : "#f8fcff"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      color: "#aaa"
    }
  }, i + 1), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      fontWeight: 700,
      color: "#2C1654"
    }
  }, p.nombre || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      color: "#555"
    }
  }, p.cargo || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      textAlign: "center",
      color: "#555"
    }
  }, p.gafete || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      textAlign: "center"
    }
  }, p.talla ? /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#1A5276",
      color: "#fff",
      borderRadius: 10,
      padding: "2px 8px",
      fontWeight: 700,
      fontSize: 11
    }
  }, p.talla) : "—"))))))), (() => {
    const bVinc = bordados.find(b => String(b.confRef) === String(detalle.id));
    const cVinc = cuellos.find(cu => String(cu.confRef) === String(detalle.id));
    const pConf = parseFloat(detalle.precio || 0);
    const pBord = bVinc ? parseFloat(bVinc.precioT || 0) : 0;
    const pCuel = cVinc ? parseFloat(cVinc.precioT || 0) : 0;
    return /*#__PURE__*/React.createElement(React.Fragment, null, true && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, bVinc ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0fff8",
        border: "1.5px solid #1A5F5A",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: "#1A5F5A"
      }
    }, "\uD83E\uDEA1 Bordado \u2014 BORD-", String(bVinc.id).padStart(3, "0")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#555",
        marginTop: 2
      }
    }, bVinc.estatus, bVinc.precioT ? " · $" + parseFloat(bVinc.precioT).toFixed(2) : "")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setSec("bordados");
        setDet(null);
      },
      style: {
        padding: "6px 12px",
        borderRadius: 7,
        border: "none",
        background: "#1A5F5A",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 11
      }
    }, "Ver \u2192")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f8f8f8",
        border: "1.5px dashed #ccc",
        borderRadius: 10,
        padding: "10px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#888"
      }
    }, "\uD83E\uDEA1 Lleva bordado \u2014 sin registrar a\xFAn"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const nb = {
          id: nextBordId,
          cliente: detalle.cliente,
          telefono: detalle.telefono || "",
          confRef: String(detalle.id),
          soporte: detalle.tipoPrenda || "",
          estatus: "Tomado",
          fecha: new Date().toISOString().split("T")[0],
          anticipo: "",
          precioU: "",
          precioT: "",
          diseño: "",
          puntadas: "",
          hilos: "",
          posicion: "Pecho izquierdo",
          estadoDiseño: "Pendiente diseñar",
          esNuevo: "nuevo",
          abonos: [],
          notas: "Creado desde confección N°" + String(detalle.id).padStart(4, "0")
        };
        setBordados(prev => [...prev, nb]);
        setNextBordId(n => n + 1);
        gsBordGuardar(nb);
        setSec("bordados");
        setDet(null);
      },
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "#1A5F5A",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12
      }
    }, "+ Crear bordado"))), true && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, cVinc ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff4e6",
        border: "1.5px solid #B85C00",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: "#B85C00"
      }
    }, "\uD83E\uDDF6 Cuello \u2014 CUEL-", String(cVinc.id).padStart(3, "0")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#555",
        marginTop: 2
      }
    }, cVinc.estatus, cVinc.precioT ? " · $" + parseFloat(cVinc.precioT).toFixed(2) : "")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setSec("cuellos");
        setDet(null);
      },
      style: {
        padding: "6px 12px",
        borderRadius: 7,
        border: "none",
        background: "#B85C00",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 11
      }
    }, "Ver \u2192")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f8f8f8",
        border: "1.5px dashed #ccc",
        borderRadius: 10,
        padding: "10px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#888"
      }
    }, "\uD83E\uDDF6 Lleva cuello tejido \u2014 sin registrar a\xFAn"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const nc = {
          id: nextCuelId,
          cliente: detalle.cliente,
          telefono: detalle.telefono || "",
          confRef: String(detalle.id),
          cantidad: "1",
          material: "Acrílico",
          calibre: "Medio",
          estatus: "Tomado",
          fecha: new Date().toISOString().split("T")[0],
          anticipo: "",
          precioU: "",
          precioT: "",
          cuello: {
            activa: true,
            largo: "",
            ancho: "",
            colores: ""
          },
          puno: {
            activa: false,
            largo: "",
            ancho: "",
            colores: ""
          },
          banda: {
            activa: false,
            largo: "",
            ancho: "",
            colores: ""
          },
          abonos: [],
          notas: "Creado desde confección N°" + String(detalle.id).padStart(4, "0")
        };
        setCuellos(prev => [...prev, nc]);
        setNextCuelId(n => n + 1);
        gsCuelGuardar(nc);
        setSec("cuellos");
        setDet(null);
      },
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "#B85C00",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12
      }
    }, "+ Crear cuello"))), esAdmin && (pBord > 0 || pCuel > 0) && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0ebff",
        border: "1.5px solid #9B59B6",
        borderRadius: 10,
        padding: "10px 14px",
        marginTop: 4,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: "#9B59B6",
        textTransform: "uppercase",
        marginBottom: 6
      }
    }, "Resumen de precios"), pConf > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u2702\uFE0F Confecci\xF3n"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "$", pConf.toFixed(2))), pBord > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDEA1 Bordado"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "$", pBord.toFixed(2))), pCuel > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDDF6 Cuello"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "$", pCuel.toFixed(2))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 14,
        fontWeight: 900,
        color: "#2C1654",
        borderTop: "1px solid #ddd",
        paddingTop: 6,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", null, "$", (pConf + pBord + pCuel).toFixed(2)))));
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => exportarPedidoPDF(detalle, "confeccion"),
    style: {
      padding: "9px 12px",
      borderRadius: 8,
      border: "none",
      background: "#1D6A3A",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12
    }
  }, "\uD83D\uDCC4 PDF"), /*#__PURE__*/React.createElement("button", {
    onClick: () => imprimirPedido(detalle, esAdmin),
    style: {
      ...BTN("#6c3483"),
      padding: "9px 16px",
      fontSize: 13
    }
  }, "\uD83D\uDDA8\uFE0F Imprimir"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(detalle);
      setDet(null);
    },
    style: BTN("#9B59B6")
  }, "\u270F\uFE0F Editar"))), visor && (() => {
    const vImgs = visor.imgs;
    const vIdx = visor.idx;
    const prev = () => setVisor(v => ({
      ...v,
      idx: (v.idx - 1 + vImgs.length) % vImgs.length
    }));
    const next = () => setVisor(v => ({
      ...v,
      idx: (v.idx + 1) % vImgs.length
    }));
    const src = vImgs[vIdx];
    let touchX = null;
    const onTouchStart = e => {
      touchX = e.touches[0].clientX;
    };
    const onTouchEnd = e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) {
        dx < 0 ? next() : prev();
      }
      touchX = null;
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        padding: "16px 8px"
      },
      onTouchStart: onTouchStart,
      onTouchEnd: onTouchEnd
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 700,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        padding: "0 8px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        opacity: .7
      }
    }, vIdx + 1, " / ", vImgs.length), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: src,
      target: "_blank",
      rel: "noreferrer",
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        background: "rgba(155,89,182,0.8)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
        textDecoration: "none"
      }
    }, "\uD83D\uDD17 Drive"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setVisor(null),
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "rgba(255,255,255,0.15)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer"
      }
    }, "\u2715"))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: "100%",
        maxWidth: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        minHeight: 0
      }
    }, vImgs.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: prev,
      style: {
        position: "absolute",
        left: 0,
        zIndex: 10,
        background: "rgba(255,255,255,0.15)",
        border: "none",
        color: "#fff",
        fontSize: 28,
        fontWeight: 700,
        cursor: "pointer",
        borderRadius: 8,
        padding: "12px 14px",
        backdropFilter: "blur(4px)"
      }
    }, "\u2039"), /*#__PURE__*/React.createElement("img", {
      src: src,
      style: {
        maxWidth: "calc(100% - 80px)",
        maxHeight: "75vh",
        borderRadius: 10,
        objectFit: "contain",
        userSelect: "none",
        pointerEvents: "none"
      }
    }), vImgs.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: next,
      style: {
        position: "absolute",
        right: 0,
        zIndex: 10,
        background: "rgba(255,255,255,0.15)",
        border: "none",
        color: "#fff",
        fontSize: 28,
        fontWeight: 700,
        cursor: "pointer",
        borderRadius: 8,
        padding: "12px 14px",
        backdropFilter: "blur(4px)"
      }
    }, "\u203A")), vImgs.length > 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 12,
        overflowX: "auto",
        padding: "4px 8px",
        maxWidth: "100%"
      }
    }, vImgs.map((s, i) => /*#__PURE__*/React.createElement("img", {
      key: i,
      src: s,
      onClick: () => setVisor(v => ({
        ...v,
        idx: i
      })),
      style: {
        width: 52,
        height: 52,
        borderRadius: 6,
        objectFit: "cover",
        cursor: "pointer",
        border: i === vIdx ? "2.5px solid #9B59B6" : "2px solid transparent",
        opacity: i === vIdx ? 1 : 0.55,
        flexShrink: 0,
        transition: "opacity .2s"
      }
    }))));
  })(), errorFotos.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 28,
      maxWidth: 380,
      width: "100%",
      boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 8,
      textAlign: "center"
    }
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      color: "#2C1654",
      textAlign: "center"
    }
  }, "Fotos no subidas a Drive"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: "0 0 14px",
      textAlign: "center"
    }
  }, "El pedido se guard\xF3, pero estas fotos no pudieron subirse. Solo se ver\xE1n en este dispositivo."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFF3CD",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 16
    }
  }, errorFotos.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 12,
      color: "#856404",
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("strong", null, e.nombre), ": ", e.err))), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 12,
      marginBottom: 16
    }
  }, "Para subirlas, edita el pedido y vuelve a guardar."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setErrorFotos([]),
    style: {
      ...BTN("#9B59B6"),
      width: "100%"
    }
  }, "Entendido"))), modalActMedidas && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 28,
      maxWidth: 400,
      width: "100%",
      boxShadow: "0 24px 60px rgba(0,0,0,0.3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 8
    }
  }, "\uD83D\uDCD0"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 6px",
      color: "#1A5276",
      fontSize: 17
    }
  }, "\xBFActualizar medidas del cliente?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: 0
    }
  }, "Las medidas de este pedido son diferentes a las guardadas para ", /*#__PURE__*/React.createElement("strong", null, modalActMedidas.cliente.nombre), ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f4ff",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6
    }
  }, MEDIDAS_DEF.filter(m => modalActMedidas.pedido.medidas && modalActMedidas.pedido.medidas[m.k]).map(m => /*#__PURE__*/React.createElement("div", {
    key: m.k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#888",
      fontWeight: 700
    }
  }, m.l, ":"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#1A5276",
      fontWeight: 800
    }
  }, modalActMedidas.pedido.medidas[m.k], " cm"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const cli = {
        ...modalActMedidas.cliente,
        medidas: {
          ...(modalActMedidas.cliente.medidas || {}),
          ...modalActMedidas.pedido.medidas
        }
      };
      setClientes(prev => prev.map(c => c.id === cli.id ? cli : c));
      gsClientesGuardar(cli);
      setModalActMedidas(null);
    },
    style: {
      padding: "11px",
      borderRadius: 8,
      border: "none",
      background: "#1A5276",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14
    }
  }, "\u2705 S\xED, actualizar medidas del cliente"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalActMedidas(null),
    style: {
      padding: "10px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      color: "#888",
      cursor: "pointer",
      fontSize: 13
    }
  }, "No, solo para este pedido")))), confirmar && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 28,
      maxWidth: 340,
      textAlign: "center",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 10
    }
  }, "\uD83D\uDDD1\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      color: "#2C1654"
    }
  }, "\xBFEliminar pedido?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 14,
      margin: "0 0 20px"
    }
  }, "Esta acci\xF3n no se puede deshacer."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setConf(null),
    style: BTN("#aaa")
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => eliminar(confirmar),
    style: BTN("#E63946")
  }, "S\xED, eliminar")))), /*#__PURE__*/React.createElement(Toaster, null), /*#__PURE__*/React.createElement(ConfirmDialog, null), /*#__PURE__*/React.createElement(ConexionStatus, null), /*#__PURE__*/React.createElement(InstallPrompt, null));
}
ReactDOM.createRoot(document.getElementById("root")).render( /*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(App, null)));

