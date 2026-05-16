// Cliente del Apps Script (Google Sheets + Drive como backend).
// Endpoint público — corre con permisos del owner del Apps Script.

import { pushToast } from "./feedback.js";

export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyam7Sk6hstowABIbcEsH7zEJ46eIWNKIRCrm-xmkYCqdC0QF1x0QdGo5qBYo8zU18/exec";

export async function fetchConTimeout(url, opts = {}, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── Pedidos (Confección) ──────────────────────────

export async function gsLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getAll");
    const d = await r.json();
    if (d.error) console.error("gsLeer error:", d.error);
    return d.pedidos || [];
  } catch (e) {
    console.error("gsLeer fetch error:", e);
    return [];
  }
}

export async function gsGuardar(p) {
  const pLimpio = {
    ...p,
    imagenes: (p.imagenes || []).map(img => ({
      nombre: img.nombre,
      tipo: img.tipo,
      driveUrl: img.driveUrl || null,
      driveId: img.driveId || null,
      supabaseUrl: img.supabaseUrl || null,
      supabasePath: img.supabasePath || null,
    })),
  };
  await fetchConTimeout(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "save", data: pLimpio }),
  });
}

export async function gsBorrar(id) {
  await fetchConTimeout(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "delete", id }),
  });
}

// ── Bordados ──────────────────────────────────────

export async function gsBordLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getBordados");
    const d = await r.json();
    return d.bordados || [];
  } catch {
    return [];
  }
}

export async function gsBordGuardar(b) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "saveBordado", data: b }),
    });
  } catch (e) {
    console.error("gsBordGuardar:", e);
    pushToast("No pude guardar el bordado en el servidor", "error");
  }
}

export async function gsBordBorrar(id) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "deleteBordado", id }),
    });
  } catch (e) {
    console.error("gsBordBorrar:", e);
    pushToast("No pude eliminar el bordado en el servidor", "error");
  }
}

// ── Cuellos ───────────────────────────────────────

export async function gsCuelLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getCuellos");
    const d = await r.json();
    return d.cuellos || [];
  } catch {
    return [];
  }
}

export async function gsCuelGuardar(c) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "saveCuello", data: c }),
    });
  } catch (e) {
    console.error("gsCuelGuardar:", e);
    pushToast("No pude guardar el cuello en el servidor", "error");
  }
}

export async function gsCuelBorrar(id) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "deleteCuello", id }),
    });
  } catch (e) {
    console.error("gsCuelBorrar:", e);
    pushToast("No pude eliminar el cuello en el servidor", "error");
  }
}

// ── Clientes ──────────────────────────────────────

export async function gsClientesLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getClientes");
    const d = await r.json();
    return d.clientes || [];
  } catch {
    return [];
  }
}

export async function gsClientesGuardar(cli) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "saveCliente", data: cli }),
    });
  } catch (e) {
    console.error("gsClientesGuardar:", e);
  }
}

export async function gsClientesBorrar(id) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "deleteCliente", id }),
    });
  } catch (e) {
    console.error("gsClientesBorrar:", e);
    pushToast("No pude eliminar el cliente en el servidor", "error");
  }
}

// ── Subida a Drive (legacy — fotos nuevas van a Supabase) ─

export async function subirImagenADrive(img, modulo, cliente, clienteConf) {
  if (img.driveUrl) return { img, ok: true };
  if (!img.data) return { img, ok: false, err: "Sin datos locales" };
  try {
    const r = await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "uploadImage",
        base64: img.data,
        nombre: img.nombre,
        tipo: img.tipo,
        modulo: modulo || "confeccion",
        cliente: cliente || "Sin cliente",
        clienteConf: clienteConf || null,
      }),
    }, 60000);
    if (!r.ok) return { img, ok: false, err: "HTTP " + r.status };
    const d = await r.json();
    if (d.ok) return { img: { ...img, driveUrl: d.url, driveId: d.id }, ok: true };
    return { img, ok: false, err: d.error || "Drive rechazó el archivo" };
  } catch (e) {
    return { img, ok: false, err: e.message };
  }
}

export async function subirEmbADrive(file, cliente, clienteConf, nombreSugerido) {
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const base64 = e.target.result.split(",")[1];
        const r = await fetchConTimeout(SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            action: "uploadImage",
            base64,
            nombre: nombreSugerido
              ? nombreSugerido.replace(/[\/\\:*?"<>|]/g, "").substring(0, 80) + "." + file.name.split(".").pop().toLowerCase()
              : file.name,
            tipo: "application/octet-stream",
            modulo: "bordados",
            cliente: cliente || "Sin cliente",
            clienteConf: clienteConf || null,
          }),
        }, 60000);
        const d = await r.json();
        if (d.ok) res({ ok: true, url: d.url, id: d.id, nombre: file.name });
        else res({ ok: false, err: d.error || "Error Drive" });
      } catch (e) {
        res({ ok: false, err: e.message });
      }
    };
    reader.onerror = () => res({ ok: false, err: "Error leyendo archivo" });
    reader.readAsDataURL(file);
  });
}
