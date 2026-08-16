// Monta DesgloseTallas con pedidos REALES de las cuatro naturalezas, a ancho
// de celular y sin pasar el OTP.
import { createRoot } from "react-dom/client";
import { DesgloseTallas } from "../src/DesgloseTallas.jsx";
import { itemsResumen } from "../src/lib/dominio.js";

const REST = "https://kszdievqesveluzcnzsh.supabase.co/rest/v1";
const KEY = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

// una de cada naturaleza: cruzado, por-precio, solo-tallas, un item
const IDS = [38, 65, 24, 40];
const r = await fetch(
  `${REST}/taller_pedidos?id=in.(${IDS.join(",")})&select=*`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
const pedidos = await r.json();
// el shape de la base es snake_case; itemsResumen espera el de la app
const norm = p => ({ ...p, tipoPrenda: p.tipo_prenda, modoRegistro: p.modo_registro,
                     tallasItems: p.tallas_items, personas: p.personas,
                     tallas_items: undefined });

createRoot(document.getElementById("raiz")).render(
  <>
    {IDS.map(id => {
      const p = pedidos.find(x => x.id === id);
      if (!p) return null;
      const items = itemsResumen({ ...norm(p), tallasItems: p.tallas_items,
                                   tallas_items: p.tallas_items,
                                   tallasQty: p.tallas_qty });
      // itemsResumen lee p.tallasItems? verificar: en la app el campo llega
      // camelCase; si sale vacio, usar los items crudos
      const its = items.length ? items : (p.tallas_items || []).map((it, i) => ({ id: i, ...it }));
      return (
        <div key={id}>
          <h2>#{id} · {p.cliente} · {its.length} items</h2>
          <div className="cel"><DesgloseTallas items={its} /></div>
        </div>
      );
    })}
  </>
);
