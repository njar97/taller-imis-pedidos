// Modal de detalle de un pedido de confección. Es la vista de "ver pedido"
// que se abre al tocar una card o fila. Cambios de estatus y costurera se
// guardan en caliente (callbacks). Las acciones de la izquierda (PDF,
// Imprimir, Editar) cierran el modal o navegan a otra sección.
//
// Si el pedido tiene un bordado/cuello vinculado por `confRef`, se muestra
// una tarjeta con "Ver →". Si no, una tarjeta vacía con "+ Crear" que
// arranca la captura en la sección correspondiente.

import { Modal } from "./lib/Modal.jsx";
import { ESTATUS, EC, COLABORADORAS } from "./lib/constants.js";
import { fmt$, resumenTallas, itemsResumen, detalleFactura, textoFactura } from "./lib/dominio.js";
import { descargarICSPedido } from "./lib/calendarioICS.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";
import { imgSrc } from "./lib/imagenes.js";
import DesgloseEstimador from "./lib/DesgloseEstimador.jsx";
import { TallasChips } from "./SelectorTallas.jsx";
import { agruparPrendas } from "./ListaPrendas.jsx";
import { leerSnapshotReciente, limpiarSnapshot } from "./lib/edicionReciente.js";
import ModalVersionesPedido from "./ModalVersionesPedido.jsx";
import ModalFacturar from "./ModalFacturar.jsx";
import { cargarFacturacion } from "./lib/dteContexto.js";
import { diagramaCamisaPNG, techColor } from "./lib/diagrama.js";
import { useState, useMemo, useEffect } from "react";

