// Cache de imágenes locales en IndexedDB.
// Permite que las fotos sigan disponibles offline o entre reloads
// antes de que se suban al servidor.

const IDB_NAME = "taller_imis_db";
const IDB_VER = 1;
const IDB_STORE = "imagenes";

let _idb = null;

function abrirIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, { keyPath: "pedidoId" });
    req.onsuccess = e => {
      _idb = e.target.result;
      res(_idb);
    };
    req.onerror = e => rej(e.target.error);
  });
}

export async function idbGuardar(pedidoId, imagenes) {
  const db = await abrirIDB();
  return new Promise(res => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const st = tx.objectStore(IDB_STORE);
    const imgs = (imagenes || []).filter(i => i.data || i.driveUrl);
    if (imgs.length) {
      const req = st.put({ pedidoId: String(pedidoId), imagenes: imgs });
      req.onsuccess = () => res();
      req.onerror = () => res();
    } else {
      const req = st.delete(String(pedidoId));
      req.onsuccess = () => res();
      req.onerror = () => res();
    }
  });
}

export async function idbLeerTodas() {
  const db = await abrirIDB();
  return new Promise(res => {
    const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).getAll();
    req.onsuccess = e => res(e.target.result || []);
    req.onerror = () => res([]);
  });
}

export async function idbBorrar(pedidoId) {
  const db = await abrirIDB();
  return new Promise(res => {
    const req = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).delete(String(pedidoId));
    req.onsuccess = () => res();
    req.onerror = () => res();
  });
}
