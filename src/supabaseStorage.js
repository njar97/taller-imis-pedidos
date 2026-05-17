// Cliente liviano para Supabase Storage — sin dependencias.
// Usa fetch directo a la REST API de Storage.
// Bucket: taller-imis-fotos (público).
//
// Las subidas reintentan automáticamente en errores transitorios
// (red caída, 5xx, 429) con backoff exponencial. Ver withRetry.

import { withRetry } from "./lib/retry.js";

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
const BUCKET = "taller-imis-fotos";

/**
 * Sube una imagen JPEG a Supabase Storage.
 * @param {string} dataUrl - base64 data URL (data:image/jpeg;base64,...)
 * @param {string} nombre - nombre original del archivo (sólo para preservar)
 * @param {string} modulo - "confeccion" | "bordados" | "cuellos"
 * @param {string} cliente - nombre del cliente (slugificado en el path)
 * @returns {Promise<{ok: boolean, url?: string, path?: string, err?: string}>}
 */
export async function subirFotoSupabase(dataUrl, nombre, modulo = "confeccion", cliente = "Sin cliente") {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return { ok: false, err: "data URL inválida" };

  const ext = (nombre || "").split(".").pop().toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const slug = slugify(cliente);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${modulo}/${slug}/${ts}-${rand}.${safeExt}`;
  const url = `${SUPA_URL}/storage/v1/object/${BUCKET}/${path}`;
  // URL pública (bucket público — accesible sin auth)
  const publicUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  return withRetry(
    async () => {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPA_ANON}`,
          "apikey": SUPA_ANON,
          "Content-Type": blob.type || "image/jpeg",
          "x-upsert": "false",
        },
        body: blob,
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
      }
      return { ok: true, url: publicUrl, path };
    },
    { onRetry: (err, i) => console.warn(`subirFotoSupabase reintento ${i}:`, err.message) }
  ).catch(e => ({ ok: false, err: e.message || String(e) }));
}

/**
 * Sube un archivo binario (File) directamente a Supabase Storage.
 * Pensado para diseños de bordado (.emb, .dst, .pes, .jef) — no comprime,
 * sube tal cual. Devuelve { ok, url, path } igual que subirFotoSupabase.
 *
 * @param {File} file - File del input.
 * @param {string} modulo - "bordados-files" | "cuellos-files" | etc.
 * @param {string} cliente - nombre del cliente (slugificado en el path).
 */
export async function subirArchivoSupabase(file, modulo, cliente = "sin-cliente") {
  if (!file) return { ok: false, err: "Sin archivo" };
  const ext = (file.name || "").split(".").pop().toLowerCase() || "bin";
  const slug = slugify(cliente);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${modulo}/${slug}/${ts}-${rand}.${ext}`;
  const url = `${SUPA_URL}/storage/v1/object/${BUCKET}/${path}`;
  const publicUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  return withRetry(
    async () => {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPA_ANON}`,
          apikey: SUPA_ANON,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: file,
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
      }
      return { ok: true, url: publicUrl, path };
    },
    { onRetry: (err, i) => console.warn(`subirArchivoSupabase reintento ${i}:`, err.message) }
  ).catch(e => ({ ok: false, err: e.message || String(e) }));
}

/**
 * Elimina una foto del bucket. Necesita el path (no la URL completa).
 */
export async function borrarFotoSupabase(path) {
  try {
    const url = `${SUPA_URL}/storage/v1/object/${BUCKET}/${path}`;
    const r = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${SUPA_ANON}`,
        "apikey": SUPA_ANON,
      },
    });
    return { ok: r.ok };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

// ── helpers ──

function dataUrlToBlob(dataUrl) {
  try {
    const [header, base64] = dataUrl.split(",");
    if (!base64) return null;
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bin = atob(base64);
    const len = bin.length;
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: mime });
  } catch {
    return null;
  }
}

function slugify(s) {
  return (s || "sin-cliente")
    .toString()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // sin tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "sin-cliente";
}
