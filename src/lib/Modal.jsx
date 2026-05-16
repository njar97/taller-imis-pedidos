// Modal genérico — bottom-sheet con header de título + botón cerrar.
// Se usa en muchos lugares de main.js (detalle de pedido, formularios, etc.).

export function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px 16px 0 0",
          padding: 16,
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          width: "100%",
          maxWidth: 640,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#2C1654", fontFamily: "Georgia,serif", flex: 1, paddingRight: 10 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 26,
              cursor: "pointer",
              color: "#bbb",
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
