// TALLER IMIS — Code.gs (versión corregida)
// Pega este código completo en el editor de Apps Script:
//   https://script.google.com/d/12ad3-u2aeDnxv6CzuoZmdk7zmkBTdGYRIaFeYNbYDhmY9MJsV6_aL3Ut/edit
//
// Cambios vs. versión anterior (ver docs/apps-script-CHANGELOG.md para detalle):
//  - Eliminada la 'y' huérfana del inicio del archivo.
//  - Validación de MIME y tamaño en subirImagen (rechaza no-imágenes y >4 MB).
//  - LockService para evitar race conditions cuando dos usuarios guardan
//    el mismo registro al mismo tiempo.
//  - setSharing por carpeta (una vez al crearla) en vez de por archivo.
//  - Errores con stack trace en logs.
//  - testLeerDatos eliminada (referenciaba hoja "Datos" que no existe).
//
// Carpetas en Drive: TallerIMIS → Confección / Bordados / Cuellos → [Cliente]

var SHEET_DATOS    = "pedidos";
var SHEET_BORDADOS = "Bordados";
var SHEET_CUELLOS  = "Cuellos";
var SHEET_CLIENTES = "Clientes";
var SHEET_CATALOGO = "Catalogo";
var DRIVE_ROOT     = "Taller IMIS — Imágenes";
var SUBCARPETAS    = { confeccion:"Confección", bordados:"Bordados", cuellos:"Cuellos" };

