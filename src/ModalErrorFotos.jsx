// Modal "fotos no subidas a Drive". Aparece después de guardar un pedido
// si una o más fotos fallaron al subirse a Supabase Storage (legacy: Drive).
// El pedido SE guardó — solo avisa que las fotos quedaron locales.

export default function ModalErrorFotos({ errores, onCerrar }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
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
          borderRadius: 14,
          padding: 28,
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 8, textAlign: "center" }}>
          ⚠️
        </div>
        <h3
          style={{
            margin: "0 0 8px",
            color: "#2C1654",
            textAlign: "center",
          }}
        >
          Fotos no subidas a Drive
        </h3>
        <p
          style={{
            color: "#888",
            fontSize: 13,
            margin: "0 0 14px",
            textAlign: "center",
          }}
        >
          El pedido se guardó, pero estas fotos no pudieron subirse. Solo se verán en este dispositivo.
        </p>
        <div
          style={{
            background: "#FFF3CD",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          {errores.map((e, i) => (
            <div
              key={i}
              style={{ fontSize: 12, color: "#856404", marginBottom: 2 }}
            >
              <strong>{e.nombre}</strong>: {e.err}
            </div>
          ))}
        </div>
        <p style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>
          Para subirlas, edita el pedido y vuelve a guardar.
        </p>
        <button
          onClick={onCerrar}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#9B59B6",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            width: "100%",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
