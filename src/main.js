
// Lector de archivos de bordado (.dst/.pes/.jef/.emb) en chunk lazy.
// Importar bajo demanda con: (await import("./leerBordado.js")).leerMetadataBordado
const cargarLectorBordado = () => import("./leerBordado.js").then(m => m.leerMetadataBordado);

const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} = React;
function useDebouncedCallback(fn, delay = 150) {
  const timer = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return useCallback((...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delay);
  }, [delay]);
}
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyam7Sk6hstowABIbcEsH7zEJ46eIWNKIRCrm-xmkYCqdC0QF1x0QdGo5qBYo8zU18/exec";
// Hash SHA-256 del PIN admin. Para cambiar el PIN, en una terminal:
//   node -e "console.log(require('crypto').createHash('sha256').update('TU_NUEVO_PIN').digest('hex'))"
// y reemplazá el string de abajo con el resultado.
const PIN_ADMIN_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
const ANTHROPIC_KEY = ""; // ← Pega aquí tu clave sk-ant-...
const TALLER = "Taller IMIS";
const SQL_JS = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js";
const SQL_WASM = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm";
const IDB_NAME = "taller_imis_db";
const IDB_VER = 1;
const IDB_STORE = "imagenes";
const ESTATUS = ["Tomado", "Diseño Wilcom", "Bordado", "En corte", "En costura", "En acabados", "Listo", "Entregado", "Cancelado"];
const EC = {
  "Tomado": {
    bg: "#FFF3CD",
    fg: "#856404"
  },
  "Diseño Wilcom": {
    bg: "#FFE5D0",
    fg: "#7B3A10"
  },
  "Bordado": {
    bg: "#FCE4EC",
    fg: "#880E4F"
  },
  "En corte": {
    bg: "#FFF9C4",
    fg: "#795548"
  },
  "En costura": {
    bg: "#CCE5FF",
    fg: "#004085"
  },
  "En acabados": {
    bg: "#E8D5FF",
    fg: "#4B0082"
  },
  "Listo": {
    bg: "#D4EDDA",
    fg: "#155724"
  },
  "Entregado": {
    bg: "#E2E3E5",
    fg: "#383D41"
  },
  "Cancelado": {
    bg: "#F8D7DA",
    fg: "#721C24"
  }
};
const BORD_E = ["Tomado", "Diseño Wilcom", "Prueba bordado", "En producción", "Listo", "Entregado", "Cancelado"];
const BORD_EC = {
  "Tomado": {
    bg: "#FFF8E1",
    fg: "#7B5E00"
  },
  "Diseño Wilcom": {
    bg: "#E8F5E9",
    fg: "#1B5E20"
  },
  "Prueba bordado": {
    bg: "#E3F2FD",
    fg: "#0D47A1"
  },
  "En producción": {
    bg: "#FCE4EC",
    fg: "#880E4F"
  },
  "Listo": {
    bg: "#D4EDDA",
    fg: "#155724"
  },
  "Entregado": {
    bg: "#E2E3E5",
    fg: "#383D41"
  },
  "Cancelado": {
    bg: "#F8D7DA",
    fg: "#721C24"
  }
};
const SOPORTES_BORD = ["Camisa polo", "Camiseta", "Gorra", "Bolso/Morral", "Toalla", "Tela suelta", "Parche independiente", "Delantal", "Otro"];
const POSICIONES_BORD = ["Pecho izquierdo", "Pecho centro", "Espalda alta", "Espalda completa", "Manga derecha", "Manga izquierda", "Frente gorra", "Costado gorra", "Bolsillo", "Libre/Otra"];
const DISENO_EST = ["Pendiente diseñar", "En Wilcom", "Diseño listo", "Diseño del cliente"];
const CUEL_E = ["Tomado", "En tejido", "Control calidad", "Listo", "Entregado", "Cancelado"];
const CUEL_EC = {
  "Tomado": {
    bg: "#FFF8E1",
    fg: "#7B5E00"
  },
  "En tejido": {
    bg: "#E0F7FA",
    fg: "#006064"
  },
  "Control calidad": {
    bg: "#F3E5F5",
    fg: "#4A148C"
  },
  "Listo": {
    bg: "#D4EDDA",
    fg: "#155724"
  },
  "Entregado": {
    bg: "#E2E3E5",
    fg: "#383D41"
  },
  "Cancelado": {
    bg: "#F8D7DA",
    fg: "#721C24"
  }
};
const TIPOS_CUELLO = ["Redondo básico", "V básico", "Polo (con abertura)", "Con tapa de botones", "Bebé", "Deportivo cuadrado", "Especial/otro"];
const MATS_CUELLO = ["Acrílico", "Algodón", "Poliéster", "Lana", "Mezcla algodón-poliéster", "Otro"];
const CALS_CUELLO = ["Fino", "Medio", "Grueso"];
const TALLAS_CUELLO = ["Bebé", "Niño pequeño", "Niño", "S", "M", "L", "XL", "XXL", "A medida"];
const TIPO_DOC = ["Consumidor Final", "Crédito Fiscal (pendiente datos)", "Crédito Fiscal (completo)"];
const COLABORADORAS = ["(Sin asignar)", "Blanqui", "Sandra", "Tere", "Paty", "Morena", "Imelda"];
const TALLAS_A = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const TALLAS_N = ["2", "4", "6", "8", "10", "12", "14", "16"];
const TALLAS_NUM = ["34", "36", "38", "40", "42", "44", "46", "48"];
const MEDIDAS_DEF = [{
  k: "hombro",
  l: "Hombro"
}, {
  k: "pecho",
  l: "Pecho"
}, {
  k: "cintura",
  l: "Cintura"
}, {
  k: "base",
  l: "Base"
}, {
  k: "largo",
  l: "Largo"
}, {
  k: "lManga",
  l: "L. Manga"
}, {
  k: "sisa",
  l: "Sisa"
}, {
  k: "pinsa",
  l: "Pinsa"
}, {
  k: "escote",
  l: "Escote"
}, {
  k: "lAtras",
  l: "L. Atrás"
}, {
  k: "pierna",
  l: "Pierna"
}, {
  k: "rodillo",
  l: "Rodillo"
}, {
  k: "ruedo",
  l: "Ruedo"
}, {
  k: "tiro",
  l: "Tiro"
}];
const CATEGORIAS_INV = [{
  id: "material",
  label: "Material",
  icon: "🧵",
  color: "#9B59B6",
  desc: "Telas, hilos, botones"
}, {
  id: "herramienta",
  label: "Herramienta",
  icon: "✂️",
  color: "#E67E22",
  desc: "Tijeras, agujas, reglas..."
}, {
  id: "equipo",
  label: "Equipo",
  icon: "🔧",
  color: "#2980B9",
  desc: "Máquinas, planchas..."
}];
const medInit = () => Object.fromEntries(MEDIDAS_DEF.map(m => [m.k, ""]));
const hoy = () => new Date().toISOString().split("T")[0];
const fmt$ = n => "$" + parseFloat(n || 0).toFixed(2);
const tallasTexto = (qty = {}) => Object.entries(qty).filter(([, c]) => parseInt(c) > 0).map(([t, c]) => c + "×" + t).join(" · ");
const tallasItemsTexto = (items = []) => items.map(it => {
  const base = `${it.qty}\u00d7${it.talla}`;
  const s = (it.spec || "").trim();
  const abrev = s.length === 0 ? "" : s.length <= 12 ? s : s.replace(/[aeiou\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc]/gi, "").slice(0, 10);
  const p = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0 ? `@$${parseFloat(it.precio).toFixed(2)}` : "";
  const extras = [abrev, p].filter(Boolean).join(" ");
  return extras ? `${base}(${extras})` : base;
}).join(" \u00b7 ");
const resumenTallas = p => {
  if (p.tallasItems && p.tallasItems.length) return tallasItemsTexto(p.tallasItems);
  if (p.modoTallas === "libre") return p.tallasLibre || "";
  return tallasTexto(p.tallasQty || {});
};
const imgSrc = img => {
  if (!img) return "";
  if (img.data) return img.data;
  let fileId = img.driveId || null;
  if (!fileId && img.driveUrl) {
    const m1 = img.driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) fileId = m1[1];else {
      const m2 = img.driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m2) fileId = m2[1];
    }
  }
  if (fileId) return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400";
  if (img.driveUrl) return img.driveUrl;
  return "";
};
const driveViewUrl = id => id ? "https://drive.google.com/file/d/" + id + "/view" : "";
const driveDownloadUrl = id => id ? "https://drive.google.com/uc?export=download&id=" + id : "";
const extractDriveId = url => {
  if (!url) return null;
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m2 ? m2[1] : null;
};
const PEDIDO_BASE = {
  cliente: "",
  tipoCliente: "persona",
  nombreContacto: "",
  telefono: "",
  modoPrenda: "medida",
  tipoPrenda: "",
  modoTallas: "estandar",
  grupoTallas: "adulto",
  tallasQty: {},
  tallasLibre: "",
  tallasItems: [],
  tela: "",
  color: "",
  descripcion: "",
  tieneBordado: false,
  estatusDiseno: "",
  telaComprada: false,
  tipoDocumento: "Consumidor Final",
  razonSocial: "",
  nit: "",
  nrc: "",
  dirFiscal: "",
  precio: "",
  anticipo: "",
  fechaInicio: "",
  fechaEntrega: "",
  estatus: "Tomado",
  costurera: "(Sin asignar)",
  vendedor: "",
  notas: "",
  medidas: medInit(),
  imagenes: [],
  abonos: [],
  personas: [],
  modoRegistro: "tallas",
  tallasItems: []
};
let _idb = null;
function abrirIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, {
      keyPath: "pedidoId"
    });
    req.onsuccess = e => {
      _idb = e.target.result;
      res(_idb);
    };
    req.onerror = e => rej(e.target.error);
  });
}
async function idbGuardar(pedidoId, imagenes) {
  const db = await abrirIDB();
  return new Promise(res => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const st = tx.objectStore(IDB_STORE);
    const imgs = (imagenes || []).filter(i => i.data || i.driveUrl);
    if (imgs.length) {
      const req = st.put({
        pedidoId: String(pedidoId),
        imagenes: imgs
      });
      req.onsuccess = () => res();
      req.onerror = () => res();
    } else {
      const req = st.delete(String(pedidoId));
      req.onsuccess = () => res();
      req.onerror = () => res();
    }
  });
}
async function idbLeerTodas() {
  const db = await abrirIDB();
  return new Promise(res => {
    const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).getAll();
    req.onsuccess = e => res(e.target.result || []);
    req.onerror = () => res([]);
  });
}
async function idbBorrar(pedidoId) {
  const db = await abrirIDB();
  return new Promise(res => {
    const req = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).delete(String(pedidoId));
    req.onsuccess = () => res();
    req.onerror = () => res();
  });
}
async function fetchConTimeout(url, opts = {}, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal
    });
  } finally {
    clearTimeout(t);
  }
}
async function gsLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getAll");
    const d = await r.json();
    if (d.error) console.error("gsLeer error:", d.error);
    return d.pedidos || [];
  } catch (e) {
    console.error("gsLeer fetch error:", e);
    return [];
  }
}
async function gsGuardar(p) {
  const pLimpio = {
    ...p,
    imagenes: (p.imagenes || []).map(img => ({
      nombre: img.nombre,
      tipo: img.tipo,
      driveUrl: img.driveUrl || null,
      driveId: img.driveId || null
    }))
  };
  await fetchConTimeout(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify({
      action: "save",
      data: pLimpio
    })
  });
}
async function gsBorrar(id) {
  await fetchConTimeout(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain"
    },
    body: JSON.stringify({
      action: "delete",
      id
    })
  });
}
async function gsBordLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getBordados");
    const d = await r.json();
    return d.bordados || [];
  } catch {
    return [];
  }
}
async function gsBordGuardar(b) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        action: "saveBordado",
        data: b
      })
    });
  } catch (e) {
    console.error("gsBordGuardar:", e);
    pushToast("No pude guardar el bordado en el servidor", "error");
  }
}
async function gsBordBorrar(id) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        action: "deleteBordado",
        id
      })
    });
  } catch (e) {
    console.error("gsBordBorrar:", e);
    pushToast("No pude eliminar el bordado en el servidor", "error");
  }
}
async function gsCuelLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getCuellos");
    const d = await r.json();
    return d.cuellos || [];
  } catch {
    return [];
  }
}
async function gsCuelGuardar(c) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        action: "saveCuello",
        data: c
      })
    });
  } catch (e) {
    console.error("gsCuelGuardar:", e);
    pushToast("No pude guardar el cuello en el servidor", "error");
  }
}
async function gsCuelBorrar(id) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        action: "deleteCuello",
        id
      })
    });
  } catch (e) {
    console.error("gsCuelBorrar:", e);
    pushToast("No pude eliminar el cuello en el servidor", "error");
  }
}
async function gsClientesLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getClientes");
    const d = await r.json();
    return d.clientes || [];
  } catch {
    return [];
  }
}
async function gsClientesGuardar(cli) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        action: "saveCliente",
        data: cli
      })
    });
  } catch (e) {
    console.error("gsClientesGuardar:", e);
  }
}
async function gsClientesBorrar(id) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        action: "deleteCliente",
        id
      })
    });
  } catch (e) {
    console.error("gsClientesBorrar:", e);
    pushToast("No pude eliminar el cliente en el servidor", "error");
  }
}
async function subirImagenADrive(img, modulo, cliente, clienteConf) {
  if (img.driveUrl) return {
    img,
    ok: true
  };
  if (!img.data) return {
    img,
    ok: false,
    err: "Sin datos locales"
  };
  try {
    const r = await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        action: "uploadImage",
        base64: img.data,
        nombre: img.nombre,
        tipo: img.tipo,
        modulo: modulo || "confeccion",
        cliente: cliente || "Sin cliente",
        clienteConf: clienteConf || null
      })
    }, 60000);
    if (!r.ok) return {
      img,
      ok: false,
      err: "HTTP " + r.status
    };
    const d = await r.json();
    if (d.ok) return {
      img: {
        ...img,
        driveUrl: d.url,
        driveId: d.id
      },
      ok: true
    };
    return {
      img,
      ok: false,
      err: d.error || "Drive rechazó el archivo"
    };
  } catch (e) {
    return {
      img,
      ok: false,
      err: e.message
    };
  }
}
async function subirEmbADrive(file, cliente, clienteConf, nombreSugerido) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const base64 = e.target.result.split(",")[1];
        const r = await fetchConTimeout(SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain"
          },
          body: JSON.stringify({
            action: "uploadImage",
            base64,
            nombre: nombreSugerido ? nombreSugerido.replace(/[\/\\:*?"<>|]/g, "").substring(0, 80) + "." + file.name.split(".").pop().toLowerCase() : file.name,
            tipo: "application/octet-stream",
            modulo: "bordados",
            cliente: cliente || "Sin cliente",
            clienteConf: clienteConf || null
          })
        }, 60000);
        const d = await r.json();
        if (d.ok) res({
          ok: true,
          url: d.url,
          id: d.id,
          nombre: file.name
        });else res({
          ok: false,
          err: d.error || "Error Drive"
        });
      } catch (e) {
        res({
          ok: false,
          err: e.message
        });
      }
    };
    reader.onerror = () => res({
      ok: false,
      err: "Error leyendo archivo"
    });
    reader.readAsDataURL(file);
  });
}
function comprimirImagen(file, maxW = 900, calidad = 0.82) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width,
          h = img.height;
        if (w > maxW) {
          h = Math.round(h * (maxW / w));
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        res({
          data: canvas.toDataURL("image/jpeg", calidad),
          nombre: file.name,
          tipo: "image/jpeg",
          w,
          h
        });
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}
async function leerDB(file) {
  if (!window.initSqlJs) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = SQL_JS;
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const SQL = await window.initSqlJs({
    locateFile: () => SQL_WASM
  });
  const buf = await file.arrayBuffer();
  const db = new SQL.Database(new Uint8Array(buf));
  const rows = db.exec(`SELECT d.id AS doc_id,d.fecha_emision AS fecha,d.emisor_nombre AS proveedor,i.id AS item_id,i.numero_item,i.descripcion,i.cantidad,i.unidad_medida AS unidad,i.precio_unitario,(COALESCE(i.venta_gravada,0)+COALESCE(i.venta_exenta,0)+COALESCE(i.venta_no_sujeta,0)) AS total_item FROM documentos d JOIN items_documento i ON i.documento_id=d.id WHERE d.rol='RECIBIDA' AND d.estado='ACTIVO' ORDER BY d.fecha_emision DESC,d.id,i.numero_item`);
  db.close();
  if (!rows.length || !rows[0].values.length) return [];
  const cols = rows[0].columns;
  return rows[0].values.map(row => {
    const r = {};
    cols.forEach((c, i) => r[c] = row[i]);
    return {
      id: `${r.doc_id}-${r.numero_item}`,
      doc_id: r.doc_id,
      fecha: r.fecha || "",
      proveedor: r.proveedor || "Desconocido",
      descripcion: r.descripcion || "(sin descripción)",
      cantidad: parseFloat(r.cantidad || 0),
      unidad: r.unidad || "",
      precio_unitario: parseFloat(r.precio_unitario || 0),
      total: parseFloat(r.total_item || 0)
    };
  });
}
function imprimirPedido(p, esAdmin) {
  if (esAdmin) imprimirRecibo(p);else imprimirProduccion(p);
}
function imprimirRecibo(p) {
  const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
  const tallas = resumenTallas(p);
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const tieneItems = (p.tallasItems || []).length > 0;
  const itemsHTML = tieneItems ? `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;">
      <thead><tr style="background:#2C1654;color:#fff;">
        <th style="padding:6px 10px;text-align:left;">Talla</th>
        <th style="padding:6px 10px;text-align:center;">Cantidad</th>
        <th style="padding:6px 10px;text-align:left;">Especificación</th>
        <th style="padding:6px 10px;text-align:right;">Precio u.</th>
        <th style="padding:6px 10px;text-align:right;">Subtotal</th>
      </tr></thead>
      <tbody>
        ${p.tallasItems.map((it, i) => {
    const tieneP = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0;
    const sub = tieneP ? parseFloat(it.precio) * it.qty : null;
    return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"};">
            <td style="padding:6px 10px;font-weight:800;color:#E67E22;">${it.talla}</td>
            <td style="padding:6px 10px;text-align:center;font-weight:700;">${it.qty}</td>
            <td style="padding:6px 10px;color:#555;">${it.spec || "—"}</td>
            <td style="padding:6px 10px;text-align:right;color:#27AE60;font-weight:700;">${tieneP ? "$" + parseFloat(it.precio).toFixed(2) : "—"}</td>
            <td style="padding:6px 10px;text-align:right;font-weight:800;color:#2C1654;">${sub != null ? "$" + sub.toFixed(2) : "—"}</td>
          </tr>`;
  }).join("")}
        ${(() => {
    const tot = p.tallasItems.filter(it => it.precio != null && it.precio !== "").reduce((s, it) => s + parseFloat(it.precio || 0) * it.qty, 0);
    const totPzas = p.tallasItems.reduce((s, it) => s + it.qty, 0);
    return `<tr style="background:#f0f0f0;font-weight:800;border-top:2px solid #2C1654;">
            <td style="padding:7px 10px;color:#2C1654;">TOTAL</td>
            <td style="padding:7px 10px;text-align:center;color:#2C1654;">${totPzas} prendas</td>
            <td></td><td></td>
            <td style="padding:7px 10px;text-align:right;font-size:15px;color:#2C1654;">${tot > 0 ? "$" + tot.toFixed(2) : ""}</td>
          </tr>`;
  })()}
      </tbody>
    </table>` : tallas ? `<div style="margin-top:6px;font-size:14px;color:#E67E22;font-weight:700;">📦 ${tallas}</div>` : "";
  const w = window.open("", "_blank", "width=780,height=1050");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Recibo N°${num}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 36px;font-size:13px;}
    @media print{body{padding:14px 20px;}.no-print{display:none!important;}@page{margin:10mm;size:A4;}}
    table{border-collapse:collapse;width:100%;}
    .sec{font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #9B59B6;padding-bottom:4px;margin:16px 0 10px;}
  </style></head><body>

  <!-- Botones no-print -->
  <div class="no-print" style="text-align:right;margin-bottom:20px;display:flex;gap:8px;justify-content:flex-end;">
    <button onclick="window.print()" style="padding:10px 22px;border-radius:8px;border:none;background:#2C1654;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir</button>
    <button onclick="window.close()" style="padding:10px 16px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
  </div>

  <!-- ENCABEZADO -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2C1654;padding-bottom:14px;margin-bottom:20px;">
    <div>
      <div style="font-size:24px;font-weight:900;color:#2C1654;font-family:Georgia,serif;">${TALLER}</div>
      <div style="font-size:12px;color:#888;margin-top:2px;">Comprobante de Pedido</div>
      <div style="font-size:11px;color:#aaa;margin-top:2px;">Fecha: ${fecha}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Recibo</div>
      <div style="font-size:34px;font-weight:900;color:#9B59B6;line-height:1;">N°${num}</div>
      <div style="margin-top:6px;display:inline-block;padding:3px 12px;border-radius:20px;font-weight:700;font-size:12px;background:${(EC[p.estatus] || {}).bg || "#eee"};color:${(EC[p.estatus] || {}).fg || "#333"};">${p.estatus}</div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;">
    <div style="background:#f8f4ff;border-radius:10px;padding:14px;border-left:4px solid #9B59B6;">
      <div style="font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
        ${p.tipoCliente === "escuela" ? "🏫 Institución" : p.tipoCliente === "empresa" ? "🏢 Empresa" : "👤 Cliente"}
      </div>
      <div style="font-size:17px;font-weight:800;color:#2C1654;">${p.cliente}</div>
      ${p.nombreContacto ? `<div style="font-size:12px;color:#555;margin-top:3px;">Contacto: <strong>${p.nombreContacto}</strong></div>` : ""}
      ${p.telefono ? `<div style="font-size:12px;color:#555;margin-top:2px;">📱 ${p.telefono}</div>` : ""}
    </div>
    <div style="background:#f0fff4;border-radius:10px;padding:14px;border-left:4px solid #27AE60;">
      <div style="font-size:10px;font-weight:800;color:#27AE60;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">📅 Fechas</div>
      ${p.fechaInicio ? `<div style="font-size:12px;color:#555;margin-bottom:3px;">Inicio: <strong>${p.fechaInicio}</strong></div>` : ""}
      <div style="font-size:13px;color:#C0392B;font-weight:800;">Entrega: ${p.fechaEntrega || "Por confirmar"}</div>
    </div>
  </div>

  <!-- DETALLE DEL PEDIDO -->
  <div class="sec">📋 Detalle del pedido</div>
  <div style="background:#fafafa;border:1.5px solid #eee;border-radius:10px;padding:14px;margin-bottom:16px;">
    <div style="font-size:16px;font-weight:800;color:#2C1654;margin-bottom:6px;">✂️ ${p.tipoPrenda || "(sin especificar)"}</div>
    ${p.tela || p.color ? `<div style="font-size:13px;color:#555;margin-bottom:4px;">🧵 ${[p.tela, p.color].filter(Boolean).join(" — ")}</div>` : ""}
    ${p.descripcion ? `<div style="font-size:12px;color:#666;margin-top:6px;padding:8px 10px;background:#fff;border-radius:6px;border-left:3px solid #9B59B6;">${p.descripcion}</div>` : ""}
    ${itemsHTML}
  </div>

  <!-- PAGO -->
  ${p.precio ? `
  <div class="sec">💰 Estado de pago</div>
  <div style="background:#f8fff9;border:1.5px solid #d4edda;border-radius:10px;padding:16px;margin-bottom:16px;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;">
      <div style="background:#fff;border-radius:8px;padding:12px;border:1px solid #eee;">
        <div style="font-size:10px;color:#aaa;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Precio total</div>
        <div style="font-size:22px;font-weight:900;color:#2C1654;">$${parseFloat(p.precio).toFixed(2)}</div>
      </div>
      <div style="background:#fff;border-radius:8px;padding:12px;border:1px solid #eee;">
        <div style="font-size:10px;color:#aaa;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Anticipo recibido</div>
        <div style="font-size:22px;font-weight:900;color:#27AE60;">$${parseFloat(p.anticipo || 0).toFixed(2)}</div>
      </div>
      <div style="background:${saldo > 0 ? "#FFF5F5" : "#F0FFF4"};border-radius:8px;padding:12px;border:2px solid ${saldo > 0 ? "#E74C3C" : "#27AE60"};">
        <div style="font-size:10px;color:#aaa;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Saldo pendiente</div>
        <div style="font-size:22px;font-weight:900;color:${saldo > 0 ? "#E74C3C" : "#27AE60"};">${saldo > 0 ? "$" + saldo.toFixed(2) : "✅ Pagado"}</div>
      </div>
    </div>
  </div>` : ""}

  <!-- CRÉDITO FISCAL -->
  ${p.tipoDocumento !== "Consumidor Final" ? `
  <div class="sec">🧾 Datos fiscales</div>
  <div style="background:#f0f8ff;border:1.5px solid #cce5ff;border-radius:10px;padding:14px;margin-bottom:16px;">
    ${p.tipoDocumento.includes("pendiente") ? `<div style="color:#856404;font-weight:700;margin-bottom:8px;">⚠️ Pendiente recibir datos fiscales completos</div>` : ""}
    ${p.razonSocial ? `<div style="font-weight:700;font-size:14px;margin-bottom:4px;">${p.razonSocial}</div>` : ""}
    <div style="display:flex;gap:20px;font-size:12px;color:#555;">
      ${p.nit ? `<span>NIT: <strong>${p.nit}</strong></span>` : ""}
      ${p.nrc ? `<span>NRC: <strong>${p.nrc}</strong></span>` : ""}
    </div>
    ${p.dirFiscal ? `<div style="font-size:12px;color:#555;margin-top:4px;">${p.dirFiscal}</div>` : ""}
  </div>` : ""}

  <!-- FIRMAS -->
  <div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:32px;">
    <div style="text-align:center;">
      <div style="border-top:1.5px solid #333;padding-top:8px;margin-top:40px;">
        <div style="font-size:11px;font-weight:700;color:#333;">Entregado por — ${TALLER}</div>
        <div style="font-size:10px;color:#aaa;margin-top:2px;">Firma y nombre</div>
      </div>
    </div>
    <div style="text-align:center;">
      <div style="border-top:1.5px solid #333;padding-top:8px;margin-top:40px;">
        <div style="font-size:11px;font-weight:700;color:#333;">Recibido por — Cliente</div>
        <div style="font-size:12px;color:#555;margin-top:2px;">${p.cliente}</div>
      </div>
    </div>
  </div>

  <div style="margin-top:24px;text-align:center;font-size:10px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:12px;">
    ${TALLER} · Recibo N°${num} · Generado el ${fecha}
  </div>
  </body></html>`);
  w.document.close();
}
function imprimirProduccion(p) {
  const tallas = resumenTallas(p);
  const num = String(p.id).padStart(4, "0");
  const fecha = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const imagenes = (p.imagenes || []).filter(img => imgSrc(img));
  const meds = MEDIDAS_DEF.filter(m => (p.medidas || {})[m.k]);
  const tieneItems = (p.tallasItems || []).length > 0;
  const medsHTML = meds.length ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:10px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #1A5276;padding-bottom:4px;margin-bottom:10px;">📐 Medidas</div>
      <table style="border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        ${(() => {
    const rows = [];
    for (let i = 0; i < meds.length; i += 4) {
      rows.push(`<tr>${meds.slice(i, i + 4).map((m, j) => `<td style="padding:7px 10px;border:1px solid #ddd;font-size:11px;background:${j % 2 === 0 ? "#f9f9f9" : "#fff"};color:#888;font-weight:700;">${m.l}</td><td style="padding:7px 12px;border:1px solid #ddd;font-size:14px;font-weight:800;color:#1A5276;">${p.medidas[m.k]} cm</td>`).join("")}</tr>`);
    }
    return rows.join("");
  })()}
      </table>
    </div>` : "";
  const itemsHTML = tieneItems ? `
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
      <thead><tr style="background:#1A5276;color:#fff;">
        <th style="padding:6px 10px;text-align:left;">Talla</th>
        <th style="padding:6px 10px;text-align:center;">Cant.</th>
        <th style="padding:6px 10px;text-align:left;">Especificación / instrucción</th>
      </tr></thead>
      <tbody>
        ${p.tallasItems.map((it, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f4f9f4"};">
          <td style="padding:7px 10px;font-weight:900;font-size:14px;color:#E67E22;border-bottom:1px solid #eee;">${it.talla}</td>
          <td style="padding:7px 10px;text-align:center;font-weight:800;font-size:14px;border-bottom:1px solid #eee;">${it.qty}</td>
          <td style="padding:7px 10px;color:#444;border-bottom:1px solid #eee;">${it.spec || "—"}</td>
        </tr>`).join("")}
        <tr style="background:#e8f5e9;font-weight:800;border-top:2px solid #27AE60;">
          <td style="padding:7px 10px;color:#155724;">TOTAL</td>
          <td style="padding:7px 10px;text-align:center;font-size:15px;color:#155724;">${p.tallasItems.reduce((s, it) => s + it.qty, 0)}</td>
          <td style="padding:7px 10px;color:#888;font-size:11px;">prendas a confeccionar</td>
        </tr>
      </tbody>
    </table>` : tallas ? `<div style="font-size:14px;color:#E67E22;font-weight:700;margin-top:6px;">📦 ${tallas}</div>` : "";
  const imgHTML = imagenes.length ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:10px;font-weight:800;color:#E91E8C;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #E91E8C;padding-bottom:4px;margin-bottom:10px;">📸 Imágenes de referencia</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${imagenes.map(img => `<div style="text-align:center;"><img src="${imgSrc(img)}" style="max-width:160px;max-height:160px;border-radius:8px;border:1.5px solid #e0e0e0;display:block;"/><div style="font-size:9px;color:#aaa;margin-top:3px;">${img.nombre || ""}</div></div>`).join("")}
      </div>
    </div>` : "";
  const w = window.open("", "_blank", "width=820,height=1100");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Orden Producción N°${num}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:24px 30px;font-size:13px;}
    @media print{body{padding:12px 16px;}.no-print{display:none!important;}@page{margin:8mm;size:A4;}}
    table{border-collapse:collapse;width:100%;}
    .sec{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid currentColor;padding-bottom:3px;margin:14px 0 9px;}
    .ficha{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;}
    .campo{display:flex;flex-direction:column;padding:8px 10px;background:#f9f9f9;border-radius:7px;border-left:3px solid #ddd;}
    .campo-lbl{font-size:9px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px;}
    .campo-val{font-size:13px;font-weight:700;color:#222;}
    .urgente{background:#FFF5F5;border-left-color:#E74C3C;}
    .urgente .campo-val{color:#C0392B;}
    .ok{border-left-color:#27AE60;}
    .ok .campo-val{color:#155724;}
  </style></head><body>

  <div class="no-print" style="text-align:right;margin-bottom:16px;display:flex;gap:8px;justify-content:flex-end;">
    <button onclick="window.print()" style="padding:10px 22px;border-radius:8px;border:none;background:#1A5276;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir</button>
    <button onclick="window.close()" style="padding:10px 16px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
  </div>

  <!-- ENCABEZADO -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1A5276;padding-bottom:12px;margin-bottom:16px;">
    <div>
      <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Hoja de Producción</div>
      <div style="font-size:20px;font-weight:900;color:#1A5276;font-family:Georgia,serif;">${TALLER}</div>
      <div style="font-size:11px;color:#aaa;margin-top:2px;">Impreso: ${fecha}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Orden</div>
      <div style="font-size:40px;font-weight:900;color:#1A5276;line-height:1;">N°${num}</div>
      <div style="margin-top:6px;font-size:15px;font-weight:800;color:#E67E22;">
        📅 Entregar: ${p.fechaEntrega || "⚠️ Sin fecha"}
      </div>
    </div>
  </div>

  <!-- CLIENTE Y PRENDA -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
    <div style="background:#f8f4ff;border-radius:10px;padding:13px;border-left:4px solid #9B59B6;">
      <div style="font-size:10px;font-weight:800;color:#9B59B6;text-transform:uppercase;margin-bottom:5px;">👤 Cliente</div>
      <div style="font-size:16px;font-weight:800;color:#2C1654;">${p.cliente}</div>
      ${p.nombreContacto ? `<div style="font-size:12px;color:#555;margin-top:2px;">Contacto: ${p.nombreContacto}</div>` : ""}
      ${p.telefono ? `<div style="font-size:12px;color:#555;">📱 ${p.telefono}</div>` : ""}
    </div>
    <div style="background:#EBF5FB;border-radius:10px;padding:13px;border-left:4px solid #1A5276;">
      <div style="font-size:10px;font-weight:800;color:#1A5276;text-transform:uppercase;margin-bottom:5px;">✂️ Prenda</div>
      <div style="font-size:16px;font-weight:800;color:#1A5276;">${p.tipoPrenda || "(sin especificar)"}</div>
      ${p.tela ? `<div style="font-size:12px;color:#555;margin-top:3px;">🧵 Tela: <strong>${p.tela}</strong></div>` : ""}
      ${p.color ? `<div style="font-size:12px;color:#555;">🎨 Color: <strong>${p.color}</strong></div>` : ""}
    </div>
  </div>

  <!-- FICHA DE PRODUCCIÓN -->
  <div class="sec" style="color:#1A5276;">⚙️ Ficha de producción</div>
  <div class="ficha">
    <div class="campo ${p.costurera && p.costurera !== "(Sin asignar)" ? "ok" : ""}">
      <div class="campo-lbl">Costurera asignada</div>
      <div class="campo-val">${p.costurera || "⚠️ Sin asignar"}</div>
    </div>
    <div class="campo">
      <div class="campo-lbl">Fecha inicio</div>
      <div class="campo-val">${p.fechaInicio || "—"}</div>
    </div>
    <div class="campo ${p.tieneBordado ? "urgente" : ""}">
      <div class="campo-lbl">Bordado</div>
      <div class="campo-val">${p.tieneBordado ? "✅ SÍ LLEVA BORDADO" : "No"}</div>
    </div>
    <div class="campo ${p.telaComprada ? "ok" : "urgente"}">
      <div class="campo-lbl">Tela</div>
      <div class="campo-val">${p.telaComprada ? "✅ Ya comprada" : "⚠️ Pendiente comprar"}</div>
    </div>
    ${p.tieneBordado && p.estatusDiseno ? `<div class="campo" style="grid-column:span 2">
      <div class="campo-lbl">Estado del diseño de bordado</div>
      <div class="campo-val">${p.estatusDiseno}</div>
    </div>` : ""}
  </div>

  <!-- TALLAS Y CANTIDADES -->
  <div class="sec" style="color:#E67E22;">📦 Tallas y cantidades a confeccionar</div>
  ${itemsHTML}

  <!-- DESCRIPCIÓN E INSTRUCCIONES -->
  ${p.descripcion ? `
  <div class="sec" style="color:#6C3483;">📝 Descripción e instrucciones</div>
  <div style="background:#F9F0FF;border:1.5px solid #D7BDE2;border-radius:9px;padding:13px;margin-bottom:14px;font-size:13px;color:#4A235A;line-height:1.6;">
    ${p.descripcion}
  </div>` : ""}

  <!-- NOTAS INTERNAS -->
  ${p.notas ? `
  <div style="background:#FFF9C4;border:1.5px solid #F1C40F;border-radius:9px;padding:12px;margin-bottom:14px;">
    <div style="font-size:10px;font-weight:800;color:#856404;text-transform:uppercase;margin-bottom:4px;">⚠️ Notas / Observaciones internas</div>
    <div style="font-size:13px;color:#856404;">${p.notas}</div>
  </div>` : ""}

  <!-- MEDIDAS -->
  ${medsHTML}

  <!-- PERSONAS INTERNAS -->
  ${p.personas && p.personas.length ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:10px;font-weight:800;color:#1A5276;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #1A5276;padding-bottom:4px;margin-bottom:10px;">👥 Beneficiarios del pedido</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#1A5276;color:#fff;">
          <th style="padding:5px 8px;text-align:left;">#</th>
          <th style="padding:5px 8px;text-align:left;">Nombre</th>
          <th style="padding:5px 8px;text-align:left;">Cargo / Área</th>
          <th style="padding:5px 8px;text-align:center;">Gafete</th>
          <th style="padding:5px 8px;text-align:center;">Talla</th>
          <th style="padding:5px 8px;text-align:center;">✅ OK</th>
        </tr></thead>
        <tbody>
          ${p.personas.map((per, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#f4f9f4"};border-bottom:1px solid #eee;">
            <td style="padding:5px 8px;color:#aaa;">${i + 1}</td>
            <td style="padding:5px 8px;font-weight:700;">${per.nombre || "—"}</td>
            <td style="padding:5px 8px;color:#555;">${per.cargo || "—"}</td>
            <td style="padding:5px 8px;text-align:center;">${per.gafete || "—"}</td>
            <td style="padding:5px 8px;text-align:center;font-weight:800;color:#1A5276;">${per.talla || "—"}</td>
            <td style="padding:5px 8px;text-align:center;">☐</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : ""}

  <!-- IMÁGENES -->
  ${imgHTML}

  <!-- CHECK DE PRODUCCIÓN -->
  <div class="sec" style="color:#27AE60;margin-top:20px;">✅ Control de calidad y entrega</div>
  <table style="border:1px solid #ddd;border-radius:8px;overflow:hidden;font-size:12px;">
    ${["Tela cortada correctamente", "Costuras revisadas", "Bordado aplicado", "Acabados y detalles", "Revisión final — lista para entregar"].map((paso, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"};">
      <td style="padding:9px 14px;width:50%;border-bottom:1px solid #eee;">${paso}</td>
      <td style="padding:9px 14px;width:50%;border-bottom:1px solid #eee;text-align:right;">
        <div style="display:inline-flex;align-items:center;gap:16px;">
          <span>☐ OK</span>
          <span>☐ Corrección</span>
        </div>
      </td>
    </tr>`).join("")}
  </table>

  <div style="margin-top:16px;text-align:center;font-size:10px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:10px;">
    ${TALLER} · Hoja de Producción N°${num} · ${fecha}
  </div>
  </body></html>`);
  w.document.close();
}
const INP = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#FAFAFA",
  fontFamily: "inherit"
};
const LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#888",
  marginBottom: 3,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: .4
};
const SEC = (c = "#9B59B6") => ({
  fontSize: 11,
  fontWeight: 800,
  color: c,
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: "14px 0 8px",
  borderBottom: "1px solid " + c + "33",
  paddingBottom: 3
});
const BTN = (bg = "#9B59B6", disabled = false) => ({
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: disabled ? "#ccc" : bg,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  fontSize: 14
});
const _toastBus = {
  items: [],
  listeners: new Set()
};
function buzz(pattern = 15) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}
function pushToast(msg, kind = "info", duracion = 3500) {
  if (kind === "success") buzz(15);
  if (kind === "error") buzz([20, 60, 20]);
  const id = Date.now() + Math.random();
  _toastBus.items = [..._toastBus.items, {
    id,
    msg,
    kind
  }];
  _toastBus.listeners.forEach(fn => fn());
  setTimeout(() => {
    _toastBus.items = _toastBus.items.filter(t => t.id !== id);
    _toastBus.listeners.forEach(fn => fn());
  }, duracion);
}
function useToasts() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(n => n + 1);
    _toastBus.listeners.add(fn);
    return () => _toastBus.listeners.delete(fn);
  }, []);
  return _toastBus.items;
}
function Toaster() {
  const items = useToasts();
  if (!items.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      top: 16,
      right: 16,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
      maxWidth: "calc(100vw - 32px)"
    }
  }, items.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    style: {
      background: t.kind === "error" ? "#DC3545" : t.kind === "success" ? "#28A745" : "#2C1654",
      color: "#fff",
      padding: "12px 16px",
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 600,
      boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
      pointerEvents: "auto"
    }
  }, t.msg)));
}
const _confirmBus = {
  current: null,
  listeners: new Set()
};
function pushConfirm(opts) {
  return new Promise(resolve => {
    _confirmBus.current = {
      ...opts,
      resolve
    };
    _confirmBus.listeners.forEach(fn => fn());
  });
}
function useConfirm() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(n => n + 1);
    _confirmBus.listeners.add(fn);
    return () => _confirmBus.listeners.delete(fn);
  }, []);
  return _confirmBus.current;
}
function ConfirmDialog() {
  const c = useConfirm();
  if (!c) return null;
  const close = v => {
    const resolver = c.resolve;
    _confirmBus.current = null;
    _confirmBus.listeners.forEach(fn => fn());
    resolver(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 16
    },
    onClick: () => close(false)
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 24,
      maxWidth: 380,
      width: "100%",
      boxShadow: "0 24px 60px rgba(0,0,0,0.3)"
    }
  }, c.titulo && /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      color: "#2C1654",
      fontSize: 16
    }
  }, c.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#444",
      fontSize: 14,
      marginBottom: 18,
      lineHeight: 1.5
    }
  }, c.msg), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => close(false),
    style: {
      padding: "10px 18px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      color: "#666",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600
    }
  }, c.cancelLabel || "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => close(true),
    style: {
      padding: "10px 18px",
      borderRadius: 8,
      border: "none",
      background: c.danger ? "#DC3545" : "#9B59B6",
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700
    }
  }, c.okLabel || "Confirmar"))));
}
function Check({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      fontSize: 14,
      color: "#444",
      padding: "4px 0"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: value,
    onChange: e => onChange(e.target.checked),
    style: {
      width: 18,
      height: 18,
      accentColor: "#9B59B6"
    }
  }), label);
}
function BarraStock({
  total,
  usado
}) {
  const pct = total > 0 ? Math.min(usado / total * 100, 100) : 0;
  const c = pct >= 90 ? "#DC3545" : pct >= 60 ? "#FD7E14" : "#28A745";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f0f0",
      borderRadius: 10,
      height: 7,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      background: c,
      height: "100%",
      borderRadius: 10,
      transition: "width .3s"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 2,
      fontSize: 10,
      color: "#888"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: c,
      fontWeight: 700
    }
  }, "Usado: ", usado.toFixed(2)), /*#__PURE__*/React.createElement("span", null, "Disp: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: total - usado <= 0 ? "#DC3545" : "#28A745"
    }
  }, (total - usado).toFixed(2))), /*#__PURE__*/React.createElement("span", null, "Total: ", total.toFixed(2))));
}
function UploaderImagenes({
  imagenes,
  onChange
}) {
  const fileRef = useRef();
  const [cargando, setCargando] = useState(false);
  const agregar = async e => {
    const files = [...e.target.files];
    if (!files.length) return;
    setCargando(true);
    const nuevas = await Promise.all(files.map(f => comprimirImagen(f)));
    onChange([...(imagenes || []), ...nuevas]);
    setCargando(false);
    e.target.value = "";
  };
  const quitar = idx => onChange((imagenes || []).filter((_, i) => i !== idx));
  const nSubidas = (imagenes || []).filter(i => i.driveUrl).length;
  const nPendientes = (imagenes || []).filter(i => i.data && !i.driveUrl).length;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: SEC("#E91E8C")
  }, "\uD83D\uDCF8 Im\xE1genes de referencia"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    ref: fileRef,
    onChange: agregar,
    style: {
      display: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 8
    }
  }, (imagenes || []).map((img, i) => {
    const src = imgSrc(img);
    const enDrive = !!img.driveUrl;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: "relative",
        width: 90,
        height: 90,
        borderRadius: 8,
        overflow: "hidden",
        border: "1.5px solid " + (enDrive ? "#a8d8a8" : "#e0e0e0"),
        flexShrink: 0
      }
    }, src ? /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: img.nombre,
      style: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        height: "100%",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        color: "#ccc"
      }
    }, "Sin vista"), /*#__PURE__*/React.createElement("button", {
      onClick: () => quitar(i),
      style: {
        position: "absolute",
        top: 3,
        right: 3,
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "none",
        background: "rgba(220,53,69,0.9)",
        color: "#fff",
        cursor: "pointer",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        lineHeight: 1
      }
    }, "\u2715"), enDrive && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(40,167,69,0.85)",
        padding: "2px 4px",
        fontSize: 9,
        color: "#fff",
        textAlign: "center",
        fontWeight: 700
      }
    }, "\u2601\uFE0F Drive"), !enDrive && img.data && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(0,0,0,0.5)",
        padding: "2px 4px",
        fontSize: 9,
        color: "#fff",
        textAlign: "center"
      }
    }, "Local"));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => fileRef.current.click(),
    disabled: cargando,
    style: {
      width: 90,
      height: 90,
      borderRadius: 8,
      border: "2px dashed #e0e0e0",
      background: "#fafafa",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      color: "#bbb",
      fontSize: 12,
      fontWeight: 700,
      flexShrink: 0
    }
  }, cargando ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\u23F3"), /*#__PURE__*/React.createElement("span", null, "Procesando")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24
    }
  }, "\uFF0B"), /*#__PURE__*/React.createElement("span", null, "Foto")))), (imagenes || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      borderRadius: 8,
      padding: "6px 10px",
      background: "#f8f4ff",
      display: "flex",
      gap: 12,
      flexWrap: "wrap"
    }
  }, nSubidas > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#28A745",
      fontWeight: 700
    }
  }, "\u2601\uFE0F ", nSubidas, " en Drive"), nPendientes > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#E67E22",
      fontWeight: 700
    }
  }, "\u23F3 ", nPendientes, " pendiente", nPendientes > 1 ? "s" : "", " de subir"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#aaa"
    }
  }, "Se suben al guardar el pedido")), nPendientes > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      borderRadius: 8,
      padding: "8px 10px",
      background: "#FFF3CD",
      color: "#856404",
      marginTop: 6,
      border: "1px solid #FFE082"
    }
  }, "⚠️ Las fotos no se guardan en borrador. Si cerr\xE1s sin guardar, las perd\xE9s."));
}
function BarraProgreso({
  actual,
  total,
  errores
}) {
  if (!total) return null;
  const pct = Math.round(actual / total * 100);
  const hayError = errores > 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 32,
      width: "100%",
      maxWidth: 360,
      textAlign: "center",
      boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 10
    }
  }, hayError ? "⚠️" : "☁️"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "#2C1654",
      marginBottom: 4
    }
  }, "Subiendo a Google Drive..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#888",
      marginBottom: 16
    }
  }, actual, " de ", total, " foto", total > 1 ? "s" : "", hayError ? ` · ${errores} con error` : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f0f0",
      borderRadius: 10,
      height: 12,
      overflow: "hidden",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      background: hayError ? "linear-gradient(90deg,#E67E22,#DC3545)" : "linear-gradient(90deg,#9B59B6,#E91E8C)",
      height: "100%",
      borderRadius: 10,
      transition: "width .3s"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: hayError ? "#E67E22" : "#9B59B6"
    }
  }, pct, "%")));
}
function ModalSeleccion({
  items,
  onConfirmar,
  onCancelar
}) {
  const grupos = items.reduce((acc, it) => {
    if (!acc[it.doc_id]) acc[it.doc_id] = {
      fecha: it.fecha,
      proveedor: it.proveedor,
      items: []
    };
    acc[it.doc_id].items.push(it);
    return acc;
  }, {});
  const [sel, setSel] = useState(() => {
    const s = {};
    items.forEach(it => s[it.id] = {
      checked: false,
      cat: "material"
    });
    return s;
  });
  const [busq, setBusq] = useState("");
  const toggle = id => setSel(p => ({
    ...p,
    [id]: {
      ...p[id],
      checked: !p[id].checked
    }
  }));
  const setCat = (id, cat) => setSel(p => ({
    ...p,
    [id]: {
      ...p[id],
      cat
    }
  }));
  const toggleDoc = docId => {
    const its = grupos[docId].items;
    const all = its.every(it => sel[it.id].checked);
    setSel(p => {
      const n = {
        ...p
      };
      its.forEach(it => n[it.id] = {
        ...n[it.id],
        checked: !all
      });
      return n;
    });
  };
  const nSel = Object.values(sel).filter(v => v.checked).length;
  const filtrados = busq ? items.filter(it => it.descripcion.toLowerCase().includes(busq.toLowerCase()) || it.proveedor.toLowerCase().includes(busq.toLowerCase())) : items;
  const docsFilt = [...new Set(filtrados.map(it => it.doc_id))];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      width: "100%",
      maxWidth: 760,
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 24px 60px rgba(0,0,0,0.3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 20px 12px",
      borderBottom: "1px solid #eee"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 800,
      color: "#2C1654"
    }
  }, "\uD83D\uDCC2 Importar \xEDtems del DTE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#888",
      marginTop: 2
    }
  }, "Selecciona y clasifica cada \xEDtem"), /*#__PURE__*/React.createElement("input", {
    value: busq,
    onChange: e => setBusq(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar...",
    style: {
      ...INP,
      marginTop: 10
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0 16px"
    }
  }, docsFilt.map(docId => {
    const g = grupos[docId];
    const its = g.items.filter(it => !busq || it.descripcion.toLowerCase().includes(busq.toLowerCase()));
    if (!its.length) return null;
    const allSel = its.every(it => sel[it.id].checked);
    const algSel = its.some(it => sel[it.id].checked);
    return /*#__PURE__*/React.createElement("div", {
      key: docId,
      style: {
        marginTop: 12,
        border: "1.5px solid #eee",
        borderRadius: 10,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => toggleDoc(docId),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: allSel ? "#f8f4ff" : algSel ? "#fffdf5" : "#fafafa",
        cursor: "pointer",
        borderBottom: "1px solid #eee"
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: allSel,
      onChange: () => toggleDoc(docId),
      onClick: e => e.stopPropagation(),
      style: {
        width: 16,
        height: 16,
        accentColor: "#9B59B6"
      },
      ref: el => {
        if (el) el.indeterminate = algSel && !allSel;
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: "#2C1654",
        fontSize: 13,
        flex: 1
      }
    }, g.proveedor), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#aaa"
      }
    }, g.fecha, " \xB7 ", its.filter(it => sel[it.id].checked).length, "/", its.length)), its.map(it => /*#__PURE__*/React.createElement("div", {
      key: it.id,
      style: {
        padding: "10px 14px 10px 28px",
        background: sel[it.id].checked ? "#fdfbff" : "#fff",
        borderBottom: "1px solid #f8f8f8"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: sel[it.id].checked,
      onChange: () => toggle(it.id),
      style: {
        width: 15,
        height: 15,
        accentColor: "#9B59B6",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 13,
        fontWeight: 600,
        color: "#333"
      }
    }, it.descripcion), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#888",
        whiteSpace: "nowrap"
      }
    }, it.cantidad, " ", it.unidad), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#2C1654",
        minWidth: 55,
        textAlign: "right"
      }
    }, fmt$(it.total))), sel[it.id].checked && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 8,
        marginLeft: 24,
        flexWrap: "wrap"
      }
    }, CATEGORIAS_INV.map(cat => /*#__PURE__*/React.createElement("button", {
      key: cat.id,
      onClick: () => setCat(it.id, cat.id),
      title: cat.desc,
      style: {
        padding: "4px 10px",
        borderRadius: 20,
        border: "1.5px solid " + (sel[it.id].cat === cat.id ? cat.color : "#e0e0e0"),
        background: sel[it.id].cat === cat.id ? cat.color + "22" : "#fff",
        color: sel[it.id].cat === cat.id ? cat.color : "#bbb",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700
      }
    }, cat.icon, " ", cat.label))))));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 20px",
      borderTop: "1px solid #eee",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#fafafa",
      borderRadius: "0 0 16px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: nSel > 0 ? "#155724" : "#888",
      fontWeight: 700
    }
  }, nSel > 0 ? `✅ ${nSel} seleccionado(s)` : "Ninguno"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancelar,
    style: BTN("#aaa")
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onConfirmar(items.filter(it => sel[it.id].checked).map(it => ({
      ...it,
      categoria: sel[it.id].cat
    }))),
    disabled: nSel === 0,
    style: BTN("#28A745", nSel === 0)
  }, "\u2705 Agregar ", nSel > 0 ? nSel : "")))));
}
function ModalAsignar({
  material,
  disponible,
  pedidos,
  onGuardar,
  onCancelar
}) {
  const [pedidoId, setPId] = useState("");
  const [cantidad, setCant] = useState("");
  const [nota, setNota] = useState("");
  const cantN = parseFloat(cantidad) || 0;
  const valido = pedidoId && cantN > 0 && cantN <= disponible;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 24,
      width: "100%",
      maxWidth: 420,
      boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "#2C1654",
      marginBottom: 12
    }
  }, "Asignar material a pedido"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8f4ff",
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700
    }
  }, material.descripcion), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#888",
      marginTop: 2
    }
  }, fmt$(material.precio_unitario), "/", material.unidad || "u", " \xB7 Disponible: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#28A745"
    }
  }, disponible.toFixed(2)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Pedido *"), /*#__PURE__*/React.createElement("select", {
    value: pedidoId,
    onChange: e => setPId(e.target.value),
    style: INP
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Seleccionar \u2014"), pedidos.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: String(p.id)
  }, "#", p.id, " \u2014 ", p.cliente)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Cantidad (m\xE1x ", disponible.toFixed(2), ") *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: cantidad,
    onChange: e => setCant(e.target.value),
    min: "0",
    max: disponible,
    step: "0.01",
    style: {
      ...INP,
      borderColor: cantN > disponible ? "#DC3545" : "#e0e0e0"
    }
  }), cantN > 0 && cantN <= disponible && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#555",
      marginTop: 3
    }
  }, "Costo: ", /*#__PURE__*/React.createElement("strong", null, fmt$(cantN * material.precio_unitario)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Nota (opcional)"), /*#__PURE__*/React.createElement("input", {
    value: nota,
    onChange: e => setNota(e.target.value),
    style: INP
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancelar,
    style: BTN("#aaa")
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => valido && onGuardar({
      pedidoId,
      cantidad: cantN,
      nota
    }),
    disabled: !valido,
    style: BTN("#9B59B6", !valido)
  }, "Asignar"))));
}
function SeccionInventario({
  pedidos,
  inventario,
  setInventario,
  asignaciones,
  setAsignaciones,
  esAdmin
}) {
  const fileRef = useRef();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [itemsCrudo, setRaw] = useState(null);
  const [modalAsig, setMAsig] = useState(null);
  const [busq, setBusq] = useState("");
  const [catFiltro, setCatF] = useState("todos");
  const [verDet, setVerDet] = useState(null);
  const cargarDB = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setCargando(true);
    setError("");
    try {
      const items = await leerDB(file);
      if (!items.length) setError("No se encontraron facturas.");else setRaw(items);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setCargando(false);
    e.target.value = "";
  };
  const confirmarSel = elegidos => {
    setInventario(prev => {
      const mapa = Object.fromEntries(prev.map(m => [m.id, m]));
      const ids = new Set(elegidos.map(i => i.id));
      return [...prev.filter(m => !ids.has(m.id)), ...elegidos.map(it => mapa[it.id] ? {
        ...mapa[it.id],
        categoria: it.categoria
      } : {
        ...it
      })];
    });
    setRaw(null);
  };
  const hacerAsig = (mat, {
    pedidoId,
    cantidad,
    nota
  }) => {
    setAsignaciones(prev => [...prev, {
      id: Date.now(),
      materialId: mat.id,
      pedidoId,
      cantidad,
      nota,
      costo: cantidad * mat.precio_unitario
    }]);
    setMAsig(null);
  };
  const elimAsig = id => setAsignaciones(p => p.filter(a => a.id !== id));
  const usadoDe = matId => asignaciones.filter(a => a.materialId === matId).reduce((s, a) => s + a.cantidad, 0);
  const filtrados = inventario.filter(m => (!busq || m.descripcion.toLowerCase().includes(busq.toLowerCase())) && (catFiltro === "todos" || m.categoria === catFiltro));
  const costoPorPedido = pedidos.map(p => {
    const asigs = asignaciones.filter(a => a.pedidoId === String(p.id));
    return {
      ...p,
      costo: asigs.reduce((s, a) => s + a.costo, 0),
      nA: asigs.length
    };
  }).filter(p => p.costo > 0);
  const catInfo = {
    material: {
      color: "#9B59B6",
      icon: "🧵"
    },
    herramienta: {
      color: "#E67E22",
      icon: "✂️"
    },
    equipo: {
      color: "#2980B9",
      icon: "🔧"
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      padding: 16
    },
    className: "main-area"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 17,
      color: "#2C1654",
      fontWeight: 800
    }
  }, "\uD83D\uDCE6 Inventario"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, inventario.length, " \xEDtem(s)")), inventario.length > 0 && /*#__PURE__*/React.createElement("input", {
    value: busq,
    onChange: e => setBusq(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar...",
    style: {
      ...INP,
      width: 160
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".db",
    ref: fileRef,
    onChange: cargarDB,
    style: {
      display: "none"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => fileRef.current.click(),
    disabled: cargando,
    style: {
      ...BTN(cargando ? "#aaa" : "#2C1654"),
      whiteSpace: "nowrap",
      fontSize: 13,
      padding: "9px 14px"
    }
  }, cargando ? "⏳ Leyendo..." : inventario.length > 0 ? "🔄 Actualizar DTE" : "📂 Abrir .db")), error && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#F8D7DA",
      borderRadius: 8,
      padding: "10px 14px",
      color: "#721C24",
      fontSize: 13,
      marginBottom: 12
    }
  }, "\u26A0\uFE0F ", error), inventario.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 48,
      textAlign: "center",
      border: "2px dashed #e0e0e0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 10
    }
  }, "\uD83D\uDCE6"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: "#2C1654",
      marginBottom: 6
    }
  }, "Inventario vac\xEDo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#aaa",
      marginBottom: 18
    }
  }, "Abre tu archivo ", /*#__PURE__*/React.createElement("strong", null, "facturas_dte.db")), /*#__PURE__*/React.createElement("button", {
    onClick: () => fileRef.current.click(),
    style: BTN("#2C1654")
  }, "\uD83D\uDCC2 Abrir facturas_dte.db")) : /*#__PURE__*/React.createElement("div", {
    className: "inv-grid",
    style: {
      display: "grid",
      gridTemplateColumns: esAdmin ? "1fr 270px" : "1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCatF("todos"),
    style: {
      padding: "5px 12px",
      borderRadius: 20,
      border: "1.5px solid " + (catFiltro === "todos" ? "#2C1654" : "#e0e0e0"),
      background: catFiltro === "todos" ? "#2C1654" : "#fff",
      color: catFiltro === "todos" ? "#fff" : "#888",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700
    }
  }, "Todos (", inventario.length, ")"), CATEGORIAS_INV.map(cat => {
    const n = inventario.filter(m => m.categoria === cat.id).length;
    const act = catFiltro === cat.id;
    return /*#__PURE__*/React.createElement("button", {
      key: cat.id,
      onClick: () => setCatF(cat.id),
      style: {
        padding: "5px 12px",
        borderRadius: 20,
        border: "1.5px solid " + (act ? cat.color : "#e0e0e0"),
        background: act ? cat.color + "22" : "#fff",
        color: act ? cat.color : "#888",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700
      }
    }, cat.icon, " ", cat.label, " (", n, ")");
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, filtrados.map(m => {
    const cat = catInfo[m.categoria] || catInfo.material;
    const esMat = m.categoria === "material";
    const usado = esMat ? usadoDe(m.id) : 0;
    const disp = m.cantidad - usado;
    const agot = esMat && disp <= 0;
    const misAsig = esMat ? asignaciones.filter(a => a.materialId === m.id) : [];
    const mostrar = verDet === m.id;
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        background: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        border: "1.5px solid " + (agot ? "#f5c6cb" : "#f0f0f0")
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
        flexWrap: "wrap"
      }
    }, agot && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: "#F8D7DA",
        color: "#721C24",
        padding: "1px 6px",
        borderRadius: 10,
        fontWeight: 700
      }
    }, "AGOTADO"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: cat.color + "22",
        color: cat.color,
        padding: "1px 8px",
        borderRadius: 10,
        fontWeight: 700
      }
    }, cat.icon, " ", m.categoria.charAt(0).toUpperCase() + m.categoria.slice(1))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#2C1654"
      }
    }, m.descripcion), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#888"
      }
    }, m.proveedor, esAdmin ? ` · ${fmt$(m.precio_unitario)}/${m.unidad || "u"}` : ""), esMat ? /*#__PURE__*/React.createElement(BarraStock, {
      total: m.cantidad,
      usado: usado
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#888",
        marginTop: 4
      }
    }, "Cantidad: ", /*#__PURE__*/React.createElement("strong", null, m.cantidad, " ", m.unidad))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 5,
        flexShrink: 0,
        flexDirection: "column",
        alignItems: "flex-end"
      }
    }, esMat && !agot && /*#__PURE__*/React.createElement("button", {
      onClick: () => setMAsig(m),
      style: {
        ...BTN("#9B59B6"),
        padding: "6px 12px",
        fontSize: 12
      }
    }, "+ Asignar"), misAsig.length > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: () => setVerDet(mostrar ? null : m.id),
      style: {
        padding: "5px 10px",
        borderRadius: 8,
        border: "1.5px solid #e0e0e0",
        background: "#fff",
        cursor: "pointer",
        fontSize: 12,
        color: "#666"
      }
    }, mostrar ? "▲" : "▼", " ", misAsig.length)))), mostrar && misAsig.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid #f5f5f5",
        background: "#fafafa"
      }
    }, misAsig.map(a => {
      const ped = pedidos.find(p => String(p.id) === String(a.pedidoId));
      return /*#__PURE__*/React.createElement("div", {
        key: a.id,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderBottom: "1px solid #f0f0f0",
          flexWrap: "wrap"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: "#2C1654"
        }
      }, "#", a.pedidoId, ped ? ` — ${ped.cliente}` : ""), a.nota && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: "#888",
          marginLeft: 6
        }
      }, "\xB7 ", a.nota)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: "#555",
          fontWeight: 600
        }
      }, a.cantidad, " ", m.unidad), esAdmin && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: "#E63946",
          fontWeight: 700
        }
      }, "\u2212", fmt$(a.costo)), /*#__PURE__*/React.createElement("button", {
        onClick: () => elimAsig(a.id),
        style: {
          padding: "3px 7px",
          borderRadius: 6,
          border: "1.5px solid #fdd",
          background: "#fff8f8",
          cursor: "pointer",
          fontSize: 12,
          color: "#DC3545"
        }
      }, "\u2715"));
    })));
  }))), esAdmin && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      alignSelf: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "#9B59B6",
      textTransform: "uppercase",
      marginBottom: 10
    }
  }, "\uD83D\uDCB0 Costo por pedido"), costoPorPedido.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#aaa",
      fontSize: 12,
      textAlign: "center",
      padding: "14px 0"
    }
  }, "Sin asignaciones") : costoPorPedido.map(p => {
    const v = parseFloat(p.precio || 0);
    const mg = v > 0 ? (v - p.costo) / v * 100 : null;
    const mc = mg === null ? null : mg >= 40 ? {
      bg: "#D4EDDA",
      fg: "#155724",
      ic: "✅"
    } : mg >= 20 ? {
      bg: "#FFF3CD",
      fg: "#856404",
      ic: "⚠️"
    } : {
      bg: "#F8D7DA",
      fg: "#721C24",
      ic: "🔴"
    };
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        marginBottom: 10,
        background: "#f8f4ff",
        borderRadius: 8,
        padding: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: "#2C1654",
        fontSize: 13
      }
    }, "#", p.id, " ", p.cliente), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, p.nA, " mat.")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#888",
        marginBottom: 6
      }
    }, p.tipoPrenda), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 5,
        marginBottom: mc ? 5 : 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 6,
        padding: "5px 8px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: "#E63946"
      }
    }, fmt$(p.costo)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#aaa",
        textTransform: "uppercase",
        fontWeight: 700
      }
    }, "Materiales")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 6,
        padding: "5px 8px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: "#2C1654"
      }
    }, fmt$(v)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#aaa",
        textTransform: "uppercase",
        fontWeight: 700
      }
    }, "Venta"))), mc && /*#__PURE__*/React.createElement("div", {
      style: {
        background: mc.bg,
        borderRadius: 6,
        padding: "4px 8px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        color: mc.fg
      }
    }, mc.ic, " Margen: ", mg.toFixed(1), "%")));
  }))), itemsCrudo && /*#__PURE__*/React.createElement(ModalSeleccion, {
    items: itemsCrudo,
    onConfirmar: confirmarSel,
    onCancelar: () => setRaw(null)
  }), modalAsig && /*#__PURE__*/React.createElement(ModalAsignar, {
    material: modalAsig,
    disponible: modalAsig.cantidad - usadoDe(modalAsig.id),
    pedidos: pedidos,
    onGuardar: d => hacerAsig(modalAsig, d),
    onCancelar: () => setMAsig(null)
  }));
}
function PantallaLogin({
  onLogin
}) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [paso, setPaso] = useState("inicio"); // "inicio" | "modulo"

  async function entrarAdmin() {
    try {
      const lock = JSON.parse(localStorage.getItem("imis_pin_lock") || "null");
      if (lock && lock.until && lock.until > Date.now()) {
        const min = Math.ceil((lock.until - Date.now()) / 60000);
        pushToast("Demasiados intentos. Probá de nuevo en " + min + " min.", "error");
        return;
      }
    } catch {}
    const inputHash = await sha256(pin);
    if (inputHash === PIN_ADMIN_HASH) {
      try {
        localStorage.removeItem("imis_pin_lock");
      } catch {}
      onLogin("admin");
      return;
    }
    setErr("PIN incorrecto");
    setPin("");
    setTimeout(() => setErr(""), 2000);
    try {
      const lock = JSON.parse(localStorage.getItem("imis_pin_lock") || '{"count":0}');
      lock.count = (lock.count || 0) + 1;
      if (lock.count >= 5) {
        lock.until = Date.now() + 5 * 60 * 1000;
        lock.count = 0;
        pushToast("Demasiados intentos. Bloqueado 5 minutos.", "error");
      }
      localStorage.setItem("imis_pin_lock", JSON.stringify(lock));
    } catch {}
  }
  const MODULOS = [{
    id: "pedidos",
    icon: "✂️",
    label: "Costura / Confección",
    desc: "Pedidos de prendas y arreglos",
    color: "#9B59B6"
  }, {
    id: "bordados",
    icon: "🪡",
    label: "Bordados",
    desc: "Pedidos de bordado independientes",
    color: "#1A5F5A"
  }, {
    id: "cuellos",
    icon: "🧶",
    label: "Cuellos y Tejidos",
    desc: "Pedidos de tejido de cuellos",
    color: "#B85C00"
  }];
  if (paso === "modulo") return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "linear-gradient(135deg,#1a0a35,#2C1654,#3d2070)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 6
    }
  }, "\u2702\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 900,
      color: "#fff",
      fontFamily: "Georgia,serif"
    }
  }, TALLER), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#9B59B6",
      marginTop: 6
    }
  }, "\xBFQu\xE9 m\xF3dulo vas a trabajar hoy?")), MODULOS.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.id,
    onClick: () => onLogin("operario_" + m.id),
    style: {
      width: "100%",
      padding: "16px 20px",
      borderRadius: 12,
      border: "2px solid " + m.color + "55",
      background: "rgba(255,255,255,0.06)",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 14,
      textAlign: "left",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 34,
      width: 44,
      textAlign: "center"
    }
  }, m.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 15
    }
  }, m.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: m.color,
      marginTop: 2
    }
  }, m.desc)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPaso("inicio"),
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 8,
      border: "1px solid #3a1f6b",
      background: "transparent",
      color: "#555",
      cursor: "pointer",
      fontSize: 12,
      marginTop: 4
    }
  }, "\u2190 Volver")));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "linear-gradient(135deg,#1a0a35,#2C1654,#3d2070)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 400
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 36
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 52,
      marginBottom: 8
    }
  }, "\uD83E\uDDF5"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 900,
      color: "#fff",
      fontFamily: "Georgia,serif"
    }
  }, TALLER), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#9B59B6",
      marginTop: 4
    }
  }, "Sistema de Gesti\xF3n de Pedidos")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPaso("modulo"),
    style: {
      width: "100%",
      padding: "18px 20px",
      borderRadius: 12,
      border: "2px solid #4a2c7a",
      background: "#2C1654",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 14,
      textAlign: "left",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 36
    }
  }, "\u2702\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16
    }
  }, "Entrar como Operario"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#9B59B6",
      marginTop: 2
    }
  }, "Costura \xB7 Bordados \xB7 Cuellos y tejidos"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#2C1654",
      border: "2px solid #4a2c7a",
      borderRadius: 12,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(!open),
    style: {
      width: "100%",
      padding: "18px 20px",
      border: "none",
      background: "transparent",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 14,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 36
    }
  }, "\uD83D\uDD10"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      fontSize: 16
    }
  }, "Administrador"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#9B59B6",
      marginTop: 2
    }
  }, "Montos \xB7 inventario \xB7 fiscal")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      color: "#555"
    }
  }, open ? "▾" : "▸")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: pin,
    placeholder: "PIN",
    onChange: e => setPin(e.target.value),
    onKeyDown: e => e.key === "Enter" && entrarAdmin(),
    style: {
      flex: 1,
      padding: "12px 14px",
      borderRadius: 8,
      border: "1.5px solid #4a2c7a",
      background: "#1a0a36",
      color: "#fff",
      fontSize: 24,
      outline: "none",
      letterSpacing: 12,
      fontFamily: "monospace",
      textAlign: "center"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: entrarAdmin,
    style: {
      padding: "12px 22px",
      borderRadius: 8,
      border: "none",
      background: "#9B59B6",
      color: "#fff",
      fontWeight: 800,
      fontSize: 20,
      cursor: "pointer"
    }
  }, "\u2192")), err && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#FF7979",
      fontSize: 13,
      fontWeight: 700,
      marginTop: 8,
      textAlign: "center"
    }
  }, "\u26A0\uFE0F ", err)))));
}
const TODAS_TALLAS = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "2", "4", "6", "8", "10", "12", "14", "34", "36", "38", "40", "42", "44", "46", "48", "A medida"];
const MEDS_LISTA = [{
  k: "pecho",
  l: "Pecho"
}, {
  k: "cintura",
  l: "Cintura"
}, {
  k: "cadera",
  l: "Cadera"
}, {
  k: "hombro",
  l: "Hombro"
}, {
  k: "largo",
  l: "Largo"
}, {
  k: "manga",
  l: "Manga"
}];
function ListaPrendas({
  items,
  onChange
}) {
  const [expandida, setExp] = useState(null); // id de la fila con medidas abiertas

  const ITEM_BASE = () => ({
    id: Date.now() + Math.random(),
    nombre: "",
    talla: "",
    precio: null,
    cargo: "",
    gafete: "",
    medidas: {},
    abierto: false
  });
  const agregar = () => {
    const nuevo = ITEM_BASE();
    onChange([...(items || []), nuevo]);
    setExp(nuevo.id);
  };
  const quitar = id => {
    onChange((items || []).filter(p => p.id !== id));
    if (expandida === id) setExp(null);
  };
  const editar = (id, k, v) => onChange((items || []).map(p => p.id === id ? {
    ...p,
    [k]: v
  } : p));
  const editMed = (id, k, v) => onChange((items || []).map(p => p.id === id ? {
    ...p,
    medidas: {
      ...p.medidas,
      [k]: v
    }
  } : p));
  const resumen = {};
  (items || []).forEach(p => {
    if (p.talla) resumen[p.talla] = (resumen[p.talla] || 0) + 1;
  });
  const totalPzas = (items || []).length;
  const conMedidas = (items || []).filter(p => Object.values(p.medidas || {}).some(v => v)).length;
  const INP2 = {
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #e0e0e0",
    fontSize: 12,
    outline: "none",
    fontFamily: "inherit",
    background: "#fff",
    width: "100%"
  };
  const MLAB = {
    fontSize: 9,
    fontWeight: 700,
    color: "#888",
    marginBottom: 2,
    display: "block",
    textTransform: "uppercase"
  };
  const copiarMedidas = id => {
    const lista = items || [];
    const idx = lista.findIndex(p => p.id === id);
    if (idx <= 0) return;
    const prev = lista[idx - 1].medidas || {};
    if (!Object.values(prev).some(v => v)) return;
    onChange(lista.map(p => p.id === id ? {
      ...p,
      medidas: {
        ...prev
      }
    } : p));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid #fde0b8",
      borderRadius: 10,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFF3E0",
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "#E67E22"
    }
  }, "\uD83D\uDCCB ", totalPzas, " prenda", totalPzas !== 1 ? "s" : "", " registrada", totalPzas !== 1 ? "s" : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 4,
      flexWrap: "wrap"
    }
  }, Object.entries(resumen).map(([t, n]) => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      background: "#E67E22",
      color: "#fff",
      borderRadius: 12,
      padding: "1px 8px",
      fontSize: 10,
      fontWeight: 700
    }
  }, t, ": ", n)), conMedidas > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#1A5276",
      color: "#fff",
      borderRadius: 12,
      padding: "1px 8px",
      fontSize: 10,
      fontWeight: 700
    }
  }, "\uD83D\uDCD0 ", conMedidas, " con medidas"))), /*#__PURE__*/React.createElement("button", {
    onClick: agregar,
    style: {
      padding: "7px 14px",
      borderRadius: 8,
      border: "none",
      background: "#E67E22",
      color: "#fff",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 800,
      flexShrink: 0
    }
  }, "+ Agregar")), (items || []).length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "24px 0",
      color: "#bbb",
      fontSize: 12
    }
  }, "Presiona ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#E67E22"
    }
  }, "+ Agregar"), " para registrar la primera prenda") : /*#__PURE__*/React.createElement("div", null, (items || []).map((p, i) => {
    const abierto = expandida === p.id;
    const tieneMeds = Object.values(p.medidas || {}).some(v => v);
    const hayPrev = i > 0 && Object.values(items[i - 1].medidas || {}).some(v => v);
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        borderBottom: "1px solid #fde0b8"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "24px 1fr 90px 70px 28px 28px",
        gap: 6,
        alignItems: "center",
        padding: "8px 12px",
        background: i % 2 === 0 ? "#fff" : "#fffbf6"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#ccc",
        fontWeight: 700,
        textAlign: "center"
      }
    }, i + 1), /*#__PURE__*/React.createElement("input", {
      value: p.nombre,
      onChange: e => editar(p.id, "nombre", e.target.value),
      placeholder: `Prenda ${i + 1} / nombre`,
      style: {
        ...INP2
      }
    }), /*#__PURE__*/React.createElement("select", {
      value: p.talla,
      onChange: e => editar(p.id, "talla", e.target.value),
      style: {
        ...INP2,
        cursor: "pointer",
        color: p.talla ? "#2C1654" : "#aaa"
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Talla"), TODAS_TALLAS.map(t => /*#__PURE__*/React.createElement("option", {
      key: t
    }, t))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: 6,
        top: "50%",
        transform: "translateY(-50%)",
        fontSize: 11,
        color: "#27AE60",
        fontWeight: 700,
        pointerEvents: "none"
      }
    }, "$"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      step: "0.01",
      value: p.precio != null ? p.precio : "",
      onChange: e => editar(p.id, "precio", e.target.value !== "" ? parseFloat(e.target.value) : null),
      placeholder: "\u2014",
      style: {
        ...INP2,
        paddingLeft: 16,
        color: "#27AE60",
        fontWeight: 700
      }
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setExp(abierto ? null : p.id),
      title: "Ver medidas",
      style: {
        padding: "4px",
        borderRadius: 6,
        border: "1.5px solid " + (tieneMeds ? "#1A5276" : "#e0e0e0"),
        background: tieneMeds ? "#EBF5FB" : abierto ? "#f0f0f0" : "#fff",
        cursor: "pointer",
        fontSize: 13,
        color: tieneMeds ? "#1A5276" : "#bbb",
        lineHeight: 1
      }
    }, "\uD83D\uDCD0"), /*#__PURE__*/React.createElement("button", {
      onClick: () => quitar(p.id),
      style: {
        padding: "4px",
        borderRadius: 6,
        border: "none",
        background: "none",
        cursor: "pointer",
        fontSize: 16,
        color: "#e0e0e0",
        lineHeight: 1
      }
    }, "\xD7")), abierto && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 14px 12px",
        background: "#F0F4FF",
        borderTop: "1px solid #dce3ff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: "#1A5276",
        textTransform: "uppercase",
        letterSpacing: .5
      }
    }, "\uD83D\uDCD0 Medidas de esta prenda (cm)"), hayPrev && /*#__PURE__*/React.createElement("button", {
      onClick: () => copiarMedidas(p.id),
      style: {
        fontSize: 10,
        color: "#1A5276",
        background: "#fff",
        border: "1px solid #1A5276",
        borderRadius: 6,
        padding: "3px 8px",
        cursor: "pointer",
        fontWeight: 700
      }
    }, "Copiar de prenda anterior")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 8
      }
    }, MEDS_LISTA.map(m => /*#__PURE__*/React.createElement("div", {
      key: m.k
    }, /*#__PURE__*/React.createElement("label", {
      style: MLAB
    }, m.l), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: (p.medidas || {})[m.k] || "",
      onChange: e => editMed(p.id, m.k, e.target.value),
      placeholder: "\u2014",
      style: {
        ...INP2,
        textAlign: "center",
        padding: "6px 4px"
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: MLAB
    }, "Cargo / \xE1rea (opcional)"), /*#__PURE__*/React.createElement("input", {
      value: p.cargo || "",
      onChange: e => editar(p.id, "cargo", e.target.value),
      placeholder: "Ej: administraci\xF3n, docente",
      style: INP2
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: MLAB
    }, "Gafete / ID (opcional)"), /*#__PURE__*/React.createElement("input", {
      value: p.gafete || "",
      onChange: e => editar(p.id, "gafete", e.target.value),
      placeholder: "N\xB0 o c\xF3digo",
      style: {
        ...INP2,
        textAlign: "center"
      }
    })))));
  })), (items || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 14px",
      background: "#fffbf6",
      borderTop: "1px solid #fde0b8",
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#aaa",
      flex: 1
    }
  }, (items || []).filter(p => p.nombre).length, " con nombre \xB7", " ", (items || []).filter(p => p.talla).length, " con talla \xB7", " ", conMedidas, " con medidas", (() => {
    const tot = (items || []).filter(p => p.precio != null && p.precio !== "").reduce((s, p) => s + parseFloat(p.precio || 0), 0);
    return tot > 0 ? ` · Total: $${tot.toFixed(2)}` : "";
  })()), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const primera = (() => {
        const _f = (items || []).find(p => p.talla);
        return _f ? _f.talla : undefined;
      })();
      if (!primera) return;
      onChange((items || []).map(p => p.talla ? p : {
        ...p,
        talla: primera
      }));
    },
    style: {
      padding: "4px 10px",
      borderRadius: 6,
      border: "1.5px solid #E67E22",
      background: "#fff",
      color: "#E67E22",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700
    }
  }, "Igualar talla"), /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      if (await pushConfirm({
        titulo: "Limpiar lista",
        msg: "¿Querés borrar toda la lista de personas? Esta acción no se puede deshacer.",
        okLabel: "Sí, limpiar",
        danger: true
      })) onChange([]);
    },
    style: {
      padding: "4px 10px",
      borderRadius: 6,
      border: "1.5px solid #fdd",
      background: "#fff8f8",
      color: "#DC3545",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700
    }
  }, "Limpiar")));
}
const GRUPOS_TALLAS = {
  adulto: {
    label: "Adulto",
    tallas: ["XS", "S", "M", "L", "XL", "2XL", "3XL"]
  },
  nino: {
    label: "Niño",
    tallas: ["2", "4", "6", "8", "10", "12", "14", "16"]
  },
  numeros: {
    label: "Núm.",
    tallas: ["34", "36", "38", "40", "42", "44", "46", "48"]
  }
};
const MEDIDAS_PERS = ["Hombro", "Pecho", "Cintura", "Cadera", "Largo", "Manga"];
const GRUPOS_TALLAS_PERS = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "2", "4", "6", "8", "10", "12", "14", "34", "36", "38", "40", "42", "44", "46", "48", "A medida"];
function TablaPersonasInternas({
  personas,
  onChange,
  tipoPrenda
}) {
  const [verMedidas, setVerMedidas] = useState(false);
  const PERS_BASE = {
    id: 0,
    nombre: "",
    cargo: "",
    gafete: "",
    talla: "",
    medidas: {}
  };
  function agregar() {
    const nueva = {
      ...PERS_BASE,
      id: Date.now()
    };
    onChange([...(personas || []), nueva]);
  }
  function quitar(id) {
    onChange((personas || []).filter(p => p.id !== id));
  }
  function editar(id, key, val) {
    onChange((personas || []).map(p => p.id === id ? {
      ...p,
      [key]: val
    } : p));
  }
  function editarMedida(id, k, val) {
    onChange((personas || []).map(p => p.id === id ? {
      ...p,
      medidas: {
        ...p.medidas,
        [k]: val
      }
    } : p));
  }
  const resumenTallas = {};
  (personas || []).forEach(p => {
    if (p.talla) resumenTallas[p.talla] = (resumenTallas[p.talla] || 0) + 1;
  });
  const INP2 = {
    padding: "5px 6px",
    borderRadius: 6,
    border: "1px solid #e0e0e0",
    fontSize: 12,
    outline: "none",
    fontFamily: "inherit",
    background: "#fff",
    width: "100%"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid #CCE5FF",
      borderRadius: 10,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#EBF5FB",
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "#1A5276"
    }
  }, "\uD83D\uDC65 Personas internas \u2014 ", (personas || []).length, " registrada", (personas || []).length !== 1 ? "s" : ""), Object.keys(resumenTallas).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#555",
      marginTop: 2,
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, Object.entries(resumenTallas).map(([t, n]) => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      background: "#1A5276",
      color: "#fff",
      borderRadius: 12,
      padding: "1px 8px",
      fontSize: 10,
      fontWeight: 700
    }
  }, t, ": ", n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setVerMedidas(v => !v),
    style: {
      padding: "5px 10px",
      borderRadius: 7,
      border: "1.5px solid #1A5276",
      background: verMedidas ? "#1A5276" : "#fff",
      color: verMedidas ? "#fff" : "#1A5276",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700
    }
  }, "\uD83D\uDCD0 ", verMedidas ? "Ocultar" : "Ver", " medidas"), /*#__PURE__*/React.createElement("button", {
    onClick: agregar,
    style: {
      padding: "5px 12px",
      borderRadius: 7,
      border: "none",
      background: "#1A5276",
      color: "#fff",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700
    }
  }, "+ Agregar"))), (personas || []).length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0",
      color: "#bbb",
      fontSize: 12
    }
  }, "Presiona ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#1A5276"
    }
  }, "+ Agregar"), " para registrar personas") : /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#f0f8ff",
      borderBottom: "1.5px solid #CCE5FF"
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "6px 10px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 700,
      color: "#1A5276",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, "#"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "6px 10px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 700,
      color: "#1A5276",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, "Nombre"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "6px 8px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 700,
      color: "#1A5276",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, "Cargo / \xC1rea"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "6px 8px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 700,
      color: "#1A5276",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, "Gafete"), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "6px 8px",
      textAlign: "center",
      fontSize: 10,
      fontWeight: 700,
      color: "#1A5276",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, "Talla"), verMedidas && MEDIDAS_PERS.map(m => /*#__PURE__*/React.createElement("th", {
    key: m,
    style: {
      padding: "6px 6px",
      textAlign: "center",
      fontSize: 9,
      fontWeight: 700,
      color: "#7F8C8D",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, m)), /*#__PURE__*/React.createElement("th", {
    style: {
      padding: "6px 6px",
      width: 28
    }
  }))), /*#__PURE__*/React.createElement("tbody", null, (personas || []).map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    style: {
      borderBottom: "1px solid #EBF5FB",
      background: i % 2 === 0 ? "#fff" : "#f8fcff"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 10px",
      color: "#aaa",
      fontWeight: 700,
      fontSize: 11
    }
  }, i + 1), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "4px 8px",
      minWidth: 130
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: p.nombre,
    onChange: e => editar(p.id, "nombre", e.target.value),
    placeholder: "Nombre completo",
    style: INP2
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "4px 6px",
      minWidth: 100
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: p.cargo || "",
    onChange: e => editar(p.id, "cargo", e.target.value),
    placeholder: "\xC1rea / cargo",
    style: INP2
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "4px 6px",
      minWidth: 70
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: p.gafete || "",
    onChange: e => editar(p.id, "gafete", e.target.value),
    placeholder: "N\xB0 / ID",
    style: {
      ...INP2,
      textAlign: "center"
    }
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "4px 6px",
      minWidth: 80
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: p.talla || "",
    onChange: e => editar(p.id, "talla", e.target.value),
    style: {
      ...INP2,
      textAlign: "center",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014"), GRUPOS_TALLAS_PERS.map(t => /*#__PURE__*/React.createElement("option", {
    key: t
  }, t)))), verMedidas && MEDIDAS_PERS.map(m => /*#__PURE__*/React.createElement("td", {
    key: m,
    style: {
      padding: "4px 4px",
      minWidth: 54
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: (p.medidas || {})[m] || "",
    onChange: e => editarMedida(p.id, m, e.target.value),
    placeholder: "\u2014",
    style: {
      ...INP2,
      textAlign: "center",
      padding: "5px 2px",
      width: 50
    }
  }))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "4px 6px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => quitar(p.id),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 16,
      color: "#ddd",
      lineHeight: 1
    }
  }, "\xD7"))))))), (personas || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 14px",
      background: "#f0f8ff",
      borderTop: "1px solid #CCE5FF",
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#888",
      flex: 1
    }
  }, (personas || []).filter(p => p.nombre).length, " con nombre \xB7", " ", (personas || []).filter(p => p.talla).length, " con talla \xB7", " ", (personas || []).filter(p => Object.values(p.medidas || {}).some(v => v)).length, " con medidas"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const primera = (() => {
        const _f = (personas || []).find(p => p.talla);
        return _f ? _f.talla : undefined;
      })();
      if (!primera) return;
      onChange((personas || []).map(p => p.talla ? p : {
        ...p,
        talla: primera
      }));
    },
    style: {
      padding: "4px 10px",
      borderRadius: 6,
      border: "1.5px solid #1A5276",
      background: "#fff",
      color: "#1A5276",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700
    }
  }, "Igualar talla"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange([]),
    style: {
      padding: "4px 10px",
      borderRadius: 6,
      border: "1.5px solid #fdd",
      background: "#fff8f8",
      color: "#DC3545",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700
    }
  }, "Limpiar todo")));
}
function SelectorTallas({
  items,
  onChange,
  esAdmin
}) {
  const [grupo, setGrupo] = useState("adulto");
  const [talla, setTalla] = useState("");
  const [qty, setQty] = useState("");
  const [spec, setSpec] = useState("");
  const [precio, setPrecio] = useState("");
  const tGrupo = GRUPOS_TALLAS[grupo].tallas;
  const puedeAgregar = talla && qty !== "" && parseInt(qty) >= 1;
  const agregar = () => {
    if (!puedeAgregar) return;
    onChange([...(items || []), {
      id: Date.now(),
      grupo,
      talla,
      qty: parseInt(qty) || 1,
      spec: spec.trim(),
      precio: precio !== "" ? parseFloat(precio) : null
    }]);
    setSpec("");
    setQty("");
    setPrecio("");
  };
  const quitar = id => onChange((items || []).filter(it => it.id !== id));
  const editField = (id, key, val) => onChange((items || []).map(it => it.id === id ? {
    ...it,
    [key]: val
  } : it));
  const totalPzas = (items || []).reduce((s, it) => s + it.qty, 0);
  const tienePrecios = (items || []).some(it => it.precio != null && it.precio !== "");
  const totalMonto = tienePrecios ? (items || []).reduce((s, it) => s + (it.precio != null && it.precio !== "" ? parseFloat(it.precio) * it.qty : 0), 0) : null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid #fde0b8",
      borderRadius: 10,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      borderBottom: "1px solid #fde0b8",
      background: "#fafafa"
    }
  }, Object.entries(GRUPOS_TALLAS).map(([g, {
    label
  }]) => /*#__PURE__*/React.createElement("button", {
    key: g,
    onClick: () => {
      setGrupo(g);
      setTalla("");
    },
    style: {
      flex: 1,
      padding: "8px 4px",
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      background: grupo === g ? "#FFF3E0" : "transparent",
      color: grupo === g ? "#E67E22" : "#bbb",
      borderRight: g !== "numeros" ? "1px solid #fde0b8" : "none",
      transition: "all .15s"
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12
    }
  }, tGrupo.map(t => {
    const usada = (items || []).filter(it => it.talla === t).length;
    const sel = talla === t;
    return /*#__PURE__*/React.createElement("button", {
      key: t,
      onClick: () => setTalla(sel ? "" : t),
      style: {
        minWidth: 36,
        padding: "5px 8px",
        borderRadius: 7,
        border: "1.5px solid " + (sel ? "#E67E22" : usada > 0 ? "#fcd3a0" : "#e0e0e0"),
        background: sel ? "#E67E22" : usada > 0 ? "#FFF3E0" : "#fff",
        color: sel ? "#fff" : usada > 0 ? "#E67E22" : "#aaa",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 800,
        position: "relative",
        transition: "all .12s"
      }
    }, t, usada > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: -5,
        right: -5,
        background: sel ? "#fff" : "#E67E22",
        color: sel ? "#E67E22" : "#fff",
        borderRadius: "50%",
        width: 14,
        height: 14,
        fontSize: 8,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1
      }
    }, usada));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFBF6",
      border: "1px solid #fde0b8",
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "58px 72px 1fr",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#E67E22",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "Cant."), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "999",
    value: qty,
    onChange: e => setQty(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1)),
    style: {
      width: "100%",
      padding: "7px 4px",
      textAlign: "center",
      borderRadius: 6,
      border: "1.5px solid " + (talla ? "#E67E22" : "#e0e0e0"),
      fontSize: 14,
      fontWeight: 800,
      outline: "none",
      color: "#2C1654"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#27AE60",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "Precio c/u ($)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    step: "0.01",
    value: precio,
    onChange: e => setPrecio(e.target.value),
    placeholder: "0.00",
    disabled: !talla,
    style: {
      width: "100%",
      padding: "7px 6px",
      textAlign: "center",
      borderRadius: 6,
      border: "1.5px solid " + (talla ? "#a8d8a8" : "#e0e0e0"),
      fontSize: 13,
      fontWeight: 700,
      outline: "none",
      color: "#27AE60",
      background: talla ? "#fff" : "#f9f9f9"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#888",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "Especificaci\xF3n / comentario"), /*#__PURE__*/React.createElement("input", {
    value: spec,
    onChange: e => setSpec(e.target.value),
    onKeyDown: e => e.key === "Enter" && agregar(),
    placeholder: talla ? "Ej: manga larga, azul marino, bordado…" : "← Selecciona una talla primero",
    disabled: !talla,
    style: {
      width: "100%",
      padding: "7px 10px",
      borderRadius: 6,
      border: "1.5px solid " + (talla ? "#e0e0e0" : "#f0f0f0"),
      fontSize: 13,
      outline: "none",
      background: talla ? "#fff" : "#f9f9f9",
      color: "#444"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#27AE60",
      fontWeight: 700,
      minHeight: 16
    }
  }, talla && precio !== "" && parseFloat(precio) > 0 ? `Subtotal: $${(parseFloat(precio) * qty).toFixed(2)} (${qty}×$${parseFloat(precio).toFixed(2)})` : ""), /*#__PURE__*/React.createElement("button", {
    onClick: agregar,
    disabled: !puedeAgregar,
    style: {
      padding: "8px 18px",
      borderRadius: 8,
      border: "none",
      flexShrink: 0,
      background: puedeAgregar ? "#E67E22" : "#e0e0e0",
      color: puedeAgregar ? "#fff" : "#bbb",
      fontWeight: 800,
      fontSize: 13,
      cursor: puedeAgregar ? "pointer" : "not-allowed",
      whiteSpace: "nowrap"
    }
  }, "+ Agregar", talla ? ` ${talla}` : ""))), (items || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "42px 48px 60px 1fr 28px",
      gap: 6,
      padding: "0 10px",
      marginBottom: 4
    }
  }, ["Talla", "Cant.", "Precio", "Especificación", ""].map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#bbb",
      textTransform: "uppercase",
      textAlign: i <= 2 ? "center" : "left"
    }
  }, h))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 5
    }
  }, (items || []).map(it => {
    const sub = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0 ? parseFloat(it.precio) * it.qty : null;
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      style: {
        display: "grid",
        gridTemplateColumns: "42px 48px 60px 1fr 28px",
        gap: 6,
        alignItems: "center",
        background: "#fff",
        border: "1px solid #fde0b8",
        borderRadius: 8,
        padding: "6px 10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#E67E22",
        color: "#fff",
        borderRadius: 6,
        padding: "3px 0",
        fontSize: 13,
        fontWeight: 800,
        textAlign: "center"
      }
    }, it.talla), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      max: "999",
      value: it.qty,
      onChange: e => editField(it.id, "qty", Math.max(1, parseInt(e.target.value) || 1)),
      style: {
        width: "100%",
        padding: "4px 2px",
        textAlign: "center",
        borderRadius: 6,
        border: "1px solid #e0e0e0",
        fontSize: 13,
        fontWeight: 800,
        outline: "none",
        color: "#2C1654"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: 7,
        top: "50%",
        transform: "translateY(-50%)",
        fontSize: 11,
        color: "#27AE60",
        fontWeight: 700,
        pointerEvents: "none"
      }
    }, "$"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      step: "0.01",
      value: it.precio != null ? it.precio : "",
      onChange: e => editField(it.id, "precio", e.target.value !== "" ? parseFloat(e.target.value) : null),
      placeholder: "\u2014",
      style: {
        width: "100%",
        padding: "4px 4px 4px 16px",
        textAlign: "left",
        borderRadius: 6,
        border: "1px solid " + (it.precio != null && it.precio !== "" ? "#a8d8a8" : "#e0e0e0"),
        fontSize: 12,
        fontWeight: 700,
        outline: "none",
        color: "#27AE60"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("input", {
      value: it.spec || "",
      onChange: e => editField(it.id, "spec", e.target.value),
      placeholder: "Sin especificaci\xF3n",
      style: {
        width: "100%",
        padding: "4px 8px",
        borderRadius: 6,
        border: "1px solid #e0e0e0",
        fontSize: 12,
        outline: "none",
        color: "#555",
        background: "#fafafa"
      }
    }), sub != null && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#27AE60",
        fontWeight: 700,
        paddingLeft: 4
      }
    }, "= $", sub.toFixed(2))), /*#__PURE__*/React.createElement("button", {
      onClick: () => quitar(it.id),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 18,
        color: "#ddd",
        padding: "0",
        lineHeight: 1,
        textAlign: "center"
      },
      title: "Eliminar"
    }, "\xD7"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: "#FFFBF6",
      border: "1px solid #fde0b8",
      borderRadius: 10,
      padding: "10px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: "1px solid #fde0b8"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 800,
      color: "#aaa",
      textTransform: "uppercase",
      letterSpacing: .5
    }
  }, "Resumen del pedido"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 900,
      color: "#2C1654",
      lineHeight: 1
    }
  }, totalPzas), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#aaa",
      fontWeight: 700,
      textTransform: "uppercase"
    }
  }, "prendas")), totalMonto != null && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      borderLeft: "1px solid #fde0b8",
      paddingLeft: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 900,
      color: "#27AE60",
      lineHeight: 1
    }
  }, "$", totalMonto.toFixed(2)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#aaa",
      fontWeight: 700,
      textTransform: "uppercase"
    }
  }, "total tallas")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 7
    }
  }, (items || []).map(it => {
    const sub = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0 ? parseFloat(it.precio) * it.qty : null;
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#fff",
        border: "1.5px solid #fde0b8",
        borderRadius: 10,
        padding: "8px 10px",
        minWidth: 64,
        maxWidth: 90,
        textAlign: "center",
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#E67E22",
        color: "#fff",
        borderRadius: 7,
        padding: "3px 8px",
        fontSize: 15,
        fontWeight: 900,
        lineHeight: 1.2,
        letterSpacing: .5
      }
    }, it.talla), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        color: "#2C1654",
        marginTop: 2
      }
    }, it.qty, " ", it.qty === 1 ? "prenda" : "prendas"), it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#27AE60",
        fontWeight: 700
      }
    }, "$", parseFloat(it.precio).toFixed(2), " c/u"), sub != null && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#27AE60",
        fontWeight: 800,
        background: "#f0fff4",
        borderRadius: 5,
        padding: "1px 6px"
      }
    }, "= $", sub.toFixed(2)), it.spec && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#888",
        marginTop: 1,
        lineHeight: 1.3,
        maxWidth: 80,
        overflowWrap: "break-word"
      }
    }, it.spec));
  })))), (items || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      textAlign: "center",
      color: "#ccc",
      fontSize: 12,
      padding: "10px 0"
    }
  }, "Selecciona una talla y presiona ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#E67E22"
    }
  }, "+ Agregar"))));
}
const PRENDAS_RAPIDAS = ["Blusa", "Vestido", "Camisa", "Pantalón", "Falda", "Traje", "Uniforme", "Short", "Chaqueta", "Otro"];
const TELAS_RAPIDAS = ["Dacrón", "Satín", "Lino", "Gabardina", "Tafeta", "Lycra", "Algodón", "Dril", "Otro"];
const COLORES_RAPIDOS = ["Blanco", "Negro", "Azul", "Rojo", "Verde", "Café", "Gris", "Morado", "Rosado", "Beige"];
function Chips({
  opciones,
  valor,
  onChange,
  color = "#9B59B6"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 4
    }
  }, opciones.map(op => {
    const sel = valor === op;
    return /*#__PURE__*/React.createElement("button", {
      key: op,
      onClick: () => onChange(sel ? "" : op),
      style: {
        padding: "5px 12px",
        borderRadius: 20,
        border: "1.5px solid " + (sel ? color : "#e0e0e0"),
        background: sel ? color : "#fff",
        color: sel ? "#fff" : "#666",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: sel ? 700 : 400,
        transition: "all .15s"
      }
    }, op);
  }));
}
function FechasRapidas({
  onChange
}) {
  const opts = [{
    l: "1 sem",
    d: 7
  }, {
    l: "2 sem",
    d: 14
  }, {
    l: "3 sem",
    d: 21
  }, {
    l: "1 mes",
    d: 30
  }, {
    l: "2 meses",
    d: 60
  }];
  const [sel, setSel] = useState(null);
  function elegir(d, i) {
    setSel(i);
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + d);
    onChange(fecha.toISOString().split("T")[0]);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 6
    }
  }, opts.map((o, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => elegir(o.d, i),
    style: {
      padding: "5px 10px",
      borderRadius: 20,
      border: "1.5px solid " + (sel === i ? "#27AE60" : "#e0e0e0"),
      background: sel === i ? "#27AE60" : "#fff",
      color: sel === i ? "#fff" : "#666",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: sel === i ? 700 : 400
    }
  }, o.l)));
}
function SeccionOpcional({
  titulo,
  icon,
  color = "#888",
  children
}) {
  const [open, setOpen] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid #f0f0f0",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(v => !v),
    style: {
      width: "100%",
      padding: "10px 14px",
      border: "none",
      background: open ? "#fafafa" : "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 8,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 600,
      color: open ? color : "#888"
    }
  }, titulo), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#ccc",
      fontWeight: 700
    }
  }, open ? "▲" : "▼ Agregar")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      borderTop: "1px solid #f0f0f0",
      background: "#fafafa"
    }
  }, children));
}
function BannerMedidas({
  meds,
  onCargar
}) {
  const resumen = Object.entries(meds).filter(([, v]) => v).slice(0, 4).map(([k, v]) => k + ":" + v).join(" · ");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#EBF5FB",
      border: "1.5px solid #AED6F1",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 8,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "#1A5276"
    }
  }, "\uD83D\uDCD0 Este cliente tiene medidas guardadas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#555",
      marginTop: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, resumen)), /*#__PURE__*/React.createElement("button", {
    onClick: () => onCargar(meds),
    style: {
      padding: "7px 14px",
      borderRadius: 8,
      border: "none",
      background: "#1A5276",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
      flexShrink: 0,
      marginLeft: 10
    }
  }, "\uD83D\uDCD0 Cargar"));
}
function FormPedido({
  initial,
  onSave,
  onCancel,
  rol,
  pedidosExistentes = [],
  clientes = [],
  catalogo = []
}) {
  const DRAFT_KEY = initial ? null : "TALLER_IMIS_BORRADOR";
  const esAdmin = rol === "admin";
  const initForm = () => {
    const base = {
      ...PEDIDO_BASE,
      ...(initial || {}),
      imagenes: [...((initial || {}).imagenes || [])],
      medidas: {
        ...medInit(),
        ...((initial || {}).medidas || {})
      },
      tallasItems: [...((initial || {}).tallasItems || [])],
      abonos: [...((initial || {}).abonos || [])],
      personas: [...((initial || {}).personas || [])],
      modoRegistro: (initial || {}).modoRegistro || "tallas",
      tipoCliente: (initial || {}).tipoCliente || "persona",
      nombreContacto: (initial || {}).nombreContacto || ""
    };
    if (!initial && DRAFT_KEY) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const d = JSON.parse(saved);
          return {
            ...base,
            ...d,
            imagenes: [],
            tallasItems: d.tallasItems || []
          };
        }
      } catch (e) {}
    }
    return base;
  };
  const [f, setF] = useState(initForm);
  const [sugs, setSugs] = useState([]); // sugerencias de cliente
  const [showSugs, setShowSugs] = useState(false);
  const s = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const sm = (k, v) => setF(p => ({
    ...p,
    medidas: {
      ...p.medidas,
      [k]: v
    }
  }));
  const totalTallasAuto = (f.tallasItems || []).filter(it => it.precio != null && it.precio !== "").reduce((s, it) => s + parseFloat(it.precio || 0) * it.qty, 0);
  const totalPzasAuto = (f.tallasItems || []).reduce((s, it) => s + it.qty, 0);
  useEffect(() => {
    if (totalTallasAuto > 0) s("precio", totalTallasAuto.toFixed(2));
  }, [totalTallasAuto]);
  const totalAbonos = (f.abonos || []).reduce((s, a) => s + parseFloat(a.monto || 0), 0);
  const anticopoEfectivo = totalAbonos > 0 ? totalAbonos : parseFloat(f.anticipo || 0);
  const saldo = parseFloat(f.precio || 0) - anticopoEfectivo;
  const tieneCantidad = (f.tallasItems || []).some(it => Number(it.qty) > 0) || (f.personas || []).length > 0;
  const validez = {
    cliente: !!f.cliente.trim(),
    tipoPrenda: !!f.tipoPrenda.trim(),
    cantidad: tieneCantidad,
    fechaEntrega: !!f.fechaEntrega
  };
  const valido = Object.values(validez).every(Boolean);
  useEffect(() => {
    if (initial || !DRAFT_KEY) return;
    try {
      const {
        imagenes,
        ...rest
      } = f;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    } catch (e) {}
  }, [f]);
  const limpiarBorrador = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
  };
  function buscarClientes(q) {
    if (!q || q.length < 2) {
      setSugs([]);
      return;
    }
    const fuente = clientes.length > 0 ? clientes : (pedidosExistentes || []).map(p => ({
      nombre: p.cliente,
      telefono: p.telefono || "",
      tipo: p.tipoCliente,
      contacto: p.nombreContacto || "",
      nit: p.nit || "",
      nrc: p.nrc || "",
      razonSocial: p.razonSocial || "",
      dirFiscal: p.dirFiscal || ""
    }));
    const vistos = new Set();
    const res = fuente.filter(cl => cl.nombre && cl.nombre.toLowerCase().includes(q.toLowerCase())).filter(cl => {
      if (vistos.has(cl.nombre)) return false;
      vistos.add(cl.nombre);
      return true;
    }).slice(0, 5);
    setSugs(res);
  }
  const buscarClientesDebounced = useDebouncedCallback(buscarClientes, 200);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: SEC("#2C1654")
  }, "\uD83D\uDC64 Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    style: INP,
    value: f.cliente,
    placeholder: "Nombre del cliente *",
    onChange: e => {
      s("cliente", e.target.value);
      buscarClientesDebounced(e.target.value);
      setShowSugs(true);
    },
    onBlur: () => setTimeout(() => setShowSugs(false), 150)
  }), showSugs && sugs.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      background: "#fff",
      border: "1.5px solid #e0e0e0",
      borderRadius: 8,
      zIndex: 50,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
    }
  }, sugs.map((sg, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => {
      s("cliente", sg.nombre);
      if (sg.telefono) s("telefono", sg.telefono);
      if (sg.tipo) s("tipoCliente", sg.tipo);
      if (sg.contacto) s("nombreContacto", sg.contacto);
      if (sg.nit) s("nit", sg.nit);
      if (sg.nrc) s("nrc", sg.nrc);
      if (sg.razonSocial) s("razonSocial", sg.razonSocial);
      if (sg.dirFiscal) s("dirFiscal", sg.dirFiscal);
      if (sg.nit && sg.nrc) s("tipoDocumento", "Crédito Fiscal (completo)");
      if (sg.medidas && Object.values(sg.medidas).some(v => v)) setF(p => ({
        ...p,
        medidas: {
          ...p.medidas,
          ...sg.medidas
        },
        _medCliente: sg.medidas
      }));
      setShowSugs(false);
    },
    style: {
      padding: "10px 14px",
      cursor: "pointer",
      borderBottom: "1px solid #f5f5f5",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#2C1654"
    }
  }, sg.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 2,
      flexWrap: "wrap"
    }
  }, sg.telefono && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, "\uD83D\uDCF1 ", sg.telefono), sg.tipo && sg.tipo !== "persona" && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#9B59B6",
      fontWeight: 700
    }
  }, sg.tipo === "empresa" ? "🏢 Empresa" : "🏫 Escuela"), sg.nit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#27AE60",
      fontWeight: 700
    }
  }, "\uD83D\uDCCB CF")))))), /*#__PURE__*/React.createElement("input", {
    style: {
      ...INP,
      marginBottom: 8
    },
    value: f.telefono,
    placeholder: "\uD83D\uDCF1 Tel\xE9fono / WhatsApp",
    onChange: e => s("telefono", e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8
    }
  }, [["persona", "👤 Persona"], ["empresa", "🏢 Empresa"], ["escuela", "🏫 Escuela/Inst."]].map(([val, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: val,
    onClick: () => s("tipoCliente", val),
    style: {
      flex: 1,
      padding: "7px 6px",
      borderRadius: 8,
      border: "1.5px solid " + (f.tipoCliente === val ? "#9B59B6" : "#e0e0e0"),
      background: f.tipoCliente === val ? "#9B59B6" : "#fff",
      color: f.tipoCliente === val ? "#fff" : "#666",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: f.tipoCliente === val ? 700 : 400,
      textAlign: "center"
    }
  }, lbl))), (f.tipoCliente === "empresa" || f.tipoCliente === "escuela") && /*#__PURE__*/React.createElement("input", {
    style: {
      ...INP,
      marginBottom: 8
    },
    value: f.nombreContacto,
    placeholder: f.tipoCliente === "escuela" ? "Nombre del director/contacto" : "Nombre del contacto en la empresa",
    onChange: e => s("nombreContacto", e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: SEC("#9B59B6")
  }, "\u2702\uFE0F Prenda"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 6
    }
  }, (catalogo.length ? catalogo : CATALOGO_BASE).filter(p => p.nombre !== "Bordado independiente").map(prod => {
    const sel = f.tipoPrenda === prod.nombre;
    return /*#__PURE__*/React.createElement("button", {
      key: prod.id,
      onClick: () => {
        s("tipoPrenda", prod.nombre);
        if (prod.modoDefault) s("modoRegistro", prod.modoDefault);
        if (prod.telas && prod.telas.length === 1) s("tela", prod.telas[0]);
        if (prod.requiereCuello) s("tieneBordado", false); // no es bordado pero tiene cuello
      },
      style: {
        padding: "5px 12px",
        borderRadius: 20,
        border: "1.5px solid " + (sel ? "#9B59B6" : "#e0e0e0"),
        background: sel ? "#9B59B6" : "#fff",
        color: sel ? "#fff" : "#666",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: sel ? 700 : 400,
        display: "flex",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("span", null, prod.icono || "✂️"), /*#__PURE__*/React.createElement("span", null, prod.nombre), prod.requiereCuello && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        background: sel ? "rgba(255,255,255,0.3)" : "#f3e5f5",
        color: sel ? "#fff" : "#9B59B6",
        borderRadius: 8,
        padding: "1px 5px"
      }
    }, "+cuello"));
  })), !(catalogo || CATALOGO_BASE).some(p => p.nombre === f.tipoPrenda) && /*#__PURE__*/React.createElement("input", {
    style: {
      ...INP,
      marginBottom: 6
    },
    value: f.tipoPrenda,
    placeholder: "O escribe el tipo de prenda...",
    onChange: e => s("tipoPrenda", e.target.value)
  }), (catalogo.length ? catalogo : CATALOGO_BASE).find(p => p.nombre === f.tipoPrenda) && (catalogo.length ? catalogo : CATALOGO_BASE).find(p => p.nombre === f.tipoPrenda).requiereCuello && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#F3E5F5",
      border: "1px solid #CE93D8",
      borderRadius: 8,
      padding: "7px 12px",
      fontSize: 12,
      color: "#6B2D8B",
      marginBottom: 6
    }
  }, "\uD83E\uDDF6 Esta prenda lleva cuello tejido \u2014 recuerda crear el pedido de cuello en el m\xF3dulo Cuellos"), /*#__PURE__*/React.createElement("div", {
    style: SEC("#E67E22")
  }, "\uD83D\uDC55 Tallas y cantidades"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 10,
      background: "#fafafa",
      borderRadius: 10,
      padding: 4,
      border: "1.5px solid #fde0b8"
    }
  }, [["tallas", "📦 Por tallas", "S, M, L... con cantidades"], ["lista", "📋 Lista de prendas", "Por nombre con medidas opcionales"]].map(([modo, label, desc]) => /*#__PURE__*/React.createElement("button", {
    key: modo,
    onClick: () => s("modoRegistro", modo),
    style: {
      flex: 1,
      padding: "9px 6px",
      borderRadius: 7,
      border: "none",
      cursor: "pointer",
      background: !f.modoRegistro && modo === "tallas" || f.modoRegistro === modo ? "#E67E22" : "transparent",
      color: !f.modoRegistro && modo === "tallas" || f.modoRegistro === modo ? "#fff" : "#aaa",
      fontWeight: !f.modoRegistro && modo === "tallas" || f.modoRegistro === modo ? 700 : 400,
      fontSize: 12,
      lineHeight: 1.4,
      transition: "all .15s",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      opacity: .8,
      marginTop: 1
    }
  }, desc)))), (!f.modoRegistro || f.modoRegistro === "tallas") && /*#__PURE__*/React.createElement(SelectorTallas, {
    items: f.tallasItems,
    onChange: v => s("tallasItems", v)
  }), f.modoRegistro === "lista" && /*#__PURE__*/React.createElement(ListaPrendas, {
    items: f.personas || [],
    onChange: v => {
      s("personas", v);
      const tallaMap = {};
      v.forEach(p => {
        if (!p.talla) return;
        if (!tallaMap[p.talla]) tallaMap[p.talla] = {
          id: Date.now() + Math.random(),
          talla: p.talla,
          qty: 0,
          spec: "",
          precio: null,
          grupo: "adulto"
        };
        tallaMap[p.talla].qty++;
      });
      s("tallasItems", Object.values(tallaMap));
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: SEC("#1A5276")
  }, "\uD83E\uDDF5 Tela y color"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#aaa",
      marginBottom: 4,
      textTransform: "uppercase"
    }
  }, "Tela"), /*#__PURE__*/React.createElement(Chips, {
    opciones: TELAS_RAPIDAS,
    valor: f.tela,
    onChange: v => s("tela", v),
    color: "#1A5276"
  }), (f.tela === "Otro" || !TELAS_RAPIDAS.includes(f.tela)) && /*#__PURE__*/React.createElement("input", {
    style: {
      ...INP,
      marginTop: 4
    },
    value: TELAS_RAPIDAS.includes(f.tela) ? "" : f.tela,
    placeholder: "Nombre de la tela",
    onChange: e => s("tela", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#aaa",
      marginBottom: 4,
      textTransform: "uppercase"
    }
  }, "Color"), /*#__PURE__*/React.createElement(Chips, {
    opciones: COLORES_RAPIDOS,
    valor: f.color,
    onChange: v => s("color", v),
    color: "#E91E8C"
  }), (f.color === "Otro" || !COLORES_RAPIDOS.includes(f.color)) && /*#__PURE__*/React.createElement("input", {
    style: {
      ...INP,
      marginTop: 4
    },
    value: COLORES_RAPIDOS.includes(f.color) ? "" : f.color,
    placeholder: "Color",
    onChange: e => s("color", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: SEC("#27AE60")
  }, "\uD83D\uDCC5 Fecha de entrega"), /*#__PURE__*/React.createElement(FechasRapidas, {
    onChange: v => s("fechaEntrega", v)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    style: {
      ...INP,
      flex: 1
    },
    type: "date",
    value: f.fechaEntrega,
    onChange: e => s("fechaEntrega", e.target.value)
  }), f.fechaEntrega && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#27AE60",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, "\u2705 ", new Date(f.fechaEntrega + "T12:00").toLocaleDateString("es-SV", {
    day: "numeric",
    month: "short"
  }))), /*#__PURE__*/React.createElement("div", {
    style: SEC("#007BFF")
  }, "\u2702\uFE0F Costurera"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8
    }
  }, COLABORADORAS.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => s("costurera", c),
    style: {
      padding: "6px 12px",
      borderRadius: 20,
      border: "1.5px solid " + (f.costurera === c ? "#007BFF" : "#e0e0e0"),
      background: f.costurera === c ? "#007BFF" : "#fff",
      color: f.costurera === c ? "#fff" : "#666",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: f.costurera === c ? 700 : 400
    }
  }, c === "(Sin asignar)" ? "— Sin asignar" : c))), clientes.find(cl => cl.nombre.toLowerCase() === f.cliente.toLowerCase()) && clientes.find(cl => cl.nombre.toLowerCase() === f.cliente.toLowerCase()).medidas && Object.values(clientes.find(cl => cl.nombre.toLowerCase() === f.cliente.toLowerCase()).medidas).some(Boolean) && !f._medCliente && /*#__PURE__*/React.createElement(BannerMedidas, {
    meds: clientes.find(cl => cl.nombre.toLowerCase() === f.cliente.toLowerCase()).medidas,
    onCargar: meds => setF(p => ({
      ...p,
      medidas: {
        ...p.medidas,
        ...meds
      },
      _medCliente: meds
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#aaa",
      textTransform: "uppercase",
      letterSpacing: 1,
      margin: "14px 0 8px"
    }
  }, "Detalles adicionales (opcional)"), /*#__PURE__*/React.createElement(SeccionOpcional, {
    titulo: "Descripci\xF3n y bordado",
    icon: "\uD83D\uDCDD",
    color: "#9B59B6"
  }, /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...INP,
      resize: "vertical",
      minHeight: 60,
      marginBottom: 8
    },
    value: f.descripcion,
    placeholder: "Detalles del trabajo...",
    onChange: e => s("descripcion", e.target.value)
  }), /*#__PURE__*/React.createElement(Check, {
    label: "Lleva bordado",
    value: f.tieneBordado,
    onChange: v => s("tieneBordado", v)
  }), /*#__PURE__*/React.createElement(Check, {
    label: "Tela comprada \u2705",
    value: f.telaComprada,
    onChange: v => s("telaComprada", v)
  }), f.tieneBordado && /*#__PURE__*/React.createElement("input", {
    style: {
      ...INP,
      marginTop: 8
    },
    value: f.estatusDiseno,
    placeholder: "Estado del dise\xF1o en Wilcom...",
    onChange: e => s("estatusDiseno", e.target.value)
  })), !esAdmin && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#aaa",
      textTransform: "uppercase",
      letterSpacing: 1,
      margin: "14px 0 6px"
    }
  }, "\uD83D\uDCB5 Pagos recibidos (opcional)"), /*#__PURE__*/React.createElement(RegistroAbonos, {
    abonos: f.abonos || [],
    precioTotal: f.precio,
    onChange: v => {
      s("abonos", v);
      s("anticipo", v.reduce((sum, a) => sum + parseFloat(a.monto || 0), 0).toFixed(2));
    },
    esAdmin: false
  })), esAdmin && /*#__PURE__*/React.createElement(SeccionOpcional, {
    titulo: totalTallasAuto > 0 ? `💰 Precio y adelanto — Total: $${totalTallasAuto.toFixed(2)} (${totalPzasAuto} pzas)` : "💰 Precio y adelanto",
    icon: "\uD83D\uDCB0",
    color: "#27AE60"
  }, totalTallasAuto > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fff4",
      border: "1.5px solid #a8d8a8",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 12,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#888",
      fontWeight: 700,
      textTransform: "uppercase"
    }
  }, "Calculado autom\xE1ticamente"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 900,
      color: "#155724"
    }
  }, "$", totalTallasAuto.toFixed(2)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#27AE60"
    }
  }, totalPzasAuto, " pieza", totalPzasAuto !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#27AE60",
      fontWeight: 700,
      textAlign: "right"
    }
  }, "\u2705 Total", /*#__PURE__*/React.createElement("br", null), "actualizado")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Precio total ($)"), /*#__PURE__*/React.createElement("input", {
    style: INP,
    type: "number",
    placeholder: "0.00",
    value: f.precio,
    onChange: e => s("precio", e.target.value)
  })), /*#__PURE__*/React.createElement(RegistroAbonos, {
    abonos: f.abonos || [],
    precioTotal: f.precio,
    onChange: v => {
      s("abonos", v);
      s("anticipo", v.reduce((sum, a) => sum + parseFloat(a.monto || 0), 0).toFixed(2));
    },
    esAdmin: true
  }), parseFloat(f.precio || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: saldo > 0 ? "#FFF3CD" : "#D4EDDA",
      border: "1.5px solid " + (saldo > 0 ? "#FFD54F" : "#a8d8a8"),
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#888",
      fontWeight: 700,
      textTransform: "uppercase"
    }
  }, "Saldo pendiente"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 900,
      color: saldo > 0 ? "#856404" : "#155724"
    }
  }, fmt$(saldo))), anticopoEfectivo > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#888",
      fontWeight: 700,
      textTransform: "uppercase"
    }
  }, "Total abonado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "#27AE60"
    }
  }, fmt$(anticopoEfectivo)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Fecha inicio"), /*#__PURE__*/React.createElement("input", {
    style: INP,
    type: "date",
    value: f.fechaInicio,
    onChange: e => s("fechaInicio", e.target.value)
  }))), esAdmin && /*#__PURE__*/React.createElement(SeccionOpcional, {
    titulo: "Facturaci\xF3n / Cr\xE9dito fiscal",
    icon: "\uD83E\uDDFE",
    color: "#E67E22"
  }, /*#__PURE__*/React.createElement("select", {
    style: {
      ...INP,
      marginBottom: 10
    },
    value: f.tipoDocumento,
    onChange: e => s("tipoDocumento", e.target.value)
  }, TIPO_DOC.map(t => /*#__PURE__*/React.createElement("option", {
    key: t
  }, t))), f.tipoDocumento !== "Consumidor Final" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Raz\xF3n Social"), /*#__PURE__*/React.createElement("input", {
    style: INP,
    value: f.razonSocial,
    onChange: e => s("razonSocial", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "NIT"), /*#__PURE__*/React.createElement("input", {
    style: INP,
    value: f.nit,
    onChange: e => s("nit", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "NRC"), /*#__PURE__*/React.createElement("input", {
    style: INP,
    value: f.nrc,
    onChange: e => s("nrc", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Direcci\xF3n fiscal"), /*#__PURE__*/React.createElement("input", {
    style: INP,
    value: f.dirFiscal,
    onChange: e => s("dirFiscal", e.target.value)
  })))), /*#__PURE__*/React.createElement(SeccionOpcional, {
    titulo: "Observaciones y vendedor",
    icon: "\uD83D\uDCCC",
    color: "#888"
  }, /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...INP,
      resize: "vertical",
      minHeight: 50,
      marginBottom: 8
    },
    value: f.notas,
    placeholder: "Observaciones...",
    onChange: e => s("notas", e.target.value)
  }), /*#__PURE__*/React.createElement("input", {
    style: INP,
    value: f.vendedor,
    placeholder: "Vendedor",
    onChange: e => s("vendedor", e.target.value)
  })), /*#__PURE__*/React.createElement(SeccionOpcional, {
    titulo: "Fotos de referencia",
    icon: "\uD83D\uDCF8",
    color: "#E91E8C"
  }, /*#__PURE__*/React.createElement(UploaderImagenes, {
    imagenes: f.imagenes,
    onChange: imgs => s("imagenes", imgs)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Estatus del pedido"), /*#__PURE__*/React.createElement("select", {
    style: INP,
    value: f.estatus,
    onChange: e => s("estatus", e.target.value)
  }, ESTATUS.map(e => /*#__PURE__*/React.createElement("option", {
    key: e
  }, e)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      limpiarBorrador();
      onCancel();
    },
    style: BTN("#aaa")
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (!validez.cliente) {
        pushToast("Falta el nombre del cliente", "error");
        return;
      }
      if (!validez.tipoPrenda) {
        pushToast("Seleccion\u00E1 el tipo de prenda", "error");
        return;
      }
      if (!validez.cantidad) {
        pushToast("Agreg\u00E1 al menos una talla con cantidad o una persona", "error");
        return;
      }
      if (!validez.fechaEntrega) {
        pushToast("Falta la fecha de entrega", "error");
        return;
      }
      limpiarBorrador();
      onSave(f);
    },
    style: BTN("#9B59B6")
  }, "\uD83D\uDCBE Guardar pedido")));
}
function RegistroAbonos({
  abonos,
  precioTotal,
  onChange,
  esAdmin
}) {
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [metodo, setMet] = useState("Efectivo");
  const METODOS = ["Efectivo", "Transferencia", "Depósito", "Cheque", "Otro"];
  const totalAbonado = (abonos || []).reduce((s, a) => s + parseFloat(a.monto || 0), 0);
  const saldo = parseFloat(precioTotal || 0) - totalAbonado;
  const pct = precioTotal > 0 ? Math.min(totalAbonado / parseFloat(precioTotal) * 100, 100) : 0;
  function agregar() {
    const m = parseFloat(monto);
    if (!m || m <= 0) return;
    const nuevo = {
      id: Date.now(),
      monto: m,
      nota: nota.trim(),
      metodo,
      fecha: new Date().toISOString().split("T")[0]
    };
    onChange([...(abonos || []), nuevo]);
    setMonto("");
    setNota("");
  }
  function quitar(id) {
    onChange((abonos || []).filter(a => a.id !== id));
  }
  if (!esAdmin) return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid #a8d8a8",
      borderRadius: 10,
      overflow: "hidden",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fff4",
      padding: "8px 14px",
      fontSize: 11,
      fontWeight: 700,
      color: "#155724"
    }
  }, "\uD83D\uDCB5 Registrar pago recibido"), (abonos || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "1px solid #d4edda"
    }
  }, (abonos || []).map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: a.id || i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 14px",
      background: i % 2 === 0 ? "#fff" : "#f8fff9",
      borderBottom: "1px solid #f0f0f0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: "#155724",
      minWidth: 52
    }
  }, "$", parseFloat(a.monto || 0).toFixed(2)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      background: "#d4edda",
      color: "#155724",
      padding: "2px 7px",
      borderRadius: 10,
      fontWeight: 700,
      flexShrink: 0
    }
  }, a.metodo), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#666",
      flex: 1
    }
  }, a.nota || ""), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#aaa",
      flexShrink: 0
    }
  }, a.fecha)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: "#fafafa"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 100px",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#888",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "Nota del pago"), /*#__PURE__*/React.createElement("input", {
    value: nota,
    onChange: e => setNota(e.target.value),
    placeholder: "Ej: cliente pag\xF3 en efectivo",
    style: {
      width: "100%",
      padding: "7px 10px",
      borderRadius: 6,
      border: "1.5px solid #e0e0e0",
      fontSize: 13,
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#888",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "M\xE9todo"), /*#__PURE__*/React.createElement("select", {
    value: metodo,
    onChange: e => setMet(e.target.value),
    style: {
      width: "100%",
      padding: "7px 6px",
      borderRadius: 6,
      border: "1.5px solid #e0e0e0",
      fontSize: 12,
      outline: "none",
      background: "#fff"
    }
  }, METODOS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m
  }, m))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#27AE60",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "Monto recibido ($)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    step: "0.01",
    value: monto,
    onChange: e => setMonto(e.target.value),
    onKeyDown: e => e.key === "Enter" && agregar(),
    placeholder: "0.00",
    style: {
      width: "100%",
      padding: "7px 8px",
      borderRadius: 6,
      border: "1.5px solid #a8d8a8",
      fontSize: 14,
      fontWeight: 800,
      outline: "none",
      color: "#155724",
      textAlign: "center"
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: agregar,
    disabled: !monto || parseFloat(monto) <= 0,
    style: {
      alignSelf: "flex-end",
      padding: "8px 14px",
      borderRadius: 7,
      border: "none",
      background: !monto || parseFloat(monto) <= 0 ? "#e0e0e0" : "#27AE60",
      color: "#fff",
      fontWeight: 800,
      fontSize: 13,
      cursor: !monto || parseFloat(monto) <= 0 ? "not-allowed" : "pointer",
      whiteSpace: "nowrap"
    }
  }, "\u2705 Registrar"))));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid #a8d8a8",
      borderRadius: 10,
      overflow: "hidden",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fff4",
      padding: "10px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: "#155724",
      textTransform: "uppercase",
      letterSpacing: .5
    }
  }, "\uD83D\uDCB5 Registro de abonos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#27AE60",
      fontWeight: 700
    }
  }, "Cobrado: $", totalAbonado.toFixed(2)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: saldo > 0 ? "#E63946" : "#27AE60",
      fontWeight: 800
    }
  }, saldo > 0 ? `Saldo: $${saldo.toFixed(2)}` : "✅ Pagado"))), parseFloat(precioTotal || 0) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#d4edda",
      borderRadius: 6,
      height: 8,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      background: "linear-gradient(90deg,#27AE60,#1abc9c)",
      height: "100%",
      borderRadius: 6,
      transition: "width .4s"
    }
  }))), (abonos || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "1px solid #d4edda"
    }
  }, (abonos || []).map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: a.id || i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 14px",
      background: i % 2 === 0 ? "#fff" : "#f8fff9",
      borderBottom: "1px solid #f0f0f0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: "#155724"
    }
  }, "$", parseFloat(a.monto).toFixed(2)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      background: "#d4edda",
      color: "#155724",
      padding: "2px 7px",
      borderRadius: 10,
      fontWeight: 700
    }
  }, a.metodo), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#aaa"
    }
  }, a.fecha)), a.nota && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#666",
      marginTop: 1
    }
  }, a.nota)), /*#__PURE__*/React.createElement("button", {
    onClick: () => quitar(a.id || i),
    style: {
      background: "none",
      border: "1px solid #fdd",
      borderRadius: 6,
      padding: "3px 8px",
      cursor: "pointer",
      fontSize: 12,
      color: "#DC3545"
    }
  }, "\u2715")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: "#fafafa"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "90px 1fr 100px",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#27AE60",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "Monto ($)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    step: "0.01",
    value: monto,
    onChange: e => setMonto(e.target.value),
    onKeyDown: e => e.key === "Enter" && agregar(),
    placeholder: "0.00",
    style: {
      width: "100%",
      padding: "7px 8px",
      borderRadius: 6,
      border: "1.5px solid #a8d8a8",
      fontSize: 14,
      fontWeight: 800,
      outline: "none",
      color: "#155724",
      textAlign: "center"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#888",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "Nota (opcional)"), /*#__PURE__*/React.createElement("input", {
    value: nota,
    onChange: e => setNota(e.target.value),
    onKeyDown: e => e.key === "Enter" && agregar(),
    placeholder: "Ej: transferencia Bancoagr\xEDcola",
    style: {
      width: "100%",
      padding: "7px 10px",
      borderRadius: 6,
      border: "1.5px solid #e0e0e0",
      fontSize: 13,
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#888",
      marginBottom: 3,
      textTransform: "uppercase"
    }
  }, "M\xE9todo"), /*#__PURE__*/React.createElement("select", {
    value: metodo,
    onChange: e => setMet(e.target.value),
    style: {
      width: "100%",
      padding: "7px 6px",
      borderRadius: 6,
      border: "1.5px solid #e0e0e0",
      fontSize: 12,
      outline: "none",
      background: "#fff"
    }
  }, METODOS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m
  }, m))))), /*#__PURE__*/React.createElement("button", {
    onClick: agregar,
    disabled: !monto || parseFloat(monto) <= 0,
    style: {
      width: "100%",
      padding: "8px",
      borderRadius: 7,
      border: "none",
      background: !monto || parseFloat(monto) <= 0 ? "#e0e0e0" : "#27AE60",
      color: "#fff",
      fontWeight: 800,
      fontSize: 13,
      cursor: !monto || parseFloat(monto) <= 0 ? "not-allowed" : "pointer"
    }
  }, "+ Registrar abono", monto && parseFloat(monto) > 0 ? ` de $${parseFloat(monto).toFixed(2)}` : "")));
}
function Modal({
  title,
  onClose,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 100
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: "16px 16px 0 0",
      padding: 16,
      paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
      width: "100%",
      maxWidth: 640,
      maxHeight: "92vh",
      overflowY: "auto",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 15,
      color: "#2C1654",
      fontFamily: "Georgia,serif",
      flex: 1,
      paddingRight: 10
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      fontSize: 26,
      cursor: "pointer",
      color: "#bbb",
      padding: "0 4px",
      flexShrink: 0
    }
  }, "\u2715")), children));
}
function TallasChips({
  items,
  compact = false
}) {
  if (!items || !items.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: compact ? 4 : 6
    }
  }, items.map(it => {
    const tieneP = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0;
    const sub = tieneP ? parseFloat(it.precio) * it.qty : null;
    return /*#__PURE__*/React.createElement("div", {
      key: it.id,
      style: {
        display: "inline-flex",
        alignItems: "stretch",
        border: "1.5px solid #fde0b8",
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
        fontSize: compact ? 10 : 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#E67E22",
        color: "#fff",
        padding: compact ? "3px 7px" : "4px 9px",
        fontWeight: 900,
        fontSize: compact ? 12 : 13,
        display: "flex",
        alignItems: "center"
      }
    }, it.talla), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: compact ? "3px 7px" : "4px 8px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        color: "#2C1654",
        fontSize: compact ? 10 : 11,
        lineHeight: 1
      }
    }, it.qty, " ", it.qty === 1 ? "pda" : "pdas", tieneP && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#27AE60",
        fontWeight: 700,
        marginLeft: 4
      }
    }, "$", parseFloat(it.precio).toFixed(2), " c/u")), sub != null && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#27AE60",
        fontWeight: 800
      }
    }, "= $", sub.toFixed(2)), it.spec && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#888",
        lineHeight: 1.2
      }
    }, it.spec)));
  }));
}
function mensajeWA(p, esAdmin = false) {
  const num = String(p.id).padStart(4, "0");
  const dias = p.fechaEntrega ? Math.ceil((new Date(p.fechaEntrega + "T12:00:00") - new Date()) / 86400000) : null;
  const diasStr = dias === null ? "" : dias < 0 ? ` ⚠️ venció hace ${Math.abs(dias)}d` : dias === 0 ? " ⚠️ ¡HOY!" : dias === 1 ? " (mañana)" : ` (${dias} días)`;
  const tallas = resumenTallas(p);
  const tallasDetalle = p.tallasItems && p.tallasItems.length ? p.tallasItems.map(it => {
    const pr = it.precio != null && it.precio !== "" && parseFloat(it.precio) > 0 ? ` · $${parseFloat(it.precio).toFixed(2)} c/u` : "";
    return `  • ${it.talla}: ${it.qty} ${it.qty === 1 ? "prenda" : "prendas"}${pr}${it.spec ? " (" + it.spec + ")" : ""}`;
  }).join("\n") : tallas ? `  • ${tallas}` : "";
  const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
  const tipoIcon = p.tipoCliente === "escuela" ? "🏫" : p.tipoCliente === "empresa" ? "🏢" : "👤";
  let msg = `🧵 *TALLER IMIS — Pedido N°${num}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `${tipoIcon} *${p.cliente}*`;
  if (p.nombreContacto) msg += `\n   Contacto: ${p.nombreContacto}`;
  if (p.telefono) msg += `\n   📱 ${p.telefono}`;
  msg += `\n\n`;
  msg += `✂️ *${p.tipoPrenda || "(sin especificar)"}*`;
  if (p.tela) msg += `\n   Tela: ${p.tela}${p.color ? " · " + p.color : ""}`;
  msg += `\n`;
  if (tallasDetalle) {
    msg += `\n📦 *Tallas y cantidades:*\n${tallasDetalle}\n`;
  }
  if (p.descripcion) msg += `\n📝 ${p.descripcion}\n`;
  if (p.tieneBordado) msg += `\n🪡 Lleva bordado${p.estatusDiseno ? " — " + p.estatusDiseno : ""}`;
  msg += `\n\n📅 *Entrega: ${p.fechaEntrega || "—"}*${diasStr}`;
  if (p.estatus) msg += `\n   Estado: ${p.estatus}`;
  if (esAdmin) {
    const totalPzas = (p.tallasItems || []).reduce((s, it) => s + it.qty, 0);
    if (totalPzas > 0) msg += `\n\n📦 *Total piezas: ${totalPzas}*`;
    if (p.precio) {
      msg += `\n💰 *Total: $${parseFloat(p.precio).toFixed(2)}*`;
      if (parseFloat(p.anticipo || 0) > 0) msg += `\n✅ Adelanto recibido: $${parseFloat(p.anticipo).toFixed(2)}`;
      if (saldo > 0) msg += `\n⏳ *Saldo pendiente: $${saldo.toFixed(2)}*`;else if (parseFloat(p.precio || 0) > 0) msg += `\n✅ *Pagado completamente*`;
    }
  }
  if (p.notas) msg += `\n\n💬 ${p.notas}`;
  msg += `\n━━━━━━━━━━━━━━━━━━`;
  return msg;
}
function copiarWA(p, esAdmin = false) {
  const msg = mensajeWA(p, esAdmin);
  navigator.clipboard.writeText(msg).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = msg;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}
function WABtn({
  p,
  esAdmin
}) {
  const [ok, setOk] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      copiarWA(p, esAdmin);
      setOk(true);
      setTimeout(() => setOk(false), 2200);
    },
    title: "Copiar info para WhatsApp",
    style: {
      padding: "4px 8px",
      borderRadius: 6,
      border: "1.5px solid " + (ok ? "#25D366" : "#e0e0e0"),
      background: ok ? "#e8fdf0" : "#fff",
      cursor: "pointer",
      fontSize: 11,
      color: ok ? "#25D366" : "#555",
      fontWeight: ok ? 700 : 400,
      transition: "all .2s",
      whiteSpace: "nowrap"
    }
  }, ok ? "✅" : "📋");
}
function CardPedido({
  p,
  esAdmin,
  onVer,
  onEditar,
  onCambiarEstatus,
  onEliminar,
  onDuplicar,
  onImprimir,
  onVerFoto
}) {
  const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
  const dias = p.fechaEntrega ? Math.ceil((new Date(p.fechaEntrega + "T12:00:00") - new Date()) / 86400000) : null;
  const urgent = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(p.estatus);
  const [copiado, setCopiado] = useState(false);
  const handleWA = () => {
    copiarWA(p, esAdmin);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  };
  const tallasR = resumenTallas(p);
  const nFotos = (p.imagenes || []).filter(i => imgSrc(i)).length;
  return /*#__PURE__*/React.createElement("div", {
    onClick: () => onVer(p),
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      border: urgent ? "1.5px solid #FD7E14" : "1.5px solid transparent",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa",
      fontWeight: 700
    }
  }, "N\xB0", String(p.id).padStart(4, "0"), " ", p.tipoCliente === "escuela" ? "🏫" : p.tipoCliente === "empresa" ? "🏢" : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "#2C1654"
    }
  }, p.cliente), p.nombreContacto && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#555"
    }
  }, "\uD83D\uDC64 ", p.nombreContacto), p.costurera && p.costurera !== "(Sin asignar)" && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#9B59B6"
    }
  }, "\u2702\uFE0F ", p.costurera)), /*#__PURE__*/React.createElement("select", {
    value: p.estatus,
    onChange: e => onCambiarEstatus(p.id, e.target.value),
    onClick: e => e.stopPropagation(),
    style: {
      border: "none",
      background: (EC[p.estatus] || {}).bg,
      color: (EC[p.estatus] || {}).fg,
      padding: "5px 8px",
      borderRadius: 20,
      fontWeight: 700,
      fontSize: 11,
      cursor: "pointer",
      maxWidth: 130
    }
  }, ESTATUS.map(e => /*#__PURE__*/React.createElement("option", {
    key: e
  }, e)))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#444",
      marginBottom: 4
    }
  }, p.tipoPrenda), p.tallasItems && p.tallasItems.length > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(TallasChips, {
    items: p.tallasItems,
    compact: true
  })) : tallasR ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#E67E22",
      fontWeight: 700,
      marginBottom: 4
    }
  }, tallasR) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 4
    }
  }, p.tieneBordado && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      background: "#FCE4EC",
      color: "#880E4F",
      padding: "2px 8px",
      borderRadius: 20,
      fontWeight: 700
    }
  }, "\uD83E\uDEA1 Bordado"), nFotos > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      flexWrap: "wrap",
      marginTop: 2
    }
  }, (p.imagenes || []).filter(i => imgSrc(i)).slice(0, 3).map((img, i) => /*#__PURE__*/React.createElement("img", {
    key: i,
    src: imgSrc(img),
    onClick: e => {
      e.stopPropagation();
      onVerFoto && onVerFoto({
        imgs: (p.imagenes || []).filter(x => imgSrc(x)).map(imgSrc),
        idx: i
      });
    },
    style: {
      width: 40,
      height: 40,
      borderRadius: 6,
      objectFit: "cover",
      border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e0e0e0"),
      cursor: "zoom-in",
      flexShrink: 0
    }
  })), nFotos > 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 6,
      background: "#f0f0f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      color: "#888",
      fontWeight: 700,
      border: "1.5px solid #e0e0e0"
    }
  }, "+", nFotos - 3))), p.fechaEntrega && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: urgent ? "#E63946" : "#555",
      fontWeight: urgent ? 700 : 400
    }
  }, urgent ? "⚠️ " : "📅 ", p.fechaEntrega), dias !== null && !["Entregado", "Cancelado"].includes(p.estatus) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      background: dias < 0 ? "#F8D7DA" : dias <= 2 ? "#FFF3CD" : "#e8f5e9",
      color: dias < 0 ? "#721C24" : dias <= 2 ? "#856404" : "#155724",
      padding: "2px 8px",
      borderRadius: 20,
      fontWeight: 700
    }
  }, dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d")), esAdmin && p.precio && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      display: "flex",
      gap: 10,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: "#2C1654"
    }
  }, fmt$(p.precio)), saldo > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#E63946",
      fontWeight: 700
    }
  }, "Resta ", fmt$(saldo)) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#28A745",
      fontWeight: 700
    }
  }, "\u2705 Pagado"), (p.abonos || []).length > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#888"
    }
  }, (p.abonos || []).length, " abono", (p.abonos || []).length !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    className: "card-actions",
    style: {
      display: "flex",
      gap: 6,
      marginTop: 12,
      justifyContent: "space-between",
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleWA,
    style: {
      padding: "9px 14px",
      borderRadius: 8,
      border: "1.5px solid " + (copiado ? "#25D366" : "#e0e0e0"),
      background: copiado ? "#e8fdf0" : "#fff",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      color: copiado ? "#25D366" : "#555",
      display: "flex",
      alignItems: "center",
      gap: 5,
      transition: "all .2s",
      flex: 1,
      justifyContent: "center"
    }
  }, copiado ? "✅ Copiado" : "📋 WhatsApp"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onImprimir(p),
    style: {
      padding: "9px 12px",
      borderRadius: 8,
      border: "1.5px solid #9B59B6",
      background: "#fff",
      cursor: "pointer",
      fontSize: 13,
      color: "#9B59B6",
      fontWeight: 700
    }
  }, "\uD83D\uDDA8\uFE0F"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onEditar(p),
    style: {
      padding: "9px 14px",
      borderRadius: 8,
      border: "none",
      background: "#9B59B6",
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700
    }
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("button", {
    title: "Duplicar pedido",
    onClick: () => onDuplicar(p),
    style: {
      padding: "9px 12px",
      borderRadius: 8,
      border: "1.5px solid #C8E6C9",
      background: "#F1FFF4",
      cursor: "pointer",
      fontSize: 13,
      color: "#27AE60"
    }
  }, "\uD83D\uDCC4"), esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => onEliminar(p.id),
    style: {
      padding: "9px 12px",
      borderRadius: 8,
      border: "1.5px solid #fdd",
      background: "#fff8f8",
      cursor: "pointer",
      fontSize: 13,
      color: "#DC3545"
    }
  }, "\uD83D\uDDD1\uFE0F")));
}
function ProximasEntregas({
  pedidos,
  diasPara,
  esAdmin,
  onVer,
  onEditar,
  onWA
}) {
  const [copiadoId, setCopiadoId] = useState(null);
  const handleWA = p => {
    onWA(p);
    setCopiadoId(p.id);
    setTimeout(() => setCopiadoId(null), 2200);
  };
  const proximos = pedidos.filter(p => p.fechaEntrega && !["Entregado", "Cancelado"].includes(p.estatus)).map(p => ({
    ...p,
    dias: diasPara(p.fechaEntrega)
  })).sort((a, b) => a.dias - b.dias).slice(0, 6);
  if (!proximos.length) return null;
  const colorDias = d => d < 0 ? {
    bg: "#F8D7DA",
    fg: "#721C24",
    label: `Venció ${Math.abs(d)}d`
  } : d === 0 ? {
    bg: "#F8D7DA",
    fg: "#721C24",
    label: "¡Hoy!"
  } : d === 1 ? {
    bg: "#FFF3CD",
    fg: "#856404",
    label: "Mañana"
  } : d <= 3 ? {
    bg: "#FFF3CD",
    fg: "#856404",
    label: `${d} días`
  } : d <= 7 ? {
    bg: "#D4EDDA",
    fg: "#155724",
    label: `${d} días`
  } : {
    bg: "#E8F4FD",
    fg: "#0c5460",
    label: `${d} días`
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14,
      background: "#fff",
      borderRadius: 12,
      border: "1.5px solid #ede7f6",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#2C1654",
      padding: "9px 14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#fff",
      fontWeight: 800,
      fontSize: 13
    }
  }, "\uD83D\uDCC5 Pr\xF3ximas entregas"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#9B59B6",
      fontSize: 11,
      fontWeight: 700
    }
  }, proximos.length, " pedido", proximos.length !== 1 ? "s" : "", " pendiente", proximos.length !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      padding: "10px 12px",
      overflowX: "auto",
      scrollbarWidth: "thin"
    }
  }, proximos.map(p => {
    const dc = colorDias(p.dias);
    const tallas = resumenTallas(p);
    const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
    const tipoIcon = p.tipoCliente === "escuela" ? "🏫" : p.tipoCliente === "empresa" ? "🏢" : "";
    const copiado = copiadoId === p.id;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      onClick: () => onVer(p),
      style: {
        minWidth: 170,
        maxWidth: 190,
        flexShrink: 0,
        border: "1.5px solid #f0e8ff",
        borderRadius: 10,
        background: "#fdfaff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: dc.bg,
        padding: "4px 10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: dc.fg
      }
    }, dc.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        color: dc.fg,
        opacity: .7
      }
    }, p.fechaEntrega)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 10px",
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        color: "#2C1654",
        marginBottom: 2,
        lineHeight: 1.3
      }
    }, tipoIcon, " ", p.cliente), p.nombreContacto && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#888",
        marginBottom: 3
      }
    }, "\uD83D\uDC64 ", p.nombreContacto), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#555",
        marginBottom: 4
      }
    }, p.tipoPrenda), p.tallasItems && p.tallasItems.length > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
        marginBottom: 4
      }
    }, p.tallasItems.map(it => /*#__PURE__*/React.createElement("span", {
      key: it.id,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: 9,
        fontWeight: 700
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#E67E22",
        color: "#fff",
        borderRadius: 4,
        padding: "1px 5px"
      }
    }, it.talla), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#2C1654"
      }
    }, it.qty, "pda", it.qty !== 1 ? "s" : "")))) : tallas && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#E67E22",
        fontWeight: 700,
        marginBottom: 4
      }
    }, tallas), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        background: (EC[p.estatus] || {}).bg || "#eee",
        color: (EC[p.estatus] || {}).fg || "#333",
        padding: "2px 7px",
        borderRadius: 20,
        fontWeight: 700
      }
    }, p.estatus), esAdmin && saldo > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#E63946",
        fontWeight: 700,
        marginTop: 4
      }
    }, "Saldo: $", saldo.toFixed(2))), /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        display: "flex",
        borderTop: "1px solid #f0e8ff"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => handleWA(p),
      style: {
        flex: 1,
        padding: "6px 0",
        border: "none",
        background: copiado ? "#e8fdf0" : "transparent",
        color: copiado ? "#25D366" : "#888",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        borderRight: "1px solid #f0e8ff",
        transition: "all .2s"
      }
    }, copiado ? "✅" : "📋 WA"), /*#__PURE__*/React.createElement("button", {
      onClick: () => onEditar(p),
      style: {
        flex: 1,
        padding: "6px 0",
        border: "none",
        background: "transparent",
        color: "#9B59B6",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer"
      }
    }, "\u270F\uFE0F")));
  })));
}
function ModalAsistenteIA({
  rol,
  onCrearPedido,
  onAbrir,
  onCerrar
}) {
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
    year: "numeric"
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
{"cliente":"...","telefono":"...","tipoPrenda":"...","tela":"...","color":"...","tallasLibre":"...","modoTallas":"libre","modoPrenda":"medida","descripcion":"...","tieneBordado":false,"fechaEntrega":"...","costurera":"...","precio":"...","anticipo":"...","estatus":"Tomado","notas":""}
</PEDIDO_JSON>`;
  const [apiKey, setApiKey] = useState(() => ANTHROPIC_KEY || localStorage.getItem("taller_ia_key") || "");
  const [showKey, setShowKey] = useState(false);
  useEffect(() => {
    if (apiKey) enviarMensaje(null, true);
  }, [apiKey]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensajes]);
  async function enviarMensaje(textoUsuario, esInicio = false) {
    const nuevosMensajes = esInicio ? [] : [...mensajes, {
      rol: "user",
      txt: textoUsuario
    }];
    if (!esInicio) setMensajes(nuevosMensajes);
    setCarg(true);
    const historial = nuevosMensajes.map(m => ({
      role: m.rol === "user" ? "user" : "assistant",
      content: m.txt
    }));
    if (esInicio) {
      historial.push({
        role: "user",
        content: "Hola, quiero registrar un nuevo pedido."
      });
    }
    try {
      const ENDPOINTS = ["https://corsproxy.io/?https://api.anthropic.com/v1/messages", "https://api.anthropic.com/v1/messages"];
      let resp = null;
      let lastErr = "";
      for (const url of ENDPOINTS) {
        try {
          resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerous-direct-browser-access": "true"
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 1000,
              system: SYSTEM,
              messages: historial
            })
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
      if (!resp) {
        setMensajes(prev => [...prev, {
          rol: "assistant",
          txt: "⚠️ Error: " + lastErr + ". Verifica tu API key o conexión."
        }]);
        setCarg(false);
        return;
      }
      const data = await resp.json();
      if (data.error) {
        setMensajes(prev => [...prev, {
          rol: "assistant",
          txt: "⚠️ Error API: " + data.error.message
        }]);
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
          setMensajes(prev => [...prev, {
            rol: "assistant",
            txt: "✅ ¡Perfecto! Ya tengo toda la información. Revisa el resumen y confirma."
          }]);
        } catch {
          setMensajes(prev => [...prev, {
            rol: "assistant",
            txt
          }]);
        }
      } else {
        setMensajes(prev => [...(esInicio ? [] : [...mensajes, {
          rol: "user",
          txt: textoUsuario
        }]), {
          rol: "assistant",
          txt
        }]);
      }
    } catch (e) {
      setMensajes(prev => [...prev, {
        rol: "assistant",
        txt: "⚠️ Error: " + e.message
      }]);
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
    const base = {
      ...PEDIDO_BASE,
      ...pedidoFinal
    };
    onCrearPedido(base);
  }
  function editarFormulario() {
    const base = {
      ...PEDIDO_BASE,
      ...pedidoFinal
    };
    onAbrir(base);
  }
  const colorBurbuja = {
    user: {
      bg: "#9B59B6",
      color: "#fff",
      align: "flex-end"
    },
    assistant: {
      bg: "#f0f0f0",
      color: "#333",
      align: "flex-start"
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 200,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: "18px 18px 0 0",
      width: "100%",
      maxWidth: 520,
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg,#1A5276,#2C1654)",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 18,
      flexShrink: 0
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#fff",
      fontWeight: 800,
      fontSize: 14
    }
  }, "Asistente IA"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 11
    }
  }, "Nuevo pedido por voz o texto")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onAbrir(null),
    title: "Formulario manual",
    style: {
      background: "rgba(255,255,255,0.1)",
      border: "1px solid rgba(255,255,255,0.2)",
      color: "#fff",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700,
      marginRight: 4
    }
  }, "\uD83D\uDCCB Formulario"), /*#__PURE__*/React.createElement("button", {
    onClick: onCerrar,
    style: {
      background: "rgba(255,255,255,0.1)",
      border: "none",
      color: "#fff",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 16
    }
  }, "\u2715")), !apiKey && !ANTHROPIC_KEY && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 28,
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48
    }
  }, "\uD83D\uDD11"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      color: "#2C1654",
      fontSize: 16,
      textAlign: "center"
    }
  }, "Configura tu clave de API"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#888",
      textAlign: "center",
      lineHeight: 1.6
    }
  }, "Para usar el asistente IA necesitas una clave de API de Anthropic. La puedes obtener en ", /*#__PURE__*/React.createElement("strong", null, "console.anthropic.com")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#888",
      display: "block",
      marginBottom: 4,
      textTransform: "uppercase"
    }
  }, "API Key"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: showKey ? "text" : "password",
    value: apiKey,
    onChange: e => setApiKey(e.target.value),
    placeholder: "sk-ant-...",
    style: {
      flex: 1,
      padding: "10px 14px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      fontSize: 13,
      outline: "none",
      fontFamily: "monospace"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowKey(v => !v),
    style: {
      padding: "10px 12px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      cursor: "pointer",
      fontSize: 16
    }
  }, showKey ? "🙈" : "👁️"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (apiKey.startsWith("sk-")) {
        localStorage.setItem("taller_ia_key", apiKey);
        pushToast("Clave guardada", "success");
      } else {
        pushToast("La clave debe empezar con sk-ant-", "error");
      }
    },
    style: {
      ...BTN("#9B59B6"),
      width: "100%",
      padding: "12px",
      fontSize: 14
    }
  }, "\u2705 Guardar y continuar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      localStorage.removeItem("taller_ia_key");
      setApiKey("");
    },
    style: {
      fontSize: 11,
      color: "#ccc",
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, "Borrar clave guardada")), apiKey && fase === "chat" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    ref: scrollRef,
    style: {
      flex: 1,
      overflowY: "auto",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, mensajes.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: colorBurbuja[m.rol].align
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "80%",
      background: colorBurbuja[m.rol].bg,
      color: colorBurbuja[m.rol].color,
      borderRadius: m.rol === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      padding: "10px 14px",
      fontSize: 14,
      lineHeight: 1.5,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
    }
  }, m.txt))), cargando && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f0f0",
      borderRadius: "16px 16px 16px 4px",
      padding: "10px 16px",
      display: "flex",
      gap: 5,
      alignItems: "center"
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#9B59B6",
      animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      borderTop: "1px solid #eee",
      display: "flex",
      gap: 8,
      alignItems: "center",
      background: "#fafafa"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: toggleVoz,
    style: {
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
      transition: "all .2s"
    }
  }, escuchando ? "⏹️" : "🎤"), /*#__PURE__*/React.createElement("input", {
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => e.key === "Enter" && enviar(),
    placeholder: escuchando ? "Escuchando..." : "Escribe o usa el micrófono...",
    style: {
      flex: 1,
      padding: "10px 14px",
      borderRadius: 22,
      border: "1.5px solid #e0e0e0",
      outline: "none",
      fontSize: 14,
      background: escuchando ? "#FFF5F5" : "#fff"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: enviar,
    disabled: !input.trim() || cargando,
    style: {
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
      flexShrink: 0
    }
  }, "\u27A4"))), apiKey && fase === "confirmar" && pedidoFinal && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 6
    }
  }, "\u2705"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      color: "#2C1654",
      fontSize: 16
    }
  }, "Resumen del pedido"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#aaa"
    }
  }, "Confirma que todo est\xE1 correcto")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8f4ff",
      borderRadius: 12,
      padding: 14,
      marginBottom: 14
    }
  }, [["👤 Cliente", pedidoFinal.cliente], ["📱 Teléfono", pedidoFinal.telefono], ["✂️ Prenda", pedidoFinal.tipoPrenda], ["🧵 Tela/Color", [pedidoFinal.tela, pedidoFinal.color].filter(Boolean).join(" · ")], ["📦 Tallas", pedidoFinal.tallasLibre], ["📝 Descripción", pedidoFinal.descripcion], ["🪡 Bordado", pedidoFinal.tieneBordado ? "Sí" : "No"], ["📅 Entrega", pedidoFinal.fechaEntrega], ["✂️ Costurera", pedidoFinal.costurera], esAdmin ? ["💰 Precio", pedidoFinal.precio ? `$${pedidoFinal.precio}` : "—"] : null, esAdmin ? ["💵 Adelanto recibido", pedidoFinal.anticipo ? `$${pedidoFinal.anticipo}` : "—"] : null].filter(Boolean).map(([k, v]) => v ? /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "7px 0",
      borderBottom: "1px solid #ede5ff",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#888",
      fontWeight: 600
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#2C1654",
      fontWeight: 700,
      textAlign: "right"
    }
  }, v)) : null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: confirmarPedido,
    style: {
      ...BTN("#28A745"),
      width: "100%",
      padding: "13px",
      fontSize: 15
    }
  }, "\u2705 Guardar pedido"), /*#__PURE__*/React.createElement("button", {
    onClick: editarFormulario,
    style: {
      ...BTN("#9B59B6"),
      width: "100%",
      padding: "13px",
      fontSize: 15
    }
  }, "\u270F\uFE0F Revisar en formulario"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setFase("chat");
      setPF(null);
    },
    style: {
      ...BTN("#aaa"),
      width: "100%",
      padding: "10px",
      fontSize: 13
    }
  }, "\u21A9\uFE0F Volver a corregir")))));
}
function SeccionBordados({
  bordados,
  setBordados,
  nextBordId,
  setNextBordId,
  pedidosConf,
  esAdmin,
  clientes = [],
  upsertClienteLocal
}) {
  const [busq, setBusq] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [modal, setModal] = useState(null); // null | "nuevo" | pedido
  const [detalle, setDetalle] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const hoyB = () => new Date().toISOString().split("T")[0];
  const diasB = f => f ? Math.ceil((new Date(f + "T12:00:00") - new Date()) / 86400000) : null;
  const fmt$B = n => "$" + parseFloat(n || 0).toFixed(2);
  const BORD_INIT = {
    cliente: "",
    telefono: "",
    confRef: "",
    tipoDocumento: "Consumidor Final",
    razonSocial: "",
    nit: "",
    nrc: "",
    dirFiscal: "",
    soporte: "",
    cantidad: "1",
    posicion: "Pecho izquierdo",
    posLibre: "",
    diseño: "",
    estadoDiseño: "Pendiente diseñar",
    hilos: "",
    puntadas: "",
    esNuevo: "nuevo",
    linkDrive: "",
    precioU: "",
    precioT: "",
    anticipo: "",
    abonos: [],
    fechaEntrega: "",
    estatus: "Tomado",
    notas: "",
    fecha: ""
  };
  const lista = bordados.filter(b => {
    const q = busq.toLowerCase();
    const m = b.cliente.toLowerCase().includes(q) || b.diseño.toLowerCase().includes(q) || b.soporte.toLowerCase().includes(q);
    const e = filtro === "Todos" || b.estatus === filtro;
    return m && e;
  });
  const sinDrive = bordados.filter(b => !["Entregado", "Cancelado"].includes(b.estatus) && !b.linkDrive).length;
  const activos = bordados.filter(b => !["Entregado", "Cancelado"].includes(b.estatus)).length;
  const porCobrar = bordados.filter(b => b.estatus !== "Cancelado" && b.precioT).reduce((s, b) => s + (parseFloat(b.precioT || 0) - parseFloat(b.anticipo || 0)), 0);
  const conteos = BORD_E.reduce((a, e) => ({
    ...a,
    [e]: bordados.filter(b => b.estatus === e).length
  }), {});
  function guardar(form) {
    const isNuevo = modal === "nuevo";
    const id = isNuevo ? nextBordId : modal.id;
    const p = {
      ...form,
      id,
      fecha: isNuevo ? hoyB() : modal.fecha || hoyB()
    };
    if (isNuevo) {
      setBordados(prev => [...prev, p]);
      setNextBordId(n => n + 1);
    } else {
      setBordados(prev => prev.map(b => b.id === id ? p : b));
    }
    setModal(null);
    gsBordGuardar(p);
    if (p.cliente) upsertClienteLocal && upsertClienteLocal(p.cliente, {
      telefono: p.telefono,
      nit: p.nit,
      nrc: p.nrc,
      razonSocial: p.razonSocial,
      dirFiscal: p.dirFiscal
    });
  }
  function eliminar(id) {
    setBordados(prev => prev.filter(b => b.id !== id));
    setConfirm(null);
    setDetalle(null);
    gsBordBorrar(id); // Sincronizar con Google Sheets
  }
  function cambiarEstatus(id, est) {
    setBordados(prev => {
      const nuevos = prev.map(b => b.id === id ? {
        ...b,
        estatus: est
      } : b);
      gsBordGuardar(nuevos.find(b => b.id === id)); // Sincronizar estatus
      return nuevos;
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      background: "#fff",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "#1A5F5A",
      fontWeight: 800,
      fontFamily: "Georgia,serif"
    }
  }, "\uD83E\uDEA1 Bordados"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, bordados.length, " pedido(s) \xB7 ", activos, " activos \xB7 ", fmt$B(porCobrar), " por cobrar")), esAdmin && sinDrive > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFF8E1",
      border: "1px solid #FFE082",
      borderRadius: 8,
      padding: "4px 10px",
      fontSize: 11,
      color: "#856404",
      fontWeight: 700
    }
  }, "\u26A0\uFE0F ", sinDrive, " sin Drive"), /*#__PURE__*/React.createElement("input", {
    value: busq,
    onChange: e => setBusq(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar...",
    style: {
      padding: "7px 10px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      fontSize: 13,
      outline: "none",
      width: 160
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal("nuevo"),
    style: {
      padding: "9px 14px",
      borderRadius: 8,
      border: "none",
      background: "#1A5F5A",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
      whiteSpace: "nowrap"
    }
  }, "\uD83E\uDEA1 Nuevo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      background: "#fff",
      borderBottom: "1px solid #eee",
      padding: "0 12px",
      overflowX: "auto",
      flexShrink: 0
    }
  }, ["Todos", ...BORD_E].map(s => {
    const cnt = s === "Todos" ? bordados.length : conteos[s] || 0;
    const act = filtro === s;
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => setFiltro(s),
      style: {
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
        whiteSpace: "nowrap"
      }
    }, s, /*#__PURE__*/React.createElement("span", {
      style: {
        background: act ? "#1A5F5A" : "#eee",
        color: act ? "#fff" : "#aaa",
        borderRadius: 20,
        padding: "1px 5px",
        fontSize: 10,
        fontWeight: 700
      }
    }, cnt));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      padding: 12
    }
  }, lista.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 60,
      color: "#ccc"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 10
    }
  }, "\uD83E\uDEA1"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "#aaa"
    }
  }, "No hay pedidos de bordado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#bbb",
      marginTop: 4
    }
  }, "Presiona \"\uD83E\uDEA1 Nuevo\" para registrar el primero")) : /*#__PURE__*/React.createElement("table", {
    className: "tabla-pedidos",
    style: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0 4px"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ["ID", "Cliente", "Diseño / Soporte", "Drive", "Piezas", esAdmin ? "Pago" : "", "Entrega", "Estatus", ""].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      padding: "3px 9px",
      fontSize: 9,
      fontWeight: 700,
      color: "#bbb",
      textAlign: "left",
      textTransform: "uppercase"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, lista.map(b => {
    const saldo = parseFloat(b.precioT || 0) - parseFloat(b.anticipo || 0);
    const dias = diasB(b.fechaEntrega);
    const urg = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(b.estatus);
    const col = BORD_EC[b.estatus] || BORD_EC["Tomado"];
    return /*#__PURE__*/React.createElement("tr", {
      key: b.id,
      onClick: () => setDetalle(b),
      style: {
        background: "#fff",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px",
        borderRadius: "9px 0 0 9px",
        fontWeight: 800,
        fontFamily: "monospace",
        fontSize: 10,
        color: "#1A5F5A"
      }
    }, "BORD-", String(b.id).padStart(3, "0")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#222",
        fontSize: 13
      }
    }, b.cliente), b.telefono && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, "\uD83D\uDCF1 ", b.telefono), b.confRef && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#9B59B6",
        fontWeight: 700
      }
    }, "\uD83D\uDD17 Conf. #", b.confRef)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        color: "#333",
        fontSize: 12
      }
    }, b.diseño), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, b.soporte, " \xB7 ", b.posicion), b.hilos && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, "\uD83E\uDDF5 ", b.hilos), b.imagenRefUrl && /*#__PURE__*/React.createElement("img", {
      src: b.imagenRefUrl,
      alt: "ref",
      style: {
        width: 34,
        height: 34,
        objectFit: "cover",
        borderRadius: 5,
        border: "1px solid #e0e0e0",
        marginTop: 3,
        display: "block"
      }
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px"
      }
    }, (b.linkDrive || b.linkDstUrl) ? /*#__PURE__*/React.createElement(React.Fragment, null,
      b.linkDrive && /*#__PURE__*/React.createElement("a", {
        href: esAdmin ? (b.linkEmbFolderId ? "https://drive.google.com/drive/folders/" + b.linkEmbFolderId : driveViewUrl(b.linkEmbDriveId || extractDriveId(b.linkDrive))) : driveDownloadUrl(b.linkEmbDriveId || extractDriveId(b.linkDrive)),
        target: "_blank", rel: "noreferrer",
        style: {display:"block", fontSize:10, color:"#155724", fontWeight:700, marginBottom:2}
      }, esAdmin ? "\uD83D\uDCC1 .emb" : "\u2B07\uFE0F .emb"),
      b.linkDstUrl && /*#__PURE__*/React.createElement("a", {
        href: esAdmin ? (b.linkDstFolderId ? "https://drive.google.com/drive/folders/" + b.linkDstFolderId : driveViewUrl(b.linkDstId || extractDriveId(b.linkDstUrl))) : driveDownloadUrl(b.linkDstId || extractDriveId(b.linkDstUrl)),
        target: "_blank", rel: "noreferrer",
        style: {display:"block", fontSize:10, color:"#1A5F5A", fontWeight:700}
      }, esAdmin ? "\uD83C\uDFAF .dst" : "\u2B07\uFE0F .dst")
    ) : /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#FFF3CD",
        color: "#856404",
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 20
      }
    }, "\u26A0\uFE0F Sin respaldo")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#222"
      }
    }, b.cantidad || "—"), b.precioU && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, "$", b.precioU, "/u")), esAdmin && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px"
      }
    }, b.precioT ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#2C1654",
        fontSize: 13
      }
    }, fmt$B(b.precioT)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: saldo > 0 ? "#E63946" : "#28A745"
      }
    }, saldo > 0 ? "Resta " + fmt$B(saldo) : "✅ Pagado")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd"
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px"
      }
    }, b.fechaEntrega ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: urg ? "#E63946" : "#555",
        fontWeight: urg ? 700 : 400
      }
    }, urg ? "⚠️ " : "", b.fechaEntrega), dias !== null && !["Entregado", "Cancelado"].includes(b.estatus) && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: dias < 0 ? "#E63946" : dias <= 2 ? "#FD7E14" : "#aaa"
      }
    }, dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd",
        fontSize: 11
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px"
      }
    }, /*#__PURE__*/React.createElement("select", {
      value: b.estatus,
      onChange: e => cambiarEstatus(b.id, e.target.value),
      style: {
        border: "none",
        background: col.bg,
        color: col.fg,
        padding: "3px 8px",
        borderRadius: 20,
        fontWeight: 700,
        fontSize: 10,
        cursor: "pointer"
      }
    }, BORD_E.map(s => /*#__PURE__*/React.createElement("option", {
      key: s
    }, s)))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px 9px",
        borderRadius: "0 9px 9px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(b),
      style: {
        padding: "4px 8px",
        borderRadius: 6,
        border: "1.5px solid #e0e0e0",
        background: "#fff",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\u270F\uFE0F"), esAdmin && /*#__PURE__*/React.createElement("button", {
      onClick: () => setConfirm(b.id),
      style: {
        padding: "4px 7px",
        borderRadius: 6,
        border: "1.5px solid #fdd",
        background: "#fff8f8",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\uD83D\uDDD1\uFE0F"))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cards-pedidos",
    style: {
      flexDirection: "column",
      display: "none"
    }
  }, lista.map(b => {
    const saldo = parseFloat(b.precioT || 0) - parseFloat(b.anticipo || 0);
    const dias = diasB(b.fechaEntrega);
    const urg = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(b.estatus);
    const col = BORD_EC[b.estatus] || BORD_EC["Tomado"];
    return /*#__PURE__*/React.createElement("div", {
      key: b.id,
      onClick: () => setDetalle(b),
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: urg ? "1.5px solid #FD7E14" : "1.5px solid transparent",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#1A5F5A",
        fontWeight: 800,
        fontFamily: "monospace"
      }
    }, "BORD-", String(b.id).padStart(3, "0")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: "#2C1654"
      }
    }, b.cliente), b.telefono && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#555"
      }
    }, "\uD83D\uDCF1 ", b.telefono), b.confRef && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#9B59B6",
        fontWeight: 700
      }
    }, "\uD83D\uDD17 Conf. #", b.confRef)), /*#__PURE__*/React.createElement("select", {
      value: b.estatus,
      onChange: e => {
        e.stopPropagation();
        cambiarEstatus(b.id, e.target.value);
      },
      onClick: e => e.stopPropagation(),
      style: {
        border: "none",
        background: col.bg,
        color: col.fg,
        padding: "5px 8px",
        borderRadius: 20,
        fontWeight: 700,
        fontSize: 11,
        cursor: "pointer",
        maxWidth: 130
      }
    }, BORD_E.map(s => /*#__PURE__*/React.createElement("option", {
      key: s
    }, s)))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "#444",
        marginBottom: 4
      }
    }, b.diseño), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#888",
        marginBottom: 4
      }
    }, b.soporte, " \xB7 ", b.posicion), b.imagenRefUrl && /*#__PURE__*/React.createElement("img", {
      src: b.imagenRefUrl,
      alt: "ref",
      style: {
        width: 50,
        height: 50,
        objectFit: "cover",
        borderRadius: 7,
        border: "1px solid #e0e0e0",
        marginBottom: 6
      }
    }), b.fechaEntrega && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: urg ? "#E63946" : "#555",
        fontWeight: urg ? 700 : 400
      }
    }, urg ? "⚠️ " : "📅 ", b.fechaEntrega), dias !== null && !["Entregado", "Cancelado"].includes(b.estatus) && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        background: dias < 0 ? "#F8D7DA" : dias <= 2 ? "#FFF3CD" : "#e8f5e9",
        color: dias < 0 ? "#721C24" : dias <= 2 ? "#856404" : "#155724",
        padding: "2px 8px",
        borderRadius: 20,
        fontWeight: 700
      }
    }, dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d")), esAdmin && b.precioT && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: "flex",
        gap: 10,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 800,
        color: "#2C1654"
      }
    }, fmt$B(b.precioT)), saldo > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#E63946",
        fontWeight: 700
      }
    }, "Resta ", fmt$B(saldo)) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#28A745",
        fontWeight: 700
      }
    }, "\u2705 Pagado")), /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      className: "card-actions",
      style: {
        display: "flex",
        gap: 6,
        marginTop: 10,
        flexWrap: "wrap"
      }
    },
    (b.linkDrive || b.linkDstUrl) && /*#__PURE__*/React.createElement(React.Fragment, null,
      b.linkDrive && /*#__PURE__*/React.createElement("a", {
        href: esAdmin ? (b.linkEmbFolderId ? "https://drive.google.com/drive/folders/" + b.linkEmbFolderId : driveViewUrl(b.linkEmbDriveId || extractDriveId(b.linkDrive))) : driveDownloadUrl(b.linkEmbDriveId || extractDriveId(b.linkDrive)),
        target: "_blank", rel: "noreferrer",
        onClick: e => e.stopPropagation(),
        style: {padding:"9px 12px", borderRadius:8, border:"1.5px solid #1A5F5A33", background:"#f0fff8", color:"#1A5F5A", fontSize:12, fontWeight:700, textDecoration:"none", display:"flex", alignItems:"center", gap:4}
      }, esAdmin ? "\uD83D\uDCC1 .emb" : "\u2B07\uFE0F .emb"),
      b.linkDstUrl && /*#__PURE__*/React.createElement("a", {
        href: esAdmin ? (b.linkDstFolderId ? "https://drive.google.com/drive/folders/" + b.linkDstFolderId : driveViewUrl(b.linkDstId || extractDriveId(b.linkDstUrl))) : driveDownloadUrl(b.linkDstId || extractDriveId(b.linkDstUrl)),
        target: "_blank", rel: "noreferrer",
        onClick: e => e.stopPropagation(),
        style: {padding:"9px 12px", borderRadius:8, border:"1.5px solid #1A5F5A33", background:"#f0fff8", color:"#1A5F5A", fontSize:12, fontWeight:700, textDecoration:"none", display:"flex", alignItems:"center", gap:4}
      }, esAdmin ? "\uD83C\uDFAF .dst" : "\u2B07\uFE0F .dst")
    ),
    /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(b),
      style: {
        padding: "9px 14px",
        borderRadius: 8,
        border: "none",
        background: "#1A5F5A",
        color: "#fff",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        flex: 1,
        textAlign: "center"
      }
    }, "\u270F\uFE0F Editar"), esAdmin && /*#__PURE__*/React.createElement("button", {
      onClick: () => setConfirm(b.id),
      style: {
        padding: "9px 12px",
        borderRadius: 8,
        border: "1.5px solid #fdd",
        background: "#fff8f8",
        cursor: "pointer",
        fontSize: 13,
        color: "#DC3545"
      }
    }, "\uD83D\uDDD1\uFE0F")));
  }))), modal && /*#__PURE__*/React.createElement(BordadoModal, {
    initial: modal !== "nuevo" ? modal : null,
    esAdmin: esAdmin,
    onSave: guardar,
    onCancel: () => setModal(null),
    pedidosConf: pedidosConf,
    clientes: clientes || []
  }), detalle && /*#__PURE__*/React.createElement(Modal, {
    title: "🪡 BORD-" + String(detalle.id).padStart(3, "0") + " — " + detalle.cliente,
    onClose: () => setDetalle(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, "Estatus"), /*#__PURE__*/React.createElement("select", {
    value: detalle.estatus,
    onChange: e => {
      const n = {
        ...detalle,
        estatus: e.target.value
      };
      setDetalle(n);
      cambiarEstatus(detalle.id, e.target.value);
    },
    style: {
      width: "100%",
      padding: "9px 10px",
      borderRadius: 8,
      border: "1.5px solid " + ((BORD_EC[detalle.estatus] || {}).bg || "#e0e0e0"),
      background: (BORD_EC[detalle.estatus] || {}).bg || "#f5f5f5",
      color: (BORD_EC[detalle.estatus] || {}).fg || "#333",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      outline: "none"
    }
  }, BORD_E.map(e => /*#__PURE__*/React.createElement("option", {
    key: e
  }, e)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end"
    }
  }, (detalle.linkDrive || detalle.linkDstUrl) && /*#__PURE__*/React.createElement("div", {
    style: {display:"flex", gap:8, flexWrap:"wrap"}
  },
  detalle.linkDrive && /*#__PURE__*/React.createElement("a", {
    href: esAdmin
      ? (detalle.linkEmbFolderId ? "https://drive.google.com/drive/folders/" + detalle.linkEmbFolderId : driveViewUrl(detalle.linkEmbDriveId || extractDriveId(detalle.linkDrive)))
      : driveDownloadUrl(detalle.linkEmbDriveId || extractDriveId(detalle.linkDrive)),
    target: "_blank", rel: "noreferrer", download: !esAdmin || undefined,
    style: {display:"inline-flex",alignItems:"center",gap:6,padding:"8px 12px",background:"#E8F5E9",color:"#155724",borderRadius:8,fontWeight:700,fontSize:12,textDecoration:"none",border:"1px solid #8BC34A"}
  }, esAdmin ? "\uD83D\uDCC1 Carpeta .emb" : "\u2B07\uFE0F Descargar .emb"),
  detalle.linkDstUrl && /*#__PURE__*/React.createElement("a", {
    href: esAdmin
      ? (detalle.linkDstFolderId ? "https://drive.google.com/drive/folders/" + detalle.linkDstFolderId : driveViewUrl(detalle.linkDstId || extractDriveId(detalle.linkDstUrl)))
      : driveDownloadUrl(detalle.linkDstId || extractDriveId(detalle.linkDstUrl)),
    target: "_blank", rel: "noreferrer", download: !esAdmin || undefined,
    style: {display:"inline-flex",alignItems:"center",gap:6,padding:"8px 12px",background:"#E8F5E9",color:"#155724",borderRadius:8,fontWeight:700,fontSize:12,textDecoration:"none",border:"1px solid #1A5F5A"}
  }, esAdmin ? "\uD83C\uDFAF Carpeta .dst" : "\u2B07\uFE0F Descargar .dst")
))), [["Cliente", detalle.cliente], ["Teléfono", detalle.telefono], detalle.confRef ? ["Ref. confección", "#" + detalle.confRef] : null, ["Facturación", detalle.tipoDocumento], detalle.tipoDocumento !== "Consumidor Final" ? ["Razón Social", detalle.razonSocial || "⚠️ Pendiente"] : null, detalle.tipoDocumento !== "Consumidor Final" ? ["NIT", detalle.nit || "⚠️ Pendiente"] : null, ["Soporte", detalle.soporte], ["Cantidad", detalle.cantidad + " piezas"], ["Posición", detalle.posicion === "Libre/Otra" ? detalle.posLibre : detalle.posicion], ["Diseño", detalle.diseño], ["Estado diseño", detalle.estadoDiseño], ["Colores hilo", detalle.hilos], ["Puntadas est.", detalle.puntadas], ["Archivo Drive", detalle.linkDrive ? "✅ Respaldado en Drive" : "⚠️ Sin respaldo"], detalle.anchoMm && detalle.altoMm ? ["Dimensiones", detalle.anchoMm + "mm × " + detalle.altoMm + "mm"] : null, detalle.numColores ? ["N° de colores", detalle.numColores] : null, esAdmin ? ["Precio total", detalle.precioT ? fmt$B(detalle.precioT) : "—"] : null, esAdmin ? ["Abonado", fmt$B((detalle.abonos || []).length > 0 ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0) : parseFloat(detalle.anticipo || 0))] : null, esAdmin ? ["Saldo", fmt$B(parseFloat(detalle.precioT || 0) - ((detalle.abonos || []).length > 0 ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0) : parseFloat(detalle.anticipo || 0)))] : null, esAdmin && detalle.precioT ? ["Saldo", fmt$B(parseFloat(detalle.precioT || 0) - parseFloat(detalle.anticipo || 0))] : null, ["Fecha entrega", detalle.fechaEntrega], ["Notas", detalle.notas]].filter(Boolean).map(([k, v]) => !v ? null : /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "7px 0",
      borderBottom: "1px solid #f5f5f5",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#aaa",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#333",
      textAlign: "right",
      fontWeight: 600
    }
  }, v))), detalle.imagenRefUrl && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: detalle.imagenRefUrl,
    alt: "ref",
    style: {
      maxWidth: "100%",
      maxHeight: 160,
      borderRadius: 8,
      border: "1.5px solid #e0e0e0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#aaa",
      marginTop: 3
    }
  }, "Imagen de referencia")), detalle.linkDrive && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: detalle.linkDrive,
    target: "_blank",
    rel: "noreferrer",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "7px 14px",
      background: "#E8F5E9",
      color: "#155724",
      borderRadius: 8,
      fontWeight: 700,
      fontSize: 12,
      textDecoration: "none",
      border: "1px solid #8BC34A"
    }
  }, "\uD83D\uDCC1 Abrir archivo en Google Drive")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => exportarPedidoPDF(detalle, "bordado"),
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "none",
      background: "#1D6A3A",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12
    }
  }, "\uD83D\uDCC4 PDF"), esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirm(detalle.id),
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1.5px solid #fdd",
      background: "#fff8f8",
      color: "#DC3545",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13
    }
  }, "\uD83D\uDDD1\uFE0F"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(detalle);
      setDetalle(null);
    },
    style: {
      padding: "8px 16px",
      borderRadius: 8,
      border: "none",
      background: "#1A5F5A",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13
    }
  }, "\u270F\uFE0F Editar"))), confirm && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 28,
      maxWidth: 340,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 8
    }
  }, "\uD83D\uDDD1\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      color: "#1A5F5A"
    }
  }, "\xBFEliminar bordado?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: "0 0 16px"
    }
  }, "Esta acci\xF3n no se puede deshacer."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirm(null),
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => eliminar(confirm),
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "none",
      background: "#E63946",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700
    }
  }, "S\xED, eliminar")))));
}
function BordadoModal({
  initial,
  esAdmin,
  onSave,
  onCancel,
  pedidosConf,
  clientes = [],
  bordados = []
}) {
  const def = {
    cliente: "",
    telefono: "",
    confRef: "",
    tipoDocumento: "Consumidor Final",
    razonSocial: "",
    nit: "",
    nrc: "",
    dirFiscal: "",
    soporte: "",
    cantidad: "1",
    posicion: "Pecho izquierdo",
    posLibre: "",
    diseño: "",
    estadoDiseño: "Pendiente diseñar",
    hilos: "",
    puntadas: "",
    numColores: "",
    anchoMm: "",
    altoMm: "",
    esNuevo: "nuevo",
    linkDrive: "",
    calcAdj: 0,
    calcSelected: "",
    linkEmbDriveUrl: "",
    linkEmbDriveId: "",
    linkEmbFolderId: "",
    linkDstUrl: "",
    linkDstId: "",
    linkDstFolderId: "",
    imagenRefUrl: "",
    imagenRefId: "",
    precioU: "",
    precioT: "",
    anticipo: "",
    abonos: [],
    fechaEntrega: "",
    estatus: "Tomado",
    notas: ""
  };
  const [f, setF] = useState({
    ...def,
    ...(initial || {}),
    abonos: (initial || {}).abonos || []
  });
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const [sugsB, setSugsB] = useState([]);
  const [showSugsB, setShowSugsB] = useState(false);
  function buscarClientesBord(q) {
    if (!q || q.length < 2) {
      setSugsB([]);
      return;
    }
    const vistos = new Set();
    const res = clientes.filter(cl => cl.nombre && cl.nombre.toLowerCase().includes(q.toLowerCase())).filter(cl => {
      if (vistos.has(cl.nombre)) return false;
      vistos.add(cl.nombre);
      return true;
    }).slice(0, 5);
    setSugsB(res);
  }
  const buscarClientesBordDebounced = useDebouncedCallback(buscarClientesBord, 200);
  const [subiendoEmb, setSubiendoEmb] = React.useState(false);
  const [subiendoDst, setSubiendoDst] = React.useState(false);
  const [subiendoImg, setSubiendoImg] = React.useState(false);
  const [errSubida, setErrSubida] = React.useState("");
  const embRef = React.useRef();
  const dstRef = React.useRef();
  const imgRef = React.useRef();
  const calcTotal = (pu, cant) => {
    const t = parseFloat(pu || 0) * parseInt(cant || 1);
    if (t > 0) set("precioT", t.toFixed(2));
  };
  const redond25 = v => Math.round(v * 4) / 4; // redondear al $0.25 más cercano
  const calcPrecioSugerido = puntStr => {
    const punt = parseInt(String(puntStr || "").replace(/[^0-9]/g, "")) || 0;
    if (!punt) return null;
    const minutos = punt / 600;
    const costoProd = minutos * (3.00 / 60);
    const p1_5x = redond25(costoProd * 1.5);
    const p2x = redond25(costoProd * 2.0);
    const p3x = redond25(costoProd * 3.0);
    return {
      minutos: +minutos.toFixed(1),
      costoProd: +costoProd.toFixed(2),
      p1_5x,
      p2x,
      p3x
    };
  };
  const handleEmbUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoEmb(true);
    setErrSubida("");
    const confClienteNombre = f.confRef && pedidosConf ? pedidosConf.find(p => String(p.id) === String(f.confRef)) ? pedidosConf.find(p => String(p.id) === String(f.confRef)).cliente : null : null;
    const leerMetadataBordado = await cargarLectorBordado();
    const [meta, subida] = await Promise.all([leerMetadataBordado(file), subirEmbADrive(file, f.cliente, confClienteNombre)]);
    setSubiendoEmb(false);
    if (meta) {
      if (meta.puntadas) set("puntadas", String(meta.puntadas));
      if (meta.colores) set("numColores", String(meta.colores) + " colores");
      if (meta.anchoMm) set("anchoMm", String(meta.anchoMm));
      if (meta.altoMm) set("altoMm", String(meta.altoMm));
      if (meta.nombre && !f.diseño) set("diseño", meta.nombre);
      if (meta.nota) setErrSubida(meta.nota);
      if (meta.formato && meta.puntadas) {
        setErrSubida("✅ " + meta.formato + ": " + meta.puntadas.toLocaleString() + " puntadas" + (meta.colores ? " · " + meta.colores + " colores" : "") + (meta.anchoMm && meta.altoMm ? " · " + meta.anchoMm + "×" + meta.altoMm + "mm" : ""));
      }
    }
    if (subida.ok) {
      set("linkDrive", subida.url);
      set("linkEmbDriveUrl", subida.url);
      set("linkEmbDriveId", subida.id);
      if (subida.folderId) set("linkEmbFolderId", subida.folderId);
      if (!f.diseño) {
        const ext = file.name.split(".").pop();
        set("diseño", file.name.replace(new RegExp("\." + ext + "$", "i"), "").replace(/[_-]/g, " ").trim());
      }
    } else {
      setErrSubida(((meta || {}).nota ? meta.nota + "\n" : "") + "⚠️ Error subiendo a Drive: " + subida.err);
    }
    e.target.value = "";
  };
  const handleDstUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoDst(true);
    setErrSubida("");
    const confClienteNombre = f.confRef && pedidosConf ? (pedidosConf.find(p => String(p.id) === String(f.confRef)) || {}).cliente || null : null;
    const nombreSug = (f.id ? "BORD-" + String(f.id).padStart(3, "0") + "_" : "") + (f.cliente || "").split(" ").slice(0, 2).join("_") + (f.diseño ? "_" + f.diseño : "");
    const leerMetadataBordado = await cargarLectorBordado();
    const [meta, subida] = await Promise.all([leerMetadataBordado(file), subirEmbADrive(file, f.cliente, confClienteNombre, nombreSug)]);
    setSubiendoDst(false);
    if (meta) {
      if (meta.puntadas) set("puntadas", String(meta.puntadas));
      if (meta.colores) set("numColores", String(meta.colores) + " colores");
      if (meta.anchoMm) set("anchoMm", String(meta.anchoMm));
      if (meta.altoMm) set("altoMm", String(meta.altoMm));
      if (meta.nombre && !f.diseño) set("diseño", meta.nombre);
      if (meta.formato && meta.puntadas) setErrSubida("✅ " + meta.formato + ": " + meta.puntadas.toLocaleString() + " puntadas" + (meta.colores ? " · " + meta.colores + " colores" : "") + (meta.anchoMm && meta.altoMm ? " · " + meta.anchoMm + "×" + meta.altoMm + "mm" : ""));
    }
    if (subida.ok) {
      set("linkDstUrl", subida.url);
      set("linkDstId", subida.id);
      if (subida.folderId) set("linkDstFolderId", subida.folderId);
    } else setErrSubida("⚠️ Error subiendo .dst: " + subida.err);
    e.target.value = "";
  };
  const handleImgUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoImg(true);
    setErrSubida("");
    const comp = await comprimirImagen(file);
    const confClienteImg = f.confRef && pedidosConf ? pedidosConf.find(p => String(p.id) === String(f.confRef)) ? pedidosConf.find(p => String(p.id) === String(f.confRef)).cliente : null : null;
    const res = await subirImagenADrive({
      ...comp
    }, "bordados", f.cliente, confClienteImg);
    setSubiendoImg(false);
    if (res.driveUrl || res.url) {
      set("imagenRefUrl", res.img.driveUrl);
      set("imagenRefId", res.img.driveId || "");
    } else {
      set("imagenRefUrl", comp.data);
      setErrSubida("Foto guardada localmente (Drive no disponible)");
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
  const INPS = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid #e0e0e0",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    background: "#FAFAF8"
  };
  const LBL = {
    fontSize: 10,
    fontWeight: 700,
    color: "#666",
    marginBottom: 3,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: .3
  };
  const SEC = (c = "#1A5F5A") => ({
    fontSize: 10,
    fontWeight: 800,
    color: c,
    textTransform: "uppercase",
    letterSpacing: 1,
    margin: "14px 0 8px",
    borderBottom: "2px solid " + c + "33",
    paddingBottom: 3
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 150,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: "16px 16px 0 0",
      padding: 16,
      width: "100%",
      maxWidth: 600,
      maxHeight: "92vh",
      overflowY: "auto",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 15,
      color: "#1A5F5A",
      fontFamily: "Georgia,serif",
      fontWeight: 800
    }
  }, initial ? "✏️ Editar bordado" : "🪡 Nuevo bordado"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      background: "none",
      border: "none",
      fontSize: 20,
      cursor: "pointer",
      color: "#aaa"
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: SEC("#1A5F5A")
  }, "\uD83D\uDC64 Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Nombre / Alias *"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.cliente,
    placeholder: "Nombre o empresa",
    onChange: e => {
      set("cliente", e.target.value);
      buscarClientesBordDebounced(e.target.value);
      setShowSugsB(true);
    },
    onBlur: () => setTimeout(() => setShowSugsB(false), 150)
  }), showSugsB && sugsB.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      background: "#fff",
      border: "1.5px solid #e0e0e0",
      borderRadius: 8,
      zIndex: 50,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
    }
  }, sugsB.map((sg, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => {
      set("cliente", sg.nombre);
      if (sg.telefono) set("telefono", sg.telefono);
      if (sg.nit) set("nit", sg.nit);
      if (sg.nrc) set("nrc", sg.nrc);
      if (sg.razonSocial) set("razonSocial", sg.razonSocial);
      if (sg.dirFiscal) set("dirFiscal", sg.dirFiscal);
      if (sg.nit && sg.nrc) set("tipoDocumento", "Crédito Fiscal (completo)");
      setShowSugsB(false);
    },
    style: {
      padding: "9px 12px",
      cursor: "pointer",
      borderBottom: "1px solid #f5f5f5",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#1A5F5A"
    }
  }, sg.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 2
    }
  }, sg.telefono && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, "\uD83D\uDCF1 ", sg.telefono), sg.nit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#27AE60",
      fontWeight: 700
    }
  }, "\uD83D\uDCCB CF")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Tel\xE9fono / WhatsApp"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.telefono,
    placeholder: "Para avisar",
    onChange: e => set("telefono", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "\xBFViene de pedido de confecci\xF3n con bordado?"), /*#__PURE__*/React.createElement(BuscadorConfRef, {
    pedidosConf: (pedidosConf || []).filter(p => p.tieneBordado && !["Entregado", "Cancelado"].includes(p.estatus)),
    value: f.confRef,
    soloConBordado: true,
    onChange: (val, ped) => {
      set("confRef", val);
      if (ped && !f.cliente) {
        set("cliente", ped.cliente);
        set("telefono", ped.telefono || "");
      }
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: SEC("#C9A227")
  }, "\uD83E\uDDFE Facturaci\xF3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Tipo de documento"), /*#__PURE__*/React.createElement("select", {
    style: INPS,
    value: f.tipoDocumento,
    onChange: e => set("tipoDocumento", e.target.value)
  }, ["Consumidor Final", "Crédito Fiscal (pendiente datos)", "Crédito Fiscal (completo)"].map(t => /*#__PURE__*/React.createElement("option", {
    key: t
  }, t)))), f.tipoDocumento !== "Consumidor Final" && /*#__PURE__*/React.createElement("div", {
    style: {
      background: f.tipoDocumento.includes("pendiente") ? "#FFF8E1" : "#F1F8E9",
      border: "1.5px solid " + (f.tipoDocumento.includes("pendiente") ? "#FFC107" : "#8BC34A"),
      borderRadius: 10,
      padding: 12,
      marginBottom: 8
    }
  }, f.tipoDocumento.includes("pendiente") && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#856404",
      fontWeight: 700,
      marginBottom: 8
    }
  }, "\u26A0\uFE0F Pendiente recibir datos fiscales del cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Raz\xF3n Social"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.razonSocial,
    placeholder: "Nombre legal",
    onChange: e => set("razonSocial", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "NIT"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.nit,
    placeholder: "0000-000000-000-0",
    onChange: e => set("nit", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "NRC"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.nrc,
    placeholder: "000000-0",
    onChange: e => set("nrc", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Direcci\xF3n fiscal"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.dirFiscal,
    placeholder: "Para la factura",
    onChange: e => set("dirFiscal", e.target.value)
  })))), /*#__PURE__*/React.createElement("div", {
    style: SEC("#C0392B")
  }, "\uD83E\uDDE5 Soporte del bordado"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Tipo de soporte *"), /*#__PURE__*/React.createElement("select", {
    style: INPS,
    value: f.soporte,
    onChange: e => set("soporte", e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Seleccionar \u2014"), SOPORTES_BORD.map(s => /*#__PURE__*/React.createElement("option", {
    key: s
  }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Cantidad de piezas"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    type: "number",
    min: "1",
    value: f.cantidad,
    onChange: e => {
      set("cantidad", e.target.value);
      calcTotal(f.precioU, e.target.value);
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Posici\xF3n"), /*#__PURE__*/React.createElement("select", {
    style: INPS,
    value: f.posicion,
    onChange: e => set("posicion", e.target.value)
  }, POSICIONES_BORD.map(p => /*#__PURE__*/React.createElement("option", {
    key: p
  }, p))))), f.posicion === "Libre/Otra" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Descripci\xF3n de la posici\xF3n"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.posLibre,
    placeholder: "D\xF3nde exactamente va el bordado...",
    onChange: e => set("posLibre", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: SEC("#1A5F5A")
  }, "\uD83E\uDEA1 Dise\xF1o Wilcom"), (() => {
    const [busqD, setBusqD] = useState("");
    const resD = busqD.length >= 2 ? (bordados || []).filter(b => b.id !== f.id && (b.linkDrive || b.linkDstUrl) && ((b.cliente || "").toLowerCase().includes(busqD.toLowerCase()) || (b.diseño || "").toLowerCase().includes(busqD.toLowerCase()))).slice(0, 5) : [];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: LBL
    }, "\uD83D\uDD0D \xBFYa existe este dise\xF1o?"), /*#__PURE__*/React.createElement("input", {
      style: {
        ...INPS,
        marginBottom: 4
      },
      value: busqD,
      placeholder: "Ej: COED, Logo empresa...",
      onChange: e => setBusqD(e.target.value)
    }), resD.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 4
      }
    }, resD.map(b => /*#__PURE__*/React.createElement("div", {
      key: b.id,
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        background: "#f0fff8",
        border: "1.5px solid #1A5F5A44",
        borderRadius: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#1A5F5A"
      }
    }, "BORD-", String(b.id).padStart(3, "0"), " \xB7 ", b.cliente), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#555"
      }
    }, b.diseño || "—", b.linkDrive ? " · ✅ .emb" : "", b.linkDstUrl ? " · ✅ .dst" : "")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
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
      },
      style: {
        padding: "6px 12px",
        borderRadius: 7,
        border: "none",
        background: "#1A5F5A",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 11
      }
    }, "Usar este \u2192")))));
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "\uD83D\uDCC1 Editable Wilcom (.emb)"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".emb",
    ref: embRef,
    style: {
      display: "none"
    },
    onChange: handleEmbUpload
  }), f.linkDrive ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      background: "#F1FFF4",
      border: "1.5px solid #28A745",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\u2705"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#155724",
      fontSize: 12
    }
  }, "Archivo en Google Drive"), esAdmin && /*#__PURE__*/React.createElement("a", {
    href: f.linkEmbFolderId ? "https://drive.google.com/drive/folders/" + f.linkEmbFolderId : driveViewUrl(f.linkEmbDriveId || extractDriveId(f.linkDrive)),
    target: "_blank",
    rel: "noreferrer",
    style: {
      fontSize: 11,
      color: "#1A5F5A"
    }
  }, "\uD83D\uDCC1 Abrir en Drive \u2192")), !esAdmin && /*#__PURE__*/React.createElement("a", {
    href: f.linkDrive,
    download: true,
    target: "_blank",
    rel: "noreferrer",
    style: {
      fontSize: 11,
      color: "#fff",
      background: "#1A5F5A",
      padding: "4px 10px",
      borderRadius: 6,
      textDecoration: "none",
      fontWeight: 700
    }
  }, "\u2B07\uFE0F .emb"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      set("linkDrive", "");
      set("linkEmbDriveUrl", "");
      set("linkEmbDriveId", "");
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#aaa",
      fontSize: 16
    }
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => embRef.current && embRef.current.click(),
    disabled: subiendoEmb,
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 8,
      border: "2px dashed #1A5F5A44",
      background: "#F0FFF8",
      color: "#1A5F5A",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, subiendoEmb ? "⏳ Subiendo a Drive..." : "📁 Seleccionar archivo .emb y subir"), (f.cliente || f.diseño) && !f.linkDrive && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5,
      padding: "5px 10px",
      background: "#EFF4FF",
      borderRadius: 7,
      fontSize: 11,
      color: "#3A3A8A"
    }
  }, "\uD83D\uDCC1 Nombre sugerido: ", /*#__PURE__*/React.createElement("code", {
    style: {
      fontFamily: "monospace"
    }
  }, nfSugerido()))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "\uD83C\uDFAF Listo para bordar (.dst/.pes)"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".dst,.pes,.jef,.exp,.vp3",
    ref: dstRef,
    style: {
      display: "none"
    },
    onChange: handleDstUpload
  }), f.linkDstUrl ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      background: "#F1FFF4",
      border: "1.5px solid #28A745",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u2705"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#155724",
      fontSize: 12
    }
  }, ".dst en Drive"), /*#__PURE__*/React.createElement("a", {
    href: esAdmin ? (f.linkDstFolderId ? "https://drive.google.com/drive/folders/" + f.linkDstFolderId : driveViewUrl(f.linkDstId || extractDriveId(f.linkDstUrl))) : f.linkDstUrl,
    target: "_blank",
    rel: "noreferrer",
    style: {
      fontSize: 11,
      color: "#1A5F5A"
    }
  }, esAdmin ? "\uD83D\uDCC1 Abrir en Drive \u2192" : "Ver"), !esAdmin && /*#__PURE__*/React.createElement("a", {
    href: driveDownloadUrl(f.linkDstId || extractDriveId(f.linkDstUrl)),
    download: true,
    target: "_blank",
    rel: "noreferrer",
    style: {fontSize:11,color:"#fff",background:"#1A5F5A",padding:"4px 10px",borderRadius:6,textDecoration:"none",fontWeight:700}
  }, "\u2B07\uFE0F Descargar .dst")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      set("linkDstUrl", "");
      set("linkDstId", "");
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#aaa",
      fontSize: 16
    }
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => dstRef.current && dstRef.current.click(),
    disabled: subiendoDst,
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 8,
      border: "2px dashed #1A5F5A44",
      background: "#F0FFF8",
      color: "#1A5F5A",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, subiendoDst ? "⏳ Subiendo..." : "🎯 Subir .dst y leer datos")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "\uD83D\uDCF8 Imagen de referencia del dise\xF1o"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    ref: imgRef,
    style: {
      display: "none"
    },
    onChange: handleImgUpload
  }), f.imagenRefUrl ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: f.imagenRefUrl,
    alt: "ref",
    style: {
      width: 80,
      height: 80,
      objectFit: "cover",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#28A745",
      fontWeight: 700,
      marginBottom: 4
    }
  }, "\u2705 Imagen de referencia"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      set("imagenRefUrl", "");
      set("imagenRefId", "");
    },
    style: {
      fontSize: 11,
      color: "#E63946",
      background: "none",
      border: "1px solid #fdd",
      borderRadius: 6,
      padding: "3px 8px",
      cursor: "pointer"
    }
  }, "Quitar imagen"))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => imgRef.current && imgRef.current.click(),
    disabled: subiendoImg,
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 8,
      border: "2px dashed #E91E8C44",
      background: "#FFF0F8",
      color: "#C2185B",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, subiendoImg ? "⏳ Subiendo imagen..." : "📷 Subir imagen de referencia")), errSubida && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      padding: "6px 10px",
      background: "#FFF3CD",
      borderRadius: 7,
      fontSize: 11,
      color: "#856404"
    }
  }, "\u26A0\uFE0F ", errSubida), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Nombre del dise\xF1o *"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.diseño,
    placeholder: "Ej: Logo Empresa ABC",
    onChange: e => set("diseño", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Estado del dise\xF1o"), /*#__PURE__*/React.createElement("select", {
    style: INPS,
    value: f.estadoDiseño,
    onChange: e => set("estadoDiseño", e.target.value)
  }, DISENO_EST.map(d => /*#__PURE__*/React.createElement("option", {
    key: d
  }, d)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Colores de hilo (cantidad)"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.numColores,
    placeholder: "Ej: 3 colores",
    onChange: e => set("numColores", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Nombres de hilos"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.hilos,
    placeholder: "Ej: Azul marino, Blanco, Dorado",
    onChange: e => set("hilos", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Ancho del dise\xF1o (mm)"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    type: "number",
    value: f.anchoMm,
    placeholder: "Ej: 85",
    onChange: e => set("anchoMm", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Alto del dise\xF1o (mm)"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    type: "number",
    value: f.altoMm,
    placeholder: "Ej: 60",
    onChange: e => set("altoMm", e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Puntadas totales del dise\xF1o"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.puntadas,
    placeholder: "Ej: 8500 (sin comas)",
    onChange: e => set("puntadas", e.target.value)
  })), (() => {
    const calc = calcPrecioSugerido(f.puntadas);
    if (!calc) return null;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 12,
        background: "#F0FFF8",
        border: "1.5px solid #A8D8A8",
        borderRadius: 10,
        padding: "12px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: "#1A5F5A",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 8
      }
    }, "\uD83E\uDDEE Calculadora de precio sugerido"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        marginBottom: 10,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 7,
        padding: "7px 10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#aaa",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase"
      }
    }, "\u23F1 Tiempo estimado"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        color: "#2C1654",
        fontSize: 15,
        marginTop: 2
      }
    }, calc.minutos, " min"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#aaa",
        fontSize: 10
      }
    }, "por pieza a 600 ptas/min")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 7,
        padding: "7px 10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#aaa",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase"
      }
    }, "\u2699\uFE0F Costo m\xE1quina"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        color: "#E67E22",
        fontSize: 15,
        marginTop: 2
      }
    }, "$", calc.costoProd, "/pieza"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#aaa",
        fontSize: 10
      }
    }, "$3.00/hora (amortización $0.91 + hilo $1.50 + energía + margen)"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#1A5F5A",
        marginBottom: 6
      }
    }, "Precio de venta sugerido por pieza:"),
    /*#__PURE__*/React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}},
      [
        {key:"min", lbl:"M\xEDnimo \xD71.5", base:calc.p1_5x, col:"#27AE60"},
        {key:"rec", lbl:"Recomendado \xD72", base:calc.p2x, col:"#1A5F5A"},
        {key:"pre", lbl:"Premium \xD73", base:calc.p3x, col:"#9B59B6"}
      ].map(function(card){
        const adj = parseFloat(f.calcAdj) || 0;
        const precio = Math.max(0.05, Math.round((card.base + adj) * 20) / 20);
        const sel = f.calcSelected === card.key;
        return /*#__PURE__*/React.createElement("div", {
          key: card.key,
          style:{
            borderRadius:10,
            border: sel ? "3px solid " + card.col : "2px solid " + card.col + "44",
            background: sel ? card.col + "11" : "#fff",
            padding:"8px 6px",
            textAlign:"center",
            boxShadow: sel ? "0 2px 10px " + card.col + "44" : "none",
            transform: sel ? "scale(1.03)" : "scale(1)",
            transition:"all 0.15s"
          }
        },
          sel && /*#__PURE__*/React.createElement("div", {style:{fontSize:9,color:card.col,fontWeight:900,marginBottom:2,letterSpacing:1}}, "\u2713 SELECCIONADO"),
          /*#__PURE__*/React.createElement("div", {style:{fontSize:9,color:"#888",marginBottom:4,fontWeight:700}}, card.lbl),
          /*#__PURE__*/React.createElement("div", {style:{fontWeight:900,color:card.col,fontSize:22,marginBottom:6}}, "$", precio.toFixed(2)),
          /*#__PURE__*/React.createElement("div", {style:{display:"flex",gap:4,justifyContent:"center"}},
            /*#__PURE__*/React.createElement("button", {
              onClick:()=>{ const a=(parseFloat(f.calcAdj)||0)-0.05; set("calcAdj",a); set("precioU",Math.max(0.05,Math.round((card.base+a)*20)/20).toFixed(2)); calcTotal(Math.max(0.05,Math.round((card.base+a)*20)/20),f.cantidad); set("calcSelected",card.key); },
              style:{flex:1,height:28,borderRadius:6,border:"1px solid "+card.col+"66",background:"#f8f8f8",cursor:"pointer",fontWeight:900,fontSize:16,color:card.col,padding:0}
            }, "\u2212"),
            /*#__PURE__*/React.createElement("button", {
              onClick:()=>{ set("precioU",precio.toFixed(2)); calcTotal(precio,f.cantidad); set("calcSelected",card.key); },
              style:{flex:2,height:28,borderRadius:6,border:"1px solid "+card.col+"66",background:sel?card.col:card.col+"11",cursor:"pointer",fontSize:11,fontWeight:700,color:sel?"#fff":card.col,padding:0}
            }, sel ? "\u2713 Aplicado" : "Aplicar"),
            /*#__PURE__*/React.createElement("button", {
              onClick:()=>{ const a=(parseFloat(f.calcAdj)||0)+0.05; set("calcAdj",a); set("precioU",Math.round((card.base+a)*20)/20 .toFixed(2)); calcTotal(Math.round((card.base+a)*20)/20,f.cantidad); set("calcSelected",card.key); },
              style:{flex:1,height:28,borderRadius:6,border:"1px solid "+card.col+"66",background:"#f8f8f8",cursor:"pointer",fontWeight:900,fontSize:16,color:card.col,padding:0}
            }, "+")
          )
        );
      })
    ),
    /*#__PURE__*/React.createElement("div", {style:{fontSize:10,color:"#aaa",textAlign:"center",marginTop:6}}, "\u2212 / + ajusta los 3 precios a la vez \xB7 Aplicar selecciona"));
  })(), esAdmin && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: SEC("#27AE60")
  }, "\uD83D\uDCB0 Pago y Entrega"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Precio/pieza ($)"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    type: "number",
    value: f.precioU,
    placeholder: "0.00",
    onChange: e => {
      set("precioU", e.target.value);
      calcTotal(e.target.value, f.cantidad);
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Total ($)"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    type: "number",
    value: f.precioT,
    placeholder: "0.00",
    onChange: e => set("precioT", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Fecha entrega"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    type: "date",
    value: f.fechaEntrega,
    onChange: e => set("fechaEntrega", e.target.value)
  }))), /*#__PURE__*/React.createElement(RegistroAbonos, {
    abonos: f.abonos || [],
    precioTotal: f.precioT,
    onChange: v => {
      set("abonos", v);
      set("anticipo", v.reduce((s, a) => s + parseFloat(a.monto || 0), 0).toFixed(2));
    },
    esAdmin: true
  })), !esAdmin && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Fecha de entrega"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    type: "date",
    value: f.fechaEntrega,
    onChange: e => set("fechaEntrega", e.target.value)
  })), !esAdmin && /*#__PURE__*/React.createElement(RegistroAbonos, {
    abonos: f.abonos || [],
    precioTotal: f.precioT,
    onChange: v => {
      set("abonos", v);
      set("anticipo", v.reduce((s, a) => s + parseFloat(a.monto || 0), 0).toFixed(2));
    },
    esAdmin: false
  }), /*#__PURE__*/React.createElement("div", {
    style: SEC("#007BFF")
  }, "\uD83D\uDCCC Estado"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Estatus"), /*#__PURE__*/React.createElement("select", {
    style: INPS,
    value: f.estatus,
    onChange: e => set("estatus", e.target.value)
  }, BORD_E.map(s => /*#__PURE__*/React.createElement("option", {
    key: s
  }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Notas internas"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.notas,
    placeholder: "Instrucciones especiales...",
    onChange: e => set("notas", e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600,
      color: "#666"
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (!f.cliente) {
        pushToast("Falta el nombre del cliente", "error");
        return;
      }
      if (!f.soporte) {
        pushToast("Seleccioná el soporte (camisa, gorra, etc)", "error");
        return;
      }
      if (!f.diseño) {
        pushToast("Falta el nombre del diseño", "error");
        return;
      }
      onSave(f);
    },
    style: {
      padding: "9px 22px",
      borderRadius: 8,
      border: "none",
      background: "#1A5F5A",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14
    }
  }, "\uD83D\uDCBE Guardar bordado"))));
}
function SeccionCuellos({
  cuellos,
  setCuellos,
  nextCuelId,
  setNextCuelId,
  pedidosConf,
  esAdmin,
  clientes = [],
  upsertClienteLocal
}) {
  const [busq, setBusq] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [modal, setModal] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const hoyC = () => new Date().toISOString().split("T")[0];
  const diasC = f => f ? Math.ceil((new Date(f + "T12:00:00") - new Date()) / 86400000) : null;
  const fmt$C = n => "$" + parseFloat(n || 0).toFixed(2);
  const lista = cuellos.filter(c => {
    const q = busq.toLowerCase();
    const m = c.cliente.toLowerCase().includes(q) || (c.tipoCuello || "").toLowerCase().includes(q);
    const e = filtro === "Todos" || c.estatus === filtro;
    return m && e;
  });
  const activos = cuellos.filter(c => !["Entregado", "Cancelado"].includes(c.estatus)).length;
  const porCobrar = cuellos.filter(c => c.estatus !== "Cancelado" && c.precioT).reduce((s, c) => s + (parseFloat(c.precioT || 0) - parseFloat(c.anticipo || 0)), 0);
  const conteos = CUEL_E.reduce((a, e) => ({
    ...a,
    [e]: cuellos.filter(c => c.estatus === e).length
  }), {});
  function guardar(form) {
    const isNuevo = modal === "nuevo";
    const id = isNuevo ? nextCuelId : modal.id;
    const p = {
      ...form,
      id,
      fecha: isNuevo ? hoyC() : modal.fecha || hoyC()
    };
    if (isNuevo) {
      setCuellos(prev => [...prev, p]);
      setNextCuelId(n => n + 1);
    } else {
      setCuellos(prev => prev.map(c => c.id === id ? p : c));
    }
    setModal(null);
    gsCuelGuardar(p);
    if (p.cliente) upsertClienteLocal && upsertClienteLocal(p.cliente, {
      telefono: p.telefono
    });
  }
  function eliminar(id) {
    setCuellos(prev => prev.filter(c => c.id !== id));
    setConfirm(null);
    setDetalle(null);
    gsCuelBorrar(id); // Sincronizar con Google Sheets
  }
  function cambiarEstatus(id, est) {
    setCuellos(prev => {
      const nuevos = prev.map(c => c.id === id ? {
        ...c,
        estatus: est
      } : c);
      gsCuelGuardar(nuevos.find(c => c.id === id)); // Sincronizar estatus
      return nuevos;
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      background: "#fff",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "#B85C00",
      fontWeight: 800,
      fontFamily: "Georgia,serif"
    }
  }, "\uD83E\uDDF6 Tejido de Cuellos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, cuellos.length, " pedido(s) \xB7 ", activos, " activos \xB7 ", fmt$C(porCobrar), " por cobrar")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFF4E6",
      border: "1px solid #FFCC80",
      borderRadius: 8,
      padding: "4px 10px",
      fontSize: 11,
      color: "#B85C00",
      fontWeight: 700
    }
  }, "M\xF3dulo activo \u2014 en espera de tejedora"), /*#__PURE__*/React.createElement("input", {
    value: busq,
    onChange: e => setBusq(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar...",
    style: {
      padding: "7px 10px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      fontSize: 13,
      outline: "none",
      width: 160
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal("nuevo"),
    style: {
      padding: "9px 14px",
      borderRadius: 8,
      border: "none",
      background: "#B85C00",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
      whiteSpace: "nowrap"
    }
  }, "\uD83E\uDDF6 Nuevo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      background: "#fff",
      borderBottom: "1px solid #eee",
      padding: "0 12px",
      overflowX: "auto",
      flexShrink: 0
    }
  }, ["Todos", ...CUEL_E].map(s => {
    const cnt = s === "Todos" ? cuellos.length : conteos[s] || 0;
    const act = filtro === s;
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => setFiltro(s),
      style: {
        padding: "7px 8px",
        border: "none",
        background: "none",
        borderBottom: act ? "2.5px solid #B85C00" : "2.5px solid transparent",
        color: act ? "#B85C00" : "#999",
        fontWeight: act ? 700 : 400,
        cursor: "pointer",
        fontSize: 10,
        display: "flex",
        alignItems: "center",
        gap: 3,
        whiteSpace: "nowrap"
      }
    }, s, /*#__PURE__*/React.createElement("span", {
      style: {
        background: act ? "#B85C00" : "#eee",
        color: act ? "#fff" : "#aaa",
        borderRadius: 20,
        padding: "1px 5px",
        fontSize: 10,
        fontWeight: 700
      }
    }, cnt));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      padding: 12
    }
  }, lista.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 60,
      color: "#ccc"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 10
    }
  }, "\uD83E\uDDF6"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "#aaa"
    }
  }, "No hay pedidos de cuellos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#bbb",
      marginTop: 4
    }
  }, "M\xF3dulo listo para cuando la tejedora est\xE9 confirmada")) : /*#__PURE__*/React.createElement("table", {
    className: "tabla-pedidos",
    style: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0 4px"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ["ID", "Cliente", "Tipo cuello", "Material", "Talla", "Cant.", esAdmin ? "Pago" : "", "Entrega", "Estatus", ""].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      padding: "3px 9px",
      fontSize: 9,
      fontWeight: 700,
      color: "#bbb",
      textAlign: "left",
      textTransform: "uppercase"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, lista.map(c => {
    const saldo = parseFloat(c.precioT || 0) - parseFloat(c.anticipo || 0);
    const dias = diasC(c.fechaEntrega);
    const urg = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(c.estatus);
    const col = CUEL_EC[c.estatus] || CUEL_EC["Tomado"];
    return /*#__PURE__*/React.createElement("tr", {
      key: c.id,
      onClick: () => setDetalle(c),
      style: {
        background: "#fff",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px",
        borderRadius: "9px 0 0 9px",
        fontWeight: 800,
        fontFamily: "monospace",
        fontSize: 10,
        color: "#B85C00"
      }
    }, "CUEL-", String(c.id).padStart(3, "0")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#222",
        fontSize: 13
      }
    }, c.cliente), c.telefono && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, "\uD83D\uDCF1 ", c.telefono), c.confRef && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#9B59B6",
        fontWeight: 700
      }
    }, "\uD83D\uDD17 Conf. #", c.confRef)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        flexWrap: "wrap"
      }
    }, (c.cuello || {}).activa && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: "#EBF5FB",
        color: "#1A5276",
        padding: "2px 7px",
        borderRadius: 10,
        fontWeight: 700
      }
    }, "\uD83D\uDD35 Cuello"), (c.puno || {}).activa && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: "#FFF4E6",
        color: "#B85C00",
        padding: "2px 7px",
        borderRadius: 10,
        fontWeight: 700
      }
    }, "\uD83D\uDFE1 Pu\xF1o"), (c.banda || {}).activa && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: "#F0FFF4",
        color: "#1A5F5A",
        padding: "2px 7px",
        borderRadius: 10,
        fontWeight: 700
      }
    }, "\uD83D\uDFE2 Banda"), !(c.cuello || {}).activa && !(c.puno || {}).activa && !(c.banda || {}).activa && c.tipoCuello && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#555"
      }
    }, c.tipoCuello)), ((c.cuello || {}).colores || c.colorHilo) && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#888",
        marginTop: 2
      }
    }, (c.cuello || {}).colores || c.colorHilo)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#555"
      }
    }, c.material || "—"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, c.calibre)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px",
        textAlign: "center",
        fontWeight: 700,
        fontSize: 14
      }
    }, c.cantidad || "—"), esAdmin && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px"
      }
    }, c.precioT ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#2C1654",
        fontSize: 13
      }
    }, fmt$C(c.precioT)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: saldo > 0 ? "#E63946" : "#28A745"
      }
    }, saldo > 0 ? "Resta " + fmt$C(saldo) : "✅ Pagado")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd"
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px"
      }
    }, c.fechaEntrega ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: urg ? "#E63946" : "#555",
        fontWeight: urg ? 700 : 400
      }
    }, urg ? "⚠️ " : "", c.fechaEntrega), dias !== null && !["Entregado", "Cancelado"].includes(c.estatus) && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: dias < 0 ? "#E63946" : dias <= 2 ? "#FD7E14" : "#aaa"
      }
    }, dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd",
        fontSize: 11
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px"
      }
    }, /*#__PURE__*/React.createElement("select", {
      value: c.estatus,
      onChange: e => cambiarEstatus(c.id, e.target.value),
      style: {
        border: "none",
        background: col.bg,
        color: col.fg,
        padding: "3px 8px",
        borderRadius: 20,
        fontWeight: 700,
        fontSize: 10,
        cursor: "pointer"
      }
    }, CUEL_E.map(s => /*#__PURE__*/React.createElement("option", {
      key: s
    }, s)))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "9px",
        borderRadius: "0 9px 9px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(c),
      style: {
        padding: "4px 8px",
        borderRadius: 6,
        border: "1.5px solid #e0e0e0",
        background: "#fff",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\u270F\uFE0F"), esAdmin && /*#__PURE__*/React.createElement("button", {
      onClick: () => setConfirm(c.id),
      style: {
        padding: "4px 7px",
        borderRadius: 6,
        border: "1.5px solid #fdd",
        background: "#fff8f8",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\uD83D\uDDD1\uFE0F"))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cards-pedidos",
    style: {
      flexDirection: "column",
      display: "none"
    }
  }, lista.map(cu => {
    const saldo = parseFloat(cu.precioT || 0) - parseFloat(cu.anticipo || 0);
    const dias = diasC(cu.fechaEntrega);
    const urg = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(cu.estatus);
    const col = CUEL_EC[cu.estatus] || CUEL_EC["Tomado"];
    return /*#__PURE__*/React.createElement("div", {
      key: cu.id,
      onClick: () => setDetalle(cu),
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: urg ? "1.5px solid #FD7E14" : "1.5px solid transparent",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#B85C00",
        fontWeight: 800,
        fontFamily: "monospace"
      }
    }, "CUEL-", String(cu.id).padStart(3, "0")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: "#2C1654"
      }
    }, cu.cliente), cu.telefono && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#555"
      }
    }, "\uD83D\uDCF1 ", cu.telefono)), /*#__PURE__*/React.createElement("select", {
      value: cu.estatus,
      onChange: e => {
        e.stopPropagation();
        cambiarEstatus(cu.id, e.target.value);
      },
      onClick: e => e.stopPropagation(),
      style: {
        border: "none",
        background: col.bg,
        color: col.fg,
        padding: "5px 8px",
        borderRadius: 20,
        fontWeight: 700,
        fontSize: 11,
        cursor: "pointer"
      }
    }, CUEL_E.map(s => /*#__PURE__*/React.createElement("option", {
      key: s
    }, s)))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "#444",
        marginBottom: 4
      }
    }, cu.tipoCuello || "—"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#888",
        marginBottom: 4
      }
    }, cu.material, cu.colorHilo ? " · " + cu.colorHilo : "", " \xB7 Talla ", cu.talla, " \xB7 ", cu.cantidad, " pza", cu.cantidad !== 1 ? "s" : ""), cu.fechaEntrega && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: urg ? "#E63946" : "#555",
        fontWeight: urg ? 700 : 400
      }
    }, urg ? "⚠️ " : "📅 ", cu.fechaEntrega), dias !== null && !["Entregado", "Cancelado"].includes(cu.estatus) && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        background: dias < 0 ? "#F8D7DA" : dias <= 2 ? "#FFF3CD" : "#e8f5e9",
        color: dias < 0 ? "#721C24" : dias <= 2 ? "#856404" : "#155724",
        padding: "2px 8px",
        borderRadius: 20,
        fontWeight: 700
      }
    }, dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d")), esAdmin && cu.precioT && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: "flex",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 800,
        color: "#2C1654"
      }
    }, fmt$C(cu.precioT)), saldo > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#E63946",
        fontWeight: 700
      }
    }, "Resta ", fmt$C(saldo)) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#28A745",
        fontWeight: 700
      }
    }, "\u2705 Pagado")), /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      className: "card-actions",
      style: {
        display: "flex",
        gap: 6,
        marginTop: 10,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(cu),
      style: {
        padding: "9px 14px",
        borderRadius: 8,
        border: "none",
        background: "#B85C00",
        color: "#fff",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        flex: 1,
        textAlign: "center"
      }
    }, "\u270F\uFE0F Editar"), esAdmin && /*#__PURE__*/React.createElement("button", {
      onClick: () => setConfirm(cu.id),
      style: {
        padding: "9px 12px",
        borderRadius: 8,
        border: "1.5px solid #fdd",
        background: "#fff8f8",
        cursor: "pointer",
        fontSize: 13,
        color: "#DC3545"
      }
    }, "\uD83D\uDDD1\uFE0F")));
  }))), modal && /*#__PURE__*/React.createElement(CuelloModal, {
    initial: modal !== "nuevo" ? modal : null,
    esAdmin: esAdmin,
    onSave: guardar,
    onCancel: () => setModal(null),
    pedidosConf: pedidosConf,
    clientes: clientes || []
  }), detalle && /*#__PURE__*/React.createElement(Modal, {
    title: "🧶 CUEL-" + String(detalle.id).padStart(3, "0") + " — " + detalle.cliente,
    onClose: () => setDetalle(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, "Estatus"), /*#__PURE__*/React.createElement("select", {
    value: detalle.estatus,
    onChange: e => {
      const n = {
        ...detalle,
        estatus: e.target.value
      };
      setDetalle(n);
      cambiarEstatus(detalle.id, e.target.value);
    },
    style: {
      width: "100%",
      padding: "9px 10px",
      borderRadius: 8,
      border: "1.5px solid " + ((CUEL_EC[detalle.estatus] || {}).bg || "#e0e0e0"),
      background: (CUEL_EC[detalle.estatus] || {}).bg || "#f5f5f5",
      color: (CUEL_EC[detalle.estatus] || {}).fg || "#333",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      outline: "none"
    }
  }, CUEL_E.map(e => /*#__PURE__*/React.createElement("option", {
    key: e
  }, e)))), [["Cliente", detalle.cliente], ["Teléfono", detalle.telefono], detalle.confRef ? ["Ref. confección", "#" + detalle.confRef] : null, ["Cantidad", detalle.cantidad + " prenda" + (parseInt(detalle.cantidad) !== 1 ? "s" : "")], ["Material", (detalle.material || "") + (detalle.calibre ? " · " + detalle.calibre : "")], (detalle.cuello || {}).activa ? ["🔵 Cuello", "Largo " + (detalle.cuello.largo || "—") + "cm · Ancho " + (detalle.cuello.ancho || "—") + "cm" + (detalle.cuello.colores ? " · " + detalle.cuello.colores : "")] : null, (detalle.puno || {}).activa ? ["🟡 Puño", "Largo " + (detalle.puno.largo || "—") + "cm · Ancho " + (detalle.puno.ancho || "—") + "cm" + (detalle.puno.colores ? " · " + detalle.puno.colores : "")] : null, (detalle.banda || {}).activa ? ["🟢 Banda", "Largo " + (detalle.banda.largo || "—") + "cm · Ancho " + (detalle.banda.ancho || "—") + "cm" + (detalle.banda.colores ? " · " + detalle.banda.colores : "")] : null, !detalle.cuello && detalle.tipoCuello ? ["Tipo", detalle.tipoCuello] : null, detalle.descripcion ? ["Diseño/instrucciones", detalle.descripcion] : null, esAdmin ? ["Precio total", detalle.precioT ? fmt$C(detalle.precioT) : "—"] : null, esAdmin ? ["Abonado", fmt$C((detalle.abonos || []).length > 0 ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0) : parseFloat(detalle.anticipo || 0))] : null, esAdmin ? ["Saldo", fmt$C(parseFloat(detalle.precioT || 0) - ((detalle.abonos || []).length > 0 ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0) : parseFloat(detalle.anticipo || 0)))] : null, ["Fecha entrega", detalle.fechaEntrega], ["Notas", detalle.notas]].filter(Boolean).map(([k, v]) => !v ? null : /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "7px 0",
      borderBottom: "1px solid #f5f5f5",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#aaa",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#333",
      textAlign: "right",
      fontWeight: 600
    }
  }, v))), (detalle.personas || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#1A5276",
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "\uD83D\uDC65 Beneficiarios"), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#EBF5FB"
    }
  }, ["#", "Nombre", "Cargo", "Gafete", "Talla"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "5px 8px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 700,
      color: "#1A5276"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, (detalle.personas || []).map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: "1px solid #f0f8ff",
      background: i % 2 === 0 ? "#fff" : "#f8fcff"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      color: "#aaa"
    }
  }, i + 1), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      fontWeight: 700
    }
  }, p.nombre || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      color: "#555"
    }
  }, p.cargo || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      textAlign: "center"
    }
  }, p.gafete || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      textAlign: "center"
    }
  }, p.talla ? /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#B85C00",
      color: "#fff",
      borderRadius: 10,
      padding: "2px 8px",
      fontWeight: 700,
      fontSize: 11
    }
  }, p.talla) : "—")))))), detalle.linkDrive && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: detalle.linkDrive,
    target: "_blank",
    rel: "noreferrer",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "7px 14px",
      background: "#E8F5E9",
      color: "#155724",
      borderRadius: 8,
      fontWeight: 700,
      fontSize: 12,
      textDecoration: "none",
      border: "1px solid #8BC34A"
    }
  }, "\uD83D\uDCC1 Abrir archivo de dise\xF1o en Drive")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => exportarPedidoPDF(detalle, "cuello"),
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "none",
      background: "#1D6A3A",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12
    }
  }, "\uD83D\uDCC4 PDF"), esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirm(detalle.id),
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1.5px solid #fdd",
      background: "#fff8f8",
      color: "#DC3545",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13
    }
  }, "\uD83D\uDDD1\uFE0F"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(detalle);
      setDetalle(null);
    },
    style: {
      padding: "8px 16px",
      borderRadius: 8,
      border: "none",
      background: "#B85C00",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13
    }
  }, "\u270F\uFE0F Editar"))), confirm && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 28,
      maxWidth: 340,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 8
    }
  }, "\uD83D\uDDD1\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      color: "#B85C00"
    }
  }, "\xBFEliminar cuello?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: "0 0 16px"
    }
  }, "Esta acci\xF3n no se puede deshacer."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirm(null),
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => eliminar(confirm),
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "none",
      background: "#E63946",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700
    }
  }, "S\xED, eliminar")))));
}
function CuelloModal({
  initial,
  esAdmin,
  onSave,
  onCancel,
  pedidosConf,
  clientes = []
}) {
  const piezaBase = (activa = true) => ({
    activa,
    largo: "",
    ancho: "",
    colores: ""
  });
  const def = {
    cliente: "",
    telefono: "",
    confRef: "",
    cantidad: "1",
    cuello: piezaBase(true),
    puno: piezaBase(false),
    banda: piezaBase(false),
    material: "Acrílico",
    calibre: "Medio",
    linkDrive: "",
    linkDriveId: "",
    descripcion: "",
    precioU: "",
    precioT: "",
    anticipo: "",
    fechaEntrega: "",
    estatus: "Tomado",
    notas: ""
  };
  const [f, setF] = useState({
    ...def,
    ...(initial || {}),
    cuello: (initial || {}).cuello || piezaBase(true),
    puno: (initial || {}).puno || piezaBase(false),
    banda: (initial || {}).banda || piezaBase(false),
    abonos: (initial || {}).abonos || []
  });
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const setPza = (pza, k, v) => setF(p => ({
    ...p,
    [pza]: {
      ...p[pza],
      [k]: v
    }
  }));
  const [sugsC, setSugsC] = useState([]);
  const [showSugsC, setShowSugsC] = useState(false);
  const [subiendoArch, setSubiendoArch] = useState(false);
  const archRef = React.useRef();
  function buscarClientesCuel(q) {
    if (!q || q.length < 2) {
      setSugsC([]);
      return;
    }
    const vistos = new Set();
    setSugsC(clientes.filter(cl => cl.nombre && cl.nombre.toLowerCase().includes(q.toLowerCase())).filter(cl => {
      if (vistos.has(cl.nombre)) return false;
      vistos.add(cl.nombre);
      return true;
    }).slice(0, 5));
  }
  const buscarClientesCuelDebounced = useDebouncedCallback(buscarClientesCuel, 200);
  const subirArchivo = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoArch(true);
    const res = await subirEmbADrive(file, f.cliente, null);
    setSubiendoArch(false);
    if (res.ok) {
      set("linkDrive", res.url);
      set("linkDriveId", res.id);
    }
    e.target.value = "";
  };
  const calcTotal = (pu, cant) => {
    const t = parseFloat(pu || 0) * parseInt(cant || 1);
    if (t > 0) set("precioT", t.toFixed(2));
  };
  const MATS = ["Acrílico", "Algodón", "Poliéster", "Lana", "Mezcla algodón-poliéster", "Otro"];
  const CALS = ["Fino", "Medio", "Grueso"];
  const INPS = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid #e0e0e0",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    background: "#FAFAF8"
  };
  const LBL = {
    fontSize: 10,
    fontWeight: 700,
    color: "#666",
    marginBottom: 3,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: .3
  };
  const SEC = (col = "#B85C00") => ({
    fontSize: 10,
    fontWeight: 800,
    color: col,
    textTransform: "uppercase",
    letterSpacing: 1,
    margin: "14px 0 8px",
    borderBottom: "2px solid " + col + "33",
    paddingBottom: 3
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 150
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: "16px 16px 0 0",
      padding: 16,
      width: "100%",
      maxWidth: 580,
      maxHeight: "92vh",
      overflowY: "auto",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 15,
      color: "#B85C00",
      fontFamily: "Georgia,serif",
      fontWeight: 800
    }
  }, initial ? "✏️ Editar tejido" : "🧶 Nuevo pedido de tejido"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      background: "none",
      border: "none",
      fontSize: 22,
      cursor: "pointer",
      color: "#aaa"
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: SEC("#B85C00")
  }, "\uD83D\uDC64 Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Nombre *"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.cliente,
    placeholder: "Nombre o empresa",
    onChange: e => {
      set("cliente", e.target.value);
      buscarClientesCuelDebounced(e.target.value);
      setShowSugsC(true);
    },
    onBlur: () => setTimeout(() => setShowSugsC(false), 150)
  }), showSugsC && sugsC.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      background: "#fff",
      border: "1.5px solid #e0e0e0",
      borderRadius: 8,
      zIndex: 50,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
    }
  }, sugsC.map((sg, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => {
      set("cliente", sg.nombre);
      if (sg.telefono) set("telefono", sg.telefono);
      setShowSugsC(false);
    },
    style: {
      padding: "9px 12px",
      cursor: "pointer",
      borderBottom: "1px solid #f5f5f5",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#B85C00"
    }
  }, sg.nombre), sg.telefono && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, "\uD83D\uDCF1 ", sg.telefono))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Tel\xE9fono"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.telefono,
    placeholder: "Para avisar",
    onChange: e => set("telefono", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Cantidad de prendas *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    style: INPS,
    value: f.cantidad,
    onChange: e => {
      set("cantidad", e.target.value);
      calcTotal(f.precioU, e.target.value);
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "\xBFViene de pedido de confecci\xF3n?"), /*#__PURE__*/React.createElement(BuscadorConfRef, {
    pedidosConf: (pedidosConf || []).filter(p => !["Entregado", "Cancelado"].includes(p.estatus)),
    value: f.confRef,
    soloConBordado: false,
    color: "#B85C00",
    colorBg: "#FFF4E6",
    colorBorder: "#FFCC80",
    onChange: (val, ped) => {
      set("confRef", val);
      if (ped && !f.cliente) {
        set("cliente", ped.cliente);
        set("telefono", ped.telefono || "");
      }
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: SEC("#6D4C41")
  }, "\uD83E\uDDF5 Material"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Material / Hilo"), /*#__PURE__*/React.createElement("select", {
    style: INPS,
    value: f.material,
    onChange: e => set("material", e.target.value)
  }, MATS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m
  }, m)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Calibre"), /*#__PURE__*/React.createElement("select", {
    style: INPS,
    value: f.calibre,
    onChange: e => set("calibre", e.target.value)
  }, CALS.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c))))), /*#__PURE__*/React.createElement("div", {
    style: SEC("#B85C00")
  }, "\uD83E\uDDF6 Piezas a tejer"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid " + ((f.cuello || {}).activa ? "#1A527655" : "#e0e0e0"),
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setF(p => ({
      ...p,
      cuello: {
        ...(p.cuello || {}),
        activa: !(p.cuello || {}).activa
      }
    })),
    style: {
      width: "100%",
      padding: "10px 14px",
      border: "none",
      cursor: "pointer",
      background: (f.cuello || {}).activa ? "#1A527611" : "#fafafa",
      display: "flex",
      alignItems: "center",
      gap: 10,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\uD83D\uDD35"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 700,
      color: (f.cuello || {}).activa ? "#1A5276" : "#aaa"
    }
  }, "Cuello"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      background: (f.cuello || {}).activa ? "#1A5276" : "#e0e0e0",
      color: "#fff",
      borderRadius: 20,
      padding: "2px 10px",
      fontWeight: 700
    }
  }, (f.cuello || {}).activa ? "✅ Incluye" : "No incluye")), (f.cuello || {}).activa && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: "#fff",
      borderTop: "1px solid #1A527622"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Largo (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: (f.cuello || {}).largo || "",
    onChange: e => setF(p => ({
      ...p,
      cuello: {
        ...p.cuello,
        largo: e.target.value
      }
    })),
    placeholder: "Ej: 4"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Ancho (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: (f.cuello || {}).ancho || "",
    onChange: e => setF(p => ({
      ...p,
      cuello: {
        ...p.cuello,
        ancho: e.target.value
      }
    })),
    placeholder: "Ej: 2.5"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Color(es) del hilo"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: (f.cuello || {}).colores || "",
    onChange: e => setF(p => ({
      ...p,
      cuello: {
        ...p.cuello,
        colores: e.target.value
      }
    })),
    placeholder: "Ej: Azul marino, Blanco"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid " + ((f.puno || {}).activa ? "#B85C0055" : "#e0e0e0"),
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setF(p => ({
      ...p,
      puno: {
        ...(p.puno || {}),
        activa: !(p.puno || {}).activa
      }
    })),
    style: {
      width: "100%",
      padding: "10px 14px",
      border: "none",
      cursor: "pointer",
      background: (f.puno || {}).activa ? "#B85C0011" : "#fafafa",
      display: "flex",
      alignItems: "center",
      gap: 10,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\uD83D\uDFE1"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 700,
      color: (f.puno || {}).activa ? "#B85C00" : "#aaa"
    }
  }, "Pu\xF1o"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      background: (f.puno || {}).activa ? "#B85C00" : "#e0e0e0",
      color: "#fff",
      borderRadius: 20,
      padding: "2px 10px",
      fontWeight: 700
    }
  }, (f.puno || {}).activa ? "✅ Incluye" : "No incluye")), (f.puno || {}).activa && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: "#fff",
      borderTop: "1px solid #B85C0022"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Largo (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: (f.puno || {}).largo || "",
    onChange: e => setF(p => ({
      ...p,
      puno: {
        ...p.puno,
        largo: e.target.value
      }
    })),
    placeholder: "Ej: 3"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Ancho (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: (f.puno || {}).ancho || "",
    onChange: e => setF(p => ({
      ...p,
      puno: {
        ...p.puno,
        ancho: e.target.value
      }
    })),
    placeholder: "Ej: 2"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Color(es) del hilo"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: (f.puno || {}).colores || "",
    onChange: e => setF(p => ({
      ...p,
      puno: {
        ...p.puno,
        colores: e.target.value
      }
    })),
    placeholder: "Ej: Azul marino, Blanco"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid " + ((f.banda || {}).activa ? "#1A5F5A55" : "#e0e0e0"),
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setF(p => ({
      ...p,
      banda: {
        ...(p.banda || {}),
        activa: !(p.banda || {}).activa
      }
    })),
    style: {
      width: "100%",
      padding: "10px 14px",
      border: "none",
      cursor: "pointer",
      background: (f.banda || {}).activa ? "#1A5F5A11" : "#fafafa",
      display: "flex",
      alignItems: "center",
      gap: 10,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\uD83D\uDFE2"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 700,
      color: (f.banda || {}).activa ? "#1A5F5A" : "#aaa"
    }
  }, "Banda / Cin\xF3n"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      background: (f.banda || {}).activa ? "#1A5F5A" : "#e0e0e0",
      color: "#fff",
      borderRadius: 20,
      padding: "2px 10px",
      fontWeight: 700
    }
  }, (f.banda || {}).activa ? "✅ Incluye" : "No incluye")), (f.banda || {}).activa && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: "#fff",
      borderTop: "1px solid #1A5F5A22"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Largo (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: (f.banda || {}).largo || "",
    onChange: e => setF(p => ({
      ...p,
      banda: {
        ...p.banda,
        largo: e.target.value
      }
    })),
    placeholder: "Ej: 5"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Ancho (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: (f.banda || {}).ancho || "",
    onChange: e => setF(p => ({
      ...p,
      banda: {
        ...p.banda,
        ancho: e.target.value
      }
    })),
    placeholder: "Ej: 3"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Color(es) del hilo"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: (f.banda || {}).colores || "",
    onChange: e => setF(p => ({
      ...p,
      banda: {
        ...p.banda,
        colores: e.target.value
      }
    })),
    placeholder: "Ej: Azul marino, Blanco"
  })))), /*#__PURE__*/React.createElement("div", {
    style: SEC("#6B2D8B")
  }, "\uD83D\uDCC1 Archivo de dise\xF1o"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    ref: archRef,
    style: {
      display: "none"
    },
    accept: ".bmp,.jpg,.jpeg,.png,.pdf,.txt,.sew,.dat",
    onChange: subirArchivo
  }), f.linkDrive ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      background: "#F1FFF4",
      border: "1.5px solid #28A745",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\u2705"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#155724",
      fontSize: 12
    }
  }, "Archivo en Google Drive"), /*#__PURE__*/React.createElement("a", {
    href: f.linkDrive,
    target: "_blank",
    rel: "noreferrer",
    style: {
      fontSize: 11,
      color: "#1A5F5A"
    }
  }, "Abrir en Drive \u2192")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      set("linkDrive", "");
      set("linkDriveId", "");
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#aaa",
      fontSize: 16
    }
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => archRef.current && archRef.current.click(),
    disabled: subiendoArch,
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 8,
      border: "2px dashed #6B2D8B44",
      background: "#FDF0FF",
      color: "#6B2D8B",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, subiendoArch ? "⏳ Subiendo..." : "📁 Subir archivo de diseño"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Descripci\xF3n del dise\xF1o / instrucciones"), /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...INPS,
      resize: "vertical",
      minHeight: 44
    },
    value: f.descripcion,
    placeholder: "Rayas, colores alternos, instrucciones especiales...",
    onChange: e => set("descripcion", e.target.value)
  }))), esAdmin && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: SEC("#27AE60")
  }, "\uD83D\uDCB0 Pago y Entrega"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Precio/prenda ($)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: f.precioU,
    placeholder: "0.00",
    onChange: e => {
      set("precioU", e.target.value);
      calcTotal(e.target.value, f.cantidad);
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Total ($)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: f.precioT,
    placeholder: "0.00",
    onChange: e => set("precioT", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Fecha entrega"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: INPS,
    value: f.fechaEntrega,
    onChange: e => set("fechaEntrega", e.target.value)
  }))), /*#__PURE__*/React.createElement(RegistroAbonos, {
    abonos: f.abonos || [],
    precioTotal: f.precioT,
    onChange: v => {
      set("abonos", v);
      set("anticipo", v.reduce((s, a) => s + parseFloat(a.monto || 0), 0).toFixed(2));
    },
    esAdmin: true
  })), !esAdmin && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Fecha de entrega"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: INPS,
    value: f.fechaEntrega,
    onChange: e => set("fechaEntrega", e.target.value)
  })), !esAdmin && /*#__PURE__*/React.createElement(RegistroAbonos, {
    abonos: f.abonos || [],
    precioTotal: f.precioT,
    onChange: v => {
      set("abonos", v);
      set("anticipo", v.reduce((s, a) => s + parseFloat(a.monto || 0), 0).toFixed(2));
    },
    esAdmin: false
  }), /*#__PURE__*/React.createElement("div", {
    style: SEC("#007BFF")
  }, "\uD83D\uDCCC Estado"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Estatus"), /*#__PURE__*/React.createElement("select", {
    style: INPS,
    value: f.estatus,
    onChange: e => set("estatus", e.target.value)
  }, CUEL_E.map(s => /*#__PURE__*/React.createElement("option", {
    key: s
  }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Notas internas"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.notas,
    placeholder: "Solo para el taller",
    onChange: e => set("notas", e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600,
      color: "#666"
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (!f.cliente) {
        pushToast("Falta el nombre del cliente", "error");
        return;
      }
      if (!f.cuello.activa && !f.puno.activa && !f.banda.activa) {
        pushToast("Seleccioná al menos una pieza: cuello, puño o banda", "error");
        return;
      }
      onSave(f);
    },
    style: {
      padding: "9px 22px",
      borderRadius: 8,
      border: "none",
      background: "#B85C00",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14
    }
  }, "\uD83D\uDCBE Guardar"))));
}
function BuscadorConfRef({
  pedidosConf,
  value,
  onChange,
  soloConBordado,
  color = "#1A5F5A",
  colorBg = "#F1F8E9",
  colorBorder = "#8BC34A"
}) {
  const [busq, setBusq] = useState("");
  const lista = pedidosConf || [];
  const filtrados = busq.trim() ? lista.filter(p => p.cliente.toLowerCase().includes(busq.toLowerCase()) || (p.tipoPrenda || "").toLowerCase().includes(busq.toLowerCase()) || String(p.id).includes(busq)) : lista;
  const seleccionado = lista.find(p => String(p.id) === String(value));
  const INPS2 = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid #e0e0e0",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    background: "#FAFAF8"
  };
  if (lista.length === 0) return /*#__PURE__*/React.createElement("input", {
    style: INPS2,
    value: value,
    placeholder: soloConBordado ? "Sin pedidos activos con bordado — escribe ID manual" : "Sin pedidos activos — escribe ID manual",
    onChange: e => onChange(e.target.value, null)
  });
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("input", {
    style: {
      ...INPS2,
      paddingLeft: 32
    },
    value: busq,
    placeholder: "\uD83D\uDD0D Buscar por nombre, prenda o N\xB0...",
    onChange: e => setBusq(e.target.value)
  }), busq && /*#__PURE__*/React.createElement("button", {
    onClick: () => setBusq(""),
    style: {
      position: "absolute",
      right: 8,
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#aaa",
      fontSize: 16
    }
  }, "\u2715")), busq && filtrados.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid #e0e0e0",
      borderRadius: 8,
      marginTop: 4,
      maxHeight: 200,
      overflowY: "auto",
      background: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      zIndex: 50,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 8px",
      background: "#f9f9f9",
      fontSize: 10,
      fontWeight: 700,
      color: "#aaa",
      textTransform: "uppercase",
      borderBottom: "1px solid #eee"
    }
  }, filtrados.length, " resultado", filtrados.length !== 1 ? "s" : ""), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onChange("", null);
      setBusq("");
    },
    style: {
      width: "100%",
      padding: "8px 12px",
      border: "none",
      borderBottom: "1px solid #eee",
      background: "#fff",
      cursor: "pointer",
      textAlign: "left",
      fontSize: 12,
      color: "#aaa"
    }
  }, "\u2014 Pedido directo (sin vincular)"), filtrados.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    onClick: () => {
      onChange(String(p.id), p);
      setBusq("");
    },
    style: {
      width: "100%",
      padding: "9px 12px",
      border: "none",
      borderBottom: "1px solid #f5f5f5",
      background: String(p.id) === String(value) ? "#f0fff4" : "#fff",
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      color: color,
      marginRight: 6
    }
  }, "N\xB0", String(p.id).padStart(4, "0")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "#222",
      fontSize: 12
    }
  }, p.cliente), p.tipoPrenda && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#888",
      fontSize: 11
    }
  }, " \xB7 ", p.tipoPrenda), p.cantTalla && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#E67E22",
      fontSize: 11,
      fontWeight: 700
    }
  }, " \xB7 ", p.cantTalla)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      background: (EC[p.estatus] || {}).bg || "#eee",
      color: (EC[p.estatus] || {}).fg || "#333",
      padding: "2px 7px",
      borderRadius: 20,
      fontWeight: 700,
      flexShrink: 0,
      marginLeft: 6
    }
  }, p.estatus))), filtrados.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 12px",
      color: "#bbb",
      fontSize: 12,
      textAlign: "center"
    }
  }, "Sin resultados")), seleccionado ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      background: colorBg,
      border: "1px solid " + colorBorder,
      borderRadius: 8,
      padding: "7px 10px",
      fontSize: 11,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: color
    }
  }, "\uD83D\uDD17 Vinculado:"), " ", /*#__PURE__*/React.createElement("strong", null, seleccionado.cliente), " \u2014 ", seleccionado.tipoPrenda, " ", seleccionado.cantTalla ? "· " + seleccionado.cantTalla : ""), /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange("", null),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#aaa",
      fontSize: 14,
      marginLeft: 8
    }
  }, "\u2715")) : !busq && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("select", {
    style: {
      ...INPS2,
      color: value ? "#2C1654" : "#aaa"
    },
    value: value,
    onChange: e => {
      const p = lista.find(x => String(x.id) === e.target.value);
      onChange(e.target.value, p || null);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 Pedido directo (no viene de confecci\xF3n) \u2014"), lista.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: String(p.id)
  }, "N\xB0", String(p.id).padStart(4, "0"), " \u2014 ", p.cliente, " \xB7 ", p.tipoPrenda, p.cantTalla ? " (" + p.cantTalla + ")" : "")))));
}
function exportarExcelMes(pedidos, bordados, cuellos, periodo) {
  const pM = v => {
    const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const todos = [...pedidos.map(p => ({
    ID: "CONF-" + String(p.id).padStart(3, "0"),
    Módulo: "Confección",
    Cliente: p.cliente || "",
    Prenda: p.tipoPrenda || "",
    Telas: p.tela || "",
    "Precio ($)": pM(p.precio),
    "Abonado ($)": (p.abonos || []).length > 0 ? p.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(p.anticipo),
    "Saldo ($)": Math.max(0, pM(p.precio) - ((p.abonos || []).length > 0 ? p.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(p.anticipo))),
    Estatus: p.estatus || "",
    "Fecha pedido": p.fecha || "",
    "Fecha entrega": p.fechaEntrega || "",
    Costurera: p.costurera || "",
    Notas: p.notas || ""
  })), ...bordados.map(b => ({
    ID: "BORD-" + String(b.id).padStart(3, "0"),
    Módulo: "Bordados",
    Cliente: b.cliente || "",
    Prenda: b.diseño || b.soporte || "",
    Telas: b.soporte || "",
    "Precio ($)": pM(b.precioT),
    "Abonado ($)": (b.abonos || []).length > 0 ? b.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(b.anticipo),
    "Saldo ($)": Math.max(0, pM(b.precioT) - ((b.abonos || []).length > 0 ? b.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(b.anticipo))),
    Estatus: b.estatus || "",
    "Fecha pedido": b.fecha || "",
    "Fecha entrega": b.fechaEntrega || "",
    Costurera: "",
    Notas: b.notas || ""
  })), ...cuellos.map(cu => ({
    ID: "CUEL-" + String(cu.id).padStart(3, "0"),
    Módulo: "Cuellos",
    Cliente: cu.cliente || "",
    Prenda: [cu.cuello && cu.cuello.activa ? "Cuello" : "", cu.puno && cu.puno.activa ? "Puño" : "", cu.banda && cu.banda.activa ? "Banda" : ""].filter(Boolean).join("+"),
    Telas: cu.material || "",
    "Precio ($)": pM(cu.precioT),
    "Abonado ($)": (cu.abonos || []).length > 0 ? cu.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(cu.anticipo),
    "Saldo ($)": Math.max(0, pM(cu.precioT) - ((cu.abonos || []).length > 0 ? cu.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(cu.anticipo))),
    Estatus: cu.estatus || "",
    "Fecha pedido": cu.fecha || "",
    "Fecha entrega": cu.fechaEntrega || "",
    Costurera: "",
    Notas: cu.notas || ""
  }))].filter(p => p.Estatus !== "Cancelado");
  const resumenMod = ["Confección", "Bordados", "Cuellos"].map(mod => {
    const lst = todos.filter(p => p["Módulo"] === mod);
    const facturado = lst.reduce((s, p) => s + p["Precio ($)"], 0);
    const cobrado = lst.reduce((s, p) => s + p["Abonado ($)"], 0);
    return {
      Módulo: mod,
      Pedidos: lst.length,
      "Facturado ($)": facturado.toFixed(2),
      "Cobrado ($)": cobrado.toFixed(2),
      "Por cobrar ($)": (facturado - cobrado).toFixed(2)
    };
  });
  resumenMod.push({
    Módulo: "TOTAL",
    Pedidos: todos.length,
    "Facturado ($)": todos.reduce((s, p) => s + p["Precio ($)"], 0).toFixed(2),
    "Cobrado ($)": todos.reduce((s, p) => s + p["Abonado ($)"], 0).toFixed(2),
    "Por cobrar ($)": todos.reduce((s, p) => s + p["Saldo ($)"], 0).toFixed(2)
  });
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(todos);
  ws1["!cols"] = [{
    wch: 12
  }, {
    wch: 12
  }, {
    wch: 22
  }, {
    wch: 20
  }, {
    wch: 14
  }, {
    wch: 11
  }, {
    wch: 11
  }, {
    wch: 11
  }, {
    wch: 14
  }, {
    wch: 13
  }, {
    wch: 13
  }, {
    wch: 14
  }, {
    wch: 30
  }];
  XLSX.utils.book_append_sheet(wb, ws1, "Pedidos");
  const ws2 = XLSX.utils.json_to_sheet(resumenMod);
  ws2["!cols"] = [{
    wch: 14
  }, {
    wch: 10
  }, {
    wch: 14
  }, {
    wch: 14
  }, {
    wch: 14
  }];
  XLSX.utils.book_append_sheet(wb, ws2, "Resumen");
  ["Confección", "Bordados", "Cuellos"].forEach(mod => {
    const lst = todos.filter(p => p["Módulo"] === mod);
    if (lst.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(lst);
    ws["!cols"] = [{
      wch: 12
    }, {
      wch: 12
    }, {
      wch: 22
    }, {
      wch: 20
    }, {
      wch: 14
    }, {
      wch: 11
    }, {
      wch: 11
    }, {
      wch: 11
    }, {
      wch: 14
    }, {
      wch: 13
    }, {
      wch: 13
    }];
    XLSX.utils.book_append_sheet(wb, ws, mod.substring(0, 15));
  });
  const fecha = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `TallerIMIS_${periodo}_${fecha}.xlsx`);
}
function exportarPedidoPDF(pedido, tipo) {
  if (tipo === "confeccion") {
    imprimirRecibo(pedido, true);
  } else {
    const w = window.open("", "_blank", "width=820,height=1100");
    const pM = v => {
      const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
      return isNaN(n) ? 0 : n;
    };
    const abonado = (pedido.abonos || []).length > 0 ? pedido.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(pedido.anticipo);
    const saldo = pM(pedido.precioT) - abonado;
    const idStr = tipo === "bordado" ? "BORD-" + String(pedido.id).padStart(3, "0") : "CUEL-" + String(pedido.id).padStart(3, "0");
    const color = tipo === "bordado" ? "#1A5F5A" : "#B85C00";
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Pedido ${idStr}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 36px;font-size:13px}
      @media print{body{padding:14px 20px}.no-print{display:none!important}@page{margin:10mm;size:A4}}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid ${color}}
      .logo{font-size:22px;font-weight:900;color:${color};font-family:Georgia,serif}
      .id{font-size:28px;font-weight:900;color:${color};font-family:monospace}
      .sec{font-size:10px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid ${color};padding-bottom:4px;margin:16px 0 10px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
      .campo{display:flex;flex-direction:column;padding:8px 10px;background:#f9f9f9;border-radius:7px}
      .campo-lbl{font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;margin-bottom:3px}
      .campo-val{font-size:13px;font-weight:700;color:#222}
      .total-box{background:${color};color:#fff;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:16px}
    </style></head><body>
    <div class="no-print" style="text-align:right;margin-bottom:10px">
      <button onclick="window.print()" style="padding:8px 20px;background:${color};color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:700;font-size:14px">🖨️ Imprimir / Guardar PDF</button>
    </div>
    <div class="header">
      <div><div class="logo">🧵 Taller IMIS</div><div style="font-size:11px;color:#aaa;margin-top:3px">${tipo === "bordado" ? "Bordado" : "Tejido de cuello"}</div></div>
      <div style="text-align:right"><div class="id">${idStr}</div><div style="font-size:11px;color:#aaa;margin-top:3px">${new Date().toLocaleDateString("es-SV")}</div></div>
    </div>
    <div class="sec">👤 Cliente</div>
    <div class="grid">
      <div class="campo"><div class="campo-lbl">Nombre</div><div class="campo-val">${pedido.cliente || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Teléfono</div><div class="campo-val">${pedido.telefono || "—"}</div></div>
    </div>
    <div class="sec">📋 Detalle del pedido</div>
    <div class="grid">
      ${tipo === "bordado" ? `
      <div class="campo"><div class="campo-lbl">Soporte</div><div class="campo-val">${pedido.soporte || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Posición</div><div class="campo-val">${pedido.posicion || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Diseño</div><div class="campo-val">${pedido.diseno || pedido.diseño || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Puntadas est.</div><div class="campo-val">${pedido.puntadas || "—"}</div></div>
      ` : `
      <div class="campo"><div class="campo-lbl">Material</div><div class="campo-val">${pedido.material || "—"}</div></div>
      <div class="campo"><div class="campo-lbl">Calibre</div><div class="campo-val">${pedido.calibre || "—"}</div></div>
      ${pedido.cuello && pedido.cuello.activa ? `<div class="campo"><div class="campo-lbl">Cuello</div><div class="campo-val">Largo ${pedido.cuello.largo || "—"}cm × Ancho ${pedido.cuello.ancho || "—"}cm</div></div>` : ""}
      ${pedido.puno && pedido.puno.activa ? `<div class="campo"><div class="campo-lbl">Puño</div><div class="campo-val">Largo ${pedido.puno.largo || "—"}cm × Ancho ${pedido.puno.ancho || "—"}cm</div></div>` : ""}
      `}
      <div class="campo"><div class="campo-lbl">Cantidad</div><div class="campo-val">${pedido.cantidad || "1"} pieza(s)</div></div>
      <div class="campo"><div class="campo-lbl">Fecha entrega</div><div class="campo-val">${pedido.fechaEntrega || "—"}</div></div>
    </div>
    ${saldo >= 0 ? `<div class="sec">💰 Pago</div>
    <div class="total-box">
      <div><div style="font-size:11px;opacity:.8">Precio total</div><div style="font-size:24px;font-weight:900">$${pM(pedido.precioT).toFixed(2)}</div></div>
      <div style="text-align:right"><div style="font-size:11px;opacity:.8">Saldo pendiente</div><div style="font-size:24px;font-weight:900">$${saldo.toFixed(2)}</div></div>
    </div>` : ""}
    ${pedido.notas ? `<div class="sec">📝 Notas</div><p style="font-size:12px;color:#555;padding:8px 10px;background:#f9f9f9;border-radius:7px">${pedido.notas}</p>` : ""}
    </body></html>`);
    w.document.close();
  }
}
function SeccionEstadisticas({
  pedidos,
  bordados,
  cuellos,
  clientes
}) {
  const [periodo, setPeriodo] = useState("mes"); // mes | trimestre | año | todo

  const ahora = new Date();
  const hoyStr = ahora.toISOString().split("T")[0];
  function rangoFechas() {
    const d = new Date();
    if (periodo === "mes") {
      d.setDate(1);
    } else if (periodo === "trimestre") {
      d.setMonth(d.getMonth() - 2);
      d.setDate(1);
    } else if (periodo === "año") {
      d.setMonth(0);
      d.setDate(1);
    } else return null; // todo
    return d.toISOString().split("T")[0];
  }
  const desde = rangoFechas();
  const todos = [...(() => {
    const pM = v => {
      const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
      return isNaN(n) ? 0 : n;
    };
    const cobradoConf = p => (p.abonos || []).length > 0 ? (p.abonos || []).reduce((s, a) => s + pM(a.monto), 0) : pM(p.anticipo);
    return [...pedidos.map(p => ({
      ...p,
      modulo: "Confección",
      monto: pM(p.precio),
      cobrado: cobradoConf(p)
    })), ...bordados.map(b => ({
      ...b,
      modulo: "Bordados",
      monto: pM(b.precioT),
      cobrado: (b.abonos || []).length > 0 ? b.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(b.anticipo)
    })), ...cuellos.map(c => ({
      ...c,
      modulo: "Cuellos",
      monto: pM(c.precioT),
      cobrado: (c.abonos || []).length > 0 ? c.abonos.reduce((s, a) => s + pM(a.monto), 0) : pM(c.anticipo)
    }))];
  })()];
  const enPeriodo = todos.filter(p => {
    if (!desde) return true;
    const f = (p.fecha || "").trim() || (p.fechaEntrega || "").trim();
    if (!f) return true; // sin fecha → siempre incluir
    return f >= desde;
  });
  const noCancel = enPeriodo.filter(p => p.estatus !== "Cancelado");
  const totalFacturado = noCancel.reduce((s, p) => s + p.monto, 0);
  const totalCobrado = noCancel.reduce((s, p) => s + p.cobrado, 0);
  const totalPendiente = noCancel.reduce((s, p) => s + Math.max(0, p.monto - p.cobrado), 0);
  const totalEntregado = noCancel.filter(p => p.estatus === "Entregado").reduce((s, p) => s + p.monto, 0);
  const activosN = noCancel.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).length;
  const entregadosN = noCancel.filter(p => p.estatus === "Entregado").length;
  const porModulo = ["Confección", "Bordados", "Cuellos"].map(mod => {
    const lst = noCancel.filter(p => p.modulo === mod);
    return {
      mod,
      n: lst.length,
      monto: lst.reduce((s, p) => s + p.monto, 0),
      cobrado: lst.reduce((s, p) => s + p.cobrado, 0),
      activos: lst.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).length
    };
  });
  const mapaClientes = {};
  noCancel.forEach(p => {
    const k = (p.cliente || "Sin nombre").trim();
    if (!mapaClientes[k]) mapaClientes[k] = {
      nombre: k,
      n: 0,
      monto: 0,
      cobrado: 0
    };
    mapaClientes[k].n++;
    mapaClientes[k].monto += p.monto;
    mapaClientes[k].cobrado += p.cobrado;
  });
  const topClientes = Object.values(mapaClientes).sort((a, b) => b.monto - a.monto).slice(0, 6);
  const porEstatus = {};
  todos.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).forEach(p => {
    porEstatus[p.estatus] = (porEstatus[p.estatus] || 0) + 1;
  });
  const proxEntregas = todos.filter(p => p.fechaEntrega && !["Entregado", "Cancelado"].includes(p.estatus) && p.monto > 0).map(p => ({
    ...p,
    saldo: Math.max(0, p.monto - p.cobrado),
    dias: Math.ceil((new Date(p.fechaEntrega + "T12:00") - ahora) / 86400000)
  })).sort((a, b) => a.dias - b.dias).slice(0, 8);
  const totalFlujoProy = proxEntregas.reduce((s, p) => s + p.saldo, 0);
  const meses = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    const ini = d.toISOString().split("T")[0];
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    const lst = todos.filter(p => {
      if (p.estatus === "Cancelado") return false;
      const f = (p.fecha || "").trim() || (p.fechaEntrega || "").trim();
      return f >= ini && f <= fin;
    });
    const lbl = d.toLocaleDateString("es-SV", {
      month: "short",
      year: "2-digit"
    });
    meses.push({
      lbl,
      monto: lst.reduce((s, p) => s + p.monto, 0),
      n: lst.length
    });
  }
  const maxMonto = Math.max(...meses.map(m => m.monto), 1);
  const COLORS = {
    Confección: "#9B59B6",
    Bordados: "#1A5F5A",
    Cuellos: "#B85C00"
  };
  const fmtM = n => "$" + parseFloat(n || 0).toLocaleString("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      padding: 16,
      background: "#F7F4FA"
    },
    className: "main-area"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 17,
      color: "#2C1654",
      fontWeight: 800,
      fontFamily: "Georgia,serif"
    }
  }, "\uD83D\uDCCA Estad\xEDsticas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, "Resumen financiero y operativo \xB7 Taller IMIS")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      background: "#fff",
      borderRadius: 10,
      padding: 4,
      border: "1.5px solid #e0e0e0"
    }
  }, [["mes", "Este mes"], ["trimestre", "3 meses"], ["año", "Este año"], ["todo", "Todo"]].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setPeriodo(v),
    style: {
      padding: "6px 12px",
      borderRadius: 7,
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      background: periodo === v ? "#2C1654" : "transparent",
      color: periodo === v ? "#fff" : "#888",
      transition: "all .15s"
    }
  }, l))), /*#__PURE__*/React.createElement("button", {
    onClick: () => exportarExcelMes(pedidos, bordados, cuellos, periodo),
    style: {
      padding: "8px 14px",
      borderRadius: 8,
      border: "none",
      background: "#1D6A3A",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexShrink: 0
    }
  }, "\uD83D\uDCE5 Excel")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
      gap: 10,
      marginBottom: 16
    }
  }, [{
    icon: "💰",
    label: "Facturado",
    val: fmtM(totalFacturado),
    color: "#2C1654",
    bg: "#f0ebff"
  }, {
    icon: "✅",
    label: "Cobrado",
    val: fmtM(totalCobrado),
    color: "#155724",
    bg: "#d4edda"
  }, {
    icon: "⏳",
    label: "Por cobrar",
    val: fmtM(totalPendiente),
    color: totalPendiente > 0 ? "#721C24" : "#155724",
    bg: totalPendiente > 0 ? "#f8d7da" : "#d4edda"
  }, {
    icon: "📦",
    label: "Activos",
    val: activosN,
    color: "#E67E22",
    bg: "#fff3e0"
  }, {
    icon: "🎯",
    label: "Entregados",
    val: entregadosN,
    color: "#1A5276",
    bg: "#e8f4fd"
  }].map(k => /*#__PURE__*/React.createElement("div", {
    key: k.label,
    style: {
      background: k.bg,
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid " + k.color + "22"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      marginBottom: 4
    }
  }, k.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 900,
      color: k.color,
      lineHeight: 1
    }
  }, k.val), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: k.color,
      opacity: .7,
      textTransform: "uppercase",
      marginTop: 4
    }
  }, k.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    },
    className: "g2"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      border: "1.5px solid #f0f0f0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "#2C1654",
      marginBottom: 14
    }
  }, "\uD83D\uDCC8 Tendencia mensual (facturaci\xF3n)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 8,
      height: 90
    }
  }, meses.map((m, i) => {
    const pct = maxMonto > 0 ? m.monto / maxMonto * 100 : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#2C1654",
        fontWeight: 700
      }
    }, m.monto > 0 ? fmtM(m.monto) : ""), /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        background: "linear-gradient(180deg,#9B59B6,#2C1654)",
        borderRadius: "4px 4px 0 0",
        height: Math.max(pct * 0.7, 4) + "%",
        minHeight: 4,
        transition: "height .3s"
      },
      title: fmtM(m.monto)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa",
        fontWeight: 700
      }
    }, m.lbl), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#ccc"
      }
    }, m.n, " ped."));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      border: "1.5px solid #f0f0f0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "#2C1654",
      marginBottom: 12
    }
  }, "\uD83D\uDDC2\uFE0F Por m\xF3dulo"), porModulo.map(m => {
    const pct = totalFacturado > 0 ? m.monto / totalFacturado * 100 : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: m.mod,
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: COLORS[m.mod]
      }
    }, m.mod), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#555"
      }
    }, fmtM(m.monto), " \xB7 ", m.n, " pedido", m.n !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0f0f0",
        borderRadius: 6,
        height: 8,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + "%",
        background: COLORS[m.mod],
        height: "100%",
        borderRadius: 6,
        transition: "width .4s"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa",
        marginTop: 2
      }
    }, m.activos > 0 ? `${m.activos} activo${m.activos !== 1 ? "s" : ""} · ` : "", "Cobrado: ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: "#27AE60"
      }
    }, fmtM(m.cobrado))));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    },
    className: "g2"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      border: "1.5px solid #f0f0f0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "#2C1654"
    }
  }, "\uD83D\uDCB8 Flujo proyectado"), totalFlujoProy > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 900,
      color: "#E67E22"
    }
  }, fmtM(totalFlujoProy))), proxEntregas.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "#ccc",
      fontSize: 12,
      padding: 20
    }
  }, "Sin entregas pr\xF3ximas con saldo") : proxEntregas.map((p, i) => {
    const dc = p.dias < 0 ? "#F8D7DA" : p.dias <= 3 ? "#FFF3CD" : "#f8f8f8";
    const fc = p.dias < 0 ? "#721C24" : p.dias <= 3 ? "#856404" : "#555";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 0",
        borderBottom: "1px solid #f5f5f5"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: dc,
        borderRadius: 6,
        padding: "2px 7px",
        fontSize: 10,
        fontWeight: 700,
        color: fc,
        minWidth: 52,
        textAlign: "center",
        flexShrink: 0
      }
    }, p.dias < 0 ? `-${Math.abs(p.dias)}d` : p.dias === 0 ? "Hoy" : p.dias + "d"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#2C1654",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, p.cliente), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, p.modulo, " \xB7 ", p.fechaEntrega)), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: "#E63946"
      }
    }, fmtM(p.saldo)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#aaa"
      }
    }, "por cobrar")));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      border: "1.5px solid #f0f0f0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "#2C1654",
      marginBottom: 12
    }
  }, "\uD83C\uDFC6 Top clientes"), topClientes.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "#ccc",
      fontSize: 12,
      padding: 20
    }
  }, "Sin datos") : topClientes.map((cli, i) => {
    const saldo = cli.monto - cli.cobrado;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 0",
        borderBottom: "1px solid #f5f5f5"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 900,
        color: i < 3 ? "#fff" : "#aaa",
        flexShrink: 0
      }
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#2C1654",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, cli.nombre), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa"
      }
    }, cli.n, " pedido", cli.n !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: "#2C1654"
      }
    }, fmtM(cli.monto)), saldo > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#E63946",
        fontWeight: 700
      }
    }, "Debe ", fmtM(saldo))));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      border: "1.5px solid #f0f0f0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "#2C1654",
      marginBottom: 12
    }
  }, "\uD83D\uDD04 Pipeline actual (pedidos activos)"), Object.keys(porEstatus).length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "#ccc",
      fontSize: 12,
      padding: 12
    }
  }, "Sin pedidos activos") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, Object.entries(porEstatus).sort((a, b) => b[1] - a[1]).map(([est, n]) => {
    const col = {
      ...EC,
      ...BORD_EC,
      ...CUEL_EC
    }[est] || {
      bg: "#eee",
      fg: "#555"
    };
    return /*#__PURE__*/React.createElement("div", {
      key: est,
      style: {
        background: col.bg,
        borderRadius: 20,
        padding: "6px 14px",
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: col.fg
      }
    }, n), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: col.fg
      }
    }, est));
  }))));
}
const CATALOGO_BASE = [{
  id: 1,
  nombre: "Filipina",
  icono: "👔",
  telas: ["Dacrón", "Dacrón con lycra"],
  colores: ["Blanco", "Azul marino", "Celeste", "Gris", "Negro"],
  modoDefault: "tallas",
  requiereMedidas: false,
  requiereCuello: false,
  camposExtra: [],
  tiempoEst: 3,
  precioBase: null,
  preciosPorTalla: {
    XS: null,
    S: null,
    M: null,
    L: null,
    XL: null,
    "2XL": null,
    "3XL": null
  },
  notas: "Confección estándar. Tela dacrón, botones plásticos."
}, {
  id: 2,
  nombre: "Camisa polo",
  icono: "👕",
  telas: ["Dacrón polo", "Piqué", "Jersey"],
  colores: ["Blanco", "Negro", "Azul marino", "Rojo", "Verde"],
  modoDefault: "tallas",
  requiereMedidas: false,
  requiereCuello: true,
  camposExtra: ["colorCuello", "materialCuello"],
  tiempoEst: 3,
  precioBase: null,
  preciosPorTalla: {
    XS: null,
    S: null,
    M: null,
    L: null,
    XL: null,
    "2XL": null,
    "3XL": null
  },
  notas: "Incluye cuello tejido. Coordinar con módulo Cuellos."
}, {
  id: 3,
  nombre: "Vestido",
  icono: "👗",
  telas: ["Dacrón", "Satín", "Lino", "Gasa", "Tafeta"],
  colores: ["Blanco", "Negro", "Azul", "Rojo", "Dorado", "Plateado"],
  modoDefault: "lista",
  requiereMedidas: true,
  requiereCuello: false,
  camposExtra: ["ocasion"],
  tiempoEst: 5,
  precioBase: null,
  preciosPorTalla: {},
  notas: "Requiere medidas. Confirmar diseño antes de cortar."
}, {
  id: 4,
  nombre: "Pantalón / Falda",
  icono: "👖",
  telas: ["Dacrón", "Gabardina", "Lino", "Dril"],
  colores: ["Negro", "Azul marino", "Gris", "Café", "Beige"],
  modoDefault: "tallas",
  requiereMedidas: false,
  requiereCuello: false,
  camposExtra: [],
  tiempoEst: 2,
  precioBase: null,
  preciosPorTalla: {
    XS: null,
    S: null,
    M: null,
    L: null,
    XL: null,
    "2XL": null,
    "3XL": null
  },
  notas: ""
}, {
  id: 5,
  nombre: "Traje / Conjunto",
  icono: "🤵",
  telas: ["Dacrón", "Gabardina", "Lino"],
  colores: ["Negro", "Azul marino", "Gris", "Café"],
  modoDefault: "lista",
  requiereMedidas: true,
  requiereCuello: false,
  camposExtra: ["piezas"],
  tiempoEst: 7,
  precioBase: null,
  preciosPorTalla: {},
  notas: "Especificar piezas del conjunto (saco, pantalón, falda, blusa)."
}, {
  id: 6,
  nombre: "Uniforme deportivo",
  icono: "⚽",
  telas: ["Dry-fit", "Lycra", "Jersey deportivo"],
  colores: ["Blanco", "Negro", "Azul", "Rojo", "Verde", "Amarillo"],
  modoDefault: "tallas",
  requiereMedidas: false,
  requiereCuello: false,
  camposExtra: ["numeroDorsal", "nombreDorsal"],
  tiempoEst: 2,
  precioBase: null,
  preciosPorTalla: {
    XS: null,
    S: null,
    M: null,
    L: null,
    XL: null,
    "2XL": null,
    "3XL": null
  },
  notas: "Confirmar si lleva número/nombre en espalda (bordado o sublimado)."
}, {
  id: 7,
  nombre: "Prenda a la medida",
  icono: "✂️",
  telas: ["Según diseño"],
  colores: ["Según diseño"],
  modoDefault: "lista",
  requiereMedidas: true,
  requiereCuello: false,
  camposExtra: ["diseñoCliente"],
  tiempoEst: 6,
  precioBase: null,
  preciosPorTalla: {},
  notas: "Diseño personalizado. Requiere aprobación de muestra antes de producción."
}, {
  id: 8,
  nombre: "Arreglo / Reparación",
  icono: "🪡",
  telas: [],
  colores: [],
  modoDefault: "tallas",
  requiereMedidas: false,
  requiereCuello: false,
  camposExtra: ["descripcionArreglo"],
  tiempoEst: 1,
  precioBase: null,
  preciosPorTalla: {},
  notas: "Describir el arreglo específico en la descripción del pedido."
}];
async function gsCatalogoLeer() {
  try {
    const r = await fetchConTimeout(SCRIPT_URL + "?action=getCatalogo");
    const d = await r.json();
    return d.catalogo && d.catalogo.length > 0 ? d.catalogo : CATALOGO_BASE;
  } catch {
    return CATALOGO_BASE;
  }
}
async function gsCatalogoGuardar(lista) {
  try {
    await fetchConTimeout(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify({
        action: "saveCatalogo",
        data: lista
      })
    });
  } catch (e) {
    console.error("gsCatalogoGuardar:", e);
    pushToast("No pude guardar el catálogo en el servidor", "error");
  }
}
function SeccionCatalogo({
  catalogo,
  setCatalogo,
  esAdmin
}) {
  const [modal, setModal] = useState(null); // null | "nuevo" | producto
  const [detalle, setDet] = useState(null);
  function guardar(form) {
    const isNuevo = modal === "nuevo";
    const id = isNuevo ? catalogo.length ? Math.max(...catalogo.map(c => c.id || 0)) + 1 : 1 : modal.id;
    const prod = {
      ...form,
      id
    };
    const nueva = isNuevo ? [...catalogo, prod] : catalogo.map(p => p.id === id ? prod : p);
    setCatalogo(nueva);
    gsCatalogoGuardar(nueva);
    setModal(null);
  }
  async function eliminar(id) {
    if (!await pushConfirm({
      titulo: "Eliminar producto",
      msg: "¿Eliminar este producto del catálogo? Esta acción no se puede deshacer.",
      okLabel: "Eliminar",
      danger: true
    })) return;
    const nueva = catalogo.filter(p => p.id !== id);
    setCatalogo(nueva);
    gsCatalogoGuardar(nueva);
    setDet(null);
  }
  const fmtT = n => n ? `${n} día${n !== 1 ? "s" : ""}` : "-";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      background: "#fff",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "#2C1654",
      fontWeight: 800,
      fontFamily: "Georgia,serif"
    }
  }, "\uD83E\uDDF5 Cat\xE1logo de productos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, catalogo.length, " tipo", catalogo.length !== 1 ? "s" : "", " de prenda")), esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal("nuevo"),
    style: {
      padding: "9px 14px",
      borderRadius: 8,
      border: "none",
      background: "#2C1654",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13
    }
  }, "+ Nuevo tipo")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
      gap: 12
    }
  }, catalogo.map(prod => /*#__PURE__*/React.createElement("div", {
    key: prod.id,
    onClick: () => setDet(prod),
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 16,
      border: "1.5px solid #f0f0f0",
      cursor: "pointer",
      transition: "box-shadow .15s"
    },
    onMouseEnter: e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)",
    onMouseLeave: e => e.currentTarget.style.boxShadow = "none"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      lineHeight: 1,
      flexShrink: 0
    }
  }, prod.icono || "✂️"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: "#2C1654"
    }
  }, prod.nombre), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 4,
      flexWrap: "wrap"
    }
  }, prod.requiereMedidas && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      background: "#EBF5FB",
      color: "#1A5276",
      padding: "2px 7px",
      borderRadius: 10,
      fontWeight: 700
    }
  }, "\uD83D\uDCD0 A la medida"), prod.requiereCuello && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      background: "#F3E5F5",
      color: "#6B2D8B",
      padding: "2px 7px",
      borderRadius: 10,
      fontWeight: 700
    }
  }, "\uD83E\uDDF6 Con cuello"), prod.modoDefault === "lista" && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      background: "#FFF3E0",
      color: "#E67E22",
      padding: "2px 7px",
      borderRadius: 10,
      fontWeight: 700
    }
  }, "\uD83D\uDCCB Lista"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      background: "#f0f0f0",
      color: "#888",
      padding: "2px 7px",
      borderRadius: 10,
      fontWeight: 700
    }
  }, "\u23F1 ", fmtT(prod.tiempoEst))))), prod.telas && prod.telas.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#888",
      marginBottom: 6
    }
  }, "\uD83E\uDDF5 ", prod.telas.slice(0, 3).join(", "), prod.telas.length > 3 ? "..." : ""), prod.precioBase && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: "#27AE60"
    }
  }, "Desde $", prod.precioBase), prod.preciosPorTalla && Object.values(prod.preciosPorTalla).some(v => v) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      flexWrap: "wrap",
      marginTop: 4
    }
  }, Object.entries(prod.preciosPorTalla).filter(([, v]) => v).map(([t, p]) => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontSize: 9,
      background: "#f0fff4",
      color: "#155724",
      padding: "2px 6px",
      borderRadius: 8,
      fontWeight: 700
    }
  }, t, ": $", p))), prod.notas && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#aaa",
      marginTop: 6,
      fontStyle: "italic",
      lineHeight: 1.4
    }
  }, prod.notas))))), detalle && /*#__PURE__*/React.createElement(Modal, {
    title: `${detalle.icono || "✂️"} ${detalle.nombre}`,
    onClose: () => setDet(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 8,
      marginBottom: 14
    }
  }, [["Modo de registro", detalle.modoDefault === "lista" ? "📋 Lista de prendas" : "📦 Por tallas"], ["Requiere medidas", detalle.requiereMedidas ? "✅ Sí" : "No"], ["Cuello tejido", detalle.requiereCuello ? "✅ Sí (coordinar con Cuellos)" : "No"], ["Tiempo estimado", fmtT(detalle.tiempoEst)], ["Telas sugeridas", (detalle.telas || []).join(", ") || "—"], ["Colores comunes", (detalle.colores || []).join(", ") || "—"], ["Precio base", detalle.precioBase ? `$${detalle.precioBase}` : "Sin precio base"], ["Notas", detalle.notas || "—"]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "7px 0",
      borderBottom: "1px solid #f5f5f5",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#aaa",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#333",
      textAlign: "right"
    }
  }, v)))), detalle.preciosPorTalla && Object.values(detalle.preciosPorTalla).some(v => v) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, "Precios por talla"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, Object.entries(detalle.preciosPorTalla).filter(([, v]) => v).map(([t, p]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      background: "#f0fff4",
      border: "1px solid #a8d8a8",
      borderRadius: 8,
      padding: "6px 10px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: "#2C1654"
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: "#27AE60"
    }
  }, "$", p))))), esAdmin && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "flex-end",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => eliminar(detalle.id),
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1.5px solid #fdd",
      background: "#fff8f8",
      color: "#DC3545",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12
    }
  }, "\uD83D\uDDD1\uFE0F Eliminar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(detalle);
      setDet(null);
    },
    style: {
      padding: "8px 16px",
      borderRadius: 8,
      border: "none",
      background: "#2C1654",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13
    }
  }, "\u270F\uFE0F Editar"))), modal && /*#__PURE__*/React.createElement(ModalFormProducto, {
    initial: modal !== "nuevo" ? modal : null,
    onSave: guardar,
    onCancel: () => setModal(null)
  }));
}
function ModalFormProducto({
  initial,
  onSave,
  onCancel
}) {
  const def = {
    nombre: "",
    icono: "✂️",
    telas: [],
    colores: [],
    modoDefault: "tallas",
    requiereMedidas: false,
    requiereCuello: false,
    camposExtra: [],
    tiempoEst: "",
    precioBase: "",
    preciosPorTalla: {
      XS: "",
      S: "",
      M: "",
      L: "",
      XL: "",
      "2XL": "",
      "3XL": ""
    },
    notas: ""
  };
  const [f, setF] = useState({
    ...def,
    ...(initial || {})
  });
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const INPS = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid #e0e0e0",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    background: "#FAFAF8"
  };
  const LBL = {
    fontSize: 10,
    fontWeight: 700,
    color: "#666",
    marginBottom: 3,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: .3
  };
  const [newTela, setNT] = useState("");
  const [newColor, setNC] = useState("");
  const addTela = () => {
    if (!newTela.trim()) return;
    set("telas", [...(f.telas || []), newTela.trim()]);
    setNT("");
  };
  const addColor = () => {
    if (!newColor.trim()) return;
    set("colores", [...(f.colores || []), newColor.trim()]);
    setNC("");
  };
  const ICONOS = ["✂️", "👔", "👕", "👗", "👖", "🤵", "⚽", "🪡", "👚", "🧥"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 200,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: "16px 16px 0 0",
      padding: 16,
      width: "100%",
      maxWidth: 560,
      maxHeight: "92vh",
      overflowY: "auto",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "#2C1654",
      fontFamily: "Georgia,serif"
    }
  }, initial ? "✏️ Editar producto" : "+ Nuevo tipo de prenda"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      background: "none",
      border: "none",
      fontSize: 22,
      cursor: "pointer",
      color: "#bbb"
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "\xCDcono"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, ICONOS.map(ic => /*#__PURE__*/React.createElement("button", {
    key: ic,
    onClick: () => set("icono", ic),
    style: {
      fontSize: 24,
      padding: "6px",
      borderRadius: 8,
      border: "2px solid " + (f.icono === ic ? "#2C1654" : "#e0e0e0"),
      background: f.icono === ic ? "#f0ebff" : "#fff",
      cursor: "pointer"
    }
  }, ic)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 80px",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Nombre *"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.nombre,
    onChange: e => set("nombre", e.target.value),
    placeholder: "Ej: Filipina, Camisa polo..."
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Tiempo (d\xEDas)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: f.tiempoEst,
    onChange: e => set("tiempoEst", parseInt(e.target.value) || ""),
    placeholder: "3"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Modo de registro por default"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["tallas", "📦 Por tallas"], ["lista", "📋 Lista de prendas"]].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => set("modoDefault", v),
    style: {
      flex: 1,
      padding: "8px",
      borderRadius: 8,
      border: "1.5px solid " + (f.modoDefault === v ? "#E67E22" : "#e0e0e0"),
      background: f.modoDefault === v ? "#FFF3E0" : "#fff",
      color: f.modoDefault === v ? "#E67E22" : "#666",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: f.modoDefault === v ? 700 : 400
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: f.requiereMedidas,
    onChange: e => set("requiereMedidas", e.target.checked),
    style: {
      accentColor: "#1A5276"
    }
  }), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCD0 Requiere medidas")), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: f.requiereCuello,
    onChange: e => set("requiereCuello", e.target.checked),
    style: {
      accentColor: "#9B59B6"
    }
  }), /*#__PURE__*/React.createElement("span", null, "\uD83E\uDDF6 Lleva cuello tejido"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Telas sugeridas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 5,
      marginBottom: 6
    }
  }, (f.telas || []).map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      background: "#f0f0f0",
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 12,
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, t, /*#__PURE__*/React.createElement("button", {
    onClick: () => set("telas", (f.telas || []).filter((_, j) => j !== i)),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#aaa",
      fontSize: 14,
      padding: 0,
      lineHeight: 1
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: newTela,
    onChange: e => setNT(e.target.value),
    onKeyDown: e => e.key === "Enter" && addTela(),
    placeholder: "Agregar tela...",
    style: {
      ...INPS,
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addTela,
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "none",
      background: "#2C1654",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700
    }
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Colores comunes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 5,
      marginBottom: 6
    }
  }, (f.colores || []).map((col, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      background: "#f0f0f0",
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 12,
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, col, /*#__PURE__*/React.createElement("button", {
    onClick: () => set("colores", (f.colores || []).filter((_, j) => j !== i)),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#aaa",
      fontSize: 14,
      padding: 0,
      lineHeight: 1
    }
  }, "\xD7")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: newColor,
    onChange: e => setNC(e.target.value),
    onKeyDown: e => e.key === "Enter" && addColor(),
    placeholder: "Agregar color...",
    style: {
      ...INPS,
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addColor,
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "none",
      background: "#2C1654",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700
    }
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Precios por talla ($ \u2014 opcional)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 6
    }
  }, Object.entries(f.preciosPorTalla || {}).map(([t, p]) => /*#__PURE__*/React.createElement("div", {
    key: t
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#888",
      textAlign: "center",
      marginBottom: 2
    }
  }, t), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "0",
    step: "0.25",
    value: p || "",
    onChange: e => set("preciosPorTalla", {
      ...f.preciosPorTalla,
      [t]: e.target.value
    }),
    placeholder: "\u2014",
    style: {
      ...INPS,
      textAlign: "center",
      padding: "5px 4px",
      fontSize: 12,
      color: "#27AE60",
      fontWeight: 700
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Precio base ($ \u2014 para prendas sin talla fija)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: INPS,
    value: f.precioBase || "",
    onChange: e => set("precioBase", e.target.value),
    placeholder: "0.00"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Notas / instrucciones"), /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...INPS,
      resize: "vertical",
      minHeight: 50
    },
    value: f.notas || "",
    onChange: e => set("notas", e.target.value),
    placeholder: "Instrucciones especiales para este tipo de prenda..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600,
      color: "#666"
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (!f.nombre.trim()) {
        pushToast("El nombre es obligatorio", "error");
        return;
      }
      onSave(f);
    },
    style: {
      padding: "9px 22px",
      borderRadius: 8,
      border: "none",
      background: "#2C1654",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14
    }
  }, "\uD83D\uDCBE Guardar"))));
}
function SeccionClientes({
  clientes,
  setClientes,
  pedidos,
  bordados,
  cuellos,
  esAdmin
}) {
  const [busq, setBusq] = useState("");
  const [modal, setModal] = useState(null); // null | "nuevo" | cliente
  const [confirm, setConf] = useState(null);
  const lista = clientes.filter(cl => !busq || cl.nombre.toLowerCase().includes(busq.toLowerCase()) || (cl.telefono || "").includes(busq));
  function statsCliente(cli) {
    const nombre = cli.nombre.toLowerCase();
    const todos = [...pedidos.filter(p => (p.cliente || "").toLowerCase() === nombre), ...bordados.filter(b => (b.cliente || "").toLowerCase() === nombre), ...cuellos.filter(c => (c.cliente || "").toLowerCase() === nombre)];
    const activos = todos.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).length;
    const fechas = todos.map(p => p.fecha || p.fechaEntrega || "").filter(Boolean).sort().reverse();
    const monto = todos.reduce((s, p) => s + parseFloat(p.precio || p.precioT || 0), 0);
    return {
      total: todos.length,
      activos,
      ultimaFecha: fechas[0] || "—",
      monto
    };
  }
  function guardar(form) {
    const isNuevo = modal === "nuevo";
    const id = isNuevo ? clientes.length ? Math.max(...clientes.map(c => c.id || 0)) + 1 : 1 : modal.id;
    const cli = {
      ...form,
      id,
      fecha: isNuevo ? hoy() : modal.fecha || hoy()
    };
    if (isNuevo) setClientes(prev => [...prev, cli]);else setClientes(prev => prev.map(c => c.id === id ? cli : c));
    gsClientesGuardar(cli);
    setModal(null);
  }
  function eliminar(id) {
    setClientes(prev => prev.filter(c => c.id !== id));
    gsClientesBorrar(id);
    setConf(null);
  }
  const totalConCF = clientes.filter(c => c.nit).length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      background: "#fff",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "#2C1654",
      fontWeight: 800,
      fontFamily: "Georgia,serif"
    }
  }, "\uD83D\uDC65 Clientes"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, clientes.length, " cliente(s)", totalConCF > 0 ? ` · ${totalConCF} con datos fiscales` : "")), /*#__PURE__*/React.createElement("input", {
    value: busq,
    onChange: e => setBusq(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar...",
    style: {
      padding: "7px 10px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      fontSize: 13,
      outline: "none",
      width: 160
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal("nuevo"),
    style: {
      padding: "9px 14px",
      borderRadius: 8,
      border: "none",
      background: "#2C1654",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
      whiteSpace: "nowrap"
    }
  }, "+ Nuevo")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto",
      padding: 12
    }
  }, lista.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 60,
      color: "#ccc"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 10
    }
  }, "\uD83D\uDC65"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "#aaa"
    }
  }, clientes.length === 0 ? "Aún no hay clientes registrados" : "Sin resultados"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#bbb",
      marginTop: 4
    }
  }, clientes.length === 0 ? "Los clientes se guardan automáticamente al registrar pedidos" : "")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, lista.map(cli => {
    const st = statsCliente(cli);
    return /*#__PURE__*/React.createElement("div", {
      key: cli.id,
      style: {
        background: "#fff",
        borderRadius: 12,
        padding: "12px 16px",
        border: "1.5px solid #f0f0f0",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: cli.tipo === "empresa" ? "#CCE5FF" : cli.tipo === "escuela" ? "#D4EDDA" : "#E8D5FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        flexShrink: 0
      }
    }, cli.tipo === "empresa" ? "🏢" : cli.tipo === "escuela" ? "🏫" : "👤"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 150
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        color: "#2C1654",
        fontSize: 14
      }
    }, cli.nombre), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        marginTop: 2,
        flexWrap: "wrap"
      }
    }, cli.telefono && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#555"
      }
    }, "\uD83D\uDCF1 ", cli.telefono), cli.contacto && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#888"
      }
    }, "\uD83D\uDC64 ", cli.contacto), cli.nit && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#27AE60",
        fontWeight: 700
      }
    }, "\uD83D\uDCCB CF")), cli.notas && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa",
        marginTop: 2,
        fontStyle: "italic"
      }
    }, cli.notas)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: "#9B59B6"
      }
    }, st.total), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#aaa",
        fontWeight: 700,
        textTransform: "uppercase"
      }
    }, "pedidos")), st.activos > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 900,
        color: "#E67E22"
      }
    }, st.activos), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#aaa",
        fontWeight: 700,
        textTransform: "uppercase"
      }
    }, "activos")), st.monto > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 800,
        color: "#27AE60"
      }
    }, "$", st.monto.toFixed(0)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#aaa",
        fontWeight: 700,
        textTransform: "uppercase"
      }
    }, "historial"))), st.ultimaFecha !== "—" && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#aaa",
        flexShrink: 0
      }
    }, "\xDAltimo pedido:", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", {
      style: {
        color: "#555"
      }
    }, st.ultimaFecha)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(cli),
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "#9B59B6",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12
      }
    }, "\u270F\uFE0F Editar"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setConf(cli.id),
      style: {
        padding: "7px 10px",
        borderRadius: 8,
        border: "1.5px solid #fdd",
        background: "#fff8f8",
        cursor: "pointer",
        fontSize: 12,
        color: "#DC3545"
      }
    }, "\uD83D\uDDD1\uFE0F")));
  }))), modal && /*#__PURE__*/React.createElement(ModalFormCliente, {
    initial: modal !== "nuevo" ? modal : null,
    onSave: guardar,
    onCancel: () => setModal(null)
  }), confirm && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 28,
      maxWidth: 340,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 8
    }
  }, "\uD83D\uDDD1\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      color: "#2C1654"
    }
  }, "\xBFEliminar cliente?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: "0 0 16px"
    }
  }, "Solo se borra de la cartera, no afecta los pedidos existentes."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setConf(null),
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => eliminar(confirm),
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "none",
      background: "#E63946",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700
    }
  }, "S\xED, eliminar")))));
}
function ModalFormCliente({
  initial,
  onSave,
  onCancel
}) {
  const def = {
    nombre: "",
    telefono: "",
    tipo: "persona",
    contacto: "",
    nit: "",
    nrc: "",
    razonSocial: "",
    dirFiscal: "",
    notas: "",
    medidas: {}
  };
  const [f, setF] = useState({
    ...def,
    ...(initial || {})
  });
  const set = (k, v) => setF(p => ({
    ...p,
    [k]: v
  }));
  const INPS = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid #e0e0e0",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    background: "#FAFAF8"
  };
  const LBL = {
    fontSize: 10,
    fontWeight: 700,
    color: "#666",
    marginBottom: 3,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: .3
  };
  const tieneDatosFiscales = f.nit || f.nrc || f.razonSocial;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 200,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: "16px 16px 0 0",
      padding: 16,
      width: "100%",
      maxWidth: 520,
      maxHeight: "92vh",
      overflowY: "auto",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "#2C1654",
      fontFamily: "Georgia,serif"
    }
  }, initial ? "✏️ Editar cliente" : "👥 Nuevo cliente"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      background: "none",
      border: "none",
      fontSize: 22,
      cursor: "pointer",
      color: "#bbb"
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 12
    }
  }, [["persona", "👤 Persona"], ["empresa", "🏢 Empresa"], ["escuela", "🏫 Escuela/Inst."]].map(([val, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: val,
    onClick: () => set("tipo", val),
    style: {
      flex: 1,
      padding: "7px 4px",
      borderRadius: 8,
      border: "1.5px solid " + (f.tipo === val ? "#9B59B6" : "#e0e0e0"),
      background: f.tipo === val ? "#9B59B6" : "#fff",
      color: f.tipo === val ? "#fff" : "#666",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: f.tipo === val ? 700 : 400
    }
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Nombre *"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.nombre,
    placeholder: "Nombre completo o raz\xF3n",
    onChange: e => set("nombre", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Tel\xE9fono / WhatsApp"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.telefono,
    placeholder: "Para avisar",
    onChange: e => set("telefono", e.target.value)
  }))), (f.tipo === "empresa" || f.tipo === "escuela") && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Nombre del contacto"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.contacto,
    placeholder: f.tipo === "escuela" ? "Director / administrador" : "Persona de contacto",
    onChange: e => set("contacto", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid " + (tieneDatosFiscales ? "#a8d8a8" : "#f0f0f0"),
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: tieneDatosFiscales ? "#f0fff4" : "#fafafa",
      fontSize: 12,
      fontWeight: 700,
      color: tieneDatosFiscales ? "#155724" : "#aaa"
    }
  }, "\uD83E\uDDFE Datos fiscales ", tieneDatosFiscales ? "(registrados)" : "(opcional — para crédito fiscal)"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Raz\xF3n Social"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.razonSocial,
    placeholder: "Nombre legal",
    onChange: e => set("razonSocial", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "NIT"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.nit,
    placeholder: "0000-000000-000-0",
    onChange: e => set("nit", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "NRC"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.nrc,
    placeholder: "000000-0",
    onChange: e => set("nrc", e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Direcci\xF3n fiscal"), /*#__PURE__*/React.createElement("input", {
    style: INPS,
    value: f.dirFiscal,
    placeholder: "Para factura",
    onChange: e => set("dirFiscal", e.target.value)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid #dce3ff",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f4ff",
      padding: "9px 14px",
      fontSize: 11,
      fontWeight: 800,
      color: "#1A5276",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCD0 Medidas del cliente (cm)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#888",
      fontWeight: 400
    }
  }, "Se autocompletar\xE1n en pedidos futuros")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 8
    }
  }, MEDIDAS_DEF.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.k
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#888",
      marginBottom: 2,
      display: "block",
      textTransform: "uppercase"
    }
  }, m.l), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: (f.medidas || {})[m.k] || "",
    onChange: e => set("medidas", {
      ...(f.medidas || {}),
      [m.k]: e.target.value
    }),
    placeholder: "\u2014",
    style: {
      ...INPS,
      padding: "6px 8px",
      textAlign: "center",
      fontSize: 13
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: LBL
  }, "Notas internas"), /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...INPS,
      resize: "vertical",
      minHeight: 44
    },
    value: f.notas,
    placeholder: "Preferencias, observaciones...",
    onChange: e => set("notas", e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      padding: "9px 18px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600,
      color: "#666"
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (!f.nombre.trim()) {
        pushToast("El nombre es obligatorio", "error");
        return;
      }
      onSave(f);
    },
    style: {
      padding: "9px 22px",
      borderRadius: 8,
      border: "none",
      background: "#2C1654",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14
    }
  }, "\uD83D\uDCBE Guardar"))));
}
function App() {
  const [rol, setRol] = useState(null);
  const [seccion, setSec] = useState("pedidos");
  const [pedidos, setPedidos] = useState(() => {
    try {
      const d = localStorage.getItem("imis_pedidos");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextId, setNextId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_pedidos");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(p => Number(p.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  const [inventario, setInventario] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [modal, setModal] = useState(null);
  const [detalle, setDet] = useState(null);
  const [confirmar, setConf] = useState(null);
  const [busqueda, setBusq] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [sync, setSync] = useState("idle");
  const [progreso, setProgreso] = useState(null);
  const [errorFotos, setErrorFotos] = useState([]);
  const [visor, setVisor] = useState(null); // {imgs:[], idx:0}
  const [modalIA, setModalIA] = useState(false);
  const [modalArchivar, setModalArchivar] = useState(null);
  const [modalActMedidas, setModalActMedidas] = useState(null);
  const [masOpen, setMasOpen] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const pullStartRef = useRef(null);
  function refrescar() {
    if (refrescando) return;
    setRefrescando(true);
    pushToast("Actualizando datos...", "info", 1000);
    setTimeout(() => window.location.reload(), 250);
  }
  function onMainTouchStart(e) {
    const main = e.currentTarget;
    if (main.scrollTop > 5) {
      pullStartRef.current = null;
      return;
    }
    pullStartRef.current = e.touches[0].clientY;
  }
  function onMainTouchMove(e) {
    if (pullStartRef.current === null) return;
    const delta = e.touches[0].clientY - pullStartRef.current;
    if (delta > 0) {
      setPullDist(Math.min(delta * 0.5, 80));
    }
  }
  function onMainTouchEnd() {
    if (pullStartRef.current === null) return;
    pullStartRef.current = null;
    if (pullDist > 60) {
      refrescar();
    }
    setPullDist(0);
  }
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState(CATALOGO_BASE);
  const [bordados, setBordados] = useState(() => {
    try {
      const d = localStorage.getItem("imis_bordados");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextBordId, setNextBordId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_bordados");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(b => Number(b.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  const [cuellos, setCuellos] = useState(() => {
    try {
      const d = localStorage.getItem("imis_cuellos");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextCuelId, setNextCuelId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_cuellos");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(c => Number(c.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      const sinData = pedidos.map(p => ({
        ...p,
        imagenes: (p.imagenes || []).map(img => ({
          nombre: img.nombre,
          tipo: img.tipo,
          driveUrl: img.driveUrl || null,
          driveId: img.driveId || null
        }))
      }));
      localStorage.setItem("imis_pedidos", JSON.stringify(sinData));
    } catch {}
  }, [pedidos]);
  useEffect(() => {
    try {
      localStorage.setItem("imis_bordados", JSON.stringify(bordados));
    } catch {}
  }, [bordados]);
  useEffect(() => {
    try {
      localStorage.setItem("imis_cuellos", JSON.stringify(cuellos));
    } catch {}
  }, [cuellos]);
  const rolBase = (rol || "").startsWith("operario_") ? "operario" : rol;
  const esAdmin = rolBase === "admin";
  useEffect(() => {
    if (!rolBase) return;
    if (rol && rol.startsWith("operario_")) {
      const mod = rol.replace("operario_", "");
      if (["pedidos", "bordados", "cuellos"].includes(mod)) setSec(mod);
    }
    setSync("cargando");
    Promise.all([gsLeer(), idbLeerTodas(), gsBordLeer(), gsCuelLeer(), gsClientesLeer(), gsCatalogoLeer()]).then(([sheetsData, idbData, bordSh, cuelSh, cliSh, catSh]) => {
      console.log("Datos cargados — confección:", sheetsData.length, "bordados:", bordSh.length, "cuellos:", cuelSh.length, "clientes:", cliSh.length);
      if (sheetsData.length > 0) {
        const idbMap = Object.fromEntries(idbData.map(r => [String(r.pedidoId), r.imagenes || []]));
        const normFecha = v => {
          if (!v) return "";
          const s = String(v).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          try {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
              const yr = d.getFullYear();
              const mo = String(d.getMonth() + 1).padStart(2, "0");
              const da = String(d.getDate()).padStart(2, "0");
              return yr + "-" + mo + "-" + da;
            }
          } catch (e) {}
          return s;
        };
        const parseCampo = v => {
          if (Array.isArray(v) || typeof v === "object") return v;
          if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
            try {
              return JSON.parse(v);
            } catch {
              return [];
            }
          }
          return v;
        };
        const merged = sheetsData.map(p => {
          const rawImgs = parseCampo(p.imagenes);
          const sheetsImgs = Array.isArray(rawImgs) ? rawImgs : [];
          const localImgs = idbMap[String(p.id)] || [];
          const imgsMerged = sheetsImgs.map(sImg => {
            const local = localImgs.find(l => l.nombre === sImg.nombre && (l.data || l.driveUrl));
            return local ? {
              ...sImg,
              ...local,
              driveUrl: sImg.driveUrl || local.driveUrl
            } : sImg;
          });
          return {
            ...p,
            imagenes: imgsMerged,
            tallasItems: parseCampo(p.tallasItems),
            tallasQty: parseCampo(p.tallasQty),
            medidas: parseCampo(p.medidas),
            abonos: parseCampo(p.abonos) || [],
            personas: parseCampo(p.personas) || [],
            modoRegistro: p.modoRegistro || "tallas",
            fecha: normFecha(p.fecha),
            fechaEntrega: normFecha(p.fechaEntrega),
            fechaInicio: normFecha(p.fechaInicio)
          };
        });
        setPedidos(merged);
        setNextId(Math.max(...merged.map(p => Number(p.id) || 0)) + 1);
      }
      if (bordSh.length > 0) {
        const bordParsed = bordSh.map(b => ({
          ...b,
          abonos: parseCampo(b.abonos) || []
        }));
        setBordados(bordParsed);
        setNextBordId(Math.max(...bordParsed.map(b => Number(b.id) || 0)) + 1);
      }
      if (cuelSh.length > 0) {
        const cuelParsed = cuelSh.map(cu => ({
          ...cu,
          abonos: parseCampo(cu.abonos) || [],
          cuello: parseCampo(cu.cuello) || null,
          puno: parseCampo(cu.puno) || null,
          banda: parseCampo(cu.banda) || null
        }));
        setCuellos(cuelParsed);
        setNextCuelId(Math.max(...cuelParsed.map(c => Number(c.id) || 0)) + 1);
      }
      if (cliSh.length > 0) {
        setClientes(cliSh);
      } else {
        const mapaC = {};
        [...sheetsData, ...bordSh, ...cuelSh].forEach(p => {
          const nombre = (p.cliente || "").trim();
          if (!nombre) return;
          const key = nombre.toLowerCase();
          if (!mapaC[key]) mapaC[key] = {
            id: Object.keys(mapaC).length + 1,
            nombre,
            telefono: p.telefono || "",
            tipo: p.tipoCliente || "persona",
            contacto: p.nombreContacto || "",
            nit: p.nit || "",
            nrc: p.nrc || "",
            razonSocial: p.razonSocial || "",
            dirFiscal: p.dirFiscal || "",
            notas: "",
            fecha: hoy()
          };else {
            const ex = mapaC[key];
            if (!ex.telefono && p.telefono) ex.telefono = p.telefono;
            if (!ex.nit && p.nit) ex.nit = p.nit;
            if (!ex.nrc && p.nrc) ex.nrc = p.nrc;
          }
        });
        const listaCli = Object.values(mapaC);
        if (listaCli.length > 0) {
          setClientes(listaCli);
          listaCli.forEach(cli => gsClientesGuardar(cli));
        }
      }
      if (catSh && catSh.length > 0) setCatalogo(catSh);
      setSync("ok");
    }).catch(err => { console.warn("Carga parcial:", err); setSync("ok"); });
  }, [rolBase]);
  async function guardarPedido(form, _esNuevo) {
    const esNuevo = _esNuevo !== undefined ? _esNuevo : modal === "nuevo";
    const idPedido = esNuevo ? nextId : (modal || {}).id || form.id;
    const baseP = esNuevo ? {
      ...form,
      id: idPedido,
      fecha: hoy()
    } : {
      ...(modal || {}),
      ...form,
      id: idPedido
    };
    setModal(null);
    setSync("guardando");
    const pendientes = (baseP.imagenes || []).filter(i => i.data && !i.driveUrl);
    let imagenesFinales = [...(baseP.imagenes || [])];
    const erroresSubida = [];
    if (pendientes.length > 0) {
      setProgreso({
        actual: 0,
        total: pendientes.length,
        errores: 0
      });
      let completadas = 0;
      imagenesFinales = await Promise.all((baseP.imagenes || []).map(async img => {
        if (!img.data || img.driveUrl) return img;
        const {
          img: imgResult,
          ok,
          err
        } = await subirImagenADrive(img, "confeccion", baseP.cliente);
        if (!ok) erroresSubida.push({
          nombre: img.nombre || "foto",
          err
        });
        completadas++;
        setProgreso({
          actual: completadas,
          total: pendientes.length,
          errores: erroresSubida.length
        });
        return imgResult;
      }));
      setProgreso(null);
    }
    const p = {
      ...baseP,
      imagenes: imagenesFinales
    };
    if (esNuevo) {
      setPedidos(prev => [...prev, p]);
      setNextId(n => n + 1);
    } else {
      setPedidos(prev => prev.map(x => x.id === p.id ? p : x));
    }
    upsertClienteLocal(p.cliente, {
      telefono: p.telefono,
      tipo: p.tipoCliente,
      contacto: p.nombreContacto,
      nit: p.nit,
      nrc: p.nrc,
      razonSocial: p.razonSocial,
      dirFiscal: p.dirFiscal
    });
    const tieneMedsNuevas = p.medidas && Object.values(p.medidas).some(v => v);
    if (tieneMedsNuevas) {
      const cliIdx = clientes.findIndex(cl => cl.nombre.toLowerCase() === p.cliente.toLowerCase());
      if (cliIdx >= 0) {
        const cliActual = clientes[cliIdx];
        const medsCli = cliActual.medidas || {};
        const hayDiferencia = Object.entries(p.medidas).some(([k, v]) => v && medsCli[k] !== v);
        if (hayDiferencia) {
          setModalActMedidas({
            pedido: p,
            cliente: cliActual
          });
        }
      }
    }
    try {
      await Promise.all([gsGuardar(p), idbGuardar(p.id, p.imagenes)]);
      if (erroresSubida.length > 0) {
        setSync("error_fotos");
        setErrorFotos(erroresSubida);
        pushToast("Pedido guardado, pero " + erroresSubida.length + " foto" + (erroresSubida.length === 1 ? "" : "s") + " no se subieron", "error", 5000);
      } else {
        setSync("ok");
        pushToast("Pedido " + (esNuevo ? "creado" : "actualizado") + " ✓", "success");
      }
    } catch (err) {
      setSync("error");
      const msg = err && err.name === "AbortError" ? "Servidor no responde. El pedido quedó local — sincronizará cuando vuelva la red." : "Error al guardar. Revisá la conexión.";
      pushToast(msg, "error", 5000);
    }
  }
  function upsertClienteLocal(nombre, extra = {}) {
    if (!nombre || !nombre.trim()) return;
    const key = nombre.trim().toLowerCase();
    setClientes(prev => {
      const idx = prev.findIndex(c => c.nombre.toLowerCase() === key);
      if (idx >= 0) {
        const ex = {
          ...prev[idx]
        };
        if (!ex.telefono && extra.telefono) ex.telefono = extra.telefono;
        if (!ex.tipo && extra.tipo) ex.tipo = extra.tipo;
        if (!ex.contacto && extra.contacto) ex.contacto = extra.contacto;
        if (!ex.nit && extra.nit) ex.nit = extra.nit;
        if (!ex.nrc && extra.nrc) ex.nrc = extra.nrc;
        if (!ex.razonSocial && extra.razonSocial) ex.razonSocial = extra.razonSocial;
        if (!ex.dirFiscal && extra.dirFiscal) ex.dirFiscal = extra.dirFiscal;
        gsClientesGuardar(ex);
        const nuevos = [...prev];
        nuevos[idx] = ex;
        return nuevos;
      } else {
        const nuevo = {
          id: prev.length ? Math.max(...prev.map(c => c.id || 0)) + 1 : 1,
          nombre: nombre.trim(),
          fecha: hoy(),
          ...extra
        };
        gsClientesGuardar(nuevo);
        return [...prev, nuevo];
      }
    });
  }
  async function cambiarEstatus(id, est) {
    const lista = pedidos.map(p => p.id === id ? {
      ...p,
      estatus: est
    } : p);
    setPedidos(lista);
    try {
      await gsGuardar(lista.find(p => p.id === id));
    } catch {}
  }
  async function eliminar(id) {
    setPedidos(p => p.filter(x => x.id !== id));
    setConf(null);
    try {
      await Promise.all([gsBorrar(id), idbBorrar(id)]);
    } catch {}
  }
  const diasPara = f => f ? Math.ceil((new Date(f + "T12:00:00") - new Date()) / 86400000) : null;
  const vencidosSinArchivar = useMemo(() => pedidos.filter(p => {
    if (["Entregado", "Cancelado", "Listo", "Archivado"].includes(p.estatus)) return false;
    const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
    if (saldo > 0) return false;
    const d = diasPara(p.fechaEntrega);
    return d !== null && d < 0;
  }), [pedidos]);
  function archivarPedido(p, fechaEntregaReal) {
    const actualizado = {
      ...p,
      estatus: "Entregado",
      fechaEntrega: fechaEntregaReal || p.fechaEntrega
    };
    setPedidos(prev => prev.map(x => x.id === p.id ? actualizado : x));
    gsGuardar(actualizado);
    setModalArchivar(null);
  }
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return pedidos.filter(p => {
      const match = !q || [p.cliente, p.tipoPrenda, p.tela, p.color, p.costurera, p.notas, p.descripcion, p.nombreContacto, p.estatus, String(p.id || ""), p.fechaEntrega, p.tipoDocumento].some(v => v && String(v).toLowerCase().includes(q));
      return match && (filtro === "Todos" || p.estatus === filtro);
    });
  }, [pedidos, busqueda, filtro]);
  const conteos = useMemo(() => ESTATUS.reduce((a, e) => ({
    ...a,
    [e]: pedidos.filter(p => p.estatus === e).length
  }), {}), [pedidos]);
  const parseMonto = v => {
    const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const porCobrar = useMemo(() => [...pedidos.filter(p => p.estatus !== "Cancelado"), ...bordados.filter(b => b.estatus !== "Cancelado"), ...cuellos.filter(c => c.estatus !== "Cancelado")].reduce((s, p) => {
    const precio = parseMonto(p.precio || p.precioT);
    const anticipo = parseMonto(p.anticipo);
    const saldo = precio - anticipo;
    return saldo > 0 ? s + saldo : s;
  }, 0), [pedidos, bordados, cuellos]);
  const alertaCF = useMemo(() => pedidos.filter(p => p.tipoDocumento === "Crédito Fiscal (pendiente datos)").length, [pedidos]);
  const activos = useMemo(() => pedidos.filter(p => !["Entregado", "Cancelado"].includes(p.estatus)).length + bordados.filter(b => !["Entregado", "Cancelado"].includes(b.estatus)).length + cuellos.filter(c => !["Entregado", "Cancelado"].includes(c.estatus)).length, [pedidos, bordados, cuellos]);
  const matAgotados = useMemo(() => inventario.filter(m => m.categoria === "material" && m.cantidad - asignaciones.filter(a => a.materialId === m.id).reduce((s, a) => s + a.cantidad, 0) <= 0).length, [inventario, asignaciones]);
  const syncInfo = {
    idle: {
      c: "#aaa",
      t: ""
    },
    cargando: {
      c: "#FFC107",
      t: "⏳ Cargando..."
    },
    guardando: {
      c: "#FFC107",
      t: "⏳ Guardando..."
    },
    ok: {
      c: "#28A745",
      t: "✅ Sync"
    },
    error: {
      c: "#DC3545",
      t: "⚠️ Sin conexión"
    },
    error_fotos: {
      c: "#E67E22",
      t: "⚠️ Fotos no subidas"
    }
  }[sync];
  if (!rolBase) return /*#__PURE__*/React.createElement(PantallaLogin, {
    onLogin: setRol
  });
  const moduloOperario = (rol || "").startsWith("operario_") ? rol.replace("operario_", "") : null;
  const NAV = esAdmin ? [{
    id: "estadisticas",
    label: "Estadísticas",
    icon: "📊"
  }, {
    id: "pedidos",
    label: "Confección",
    icon: "✂️"
  }, {
    id: "bordados",
    label: "Bordados",
    icon: "🪡"
  }, {
    id: "cuellos",
    label: "Cuellos",
    icon: "🧶"
  }, {
    id: "inventario",
    label: "Inventario",
    icon: "📦",
    soloAdmin: true
  }, {
    id: "catalogo",
    label: "Catálogo",
    icon: "🧵"
  }, {
    id: "clientes",
    label: "Clientes",
    icon: "👥"
  }] : moduloOperario === "pedidos" ? [{
    id: "pedidos",
    label: "Confección",
    icon: "✂️"
  }] : moduloOperario === "bordados" ? [{
    id: "bordados",
    label: "Bordados",
    icon: "🪡"
  }] : moduloOperario === "cuellos" ? [{
    id: "cuellos",
    label: "Cuellos",
    icon: "🧶"
  }] : [{
    id: "pedidos",
    label: "Confección",
    icon: "✂️"
  }];
  const NAV_IDS_VISIBLES = ["pedidos", "bordados", "cuellos", "inventario"];
  const renderItemBottom = item => {
    const bloqueado = item.pronto || item.soloAdmin && !esAdmin;
    const activo = seccion === item.id;
    const badgeCount = item.id === "pedidos" ? vencidosSinArchivar.length : item.id === "inventario" ? matAgotados : 0;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      onClick: () => {
        if (bloqueado) return;
        setSec(item.id);
        setMasOpen(false);
      },
      style: {
        flex: 1,
        border: "none",
        background: "transparent",
        cursor: bloqueado ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 0",
        opacity: bloqueado ? 0.3 : 1,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20,
        position: "relative"
      }
    }, item.icon, badgeCount > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: -4,
        right: -10,
        background: "#DC3545",
        color: "#fff",
        fontSize: 9,
        fontWeight: 800,
        padding: "1px 5px",
        borderRadius: 10,
        minWidth: 16,
        textAlign: "center",
        lineHeight: 1.2
      }
    }, badgeCount > 9 ? "9+" : badgeCount)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: activo ? "#CE93D8" : "#888"
      }
    }, item.label));
  };
  function renderBottomNav() {
    const navVisible = NAV.filter(item => NAV_IDS_VISIBLES.includes(item.id));
    const navOculto = NAV.filter(item => !NAV_IDS_VISIBLES.includes(item.id));
    const ultBoton = navOculto.length > 0 ? /*#__PURE__*/React.createElement("button", {
      key: "_mas",
      onClick: () => setMasOpen(true),
      style: {
        flex: 1,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 0"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, "···"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: masOpen ? "#CE93D8" : "#888"
      }
    }, "Más")) : /*#__PURE__*/React.createElement("button", {
      key: "_salir",
      onClick: () => setRol(null),
      style: {
        flex: 1,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 0"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, "🚪"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: "#888"
      }
    }, "Salir"));
    return /*#__PURE__*/React.createElement("nav", {
      className: "bottomnav",
      style: {
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#2C1654",
        borderTop: "1px solid #3a1f6b",
        zIndex: 50,
        padding: "6px 0 8px"
      }
    }, navVisible.map(renderItemBottom), ultBoton);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100vh"
    }
  }, progreso && /*#__PURE__*/React.createElement(BarraProgreso, {
    actual: progreso.actual,
    total: progreso.total,
    errores: progreso.errores || 0
  }), /*#__PURE__*/React.createElement("aside", {
    className: "sidebar-desktop",
    style: {
      width: 196,
      background: "#2C1654",
      flexDirection: "column",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 16px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 2,
      color: "#9B59B6",
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, TALLER), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "#fff",
      fontFamily: "Georgia,serif",
      lineHeight: 1.3
    }
  }, "Sistema de", /*#__PURE__*/React.createElement("br", null), "Pedidos"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      background: esAdmin ? "#9B59B6" : "#3a1f6b",
      color: "#fff",
      padding: "2px 8px",
      borderRadius: 20,
      fontWeight: 700
    }
  }, esAdmin ? "🔐 Admin" : "✂️ Operario")), (sync === "ok" || sync === "error" || sync === "error_fotos") && syncInfo && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: syncInfo.c,
      fontWeight: 700,
      marginTop: 6
    }
  }, syncInfo.t)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: "4px 8px"
    }
  }, NAV.map(item => {
    const bloqueado = item.pronto || item.soloAdmin && !esAdmin;
    const activo = seccion === item.id;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      onClick: () => !bloqueado && setSec(item.id),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "9px 10px",
        borderRadius: 8,
        border: "none",
        background: activo ? "rgba(155,89,182,0.25)" : "transparent",
        color: bloqueado ? "#3a2060" : activo ? "#CE93D8" : "#bbb",
        cursor: bloqueado ? "default" : "pointer",
        fontSize: 12,
        fontWeight: activo ? 700 : 400,
        textAlign: "left",
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", null, item.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, item.label), item.id === "inventario" && matAgotados > 0 && !bloqueado && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: "#DC3545",
        color: "#fff",
        padding: "1px 5px",
        borderRadius: 10,
        fontWeight: 700
      }
    }, "\u26A0\uFE0F"), item.pronto && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        background: "#3a1f6b",
        color: "#555",
        padding: "2px 5px",
        borderRadius: 8
      }
    }, "PRONTO"), item.soloAdmin && !esAdmin && !item.pronto && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        background: "#3a1f6b",
        color: "#555",
        padding: "2px 5px",
        borderRadius: 8
      }
    }, "\uD83D\uDD10"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderTop: "1px solid #3a1f6b"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#666",
      marginBottom: 2
    }
  }, "Pedidos activos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: "#CE93D8",
      marginBottom: 6
    }
  }, activos), esAdmin && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#666",
      marginBottom: 2
    }
  }, "Por cobrar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: "#28A745",
      marginBottom: 8
    }
  }, fmt$(porCobrar)), alertaCF > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFF3CD",
      borderRadius: 8,
      padding: "5px 8px",
      fontSize: 10,
      color: "#856404",
      fontWeight: 700,
      marginBottom: 8
    }
  }, "\u26A0\uFE0F ", alertaCF, " CF pend.")), /*#__PURE__*/React.createElement("button", {
    onClick: refrescar,
    disabled: refrescando,
    style: {
      width: "100%",
      padding: "7px",
      borderRadius: 8,
      border: "1px solid #3a1f6b",
      background: "transparent",
      color: "#9B59B6",
      cursor: refrescando ? "default" : "pointer",
      fontSize: 11,
      marginBottom: 6,
      opacity: refrescando ? 0.5 : 1
    }
  }, refrescando ? "\u23F3 Actualizando..." : "\uD83D\uDD04 Actualizar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setRol(null),
    style: {
      width: "100%",
      padding: "7px",
      borderRadius: 8,
      border: "1px solid #3a1f6b",
      background: "transparent",
      color: "#555",
      cursor: "pointer",
      fontSize: 11
    }
  }, "\uD83D\uDEAA Cerrar sesi\xF3n"))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar-mobile",
    style: {
      display: "none",
      background: "#2C1654",
      padding: "10px 16px",
      alignItems: "center",
      gap: 10,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: "#fff"
    }
  }, TALLER), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#9B59B6"
    }
  }, esAdmin ? "🔐 Admin" : "✂️ Operario", (sync === "ok" || sync === "error" || sync === "error_fotos") && syncInfo ? ` · ` + syncInfo.t : "")), esAdmin && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#28A745",
      fontWeight: 700
    }
  }, fmt$(porCobrar)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#9B59B6"
    }
  }, "Por cobrar")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "6px 10px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#CE93D8"
    }
  }, activos), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#9B59B6"
    }
  }, "activos")), /*#__PURE__*/React.createElement("button", {
    onClick: refrescar,
    disabled: refrescando,
    title: "Actualizar datos",
    style: {
      background: "rgba(255,255,255,0.1)",
      border: "none",
      color: "#CE93D8",
      width: 40,
      height: 40,
      borderRadius: 8,
      fontSize: 18,
      cursor: refrescando ? "default" : "pointer",
      opacity: refrescando ? 0.5 : 1
    }
  }, refrescando ? "⏳" : "🔄")), seccion === "estadisticas" && esAdmin && /*#__PURE__*/React.createElement(SeccionEstadisticas, {
    pedidos: pedidos,
    bordados: bordados,
    cuellos: cuellos,
    clientes: clientes
  }), seccion === "inventario" && /*#__PURE__*/React.createElement(SeccionInventario, {
    pedidos: pedidos,
    inventario: inventario,
    setInventario: setInventario,
    asignaciones: asignaciones,
    setAsignaciones: setAsignaciones,
    esAdmin: esAdmin
  }), seccion === "bordados" && /*#__PURE__*/React.createElement(SeccionBordados, {
    bordados: bordados,
    setBordados: setBordados,
    nextBordId: nextBordId,
    setNextBordId: setNextBordId,
    pedidosConf: pedidos,
    esAdmin: esAdmin,
    clientes: clientes,
    upsertClienteLocal: upsertClienteLocal
  }), seccion === "cuellos" && /*#__PURE__*/React.createElement(SeccionCuellos, {
    cuellos: cuellos,
    setCuellos: setCuellos,
    nextCuelId: nextCuelId,
    setNextCuelId: setNextCuelId,
    pedidosConf: pedidos,
    esAdmin: esAdmin,
    clientes: clientes,
    upsertClienteLocal: upsertClienteLocal
  }), seccion === "catalogo" && /*#__PURE__*/React.createElement(SeccionCatalogo, {
    catalogo: catalogo,
    setCatalogo: setCatalogo,
    esAdmin: esAdmin
  }), seccion === "clientes" && esAdmin && /*#__PURE__*/React.createElement(SeccionClientes, {
    clientes: clientes,
    setClientes: setClientes,
    pedidos: pedidos,
    bordados: bordados,
    cuellos: cuellos,
    esAdmin: esAdmin
  }), seccion === "pedidos" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      background: "#fff",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "#2C1654",
      fontWeight: 800,
      fontFamily: "Georgia,serif"
    }
  }, "Registro de Pedidos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#aaa"
    }
  }, pedidos.length, " pedido(s)")), /*#__PURE__*/React.createElement("input", {
    className: "search-pedidos",
    value: busqueda,
    onChange: e => setBusq(e.target.value),
    placeholder: "\uD83D\uDD0D Buscar...",
    style: {
      ...INP,
      padding: "7px 10px",
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal("nuevo"),
    style: {
      ...BTN("#9B59B6"),
      whiteSpace: "nowrap",
      padding: "9px 14px",
      fontSize: 13
    }
  }, "\u2702\uFE0F Nuevo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      background: "#fff",
      borderBottom: "1px solid #eee",
      padding: "0 12px",
      overflowX: "auto",
      flexShrink: 0
    }
  }, ["Todos", ...ESTATUS].map(s => {
    const count = s === "Todos" ? pedidos.length : conteos[s] || 0;
    const active = filtro === s;
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => setFiltro(s),
      style: {
        padding: "7px 8px",
        border: "none",
        background: "none",
        borderBottom: active ? "2.5px solid #9B59B6" : "2.5px solid transparent",
        color: active ? "#9B59B6" : "#999",
        fontWeight: active ? 700 : 400,
        cursor: "pointer",
        fontSize: 10,
        display: "flex",
        alignItems: "center",
        gap: 3,
        whiteSpace: "nowrap"
      }
    }, s, /*#__PURE__*/React.createElement("span", {
      style: {
        background: active ? "#9B59B6" : "#eee",
        color: active ? "#fff" : "#aaa",
        borderRadius: 20,
        padding: "1px 5px",
        fontSize: 10,
        fontWeight: 700
      }
    }, count));
  })), /*#__PURE__*/React.createElement("div", {
    className: "main-area",
    onTouchStart: onMainTouchStart,
    onTouchMove: onMainTouchMove,
    onTouchEnd: onMainTouchEnd,
    style: {
      flex: 1,
      overflow: "auto",
      padding: 12,
      transform: pullDist > 0 ? "translateY(" + pullDist + "px)" : undefined,
      transition: pullDist === 0 ? "transform 0.2s" : undefined
    }
  }, pullDist > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -pullDist,
      left: 0,
      right: 0,
      height: pullDist,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#9B59B6",
      fontWeight: 700,
      fontSize: 13,
      pointerEvents: "none"
    }
  }, pullDist > 60 ? "↓ Soltá para actualizar" : "↓ Tirá para actualizar"), vencidosSinArchivar.length > 0 && /*#__PURE__*/React.createElement("div", {
    onClick: () => setModalArchivar(vencidosSinArchivar[0]),
    style: {
      background: "#FFF3CD",
      border: "1.5px solid #FFE082",
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 12,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "📦"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#856404"
    }
  }, vencidosSinArchivar.length, " pedido", vencidosSinArchivar.length === 1 ? "" : "s", " vencido", vencidosSinArchivar.length === 1 ? "" : "s", " sin archivar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#a07c0a"
    }
  }, "Toc\xE1 para revisar y marcar como entregado")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      color: "#856404",
      fontWeight: 700
    }
  }, "→")), /*#__PURE__*/React.createElement(ProximasEntregas, {
    pedidos: pedidos,
    diasPara: diasPara,
    esAdmin: esAdmin,
    onVer: setDet,
    onEditar: setModal,
    onWA: p => copiarWA(p, esAdmin)
  }), filtrados.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 60,
      color: "#ccc"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 10
    }
  }, "\uD83E\uDDF5"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "#aaa"
    }
  }, sync === "cargando" ? "Cargando pedidos..." : "No hay pedidos registrados"), sync === "ok" && pedidos.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      background: "#FFF8E1",
      border: "1px solid #FFE082",
      borderRadius: 8,
      padding: "10px 16px",
      fontSize: 12,
      color: "#856404",
      maxWidth: 380,
      margin: "12px auto 0"
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Diagn\xF3stico:"), " El script respondi\xF3 OK pero sin datos.", /*#__PURE__*/React.createElement("br", null), "Verifica en la consola del navegador (F12 \u2192 Console) el mensaje \"Datos cargados\".", /*#__PURE__*/React.createElement("br", null), "O abre esta URL: ", /*#__PURE__*/React.createElement("a", {
    href: SCRIPT_URL + "?action=getAll",
    target: "_blank",
    style: {
      color: "#856404"
    }
  }, "ver datos en script"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("table", {
    className: "tabla-pedidos",
    style: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0 4px"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ["#", "Cliente", "Prenda / Tallas", "Fotos", esAdmin ? "Factura" : null, esAdmin ? "$ / Saldo" : null, "Entrega", "Estatus", ""].filter(Boolean).map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      textAlign: "left",
      padding: "5px 10px",
      fontSize: 9,
      fontWeight: 700,
      color: "#ccc",
      textTransform: "uppercase"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtrados.map(p => {
    const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
    const dias = diasPara(p.fechaEntrega);
    const urgent = dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(p.estatus);
    const esCFp = p.tipoDocumento === "Crédito Fiscal (pendiente datos)";
    const tallasR = resumenTallas(p);
    const imgs = (p.imagenes || []).filter(i => imgSrc(i));
    const nFotos = imgs.length;
    const nAsig = asignaciones.filter(a => a.pedidoId === String(p.id)).length;
    return /*#__PURE__*/React.createElement("tr", {
      key: p.id,
      onClick: () => setDet(p),
      style: {
        background: "#fff",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px",
        borderRadius: "10px 0 0 10px",
        color: "#ccc",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }
    }, "N\xB0", String(p.id).padStart(4, "0")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#2C1654",
        fontSize: 13
      }
    }, p.tipoCliente === "escuela" ? "🏫 " : p.tipoCliente === "empresa" ? "🏢 " : "", p.cliente), p.nombreContacto && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#555"
      }
    }, "\uD83D\uDC64 ", p.nombreContacto), p.costurera && p.costurera !== "(Sin asignar)" && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#9B59B6"
      }
    }, "\u2702\uFE0F ", p.costurera), esAdmin && nAsig > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#27AE60"
      }
    }, "\uD83E\uDDF5 ", nAsig)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#444",
        marginBottom: p.tallasItems && p.tallasItems.length ? 4 : 0
      }
    }, p.tipoPrenda), p.tallasItems && p.tallasItems.length ? /*#__PURE__*/React.createElement(TallasChips, {
      items: p.tallasItems,
      compact: true
    }) : tallasR ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#E67E22",
        fontWeight: 700
      }
    }, tallasR) : null), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, nFotos > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, imgs.slice(0, 2).map((img, i) => /*#__PURE__*/React.createElement("img", {
      key: i,
      src: imgSrc(img),
      onClick: () => setVisor({
        imgs: imgs.map(imgSrc),
        idx: i
      }),
      style: {
        width: 32,
        height: 32,
        borderRadius: 5,
        objectFit: "cover",
        border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e0e0e0"),
        cursor: "zoom-in"
      }
    })), nFotos > 2 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#888",
        fontWeight: 700
      }
    }, "+", nFotos - 2)) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd",
        fontSize: 11
      }
    }, "\u2014")), esAdmin && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, p.tipoDocumento === "Consumidor Final" ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#ccc"
      }
    }, "Consumidor") : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: esCFp ? "#FFF3CD" : "#D4EDDA",
        color: esCFp ? "#856404" : "#155724",
        padding: "2px 7px",
        borderRadius: 20,
        fontWeight: 700
      }
    }, esCFp ? "⚠️ CF pend." : "✅ CF")), esAdmin && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px",
        whiteSpace: "nowrap"
      }
    }, p.precio ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#2C1654",
        fontSize: 13
      }
    }, fmt$(p.precio)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: saldo > 0 ? "#E63946" : "#28A745"
      }
    }, saldo > 0 ? "Resta " + fmt$(saldo) : "✅ Pagado")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd"
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px",
        whiteSpace: "nowrap"
      }
    }, p.fechaEntrega ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: urgent ? "#E63946" : "#555",
        fontWeight: urgent ? 700 : 400
      }
    }, urgent ? "⚠️ " : "", p.fechaEntrega), dias !== null && !["Entregado", "Cancelado"].includes(p.estatus) && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: dias < 0 ? "#E63946" : dias <= 2 ? "#FD7E14" : "#aaa"
      }
    }, dias < 0 ? "Venció " + Math.abs(dias) + "d" : dias === 0 ? "¡Hoy!" : dias + "d")) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ddd",
        fontSize: 11
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px"
      }
    }, /*#__PURE__*/React.createElement("select", {
      value: p.estatus,
      onChange: e => cambiarEstatus(p.id, e.target.value),
      style: {
        border: "none",
        background: (EC[p.estatus] || {}).bg,
        color: (EC[p.estatus] || {}).fg,
        padding: "3px 8px",
        borderRadius: 20,
        fontWeight: 700,
        fontSize: 10,
        cursor: "pointer"
      }
    }, ESTATUS.map(e => /*#__PURE__*/React.createElement("option", {
      key: e
    }, e)))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px",
        borderRadius: "0 10px 10px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3
      }
    }, /*#__PURE__*/React.createElement(WABtn, {
      p: p,
      esAdmin: esAdmin
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => imprimirPedido(p, esAdmin),
      title: "Imprimir hoja",
      style: {
        padding: "4px 8px",
        borderRadius: 6,
        border: "1.5px solid #d8c0f0",
        background: "#f8f4ff",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\uD83D\uDDA8\uFE0F"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(p),
      style: {
        padding: "4px 8px",
        borderRadius: 6,
        border: "1.5px solid #e0e0e0",
        background: "#fff",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\u270F\uFE0F"), esAdmin && /*#__PURE__*/React.createElement("button", {
      onClick: () => setConf(p.id),
      style: {
        padding: "4px 7px",
        borderRadius: 6,
        border: "1.5px solid #fdd",
        background: "#fff8f8",
        cursor: "pointer",
        fontSize: 11
      }
    }, "\uD83D\uDDD1\uFE0F"))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cards-pedidos",
    style: {
      flexDirection: "column",
      display: "none"
    }
  }, filtrados.map(p => /*#__PURE__*/React.createElement(CardPedido, {
    key: p.id,
    p: p,
    esAdmin: esAdmin,
    onVer: setDet,
    onEditar: setModal,
    onCambiarEstatus: cambiarEstatus,
    onEliminar: setConf,
    onDuplicar: p => {
      const copia = Object.assign({}, p, {
        id: nextId,
        fecha: new Date().toISOString().split("T")[0],
        estatus: "Tomado",
        anticipo: "",
        abonos: [],
        fechaEntrega: ""
      });
      setModal(copia);
    },
    onImprimir: p => imprimirPedido(p, esAdmin),
    onVerFoto: v => setVisor(v)
  })))))), renderBottomNav(), masOpen && /*#__PURE__*/React.createElement("div", {
    onClick: () => setMasOpen(false),
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 150
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "#2C1654",
      borderRadius: "16px 16px 0 0",
      width: "100%",
      maxWidth: 480,
      padding: "16px 8px",
      paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 4,
      background: "#9B59B6",
      borderRadius: 2,
      margin: "0 auto 14px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 4
    }
  }, NAV.filter(item => !["pedidos", "bordados", "cuellos", "inventario"].includes(item.id)).map(item => {
    const bloqueado = item.pronto || item.soloAdmin && !esAdmin;
    const activo = seccion === item.id;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      onClick: () => {
        if (bloqueado) return;
        setSec(item.id);
        setMasOpen(false);
      },
      style: {
        border: "none",
        background: activo ? "rgba(155,89,182,0.25)" : "transparent",
        cursor: bloqueado ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "12px 4px",
        borderRadius: 10,
        opacity: bloqueado ? 0.3 : 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 26
      }
    }, item.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: activo ? "#CE93D8" : "#bbb"
      }
    }, item.label));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRol(null);
      setMasOpen(false);
    },
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      padding: "12px 4px",
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 26
    }
  }, "\uD83D\uDEAA"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#bbb"
    }
  }, "Salir")))))), modalArchivar && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 28,
      maxWidth: 420,
      width: "100%",
      boxShadow: "0 24px 60px rgba(0,0,0,0.3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 8
    }
  }, "\uD83D\uDCE6"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 6px",
      color: "#2C1654",
      fontSize: 17
    }
  }, "Pedido vencido \u2014 \xBFfue entregado?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: "0 0 4px"
    }
  }, "El pedido de ", /*#__PURE__*/React.createElement("strong", null, modalArchivar.cliente), " ya venci\xF3 su fecha de entrega."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 12
    }
  }, "Si fue entregado, se archivar\xE1 autom\xE1ticamente.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f8f4ff",
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#2C1654"
    }
  }, "N\xB0", String(modalArchivar.id).padStart(4, "0"), " \u2014 ", modalArchivar.cliente), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#666",
      marginTop: 2
    }
  }, modalArchivar.tipoPrenda), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#C0392B",
      fontWeight: 700,
      marginTop: 2
    }
  }, "Fecha pactada: ", modalArchivar.fechaEntrega)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 4,
      display: "block"
    }
  }, "\xBFCu\xE1ndo fue entregado?"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    id: "fecha-entrega-real",
    defaultValue: hoy(),
    style: {
      width: "100%",
      padding: "9px 12px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      fontSize: 14,
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const f = document.getElementById("fecha-entrega-real") ? document.getElementById("fecha-entrega-real").value : hoy();
      archivarPedido(modalArchivar, f);
    },
    style: {
      padding: "11px",
      borderRadius: 8,
      border: "none",
      background: "#28A745",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14
    }
  }, "\u2705 S\xED, fue entregado \u2014 archivar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const actualizado = {
        ...modalArchivar,
        estatus: "Listo"
      };
      setPedidos(prev => prev.map(x => x.id === modalArchivar.id ? actualizado : x));
      gsGuardar(actualizado);
      setModalArchivar(null);
    },
    style: {
      padding: "11px",
      borderRadius: 8,
      border: "1.5px solid #E67E22",
      background: "#fff",
      color: "#E67E22",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13
    }
  }, "\uD83D\uDD50 Todav\xEDa no \u2014 cambiar a \"Listo\""), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalArchivar(null),
    style: {
      padding: "9px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      color: "#aaa",
      cursor: "pointer",
      fontSize: 12
    }
  }, "Recordar despu\xE9s")))), modalIA && /*#__PURE__*/React.createElement(ModalAsistenteIA, {
    rol: rol,
    onCrearPedido: p => {
      setModalIA(false);
      guardarPedido(p, true);
    },
    onAbrir: p => {
      setModalIA(false);
      setModal(p || "nuevo");
    },
    onCerrar: () => setModalIA(false)
  }), modal && /*#__PURE__*/React.createElement(Modal, {
    title: modal === "nuevo" ? "✂️ Nuevo Pedido" : "✏️ Editar N°" + String(modal.id).padStart(4, "0"),
    onClose: () => setModal(null)
  }, modal === "nuevo" && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(null);
      setModalIA(true);
    },
    style: {
      width: "100%",
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid #1A5276",
      background: "#EBF5FB",
      color: "#1A5276",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, "\uD83E\uDD16 Registrar con Asistente IA (voz o texto)"), /*#__PURE__*/React.createElement(FormPedido, {
    initial: modal !== "nuevo" ? modal : null,
    onSave: guardarPedido,
    onCancel: () => setModal(null),
    rol: rol,
    pedidosExistentes: pedidos,
    clientes: clientes,
    catalogo: catalogo
  })), detalle && /*#__PURE__*/React.createElement(Modal, {
    title: "📋 N°" + String(detalle.id).padStart(4, "0") + " — " + detalle.cliente,
    onClose: () => setDet(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, "Estatus"), /*#__PURE__*/React.createElement("select", {
    value: detalle.estatus,
    onChange: e => {
      const nuevo = {
        ...detalle,
        estatus: e.target.value
      };
      setDet(nuevo);
      cambiarEstatus(detalle.id, e.target.value);
    },
    style: {
      width: "100%",
      padding: "9px 10px",
      borderRadius: 8,
      border: "1.5px solid " + ((EC[detalle.estatus] || {}).bg || "#e0e0e0"),
      background: (EC[detalle.estatus] || {}).bg || "#f5f5f5",
      color: (EC[detalle.estatus] || {}).fg || "#333",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      outline: "none"
    }
  }, ESTATUS.map(e => /*#__PURE__*/React.createElement("option", {
    key: e
  }, e)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#888",
      textTransform: "uppercase",
      marginBottom: 4
    }
  }, "Costurera"), /*#__PURE__*/React.createElement("select", {
    value: detalle.costurera || "(Sin asignar)",
    onChange: e => {
      const nuevo = {
        ...detalle,
        costurera: e.target.value
      };
      setDet(nuevo);
      setPedidos(prev => prev.map(p => p.id === detalle.id ? nuevo : p));
      gsGuardar(nuevo);
    },
    style: {
      width: "100%",
      padding: "9px 10px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#f8f4ff",
      color: "#2C1654",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      outline: "none"
    }
  }, COLABORADORAS.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c))))), [["Cliente", (detalle.tipoCliente === "escuela" ? "🏫 " : detalle.tipoCliente === "empresa" ? "🏢 " : "") + detalle.cliente], detalle.nombreContacto ? ["Contacto", detalle.nombreContacto] : null, ["Teléfono", detalle.telefono], ["Prenda", detalle.tipoPrenda], ["Tallas", detalle.tallasItems && detalle.tallasItems.length ? "§chips§" : resumenTallas(detalle)], detalle.personas && detalle.personas.length ? ["👥 Beneficiarios", detalle.personas.length + " persona" + (detalle.personas.length !== 1 ? "s" : "")] : null, ["Tela", detalle.tela], esAdmin ? ["Facturación", detalle.tipoDocumento] : null, esAdmin && detalle.nit ? ["NIT", detalle.nit] : null, esAdmin ? ["Precio", fmt$(detalle.precio)] : null, esAdmin ? ["Abonado", fmt$((detalle.abonos || []).length > 0 ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0) : parseFloat(detalle.anticipo || 0))] : null, esAdmin ? ["Saldo", fmt$(parseFloat(detalle.precio || 0) - ((detalle.abonos || []).length > 0 ? detalle.abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0) : parseFloat(detalle.anticipo || 0)))] : null, ["Entrega", detalle.fechaEntrega], ["Notas", detalle.notas]].filter(Boolean).map(([k, v]) => !v ? null : /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "9px 0",
      borderBottom: "1px solid #f5f5f5",
      gap: 10,
      flexWrap: k === "Tallas" ? "wrap" : "nowrap",
      flexDirection: k === "Tallas" ? "column" : "row"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#aaa",
      fontWeight: 700,
      whiteSpace: "nowrap"
    }
  }, k), k === "Tallas" && v === "§chips§" ? /*#__PURE__*/React.createElement(TallasChips, {
    items: detalle.tallasItems,
    compact: false
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#333",
      textAlign: "right",
      fontWeight: 600
    }
  }, v))), (detalle.abonos || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#27AE60",
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "\uD83D\uDCB5 Abonos registrados"), (detalle.abonos || []).map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 8,
      padding: "5px 0",
      borderBottom: "1px solid #f5f5f5",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: "#155724"
    }
  }, "$", parseFloat(a.monto).toFixed(2)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      background: "#d4edda",
      color: "#155724",
      padding: "1px 7px",
      borderRadius: 10,
      fontWeight: 700
    }
  }, a.metodo), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#666",
      flex: 1
    }
  }, a.nota), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#aaa"
    }
  }, a.fecha)))), (detalle.imagenes || []).filter(i => imgSrc(i)).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#28A745",
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 8
    }
  }, "\u2601\uFE0F Im\xE1genes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, (detalle.imagenes || []).filter(i => imgSrc(i)).map((img, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: imgSrc(img),
    alt: img.nombre,
    style: {
      width: 80,
      height: 80,
      borderRadius: 8,
      objectFit: "cover",
      border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e0e0e0"),
      cursor: "zoom-in"
    },
    onClick: () => setVisor({
      imgs: (detalle.imagenes || []).filter(x => imgSrc(x)).map(imgSrc),
      idx: i
    })
  }), img.driveUrl && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 3,
      right: 3,
      background: "rgba(40,167,69,0.9)",
      borderRadius: 4,
      padding: "1px 4px",
      fontSize: 9,
      color: "#fff",
      fontWeight: 700
    }
  }, "\u2601\uFE0F"))))), (detalle.personas || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#1A5276",
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "\uD83D\uDC65 Beneficiarios"), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#EBF5FB"
    }
  }, ["#", "Nombre", "Cargo", "Gafete", "Talla"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "5px 8px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 700,
      color: "#1A5276",
      textTransform: "uppercase"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, (detalle.personas || []).map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: p.id || i,
    style: {
      borderBottom: "1px solid #f0f8ff",
      background: i % 2 === 0 ? "#fff" : "#f8fcff"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      color: "#aaa"
    }
  }, i + 1), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      fontWeight: 700,
      color: "#2C1654"
    }
  }, p.nombre || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      color: "#555"
    }
  }, p.cargo || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      textAlign: "center",
      color: "#555"
    }
  }, p.gafete || "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "5px 8px",
      textAlign: "center"
    }
  }, p.talla ? /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#1A5276",
      color: "#fff",
      borderRadius: 10,
      padding: "2px 8px",
      fontWeight: 700,
      fontSize: 11
    }
  }, p.talla) : "—"))))))), (() => {
    const bVinc = bordados.find(b => String(b.confRef) === String(detalle.id));
    const cVinc = cuellos.find(cu => String(cu.confRef) === String(detalle.id));
    const pConf = parseFloat(detalle.precio || 0);
    const pBord = bVinc ? parseFloat(bVinc.precioT || 0) : 0;
    const pCuel = cVinc ? parseFloat(cVinc.precioT || 0) : 0;
    return /*#__PURE__*/React.createElement(React.Fragment, null, true && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, bVinc ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0fff8",
        border: "1.5px solid #1A5F5A",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: "#1A5F5A"
      }
    }, "\uD83E\uDEA1 Bordado \u2014 BORD-", String(bVinc.id).padStart(3, "0")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#555",
        marginTop: 2
      }
    }, bVinc.estatus, bVinc.precioT ? " · $" + parseFloat(bVinc.precioT).toFixed(2) : "")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setSec("bordados");
        setDet(null);
      },
      style: {
        padding: "6px 12px",
        borderRadius: 7,
        border: "none",
        background: "#1A5F5A",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 11
      }
    }, "Ver \u2192")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f8f8f8",
        border: "1.5px dashed #ccc",
        borderRadius: 10,
        padding: "10px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#888"
      }
    }, "\uD83E\uDEA1 Lleva bordado \u2014 sin registrar a\xFAn"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const nb = {
          id: nextBordId,
          cliente: detalle.cliente,
          telefono: detalle.telefono || "",
          confRef: String(detalle.id),
          soporte: detalle.tipoPrenda || "",
          estatus: "Tomado",
          fecha: new Date().toISOString().split("T")[0],
          anticipo: "",
          precioU: "",
          precioT: "",
          diseño: "",
          puntadas: "",
          hilos: "",
          posicion: "Pecho izquierdo",
          estadoDiseño: "Pendiente diseñar",
          esNuevo: "nuevo",
          abonos: [],
          notas: "Creado desde confección N°" + String(detalle.id).padStart(4, "0")
        };
        setBordados(prev => [...prev, nb]);
        setNextBordId(n => n + 1);
        gsBordGuardar(nb);
        setSec("bordados");
        setDet(null);
      },
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "#1A5F5A",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12
      }
    }, "+ Crear bordado"))), true && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, cVinc ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff4e6",
        border: "1.5px solid #B85C00",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: "#B85C00"
      }
    }, "\uD83E\uDDF6 Cuello \u2014 CUEL-", String(cVinc.id).padStart(3, "0")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#555",
        marginTop: 2
      }
    }, cVinc.estatus, cVinc.precioT ? " · $" + parseFloat(cVinc.precioT).toFixed(2) : "")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setSec("cuellos");
        setDet(null);
      },
      style: {
        padding: "6px 12px",
        borderRadius: 7,
        border: "none",
        background: "#B85C00",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 11
      }
    }, "Ver \u2192")) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f8f8f8",
        border: "1.5px dashed #ccc",
        borderRadius: 10,
        padding: "10px 14px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#888"
      }
    }, "\uD83E\uDDF6 Lleva cuello tejido \u2014 sin registrar a\xFAn"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const nc = {
          id: nextCuelId,
          cliente: detalle.cliente,
          telefono: detalle.telefono || "",
          confRef: String(detalle.id),
          cantidad: "1",
          material: "Acrílico",
          calibre: "Medio",
          estatus: "Tomado",
          fecha: new Date().toISOString().split("T")[0],
          anticipo: "",
          precioU: "",
          precioT: "",
          cuello: {
            activa: true,
            largo: "",
            ancho: "",
            colores: ""
          },
          puno: {
            activa: false,
            largo: "",
            ancho: "",
            colores: ""
          },
          banda: {
            activa: false,
            largo: "",
            ancho: "",
            colores: ""
          },
          abonos: [],
          notas: "Creado desde confección N°" + String(detalle.id).padStart(4, "0")
        };
        setCuellos(prev => [...prev, nc]);
        setNextCuelId(n => n + 1);
        gsCuelGuardar(nc);
        setSec("cuellos");
        setDet(null);
      },
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "#B85C00",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 12
      }
    }, "+ Crear cuello"))), esAdmin && (pBord > 0 || pCuel > 0) && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0ebff",
        border: "1.5px solid #9B59B6",
        borderRadius: 10,
        padding: "10px 14px",
        marginTop: 4,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 800,
        color: "#9B59B6",
        textTransform: "uppercase",
        marginBottom: 6
      }
    }, "Resumen de precios"), pConf > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u2702\uFE0F Confecci\xF3n"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "$", pConf.toFixed(2))), pBord > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDEA1 Bordado"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "$", pBord.toFixed(2))), pCuel > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        marginBottom: 3
      }
    }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDDF6 Cuello"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "$", pCuel.toFixed(2))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 14,
        fontWeight: 900,
        color: "#2C1654",
        borderTop: "1px solid #ddd",
        paddingTop: 6,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", null, "$", (pConf + pBord + pCuel).toFixed(2)))));
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, esAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => exportarPedidoPDF(detalle, "confeccion"),
    style: {
      padding: "9px 12px",
      borderRadius: 8,
      border: "none",
      background: "#1D6A3A",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12
    }
  }, "\uD83D\uDCC4 PDF"), /*#__PURE__*/React.createElement("button", {
    onClick: () => imprimirPedido(detalle, esAdmin),
    style: {
      ...BTN("#6c3483"),
      padding: "9px 16px",
      fontSize: 13
    }
  }, "\uD83D\uDDA8\uFE0F Imprimir"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(detalle);
      setDet(null);
    },
    style: BTN("#9B59B6")
  }, "\u270F\uFE0F Editar"))), visor && (() => {
    const vImgs = visor.imgs;
    const vIdx = visor.idx;
    const prev = () => setVisor(v => ({
      ...v,
      idx: (v.idx - 1 + vImgs.length) % vImgs.length
    }));
    const next = () => setVisor(v => ({
      ...v,
      idx: (v.idx + 1) % vImgs.length
    }));
    const src = vImgs[vIdx];
    let touchX = null;
    const onTouchStart = e => {
      touchX = e.touches[0].clientX;
    };
    const onTouchEnd = e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) {
        dx < 0 ? next() : prev();
      }
      touchX = null;
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        padding: "16px 8px"
      },
      onTouchStart: onTouchStart,
      onTouchEnd: onTouchEnd
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 700,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        padding: "0 8px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        opacity: .7
      }
    }, vIdx + 1, " / ", vImgs.length), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: src,
      target: "_blank",
      rel: "noreferrer",
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        background: "rgba(155,89,182,0.8)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
        textDecoration: "none"
      }
    }, "\uD83D\uDD17 Drive"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setVisor(null),
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "rgba(255,255,255,0.15)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer"
      }
    }, "\u2715"))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: "100%",
        maxWidth: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        minHeight: 0
      }
    }, vImgs.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: prev,
      style: {
        position: "absolute",
        left: 0,
        zIndex: 10,
        background: "rgba(255,255,255,0.15)",
        border: "none",
        color: "#fff",
        fontSize: 28,
        fontWeight: 700,
        cursor: "pointer",
        borderRadius: 8,
        padding: "12px 14px",
        backdropFilter: "blur(4px)"
      }
    }, "\u2039"), /*#__PURE__*/React.createElement("img", {
      src: src,
      style: {
        maxWidth: "calc(100% - 80px)",
        maxHeight: "75vh",
        borderRadius: 10,
        objectFit: "contain",
        userSelect: "none",
        pointerEvents: "none"
      }
    }), vImgs.length > 1 && /*#__PURE__*/React.createElement("button", {
      onClick: next,
      style: {
        position: "absolute",
        right: 0,
        zIndex: 10,
        background: "rgba(255,255,255,0.15)",
        border: "none",
        color: "#fff",
        fontSize: 28,
        fontWeight: 700,
        cursor: "pointer",
        borderRadius: 8,
        padding: "12px 14px",
        backdropFilter: "blur(4px)"
      }
    }, "\u203A")), vImgs.length > 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginTop: 12,
        overflowX: "auto",
        padding: "4px 8px",
        maxWidth: "100%"
      }
    }, vImgs.map((s, i) => /*#__PURE__*/React.createElement("img", {
      key: i,
      src: s,
      onClick: () => setVisor(v => ({
        ...v,
        idx: i
      })),
      style: {
        width: 52,
        height: 52,
        borderRadius: 6,
        objectFit: "cover",
        cursor: "pointer",
        border: i === vIdx ? "2.5px solid #9B59B6" : "2px solid transparent",
        opacity: i === vIdx ? 1 : 0.55,
        flexShrink: 0,
        transition: "opacity .2s"
      }
    }))));
  })(), errorFotos.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 28,
      maxWidth: 380,
      width: "100%",
      boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 8,
      textAlign: "center"
    }
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      color: "#2C1654",
      textAlign: "center"
    }
  }, "Fotos no subidas a Drive"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: "0 0 14px",
      textAlign: "center"
    }
  }, "El pedido se guard\xF3, pero estas fotos no pudieron subirse. Solo se ver\xE1n en este dispositivo."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFF3CD",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 16
    }
  }, errorFotos.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 12,
      color: "#856404",
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("strong", null, e.nombre), ": ", e.err))), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 12,
      marginBottom: 16
    }
  }, "Para subirlas, edita el pedido y vuelve a guardar."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setErrorFotos([]),
    style: {
      ...BTN("#9B59B6"),
      width: "100%"
    }
  }, "Entendido"))), modalActMedidas && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: 28,
      maxWidth: 400,
      width: "100%",
      boxShadow: "0 24px 60px rgba(0,0,0,0.3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 8
    }
  }, "\uD83D\uDCD0"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 6px",
      color: "#1A5276",
      fontSize: 17
    }
  }, "\xBFActualizar medidas del cliente?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 13,
      margin: 0
    }
  }, "Las medidas de este pedido son diferentes a las guardadas para ", /*#__PURE__*/React.createElement("strong", null, modalActMedidas.cliente.nombre), ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f4ff",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6
    }
  }, MEDIDAS_DEF.filter(m => modalActMedidas.pedido.medidas && modalActMedidas.pedido.medidas[m.k]).map(m => /*#__PURE__*/React.createElement("div", {
    key: m.k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#888",
      fontWeight: 700
    }
  }, m.l, ":"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#1A5276",
      fontWeight: 800
    }
  }, modalActMedidas.pedido.medidas[m.k], " cm"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const cli = {
        ...modalActMedidas.cliente,
        medidas: {
          ...(modalActMedidas.cliente.medidas || {}),
          ...modalActMedidas.pedido.medidas
        }
      };
      setClientes(prev => prev.map(c => c.id === cli.id ? cli : c));
      gsClientesGuardar(cli);
      setModalActMedidas(null);
    },
    style: {
      padding: "11px",
      borderRadius: 8,
      border: "none",
      background: "#1A5276",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14
    }
  }, "\u2705 S\xED, actualizar medidas del cliente"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalActMedidas(null),
    style: {
      padding: "10px",
      borderRadius: 8,
      border: "1.5px solid #e0e0e0",
      background: "#fff",
      color: "#888",
      cursor: "pointer",
      fontSize: 13
    }
  }, "No, solo para este pedido")))), confirmar && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: 28,
      maxWidth: 340,
      textAlign: "center",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 10
    }
  }, "\uD83D\uDDD1\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 8px",
      color: "#2C1654"
    }
  }, "\xBFEliminar pedido?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#888",
      fontSize: 14,
      margin: "0 0 20px"
    }
  }, "Esta acci\xF3n no se puede deshacer."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setConf(null),
    style: BTN("#aaa")
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => eliminar(confirmar),
    style: BTN("#E63946")
  }, "S\xED, eliminar")))), /*#__PURE__*/React.createElement(Toaster, null), /*#__PURE__*/React.createElement(ConfirmDialog, null));
}
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary catch:", error, info);
  }
  render() {
    if (this.state.error) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#F7F4FA",
          fontFamily: "system-ui, sans-serif"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          background: "#fff",
          padding: 28,
          borderRadius: 14,
          boxShadow: "0 6px 20px rgba(0,0,0,0.08)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 52,
          marginBottom: 8
        }
      }, "💥"), /*#__PURE__*/React.createElement("h2", {
        style: {
          color: "#2C1654",
          margin: "0 0 8px",
          fontFamily: "Georgia, serif"
        }
      }, "Algo se rompió"), /*#__PURE__*/React.createElement("p", {
        style: {
          color: "#666",
          fontSize: 13,
          margin: "0 0 16px"
        }
      }, "La app encontró un error inesperado. Probá recargar — tus datos están guardados."), /*#__PURE__*/React.createElement("div", {
        style: {
          background: "#FFF3CD",
          padding: "10px 12px",
          borderRadius: 8,
          fontSize: 11,
          color: "#856404",
          marginBottom: 18,
          fontFamily: "monospace",
          textAlign: "left",
          wordBreak: "break-word",
          maxHeight: 100,
          overflow: "auto"
        }
      }, String(this.state.error && this.state.error.message || this.state.error)), /*#__PURE__*/React.createElement("button", {
        onClick: () => window.location.reload(),
        style: {
          padding: "13px 24px",
          borderRadius: 10,
          border: "none",
          background: "#9B59B6",
          color: "#fff",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          width: "100%"
        }
      }, "🔄 Recargar app")));
    }
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById("root")).render( /*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(App, null)));

