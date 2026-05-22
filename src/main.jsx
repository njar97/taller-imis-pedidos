
// Lector de archivos de bordado (.dst/.pes/.jef/.emb) en chunk lazy.
// Importar bajo demanda con: (await import("./leerBordado.js")).leerMetadataBordado
const cargarLectorBordado = () => import("./leerBordado.js").then(m => m.leerMetadataBordado);

// Vista de Papelera (admin, lazy)
const SeccionPapeleraLazy = lazy(() => import("./SeccionPapelera.jsx"));

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
import { ListaPrendas, agruparPrendas } from "./ListaPrendas.jsx";

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
import EstimadorPrecio from "./EstimadorPrecio.jsx";
import SeccionCotizaciones from "./SeccionCotizaciones.jsx";
import SeccionCalendario from "./SeccionCalendario.jsx";
import QRCode from "qrcode";

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
import RecordatorioInicio from "./RecordatorioInicio.jsx";

// ErrorBoundary — pantalla de fallback si React revienta
import ErrorBoundary from "./ErrorBoundary.jsx";

// Barra inferior (mobile) — extraída del App
import BottomNav from "./BottomNav.jsx";

// Bottom-sheet "Más" (items que no entran en la barra inferior)
import MasOpenSheet from "./MasOpenSheet.jsx";

// Sidebar desktop (oculto en mobile via CSS)
import SidebarDesktop from "./SidebarDesktop.jsx";

// Topbar mobile (oculta en desktop via CSS)
import TopbarMobile from "./TopbarMobile.jsx";

// Modal "pedido vencido — ¿fue entregado?"
import ModalArchivar from "./ModalArchivar.jsx";

// Modal "¿actualizar medidas del cliente?"
import ModalActMedidas from "./ModalActMedidas.jsx";

// Lightbox de imágenes (fullscreen + swipe + thumbnails)
import VisorImagenes from "./VisorImagenes.jsx";

// Modal "fotos no subidas" (después de guardar un pedido con uploads fallidos)
import ModalErrorFotos from "./ModalErrorFotos.jsx";

// Modal "¿eliminar pedido?" (confirm para soft-delete desde admin)
import ModalConfirmarBorrar from "./ModalConfirmarBorrar.jsx";

// Modal de detalle de un pedido (vista "ver pedido")
import DetallePedidoModal from "./DetallePedidoModal.jsx";

// Sección "Pedidos" (toolbar + tabs + vencidos + próximas + tabla/cards)
import SeccionPedidos from "./SeccionPedidos.jsx";

// Items de navegación (admin vs operario) compartidos por sidebar + bottom + sheet
import { getNavItems } from "./lib/navItems.js";

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
  pushUndo,
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
  dbRestaurar       as gsRestaurar,
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
  sumarAbonos,
  fmt$,
  tallasTexto,
  tallasItemsTexto,
  resumenTallas,
  itemsResumen,
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

import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";
import { installGlobalErrorHandlers } from "./lib/reportError.js";

// Captura errores async (handlers, fetches sin await, throws en timers,
// promesas rechazadas) que no llegan al ErrorBoundary. Hay que instalarlo
// antes de montar React para no perder los que ocurran durante el primer
// render.
installGlobalErrorHandlers();

