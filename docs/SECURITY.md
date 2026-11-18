# Seguridad de la plataforma

La plataforma es una página pública sin cuentas de usuario: no hay login, sesiones ni datos personales. La superficie de ataque es la API de solo lectura del modelo y la página estática.

## Frontend

| Control | Dónde |
|---|---|
| Sin secretos en el código; `.env` ignorado por Git; única variable pública `VITE_API_BASE_URL`, validada al arrancar y obligatoriamente HTTPS en producción | `frontend/.env.example`, `frontend/.gitignore`, `frontend/src/config/env.ts` |
| Cliente HTTP único: solo rutas del origen configurado, sin cookies, sin redirecciones, tiempo máximo de 10 s, errores genéricos | `frontend/src/services/apiClient.ts`, `ApiError.ts` |
| Validación de toda respuesta de la API con zod | `frontend/src/types/domain.ts` |
| Búsqueda normalizada y limitada a 40 caracteres | `frontend/src/utils/format.ts` |
| Sin `dangerouslySetInnerHTML`; React escapa todo el texto | todo `frontend/src/` |
| CSP y cabeceras (`nosniff`, `frame-ancestors none`, HSTS, Referrer-Policy, Permissions-Policy) | `frontend/vite.config.ts`, `frontend/public/_headers` |
| Sin recursos de terceros: banderas, iconos y fuentes servidos desde el propio sitio | `frontend/src/components/Flag.tsx` |
| Dependencias con versión fija | `frontend/package.json`, `backend/requirements.txt` |

## Backend (EC2)

| Control | Dónde |
|---|---|
| CORS limitado a los dominios de `ALLOWED_ORIGINS`, solo `GET`/`POST` | `backend/app/main.py`, `backend/.env` |
| Validación de entrada (solo las 48 selecciones, formato `^[a-z-]{2,30}$`, equipos distintos) | `PredictIn` en `backend/app/main.py` |
| Errores 500 genéricos, sin trazas; Swagger desactivado en producción | `main.py`, `ENABLE_DOCS` |
| uvicorn solo en `127.0.0.1`; Nginx como única entrada, con HTTPS (certbot) | `backend/deploy/bet-ips-api.service`, `backend/deploy/nginx-bet-ips.conf` |
| Límite de 10 peticiones/s por IP, cuerpo máximo 4 KB, `server_tokens off`, rutas fuera de `/api/` → 404 | `backend/deploy/nginx-bet-ips.conf` |
| Servicio sin privilegios (`NoNewPrivileges`, `ProtectSystem`) | `backend/deploy/bet-ips-api.service` |
| Security Group: 22 solo desde tu IP; 80 y 443 abiertos; 8000 cerrado | `docs/BACKEND.md` |
| El modelo (`model.joblib`) se genera en el propio servidor y `artifacts/` no se sube a git; nunca cargar uno de terceros (pickle) | `backend/training/train.py`, `backend/.gitignore` |

## Pendiente

- Monitoreo y alertas (por ejemplo CloudWatch) sobre los logs de `journalctl` y Nginx.
- Revisión periódica de dependencias: `npm run audit:deps` y `pip-audit` en el backend.
- Copias de seguridad de `backend/artifacts/` en el EC2 antes de reentrenar.
