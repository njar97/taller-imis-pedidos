// Pantalla de login: email + código OTP de 6 dígitos.
//
// Flujo:
//   1. pegás email → mandamos código por correo (valida whitelist primero)
//   2. pegás código → verificarCodigo levanta sesión con rol/modulos
//   3. si rol=admin → entra directo
//      si rol=operario con 1 modulo → entra a ese modulo
//      si rol=operario con varios/ninguno → mostrar picker

import { TALLER } from "./lib/constants.js";
import { pushToast } from "./lib/feedback.js";
import { pedirMagicLink, verificarCodigo } from "./lib/auth.js";

import { useState } from "react";

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
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [paso, setPaso] = useState("email"); // "email" | "codigo" | "modulo"
  const [sesionUser, setSesionUser] = useState(null);

  async function enviarCodigo() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      pushToast("Email inválido", "error");
      return;
    }
    setEnviando(true);
    const res = await pedirMagicLink(e);
    setEnviando(false);
    if (res.ok) {
      setPaso("codigo");
      pushToast("Código enviado a " + e, "success", 5000);
    } else {
      pushToast(res.error || "No pude enviar el código", "error", 6000);
    }
  }

  async function entrarConCodigo() {
    if (!codigo.trim()) {
      pushToast("Pegá el código del email", "error");
      return;
    }
    setVerificando(true);
    const res = await verificarCodigo(email, codigo);
    setVerificando(false);
    if (!res.ok) {
      pushToast(res.error || "Código inválido", "error", 5000);
      return;
    }
    const u = res.sesion.user;
    if (u.rol === "admin") {
      pushToast(`Bienvenido${u.nombre ? ", " + u.nombre.split(" ")[0] : ""}`, "success");
      onLogin("admin");
      return;
    }
    // operario
    const mods = Array.isArray(u.modulos) && u.modulos.length > 0 ? u.modulos : MODULOS.map(m => m.id);
    if (mods.length === 1) {
      pushToast(`Bienvenido${u.nombre ? ", " + u.nombre.split(" ")[0] : ""}`, "success");
      onLogin("operario_" + mods[0]);
      return;
    }
    setSesionUser({ ...u, modulosPermitidos: mods });
    setPaso("modulo");
  }

  // PASO 3: picker de modulo para operarios con varios modulos
  if (paso === "modulo") {
    const permitidos = MODULOS.filter(m => sesionUser?.modulosPermitidos?.includes(m.id));
    return (
      <div style={wrap}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>✂️</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif" }}>{TALLER}</div>
            <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 6 }}>
              Hola{sesionUser?.nombre ? " " + sesionUser.nombre.split(" ")[0] : ""}, ¿qué módulo trabajás hoy?
            </div>
          </div>
          {permitidos.map(m => (
            <button
              key={m.id}
              onClick={() => onLogin("operario_" + m.id)}
              style={{
                width: "100%", padding: "16px 20px", borderRadius: 12,
                border: "2px solid " + m.color + "55",
                background: "rgba(255,255,255,0.06)", color: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                textAlign: "left", marginBottom: 10, fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 34, width: 44, textAlign: "center" }}>{m.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: m.color, marginTop: 2 }}>{m.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // PASO 2: ingresar código
  if (paso === "codigo") {
    return (
      <div style={wrap}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 6 }}>📬</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif" }}>{TALLER}</div>
            <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 6 }}>
              Te envié un código a <strong style={{ color: "#fff" }}>{email}</strong>
            </div>
          </div>

          <div style={{ background: "#2C1654", border: "2px solid #4a2c7a", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: "#9B59B6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, textAlign: "center", fontWeight: 700 }}>
              Pegá el código de 6 dígitos
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={codigo}
              placeholder="000000"
              onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && codigo.length >= 6 && entrarConCodigo()}
              autoFocus
              style={{
                width: "100%", padding: "14px", borderRadius: 8,
                border: "1.5px solid #4a2c7a", background: "#1a0a36",
                color: "#fff", fontSize: 28, outline: "none",
                textAlign: "center", letterSpacing: 8,
                fontFamily: "monospace", marginBottom: 12, boxSizing: "border-box",
              }}
            />
            <button
              onClick={entrarConCodigo}
              disabled={verificando || codigo.length < 6}
              style={{
                width: "100%", padding: "14px", borderRadius: 8, border: "none",
                background: verificando ? "#555" : (codigo.length >= 6 ? "#27AE60" : "#3a1f6b"),
                color: "#fff", fontWeight: 800, fontSize: 15,
                cursor: (verificando || codigo.length < 6) ? "not-allowed" : "pointer",
                fontFamily: "inherit", marginBottom: 10, boxSizing: "border-box",
              }}
            >
              {verificando ? "⏳ Verificando..." : "✅ Entrar"}
            </button>
            <button
              onClick={() => { setPaso("email"); setCodigo(""); }}
              style={{
                width: "100%", padding: "10px", background: "transparent",
                border: "1px solid #3a1f6b", color: "#9B59B6", borderRadius: 6,
                cursor: "pointer", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box",
              }}
            >
              ← Usar otro email
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: "#7a5a9b", textAlign: "center", lineHeight: 1.5 }}>
            El código vence en 5 minutos. Si no llega, revisá spam o pedí otro.
          </div>
        </div>
      </div>
    );
  }

  // PASO 1: pedir email
  return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🧵</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif" }}>{TALLER}</div>
          <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 4 }}>Sistema de Gestión de Pedidos</div>
        </div>

        <div style={{ background: "#2C1654", border: "2px solid #4a2c7a", borderRadius: 12, padding: 22 }}>
          <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 4 }}>
            🔐 Iniciar sesión
          </div>
          <div style={{ fontSize: 11, color: "#9B59B6", marginBottom: 14 }}>
            Te mandamos un código de 6 dígitos por email
          </div>
          <input
            type="email"
            value={email}
            placeholder="tu@email.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && enviarCodigo()}
            autoFocus
            style={{
              width: "100%", padding: "13px 14px", borderRadius: 8,
              border: "1.5px solid #4a2c7a", background: "#1a0a36",
              color: "#fff", fontSize: 15, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10,
            }}
          />
          <button
            onClick={enviarCodigo}
            disabled={enviando}
            style={{
              width: "100%", padding: "13px", borderRadius: 8, border: "none",
              background: enviando ? "#555" : "#9B59B6", color: "#fff",
              fontWeight: 800, fontSize: 14, cursor: enviando ? "wait" : "pointer",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
          >
            {enviando ? "📤 Enviando código..." : "📬 Enviar código"}
          </button>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: "#7a5a9b", textAlign: "center", lineHeight: 1.5 }}>
          Solo los emails autorizados por el administrador pueden entrar.
        </div>
      </div>
    </div>
  );
}
