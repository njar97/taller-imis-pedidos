// Sección de Cuellos (tejido) — tabla CRUD + modal de detalle + CuelloModal.
// Antes vivían como SeccionCuellos + CuelloModal compilados en main.js
// (~1 660 líneas).

import { CUEL_E, CUEL_EC } from "./lib/constants.js";
import { dbCuelBorrar as gsCuelBorrar, dbCuelGuardar as gsCuelGuardar } from "./lib/db.js";
import { pushToast } from "./lib/feedback.js";
import { useDebouncedCallback } from "./lib/hooks.js";
import { Modal } from "./lib/Modal.jsx";
import ModalVersionesPedido from "./ModalVersionesPedido.jsx";
import { subirArchivoSupabase } from "./supabaseStorage.js";
import { imprimirProduccionCuellos } from "./lib/imprimir.js";
import BuscadorConfRef from "./BuscadorConfRef.jsx";
import RegistroAbonos from "./RegistroAbonos.jsx";

import { useState, useRef, lazy, Suspense } from "react";

// Catálogo de diseños — carga diferida, solo si se abre
const CatalogoTejidos = lazy(() => import("./CatalogoTejidos.jsx"));

const hoyC = () => new Date().toISOString().split("T")[0];
const diasC = f => (f ? Math.ceil((new Date(f + "T12:00:00") - new Date()) / 86400000) : null);
const fmt$C = n => "$" + parseFloat(n || 0).toFixed(2);

// ── CuelloModal ──────────────────────────────────────────

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

const SEC = (col = "#B85C00") => ({
  fontSize: 10,
  fontWeight: 800,
  color: col,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "14px 0 8px",
  borderBottom: "2px solid " + col + "33",
  paddingBottom: 3,
});

const MATS = ["Acrílico", "Algodón", "Poliéster", "Lana", "Mezcla algodón-poliéster", "Otro"];
const CALS = ["Fino", "Medio", "Grueso"];

const piezaBase = (activa = true) => ({ activa, largo: "", ancho: "", colores: "" });

const CUEL_DEF = {
  cliente: "", telefono: "", confRef: "", cantidad: "1",
  cuello: piezaBase(true), puno: piezaBase(false), banda: piezaBase(false),
  material: "Acrílico", calibre: "Medio",
  linkDrive: "", linkDriveId: "",
  descripcion: "",
  precioU: "", precioT: "", anticipo: "",
  fechaEntrega: "", estatus: "Pendiente", notas: "",
};

// Configuración de las 3 piezas (cuello, puño, banda) para el toggle
const PIEZAS_CONF = [
  { key: "cuello", icon: "🔵", label: "Cuello",       color: "#1A5276" },
  { key: "puno",   icon: "🟡", label: "Puño",         color: "#B85C00" },
  { key: "banda",  icon: "🟢", label: "Banda / Cinón", color: "#1A5F5A" },
];

