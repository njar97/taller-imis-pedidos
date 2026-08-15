// Dibuja DONDE va cada arte sobre el molde REAL con que se corta la prenda.
//
// Antes esto era una camiseta inventada con coordenadas fijas y el arte se
// colocaba buscando palabras: "pecho izquierdo" caia en el punto 155,93 del
// dibujo, tuviera el pedido la prenda que tuviera. Javier: «deberia ir la
// realidad de donde va el diseno en cada patron, no en esa camisa dibujada sin
// sentido».
//
// Ahora se dibuja el contorno de `taller_moldes` — el mismo trazo con el que se
// corta — y el arte cae donde manda la norma de la casa: por su EJE, a la F
// medida desde el filo del escote. Ver `moldes.js`.
//
// Si la prenda no tiene molde trazado NO se dibuja nada: un dibujo que no
// corresponde es peor que ninguno, porque alguien se guia por el.

import {
  bbox, moldeDePieza, orillaALaAltura, piezaDeUbicacion, prendaConMolde,
  tallaConMolde, ubicarArte,
} from "./moldes.js";

const TECH_COLORS = {
  "Sublimación": "#2980B9",
  "DTF":         "#D35400",
  "Bordado":     "#8E44AD",
  "Serigrafía":  "#27AE60",
};
export const techColor = t => TECH_COLORS[t] || "#7F8C8D";

const TITULO = { delantera: "DELANTERA", trasera: "ESPALDA", manga: "MANGA" };

/**
 * Un PNG por pieza, con los artes que le tocan ya ubicados.
 *
 * @param {Array}  disenos  los `disenos` del pedido
 * @param {Array}  moldes   todo `taller_moldes`
 * @param {Object} ctx      { tipoPrenda, tallas }
 * @returns {{prenda:string, talla:string, piezas:Array}} `piezas` vacio = no
 *          hay molde para esta prenda y hay que mostrar el aviso en su lugar.
 */
export function diagramasDePedido(disenos, moldes, { tipoPrenda, tallas } = {}) {
  const items = (disenos || []).filter(d => d.ubicacion);
  const vacio = { prenda: "", talla: "", piezas: [] };
  if (!items.length || !(moldes || []).length) return vacio;

  const prenda = prendaConMolde(tipoPrenda, moldes);
  if (!prenda) return vacio;
  const talla = tallaConMolde(tallas, moldes, prenda);
  if (!talla) return vacio;

  // cada arte a su pieza, conservando el numero que ve el usuario en la lista
  const porPieza = new Map();
  items.forEach((d, i) => {
    const rol = piezaDeUbicacion(d.ubicacion);
    if (!rol) return;                       // corbata, gafete: no van sobre molde
    if (!porPieza.has(rol)) porPieza.set(rol, []);
    porPieza.get(rol).push({ ...d, __n: i + 1, __talla: talla });
  });

  const piezas = [];
  for (const rol of ["delantera", "trasera", "manga"]) {
    const artes = porPieza.get(rol);
    if (!artes) continue;
    const molde = moldeDePieza(moldes, prenda, talla, rol);
    if (!molde) continue;
    const url = dibujarPieza(molde.contorno.puntos, artes, rol);
    if (url) piezas.push({ rol, titulo: TITULO[rol], url, artes, molde });
  }
  return { prenda, talla, piezas };
}

/** Dibuja una pieza con sus artes. Devuelve data URL, o "" fuera del navegador. */
export function dibujarPieza(puntos, artes, rol, { ancho = 260 } = {}) {
  if (typeof document === "undefined") return "";
  const pts = puntos.map(p => [p[0], p[1]]);
  const [x0, y0, x1, y1] = bbox(pts);
  const wCm = x1 - x0, hCm = y1 - y0;
  if (!(wCm > 0 && hCm > 0)) return "";

  const M = 16;                                  // margen para las cotas
  const esc = (ancho - M * 2) / wCm;
  const alto = Math.round(hCm * esc + M * 2);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  const X = cm => M + (cm - x0) * esc;
  const Y = cm => M + (cm - y0) * esc;

  // ── la pieza ──
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(X(px), Y(py)) : ctx.moveTo(X(px), Y(py))));
  ctx.closePath();
  ctx.fillStyle = "#f7f7f9";
  ctx.fill();
  ctx.strokeStyle = "#9aa1ad";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const punteada = (x1p, y1p, x2p, y2p, color) => {
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1p, y1p);
    ctx.lineTo(x2p, y2p);
    ctx.stroke();
    ctx.restore();
  };

  artes.forEach(d => {
    const u = ubicarArte(d, pts, rol);
    const col = techColor(d.tecnica);
    const aw = u.ancho * esc, ah = u.alto * esc;
    const cx = X(u.cx), cy = Y(u.cy);

    // eje del arte: es por donde se alinea al planchar, no por el filo
    punteada(X(x0), cy, X(x1), cy, col + "88");

    ctx.fillStyle = col + "33";
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.rect(cx - aw / 2, cy - ah / 2, aw, ah);
    ctx.fill();
    ctx.stroke();

    // cruz en el centro: el punto que se hace coincidir con la marca del molde
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
    ctx.stroke();

    // la cota F, que es la que el operario mide con cinta
    const desde = rol === "manga" ? Y(y1) : Y(u.escote);
    punteada(cx, desde, cx, cy, col + "66");
    ctx.fillStyle = col;
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    // ⚠ Con la cota corta —la manga, donde el arte va a 4 cm del ruedo— el
    // texto caia ENCIMA del arte. Cuando no hay tramo suficiente se saca al
    // costado del rectangulo.
    const tramo = Math.abs(desde - cy);
    if (tramo > 24) ctx.fillText(`F ${u.f.toFixed(1)}`, cx + 4, (desde + cy) / 2);
    else ctx.fillText(`F ${u.f.toFixed(1)}`, cx + aw / 2 + 5, cy);

    // el numero, el mismo que lleva en la lista de al lado. Va al COSTADO y no
    // arriba: arriba chocaba con la etiqueta de la cota.
    const nx = cx - aw / 2 - 8, ny = cy - ah / 2 + 3;
    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(d.__n), nx, ny);
  });

  // eje central de la pieza, de referencia
  const ejeX = X((x0 + x1) / 2);
  punteada(ejeX, Y(y0), ejeX, Y(y1), "#c8ccd4");

  // el filo del escote, que es de donde se mide todo
  if (rol !== "manga") {
    const esc0 = artes.length ? ubicarArte(artes[0], pts, rol).escote : null;
    if (esc0 != null) {
      const orilla = orillaALaAltura(pts, esc0);
      if (orilla) punteada(X(orilla[0]), Y(esc0), X(orilla[1]), Y(esc0), "#c8ccd4");
    }
  }

  ctx.fillStyle = "#98a0ac";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${wCm.toFixed(1)} × ${hCm.toFixed(1)} cm`, ancho / 2, alto - 4);

  return canvas.toDataURL("image/png");
}
