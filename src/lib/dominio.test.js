import { describe, it, expect } from "vitest";
import {
  fmt$,
  hoy,
  tallasTexto,
  tallasItemsTexto,
  resumenTallas,
  rankTalla,
  medidaCuelloParaTalla,
  itemsResumen,
  detalleFactura,
  carritoPedido,
  tieneMedidas,
  otrosPedidosPorPersona,
  listaUnificadaGrupo,
  normNombre,
  PEDIDO_BASE,
} from "./dominio.js";

describe("fmt$", () => {
  it("formatea números con 2 decimales y signo $", () => {
    expect(fmt$(10)).toBe("$10.00");
    expect(fmt$(0.5)).toBe("$0.50");
    expect(fmt$(123.456)).toBe("$123.46");
  });

  it("acepta strings numéricos", () => {
    expect(fmt$("25")).toBe("$25.00");
    expect(fmt$("3.14")).toBe("$3.14");
  });

  it("convierte null/undefined/'' a $0.00", () => {
    expect(fmt$(null)).toBe("$0.00");
    expect(fmt$(undefined)).toBe("$0.00");
    expect(fmt$("")).toBe("$0.00");
  });
});

describe("hoy", () => {
  it("devuelve la fecha en formato YYYY-MM-DD", () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("tallasTexto", () => {
  it("formatea cantidades positivas separadas por ' · '", () => {
    expect(tallasTexto({ S: 2, M: 0, L: 3 })).toBe("2×S · 3×L");
  });

  it("omite tallas con cantidad 0 o vacía", () => {
    expect(tallasTexto({ XS: 1, S: 0, M: "", L: 4 })).toBe("1×XS · 4×L");
  });

  it("devuelve string vacío con objeto vacío", () => {
    expect(tallasTexto({})).toBe("");
    expect(tallasTexto()).toBe("");
  });
});

describe("tallasItemsTexto", () => {
  it("formatea items básicos sin spec ni precio", () => {
    expect(tallasItemsTexto([{ qty: 3, talla: "M" }])).toBe("3×M");
  });

  it("incluye spec corto entre paréntesis", () => {
    expect(
      tallasItemsTexto([{ qty: 2, talla: "L", spec: "azul" }])
    ).toBe("2×L(azul)");
  });

  it("abrevia specs largos quitando vocales", () => {
    const out = tallasItemsTexto([{ qty: 1, talla: "S", spec: "azul oscuro talla especial" }]);
    expect(out).toMatch(/^1×S\(.+\)$/);
    expect(out).not.toContain("azul oscuro talla especial");
  });

  it("incluye precio cuando es positivo", () => {
    expect(
      tallasItemsTexto([{ qty: 1, talla: "M", precio: "25" }])
    ).toBe("1×M(@$25.00)");
  });

  it("omite precio 0 o vacío", () => {
    expect(
      tallasItemsTexto([{ qty: 1, talla: "M", precio: "0" }])
    ).toBe("1×M");
    expect(
      tallasItemsTexto([{ qty: 1, talla: "M", precio: "" }])
    ).toBe("1×M");
  });

  it("combina varios items con ' · '", () => {
    expect(
      tallasItemsTexto([
        { qty: 2, talla: "S" },
        { qty: 3, talla: "M" },
      ])
    ).toBe("2×S · 3×M");
  });
});

describe("resumenTallas", () => {
  it("prefiere tallasItems si tiene contenido", () => {
    const p = {
      tallasItems: [{ qty: 1, talla: "M" }],
      modoTallas: "libre",
      tallasLibre: "ignorar",
      tallasQty: { L: 5 },
    };
    expect(resumenTallas(p)).toBe("1×M");
  });

  it("usa tallasLibre cuando modoTallas es 'libre'", () => {
    const p = { modoTallas: "libre", tallasLibre: "tallas mixtas" };
    expect(resumenTallas(p)).toBe("tallas mixtas");
  });

  it("usa tallasQty por defecto", () => {
    const p = { tallasQty: { S: 1, L: 2 } };
    expect(resumenTallas(p)).toBe("1×S · 2×L");
  });

  it("devuelve string vacío sin datos", () => {
    expect(resumenTallas({})).toBe("");
  });
});

describe("rankTalla", () => {
  it("orden natural pequeño → grande: niño numérico antes que letras de adulto", () => {
    const tallas = ["XXL", "S", "14", "6", "M", "12", "XL", "L", "8"];
    tallas.sort((a, b) => rankTalla(a) - rankTalla(b));
    expect(tallas).toEqual(["6", "8", "12", "14", "S", "M", "L", "XL", "XXL"]);
  });

  it("XXL y 2XL son la misma talla (legacy); sin talla va al final", () => {
    expect(rankTalla("XXL")).toBe(rankTalla("2XL"));
    expect(rankTalla("XXXL")).toBe(rankTalla("3XL"));
    expect(rankTalla("XL")).toBeLessThan(rankTalla("XXL"));
    expect(rankTalla("")).toBeGreaterThan(rankTalla("XXL"));
  });

  it("itemsResumen ordena por talla con el rank nuevo", () => {
    const p = {
      modoRegistro: "tallas",
      tallasItems: [
        { id: 1, talla: "XXL", qty: 3 },
        { id: 2, talla: "6", qty: 3 },
        { id: 3, talla: "S", qty: 4 },
        { id: 4, talla: "14", qty: 2 },
      ],
    };
    expect(itemsResumen(p).map(it => it.talla)).toEqual(["6", "14", "S", "XXL"]);
  });
});

describe("PEDIDO_BASE", () => {
  it("tiene todos los campos default esperados", () => {
    expect(PEDIDO_BASE.cliente).toBe("");
    expect(PEDIDO_BASE.tipoCliente).toBe("persona");
    expect(PEDIDO_BASE.estatus).toBe("Corte");
    expect(PEDIDO_BASE.tipoDocumento).toBe("Consumidor Final");
    expect(PEDIDO_BASE.costurera).toBe("(Sin asignar)");
    expect(PEDIDO_BASE.imagenes).toEqual([]);
    expect(PEDIDO_BASE.abonos).toEqual([]);
    expect(PEDIDO_BASE.personas).toEqual([]);
  });

  it("medidas vienen inicializadas (no null)", () => {
    expect(typeof PEDIDO_BASE.medidas).toBe("object");
    expect(PEDIDO_BASE.medidas).not.toBeNull();
  });
});

describe("medidaCuelloParaTalla", () => {
  it("tallas de nino: hasta la 8 usan cuello 11; 10-12 usan 12", () => {
    expect(medidaCuelloParaTalla("4")).toBe('11"');
    expect(medidaCuelloParaTalla("6")).toBe('11"');
    expect(medidaCuelloParaTalla("8")).toBe('11"');
    expect(medidaCuelloParaTalla("10")).toBe('12"');
    expect(medidaCuelloParaTalla(12)).toBe('12"');
  });

  it("14 y S usan 14; M-L usan 15; XL en adelante usan 17", () => {
    expect(medidaCuelloParaTalla("14")).toBe('14"');
    expect(medidaCuelloParaTalla("S")).toBe('14"');
    expect(medidaCuelloParaTalla("XS")).toBe('14"');
    expect(medidaCuelloParaTalla("M")).toBe('15"');
    expect(medidaCuelloParaTalla("L")).toBe('15"');
    expect(medidaCuelloParaTalla("XL")).toBe('17"');
    expect(medidaCuelloParaTalla("XXL")).toBe('17"');
    expect(medidaCuelloParaTalla("2XL")).toBe('17"');
    expect(medidaCuelloParaTalla("4XL")).toBe('17"');
  });

  it("acepta minusculas y espacios", () => {
    expect(medidaCuelloParaTalla(" m ")).toBe('15"');
    expect(medidaCuelloParaTalla("xxl")).toBe('17"');
  });

  it("tallas que no mapean devuelven null (numericas de camisa, vacias, texto libre)", () => {
    expect(medidaCuelloParaTalla("38")).toBe(null);
    expect(medidaCuelloParaTalla("")).toBe(null);
    expect(medidaCuelloParaTalla(null)).toBe(null);
    expect(medidaCuelloParaTalla("Especial")).toBe(null);
  });
});

describe("detalleFactura", () => {
  it("marca `incompleto` cuando faltan precios en las prendas y en el pedido", () => {
    // El caso real del pedido 36 (cadetes INSO): 16 personas con prendas sin
    // precio y pedido.precio vacío → total $0.00 contra $675 abonado, y
    // `descuadre` no salta porque sumaLineas es null. La alerta es `incompleto`.
    const d = detalleFactura({
      tipoPrenda: "Uniforme cadete",
      precio: "",
      personas: [
        { nombre: "Ana", prendas: [{ tipo: "Chaqueta", talla: "M", precio: null }, { tipo: "Pantalón", talla: "M", precio: null }] },
        { nombre: "Luis", prendas: [{ tipo: "Chaqueta", talla: "L", precio: null }] },
      ],
    });
    expect(d.total).toBe(0);
    expect(d.sumaLineas).toBe(null);
    expect(d.descuadre).toBe(false);
    expect(d.qtySinPrecio).toBe(3);
    expect(d.incompleto).toBe(true);
  });

  it("NO marca incompleto si el pedido tiene precio acordado aunque las líneas no", () => {
    const d = detalleFactura({
      precio: "675",
      personas: [{ nombre: "Ana", prendas: [{ tipo: "Chaqueta", talla: "M", precio: null }] }],
    });
    expect(d.total).toBe(675);
    expect(d.qtySinPrecio).toBe(1);
    expect(d.incompleto).toBe(false);
  });

  it("NO marca incompleto cuando todas las líneas tienen precio (total = suma)", () => {
    const d = detalleFactura({
      precio: "",
      personas: [
        { nombre: "Ana", prendas: [{ tipo: "Camiseta", talla: "M", precio: 4 }] },
        { nombre: "Luis", prendas: [{ tipo: "Camiseta", talla: "L", precio: 4 }] },
      ],
    });
    expect(d.sumaLineas).toBe(8);
    expect(d.total).toBe(8);
    expect(d.qtySinPrecio).toBe(0);
    expect(d.incompleto).toBe(false);
  });

  it("descuadre sigue funcionando cuando hay precio y suma que no coinciden", () => {
    const d = detalleFactura({
      precio: "100",
      personas: [{ nombre: "Ana", prendas: [{ tipo: "Camiseta", talla: "M", precio: 4 }] }],
    });
    expect(d.descuadre).toBe(true);
    expect(d.incompleto).toBe(false);
  });
});

describe("carritoPedido", () => {
  const pedido = {
    tipoPrenda: "Filipina",
    precio: "226.00", // 17 filipinas facturables @ ~$13.29 (usamos precio del pedido)
    personas: [
      { nombre: "Ana", talla: "M", noFactura: false, prendas: [{ tipo: "Filipina", talla: "M", precio: 13 }] },
      { nombre: "Luis", talla: "L", noFactura: false, prendas: [{ tipo: "Filipina", talla: "L", precio: 13 }] },
      { nombre: "Extra1", noFactura: true, prendas: [{ tipo: "Filipina", talla: "XL", precio: 30 }] },
      { nombre: "Extra2", noFactura: true, prendas: [{ tipo: "Filipina", talla: "XL", precio: 30 }] },
    ],
    componentes: [
      { nombre: "Gabacha", cantidad: 17, precio: 8 },
      { nombre: "Gorro", cantidad: 17, precio: "" }, // sin precio → se produce, no factura
    ],
  };

  it("separa factura, pago aparte y sin precio", () => {
    const c = carritoPedido(pedido);
    // Factura: personas facturables + componentes con precio (gabacha)
    expect(c.factura.lineas.some(l => l.tipo === "Gabacha")).toBe(true);
    expect(c.factura.total).toBeCloseTo(226, 2);
    // Pago aparte: las 2 filipinas XL noFactura, agrupadas → qty 2, subtotal 60
    expect(c.aparte.lineas).toHaveLength(1);
    expect(c.aparte.lineas[0].qty).toBe(2);
    expect(c.aparte.total).toBeCloseTo(60, 2);
    // Sin precio: el gorro (componente sin precio)
    expect(c.sinPrecio).toHaveLength(1);
    expect(c.sinPrecio[0].nombre).toBe("Gorro");
    expect(c.sinPrecio[0].qty).toBe(17);
  });

  it("un pedido vacío no rompe", () => {
    const c = carritoPedido({ personas: [], componentes: [] });
    expect(c.factura.lineas).toHaveLength(0);
    expect(c.aparte.lineas).toHaveLength(0);
    expect(c.sinPrecio).toHaveLength(0);
  });
});

describe("otrosPedidosPorPersona", () => {
  // El caso real: el cadete que está en el uniforme (36) también pidió
  // camiseta (63). Mismo cliente INSO, nombres con tilde vs mayúsculas.
  const p36 = {
    id: 36,
    cliente: "Instituto Nacional de Sonzacate (INSO)",
    tipoPrenda: "Uniforme cadete",
    personas: [
      { nombre: "ISAAC HERNANDEZ", prendas: [{ id: 1, tipo: "Chaqueta", talla: "M", precio: null }] },
      { nombre: "SOLO DEL 36", prendas: [{ id: 2, tipo: "Chaqueta", talla: "S", precio: null }] },
    ],
  };
  const p63 = {
    id: 63,
    cliente: "Instituto Nacional de Sonzacate (INSO)",
    tipoPrenda: "Camiseta negra",
    origenRef: "36",
    estatus: "Corte",
    personas: [{ nombre: "Isaac Hernández", prendas: [{ id: 3, tipo: "Camiseta negra", talla: "M", precio: 4 }] }],
    abonos: [{ monto: "4", nota: "Isaac Hernández" }],
  };
  const otroCliente = {
    id: 99,
    cliente: "Otra Escuela",
    personas: [{ nombre: "Isaac Hernández", prendas: [{ id: 4, tipo: "Polo", talla: "L", precio: 9 }] }],
  };

  it("cruza al cadete del 36 con su camiseta del 63 y trae su abono", () => {
    const m = otrosPedidosPorPersona(p36, [p36, p63, otroCliente]);
    const otros = m.get(normNombre("Isaac Hernández"));
    expect(otros).toHaveLength(1);
    expect(otros[0].pedidoId).toBe(63);
    expect(otros[0].prendas[0].tipo).toBe("Camiseta negra");
    expect(otros[0].abono).toBe(4);
    // El que solo está en el 36 no gana entradas
    expect(m.has(normNombre("SOLO DEL 36"))).toBe(false);
  });

  it("NO cruza homónimos de clientes distintos sin enlace origenRef", () => {
    const m = otrosPedidosPorPersona(p36, [p36, otroCliente]);
    expect(m.has(normNombre("Isaac Hernández"))).toBe(false);
  });

  it("shape viejo: talla/precio sueltos generan prenda virtual con el tipo del pedido", () => {
    const legacy = {
      id: 70,
      cliente: "Instituto Nacional de Sonzacate (INSO)",
      tipoPrenda: "Gorra",
      personas: [{ nombre: "Isaac Hernandez", talla: "M", precio: 6 }],
    };
    const m = otrosPedidosPorPersona(p36, [p36, legacy]);
    const otros = m.get(normNombre("Isaac Hernández"));
    expect(otros).toHaveLength(1);
    expect(otros[0].prendas).toEqual([{ tipo: "Gorra", talla: "M", precio: 6 }]);
  });

  it("incluye pedidos enlazados por origenRef aunque el cliente esté escrito distinto", () => {
    const conRef = { ...otroCliente, id: 80, origenRef: "36" };
    const m = otrosPedidosPorPersona(p36, [p36, conRef]);
    expect(m.get(normNombre("Isaac Hernández"))[0].pedidoId).toBe(80);
  });
});

describe("listaUnificadaGrupo", () => {
  const p36 = {
    id: 36,
    cliente: "Instituto Nacional de Sonzacate (INSO)",
    tipoPrenda: "Uniforme cadete",
    estatus: "Corte",
    personas: [
      { nombre: "ISAAC HERNANDEZ", prendas: [{ id: 1, tipo: "Chaqueta", talla: "M", precio: null }] },
      { nombre: "MARVIN LOPEZ", prendas: [{ id: 2, tipo: "Chaqueta", talla: "L", precio: null }] },
    ],
    abonos: [{ monto: "40", nota: "Isaac Hernández" }],
  };
  const p63 = {
    id: 63,
    cliente: "Instituto Nacional de Sonzacate (INSO)",
    tipoPrenda: "Camiseta negra",
    origenRef: "36",
    estatus: "Corte",
    personas: [
      { nombre: "Isaac Hernández", prendas: [{ id: 3, tipo: "Camiseta negra", talla: "M", precio: 4 }] },
      { nombre: "Carlos Nuevo", prendas: [{ id: 4, tipo: "Camiseta negra", talla: "S", precio: 4 }] },
    ],
    abonos: [{ monto: "4", nota: "Isaac Hernández" }],
  };
  const cot27 = {
    id: 27,
    cliente: "Instituto Nacional de Sonzacate (INSO)",
    tipoPrenda: "Uniforme cadete",
    estatus: "Cotización",
    personas: [{ nombre: "Isaac Hernández", prendas: [{ id: 5, tipo: "Chaqueta", talla: "M", precio: null }] }],
  };
  const banda34 = {
    id: 34,
    cliente: "Instituto Nacional de Sonzacate (INSO)",
    tipoPrenda: "Uniforme de banda",
    estatus: "Entregado",
    personas: [{ nombre: "Otro Alumno", prendas: [{ id: 6, tipo: "Gala", talla: "M", precio: 50 }] }],
  };

  it("une por persona los pedidos que comparten gente y suma total/abonado/saldo", () => {
    const g = listaUnificadaGrupo(p36, [p36, p63, cot27, banda34]);
    // Incluye 36 y 63; excluye la cotización (duplicaría el uniforme) y la
    // banda (mismo cliente pero sin personas en común).
    expect(g.pedidosIncluidos.map(x => x.id)).toEqual([36, 63]);
    const isaac = g.personas[0];
    expect(isaac.nombre).toBe("ISAAC HERNANDEZ");
    expect(isaac.filas.map(f => f.pedidoId)).toEqual([36, 63]);
    expect(isaac.total).toBe(4); // solo la camiseta tiene precio
    expect(isaac.sinPrecio).toBe(true); // la chaqueta no
    expect(isaac.abonado).toBe(44); // $40 del 36 + $4 del 63
    // Carlos solo está en el 63 → entra igual, al final
    const carlos = g.personas.find(x => x.nombre === "Carlos Nuevo");
    expect(carlos.filas).toHaveLength(1);
    expect(carlos.saldo).toBe(4);
    expect(g.totales.total).toBe(8);
    expect(g.totales.abonado).toBe(44);
  });

  it("sin pedidos que compartan gente, el grupo es solo el pedido abierto", () => {
    const g = listaUnificadaGrupo(p36, [p36, banda34]);
    expect(g.pedidosIncluidos.map(x => x.id)).toEqual([36]);
  });
});

describe("tieneMedidas", () => {
  it("detecta valores en el shape plano", () => {
    expect(tieneMedidas({ pecho: "98" })).toBe(true);
    expect(tieneMedidas({ pecho: "" })).toBe(false);
  });

  it("detecta valores en el shape anidado por prenda", () => {
    expect(tieneMedidas({ pantalon: { cintura: "83" } })).toBe(true);
    expect(tieneMedidas({ pantalon: {}, chaqueta: {} })).toBe(false);
  });

  it("null/undefined/objeto vacío → false", () => {
    expect(tieneMedidas(null)).toBe(false);
    expect(tieneMedidas(undefined)).toBe(false);
    expect(tieneMedidas({})).toBe(false);
  });
});

describe("normNombre", () => {
  it("cruza el nombre del formulario con el del Excel del taller", () => {
    // El caso real de los cadetes INSO: la cotización se llenó a mano con
    // tildes y el pedido entró por Excel en mayúsculas sin acentos.
    expect(normNombre("Adonay Alemán")).toBe(normNombre("ADONAY ALEMAN"));
    expect(normNombre("Alessandro Santamaría")).toBe(normNombre("ALESSANDRO SANTAMARIA"));
    expect(normNombre("Andrés Ramírez")).toBe(normNombre("ANDRES RAMIREZ"));
    expect(normNombre("Franklin Arévalo")).toBe(normNombre("FRANKLIN AREVALO"));
    expect(normNombre("Isaac Hernández")).toBe(normNombre("ISAAC HERNANDEZ"));
  });

  it("colapsa espacios de sobra y recorta los extremos", () => {
    expect(normNombre("  Andrea   Castro ")).toBe("ANDREA CASTRO");
  });

  it("respeta la ñ, que no es un acento", () => {
    expect(normNombre("Peña")).toBe("PEÑA");
    expect(normNombre("Peña")).not.toBe(normNombre("Pena"));
  });

  it("NO empareja nombres incompletos: eso es un dato a corregir", () => {
    expect(normNombre("Lindsay Romero")).not.toBe(normNombre("Lindsay Clarisa Romero"));
  });

  it("tolera vacíos y nulos sin reventar", () => {
    expect(normNombre(null)).toBe("");
    expect(normNombre(undefined)).toBe("");
    expect(normNombre("")).toBe("");
  });
});
