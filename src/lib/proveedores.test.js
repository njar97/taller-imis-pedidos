import { describe, it, expect } from "vitest";
import { normalizarWA, linkWA, filtrarProveedores } from "./proveedores.js";

describe("normalizarWA", () => {
  it("antepone 503 a un número local de 8 dígitos", () => {
    expect(normalizarWA("2221-5535")).toBe("50322215535");
  });
  it("respeta un número que ya trae código de país", () => {
    expect(normalizarWA("+503 7674 4444")).toBe("50376744444");
  });
  it("vacío devuelve vacío", () => {
    expect(normalizarWA("")).toBe("");
    expect(linkWA("")).toBe("");
  });
});

describe("filtrarProveedores", () => {
  const lista = [
    { nombre: "DTF Factory", rubros: ["DTF"], ciudad: "San Salvador", precios: "$10 el metro", notas: "" },
    { nombre: "Comercial de Plásticos", rubros: ["Avíos"], ciudad: "Sonsonate", precios: "", notas: "" },
  ];
  it("filtra por rubro", () => {
    expect(filtrarProveedores(lista, "", "DTF").map(p => p.nombre)).toEqual(["DTF Factory"]);
  });
  it("busca en nombre, ciudad y precios sin importar mayúsculas", () => {
    expect(filtrarProveedores(lista, "sonso", "todos")).toHaveLength(1);
    expect(filtrarProveedores(lista, "METRO", "todos")[0].nombre).toBe("DTF Factory");
  });
  it("sin filtros devuelve todo", () => {
    expect(filtrarProveedores(lista, "", "todos")).toHaveLength(2);
  });
});
