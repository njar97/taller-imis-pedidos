
import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

// Lector de archivos de bordado (.dst/.pes/.jef/.emb) en chunk lazy.
// Importar bajo demanda con: (await import("./leerBordado.js")).leerMetadataBordado
const cargarLectorBordado = () => import("./leerBordado.js").then(m => m.leerMetadataBordado);

// Vista de Papelera (admin, lazy)
const SeccionPapeleraLazy = lazy(() => import("./SeccionPapelera.jsx"));

// Pantalla de login (decompilada a JSX legible)
import PantallaLogin from "./PantallaLogin.jsx";
import PantallaHuella from "./PantallaHuella.jsx";
import PantallaCaptura from "./PantallaCaptura.jsx";
import { necesitaDesbloqueo } from "./lib/biometria.js";

// Modo captura pública (?captura=TOKEN): la página corre sin login y solo
// muestra la tabla de personas del pedido del token. Se resuelve una vez
// al cargar el módulo.
const CAPTURA_TOKEN = (() => {
  try { return new URLSearchParams(window.location.search).get("captura"); }
  catch { return null; }
})();

// Secciones secundarias — lazy (cargadas al primer acceso, no en el arranque)
const SeccionEstadisticas = lazy(() => import("./SeccionEstadisticas.jsx"));
const SeccionClientes     = lazy(() => import("./SeccionClientes.jsx"));
const SeccionCatalogo     = lazy(() => import("./SeccionCatalogo.jsx"));
const SeccionInventario   = lazy(() => import("./SeccionInventario.jsx"));

// Registro de abonos (decompilado a JSX legible)
// Usado por FormPedido, BordadoModal y CuelloModal.
import RegistroAbonos from "./RegistroAbonos.jsx";

// Lista de prendas por persona (uniformes) — decompilado a JSX.
// El módulo también exporta TablaPersonasInternas (dead code histórico
// nunca referenciado desde call-sites), por simetría con el original.
import { ListaPrendas, agruparPrendas } from "./ListaPrendas.jsx";

// Selector de tallas estándar + chips de resumen (decompilados a JSX)
import { SelectorTallas, TallasChips } from "./SelectorTallas.jsx";

// Buscador de pedidos de confección (para vincular desde Bordados/Cuellos)
import BuscadorConfRef from "./BuscadorConfRef.jsx";

// Carrusel de próximas entregas (decompilado a JSX)
import ProximasEntregas from "./ProximasEntregas.jsx";

// Tarjeta de pedido (decompilada a JSX)
import CardPedido from "./CardPedido.jsx";

import EstimadorPrecio from "./EstimadorPrecio.jsx"; // eager — siempre montado con prop `open`
const ModalAsistenteIA      = lazy(() => import("./ModalAsistenteIA.jsx"));
const SeccionCotizaciones   = lazy(() => import("./SeccionCotizaciones.jsx"));
const ModalVersionesPedido  = lazy(() => import("./ModalVersionesPedido.jsx"));
const ModalEnviarCotizacion = lazy(() => import("./ModalEnviarCotizacion.jsx"));
const SeccionCalendario     = lazy(() => import("./SeccionCalendario.jsx"));
const SeccionConfig         = lazy(() => import("./SeccionConfig.jsx"));
import { leerConfigTotal } from "./lib/config.js";
import QRCode from "qrcode";

// Formulario de pedido (decompilado a JSX)
import FormPedido from "./FormPedido.jsx";

// Catálogo de productos por defecto (fallback cuando la BD está vacía)
import { CATALOGO_BASE } from "./lib/catalogoBase.js";

// Hook compartido: debounce de callbacks
import { useDebouncedCallback } from "./lib/hooks.js";

const SeccionBordados = lazy(() => import("./SeccionBordados.jsx"));
const SeccionCuellos  = lazy(() => import("./SeccionCuellos.jsx"));

// Indicador offline + prompt de nueva versión (PWA)
import ConexionStatus from "./ConexionStatus.jsx";

// Banner "Instalar como app" (PWA — Android/Chrome + iOS Safari)
import InstallPrompt from "./InstallPrompt.jsx";
import RecordatorioInicio from "./RecordatorioInicio.jsx";

// ErrorBoundary — pantalla de fallback si React revienta
import ErrorBoundary from "./ErrorBoundary.jsx";

// Barra inferior (mobile) — extraída del App
import BottomNav from "./BottomNav.jsx";

// Bottom-sheet "Más" (items que no entran en la barra inferior)
import MasOpenSheet from "./MasOpenSheet.jsx";

// Sidebar desktop (oculto en mobile via CSS)
import SidebarDesktop from "./SidebarDesktop.jsx";

// Topbar mobile (oculta en desktop via CSS)
import TopbarMobile from "./TopbarMobile.jsx";

// Modal "pedido vencido — ¿fue entregado?"
import ModalArchivar from "./ModalArchivar.jsx";

// Modal "¿actualizar medidas del cliente?"
import ModalActMedidas from "./ModalActMedidas.jsx";

// Lightbox de imágenes (fullscreen + swipe + thumbnails)
import VisorImagenes from "./VisorImagenes.jsx";

// Modal "fotos no subidas" (después de guardar un pedido con uploads fallidos)
import ModalErrorFotos from "./ModalErrorFotos.jsx";

// Modal "¿eliminar pedido?" (confirm para soft-delete desde admin)
import ModalConfirmarBorrar from "./ModalConfirmarBorrar.jsx";

// Modal de detalle de un pedido (vista "ver pedido")
import DetallePedidoModal from "./DetallePedidoModal.jsx";

// Sección "Pedidos" (toolbar + tabs + vencidos + próximas + tabla/cards)
import SeccionPedidos from "./SeccionPedidos.jsx";

// Items de navegación (admin vs operario) compartidos por sidebar + bottom + sheet
import { getNavItems } from "./lib/navItems.js";

// Modal genérico — usado en muchos sitios de main.js
import { Modal } from "./lib/Modal.jsx";

// Helpers UI compartidos (decompilados a JSX legible)
import {
  Toaster,
  ConfirmDialog,
  Check,
  UploaderImagenes,
  BarraProgreso,
  Chips,
  FechasRapidas,
  SeccionOpcional,
  BannerMedidas,
  WABtn,
} from "./lib/ui.jsx";

// Texto y portapapeles para WhatsApp (extraído de main.js)
import { copiarWA } from "./lib/whatsapp.js";
import { htmlComparativoCotizaciones } from "./lib/comparativo.js";
import { useRealtime } from "./lib/useRealtime.js";
import { useCargarDatos } from "./lib/useCargarDatos.js";

