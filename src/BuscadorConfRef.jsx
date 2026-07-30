// Buscador de pedidos de confección para vincular desde Bordados o Cuellos.
// Antes vivía como BuscadorConfRef compilado en main.js (~199 líneas).

import { EC } from "./lib/constants.js";

import { useState } from "react";

const INPS2 = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  background: "#FAFAF8",
};

export default function BuscadorConfRef({
  pedidosConf,
  value,
  onChange,
  soloConBordado,
  color = "#1A5F5A",
  colorBg = "#F1F8E9",
  colorBorder = "#8BC34A",
  labelVacio = "— Pedido directo (no viene de confección) —",
}) {
  const [busq, setBusq] = useState("");
  const lista = pedidosConf || [];
  const filtrados = busq.trim()
    ? lista.filter(
        p =>
          p.cliente.toLowerCase().includes(busq.toLowerCase()) ||
          (p.tipoPrenda || "").toLowerCase().includes(busq.toLowerCase()) ||
          String(p.id).includes(busq)
      )
    : lista;
  const seleccionado = lista.find(p => String(p.id) === String(value));

  if (lista.length === 0) {
    return (
      <input
        style={INPS2}
        value={value}
        placeholder={
          soloConBordado
            ? "Sin pedidos activos con bordado — escribe ID manual"
            : "Sin pedidos activos — escribe ID manual"
        }
        onChange={e => onChange(e.target.value, null)}
      />
    );
  }

  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          style={{ ...INPS2, paddingLeft: 32 }}
          value={busq}
          placeholder="🔍 Buscar por nombre, prenda o N°..."
          onChange={e => setBusq(e.target.value)}
        />
        {busq && (
          <button
            onClick={() => setBusq("")}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#aaa",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {busq && filtrados.length > 0 && (
        <div
          style={{
            border: "1.5px solid #e0e0e0",
            borderRadius: 8,
            marginTop: 4,
            maxHeight: 200,
            overflowY: "auto",
            background: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 50,
            position: "relative",
          }}
        >
          <div
            style={{
              padding: "4px 8px",
              background: "#f9f9f9",
              fontSize: 10,
              fontWeight: 700,
              color: "#aaa",
              textTransform: "uppercase",
              borderBottom: "1px solid #eee",
            }}
          >
            {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
          </div>
          <button
            onClick={() => {
              onChange("", null);
              setBusq("");
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "none",
              borderBottom: "1px solid #eee",
              background: "#fff",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 12,
              color: "#aaa",
            }}
          >
            — Pedido directo (sin vincular)
          </button>
          {filtrados.map(p => (
            <button
              key={p.id}
              onClick={() => {
                onChange(String(p.id), p);
                setBusq("");
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "none",
                borderBottom: "1px solid #f5f5f5",
                background: String(p.id) === String(value) ? "#f0fff4" : "#fff",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontWeight: 800, color, marginRight: 6 }}>
                  N°{String(p.id).padStart(4, "0")}
                </span>
                <span style={{ fontWeight: 600, color: "#222", fontSize: 12 }}>{p.cliente}</span>
                {p.tipoPrenda && (
                  <span style={{ color: "#888", fontSize: 11 }}> · {p.tipoPrenda}</span>
                )}
                {p.cantTalla && (
                  <span style={{ color: "#E67E22", fontSize: 11, fontWeight: 700 }}>
                    {" "}
                    · {p.cantTalla}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  background: (EC[p.estatus] || {}).bg || "#eee",
                  color: (EC[p.estatus] || {}).fg || "#333",
                  padding: "2px 7px",
                  borderRadius: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginLeft: 6,
                }}
              >
                {p.estatus}
              </span>
            </button>
          ))}
          {filtrados.length === 0 && (
            <div
              style={{
                padding: "10px 12px",
                color: "#bbb",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              Sin resultados
            </div>
          )}
        </div>
      )}

      {seleccionado ? (
        <div
          style={{
            marginTop: 6,
            background: colorBg,
            border: "1px solid " + colorBorder,
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 11,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            <span style={{ fontWeight: 700, color }}>🔗 Vinculado:</span>{" "}
            <strong>{seleccionado.cliente}</strong> — {seleccionado.tipoPrenda}{" "}
            {seleccionado.cantTalla ? "· " + seleccionado.cantTalla : ""}
          </span>
          <button
            onClick={() => onChange("", null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#aaa",
              fontSize: 14,
              marginLeft: 8,
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        !busq && (
          <div style={{ marginTop: 4 }}>
            <select
              style={{ ...INPS2, color: value ? "#2C1654" : "#aaa" }}
              value={value}
              onChange={e => {
                const p = lista.find(x => String(x.id) === e.target.value);
                onChange(e.target.value, p || null);
              }}
            >
              <option value="">{labelVacio}</option>
              {lista.map(p => (
                <option key={p.id} value={String(p.id)}>
                  N°{String(p.id).padStart(4, "0")} — {p.cliente} · {p.tipoPrenda}
                  {p.cantTalla ? " (" + p.cantTalla + ")" : ""}
                </option>
              ))}
            </select>
          </div>
        )
      )}
    </div>
  );
}
