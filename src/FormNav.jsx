// Barra sticky de navegación rápida del FormPedido. En vez de scroll
// infinito, el usuario puede saltar a cualquier sección con un tap.
// Highlight automático de la sección visible (IntersectionObserver).
//
// Las secciones cuyo `id` recibe un error se marcan en rojo — pista
// visual para llenar lo obligatorio antes de guardar.

import { useEffect, useRef, useState } from "react";

export const SECCIONES_FORM = [
  { id: "sec-cliente",   icon: "👤", label: "Cliente",   color: "#2C1654" },
  { id: "sec-prenda",    icon: "✂️", label: "Prenda",    color: "#9B59B6" },
  { id: "sec-tallas",    icon: "👕", label: "Tallas",    color: "#E67E22" },
  { id: "sec-tela",      icon: "🧵", label: "Tela",      color: "#1A5276" },
  { id: "sec-fecha",     icon: "📌", label: "Fecha",     color: "#27AE60" },
  { id: "sec-costurera", icon: "✂️", label: "Costurera", color: "#007BFF" },
  { id: "sec-desc",      icon: "📝", label: "Bordado",   color: "#9B59B6", opcional: true },
  { id: "sec-precio",    icon: "💰", label: "Precio",    color: "#27AE60", opcional: true },
  { id: "sec-factura",   icon: "🧾", label: "Factura",   color: "#E67E22", opcional: true },
  { id: "sec-obs",       icon: "📌", label: "Notas",     color: "#888",    opcional: true },
  { id: "sec-fotos",     icon: "📸", label: "Fotos",     color: "#E91E8C", opcional: true },
];

export default function FormNav({ erroresIds = [] }) {
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
                border: "1.5px solid " + (error ? "#E74C3C" : active ? s.color : "#e0e0e0"),
                borderRadius: 999,
                background: error ? "#FDECEA" : active ? s.color : "#fff",
                color: active ? "#fff" : error ? "#E74C3C" : "#666",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 13 }}>{s.icon}</span>
              <span>{s.label}</span>
              {error && <span aria-label="falta llenar">⚠</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
