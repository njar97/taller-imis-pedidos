// Pantalla home del admin: KPIs financieros, tendencia mensual, top clientes,
// flujo proyectado y pipeline de estatus.
//
// Decompilado a JSX legible. Antes: 640 líneas de React.createElement en main.js.

import { EC, BORD_EC, CUEL_EC } from "./lib/constants.js";

import { useState } from "react";

const COLORS = {
  Confección: "#9B59B6",
  Bordados:   "#1A5F5A",
  Cuellos:    "#B85C00",
};

const fmtM = n => "$" + parseFloat(n || 0).toLocaleString("es-SV", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pM = v => {
  const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};

function calcular(pedidos, bordados, cuellos, periodo) {
  const ahora = new Date();

  const desde = (() => {
    const d = new Date();
    if (periodo === "mes")        { d.setDate(1); }
    else if (periodo === "trimestre") { d.setMonth(d.getMonth() - 2); d.setDate(1); }
    else if (periodo === "año")   { d.setMonth(0); d.setDate(1); }
    else return null;
    return d.toISOString().split("T")[0];
  })();

  const cobradoConf = p => (p.abonos || []).length > 0
    ? (p.abonos || []).reduce((s, a) => s + pM(a.monto), 0)
    : pM(p.anticipo);

  const todos = [
    // Las cotizaciones (esCotizacion) son propuestas, NO ventas — se excluyen
    // de toda la estadística (facturado, cobrado, pendiente, pipeline).
    ...pedidos.filter(p => !p.esCotizacion).map(p => ({ ...p, modulo: "Confección", monto: pM(p.precio),    cobrado: cobradoConf(p) })),
    ...bordados.map(b => ({ ...b, modulo: "Bordados",   monto: pM(b.precioT),  cobrado: (b.abonos || []).length > 0 ? b.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(b.anticipo) })),
    ...cuellos.map(c =>  ({ ...c, modulo: "Cuellos",    monto: pM(c.precioT),  cobrado: (c.abonos || []).length > 0 ? c.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(c.anticipo) })),
  ];

  const enPeriodo = todos.filter(p => {
    if (!desde) return true;
    const f = (p.fecha || "").trim() || (p.fechaEntrega || "").trim();
    if (!f) return true;
    return f >= desde;
  });

  const noCancel = enPeriodo.filter(p => p.estatus !== "Cancelado");

  const totalFacturado  = noCancel.reduce((s, p) => s + p.monto, 0);
  const totalCobrado    = noCancel.reduce((s, p) => s + p.cobrado, 0);
  const totalPendiente  = noCancel.reduce((s, p) => s + Math.max(0, p.monto - p.cobrado), 0);
  const activosN        = noCancel.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).length;
  const entregadosN     = noCancel.filter(p => p.estatus === "Entregado").length;

  const porModulo = ["Confección", "Bordados", "Cuellos"].map(mod => {
    const lst = noCancel.filter(p => p.modulo === mod);
    return {
      mod,
      n: lst.length,
      monto:   lst.reduce((s, p) => s + p.monto, 0),
      cobrado: lst.reduce((s, p) => s + p.cobrado, 0),
      activos: lst.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).length,
    };
  });

  const mapaClientes = {};
  noCancel.forEach(p => {
    const k = (p.cliente || "Sin nombre").trim();
    if (!mapaClientes[k]) mapaClientes[k] = { nombre: k, n: 0, monto: 0, cobrado: 0 };
    mapaClientes[k].n++;
    mapaClientes[k].monto   += p.monto;
    mapaClientes[k].cobrado += p.cobrado;
  });
  const topClientes = Object.values(mapaClientes).sort((a, b) => b.monto - a.monto).slice(0, 6);

  const porEstatus = {};
  todos.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).forEach(p => {
    porEstatus[p.estatus] = (porEstatus[p.estatus] || 0) + 1;
  });

  const proxEntregas = todos
    .filter(p => p.fechaEntrega && !["Entregado", "Cancelado"].includes(p.estatus) && p.monto > 0)
    .map(p => ({
      ...p,
      saldo: Math.max(0, p.monto - p.cobrado),
      dias: Math.ceil((new Date(p.fechaEntrega + "T12:00") - ahora) / 86400000),
    }))
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 8);
  const totalFlujoProy = proxEntregas.reduce((s, p) => s + p.saldo, 0);

  const meses = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    const ini = d.toISOString().split("T")[0];
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    const lst = todos.filter(p => {
      if (p.estatus === "Cancelado") return false;
      const f = (p.fecha || "").trim() || (p.fechaEntrega || "").trim();
      return f >= ini && f <= fin;
    });
    meses.push({
      lbl:   d.toLocaleDateString("es-SV", { month: "short", year: "2-digit" }),
      monto: lst.reduce((s, p) => s + p.monto, 0),
      n:     lst.length,
    });
  }
  const maxMonto = Math.max(...meses.map(m => m.monto), 1);

  return {
    totalFacturado, totalCobrado, totalPendiente, activosN, entregadosN,
    porModulo, topClientes, porEstatus, proxEntregas, totalFlujoProy, meses, maxMonto,
  };
}