function StatusYCosturera({ pedido, onCambiarEstatus, onCambiarCosturera }) {
  const ec = EC[pedido.estatus] || {};
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginBottom: 14,
      }}
    >
      <div>
        <div style={labelStyle}>Estatus</div>
        <select
          value={pedido.estatus}
          onChange={e => onCambiarEstatus(e.target.value)}
          style={{
            width: "100%",
            padding: "9px 10px",
            borderRadius: 8,
            border: "1.5px solid " + (ec.bg || "#e0e0e0"),
            background: ec.bg || "#f5f5f5",
            color: ec.fg || "#333",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {ESTATUS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>
      <div>
        <div style={labelStyle}>Costurera</div>
        <select
          value={pedido.costurera || "(Sin asignar)"}
          onChange={e => onCambiarCosturera(e.target.value)}
          style={{
            width: "100%",
            padding: "9px 10px",
            borderRadius: 8,
            border: "1.5px solid #e0e0e0",
            background: "#f8f4ff",
            color: "#2C1654",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {COLABORADORAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}

function EspecsDiseno({ disenos }) {
  const items = (disenos || []).filter(d => d.ubicacion);
  const pngUrl = useMemo(
    () => items.length ? diagramaCamisaPNG(disenos, { ancho: 200, alto: 232 }) : "",
    [disenos] // eslint-disable-line react-hooks/exhaustive-deps
  );
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 12, marginBottom: 4 }}>
      <div style={{ fontSize: 10, color: "#9B59B6", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
        🎨 Especificaciones de diseño
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", background: "#faf6ff", border: "1px solid #e8d5f5", borderRadius: 10 }}>
        {pngUrl && (
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <img src={pngUrl} style={{ width: 100, height: "auto", borderRadius: 6, display: "block" }} alt="diagrama" />
            <div style={{ fontSize: 7, color: "#ccc", marginTop: 2 }}>D ← | → I (portador)</div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {items.map((d, i) => {
            const col = techColor(d.tecnica);
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 15, height: 15, borderRadius: 3, background: col, color: "#fff", fontSize: 8, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2C1654" }}>{d.ubicacion}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 1 }}>
                    <span style={{ background: col + "22", color: col, borderRadius: 8, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{d.tecnica || ""}</span>
                    {d.ancho && d.alto && <span style={{ color: "#E67E22", fontWeight: 800, fontSize: 11 }}>{d.ancho}×{d.alto}cm</span>}
                    {d.posicionCuello && <span style={{ color: "#888", fontSize: 10 }}>↕ {d.posicionCuello}cm</span>}
                    {d.notas && <span style={{ color: "#999", fontStyle: "italic", fontSize: 10 }}>{d.notas}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InfoTabla({ pedido, esAdmin }) {
  const filas = [
    ["Cliente",
      (pedido.tipoCliente === "escuela" ? "🏫 " :
       pedido.tipoCliente === "empresa" ? "🏢 " : "") + pedido.cliente],
    pedido.nombreContacto ? ["Contacto", pedido.nombreContacto] : null,
    ["Teléfono", pedido.telefono],
    ["Prenda", pedido.tipoPrenda],
    (() => {
      const items = itemsResumen(pedido);
      return ["Tallas", items.length ? "§chips§" : resumenTallas(pedido)];
    })(),
    pedido.personas && pedido.personas.length
      ? ["👥 Beneficiarios",
         pedido.personas.length + " persona" + (pedido.personas.length !== 1 ? "s" : "")]
      : null,
    ["Tela", pedido.tela],
    esAdmin ? ["Facturación", pedido.tipoDocumento] : null,
    esAdmin && pedido.nit ? ["NIT", pedido.nit] : null,
    esAdmin ? ["Precio", fmt$(pedido.precio)] : null,
    esAdmin ? ["Abonado", fmt$(sumarAbonos(pedido))] : null,
    esAdmin ? ["Saldo", fmt$(parseFloat(pedido.precio || 0) - sumarAbonos(pedido))] : null,
    ["Entrega", pedido.fechaEntrega],
    ["Notas", pedido.notas],
  ].filter(Boolean);

  return filas.map(([k, v]) => !v ? null : (
    <div
      key={k}
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: "1px solid #f5f5f5",
        gap: 10,
        flexWrap: k === "Tallas" ? "wrap" : "nowrap",
        flexDirection: k === "Tallas" ? "column" : "row",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "#aaa",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {k}
      </span>
      {k === "Tallas" && v === "§chips§" ? (
        <TallasChips items={itemsResumen(pedido)} compact={false} />
      ) : (
        <span style={{ fontSize: 13, color: "#333", textAlign: "right", fontWeight: 600 }}>
          {v}
        </span>
      )}
    </div>
  ));
}

function sumarAbonos(p) {
  return (p.abonos || []).length > 0
    ? p.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0)
    : parseFloat(p.anticipo || 0);
}

// Bloque colapsado "Detalle para factura" (solo admin). Agrupa los ítems por
// producto + precio y los deja listos para copiar/pegar al emitir la factura,
// hasta que se conecte Tlacuilo. Discreto a propósito: es un <details> que
// solo se expande al tocarlo, para no sumar ruido a la vista del pedido.
function DetalleFactura({ pedido }) {
  const d = detalleFactura(pedido);
  if (!d.lineas.length && !parseFloat(pedido.precio || 0)) return null;

  const copiar = async () => {
    const txt = textoFactura(pedido);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt);
      } else {
        const ta = document.createElement("textarea");
        ta.value = txt;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      pushToast("Detalle de factura copiado ✓", "success");
    } catch {
      pushToast("No pude copiar — mantené presionado para seleccionar", "error");
    }
  };

  const th = { padding: "2px 4px", fontWeight: 700, color: "#aaa" };
  const td = { padding: "4px" };
  const fila = { display: "flex", justifyContent: "space-between" };

  return (
    <details style={{ marginTop: 6, borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
      <summary
        style={{
          fontSize: 12,
          color: "#9a8",
          fontWeight: 700,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        🧾 Detalle para factura
      </summary>
      <div
        style={{
          marginTop: 8,
          background: "#fafafa",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 10,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={th}>Cant</th>
              <th style={th}>Descripción</th>
              <th style={{ ...th, textAlign: "right" }}>P.Unit</th>
              <th style={{ ...th, textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {d.lineas.map((l, i) => (
              <tr key={i} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={{ ...td, fontWeight: 700 }}>{l.qty}</td>
                <td style={td}>{l.tipo}</td>
                <td style={{ ...td, textAlign: "right" }}>{l.precio != null ? fmt$(l.precio) : "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>{l.subtotal != null ? fmt$(l.subtotal) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid #e8e8e8",
            fontSize: 12,
            color: "#333",
          }}
        >
          <div style={fila}><span style={{ color: "#888" }}>Gravado</span><span>{fmt$(d.gravado)}</span></div>
          <div style={fila}><span style={{ color: "#888" }}>IVA 13%</span><span>{fmt$(d.iva)}</span></div>
          <div style={{ ...fila, fontWeight: 800 }}><span>Total (IVA incl.)</span><span>{fmt$(d.total)}</span></div>
        </div>
        {d.descuadre && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#b8860b" }}>
            ⚠ La suma de líneas ({fmt$(d.sumaLineas)}) no coincide con el precio del pedido ({fmt$(d.total)}).
          </div>
        )}
        <button
          onClick={copiar}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px 10px",
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fff",
            color: "#444",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          📋 Copiar detalle
        </button>
      </div>
    </details>
  );
}

function Abonos({ abonos }) {
  if (!abonos || abonos.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10,
          color: "#27AE60",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        💵 Abonos registrados
      </div>
      {abonos.map((a, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            padding: "5px 0",
            borderBottom: "1px solid #f5f5f5",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: "#155724" }}>
            ${parseFloat(a.monto).toFixed(2)}
          </span>
          <span
            style={{
              fontSize: 10,
              background: "#d4edda",
              color: "#155724",
              padding: "1px 7px",
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            {a.metodo}
          </span>
          <span style={{ fontSize: 11, color: "#666", flex: 1 }}>{a.nota}</span>
          <span style={{ fontSize: 10, color: "#aaa" }}>{a.fecha}</span>
        </div>
      ))}
    </div>
  );
}

function Imagenes({ pedido, onVerFoto }) {
  const imagenes = (pedido.imagenes || []).filter(i => imgSrc(i));
  if (imagenes.length === 0) return null;
  const urls = imagenes.map(imgSrc);
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10,
          color: "#28A745",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        ☁️ Imágenes
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {imagenes.map((img, i) => (
          <div key={i} style={{ position: "relative" }}>
            <img
              src={imgSrc(img)}
              alt={img.nombre}
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                objectFit: "contain",
                background: "#f5f5f5",
                border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e0e0e0"),
                cursor: "zoom-in",
              }}
              onClick={() => onVerFoto(urls, i)}
            />
            {img.driveUrl && (
              <div
                style={{
                  position: "absolute",
                  bottom: 3,
                  right: 3,
                  background: "rgba(40,167,69,0.9)",
                  borderRadius: 4,
                  padding: "1px 4px",
                  fontSize: 9,
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                ☁️
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Personas({ personas }) {
  if (!personas || personas.length === 0) return null;
  // Normaliza: si la persona no tiene prendas[], crea una virtual desde
  // su talla/precio sueltos (compat con shape viejo).
  const norm = personas.map(p => {
    if (Array.isArray(p.prendas) && p.prendas.length > 0) return p;
    return {
      ...p,
      prendas: p.talla || p.precio != null
        ? [{ id: 0, tipo: "", talla: p.talla || "", precio: p.precio }]
        : [],
    };
  });
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10,
          color: "#1A5276",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        👥 Beneficiarios
      </div>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ background: "#EBF5FB" }}>
              {["#", "Nombre", "Cargo", "Talla taller", "Prendas"].map(h => (
                <th
                  key={h}
                  style={{
                    padding: "5px 8px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#1A5276",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {norm.map((p, i) => (
              <tr
                key={p.id || i}
                style={{
                  borderBottom: "1px solid #f0f8ff",
                  background: i % 2 === 0 ? "#fff" : "#f8fcff",
                }}
              >
                <td style={{ padding: "5px 8px", color: "#aaa", verticalAlign: "top" }}>{i + 1}</td>
                <td style={{ padding: "5px 8px", fontWeight: 700, color: "#2C1654", verticalAlign: "top" }}>
                  {p.nombre || "—"}
                </td>
                <td style={{ padding: "5px 8px", color: "#555", verticalAlign: "top" }}>{p.cargo || "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "center", color: "#555", verticalAlign: "top" }}>
                  {p.gafete || "—"}
                </td>
                <td style={{ padding: "5px 8px" }}>
                  {p.prendas.length === 0
                    ? <span style={{ color: "#bbb" }}>—</span>
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {agruparPrendas(p.prendas).map((g, j) => {
                          const subtotal =
                            g.precio != null && g.precio !== ""
                              ? parseFloat(g.precio) * g.qty
                              : null;
                          return (
                            <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                              {g.qty > 1 && (
                                <span style={{ fontWeight: 800, color: "#E67E22", fontSize: 11 }}>
                                  {g.qty}×
                                </span>
                              )}
                              {g.tipo && <span style={{ color: "#555", fontSize: 11 }}>{g.tipo}</span>}
                              {g.talla && (
                                <span
                                  style={{
                                    background: "#1A5276",
                                    color: "#fff",
                                    borderRadius: 10,
                                    padding: "1px 7px",
                                    fontWeight: 700,
                                    fontSize: 10,
                                  }}
                                >
                                  {g.talla}
                                </span>
                              )}
                              {subtotal != null && (
                                <span style={{ fontSize: 10, color: "#27AE60", fontWeight: 700 }}>
                                  ${subtotal.toFixed(2)}
                                </span>
                              )}
                              {g.spec && (
                                <span style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>
                                  {g.spec}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MedidasPersonas personas={norm} />
    </div>
  );
}

const PANT_LABELS = [["cintura","Cintura"],["base","Base"],["muslo","Muslo"],["largo","Largo"],["rodilla","Rodilla"],["ruedo","Ruedo"],["tiroD","Tiro D."],["tiroT","Tiro T."]];
const CHAQ_LABELS = [["hombro","Hombro"],["pecho","Pecho"],["cintura","Cintura"],["cadera","Cadera"],["largo","Largo"],["sisa","Sisa"],["manga","Manga"],["puno","Puño"],["cuello","Cuello"],["escote","Escote"],["costado","Costado"],["alto","Alto"],["talle","Talle"],["sep","Sep."],["ctcodo","Ct.Codo"],["altcodo","Alt.Codo"]];

function MedidasPersonas({ personas }) {
  const [abierto, setAbierto] = useState(null);
  const conMeds = personas.filter(p => p.medidas && (p.medidas.pantalon || p.medidas.chaqueta || p.medidas.quepi));
  if (!conMeds.length) return null;

  const chipMed = (label, val) => (
    <span key={label} style={{ display: "inline-flex", gap: 2, alignItems: "baseline", background: "#f0f4f8", borderRadius: 4, padding: "1px 5px", marginRight: 3, marginBottom: 3 }}>
      <span style={{ fontSize: 8, color: "#999", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#1A5276" }}>{val}</span>
    </span>
  );

  const renderSec = (titulo, color, labels, obj) => {
    if (!obj) return null;
    const vals = labels.filter(([k]) => obj[k] != null && obj[k] !== "");
    if (!vals.length) return null;
    return (
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{titulo}</div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {vals.map(([k, l]) => chipMed(l, `${obj[k]} cm`))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: "#1A5276", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
        📐 Medidas por persona
      </div>
      {conMeds.map((p, i) => {
        const open = abierto === p.id;
        return (
          <div key={p.id || i} style={{ border: "1px solid #e4ecf4", borderRadius: 8, marginBottom: 6, overflow: "hidden" }}>
            <button
              onClick={() => setAbierto(open ? null : p.id)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: open ? "#EBF5FB" : "#f8fbff", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: "#2C1654" }}>
                {p.nombre || `Persona ${i + 1}`}
                {p.cargo ? <span style={{ fontSize: 10, color: "#888", fontWeight: 400, marginLeft: 6 }}>{p.cargo}</span> : null}
              </span>
              <span style={{ fontSize: 10, color: "#1A5276" }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
              <div style={{ padding: "8px 10px", background: "#fff" }}>
                {renderSec("Pantalón", "#7D6608", PANT_LABELS, p.medidas?.pantalon)}
                {renderSec("Chaqueta", "#6C3483", CHAQ_LABELS, p.medidas?.chaqueta)}
                {p.medidas?.quepi?.contornoCabeza != null && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#1A5276", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>Quepi</div>
                    {chipMed("Contorno", `${p.medidas.quepi.contornoCabeza} cm`)}
                  </div>
                )}
                {p.medidas?.abono != null && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#2e7d32", fontWeight: 700 }}>
                    💵 Abono recibido: ${p.medidas.abono}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VinculadoCard({ icono, label, color, vinc, prefijo, onVer, onCrear }) {
  if (vinc) {
    return (
      <div
        style={{
          background: color.bgClaro,
          border: "1.5px solid " + color.borde,
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: color.borde }}>
            {icono} {label} — {prefijo}-{String(vinc.id).padStart(3, "0")}
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
            {vinc.estatus}
            {vinc.precioT ? " · $" + parseFloat(vinc.precioT).toFixed(2) : ""}
          </div>
        </div>
        <button
          onClick={onVer}
          style={{
            padding: "6px 12px",
            borderRadius: 7,
            border: "none",
            background: color.borde,
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          Ver →
        </button>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f8f8f8",
        border: "1.5px dashed #ccc",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <div style={{ fontSize: 12, color: "#888" }}>
        {icono} Lleva {label.toLowerCase()} — sin registrar aún
      </div>
      <button
        onClick={onCrear}
        style={{
          padding: "7px 14px",
          borderRadius: 8,
          border: "none",
          background: color.borde,
          color: "#fff",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        + Crear {label.toLowerCase()}
      </button>
    </div>
  );
}

function ResumenPrecios({ pConf, pBord, pCuel }) {
  if (pBord <= 0 && pCuel <= 0) return null;
  return (
    <div
      style={{
        background: "#f0ebff",
        border: "1.5px solid #9B59B6",
        borderRadius: 10,
        padding: "10px 14px",
        marginTop: 4,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#9B59B6",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Resumen de precios
      </div>
      {pConf > 0 && (
        <FilaPrecio label="✂️ Confección" monto={pConf} />
      )}
      {pBord > 0 && (
        <FilaPrecio label="🪡 Bordado" monto={pBord} />
      )}
      {pCuel > 0 && (
        <FilaPrecio label="🧶 Cuello" monto={pCuel} />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 14,
          fontWeight: 900,
          color: "#2C1654",
          borderTop: "1px solid #ddd",
          paddingTop: 6,
          marginTop: 4,
        }}
      >
        <span>Total</span>
        <span>${(pConf + pBord + pCuel).toFixed(2)}</span>
      </div>
    </div>
  );
}

function FilaPrecio({ label, monto }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        marginBottom: 3,
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 700 }}>${monto.toFixed(2)}</span>
    </div>
  );
}

export default function DetallePedidoModal({
  pedido,
  esAdmin,
  bordados,
  cuellos,
  onClose,
  onCambiarEstatus,
  onCambiarCosturera,
  onVerFoto,
  onIrABordados,
  onIrACuellos,
  onCrearBordadoVinc,
  onCrearCuelloVinc,
  onWhatsApp,
  onExportarPDF,
  onAbrirEdicion,
}) {
  const bVinc = bordados.find(b => String(b.confRef) === String(pedido.id));
  const cVinc = cuellos.find(cu => String(cu.confRef) === String(pedido.id));
  const pConf = parseFloat(pedido.precio || 0);
  const pBord = bVinc ? parseFloat(bVinc.precioT || 0) : 0;
  const pCuel = cVinc ? parseFloat(cVinc.precioT || 0) : 0;
  const [verVersiones, setVerVersiones] = useState(false);
  const [edRec, setEdRec] = useState(() => leerSnapshotReciente(pedido.id));
  // Facturación DTE (Tlacuilo). El contexto se carga perezoso; si no hay bridge
  // o empresa emisora configurada, el botón "Facturar" simplemente no aparece.
  const [ctxFact, setCtxFact] = useState(null);
  const [facturando, setFacturando] = useState(false);
  const [dtes, setDtes] = useState(pedido.dte_emitidos || pedido.dteEmitidos || []);
  useEffect(() => {
    if (!esAdmin) return;
    cargarFacturacion().then(setCtxFact).catch(() => {});
  }, [esAdmin]);
  const puedeFacturar = !!(esAdmin && ctxFact?.bridgeUrl && ctxFact?.empresa);

  const deshacerEdicionReciente = async () => {
    if (!edRec || !edRec.snapshot) return;
    const ok = await pushConfirm({
      titulo: "Deshacer última edición",
      msg: `¿Volver al estado anterior del ${new Date(edRec.timestamp).toLocaleString("es-SV")}? Los cambios actuales se reemplazan.`,
      okLabel: "Sí, deshacer",
    });
    if (!ok) return;
    const snap = { ...edRec.snapshot };
    // No queremos sobreescribir el id ni deleted_at
    const idGuardado = pedido.id;
    delete snap.deleted_at;
    snap.id = idGuardado;
    // Hacemos PATCH directo via REST con keys camelCase → snake_case
    // ya las maneja keysToSnake en db.js. Usamos el callback de save
    // del componente padre vía la prop onAbrirEdicion no aplica acá.
    // Hacemos fetch directo:
    try {
      const SUPA = "https://kszdievqesveluzcnzsh.supabase.co/rest/v1";
      const KEY = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
      // Pre-snake-case del snapshot (los campos en BD están en snake)
      const r = await fetch(`${SUPA}/taller_pedidos?id=eq.${idGuardado}`, {
        method: "PATCH",
        headers: {
          apikey: KEY, Authorization: "Bearer " + KEY,
          "Content-Type": "application/json", Prefer: "return=minimal",
        },
        body: JSON.stringify(snap),
      });
      if (r.ok) {
        limpiarSnapshot(idGuardado);
        setEdRec(null);
        pushToast("Edición deshecha. Recargá para ver los datos restaurados.", "success", 5000);
        onClose();
      } else {
        pushToast("No pude restaurar la edición", "error");
      }
    } catch (e) {
      pushToast("Error al deshacer: " + e.message, "error");
    }
  };

  const minsDesde = edRec ? Math.floor((Date.now() - edRec.timestamp) / 60000) : 0;

  return (
    <Modal
      title={"📋 N°" + String(pedido.id).padStart(4, "0") + " — " + pedido.cliente}
      onClose={onClose}
    >
      {edRec && (
        <div style={{
          background: "#FFF8E1", border: "1.5px solid #FFE082", borderRadius: 10,
          padding: "10px 14px", marginBottom: 12, display: "flex",
          alignItems: "center", gap: 10, justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 12, color: "#856404", flex: 1 }}>
            ↩️ <strong>Editado hace {minsDesde} min</strong>
            <div style={{ fontSize: 11, opacity: .85 }}>Si fue por error, podés deshacer la última edición.</div>
          </div>
          <button onClick={deshacerEdicionReciente} style={{
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: "#E67E22", color: "#fff", fontWeight: 800, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}>
            ↩️ Deshacer
          </button>
          <button onClick={() => { limpiarSnapshot(pedido.id); setEdRec(null); }}
            title="Descartar este aviso"
            style={{
              background: "none", border: "none", color: "#856404",
              fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1,
            }}>×</button>
        </div>
      )}
      <StatusYCosturera
        pedido={pedido}
        onCambiarEstatus={onCambiarEstatus}
        onCambiarCosturera={onCambiarCosturera}
      />
      <InfoTabla pedido={pedido} esAdmin={esAdmin} />
      <EspecsDiseno disenos={pedido.disenos} />
      {esAdmin && <DetalleFactura pedido={pedido} />}
      {esAdmin && dtes.length > 0 && (
        <div style={{ marginTop: 8, border: "1px solid #E6F2EC", background: "#F5FAF7", borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: "#1B6B4A", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            🧾 DTE emitidos
          </div>
          {dtes.map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "3px 0", borderTop: i ? "1px solid #eef5f1" : "none" }}>
              <span style={{ color: "#333", fontWeight: 700 }}>
                {d.tipo === "03" ? "CCF" : "FC"} · {d.modo}{d.prueba ? " (prueba)" : ""}
              </span>
              <span style={{ color: "#666", fontFamily: "monospace" }}>{d.numeroControl || d.sello || "—"}</span>
              <span style={{ color: "#1B6B4A", fontWeight: 700 }}>{fmt$(d.monto)}</span>
            </div>
          ))}
        </div>
      )}
      <Abonos abonos={pedido.abonos} />
      <Imagenes pedido={pedido} onVerFoto={onVerFoto} />
      <Personas personas={pedido.personas} />

      <div style={{ marginBottom: 8 }}>
        <VinculadoCard
          icono="🪡"
          label="Bordado"
          color={{ bgClaro: "#f0fff8", borde: "#1A5F5A" }}
          vinc={bVinc}
          prefijo="BORD"
          onVer={onIrABordados}
          onCrear={onCrearBordadoVinc}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <VinculadoCard
          icono="🧶"
          label="Cuello"
          color={{ bgClaro: "#fff4e6", borde: "#B85C00" }}
          vinc={cVinc}
          prefijo="CUEL"
          onVer={onIrACuellos}
          onCrear={onCrearCuelloVinc}
        />
      </div>

      {esAdmin && <ResumenPrecios pConf={pConf} pBord={pBord} pCuel={pCuel} />}
      {esAdmin && pedido.desgloseEstimador && pedido.desgloseEstimador.modo && (
        <DesgloseEstimador desglose={pedido.desgloseEstimador} />
      )}
      {esAdmin && (
        <button
          onClick={() => setVerVersiones(true)}
          style={{
            marginTop: 8, padding: "7px 12px", borderRadius: 8,
            border: "1.5px solid #888", background: "#fff", color: "#666",
            cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
          }}
        >
          🕗 Versiones anteriores
        </button>
      )}
      {verVersiones && (
        <ModalVersionesPedido pedido={pedido} onClose={() => setVerVersiones(false)} />
      )}
      {facturando && (
        <ModalFacturar
          pedido={{ ...pedido, dte_emitidos: dtes }}
          contexto={ctxFact}
          onClose={() => setFacturando(false)}
          onFacturado={(info, lista) => setDtes(lista)}
        />
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          marginTop: 16,
          paddingTop: 14,
          borderTop: "1px solid #eee",
        }}
      >
        {/* Acciones secundarias: compartir / exportar (estilo outline para
            que no compitan con "Editar"). */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {puedeFacturar && (
            <button
              onClick={() => setFacturando(true)}
              title="Emitir factura electrónica (DTE) por el emisor Tlacuilo"
              style={btnExport("#1B6B4A")}
            >
              🧾 Facturar
            </button>
          )}
          {esAdmin && (
            <button
              onClick={onExportarPDF}
              title="Imprimir o guardar como PDF"
              style={btnExport("#1D6A3A")}
            >
              📄 PDF
            </button>
          )}
          {pedido.fechaEntrega && (
            <button
              onClick={() => {
                if (descargarICSPedido(pedido)) {
                  pushToast("Evento .ics descargado — abre con tu calendario", "success");
                } else {
                  pushToast("Sin fecha de entrega", "error");
                }
              }}
              title="Descargar .ics para el calendario del teléfono (alarma 1 día antes)"
              style={btnExport("#1A5276")}
            >
              📅 Calendario
            </button>
          )}
          <button
            onClick={onWhatsApp}
            title="Copia el resumen del pedido para pegarlo en WhatsApp"
            style={btnExport("#1F9D55")}
          >
            💬 WhatsApp
          </button>
        </div>
        {/* Acción principal */}
        <button
          onClick={onAbrirEdicion}
          style={{
            padding: "11px 24px",
            borderRadius: 8,
            border: "none",
            background: "#9B59B6",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 15,
            boxShadow: "0 2px 6px rgba(155,89,182,.35)",
          }}
        >
          ✏️ Editar
        </button>
      </div>
    </Modal>
  );
}

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: "#888",
  textTransform: "uppercase",
  marginBottom: 4,
};

// Estilo de los botones secundarios (compartir/exportar) del footer del
// detalle: outline/ghost para que no compitan visualmente con "Editar".
const btnExport = color => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: `1.5px solid ${color}`,
  background: "#fff",
  color,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
  fontFamily: "inherit",
});

// Muestra el desglose del estimador que se usó para armar el precio.
// Solo se renderiza si pedido.desgloseEstimador tiene contenido.
// Útil para revisar "¿por qué cobré X?" después de tiempo.

