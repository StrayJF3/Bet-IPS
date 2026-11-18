export type ApiErrorKind = 'network' | 'timeout' | 'invalid_request' | 'invalid_response' | 'server';

const MESSAGES: Record<ApiErrorKind, string> = {
  network: 'No se pudo conectar con el modelo. Revisa que la API esté encendida.',
  timeout: 'El modelo tardó demasiado en responder. Intenta de nuevo.',
  invalid_request: 'La solicitud no es válida.',
  invalid_response: 'La API respondió con datos inesperados.',
  server: 'El modelo tuvo un problema al responder. Intenta más tarde.',
};

/** Error generico: nunca muestra detalles internos del servidor. */
export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    public status?: number,
  ) {
    super(MESSAGES[kind]);
    this.name = 'ApiError';
  }
}
