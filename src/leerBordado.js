// ══ LECTOR DE ARCHIVOS DE BORDADO ══════════════════════════
// Lee metadata de .dst (Tajima) y .pes (Brother)
// .emb (Wilcom) es propietario y no es legible sin su SDK
//
// Este módulo se carga sólo cuando el usuario sube un archivo de bordado
// (dynamic import desde BordadoModal). Sale del bundle inicial.

export function leerMetadataBordado(file) {
  return new Promise(res => {
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = e => {
      const buf = e.target.result;
      const bytes = new Uint8Array(buf);

      try {
        // ── DST (Tajima) ──────────────────────────────────────
        // Header: campos separados por \r, formato CAMPO:valor
        if (ext === "dst") {
          const dec = new TextDecoder("ascii");
          const hdr = dec.decode(bytes.slice(0, 512));

          // LA: nombre del diseño
          const laMatch = hdr.match(/LA:([^\r\n\x1a]+)/);
          const nombre = laMatch ? laMatch[1].trim() : null;
          // ST: puntadas
          const stMatch = hdr.match(/ST:\s*(\d+)/);
          const puntadas = stMatch ? parseInt(stMatch[1]) : null;
          // CO: número de colores
          const coMatch = hdr.match(/CO:\s*(\d+)/);
          const colores = coMatch ? parseInt(coMatch[1].trim()) : null;
          // +X -X +Y -Y: extensiones en 0.1mm
          const pxMatch = hdr.match(/\+X:\s*(\d+)/);
          const mxMatch = hdr.match(/-X:\s*(\d+)/);
          const pyMatch = hdr.match(/\+Y:\s*(\d+)/);
          const myMatch = hdr.match(/-Y:\s*(\d+)/);
          let anchoMm = null, altoMm = null;
          if (pxMatch && mxMatch) anchoMm = Math.round((parseInt(pxMatch[1]) + parseInt(mxMatch[1])) / 10);
          if (pyMatch && myMatch) altoMm = Math.round((parseInt(pyMatch[1]) + parseInt(myMatch[1])) / 10);

          // Si ST no está en header, contar puntadas manualmente
          // En DST: cada registro = 3 bytes; último registro es 3 bytes 0x00,0x00,0xF3
          let puntContadas = 0;
          if (!puntadas && bytes.length > 512) {
            for (let i = 512; i < bytes.length - 2; i += 3) {
              const b2 = bytes[i + 2];
              if (b2 === 0xF3) break; // end marker
              if ((b2 & 0x83) === 0x03) puntContadas++; // stitch bit
            }
          }

          res({
            formato: "DST (Tajima)",
            nombre: nombre || null,
            puntadas: puntadas || puntContadas || null,
            colores: colores || null,
            anchoMm: anchoMm || null,
            altoMm: altoMm || null,
          });
          return;
        }

        // ── PES (Brother) ─────────────────────────────────────
        // Header empieza con "#PES" o "#PEC"
        if (ext === "pes") {
          const sig = String.fromCharCode(...bytes.slice(0, 4));
          if (sig === "#PES") {
            // PES v1: offset 4 = versión, offset 8 = pec offset (little-endian u32)
            const pecOff = bytes[8] | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24);
            // PEC block: colores en pecOff+48
            const nCol = (bytes[pecOff + 48] || 0) + 1;
            // Dimensiones: en header PES, offset 40-47 (little-endian i16, unidades 0.1mm)
            const w = (bytes[40] | (bytes[41] << 8)) * 0.1;
            const h = (bytes[42] | (bytes[43] << 8)) * 0.1;
            // Contar puntadas desde PEC
            let punt = 0;
            if (pecOff && pecOff + 532 < bytes.length) {
              for (let i = pecOff + 532; i < bytes.length - 1; i++) {
                if (bytes[i] === 0xFF && bytes[i + 1] === 0x00) break;
                if (bytes[i] === 0xFE && bytes[i + 1] === 0xB8) { i++; continue; }
                if ((bytes[i] & 0x80) === 0) punt++;
              }
            }
            res({
              formato: "PES (Brother)",
              nombre: null,
              puntadas: punt || null,
              colores: nCol > 1 ? nCol : null,
              anchoMm: w > 0 ? Math.round(w) : null,
              altoMm: h > 0 ? Math.round(h) : null,
            });
            return;
          }
        }

        // ── JEF (Janome) ──────────────────────────────────────
        if (ext === "jef") {
          // Offset 0: puntadas (little-endian i32)
          const punt = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
          // Offset 24: colores (i32)
          const col = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16) | (bytes[27] << 24);
          // Offset 36-43: hoop extents (i32 each, en 0.1mm)
          const x1 = bytes[36] | (bytes[37] << 8) | (bytes[38] << 16) | (bytes[39] << 24);
          const x2 = bytes[40] | (bytes[41] << 8) | (bytes[42] << 16) | (bytes[43] << 24);
          const y1 = bytes[44] | (bytes[45] << 8) | (bytes[46] << 16) | (bytes[47] << 24);
          const y2 = bytes[48] | (bytes[49] << 8) | (bytes[50] << 16) | (bytes[51] << 24);
          res({
            formato: "JEF (Janome)",
            nombre: null,
            puntadas: punt > 0 ? punt : null,
            colores: col > 0 ? col : null,
            anchoMm: (x2 - x1) > 0 ? Math.round((x2 - x1) / 10) : null,
            altoMm: (y2 - y1) > 0 ? Math.round((y2 - y1) / 10) : null,
          });
          return;
        }

        // ── EMB (Wilcom) — propietario, no se puede leer ──────
        if (ext === "emb") {
          // Intentar extraer strings legibles (nombre del diseño a veces está en texto)
          const text = new TextDecoder("latin1").decode(bytes);
          // Buscar secuencias de texto imprimible largas
          const matches = text.match(/[ -~]{4,}/g) || [];
          const candidatos = matches.filter(s => s.length > 3 && s.length < 60 && /[a-zA-Z]/.test(s));
          res({
            formato: "EMB (Wilcom)",
            nombre: candidatos.length > 0 ? candidatos[0] : null,
            puntadas: null,
            colores: null,
            anchoMm: null,
            altoMm: null,
            nota: "El formato .emb es propietario de Wilcom — solo se puede subir a Drive, los datos deben ingresarse manualmente."
          });
          return;
        }

        res({ formato: ext.toUpperCase(), nombre: null, puntadas: null, colores: null, anchoMm: null, altoMm: null });
      } catch (err) {
        res({ formato: ext.toUpperCase(), nombre: null, puntadas: null, colores: null, anchoMm: null, altoMm: null, err: err.message });
      }
    };
    reader.onerror = () => res(null);
    reader.readAsArrayBuffer(file);
  });
}
