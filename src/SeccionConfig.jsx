// Configuración del taller — admin.
// Por ahora: subir firma del representante legal y sello del taller
// para que aparezcan en PDFs de cotización / recibo.
//
// Las imágenes se guardan en Supabase Storage (bucket taller-imis-fotos,
// público) y la URL queda persistida en taller_config (key 'firma' /
// 'sello'). Al cargar la app, leerConfigTotal() las trae.

import { useEffect, useState } from "react";
import { EMPRESA } from "./lib/empresa.js";
import { leerConfigTotal, guardarConfig } from "./lib/config.js";
import { subirArchivoSupabase } from "./supabaseStorage.js";
import { pushToast } from "./lib/feedback.js";

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

      {/* Datos fiscales (read-only por ahora — están en código) */}
      <Seccion titulo="📋 Datos fiscales (en código)" color="#9B59B6">
        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
          <div><strong>Razón social:</strong> {EMPRESA.razonSocial}</div>
          <div><strong>NIT:</strong> {EMPRESA.nit}</div>
          <div><strong>NRC:</strong> {EMPRESA.nrc}</div>
          <div><strong>Actividad:</strong> {EMPRESA.actividadEconomica}</div>
          <div><strong>Dirección:</strong> {EMPRESA.direccion}</div>
          <div><strong>Teléfonos:</strong> {EMPRESA.telefonos.join(" · ")}</div>
          <div><strong>Email:</strong> {EMPRESA.email}</div>
          <div style={{ marginTop: 6 }}>
            <strong>Representante Legal:</strong> {EMPRESA.representanteLegal.nombre}
            <br /><span style={{ color: "#888" }}>DUI: {EMPRESA.representanteLegal.dui}</span>
          </div>
        </div>
        <div style={{ marginTop: 10, padding: 8, background: "#FFF8E1", borderRadius: 6, fontSize: 11, color: "#856404" }}>
          ⚠️ Estos datos están en código. Si cambian, hay que editar <code>src/lib/empresa.js</code> y volver a desplegar.
          En el próximo PR los movemos a la BD para que sean editables desde acá.
        </div>
      </Seccion>

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
