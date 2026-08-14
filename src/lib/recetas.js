// Recetas: cuanto insumo lleva UNA prenda de cada tipo.
//
// Existe porque los avios no se pueden amarrar a un pedido por fecha —
// salen de bodega y se reparten entre muchos. Costear por consumo
// (cantidad por prenda x precio) es la unica forma de meterlos.
//
// Solo lectura por ahora: las recetas se cargan a mano en la base
// mientras se juntan mediciones. Cada fila lleva su `fuente` escrita;
// un numero sin procedencia no se puede defender ni corregir.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

function rowToReceta(r) {
  return {
    id: r.id,
    prenda: r.prenda,
    talla: r.talla || null,
    insumo: r.insumo,
    cantidad: parseFloat(r.cantidad) || 0,
    unidad: r.unidad || "",
    mermaPct: parseFloat(r.merma_pct) || 0,
    costoUnit: r.costo_unit == null ? null : parseFloat(r.costo_unit),
    fuente: r.fuente || "",
    notas: r.notas || "",
  };
}

export async function leerRecetas() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_recetas?select=*&activo=is.true&order=prenda,insumo`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    return (await r.json()).map(rowToReceta);
  } catch (e) {
    console.warn("leerRecetas fallo:", e.message);
    return [];
  }
}

/** Las recetas de una prenda, prefiriendo la fila de la talla exacta
 *  sobre la general (talla NULL). */
export function recetaDe(recetas, prenda, talla = null) {
  if (!prenda) return [];
  const p = String(prenda).trim().toUpperCase();
  const dela = recetas.filter(r => r.prenda.trim().toUpperCase() === p);
  const porInsumo = new Map();
  for (const r of dela) {
    const previo = porInsumo.get(r.insumo);
    // gana la que calza con la talla pedida
    const calza = r.talla && talla && r.talla.toUpperCase() === String(talla).toUpperCase();
    if (!previo || calza) porInsumo.set(r.insumo, r);
  }
  return [...porInsumo.values()];
}

/** El `tipoPrenda` del pedido es texto libre ("Camiseta Intramuros 2026
 *  (DTF)"), asi que nunca calza exacto con el nombre de la receta. Se
 *  elige la receta que tenga MAS palabras suyas dentro del texto del
 *  pedido; con menos de 2 no se arriesga, mejor no costear que costear mal. */
export function prendaDePedido(recetas, tipoPrenda) {
  if (!tipoPrenda) return null;
  const txt = String(tipoPrenda).toUpperCase();
  let mejor = null, mejorN = 0;
  for (const nombre of new Set(recetas.map(r => r.prenda))) {
    const palabras = nombre.toUpperCase().split(/\s+/).filter(p => p.length > 2);
    const n = palabras.filter(p => txt.includes(p)).length;
    if (n > mejorN) { mejorN = n; mejor = nombre; }
  }
  return mejorN >= 2 ? mejor : null;
}

/**
 * Costo esperado de `unidades` prendas segun receta.
 * `costosBase` es la lista de taller_costos_base, para los insumos cuya
 * receta no trae `costoUnit` propio.
 */
export function costoEsperado(recetas, prenda, unidades, costosBase = [], talla = null) {
  const filas = recetaDe(recetas, prenda, talla);
  if (!filas.length || !(unidades > 0)) return null;

  const detalle = [];
  let total = 0;
  let incompleto = false;
  for (const r of filas) {
    let precio = r.costoUnit;
    if (precio == null) {
      const base = costosBase.find(
        c => String(c.nombre).trim().toUpperCase() === r.insumo.trim().toUpperCase()
      );
      precio = base ? parseFloat(base.costo) : null;
    }
    if (precio == null) { incompleto = true; continue; }
    const cant = r.cantidad * (1 + r.mermaPct / 100) * unidades;
    const sub = cant * precio;
    total += sub;
    detalle.push({ insumo: r.insumo, cantidad: cant, unidad: r.unidad, precio, subtotal: sub });
  }
  if (!detalle.length) return null;
  // `incompleto` avisa que algun insumo de la receta se quedo sin precio,
  // asi la UI no presenta un total corto como si fuera completo.
  return { total, detalle, unidades, incompleto };
}
