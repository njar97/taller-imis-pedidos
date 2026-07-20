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
import { buscarInvitacionPorToken } from "./lib/invitaciones.js";
import { soportaHuella, huellaActivada, activarHuella } from "./lib/biometria.js";

import { useState, useEffect } from "react";

function leerInviteDeURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("invite");
  } catch { return null; }
}

function limpiarInviteDeURL() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.history.replaceState({}, document.title, url.toString());
  } catch {}
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

const ULTIMO_EMAIL_KEY = "TALLER_ULTIMO_EMAIL";

export default function PantallaLogin({ onLogin }) {
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(ULTIMO_EMAIL_KEY) || ""; } catch { return ""; }
  });
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [paso, setPaso] = useState("email"); // "email" | "codigo" | "huella" | "modulo"
  const [sesionUser, setSesionUser] = useState(null);
  // Adónde seguir después del paso "huella" (oferta post-login):
  // { rol, nombre, email } o { modulo:true, nombre, email }
  const [destinoPostLogin, setDestinoPostLogin] = useState(null);
  const [activandoHuella, setActivandoHuella] = useState(false);

  // Si la URL tiene ?invite=TOKEN, arrancamos en flujo de invitacion.
  const [invitacionToken] = useState(() => leerInviteDeURL());
  const [invitacion, setInvitacion] = useState(null); // datos cargados de la BD
  const [invitacionError, setInvitacionError] = useState(null);

  useEffect(() => {
    if (!invitacionToken) return;
    (async () => {
      const r = await buscarInvitacionPorToken(invitacionToken);
      if (r.ok) setInvitacion(r.invitacion);
      else setInvitacionError(r.error || "Invitacion invalida");
    })();
  }, [invitacionToken]);

  async function enviarCodigo() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      pushToast("Email inválido", "error");
      return;
    }
    setEnviando(true);
    const res = await pedirMagicLink(e, { invitacionToken });
    setEnviando(false);
    if (res.ok) {
      try { localStorage.setItem(ULTIMO_EMAIL_KEY, e); } catch {}
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
    const res = await verificarCodigo(email, codigo, { invitacionToken });
    setVerificando(false);
    if (!res.ok) {
      pushToast(res.error || "Código inválido", "error", 5000);
      return;
    }
    // Limpio el ?invite= de la URL una vez consumida.
    if (invitacionToken) limpiarInviteDeURL();
    const u = res.sesion.user;
    let destino;
    if (u.rol === "admin") {
      destino = { rol: "admin", nombre: u.nombre, email: u.email };
    } else {
      const mods = Array.isArray(u.modulos) && u.modulos.length > 0 ? u.modulos : MODULOS.map(m => m.id);
      if (mods.length === 1) {
        destino = { rol: "operario_" + mods[0], nombre: u.nombre, email: u.email };
      } else {
        setSesionUser({ ...u, modulosPermitidos: mods });
        destino = { modulo: true, nombre: u.nombre, email: u.email };
      }
    }
    // Si el dispositivo tiene sensor y aún no hay huella registrada,
    // ofrecemos activarla antes de entrar (paso opcional, se puede saltar).
    if (!huellaActivada() && (await soportaHuella())) {
      setDestinoPostLogin(destino);
      setPaso("huella");
      return;
    }
    irADestino(destino);
  }

  function irADestino(d) {
    if (d.modulo) { setPaso("modulo"); return; }
    pushToast(`Bienvenido${d.nombre ? ", " + d.nombre.split(" ")[0] : ""}`, "success");
    onLogin(d.rol);
  }

  async function aceptarHuella() {
    setActivandoHuella(true);
    const r = await activarHuella(destinoPostLogin?.email || email.trim().toLowerCase());
    setActivandoHuella(false);
    if (r.ok) {
      pushToast("Huella activada 👆 La próxima vez entrás sin código", "success", 5000);
    } else if (!r.cancelado) {
      pushToast("No se pudo activar la huella: " + (r.error || ""), "error", 5000);
    }
    // Con o sin huella, seguimos al destino (si canceló, entra igual).
    irADestino(destinoPostLogin);
  }

  // PASO 2.5 (opcional): ofrecer activar el ingreso con huella
  if (paso === "huella") {
    return (
      <div style={wrap}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>👆</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif" }}>
            ¿Entrar con huella?
          </div>
          <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 10, marginBottom: 26, lineHeight: 1.6 }}>
            Activá el sensor de este dispositivo y la próxima vez
            entrás con un toque, sin esperar el código por email.
          </div>
          <button
            onClick={aceptarHuella}
            disabled={activandoHuella}
            style={{
              width: "100%", padding: "15px", borderRadius: 10, border: "none",
              background: activandoHuella ? "#555" : "#27AE60", color: "#fff",
              fontWeight: 800, fontSize: 15, cursor: activandoHuella ? "wait" : "pointer",
              fontFamily: "inherit", marginBottom: 10, boxSizing: "border-box",
            }}
          >
            {activandoHuella ? "⏳ Esperando el sensor..." : "👆 Activar huella"}
          </button>
          <button
            onClick={() => irADestino(destinoPostLogin)}
            style={{
              width: "100%", padding: "12px", background: "transparent",
              border: "1px solid #3a1f6b", color: "#9B59B6", borderRadius: 8,
              cursor: "pointer", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
            }}
          >
            Ahora no
          </button>
        </div>
      </div>
    );
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
  // Si hay token de invitacion, mostramos banner especial y validamos
  // que el token sea valido antes de dejar entrar el email.
  const conInvitacion = !!invitacionToken;
  const invitacionValida = conInvitacion && invitacion && !invitacionError;
  const invitacionMala = conInvitacion && invitacionError;

  return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{conInvitacion ? "🎉" : "🧵"}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", fontFamily: "Georgia,serif" }}>{TALLER}</div>
          <div style={{ fontSize: 13, color: "#9B59B6", marginTop: 4 }}>Sistema de Gestión de Pedidos</div>
        </div>

        {invitacionMala && (
          <div style={{
            background: "#3a1010", border: "2px solid #DC3545", borderRadius: 12,
            padding: 16, marginBottom: 14, color: "#FFE4E4", fontSize: 13, textAlign: "center",
          }}>
            ⚠️ <strong>Invitación inválida</strong>
            <div style={{ fontSize: 11, marginTop: 6, opacity: 0.85 }}>{invitacionError}</div>
            <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>Pedile al admin un link nuevo o entrá con un email ya autorizado.</div>
          </div>
        )}

        {invitacionValida && (
          <div style={{
            background: "linear-gradient(135deg,#1A5F5A,#27AE60)", borderRadius: 12,
            padding: 16, marginBottom: 14, color: "#fff", fontSize: 13,
          }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
              🎉 Te invitaron a {TALLER}
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, lineHeight: 1.5 }}>
              Al entrar quedás registrado como{" "}
              <strong>{invitacion.rol === "admin" ? "Administrador" : "Operario"}</strong>
              {invitacion.modulos && invitacion.modulos.length > 0
                ? ` con acceso a ${invitacion.modulos.join(", ")}`
                : ""}.
              <br />Dejá tu email para recibir el código de entrada.
            </div>
          </div>
        )}

        <div style={{ background: "#2C1654", border: "2px solid #4a2c7a", borderRadius: 12, padding: 22, opacity: invitacionMala ? 0.4 : 1, pointerEvents: invitacionMala ? "none" : "auto" }}>
          <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 4 }}>
            {conInvitacion ? "📧 Aceptar invitación" : "🔐 Iniciar sesión"}
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
