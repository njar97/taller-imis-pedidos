// Sección 🧮 Cotizaciones — listado de cotizaciones (pedidos borrador)
// con es_cotizacion=true. El admin las gestiona acá: ver, imprimir,
// convertir a pedido firme, eliminar.
//
// El listado oficial de pedidos (SeccionPedidos) ya las filtra fuera,
// así que viven en su propio espacio sin contaminar producción.

import { useMemo, useState, useRef, useEffect } from "react";
import { fmt$, itemsResumen } from "./lib/dominio.js";
import { TallasChips } from "./SelectorTallas.jsx";
import { pushConfirm, pushToast } from "./lib/feedback.js";
import { compartirCotizacion, compartirComparativo } from "./lib/whatsapp.js";
import { imgSrc } from "./lib/imagenes.js";
import DesgloseEstimador from "./lib/DesgloseEstimador.jsx";

// Días sin volverse pedido a partir de los cuales se pregunta si se archiva.
// Lo fijó Javier el 24-ago-2026; no es un supuesto del código.
export const DIAS_PARA_ARCHIVAR = 7;

const fmtFecha = f => f || "—";

export default function SeccionCotizaciones({
  pedidos,
  onConvertirPedido,
  onEliminar,
  onImprimir,
  onComparar,
  onEditar,
  onReabrirEstimador,
  onVerVersiones,
  onEnviarEmail,
  onArchivar,
}) {
  const [busq, setBusq] = useState("");
  // Selección para el comparativo de opciones (varias cotizaciones → 1 hoja).
  const [sel, setSel] = useState(() => new Set());
  // Las archivadas salen de la lista: son cotizaciones que no llegaron a
  // pedido y Javier decidió sacar del radar. Se consultan con el filtro.
  const [verArchivadas, setVerArchivadas] = useState(false);
  const { cotizaciones, nArchivadas } = useMemo(() => {
    const q = busq.trim().toLowerCase();
    const todas = pedidos
      .filter(p => p.esCotizacion)
      .filter(p => !q || [p.cliente, p.telefono, p.tipoPrenda, String(p.id || "")].some(v => v && String(v).toLowerCase().includes(q)))
      .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
    return {
      cotizaciones: todas.filter(c => !!c.archivada === verArchivadas),
      nArchivadas: todas.filter(c => c.archivada).length,
    };
  }, [pedidos, busq, verArchivadas]);

  const totalCotizado = cotizaciones.reduce((s, c) => s + parseFloat(c.precio || 0), 0);

  const toggleSel = id =>
    setSel(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  // Cotizaciones seleccionadas, en el orden en que se ven en pantalla.
  const seleccionadas = cotizaciones.filter(c => sel.has(c.id));

  return (
    <div className="main-area" style={{ flex: 1, overflow: "auto" }}>
    <div style={{ padding: "12px 14px", maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 18, color: "#9B59B6", fontWeight: 800, fontFamily: "Georgia,serif" }}>
            🧮 Cotizaciones
          </h1>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            {cotizaciones.length} borrador{cotizaciones.length === 1 ? "" : "es"} · {fmt$(totalCotizado)} en propuestas
          </div>
        </div>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{
            flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8,
            border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none", fontFamily: "inherit",
            background: "#FAFAFA",
          }}
        />
        {(nArchivadas > 0 || verArchivadas) && (
          <button
            onClick={() => { setVerArchivadas(v => !v); setSel(new Set()); }}
            style={{
              padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: "1.5px solid " + (verArchivadas ? "#9B59B6" : "#e0e0e0"),
              background: verArchivadas ? "#9B59B6" : "#fff",
              color: verArchivadas ? "#fff" : "#666", fontFamily: "inherit",
            }}
          >
            {verArchivadas ? "← Volver a las activas" : `📦 Archivadas (${nArchivadas})`}
          </button>
        )}
      </div>

      {sel.size > 0 && (
        <div style={{
          position: "sticky", top: 0, zIndex: 5,
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          background: "#2C1654", color: "#fff",
          borderRadius: 10, padding: "9px 12px", marginBottom: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,.15)",
        }}>
          <span style={{ fontWeight: 800, fontSize: 13, flex: 1, minWidth: 140 }}>
            {sel.size} seleccionada{sel.size === 1 ? "" : "s"}
            {sel.size < 2 && <span style={{ fontWeight: 400, opacity: .8 }}> · elegí al menos 2</span>}
          </span>
          <button
            disabled={sel.size < 2}
            onClick={() => onComparar && onComparar(seleccionadas)}
            style={barBtn("#C9A227", sel.size < 2)}
          >
            📑 Comparativo PDF
          </button>
          <button
            disabled={sel.size < 2}
            onClick={async () => {
              const r = await compartirComparativo(seleccionadas);
              if (r === "copiado") pushToast("Texto copiado — adjuntá las imágenes aparte", "success");
            }}
            style={barBtn("#25D366", sel.size < 2)}
          >
            💬 WhatsApp
          </button>
          <button onClick={() => setSel(new Set())} style={barBtn("ghost")}>
            ✕ Limpiar
          </button>
        </div>
      )}

      {cotizaciones.length === 0 ? (
        <div style={{
          background: "#F3E5F5", borderRadius: 12, padding: 24, textAlign: "center",
          border: "1.5px dashed #d4b3df", color: "#9B59B6",
        }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🧮</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Sin cotizaciones aún</div>
          <div style={{ fontSize: 12, opacity: .85 }}>
            Abrí el 💰 Estimador de precio, armá un estimado y guardalo como cotización para que aparezca acá.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cotizaciones.map(c => (
            <CardCotizacion
              key={c.id}
              c={c}
              seleccionado={sel.has(c.id)}
              onToggleSel={() => toggleSel(c.id)}
              onConvertir={() => onConvertirPedido(c)}
              onEliminar={() => onEliminar(c)}
              onImprimir={() => onImprimir(c)}
              onEditar={() => onEditar(c)}
              onReabrirEstimador={() => onReabrirEstimador && onReabrirEstimador(c)}
              onVerVersiones={() => onVerVersiones && onVerVersiones(c)}
              onEnviarEmail={() => onEnviarEmail && onEnviarEmail(c)}
              onArchivar={() => onArchivar && onArchivar(c, !c.archivada)}
            />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

function CardCotizacion({ c, seleccionado, onToggleSel, onConvertir, onEliminar, onImprimir, onEditar, onReabrirEstimador, onVerVersiones, onEnviarEmail, onArchivar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuAbierto) return;
    const close = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("touchstart", close); };
  }, [menuAbierto]);
  const tieneDesglose = !!(c.desgloseEstimador && c.desgloseEstimador.modo);
  const items = itemsResumen(c);
  // Ya no se habla de "vencida": la validez era una política que nadie
  // estableció. Lo que importa es cuánto lleva sin volverse pedido, para
  // decidir si se archiva (Javier: a los 7 días preguntar).
  const diasSinRespuesta = c.fecha
    ? Math.floor((new Date() - new Date(c.fecha + "T12:00:00")) / 86400000)
    : null;
  const paraArchivar = !c.archivada && diasSinRespuesta !== null && diasSinRespuesta >= DIAS_PARA_ARCHIVAR;
  const telWA = c.telefono ? `https://wa.me/${c.telefono.replace(/[^0-9]/g, "")}` : null;
  // Mockup / imagen de referencia (si la cotización tiene imágenes).
  const imgRef = (c.imagenes || []).find(i => imgSrc(i));
  const thumb = imgRef && imgSrc(imgRef);

  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 12,
      border: (seleccionado ? "2px solid #2C1654" : "1.5px solid " + (c.archivada ? "#ddd" : paraArchivar ? "#E67E22" : "#d4b3df")),
      boxShadow: seleccionado ? "0 0 0 3px rgba(44,22,84,.12)" : "0 2px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <button
          onClick={onToggleSel}
          title="Seleccionar para comparar opciones"
          style={{
            flexShrink: 0, width: 24, height: 24, marginTop: 1, borderRadius: 6,
            border: "1.5px solid " + (seleccionado ? "#2C1654" : "#ccc"),
            background: seleccionado ? "#2C1654" : "#fff", color: "#fff",
            cursor: "pointer", fontSize: 13, fontWeight: 900, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {seleccionado ? "✓" : ""}
        </button>
        {thumb && (
          <a href={thumb} target="_blank" rel="noopener" title="Ver imagen de referencia" style={{ flexShrink: 0 }}>
            <img
              src={thumb}
              alt="Diseño"
              style={{
                width: 56, height: 56, borderRadius: 8, objectFit: "contain",
                background: "#f5f5f5", border: "1px solid #e6e6e6", display: "block",
              }}
            />
          </a>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#9B59B6", fontWeight: 700 }}>
              COT-{String(c.id).padStart(4, "0")}
            </span>
            <strong style={{ fontSize: 14, color: "#2C1654" }}>{c.cliente || "(sin cliente)"}</strong>
            {telWA && (
              <a href={telWA} target="_blank" rel="noopener" title="WhatsApp"
                style={{ fontSize: 11, color: "#25D366", textDecoration: "none", fontWeight: 700 }}>
                💬 {c.telefono}
              </a>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            📅 Creada {fmtFecha(c.fecha)}
            {" · "}
            {c.archivada
              ? <span style={{ color: "#888", fontWeight: 700 }}>📦 Archivada</span>
              : diasSinRespuesta === null
              ? <span style={{ color: "#888" }}>sin fecha</span>
              : paraArchivar
              ? <span style={{ color: "#E67E22", fontWeight: 700 }}>⏳ {diasSinRespuesta} días sin volverse pedido</span>
              : <span style={{ color: "#27AE60" }}>⏳ hace {diasSinRespuesta} día{diasSinRespuesta === 1 ? "" : "s"}</span>
            }
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#27AE60" }}>{fmt$(c.precio)}</div>
          <div style={{ fontSize: 9, color: "#aaa", textTransform: "uppercase", letterSpacing: .5 }}>cotizado</div>
        </div>
      </div>

      {(c.tipoPrenda || c.tela) && (
        <div style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 5 }}>
          {[c.tipoPrenda, c.tela, c.color].filter(Boolean).join(" · ")}
        </div>
      )}
      {items.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <TallasChips items={items} compact />
        </div>
      )}

      {/* CTA principal */}
      {c.archivada ? (
        <button onClick={onArchivar} className="btn-action" style={{
          width: "100%", padding: "10px", borderRadius: 8, border: "1.5px solid #9B59B6",
          background: "#fff", color: "#9B59B6", fontWeight: 700, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
        }}>
          ♻️ Sacar del archivo
        </button>
      ) : (
            <>
          <button onClick={onConvertir} className="btn-action" style={{
            width: "100%", padding: "10px", borderRadius: 8, border: "none",
            background: "#27AE60", color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
          }}>
            ✅ Convertir a pedido
      </button>
          {paraArchivar && (
            <button onClick={onArchivar} className="btn-action" style={{
              width: "100%", padding: "8px", borderRadius: 8, border: "1.5px solid #E67E22",
              background: "#fff", color: "#E67E22", fontWeight: 700, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
            }}>
              📦 Archivar — no se volvió pedido
            </button>
          )}
        </>
      )}

      {/* Acciones secundarias: compartir + overflow */}
      <div style={{ display: "flex", gap: 6, position: "relative" }}>
        <button className="btn-action" onClick={async () => {
          const r = await compartirCotizacion(c);
          if (r === "copiado") pushToast("Texto copiado — adjuntá la imagen aparte", "success");
        }} style={BTN("#25D366")} title="Compartir por WhatsApp">
          💬 WhatsApp
        </button>
        <button className="btn-action" onClick={onEnviarEmail} style={BTN("#1A5276")} title="Enviar por email">
          📧 Email
        </button>
        <button className="btn-action" onClick={onImprimir} style={BTN("#9B59B6")} title="Ver / imprimir PDF">
          📄 PDF
        </button>
        {/* Menú de acciones secundarias */}
        <div ref={menuRef} style={{ marginLeft: "auto", position: "relative" }}>
          <button
            className="btn-action"
            onClick={() => setMenuAbierto(v => !v)}
            style={{ ...BTN("#888", true), padding: "6px 10px", fontWeight: 900, fontSize: 15 }}
            title="Más acciones"
          >
            ⋮
          </button>
          {menuAbierto && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", right: 0,
              background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              border: "1.5px solid #e8e0f0", zIndex: 50, minWidth: 160, overflow: "hidden",
            }}>
              <MenuItem icon="✏️" label="Editar" onClick={() => { setMenuAbierto(false); onEditar(); }} />
              {tieneDesglose && <MenuItem icon="🔍" label="Estimador" onClick={() => { setMenuAbierto(false); onReabrirEstimador(); }} color="#E67E22" />}
              <MenuItem icon="🕗" label="Versiones" onClick={() => { setMenuAbierto(false); onVerVersiones(); }} color="#888" />
              <div style={{ height: 1, background: "#f0e8f8", margin: "2px 0" }} />
              <MenuItem icon="🗑️" label="Eliminar" onClick={() => { setMenuAbierto(false); onEliminar(); }} color="#E74C3C" />
            </div>
          )}
        </div>
      </div>

      {tieneDesglose && <DesgloseEstimador desglose={c.desgloseEstimador} onEdit={onReabrirEstimador} />}
    </div>
  );
}

function MenuItem({ icon, label, onClick, color = "#333" }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        padding: "10px 14px", border: "none", background: "transparent",
        color, fontSize: 13, fontWeight: 600, cursor: "pointer",
        fontFamily: "inherit", textAlign: "left",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "#f8f4fc"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <span>{icon}</span><span>{label}</span>
    </button>
  );
}

const BTN = (color, ghost = false) => ({
  padding: "6px 12px",
  borderRadius: 6,
  border: ghost ? `1.5px solid ${color}` : "none",
  background: ghost ? "transparent" : color,
  color: ghost ? color : "#fff",
  fontWeight: 700,
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
});

// Botones de la barra de selección/comparativo (sobre fondo morado oscuro).
const barBtn = (bg, disabled = false) => ({
  padding: "7px 12px",
  borderRadius: 7,
  border: bg === "ghost" ? "1.5px solid rgba(255,255,255,.55)" : "none",
  background: bg === "ghost" ? "transparent" : bg,
  color: bg === "#C9A227" ? "#1c1c1c" : "#fff",
  fontWeight: 800,
  fontSize: 12,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
});
