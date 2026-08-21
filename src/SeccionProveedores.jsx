// Directorio de proveedores: vive como pestaña dentro de 📦 Inventario.
// Cada tarjeta abre WhatsApp con un toque; la edición es un formulario simple.

import { useState, useEffect } from "react";
import {
  RUBROS_PROV, leerProveedores, guardarProveedor, borrarProveedor,
  filtrarProveedores, linkWA,
} from "./lib/proveedores.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";

const INP = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0",
  fontSize: 14, outline: "none", boxSizing: "border-box", background: "#FAFAFA", fontFamily: "inherit",
};
const LBL = {
  fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 3, display: "block",
  textTransform: "uppercase", letterSpacing: 0.4,
};
const BTN = (bg = "#9B59B6", disabled = false) => ({
  padding: "10px 20px", borderRadius: 8, border: "none", background: disabled ? "#ccc" : bg,
  color: "#fff", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit",
});

const VACIO = {
  nombre: "", rubros: [], whatsapp: "", telefono: "", correo: "",
  direccion: "", ciudad: "", precios: "", notas: "", ultimoContacto: "",
};

function hoyISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function FormProveedor({ inicial, onGuardar, onCerrar }) {
  const [p, setP] = useState(() => ({ ...VACIO, ...(inicial || {}) }));
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  const toggleRubro = (r) => set("rubros", p.rubros.includes(r) ? p.rubros.filter(x => x !== r) : [...p.rubros, r]);

  const guardar = async () => {
    if (!p.nombre.trim()) { pushToast("Falta el nombre del proveedor", "error"); return; }
    setGuardando(true);
    try { await onGuardar(p); onCerrar(); }
    catch (e) { pushToast(e.message, "error"); }
    finally { setGuardando(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 560, maxHeight: "92vh", overflow: "auto", padding: 18 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#2C1654", fontFamily: "Georgia,serif" }}>
          {p.id ? "✏️ Editar proveedor" : "🏭 Nuevo proveedor"}
        </h2>
        <div style={{ display: "grid", gap: 10 }}>
          <div><label style={LBL}>Nombre</label>
            <input style={INP} value={p.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Solución Digital – Parque Infantil" /></div>
          <div><label style={LBL}>Qué vende</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {RUBROS_PROV.map(r => {
                const on = p.rubros.includes(r);
                return (
                  <button key={r} type="button" onClick={() => toggleRubro(r)}
                    style={{ padding: "6px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      border: "1.5px solid " + (on ? "#9B59B6" : "#ddd"), background: on ? "#9B59B6" : "#fff", color: on ? "#fff" : "#555" }}>
                    {r}
                  </button>
                );
              })}
            </div></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={LBL}>WhatsApp</label>
              <input style={INP} inputMode="tel" value={p.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="2221-5535" /></div>
            <div><label style={LBL}>Teléfono</label>
              <input style={INP} inputMode="tel" value={p.telefono} onChange={e => set("telefono", e.target.value)} /></div>
          </div>
          <div><label style={LBL}>Correo</label>
            <input style={INP} inputMode="email" value={p.correo} onChange={e => set("correo", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <div><label style={LBL}>Dirección</label>
              <input style={INP} value={p.direccion} onChange={e => set("direccion", e.target.value)} /></div>
            <div><label style={LBL}>Ciudad</label>
              <input style={INP} value={p.ciudad} onChange={e => set("ciudad", e.target.value)} placeholder="San Salvador" /></div>
          </div>
          <div><label style={LBL}>Precios de referencia</label>
            <textarea style={{ ...INP, minHeight: 60 }} value={p.precios} onChange={e => set("precios", e.target.value)}
              placeholder="DTF normal $10 el metro 58x100 (21-ago-2026)" /></div>
          <div><label style={LBL}>Notas</label>
            <textarea style={{ ...INP, minHeight: 50 }} value={p.notas} onChange={e => set("notas", e.target.value)}
              placeholder="Solo DTF normal, no brillante. Herbert lo recoge cuando va a SS." /></div>
          <div><label style={LBL}>Último contacto</label>
            <input style={INP} type="date" value={p.ultimoContacto} onChange={e => set("ultimoContacto", e.target.value)} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCerrar} style={BTN("#888")}>Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando} style={BTN("#27AE60", guardando)}>
            {guardando ? "⏳" : "💾 Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TarjetaProveedor({ p, onEditar, onBorrar, onContacto }) {
  const wa = linkWA(p.whatsapp);
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "1px solid #eee", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#2C1654" }}>{p.nombre}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {p.rubros.map(r => (
              <span key={r} style={{ fontSize: 10, fontWeight: 700, background: "#F3E8FA", color: "#7D3C98", borderRadius: 10, padding: "2px 8px" }}>{r}</span>
            ))}
          </div>
          {(p.ciudad || p.direccion) && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>📍 {[p.direccion, p.ciudad].filter(Boolean).join(" · ")}</div>
          )}
          {p.precios && <div style={{ fontSize: 12, color: "#1B5E20", marginTop: 4, whiteSpace: "pre-wrap" }}>💲 {p.precios}</div>}
          {p.notas && <div style={{ fontSize: 12, color: "#888", marginTop: 4, whiteSpace: "pre-wrap" }}>📝 {p.notas}</div>}
          {p.ultimoContacto && <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Último contacto: {p.ultimoContacto}</div>}
        </div>
        <button onClick={() => onEditar(p)} title="Editar"
          style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer" }}>✏️</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" onClick={() => onContacto(p)}
            style={{ ...BTN("#25D366"), padding: "8px 14px", fontSize: 13, textDecoration: "none" }}>
            💬 WhatsApp
          </a>
        )}
        {p.telefono && (
          <a href={"tel:" + p.telefono.replace(/\D/g, "")} style={{ ...BTN("#2980B9"), padding: "8px 14px", fontSize: 13, textDecoration: "none" }}>
            📞 {p.telefono}
          </a>
        )}
        {p.correo && (
          <a href={"mailto:" + p.correo} style={{ ...BTN("#7F8C8D"), padding: "8px 14px", fontSize: 13, textDecoration: "none" }}>✉️</a>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={() => onBorrar(p)} style={{ border: "none", background: "transparent", color: "#bbb", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          🗑️ quitar
        </button>
      </div>
    </div>
  );
}

export default function SeccionProveedores() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busq, setBusq] = useState("");
  const [rubro, setRubro] = useState("todos");
  const [editando, setEditando] = useState(null); // proveedor | "nuevo" | null

  useEffect(() => {
    let vivo = true;
    leerProveedores().then(l => { if (vivo) { setLista(l); setCargando(false); } });
    return () => { vivo = false; };
  }, []);

  const guardar = async (p) => {
    const saved = await guardarProveedor(p);
    setLista(prev => {
      const existe = prev.some(x => x.id === saved.id);
      const next = existe ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved];
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
    pushToast("Proveedor guardado");
  };

  const borrar = async (p) => {
    const ok = await pushConfirm({
      titulo: "Quitar proveedor",
      msg: "¿Quitar a " + p.nombre + " de la lista?",
      okLabel: "Quitar", danger: true,
    });
    if (!ok) return;
    try {
      await borrarProveedor(p.id);
      setLista(prev => prev.filter(x => x.id !== p.id));
    } catch (e) { pushToast(e.message, "error"); }
  };

  // Al abrir el WhatsApp anotamos la fecha de último contacto sin molestar.
  const marcarContacto = (p) => {
    const hoy = hoyISO();
    if (p.ultimoContacto === hoy) return;
    guardarProveedor({ ...p, ultimoContacto: hoy })
      .then(s => setLista(prev => prev.map(x => x.id === s.id ? s : x)))
      .catch(() => {});
  };

  const rubrosUsados = RUBROS_PROV.filter(r => lista.some(p => p.rubros.includes(r)));
  const vis = filtrarProveedores(lista, busq, rubro);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="🔍 Buscar proveedor, rubro, ciudad..."
          style={{ ...INP, flex: 1, minWidth: 180 }} />
        <button onClick={() => setEditando("nuevo")} style={{ ...BTN("#27AE60"), whiteSpace: "nowrap", fontSize: 13, padding: "9px 14px" }}>
          + Proveedor
        </button>
      </div>
      {rubrosUsados.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {["todos", ...rubrosUsados].map(r => {
            const on = rubro === r;
            return (
              <button key={r} onClick={() => setRubro(r)}
                style={{ padding: "5px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: "1.5px solid " + (on ? "#2C1654" : "#ddd"), background: on ? "#2C1654" : "#fff", color: on ? "#fff" : "#555" }}>
                {r === "todos" ? "Todos" : r}
              </button>
            );
          })}
        </div>
      )}

      {cargando ? (
        <div style={{ color: "#aaa", fontSize: 13, padding: 20, textAlign: "center" }}>⏳ Cargando proveedores...</div>
      ) : vis.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 36, textAlign: "center", border: "2px dashed #e0e0e0" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
          <div style={{ fontSize: 14, color: "#666" }}>
            {lista.length === 0 ? "Todavía no hay proveedores. Agregá el primero." : "Ninguno coincide con la búsqueda."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {vis.map(p => (
            <TarjetaProveedor key={p.id} p={p} onEditar={setEditando} onBorrar={borrar} onContacto={marcarContacto} />
          ))}
        </div>
      )}

      {editando && (
        <FormProveedor inicial={editando === "nuevo" ? null : editando} onGuardar={guardar} onCerrar={() => setEditando(null)} />
      )}
    </div>
  );
}
