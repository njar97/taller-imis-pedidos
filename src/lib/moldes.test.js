import { describe, it, expect } from "vitest";
import {
  escoteDe, fEstandar, moldeDePieza, orillaALaAltura, piezaDeUbicacion,
  prendaConMolde, tallaConMolde, ubicarArte,
} from "./moldes.js";

// Delantera de juguete: 40 cm de ancho, 60 de alto, con un escote de 6 cm al
// centro y las sisas escotadas arriba. Alcanza para probar los landmarks.
const DELANTERA = [
  [8, 0], [14, 0], [17, 4], [20, 6], [23, 4], [26, 0], [32, 0],
  [40, 8], [40, 18], [34, 20], [34, 60], [6, 60], [6, 20], [0, 18], [0, 8],
];
const MANGA = [[0, 0], [40, 0], [36, 20], [4, 20]];

const molde = (prenda, talla, pieza, puntos, nota) => ({
  prenda, talla, pieza, nota, contorno: { puntos },
});
const MOLDES = [
  molde("camiseta", "8", "delantera · masculina", DELANTERA),
  molde("camiseta", "8", "trasera · masculina", DELANTERA),
  molde("camiseta", "8", "manga-1", MANGA),
  molde("camiseta", "12", "delantera · masculina", DELANTERA),
  molde("polo", "M", "delantera · masculino", DELANTERA),
];

describe("a que pieza va cada arte", () => {
  it("reparte por la ubicacion escrita a mano", () => {
    expect(piezaDeUbicacion("Pecho izquierdo")).toBe("delantera");
    expect(piezaDeUbicacion("ESPALDA")).toBe("trasera");
    expect(piezaDeUbicacion("Manga derecha")).toBe("manga");
  });

  it("una corbata no va sobre ninguna pieza cortada", () => {
    // el pedido de cadetes trae "Corbata": es accesorio, no lleva molde
    expect(piezaDeUbicacion("Corbata")).toBeNull();
    expect(piezaDeUbicacion("")).toBeNull();
  });
});

describe("elegir prenda y talla", () => {
  it("saca la prenda del tipo escrito a mano", () => {
    expect(prendaConMolde("Camiseta Intramuros 2026 (DTF)", MOLDES)).toBe("camiseta");
    expect(prendaConMolde("Camisa de vestir cadetes", MOLDES)).toBe("");
  });

  it("prefiere una talla del pedido que tenga molde", () => {
    expect(tallaConMolde(["6", "8", "10"], MOLDES, "camiseta")).toBe("8");
  });

  it("si ninguna talla del pedido tiene molde, cae a una que exista", () => {
    // no se deja de dibujar por eso: se toma una talla del medio de las que hay
    expect(["8", "12"]).toContain(tallaConMolde(["99"], MOLDES, "camiseta"));
  });

  it("sin molde para esa prenda devuelve null y arriba se muestra el aviso", () => {
    expect(tallaConMolde(["8"], MOLDES, "camisa")).toBeNull();
  });
});

describe("landmarks del contorno", () => {
  it("el escote es el punto mas bajo de la curva del cuello, al centro", () => {
    expect(escoteDe(DELANTERA)).toBe(6);
  });

  it("la orilla a una altura da los dos costados", () => {
    expect(orillaALaAltura(DELANTERA, 40)).toEqual([6, 34]);
  });

  it("moldeDePieza distingue delantera de trasera", () => {
    expect(moldeDePieza(MOLDES, "camiseta", "8", "trasera").pieza)
      .toMatch(/^trasera/);
    expect(moldeDePieza(MOLDES, "camiseta", "8", "manga").pieza).toBe("manga-1");
  });
});

describe("ubicar el arte", () => {
  it("centrado: el eje del arte cae a la F bajo el escote", () => {
    const u = ubicarArte({ ubicacion: "Centro pecho", ancho: 20, alto: 25, __talla: "8" },
                         DELANTERA, "delantera");
    expect(u.f).toBe(9);              // estandar de la casa para talla 8
    expect(u.cy).toBe(6 + 9);         // escote + F
    expect(u.cx).toBe(20);            // eje de la pieza
    expect(u.c).toBe(0);
  });

  it("la F escrita en el diseno le gana al estandar", () => {
    const u = ubicarArte({ ubicacion: "Centro pecho", posicionCuello: "14", __talla: "8" },
                         DELANTERA, "delantera");
    expect(u.f).toBe(14);
    expect(u.cy).toBe(20);
  });

  it("la espalda va mas abajo que el pecho", () => {
    expect(fEstandar("8", "trasera")).toBeGreaterThan(fEstandar("8", "delantera"));
  });

  it("una talla sin entrada propia toma la mas cercana, no se cae", () => {
    expect(fEstandar("XL", "delantera")).toBeGreaterThan(0);
    expect(fEstandar("loquesea", "delantera")).toBe(fEstandar("8", "delantera"));
  });

  it("la pieza se ve POR FUERA: el pecho izquierdo del portador cae a la derecha", () => {
    const izq = ubicarArte({ ubicacion: "Pecho izquierdo", ancho: 7, alto: 7, __talla: "8" },
                           DELANTERA, "delantera");
    const der = ubicarArte({ ubicacion: "Pecho derecho", ancho: 7, alto: 7, __talla: "8" },
                           DELANTERA, "delantera");
    expect(izq.cx).toBeGreaterThan(20);
    expect(der.cx).toBeLessThan(20);
    // y quedan simetricos respecto del eje
    expect(izq.cx - 20).toBeCloseTo(20 - der.cx, 5);
  });

  it("en la manga la F se mide desde el RUEDO, no desde arriba", () => {
    const u = ubicarArte({ ubicacion: "Manga derecha", posicionCuello: "4", __talla: "8" },
                         MANGA, "manga");
    expect(u.cy).toBe(20 - 4);
  });
});
