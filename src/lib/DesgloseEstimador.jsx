// Componente compartido: muestra el desglose del estimador de precio
// guardado en el campo desglose_estimador de un pedido/cotización.
// Soporta el formato nuevo (bordados: []) y el antiguo (bordActivo/bordPunt).
// onEdit (opcional): se llama al hacer clic en el texto del resumen (no en la flecha).

import { useState } from "react";

const numb = v => parseFloat(v) || 0;
const fmt = v => "$" + numb(v).toFixed(2);

function costoBordado(punt) {
  const n = parseInt(String(punt || "").replace(/[^0-9]/g, "")) || 0;
  return n > 0 ? (n / 600) * (3.0 / 60) : 0;
}

function costoItem(it) {
  const tela = numb(it.telaCostoYd) * numb(it.yardasPorPrenda) * numb(it.qty);
  const modoMO = it.moModo === "prenda" || it.moModo === "hechura" ? "hechura" : "tiempo";
  const mo = modoMO === "hechura"
    ? numb(it.moCostoUnit) * numb(it.qty)
    : numb(it.moCostoUnit) * numb(it.moHoras);
  // Soporta formato nuevo (bordados: []) y viejo (bordActivo/bordPunt)
  const bordados = Array.isArray(it.bordados) && it.bordados.length
    ? it.bordados
    : (it.bordActivo && it.bordPunt) ? [{ puntadas: it.bordPunt }] : [];
  const bord = bordados.reduce((s, b) => s + costoBordado(b.puntadas), 0) * numb(it.qty);
  const otros = (it.otros || []).reduce((s, o) => s + numb(o.qty) * numb(o.costo), 0);
  return { tela, mo, bord, otros, total: tela + mo + bord + otros, bordados };
}

export default function DesgloseEstimador({ desglose, onEdit }) {
  const [open, setOpen] = useState(false);
  if (!desglose?.modo) return null;

  return (
    <div style={{
      marginTop: 10, marginBottom: 8,
      background: "#FFFBF6", border: "1.5px dashed #E67E22",
      borderRadius: 10, padding: "10px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? "Colapsar" : "Expandir"}
          style={{
            background: "none", border: "none", padding: "0 2px",
            cursor: "pointer", fontSize: 12, color: "#E67E22", flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {open ? "▼" : "▶"}
        </button>
        <span
          onClick={onEdit}
          style={{
            cursor: onEdit ? "pointer" : "default",
            fontSize: 11, fontWeight: 800, color: "#E67E22",
            textTransform: "uppercase", letterSpacing: .5,
            flex: 1,
          }}
          title={onEdit ? "Abrir en el estimador para editar" : undefined}
        >
          🔍 Desglose del estimador (cómo se calculó el precio)
          {onEdit && <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, opacity: .7 }}>— toca para editar</span>}
        </span>
      </div>
      {open && <div style={{ marginTop: 10, fontSize: 11, color: "#555" }}>
        <div style={{ marginBottom: 6 }}>
          <strong>Modo:</strong> {desglose.modo} · <strong>Margen aplicado:</strong> {desglose.margen}%
        </div>

        {desglose.modo === "confeccion" && Array.isArray(desglose.items) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {desglose.items.map((it, i) => {
              const c = costoItem(it);
              const qty = numb(it.qty) || 1;
              const precioTotalItem = c.total * (1 + desglose.margen / 100);
              return (
                <div key={i} style={{ background: "#fff", border: "1px solid #fde0b8", borderRadius: 6, padding: 8 }}>
                  <div style={{ fontWeight: 800, color: "#2C1654", marginBottom: 4 }}>
                    {i + 1}. {it.tipoPrenda || "(sin tipo)"} × {it.qty}
                    {it.descripcion && <span style={{ fontWeight: 400, color: "#888", marginLeft: 6 }}>— {it.descripcion}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6 }}>
                    {numb(it.telaCostoYd) > 0 && (
                      <div>🧵 Tela <strong>{it.telaNombre || "—"}</strong>: ${numb(it.telaCostoYd)}/yd × {it.yardasPorPrenda} yd × {it.qty} = <strong>{fmt(c.tela)}</strong></div>
                    )}
                    {numb(it.moCostoUnit) > 0 && (
                      <div>✂️ MO ({it.moModo === "tiempo" || it.moModo === "hora" ? "por tiempo" : "hechura"}): ${numb(it.moCostoUnit)} × {it.moModo === "tiempo" || it.moModo === "hora" ? `${it.moHoras} h` : `${it.qty} pza`} = <strong>{fmt(c.mo)}</strong></div>
                    )}
                    {c.bordados.length > 0 && (
                      <div>🪡 Bordados: {c.bordados.map(b => b.nombre ? `${b.nombre} (${b.puntadas || 0} punt)` : `${b.puntadas || 0} punt`).join(", ")} × {it.qty} pza = <strong>{fmt(c.bord)}</strong></div>
                    )}
                    {(it.otros || []).length > 0 && (
                      <div>➕ Otros: {it.otros.map(o => `${o.qty}× ${o.nombre} $${o.costo}`).join(", ")} = <strong>{fmt(c.otros)}</strong></div>
                    )}
                    <div style={{
                      marginTop: 6, paddingTop: 6,
                      borderTop: "1px dashed #fde0b8",
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11,
                    }}>
                      <div style={{ color: "#E67E22" }}>Costo unit: <strong>{fmt(c.total / qty)}</strong></div>
                      <div style={{ color: "#E67E22", textAlign: "right" }}>Costo total: <strong>{fmt(c.total)}</strong></div>
                      <div style={{ color: "#27AE60" }}>Precio unit: <strong>{fmt(precioTotalItem / qty)}</strong></div>
                      <div style={{ color: "#27AE60", textAlign: "right" }}>Precio ({desglose.margen}%): <strong>{fmt(precioTotalItem)}</strong></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(desglose.modo === "bordado" || desglose.modo === "cuello") && desglose.datos && (
          <pre style={{ background: "#fff", padding: 8, borderRadius: 6, fontSize: 10, overflow: "auto", color: "#444" }}>
{JSON.stringify(desglose.datos, null, 2)}
          </pre>
        )}
      </div>}
    </div>
  );
}
