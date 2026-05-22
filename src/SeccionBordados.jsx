// Sección de Bordados — tabla con CRUD, cambio de estatus, modal de detalle,
// y BordadoModal para crear/editar.
// Antes vivían como SeccionBordados + BordadoModal compilados en main.js
// (~2 030 líneas).

import { BORD_E, BORD_EC, DISENO_EST, POSICIONES_BORD, SOPORTES_BORD, TIPO_DOC } from "./lib/constants.js";
import { dbBordBorrar as gsBordBorrar, dbBordGuardar as gsBordGuardar } from "./lib/db.js";
import { pushToast } from "./lib/feedback.js";
import { useDebouncedCallback } from "./lib/hooks.js";
import { Modal } from "./lib/Modal.jsx";
import { driveDownloadUrl, driveViewUrl, extractDriveId, comprimirImagen } from "./lib/imagenes.js";
import { subirArchivoSupabase, subirFotoSupabase } from "./supabaseStorage.js";
import BuscadorConfRef from "./BuscadorConfRef.jsx";
import RegistroAbonos from "./RegistroAbonos.jsx";

import { useState, useRef } from "react";

const cargarLectorBordado = () => import("./leerBordado.js").then(m => m.leerMetadataBordado);

const hoyB = () => new Date().toISOString().split("T")[0];
const diasB = f => (f ? Math.ceil((new Date(f + "T12:00:00") - new Date()) / 86400000) : null);
const fmt$B = n => "$" + parseFloat(n || 0).toFixed(2);

// ── BordadoModal ─────────────────────────────────────────

const INPS = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  background: "#FAFAF8",
};

const LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#666",
  marginBottom: 3,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};

const SEC = (c = "#1A5F5A") => ({
  fontSize: 10,
  fontWeight: 800,
  color: c,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "14px 0 8px",
  borderBottom: "2px solid " + c + "33",
  paddingBottom: 3,
});

const BORD_DEF = {
  cliente: "", telefono: "", confRef: "",
  tipoDocumento: "Consumidor Final", razonSocial: "", nit: "", nrc: "", dirFiscal: "",
  soporte: "", cantidad: "1", posicion: "Pecho izquierdo", posLibre: "",
  diseño: "", estadoDiseño: "Pendiente diseñar",
  hilos: "", puntadas: "", numColores: "", anchoMm: "", altoMm: "",
  esNuevo: "nuevo",
  linkDrive: "", calcAdj: 0, calcSelected: "",
  linkEmbDriveUrl: "", linkEmbDriveId: "", linkEmbFolderId: "",
  linkDstUrl: "", linkDstId: "", linkDstFolderId: "",
  imagenRefUrl: "", imagenRefId: "",
  precioU: "", precioT: "", anticipo: "", abonos: [],
  fechaEntrega: "", estatus: "Tomado", notas: "",
};

const redond25 = v => Math.round(v * 4) / 4;
const calcPrecioSugerido = puntStr => {
  const punt = parseInt(String(puntStr || "").replace(/[^0-9]/g, "")) || 0;
  if (!punt) return null;
  const minutos = punt / 600;
  const costoProd = minutos * (3.0 / 60);
  return {
    minutos: +minutos.toFixed(1),
    costoProd: +costoProd.toFixed(2),
    p1_5x: redond25(costoProd * 1.5),
    p2x: redond25(costoProd * 2.0),
    p3x: redond25(costoProd * 3.0),
  };
};

