// Formulario de crear/editar pedido — orquesta cliente + prenda + tallas
// + tela/color + fecha + costurera + opcionales + facturación + fotos.
// Antes vivía como FormPedido compilado en main.js (~748 líneas).

import { COLABORADORAS, ESTATUS, TIPO_DOC } from "./lib/constants.js";
import { PEDIDO_BASE, fmt$, medInit } from "./lib/dominio.js";
import { pushToast, pushConfirm } from "./lib/feedback.js";
import { useDebouncedCallback } from "./lib/hooks.js";
import { CATALOGO_BASE } from "./lib/catalogoBase.js";
import {
  BannerMedidas,
  Check,
  Chips,
  FechasRapidas,
  SeccionOpcional,
  UploaderImagenes,
  chipActiveStyle,
} from "./lib/ui.jsx";
import { ListaPrendas } from "./ListaPrendas.jsx";
import RegistroAbonos from "./RegistroAbonos.jsx";
import { SelectorTallas } from "./SelectorTallas.jsx";
import FormNav from "./FormNav.jsx";
import { leerRecientes, marcarReciente } from "./lib/recientesPrendas.js";

import { useState, useEffect, useMemo, useRef } from "react";

// Estilos (duplicados de main.js para no acoplar). Compactados para
// reducir altura del formulario en móvil.
const INP = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 8,
  border: "1.5px solid #e0e0e0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#FAFAFA",
  fontFamily: "inherit",
};

const LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#888",
  marginBottom: 2,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const BTN = (bg = "#9B59B6", disabled = false) => ({
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: disabled ? "#ccc" : bg,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  fontSize: 14,
});

// Opciones rápidas locales al formulario
const TELAS_RAPIDAS = ["Dacrón", "Satín", "Lino", "Gabardina", "Tafeta", "Lycra", "Algodón", "Dril", "Otro"];
const COLORES_RAPIDOS = ["Blanco", "Negro", "Azul", "Rojo", "Verde", "Café", "Gris", "Morado", "Rosado", "Beige"];

const TIPOS_CLIENTE = [
  ["persona", "👤 Persona"],
  ["empresa", "🏢 Empresa"],
  ["escuela", "🏫 Escuela/Inst."],
];

// Modos de registro de tallas — se usa en el selector dentro de "Tallas
// y cantidades". (No borrar: en el commit 7a9a856 lo eliminé por error
// porque mi grep de uso me dio solo el archivo, no las líneas.)
const MODOS_REGISTRO = [
  ["tallas", "📦 Por totales",        "Uniformes, lotes o items varios — sin nombre de persona"],
  ["lista",  "📋 Pedido individual",  "Cada persona con su nombre, prendas y medidas"],
];

