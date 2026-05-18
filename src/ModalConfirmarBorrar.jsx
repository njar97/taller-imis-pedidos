// Modal de confirmación "¿eliminar pedido?" (admin-only).
// La acción es destructiva (soft-delete pero recuperable solo desde papelera),
// por eso se pide confirmación explícita.

export default function ModalConfirmarBorrar({ onCancelar, onConfirmar }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 28,
          maxWidth: 340,
          textAlign: "center",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 10 }}>🗑️</div>
        <h3 style={{ margin: "0 0 8px", color: "#2C1654" }}>
          ¿Eliminar pedido?
        </h3>
        <p style={{ color: "#888", fontSize: 14, margin: "0 0 20px" }}>
          Esta acción no se puede deshacer.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancelar} style={btnStyle("#aaa")}>
            Cancelar
          </button>
          <button onClick={onConfirmar} style={btnStyle("#E63946")}>
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: bg,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  };
}