// Cliente liviano de Supabase Storage (fetch directo, sin deps).
import { subirFotoSupabase, subirArchivoSupabase } from "./supabaseStorage.js";

// Bus de notificaciones (toast + confirm) accesible desde cualquier módulo.
import {
  pushToast,
  pushUndo,
  pushConfirm,
  _subscribeToasts,
  _getToasts,
  _subscribeConfirm,
  _getConfirm,
  _clearConfirm,
  buzz,
} from "./lib/feedback.js";

// Backend de datos: Postgres vía PostgREST (Supabase).
// Las funciones se exportan con los nombres viejos (gsLeer, gsGuardar, ...)
// para no tocar las ~50 call-sites en main.js. Cambio en cero líneas posteriores.
import {
  dbLeer            as gsLeer,
  dbGuardar         as gsGuardar,
  dbBorrar          as gsBorrar,
  dbRestaurar       as gsRestaurar,
  dbBordLeer        as gsBordLeer,
  dbBordGuardar     as gsBordGuardar,
  dbBordBorrar      as gsBordBorrar,
  dbCuelLeer        as gsCuelLeer,
  dbCuelGuardar     as gsCuelGuardar,
  dbCuelBorrar      as gsCuelBorrar,
  dbClientesLeer    as gsClientesLeer,
  dbClientesGuardar as gsClientesGuardar,
  dbClientesBorrar  as gsClientesBorrar,
  dbCatalogoLeer,
  dbCatalogoGuardar,
} from "./lib/db.js";

// Constantes de dominio (estados, opciones, tallas, medidas)
import {
  TALLER,
  ANTHROPIC_KEY,
  ESTATUS,
  EC,
  BORD_E,
  BORD_EC,
  SOPORTES_BORD,
  POSICIONES_BORD,
  DISENO_EST,
  CUEL_E,
  CUEL_EC,
  TIPOS_CUELLO,
  MATS_CUELLO,
  CALS_CUELLO,
  TALLAS_CUELLO,
  TIPO_DOC,
  COLABORADORAS,
  TALLAS_A,
  TALLAS_N,
  TALLAS_NUM,
  MEDIDAS_DEF,
} from "./lib/constants.js";

// Helpers de dominio (formato, plantilla de pedido)
import {
  medInit,
  hoy,
  sumarAbonos,
  fmt$,
  tallasTexto,
  tallasItemsTexto,
  resumenTallas,
  itemsResumen,
  PEDIDO_BASE,
} from "./lib/dominio.js";
import { EMPRESA } from "./lib/empresa.js";
import { nombrePDF } from "./lib/pdfNombre.js";
import { guardarSnapshot as guardarSnapshotEdicion } from "./lib/edicionReciente.js";
import {
  tablaPorPersonaHTML,
  imprimirPedido,
  nuevaVentanaImpresion,
  imprimirCotizacion,
  imprimirRecibo,
  imprimirProduccion,
  imprimirEntrega,
  exportarExcelMes,
  exportarPedidoPDF,
} from "./lib/imprimir.js";

// Helpers de imágenes
import {
  imgSrc,
  driveViewUrl,
  driveDownloadUrl,
  extractDriveId,
  comprimirImagen,
} from "./lib/imagenes.js";

// Cache local de imágenes en IndexedDB
import { idbGuardar, idbLeerTodas, idbBorrar } from "./lib/idb.js";
import { createRoot } from "react-dom/client";
import { installGlobalErrorHandlers } from "./lib/reportError.js";
import { aplicarTema, getTema } from "./lib/tema.js";
import { importarExcelPedido } from "./lib/importarExcel.js";

// Modo nocturno: reafirmar el tema en el DOM al arrancar. El script inline de
// index.html ya puso la clase antes del primer render (anti-parpadeo); esto
// deja el meta theme-color consistente y centraliza la lógica en tema.js.
aplicarTema(getTema());

// Captura errores async (handlers, fetches sin await, throws en timers,
// promesas rechazadas) que no llegan al ErrorBoundary. Hay que instalarlo
// antes de montar React para no perder los que ocurran durante el primer
// render.
installGlobalErrorHandlers();

// tablaPorPersonaHTML, imprimirPedido, nuevaVentanaImpresion,
// imprimirCotizacion, imprimirRecibo, imprimirProduccion,
// exportarExcelMes, exportarPedidoPDF
// → extraídas a src/lib/imprimir.js (importadas arriba).

