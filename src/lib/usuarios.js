// Whitelist de usuarios autorizados a entrar en la app.
// Toda persona que entre con email/OTP debe estar en taller_usuarios
// con activo=true. Si no, se rechaza el login.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

const normEmail = e => (e || "").trim().toLowerCase();

export async function leerUsuarios() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_usuarios?select=*&order=rol.desc,nombre.asc.nullslast,email.asc`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("leerUsuarios falló:", e.message);
    return [];
  }
}

// Busca un usuario por email. Devuelve el row o null. Usado por auth.js
// post-OTP para decidir si dejamos pasar al usuario.
export async function buscarUsuarioPorEmail(email) {
  const e = normEmail(email);
  if (!e) return null;
  try {
    const r = await fetch(
      `${REST}/taller_usuarios?select=*&email=eq.${encodeURIComponent(e)}&limit=1`,
      { headers: HEADERS }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows[0] || null;
  } catch (e) {
    console.warn("buscarUsuarioPorEmail falló:", e.message);
    return null;
  }
}

export async function guardarUsuario(u) {
  try {
    const body = {
      email: normEmail(u.email),
      nombre: (u.nombre || "").trim() || null,
      rol: u.rol === "admin" ? "admin" : "operario",
      modulos: (Array.isArray(u.modulos) && u.modulos.length > 0) ? u.modulos : null,
      activo: u.activo !== false,
    };
    if (!body.email) return { ok: false, error: "Email vacío" };
    const url = u.id
      ? `${REST}/taller_usuarios?id=eq.${u.id}`
      : `${REST}/taller_usuarios`;
    const method = u.id ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: txt };
    }
    const rows = await r.json();
    return { ok: true, usuario: Array.isArray(rows) ? rows[0] : rows };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function borrarUsuario(id) {
  try {
    const r = await fetch(`${REST}/taller_usuarios?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ activo: false }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Marca ultimo_login al entrar — útil para que el admin vea quién
// está activo. Fire-and-forget, no bloquea el login.
export async function marcarUltimoLogin(email) {
  const e = normEmail(email);
  if (!e) return;
  try {
    await fetch(
      `${REST}/taller_usuarios?email=eq.${encodeURIComponent(e)}`,
      {
        method: "PATCH",
        headers: { ...HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({ ultimo_login: new Date().toISOString() }),
      }
    );
  } catch {}
}
