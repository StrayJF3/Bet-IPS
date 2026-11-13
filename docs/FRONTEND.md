# Frontend · Página de pronósticos

Página única en **React 18 + TypeScript + Vite + Tailwind CSS**. No tiene login: al entrar se ve directamente la página con la sección **Pronóstico**. Todos los datos vienen de la API del modelo (EC2); no hay datos de prueba en el código.

```
frontend/src/
├─ main.tsx                    Punto de entrada (tema guardado + ErrorBoundary + App)
├─ App.tsx                     Arma la página: fondo, header, secciones y footer
├─ config/
│  ├─ env.ts                   Lee y valida VITE_API_BASE_URL (la URL de la API)
│  └─ themes.ts                Temas de color y el que eligió el usuario
├─ services/
│  ├─ apiClient.ts             Único lugar que hace fetch a la API
│  ├─ ApiError.ts              Errores con mensajes genéricos en español
│  └─ forecastService.ts       Endpoints: teams, model, predict
├─ types/domain.ts             Esquemas zod de las respuestas (Team, Prediction, ModelInfo)
├─ hooks/
│  ├─ useAsync.ts              Carga cancelable con estados loading / success / error
│  ├─ usePrediction.ts         Pide el pronóstico cuando cambian los dos equipos
│  ├─ useListNavigation.ts     Flechas / Enter / Escape en listas desplegables
│  └─ useInView.ts             Detecta cuándo una sección entra en pantalla (animaciones al hacer scroll)
├─ components/
│  ├─ background/
│  │  ├─ BallNetwork.tsx       Fondo animado de balones (canvas, eventos del mouse/toque)
│  │  └─ ballPhysics.ts        Movimiento, patadas, rebotes y dibujo del balón (sin React)
│  ├─ forecast/
│  │  ├─ TeamPicker.tsx        Selector con búsqueda de las 48 selecciones
│  │  ├─ TeamOptions.tsx       Lista de opciones agrupada por confederación
│  │  ├─ TeamStats.tsx         Ranking FIFA y últimos 5 resultados
│  │  ├─ VsBadge.tsx           Insignia VS y botón de intercambiar
│  │  ├─ ForecastResult.tsx    Invitación, cargando, error o gráfico
│  │  └─ ProbabilityChart.tsx  Diagrama de barras gana / empata / pierde
│  ├─ team/
│  │  ├─ TeamSection.tsx       Sección "Equipo": foto y tarjetas de los integrantes
│  │  └─ TiltPhoto.tsx         Foto con zoom de entrada e inclinación 3D que sigue al cursor
│  ├─ ui/                      Piezas reutilizables: PillButton, RetryMessage, SectionHeader
│  ├─ Header.tsx               Logo, enlaces, estado en vivo de la API y selector de colores
│  ├─ Hero.tsx                 Portada
│  ├─ ForecastSection.tsx      Sección "Pronóstico" (une las piezas de forecast/)
│  ├─ ModelSection.tsx         Métricas reales del modelo y cómo funciona
│  ├─ Flag.tsx                 Banderas locales (paquete flag-icons)
│  ├─ Footer.tsx
│  └─ ErrorBoundary.tsx
├─ assets/equipo-bet-ips.jpg  Foto del equipo (Vite la optimiza con hash en el nombre)
├─ utils/                      format.ts y random.ts (+ pruebas)
└─ styles/global.css           Tailwind, variables de color de cada tema y estilos base
```

---

## 1. Flujo de la página

```
Carga de la página
  ├─ Header       → GET /api/health   → punto verde "Modelo en línea" / rojo "Sin conexión"
  ├─ Pronóstico   → GET /api/teams    → llena los dos selectores con las 48 selecciones
  └─ El modelo    → GET /api/model    → acierto en los playoffs, F1-Score, partidos de entrenamiento

El usuario elige Equipo A y Equipo B
  └─ usePrediction → POST /api/predict { team_a, team_b }
        ├─ mientras responde: se mantiene el gráfico anterior atenuado
        ├─ al responder: las barras crecen con animación
        └─ si falla: mensaje genérico + botón "Reintentar"
```

Cada respuesta pasa por un esquema **zod** (`frontend/src/types/domain.ts`). Si la API devuelve algo con otra forma, se rechaza y se muestra un error en lugar de pintar datos raros.

## 2. Sección Pronóstico

- **Selectores** (`TeamPicker`): lista agrupada por confederación, búsqueda sin tildes ("espana" encuentra España), navegación con ↑ ↓ Enter Esc. El equipo elegido en un lado queda deshabilitado en el otro.
- **VS**: insignia con degradado entre los colores de cada equipo, botón para intercambiar y "Sorpréndeme con un partido" para elegir dos al azar.
- **Debajo de cada equipo**: su posición en el ranking FIFA y sus últimos 5 resultados (V/E/D), los mismos datos que usa el modelo.
- **Diagrama de barras** (`ProbabilityChart`): tres barras con su porcentaje y su etiqueta en texto (el color nunca es la única pista). Al pasar el cursor por una barra aparece el valor con un decimal y las otras se atenúan. Hay una tabla oculta equivalente para lectores de pantalla.
- **Colores**: cian `#0ea5c6` = equipo A, gris `#64748b` = empate, ámbar `#f59e0b` = equipo B (azul/naranja se distinguen también con daltonismo). Se definen en `tailwind.config.js` (`teamA`, `draw`, `teamB`).

