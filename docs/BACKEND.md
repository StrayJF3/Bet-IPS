# Backend · API del modelo de pronóstico

API en **Python + FastAPI** que sirve el modelo final del equipo de ML (**KNN**, notebook `Prediccion_WC2026.ipynb`) y responde las probabilidades de **gana / empata / pierde** entre dos selecciones del Mundial 2026. Corre en una instancia **AWS EC2** y carga el modelo desde **Amazon S3**.

```
Bet-IPS/                      (raíz del repositorio)
├─ Prediccion_WC2026.ipynb    Notebook del modelo (entrena y EXPORTA los artefactos)
├─ Models/                    Notebooks de los 6 algoritmos comparados (Avance II)
├─ Data/                      Datos: results.csv + ranking FIFA
└─ backend/
   ├─ app/
   │  ├─ main.py         Rutas de la API, CORS, cabeceras y manejo de errores
   │  ├─ config.py       Variables de entorno (ALLOWED_ORIGINS, ARTIFACTS_DIR, S3_*)
   │  ├─ teams.py        Las 48 selecciones (id, nombre, bandera, confederación, anfitrión)
   │  ├─ features.py     Las 8 variables del modelo
   │  ├─ storage.py      Descarga los artefactos desde S3 (o los lee de local)
   │  └─ predictor.py    Carga los artefactos y calcula la predicción
   ├─ artifacts/         model.joblib · team_state.json · metrics.json (NO se suben a git)
   ├─ requirements.txt   Dependencias con versión fija (incluye boto3)
   └─ .env.example       Plantilla de configuración
```

---

## 1. De dónde sale el modelo (flujo del Avance III)

El modelo **se entrena en el notebook** (`Prediccion_WC2026.ipynb`, sección 14) y se exporta a tres archivos. Esos archivos se suben a **Amazon S3**, y la API en EC2 los **descarga al arrancar**. El servidor **no entrena nada**.

```
  1) NOTEBOOK (Colab)                 2) TÚ, una vez           3) EC2 (automático)
  entrena KNN con todo el    ──►   subes los 3 archivos   ──►  la API descarga de S3
  histórico y exporta:             a un bucket de S3           al arrancar (rol IAM)
    model.joblib                                               y queda listo en memoria
    team_state.json                                            → predicciones instantáneas
    metrics.json
```

Los tres artefactos:

| Archivo | Contenido |
|---------|-----------|
| `model.joblib` | Pipeline entrenado: `StandardScaler` + `KNeighborsClassifier(n_neighbors=15)` |
| `team_state.json` | Las 48 selecciones con su ranking FIFA, puntos y últimos 5 partidos |
| `metrics.json` | Versión, algoritmo, variables, métricas de evaluación y metadatos |

**Comprobación de coherencia:** las métricas en `metrics.json` deben coincidir con el notebook: **23/32 aciertos, accuracy 0,719, F1 macro 0,628** sobre los playoffs del Mundial 2026. El test `test_model_is_knn_with_notebook_metrics` lo verifica.

> El modelo de producción se reentrena con **todo** el histórico (el notebook, sección 14.2), mientras que las métricas se miden con la evaluación honesta (entrenar hasta fase de grupos, medir en playoffs).

### 1.1 Si el equipo de ML cambia el modelo

Como el formato de los artefactos es fijo, casi nada cambia en el backend. Según el cambio:

| Cambio en el notebook | Qué editar en el backend |
|---|---|
| Otras variables o distinto orden | `FEATURES` y `build_row()` en `app/features.py` |
| Otra ventana de forma (`N`) | `FORM_N` en `app/features.py` |
| Otro algoritmo (deja de dar `predict_proba`) | `predictor.py` (cómo obtiene las probabilidades) |

Mientras el modelo siga siendo un clasificador con `predict_proba`, las 8 variables y las 48 selecciones con el mismo formato, el backend funciona sin tocarse: solo hay que volver a exportar y subir a S3.

---

## 2. Las 8 variables del modelo (`app/features.py`)

Cada partido se describe desde la perspectiva del **local**:

| Variable | Qué es |
|---|---|
| `rank_local`, `rank_visita` | Posición en el ranking FIFA vigente antes del partido. |
| `dif_rank` | `rank_visita − rank_local` (positivo = el local tiene mejor ranking). |
| `dif_pts` | Puntos FIFA del local − puntos FIFA del visitante. |
| `forma_local`, `forma_visita` | Promedio de puntos (3 victoria, 1 empate, 0 derrota) en los últimos 5 partidos. |
| `dif_forma` | `forma_local − forma_visita`. |
| `neutral` | 1 si el partido es en campo neutral, 0 si el local juega en casa. |

### 2.1 El modelo

- `StandardScaler` + `KNeighborsClassifier(n_neighbors=15)`. Tres clases: `0` gana local, `1` empate, `2` gana visitante.
- KNN busca los 15 partidos históricos más parecidos; la probabilidad de cada resultado es la proporción de esos vecinos que terminó así.
- Resultado sobre los playoffs del Mundial 2026: **23 de 32 aciertos (71,9 %)**, F1 macro 0,628.

### 2.2 Cómo se calcula un VS (`app/predictor.py`)

