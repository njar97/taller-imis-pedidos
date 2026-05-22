// Barra superior (mobile). Visible solo en mobile (.topbar-mobile via CSS).
// Muestra nombre del taller + rol + sync, "Por cobrar" si es admin,
// tarjeta con cuenta de pedidos activos, y botón de refrescar.

import { TALLER } from "./lib/constants.js";
import { fmt$ } from "./lib/dominio.js";
import PushSwitch from "./PushSwitch.jsx";

export default function TopbarMobile({
  esAdmin,
  sync,
  syncInfo,
  porCobrar,
  activos,
  refrescar,
  refrescando,
  onAbrirEstimador,
}) {
  const muestraSync =
    (sync === "ok" || sync === "error" || sync === "error_fotos") && syncInfo;
  return (
    <div
      className="topbar-mobile"
      style={{
        display: "none",
        background: "#2C1654",
        padding: "10px 16px",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
          {TALLER}
        </div>
        <div style={{ fontSize: 10, color: "#9B59B6" }}>
          {esAdmin ? "🔐 Admin" : "✂️ Operario"}
          {muestraSync ? ` · ${syncInfo.t}` : ""}
        </div>
      </div>
      {esAdmin && (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#28A745", fontWeight: 700 }}>
            {fmt$(porCobrar)}
          </div>
          <div style={{ fontSize: 9, color: "#9B59B6" }}>Por cobrar</div>
        </div>
      )}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: 8,
          padding: "6px 10px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: "#CE93D8" }}>
          {activos}
        </div>
        <div style={{ fontSize: 9, color: "#9B59B6" }}>activos</div>
      </div>
      {onAbrirEstimador && (
        <button
          onClick={onAbrirEstimador}
          title="Estimador de precio"
          style={{
            background: "rgba(40, 167, 69, 0.25)",
            border: "1px solid #28A745",
            color: "#7ee59a",
            width: 40,
            height: 40,
            borderRadius: 8,
            fontSize: 18,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          💰
        </button>
      )}
      <PushSwitch compact />
      <button
        onClick={refrescar}
        disabled={refrescando}
        title="Actualizar datos"
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "none",
          color: "#CE93D8",
          width: 40,
          height: 40,
          borderRadius: 8,
          fontSize: 18,
          cursor: refrescando ? "default" : "pointer",
          opacity: refrescando ? 0.5 : 1,
        }}
      >
        {refrescando ? "⏳" : "🔄"}
      </button>
    </div>
  );
}