## 2.1 Sección Equipo

- Enlace "Equipo" en la barra superior (visible también en celular).
- Al llegar con el scroll, la foto aparece con un zoom suave y las tres tarjetas entran una tras otra (`useInView`).
- Con el mouse, la foto se inclina en 3D hacia donde apunta el cursor y muestra un reflejo de luz; las tarjetas se elevan al pasar por encima.
- Los nombres y roles están en `MEMBERS` dentro de `team/TeamSection.tsx`.

## 3. Fondo animado de balones (`background/`)

- Solo aparece en la sección de inicio (`Hero.tsx`): el canvas ocupa esa sección y no toda la página, así el resto queda limpio.
- Entre 10 y 34 balones (según el tamaño de pantalla) que flotan unidos por líneas tenues, como una red de pases.
- **Pasar el cursor** sobre un balón lo patea en la dirección y con la fuerza del movimiento; **un clic o un toque** patea hacia afuera los balones cercanos. Ruedan girando, se frenan poco a poco y rebotan en los bordes.
- El balón se dibuja una sola vez en un canvas pequeño (`createBallSprite`) y luego se reutiliza, para que la animación sea liviana.
- Se pausa con la pestaña oculta o cuando la sección de inicio sale de la pantalla y, si el sistema tiene activado "reducir movimiento", se dibuja una sola vez sin animación.

## 3.1 Temas de color

En la barra superior hay tres círculos para cambiar los colores de toda la página: **Clásico** (cian y ámbar), **Blanco y negro** (blanco, plomo y negro) y **Cancha** (verde y amarillo). La elección se guarda en el navegador.

- Los colores se definen como variables CSS en `src/styles/global.css` (`[data-theme=...]`) y Tailwind las usa (`tailwind.config.js`), así que `bg-teamA`, `bg-ink-900`, etc. cambian solos.
- Para agregar un tema: un bloque `[data-theme='nuevo']` en `global.css` y una entrada en `src/config/themes.ts`.

## 3.2 Diseño responsivo

- Celular (< 640 px): todo en una columna, selectores a lo ancho, gráfico de 224 px de alto y sin texto emergente al tocar las barras.
- Tablet (640–1023 px): selectores apilados con el VS entre ellos, gráfico más alto.
- Escritorio (≥ 1024 px): panel de hasta 1152 px de ancho con Equipo A · VS · Equipo B en una fila, banderas y textos más grandes y gráfico de 320 px.
- La página no tiene desplazamiento horizontal en ningún ancho (`overflow-x-hidden` en `body`).

## 4. Ejecutar

```bash
cd frontend
npm install
copy .env.example .env      # Linux/Mac: cp .env.example .env
npm run dev                 # http://localhost:5173
```
El backend debe estar encendido (ver [BACKEND.md](./BACKEND.md)); si no, la página muestra "Sin conexión" y los botones de reintentar.

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` para producción |
| `npm run preview` | Sirve `dist/` en local |
| `npm test` | Pruebas (vitest) |
| `npm run typecheck` | Revisión de tipos |
| `npm run lint` | Reglas de calidad (ESLint) |
| `npm run format` | Formatea el código (Prettier) |

## 5. Publicar el frontend

`npm run build` (dentro de `frontend/`) genera archivos estáticos en `frontend/dist/` que se pueden subir a S3 + CloudFront, Netlify, Cloudflare Pages o servir con Nginx en el mismo EC2. Antes de compilar, poner la URL HTTPS de la API en `frontend/.env` (ver [CONFIGURAR-API.md](./CONFIGURAR-API.md)) y agregar el dominio del frontend en `ALLOWED_ORIGINS` del backend.

## 6. Seguridad del frontend

- La única variable es `VITE_API_BASE_URL`, validada al arrancar; en producción debe ser `https`.
- `apiClient.ts` solo llama a rutas del origen configurado, sin cookies (`credentials: 'omit'`), sin seguir redirecciones y con 10 s de tiempo máximo.
- Respuestas validadas con zod; errores con mensajes genéricos.
- Sin `dangerouslySetInnerHTML`; la búsqueda se normaliza y se limita a 40 caracteres.
- CSP y cabeceras de seguridad en el build (`frontend/vite.config.ts`) y en `frontend/public/_headers`.
- Sin recursos de terceros: banderas, iconos y fuentes se sirven desde el propio sitio.

## 7. Convenciones de código (clean code)

Antes de subir cambios: `npm run lint`, `npm run format:check`, `npm test` y `npm run build` deben pasar sin errores ni avisos.

- **Una responsabilidad por archivo**: los componentes grandes se dividen (p. ej. `forecast/`); la lógica que no es de React va en funciones puras (`ballPhysics.ts`, `utils/`).
- **Funciones cortas**: ESLint avisa si una función pasa de 80 líneas o de complejidad 12 (`eslint.config.js`).
- **Sin duplicar**: lo que se repite va a `components/ui/` o a un hook.
- **Sin números mágicos**: valores fijos con nombre en mayúsculas (`DEFAULT_TIMEOUT_MS`, `MAX_QUERY_LENGTH`, `BAR_MAX_HEIGHT`).
- **Nombres claros** en inglés para el código; textos de la interfaz y documentación en español.
- **Sin código muerto**: TypeScript estricto y ESLint marcan variables y parámetros sin usar.
- **Formato automático** con Prettier (`.prettierrc.json`, 120 columnas, comillas simples).
