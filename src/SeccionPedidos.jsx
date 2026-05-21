// Sección "Pedidos" (confección). Es la vista principal del flujo:
// toolbar con búsqueda + botón "Nuevo", tabs de filtro por estatus,
// banner de pedidos vencidos sin archivar, lista de próximas entregas,
// y la tabla (desktop) / cards (mobile) con todos los pedidos filtrados.
//
// Esta sección era el bloque inline más grande del componente App.
// Toda la composición es presentacional — los handlers vienen como props.

import { ESTATUS, EC } from "./lib/constants.js";
import { fmt$, resumenTallas, itemsResumen } from "./lib/dominio.js";
import { imgSrc } from "./lib/imagenes.js";
import { TallasChips } from "./SelectorTallas.jsx";
import { WABtn } from "./lib/ui.jsx";
import CardPedido from "./CardPedido.jsx";
import ProximasEntregas from "./ProximasEntregas.jsx";

const INP_STYLE = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#FAFAFA",
  fontFamily: "inherit",
};

function Toolbar({ pedidos, busqueda, setBusqueda, onNuevo }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#fff",
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 16,
            color: "#2C1654",
            fontWeight: 800,
            fontFamily: "Georgia,serif",
          }}
        >
          Registro de Pedidos
        </h1>
        <div style={{ fontSize: 11, color: "#aaa" }}>
          {pedidos.length} pedido(s)
        </div>
      </div>
      <input
        className="search-pedidos"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="🔍 Buscar..."
        style={{ ...INP_STYLE, padding: "7px 10px", fontSize: 13 }}
      />
      <button
        onClick={onNuevo}
        style={{
          padding: "9px 14px",
          borderRadius: 8,
          border: "none",
          background: "#9B59B6",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        ✂️ Nuevo
      </button>
    </div>
  );
}

