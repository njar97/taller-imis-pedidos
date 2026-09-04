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

import { Children, useState } from "react";
import { Modal } from "./lib/Modal.jsx";
import { OPCIONES_DEFAULT, perillasCorte } from "./lib/hojaCorteArmable.js";

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

// ---- Hoja de corte ARMABLE ----
// Una sola opcion que se compone con perillas (filas, que contar, en que
// columnas separar, que mostrar, tamano). Reemplaza a «Cuantas cortar» y a
// «Hoja de corte con piezas», que eran dos combinaciones fijas de esto mismo.
// La ultima combinacion se recuerda en este telefono/PC.
const LS_CORTE = "imis.hojaCorte.opts";
function cargarOptsCorte() {
  try { return { ...OPCIONES_DEFAULT, ...JSON.parse(localStorage.getItem(LS_CORTE) || "{}") }; }
  catch { return { ...OPCIONES_DEFAULT }; }
}
function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "6px 11px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
      border: "1.5px solid " + (on ? "#2C1654" : "#cfcfcf"),
      background: on ? "#2C1654" : "#fff", color: on ? "#fff" : "#444", fontFamily: "inherit",
    }}>{children}</button>
  );
}
function Fila({ titulo, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: "#777", textTransform: "uppercase", letterSpacing: ".04em", width: 68, flexShrink: 0 }}>{titulo}</span>
      {children}
    </div>
  );
}
const ETIQ_SEP = { spec: "detalle", color: "color", tipo: "prenda" };
function ArmadorCorte({ pedido, color, onImprimir }) {
  const per = perillasCorte(pedido);
  const [abierto, setAbierto] = useState(false);
  const [o, setO] = useState(cargarOptsCorte);
  const set = patch => setO(prev => {
    const n = { ...prev, ...patch };
    try { localStorage.setItem(LS_CORTE, JSON.stringify(n)); } catch { /* sin storage */ }
    return n;
  });
  const alterna = (campo, v) => set({ [campo]: (o[campo] || []).includes(v) ? o[campo].filter(x => x !== v) : [...(o[campo] || []), v] });
  const en = (campo, v) => (o[campo] || []).includes(v);
  // Si el pedido no tiene personas y la opcion guardada era «por persona», se
  // cae a «por talla»: no se imprime una hoja vacia por una preferencia vieja.
  const filas = per.persona ? o.filas : "talla";
  const contar = (per.uniforme || o.contar !== "uniforme") ? o.contar : "prenda";
  const resumen = [
    filas === "persona" ? "por persona" : "por talla",
    contar === "uniforme" ? "uniformes" : contar === "prenda" ? "prendas" : "piezas de molde",
    (o.columnas || []).length ? "separado por " + o.columnas.map(c => ETIQ_SEP[c]).join(" y ") : null,
    o.tamano === "grande" ? "letra grande" : null,
  ].filter(Boolean).join(" · ");
  return (
    <div style={{ border: "1.5px solid " + color + "33", borderRadius: 9, background: "#fff", padding: "11px 13px" }}>
      <button type="button" onClick={() => setAbierto(a => !a)} style={{ display: "flex", alignItems: "flex-start", gap: 11, width: "100%", textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit" }}>
        <span style={{ fontSize: 21, lineHeight: 1.15, flexShrink: 0 }}>✂️</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "#2c2c2c" }}>Hoja de corte {abierto ? "▾" : "▸"}</span>
          <span style={{ display: "block", fontSize: 12.2, color: "#777", lineHeight: 1.45, marginTop: 1 }}>
            Se arma con lo que necesités. Ahora: <b style={{ color: "#2C1654" }}>{resumen}</b>.
          </span>
        </span>
      </button>
      {abierto && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #e4e4e4" }}>
          <Fila titulo="Filas">
            <Chip on={filas === "talla"} onClick={() => set({ filas: "talla" })}>Por talla</Chip>
            {per.persona && <Chip on={filas === "persona"} onClick={() => set({ filas: "persona" })}>Por persona</Chip>}
          </Fila>
          {filas === "talla" && (
            <Fila titulo="Contar">
              {per.uniforme && <Chip on={contar === "uniforme"} onClick={() => set({ contar: "uniforme" })}>Uniformes completos</Chip>}
              <Chip on={contar === "prenda"} onClick={() => set({ contar: "prenda" })}>Prendas</Chip>
              <Chip on={contar === "pieza"} onClick={() => set({ contar: "pieza" })}>Piezas de molde</Chip>
            </Fila>
          )}
          {filas === "talla" && contar !== "pieza" && (per.spec || per.color || per.tipo) && (
            <Fila titulo="Separar">
              {per.spec && <Chip on={en("columnas", "spec")} onClick={() => alterna("columnas", "spec")}>Por detalle</Chip>}
              {per.color && <Chip on={en("columnas", "color")} onClick={() => alterna("columnas", "color")}>Por color</Chip>}
              {per.tipo && contar !== "prenda" && <Chip on={en("columnas", "tipo")} onClick={() => alterna("columnas", "tipo")}>Por prenda</Chip>}
            </Fila>
          )}
          <Fila titulo="Mostrar">
            {per.sueltas && contar === "uniforme" && <Chip on={en("mostrar", "sueltas")} onClick={() => alterna("mostrar", "sueltas")}>Piezas sueltas</Chip>}
            <Chip on={en("mostrar", "listo")} onClick={() => alterna("mostrar", "listo")}>Casilla «Listo»</Chip>
            {per.tejidos && <Chip on={en("mostrar", "tejidos")} onClick={() => alterna("mostrar", "tejidos")}>Cuellos y puños</Chip>}
            <Chip on={en("mostrar", "avisos")} onClick={() => alterna("mostrar", "avisos")}>Avisos del pedido</Chip>
          </Fila>
          <Fila titulo="Tamaño">
            <Chip on={o.tamano !== "grande"} onClick={() => set({ tamano: "normal" })}>Normal</Chip>
            <Chip on={o.tamano === "grande"} onClick={() => set({ tamano: "grande" })}>Grande (mesa)</Chip>
          </Fila>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button type="button" onClick={() => onImprimir({ ...o, filas, contar })} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#2C1654", color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>
              🖨️ Imprimir esta hoja
            </button>
          </div>
        </div>
      )}
    </div>
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
  onCorteArmable,          // (opts) => void — la hoja de corte armable
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
          {esAdmin && onCorteArmable && (
            <ArmadorCorte key="corte-armable" pedido={pedido} color={COLOR.taller}
              onImprimir={opts => cerrarY(() => onCorteArmable(opts))()} />
          )}
          {esAdmin && !onCorteArmable && (
            <Doc
              key="cant" icono="🔢" color={COLOR.taller}
              nombre="Cuántas cortar"
              desc="Cuadro de talla y color con las cantidades, sin nombres. Es la hoja para la mesa de corte."
              onClick={cerrarY(onCantidades)}
            />
          )}
          {esAdmin && !onCorteArmable && (
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
