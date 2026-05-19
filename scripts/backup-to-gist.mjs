// Backup diario de las 5 tablas del taller IMIS a un Gist privado de GitHub.
//
// Se corre desde .github/workflows/backup.yml (cron 1× por día). Usa la
// publishable key de Supabase (la misma que la app), así que no necesita
// secretos de Supabase. El único secreto es GIST_TOKEN, un GitHub PAT con
// scope `gist`.
//
// Primera corrida:
//   - Si no hay GIST_ID, crea un gist privado y loguea su ID al final.
//   - Hay que copiar ese ID como secret GIST_ID en el repo.
//
// Corridas siguientes:
//   - Actualiza el gist existente.
//
// El gist queda con un archivo por tabla (pedidos.json, bordados.json, ...)
// y un _meta.json con timestamp y resumen.

const SUPA_URL = "https://kszdievqesveluzcnzsh.supabase.co";
const SUPA_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

const TABLAS = ["pedidos", "bordados", "cuellos", "clientes", "catalogo"];

const GITHUB_API = "https://api.github.com";

async function fetchTabla(tabla) {
  const url = `${SUPA_URL}/rest/v1/${tabla}?select=*&deleted_at=is.null&order=id.desc&limit=10000`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPA_ANON,
      Authorization: "Bearer " + SUPA_ANON,
    },
  });
  if (!r.ok) {
    throw new Error(`Supabase ${tabla}: HTTP ${r.status} ${await r.text()}`);
  }
  return r.json();
}

async function main() {
  const token = process.env.GIST_TOKEN;
  const gistId = process.env.GIST_ID || "";
  if (!token) throw new Error("Falta env GIST_TOKEN");

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Iniciando backup`);

  const files = {};
  const resumen = {};
  for (const t of TABLAS) {
    try {
      const data = await fetchTabla(t);
      files[`${t}.json`] = { content: JSON.stringify(data, null, 2) };
      resumen[t] = data.length;
      console.log(`  ${t}: ${data.length} filas`);
    } catch (e) {
      resumen[t] = `ERROR: ${e.message}`;
      console.error(`  ${t}: ${e.message}`);
    }
  }

  files["_meta.json"] = {
    content: JSON.stringify({ timestamp, resumen }, null, 2),
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
  };

  if (gistId) {
    const r = await fetch(`${GITHUB_API}/gists/${gistId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        description: `Taller IMIS backup — ${timestamp}`,
        files,
      }),
    });
    if (!r.ok) throw new Error(`Gist PATCH: HTTP ${r.status} ${await r.text()}`);
    console.log(`✓ Gist ${gistId} actualizado`);
  } else {
    const r = await fetch(`${GITHUB_API}/gists`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        description: `Taller IMIS backup — ${timestamp}`,
        public: false,
        files,
      }),
    });
    if (!r.ok) throw new Error(`Gist POST: HTTP ${r.status} ${await r.text()}`);
    const gist = await r.json();
    console.log(`✓ Gist privado creado: ${gist.id}`);
    console.log(`  URL: ${gist.html_url}`);
    console.log(`  ⚠ Agregá este id como secret GIST_ID en el repo:`);
    console.log(`    ${gist.id}`);
  }
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
