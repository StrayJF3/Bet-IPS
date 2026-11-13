import type { ZodType } from 'zod';
import { env } from '../config/env';
import { ApiError } from './ApiError';

const DEFAULT_TIMEOUT_MS = 10_000;

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Solo se permiten rutas relativas que terminen en el mismo origen configurado en .env. */
function apiUrl(path: string): URL {
  if (!path.startsWith('/') || path.startsWith('//')) throw new ApiError('invalid_request');
  const url = new URL(path, env.API_BASE_URL);
  if (url.origin !== env.API_BASE_URL) throw new ApiError('invalid_request');
  return url;
}

async function send(url: URL, opts: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => controller.abort(), { once: true });
  const hasBody = opts.body !== undefined;
  try {
    return await fetch(url, {
      method: opts.method ?? 'GET',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(hasBody ? { 'Content-Type': 'application/json' } : {}) },
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(controller.signal.reason === 'timeout' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(res: Response, schema: ZodType<T>): Promise<T> {
  if (res.status === 400 || res.status === 422) throw new ApiError('invalid_request', res.status);
  if (!res.ok) throw new ApiError('server', res.status);
  const json: unknown = await res.json().catch(() => {
    throw new ApiError('invalid_response', res.status);
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError('invalid_response', res.status);
  return parsed.data;
}

/**
 * Unico punto de salida hacia la API del modelo (EC2). Centraliza:
 *  - solo rutas relativas al origen configurado en .env,
 *  - sin cookies ni credenciales (la API es publica y de solo lectura),
 *  - tiempo maximo de espera,
 *  - validacion de la respuesta con zod,
 *  - errores genericos.
 */
export async function request<T>(path: string, schema: ZodType<T>, opts: RequestOptions = {}): Promise<T> {
  return parse(await send(apiUrl(path), opts), schema);
}
