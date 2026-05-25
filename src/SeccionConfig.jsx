// Configuración del taller — admin.
// Por ahora: subir firma del representante legal y sello del taller
// para que aparezcan en PDFs de cotización / recibo.
//
// Las imágenes se guardan en Supabase Storage (bucket taller-imis-fotos,
// público) y la URL queda persistida en taller_config (key 'firma' /
// 'sello'). Al cargar la app, leerConfigTotal() las trae.

import { useEffect, useState } from "react";
import { EMPRESA_DEFAULT, getEmpresa } from "./lib/empresa.js";
import { leerConfigTotal, guardarConfig } from "./lib/config.js";
import { subirArchivoSupabase } from "./supabaseStorage.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";
import { leerEquipos, guardarEquipo, borrarEquipo } from "./lib/capacidad.js";

const INP = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none",
  fontFamily: "inherit", background: "#FAFAFA",
};

const LBL = {
  fontSize: 10, fontWeight: 700, color: "#888",
  marginBottom: 3, display: "block",
  textTransform: "uppercase", letterSpacing: 0.4,
};

export default function SeccionConfig({ onConfigCambia }) {
  const [config, setConfig] = useState(null);
  const [subiendo, setSubiendo] = useState({ firma: false, sello: false });

  useEffect(() => {
    leerConfigTotal().then(setConfig);
  }, []);

  const subir = async (tipo, file) => {
    if (!file) return;
    setSubiendo(s => ({ ...s, [tipo]: true }));
    const res = await subirArchivoSupabase(file, "config", tipo);
    setSubiendo(s => ({ ...s, [tipo]: false }));
    if (!res.ok) {
      pushToast(`No pude subir el archivo: ${res.err}`, "error");
      return;
    }
    const ok = await guardarConfig(tipo, { url: res.url, path: res.path });
    if (ok) {
      setConfig(c => ({ ...c, [tipo]: { url: res.url, path: res.path } }));
      pushToast(`${tipo === "firma" ? "Firma" : "Sello"} actualizado`, "success");
      if (onConfigCambia) onConfigCambia();
    } else {
      pushToast("Subió la imagen pero no pude guardar la referencia", "error");
    }
  };

  const eliminar = async (tipo) => {
    const ok = await guardarConfig(tipo, null);
    if (ok) {
      setConfig(c => ({ ...c, [tipo]: null }));
      pushToast(`${tipo === "firma" ? "Firma" : "Sello"} eliminado`, "success");
      if (onConfigCambia) onConfigCambia();
    }
  };

  if (!config) {
    return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>⏳ Cargando configuración...</div>;
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
    <div style={{ padding: "14px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ margin: 0, fontSize: 18, color: "#2C1654", fontWeight: 800, fontFamily: "Georgia,serif" }}>
        ⚙️ Configuración del taller
      </h1>
      <div style={{ fontSize: 11, color: "#888", marginTop: 4, marginBottom: 18 }}>
        Datos que aparecen en cotizaciones y recibos. Solo admin.
      </div>

      {/* Datos fiscales editables */}
      <DatosFiscalesEditor
        actual={config.empresa || getEmpresa()}
        onGuardar={async (datos) => {
          const ok = await guardarConfig("empresa", datos);
          if (ok) {
            setConfig(c => ({ ...c, empresa: datos }));
            pushToast("Datos del taller actualizados", "success");
            if (onConfigCambia) onConfigCambia();
          } else {
            pushToast("No pude guardar los datos", "error");
          }
        }}
      />

      {/* Firma del representante legal */}
      <Seccion titulo="🖋️ Firma del Representante Legal" color="#27AE60">
        <ImagenConfig
          imagen={config.firma}
          subiendo={subiendo.firma}
          onSubir={file => subir("firma", file)}
          onEliminar={() => eliminar("firma")}
          placeholder="Aún no subiste la firma"
          ayuda="Subí una imagen PNG con fondo transparente (ideal) o JPG. Tamaño recomendado: 400×120 px."
        />
      </Seccion>

      {/* Sello del taller */}
      <Seccion titulo="🏛️ Sello del taller" color="#1A5276">
        <ImagenConfig
          imagen={config.sello}
          subiendo={subiendo.sello}
          onSubir={file => subir("sello", file)}
          onEliminar={() => eliminar("sello")}
          placeholder="Aún no subiste el sello"
          ayuda="Subí PNG con fondo transparente. Tamaño recomendado: 200×200 px."
        />
      </Seccion>

      {/* Capacidad instalada */}
      <CapacidadEditor />



      <div style={{ marginTop: 14, padding: 10, background: "#EBF5FB", borderRadius: 8, border: "1px solid #BBDEFB", fontSize: 11, color: "#1A5276" }}>
        💡 Después de subir, abrí cualquier cotización (ej. COT-0017) y tocá <strong>📄 Imprimir</strong>.
        La firma aparece sobre la línea del Representante Legal y el sello al costado.
      </div>
    </div>
    </div>
  );
}

function Seccion({ titulo, color, children }) {
  return (
    <div style={{ marginBottom: 18, background: "#fff", border: "1px solid " + color + "22", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

// Rota una URL de imagen N grados y devuelve un File listo para subir.
async function rotarImagen(url, grados) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url + "?cb=" + Date.now(); // bust cache
  });
  const rad = (grados * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const newW = Math.round(img.width * cos + img.height * sin);
  const newH = Math.round(img.width * sin + img.height * cos);
  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext("2d");
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const file = new File([blob], "rotated.png", { type: "image/png" });
      resolve(file);
    }, "image/png");
  });
}

