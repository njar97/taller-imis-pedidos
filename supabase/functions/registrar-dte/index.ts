// Edge Function — registrar-dte.
//
// La llama el PUENTE (emisor-dte, la VM que habla con Hacienda) cada vez que
// sella o invalida un DTE, venga la emisión de donde venga. Escribe en
// `dte_emitidos`, el registro central del que leen contabilidad y las apps.
//
// Autenticación: cabecera `x-puente-secret` con el secreto compartido
// (secret PUENTE_SECRET). No usa JWT porque quien llama es un servidor, no un
// usuario; y no se le da la service role al puente para no repartirla.
//
// Body:
//   { accion: "emitido",    dte, sello, estado?, origen? }
//   { accion: "invalidado", codigo_generacion, sello_invalidacion,
//                           cod_gen_reemplazo?, motivo?, fecha? }
//
// Idempotente: repetir la misma emisión hace upsert por código de generación.

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL");
const SUPA_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SECRET = Deno.env.get("PUENTE_SECRET") || "";

const supabase = createClient(SUPA_URL, SUPA_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

// El correlativo es la parte numérica final del número de control
// (DTE-03-M001P001-000000000000013 → 13).
const correlativoDe = (numeroControl) => {
  const m = /-(\d{15})$/.exec(numeroControl || "");
  return m ? Number(m[1]) : null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Usá POST" }, 405);
  if (!SECRET || req.headers.get("x-puente-secret") !== SECRET)
    return json({ error: "No autorizado" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const { accion } = body;

    if (accion === "emitido") {
      const dte = body.dte;
      const ident = dte?.identificacion || {};
      if (!ident.codigoGeneracion || !ident.numeroControl || !dte?.emisor?.nit)
        return json({ error: "DTE incompleto: faltan identificación o emisor" }, 400);
      const rec = dte.receptor || dte.sujetoExcluido || {};
      const res = dte.resumen || {};
      const fila = {
        codigo_generacion: String(ident.codigoGeneracion).toUpperCase(),
        nit_emisor: String(dte.emisor.nit).replace(/-/g, ""),
        tipo_dte: ident.tipoDte,
        ambiente: ident.ambiente,
        numero_control: ident.numeroControl,
        correlativo: correlativoDe(ident.numeroControl),
        fec_emi: ident.fecEmi || null,
        hor_emi: ident.horEmi || null,
        receptor_nit: (rec.nit || rec.numDocumento || null)?.replace?.(/-/g, "") ?? null,
        receptor_nombre: rec.nombre || null,
        total: res.totalPagar ?? res.montoTotalOperacion ?? null,
        sello: body.sello || null,
        estado: body.estado || "PROCESADO",
        origen: body.origen || null,
        dte_json: dte,
        actualizado_en: new Date().toISOString(),
      };
      const { error } = await supabase.from("dte_emitidos").upsert(fila, { onConflict: "codigo_generacion" });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, codigo_generacion: fila.codigo_generacion });
    }

    if (accion === "invalidado") {
      const cg = String(body.codigo_generacion || "").toUpperCase();
      if (!cg) return json({ error: "Falta codigo_generacion" }, 400);
      const { data, error } = await supabase.from("dte_emitidos")
        .update({
          estado: "INVALIDADO",
          invalidado_en: body.fecha || new Date().toISOString(),
          sello_invalidacion: body.sello_invalidacion || null,
          cod_gen_reemplazo: body.cod_gen_reemplazo ? String(body.cod_gen_reemplazo).toUpperCase() : null,
          motivo_invalidacion: body.motivo || null,
          actualizado_en: new Date().toISOString(),
        })
        .eq("codigo_generacion", cg)
        .select("codigo_generacion");
      if (error) return json({ error: error.message }, 500);
      if (!data || !data.length)
        return json({ ok: false, error: "Ese DTE no estaba registrado; la invalidación quedó solo en el MH" }, 404);
      return json({ ok: true, codigo_generacion: cg });
    }

    return json({ error: "accion debe ser 'emitido' o 'invalidado'" }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
