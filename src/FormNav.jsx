// Barra sticky de navegación rápida del FormPedido. En vez de scroll
// infinito, el usuario puede saltar a cualquier sección con un tap.
// Highlight automático de la sección visible (IntersectionObserver).
//
// Las secciones cuyo `id` recibe un error se marcan en rojo — pista
// visual para llenar lo obligatorio antes de guardar.

import { useEffect, useRef, useState } from "react";

export const SECCIONES_FORM = [
  { id: "sec-cliente",   icon: "👤", label: "Cliente",   color: "#2C1654" },
  { id: "sec-producto", icon: "📦", label: "Producto", color: "#9B59B6" },
  { id: "sec-tela",      icon: "🧵", label: "Tela",      color: "#1A5276" },
  { id: "sec-fecha",     icon: "📌", label: "Fecha",     color: "#27AE60" },
  { id: "sec-costurera", icon: "✂️", label: "Costurera", color: "#007BFF" },
  { id: "sec-desc",      icon: "📝", label: "Bordado",   color: "#9B59B6", opcional: true },
  { id: "sec-precio",    icon: "💰", label: "Precio",    color: "#27AE60", opcional: true },
  { id: "sec-factura",   icon: "🧾", label: "Factura",   color: "#E67E22", opcional: true },
  { id: "sec-obs",       icon: "📌", label: "Notas",     color: "#888",    opcional: true },
  { id: "sec-fotos",     icon: "📸", label: "Fotos",     color: "#E91E8C", opcional: true },
  { id: "sec-formales",  icon: "📋", label: "Cotización",color: "#9B59B6", opcional: true },
];

// completado: { "sec-cliente": true, "sec-producto": false, ... }
// Solo aplica a secciones requeridas — las opcionales no muestran ✓.
const REQUERIDAS = new Set(["sec-cliente", "sec-producto", "sec-fecha"]);

export default function FormNav({ erroresIds = [], completado = {} }) {
  const [activeId, setActiveId] = useState(SECCIONES_FORM[0].id);
  const barRef = useRef(null);

  useEffect(() => {
    // Detecta qué sección tiene más visibilidad en el viewport del scroll
    // container. rootMargin recorta arriba (alto de la barra) y abajo (deja
    // de contar lo que apenas asoma).
    const obs = new IntersectionObserver(
      entries => {
        const visibles = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visibles[0]) setActiveId(visibles[0].target.id);
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    SECCIONES_FORM.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  // Cuando cambia la sección activa, scrolleo el chip al centro de la barra
  // para que siempre se vea el "estás aquí".
  useEffect(() => {
    if (!barRef.current) return;
    const chip = barRef.current.querySelector(`[data-sec="${activeId}"]`);
    if (chip && chip.scrollIntoView) {
      chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  const irA = id => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      ref={barRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "#fff",
        borderBottom: "1px solid #e8e8e8",
        padding: "8px 0",
        margin: "-12px -12px 12px",
        overflowX: "auto",
        whiteSpace: "nowrap",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ padding: "0 12px", display: "inline-block" }}>
        {SECCIONES_FORM.map(s => {
          const active = s.id === activeId;
          const error = erroresIds.includes(s.id);
          const done = REQUERIDAS.has(s.id) && completado[s.id] && !error;
          const borderColor = error ? "#E74C3C" : done ? "#27AE60" : active ? s.color : "#e0e0e0";
          const bg = error ? "#FDECEA" : done && !active ? "#F0FFF4" : active ? s.color : "#fff";
          const fg = active ? "#fff" : error ? "#E74C3C" : done ? "#27AE60" : "#666";
          return (
            <button
              key={s.id}
              data-sec={s.id}
              onClick={() => irA(s.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                marginRight: 6,
                border: "1.5px solid " + borderColor,
                borderRadius: 999,
                background: bg,
                color: fg,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                transition: "border-color .2s, background .2s, color .2s",
              }}
            >
              <span style={{ fontSize: 13 }}>{s.icon}</span>
              <span>{s.label}</span>
              {error && <span aria-label="falta llenar">⚠</span>}
              {done && <span aria-label="completo" style={{ fontSize: 11 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
