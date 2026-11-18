# Backend · API del modelo de pronóstico

API en **Python + FastAPI** que sirve el modelo final del equipo de ML (**KNN**, notebook `Prediccion_WC2026.ipynb`) y responde las probabilidades de **gana / empata / pierde** entre dos selecciones del Mundial 2026. Corre en una instancia **AWS EC2** detrás de **Nginx** con HTTPS.

```
Bet-IPS/                      (raíz del repositorio)
├─ Prediccion_WC2026.ipynb    Notebook del modelo (equipo de ML)
├─ Models/                    Notebooks de los 6 algoritmos comparados
├─ Data/                      Datos de entrenamiento: results.csv + ranking FIFA
└─ backend/
   ├─ app/
   │  ├─ main.py         Rutas de la API, CORS, cabeceras y manejo de errores
   │  ├─ config.py       Variables de entorno (ALLOWED_ORIGINS, ENABLE_DOCS, ARTIFACTS_DIR)
   │  ├─ teams.py        Las 48 selecciones (id, nombre en español, bandera, confederación, anfitrión)
   │  ├─ features.py     Las 8 variables del modelo (compartidas por entrenamiento e inferencia)
   │  └─ predictor.py    Carga los artefactos y calcula la predicción
   ├─ training/
   │  └─ train.py        Reproduce el notebook: lee Data/, entrena, evalúa y guarda los artefactos
   ├─ artifacts/         model.joblib · team_state.json · metrics.json (se generan, no se suben a git)
   ├─ deploy/            setup-ec2.sh · bet-ips-api.service (systemd) · nginx-bet-ips.conf
   ├─ tests/test_api.py  Pruebas de la API (pytest)
   ├─ requirements.txt   Dependencias con versión fija
   ├─ requirements-dev.txt  pytest, httpx y ruff (solo desarrollo)
   ├─ pyproject.toml     Reglas de calidad de ruff
   └─ .env.example       Plantilla de configuración
```

---

## 1. Cómo llega el modelo del notebook al backend

El notebook se ejecuta en Google Colab y no exporta ningún archivo del modelo. Para poder servirlo desde el EC2, `training/train.py` **reproduce el notebook paso a paso** con los mismos datos y los mismos parámetros, y guarda el resultado en `artifacts/`:

| Notebook (`Prediccion_WC2026.ipynb`) | Backend |
|---|---|
| 2 · Carga de `results.csv` y del ranking FIFA (`files.upload()`) | `train.py` lee la carpeta `Data/` del repositorio |
| 4 · Limpieza (quitar partidos sin marcador) | `train.py` → `main()` |
| 7 · Ranking FIFA (`EQUIV`, `ranking()`) | `train.py` → `EQUIV`, `FifaRanking` |
| 8 · Forma reciente, `N = 5` | `train.py` → `team_rows()` · `features.py` → `FORM_N` |
| 9 · Dataset de modelado (8 variables) | `train.py` → `build_dataset()` · `features.py` → `FEATURES`, `build_row()` |
| 10 · Split: entrena hasta 2026-06-27, prueba con los playoffs | `train.py` → `FIN_GRUPOS`, `INICIO_PLAYOFFS` |
| 10 · `StandardScaler` | `train.py` → `new_model()` |
| 12.4 · `KNeighborsClassifier(n_neighbors=15)` | `train.py` → `new_model()` |

**Comprobación:** al entrenar, el script imprime el resultado sobre los 32 partidos de playoffs del Mundial 2026. Debe coincidir con el notebook: **23/32 aciertos, accuracy 0,719, F1 macro 0,628**. Si no coincide, el backend no está sirviendo el mismo modelo.

Hay dos diferencias, ambas intencionales:
1. **Modelo final:** el notebook entrena hasta la fase de grupos solo para evaluar. Para producción se reentrena con **todo** el histórico, con los mismos hiperparámetros, para usar también los partidos más recientes.
2. **Nombres en el ranking FIFA:** en las fotos JSON de 2022, 2023 y 2026 la FIFA usa `Czechia`, `Türkiye` y `Cabo Verde`. `EQUIV` no tiene esos nombres, así que el notebook les asignaba a esas tres selecciones su ranking de junio de 2018. `train.py` añade `EQUIV_JSON` para leer su ranking actual. Las métricas de evaluación no cambian.

