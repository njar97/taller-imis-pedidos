// Inventario del taller: importar DTE (.db) → clasificar → asignar a pedidos.
// Antes vivían como SeccionInventario + BarraStock + ModalSeleccion + ModalAsignar
// compilados en main.js. ~995 líneas → ~520 de JSX.

import { CATEGORIAS_INV } from "./lib/constants.js";
import { fmt$ } from "./lib/dominio.js";
import { leerDB } from "./lib/leerDB.js";
import {
  leerItems, guardarItem, guardarItemsBulk, borrarItem,
  leerAsignaciones, guardarAsignacion, borrarAsignacion,
} from "./lib/inventario.js";
import { subirFotoSupabase } from "./supabaseStorage.js";
import { comprimirImagen } from "./lib/imagenes.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";

import { useState, useEffect, useRef } from "react";

const ESTADO_INFO = {
  funcionando: { color: "#27AE60", icon: "✅", label: "Funcionando" },
  revision:    { color: "#E67E22", icon: "🔧", label: "En revisión" },
  danado:      { color: "#DC3545", icon: "⚠️", label: "Dañado" },
  agotado:     { color: "#888",    icon: "📭", label: "Agotado" },
};

const INP = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#FAFAFA",
  fontFamily: "inherit",
};

const LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#888",
  marginBottom: 3,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const BTN = (bg = "#9B59B6", disabled = false) => ({
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: disabled ? "#ccc" : bg,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  fontSize: 14,
});

const CAT_INFO = {
  material:    { color: "#9B59B6", icon: "🧵" },
  herramienta: { color: "#E67E22", icon: "✂️" },
  equipo:      { color: "#2980B9", icon: "🔧" },
};

// ── BarraStock ─────────────────────────────────────────────

