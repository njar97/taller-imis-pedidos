// Candado biométrico al abrir la app. Se muestra cuando hay sesión
// guardada Y la huella está activada: el usuario toca el sensor y entra
// sin código. Fallback: "entrar con código por email" cierra la sesión
// y devuelve al login OTP normal (y desactiva la huella para que no
// vuelva a pedirla con la sesión nueva hasta que la reactive).

import { TALLER } from "./lib/constants.js";
import { verificarHuella, desactivarHuella } from "./lib/biometria.js";

import { useState, useEffect, useRef } from "react";

const wrap = {
  minHeight: "100vh",
  background: "linear-gradient(135deg,#1a0a35,#2C1654,#3d2070)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

export default function PantallaHuella({ nombre, onOk, onUsarEmail }) {
  const [estado, setEstado] = useState("idle"); // idle | pidiendo | error
  const [error, setError] = useState(null);
  const intentoAuto = useRef(false);

  async function pedir() {
    setEstado("pidiendo");
    setError(null);
    const r = await verificarHuella();
    if (r.ok) { onOk(); return; }
    setEstado("error");
    setError(r.cancelado ? null : (r.error || "No se pudo verificar"));
  }

  // Primer intento automático al montar. Si el navegador exige gesto de
  // usuario (Safari), falla silencioso y queda el botón.
  useEffect(() => {
    if (intentoAuto.current) return;
    intentoAuto.current = true;
    pedir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🧵</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif" }}>{TALLER}</div>
        <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 6, marginBottom: 30 }}>
          Hola{nombre ? " " + nombre.split(" ")[0] : ""}, desbloqueá con tu huella
        </div>

        <button
          onClick={pedir}
          disabled={estado === "pidiendo"}
          style={{
            width: 120, height: 120, borderRadius: "50%", margin: "0 auto",
            border: "3px solid #9B59B6",
            background: estado === "pidiendo" ? "#3a1f6b" : "rgba(155,89,182,0.15)",
            fontSize: 52, cursor: estado === "pidiendo" ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="Entrar con huella"
        >
          {estado === "pidiendo" ? "⏳" : "👆"}
        </button>
        <div style={{ fontSize: 12, color: "#9B59B6", marginTop: 14, minHeight: 18 }}>
          {estado === "pidiendo" ? "Esperando el sensor..." : "Tocá para usar la huella"}
        </div>
        {error && (
          <div style={{ fontSize: 12, color: "#FF8A8A", marginTop: 6 }}>{error}</div>
        )}

        <button
          onClick={() => { desactivarHuella(); onUsarEmail(); }}
          style={{
            marginTop: 30, padding: "10px 18px", background: "transparent",
            border: "1px solid #3a1f6b", color: "#9B59B6", borderRadius: 8,
            cursor: "pointer", fontSize: 12, fontFamily: "inherit",
          }}
        >
          📧 Entrar con código por email
        </button>
      </div>
    </div>
  );
}
