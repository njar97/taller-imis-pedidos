// Modal con lista de versiones anteriores de un pedido + botón
// restaurar. Sacado de DetallePedidoModal para poder usar también
// desde SeccionCotizaciones (en la card de la cotización).

import { useEffect, useState } from "react";
import { Modal } from "./lib/Modal.jsx";
import { leerVersiones, restaurarVersion } from "./lib/versiones.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";

const camposClave = ["precio", "estatus", "cliente", "telefono", "fecha_entrega", "tallas_items", "tipo_prenda", "notas", "descripcion"];
const toCamel = s => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export default function ModalVersionesPedido({ pedido, onClose, onRestaurado }) {
  const [versiones, setVersiones] = useState(null);
  const [restaurando, setRestaurando] = useState(false);

  useEffect(() => {
    leerVersiones(pedido.id).then(setVersiones);
  }, [pedido.id]);

  const restaurar = async (v) => {
    const ok = await pushConfirm({
      titulo: "Restaurar versión",
      msg: `¿Restaurar este pedido al estado del ${new Date(v.creado_en).toLocaleString("es-SV")}? Los cambios actuales se guardarán como versión por si querés volver.`,
      okLabel: "Sí, restaurar",
    });
    if (!ok) return;
    setRestaurando(true);
    const exito = await restaurarVersion(v.id, pedido.id);
    setRestaurando(false);
    if (exito) {
      pushToast("Versión restaurada. Recargá la página para ver cambios.", "success");
      if (onRestaurado) onRestaurado();
      onClose();
    } else {
      pushToast("No pude restaurar la versión", "error");
    }
  };

  return (
    <Modal title={`🕗 Versiones de N°${String(pedido.id).padStart(4, "0")}`} onClose={onClose}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
        Cada vez que guardás cambios en este pedido, queda un snapshot automático del estado anterior.
        Tocá <strong>Restaurar</strong> en una versión para volver a ese estado.
      </div>
      {versiones === null && <div style={{ textAlign: "center", padding: 20, color: "#aaa" }}>⏳ Cargando...</div>}
      {versiones && versiones.length === 0 && (
        <div style={{ textAlign: "center", padding: 20, color: "#aaa", fontSize: 12 }}>
          Sin versiones anteriores. Este pedido es la versión actual.
        </div>
      )}
      {versiones && versiones.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {versiones.map((v, i) => {
            const snap = v.snapshot || {};
            const fecha = new Date(v.creado_en);
            const cambios = camposClave.filter(k => {
              const a = JSON.stringify(snap[k] ?? null);
              const b = JSON.stringify(pedido[toCamel(k)] ?? snap[k] ?? null);
              return a !== b;
            });
            return (
              <div key={v.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: i === 0 ? "#FFF8E1" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#2C1654" }}>
                      {fecha.toLocaleString("es-SV")}
                      {i === 0 && <span style={{ marginLeft: 6, fontSize: 9, background: "#E67E22", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>MÁS RECIENTE</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
                      Precio: <strong>${snap.precio || "0"}</strong>
                      {" · "}Estatus: <strong>{snap.estatus || "—"}</strong>
                      {" · "}Items: <strong>{(snap.tallas_items || []).length}</strong>
                    </div>
                    {cambios.length > 0 && (
                      <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                        Difiere de actual en: <strong>{cambios.join(", ")}</strong>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => restaurar(v)}
                    disabled={restaurando}
                    style={{
                      padding: "6px 12px", borderRadius: 6, border: "none",
                      background: "#9B59B6", color: "#fff", cursor: "pointer",
                      fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    🔄 Restaurar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