function FiltroTabs({ pedidos, conteos, filtro, setFiltro }) {
  // Lista de tabs: Todos + Vencidos (especial, rojo si tiene items) + estatus.
  const tabs = ["Todos", "Vencidos", ...ESTATUS];
  return (
    <div
      style={{
        display: "flex",
        background: "#fff",
        borderBottom: "1px solid #eee",
        padding: "0 12px",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {tabs.map(s => {
        const count = s === "Todos" ? pedidos.length : (conteos[s] || 0);
        const active = filtro === s;
        const esVencidos = s === "Vencidos";
        // El tab Vencidos se ve en rojo cuando hay items pendientes —
        // sutil llamada de atención. Cuando no hay, se pinta apagado.
        const colorActivo = esVencidos ? "#E63946" : "#9B59B6";
        const tieneAlerta = esVencidos && count > 0;
        return (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            style={{
              padding: "7px 8px",
              border: "none",
              background: "none",
              borderBottom: active
                ? "2.5px solid " + colorActivo
                : "2.5px solid transparent",
              color: active ? colorActivo : tieneAlerta ? "#E63946" : "#999",
              fontWeight: active || tieneAlerta ? 700 : 400,
              cursor: "pointer",
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              gap: 3,
              whiteSpace: "nowrap",
            }}
          >
            {esVencidos && tieneAlerta ? "⚠️ " : ""}{s}
            <span
              style={{
                background: active ? colorActivo : tieneAlerta ? "#FDECEA" : "#eee",
                color: active ? "#fff" : tieneAlerta ? "#E63946" : "#aaa",
                borderRadius: 20,
                padding: "1px 5px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PullIndicator({ pullDist }) {
  if (pullDist <= 0) return null;
  return (
    <div
      style={{
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
        pointerEvents: "none",
      }}
    >
      {pullDist > 60 ? "↓ Soltá para actualizar" : "↓ Tirá para actualizar"}
    </div>
  );
}

function VencidosBanner({ vencidos, onClick }) {
  if (vencidos.length === 0) return null;
  const plural = vencidos.length === 1 ? "" : "s";
  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFF3CD",
        border: "1.5px solid #FFE082",
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 22 }}>📦</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#856404" }}>
          {vencidos.length} pedido{plural} vencido{plural} sin archivar
        </div>
        <div style={{ fontSize: 11, color: "#a07c0a" }}>
          Tocá para revisar y marcar como entregado
        </div>
      </div>
      <span style={{ fontSize: 22, color: "#856404", fontWeight: 700 }}>→</span>
    </div>
  );
}

function EmptyState({ sync, pedidos }) {
  return (
    <div style={{ textAlign: "center", padding: 60, color: "#ccc" }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🧵</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#aaa" }}>
        {sync === "cargando"
          ? "Cargando pedidos..."
          : "No hay pedidos registrados"}
      </div>
      {sync === "ok" && pedidos.length === 0 && (
        <div
          style={{
            marginTop: 12,
            background: "#FFF8E1",
            border: "1px solid #FFE082",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 12,
            color: "#856404",
            maxWidth: 380,
            margin: "12px auto 0",
          }}
        >
          <strong>Diagnóstico:</strong> No hay datos en la base.
          <br />
          Verifica en la consola del navegador (F12 → Console) el mensaje "Datos cargados".
        </div>
      )}
    </div>
  );
}

function FilaPedido({
  p,
  esAdmin,
  asignaciones,
  diasPara,
  setDet,
  setModal,
  setConf,
  setVisor,
  cambiarEstatus,
  onImprimir,
}) {
  const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
  const dias = diasPara(p.fechaEntrega);
  const urgent =
    dias !== null && dias <= 2 && !["Entregado", "Cancelado"].includes(p.estatus);
  const esCFp = p.tipoDocumento === "Crédito Fiscal (pendiente datos)";
  const tallasR = resumenTallas(p);
  const itemsP = itemsResumen(p);
  const imgs = (p.imagenes || []).filter(i => imgSrc(i));
  const nFotos = imgs.length;
  const nAsig = asignaciones.filter(a => a.pedidoId === String(p.id)).length;

  return (
    <tr
      key={p.id}
      onClick={() => setDet(p)}
      style={{ background: "#fff", cursor: "pointer" }}
    >
      <td
        style={{
          padding: "10px",
          borderRadius: "10px 0 0 10px",
          color: "#ccc",
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        N°{String(p.id).padStart(4, "0")}
      </td>
      <td style={{ padding: "10px" }}>
        <div style={{ fontWeight: 700, color: "#2C1654", fontSize: 13 }}>
          {p.tipoCliente === "escuela" ? "🏫 " :
           p.tipoCliente === "empresa" ? "🏢 " : ""}
          {p.cliente}
        </div>
        {p.nombreContacto && (
          <div style={{ fontSize: 10, color: "#555" }}>👤 {p.nombreContacto}</div>
        )}
        {p.costurera && p.costurera !== "(Sin asignar)" && (
          <div style={{ fontSize: 10, color: "#9B59B6" }}>✂️ {p.costurera}</div>
        )}
        {esAdmin && nAsig > 0 && (
          <div style={{ fontSize: 10, color: "#27AE60" }}>🧵 {nAsig}</div>
        )}
      </td>
      <td style={{ padding: "10px" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#444",
            marginBottom: itemsP.length ? 4 : 0,
          }}
        >
          {p.tipoPrenda}
        </div>
        {itemsP.length ? (
          <TallasChips items={itemsP} compact />
        ) : tallasR ? (
          <div style={{ fontSize: 11, color: "#E67E22", fontWeight: 700 }}>
            {tallasR}
          </div>
        ) : null}
      </td>
      <td style={{ padding: "10px" }}>
        {nFotos > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {imgs.slice(0, 2).map((img, i) => (
              <img
                key={i}
                src={imgSrc(img)}
                onClick={e => {
                  e.stopPropagation();
                  setVisor({ imgs: imgs.map(imgSrc), idx: i });
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 5,
                  objectFit: "cover",
                  border: "1.5px solid " + (img.driveUrl ? "#a8d8a8" : "#e0e0e0"),
                  cursor: "zoom-in",
                }}
              />
            ))}
            {nFotos > 2 && (
              <span style={{ fontSize: 10, color: "#888", fontWeight: 700 }}>
                +{nFotos - 2}
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: "#ddd", fontSize: 11 }}>—</span>
        )}
      </td>
      {esAdmin && (
        <td style={{ padding: "10px" }}>
          {p.tipoDocumento === "Consumidor Final" ? (
            <span style={{ fontSize: 10, color: "#ccc" }}>Consumidor</span>
          ) : (
            <span
              style={{
                fontSize: 10,
                background: esCFp ? "#FFF3CD" : "#D4EDDA",
                color: esCFp ? "#856404" : "#155724",
                padding: "2px 7px",
                borderRadius: 20,
                fontWeight: 700,
              }}
            >
              {esCFp ? "⚠️ CF pend." : "✅ CF"}
            </span>
          )}
        </td>
      )}
      {esAdmin && (
        <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
          {p.precio ? (
            <div>
              <div style={{ fontWeight: 700, color: "#2C1654", fontSize: 13 }}>
                {fmt$(p.precio)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: saldo > 0 ? "#E63946" : "#28A745",
                }}
              >
                {saldo > 0 ? "Resta " + fmt$(saldo) : "✅ Pagado"}
              </div>
            </div>
          ) : (
            <span style={{ color: "#ddd" }}>—</span>
          )}
        </td>
      )}
      <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
        {p.fechaEntrega ? (
          <div>
            <div
              style={{
                fontSize: 11,
                color: urgent ? "#E63946" : "#555",
                fontWeight: urgent ? 700 : 400,
              }}
            >
              {urgent ? "⚠️ " : ""}
              {p.fechaEntrega}
            </div>
            {dias !== null && !["Entregado", "Cancelado"].includes(p.estatus) && (
              <div
                style={{
                  fontSize: 10,
                  color:
                    dias < 0 ? "#E63946" : dias <= 2 ? "#FD7E14" : "#aaa",
                }}
              >
                {dias < 0
                  ? "Venció " + Math.abs(dias) + "d"
                  : dias === 0
                  ? "¡Hoy!"
                  : dias + "d"}
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: "#ddd", fontSize: 11 }}>—</span>
        )}
      </td>
      <td style={{ padding: "10px" }} onClick={e => e.stopPropagation()}>
        <select
          value={p.estatus}
          onChange={e => cambiarEstatus(p.id, e.target.value)}
          style={{
            border: "none",
            background: (EC[p.estatus] || {}).bg,
            color: (EC[p.estatus] || {}).fg,
            padding: "3px 8px",
            borderRadius: 20,
            fontWeight: 700,
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          {ESTATUS.map(e => <option key={e}>{e}</option>)}
        </select>
      </td>
      <td
        style={{ padding: "10px", borderRadius: "0 10px 10px 0" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 3 }}>
          <WABtn p={p} esAdmin={esAdmin} />
          <button
            onClick={() => onImprimir(p)}
            title="Imprimir hoja"
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1.5px solid #d8c0f0",
              background: "#f8f4ff",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            🖨️
          </button>
          <button
            onClick={() => setModal(p)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1.5px solid #e0e0e0",
              background: "#fff",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            ✏️
          </button>
          {esAdmin && (
            <button
              onClick={() => setConf(p.id)}
              style={{
                padding: "4px 7px",
                borderRadius: 6,
                border: "1.5px solid #fdd",
                background: "#fff8f8",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              🗑️
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function TablaYCards({
  filtrados,
  esAdmin,
  asignaciones,
  diasPara,
  nextId,
  setDet,
  setModal,
  setSeedDuplicar,
  setConf,
  setVisor,
  cambiarEstatus,
  onImprimir,
}) {
  const headers = [
    "#", "Cliente", "Prenda / Tallas", "Fotos",
    esAdmin ? "Factura" : null, esAdmin ? "$ / Saldo" : null,
    "Entrega", "Estatus", "",
  ].filter(Boolean);
  return (
    <>
      <table
        className="tabla-pedidos"
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0 4px",
        }}
      >
        <thead>
          <tr>
            {headers.map(h => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "5px 10px",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#ccc",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtrados.map(p => (
            <FilaPedido
              key={p.id}
              p={p}
              esAdmin={esAdmin}
              asignaciones={asignaciones}
              diasPara={diasPara}
              setDet={setDet}
              setModal={setModal}
              setConf={setConf}
              setVisor={setVisor}
              cambiarEstatus={cambiarEstatus}
              onImprimir={onImprimir}
            />
          ))}
        </tbody>
      </table>
      <div
        className="cards-pedidos"
        style={{ flexDirection: "column", display: "none" }}
      >
        {filtrados.map(p => (
          <CardPedido
            key={p.id}
            p={p}
            esAdmin={esAdmin}
            onVer={setDet}
            onEditar={setModal}
            onCambiarEstatus={cambiarEstatus}
            onEliminar={setConf}
            onDuplicar={p => {
              // El pedido nuevo arranca limpio en todo lo que no aplica:
              // sin fotos del original (apuntaban a Drive del viejo), sin
              // costurera heredada, sin días calculados que correspondan
              // a las fechas antiguas. Sin id — FormPedido lo asigna como
              // nuevo y nextId avanza correctamente.
              const { id: _x, dias: _y, ...resto } = p;
              const copia = {
                ...resto,
                fecha: new Date().toISOString().split("T")[0],
                fechaInicio: "",
                fechaEntrega: "",
                estatus: "Tomado",
                anticipo: "",
                abonos: [],
                imagenes: [],
                costurera: "(Sin asignar)",
              };
              setSeedDuplicar(copia);
              setModal("nuevo");
            }}
            onImprimir={p => onImprimir(p)}
            onVerFoto={v => setVisor(v)}
          />
        ))}
      </div>
    </>
  );
}

export default function SeccionPedidos({
  pedidos,
  filtrados,
  conteos,
  busqueda,
  setBusqueda,
  filtro,
  setFiltro,
  sync,
  vencidosSinArchivar,
  onArchivarVencido,
  pullDist,
  onMainTouchStart,
  onMainTouchMove,
  onMainTouchEnd,
  diasPara,
  esAdmin,
  asignaciones,
  nextId,
  setDet,
  setModal,
  setSeedDuplicar,
  setConf,
  setVisor,
  cambiarEstatus,
  onImprimir,
  onCopiarWA,
}) {
  return (
    <>
      <Toolbar
        pedidos={pedidos}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        onNuevo={() => setModal("nuevo")}
      />
      <FiltroTabs
        pedidos={pedidos}
        conteos={conteos}
        filtro={filtro}
        setFiltro={setFiltro}
      />
      <div
        className="main-area"
        onTouchStart={onMainTouchStart}
        onTouchMove={onMainTouchMove}
        onTouchEnd={onMainTouchEnd}
        style={{
          flex: 1,
          overflow: "auto",
          padding: 12,
          transform: pullDist > 0 ? `translateY(${pullDist}px)` : undefined,
          transition: pullDist === 0 ? "transform 0.2s" : undefined,
        }}
      >
        <PullIndicator pullDist={pullDist} />
        <VencidosBanner
          vencidos={vencidosSinArchivar}
          onClick={() => onArchivarVencido(vencidosSinArchivar[0])}
        />
        <ProximasEntregas
          pedidos={pedidos}
          diasPara={diasPara}
          esAdmin={esAdmin}
          onVer={setDet}
          onEditar={setModal}
          onWA={onCopiarWA}
        />
        {filtrados.length === 0 ? (
          <EmptyState sync={sync} pedidos={pedidos} />
        ) : (
          <TablaYCards
            filtrados={filtrados}
            esAdmin={esAdmin}
            asignaciones={asignaciones}
            diasPara={diasPara}
            nextId={nextId}
            setDet={setDet}
            setModal={setModal}
            setSeedDuplicar={setSeedDuplicar}
            setConf={setConf}
            setVisor={setVisor}
            cambiarEstatus={cambiarEstatus}
            onImprimir={onImprimir}
          />
        )}
      </div>
    </>
  );
}
