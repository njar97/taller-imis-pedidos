// Lista de prendas por persona (uniformes de escuela/empresa). Cada persona
// puede tener N prendas (saco + pantalón + quepi, p. ej.) cada una con su
// tipo, talla, precio. También tabla alternativa de "personas internas".
//
// Backwards compat: personas guardadas con shape viejo {nombre, talla,
// precio} se normalizan al renderizar a {nombre, prendas:[{...}]}. Al
// guardar escribimos ambos formatos (prendas[] + talla/precio derivados
// de la primera prenda) para que código que aún lee shape viejo siga
// funcionando.

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

// Una prenda dentro de una persona.
const PRENDA_BASE = () => ({
  id: Date.now() + Math.random(),
  tipo: "",
  talla: "",
  precio: null,
  spec: "",
});

// Una persona (alumno, empleado, beneficiario).
const PERSONA_BASE = () => ({
  id: Date.now() + Math.random(),
  nombre: "",
  prendas: [PRENDA_BASE()],
  medidas: {},
  cargo: "",
  gafete: "",
});

// Convierte una persona en shape viejo (con talla/precio sueltos, sin
// prendas[]) al shape nuevo. Idempotente: si ya tiene prendas[], no toca.
function normalizar(p) {
  if (Array.isArray(p.prendas) && p.prendas.length > 0) {
    return p;
  }
  const prenda = PRENDA_BASE();
  if (p.talla) prenda.talla = p.talla;
  if (p.precio != null && p.precio !== "") prenda.precio = p.precio;
  return { ...p, prendas: [prenda] };
}

// Al persistir, también escribe talla y precio derivados (de la primera
// prenda y la suma total) para retrocompatibilidad con código que aún
// lee el shape viejo (impresión, detalle de pedido, búsqueda).
function persistible(p) {
  const primera = (p.prendas || [])[0] || {};
  const total = (p.prendas || []).reduce(
    (s, pr) => s + (parseFloat(pr.precio) || 0),
    0
  );
  return {
    ...p,
    talla: primera.talla || "",
    precio: total > 0 ? total : null,
  };
}

