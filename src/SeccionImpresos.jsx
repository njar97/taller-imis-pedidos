// Impresos — archivo de los trabajos de imprenta del taller: recuerdos
// fúnebres, palancas, invitaciones. No son prendas, por eso no viven en
// Confección: acá lo único que importa es poder volver a imprimir un
// trabajo tal cual salió, meses después, sin andar buscando el archivo.
//
// Cada ficha guarda la medida de la pieza, cuántas caben por hoja y el
// PDF listo para imprenta. El PDF principal trae frente y reverso en
// dos páginas: se manda a doble cara y ya.

import { dbImpresosLeer, dbImpresoGuardar, dbImpresoBorrar } from "./lib/db.js";
import { Modal } from "./lib/Modal.jsx";
import { pushToast } from "./lib/feedback.js";
import { useEffect, useMemo, useState } from "react";

const MORADO = "#6C3483";

const TIPOS = [
  { id: "recuerdo",   label: "Recuerdos",    icon: "🕊️" },
  { id: "palanca",    label: "Palancas",     icon: "✉️" },
  { id: "invitacion", label: "Invitaciones", icon: "💌" },
  { id: "otro",       label: "Otros",        icon: "🖨️" },
];

const iconoDe = t => (TIPOS.find(x => x.id === t) || TIPOS[3]).icon;
const rotuloDe = t => (TIPOS.find(x => x.id === t) || TIPOS[3]).label;

const fmtFecha = f => {
  if (!f) return "";
  const [a, m, d] = String(f).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

// "3.51 × 6.00 cm cerrada" — el cerrada importa: es lo que mide doblada.
function medidaTexto(i) {
  if (!i.piezaAnchoCm || !i.piezaAltoCm) return null;
  const n = v => Number(v).toFixed(2).replace(/\.00$/, "");
  return `${n(i.piezaAnchoCm)} × ${n(i.piezaAltoCm)} cm${i.doblado ? " cerrada" : ""}`;
}

export default function SeccionImpresos({ esAdmin }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tipo, setTipo] = useState("Todos");
  const [busq, setBusq] = useState("");
  const [abierto, setAbierto] = useState(null);

  const recargar = () => dbImpresosLeer().then(rows => {
    setItems(rows);
    setCargando(false);
  });

  useEffect(() => { recargar(); }, []);

  const tipos = useMemo(() => {
    const usados = new Set(items.map(i => i.tipo));
    return ["Todos", ...TIPOS.filter(t => usados.has(t.id)).map(t => t.id)];
  }, [items]);

  const lista = useMemo(() => {
    const q = busq.trim().toLowerCase();
    return items
      .filter(i => tipo === "Todos" || i.tipo === tipo)
      .filter(i => !q ||
        (i.titulo || "").toLowerCase().includes(q) ||
        (i.cliente || "").toLowerCase().includes(q))
      .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
  }, [items, tipo, busq]);

  async function borrar(i) {
    if (!confirm(`¿Mandar "${i.titulo}" a la papelera?`)) return;
    const ok = await dbImpresoBorrar(i.id);
    if (ok) {
      pushToast("Impreso archivado en la papelera", "ok");
      setAbierto(null);
      recargar();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ padding: "0 0 10px", background: "#fff", flexShrink: 0 }}>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar trabajo... (nombre, cliente)"
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0",
            fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8,
          }}
        />
        {tipos.length > 2 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {tipos.map(t => {
              const act = tipo === t;
              const cnt = t === "Todos" ? items.length : items.filter(i => i.tipo === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  style={{
                    padding: "5px 10px", borderRadius: 20, whiteSpace: "nowrap", cursor: "pointer",
                    border: "1.5px solid " + (act ? MORADO : "#e0e0e0"),
                    background: act ? MORADO : "#fff",
                    color: act ? "#fff" : "#777",
                    fontWeight: act ? 700 : 500, fontSize: 11, fontFamily: "inherit",
                  }}
                >
                  {t === "Todos" ? "Todos" : `${iconoDe(t)} ${rotuloDe(t)}`}{" "}
                  <span style={{ opacity: 0.7 }}>{cnt}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="main-area" style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {cargando ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ borderRadius: 12, height: 210 }} />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: 50, color: "#ccc" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🖨️</div>
            <div style={{ fontSize: 14, color: "#aaa" }}>
              {items.length === 0 ? "Todavía no hay impresos guardados" : "Sin resultados para esa búsqueda"}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {lista.map(i => <CardImpreso key={i.id} i={i} onAbrir={() => setAbierto(i)} />)}
          </div>
        )}
      </div>

      {abierto && (
        <DetalleImpreso
          i={abierto}
          esAdmin={esAdmin}
          onClose={() => setAbierto(null)}
          onBorrar={() => borrar(abierto)}
        />
      )}
    </div>
  );
}