async function gsCatalogoLeer() {
  const rows = await dbCatalogoLeer();
  return rows && rows.length > 0 ? rows : CATALOGO_BASE;
}
const gsCatalogoGuardar = dbCatalogoGuardar;
function App() {
  const [rol, setRol] = useState(null);
  const [sesionUser, setSesionUser] = useState(null); // { email, nombre, rol, modulos }
  // Candado biométrico: si hay sesión guardada Y huella activada, el rol
  // recuperado queda retenido acá hasta que el sensor verifique.
  const [huellaLock, setHuellaLock] = useState(null); // { rol, nombre }
  const [seccion, setSec] = useState("pedidos");
  const [modoProduccion, setModoProduccion] = useState(false);

  // Al cargar: recuperar sesion previa de localStorage. Si el rol es
  // admin, entra directo. Si es operario, mostramos PantallaLogin paso
  // "modulo" (solo si tiene varios) — para simplificar, si tiene 1
  // modulo en su whitelist entra a ese. Si no, vuelve a login.
  useEffect(() => {
    if (CAPTURA_TOKEN) return; // página pública: sin restauración de sesión
    let cancelado = false;
    (async () => {
      const { recogerSesionDesdeURL, sesionActualConRefresh, cerrarSesion } = await import("./lib/auth.js");
      const { buscarUsuarioPorEmail } = await import("./lib/usuarios.js");
      let s = await recogerSesionDesdeURL();
      if (!s) s = await sesionActualConRefresh();
      if (!s?.user?.email || cancelado) return;
      // Re-validar contra whitelist en cada arranque (admin pudo
      // desactivar al usuario después del último login).
      const wl = await buscarUsuarioPorEmail(s.user.email);
      if (!wl || !wl.activo) {
        await cerrarSesion();
        return;
      }
      if (cancelado) return;
      const u = { ...s.user, rol: wl.rol, nombre: wl.nombre, modulos: wl.modulos };
      setSesionUser(u);
      let rolFinal;
      if (u.rol === "admin") {
        rolFinal = "admin";
      } else {
        const mods = Array.isArray(u.modulos) && u.modulos.length > 0
          ? u.modulos : ["pedidos", "bordados", "cuellos"];
        // si tiene varios, entramos al primer modulo permitido por
        // default (PantallaLogin no detecta sesion previa).
        rolFinal = "operario_" + mods[0];
      }
      // El candado biométrico solo aparece si venció el período de
      // gracia (12 h desde el último desbloqueo) — no en cada abierta.
      if (necesitaDesbloqueo()) setHuellaLock({ rol: rolFinal, nombre: wl.nombre });
      else setRol(rolFinal);
    })();
    return () => { cancelado = true; };
  }, []);
  const [pedidos, setPedidos] = useState(() => {
    try {
      const d = localStorage.getItem("imis_pedidos");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextId, setNextId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_pedidos");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(p => Number(p.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  const [inventario, setInventario] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [modal, setModal] = useState(null);
  const [detalle, setDet] = useState(null);
  const [confirmar, setConf] = useState(null);
  const [busqueda, setBusq] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [sync, setSync] = useState("idle");
  // Último pedido cuyo guardado al servidor falló (quedó solo local). Se usa
  // para el banner de "sin sincronizar" y para reintentar el push SIN pisar
  // el cambio local con un refresh desde el servidor.
  const [pendienteSync, setPendienteSync] = useState(null);
  const [progreso, setProgreso] = useState(null);
  const [errorFotos, setErrorFotos] = useState([]);
  const [visor, setVisor] = useState(null); // {imgs:[], idx:0}
  // Semilla de duplicación: el FormPedido la usa como `initial` cuando
  // modal === "nuevo". Permite "Duplicar pedido" con flow correcto
  // (esNuevo = true, nextId avanza, state local se actualiza).
  const [seedDuplicar, setSeedDuplicar] = useState(null);
  const [modalIA, setModalIA] = useState(false);
  const [modalEstimador, setModalEstimador] = useState(false);
  // Cuando abrimos el estimador con una cotización existente para
  // ajustar parámetros y recalcular precios.
  const [cotizacionEnEstimador, setCotizacionEnEstimador] = useState(null);
  // Modal de versiones independiente (se abre desde SeccionCotizaciones)
  const [pedidoVerVersiones, setPedidoVerVersiones] = useState(null);
  const [cotEnviarEmail, setCotEnviarEmail] = useState(null);
  // Config global del taller (firma, sello, etc.) cargada al iniciar.
  // Vive como global accesible desde imprimirCotizacion / imprimirRecibo.
  const [cargaConfigTick, setCargaConfigTick] = useState(0);
  useEffect(() => {
    leerConfigTotal().then(c => {
      if (typeof window !== "undefined") window.__TALLER_CONFIG__ = c || {};
    });
  }, [cargaConfigTick]);
  const [modalArchivar, setModalArchivar] = useState(null);
  const [modalActMedidas, setModalActMedidas] = useState(null);
  const [masOpen, setMasOpen] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const pullStartRef = useRef(null);
  function refrescar() {
    if (refrescando) return;
    setRefrescando(true);
    pushToast("Actualizando datos...", "info", 1000);
    setTimeout(() => window.location.reload(), 250);
  }
  function onMainTouchStart(e) {
    const main = e.currentTarget;
    if (main.scrollTop > 5) {
      pullStartRef.current = null;
      return;
    }
    pullStartRef.current = e.touches[0].clientY;
  }
  function onMainTouchMove(e) {
    if (pullStartRef.current === null) return;
    const delta = e.touches[0].clientY - pullStartRef.current;
    if (delta > 0) {
      setPullDist(Math.min(delta * 0.5, 80));
    }
  }
  function onMainTouchEnd() {
    if (pullStartRef.current === null) return;
    pullStartRef.current = null;
    if (pullDist > 60) {
      refrescar();
    }
    setPullDist(0);
  }
  const [clientes, setClientes] = useState([]);
  const [catalogo, setCatalogo] = useState(CATALOGO_BASE);
  const [bordados, setBordados] = useState(() => {
    try {
      const d = localStorage.getItem("imis_bordados");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextBordId, setNextBordId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_bordados");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(b => Number(b.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  const [cuellos, setCuellos] = useState(() => {
    try {
      const d = localStorage.getItem("imis_cuellos");
      return d ? JSON.parse(d) : [];
    } catch {
      return [];
    }
  });
  const [nextCuelId, setNextCuelId] = useState(() => {
    try {
      const d = localStorage.getItem("imis_cuellos");
      const l = d ? JSON.parse(d) : [];
      return l.length ? Math.max(...l.map(c => Number(c.id) || 0)) + 1 : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      const sinData = pedidos.map(p => ({
        ...p,
        imagenes: (p.imagenes || []).map(img => ({
          nombre: img.nombre,
          tipo: img.tipo,
          driveUrl: img.driveUrl || null,
          driveId: img.driveId || null,
          supabaseUrl: img.supabaseUrl || null,
          supabasePath: img.supabasePath || null
        }))
      }));
      localStorage.setItem("imis_pedidos", JSON.stringify(sinData));
    } catch {}
  }, [pedidos]);
  useEffect(() => {
    try {
      localStorage.setItem("imis_bordados", JSON.stringify(bordados));
    } catch {}
  }, [bordados]);
  useEffect(() => {
    try {
      localStorage.setItem("imis_cuellos", JSON.stringify(cuellos));
    } catch {}
  }, [cuellos]);
  const rolBase = (rol || "").startsWith("operario_") ? "operario" : rol;
  const esAdmin = rolBase === "admin";
  // Carga inicial de todos los datos. Lógica extraída a useCargarDatos.js.
  useCargarDatos(rolBase, rol, { setPedidos, setNextId, setBordados, setNextBordId, setCuellos, setNextCuelId, setClientes, setCatalogo, setSync, setSec });

  // Realtime: cuando otro dispositivo cambia algo en Postgres, refrescamos
  // sólo la tabla afectada. Lógica extraída a useRealtime.js.
  useRealtime(rolBase, { setPedidos, setBordados, setCuellos, setClientes, setCatalogo });
  async function guardarPedido(form, _esNuevo) {
    // Es nuevo si: invocado explícitamente con _esNuevo=true, o el modal
    // dice "nuevo", o el modal es un borrador (objeto sin id, ej. desde
    // el estimador cuando inicia una cotización).
    const esNuevo = _esNuevo !== undefined
      ? _esNuevo
      : (modal === "nuevo" || (modal && typeof modal === "object" && !modal.id));
    const idPedido = esNuevo ? nextId : (modal || {}).id || form.id;
    // Si NO es nuevo y el modal es el pedido completo previo, guardamos
    // snapshot del estado anterior en localStorage para 'deshacer' por 1h.
    // El historial completo en BD igual va por el trigger.
    if (!esNuevo && modal && typeof modal === "object" && modal.id) {
      try { guardarSnapshotEdicion(modal); } catch {}
    }
    const baseP = esNuevo ? {
      ...form,
      id: idPedido,
      fecha: hoy()
    } : {
      ...(modal || {}),
      ...form,
      id: idPedido
    };
    setModal(null);
    setSync("guardando");
    const pendientes = (baseP.imagenes || []).filter(i => i.data && !i.driveUrl && !i.supabaseUrl);
    let imagenesFinales = [...(baseP.imagenes || [])];
    const erroresSubida = [];
    if (pendientes.length > 0) {
      setProgreso({
        actual: 0,
        total: pendientes.length,
        errores: 0
      });
      let completadas = 0;
      imagenesFinales = await Promise.all((baseP.imagenes || []).map(async img => {
        if (!img.data || img.driveUrl || img.supabaseUrl) return img;
        const res = await subirFotoSupabase(img.data, img.nombre, "confeccion", baseP.cliente);
        let imgResult = img;
        if (res.ok) {
          imgResult = {
            ...img,
            supabaseUrl: res.url,
            supabasePath: res.path
          };
        } else {
          erroresSubida.push({
            nombre: img.nombre || "foto",
            err: res.err
          });
        }
        completadas++;
        setProgreso({
          actual: completadas,
          total: pendientes.length,
          errores: erroresSubida.length
        });
        return imgResult;
      }));
      setProgreso(null);
    }
    const p = {
      ...baseP,
      imagenes: imagenesFinales
    };
    if (esNuevo) {
      setPedidos(prev => [...prev, p]);
      setNextId(n => n + 1);
    } else {
      setPedidos(prev => prev.map(x => x.id === p.id ? p : x));
    }
    upsertClienteLocal(p.cliente, {
      telefono: p.telefono,
      tipo: p.tipoCliente,
      contacto: p.nombreContacto,
      nit: p.nit,
      nrc: p.nrc,
      razonSocial: p.razonSocial,
      dirFiscal: p.dirFiscal
    });
    const tieneMedsNuevas = p.medidas && Object.values(p.medidas).some(v => v);
    if (tieneMedsNuevas) {
      const cliIdx = clientes.findIndex(cl => cl.nombre.toLowerCase() === p.cliente.toLowerCase());
      if (cliIdx >= 0) {
        const cliActual = clientes[cliIdx];
        const medsCli = cliActual.medidas || {};
        const hayDiferencia = Object.entries(p.medidas).some(([k, v]) => v && medsCli[k] !== v);
        if (hayDiferencia) {
          setModalActMedidas({
            pedido: p,
            cliente: cliActual
          });
        }
      }
    }
    try {
      await Promise.all([gsGuardar(p), idbGuardar(p.id, p.imagenes)]);
      if (erroresSubida.length > 0) {
        setSync("error_fotos");
        setErrorFotos(erroresSubida);
        pushToast("Pedido guardado, pero " + erroresSubida.length + " foto" + (erroresSubida.length === 1 ? "" : "s") + " no se subieron", "error", 5000);
      } else {
        setSync("ok");
        setPendienteSync(null);
        pushToast("Pedido " + (esNuevo ? "creado" : "actualizado") + " ✓", "success");
      }
    } catch (err) {
      setSync("error");
      setPendienteSync(p);
      const msg = err && err.name === "AbortError" ? "Servidor no responde. El pedido quedó local — sincronizará cuando vuelva la red." : "Error al guardar. Revisá la conexión.";
      pushToast(msg, "error", 5000);
    }
  }

  // Reintenta empujar al servidor el pedido que quedó local (sin pedir datos
  // al servidor, para no pisar el cambio local). Usado por el banner.
  async function reintentarSync() {
    if (!pendienteSync) return;
    setSync("guardando");
    try {
      await gsGuardar(pendienteSync);
      setSync("ok");
      setPendienteSync(null);
      pushToast("Sincronizado ✓", "success");
    } catch (err) {
      setSync("error");
      pushToast("Sigue sin conexión. Reintentá en un momento.", "error", 4000);
    }
  }
  function upsertClienteLocal(nombre, extra = {}) {
    if (!nombre || !nombre.trim()) return;
    const key = nombre.trim().toLowerCase();
    setClientes(prev => {
      const idx = prev.findIndex(c => c.nombre.toLowerCase() === key);
      if (idx >= 0) {
        const ex = {
          ...prev[idx]
        };
        if (!ex.telefono && extra.telefono) ex.telefono = extra.telefono;
        if (!ex.tipo && extra.tipo) ex.tipo = extra.tipo;
        if (!ex.contacto && extra.contacto) ex.contacto = extra.contacto;
        if (!ex.nit && extra.nit) ex.nit = extra.nit;
        if (!ex.nrc && extra.nrc) ex.nrc = extra.nrc;
        if (!ex.razonSocial && extra.razonSocial) ex.razonSocial = extra.razonSocial;
        if (!ex.dirFiscal && extra.dirFiscal) ex.dirFiscal = extra.dirFiscal;
        gsClientesGuardar(ex);
        const nuevos = [...prev];
        nuevos[idx] = ex;
        return nuevos;
      } else {
        const nuevo = {
          id: prev.length ? Math.max(...prev.map(c => c.id || 0)) + 1 : 1,
          nombre: nombre.trim(),
          fecha: hoy(),
          ...extra
        };
        gsClientesGuardar(nuevo);
        return [...prev, nuevo];
      }
    });
  }
  async function cambiarEstatus(id, est) {
    const anterior = pedidos.find(p => p.id === id);
    if (!anterior || anterior.estatus === est) return;
    const estatusPrevio = anterior.estatus;
    const lista = pedidos.map(p => p.id === id ? { ...p, estatus: est } : p);
    setPedidos(lista);
    try {
      await gsGuardar(lista.find(p => p.id === id));
    } catch {}
    pushUndo(`Estatus → ${est}`, async () => {
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estatus: estatusPrevio } : p));
      try {
        await gsGuardar({ ...anterior, estatus: estatusPrevio });
      } catch {}
    });
  }
  async function eliminar(id) {
    const anterior = pedidos.find(p => p.id === id);
    setPedidos(p => p.filter(x => x.id !== id));
    setConf(null);
    try {
      await Promise.all([gsBorrar(id), idbBorrar(id)]);
    } catch {}
    const nombre = anterior?.cliente ? `pedido de ${anterior.cliente}` : "pedido";
    pushUndo(`🗑️ ${nombre} eliminado`, async () => {
      try {
        await gsRestaurar(id);
        if (anterior) setPedidos(prev => [...prev.filter(x => x.id !== id), anterior]);
      } catch (e) {
        pushToast("No pude restaurar el pedido", "error");
      }
    });
  }
  const diasPara = f => f ? Math.ceil((new Date(f + "T12:00:00") - new Date()) / 86400000) : null;
  const vencidosSinArchivar = useMemo(() => pedidos.filter(p => {
    if (p.esCotizacion) return false;
    if (["Entregado", "Cancelado", "Listo", "Archivado", "Cotización"].includes(p.estatus)) return false;
    const saldo = parseFloat(p.precio || 0) - parseFloat(p.anticipo || 0);
    if (saldo > 0) return false;
    const d = diasPara(p.fechaEntrega);
    return d !== null && d < 0;
  }), [pedidos]);
  function archivarPedido(p, fechaEntregaReal) {
    const actualizado = {
      ...p,
      estatus: "Entregado",
      fechaEntrega: fechaEntregaReal || p.fechaEntrega
    };
    setPedidos(prev => prev.map(x => x.id === p.id ? actualizado : x));
    gsGuardar(actualizado);
    setModalArchivar(null);
  }
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    const hoyStr = new Date().toISOString().split("T")[0];
    const esVencidoActivo = p =>
      !["Entregado", "Cancelado"].includes(p.estatus) &&
      p.fechaEntrega &&
      p.fechaEntrega < hoyStr;
    return pedidos.filter(p => {
      // Cotizaciones (borradores) no aparecen en el listado normal de pedidos.
      if (p.esCotizacion) return false;
      const match = !q || [p.cliente, p.tipoPrenda, p.tela, p.color, p.costurera, p.notas, p.descripcion, p.nombreContacto, p.estatus, String(p.id || ""), p.fechaEntrega, p.tipoDocumento].some(v => v && String(v).toLowerCase().includes(q));
      if (!match) return false;
      // Tab "Vencidos": solo los que pasaron la fecha y NO están cerrados.
      if (filtro === "Vencidos") return esVencidoActivo(p);
      // Tab por estatus específico: muestra ese estatus tal cual.
      if (filtro !== "Todos") return p.estatus === filtro;
      // Filtro "Todos" = activos en taller. Oculta terminales y vencidos.
      if (["Entregado", "Cancelado"].includes(p.estatus)) return false;
      if (esVencidoActivo(p)) return false;
      return true;
    });
  }, [pedidos, busqueda, filtro]);
  const conteos = useMemo(() => {
    const hoyStr = new Date().toISOString().split("T")[0];
    // Conteos excluyen cotizaciones (las cotizaciones tienen su propia sección)
    const reales = pedidos.filter(p => !p.esCotizacion && p.estatus !== "Cotización");
    const base = ESTATUS.reduce((a, e) => ({
      ...a,
      [e]: reales.filter(p => p.estatus === e).length,
    }), {});
    base.Vencidos = reales.filter(p =>
      !["Entregado", "Cancelado"].includes(p.estatus) &&
      p.fechaEntrega &&
      p.fechaEntrega < hoyStr
    ).length;
    return base;
  }, [pedidos]);
  const parseMonto = v => {
    const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const porCobrar = useMemo(() => [...pedidos.filter(p => p.estatus !== "Cancelado" && p.estatus !== "Cotización" && !p.esCotizacion), ...bordados.filter(b => b.estatus !== "Cancelado"), ...cuellos.filter(c => c.estatus !== "Cancelado")].reduce((s, p) => {
    const precio = parseMonto(p.precio || p.precioT);
    const anticipo = parseMonto(p.anticipo);
    const saldo = precio - anticipo;
    return saldo > 0 ? s + saldo : s;
  }, 0), [pedidos, bordados, cuellos]);
  const alertaCF = useMemo(() => pedidos.filter(p => p.tipoDocumento === "Crédito Fiscal (pendiente datos)").length, [pedidos]);
  const activos = useMemo(() => pedidos.filter(p => !p.esCotizacion && !["Entregado", "Cancelado"].includes(p.estatus)).length + bordados.filter(b => !["Entregado", "Cancelado"].includes(b.estatus)).length + cuellos.filter(c => !["Entregado", "Cancelado"].includes(c.estatus)).length, [pedidos, bordados, cuellos]);
  const matAgotados = useMemo(() => inventario.filter(m => m.categoria === "material" && m.cantidad - asignaciones.filter(a => a.materialId === m.id).reduce((s, a) => s + a.cantidad, 0) <= 0).length, [inventario, asignaciones]);
  const syncInfo = {
    idle: {
      c: "#aaa",
      t: ""
    },
    cargando: {
      c: "#FFC107",
      t: "⏳ Cargando..."
    },
    guardando: {
      c: "#FFC107",
      t: "⏳ Guardando..."
    },
    ok: {
      c: "#28A745",
      t: "✅ Sync"
    },
    error: {
      c: "#DC3545",
      t: "⚠️ Sin conexión"
    },
    error_fotos: {
      c: "#E67E22",
      t: "⚠️ Fotos no subidas"
    }
  }[sync];
  if (CAPTURA_TOKEN) return (
    <>
      <PantallaCaptura token={CAPTURA_TOKEN} />
      <Toaster />
      <ConfirmDialog />
    </>
  );
  if (!rolBase && huellaLock) return (
    <>
      <PantallaHuella
        nombre={huellaLock.nombre}
        onOk={() => { setRol(huellaLock.rol); setHuellaLock(null); }}
        onUsarEmail={async () => {
          // Fallback: cerrar la sesión guardada y volver al login OTP.
          setHuellaLock(null);
          try {
            const { cerrarSesion } = await import("./lib/auth.js");
            await cerrarSesion();
          } catch {}
        }}
      />
      <Toaster />
      <ConfirmDialog />
    </>
  );
  if (!rolBase) return (
    <>
      <PantallaLogin onLogin={setRol} />
      <Toaster />
      <ConfirmDialog />
    </>
  );
  const NAV = (esAdmin && modoProduccion) ? getNavItems("operario", false) : getNavItems(rol, esAdmin);
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {progreso && (
        <BarraProgreso
          actual={progreso.actual}
          total={progreso.total}
          errores={progreso.errores || 0}
        />
      )}
      <SidebarDesktop
        esAdmin={esAdmin}
        sync={sync}
        syncInfo={syncInfo}
        nav={NAV}
        seccion={seccion}
        setSec={setSec}
        matAgotados={matAgotados}
        activos={activos}
        porCobrar={porCobrar}
        alertaCF={alertaCF}
        refrescar={refrescar}
        refrescando={refrescando}
        setRol={setRol}
        modoProduccion={modoProduccion}
        setModoProduccion={setModoProduccion}
        onAbrirEstimador={() => setModalEstimador(true)}
        sesionEmail={sesionUser?.email}
        sesionUser={sesionUser}
        onCerrarSesion={async () => {
          const { cerrarSesion } = await import("./lib/auth.js");
          await cerrarSesion();
          setSesionUser(null);
          setRol(null);
        }}
      />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <TopbarMobile
          esAdmin={esAdmin}
          sync={sync}
          syncInfo={syncInfo}
          porCobrar={porCobrar}
          activos={activos}
          refrescar={refrescar}
          refrescando={refrescando}
          onAbrirEstimador={() => setModalEstimador(true)}
        />
        {sync === "error" && pendienteSync && (
          <div
            style={{
              margin: "8px 12px 0",
              padding: "10px 14px",
              borderRadius: 10,
              background: "#FDECEA",
              border: "1.5px solid #DC3545",
              color: "#922B21",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ flex: 1, lineHeight: 1.35 }}>
              El pedido N°{String(pendienteSync.id).padStart(4, "0")} se guardó
              solo en este dispositivo — no llegó al servidor. Revisá tu
              conexión.
            </span>
            <button
              onClick={reintentarSync}
              style={{
                padding: "7px 14px",
                borderRadius: 7,
                border: "none",
                background: "#DC3545",
                color: "#fff",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🔄 Reintentar
            </button>
          </div>
        )}
        <Suspense fallback={
          <div style={{ padding: "1.5rem 1rem" }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ borderRadius: 16, height: 140, marginBottom: 10 }} />
            ))}
          </div>
        }>
        {seccion === "estadisticas" && esAdmin && (
          <SeccionEstadisticas
            pedidos={pedidos}
            bordados={bordados}
            cuellos={cuellos}
            onExportarExcel={exportarExcelMes}
          />
        )}
        {seccion === "inventario" && (
          <SeccionInventario
            pedidos={pedidos}
            inventario={inventario}
            setInventario={setInventario}
            asignaciones={asignaciones}
            setAsignaciones={setAsignaciones}
            esAdmin={esAdmin}
          />
        )}
        {seccion === "bordados" && (
          <SeccionBordados
            bordados={bordados}
            setBordados={setBordados}
            nextBordId={nextBordId}
            setNextBordId={setNextBordId}
            pedidosConf={pedidos}
            esAdmin={esAdmin}
            clientes={clientes}
            upsertClienteLocal={upsertClienteLocal}
            exportarPedidoPDF={exportarPedidoPDF}
          />
        )}
        {seccion === "cuellos" && (
          <SeccionCuellos
            cuellos={cuellos}
            setCuellos={setCuellos}
            nextCuelId={nextCuelId}
            setNextCuelId={setNextCuelId}
            pedidosConf={pedidos}
            esAdmin={esAdmin}
            clientes={clientes}
            upsertClienteLocal={upsertClienteLocal}
            exportarPedidoPDF={exportarPedidoPDF}
          />
        )}
        {seccion === "catalogo" && (
          <SeccionCatalogo
            catalogo={catalogo}
            setCatalogo={setCatalogo}
            esAdmin={esAdmin}
          />
        )}
        {seccion === "clientes" && esAdmin && (
          <SeccionClientes
            clientes={clientes}
            setClientes={setClientes}
            pedidos={pedidos}
            bordados={bordados}
            cuellos={cuellos}
            esAdmin={esAdmin}
            onAbrirPedido={(p) => setDet(p)}
          />
        )}
        {seccion === "calendario" && (
          <SeccionCalendario
            pedidos={pedidos}
            bordados={bordados}
            cuellos={cuellos}
            onAbrirPedido={(p) => setDet(p)}
            onAbrirBordado={() => setSec("bordados")}
            onAbrirCuello={() => setSec("cuellos")}
          />
        )}
        {seccion === "config" && esAdmin && (
          <SeccionConfig onConfigCambia={() => setCargaConfigTick(t => t + 1)} />
        )}
        {seccion === "cotizaciones" && esAdmin && (
          <SeccionCotizaciones
            pedidos={pedidos}
            onImprimir={(c) => imprimirCotizacion(c)}
            onComparar={(cots) => {
              if (!cots || cots.length < 2) return;
              const w = nuevaVentanaImpresion();
              w.document.write(htmlComparativoCotizaciones(cots));
              w.document.close();
            }}
            onEditar={(c) => setModal(c)}
            onReabrirEstimador={(c) => {
              setCotizacionEnEstimador(c);
              setModalEstimador(true);
            }}
            onVerVersiones={(c) => setPedidoVerVersiones(c)}
            onEnviarEmail={(c) => setCotEnviarEmail(c)}
            onConvertirPedido={async (c) => {
              const ok = await pushConfirm({
                titulo: "Convertir a pedido",
                msg: `¿Convertir COT-${String(c.id).padStart(4, "0")} de ${c.cliente} a pedido firme? Pasará a producción con estatus Corte.`,
                okLabel: "Sí, convertir",
              });
              if (!ok) return;
              const actualizado = { ...c, esCotizacion: false, estatus: "Corte" };
              setPedidos(prev => prev.map(p => p.id === c.id ? actualizado : p));
              try { await gsGuardar(actualizado); } catch {}
              // Si el cliente NO existe en el CRM, lo agregamos automático.
              // Match case-insensitive por nombre normalizado.
              const nombre = (c.cliente || "").trim();
              if (nombre) {
                const yaExiste = clientes.some(cl =>
                  (cl.nombre || "").trim().toLowerCase() === nombre.toLowerCase()
                );
                if (!yaExiste) {
                  const nuevoCliente = {
                    id: clientes.length > 0 ? Math.max(...clientes.map(x => x.id || 0)) + 1 : 1,
                    nombre,
                    telefono: c.telefono || "",
                    tipo: c.tipoCliente || "persona",
                    contacto: c.nombreContacto || "",
                    nit: c.nit || "",
                    nrc: c.nrc || "",
                    razonSocial: c.razonSocial || "",
                    dirFiscal: c.dirFiscal || "",
                    notas: `Agregado al convertir COT-${String(c.id).padStart(4, "0")}`,
                    medidas: c.medidas || {},
                    fecha: new Date().toISOString().split("T")[0],
                  };
                  setClientes(prev => [...prev, nuevoCliente]);
                  try { await gsClientesGuardar(nuevoCliente); } catch {}
                  pushToast(`Cliente "${nombre}" agregado al CRM`, "success", 4000);
                }
              }
              pushToast("Cotización convertida a pedido ✓", "success");
              setSec("pedidos");
            }}
            onEliminar={async (c) => {
              const ok = await pushConfirm({
                titulo: "Eliminar cotización",
                msg: `¿Eliminar COT-${String(c.id).padStart(4, "0")} de ${c.cliente}? Se puede recuperar desde Papelera.`,
                okLabel: "Eliminar",
                danger: true,
              });
              if (!ok) return;
              await eliminar(c.id);
            }}
          />
        )}
        {seccion === "papelera" && esAdmin && (
          <Suspense
            fallback={
              <div style={{ padding: 32, textAlign: "center", color: "#999" }}>
                ⏳ Cargando papelera...
              </div>
            }
          >
            <SeccionPapeleraLazy onRestaurado={refrescar} />
          </Suspense>
        )}
        </Suspense>
        {seccion === "pedidos" && (
          <SeccionPedidos
            pedidos={pedidos}
            filtrados={filtrados}
            conteos={conteos}
            busqueda={busqueda}
            setBusqueda={setBusq}
            filtro={filtro}
            setFiltro={setFiltro}
            sync={sync}
            vencidosSinArchivar={vencidosSinArchivar}
            onArchivarVencido={setModalArchivar}
            pullDist={pullDist}
            onMainTouchStart={onMainTouchStart}
            onMainTouchMove={onMainTouchMove}
            onMainTouchEnd={onMainTouchEnd}
            diasPara={diasPara}
            esAdmin={esAdmin}
            asignaciones={asignaciones}
            nextId={nextId}
            setDet={setDet}
            setModal={setModal}
            setSeedDuplicar={setSeedDuplicar}
            setConf={setConf}
            setVisor={setVisor}
            cambiarEstatus={cambiarEstatus}
            onImprimir={(p) => modoProduccion ? imprimirProduccion(p, pedidos) : imprimirPedido(p, esAdmin, pedidos)}
            onCopiarWA={(p) => copiarWA(p, esAdmin)}
            cotizaciones={pedidos.filter(p => p.esCotizacion)}
            onEditarCotizacion={(c) => setModal(c)}
            onImprimirCotizacion={(c) => imprimirCotizacion(c)}
          />
        )}
        <BottomNav
          nav={NAV}
          seccion={seccion}
          setSec={setSec}
          masOpen={masOpen}
          setMasOpen={setMasOpen}
          setRol={setRol}
          esAdmin={esAdmin}
          vencidosSinArchivar={vencidosSinArchivar}
          matAgotados={matAgotados}
        />
        {masOpen && (
          <MasOpenSheet
            nav={NAV}
            seccion={seccion}
            setSec={setSec}
            setMasOpen={setMasOpen}
            setRol={setRol}
            esAdmin={esAdmin}
            sesionEmail={sesionUser?.email}
          />
        )}
      </main>
      {modalArchivar && (
        <ModalArchivar
          pedido={modalArchivar}
          onConfirmarArchivar={(f) => archivarPedido(modalArchivar, f)}
          onCambiarAListo={() => {
            const actualizado = { ...modalArchivar, estatus: "Listo" };
            setPedidos((prev) =>
              prev.map((x) => (x.id === modalArchivar.id ? actualizado : x))
            );
            gsGuardar(actualizado);
            setModalArchivar(null);
          }}
          onCerrar={() => setModalArchivar(null)}
        />
      )}
      <EstimadorPrecio
        open={modalEstimador}
        onClose={() => { setModalEstimador(false); setCotizacionEnEstimador(null); }}
        clientes={clientes}
        nextId={nextId}
        cotizacionExistente={cotizacionEnEstimador}
        onActualizarCotizacion={async (id, cot) => {
          const existente = pedidos.find(p => p.id === id);
          if (!existente) return;
          const actualizado = {
            ...existente,
            cliente: cot.cliente,
            telefono: cot.telefono,
            tipoPrenda: cot.tipoPrenda,
            tallasItems: cot.tallasItems,
            modoRegistro: cot.modoRegistro,
            precio: cot.precio,
            desgloseEstimador: cot.desgloseEstimador,
          };
          setPedidos(prev => prev.map(p => p.id === id ? actualizado : p));
          try { await gsGuardar(actualizado); } catch {}
          pushToast(`COT-${String(id).padStart(4, "0")} actualizada con nuevos precios`, "success");
        }}
        onGuardarCotizacion={(cot) => {
          // Abre el FormPedido precargado con los datos del estimador
          // (cliente, tel, items, precio) + flag esCotizacion=true. El
          // user completa fecha entrega, descripción, tela, color, etc.
          // y al guardar queda con el mismo formato que un pedido.
          const borrador = {
            ...PEDIDO_BASE,
            ...cot,
            esCotizacion: true,
            // Sin id → el FormPedido lo trata como edición de un draft;
            // guardarPedido(f) asigna nextId al guardar.
          };
          setModalEstimador(false);
          setModal(borrador);
        }}
      />
      {modalIA && (
        <Suspense fallback={null}>
        <ModalAsistenteIA
          rol={rol}
          onCrearPedido={(p) => {
            setModalIA(false);
            guardarPedido(p, true);
          }}
          onAbrir={(p) => {
            setModalIA(false);
            setModal(p || "nuevo");
          }}
          onCerrar={() => setModalIA(false)}
        />
        </Suspense>
      )}
      {modal && (
        <Modal
          title={
            modal === "nuevo"
              ? "✂️ Nuevo Pedido"
              : modal.importado && !modal.id
              ? "📗 Pedido importado de Excel"
              : modal.esCotizacion
              ? (modal.id
                  ? "🧮 Cotización COT-" + String(modal.id).padStart(4, "0")
                  : "🧮 Nueva Cotización")
              : "✏️ Editar N°" + String(modal.id).padStart(4, "0")
          }
          onClose={() => setModal(null)}
        >
          {modal === "nuevo" && (
            <button
              onClick={() => {
                setModal(null);
                setModalIA(true);
              }}
              style={{
                width: "100%",
                padding: "11px",
                borderRadius: 10,
                border: "1.5px solid #1A5276",
                background: "#EBF5FB",
                color: "#1A5276",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {"\uD83E\uDD16 Registrar con Asistente IA (voz o texto)"}
            </button>
          )}
          {modal === "nuevo" && (
            <>
              <button
                onClick={() => document.getElementById("imp-excel-pedido")?.click()}
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: 10,
                  border: "1.5px solid #1D6A3A",
                  background: "#F0FFF4",
                  color: "#1D6A3A",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {"\uD83D\uDCD7 Importar Excel de medidas (formato del taller)"}
              </button>
              <input
                id="imp-excel-pedido"
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={async e => {
                  const f = e.target.files && e.target.files[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    const { borrador, resumen } = await importarExcelPedido(f);
                    pushToast(
                      "\uD83D\uDCD7 " + resumen.personas + " personas importadas (" +
                        resumen.tablas.map(t => t.tipo + " " + t.filas).join(", ") + ") \u2014 revis\u00E1 y guard\u00E1",
                      "success", 5000
                    );
                    setModal({ ...borrador, importado: true });
                  } catch (err) {
                    pushToast(err.message, "error", 6000);
                  }
                }}
              />
            </>
          )}
          <FormPedido
            key={modal === "nuevo" && seedDuplicar ? `seed-${seedDuplicar.id || Date.now()}` : (modal === "nuevo" ? "nuevo" : (modal && modal.id) || "blank")}
            initial={modal !== "nuevo" ? modal : seedDuplicar}
            onSave={f => { setSeedDuplicar(null); guardarPedido(f); }}
            onCancel={() => { setSeedDuplicar(null); setModal(null); }}
            rol={rol}
            pedidosExistentes={pedidos}
            clientes={clientes}
            catalogo={catalogo}
          />
        </Modal>
      )}
      {detalle && (
        <DetallePedidoModal
          pedido={detalle}
          catalogo={catalogo}
          esAdmin={esAdmin}
          bordados={bordados}
          cuellos={cuellos}
          onClose={() => setDet(null)}
          onCambiarEstatus={(nuevo) => {
            const actualizado = { ...detalle, estatus: nuevo };
            setDet(actualizado);
            cambiarEstatus(detalle.id, nuevo);
          }}
          onCambiarCosturera={(nuevo) => {
            const actualizado = { ...detalle, costurera: nuevo };
            setDet(actualizado);
            setPedidos((prev) =>
              prev.map((p) => (p.id === detalle.id ? actualizado : p))
            );
            gsGuardar(actualizado);
          }}
          onVerFoto={(imgs, idx) => setVisor({ imgs, idx })}
          onIrABordados={() => {
            setSec("bordados");
            setDet(null);
          }}
          onIrACuellos={() => {
            setSec("cuellos");
            setDet(null);
          }}
          onCrearBordadoVinc={() => {
            const nb = {
              id: nextBordId,
              cliente: detalle.cliente,
              telefono: detalle.telefono || "",
              confRef: String(detalle.id),
              soporte: detalle.tipoPrenda || "",
              estatus: "Dise\u00F1o",
              fecha: new Date().toISOString().split("T")[0],
              anticipo: "",
              precioU: "",
              precioT: "",
              "dise\u00F1o": "",
              puntadas: "",
              hilos: "",
              posicion: "Pecho izquierdo",
              "estadoDise\u00F1o": "Pendiente dise\u00F1ar",
              esNuevo: "nuevo",
              abonos: [],
              notas:
                "Creado desde confecci\u00F3n N\u00B0" +
                String(detalle.id).padStart(4, "0"),
            };
            setBordados((prev) => [...prev, nb]);
            setNextBordId((n) => n + 1);
            gsBordGuardar(nb);
            setSec("bordados");
            setDet(null);
          }}
          onCrearCuelloVinc={() => {
            const nc = {
              id: nextCuelId,
              cliente: detalle.cliente,
              telefono: detalle.telefono || "",
              confRef: String(detalle.id),
              cantidad: "1",
              material: "Acr\u00EDlico",
              calibre: "Medio",
              estatus: "Pendiente",
              fecha: new Date().toISOString().split("T")[0],
              anticipo: "",
              precioU: "",
              precioT: "",
              cuello: { activa: true, largo: "", ancho: "", colores: "" },
              puno: { activa: false, largo: "", ancho: "", colores: "" },
              banda: { activa: false, largo: "", ancho: "", colores: "" },
              abonos: [],
              notas:
                "Creado desde confecci\u00F3n N\u00B0" +
                String(detalle.id).padStart(4, "0"),
            };
            setCuellos((prev) => [...prev, nc]);
            setNextCuelId((n) => n + 1);
            gsCuelGuardar(nc);
            setSec("cuellos");
            setDet(null);
          }}
          onWhatsApp={() => {
            copiarWA(detalle, esAdmin);
            pushToast("Mensaje de WhatsApp copiado — pegalo en el chat", "success");
          }}
          onExportarPDF={() => exportarPedidoPDF(detalle, "confeccion")}
          onImprimirProduccion={(opts) => imprimirProduccion(detalle, pedidos, opts)}
          onImprimirEntrega={() => imprimirEntrega(detalle)}
          onAbrirEdicion={() => {
            setModal(detalle);
            setDet(null);
          }}
        />
      )}
      {visor && (
        <VisorImagenes
          imgs={visor.imgs}
          idx={visor.idx}
          setIdx={(i) => setVisor((v) => ({ ...v, idx: i }))}
          onCerrar={() => setVisor(null)}
        />
      )}
      {errorFotos.length > 0 && (
        <ModalErrorFotos
          errores={errorFotos}
          onCerrar={() => setErrorFotos([])}
        />
      )}
      {modalActMedidas && (
        <ModalActMedidas
          pedido={modalActMedidas.pedido}
          cliente={modalActMedidas.cliente}
          onActualizar={() => {
            const cli = {
              ...modalActMedidas.cliente,
              medidas: {
                ...(modalActMedidas.cliente.medidas || {}),
                ...modalActMedidas.pedido.medidas,
              },
            };
            setClientes((prev) =>
              prev.map((c) => (c.id === cli.id ? cli : c))
            );
            gsClientesGuardar(cli);
            setModalActMedidas(null);
          }}
          onCerrar={() => setModalActMedidas(null)}
        />
      )}
      {confirmar && (
        <ModalConfirmarBorrar
          onCancelar={() => setConf(null)}
          onConfirmar={() => eliminar(confirmar)}
        />
      )}
      <Toaster />
      <ConfirmDialog />
      <ConexionStatus />
      <InstallPrompt />
      {pedidoVerVersiones && (
        <Suspense fallback={null}>
          <ModalVersionesPedido
            pedido={pedidoVerVersiones}
            onClose={() => setPedidoVerVersiones(null)}
            onRestaurado={() => { setPedidoVerVersiones(null); refrescar(); }}
          />
        </Suspense>
      )}
      {cotEnviarEmail && (
        <Suspense fallback={null}>
          <ModalEnviarCotizacion
            cotizacion={cotEnviarEmail}
            onClose={() => setCotEnviarEmail(null)}
          />
        </Suspense>
      )}
      {esAdmin && (
        <RecordatorioInicio
          pedidos={pedidos}
          onIrAVencidos={() => { setSec("pedidos"); setFiltro("Vencidos"); }}
          onIrAProximos={() => { setSec("calendario"); }}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