### 1.1 Si el equipo de ML cambia el modelo

| Cambio en el notebook | Qué editar en el backend |
|---|---|
| Otro algoritmo o hiperparámetros (p. ej. `n_neighbors`) | `new_model()` en `training/train.py` y el texto `algorithm` de `metrics.json` en el mismo archivo |
| Otra ventana de forma (`N`) | `FORM_N` en `app/features.py` |
| Nuevas variables o variables distintas | `FEATURES` y `build_row()` en `app/features.py`, `build_dataset()` en `training/train.py` y lo que guarda `team_state.json` |
| Datos nuevos (un `results.csv` más reciente o un ranking nuevo) | Solo reemplazar los archivos en `Data/` y reentrenar. Si es un JSON de un año nuevo, añadir el año a `ANIOS_JSON` |
| Otra división de prueba | `FIN_GRUPOS` / `INICIO_PLAYOFFS` en `training/train.py` |

Después de cualquier cambio: reentrenar, comprobar que las métricas coinciden con el notebook, correr las pruebas y reiniciar el servicio (ver 4.4).

---

## 2. Flujo completo

```
           ENTRENAMIENTO (en el EC2, al instalar o cuando cambien los datos)
 ┌──────────────────────────────────────────────────────────────────────┐
 │ Data/results.csv (≈50.000 partidos desde 1872)                       │
 │ Data/fifa_ranking 1993-2018.csv + rankingFifa{2018..2026}.json       │
 │        │                                                             │
 │        ▼  train.py                                                   │
 │  Ranking FIFA vigente + forma de los últimos 5 partidos (8 variables)│
 │        │                                                             │
 │        ▼                                                             │
 │  Entrena hasta 2026-06-27 → evalúa con los playoffs del Mundial 2026 │
 │        │            (accuracy, precision, recall, F1 macro)          │
 │        ▼                                                             │
 │  Reentrena con todo y guarda artifacts/                              │
 └──────────────────────────────────────────────────────────────────────┘

           INFERENCIA (cada vez que alguien elige un VS en la web)
 Navegador ──POST /api/predict──▶ Nginx (443) ──▶ uvicorn (127.0.0.1:8000)
                                                       │
                                     main.py valida ids (pydantic)
                                                       │
                              predictor.py arma las 8 variables con el
                              ranking y la forma de team_state.json
                                                       │
                              model.joblib → [gana, empate, pierde]
                                                       │
 Navegador ◀────────────── JSON con las 3 probabilidades ◀──┘
```

### 2.1 Variables del modelo (`app/features.py`)

Cada partido se describe desde la perspectiva del **local**:

| Variable | Qué es |
|---|---|
| `rank_local`, `rank_visita` | Posición en el ranking FIFA vigente antes del partido. |
| `dif_rank` | `rank_visita − rank_local` (positivo = el local tiene mejor ranking). |
| `dif_pts` | Puntos FIFA del local − puntos FIFA del visitante. |
| `forma_local`, `forma_visita` | Promedio de puntos (3 victoria, 1 empate, 0 derrota) en los últimos 5 partidos. |
| `dif_forma` | `forma_local − forma_visita`. |
| `neutral` | 1 si el partido es en campo neutral, 0 si el local juega en casa. |

Todas se calculan **solo con información anterior al partido**, para que el modelo no "vea el futuro".

### 2.2 El modelo

- Algoritmo: `StandardScaler` + `KNeighborsClassifier(n_neighbors=15)` (scikit-learn). Tres clases: `0` gana local, `1` empate, `2` gana visitante.
- KNN busca los 15 partidos históricos más parecidos y la probabilidad de cada resultado es la proporción de esos 15 vecinos que terminó así. Por eso las probabilidades salen en saltos de 1/15 (en campo neutral, de 1/30, porque se promedian dos cálculos) y pueden llegar a 0 %.
- Resultado actual con los playoffs del Mundial 2026: **23 de 32 aciertos (71,9 %)**, F1 macro 0,628, precision 0,822, recall 0,597. Como referencia, elegir siempre el resultado más común acierta 50 %.

