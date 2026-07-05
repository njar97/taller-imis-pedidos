// Catálogo de diseños de tejido (cuellos/puños) — grilla visual de solo
// lectura con buscador y filtro por categoría. Los diseños viven en
// taller_tejidos (Supabase), alimentados desde D:\TEJIDOS. Las previews
// son una reconstrucción esquemática de la malla real leída del .pds
// (no una foto ni el color real del hilo — ver campo "notas").

import { dbTejidosLeer } from "./lib/db.js";
import { Modal } from "./lib/Modal.jsx";
import { useEffect, useMemo, useState } from "react";

let cacheTejidos = null; // cache en memoria por sesión — el catálogo cambia poco

export default function CatalogoTejidos({ onClose }) {
  const [tejidos, setTejidos] = useState(cacheTejidos || []);
  const [cargando, setCargando] = useState(!cacheTejidos);
  const [busq, setBusq] = useState("");
  const [cat, setCat] = useState("Todos");
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    if (cacheTejidos) return;
    dbTejidosLeer().then(rows => {
      cacheTejidos = rows;
      setTejidos(rows);
      setCargando(false);
    });
  }, []);

  const categorias = useMemo(() => {
    const set = new Set(tejidos.map(t => t.categoria).filter(Boolean));
    return ["Todos", ...[...set].sort()];
  }, [tejidos]);

  const lista = useMemo(() => {
    const q = busq.toLowerCase();
    return tejidos
      .filter(t => cat === "Todos" || t.categoria === cat)
      .filter(t => !q || t.nombre.toLowerCase().includes(q) || (t.talla || "").toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [tejidos, busq, cat]);

  const contenido = (
    // flex:1 + minHeight:0 en vez de height:100% — con height:100% el catálogo
    // mide lo mismo que toda la sección y el header lo empuja fuera de pantalla:
    // la última fila queda inalcanzable bajo el BottomNav.
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ padding: "0 0 10px", background: "#fff", flexShrink: 0 }}>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar diseño... (cuello, puño, 16, reversible...)"
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }}
        />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {categorias.map(c => {
            const act = cat === c;
            const cnt = c === "Todos" ? tejidos.length : tejidos.filter(t => t.categoria === c).length;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "5px 10px", borderRadius: 20, whiteSpace: "nowrap", cursor: "pointer",
                  border: act ? "1.5px solid #B85C00" : "1.5px solid #e0e0e0",
                  background: act ? "#B85C00" : "#fff",
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

      <div className="main-area" style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {cargando ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ borderRadius: 12, height: 190 }} />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: 50, color: "#ccc" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🧶</div>
            <div style={{ fontSize: 14, color: "#aaa" }}>
              {tejidos.length === 0 ? "El catálogo está vacío" : "Sin resultados para esa búsqueda"}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {lista.map(t => (
              <CardTejido key={t.id} t={t} onZoom={() => setZoom(t)} />
            ))}
          </div>
        )}
      </div>

      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20, cursor: "zoom-out" }}
        >
          {zoom.previewUrl && (
            <img
              src={zoom.previewUrl}
              alt={zoom.nombre}
              style={{ maxWidth: "90vw", maxHeight: "55vh", background: "#fff", borderRadius: 12 }}
              onClick={e => e.stopPropagation()}
            />
          )}
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", marginTop: 12, maxWidth: 420, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, color: "#B85C00", fontSize: 14 }}>{zoom.nombre}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {zoom.agujas ? `${zoom.agujas} agujas × ${zoom.filas} filas` : "Sin datos técnicos"}
            </div>
            {zoom.notas && (
              <div style={{ fontSize: 11, color: "#999", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>{zoom.notas}</div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
              {zoom.archivoPdsUrl && <BotonDescarga url={zoom.archivoPdsUrl} label="⬇️ .pds" />}
              {zoom.archivoHcdUrl && <BotonDescarga url={zoom.archivoHcdUrl} label="⬇️ .HCD" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!onClose) return contenido;

  return (
    <Modal onClose={onClose} title="📚 Catálogo de tejidos">
      <div style={{ height: "70vh", display: "flex", flexDirection: "column" }}>{contenido}</div>
    </Modal>
  );
}

function CardTejido({ t, onZoom }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #eee", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        onClick={onZoom}
        style={{ height: 120, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", borderBottom: "1px solid #f2f2f2" }}
      >
        {t.previewUrl ? (
          <img src={t.previewUrl} alt={t.nombre} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <div style={{ textAlign: "center", color: "#ccc" }}>
            <div style={{ fontSize: 30 }}>🧶</div>
            <div style={{ fontSize: 9, fontWeight: 700 }}>Sin vista previa</div>
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#333", lineHeight: 1.25 }}>{t.nombre}</div>
        <div style={{ fontSize: 10, color: "#999" }}>
          {t.agujas ? `${t.agujas} ag × ${t.filas} filas` : "—"}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: "auto", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#B85C00", background: "#FFF4E6", borderRadius: 5, padding: "2px 6px" }}>
            {t.categoria}
          </span>
          {t.talla && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#1A5276", background: "#EBF5FB", borderRadius: 5, padding: "2px 6px" }}>
              {t.talla}
            </span>
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
      style={{ fontSize: 11, color: "#B85C00", background: "#FFF4E6", border: "1.5px solid #B85C0044", padding: "5px 10px", borderRadius: 7, textDecoration: "none", fontWeight: 700 }}
    >
      {label}
    </a>
  );
}
