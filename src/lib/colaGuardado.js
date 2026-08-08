// Cola de guardados que no llegaron al servidor.
//
// Confección ya tenía red de seguridad (el pedido queda local, sale un banner
// y se reintenta). Bordados y Cuellos guardaban "y que Dios reparta suerte":
// sin await y sin reintento. Con mala señal registrabas un abono, salía un
// toast que se iba en 5 segundos, y al recargar el cambio no estaba — la
// carga inicial pisa lo local. Resultado real: cobrar dos veces, o no cobrar.
//
// Acá el registro que no se pudo guardar queda en localStorage y se reintenta
// solo: al volver a entrar a la sección y cuando el navegador avisa que hay
// red. Sobrevive a cerrar la app.

import { pushToast } from "./feedback.js";

const LS_KEY = "taller_cola_guardado";

export function leerCola(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(LS_KEY);
    const cola = raw ? JSON.parse(raw) : [];
    return Array.isArray(cola) ? cola : [];
  } catch {
    return [];
  }
}

function escribirCola(cola, storage = globalThis.localStorage) {
  try {
    storage.setItem(LS_KEY, JSON.stringify(cola));
  } catch { /* cuota llena: mejor perder la cola que romper la app */ }
}

// Un solo pendiente por (tabla, id): si editás dos veces sin red, vale el
// último estado, no los dos.
export function encolar(tabla, obj, storage = globalThis.localStorage) {
  const cola = leerCola(storage).filter(x => !(x.tabla === tabla && x.obj?.id === obj?.id));
  cola.push({ tabla, obj, ts: new Date().toISOString() });
  escribirCola(cola, storage);
  return cola;
}

export function quitarDeCola(tabla, id, storage = globalThis.localStorage) {
  const cola = leerCola(storage).filter(x => !(x.tabla === tabla && x.obj?.id === id));
  escribirCola(cola, storage);
  return cola;
}

export function contarPendientes(tabla = null, storage = globalThis.localStorage) {
  const cola = leerCola(storage);
  return tabla ? cola.filter(x => x.tabla === tabla).length : cola.length;
}

// Guarda esperando la respuesta. Si falla, encola y avisa con un toast largo
// en vez de uno que se va solo. Devuelve true/false — nunca lanza, para no
// romper el flujo de la UI (el registro ya está en pantalla).
export async function guardarSeguro({ tabla, obj, guardar, que = "el cambio", storage }) {
  const st = storage || globalThis.localStorage;
  try {
    const r = await guardar(obj);
    // upsertTabla devuelve false en vez de lanzar cuando el servidor rechaza.
    if (r === false) throw new Error("el servidor rechazó el guardado");
    quitarDeCola(tabla, obj?.id, st);
    return true;
  } catch (e) {
    encolar(tabla, obj, st);
    console.error(`guardarSeguro(${tabla}#${obj?.id}) falló:`, e);
    pushToast(
      `No se pudo guardar ${que}. Quedó pendiente y se reintenta al volver la señal.`,
      "error",
      9000
    );
    return false;
  }
}

// Reintenta todo lo pendiente. `guardadores` es { tabla: fn }.
// Devuelve cuántos se lograron guardar.
export async function vaciarCola(guardadores, storage = globalThis.localStorage) {
  const cola = leerCola(storage);
  if (!cola.length) return 0;
  let logrados = 0;
  for (const item of cola) {
    const fn = guardadores[item.tabla];
    if (!fn) continue;
    try {
      const r = await fn(item.obj);
      if (r === false) continue;
      quitarDeCola(item.tabla, item.obj?.id, storage);
      logrados++;
    } catch {
      // sigue sin red: se queda en la cola para el próximo intento
    }
  }
  if (logrados > 0) {
    pushToast(
      `${logrados} cambio${logrados === 1 ? "" : "s"} pendiente${logrados === 1 ? "" : "s"} ya se guardó${logrados === 1 ? "" : "n"} ✓`,
      "success"
    );
  }
  return logrados;
}
