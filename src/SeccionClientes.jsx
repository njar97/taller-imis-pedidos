// Cartera de clientes con CRUD básico + modal de edición.
// Antes vivían como SeccionClientes y ModalFormCliente compilados en main.js.

import { MEDIDAS_DEF } from "./lib/constants.js";
import { hoy } from "./lib/dominio.js";
import { pushToast } from "./lib/feedback.js";
import {
  dbClientesGuardar as gsClientesGuardar,
  dbClientesBorrar  as gsClientesBorrar,
} from "./lib/db.js";

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

const TIPO_OPTS = [
  ["persona", "👤 Persona"],
  ["empresa", "🏢 Empresa"],
  ["escuela", "🏫 Escuela/Inst."],
];

function ModalFormCliente({ initial, onSave, onCancel }) {
  const def = {
    nombre: "",
    telefono: "",
    tipo: "persona",
    contacto: "",
    nit: "",
    nrc: "",
    razonSocial: "",
    dirFiscal: "",
    notas: "",
    medidas: {},
  };
  const [f, setF] = useState({ ...def, ...(initial || {}) });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const tieneDatosFiscales = f.nit || f.nrc || f.razonSocial;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: 16, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: "#2C1654", fontFamily: "Georgia,serif" }}>
            {initial ? "✏️ Editar cliente" : "👥 Nuevo cliente"}
          </h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {TIPO_OPTS.map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => set("tipo", val)}
              style={{
                flex: 1,
                padding: "7px 4px",
                borderRadius: 8,
                border: "1.5px solid " + (f.tipo === val ? "#9B59B6" : "#e0e0e0"),
                background: f.tipo === val ? "#9B59B6" : "#fff",
                color: f.tipo === val ? "#fff" : "#666",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: f.tipo === val ? 700 : 400,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={LBL}>Nombre *</label>
            <input style={INPS} value={f.nombre} placeholder="Nombre completo o razón" onChange={e => set("nombre", e.target.value)} />
          </div>
          <div>
            <label style={LBL}>Teléfono / WhatsApp</label>
            <input style={INPS} value={f.telefono} placeholder="Para avisar" onChange={e => set("telefono", e.target.value)} />
          </div>
        </div>

        {(f.tipo === "empresa" || f.tipo === "escuela") && (
          <div style={{ marginBottom: 10 }}>
            <label style={LBL}>Nombre del contacto</label>
            <input
              style={INPS}
              value={f.contacto}
              placeholder={f.tipo === "escuela" ? "Director / administrador" : "Persona de contacto"}
              onChange={e => set("contacto", e.target.value)}
            />
          </div>
        )}

        <div style={{ border: "1.5px solid " + (tieneDatosFiscales ? "#a8d8a8" : "#f0f0f0"), borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ padding: "10px 14px", background: tieneDatosFiscales ? "#f0fff4" : "#fafafa", fontSize: 12, fontWeight: 700, color: tieneDatosFiscales ? "#155724" : "#aaa" }}>
            🧾 Datos fiscales {tieneDatosFiscales ? "(registrados)" : "(opcional — para crédito fiscal)"}
          </div>
          <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LBL}>Razón Social</label>
              <input style={INPS} value={f.razonSocial} placeholder="Nombre legal" onChange={e => set("razonSocial", e.target.value)} />
            </div>
            <div>
              <label style={LBL}>NIT</label>
              <input style={INPS} value={f.nit} placeholder="0000-000000-000-0" onChange={e => set("nit", e.target.value)} />
            </div>
            <div>
              <label style={LBL}>NRC</label>
              <input style={INPS} value={f.nrc} placeholder="000000-0" onChange={e => set("nrc", e.target.value)} />
            </div>
            <div>
              <label style={LBL}>Dirección fiscal</label>
              <input style={INPS} value={f.dirFiscal} placeholder="Para factura" onChange={e => set("dirFiscal", e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ border: "1.5px solid #dce3ff", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ background: "#f0f4ff", padding: "9px 14px", fontSize: 11, fontWeight: 800, color: "#1A5276", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>📐 Medidas del cliente (cm)</span>
            <span style={{ fontSize: 10, color: "#888", fontWeight: 400 }}>Se autocompletarán en pedidos futuros</span>
          </div>
          <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {MEDIDAS_DEF.map(m => (
              <div key={m.k}>
                <label style={{ fontSize: 9, fontWeight: 700, color: "#888", marginBottom: 2, display: "block", textTransform: "uppercase" }}>{m.l}</label>
                <input
                  type="number"
                  value={(f.medidas || {})[m.k] || ""}
                  onChange={e => set("medidas", { ...(f.medidas || {}), [m.k]: e.target.value })}
                  placeholder="—"
                  style={{ ...INPS, padding: "6px 8px", textAlign: "center", fontSize: 13 }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LBL}>Notas internas</label>
          <textarea
            style={{ ...INPS, resize: "vertical", minHeight: 44 }}
            value={f.notas}
            placeholder="Preferencias, observaciones..."
            onChange={e => set("notas", e.target.value)}
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

function ConfirmarEliminar({ onCancel, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
        <h3 style={{ margin: "0 0 8px", color: "#2C1654" }}>¿Eliminar cliente?</h3>
        <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>
          Solo se borra de la cartera, no afecta los pedidos existentes.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#E63946", color: "#fff", cursor: "pointer", fontWeight: 700 }}
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function statsCliente(cli, pedidos, bordados, cuellos) {
  const nombre = cli.nombre.toLowerCase();
  const todos = [
    ...pedidos.filter(p => (p.cliente || "").toLowerCase() === nombre),
    ...bordados.filter(b => (b.cliente || "").toLowerCase() === nombre),
    ...cuellos.filter(c => (c.cliente || "").toLowerCase() === nombre),
  ];
  const activos = todos.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).length;
  const fechas = todos.map(p => p.fecha || p.fechaEntrega || "").filter(Boolean).sort().reverse();
  const monto = todos.reduce((s, p) => s + parseFloat(p.precio || p.precioT || 0), 0);
  return { total: todos.length, activos, ultimaFecha: fechas[0] || "—", monto };
}

export default function SeccionClientes({ clientes, setClientes, pedidos, bordados, cuellos }) {
  const [busq, setBusq] = useState("");
  const [modal, setModal] = useState(null); // null | "nuevo" | cliente
  const [confirm, setConf] = useState(null);

  const lista = clientes.filter(cl =>
    !busq ||
    cl.nombre.toLowerCase().includes(busq.toLowerCase()) ||
    (cl.telefono || "").includes(busq)
  );

  function guardar(form) {
    const isNuevo = modal === "nuevo";
    const id = isNuevo
      ? (clientes.length ? Math.max(...clientes.map(c => c.id || 0)) + 1 : 1)
      : modal.id;
    const cli = { ...form, id, fecha: isNuevo ? hoy() : (modal.fecha || hoy()) };
    if (isNuevo) setClientes(prev => [...prev, cli]);
    else setClientes(prev => prev.map(c => c.id === id ? cli : c));
    gsClientesGuardar(cli);
    setModal(null);
  }

  function eliminar(id) {
    setClientes(prev => prev.filter(c => c.id !== id));
    gsClientesBorrar(id);
    setConf(null);
  }

  const totalConCF = clientes.filter(c => c.nit).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 16, color: "#2C1654", fontWeight: 800, fontFamily: "Georgia,serif" }}>👥 Clientes</h1>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            {clientes.length} cliente(s){totalConCF > 0 ? ` · ${totalConCF} con datos fiscales` : ""}
          </div>
        </div>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none", width: 160 }}
        />
        <button
          onClick={() => setModal("nuevo")}
          style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#2C1654", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
        >
          + Nuevo
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#ccc" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#aaa" }}>
              {clientes.length === 0 ? "Aún no hay clientes registrados" : "Sin resultados"}
            </div>
            <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>
              {clientes.length === 0 ? "Los clientes se guardan automáticamente al registrar pedidos" : ""}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lista.map(cli => {
              const st = statsCliente(cli, pedidos, bordados, cuellos);
              const avatarBg =
                cli.tipo === "empresa" ? "#CCE5FF" :
                cli.tipo === "escuela" ? "#D4EDDA" : "#E8D5FF";
              const avatarIcon =
                cli.tipo === "empresa" ? "🏢" :
                cli.tipo === "escuela" ? "🏫" : "👤";

              return (
                <div
                  key={cli.id}
                  style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1.5px solid #f0f0f0", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {avatarIcon}
                  </div>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontWeight: 800, color: "#2C1654", fontSize: 14 }}>{cli.nombre}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                      {cli.telefono && <span style={{ fontSize: 11, color: "#555" }}>📱 {cli.telefono}</span>}
                      {cli.contacto && <span style={{ fontSize: 11, color: "#888" }}>👤 {cli.contacto}</span>}
                      {cli.nit && <span style={{ fontSize: 11, color: "#27AE60", fontWeight: 700 }}>📋 CF</span>}
                    </div>
                    {cli.notas && (
                      <div style={{ fontSize: 10, color: "#aaa", marginTop: 2, fontStyle: "italic" }}>{cli.notas}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#9B59B6" }}>{st.total}</div>
                      <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700, textTransform: "uppercase" }}>pedidos</div>
                    </div>
                    {st.activos > 0 && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#E67E22" }}>{st.activos}</div>
                        <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700, textTransform: "uppercase" }}>activos</div>
                      </div>
                    )}
                    {st.monto > 0 && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#27AE60" }}>${st.monto.toFixed(0)}</div>
                        <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700, textTransform: "uppercase" }}>historial</div>
                      </div>
                    )}
                  </div>
                  {st.ultimaFecha !== "—" && (
                    <div style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>
                      Último pedido:<br />
                      <strong style={{ color: "#555" }}>{st.ultimaFecha}</strong>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => setModal(cli)}
                      style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#9B59B6", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => setConf(cli.id)}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #fdd", background: "#fff8f8", cursor: "pointer", fontSize: 12, color: "#DC3545" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <ModalFormCliente
          initial={modal !== "nuevo" ? modal : null}
          onSave={guardar}
          onCancel={() => setModal(null)}
        />
      )}

      {confirm && (
        <ConfirmarEliminar
          onCancel={() => setConf(null)}
          onConfirm={() => eliminar(confirm)}
        />
      )}
    </div>
  );
}
