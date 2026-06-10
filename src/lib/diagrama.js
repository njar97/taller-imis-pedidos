// Genera un diagrama PNG de posicionamiento de diseños en una prenda.
// Usa Canvas 2D (browser only). Devuelve data URL o "" si no hay datos.

const COLLAR_Y = 42;   // Y del vértice del cuello V (referencia de cota)
const PX_CM    = 3.2;  // ~70 cm de camisa = ~225 px de canvas

const TECH_COLORS = {
  "Sublimación": "#2980B9",
  "DTF":         "#D35400",
  "Bordado":     "#8E44AD",
  "Serigrafía":  "#27AE60",
};
export const techColor = t => TECH_COLORS[t] || "#7F8C8D";

// Coordenadas en el espacio SVG interno (viewBox 0 0 240 280).
// OJO: SVG-derecha = izquierda del portador (y viceversa).
const LOC_MAP = [
  [["pecho izquierdo", "pecho izq", "izquierdo"], [155, 93]],
  [["pecho derecho",   "pecho der", "derecho"],   [85,  93]],
  [["centro pecho",    "centro",    "pecho"],      [120, 93]],
  [["manga izquierda", "manga izq"],               [210, 62]],
  [["manga derecha",   "manga der"],               [30,  62]],
  [["espalda"],                                    [120, 155]],
  [["cuello"],                                     [120, 52]],
  [["bajo", "vientre", "abdomen"],                 [120, 168]],
];

export function getPosXY(d) {
  const key = (d.ubicacion || "").toLowerCase().trim();
  let cx = 120, cy = 93;
  for (const [keys, [x, y]] of LOC_MAP) {
    if (keys.some(k => key.includes(k))) { cx = x; cy = y; break; }
  }
  if (d.posicionCuello && parseFloat(d.posicionCuello) > 0) {
    cy = COLLAR_Y + parseFloat(d.posicionCuello) * PX_CM;
  }
  return [cx, cy];
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function diagramaCamisaPNG(disenos, { ancho = 240, alto = 280 } = {}) {
  if (typeof document === "undefined") return "";
  const items = (disenos || []).filter(d => d.ubicacion);
  if (!items.length) return "";

  const canvas = document.createElement("canvas");
  canvas.width  = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  const sx = ancho / 240;
  const sy = alto  / 280;
  const pt = (x, y) => [x * sx, y * sy];

  // ── Silueta de la camiseta ──────────────────────────────────────
  // Vista frontal cuello-V. SVG-derecha = lado izquierdo del portador.
  ctx.beginPath();
  ctx.moveTo(...pt(90,  8));
  ctx.lineTo(...pt(60, 28));
  ctx.lineTo(...pt( 5, 42));
  ctx.lineTo(...pt( 5, 82));
  ctx.lineTo(...pt(60, 82));
  ctx.lineTo(...pt(55, 265));
  ctx.lineTo(...pt(185, 265));
  ctx.lineTo(...pt(180, 82));
  ctx.lineTo(...pt(235, 82));
  ctx.lineTo(...pt(235, 42));
  ctx.lineTo(...pt(180, 28));
  ctx.lineTo(...pt(150, 8));
  ctx.bezierCurveTo(...pt(145, 24), ...pt(130, 38), ...pt(120, 42));
  ctx.bezierCurveTo(...pt(110, 38), ...pt( 95, 24), ...pt( 90,  8));
  ctx.closePath();
  ctx.fillStyle   = "#F5F5F5";
  ctx.fill();
  ctx.strokeStyle = "#C0C0C0";
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Cuello V (línea interna decorativa)
  ctx.beginPath();
  ctx.moveTo(...pt(90, 8));
  ctx.bezierCurveTo(...pt(95, 24), ...pt(110, 38), ...pt(120, 42));
  ctx.bezierCurveTo(...pt(130, 38), ...pt(145, 24), ...pt(150, 8));
  ctx.strokeStyle = "#C0C0C0";
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Etiquetas laterales diminutas (D / I desde portador)
  ctx.fillStyle = "#BDBDBD";
  ctx.font      = `${Math.round(7 * sx)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("D", pt(77, 22)[0], pt(77, 22)[1]);
  ctx.fillText("I", pt(163, 22)[0], pt(163, 22)[1]);

  // ── Marcadores de diseño ────────────────────────────────────────
  items.forEach((d, i) => {
    const [cx, cy]   = getPosXY(d);
    const col        = techColor(d.tecnica);
    const [scx, scy] = pt(cx, cy);
    const sw = d.ancho ? Math.max(22, parseFloat(d.ancho) * PX_CM) * sx : 32 * sx;
    const sh = d.alto  ? Math.max(14, parseFloat(d.alto)  * PX_CM) * sy : 20 * sy;

    // Línea de cota desde el cuello
    if (d.posicionCuello && parseFloat(d.posicionCuello) > 0) {
      const [, colY] = pt(cx, COLLAR_Y);
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = col + "99";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(scx, colY);
      ctx.lineTo(scx, scy);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle    = col;
      ctx.font         = `bold ${Math.round(7 * sx)}px sans-serif`;
      ctx.textAlign    = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${d.posicionCuello}cm`, scx + 3 * sx, colY + (scy - colY) * 0.5);
      ctx.textBaseline = "alphabetic";
    }

    // Rectángulo del área de diseño
    ctx.fillStyle   = col + "38";
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1.5;
    rrect(ctx, scx - sw / 2, scy, sw, sh, 3 * sx);
    ctx.fill();
    ctx.stroke();

    // Medidas dentro del rectángulo
    if (d.ancho && d.alto) {
      ctx.fillStyle    = col;
      ctx.font         = `bold ${Math.round(7 * sx)}px sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${d.ancho}×${d.alto}`, scx, scy + sh * 0.65);
      ctx.textBaseline = "alphabetic";
    }

    // Círculo numerado
    const r = 7 * Math.min(sx, sy);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(scx, scy - r * 0.3, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle    = "#fff";
    ctx.font         = `900 ${Math.round(8.5 * sx)}px sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), scx, scy - r * 0.3);
    ctx.textBaseline = "alphabetic";
  });

  return canvas.toDataURL("image/png");
}
