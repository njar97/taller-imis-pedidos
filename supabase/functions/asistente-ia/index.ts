// Proxy del asistente IA de pedidos, EN CASCADA:
//   1) Anthropic (Claude)   2) Groq   3) Google Gemini
// Cada motor usa su propio secreto del servidor: ANTHROPIC_API_KEY,
// GROQ_API_KEY, GEMINI_API_KEY. El navegador no guarda ninguna key.
//
// Si un motor falla por lo que sea (sin credito, 429, modelo retirado),
// se pasa solo al siguiente. La respuesta SIEMPRE sale con la forma de la
// API de Anthropic ({content:[{type:"text",text}]}) para que el frontend
// no cambie. La cabecera x-motor-ia dice cual motor contesto.
//
// Estado 7-sep-2026: Claude sin credito, Gemini con los creditos agotados
// en esa llave -> el que responde es GROQ (openai/gpt-oss-120b), gratis.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-motor-ia",
};

// Ojo: los nombres de modelo caducan. gemini-2.5-flash y gemini-2.0-flash
// ya devuelven 404 "no longer available"; llama-3.3-70b-versatile ya no
// existe en Groq. Si algun dia fallan todos, pedir la lista real a
// /v1beta/models (Gemini) y /openai/v1/models (Groq).
const GROQ_MODELOS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const GEMINI_MODELOS = ["gemini-3.6-flash", "gemini-flash-latest"];

// Los motores alternos siguen el prompt con menos disciplina que Claude:
// se quedan conversando ("listo para guardar?") y nunca emiten el bloque.
// Este recordatorio se les pega al system para que lo suelten.
const REFUERZO = `

=== RECORDATORIO OBLIGATORIO ===
Apenas tengas cliente, prenda, tallas con cantidades, precio, fecha de entrega
y costurera, tu respuesta DEBE ser UNICAMENTE el bloque
<PEDIDO_JSON>{...}</PEDIDO_JSON> con el formato exacto indicado arriba: sin
markdown, sin comillas de codigo, sin texto antes ni despues.
NO preguntes "listo para guardar?" ni pidas confirmacion: si ya tenes los datos,
emiti el bloque de una vez. Si falta un dato, preguntalo en una sola linea corta
y en esa respuesta no pongas el bloque.`;

function texto(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((b) => (typeof b === "string" ? b : ((b as any) || {}).text || ""))
      .join("\n");
  }
  if (c && typeof c === "object" && "text" in (c as any)) {
    return String((c as any).text || "");
  }
  return "";
}

function respuestaAnthropic(txt: string, modelo: string) {
  return {
    id: "msg_" + crypto.randomUUID(),
    type: "message",
    role: "assistant",
    model: modelo,
    content: [{ type: "text", text: txt }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

function json(obj: unknown, status: number, motor: string) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "x-motor-ia": motor },
  });
}

function mensajeDeError(t: string, status: number): string {
  let msg = "HTTP " + status;
  try {
    const d = JSON.parse(t);
    msg = ((d || {}).error || {}).message || msg;
  } catch (_e) { /* respuesta no JSON */ }
  return msg;
}

// ---------- motores ----------

async function porAnthropic(key: string, crudo: string) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: crudo,
    });
    const t = await r.text();
    if (r.ok) return { ok: true, crudo: t };
    return { ok: false, error: mensajeDeError(t, r.status) };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "fallo de red" };
  }
}

async function porGroq(
  key: string,
  sistema: string,
  mensajes: any[],
  maxTokens: number,
) {
  const msgs: any[] = [];
  if (sistema) msgs.push({ role: "system", content: sistema + REFUERZO });
  for (const m of mensajes) {
    msgs.push({
      role: m.role === "assistant" ? "assistant" : "user",
      content: texto(m.content),
    });
  }
  const fallos: string[] = [];
  for (const modelo of GROQ_MODELOS) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelo,
          messages: msgs,
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
      });
      const t = await r.text();
      if (!r.ok) {
        fallos.push(modelo + ": " + mensajeDeError(t, r.status));
        continue;
      }
      const d = JSON.parse(t);
      const salida = (((d.choices || [])[0] || {}).message || {}).content || "";
      if (!salida.trim()) {
        fallos.push(modelo + ": respuesta vacia");
        continue;
      }
      return { ok: true, texto: salida, modelo: "groq/" + modelo };
    } catch (e) {
      fallos.push(modelo + ": " + ((e as Error).message || "fallo de red"));
    }
  }
  return { ok: false, error: fallos.join(" ; ") || "sin modelo disponible" };
}

