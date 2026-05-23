// Snapshot rápido en localStorage cuando se edita un pedido.
// Permite deshacer la última edición durante 1 hora desde el detalle
// del pedido. Es complementario al historial de versiones en BD
// (que ya tiene TODAS las versiones, sin límite de tiempo).
//
// La diferencia: este snapshot está al alcance de un click en el
// banner del detalle, sin abrir el modal de versiones.

const VENTANA_MS = 60 * 60 * 1000; // 1 hora
const PREFIX = "TALLER_EDIT_RECIENTE_";

function key(pedidoId) {
  return PREFIX + pedidoId;
}

// Guarda el snapshot del pedido antes de modificarlo.
// Llamado desde guardarPedido() en main.jsx, justo antes del UPDATE.
export function guardarSnapshot(pedidoAnterior) {
  if (!pedidoAnterior || !pedidoAnterior.id) return;
  try {
    localStorage.setItem(key(pedidoAnterior.id), JSON.stringify({
      snapshot: pedidoAnterior,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn("guardarSnapshot falló:", e.message);
  }
}

// Lee el snapshot reciente. Devuelve null si no hay o si expiró.
export function leerSnapshotReciente(pedidoId) {
  try {
    const raw = localStorage.getItem(key(pedidoId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.timestamp || Date.now() - data.timestamp > VENTANA_MS) {
      localStorage.removeItem(key(pedidoId));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function limpiarSnapshot(pedidoId) {
  try { localStorage.removeItem(key(pedidoId)); } catch {}
}
