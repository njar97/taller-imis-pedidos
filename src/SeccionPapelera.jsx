// Vista de Papelera (admin). Lista registros con deleted_at != null y permite
// restaurar o purgar definitivamente.
//
// Lazy-loaded desde main.js — no entra al bundle inicial.

import {
  dbPapelera, dbRestaurar, dbPurgar,
  dbBordPapelera, dbBordRestaurar, dbBordPurgar,
  dbCuelPapelera, dbCuelRestaurar, dbCuelPurgar,
  dbClientesPapelera, dbClientesRestaurar, dbClientesPurgar,
} from "./lib/db.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";

import { useState, useEffect, useCallback } from "react";

const TABS = [
  { id: "pedidos",  label: "Confección", icon: "✂️", leer: dbPapelera,         restaurar: dbRestaurar,         purgar: dbPurgar         },
  { id: "bordados", label: "Bordados",   icon: "🪡", leer: dbBordPapelera,     restaurar: dbBordRestaurar,     purgar: dbBordPurgar     },
  { id: "cuellos",  label: "Cuellos",    icon: "🧶", leer: dbCuelPapelera,     restaurar: dbCuelRestaurar,     purgar: dbCuelPurgar     },
  { id: "clientes", label: "Clientes",   icon: "👥", leer: dbClientesPapelera, restaurar: dbClientesRestaurar, purgar: dbClientesPurgar },
];

function fmtFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("es-SV", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function describir(tab, row) {
  if (tab === "pedidos" || tab === "bordados" || tab === "cuellos") {
    return `${row.cliente || "Sin cliente"}${row.tipoPrenda ? " · " + row.tipoPrenda : ""}${row.diseno ? " · " + row.diseno : ""}`;
  }
  if (tab === "clientes") {
    return `${row.nombre || "Sin nombre"}${row.telefono ? " · " + row.telefono : ""}`;
  }
  return `id ${row.id}`;
}

export default function SeccionPapelera({ onRestaurado }) {
  const [tab, setTab] = useState("pedidos");
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const cfg = TABS.find(t => t.id === tab);

  const cargar = useCallback(async () => {
    setCargando(true);
    setItems(await cfg.leer());
    setCargando(false);
  }, [cfg]);

  useEffect(() => { cargar(); }, [cargar]);

  const restaurar = async (id) => {
    const ok = await cfg.restaurar(id);
    if (ok) {
      pushToast("Restaurado", "ok");
      setItems(items.filter(r => r.id !== id));
      onRestaurado && onRestaurado(tab, id);
    }
  };

  const purgar = async (id) => {
    const conf = await pushConfirm({
      titulo: "¿Borrar para siempre?",
      msg: "Este registro no se puede recuperar después de purgar.",
      okLabel: "Sí, purgar",
      danger: true,
    });
    if (!conf) return;
    const ok = await cfg.purgar(id);
    if (ok) {
      pushToast("Purgado", "ok");
      setItems(items.filter(r => r.id !== id));
    }
  };

  return (
    <div style={{ padding: "12px 16px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#2C1654", margin: "8px 0 16px" }}>
        🗑️ Papelera
      </h2>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
        Los registros borrados quedan acá. Restauralos si fue un error, o purgalos para liberar espacio.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 14px",
              border: "1px solid " + (tab === t.id ? "#2C1654" : "#DDD"),
              background: tab === t.id ? "#2C1654" : "#FFF",
              color: tab === t.id ? "#FFF" : "#333",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div style={{ textAlign: "center", padding: 32, color: "#999" }}>⏳ Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 32, color: "#999" }}>
          No hay registros borrados en {cfg.label.toLowerCase()}.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map(r => (
            <li
              key={r.id}
              style={{
                background: "#FFF",
                border: "1px solid #EEE",
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  #{r.id} · {describir(tab, r)}
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                  Borrado: {fmtFecha(r.deletedAt)}
                </div>
              </div>
              <button
                onClick={() => restaurar(r.id)}
                style={{
                  padding: "6px 10px",
                  background: "#28A745",
                  color: "#FFF",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ↩ Restaurar
              </button>
              <button
                onClick={() => purgar(r.id)}
                style={{
                  padding: "6px 10px",
                  background: "#FFF",
                  color: "#DC3545",
                  border: "1px solid #DC3545",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🗑 Purgar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
