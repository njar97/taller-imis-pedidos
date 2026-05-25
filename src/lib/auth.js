// Wrapper liviano de Supabase Auth. No dependemos del SDK completo
// porque la app no usa @supabase/supabase-js — fetch directo a los
// endpoints GoTrue.
//
// Flujo:
//   1. user pide login con su email → recibe código OTP de 6 dígitos
//   2. user pega el código → /auth/v1/verify devuelve access_token
//   3. validamos contra taller_usuarios (whitelist). Si no está o
//      activo=false, cerramos sesion y devolvemos { ok:false }.
//   4. guardamos sesion + user (con rol/modulos) en localStorage.
//
// Almacenamiento: sesion en localStorage (access_token + refresh_token).

import { buscarUsuarioPorEmail, marcarUltimoLogin } from "./usuarios.js";

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const SESION_KEY = "TALLER_AUTH_SESION";
const BASE_HEADERS = {
  apikey: SUPA_ANON,
  "Content-Type": "application/json",
};

// ── Persistencia ────────────────────────────────────────

function leerSesion() {
  try {
    const s = localStorage.getItem(SESION_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function guardarSesion(s) {
  try { localStorage.setItem(SESION_KEY, JSON.stringify(s)); } catch {}
}

function limpiarSesion() {
  try { localStorage.removeItem(SESION_KEY); } catch {}
}

// ── API pública ─────────────────────────────────────────

// Envía el código OTP al email. Devuelve true si el endpoint respondió
// OK (NO significa que el user lo haya pegado, solo que el correo salió).
// IMPORTANTE: antes de pedirlo, validamos que el email esté en la
// whitelist. Así evitamos mandar correos a cualquiera que se le ocurra
// poner un email random.
export async function pedirMagicLink(email) {
  const e = email.trim().toLowerCase();
  // Pre-check whitelist
  const u = await buscarUsuarioPorEmail(e);
  if (!u || !u.activo) {
    return { ok: false, error: "Email no autorizado. Pedile al admin que te agregue." };
  }
  const path = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : window.location.pathname + "/";
  const redirectTo = window.location.origin + path;
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/otp`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        email: e,
        options: { email_redirect_to: redirectTo },
        create_user: true,
      }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn("pedirMagicLink:", r.status, txt);
      return { ok: false, error: txt };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Verifica el código de 6 dígitos que el user pegó. Como el OTP fue
// solicitado vía /auth/v1/otp (flujo magic-link), el tipo correcto
// para verify es "magiclink" — antes lo teníamos como "email" lo que
// hacía que /verify devolviera error silencioso y el user no avanzara.
export async function verificarCodigo(email, token) {
  const emailL = email.trim().toLowerCase();
  const tokenL = String(token || "").trim();
  // Probamos en orden ambos tipos válidos: 'email' (OTP de signup) y
  // 'magiclink' (OTP que viene con el magic link). Supabase requiere
  // uno específico según cómo se solicitó el código.
  let ultimoError = null;
  for (const type of ["email", "magiclink"]) {
    try {
      const r = await fetch(`${SUPA_URL}/auth/v1/verify`, {
        method: "POST",
        headers: BASE_HEADERS,
        body: JSON.stringify({ email: emailL, token: tokenL, type }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        ultimoError = data?.error_description || data?.msg || data?.message || `HTTP ${r.status}`;
        console.warn(`verify(${type}) HTTP ${r.status}:`, data);
      }
      if (r.ok && data?.access_token) {
        // Validación post-OTP contra la whitelist. Cubre la (rara) race
        // condition donde el admin desactivó al usuario entre pedir el
        // código y pegarlo.
        const wl = await buscarUsuarioPorEmail(emailL);
        if (!wl || !wl.activo) {
          return { ok: false, error: "Email no autorizado." };
        }
        const sesion = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
          token_type: data.token_type || "bearer",
          user: {
            id: data.user?.id,
            email: emailL,
            nombre: wl.nombre,
            rol: wl.rol,
            modulos: wl.modulos || null,
          },
        };
        guardarSesion(sesion);
        marcarUltimoLogin(emailL);
        return { ok: true, sesion };
      }
    } catch (e) {
      console.warn(`verificarCodigo(${type}) falló:`, e?.message || e);
    }
  }
  return {
    ok: false,
    error: traducirErrorAuth(ultimoError) || "Código inválido o vencido. Pedí uno nuevo.",
  };
}

// Traduce los códigos/mensajes que devuelve GoTrue a frases en español
// que el usuario pueda entender. Si no hay match, devuelve null.
function traducirErrorAuth(msg) {
  if (!msg) return null;
  const m = String(msg).toLowerCase();
  if (m.includes("otp_expired") || m.includes("expired") || m.includes("token has expired")) {
    return "El código venció. Pedí uno nuevo.";
  }
  if (m.includes("invalid") && (m.includes("token") || m.includes("otp") || m.includes("code"))) {
    return "Código incorrecto. Revisá los dígitos del email.";
  }
  if (m.includes("rate") && m.includes("limit")) {
    return "Pediste códigos muy seguido. Esperá un minuto y probá de nuevo.";
  }
  if (m.includes("over_email_send_rate_limit")) {
    return "Demasiados códigos enviados. Esperá unos minutos.";
  }
  if (m.includes("email") && m.includes("not") && m.includes("authorized")) {
    return "Email no autorizado. Pedile al admin que te agregue.";
  }
  if (m.startsWith("http ") || /^http \d/.test(m)) {
    return `Error de servidor (${msg}). Probá de nuevo en un momento.`;
  }
  return msg;
}

// Detecta tokens en el hash de la URL (después del redirect del email).
// Si los encuentra, los guarda y limpia el hash. Devuelve la sesión nueva
// o null si no había nada que procesar.
export async function recogerSesionDesdeURL() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token=")) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token) return null;
  const sesion = {
    access_token,
    refresh_token,
    expires_at: parseInt(params.get("expires_at")) || Math.floor(Date.now() / 1000) + 3600,
    token_type: params.get("token_type") || "bearer",
  };
  // Pedir info del user para guardar email
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { ...BASE_HEADERS, Authorization: `Bearer ${access_token}` },
    });
    if (r.ok) {
      const user = await r.json();
      sesion.user = { id: user.id, email: user.email };
    }
  } catch {}
  guardarSesion(sesion);
  // Limpiar el hash sin recargar
  try {
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  } catch {}
  return sesion;
}

// Sincrono: devuelve la sesion guardada SIN tocar la red. Si el token
// expiro, devuelve null. Util para checks rapidos donde no queremos
// bloquear el render. Para casos donde necesitamos garantizar sesion
// valida usa sesionActualConRefresh().
export function sesionActual() {
  const s = leerSesion();
  if (!s) return null;
  if (s.expires_at && s.expires_at * 1000 < Date.now()) {
    return null;
  }
  return s;
}

// Asincrono: si el token expiro pero hay refresh_token, lo usa para
// pedir un access_token nuevo a Supabase. Guarda la sesion renovada
// y la devuelve. Si refresh falla, limpia y devuelve null.
export async function sesionActualConRefresh() {
  const s = leerSesion();
  if (!s) return null;
  const expiradoYa = s.expires_at && s.expires_at * 1000 < Date.now();
  // Si vence en menos de 60 segundos lo renovamos proactivamente para
  // evitar que se venza en medio de una request.
  const proximoAVencer = s.expires_at && s.expires_at * 1000 < Date.now() + 60_000;
  if (!expiradoYa && !proximoAVencer) return s;
  if (!s.refresh_token) {
    limpiarSesion();
    return null;
  }
  const nuevo = await refrescarToken(s.refresh_token);
  if (!nuevo) {
    limpiarSesion();
    return null;
  }
  // Preservamos el user (rol/nombre/modulos) que ya teniamos.
  const sesionNueva = { ...nuevo, user: s.user || nuevo.user };
  guardarSesion(sesionNueva);
  return sesionNueva;
}

// Llama a /auth/v1/token?grant_type=refresh_token con el refresh_token
// guardado para conseguir un access_token nuevo. Devuelve la sesion
// renovada (sin user) o null.
async function refrescarToken(refresh_token) {
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({ refresh_token }),
    });
    if (!r.ok) {
      console.warn("refrescarToken HTTP", r.status);
      return null;
    }
    const data = await r.json();
    if (!data?.access_token) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      token_type: data.token_type || "bearer",
      user: data.user ? { id: data.user.id, email: data.user.email } : undefined,
    };
  } catch (e) {
    console.warn("refrescarToken excepcion:", e?.message || e);
    return null;
  }
}

export async function cerrarSesion() {
  const s = leerSesion();
  if (!s) return true;
  try {
    await fetch(`${SUPA_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { ...BASE_HEADERS, Authorization: `Bearer ${s.access_token}` },
    });
  } catch {}
  limpiarSesion();
  return true;
}
