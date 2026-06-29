// Modal para enviar la cotización formal por email al cliente.
// Llama a la Edge Function 'enviar-cotizacion' que arma el HTML
// con datos del taller (firma + sello incrustados) y lo manda via
// Resend.

import { useState } from "react";
import { Modal } from "./lib/Modal.jsx";
import { enviarCotizacionEmail } from "./lib/email.js";
import { pushToast } from "./lib/feedback.js";

const INP = {
  width: "100%", padding: "9px 11px", borderRadius: 8,
  border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none",
  fontFamily: "inherit", background: "#fafafa", boxSizing: "border-box",
};
const LBL = {
  fontSize: 10, fontWeight: 700, color: "#888",
  marginBottom: 3, display: "block",
  textTransform: "uppercase", letterSpacing: .4,
};

export default function ModalEnviarCotizacion({ cotizacion, onClose }) {
  const num = String(cotizacion.id).padStart(4, "0");
  const [emails, setEmails] = useState("");
  const [asunto, setAsunto] = useState(
    `Cotización N° ${num} — UDP CONFECCIONES IMIS`
  );
  const [mensaje, setMensaje] = useState(
    `Estimado/a ${cotizacion.nombreContacto || cotizacion.cliente || "cliente"},\n\n` +
    "Por la presente, adjunto la cotización formal solicitada para su consideración.\n\n" +
    "Quedo atento/a a sus comentarios y a coordinar los próximos pasos.\n\n" +
    "Cordialmente,\nImelda Del Carmen Mancía De Ramírez\nRepresentante Legal — UDP CONFECCIONES IMIS"
  );
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    const lista = emails.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
    if (lista.length === 0) {
      pushToast("Pone al menos un email destinatario", "error");
      return;
    }
    for (const e of lista) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        pushToast(`Email inválido: ${e}`, "error");
        return;
      }
    }
    setEnviando(true);
    const res = await enviarCotizacionEmail({
      pedidoId: cotizacion.id,
      destinatarios: lista,
      asunto: asunto.trim() || undefined,
      mensajeExtra: mensaje.trim() || undefined,
    });
    setEnviando(false);
    if (res.ok) {
      pushToast(`Email enviado a ${lista.length} destinatario(s) ✓`, "success", 4000);
      onClose();
    } else {
      pushToast(`No pude enviar: ${res.error || "error desconocido"}`, "error", 6000);
    }
  };

  return (
    <Modal title={`📧 Enviar COT-${num} por email`} onClose={onClose}>
      <div>
        <div style={{ background: "#F3E5F5", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 12, color: "#6B2D8B" }}>
          <strong>Cotización:</strong> COT-{num} — {cotizacion.cliente}<br />
          {cotizacion.cotizacionAbierta ? (() => {
            const items = cotizacion.tallasItems || [];
            const qty = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
            const unit = items.length > 0 && parseFloat(items[0].precio) > 0
              ? parseFloat(items[0].precio)
              : qty > 0 ? parseFloat(cotizacion.precio || 0) / qty : parseFloat(cotizacion.precio || 0);
            return <><strong>Precio por unidad:</strong> ${unit.toFixed(2)} · ~{qty} unidades estimadas</>;
          })() : <><strong>Total:</strong> ${parseFloat(cotizacion.precio || 0).toFixed(2)} (IVA incluido)</>}
        </div>

        <label style={LBL}>Destinatarios (separados por coma)</label>
        <input
          style={{ ...INP, marginBottom: 10 }}
          value={emails}
          onChange={e => setEmails(e.target.value)}
          placeholder="ejemplo@cultura.gob.sv, otro@email.com"
          type="text"
          inputMode="email"
          autoFocus
        />

        <label style={LBL}>Asunto</label>
        <input
          style={{ ...INP, marginBottom: 10 }}
          value={asunto}
          onChange={e => setAsunto(e.target.value)}
        />

        <label style={LBL}>Mensaje (texto antes de la tabla de cotización)</label>
        <textarea
          style={{ ...INP, minHeight: 140, resize: "vertical" }}
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
        />

        <div style={{ marginTop: 10, padding: 8, background: "#EBF5FB", borderRadius: 6, fontSize: 11, color: "#1A5276" }}>
          💡 El email se manda desde <strong>onboarding@resend.dev</strong> (responder va a confecciones_imis@hotmail.com).
          Para clientes nuevos / importantes, sugerí también que revisen <strong>spam</strong>.
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button
            onClick={onClose}
            disabled={enviando}
            style={{
              padding: "10px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0",
              background: "#fff", cursor: enviando ? "wait" : "pointer",
              fontWeight: 600, fontFamily: "inherit", fontSize: 13,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={enviando || !emails.trim()}
            style={{
              padding: "10px 22px", borderRadius: 8, border: "none",
              background: enviando ? "#888" : "#27AE60", color: "#fff",
              cursor: (enviando || !emails.trim()) ? "not-allowed" : "pointer",
              fontWeight: 800, fontFamily: "inherit", fontSize: 14,
            }}
          >
            {enviando ? "⏳ Enviando..." : "📧 Enviar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
