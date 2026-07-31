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
import { fmt$, resumenTallas, itemsResumen, detalleFactura, textoFactura, carritoPedido, normNombre } from "./lib/dominio.js";
import { descargarICSPedido } from "./lib/calendarioICS.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";
import { opcionesAgrupacion } from "./lib/imprimir.js";
import { imprimirHojaTaller } from "./lib/documentosProducto.js";
import { exportarExcelMedidas } from "./lib/exportarExcelMedidas.js";
import { imgSrc } from "./lib/imagenes.js";
import DesgloseEstimador from "./lib/DesgloseEstimador.jsx";
import { TallasChips } from "./SelectorTallas.jsx";
import { agruparPrendas } from "./ListaPrendas.jsx";
import { leerSnapshotReciente, limpiarSnapshot } from "./lib/edicionReciente.js";
import { generarTokenCaptura, urlCaptura } from "./lib/captura.js";
import ModalVersionesPedido from "./ModalVersionesPedido.jsx";
import { diagramaCamisaPNG, techColor } from "./lib/diagrama.js";
import { useState, useMemo, useEffect, Fragment } from "react";
import {
  facturasDePedido, prepararFacturaPedido, emitirFacturaPedido,
  tieneTokenPuente, loginPuente, ambienteDte,
} from "./lib/facturacion.js";

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

function EspecsDiseno({ disenos, onVerFoto }) {
  const items = (disenos || []).filter(d => d.ubicacion);
  const pngUrl = useMemo(
    () => items.length ? diagramaCamisaPNG(disenos, { ancho: 200, alto: 232 }) : "",
    [disenos] // eslint-disable-line react-hooks/exhaustive-deps
  );
  if (!items.length) return null;
  // Previews reales de bordado (las que existen). Se pueden ampliar.
  const previews = items.map(d => d.disenoImg).filter(Boolean);
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
            const pIdx = d.disenoImg ? previews.indexOf(d.disenoImg) : -1;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 15, height: 15, borderRadius: 3, background: col, color: "#fff", fontSize: 8, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                {d.disenoImg && (
                  <img
                    src={d.disenoImg}
                    alt={d.ubicacion || "bordado"}
                    onClick={() => onVerFoto && pIdx >= 0 && onVerFoto(previews, pIdx)}
                    style={{ width: 52, height: 40, objectFit: "contain", background: "#fff", border: "1px solid #ead9f5", borderRadius: 6, flex: "none", cursor: onVerFoto ? "zoom-in" : "default" }}
                  />
                )}
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
  // Precio y saldo salen de detalleFactura, no de pedido.precio a secas:
  // en pedidos por persona el precio suele vivir en personas[].prendas[] y
  // pedido.precio queda vacío. Si además faltan precios (incompleto), avisar
  // en vez de mostrar un saldo negativo callado.
  const d = esAdmin ? detalleFactura(pedido) : null;
  const abonado = esAdmin ? sumarAbonos(pedido) : 0;
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
    esAdmin ? ["Precio", d.incompleto
      ? `⚠ ${d.qtySinPrecio} prenda${d.qtySinPrecio !== 1 ? "s" : ""} sin precio`
      : fmt$(d.total)] : null,
    esAdmin ? ["Abonado", fmt$(abonado)] : null,
    esAdmin ? ["Saldo", d.incompleto
      ? `⚠ Sin calcular — hay ${fmt$(abonado)} abonado y faltan precios`
      : fmt$(d.total - abonado)] : null,
    // Intermediario (solo interno, nunca sale en cotización/recibo)
    ...(esAdmin && parseFloat(pedido.comisionUnit || 0) > 0 ? (() => {
      const pzs = itemsResumen(pedido).reduce((s, it) => s + (parseInt(it.qty) || 0), 0)
        || (pedido.personas || []).length || 0;
      const com = parseFloat(pedido.comisionUnit) * pzs;
      return [
        ["🤝 Comisión interm.", `${fmt$(pedido.comisionUnit)} c/u × ${pzs} = ${fmt$(com)}`],
        ["Neto nuestro", fmt$(parseFloat(pedido.precio || 0) - com)],
      ];
    })() : []),
    esAdmin && pedido.enviarA ? ["📨 Se envía a", pedido.enviarA] : null,
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
        {d.qtySinPrecio > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#c0392b", fontWeight: 700 }}>
            ⚠ {d.qtySinPrecio} prenda{d.qtySinPrecio !== 1 ? "s" : ""} sin precio unitario
            {d.incompleto
              ? " y el pedido no tiene precio acordado — el total mostrado no es real."
              : " — esas líneas no entran al total."}
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
        <FacturaElectronica pedido={pedido} />
      </div>
    </details>
  );
}

