import { z } from 'zod';

/**
 * Lee y valida las variables de entorno al arrancar.
 * La URL de la API se cambia en el archivo .env (ver docs/CONFIGURAR-API.md).
 * Recordatorio: todo lo VITE_* es publico en el navegador.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error('Falta VITE_API_BASE_URL o no es una URL valida. Revisa tu archivo .env (ver .env.example).');
}

const apiBase = new URL(parsed.data.VITE_API_BASE_URL);

// Nota: para el despliegue académico la API del modelo corre en el EC2 por HTTP
// (http://IP:8000). Por eso no se exige HTTPS. En un despliegue real convendría
// poner la API detrás de HTTPS y volver a exigirlo aquí.

export const env = {
  API_BASE_URL: apiBase.origin,
} as const;
