// Bus de notificaciones (toasts) + diálogo de confirmación.
// Singleton a nivel de módulo — accesible desde cualquier archivo via import.
// Los componentes React Toaster y ConfirmDialog viven en main.js y se
// suscriben con _subscribeToasts / _subscribeConfirm.

/**
 * @typedef {'info'|'success'|'error'|'warn'} ToastKind
 */

/**
 * @typedef {Object} ConfirmOpts
 * @property {string} titulo
 * @property {string} [mensaje]
 * @property {string} [okLabel]
 * @property {string} [cancelLabel]
 * @property {'danger'|'warn'|'info'} [kind]
 */

function buzz(pattern = 15) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

// ── Toasts ──────────────────────────────────────────

const _toastBus = { items: [], listeners: new Set() };

/**
 * Muestra un toast temporal en la app.
 * @param {string} msg - Texto del toast.
 * @param {ToastKind} [kind='info'] - Variante visual.
 * @param {number} [duracion=3500] - Duración en ms.
 */
export function pushToast(msg, kind = "info", duracion = 3500) {
  if (kind === "success") buzz(15);
  if (kind === "error") buzz([20, 60, 20]);
  const id = Date.now() + Math.random();
  _toastBus.items = [..._toastBus.items, { id, msg, kind }];
  _toastBus.listeners.forEach(fn => fn());
  setTimeout(() => {
    _toastBus.items = _toastBus.items.filter(t => t.id !== id);
    _toastBus.listeners.forEach(fn => fn());
  }, duracion);
}

/**
 * Muestra un toast con botón "Deshacer". La acción sólo puede ejecutarse
 * una vez (guard interno `yaUsado`). Más largo que un toast normal porque
 * leer + decidir lleva tiempo.
 * @param {string} msg
 * @param {() => void} onUndo - Callback al presionar "Deshacer".
 * @param {number} [duracion=6000]
 * @returns {number} id del toast (para cerrarlo manualmente si hace falta).
 */
export function pushUndo(msg, onUndo, duracion = 6000) {
  buzz(15);
  const id = Date.now() + Math.random();
  let yaUsado = false;
  const accion = {
    label: "Deshacer",
    onClick: () => {
      if (yaUsado) return;
      yaUsado = true;
      _toastBus.items = _toastBus.items.filter(t => t.id !== id);
      _toastBus.listeners.forEach(fn => fn());
      try { onUndo(); } catch (e) { console.error("undo falló:", e); }
    },
  };
  _toastBus.items = [..._toastBus.items, { id, msg, kind: "info", accion }];
  _toastBus.listeners.forEach(fn => fn());
  setTimeout(() => {
    _toastBus.items = _toastBus.items.filter(t => t.id !== id);
    _toastBus.listeners.forEach(fn => fn());
  }, duracion);
  return id;
}

export function _subscribeToasts(fn) {
  _toastBus.listeners.add(fn);
  return () => _toastBus.listeners.delete(fn);
}

export function _getToasts() {
  return _toastBus.items;
}

// ── Confirm ─────────────────────────────────────────

const _confirmBus = { current: null, listeners: new Set() };

/**
 * Abre el diálogo de confirmación global y devuelve una Promise que
 * resuelve `true` (confirmó) o `false` (canceló).
 * @param {ConfirmOpts} opts
 * @returns {Promise<boolean>}
 */
export function pushConfirm(opts) {
  return new Promise(resolve => {
    _confirmBus.current = { ...opts, resolve };
    _confirmBus.listeners.forEach(fn => fn());
  });
}

export function _subscribeConfirm(fn) {
  _confirmBus.listeners.add(fn);
  return () => _confirmBus.listeners.delete(fn);
}

export function _getConfirm() {
  return _confirmBus.current;
}

export function _clearConfirm() {
  _confirmBus.current = null;
  _confirmBus.listeners.forEach(fn => fn());
}

export { buzz };