function BordadoModal({ initial, esAdmin, onSave, onCancel, pedidosConf, clientes = [], bordados = [] }) {
  const [f, setF] = useState(() => {
    const merged = { ...BORD_DEF, ...(initial || {}), abonos: (initial || {}).abonos || [] };
    // Defensa: bordados creados desde un pedido confección heredaban
    // tipoDocumento=null, lo que reventaba al evaluar .includes() abajo.
    if (merged.tipoDocumento == null) merged.tipoDocumento = "Consumidor Final";
    return merged;
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const [sugsB, setSugsB] = useState([]);
  const [showSugsB, setShowSugsB] = useState(false);
  const [subiendoEmb, setSubiendoEmb] = useState(false);
  const [subiendoDst, setSubiendoDst] = useState(false);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [errSubida, setErrSubida] = useState("");
  const [busqD, setBusqD] = useState("");

  const embRef = useRef();
  const dstRef = useRef();
  const imgRef = useRef();

  function buscarClientesBord(q) {
    if (!q || q.length < 2) { setSugsB([]); return; }
    const vistos = new Set();
    const res = clientes
      .filter(cl => cl.nombre && cl.nombre.toLowerCase().includes(q.toLowerCase()))
      .filter(cl => {
        if (vistos.has(cl.nombre)) return false;
        vistos.add(cl.nombre);
        return true;
      })
      .slice(0, 5);
    setSugsB(res);
  }
  const buscarClientesBordDebounced = useDebouncedCallback(buscarClientesBord, 200);

  const calcTotal = (pu, cant) => {
    const t = parseFloat(pu || 0) * parseInt(cant || 1);
    if (t > 0) set("precioT", t.toFixed(2));
  };

  const handleEmbUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoEmb(true);
    setErrSubida("");
    const leerMetadataBordado = await cargarLectorBordado();
    const [meta, subida] = await Promise.all([
      leerMetadataBordado(file),
      subirArchivoSupabase(file, "bordados-emb", f.cliente),
    ]);
    setSubiendoEmb(false);
    if (meta) {
      if (meta.puntadas) set("puntadas", String(meta.puntadas));
      if (meta.colores) set("numColores", String(meta.colores) + " colores");
      if (meta.anchoMm) set("anchoMm", String(meta.anchoMm));
      if (meta.altoMm) set("altoMm", String(meta.altoMm));
      if (meta.nombre && !f.diseño) set("diseño", meta.nombre);
      if (meta.nota) setErrSubida(meta.nota);
      if (meta.formato && meta.puntadas) {
        setErrSubida(
          "✅ " + meta.formato + ": " + meta.puntadas.toLocaleString() + " puntadas" +
          (meta.colores ? " · " + meta.colores + " colores" : "") +
          (meta.anchoMm && meta.altoMm ? " · " + meta.anchoMm + "×" + meta.altoMm + "mm" : "")
        );
      }
    }
    if (subida.ok) {
      set("linkDrive", subida.url);
      set("linkEmbDriveUrl", subida.url);
      set("linkEmbDriveId", subida.path);
      if (!f.diseño) {
        const ext = file.name.split(".").pop();
        set("diseño", file.name.replace(new RegExp("\\." + ext + "$", "i"), "").replace(/[_-]/g, " ").trim());
      }
    } else {
      setErrSubida(((meta || {}).nota ? meta.nota + "\n" : "") + "⚠️ Error subiendo: " + subida.err);
    }
    e.target.value = "";
  };

  const handleDstUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoDst(true);
    setErrSubida("");
    const leerMetadataBordado = await cargarLectorBordado();
    const [meta, subida] = await Promise.all([
      leerMetadataBordado(file),
      subirArchivoSupabase(file, "bordados-dst", f.cliente),
    ]);
    setSubiendoDst(false);
    if (meta) {
      if (meta.puntadas) set("puntadas", String(meta.puntadas));
      if (meta.colores) set("numColores", String(meta.colores) + " colores");
      if (meta.anchoMm) set("anchoMm", String(meta.anchoMm));
      if (meta.altoMm) set("altoMm", String(meta.altoMm));
      if (meta.nombre && !f.diseño) set("diseño", meta.nombre);
      if (meta.formato && meta.puntadas) {
        setErrSubida(
          "✅ " + meta.formato + ": " + meta.puntadas.toLocaleString() + " puntadas" +
          (meta.colores ? " · " + meta.colores + " colores" : "") +
          (meta.anchoMm && meta.altoMm ? " · " + meta.anchoMm + "×" + meta.altoMm + "mm" : "")
        );
      }
    }
    if (subida.ok) {
      set("linkDstUrl", subida.url);
      set("linkDstId", subida.path);
    } else {
      setErrSubida("⚠️ Error subiendo .dst: " + subida.err);
    }
    e.target.value = "";
  };

  const handleImgUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoImg(true);
    setErrSubida("");
    const comp = await comprimirImagen(file);
    const res = await subirFotoSupabase(comp.data, comp.nombre, "bordados", f.cliente);
    setSubiendoImg(false);
    if (res.ok) {
      set("imagenRefUrl", res.url);
      set("imagenRefId", res.path || "");
    } else {
      set("imagenRefUrl", comp.data);
      setErrSubida("Foto guardada localmente (servidor no disponible)");
    }
    e.target.value = "";
  };

  const nfSugerido = () => {
    const n = initial ? initial.id : "???";
    const c = (f.cliente || "Cliente").replace(/\s+/g, "-").substring(0, 12);
    const d = (f.diseño || "Diseño").replace(/\s+/g, "-").substring(0, 12);
    const fe = (f.fechaEntrega || new Date().toISOString().split("T")[0]).replace(/-/g, "");
    return `BORD-${String(n).padStart(3, "0")}_${c}_${d}_${fe}.emb`;
  };

  const elegirSugerencia = sg => {
    set("cliente", sg.nombre);
    if (sg.telefono) set("telefono", sg.telefono);
    if (sg.nit) set("nit", sg.nit);
    if (sg.nrc) set("nrc", sg.nrc);
    if (sg.razonSocial) set("razonSocial", sg.razonSocial);
    if (sg.dirFiscal) set("dirFiscal", sg.dirFiscal);
    if (sg.nit && sg.nrc) set("tipoDocumento", "Crédito Fiscal (completo)");
    setShowSugsB(false);
  };

  const usarDisenoExistente = b => {
    if (b.linkDrive) {
      set("linkDrive", b.linkDrive);
      set("linkEmbDriveUrl", b.linkEmbDriveUrl || b.linkDrive);
      set("linkEmbDriveId", b.linkEmbDriveId || "");
    }
    if (b.linkDstUrl) {
      set("linkDstUrl", b.linkDstUrl);
      set("linkDstId", b.linkDstId || "");
    }
    if (b.diseño && !f.diseño) set("diseño", b.diseño);
    if (b.puntadas && !f.puntadas) set("puntadas", b.puntadas);
    if (b.numColores && !f.numColores) set("numColores", b.numColores);
    if (b.anchoMm && !f.anchoMm) set("anchoMm", b.anchoMm);
    if (b.altoMm && !f.altoMm) set("altoMm", b.altoMm);
    setBusqD("");
  };

  const handleGuardar = () => {
    if (!f.cliente) { pushToast("Falta el nombre del cliente", "error"); return; }
    if (!f.soporte) { pushToast("Seleccioná el soporte (camisa, gorra, etc)", "error"); return; }
    if (!f.diseño)  { pushToast("Falta el nombre del diseño", "error"); return; }
    onSave(f);
  };

  const resD = busqD.length >= 2
    ? (bordados || [])
        .filter(b => b.id !== f.id && (b.linkDrive || b.linkDstUrl) &&
          ((b.cliente || "").toLowerCase().includes(busqD.toLowerCase()) ||
           (b.diseño || "").toLowerCase().includes(busqD.toLowerCase())))
        .slice(0, 5)
    : [];

  const calc = calcPrecioSugerido(f.puntadas);
  const calcCards = calc ? [
    { key: "min", lbl: "Mínimo ×1.5", base: calc.p1_5x, col: "#27AE60" },
    { key: "rec", lbl: "Recomendado ×2", base: calc.p2x, col: "#1A5F5A" },
    { key: "pre", lbl: "Premium ×3", base: calc.p3x, col: "#9B59B6" },
  ] : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 150, padding: 0 }}>
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", padding: 16, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#1A5F5A", fontFamily: "Georgia,serif", fontWeight: 800 }}>
            {initial ? "✏️ Editar bordado" : "🪡 Nuevo bordado"}
          </h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>

        {/* ── Cliente ── */}
        <div style={SEC("#1A5F5A")}>👤 Cliente</div>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <label style={LBL}>Nombre / Alias *</label>
          <input
            style={INPS}
            value={f.cliente}
            placeholder="Nombre o empresa"
            onChange={e => {
              set("cliente", e.target.value);
              buscarClientesBordDebounced(e.target.value);
              setShowSugsB(true);
            }}
            onBlur={() => setTimeout(() => setShowSugsB(false), 150)}
          />
          {showSugsB && sugsB.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 8, zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
              {sugsB.map((sg, i) => (
                <div key={i} onClick={() => elegirSugerencia(sg)} style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: "#1A5F5A" }}>{sg.nombre}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                    {sg.telefono && <span style={{ fontSize: 11, color: "#aaa" }}>📱 {sg.telefono}</span>}
                    {sg.nit && <span style={{ fontSize: 11, color: "#27AE60", fontWeight: 700 }}>📋 CF</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Teléfono / WhatsApp</label>
          <input style={INPS} value={f.telefono} placeholder="Para avisar" onChange={e => set("telefono", e.target.value)} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>¿Viene de pedido de confección con bordado?</label>
          <BuscadorConfRef
            pedidosConf={(pedidosConf || []).filter(p => p.tieneBordado && !["Entregado", "Cancelado"].includes(p.estatus))}
            value={f.confRef}
            soloConBordado
            onChange={(val, ped) => {
              set("confRef", val);
              if (ped && !f.cliente) {
                set("cliente", ped.cliente);
                set("telefono", ped.telefono || "");
              }
            }}
          />
        </div>

        {/* ── Facturación ── */}
        <div style={SEC("#C9A227")}>🧾 Facturación</div>
        <div style={{ marginBottom: 8 }}>
          <label style={LBL}>Tipo de documento</label>
          <select style={INPS} value={f.tipoDocumento} onChange={e => set("tipoDocumento", e.target.value)}>
            {TIPO_DOC.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        {f.tipoDocumento && f.tipoDocumento !== "Consumidor Final" && (
          <div style={{
            background: String(f.tipoDocumento).includes("pendiente") ? "#FFF8E1" : "#F1F8E9",
            border: "1.5px solid " + (String(f.tipoDocumento).includes("pendiente") ? "#FFC107" : "#8BC34A"),
            borderRadius: 10, padding: 12, marginBottom: 8,
          }}>
            {String(f.tipoDocumento).includes("pendiente") && (
              <div style={{ fontSize: 11, color: "#856404", fontWeight: 700, marginBottom: 8 }}>
                ⚠️ Pendiente recibir datos fiscales del cliente
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={LBL}>Razón Social</label>
                <input style={INPS} value={f.razonSocial} placeholder="Nombre legal" onChange={e => set("razonSocial", e.target.value)} />
              </div>
              <div>
                <label style={LBL}>NIT</label>
                <input style={INPS} value={f.nit} placeholder="0000-000000-000-0" onChange={e => set("nit", e.target.value)} />
              </div>
              <div>
                <label style={LBL}>NRC</label>
                <input style={INPS} value={f.nrc} placeholder="000000-0" onChange={e => set("nrc", e.target.value)} />
              </div>
              <div>
                <label style={LBL}>Dirección fiscal</label>
                <input style={INPS} value={f.dirFiscal} placeholder="Para la factura" onChange={e => set("dirFiscal", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── Soporte del bordado ── */}
        <div style={SEC("#C0392B")}>🧥 Soporte del bordado</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={LBL}>Tipo de soporte *</label>
            <select style={INPS} value={f.soporte} onChange={e => set("soporte", e.target.value)}>
              <option value="">— Seleccionar —</option>
              {SOPORTES_BORD.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Cantidad de piezas</label>
            <input
              style={INPS}
              type="number"
              min="1"
              value={f.cantidad}
              onChange={e => {
                set("cantidad", e.target.value);
                calcTotal(f.precioU, e.target.value);
              }}
            />
          </div>
          <div>
            <label style={LBL}>Posición</label>
            <select style={INPS} value={f.posicion} onChange={e => set("posicion", e.target.value)}>
              {POSICIONES_BORD.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {f.posicion === "Libre/Otra" && (
          <div style={{ marginBottom: 10 }}>
            <label style={LBL}>Descripción de la posición</label>
            <input style={INPS} value={f.posLibre} placeholder="Dónde exactamente va el bordado..." onChange={e => set("posLibre", e.target.value)} />
          </div>
        )}

        {/* ── Diseño Wilcom ── */}
        <div style={SEC("#1A5F5A")}>🪡 Diseño Wilcom</div>
        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>🔍 ¿Ya existe este diseño?</label>
          <input
            style={{ ...INPS, marginBottom: 4 }}
            value={busqD}
            placeholder="Ej: COED, Logo empresa..."
            onChange={e => setBusqD(e.target.value)}
          />
          {resD.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {resD.map(b => (
                <div
                  key={b.id}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f0fff8", border: "1.5px solid #1A5F5A44", borderRadius: 8 }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1A5F5A" }}>
                      BORD-{String(b.id).padStart(3, "0")} · {b.cliente}
                    </div>
                    <div style={{ fontSize: 11, color: "#555" }}>
                      {b.diseño || "—"}
                      {b.linkDrive ? " · ✅ .emb" : ""}
                      {b.linkDstUrl ? " · ✅ .dst" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => usarDisenoExistente(b)}
                    style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: "#1A5F5A", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 11 }}
                  >
                    Usar este →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* ── .emb upload ── */}
            <div>
              <label style={LBL}>📁 Editable Wilcom (.emb)</label>
              <input type="file" accept=".emb" ref={embRef} style={{ display: "none" }} onChange={handleEmbUpload} />
              {f.linkDrive ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F1FFF4", border: "1.5px solid #28A745", borderRadius: 8 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#155724", fontSize: 12 }}>Archivo en Google Drive</div>
                    {esAdmin && (
                      <a
                        href={f.linkEmbFolderId ? "https://drive.google.com/drive/folders/" + f.linkEmbFolderId : driveViewUrl(f.linkEmbDriveId || extractDriveId(f.linkDrive))}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: "#1A5F5A" }}
                      >
                        📁 Abrir en Drive →
                      </a>
                    )}
                    {!esAdmin && (
                      <a
                        href={f.linkDrive}
                        download
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: "#fff", background: "#1A5F5A", padding: "4px 10px", borderRadius: 6, textDecoration: "none", fontWeight: 700 }}
                      >
                        ⬇️ .emb
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      set("linkDrive", "");
                      set("linkEmbDriveUrl", "");
                      set("linkEmbDriveId", "");
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16 }}
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => embRef.current && embRef.current.click()}
                  disabled={subiendoEmb}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "2px dashed #1A5F5A44", background: "#F0FFF8", color: "#1A5F5A", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {subiendoEmb ? "⏳ Subiendo a Drive..." : "📁 Seleccionar archivo .emb y subir"}
                </button>
              )}
              {(f.cliente || f.diseño) && !f.linkDrive && (
                <div style={{ marginTop: 5, padding: "5px 10px", background: "#EFF4FF", borderRadius: 7, fontSize: 11, color: "#3A3A8A" }}>
                  📁 Nombre sugerido: <code style={{ fontFamily: "monospace" }}>{nfSugerido()}</code>
                </div>
              )}
            </div>

            {/* ── .dst upload ── */}
            <div>
              <label style={LBL}>🎯 Listo para bordar (.dst/.pes)</label>
              <input type="file" accept=".dst,.pes,.jef,.exp,.vp3" ref={dstRef} style={{ display: "none" }} onChange={handleDstUpload} />
              {f.linkDstUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#F1FFF4", border: "1.5px solid #28A745", borderRadius: 8 }}>
                  <span>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#155724", fontSize: 12 }}>.dst en Drive</div>
                    <a
                      href={esAdmin ? (f.linkDstFolderId ? "https://drive.google.com/drive/folders/" + f.linkDstFolderId : driveViewUrl(f.linkDstId || extractDriveId(f.linkDstUrl))) : f.linkDstUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: "#1A5F5A" }}
                    >
                      {esAdmin ? "📁 Abrir en Drive →" : "Ver"}
                    </a>
                    {!esAdmin && (
                      <a
                        href={driveDownloadUrl(f.linkDstId || extractDriveId(f.linkDstUrl))}
                        download
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: "#fff", background: "#1A5F5A", padding: "4px 10px", borderRadius: 6, textDecoration: "none", fontWeight: 700 }}
                      >
                        ⬇️ Descargar .dst
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => { set("linkDstUrl", ""); set("linkDstId", ""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 16 }}
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => dstRef.current && dstRef.current.click()}
                  disabled={subiendoDst}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "2px dashed #1A5F5A44", background: "#F0FFF8", color: "#1A5F5A", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {subiendoDst ? "⏳ Subiendo..." : "🎯 Subir .dst y leer datos"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Imagen de referencia ── */}
        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>📸 Imagen de referencia del diseño</label>
          <input type="file" accept="image/*" ref={imgRef} style={{ display: "none" }} onChange={handleImgUpload} />
          {f.imagenRefUrl ? (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <img src={f.imagenRefUrl} alt="ref" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1.5px solid #e0e0e0", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#28A745", fontWeight: 700, marginBottom: 4 }}>✅ Imagen de referencia</div>
                <button
                  onClick={() => { set("imagenRefUrl", ""); set("imagenRefId", ""); }}
                  style={{ fontSize: 11, color: "#E63946", background: "none", border: "1px solid #fdd", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
                >
                  Quitar imagen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => imgRef.current && imgRef.current.click()}
              disabled={subiendoImg}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "2px dashed #E91E8C44", background: "#FFF0F8", color: "#C2185B", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {subiendoImg ? "⏳ Subiendo imagen..." : "📷 Subir imagen de referencia"}
            </button>
          )}
        </div>

        {errSubida && (
          <div style={{ marginBottom: 8, padding: "6px 10px", background: "#FFF3CD", borderRadius: 7, fontSize: 11, color: "#856404" }}>
            ⚠️ {errSubida}
          </div>
        )}

        {/* ── Detalles del diseño ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={LBL}>Nombre del diseño *</label>
            <input style={INPS} value={f.diseño} placeholder="Ej: Logo Empresa ABC" onChange={e => set("diseño", e.target.value)} />
          </div>
          <div>
            <label style={LBL}>Estado del diseño</label>
            <select style={INPS} value={f.estadoDiseño} onChange={e => set("estadoDiseño", e.target.value)}>
              {DISENO_EST.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Colores de hilo (cantidad)</label>
            <input style={INPS} value={f.numColores} placeholder="Ej: 3 colores" onChange={e => set("numColores", e.target.value)} />
          </div>
          <div>
            <label style={LBL}>Nombres de hilos</label>
            <input style={INPS} value={f.hilos} placeholder="Ej: Azul marino, Blanco, Dorado" onChange={e => set("hilos", e.target.value)} />
          </div>
          <div>
            <label style={LBL}>Ancho del diseño (mm)</label>
            <input style={INPS} type="number" value={f.anchoMm} placeholder="Ej: 85" onChange={e => set("anchoMm", e.target.value)} />
          </div>
          <div>
            <label style={LBL}>Alto del diseño (mm)</label>
            <input style={INPS} type="number" value={f.altoMm} placeholder="Ej: 60" onChange={e => set("altoMm", e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Puntadas totales del diseño</label>
          <input style={INPS} value={f.puntadas} placeholder="Ej: 8500 (sin comas)" onChange={e => set("puntadas", e.target.value)} />
        </div>

        {/* ── Calculadora de precio ── */}
        {calc && (
          <div style={{ marginBottom: 12, background: "#F0FFF8", border: "1.5px solid #A8D8A8", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#1A5F5A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              🧮 Calculadora de precio sugerido
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10, fontSize: 12 }}>
              <div style={{ background: "#fff", borderRadius: 7, padding: "7px 10px" }}>
                <div style={{ color: "#aaa", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>⏱ Tiempo estimado</div>
                <div style={{ fontWeight: 800, color: "#2C1654", fontSize: 15, marginTop: 2 }}>{calc.minutos} min</div>
                <div style={{ color: "#aaa", fontSize: 10 }}>por pieza a 600 ptas/min</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 7, padding: "7px 10px" }}>
                <div style={{ color: "#aaa", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>⚙️ Costo máquina</div>
                <div style={{ fontWeight: 800, color: "#E67E22", fontSize: 15, marginTop: 2 }}>${calc.costoProd}/pieza</div>
                <div style={{ color: "#aaa", fontSize: 10 }}>$3.00/hora (amortización $0.91 + hilo $1.50 + energía + margen)</div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1A5F5A", marginBottom: 6 }}>
              Precio de venta sugerido por pieza:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
              {calcCards.map(card => {
                const adj = parseFloat(f.calcAdj) || 0;
                const precio = Math.max(0.05, Math.round((card.base + adj) * 20) / 20);
                const sel = f.calcSelected === card.key;
                return (
                  <div
                    key={card.key}
                    style={{
                      borderRadius: 10,
                      border: sel ? "3px solid " + card.col : "2px solid " + card.col + "44",
                      background: sel ? card.col + "11" : "#fff",
                      padding: "8px 6px",
                      textAlign: "center",
                      boxShadow: sel ? "0 2px 10px " + card.col + "44" : "none",
                      transform: sel ? "scale(1.03)" : "scale(1)",
                      transition: "all 0.15s",
                    }}
                  >
                    {sel && (
                      <div style={{ fontSize: 9, color: card.col, fontWeight: 900, marginBottom: 2, letterSpacing: 1 }}>
                        ✓ SELECCIONADO
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: "#888", marginBottom: 4, fontWeight: 700 }}>{card.lbl}</div>
                    <div style={{ fontWeight: 900, color: card.col, fontSize: 22, marginBottom: 6 }}>
                      ${precio.toFixed(2)}
                    </div>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <button
                        onClick={() => {
                          const a = (parseFloat(f.calcAdj) || 0) - 0.05;
                          const p = Math.max(0.05, Math.round((card.base + a) * 20) / 20);
                          set("calcAdj", a);
                          set("precioU", p.toFixed(2));
                          calcTotal(p, f.cantidad);
                          set("calcSelected", card.key);
                        }}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: "1px solid " + card.col + "66", background: "#f8f8f8", cursor: "pointer", fontWeight: 900, fontSize: 16, color: card.col, padding: 0 }}
                      >−</button>
                      <button
                        onClick={() => {
                          set("precioU", precio.toFixed(2));
                          calcTotal(precio, f.cantidad);
                          set("calcSelected", card.key);
                        }}
                        style={{ flex: 2, height: 28, borderRadius: 6, border: "1px solid " + card.col + "66", background: sel ? card.col : card.col + "11", cursor: "pointer", fontSize: 11, fontWeight: 700, color: sel ? "#fff" : card.col, padding: 0 }}
                      >
                        {sel ? "✓ Aplicado" : "Aplicar"}
                      </button>
                      <button
                        onClick={() => {
                          const a = (parseFloat(f.calcAdj) || 0) + 0.05;
                          const p = Math.round((card.base + a) * 20) / 20;
                          set("calcAdj", a);
                          set("precioU", p.toFixed(2));
                          calcTotal(p, f.cantidad);
                          set("calcSelected", card.key);
                        }}
                        style={{ flex: 1, height: 28, borderRadius: 6, border: "1px solid " + card.col + "66", background: "#f8f8f8", cursor: "pointer", fontWeight: 900, fontSize: 16, color: card.col, padding: 0 }}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: "#aaa", textAlign: "center", marginTop: 6 }}>
              − / + ajusta los 3 precios a la vez · Aplicar selecciona
            </div>
          </div>
        )}

        {/* ── Pago y entrega ── */}
        {esAdmin ? (
          <>
            <div style={SEC("#27AE60")}>💰 Pago y Entrega</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={LBL}>Precio/pieza ($)</label>
                <input
                  style={INPS}
                  type="number"
                  value={f.precioU}
                  placeholder="0.00"
                  onChange={e => {
                    set("precioU", e.target.value);
                    calcTotal(e.target.value, f.cantidad);
                  }}
                />
              </div>
              <div>
                <label style={LBL}>Total ($)</label>
                <input style={INPS} type="number" value={f.precioT} placeholder="0.00" onChange={e => set("precioT", e.target.value)} />
              </div>
              <div>
                <label style={LBL}>Fecha entrega</label>
                <input style={INPS} type="date" value={f.fechaEntrega} onChange={e => set("fechaEntrega", e.target.value)} />
              </div>
            </div>
            <RegistroAbonos
              abonos={f.abonos || []}
              precioTotal={f.precioT}
              onChange={v => {
                set("abonos", v);
                set("anticipo", v.reduce((s, a) => s + parseFloat(a.monto || 0), 0).toFixed(2));
              }}
              esAdmin
            />
          </>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <label style={LBL}>Fecha de entrega</label>
              <input style={INPS} type="date" value={f.fechaEntrega} onChange={e => set("fechaEntrega", e.target.value)} />
            </div>
            <RegistroAbonos
              abonos={f.abonos || []}
              precioTotal={f.precioT}
              onChange={v => {
                set("abonos", v);
                set("anticipo", v.reduce((s, a) => s + parseFloat(a.monto || 0), 0).toFixed(2));
              }}
              esAdmin={false}
            />
          </>
        )}

        {/* ── Estado ── */}
        <div style={SEC("#007BFF")}>📌 Estado</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <label style={LBL}>Estatus</label>
            <select style={INPS} value={f.estatus} onChange={e => set("estatus", e.target.value)}>
              {BORD_E.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Notas internas</label>
            <input style={INPS} value={f.notas} placeholder="Instrucciones especiales..." onChange={e => set("notas", e.target.value)} />
          </div>
        </div>

        {/* ── Acciones ── */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#666" }}>
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "#1A5F5A", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 14 }}
          >
            💾 Guardar bordado
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SeccionBordados ──────────────────────────────────────

export default function SeccionBordados({
  bordados,
  setBordados,
  nextBordId,
  setNextBordId,
  pedidosConf,
  esAdmin,
  clientes = [],
  upsertClienteLocal,
  exportarPedidoPDF,
}) {
  const [busq, setBusq] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [modal, setModal] = useState(null); // null | "nuevo" | bordado
  const [detalle, setDetalle] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const lista = bordados.filter(b => {
    const q = busq.toLowerCase();
    const m = b.cliente.toLowerCase().includes(q) ||
              b.diseño.toLowerCase().includes(q) ||
              b.soporte.toLowerCase().includes(q);
    const e = filtro === "Todos" || b.estatus === filtro;
    return m && e;
  });

  const sinDrive = bordados.filter(b => !["Entregado", "Cancelado"].includes(b.estatus) && !b.linkDrive).length;
  const activos = bordados.filter(b => !["Entregado", "Cancelado"].includes(b.estatus)).length;
  const porCobrar = bordados
    .filter(b => b.estatus !== "Cancelado" && b.precioT)
    .reduce((s, b) => s + (parseFloat(b.precioT || 0) - parseFloat(b.anticipo || 0)), 0);
  const conteos = BORD_E.reduce((a, e) => ({ ...a, [e]: bordados.filter(b => b.estatus === e).length }), {});

  function guardar(form) {
    const isNuevo = modal === "nuevo";
    const id = isNuevo ? nextBordId : modal.id;
    const p = { ...form, id, fecha: isNuevo ? hoyB() : (modal.fecha || hoyB()) };
    if (isNuevo) {
      setBordados(prev => [...prev, p]);
      setNextBordId(n => n + 1);
    } else {
      setBordados(prev => prev.map(b => (b.id === id ? p : b)));
    }
    setModal(null);
    gsBordGuardar(p);
    if (p.cliente && upsertClienteLocal) {
      upsertClienteLocal(p.cliente, {
        telefono: p.telefono, nit: p.nit, nrc: p.nrc,
        razonSocial: p.razonSocial, dirFiscal: p.dirFiscal,
      });
    }
  }

  function eliminar(id) {
    setBordados(prev => prev.filter(b => b.id !== id));
    setConfirm(null);
    setDetalle(null);
    gsBordBorrar(id);
  }

  function cambiarEstatus(id, est) {
    setBordados(prev => {
      const nuevos = prev.map(b => (b.id === id ? { ...b, estatus: est } : b));
      gsBordGuardar(nuevos.find(b => b.id === id));
      return nuevos;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Header ── (responsive: en mobile se apila, en desktop una fila) */}
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px", minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 16, color: "#1A5F5A", fontWeight: 800, fontFamily: "Georgia,serif" }}>
            🪡 Bordados
          </h1>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            {bordados.length} pedido(s) · {activos} activos
            {esAdmin && ` · ${fmt$B(porCobrar)} por cobrar`}
            {esAdmin && sinDrive > 0 && <span style={{ color: "#856404", fontWeight: 700 }}> · ⚠️ {sinDrive} sin Drive</span>}
          </div>
        </div>
        <input
          value={busq}
          onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none", flex: "1 1 120px", minWidth: 100, fontFamily: "inherit" }}
        />
        <button
          onClick={() => setModal("nuevo")}
          style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#1A5F5A", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}
        >
          🪡 Nuevo
        </button>
      </div>

      {/* ── Tabs de filtro ── */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #eee", padding: "0 12px", overflowX: "auto", flexShrink: 0 }}>
        {["Todos", ...BORD_E].map(s => {
          const cnt = s === "Todos" ? bordados.length : (conteos[s] || 0);
          const act = filtro === s;
          return (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              style={{
                padding: "7px 8px",
                border: "none",
                background: "none",
                borderBottom: act ? "2.5px solid #1A5F5A" : "2.5px solid transparent",
                color: act ? "#1A5F5A" : "#999",
                fontWeight: act ? 700 : 400,
                cursor: "pointer",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                gap: 3,
                whiteSpace: "nowrap",
              }}
            >
              {s}
              <span style={{ background: act ? "#1A5F5A" : "#eee", color: act ? "#fff" : "#aaa", borderRadius: 20, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Lista / Tabla ── */}
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#ccc" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🪡</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#aaa" }}>No hay pedidos de bordado</div>
            <div style={{ fontSize: 13, color: "#bbb", marginTop: 4 }}>Presiona "🪡 Nuevo" para registrar el primero</div>
          </div>
        ) : (
          <>
            <TablaBordados
              lista={lista}
              esAdmin={esAdmin}
              setDetalle={setDetalle}
              setModal={setModal}
              setConfirm={setConfirm}
              cambiarEstatus={cambiarEstatus}
            />
            <CardsBordados
              lista={lista}
              esAdmin={esAdmin}
              setDetalle={setDetalle}
              setModal={setModal}
              setConfirm={setConfirm}
              cambiarEstatus={cambiarEstatus}
            />
          </>
        )}
      </div>

      {/* ── Modal de edición ── */}
      {modal && (
        <BordadoModal
          initial={modal !== "nuevo" ? modal : null}
          esAdmin={esAdmin}
          onSave={guardar}
          onCancel={() => setModal(null)}
          pedidosConf={pedidosConf}
          clientes={clientes || []}
          bordados={bordados}
        />
      )}

      {/* ── Modal de detalle ── */}
      {detalle && (
        <DetalleBordado
          detalle={detalle}
          esAdmin={esAdmin}
          onClose={() => setDetalle(null)}
          onEditar={() => { setModal(detalle); setDetalle(null); }}
          onCambiarEstatus={est => {
            setDetalle({ ...detalle, estatus: est });
            cambiarEstatus(detalle.id, est);
          }}
          onConfirmar={() => setConfirm(detalle.id)}
          exportarPedidoPDF={exportarPedidoPDF}
        />
      )}

      {/* ── Confirmar borrado ── */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", color: "#1A5F5A" }}>¿Eliminar bordado?</h3>
            <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setConfirm(null)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirm)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#E63946", color: "#fff", cursor: "pointer", fontWeight: 700 }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────

function LinksDrive({ b, esAdmin }) {
  if (!b.linkDrive && !b.linkDstUrl) {
    return (
      <span style={{ background: "#FFF3CD", color: "#856404", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
        ⚠️ Sin respaldo
      </span>
    );
  }
  return (
    <>
      {b.linkDrive && (
        <a
          href={esAdmin
            ? (b.linkEmbFolderId ? "https://drive.google.com/drive/folders/" + b.linkEmbFolderId : driveViewUrl(b.linkEmbDriveId || extractDriveId(b.linkDrive)))
            : driveDownloadUrl(b.linkEmbDriveId || extractDriveId(b.linkDrive))}
          target="_blank"
          rel="noreferrer"
          style={{ display: "block", fontSize: 10, color: "#155724", fontWeight: 700, marginBottom: 2 }}
        >
          {esAdmin ? "📁 .emb" : "⬇️ .emb"}
        </a>
      )}
      {b.linkDstUrl && (
        <a
          href={esAdmin
            ? (b.linkDstFolderId ? "https://drive.google.com/drive/folders/" + b.linkDstFolderId : driveViewUrl(b.linkDstId || extractDriveId(b.linkDstUrl)))
            : driveDownloadUrl(b.linkDstId || extractDriveId(b.linkDstUrl))}
          target="_blank"
          rel="noreferrer"
          style={{ display: "block", fontSize: 10, color: "#1A5F5A", fontWeight: 700 }}
        >
          {esAdmin ? "🎯 .dst" : "⬇️ .dst"}
        </a>
      )}
    </>
  );
}

function TablaBordados({ lista, esAdmin, setDetalle, setModal, setConfirm, cambiarEstatus }) {
  return (
    <table className="tabla-pedidos" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
      <thead>
        <tr>
          {["ID", "Cliente", "Diseño / Soporte", "Drive", "Piezas", esAdmin ? "Pago" : "", "Entrega", "Estatus", ""].map((h, i) => (
            <th key={i} style={{ padding: "3px 9px", fontSize: 9, fontWeight: 700, color: "#bbb", textAlign: "left", textTransform: "uppercase" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lista.map(b => {
          const saldo = parseFloat(b.precioT || 0) - parseFloat(b.anticipo || 0);
          const dias = diasB(b.fechaEntrega);
          const urg = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(b.estatus);
          const col = BORD_EC[b.estatus] || BORD_EC["Tomado"];
          return (
            <tr key={b.id} onClick={() => setDetalle(b)} style={{ background: "#fff", cursor: "pointer" }}>
              <td style={{ padding: "9px 9px", borderRadius: "9px 0 0 9px", fontWeight: 800, fontFamily: "monospace", fontSize: 10, color: "#1A5F5A" }}>
                BORD-{String(b.id).padStart(3, "0")}
              </td>
              <td style={{ padding: "9px 9px" }}>
                <div style={{ fontWeight: 700, color: "#222", fontSize: 13 }}>{b.cliente}</div>
                {b.telefono && <div style={{ fontSize: 10, color: "#aaa" }}>📱 {b.telefono}</div>}
                {b.confRef && <div style={{ fontSize: 10, color: "#9B59B6", fontWeight: 700 }}>🔗 Conf. #{b.confRef}</div>}
              </td>
              <td style={{ padding: "9px 9px" }}>
                <div style={{ fontWeight: 600, color: "#333", fontSize: 12 }}>{b.diseño}</div>
                <div style={{ fontSize: 10, color: "#aaa" }}>{b.soporte} · {b.posicion}</div>
                {b.hilos && <div style={{ fontSize: 10, color: "#aaa" }}>🧵 {b.hilos}</div>}
                {b.imagenRefUrl && (
                  <img src={b.imagenRefUrl} alt="ref" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 5, border: "1px solid #e0e0e0", marginTop: 3, display: "block" }} />
                )}
              </td>
              <td style={{ padding: "9px 9px" }}>
                <LinksDrive b={b} esAdmin={esAdmin} />
              </td>
              <td style={{ padding: "9px 9px", textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#222" }}>{b.cantidad || "—"}</div>
                {b.precioU && <div style={{ fontSize: 10, color: "#aaa" }}>${b.precioU}/u</div>}
              </td>
              {esAdmin && (
                <td style={{ padding: "9px 9px" }}>
                  {b.precioT ? (
                    <>
                      <div style={{ fontWeight: 700, color: "#2C1654", fontSize: 13 }}>{fmt$B(b.precioT)}</div>
                      <div style={{ fontSize: 10, color: saldo > 0 ? "#E63946" : "#28A745" }}>
                        {saldo > 0 ? "Resta " + fmt$B(saldo) : "✅ Pagado"}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: "#ddd" }}>—</span>
                  )}
                </td>
              )}
              <td style={{ padding: "9px 9px" }}>
                {b.fechaEntrega ? (
                  <>
                    <div style={{ fontSize: 11, color: urg ? "#E63946" : "#555", fontWeight: urg ? 700 : 400 }}>
                      {urg ? "⚠️ " : ""}{b.fechaEntrega}
                    </div>
                    {dias !== null && !["Entregado", "Cancelado"].includes(b.estatus) && (
                      <div style={{ fontSize: 10, color: dias < 0 ? "#E63946" : dias <= 2 ? "#FD7E14" : "#aaa" }}>
                        {dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d"}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ color: "#ddd", fontSize: 11 }}>—</span>
                )}
              </td>
              <td style={{ padding: "9px 9px" }}>
                <select
                  value={b.estatus}
                  onChange={e => cambiarEstatus(b.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ border: "none", background: col.bg, color: col.fg, padding: "3px 8px", borderRadius: 20, fontWeight: 700, fontSize: 10, cursor: "pointer" }}
                >
                  {BORD_E.map(s => <option key={s}>{s}</option>)}
                </select>
              </td>
              <td style={{ padding: "9px 9px", borderRadius: "0 9px 9px 0" }}>
                <div style={{ display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setModal(b)}
                    style={{ padding: "4px 8px", borderRadius: 6, border: "1.5px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 11 }}
                  >✏️</button>
                  {esAdmin && (
                    <button
                      onClick={() => setConfirm(b.id)}
                      style={{ padding: "4px 7px", borderRadius: 6, border: "1.5px solid #fdd", background: "#fff8f8", cursor: "pointer", fontSize: 11 }}
                    >🗑️</button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CardsBordados({ lista, esAdmin, setDetalle, setModal, setConfirm, cambiarEstatus }) {
  return (
    <div className="cards-pedidos" style={{ flexDirection: "column", display: "none" }}>
      {lista.map(b => {
        const saldo = parseFloat(b.precioT || 0) - parseFloat(b.anticipo || 0);
        const dias = diasB(b.fechaEntrega);
        const urg = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(b.estatus);
        const col = BORD_EC[b.estatus] || BORD_EC["Tomado"];
        return (
          <div
            key={b.id}
            onClick={() => setDetalle(b)}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: urg ? "1.5px solid #FD7E14" : "1.5px solid transparent",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#1A5F5A", fontWeight: 800, fontFamily: "monospace" }}>
                  BORD-{String(b.id).padStart(3, "0")}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#2C1654" }}>{b.cliente}</div>
                {b.telefono && <div style={{ fontSize: 12, color: "#555" }}>📱 {b.telefono}</div>}
                {b.confRef && <div style={{ fontSize: 11, color: "#9B59B6", fontWeight: 700 }}>🔗 Conf. #{b.confRef}</div>}
              </div>
              <select
                value={b.estatus}
                onChange={e => { e.stopPropagation(); cambiarEstatus(b.id, e.target.value); }}
                onClick={e => e.stopPropagation()}
                style={{ border: "none", background: col.bg, color: col.fg, padding: "5px 8px", borderRadius: 20, fontWeight: 700, fontSize: 11, cursor: "pointer", maxWidth: 130 }}
              >
                {BORD_E.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 4 }}>{b.diseño}</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{b.soporte} · {b.posicion}</div>
            {b.imagenRefUrl && (
              <img src={b.imagenRefUrl} alt="ref" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 7, border: "1px solid #e0e0e0", marginBottom: 6 }} />
            )}
            {b.fechaEntrega && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: urg ? "#E63946" : "#555", fontWeight: urg ? 700 : 400 }}>
                  {urg ? "⚠️ " : "📌 "}{b.fechaEntrega}
                </span>
                {dias !== null && !["Entregado", "Cancelado"].includes(b.estatus) && (
                  <span style={{
                    fontSize: 11,
                    background: dias < 0 ? "#F8D7DA" : dias <= 2 ? "#FFF3CD" : "#e8f5e9",
                    color: dias < 0 ? "#721C24" : dias <= 2 ? "#856404" : "#155724",
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontWeight: 700,
                  }}>
                    {dias < 0 ? `Venció ${Math.abs(dias)}d` : dias === 0 ? "¡Hoy!" : `${dias}d`}
                  </span>
                )}
              </div>
            )}
            {esAdmin && b.precioT && (
              <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#2C1654" }}>{fmt$B(b.precioT)}</span>
                {saldo > 0 ? (
                  <span style={{ fontSize: 12, color: "#E63946", fontWeight: 700 }}>Resta {fmt$B(saldo)}</span>
                ) : (
                  <span style={{ fontSize: 12, color: "#28A745", fontWeight: 700 }}>✅ Pagado</span>
                )}
              </div>
            )}
            <div
              onClick={e => e.stopPropagation()}
              className="card-actions"
              style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}
            >
              {(b.linkDrive || b.linkDstUrl) && (
                <>
                  {b.linkDrive && (
                    <a
                      href={esAdmin
                        ? (b.linkEmbFolderId ? "https://drive.google.com/drive/folders/" + b.linkEmbFolderId : driveViewUrl(b.linkEmbDriveId || extractDriveId(b.linkDrive)))
                        : driveDownloadUrl(b.linkEmbDriveId || extractDriveId(b.linkDrive))}
                      target="_blank"
                      rel="noreferrer"
                      style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #1A5F5A33", background: "#f0fff8", color: "#1A5F5A", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {esAdmin ? "📁 .emb" : "⬇️ .emb"}
                    </a>
                  )}
                  {b.linkDstUrl && (
                    <a
                      href={esAdmin
                        ? (b.linkDstFolderId ? "https://drive.google.com/drive/folders/" + b.linkDstFolderId : driveViewUrl(b.linkDstId || extractDriveId(b.linkDstUrl)))
                        : driveDownloadUrl(b.linkDstId || extractDriveId(b.linkDstUrl))}
                      target="_blank"
                      rel="noreferrer"
                      style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #1A5F5A33", background: "#f0fff8", color: "#1A5F5A", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {esAdmin ? "🎯 .dst" : "⬇️ .dst"}
                    </a>
                  )}
                </>
              )}
              <button
                onClick={() => setModal(b)}
                style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#1A5F5A", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, flex: 1, textAlign: "center" }}
              >
                ✏️ Editar
              </button>
              {esAdmin && (
                <button
                  onClick={() => setConfirm(b.id)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #fdd", background: "#fff8f8", cursor: "pointer", fontSize: 13, color: "#DC3545" }}
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetalleBordado({ detalle, esAdmin, onClose, onEditar, onCambiarEstatus, onConfirmar, exportarPedidoPDF }) {
  const abonado = (detalle.abonos || []).length > 0
    ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0)
    : parseFloat(detalle.anticipo || 0);
  const saldo = parseFloat(detalle.precioT || 0) - abonado;

  const filas = [
    ["Cliente", detalle.cliente],
    ["Teléfono", detalle.telefono],
    detalle.confRef && ["Ref. confección", "#" + detalle.confRef],
    ["Facturación", detalle.tipoDocumento],
    detalle.tipoDocumento !== "Consumidor Final" && ["Razón Social", detalle.razonSocial || "⚠️ Pendiente"],
    detalle.tipoDocumento !== "Consumidor Final" && ["NIT", detalle.nit || "⚠️ Pendiente"],
    ["Soporte", detalle.soporte],
    ["Cantidad", detalle.cantidad + " piezas"],
    ["Posición", detalle.posicion === "Libre/Otra" ? detalle.posLibre : detalle.posicion],
    ["Diseño", detalle.diseño],
    ["Estado diseño", detalle.estadoDiseño],
    ["Colores hilo", detalle.hilos],
    ["Puntadas est.", detalle.puntadas],
    ["Archivo Drive", detalle.linkDrive ? "✅ Respaldado en Drive" : "⚠️ Sin respaldo"],
    detalle.anchoMm && detalle.altoMm && ["Dimensiones", detalle.anchoMm + "mm × " + detalle.altoMm + "mm"],
    detalle.numColores && ["N° de colores", detalle.numColores],
    esAdmin && ["Precio total", detalle.precioT ? fmt$B(detalle.precioT) : "—"],
    esAdmin && ["Abonado", fmt$B(abonado)],
    esAdmin && ["Saldo", fmt$B(saldo)],
    ["Fecha entrega", detalle.fechaEntrega],
    ["Notas", detalle.notas],
  ].filter(Boolean);

  const colDet = BORD_EC[detalle.estatus] || {};

  return (
    <Modal title={`🪡 BORD-${String(detalle.id).padStart(3, "0")} — ${detalle.cliente}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>
            Estatus
          </div>
          <select
            value={detalle.estatus}
            onChange={e => onCambiarEstatus(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 10px",
              borderRadius: 8,
              border: "1.5px solid " + (colDet.bg || "#e0e0e0"),
              background: colDet.bg || "#f5f5f5",
              color: colDet.fg || "#333",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {BORD_E.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          {(detalle.linkDrive || detalle.linkDstUrl) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {detalle.linkDrive && (
                <a
                  href={esAdmin
                    ? (detalle.linkEmbFolderId ? "https://drive.google.com/drive/folders/" + detalle.linkEmbFolderId : driveViewUrl(detalle.linkEmbDriveId || extractDriveId(detalle.linkDrive)))
                    : driveDownloadUrl(detalle.linkEmbDriveId || extractDriveId(detalle.linkDrive))}
                  target="_blank"
                  rel="noreferrer"
                  download={!esAdmin || undefined}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#E8F5E9", color: "#155724", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none", border: "1px solid #8BC34A" }}
                >
                  {esAdmin ? "📁 Carpeta .emb" : "⬇️ Descargar .emb"}
                </a>
              )}
              {detalle.linkDstUrl && (
                <a
                  href={esAdmin
                    ? (detalle.linkDstFolderId ? "https://drive.google.com/drive/folders/" + detalle.linkDstFolderId : driveViewUrl(detalle.linkDstId || extractDriveId(detalle.linkDstUrl)))
                    : driveDownloadUrl(detalle.linkDstId || extractDriveId(detalle.linkDstUrl))}
                  target="_blank"
                  rel="noreferrer"
                  download={!esAdmin || undefined}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#E8F5E9", color: "#155724", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none", border: "1px solid #1A5F5A" }}
                >
                  {esAdmin ? "🎯 Carpeta .dst" : "⬇️ Descargar .dst"}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {filas.map(([k, v]) => v ? (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f5f5f5", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#aaa", fontWeight: 700, whiteSpace: "nowrap" }}>{k}</span>
          <span style={{ fontSize: 13, color: "#333", textAlign: "right", fontWeight: 600 }}>{v}</span>
        </div>
      ) : null)}

      {detalle.imagenRefUrl && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <img src={detalle.imagenRefUrl} alt="ref" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, border: "1.5px solid #e0e0e0" }} />
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>Imagen de referencia</div>
        </div>
      )}

      {detalle.linkDrive && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <a
            href={detalle.linkDrive}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#E8F5E9", color: "#155724", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none", border: "1px solid #8BC34A" }}
          >
            📁 Abrir archivo en Google Drive
          </a>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        {esAdmin && exportarPedidoPDF && (
          <button
            onClick={() => exportarPedidoPDF(detalle, "bordado")}
            style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#1D6A3A", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
          >
            📄 PDF
          </button>
        )}
        {esAdmin && (
          <button
            onClick={onConfirmar}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #fdd", background: "#fff8f8", color: "#DC3545", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
          >
            🗑️
          </button>
        )}
        <button
          onClick={onEditar}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1A5F5A", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
        >
          ✏️ Editar
        </button>
      </div>
    </Modal>
  );
}
