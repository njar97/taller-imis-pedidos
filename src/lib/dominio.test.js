import { describe, it, expect } from "vitest";
import {
  fmt$,
  hoy,
  tallasTexto,
  tallasItemsTexto,
  resumenTallas,
  PEDIDO_BASE,
} from "./dominio.js";

describe("fmt$", () => {
  it("formatea números con 2 decimales y signo $", () => {
    expect(fmt$(10)).toBe("$10.00");
    expect(fmt$(0.5)).toBe("$0.50");
    expect(fmt$(123.456)).toBe("$123.46");
  });

  it("acepta strings numéricos", () => {
    expect(fmt$("25")).toBe("$25.00");
    expect(fmt$("3.14")).toBe("$3.14");
  });

  it("convierte null/undefined/'' a $0.00", () => {
    expect(fmt$(null)).toBe("$0.00");
    expect(fmt$(undefined)).toBe("$0.00");
    expect(fmt$("")).toBe("$0.00");
  });
});

describe("hoy", () => {
  it("devuelve la fecha en formato YYYY-MM-DD", () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("tallasTexto", () => {
  it("formatea cantidades positivas separadas por ' · '", () => {
    expect(tallasTexto({ S: 2, M: 0, L: 3 })).toBe("2×S · 3×L");
  });

  it("omite tallas con cantidad 0 o vacía", () => {
    expect(tallasTexto({ XS: 1, S: 0, M: "", L: 4 })).toBe("1×XS · 4×L");
  });

  it("devuelve string vacío con objeto vacío", () => {
    expect(tallasTexto({})).toBe("");
    expect(tallasTexto()).toBe("");
  });
});

describe("tallasItemsTexto", () => {
  it("formatea items básicos sin spec ni precio", () => {
    expect(tallasItemsTexto([{ qty: 3, talla: "M" }])).toBe("3×M");
  });

  it("incluye spec corto entre paréntesis", () => {
    expect(
      tallasItemsTexto([{ qty: 2, talla: "L", spec: "azul" }])
    ).toBe("2×L(azul)");
  });

  it("abrevia specs largos quitando vocales", () => {
    const out = tallasItemsTexto([{ qty: 1, talla: "S", spec: "azul oscuro talla especial" }]);
    expect(out).toMatch(/^1×S\(.+\)$/);
    expect(out).not.toContain("azul oscuro talla especial");
  });

  it("incluye precio cuando es positivo", () => {
    expect(
      tallasItemsTexto([{ qty: 1, talla: "M", precio: "25" }])
    ).toBe("1×M(@$25.00)");
  });

  it("omite precio 0 o vacío", () => {
    expect(
      tallasItemsTexto([{ qty: 1, talla: "M", precio: "0" }])
    ).toBe("1×M");
    expect(
      tallasItemsTexto([{ qty: 1, talla: "M", precio: "" }])
    ).toBe("1×M");
  });

  it("combina varios items con ' · '", () => {
    expect(
      tallasItemsTexto([
        { qty: 2, talla: "S" },
        { qty: 3, talla: "M" },
      ])
    ).toBe("2×S · 3×M");
  });
});

describe("resumenTallas", () => {
  it("prefiere tallasItems si tiene contenido", () => {
    const p = {
      tallasItems: [{ qty: 1, talla: "M" }],
      modoTallas: "libre",
      tallasLibre: "ignorar",
      tallasQty: { L: 5 },
    };
    expect(resumenTallas(p)).toBe("1×M");
  });

  it("usa tallasLibre cuando modoTallas es 'libre'", () => {
    const p = { modoTallas: "libre", tallasLibre: "tallas mixtas" };
    expect(resumenTallas(p)).toBe("tallas mixtas");
  });

  it("usa tallasQty por defecto", () => {
    const p = { tallasQty: { S: 1, L: 2 } };
    expect(resumenTallas(p)).toBe("1×S · 2×L");
  });

  it("devuelve string vacío sin datos", () => {
    expect(resumenTallas({})).toBe("");
  });
});

describe("PEDIDO_BASE", () => {
  it("tiene todos los campos default esperados", () => {
    expect(PEDIDO_BASE.cliente).toBe("");
    expect(PEDIDO_BASE.tipoCliente).toBe("persona");
    expect(PEDIDO_BASE.estatus).toBe("Tomado");
    expect(PEDIDO_BASE.tipoDocumento).toBe("Consumidor Final");
    expect(PEDIDO_BASE.costurera).toBe("(Sin asignar)");
    expect(PEDIDO_BASE.imagenes).toEqual([]);
    expect(PEDIDO_BASE.abonos).toEqual([]);
    expect(PEDIDO_BASE.personas).toEqual([]);
  });

  it("medidas vienen inicializadas (no null)", () => {
    expect(typeof PEDIDO_BASE.medidas).toBe("object");
    expect(PEDIDO_BASE.medidas).not.toBeNull();
  });
});
