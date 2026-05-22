// Modal de detalle de un cliente — historial completo.
//
// Muestra todos los pedidos, bordados, cuellos y cotizaciones del
// cliente con tabs. Cada item es clickeable para abrir el detalle del
// pedido (cierra este modal y abre el de pedido). Útil para
// referenciar trabajos previos del mismo cliente al armar uno nuevo.

import { useMemo, useState } from "react";
import { Modal } from "./lib/Modal.jsx";
import { EC, BORD_EC, CUEL_EC } from "./lib/constants.js";
import { fmt$ } from "./lib/dominio.js";

export default function DetalleClienteModal({ cliente, pedidos, bordados, cuellos, onClose, onAbrirPedido }) {
  const [tab, setTab] = useState("pedidos");

  const nombre = (cliente.nombre || "").toLowerCase();
  const matchCliente = x => (x.cliente || "").toLowerCase() === nombre && !x.deletedAt;

  const datos = useMemo(() => {
    const peds = pedidos.filter(matchCliente);
    const peds_firmes = peds.filter(p => !p.esCotizacion);
    const cots = peds.filter(p => p.esCotizacion);
    const bords = bordados.filter(matchCliente);
    const cuels = cuellos.filter(matchCliente);
    const todos = [...peds_firmes, ...bords, ...cuels];

    const total = todos.reduce((s, x) => s + parseFloat(x.precio || x.precioT || 0), 0);
    const abonado = todos.reduce(
      (s, x) =>
        s + (Array.isArray(x.abonos)
          ? x.abonos.reduce((a, b) => a + parseFloat(b.monto || 0), 0)
          : parseFloat(x.anticipo || 0)),
      0
    );
    const entregados = todos.filter(x => x.estatus === "Entregado").length;
    const conversion = cots.length > 0
      ? Math.round((peds_firmes.filter(p => p.fecha >= (cots[0]?.fecha || "")).length / cots.length) * 100)
      : null;

    return { peds_firmes, cots, bords, cuels, total, abonado, entregados, conversion };
  }, [cliente, pedidos, bordados, cuellos]);

  const tabs = [
    { id: "pedidos", label: `📋 Pedidos (${datos.peds_firmes.length})` },
    { id: "cotizaciones", label: `🧮 Cotizaciones (${datos.cots.length})`, hide: datos.cots.length === 0 },
    { id: "bordados", label: `🪡 Bordados (${datos.bords.length})`, hide: datos.bords.length === 0 },
    { id: "cuellos", label: `🧶 Cuellos (${datos.cuels.length})`, hide: datos.cuels.length === 0 },
  ].filter(t => !t.hide);

  return (
    <Modal title={`👤 ${cliente.nombre}`} onClose={onClose}>
      <div>
        {/* Datos básicos */}
        <div style={{ background: "#f8f4ff", borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid #d4b3df" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {cliente.telefono && (
              <a href={`https://wa.me/${cliente.telefono.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener"
                style={{ fontSize: 12, color: "#25D366", fontWeight: 700, textDecoration: "none" }}>
                💬 {cliente.telefono}
              </a>
            )}
            {cliente.contacto && <span style={{ fontSize: 12, color: "#666" }}>👤 {cliente.contacto}</span>}
            {cliente.nit && <span style={{ fontSize: 11, color: "#27AE60", fontWeight: 700, padding: "2px 8px", background: "#E8F5E9", borderRadius: 8 }}>📋 NIT {cliente.nit}</span>}
          </div>
          {cliente.notas && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 6, fontStyle: "italic" }}>{cliente.notas}</div>
          )}
        </div>

        {/* Métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 6, marginBottom: 12 }}>
          <Metric label="Total" value={datos.peds_firmes.length + datos.bords.length + datos.cuels.length} color="#9B59B6" />
          <Metric label="Entregados" value={datos.entregados} color="#27AE60" />
          <Metric label="Facturado" value={fmt$(datos.total)} color="#2C1654" small />
          <Metric label="Abonado" value={fmt$(datos.abonado)} color="#28A745" small />
          {datos.conversion !== null && <Metric label="Conv. cot." value={`${datos.conversion}%`} color="#E67E22" />}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, background: "#f0f0f0", padding: 3, borderRadius: 8 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "6px 8px", borderRadius: 6, border: "none",
              background: tab === t.id ? "#9B59B6" : "transparent",
              color: tab === t.id ? "#fff" : "#666",
              fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Lista del tab activo */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {tab === "pedidos" && datos.peds_firmes.map(p => <ItemPedido key={p.id} p={p} prefix="N°" colorMap={EC} onAbrir={() => { onClose(); onAbrirPedido && onAbrirPedido(p); }} />)}
          {tab === "cotizaciones" && datos.cots.map(p => <ItemPedido key={p.id} p={p} prefix="COT-" colorMap={EC} onAbrir={() => { onClose(); onAbrirPedido && onAbrirPedido(p); }} />)}
          {tab === "bordados" && datos.bords.map(b => <ItemPedido key={b.id} p={b} prefix="BORD-" colorMap={BORD_EC} prendaCampo="soporte" />)}
          {tab === "cuellos" && datos.cuels.map(c => <ItemPedido key={c.id} p={c} prefix="CUEL-" colorMap={CUEL_EC} prendaCampo="material" />)}
          {((tab === "pedidos" && datos.peds_firmes.length === 0) ||
            (tab === "cotizaciones" && datos.cots.length === 0) ||
            (tab === "bordados" && datos.bords.length === 0) ||
            (tab === "cuellos" && datos.cuels.length === 0)) && (
            <div style={{ textAlign: "center", padding: 24, color: "#aaa", fontSize: 12 }}>
              Sin {tab} para este cliente
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Metric({ label, value, color, small }) {
  return (
    <div style={{ textAlign: "center", padding: 8, background: "#f9f9f9", borderRadius: 6, border: "1px solid #eee" }}>
      <div style={{ fontSize: small ? 13 : 18, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 8, color: "#999", fontWeight: 700, textTransform: "uppercase", letterSpacing: .3, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ItemPedido({ p, prefix, colorMap, prendaCampo = "tipoPrenda", onAbrir }) {
  const num = String(p.id).padStart(4, "0");
  const ec = colorMap[p.estatus] || { bg: "#eee", fg: "#666" };
  const precio = parseFloat(p.precio || p.precioT || 0);
  return (
    <button
      onClick={onAbrir}
      style={{
        textAlign: "left", padding: 10, background: "#fff",
        border: "1.5px solid #eee", borderRadius: 8, cursor: onAbrir ? "pointer" : "default",
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: "inherit",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <strong style={{ color: "#9B59B6", fontSize: 11 }}>{prefix}{num}</strong>
          <span style={{ fontSize: 13, color: "#2C1654", fontWeight: 700 }}>{p[prendaCampo] || "—"}</span>
        </div>
        <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
          {p.fecha || "—"}
          {p.fechaEntrega && ` · entrega ${p.fechaEntrega}`}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        {precio > 0 && (
          <div style={{ fontSize: 13, fontWeight: 800, color: "#27AE60" }}>{fmt$(precio)}</div>
        )}
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: ec.bg, color: ec.fg }}>
          {p.estatus || "—"}
        </span>
      </div>
    </button>
  );
}
