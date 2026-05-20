// Helpers de UI compartidos: notificaciones (toast + confirm), checks, fotos,
// progreso, chips, fechas rápidas, secciones plegables, banner de medidas,
// botón de WhatsApp.
// Antes vivían como funciones sueltas en main.js (~620 líneas compiladas).

import { _subscribeToasts, _getToasts, _subscribeConfirm, _getConfirm, _clearConfirm } from "./feedback.js";
import { comprimirImagen, imgSrc } from "./imagenes.js";
import { copiarWA } from "./whatsapp.js";

import { useState, useEffect, useRef } from "react";

// Estilo de header de sección — duplicado del SEC de main.js para no acoplar.
const SEC = (c = "#9B59B6") => ({
  fontSize: 11,
  fontWeight: 800,
  color: c,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "14px 0 8px",
  borderBottom: "1px solid " + c + "33",
  paddingBottom: 3,
});

// ── Toaster ───────────────────────────────────────────────

function useToasts() {
  const [, force] = useState(0);
  useEffect(() => _subscribeToasts(() => force(n => n + 1)), []);
  return _getToasts();
}

export function Toaster() {
  const items = useToasts();
  if (!items.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {items.map(t => (
        <div
          key={t.id}
          style={{
            background:
              t.kind === "error" ? "#DC3545" :
              t.kind === "success" ? "#28A745" :
              "#2C1654",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
            pointerEvents: "auto",
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────

function useConfirm() {
  const [, force] = useState(0);
  useEffect(() => _subscribeConfirm(() => force(n => n + 1)), []);
  return _getConfirm();
}

export function ConfirmDialog() {
  const c = useConfirm();
  if (!c) return null;
  const close = v => {
    const resolver = c.resolve;
    _clearConfirm();
    resolver(v);
  };
  return (
    <div
      onClick={() => close(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
      >
        {c.titulo && (
          <h3 style={{ margin: "0 0 8px", color: "#2C1654", fontSize: 16 }}>{c.titulo}</h3>
        )}
        <div style={{ color: "#444", fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
          {c.msg}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => close(false)}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "1.5px solid #e0e0e0",
              background: "#fff",
              color: "#666",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {c.cancelLabel || "Cancelar"}
          </button>
          <button
            onClick={() => close(true)}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: c.danger ? "#DC3545" : "#9B59B6",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {c.okLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Check ─────────────────────────────────────────────────

export function Check({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontSize: 14,
        color: "#444",
        padding: "4px 0",
      }}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: "#9B59B6" }}
      />
      {label}
    </label>
  );
}

// ── UploaderImagenes ──────────────────────────────────────

export function UploaderImagenes({ imagenes, onChange }) {
  const fileRef = useRef();
  const [cargando, setCargando] = useState(false);

  const agregar = async e => {
    const files = [...e.target.files];
    if (!files.length) return;
    setCargando(true);
    const nuevas = await Promise.all(files.map(f => comprimirImagen(f)));
    onChange([...(imagenes || []), ...nuevas]);
    setCargando(false);
    e.target.value = "";
  };
  const quitar = idx => onChange((imagenes || []).filter((_, i) => i !== idx));

  const lista = imagenes || [];
  const nSubidas = lista.filter(i => i.driveUrl || i.supabaseUrl).length;
  const nPendientes = lista.filter(i => i.data && !i.driveUrl && !i.supabaseUrl).length;

  return (
    <div>
      <div style={SEC("#E91E8C")}>📸 Imágenes de referencia</div>
      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileRef}
        onChange={agregar}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        {lista.map((img, i) => {
          const src = imgSrc(img);
          const enDrive = !!img.driveUrl;
          const enSupabase = !!img.supabaseUrl;
          const enServidor = enDrive || enSupabase;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                width: 90,
                height: 90,
                borderRadius: 8,
                overflow: "hidden",
                border: "1.5px solid " + (enServidor ? "#a8d8a8" : "#e0e0e0"),
                flexShrink: 0,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={img.nombre}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#ccc",
                  }}
                >
                  Sin vista
                </div>
              )}
              <button
                onClick={() => quitar(i)}
                style={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(220,53,69,0.9)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
              {enServidor && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(40,167,69,0.85)",
                    padding: "2px 4px",
                    fontSize: 9,
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {enSupabase ? "☁️ Subida" : "☁️ Drive"}
                </div>
              )}
              {!enServidor && img.data && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(0,0,0,0.5)",
                    padding: "2px 4px",
                    fontSize: 9,
                    color: "#fff",
                    textAlign: "center",
                  }}
                >
                  Local
                </div>
              )}
            </div>
          );
        })}
        <button
          onClick={() => fileRef.current.click()}
          disabled={cargando}
          style={{
            width: 90,
            height: 90,
            borderRadius: 8,
            border: "2px dashed #e0e0e0",
            background: "#fafafa",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            color: "#bbb",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {cargando ? (
            <>
              <span style={{ fontSize: 18 }}>⏳</span>
              <span>Procesando</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 24 }}>＋</span>
              <span>Foto</span>
            </>
          )}
        </button>
      </div>
      {lista.length > 0 && (
        <div
          style={{
            fontSize: 11,
            borderRadius: 8,
            padding: "6px 10px",
            background: "#f8f4ff",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {nSubidas > 0 && (
            <span style={{ color: "#28A745", fontWeight: 700 }}>
              ☁️ {nSubidas} en Drive
            </span>
          )}
          {nPendientes > 0 && (
            <span style={{ color: "#E67E22", fontWeight: 700 }}>
              ⏳ {nPendientes} pendiente{nPendientes > 1 ? "s" : ""} de subir
            </span>
          )}
          <span style={{ color: "#aaa" }}>Se suben al guardar el pedido</span>
        </div>
      )}
      {nPendientes > 0 && (
        <div
          style={{
            fontSize: 11,
            borderRadius: 8,
            padding: "8px 10px",
            background: "#FFF3CD",
            color: "#856404",
            marginTop: 6,
            border: "1px solid #FFE082",
          }}
        >
          ⚠️ Las fotos no se guardan en borrador. Si cerrás sin guardar, las perdés.
        </div>
      )}
    </div>
  );
}

// ── BarraProgreso ─────────────────────────────────────────

export function BarraProgreso({ actual, total, errores }) {
  if (!total) return null;
  const pct = Math.round((actual / total) * 100);
  const hayError = errores > 0;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>
          {hayError ? "⚠️" : "☁️"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#2C1654", marginBottom: 4 }}>
          Subiendo a Google Drive...
        </div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          {actual} de {total} foto{total > 1 ? "s" : ""}
          {hayError ? ` · ${errores} con error` : ""}
        </div>
        <div
          style={{
            background: "#f0f0f0",
            borderRadius: 10,
            height: 12,
            overflow: "hidden",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: pct + "%",
              background: hayError
                ? "linear-gradient(90deg,#E67E22,#DC3545)"
                : "linear-gradient(90deg,#9B59B6,#E91E8C)",
              height: "100%",
              borderRadius: 10,
              transition: "width .3s",
            }}
          />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: hayError ? "#E67E22" : "#9B59B6" }}>
          {pct}%
        </div>
      </div>
    </div>
  );
}