function PiezaToggle({ f, setF, conf }) {
  const pza = f[conf.key] || {};
  return (
    <div style={{ border: "1.5px solid " + (pza.activa ? conf.color + "55" : "#e0e0e0"), borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      <button
        onClick={() => setF(p => ({ ...p, [conf.key]: { ...(p[conf.key] || {}), activa: !(p[conf.key] || {}).activa } }))}
        style={{
          width: "100%", padding: "10px 14px", border: "none", cursor: "pointer",
          background: pza.activa ? conf.color + "11" : "#fafafa",
          display: "flex", alignItems: "center", gap: 10, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 18 }}>{conf.icon}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: pza.activa ? conf.color : "#aaa" }}>
          {conf.label}
        </span>
        <span style={{ fontSize: 11, background: pza.activa ? conf.color : "#e0e0e0", color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 700 }}>
          {pza.activa ? "✅ Incluye" : "No incluye"}
        </span>
      </button>
      {pza.activa && (
        <div style={{ padding: "10px 14px", background: "#fff", borderTop: "1px solid " + conf.color + "22" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={LBL}>Largo (cm)</label>
              <input
                type="number"
                style={INPS}
                value={pza.largo || ""}
                onChange={e => setF(p => ({ ...p, [conf.key]: { ...p[conf.key], largo: e.target.value } }))}
                placeholder="Ej: 4"
              />
            </div>
            <div>
              <label style={LBL}>Ancho (cm)</label>
              <input
                type="number"
                style={INPS}
                value={pza.ancho || ""}
                onChange={e => setF(p => ({ ...p, [conf.key]: { ...p[conf.key], ancho: e.target.value } }))}
                placeholder="Ej: 2.5"
              />
            </div>
          </div>
          <div>
            <label style={LBL}>Color(es) del hilo</label>
            <input
              style={INPS}
              value={pza.colores || ""}
              onChange={e => setF(p => ({ ...p, [conf.key]: { ...p[conf.key], colores: e.target.value } }))}
              placeholder="Ej: Azul marino, Blanco"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CuelloModal({ initial, esAdmin, onSave, onCancel, pedidosConf, clientes = [] }) {
  const [f, setF] = useState({
    ...CUEL_DEF,
    ...(initial || {}),
    cuello: (initial || {}).cuello || piezaBase(true),
    puno:   (initial || {}).puno   || piezaBase(false),
    banda:  (initial || {}).banda  || piezaBase(false),
    abonos: (initial || {}).abonos || [],
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const [sugsC, setSugsC] = useState([]);
  const [showSugsC, setShowSugsC] = useState(false);
  const [subiendoArch, setSubiendoArch] = useState(false);
  const archRef = useRef();

  function buscarClientesCuel(q) {
    if (!q || q.length < 2) { setSugsC([]); return; }
    const vistos = new Set();
    setSugsC(
      clientes
        .filter(cl => cl.nombre && cl.nombre.toLowerCase().includes(q.toLowerCase()))
        .filter(cl => {
          if (vistos.has(cl.nombre)) return false;
          vistos.add(cl.nombre);
          return true;
        })
        .slice(0, 5)
    );
  }
  const buscarClientesCuelDebounced = useDebouncedCallback(buscarClientesCuel, 200);

  const subirArchivo = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoArch(true);
    const res = await subirArchivoSupabase(file, "cuellos-archivos", f.cliente);
    setSubiendoArch(false);
    if (res.ok) {
      set("linkDrive", res.url);
      set("linkDriveId", res.path);
    }
    e.target.value = "";
  };

  const calcTotal = (pu, cant) => {
    const t = parseFloat(pu || 0) * parseInt(cant || 1);
    if (t > 0) set("precioT", t.toFixed(2));
  };

  const handleGuardar = () => {
    if (!f.cliente) { pushToast("Falta el nombre del cliente", "error"); return; }
    if (!f.cuello.activa && !f.puno.activa && !f.banda.activa) {
      pushToast("Seleccioná al menos una pieza: cuello, puño o banda", "error");
      return;
    }
    onSave(f);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 150 }}>
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: 16, width: "100%", maxWidth: 580, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#B85C00", fontFamily: "Georgia,serif", fontWeight: 800 }}>
            {initial ? "✏️ Editar tejido" : "🧶 Nuevo pedido de tejido"}
          </h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>

        {/* ── Cliente ── */}
        <div style={SEC("#B85C00")}>👤 Cliente</div>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <label style={LBL}>Nombre *</label>
          <input
            style={INPS}
            value={f.cliente}
            placeholder="Nombre o empresa"
            onChange={e => {
              set("cliente", e.target.value);
              buscarClientesCuelDebounced(e.target.value);
              setShowSugsC(true);
            }}
            onBlur={() => setTimeout(() => setShowSugsC(false), 150)}
          />
          {showSugsC && sugsC.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 8, zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
              {sugsC.map((sg, i) => (
                <div
                  key={i}
                  onClick={() => {
                    set("cliente", sg.nombre);
                    if (sg.telefono) set("telefono", sg.telefono);
                    setShowSugsC(false);
                  }}
                  style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", fontSize: 13 }}
                >
                  <div style={{ fontWeight: 700, color: "#B85C00" }}>{sg.nombre}</div>
                  {sg.telefono && <span style={{ fontSize: 11, color: "#aaa" }}>📱 {sg.telefono}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={LBL}>Teléfono</label>
            <input style={INPS} value={f.telefono} placeholder="Para avisar" onChange={e => set("telefono", e.target.value)} />
          </div>
          <div>
            <label style={LBL}>Cantidad de prendas *</label>
            <input
              type="number"
              min="1"
              style={INPS}
              value={f.cantidad}
              onChange={e => {
                set("cantidad", e.target.value);
                calcTotal(f.precioU, e.target.value);
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>¿Viene de pedido de confección?</label>
          <BuscadorConfRef
            pedidosConf={(pedidosConf || []).filter(p => !["Entregado", "Cancelado"].includes(p.estatus))}
            value={f.confRef}
            soloConBordado={false}
            color="#B85C00"
            colorBg="#FFF4E6"
            colorBorder="#FFCC80"
            onChange={(val, ped) => {
              set("confRef", val);
              if (ped && !f.cliente) {
                set("cliente", ped.cliente);
                set("telefono", ped.telefono || "");
              }
            }}
          />
        </div>

        {/* ── Material ── */}
        <div style={SEC("#6D4C41")}>🧵 Material</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label style={LBL}>Material / Hilo</label>
            <select style={INPS} value={f.material} onChange={e => set("material", e.target.value)}>
              {MATS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Calibre</label>
            <select style={INPS} value={f.calibre} onChange={e => set("calibre", e.target.value)}>
              {CALS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* ── Piezas ── */}
        <div style={SEC("#B85C00")}>🧶 Piezas a tejer</div>
        {PIEZAS_CONF.map(conf => (
          <PiezaToggle key={conf.key} f={f} setF={setF} conf={conf} />
        ))}

        {/* ── Archivo de diseño ── */}
        <div style={SEC("#6B2D8B")}>📁 Archivo de diseño</div>
        <div style={{ marginBottom: 10 }}>
          <input
            type="file"
            ref={archRef}
            style={{ display: "none" }}
            accept=".bmp,.jpg,.jpeg,.png,.pdf,.txt,.sew,.dat"
            onChange={subirArchivo}
          />
          {f.linkDrive ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F1FFF4", border: "1.5px solid #28A745", borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#155724", fontSize: 12 }}>Archivo en Google Drive</div>
                <a href={f.linkDrive} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#1A5F5A" }}>
                  Abrir en Drive →
                </a>
              </div>
              <button
                onClick={() => { set("linkDrive", ""); set("linkDriveId", ""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16 }}
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => archRef.current && archRef.current.click()}
              disabled={subiendoArch}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "2px dashed #6B2D8B44", background: "#FDF0FF", color: "#6B2D8B", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {subiendoArch ? "⏳ Subiendo..." : "📁 Subir archivo de diseño"}
            </button>
          )}
          <div style={{ marginTop: 6 }}>
            <label style={LBL}>Descripción del diseño / instrucciones</label>
            <textarea
              style={{ ...INPS, resize: "vertical", minHeight: 44 }}
              value={f.descripcion}
              placeholder="Rayas, colores alternos, instrucciones especiales..."
              onChange={e => set("descripcion", e.target.value)}
            />
          </div>
        </div>

        {/* ── Pago y entrega ── */}
        {esAdmin ? (
          <>
            <div style={SEC("#27AE60")}>💰 Pago y Entrega</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={LBL}>Precio/prenda ($)</label>
                <input
                  type="number"
                  style={INPS}
                  value={f.precioU}
                  placeholder="0.00"
                  onChange={e => {
                    set("precioU", e.target.value);
                    calcTotal(e.target.value, f.cantidad);
                  }}
                />
              </div>
              <div>
                <label style={LBL}>Total ($)</label>
                <input type="number" style={INPS} value={f.precioT} placeholder="0.00" onChange={e => set("precioT", e.target.value)} />
              </div>
              <div>
                <label style={LBL}>Fecha entrega</label>
                <input type="date" style={INPS} value={f.fechaEntrega} onChange={e => set("fechaEntrega", e.target.value)} />
              </div>
            </div>
            <RegistroAbonos
              abonos={f.abonos || []}
              precioTotal={f.precioT}
              onChange={v => {
                set("abonos", v);
                set("anticipo", v.reduce((s, a) => s + parseFloat(a.monto || 0), 0).toFixed(2));
              }}
              esAdmin
            />
          </>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <label style={LBL}>Fecha de entrega</label>
              <input type="date" style={INPS} value={f.fechaEntrega} onChange={e => set("fechaEntrega", e.target.value)} />
            </div>
            <RegistroAbonos
              abonos={f.abonos || []}
              precioTotal={f.precioT}
              onChange={v => {
                set("abonos", v);
                set("anticipo", v.reduce((s, a) => s + parseFloat(a.monto || 0), 0).toFixed(2));
              }}
              esAdmin={false}
            />
          </>
        )}

        {/* ── Estado ── */}
        <div style={SEC("#007BFF")}>📌 Estado</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div>
            <label style={LBL}>Estatus</label>
            <select style={INPS} value={f.estatus} onChange={e => set("estatus", e.target.value)}>
              {CUEL_E.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Notas internas</label>
            <input style={INPS} value={f.notas} placeholder="Solo para el taller" onChange={e => set("notas", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#666" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "#B85C00", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14 }}
          >
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SeccionCuellos ───────────────────────────────────────

export default function SeccionCuellos({
  cuellos,
  setCuellos,
  nextCuelId,
  setNextCuelId,
  pedidosConf,
  esAdmin,
  clientes = [],
  upsertClienteLocal,
  exportarPedidoPDF,
}) {
  const [busq, setBusq] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [modal, setModal] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [verVersionesId, setVerVersionesId] = useState(null);
  const [verCatalogo, setVerCatalogo] = useState(false);

  const lista = cuellos.filter(c => {
    const q = busq.toLowerCase();
    const m = c.cliente.toLowerCase().includes(q) || (c.tipoCuello || "").toLowerCase().includes(q);
    const e = filtro === "Todos" || c.estatus === filtro;
    return m && e;
  });

  const activos = cuellos.filter(c => !["Entregado", "Cancelado"].includes(c.estatus)).length;
  const porCobrar = cuellos
    .filter(c => c.estatus !== "Cancelado" && c.precioT)
    .reduce((s, c) => s + (parseFloat(c.precioT || 0) - parseFloat(c.anticipo || 0)), 0);
  const conteos = CUEL_E.reduce((a, e) => ({ ...a, [e]: cuellos.filter(c => c.estatus === e).length }), {});

  function guardar(form) {
    const isNuevo = modal === "nuevo";
    const id = isNuevo ? nextCuelId : modal.id;
    const p = { ...form, id, fecha: isNuevo ? hoyC() : (modal.fecha || hoyC()) };
    if (isNuevo) {
      setCuellos(prev => [...prev, p]);
      setNextCuelId(n => n + 1);
    } else {
      setCuellos(prev => prev.map(c => (c.id === id ? p : c)));
    }
    setModal(null);
    gsCuelGuardar(p);
    if (p.cliente && upsertClienteLocal) {
      upsertClienteLocal(p.cliente, { telefono: p.telefono });
    }
  }

  function eliminar(id) {
    setCuellos(prev => prev.filter(c => c.id !== id));
    setConfirm(null);
    setDetalle(null);
    gsCuelBorrar(id);
  }

  function cambiarEstatus(id, est) {
    setCuellos(prev => {
      const nuevos = prev.map(c => (c.id === id ? { ...c, estatus: est } : c));
      gsCuelGuardar(nuevos.find(c => c.id === id));
      return nuevos;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Header ── (responsive: en mobile se apila, en desktop una fila) */}
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px", minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 16, color: "#B85C00", fontWeight: 800, fontFamily: "Georgia,serif" }}>
            🧶 Tejido de Cuellos
          </h1>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            {cuellos.length} pedido(s) · {activos} activos
            {esAdmin && ` · ${fmt$C(porCobrar)} por cobrar`}
          </div>
        </div>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none", flex: "1 1 120px", minWidth: 100, fontFamily: "inherit" }}
        />
        <button
          onClick={() => setVerCatalogo(v => !v)}
          style={{ padding: "9px 12px", borderRadius: 8, border: verCatalogo ? "none" : "1.5px solid #B85C0044", background: verCatalogo ? "#B85C00" : "#FFF4E6", color: verCatalogo ? "#fff" : "#B85C00", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}
        >
          {verCatalogo ? "🧶 Pedidos" : "📚 Catálogo"}
        </button>
        <button
          onClick={() => setModal("nuevo")}
          style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#B85C00", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}
        >
          🧶 Nuevo
        </button>
      </div>

      {/* ── Catálogo de diseños (vista alterna) ── */}
      {verCatalogo && (
        <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#ccc" }}>Cargando catálogo…</div>}>
          <CatalogoTejidos />
        </Suspense>
      )}

      {!verCatalogo && (
      <>
      {/* ── Tabs ── */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #eee", padding: "0 12px", overflowX: "auto", flexShrink: 0 }}>
        {["Todos", ...CUEL_E].map(s => {
          const cnt = s === "Todos" ? cuellos.length : (conteos[s] || 0);
          const act = filtro === s;
          return (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              style={{
                padding: "7px 8px",
                border: "none",
                background: "none",
                borderBottom: act ? "2.5px solid #B85C00" : "2.5px solid transparent",
                color: act ? "#B85C00" : "#999",
                fontWeight: act ? 700 : 400,
                cursor: "pointer",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                gap: 3,
                whiteSpace: "nowrap",
              }}
            >
              {s}
              <span style={{ background: act ? "#B85C00" : "#eee", color: act ? "#fff" : "#aaa", borderRadius: 20, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Lista / Tabla ── */}
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#ccc" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🧶</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#aaa" }}>No hay pedidos de cuellos</div>
            <div style={{ fontSize: 13, color: "#bbb", marginTop: 4 }}>Registrá el primero con "🧶 Nuevo"</div>
          </div>
        ) : (
          <>
            <TablaCuellos lista={lista} esAdmin={esAdmin} setDetalle={setDetalle} setModal={setModal} setConfirm={setConfirm} cambiarEstatus={cambiarEstatus} />
            <CardsCuellos lista={lista} esAdmin={esAdmin} setDetalle={setDetalle} setModal={setModal} setConfirm={setConfirm} cambiarEstatus={cambiarEstatus} />
          </>
        )}
      </div>
      </>
      )}

      {/* ── Modal de edición ── */}
      {modal && (
        <CuelloModal
          initial={modal !== "nuevo" ? modal : null}
          esAdmin={esAdmin}
          onSave={guardar}
          onCancel={() => setModal(null)}
          pedidosConf={pedidosConf}
          clientes={clientes || []}
        />
      )}

      {/* ── Modal de detalle ── */}
      {detalle && (
        <DetalleCuello
          detalle={detalle}
          esAdmin={esAdmin}
          onClose={() => setDetalle(null)}
          onEditar={() => { setModal(detalle); setDetalle(null); }}
          onCambiarEstatus={est => {
            setDetalle({ ...detalle, estatus: est });
            cambiarEstatus(detalle.id, est);
          }}
          onConfirmar={() => setConfirm(detalle.id)}
          exportarPedidoPDF={exportarPedidoPDF}
          pedidosConf={pedidosConf}
        />
      )}

      {/* ── Versiones anteriores ── */}
      {verVersionesId !== null && (
        <ModalVersionesPedido
          tipo="cuello"
          pedido={{ id: verVersionesId }}
          onClose={() => setVerVersionesId(null)}
        />
      )}

      {/* ── Confirmar borrado ── */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", color: "#B85C00" }}>¿Eliminar cuello?</h3>
            <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setConfirm(null)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirm)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#E63946", color: "#fff", cursor: "pointer", fontWeight: 700 }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes de tabla y cards ────────────────────

function TablaCuellos({ lista, esAdmin, setDetalle, setModal, setConfirm, cambiarEstatus }) {
  return (
    <table className="tabla-pedidos" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
      <thead>
        <tr>
          {["ID", "Cliente", "Tipo cuello", "Material", "Talla", "Cant.", esAdmin ? "Pago" : "", "Entrega", "Estatus", ""].map((h, i) => (
            <th key={i} style={{ padding: "3px 9px", fontSize: 9, fontWeight: 700, color: "#bbb", textAlign: "left", textTransform: "uppercase" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lista.map(c => {
          const saldo = parseFloat(c.precioT || 0) - parseFloat(c.anticipo || 0);
          const dias = diasC(c.fechaEntrega);
          const urg = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(c.estatus);
          const col = CUEL_EC[c.estatus] || CUEL_EC["Pendiente"];
          return (
            <tr key={c.id} onClick={() => setDetalle(c)} style={{ background: "#fff", cursor: "pointer" }}>
              <td style={{ padding: "9px", borderRadius: "9px 0 0 9px", fontWeight: 800, fontFamily: "monospace", fontSize: 10, color: "#B85C00" }}>
                CUEL-{String(c.id).padStart(3, "0")}
              </td>
              <td style={{ padding: "9px" }}>
                <div style={{ fontWeight: 700, color: "#222", fontSize: 13 }}>{c.cliente}</div>
                {c.telefono && <div style={{ fontSize: 10, color: "#aaa" }}>📱 {c.telefono}</div>}
                {c.confRef && <div style={{ fontSize: 10, color: "#9B59B6", fontWeight: 700 }}>🔗 Conf. #{c.confRef}</div>}
              </td>
              <td style={{ padding: "9px" }}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(c.cuello || {}).activa && (
                    <span style={{ fontSize: 10, background: "#EBF5FB", color: "#1A5276", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>🔵 Cuello</span>
                  )}
                  {(c.puno || {}).activa && (
                    <span style={{ fontSize: 10, background: "#FFF4E6", color: "#B85C00", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>🟡 Puño</span>
                  )}
                  {(c.banda || {}).activa && (
                    <span style={{ fontSize: 10, background: "#F0FFF4", color: "#1A5F5A", padding: "2px 7px", borderRadius: 10, fontWeight: 700 }}>🟢 Banda</span>
                  )}
                  {!(c.cuello || {}).activa && !(c.puno || {}).activa && !(c.banda || {}).activa && c.tipoCuello && (
                    <span style={{ fontSize: 11, color: "#555" }}>{c.tipoCuello}</span>
                  )}
                </div>
                {((c.cuello || {}).colores || c.colorHilo) && (
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                    {(c.cuello || {}).colores || c.colorHilo}
                  </div>
                )}
              </td>
              <td style={{ padding: "9px" }}>
                <div style={{ fontSize: 12, color: "#555" }}>{c.material || "—"}</div>
                <div style={{ fontSize: 10, color: "#aaa" }}>{c.calibre}</div>
              </td>
              <td style={{ padding: "9px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                {c.cantidad || "—"}
              </td>
              {esAdmin && (
                <td style={{ padding: "9px" }}>
                  {c.precioT ? (
                    <>
                      <div style={{ fontWeight: 700, color: "#2C1654", fontSize: 13 }}>{fmt$C(c.precioT)}</div>
                      <div style={{ fontSize: 10, color: saldo > 0 ? "#E63946" : "#28A745" }}>
                        {saldo > 0 ? "Resta " + fmt$C(saldo) : "✅ Pagado"}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: "#ddd" }}>—</span>
                  )}
                </td>
              )}
              <td style={{ padding: "9px" }}>
                {c.fechaEntrega ? (
                  <>
                    <div style={{ fontSize: 11, color: urg ? "#E63946" : "#555", fontWeight: urg ? 700 : 400 }}>
                      {urg ? "⚠️ " : ""}{c.fechaEntrega}
                    </div>
                    {dias !== null && !["Entregado", "Cancelado"].includes(c.estatus) && (
                      <div style={{ fontSize: 10, color: dias < 0 ? "#E63946" : dias <= 2 ? "#FD7E14" : "#aaa" }}>
                        {dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d"}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ color: "#ddd", fontSize: 11 }}>—</span>
                )}
              </td>
              <td style={{ padding: "9px" }}>
                <select
                  value={c.estatus}
                  onChange={e => cambiarEstatus(c.id, e.target.value)}
                  style={{ border: "none", background: col.bg, color: col.fg, padding: "3px 8px", borderRadius: 20, fontWeight: 700, fontSize: 10, cursor: "pointer" }}
                >
                  {CUEL_E.map(s => <option key={s}>{s}</option>)}
                </select>
              </td>
              <td style={{ padding: "9px", borderRadius: "0 9px 9px 0" }}>
                <div style={{ display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setModal(c)}
                    style={{ padding: "4px 8px", borderRadius: 6, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 11 }}
                  >✏️</button>
                  {esAdmin && (
                    <button
                      onClick={() => setConfirm(c.id)}
                      style={{ padding: "4px 7px", borderRadius: 6, border: "1.5px solid #fdd", background: "#fff8f8", cursor: "pointer", fontSize: 11 }}
                    >🗑️</button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CardsCuellos({ lista, esAdmin, setDetalle, setModal, setConfirm, cambiarEstatus }) {
  return (
    <div className="cards-pedidos" style={{ flexDirection: "column", display: "none" }}>
      {lista.map(cu => {
        const saldo = parseFloat(cu.precioT || 0) - parseFloat(cu.anticipo || 0);
        const dias = diasC(cu.fechaEntrega);
        const urg = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(cu.estatus);
        const col = CUEL_EC[cu.estatus] || CUEL_EC["Pendiente"];
        return (
          <div
            key={cu.id}
            onClick={() => setDetalle(cu)}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: urg ? "1.5px solid #FD7E14" : "1.5px solid transparent",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#B85C00", fontWeight: 800, fontFamily: "monospace" }}>
                  CUEL-{String(cu.id).padStart(3, "0")}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#2C1654" }}>{cu.cliente}</div>
                {cu.telefono && <div style={{ fontSize: 12, color: "#555" }}>📱 {cu.telefono}</div>}
              </div>
              <select
                value={cu.estatus}
                onChange={e => { e.stopPropagation(); cambiarEstatus(cu.id, e.target.value); }}
                onClick={e => e.stopPropagation()}
                style={{ border: "none", background: col.bg, color: col.fg, padding: "5px 8px", borderRadius: 20, fontWeight: 700, fontSize: 11, cursor: "pointer" }}
              >
                {CUEL_E.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 4 }}>{cu.tipoCuello || "—"}</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
              {cu.material}{cu.colorHilo ? " · " + cu.colorHilo : ""} · Talla {cu.talla} · {cu.cantidad} pza{cu.cantidad !== 1 ? "s" : ""}
            </div>
            {cu.fechaEntrega && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: urg ? "#E63946" : "#555", fontWeight: urg ? 700 : 400 }}>
                  {urg ? "⚠️ " : "📌 "}{cu.fechaEntrega}
                </span>
                {dias !== null && !["Entregado", "Cancelado"].includes(cu.estatus) && (
                  <span style={{
                    fontSize: 11,
                    background: dias < 0 ? "#F8D7DA" : dias <= 2 ? "#FFF3CD" : "#e8f5e9",
                    color: dias < 0 ? "#721C24" : dias <= 2 ? "#856404" : "#155724",
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontWeight: 700,
                  }}>
                    {dias < 0 ? `Venció ${Math.abs(dias)}d` : dias === 0 ? "¡Hoy!" : `${dias}d`}
                  </span>
                )}
              </div>
            )}
            {esAdmin && cu.precioT && (
              <div style={{ marginTop: 6, display: "flex", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#2C1654" }}>{fmt$C(cu.precioT)}</span>
                {saldo > 0 ? (
                  <span style={{ fontSize: 12, color: "#E63946", fontWeight: 700 }}>Resta {fmt$C(saldo)}</span>
                ) : (
                  <span style={{ fontSize: 12, color: "#28A745", fontWeight: 700 }}>✅ Pagado</span>
                )}
              </div>
            )}
            <div
              onClick={e => e.stopPropagation()}
              className="card-actions"
              style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}
            >
              <button
                onClick={() => setModal(cu)}
                style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#B85C00", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, flex: 1, textAlign: "center" }}
              >
                ✏️ Editar
              </button>
              {esAdmin && (
                <button
                  onClick={() => setVerVersionesId(cu.id)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #888", background: "#fff", cursor: "pointer", fontSize: 13, color: "#666" }}
                  title="Ver versiones anteriores"
                >
                  🕗
                </button>
              )}
              {esAdmin && (
                <button
                  onClick={() => setConfirm(cu.id)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #fdd", background: "#fff8f8", cursor: "pointer", fontSize: 13, color: "#DC3545" }}
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetalleCuello({ detalle, esAdmin, onClose, onEditar, onCambiarEstatus, onConfirmar, exportarPedidoPDF, pedidosConf = [] }) {
  const abonado = (detalle.abonos || []).length > 0
    ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0)
    : parseFloat(detalle.anticipo || 0);
  const saldo = parseFloat(detalle.precioT || 0) - abonado;

  const filas = [
    ["Cliente", detalle.cliente],
    ["Teléfono", detalle.telefono],
    detalle.confRef && ["Ref. confección", "#" + detalle.confRef],
    ["Cantidad", detalle.cantidad + " prenda" + (parseInt(detalle.cantidad) !== 1 ? "s" : "")],
    ["Material", (detalle.material || "") + (detalle.calibre ? " · " + detalle.calibre : "")],
    (detalle.cuello || {}).activa && ["🔵 Cuello", "Largo " + (detalle.cuello.largo || "—") + "cm · Ancho " + (detalle.cuello.ancho || "—") + "cm" + (detalle.cuello.colores ? " · " + detalle.cuello.colores : "")],
    (detalle.puno || {}).activa && ["🟡 Puño", "Largo " + (detalle.puno.largo || "—") + "cm · Ancho " + (detalle.puno.ancho || "—") + "cm" + (detalle.puno.colores ? " · " + detalle.puno.colores : "")],
    (detalle.banda || {}).activa && ["🟢 Banda", "Largo " + (detalle.banda.largo || "—") + "cm · Ancho " + (detalle.banda.ancho || "—") + "cm" + (detalle.banda.colores ? " · " + detalle.banda.colores : "")],
    !detalle.cuello && detalle.tipoCuello && ["Tipo", detalle.tipoCuello],
    detalle.descripcion && ["Diseño/instrucciones", detalle.descripcion],
    esAdmin && ["Precio total", detalle.precioT ? fmt$C(detalle.precioT) : "—"],
    esAdmin && ["Abonado", fmt$C(abonado)],
    esAdmin && ["Saldo", fmt$C(saldo)],
    ["Fecha entrega", detalle.fechaEntrega],
    ["Notas", detalle.notas],
  ].filter(Boolean);

  const colDet = CUEL_EC[detalle.estatus] || {};

  return (
    <Modal title={`🧶 CUEL-${String(detalle.id).padStart(3, "0")} — ${detalle.cliente}`} onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>
          Estatus
        </div>
        <select
          value={detalle.estatus}
          onChange={e => onCambiarEstatus(e.target.value)}
          style={{
            width: "100%",
            padding: "9px 10px",
            borderRadius: 8,
            border: "1.5px solid " + (colDet.bg || "#e0e0e0"),
            background: colDet.bg || "#f5f5f5",
            color: colDet.fg || "#333",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {CUEL_E.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      {filas.map(([k, v]) => v ? (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f5f5f5", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#aaa", fontWeight: 700, whiteSpace: "nowrap" }}>{k}</span>
          <span style={{ fontSize: 13, color: "#333", textAlign: "right", fontWeight: 600 }}>{v}</span>
        </div>
      ) : null)}

      {(detalle.personas || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: "#1A5276", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            👥 Beneficiarios
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#EBF5FB" }}>
                {["#", "Nombre", "Cargo", "Gafete", "Talla"].map(h => (
                  <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#1A5276" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(detalle.personas || []).map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f8ff", background: i % 2 === 0 ? "#fff" : "#f8fcff" }}>
                  <td style={{ padding: "5px 8px", color: "#aaa" }}>{i + 1}</td>
                  <td style={{ padding: "5px 8px", fontWeight: 700 }}>{p.nombre || "—"}</td>
                  <td style={{ padding: "5px 8px", color: "#555" }}>{p.cargo || "—"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "center" }}>{p.gafete || "—"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "center" }}>
                    {p.talla ? (
                      <span style={{ background: "#B85C00", color: "#fff", borderRadius: 10, padding: "2px 8px", fontWeight: 700, fontSize: 11 }}>
                        {p.talla}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle.linkDrive && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <a
            href={detalle.linkDrive}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#E8F5E9", color: "#155724", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none", border: "1px solid #8BC34A" }}
          >
            📁 Abrir archivo de diseño en Drive
          </a>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button
          onClick={() => imprimirProduccionCuellos(detalle, pedidosConf)}
          title="Hoja de producción para la tejedora: cuántos cuellos y puños por medida, derivado de las tallas del pedido de confección enlazado"
          style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#B7791F", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
        >
          🏭 Producción
        </button>
        {esAdmin && exportarPedidoPDF && (
          <button
            onClick={() => exportarPedidoPDF(detalle, "cuello")}
            style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#1D6A3A", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
          >
            📄 PDF
          </button>
        )}
        {esAdmin && (
          <button
            onClick={onConfirmar}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #fdd", background: "#fff8f8", color: "#DC3545", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
          >
            🗑️
          </button>
        )}
        <button
          onClick={onEditar}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#B85C00", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
        >
          ✏️ Editar
        </button>
      </div>
    </Modal>
  );
}
