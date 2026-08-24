// Banner de recordatorio al abrir la app. Avisa si hay pedidos que
// vencen en los próximos N días (default 7) o que ya vencieron sin
// estar archivados. Se muestra una vez por día (memoriza en
// localStorage con la fecha del último aviso).
//
// No reemplaza push notifications nativas — esto solo funciona cuando
// el user efectivamente abre la app. Para alerta proactiva con la app
// cerrada, ver el siguiente PR (Web Push con Supabase Edge Function).

import { useEffect, useState } from "react";

const LS_KEY = "TALLER_LAST_REMINDER";
const DIAS_AVISO = 7;

const hoyStr = () => new Date().toISOString().split("T")[0];

function diasHasta(fecha) {
  if (!fecha) return null;
  const ms = new Date(fecha + "T12:00:00") - new Date();
  return Math.ceil(ms / 86400000);
}


// Días que una cotización puede pasar sin volverse pedido antes de que se
// pregunte si se archiva. Lo fijó Javier (24-ago-2026).
const DIAS_COTIZACION = 7;

function diasDesde(fecha) {
  if (!fecha) return null;
  return Math.floor((new Date() - new Date(fecha + "T12:00:00")) / 86400000);
}

export default function RecordatorioInicio({ pedidos, onIrAVencidos, onIrAProximos, onIrACotizaciones }) {
  const [cerrado, setCerrado] = useState(false);

  // Solo mostrar una vez por día — y solo cuando hay pedidos activos
  const ya = (typeof localStorage !== "undefined" && localStorage.getItem(LS_KEY)) || "";
  const yaHoy = ya === hoyStr();

  const { vencidos, proximos, cotizacionesViejas } = (() => {
    const venc = [];
    const prox = [];
    const cots = [];
    for (const p of pedidos || []) {
      if (p.deletedAt) continue;
      if (p.esCotizacion) {
        // No se volvió pedido y ya lleva días: preguntar si se archiva.
        const d = diasDesde(p.fecha);
        if (!p.archivada && d !== null && d >= DIAS_COTIZACION) cots.push(p);
        continue;
      }
      if (["Entregado", "Cancelado"].includes(p.estatus)) continue;
      const d = diasHasta(p.fechaEntrega);
      if (d === null) continue;
      if (d < 0) venc.push(p);
      else if (d <= DIAS_AVISO) prox.push(p);
    }
    return { vencidos: venc, proximos: prox, cotizacionesViejas: cots };
  })();

  useEffect(() => {
    if (!yaHoy && (vencidos.length > 0 || proximos.length > 0 || cotizacionesViejas.length > 0)) {
      try { localStorage.setItem(LS_KEY, hoyStr()); } catch {}
    }
  }, [yaHoy, vencidos.length, proximos.length, cotizacionesViejas.length]);

  if (cerrado || yaHoy || (vencidos.length === 0 && proximos.length === 0 && cotizacionesViejas.length === 0)) return null;

  const totalAlertas = vencidos.length + proximos.length;

  return (
    <div style={{
      position: "fixed",
      top: 16,
      left: "50%",
      transform: "translateX(-50%)",
      width: "calc(100% - 32px)",
      maxWidth: 480,
      background: vencidos.length > 0 ? "#FFF5F5" : "#FFF8E1",
      border: "2px solid " + (vencidos.length > 0 ? "#E74C3C" : "#E67E22"),
      borderRadius: 12,
      padding: 14,
      zIndex: 9000,
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      animation: "slideDown .3s ease-out",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: vencidos.length > 0 ? "#C0392B" : "#856404",
            marginBottom: 6,
          }}>
            {vencidos.length > 0 ? "⏰ Hay pedidos vencidos" : proximos.length > 0 ? "📌 Pedidos próximos a vencer" : "📦 Cotizaciones sin volverse pedido"}
          </div>
          <div style={{ fontSize: 12, color: "#444", marginBottom: 10 }}>
            {vencidos.length > 0 && (
              <span><strong style={{ color: "#E74C3C" }}>{vencidos.length}</strong> vencido{vencidos.length === 1 ? "" : "s"}</span>
            )}
            {vencidos.length > 0 && proximos.length > 0 && " · "}
            {proximos.length > 0 && (
              <span><strong style={{ color: "#E67E22" }}>{proximos.length}</strong> vence{proximos.length === 1 ? "" : "n"} en ≤{DIAS_AVISO} días</span>
            )}
            {(vencidos.length > 0 || proximos.length > 0) && cotizacionesViejas.length > 0 && " · "}
            {cotizacionesViejas.length > 0 && (
              <span><strong style={{ color: "#9B59B6" }}>{cotizacionesViejas.length}</strong> cotización{cotizacionesViejas.length === 1 ? "" : "es"} sin volverse pedido</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {vencidos.length > 0 && (
              <button
                onClick={() => { setCerrado(true); onIrAVencidos && onIrAVencidos(); }}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "none",
                  background: "#E74C3C", color: "#fff", cursor: "pointer",
                  fontWeight: 700, fontSize: 12, fontFamily: "inherit",
                }}
              >
                Ver vencidos
              </button>
            )}
            {proximos.length > 0 && (
              <button
                onClick={() => { setCerrado(true); onIrAProximos && onIrAProximos(); }}
                style={{
                  padding: "7px 14px", borderRadius: 8,
                  border: "1.5px solid " + (vencidos.length > 0 ? "#E67E22" : "#E67E22"),
                  background: "#E67E22", color: "#fff", cursor: "pointer",
                  fontWeight: 700, fontSize: 12, fontFamily: "inherit",
                }}
              >
                Ver próximos
              </button>
            )}
            {cotizacionesViejas.length > 0 && (
              <button
                onClick={() => { setCerrado(true); onIrACotizaciones && onIrACotizaciones(); }}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "none",
                  background: "#9B59B6", color: "#fff", cursor: "pointer",
                  fontWeight: 700, fontSize: 12, fontFamily: "inherit",
                }}
              >
                📦 Revisar cotizaciones
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setCerrado(true)}
          title="Cerrar (vuelve a salir mañana)"
          style={{
            background: "none", border: "none", color: "#999",
            cursor: "pointer", fontSize: 20, padding: 0, lineHeight: 1,
            flexShrink: 0,
          }}
        >×</button>
      </div>
    </div>
  );
}
