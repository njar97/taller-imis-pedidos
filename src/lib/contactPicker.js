// Wrapper de la Contact Picker API. Disponible en Chrome Android (80+),
// no en iOS Safari ni desktop. Mostrá el botón solo si `contactPickerOK`
// es true para no confundir al user en navegadores que no la soportan.
//
// Refs:
//   https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API
//   https://developer.chrome.com/articles/contact-picker/
//
// Limitaciones:
//   - Solo HTTPS.
//   - El user debe aceptar el prompt nativo cada vez (no se guarda
//     permiso entre sesiones).
//   - Devuelve nombre + tel pero no foto, dirección, etc. (limitado a
//     campos genéricos por privacidad).

export const contactPickerOK =
  typeof navigator !== "undefined" &&
  "contacts" in navigator &&
  typeof navigator.contacts.select === "function";

// Abre el picker nativo. Devuelve { nombre, telefono } o null si el
// usuario cancela / no hay soporte / falla. NO levanta excepción.
export async function elegirContacto() {
  if (!contactPickerOK) return null;
  try {
    const seleccion = await navigator.contacts.select(["name", "tel"], { multiple: false });
    if (!seleccion || seleccion.length === 0) return null;
    const c = seleccion[0];
    const nombre = Array.isArray(c.name) ? c.name[0] || "" : (c.name || "");
    const telefono = Array.isArray(c.tel) ? c.tel[0] || "" : (c.tel || "");
    return { nombre: nombre.trim(), telefono: String(telefono).trim() };
  } catch (e) {
    console.warn("elegirContacto cancelado o falló:", e?.message || e);
    return null;
  }
}
