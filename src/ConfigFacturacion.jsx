// Configuración de facturación electrónica (integración con Tlacuilo).
// Vive dentro de SeccionConfig. Tres bloques:
//   1. Conexión al bridge (URL + token + probar).
//   2. Empresa(s) emisora(s): perfil fiscal público.
//   3. Estado del trámite de homologación ante Hacienda (el paso que queda
//      registrado: no_iniciada → solicitada → en_pruebas → aprobada → produccion).
//
// Nada secreto se guarda acá ni en el repo: el certificado y las claves de MH
// viven SOLO en el bridge. El token es de acceso al bridge (no a Hacienda) y va
// en localStorage por dispositivo.

import { useEffect, useState } from "react";
import { pushToast, pushConfirm } from "./lib/feedback.js";
import {
  leerEmpresas, guardarEmpresa, actualizarEstado, empresaPredeterminada,
  ESTADOS_HOMOLOGACION, ESTADO_LABEL, ESTADO_AYUDA, ordenEstado, ambientePermitido,
} from "./lib/dteEmpresas.js";
import { probarBridge, leerTokenDTE, guardarTokenDTE } from "./lib/dte.js";
import { cargarFacturacion, guardarBridgeUrl, bridgeUrlDeConfig, invalidarFacturacion } from "./lib/dteContexto.js";
import { leerConfigTotal } from "./lib/config.js";

const INP = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1.5px solid #e0e0e0", fontSize: 13, outline: "none",
  fontFamily: "inherit", background: "#FAFAFA", boxSizing: "border-box",
};
const LBL = {
  fontSize: 10, fontWeight: 700, color: "#888",
  marginBottom: 3, display: "block",
  textTransform: "uppercase", letterSpacing: 0.4,
};
const COLOR = "#1B6B4A"; // jade (tema Tlacuilo)

