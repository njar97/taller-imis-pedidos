// Lightbox de imágenes: pantalla completa, navegación con flechas + swipe + thumbnails.
// Recibe la lista de URLs y el índice actual; el cambio de índice y el cierre
// se propagan al padre vía callbacks.

const { useRef } = React;

export default function VisorImagenes({ imgs, idx, setIdx, onCerrar }) {
  const touchX = useRef(null);

  const prev = () => setIdx((idx - 1 + imgs.length) % imgs.length);
  const next = () => setIdx((idx + 1) % imgs.length);
  const src = imgs[idx];

  const onTouchStart = e => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = e => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) {
      dx < 0 ? next() : prev();
    }
    touchX.current = null;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        padding: "16px 8px",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          padding: "0 8px",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            opacity: 0.7,
          }}
        >
          {idx + 1} / {imgs.length}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              background: "rgba(155,89,182,0.8)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            🔗 Drive
          </a>
          <button
            onClick={onCerrar}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
        }}
      >
        {imgs.length > 1 && (
          <button
            onClick={prev}
            style={{
              position: "absolute",
              left: 0,
              zIndex: 10,
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              fontSize: 28,
              fontWeight: 700,
              cursor: "pointer",
              borderRadius: 8,
              padding: "12px 14px",
              backdropFilter: "blur(4px)",
            }}
          >
            ‹
          </button>
        )}
        <img
          src={src}
          style={{
            maxWidth: "calc(100% - 80px)",
            maxHeight: "75vh",
            borderRadius: 10,
            objectFit: "contain",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
        {imgs.length > 1 && (
          <button
            onClick={next}
            style={{
              position: "absolute",
              right: 0,
              zIndex: 10,
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              fontSize: 28,
              fontWeight: 700,
              cursor: "pointer",
              borderRadius: 8,
              padding: "12px 14px",
              backdropFilter: "blur(4px)",
            }}
          >
            ›
          </button>
        )}
      </div>

      {imgs.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 12,
            overflowX: "auto",
            padding: "4px 8px",
            maxWidth: "100%",
          }}
        >
          {imgs.map((s, i) => (
            <img
              key={i}
              src={s}
              onClick={() => setIdx(i)}
              style={{
                width: 52,
                height: 52,
                borderRadius: 6,
                objectFit: "cover",
                cursor: "pointer",
                border: i === idx ? "2.5px solid #9B59B6" : "2px solid transparent",
                opacity: i === idx ? 1 : 0.55,
                flexShrink: 0,
                transition: "opacity .2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
