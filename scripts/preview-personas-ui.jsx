// Monta el componente Personas aislado, con los pedidos REALES de la base y a
// ancho de celular. No hay que pasar el OTP ni abrir un pedido.
import { createRoot } from "react-dom/client";
import { Personas } from "../src/DetallePedidoModal.jsx";

const REST = "https://kszdievqesveluzcnzsh.supabase.co/rest/v1";
const KEY = "sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX";

const r = await fetch(
  `${REST}/taller_pedidos?select=id,cliente,personas,abonos&deleted_at=is.null`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
const pedidos = (await r.json())
  .filter(p => (p.personas || []).length > 0)
  .sort((a, b) => b.personas.length - a.personas.length)
  .slice(0, 2);

createRoot(document.getElementById("raiz")).render(
  <>
    {pedidos.map(p => (
      <div key={p.id}>
        <h2>#{p.id} · {p.cliente} · {p.personas.length} personas</h2>
        <div className="cel">
          <Personas personas={p.personas} abonos={p.abonos || []} esAdmin={true} />
        </div>
      </div>
    ))}
  </>
);
