// Cliente liviano de Supabase Realtime — sin dependencias.
// Usa WebSocket directo al endpoint Phoenix Channels.
//
// Uso desde main.js:
//
//   import { suscribirCambios } from "./lib/realtime.js";
//
//   useEffect(() => {
//     const sub = suscribirCambios(
//       ["pedidos","bordados","cuellos","clientes","catalogo"],
//       (tabla) => refrescar(),  // tabla del evento, llamar refrescar
//     );
//     return () => sub.cerrar();
//   }, []);
//
// Características:
//  - Reconecta automáticamente con backoff exponencial (max 30s).
//  - Heartbeat cada 30s para mantener viva la conexión.
//  - Debounce del onChange (300ms) — varios eventos seguidos = 1 sola llamada.
//  - Si la pestaña queda inactiva (visibilitychange → hidden), cierra el WS
//    para no gastar batería. Cuando vuelve a visible, abre uno nuevo.

const SUPA_HOST = "kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

const WS_URL = `wss://${SUPA_HOST}/realtime/v1/websocket?apikey=${SUPA_ANON}&vsn=1.0.0`;

const HEARTBEAT_MS = 30000;
const RECONNECT_INITIAL_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const DEBOUNCE_MS = 300;

export function suscribirCambios(tablas, onChange) {
  let ws = null;
  let ref = 0;
  let heartbeat = null;
  let reconnectTimer = null;
  let reconnectDelay = RECONNECT_INITIAL_MS;
  let debounceTimer = null;
  let cerrado = false;
  let onVisibility = null;

  const nextRef = () => String(++ref);

  const emitir = (tabla) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => onChange(tabla), DEBOUNCE_MS);
  };

  const abrir = () => {
    if (cerrado) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      // Pestaña oculta — no abrir, esperar a que vuelva a visible.
      return;
    }
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.warn("Realtime: no pude abrir WS:", e.message);
      programarReconexion();
      return;
    }

    ws.addEventListener("open", () => {
      reconnectDelay = RECONNECT_INITIAL_MS;
      // Suscribir a cada tabla.
      tablas.forEach(t => {
        ws.send(JSON.stringify({
          topic: `realtime:public:${t}`,
          event: "phx_join",
          payload: {
            config: {
              postgres_changes: [{ event: "*", schema: "public", table: t }],
            },
            access_token: SUPA_ANON,
          },
          ref: nextRef(),
        }));
      });
      // Heartbeat.
      heartbeat = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            topic: "phoenix",
            event: "heartbeat",
            payload: {},
            ref: nextRef(),
          }));
        }
      }, HEARTBEAT_MS);
    });

    ws.addEventListener("message", (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      // Evento de cambio postgres.
      if (msg.event === "postgres_changes" && msg.payload && msg.payload.data) {
        const tabla = msg.payload.data.table;
        if (tabla) emitir(tabla);
      }
    });

    ws.addEventListener("close", () => {
      if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
      ws = null;
      if (!cerrado) programarReconexion();
    });

    ws.addEventListener("error", () => {
      // El close handler se encarga de reconectar.
    });
  };

  const programarReconexion = () => {
    if (cerrado || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
      abrir();
    }, reconnectDelay);
  };

  // Pausar/reanudar según visibilidad de la pestaña.
  if (typeof document !== "undefined") {
    onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (ws) {
          try { ws.close(); } catch {}
          ws = null;
        }
        if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      } else if (!ws) {
        reconnectDelay = RECONNECT_INITIAL_MS;
        abrir();
        // También dispara un refresh inmediato — la app probablemente perdió eventos
        // mientras estaba escondida.
        emitir("*");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
  }

  abrir();

  return {
    cerrar: () => {
      cerrado = true;
      if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
      if (heartbeat) clearInterval(heartbeat);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (ws) { try { ws.close(); } catch {} }
    },
  };
}
