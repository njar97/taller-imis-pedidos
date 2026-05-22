// 📋 Resumen por talla — vista de planificación de producción.
//
// Por cada talla (filtrable por tipo de prenda) muestra:
//   Demanda total · En corte · En producción · Listo · Stock libre · Faltante
//
// Click en una fila la expande mostrando los clientes que esperan esa
// talla. Botón '+ Stock libre' para registrar piezas que cortaste sin
// pedido (lote, bodega independiente).
//
// "Stock libre" es lo guardado en taller_stock_prendas (independiente
// de pedidos). "Listo" son piezas dentro de un pedido con estatus
// "Listo" — ya tienen destino pero no se entregaron.

import { useEffect, useMemo, useState } from "react";
import { itemsResumen } from "./lib/dominio.js";
import { leerStock, agregarStock, borrarStock } from "./lib/stockPrendas.js";
import { pushConfirm, pushToast } from "./lib/feedback.js";

const RANK = { XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, "3XL": 7 };
const rankTalla = t => {
  if (!t) return 99999;
  if (RANK[t]) return RANK[t];
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? 1000 + n : 9999;
};

export default function SeccionResumenTallas({ pedidos, onAbrirPedido }) {
  const [stock, setStock] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [expandida, setExpandida] = useState(null); // talla expandida
  const [modalStock, setModalStock] = useState(false);

  const cargarStock = async () => {
    const rows = await leerStock();
    setStock(rows);
  };
  useEffect(() => { cargarStock(); }, []);

  // Acumula items de pedidos activos (no entregados, no cotización, no borrados)
  // agrupados por tipo+talla. Para cada combinación cuenta:
  //   - demanda total (suma de qty)
  //   - cuántos hay en cada estatus (corte, producción, listo)
  //   - qué pedidos contribuyen (para expandir y ver clientes)
  const datos = useMemo(() => {
    const mapa = new Map(); // key=tipo|talla → { tipo, talla, total, corte, produccion, listo, pedidos:[] }
    const ensure = (tipo, talla) => {
      const k = `${tipo}|${talla}`;
      if (!mapa.has(k)) {
        mapa.set(k, { tipo, talla, total: 0, corte: 0, produccion: 0, listo: 0, pedidos: [] });
      }
      return mapa.get(k);
    };

    for (const p of pedidos) {
      if (p.esCotizacion || p.deletedAt) continue;
      if (p.estatus === "Entregado") continue;
      const items = itemsResumen(p);
      for (const it of items) {
        const tipo = (it.tipo || "").trim();
        const talla = (it.talla || "").trim();
        if (!tipo && !talla) continue;
        const grupo = ensure(tipo || "(sin tipo)", talla || "(sin talla)");
        const qty = parseInt(it.qty) || 0;
        grupo.total += qty;
        if (p.estatus === "Corte") grupo.corte += qty;
        else if (p.estatus === "Producción") grupo.produccion += qty;
        else if (p.estatus === "Listo") grupo.listo += qty;
        grupo.pedidos.push({ pedido: p, tipo, talla, qty, spec: it.spec || "" });
      }
    }

    // Cruzar con stock libre
    for (const s of stock) {
      const grupo = ensure((s.tipo || "(sin tipo)").trim(), (s.talla || "(sin talla)").trim());
      grupo.stockLibre = (grupo.stockLibre || 0) + (parseInt(s.qty) || 0);
      grupo.stockRows = [...(grupo.stockRows || []), s];
    }

    // Asegurar campo stockLibre en grupos que no lo tengan
    for (const g of mapa.values()) {
      if (g.stockLibre == null) g.stockLibre = 0;
      if (g.stockRows == null) g.stockRows = [];
    }

    return [...mapa.values()].sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
      return rankTalla(a.talla) - rankTalla(b.talla);
    });
  }, [pedidos, stock]);

  const tipos = useMemo(() => {
    const set = new Set(datos.map(d => d.tipo));
    return [...set].sort();
  }, [datos]);

  const filtrados = filtroTipo
    ? datos.filter(d => d.tipo === filtroTipo)
    : datos;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px", minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 16, color: "#2C1654", fontWeight: 800, fontFamily: "Georgia,serif" }}>
            📋 Resumen por talla
          </h1>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            Demanda vs disponible · {filtrados.length} talla{filtrados.length === 1 ? "" : "s"}
          </div>
        </div>
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13, fontFamily: "inherit", outline: "none" }}
        >
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={() => setModalStock(true)}
          style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#27AE60", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", fontFamily: "inherit" }}
        >
          + Stock libre
        </button>
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
        {filtrados.length === 0 ? (
          <Vacio />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "inherit" }}>
            <thead>
              <tr style={{ background: "#2C1654", color: "#fff" }}>
                <th style={th}></th>
                <th style={{ ...th, textAlign: "left" }}>Tipo</th>
                <th style={{ ...th, textAlign: "center", width: 50 }}>Talla</th>
                <th style={{ ...th, textAlign: "center", width: 60 }} title="Demanda total">📋 Dem.</th>
                <th style={{ ...th, textAlign: "center", width: 60 }} title="En corte">✂️ Cor.</th>
                <th style={{ ...th, textAlign: "center", width: 60 }} title="En producción">🧵 Prod.</th>
                <th style={{ ...th, textAlign: "center", width: 60 }} title="Pedidos en Listo">✅ List.</th>
                <th style={{ ...th, textAlign: "center", width: 60 }} title="Stock libre (sin pedido)">📦 Stock</th>
                <th style={{ ...th, textAlign: "center", width: 70 }} title="Faltante por hacer (demanda - lo que ya existe)">⚠️ Falta</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(g => {
                const existente = g.corte + g.produccion + g.listo + g.stockLibre;
                const faltante = Math.max(0, g.total - existente);
                const sobra = existente > g.total ? existente - g.total : 0;
                const k = `${g.tipo}|${g.talla}`;
                const abierto = expandida === k;
                return (
                  <Fila
                    key={k}
                    g={g}
                    abierto={abierto}
                    onToggle={() => setExpandida(abierto ? null : k)}
                    faltante={faltante}
                    sobra={sobra}
                    onAbrirPedido={onAbrirPedido}
                    onBorrarStock={async (id) => {
                      const ok = await pushConfirm({ titulo: "Eliminar entrada de stock", msg: "¿Eliminar esta entrada del stock libre?", okLabel: "Eliminar", danger: true });
                      if (!ok) return;
                      await borrarStock(id);
                      await cargarStock();
                      pushToast("Stock eliminado", "success");
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalStock && (
        <ModalAgregarStock
          tipos={tipos}
          onCancel={() => setModalStock(false)}
          onSave={async (data) => {
            const ok = await agregarStock(data);
            if (ok) {
              pushToast(`+${data.qty} ${data.tipo} ${data.talla || ""} agregados al stock`, "success");
              await cargarStock();
              setModalStock(false);
            } else {
              pushToast("No pude guardar", "error");
            }
          }}
        />
      )}
    </div>
  );
}

const th = { padding: "8px 6px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: .3 };
const td = { padding: "8px 6px", borderBottom: "1px solid #f5f5f5" };

function Fila({ g, abierto, onToggle, faltante, sobra, onAbrirPedido, onBorrarStock }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: "pointer", background: abierto ? "#FAFAFA" : "#fff" }}>
        <td style={{ ...td, width: 24, color: "#aaa", textAlign: "center" }}>{abierto ? "▼" : "▶"}</td>
        <td style={{ ...td, fontWeight: 700, color: "#2C1654" }}>{g.tipo}</td>
        <td style={{ ...td, textAlign: "center", fontWeight: 900, color: "#E67E22" }}>{g.talla}</td>
        <td style={{ ...td, textAlign: "center", fontWeight: 800 }}>{g.total}</td>
        <td style={{ ...td, textAlign: "center", color: g.corte > 0 ? "#795548" : "#ccc" }}>{g.corte || "—"}</td>
        <td style={{ ...td, textAlign: "center", color: g.produccion > 0 ? "#004085" : "#ccc" }}>{g.produccion || "—"}</td>
        <td style={{ ...td, textAlign: "center", color: g.listo > 0 ? "#155724" : "#ccc" }}>{g.listo || "—"}</td>
        <td style={{ ...td, textAlign: "center", color: g.stockLibre > 0 ? "#27AE60" : "#ccc", fontWeight: g.stockLibre > 0 ? 700 : 400 }}>{g.stockLibre || "—"}</td>
        <td style={{ ...td, textAlign: "center", fontWeight: 800, color: faltante > 0 ? "#E74C3C" : sobra > 0 ? "#27AE60" : "#aaa" }}>
          {faltante > 0 ? faltante : sobra > 0 ? `+${sobra}` : "✓"}
        </td>
      </tr>
      {abierto && (
        <tr style={{ background: "#FAFAFA" }}>
          <td colSpan="9" style={{ padding: "8px 14px" }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>
                👥 Pedidos que esperan esta talla ({g.pedidos.length})
              </div>
              {g.pedidos.length === 0 ? (
                <div style={{ fontSize: 11, color: "#aaa", fontStyle: "italic" }}>Sin demanda pendiente</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {g.pedidos.map((row, i) => (
                    <button
                      key={i}
                      onClick={() => onAbrirPedido && onAbrirPedido(row.pedido)}
                      style={{
                        background: "#fff", border: "1px solid #eee", borderRadius: 6,
                        padding: "5px 10px", cursor: "pointer", fontFamily: "inherit",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        fontSize: 11, textAlign: "left",
                      }}
                    >
                      <span>
                        <strong style={{ color: "#9B59B6", marginRight: 6 }}>N°{String(row.pedido.id).padStart(4, "0")}</strong>
                        {row.pedido.tipoCliente === "escuela" ? "🏫 " : row.pedido.tipoCliente === "empresa" ? "🏢 " : ""}
                        <strong>{row.pedido.cliente}</strong>
                        {row.spec && <span style={{ color: "#888" }}> · {row.spec}</span>}
                      </span>
                      <span style={{ color: "#E67E22", fontWeight: 800 }}>
                        {row.qty}× · {row.pedido.estatus}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {g.stockRows.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#27AE60", textTransform: "uppercase", marginBottom: 4 }}>
                  📦 Stock libre ({g.stockLibre} pzas)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {g.stockRows.map(s => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#E8F5E9", border: "1px solid #C8E6C9", borderRadius: 6, padding: "5px 10px", fontSize: 11 }}>
                      <span>
                        <strong style={{ color: "#155724" }}>{s.qty}× {s.tipo} {s.talla}</strong>
                        {s.notas && <span style={{ color: "#666" }}> — {s.notas}</span>}
                        <span style={{ color: "#888" }}> · {s.fecha}</span>
                      </span>
                      <button
                        onClick={() => onBorrarStock(s.id)}
                        style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 14 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function ModalAgregarStock({ tipos, onSave, onCancel }) {
  const [tipo, setTipo] = useState(tipos[0] || "");
  const [talla, setTalla] = useState("");
  const [qty, setQty] = useState("1");
  const [notas, setNotas] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 18, width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#2C1654", fontFamily: "Georgia,serif" }}>📦 Agregar stock libre</h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
          Piezas que cortaste/preparaste sin estar atadas a un pedido. Se cuentan en la fila correspondiente.
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={lbl}>Tipo de prenda</label>
          <input style={inp} value={tipo} onChange={e => setTipo(e.target.value)} list="tipos-stock" placeholder="Camisa, Pantalón, etc." />
          <datalist id="tipos-stock">
            {tipos.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={lbl}>Talla</label>
            <input style={inp} value={talla} onChange={e => setTalla(e.target.value)} placeholder="M, L, 32..." />
          </div>
          <div>
            <label style={lbl}>Cantidad</label>
            <input type="number" min="1" style={inp} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Notas (opcional)</label>
          <input style={inp} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej: lote azul, tela X..." />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 16px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave({ tipo: tipo.trim(), talla: talla.trim(), qty: parseInt(qty) || 0, notas: notas.trim() })}
            disabled={!tipo.trim() || (parseInt(qty) || 0) <= 0}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#27AE60", color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#FAFAFA" };
const lbl = { fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 2, display: "block", textTransform: "uppercase", letterSpacing: .4 };

function Vacio() {
  return (
    <div style={{ textAlign: "center", padding: 50, color: "#bbb" }}>
      <div style={{ fontSize: 44, marginBottom: 8 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#aaa" }}>Sin demanda pendiente</div>
      <div style={{ fontSize: 11, marginTop: 4 }}>
        Cuando haya pedidos activos con tipos y tallas, aparecerán acá agrupados.
      </div>
    </div>
  );
}