// Genera el HTML de "Detalle por persona" — tabla donde cada fila es una
// persona con sus prendas agrupadas (3× Pantalón 32 — $69, etc.) y un
// subtotal por persona. Devuelve "" si el pedido no tiene personas con
// prendas (ej. pedido en modo "Por tallas" agregadas).
//
// `mostrarPrecios`: si false (operario), oculta columna Subtotal y los
// montos por línea — el operario no necesita ver $ para confeccionar.
// `mostrarInternos`: si false (cliente), oculta info interna del taller
// (talla taller / gafete). Cliente solo ve nombre + cargo + prendas.
function tablaPorPersonaHTML(p, color = "#1A5276", mostrarPrecios = false, mostrarInternos = false) {
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

async function imprimirPedido(p, esAdmin, todosPedidos = []) {
  if (esAdmin) imprimirRecibo(p);
  else await imprimirProduccion(p, todosPedidos);
}

// Cotización formal — versión limpia para mandar al cliente. NO incluye
// desglose interno de costos (tela $/yd, mano de obra, etc.). Solo lo
// que el cliente necesita ver: items con cantidades y precio, total y
// validez. Pensada para que el cliente acepte y se convierta a pedido.
function imprimirCotizacion(p) {
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
  const validez = p.validezDias || 15;
  const vence = new Date();
  vence.setDate(vence.getDate() + validez);
  const venceStr = vence.toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" });
  const items = itemsResumen(p);
  const algunoTieneTipo = items.some(it => it.tipo);
  const tot = items.reduce((s, it) => {
    const pr = parseFloat(it.precio) || 0;
    return s + pr * it.qty;
  }, 0);
  const totPzas = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
  const precioFinal = parseFloat(p.precio) > 0 ? parseFloat(p.precio) : tot;

  const w = window.open("", "_blank", "width=780,height=1050");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Cotización N°${num} — ${p.cliente}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 36px;font-size:13px;}
  @media print{body{padding:14px 20px;}.no-print{display:none!important;}@page{margin:10mm;size:A4;}}
  table{border-collapse:collapse;width:100%;}
</style></head><body>

<div class="no-print" style="text-align:right;margin-bottom:18px;display:flex;gap:8px;justify-content:flex-end;">
  <button onclick="window.print()" style="padding:10px 22px;border-radius:8px;border:none;background:#9B59B6;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir</button>
  <button onclick="window.close()" style="padding:10px 16px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
</div>

<!-- ENCABEZADO -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #9B59B6;padding-bottom:14px;margin-bottom:22px;">
  <div>
    <div style="font-size:24px;font-weight:900;color:#2C1654;font-family:Georgia,serif;">${TALLER}</div>
    <div style="font-size:12px;color:#888;margin-top:3px;">Bordados y confección · El Salvador</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Cotización</div>
    <div style="font-size:32px;font-weight:900;color:#9B59B6;line-height:1;">N°${num}</div>
    <div style="font-size:11px;color:#aaa;margin-top:6px;">${fecha}</div>
  </div>
</div>

<!-- CLIENTE -->
<div style="background:#f8f4ff;border-radius:10px;padding:14px 16px;border-left:4px solid #9B59B6;margin-bottom:18px;">
  <div style="font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Cotización para</div>
  <div style="font-size:17px;font-weight:800;color:#2C1654;">${p.cliente || "Cliente"}</div>
  ${p.telefono ? `<div style="font-size:12px;color:#555;margin-top:2px;">📱 ${p.telefono}</div>` : ""}
  ${p.nombreContacto ? `<div style="font-size:12px;color:#555;margin-top:2px;">Contacto: ${p.nombreContacto}</div>` : ""}
</div>

<!-- DETALLE -->
<div style="font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">📋 Detalle de la cotización</div>
${items.length ? `
<table style="border:1.5px solid #ddd;border-radius:8px;overflow:hidden;font-size:13px;margin-bottom:18px;">
  <thead><tr style="background:#9B59B6;color:#fff;">
    ${algunoTieneTipo ? `<th style="padding:8px 12px;text-align:left;">Prenda</th>` : ""}
    <th style="padding:8px 12px;text-align:center;width:70px;">Talla</th>
    <th style="padding:8px 12px;text-align:center;width:70px;">Cant.</th>
    <th style="padding:8px 12px;text-align:right;width:100px;">Precio u.</th>
    <th style="padding:8px 12px;text-align:right;width:100px;">Subtotal</th>
  </tr></thead>
  <tbody>
    ${items.map((it, i) => {
      const pr = parseFloat(it.precio) || 0;
      const sub = pr * it.qty;
      return `<tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"};border-bottom:1px solid #eee;">
        ${algunoTieneTipo ? `<td style="padding:8px 12px;font-weight:700;color:#2C1654;">${it.tipo || "—"}${it.spec ? ` <span style="color:#888;font-weight:400;font-size:11px;">(${it.spec})</span>` : ""}</td>` : ""}
        <td style="padding:8px 12px;text-align:center;font-weight:800;color:#E67E22;">${it.talla || "—"}</td>
        <td style="padding:8px 12px;text-align:center;font-weight:700;">${it.qty}</td>
        <td style="padding:8px 12px;text-align:right;color:#27AE60;font-weight:700;">${pr > 0 ? "$" + pr.toFixed(2) : "—"}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:800;color:#2C1654;">${pr > 0 ? "$" + sub.toFixed(2) : "—"}</td>
      </tr>`;
    }).join("")}
    <tr style="background:#f0f0f0;font-weight:800;border-top:2px solid #9B59B6;">
      <td colspan="${algunoTieneTipo ? 2 : 1}" style="padding:9px 12px;color:#2C1654;">TOTAL</td>
      <td style="padding:9px 12px;text-align:center;color:#2C1654;">${totPzas} pza${totPzas === 1 ? "" : "s"}</td>
      <td></td>
      <td style="padding:9px 12px;text-align:right;font-size:16px;color:#2C1654;">$${precioFinal.toFixed(2)}</td>
    </tr>
  </tbody>
</table>` : `<div style="background:#FAFAFA;border:1px dashed #ccc;border-radius:8px;padding:14px;font-size:13px;color:#888;margin-bottom:18px;">
  Total cotizado: <strong style="color:#2C1654;font-size:16px;">$${precioFinal.toFixed(2)}</strong>
</div>`}

${p.descripcion ? `
<div style="background:#F9F0FF;border:1.5px solid #D7BDE2;border-radius:9px;padding:13px;margin-bottom:18px;font-size:12px;color:#4A235A;line-height:1.6;">
  ${p.descripcion}
</div>` : ""}

<!-- VALIDEZ Y CONDICIONES -->
<div style="background:#FFF8E1;border:1.5px solid #FFE082;border-radius:9px;padding:14px 16px;margin-bottom:18px;font-size:12px;color:#856404;">
  <div style="font-weight:800;margin-bottom:4px;">⏱️ Validez de esta cotización</div>
  <div>Esta cotización es válida por <strong>${validez} días</strong> a partir de la fecha de emisión.</div>
  <div style="margin-top:3px;">Vence el <strong>${venceStr}</strong>.</div>
</div>

<div style="font-size:11px;color:#888;line-height:1.5;margin-bottom:20px;">
  • Los precios incluyen mano de obra y materiales según especificación.<br>
  • Para confirmar el pedido se requiere un anticipo del 50%.<br>
  • Fecha de entrega a coordinar al momento de confirmar.<br>
  • Cambios al diseño o cantidades pueden modificar el precio final.
</div>

<!-- FIRMA -->
<div style="margin-top:28px;text-align:center;">
  <div style="border-top:1.5px solid #333;padding-top:8px;margin:0 auto;max-width:300px;">
    <div style="font-size:11px;font-weight:700;color:#333;">Cotización emitida por</div>
    <div style="font-size:12px;color:#555;margin-top:2px;">${TALLER}</div>
  </div>
</div>

<div style="margin-top:24px;text-align:center;font-size:10px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:12px;">
  ${TALLER} · Cotización N°${num} · Generada el ${fecha}
</div>
</body></html>`);
  w.document.close();
}
function imprimirRecibo(p) {
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
  </body></html>`);
  w.document.close();
}
async function imprimirProduccion(p, todosPedidos = []) {
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
  // itemsResumen agrupa por tipo+talla+precio+spec — soporta los 2 modos
  // (lista y tallas) y devuelve items con tipo, lo que necesitamos para
  // la tabla de producción.
  const items = itemsResumen(p);
  const totalPzas = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
  const algunoTieneTipo = items.some(it => it.tipo);
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
  // Tabla principal: TIPO + TALLA + CANT + SPEC. La columna TIPO solo
  // aparece si al menos un item tiene tipo (modo lista o modo tallas
  // post-PR91). Para legacy sin tipo, fallback al layout anterior.
  const tablaPrendasHTML = items.length ? `
    <table style="width:100%;border-collapse:collapse;font-size:13px;border:2px solid #1A5276;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#1A5276;color:#fff;">
        ${algunoTieneTipo ? `<th style="padding:9px 12px;text-align:left;">Tipo de prenda</th>` : ""}
        <th style="padding:9px 12px;text-align:center;width:80px;">Talla</th>
        <th style="padding:9px 12px;text-align:center;width:80px;">Cant.</th>
        <th style="padding:9px 12px;text-align:left;">Especificación / instrucción</th>
      </tr></thead>
      <tbody>
        ${items.map((it, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f4f9f4"};border-bottom:1px solid #eee;">
          ${algunoTieneTipo ? `<td style="padding:9px 12px;font-weight:800;font-size:14px;color:#2C1654;">${it.tipo || "—"}</td>` : ""}
          <td style="padding:9px 12px;text-align:center;font-weight:900;font-size:16px;color:#E67E22;">${it.talla || "S/T"}</td>
          <td style="padding:9px 12px;text-align:center;font-weight:900;font-size:18px;color:#1A5276;">${it.qty}</td>
          <td style="padding:9px 12px;color:#444;font-size:12px;">${it.spec || ""}</td>
        </tr>`).join("")}
        <tr style="background:#1A5276;color:#fff;font-weight:800;">
          <td colspan="${algunoTieneTipo ? 2 : 1}" style="padding:9px 12px;text-align:right;">TOTAL A CONFECCIONAR</td>
          <td style="padding:9px 12px;text-align:center;font-size:18px;">${totalPzas}</td>
          <td style="padding:9px 12px;font-size:11px;opacity:.85;">piezas</td>
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

  <!-- DESCRIPCIÓN E INSTRUCCIONES (fusionada con notas) -->
  ${p.descripcion || p.notas ? `
  <div class="sec" style="color:#6C3483;">📝 Descripción e instrucciones</div>
  <div style="background:#F9F0FF;border:1.5px solid #D7BDE2;border-radius:9px;padding:13px;margin-bottom:14px;font-size:13px;color:#4A235A;line-height:1.6;">
    ${p.descripcion ? `<div>${p.descripcion}</div>` : ""}
    ${p.descripcion && p.notas ? `<div style="border-top:1px dashed #D7BDE2;margin:8px 0;"></div>` : ""}
    ${p.notas ? `<div>${p.notas}</div>` : ""}
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
  const [sesionEmail, setSesionEmail] = useState(null); // email del user logueado via magic link
  const [seccion, setSec] = useState("pedidos");

  // Al cargar: recoger sesión del hash (vuelta del magic link) y/o de
  // localStorage si ya había sesión guardada. Si hay sesión activa,
  // auto-login como admin.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { recogerSesionDesdeURL, sesionActual } = await import("./lib/auth.js");
      let s = await recogerSesionDesdeURL();
      if (!s) s = sesionActual();
      if (s && s.user?.email && !cancelado) {
        setSesionEmail(s.user.email);
        setRol("admin");
      }
    })();
    return () => { cancelado = true; };
  }, []);
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
  // Semilla de duplicación: el FormPedido la usa como `initial` cuando
  // modal === "nuevo". Permite "Duplicar pedido" con flow correcto
  // (esNuevo = true, nextId avanza, state local se actualiza).
  const [seedDuplicar, setSeedDuplicar] = useState(null);
  const [modalIA, setModalIA] = useState(false);
  const [modalEstimador, setModalEstimador] = useState(false);
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
        if (tabla === "taller_pedidos" || tabla === "*") {
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
        if (tabla === "taller_bordados" || tabla === "*") {
          const data = await gsBordLeer();
          if (data) setBordados(data);
        }
        if (tabla === "taller_cuellos" || tabla === "*") {
          const data = await gsCuelLeer();
          if (data) setCuellos(data);
        }
        if (tabla === "taller_clientes" || tabla === "*") {
          const data = await gsClientesLeer();
          if (data) setClientes(data);
        }
        if (tabla === "taller_catalogo" || tabla === "*") {
          const data = await gsCatalogoLeer();
          if (data && data.length > 0) setCatalogo(data);
        }
      } catch (e) {
        console.warn("Refetch realtime falló:", e);
      }
    };
    const sub = suscribirCambios(
      ["taller_pedidos","taller_bordados","taller_cuellos","taller_clientes","taller_catalogo"],
      refetchTabla
    );
    return () => sub.cerrar();
  }, [rolBase]);
  async function guardarPedido(form, _esNuevo) {
    // Es nuevo si: invocado explícitamente con _esNuevo=true, o el modal
    // dice "nuevo", o el modal es un borrador (objeto sin id, ej. desde
    // el estimador cuando inicia una cotización).
    const esNuevo = _esNuevo !== undefined
      ? _esNuevo
      : (modal === "nuevo" || (modal && typeof modal === "object" && !modal.id));
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
    const anterior = pedidos.find(p => p.id === id);
    if (!anterior || anterior.estatus === est) return;
    const estatusPrevio = anterior.estatus;
    const lista = pedidos.map(p => p.id === id ? { ...p, estatus: est } : p);
    setPedidos(lista);
    try {
      await gsGuardar(lista.find(p => p.id === id));
    } catch {}
    pushUndo(`Estatus → ${est}`, async () => {
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estatus: estatusPrevio } : p));
      try {
        await gsGuardar({ ...anterior, estatus: estatusPrevio });
      } catch {}
    });
  }
  async function eliminar(id) {
    const anterior = pedidos.find(p => p.id === id);
    setPedidos(p => p.filter(x => x.id !== id));
    setConf(null);
    try {
      await Promise.all([gsBorrar(id), idbBorrar(id)]);
    } catch {}
    const nombre = anterior?.cliente ? `pedido de ${anterior.cliente}` : "pedido";
    pushUndo(`🗑️ ${nombre} eliminado`, async () => {
      try {
        await gsRestaurar(id);
        if (anterior) setPedidos(prev => [...prev.filter(x => x.id !== id), anterior]);
      } catch (e) {
        pushToast("No pude restaurar el pedido", "error");
      }
    });
  }
  const diasPara = f => f ? Math.ceil((new Date(f + "T12:00:00") - new Date()) / 86400000) : null;
  const vencidosSinArchivar = useMemo(() => pedidos.filter(p => {
    if (p.esCotizacion) return false;
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
    const hoyStr = new Date().toISOString().split("T")[0];
    const esVencidoActivo = p =>
      !["Entregado", "Cancelado"].includes(p.estatus) &&
      p.fechaEntrega &&
      p.fechaEntrega < hoyStr;
    return pedidos.filter(p => {
      // Cotizaciones (borradores) no aparecen en el listado normal de pedidos.
      if (p.esCotizacion) return false;
      const match = !q || [p.cliente, p.tipoPrenda, p.tela, p.color, p.costurera, p.notas, p.descripcion, p.nombreContacto, p.estatus, String(p.id || ""), p.fechaEntrega, p.tipoDocumento].some(v => v && String(v).toLowerCase().includes(q));
      if (!match) return false;
      // Tab "Vencidos": solo los que pasaron la fecha y NO están cerrados.
      if (filtro === "Vencidos") return esVencidoActivo(p);
      // Tab por estatus específico: muestra ese estatus tal cual.
      if (filtro !== "Todos") return p.estatus === filtro;
      // Filtro "Todos" = activos en taller. Oculta terminales y vencidos.
      if (["Entregado", "Cancelado"].includes(p.estatus)) return false;
      if (esVencidoActivo(p)) return false;
      return true;
    });
  }, [pedidos, busqueda, filtro]);
  const conteos = useMemo(() => {
    const hoyStr = new Date().toISOString().split("T")[0];
    // Conteos excluyen cotizaciones (las cotizaciones tienen su propia sección)
    const reales = pedidos.filter(p => !p.esCotizacion);
    const base = ESTATUS.reduce((a, e) => ({
      ...a,
      [e]: reales.filter(p => p.estatus === e).length,
    }), {});
    base.Vencidos = reales.filter(p =>
      !["Entregado", "Cancelado"].includes(p.estatus) &&
      p.fechaEntrega &&
      p.fechaEntrega < hoyStr
    ).length;
    return base;
  }, [pedidos]);
  const parseMonto = v => {
    const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const porCobrar = useMemo(() => [...pedidos.filter(p => p.estatus !== "Cancelado" && !p.esCotizacion), ...bordados.filter(b => b.estatus !== "Cancelado"), ...cuellos.filter(c => c.estatus !== "Cancelado")].reduce((s, p) => {
    const precio = parseMonto(p.precio || p.precioT);
    const anticipo = parseMonto(p.anticipo);
    const saldo = precio - anticipo;
    return saldo > 0 ? s + saldo : s;
  }, 0), [pedidos, bordados, cuellos]);
  const alertaCF = useMemo(() => pedidos.filter(p => p.tipoDocumento === "Crédito Fiscal (pendiente datos)").length, [pedidos]);
  const activos = useMemo(() => pedidos.filter(p => !p.esCotizacion && !["Entregado", "Cancelado"].includes(p.estatus)).length + bordados.filter(b => !["Entregado", "Cancelado"].includes(b.estatus)).length + cuellos.filter(c => !["Entregado", "Cancelado"].includes(c.estatus)).length, [pedidos, bordados, cuellos]);
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
  if (!rolBase) return <PantallaLogin onLogin={setRol} />;
  const NAV = getNavItems(rol, esAdmin);
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {progreso && (
        <BarraProgreso
          actual={progreso.actual}
          total={progreso.total}
          errores={progreso.errores || 0}
        />
      )}
      <SidebarDesktop
        esAdmin={esAdmin}
        sync={sync}
        syncInfo={syncInfo}
        nav={NAV}
        seccion={seccion}
        setSec={setSec}
        matAgotados={matAgotados}
        activos={activos}
        porCobrar={porCobrar}
        alertaCF={alertaCF}
        refrescar={refrescar}
        refrescando={refrescando}
        setRol={setRol}
        onAbrirEstimador={() => setModalEstimador(true)}
        sesionEmail={sesionEmail}
        onCerrarSesion={async () => {
          const { cerrarSesion } = await import("./lib/auth.js");
          await cerrarSesion();
          setSesionEmail(null);
        }}
      />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <TopbarMobile
          esAdmin={esAdmin}
          sync={sync}
          syncInfo={syncInfo}
          porCobrar={porCobrar}
          activos={activos}
          refrescar={refrescar}
          refrescando={refrescando}
          onAbrirEstimador={() => setModalEstimador(true)}
        />
        {seccion === "estadisticas" && esAdmin && (
          <SeccionEstadisticas
            pedidos={pedidos}
            bordados={bordados}
            cuellos={cuellos}
            onExportarExcel={exportarExcelMes}
          />
        )}
        {seccion === "inventario" && (
          <SeccionInventario
            pedidos={pedidos}
            inventario={inventario}
            setInventario={setInventario}
            asignaciones={asignaciones}
            setAsignaciones={setAsignaciones}
            esAdmin={esAdmin}
          />
        )}
        {seccion === "bordados" && (
          <SeccionBordados
            bordados={bordados}
            setBordados={setBordados}
            nextBordId={nextBordId}
            setNextBordId={setNextBordId}
            pedidosConf={pedidos}
            esAdmin={esAdmin}
            clientes={clientes}
            upsertClienteLocal={upsertClienteLocal}
            exportarPedidoPDF={exportarPedidoPDF}
          />
        )}
        {seccion === "cuellos" && (
          <SeccionCuellos
            cuellos={cuellos}
            setCuellos={setCuellos}
            nextCuelId={nextCuelId}
            setNextCuelId={setNextCuelId}
            pedidosConf={pedidos}
            esAdmin={esAdmin}
            clientes={clientes}
            upsertClienteLocal={upsertClienteLocal}
            exportarPedidoPDF={exportarPedidoPDF}
          />
        )}
        {seccion === "catalogo" && (
          <SeccionCatalogo
            catalogo={catalogo}
            setCatalogo={setCatalogo}
            esAdmin={esAdmin}
          />
        )}
        {seccion === "clientes" && esAdmin && (
          <SeccionClientes
            clientes={clientes}
            setClientes={setClientes}
            pedidos={pedidos}
            bordados={bordados}
            cuellos={cuellos}
            esAdmin={esAdmin}
            onAbrirPedido={(p) => setDet(p)}
          />
        )}
        {seccion === "calendario" && (
          <SeccionCalendario
            pedidos={pedidos}
            bordados={bordados}
            cuellos={cuellos}
            onAbrirPedido={(p) => setDet(p)}
          />
        )}
        {seccion === "cotizaciones" && esAdmin && (
          <SeccionCotizaciones
            pedidos={pedidos}
            onImprimir={(c) => imprimirCotizacion(c)}
            onEditar={(c) => setModal(c)}
            onConvertirPedido={async (c) => {
              const ok = await pushConfirm({
                titulo: "Convertir a pedido",
                msg: `¿Convertir COT-${String(c.id).padStart(4, "0")} de ${c.cliente} a pedido firme? Pasará a producción con estatus Corte.`,
                okLabel: "Sí, convertir",
              });
              if (!ok) return;
              const actualizado = { ...c, esCotizacion: false, estatus: "Corte" };
              setPedidos(prev => prev.map(p => p.id === c.id ? actualizado : p));
              try { await gsGuardar(actualizado); } catch {}
              pushToast("Cotización convertida a pedido ✓", "success");
              setSec("pedidos");
            }}
            onEliminar={async (c) => {
              const ok = await pushConfirm({
                titulo: "Eliminar cotización",
                msg: `¿Eliminar COT-${String(c.id).padStart(4, "0")} de ${c.cliente}? Se puede recuperar desde Papelera.`,
                okLabel: "Eliminar",
                danger: true,
              });
              if (!ok) return;
              await eliminar(c.id);
            }}
          />
        )}
        {seccion === "papelera" && esAdmin && (
          <Suspense
            fallback={
              <div style={{ padding: 32, textAlign: "center", color: "#999" }}>
                ⏳ Cargando papelera...
              </div>
            }
          >
            <SeccionPapeleraLazy onRestaurado={refrescar} />
          </Suspense>
        )}
        {seccion === "pedidos" && (
          <SeccionPedidos
            pedidos={pedidos}
            filtrados={filtrados}
            conteos={conteos}
            busqueda={busqueda}
            setBusqueda={setBusq}
            filtro={filtro}
            setFiltro={setFiltro}
            sync={sync}
            vencidosSinArchivar={vencidosSinArchivar}
            onArchivarVencido={setModalArchivar}
            pullDist={pullDist}
            onMainTouchStart={onMainTouchStart}
            onMainTouchMove={onMainTouchMove}
            onMainTouchEnd={onMainTouchEnd}
            diasPara={diasPara}
            esAdmin={esAdmin}
            asignaciones={asignaciones}
            nextId={nextId}
            setDet={setDet}
            setModal={setModal}
            setSeedDuplicar={setSeedDuplicar}
            setConf={setConf}
            setVisor={setVisor}
            cambiarEstatus={cambiarEstatus}
            onImprimir={(p) => imprimirPedido(p, esAdmin, pedidos)}
            onCopiarWA={(p) => copiarWA(p, esAdmin)}
          />
        )}
        <BottomNav
          nav={NAV}
          seccion={seccion}
          setSec={setSec}
          masOpen={masOpen}
          setMasOpen={setMasOpen}
          setRol={setRol}
          esAdmin={esAdmin}
          vencidosSinArchivar={vencidosSinArchivar}
          matAgotados={matAgotados}
        />
        {masOpen && (
          <MasOpenSheet
            nav={NAV}
            seccion={seccion}
            setSec={setSec}
            setMasOpen={setMasOpen}
            setRol={setRol}
            esAdmin={esAdmin}
          />
        )}
      </main>
      {modalArchivar && (
        <ModalArchivar
          pedido={modalArchivar}
          onConfirmarArchivar={(f) => archivarPedido(modalArchivar, f)}
          onCambiarAListo={() => {
            const actualizado = { ...modalArchivar, estatus: "Listo" };
            setPedidos((prev) =>
              prev.map((x) => (x.id === modalArchivar.id ? actualizado : x))
            );
            gsGuardar(actualizado);
            setModalArchivar(null);
          }}
          onCerrar={() => setModalArchivar(null)}
        />
      )}
      <EstimadorPrecio
        open={modalEstimador}
        onClose={() => setModalEstimador(false)}
        clientes={clientes}
        nextId={nextId}
        onGuardarCotizacion={(cot) => {
          // Abre el FormPedido precargado con los datos del estimador
          // (cliente, tel, items, precio) + flag esCotizacion=true. El
          // user completa fecha entrega, descripción, tela, color, etc.
          // y al guardar queda con el mismo formato que un pedido.
          const borrador = {
            ...PEDIDO_BASE,
            ...cot,
            esCotizacion: true,
            // Sin id → el FormPedido lo trata como edición de un draft;
            // guardarPedido(f) asigna nextId al guardar.
          };
          setModalEstimador(false);
          setModal(borrador);
        }}
      />
      {modalIA && (
        <ModalAsistenteIA
          rol={rol}
          onCrearPedido={(p) => {
            setModalIA(false);
            guardarPedido(p, true);
          }}
          onAbrir={(p) => {
            setModalIA(false);
            setModal(p || "nuevo");
          }}
          onCerrar={() => setModalIA(false)}
        />
      )}
      {modal && (
        <Modal
          title={
            modal === "nuevo"
              ? "✂️ Nuevo Pedido"
              : modal.esCotizacion
              ? (modal.id
                  ? "🧮 Cotización COT-" + String(modal.id).padStart(4, "0")
                  : "🧮 Nueva Cotización")
              : "✏️ Editar N°" + String(modal.id).padStart(4, "0")
          }
          onClose={() => setModal(null)}
        >
          {modal === "nuevo" && (
            <button
              onClick={() => {
                setModal(null);
                setModalIA(true);
              }}
              style={{
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
                gap: 8,
              }}
            >
              {"\uD83E\uDD16 Registrar con Asistente IA (voz o texto)"}
            </button>
          )}
          <FormPedido
            key={modal === "nuevo" && seedDuplicar ? `seed-${seedDuplicar.id || Date.now()}` : (modal === "nuevo" ? "nuevo" : (modal && modal.id) || "blank")}
            initial={modal !== "nuevo" ? modal : seedDuplicar}
            onSave={f => { setSeedDuplicar(null); guardarPedido(f); }}
            onCancel={() => { setSeedDuplicar(null); setModal(null); }}
            rol={rol}
            pedidosExistentes={pedidos}
            clientes={clientes}
            catalogo={catalogo}
          />
        </Modal>
      )}
      {detalle && (
        <DetallePedidoModal
          pedido={detalle}
          esAdmin={esAdmin}
          bordados={bordados}
          cuellos={cuellos}
          onClose={() => setDet(null)}
          onCambiarEstatus={(nuevo) => {
            const actualizado = { ...detalle, estatus: nuevo };
            setDet(actualizado);
            cambiarEstatus(detalle.id, nuevo);
          }}
          onCambiarCosturera={(nuevo) => {
            const actualizado = { ...detalle, costurera: nuevo };
            setDet(actualizado);
            setPedidos((prev) =>
              prev.map((p) => (p.id === detalle.id ? actualizado : p))
            );
            gsGuardar(actualizado);
          }}
          onVerFoto={(imgs, idx) => setVisor({ imgs, idx })}
          onIrABordados={() => {
            setSec("bordados");
            setDet(null);
          }}
          onIrACuellos={() => {
            setSec("cuellos");
            setDet(null);
          }}
          onCrearBordadoVinc={() => {
            const nb = {
              id: nextBordId,
              cliente: detalle.cliente,
              telefono: detalle.telefono || "",
              confRef: String(detalle.id),
              soporte: detalle.tipoPrenda || "",
              estatus: "Dise\u00F1o",
              fecha: new Date().toISOString().split("T")[0],
              anticipo: "",
              precioU: "",
              precioT: "",
              "dise\u00F1o": "",
              puntadas: "",
              hilos: "",
              posicion: "Pecho izquierdo",
              "estadoDise\u00F1o": "Pendiente dise\u00F1ar",
              esNuevo: "nuevo",
              abonos: [],
              notas:
                "Creado desde confecci\u00F3n N\u00B0" +
                String(detalle.id).padStart(4, "0"),
            };
            setBordados((prev) => [...prev, nb]);
            setNextBordId((n) => n + 1);
            gsBordGuardar(nb);
            setSec("bordados");
            setDet(null);
          }}
          onCrearCuelloVinc={() => {
            const nc = {
              id: nextCuelId,
              cliente: detalle.cliente,
              telefono: detalle.telefono || "",
              confRef: String(detalle.id),
              cantidad: "1",
              material: "Acr\u00EDlico",
              calibre: "Medio",
              estatus: "Pendiente",
              fecha: new Date().toISOString().split("T")[0],
              anticipo: "",
              precioU: "",
              precioT: "",
              cuello: { activa: true, largo: "", ancho: "", colores: "" },
              puno: { activa: false, largo: "", ancho: "", colores: "" },
              banda: { activa: false, largo: "", ancho: "", colores: "" },
              abonos: [],
              notas:
                "Creado desde confecci\u00F3n N\u00B0" +
                String(detalle.id).padStart(4, "0"),
            };
            setCuellos((prev) => [...prev, nc]);
            setNextCuelId((n) => n + 1);
            gsCuelGuardar(nc);
            setSec("cuellos");
            setDet(null);
          }}
          onImprimir={() => imprimirPedido(detalle, esAdmin, pedidos)}
          onExportarPDF={() => exportarPedidoPDF(detalle, "confeccion")}
          onAbrirEdicion={() => {
            setModal(detalle);
            setDet(null);
          }}
        />
      )}
      {visor && (
        <VisorImagenes
          imgs={visor.imgs}
          idx={visor.idx}
          setIdx={(i) => setVisor((v) => ({ ...v, idx: i }))}
          onCerrar={() => setVisor(null)}
        />
      )}
      {errorFotos.length > 0 && (
        <ModalErrorFotos
          errores={errorFotos}
          onCerrar={() => setErrorFotos([])}
        />
      )}
      {modalActMedidas && (
        <ModalActMedidas
          pedido={modalActMedidas.pedido}
          cliente={modalActMedidas.cliente}
          onActualizar={() => {
            const cli = {
              ...modalActMedidas.cliente,
              medidas: {
                ...(modalActMedidas.cliente.medidas || {}),
                ...modalActMedidas.pedido.medidas,
              },
            };
            setClientes((prev) =>
              prev.map((c) => (c.id === cli.id ? cli : c))
            );
            gsClientesGuardar(cli);
            setModalActMedidas(null);
          }}
          onCerrar={() => setModalActMedidas(null)}
        />
      )}
      {confirmar && (
        <ModalConfirmarBorrar
          onCancelar={() => setConf(null)}
          onConfirmar={() => eliminar(confirmar)}
        />
      )}
      <Toaster />
      <ConfirmDialog />
      <ConexionStatus />
      <InstallPrompt />
      {esAdmin && (
        <RecordatorioInicio
          pedidos={pedidos}
          onIrAVencidos={() => { setSec("pedidos"); setFiltro("Vencidos"); }}
          onIrAProximos={() => { setSec("calendario"); }}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