function BarraStock({ total, usado }) {
  const pct = total > 0 ? Math.min((usado / total) * 100, 100) : 0;
  const c = pct >= 90 ? "#DC3545" : pct >= 60 ? "#FD7E14" : "#28A745";
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ background: "#f0f0f0", borderRadius: 10, height: 7, overflow: "hidden" }}>
        <div style={{ width: pct + "%", background: c, height: "100%", borderRadius: 10, transition: "width .3s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: "#888" }}>
        <span style={{ color: c, fontWeight: 700 }}>Usado: {usado.toFixed(2)}</span>
        <span>
          Disp:{" "}
          <strong style={{ color: total - usado <= 0 ? "#DC3545" : "#28A745" }}>
            {(total - usado).toFixed(2)}
          </strong>
        </span>
        <span>Total: {total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── ModalSeleccion ────────────────────────────────────────

function ModalSeleccion({ items, onConfirmar, onCancelar }) {
  const grupos = items.reduce((acc, it) => {
    if (!acc[it.doc_id]) acc[it.doc_id] = { fecha: it.fecha, proveedor: it.proveedor, items: [] };
    acc[it.doc_id].items.push(it);
    return acc;
  }, {});

  const [sel, setSel] = useState(() => {
    const s = {};
    items.forEach(it => (s[it.id] = { checked: false, cat: "material" }));
    return s;
  });
  const [busq, setBusq] = useState("");

  const toggle = id => setSel(p => ({ ...p, [id]: { ...p[id], checked: !p[id].checked } }));
  const setCat = (id, cat) => setSel(p => ({ ...p, [id]: { ...p[id], cat } }));
  const toggleDoc = docId => {
    const its = grupos[docId].items;
    const all = its.every(it => sel[it.id].checked);
    setSel(p => {
      const n = { ...p };
      its.forEach(it => (n[it.id] = { ...n[it.id], checked: !all }));
      return n;
    });
  };

  const nSel = Object.values(sel).filter(v => v.checked).length;
  const filtrados = busq
    ? items.filter(it =>
        it.descripcion.toLowerCase().includes(busq.toLowerCase()) ||
        it.proveedor.toLowerCase().includes(busq.toLowerCase()))
    : items;
  const docsFilt = [...new Set(filtrados.map(it => it.doc_id))];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 12 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#2C1654" }}>📂 Importar ítems del DTE</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Selecciona y clasifica cada ítem</div>
          <input
            value={busq}
            onChange={e => setBusq(e.target.value)}
            placeholder="🔍 Buscar..."
            style={{ ...INP, marginTop: 10 }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          {docsFilt.map(docId => {
            const g = grupos[docId];
            const its = g.items.filter(it => !busq || it.descripcion.toLowerCase().includes(busq.toLowerCase()));
            if (!its.length) return null;
            const allSel = its.every(it => sel[it.id].checked);
            const algSel = its.some(it => sel[it.id].checked);
            return (
              <div key={docId} style={{ marginTop: 12, border: "1.5px solid #eee", borderRadius: 10, overflow: "hidden" }}>
                <div
                  onClick={() => toggleDoc(docId)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: allSel ? "#f8f4ff" : algSel ? "#fffdf5" : "#fafafa", cursor: "pointer", borderBottom: "1px solid #eee" }}
                >
                  <input
                    type="checkbox"
                    checked={allSel}
                    onChange={() => toggleDoc(docId)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 16, height: 16, accentColor: "#9B59B6" }}
                    ref={el => { if (el) el.indeterminate = algSel && !allSel; }}
                  />
                  <span style={{ fontWeight: 700, color: "#2C1654", fontSize: 13, flex: 1 }}>{g.proveedor}</span>
                  <span style={{ fontSize: 11, color: "#aaa" }}>
                    {g.fecha} · {its.filter(it => sel[it.id].checked).length}/{its.length}
                  </span>
                </div>
                {its.map(it => (
                  <div
                    key={it.id}
                    style={{ padding: "10px 14px 10px 28px", background: sel[it.id].checked ? "#fdfbff" : "#fff", borderBottom: "1px solid #f8f8f8" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={sel[it.id].checked}
                        onChange={() => toggle(it.id)}
                        style={{ width: 15, height: 15, accentColor: "#9B59B6", flexShrink: 0 }}
                      />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#333" }}>{it.descripcion}</span>
                      <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" }}>{it.cantidad} {it.unidad}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#2C1654", minWidth: 55, textAlign: "right" }}>{fmt$(it.total)}</span>
                    </div>
                    {sel[it.id].checked && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, marginLeft: 24, flexWrap: "wrap" }}>
                        {CATEGORIAS_INV.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setCat(it.id, cat.id)}
                            title={cat.desc}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 20,
                              border: "1.5px solid " + (sel[it.id].cat === cat.id ? cat.color : "#e0e0e0"),
                              background: sel[it.id].cat === cat.id ? cat.color + "22" : "#fff",
                              color: sel[it.id].cat === cat.id ? cat.color : "#bbb",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {cat.icon} {cat.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderRadius: "0 0 16px 16px" }}>
          <div style={{ fontSize: 13, color: nSel > 0 ? "#155724" : "#888", fontWeight: 700 }}>
            {nSel > 0 ? `✅ ${nSel} seleccionado(s)` : "Ninguno"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancelar} style={BTN("#aaa")}>Cancelar</button>
            <button
              onClick={() =>
                onConfirmar(items.filter(it => sel[it.id].checked).map(it => ({ ...it, categoria: sel[it.id].cat })))
              }
              disabled={nSel === 0}
              style={BTN("#28A745", nSel === 0)}
            >
              ✅ Agregar {nSel > 0 ? nSel : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ModalAsignar ──────────────────────────────────────────

function ModalAsignar({ material, disponible, pedidos, onGuardar, onCancelar }) {
  const [pedidoId, setPId] = useState("");
  const [cantidad, setCant] = useState("");
  const [nota, setNota] = useState("");
  const cantN = parseFloat(cantidad) || 0;
  const valido = pedidoId && cantN > 0 && cantN <= disponible;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 12 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#2C1654", marginBottom: 12 }}>Asignar material a pedido</div>
        <div style={{ background: "#f8f4ff", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>{material.descripcion}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            {fmt$(material.precio_unitario)}/{material.unidad || "u"} · Disponible:{" "}
            <strong style={{ color: "#28A745" }}>{disponible.toFixed(2)}</strong>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Pedido *</label>
          <select value={pedidoId} onChange={e => setPId(e.target.value)} style={INP}>
            <option value="">— Seleccionar —</option>
            {pedidos.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).map(p => (
              <option key={p.id} value={String(p.id)}>#{p.id} — {p.cliente}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Cantidad (máx {disponible.toFixed(2)}) *</label>
          <input
            type="number"
            value={cantidad}
            onChange={e => setCant(e.target.value)}
            min="0"
            max={disponible}
            step="0.01"
            style={{ ...INP, borderColor: cantN > disponible ? "#DC3545" : "#e0e0e0" }}
          />
          {cantN > 0 && cantN <= disponible && (
            <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>
              Costo: <strong>{fmt$(cantN * material.precio_unitario)}</strong>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LBL}>Nota (opcional)</label>
          <input value={nota} onChange={e => setNota(e.target.value)} style={INP} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancelar} style={BTN("#aaa")}>Cancelar</button>
          <button
            onClick={() => valido && onGuardar({ pedidoId, cantidad: cantN, nota })}
            disabled={!valido}
            style={BTN("#9B59B6", !valido)}
          >
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SeccionInventario ────────────────────────────────────

export default function SeccionInventario({ pedidos, inventario, setInventario, asignaciones, setAsignaciones, esAdmin }) {
  const fileRef = useRef();
  const [cargandoBD, setCargandoBD] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [itemsCrudo, setRaw] = useState(null);
  const [modalAsig, setMAsig] = useState(null);
  const [busq, setBusq] = useState("");
  const [catFiltro, setCatF] = useState("todos");
  const [verDet, setVerDet] = useState(null);
  const [editando, setEditando] = useState(null); // item | "nuevo" | null

  // Cargar desde Supabase en mount. Solo si el state local está vacío
  // (evita re-fetch cuando volvés a entrar a la sección).
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [its, asigs] = await Promise.all([leerItems(), leerAsignaciones()]);
      if (cancelado) return;
      setInventario(its);
      setAsignaciones(asigs);
      setCargandoBD(false);
    })();
    return () => { cancelado = true; };
  }, []);

  const cargarDB = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setCargando(true);
    setError("");
    try {
      const items = await leerDB(file);
      if (!items.length) setError("No se encontraron facturas.");
      else setRaw(items);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setCargando(false);
    e.target.value = "";
  };

  const confirmarSel = async elegidos => {
    // Conservar campos enriquecidos (foto/spec/notas) si el item ya existía
    const mapa = Object.fromEntries(inventario.map(m => [m.id, m]));
    const itemsParaGuardar = elegidos.map(it => {
      const prev = mapa[it.id];
      return prev
        ? { ...prev, categoria: it.categoria, cantidad: it.cantidad, total: it.total }
        : { ...it, fuente: "dte" };
    });
    const res = await guardarItemsBulk(itemsParaGuardar);
    if (!res.ok) {
      pushToast(`No pude guardar: ${res.error}`, "error", 5000);
      return;
    }
    // Actualiza state local con los items guardados (preserva foto_url etc)
    const ids = new Set(itemsParaGuardar.map(i => i.id));
    setInventario(prev => [
      ...prev.filter(m => !ids.has(m.id)),
      ...res.items,
    ]);
    pushToast(`${res.count} ítem(s) importados`, "success");
    setRaw(null);
  };

  const guardarItemManual = async (item) => {
    const conId = item.id ? item : { ...item, id: Date.now(), fuente: "manual" };
    const res = await guardarItem(conId);
    if (!res.ok) {
      pushToast(`No pude guardar: ${res.error}`, "error", 5000);
      return false;
    }
    setInventario(prev => {
      const idx = prev.findIndex(m => m.id === res.item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = res.item;
        return next;
      }
      return [...prev, res.item];
    });
    pushToast(item.id ? "Ítem actualizado" : "Ítem agregado", "success");
    return true;
  };

  const eliminarItem = async (item) => {
    const ok = await pushConfirm({
      titulo: "Eliminar ítem",
      msg: `¿Eliminar "${item.descripcion}" del inventario?`,
      okLabel: "Eliminar", danger: true,
    });
    if (!ok) return;
    await borrarItem(item.id);
    setInventario(prev => prev.filter(m => m.id !== item.id));
    pushToast("Ítem eliminado", "success");
  };

  const hacerAsig = async (mat, { pedidoId, cantidad, nota }) => {
    const asig = {
      id: Date.now(), materialId: mat.id, pedidoId, cantidad, nota,
      costo: cantidad * mat.precio_unitario,
    };
    const res = await guardarAsignacion(asig);
    if (!res.ok) {
      pushToast(`No pude guardar: ${res.error}`, "error");
      return;
    }
    setAsignaciones(prev => [...prev, res.asignacion]);
    setMAsig(null);
  };

  const elimAsig = async (id) => {
    await borrarAsignacion(id);
    setAsignaciones(p => p.filter(a => a.id !== id));
  };

  const usadoDe = matId => asignaciones.filter(a => a.materialId === matId).reduce((s, a) => s + a.cantidad, 0);

  const filtrados = inventario.filter(m =>
    (!busq || m.descripcion.toLowerCase().includes(busq.toLowerCase())) &&
    (catFiltro === "todos" || m.categoria === catFiltro)
  );

  const costoPorPedido = pedidos
    .map(p => {
      const asigs = asignaciones.filter(a => a.pedidoId === String(p.id));
      return { ...p, costo: asigs.reduce((s, a) => s + a.costo, 0), nA: asigs.length };
    })
    .filter(p => p.costo > 0);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }} className="main-area">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: "#2C1654", fontWeight: 800 }}>📦 Inventario</h2>
          <div style={{ fontSize: 11, color: "#aaa" }}>{inventario.length} ítem(s)</div>
        </div>
        {inventario.length > 0 && (
          <input
            value={busq}
            onChange={e => setBusq(e.target.value)}
            placeholder="🔍 Buscar..."
            style={{ ...INP, width: 160 }}
          />
        )}
        <input type="file" accept=".db" ref={fileRef} onChange={cargarDB} style={{ display: "none" }} />
        <button
          onClick={() => setEditando("nuevo")}
          style={{ ...BTN("#27AE60"), whiteSpace: "nowrap", fontSize: 13, padding: "9px 14px" }}
        >
          + Agregar a mano
        </button>
        <button
          onClick={() => fileRef.current.click()}
          disabled={cargando}
          style={{ ...BTN(cargando ? "#aaa" : "#2C1654"), whiteSpace: "nowrap", fontSize: 13, padding: "9px 14px" }}
        >
          {cargando ? "⏳ Leyendo..." : inventario.length > 0 ? "🔄 Actualizar DTE" : "📂 Abrir .db"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#F8D7DA", borderRadius: 8, padding: "10px 14px", color: "#721C24", fontSize: 13, marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {inventario.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 48, textAlign: "center", border: "2px dashed #e0e0e0" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#2C1654", marginBottom: 6 }}>Inventario vacío</div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 18 }}>
            Abre tu archivo <strong>facturas_dte.db</strong>
          </div>
          <button onClick={() => fileRef.current.click()} style={BTN("#2C1654")}>
            📂 Abrir facturas_dte.db
          </button>
        </div>
      ) : (
        <div className="inv-grid" style={{ display: "grid", gridTemplateColumns: esAdmin ? "1fr 270px" : "1fr", gap: 16 }}>
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setCatF("todos")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1.5px solid " + (catFiltro === "todos" ? "#2C1654" : "#e0e0e0"),
                  background: catFiltro === "todos" ? "#2C1654" : "#fff",
                  color: catFiltro === "todos" ? "#fff" : "#888",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Todos ({inventario.length})
              </button>
              {CATEGORIAS_INV.map(cat => {
                const n = inventario.filter(m => m.categoria === cat.id).length;
                const act = catFiltro === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCatF(cat.id)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      border: "1.5px solid " + (act ? cat.color : "#e0e0e0"),
                      background: act ? cat.color + "22" : "#fff",
                      color: act ? cat.color : "#888",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {cat.icon} {cat.label} ({n})
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtrados.map(m => {
                const cat = CAT_INFO[m.categoria] || CAT_INFO.material;
                const esMat = m.categoria === "material";
                const usado = esMat ? usadoDe(m.id) : 0;
                const disp = m.cantidad - usado;
                const agot = esMat && disp <= 0;
                const misAsig = esMat ? asignaciones.filter(a => a.materialId === m.id) : [];
                const mostrar = verDet === m.id;
                return (
                  <div
                    key={m.id}
                    style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1.5px solid " + (agot ? "#f5c6cb" : "#f0f0f0") }}
                  >
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {m.foto_url ? (
                          <img src={m.foto_url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #eee", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 64, height: 64, background: "#f0f0f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#bbb", flexShrink: 0 }}>
                            {cat.icon}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                            {agot && (
                              <span style={{ fontSize: 10, background: "#F8D7DA", color: "#721C24", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>AGOTADO</span>
                            )}
                            <span style={{ fontSize: 10, background: cat.color + "22", color: cat.color, padding: "1px 8px", borderRadius: 10, fontWeight: 700 }}>
                              {cat.icon} {m.categoria.charAt(0).toUpperCase() + m.categoria.slice(1)}
                            </span>
                            {m.estado && m.estado !== "funcionando" && ESTADO_INFO[m.estado] && (
                              <span style={{ fontSize: 10, background: ESTADO_INFO[m.estado].color + "22", color: ESTADO_INFO[m.estado].color, padding: "1px 8px", borderRadius: 10, fontWeight: 700 }}>
                                {ESTADO_INFO[m.estado].icon} {ESTADO_INFO[m.estado].label}
                              </span>
                            )}
                            {m.fuente === "manual" && (
                              <span style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>· manual</span>
                            )}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#2C1654" }}>{m.descripcion}</div>
                          <div style={{ fontSize: 11, color: "#888" }}>
                            {m.proveedor}
                            {esAdmin && m.precio_unitario > 0 ? ` · ${fmt$(m.precio_unitario)}/${m.unidad || "u"}` : ""}
                          </div>
                          {m.especificacion && (
                            <div style={{ fontSize: 11, color: "#666", marginTop: 4, fontStyle: "italic" }}>
                              📐 {m.especificacion}
                            </div>
                          )}
                          {m.notas_mantenimiento && (
                            <div style={{ fontSize: 11, color: "#856404", marginTop: 2, background: "#FFF8E1", padding: "3px 6px", borderRadius: 4, display: "inline-block" }}>
                              🔧 {m.notas_mantenimiento}
                            </div>
                          )}
                          {esMat ? (
                            <BarraStock total={m.cantidad} usado={usado} />
                          ) : (
                            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                              Cantidad: <strong>{m.cantidad} {m.unidad}</strong>
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                          <button
                            onClick={() => setEditando(m)}
                            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 12 }}
                            title="Editar ítem"
                          >
                            ✏️
                          </button>
                          {esMat && !agot && (
                            <button onClick={() => setMAsig(m)} style={{ ...BTN("#9B59B6"), padding: "6px 12px", fontSize: 12 }}>
                              + Asignar
                            </button>
                          )}
                          {misAsig.length > 0 && (
                            <button
                              onClick={() => setVerDet(mostrar ? null : m.id)}
                              style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 12, color: "#666" }}
                            >
                              {mostrar ? "▲" : "▼"} {misAsig.length}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {mostrar && misAsig.length > 0 && (
                      <div style={{ borderTop: "1px solid #f5f5f5", background: "#fafafa" }}>
                        {misAsig.map(a => {
                          const ped = pedidos.find(p => String(p.id) === String(a.pedidoId));
                          return (
                            <div
                              key={a.id}
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap" }}
                            >
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#2C1654" }}>
                                  #{a.pedidoId}{ped ? ` — ${ped.cliente}` : ""}
                                </span>
                                {a.nota && <span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>· {a.nota}</span>}
                              </div>
                              <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>{a.cantidad} {m.unidad}</span>
                              {esAdmin && (
                                <span style={{ fontSize: 12, color: "#E63946", fontWeight: 700 }}>−{fmt$(a.costo)}</span>
                              )}
                              <button
                                onClick={() => elimAsig(a.id)}
                                style={{ padding: "3px 7px", borderRadius: 6, border: "1.5px solid #fdd", background: "#fff8f8", cursor: "pointer", fontSize: 12, color: "#DC3545" }}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {esAdmin && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, alignSelf: "start" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#9B59B6", textTransform: "uppercase", marginBottom: 10 }}>
                💰 Costo por pedido
              </div>
              {costoPorPedido.length === 0 ? (
                <div style={{ color: "#aaa", fontSize: 12, textAlign: "center", padding: "14px 0" }}>Sin asignaciones</div>
              ) : (
                costoPorPedido.map(p => {
                  const v = parseFloat(p.precio || 0);
                  const mg = v > 0 ? ((v - p.costo) / v) * 100 : null;
                  const mc = mg === null ? null :
                    mg >= 40 ? { bg: "#D4EDDA", fg: "#155724", ic: "✅" } :
                    mg >= 20 ? { bg: "#FFF3CD", fg: "#856404", ic: "⚠️" } :
                               { bg: "#F8D7DA", fg: "#721C24", ic: "🔴" };
                  return (
                    <div key={p.id} style={{ marginBottom: 10, background: "#f8f4ff", borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, color: "#2C1654", fontSize: 13 }}>#{p.id} {p.cliente}</span>
                        <span style={{ fontSize: 10, color: "#aaa" }}>{p.nA} mat.</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{p.tipoPrenda}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: mc ? 5 : 0 }}>
                        <div style={{ background: "#fff", borderRadius: 6, padding: "5px 8px", textAlign: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#E63946" }}>{fmt$(p.costo)}</div>
                          <div style={{ fontSize: 9, color: "#aaa", textTransform: "uppercase", fontWeight: 700 }}>Materiales</div>
                        </div>
                        <div style={{ background: "#fff", borderRadius: 6, padding: "5px 8px", textAlign: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#2C1654" }}>{fmt$(v)}</div>
                          <div style={{ fontSize: 9, color: "#aaa", textTransform: "uppercase", fontWeight: 700 }}>Venta</div>
                        </div>
                      </div>
                      {mc && (
                        <div style={{ background: mc.bg, borderRadius: 6, padding: "4px 8px", textAlign: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: mc.fg }}>
                            {mc.ic} Margen: {mg.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {itemsCrudo && (
        <ModalSeleccion items={itemsCrudo} onConfirmar={confirmarSel} onCancelar={() => setRaw(null)} />
      )}
      {modalAsig && (
        <ModalAsignar
          material={modalAsig}
          disponible={modalAsig.cantidad - usadoDe(modalAsig.id)}
          pedidos={pedidos}
          onGuardar={d => hacerAsig(modalAsig, d)}
          onCancelar={() => setMAsig(null)}
        />
      )}
      {editando && (
        <EditorItem
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={async (it) => {
            const ok = await guardarItemManual(it);
            if (ok) setEditando(null);
          }}
          onEliminar={editando !== "nuevo" ? async () => {
            await eliminarItem(editando);
            setEditando(null);
          } : null}
        />
      )}
    </div>
  );
}

// ── EditorItem ────────────────────────────────────────────

function EditorItem({ inicial, onClose, onGuardar, onEliminar }) {
  const [it, setIt] = useState(() => inicial ? { ...inicial } : {
    fuente: "manual", categoria: "material", descripcion: "", proveedor: "",
    cantidad: 1, unidad: "", precio_unitario: 0, foto_url: "",
    especificacion: "", estado: "funcionando", notas_mantenimiento: "",
  });
  const [subiendo, setSubiendo] = useState(false);
  const esEditar = !!inicial;

  const subirFoto = async (file) => {
    if (!file) return;
    setSubiendo(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const comprimida = await comprimirImagen(dataUrl, 900, 0.82);
      const r = await subirFotoSupabase(comprimida, file.name, "inventario", it.descripcion || "item");
      if (r.ok) {
        setIt({ ...it, foto_url: r.url });
        pushToast("Foto subida", "success");
      } else {
        pushToast(`No pude subir: ${r.err}`, "error");
      }
    } catch (e) {
      pushToast(`Error: ${e.message || e}`, "error");
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = () => {
    if (!it.descripcion.trim()) {
      pushToast("La descripción es obligatoria", "error");
      return;
    }
    onGuardar(it);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 12 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 18, width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: "#2C1654", fontFamily: "Georgia,serif" }}>
            📦 {esEditar ? "Editar ítem" : "Agregar ítem manual"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Categoria */}
          <div>
            <label style={LBL}>Categoría</label>
            <div style={{ display: "flex", gap: 6 }}>
              {CATEGORIAS_INV.map(c => {
                const sel = it.categoria === c.id;
                return (
                  <button key={c.id} onClick={() => setIt({ ...it, categoria: c.id })} style={{
                    flex: 1, padding: "8px", borderRadius: 8,
                    border: "1.5px solid " + (sel ? c.color : "#e0e0e0"),
                    background: sel ? c.color : "#fff",
                    color: sel ? "#fff" : "#666",
                    fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  }}>{c.icon} {c.label}</button>
                );
              })}
            </div>
          </div>

          {/* Foto */}
          <div>
            <label style={LBL}>Foto</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {it.foto_url ? (
                <img src={it.foto_url} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1.5px solid #ddd" }} />
              ) : (
                <div style={{ width: 90, height: 90, borderRadius: 8, background: "#f5f5f5", border: "2px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#bbb" }}>📷</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                <label style={{
                  padding: "7px 12px", borderRadius: 7, background: "#2C1654", color: "#fff",
                  fontWeight: 700, fontSize: 11, cursor: subiendo ? "wait" : "pointer",
                  textAlign: "center", opacity: subiendo ? 0.6 : 1,
                }}>
                  {subiendo ? "⏳ Subiendo..." : (it.foto_url ? "🔄 Cambiar foto" : "📤 Subir foto")}
                  <input type="file" accept="image/*" style={{ display: "none" }} disabled={subiendo}
                    onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f); e.target.value = ""; }} />
                </label>
                {it.foto_url && (
                  <button onClick={() => setIt({ ...it, foto_url: "" })} style={{
                    padding: "5px 10px", borderRadius: 7, background: "#fff", color: "#DC3545",
                    border: "1px solid #fdd", fontWeight: 600, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                  }}>🗑️ Quitar foto</button>
                )}
              </div>
            </div>
          </div>

          {/* Descripcion */}
          <div>
            <label style={LBL}>Descripción</label>
            <input
              style={INP}
              value={it.descripcion}
              placeholder="Ej: Tela dacrón azul marino"
              onChange={e => setIt({ ...it, descripcion: e.target.value })}
            />
          </div>

          {/* Cantidad + unidad + proveedor */}
          <div style={{ display: "grid", gridTemplateColumns: "100px 100px 1fr", gap: 8 }}>
            <div>
              <label style={LBL}>Cantidad</label>
              <input
                type="number" step="0.01" style={INP}
                value={it.cantidad}
                onChange={e => setIt({ ...it, cantidad: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label style={LBL}>Unidad</label>
              <input
                style={INP} value={it.unidad} placeholder="yd, m, u..."
                onChange={e => setIt({ ...it, unidad: e.target.value })}
              />
            </div>
            <div>
              <label style={LBL}>Proveedor</label>
              <input
                style={INP} value={it.proveedor}
                onChange={e => setIt({ ...it, proveedor: e.target.value })}
              />
            </div>
          </div>

          {/* Precio */}
          <div>
            <label style={LBL}>Precio unitario</label>
            <input
              type="number" step="0.01" style={INP}
              value={it.precio_unitario}
              onChange={e => setIt({ ...it, precio_unitario: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Especificacion */}
          <div>
            <label style={LBL}>Especificación técnica</label>
            <textarea
              style={{ ...INP, minHeight: 50, resize: "vertical" }}
              value={it.especificacion}
              placeholder="Marca, modelo, dimensiones, características..."
              onChange={e => setIt({ ...it, especificacion: e.target.value })}
            />
          </div>

          {/* Estado */}
          <div>
            <label style={LBL}>Estado</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(ESTADO_INFO).map(([id, info]) => {
                const sel = it.estado === id;
                return (
                  <button key={id} onClick={() => setIt({ ...it, estado: id })} style={{
                    padding: "7px 12px", borderRadius: 20,
                    border: "1.5px solid " + (sel ? info.color : "#e0e0e0"),
                    background: sel ? info.color + "22" : "#fff",
                    color: sel ? info.color : "#888",
                    fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                  }}>{info.icon} {info.label}</button>
                );
              })}
            </div>
          </div>

          {/* Notas mantenimiento */}
          <div>
            <label style={LBL}>Notas de mantenimiento</label>
            <textarea
              style={{ ...INP, minHeight: 50, resize: "vertical" }}
              value={it.notas_mantenimiento}
              placeholder="Ej: Cambiar aguja cada 3 meses; última revisión 15-mar"
              onChange={e => setIt({ ...it, notas_mantenimiento: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 16 }}>
          <div>
            {esEditar && onEliminar && (
              <button onClick={onEliminar} style={{ padding: "9px 14px", borderRadius: 8, border: "1.5px solid #fdd", background: "#fff8f8", color: "#DC3545", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 12 }}>
                🗑️ Eliminar
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1.5px solid #ccc", background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
              Cancelar
            </button>
            <button onClick={guardar} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#27AE60", color: "#fff", cursor: "pointer", fontWeight: 800, fontFamily: "inherit" }}>
              💾 Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
