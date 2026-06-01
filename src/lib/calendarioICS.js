// Genera archivos .ics (RFC 5545) para agregar entregas al calendario
// nativo del teléfono. Cuando el user toca '📅 Agregar al calendario'
// en un pedido, el navegador descarga el .ics y el sistema operativo
// abre la app de Calendario para confirmar.
//
// Beneficios:
//   - El recordatorio queda en el calendario del teléfono — funciona
//     aunque la PWA esté cerrada.
//   - El user configura su propia alerta (15 min antes, 1 día antes,
//     etc.) desde el calendario, no en nuestra app.
//   - Sin backend, sin permisos especiales.

function escapeICS(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Formato YYYYMMDD a partir de "YYYY-MM-DD"
function fechaICS(yyyy_mm_dd) {
  return (yyyy_mm_dd || "").replace(/-/g, "");
}

// Día siguiente (para DTEND, evento all-day)
function siguienteDia(yyyy_mm_dd) {
  const d = new Date(yyyy_mm_dd + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

const stamp = () => new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

// Genera el VCALENDAR para un pedido. Evento "all-day" en la fecha de
// entrega, con alarma 1 día antes.
export function pedidoToICS(p) {
  if (!p.fechaEntrega) return null;
  const num = String(p.id).padStart(4, "0");
  const dtStart = fechaICS(p.fechaEntrega);
  const dtEnd = fechaICS(siguienteDia(p.fechaEntrega));
  const summary = `Entrega N°${num} — ${p.cliente || "Cliente"}`;
  const desc = [
    `Pedido N°${num}`,
    p.cliente && `Cliente: ${p.cliente}`,
    p.telefono && `Teléfono: ${p.telefono}`,
    p.tipoPrenda && `Prenda: ${p.tipoPrenda}`,
    p.estatus && `Estatus: ${p.estatus}`,
    p.notas && `Notas: ${p.notas}`,
  ].filter(Boolean).join("\\n");
  const uid = `taller-imis-pedido-${p.id}@njar97.github.io`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Taller IMIS//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${desc}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-P1D",
    `DESCRIPTION:${escapeICS("Mañana entrega: " + (p.cliente || ""))}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// Dispara la descarga del .ics. En Android Chrome abre el diálogo
// "Abrir con Calendario / Google Calendar". En iOS Safari descarga
// y abre Calendar.app.
export function descargarICSPedido(p) {
  const contenido = pedidoToICS(p);
  if (!contenido) return false;
  const blob = new Blob([contenido], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const num = String(p.id).padStart(4, "0");
  a.href = url;
  a.download = `pedido-${num}-${(p.cliente || "cliente").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
