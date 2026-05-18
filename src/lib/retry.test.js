import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry.js";

// Delays cortos para los tests no se hacen lentos. Pasamos delays: [1, 1, 1].
const FAST = { delays: [1, 1, 1] };

describe("withRetry", () => {
  it("devuelve el resultado si la fn no falla", async () => {
    const fn = vi.fn(async () => "ok");
    const r = await withRetry(fn, FAST);
    expect(r).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reintenta TypeErrors (red caída) hasta 3 veces y luego devuelve éxito", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 3) throw new TypeError("Failed to fetch");
      return "ok";
    });
    const r = await withRetry(fn, FAST);
    expect(r).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("reintenta errores HTTP 5xx", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 2) throw new Error("HTTP 500: Internal Server Error");
      return "ok";
    });
    const r = await withRetry(fn, FAST);
    expect(r).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("reintenta errores 429 (rate limit)", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 2) throw new Error("HTTP 429: Too Many Requests");
      return "ok";
    });
    const r = await withRetry(fn, FAST);
    expect(r).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("reintenta errores 408 (timeout)", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 2) throw new Error("HTTP 408: Request Timeout");
      return "ok";
    });
    const r = await withRetry(fn, FAST);
    expect(r).toBe("ok");
  });

  it("NO reintenta 4xx (excepto 408/429) — los errores de input son del usuario", async () => {
    const fn = vi.fn(async () => {
      throw new Error("HTTP 400: Bad Request");
    });
    await expect(withRetry(fn, FAST)).rejects.toThrow("HTTP 400");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("NO reintenta 403", async () => {
    const fn = vi.fn(async () => {
      throw new Error("HTTP 403: Forbidden");
    });
    await expect(withRetry(fn, FAST)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("levanta el último error si agotó los reintentos", async () => {
    const fn = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(withRetry(fn, FAST)).rejects.toThrow("Failed to fetch");
    // 3 delays = 4 intentos totales (1 inicial + 3 reintentos)
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("llama a onRetry con error e intento", async () => {
    const onRetry = vi.fn();
    let n = 0;
    const fn = vi.fn(async () => {
      n++;
      if (n < 3) throw new TypeError("net");
      return "ok";
    });
    await withRetry(fn, { ...FAST, onRetry });
    // 2 reintentos exitosos antes del 3er intento que funciona
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][1]).toBe(1); // intento 1
    expect(onRetry.mock.calls[1][1]).toBe(2); // intento 2
  });

  it("reintenta errores con mensajes de network/timeout/abort", async () => {
    for (const msg of ["network down", "request timeout", "aborted"]) {
      let n = 0;
      const fn = async () => {
        n++;
        if (n < 2) throw new Error(msg);
        return "ok";
      };
      const r = await withRetry(fn, FAST);
      expect(r).toBe("ok");
      expect(n).toBe(2);
    }
  });

  it("no reintenta errores genéricos sin marca de transitorio", async () => {
    const fn = vi.fn(async () => {
      throw new Error("algo random");
    });
    await expect(withRetry(fn, FAST)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
