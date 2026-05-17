// Indicadores de estado de conexión y actualización del service worker.
//   - OfflineBanner: barra arriba cuando navigator.onLine === false.
//   - UpdatePrompt: toast cuando el SW nuevo está listo (registerType:'prompt').
//
// Se renderiza una sola vez (al lado del Toaster) en App.

import { aplicarUpdate, subscribirseUpdate } from "./lib/sw.js";

const { useEffect, useState } = React;

function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function useUpdateAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => subscribirseUpdate(setAvailable), []);
  return available;
}

export default function ConexionStatus() {
  const online = useOnline();
  const updateAvailable = useUpdateAvailable();
  const [updateDismissed, setUpdateDismissed] = useState(false);

  return (
    <>
      {!online && <OfflineBanner />}
      {updateAvailable && !updateDismissed && (
        <UpdatePrompt
          onUpdate={aplicarUpdate}
          onDismiss={() => setUpdateDismissed(true)}
        />
      )}
    </>
  );
}

function OfflineBanner() {
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: "#856404",
        color: "#FFF8E1",
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 700,
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        paddingTop: "calc(6px + env(safe-area-inset-top))",
      }}
    >
      ⚠️ Sin conexión — los cambios se guardarán cuando vuelva la red
    </div>
  );
}

function UpdatePrompt({ onUpdate, onDismiss }) {
  return (
    <div
      role="alertdialog"
      aria-label="Nueva versión disponible"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 10000,
        maxWidth: 420,
        margin: "0 auto",
        background: "#2C1654",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}
    >
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
        <div style={{ fontWeight: 800, marginBottom: 2 }}>
          🚀 Nueva versión disponible
        </div>
        <div style={{ fontSize: 11, opacity: 0.85 }}>
          Recargá para aplicar los cambios
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        Después
      </button>
      <button
        onClick={onUpdate}
        style={{
          background: "#fff",
          border: "none",
          color: "#2C1654",
          padding: "8px 14px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        Recargar
      </button>
    </div>
  );
}
