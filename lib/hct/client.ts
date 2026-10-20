import { schedule } from "./rateLimit";
import { getHctToken } from "./token";
import { getHctHost } from "@/lib/settings";

export class HctError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "HctError";
  }
}

interface Options {
  method?: "GET" | "POST";
  body?: unknown;
  /** Límite por petición. Las búsquedas históricas pueden tardar más que el resto. */
  timeoutMs?: number;
}

// Cliente base del OpenAPI. Reglas:
// - header Token (no Authorization Bearer)
// - exito funcional = errorCode === "0" aunque HTTP sea 200
// - toda llamada pasa por la cola de 5 req/s
export async function hctFetch<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const { method = "POST", body, timeoutMs = 15000 } = options;
  return schedule(async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    headers.Token = await getHctToken();
    const host = await getHctHost();

    let res: Response;
    try {
      res = await fetch(`${host}/api/hccgw${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        // Sin timeout, una conexion colgada de HCT deja la cola de rate-limit
        // trabada para siempre y cualquier 'use cache' en llenado muere con
        // "Filling a cache during prerender timed out" (USE_CACHE_TIMEOUT).
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new HctError(
          "HCT_TIMEOUT",
          `Hik-Connect no respondió en ${Math.round(timeoutMs / 1000)} segundos. Intenta un rango de tiempo menor.`,
        );
      }
      throw error;
    }

    const json = (await res.json().catch(() => null)) as {
      errorCode?: string;
      message?: string;
      errorMsg?: string;
      data?: unknown;
    } | null;

    if (!res.ok) throw new HctError(`HTTP_${res.status}`, `${method} ${path} -> HTTP ${res.status}`);
    if (!json || json.errorCode !== "0") {
      throw new HctError(
        json?.errorCode ?? "UNKNOWN",
        json?.message ?? json?.errorMsg ?? "Respuesta HCT sin errorCode 0",
      );
    }
    return json.data as T;
  });
}
