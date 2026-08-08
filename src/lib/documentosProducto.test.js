// La hoja de taller "por talla" es el formato de referencia del duenio — y
// tenia el mismo bug ya corregido en las hojas de corte: solo miraba
// per.talla, asi que un pedido con la talla dentro de prendas[] (el caso
// INSO/63) se imprimia ENTERO como "PENDIENTE DE TALLA". Estos tests
// capturan el HTML que se manda a imprimir y verifican el agrupado.
import { beforeEach, describe, expect, it, vi } from "vitest";

let htmlCapturado = "";
vi.mock("./imprimir.js", () => ({
  nuevaVentanaImpresion: () => ({
    document: {
      write: html => { htmlCapturado += html; },
      close: () => {},
    },
  }),
}));

import { imprimirHojaTaller } from "./documentosProducto.js";

const pedido = personas => ({
  id: 63,
  cliente: "INSO",
  tipoPrenda: "Camiseta negra",
  personas,
});

beforeEach(() => { htmlCapturado = ""; });

describe("imprimirHojaTaller — talla anidada en prendas[]", () => {
  it("agrupa por la talla de las prendas cuando la persona no la trae suelta", () => {
    imprimirHojaTaller(pedido([
      { nombre: "ISAAC", prendas: [{ tipo: "Camiseta negra", talla: "XL" }] },
      { nombre: "CARLOS", prendas: [{ tipo: "Camiseta negra", talla: "M" }] },
    ]));
    expect(htmlCapturado).toContain("TALLA XL");
    expect(htmlCapturado).toContain("TALLA M");
    expect(htmlCapturado).not.toContain("PENDIENTE DE TALLA");
  });

  it("una persona con dos prendas sale dos veces, cada una con su prenda anotada", () => {
    imprimirHojaTaller(pedido([
      { nombre: "ANA", prendas: [
        { tipo: "Camiseta", talla: "M" },
        { tipo: "Gabacha", talla: "L" },
      ] },
    ]));
    // dos renglones de ANA (el hint de la hoja promete "cada renglón es una prenda")
    expect(htmlCapturado.match(/ANA/g).length).toBeGreaterThanOrEqual(2);
    expect(htmlCapturado).toContain("Camiseta");
    expect(htmlCapturado).toContain("Gabacha");
    // y el conteo de cada talla es 1 prenda
    expect(htmlCapturado).toContain("TALLA M");
    expect(htmlCapturado).toContain("TALLA L");
  });

  it("la talla suelta de la persona sigue mandando", () => {
    imprimirHojaTaller(pedido([
      { nombre: "MARIA", talla: "8", prendas: [{ tipo: "Camiseta", talla: "M" }] },
    ]));
    expect(htmlCapturado).toContain("TALLA 8");
    expect(htmlCapturado).not.toContain("TALLA M");
  });

  it("sin talla en ningún lado sí va a pendientes", () => {
    imprimirHojaTaller(pedido([{ nombre: "SIN TALLA" }]));
    expect(htmlCapturado).toContain("PENDIENTE DE TALLA");
  });

  it("escapa los nombres en vez de romper el documento", () => {
    imprimirHojaTaller(pedido([
      { nombre: 'PEPE <b> & "COMILLAS"', talla: "6" },
    ]));
    expect(htmlCapturado).toContain("&amp;");
    expect(htmlCapturado).not.toContain("PEPE <b>");
  });
});
