// Estimador de precio (cost-plus) para armar cotizaciones.
//
// Lee taller_costos_base (telas, mano de obra, extras) y deja al user
// armar el costo desglosado: tela ($/yd × yardas × qty), mano de obra
// (por prenda o por hora), bordado opcional (puntadas × qty con el
// mismo cálculo que SeccionBordados), y líneas libres en "Otros".
//
// Suma todo, aplica margen seleccionable, muestra precio total y por
// unidad. Botones: copiar al portapapeles, aplicar al campo precio.

import { useEffect, useState, useMemo } from "react";
import { Modal } from "./lib/Modal.jsx";
import { leerCostos, agruparCostos } from "./lib/costosBase.js";
import { fmt$ } from "./lib/dominio.js";
import { pushToast } from "./lib/feedback.js";

const SEC = (color = "#9B59B6") => ({
  fontSize: 11,
  fontWeight: 800,
  color,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginTop: 10,
  marginBottom: 6,
  paddingBottom: 4,
  borderBottom: "1.5px solid " + color + "33",
});

const INP = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  background: "#FAFAFA",
};

const LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#888",
  marginBottom: 3,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const MARGENES = [30, 50, 80, 100];

// Mismo cálculo de bordado que ya usa SeccionBordados (calcPrecioSugerido).
// 8500 puntadas → 8500/600 = 14.16 min → costo prod = 14.16 × (3/60) = $0.71
function calcCostoBordado(puntStr) {
  const punt = parseInt(String(puntStr || "").replace(/[^0-9]/g, "")) || 0;
  if (!punt) return 0;
  const minutos = punt / 600;
  return minutos * (3.0 / 60);
}

