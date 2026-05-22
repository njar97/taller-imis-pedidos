// Switch para activar/desactivar push notifications.
// Aparece en el sidebar (admin) y en la topbar mobile.
//
// Estados:
//   - unsupported: el browser no soporta push (iOS sin PWA instalada,
//     navegador viejo) → no mostramos el switch
//   - denied: el user ya negó → mostramos un hint para arreglarlo en
//     ajustes del navegador
//   - default: nunca pidió → switch en off
//   - granted + suscrito: switch en on (verde)

import { useEffect, useState } from "react";
import {
  pushSoportado,
  estadoPermiso,
  activarPush,
  desactivarPush,
  suscripcionActiva,
} from "./lib/pushSubs.js";
import { pushToast } from "./lib/feedback.js";

export default function PushSwitch({ compact = false }) {
  const [estado, setEstado] = useState("loading"); // loading | unsupported | denied | off | on
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      if (!pushSoportado) {
        if (activo) setEstado("unsupported");
        return;
      }
      const p = estadoPermiso();
      if (p === "denied") {
        if (activo) setEstado("denied");
        return;
      }
      const sub = await suscripcionActiva();
      if (activo) setEstado(sub ? "on" : "off");
    })();
    return () => { activo = false; };
  }, []);

  if (estado === "loading" || estado === "unsupported") return null;

  const onClick = async () => {
    if (trabajando) return;
    setTrabajando(true);
    try {
      if (estado === "denied") {
        pushToast("Habilitalo desde Ajustes del navegador → Notificaciones", "info", 5000);
      } else if (estado === "on") {
        const ok = await desactivarPush();
        if (ok) { setEstado("off"); pushToast("Notificaciones desactivadas", "success"); }
      } else {
        const sub = await activarPush();
        if (sub) { setEstado("on"); pushToast("🔔 Notificaciones activadas", "success"); }
        else {
          const p = estadoPermiso();
          if (p === "denied") {
            setEstado("denied");
            pushToast("Permiso denegado. Cambialo desde Ajustes → Notificaciones", "error", 5000);
          } else {
            pushToast("No se pudo activar", "error");
          }
        }
      }
    } finally {
      setTrabajando(false);
    }
  };

  const activo = estado === "on";
  const negado = estado === "denied";
  const label = activo ? "Notificaciones ON" : negado ? "Notificaciones (denegadas)" : "Notificaciones OFF";

  if (compact) {
    return (
      <button
        onClick={onClick}
        title={negado ? "Permiso denegado — cambiá en ajustes del navegador" : (activo ? "Tocar para desactivar" : "Tocar para activar push")}
        style={{
          background: activo ? "rgba(40,167,69,0.25)" : "rgba(255,255,255,0.1)",
          border: "1px solid " + (activo ? "#28A745" : negado ? "#E67E22" : "#3a1f6b"),
          color: activo ? "#7ee59a" : negado ? "#E67E22" : "#CE93D8",
          width: 40, height: 40, borderRadius: 8,
          fontSize: 16, cursor: trabajando ? "wait" : "pointer",
          opacity: trabajando ? 0.5 : 1, fontFamily: "inherit",
        }}
      >
        {activo ? "🔔" : "🔕"}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "7px",
        borderRadius: 8,
        border: "1px solid " + (activo ? "#28A745" : negado ? "#E67E22" : "#3a1f6b"),
        background: activo ? "rgba(40,167,69,0.15)" : negado ? "rgba(230,126,34,0.10)" : "transparent",
        color: activo ? "#7ee59a" : negado ? "#E67E22" : "#9B59B6",
        cursor: trabajando ? "wait" : "pointer",
        fontSize: 11, marginBottom: 6, fontWeight: 700, fontFamily: "inherit",
        opacity: trabajando ? 0.6 : 1,
      }}
    >
      {activo ? "🔔" : "🔕"} {label}
    </button>
  );
}