async function porGemini(
  key: string,
  sistema: string,
  mensajes: any[],
  maxTokens: number,
) {
  const contents = mensajes.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: texto(m.content) }],
  }));
  const cuerpo: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
  };
  if (sistema) cuerpo.systemInstruction = { parts: [{ text: sistema + REFUERZO }] };

  const fallos: string[] = [];
  for (const modelo of GEMINI_MODELOS) {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      modelo +
      ":generateContent?key=" +
      encodeURIComponent(key);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const t = await r.text();
      if (!r.ok) {
        fallos.push(modelo + ": " + mensajeDeError(t, r.status));
        continue;
      }
      const d = JSON.parse(t);
      const partes = (((d.candidates || [])[0] || {}).content || {}).parts || [];
      const salida = partes.map((p: any) => p.text || "").join("");
      if (!salida.trim()) {
        fallos.push(modelo + ": respuesta vacia");
        continue;
      }
      return { ok: true, texto: salida, modelo: "gemini/" + modelo };
    } catch (e) {
      fallos.push(modelo + ": " + ((e as Error).message || "fallo de red"));
    }
  }
  return { ok: false, error: fallos.join(" ; ") || "sin modelo disponible" };
}

// ---------- servidor ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return json({ error: { message: "solo POST" } }, 405, "ninguno");
  }

  const keyClaude = Deno.env.get("ANTHROPIC_API_KEY") || "";
  const keyGroq = Deno.env.get("GROQ_API_KEY") || "";
  const keyGemini = Deno.env.get("GEMINI_API_KEY") || "";

  if (!keyClaude && !keyGroq && !keyGemini) {
    return json(
      {
        error: {
          type: "no_server_key",
          message:
            "No hay ninguna key configurada en Supabase. Agrega ANTHROPIC_API_KEY, GROQ_API_KEY o GEMINI_API_KEY en los secretos de Edge Functions.",
        },
      },
      503,
      "ninguno",
    );
  }

  const crudo = await req.text();
  let cuerpo: any = {};
  try {
    cuerpo = JSON.parse(crudo);
  } catch (_e) {
    cuerpo = {};
  }
  const sistema = texto(cuerpo.system);
  const mensajes = Array.isArray(cuerpo.messages) ? cuerpo.messages : [];
  const maxTokens = Number(cuerpo.max_tokens) > 0 ? Number(cuerpo.max_tokens) : 1000;

  const fallos: string[] = [];

  if (keyClaude) {
    const r = await porAnthropic(keyClaude, crudo);
    if (r.ok) {
      return new Response(r.crudo, {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json", "x-motor-ia": "anthropic" },
      });
    }
    fallos.push("Claude: " + r.error);
  }

  if (keyGroq && mensajes.length) {
    const r = await porGroq(keyGroq, sistema, mensajes, maxTokens);
    if (r.ok) return json(respuestaAnthropic(r.texto!, r.modelo!), 200, "groq");
    fallos.push("Groq: " + r.error);
  } else if (!keyGroq) {
    fallos.push("Groq: falta GROQ_API_KEY");
  }

  if (keyGemini && mensajes.length) {
    const r = await porGemini(keyGemini, sistema, mensajes, maxTokens);
    if (r.ok) return json(respuestaAnthropic(r.texto!, r.modelo!), 200, "gemini");
    fallos.push("Gemini: " + r.error);
  } else if (!keyGemini) {
    fallos.push("Gemini: falta GEMINI_API_KEY");
  }

  return json(
    { error: { type: "todos_los_motores_fallaron", message: fallos.join(" | ") } },
    502,
    "ninguno",
  );
});
