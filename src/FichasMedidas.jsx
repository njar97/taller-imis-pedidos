// Captura de medidas persona-por-persona, pensada para teléfono: la
// tabla tipo Excel es cómoda en PC pero incómoda en un cel (scroll
// horizontal, celdas chicas). Acá: lista de personas → tocás una →
// ficha vertical con campos grandes, y botones Anterior/Siguiente para
// recorrer la lista sin volver al índice.
//
// Edita el MISMO shape de personas[] que TablaMedidas/ListaPrendas.

import { SECCIONES } from "./TablaMedidas.jsx";
import { pushConfirm } from "./lib/feedback.js";

import { useState } from "react";

const INP = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 10,
  border: "1.5px solid #ddd6ec",
  fontSize: 16, // ≥16 evita el auto-zoom de iOS
  fontFamily: "inherit",
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const LBL = {
  fontSize: 10,
  fontWeight: 800,
  color: "#7a6a9a",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 4,
  display: "block",
};

// Cuenta cuántas medidas tiene llenas una persona (para la lista).
function medidasLlenas(p) {
  let n = 0;
  for (const s of SECCIONES) {
    const m = (p.medidas || {})[s.id] || {};
    n += Object.values(m).filter(v => v !== "" && v != null).length;
  }
  return n;
}

export default function FichasMedidas({ personas, onChange }) {
  const lista = personas || [];
  const [sel, setSel] = useState(null); // null = lista, número = ficha abierta

  const upd = (i, cambio) => {
    onChange(lista.map((p, j) => (j === i ? { ...p, ...cambio } : p)));
  };
  const updMedida = (i, secId, clave, v) => {
    const p = lista[i];
    const meds = { ...(p.medidas || {}) };
    meds[secId] = { ...(meds[secId] || {}) };
    if (v === "") delete meds[secId][clave];
    else meds[secId][clave] = v;
    upd(i, { medidas: meds });
  };
  const updTalla = (i, v) => {
    const p = lista[i];
    const prendas = (p.prendas || []).length
      ? p.prendas.map((pr, k) => (k === 0 ? { ...pr, talla: v } : pr))
      : p.prendas;
    upd(i, { talla: v, prendas });
  };
  const agregar = () => {
    onChange([...lista, { nombre: "", talla: "", prendas: [], medidas: {} }]);
    setSel(lista.length);
  };
  const quitar = async i => {
    const ok = await pushConfirm({
      titulo: "Quitar persona",
      msg: `¿Quitar a "${lista[i].nombre || "esta persona"}" de la lista?`,
      okLabel: "Sí, quitar",
    });
    if (!ok) return;
    onChange(lista.filter((_, j) => j !== i));
    setSel(null);
  };

  // ── Vista ficha (una persona) ─────────────────────────────
  if (sel != null && lista[sel]) {
    const i = sel;
    const p = lista[i];
    return (
      <div>
        {/* Nav superior */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setSel(null)} style={{
            border: "1.5px solid #ddd6ec", background: "#fff", borderRadius: 10,
            padding: "9px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#6C3483", fontWeight: 700,
          }}>
            ☰ Lista
          </button>
          <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 800, color: "#2C1654" }}>
            Persona {i + 1} de {lista.length}
          </div>
          <button onClick={() => quitar(i)} style={{
            border: "1.5px solid #f5c6cb", background: "#fff8f8", borderRadius: 10,
            padding: "9px 12px", fontSize: 13, cursor: "pointer", color: "#DC3545",
          }}>
            ✕
          </button>
        </div>

        {/* Datos base */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, border: "1.5px solid #eee9f6" }}>
          <div style={{ marginBottom: 10 }}>
            <label style={LBL}>Nombre</label>
            <input style={{ ...INP, fontWeight: 700 }} value={p.nombre || ""} placeholder="Nombre completo…"
              onChange={e => upd(i, { nombre: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={LBL}>Grado / cargo</label>
              <input style={INP} value={p.cargo || ""} onChange={e => upd(i, { cargo: e.target.value })} />
            </div>
            <div>
              <label style={LBL}>Talla</label>
              <input style={INP} value={p.talla || ""} onChange={e => updTalla(i, e.target.value)} />
            </div>
          </div>
        </div>

        {/* Medidas por prenda */}
        {SECCIONES.map(s => (
          <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, border: "1.5px solid #eee9f6" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: s.color, marginBottom: 10 }}>{s.label}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {s.cols.map(([k, l]) => (
                <div key={k}>
                  <label style={LBL}>{l}</label>
                  <input
                    style={INP}
                    inputMode="decimal"
                    value={(p.medidas || {})[s.id]?.[k] ?? ""}
                    onChange={e => updMedida(i, s.id, k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Abono */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, border: "1.5px solid #eee9f6" }}>
          <label style={LBL}>Abono ($)</label>
          <input
            style={INP}
            inputMode="decimal"
            value={(p.medidas || {}).abono ?? ""}
            onChange={e => {
              const meds = { ...(p.medidas || {}) };
              if (e.target.value === "") delete meds.abono;
              else meds.abono = e.target.value;
              upd(i, { medidas: meds });
            }}
          />
        </div>

        {/* Anterior / Siguiente */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setSel(i > 0 ? i - 1 : i)}
            disabled={i === 0}
            style={{
              flex: 1, padding: "13px", borderRadius: 10, fontFamily: "inherit",
              border: "1.5px solid #ddd6ec", background: "#fff", color: i === 0 ? "#ccc" : "#6C3483",
              fontWeight: 800, fontSize: 14, cursor: i === 0 ? "default" : "pointer",
            }}
          >
            ◀ Anterior
          </button>
          <button
            onClick={() => { if (i === lista.length - 1) agregar(); else setSel(i + 1); }}
            style={{
              flex: 1, padding: "13px", borderRadius: 10, border: "none", fontFamily: "inherit",
              background: "#6C3483", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
            }}
          >
            {i === lista.length - 1 ? "＋ Nueva persona" : "Siguiente ▶"}
          </button>
        </div>
      </div>
    );
  }

  // ── Vista lista ───────────────────────────────────────────
  return (
    <div>
      {lista.map((p, i) => {
        const n = medidasLlenas(p);
        return (
          <button
            key={i}
            onClick={() => setSel(i)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              background: "#fff", border: "1.5px solid #eee9f6", borderRadius: 12,
              padding: "13px 14px", marginBottom: 8, cursor: "pointer",
              textAlign: "left", fontFamily: "inherit",
            }}
          >
            <span style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: n > 0 ? "#27AE60" : "#eee", color: n > 0 ? "#fff" : "#999",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800,
            }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#2C1654", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.nombre || <span style={{ color: "#bbb", fontWeight: 400 }}>Sin nombre…</span>}
              </span>
              <span style={{ display: "block", fontSize: 11, color: "#999", marginTop: 2 }}>
                {[p.cargo, p.talla && `talla ${p.talla}`, n > 0 ? `${n} medidas` : "sin medidas"].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span style={{ color: "#c9b8e8", fontSize: 18 }}>›</span>
          </button>
        );
      })}
      <button
        onClick={agregar}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, fontFamily: "inherit",
          border: "2px dashed #c9b8e8", background: "#faf7ff", color: "#6C3483",
          fontWeight: 800, fontSize: 14, cursor: "pointer",
        }}
      >
        ＋ Agregar persona
      </button>
    </div>
  );
}
