// La hoja de corte armable, probada con los números REALES del pedido #78
// (COED Cantón El Sunza, 17-ago-2026): 35 uniformes completos + 3 camisas y
// 3 pantalones sueltos. Si un total sale mal acá, sale mal en la mesa.
import { describe, it, expect } from "vitest";
import { armarCorte, hojaCorteArmableHTML, perillasCorte, OPCIONES_DEFAULT } from "./hojaCorteArmable.js";

const SUNZA = {
  id: 78,
  cliente: "COED Cantón El Sunza",
  tipoPrenda: "Uniformes Deportivos Escolares",
  tela: "Adidas",
  color: "Azul y blanco",
  personas: [],
  notas: "Tercer pedido. ⚠ PENDIENTE confirmar con el cliente: cantidad en talla S (¿4?) y en talla L (¿5 o 6?). ⚠ Piezas sueltas SIN PRECIO.",
  tallasItems: [
    { id: 1, qty: 1, spec: "Básica", grupo: "nino", talla: "6" },
    { id: 2, qty: 4, spec: "Parvularia", grupo: "nino", talla: "8" },
    { id: 3, qty: 2, spec: "Básica", grupo: "nino", talla: "8" },
    { id: 4, qty: 5, spec: "Básica", grupo: "nino", talla: "10" },
    { id: 5, qty: 4, spec: "Básica", grupo: "nino", talla: "12" },
    { id: 6, qty: 5, spec: "Básica", grupo: "nino", talla: "14" },
    { id: 7, qty: 4, spec: "Básica", grupo: "adulto", talla: "S" },
    { id: 8, qty: 3, spec: "Básica", grupo: "adulto", talla: "M" },
    { id: 9, qty: 5, spec: "Básica", grupo: "adulto", talla: "L" },
    { id: 10, qty: 2, spec: "Básica", grupo: "adulto", talla: "XL" },
    { id: 11, qty: 1, spec: "Bachillerato Técnico", tipo: "Camisa (suelta)", grupo: "adulto", talla: "S" },
    { id: 12, qty: 1, spec: "Básica", tipo: "Camisa (suelta)", grupo: "nino", talla: "14" },
    { id: 13, qty: 1, spec: "Bachillerato Técnico", tipo: "Camisa (suelta)", grupo: "adulto", talla: "L" },
    { id: 14, qty: 1, spec: "Bachillerato Técnico", tipo: "Pantalón (suelto)", grupo: "adulto", talla: "M" },
    { id: 15, qty: 1, spec: "Básica", tipo: "Pantalón (suelto)", grupo: "adulto", talla: "S" },
    { id: 16, qty: 1, spec: "Bachillerato Técnico", tipo: "Pantalón (suelto)", grupo: "adulto", talla: "XL" },
  ],
};

const fila = (d, t) => d.filas.find(f => f.etiqueta === t);

describe("perillasCorte: solo ofrece lo que aplica al pedido", () => {
  it("Sunza: hay detalle y sueltas, no hay personas ni colores distintos", () => {
    const per = perillasCorte(SUNZA);
    expect(per.persona).toBe(false);
    expect(per.spec).toBe(true);
    expect(per.sueltas).toBe(true);
    expect(per.uniforme).toBe(true);
    expect(per.color).toBe(false);
  });
});

describe("contar uniformes completos (lo que pidió Javier)", () => {
  const d = armarCorte(SUNZA, { ...OPCIONES_DEFAULT, contar: "uniforme", columnas: ["spec"] });

  it("35 uniformes en total, 31 Básica + 4 Parvularia", () => {
    expect(d.totales.n).toBe(35);
    expect(d.totales["Básica"]).toBe(31);
    expect(d.totales["Parvularia"]).toBe(4);
  });

  it("la talla 8 se reparte 4 Parvularia + 2 Básica", () => {
    expect(fila(d, "8").n).toBe(6);
    expect(fila(d, "8").porCol).toEqual({ Parvularia: 4, "Básica": 2 });
  });

  it("las sueltas van aparte, en su talla, y no se suman al número grande", () => {
    expect(fila(d, "S").n).toBe(4);
    expect(fila(d, "S").aparte).toEqual([
      { qty: 1, prenda: "camisa", detalle: "Bachillerato Técnico" },
      { qty: 1, prenda: "pantalón", detalle: "Básica" },
    ]);
    expect(fila(d, "6").aparte).toEqual([]);
    expect(d.totales.sueltas).toEqual({ camisa: 3, "pantalón": 3 });
  });

  it("las tallas salen en orden de talla, no alfabético", () => {
    expect(d.filas.map(f => f.etiqueta)).toEqual(["6", "8", "10", "12", "14", "S", "M", "L", "XL"]);
  });

  it("un uniforme es camisa + pantalón (se infiere de las sueltas)", () => {
    expect(d.prendas.map(x => x.toLowerCase()).sort()).toEqual(["camisa", "pantalón"]);
  });
});

describe("contar prendas: cada uniforme aporta una camisa y un pantalón", () => {
  it("38 camisas y 38 pantalones (35 + 3 sueltas cada una)", () => {
    const d = armarCorte(SUNZA, { ...OPCIONES_DEFAULT, contar: "prenda", columnas: [] });
    expect(d.columnas.sort()).toEqual(["Camisa", "Pantalón"]);
    expect(d.totales["Camisa"]).toBe(38);
    expect(d.totales["Pantalón"]).toBe(38);
    expect(fila(d, "14").porCol).toEqual({ Camisa: 6, "Pantalón": 5 });
  });
});

describe("avisos y HTML", () => {
  it("saca de las notas lo que falta confirmar", () => {
    const d = armarCorte(SUNZA, OPCIONES_DEFAULT);
    expect(d.avisos.length).toBe(2);
    expect(d.avisos[0]).toMatch(/talla S/);
  });

  it("el HTML lleva el encabezado de la app y los totales", () => {
    const html = hojaCorteArmableHTML(SUNZA, { ...OPCIONES_DEFAULT, mostrar: ["sueltas", "listo", "avisos"] });
    expect(html).toContain("Taller IMIS");
    expect(html).toContain("HOJA DE CORTE");
    expect(html).toContain("Pedido N°0078");
    expect(html).toContain("COED Cantón El Sunza");
    expect(html).toContain("+3 camisas, +3 pantalones");
    expect(html).toContain("Sin confirmar:");
    expect(html).toContain("☐");
  });

  it("sin «listo» ni «avisos» no aparecen la casilla ni la caja", () => {
    const html = hojaCorteArmableHTML(SUNZA, { ...OPCIONES_DEFAULT, mostrar: [] });
    expect(html).not.toContain("☐");
    expect(html).not.toContain("Sin confirmar:");
  });

  it("tamaño grande agranda el número", () => {
    const chico = hojaCorteArmableHTML(SUNZA, { ...OPCIONES_DEFAULT, tamano: "normal" });
    const grande = hojaCorteArmableHTML(SUNZA, { ...OPCIONES_DEFAULT, tamano: "grande" });
    expect(chico).toContain("font-size:52px");
    expect(grande).toContain("font-size:72px");
  });
});
