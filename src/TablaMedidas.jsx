// Captura de personas en cuadrícula tipo Excel — pensada para quien viene
// de los libros de medidas del taller: mismas columnas (ITEM · NOMBRE ·
// GRADO · TALLA · medidas · ABONO), Enter baja a la siguiente fila, Tab
// avanza de columna, y la última fila crea una nueva al escribir.
//
// Edita el MISMO shape de personas[] que ListaPrendas (medidas anidadas
// pantalon/chaqueta/quepi + talla/cargo top-level), así que se puede
// alternar entre vista tarjetas y vista tabla sin perder nada.

import { useState } from "react";
import { pushConfirm } from "./lib/feedback.js";

export const SECCIONES = [
  {
    id: "chaqueta",
    label: "👕 Camisa / Blusa",
    color: "#6C3483",
    cols: [
      ["hombro", "HOMBRO"], ["pecho", "PECHO/BUSTO"], ["cintura", "CINTURA"],
      ["cadera", "CADERA"], ["largo", "LARGO"], ["cuello", "CUELLO"],
      ["sisa", "SISA"], ["manga", "L. MANGA"], ["puno", "PUÑO"],
      ["talle", "TALLE"], ["costado", "COSTADO"], ["sep", "SEPARACIÓN"],
      ["altcodo", "ALTO CODO"], ["ctcodo", "CT. CODO"],
    ],
  },
  {
    id: "pantalon",
    label: "👖 Pantalón / Falda",
    color: "#7D6608",
    cols: [
      ["cintura", "CINTURA"], ["base", "BASE"], ["largo", "LARGO"],
      ["ruedo", "VUELO/RUEDO"], ["muslo", "MUSLO"], ["rodilla", "RODILLA"],
      ["tiroD", "TIRO DEL."], ["tiroT", "TIRO TRAS."],
    ],
  },
  {
    id: "quepi",
    label: "🎓 Quepis",
    color: "#1A5276",
    cols: [["contornoCabeza", "CONTORNO CABEZA"]],
  },
];

const TH = {
  padding: "7px 8px",
  fontSize: 9.5,
  fontWeight: 800,
  color: "#fff",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  textAlign: "center",
  borderRight: "1px solid rgba(255,255,255,0.25)",
};
const TD = { padding: 0, borderRight: "1px solid #e4e0ee", borderBottom: "1px solid #e4e0ee" };
const CELDA = {
  width: "100%",
  minWidth: 52,
  border: "none",
  outline: "none",
  padding: "8px 8px",
  fontSize: 13,
  textAlign: "center",
  background: "transparent",
  fontFamily: "inherit",
};

