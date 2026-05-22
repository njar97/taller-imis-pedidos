/**
 * Backup automático de las tablas del taller IMIS a este Google Sheet.
 *
 * Cómo instalarlo:
 *  1. En el Sheet "Datos", menú Extensiones → Apps Script.
 *  2. Borrá el contenido de Code.gs y pegá este archivo entero.
 *  3. Guardá (disquete).
 *  4. Para activar el backup diario:
 *     - En la barra lateral del editor, clic en el ícono de reloj (Triggers).
 *     - "+ Add Trigger" → función: backup, fuente: Time-driven,
 *       tipo: Day timer, hora: 3am–4am.
 *  5. Probalo ya: en el editor, seleccioná la función `backup` del dropdown
 *     y dale Run. La primera vez te va a pedir autorización.
 *
 * El script lee de Supabase REST con la publishable key (la misma que usa
 * la app) y escribe el JSON en la celda A1 de cada hoja. Si una hoja no
 * existe, la crea. Si alguna tabla falla, sigue con las demás.
 */

var SUPABASE_URL = "https://kszdievqesveluzcnzsh.supabase.co";
var SUPABASE_ANON = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

// Mapa de hoja → tabla en Supabase. Los nombres de hojas son los que ya
// existían en el Sheet original.
var TABLAS = [
  { hoja: "pedidos",  tabla: "pedidos"  },
  { hoja: "Bordados", tabla: "bordados" },
  { hoja: "Cuellos",  tabla: "cuellos"  },
  { hoja: "Clientes", tabla: "clientes" },
  { hoja: "Catalogo", tabla: "catalogo" },
];

function backup() {
  var ss = SpreadsheetApp.getActive();
  var resultado = [];
  for (var i = 0; i < TABLAS.length; i++) {
    var t = TABLAS[i];
    try {
      var data = fetchTabla(t.tabla);
      var hoja = ss.getSheetByName(t.hoja);
      if (!hoja) hoja = ss.insertSheet(t.hoja);
      // Limpia la hoja y deja el JSON en A1. Una sola celda con todo el
      // array — mismo patrón que tenía el Sheet original.
      hoja.clear();
      hoja.getRange("A1").setValue(JSON.stringify(data));
      resultado.push(t.tabla + ": " + data.length + " filas");
    } catch (e) {
      resultado.push(t.tabla + ": ERROR " + e.message);
    }
  }
  // Deja un timestamp y resumen en una hoja "Backup" para auditar.
  var auditoria = ss.getSheetByName("Backup") || ss.insertSheet("Backup");
  auditoria.appendRow([new Date(), resultado.join(" | ")]);
}

function fetchTabla(tabla) {
  // Filtra soft-deleted (deleted_at IS NULL) — el mismo filtro que aplica
  // la app. Si querés respaldar también la papelera, sacá el filtro.
  var url = SUPABASE_URL + "/rest/v1/" + tabla +
            "?select=*&deleted_at=is.null&order=id.desc&limit=10000";
  var resp = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": "Bearer " + SUPABASE_ANON,
    },
    muteHttpExceptions: true,
  });
  var code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error("HTTP " + code + " — " + resp.getContentText().slice(0, 200));
  }
  return JSON.parse(resp.getContentText());
}
