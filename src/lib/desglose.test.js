import { describe, it, expect } from "vitest";
import { analizarDesglose, ordenarTallas, parteDetalle, parteVariante, rankTalla } from "./desglose.js";

// Las cuatro naturalezas REALES de la base (14 / 3 / 3 / 2 de 22 pedidos).
const UN_ITEM = [{ talla: "M", qty: 35, precio: "12", tipo: "Camisa" }];
const SOLO_TALLAS = [                                   // tipo #24: mismo precio
  { talla: "8", qty: 15, precio: "8" }, { talla: "4", qty: 6, precio: "8" },
  { talla: "M", qty: 5, precio: "8" }, { talla: "6", qty: 17, precio: "8" },
];
const POR_PRECIO = [                                    // tipo #65 Mizata
  { tipo: "Camisa manga larga", talla: "M", qty: 3, precio: "18" },
  { tipo: "Chaleco", talla: "M", qty: 2, precio: "25" },
  { tipo: "Delantal", talla: "M", qty: 5, precio: "9.5" },
  { tipo: "Gorro", talla: "M", qty: 7, precio: "4" },
];
const CRUZADO = [                                       // tipo #38 Mañanitas
  { talla: "6", qty: 9, precio: "5.5", spec: "Azul" },
  { talla: "6", qty: 3, precio: "5.5", spec: "Verde" },
  { talla: "8", qty: 8, precio: "5.5", spec: "Amarillo" },
  { talla: "4", qty: 4, precio: "5.5", spec: "Rojo" },
  { talla: "M", qty: 2, precio: "5.5", spec: "Azul · cuello V" },
];

describe("elegir la forma segun la naturaleza", () => {
  it("un solo item -> linea", () => {
    expect(analizarDesglose(UN_ITEM).forma).toBe("linea");
  });
  it("solo tallas y mismo precio -> tira", () => {
    expect(analizarDesglose(SOLO_TALLAS).forma).toBe("tira");
  });
  it("casi cada linea con su precio -> tabla (Mizata)", () => {
    expect(analizarDesglose(POR_PRECIO).forma).toBe("tabla");
  });
  it("talla x color -> cuadro (Mañanitas)", () => {
    expect(analizarDesglose(CRUZADO).forma).toBe("cuadro");
  });
});

describe("el precio se decide aparte de la forma", () => {
  it("precio unico: una sola vez, no 25 veces", () => {
    const d = analizarDesglose(CRUZADO);
    expect(d.precioUnico).toBe(5.5);
    expect(d.totalMonto).toBeCloseTo(26 * 5.5);
  });
  it("precios variados: no hay precio unico", () => {
    expect(analizarDesglose(POR_PRECIO).precioUnico).toBeNull();
  });
});

describe("el cuadro", () => {
  const d = analizarDesglose(CRUZADO);
  it("filas por talla ordenadas, columnas por color", () => {
    expect(d.filas.map(f => f.talla)).toEqual(["4", "6", "8", "M"]);
    expect(d.columnas).toEqual(["Amarillo", "Azul", "Rojo", "Verde"]);
  });
  it("los totales por fila cuadran", () => {
    expect(d.filas.find(f => f.talla === "6").total).toBe(12);
    expect(d.totalQty).toBe(26);
  });
  it("la variante del spec NO se pierde: queda como nota", () => {
    // "Azul · cuello V" -> el cuadro agrupa por Azul y anota el cuello V
    expect(d.notas.join(" ")).toContain("cuello V");
  });
});

describe("orden de tallas", () => {
  it("numericas primero, letras despues — el bug del detalle", () => {
    // antes salian M, L, XL antes que 2, 4, 6
    const r = ordenarTallas([{ talla: "M" }, { talla: "2" }, { talla: "XL" },
                             { talla: "10" }, { talla: "4" }]);
    expect(r.map(x => x.talla)).toEqual(["2", "4", "10", "M", "XL"]);
  });
  it("10 va despues de 4, no antes (orden numerico, no alfabetico)", () => {
    expect(rankTalla("10")).toBeGreaterThan(rankTalla("4"));
  });
  it("«A la medida» cae al final", () => {
    expect(rankTalla("A la medida")).toBeGreaterThan(rankTalla("3XL"));
  });
});

describe("el spec partido", () => {
  it("color y variante se separan por el punto medio", () => {
    expect(parteDetalle("Azul · cuello V")).toBe("Azul");
    expect(parteVariante("Azul · cuello V")).toBe("cuello V");
    expect(parteVariante("Rojo")).toBe("");
  });
});
