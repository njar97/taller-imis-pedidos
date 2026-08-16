// Dibuja el desglose de tallas en la forma que el pedido pida — ver
// lib/desglose.js, que es quien decide. Cuatro formas, un solo dato:
//   linea   un solo item -> un renglon
//   tira    solo tallas, mismo precio -> talla·cantidad en un renglon
//   cuadro  talla x color (o x tipo) -> tabla con totales
//   tabla   cada linea con su precio -> articulo / cant / c/u / subtotal
//
// El precio se decide APARTE de la forma: si es el mismo en todo el pedido va
// UNA vez arriba ("todo a $5.50 c/u"); si varia, la tabla le da su columna.
// Eso solo borra las 25 repeticiones de "$5.50 c/u" del pedido 38.
import { useState } from "react";
import { analizarDesglose } from "./lib/desglose.js";
import { TallasChips } from "./SelectorTallas.jsx";

const fmt = n => "$" + (Math.round(n * 100) / 100).toFixed(2);

const S = {
  cab: { fontSize: 12, color: "#555", display: "flex", gap: 10, flexWrap: "wrap",
         alignItems: "baseline", marginBottom: 6 },
  tot: { fontWeight: 800, color: "#2C1654" },
  precio: { color: "#27AE60", fontWeight: 700 },
  chip: { display: "inline-flex", alignItems: "center", gap: 4, border: "1.5px solid #fde0b8",
          borderRadius: 8, overflow: "hidden", background: "#fff", fontSize: 12 },
  chipT: { background: "#E67E22", color: "#fff", padding: "3px 8px", fontWeight: 900 },
  chipQ: { padding: "3px 8px 3px 4px", fontWeight: 700, color: "#2C1654" },
  th: { padding: "4px 8px", fontSize: 10, fontWeight: 800, color: "#8a5c22",
        textTransform: "uppercase", textAlign: "right", whiteSpace: "nowrap" },
  td: { padding: "4px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" },
  notas: { fontSize: 11, color: "#8a6d3b", fontStyle: "italic", marginTop: 6 },
  alt: { fontSize: 10, color: "#999", cursor: "pointer", textDecoration: "underline",
         background: "none", border: "none", padding: 0, marginTop: 6 },
};

export function DesgloseTallas({ items }) {
  // por si en algun pedido la forma elegida no calza: un toque y vuelven
  // las tarjetas de siempre
  const [clasico, setClasico] = useState(false);
  if (!items || !items.length) return null;
  const d = analizarDesglose(items);

  if (clasico) return (
    <div>
      <TallasChips items={items} compact={false} />
      <button style={S.alt} onClick={() => setClasico(false)}>ver compacto</button>
    </div>
  );

  const cabecera = (
    <div style={S.cab}>
      <span style={S.tot}>{d.totalQty} prenda{d.totalQty !== 1 ? "s" : ""}</span>
      {d.precioUnico != null && (
        <span style={S.precio}>todo a {fmt(d.precioUnico)} c/u</span>
      )}
      {d.totalMonto != null && <span style={{ color: "#777" }}>= {fmt(d.totalMonto)}</span>}
    </div>
  );

  let cuerpo = null;

  if (d.forma === "linea") {
    const it = d.items[0] || {};
    cuerpo = (
      <div style={{ fontSize: 13, color: "#2C1654", fontWeight: 600 }}>
        {[it.tipo, it.talla && `talla ${it.talla}`, it.spec]
          .filter(Boolean).join(" · ") || "1 item"}
      </div>
    );
  }

  if (d.forma === "tira") {
    cuerpo = (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {d.filas.map(f => (
          <span key={f.talla} style={S.chip}>
            <span style={S.chipT}>{f.talla}</span>
            <span style={S.chipQ}>{f.qty}</span>
          </span>
        ))}
      </div>
    );
  }

  if (d.forma === "cuadro") {
    cuerpo = (
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#FFF6EA" }}>
              <th style={{ ...S.th, textAlign: "left" }}>Talla</th>
              {d.columnas.map(c => <th key={c} style={S.th}>{c}</th>)}
              <th style={S.th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {d.filas.map((f, i) => (
              <tr key={f.talla} style={{ background: i % 2 ? "#FFFBF6" : "#fff" }}>
                <td style={{ ...S.td, textAlign: "left", fontWeight: 900, color: "#E67E22" }}>{f.talla}</td>
                {f.celdas.map((n, j) => (
                  <td key={j} style={{ ...S.td, color: n ? "#2C1654" : "#ddd", fontWeight: n ? 700 : 400 }}>
                    {n || "·"}
                  </td>
                ))}
                <td style={{ ...S.td, fontWeight: 800, color: "#2C1654", borderLeft: "1px solid #fde0b8" }}>{f.total}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "1.5px solid #fde0b8" }}>
              <td style={{ ...S.td, textAlign: "left", fontWeight: 800, color: "#8a5c22" }}>Total</td>
              {d.columnas.map((c, j) => (
                <td key={c} style={{ ...S.td, fontWeight: 800, color: "#8a5c22" }}>
                  {d.filas.reduce((s, f) => s + f.celdas[j], 0)}
                </td>
              ))}
              <td style={{ ...S.td, fontWeight: 900, color: "#2C1654", borderLeft: "1px solid #fde0b8" }}>{d.totalQty}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (d.forma === "tabla") {
    cuerpo = (
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
          <thead>
            <tr style={{ background: "#FFF6EA" }}>
              <th style={{ ...S.th, textAlign: "left" }}>Artículo</th>
              <th style={S.th}>Cant</th>
              <th style={S.th}>C/U</th>
              <th style={S.th}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {d.filas.map((f, i) => (
              <tr key={i} style={{ background: i % 2 ? "#FFFBF6" : "#fff" }}>
                <td style={{ ...S.td, textAlign: "left", color: "#2C1654", fontWeight: 600 }}>{f.nombre}</td>
                <td style={S.td}>{f.qty}</td>
                <td style={S.td}>{f.precio != null ? fmt(f.precio) : "—"}</td>
                <td style={{ ...S.td, fontWeight: 700, color: "#27AE60" }}>
                  {f.subtotal != null ? fmt(f.subtotal) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {cabecera}
      {cuerpo}
      {/* las variantes del spec ("cuello V", "M para niño") no caben en el
          cuadro sin ensancharlo: van anotadas, que es como las lee el taller */}
      {d.notas.length > 0 && (d.forma === "cuadro" || d.forma === "tira") && (
        <div style={S.notas}>{d.notas.join(" · ")}</div>
      )}
      {d.forma !== "linea" && (
        <button style={S.alt} onClick={() => setClasico(true)}>ver tarjetas</button>
      )}
    </div>
  );
}
