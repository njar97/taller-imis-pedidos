// Modal de "pedido vencido — ¿fue entregado?".
// Aparece cuando un pedido pasa la fecha de entrega sin estar archivado.
// Tres acciones:
//   - Sí, fue entregado → archivarlo con la fecha indicada
//   - Todavía no → cambiar estatus a "Listo" para que salga del flujo de vencidos
//   - Recordar después → cerrar sin cambios

import { hoy } from "./lib/dominio.js";

const FECHA_INPUT_ID = "fecha-entrega-real";

export default function ModalArchivar({
  pedido,
  onConfirmarArchivar,
  onCambiarAListo,
  onCerrar,
}) {
  const confirmar = () => {
    const input = document.getElementById(FECHA_INPUT_ID);
    onConfirmarArchivar(input ? input.value : hoy());
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
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
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
          <h3
            style={{
              margin: "0 0 6px",
              color: "#2C1654",
              fontSize: 17,
            }}
          >
            Pedido vencido — ¿fue entregado?
          </h3>
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 4px" }}>
            El pedido de <strong>{pedido.cliente}</strong> ya venció su fecha de entrega.
          </p>
          <p style={{ color: "#888", fontSize: 12 }}>
            Si fue entregado, se archivará automáticamente.
          </p>
        </div>

        <div
          style={{
            background: "#f8f4ff",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 700, color: "#2C1654" }}>
            N°{String(pedido.id).padStart(4, "0")} — {pedido.cliente}
          </div>
          <div style={{ color: "#666", marginTop: 2 }}>{pedido.tipoPrenda}</div>
          <div style={{ color: "#C0392B", fontWeight: 700, marginTop: 2 }}>
            Fecha pactada: {pedido.fechaEntrega}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#888",
              textTransform: "uppercase",
              marginBottom: 4,
              display: "block",
            }}
          >
            ¿Cuándo fue entregado?
          </label>
          <input
            type="date"
            id={FECHA_INPUT_ID}
            defaultValue={hoy()}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1.5px solid #e0e0e0",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={confirmar}
            style={{
              padding: "11px",
              borderRadius: 8,
              border: "none",
              background: "#28A745",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            ✅ Sí, fue entregado — archivar
          </button>
          <button
            onClick={onCambiarAListo}
            style={{
              padding: "11px",
              borderRadius: 8,
              border: "1.5px solid #E67E22",
              background: "#fff",
              color: "#E67E22",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            🕐 Todavía no — cambiar a "Listo"
          </button>
          <button
            onClick={onCerrar}
            style={{
              padding: "9px",
              borderRadius: 8,
              border: "1.5px solid #e0e0e0",
              background: "#fff",
              color: "#aaa",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Recordar después
          </button>
        </div>
      </div>
    </div>
  );
}
