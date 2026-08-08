// Lo que se protege acá es que un abono no se pierda en silencio: si el
// guardado no llega al servidor, el cambio tiene que quedar guardado en el
// aparato y volver a intentarse solo. Un fallo silencioso significa cobrar
// dos veces o no cobrar.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  contarPendientes, encolar, guardarSeguro, leerCola, quitarDeCola, vaciarCola,
} from "./colaGuardado.js";

vi.mock("./feedback.js", () => ({ pushToast: vi.fn() }));

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
  };
};

let st;
beforeEach(() => { st = fakeStorage(); });

describe("cola", () => {
  it("guarda y devuelve lo encolado", () => {
    encolar("taller_bordados", { id: 7, cliente: "INSO" }, st);
    const cola = leerCola(st);
    expect(cola).toHaveLength(1);
    expect(cola[0].obj.cliente).toBe("INSO");
  });

  it("un solo pendiente por registro: vale el último estado", () => {
    encolar("taller_bordados", { id: 7, anticipo: "10" }, st);
    encolar("taller_bordados", { id: 7, anticipo: "25" }, st);
    const cola = leerCola(st);
    expect(cola).toHaveLength(1);
    expect(cola[0].obj.anticipo).toBe("25");
  });

  it("no confunde el mismo id de tablas distintas", () => {
    encolar("taller_bordados", { id: 7 }, st);
    encolar("taller_cuellos", { id: 7 }, st);
    expect(contarPendientes(null, st)).toBe(2);
    expect(contarPendientes("taller_cuellos", st)).toBe(1);
  });

  it("quitar saca solo el que toca", () => {
    encolar("taller_bordados", { id: 7 }, st);
    encolar("taller_bordados", { id: 8 }, st);
    quitarDeCola("taller_bordados", 7, st);
    expect(leerCola(st).map(x => x.obj.id)).toEqual([8]);
  });

  it("una cola corrupta no rompe la app", () => {
    st.setItem("taller_cola_guardado", "{no es json");
    expect(leerCola(st)).toEqual([]);
  });
});

describe("guardarSeguro", () => {
  it("si guarda bien, no deja nada pendiente", async () => {
    const ok = await guardarSeguro({
      tabla: "taller_bordados", obj: { id: 3 },
      guardar: async () => true, storage: st,
    });
    expect(ok).toBe(true);
    expect(contarPendientes(null, st)).toBe(0);
  });

  it("si el guardado lanza, encola en vez de perder el cambio", async () => {
    const ok = await guardarSeguro({
      tabla: "taller_bordados", obj: { id: 3, anticipo: "40" },
      guardar: async () => { throw new Error("sin red"); }, storage: st,
    });
    expect(ok).toBe(false);
    expect(leerCola(st)[0].obj.anticipo).toBe("40");
  });

  // upsertTabla devuelve false en vez de lanzar cuando el servidor rechaza;
  // sin esto un rechazo del servidor se veía como éxito.
  it("trata el false del cliente REST como fallo", async () => {
    const ok = await guardarSeguro({
      tabla: "taller_cuellos", obj: { id: 5 },
      guardar: async () => false, storage: st,
    });
    expect(ok).toBe(false);
    expect(contarPendientes("taller_cuellos", st)).toBe(1);
  });

  it("un reintento exitoso limpia el pendiente anterior", async () => {
    await guardarSeguro({
      tabla: "taller_bordados", obj: { id: 3 },
      guardar: async () => { throw new Error("sin red"); }, storage: st,
    });
    await guardarSeguro({
      tabla: "taller_bordados", obj: { id: 3 },
      guardar: async () => true, storage: st,
    });
    expect(contarPendientes(null, st)).toBe(0);
  });
});

describe("vaciarCola", () => {
  it("guarda lo pendiente y lo saca de la cola", async () => {
    encolar("taller_bordados", { id: 1 }, st);
    encolar("taller_bordados", { id: 2 }, st);
    const guardados = [];
    const n = await vaciarCola({
      taller_bordados: async o => { guardados.push(o.id); return true; },
    }, st);
    expect(n).toBe(2);
    expect(guardados).toEqual([1, 2]);
    expect(contarPendientes(null, st)).toBe(0);
  });

  it("si sigue sin red, lo deja para el próximo intento", async () => {
    encolar("taller_bordados", { id: 1 }, st);
    const n = await vaciarCola({
      taller_bordados: async () => { throw new Error("sin red"); },
    }, st);
    expect(n).toBe(0);
    expect(contarPendientes(null, st)).toBe(1);
  });

  it("no toca lo de una tabla para la que no hay guardador", async () => {
    encolar("taller_cuellos", { id: 9 }, st);
    const n = await vaciarCola({ taller_bordados: async () => true }, st);
    expect(n).toBe(0);
    expect(contarPendientes("taller_cuellos", st)).toBe(1);
  });
});
