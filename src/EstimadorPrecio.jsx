// Estimador de precio interno (no es la cotización formal al cliente).
//
// Es la herramienta del taller para DECIDIR un precio: detalla el costo
// (tela, mano de obra, bordado, extras), aplica margen y muestra el
// precio sugerido. Soporta 3 modos:
//
//   📋 Confección — multi-item: una línea por tipo de prenda (50 camisas
//     + 20 pantalones + 30 gorras). Cada item tiene su desglose y la
//     suma da el total de la cotización.
//   🪡 Solo bordado — caso simple: puntadas × qty.
//   🧶 Solo cuellos — caso simple: tipo × qty.
//
// El precio final se puede copiar al portapapeles o aplicar al campo
// `precio` de un pedido si el estimador se invoca desde un form.

import { useEffect, useState, useMemo } from "react";
import { Modal } from "./lib/Modal.jsx";
import { leerCostos, agruparCostos, upsertCosto } from "./lib/costosBase.js";
import { fmt$ } from "./lib/dominio.js";
import { pushToast } from "./lib/feedback.js";
import { CATALOGO_BASE } from "./lib/catalogoBase.js";

// ── Estilos compartidos ─────────────────────────────────────

const SEC = (color = "#9B59B6") => ({
  fontSize: 11,
  fontWeight: 800,
  color,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginTop: 8,
  marginBottom: 4,
});

const INP = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  background: "#FAFAFA",
};

const LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#888",
  marginBottom: 2,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const MARGENES = [30, 50, 80, 100];

// ── Helpers de cálculo ──────────────────────────────────────

// Mismo cálculo de bordado que SeccionBordados (calcPrecioSugerido).
function calcCostoBordado(puntStr) {
  const punt = parseInt(String(puntStr || "").replace(/[^0-9]/g, "")) || 0;
  if (!punt) return 0;
  const minutos = punt / 600;
  return minutos * (3.0 / 60);
}

const num = v => parseFloat(v) || 0;

function itemNuevo(catalogo = []) {
  const primerTipo = catalogo[0]?.nombre || "";
  return {
    id: Date.now() + Math.random(),
    tipoPrenda: primerTipo,
    qty: 1,
    telaId: "",
    telaNombre: "",
    telaCostoYd: "",
    yardasPorPrenda: "1.5",
    moModo: "hechura", // 'hechura' (por prenda) | 'tiempo' (por hora)
    moCostoUnit: "3",
    moHoras: "1",
    bordActivo: false,
    bordPunt: "",
    otros: [],
    expandido: true, // primer item arranca expandido
  };
}

function costoItem(it) {
  const tela = num(it.telaCostoYd) * num(it.yardasPorPrenda) * num(it.qty);
  // Backwards-compat con "prenda"/"hora" antiguos (pre-rename a hechura/tiempo).
  const modo = it.moModo === "prenda" || it.moModo === "hechura" ? "hechura" : "tiempo";
  const mo = modo === "hechura"
    ? num(it.moCostoUnit) * num(it.qty)
    : num(it.moCostoUnit) * num(it.moHoras);
  const bord = it.bordActivo ? calcCostoBordado(it.bordPunt) * num(it.qty) : 0;
  const otros = (it.otros || []).reduce((s, o) => s + num(o.qty) * num(o.costo), 0);
  return { tela, mo, bord, otros, total: tela + mo + bord + otros };
}

// ── Modo Confección: lista de items multi-prenda ────────────

