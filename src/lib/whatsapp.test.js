import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mensajeWA,
  mensajeCotizacionWA,
  mensajeComparativoWA,
  compartirTextoImagenes,
} from "./whatsapp.js";

// ── Fixtures ──────────────────────────────────────────────────────────────

const pedidoBase = {
  id: 42,
  cliente: "Empresa ABC",
  tipoCliente: "empresa",
  tipoPrenda: "Camisa polo",
  tela: "Piqué",
  color: "Azul marino",
  fechaEntrega: "2026-06-11",
  estatus: "Producción",
  precio: "350.00",
  anticipo: "150.00",
  tallasItems: [{ talla: "M", qty: 5, precio: "35" }],
  personas: [],
};

// ── mensajeWA ─────────────────────────────────────────────────────────────

describe("mensajeWA — estructura", () => {
  it("incluye el encabezado de TALLER IMIS", () => {
    expect(mensajeWA(pedidoBase)).toContain("TALLER IMIS");
  });

  it("formatea el número con padding de 4 dígitos", () => {
    expect(mensajeWA({ ...pedidoBase, id: 7 })).toContain("N°0007");
    expect(mensajeWA({ ...pedidoBase, id: 123 })).toContain("N°0123");
    expect(mensajeWA({ ...pedidoBase, id: 9999 })).toContain("N°9999");
  });

  it("incluye nombre del cliente", () => {
    const msg = mensajeWA(pedidoBase);
    expect(msg).toContain("Empresa ABC");
  });

  it("incluye tipo de prenda y tela", () => {
    const msg = mensajeWA(pedidoBase);
    expect(msg).toContain("Camisa polo");
    expect(msg).toContain("Piqué");
  });

  it("incluye el estado del pedido", () => {
    expect(mensajeWA(pedidoBase)).toContain("Producción");
  });

  it("incluye la fecha de entrega", () => {
    expect(mensajeWA(pedidoBase)).toContain("2026-06-11");
  });

  it("sin fechaEntrega muestra '—' en la línea de entrega", () => {
    const msg = mensajeWA({ ...pedidoBase, fechaEntrega: null });
    expect(msg).toContain("Entrega: —");
  });
});

describe("mensajeWA — ícono por tipo de cliente", () => {
  it("empresa → 🏢", () => {
    expect(mensajeWA({ ...pedidoBase, tipoCliente: "empresa" })).toContain("🏢");
  });

  it("escuela → 🏫", () => {
    expect(mensajeWA({ ...pedidoBase, tipoCliente: "escuela" })).toContain("🏫");
  });

  it("persona → 👤", () => {
    expect(mensajeWA({ ...pedidoBase, tipoCliente: "persona" })).toContain("👤");
  });
});

describe("mensajeWA — días restantes", () => {
  // Sistema fijo a mediodía UTC 2026-06-04 para comparaciones reproducibles.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("muestra '(N días)' cuando la entrega es en el futuro (> 1 día)", () => {
    const msg = mensajeWA({ ...pedidoBase, fechaEntrega: "2026-06-11" });
    expect(msg).toMatch(/\(\d+ días\)/);
  });

  it("muestra 'venció hace Nd' cuando la entrega ya pasó", () => {
    const msg = mensajeWA({ ...pedidoBase, fechaEntrega: "2026-05-28" });
    expect(msg).toMatch(/venció hace \d+d/);
  });

  it("sin fechaEntrega no muestra cadena de días", () => {
    const msg = mensajeWA({ ...pedidoBase, fechaEntrega: null });
    expect(msg).not.toMatch(/días|venció|mañana|HOY/);
  });
});

describe("mensajeWA — modo admin vs no-admin", () => {
  it("admin: muestra precio total y saldo pendiente", () => {
    const msg = mensajeWA({ ...pedidoBase, precio: "350.00", anticipo: "150.00" }, true);
    expect(msg).toContain("$350.00");
    expect(msg).toContain("$150.00");
    expect(msg).toContain("$200.00"); // saldo = 350 - 150
  });

  it("admin con pago completo: muestra 'Pagado completamente'", () => {
    const msg = mensajeWA({ ...pedidoBase, precio: "200.00", anticipo: "200.00" }, true);
    expect(msg).toContain("Pagado completamente");
    expect(msg).not.toContain("Saldo pendiente");
  });

  it("no-admin: NO muestra precios ni saldo", () => {
    const msg = mensajeWA({ ...pedidoBase, precio: "350.00", anticipo: "150.00" }, false);
    expect(msg).not.toContain("$350.00");
    expect(msg).not.toContain("Saldo");
    expect(msg).not.toContain("Adelanto");
  });

  it("no-admin con saldo pendiente: muestra framing de 2 partes", () => {
    const msg = mensajeWA({ ...pedidoBase, precio: "350.00", anticipo: "150.00" }, false);
    expect(msg).toContain("2 partes");
  });

  it("no-admin con pago completo: NO muestra framing de 2 partes", () => {
    const msg = mensajeWA({ ...pedidoBase, precio: "350.00", anticipo: "350.00" }, false);
    expect(msg).not.toContain("2 partes");
  });

  it("no-admin sin precio: NO muestra framing de 2 partes", () => {
    const msg = mensajeWA({ ...pedidoBase, precio: "" }, false);
    expect(msg).not.toContain("2 partes");
  });
});

