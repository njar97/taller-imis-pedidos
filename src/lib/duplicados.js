// Detección de duplicados en el catálogo de diseños de bordado.
//
// NO se basa en el nombre (los nombres de archivo no dicen mucho:
// "LETRAS-CHEFA" vs "LETRAS-CHEFA-RECOVERED", "COPY-OF-...", "_v2").
// La regla: el TAMAÑO filtra candidatos y la IMAGEN decide.
//  - Mismo tamaño (±TOL_MM) + previews que se ven iguales → duplicado.
//    Las puntadas NO gatean: una re-digitalización puede variar 20% de
//    puntadas y seguir siendo el mismo diseño (ej. LOGO-UES vs RECOVERED).
//  - El mismo logo en tamaños DISTINTOS no es duplicado — el DST no
//    escala bien, así que los tamaños se guardan a propósito.
//  - Diseños sin medidas (subidos sin metadata): decide solo la imagen,
//    y únicamente si ambas previews son renders útiles (las fotos con
//    fondo no generan firma).
//  - Sin firma visual disponible, cae al criterio viejo de metadata
//    (puntadas ±TOL_PT + tamaño).

export const TOL_MM = 3; // tolerancia de tamaño en mm
export const TOL_PT = 0.03; // tolerancia de puntadas (3% del mayor)

const conMedidas = d => d?.anchoMm != null && d?.altoMm != null;

/** ¿a y b miden lo mismo (±TOL_MM)? Gate de candidatos. */
export function tamanoSimilar(a, b) {
  return (
    conMedidas(a) && conMedidas(b) &&
    Math.abs(a.anchoMm - b.anchoMm) <= TOL_MM &&
    Math.abs(a.altoMm - b.altoMm) <= TOL_MM
  );
}

/** Criterio de metadata pura — fallback cuando no hay firmas visuales. */
export function sonSimilares(a, b) {
  if (!a?.puntadas || !b?.puntadas) return false;
  if (Math.abs(a.puntadas - b.puntadas) > Math.max(a.puntadas, b.puntadas) * TOL_PT) return false;
  if (Math.abs((a.anchoMm || 0) - (b.anchoMm || 0)) > TOL_MM) return false;
  if (Math.abs((a.altoMm || 0) - (b.altoMm || 0)) > TOL_MM) return false;
  return true;
}

/**
 * ¿Vale la pena comparar visualmente a a y b? Miden parecido, o a alguno
 * le faltan las medidas (ahí la imagen es la única señal).
 */
export function parCandidato(a, b) {
  if (conMedidas(a) && conMedidas(b)) return tamanoSimilar(a, b);
  return true;
}

/** Decisión final sobre un par, con las firmas visuales disponibles. */
function parDuplicado(a, b, firmas) {
  const fa = firmas?.get(a.id), fb = firmas?.get(b.id);
  if (conMedidas(a) && conMedidas(b)) {
    if (!tamanoSimilar(a, b)) return false;
    if (fa && fb) return similitudVisual(fa, fb) >= UMBRAL_VISUAL;
    return sonSimilares(a, b);
  }
  // sin medidas: sin ambas firmas no hay señal suficiente
  return !!(fa && fb) && similitudVisual(fa, fb) >= UMBRAL_VISUAL;
}

/** Clave estable de un par de ids (orden-independiente) para el set de descartados. */
export const claveParDup = (idA, idB) => (idA < idB ? idA + "|" + idB : idB + "|" + idA);

/**
 * Ids de diseños que caen en algún par candidato — para saber a cuáles
 * vale la pena calcularles la firma visual.
 */
export function idsCandidatos(disenos, ignorados = new Set()) {
  const ids = new Set();
  for (let i = 0; i < disenos.length; i++) {
    for (let j = i + 1; j < disenos.length; j++) {
      const a = disenos[i], b = disenos[j];
      if (ignorados.has(claveParDup(a.id, b.id))) continue;
      if (parCandidato(a, b)) { ids.add(a.id); ids.add(b.id); }
    }
  }
  return ids;
}

/**
 * Agrupa diseños que parecen duplicados entre sí (union-find sobre los
 * pares que pasan `parDuplicado`). `ignorados` es un Set de claves de
 * pares que el admin ya marcó como "no son duplicados"; `firmas` es un
 * Map id → firma visual (ver firmaVisual).
 * @returns {Array<Array>} grupos de 2+ diseños, mayores primero
 */
export function detectarDuplicados(disenos, ignorados = new Set(), firmas = null) {
  const padre = new Map();
  const find = id => {
    while (padre.get(id) !== id) {
      padre.set(id, padre.get(padre.get(id))); // path halving
      id = padre.get(id);
    }
    return id;
  };
  for (const d of disenos) padre.set(d.id, d.id);

  for (let i = 0; i < disenos.length; i++) {
    for (let j = i + 1; j < disenos.length; j++) {
      const a = disenos[i], b = disenos[j];
      if (ignorados.has(claveParDup(a.id, b.id))) continue;
      if (parDuplicado(a, b, firmas)) padre.set(find(a.id), find(b.id));
    }
  }

  const grupos = new Map();
  for (const d of disenos) {
    const raiz = find(d.id);
    if (!grupos.has(raiz)) grupos.set(raiz, []);
    grupos.get(raiz).push(d);
  }
  return [...grupos.values()]
    .filter(g => g.length > 1)
    .sort((a, b) => b.length - a.length || (b[0].puntadas || 0) - (a[0].puntadas || 0));
}

/**
 * Fusiona en el ganador los archivos/datos que le falten y que algún
 * perdedor sí tenga (.emb editable, .dgt, preview...). Así se puede elegir
 * por la vista previa sin miedo a perder el archivo bueno del otro.
 * El elegido queda como oficial (deja de ser borrador).
 */
