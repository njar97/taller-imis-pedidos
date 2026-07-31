// Tarjeta resumen de un pedido en la lista principal.
// Antes vivía como CardPedido compilado en main.js (~286 líneas).

import { EC, ESTATUS } from "./lib/constants.js";
import { fmt$, resumenTallas, itemsResumen, sumarAbonos, detalleFactura } from "./lib/dominio.js";
import { imgSrc } from "./lib/imagenes.js";
import { copiarWA } from "./lib/whatsapp.js";
import { TallasChips } from "./SelectorTallas.jsx";

import { useState } from "react";

export default function CardPedido({
  p,
  esAdmin,
  onVer,
  onEditar,
  onCambiarEstatus,
  onEliminar,
  onDuplicar,
  onImprimir,
  onVerFoto,
}) {
  // Precio real del pedido: pedido.precio, o la suma de líneas cuando el
  // precio vive en personas[].prendas[] (pedidos por persona). `incompleto`
  // marca el caso sin precios en ningún lado, que antes ocultaba el bloque
  // de dinero aunque hubiera abonos registrados.
  const dFact = esAdmin ? detalleFactura(p) : null;
  const abonado = sumarAbonos(p);
  const saldo = (dFact ? dFact.total : parseFloat(p.precio || 0)) - abonado;
  const dias = p.fechaEntrega
    ? Math.ceil((new Date(p.fechaEntrega + "T12:00:00") - new Date()) / 86400000)
    : null;
  const urgent =
    dias !== null && dias <= 2 && !["Entregado", "Cancelado", "Cotización"].includes(p.estatus);

  const [copiado, setCopiado] = useState(false);
  const handleWA = () => {
    copiarWA(p, esAdmin);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  };

  const tallasR = resumenTallas(p);
  const fotos = (p.imagenes || []).filter(i => imgSrc(i));
  const nFotos = fotos.length;
  const tipoIcon = p.tipoCliente === "escuela" ? "🏫" : p.tipoCliente === "empresa" ? "🏢" : "";

  return (
    <div
      className="card-pedido"
      onClick={() => onVer(p)}
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        boxShadow: "0 2px 10px rgba(44,22,84,0.07)",
        border: urgent ? "1.5px solid #FD7E14" : "1.5px solid transparent",
        cursor: "pointer",
      }}
    >
      {/* Cabecera: número + cliente + badge estatus */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 2 }}>
            N°<span className="num">{String(p.id).padStart(4, "0")}</span> {tipoIcon}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#2C1654", lineHeight: 1.2 }}>{p.cliente}</div>
          {p.nombreContacto && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>👤 {p.nombreContacto}</div>
          )}
          {p.costurera && p.costurera !== "(Sin asignar)" && (
            <div style={{ fontSize: 12, color: "#9B59B6", marginTop: 1 }}>✂️ {p.costurera}</div>
          )}
        </div>
        <select
          value={p.estatus}
          onChange={e => onCambiarEstatus(p.id, e.target.value)}
          onClick={e => e.stopPropagation()}
          style={{
            border: "none",
            background: (EC[p.estatus] || {}).bg,
            color: (EC[p.estatus] || {}).fg,
            padding: "5px 10px",
            borderRadius: 20,
            fontWeight: 700,
            fontSize: 11,
            fontFamily: "inherit",
            cursor: "pointer",
            flexShrink: 0,
            maxWidth: 130,
          }}
        >
          {ESTATUS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      {/* Tipo de prenda */}
      {p.tipoPrenda && (
        <div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 5 }}>
          {p.tipoPrenda}
        </div>
      )}

      {/* Tallas / items */}
      {(() => {
        const items = itemsResumen(p);
        if (items.length > 0) {
          return (
            <div style={{ marginBottom: 6 }}>
              <TallasChips items={items} compact />
            </div>
          );
        }
        if (tallasR) {
          return (
            <div style={{ fontSize: 12, color: "#E67E22", fontWeight: 700, marginBottom: 5 }}>
              {tallasR}
            </div>
          );
        }
        return null;
      })()}

      {/* Badges + fotos */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
        {p.tieneBordado && (
          <span
            style={{
              fontSize: 11,
              background: "#FCE4EC",
              color: "#880E4F",
              padding: "3px 9px",
              borderRadius: 20,
              fontWeight: 700,
            }}
          >
            🪡 Bordado
          </span>
        )}
        {nFotos > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {fotos.slice(0, 3).map((img, i) => (
              <img
                key={i}
                src={imgSrc(img)}
                onClick={e => {
                  e.stopPropagation();
                  onVerFoto && onVerFoto({ imgs: fotos.map(imgSrc), idx: i });
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  objectFit: "contain",
                  background: "#f5f5f5",
                  border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e8e0f0"),
                  cursor: "zoom-in",
                  flexShrink: 0,
                  transition: "transform .15s",
                }}
              />
            ))}
            {nFotos > 3 && (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "#f0ebf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#7B5EA7",
                  fontWeight: 700,
                  border: "1.5px solid #e8e0f0",
                }}
              >
                +{nFotos - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fecha entrega + días restantes */}
      {p.fechaEntrega && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 12,
              color: urgent ? "#E63946" : "#666",
              fontWeight: urgent ? 700 : 500,
            }}
          >
            {urgent ? "⚠️ " : "📌 "}
            {p.fechaEntrega}
          </span>
          {dias !== null && !["Entregado", "Cancelado", "Cotización"].includes(p.estatus) && (
            <span
              className="num"
              style={{
                fontSize: 11,
                background: dias < 0 ? "#F8D7DA" : dias <= 2 ? "#FFF3CD" : "#e8f5e9",
                color: dias < 0 ? "#721C24" : dias <= 2 ? "#856404" : "#155724",
                padding: "2px 9px",
                borderRadius: 20,
                fontWeight: 700,
              }}
            >
              {dias < 0 ? `Venció ${Math.abs(dias)}d` : dias === 0 ? "¡Hoy!" : `${dias}d`}
            </span>
          )}
        </div>
      )}

      {/* Precio + saldo (solo admin) */}
      {esAdmin && (dFact.total > 0 || abonado > 0) && (
        <div
          style={{
            marginTop: 7,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {dFact.incompleto ? (
            <span style={{ fontSize: 12, color: "#c0392b", fontWeight: 700 }}>
              ⚠ Sin precio · {fmt$(abonado)} abonado
            </span>
          ) : (
            <>
              <span className="num" style={{ fontSize: 15, fontWeight: 700, color: "#2C1654" }}>
                {fmt$(dFact.total)}
              </span>
              {saldo > 0 ? (
                <span className="num" style={{ fontSize: 12, color: "#E63946", fontWeight: 700 }}>
                  Resta {fmt$(saldo)}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "#28A745", fontWeight: 700 }}>✅ Pagado</span>
              )}
            </>
          )}
          {(p.abonos || []).length > 0 && (
            <span className="num" style={{ fontSize: 10, color: "#999" }}>
              {(p.abonos || []).length} abono{(p.abonos || []).length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Acciones */}
      <div
        onClick={e => e.stopPropagation()}
        className="card-actions"
        style={{
          display: "flex",
          gap: 5,
          marginTop: 13,
          alignItems: "center",
        }}
      >
        <button
          className="btn-action"
          onClick={handleWA}
          style={{
            padding: "9px 14px",
            borderRadius: 10,
            border: "1.5px solid " + (copiado ? "#25D366" : "#e8e0f0"),
            background: copiado ? "#e8fdf0" : "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "inherit",
            color: copiado ? "#25D366" : "#555",
            display: "flex",
            alignItems: "center",
            gap: 5,
            flex: "1 1 0",
            minWidth: 0,
            justifyContent: "center",
          }}
        >
          {copiado ? "✅ Copiado" : "📋 WhatsApp"}
        </button>
        <button
          className="btn-action"
          onClick={() => onImprimir(p)}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1.5px solid #9B59B6",
            background: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
            color: "#9B59B6",
            fontWeight: 700,
          }}
        >
          🖨️
        </button>
        <button
          className="btn-action"
          onClick={() => onEditar(p)}
          style={{
            padding: "9px 14px",
            borderRadius: 10,
            border: "none",
            background: "#9B59B6",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
            fontWeight: 700,
          }}
        >
          ✏️
        </button>
        <button
          className="btn-action"
          title="Duplicar pedido"
          onClick={() => onDuplicar(p)}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1.5px solid #C8E6C9",
            background: "#F1FFF4",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
            color: "#27AE60",
          }}
        >
          📄
        </button>
        {esAdmin && (
          <button
            className="btn-action"
            onClick={() => onEliminar(p.id)}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1.5px solid #fdd",
              background: "#fff8f8",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
              color: "#DC3545",
            }}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