// ── Chips ─────────────────────────────────────────────────

export function Chips({ opciones, valor, onChange, color = "#9B59B6" }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
      {opciones.map(op => {
        const sel = valor === op;
        return (
          <button
            key={op}
            onClick={() => onChange(sel ? "" : op)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1.5px solid " + (sel ? color : "#e0e0e0"),
              background: sel ? color : "#fff",
              color: sel ? "#fff" : "#666",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: sel ? 700 : 400,
              transition: "all .15s",
            }}
          >
            {op}
          </button>
        );
      })}
    </div>
  );
}

// ── FechasRapidas ─────────────────────────────────────────

const FECHAS_OPTS = [
  { l: "1 sem", d: 7 },
  { l: "2 sem", d: 14 },
  { l: "3 sem", d: 21 },
  { l: "1 mes", d: 30 },
  { l: "2 meses", d: 60 },
];

export function FechasRapidas({ onChange }) {
  const [sel, setSel] = useState(null);
  function elegir(d, i) {
    setSel(i);
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + d);
    onChange(fecha.toISOString().split("T")[0]);
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
      {FECHAS_OPTS.map((o, i) => (
        <button
          key={i}
          onClick={() => elegir(o.d, i)}
          style={{
            padding: "5px 10px",
            borderRadius: 20,
            border: "1.5px solid " + (sel === i ? "#27AE60" : "#e0e0e0"),
            background: sel === i ? "#27AE60" : "#fff",
            color: sel === i ? "#fff" : "#666",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: sel === i ? 700 : 400,
          }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

// ── SeccionOpcional ───────────────────────────────────────

export function SeccionOpcional({ titulo, icon, color = "#888", children, id }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      id={id}
      style={{
        border: "1.5px solid #f0f0f0",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 8,
        scrollMarginTop: 80,
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "none",
          background: open ? "#fafafa" : "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: open ? color : "#888" }}>
          {titulo}
        </span>
        <span style={{ fontSize: 12, color: "#ccc", fontWeight: 700 }}>
          {open ? "▲" : "▼ Agregar"}
        </span>
      </button>
      {open && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── BannerMedidas ─────────────────────────────────────────

export function BannerMedidas({ meds, onCargar }) {
  const resumen = Object.entries(meds)
    .filter(([, v]) => v)
    .slice(0, 4)
    .map(([k, v]) => k + ":" + v)
    .join(" · ");
  return (
    <div
      style={{
        background: "#EBF5FB",
        border: "1.5px solid #AED6F1",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1A5276" }}>
          📐 Este cliente tiene medidas guardadas
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#555",
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {resumen}
        </div>
      </div>
      <button
        onClick={() => onCargar(meds)}
        style={{
          padding: "7px 14px",
          borderRadius: 8,
          border: "none",
          background: "#1A5276",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
          marginLeft: 10,
        }}
      >
        📐 Cargar
      </button>
    </div>
  );
}

// ── WABtn ─────────────────────────────────────────────────

export function WABtn({ p, esAdmin }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        copiarWA(p, esAdmin);
        setOk(true);
        setTimeout(() => setOk(false), 2200);
      }}
      title="Copiar info para WhatsApp"
      style={{
        padding: "4px 8px",
        borderRadius: 6,
        border: "1.5px solid " + (ok ? "#25D366" : "#e0e0e0"),
        background: ok ? "#e8fdf0" : "#fff",
        cursor: "pointer",
        fontSize: 11,
        color: ok ? "#25D366" : "#555",
        fontWeight: ok ? 700 : 400,
        transition: "all .2s",
        whiteSpace: "nowrap",
      }}
    >
      {ok ? "✅" : "📋"}
    </button>
  );
}