### 2.3 Cómo se calcula un VS (`app/predictor.py`)

1. Se toman el ranking FIFA, los puntos y los últimos 5 resultados de cada selección desde `team_state.json`.
2. **Localía en el Mundial:** si juega un anfitrión (Canadá, México o Estados Unidos) contra alguien que no lo es, el anfitrión cuenta como local (`neutral = 0`). En los demás casos el campo es neutral (`neutral = 1`).
3. **Campo neutral:** se calcula A-vs-B y B-vs-A y se promedian, para que el orden en que el usuario elige los equipos no cambie el resultado.
4. Se normaliza para que las tres probabilidades sumen 1.

---

## 3. Endpoints

Base: `https://api.tu-dominio.com` (en local, `http://localhost:8000`).

### `GET /api/health`
```json
{ "status": "ok", "model_version": "2026.11.13-0319" }
```

### `GET /api/teams`
Las 48 selecciones con sus datos actuales.
```json
[
  { "id": "argentina", "name": "Argentina", "flag": "ar", "confederation": "CONMEBOL", "host": false,
    "fifa_rank": 1, "fifa_points": 1877.3, "form": ["D","V","V","V","V"], "form_points": 2.4 }
]
```

### `GET /api/model`
Versión, algoritmo, variables, fecha de entrenamiento, fecha del último partido usado y métricas (accuracy, precision, recall, F1 macro, aciertos y partidos de prueba).

### `POST /api/predict`
Petición:
```json
{ "team_a": "argentina", "team_b": "brasil" }
```
Respuesta:
```json
{
  "team_a": "argentina",
  "team_b": "brasil",
  "probabilities": { "win": 0.4, "draw": 0.3333, "loss": 0.2667 },
  "venue": "neutral",
  "model_version": "2026.11.13-0319"
}
```
`win` = gana el equipo A, `draw` = empate, `loss` = gana el equipo B. `venue` puede ser `neutral`, `local` (A es anfitrión) o `visitante` (B es anfitrión).

Errores: `422` si un id no es de las 48 selecciones, si los dos equipos son iguales o si el formato no es válido. `500` con un mensaje genérico ante cualquier error interno (nunca se devuelven trazas).

Documentación interactiva (Swagger) en `/api/docs` solo si `ENABLE_DOCS=true`.

---

## 4. Ejecutar en local

Requiere Python 3.10 o superior y la carpeta `Data/` en la raíz del repositorio.

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate      Linux/Mac:  source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                 # Linux/Mac: cp .env.example .env

python -m training.train               # lee ../Data y entrena (≈10 s)
uvicorn app.main:app --reload --port 8000
```

Si los datos están en otra carpeta: `python -m training.train --data-dir ruta/a/Data`.

Comprobar: abrir `http://localhost:8000/api/health`.

Herramientas de desarrollo (pruebas y linter): `pip install -r requirements-dev.txt`.

Pruebas: `python -m pytest -q`.

---

## 5. Desplegar en AWS EC2

### 5.1 Crear la instancia
1. AMI **Ubuntu Server 24.04 LTS**, tipo `t3.small` (o `t3.micro` de capa gratuita; el modelo es liviano).
2. **Security Group** (reglas de entrada):
   | Puerto | Origen | Para qué |
   |---|---|---|
   | 22 (SSH) | Solo tu IP | Administrar el servidor |
   | 80 (HTTP) | 0.0.0.0/0 | Certbot y redirección a HTTPS |
   | 443 (HTTPS) | 0.0.0.0/0 | La API |

   **No** abrir el puerto 8000: uvicorn solo escucha en `127.0.0.1` y Nginx es el único que llega a él.
3. Asignar una **Elastic IP** para que la IP pública no cambie al reiniciar.
4. (Recomendado) Crear un registro DNS `api.tu-dominio.com` que apunte a esa IP.

