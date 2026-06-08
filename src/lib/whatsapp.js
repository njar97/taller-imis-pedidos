// Mensajería para WhatsApp: arma el texto del pedido y lo copia al portapapeles.
// Antes vivía como mensajeWA + copiarWA en main.js.
// Usado por WABtn (lib/ui.jsx), CardPedido y App.

import { resumenTallas, resumenAgregadoPorTipo, itemsResumen } from "./dominio.js";
import { agruparPrendas } from "../ListaPrendas.jsx";

// Formato de cada línea del resumen agregado (cuando es por persona o por
// tallas planas). Muestra tipo (si lo hay), cantidad, talla, y subtotal si
// hay precios y el usuario es admin.
function lineaResumen(it, esAdmin) {
  const tipo = it.tipo ? `${it.tipo} ` : "";
  const tieneP =
    esAdmin && it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0;
  const precioUnit = tieneP
    ? ` · $${parseFloat(it.precio).toFixed(2)} c/u`
    : "";
  const sub = tieneP
    ? ` = *$${(parseFloat(it.precio) * it.qty).toFixed(2)}*`
    : "";
  const spec = it.spec ? ` (${it.spec})` : "";
  return `  • ${it.qty}× ${tipo}${it.talla}${spec}${precioUnit}${sub}`;
}

// Agrupa las prendas de una persona y devuelve un bloque de texto multi-línea.
// `mostrarPrecios` oculta subtotales para vistas no-admin (operarios).
// `mostrarInternos` oculta info del taller (talla taller / gafete) para
// mensajes que van al cliente.
function bloqueDePersona(per, mostrarPrecios = false, mostrarInternos = false) {
  const grupos = agruparPrendas(per.prendas);
  if (!grupos.length) return "";
  const lineas = grupos
    .filter(g => g.tipo || g.talla)
    .map(g => {
      const label = [g.tipo, g.talla].filter(Boolean).join(" ");
      const sub =
        mostrarPrecios &&
        g.precio != null &&
        g.precio !== "" &&
        parseFloat(g.precio) > 0
          ? ` — $${(parseFloat(g.precio) * g.qty).toFixed(2)}`
          : "";
      const nota = g.spec ? ` (${g.spec})` : "";
      return `   • ${g.qty}× ${label}${nota}${sub}`;
    });
  const total = grupos.reduce(
    (s, g) => s + (parseFloat(g.precio || 0) || 0) * g.qty,
    0
  );
  const subStr = mostrarPrecios && total > 0 ? ` — *$${total.toFixed(2)}*` : "";
  const meta = [];
  if (mostrarInternos && per.gafete) meta.push(`Talla taller: ${per.gafete}`);
  if (per.cargo) meta.push(per.cargo);
  const metaStr = meta.length ? ` _(${meta.join(", ")})_` : "";
  return `🔸 *${per.nombre || "Sin nombre"}*${metaStr}${subStr}\n${lineas.join("\n")}`;
}

