// Catálogo de diseños de bordado — grilla visual con buscador y filtro
// por categoría. Los diseños viven en taller_disenos (Supabase) con
// previews PNG y archivos DST/EMB/DGT en Storage.
//
// Dos modos:
//  - Vista completa (dentro de SeccionBordados, botón "📚 Catálogo")
//  - Picker (modal desde BordadoModal, prop onPick) — al elegir un diseño
//    autollena puntadas/colores/mm y enlaza los archivos.

import { dbDisenosLeer, dbDisenoGuardar, dbDisenoBorrar } from "./lib/db.js";
import { detectarDuplicados, fusionarEnGanador, claveParDup, leerIgnorados, guardarIgnorados, idsCandidatos, firmaVisual } from "./lib/duplicados.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";
import { Modal } from "./lib/Modal.jsx";
import { useEffect, useMemo, useState } from "react";

let cacheDisenos = null; // cache en memoria por sesión — el catálogo cambia poco
const cacheFirmas = new Map(); // previewUrl → Promise<firma visual>, por sesión

export function limpiarNombreDiseno(nombre) {
  // "AGUILA_CORBATA-SALOMON_9959pt_59x76mm" → "Corbata Salomon"
  let s = nombre.replace(/^(AGUILA|ESCARAPELA|ESCUDO|LETRAS|LOGO|DISEÑO)_/i, "");
  s = s.replace(/_\d+pt.*$/i, "").replace(/_v\d+$/i, "");
  s = s.replace(/[-_]+/g, " ").trim().toLowerCase();
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export default function CatalogoDisenos({ onPick, onClose, esAdmin }) {
  const [disenos, setDisenos] = useState(cacheDisenos || []);
  const [cargando, setCargando] = useState(!cacheDisenos);
  const [busq, setBusq] = useState("");
  const [cat, setCat] = useState("Todos");
  const [zoom, setZoom] = useState(null); // diseño en vista ampliada
  const [verBorradores, setVerBorradores] = useState(false);
  const [verDuplicados, setVerDuplicados] = useState(false);
  const [dupIgnorados, setDupIgnorados] = useState(() => leerIgnorados());

  useEffect(() => {
    if (cacheDisenos) return;
    dbDisenosLeer().then(rows => {
      cacheDisenos = rows;
      setDisenos(rows);
      setCargando(false);
    });
  }, []);

  // Curación (admin): persiste el cambio y actualiza estado + cache
  function actualizarDiseno(d, patch) {
    const nuevo = { ...d, ...patch };
    setDisenos(prev => {
      const rows = prev.map(x => (x.id === d.id ? nuevo : x));
      cacheDisenos = rows;
      return rows;
    });
    if (zoom && zoom.id === d.id) setZoom(nuevo);
    dbDisenoGuardar(nuevo);
  }

  function quitarDiseno(d) {
    setDisenos(prev => {
      const rows = prev.filter(x => x.id !== d.id);
      cacheDisenos = rows;
      return rows;
    });
    setZoom(null);
    dbDisenoBorrar(d.id);
    pushToast("Diseño quitado del catálogo (recuperable en BD)", "info");
  }

  const esPicker = typeof onPick === "function";

  // ── Duplicados (admin) ─────────────────────────────────────────
  // Candidatos por metadata (medidas + puntadas ~iguales) verificados
  // visualmente: la firma de cada preview se calcula async y el grupo
  // solo se muestra si las previews de verdad se parecen. Sin firmas
  // todavía (null) no se muestra nada — evita el flash de falsos
  // positivos mientras cargan las imágenes.
  const [firmasDup, setFirmasDup] = useState(null);

  useEffect(() => {
    if (!esAdmin || esPicker || !disenos.length) return;
    let vivo = true;
    (async () => {
      const porId = new Map(disenos.map(d => [d.id, d]));
      const ids = idsCandidatos(disenos, dupIgnorados);
      const m = new Map();
      await Promise.all(
        [...ids].map(async id => {
          const url = porId.get(id)?.previewUrl;
          if (!url) return;
          if (!cacheFirmas.has(url)) cacheFirmas.set(url, firmaVisual(url));
          const f = await cacheFirmas.get(url);
          if (f) m.set(id, f);
        })
      );
      if (vivo) setFirmasDup(m);
    })();
    return () => { vivo = false; };
  }, [disenos, dupIgnorados, esAdmin, esPicker]);

  const gruposDup = useMemo(
    () => (esAdmin && !esPicker && firmasDup ? detectarDuplicados(disenos, dupIgnorados, firmasDup) : []),
    [disenos, dupIgnorados, firmasDup, esAdmin, esPicker]
  );

  async function elegirGanador(grupo, ganador) {
    const perdedores = grupo.filter(x => x.id !== ganador.id);
    const heredables = perdedores.some(
      p => (!ganador.archivoEmbUrl && p.archivoEmbUrl) || (!ganador.archivoDgtUrl && p.archivoDgtUrl) || (!ganador.archivoUrl && p.archivoUrl)
    );
    const ok = await pushConfirm({
      titulo: "Quedarse con este diseño",
      msg:
        `Los otros ${perdedores.length} diseño(s) del grupo pasan a la papelera.` +
        (heredables ? ` Los archivos que tengan y a "${limpiarNombreDiseno(ganador.nombre)}" le falten (.emb, .dgt) se pasan al elegido.` : ""),
      okLabel: "Sí, quedarme con este",
    });
    if (!ok) return;
    const fusionado = fusionarEnGanador(ganador, perdedores);
    const perdIds = new Set(perdedores.map(p => p.id));
    setDisenos(prev => {
      const rows = prev.filter(x => !perdIds.has(x.id)).map(x => (x.id === ganador.id ? fusionado : x));
      cacheDisenos = rows;
      return rows;
    });
    dbDisenoGuardar(fusionado);
    perdedores.forEach(p => dbDisenoBorrar(p.id));
    pushToast(`Duplicados resueltos — quedó "${limpiarNombreDiseno(ganador.nombre)}" (el resto, en papelera)`, "success");
  }

  function descartarGrupo(grupo) {
    const nuevos = new Set(dupIgnorados);
    for (let i = 0; i < grupo.length; i++)
      for (let j = i + 1; j < grupo.length; j++) nuevos.add(claveParDup(grupo[i].id, grupo[j].id));
    setDupIgnorados(nuevos);
    guardarIgnorados(nuevos);
    pushToast("Ok, no se vuelven a sugerir como duplicados (en este dispositivo)", "info");
  }

  const nBorradores = disenos.filter(d => d.esBorrador).length;

  const categorias = useMemo(() => {
    const set = new Set(disenos.map(d => d.categoria).filter(Boolean));
    return ["Todos", ...[...set].sort()];
  }, [disenos]);

  const lista = useMemo(() => {
    const q = busq.toLowerCase();
    return disenos
      .filter(d => (verBorradores ? d.esBorrador : !d.esBorrador))
      .filter(d => cat === "Todos" || d.categoria === cat)
      .filter(d => !q || d.nombre.toLowerCase().includes(q))
      .sort((a, b) => {
        // Con preview primero, luego alfabético
        if (!!a.previewUrl !== !!b.previewUrl) return a.previewUrl ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [disenos, busq, cat, verBorradores]);

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
          {nBorradores > 0 && (
            <button
              onClick={() => setVerBorradores(v => !v)}
              style={{
                padding: "5px 10px", borderRadius: 20, whiteSpace: "nowrap", cursor: "pointer",
                border: verBorradores ? "1.5px solid #B8860B" : "1.5px dashed #ccc",
                background: verBorradores ? "#B8860B" : "#fff",
                color: verBorradores ? "#fff" : "#999",
                fontWeight: verBorradores ? 700 : 500, fontSize: 11, fontFamily: "inherit",
              }}
            >
              📝 Borradores <span style={{ opacity: 0.7 }}>{nBorradores}</span>
            </button>
          )}
          {gruposDup.length > 0 && (
            <button
              onClick={() => setVerDuplicados(v => !v)}
              style={{
                padding: "5px 10px", borderRadius: 20, whiteSpace: "nowrap", cursor: "pointer",
                border: verDuplicados ? "1.5px solid #C0392B" : "1.5px dashed #C0392B88",
                background: verDuplicados ? "#C0392B" : "#fff",
                color: verDuplicados ? "#fff" : "#C0392B",
                fontWeight: 700, fontSize: 11, fontFamily: "inherit",
              }}
            >
              ⚖️ Duplicados <span style={{ opacity: 0.7 }}>{gruposDup.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Grilla ── */}
      <div style={{ flex: 1, overflow: "auto", padding: esPicker ? "4px 0" : 12 }}>
        {verDuplicados && gruposDup.length > 0 ? (
          <VistaDuplicados
            grupos={gruposDup}
            onElegir={elegirGanador}
            onDescartar={descartarGrupo}
            onZoom={setZoom}
          />
        ) : cargando ? (
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
            {/* nota: la rotación se aplica con CSS — los PNG son cuadrados,
                girar 90° no recorta nada */}
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
            <img
              src={zoom.previewUrl}
              alt={zoom.nombre}
              style={{ maxWidth: "90vw", maxHeight: "60vh", background: "#fff", borderRadius: 12, transform: zoom.rotacion ? `rotate(${zoom.rotacion}deg)` : "none" }}
            />
          )}
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", marginTop: 12, maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontWeight: 800, color: "#1A5F5A", fontSize: 14 }}>
              {limpiarNombreDiseno(zoom.nombre)}
              {zoom.esBorrador && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: "#B8860B", background: "#FFF8E1", borderRadius: 5, padding: "2px 6px", verticalAlign: "middle" }}>BORRADOR</span>}
            </div>
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
            {/* ── Curación (solo admin) ── */}
            {esAdmin && !esPicker && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap", borderTop: "1px solid #f0f0f0", paddingTop: 10 }} onClick={e => e.stopPropagation()}>
                {zoom.previewUrl && (
                  <button
                    onClick={() => actualizarDiseno(zoom, { rotacion: ((zoom.rotacion || 0) + 90) % 360 })}
                    style={{ padding: "6px 12px", borderRadius: 7, border: "1.5px solid #e0e0e0", background: "#fff", color: "#555", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}
                  >
                    ↻ Girar 90°
                  </button>
                )}
                <button
                  onClick={() => actualizarDiseno(zoom, { esBorrador: !zoom.esBorrador })}
                  style={{ padding: "6px 12px", borderRadius: 7, border: "1.5px solid " + (zoom.esBorrador ? "#28A745" : "#B8860B66"), background: zoom.esBorrador ? "#F1FFF4" : "#FFF8E1", color: zoom.esBorrador ? "#155724" : "#B8860B", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}
                >
                  {zoom.esBorrador ? "✓ Marcar oficial" : "📝 Marcar borrador"}
                </button>
                <button
                  onClick={() => quitarDiseno(zoom)}
                  style={{ padding: "6px 12px", borderRadius: 7, border: "1.5px solid #fdd", background: "#fff", color: "#E63946", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}
                >
                  🗑 Quitar
                </button>
              </div>
            )}
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
        style={{ height: 120, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", borderBottom: "1px solid #f2f2f2", position: "relative" }}
      >
        {d.esBorrador && (
          <span style={{ position: "absolute", top: 5, left: 5, fontSize: 8, fontWeight: 800, color: "#B8860B", background: "#FFF8E1", border: "1px solid #B8860B44", borderRadius: 5, padding: "2px 5px", zIndex: 1 }}>
            BORRADOR
          </span>
        )}
        {d.previewUrl ? (
          <img src={d.previewUrl} alt={d.nombre} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: d.rotacion ? `rotate(${d.rotacion}deg)` : "none" }} />
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

// Comparador de duplicados: grupos de diseños con mismas medidas y
// puntadas casi iguales (misma digitalización subida más de una vez).
// El nombre no decide nada — se compara la vista previa y la metadata.
function VistaDuplicados({ grupos, onElegir, onDescartar, onZoom }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 11.5, color: "#856404", background: "#FFF8E1", border: "1px solid #B8860B33", borderRadius: 10, padding: "8px 12px", lineHeight: 1.45 }}>
        Estos grupos miden lo mismo y tienen casi las mismas puntadas — casi seguro es el mismo
        diseño digitalizado o subido más de una vez. <b>Compará las vistas previas</b> (tocá para ampliar)
        y quedate con el mejor: los archivos del resto (.emb, .dgt) que le falten al elegido{" "}
        <b>se le pasan automáticamente</b> antes de mandar los otros a la papelera.
      </div>
      {grupos.map(grupo => (
        <div key={grupo.map(d => d.id).join("-")} style={{ border: "1.5px solid #C0392B33", borderRadius: 12, background: "#fff", padding: 10 }}>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {grupo.map(d => (
              <CardCandidato key={d.id} d={d} onElegir={() => onElegir(grupo, d)} onZoom={() => onZoom(d)} />
            ))}
          </div>
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <button
              onClick={() => onDescartar(grupo)}
              style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #e0e0e0", background: "#fff", color: "#777", cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: "inherit" }}
            >
              ↔️ No son duplicados
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CardCandidato({ d, onElegir, onZoom }) {
  const archivos = [
    ["." + (d.formato || "dst").toLowerCase(), !!d.archivoUrl],
    [".emb", !!d.archivoEmbUrl],
    [".dgt", !!d.archivoDgtUrl],
  ];
  return (
    <div style={{ minWidth: 180, maxWidth: 210, flexShrink: 0, border: "1.5px solid #eee", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        onClick={onZoom}
        style={{ height: 140, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in", borderBottom: "1px solid #f2f2f2", position: "relative" }}
      >
        {d.esBorrador && (
          <span style={{ position: "absolute", top: 5, left: 5, fontSize: 8, fontWeight: 800, color: "#B8860B", background: "#FFF8E1", border: "1px solid #B8860B44", borderRadius: 5, padding: "2px 5px", zIndex: 1 }}>
            BORRADOR
          </span>
        )}
        {d.previewUrl ? (
          <img src={d.previewUrl} alt={d.nombre} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: d.rotacion ? `rotate(${d.rotacion}deg)` : "none" }} />
        ) : (
          <div style={{ textAlign: "center", color: "#ccc" }}>
            <div style={{ fontSize: 30 }}>🧵</div>
            <div style={{ fontSize: 9, fontWeight: 700 }}>sin vista previa</div>
          </div>
        )}
      </div>
      <div style={{ padding: "7px 9px", display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#333", lineHeight: 1.2 }}>{limpiarNombreDiseno(d.nombre)}</div>
        {/* nombre crudo: acá sí sirve — distingue "_v2", "RECOVERED", "COPY-OF" */}
        <div style={{ fontSize: 8.5, color: "#bbb", wordBreak: "break-all", lineHeight: 1.2 }}>{d.nombre}</div>
        <div style={{ fontSize: 10, color: "#777" }}>
          {d.puntadas ? d.puntadas.toLocaleString() + " pt" : "—"}
          {d.anchoMm ? ` · ${d.anchoMm}×${d.altoMm}mm` : ""}
          {d.colores ? ` · ${d.colores} col` : ""}
        </div>
        <div style={{ fontSize: 9.5, display: "flex", gap: 6 }}>
          {archivos.map(([ext, tiene]) => (
            <span key={ext} style={{ color: tiene ? "#1A5F5A" : "#ccc", fontWeight: tiene ? 700 : 400 }}>
              {ext} {tiene ? "✓" : "—"}
            </span>
          ))}
        </div>
        <button
          onClick={onElegir}
          style={{ marginTop: "auto", padding: "6px 8px", borderRadius: 7, border: "none", background: "#1A5F5A", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: "inherit" }}
        >
          ✓ Quedarme con este
        </button>
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
