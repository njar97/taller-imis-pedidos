// Detección de duplicados en el catálogo de diseños de bordado.
//
// NO se basa en el nombre (los nombres de archivo no dicen mucho:
// "LETRAS-CHEFA" vs "LETRAS-CHEFA-RECOVERED", "COPY-OF-...", "_v2").
// La señal fuerte es la metadata del bordado: dos digitalizaciones del
// mismo arte comparten tamaño (±TOL_MM) y conteo de puntadas (±TOL_PT).
// El mismo logo en tamaños DISTINTOS no es duplicado — el DST no escala
// bien, así que los tamaños se guardan a propósito.

export const TOL_MM = 3; // tolerancia de tamaño en mm
export const TOL_PT = 0.03; // tolerancia de puntadas (3% del mayor)

/** ¿a y b parecen ser el mismo diseño digitalizado dos veces? */
export function sonSimilares(a, b) {
  if (!a?.puntadas || !b?.puntadas) return false;
  if (Math.abs(a.puntadas - b.puntadas) > Math.max(a.puntadas, b.puntadas) * TOL_PT) return false;
  if (Math.abs((a.anchoMm || 0) - (b.anchoMm || 0)) > TOL_MM) return false;
  if (Math.abs((a.altoMm || 0) - (b.altoMm || 0)) > TOL_MM) return false;
  return true;
}

/** Clave estable de un par de ids (orden-independiente) para el set de descartados. */
export const claveParDup = (idA, idB) => (idA < idB ? idA + "|" + idB : idB + "|" + idA);

/**
 * Agrupa diseños que parecen duplicados entre sí (union-find sobre los
 * pares similares). `ignorados` es un Set de claves de pares que el admin
 * ya marcó como "no son duplicados".
 * @returns {Array<Array>} grupos de 2+ diseños, mayores primero
 */
export function detectarDuplicados(disenos, ignorados = new Set()) {
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
      if (sonSimilares(a, b)) padre.set(find(a.id), find(b.id));
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
  }
  return out;
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
