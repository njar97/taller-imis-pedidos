// PDF standalone de "Declaración de capacidad instalada".
// Pensado para anexar a ofertas técnicas de COMPRASAL u otras
// licitaciones que pidan declarar inventario de equipo + recurso
// humano. Se genera on-demand desde ⚙️ Configuración y NO está
// ligado a una cotización específica — la fecha es la del día.

import { EMPRESA } from "./empresa.js";
import { leerEquipos } from "./capacidad.js";

export async function imprimirDeclaracionCapacidad() {
  const equipos = await leerEquipos();
  const propios = equipos.filter(e => e.tipo === "propio");
  const subc    = equipos.filter(e => e.tipo === "subcontratado");

  const fecha = new Date().toLocaleDateString("es-SV", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const cfg = (typeof window !== "undefined" ? window.__TALLER_CONFIG__ : null) || {};
  const firma = cfg.firma?.url;
  const sello = cfg.sello?.url;

  const filaEq = (e) => `
    <tr>
      <td style="padding:7px 8px;border-bottom:1px solid #eee;text-align:center;width:70px;">
        ${e.foto_url
          ? `<img src="${e.foto_url}" style="width:55px;height:55px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" alt="" />`
          : `<div style="width:55px;height:55px;border-radius:4px;background:#f5f5f5;color:#bbb;display:inline-flex;align-items:center;justify-content:center;font-size:18px;">📷</div>`}
      </td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-weight:700;color:#2C1654;">${e.nombre}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center;font-weight:700;">${e.cantidad}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:11px;color:#555;">${e.especificacion || "—"}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:11px;color:#666;">${e.proposito || "—"}</td>
    </tr>`;

  const titulo = `Declaracion capacidad - ${EMPRESA.razonSocial}`;
  const w = window.open("", "_blank", "width=820,height=1100");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${titulo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#222;padding:30px 40px;font-size:13px;}
  @media print{body{padding:14px 22px;}.no-print{display:none!important;}@page{margin:12mm;size:A4;}}
  table{border-collapse:collapse;width:100%;}
</style></head><body>

<!-- Toolbar (no imprime) -->
<div class="no-print" style="margin-bottom:20px;">
  <div style="background:#EBF5FB;border:1px solid #BBDEFB;border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#1A5276;">
    💾 <strong>Tip:</strong> al imprimir, elegí "Guardar como PDF" como destino para tener un archivo digital.
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;">
    <button onclick="window.print()" style="padding:11px 24px;border-radius:8px;border:none;background:#2C1654;color:#fff;font-weight:800;font-size:14px;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>
    <button onclick="window.close()" style="padding:11px 16px;border-radius:8px;border:1.5px solid #ccc;background:#fff;font-weight:700;font-size:14px;cursor:pointer;">✕ Cerrar</button>
  </div>
</div>

<!-- ENCABEZADO -->
<div style="text-align:center;margin-bottom:24px;border-bottom:3px double #2C1654;padding-bottom:14px;">
  <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">${EMPRESA.razonSocial}</div>
  <div style="font-size:20px;font-weight:900;color:#2C1654;font-family:Georgia,serif;">DECLARACIÓN DE CAPACIDAD INSTALADA</div>
  <div style="font-size:11px;color:#666;margin-top:6px;">San Salvador, ${fecha}</div>
</div>

<!-- DATOS DEL DECLARANTE -->
<div style="background:#FAFAFA;border:1px solid #ddd;border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:11px;color:#333;line-height:1.7;">
  <div style="font-weight:800;color:#2C1654;margin-bottom:6px;font-size:12px;">Datos del declarante</div>
  <div><strong>Razón social:</strong> ${EMPRESA.razonSocial}</div>
  ${EMPRESA.nit ? `<div><strong>NIT:</strong> ${EMPRESA.nit}</div>` : ""}
  ${EMPRESA.nrc ? `<div><strong>NRC:</strong> ${EMPRESA.nrc}</div>` : ""}
  ${EMPRESA.giro ? `<div><strong>Giro:</strong> ${EMPRESA.giro}</div>` : ""}
  ${EMPRESA.direccion ? `<div><strong>Dirección:</strong> ${EMPRESA.direccion}</div>` : ""}
  <div style="margin-top:6px;"><strong>Representante legal:</strong> ${EMPRESA.representanteLegal.nombre} (DUI ${EMPRESA.representanteLegal.dui})</div>
</div>

<div style="font-size:12px;color:#333;line-height:1.6;margin-bottom:18px;">
  Por medio de la presente, <strong>${EMPRESA.razonSocial}</strong>, representada legalmente por
  <strong>${EMPRESA.representanteLegal.nombre}</strong>, declara contar con la capacidad instalada que
  se detalla a continuación para la ejecución de los contratos y servicios que le sean adjudicados.
</div>

${propios.length > 0 ? `
<div style="font-size:11px;font-weight:800;color:#27AE60;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #27AE60;padding-bottom:4px;margin:14px 0 8px;">
  🏛️ Equipo propio del taller
</div>
<table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
  <thead>
    <tr style="background:#27AE60;color:#fff;">
      <th style="padding:8px 8px;text-align:center;width:70px;">Foto</th>
      <th style="padding:8px 10px;text-align:left;">Equipo / Maquinaria</th>
      <th style="padding:8px 10px;text-align:center;width:60px;">Cant.</th>
      <th style="padding:8px 10px;text-align:left;width:25%;">Especificación</th>
      <th style="padding:8px 10px;text-align:left;width:25%;">Propósito</th>
    </tr>
  </thead>
  <tbody>${propios.map(filaEq).join("")}</tbody>
</table>
` : ""}

${subc.length > 0 ? `
<div style="font-size:11px;font-weight:800;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #9B59B6;padding-bottom:4px;margin:18px 0 8px;">
  🤝 Servicios subcontratados
</div>
<div style="font-size:10px;color:#666;font-style:italic;margin-bottom:6px;line-height:1.5;">
  Para procesos específicos, ${EMPRESA.razonSocial} subcontrata a proveedores externos especializados
  con quienes mantiene relación comercial vigente para garantizar la disponibilidad del servicio.
</div>
<table style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
  <thead>
    <tr style="background:#9B59B6;color:#fff;">
      <th style="padding:8px 8px;text-align:center;width:70px;">Foto</th>
      <th style="padding:8px 10px;text-align:left;">Servicio / Equipo</th>
      <th style="padding:8px 10px;text-align:center;width:60px;">Cant.</th>
      <th style="padding:8px 10px;text-align:left;width:25%;">Especificación</th>
      <th style="padding:8px 10px;text-align:left;width:25%;">Propósito</th>
    </tr>
  </thead>
  <tbody>${subc.map(filaEq).join("")}</tbody>
</table>
` : ""}

${(propios.length === 0 && subc.length === 0) ? `
<div style="background:#FFF8E1;border:1px solid #FFE082;border-radius:8px;padding:14px;margin:18px 0;font-size:12px;color:#856404;text-align:center;">
  ⚠️ No hay equipo registrado en el catálogo. Agregá los equipos desde ⚙️ Configuración → Capacidad instalada antes de generar la declaración.
</div>
` : ""}

<div style="font-size:11px;font-weight:800;color:#2C1654;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #2C1654;padding-bottom:4px;margin:18px 0 8px;">
  👥 Recurso humano
</div>
<div style="font-size:11px;color:#333;line-height:1.6;padding:10px 12px;background:#fff;border:1px solid #ddd;border-radius:6px;">
  ${EMPRESA.razonSocial} cuenta con una red de costureras y operarias independientes que se contratan
  según el volumen y la complejidad de cada pedido. Esta modalidad permite escalar la producción de
  forma flexible y garantizar el cumplimiento de los plazos comprometidos, manteniendo los estándares
  de calidad bajo la supervisión directa del taller.
</div>

<div style="font-size:10px;color:#666;line-height:1.6;margin-top:18px;padding:10px 12px;background:#FFF8E1;border:1px solid #FFE082;border-radius:6px;">
  <strong>Declaración:</strong> ${EMPRESA.representanteLegal.nombre}, en su calidad de
  ${EMPRESA.representanteLegal.cargo} de ${EMPRESA.razonSocial}, declara bajo juramento que la
  información contenida en el presente documento es veraz y que el equipo, servicios y recurso humano
  listados están disponibles para la ejecución del objeto contractual.
</div>

<!-- FIRMA + SELLO -->
<div style="margin-top:48px;text-align:center;position:relative;">
  ${sello ? `<img src="${sello}" style="position:absolute;right:14%;top:-20px;max-width:90px;max-height:90px;opacity:0.85;" alt="sello" />` : ""}
  <div style="display:inline-block;text-align:center;max-width:340px;position:relative;">
    ${firma ? `<img src="${firma}" style="max-width:200px;max-height:60px;display:block;margin:0 auto -10px;position:relative;z-index:1;" alt="firma" />` : ""}
    <div style="border-top:1.5px solid #333;padding-top:8px;">
      <div style="font-size:12px;font-weight:800;color:#2C1654;">${EMPRESA.representanteLegal.nombre}</div>
      <div style="font-size:10px;color:#666;margin-top:2px;">${EMPRESA.representanteLegal.cargo} — ${EMPRESA.razonSocial}</div>
      <div style="font-size:10px;color:#666;">DUI: ${EMPRESA.representanteLegal.dui}</div>
    </div>
  </div>
</div>

<div style="margin-top:24px;text-align:center;font-size:9px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:10px;">
  Declaración de capacidad instalada · ${EMPRESA.razonSocial} · ${fecha}
</div>
</body></html>`);
  w.document.close();
}
