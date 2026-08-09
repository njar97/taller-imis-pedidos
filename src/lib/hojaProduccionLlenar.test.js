// La hoja de producción en modo "ir marcando" (opts.llenar) es la MISMA hoja
// impresa, pero cada pieza es una casilla que se toca en el celular. Lo que hay
// que proteger: (1) que haya una casilla por pieza — si se pierde una, esa
// prenda no se marca nunca; (2) que la clave de cada casilla sea única, porque
// dos casillas con la misma clave se marcan juntas y el conteo miente; (3) que
// NO se dispare el diálogo de impresión, que es lo que hacía imposible llenarla
// en el teléfono.
import { describe, expect, it } from "vitest";
import { imprimirProduccion } from "./imprimir.js";

// nuevaVentanaImpresion vive en el mismo módulo, así que no se puede mockear:
// se le da el DOM mínimo que necesita y se captura lo que escribe.
function montarDOM() {
  const cap = { html: "", imprimio: false };
  const nodo = () => ({
    style: { cssText: "" },
    id: "",
    appendChild() {},
    remove() {},
    contentWindow: {
      document: {
        write: h => { cap.html += h; },
        close() {},
        readyState: "complete",
      },
      print() { cap.imprimio = true; },
      focus() {},
      addEventListener() {},
    },
  });
  globalThis.document = {
    title: "app",
    getElementById: () => null,
    createElement: () => nodo(),
    body: { appendChild() {}, style: {} },
  };
  globalThis.window = { location: { origin: "https://x.test", pathname: "/" } };
  return cap;
}

const per = (nombre, talla, color) =>
  ({ nombre, talla, prendas: [{ tipo: "Camiseta Intramuros", talla, spec: color }] });

// Recorte real del pedido 60 (EPAL): 3 colores, misma prenda, varias tallas.
const PEDIDO = {
  id: 60,
  cliente: "Escuela Parvularia Albino Luciani (EPAL)",
  tipoPrenda: "Camiseta Intramuros 2026 (DTF)",
  personas: [
    per("Emely", "4", "Amarillo"),
    per("Melany", "4", "Amarillo"),
    per("Sebastián", "6", "Amarillo"),
    per("Sara", "4", "Celeste"),
    per("Oliver", "8", "Celeste"),
    per("Amadeo", "4", "Verde"),
  ],
};

const claves = html => [...html.matchAll(/class="pick" data-k="([^"]*)"/g)].map(m => m[1]);

describe("hoja de producción — modo ir marcando", () => {
  it("da una casilla por pieza, con clave única y el nombre de su dueño", async () => {
    const cap = montarDOM();
    await imprimirProduccion(PEDIDO, [], { agruparPor: "color", llenar: true });
    const ks = claves(cap.html);
    expect(ks).toHaveLength(6);
    expect(new Set(ks).size).toBe(6);
    expect(cap.html).toContain("<span class=\"bx\"></span>Emely");
    expect(cap.html).toContain("<span class=\"bx\"></span>Amadeo");
    // Agrupado como la hoja impresa: los tres colores siguen encabezando bloques.
    for (const c of ["AMARILLO", "CELESTE", "VERDE"]) {
      expect(cap.html.toUpperCase()).toContain(c);
    }
  });

  it("no abre el diálogo de impresión (por eso no se podía llenar en el celular)", async () => {
    const cap = montarDOM();
    await imprimirProduccion(PEDIDO, [], { agruparPor: "color", llenar: true });
    expect(cap.imprimio).toBe(false);
    expect(cap.html).toContain("localStorage");
    expect(cap.html).toContain("hp_marcas_60");
  });

  it("dos personas del mismo nombre y talla no comparten casilla", async () => {
    const cap = montarDOM();
    await imprimirProduccion(
      { ...PEDIDO, personas: [per("Gabriel", "6", "Celeste"), per("Gabriel", "6", "Celeste")] },
      [], { llenar: true }
    );
    const ks = claves(cap.html);
    expect(ks).toHaveLength(2);
    expect(new Set(ks).size).toBe(2);
  });

  it("sin llenar, la hoja sigue siendo la de siempre: imprime y no trae casillas tocables", async () => {
    const cap = montarDOM();
    await imprimirProduccion(PEDIDO, [], { agruparPor: "color" });
    expect(claves(cap.html)).toHaveLength(0);
    await new Promise(r => setTimeout(r, 450)); // print() va con delay de 300 ms
    expect(cap.imprimio).toBe(true);
  });
});