function Card({ titulo, children }) {
  return (
    <div style={{ marginBottom: 18, background: "#fff", border: "1px solid " + COLOR + "22", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: COLOR, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

export default function ConfigFacturacion() {
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [token, setToken] = useState("");
  const [probando, setProbando] = useState(false);
  const [estadoBridge, setEstadoBridge] = useState(null); // {ok, msg}
  const [empresas, setEmpresas] = useState(null);

  useEffect(() => {
    leerConfigTotal().then(cfg => setBridgeUrl(bridgeUrlDeConfig(cfg)));
    setToken(leerTokenDTE());
    leerEmpresas().then(setEmpresas);
  }, []);

  const guardarUrl = async () => {
    const ok = await guardarBridgeUrl(bridgeUrl);
    pushToast(ok ? "URL del bridge guardada" : "No pude guardar la URL", ok ? "success" : "error");
  };
  const guardarTok = () => {
    guardarTokenDTE(token);
    invalidarFacturacion();
    pushToast("Token guardado en este dispositivo", "success");
  };
  const probar = async () => {
    setProbando(true);
    setEstadoBridge(null);
    const r = await probarBridge(bridgeUrl);
    setProbando(false);
    if (r.ok) {
      const n = r.info?.empresas_configuradas;
      setEstadoBridge({ ok: true, msg: `Bridge en línea ✓${n != null ? ` — ${n} empresa(s) configurada(s)` : ""}` });
    } else {
      setEstadoBridge({ ok: false, msg: r.error });
    }
  };

  const recargarEmpresas = async () => {
    invalidarFacturacion();
    setEmpresas(await leerEmpresas());
  };

  return (
    <div>
      <Card titulo="🔌 Conexión al emisor (Tlacuilo)">
        <p style={{ fontSize: 12, color: "#666", marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>
          La app de pedidos manda los datos de la factura al emisor Tlacuilo, que firma con el
          certificado de Hacienda y la envía. Acá configurás cómo llegar al emisor. Si lo dejás vacío,
          la facturación simplemente no aparece y la app funciona igual.
        </p>
        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>URL del bridge</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={INP}
              value={bridgeUrl}
              onChange={e => setBridgeUrl(e.target.value)}
              placeholder="https://emisor-imis.duckdns.org"
            />
            <button onClick={guardarUrl} style={btn(COLOR)}>Guardar</button>
          </div>
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
            Usá la URL <strong>HTTPS</strong> del bridge. Una URL <code>http://</code> será bloqueada por el navegador
            (la app es HTTPS).
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Token de acceso al bridge</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={INP} type="password" value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Token Bearer (no es la clave de Hacienda)"
            />
            <button onClick={guardarTok} style={btn("#555")}>Guardar</button>
          </div>
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
            Se guarda solo en este dispositivo. No es ninguna clave de Hacienda.
          </div>
        </div>
        <button onClick={probar} disabled={probando || !bridgeUrl} style={{ ...btn(COLOR), opacity: (probando || !bridgeUrl) ? 0.6 : 1 }}>
          {probando ? "⏳ Probando…" : "🔍 Probar conexión"}
        </button>
        {estadoBridge && (
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 12,
            background: estadoBridge.ok ? "#E6F2EC" : "#FDEDEB",
            color: estadoBridge.ok ? "#1B6B4A" : "#C0392B",
          }}>
            {estadoBridge.msg}
          </div>
        )}
      </Card>

      <Card titulo="🏢 Empresa(s) emisora(s)">
        {empresas === null ? (
          <div style={{ color: "#aaa", fontSize: 12 }}>⏳ Cargando…</div>
        ) : empresas.length === 0 ? (
          <EmpresaForm onGuardado={recargarEmpresas} />
        ) : (
          <div>
            {empresas.map(e => (
              <EmpresaEmisora key={e.id} empresa={e} onCambio={recargarEmpresas} />
            ))}
            <Agregar onGuardado={recargarEmpresas} />
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Una empresa: cabecera + workflow de estado + edición del perfil ───────
function EmpresaEmisora({ empresa, onCambio }) {
  const [editando, setEditando] = useState(false);
  const enProd = empresa.estadoHomologacion === "produccion";
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#2C1654" }}>
            {empresa.nombre || "(sin nombre)"}
            {empresa.predeterminada && <span style={chip("#9B59B6")}>predeterminada</span>}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            NIT {empresa.nit || "—"}{empresa.nrc ? ` · NRC ${empresa.nrc}` : ""}
          </div>
        </div>
        <span style={chip(enProd ? "#1B6B4A" : "#E67E22")}>
          {enProd ? "🟢 Producción" : "🧪 Pruebas"} · {empresa.ambiente}
        </span>
      </div>

      <EstadoWorkflow empresa={empresa} onCambio={onCambio} />

      <button onClick={() => setEditando(v => !v)} style={{ ...btn("#555"), marginTop: 8 }}>
        {editando ? "Cerrar" : "✏️ Editar datos fiscales"}
      </button>
      {editando && (
        <div style={{ marginTop: 10 }}>
          <EmpresaForm empresa={empresa} onGuardado={() => { setEditando(false); onCambio(); }} />
        </div>
      )}
    </div>
  );
}

// Stepper del trámite + botones avanzar/retroceder. Deja registrada la fecha.
function EstadoWorkflow({ empresa, onCambio }) {
  const idx = ordenEstado(empresa.estadoHomologacion);
  const siguiente = ESTADOS_HOMOLOGACION[idx + 1];
  const anterior = ESTADOS_HOMOLOGACION[idx - 1];

  const mover = async (estado) => {
    if (estado === "produccion") {
      const ok = await pushConfirm({
        titulo: "Activar producción",
        msg: "Esto habilita emitir DTE REALES con validez tributaria. Asegurate de que Hacienda ya aprobó y de que el certificado de producción está cargado en el bridge. ¿Continuar?",
        okLabel: "Sí, activar producción",
      });
      if (!ok) return;
    }
    const ok = await actualizarEstado(empresa.id, estado);
    if (ok) {
      pushToast(`Estado: ${ESTADO_LABEL[estado]}`, "success");
      onCambio();
    } else {
      pushToast("No pude actualizar el estado", "error");
    }
  };

  return (
    <div style={{ marginTop: 10, padding: 10, background: "#FAFAF7", borderRadius: 8, border: "1px solid #eee" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
        Solicitud de cambio a producción
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {ESTADOS_HOMOLOGACION.map((est, i) => (
          <span key={est} style={{
            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
            background: i === idx ? COLOR : i < idx ? "#CDEBDD" : "#eee",
            color: i === idx ? "#fff" : i < idx ? "#1B6B4A" : "#aaa",
          }}>
            {i < idx ? "✓ " : ""}{ESTADO_LABEL[est]}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 8, lineHeight: 1.45 }}>
        {ESTADO_AYUDA[empresa.estadoHomologacion]}
      </div>
      {(empresa.fechaSolicitud || empresa.fechaAprobacion) && (
        <div style={{ fontSize: 10, color: "#999", marginBottom: 8 }}>
          {empresa.fechaSolicitud && <>Solicitada: {empresa.fechaSolicitud}. </>}
          {empresa.fechaAprobacion && <>Aprobada: {empresa.fechaAprobacion}.</>}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {anterior && (
          <button onClick={() => mover(anterior)} style={btn("#999")}>
            ← {ESTADO_LABEL[anterior]}
          </button>
        )}
        {siguiente && (
          <button onClick={() => mover(siguiente)} style={btn(COLOR)}>
            Avanzar a: {ESTADO_LABEL[siguiente]} →
          </button>
        )}
      </div>
    </div>
  );
}

function Agregar({ onGuardado }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} style={{ ...btn(COLOR), background: "#fff", color: COLOR, border: `1.5px solid ${COLOR}` }}>
        ＋ Agregar empresa emisora
      </button>
    );
  }
  return (
    <div style={{ borderTop: "1px dashed #ddd", paddingTop: 12, marginTop: 6 }}>
      <EmpresaForm onGuardado={() => { setAbierto(false); onGuardado(); }} />
    </div>
  );
}

// Form del perfil fiscal público del emisor. Sin secretos.
function EmpresaForm({ empresa, onGuardado }) {
  const [d, setD] = useState(() => ({
    id: empresa?.id,
    nombre: empresa?.nombre || "",
    nit: empresa?.nit || "",
    nrc: empresa?.nrc || "",
    nombreComercial: empresa?.nombreComercial || "",
    codActividad: empresa?.codActividad || "",
    descActividad: empresa?.descActividad || "",
    departamento: empresa?.departamento || "06",
    municipio: empresa?.municipio || "14",
    complementoDir: empresa?.complementoDir || "",
    telefono: empresa?.telefono || "",
    correo: empresa?.correo || "",
    codEstableMH: empresa?.codEstableMH || "M001",
    codEstable: empresa?.codEstable || "0001",
    codPuntoVentaMH: empresa?.codPuntoVentaMH || "P001",
    codPuntoVenta: empresa?.codPuntoVenta || "0001",
    predeterminada: empresa?.predeterminada ?? true,
    estadoHomologacion: empresa?.estadoHomologacion || "no_iniciada",
    ambiente: empresa?.ambiente || "00",
  }));
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const campo = (k, label, ph) => (
    <div style={{ marginBottom: 8 }}>
      <label style={LBL}>{label}</label>
      <input style={INP} value={d[k]} onChange={e => set(k, e.target.value)} placeholder={ph || ""} />
    </div>
  );

  const guardar = async () => {
    if (!d.nombre.trim() || !d.nit.trim()) {
      pushToast("Razón social y NIT son obligatorios", "error");
      return;
    }
    // El ambiente siempre se deriva del estado (pruebas salvo producción).
    const payload = { ...d, ambiente: ambientePermitido(d.estadoHomologacion) };
    const r = await guardarEmpresa(payload);
    if (r.ok) {
      pushToast("Empresa emisora guardada", "success");
      onGuardado();
    } else {
      pushToast("No pude guardar la empresa", "error");
    }
  };

  return (
    <div>
      {campo("nombre", "Razón social *", "PLUMA LIBRE, S.A. DE C.V.")}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>{campo("nit", "NIT *", "0000-000000-000-0")}</div>
        <div style={{ flex: 1 }}>{campo("nrc", "NRC", "000000-0")}</div>
      </div>
      {campo("nombreComercial", "Nombre comercial", "")}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>{campo("codActividad", "Cód. actividad", "73100")}</div>
        <div style={{ flex: 2 }}>{campo("descActividad", "Actividad económica", "Publicidad")}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>{campo("departamento", "Departamento", "06")}</div>
        <div style={{ flex: 1 }}>{campo("municipio", "Distrito/Municipio", "14")}</div>
      </div>
      {campo("complementoDir", "Dirección", "Calle, número, colonia")}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>{campo("telefono", "Teléfono", "0000-0000")}</div>
        <div style={{ flex: 1 }}>{campo("correo", "Correo", "empresa@ejemplo.com")}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>{campo("codEstableMH", "codEstableMH", "M001")}</div>
        <div style={{ flex: 1 }}>{campo("codEstable", "codEstable", "0001")}</div>
        <div style={{ flex: 1 }}>{campo("codPuntoVentaMH", "codPtoVentaMH", "P001")}</div>
        <div style={{ flex: 1 }}>{campo("codPuntoVenta", "codPtoVenta", "0001")}</div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555", margin: "6px 0 10px" }}>
        <input type="checkbox" checked={d.predeterminada} onChange={e => set("predeterminada", e.target.checked)} />
        Usar esta empresa por defecto para facturar
      </label>
      <div style={{ fontSize: 10, color: "#aaa", marginBottom: 10 }}>
        ⚠ Departamento/distrito deben usar los códigos del catálogo oficial de Hacienda (reforma territorial).
      </div>
      <button onClick={guardar} style={btn(COLOR)}>💾 Guardar empresa</button>
    </div>
  );
}

function btn(color) {
  return {
    padding: "8px 14px", borderRadius: 8, border: "none",
    background: color, color: "#fff", cursor: "pointer",
    fontWeight: 700, fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap",
  };
}
function chip(color) {
  return {
    display: "inline-block", marginLeft: 8, fontSize: 9, fontWeight: 800,
    padding: "2px 7px", borderRadius: 10, background: color + "22", color,
    textTransform: "uppercase", letterSpacing: 0.3, verticalAlign: "middle",
  };
}