### 5.2 Instalar
```bash
ssh -i tu-llave.pem ubuntu@IP_DEL_EC2
sudo mkdir -p /opt/bet-ips && sudo chown ubuntu:ubuntu /opt/bet-ips
git clone https://github.com/StrayJF3/Bet-IPS.git /opt/bet-ips
sudo bash /opt/bet-ips/backend/deploy/setup-ec2.sh
```
El script instala Python y Nginx, crea el entorno virtual, **entrena el modelo en el EC2** con `/opt/bet-ips/Data`, registra el servicio `bet-ips-api` en systemd y configura Nginx.

### 5.3 Configurar
1. Editar `/opt/bet-ips/backend/.env` y poner en `ALLOWED_ORIGINS` el dominio donde estará el frontend (ver [CONFIGURAR-API.md](./CONFIGURAR-API.md)).
2. Editar `/etc/nginx/sites-available/bet-ips` y cambiar `api.tu-dominio.com` por tu dominio.
3. Activar HTTPS: `sudo certbot --nginx -d api.tu-dominio.com`
4. Aplicar: `sudo systemctl restart bet-ips-api && sudo systemctl reload nginx`
5. Probar desde tu PC: `curl https://api.tu-dominio.com/api/health`

### 5.4 Operación diaria
| Tarea | Comando |
|---|---|
| Ver estado | `sudo systemctl status bet-ips-api` |
| Ver logs | `journalctl -u bet-ips-api -f` |
| Reiniciar | `sudo systemctl restart bet-ips-api` |
| Actualizar código | `cd /opt/bet-ips && git pull && sudo systemctl restart bet-ips-api` |
| Reentrenar (datos o modelo nuevos) | `cd /opt/bet-ips && git pull && cd backend && .venv/bin/python -m training.train && sudo systemctl restart bet-ips-api` |

Al reentrenar con un `Data/results.csv` más reciente, el ranking y la forma de cada selección se actualizan con los últimos partidos jugados.

---

## 6. Convenciones de código (clean code)

Antes de subir cambios: `ruff check .`, `ruff format --check .` y `python -m pytest -q` deben pasar.

- **Funciones cortas y con una sola tarea**: p. ej. `train.py` se divide en `load_results`, `build_dataset`, `evaluate`, `current_team_state` y `main`. Ruff avisa si la complejidad pasa de 10 (`pyproject.toml`).
- **Sin números mágicos**: constantes con nombre (`K_NEIGHBORS`, `FORM_N`, `FIN_GRUPOS`, `CLASSES`).
- **Una sola fuente de verdad**: las variables del modelo viven en `app/features.py` y las 48 selecciones en `app/teams.py`.
- **Nombres**: inglés para el código de la API; en `training/train.py` se conservan los nombres del notebook (`largo`, `forma`, `objetivo`) para que sea fácil compararlo con él.
- **Errores explícitos**: `raise ... from err`, `zip(..., strict=True)` y mensajes claros cuando faltan datos.
- **Formato automático** con `ruff format` (120 columnas).

## 7. Seguridad del backend

- **CORS** restringido a los dominios de `ALLOWED_ORIGINS`; solo métodos `GET` y `POST`.
- **Validación** de entrada con pydantic: los ids deben ser de las 48 selecciones y con formato `^[a-z-]{2,30}$`.
- **Errores genéricos**: nunca se exponen trazas ni rutas internas.
- **Nginx**: límite de 10 peticiones/s por IP (ráfaga de 20), cuerpo máximo de 4 KB, `server_tokens off`, timeout de 15 s y cualquier ruta fuera de `/api/` devuelve 404.
- **systemd**: el proceso corre como usuario sin privilegios, con `NoNewPrivileges` y `ProtectSystem`.
- **Swagger desactivado** en producción (`ENABLE_DOCS=false`).
- `model.joblib` se carga con joblib (pickle): solo debe cargarse un archivo generado por `train.py` en el propio servidor, nunca uno descargado de terceros. Por eso `artifacts/` no se sube al repositorio.
