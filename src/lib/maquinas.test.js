import { describe, it, expect } from "vitest";
import { ordenarMaquinas, filtrarMaquinas, siguienteCodigo, textoListaMecanico, maqToRow, rowToMaq, totalCosto } from "./maquinas.js";

const L = [
  { codigo: "M10", tipo: "Plana", marca: "JUKI", estado: "ok" },
  { codigo: "M2", tipo: "Ojaladora", marca: "JUKI", modelo: "LBH-781", voltaje: "110V", aguja: "DPx5", estado: "falla", fallaActual: "No corta el ojal" },
  { codigo: "M5", tipo: "Fileteadora", estado: "parada", fallaActual: "" },
];

describe("maquinas", () => {
  it("ordena por número de código", () => {
    expect(ordenarMaquinas(L).map(m => m.codigo)).toEqual(["M2", "M5", "M10"]);
  });
  it("filtra por estado y texto", () => {
    expect(filtrarMaquinas(L, "", "falla").map(m => m.codigo)).toEqual(["M2"]);
    expect(filtrarMaquinas(L, "lbh", "todos").map(m => m.codigo)).toEqual(["M2"]);
  });
  it("siguiente código", () => {
    expect(siguienteCodigo(L)).toBe("M11");
    expect(siguienteCodigo([])).toBe("M01");
  });
  it("lista para el mecánico solo trae falla y parada", () => {
    const t = textoListaMecanico(L);
    expect(t).toContain("*M2* Ojaladora JUKI LBH-781 (110V · aguja DPx5)");
    expect(t).toContain("No corta el ojal");
    expect(t).toContain("*M5*");
    expect(t).toContain("(falta describir la falla)");
    expect(t).not.toContain("M10");
    expect(textoListaMecanico([L[0]])).toBe("");
  });
  it("ida y vuelta a la BD", () => {
    const row = maqToRow({ codigo: " m3 ", tipo: "Plana", fallaActual: "  ", estado: "ok" });
    expect(row.codigo).toBe("M3");
    expect(row.falla_actual).toBe(null);
    expect(rowToMaq({ id: 1, codigo: "M3", tipo: "Plana", estado: null }).estado).toBe("ok");
  });
  it("suma costos", () => {
    expect(totalCosto([{ costo: 10 }, { costo: "" }, { costo: 5.5 }])).toBe(15.5);
  });
});