function CardImpreso({ i, onAbrir }) {
  const med = medidaTexto(i);
  return (
    <div
      onClick={onAbrir}
      style={{
        background: "#fff", border: "1.5px solid #eee", borderRadius: 12, overflow: "hidden",
        display: "flex", flexDirection: "column", cursor: "pointer",
      }}
    >
      <div style={{ height: 130, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #f2f2f2" }}>
        {i.previewUrl ? (
          <img src={i.previewUrl} alt={i.titulo} loading="lazy"
               style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 34, opacity: 0.35 }}>{iconoDe(i.tipo)}</div>
        )}
      </div>
      <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#333", lineHeight: 1.25 }}>{i.titulo}</div>
        {i.cliente && <div style={{ fontSize: 10.5, color: "#999" }}>{i.cliente}</div>}
        <div style={{ display: "flex", gap: 4, marginTop: "auto", flexWrap: "wrap", alignItems: "center", paddingTop: 4 }}>
          {i.porHoja && (
            <span style={{ fontSize: 9, fontWeight: 700, color: MORADO, background: "#F4ECF7", borderRadius: 5, padding: "2px 6px" }}>
              {i.porHoja} por hoja
            </span>
          )}
          {med && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#1A5276", background: "#EBF5FB", borderRadius: 5, padding: "2px 6px" }}>
              {med.replace(" cerrada", "")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DetalleImpreso({ i, esAdmin, onClose, onBorrar }) {
  const med = medidaTexto(i);
  const extras = Array.isArray(i.archivos) ? i.archivos : [];

  return (
    <Modal onClose={onClose} title={`${iconoDe(i.tipo)} ${i.titulo}`}>
      <div style={{ maxHeight: "72vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {i.previewUrl && (
          <img src={i.previewUrl} alt={i.titulo}
               style={{ width: "100%", borderRadius: 10, border: "1px solid #eee" }} />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", fontSize: 13 }}>
          <Dato k="Cliente"      v={i.cliente} />
          <Dato k="Fecha"        v={fmtFecha(i.fecha)} />
          <Dato k="Pieza"        v={med} />
          <Dato k="Por hoja"     v={i.porHoja ? `${i.porHoja}${i.cols && i.filas ? ` (${i.cols} col × ${i.filas} fil)` : ""}` : null} />
          <Dato k="Hoja"         v={i.hoja} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {i.pdfUrl && (
            <a href={i.pdfUrl} target="_blank" rel="noreferrer" download
               style={{
                 background: MORADO, color: "#fff", borderRadius: 9, padding: "11px 14px",
                 textDecoration: "none", fontWeight: 700, fontSize: 13.5, textAlign: "center",
               }}>
              ⬇️ Pliego listo para imprimir
            </a>
          )}
          {extras.map((a, n) => (
            <a key={n} href={a.url} target="_blank" rel="noreferrer" download
               style={{
                 background: "#F4ECF7", color: MORADO, border: "1.5px solid " + MORADO + "33",
                 borderRadius: 9, padding: "9px 14px", textDecoration: "none",
                 fontWeight: 700, fontSize: 12.5, textAlign: "center",
               }}>
              📎 {a.nombre}
            </a>
          ))}
        </div>

        {i.notas && (
          <div style={{ background: "#FFFBF0", border: "1px solid #F5E6C8", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "#6b5a3a", lineHeight: 1.55 }}>
            {i.notas}
          </div>
        )}

        {esAdmin && (
          <button
            onClick={onBorrar}
            style={{
              alignSelf: "flex-start", background: "#fff", color: "#C0392B",
              border: "1.5px solid #C0392B44", borderRadius: 8, padding: "7px 14px",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            🗑️ Mandar a papelera
          </button>
        )}
      </div>
    </Modal>
  );
}

function Dato({ k, v }) {
  if (!v) return null;
  return (
    <>
      <div style={{ color: "#999", fontSize: 12 }}>{k}</div>
      <div style={{ fontWeight: 600, color: "#333" }}>{v}</div>
    </>
  );
}
