# Bet-IPS — Predicción de resultados de partidos de PlayOffs Mundial 2026

Proyecto Integrador de 6.º semestre de Ingeniería en Sistemas de Información (UIDE). El sistema parte de un histórico de partidos internacionales, realiza limpieza y análisis exploratorio y entrena modelos de *Machine Learning* para predecir el resultado de un partido: **gana local, empata o gana visitante**.

Todo el trabajo está en el notebook `Prediccion_WC2026.ipynb`, pensado para ejecutarse en **Google Colab**.

---

## Objetivo

Predecir el resultado (gana / empata / pierde, desde la perspectiva del equipo local) de partidos de selecciones nacionales, usando como señal principal la **diferencia de nivel** entre los dos equipos (ranking FIFA y forma reciente).

---

## Fuentes de datos

Los datos se obtienen por descarga manual (no se usa ninguna API en vivo) y se suben a Colab con `files.upload()`:

- **`results.csv`** — histórico completo de partidos internacionales de selecciones (fecha, equipos, marcador, torneo, sede, si fue en campo neutral). Es la base del proyecto.
- **`fifa_ranking 1993-2018.csv`** — ranking FIFA **mensual** oficial de agosto 1993 a junio 2018. Fuente principal del ranking.
- **`rankingFifaXXXX.json`** — "fotos" del ranking FIFA (2018, 2019, 2022, 2023, 2026) que completan las fechas posteriores a junio 2018.

> El ranking FIFA no existe antes de 1993; para partidos anteriores se usa un valor neutro.

### Carpeta `Data`

Los **7 archivos de datos** del proyecto se guardan en la carpeta **`Data/`**. Al ejecutar en Colab se suben con `files.upload()` desde esa carpeta.

| Archivo | Tipo | ¿Necesario en Colab? |
|---------|------|----------------------|
| `Data/results.csv` | Histórico de partidos | Sí |
| `Data/fifa_ranking 1993-2018.csv` | Ranking FIFA mensual | Sí |
| `Data/rankingFifa2019.json` | Foto de ranking | Sí |
| `Data/rankingFifa2022.json` | Foto de ranking | Sí |
| `Data/rankingFifa2023.json` | Foto de ranking | Sí |
| `Data/rankingFifa2026.json` | Foto de ranking | Sí |
| `Data/rankingFifa2018.json` | Foto de ranking | Opcional (solo afina jul–dic 2018) |

---

## Estructura del notebook

### Avance I — EDA y limpieza
- **Carga de datos** desde `results.csv`.
- **Exploración inicial**: dimensiones, tipos, nulos, duplicados y rango de fechas.
- **Limpieza**: se eliminan los partidos sin marcador (único problema real de calidad) y se convierten los goles a entero. No hay duplicados ni marcadores negativos, así que no se requiere más limpieza.
- **Gráficos exploratorios**: partidos por año y distribución de resultados del local.

### Avance II — Modelos de clasificación
- **Enfoque:** un único modelo entrenado con **todas las selecciones** (~49 mil partidos), describiendo cada partido desde la perspectiva del local.
- **Variable objetivo (categórica):** `0 = gana local`, `1 = empate`, `2 = gana visitante`.
- **Características (features):** ranking FIFA y forma reciente (puntos y goles a favor en los últimos partidos) de local y visitante, sus **diferencias** y si el partido fue en campo neutral. Todas se calculan con información **anterior** al partido (sin fuga de datos).
- **Validación (split temporal realista):** se entrena con toda la historia hasta el **fin de la fase de grupos del Mundial 2026** y se evalúa prediciendo los **playoffs** de ese mismo Mundial.
- **Algoritmos comparados:** Regresión Logística, SVM y Árbol de Decisión (los tres pedidos en la asignatura), más KNN, Random Forest y Gradient Boosting como comparación adicional.
- **Métricas:** Accuracy, Precision, Recall y F1-Score (promedio *macro*), con matriz de confusión por modelo.

---

## Carpeta `Models` (documentación de modelos individuales)

El notebook principal (`Prediccion_WC2026.ipynb`) conserva únicamente lo que forma parte del flujo final del proyecto. Para dejar constancia del trabajo de comparación, en la carpeta **`Models/`** se guarda un notebook por cada uno de los **6 modelos probados**, de modo que cada algoritmo pueda revisarse de forma aislada.

