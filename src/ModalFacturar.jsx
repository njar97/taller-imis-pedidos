// Modal de emisión de DTE desde un pedido. Arma el payload simple, pide el
// correlativo, llama al bridge Tlacuilo y registra el resultado en el pedido.
//
// La app NUNCA firma ni toca el certificado: eso ocurre en el bridge. Acá solo
// se previsualiza y se dispara la emisión. Mientras la empresa no esté en
// producción, todo va a PRUEBAS (badge bien visible) — no son facturas válidas.

import { useState } from "react";
import { Modal } from "./lib/Modal.jsx";
import { fmt$ } from "./lib/dominio.js";
import { pushToast } from "./lib/feedback.js";
import {
  tipoDteDePedido, ES_CCF, previewMontos, faltantesReceptorCCF,
  construirPayloadPedido, emitirPedidoDTE, montoYaFacturado, saldoPendiente,
} from "./lib/dte.js";
import { siguienteCorrelativo, registrarDTEEmitido, puedeEmitirProduccion } from "./lib/dteEmpresas.js";

export default function ModalFacturar({ pedido, contexto, onClose, onFacturado }) {
  const { bridgeUrl, token, empresa } = contexto || {};
  const tipoDte = tipoDteDePedido(pedido);
  const esCCF = ES_CCF(tipoDte);
  const yaFacturado = montoYaFacturado(pedido);
  const saldo = saldoPendiente(pedido);
  const anticipo = Number(pedido?.anticipo || 0);

  // Modos disponibles según la situación del pedido.
  const modos = [];
  modos.push({ id: "total", label: "Factura total", desc: "Todo el pedido" });
  if (anticipo > 0 && yaFacturado < anticipo) {
    modos.push({ id: "anticipo", label: "Anticipo", desc: fmt$(anticipo) });
  }
  if (yaFacturado > 0 && saldo > 0.009) {
    modos.push({ id: "saldo", label: "Saldo", desc: fmt$(saldo) });
  }

  const [modo, setModo] = useState(modos[0].id);
  const [emitiendo, setEmitiendo] = useState(false);
  const [resultado, setResultado] = useState(null); // {ok, ...}

  const prod = puedeEmitirProduccion(empresa);
  const { items, total, gravado, iva } = previewMontos(pedido, { modo });
  const faltanCCF = esCCF ? faltantesReceptorCCF(pedido) : [];

  const emitir = async () => {
    if (!empresa) { pushToast("No hay empresa emisora configurada", "error"); return; }
    if (!bridgeUrl) { pushToast("El bridge no está configurado", "error"); return; }
    setEmitiendo(true);
    setResultado(null);

    // Correlativo atómico por (empresa, tipo). Si falla, avisamos y abortamos:
    // emitir con un correlativo repetido genera rechazo/duplicado en Hacienda.
    const corr = await siguienteCorrelativo(empresa.id, tipoDte);
    if (corr == null) {
      setEmitiendo(false);
      setResultado({ ok: false, error: "No pude reservar el correlativo (¿está aplicada la migración dte_empresas?)." });
      return;
    }

    const payload = construirPayloadPedido({ pedido, empresa, modo, correlativo: corr });
    const r = await emitirPedidoDTE({ bridgeUrl, token, payload });
    setEmitiendo(false);
    setResultado(r);

    if (r.ok) {
      const dteInfo = {
        tipo: tipoDte, modo, monto: total, ambiente: empresa.ambiente,
        sello: r.sello, numeroControl: r.numeroControl,
        codigoGeneracion: r.codigoGeneracion, fecha: new Date().toISOString(),
        prueba: !prod,
      };
      const reg = await registrarDTEEmitido(
        pedido.id, pedido.dte_emitidos || pedido.dteEmitidos || [], dteInfo
      );
      pushToast(prod ? "DTE emitido ✓" : "DTE de prueba emitido ✓", "success");
      if (onFacturado) onFacturado(dteInfo, reg.lista);
    }
  };

  return (
    <Modal title={`🧾 Facturar — N°${String(pedido.id).padStart(4, "0")}`} onClose={onClose}>
      {/* Badge de ambiente */}
      <div style={{
        padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 700,
        background: prod ? "#E6F2EC" : "#FFF3E0",
        color: prod ? "#1B6B4A" : "#B8651B",
        border: `1px solid ${prod ? "#B7E0C9" : "#FFD9A8"}`,
      }}>
        {prod
          ? "🟢 Producción — esta factura tiene validez tributaria."
          : "🧪 MODO PRUEBAS — el DTE se emite contra el ambiente de pruebas de Hacienda. NO es una factura válida todavía."}
      </div>

      {!empresa && (
        <Aviso tipo="error">
          No hay empresa emisora configurada. Andá a <strong>⚙️ Configuración → Facturación electrónica</strong> y cargá una.
        </Aviso>
      )}
      {empresa && !bridgeUrl && (
        <Aviso tipo="error">
          El bridge Tlacuilo no está configurado. Cargá su URL en Configuración.
        </Aviso>
      )}

      {/* Receptor / tipo */}
      <div style={{ fontSize: 13, color: "#333", marginBottom: 10 }}>
        <Fila k="Documento" v={esCCF ? "Comprobante de Crédito Fiscal (03)" : "Factura de Consumidor Final (01)"} />
        <Fila k="Emisor" v={empresa ? `${empresa.nombre} · NIT ${empresa.nit}` : "—"} />
        <Fila k="Receptor" v={pedido.razonSocial || pedido.cliente || "—"} />
        {esCCF && <Fila k="NIT receptor" v={pedido.nit || "—"} />}
      </div>

      {esCCF && faltanCCF.length > 0 && (
        <Aviso tipo="warn">
          Para un Crédito Fiscal faltan datos del receptor: <strong>{faltanCCF.join(", ")}</strong>.
          Hacienda puede rechazarlo. Completalos editando el pedido.
        </Aviso>
      )}

      {/* Selector de modo */}
      {modos.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>
            ¿Qué facturar?
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {modos.map(m => (
              <button key={m.id} onClick={() => setModo(m.id)} style={{
                flex: 1, minWidth: 100, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                border: `1.5px solid ${modo === m.id ? "#1B6B4A" : "#ddd"}`,
                background: modo === m.id ? "#E6F2EC" : "#fff",
                color: modo === m.id ? "#1B6B4A" : "#666", fontWeight: 700, fontSize: 12, fontFamily: "inherit",
              }}>
                {m.label}<div style={{ fontSize: 10, fontWeight: 400 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ítems + desglose */}
      <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: 10, marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#aaa" }}>
              <th style={{ padding: "2px 4px" }}>Cant</th>
              <th style={{ padding: "2px 4px" }}>Descripción</th>
              <th style={{ padding: "2px 4px", textAlign: "right" }}>P.Unit</th>
              <th style={{ padding: "2px 4px", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={{ padding: 4, fontWeight: 700 }}>{it.cantidad}</td>
                <td style={{ padding: 4 }}>{it.descripcion}</td>
                <td style={{ padding: 4, textAlign: "right" }}>{fmt$(it.precioUniConIva)}</td>
                <td style={{ padding: 4, textAlign: "right" }}>{fmt$(it.cantidad * it.precioUniConIva)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e8e8e8", fontSize: 12 }}>
          <Fila k="Gravado" v={fmt$(gravado)} />
          <Fila k="IVA 13%" v={fmt$(iva)} />
          <Fila k="Total (IVA incl.)" v={fmt$(total)} bold />
        </div>
      </div>

      {/* Resultado */}
      {resultado && !resultado.ok && (
        <Aviso tipo="error">
          <strong>No se pudo emitir:</strong> {resultado.error}
          {resultado.pasos && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {resultado.pasos.map((p, i) => (
                <li key={i} style={{ color: p.ok ? "#1B6B4A" : "#C0392B" }}>
                  {p.ok ? "✓" : "✕"} {p.paso}{p.error ? `: ${p.error}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Aviso>
      )}
      {resultado && resultado.ok && (
        <Aviso tipo="ok">
          <strong>✓ DTE {prod ? "emitido" : "de prueba emitido"}.</strong>
          <div style={{ marginTop: 4, fontFamily: "monospace", fontSize: 11 }}>
            {resultado.numeroControl && <div>N° Control: {resultado.numeroControl}</div>}
            {resultado.sello && <div>Sello: {resultado.sello}</div>}
            {resultado.estado && <div>Estado: {resultado.estado}</div>}
          </div>
        </Aviso>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={onClose} style={{
          padding: "11px 18px", borderRadius: 8, border: "1.5px solid #ddd",
          background: "#fff", color: "#666", cursor: "pointer", fontWeight: 700, fontFamily: "inherit",
        }}>
          {resultado?.ok ? "Cerrar" : "Cancelar"}
        </button>
        {!resultado?.ok && (
          <button onClick={emitir} disabled={emitiendo || !empresa || !bridgeUrl} style={{
            padding: "11px 22px", borderRadius: 8, border: "none",
            background: prod ? "#1B6B4A" : "#E67E22", color: "#fff",
            cursor: (emitiendo || !empresa || !bridgeUrl) ? "not-allowed" : "pointer",
            opacity: (emitiendo || !empresa || !bridgeUrl) ? 0.6 : 1,
            fontWeight: 800, fontSize: 14, fontFamily: "inherit",
          }}>
            {emitiendo ? "⏳ Emitiendo…" : prod ? "🧾 Emitir DTE" : "🧪 Emitir prueba"}
          </button>
        )}
      </div>
    </Modal>
  );
}

function Fila({ k, v, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: bold ? 800 : 400 }}>
      <span style={{ color: "#888" }}>{k}</span>
      <span style={{ color: "#333", textAlign: "right" }}>{v}</span>
    </div>
  );
}

function Aviso({ tipo, children }) {
  const c = {
    ok:    { bg: "#E6F2EC", fg: "#1B6B4A", bd: "#B7E0C9" },
    warn:  { bg: "#FFF8E1", fg: "#8A6D1B", bd: "#FFE082" },
    error: { bg: "#FDEDEB", fg: "#C0392B", bd: "#F5C6C0" },
  }[tipo] || { bg: "#f5f5f5", fg: "#555", bd: "#e0e0e0" };
  return (
    <div style={{ background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12, lineHeight: 1.45 }}>
      {children}
    </div>
  );
}
