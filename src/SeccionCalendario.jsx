// Sección 📅 Calendario — vista mensual de todas las entregas
// (pedidos + bordados + cuellos). Cada día muestra una pila de chips
// con los items que tienen fechaEntrega ese día. Click en un chip
// abre el detalle del pedido.

import { useMemo, useState, useEffect } from "react";
import { EC, BORD_EC, CUEL_EC } from "./lib/constants.js";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const todayStr = () => new Date().toISOString().split("T")[0];

const VISTA_KEY = "TALLER_CALENDARIO_VISTA";

export default function SeccionCalendario({ pedidos, bordados, cuellos, onAbrirPedido, onAbrirBordado, onAbrirCuello }) {
  const hoy = todayStr();
  const [base, setBase] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  // Vista: "grilla" o "lista". Default por device + persistencia.
  const [vista, setVista] = useState(() => {
    try {
      const guardada = localStorage.getItem(VISTA_KEY);
      if (guardada === "grilla" || guardada === "lista") return guardada;
    } catch {}
    return (typeof window !== "undefined" && window.innerWidth < 700) ? "lista" : "grilla";
  });
  const cambiarVista = (v) => {
    setVista(v);
    try { localStorage.setItem(VISTA_KEY, v); } catch {}
  };
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
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <button onClick={() => cambiarMes(-1)} style={navBtn}>‹</button>
          <div style={{ padding: "6px 12px", fontWeight: 800, fontSize: 13, color: "#2C1654", minWidth: 120, textAlign: "center" }}>
            {MESES[base.month]} {base.year}
          </div>
          <button onClick={() => cambiarMes(1)} style={navBtn}>›</button>
          <button onClick={irHoy} style={{ ...navBtn, padding: "6px 10px", fontSize: 11, fontWeight: 700 }}>HOY</button>
          <div style={{ display: "flex", marginLeft: 6, border: "1.5px solid #e0e0e0", borderRadius: 6, overflow: "hidden" }}>
            <button
              onClick={() => cambiarVista("grilla")}
              title="Vista grilla mensual"
              style={{
                padding: "6px 10px", border: "none", fontFamily: "inherit",
                background: vista === "grilla" ? "#2C1654" : "#fff",
                color: vista === "grilla" ? "#fff" : "#666",
                cursor: "pointer", fontSize: 12, fontWeight: 700,
              }}
            >🗓️</button>
            <button
              onClick={() => cambiarVista("lista")}
              title="Vista lista cronológica"
              style={{
                padding: "6px 10px", border: "none", fontFamily: "inherit",
                background: vista === "lista" ? "#2C1654" : "#fff",
                color: vista === "lista" ? "#fff" : "#666",
                cursor: "pointer", fontSize: 12, fontWeight: 700,
              }}
            >📋</button>
          </div>
        </div>
      </div>

      {/* Encabezado de días — solo en grilla */}
      {vista === "grilla" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #eee", background: "#fafafa", flexShrink: 0 }}>
          {DIAS.map(d => (
            <div key={d} style={{ padding: "6px 4px", textAlign: "center", fontSize: 10, fontWeight: 800, color: "#888", textTransform: "uppercase", letterSpacing: .5 }}>
              {d}
            </div>
          ))}
        </div>
      )}

      {/* Grilla */}
      {vista === "grilla" && (
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
      )}

      {/* Lista */}
      {vista === "lista" && (
        <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {(() => {
            // Días del mes con items, ordenados ascendente
            const start = `${base.year}-${String(base.month + 1).padStart(2, "0")}-01`;
            const lastDay = new Date(base.year, base.month + 1, 0).getDate();
            const end = `${base.year}-${String(base.month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
            const fechas = [];
            for (const [fecha, items] of indice) {
              if (fecha >= start && fecha <= end) {
                fechas.push({ fecha, items: [...items].sort((a, b) => (a.cliente || "").localeCompare(b.cliente || "")) });
              }
            }
            fechas.sort((a, b) => a.fecha.localeCompare(b.fecha));

            if (fechas.length === 0) {
              return (
                <div style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 13 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
                  No hay entregas programadas en {MESES[base.month]} {base.year}
                </div>
              );
            }

            return fechas.map(({ fecha, items }) => {
              const [y, m, d] = fecha.split("-").map(Number);
              const fechaObj = new Date(y, m - 1, d);
              const diaSemana = fechaObj.toLocaleDateString("es-SV", { weekday: "long" });
              const esHoy = fecha === hoy;
              const esPasado = fecha < hoy;

              return (
                <div
                  key={fecha}
                  style={{
                    background: "#fff",
                    border: "1.5px solid " + (esHoy ? "#E67E22" : "#eee"),
                    borderRadius: 10,
                    marginBottom: 10,
                    overflow: "hidden",
                    opacity: esPasado ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    padding: "10px 14px",
                    background: esHoy ? "#FFF3E0" : "#fafafa",
                    borderBottom: "1px solid #eee",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: esHoy ? "#E67E22" : "#888", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>
                        {esHoy ? "HOY · " : ""}{diaSemana}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: esHoy ? "#E67E22" : "#2C1654", fontFamily: "Georgia,serif" }}>
                        {d} de {MESES[m - 1]}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 800, color: "#666",
                      background: "#fff", border: "1px solid #ddd",
                      padding: "3px 9px", borderRadius: 12,
                    }}>
                      {items.length} entrega{items.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {items.map((it, k) => (
                      <button
                        key={`${it._tipo}-${it.id}-${k}`}
                        onClick={() => abrirItem(it)}
                        style={{
                          padding: "12px 14px", border: "none",
                          borderBottom: k < items.length - 1 ? "1px solid #f5f5f5" : "none",
                          background: "#fff", cursor: "pointer", fontFamily: "inherit",
                          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: it.color, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, flexShrink: 0,
                        }}>
                          {it._tipo === "ped" ? "📋" : it._tipo === "bord" ? "🪡" : "🧶"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#2C1654", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {it.cliente || "—"}
                          </div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {it.tipoPrenda || it.soporte || it.material || "(sin detalle)"}
                          </div>
                        </div>
                        {it.estatus && (() => {
                          const cs = (it.colorMap || {})[it.estatus] || {};
                          return (
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              padding: "3px 8px", borderRadius: 10,
                              background: cs.bg || "#eee", color: cs.fg || "#666",
                              whiteSpace: "nowrap", flexShrink: 0,
                            }}>{it.estatus}</span>
                          );
                        })()}
                      </button>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

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
