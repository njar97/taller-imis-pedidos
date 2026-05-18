// Pantalla de login: elige operario (módulo) o admin (con PIN).
//
// Primer módulo decompilado a JSX legible. Antes vivía como
// React.createElement(...) en main.js (~300 líneas).

import { TALLER } from "./lib/constants.js";
import { pushToast } from "./lib/feedback.js";

import { useState } from "react";

// SHA-256 del PIN admin. Para cambiar, en una terminal:
//   node -e "console.log(require('crypto').createHash('sha256').update('TU_NUEVO_PIN').digest('hex'))"
const PIN_ADMIN_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const MODULOS = [
  { id: "pedidos",  icon: "✂️", label: "Costura / Confección", desc: "Pedidos de prendas y arreglos", color: "#9B59B6" },
  { id: "bordados", icon: "🪡", label: "Bordados",             desc: "Pedidos de bordado independientes", color: "#1A5F5A" },
  { id: "cuellos",  icon: "🧶", label: "Cuellos y Tejidos",    desc: "Pedidos de tejido de cuellos", color: "#B85C00" },
];

const wrap = {
  minHeight: "100vh",
  background: "linear-gradient(135deg,#1a0a35,#2C1654,#3d2070)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

export default function PantallaLogin({ onLogin }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [paso, setPaso] = useState("inicio"); // "inicio" | "modulo"

  async function entrarAdmin() {
    // Lockout de 5 minutos tras 5 intentos fallidos.
    try {
      const lock = JSON.parse(localStorage.getItem("imis_pin_lock") || "null");
      if (lock && lock.until && lock.until > Date.now()) {
        const min = Math.ceil((lock.until - Date.now()) / 60000);
        pushToast("Demasiados intentos. Probá de nuevo en " + min + " min.", "error");
        return;
      }
    } catch {}

    const inputHash = await sha256(pin);
    if (inputHash === PIN_ADMIN_HASH) {
      try { localStorage.removeItem("imis_pin_lock"); } catch {}
      onLogin("admin");
      return;
    }

    setErr("PIN incorrecto");
    setPin("");
    setTimeout(() => setErr(""), 2000);
    try {
      const lock = JSON.parse(localStorage.getItem("imis_pin_lock") || '{"count":0}');
      lock.count = (lock.count || 0) + 1;
      if (lock.count >= 5) {
        lock.until = Date.now() + 5 * 60 * 1000;
        lock.count = 0;
        pushToast("Demasiados intentos. Bloqueado 5 minutos.", "error");
      }
      localStorage.setItem("imis_pin_lock", JSON.stringify(lock));
    } catch {}
  }

  if (paso === "modulo") {
    return (
      <div style={wrap}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>✂️</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif" }}>{TALLER}</div>
            <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 6 }}>¿Qué módulo vas a trabajar hoy?</div>
          </div>
          {MODULOS.map(m => (
            <button
              key={m.id}
              onClick={() => onLogin("operario_" + m.id)}
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: 12,
                border: "2px solid " + m.color + "55",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 34, width: 44, textAlign: "center" }}>{m.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: m.color, marginTop: 2 }}>{m.desc}</div>
              </div>
            </button>
          ))}
          <button
            onClick={() => setPaso("inicio")}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #3a1f6b",
              background: "transparent",
              color: "#555",
              cursor: "pointer",
              fontSize: 12,
              marginTop: 4,
            }}
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🧵</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif" }}>{TALLER}</div>
          <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 4 }}>Sistema de Gestión de Pedidos</div>
        </div>

        <button
          onClick={() => setPaso("modulo")}
          style={{
            width: "100%",
            padding: "18px 20px",
            borderRadius: 12,
            border: "2px solid #4a2c7a",
            background: "#2C1654",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 14,
            textAlign: "left",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 36 }}>✂️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Entrar como Operario</div>
            <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 2 }}>Costura · Bordados · Cuellos y tejidos</div>
          </div>
        </button>

        <div style={{ background: "#2C1654", border: "2px solid #4a2c7a", borderRadius: 12, overflow: "hidden" }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              width: "100%",
              padding: "18px 20px",
              border: "none",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 36 }}>🔐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Administrador</div>
              <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 2 }}>Montos · inventario · fiscal</div>
            </div>
            <span style={{ fontSize: 20, color: "#555" }}>{open ? "▾" : "▸"}</span>
          </button>

          {open && (
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  value={pin}
                  placeholder="PIN"
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && entrarAdmin()}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #4a2c7a",
                    background: "#1a0a36",
                    color: "#fff",
                    fontSize: 24,
                    outline: "none",
                    letterSpacing: 12,
                    fontFamily: "monospace",
                    textAlign: "center",
                  }}
                />
                <button
                  onClick={entrarAdmin}
                  style={{
                    padding: "12px 22px",
                    borderRadius: 8,
                    border: "none",
                    background: "#9B59B6",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                >
                  →
                </button>
              </div>
              {err && (
                <div style={{ color: "#FF7979", fontSize: 13, fontWeight: 700, marginTop: 8, textAlign: "center" }}>
                  ⚠️ {err}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
