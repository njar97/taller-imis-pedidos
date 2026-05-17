// Bottom-sheet con los items de navegación que no entran en la barra inferior
// (NAV_IDS_VISIBLES). Aparece cuando el usuario toca "Más" en BottomNav.
// Incluye un botón explícito de "Salir" al final.
//
// Renderiza nada cuando masOpen es falso — el control vive en App.

import { NAV_IDS_VISIBLES } from "./lib/navItems.js";

function ItemMas({ item, activo, bloqueado, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: activo ? "rgba(155,89,182,0.25)" : "transparent",
        cursor: bloqueado ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "12px 4px",
        borderRadius: 10,
        opacity: bloqueado ? 0.3 : 1,
      }}
    >
      <span style={{ fontSize: 26 }}>{item.icon}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: activo ? "#CE93D8" : "#bbb",
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

export default function MasOpenSheet({
  nav,
  seccion,
  setSec,
  setMasOpen,
  setRol,
  esAdmin,
}) {
  const items = nav.filter(item => !NAV_IDS_VISIBLES.includes(item.id));
  return (
    <div
      onClick={() => setMasOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 150,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#2C1654",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 480,
          padding: "16px 8px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 4,
            background: "#9B59B6",
            borderRadius: 2,
            margin: "0 auto 14px",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 4,
          }}
        >
          {items.map(item => {
            const bloqueado = item.pronto || (item.soloAdmin && !esAdmin);
            return (
              <ItemMas
                key={item.id}
                item={item}
                activo={seccion === item.id}
                bloqueado={bloqueado}
                onClick={() => {
                  if (bloqueado) return;
                  setSec(item.id);
                  setMasOpen(false);
                }}
              />
            );
          })}
          <button
            onClick={() => {
              setRol(null);
              setMasOpen(false);
            }}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "12px 4px",
              borderRadius: 10,
            }}
          >
            <span style={{ fontSize: 26 }}>🚪</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#bbb" }}>
              Salir
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
