import { describe, it, expect } from "vitest";
import {
  tipoDteDePedido,
  construirItemsDTE,
  construirReceptor,
  faltantesReceptorCCF,
  previewMontos,
  construirPayloadPedido,
  montoYaFacturado,
  saldoPendiente,
  normalizarBridgeUrl,
  facturacionDisponible,
} from "./dte.js";
import {
  ambientePermitido,
  puedeEmitirProduccion,
  ordenEstado,
} from "./dteEmpresas.js";

// Pedido de ejemplo: 10 camisas a $25 (IVA incl.), total $250, anticipo $100.
const pedidoFC = {
  id: 42,
  cliente: "Juan Pérez",
  tipoPrenda: "Camisa",
  tipoDocumento: "Consumidor Final",
  precio: 250,
  anticipo: 100,
  tallasItems: [{ tipo: "Camisa", talla: "M", qty: 10, precio: 25 }],
  modoRegistro: "tallas",
};

const pedidoCCF = {
  id: 7,
  cliente: "Tienda La Económica",
  razonSocial: "INVERSIONES LA ECONOMICA S.A. DE C.V.",
  tipoPrenda: "Pantalón",
  tipoDocumento: "Crédito Fiscal (CCF)",
  nit: "0614-110123-102-4",
  nrc: "123456-7",
  dirFiscal: "Calle Real 23, San Salvador",
  precio: 113,
  tallasItems: [{ tipo: "Pantalón", talla: "L", qty: 1, precio: 113 }],
  modoRegistro: "tallas",
};

const empresa = {
  id: 1,
  nit: "0614-111923-102-4",
  ambiente: "00",
  estadoHomologacion: "en_pruebas",
};

describe("tipoDteDePedido", () => {
  it("Consumidor Final → 01 (Factura)", () => {
    expect(tipoDteDePedido(pedidoFC)).toBe("01");
  });
  it("Crédito Fiscal → 03 (CCF)", () => {
    expect(tipoDteDePedido(pedidoCCF)).toBe("03");
    expect(tipoDteDePedido({ tipoDocumento: "Crédito Fiscal ..." })).toBe("03");
  });
  it("sin tipoDocumento → 01 por defecto", () => {
    expect(tipoDteDePedido({})).toBe("01");
  });
});

describe("construirItemsDTE", () => {
  it("total: una línea por tipo+precio con precio IVA-incluido", () => {
    const items = construirItemsDTE(pedidoFC, { modo: "total" });
    expect(items).toEqual([
      { descripcion: "Camisa", cantidad: 10, precioUniConIva: 25 },
    ]);
  });

  it("anticipo: un solo ítem con el monto del anticipo", () => {
    const items = construirItemsDTE(pedidoFC, { modo: "anticipo" });
    expect(items).toHaveLength(1);
    expect(items[0].precioUniConIva).toBe(100);
    expect(items[0].descripcion).toContain("Anticipo");
    expect(items[0].descripcion).toContain("#42");
  });

  it("anticipo: respeta monto forzado", () => {
    const items = construirItemsDTE(pedidoFC, { modo: "anticipo", monto: 240 });
    expect(items[0].precioUniConIva).toBe(240);
  });

  it("saldo: precio − ya facturado", () => {
    const conAnticipoFacturado = {
      ...pedidoFC,
      dte_emitidos: [{ modo: "anticipo", monto: 100 }],
    };
    const items = construirItemsDTE(conAnticipoFacturado, { modo: "saldo" });
    expect(items[0].precioUniConIva).toBe(150); // 250 − 100
    expect(items[0].descripcion).toContain("Saldo");
  });

  it("total: fallback a un ítem si alguna línea no tiene precio", () => {
    const sinPrecio = {
      ...pedidoFC,
      tallasItems: [{ tipo: "Camisa", talla: "M", qty: 10, precio: null }],
    };
    const items = construirItemsDTE(sinPrecio, { modo: "total" });
    expect(items).toHaveLength(1);
    expect(items[0].cantidad).toBe(1);
    expect(items[0].precioUniConIva).toBe(250); // del precio del pedido
  });
});

describe("previewMontos — desglose de IVA 13%", () => {
  it("extrae IVA de un total IVA-incluido", () => {
    const { total, gravado, iva } = previewMontos(pedidoFC, { modo: "total" });
    expect(total).toBe(250);
    expect(gravado).toBe(221.24); // 250 / 1.13
    expect(iva).toBe(28.76);      // 250 − 221.24
    expect(round2(gravado + iva)).toBe(total);
  });

  it("anticipo: desglosa solo el monto del anticipo", () => {
    const { total, iva } = previewMontos(pedidoFC, { modo: "anticipo", monto: 113 });
    expect(total).toBe(113);
    expect(iva).toBe(13); // 113 − 100
  });
});