function ItemConfeccion({ it, idx, costos, onChange, onDel, onToggle, onRefrescarCostos }) {
  const c = costoItem(it);
  const editField = (k, v) => onChange({ ...it, [k]: v });
  const editOtro = (oid, k, v) => onChange({
    ...it,
    otros: (it.otros || []).map(o => o.id === oid ? { ...o, [k]: v } : o),
  });
  const addOtro = (preset = null) => onChange({
    ...it,
    otros: [
      ...(it.otros || []),
      preset
        ? { id: Date.now() + Math.random(), nombre: preset.nombre, qty: it.qty, costo: preset.costo }
        : { id: Date.now() + Math.random(), nombre: "", qty: 1, costo: 0 },
    ],
  });
  const delOtro = oid => onChange({ ...it, otros: (it.otros || []).filter(o => o.id !== oid) });

  // Tela seleccionada autopopula nombre + costo. Si pasa a "manual" (id
  // vacío), borra el id pero conserva el nombre/costo que tenga para
  // que el user pueda editarlos sin perder lo escrito.
  const onTelaIdChange = telaId => {
    const t = costos.tela.find(x => String(x.id) === String(telaId));
    onChange({
      ...it,
      telaId,
      telaNombre: t ? t.nombre : "",
      telaCostoYd: t ? String(t.costo) : it.telaCostoYd,
    });
  };

  // Detecta si hay cambios respecto a la tela seleccionada del catálogo.
  // Muestra el botón "💾 Guardar" cuando vale la pena persistir.
  const telaActual = costos.tela.find(x => String(x.id) === String(it.telaId));
  const nombreLimpio = (it.telaNombre || "").trim();
  const costoVal = Number(it.telaCostoYd);
  const tieneDatosValidos = nombreLimpio.length > 0 && Number.isFinite(costoVal) && costoVal > 0;
  const hayCambios = telaActual
    ? telaActual.nombre !== nombreLimpio || Number(telaActual.costo) !== costoVal
    : tieneDatosValidos;

  const guardarTela = async () => {
    if (!tieneDatosValidos) {
      pushToast("Falta nombre o precio de la tela", "error");
      return;
    }
    const guardado = await upsertCosto({
      id: it.telaId || undefined,
      categoria: "tela",
      nombre: nombreLimpio,
      unidad: "yarda",
      costo: costoVal,
    });
    if (guardado) {
      pushToast(it.telaId ? `Tela "${nombreLimpio}" actualizada` : `Tela "${nombreLimpio}" agregada`, "success");
      if (onRefrescarCostos) await onRefrescarCostos();
      // Después de guardar, asegurarse de que el item apunte al id real
      onChange({ ...it, telaId: guardado.id, telaNombre: guardado.nombre, telaCostoYd: String(guardado.costo) });
    } else {
      pushToast("No pude guardar la tela", "error");
    }
  };

  return (
    <div style={{
      border: "1.5px solid " + (it.expandido ? "#9B59B6" : "#e0e0e0"),
      borderRadius: 10,
      marginBottom: 8,
      background: "#fff",
      overflow: "hidden",
    }}>
      {/* Header compacto siempre visible */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        background: it.expandido ? "#F3E5F5" : "#fafafa",
        borderBottom: it.expandido ? "1px solid #d4b3df" : "none",
      }}>
        <button
          onClick={onToggle}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9B59B6", padding: 0, fontFamily: "inherit" }}
          title={it.expandido ? "Contraer" : "Expandir"}
        >
          {it.expandido ? "▼" : "▶"}
        </button>
        <span style={{ fontSize: 11, color: "#9B59B6", fontWeight: 800, minWidth: 16 }}>#{idx + 1}</span>
        <strong style={{ flex: 1, fontSize: 13, color: "#2C1654", lineHeight: 1.2 }}>
          {it.tipoPrenda || "(sin tipo)"} × {it.qty}
        </strong>
        <span style={{ fontSize: 12, color: "#27AE60", fontWeight: 800 }}>{fmt$(c.total)}</span>
        <button
          onClick={onDel}
          style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 16, padding: "0 4px" }}
          title="Eliminar"
        >×</button>
      </div>

      {it.expandido && (
        <div style={{ padding: 10 }}>
          {/* Tipo de prenda + cantidad */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 70px", gap: 6, marginBottom: 8 }}>
            <div>
              <label style={LBL}>Tipo de prenda</label>
              <input
                style={INP}
                value={it.tipoPrenda}
                list={`cat-${it.id}`}
                onChange={e => editField("tipoPrenda", e.target.value)}
                placeholder="Camisa, Pantalón, Cortina…"
              />
              <datalist id={`cat-${it.id}`}>
                {CATALOGO_BASE.map(p => <option key={p.id} value={p.nombre} />)}
              </datalist>
            </div>
            <div>
              <label style={LBL}>Cantidad</label>
              <input
                type="number" min="1" inputMode="numeric"
                style={{ ...INP, textAlign: "center", fontWeight: 800, color: "#9B59B6" }}
                value={it.qty}
                onChange={e => editField("qty", Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          {/* 🧵 Tela */}
          <div style={SEC("#1A5276")}>🧵 Tela</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: 6, marginBottom: 4 }}>
            <select style={INP} value={it.telaId} onChange={e => onTelaIdChange(e.target.value)}>
              <option value="">— Otra/manual —</option>
              {costos.tela.map(t => (
                <option key={t.id} value={t.id}>{t.nombre} (${t.costo}/yd)</option>
              ))}
            </select>
            <input
              type="number" step="0.01" min="0"
              style={INP} value={it.telaCostoYd}
              onChange={e => editField("telaCostoYd", e.target.value)}
              placeholder="$/yd"
              title="Costo por yarda"
            />
            <input
              type="number" step="0.1" min="0"
              style={INP} value={it.yardasPorPrenda}
              onChange={e => editField("yardasPorPrenda", e.target.value)}
              placeholder="yd/u"
              title="Yardas por prenda"
            />
          </div>
          {/* Nombre editable + botón guardar — para crear telas nuevas o
              editar las existentes (cambia nombre o precio) directo desde acá */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginBottom: 4 }}>
            <input
              style={{ ...INP, fontSize: 12 }}
              value={it.telaNombre || ""}
              onChange={e => editField("telaNombre", e.target.value)}
              placeholder={it.telaId ? "Nombre de la tela" : "Escribe nombre para guardar como nueva tela"}
            />
            {hayCambios && (
              <button
                onClick={guardarTela}
                title={it.telaId ? `Actualizar "${telaActual?.nombre || ""}"` : "Guardar como nueva tela"}
                style={{
                  padding: "4px 10px", borderRadius: 8,
                  border: "1.5px solid #1A5276", background: "#1A5276",
                  color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 800,
                  fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >
                💾 {it.telaId ? "Actualizar" : "Guardar tela"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#1A5276", textAlign: "right", marginTop: 2 }}>= {fmt$(c.tela)}</div>

          {/* ✂️ Mano de obra — toggle 'Por hechura' (por prenda) o 'Por tiempo' (por hora) */}
          <div style={SEC("#27AE60")}>✂️ Mano de obra</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {[
              { id: "hechura", label: "Por hechura" },
              { id: "tiempo",  label: "Por tiempo" },
            ].map(m => {
              const activo = it.moModo === m.id ||
                (m.id === "hechura" && it.moModo === "prenda") ||
                (m.id === "tiempo" && it.moModo === "hora");
              return (
                <button key={m.id} onClick={() => editField("moModo", m.id)} style={{
                  flex: 1, padding: "5px 6px", borderRadius: 6,
                  border: "1.5px solid " + (activo ? "#27AE60" : "#e0e0e0"),
                  background: activo ? "#27AE60" : "#fff",
                  color: activo ? "#fff" : "#666",
                  fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}>
                  {m.label}
                </button>
              );
            })}
          </div>
          {(() => {
            const esTiempo = it.moModo === "tiempo" || it.moModo === "hora";
            // Match con la fila de BD para inline-edit del precio
            const nombreBD = esTiempo ? "Por tiempo" : "Por hechura";
            const moBD = costos.mano_obra.find(x => x.nombre === nombreBD);
            const costoBD = moBD ? Number(moBD.costo) : null;
            const costoUI = num(it.moCostoUnit);
            const hayCambioPrecio = moBD && costoUI > 0 && costoBD !== costoUI;
            const guardarMO = async () => {
              if (!moBD) {
                pushToast("No encuentro este modo en BD", "error");
                return;
              }
              const guardado = await upsertCosto({
                id: moBD.id, categoria: "mano_obra",
                nombre: moBD.nombre, unidad: moBD.unidad, costo: costoUI,
              });
              if (guardado) {
                pushToast(`${moBD.nombre} actualizado a $${costoUI}`, "success");
                if (onRefrescarCostos) await onRefrescarCostos();
              } else {
                pushToast("No pude guardar", "error");
              }
            };
            return (
              <>
                <div style={{ display: "grid", gridTemplateColumns: esTiempo ? "1fr 1fr auto" : "1fr auto", gap: 6 }}>
                  <input
                    type="number" step="0.01" min="0"
                    style={INP} value={it.moCostoUnit}
                    onChange={e => editField("moCostoUnit", e.target.value)}
                    placeholder={esTiempo ? "$/hora" : "$/prenda"}
                  />
                  {esTiempo && (
                    <input
                      type="number" step="0.5" min="0"
                      style={INP} value={it.moHoras}
                      onChange={e => editField("moHoras", e.target.value)}
                      placeholder="Horas totales"
                    />
                  )}
                  {hayCambioPrecio && (
                    <button
                      onClick={guardarMO}
                      title={`Actualizar precio base de "${moBD.nombre}"`}
                      style={{
                        padding: "4px 10px", borderRadius: 8,
                        border: "1.5px solid #27AE60", background: "#27AE60",
                        color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 800,
                        fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >💾 Guardar</button>
                  )}
                </div>
              </>
            );
          })()}
          <div style={{ fontSize: 10, color: "#27AE60", textAlign: "right", marginTop: 2 }}>= {fmt$(c.mo)}</div>

          {/* 🪡 Bordado opcional */}
          <div style={SEC("#9B59B6")}>🪡 Bordado (opcional)</div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, cursor: "pointer", fontSize: 12 }}>
            <input
              type="checkbox"
              checked={it.bordActivo}
              onChange={e => editField("bordActivo", e.target.checked)}
            />
            ¿Lleva bordado?
          </label>
          {it.bordActivo && (
            <>
              <input
                type="number" min="0" inputMode="numeric"
                style={INP} value={it.bordPunt}
                onChange={e => editField("bordPunt", e.target.value)}
                placeholder="Puntadas del diseño (ej. 8500)"
              />
              <div style={{ fontSize: 10, color: "#9B59B6", textAlign: "right", marginTop: 2 }}>= {fmt$(c.bord)}</div>
            </>
          )}

          {/* ➕ Otros */}
          <div style={SEC("#E67E22")}>➕ Otros (botones, zíperes, cuello, hilos…)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
            {costos.extra.map(x => (
              <button key={x.id} onClick={() => addOtro({ nombre: x.nombre, costo: x.costo })} style={{
                padding: "3px 8px", borderRadius: 12,
                border: "1.5px dashed #fcd3a0", background: "#FFFBF6",
                color: "#E67E22", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit",
              }}>
                + {x.nombre} ${x.costo}
              </button>
            ))}
            <button onClick={() => addOtro()} style={{
              padding: "3px 8px", borderRadius: 12,
              border: "1.5px solid #E67E22", background: "#E67E22",
              color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit",
            }}>
              + Personalizado
            </button>
          </div>
          {it.otros && it.otros.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {it.otros.map(o => (
                <div key={o.id} style={{ display: "grid", gridTemplateColumns: "1fr 50px 60px 24px", gap: 3 }}>
                  <input style={{ ...INP, padding: "4px 6px", fontSize: 11 }} value={o.nombre} placeholder="Item" onChange={e => editOtro(o.id, "nombre", e.target.value)} />
                  <input type="number" min="0" style={{ ...INP, padding: "4px 6px", textAlign: "center", fontSize: 11 }} value={o.qty} onChange={e => editOtro(o.id, "qty", e.target.value)} />
                  <input type="number" step="0.01" min="0" style={{ ...INP, padding: "4px 6px", textAlign: "center", fontSize: 11, color: "#27AE60", fontWeight: 700 }} value={o.costo} onChange={e => editOtro(o.id, "costo", e.target.value)} />
                  <button onClick={() => delOtro(o.id)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#E67E22", textAlign: "right", marginTop: 2 }}>= {fmt$(c.otros)}</div>

          {/* Subtotal del item */}
          <div style={{ marginTop: 8, padding: 6, background: "#F5F5F5", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "#444", textAlign: "right" }}>
            Costo del item: <span style={{ color: "#2C1654" }}>{fmt$(c.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ModoConfeccion({ costos, items, setItems, margen, setMargen, onRefrescarCostos }) {
  const editItem = (id, next) => setItems(prev => prev.map(x => x.id === id ? next : x));
  const delItem = id => setItems(prev => prev.filter(x => x.id !== id));
  const toggleItem = id => editItem(id, { ...items.find(x => x.id === id), expandido: !items.find(x => x.id === id).expandido });
  const addItem = () => setItems(prev => [
    ...prev.map(x => ({ ...x, expandido: false })),
    itemNuevo(),
  ]);

  const costoTotal = items.reduce((s, it) => s + costoItem(it).total, 0);
  const totalQty = items.reduce((s, it) => s + num(it.qty), 0);
  const precioSugerido = costoTotal * (1 + margen / 100);

  return (
    <>
      {items.map((it, idx) => (
        <ItemConfeccion
          key={it.id}
          it={it} idx={idx} costos={costos}
          onChange={next => editItem(it.id, next)}
          onDel={() => delItem(it.id)}
          onToggle={() => toggleItem(it.id)}
          onRefrescarCostos={onRefrescarCostos}
        />
      ))}
      <button onClick={addItem} style={{
        width: "100%", padding: "10px", borderRadius: 8,
        border: "1.5px dashed #9B59B6", background: "#F3E5F5",
        color: "#9B59B6", fontWeight: 800, fontSize: 13,
        cursor: "pointer", marginBottom: 10, fontFamily: "inherit",
      }}>
        + Agregar prenda
      </button>

      <BloqueTotales
        costoTotal={costoTotal}
        precioSugerido={precioSugerido}
        margen={margen}
        setMargen={setMargen}
        totalQty={totalQty}
      />
    </>
  );
}

// ── Modo Bordado simple ─────────────────────────────────────

function ModoBordado({ datos, setDatos, margen, setMargen }) {
  const qty = num(datos.qty);
  const costoUnit = calcCostoBordado(datos.puntadas);
  const costoTotal = costoUnit * qty;
  const precioSugerido = costoTotal * (1 + margen / 100);

  return (
    <>
      <div style={{ background: "#F3E5F5", padding: 10, borderRadius: 10, marginBottom: 10 }}>
        <div style={{ marginBottom: 6 }}>
          <label style={LBL}>Soporte (sobre qué se borda)</label>
          <input style={INP} value={datos.soporte} placeholder="Camisa, Filipina, Gorra…"
            onChange={e => setDatos({ ...datos, soporte: e.target.value })}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={LBL}>Cantidad</label>
            <input type="number" min="1" style={INP} value={datos.qty}
              onChange={e => setDatos({ ...datos, qty: e.target.value })} />
          </div>
          <div>
            <label style={LBL}>Puntadas del diseño</label>
            <input type="number" min="0" style={INP} value={datos.puntadas}
              onChange={e => setDatos({ ...datos, puntadas: e.target.value })}
              placeholder="8500" />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 8, textAlign: "center" }}>
        Costo por unidad: <strong>{fmt$(costoUnit)}</strong> · Costo total: <strong>{fmt$(costoTotal)}</strong>
      </div>
      <BloqueTotales
        costoTotal={costoTotal}
        precioSugerido={precioSugerido}
        margen={margen}
        setMargen={setMargen}
        totalQty={qty}
      />
    </>
  );
}

// ── Modo Cuellos simple ─────────────────────────────────────

const TIPOS_CUELLO = ["Cuello tejido", "Puño", "Banda"];
const MATERIALES_CUELLO = ["Acrílico", "Algodón", "Lana", "Mezcla"];

function ModoCuello({ datos, setDatos, margen, setMargen, costos }) {
  const qty = num(datos.qty);
  const costoUnit = num(datos.costoUnit);
  const costoTotal = costoUnit * qty;
  const precioSugerido = costoTotal * (1 + margen / 100);

  return (
    <>
      <div style={{ background: "#FFF4E6", padding: 10, borderRadius: 10, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
          <div>
            <label style={LBL}>Tipo</label>
            <select style={INP} value={datos.tipo} onChange={e => setDatos({ ...datos, tipo: e.target.value })}>
              {TIPOS_CUELLO.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Material</label>
            <select style={INP} value={datos.material} onChange={e => setDatos({ ...datos, material: e.target.value })}>
              {MATERIALES_CUELLO.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={LBL}>Cantidad</label>
            <input type="number" min="1" style={INP} value={datos.qty}
              onChange={e => setDatos({ ...datos, qty: e.target.value })} />
          </div>
          <div>
            <label style={LBL}>Costo por unidad ($)</label>
            <input type="number" step="0.01" min="0" style={INP} value={datos.costoUnit}
              onChange={e => setDatos({ ...datos, costoUnit: e.target.value })} />
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 8, textAlign: "center" }}>
        Costo total: <strong>{fmt$(costoTotal)}</strong>
      </div>
      <BloqueTotales
        costoTotal={costoTotal}
        precioSugerido={precioSugerido}
        margen={margen}
        setMargen={setMargen}
        totalQty={qty}
      />
    </>
  );
}

// ── Bloque de totales + margen + acciones ───────────────────

function BloqueTotales({ costoTotal, precioSugerido, margen, setMargen, totalQty }) {
  return (
    <div style={{ marginTop: 6, padding: 12, background: "#F5F5F5", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#444" }}>
        <span style={{ fontWeight: 700 }}>Costo total</span>
        <span style={{ fontWeight: 800 }}>{fmt$(costoTotal)}</span>
      </div>
      <div style={{ ...LBL, marginTop: 8 }}>Margen de ganancia</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {MARGENES.map(m => (
          <button key={m} onClick={() => setMargen(m)} style={{
            padding: "5px 12px", borderRadius: 16,
            border: "1.5px solid " + (margen === m ? "#28A745" : "#e0e0e0"),
            background: margen === m ? "#28A745" : "#fff",
            color: margen === m ? "#fff" : "#666",
            fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>{m}%</button>
        ))}
        <input type="number" min="0" max="500" value={margen}
          onChange={e => setMargen(parseInt(e.target.value) || 0)}
          style={{ width: 60, padding: "5px 8px", borderRadius: 16, border: "1.5px solid #e0e0e0", textAlign: "center", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
        />
      </div>
      <div style={{ marginTop: 10, padding: 12, background: "#E8F5E9", border: "2px solid #28A745", borderRadius: 10 }}>
        <div style={LBL}>Precio sugerido</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#1A5F33" }}>{fmt$(precioSugerido)}</div>
        {totalQty > 0 && (
          <div style={{ fontSize: 12, color: "#1A5F33" }}>
            <strong>{fmt$(precioSugerido / totalQty)}</strong> por unidad ({totalQty} {totalQty === 1 ? "prenda" : "prendas"})
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────

export default function EstimadorPrecio({ open, onClose, onAplicar, clientes = [], onGuardarCotizacion }) {
  const [costos, setCostos] = useState({ tela: [], mano_obra: [], extra: [] });
  const [modo, setModo] = useState("confeccion"); // confeccion | bordado | cuello

  // Confección: lista de items
  const [items, setItems] = useState([itemNuevo()]);

  // Bordado: datos simples
  const [bordDatos, setBordDatos] = useState({ soporte: "", qty: "1", puntadas: "" });

  // Cuellos: datos simples
  const [cuelloDatos, setCuelloDatos] = useState({ tipo: TIPOS_CUELLO[0], material: MATERIALES_CUELLO[0], qty: "1", costoUnit: "3.5" });

  const [margen, setMargen] = useState(50);

  // Datos del cliente para guardar la cotización formal
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");

  // Autocomplete contra los clientes ya registrados en la app
  const sugClientes = (clientes || [])
    .filter(c => cliente && c.nombre && c.nombre.toLowerCase().includes(cliente.toLowerCase()) && c.nombre.toLowerCase() !== cliente.toLowerCase())
    .slice(0, 5);

  // Cuando el user elige un cliente del dropdown, autopobla el teléfono
  const elegirCliente = c => {
    setCliente(c.nombre);
    if (c.telefono) setTelefono(c.telefono);
  };

  // Botón WhatsApp: ?phone=... → wa.me/. Quita todo lo no-numérico.
  const waURL = telefono
    ? `https://wa.me/${telefono.replace(/[^0-9]/g, "")}`
    : null;

  useEffect(() => {
    if (!open) return;
    leerCostos().then(rows => setCostos(agruparCostos(rows)));
  }, [open]);

  // Recarga la tabla de costos desde la BD (usado tras un guardado inline).
  const refrescarCostos = async () => {
    const rows = await leerCostos();
    setCostos(agruparCostos(rows));
  };

  const precioSugerido = useMemo(() => {
    if (modo === "confeccion") {
      const ct = items.reduce((s, it) => s + costoItem(it).total, 0);
      return ct * (1 + margen / 100);
    }
    if (modo === "bordado") {
      return calcCostoBordado(bordDatos.puntadas) * num(bordDatos.qty) * (1 + margen / 100);
    }
    return num(cuelloDatos.costoUnit) * num(cuelloDatos.qty) * (1 + margen / 100);
  }, [modo, items, bordDatos, cuelloDatos, margen]);

  const resumen = useMemo(() => {
    if (modo === "confeccion") {
      const lineas = items.filter(it => num(it.qty) > 0).map(it => `${it.qty} × ${it.tipoPrenda || "Item"}`).join(", ");
      return `${lineas} — ${fmt$(precioSugerido)} total`;
    }
    if (modo === "bordado") {
      return `${bordDatos.qty} × ${bordDatos.soporte || "bordado"} (${bordDatos.puntadas || 0} puntadas) — ${fmt$(precioSugerido)}`;
    }
    return `${cuelloDatos.qty} × ${cuelloDatos.tipo} ${cuelloDatos.material} — ${fmt$(precioSugerido)}`;
  }, [modo, items, bordDatos, cuelloDatos, precioSugerido]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resumen);
      pushToast("Resumen copiado al portapapeles", "success");
    } catch {
      pushToast("No pude copiar", "error");
    }
  };

  const aplicar = () => {
    if (onAplicar) {
      onAplicar(precioSugerido);
      pushToast("Precio aplicado al pedido", "success");
      onClose();
    }
  };

  // Genera el shape del pedido (cotización) a partir del estado actual
  // del estimador. Cada item del estimador queda como un tallasItem del
  // pedido — sin talla específica (es cotización rough), con precio
  // unitario derivado del costo + margen.
  const armarCotizacion = () => {
    if (!cliente.trim()) return null;
    if (modo === "confeccion") {
      const tallasItems = items
        .filter(it => num(it.qty) > 0 && (it.tipoPrenda || "").trim())
        .map(it => {
          const costo = costoItem(it).total;
          const precioItem = costo * (1 + margen / 100);
          const precioUnit = it.qty > 0 ? precioItem / num(it.qty) : 0;
          return {
            id: it.id,
            tipo: (it.tipoPrenda || "").trim(),
            talla: "",
            qty: num(it.qty),
            precio: parseFloat(precioUnit.toFixed(2)),
            spec: "",
            grupo: "adulto",
          };
        });
      return {
        cliente: cliente.trim(),
        telefono: telefono.trim(),
        tipoPrenda: items[0]?.tipoPrenda || "Cotización",
        tallasItems,
        modoRegistro: "tallas",
        precio: precioSugerido.toFixed(2),
        validezDias: 15,
      };
    }
    if (modo === "bordado") {
      const qty = num(bordDatos.qty);
      const precioUnit = qty > 0 ? precioSugerido / qty : 0;
      return {
        cliente: cliente.trim(),
        telefono: telefono.trim(),
        tipoPrenda: `Bordado en ${bordDatos.soporte || "soporte"}`,
        tallasItems: [{
          id: Date.now(),
          tipo: bordDatos.soporte || "Bordado",
          talla: "",
          qty,
          precio: parseFloat(precioUnit.toFixed(2)),
          spec: `${bordDatos.puntadas || 0} puntadas`,
          grupo: "adulto",
        }],
        modoRegistro: "tallas",
        precio: precioSugerido.toFixed(2),
        validezDias: 15,
      };
    }
    // cuello
    const qty = num(cuelloDatos.qty);
    const precioUnit = qty > 0 ? precioSugerido / qty : 0;
    return {
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      tipoPrenda: `${cuelloDatos.tipo} (${cuelloDatos.material})`,
      tallasItems: [{
        id: Date.now(),
        tipo: cuelloDatos.tipo,
        talla: "",
        qty,
        precio: parseFloat(precioUnit.toFixed(2)),
        spec: cuelloDatos.material,
        grupo: "adulto",
      }],
      modoRegistro: "tallas",
      precio: precioSugerido.toFixed(2),
      validezDias: 15,
    };
  };

  const guardarCotizacion = () => {
    const cot = armarCotizacion();
    if (!cot) {
      pushToast("Falta el nombre del cliente", "error");
      return;
    }
    if (onGuardarCotizacion) {
      onGuardarCotizacion(cot);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <Modal onClose={onClose} title="💰 Estimador de precio (uso interno)">
      <div>
        {/* Selector de modo */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "#f0f0f0", padding: 3, borderRadius: 10 }}>
          {[
            { id: "confeccion", label: "📋 Confección" },
            { id: "bordado",    label: "🪡 Bordado" },
            { id: "cuello",     label: "🧶 Cuellos" },
          ].map(m => (
            <button key={m.id} onClick={() => setModo(m.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
              background: modo === m.id ? "#9B59B6" : "transparent",
              color: modo === m.id ? "#fff" : "#666",
              fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>
              {m.label}
            </button>
          ))}
        </div>

        {modo === "confeccion" && (
          <ModoConfeccion costos={costos} items={items} setItems={setItems} margen={margen} setMargen={setMargen} onRefrescarCostos={refrescarCostos} />
        )}
        {modo === "bordado" && (
          <ModoBordado datos={bordDatos} setDatos={setBordDatos} margen={margen} setMargen={setMargen} />
        )}
        {modo === "cuello" && (
          <ModoCuello datos={cuelloDatos} setDatos={setCuelloDatos} margen={margen} setMargen={setMargen} costos={costos} />
        )}

        {/* CLIENTE (para guardar cotización formal) */}
        <div style={{ marginTop: 12, padding: 12, background: "#F3E5F5", borderRadius: 10, border: "1.5px solid #d4b3df" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9B59B6", textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>
            👤 Cliente (para guardar cotización)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, position: "relative" }}>
            <div style={{ position: "relative" }}>
              <input
                style={INP}
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                placeholder="Nombre del cliente"
                list="clientes-existentes"
              />
              <datalist id="clientes-existentes">
                {(clientes || []).map(c => (
                  <option key={c.id} value={c.nombre} />
                ))}
              </datalist>
              {sugClientes.length > 0 && (
                <div style={{
                  position: "absolute", left: 0, right: 0, top: "100%",
                  zIndex: 10, background: "#fff", border: "1.5px solid #d4b3df",
                  borderRadius: 6, marginTop: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  maxHeight: 140, overflowY: "auto",
                }}>
                  {sugClientes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => elegirCliente(c)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "6px 10px", border: "none", background: "#fff",
                        cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                        borderBottom: "1px solid #f5f5f5",
                      }}
                    >
                      <strong>{c.nombre}</strong>
                      {c.telefono && <span style={{ color: "#888", fontSize: 11, marginLeft: 6 }}>📱 {c.telefono}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <input
                style={INP}
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="Teléfono"
                type="tel"
                inputMode="tel"
              />
              {waURL && (
                <a
                  href={waURL}
                  target="_blank"
                  rel="noopener"
                  title="Abrir WhatsApp"
                  style={{
                    padding: "8px 10px", borderRadius: 8, border: "1.5px solid #25D366",
                    background: "#25D366", color: "#fff", textDecoration: "none",
                    fontSize: 16, display: "flex", alignItems: "center",
                  }}
                >💬</a>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={copiar} style={{
            flex: "1 1 100px", padding: "10px", borderRadius: 8,
            border: "1.5px solid #9B59B6", background: "#fff",
            color: "#9B59B6", fontWeight: 800, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            📋 Copiar
          </button>
          {onAplicar && (
            <button onClick={aplicar} style={{
              flex: "1 1 100px", padding: "10px", borderRadius: 8, border: "none",
              background: "#9B59B6", color: "#fff", fontWeight: 800, fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              📦 Usar precio
            </button>
          )}
          {onGuardarCotizacion && (
            <button onClick={guardarCotizacion}
              disabled={!cliente.trim()}
              title={cliente.trim() ? "Guarda como cotización y abre el PDF formal" : "Escribe el nombre del cliente primero"}
              style={{
                flex: "1 1 100%", padding: "12px", borderRadius: 8, border: "none",
                background: cliente.trim() ? "#27AE60" : "#bbb",
                color: "#fff", fontWeight: 800, fontSize: 13,
                cursor: cliente.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
              }}>
              💾 Guardar y abrir cotización formal
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