export default function EstimadorPrecio({ open, onClose, onAplicar, qtyInicial = 1 }) {
  const [costos, setCostos] = useState({ tela: [], mano_obra: [], extra: [] });

  useEffect(() => {
    if (!open) return;
    leerCostos().then(rows => setCostos(agruparCostos(rows)));
  }, [open]);

  // Cantidad de prendas
  const [qty, setQty] = useState(qtyInicial || 1);

  // Tela
  const [telaId, setTelaId] = useState("");
  const [telaCostoYd, setTelaCostoYd] = useState("");
  const [yardasPorPrenda, setYardasPorPrenda] = useState("1.5");

  // Mano de obra
  const [moModo, setMoModo] = useState("prenda"); // 'prenda' o 'hora'
  const [moCostoUnit, setMoCostoUnit] = useState("3");
  const [moHoras, setMoHoras] = useState("1");

  // Bordado
  const [bordActivo, setBordActivo] = useState(false);
  const [bordPunt, setBordPunt] = useState("");

  // Otros (líneas dinámicas)
  const [otros, setOtros] = useState([]); // { id, nombre, qty, costo }

  // Margen
  const [margen, setMargen] = useState(50);

  // Precio final ajustable
  const [precioFinal, setPrecioFinal] = useState("");

  // Cuando cambia la tela seleccionada, autopopular el costo
  useEffect(() => {
    if (!telaId) return;
    const t = costos.tela.find(x => String(x.id) === String(telaId));
    if (t) setTelaCostoYd(String(t.costo));
  }, [telaId, costos.tela]);

  const costoTela = (parseFloat(telaCostoYd) || 0) * (parseFloat(yardasPorPrenda) || 0) * qty;
  const costoMO = moModo === "prenda"
    ? (parseFloat(moCostoUnit) || 0) * qty
    : (parseFloat(moCostoUnit) || 0) * (parseFloat(moHoras) || 0);
  const costoBord = bordActivo ? calcCostoBordado(bordPunt) * qty : 0;
  const costoOtros = otros.reduce(
    (s, o) => s + (parseFloat(o.qty) || 0) * (parseFloat(o.costo) || 0),
    0
  );

  const costoTotal = costoTela + costoMO + costoBord + costoOtros;
  const precioSugerido = costoTotal * (1 + margen / 100);

  // Sincroniza el precio final con el sugerido cuando el user cambia inputs,
  // pero respeta ediciones manuales si el user lo tocó.
  const [precioTocado, setPrecioTocado] = useState(false);
  useEffect(() => {
    if (!precioTocado) setPrecioFinal(precioSugerido.toFixed(2));
  }, [precioSugerido, precioTocado]);

  const precioPorUnidad = qty > 0 ? (parseFloat(precioFinal) || 0) / qty : 0;

  const agregarOtro = (preset = null) => {
    setOtros(prev => [
      ...prev,
      preset
        ? { id: Date.now() + Math.random(), nombre: preset.nombre, qty: qty, costo: preset.costo }
        : { id: Date.now() + Math.random(), nombre: "", qty: 1, costo: 0 },
    ]);
  };

  const editOtro = (id, key, val) => {
    setOtros(prev => prev.map(o => (o.id === id ? { ...o, [key]: val } : o)));
  };

  const quitarOtro = id => setOtros(prev => prev.filter(o => o.id !== id));

  const copiar = async () => {
    const txt = `${qty} prendas — ${fmt$(precioFinal)} total (${fmt$(precioPorUnidad)} c/u)`;
    try {
      await navigator.clipboard.writeText(txt);
      pushToast("Precio copiado al portapapeles", "success");
    } catch {
      pushToast("No pude copiar", "error");
    }
  };

  const aplicar = () => {
    if (onAplicar) {
      onAplicar(parseFloat(precioFinal) || 0);
      pushToast("Precio aplicado al pedido", "success");
      onClose();
    }
  };

  if (!open) return null;

  return (
    <Modal onClose={onClose} title="💰 Estimador de precio">
      <div>
        {/* Cantidad de prendas */}
        <div style={{ marginBottom: 12, background: "#F3E5F5", padding: 10, borderRadius: 10 }}>
          <label style={LBL}>Cantidad de prendas</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={qty}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ ...INP, fontSize: 18, fontWeight: 800, color: "#9B59B6", textAlign: "center" }}
          />
        </div>

        {/* TELA */}
        <div style={SEC("#1A5276")}>🧵 Tela</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
          <div>
            <label style={LBL}>Tipo</label>
            <select style={INP} value={telaId} onChange={e => setTelaId(e.target.value)}>
              <option value="">— Otra / manual —</option>
              {costos.tela.map(t => (
                <option key={t.id} value={t.id}>{t.nombre} (${t.costo}/yd)</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LBL}>$ / yarda</label>
            <input
              type="number" step="0.01" min="0"
              style={INP} value={telaCostoYd}
              onChange={e => setTelaCostoYd(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label style={LBL}>Yardas/prenda</label>
            <input
              type="number" step="0.1" min="0"
              style={INP} value={yardasPorPrenda}
              onChange={e => setYardasPorPrenda(e.target.value)}
              placeholder="1.5"
            />
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#1A5276", fontWeight: 700, marginTop: 4, textAlign: "right" }}>
          Subtotal tela: {fmt$(costoTela)}
        </div>

        {/* MANO DE OBRA */}
        <div style={SEC("#27AE60")}>✂️ Mano de obra</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {["prenda", "hora"].map(m => (
            <button
              key={m}
              onClick={() => setMoModo(m)}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1.5px solid " + (moModo === m ? "#27AE60" : "#e0e0e0"),
                background: moModo === m ? "#27AE60" : "#fff",
                color: moModo === m ? "#fff" : "#666",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {m === "prenda" ? "Por prenda" : "Por tiempo (horas)"}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: moModo === "hora" ? "1fr 1fr" : "1fr", gap: 8 }}>
          <div>
            <label style={LBL}>{moModo === "prenda" ? "$ / prenda" : "$ / hora"}</label>
            <input
              type="number" step="0.01" min="0"
              style={INP} value={moCostoUnit}
              onChange={e => setMoCostoUnit(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {moModo === "hora" && (
            <div>
              <label style={LBL}>Horas totales</label>
              <input
                type="number" step="0.5" min="0"
                style={INP} value={moHoras}
                onChange={e => setMoHoras(e.target.value)}
                placeholder="1.0"
              />
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#27AE60", fontWeight: 700, marginTop: 4, textAlign: "right" }}>
          Subtotal mano de obra: {fmt$(costoMO)}
        </div>

        {/* BORDADO */}
        <div style={SEC("#9B59B6")}>🪡 Bordado (opcional)</div>
        <label style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, cursor: "pointer", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={bordActivo}
            onChange={e => setBordActivo(e.target.checked)}
          />
          ¿Lleva bordado?
        </label>
        {bordActivo && (
          <>
            <label style={LBL}>Puntadas del diseño</label>
            <input
              type="number" min="0" inputMode="numeric"
              style={INP} value={bordPunt}
              onChange={e => setBordPunt(e.target.value)}
              placeholder="Ej: 8500"
            />
            <div style={{ fontSize: 11, color: "#9B59B6", fontWeight: 700, marginTop: 4, textAlign: "right" }}>
              Subtotal bordado: {fmt$(costoBord)} ({bordPunt || 0} puntadas × {qty} prendas)
            </div>
          </>
        )}

        {/* OTROS */}
        <div style={SEC("#E67E22")}>➕ Otros (botones, zíperes, hilos, cuello, etc.)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {costos.extra.map(x => (
            <button
              key={x.id}
              onClick={() => agregarOtro({ nombre: x.nombre, costo: x.costo })}
              style={{
                padding: "4px 10px",
                borderRadius: 14,
                border: "1.5px dashed #fcd3a0",
                background: "#FFFBF6",
                color: "#E67E22",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              + {x.nombre} ${x.costo}
            </button>
          ))}
          <button
            onClick={() => agregarOtro()}
            style={{
              padding: "4px 10px",
              borderRadius: 14,
              border: "1.5px solid #E67E22",
              background: "#E67E22",
              color: "#fff",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            + Personalizado
          </button>
        </div>
        {otros.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
            {otros.map(o => (
              <div key={o.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 28px", gap: 4, alignItems: "center" }}>
                <input
                  style={{ ...INP, padding: "5px 8px", fontSize: 12 }}
                  value={o.nombre}
                  placeholder="Descripción"
                  onChange={e => editOtro(o.id, "nombre", e.target.value)}
                />
                <input
                  type="number" min="0"
                  style={{ ...INP, padding: "5px 8px", textAlign: "center", fontSize: 12 }}
                  value={o.qty}
                  onChange={e => editOtro(o.id, "qty", e.target.value)}
                  placeholder="Qty"
                />
                <input
                  type="number" step="0.01" min="0"
                  style={{ ...INP, padding: "5px 8px", textAlign: "center", fontSize: 12, color: "#27AE60", fontWeight: 700 }}
                  value={o.costo}
                  onChange={e => editOtro(o.id, "costo", e.target.value)}
                  placeholder="$/u"
                />
                <button
                  onClick={() => quitarOtro(o.id)}
                  style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 16 }}
                >×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: "#E67E22", fontWeight: 700, marginTop: 4, textAlign: "right" }}>
          Subtotal otros: {fmt$(costoOtros)}
        </div>

        {/* COSTO TOTAL + MARGEN */}
        <div style={{ marginTop: 14, padding: 12, background: "#F5F5F5", borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444" }}>
            <span style={{ fontWeight: 700 }}>Costo total</span>
            <span style={{ fontWeight: 800 }}>{fmt$(costoTotal)}</span>
          </div>
          <div style={{ ...LBL, marginTop: 10 }}>Margen de ganancia</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {MARGENES.map(m => (
              <button
                key={m}
                onClick={() => setMargen(m)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 16,
                  border: "1.5px solid " + (margen === m ? "#28A745" : "#e0e0e0"),
                  background: margen === m ? "#28A745" : "#fff",
                  color: margen === m ? "#fff" : "#666",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {m}%
              </button>
            ))}
            <input
              type="number" min="0" max="500"
              value={margen}
              onChange={e => setMargen(parseInt(e.target.value) || 0)}
              style={{ width: 60, padding: "5px 8px", borderRadius: 16, border: "1.5px solid #e0e0e0", textAlign: "center", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* PRECIO FINAL */}
        <div style={{ marginTop: 12, padding: 14, background: "#E8F5E9", border: "2px solid #28A745", borderRadius: 12 }}>
          <div style={LBL}>Precio final (editable)</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: "#1A5F33" }}>$</span>
            <input
              type="number" step="0.01" min="0"
              value={precioFinal}
              onChange={e => { setPrecioFinal(e.target.value); setPrecioTocado(true); }}
              style={{ width: "100%", border: "none", background: "transparent", fontSize: 26, fontWeight: 900, color: "#1A5F33", outline: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={() => { setPrecioTocado(false); setPrecioFinal(precioSugerido.toFixed(2)); }}
              title="Volver al precio sugerido"
              style={{ background: "none", border: "none", color: "#28A745", cursor: "pointer", fontSize: 18 }}
            >↺</button>
          </div>
          <div style={{ fontSize: 13, color: "#1A5F33", marginTop: 4 }}>
            <strong>{fmt$(precioPorUnidad)}</strong> por unidad ({qty} prendas)
          </div>
        </div>

        {/* ACCIONES */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={copiar}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #9B59B6", background: "#fff", color: "#9B59B6", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            📋 Copiar precio
          </button>
          {onAplicar && (
            <button
              onClick={aplicar}
              style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#9B59B6", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              📦 Usar este precio
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