describe("construirReceptor / faltantesReceptorCCF", () => {
  it("CCF: usa razón social, NIT y NRC sin guiones", () => {
    const r = construirReceptor(pedidoCCF);
    expect(r.nombre).toBe("INVERSIONES LA ECONOMICA S.A. DE C.V.");
    expect(r.nit).toBe("06141101231024");
    expect(r.nrc).toBe("1234567");
    expect(r.direccion).toEqual({ complemento: "Calle Real 23, San Salvador" });
  });

  it("FC: cae al nombre del cliente si no hay razón social", () => {
    const r = construirReceptor(pedidoFC);
    expect(r.nombre).toBe("Juan Pérez");
    expect(r.nit).toBeNull();
  });

  it("faltantesReceptorCCF: detecta lo que falta para CCF", () => {
    expect(faltantesReceptorCCF(pedidoCCF)).toEqual([]);
    expect(faltantesReceptorCCF(pedidoFC)).toContain("NIT");
    expect(faltantesReceptorCCF(pedidoFC)).toContain("NRC");
  });
});

describe("construirPayloadPedido", () => {
  it("arma el payload simple con nit del emisor y ambiente de la empresa", () => {
    const p = construirPayloadPedido({ pedido: pedidoFC, empresa, modo: "total", correlativo: 5 });
    expect(p.nit).toBe("06141119231024");
    expect(p.ambiente).toBe("00");
    expect(p.tipoDte).toBe("01");
    expect(p.correlativo).toBe(5);
    expect(p.referencia).toBe("pedido-42-total");
    expect(p.items).toHaveLength(1);
  });

  it("CCF: tipoDte 03 y receptor con NIT", () => {
    const p = construirPayloadPedido({ pedido: pedidoCCF, empresa, modo: "total" });
    expect(p.tipoDte).toBe("03");
    expect(p.receptor.nit).toBe("06141101231024");
  });

  it("incluye el bloque emisor (perfil fiscal) con NIT/NRC sin guiones y dirección", () => {
    const emp = { ...empresa, nrc: "123456-7", nombre: "TALLER X", departamento: "06", municipio: "14", complementoDir: "Calle 1" };
    const p = construirPayloadPedido({ pedido: pedidoFC, empresa: emp, modo: "total" });
    expect(p.emisor.nit).toBe("06141119231024");
    expect(p.emisor.nrc).toBe("1234567");
    expect(p.emisor.nombre).toBe("TALLER X");
    expect(p.emisor.direccion).toEqual({ departamento: "06", municipio: "14", complemento: "Calle 1" });
    expect(p.emisor.tipoEstablecimiento).toBe("02");
  });

  it("lanza si no hay empresa", () => {
    expect(() => construirPayloadPedido({ pedido: pedidoFC, empresa: null })).toThrow();
  });
});

describe("montoYaFacturado / saldoPendiente", () => {
  it("suma DTE no anulados", () => {
    const p = { precio: 450, dte_emitidos: [
      { modo: "anticipo", monto: 240 },
      { modo: "saldo", monto: 10, anulado: true },
    ] };
    expect(montoYaFacturado(p)).toBe(240);
    expect(saldoPendiente(p)).toBe(210);
  });
  it("sin DTE: saldo = precio completo", () => {
    expect(saldoPendiente({ precio: 450 })).toBe(450);
  });
});

describe("ambiente / estado de homologación", () => {
  it("solo producción permite ambiente 01", () => {
    expect(ambientePermitido("no_iniciada")).toBe("00");
    expect(ambientePermitido("en_pruebas")).toBe("00");
    expect(ambientePermitido("aprobada")).toBe("00");
    expect(ambientePermitido("produccion")).toBe("01");
  });
  it("puedeEmitirProduccion solo con estado produccion + ambiente 01", () => {
    expect(puedeEmitirProduccion({ estadoHomologacion: "produccion", ambiente: "01" })).toBe(true);
    expect(puedeEmitirProduccion({ estadoHomologacion: "en_pruebas", ambiente: "01" })).toBe(false);
    expect(puedeEmitirProduccion(null)).toBe(false);
  });
  it("ordenEstado refleja el avance del trámite", () => {
    expect(ordenEstado("no_iniciada")).toBeLessThan(ordenEstado("solicitada"));
    expect(ordenEstado("aprobada")).toBeLessThan(ordenEstado("produccion"));
  });
});

describe("config del bridge", () => {
  it("normalizarBridgeUrl quita slashes finales", () => {
    expect(normalizarBridgeUrl("https://x.org/")).toBe("https://x.org");
    expect(normalizarBridgeUrl("  https://x.org//  ")).toBe("https://x.org");
  });
  it("facturacionDisponible refleja si hay URL", () => {
    expect(facturacionDisponible("")).toBe(false);
    expect(facturacionDisponible("https://x.org")).toBe(true);
  });
});

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
