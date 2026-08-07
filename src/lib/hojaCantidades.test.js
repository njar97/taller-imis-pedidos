// La hoja de "cuántas cortar" es un cuadro talla x color. Lo que hay que
// proteger es la aritmética: si una celda, un total de fila o un total de
// columna miente, el taller corta de más o de menos. Y los casos que no
// entran en el cuadro (a la medida, sin color) tienen que quedar dichos,
// no desaparecer en silencio.
import { describe, expect, it } from "vitest";
import { agruparColorTalla, hojaCantidadesHTML } from "./imprimir.js";

const molde = (talla, pieza, nota) =>
  ({ prenda: "camiseta", talla, pieza, nota, ancho_cm: 37, alto_cm: 50 });

const MOLDES = [
  molde("6", "cuerpo-fila1", "cuello redondo · pack comprado"),
  molde("6", "cuerpo-fila4", "trasera · pack comprado"),
  molde("6", "manga-2", "Camiseta CON MANGA, tallas 2-14 y XS-XXL"),
  molde("6", "tira-cuello", "Camiseta CON MANGA, tallas 2-14 y XS-XXL"),
];

const pedido = personas => ({
  id: 60,
  cliente: "EPAL",
  tipoPrenda: "Camiseta Intramuros 2026 (DTF)",
  personas,
});

const per = (nombre, talla, color) => ({ nombre, talla, color });

// Los números viven en celdas <td>; para afirmar sobre ellos alcanza con
// mirar el texto plano de la fila de esa talla.
const filaDe = (html, talla) => {
  const filas = html.split("<tr>").filter(f => f.includes(">" + talla + "<"));
  return filas.map(f => f.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
};

describe("agruparColorTalla", () => {
  it("cuenta por color y talla", () => {
    const { bloques } = agruparColorTalla(pedido([
      per("A", "6", "verde"), per("B", "6", "verde"), per("C", "6", "celeste"),
    ]));
    expect(bloques.get("verde").get("6")).toBe(2);
    expect(bloques.get("celeste").get("6")).toBe(1);
  });

  it("saca los 'a la medida' del conteo y los devuelve aparte", () => {
    const { bloques, aMedida } = agruparColorTalla(pedido([
      per("A", "6", "verde"), per("Alison", "A la medida", "celeste"),
    ]));
    expect(aMedida.map(x => x.nombre)).toEqual(["Alison"]);
    expect(bloques.has("celeste")).toBe(false);
  });

  // El pedido 63 (INSO) sacaba la hoja en blanco: sus 7 camisetas tienen la
  // talla dentro de prendas[], no en la persona.
  it("lee la talla de prendas[] cuando la persona no la trae suelta", () => {
    const { bloques } = agruparColorTalla(pedido([
      { nombre: "ISAAC", prendas: [{ tipo: "Camiseta negra", talla: "XL" }] },
      { nombre: "CARLOS", prendas: [{ tipo: "Camiseta negra", talla: "M" }] },
      { nombre: "MARVIN", prendas: [{ tipo: "Camiseta negra", talla: "M" }] },
    ]));
    const unico = [...bloques.values()][0];
    expect(unico.get("M")).toBe(2);
    expect(unico.get("XL")).toBe(1);
  });

  it("cuenta cada prenda de una persona que pide varias", () => {
    const { bloques } = agruparColorTalla(pedido([
      { nombre: "A", prendas: [{ talla: "M" }, { talla: "M" }, { talla: "L" }] },
    ]));
    const unico = [...bloques.values()][0];
    expect(unico.get("M")).toBe(2);
    expect(unico.get("L")).toBe(1);
  });

  it("la talla suelta de la persona manda sobre la de sus prendas", () => {
    const { bloques } = agruparColorTalla(pedido([
      { nombre: "A", talla: "6", color: "verde", prendas: [{ talla: "M" }] },
    ]));
    expect(bloques.get("verde").get("6")).toBe(1);
    expect(bloques.get("verde").has("M")).toBe(false);
  });

  it("nombra a quien no tiene color, para poder preguntarle", () => {
    const { nombresSinColor } = agruparColorTalla(pedido([
      per("Lean", "6", ""), per("B", "6", "verde"),
    ]));
    expect(nombresSinColor).toEqual(["Lean"]);
  });
});

describe("hojaCantidadesHTML", () => {
  it("suma el total de la fila sobre todos los colores", () => {
    const html = hojaCantidadesHTML(pedido([
      per("A", "6", "verde"), per("B", "6", "verde"),
      per("C", "6", "celeste"),
    ]), MOLDES);
    // fila talla 6: celeste 1, verde 2, total 3
    expect(filaDe(html, "6").join(" ")).toMatch(/6 .*1 .*2 .*3/);
  });

  it("suma el total de cada columna y el total general", () => {
    const html = hojaCantidadesHTML(pedido([
      per("A", "6", "verde"), per("B", "8", "verde"), per("C", "8", "celeste"),
    ]), MOLDES);
    const pie = html.split("<tfoot>")[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    // celeste 1, verde 2, general 3
    expect(pie).toMatch(/TOTAL 1 2 3/);
  });

  it("las piezas por prenda se dicen una sola vez, no por fila", () => {
    const html = hojaCantidadesHTML(pedido([
      per("A", "6", "verde"), per("B", "6", "verde"),
    ]), MOLDES);
    expect(html.match(/Cada camiseta lleva/g)).toHaveLength(1);
    expect(html).toContain("delantera");
    expect(html).toContain("tira cuello");
  });

  it("avisa de la talla sin molde en vez de callarla", () => {
    const html = hojaCantidadesHTML(pedido([per("A", "2XL", "amarillo")]), MOLDES);
    expect(html).toMatch(/Sin molde:[\s\S]*2XL/);
  });

  it("declara los 'a la medida' en el encabezado para que el total cuadre", () => {
    const html = hojaCantidadesHTML(pedido([
      per("A", "6", "verde"), per("Alison", "A la medida", "celeste"),
    ]), MOLDES);
    expect(html).toContain("1 a la medida = 2");
    expect(html).toContain("Alison");
  });

  it("escapa el nombre del cliente en vez de romper el documento", () => {
    const p = { ...pedido([per("A", "6", "verde")]), cliente: 'Escuela "A" & B <x>' };
    const html = hojaCantidadesHTML(p, MOLDES);
    expect(html).toContain("&amp;");
    expect(html).not.toContain("<x>");
  });

  it("no revienta con un pedido sin personas con talla", () => {
    const html = hojaCantidadesHTML(pedido([]), MOLDES);
    expect(html).toContain("no tiene personas con talla");
  });
});
