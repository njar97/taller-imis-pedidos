// Geometria de los moldes: elegir la pieza que toca y ubicar un arte sobre
// ella con las cotas de la norma de la casa.
//
// POR QUE EXISTE
// El diagrama de "Especificaciones de diseno" dibujaba una camiseta inventada
// con coordenadas fijas y colocaba el arte buscando palabras ("pecho izquierdo"
// -> el punto 155,93 del dibujo). No tenia nada que ver con la prenda del
// pedido ni con el molde con que se corta. Javier: «deberia ir la realidad de
// donde va el diseno en cada patron, no en esa camisa dibujada sin sentido».
//
// Aca vive la parte que no dibuja: que pieza corresponde a cada ubicacion, de
// donde se miden las cotas y donde cae el arte. El dibujo va en `diagrama.js`.
//
// Las cotas son las de la norma (ver la memoria del estandar de ubicacion):
//   A  hombro -> filo superior del arte
//   B  escote -> filo superior del arte
//   F  escote -> EJE del arte        ⭐ es la que se usa al planchar
//   C  desplazamiento horizontal contra el eje de la pieza (0 = centrado)
//   D  ancho del arte     E  alto del arte
// En una manga, A y F se miden desde el RUEDO en vez del hombro.

export const sinTildes = s =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Del "Camiseta Intramuros 2026 (DTF)" del pedido al `prenda` de taller_moldes.
export function prendaConMolde(tipoPrenda, moldes) {
  const t = sinTildes(tipoPrenda);
  const nombres = [...new Set((moldes || []).map(m => m.prenda).filter(Boolean))];
  return nombres.find(n => t.includes(sinTildes(n))) || "";
}

// ── que pieza toca segun donde va el arte ────────────────────────────────
const A_PIEZA = [
  [["espalda", "trasera", "atras"], "trasera"],
  [["manga", "puno"], "manga"],
  [["pecho", "delantera", "frente", "corazon", "monograma"], "delantera"],
];

/** Rol de pieza para una ubicacion escrita a mano. null si no aplica a ninguna
 *  pieza cortada (una corbata, un gafete: son accesorios, no van sobre molde). */
export function piezaDeUbicacion(ubicacion) {
  const u = sinTildes(ubicacion);
  if (!u) return null;
  for (const [claves, rol] of A_PIEZA) if (claves.some(k => u.includes(k))) return rol;
  return null;
}

// El pack numera las piezas sin decir cual es cual y ademas duplica por genero
// (`delantera · masculino`). Se elige por nombre y, cuando hay varias, la que
// la `nota` identifico al extraer los contornos.
const CANDIDATAS = {
  delantera: [/^delantera/, /^cuerpo/],
  trasera:   [/^trasera/,   /^cuerpo/],
  manga:     [/^manga/],
};
const NOTA = { delantera: /cuello redondo/, trasera: /trasera/, manga: null };

export function moldeDePieza(moldes, prenda, talla, rol) {
  const dela = (moldes || []).filter(m =>
    !m.deleted_at && m.prenda === prenda && m.talla === talla && m.contorno &&
    Array.isArray(m.contorno.puntos) && m.contorno.puntos.length > 3);
  if (!dela.length) return null;
  for (const re of CANDIDATAS[rol] || []) {
    const conNota = NOTA[rol]
      ? dela.find(m => re.test(m.pieza || "") && NOTA[rol].test(sinTildes(m.nota || "")))
      : null;
    const cualquiera = dela.find(m => re.test(m.pieza || ""));
    if (conNota || cualquiera) return conNota || cualquiera;
  }
  return null;
}

/** La talla del pedido que tenga molde. Un pedido lleva varias; para el dibujo
 *  basta una y se prefiere la del medio, que es la que representa al lote. */
export function tallaConMolde(tallasPedido, moldes, prenda) {
  const hay = new Set((moldes || [])
    .filter(m => !m.deleted_at && m.prenda === prenda && m.contorno)
    .map(m => m.talla));
  const mias = (tallasPedido || []).map(String).filter(t => hay.has(t));
  if (mias.length) return mias[Math.floor(mias.length / 2)];
  const todas = [...hay].sort((a, b) =>
    (parseInt(a) || 999) - (parseInt(b) || 999) || a.localeCompare(b));
  return todas.length ? todas[Math.floor(todas.length / 2)] : null;
}

// ── landmarks sobre el contorno ──────────────────────────────────────────
export const bbox = pts => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

