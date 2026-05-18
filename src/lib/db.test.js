import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  dbLeer,
  dbGuardar,
  dbBorrar,
  dbRestaurar,
  dbPapelera,
} from "./db.js";

// Helper para crear una respuesta fetch mock.
function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map([["content-type", "application/json"]]),
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function emptyResponse(status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(),
    json: async () => null,
    text: async () => "",
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dbLeer", () => {
  it("convierte snake_case del DB a camelCase en el cliente", async () => {
    const dbRows = [
      { id: 1, cliente: "Juan", tipo_prenda: "Camisa", fecha_entrega: "2026-05-20" },
    ];
    fetch.mockResolvedValue(jsonResponse(dbRows));

    const result = await dbLeer();

    expect(result[0].tipoPrenda).toBe("Camisa");
    expect(result[0].fechaEntrega).toBe("2026-05-20");
    expect(result[0].cliente).toBe("Juan");
  });

  it("filtra borrados (deleted_at = is.null)", async () => {
    fetch.mockResolvedValue(jsonResponse([]));
    await dbLeer();
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("deleted_at=is.null");
  });

  it("devuelve [] cuando fetch falla (no propaga el error)", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Map(),
      json: async () => null,
      text: async () => "server error",
    });
    // Mockeamos setTimeout para que el retry no haga la suite lenta
    vi.useFakeTimers();
    const promise = dbLeer();
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();

    expect(result).toEqual([]);
  });
});

describe("dbPapelera", () => {
  it("filtra solo borrados (deleted_at = not.is.null)", async () => {
    fetch.mockResolvedValue(jsonResponse([]));
    await dbPapelera();
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("deleted_at=not.is.null");
  });
});

describe("dbGuardar", () => {
  it("convierte camelCase del cliente a snake_case en el body", async () => {
    fetch.mockResolvedValue(emptyResponse(204));

    await dbGuardar({
      id: 5,
      cliente: "Ana",
      tipoPrenda: "Vestido",
      fechaEntrega: "2026-06-01",
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].tipo_prenda).toBe("Vestido");
    expect(body[0].fecha_entrega).toBe("2026-06-01");
  });

  it("usa POST con on_conflict=id (upsert)", async () => {
    fetch.mockResolvedValue(emptyResponse(204));
    await dbGuardar({ id: 1, cliente: "x" });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain("/pedidos?on_conflict=id");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Prefer).toContain("resolution=merge-duplicates");
  });

  it("limpia campos de imagen al guardar (no manda data URL al server)", async () => {
    fetch.mockResolvedValue(emptyResponse(204));

    await dbGuardar({
      id: 1,
      cliente: "x",
      imagenes: [
        {
          nombre: "foto.jpg",
          tipo: "image/jpeg",
          data: "data:image/jpeg;base64,muylargo===",
          supabaseUrl: "https://...",
          supabasePath: "confeccion/x/123.jpg",
        },
      ],
    });

    // imagenes es jsonb — sus contenidos NO se transforman a snake_case,
    // se mantienen como camelCase. Pero el `data` (base64 grande) sí se descarta.
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    const img = body[0].imagenes[0];
    expect(img.supabaseUrl).toBe("https://...");
    expect(img.supabasePath).toBe("confeccion/x/123.jpg");
    expect(img.data).toBeUndefined();
  });
});

describe("dbBorrar (soft-delete)", () => {
  it("hace PATCH con deleted_at en ISO timestamp", async () => {
    fetch.mockResolvedValue(emptyResponse(204));

    await dbBorrar(42);

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain("/pedidos?id=eq.42");
    expect(opts.method).toBe("PATCH");
    const body = JSON.parse(opts.body);
    expect(body.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("dbRestaurar", () => {
  it("hace PATCH con deleted_at: null", async () => {
    fetch.mockResolvedValue(emptyResponse(204));

    await dbRestaurar(42);

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain("/pedidos?id=eq.42");
    expect(opts.method).toBe("PATCH");
    const body = JSON.parse(opts.body);
    expect(body.deleted_at).toBeNull();
  });
});
