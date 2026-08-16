// Selector de tallas estándar para crear ítems de pedido.
// Antes vivían como SelectorTallas + TallasChips + constante GRUPOS_TALLAS
// compilados en main.js (~660 líneas).

import { useState } from "react";

// Grupos de tallas. "sintalla" es para productos que no aplican (cortina,
// mantel, banner bordado, etc.) — oculta los chips de tallas y deja solo
// cantidad + precio + especificación.
const GRUPOS_TALLAS = {
  adulto:   { label: "Adulto",     tallas: ["XS", "S", "M", "L", "XL", "2XL", "3XL"] },
  nino:     { label: "Niño",       tallas: ["2", "4", "6", "8", "10", "12", "14", "16"] },
  numeros:  { label: "Núm.",       tallas: ["34", "36", "38", "40", "42", "44", "46", "48"] },
  sintalla: { label: "Sin talla",  tallas: [] },
};

// Orden lógico para mostrar tallas en pedidos (sin mutar el orden en que
// se ingresaron — se ordenan al renderizar).
//   adulto: XS < S < M < L < XL < 2XL < 3XL
//   niño / núm: orden numérico natural
// ⚠ El rank viejo les daba 1-7 a las letras y 1000+n a los numeros: por eso
// el detalle mostraba M, L, XL ANTES que 2, 4, 6. Numericas (ninos) primero.
const RANK_TALLAS = { XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, "3XL": 7 };
function rankTalla(t) {
  const n = parseInt(t, 10);
  if (Number.isFinite(n)) return n;
  if (RANK_TALLAS[t]) return 1000 + RANK_TALLAS[t];
  return 9999;
}
function ordenarTallas(items) {
  return [...(items || [])].sort((a, b) => rankTalla(a.talla) - rankTalla(b.talla));
}

