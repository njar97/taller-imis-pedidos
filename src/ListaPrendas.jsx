// Lista de prendas por persona (uniformes de escuela/empresa) y tabla
// alternativa de "personas internas".
// Antes vivían como ListaPrendas + TablaPersonasInternas compilados
// en main.js (~770 líneas).

import { pushConfirm } from "./lib/feedback.js";

import { useState } from "react";

// Constantes de tallas y medidas (eran top-level en main.js).
// Las dos listas de tallas eran idénticas, las reusamos.
const TODAS_TALLAS = [
  "XS", "S", "M", "L", "XL", "2XL", "3XL",
  "2", "4", "6", "8", "10", "12", "14",
  "34", "36", "38", "40", "42", "44", "46", "48",
  "A medida",
];

const MEDS_LISTA = [
  { k: "pecho",   l: "Pecho" },
  { k: "cintura", l: "Cintura" },
  { k: "cadera",  l: "Cadera" },
  { k: "hombro",  l: "Hombro" },
  { k: "largo",   l: "Largo" },
  { k: "manga",   l: "Manga" },
];

const MEDIDAS_PERS = ["Hombro", "Pecho", "Cintura", "Cadera", "Largo", "Manga"];

// Estilos compartidos
const INP_LP = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #e0e0e0",
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit",
  background: "#fff",
  width: "100%",
};

const INP_TP = { ...INP_LP, padding: "5px 6px" };

const MLAB = {
  fontSize: 9,
  fontWeight: 700,
  color: "#888",
  marginBottom: 2,
  display: "block",
  textTransform: "uppercase",
};

// ── ListaPrendas ─────────────────────────────────────────

const ITEM_BASE = () => ({
  id: Date.now() + Math.random(),
  nombre: "",
  talla: "",
  precio: null,
  cargo: "",
  gafete: "",
  medidas: {},
  abierto: false,
});