function ImagenConfig({ imagen, subiendo, onSubir, onEliminar, placeholder, ayuda }) {
  const rotar = async (grados) => {
    if (!imagen?.url) return;
    const file = await rotarImagen(imagen.url, grados);
    if (file) onSubir(file);
  };
  return (
    <div>
      {imagen?.url ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <img
            src={imagen.url}
            alt="preview"
            style={{ maxWidth: 200, maxHeight: 200, background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: 6 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => rotar(-90)}
                disabled={subiendo}
                title="Rotar 90° izquierda"
                style={btnRot}
              >↺ -90°</button>
              <button
                onClick={() => rotar(90)}
                disabled={subiendo}
                title="Rotar 90° derecha"
                style={btnRot}
              >↻ +90°</button>
              <button
                onClick={() => rotar(180)}
                disabled={subiendo}
                title="Rotar 180°"
                style={btnRot}
              >↻↻ 180°</button>
            </div>
            <label style={{
              padding: "7px 12px", borderRadius: 6, border: "1.5px solid #9B59B6",
              background: "#fff", color: "#9B59B6", cursor: "pointer", fontWeight: 700,
              fontSize: 12, fontFamily: "inherit", textAlign: "center",
            }}>
              🔄 Reemplazar
              <input type="file" accept="image/*" hidden
                onChange={e => onSubir(e.target.files[0])} />
            </label>
            <button
              onClick={onEliminar}
              style={{
                padding: "7px 12px", borderRadius: 6, border: "1.5px solid #fdd",
                background: "#fff8f8", color: "#DC3545", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              }}
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "20px", borderRadius: 10, border: "2px dashed #ccc",
            background: "#fafafa", color: "#666", cursor: subiendo ? "wait" : "pointer",
            fontSize: 13, fontWeight: 700, fontFamily: "inherit",
          }}>
            {subiendo ? "⏳ Subiendo..." : "📁 Elegir imagen"}
            <input type="file" accept="image/*" hidden disabled={subiendo}
              onChange={e => onSubir(e.target.files[0])} />
          </label>
          <div style={{ fontSize: 11, color: "#999", marginTop: 6, fontStyle: "italic" }}>
            {placeholder}. {ayuda}
          </div>
        </div>
      )}
    </div>
  );
}

