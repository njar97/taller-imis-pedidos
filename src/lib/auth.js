// Wrapper liviano de Supabase Auth. No dependemos del SDK completo
// porque la app no usa @supabase/supabase-js — fetch directo a los
// endpoints GoTrue.
//
// Flujo de magic link:
//   1. user pide login con su email
//   2. Supabase manda email con link tipo:
//      https://<proyecto>.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=<URL>
//   3. user clickea el link → Supabase verifica → redirige a redirect_to
//      con #access_token=... en el hash
//   4. al cargar la app, parseamos el hash, guardamos sesion, limpiamos URL
//
// Almacenamiento: sesion en localStorage (access_token + refresh_token).

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

// Envía el magic link al email. Devuelve true si el endpoint respondió OK
// (NO significa que el user haya clickeado, solo que el correo se mandó).
export async function pedirMagicLink(email) {
  // Mandamos email con token OTP (6 dígitos). El email también incluye
  // un link como fallback, pero por defecto el flujo es pegar el código.
  // Esto evita los problemas de redirección con GH Pages.
  const path = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : window.location.pathname + "/";
  const redirectTo = window.location.origin + path;
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/otp`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
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

// Verifica el código de 6 dígitos que el user pegó. Si OK, guarda
// la sesión y devuelve { ok: true }. Si el código es inválido o
// expiró, devuelve { ok: false, error: msg }.
export async function verificarCodigo(email, token) {
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/verify`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        token: String(token || "").trim(),
        type: "email",
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false, error: data?.error_description || data?.msg || "Código inválido" };
    }
    const sesion = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      token_type: data.token_type || "bearer",
      user: data.user ? { id: data.user.id, email: data.user.email } : undefined,
    };
    guardarSesion(sesion);
    return { ok: true, sesion };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
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

export function sesionActual() {
  const s = leerSesion();
  if (!s) return null;
  // Expirada
  if (s.expires_at && s.expires_at * 1000 < Date.now()) {
    // TODO: intentar refresh con refresh_token (Paso 2)
    limpiarSesion();
    return null;
  }
  return s;
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
