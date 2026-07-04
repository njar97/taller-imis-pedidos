import { describe, it, expect } from "vitest";
import {
  sonSimilares,
  claveParDup,
  detectarDuplicados,
  fusionarEnGanador,
  idsCandidatos,
  rotarGrid,
  espejarGrid,
  similitudVisual,
  leerIgnorados,
  guardarIgnorados,
  GRID,
  UMBRAL_VISUAL,
} from "./duplicados.js";

const d = (id, puntadas, anchoMm, altoMm, extra = {}) => ({ id, puntadas, anchoMm, altoMm, ...extra });

describe("sonSimilares", () => {
  it("mismas medidas y puntadas casi iguales → similares", () => {
    // caso real: LETRAS-CHEFA vs LETRAS-CHEFA-RECOVERED (2776 pt idénticas)
    expect(sonSimilares(d(1, 2776, 108, 24), d(2, 2776, 108, 24))).toBe(true);
  });

  it("tolera hasta 3% de diferencia en puntadas", () => {
    expect(sonSimilares(d(1, 10045, 111, 46), d(2, 10149, 111, 46))).toBe(true); // ~1%
    expect(sonSimilares(d(1, 10000, 111, 46), d(2, 10400, 111, 46))).toBe(false); // ~3.8%
  });

  it("tolera hasta 3mm de diferencia de tamaño", () => {
    expect(sonSimilares(d(1, 5000, 63, 75), d(2, 5016, 64, 77))).toBe(true);
    expect(sonSimilares(d(1, 5000, 63, 75), d(2, 5016, 68, 75))).toBe(false);
  });

  it("mismo diseño en tamaño distinto NO es duplicado (el DST no escala)", () => {
    expect(sonSimilares(d(1, 5000, 50, 61), d(2, 5100, 80, 98))).toBe(false);
  });

  it("sin puntadas no hay señal → no similares", () => {
    expect(sonSimilares(d(1, null, 50, 61), d(2, 5000, 50, 61))).toBe(false);
    expect(sonSimilares(d(1, 0, 50, 61), d(2, 5000, 50, 61))).toBe(false);
  });
});

describe("claveParDup", () => {
  it("es orden-independiente", () => {
    expect(claveParDup(90, 94)).toBe("90|94");
    expect(claveParDup(94, 90)).toBe("90|94");
  });
});

describe("detectarDuplicados", () => {
  const cruz1 = d(90, 5703, 50, 61);
  const cruz2 = d(91, 5599, 50, 61);
  const cruz3 = d(94, 5703, 50, 61);
  const aguila = d(1, 10648, 78, 74);
  const otro = d(7, 1200, 30, 30);

  it("agrupa transitivamente los similares (grupo de 3)", () => {
    const grupos = detectarDuplicados([cruz1, aguila, cruz2, otro, cruz3]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].map(x => x.id).sort()).toEqual([90, 91, 94]);
  });

  it("sin similares no devuelve grupos", () => {
    expect(detectarDuplicados([aguila, otro])).toEqual([]);
  });

  it("respeta los pares descartados por el admin", () => {
    const ignorados = new Set([claveParDup(90, 91), claveParDup(90, 94), claveParDup(91, 94)]);
    expect(detectarDuplicados([cruz1, cruz2, cruz3], ignorados)).toEqual([]);
  });

  it("grupos más grandes primero", () => {
    const par = [d(200, 8000, 90, 40), d(201, 8050, 90, 40)];
    const grupos = detectarDuplicados([...par, cruz1, cruz2, cruz3]);
    expect(grupos.map(g => g.length)).toEqual([3, 2]);
  });
});

