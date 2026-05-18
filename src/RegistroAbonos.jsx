// Registro de abonos / pagos recibidos de un pedido.
// Antes vivía como RegistroAbonos compilado en main.js (~408 líneas).
// Usado en FormPedido, BordadoModal y CuelloModal (modos admin y no-admin).

import { useState } from "react";

const METODOS = ["Efectivo", "Transferencia", "Depósito", "Cheque", "Otro"];

const INP_BASE = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 6,
  border: "1.5px solid #e0e0e0",
  fontSize: 13,
  outline: "none",
};

const INP_MONTO = {
  width: "100%",
  padding: "7px 8px",
  borderRadius: 6,
  border: "1.5px solid #a8d8a8",
  fontSize: 14,
  fontWeight: 800,
  outline: "none",
  color: "#155724",
  textAlign: "center",
};

const INP_SELECT = {
  width: "100%",
  padding: "7px 6px",
  borderRadius: 6,
  border: "1.5px solid #e0e0e0",
  fontSize: 12,
  outline: "none",
  background: "#fff",
};

const LBL_GREEN = {
  fontSize: 9,
  fontWeight: 700,
  color: "#27AE60",
  marginBottom: 3,
  textTransform: "uppercase",
};

const LBL_GRAY = { ...LBL_GREEN, color: "#888" };

const BTN_ADD = (disabled, full = false) => ({
  ...(full ? { width: "100%" } : { alignSelf: "flex-end" }),
  padding: full ? "8px" : "8px 14px",
  borderRadius: 7,
  border: "none",
  background: disabled ? "#e0e0e0" : "#27AE60",
  color: "#fff",
  fontWeight: 800,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: full ? undefined : "nowrap",
});

const MONTO_BADGE = {
  fontSize: 10,
  background: "#d4edda",
  color: "#155724",
  padding: "2px 7px",
  borderRadius: 10,
  fontWeight: 700,
};

