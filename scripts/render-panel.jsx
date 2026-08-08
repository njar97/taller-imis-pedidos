// Renderiza el panel de documentos a HTML estático para poder verlo sin
// entrar a la app (que pide código por correo). Archivo de trabajo.
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import PanelDocumentos from "../src/PanelDocumentos.jsx";

const pedido = {
  id: 60,
  cliente: "Escuela Parvularia Albino Luciani (EPAL)",
  tipoPrenda: "Camiseta Intramuros 2026 (DTF)",
  fechaEntrega: "2026-08-20",
  personas: [{ nombre: "Ana", talla: "6", color: "verde" }],
};

const noop = () => {};
const cuerpo = renderToStaticMarkup(
  <PanelDocumentos
    pedido={pedido}
    esAdmin
    opcionesExtra={[{ id: "color", label: "Por color" }]}
    capturaTok={null}
    generandoLink={false}
    onClose={noop} onHojaTaller={noop} onCantidades={noop} onCorte={noop}
    onAgrupada={noop} onExcelMedidas={noop} onPDF={noop} onEntrega={noop}
    onLinkMedidas={noop} onCalendario={noop}
  />
);

const salida = process.argv[2] || "panel.html";
writeFileSync(salida, `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Panel de documentos</title>
<style>body{margin:0;background:#e9e7e7;font-family:'Segoe UI',system-ui,sans-serif}</style>
</head><body>${cuerpo}</body></html>`, "utf8");
console.log(salida, Math.round(cuerpo.length / 1024) + " KB");