export function ListaPrendas({ items, onChange }) {
  const [expandida, setExp] = useState(null);

  const lista = items || [];

  const agregar = () => {
    const nuevo = ITEM_BASE();
    onChange([...lista, nuevo]);
    setExp(nuevo.id);
  };
  const quitar = id => {
    onChange(lista.filter(p => p.id !== id));
    if (expandida === id) setExp(null);
  };
  const editar = (id, k, v) =>
    onChange(lista.map(p => (p.id === id ? { ...p, [k]: v } : p)));
  const editMed = (id, k, v) =>
    onChange(lista.map(p => (p.id === id ? { ...p, medidas: { ...p.medidas, [k]: v } } : p)));
  const copiarMedidas = id => {
    const idx = lista.findIndex(p => p.id === id);
    if (idx <= 0) return;
    const prev = lista[idx - 1].medidas || {};
    if (!Object.values(prev).some(v => v)) return;
    onChange(lista.map(p => (p.id === id ? { ...p, medidas: { ...prev } } : p)));
  };

  const resumen = {};
  lista.forEach(p => {
    if (p.talla) resumen[p.talla] = (resumen[p.talla] || 0) + 1;
  });
  const totalPzas = lista.length;
  const conMedidas = lista.filter(p => Object.values(p.medidas || {}).some(v => v)).length;
  const totalPrecio = lista
    .filter(p => p.precio != null && p.precio !== "")
    .reduce((s, p) => s + parseFloat(p.precio || 0), 0);

  const igualarTalla = () => {
    const primera = lista.find(p => p.talla)?.talla;
    if (!primera) return;
    onChange(lista.map(p => (p.talla ? p : { ...p, talla: primera })));
  };

  const limpiar = async () => {
    const ok = await pushConfirm({
      titulo: "Limpiar lista",
      msg: "¿Querés borrar toda la lista de personas? Esta acción no se puede deshacer.",
      okLabel: "Sí, limpiar",
      danger: true,
    });
    if (ok) onChange([]);
  };

  return (
    <div style={{ border: "1.5px solid #fde0b8", borderRadius: 10, overflow: "hidden" }}>
      <div
        style={{
          background: "#FFF3E0",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#E67E22" }}>
            📋 {totalPzas} prenda{totalPzas !== 1 ? "s" : ""} registrada
            {totalPzas !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {Object.entries(resumen).map(([t, n]) => (
              <span
                key={t}
                style={{
                  background: "#E67E22",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "1px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {t}: {n}
              </span>
            ))}
            {conMedidas > 0 && (
              <span
                style={{
                  background: "#1A5276",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "1px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                📐 {conMedidas} con medidas
              </span>
            )}
          </div>
        </div>
        <button
          onClick={agregar}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "none",
            background: "#E67E22",
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          + Agregar
        </button>
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb", fontSize: 12 }}>
          Presiona <strong style={{ color: "#E67E22" }}>+ Agregar</strong> para registrar la
          primera prenda
        </div>
      ) : (
        <div>
          {lista.map((p, i) => {
            const abierto = expandida === p.id;
            const tieneMeds = Object.values(p.medidas || {}).some(v => v);
            const hayPrev = i > 0 && Object.values(lista[i - 1].medidas || {}).some(v => v);
            return (
              <div key={p.id} style={{ borderBottom: "1px solid #fde0b8" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr 90px 70px 28px 28px",
                    gap: 6,
                    alignItems: "center",
                    padding: "8px 12px",
                    background: i % 2 === 0 ? "#fff" : "#fffbf6",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#ccc", fontWeight: 700, textAlign: "center" }}>
                    {i + 1}
                  </div>
                  <input
                    value={p.nombre}
                    onChange={e => editar(p.id, "nombre", e.target.value)}
                    placeholder={`Prenda ${i + 1} / nombre`}
                    style={INP_LP}
                  />
                  <select
                    value={p.talla}
                    onChange={e => editar(p.id, "talla", e.target.value)}
                    style={{ ...INP_LP, cursor: "pointer", color: p.talla ? "#2C1654" : "#aaa" }}
                  >
                    <option value="">Talla</option>
                    {TODAS_TALLAS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 11,
                        color: "#27AE60",
                        fontWeight: 700,
                        pointerEvents: "none",
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.precio != null ? p.precio : ""}
                      onChange={e =>
                        editar(p.id, "precio", e.target.value !== "" ? parseFloat(e.target.value) : null)
                      }
                      placeholder="—"
                      style={{ ...INP_LP, paddingLeft: 16, color: "#27AE60", fontWeight: 700 }}
                    />
                  </div>
                  <button
                    onClick={() => setExp(abierto ? null : p.id)}
                    title="Ver medidas"
                    style={{
                      padding: "4px",
                      borderRadius: 6,
                      border: "1.5px solid " + (tieneMeds ? "#1A5276" : "#e0e0e0"),
                      background: tieneMeds ? "#EBF5FB" : abierto ? "#f0f0f0" : "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      color: tieneMeds ? "#1A5276" : "#bbb",
                      lineHeight: 1,
                    }}
                  >
                    📐
                  </button>
                  <button
                    onClick={() => quitar(p.id)}
                    style={{
                      padding: "4px",
                      borderRadius: 6,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: 16,
                      color: "#e0e0e0",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
                {abierto && (
                  <div
                    style={{
                      padding: "10px 14px 12px",
                      background: "#F0F4FF",
                      borderTop: "1px solid #dce3ff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#1A5276",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        📐 Medidas de esta prenda (cm)
                      </div>
                      {hayPrev && (
                        <button
                          onClick={() => copiarMedidas(p.id)}
                          style={{
                            fontSize: 10,
                            color: "#1A5276",
                            background: "#fff",
                            border: "1px solid #1A5276",
                            borderRadius: 6,
                            padding: "3px 8px",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Copiar de prenda anterior
                        </button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                      {MEDS_LISTA.map(m => (
                        <div key={m.k}>
                          <label style={MLAB}>{m.l}</label>
                          <input
                            type="number"
                            value={(p.medidas || {})[m.k] || ""}
                            onChange={e => editMed(p.id, m.k, e.target.value)}
                            placeholder="—"
                            style={{ ...INP_LP, textAlign: "center", padding: "6px 4px" }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div>
                        <label style={MLAB}>Cargo / área (opcional)</label>
                        <input
                          value={p.cargo || ""}
                          onChange={e => editar(p.id, "cargo", e.target.value)}
                          placeholder="Ej: administración, docente"
                          style={INP_LP}
                        />
                      </div>
                      <div>
                        <label style={MLAB}>Gafete / ID (opcional)</label>
                        <input
                          value={p.gafete || ""}
                          onChange={e => editar(p.id, "gafete", e.target.value)}
                          placeholder="N° o código"
                          style={{ ...INP_LP, textAlign: "center" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lista.length > 0 && (
        <div
          style={{
            padding: "8px 14px",
            background: "#fffbf6",
            borderTop: "1px solid #fde0b8",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, color: "#aaa", flex: 1 }}>
            {lista.filter(p => p.nombre).length} con nombre ·{" "}
            {lista.filter(p => p.talla).length} con talla · {conMedidas} con medidas
            {totalPrecio > 0 ? ` · Total: $${totalPrecio.toFixed(2)}` : ""}
          </span>
          <button
            onClick={igualarTalla}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1.5px solid #E67E22",
              background: "#fff",
              color: "#E67E22",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Igualar talla
          </button>
          <button
            onClick={limpiar}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1.5px solid #fdd",
              background: "#fff8f8",
              color: "#DC3545",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}

// ── TablaPersonasInternas ────────────────────────────────

const PERS_BASE = {
  id: 0,
  nombre: "",
  cargo: "",
  gafete: "",
  talla: "",
  medidas: {},
};

const TH_BASE = {
  padding: "6px 10px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  color: "#1A5276",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

export function TablaPersonasInternas({ personas, onChange, tipoPrenda }) {
  const [verMedidas, setVerMedidas] = useState(false);

  const lista = personas || [];

  const agregar = () => onChange([...lista, { ...PERS_BASE, id: Date.now() }]);
  const quitar = id => onChange(lista.filter(p => p.id !== id));
  const editar = (id, key, val) =>
    onChange(lista.map(p => (p.id === id ? { ...p, [key]: val } : p)));
  const editarMedida = (id, k, val) =>
    onChange(lista.map(p => (p.id === id ? { ...p, medidas: { ...p.medidas, [k]: val } } : p)));

  const resumenTallas = {};
  lista.forEach(p => {
    if (p.talla) resumenTallas[p.talla] = (resumenTallas[p.talla] || 0) + 1;
  });

  const igualarTalla = () => {
    const primera = lista.find(p => p.talla)?.talla;
    if (!primera) return;
    onChange(lista.map(p => (p.talla ? p : { ...p, talla: primera })));
  };

  return (
    <div style={{ border: "1.5px solid #CCE5FF", borderRadius: 10, overflow: "hidden" }}>
      <div
        style={{
          background: "#EBF5FB",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1A5276" }}>
            👥 Personas internas — {lista.length} registrada{lista.length !== 1 ? "s" : ""}
          </div>
          {Object.keys(resumenTallas).length > 0 && (
            <div
              style={{
                fontSize: 11,
                color: "#555",
                marginTop: 2,
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              {Object.entries(resumenTallas).map(([t, n]) => (
                <span
                  key={t}
                  style={{
                    background: "#1A5276",
                    color: "#fff",
                    borderRadius: 12,
                    padding: "1px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {t}: {n}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setVerMedidas(v => !v)}
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: "1.5px solid #1A5276",
              background: verMedidas ? "#1A5276" : "#fff",
              color: verMedidas ? "#fff" : "#1A5276",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            📐 {verMedidas ? "Ocultar" : "Ver"} medidas
          </button>
          <button
            onClick={agregar}
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              background: "#1A5276",
              color: "#fff",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            + Agregar
          </button>
        </div>
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#bbb", fontSize: 12 }}>
          Presiona <strong style={{ color: "#1A5276" }}>+ Agregar</strong> para registrar personas
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f0f8ff", borderBottom: "1.5px solid #CCE5FF" }}>
                <th style={TH_BASE}>#</th>
                <th style={TH_BASE}>Nombre</th>
                <th style={{ ...TH_BASE, padding: "6px 8px" }}>Cargo / Área</th>
                <th style={{ ...TH_BASE, padding: "6px 8px" }}>Gafete</th>
                <th style={{ ...TH_BASE, padding: "6px 8px", textAlign: "center" }}>Talla</th>
                {verMedidas &&
                  MEDIDAS_PERS.map(m => (
                    <th
                      key={m}
                      style={{
                        padding: "6px 6px",
                        textAlign: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#7F8C8D",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m}
                    </th>
                  ))}
                <th style={{ padding: "6px 6px", width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: "1px solid #EBF5FB",
                    background: i % 2 === 0 ? "#fff" : "#f8fcff",
                  }}
                >
                  <td style={{ padding: "5px 10px", color: "#aaa", fontWeight: 700, fontSize: 11 }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: "4px 8px", minWidth: 130 }}>
                    <input
                      value={p.nombre}
                      onChange={e => editar(p.id, "nombre", e.target.value)}
                      placeholder="Nombre completo"
                      style={INP_TP}
                    />
                  </td>
                  <td style={{ padding: "4px 6px", minWidth: 100 }}>
                    <input
                      value={p.cargo || ""}
                      onChange={e => editar(p.id, "cargo", e.target.value)}
                      placeholder="Área / cargo"
                      style={INP_TP}
                    />
                  </td>
                  <td style={{ padding: "4px 6px", minWidth: 70 }}>
                    <input
                      value={p.gafete || ""}
                      onChange={e => editar(p.id, "gafete", e.target.value)}
                      placeholder="N° / ID"
                      style={{ ...INP_TP, textAlign: "center" }}
                    />
                  </td>
                  <td style={{ padding: "4px 6px", minWidth: 80 }}>
                    <select
                      value={p.talla || ""}
                      onChange={e => editar(p.id, "talla", e.target.value)}
                      style={{ ...INP_TP, textAlign: "center", cursor: "pointer" }}
                    >
                      <option value="">—</option>
                      {TODAS_TALLAS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  {verMedidas &&
                    MEDIDAS_PERS.map(m => (
                      <td key={m} style={{ padding: "4px 4px", minWidth: 54 }}>
                        <input
                          type="number"
                          value={(p.medidas || {})[m] || ""}
                          onChange={e => editarMedida(p.id, m, e.target.value)}
                          placeholder="—"
                          style={{
                            ...INP_TP,
                            textAlign: "center",
                            padding: "5px 2px",
                            width: 50,
                          }}
                        />
                      </td>
                    ))}
                  <td style={{ padding: "4px 6px", textAlign: "center" }}>
                    <button
                      onClick={() => quitar(p.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 16,
                        color: "#ddd",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lista.length > 0 && (
        <div
          style={{
            padding: "8px 14px",
            background: "#f0f8ff",
            borderTop: "1px solid #CCE5FF",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: "#888", flex: 1 }}>
            {lista.filter(p => p.nombre).length} con nombre ·{" "}
            {lista.filter(p => p.talla).length} con talla ·{" "}
            {lista.filter(p => Object.values(p.medidas || {}).some(v => v)).length} con medidas
          </span>
          <button
            onClick={igualarTalla}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1.5px solid #1A5276",
              background: "#fff",
              color: "#1A5276",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Igualar talla
          </button>
          <button
            onClick={() => onChange([])}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1.5px solid #fdd",
              background: "#fff8f8",
              color: "#DC3545",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
}
