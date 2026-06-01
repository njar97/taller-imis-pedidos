// Tarjeta resumen de un pedido en la lista principal.
// Antes vivía como CardPedido compilado en main.js (~286 líneas).

import { EC, ESTATUS } from "./lib/constants.js";
import { fmt$, resumenTallas, itemsResumen, sumarAbonos } from "./lib/dominio.js";
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
  const saldo = parseFloat(p.precio || 0) - sumarAbonos(p);
  const dias = p.fechaEntrega
    ? Math.ceil((new Date(p.fechaEntrega + "T12:00:00") - new Date()) / 86400000)
    : null;
  const urgent =
    dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(p.estatus);

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
      onClick={() => onVer(p)}
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: urgent ? "1.5px solid #FD7E14" : "1.5px solid transparent",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700 }}>
            N°{String(p.id).padStart(4, "0")} {tipoIcon}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#2C1654" }}>{p.cliente}</div>
          {p.nombreContacto && (
            <div style={{ fontSize: 12, color: "#555" }}>👤 {p.nombreContacto}</div>
          )}
          {p.costurera && p.costurera !== "(Sin asignar)" && (
            <div style={{ fontSize: 12, color: "#9B59B6" }}>✂️ {p.costurera}</div>
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
            padding: "5px 8px",
            borderRadius: 20,
            fontWeight: 700,
            fontSize: 11,
            cursor: "pointer",
            maxWidth: 130,
          }}
        >
          {ESTATUS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 4 }}>
        {p.tipoPrenda}
      </div>

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
            <div style={{ fontSize: 12, color: "#E67E22", fontWeight: 700, marginBottom: 4 }}>
              {tallasR}
            </div>
          );
        }
        return null;
      })()}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
        {p.tieneBordado && (
          <span
            style={{
              fontSize: 11,
              background: "#FCE4EC",
              color: "#880E4F",
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 700,
            }}
          >
            🪡 Bordado
          </span>
        )}
        {nFotos > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
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
                  borderRadius: 6,
                  objectFit: "contain",
                  background: "#f5f5f5",
                  border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e0e0e0"),
                  cursor: "zoom-in",
                  flexShrink: 0,
                }}
              />
            ))}
            {nFotos > 3 && (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  background: "#f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#888",
                  fontWeight: 700,
                  border: "1.5px solid #e0e0e0",
                }}
              >
                +{nFotos - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {p.fechaEntrega && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: urgent ? "#E63946" : "#555",
              fontWeight: urgent ? 700 : 400,
            }}
          >
            {urgent ? "⚠️ " : "📌 "}
            {p.fechaEntrega}
          </span>
          {dias !== null && !["Entregado", "Cancelado"].includes(p.estatus) && (
            <span
              style={{
                fontSize: 11,
                background: dias < 0 ? "#F8D7DA" : dias <= 2 ? "#FFF3CD" : "#e8f5e9",
                color: dias < 0 ? "#721C24" : dias <= 2 ? "#856404" : "#155724",
                padding: "2px 8px",
                borderRadius: 20,
                fontWeight: 700,
              }}
            >
              {dias < 0 ? `Venció ${Math.abs(dias)}d` : dias === 0 ? "¡Hoy!" : `${dias}d`}
            </span>
          )}
        </div>
      )}

      {esAdmin && p.precio && (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, color: "#2C1654" }}>{fmt$(p.precio)}</span>
          {saldo > 0 ? (
            <span style={{ fontSize: 12, color: "#E63946", fontWeight: 700 }}>
              Resta {fmt$(saldo)}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "#28A745", fontWeight: 700 }}>✅ Pagado</span>
          )}
          {(p.abonos || []).length > 0 && (
            <span style={{ fontSize: 10, color: "#888" }}>
              {(p.abonos || []).length} abono{(p.abonos || []).length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <div
        onClick={e => e.stopPropagation()}
        className="card-actions"
        style={{
          display: "flex",
          gap: 6,
          marginTop: 12,
          justifyContent: "space-between",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleWA}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "1.5px solid " + (copiado ? "#25D366" : "#e0e0e0"),
            background: copiado ? "#e8fdf0" : "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: copiado ? "#25D366" : "#555",
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "all .2s",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {copiado ? "✅ Copiado" : "📋 WhatsApp"}
        </button>
        <button
          onClick={() => onImprimir(p)}
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: "1.5px solid #9B59B6",
            background: "#fff",
            cursor: "pointer",
            fontSize: 13,
            color: "#9B59B6",
            fontWeight: 700,
          }}
        >
          🖨️
        </button>
        <button
          onClick={() => onEditar(p)}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "none",
            background: "#9B59B6",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ✏️
        </button>
        <button
          title="Duplicar pedido"
          onClick={() => onDuplicar(p)}
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: "1.5px solid #C8E6C9",
            background: "#F1FFF4",
            cursor: "pointer",
            fontSize: 13,
            color: "#27AE60",
          }}
        >
          📄
        </button>
        {esAdmin && (
          <button
            onClick={() => onEliminar(p.id)}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "1.5px solid #fdd",
              background: "#fff8f8",
              cursor: "pointer",
              fontSize: 13,
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
