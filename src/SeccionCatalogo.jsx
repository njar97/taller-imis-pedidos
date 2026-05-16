// Catálogo de tipos de prenda con CRUD.
// Antes vivían como SeccionCatalogo + ModalFormProducto compilados en main.js.

import { Modal } from "./lib/Modal.jsx";
import { pushToast, pushConfirm } from "./lib/feedback.js";
import { dbCatalogoGuardar as gsCatalogoGuardar } from "./lib/db.js";

const { useState } = React;

const INPS = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  background: "#FAFAF8",
};

const LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#666",
  marginBottom: 3,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const ICONOS = ["✂️", "👔", "👕", "👗", "👖", "🤵", "⚽", "🪡", "👚", "🧥"];

const fmtT = n => n ? `${n} día${n !== 1 ? "s" : ""}` : "-";

function ModalFormProducto({ initial, onSave, onCancel }) {
  const def = {
    nombre: "",
    icono: "✂️",
    telas: [],
    colores: [],
    modoDefault: "tallas",
    requiereMedidas: false,
    requiereCuello: false,
    camposExtra: [],
    tiempoEst: "",
    precioBase: "",
    preciosPorTalla: { XS: "", S: "", M: "", L: "", XL: "", "2XL": "", "3XL": "" },
    notas: "",
  };
  const [f, setF] = useState({ ...def, ...(initial || {}) });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [newTela, setNT] = useState("");
  const [newColor, setNC] = useState("");

  const addTela = () => {
    if (!newTela.trim()) return;
    set("telas", [...(f.telas || []), newTela.trim()]);
    setNT("");
  };
  const addColor = () => {
    if (!newColor.trim()) return;
    set("colores", [...(f.colores || []), newColor.trim()]);
    setNC("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: 16, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: "#2C1654", fontFamily: "Georgia,serif" }}>
            {initial ? "✏️ Editar producto" : "+ Nuevo tipo de prenda"}
          </h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LBL}>Ícono</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ICONOS.map(ic => (
              <button
                key={ic}
                onClick={() => set("icono", ic)}
                style={{
                  fontSize: 24,
                  padding: "6px",
                  borderRadius: 8,
                  border: "2px solid " + (f.icono === ic ? "#2C1654" : "#e0e0e0"),
                  background: f.icono === ic ? "#f0ebff" : "#fff",
                  cursor: "pointer",
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={LBL}>Nombre *</label>
            <input style={INPS} value={f.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: Filipina, Camisa polo..." />
          </div>
          <div>
            <label style={LBL}>Tiempo (días)</label>
            <input type="number" style={INPS} value={f.tiempoEst} onChange={e => set("tiempoEst", parseInt(e.target.value) || "")} placeholder="3" />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Modo de registro por default</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[["tallas", "📦 Por tallas"], ["lista", "📋 Lista de prendas"]].map(([v, l]) => (
              <button
                key={v}
                onClick={() => set("modoDefault", v)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border: "1.5px solid " + (f.modoDefault === v ? "#E67E22" : "#e0e0e0"),
                  background: f.modoDefault === v ? "#FFF3E0" : "#fff",
                  color: f.modoDefault === v ? "#E67E22" : "#666",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: f.modoDefault === v ? 700 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={f.requiereMedidas} onChange={e => set("requiereMedidas", e.target.checked)} style={{ accentColor: "#1A5276" }} />
            <span>📐 Requiere medidas</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={f.requiereCuello} onChange={e => set("requiereCuello", e.target.checked)} style={{ accentColor: "#9B59B6" }} />
            <span>🧶 Lleva cuello tejido</span>
          </label>
        </div>

        <ChipsInput label="Telas sugeridas" valor={f.telas || []} input={newTela} setInput={setNT} onAdd={addTela} onRemove={i => set("telas", (f.telas || []).filter((_, j) => j !== i))} placeholder="Agregar tela..." />
        <ChipsInput label="Colores comunes" valor={f.colores || []} input={newColor} setInput={setNC} onAdd={addColor} onRemove={i => set("colores", (f.colores || []).filter((_, j) => j !== i))} placeholder="Agregar color..." />

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Precios por talla ($ — opcional)</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {Object.entries(f.preciosPorTalla || {}).map(([t, p]) => (
              <div key={t}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#888", textAlign: "center", marginBottom: 2 }}>{t}</div>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={p || ""}
                  onChange={e => set("preciosPorTalla", { ...f.preciosPorTalla, [t]: e.target.value })}
                  placeholder="—"
                  style={{ ...INPS, textAlign: "center", padding: "5px 4px", fontSize: 12, color: "#27AE60", fontWeight: 700 }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Precio base ($ — para prendas sin talla fija)</label>
          <input type="number" style={INPS} value={f.precioBase || ""} onChange={e => set("precioBase", e.target.value)} placeholder="0.00" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LBL}>Notas / instrucciones</label>
          <textarea
            style={{ ...INPS, resize: "vertical", minHeight: 50 }}
            value={f.notas || ""}
            onChange={e => set("notas", e.target.value)}
            placeholder="Instrucciones especiales para este tipo de prenda..."
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#666" }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!f.nombre.trim()) {
                pushToast("El nombre es obligatorio", "error");
                return;
              }
              onSave(f);
            }}
            style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "#2C1654", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14 }}
          >
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipsInput({ label, valor, input, setInput, onAdd, onRemove, placeholder }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={LBL}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
        {valor.map((v, i) => (
          <span key={i} style={{ background: "#f0f0f0", borderRadius: 20, padding: "3px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
            {v}
            <button
              onClick={() => onRemove(i)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 14, padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onAdd()}
          placeholder={placeholder}
          style={{ ...INPS, flex: 1 }}
        />
        <button
          onClick={onAdd}
          style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#2C1654", color: "#fff", cursor: "pointer", fontWeight: 700 }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SeccionCatalogo({ catalogo, setCatalogo, esAdmin }) {
  const [modal, setModal] = useState(null); // null | "nuevo" | producto
  const [detalle, setDet] = useState(null);

  function guardar(form) {
    const isNuevo = modal === "nuevo";
    const id = isNuevo
      ? (catalogo.length ? Math.max(...catalogo.map(c => c.id || 0)) + 1 : 1)
      : modal.id;
    const prod = { ...form, id };
    const nueva = isNuevo ? [...catalogo, prod] : catalogo.map(p => p.id === id ? prod : p);
    setCatalogo(nueva);
    gsCatalogoGuardar(nueva);
    setModal(null);
  }

  async function eliminar(id) {
    const ok = await pushConfirm({
      titulo: "Eliminar producto",
      msg: "¿Eliminar este producto del catálogo? Esta acción no se puede deshacer.",
      okLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    const nueva = catalogo.filter(p => p.id !== id);
    setCatalogo(nueva);
    gsCatalogoGuardar(nueva);
    setDet(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 16, color: "#2C1654", fontWeight: 800, fontFamily: "Georgia,serif" }}>🧵 Catálogo de productos</h1>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            {catalogo.length} tipo{catalogo.length !== 1 ? "s" : ""} de prenda
          </div>
        </div>
        {esAdmin && (
          <button
            onClick={() => setModal("nuevo")}
            style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#2C1654", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
          >
            + Nuevo tipo
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {catalogo.map(prod => (
            <div
              key={prod.id}
              onClick={() => setDet(prod)}
              style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1.5px solid #f0f0f0", cursor: "pointer", transition: "box-shadow .15s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{prod.icono || "✂️"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#2C1654" }}>{prod.nombre}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {prod.requiereMedidas && (
                      <span style={{ fontSize: 9, background: "#EBF5FB", color: "#1A5276", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>📐 A la medida</span>
                    )}
                    {prod.requiereCuello && (
                      <span style={{ fontSize: 9, background: "#F3E5F5", color: "#6B2D8B", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>🧶 Con cuello</span>
                    )}
                    {prod.modoDefault === "lista" && (
                      <span style={{ fontSize: 9, background: "#FFF3E0", color: "#E67E22", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>📋 Lista</span>
                    )}
                    <span style={{ fontSize: 9, background: "#f0f0f0", color: "#888", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>⏱ {fmtT(prod.tiempoEst)}</span>
                  </div>
                </div>
              </div>
              {prod.telas && prod.telas.length > 0 && (
                <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
                  🧵 {prod.telas.slice(0, 3).join(", ")}{prod.telas.length > 3 ? "..." : ""}
                </div>
              )}
              {prod.precioBase && (
                <div style={{ fontSize: 13, fontWeight: 800, color: "#27AE60" }}>Desde ${prod.precioBase}</div>
              )}
              {prod.preciosPorTalla && Object.values(prod.preciosPorTalla).some(v => v) && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  {Object.entries(prod.preciosPorTalla).filter(([, v]) => v).map(([t, p]) => (
                    <span key={t} style={{ fontSize: 9, background: "#f0fff4", color: "#155724", padding: "2px 6px", borderRadius: 8, fontWeight: 700 }}>
                      {t}: ${p}
                    </span>
                  ))}
                </div>
              )}
              {prod.notas && (
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>{prod.notas}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {detalle && (
        <Modal title={`${detalle.icono || "✂️"} ${detalle.nombre}`} onClose={() => setDet(null)}>
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {[
              ["Modo de registro", detalle.modoDefault === "lista" ? "📋 Lista de prendas" : "📦 Por tallas"],
              ["Requiere medidas",  detalle.requiereMedidas ? "✅ Sí" : "No"],
              ["Cuello tejido",      detalle.requiereCuello ? "✅ Sí (coordinar con Cuellos)" : "No"],
              ["Tiempo estimado",    fmtT(detalle.tiempoEst)],
              ["Telas sugeridas",    (detalle.telas || []).join(", ") || "—"],
              ["Colores comunes",    (detalle.colores || []).join(", ") || "—"],
              ["Precio base",        detalle.precioBase ? `$${detalle.precioBase}` : "Sin precio base"],
              ["Notas",              detalle.notas || "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f5f5f5", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#aaa", fontWeight: 700, whiteSpace: "nowrap" }}>{k}</span>
                <span style={{ fontSize: 13, color: "#333", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>

          {detalle.preciosPorTalla && Object.values(detalle.preciosPorTalla).some(v => v) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 8 }}>Precios por talla</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(detalle.preciosPorTalla).filter(([, v]) => v).map(([t, p]) => (
                  <div key={t} style={{ background: "#f0fff4", border: "1px solid #a8d8a8", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#2C1654" }}>{t}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#27AE60" }}>${p}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {esAdmin && (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={() => eliminar(detalle.id)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #fdd", background: "#fff8f8", color: "#DC3545", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
              >
                🗑️ Eliminar
              </button>
              <button
                onClick={() => { setModal(detalle); setDet(null); }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2C1654", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
              >
                ✏️ Editar
              </button>
            </div>
          )}
        </Modal>
      )}

      {modal && (
        <ModalFormProducto
          initial={modal !== "nuevo" ? modal : null}
          onSave={guardar}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
