import { describe, it, expect } from "vitest";
import {
  etiquetaDe, facetasDe, filtrarPersonas, indicesDe, ordenarPersonas,
  resumenPorTalla, textoDePersona,
} from "./personas.js";

// Muestra parecida a la real: el grado vive dentro de `cargo`, no en un campo
// propio, y hay campos que la tabla ni muestra (color, expediente).
const GENTE = [
  { id: 1, nombre: "GONZÁLEZ RAMOS, Herbert", cargo: "1° BACH B", talla: "14",
    color: "amarillo", expediente: "30393", medidas: { pecho: "92" } },
  { id: 2, nombre: "Mejía, Luis", cargo: "1° BACH B", talla: "16",
    color: "celeste", expediente: "30400" },
  { id: 3, nombre: "Alemán, Adonay", cargo: "2° GRAL A", talla: "14",
    color: "amarillo", expediente: "30401" },
  { id: 4, nombre: "Rivera, Sofía", cargo: "2° GRAL A", color: "verde",
    expediente: "30402", prendas: [{ tipo: "Camisa", talla: "S" }] },
];

describe("texto de una persona", () => {
  it("junta todo lo legible, incluso lo anidado", () => {
    const t = textoDePersona(GENTE[0]);
    expect(t).toContain("herbert");
    expect(t).toContain("1° bach b");
    expect(t).toContain("92");          // viene de medidas
  });

  it("no mete el id, que nadie busca", () => {
    expect(textoDePersona({ id: 999888, nombre: "Ana" })).toBe("ana");
  });
});

describe("buscar", () => {
  it("encuentra sin acentos ni mayusculas", () => {
    expect(filtrarPersonas(GENTE, "gonzalez")).toHaveLength(1);
    expect(filtrarPersonas(GENTE, "GONZÁLEZ")).toHaveLength(1);
  });

  it("busca en cualquier campo, no solo en el nombre", () => {
    expect(filtrarPersonas(GENTE, "bach")).toHaveLength(2);      // el grado
    expect(filtrarPersonas(GENTE, "amarillo")).toHaveLength(2);  // el color
    expect(filtrarPersonas(GENTE, "30401")).toHaveLength(1);     // el expediente
  });

  it("varias palabras se cruzan entre si", () => {
    // "bach 16" = del 1° BACH B, el de talla 16
    const r = filtrarPersonas(GENTE, "bach 16");
    expect(r).toHaveLength(1);
    expect(r[0].nombre).toBe("Mejía, Luis");
  });

  it("sin texto ni filtros devuelve todo", () => {
    expect(filtrarPersonas(GENTE, "")).toHaveLength(4);
  });
});

describe("filtros por campo", () => {
  it("filtra por grado", () => {
    expect(filtrarPersonas(GENTE, "", { cargo: "2° GRAL A" })).toHaveLength(2);
  });

  it("se suman entre si y con el texto", () => {
    expect(filtrarPersonas(GENTE, "", { cargo: "1° BACH B", talla: "14" })).toHaveLength(1);
    expect(filtrarPersonas(GENTE, "aleman", { color: "amarillo" })).toHaveLength(1);
    expect(filtrarPersonas(GENTE, "aleman", { color: "verde" })).toHaveLength(0);
  });
});

describe("las facetas se deducen del pedido", () => {
  const f = facetasDe(GENTE);
  const claves = f.map(x => x.clave);

  it("ofrece grado, talla y color", () => {
    expect(claves).toContain("cargo");
    expect(claves).toContain("talla");
    expect(claves).toContain("color");
  });

  it("NO ofrece el nombre ni el expediente: son identificadores", () => {
    // un valor distinto por persona no acorta nada — filtrar por eso es buscarlo
    expect(claves).not.toContain("nombre");
    expect(claves).not.toContain("expediente");
    expect(claves).not.toContain("id");
  });

  it("cada valor viene con su cuenta, para saber cuanto acorta", () => {
    const cargo = f.find(x => x.clave === "cargo");
    expect(cargo.valores).toEqual([
      { v: "1° BACH B", n: 2 }, { v: "2° GRAL A", n: 2 },
    ]);
  });

  it("el grado sale con nombre entendible, no con la clave cruda", () => {
    expect(etiquetaDe("cargo")).toBe("Grado / cargo");
    expect(etiquetaDe("gafete")).toBe("Talla taller");
    // un campo que nadie tradujo igual sale presentable
    expect(etiquetaDe("seccion")).toBe("Seccion");
  });

  it("una lista sin nada repetido no ofrece filtros", () => {
    expect(facetasDe([{ nombre: "A", cod: "1" }, { nombre: "B", cod: "2" }])).toEqual([]);
  });
});

describe("orden y resumen", () => {
  it("ordena por nombre sin renumerar: el # sigue siendo el de carga", () => {
    const r = ordenarPersonas(GENTE, "nombre");
    expect(r.map(x => x.p.nombre)[0]).toBe("Alemán, Adonay");
    expect(r[0].orden).toBe(2);        // era el tercero de la lista original
  });

  it("sin criterio respeta el orden de carga", () => {
    expect(ordenarPersonas(GENTE, "").map(x => x.orden)).toEqual([0, 1, 2, 3]);
  });

  it("⚠ al FILTRAR el numero sigue siendo el de carga, no 1,2,3", () => {
    // Se vio con datos reales: buscar dejaba dos personas y salian como #1 y #2
    // cuando en el pedido eran la #8 y la #46. Con esa numeracion se entrega.
    const dos = filtrarPersonas(GENTE, "", { cargo: "2° GRAL A" });
    const r = ordenarPersonas(dos, "", indicesDe(GENTE));
    expect(r.map(x => x.orden)).toEqual([2, 3]);
  });

  it("ordena por cualquier campo, no solo nombre y talla", () => {
    // el encabezado de la tabla ordena por la columna que se toque, y las
    // columnas dependen de lo que traiga el pedido
    const r = ordenarPersonas(GENTE, "cargo", indicesDe(GENTE));
    expect(r.map(x => x.p.cargo)).toEqual(
      ["1° BACH B", "1° BACH B", "2° GRAL A", "2° GRAL A"]);
    // a igual valor, manda el orden de carga
    expect(r.map(x => x.orden)).toEqual([0, 1, 2, 3]);
  });

  it("los vacios caen al final, no al principio", () => {
    const r = ordenarPersonas(GENTE, "talla", indicesDe(GENTE));
    expect(r[r.length - 1].p.nombre).toBe("Rivera, Sofía");   // no tiene talla
  });

  it("el resumen por talla deja las sin talla al final", () => {
    expect(resumenPorTalla(GENTE)).toEqual([
      { talla: "14", n: 2 }, { talla: "16", n: 1 }, { talla: "S", n: 1 },
    ]);
  });
});
