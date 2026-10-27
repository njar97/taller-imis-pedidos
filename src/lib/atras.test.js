import { describe, it, expect, beforeAll } from "vitest";

// Historial falso: back() es asíncrono como en el navegador.
const entradas = [{}];
let pos = 0;
const oyentes = [];
const tick = () => new Promise(r => setTimeout(r, 5));
beforeAll(() => {
  globalThis.window = { addEventListener: (t, f) => t === "popstate" && oyentes.push(f) };
  globalThis.history = {
    pushState(st) { entradas.splice(pos + 1); entradas.push(st); pos++; },
    back() { setTimeout(() => { if (pos > 0) { pos--; oyentes.forEach(f => f()); } }, 1); },
  };
});
const atras = async () => { history.back(); await tick(); };

describe("botón atrás", () => {
  it("atrás cierra la ventana de arriba, después la de abajo", async () => {
    const { abrirNivel } = await import("./atras.js");
    const cerradas = [];
    abrirNivel(() => cerradas.push("seccion"));
    abrirNivel(() => cerradas.push("ficha"));
    expect(pos).toBe(2);
    await atras();
    expect(cerradas).toEqual(["ficha"]);
    await atras();
    expect(cerradas).toEqual(["ficha", "seccion"]);
    expect(pos).toBe(0);
  });

  it("cerrar con la ✕ retrocede el historial sin cerrar otra cosa", async () => {
    const { abrirNivel } = await import("./atras.js");
    const cerradas = [];
    abrirNivel(() => cerradas.push("seccion"));
    const quitar = abrirNivel(() => cerradas.push("ficha"));
    quitar();
    await tick();
    expect(cerradas).toEqual([]);
    expect(pos).toBe(1);
    await atras();
    expect(cerradas).toEqual(["seccion"]);
  });

  it("cerrar y abrir otra enseguida no pierde la entrada", async () => {
    const { abrirNivel } = await import("./atras.js");
    const cerradas = [];
    const quitar = abrirNivel(() => cerradas.push("a"));
    quitar();
    abrirNivel(() => cerradas.push("b"));
    await tick();
    expect(pos).toBe(1);
    await atras();
    expect(cerradas).toEqual(["b"]);
    expect(pos).toBe(0);
  });
});