const btnRot = {
  flex: 1,
  padding: "5px 4px",
  borderRadius: 6,
  border: "1.5px solid #E67E22",
  background: "#fff",
  color: "#E67E22",
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 700,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

function DatosFiscalesEditor({ actual, onGuardar }) {
  // Datos editables. telefonos como string separado por coma para que sea
  // más fácil editar, convertimos a array al guardar.
  const [editando, setEditando] = useState(false);
  const [d, setD] = useState(() => ({
    razonSocial: actual.razonSocial,
    nit: actual.nit,
    nrc: actual.nrc,
    actividadEconomica: actual.actividadEconomica,
    direccion: actual.direccion,
    telefonosStr: (actual.telefonos || []).join(", "),
    email: actual.email,
    rlNombre: actual.representanteLegal?.nombre || "",
    rlDui: actual.representanteLegal?.dui || "",
    rlCargo: actual.representanteLegal?.cargo || "Representante Legal",
  }));

  const guardar = () => {
    const datos = {
      razonSocial: d.razonSocial.trim(),
      nit: d.nit.trim(),
      nrc: d.nrc.trim(),
      actividadEconomica: d.actividadEconomica.trim(),
      direccion: d.direccion.trim(),
      telefonos: d.telefonosStr.split(",").map(t => t.trim()).filter(Boolean),
      email: d.email.trim(),
      representanteLegal: {
        nombre: d.rlNombre.trim(),
        dui: d.rlDui.trim(),
        cargo: d.rlCargo.trim() || "Representante Legal",
      },
    };
    onGuardar(datos);
    setEditando(false);
  };

  if (!editando) {
    return (
      <Seccion titulo="📋 Datos fiscales" color="#9B59B6">
        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>
          <div><strong>Razón social:</strong> {actual.razonSocial}</div>
          <div><strong>NIT:</strong> {actual.nit}</div>
          <div><strong>NRC:</strong> {actual.nrc}</div>
          <div><strong>Actividad:</strong> {actual.actividadEconomica}</div>
          <div><strong>Dirección:</strong> {actual.direccion}</div>
          <div><strong>Teléfonos:</strong> {(actual.telefonos || []).join(" · ")}</div>
          <div><strong>Email:</strong> {actual.email}</div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #eee" }}>
            <strong>Representante Legal:</strong> {actual.representanteLegal?.nombre}
            <br /><span style={{ color: "#888" }}>DUI: {actual.representanteLegal?.dui} · {actual.representanteLegal?.cargo}</span>
          </div>
        </div>
        <button
          onClick={() => setEditando(true)}
          style={{
            marginTop: 12, padding: "8px 16px", borderRadius: 8,
            border: "1.5px solid #9B59B6", background: "#fff",
            color: "#9B59B6", cursor: "pointer", fontWeight: 700,
            fontSize: 12, fontFamily: "inherit",
          }}
        >
          ✏️ Editar datos fiscales
        </button>
      </Seccion>
    );
  }

  return (
    <Seccion titulo="📋 Datos fiscales (editando)" color="#9B59B6">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Campo lbl="Razón social" val={d.razonSocial} onCh={v => setD({ ...d, razonSocial: v })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Campo lbl="NIT" val={d.nit} onCh={v => setD({ ...d, nit: v })} placeholder="0000-000000-000-0" />
          <Campo lbl="NRC" val={d.nrc} onCh={v => setD({ ...d, nrc: v })} placeholder="000000-0" />
        </div>
        <Campo lbl="Actividad económica" val={d.actividadEconomica} onCh={v => setD({ ...d, actividadEconomica: v })} />
        <Campo lbl="Dirección" val={d.direccion} onCh={v => setD({ ...d, direccion: v })} textarea />
        <Campo lbl="Teléfonos (separados por coma)" val={d.telefonosStr} onCh={v => setD({ ...d, telefonosStr: v })} placeholder="2451-1620, 7866-9963" />
        <Campo lbl="Email" val={d.email} onCh={v => setD({ ...d, email: v })} type="email" />

        <div style={{ marginTop: 6, paddingTop: 8, borderTop: "1px dashed #ddd" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9B59B6", marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>
            👤 Representante Legal
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Campo lbl="Nombre completo" val={d.rlNombre} onCh={v => setD({ ...d, rlNombre: v })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Campo lbl="DUI" val={d.rlDui} onCh={v => setD({ ...d, rlDui: v })} placeholder="00000000-0" />
              <Campo lbl="Cargo" val={d.rlCargo} onCh={v => setD({ ...d, rlCargo: v })} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button
            onClick={() => setEditando(false)}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1.5px solid #ccc", background: "#fff", color: "#666", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 13 }}
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: "#27AE60", color: "#fff", cursor: "pointer", fontWeight: 800, fontFamily: "inherit", fontSize: 13 }}
          >
            💾 Guardar cambios
          </button>
        </div>
      </div>
    </Seccion>
  );
}

function Campo({ lbl, val, onCh, placeholder, type, textarea }) {
  const Comp = textarea ? "textarea" : "input";
  return (
    <div>
      <label style={LBL}>{lbl}</label>
      <Comp
        type={type || "text"}
        style={textarea ? { ...INP, minHeight: 50, resize: "vertical" } : INP}
        value={val || ""}
        placeholder={placeholder}
        onChange={e => onCh(e.target.value)}
      />
    </div>
  );
}

function CapacidadEditor() {
  const [equipos, setEquipos] = useState(null);
  const [editando, setEditando] = useState(null); // null | "nuevo" | equipo

  const refrescar = async () => {
    const list = await leerEquipos();
    setEquipos(list);
  };
  useEffect(() => { refrescar(); }, []);

  if (equipos === null) {
    return <Seccion titulo="🛠️ Capacidad instalada" color="#E67E22">
      <div style={{ padding: 16, color: "#aaa" }}>⏳ Cargando...</div>
    </Seccion>;
  }

  const propios = equipos.filter(e => e.tipo === "propio");
  const subc = equipos.filter(e => e.tipo === "subcontratado");

  const eliminar = async (e) => {
    const ok = await pushConfirm({
      titulo: "Eliminar equipo",
      msg: `¿Eliminar "${e.nombre}" de la capacidad instalada?`,
      okLabel: "Eliminar", danger: true,
    });
    if (!ok) return;
    await borrarEquipo(e.id);
    refrescar();
    pushToast("Equipo eliminado", "success");
  };

  return (
    <Seccion titulo="🛠️ Capacidad instalada" color="#E67E22">
      <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
        Equipo del taller para declaraciones formales en licitaciones de gobierno (COMPRASAL).
        Se puede incluir como anexo del PDF de cotización marcando un toggle al editar la cotización.
      </div>

      <SubBloque titulo="🏛️ Equipo propio (en taller)" color="#27AE60" equipos={propios} onEditar={setEditando} onEliminar={eliminar} />
      <SubBloque titulo="🤝 Servicios subcontratados" color="#9B59B6" equipos={subc} onEditar={setEditando} onEliminar={eliminar} />

      <button
        onClick={() => setEditando("nuevo")}
        style={{
          width: "100%", padding: "10px", borderRadius: 8,
          border: "2px dashed #E67E22", background: "#FFFBF6",
          color: "#E67E22", cursor: "pointer", fontWeight: 800,
          fontSize: 13, fontFamily: "inherit", marginTop: 6,
        }}
      >
        + Agregar equipo
      </button>

      {editando && (
        <EditorEquipo
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardado={() => { setEditando(null); refrescar(); }}
        />
      )}
    </Seccion>
  );
}

function SubBloque({ titulo, color, equipos, onEditar, onEliminar }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color, marginBottom: 6 }}>
        {titulo}
      </div>
      {equipos.length === 0 ? (
        <div style={{ fontSize: 11, color: "#aaa", fontStyle: "italic", padding: 8 }}>
          (Aún no agregaste equipo de este tipo)
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {equipos.map(e => (
            <div key={e.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#2C1654" }}>
                  {e.nombre} <span style={{ color: "#888", fontWeight: 400 }}>· {e.cantidad} u.</span>
                </div>
                {e.especificacion && <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>📐 {e.especificacion}</div>}
                {e.proposito && <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>💡 {e.proposito}</div>}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => onEditar(e)} style={{ padding: "4px 8px", border: "1px solid #ccc", background: "#fff", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                  ✏️
                </button>
                <button onClick={() => onEliminar(e)} style={{ padding: "4px 8px", border: "1px solid #fdd", background: "#fff8f8", borderRadius: 5, cursor: "pointer", fontSize: 11, color: "#DC3545", fontFamily: "inherit" }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditorEquipo({ inicial, onClose, onGuardado }) {
  const [eq, setEq] = useState(() => inicial ? { ...inicial } : {
    nombre: "", tipo: "propio", cantidad: 1, especificacion: "", proposito: "", notas: "",
  });

  const guardar = async () => {
    if (!eq.nombre.trim()) { pushToast("Falta el nombre del equipo", "error"); return; }
    const res = await guardarEquipo(eq);
    if (res.ok) {
      pushToast(inicial ? "Equipo actualizado" : "Equipo agregado", "success");
      onGuardado();
    } else {
      pushToast(`No pude guardar: ${res.error}`, "error");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 18, width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#E67E22", fontFamily: "Georgia,serif" }}>
            🛠️ {inicial ? "Editar equipo" : "Agregar equipo"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[
            { id: "propio", label: "🏛️ Propio (taller)" },
            { id: "subcontratado", label: "🤝 Subcontratado" },
          ].map(t => {
            const sel = eq.tipo === t.id;
            return (
              <button key={t.id} onClick={() => setEq({ ...eq, tipo: t.id })} style={{
                flex: 1, padding: "8px", borderRadius: 8,
                border: "1.5px solid " + (sel ? "#E67E22" : "#e0e0e0"),
                background: sel ? "#E67E22" : "#fff",
                color: sel ? "#fff" : "#666",
                fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>{t.label}</button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Campo lbl="Nombre del equipo" val={eq.nombre} onCh={v => setEq({ ...eq, nombre: v })} placeholder="Ej: Máquina de coser dos agujas" />
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 8 }}>
            <Campo lbl="Cantidad" val={eq.cantidad} onCh={v => setEq({ ...eq, cantidad: parseInt(v) || 1 })} type="number" />
            <Campo lbl="Especificación técnica" val={eq.especificacion} onCh={v => setEq({ ...eq, especificacion: v })} placeholder="Ej: Ancho ≥ 1.60 m" />
          </div>
          <Campo lbl="Propósito (para qué sirve)" val={eq.proposito} onCh={v => setEq({ ...eq, proposito: v })} placeholder="Ej: Costuras paralelas en bordes" textarea />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1.5px solid #ccc", background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
            Cancelar
          </button>
          <button onClick={guardar} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#27AE60", color: "#fff", cursor: "pointer", fontWeight: 800, fontFamily: "inherit" }}>
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
