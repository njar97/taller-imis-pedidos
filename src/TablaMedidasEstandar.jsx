// Tabla maestra de medidas — qué mide la PRENDA TERMINADA en cada talla,
// más los moldes de esa talla.
//
// Ojo con la diferencia, que es la que se prestaba a confusión en el taller:
//   · taller_medidas_estandar → la prenda (camisa 16 = 105 de pecho)
//   · taller_moldes           → la pieza de papel (trasera 16 = 40.4 × 104.2 cm)
//
// Las medidas marcadas "en_disputa" vienen de dos fuentes que se contradicen;
// se muestran con aviso en vez de esconderlas, para que nadie corte con ellas
// sin saberlo.

import { dbMedidasEstandarLeer, dbMedidasDiccLeer, dbMoldesLeer } from "./lib/db.js";
import { Modal } from "./lib/Modal.jsx";
import { useEffect, useMemo, useState } from "react";

let cache = null; // el catálogo cambia poco: una lectura por sesión

const PRENDAS = [
  { id: "camisa",   label: "Camisa",   icon: "👔" },
  { id: "blusa",    label: "Blusa",    icon: "👚" },
  { id: "pantalon", label: "Pantalón", icon: "👖" },
  { id: "falda",    label: "Falda",    icon: "🩳" },
  { id: "filipina", label: "Filipina", icon: "🥼" },
  { id: "polo",     label: "Polo",     icon: "🎽" },
  { id: "camiseta", label: "Camiseta", icon: "👕" },
];

const COL = {
  verificado: { bg: "#E8F3EC", fg: "#2E6B45" },
  en_disputa: { bg: "#FDECE7", fg: "#A8321D" },
  derivado:   { bg: "#FBF2DC", fg: "#8A6410" },
};

const ordTalla = t => {
  const n = parseFloat(t);
  if (!isNaN(n)) return n;
  return 100 + ["XS", "S", "M", "L", "XL", "XXL", "XXXL"].indexOf(t);
};