1. Toma ranking FIFA, puntos y últimos 5 resultados de cada selección desde `team_state.json`.
2. **Localía en el Mundial:** si un anfitrión (Canadá, México o EE. UU.) juega contra alguien que no lo es, el anfitrión cuenta como local (`neutral = 0`). En los demás casos, campo neutral (`neutral = 1`).
3. **Campo neutral:** se calcula A-vs-B y B-vs-A y se promedian, para que el orden en que el usuario elige no cambie el resultado.
4. Se normaliza para que las tres probabilidades sumen 1.

---

## 3. Endpoints

Base: `http://IP_DEL_EC2:8000` (o detrás de un proxy, según tu configuración).

### `GET /api/health`
```json
{ "status": "ok", "model_version": "2026.11.13-0319" }
```

### `GET /api/teams`
Las 48 selecciones con sus datos actuales (ranking, puntos, forma).

### `GET /api/model`
Versión, algoritmo, variables, fecha de entrenamiento y métricas.

### `POST /api/predict`
Petición: `{ "team_a": "argentina", "team_b": "brasil" }`

Respuesta:
```json
{
  "team_a": "argentina", "team_b": "brasil",
  "probabilities": { "win": 0.4, "draw": 0.3333, "loss": 0.2667 },
  "venue": "neutral", "model_version": "2026.11.13-0319"
}
```
`win` = gana A, `draw` = empate, `loss` = gana B. Errores `422` si un id no es válido o los equipos son iguales; `500` genérico ante errores internos.

---

## 4. Ejecutar en local (sin S3)

Para desarrollo, el backend lee los artefactos de la carpeta `artifacts/` local (si `S3_BUCKET` está vacío).

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate      Linux/Mac:  source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                 # Linux/Mac: cp .env.example .env
# Coloca model.joblib, team_state.json y metrics.json en backend/artifacts/
# (descargados del notebook, sección 14).
uvicorn app.main:app --reload --port 8000
```
Comprobar: `http://localhost:8000/api/health`.

---

## 5. Desplegar en AWS (S3 + EC2 + IAM)

### 5.1 Subir el modelo a S3
1. Crea un bucket, p. ej. `bet-ips-modelo` (bloqueo de acceso público activado; el EC2 entra por IAM).
2. Sube los tres artefactos generados por el notebook: `model.joblib`, `team_state.json`, `metrics.json`.

### 5.2 Rol IAM para el EC2
1. **IAM → Roles → Create role → AWS service → EC2.**
2. Permiso de lectura al bucket (política `AmazonS3ReadOnlyAccess`, o una restringida solo a tu bucket).
3. Nombre, p. ej. `EC2-LeerModeloS3`.

### 5.3 Lanzar el EC2
1. AMI **Ubuntu 24.04**, tipo `t3.micro` (capa gratuita; el modelo es liviano).
2. **IAM instance profile:** asignar el rol `EC2-LeerModeloS3` (así la API lee S3 sin credenciales en el código).
3. **Security Group:** puerto 22 (SSH, solo tu IP) y puerto 8000 (la app, `0.0.0.0/0`).

### 5.4 Instalar y correr la app
```bash
ssh -i tu-llave.pem ubuntu@IP_DEL_EC2
sudo apt update && sudo apt install -y python3 python3-venv python3-pip
git clone https://github.com/StrayJF3/Bet-IPS.git /opt/bet-ips
cd /opt/bet-ips/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edita .env: pon S3_BUCKET, S3_PREFIX y AWS_REGION, y tu dominio/IP en ALLOWED_ORIGINS
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 &
```
Comprobar desde tu PC: `http://IP_DEL_EC2:8000/api/health`.

> La API descarga los artefactos de S3 **una sola vez al arrancar** (ver `app/storage.py`), usando el rol IAM. Cada predicción posterior trabaja en memoria y es inmediata.

### 5.5 Al terminar
**Detener la instancia EC2** (Stop) para no generar costos.

---

## 6. Configuración (`.env`)

| Variable | Para qué |
|---|---|
| `ALLOWED_ORIGINS` | Dominios del frontend que pueden llamar a la API (CORS). |
| `ENABLE_DOCS` | Mostrar Swagger en `/api/docs` (false en producción). |
| `S3_BUCKET` | Bucket con los artefactos. Vacío = usar `artifacts/` local. |
| `S3_PREFIX` | Subcarpeta dentro del bucket (opcional). |
| `AWS_REGION` | Región del bucket (ej. `us-east-1`). |

Las credenciales de AWS **nunca** van en `.env` ni en el código: las aporta el rol IAM del EC2.

---

## 7. Seguridad

- **CORS** restringido a `ALLOWED_ORIGINS`; solo `GET` y `POST`.
- **Validación** de entrada con pydantic: los ids deben ser de las 48 selecciones (`^[a-z-]{2,30}$`).
- **Errores genéricos**: nunca se exponen trazas ni rutas internas.
- **IAM**: el EC2 lee S3 con un rol, sin claves en el código.
- **Swagger desactivado** en producción (`ENABLE_DOCS=false`).
- `model.joblib` se carga con joblib (pickle): solo debe cargarse un artefacto generado por el notebook del equipo, nunca uno de terceros. Por eso `artifacts/` no se sube al repositorio.