const PERIODOS = [
  ["mes",       "Este mes"],
  ["trimestre", "3 meses"],
  ["año",       "Este año"],
  ["todo",      "Todo"],
];

const KPI_BOX = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
  gap: 10,
  marginBottom: 16,
};

const CARD = {
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  border: "1.5px solid #f0f0f0",
};

const SECTION_TITLE = {
  fontSize: 12,
  fontWeight: 800,
  color: "#2C1654",
  marginBottom: 12,
};

export default function SeccionEstadisticas({ pedidos, bordados, cuellos, onExportarExcel }) {
  const [periodo, setPeriodo] = useState("mes");

  const {
    totalFacturado, totalCobrado, totalPendiente, activosN, entregadosN,
    porModulo, topClientes, porEstatus, proxEntregas, totalFlujoProy, meses, maxMonto,
  } = calcular(pedidos, bordados, cuellos, periodo);

  const kpis = [
    { icon: "💰", label: "Facturado",  val: fmtM(totalFacturado), color: "#2C1654",                                    bg: "#f0ebff" },
    { icon: "✅", label: "Cobrado",    val: fmtM(totalCobrado),   color: "#155724",                                    bg: "#d4edda" },
    { icon: "⏳", label: "Por cobrar", val: fmtM(totalPendiente), color: totalPendiente > 0 ? "#721C24" : "#155724",   bg: totalPendiente > 0 ? "#f8d7da" : "#d4edda" },
    { icon: "📦", label: "Activos",    val: activosN,             color: "#E67E22",                                    bg: "#fff3e0" },
    { icon: "🎯", label: "Entregados", val: entregadosN,          color: "#1A5276",                                    bg: "#e8f4fd" },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16, background: "#F7F4FA" }} className="main-area">
      {/* Header con filtros de período + botón Excel */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 17, color: "#2C1654", fontWeight: 800, fontFamily: "Georgia,serif" }}>📊 Estadísticas</h1>
          <div style={{ fontSize: 11, color: "#aaa" }}>Resumen financiero y operativo · Taller IMIS</div>
        </div>
        <div style={{ display: "flex", gap: 6, background: "#fff", borderRadius: 10, padding: 4, border: "1.5px solid #e0e0e0" }}>
          {PERIODOS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setPeriodo(v)}
              style={{
                padding: "6px 12px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                background: periodo === v ? "#2C1654" : "transparent",
                color: periodo === v ? "#fff" : "#888",
                transition: "all .15s",
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          onClick={() => onExportarExcel && onExportarExcel(pedidos, bordados, cuellos, periodo)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "#1D6A3A",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          📥 Excel
        </button>
      </div>

      {/* KPIs */}
      <div style={KPI_BOX}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 12, padding: "14px 16px", border: "1.5px solid " + k.color + "22" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: k.color, opacity: 0.7, textTransform: "uppercase", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Fila 1: tendencia mensual + por módulo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="g2">
        <div style={CARD}>
          <div style={{ ...SECTION_TITLE, marginBottom: 14 }}>📈 Tendencia mensual (facturación)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
            {meses.map((m, i) => {
              const pct = maxMonto > 0 ? (m.monto / maxMonto) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: "#2C1654", fontWeight: 700 }}>{m.monto > 0 ? fmtM(m.monto) : ""}</div>
                  <div
                    style={{
                      width: "100%",
                      background: "linear-gradient(180deg,#9B59B6,#2C1654)",
                      borderRadius: "4px 4px 0 0",
                      height: Math.max(pct * 0.7, 4) + "%",
                      minHeight: 4,
                      transition: "height .3s",
                    }}
                    title={fmtM(m.monto)}
                  />
                  <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700 }}>{m.lbl}</div>
                  <div style={{ fontSize: 9, color: "#ccc" }}>{m.n} ped.</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={CARD}>
          <div style={SECTION_TITLE}>🗂️ Por módulo</div>
          {porModulo.map(m => {
            const pct = totalFacturado > 0 ? (m.monto / totalFacturado) * 100 : 0;
            return (
              <div key={m.mod} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS[m.mod] }}>{m.mod}</span>
                  <span style={{ fontSize: 11, color: "#555" }}>
                    {fmtM(m.monto)} · {m.n} pedido{m.n !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ background: "#f0f0f0", borderRadius: 6, height: 8, overflow: "hidden" }}>
                  <div style={{ width: pct + "%", background: COLORS[m.mod], height: "100%", borderRadius: 6, transition: "width .4s" }} />
                </div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                  {m.activos > 0 ? `${m.activos} activo${m.activos !== 1 ? "s" : ""} · ` : ""}
                  Cobrado: <strong style={{ color: "#27AE60" }}>{fmtM(m.cobrado)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fila 2: flujo proyectado + top clientes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }} className="g2">
        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#2C1654" }}>💸 Flujo proyectado</div>
            {totalFlujoProy > 0 && (
              <div style={{ fontSize: 13, fontWeight: 900, color: "#E67E22" }}>{fmtM(totalFlujoProy)}</div>
            )}
          </div>
          {proxEntregas.length === 0 ? (
            <div style={{ textAlign: "center", color: "#ccc", fontSize: 12, padding: 20 }}>Sin entregas próximas con saldo</div>
          ) : (
            proxEntregas.map((p, i) => {
              const dc = p.dias < 0 ? "#F8D7DA" : p.dias <= 3 ? "#FFF3CD" : "#f8f8f8";
              const fc = p.dias < 0 ? "#721C24" : p.dias <= 3 ? "#856404" : "#555";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div
                    style={{
                      background: dc,
                      borderRadius: 6,
                      padding: "2px 7px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: fc,
                      minWidth: 52,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {p.dias < 0 ? `-${Math.abs(p.dias)}d` : p.dias === 0 ? "Hoy" : p.dias + "d"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#2C1654", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{p.modulo} · {p.fechaEntrega}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#E63946" }}>{fmtM(p.saldo)}</div>
                    <div style={{ fontSize: 9, color: "#aaa" }}>por cobrar</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={CARD}>
          <div style={SECTION_TITLE}>🏆 Top clientes</div>
          {topClientes.length === 0 ? (
            <div style={{ textAlign: "center", color: "#ccc", fontSize: 12, padding: 20 }}>Sin datos</div>
          ) : (
            topClientes.map((cli, i) => {
              const saldo = cli.monto - cli.cobrado;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 900,
                      color: i < 3 ? "#fff" : "#aaa",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#2C1654", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cli.nombre}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{cli.n} pedido{cli.n !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#2C1654" }}>{fmtM(cli.monto)}</div>
                    {saldo > 0 && <div style={{ fontSize: 10, color: "#E63946", fontWeight: 700 }}>Debe {fmtM(saldo)}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pipeline de estatus */}
      <div style={CARD}>
        <div style={SECTION_TITLE}>🔄 Pipeline actual (pedidos activos)</div>
        {Object.keys(porEstatus).length === 0 ? (
          <div style={{ textAlign: "center", color: "#ccc", fontSize: 12, padding: 12 }}>Sin pedidos activos</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(porEstatus).sort((a, b) => b[1] - a[1]).map(([est, n]) => {
              const col = { ...EC, ...BORD_EC, ...CUEL_EC }[est] || { bg: "#eee", fg: "#555" };
              return (
                <div key={est} style={{ background: col.bg, borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: col.fg }}>{n}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col.fg }}>{est}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
