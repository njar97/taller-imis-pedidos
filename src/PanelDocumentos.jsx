// Panel de documentos del pedido.
//
// Antes esto era una fila de hasta 11 botones outline distinguibles solo por
// el emoji: la explicación de cada uno vivía en un `title=`, o sea un tooltip
// — y en Android táctil los tooltips NO existen. En el celular era una lotería
// de íconos, y el propio dueño se perdió buscando la hoja "por talla".
//
// Acá cada documento dice su nombre y para qué sirve, y van agrupados por
// DESTINATARIO (taller / cliente / mí), que es como uno piensa cuando busca
// un papel: "necesito algo para la mesa de corte", no "necesito un PDF".
//
// Los handlers son los mismos de siempre: esto solo los reordena.

import { Children } from "react";
import { Modal } from "./lib/Modal.jsx";

const COLOR = {
  taller: "#B7791F",
  cliente: "#1D6A3A",
  mio: "#1A5276",
};

function Grupo({ titulo, sub, color, children }) {
  // Children.toArray y no children.filter: con UN solo hijo React no manda un
  // array y `.filter` revienta. "Para mí" tiene uno solo.
  const items = Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color, letterSpacing: ".04em", textTransform: "uppercase" }}>
          {titulo}
        </h3>
        <span style={{ fontSize: 11.5, color: "#999" }}>{sub}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>{items}</div>
    </section>
  );
}

function Doc({ icono, nombre, desc, color, onClick, disabled, marca }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "flex-start", gap: 11, width: "100%",
        textAlign: "left", padding: "11px 13px", borderRadius: 9,
        border: "1.5px solid " + color + "33", background: "#fff",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1,
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 21, lineHeight: 1.15, flexShrink: 0 }}>{icono}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "#2c2c2c" }}>
          {nombre}
          {marca && (
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "#27AE60" }}>{marca}</span>
          )}
        </span>
        <span style={{ display: "block", fontSize: 12.2, color: "#777", lineHeight: 1.45, marginTop: 1 }}>
          {desc}
        </span>
      </span>
    </button>
  );
}

export default function PanelDocumentos({
  pedido,
  esAdmin,
  opcionesExtra = [],      // [{id, label}] de opcionesAgrupacion, sin "talla"
  generandoLink,
  capturaTok,
  onClose,
  onHojaTaller,
  onCantidades,
  onCorte,
  onAgrupada,              // (id) => void
  onIrMarcando,
  onExcelMedidas,
  onPDF,
  onEntrega,
  onLinkMedidas,
  onCalendario,
}) {
  const hayPersonas = (pedido.personas || []).length > 0;
  const cerrarY = fn => () => { onClose(); setTimeout(fn, 0); };

  const ETIQ = { color: "color", tipo: "prenda", spec: "detalle" };
  const PLURAL = { color: "colores", tipo: "prendas", spec: "detalles" };

  return (
    <Modal onClose={onClose} title="📄 Documentos del pedido">
      <div style={{ maxHeight: "72vh", overflow: "auto", paddingTop: 4 }}>

        <Grupo titulo="Para el taller" sub="lo que se imprime y se lleva a la mesa" color={COLOR.taller}>
          {esAdmin && (
            <Doc
              key="taller" icono="🏭" color={COLOR.taller}
              nombre="Hoja por talla, con nombres"
              desc="Cada persona con sus medidas, agrupada por talla. Para ir tachando al coser."
              onClick={cerrarY(onHojaTaller)}
            />
          )}
          {esAdmin && (
            <Doc
              key="cant" icono="🔢" color={COLOR.taller}
              nombre="Cuántas cortar"
              desc="Cuadro de talla y color con las cantidades, sin nombres. Es la hoja para la mesa de corte."
              onClick={cerrarY(onCantidades)}
            />
          )}
          {esAdmin && (
            <Doc
              key="corte" icono="✂️" color={COLOR.taller}
              nombre="Hoja de corte con piezas"
              desc="Lo anterior más cuántas piezas de cada molde salen por talla."
              onClick={cerrarY(onCorte)}
            />
          )}
          {esAdmin && opcionesExtra.map(o => (
            <Doc
              key={o.id} icono="🗂️" color={COLOR.taller}
              nombre={"Hoja agrupada por " + (ETIQ[o.id] || o.label.toLowerCase())}
              desc={"Este pedido lleva varios " + (PLURAL[o.id] || "grupos") + "; sirve para organizar la compra y el trabajo."}
              onClick={cerrarY(() => onAgrupada(o.id))}
            />
          ))}
          {esAdmin && onIrMarcando && (
            <Doc
              key="marcar" icono="✅" color={COLOR.taller}
              nombre="Ir marcando en el celular"
              desc="La misma hoja agrupada, pero sin imprimir: se toca cada prenda al terminarla. Lo marcado se guarda en este teléfono."
              onClick={cerrarY(onIrMarcando)}
            />
          )}
          {esAdmin && hayPersonas && (
            <Doc
              key="excel" icono="📗" color={COLOR.taller}
              nombre="Excel de medidas"
              desc="Las medidas en el formato del taller, una hoja por prenda."
              onClick={cerrarY(onExcelMedidas)}
            />
          )}
        </Grupo>

        <Grupo titulo="Para el cliente" sub="lo que sale del taller" color={COLOR.cliente}>
          {esAdmin && (
            <Doc
              key="pdf" icono="📄" color={COLOR.cliente}
              nombre="PDF del pedido"
              desc="Recibo con el detalle, los abonos y el saldo."
              onClick={cerrarY(onPDF)}
            />
          )}
          {esAdmin && onEntrega && (
            <Doc
              key="entrega" icono="📦" color={COLOR.cliente}
              nombre="Hoja de entrega"
              desc="Lista de personas con espacio para firmar el recibido. Sin precios."
              onClick={cerrarY(onEntrega)}
            />
          )}
          {esAdmin && (
            <Doc
              key="link" icono="🔗" color={COLOR.cliente}
              nombre="Link para llenar las medidas"
              desc="Se lo mandás por WhatsApp a quien toma las medidas. Lo abre sin cuenta y las escribe desde el teléfono."
              marca={capturaTok ? "ya generado" : null}
              disabled={generandoLink}
              onClick={cerrarY(onLinkMedidas)}
            />
          )}
        </Grupo>

        <Grupo titulo="Para mí" sub="" color={COLOR.mio}>
          {pedido.fechaEntrega && (
            <Doc
              key="ics" icono="📅" color={COLOR.mio}
              nombre="Recordatorio en el calendario"
              desc="Descarga el evento de la entrega, con alarma un día antes."
              onClick={cerrarY(onCalendario)}
            />
          )}
        </Grupo>

      </div>
    </Modal>
  );
}
