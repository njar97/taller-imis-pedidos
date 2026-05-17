// Banner sutil que invita al usuario a instalar la app como PWA.
//   - Android/Chrome: captura `beforeinstallprompt` y lo dispara con un botón.
//   - iOS Safari: muestra modal con instrucciones manuales (no soporta el event).
//   - Si ya está en standalone mode (instalada y abierta), no muestra nada.
//   - "No volver a mostrar" se persiste en localStorage.
//
// Se renderiza junto al ConexionStatus en App.

const { useEffect, useState } = React;

const DISMISS_KEY = "taller_install_dismissed";

function esIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function esStandalone() {
  // iOS Safari expone navigator.standalone; el resto usa el media query.
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  return !!window.navigator.standalone;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1"
  );
  const [iosModal, setIosModal] = useState(false);
  const [hidden, setHidden] = useState(esStandalone() || dismissed);

  // Captura el evento de Android/Chrome para disparar el prompt nativo más tarde.
  useEffect(() => {
    if (hidden) return;
    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferred(e);
    }
    function onInstalled() {
      // App se instaló — ocultar todo y limpiar
      setHidden(true);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [hidden]);

  if (hidden) return null;

  const puedeMostrarBoton = !!deferred || esIOS();
  if (!puedeMostrarBoton) return null;

  const guardarDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setHidden(true);
  };

  const instalar = async () => {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setHidden(true);
      }
      setDeferred(null);
    } else if (esIOS()) {
      setIosModal(true);
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 9998,
          maxWidth: 420,
          margin: "0 auto",
          background: "#fff",
          color: "#2C1654",
          padding: "12px 14px",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          border: "1.5px solid #ede5ff",
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ fontSize: 22, flexShrink: 0 }}>📱</div>
        <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
          <div style={{ fontWeight: 800 }}>Instalar como app</div>
          <div style={{ fontSize: 11, color: "#888" }}>
            Acceso rápido desde la pantalla de inicio
          </div>
        </div>
        <button
          onClick={guardarDismiss}
          style={{
            background: "none",
            border: "none",
            color: "#bbb",
            padding: "6px 8px",
            cursor: "pointer",
            fontSize: 12,
            flexShrink: 0,
          }}
          aria-label="No mostrar más"
        >
          ✕
        </button>
        <button
          onClick={instalar}
          style={{
            background: "#9B59B6",
            border: "none",
            color: "#fff",
            padding: "9px 14px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          Instalar
        </button>
      </div>

      {iosModal && <IOSInstrucciones onClose={() => setIosModal(false)} />}
    </>
  );
}

function IOSInstrucciones({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 24,
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 6 }}>📲</div>
        <h3 style={{ margin: "0 0 12px", color: "#2C1654", fontSize: 17 }}>
          Instalar en iPhone
        </h3>
        <ol
          style={{
            textAlign: "left",
            color: "#444",
            fontSize: 14,
            lineHeight: 1.7,
            padding: "0 0 0 20px",
            margin: "0 0 16px",
          }}
        >
          <li>
            Tocá el botón <strong>Compartir</strong>{" "}
            <span aria-label="ícono compartir">⬆️</span> en Safari
          </li>
          <li>
            Bajá y elegí <strong>"Añadir a pantalla de inicio"</strong>
          </li>
          <li>
            Confirmá con <strong>"Añadir"</strong>
          </li>
        </ol>
        <button
          onClick={onClose}
          style={{
            background: "#9B59B6",
            border: "none",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            width: "100%",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