Esta carpeta es **documentación**: muestra cómo se entrenó y evaluó cada modelo por separado (entrenamiento, matriz de confusión y métricas), sin mezclar todos en un mismo archivo.

| Notebook | Algoritmo |
|----------|-----------|
| `Models/01_regresion_logistica.ipynb` | Regresión Logística |
| `Models/02_svm.ipynb` | Máquina de Soporte Vectorial (SVM) |
| `Models/03_arbol_decision.ipynb` | Árbol de Decisión |
| `Models/04_knn.ipynb` | K Vecinos más Cercanos (KNN) |
| `Models/05_random_forest.ipynb` | Random Forest |
| `Models/06_gradient_boosting.ipynb` | Gradient Boosting |

> El notebook principal se queda con el flujo definitivo (datos, preparación y el modelo final); la comparación completa de los seis algoritmos queda documentada en `Models/`.

---

## Evolución del proyecto (bitácora de cambios)

El proyecto cambió de rumbo varias veces a partir del EDA y de las sesiones de asesoría:

1. **Versión inicial (descartada):** se usaban CSV por torneo de FBref (eliminatorias y mundiales 2018/2022/2026). Se reinició desde cero con un único dataset histórico (`results.csv`).
2. **Limpieza y EDA:** se documentó que el único problema de calidad real eran los nulos en los marcadores; duplicados, negativos y espacios no aplicaban en este dataset.
3. **Primer modelo — agente de Argentina:** se filtraba solo a Argentina y se predecía su resultado con forma reciente. Rendimiento modesto (F1 macro ≈ 0.40).
4. **Enriquecimiento de características:** se añadió el **ranking FIFA del rival** a la forma reciente del equipo.
5. **Cambio de enfoque — todas las selecciones:** por recomendación de las sesiones 1 a 1, se pasó de un agente de un solo país a **un modelo con todas las selecciones**, usando la **diferencia de nivel** entre equipos (ranking FIFA y forma reciente) como señal principal. Esto mejoró claramente el desempeño.
6. **Split por fases del Mundial 2026:** entrenar hasta fase de grupos y predecir los playoffs, un esquema de validación temporal más realista.
7. **Integración del ranking FIFA mensual** (`fifa_ranking 1993-2018.csv`) combinado con las fotos JSON, con mapeo de nombres de países entre fuentes.

---

## Modelo final: KNN

Tras comparar los seis algoritmos sobre los playoffs del Mundial 2026, el equipo adoptó **KNN** como modelo final del proyecto. En el notebook, la sección de comparación reporta automáticamente el mejor modelo por F1-Score macro.

**Resultado del modelo elegido (playoffs del Mundial 2026):**
- **Aciertos: 23 de 32 partidos (~72 % de accuracy).**
- F1-Score macro ≈ 0.63 en la configuración con la que fue el mejor.

**Por qué KNN:**
- Con ~49 mil partidos de entrenamiento, KNN encuentra partidos históricos muy parecidos (misma diferencia de nivel entre equipos) y predice a partir de ellos, lo que funciona bien con tantos datos.
- Fue el algoritmo con mejor equilibrio entre acierto global y reparto entre las tres clases en la configuración elegida.
- Es rápido de entrenar y fácil de interpretar.

**Dónde falla (y por qué es esperable):**
- De los 9 fallos, varios son **empates** (la clase minoritaria y más impredecible del fútbol) y el resto son **sorpresas deportivas** (un equipo peor ganándole a uno mejor en partido único), que ningún modelo puede anticipar.
- El fútbol tiene un **techo de predictibilidad bajo**: el modelo ayuda a estimar al favorito, no a garantizar el resultado.

---

## Cómo ejecutar

1. Abrir `Prediccion_WC2026.ipynb` en **Google Colab**.
2. Ejecutar las celdas en orden.
3. En la celda de carga, subir todos los archivos indicados en la tabla de arriba (de una sola vez).
4. Seguir el notebook hasta la comparación de modelos y las conclusiones.

---

## Autores

1. **Anderson Granda** — Product Owner & QA
2. **Isaac Bonilla** — SCRUM Master & Cybersecurity auditor
3. **Juan Fernandez** — Dev Team & Production