describe("mensajeWA — campos condicionales", () => {
  it("tieneBordado muestra la línea de bordado", () => {
    expect(mensajeWA({ ...pedidoBase, tieneBordado: true })).toContain("bordado");
    expect(mensajeWA({ ...pedidoBase, tieneBordado: false })).not.toContain("bordado");
  });

  it("descripcion se incluye (va al cliente)", () => {
    const msg = mensajeWA({ ...pedidoBase, descripcion: "Con logo en pecho" });
    expect(msg).toContain("Con logo en pecho");
  });

  it("notas internas NO se incluyen en el mensaje", () => {
    // Contrato de privacidad: p.notas son observaciones del taller,
    // nunca deben aparecer en el mensaje que va al cliente.
    const msg = mensajeWA({ ...pedidoBase, notas: "INFO_INTERNA_SECRETA" });
    expect(msg).not.toContain("INFO_INTERNA_SECRETA");
  });

  it("telefono y contacto se incluyen", () => {
    const msg = mensajeWA({ ...pedidoBase, telefono: "7777-1234", nombreContacto: "Juan" });
    expect(msg).toContain("7777-1234");
    expect(msg).toContain("Juan");
  });

  it("tallasItems aparece en el resumen de tallas", () => {
    const msg = mensajeWA({
      ...pedidoBase,
      tallasItems: [{ talla: "L", qty: 8, precio: "35" }],
    });
    expect(msg).toContain("8×");
    expect(msg).toContain("L");
  });
});

// ── mensajeCotizacionWA ───────────────────────────────────────────────────

describe("mensajeCotizacionWA", () => {
  const cot = {
    id: 5,
    cliente: "Colegio San José",
    tipoCliente: "escuela",
    tipoPrenda: "Uniforme — Camisa polo",
    tela: "Jersey",
    precio: "180.00",
    validezDias: 15,
    fecha: "2026-06-01",
    tallasItems: [
      { talla: "S", qty: 10, precio: "18" },
      { talla: "M", qty: 8, precio: "18" },
    ],
    personas: [],
  };

  it("encabeza con 'Cotización' y número con padding", () => {
    const msg = mensajeCotizacionWA(cot);
    expect(msg).toContain("Cotización N°0005");
  });

  it("incluye el precio total", () => {
    const msg = mensajeCotizacionWA(cot);
    expect(msg).toContain("$180.00");
  });

  // La validez ("válida 15 días") era una política que el código inventó:
  // Javier no la estableció. Se quitó del mensaje y del PDF (24-ago-2026).
  it("no habla de validez ni de vencimiento", () => {
    const msg = mensajeCotizacionWA(cot);
    expect(msg).not.toMatch(/[Vv]álida|vence/);
  });

  it("incluye descripcion si existe", () => {
    const msg = mensajeCotizacionWA({ ...cot, descripcion: "Logo bordado incluido" });
    expect(msg).toContain("Logo bordado incluido");
  });

  it("incluye framing de 2 pagos", () => {
    const msg = mensajeCotizacionWA(cot);
    expect(msg).toContain("2 partes");
  });
});

// ── mensajeComparativoWA ──────────────────────────────────────────────────

