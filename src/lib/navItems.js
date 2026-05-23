// Definición de los items de navegación del shell.
// El admin ve todas las secciones; cada rol "operario_*" sólo ve la suya.
//
// Se devuelve un array de items con shape { id, label, icon, soloAdmin? }.

const ADMIN_NAV = [
  { id: "estadisticas", label: "Estadísticas", icon: "📊" },
  { id: "calendario",   label: "Calendario",   icon: "📅" },
  { id: "pedidos",      label: "Confección",   icon: "✂️" },
  { id: "cotizaciones", label: "Cotizaciones", icon: "🧮", soloAdmin: true },
  { id: "bordados",     label: "Bordados",     icon: "🪡" },
  { id: "cuellos",      label: "Cuellos",      icon: "🧶" },
  { id: "inventario",   label: "Inventario",   icon: "📦", soloAdmin: true },
  { id: "catalogo",     label: "Catálogo",     icon: "🧵" },
  { id: "clientes",     label: "Clientes",     icon: "👥" },
  { id: "papelera",     label: "Papelera",     icon: "🗑️", soloAdmin: true },
  { id: "config",       label: "Configuración",icon: "⚙️", soloAdmin: true },
];

const NAV_OPERARIO = {
  pedidos:  { id: "pedidos",  label: "Confección", icon: "✂️" },
  bordados: { id: "bordados", label: "Bordados",   icon: "🪡" },
  cuellos:  { id: "cuellos",  label: "Cuellos",    icon: "🧶" },
};

// Items que aparecen en la barra inferior (mobile). Los demás caen al menú "Más".
export const NAV_IDS_VISIBLES = ["pedidos", "bordados", "cuellos", "inventario"];

export function getNavItems(rol, esAdmin) {
  if (esAdmin) return ADMIN_NAV;
  const modulo = (rol || "").startsWith("operario_")
    ? rol.replace("operario_", "")
    : null;
  return [NAV_OPERARIO[modulo] || NAV_OPERARIO.pedidos];
}
