// Helpers para generar nombres de archivo PDF "inteligentes".
//
// Cuando el user usa "Imprimir → Guardar como PDF" en el navegador, el
// nombre default del archivo viene del <title> del documento. Si
// seteamos un title tipo "COT-0017_Ministerio-de-Cultura_2026-05-22",
// el archivo se guarda con ese nombre — el user no tiene que tipearlo.

// Convierte "Ministerio de Cultura" → "Ministerio-de-Cultura"
// Quita tildes, normaliza, reemplaza espacios y especiales por guion.
function slugify(s) {
  if (!s) return "";
  return String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^a-zA-Z0-9\s-]/g, "")                   // solo alfanumérico
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);                                      // máx 40 chars
}

const hoyStr = () => new Date().toISOString().split("T")[0];

// Genera nombre inteligente: "COT-0017_Ministerio-de-Cultura_2026-05-22"
// El user puede tener nombre largo de cliente → lo recortamos.
export function nombrePDF(prefijo, idNumero, cliente, opts = {}) {
  const num = String(idNumero).padStart(4, "0");
  const cli = slugify(cliente) || "cliente";
  const fecha = opts.fecha || hoyStr();
  return `${prefijo}-${num}_${cli}_${fecha}`;
}
