# Dónde y cómo cambiar el enlace de la API

La URL de la API del modelo (el EC2) se configura en **un solo lugar** del frontend: la variable `VITE_API_BASE_URL`. Ningún componente tiene la URL escrita a mano.

## Resumen rápido

| Qué quieres hacer | Archivo | Qué cambiar |
|---|---|---|
| Apuntar el frontend a otra API | `frontend/.env` | `VITE_API_BASE_URL=...` |
| Permitir que un dominio de frontend use la API | `backend/.env` (en el EC2) | `ALLOWED_ORIGINS=...` |
| Cambiar el dominio que atiende Nginx | `/etc/nginx/sites-available/bet-ips` (en el EC2) | `server_name ...` |
| Cambiar las rutas (`/api/predict`, etc.) | `frontend/src/services/forecastService.ts` y `backend/app/main.py` | Deben coincidir en ambos |

---

## 1. Frontend: `VITE_API_BASE_URL`

Archivo: **`frontend/.env`** (al lado de `frontend/package.json`). Si no existe, copiarlo de `.env.example`.

```ini
# Desarrollo en tu PC (backend corriendo en local)
VITE_API_BASE_URL=http://localhost:8000

# Producción (API en el EC2 con dominio y HTTPS)
VITE_API_BASE_URL=https://api.tu-dominio.com
```

Reglas:
- **Sin** `/` al final y **sin** `/api`: el código agrega `/api/teams`, `/api/predict`, etc.
- En producción **debe ser `https://`**. Si se compila con `http://`, la página se detiene al cargar con el error "En produccion la API del modelo debe usarse por HTTPS". Además, un sitio HTTPS no puede llamar a una API HTTP (el navegador lo bloquea).
- Después de cambiarla hay que **reiniciar** `npm run dev`, o **volver a compilar** con `npm run build`: Vite escribe el valor dentro del JavaScript al compilar, no se lee en tiempo de ejecución.

Opcional: tener dos archivos y que Vite elija solo.
- `.env.development` → lo usa `npm run dev`
- `.env.production` → lo usa `npm run build`

Ambos están en `.gitignore`; el único que se sube al repositorio es `.env.example`.

### ¿Cómo viaja el valor por el código?

```
frontend/.env ──▶ src/config/env.ts         (lo lee de import.meta.env y lo valida con zod)
              │  env.API_BASE_URL
              ▼
        src/services/apiClient.ts      (new URL(path, env.API_BASE_URL) y fetch)
              ▲
        src/services/forecastService.ts (rutas: /api/teams, /api/model, /api/predict)
```

`frontend/src/config/env.ts` es el único archivo que conoce la variable; si hay que agregar otra configuración, se agrega ahí.

---

## 2. Backend: permitir el dominio del frontend (CORS)

La API solo responde a los navegadores que vienen de los dominios listados. En el EC2, archivo **`/opt/bet-ips/backend/.env`**:

```ini
ALLOWED_ORIGINS=http://localhost:5173,https://bet-ips.tu-dominio.com
```

- Separados por coma, con `https://` y **sin** `/` final.
- Debe ser exactamente el origen que aparece en la barra del navegador donde está publicado el frontend.
- Aplicar el cambio: `sudo systemctl restart bet-ips-api`

Si la página muestra "No se pudo conectar con el modelo" y en la consola del navegador aparece un error de **CORS**, casi siempre falta el dominio aquí.

---

## 3. Si todavía no tienes dominio

Mientras pruebas puedes usar la IP pública del EC2 (mejor una Elastic IP):

1. En Nginx (`/etc/nginx/sites-available/bet-ips`): `server_name 3.85.10.20;` (tu IP) y `sudo systemctl reload nginx`.
2. En `frontend/.env`: `VITE_API_BASE_URL=http://3.85.10.20` y usar **`npm run dev`** (en modo desarrollo se permite `http`).
3. En `backend/.env`: `ALLOWED_ORIGINS=http://localhost:5173`.

Para producción necesitas un dominio con certificado (Let's Encrypt no emite certificados para IPs): `sudo certbot --nginx -d api.tu-dominio.com` y luego cambiar el `.env` a `https://api.tu-dominio.com`.

---

## 4. Comprobar que quedó bien

1. `curl https://api.tu-dominio.com/api/health` debe responder `{"status":"ok", ...}`.
2. En la página, arriba a la derecha, el punto debe estar **verde** con "Modelo en línea".
3. Al elegir dos selecciones debe aparecer el diagrama de barras.

| Síntoma | Causa probable |
|---|---|
| La página no carga y en consola dice "Falta VITE_API_BASE_URL" | No existe `.env` o la URL está mal escrita |
| "debe usarse por HTTPS" | Compilaste para producción con una URL `http://` |
| Punto rojo "Sin conexión" | La API está apagada, el Security Group no abre 443/80 o la URL es incorrecta |
| Error de CORS en la consola | El dominio del frontend no está en `ALLOWED_ORIGINS` |
| "La API respondió con datos inesperados" | El backend y el frontend tienen versiones distintas de las rutas o respuestas |
