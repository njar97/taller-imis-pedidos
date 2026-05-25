// Sección 📅 Calendario — vista mensual de todas las entregas
// (pedidos + bordados + cuellos). Cada día muestra una pila de chips
// con los items que tienen fechaEntrega ese día. Click en un chip
// abre el detalle del pedido.

import { useMemo, useState, useEffect } from "react";
import { EC, BORD_EC, CUEL_EC } from "./lib/constants.js";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const todayStr = () => new Date().toISOString().split("T")[0];

export default function SeccionCalendario({ pedidos, bordados, cuellos, onAbrirPedido, onAbrirBordado, onAbrirCuello }) {
  const hoy = todayStr();
  const [base, setBase] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  // Día expandido (cuando tocás "+N más"): mostramos popover con todos los items del día.
  const [diaExpandido, setDiaExpandido] = useState(null);

  // Cerrar el popover con Escape
  useEffect(() => {
    if (!diaExpandido) return;
    const onKey = e => { if (e.key === "Escape") setDiaExpandido(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [diaExpandido]);

  const abrirItem = (it) => {
    if (it._tipo === "ped" && onAbrirPedido) onAbrirPedido(it);
    else if (it._tipo === "bord" && onAbrirBordado) onAbrirBordado(it);
    else if (it._tipo === "cuel" && onAbrirCuello) onAbrirCuello(it);
  };

  // Indexa todos los items por fechaEntrega (YYYY-MM-DD).
  const indice = useMemo(() => {
    const idx = new Map();
    const push = (fecha, item) => {
      if (!fecha) return;
      if (!idx.has(fecha)) idx.set(fecha, []);
      idx.get(fecha).push(item);
    };
    pedidos.filter(p => !p.esCotizacion && !p.deletedAt).forEach(p =>
      push(p.fechaEntrega, { ...p, _tipo: "ped", color: "#9B59B6", colorMap: EC })
    );
    bordados.filter(b => !b.deletedAt).forEach(b =>
      push(b.fechaEntrega, { ...b, _tipo: "bord", color: "#1A5F5A", colorMap: BORD_EC })
    );
    cuellos.filter(c => !c.deletedAt).forEach(c =>
      push(c.fechaEntrega, { ...c, _tipo: "cuel", color: "#B85C00", colorMap: CUEL_EC })
    );
    return idx;
  }, [pedidos, bordados, cuellos]);

  // Construye la grilla del mes: arrays de 7 días desde el domingo.
  const grilla = useMemo(() => {
    const primero = new Date(base.year, base.month, 1);
    const offset = primero.getDay(); // 0=domingo
    const diasMes = new Date(base.year, base.month + 1, 0).getDate();
    const celdas = [];
    for (let i = 0; i < offset; i++) celdas.push(null);
    for (let d = 1; d <= diasMes; d++) {
      celdas.push(new Date(base.year, base.month, d));
    }
    while (celdas.length % 7 !== 0) celdas.push(null);
    const semanas = [];
    for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
    return semanas;
  }, [base]);

  const fmtKey = d => d ? d.toISOString().split("T")[0] : "";
  const cambiarMes = (delta) => {
    setBase(prev => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };
  const irHoy = () => {
    const d = new Date();
    setBase({ year: d.getFullYear(), month: d.getMonth() });
  };

  // Totales del mes
  const totalMes = useMemo(() => {
    const start = `${base.year}-${String(base.month + 1).padStart(2, "0")}-01`;
    const end   = `${base.year}-${String(base.month + 1).padStart(2, "0")}-31`;
    let n = 0;
    for (const [fecha, items] of indice) {
      if (fecha >= start && fecha <= end) n += items.length;
    }
    return n;
  }, [base, indice]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px", minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 16, color: "#2C1654", fontWeight: 800, fontFamily: "Georgia,serif" }}>
            📅 Calendario de entregas
          </h1>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            {totalMes} entrega{totalMes === 1 ? "" : "s"} este mes
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => cambiarMes(-1)} style={navBtn}>‹</button>
          <div style={{ padding: "6px 12px", fontWeight: 800, fontSize: 13, color: "#2C1654", minWidth: 120, textAlign: "center" }}>
            {MESES[base.month]} {base.year}
          </div>
          <button onClick={() => cambiarMes(1)} style={navBtn}>›</button>
          <button onClick={irHoy} style={{ ...navBtn, padding: "6px 10px", fontSize: 11, fontWeight: 700 }}>HOY</button>
        </div>
      </div>

      {/* Encabezado de días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #eee", background: "#fafafa", flexShrink: 0 }}>
        {DIAS.map(d => (
          <div key={d} style={{ padding: "6px 4px", textAlign: "center", fontSize: 10, fontWeight: 800, color: "#888", textTransform: "uppercase", letterSpacing: .5 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grilla */}
      <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {grilla.map((sem, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
              {sem.map((d, j) => {
                if (!d) return <div key={j} style={{ minHeight: 70 }} />;
                const key = fmtKey(d);
                const items = indice.get(key) || [];
                const esHoy = key === hoy;
                const esPasado = key < hoy;
                return (
                  <div
                    key={j}
                    style={{
                      minHeight: 70,
                      minWidth: 0,
                      background: esHoy ? "#FFF3E0" : esPasado ? "#fafafa" : "#fff",
                      border: "1.5px solid " + (esHoy ? "#E67E22" : "#eee"),
                      borderRadius: 6,
                      padding: 4,
                      display: "flex", flexDirection: "column", gap: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: esHoy ? "#E67E22" : esPasado ? "#bbb" : "#444", textAlign: "right", paddingRight: 2 }}>
                      {d.getDate()}
                    </div>
                    {items.slice(0, 3).map((it, k) => (
                      <button
                        key={`${it._tipo}-${it.id}-${k}`}
                        onClick={() => abrirItem(it)}
                        title={`${it.cliente} · ${it.tipoPrenda || it.soporte || it.material || ""} · ${it.estatus || ""}`}
                        style={{
                          width: "100%", maxWidth: "100%", minWidth: 0,
                          padding: "2px 4px", borderRadius: 4, border: "none",
                          background: it.color, color: "#fff",
                          fontSize: 9, fontWeight: 700, fontFamily: "inherit",
                          cursor: "pointer",
                          textAlign: "left",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          display: "block",
                          boxSizing: "border-box",
                        }}
                      >
                        {it._tipo === "ped" ? "📋" : it._tipo === "bord" ? "🪡" : "🧶"} {it.cliente || "—"}
                      </button>
                    ))}
                    {items.length > 3 && (
                      <button
                        onClick={() => setDiaExpandido({ fecha: key, items })}
                        style={{
                          width: "100%", padding: "2px 4px", border: "none",
                          background: "#f0f0f0", color: "#555",
                          fontSize: 9, fontWeight: 700, textAlign: "center",
                          borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        +{items.length - 3} más
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Popover de día expandido */}
      {diaExpandido && (
        <div
          onClick={() => setDiaExpandido(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, width: "100%", maxWidth: 420,
              maxHeight: "85vh", display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 18px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#2C1654", fontFamily: "Georgia,serif" }}>
                  📅 {(() => {
                    const [y, m, d] = diaExpandido.fecha.split("-").map(Number);
                    const fecha = new Date(y, m - 1, d);
                    return fecha.toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long" });
                  })()}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {diaExpandido.items.length} entrega{diaExpandido.items.length === 1 ? "" : "s"}
                </div>
              </div>
              <button
                onClick={() => setDiaExpandido(null)}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}
              >✕</button>
            </div>
            <div style={{ overflow: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {diaExpandido.items.map((it, k) => (
                <button
                  key={`${it._tipo}-${it.id}-${k}`}
                  onClick={() => { abrirItem(it); setDiaExpandido(null); }}
                  style={{
                    padding: "10px 12px", borderRadius: 8, border: "none",
                    background: it.color, color: "#fff",
                    textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {it._tipo === "ped" ? "📋" : it._tipo === "bord" ? "🪡" : "🧶"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {it.cliente || "—"}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
                      {it.tipoPrenda || it.soporte || it.material || ""}
                      {it.estatus ? ` · ${it.estatus}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div style={{ padding: "8px 16px", background: "#fafafa", borderTop: "1px solid #eee", display: "flex", gap: 14, fontSize: 10, color: "#666", flexShrink: 0, flexWrap: "wrap" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#9B59B6", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />📋 Pedido</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#1A5F5A", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />🪡 Bordado</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#B85C00", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />🧶 Cuello</span>
        <span style={{ marginLeft: "auto" }}>📅 Día en naranja = hoy</span>
      </div>
    </div>
  );
}

const navBtn = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1.5px solid #e0e0e0",
  background: "#fff",
  color: "#2C1654",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
};
