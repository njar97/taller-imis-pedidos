// Ingreso con huella (WebAuthn, autenticador de plataforma).
//
// Modelo: es un CANDADO LOCAL del dispositivo, no reemplaza al auth de
// Supabase. La sesión (access/refresh token) sigue viva en localStorage;
// la huella solo desbloquea la UI al abrir la app. Si el usuario elige
// "entrar con código por email" desde el candado, se cierra la sesión y
// vuelve el flujo OTP normal.
//
// Registro: navigator.credentials.create() con authenticatorAttachment
// "platform" (sensor del propio teléfono). Guardamos el credentialId en
// localStorage y en cada arranque pedimos navigator.credentials.get()
// con userVerification "required" → el SO muestra el prompt de huella.
//
// Requiere HTTPS (GH Pages ok) y navegador con WebAuthn (Android Chrome,
// iOS 16+). El challenge es aleatorio local: no hay servidor validando
// la firma, el objetivo es que el SO exija la huella, no criptografía
// de extremo a extremo.

const CRED_KEY = "TALLER_HUELLA_CRED"; // { id: base64url, email }

function b64urlToBuf(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function bufToB64url(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function challengeAleatorio() {
  const c = new Uint8Array(32);
  crypto.getRandomValues(c);
  return c;
}

// ¿El dispositivo tiene sensor biométrico utilizable?
export async function soportaHuella() {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function huellaActivada() {
  try { return !!localStorage.getItem(CRED_KEY); } catch { return false; }
}

export function desactivarHuella() {
  try { localStorage.removeItem(CRED_KEY); } catch {}
}

// Registra la credencial en el sensor del dispositivo. Llamar con la
// sesión ya iniciada (necesitamos el email para mostrarlo en el prompt).
export async function activarHuella(email) {
  try {
    const userId = new TextEncoder().encode(email.slice(0, 64));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: challengeAleatorio(),
        rp: { name: "Taller IMIS", id: window.location.hostname },
        user: { id: userId, name: email, displayName: email },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        attestation: "none",
      },
    });
    if (!cred) return { ok: false, error: "No se creó la credencial" };
    localStorage.setItem(CRED_KEY, JSON.stringify({ id: bufToB64url(cred.rawId), email }));
    return { ok: true };
  } catch (e) {
    // NotAllowedError = canceló el prompt; no es un fallo "real".
    const cancelado = e?.name === "NotAllowedError";
    return { ok: false, cancelado, error: e?.message || String(e) };
  }
}

// Pide la huella al SO. Devuelve { ok:true } si el sensor verificó.
export async function verificarHuella() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CRED_KEY) || "null");
    if (!guardado?.id) return { ok: false, error: "Huella no configurada" };
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challengeAleatorio(),
        allowCredentials: [{ type: "public-key", id: b64urlToBuf(guardado.id) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return assertion ? { ok: true } : { ok: false, error: "Sin respuesta del sensor" };
  } catch (e) {
    const cancelado = e?.name === "NotAllowedError";
    return { ok: false, cancelado, error: e?.message || String(e) };
  }
}