export default function RegistroAbonos({ abonos, precioTotal, onChange, esAdmin }) {
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [metodo, setMet] = useState("Efectivo");

  const lista = abonos || [];
  const totalAbonado = lista.reduce((s, a) => s + parseFloat(a.monto || 0), 0);
  const saldo = parseFloat(precioTotal || 0) - totalAbonado;
  const pct = precioTotal > 0
    ? Math.min((totalAbonado / parseFloat(precioTotal)) * 100, 100)
    : 0;

  const montoN = parseFloat(monto);
  const disabled = !monto || montoN <= 0;

  function agregar() {
    if (!montoN || montoN <= 0) return;
    const nuevo = {
      id: Date.now(),
      monto: montoN,
      nota: nota.trim(),
      metodo,
      fecha: new Date().toISOString().split("T")[0],
    };
    onChange([...lista, nuevo]);
    setMonto("");
    setNota("");
  }

  function quitar(id) {
    onChange(lista.filter(a => a.id !== id));
  }

  // ── Modo NO-admin: solo registra, sin saldo ni botón quitar ──
  if (!esAdmin) {
    return (
      <div style={{ border: "1.5px solid #a8d8a8", borderRadius: 10, overflow: "hidden", marginTop: 10 }}>
        <div style={{ background: "#f0fff4", padding: "8px 14px", fontSize: 11, fontWeight: 700, color: "#155724" }}>
          💵 Registrar pago recibido
        </div>

        {lista.length > 0 && (
          <div style={{ borderBottom: "1px solid #d4edda" }}>
            {lista.map((a, i) => (
              <div
                key={a.id || i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 14px",
                  background: i % 2 === 0 ? "#fff" : "#f8fff9",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 900, color: "#155724", minWidth: 52 }}>
                  ${parseFloat(a.monto || 0).toFixed(2)}
                </span>
                <span style={{ ...MONTO_BADGE, flexShrink: 0 }}>{a.metodo}</span>
                <span style={{ fontSize: 11, color: "#666", flex: 1 }}>{a.nota || ""}</span>
                <span style={{ fontSize: 10, color: "#aaa", flexShrink: 0 }}>{a.fecha}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: "10px 14px", background: "#fafafa" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8, marginBottom: 6 }}>
            <div>
              <div style={LBL_GRAY}>Nota del pago</div>
              <input
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Ej: cliente pagó en efectivo"
                style={INP_BASE}
              />
            </div>
            <div>
              <div style={LBL_GRAY}>Método</div>
              <select value={metodo} onChange={e => setMet(e.target.value)} style={INP_SELECT}>
                {METODOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <div>
              <div style={LBL_GREEN}>Monto recibido ($)</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregar()}
                placeholder="0.00"
                style={INP_MONTO}
              />
            </div>
            <button onClick={agregar} disabled={disabled} style={BTN_ADD(disabled)}>
              ✅ Registrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Modo ADMIN: resumen + barra + lista con quitar ──
  return (
    <div style={{ border: "1.5px solid #a8d8a8", borderRadius: 10, overflow: "hidden", marginTop: 10 }}>
      <div style={{ background: "#f0fff4", padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#155724", textTransform: "uppercase", letterSpacing: 0.5 }}>
            💵 Registro de abonos
          </span>
          <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
            <span style={{ color: "#27AE60", fontWeight: 700 }}>
              Cobrado: ${totalAbonado.toFixed(2)}
            </span>
            <span style={{ color: saldo > 0 ? "#E63946" : "#27AE60", fontWeight: 800 }}>
              {saldo > 0 ? `Saldo: $${saldo.toFixed(2)}` : "✅ Pagado"}
            </span>
          </div>
        </div>
        {parseFloat(precioTotal || 0) > 0 && (
          <div style={{ background: "#d4edda", borderRadius: 6, height: 8, overflow: "hidden" }}>
            <div
              style={{
                width: pct + "%",
                background: "linear-gradient(90deg,#27AE60,#1abc9c)",
                height: "100%",
                borderRadius: 6,
                transition: "width .4s",
              }}
            />
          </div>
        )}
      </div>

      {lista.length > 0 && (
        <div style={{ borderBottom: "1px solid #d4edda" }}>
          {lista.map((a, i) => (
            <div
              key={a.id || i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                background: i % 2 === 0 ? "#fff" : "#f8fff9",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#155724" }}>
                    ${parseFloat(a.monto).toFixed(2)}
                  </span>
                  <span style={MONTO_BADGE}>{a.metodo}</span>
                  <span style={{ fontSize: 10, color: "#aaa" }}>{a.fecha}</span>
                </div>
                {a.nota && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>{a.nota}</div>
                )}
              </div>
              <button
                onClick={() => quitar(a.id || i)}
                style={{
                  background: "none",
                  border: "1px solid #fdd",
                  borderRadius: 6,
                  padding: "3px 8px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#DC3545",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: "10px 14px", background: "#fafafa" }}>
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px", gap: 8, marginBottom: 6 }}>
          <div>
            <div style={LBL_GREEN}>Monto ($)</div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              onKeyDown={e => e.key === "Enter" && agregar()}
              placeholder="0.00"
              style={INP_MONTO}
            />
          </div>
          <div>
            <div style={LBL_GRAY}>Nota (opcional)</div>
            <input
              value={nota}
              onChange={e => setNota(e.target.value)}
              onKeyDown={e => e.key === "Enter" && agregar()}
              placeholder="Ej: transferencia Bancoagrícola"
              style={INP_BASE}
            />
          </div>
          <div>
            <div style={LBL_GRAY}>Método</div>
            <select value={metodo} onChange={e => setMet(e.target.value)} style={INP_SELECT}>
              {METODOS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <button onClick={agregar} disabled={disabled} style={BTN_ADD(disabled, true)}>
          + Registrar abono{monto && parseFloat(monto) > 0 ? ` de $${parseFloat(monto).toFixed(2)}` : ""}
        </button>
      </div>
    </div>
  );
}
