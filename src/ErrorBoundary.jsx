// Captura cualquier excepción que escape de React (incluye errores
// asincrónicos en effects). Muestra una pantalla de "algo se rompió"
// con el mensaje del error y un botón de recargar. Los datos quedan
// guardados en Postgres, así que recargar es seguro.

import { Component } from "react";
import { reportError } from "./lib/reportError.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary catch:", error, info);
    reportError(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = String((this.state.error && this.state.error.message) || this.state.error);
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#F7F4FA",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
            background: "#fff",
            padding: 28,
            borderRadius: 14,
            boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 8 }}>💥</div>
          <h2
            style={{
              color: "#2C1654",
              margin: "0 0 8px",
              fontFamily: "Georgia, serif",
            }}
          >
            Algo se rompió
          </h2>
          <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px" }}>
            La app encontró un error inesperado. Probá recargar — tus datos están guardados.
          </p>
          <div
            style={{
              background: "#FFF3CD",
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 11,
              color: "#856404",
              marginBottom: 18,
              fontFamily: "monospace",
              textAlign: "left",
              wordBreak: "break-word",
              maxHeight: 100,
              overflow: "auto",
            }}
          >
            {msg}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "13px 24px",
              borderRadius: 10,
              border: "none",
              background: "#9B59B6",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              width: "100%",
            }}
          >
            🔄 Recargar app
          </button>
        </div>
      </div>
    );
  }
}