export default function TablaMedidas({ personas, onChange }) {
  const [sec, setSec] = useState(SECCIONES[0]);
  const lista = personas || [];

  const upd = (i, cambio) => {
    const nuevo = lista.map((p, j) => (j === i ? { ...p, ...cambio } : p));
    onChange(nuevo);
  };
  const updMedida = (i, clave, v) => {
    const p = lista[i];
    const meds = { ...(p.medidas || {}) };
    meds[sec.id] = { ...(meds[sec.id] || {}) };
    if (v === "") delete meds[sec.id][clave];
    else meds[sec.id][clave] = v;
    upd(i, { medidas: meds });
  };
  const updTalla = (i, v) => {
    const p = lista[i];
    const prendas = (p.prendas || []).length
      ? p.prendas.map((pr, k) => (k === 0 ? { ...pr, talla: v } : pr))
      : p.prendas;
    upd(i, { talla: v, prendas });
  };
  const agregarFila = () =>
    onChange([...lista, { nombre: "", talla: "", prendas: [], medidas: {} }]);
  const quitarFila = async i => {
    const ok = await pushConfirm({
      titulo: "Quitar fila",
      msg: `¿Quitar a "${lista[i].nombre || "esta fila"}" de la lista?`,
      okLabel: "Sí, quitar",
    });
    if (ok) onChange(lista.filter((_, j) => j !== i));
  };

  // Enter = misma columna, fila de abajo (creándola si es la última).
  const alTeclear = (e, fila) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const celda = e.target;
    if (fila === lista.length - 1) agregarFila();
    setTimeout(() => {
      const tabla = celda.closest("table");
      const col = celda.dataset.col;
      const destino = tabla?.querySelector(`[data-fila="${fila + 1}"][data-col="${col}"]`);
      destino?.focus();
      destino?.select?.();
    }, 30);
  };

  // Orden visual de columnas de la sección activa — para mapear un pegado
  // multi-celda de Excel (tab = columna, salto de línea = fila).
  const ordenCols = ["nombre", "grado", "talla", ...sec.cols.map(([k]) => k), "abono"];

  // Aplica un valor a la columna correspondiente de una persona (copia).
  const aplicarValor = (p, key, v) => {
    if (key === "nombre") return { ...p, nombre: v };
    if (key === "grado") return { ...p, cargo: v };
    if (key === "talla") {
      const prendas = (p.prendas || []).length
        ? p.prendas.map((pr, k) => (k === 0 ? { ...pr, talla: v } : pr))
        : p.prendas;
      return { ...p, talla: v, prendas };
    }
    const meds = { ...(p.medidas || {}) };
    if (key === "abono") {
      if (v === "") delete meds.abono; else meds.abono = v;
      return { ...p, medidas: meds };
    }
    meds[sec.id] = { ...(meds[sec.id] || {}) };
    if (v === "") delete meds[sec.id][key];
    else meds[sec.id][key] = v;
    return { ...p, medidas: meds };
  };

  // Pegar un rango copiado de Excel: llena desde la celda actual hacia la
  // derecha y hacia abajo, creando filas si el rango es más largo.
  const alPegar = (e, fila, col) => {
    const texto = e.clipboardData?.getData("text") ?? "";
    // Un solo valor sin tabs ni saltos → pegado normal del input.
    if (!texto.includes("\t") && !/\r?\n/.test(texto.trim())) return;
    e.preventDefault();
    const filasTxt = texto.replace(/\r/g, "").split("\n");
    while (filasTxt.length && filasTxt[filasTxt.length - 1] === "") filasTxt.pop();
    const c0 = ordenCols.indexOf(col);
    if (c0 < 0) return;
    let nuevo = [...lista];
    filasTxt.forEach((linea, df) => {
      const idx = fila + df;
      while (nuevo.length <= idx) nuevo.push({ nombre: "", talla: "", prendas: [], medidas: {} });
      let p = nuevo[idx];
      linea.split("\t").forEach((v, dc) => {
        const key = ordenCols[c0 + dc];
        if (key) p = aplicarValor(p, key, v.trim());
      });
      nuevo[idx] = p;
    });
    onChange(nuevo);
  };

  const inputCelda = (fila, col, valor, alCambiar, extra = {}) => (
    <input
      data-fila={fila}
      data-col={col}
      value={valor == null ? "" : valor}
      onChange={e => alCambiar(e.target.value)}
      onKeyDown={e => alTeclear(e, fila)}
      onPaste={e => alPegar(e, fila, col)}
      style={{ ...CELDA, ...(extra.style || {}) }}
      placeholder={extra.placeholder || ""}
      inputMode={extra.num ? "decimal" : undefined}
    />
  );

  return (
    <div>
      {/* Pestañas de sección (qué medidas se están capturando) */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {SECCIONES.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSec(s)}
            style={{
              border: "1.5px solid " + (sec.id === s.id ? s.color : "#ddd"),
              background: sec.id === s.id ? s.color : "#fff",
              color: sec.id === s.id ? "#fff" : "#666",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#999", alignSelf: "center" }}>
          Enter ⏎ baja · Tab → avanza · pegá un rango desde Excel 📋
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1.5px solid #d8d2e8", borderRadius: 10 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 700 }}>
          <thead>
            <tr style={{ background: sec.color }}>
              <th style={{ ...TH, width: 34 }}>#</th>
              <th style={{ ...TH, textAlign: "left", minWidth: 150 }}>NOMBRE</th>
              <th style={{ ...TH, width: 60 }}>GRADO</th>
              <th style={{ ...TH, width: 58 }}>TALLA</th>
              {sec.cols.map(([k, l]) => (
                <th key={k} style={TH}>{l}</th>
              ))}
              <th style={{ ...TH, width: 64 }}>ABONO</th>
              <th style={{ ...TH, width: 34, borderRight: "none" }} />
            </tr>
          </thead>
          <tbody>
            {lista.map((p, i) => (
              <tr key={i} style={{ background: i % 2 ? "#faf9fd" : "#fff" }}>
                <td style={{ ...TD, textAlign: "center", fontSize: 11, color: "#aaa", padding: "8px 4px" }}>{i + 1}</td>
                <td style={TD}>
                  {inputCelda(i, "nombre", p.nombre, v => upd(i, { nombre: v }), {
                    style: { textAlign: "left", fontWeight: 700, minWidth: 150 },
                    placeholder: "Nombre…",
                  })}
                </td>
                <td style={TD}>{inputCelda(i, "grado", p.cargo, v => upd(i, { cargo: v }))}</td>
                <td style={TD}>{inputCelda(i, "talla", p.talla, v => updTalla(i, v))}</td>
                {sec.cols.map(([k]) => (
                  <td key={k} style={TD}>
                    {inputCelda(i, k, (p.medidas || {})[sec.id]?.[k], v => updMedida(i, k, v), { num: true })}
                  </td>
                ))}
                <td style={TD}>
                  {inputCelda(i, "abono", (p.medidas || {}).abono, v => {
                    const meds = { ...(p.medidas || {}) };
                    if (v === "") delete meds.abono; else meds.abono = v;
                    upd(i, { medidas: meds });
                  }, { num: true })}
                </td>
                <td style={{ ...TD, borderRight: "none", textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => quitarFila(i)}
                    title="Quitar fila"
                    style={{ border: "none", background: "none", color: "#c66", cursor: "pointer", fontSize: 13, padding: 6 }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {!lista.length && (
              <tr>
                <td colSpan={sec.cols.length + 6} style={{ padding: 16, textAlign: "center", color: "#999", fontSize: 13 }}>
                  Sin personas todavía — agregá la primera fila 👇
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={agregarFila}
        style={{
          marginTop: 8,
          border: "1.5px dashed #b8a6d9",
          background: "#faf7ff",
          color: "#6C3483",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          width: "100%",
        }}
      >
        ＋ Agregar fila
      </button>
    </div>
  );
}
