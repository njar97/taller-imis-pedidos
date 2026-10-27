// Máquinas del taller: vive como pestaña dentro de 📦 Inventario.
// Cada máquina tiene su ficha (foto, placa, voltaje, aguja, operaria) y un
// historial de reparaciones con costo. El botón «Lista para el mecánico»
// arma el mensaje con las que fallan o están paradas.

import { useState, useEffect } from "react";
import {
  ESTADOS_MAQ, estadoInfo, leerMaquinas, guardarMaquina, borrarMaquina,
  leerEventos, guardarEvento, borrarEvento, filtrarMaquinas, siguienteCodigo,
  textoListaMecanico, totalCosto, ordenarMaquinas,
} from "./lib/maquinas.js";
import { comprimirImagen } from "./lib/imagenes.js";
import { subirFotoSupabase } from "./supabaseStorage.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";

const INP = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0",
  fontSize: 14, outline: "none", boxSizing: "border-box", background: "#FAFAFA", fontFamily: "inherit",
};
const LBL = {
  fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 3, display: "block",
  textTransform: "uppercase", letterSpacing: 0.4,
};
const BTN = (bg = "#9B59B6", disabled = false) => ({
  padding: "10px 20px", borderRadius: 8, border: "none", background: disabled ? "#ccc" : bg,
  color: "#fff", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit",
});
const HOJA = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" };
const PANEL = { background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 600, maxHeight: "92vh", overflow: "auto", padding: 18 };

const hoyISO = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
const money = (n) => "$" + (Number(n) || 0).toFixed(2);

function ChipEstado({ estado, grande }) {
  const e = estadoInfo(estado);
  return (
    <span style={{ fontSize: grande ? 12 : 10, fontWeight: 800, background: e.color + "22", color: e.color,
      borderRadius: 10, padding: grande ? "4px 10px" : "2px 8px", whiteSpace: "nowrap" }}>
      {e.icon} {e.label}
    </span>
  );
}

function CampoFoto({ label, url, codigo, onCambio }) {
  const [subiendo, setSubiendo] = useState(false);
  const elegir = async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setSubiendo(true);
    try {
      const c = await comprimirImagen(f, 1100, 0.82);
      const r = await subirFotoSupabase(c.data, c.nombre, "maquinas", codigo || "sin-codigo");
      if (!r.ok) throw new Error(r.err);
      onCambio(r.url);
    } catch (e) { pushToast("No se pudo subir la foto: " + e.message, "error"); }
    finally { setSubiendo(false); ev.target.value = ""; }
  };
  return (
    <div>
      <label style={LBL}>{label}</label>
      <label className={url ? "no-invert" : undefined} style={{ display: "block", border: "1.5px dashed #ccc", borderRadius: 10, height: 120, overflow: "hidden", cursor: "pointer",
        background: url ? `#000 url("${url}") center/contain no-repeat` : "#FAFAFA", position: "relative" }}>
        {!url && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>
          {subiendo ? "⏳ Subiendo..." : "📷 Tomar o elegir foto"}</span>}
        {url && subiendo && <span style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>⏳</span>}
        <input type="file" accept="image/*" capture="environment" onChange={elegir} style={{ display: "none" }} />
      </label>
    </div>
  );
}