/** Y del filo del escote: lo mas bajo de la curva del cuello, al centro. */
export function escoteDe(pts) {
  const [x0, y0, x1] = bbox(pts);
  const ancho = x1 - x0;
  const centro = pts.filter(p => Math.abs(p[0] - (x0 + ancho / 2)) < ancho * 0.06);
  return centro.length ? Math.min(...centro.map(p => p[1])) : y0;
}

/** Los dos bordes de la pieza a una altura dada. Sirve para saber hasta donde
 *  llega la tela ahi, que es lo que limita cuanto se puede correr un arte. */
export function orillaALaAltura(pts, y) {
  const xs = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    if (((y1 <= y && y <= y2) || (y2 <= y && y <= y1)) && Math.abs(y2 - y1) > 1e-9) {
      xs.push(x1 + (x2 - x1) * (y - y1) / (y2 - y1));
    }
  }
  return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
}

// Estandar de la casa congelado: del pico del escote al CENTRO del arte, en cm.
// ⚠ Se probo definirlo como % del alto de la pieza y NO sirve: los artes miden
// lo mismo en todas las tallas, asi que el centro casi no se mueve.
const CENTROS = {
  "4": [8.5, 19.5], "6": [9.0, 20.0], "8": [9.0, 20.0], "10": [9.5, 20.5],
  "12": [9.5, 21.0], "14": [10.0, 21.5], "M": [11.0, 22.5], "XXL": [12.0, 24.0],
};
const ORDEN = ["2", "4", "6", "8", "10", "12", "14", "XS", "S", "M", "L", "XL", "XXL"];

/** F por defecto (escote -> eje del arte) cuando el diseno no la trae escrita.
 *  Para una talla sin entrada propia se toma la mas cercana de la tabla. */
export function fEstandar(talla, rol) {
  const i = rol === "trasera" ? 1 : 0;
  if (CENTROS[talla]) return CENTROS[talla][i];
  const pos = ORDEN.indexOf(String(talla));
  if (pos < 0) return CENTROS["8"][i];
  let mejor = "8", dist = 99;
  for (const t of Object.keys(CENTROS)) {
    const d = Math.abs(ORDEN.indexOf(t) - pos);
    if (d < dist) { dist = d; mejor = t; }
  }
  return CENTROS[mejor][i];
}

// La sisa lleva 1 cm de costura: el contorno es la linea de CORTE, asi que al
// coser se pierde ese centimetro y un arte centrado contra la orilla cortada
// queda corrido hacia la manga.
const COSTURA = 1.0;

/**
 * Donde cae un arte sobre la pieza, en cm y en el sistema del contorno.
 * @returns {{cx,cy,ancho,alto,f,c,ejeX,escote}} cx,cy = centro del arte.
 */
export function ubicarArte(diseno, pts, rol) {
  const [x0, y0, x1, y1] = bbox(pts);
  const ejeX = (x0 + x1) / 2;
  const escote = escoteDe(pts);
  const ancho = parseFloat(diseno.ancho) || 8;
  const alto = parseFloat(diseno.alto) || 5;

  // F: la que el diseno traiga escrita gana sobre el estandar.
  const escrita = parseFloat(diseno.posicionCuello);
  const f = escrita > 0 ? escrita : fEstandar(diseno.__talla, rol);

  // En la manga se mide desde el RUEDO, no desde el escote.
  const cy = rol === "manga" ? y1 - f : escote + f;

  // Horizontal: al centro, salvo que la ubicacion diga un lado. La pieza se
  // dibuja VISTA POR FUERA, asi que el pecho izquierdo del portador cae a la
  // DERECHA del dibujo.
  const u = sinTildes(diseno.ubicacion);
  let c = 0;
  const izqPortador = /(izquierd|izq)/.test(u);
  const derPortador = /(derech|der\b)/.test(u);
  if (izqPortador || derPortador) {
    const orilla = orillaALaAltura(pts, cy);
    if (orilla) {
      // a media distancia entre el eje y el filo de la sisa, ya descontada la
      // costura: es donde la casa pone el monograma de pecho.
      const media = ((izqPortador ? orilla[1] : orilla[0]) - ejeX);
      const util = media - Math.sign(media) * COSTURA;
      c = util / 2;
    }
  }
  return { cx: ejeX + c, cy, ancho, alto, f, c, ejeX, escote };
}
