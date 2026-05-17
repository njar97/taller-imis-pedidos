// Barra inferior fija (mobile). Muestra hasta 4 items "visibles" (NAV_IDS_VISIBLES)
// + un botón "Más" si quedan items ocultos. Si el rol es operario y sólo tiene
// una sección, en vez de "Más" se muestra "Salir" para cerrar sesión.
//
// Renderizada en App; controlada con seccion / setSec / masOpen / setMasOpen / setRol.

import { NAV_IDS_VISIBLES } from "./lib/navItems.js";

function ItemBottom({ item, activo, bloqueado, badgeCount, onClick }) {
  return (
    <button
      key={item.id}
      onClick={onClick}
      style={{
        flex: 1,
        border: "none",
        background: "transparent",
        cursor: bloqueado ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 0",
        opacity: bloqueado ? 0.3 : 1,
        position: "relative",
      }}
    >
      <span style={{ fontSize: 20, position: "relative" }}>
        {item.icon}
        {badgeCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -10,
              background: "#DC3545",
              color: "#fff",
              fontSize: 9,
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: 10,
              minWidth: 16,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: activo ? "#CE93D8" : "#888",
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

function BotonExtra({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 0",
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color }}>{label}</span>
    </button>
  );
}

export default function BottomNav({
  nav,
  seccion,
  setSec,
  masOpen,
  setMasOpen,
  setRol,
  esAdmin,
  vencidosSinArchivar,
  matAgotados,
}) {
  const navVisible = nav.filter(item => NAV_IDS_VISIBLES.includes(item.id));
  const navOculto = nav.filter(item => !NAV_IDS_VISIBLES.includes(item.id));

  const ultBoton =
    navOculto.length > 0 ? (
      <BotonExtra
        icon="···"
        label="Más"
        color={masOpen ? "#CE93D8" : "#888"}
        onClick={() => setMasOpen(true)}
      />
    ) : (
      <BotonExtra
        icon="🚪"
        label="Salir"
        color="#888"
        onClick={() => setRol(null)}
      />
    );

  return (
    <nav
      className="bottomnav"
      style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#2C1654",
        borderTop: "1px solid #3a1f6b",
        zIndex: 50,
        padding: "6px 0 8px",
      }}
    >
      {navVisible.map(item => {
        const bloqueado = item.pronto || (item.soloAdmin && !esAdmin);
        const activo = seccion === item.id;
        const badgeCount =
          item.id === "pedidos"
            ? vencidosSinArchivar.length
            : item.id === "inventario"
            ? matAgotados
            : 0;
        return (
          <ItemBottom
            key={item.id}
            item={item}
            activo={activo}
            bloqueado={bloqueado}
            badgeCount={badgeCount}
            onClick={() => {
              if (bloqueado) return;
              setSec(item.id);
              setMasOpen(false);
            }}
          />
        );
      })}
      {ultBoton}
    </nav>
  );
}
