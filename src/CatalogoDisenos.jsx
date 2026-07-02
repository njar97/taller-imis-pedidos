// Catálogo de diseños de bordado — grilla visual con buscador y filtro
// por categoría. Los diseños viven en taller_disenos (Supabase) con
// previews PNG y archivos DST/EMB/DGT en Storage.
//
// Dos modos:
//  - Vista completa (dentro de SeccionBordados, botón "📚 Catálogo")
//  - Picker (modal desde BordadoModal, prop onPick) — al elegir un diseño
//    autollena puntadas/colores/mm y enlaza los archivos.

import { dbDisenosLeer } from "./lib/db.js";
import { Modal } from "./lib/Modal.jsx";
import { useEffect, useMemo, useState } from "react";

let cacheDisenos = null; // cache en memoria por sesión — el catálogo cambia poco

export function limpiarNombreDiseno(nombre) {
  // "AGUILA_CORBATA-SALOMON_9959pt_59x76mm" → "Corbata Salomon"
  let s = nombre.replace(/^(AGUILA|ESCARAPELA|ESCUDO|LETRAS|LOGO|DISEÑO)_/i, "");
  s = s.replace(/_\d+pt.*$/i, "").replace(/_v\d+$/i, "");
  s = s.replace(/[-_]+/g, " ").trim().toLowerCase();
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export default function CatalogoDisenos({ onPick, onClose }) {
  const [disenos, setDisenos] = useState(cacheDisenos || []);
  const [cargando, setCargando] = useState(!cacheDisenos);
  const [busq, setBusq] = useState("");
  const [cat, setCat] = useState("Todos");
  const [zoom, setZoom] = useState(null); // diseño en vista ampliada

  useEffect(() => {
    if (cacheDisenos) return;
    dbDisenosLeer().then(rows => {
      cacheDisenos = rows;
      setDisenos(rows);
      setCargando(false);
    });
  }, []);

  const categorias = useMemo(() => {
    const set = new Set(disenos.map(d => d.categoria).filter(Boolean));
    return ["Todos", ...[...set].sort()];
  }, [disenos]);

  const lista = useMemo(() => {
    const q = busq.toLowerCase();
    return disenos
      .filter(d => cat === "Todos" || d.categoria === cat)
      .filter(d => !q || d.nombre.toLowerCase().includes(q))
      .sort((a, b) => {
        // Con preview primero, luego alfabético
        if (!!a.previewUrl !== !!b.previewUrl) return a.previewUrl ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [disenos, busq, cat]);

  const esPicker = typeof onPick === "function";

  const contenido = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Buscador + chips de categoría ── */}
      <div style={{ padding: esPicker ? "0 0 10px" : "12px 16px", background: "#fff", flexShrink: 0 }}>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar diseño... (águila, escudo, letras...)"
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }}
        />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {categorias.map(c => {
            const act = cat === c;
            const cnt = c === "Todos" ? disenos.length : disenos.filter(d => d.categoria === c).length;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "5px 10px", borderRadius: 20, whiteSpace: "nowrap", cursor: "pointer",
                  border: act ? "1.5px solid #1A5F5A" : "1.5px solid #e0e0e0",
                  background: act ? "#1A5F5A" : "#fff",
                  color: act ? "#fff" : "#777",
                  fontWeight: act ? 700 : 500, fontSize: 11, fontFamily: "inherit",
                }}
              >
                {c} <span style={{ opacity: 0.7 }}>{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grilla ── */}
      <div style={{ flex: 1, overflow: "auto", padding: esPicker ? "4px 0" : 12 }}>
        {cargando ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ borderRadius: 12, height: 190 }} />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: 50, color: "#ccc" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🧵</div>
            <div style={{ fontSize: 14, color: "#aaa" }}>
              {disenos.length === 0 ? "El catálogo está vacío" : "Sin resultados para esa búsqueda"}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {lista.map(d => (
              <CardDiseno
                key={d.id}
                d={d}
                esPicker={esPicker}
                onPick={onPick}
                onZoom={() => setZoom(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Vista ampliada ── */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20, cursor: "zoom-out" }}
        >
          {zoom.previewUrl && (
            <img src={zoom.previewUrl} alt={zoom.nombre} style={{ maxWidth: "90vw", maxHeight: "65vh", background: "#fff", borderRadius: 12 }} />
          )}
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", marginTop: 12, maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontWeight: 800, color: "#1A5F5A", fontSize: 14 }}>{limpiarNombreDiseno(zoom.nombre)}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {zoom.puntadas ? zoom.puntadas.toLocaleString() + " puntadas" : "Sin datos de puntadas"}
              {zoom.anchoMm ? ` · ${zoom.anchoMm}×${zoom.altoMm} mm` : ""}
              {zoom.colores ? ` · ${zoom.colores} color(es)` : ""}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
              {zoom.archivoUrl && <BotonDescarga url={zoom.archivoUrl} label={"⬇️ ." + (zoom.formato || "DST").toLowerCase()} />}
              {zoom.archivoEmbUrl && <BotonDescarga url={zoom.archivoEmbUrl} label="⬇️ .emb" />}
              {zoom.archivoDgtUrl && <BotonDescarga url={zoom.archivoDgtUrl} label="⬇️ .dgt" />}
              {esPicker && (
                <button
                  onClick={() => { onPick(zoom); setZoom(null); }}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "#1A5F5A", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}
                >
                  Usar este →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!esPicker) return contenido;

  return (
    <Modal onClose={onClose} title="📚 Elegir diseño del catálogo">
      <div style={{ height: "70vh", display: "flex", flexDirection: "column" }}>{contenido}</div>
    </Modal>
  );
}

// ── Subcomponentes ──────────────────────────────────────

function CardDiseno({ d, esPicker, onPick, onZoom }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #eee", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        onClick={onZoom}
        style={{ height: 120, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", borderBottom: "1px solid #f2f2f2" }}
      >
        {d.previewUrl ? (
          <img src={d.previewUrl} alt={d.nombre} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <div style={{ textAlign: "center", color: "#ccc" }}>
            <div style={{ fontSize: 30 }}>🧵</div>
            <div style={{ fontSize: 9, fontWeight: 700 }}>{d.formato} sin vista previa</div>
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#333", lineHeight: 1.25 }}>
          {limpiarNombreDiseno(d.nombre)}
        </div>
        <div style={{ fontSize: 10, color: "#999" }}>
          {d.puntadas ? d.puntadas.toLocaleString() + " pt" : "—"}
          {d.anchoMm ? ` · ${d.anchoMm}×${d.altoMm}mm` : ""}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: "auto", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#1A5F5A", background: "#F0FFF8", borderRadius: 5, padding: "2px 6px" }}>
            {d.categoria}
          </span>
          {d.archivoEmbUrl && <span style={{ fontSize: 9, color: "#888" }}>.emb ✓</span>}
          {esPicker && (
            <button
              onClick={() => onPick(d)}
              style={{ marginLeft: "auto", padding: "4px 9px", borderRadius: 6, border: "none", background: "#1A5F5A", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 10, fontFamily: "inherit" }}
            >
              Usar →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BotonDescarga({ url, label }) {
  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noreferrer"
      style={{ fontSize: 11, color: "#1A5F5A", background: "#F0FFF8", border: "1.5px solid #1A5F5A44", padding: "5px 10px", borderRadius: 7, textDecoration: "none", fontWeight: 700 }}
    >
      {label}
    </a>
  );
}
