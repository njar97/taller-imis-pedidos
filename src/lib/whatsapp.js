// Mensajería para WhatsApp: arma el texto del pedido y lo copia al portapapeles.
// Antes vivía como mensajeWA + copiarWA en main.js.
// Usado por WABtn (lib/ui.jsx), CardPedido y App.

import { resumenTallas } from "./dominio.js";

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
  const tallasDetalle = p.tallasItems && p.tallasItems.length
    ? p.tallasItems
        .map(it => {
          const pr =
            it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0
              ? ` · $${parseFloat(it.precio).toFixed(2)} c/u`
              : "";
          return `  • ${it.talla}: ${it.qty} ${it.qty === 1 ? "prenda" : "prendas"}${pr}${it.spec ? " (" + it.spec + ")" : ""}`;
        })
        .join("\n")
    : tallas
    ? `  • ${tallas}`
    : "";

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
  if (tallasDetalle) {
    msg += `\n📦 *Tallas y cantidades:*\n${tallasDetalle}\n`;
  }
  if (p.descripcion) msg += `\n📝 ${p.descripcion}\n`;
  if (p.tieneBordado) msg += `\n🪡 Lleva bordado${p.estatusDiseno ? " — " + p.estatusDiseno : ""}`;
  msg += `\n\n📅 *Entrega: ${p.fechaEntrega || "—"}*${diasStr}`;
  if (p.estatus) msg += `\n   Estado: ${p.estatus}`;
  if (esAdmin) {
    const totalPzas = (p.tallasItems || []).reduce((s, it) => s + it.qty, 0);
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
  if (p.notas) msg += `\n\n💬 ${p.notas}`;
  msg += `\n━━━━━━━━━━━━━━━━━━`;
  return msg;
}

export function copiarWA(p, esAdmin = false) {
  const msg = mensajeWA(p, esAdmin);
  navigator.clipboard.writeText(msg).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = msg;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}
