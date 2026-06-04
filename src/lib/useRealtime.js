// Hook que suscribe al canal WebSocket de Postgres y refresca sólo la tabla
// que cambió. Extrae el bloque de suscripción realtime de App() para que sea
// testeable y reutilizable independientemente del árbol de componentes.
import { useEffect } from "react";
import { suscribirCambios } from "./realtime.js";
import {
  dbLeer,
  dbBordLeer,
  dbCuelLeer,
  dbClientesLeer,
  dbCatalogoLeer,
} from "./db.js";
import { CATALOGO_BASE } from "./catalogoBase.js";

export function useRealtime(rolBase, { setPedidos, setBordados, setCuellos, setClientes, setCatalogo }) {
  useEffect(() => {
    if (!rolBase) return;

    const refetchTabla = async (tabla) => {
      try {
        if (tabla === "taller_pedidos" || tabla === "*") {
          const data = await dbLeer();
          if (data) setPedidos(prev => data.length > 0 ? data.map(p => ({
            ...p,
            tallasItems: Array.isArray(p.tallasItems) ? p.tallasItems : [],
            tallasQty: typeof p.tallasQty === "object" ? p.tallasQty : {},
            medidas: typeof p.medidas === "object" ? p.medidas : {},
            abonos: Array.isArray(p.abonos) ? p.abonos : [],
            personas: Array.isArray(p.personas) ? p.personas : [],
            imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
            modoRegistro: p.modoRegistro || "tallas",
          })) : prev);
        }
        if (tabla === "taller_bordados" || tabla === "*") {
          const data = await dbBordLeer();
          if (data) setBordados(data);
        }
        if (tabla === "taller_cuellos" || tabla === "*") {
          const data = await dbCuelLeer();
          if (data) setCuellos(data);
        }
        if (tabla === "taller_clientes" || tabla === "*") {
          const data = await dbClientesLeer();
          if (data) setClientes(data);
        }
        if (tabla === "taller_catalogo" || tabla === "*") {
          const rows = await dbCatalogoLeer();
          const data = rows && rows.length > 0 ? rows : CATALOGO_BASE;
          if (data && data.length > 0) setCatalogo(data);
        }
      } catch (e) {
        console.warn("Refetch realtime falló:", e);
      }
    };

    const sub = suscribirCambios(
      ["taller_pedidos", "taller_bordados", "taller_cuellos", "taller_clientes", "taller_catalogo"],
      refetchTabla
    );
    return () => sub.cerrar();
  }, [rolBase]);
}
