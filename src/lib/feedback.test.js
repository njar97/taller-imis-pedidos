import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  pushToast,
  pushUndo,
  pushConfirm,
  _subscribeToasts,
  _subscribeConfirm,
  _getToasts,
  _getConfirm,
  _clearConfirm,
} from "./feedback.js";

// feedback.js es un singleton de módulo. Usamos fake timers para controlar
// la expiración de toasts y evitar contaminación entre tests.

describe("pushToast", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.runAllTimers(); // expira toasts pendientes
    vi.useRealTimers();
  });

  it("agrega un item al bus y notifica listeners", () => {
    const fn = vi.fn();
    const unsub = _subscribeToasts(fn);

    pushToast("Pedido guardado");

    expect(fn).toHaveBeenCalledTimes(1);
    const toasts = _getToasts();
    const t = toasts.find(x => x.msg === "Pedido guardado");
    expect(t).toBeDefined();
    expect(t.kind).toBe("info");
    expect(typeof t.id).toBe("number");

    unsub();
  });

  it("kind 'success' y 'error' se reflejan en el item", () => {
    pushToast("OK", "success");
    pushToast("Error", "error");

    const toasts = _getToasts();
    expect(toasts.find(t => t.msg === "OK")?.kind).toBe("success");
    expect(toasts.find(t => t.msg === "Error")?.kind).toBe("error");
  });

  it("remueve el toast después de la duración y notifica", () => {
    const fn = vi.fn();
    const unsub = _subscribeToasts(fn);

    pushToast("Temporal", "info", 1000);
    expect(_getToasts().find(t => t.msg === "Temporal")).toBeDefined();

    vi.advanceTimersByTime(1001);

    expect(_getToasts().find(t => t.msg === "Temporal")).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(2); // add + remove

    unsub();
  });

  it("múltiples toasts coexisten en el bus", () => {
    pushToast("A");
    pushToast("B");
    pushToast("C");

    const msgs = _getToasts().map(t => t.msg);
    expect(msgs).toContain("A");
    expect(msgs).toContain("B");
    expect(msgs).toContain("C");
  });

  it("unsub detiene las notificaciones al listener", () => {
    const fn = vi.fn();
    const unsub = _subscribeToasts(fn);

    pushToast("antes");
    unsub();
    pushToast("después");

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("pushUndo", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("agrega toast con acción 'Deshacer' y retorna id numérico", () => {
    const id = pushUndo("Pedido eliminado", vi.fn());

    expect(typeof id).toBe("number");
    const t = _getToasts().find(x => x.id === id);
    expect(t).toBeDefined();
    expect(t.msg).toBe("Pedido eliminado");
    expect(t.accion?.label).toBe("Deshacer");
  });

  it("onClick invoca onUndo y remueve el toast", () => {
    const onUndo = vi.fn();
    const id = pushUndo("Borrado", onUndo);

    _getToasts().find(t => t.id === id).accion.onClick();

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(_getToasts().find(t => t.id === id)).toBeUndefined();
  });

  it("doble click no dispara onUndo dos veces (yaUsado guard)", () => {
    const onUndo = vi.fn();
    const id = pushUndo("Borrado", onUndo);

    const { onClick } = _getToasts().find(t => t.id === id).accion;
    onClick();
    onClick();

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("el toast expira sin invocar onUndo si no se usa", () => {
    const onUndo = vi.fn();
    const id = pushUndo("Expira", onUndo, 1000);

    vi.advanceTimersByTime(1001);

    expect(_getToasts().find(t => t.id === id)).toBeUndefined();
    expect(onUndo).not.toHaveBeenCalled();
  });

  it("onUndo que lanza no revienta el bus", () => {
    const onUndo = vi.fn(() => { throw new Error("undo falló"); });
    const id = pushUndo("Test", onUndo);

    expect(() => _getToasts().find(t => t.id === id).accion.onClick()).not.toThrow();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});

describe("pushConfirm", () => {
  afterEach(() => { _clearConfirm(); });

  it("retorna una Promise y expone el diálogo en _getConfirm", () => {
    const p = pushConfirm({ msg: "¿Eliminar?" });

    expect(p).toBeInstanceOf(Promise);
    const c = _getConfirm();
    expect(c?.msg).toBe("¿Eliminar?");
    expect(typeof c?.resolve).toBe("function");
  });

  it("_subscribeConfirm notifica cuando se abre un confirm", () => {
    const fn = vi.fn();
    const unsub = _subscribeConfirm(fn);

    pushConfirm({ msg: "¿Confirmar?" });

    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("_clearConfirm limpia el confirm y notifica listeners", () => {
    const fn = vi.fn();
    const unsub = _subscribeConfirm(fn);

    pushConfirm({ msg: "Test" });
    _clearConfirm();

    expect(_getConfirm()).toBeNull();
    expect(fn).toHaveBeenCalledTimes(2); // open + clear
    unsub();
  });

  it("resolve(true) resuelve la promise con true", async () => {
    const p = pushConfirm({ msg: "¿Ok?" });
    _getConfirm().resolve(true);
    await expect(p).resolves.toBe(true);
  });

  it("resolve(false) resuelve la promise con false", async () => {
    const p = pushConfirm({ msg: "¿Cancelar?" });
    _getConfirm().resolve(false);
    await expect(p).resolves.toBe(false);
  });

  it("unsub detiene notificaciones del confirm", () => {
    const fn = vi.fn();
    const unsub = _subscribeConfirm(fn);
    unsub();

    pushConfirm({ msg: "ignorado" });

    expect(fn).not.toHaveBeenCalled();
  });
});
