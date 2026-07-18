import { describe, it, expect } from "vitest";
import { armarHojas } from "./exportarExcelMedidas.js";
import { parsearLibroMedidas } from "./importarExcel.js";

const PEDIDO = {
  cliente: "Edwin Parroquia",
  fecha: "2026-07-17",
  tipoPrenda: "Camisa/Blusa cuello chino",
  personas: [
    {
      nombre: "Rafael Vega", cargo: "", talla: "M",
      prendas: [{ id: 1, tipo: "Camisa cuello chino — Blanca", talla: "M" }],
      medidas: { chaqueta: { cuello: "42" } },
    },
    {
      nombre: "Ana Gabriela Hernández", talla: "12",
      prendas: [{ id: 1, tipo: "Blusa cuello chino — Blanca", talla: "12" }],
      medidas: { chaqueta: { largo: "60", cuello: "43" }, abono: 10 },
    },
    {
      nombre: "Solo Pantalón", talla: "8", prendas: [],
      medidas: { pantalon: { cintura: "70", largo: "55" } },
    },
  ],
};

describe("armarHojas (export al formato del taller)", () => {
  const hojas = armarHojas(PEDIDO);

  it("una hoja por tipo de prenda + genérica por bucket", () => {
    expect(hojas.map(h => h.nombre)).toEqual([
      "CAMISA CUELLO CHINO  BLANCA",
      "BLUSA CUELLO CHINO  BLANCA",
      "PANTALON",
    ]);
  });

  it("layout del libro: título, prenda, encabezado ITEM/NOMBRE/... y filas", () => {
    const h = hojas[0];
    expect(h.aoa[0][0]).toContain("Edwin Parroquia");
    expect(h.aoa[2].slice(0, 4)).toEqual(["ITEM", "NOMBRE", "GRADO", "TALLA"]);
    expect(h.aoa[2]).toContain("CUELLO");
    expect(h.aoa[2][h.aoa[2].length - 1]).toBe("ABONO");
    const fila = h.aoa[3];
    expect(fila[1]).toBe("Rafael Vega");
    expect(fila[3]).toBe("M");
    expect(fila[h.aoa[2].indexOf("CUELLO")]).toBe("42");
  });

  it("abono y medidas de pantalón caen en su columna", () => {
    const blusas = hojas[1];
    const filaAna = blusas.aoa[3];
    expect(filaAna[blusas.aoa[2].indexOf("ABONO")]).toBe(10);
    const pant = hojas[2];
    expect(pant.aoa[2]).toContain("TIRO DELANTERO");
    expect(pant.aoa[3][pant.aoa[2].indexOf("CINTURA")]).toBe("70");
  });

  it("round-trip: lo exportado se puede volver a importar", () => {
    const libro = hojas.map(h => ({ name: h.nombre, rows: h.aoa.map(r => r.map(String)) }));
    const r = parsearLibroMedidas(libro);
    expect(r.personas).toHaveLength(3);
    const ana = r.personas.find(p => /ANA/i.test(p.nombre));
    expect(ana.medidas.chaqueta).toMatchObject({ largo: "60", cuello: "43" });
  });
});
