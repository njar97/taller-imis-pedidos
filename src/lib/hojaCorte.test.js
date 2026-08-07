// La hoja de corte se arma leyendo `taller_moldes`, no una receta escrita a
// mano. Lo que hay que proteger es que elija bien la pieza: el pack comprado
// numera las filas del PDF sin decir cual es cual, y la unica pista es la
// `nota` de cada molde ("cuello redondo", "trasera", "NO es cuerpo...").
// Si eso se rompe, el taller corta la pieza equivocada.
import { describe, expect, it } from "vitest";
import { hojaCorteHTML } from "./imprimir.js";

const molde = (talla, pieza, nota, ancho, alto) =>
  ({ prenda: "camiseta", talla, pieza, nota, ancho_cm: ancho, alto_cm: alto });

// Un subconjunto real del pack, talla 6 y talla M.
const MOLDES = [
  molde("6", "cuerpo-fila1", "cuello redondo · pack comprado", 37, 50),
  molde("6", "cuerpo-fila3", "cuello en V · pack comprado", 37, 50),
  molde("6", "cuerpo-fila4", "trasera · pack comprado", 37, 50),
  molde("6", "cuerpo-fila6", "NO es cuerpo: por forma y medidas es una manga larga", 32, 39),
  molde("6", "manga-2", "Camiseta CON MANGA, tallas 2-14 y XS-XXL", 32, 18),
  molde("6", "tira-cuello", "Camiseta CON MANGA, tallas 2-14 y XS-XXL", 51, 5),
  molde("M", "cuerpo-fila1", "cuello redondo · pack comprado", 52, 72),
  molde("M", "cuerpo-fila3", "trasera · pack comprado", 52, 74),
  molde("M", "manga-1", "Camiseta CON MANGA, tallas 2-14 y XS-XXL", 48, 25),
  molde("M", "tira-cuello", "Camiseta CON MANGA, tallas 2-14 y XS-XXL", 67, 5),
];

const pedido = (personas) => ({
  id: 60,
  cliente: "EPAL",
  tipoPrenda: "Camiseta Intramuros 2026 (DTF)",
  personas,
});

const per = (nombre, talla, color) => ({ nombre, talla, color });

describe("hojaCorteHTML", () => {
  it("multiplica cada pieza por la cantidad de prendas de esa talla", () => {
    // 3 camisetas talla 6 -> 3 delanteras, 3 espaldas, 6 mangas, 3 tiras
    const html = hojaCorteHTML(pedido([
      per("A", "6", "verde"), per("B", "6", "verde"), per("C", "6", "verde"),
    ]), MOLDES);
    expect(html).toContain(">6</td>");
    expect(html).toContain(">3</span>");   // delantera / espalda / tira
    expect(html).toContain(">6</span>");   // mangas: 3 x 2
  });

  it("elige la pieza por la nota, no por el numero de fila", () => {
    // fila1 es el cuello redondo y fila4 la trasera; fila3 (cuello en V) y
    // fila6 (manga larga) NO se cortan. Se comprueba por las medidas que
    // salen impresas debajo de cada cantidad.
    const html = hojaCorteHTML(pedido([per("A", "6", "verde")]), MOLDES);
    expect(html).toContain("37×50 cm");   // cuerpo (delantera y espalda)
    expect(html).toContain("32×18 cm");   // manga-2
    expect(html).toContain("51×5 cm");    // tira-cuello
    expect(html).not.toContain("32×39 cm"); // la manga larga no entra
  });

  it("separa un bloque por color", () => {
    const html = hojaCorteHTML(pedido([
      per("A", "6", "verde"), per("B", "6", "celeste"),
    ]), MOLDES);
    expect(html).toContain("VERDE".toLowerCase()) ||
      expect(html.toLowerCase()).toContain("verde");
    expect(html.toLowerCase()).toContain("celeste");
  });

  it("avisa cuando una talla no tiene molde digitalizado", () => {
    // 2XL existe en el pedido (la maestra Karen) pero no en el pack.
    const html = hojaCorteHTML(pedido([
      per("A", "6", "amarillo"), per("Karen", "2XL", "amarillo"),
    ]), MOLDES);
    expect(html).toContain("Sin molde digitalizado");
    expect(html).toContain("2XL");
  });

  it("saca a los de 'A la medida' del cuadro y los lista aparte", () => {
    const html = hojaCorteHTML(pedido([
      per("A", "6", "celeste"), per("Alison", "A la medida", "celeste"),
    ]), MOLDES);
    expect(html).toContain("A la medida");
    expect(html).toContain("Alison");
  });

  it("no revienta si el pedido no tiene personas con talla", () => {
    const html = hojaCorteHTML(pedido([]), MOLDES);
    expect(html).toContain("no tiene personas con talla");
  });

  it("avisa si no hay moldes para ese tipo de prenda", () => {
    const html = hojaCorteHTML(pedido([per("A", "6", "verde")]), []);
    expect(html).toContain("sin moldes digitalizados");
  });
});
