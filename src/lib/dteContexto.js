// Orquestación de la facturación DTE: junta la config del bridge (taller_config),
// el token (localStorage) y la empresa emisora predeterminada (dte_empresas) en
// un solo "contexto" que la UI consume. Cacheado en memoria para no re-fetchear
// en cada apertura de un pedido; se invalida al cambiar la config.

import { leerConfigTotal, guardarConfig } from "./config.js";
import { leerEmpresas, empresaPredeterminada } from "./dteEmpresas.js";
import { normalizarBridgeUrl, leerTokenDTE } from "./dte.js";

const CFG_KEY = "dte_bridge_url";
let _cache = null;

// Extrae la URL del bridge de la config (tolera string o {url}).
export function bridgeUrlDeConfig(cfg) {
  const v = cfg?.[CFG_KEY];
  return normalizarBridgeUrl(typeof v === "string" ? v : (v?.url || ""));
}

// Devuelve {bridgeUrl, token, empresa, empresas}. forzar=true ignora el cache.
export async function cargarFacturacion(forzar = false) {
  if (_cache && !forzar) return _cache;
  const [cfg, empresas] = await Promise.all([leerConfigTotal(), leerEmpresas()]);
  _cache = {
    bridgeUrl: bridgeUrlDeConfig(cfg),
    token: leerTokenDTE(),
    empresa: empresaPredeterminada(empresas),
    empresas,
  };
  return _cache;
}

export function invalidarFacturacion() {
  _cache = null;
}

export async function guardarBridgeUrl(url) {
  const ok = await guardarConfig(CFG_KEY, normalizarBridgeUrl(url));
  invalidarFacturacion();
  return ok;
}
