import { describe, it, expect } from "vitest";
import {
  fmt$,
  hoy,
  tallasTexto,
  tallasItemsTexto,
  resumenTallas,
  rankTalla,
  medidaCuelloParaTalla,
  itemsResumen,
  carritoPedido,
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

describe("rankTalla", () => {
  it("orden natural pequeño → grande: niño numérico antes que letras de adulto", () => {
    const tallas = ["XXL", "S", "14", "6", "M", "12", "XL", "L", "8"];
    tallas.sort((a, b) => rankTalla(a) - rankTalla(b));
    expect(tallas).toEqual(["6", "8", "12", "14", "S", "M", "L", "XL", "XXL"]);
  });

  it("XXL y 2XL son la misma talla (legacy); sin talla va al final", () => {
    expect(rankTalla("XXL")).toBe(rankTalla("2XL"));
    expect(rankTalla("XXXL")).toBe(rankTalla("3XL"));
    expect(rankTalla("XL")).toBeLessThan(rankTalla("XXL"));
    expect(rankTalla("")).toBeGreaterThan(rankTalla("XXL"));
  });

  it("itemsResumen ordena por talla con el rank nuevo", () => {
    const p = {
      modoRegistro: "tallas",
      tallasItems: [
        { id: 1, talla: "XXL", qty: 3 },
        { id: 2, talla: "6", qty: 3 },
        { id: 3, talla: "S", qty: 4 },
        { id: 4, talla: "14", qty: 2 },
      ],
    };
    expect(itemsResumen(p).map(it => it.talla)).toEqual(["6", "14", "S", "XXL"]);
  });
});

describe("PEDIDO_BASE", () => {
  it("tiene todos los campos default esperados", () => {
    expect(PEDIDO_BASE.cliente).toBe("");
    expect(PEDIDO_BASE.tipoCliente).toBe("persona");
    expect(PEDIDO_BASE.estatus).toBe("Corte");
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

describe("medidaCuelloParaTalla", () => {
  it("tallas de nino: hasta la 8 usan cuello 11; 10-12 usan 12", () => {
    expect(medidaCuelloParaTalla("4")).toBe('11"');
    expect(medidaCuelloParaTalla("6")).toBe('11"');
    expect(medidaCuelloParaTalla("8")).toBe('11"');
    expect(medidaCuelloParaTalla("10")).toBe('12"');
    expect(medidaCuelloParaTalla(12)).toBe('12"');
  });

  it("14 y S usan 14; M-L usan 15; XL en adelante usan 17", () => {
    expect(medidaCuelloParaTalla("14")).toBe('14"');
    expect(medidaCuelloParaTalla("S")).toBe('14"');
    expect(medidaCuelloParaTalla("XS")).toBe('14"');
    expect(medidaCuelloParaTalla("M")).toBe('15"');
    expect(medidaCuelloParaTalla("L")).toBe('15"');
    expect(medidaCuelloParaTalla("XL")).toBe('17"');
    expect(medidaCuelloParaTalla("XXL")).toBe('17"');
    expect(medidaCuelloParaTalla("2XL")).toBe('17"');
    expect(medidaCuelloParaTalla("4XL")).toBe('17"');
  });

  it("acepta minusculas y espacios", () => {
    expect(medidaCuelloParaTalla(" m ")).toBe('15"');
    expect(medidaCuelloParaTalla("xxl")).toBe('17"');
  });

  it("tallas que no mapean devuelven null (numericas de camisa, vacias, texto libre)", () => {
    expect(medidaCuelloParaTalla("38")).toBe(null);
    expect(medidaCuelloParaTalla("")).toBe(null);
    expect(medidaCuelloParaTalla(null)).toBe(null);
    expect(medidaCuelloParaTalla("Especial")).toBe(null);
  });
});

describe("carritoPedido", () => {
  const pedido = {
    tipoPrenda: "Filipina",
    precio: "226.00", // 17 filipinas facturables @ ~$13.29 (usamos precio del pedido)
    personas: [
      { nombre: "Ana", talla: "M", noFactura: false, prendas: [{ tipo: "Filipina", talla: "M", precio: 13 }] },
      { nombre: "Luis", talla: "L", noFactura: false, prendas: [{ tipo: "Filipina", talla: "L", precio: 13 }] },
      { nombre: "Extra1", noFactura: true, prendas: [{ tipo: "Filipina", talla: "XL", precio: 30 }] },
      { nombre: "Extra2", noFactura: true, prendas: [{ tipo: "Filipina", talla: "XL", precio: 30 }] },
    ],
    componentes: [
      { nombre: "Gabacha", cantidad: 17, precio: 8 },
      { nombre: "Gorro", cantidad: 17, precio: "" }, // sin precio → se produce, no factura
    ],
  };

  it("separa factura, pago aparte y sin precio", () => {
    const c = carritoPedido(pedido);
    // Factura: personas facturables + componentes con precio (gabacha)
    expect(c.factura.lineas.some(l => l.tipo === "Gabacha")).toBe(true);
    expect(c.factura.total).toBeCloseTo(226, 2);
    // Pago aparte: las 2 filipinas XL noFactura, agrupadas → qty 2, subtotal 60
    expect(c.aparte.lineas).toHaveLength(1);
    expect(c.aparte.lineas[0].qty).toBe(2);
    expect(c.aparte.total).toBeCloseTo(60, 2);
    // Sin precio: el gorro (componente sin precio)
    expect(c.sinPrecio).toHaveLength(1);
    expect(c.sinPrecio[0].nombre).toBe("Gorro");
    expect(c.sinPrecio[0].qty).toBe(17);
  });

  it("un pedido vacío no rompe", () => {
    const c = carritoPedido({ personas: [], componentes: [] });
    expect(c.factura.lineas).toHaveLength(0);
    expect(c.aparte.lineas).toHaveLength(0);
    expect(c.sinPrecio).toHaveLength(0);
  });
});
