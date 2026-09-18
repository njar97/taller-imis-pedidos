// Datos fiscales formales de las empresas del taller — usados en PDFs de
// cotización y facturación.
//
// Hay DOS emisores (18-sep-2026): UDP Confecciones IMIS y Nelson Javier
// (Carymel). Cada pedido/cotización guarda con cuál sale (`pedido.emisor`,
// "imis" | "jav"); antes todo salía a nombre de IMIS.
//
// FUENTE DE VERDAD del perfil IMIS: taller_config (key='empresa'). La app
// carga el valor al iniciar y lo deja en window.__TALLER_CONFIG__.empresa.
// Si NO hay valor guardado, se usa el default que vino del DTE oficial.
//
// `EMPRESA` (named export) es una getter dinámica — devuelve siempre los
// datos del emisor ACTIVO (ver setEmpresaActiva). NO acceder a propiedades
// de EMPRESA en módulos top-level; siempre dentro de funciones / handlers.

const DEFAULT = {
  razonSocial: "UDP CONFECCIONES IMIS",
  nit: "0315-101011-101-2",
  nrc: "211590-0",
  actividadEconomica: "Fabricación de prendas de vestir, excepto prendas de piel",
  direccion: "Sonsonate, Col. Santa Marta, Av. Centroamericana, Casa N.° 5-A",
  telefonos: ["2451-1620", "6015-8047", "7957-0695"],
  email: "confecciones_imis@hotmail.com",
  representanteLegal: {
    nombre: "Imelda Del Carmen Mancía De Ramírez",
    dui: "0158-3577-9",
    cargo: "Representante Legal",
  },
};

// Perfil de Javier (persona natural, nombre comercial Carymel). Sale del
// mismo DTE que emite el puente: NIT 0315-120297-104-0, NRC 315522-0.
const JAV = {
  razonSocial: "NELSON JAVIER RAMÍREZ MANCÍA",
  nombreComercial: "Carymel Bazar y Confección",
  nit: "0315-120297-104-0",
  nrc: "315522-0",
  actividadEconomica: "Fabricación de prendas de vestir para ambos sexos",
  direccion: "Sonsonate, Col. Santa Marta, Av. Centroamericana, Casa N.° 9-A",
  telefonos: ["7866-9963"],
  email: "njrmancia@gmail.com",
  representanteLegal: {
    nombre: "Nelson Javier Ramírez Mancía",
    dui: "05490264-4",
    cargo: "Propietario",
  },
};

export const EMPRESA_DEFAULT = DEFAULT;
export const EMISOR_KEYS = ["imis", "jav"];

// Perfil IMIS: config de BD si está, sino default (campos vacíos caen al default).
function perfilImis() {
  if (typeof window === "undefined") return DEFAULT;
  const cfg = window.__TALLER_CONFIG__?.empresa;
  if (!cfg || typeof cfg !== "object") return DEFAULT;
  return {
    razonSocial: cfg.razonSocial || DEFAULT.razonSocial,
    nit: cfg.nit || DEFAULT.nit,
    nrc: cfg.nrc || DEFAULT.nrc,
    actividadEconomica: cfg.actividadEconomica || DEFAULT.actividadEconomica,
    direccion: cfg.direccion || DEFAULT.direccion,
    telefonos: Array.isArray(cfg.telefonos) && cfg.telefonos.length > 0
      ? cfg.telefonos
      : DEFAULT.telefonos,
    email: cfg.email || DEFAULT.email,
    representanteLegal: {
      nombre: cfg.representanteLegal?.nombre || DEFAULT.representanteLegal.nombre,
      dui: cfg.representanteLegal?.dui || DEFAULT.representanteLegal.dui,
      cargo: cfg.representanteLegal?.cargo || DEFAULT.representanteLegal.cargo,
    },
  };
}

// Devuelve el perfil del emisor pedido ("imis" | "jav"); sin argumento, el activo.
export function getEmpresa(emisor) {
  const k = emisor || _activo;
  return k === "jav" ? JAV : perfilImis();
}

// Emisor activo para los PDFs que usan `EMPRESA`. Se fija al empezar a
// imprimir un pedido/cotización con el emisor guardado en ese pedido.
let _activo = "imis";
export function setEmpresaActiva(emisor) {
  _activo = emisor === "jav" ? "jav" : "imis";
  return _activo;
}
export const empresaActiva = () => _activo;

// Proxy: cualquier acceso a EMPRESA.* devuelve el valor actual de
// getEmpresa(). Esto permite seguir escribiendo `EMPRESA.nit` en los
// PDFs sin tener que cambiar todos los call-sites a `getEmpresa().nit`.
export const EMPRESA = new Proxy({}, {
  get(_t, prop) {
    return getEmpresa()[prop];
  },
});
