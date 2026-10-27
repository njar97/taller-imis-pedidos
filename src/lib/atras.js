// Botón «atrás» del celular (y del navegador).
// Sin esto, atrás sacaba de la app. Cada ventana o pantalla abierta registra
// un «nivel»: se agrega una entrada al historial y, al dar atrás, se cierra
// el nivel de más arriba en vez de salir.
import { useEffect, useRef, useState } from "react";

const pila = [];      // niveles abiertos, el último es el de arriba
let ignorar = 0;      // popstate provocados por nosotros (history.back)
let pendientes = 0;   // pushState a esperar hasta que termine un back
let escuchando = false;

function empujar() {
  if (ignorar > 0) { pendientes++; return; }
  try { history.pushState({ atras: pila.length }, ""); } catch { /* sin historial */ }
}

function alVolver() {
  if (ignorar > 0) {
    ignorar--;
    if (ignorar === 0) while (pendientes > 0) { pendientes--; empujar(); }
    return;
  }
  const arriba = pila.pop();
  if (arriba) arriba.cerrar();
}

function escuchar() {
  if (escuchando || typeof window === "undefined") return;
  escuchando = true;
  window.addEventListener("popstate", alVolver);
}

// Registra un nivel. Devuelve la función para quitarlo cuando se cierra
// desde la propia app (✕, guardar...): ahí se retrocede el historial a mano.
export function abrirNivel(cerrar) {
  escuchar();
  const nivel = { cerrar };
  pila.push(nivel);
  empujar();
  return () => {
    const i = pila.indexOf(nivel);
    if (i < 0) return; // ya lo cerró el botón atrás
    pila.splice(i, 1);
    if (pendientes > 0) { pendientes--; return; }
    ignorar++;
    history.back();
  };
}

// Mientras `abierto` sea verdadero, atrás llama a `cerrar`.
// Si al cerrar la ventana sigue abierta (p. ej. preguntó «¿descartar
// cambios?» y dijeron que no), el nivel se vuelve a registrar.
export function useAtras(abierto, cerrar) {
  const ref = useRef(cerrar);
  ref.current = cerrar;
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    if (!abierto) return undefined;
    return abrirNivel(() => { ref.current(); setVuelta(v => v + 1); });
  }, [abierto, vuelta]);
}
