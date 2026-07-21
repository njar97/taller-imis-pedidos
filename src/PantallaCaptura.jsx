// Página pública de captura de medidas (?captura=TOKEN).
//
// La abre quien toma las medidas (o la empresa cliente) desde el link
// que genera el admin en el detalle del pedido. Sin login: muestra solo
// la lista de personas del pedido en la TablaMedidas y un botón Guardar.
// No expone precios, notas ni el resto del pedido.

import { TALLER } from "./lib/constants.js";
import { pushToast } from "./lib/feedback.js";
import { capturaLeerPedido, capturaGuardarPersonas } from "./lib/captura.js";
import TablaMedidas from "./TablaMedidas.jsx";
import FichasMedidas from "./FichasMedidas.jsx";

import { useState, useEffect, useRef } from "react";

export default function PantallaCaptura({ token }) {
  const [estado, setEstado] = useState("cargando"); // cargando | ok | invalido
  const [pedido, setPedido] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);
  const sucioRef = useRef(false);
  // En teléfono la tabla con scroll horizontal es incómoda → fichas
  // persona-por-persona por default; en pantalla ancha, la tabla.
  const [vista, setVista] = useState(() => {
    try { return window.innerWidth < 720 ? "fichas" : "tabla"; }
    catch { return "fichas"; }
  });

  useEffect(() => {
    (async () => {
      const p = await capturaLeerPedido(token);
      if (!p) { setEstado("invalido"); return; }
      setPedido(p);
      setPersonas(Array.isArray(p.personas) ? p.personas : []);
      setEstado("ok");
    })();
  }, [token]);

  // Aviso al cerrar con cambios sin guardar.
  useEffect(() => {
    const h = e => {
      if (!sucioRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  function cambiar(nuevas) {
    setPersonas(nuevas);
    setSucio(true);
    sucioRef.current = true;
  }

  async function guardar() {
    setGuardando(true);
    const ok = await capturaGuardarPersonas(token, personas);
    setGuardando(false);
    if (ok) {
      setSucio(false);
      sucioRef.current = false;
      pushToast("Medidas guardadas ✅", "success");
    } else {
      pushToast("No se pudo guardar. Revisá la conexión y probá de nuevo.", "error", 6000);
    }
  }

  if (estado === "cargando") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
        ⏳ Cargando…
      </div>
    );
  }

  if (estado === "invalido") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", color: "#666", maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🔗</div>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#333" }}>Link inválido o vencido</div>
          <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
            Este link de captura ya no está activo. Pedile al taller que te mande uno nuevo.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f2fa", paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#2C1654,#3d2070)", color: "#fff", padding: "14px 16px" }}>
        <div style={{ fontSize: 11, opacity: 0.75, textTransform: "uppercase", letterSpacing: 1 }}>
          🧵 {TALLER} · Captura de medidas
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, marginTop: 3 }}>
          {pedido.cliente || "Pedido"} — {pedido.tipo_prenda || ""}
        </div>
        {pedido.fecha_entrega && (
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Entrega: {pedido.fecha_entrega}</div>
        )}
      </div>

      <div style={{ padding: 12, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 2px 10px" }}>
          <div style={{ flex: 1, fontSize: 12, color: "#777", lineHeight: 1.5 }}>
            {vista === "fichas"
              ? <>Tocá una persona para llenar sus medidas. Cuando termines (o cada tantas personas) tocá <strong>Guardar</strong>.</>
              : <>Llená la cuadrícula como en Excel (podés pegar rangos copiados). Al terminar tocá <strong>Guardar</strong>.</>}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {[["fichas", "👤 Fichas"], ["tabla", "📊 Tabla"]].map(([v, l]) => (
              <button key={v} onClick={() => setVista(v)} style={{
                padding: "7px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: "1.5px solid " + (vista === v ? "#6C3483" : "#ddd6ec"),
                background: vista === v ? "#6C3483" : "#fff",
                color: vista === v ? "#fff" : "#6C3483",
                cursor: "pointer", fontFamily: "inherit",
              }}>{l}</button>
            ))}
          </div>
        </div>
        {vista === "fichas" ? (
          <FichasMedidas personas={personas} onChange={cambiar} />
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, padding: 10 }}>
            <TablaMedidas personas={personas} onChange={cambiar} />
          </div>
        )}
      </div>

      {/* Barra fija de guardar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fff", borderTop: "1.5px solid #e0dced",
        padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
        display: "flex", alignItems: "center", gap: 12, justifyContent: "center",
      }}>
        <span style={{ fontSize: 12, color: sucio ? "#B85C00" : "#27AE60", fontWeight: 700 }}>
          {sucio ? "● Cambios sin guardar" : "✓ Todo guardado"}
        </span>
        <button
          onClick={guardar}
          disabled={guardando || !sucio}
          style={{
            padding: "12px 34px", borderRadius: 10, border: "none",
            background: guardando ? "#999" : sucio ? "#27AE60" : "#c9c3da",
            color: "#fff", fontWeight: 800, fontSize: 15,
            cursor: guardando || !sucio ? "default" : "pointer", fontFamily: "inherit",
          }}
        >
          {guardando ? "⏳ Guardando…" : "💾 Guardar"}
        </button>
      </div>
    </div>
  );
}
