// Datos fiscales formales del taller — usados en PDFs de cotización
// y facturación.
//
// FUENTE DE VERDAD: taller_config (key='empresa'). La app carga el
// valor al iniciar y lo deja en window.__TALLER_CONFIG__.empresa.
// Si NO hay valor guardado (primera vez), se usa este default que
// vino del DTE oficial.
//
// `EMPRESA` (named export) es una getter dinámica — devuelve siempre
// los datos actuales (config si hay, default si no). NO acceder a
// propiedades de EMPRESA en módulos top-level; siempre dentro de
// funciones / handlers para que se evalúe en tiempo de uso.

const DEFAULT = {
  razonSocial: "UDP CONFECCIONES IMIS",
  nit: "0315-101011-101-2",
  nrc: "211590-0",
  actividadEconomica: "Fabricación de productos textiles",
  direccion: "Sonsonate, Col. Santa Marta, Av. Centroamericana, Casa N.° 5-A",
  telefonos: ["2451-1620", "7866-9963", "7957-0695"],
  email: "confecciones_imis@hotmail.com",
  representanteLegal: {
    nombre: "Imelda Del Carmen Mancía De Ramírez",
    dui: "0158-3577-9",
    cargo: "Representante Legal",
  },
};

export const EMPRESA_DEFAULT = DEFAULT;

// Devuelve la config de empresa actual (de BD si está, sino default).
export function getEmpresa() {
  if (typeof window === "undefined") return DEFAULT;
  const cfg = window.__TALLER_CONFIG__?.empresa;
  if (!cfg || typeof cfg !== "object") return DEFAULT;
  // Merge profundo simple: campos vacíos caen al default.
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

// Proxy: cualquier acceso a EMPRESA.* devuelve el valor actual de
// getEmpresa(). Esto permite seguir escribiendo `EMPRESA.nit` en los
// PDFs sin tener que cambiar todos los call-sites a `getEmpresa().nit`.
export const EMPRESA = new Proxy({}, {
  get(_t, prop) {
    return getEmpresa()[prop];
  },
});