describe("firma visual", () => {
  // grillas sintéticas GRID×GRID
  const vacia = () => new Array(GRID * GRID).fill(0);
  const franjaHorizontal = () => {
    const g = vacia();
    for (let x = 0; x < GRID; x++) g[7 * GRID + x] = 1; // fila del medio
    return g;
  };
  const diagonal = () => {
    const g = vacia();
    for (let i = 0; i < GRID; i++) g[i * GRID + i] = 1;
    return g;
  };

  it("rotarGrid: 4 rotaciones vuelven al original", () => {
    let g = diagonal();
    for (let r = 0; r < 4; r++) g = rotarGrid(g);
    expect(g).toEqual(diagonal());
  });

  it("rotarGrid: 90° convierte fila del medio en columna", () => {
    const rotada = rotarGrid(franjaHorizontal());
    for (let y = 0; y < GRID; y++) expect(rotada[y * GRID + (GRID - 1 - 7)]).toBe(1);
  });

  it("firmas idénticas → similitud 1", () => {
    expect(similitudVisual(diagonal(), diagonal())).toBeCloseTo(1);
  });

  it("misma firma rotada 90° → similitud 1 (insensible a rotación)", () => {
    const g = franjaHorizontal();
    expect(similitudVisual(g, rotarGrid(g))).toBeCloseTo(1);
  });

  it("espejarGrid: espejo del espejo = identidad", () => {
    expect(espejarGrid(espejarGrid(diagonal()))).toEqual(diagonal());
  });

  it("misma firma espejada → similitud 1 (hay diseños digitalizados en espejo)", () => {
    // patrón asimétrico: L en la esquina
    const g = vacia();
    for (let i = 0; i < 10; i++) { g[i * GRID] = 1; g[(GRID - 1) * GRID + i] = 1; }
    expect(similitudVisual(g, espejarGrid(g))).toBeCloseTo(1);
  });

  it("patrones distintos → similitud baja el umbral", () => {
    // franja vs diagonal comparten pocas celdas en cualquier rotación
    expect(similitudVisual(franjaHorizontal(), diagonal())).toBeLessThan(UMBRAL_VISUAL);
  });

  it("firma faltante → 0", () => {
    expect(similitudVisual(null, diagonal())).toBe(0);
  });

  it("detectarDuplicados filtra pares con misma metadata pero preview distinta", () => {
    // caso real: UNO90 vs LETRAS-MANGA-FILIPINA-PASTELERO (3414 vs 3446 pt,
    // 95×25 vs 92×25) — metadata casi igual, diseños sin nada que ver
    const uno = d(36, 3414, 95, 25);
    const pastelero = d(62, 3446, 92, 25);
    const firmas = new Map([[36, diagonal()], [62, franjaHorizontal()]]);
    expect(detectarDuplicados([uno, pastelero], new Set(), firmas)).toEqual([]);
    // sin firmas (o con firmas iguales) el par sí sale
    expect(detectarDuplicados([uno, pastelero])).toHaveLength(1);
    const iguales = new Map([[36, diagonal()], [62, diagonal()]]);
    expect(detectarDuplicados([uno, pastelero], new Set(), iguales)).toHaveLength(1);
  });

  it("si a un diseño le falta la firma, el par se decide por metadata", () => {
    const a = d(1, 5000, 50, 61);
    const b = d(2, 5050, 50, 61);
    const firmas = new Map([[1, diagonal()]]); // b sin firma
    expect(detectarDuplicados([a, b], new Set(), firmas)).toHaveLength(1);
  });
});

describe("idsCandidatos", () => {
  it("devuelve solo ids que caen en algún par por metadata", () => {
    const a = d(1, 5703, 50, 61);
    const b = d(2, 5599, 50, 61);
    const suelto = d(3, 900, 20, 20);
    expect(idsCandidatos([a, b, suelto])).toEqual(new Set([1, 2]));
  });

  it("respeta pares descartados", () => {
    const a = d(1, 5703, 50, 61);
    const b = d(2, 5599, 50, 61);
    expect(idsCandidatos([a, b], new Set([claveParDup(1, 2)]))).toEqual(new Set());
  });
});

describe("fusionarEnGanador", () => {
  it("hereda archivos que el ganador no tiene y queda como oficial", () => {
    const ganador = d(1, 5703, 50, 61, { archivoUrl: "a.dst", formato: "DST", esBorrador: true });
    const perdedor = d(2, 5703, 50, 61, { archivoEmbUrl: "b.emb", archivoDgtUrl: "b.dgt", colores: 3 });
    const out = fusionarEnGanador(ganador, [perdedor]);
    expect(out.archivoUrl).toBe("a.dst");
    expect(out.archivoEmbUrl).toBe("b.emb");
    expect(out.archivoDgtUrl).toBe("b.dgt");
    expect(out.colores).toBe(3);
    expect(out.esBorrador).toBe(false);
  });

  it("no pisa lo que el ganador ya tiene", () => {
    const ganador = d(1, 5703, 50, 61, { archivoEmbUrl: "mio.emb", colores: 2 });
    const perdedor = d(2, 5703, 50, 61, { archivoEmbUrl: "otro.emb", colores: 5 });
    const out = fusionarEnGanador(ganador, [perdedor]);
    expect(out.archivoEmbUrl).toBe("mio.emb");
    expect(out.colores).toBe(2);
  });

  it("el primer perdedor con el archivo gana el hueco", () => {
    const out = fusionarEnGanador(d(1, 100, 10, 10), [
      d(2, 100, 10, 10, { archivoEmbUrl: "p2.emb" }),
      d(3, 100, 10, 10, { archivoEmbUrl: "p3.emb" }),
    ]);
    expect(out.archivoEmbUrl).toBe("p2.emb");
  });
});

describe("leerIgnorados / guardarIgnorados", () => {
  const fakeStorage = () => {
    const m = new Map();
    return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  };

  it("round-trip por storage", () => {
    const st = fakeStorage();
    guardarIgnorados(new Set(["1|2", "3|4"]), st);
    expect(leerIgnorados(st)).toEqual(new Set(["1|2", "3|4"]));
  });

  it("storage vacío o corrupto → Set vacío", () => {
    expect(leerIgnorados(fakeStorage())).toEqual(new Set());
    const st = fakeStorage();
    st.setItem("taller_dup_ignorados", "{no-es-json");
    expect(leerIgnorados(st)).toEqual(new Set());
  });
});
