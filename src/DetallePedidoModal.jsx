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
import { fmt$, resumenTallas, itemsResumen } from "./lib/dominio.js";
import { descargarICSPedido } from "./lib/calendarioICS.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";
import { imgSrc } from "./lib/imagenes.js";
import { TallasChips } from "./SelectorTallas.jsx";
import { agruparPrendas } from "./ListaPrendas.jsx";
import { leerSnapshotReciente, limpiarSnapshot } from "./lib/edicionReciente.js";
import ModalVersionesPedido from "./ModalVersionesPedido.jsx";
import { useState } from "react";

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
                objectFit: "cover",
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
  onImprimir,
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

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 16,
        }}
      >
        {esAdmin && (
          <button
            onClick={onExportarPDF}
            style={{
              padding: "9px 12px",
              borderRadius: 8,
              border: "none",
              background: "#1D6A3A",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
            }}
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
            title="Descargar archivo .ics para agregar al calendario del teléfono (alarma 1 día antes)"
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "1.5px solid #1A5276",
              background: "#fff",
              color: "#1A5276",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            📅 Calendario
          </button>
        )}
        <button
          onClick={onImprimir}
          style={{
            padding: "9px 16px",
            borderRadius: 8,
            border: "none",
            background: "#6c3483",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={onAbrirEdicion}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#9B59B6",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
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

// Muestra el desglose del estimador que se usó para armar el precio.
// Solo se renderiza si pedido.desgloseEstimador tiene contenido.
// Útil para revisar "¿por qué cobré X?" después de tiempo.
function DesgloseEstimador({ desglose }) {
  if (!desglose || !desglose.modo) return null;
  const numb = v => parseFloat(v) || 0;

  // Cálculo del costo de un item de confección (debe coincidir con la
  // lógica del estimador). Si más adelante cambia el cálculo allá,
  // hay que sincronizarlo acá o mover el helper a lib/dominio.js.
  const costoBordado = punt => {
    const n = parseInt(String(punt || "").replace(/[^0-9]/g, "")) || 0;
    return n > 0 ? (n / 600) * (3.0 / 60) : 0;
  };
  const costoItem = it => {
    const tela = numb(it.telaCostoYd) * numb(it.yardasPorPrenda) * numb(it.qty);
    const modoMO = it.moModo === "prenda" || it.moModo === "hechura" ? "hechura" : "tiempo";
    const mo = modoMO === "hechura"
      ? numb(it.moCostoUnit) * numb(it.qty)
      : numb(it.moCostoUnit) * numb(it.moHoras);
    const bord = it.bordActivo ? costoBordado(it.bordPunt) * numb(it.qty) : 0;
    const otros = (it.otros || []).reduce((s, o) => s + numb(o.qty) * numb(o.costo), 0);
    return { tela, mo, bord, otros, total: tela + mo + bord + otros };
  };
  const fmt = v => "$" + (numb(v).toFixed(2));

  return (
    <details style={{ marginTop: 10, marginBottom: 8, background: "#FFFBF6", border: "1.5px dashed #E67E22", borderRadius: 10, padding: "10px 14px" }}>
      <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#E67E22", textTransform: "uppercase", letterSpacing: .5 }}>
        🔍 Desglose del estimador (cómo se calculó el precio)
      </summary>
      <div style={{ marginTop: 10, fontSize: 11, color: "#555" }}>
        <div style={{ marginBottom: 6 }}>
          <strong>Modo:</strong> {desglose.modo} · <strong>Margen aplicado:</strong> {desglose.margen}%
        </div>
        {desglose.modo === "confeccion" && Array.isArray(desglose.items) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {desglose.items.map((it, i) => {
              const c = costoItem(it);
              const qty = numb(it.qty) || 1;
              const costoUnit = c.total / qty;
              const precioTotalItem = c.total * (1 + desglose.margen / 100);
              const precioUnit = precioTotalItem / qty;
              return (
                <div key={i} style={{ background: "#fff", border: "1px solid #fde0b8", borderRadius: 6, padding: 8 }}>
                  <div style={{ fontWeight: 800, color: "#2C1654", marginBottom: 4 }}>
                    {i + 1}. {it.tipoPrenda || "(sin tipo)"} × {it.qty}
                  </div>
                  <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6 }}>
                    {numb(it.telaCostoYd) > 0 && <div>🧵 Tela <strong>{it.telaNombre || "—"}</strong>: ${numb(it.telaCostoYd)}/yd × {it.yardasPorPrenda} yd × {it.qty} = <strong>{fmt(c.tela)}</strong></div>}
                    {numb(it.moCostoUnit) > 0 && <div>✂️ Mano de obra ({it.moModo === "tiempo" || it.moModo === "hora" ? "por tiempo" : "por hechura"}): ${numb(it.moCostoUnit)} × {it.moModo === "tiempo" || it.moModo === "hora" ? `${it.moHoras} h` : `${it.qty} pza`} = <strong>{fmt(c.mo)}</strong></div>}
                    {it.bordActivo && <div>🪡 Bordado: {it.bordPunt} puntadas × {it.qty} pza = <strong>{fmt(c.bord)}</strong></div>}
                    {(it.otros || []).length > 0 && (
                      <div>➕ Otros: {it.otros.map(o => `${o.qty}× ${o.nombre} $${o.costo}`).join(", ")} = <strong>{fmt(c.otros)}</strong></div>
                    )}
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #fde0b8", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11 }}>
                      <div style={{ color: "#E67E22" }}>
                        Costo unit: <strong>{fmt(costoUnit)}</strong>
                      </div>
                      <div style={{ color: "#E67E22", textAlign: "right" }}>
                        Costo total: <strong>{fmt(c.total)}</strong>
                      </div>
                      <div style={{ color: "#27AE60" }}>
                        Precio unit: <strong>{fmt(precioUnit)}</strong>
                      </div>
                      <div style={{ color: "#27AE60", textAlign: "right" }}>
                        Precio total ({desglose.margen}%): <strong>{fmt(precioTotalItem)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {(desglose.modo === "bordado" || desglose.modo === "cuello") && desglose.datos && (
          <pre style={{ background: "#fff", padding: 8, borderRadius: 6, fontSize: 10, overflow: "auto", color: "#444" }}>
{JSON.stringify(desglose.datos, null, 2)}
          </pre>
        )}
      </div>
    </details>
  );
}