export function ListaPrendas({ items, onChange }) {
  const [expandida, setExp] = useState(null);

  // Normaliza al render — items pueden venir en shape viejo o nuevo.
  const lista = (items || []).map(normalizar);

  // Cualquier mutación pasa por escribir → garantiza derivados.
  const escribir = nuevaLista => onChange(nuevaLista.map(persistible));

  const agregar = () => {
    const nueva = PERSONA_BASE();
    escribir([...lista, nueva]);
    setExp(nueva.id);
  };
  const quitar = id => {
    escribir(lista.filter(p => p.id !== id));
    if (expandida === id) setExp(null);
  };
  const editar = (id, k, v) =>
    escribir(lista.map(p => (p.id === id ? { ...p, [k]: v } : p)));
  const editMed = (id, k, v) =>
    escribir(
      lista.map(p =>
        p.id === id ? { ...p, medidas: { ...p.medidas, [k]: v } } : p
      )
    );

  // Operaciones sobre prendas individuales dentro de una persona
  const agregarPrenda = personaId =>
    escribir(
      lista.map(p =>
        p.id === personaId ? { ...p, prendas: [...p.prendas, PRENDA_BASE()] } : p
      )
    );
  const quitarPrenda = (personaId, prendaId) =>
    escribir(
      lista.map(p =>
        p.id === personaId
          ? {
              ...p,
              prendas:
                p.prendas.length > 1
                  ? p.prendas.filter(pr => pr.id !== prendaId)
                  : p.prendas, // no permitir 0 prendas — mínimo 1
            }
          : p
      )
    );
  const editarPrenda = (personaId, prendaId, k, v) =>
    escribir(
      lista.map(p =>
        p.id === personaId
          ? {
              ...p,
              prendas: p.prendas.map(pr =>
                pr.id === prendaId ? { ...pr, [k]: v } : pr
              ),
            }
          : p
      )
    );

  const copiarMedidas = id => {
    const idx = lista.findIndex(p => p.id === id);
    if (idx <= 0) return;
    const prev = lista[idx - 1].medidas || {};
    if (!Object.values(prev).some(v => v)) return;
    escribir(
      lista.map(p => (p.id === id ? { ...p, medidas: { ...prev } } : p))
    );
  };

  // Resumen agregado de todas las prendas de todas las personas
  const resumenTallas = {};
  let totalPzas = 0;
  let totalPrecio = 0;
  lista.forEach(p => {
    (p.prendas || []).forEach(pr => {
      if (pr.talla) {
        resumenTallas[pr.talla] = (resumenTallas[pr.talla] || 0) + 1;
        totalPzas++;
      }
      const px = parseFloat(pr.precio || 0);
      if (!isNaN(px)) totalPrecio += px;
    });
  });
  const conMedidas = lista.filter(p =>
    Object.values(p.medidas || {}).some(v => v)
  ).length;

  // Aplica la primera talla con valor a todas las prendas sin talla.
  const igualarTalla = () => {
    const primera = lista
      .flatMap(p => p.prendas || [])
      .find(pr => pr.talla)?.talla;
    if (!primera) return;
    escribir(
      lista.map(p => ({
        ...p,
        prendas: (p.prendas || []).map(pr =>
          pr.talla ? pr : { ...pr, talla: primera }
        ),
      }))
    );
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
      {/* Header con resumen y botón agregar */}
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
            👥 {lista.length} persona{lista.length !== 1 ? "s" : ""} · {totalPzas} prenda
            {totalPzas !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {Object.entries(resumenTallas).map(([t, n]) => (
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
            {totalPrecio > 0 && (
              <span
                style={{
                  background: "#27AE60",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "1px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                💰 ${totalPrecio.toFixed(2)}
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
          + Persona
        </button>
      </div>

      {/* Lista de personas — cards expandibles */}
      {lista.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb", fontSize: 12 }}>
          Presiona <strong style={{ color: "#E67E22" }}>+ Persona</strong> para registrar la
          primera
        </div>
      ) : (
        <div>
          {lista.map((p, i) => {
            const abierto = expandida === p.id;
            const tieneMeds = Object.values(p.medidas || {}).some(v => v);
            const hayPrev = i > 0 && Object.values(lista[i - 1].medidas || {}).some(v => v);
            const totalPersona = (p.prendas || []).reduce(
              (s, pr) => s + (parseFloat(pr.precio || 0) || 0),
              0
            );
            const resumenPrendas = (p.prendas || [])
              .filter(pr => pr.tipo || pr.talla)
              .map(pr => {
                if (pr.tipo && pr.talla) return `${pr.tipo} ${pr.talla}`;
                return pr.tipo || pr.talla;
              })
              .join(" · ");
            return (
              <div key={p.id} style={{ borderBottom: "1px solid #fde0b8" }}>
                {/* Header de la persona — siempre visible, click expande */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    background: i % 2 === 0 ? "#fff" : "#fffbf6",
                    cursor: "pointer",
                  }}
                  onClick={() => setExp(abierto ? null : p.id)}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#ccc",
                      fontWeight: 700,
                      width: 16,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#2C1654", fontSize: 13 }}>
                      {p.nombre || `Persona ${i + 1}`}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#888",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(p.prendas || []).length} prenda
                      {(p.prendas || []).length !== 1 ? "s" : ""}
                      {resumenPrendas ? ` · ${resumenPrendas}` : ""}
                      {totalPersona > 0 ? ` · $${totalPersona.toFixed(2)}` : ""}
                      {tieneMeds ? " · 📐" : ""}
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      quitar(p.id);
                    }}
                    title="Quitar persona"
                    style={{
                      padding: "4px 6px",
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
                  <span style={{ fontSize: 10, color: "#aaa", fontWeight: 700, flexShrink: 0 }}>
                    {abierto ? "▲" : "▼"}
                  </span>
                </div>

                {/* Contenido expandido — nombre, prendas, medidas, cargo/gafete */}
                {abierto && (
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "#fcfcfc",
                      borderTop: "1px solid #f0f0f0",
                    }}
                  >
                    <div style={{ marginBottom: 10 }}>
                      <label style={MLAB}>Nombre</label>
                      <input
                        value={p.nombre}
                        onChange={e => editar(p.id, "nombre", e.target.value)}
                        placeholder="Nombre completo"
                        style={INP_LP}
                      />
                    </div>

                    {/* Prendas de esta persona */}
                    <div style={MLAB}>Prendas</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
                      {(p.prendas || []).map(pr => (
                        <div
                          key={pr.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 72px 72px 22px",
                            gap: 6,
                            alignItems: "center",
                            background: "#fff",
                            border: "1px solid #fde0b8",
                            borderRadius: 8,
                            padding: "6px 8px",
                          }}
                        >
                          <input
                            value={pr.tipo}
                            onChange={e =>
                              editarPrenda(p.id, pr.id, "tipo", e.target.value)
                            }
                            placeholder="Ej: Saco, Pantalón, Quepi"
                            style={INP_LP}
                          />
                          <select
                            value={pr.talla}
                            onChange={e =>
                              editarPrenda(p.id, pr.id, "talla", e.target.value)
                            }
                            style={{
                              ...INP_LP,
                              cursor: "pointer",
                              color: pr.talla ? "#2C1654" : "#aaa",
                            }}
                          >
                            <option value="">Talla</option>
                            {TODAS_TALLAS.map(t => (
                              <option key={t}>{t}</option>
                            ))}
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
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={pr.precio != null ? pr.precio : ""}
                              onChange={e =>
                                editarPrenda(
                                  p.id,
                                  pr.id,
                                  "precio",
                                  e.target.value !== "" ? parseFloat(e.target.value) : null
                                )
                              }
                              placeholder="—"
                              style={{
                                ...INP_LP,
                                paddingLeft: 16,
                                color: "#27AE60",
                                fontWeight: 700,
                              }}
                            />
                          </div>
                          <button
                            onClick={() => quitarPrenda(p.id, pr.id)}
                            disabled={(p.prendas || []).length <= 1}
                            title={
                              (p.prendas || []).length <= 1
                                ? "Mínimo 1 prenda por persona"
                                : "Quitar prenda"
                            }
                            style={{
                              padding: 0,
                              border: "none",
                              background: "none",
                              cursor: (p.prendas || []).length <= 1 ? "not-allowed" : "pointer",
                              fontSize: 16,
                              color: "#e0e0e0",
                              lineHeight: 1,
                              opacity: (p.prendas || []).length <= 1 ? 0.3 : 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => agregarPrenda(p.id)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "1.5px dashed #E67E22",
                        background: "#fff",
                        color: "#E67E22",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      + Agregar prenda
                    </button>

                    {/* Medidas */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <label style={MLAB}>📐 Medidas (cm)</label>
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
                          Copiar de persona anterior
                        </button>
                      )}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      {MEDS_LISTA.map(m => (
                        <div key={m.k}>
                          <label style={MLAB}>{m.l}</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={(p.medidas || {})[m.k] || ""}
                            onChange={e => editMed(p.id, m.k, e.target.value)}
                            placeholder="—"
                            style={{ ...INP_LP, textAlign: "center", padding: "6px 4px" }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Cargo + gafete */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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

      {/* Footer con resumen + acciones */}
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
            {lista.filter(p => p.nombre).length} con nombre · {totalPzas} prendas ·{" "}
            {conMedidas} con medidas
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

  // Esta parte del archivo se mantiene como está — no se usa desde la app
  // según comentario en main.jsx pero la dejo por compatibilidad.
  return null;
}
