// Invitaciones por link. El admin genera un token unico con rol +
// modulos pre-asignados; el invitado abre la URL ?invite=TOKEN, deja
// su email, recibe OTP, y queda registrado automaticamente en
// taller_usuarios con esa configuracion.

import { withRetry } from "./retry.js";

const SUPA_URL  = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const REST = SUPA_URL + "/rest/v1";
const HEADERS = {
  apikey: SUPA_ANON,
  Authorization: "Bearer " + SUPA_ANON,
  "Content-Type": "application/json",
};

// Token corto, urlsafe, 96 bits de entropia.
function nuevoToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function urlInvitacion(token) {
  const base = window.location.origin + window.location.pathname;
  const con = base.endsWith("/") ? base : base + "/";
  return `${con}?invite=${encodeURIComponent(token)}`;
}

export async function leerInvitaciones() {
  try {
    const r = await withRetry(() => fetch(
      `${REST}/taller_invitaciones?select=*&order=creada_en.desc`,
      { headers: HEADERS }
    ));
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.warn("leerInvitaciones fallo:", e.message);
    return [];
  }
}

// Estado calculado de una invitacion en base a sus timestamps + revocada.
export function estadoInvitacion(inv) {
  if (inv.revocada) return "revocada";
  if (inv.usado_en) return "usada";
  if (new Date(inv.vence_en) < new Date()) return "vencida";
  return "activa";
}

export async function generarInvitacion({ rol, modulos, nombre, diasValidez }) {
  try {
    const body = {
      token: nuevoToken(),
      rol: rol === "admin" ? "admin" : "operario",
      modulos: (Array.isArray(modulos) && modulos.length > 0) ? modulos : null,
      nombre_sugerido: (nombre || "").trim() || null,
      vence_en: new Date(Date.now() + (diasValidez || 7) * 86400000).toISOString(),
    };
    const r = await fetch(`${REST}/taller_invitaciones`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: txt };
    }
    const rows = await r.json();
    const inv = Array.isArray(rows) ? rows[0] : rows;
    return { ok: true, invitacion: inv, link: urlInvitacion(inv.token) };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function revocarInvitacion(id) {
  try {
    const r = await fetch(`${REST}/taller_invitaciones?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ revocada: true }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Busca la invitacion por token. Devuelve { ok, invitacion, estado } o
// { ok:false, error }.
export async function buscarInvitacionPorToken(token) {
  if (!token) return { ok: false, error: "Token vacio" };
  try {
    const r = await fetch(
      `${REST}/taller_invitaciones?select=*&token=eq.${encodeURIComponent(token)}&limit=1`,
      { headers: HEADERS }
    );
    if (!r.ok) return { ok: false, error: "Error al buscar invitacion" };
    const rows = await r.json();
    const inv = rows[0];
    if (!inv) return { ok: false, error: "Invitacion no encontrada" };
    const estado = estadoInvitacion(inv);
    if (estado !== "activa") {
      return { ok: false, error: `Invitacion ${estado}`, estado, invitacion: inv };
    }
    return { ok: true, invitacion: inv, estado };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Crea el usuario en taller_usuarios con los datos de la invitacion,
// marca la invitacion como usada. Idempotente: si el email ya estaba
// en la whitelist, lo reactiva con los nuevos datos.
export async function aceptarInvitacion(token, email) {
  const emailL = (email || "").trim().toLowerCase();
  if (!emailL) return { ok: false, error: "Email vacio" };
  const r = await buscarInvitacionPorToken(token);
  if (!r.ok) return r;
  const inv = r.invitacion;
  // Upsert del usuario
  const body = {
    email: emailL,
    nombre: inv.nombre_sugerido || null,
    rol: inv.rol,
    modulos: inv.modulos,
    activo: true,
  };
  try {
    const upsert = await fetch(`${REST}/taller_usuarios?on_conflict=email`, {
      method: "POST",
      headers: {
        ...HEADERS,
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(body),
    });
    if (!upsert.ok) {
      const txt = await upsert.text().catch(() => "");
      return { ok: false, error: `No pude crear usuario: ${txt}` };
    }
    // Marcar invitacion como usada
    await fetch(`${REST}/taller_invitaciones?id=eq.${inv.id}`, {
      method: "PATCH",
      headers: { ...HEADERS, Prefer: "return=minimal" },
      body: JSON.stringify({ usado_en: new Date().toISOString(), usado_por_email: emailL }),
    });
    return { ok: true, invitacion: inv };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}
