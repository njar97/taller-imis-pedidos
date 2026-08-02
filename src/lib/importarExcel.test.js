import { describe, it, expect } from "vitest";
import { parsearLibroMedidas } from "./importarExcel.js";

// Réplica de la estructura real de "CADETES CIVICO SALOMON 2026.xlsx":
// Hoja1 con DOS tablas lado a lado (pantalón cols 0-10, camisa cols 11-19)
// y hoja KEPIS con la tabla corrida hacia la derecha.
const HOJA1 = [
  ["", "CADETE CIVICO SALOMON", "", "", "", "", "", "", "", "", "", "", "", "CADETE CIVICO", "", "", "", "", "", ""],
  ["", "PANTALON / FALDA", "", "", "", "", "", "", "", "", "", "CAMISA/BLUSA", "", "", "", "", "", "", "", ""],
  ["ITEM", "NOMBRE FEMENINO", "GRADO", "CINTURA", "BASE", "LARGO", "VUELO/RUEDO", "MUSLO", "RODILLA", "TIRO DELANTERO", "TIRO TRASERO", "ITEM", "NOMBRE", "GRADO", "TALLA", "HOMBRO", "PECHO/BUSTO", "CINTURA", "CADERA", "LARGO"],
  ["1", "JOSELIN  ESCOBAR", "7D", "78", "99", "60", "85", "", "", "", "", "1", "JOSELIN ESCOBAR", "7D", "16", "41", "94", "87", "100", "65"],
  ["2", "FERNANDA NICOLE", "", "75", "96", "58", "", "", "", "", "", "2", "FERNANDA NICOLE", "", "14", "40", "88", "84", "101", "60"],
];
const KEPIS = [
  ["CADETE CIVICO", "", "", "", "", "", ""],
  ["", "", "KEPIS", "", "", "", ""],
  ["", "", "ITEM", "NOMBRE", "GRADO", "CONTORNO DE CABEZA", ""],
  ["", "", "1", "JOSELIN ESCOBAR", "7D", "56", ""],
  ["", "", "2", "FERNANDA NICOLE", "", "54", ""],
];
const IMPRIMIR = [["algo"], ["ITEM", "NOMBRE"], ["1", "NO DEBE ENTRAR"]];

describe("parsearLibroMedidas", () => {
  const res = parsearLibroMedidas([
    { name: "Hoja1", rows: HOJA1 },
    { name: "KEPIS", rows: KEPIS },
    { name: "IMPRIMIR", rows: IMPRIMIR },
  ]);

  it("junta a la misma persona entre tablas y hojas (nombre normalizado)", () => {
    expect(res.personas).toHaveLength(2);
    const j = res.personas.find(p => /JOSELIN/.test(p.nombre));
    expect(j.prendas.map(p => p.tipo).sort()).toEqual(["Camisa/Blusa", "Pantalón/Falda", "Quepis"]);
  });

  it("anida medidas por prenda con las claves de la app", () => {
    const j = res.personas.find(p => /JOSELIN/.test(p.nombre));
    expect(j.medidas.pantalon).toMatchObject({ cintura: "78", base: "99", largo: "60", ruedo: "85" });
    expect(j.medidas.chaqueta).toMatchObject({ hombro: "41", pecho: "94", cintura: "87", cadera: "100", largo: "65" });
    expect(j.medidas.quepi).toMatchObject({ contornoCabeza: "56" });
    expect(j.talla).toBe("16");
    expect(j.cargo).toBe("7D");
  });

  it("ignora hojas IMPRIMIR y detecta el título", () => {
    expect(res.personas.some(p => /NO DEBE/.test(p.nombre))).toBe(false);
    expect(res.titulo).toMatch(/CADETE/);
  });

  // Los Excel del taller no se ponen de acuerdo en cómo llamar al contorno de
  // cadera: el de Salomón (arriba) usa BASE en la tabla de pantalón y CADERA en
  // la de camisa; el de los cadetes de INSO lo hace justo al revés. El bucket
  // tiene que salir de la TABLA, no de la palabra, o las dos medidas se cruzan
  // de prenda.
  it("CADERA en pantalón y BASE en camisa caen en la prenda correcta", () => {
    const invertido = parsearLibroMedidas([{ name: "Hoja1", rows: [
      ["", "CADETES INSO", "", "", "", "", "", "", "", ""],
      ["", "PANTALON", "", "", "", "", "CAMISA", "", "", ""],
      ["ITEM", "NOMBRE", "CINTURA", "CADERA", "LARGO", "ITEM", "NOMBRE", "HOMBRO", "PECHO", "BASE"],
      ["1", "KARLA FRAYLE", "94", "112", "96", "1", "KARLA FRAYLE", "39", "103", "114"],
    ] }]);
    const k = invertido.personas.find(p => /KARLA/.test(p.nombre));
    // 112 es la cadera del PANTALÓN, 114 la de la CAMISA — no al revés
    expect(k.medidas.pantalon).toMatchObject({ cintura: "94", base: "112", largo: "96" });
    expect(k.medidas.chaqueta).toMatchObject({ hombro: "39", pecho: "103", cadera: "114" });
  });

  it("formato en blanco (sin nombres) no crea personas", () => {
    const vacio = parsearLibroMedidas([{ name: "Hoja1", rows: [
      ["", "CAMISA POLO"], ["CAMISA/BLUSA"],
      ["ITEM", "NOMBRE", "TALLA", "HOMBRO"], ["1", "", "", ""], ["2", "", "", ""],
    ] }]);
    expect(vacio.personas).toHaveLength(0);
  });
});
