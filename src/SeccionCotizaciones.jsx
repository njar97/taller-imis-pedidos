// Sección 🧮 Cotizaciones — listado de cotizaciones (pedidos borrador)
// con es_cotizacion=true. El admin las gestiona acá: ver, imprimir,
// convertir a pedido firme, eliminar.
//
// El listado oficial de pedidos (SeccionPedidos) ya las filtra fuera,
// así que viven en su propio espacio sin contaminar producción.

import { useMemo, useState } from "react";
import { fmt$, itemsResumen } from "./lib/dominio.js";
import { TallasChips } from "./SelectorTallas.jsx";
import { pushConfirm, pushToast } from "./lib/feedback.js";

const diasHasta = fStr => {
  if (!fStr) return null;
  return Math.ceil((new Date(fStr + "T12:00:00") - new Date()) / 86400000);
};

const fmtFecha = f => f || "—";

export default function SeccionCotizaciones({
  pedidos,
  onConvertirPedido,
  onEliminar,
  onImprimir,
  onEditar,
}) {
  const [busq, setBusq] = useState("");
  const cotizaciones = useMemo(() => {
    const q = busq.trim().toLowerCase();
    return pedidos
      .filter(p => p.esCotizacion)
      .filter(p => !q || [p.cliente, p.telefono, p.tipoPrenda, String(p.id || "")].some(v => v && String(v).toLowerCase().includes(q)))
      .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  }, [pedidos, busq]);

  const totalCotizado = cotizaciones.reduce((s, c) => s + parseFloat(c.precio || 0), 0);

  return (
    <div style={{ padding: "12px 14px", maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 18, color: "#9B59B6", fontWeight: 800, fontFamily: "Georgia,serif" }}>
            🧮 Cotizaciones
          </h1>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            {cotizaciones.length} borrador{cotizaciones.length === 1 ? "" : "es"} · {fmt$(totalCotizado)} en propuestas
          </div>
        </div>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{
            flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8,
            border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none", fontFamily: "inherit",
            background: "#FAFAFA",
          }}
        />
      </div>

      {cotizaciones.length === 0 ? (
        <div style={{
          background: "#F3E5F5", borderRadius: 12, padding: 24, textAlign: "center",
          border: "1.5px dashed #d4b3df", color: "#9B59B6",
        }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🧮</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Sin cotizaciones aún</div>
          <div style={{ fontSize: 12, opacity: .85 }}>
            Abrí el 💰 Estimador de precio, armá un estimado y guardalo como cotización para que aparezca acá.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cotizaciones.map(c => (
            <CardCotizacion
              key={c.id}
              c={c}
              onConvertir={() => onConvertirPedido(c)}
              onEliminar={() => onEliminar(c)}
              onImprimir={() => onImprimir(c)}
              onEditar={() => onEditar(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CardCotizacion({ c, onConvertir, onEliminar, onImprimir, onEditar }) {
  const items = itemsResumen(c);
  const validez = c.validezDias || 15;
  // Fecha de vencimiento de la cotización = fecha de creación + N días.
  const vence = (() => {
    if (!c.fecha) return null;
    const d = new Date(c.fecha + "T12:00:00");
    d.setDate(d.getDate() + validez);
    return d.toISOString().split("T")[0];
  })();
  const dias = diasHasta(vence);
  const venceHoy = dias !== null && dias === 0;
  const vencida = dias !== null && dias < 0;
  const telWA = c.telefono ? `https://wa.me/${c.telefono.replace(/[^0-9]/g, "")}` : null;

  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 12,
      border: "1.5px solid " + (vencida ? "#E74C3C" : venceHoy ? "#E67E22" : "#d4b3df"),
      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#9B59B6", fontWeight: 700 }}>
              COT-{String(c.id).padStart(4, "0")}
            </span>
            <strong style={{ fontSize: 14, color: "#2C1654" }}>{c.cliente || "(sin cliente)"}</strong>
            {telWA && (
              <a href={telWA} target="_blank" rel="noopener" title="WhatsApp"
                style={{ fontSize: 11, color: "#25D366", textDecoration: "none", fontWeight: 700 }}>
                💬 {c.telefono}
              </a>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            📅 Creada {fmtFecha(c.fecha)}
            {" · "}
            {vencida
              ? <span style={{ color: "#E74C3C", fontWeight: 700 }}>⏰ Vencida hace {Math.abs(dias)} día{Math.abs(dias) === 1 ? "" : "s"}</span>
              : venceHoy
              ? <span style={{ color: "#E67E22", fontWeight: 700 }}>⏰ Vence hoy</span>
              : <span style={{ color: "#27AE60" }}>⏰ Vence en {dias} día{dias === 1 ? "" : "s"}</span>
            }
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#27AE60" }}>{fmt$(c.precio)}</div>
          <div style={{ fontSize: 9, color: "#aaa", textTransform: "uppercase", letterSpacing: .5 }}>cotizado</div>
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <TallasChips items={items} compact />
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={onConvertir} style={BTN("#27AE60")}>
          ✅ Convertir a pedido
        </button>
        <button onClick={onImprimir} style={BTN("#9B59B6")}>
          📄 Imprimir
        </button>
        <button onClick={onEditar} style={BTN("#1A5276")}>
          ✏️ Editar
        </button>
        <button onClick={onEliminar} style={BTN("#E74C3C", true)}>
          🗑️
        </button>
      </div>
    </div>
  );
}

const BTN = (color, ghost = false) => ({
  padding: "6px 12px",
  borderRadius: 6,
  border: ghost ? `1.5px solid ${color}` : "none",
  background: ghost ? "transparent" : color,
  color: ghost ? color : "#fff",
  fontWeight: 700,
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
});