export default function TablaMedidasEstandar({ onClose }) {
  const [datos, setDatos] = useState(cache);
  const [prenda, setPrenda] = useState("camisa");
  const [talla, setTalla] = useState(null);

  useEffect(() => {
    if (cache) return;
    Promise.all([dbMedidasEstandarLeer(), dbMedidasDiccLeer(), dbMoldesLeer()])
      .then(([medidas, dicc, moldes]) => {
        cache = { medidas, dicc, moldes };
        setDatos(cache);
      });
  }, []);

  const dicc = useMemo(() => {
    const m = {};
    for (const d of datos?.dicc || []) m[d.clave] = d;
    return m;
  }, [datos]);

  const tallas = useMemo(() => {
    const s = new Set((datos?.medidas || []).filter(m => m.prenda === prenda).map(m => m.talla));
    for (const x of datos?.moldes || []) if (x.prenda === prenda) s.add(x.talla);
    return [...s].sort((a, b) => ordTalla(a) - ordTalla(b));
  }, [datos, prenda]);

  // Al cambiar de prenda, cae en la primera talla que TENGA medidas: arrancar en
  // una talla que sólo tiene molde da la impresión de que no hay nada cargado.
  useEffect(() => {
    if (!tallas.length) { setTalla(null); return; }
    if (tallas.includes(talla)) return;
    const conMedidas = new Set(
      (datos?.medidas || []).filter(m => m.prenda === prenda).map(m => m.talla)
    );
    setTalla(tallas.find(t => conMedidas.has(t)) || tallas[0]);
  }, [tallas, talla, datos, prenda]);

  const medidas = useMemo(() => {
    return (datos?.medidas || [])
      .filter(m => m.prenda === prenda && m.talla === talla)
      .sort((a, b) => (dicc[a.medida]?.orden ?? 999) - (dicc[b.medida]?.orden ?? 999));
  }, [datos, prenda, talla, dicc]);

  const moldes = useMemo(() => {
    return (datos?.moldes || [])
      .filter(m => m.prenda === prenda && m.talla === talla)
      .sort((a, b) => a.pieza.localeCompare(b.pieza));
  }, [datos, prenda, talla]);

  const contenido = (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* prendas */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, flexShrink: 0 }}>
        {PRENDAS.map(p => {
          const act = prenda === p.id;
          // cuenta tallas con medidas O con moldes: el pantalón todavía no tiene
          // medidas pero sí 109 moldes, y en gris parecía vacío
          const s = new Set((datos?.medidas || []).filter(m => m.prenda === p.id).map(m => m.talla));
          for (const x of datos?.moldes || []) if (x.prenda === p.id) s.add(x.talla);
          const n = s.size;
          return (
            <button
              key={p.id}
              onClick={() => setPrenda(p.id)}
              style={{
                padding: "6px 11px", borderRadius: 20, whiteSpace: "nowrap", cursor: "pointer",
                border: act ? "1.5px solid #B85C00" : "1.5px solid #e0e0e0",
                background: act ? "#B85C00" : "#fff",
                color: act ? "#fff" : n ? "#777" : "#bbb",
                fontWeight: act ? 700 : 500, fontSize: 11.5, fontFamily: "inherit",
              }}
            >
              {p.icon} {p.label} <span style={{ opacity: 0.7 }}>{n || "—"}</span>
            </button>
          );
        })}
      </div>

      {/* tallas */}
      {tallas.length > 0 && (
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 8, flexShrink: 0 }}>
          {tallas.map(t => {
            const act = talla === t;
            return (
              <button
                key={t}
                onClick={() => setTalla(t)}
                style={{
                  minWidth: 40, padding: "5px 9px", borderRadius: 8, cursor: "pointer",
                  border: act ? "1.5px solid #1A5276" : "1.5px solid #e8e8e8",
                  background: act ? "#1A5276" : "#fff",
                  color: act ? "#fff" : "#666",
                  fontWeight: 700, fontSize: 12, fontFamily: "inherit",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      <div className="main-area" style={{ flex: 1, overflow: "auto" }}>
        {!datos ? (
          <div style={{ display: "grid", gap: 8 }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 34, borderRadius: 8 }} />)}
          </div>
        ) : !tallas.length ? (
          <div style={{ textAlign: "center", padding: 44, color: "#bbb" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>📐</div>
            <div style={{ fontSize: 13.5, color: "#999", maxWidth: 260, margin: "0 auto", lineHeight: 1.5 }}>
              Todavía no hay medidas de <b>{PRENDAS.find(p => p.id === prenda)?.label.toLowerCase()}</b>.
              Se llenan midiendo tres tallas y el resto se completa solo.
            </div>
          </div>
        ) : (
          <>
            <Bloque titulo="Medidas de la prenda terminada" sufijo="cm">
              {medidas.length === 0 ? (
                <Vacio texto="Sin medidas cargadas para esta talla." />
              ) : (
                medidas.map(m => (
                  <Fila
                    key={m.id}
                    nombre={dicc[m.medida]?.etiqueta || m.medida}
                    valor={`${(+m.valorCm).toFixed(1).replace(/\.0$/, "")} cm`}
                    estado={m.confianza}
                    nota={m.nota}
                  />
                ))
              )}
            </Bloque>

            <Bloque titulo="Moldes de esta talla" sufijo={`${moldes.length}`}>
              {moldes.length === 0 ? (
                <Vacio texto="No hay moldes digitalizados para esta talla." />
              ) : (
                moldes.map(m => (
                  <Fila
                    key={m.id}
                    nombre={m.pieza}
                    valor={m.anchoCm ? `${m.anchoCm} × ${m.altoCm} cm` : "—"}
                    estado={m.origen === "interpolado" ? "derivado" : null}
                    nota={m.origen === "interpolado"
                      ? `Generado por interpolación ${m.generadoDesde} · sin probar en tela`
                      : null}
                  />
                ))
              )}
            </Bloque>
          </>
        )}
      </div>
    </div>
  );

  if (!onClose) return contenido;
  return (
    <Modal onClose={onClose} title="📐 Medidas por talla">
      <div style={{ height: "72vh", display: "flex", flexDirection: "column" }}>{contenido}</div>
    </Modal>
  );
}

function Bloque({ titulo, sufijo, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        fontSize: 10.5, fontWeight: 800, color: "#999", letterSpacing: 0.5,
        textTransform: "uppercase", marginBottom: 6,
      }}>
        <span>{titulo}</span><span style={{ fontWeight: 600 }}>{sufijo}</span>
      </div>
      <div style={{ background: "#fff", border: "1.5px solid #eee", borderRadius: 10, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function Fila({ nombre, valor, estado, nota }) {
  const c = estado ? COL[estado] : null;
  return (
    <div style={{ padding: "9px 12px", borderBottom: "1px solid #f4f4f4" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12.5, color: "#444", textTransform: "capitalize" }}>{nombre}</span>
        <span style={{
          fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums",
          color: c ? c.fg : "#1A5276", whiteSpace: "nowrap",
        }}>
          {valor}
          {estado === "en_disputa" && " ⚠"}
        </span>
      </div>
      {nota && (
        <div style={{
          fontSize: 10.5, lineHeight: 1.45, marginTop: 4, padding: "4px 7px", borderRadius: 6,
          background: c ? c.bg : "#f7f7f7", color: c ? c.fg : "#888",
        }}>
          {nota}
        </div>
      )}
    </div>
  );
}

function Vacio({ texto }) {
  return <div style={{ padding: "14px 12px", fontSize: 12, color: "#bbb", textAlign: "center" }}>{texto}</div>;
}