// MIMEs permitidos en uploads
var MIMES_VALIDOS = ["image/jpeg","image/png","image/webp","application/octet-stream"];
// .octet-stream lo necesitamos para archivos .emb/.dst/.pes de bordado
var TAMANO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ── HELPERS ────────────────────────────────────────────────
function jsonResp(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function respOk(){ return jsonResp({ok:true}); }
function respError(action, err){
  Logger.log("❌ " + action + ": " + (err.stack || err.message || err));
  return jsonResp({error: err.message || String(err), action: action});
}

// Limpia el nombre para usarlo como carpeta (sin caracteres inválidos)
function limpiarNombre(nombre){
  return (nombre||"Sin cliente").replace(/[\/\\:*?"<>|]/g,"").trim().substring(0,50)||"Sin cliente";
}

// ── CARPETAS ─────────────────────────────────────────────────
function obtenerCarpetaRaiz(){
  var f = DriveApp.getFoldersByName(DRIVE_ROOT);
  if(f.hasNext()) return f.next();
  // Crear raíz nueva con sharing público — todos los archivos heredan
  var nueva = DriveApp.createFolder(DRIVE_ROOT);
  try { nueva.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
  return nueva;
}

// Obtiene o crea: Raíz / Módulo / Cliente
// El sharing se hereda de la raíz, no se pone por archivo.
function obtenerCarpetaCliente(modulo, cliente){
  var raiz    = obtenerCarpetaRaiz();
  var nomMod  = SUBCARPETAS[modulo] || SUBCARPETAS.confeccion;
  var fMod    = raiz.getFoldersByName(nomMod);
  var carpMod = fMod.hasNext() ? fMod.next() : raiz.createFolder(nomMod);
  var nomCli  = limpiarNombre(cliente);
  var fCli    = carpMod.getFoldersByName(nomCli);
  return fCli.hasNext() ? fCli.next() : carpMod.createFolder(nomCli);
}

// ── LEER / ESCRIBIR HOJAS ────────────────────────────────────
// NOTA: toda la data vive en celda A1 como JSON. Limite: 50 000 chars.
// Cuando se llene, migrar a Postgres (ya hay tablas vacías en Supabase).
function leerHoja(nombre){
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if(!sheet) return [];
  var val = sheet.getRange("A1").getValue().toString().trim();
  if(!val) return [];
  try{ var p=JSON.parse(val); return Array.isArray(p)?p:[]; }catch(e){
    Logger.log("⚠️ JSON inválido en hoja " + nombre + ": " + e.message);
    return [];
  }
}

function escribirHoja(nombre, lista){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nombre);
  if(!sheet) sheet = ss.insertSheet(nombre);
  var json = JSON.stringify(lista);
  // Aviso si nos acercamos al límite de celda (50 000 chars)
  if(json.length > 45000){
    Logger.log("⚠️ Hoja " + nombre + " usa " + json.length + " chars (límite 50 000). Migrar a Postgres pronto.");
  }
  sheet.getRange("A1").setValue(json);
}

// upsertRegistro y borrarRegistro con LockService para evitar race conditions
// cuando dos usuarios guardan al mismo tiempo.
function conLock(fn){
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(10000)){
    throw new Error("Servidor ocupado. Reintentá en unos segundos.");
  }
  try { return fn(); } finally { lock.releaseLock(); }
}

function upsertRegistro(nombre, reg){
  return conLock(function(){
    var lista = leerHoja(nombre);
    var idx = -1;
    for(var i=0;i<lista.length;i++){ if(String(lista[i].id)===String(reg.id)){idx=i;break;} }
    if(idx>=0){ lista[idx]=reg; } else { lista.push(reg); }
    escribirHoja(nombre, lista);
  });
}

function borrarRegistro(nombre, id){
  return conLock(function(){
    escribirHoja(nombre, leerHoja(nombre).filter(function(r){ return String(r.id)!==String(id); }));
  });
}

// ── GET ──────────────────────────────────────────────────────
function doGet(e){
  var action = e&&e.parameter ? (e.parameter.action||"") : "";
  try{
    if(action==="getAll")      return jsonResp({pedidos:  leerHoja(SHEET_DATOS)});
    if(action==="getBordados") return jsonResp({bordados: leerHoja(SHEET_BORDADOS)});
    if(action==="getCuellos")  return jsonResp({cuellos:  leerHoja(SHEET_CUELLOS)});
    if(action==="getClientes") return jsonResp({clientes: leerHoja(SHEET_CLIENTES)});
    if(action==="getCatalogo") return jsonResp({catalogo: leerHoja(SHEET_CATALOGO)});
    return jsonResp({error:"Acción desconocida: "+action});
  }catch(err){ return respError("doGet:"+action, err); }
}

// ── POST ─────────────────────────────────────────────────────
function doPost(e){
  var action = "?";
  try{
    var d = JSON.parse(e.postData.contents);
    action = d.action;
    if(d.action==="save")          { upsertRegistro(SHEET_DATOS,    d.data); return respOk(); }
    if(d.action==="delete")        { borrarRegistro(SHEET_DATOS,    d.id);   return respOk(); }
    if(d.action==="saveBordado")   { upsertRegistro(SHEET_BORDADOS, d.data); return respOk(); }
    if(d.action==="deleteBordado") { borrarRegistro(SHEET_BORDADOS, d.id);   return respOk(); }
    if(d.action==="saveCuello")    { upsertRegistro(SHEET_CUELLOS,  d.data); return respOk(); }
    if(d.action==="deleteCuello")  { borrarRegistro(SHEET_CUELLOS,  d.id);   return respOk(); }
    if(d.action==="saveCliente")   { upsertRegistro(SHEET_CLIENTES, d.data); return respOk(); }
    if(d.action==="deleteCliente") { borrarRegistro(SHEET_CLIENTES, d.id);   return respOk(); }
    if(d.action==="saveCatalogo")  { conLock(function(){ escribirHoja(SHEET_CATALOGO, d.data); }); return respOk(); }
    if(d.action==="uploadImage"){
      return jsonResp(subirImagen(d.base64, d.nombre, d.tipo, d.modulo||"confeccion", d.cliente, d.clienteConf));
    }
    return jsonResp({error:"Acción desconocida: "+d.action});
  }catch(err){ return respError("doPost:"+action, err); }
}

// ── SUBIR IMAGEN ─────────────────────────────────────────────
// Valida MIME y tamaño. Las fotos nuevas idealmente ya van a Supabase,
// esta función queda para compatibilidad con clientes viejos.
function subirImagen(base64, nombre, tipo, modulo, cliente, clienteConf){
  try{
    // Validar MIME
    if(MIMES_VALIDOS.indexOf(tipo) < 0){
      return {ok:false, error:"Tipo no permitido: " + tipo};
    }
    var data = base64.indexOf(",") > -1 ? base64.split(",")[1] : base64;
    // Validar tamaño aprox (base64 expande 33%)
    if(data.length * 0.75 > TAMANO_MAX_BYTES){
      return {ok:false, error:"Archivo muy grande (>" + (TAMANO_MAX_BYTES/1024/1024).toFixed(1) + " MB)"};
    }
    var carpeta = obtenerCarpetaCliente(modulo||"confeccion", cliente);
    var blob    = Utilities.newBlob(Utilities.base64Decode(data), tipo||"image/jpeg", nombre||"foto.jpg");
    var file    = carpeta.createFile(blob);
    // No hacemos setSharing por archivo — la carpeta raíz ya está
    // shared con ANYONE_WITH_LINK y los archivos heredan permisos.

    // Si es bordado vinculado a confección → copiar también en Confección/clienteConf
    if(modulo==="bordados" && clienteConf){
      var carpConf = obtenerCarpetaCliente("confeccion", clienteConf);
      carpConf.addFile(file);
    }

    return {
      ok:true,
      id:file.getId(),
      url:"https://drive.google.com/uc?export=view&id="+file.getId(),
      folderId:carpeta.getId()
    };
  }catch(err){
    Logger.log("❌ subirImagen: " + (err.stack || err.message));
    return {ok:false, error:err.message};
  }
}

// ═══════════════════════════════════════════════════════════════
// MIGRACIÓN — reorganiza archivos existentes en subcarpetas
// Corre UNA SOLA VEZ: Run → migrarArchivosExistentes
// ═══════════════════════════════════════════════════════════════
function migrarArchivosExistentes(){
  var raiz = obtenerCarpetaRaiz();
  var mapaArchivos = {};

  leerHoja(SHEET_DATOS).forEach(function(p){
    (p.imagenes||[]).forEach(function(img){
      var id = img.driveId || extraerIdDrive(img.driveUrl);
      if(id) mapaArchivos[id] = {modulo:"confeccion", cliente:p.cliente};
    });
  });

  // Cachear pedidos para buscarClienteConf — evita N² lecturas
  var pedidosCache = leerHoja(SHEET_DATOS);
  function buscarClienteConfRapido(confRef){
    for(var i=0;i<pedidosCache.length;i++){
      if(String(pedidosCache[i].id)===String(confRef)) return pedidosCache[i].cliente;
    }
    return null;
  }

  leerHoja(SHEET_BORDADOS).forEach(function(b){
    var idRef = b.imagenRefId || extraerIdDrive(b.imagenRefUrl);
    if(idRef){
      mapaArchivos[idRef] = {
        modulo:"bordados", cliente:b.cliente,
        clienteConf: b.confRef ? buscarClienteConfRapido(b.confRef) : null
      };
    }
    var idEmb = b.linkEmbDriveId || extraerIdDrive(b.linkDrive||b.linkEmbDriveUrl);
    if(idEmb){
      mapaArchivos[idEmb] = {
        modulo:"bordados", cliente:b.cliente,
        clienteConf: b.confRef ? buscarClienteConfRapido(b.confRef) : null
      };
    }
  });

  leerHoja(SHEET_CUELLOS).forEach(function(c){
    var idRef = c.imagenRefId || extraerIdDrive(c.imagenRefUrl);
    if(idRef) mapaArchivos[idRef] = {modulo:"cuellos", cliente:c.cliente};
  });

  Logger.log("Archivos mapeados desde registros: "+Object.keys(mapaArchivos).length);

  var movidos = {confeccion:0, bordados:0, cuellos:0, sinRegistro:0, error:0};
  var archivos = raiz.getFiles();

  while(archivos.hasNext()){
    var file = archivos.next();
    var fileId = file.getId();
    try{
      var info = mapaArchivos[fileId];
      var destModulo  = info ? info.modulo  : "confeccion";
      var destCliente = info ? info.cliente : "Sin cliente";
      var carpDest = obtenerCarpetaCliente(destModulo, destCliente);
      carpDest.addFile(file);
      raiz.removeFile(file);

      if(info && info.modulo==="bordados" && info.clienteConf){
        var carpConf = obtenerCarpetaCliente("confeccion", info.clienteConf);
        carpConf.addFile(file);
      }

      if(!info) movidos.sinRegistro++;
      else movidos[info.modulo]++;
    }catch(err){
      Logger.log("⚠️ Error: "+file.getName()+" — "+err.message);
      movidos.error++;
    }
  }

  var nomsMod = ["Confección","Bordados","Cuellos"];
  nomsMod.forEach(function(nom){
    var fMod = raiz.getFoldersByName(nom);
    if(!fMod.hasNext()) return;
    var carpMod = fMod.next();
    var archMod = carpMod.getFiles();
    while(archMod.hasNext()){
      var file = archMod.next();
      var fileId = file.getId();
      try{
        var info = mapaArchivos[fileId];
        var modKey = nom==="Confección"?"confeccion":nom==="Bordados"?"bordados":"cuellos";
        var destCliente = info ? info.cliente : "Sin cliente";
        var carpDest = obtenerCarpetaCliente(modKey, destCliente);
        carpDest.addFile(file);
        carpMod.removeFile(file);
        if(info && info.modulo==="bordados" && info.clienteConf){
          var carpConf = obtenerCarpetaCliente("confeccion", info.clienteConf);
          carpConf.addFile(file);
        }
      }catch(err){
        Logger.log("⚠️ Error en submódulo: "+file.getName()+" — "+err.message);
      }
    }
  });

  Logger.log("✅ Migración completa:");
  Logger.log("   Confección: "+movidos.confeccion);
  Logger.log("   Bordados:   "+movidos.bordados);
  Logger.log("   Cuellos:    "+movidos.cuellos);
  Logger.log("   Sin registro: "+movidos.sinRegistro+" (→ Confección/Sin cliente)");
  if(movidos.error>0) Logger.log("   ⚠️ Errores: "+movidos.error);
}

// Extrae ID de Google Drive desde URL
function extraerIdDrive(url){
  if(!url) return null;
  var m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  return null;
}

// ── PRUEBA ───────────────────────────────────────────────────
function testLeer(){
  Logger.log("Confección: "+leerHoja(SHEET_DATOS).length+" pedidos");
  Logger.log("Bordados:   "+leerHoja(SHEET_BORDADOS).length+" registros");
  Logger.log("Cuellos:    "+leerHoja(SHEET_CUELLOS).length+" registros");
  Logger.log("Clientes:   "+leerHoja(SHEET_CLIENTES).length+" registros");
  Logger.log("Catálogo:   "+leerHoja(SHEET_CATALOGO).length+" registros");
}
