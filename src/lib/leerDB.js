// Lee facturas DTE desde un archivo SQLite (.db) usando sql.js cargado por CDN.
// Devuelve la lista de ítems con id, fecha, proveedor, descripción, cantidad, etc.

import { SQL_JS, SQL_WASM } from "./constants.js";

export async function leerDB(file) {
  if (!window.initSqlJs) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = SQL_JS;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const SQL = await window.initSqlJs({ locateFile: () => SQL_WASM });
  const buf = await file.arrayBuffer();
  const db = new SQL.Database(new Uint8Array(buf));
  const rows = db.exec(
    "SELECT d.id AS doc_id,d.fecha_emision AS fecha,d.emisor_nombre AS proveedor," +
    "i.id AS item_id,i.numero_item,i.descripcion,i.cantidad,i.unidad_medida AS unidad," +
    "i.precio_unitario," +
    "(COALESCE(i.venta_gravada,0)+COALESCE(i.venta_exenta,0)+COALESCE(i.venta_no_sujeta,0)) AS total_item " +
    "FROM documentos d JOIN items_documento i ON i.documento_id=d.id " +
    "WHERE d.rol='RECIBIDA' AND d.estado='ACTIVO' " +
    "ORDER BY d.fecha_emision DESC,d.id,i.numero_item"
  );
  db.close();
  if (!rows.length || !rows[0].values.length) return [];
  const cols = rows[0].columns;
  return rows[0].values.map(row => {
    const r = {};
    cols.forEach((c, i) => (r[c] = row[i]));
    return {
      id: `${r.doc_id}-${r.numero_item}`,
      doc_id: r.doc_id,
      fecha: r.fecha || "",
      proveedor: r.proveedor || "Desconocido",
      descripcion: r.descripcion || "(sin descripción)",
      cantidad: parseFloat(r.cantidad || 0),
      unidad: r.unidad || "",
      precio_unitario: parseFloat(r.precio_unitario || 0),
      total: parseFloat(r.total_item || 0),
    };
  });
}
