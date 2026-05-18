// Modal de "¿actualizar medidas del cliente?".
// Aparece cuando un pedido se guarda con medidas distintas a las
// guardadas para el cliente. Sirve para mantener sincronizada la ficha
// del cliente sin pisarla automáticamente.

import { MEDIDAS_DEF } from "./lib/constants.js";

export default function ModalActMedidas({ pedido, cliente, onActualizar, onCerrar }) {
  const medidasDelPedido = MEDIDAS_DEF.filter(
    m => pedido.medidas && pedido.medidas[m.k]
  );
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 28,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📐</div>
          <h3 style={{ margin: "0 0 6px", color: "#1A5276", fontSize: 17 }}>
            ¿Actualizar medidas del cliente?
          </h3>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
            Las medidas de este pedido son diferentes a las guardadas para{" "}
            <strong>{cliente.nombre}</strong>.
          </p>
        </div>

        <div
          style={{
            background: "#f0f4ff",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {medidasDelPedido.map(m => (
              <div
                key={m.k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={{ color: "#888", fontWeight: 700 }}>{m.l}:</span>
                <span style={{ color: "#1A5276", fontWeight: 800 }}>
                  {pedido.medidas[m.k]} cm
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onActualizar}
            style={{
              padding: "11px",
              borderRadius: 8,
              border: "none",
              background: "#1A5276",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            ✅ Sí, actualizar medidas del cliente
          </button>
          <button
            onClick={onCerrar}
            style={{
              padding: "10px",
              borderRadius: 8,
              border: "1.5px solid #e0e0e0",
              background: "#fff",
              color: "#888",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            No, solo para este pedido
          </button>
        </div>
      </div>
    </div>
  );
}