// Vista "resumen del pedido" en chips grandes — decorativa, complementa la
// tabla interactiva de arriba. Si los items tienen `tipo` distinto, los
// chips muestran el tipo encima de la talla.
function ResumenTallas({ lista, totalPzas, totalMonto }) {
  return (
    <div
      style={{
        marginTop: 10,
        background: "#FFFBF6",
        border: "1px solid #fde0b8",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: "1px solid #fde0b8",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#aaa",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Resumen del pedido
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#2C1654", lineHeight: 1 }}>
              {totalPzas}
            </div>
            <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700, textTransform: "uppercase" }}>
              prendas
            </div>
          </div>
          {totalMonto != null && (
            <div style={{ textAlign: "center", borderLeft: "1px solid #fde0b8", paddingLeft: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#27AE60", lineHeight: 1 }}>
                ${totalMonto.toFixed(2)}
              </div>
              <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700, textTransform: "uppercase" }}>
                total tallas
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {lista.map(it => {
          const tieneP =
            it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0;
          const sub = tieneP ? parseFloat(it.precio) * it.qty : null;
          return (
            <div
              key={it.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "#fff",
                border: "1.5px solid #fde0b8",
                borderRadius: 10,
                padding: "8px 10px",
                minWidth: 64,
                maxWidth: 90,
                textAlign: "center",
                gap: 3,
              }}
            >
              {it.tipo && (
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#9B59B6",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    lineHeight: 1,
                    marginBottom: 1,
                    maxWidth: 80,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={it.tipo}
                >
                  {it.tipo}
                </div>
              )}
              <div
                style={{
                  background: "#E67E22",
                  color: "#fff",
                  borderRadius: 7,
                  padding: "3px 8px",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: 0.5,
                }}
              >
                {it.talla}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#2C1654", marginTop: 2 }}>
                {it.qty} {it.qty === 1 ? "prenda" : "prendas"}
              </div>
              {tieneP && (
                <div style={{ fontSize: 10, color: "#27AE60", fontWeight: 700 }}>
                  ${parseFloat(it.precio).toFixed(2)} c/u
                </div>
              )}
              {sub != null && (
                <div
                  style={{
                    fontSize: 10,
                    color: "#27AE60",
                    fontWeight: 800,
                    background: "#f0fff4",
                    borderRadius: 5,
                    padding: "1px 6px",
                  }}
                >
                  = ${sub.toFixed(2)}
                </div>
              )}
              {it.spec && (
                <div
                  style={{
                    fontSize: 9,
                    color: "#888",
                    marginTop: 1,
                    lineHeight: 1.3,
                    maxWidth: 80,
                    overflowWrap: "break-word",
                  }}
                >
                  {it.spec}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SelectorTallas ───────────────────────────────────────

export function SelectorTallas({ items, onChange, esAdmin, tipoPrendaDefault = "" }) {
  const [grupo, setGrupo] = useState("adulto");
  const [talla, setTalla] = useState("");
  const [qty, setQty] = useState("");
  const [spec, setSpec] = useState("");
  const [precio, setPrecio] = useState("");

  const tGrupo = GRUPOS_TALLAS[grupo].tallas;
  const lista = ordenarTallas(items);
  // Se puede agregar si hay cantidad >= 1. La talla es OPCIONAL — para
  // items como "Cortina bordada" o "Mantel" no aplica seleccionarla.
  const puedeAgregar = qty !== "" && parseInt(qty) >= 1;

  const agregar = () => {
    if (!puedeAgregar) return;
    onChange([
      ...lista,
      {
        id: Date.now(),
        grupo,
        // Cada talla guarda el tipo de prenda actual del form. Si el user
        // cambia el tipo de prenda y agrega otra talla, la nueva queda con
        // el tipo nuevo y la anterior conserva el suyo. Así un pedido
        // puede mezclar tipos (3 Camisas M + 2 Pantalones 32 + 1 Cortina).
        tipo: tipoPrendaDefault,
        talla,
        qty: parseInt(qty) || 1,
        spec: spec.trim(),
        precio: (() => {
          if (precio === "") return null;
          const n = parseFloat(precio);
          return Number.isFinite(n) ? n : null;
        })(),
      },
    ]);
    setSpec("");
    setQty("");
    setPrecio("");
  };
  const quitar = id => onChange(lista.filter(it => it.id !== id));
  const editField = (id, key, val) =>
    onChange(lista.map(it => (it.id === id ? { ...it, [key]: val } : it)));

  const totalPzas = lista.reduce((s, it) => s + it.qty, 0);
  const tienePrecios = lista.some(it => it.precio != null && it.precio !== "");
  const totalMonto = tienePrecios
    ? lista.reduce(
        (s, it) =>
          s + (it.precio != null && it.precio !== "" ? parseFloat(it.precio) * it.qty : 0),
        0
      )
    : null;

  return (
    <div style={{ border: "1.5px solid #fde0b8", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #fde0b8", background: "#fafafa" }}>
        {Object.entries(GRUPOS_TALLAS).map(([g, { label }]) => (
          <button
            key={g}
            onClick={() => {
              setGrupo(g);
              setTalla("");
            }}
            style={{
              flex: 1,
              padding: "8px 4px",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              background: grupo === g ? "#FFF3E0" : "transparent",
              color: grupo === g ? "#E67E22" : "#bbb",
              borderRight: g !== "sintalla" ? "1px solid #fde0b8" : "none",
              transition: "all .15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 14px" }}>
        {grupo === "sintalla" && (
          <div
            style={{
              fontSize: 11,
              color: "#888",
              background: "#FFFBF6",
              border: "1px dashed #fde0b8",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 12,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: "#E67E22" }}>Producto sin talla</strong> — ideal para cortinas,
            manteles, banners bordados, etc. Solo necesita cantidad y precio.
          </div>
        )}
        <div
          style={{
            display: grupo === "sintalla" ? "none" : "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {tGrupo.map(t => {
            const usada = lista.filter(it => it.talla === t).reduce((s, it) => s + (parseInt(it.qty) || 1), 0);
            const sel = talla === t;
            return (
              <button
                key={t}
                onClick={() => setTalla(sel ? "" : t)}
                style={{
                  minWidth: 36,
                  padding: "5px 8px",
                  borderRadius: 7,
                  border: "1.5px solid " + (sel ? "#E67E22" : usada > 0 ? "#fcd3a0" : "#e0e0e0"),
                  background: sel ? "#E67E22" : usada > 0 ? "#FFF3E0" : "#fff",
                  color: sel ? "#fff" : usada > 0 ? "#E67E22" : "#aaa",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 800,
                  position: "relative",
                  transition: "all .12s",
                }}
              >
                {t}
                {usada > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      background: sel ? "#fff" : "#E67E22",
                      color: sel ? "#E67E22" : "#fff",
                      borderRadius: "50%",
                      width: 14,
                      height: 14,
                      fontSize: 8,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {usada}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: "#FFFBF6",
            border: "1px solid #fde0b8",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "58px 72px 1fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#E67E22",
                  marginBottom: 3,
                  textTransform: "uppercase",
                }}
              >
                Cant.
              </div>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="999"
                value={qty}
                onChange={e =>
                  setQty(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{
                  width: "100%",
                  padding: "7px 4px",
                  textAlign: "center",
                  borderRadius: 6,
                  border: "1.5px solid #E67E22",
                  fontSize: 14,
                  fontWeight: 800,
                  outline: "none",
                  color: "#2C1654",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#27AE60",
                  marginBottom: 3,
                  textTransform: "uppercase",
                }}
              >
                Precio c/u ($)
              </div>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "7px 6px",
                  textAlign: "center",
                  borderRadius: 6,
                  border: "1.5px solid #a8d8a8",
                  fontSize: 13,
                  fontWeight: 700,
                  outline: "none",
                  color: "#27AE60",
                  background: "#fff",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#888",
                  marginBottom: 3,
                  textTransform: "uppercase",
                }}
              >
                Especificación / comentario
              </div>
              <input
                value={spec}
                onChange={e => setSpec(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregar()}
                placeholder="Ej: manga larga, azul marino, bordado…"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1.5px solid #e0e0e0",
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                  color: "#444",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "#27AE60", fontWeight: 700, minHeight: 16 }}>
              {precio !== "" && parseFloat(precio) > 0
                ? `Subtotal: $${(parseFloat(precio) * (qty || 1)).toFixed(2)} (${qty || 1}×$${parseFloat(precio).toFixed(2)})`
                : ""}
            </div>
            <button
              onClick={agregar}
              disabled={!puedeAgregar}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                flexShrink: 0,
                background: puedeAgregar ? "#E67E22" : "#e0e0e0",
                color: puedeAgregar ? "#fff" : "#bbb",
                fontWeight: 800,
                fontSize: 13,
                cursor: puedeAgregar ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              + Agregar{talla ? ` ${talla}` : grupo === "sintalla" ? "" : " (sin talla)"}
            </button>
          </div>
        </div>

        {lista.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "42px 48px 60px 1fr 28px",
                gap: 6,
                padding: "0 10px",
                marginBottom: 4,
              }}
            >
              {["Talla", "Cant.", "Precio", "Especificación", ""].map((h, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#bbb",
                    textTransform: "uppercase",
                    textAlign: i <= 2 ? "center" : "left",
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {lista.map(it => {
                const sub =
                  it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0
                    ? parseFloat(it.precio) * it.qty
                    : null;
                return (
                  <div
                    key={it.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "42px 48px 60px 1fr 28px",
                      gap: 6,
                      alignItems: "center",
                      background: "#fff",
                      border: "1px solid #fde0b8",
                      borderRadius: 8,
                      padding: "6px 10px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {it.tipo && (
                        <div
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            color: "#9B59B6",
                            textAlign: "center",
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                            lineHeight: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={it.tipo}
                        >
                          {it.tipo}
                        </div>
                      )}
                      <div
                        style={{
                          background: it.talla ? "#E67E22" : "#bbb",
                          color: "#fff",
                          borderRadius: 6,
                          padding: "3px 0",
                          fontSize: it.talla ? 13 : 10,
                          fontWeight: 800,
                          textAlign: "center",
                          letterSpacing: it.talla ? 0 : 0.3,
                        }}
                        title={it.talla ? `Talla ${it.talla}` : "Sin talla"}
                      >
                        {it.talla || "S/T"}
                      </div>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="999"
                      value={it.qty}
                      onChange={e =>
                        editField(it.id, "qty", Math.max(1, parseInt(e.target.value) || 1))
                      }
                      style={{
                        width: "100%",
                        padding: "4px 2px",
                        textAlign: "center",
                        borderRadius: 6,
                        border: "1px solid #e0e0e0",
                        fontSize: 13,
                        fontWeight: 800,
                        outline: "none",
                        color: "#2C1654",
                      }}
                    />
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 7,
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
                        value={it.precio != null ? it.precio : ""}
                        onChange={e => {
                          const v = e.target.value.trim();
                          if (v === "") {
                            editField(it.id, "precio", null);
                            return;
                          }
                          const n = parseFloat(v);
                          editField(it.id, "precio", Number.isFinite(n) ? n : null);
                        }}
                        placeholder="—"
                        style={{
                          width: "100%",
                          padding: "4px 4px 4px 16px",
                          textAlign: "left",
                          borderRadius: 6,
                          border:
                            "1px solid " +
                            (it.precio != null && it.precio !== "" ? "#a8d8a8" : "#e0e0e0"),
                          fontSize: 12,
                          fontWeight: 700,
                          outline: "none",
                          color: "#27AE60",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <input
                        value={it.spec || ""}
                        onChange={e => editField(it.id, "spec", e.target.value)}
                        placeholder="Sin especificación"
                        style={{
                          width: "100%",
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid #e0e0e0",
                          fontSize: 12,
                          outline: "none",
                          color: "#555",
                          background: "#fafafa",
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 9, color: "#bbb", whiteSpace: "nowrap", flexShrink: 0 }}>
                          &lt;12 pzas:
                        </span>
                        <div style={{ position: "relative", flex: 1 }}>
                          <span style={{
                            position: "absolute", left: 5, top: "50%",
                            transform: "translateY(-50%)", fontSize: 10,
                            color: "#bbb", pointerEvents: "none",
                          }}>$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={it.precioUnitario != null ? it.precioUnitario : ""}
                            onChange={e => {
                              const v = e.target.value.trim();
                              if (v === "") { editField(it.id, "precioUnitario", null); return; }
                              const n = parseFloat(v);
                              editField(it.id, "precioUnitario", Number.isFinite(n) ? n : null);
                            }}
                            placeholder="—"
                            title="Precio por pieza suelta (menos de 12 unidades)"
                            style={{
                              width: "100%", padding: "2px 4px 2px 14px",
                              borderRadius: 4, border: "1px solid " + (it.precioUnitario ? "#f0c060" : "#e8e8e8"),
                              fontSize: 11, outline: "none",
                              color: it.precioUnitario ? "#B7770D" : "#bbb",
                              background: it.precioUnitario ? "#FFFBF0" : "#fafafa",
                            }}
                          />
                        </div>
                      </div>
                      {sub != null && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#27AE60",
                            fontWeight: 700,
                            paddingLeft: 4,
                          }}
                        >
                          = ${sub.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => quitar(it.id)}
                      title="Eliminar"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 18,
                        color: "#ddd",
                        padding: 0,
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <ResumenTallas lista={lista} totalPzas={totalPzas} totalMonto={totalMonto} />
          </div>
        )}

        {lista.length === 0 && (
          <div
            style={{
              marginTop: 10,
              textAlign: "center",
              color: "#ccc",
              fontSize: 12,
              padding: "10px 0",
            }}
          >
            Selecciona una talla y presiona{" "}
            <strong style={{ color: "#E67E22" }}>+ Agregar</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TallasChips ──────────────────────────────────────────

export function TallasChips({ items, compact = false }) {
  if (!items || !items.length) return null;
  const ordenados = ordenarTallas(items);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 4 : 6 }}>
      {ordenados.map(it => {
        const tieneP = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0;
        const sub = tieneP ? parseFloat(it.precio) * it.qty : null;
        return (
          <div
            key={it.id}
            style={{
              display: "inline-flex",
              alignItems: "stretch",
              border: "1.5px solid #fde0b8",
              borderRadius: 8,
              overflow: "hidden",
              background: "#fff",
              fontSize: compact ? 10 : 11,
            }}
          >
            <div
              style={{
                background: "#E67E22",
                color: "#fff",
                padding: compact ? "3px 7px" : "4px 9px",
                fontWeight: 900,
                fontSize: compact ? 12 : 13,
                display: "flex",
                alignItems: "center",
              }}
            >
              {it.talla}
            </div>
            <div
              style={{
                padding: compact ? "3px 7px" : "4px 8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 1,
              }}
            >
              {it.tipo && (
                <div
                  style={{
                    fontWeight: 800,
                    color: "#9B59B6",
                    fontSize: compact ? 9 : 10,
                    lineHeight: 1,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  {it.tipo}
                </div>
              )}
              <div
                style={{
                  fontWeight: 800,
                  color: "#2C1654",
                  fontSize: compact ? 10 : 11,
                  lineHeight: 1,
                }}
              >
                {it.qty} {it.qty === 1 ? "pda" : "pdas"}
                {tieneP && (
                  <span style={{ color: "#27AE60", fontWeight: 700, marginLeft: 4 }}>
                    ${parseFloat(it.precio).toFixed(2)} c/u
                  </span>
                )}
              </div>
              {sub != null && (
                <div style={{ fontSize: 9, color: "#27AE60", fontWeight: 800 }}>
                  = ${sub.toFixed(2)}
                </div>
              )}
              {it.spec && (
                <div style={{ fontSize: 9, color: "#888", lineHeight: 1.2 }}>{it.spec}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