export function mensajeWA(p, esAdmin = false) {
  const num = String(p.id).padStart(4, "0");
  const dias = p.fechaEntrega
    ? Math.ceil((new Date(p.fechaEntrega + "T12:00:00") - new Date()) / 86400000)
    : null;
  const diasStr = dias === null
    ? ""
    : dias < 0
    ? ` ⚠️ venció hace ${Math.abs(dias)}d`
    : dias === 0
    ? " ⚠️ ¡HOY!"
    : dias === 1
    ? " (mañana)"
    : ` (${dias} días)`;

  const tallas = resumenTallas(p);
  // Resumen agregado: cuando hay personas con prendas, agrupa por tipo+talla
  // (Pantalón 32, Camisa M, etc.). Cuando no, cae a tallasItems planos.
  const itemsAgr = resumenAgregadoPorTipo(p);
  const tallasDetalle = itemsAgr.length
    ? itemsAgr.map(it => lineaResumen(it, esAdmin)).join("\n")
    : tallas
    ? `  • ${tallas}`
    : "";

  // ¿Hay personas con prendas reales (no solo placeholder vacío)?
  const personasConPrendas = (p.personas || []).filter(per =>
    Array.isArray(per.prendas) &&
    per.prendas.some(pr => pr.tipo || pr.talla)
  );

  const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
  const tipoIcon = p.tipoCliente === "escuela" ? "🏫" : p.tipoCliente === "empresa" ? "🏢" : "👤";

  let msg = `🧵 *TALLER IMIS — Pedido N°${num}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `${tipoIcon} *${p.cliente}*`;
  if (p.nombreContacto) msg += `\n   Contacto: ${p.nombreContacto}`;
  if (p.telefono) msg += `\n   📱 ${p.telefono}`;
  msg += `\n\n`;
  msg += `✂️ *${p.tipoPrenda || "(sin especificar)"}*`;
  if (p.tela) msg += `\n   Tela: ${p.tela}${p.color ? " · " + p.color : ""}`;
  msg += `\n`;

  // Si hay personas con prendas, mostrar desglose por persona en vez del
  // resumen agregado por talla — más informativo para uniformes. Precios
  // solo si esAdmin (al operario no le mostramos $ ).
  if (personasConPrendas.length > 0) {
    msg += `\n👥 *Desglose por persona:*\n`;
    personasConPrendas.forEach((per) => {
      // mostrarInternos=false → no se manda talla taller al cliente.
      msg += `\n${bloqueDePersona(per, esAdmin, false)}\n`;
    });
    if (tallasDetalle) {
      msg += `\n📦 *Resumen de tallas:*\n${tallasDetalle}\n`;
    }
  } else if (tallasDetalle) {
    msg += `\n📦 *Tallas y cantidades:*\n${tallasDetalle}\n`;
  }

  if (p.descripcion) msg += `\n📝 ${p.descripcion}\n`;
  // "Lleva bordado" sí va al cliente; estatusDiseno (info Wilcom) NO.
  if (p.tieneBordado) msg += `\n🪡 Lleva bordado`;
  // 📅 muestra "FEB 24" en Android, confunde con la fecha real. Usamos
  // 📌 (pin) que es neutro y mantiene el énfasis visual.
  msg += `\n\n📌 *Entrega: ${p.fechaEntrega || "—"}*${diasStr}`;
  if (p.estatus) msg += `\n   Estado: ${p.estatus}`;
  if (esAdmin) {
    const totalPzas = itemsAgr.reduce((s, it) => s + it.qty, 0);
    if (totalPzas > 0) msg += `\n\n📦 *Total piezas: ${totalPzas}*`;
    if (p.precio) {
      msg += `\n💰 *Total: $${parseFloat(p.precio).toFixed(2)}*`;
      if (parseFloat(p.anticipo || 0) > 0) {
        msg += `\n✅ Adelanto recibido: $${parseFloat(p.anticipo).toFixed(2)}`;
      }
      if (saldo > 0) {
        msg += `\n⏳ *Saldo pendiente: $${saldo.toFixed(2)}*`;
      } else if (parseFloat(p.precio || 0) > 0) {
        msg += `\n✅ *Pagado completamente*`;
      }
    }
  }
  // p.notas son OBSERVACIONES INTERNAS del taller (así dice el label en
  // el form). No se mandan al cliente. Si el usuario quiere comunicar
  // algo al cliente, va en p.descripcion (que sí se incluye arriba).
  msg += `\n━━━━━━━━━━━━━━━━━━`;
  return msg;
}

export function copiarWA(p, esAdmin = false) {
  const msg = mensajeWA(p, esAdmin);
  copiarTexto(msg);
}

// Mensaje de WhatsApp para una COTIZACIÓN (esCotizacion). A diferencia de
// mensajeWA (pedido), encabeza "Cotización", muestra precios siempre y
// agrega la validez/vencimiento. Pensado para copiar y pegar en cualquier
// chat o grupo.
export function mensajeCotizacionWA(c) {
  const num = String(c.id).padStart(4, "0");
  const items = itemsResumen(c);
  const total = parseFloat(c.precio || 0);
  const validez = c.validezDias || 15;
  let venceStr = "";
  if (c.fecha) {
    const d = new Date(c.fecha + "T12:00:00");
    d.setDate(d.getDate() + validez);
    venceStr = d.toISOString().split("T")[0];
  }

  let msg = `🧵 *Taller IMIS — Cotización N°${num}*\n\n`;

  if (items.length) {
    msg += items.map(it => {
      const pr = parseFloat(it.precio) || 0;
      const sub = pr * it.qty;
      const tipo = it.tipo || it.talla || "—";
      const spec = it.spec ? ` (${it.spec})` : "";
      return pr > 0
        ? `*${it.qty}× ${tipo}*${spec} — $${pr.toFixed(2)} c/u = *$${sub.toFixed(2)}*`
        : `*${it.qty}× ${tipo}*${spec}`;
    }).join("\n");
    msg += "\n";
  }

  if (c.descripcion) msg += `\n📝 ${c.descripcion}\n`;

  if (total > 0) {
    msg += `\n*Total: $${total.toFixed(2)}*`;
    msg += `\nPara confirmar: *$${(total * 0.5).toFixed(2)}* de anticipo`;
  }
  msg += `\n📌 Válida ${venceStr ? `hasta el ${venceStr}` : `${validez} días`}`;
  return msg;
}

export function copiarCotizacionWA(c) {
  copiarTexto(mensajeCotizacionWA(c));
}

// Comparativo: varias cotizaciones como opciones (1, 2, 3...) en un solo
// mensaje, sin sumar los montos. Para mandarle al cliente las alternativas.
export function mensajeComparativoWA(cots) {
  const cliente = (cots[0] && cots[0].cliente) || "Cliente";
  // "Producto — Diferencia": el producto va una vez arriba; por opción solo
  // la diferencia + el precio (resumido, para no aburrir al comprador).
  const partir = t => {
    const s = String(t || "");
    const i = s.indexOf("—");
    return i === -1
      ? { comun: s.trim(), etiqueta: "" }
      : { comun: s.slice(0, i).trim(), etiqueta: s.slice(i + 1).trim() };
  };
  const comun = partir(cots[0] && cots[0].tipoPrenda).comun || "Cotización";
  const qty0 = ((cots[0] && cots[0].tallasItems) || []).reduce((s, it) => s + (parseInt(it.qty) || 0), 0);

  let msg = `🧵 *TALLER IMIS — Cotización*\n`;
  msg += `*${comun}*\n`;
  msg += `Para ${cliente}${qty0 > 0 ? ` · ${qty0} u.` : ""}\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  cots.forEach((c, i) => {
    const items = c.tallasItems || [];
    const qty = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
    const total = parseFloat(c.precio || 0);
    const unit = qty > 0 ? total / qty : total;
    const etiqueta = partir(c.tipoPrenda).etiqueta || "Opción " + (i + 1);
    msg += `\n*Opción ${i + 1} — ${etiqueta}*\n`;
    msg += `   *$${unit.toFixed(2)} c/u${qty > 0 ? ` · $${total.toFixed(2)} (${qty} u.)` : ""}*\n`;
  });
  msg += `\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `Se elige una sola opción · 50% anticipo al confirmar 🙌`;
  return msg;
}

export function copiarComparativoWA(cots) {
  copiarTexto(mensajeComparativoWA(cots));
}

// URLs (Supabase/Drive) de la primera imagen de cada cotización, sin repetir.
function urlsDeImagenes(cots) {
  const urls = [];
  for (const c of cots) {
    const im = (c.imagenes || [])[0];
    const u = im && (im.supabaseUrl || im.driveUrl);
    if (u && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

// Comparte texto + imágenes con la hoja de compartir nativa (Web Share API
// nivel 2). En el celular deja elegir WhatsApp (u otra app) y manda la
// imagen CON el texto — esto resuelve que el link no genere miniatura.
// Si el navegador no soporta compartir archivos, comparte solo texto; y si
// no soporta compartir, copia al portapapeles.
// Devuelve "compartido" | "copiado" | "cancelado".
export async function compartirTextoImagenes(texto, urls = []) {
  try {
    if (urls.length && typeof navigator !== "undefined" && navigator.canShare) {
      const files = [];
      for (const url of urls) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const blob = await r.blob();
          const nombre = (url.split("/").pop() || "imagen.jpg").split("?")[0];
          files.push(new File([blob], nombre, { type: blob.type || "image/jpeg" }));
        } catch {
          /* imagen que no carga → se ignora */
        }
      }
      if (files.length && navigator.canShare({ files })) {
        await navigator.share({ files, text: texto });
        return "compartido";
      }
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text: texto });
      return "compartido";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelado";
    /* otro error → cae a copiar */
  }
  copiarTexto(texto);
  return "copiado";
}

export function compartirCotizacion(c) {
  return compartirTextoImagenes(mensajeCotizacionWA(c), urlsDeImagenes([c]));
}

export function compartirComparativo(cots) {
  return compartirTextoImagenes(mensajeComparativoWA(cots), urlsDeImagenes(cots));
}

// Copia texto al portapapeles con fallback para navegadores viejos / sin
// permiso de clipboard (móvil).
function copiarTexto(msg) {
  navigator.clipboard.writeText(msg).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = msg;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}
