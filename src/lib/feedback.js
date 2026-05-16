// Bus de notificaciones (toasts) + diálogo de confirmación.
// Singleton a nivel de módulo — accesible desde cualquier archivo via import.
// Los componentes React Toaster y ConfirmDialog viven en main.js y se
// suscriben con _subscribeToasts / _subscribeConfirm.

function buzz(pattern = 15) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

// ── Toasts ──────────────────────────────────────────

const _toastBus = { items: [], listeners: new Set() };

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

export function _subscribeToasts(fn) {
  _toastBus.listeners.add(fn);
  return () => _toastBus.listeners.delete(fn);
}

export function _getToasts() {
  return _toastBus.items;
}

// ── Confirm ─────────────────────────────────────────

const _confirmBus = { current: null, listeners: new Set() };

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