// Emisión de la factura electrónica (DTE) vía puente MH. Muestra las facturas
// ya emitidas del pedido y el botón para emitir. La primera vez pide conectar
// con el usuario/contraseña de Tlacuilo (token de larga duración del bridge).
function FacturaElectronica({ pedido }) {
  const [facturas, setFacturas] = useState([]);
  const [emitiendo, setEmitiendo] = useState(false);
  const [pideLogin, setPideLogin] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  useEffect(() => {
    facturasDePedido(pedido.id).then(setFacturas);
  }, [pedido.id]);

  const emitir = async () => {
    const prep = prepararFacturaPedido(pedido);
    if (!prep.ok) { pushToast(prep.error, "error"); return; }
    if (!tieneTokenPuente()) { setPideLogin(true); return; }

    const amb = ambienteDte();
    const tipoTxt = prep.tipo === "03" ? "Crédito Fiscal (CCF)" : "Factura (consumidor final)";
    const lineas = [
      `${tipoTxt} por ${fmt$(prep.total)} — ambiente ${amb === "01" ? "PRODUCCIÓN (efecto fiscal real)" : "pruebas"}.`,
      prep.receptor.nombre ? `Cliente: ${prep.receptor.nombre}${prep.receptor.nit ? ` (NIT ${prep.receptor.nit})` : ""}` : null,
      ...prep.avisos.map(a => `⚠ ${a}`),
      facturas.length ? `⚠ Este pedido YA tiene ${facturas.length} factura(s) emitida(s).` : null,
    ].filter(Boolean);

    const ok = await pushConfirm({
      titulo: "Emitir factura electrónica",
      msg: <div>{lineas.map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}</div>,
      okLabel: "Sí, emitir a Hacienda",
    });
    if (!ok) return;

    setEmitiendo(true);
    try {
      const reg = await emitirFacturaPedido(pedido);
      setFacturas(f => [reg, ...f]);
      pushToast(`✅ DTE sellado por MH — ${reg.numero_control}`, "success", 6000);
      if (reg._sinRegistro)
        pushToast("⚠ La factura se selló pero NO se pudo registrar en la app — anotá el sello", "error", 10000);
    } catch (e) {
      pushToast(e.message, "error", 8000);
      if (!tieneTokenPuente()) setPideLogin(true);
    } finally {
      setEmitiendo(false);
    }
  };

  const conectar = async () => {
    try {
      await loginPuente(user.trim(), pass);
      setPideLogin(false); setPass("");
      pushToast("Conectado al emisor ✓ — ya podés emitir", "success");
    } catch (e) {
      pushToast(e.message, "error");
    }
  };

  const inp = {
    width: "100%", padding: "7px 9px", borderRadius: 7,
    border: "1px solid #ddd", fontSize: 12, boxSizing: "border-box",
  };

  return (
    <div style={{ marginTop: 10, borderTop: "1px dashed #e0e0e0", paddingTop: 10 }}>
      {facturas.map((f, i) => (
        <div
          key={i}
          style={{
            fontSize: 11, background: "#f0f9f1", border: "1px solid #d4ead7",
            borderRadius: 7, padding: "6px 8px", marginBottom: 6, color: "#2e5f38",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {f.tipo_dte === "03" ? "CCF" : "FC"} {f.numero_control || "(sin nº control)"}
            {f.ambiente === "00" ? " · PRUEBAS" : ""}
          </div>
          <div style={{ wordBreak: "break-all" }}>Sello: {f.sello || "—"}</div>
        </div>
      ))}
      {pideLogin ? (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#888" }}>
            Conectar con el emisor (usuario de Tlacuilo, una sola vez):
          </div>
          <input style={inp} placeholder="Usuario o correo" value={user}
            onChange={e => setUser(e.target.value)} autoComplete="off" />
          <input style={inp} placeholder="Contraseña" type="password" value={pass}
            onChange={e => setPass(e.target.value)} autoComplete="off"
            onKeyDown={e => { if (e.key === "Enter" && user && pass) conectar(); }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={conectar} disabled={!user || !pass}
              style={{
                flex: 1, padding: "8px 10px", border: "none", borderRadius: 8,
                background: "#27AE60", color: "#fff", fontWeight: 700, fontSize: 12,
                cursor: "pointer", opacity: !user || !pass ? 0.5 : 1,
              }}>
              Conectar
            </button>
            <button onClick={() => setPideLogin(false)}
              style={{
                padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8,
                background: "#fff", color: "#888", fontSize: 12, cursor: "pointer",
              }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={emitir}
          disabled={emitiendo}
          style={{
            width: "100%", padding: "9px 10px", border: "none", borderRadius: 8,
            background: emitiendo ? "#aaa" : "#1a7f37", color: "#fff",
            fontWeight: 700, fontSize: 12, cursor: emitiendo ? "wait" : "pointer",
          }}
        >
          {emitiendo ? "Emitiendo…" : facturas.length ? "🧾 Emitir OTRA factura (DTE)" : "🧾 Emitir factura electrónica (DTE)"}
        </button>
      )}
    </div>
  );
}

function Abonos({ abonos, personas }) {
  if (!abonos || abonos.length === 0) return null;
  // Cuando cada abono ya está atribuido a un beneficiario, la tabla de
  // Beneficiarios lo muestra en su fila: repetir la lista completa acá sería
  // la misma gente dos veces seguidas. En ese caso se colapsa a un resumen.
  const nombres = new Set((personas || []).map(p => normNombre(p.nombre)).filter(Boolean));
  const total = abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
  const redundante = nombres.size > 0 && abonos.every(a => nombres.has(normNombre(a.nota)));

  const lista = abonos.map((a, i) => (
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
          {a.metodo && (
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
          )}
          <span style={{ fontSize: 11, color: "#666", flex: 1 }}>{a.nota}</span>
          <span style={{ fontSize: 10, color: "#aaa" }}>{a.fecha}</span>
        </div>
      ));

  const titulo = {
    fontSize: 10,
    color: "#27AE60",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 6,
  };

  if (redundante) {
    return (
      <details style={{ marginTop: 12 }}>
        <summary style={{ ...titulo, cursor: "pointer", userSelect: "none", marginBottom: 0 }}>
          💵 {abonos.length} abonos · {fmt$(total)}
          <span style={{ color: "#bbb", fontWeight: 600, textTransform: "none", marginLeft: 6 }}>
            — desglosados en cada beneficiario
          </span>
        </summary>
        <div style={{ marginTop: 6 }}>{lista}</div>
      </details>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={titulo}>💵 Abonos registrados</div>
      {lista}
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

function ComponentesKit({ componentes }) {
  const comps = (Array.isArray(componentes) ? componentes : []).filter(c => c && (c.nombre || c.cantidad));
  if (comps.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#565656", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
        ➕ Componentes del kit (talla única)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {comps.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #eee", borderRadius: 10, padding: "9px 12px" }}>
            {c.cantidad != null && c.cantidad !== "" && (
              <span style={{ minWidth: 34, textAlign: "center", fontWeight: 800, fontSize: 15, color: "#333", fontVariantNumeric: "tabular-nums" }}>{c.cantidad}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2C1654" }}>
                {c.nombre || "Prenda"}
                {c.talla && <span style={{ marginLeft: 6, fontSize: 11, color: "#777", fontWeight: 600 }}>· {/[úu]nica/i.test(String(c.talla)) ? "talla única" : "talla " + c.talla}</span>}
              </div>
              {c.nota && <div style={{ fontSize: 11.5, color: "#888", marginTop: 2 }}>{c.nota}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cada fila es un acordeón: se toca y despliega el detalle de esa persona
// (prendas con talla y spec, medidas tomadas, abono). Antes las medidas
// vivían en una tabla aparte debajo, así que la misma gente salía listada
// dos veces; ahora el detalle cuelga de su propia fila.
function Personas({ personas, abonos, esAdmin }) {
  const [abiertos, setAbiertos] = useState(() => new Set());
  const abonoPorNombre = useMemo(() => {
    const m = new Map();
    for (const a of abonos || []) {
      const k = normNombre(a.nota);
      if (!k) continue;
      m.set(k, (m.get(k) || 0) + parseFloat(a.monto || 0));
    }
    return m;
  }, [abonos]);
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
  const toggle = key => setAbiertos(prev => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });
  const abonoDe = p => {
    const reg = abonoPorNombre.get(normNombre(p.nombre));
    if (reg != null) return reg;
    const m = p.medidas && p.medidas.abono;
    return m != null && m !== "" ? parseFloat(m) : null;
  };
  const cols = 6 + (esAdmin ? 1 : 0);
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
        <span style={{ color: "#9bb", fontWeight: 600, textTransform: "none", marginLeft: 6 }}>
          · tocá una fila para ver su detalle
        </span>
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
              {["#", "Nombre", "Cargo", "Talla taller", "Prendas", ...(esAdmin ? ["Abonado"] : []), ""].map((h, hi) => (
                <th
                  key={hi}
                  style={{
                    padding: "5px 8px",
                    textAlign: h === "Abonado" ? "right" : "left",
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
            {norm.map((p, i) => {
              const key = p.id || i;
              const open = abiertos.has(key);
              const abono = abonoDe(p);
              return (
              <Fragment key={key}>
              <tr
                onClick={() => toggle(key)}
                style={{
                  borderBottom: "1px solid #f0f8ff",
                  background: open ? "#EBF5FB" : i % 2 === 0 ? "#fff" : "#f8fcff",
                  cursor: "pointer",
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
                {esAdmin && (
                  <td style={{ padding: "5px 8px", textAlign: "right", verticalAlign: "top", fontWeight: 800, color: abono ? "#155724" : "#ccc", fontVariantNumeric: "tabular-nums" }}>
                    {abono != null ? fmt$(abono) : "—"}
                  </td>
                )}
                <td style={{ padding: "5px 8px", textAlign: "right", verticalAlign: "top", color: "#1A5276", fontSize: 10 }}>
                  {open ? "▲" : "▼"}
                </td>
              </tr>
              {open && (
                <tr style={{ background: "#f8fbff" }}>
                  <td colSpan={cols} style={{ padding: "2px 8px 10px 30px", borderBottom: "1px solid #e4ecf4" }}>
                    <DetallePersona persona={p} abono={abono} />
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Contenido desplegado de una fila de beneficiario: sus prendas con talla y
// especificación, las medidas tomadas y lo que abonó.
function DetallePersona({ persona, abono }) {
  const prendas = agruparPrendas(persona.prendas || []);
  const meds = persona.medidas || {};
  const hayMeds = meds.pantalon || meds.chaqueta || meds.quepi;
  const nada = prendas.length === 0 && !hayMeds && abono == null;
  if (nada) {
    return <span style={{ fontSize: 11, color: "#bbb", fontStyle: "italic" }}>Sin detalle capturado para esta persona.</span>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {prendas.length > 0 && (
        <div>
          <div style={SUBTIT}>Prendas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {prendas.map((g, j) => (
              <div key={j} style={{ fontSize: 11.5, color: "#444", display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, color: "#E67E22" }}>{g.qty}×</span>
                <span>{g.tipo || "Prenda"}</span>
                <span style={{ background: g.talla ? "#1A5276" : "#ddd", color: g.talla ? "#fff" : "#888", borderRadius: 10, padding: "1px 7px", fontWeight: 700, fontSize: 10 }}>
                  {g.talla || "sin talla"}
                </span>
                {g.precio != null && g.precio !== "" && (
                  <span style={{ color: "#27AE60", fontWeight: 700 }}>{fmt$(g.precio)} c/u</span>
                )}
                {g.spec && <span style={{ color: "#888", fontStyle: "italic" }}>{g.spec}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {hayMeds && (
        <div>
          <div style={SUBTIT}>📐 Medidas</div>
          {seccionMedidas("Pantalón", "#7D6608", PANT_LABELS, meds.pantalon)}
          {seccionMedidas("Chaqueta", "#6C3483", CHAQ_LABELS, meds.chaqueta)}
          {meds.quepi?.contornoCabeza != null && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#1A5276", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>Quepi</div>
              {chipMedida("Contorno", `${meds.quepi.contornoCabeza} cm`)}
            </div>
          )}
        </div>
      )}
      {abono != null && (
        <div style={{ fontSize: 11.5, color: "#2e7d32", fontWeight: 700 }}>
          💵 Abonó {fmt$(abono)}
        </div>
      )}
    </div>
  );
}

const SUBTIT = { fontSize: 9, fontWeight: 800, color: "#888", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 };

const chipMedida = (label, val) => (
  <span key={label} style={{ display: "inline-flex", gap: 2, alignItems: "baseline", background: "#f0f4f8", borderRadius: 4, padding: "1px 5px", marginRight: 3, marginBottom: 3 }}>
    <span style={{ fontSize: 8, color: "#999", fontWeight: 700 }}>{label}</span>
    <span style={{ fontSize: 11, fontWeight: 800, color: "#1A5276" }}>{val}</span>
  </span>
);

function seccionMedidas(titulo, color, labels, obj) {
  if (!obj) return null;
  const vals = labels.filter(([k]) => obj[k] != null && obj[k] !== "");
  if (!vals.length) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{titulo}</div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {vals.map(([k, l]) => chipMedida(l, `${obj[k]} cm`))}
      </div>
    </div>
  );
}

const PANT_LABELS = [["cintura","Cintura"],["base","Base"],["muslo","Muslo"],["largo","Largo"],["rodilla","Rodilla"],["ruedo","Ruedo"],["tiroD","Tiro D."],["tiroT","Tiro T."]];
const CHAQ_LABELS = [["hombro","Hombro"],["pecho","Pecho"],["cintura","Cintura"],["cadera","Cadera"],["largo","Largo"],["sisa","Sisa"],["manga","Manga"],["puno","Puño"],["cuello","Cuello"],["escote","Escote"],["costado","Costado"],["alto","Alto"],["talle","Talle"],["sep","Sep."],["ctcodo","Ct.Codo"],["altcodo","Alt.Codo"]];

// Cadena de un pedido: de dónde viene (origenRef) y qué salió de él. Deja
// ver de un vistazo que la cotización con las medidas y el pedido con los
// abonos son el mismo trabajo, aunque vivan en filas distintas.
function CadenaPedido({ pedido, pedidos, onVerPedido }) {
  const lista = pedidos || [];
  const origen = pedido.origenRef
    ? lista.find(p => String(p.id) === String(pedido.origenRef))
    : null;
  const derivados = lista.filter(p => String(p.origenRef || "") === String(pedido.id));
  if (!origen && derivados.length === 0) return null;

  const etiqueta = p => (p.esCotizacion ? "COT-" : "N°") + String(p.id).padStart(4, "0");
  const resumen = p => {
    const personas = (p.personas || []).length;
    const partes = [];
    if (personas) partes.push(`${personas} persona${personas === 1 ? "" : "s"}`);
    const conMeds = (p.personas || []).filter(
      x => x.medidas && (x.medidas.pantalon || x.medidas.chaqueta || x.medidas.quepi)
    ).length;
    if (conMeds) partes.push(`${conMeds} con medidas`);
    const ab = (p.abonos || []).reduce((s, a) => s + parseFloat(a.monto || 0), 0);
    if (ab > 0) partes.push(`${fmt$(ab)} abonado`);
    return partes.join(" · ");
  };

  const tarjeta = (p, titulo) => (
    <div
      key={p.id}
      style={{
        background: "#F5F0FA",
        border: "1.5px solid #9B59B6",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#6C3483" }}>
          {titulo} — {etiqueta(p)}
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
          {p.cliente}
          {resumen(p) ? " · " + resumen(p) : ""}
        </div>
      </div>
      {onVerPedido && (
        <button
          onClick={() => onVerPedido(p)}
          style={{
            padding: "6px 12px",
            borderRadius: 7,
            border: "none",
            background: "#9B59B6",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          Ver →
        </button>
      )}
    </div>
  );

  return (
    <div style={{ marginBottom: 8 }}>
      {origen && tarjeta(origen, "📋 Viene de")}
      {derivados.map(p => tarjeta(p, "➡️ Derivó en"))}
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

// Información citada del catálogo cuando el pedido está vinculado (catalogoRef).
// Muestra imagen del producto, bordados con su diseño/archivo, y specs — para
// que en el detalle del pedido salga todo aunque no se haya duplicado en el
// pedido. Es informativo: siempre se cita, marcado como "del catálogo".
function DelCatalogo({ pedido, catalogo, onVerFoto }) {
  const ref = pedido.catalogoRef;
  if (!ref || !Array.isArray(catalogo)) return null;
  const prod = catalogo.find(p => String(p.id) === String(ref));
  if (!prod) return null;

  const imgs = (prod.imagenes || []).filter(i => i.supabaseUrl || i.driveUrl || imgSrc(i));
  const disenos = [];
  for (const t of prod.tecnicas || []) {
    for (const d of t.disenos || []) {
      disenos.push({ ...d, tecnica: t.tipo });
    }
  }
  const nombreArchivo = (u) => {
    if (!u) return "";
    try { return decodeURIComponent(u.split("/").pop()); } catch { return u.split("/").pop(); }
  };

  const lbl = { fontSize: 10.5, fontWeight: 800, color: "#8a7", textTransform: "uppercase", letterSpacing: ".04em" };
  return (
    <div style={{
      border: "1.5px solid #E4E2DB", borderRadius: 12, padding: 12,
      marginBottom: 12, background: "#FAFAF7",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#2C1654" }}>
          {prod.icono || "📖"} {prod.nombre}
        </span>
        <span style={{ ...lbl, color: "#b9a", border: "1px solid #e6dff0", borderRadius: 6, padding: "1px 7px" }}>
          del catálogo
        </span>
      </div>

      {imgs.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {imgs.map((img, i) => (
            <img
              key={i}
              src={img.supabaseUrl || imgSrc(img)}
              alt={prod.nombre}
              onClick={() => onVerFoto && onVerFoto(imgs.map(x => x.supabaseUrl || imgSrc(x)), i)}
              style={{
                width: imgs.length === 1 ? "100%" : 120, maxHeight: 240,
                height: imgs.length === 1 ? "auto" : 120, objectFit: "cover",
                borderRadius: 10, border: "1px solid #eee", cursor: "zoom-in",
              }}
            />
          ))}
        </div>
      )}

      {[
        ["Telas", (prod.telas || []).join(", ")],
        ["Colores", (prod.colores || []).join(", ")],
        ["Precio base", prod.precioBase ? "$" + prod.precioBase : ""],
      ].filter(([, v]) => v).map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "3px 0", fontSize: 12.5 }}>
          <span style={{ color: "#aaa", fontWeight: 700 }}>{k}</span>
          <span style={{ color: "#333", textAlign: "right" }}>{v}</span>
        </div>
      ))}

      {disenos.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ ...lbl, color: "#9a8", marginBottom: 6 }}>Bordados · diseño y archivo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {disenos.map((d, i) => (
              <div key={i} style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                border: "1px solid #eee", borderRadius: 9, padding: 8, background: "#fff",
              }}>
                {d.disenoImg
                  ? <img
                      src={d.disenoImg}
                      alt=""
                      onClick={() => {
                        const previews = disenos.map(x => x.disenoImg).filter(Boolean);
                        const idx = previews.indexOf(d.disenoImg);
                        if (onVerFoto && idx >= 0) onVerFoto(previews, idx);
                      }}
                      style={{ width: 56, height: 40, objectFit: "contain", background: "#fff", border: "1px solid #f0f0f0", borderRadius: 5, flex: "none", cursor: onVerFoto ? "zoom-in" : "default" }}
                    />
                  : <div style={{ width: 56, height: 40, display: "grid", placeItems: "center", color: "#ccc", fontSize: 8, border: "1px solid #f0f0f0", borderRadius: 5, flex: "none" }}>sin<br />preview</div>}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#333" }}>{d.ubicacion || "—"}</div>
                  <div style={{ fontSize: 10.5, color: "#999" }}>
                    {d.tecnica}{(d.ancho && d.alto) ? ` · ${d.ancho}×${d.alto} cm` : ""}
                  </div>
                  {d.disenoArchivo && (
                    <div style={{ fontSize: 10.5, marginTop: 3, color: "#2C1654", fontWeight: 700, wordBreak: "break-all" }}>
                      {nombreArchivo(d.disenoArchivo)}
                      {d.formato ? <span style={{ marginLeft: 5, background: "#F0ECF6", borderRadius: 4, padding: "0 5px", fontSize: 9 }}>{d.formato}</span> : null}
                    </div>
                  )}
                  {d.notas && <div style={{ fontSize: 10.5, color: "#777", marginTop: 3 }}>{d.notas}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Vista "🛒 Carrito": presenta el pedido como una boleta de supermercado —
// una orden = varios renglones = 1 factura, con las canastas "pago aparte" y
// "sin precio" separadas. Solo presenta; el guardado y el DTE no cambian.
function VistaCarrito({ pedido }) {
  const { factura, aparte, sinPrecio } = carritoPedido(pedido);
  const hayFactura = factura.lineas.length > 0 || parseFloat(pedido.precio || 0) > 0;

  const wrap = { border: "1px solid #eee", borderRadius: 12, overflow: "hidden", marginBottom: 12 };
  const cab = (bg, color) => ({
    background: bg, color, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase",
    letterSpacing: 0.4, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
  });
  const fila = {
    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
    borderTop: "1px solid #f2f2f2",
  };
  const qtyBadge = {
    minWidth: 30, textAlign: "center", fontWeight: 800, fontSize: 14, color: "#333",
    fontVariantNumeric: "tabular-nums",
  };
  const Renglon = ({ q, nombre, talla, unit, sub, mudo }) => (
    <div style={fila}>
      <span style={qtyBadge}>{q || "—"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#2C1654" }}>{nombre}</span>
        {talla && (
          <span style={{ marginLeft: 6, background: "#1A5276", color: "#fff", borderRadius: 10, padding: "1px 7px", fontWeight: 700, fontSize: 10 }}>
            {/[úu]nica/i.test(String(talla)) ? "única" : talla}
          </span>
        )}
        {unit != null && !mudo && (
          <span style={{ marginLeft: 6, fontSize: 10.5, color: "#999" }}>× {fmt$(unit)}</span>
        )}
      </div>
      <span style={{ fontWeight: 800, fontSize: 13, color: mudo ? "#bbb" : "#1D6A3A", fontVariantNumeric: "tabular-nums" }}>
        {mudo ? "sin precio" : (sub != null ? fmt$(sub) : "—")}
      </span>
    </div>
  );

  return (
    <div>
      {/* Canasta 1 — se factura (1 DTE) */}
      {hayFactura && (
        <div style={wrap}>
          <div style={cab("#EAF7EE", "#1D6A3A")}>
            <span>🧾 Se factura · 1 DTE</span>
            <span>{fmt$(factura.total)}</span>
          </div>
          {factura.lineas.map((l, i) => (
            <Renglon key={i} q={l.qty} nombre={l.tipo} unit={l.precio}
              sub={l.subtotal} mudo={l.precio == null} />
          ))}
          <div style={{ borderTop: "1px solid #e8e8e8", padding: "8px 12px", fontSize: 12, color: "#555" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Gravado</span><span>{fmt$(factura.gravado)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>IVA 13%</span><span>{fmt$(factura.iva)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#1D6A3A", marginTop: 2 }}>
              <span>Total (IVA incl.)</span><span>{fmt$(factura.total)}</span>
            </div>
          </div>
          {factura.descuadre && (
            <div style={{ padding: "6px 12px", fontSize: 11, color: "#b8860b", background: "#fffaf0" }}>
              ⚠ La suma de renglones ({fmt$(factura.sumaLineas)}) no coincide con el precio del pedido ({fmt$(factura.total)}).
            </div>
          )}
        </div>
      )}

      {/* Canasta 2 — pago aparte (no entra al DTE) */}
      {aparte.lineas.length > 0 && (
        <div style={wrap}>
          <div style={cab("#FFF4E6", "#B85C00")}>
            <span>💵 Pago aparte · no factura</span>
            <span>{fmt$(aparte.total)}</span>
          </div>
          {aparte.lineas.map((l, i) => (
            <Renglon key={i} q={l.qty} nombre={l.tipo} talla={l.talla} unit={l.precio}
              sub={l.subtotal} mudo={l.precio == null} />
          ))}
        </div>
      )}

      {/* Canasta 3 — se produce sin precio (alerta) */}
      {sinPrecio.length > 0 && (
        <div style={{ ...wrap, border: "1px dashed #d9c7a0" }}>
          <div style={cab("#FCF6E8", "#8a6d1a")}>
            <span>⚠ En producción sin precio</span>
            <span style={{ fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>no se factura</span>
          </div>
          {sinPrecio.map((c, i) => (
            <Renglon key={i} q={c.qty} nombre={c.nombre} talla={c.talla} mudo />
          ))}
          <div style={{ padding: "6px 12px", fontSize: 11, color: "#8a6d1a", background: "#fffdf7" }}>
            Poné el precio de estos componentes en el pedido para que entren a la factura.
          </div>
        </div>
      )}

      {!hayFactura && aparte.lineas.length === 0 && sinPrecio.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>
          Este pedido todavía no tiene renglones con precio ni componentes.
        </div>
      )}
    </div>
  );
}

export default function DetallePedidoModal({
  pedido,
  pedidos,
  catalogo,
  esAdmin,
  bordados,
  cuellos,
  onVerPedido,
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
  onImprimirProduccion,
  onImprimirEntrega,
  onAbrirEdicion,
}) {
  const bVinc = bordados.find(b => String(b.confRef) === String(pedido.id));
  const cVinc = cuellos.find(cu => String(cu.confRef) === String(pedido.id));
  const pConf = parseFloat(pedido.precio || 0);
  const pBord = bVinc ? parseFloat(bVinc.precioT || 0) : 0;
  const pCuel = cVinc ? parseFloat(cVinc.precioT || 0) : 0;
  const [verVersiones, setVerVersiones] = useState(false);
  const [vista, setVista] = useState("detalle"); // "detalle" | "carrito"
  const [edRec, setEdRec] = useState(() => leerSnapshotReciente(pedido.id));
  // El carrito solo aporta si hay algo que facturar/producir: personas,
  // componentes o un precio. Sin eso, no mostramos el toggle.
  const hayCarrito = esAdmin && (
    (Array.isArray(pedido.personas) && pedido.personas.length > 0) ||
    (Array.isArray(pedido.componentes) && pedido.componentes.some(c => c && (c.nombre || c.cantidad))) ||
    parseFloat(pedido.precio || 0) > 0
  );
  const [capturaTok, setCapturaTok] = useState(pedido.capturaToken || null);
  const [generandoLink, setGenerandoLink] = useState(false);

  // Genera (si hace falta) y copia el link público de captura de medidas.
  const copiarLinkCaptura = async () => {
    let tok = capturaTok;
    if (!tok) {
      setGenerandoLink(true);
      tok = generarTokenCaptura();
      try {
        const SUPA = "https://kszdievqesveluzcnzsh.supabase.co/rest/v1";
        const KEY = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";
        const r = await fetch(`${SUPA}/taller_pedidos?id=eq.${pedido.id}`, {
          method: "PATCH",
          headers: {
            apikey: KEY, Authorization: "Bearer " + KEY,
            "Content-Type": "application/json", Prefer: "return=minimal",
          },
          body: JSON.stringify({ captura_token: tok }),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        setCapturaTok(tok);
        pedido.capturaToken = tok; // que sobreviva reaperturas del modal
      } catch (e) {
        setGenerandoLink(false);
        pushToast("No pude generar el link: " + (e?.message || e), "error", 5000);
        return;
      }
      setGenerandoLink(false);
    }
    const url = urlCaptura(tok);
    try {
      await navigator.clipboard.writeText(url);
      pushToast("Link de captura copiado 📋 Mandalo por WhatsApp a quien toma las medidas", "success", 6000);
    } catch {
      window.prompt("Copiá el link de captura:", url);
    }
  };

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
      {hayCarrito && (
        <div style={{ display: "inline-flex", background: "#f1f0ee", borderRadius: 10, padding: 3, marginBottom: 12, gap: 3 }}>
          {[["detalle", "📋 Detalle"], ["carrito", "🛒 Carrito"]].map(([v, lbl]) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 800,
                background: vista === v ? "#fff" : "transparent",
                color: vista === v ? "#2C1654" : "#888",
                boxShadow: vista === v ? "0 1px 3px rgba(0,0,0,.12)" : "none",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {vista === "carrito" ? (
        <VistaCarrito pedido={pedido} />
      ) : (
       <>
      <StatusYCosturera
        pedido={pedido}
        onCambiarEstatus={onCambiarEstatus}
        onCambiarCosturera={onCambiarCosturera}
      />
      <InfoTabla pedido={pedido} esAdmin={esAdmin} />
      <EspecsDiseno disenos={pedido.disenos} onVerFoto={onVerFoto} />
      {esAdmin && <DetalleFactura pedido={pedido} />}
      <Abonos abonos={pedido.abonos} personas={pedido.personas} />
      <Imagenes pedido={pedido} onVerFoto={onVerFoto} />
      <DelCatalogo pedido={pedido} catalogo={catalogo} onVerFoto={onVerFoto} />
      <Personas personas={pedido.personas} abonos={pedido.abonos} esAdmin={esAdmin} />
      <ComponentesKit componentes={pedido.componentes} />

      <CadenaPedido pedido={pedido} pedidos={pedidos} onVerPedido={onVerPedido} />

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
       </>
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
          {esAdmin && (
            <button
              onClick={onExportarPDF}
              title="Imprimir o guardar como PDF"
              style={btnExport("#1D6A3A")}
            >
              📄 PDF
            </button>
          )}
          {esAdmin && (pedido.personas || []).length > 0 && (
            <button
              onClick={() => {
                try { exportarExcelMedidas(pedido); }
                catch (e) { pushToast(e.message, "error"); }
              }}
              title="Descargar las medidas en el formato Excel del taller (una hoja por prenda)"
              style={btnExport("#217346")}
            >
              📗 Excel
            </button>
          )}
          {esAdmin && (
            <button
              onClick={copiarLinkCaptura}
              disabled={generandoLink}
              title="Link público para llenar las medidas desde el teléfono, sin cuenta: mandalo a quien toma las medidas donde el cliente"
              style={btnExport(capturaTok ? "#27AE60" : "#C0392B")}
            >
              {generandoLink ? "⏳" : "🔗"} Medidas{capturaTok ? " ✓" : ""}
            </button>
          )}
          {esAdmin && (
            <button
              onClick={() => imprimirHojaTaller(pedido)}
              title="Hoja de producción para el taller: por talla, con cada persona y sus medidas. Tachá al terminar."
              style={btnExport("#B7791F")}
            >
              🏭 Producción
            </button>
          )}
          {esAdmin && onImprimirProduccion && (() => {
            // La hoja vieja (por color / prenda / detalle) queda solo para
            // pedidos con varios colores o tipos, donde ese agrupamiento ayuda
            // a comprar/organizar. En pedidos simples basta la hoja de arriba.
            const ops = opcionesAgrupacion(pedido).filter(o => o.id !== "talla");
            if (!ops.length) return null;
            const ICO = { color: "🎨", tipo: "👕", spec: "🏷️" };
            const COL = { color: "#8E44AD", tipo: "#2980B9", spec: "#16A085" };
            return ops.map(o => (
              <button
                key={o.id}
                onClick={() => onImprimirProduccion({ agruparPor: o.id })}
                title={"Hoja agrupada por " + o.label.toLowerCase()}
                style={btnExport(COL[o.id])}
              >
                {ICO[o.id]} {o.label}
              </button>
            ));
          })()}
          {esAdmin && onImprimirEntrega && (
            <button
              onClick={onImprimirEntrega}
              title="Hoja de entrega para el cliente: lista de personas con firma de recibido, sin precios"
              style={btnExport("#6B21A8")}
            >
              📦 Entrega
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