export default function FormPedido({
  initial,
  onSave,
  onCancel,
  rol,
  pedidosExistentes = [],
  clientes = [],
  catalogo = [],
}) {
  const DRAFT_KEY = initial ? null : "TALLER_IMIS_BORRADOR";
  const esAdmin = rol === "admin";

  const initForm = () => {
    const base = {
      ...PEDIDO_BASE,
      ...(initial || {}),
      imagenes: [...((initial || {}).imagenes || [])],
      medidas: { ...medInit(), ...((initial || {}).medidas || {}) },
      tallasItems: [...((initial || {}).tallasItems || [])],
      abonos: [...((initial || {}).abonos || [])],
      personas: [...((initial || {}).personas || [])],
      modoRegistro: (initial || {}).modoRegistro || "tallas",
      tipoCliente: (initial || {}).tipoCliente || "persona",
      nombreContacto: (initial || {}).nombreContacto || "",
    };
    if (!initial && DRAFT_KEY) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const d = JSON.parse(saved);
          return { ...base, ...d, imagenes: [], tallasItems: d.tallasItems || [] };
        }
      } catch (e) {}
    }
    return base;
  };

  const [f, setF] = useState(initForm);
  const [sugs, setSugs] = useState([]);
  const [showSugs, setShowSugs] = useState(false);
  // Últimos 3 tipos de prenda "libres" usados (no del catálogo). Memoria
  // compartida en Supabase para que aparezcan como chips de atajo.
  const [recientes, setRecientes] = useState([]);
  useEffect(() => {
    leerRecientes(3).then(setRecientes);
  }, []);

  const s = (k, v) => setF(p => ({ ...p, [k]: v }));

  const totalTallasAuto = (f.tallasItems || [])
    .filter(it => it.precio != null && it.precio !== "")
    .reduce((s, it) => s + parseFloat(it.precio || 0) * it.qty, 0);
  const totalPzasAuto = (f.tallasItems || []).reduce((s, it) => s + it.qty, 0);

  useEffect(() => {
    if (totalTallasAuto > 0) s("precio", totalTallasAuto.toFixed(2));
  }, [totalTallasAuto]);

  const totalAbonos = (f.abonos || []).reduce((s, a) => s + parseFloat(a.monto || 0), 0);
  const anticopoEfectivo = totalAbonos > 0 ? totalAbonos : parseFloat(f.anticipo || 0);
  const saldo = parseFloat(f.precio || 0) - anticopoEfectivo;
  const tieneCantidad =
    (f.tallasItems || []).some(it => Number(it.qty) > 0) || (f.personas || []).length > 0;

  // Coercion defensiva: si el draft del localStorage o un pedido legacy
  // tienen cliente/tipoPrenda como null/undefined, .trim() reventaría al
  // renderizar. String(x || "") garantiza un string sin perder semántica.
  const validez = {
    cliente: !!String(f.cliente || "").trim(),
    tipoPrenda: !!String(f.tipoPrenda || "").trim(),
    cantidad: tieneCantidad,
    fechaEntrega: !!f.fechaEntrega,
  };

  // ¿Tiene contenido cada sección? Si sí, arranca abierta (al editar un
  // pedido existente). Si es nuevo, todas cerradas → form se ve compacto.
  const llenoCliente   = !!(f.cliente || "").trim();
  const llenoPrenda    = !!(f.tipoPrenda || "").trim();
  const llenoTallas    = tieneCantidad;
  const llenoTela      = !!(f.tela || "").trim() || !!(f.color || "").trim();
  const llenoFecha     = !!f.fechaEntrega;
  const llenoCosturera = !!f.costurera && f.costurera !== "(Sin asignar)";
  const llenoDesc      = !!(f.descripcion || "").trim() || !!f.tieneBordado;
  const llenoPrecio    = !!String(f.precio || "").trim() || !!String(f.anticipo || "").trim() || (f.abonos || []).length > 0;
  const llenoFactura   = (f.tipoDocumento && f.tipoDocumento !== "Consumidor Final")
                      || !!(f.nit || "").trim() || !!(f.nrc || "").trim();
  const llenoObs       = !!(f.notas || "").trim() || !!(f.vendedor || "").trim();
  const llenoFotos     = (f.imagenes || []).length > 0;

  useEffect(() => {
    if (initial || !DRAFT_KEY) return;
    try {
      const { imagenes, ...rest } = f;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    } catch (e) {}
  }, [f]);

  const limpiarBorrador = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
  };

  function buscarClientes(q) {
    if (!q || q.length < 2) {
      setSugs([]);
      return;
    }
    const fuente =
      clientes.length > 0
        ? clientes
        : (pedidosExistentes || []).map(p => ({
            nombre: p.cliente,
            telefono: p.telefono || "",
            tipo: p.tipoCliente,
            contacto: p.nombreContacto || "",
            nit: p.nit || "",
            nrc: p.nrc || "",
            razonSocial: p.razonSocial || "",
            dirFiscal: p.dirFiscal || "",
          }));
    const vistos = new Set();
    const res = fuente
      .filter(cl => cl.nombre && cl.nombre.toLowerCase().includes(q.toLowerCase()))
      .filter(cl => {
        if (vistos.has(cl.nombre)) return false;
        vistos.add(cl.nombre);
        return true;
      })
      .slice(0, 5);
    setSugs(res);
  }
  const buscarClientesDebounced = useDebouncedCallback(buscarClientes, 200);

  const elegirSugerencia = sg => {
    s("cliente", sg.nombre);
    if (sg.telefono) s("telefono", sg.telefono);
    if (sg.tipo) s("tipoCliente", sg.tipo);
    if (sg.contacto) s("nombreContacto", sg.contacto);
    if (sg.nit) s("nit", sg.nit);
    if (sg.nrc) s("nrc", sg.nrc);
    if (sg.razonSocial) s("razonSocial", sg.razonSocial);
    if (sg.dirFiscal) s("dirFiscal", sg.dirFiscal);
    if (sg.nit && sg.nrc) s("tipoDocumento", "Crédito Fiscal (completo)");
    if (sg.medidas && Object.values(sg.medidas).some(v => v)) {
      setF(p => ({
        ...p,
        medidas: { ...p.medidas, ...sg.medidas },
        _medCliente: sg.medidas,
      }));
    }
    setShowSugs(false);
  };

  // Producto del catálogo elegido (si existe)
  const catlist = catalogo.length ? catalogo : CATALOGO_BASE;
  const prodSel = catlist.find(p => p.nombre === f.tipoPrenda);

  // Cliente reconocido con medidas guardadas (para el banner)
  const clienteMatch = clientes.find(
    cl => cl.nombre.toLowerCase() === f.cliente.toLowerCase()
  );
  const tieneMedsCliente =
    clienteMatch && clienteMatch.medidas && Object.values(clienteMatch.medidas).some(Boolean);

  // Fallback: si el cliente no tiene medidas en su registro (la tabla
  // clientes hoy no las guarda), buscar el último pedido suyo con medidas
  // no vacías y ofrecerlas como sugerencia. Excluye el pedido que se está
  // editando.
  const medidasPedidoPrevio = useMemo(() => {
    if (tieneMedsCliente) return null;
    const nombre = (f.cliente || "").trim().toLowerCase();
    if (!nombre) return null;
    const ultimo = (pedidosExistentes || [])
      .filter(p =>
        p.cliente &&
        p.cliente.trim().toLowerCase() === nombre &&
        (!initial || p.id !== initial.id) &&
        p.medidas &&
        Object.values(p.medidas).some(Boolean)
      )
      .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))[0];
    return ultimo
      ? { meds: ultimo.medidas, pedidoId: ultimo.id, fecha: ultimo.fecha }
      : null;
  }, [f.cliente, pedidosExistentes, tieneMedsCliente, initial]);

  const [intentoGuardar, setIntentoGuardar] = useState(false);
  // Mapeo validez → ids de FormNav. Solo se muestran como error tras el
  // primer click en Guardar — antes el form se ve limpio.
  const erroresIds = intentoGuardar
    ? [
        !validez.cliente      && "sec-cliente",
        !validez.tipoPrenda   && "sec-producto",
        !validez.cantidad     && "sec-producto",
        !validez.fechaEntrega && "sec-fecha",
      ].filter(Boolean)
    : [];

  const handleGuardar = () => {
    setIntentoGuardar(true);
    if (!validez.cliente) {
      pushToast("Falta el nombre del cliente", "error");
      return;
    }
    if (!validez.tipoPrenda) {
      pushToast("Seleccioná el tipo de prenda", "error");
      return;
    }
    if (!validez.cantidad) {
      pushToast("Agregá al menos una talla con cantidad o una persona", "error");
      return;
    }
    if (!validez.fechaEntrega) {
      pushToast("Falta la fecha de entrega", "error");
      return;
    }
    // Sanidad de fechas — avisa pero no bloquea (puede haber casos legítimos
    // de fechas atrasadas, ej. registrar un pedido viejo).
    const hoyStr = new Date().toISOString().slice(0, 10);
    if (f.fechaEntrega < hoyStr) {
      pushToast("⚠️ La fecha de entrega ya pasó — revisá si es correcto", "info");
    }
    if (f.fechaInicio && f.fechaInicio > f.fechaEntrega) {
      pushToast("⚠️ La fecha de inicio es posterior a la de entrega", "info");
    }
    limpiarBorrador();
    // Strip claves con prefijo _ (state local del banner de medidas) que
    // no deben persistirse al servidor.
    const limpio = Object.fromEntries(
      Object.entries(f).filter(([k]) => !k.startsWith("_"))
    );
    // Si el tipo escrito NO está en el catálogo, lo guardamos como
    // reciente para que aparezca como chip en futuros pedidos.
    const tipoTrim = String(f.tipoPrenda || "").trim();
    if (tipoTrim && !catlist.some(p => p.nombre === tipoTrim)) {
      marcarReciente(tipoTrim);
    }
    onSave(limpio);
  };

  // Snapshot del estado inicial para detectar cambios al cancelar.
  // Se captura una vez al montar.
  const snapshotInicial = useRef(null);
  useEffect(() => {
    if (snapshotInicial.current === null) {
      snapshotInicial.current = JSON.stringify(
        Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith("_")))
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelar = async () => {
    const actual = JSON.stringify(
      Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith("_")))
    );
    if (snapshotInicial.current !== null && snapshotInicial.current !== actual) {
      const ok = await pushConfirm({
        titulo: "Descartar cambios",
        msg: "Tenés cambios sin guardar. ¿Salir igual?",
        okLabel: "Salir sin guardar",
        danger: true,
      });
      if (!ok) return;
    }
    limpiarBorrador();
    onCancel();
  };

  // Cuando cambian los abonos, recalcula y guarda el anticipo total.
  // Antes esta lógica vivía duplicada en dos <RegistroAbonos> distintos.
  const handleAbonosChange = v => {
    s("abonos", v);
    s(
      "anticipo",
      v.reduce((sum, a) => sum + parseFloat(a.monto || 0), 0).toFixed(2)
    );
  };

  const handlePersonas = v => {
    s("personas", v);
    // Solo recalcular tallasItems/precio si estamos en modo "lista" — si
    // no, el admin puede tener tallasItems manuales que NO deben pisarse
    // por edits a personas (que pueden ser de un pedido viejo).
    if (f.modoRegistro !== "lista") return;

    // Cada persona puede tener N prendas, cada una con su talla. Sumamos
    // todas para alimentar tallasItems (resumen agregado del pedido).
    // Compat: si la persona viene con shape viejo {talla} sin prendas[],
    // contamos esa talla también.
    const tallaMap = {};
    const bump = talla => {
      if (!talla) return;
      if (!tallaMap[talla]) {
        tallaMap[talla] = {
          id: Date.now() + Math.random(),
          talla,
          qty: 0,
          spec: "",
          precio: null,
          grupo: "adulto",
        };
      }
      tallaMap[talla].qty++;
    };
    let totalPersonas = 0;
    v.forEach(p => {
      if (Array.isArray(p.prendas) && p.prendas.length > 0) {
        p.prendas.forEach(pr => {
          bump(pr.talla);
          totalPersonas += parseFloat(pr.precio) || 0;
        });
      } else if (p.talla) {
        bump(p.talla);
      }
    });
    s("tallasItems", Object.values(tallaMap));
    // Si hay precios en las prendas, el total del pedido se deriva de la
    // suma — más confiable que un manual que no se actualiza al
    // agregar/quitar prendas. Si no hay precios (todas en null), no toco
    // f.precio para preservar un total manual que el admin haya puesto.
    // toFixed(2) para evitar artefactos float (16.799999... → 16.80).
    if (totalPersonas > 0) {
      s("precio", totalPersonas.toFixed(2));
    }
  };

  return (
    <div>
      <FormNav erroresIds={erroresIds} />
      {/* ── Cliente ─────────────────────────────────── */}
      <SeccionOpcional id="sec-cliente" titulo="Cliente" icon="👤" color="#2C1654" defaultOpen={llenoCliente} textoCerrado={validez.cliente ? "▼" : "▼ Llenar"}>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          style={INP}
          value={f.cliente}
          placeholder="Nombre del cliente *"
          onChange={e => {
            s("cliente", e.target.value);
            buscarClientesDebounced(e.target.value);
            setShowSugs(true);
          }}
          onBlur={() => setTimeout(() => setShowSugs(false), 150)}
        />
        {showSugs && sugs.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1.5px solid #e0e0e0",
              borderRadius: 8,
              zIndex: 50,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            }}
          >
            {sugs.map((sg, i) => (
              <div
                key={i}
                onClick={() => elegirSugerencia(sg)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f5f5f5",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 700, color: "#2C1654" }}>{sg.nombre}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                  {sg.telefono && (
                    <span style={{ fontSize: 11, color: "#aaa" }}>📱 {sg.telefono}</span>
                  )}
                  {sg.tipo && sg.tipo !== "persona" && (
                    <span style={{ fontSize: 11, color: "#9B59B6", fontWeight: 700 }}>
                      {sg.tipo === "empresa" ? "🏢 Empresa" : "🏫 Escuela"}
                    </span>
                  )}
                  {sg.nit && (
                    <span style={{ fontSize: 11, color: "#27AE60", fontWeight: 700 }}>
                      📋 CF
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          style={{ ...INP, flex: 1 }}
          value={f.telefono}
          placeholder="📱 Teléfono / WhatsApp"
          type="tel"
          inputMode="tel"
          onChange={e => s("telefono", e.target.value)}
        />
        {f.telefono && (
          <a
            href={`https://wa.me/${(f.telefono || "").replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener"
            title="Abrir WhatsApp"
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1.5px solid #25D366",
              background: "#25D366", color: "#fff", textDecoration: "none",
              fontSize: 18, display: "flex", alignItems: "center",
            }}
          >💬</a>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {TIPOS_CLIENTE.map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => s("tipoCliente", val)}
            style={{
              flex: 1,
              padding: "7px 6px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              textAlign: "center",
              ...chipActiveStyle(f.tipoCliente === val, "#9B59B6"),
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {(f.tipoCliente === "empresa" || f.tipoCliente === "escuela") && (
        <input
          style={{ ...INP, marginBottom: 8 }}
          value={f.nombreContacto}
          placeholder={
            f.tipoCliente === "escuela"
              ? "Nombre del director/contacto"
              : "Nombre del contacto en la empresa"
          }
          onChange={e => s("nombreContacto", e.target.value)}
        />
      )}

      </SeccionOpcional>

      {/* ── Producto y cantidades (fusión Prenda + Tallas/Lista) ─── */}
      <SeccionOpcional
        id="sec-producto"
        titulo={
          f.tipoPrenda
            ? `Producto: ${f.tipoPrenda}`
            : "Producto y cantidades"
        }
        icon="📦"
        color="#9B59B6"
        defaultOpen={llenoPrenda || llenoTallas}
        textoCerrado={validez.tipoPrenda && validez.cantidad ? "▼" : "▼ Llenar"}
      >
      {/* Chips de tipo de prenda — el tipo seleccionado se aplica a las
          nuevas tallas/personas que se agreguen abajo. Si querés mezclar
          tipos en un mismo pedido, cambiá el chip y agregá otra talla:
          la anterior conserva su tipo, la nueva queda con el nuevo. */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
        Tipo de prenda
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {catlist
          .filter(p => p.nombre !== "Bordado independiente")
          .map(prod => {
            const sel = f.tipoPrenda === prod.nombre;
            return (
              <button
                key={prod.id}
                onClick={() => {
                  s("tipoPrenda", prod.nombre);
                  if (prod.modoDefault) s("modoRegistro", prod.modoDefault);
                  if (prod.telas && prod.telas.length === 1) s("tela", prod.telas[0]);
                  if (prod.requiereCuello) s("tieneBordado", false);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1.5px solid " + (sel ? "#9B59B6" : "#e0e0e0"),
                  background: sel ? "#9B59B6" : "#fff",
                  color: sel ? "#fff" : "#666",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: sel ? 700 : 400,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>{prod.icono || "✂️"}</span>
                <span>{prod.nombre}</span>
                {prod.requiereCuello && (
                  <span
                    style={{
                      fontSize: 9,
                      background: sel ? "rgba(255,255,255,0.3)" : "#f3e5f5",
                      color: sel ? "#fff" : "#9B59B6",
                      borderRadius: 8,
                      padding: "1px 5px",
                    }}
                  >
                    +cuello
                  </span>
                )}
              </button>
            );
          })}
      </div>
      {/* Chips de tipos libres usados antes (memoria compartida en Supabase).
          Solo mostramos los que NO están ya en el catálogo, para no duplicar. */}
      {recientes.filter(n => !catlist.some(p => p.nombre === n)).length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 8, marginBottom: 4 }}>
            ⭐ Recientes
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {recientes
              .filter(n => !catlist.some(p => p.nombre === n))
              .map(nombre => {
                const sel = f.tipoPrenda === nombre;
                return (
                  <button
                    key={nombre}
                    onClick={() => s("tipoPrenda", nombre)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      border: "1.5px dashed " + (sel ? "#9B59B6" : "#ccc"),
                      background: sel ? "#9B59B6" : "#fafafa",
                      color: sel ? "#fff" : "#666",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: sel ? 700 : 400,
                      fontFamily: "inherit",
                    }}
                  >
                    {nombre}
                  </button>
                );
              })}
          </div>
        </>
      )}
      <input
        style={{ ...INP, marginBottom: 6 }}
        value={catlist.some(p => p.nombre === f.tipoPrenda) ? "" : f.tipoPrenda}
        placeholder="O escribe un tipo libre (cortina, bandera, etc.)..."
        onChange={e => s("tipoPrenda", e.target.value)}
      />
      {prodSel && prodSel.requiereCuello && (
        <div
          style={{
            background: "#F3E5F5",
            border: "1px solid #CE93D8",
            borderRadius: 8,
            padding: "7px 12px",
            fontSize: 12,
            color: "#6B2D8B",
            marginBottom: 6,
          }}
        >
          🧶 Esta prenda lleva cuello tejido — recuerda crear el pedido de cuello en el módulo
          Cuellos
        </div>
      )}

      {/* Selector de tallas/lista. La talla agregada hereda el tipo de
          prenda actual y se preserva si después cambiás el chip. */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4, marginTop: 8 }}>
        Cantidades
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 10,
          background: "#fafafa",
          borderRadius: 10,
          padding: 4,
          border: "1.5px solid #fde0b8",
        }}
      >
        {MODOS_REGISTRO.map(([modo, label, desc]) => {
          const activo =
            (!f.modoRegistro && modo === "tallas") || f.modoRegistro === modo;
          return (
            <button
              key={modo}
              onClick={() => s("modoRegistro", modo)}
              style={{
                flex: 1,
                padding: "9px 6px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                background: activo ? "#E67E22" : "transparent",
                color: activo ? "#fff" : "#aaa",
                fontWeight: activo ? 700 : 400,
                fontSize: 12,
                lineHeight: 1.4,
                transition: "all .15s",
                textAlign: "center",
              }}
            >
              <div>{label}</div>
              <div style={{ fontSize: 9, opacity: 0.8, marginTop: 1 }}>{desc}</div>
            </button>
          );
        })}
      </div>
      {(!f.modoRegistro || f.modoRegistro === "tallas") && (
        <SelectorTallas
          items={f.tallasItems}
          onChange={v => s("tallasItems", v)}
          tipoPrendaDefault={f.tipoPrenda || ""}
        />
      )}
      {f.modoRegistro === "lista" && (
        <ListaPrendas
          items={f.personas || []}
          onChange={handlePersonas}
          tipoPrendaDefault={f.tipoPrenda || ""}
        />
      )}

      </SeccionOpcional>

      {/* ── Tela y color ────────────────────────────── */}
      <SeccionOpcional id="sec-tela" titulo="Tela y color" icon="🧵" color="#1A5276" defaultOpen={llenoTela}>
      <div style={{ marginBottom: 6 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#aaa",
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          Tela
        </div>
        <Chips opciones={TELAS_RAPIDAS} valor={f.tela} onChange={v => s("tela", v)} color="#1A5276" />
        {(f.tela === "Otro" || !TELAS_RAPIDAS.includes(f.tela)) && (
          <input
            style={{ ...INP, marginTop: 4 }}
            value={TELAS_RAPIDAS.includes(f.tela) ? "" : f.tela}
            placeholder="Nombre de la tela"
            onChange={e => s("tela", e.target.value)}
          />
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#aaa",
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          Color
        </div>
        <Chips
          opciones={COLORES_RAPIDOS}
          valor={f.color}
          onChange={v => s("color", v)}
          color="#E91E8C"
        />
        {(f.color === "Otro" || !COLORES_RAPIDOS.includes(f.color)) && (
          <input
            style={{ ...INP, marginTop: 4 }}
            value={COLORES_RAPIDOS.includes(f.color) ? "" : f.color}
            placeholder="Color"
            onChange={e => s("color", e.target.value)}
          />
        )}
      </div>

      </SeccionOpcional>

      {/* ── Fecha entrega ───────────────────────────── */}
      <SeccionOpcional id="sec-fecha" titulo="Fecha de entrega" icon="📌" color="#27AE60" defaultOpen={llenoFecha} textoCerrado={validez.fechaEntrega ? "▼" : "▼ Llenar"}>
      <FechasRapidas onChange={v => s("fechaEntrega", v)} />
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          style={{ ...INP, flex: 1 }}
          type="date"
          value={f.fechaEntrega}
          onChange={e => s("fechaEntrega", e.target.value)}
        />
        {f.fechaEntrega && (
          <span
            style={{
              fontSize: 12,
              color: "#27AE60",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            ✅{" "}
            {new Date(f.fechaEntrega + "T12:00").toLocaleDateString("es-SV", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>

      </SeccionOpcional>

      {/* ── Costurera ───────────────────────────────── */}
      <SeccionOpcional id="sec-costurera" titulo="Costurera" icon="✂️" color="#007BFF" defaultOpen={llenoCosturera} textoCerrado="▼">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {COLABORADORAS.map(c => {
          const activo = f.costurera === c;
          const esSinAsignar = c === "(Sin asignar)";
          return (
            <button
              key={c}
              onClick={() => s("costurera", c)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                cursor: "pointer",
                fontSize: 12,
                ...chipActiveStyle(activo, "#007BFF"),
                // "(Sin asignar)" se distingue visualmente de las costureras
                // reales cuando no está seleccionado — estilo dashed gris.
                ...(esSinAsignar && !activo && {
                  borderStyle: "dashed",
                  color: "#aaa",
                  background: "#fafafa",
                }),
              }}
            >
              {esSinAsignar ? "— Sin asignar" : c}
            </button>
          );
        })}
      </div>

      </SeccionOpcional>

      {/* ── Banner medidas guardadas ────────────────── */}
      {!f._medCliente && tieneMedsCliente && (
        <BannerMedidas
          meds={clienteMatch.medidas}
          onCargar={meds =>
            setF(p => ({
              ...p,
              medidas: { ...p.medidas, ...meds },
              _medCliente: meds,
            }))
          }
        />
      )}
      {!f._medCliente && !tieneMedsCliente && medidasPedidoPrevio && (
        <BannerMedidas
          meds={medidasPedidoPrevio.meds}
          origen={`del pedido N°${String(medidasPedidoPrevio.pedidoId).padStart(4, "0")}`}
          onCargar={meds =>
            setF(p => ({
              ...p,
              medidas: { ...p.medidas, ...meds },
              _medCliente: meds,
            }))
          }
        />
      )}

      <SeccionOpcional id="sec-desc" titulo="Descripción y bordado" icon="📝" color="#9B59B6" defaultOpen={llenoDesc}>
        <textarea
          style={{ ...INP, resize: "vertical", minHeight: 60, marginBottom: 8 }}
          value={f.descripcion}
          placeholder="Detalles del trabajo..."
          onChange={e => s("descripcion", e.target.value)}
        />
        <Check label="Lleva bordado" value={f.tieneBordado} onChange={v => s("tieneBordado", v)} />
        <Check
          label="Tela comprada ✅"
          value={f.telaComprada}
          onChange={v => s("telaComprada", v)}
        />
        {f.tieneBordado && (
          <input
            style={{ ...INP, marginTop: 8 }}
            value={f.estatusDiseno}
            placeholder="Estado del diseño en Wilcom..."
            onChange={e => s("estatusDiseno", e.target.value)}
          />
        )}
      </SeccionOpcional>

      {/* ── Pagos (no admin) ────────────────────────── */}
      {!esAdmin && (
        <SeccionOpcional
          id="sec-pagos"
          titulo="Pagos recibidos"
          icon="💵"
          color="#27AE60"
          defaultOpen={llenoPrecio}
        >
          <RegistroAbonos
            abonos={f.abonos || []}
            precioTotal={f.precio}
            onChange={handleAbonosChange}
            esAdmin={false}
          />
        </SeccionOpcional>
      )}

      {/* ── Precio y adelanto (admin) ────────────────── */}
      {esAdmin && (
        <SeccionOpcional
          id="sec-precio"
          titulo={
            totalTallasAuto > 0
              ? `💰 Precio y adelanto — Total: $${totalTallasAuto.toFixed(2)} (${totalPzasAuto} pzas)`
              : "💰 Precio y adelanto"
          }
          icon="💰"
          color="#27AE60"
          defaultOpen={llenoPrecio}
        >
          {totalTallasAuto > 0 && (
            <div
              style={{
                background: "#f0fff4",
                border: "1.5px solid #a8d8a8",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#888",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Calculado automáticamente
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#155724" }}>
                  ${totalTallasAuto.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: "#27AE60" }}>
                  {totalPzasAuto} pieza{totalPzasAuto !== 1 ? "s" : ""}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#27AE60",
                  fontWeight: 700,
                  textAlign: "right",
                }}
              >
                ✅ Total
                <br />
                actualizado
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={LBL}>Precio total ($)</label>
            <input
              style={INP}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={f.precio}
              onChange={e => s("precio", e.target.value)}
            />
          </div>

          <RegistroAbonos
            abonos={f.abonos || []}
            precioTotal={f.precio}
            onChange={handleAbonosChange}
            esAdmin
          />

          {parseFloat(f.precio || 0) > 0 && (
            <div
              style={{
                background: saldo > 0 ? "#FFF3CD" : "#D4EDDA",
                border: "1.5px solid " + (saldo > 0 ? "#FFD54F" : "#a8d8a8"),
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#888",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Saldo pendiente
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: saldo > 0 ? "#856404" : "#155724",
                  }}
                >
                  {fmt$(saldo)}
                </div>
              </div>
              {anticopoEfectivo > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#888",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    Total abonado
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#27AE60" }}>
                    {fmt$(anticopoEfectivo)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <label style={LBL}>Fecha inicio</label>
            <input
              style={INP}
              type="date"
              value={f.fechaInicio}
              onChange={e => s("fechaInicio", e.target.value)}
            />
          </div>
        </SeccionOpcional>
      )}

      {/* ── Facturación (admin) ─────────────────────── */}
      {esAdmin && (
        <SeccionOpcional id="sec-factura" titulo="Facturación / Crédito fiscal" icon="🧾" color="#E67E22" defaultOpen={llenoFactura}>
          <select
            style={{ ...INP, marginBottom: 10 }}
            value={f.tipoDocumento}
            onChange={e => {
              const v = e.target.value;
              if (v === "Consumidor Final") {
                // Volver a CF limpia los datos fiscales para no enviar
                // basura al servidor (NIT/NRC del cambio anterior).
                setF(p => ({
                  ...p,
                  tipoDocumento: v,
                  nit: "",
                  nrc: "",
                  razonSocial: "",
                  dirFiscal: "",
                }));
              } else {
                s("tipoDocumento", v);
              }
            }}
          >
            {TIPO_DOC.map(t => <option key={t}>{t}</option>)}
          </select>
          {f.tipoDocumento !== "Consumidor Final" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={LBL}>Razón Social</label>
                <input
                  style={INP}
                  value={f.razonSocial}
                  onChange={e => s("razonSocial", e.target.value)}
                />
              </div>
              <div>
                <label style={LBL}>NIT</label>
                <input style={INP} value={f.nit} onChange={e => s("nit", e.target.value)} />
              </div>
              <div>
                <label style={LBL}>NRC</label>
                <input style={INP} value={f.nrc} onChange={e => s("nrc", e.target.value)} />
              </div>
              <div>
                <label style={LBL}>Dirección fiscal</label>
                <input
                  style={INP}
                  value={f.dirFiscal}
                  onChange={e => s("dirFiscal", e.target.value)}
                />
              </div>
            </div>
          )}
        </SeccionOpcional>
      )}

      {/* ── Observaciones y fotos ───────────────────── */}
      <SeccionOpcional id="sec-obs" titulo="Observaciones y vendedor" icon="📌" color="#888" defaultOpen={llenoObs}>
        <textarea
          style={{ ...INP, resize: "vertical", minHeight: 50, marginBottom: 8 }}
          value={f.notas}
          placeholder="Observaciones..."
          onChange={e => s("notas", e.target.value)}
        />
        <input
          style={INP}
          value={f.vendedor}
          placeholder="Vendedor"
          onChange={e => s("vendedor", e.target.value)}
        />
      </SeccionOpcional>

      <SeccionOpcional id="sec-fotos" titulo="Fotos de referencia" icon="📸" color="#E91E8C" defaultOpen={llenoFotos}>
        <UploaderImagenes imagenes={f.imagenes} onChange={imgs => s("imagenes", imgs)} />
      </SeccionOpcional>

      {/* ── Estatus ─────────────────────────────────── */}
      <div style={{ marginTop: 10 }}>
        <label style={LBL}>Estatus del pedido</label>
        <select
          style={INP}
          value={f.estatus}
          onChange={e => s("estatus", e.target.value)}
        >
          {ESTATUS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      {/* ── Acciones ────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
        <button onClick={handleCancelar} style={BTN("#aaa")}>
          Cancelar
        </button>
        <button onClick={handleGuardar} style={BTN("#9B59B6")}>
          {initial ? "💾 Guardar cambios" : "💾 Crear pedido"}
        </button>
      </div>
    </div>
  );
}