function FormMaquina({ inicial, codigoNuevo, onGuardar, onCerrar }) {
  const [m, setM] = useState(() => ({ codigo: codigoNuevo, tipo: "", estado: "ok", ...(inicial || {}) }));
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setM(prev => ({ ...prev, [k]: v }));
  const campo = (k, label, ph, extra = {}) => (
    <div><label style={LBL}>{label}</label>
      <input style={INP} value={m[k] || ""} onChange={e => set(k, e.target.value)} placeholder={ph} {...extra} /></div>
  );

  const guardar = async () => {
    if (!String(m.codigo || "").trim()) { pushToast("Falta el código (M01, M02...)", "error"); return; }
    if (!String(m.tipo || "").trim()) { pushToast("Falta el tipo de máquina", "error"); return; }
    setGuardando(true);
    try { await onGuardar(m); onCerrar(); }
    catch (e) { pushToast(e.message, "error"); }
    finally { setGuardando(false); }
  };

  return (
    <div style={HOJA} onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()} style={PANEL}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#2C1654", fontFamily: "Georgia,serif" }}>
          {m.id ? "✏️ Editar " + m.codigo : "🛠️ Nueva máquina"}
        </h2>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <CampoFoto label="Foto de la máquina" url={m.fotoUrl} codigo={m.codigo} onCambio={u => set("fotoUrl", u)} />
            <CampoFoto label="Foto de la placa" url={m.fotoPlacaUrl} codigo={m.codigo} onCambio={u => set("fotoPlacaUrl", u)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10 }}>
            {campo("codigo", "Código", "M21")}
            {campo("tipo", "Tipo", "Plana 1 aguja, Fileteadora 5 hilos...")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {campo("marca", "Marca", "JUKI")}
            {campo("modelo", "Modelo", "DDL-5550")}
          </div>
          {campo("serie", "N.º de serie (de la placa)", "")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div><label style={LBL}>Voltaje</label>
              <select style={INP} value={m.voltaje || ""} onChange={e => set("voltaje", e.target.value)}>
                <option value="">—</option><option>110V</option><option>220V</option><option>110/220V</option>
              </select></div>
            {campo("motor", "Motor", "Servo / embrague")}
            {campo("aguja", "Aguja", "DBx1")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {campo("operaria", "Operaria", "")}
            {campo("uso", "Para qué la usamos", "Pegar cuello camisa")}
          </div>
          <div><label style={LBL}>Estado</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ESTADOS_MAQ.map(e => {
                const on = m.estado === e.id;
                return (
                  <button key={e.id} type="button" onClick={() => set("estado", e.id)}
                    style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      border: "1.5px solid " + (on ? e.color : "#ddd"), background: on ? e.color : "#fff", color: on ? "#fff" : "#555" }}>
                    {e.icon} {e.label}
                  </button>
                );
              })}
            </div></div>
          {(m.estado === "falla" || m.estado === "parada") && (
            <div><label style={LBL}>¿Qué falla? (va en la lista del mecánico)</label>
              <textarea style={{ ...INP, minHeight: 60 }} value={m.fallaActual || ""} onChange={e => set("fallaActual", e.target.value)}
                placeholder="No corta el hilo, salta puntadas, hace ruido..." /></div>
          )}
          <div><label style={LBL}>Datos por confirmar</label>
            <input style={INP} value={m.porConfirmar || ""} onChange={e => set("porConfirmar", e.target.value)} placeholder="Ver placa, falta foto..." /></div>
          <div><label style={LBL}>Notas</label>
            <textarea style={{ ...INP, minHeight: 50 }} value={m.notas || ""} onChange={e => set("notas", e.target.value)} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCerrar} style={BTN("#888")}>Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando} style={BTN("#27AE60", guardando)}>
            {guardando ? "⏳" : "💾 Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormEvento({ maquina, onGuardar, onCerrar }) {
  const [ev, setEv] = useState({ fecha: hoyISO(), falla: maquina.fallaActual || "", trabajo: "", repuestos: "", costo: "", mecanico: "", quedo: "ok" });
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setEv(p => ({ ...p, [k]: v }));
  const guardar = async () => {
    if (!ev.trabajo.trim() && !ev.falla.trim()) { pushToast("Anotá qué falló o qué se le hizo", "error"); return; }
    setGuardando(true);
    try { await onGuardar(ev); onCerrar(); }
    catch (e) { pushToast(e.message, "error"); }
    finally { setGuardando(false); }
  };
  return (
    <div style={{ ...HOJA, zIndex: 1100 }} onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()} style={PANEL}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#2C1654", fontFamily: "Georgia,serif" }}>🔧 Reparación · {maquina.codigo}</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={LBL}>Fecha</label><input type="date" style={INP} value={ev.fecha} onChange={e => set("fecha", e.target.value)} /></div>
            <div><label style={LBL}>Mecánico</label><input style={INP} value={ev.mecanico} onChange={e => set("mecanico", e.target.value)} placeholder="El colocho" /></div>
          </div>
          <div><label style={LBL}>Qué falló</label><textarea style={{ ...INP, minHeight: 50 }} value={ev.falla} onChange={e => set("falla", e.target.value)} /></div>
          <div><label style={LBL}>Qué le hizo</label><textarea style={{ ...INP, minHeight: 50 }} value={ev.trabajo} onChange={e => set("trabajo", e.target.value)} placeholder="Ajustó la cuchilla, cambió la faja..." /></div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <div><label style={LBL}>Repuestos</label><input style={INP} value={ev.repuestos} onChange={e => set("repuestos", e.target.value)} /></div>
            <div><label style={LBL}>Costo total $</label><input style={INP} inputMode="decimal" value={ev.costo} onChange={e => set("costo", e.target.value.replace(/[^\d.]/g, ""))} /></div>
          </div>
          <div><label style={LBL}>¿Cómo quedó la máquina?</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ESTADOS_MAQ.slice(0, 3).map(e => {
                const on = ev.quedo === e.id;
                return (
                  <button key={e.id} type="button" onClick={() => set("quedo", e.id)}
                    style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      border: "1.5px solid " + (on ? e.color : "#ddd"), background: on ? e.color : "#fff", color: on ? "#fff" : "#555" }}>
                    {e.icon} {e.label}
                  </button>
                );
              })}
            </div></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCerrar} style={BTN("#888")}>Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando} style={BTN("#27AE60", guardando)}>{guardando ? "⏳" : "💾 Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

function FichaMaquina({ m, onEditar, onCerrar, onCambio }) {
  const [eventos, setEventos] = useState(null);
  const [nuevoEv, setNuevoEv] = useState(false);
  const [verFoto, setVerFoto] = useState(null);
  useEffect(() => { leerEventos(m.id).then(setEventos); }, [m.id]);

  const guardarEv = async (ev) => {
    const saved = await guardarEvento({ ...ev, maquinaId: m.id });
    setEventos(prev => [saved, ...(prev || [])].sort((a, b) => b.fecha.localeCompare(a.fecha)));
    if (ev.quedo !== m.estado || (ev.quedo === "ok" && m.fallaActual)) {
      onCambio(await guardarMaquina({ ...m, estado: ev.quedo, fallaActual: ev.quedo === "ok" ? "" : m.fallaActual }));
    }
    pushToast("Reparación anotada");
  };
  const borrarEv = async (e) => {
    const ok = await pushConfirm({ titulo: "Borrar", msg: "¿Borrar esta anotación del " + e.fecha + "?", okLabel: "Borrar", danger: true });
    if (!ok) return;
    try { await borrarEvento(e.id); setEventos(prev => prev.filter(x => x.id !== e.id)); }
    catch (err) { pushToast(err.message, "error"); }
  };

  const dato = (lbl, v) => v ? (
    <div style={{ fontSize: 13 }}><span style={{ color: "#999", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{lbl}: </span>{v}</div>
  ) : null;

  return (
    <div style={HOJA} onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()} style={PANEL}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", background: "#2C1654", borderRadius: 8, padding: "2px 10px" }}>{m.codigo}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#2C1654" }}>{m.tipo}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{[m.marca, m.modelo].filter(Boolean).join(" · ")}</div>
          </div>
          <button onClick={onCerrar} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          {[m.fotoUrl, m.fotoPlacaUrl].map((u, i) => (
            <div key={i} className={u ? "no-invert" : undefined} onClick={() => u && setVerFoto(u)}
              style={{ height: 150, borderRadius: 10, background: u ? `#111 url("${u}") center/contain no-repeat` : "#f4f4f4",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 12, cursor: u ? "zoom-in" : "default" }}>
              {!u && (i === 0 ? "Sin foto" : "Falta foto de la placa")}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <ChipEstado estado={m.estado} grande />
          {m.voltaje && <span style={{ fontSize: 13, fontWeight: 900, color: m.voltaje.startsWith("220") ? "#C0392B" : "#2980B9",
            border: "2px solid currentColor", borderRadius: 8, padding: "1px 8px" }}>⚡ {m.voltaje}</span>}
        </div>
        {m.fallaActual && <div style={{ background: "#FFF8E1", border: "1px solid #F5D76E", borderRadius: 8, padding: 8, fontSize: 13, marginBottom: 8 }}>⚠️ {m.fallaActual}</div>}
        <div style={{ display: "grid", gap: 3, marginBottom: 8 }}>
          {dato("Serie", m.serie)}{dato("Motor", m.motor)}{dato("Aguja", m.aguja)}
          {dato("Operaria", m.operaria)}{dato("Uso", m.uso)}
        </div>
        {m.porConfirmar && <div style={{ fontSize: 12, color: "#B9770E", marginBottom: 6 }}>🔎 Por confirmar: {m.porConfirmar}</div>}
        {m.notas && <div style={{ fontSize: 12, color: "#888", marginBottom: 6, whiteSpace: "pre-wrap" }}>📝 {m.notas}</div>}

        <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          <button onClick={() => setNuevoEv(true)} style={{ ...BTN("#E67E22"), flex: 1, fontSize: 13 }}>🔧 Anotar reparación</button>
          <button onClick={() => onEditar(m)} style={{ ...BTN("#7F8C8D"), fontSize: 13 }}>✏️ Editar</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid #eee", paddingTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#2C1654" }}>📒 Historial</div>
          {eventos && eventos.length > 0 && <div style={{ fontSize: 12, color: "#666" }}>{eventos.length} · gastado {money(totalCosto(eventos))}</div>}
        </div>
        {eventos === null ? <div style={{ color: "#aaa", fontSize: 12, padding: 10 }}>⏳</div>
          : eventos.length === 0 ? <div style={{ color: "#aaa", fontSize: 12, padding: 10 }}>Sin reparaciones anotadas todavía.</div>
          : eventos.map(e => (
            <div key={e.id} style={{ borderBottom: "1px solid #f2f2f2", padding: "8px 0", fontSize: 13 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <b style={{ color: "#2C1654" }}>{e.fecha}</b>
                {e.mecanico && <span style={{ color: "#888" }}>· {e.mecanico}</span>}
                <span style={{ flex: 1 }} />
                {e.costo !== "" && <b style={{ color: "#1B5E20" }}>{money(e.costo)}</b>}
                <button onClick={() => borrarEv(e)} style={{ border: "none", background: "none", color: "#ccc", cursor: "pointer" }}>✕</button>
              </div>
              {e.falla && <div style={{ color: "#B9770E" }}>Falla: {e.falla}</div>}
              {e.trabajo && <div>Trabajo: {e.trabajo}</div>}
              {e.repuestos && <div style={{ color: "#666" }}>Repuestos: {e.repuestos}</div>}
            </div>
          ))}
      </div>
      {nuevoEv && <FormEvento maquina={m} onGuardar={guardarEv} onCerrar={() => setNuevoEv(false)} />}
      {verFoto && (
        <div className="no-invert" onClick={(e) => { e.stopPropagation(); setVerFoto(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: `rgba(0,0,0,.92) url("${verFoto}") center/contain no-repeat`, cursor: "zoom-out" }} />
      )}
    </div>
  );
}

function ListaMecanico({ lista, onCerrar }) {
  const texto = textoListaMecanico(lista);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); pushToast("Lista copiada"); }
    catch { pushToast("No se pudo copiar", "error"); }
  };
  return (
    <div style={HOJA} onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()} style={PANEL}>
        <h2 style={{ margin: "0 0 10px", fontSize: 16, color: "#2C1654", fontFamily: "Georgia,serif" }}>📋 Lista para el mecánico</h2>
        {!texto ? <div style={{ color: "#666", fontSize: 14, padding: 10 }}>Ninguna máquina marcada con falla o parada. 🎉</div> : (
          <>
            <pre style={{ whiteSpace: "pre-wrap", background: "#F7F7F7", borderRadius: 8, padding: 12, fontSize: 13, fontFamily: "inherit", margin: 0 }}>{texto}</pre>
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={copiar} style={BTN("#7F8C8D")}>📋 Copiar</button>
              <a href={"https://wa.me/?text=" + encodeURIComponent(texto)} target="_blank" rel="noreferrer"
                style={{ ...BTN("#25D366"), textDecoration: "none" }}>💬 Abrir en WhatsApp</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TarjetaMaquina({ m, onAbrir }) {
  return (
    <button onClick={() => onAbrir(m)}
      style={{ textAlign: "left", background: "#fff", borderRadius: 12, padding: 0, border: "1px solid #eee", boxShadow: "0 1px 3px rgba(0,0,0,.05)",
        cursor: "pointer", fontFamily: "inherit", overflow: "hidden", display: "flex" }}>
      <div className={m.fotoUrl ? "no-invert" : undefined} style={{ width: 92, minHeight: 92, flexShrink: 0, background: m.fotoUrl ? `#111 url("${m.fotoUrl}") center/cover` : "#f2f2f2",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{!m.fotoUrl && "🛠️"}</div>
      <div style={{ flex: 1, minWidth: 0, padding: "8px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#fff", background: "#2C1654", borderRadius: 6, padding: "0 6px" }}>{m.codigo}</span>
          <span style={{ flex: 1 }} />
          <ChipEstado estado={m.estado} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#2C1654", marginTop: 4 }}>{m.tipo}</div>
        <div style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {[m.marca, m.modelo, m.voltaje].filter(Boolean).join(" · ")}
        </div>
        {m.operaria && <div style={{ fontSize: 11, color: "#888" }}>👩 {m.operaria}</div>}
        {m.porConfirmar && <div style={{ fontSize: 10, color: "#B9770E" }}>🔎 por confirmar</div>}
      </div>
    </button>
  );
}

export default function SeccionMaquinas() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busq, setBusq] = useState("");
  const [estado, setEstado] = useState("todos");
  const [abierta, setAbierta] = useState(null);
  const [editando, setEditando] = useState(null); // máquina | "nueva" | null
  const [verLista, setVerLista] = useState(false);

  useEffect(() => {
    let vivo = true;
    leerMaquinas().then(l => { if (vivo) { setLista(l); setCargando(false); } });
    return () => { vivo = false; };
  }, []);

  const reemplazar = (saved) => {
    setLista(prev => ordenarMaquinas(prev.some(x => x.id === saved.id) ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved]));
    setAbierta(a => (a && a.id === saved.id ? saved : a));
  };
  const guardar = async (m) => { reemplazar(await guardarMaquina(m)); pushToast("Máquina guardada"); };
  const quitar = async (m) => {
    const ok = await pushConfirm({ titulo: "Quitar máquina", msg: "¿Quitar " + m.codigo + " de la lista? (vendida o de baja)", okLabel: "Quitar", danger: true });
    if (!ok) return;
    try { await borrarMaquina(m.id); setLista(prev => prev.filter(x => x.id !== m.id)); setEditando(null); setAbierta(null); }
    catch (e) { pushToast(e.message, "error"); }
  };

  const vis = filtrarMaquinas(lista, busq, estado);
  const nMalas = lista.filter(m => m.estado === "falla" || m.estado === "parada").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="🔍 Buscar código, marca, operaria..."
          style={{ ...INP, flex: 1, minWidth: 180 }} />
        <button onClick={() => setVerLista(true)} style={{ ...BTN(nMalas ? "#E67E22" : "#95A5A6"), whiteSpace: "nowrap", fontSize: 13, padding: "9px 14px" }}>
          📋 Lista para el mecánico{nMalas ? ` (${nMalas})` : ""}
        </button>
        <button onClick={() => setEditando("nueva")} style={{ ...BTN("#27AE60"), whiteSpace: "nowrap", fontSize: 13, padding: "9px 14px" }}>+ Máquina</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[{ id: "todos", icon: "", label: "Todas" }, ...ESTADOS_MAQ].map(e => {
          const on = estado === e.id;
          const n = e.id === "todos" ? lista.length : lista.filter(m => m.estado === e.id).length;
          return (
            <button key={e.id} onClick={() => setEstado(e.id)}
              style={{ padding: "5px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                border: "1.5px solid " + (on ? "#2C1654" : "#ddd"), background: on ? "#2C1654" : "#fff", color: on ? "#fff" : "#555" }}>
              {e.icon} {e.label} ({n})
            </button>
          );
        })}
      </div>

      {cargando ? (
        <div style={{ color: "#aaa", fontSize: 13, padding: 20, textAlign: "center" }}>⏳ Cargando máquinas...</div>
      ) : vis.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 36, textAlign: "center", border: "2px dashed #e0e0e0" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛠️</div>
          <div style={{ fontSize: 14, color: "#666" }}>{lista.length === 0 ? "Todavía no hay máquinas. Agregá la primera." : "Ninguna coincide."}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {vis.map(m => <TarjetaMaquina key={m.id} m={m} onAbrir={setAbierta} />)}
        </div>
      )}

      {abierta && !editando && (
        <FichaMaquina m={abierta} onCerrar={() => setAbierta(null)} onEditar={setEditando} onCambio={reemplazar} />
      )}
      {editando && (
        <>
          <FormMaquina inicial={editando === "nueva" ? null : editando} codigoNuevo={siguienteCodigo(lista)}
            onGuardar={guardar} onCerrar={() => setEditando(null)} />
          {editando !== "nueva" && (
            <button onClick={() => quitar(editando)}
              style={{ position: "fixed", bottom: 18, left: 18, zIndex: 1001, border: "none", background: "#fff", color: "#DC3545", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }}>
              🗑️ Dar de baja
            </button>
          )}
        </>
      )}
      {verLista && <ListaMecanico lista={lista} onCerrar={() => setVerLista(false)} />}
    </div>
  );
}
