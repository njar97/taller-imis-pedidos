// Carrusel de "Próximas entregas" — top 6 pedidos por fecha de entrega,
// con código de color según urgencia.
// Antes vivía como ProximasEntregas compilado en main.js (~231 líneas).

import { EC } from "./lib/constants.js";
import { resumenTallas } from "./lib/dominio.js";

const { useState } = React;

const colorDias = d =>
  d < 0
    ? { bg: "#F8D7DA", fg: "#721C24", label: `Venció ${Math.abs(d)}d` }
    : d === 0
    ? { bg: "#F8D7DA", fg: "#721C24", label: "¡Hoy!" }
    : d === 1
    ? { bg: "#FFF3CD", fg: "#856404", label: "Mañana" }
    : d <= 3
    ? { bg: "#FFF3CD", fg: "#856404", label: `${d} días` }
    : d <= 7
    ? { bg: "#D4EDDA", fg: "#155724", label: `${d} días` }
    : { bg: "#E8F4FD", fg: "#0c5460", label: `${d} días` };

export default function ProximasEntregas({ pedidos, diasPara, esAdmin, onVer, onEditar, onWA }) {
  const [copiadoId, setCopiadoId] = useState(null);

  const handleWA = p => {
    onWA(p);
    setCopiadoId(p.id);
    setTimeout(() => setCopiadoId(null), 2200);
  };

  const proximos = pedidos
    .filter(p => p.fechaEntrega && !["Entregado", "Cancelado"].includes(p.estatus))
    .map(p => ({ ...p, dias: diasPara(p.fechaEntrega) }))
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 6);

  if (!proximos.length) return null;

  return (
    <div
      style={{
        marginBottom: 14,
        background: "#fff",
        borderRadius: 12,
        border: "1.5px solid #ede7f6",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#2C1654",
          padding: "9px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>📅 Próximas entregas</div>
        <div style={{ color: "#9B59B6", fontSize: 11, fontWeight: 700 }}>
          {proximos.length} pedido{proximos.length !== 1 ? "s" : ""} pendiente
          {proximos.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "10px 12px",
          overflowX: "auto",
          scrollbarWidth: "thin",
        }}
      >
        {proximos.map(p => {
          const dc = colorDias(p.dias);
          const tallas = resumenTallas(p);
          const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
          const tipoIcon =
            p.tipoCliente === "escuela" ? "🏫" : p.tipoCliente === "empresa" ? "🏢" : "";
          const copiado = copiadoId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => onVer(p)}
              style={{
                minWidth: 170,
                maxWidth: 190,
                flexShrink: 0,
                border: "1.5px solid #f0e8ff",
                borderRadius: 10,
                background: "#fdfaff",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  background: dc.bg,
                  padding: "4px 10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, color: dc.fg }}>{dc.label}</span>
                <span style={{ fontSize: 9, color: dc.fg, opacity: 0.7 }}>{p.fechaEntrega}</span>
              </div>
              <div style={{ padding: "8px 10px", flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#2C1654",
                    marginBottom: 2,
                    lineHeight: 1.3,
                  }}
                >
                  {tipoIcon} {p.cliente}
                </div>
                {p.nombreContacto && (
                  <div style={{ fontSize: 9, color: "#888", marginBottom: 3 }}>
                    👤 {p.nombreContacto}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{p.tipoPrenda}</div>
                {p.tallasItems && p.tallasItems.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
                    {p.tallasItems.map(it => (
                      <span
                        key={it.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 2,
                          fontSize: 9,
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            background: "#E67E22",
                            color: "#fff",
                            borderRadius: 4,
                            padding: "1px 5px",
                          }}
                        >
                          {it.talla}
                        </span>
                        <span style={{ color: "#2C1654" }}>
                          {it.qty}pda{it.qty !== 1 ? "s" : ""}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  tallas && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#E67E22",
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      {tallas}
                    </div>
                  )
                )}
                <span
                  style={{
                    fontSize: 9,
                    background: (EC[p.estatus] || {}).bg || "#eee",
                    color: (EC[p.estatus] || {}).fg || "#333",
                    padding: "2px 7px",
                    borderRadius: 20,
                    fontWeight: 700,
                  }}
                >
                  {p.estatus}
                </span>
                {esAdmin && saldo > 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#E63946",
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    Saldo: ${saldo.toFixed(2)}
                  </div>
                )}
              </div>
              <div
                onClick={e => e.stopPropagation()}
                style={{ display: "flex", borderTop: "1px solid #f0e8ff" }}
              >
                <button
                  onClick={() => handleWA(p)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    border: "none",
                    background: copiado ? "#e8fdf0" : "transparent",
                    color: copiado ? "#25D366" : "#888",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    borderRight: "1px solid #f0e8ff",
                    transition: "all .2s",
                  }}
                >
                  {copiado ? "✅" : "📋 WA"}
                </button>
                <button
                  onClick={() => onEditar(p)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    border: "none",
                    background: "transparent",
                    color: "#9B59B6",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✏️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
