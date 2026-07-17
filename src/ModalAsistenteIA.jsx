// Modal del asistente IA: chat con Claude (Anthropic API directa desde
// el navegador) para crear pedidos por texto o voz.
// Antes vivía como ModalAsistenteIA compilado en main.js (~603 líneas).

import { ANTHROPIC_KEY, IA_EDGE_URL, SUPA_ANON_JWT } from "./lib/constants.js";
import { PEDIDO_BASE } from "./lib/dominio.js";
import { pushToast } from "./lib/feedback.js";

import { useState, useEffect, useRef } from "react";

// Helper de estilos (duplicado de main.js para no acoplar)
const BTN = (bg = "#9B59B6", disabled = false) => ({
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: disabled ? "#ccc" : bg,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  fontSize: 14,
});

const colorBurbuja = {
  user: { bg: "#9B59B6", color: "#fff", align: "flex-end" },
  assistant: { bg: "#f0f0f0", color: "#333", align: "flex-start" },
};

export default function ModalAsistenteIA({ rol, onCrearPedido, onAbrir, onCerrar }) {
  const esAdmin = rol === "admin";
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [cargando, setCarg] = useState(false);
  const [escuchando, setEsc] = useState(false);
  const [pedidoFinal, setPF] = useState(null);
  const [fase, setFase] = useState("chat"); // chat | confirmar
  const scrollRef = useRef();
  const reconRef = useRef(null);

  const _hoy = new Date();
  const hoyStr = `${_hoy.getFullYear()}-${String(_hoy.getMonth() + 1).padStart(2, "0")}-${String(_hoy.getDate()).padStart(2, "0")}`;
  const hoyLegible = _hoy.toLocaleDateString("es-SV", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const SYSTEM = `Eres un asistente de registro de pedidos del Taller IMIS (El Salvador). Eres ULTRA directo y conciso.

REGLAS ESTRICTAS:
- Máximo 1 pregunta o instrucción por mensaje
- Cuando ofrezcas opciones, muéstralas como lista numerada corta
- NO uses frases de relleno ("claro", "perfecto", "con gusto", "entendido")
- Responde siempre en 1-3 líneas máximo, nunca más
- HOY ES: ${hoyStr} (${hoyLegible}). USA ESTA FECHA para calcular plazos. "1 semana" = fecha exacta en 7 días desde hoy
- Costureras disponibles: Blanqui, Sandra, Tere, Paty, Morena, Imelda
- Prendas comunes: Blusa, Vestido, Camisa, Pantalón, Falda, Traje, Uniforme, Short, Chaqueta
- Telas comunes: Dacrón, Satín, Lino, Gabardina, Tafeta, Lycra, Algodón, Dril

FLUJO (en este orden, saltando si el usuario ya dio el dato):
1. Nombre del cliente
2. ¿Qué prenda? (muestra lista numerada)
3. Talla(s) y cantidad
4. Tela y color (muestra opciones)
5. Fecha de entrega
6. Costurera (muestra lista numerada)
${esAdmin ? "7. Precio y anticipo (opcional)" : ""}
7. ¿Algo más? Si no → genera el JSON

Cuando tengas suficiente info (mínimo cliente + prenda), pregunta "¿Listo para guardar?" y si confirma genera el JSON.

Cuando generes el JSON, responde ÚNICAMENTE con esto, sin texto antes ni después:
<PEDIDO_JSON>
{"cliente":"...","telefono":"...","tipoPrenda":"...","tela":"...","color":"...","tallasItems":[{"tipo":"...","talla":"...","qty":1}],"modoRegistro":"tallas","descripcion":"...","tieneBordado":false,"fechaEntrega":"...","costurera":"...","precio":"...","anticipo":"...","estatus":"Corte","notas":""}
</PEDIDO_JSON>

Reglas del JSON:
- tallasItems: array con un objeto por talla. Ej: [{"tipo":"Camisa","talla":"M","qty":2},{"tipo":"Camisa","talla":"L","qty":1}]
- Si no sabe la talla específica: [{"tipo":tipoPrenda,"talla":"Única","qty":1}]
- Si el admin dio precio por unidad, incluir "precio":X.XX en cada item
- tipoPrenda y tipo dentro de tallasItems deben ser iguales`;

  const [apiKey, setApiKey] = useState(
    () => ANTHROPIC_KEY || localStorage.getItem("taller_ia_key") || ""
  );
  const [showKey, setShowKey] = useState(false);
  // true mientras el servidor (Edge Function) responda — la pantalla de
  // "configura tu API key" solo aparece si el servidor no está configurado
  // Y no hay key local (compat con el flujo viejo).
  const [modoServidor, setModoServidor] = useState(true);

  useEffect(() => {
    enviarMensaje(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!modoServidor && apiKey) enviarMensaje(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensajes]);

  async function enviarMensaje(textoUsuario, esInicio = false) {
    const nuevosMensajes = esInicio
      ? []
      : [...mensajes, { rol: "user", txt: textoUsuario }];
    if (!esInicio) setMensajes(nuevosMensajes);
    setCarg(true);

    const historial = nuevosMensajes.map(m => ({
      role: m.rol === "user" ? "user" : "assistant",
      content: m.txt,
    }));
    if (esInicio) {
      historial.push({ role: "user", content: "Hola, quiero registrar un nuevo pedido." });
    }

    try {
      const payload = JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: SYSTEM,
        messages: historial,
      });
      let resp = null;
      let lastErr = "";
      // 1º: Edge Function — la key de Anthropic vive en el servidor y no
      // se pierde aunque el navegador borre el almacenamiento local.
      try {
        const r = await fetch(IA_EDGE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPA_ANON_JWT,
            Authorization: "Bearer " + SUPA_ANON_JWT,
          },
          body: payload,
        });
        if (r.ok) resp = r;
        else {
          const d = await r.json().catch(() => ({}));
          if (((d || {}).error || {}).type === "no_server_key") setModoServidor(false);
          lastErr = ((d || {}).error || {}).message || "HTTP " + r.status;
        }
      } catch (e) {
        lastErr = e.message;
      }
      // 2º (compat): directo con la key local si el servidor no está listo
      if (!resp && apiKey) {
        const ENDPOINTS = [
          "https://api.anthropic.com/v1/messages",
          "https://corsproxy.io/?https://api.anthropic.com/v1/messages",
        ];
        for (const url of ENDPOINTS) {
          try {
            resp = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true",
              },
              body: payload,
            });
            if (resp.ok) break;
            const errData = await resp.json();
            lastErr = ((errData || {}).error || {}).message || "HTTP " + resp.status;
            resp = null;
          } catch (e) {
            lastErr = e.message;
            resp = null;
          }
        }
      }
      if (!resp) {
        if (!esInicio || apiKey) setMensajes(prev => [
          ...prev,
          { rol: "assistant", txt: "⚠️ Error: " + lastErr + ". Verifica la configuración del servidor IA o tu API key." },
        ]);
        setCarg(false);
        return;
      }
      const data = await resp.json();
      if (data.error) {
        setMensajes(prev => [
          ...prev,
          { rol: "assistant", txt: "⚠️ Error API: " + data.error.message },
        ]);
        setCarg(false);
        return;
      }
      const txt = ((data.content || [])[0] || {}).text || "Sin respuesta.";
      const match = txt.match(/<PEDIDO_JSON>([\s\S]*?)<\/PEDIDO_JSON>/);
      if (match) {
        try {
          const pedido = JSON.parse(match[1].trim());
          setPF(pedido);
          setFase("confirmar");
          setMensajes(prev => [
            ...prev,
            {
              rol: "assistant",
              txt: "✅ ¡Perfecto! Ya tengo toda la información. Revisa el resumen y confirma.",
            },
          ]);
        } catch {
          setMensajes(prev => [...prev, { rol: "assistant", txt }]);
        }
      } else {
        setMensajes(prev => [
          ...(esInicio ? [] : [...mensajes, { rol: "user", txt: textoUsuario }]),
          { rol: "assistant", txt },
        ]);
      }
    } catch (e) {
      setMensajes(prev => [...prev, { rol: "assistant", txt: "⚠️ Error: " + e.message }]);
    }
    setCarg(false);
  }

  function enviar() {
    if (!input.trim() || cargando) return;
    const txt = input.trim();
    setInput("");
    enviarMensaje(txt);
  }

  function toggleVoz() {
    if (escuchando) {
      reconRef.current && reconRef.current.stop();
      setEsc(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      pushToast("Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.", "error");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "es-SV";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setEsc(true);
    rec.onend = () => setEsc(false);
    rec.onerror = () => setEsc(false);
    rec.onresult = e => {
      const texto = e.results[0][0].transcript;
      setInput(texto);
    };
    reconRef.current = rec;
    rec.start();
  }

  function hablar(txt) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt.slice(0, 300));
    u.lang = "es-SV";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }

  useEffect(() => {
    const ultimo = mensajes[mensajes.length - 1];
    if ((ultimo || {}).rol === "assistant") hablar(ultimo.txt);
  }, [mensajes]);

  function confirmarPedido() {
    onCrearPedido({ ...PEDIDO_BASE, ...pedidoFinal });
  }
  function editarFormulario() {
    onAbrir({ ...PEDIDO_BASE, ...pedidoFinal });
  }

  // ── Filas del resumen final ──
  const filasResumen = [
    ["👤 Cliente", pedidoFinal?.cliente],
    ["📱 Teléfono", pedidoFinal?.telefono],
    ["✂️ Prenda", pedidoFinal?.tipoPrenda],
    ["🧵 Tela/Color", pedidoFinal ? [pedidoFinal.tela, pedidoFinal.color].filter(Boolean).join(" · ") : ""],
    ["📦 Tallas", (pedidoFinal?.tallasItems || []).map(it => `${it.qty}×${it.talla}`).join(", ") || pedidoFinal?.tallasLibre],
    ["📝 Descripción", pedidoFinal?.descripcion],
    ["🪡 Bordado", pedidoFinal?.tieneBordado ? "Sí" : "No"],
    ["📌 Entrega", pedidoFinal?.fechaEntrega],
    ["✂️ Costurera", pedidoFinal?.costurera],
    esAdmin && ["💰 Precio", pedidoFinal?.precio ? `$${pedidoFinal.precio}` : "—"],
    esAdmin && ["💵 Adelanto recibido", pedidoFinal?.anticipo ? `$${pedidoFinal.anticipo}` : "—"],
  ].filter(Boolean);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 200,
        padding: 0,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "18px 18px 0 0",
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg,#1A5276,#2C1654)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Asistente IA</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              Nuevo pedido por voz o texto
            </div>
          </div>
          <button
            onClick={() => onAbrir(null)}
            title="Formulario manual"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              marginRight: 4,
            }}
          >
            📋 Formulario
          </button>
          <button
            onClick={onCerrar}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {!modoServidor && !apiKey && !ANTHROPIC_KEY && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 28,
              gap: 16,
            }}
          >
            <div style={{ fontSize: 48 }}>🔑</div>
            <div style={{ fontWeight: 800, color: "#2C1654", fontSize: 16, textAlign: "center" }}>
              Configura tu clave de API
            </div>
            <div
              style={{ fontSize: 13, color: "#888", textAlign: "center", lineHeight: 1.6 }}
            >
              Para usar el asistente IA necesitas una clave de API de Anthropic. La puedes
              obtener en <strong>console.anthropic.com</strong>
            </div>
            <div style={{ width: "100%" }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#888",
                  display: "block",
                  marginBottom: 4,
                  textTransform: "uppercase",
                }}
              >
                API Key
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #e0e0e0",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #e0e0e0",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  {showKey ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                if (apiKey.startsWith("sk-")) {
                  localStorage.setItem("taller_ia_key", apiKey);
                  pushToast("Clave guardada", "success");
                } else {
                  pushToast("La clave debe empezar con sk-ant-", "error");
                }
              }}
              style={{ ...BTN("#9B59B6"), width: "100%", padding: "12px", fontSize: 14 }}
            >
              ✅ Guardar y continuar
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("taller_ia_key");
                setApiKey("");
              }}
              style={{
                fontSize: 11,
                color: "#ccc",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Borrar clave guardada
            </button>
          </div>
        )}

        {apiKey && fase === "chat" && (
          <>
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {mensajes.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: colorBurbuja[m.rol].align }}>
                  <div
                    style={{
                      maxWidth: "80%",
                      background: colorBurbuja[m.rol].bg,
                      color: colorBurbuja[m.rol].color,
                      borderRadius: m.rol === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "10px 14px",
                      fontSize: 14,
                      lineHeight: 1.5,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    {m.txt}
                  </div>
                </div>
              ))}
              {cargando && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      background: "#f0f0f0",
                      borderRadius: "16px 16px 16px 4px",
                      padding: "10px 16px",
                      display: "flex",
                      gap: 5,
                      alignItems: "center",
                    }}
                  >
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#9B59B6",
                          animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid #eee",
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: "#fafafa",
              }}
            >
              <button
                onClick={toggleVoz}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "2px solid " + (escuchando ? "#E63946" : "#e0e0e0"),
                  background: escuchando ? "#E63946" : "#fff",
                  cursor: "pointer",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: escuchando ? "0 0 0 4px rgba(230,57,70,0.2)" : "none",
                  transition: "all .2s",
                }}
              >
                {escuchando ? "⏹️" : "🎤"}
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && enviar()}
                placeholder={escuchando ? "Escuchando..." : "Escribe o usa el micrófono..."}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 22,
                  border: "1.5px solid #e0e0e0",
                  outline: "none",
                  fontSize: 14,
                  background: escuchando ? "#FFF5F5" : "#fff",
                }}
              />
              <button
                onClick={enviar}
                disabled={!input.trim() || cargando}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "none",
                  background: !input.trim() || cargando ? "#e0e0e0" : "#9B59B6",
                  color: "#fff",
                  cursor: !input.trim() || cargando ? "not-allowed" : "pointer",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ➤
              </button>
            </div>
          </>
        )}

        {apiKey && fase === "confirmar" && pedidoFinal && (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
              <div style={{ fontWeight: 800, color: "#2C1654", fontSize: 16 }}>
                Resumen del pedido
              </div>
              <div style={{ fontSize: 12, color: "#aaa" }}>Confirma que todo está correcto</div>
            </div>

            <div
              style={{
                background: "#f8f4ff",
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
              }}
            >
              {filasResumen.map(([k, v]) =>
                v ? (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "7px 0",
                      borderBottom: "1px solid #ede5ff",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>{k}</span>
                    <span
                      style={{ fontSize: 13, color: "#2C1654", fontWeight: 700, textAlign: "right" }}
                    >
                      {v}
                    </span>
                  </div>
                ) : null
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={confirmarPedido}
                style={{ ...BTN("#28A745"), width: "100%", padding: "13px", fontSize: 15 }}
              >
                ✅ Guardar pedido
              </button>
              <button
                onClick={editarFormulario}
                style={{ ...BTN("#9B59B6"), width: "100%", padding: "13px", fontSize: 15 }}
              >
                ✏️ Revisar en formulario
              </button>
              <button
                onClick={() => {
                  setFase("chat");
                  setPF(null);
                }}
                style={{ ...BTN("#aaa"), width: "100%", padding: "10px", fontSize: 13 }}
              >
                ↩️ Volver a corregir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
