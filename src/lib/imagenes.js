// Helpers de imágenes: extraer URL de display, comprimir antes de subir.
// Soporta tres orígenes en el siguiente orden de prioridad:
//   1. img.data (data URL base64 local, antes de subir)
//   2. img.supabaseUrl (foto subida a Supabase Storage — nueva)
//   3. img.driveUrl / img.driveId (foto vieja en Google Drive)

export const imgSrc = img => {
  if (!img) return "";
  if (img.data) return img.data;
  if (img.supabaseUrl) return img.supabaseUrl;
  let fileId = img.driveId || null;
  if (!fileId && img.driveUrl) {
    const m1 = img.driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) fileId = m1[1];
    else {
      const m2 = img.driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m2) fileId = m2[1];
    }
  }
  if (fileId) return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400";
  if (img.driveUrl) return img.driveUrl;
  return "";
};

export const driveViewUrl = id => id ? "https://drive.google.com/file/d/" + id + "/view" : "";
export const driveDownloadUrl = id => id ? "https://drive.google.com/uc?export=download&id=" + id : "";

export const extractDriveId = url => {
  if (!url) return null;
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m2 ? m2[1] : null;
};

// Comprime una imagen a JPEG max 900px de ancho, calidad 0.82.
// Reduce ~100 KB promedio por foto. Devuelve data URL.
export function comprimirImagen(file, maxW = 900, calidad = 0.82) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxW) {
          h = Math.round(h * (maxW / w));
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        res({
          data: canvas.toDataURL("image/jpeg", calidad),
          nombre: file.name,
          tipo: "image/jpeg",
          w, h,
        });
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}
