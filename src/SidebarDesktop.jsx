// Sidebar fijo (desktop). En mobile se oculta vía CSS (.sidebar-desktop).
// Tres bloques:
//   1) Header con nombre del taller + badge de rol + estado de sync.
//   2) Lista de navegación (recibe NAV ya filtrado por rol).
//   3) Panel inferior con métricas + refrescar + cerrar sesión.
//
// Las métricas (activos, porCobrar, alertaCF, matAgotados) las calcula App
// y se pasan como props.

import { TALLER } from "./lib/constants.js";
import { fmt$ } from "./lib/dominio.js";
import PushSwitch from "./PushSwitch.jsx";

function NavButton({ item, activo, bloqueado, matAgotados, esAdmin, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 10px",
        borderRadius: 8,
        border: "none",
        background: activo ? "rgba(155,89,182,0.25)" : "transparent",
        color: bloqueado ? "#3a2060" : activo ? "#CE93D8" : "#bbb",
        cursor: bloqueado ? "default" : "pointer",
        fontSize: 12,
        fontWeight: activo ? 700 : 400,
        textAlign: "left",
        marginBottom: 2,
      }}
    >
      <span>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.id === "inventario" && matAgotados > 0 && !bloqueado && (
        <span
          style={{
            fontSize: 10,
            background: "#DC3545",
            color: "#fff",
            padding: "1px 5px",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          ⚠️
        </span>
      )}
      {item.pronto && (
        <span
          style={{
            fontSize: 9,
            background: "#3a1f6b",
            color: "#555",
            padding: "2px 5px",
            borderRadius: 8,
          }}
        >
          PRONTO
        </span>
      )}
      {item.soloAdmin && !esAdmin && !item.pronto && (
        <span
          style={{
            fontSize: 9,
            background: "#3a1f6b",
            color: "#555",
            padding: "2px 5px",
            borderRadius: 8,
          }}
        >
          🔐
        </span>
      )}
    </button>
  );
}

export default function SidebarDesktop({
  esAdmin,
  sync,
  syncInfo,
  nav,
  seccion,
  setSec,
  matAgotados,
  activos,
  porCobrar,
  alertaCF,
  refrescar,
  refrescando,
  setRol,
  modoProduccion,
  setModoProduccion,
  onAbrirEstimador,
  sesionEmail,
  sesionUser,
  onCerrarSesion,
}) {
  const muestraSync =
    (sync === "ok" || sync === "error" || sync === "error_fotos") && syncInfo;
  return (
    <aside
      className="sidebar-desktop"
      style={{
        width: 196,
        height: "100vh",
        background: "#2C1654",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "20px 16px 12px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            color: "#9B59B6",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {TALLER}
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "Georgia,serif",
            lineHeight: 1.3,
          }}
        >
          Sistema de<br />Pedidos
        </div>
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              fontSize: 10,
              background: esAdmin ? "#9B59B6" : "#3a1f6b",
              color: "#fff",
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 700,
            }}
          >
            {esAdmin ? "🔐 Admin" : "✂️ Operario"}
          </span>
        </div>
        {muestraSync && (
          <div
            style={{
              fontSize: 10,
              color: syncInfo.c,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {syncInfo.t}
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: "4px 8px", overflowY: "auto", minHeight: 0 }}>
        {nav.map(item => {
          const bloqueado = item.pronto || (item.soloAdmin && !esAdmin);
          const activo = seccion === item.id;
          return (
            <NavButton
              key={item.id}
              item={item}
              activo={activo}
              bloqueado={bloqueado}
              matAgotados={matAgotados}
              esAdmin={esAdmin}
              onClick={() => !bloqueado && setSec(item.id)}
            />
          );
        })}
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid #3a1f6b", overflowY: "auto", flexShrink: 0, maxHeight: "55vh" }}>
        <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>
          Pedidos activos
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#CE93D8",
            marginBottom: 6,
          }}
        >
          {activos}
        </div>
        {esAdmin && (
          <>
            <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>
              Por cobrar
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#28A745",
                marginBottom: 8,
              }}
            >
              {fmt$(porCobrar)}
            </div>
            {alertaCF > 0 && (
              <div
                style={{
                  background: "#FFF3CD",
                  borderRadius: 8,
                  padding: "5px 8px",
                  fontSize: 10,
                  color: "#856404",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                ⚠️ {alertaCF} CF pend.
              </div>
            )}
          </>
        )}
        {esAdmin && (
          <button
            onClick={() => setModoProduccion(v => !v)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 8,
              border: `1px solid ${modoProduccion ? "#9B59B6" : "#1A5F5A"}`,
              background: modoProduccion
                ? "rgba(155,89,182,0.15)"
                : "rgba(26,95,90,0.2)",
              color: modoProduccion ? "#CE93D8" : "#4ecdc4",
              cursor: "pointer",
              fontSize: 11,
              marginBottom: 6,
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            {modoProduccion ? "🔐 Vista admin" : "✂️ Modo producción"}
          </button>
        )}
        {onAbrirEstimador && !modoProduccion && (
          <button
            onClick={onAbrirEstimador}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 8,
              border: "1px solid #28A745",
              background: "rgba(40, 167, 69, 0.15)",
              color: "#7ee59a",
              cursor: "pointer",
              fontSize: 11,
              marginBottom: 6,
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            💰 Estimador de precio
          </button>
        )}
        <PushSwitch />
        <button
          onClick={refrescar}
          disabled={refrescando}
          style={{
            width: "100%",
            padding: "7px",
            borderRadius: 8,
            border: "1px solid #3a1f6b",
            background: "transparent",
            color: "#9B59B6",
            cursor: refrescando ? "default" : "pointer",
            fontSize: 11,
            marginBottom: 6,
            opacity: refrescando ? 0.5 : 1,
          }}
        >
          {refrescando ? "⏳ Actualizando..." : "🔄 Actualizar"}
        </button>
        {sesionEmail && (
          <div style={{ marginBottom: 4, padding: "6px 8px", background: "rgba(155,89,182,0.1)", borderRadius: 6 }}>
            {sesionUser?.nombre && (
              <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, marginBottom: 2 }}>
                {sesionUser.nombre}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: "#9B59B6", wordBreak: "break-all", flex: 1, lineHeight: 1.3 }}>
                ✉️ {sesionEmail}
              </span>
              {sesionUser?.rol && (
                <span style={{
                  fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                  background: sesionUser.rol === "admin" ? "#9B59B6" : "#1A5F5A",
                  color: "#fff", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0,
                }}>{sesionUser.rol}</span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => {
            if (onCerrarSesion) onCerrarSesion();
            setRol(null);
          }}
          style={{
            width: "100%",
            padding: "7px",
            borderRadius: 8,
            border: "1px solid #3a1f6b",
            background: "transparent",
            color: "#555",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