export function fusionarEnGanador(ganador, perdedores) {
  const out = { ...ganador, esBorrador: false };
  for (const p of perdedores) {
    if (!out.archivoUrl && p.archivoUrl) {
      out.archivoUrl = p.archivoUrl;
      out.formato = p.formato || out.formato;
    }
    if (!out.archivoEmbUrl && p.archivoEmbUrl) out.archivoEmbUrl = p.archivoEmbUrl;
    if (!out.archivoDgtUrl && p.archivoDgtUrl) out.archivoDgtUrl = p.archivoDgtUrl;
    if (!out.previewUrl && p.previewUrl) out.previewUrl = p.previewUrl;
    if (!out.colores && p.colores) out.colores = p.colores;
    if (!out.puntadas && p.puntadas) out.puntadas = p.puntadas;
    if (out.anchoMm == null && p.anchoMm != null) {
      out.anchoMm = p.anchoMm;
      out.altoMm = p.altoMm;
    }
  }
  return out;
}

// ── Firma visual de previews ────────────────────────────────────
// Grilla GRID×GRID de densidad de "tinta" (pixeles no blancos) de la
// preview, recortada al bounding box del diseño. Insensible al color de
// hilo (binariza) y al tamaño de render (normaliza al bbox); rotación y
// espejo se cubren comparando las 8 orientaciones (hay diseños
// digitalizados en espejo para transfer, ej. LETRAS_NOE).

export const GRID = 32;
// Calibrado contra las previews reales del catálogo (scratchpad
// validar-umbral.mjs): los duplicados verdaderos dan ≥0.899 y los pares
// que solo coinciden en metadata por casualidad dan ≤0.847.
export const UMBRAL_VISUAL = 0.87;

/** Rota una grilla cuadrada 90° horario. */
export function rotarGrid(g, n = GRID) {
  const out = new Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) out[x * n + (n - 1 - y)] = g[y * n + x];
  return out;
}

/** Espeja una grilla cuadrada horizontalmente. */
export function espejarGrid(g, n = GRID) {
  const out = new Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) out[y * n + (n - 1 - x)] = g[y * n + x];
  return out;
}

function coseno(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Similitud 0..1 entre dos firmas (mejor de las 8 orientaciones de b). */
export function similitudVisual(a, b, n = GRID) {
  if (!a || !b) return 0;
  let mejor = 0;
  for (const base of [b, espejarGrid(b, n)]) {
    let rb = base;
    for (let r = 0; r < 4; r++) {
      mejor = Math.max(mejor, coseno(a, rb));
      rb = rotarGrid(rb, n);
    }
  }
  return mejor;
}

/**
 * Calcula la firma visual de una preview (browser-only: Image + canvas).
 * Devuelve null si la imagen no carga, está vacía, o el canvas queda
 * tainted por CORS — en ese caso el par se decide solo por metadata.
 */
export async function firmaVisual(url) {
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.crossOrigin = "anonymous"; // Supabase Storage manda ACAO:*
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    // resolución interna: la nativa de la preview (480px en el catálogo),
    // capada por si algún día se suben imágenes grandes
    const W = Math.min(512, Math.max(img.width, img.height, GRID * 4));
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = W;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, W);
    const esc = Math.min(W / img.width, W / img.height);
    const w = img.width * esc, h = img.height * esc;
    ctx.drawImage(img, (W - w) / 2, (W - h) / 2, w, h);
    const px = ctx.getImageData(0, 0, W, W).data;

    // mapa binario de tinta + bounding box
    const tinta = new Uint8Array(W * W);
    let nTinta = 0, x0 = W, y0 = W, x1 = -1, y1 = -1;
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        const i4 = (y * W + x) * 4;
        const lum = 0.299 * px[i4] + 0.587 * px[i4 + 1] + 0.114 * px[i4 + 2];
        if (px[i4 + 3] > 40 && lum < 235) {
          tinta[y * W + x] = 1;
          nTinta++;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null; // preview en blanco
    // >60% de tinta = foto con fondo (subida desde la app), no un render
    // de bordado sobre blanco — la firma saldría un bloque sólido que
    // coincide con cualquier cosa (medido: fotos 80-100%, renders 12-31%)
    if (nTinta / (W * W) > 0.6) return null;

    // densidad promedio por celda, normalizada al bbox
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const g = new Array(GRID * GRID).fill(0);
    const cuenta = new Array(GRID * GRID).fill(0);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const gx = Math.min(GRID - 1, (((x - x0) / bw) * GRID) | 0);
        const gy = Math.min(GRID - 1, (((y - y0) / bh) * GRID) | 0);
        const gi = gy * GRID + gx;
        g[gi] += tinta[y * W + x];
        cuenta[gi]++;
      }
    }
    for (let i = 0; i < g.length; i++) g[i] = cuenta[i] ? g[i] / cuenta[i] : 0;
    return g;
  } catch {
    return null;
  }
}

// ── Persistencia de pares descartados (por dispositivo) ─────────
// localStorage alcanza: la curación la hace el admin, normalmente
// desde un solo equipo. Si algún día molesta, se promueve a columna.

const LS_KEY = "taller_dup_ignorados";

export function leerIgnorados(storage = globalThis.localStorage) {
  try {
    return new Set(JSON.parse(storage.getItem(LS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function guardarIgnorados(set, storage = globalThis.localStorage) {
  try {
    storage.setItem(LS_KEY, JSON.stringify([...set]));
  } catch { /* modo privado / cuota — el descarte vive solo en la sesión */ }
}