describe("mensajeComparativoWA", () => {
  const cots = [
    {
      cliente: "ACME Corp",
      nombreContacto: "Natali",
      fecha: "2026-08-23",
      validezDias: 15,
      tipoPrenda: "Camisa polo — Piqué",
      tela: "Piqué (mejor caída)",
      color: "Azul",
      tallasItems: [{ talla: "M", qty: 10, precio: "35" }],
      precio: "350.00",
      tieneBordado: true,
      descripcion: "Logo bordado en pecho",
    },
    {
      cliente: "ACME Corp",
      tipoPrenda: "Camisa polo — Dacrón",
      tela: "Dacrón",
      color: "Azul",
      tallasItems: [{ talla: "M", qty: 10, precio: "25" }],
      precio: "250.00",
      descripcion: "Tela más liviana",
    },
  ];

  it("incluye 'Opción 1' y 'Opción 2'", () => {
    const msg = mensajeComparativoWA(cots);
    expect(msg).toContain("Opción 1");
    expect(msg).toContain("Opción 2");
  });

  it("calcula precio por unidad de cada opción", () => {
    const msg = mensajeComparativoWA(cots);
    expect(msg).toContain("$35.00 c/u"); // 350 / 10
    expect(msg).toContain("$25.00 c/u"); // 250 / 10
  });

  it("usa el nombre del cliente de la primera cotización", () => {
    expect(mensajeComparativoWA(cots)).toContain("ACME Corp");
  });

  it("funciona con una sola cotización", () => {
    const msg = mensajeComparativoWA([cots[0]]);
    expect(msg).toContain("Opción 1");
    expect(msg).not.toContain("Opción 2");
  });

  // Antes el comparativo salía con la foto y el precio nada más: el cliente
  // no veía tela, tallas ni notas y las opciones se leían idénticas.
  it("muestra el detalle de cada opción, no solo el precio", () => {
    const msg = mensajeComparativoWA(cots);
    expect(msg).toContain("Piqué");           // etiqueta = la diferencia
    expect(msg).toContain("Dacrón");
    expect(msg).toContain("Bordado");         // solo la opción 1 lo lleva
    expect(msg).toContain("Logo bordado en pecho");
    expect(msg).toContain("Tela más liviana");
  });

  it("sube al encabezado lo que comparten todas las opciones", () => {
    const msg = mensajeComparativoWA(cots);
    const encabezado = msg.split("Opción 1")[0];
    expect(encabezado).toContain("Azul");     // mismo color en las dos
    expect(encabezado).toContain("10× M");    // mismas tallas
    // y no se repite dentro de cada opción
    expect(msg.match(/Azul/g)).toHaveLength(1);
  });

  // Caso real: SEDAS #80 vs #81 — la misma camisa en dos telas. Las notas
  // solo se diferencian en que una dice "en dacrón" y "cambia solo la tela".
  // Eso no debe repetirse: la tela ya es el nombre de la opción.
  it("no repite la nota ni la prosa sobre la tela cuando la tela ya nombra la opción", () => {
    const comun = " · 2 bolsillos pecho con tapa · logo SEDAS bordado en pecho izquierdo. Mismo estilo de las camisas de vigilantes (#28)";
    const sedas = [
      {
        cliente: "SEDAS", tipoPrenda: "Camisa de mantenimiento — Dril Bonel Startex",
        tela: "Dril Bonel Startex", color: "Azul navy", precio: "168",
        tallasItems: [{ talla: "Única", qty: 6, precio: "28" }],
        descripcion: "Camisa navy manga larga" + comun + ".",
      },
      {
        cliente: "SEDAS", tipoPrenda: "Camisa de mantenimiento — Dacrón",
        tela: "Dacrón", color: "Azul navy", precio: "150",
        tallasItems: [{ talla: "Única", qty: 6, precio: "25" }],
        descripcion: "Camisa navy manga larga en dacrón" + comun + "; cambia solo la tela.",
      },
    ];
    const msg = mensajeComparativoWA(sedas);
    // La opción se llama por su tela y trae su precio.
    expect(msg).toContain("Opción 1 — Dril Bonel Startex");
    expect(msg).toContain("Opción 2 — Dacrón");
    expect(msg).toContain("$28.00 c/u");
    expect(msg).toContain("$25.00 c/u");
    // La nota compartida va una sola vez, arriba.
    expect(msg.match(/2 bolsillos pecho con tapa/g)).toHaveLength(1);
    expect(msg.split("Opción 1")[0]).toContain("2 bolsillos pecho con tapa");
    // Y no queda prosa que repita la tela.
    expect(msg).not.toContain("en dacrón");
    expect(msg).not.toContain("cambia solo la tela");
  });

  it("incluye el contacto y no habla de vencimiento", () => {
    const msg = mensajeComparativoWA(cots);
    expect(msg).toContain("Natali");
    expect(msg).not.toMatch(/[Vv]álida|vence/);
  });

  it("saca el precio unitario de las personas cuando no hay tallasItems", () => {
    const porPersonas = {
      ...cots[0],
      tallasItems: [],
      modoRegistro: "lista",
      personas: [{ nombre: "A", talla: "M" }, { nombre: "B", talla: "L" }],
      precio: "70",
    };
    const msg = mensajeComparativoWA([porPersonas, cots[1]]);
    expect(msg).toContain("$35.00 c/u"); // 70 / 2 personas, no 70
  });
});

// ── compartirTextoImagenes ────────────────────────────────────────────────

describe("compartirTextoImagenes", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("sin navigator.share copia al portapapeles y retorna 'copiado'", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const result = await compartirTextoImagenes("hola", []);

    expect(result).toBe("copiado");
    expect(writeText).toHaveBeenCalledWith("hola");
  });

  it("con navigator.share llama share y retorna 'compartido'", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      clipboard: { writeText: vi.fn() },
    });

    const result = await compartirTextoImagenes("mensaje");

    expect(result).toBe("compartido");
    expect(share).toHaveBeenCalledWith({ text: "mensaje" });
  });

  it("AbortError (usuario canceló) retorna 'cancelado'", async () => {
    const abortErr = Object.assign(new Error("abort"), { name: "AbortError" });
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(abortErr),
      clipboard: { writeText: vi.fn() },
    });

    const result = await compartirTextoImagenes("msg");

    expect(result).toBe("cancelado");
  });

  it("error en share (no AbortError) cae a clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(new Error("share no disponible")),
      clipboard: { writeText },
    });

    const result = await compartirTextoImagenes("texto");

    expect(result).toBe("copiado");
    expect(writeText).toHaveBeenCalledWith("texto");
  });
});
