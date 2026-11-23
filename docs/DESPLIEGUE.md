# Guía de despliegue en AWS — Avance III (paso a paso)

Esta guía lleva el proyecto desde cero hasta la aplicación funcionando en AWS, lista para grabar el video. Sigue las fases **en orden**. Cada comando está pensado para copiar y pegar.

**Qué vas a montar:**

```
  Notebook (Colab)        Amazon S3              Amazon EC2 (Ubuntu)
  entrena KNN y      →   guarda los 3      →   la API (FastAPI) descarga el modelo
  exporta 3 archivos     artefactos            de S3 (rol IAM) y responde predicciones
                                               el frontend (React) consume esa API
```

**Los 3 artefactos del modelo** (los genera el notebook): `model.joblib`, `team_state.json`, `metrics.json`.

---

## Índice
- [Fase 1 — Generar el modelo en Google Colab](#fase-1)
- [Fase 2 — Crear el bucket S3 y subir el modelo](#fase-2)
- [Fase 3 — Crear el rol IAM](#fase-3)
- [Fase 4 — Lanzar la instancia EC2](#fase-4)
- [Fase 5 — Instalar y arrancar el backend en el EC2](#fase-5)
- [Fase 6 — Levantar el frontend](#fase-6)
- [Fase 7 — Probar todo junto](#fase-7)
- [Fase 8 — Grabar el video](#fase-8)
- [Fase 9 — Apagar el EC2](#fase-9)
- [Problemas frecuentes](#problemas)

---

<a name="fase-1"></a>
## FASE 1 — Generar el modelo en Google Colab

El modelo se entrena una sola vez, en Colab. Produce los 3 archivos que irán a S3.

1. Abre **Google Colab** (https://colab.research.google.com) y sube `Prediccion_WC2026.ipynb` (menú `Archivo → Subir cuaderno`).

2. Ejecuta las celdas en orden. En la **celda de carga** (`files.upload()`), sube los archivos de la carpeta `Data/` del repo:
   - `results.csv`
   - `fifa_ranking 1993-2018.csv`
   - `rankingFifa2018.json`, `rankingFifa2019.json`, `rankingFifa2022.json`, `rankingFifa2023.json`, `rankingFifa2026.json`

3. Sigue ejecutando hasta la **sección 14**. Ahí el notebook entrena el modelo final (con corte en el fin de la fase de grupos, 2026-06-27) y genera los 3 archivos. La **celda 14.3** los descarga a tu PC:
   - `model.joblib`
   - `team_state.json`
   - `metrics.json`

4. Revisa tu carpeta **Descargas**: deben estar los 3. Guárdalos juntos, los usarás en la Fase 2.

> Si falta alguno, vuelve a Colab y ejecuta otra vez la celda 14.3.

---

<a name="fase-2"></a>
## FASE 2 — Crear el bucket S3 y subir el modelo

1. Entra a la **consola de AWS** → busca **S3** → **Create bucket**.
2. Configura:
   - **Bucket name:** un nombre único en todo AWS, ej. `bet-ips-modelo-tunombre` (apúntalo, lo usarás después).
   - **AWS Region:** elige una y **apúntala**, ej. `us-east-1`. Debe ser la misma donde crearás el EC2.
   - **Block Public Access:** déjalo **activado** (todo bloqueado). El EC2 entra por rol IAM, no necesita que el bucket sea público.
3. Clic en **Create bucket**.
4. Entra al bucket → botón **Upload** → **Add files** → selecciona los 3 archivos (`model.joblib`, `team_state.json`, `metrics.json`) → **Upload**.
5. Verifica que los 3 aparezcan listados en el bucket.

> Si los subes a una subcarpeta (ej. `artifacts/`), apunta ese nombre: será tu `S3_PREFIX`. Si los subes a la raíz del bucket, el prefijo queda vacío.

---

<a name="fase-3"></a>
## FASE 3 — Crear el rol IAM (permiso de EC2 para leer S3)

Esto permite que el EC2 lea el modelo de S3 **sin poner claves en el código** (requisito del avance).

1. Consola AWS → **IAM** → **Roles** → **Create role**.
2. **Trusted entity type:** `AWS service`. **Use case:** `EC2`. Clic en **Next**.
3. En permisos, busca y marca **`AmazonS3ReadOnlyAccess`**. Clic en **Next**.
4. **Role name:** `EC2-LeerModeloS3`. Clic en **Create role**.

> `AmazonS3ReadOnlyAccess` da lectura a todo S3. Para más seguridad podrías crear una política restringida solo a tu bucket, pero para el avance esta basta.

---

<a name="fase-4"></a>
## FASE 4 — Lanzar la instancia EC2

1. Consola AWS → **EC2** → **Launch instance**.
2. Configura:
   - **Name:** `bet-ips-app`.
   - **AMI (sistema):** **Ubuntu Server 24.04 LTS**.
   - **Instance type:** `t3.micro` (capa gratuita; el modelo es liviano).
   - **Key pair:** clic en **Create new key pair** → nombre `bet-ips-key`, tipo RSA, formato `.pem` → **Create**. Se descarga `bet-ips-key.pem`: **guárdalo bien**, lo necesitas para conectarte.
3. **Network settings** → **Edit** → en **Firewall (security groups)**, crea reglas de entrada:
   | Type | Port | Source | Para qué |
   |------|------|--------|----------|
   | SSH | 22 | My IP | Conectarte al servidor |
   | Custom TCP | 8000 | Anywhere (0.0.0.0/0) | La API |
4. **Advanced details** → baja hasta **IAM instance profile** → selecciona **`EC2-LeerModeloS3`**.
   > ⚠️ Este paso es el que cumple el requisito de IAM. Si lo olvidas, el EC2 no podrá leer S3.
5. Clic en **Launch instance**.
6. Cuando esté lista (estado *Running*), entra a la instancia y **apunta su IPv4 pública** (ej. `3.85.10.20`). La usarás en los siguientes pasos como `TU_IP_EC2`.

> Opcional: asigna una **Elastic IP** (EC2 → Elastic IPs) para que la IP no cambie si reinicias.

---

<a name="fase-5"></a>
## FASE 5 — Instalar y arrancar el backend en el EC2

### 5.1 Conectarte por SSH

Abre una terminal **en tu PC**, en la carpeta donde está `bet-ips-key.pem`:

```bash
# (Solo Linux/Mac) dar permisos a la llave:
chmod 400 bet-ips-key.pem

# Conectarse (reemplaza TU_IP_EC2 por la IP pública del EC2):
ssh -i bet-ips-key.pem ubuntu@TU_IP_EC2
```
La primera vez pregunta si confías en el host: escribe `yes`.

### 5.2 Instalar dependencias del sistema

Ya **dentro del EC2** (el prompt cambia a `ubuntu@...`):

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git
```

### 5.3 Clonar el repositorio

```bash
sudo mkdir -p /opt/bet-ips
sudo chown ubuntu:ubuntu /opt/bet-ips
git clone https://github.com/StrayJF3/Bet-IPS.git /opt/bet-ips
cd /opt/bet-ips/backend
```

### 5.4 Crear el entorno e instalar las librerías

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 5.5 Configurar el `.env`

```bash
cp .env.example .env
nano .env
```
Edita los valores (reemplaza por los tuyos reales):
```ini
ALLOWED_ORIGINS=http://localhost:5173,http://TU_IP_EC2:5173
ENABLE_DOCS=false
S3_BUCKET=bet-ips-modelo-tunombre
S3_PREFIX=
AWS_REGION=us-east-1
```
Guarda en nano: `Ctrl+O` → `Enter` → `Ctrl+X`.

> Si subiste los artefactos a una subcarpeta del bucket, pon ese nombre en `S3_PREFIX` (ej. `artifacts`). Si los subiste a la raíz, déjalo vacío.

### 5.6 Arrancar la API

**Prueba rápida (para ver que levanta):**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Debe terminar en `Application startup complete`. Significa que descargó el modelo de S3 y está listo. Déjalo corriendo y pasa al paso 5.7 desde tu PC para comprobar. Para detenerlo: `Ctrl+C`.

**Dejarlo corriendo en segundo plano** (para que siga activo al cerrar SSH):
```bash
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /opt/bet-ips/backend/api.log 2>&1 &
```
Para ver los logs: `tail -f /opt/bet-ips/backend/api.log`
Para detenerlo luego: `pkill -f uvicorn`

### 5.7 Comprobar que la API responde

Desde el navegador **de tu PC**:
```
http://TU_IP_EC2:8000/api/health
```
Debe mostrar algo como: `{"status":"ok","model_version":"2026...."}`

Prueba también `http://TU_IP_EC2:8000/api/teams` → debe listar las 48 selecciones.

> Si `/api/health` no responde: revisa que el puerto 8000 esté abierto en el Security Group (Fase 4) y que uvicorn se haya arrancado con `--host 0.0.0.0` (no `127.0.0.1`).

---

<a name="fase-6"></a>
## FASE 6 — Levantar el frontend

El frontend es React. Para la demo lo corres **en tu PC** apuntando al EC2 (no hace falta hospedarlo en otro lado).

En tu PC necesitas **Node.js** instalado (https://nodejs.org, versión LTS).

```bash
cd frontend
```
Crea el archivo `.env` (copia la plantilla y edítalo):
```bash
cp .env.example .env
```
Dentro de `.env`, pon la IP del EC2:
```ini
VITE_API_BASE_URL=http://TU_IP_EC2:8000
```
Instala dependencias y arranca:
```bash
npm install
npm run dev
```
Te dará una URL, normalmente `http://localhost:5173`. Ábrela en el navegador.

> El `ALLOWED_ORIGINS` del backend (`.env` del EC2) debe incluir el origen desde donde abres el frontend. Si lo abres en `http://localhost:5173`, ese valor ya está puesto en la Fase 5.5.

---

<a name="fase-7"></a>
## FASE 7 — Probar todo junto

1. Con el backend corriendo en el EC2 y el frontend en `http://localhost:5173`:
2. Arriba debe indicar que el modelo está **en línea** (la página consulta `/api/health`).
3. Elige dos selecciones (Equipo A y Equipo B).
4. Deben aparecer las **probabilidades** (gana A / empate / gana B) en el gráfico de barras.

Si eso funciona, **la cadena completa está operativa**: el modelo vive en S3, el EC2 lo sirve, y el frontend lo consume.

---

<a name="fase-8"></a>
## FASE 8 — Grabar el video (máx 5 min)

Muestra, en este orden:
1. **El modelo en S3:** entra al bucket y enseña los 3 archivos.
2. **El EC2 corriendo:** la instancia en estado *Running* y, opcional, `http://TU_IP_EC2:8000/api/health` respondiendo.
3. **El rol IAM:** enseña que el EC2 tiene asignado `EC2-LeerModeloS3` (demuestra que no hay claves en el código).
4. **El formulario:** elige dos equipos en la web.
5. **La predicción:** las probabilidades en pantalla.
6. **Aporte de cada integrante:** unas frases por persona.

---

<a name="fase-9"></a>
## FASE 9 — Apagar el EC2 (importante)

Al terminar, para no generar costos:

1. Consola AWS → **EC2** → selecciona `bet-ips-app`.
2. **Instance state** → **Stop instance** (apaga, se puede volver a encender).
   - Si ya no lo usarás nunca: **Terminate instance** (lo elimina por completo).

> Detener el EC2 evita cobros por tiempo de cómputo. El bucket S3 con 3 archivos pequeños no genera costo relevante, pero puedes vaciarlo si quieres.

---

<a name="problemas"></a>
## Problemas frecuentes

| Síntoma | Causa y solución |
|---------|------------------|
| `No se encontraron los artefactos` al arrancar la API | El bucket/prefijo del `.env` está mal, o no subiste los 3 archivos a S3. Revisa Fase 2 y 5.5. |
| La API arranca pero `/api/health` no abre desde el navegador | Falta abrir el puerto 8000 en el Security Group (Fase 4), o arrancaste uvicorn sin `--host 0.0.0.0`. |
| `Access Denied` al leer S3 | El EC2 no tiene el rol IAM asignado (Fase 4.4), o el rol no tiene permiso de lectura S3 (Fase 3). |
| La web dice "Sin conexión" / error de CORS | El origen del frontend no está en `ALLOWED_ORIGINS` del `.env` del backend (Fase 5.5). |
| El frontend no arranca: "Falta VITE_API_BASE_URL" | No creaste `frontend/.env` o la URL está mal (Fase 6). |
| Aviso `InconsistentVersionWarning` de scikit-learn | El modelo se entrenó con una versión distinta a la del servidor. Regenera el modelo en Colab con `scikit-learn==1.7.2` (Fase 1, paso 2). |

---

## Resumen ultra-corto

```
1. Colab: !pip install scikit-learn==1.7.2 → correr notebook → bajar 3 archivos
2. S3:    crear bucket → subir los 3 archivos
3. IAM:   crear rol EC2-LeerModeloS3 (lectura S3)
4. EC2:   lanzar Ubuntu t3.micro, puerto 8000, con el rol IAM
5. EC2:   git clone → venv → pip install → editar .env (bucket) → uvicorn --host 0.0.0.0 --port 8000
6. PC:    frontend .env con la IP del EC2 → npm install → npm run dev
7. Probar → grabar video → APAGAR EC2
```
