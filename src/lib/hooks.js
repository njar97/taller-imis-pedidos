// Hooks compartidos entre módulos.
// Antes vivían en main.js.

import { useRef, useCallback } from "react";

// Devuelve una versión "debounced" de la función — solo se invoca después
// de `delay` ms sin nuevas llamadas. Útil para búsquedas as-you-type.
export function useDebouncedCallback(fn, delay = 150) {
  const timer = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return useCallback(
    (...args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay]
  );
}
