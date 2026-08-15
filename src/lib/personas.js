// Buscar y filtrar la lista de beneficiarios de un pedido.
//
// POR QUE EXISTE
// La tabla se dibujaba entera, en el orden de carga, sin buscador. Javier: «se
// ve una gran lista... cuesta hallar los alumnos que uno busca». Y despues:
// «mas que un buscador un filtro tambien, que filtre por cualquier campo, hasta
// por grado o seccion».
//
// EL HALLAZGO QUE ORDENA ESTO: el grado y la seccion NO son un campo aparte,
// viven dentro de `cargo` ("1° BACH B", "2° GRAL A"). Y hay campos que ni
// figuraban en la tabla: `color`, `expediente`, `gafete`. Por eso los filtros no
// se pueden escribir a mano uno por uno — se DEDUCEN de lo que cada pedido
// traiga cargado. Un pedido de cadetes ofrece grado; uno de camisetas, color.

/** Sin acentos y en minuscula: «gonzalez» tiene que encontrar «González». */
export const norm = s =>
  (s == null ? "" : String(s)).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim();

// Campos que no sirven para buscar ni filtrar: son de control interno o
// identificadores unicos, y ensucian tanto el texto como las facetas.
const OCULTOS = new Set([
  "id", "abierto", "extra", "noFactura", "medidas", "prendas", "__n", "__talla",
]);

// Como se llama cada campo para el usuario. Lo que no este aca sale con su
// propio nombre: asi un campo nuevo aparece solo, sin tener que tocar el codigo.
const ETIQUETA = {
  cargo: "Grado / cargo",
  gafete: "Talla taller",
  talla: "Talla",
  color: "Color",
  expediente: "Expediente",
  nota: "Nota",
  precio: "Precio",
};
export const etiquetaDe = k => ETIQUETA[k] || (k.charAt(0).toUpperCase() + k.slice(1));

/** Todo lo que se puede leer de una persona, en un solo texto para buscar.
 *  Incluye lo anidado: las prendas y las medidas tambien se buscan. */
export function textoDePersona(p) {
  const trozos = [];
  const meter = v => {
    if (v == null || v === "") return;
    if (Array.isArray(v)) return v.forEach(meter);
    if (typeof v === "object") return Object.entries(v)
      .forEach(([k, x]) => { if (!OCULTOS.has(k)) meter(x); });
    trozos.push(String(v));
  };
  for (const [k, v] of Object.entries(p || {})) {
    if (k === "id") continue;               // el id no lo busca nadie
    if (k === "medidas" || k === "prendas") { meter(v); continue; }
    if (OCULTOS.has(k)) continue;
    meter(v);
  }
  return norm(trozos.join(" "));
}

/**
 * Los filtros que este pedido puede ofrecer, deducidos de sus propios datos.
 *
 * Un campo sirve de filtro cuando SE REPITE: si cada persona tiene un valor
 * distinto es un identificador (el nombre, el expediente) y filtrar por el es
 * lo mismo que buscarlo.
 *
 * ⚠ El corte NO puede ser la mitad. Con eso, una lista de 4 personas con 3
 * colores perdia el filtro de color, y una de 3 con 2 tallas perdia el de
 * talla — justo los casos donde igual sirve. Se admite hasta el 80% de valores
 * distintos: alcanza para botar los identificadores (que dan 100%) sin
 * llevarse por delante los campos buenos de las listas cortas.
 */
export function facetasDe(personas, { maxValores = 40 } = {}) {
  const lista = personas || [];
  const porClave = new Map();
  for (const p of lista) {
    for (const [k, v] of Object.entries(p || {})) {
      if (OCULTOS.has(k) || k === "nombre" || v == null || v === "") continue;
      if (typeof v === "object") continue;
      if (!porClave.has(k)) porClave.set(k, new Map());
      const m = porClave.get(k);
      const s = String(v);
      m.set(s, (m.get(s) || 0) + 1);
    }
  }
  const out = [];
  for (const [clave, valores] of porClave) {
    const conValor = [...valores.values()].reduce((a, b) => a + b, 0);
    if (valores.size < 2 || valores.size > maxValores) continue;
    if (conValor < 2 || valores.size > conValor * 0.8) continue;   // identificador
    out.push({
      clave,
      etiqueta: etiquetaDe(clave),
      valores: [...valores.entries()]
        .map(([v, n]) => ({ v, n }))
        .sort((a, b) => a.v.localeCompare(b.v, "es", { numeric: true })),
    });
  }
  // primero los que mas parten la lista: son los que mas ayudan a acortarla
  return out.sort((a, b) => b.valores.length - a.valores.length);
}

/**
 * Aplica el texto libre y los filtros por campo.
 * @param {Object} filtros  { clave: valor } — solo los que tengan valor cuentan
 */
export function filtrarPersonas(personas, texto, filtros = {}) {
  const t = norm(texto);
  const activos = Object.entries(filtros || {}).filter(([, v]) => v);
  if (!t && !activos.length) return personas || [];
  return (personas || []).filter(p => {
    for (const [k, v] of activos) if (String(p?.[k] ?? "") !== String(v)) return false;
    if (!t) return true;
    // cada palabra por separado: "gonzalez 14" encuentra al González de talla 14
    return t.split(/\s+/).every(palabra => textoDePersona(p).includes(palabra));
  });
}

/** Cuenta cuantas personas hay por talla, para el resumen de la lista cerrada. */
export function resumenPorTalla(personas) {
  const m = new Map();
  for (const p of personas || []) {
    const t = (p?.talla || p?.prendas?.[0]?.talla || "").toString().trim();
    const k = t || "s/talla";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()]
    .map(([talla, n]) => ({ talla, n }))
    .sort((a, b) => (a.talla === "s/talla") - (b.talla === "s/talla")
      || a.talla.localeCompare(b.talla, "es", { numeric: true }));
}

/** Ordena SIN tocar el numero de fila: ese sigue siendo el de carga, porque las
 *  hojas ya impresas y los abonos anotados se refieren a el.
 *
 *  ⚠ `indices` NO es opcional de adorno. Si se numera sobre la lista ya
 *  filtrada, al buscar dos personas salen como #1 y #2 aunque en el pedido sean
 *  la #8 y la #46 — y esa es justo la numeracion con la que el taller entrega.
 *  Ya paso: se vio en la prueba con datos reales.
 */
export function ordenarPersonas(personas, criterio, indices) {
  const con = (personas || []).map((p, i) => ({
    p, orden: indices instanceof Map && indices.has(p) ? indices.get(p) : i,
  }));
  if (criterio === "nombre") {
    con.sort((a, b) => norm(a.p.nombre).localeCompare(norm(b.p.nombre), "es"));
  } else if (criterio === "talla") {
    const t = x => String(x.p.talla || x.p.prendas?.[0]?.talla || "￿");
    con.sort((a, b) => t(a).localeCompare(t(b), "es", { numeric: true }));
  }
  return con;
}

/** El indice de carga de cada persona, para que sobreviva al filtro. */
export const indicesDe = personas =>
  new Map((personas || []).map((p, i) => [p, i]));
