"""Entrena el modelo de pronostico y guarda los artefactos en backend/artifacts/.

Es el modelo final elegido por el equipo de ML (Juan Fernandez) en el notebook
`Prediccion_WC2026.ipynb`: KNN (k=15) con StandardScaler, entrenado con todas las
selecciones, ranking FIFA y forma reciente. Este script reproduce ese notebook paso a
paso, sin Colab, para poder servir el modelo desde el EC2.

Uso (desde la carpeta backend/):
    python -m training.train                      # lee los datos de ../Data (carpeta del repo)
    python -m training.train --data-dir otra/ruta # o de cualquier otra carpeta

La carpeta de datos debe tener los mismos archivos que `Data/` del repositorio:
    results.csv, fifa_ranking 1993-2018.csv y rankingFifa{2018,2019,2022,2023,2026}.json

Artefactos generados:
    artifacts/model.joblib       pipeline (StandardScaler + KNeighborsClassifier)
    artifacts/team_state.json    ranking FIFA y forma actual de las 48 selecciones
    artifacts/metrics.json       metricas de evaluacion y metadatos
"""

import argparse
import bisect
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from app.features import CLASSES, FEATURES, FORM_N
from app.teams import TEAMS

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT.parent / "Data"
ARTIFACTS = ROOT / "artifacts"

# Igual que el notebook (seccion 10): entrenar hasta el fin de la fase de grupos del
# Mundial 2026 y evaluar con los playoffs de ese Mundial.
FIN_GRUPOS = pd.Timestamp("2026-06-27")
INICIO_PLAYOFFS = pd.Timestamp("2026-06-28")

# Equivalencias de nombres entre results.csv y las fuentes de ranking (notebook, seccion 7).
EQUIV = {
    "United States": "USA",
    "South Korea": "Korea Republic",
    "North Korea": "Korea DPR",
    "Iran": "IR Iran",
    "Ivory Coast": "Côte d'Ivoire",
    "China": "China PR",
    "DR Congo": "Congo DR",
    "Cape Verde": "Cape Verde Islands",
}
# Nombres que la FIFA cambio en las fotos JSON recientes. Sin esto, Chequia, Turquia y
# Cabo Verde se quedarian con su ranking de junio de 2018.
EQUIV_JSON = {"Czech Republic": "Czechia", "Turkey": "Türkiye", "Cape Verde": "Cabo Verde"}
ANIOS_JSON = [2018, 2019, 2022, 2023, 2026]
RANKING_CSV = "fifa_ranking 1993-2018.csv"
CORTE = pd.Timestamp("2018-06-07")  # ultima fecha del CSV mensual


class FifaRanking:
    """Ranking FIFA vigente (rank, puntos) de una seleccion en una fecha."""

    def __init__(self, data_dir: Path):
        rk_csv = pd.read_csv(data_dir / RANKING_CSV, parse_dates=["rank_date"]).sort_values("rank_date")
        self.hist = {
            eq: (list(g["rank_date"]), list(zip(g["rank"].astype(int), g["total_points"].astype(float), strict=True)))
            for eq, g in rk_csv.groupby("country_full")
        }
        self.json = {
            a: self._load_json(data_dir / f"rankingFifa{a}.json")
            for a in ANIOS_JSON
            if (data_dir / f"rankingFifa{a}.json").exists()
        }
        self.rank_na = int(rk_csv["rank"].max()) + 1  # valor neutro para desconocidos

    @staticmethod
    def _load_json(path: Path) -> dict:
        data = json.loads(path.read_text(encoding="utf-8"))
        return {
            r["TeamName"][0]["Description"].strip(): (r["Rank"], r["TotalPoints"])
            for r in data["Results"]
            if r["Rank"] is not None
        }

    def get(self, equipo: str, fecha) -> tuple[int, float]:
        eq = EQUIV.get(equipo, equipo)
        fecha = pd.Timestamp(fecha)
        if fecha <= CORTE and eq in self.hist:
            fechas, valores = self.hist[eq]
            pos = bisect.bisect_right(fechas, fecha) - 1
            if pos >= 0:
                return valores[pos]
        candidatos = [a for a in self.json if a <= fecha.year]
        if candidatos:
            tabla = self.json[max(candidatos)]
            for nombre in (eq, EQUIV_JSON.get(equipo)):
                if nombre in tabla:
                    return tabla[nombre]
        if eq in self.hist:
            return self.hist[eq][1][-1]
        return self.rank_na, 0.0


def team_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Una fila por equipo y partido, con su forma ANTERIOR al partido (notebook, seccion 8)."""
    local = df[["date", "home_team", "home_score", "away_score"]].copy()
    local.columns = ["date", "equipo", "gf", "gc"]
    visita = df[["date", "away_team", "away_score", "home_score"]].copy()
    visita.columns = ["date", "equipo", "gf", "gc"]

    largo = pd.concat([local, visita]).sort_values("date").reset_index(drop=True)
    largo["pts"] = np.where(largo["gf"] > largo["gc"], 3, np.where(largo["gf"] == largo["gc"], 1, 0))
    g = largo.groupby("equipo")
    largo["forma_pts"] = g["pts"].transform(lambda s: s.shift(1).rolling(FORM_N, min_periods=1).mean())
    return largo


def build_dataset(df: pd.DataFrame, largo: pd.DataFrame, rk: FifaRanking) -> pd.DataFrame:
    """Caracteristicas de local y visitante y sus diferencias (notebook, seccion 9)."""
    forma = {(r.date, r.equipo): r.forma_pts for r in largo.itertuples()}
    d = df.copy()
    d["objetivo"] = np.where(d["home_score"] > d["away_score"], 0, np.where(d["home_score"] == d["away_score"], 1, 2))
    rk_local = [rk.get(t, f) for t, f in zip(d["home_team"], d["date"], strict=True)]
    rk_visita = [rk.get(t, f) for t, f in zip(d["away_team"], d["date"], strict=True)]
    d["rank_local"] = [r for r, _ in rk_local]
    d["rank_visita"] = [r for r, _ in rk_visita]
    d["pts_local"] = [p for _, p in rk_local]
    d["pts_visita"] = [p for _, p in rk_visita]
    d["forma_local"] = [forma.get((f, t), np.nan) for t, f in zip(d["home_team"], d["date"], strict=True)]
    d["forma_visita"] = [forma.get((f, t), np.nan) for t, f in zip(d["away_team"], d["date"], strict=True)]
    d["dif_rank"] = d["rank_visita"] - d["rank_local"]
    d["dif_pts"] = d["pts_local"] - d["pts_visita"]
    d["dif_forma"] = d["forma_local"] - d["forma_visita"]
    d["neutral"] = d["neutral"].astype(int)
    return d.dropna(subset=["forma_local", "forma_visita"]).reset_index(drop=True)


K_NEIGHBORS = 15
ALGORITHM = f"KNN (k = {K_NEIGHBORS}) con StandardScaler · scikit-learn"
CLASS_LABELS = list(CLASSES)


def new_model():
    return make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=K_NEIGHBORS))


def load_results(data_dir: Path) -> pd.DataFrame:
    """Historico de partidos sin marcadores vacios (notebook, seccion 4)."""
    results = data_dir / "results.csv"
    if not results.exists():
        raise SystemExit(f"No se encontro results.csv en {data_dir}. Usa --data-dir con la carpeta Data/ del repo.")
    df = pd.read_csv(results, parse_dates=["date"])
    df = df.dropna(subset=["home_score", "away_score"]).reset_index(drop=True)
    df["home_score"] = df["home_score"].astype(int)
    df["away_score"] = df["away_score"].astype(int)
    print(f"Partidos en el historico: {len(df):,} ({df['date'].min().date()} a {df['date'].max().date()})")
    return df


def evaluate(d: pd.DataFrame) -> dict:
    """Igual al notebook: entrena hasta la fase de grupos y mide con los playoffs del Mundial 2026."""
    train = d[d["date"] <= FIN_GRUPOS]
    test = d[(d["tournament"] == "FIFA World Cup") & (d["date"] >= INICIO_PLAYOFFS)]
    pred = new_model().fit(train[FEATURES], train["objetivo"]).predict(test[FEATURES])
    y = test["objetivo"]

    def macro(score) -> float:
        return round(float(score(y, pred, average="macro", zero_division=0)), 4)

    metrics = {
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": macro(precision_score),
        "recall": macro(recall_score),
        "f1_macro": macro(f1_score),
        "baseline_accuracy": round(float(y.value_counts(normalize=True).max()), 4),
        "hits": int((pred == y).sum()),
        "confusion_matrix": confusion_matrix(y, pred, labels=CLASS_LABELS).tolist(),
        "train_matches": len(train),
        "final_train_matches": len(d),
        "test_matches": len(test),
        "test_set": "Playoffs del Mundial 2026",
    }
    print(
        f"Playoffs WC2026 ({len(test)} partidos): aciertos={metrics['hits']}/{len(test)}  "
        f"accuracy={metrics['accuracy']:.3f}  f1_macro={metrics['f1_macro']:.3f}  "
        f"(siempre-la-clase-mas-comun={metrics['baseline_accuracy']:.3f})"
    )
    return metrics


def current_team_state(largo: pd.DataFrame, rk: FifaRanking, today: pd.Timestamp) -> dict:
    """Ranking FIFA vigente y ultimos FORM_N partidos de cada una de las 48 selecciones."""
    state = {}
    for t in TEAMS:
        played = largo[largo["equipo"] == t.dataset].tail(FORM_N)
        if played.empty:
            raise SystemExit(f"La seleccion '{t.dataset}' no aparece en el historico")
        rank, points = rk.get(t.dataset, today)
        if rank == rk.rank_na:
            raise SystemExit(f"La seleccion '{t.dataset}' no aparece en el ranking FIFA")
        recent = zip(played["pts"], played["gf"], played["gc"], strict=True)
        state[t.id] = {
            "rank": int(rank),
            "points": float(points),
            "recent": [[int(p), int(gf), int(gc)] for p, gf, gc in recent],
        }
    return state


def write_json(name: str, data: dict, indent: int) -> None:
    (ARTIFACTS / name).write_text(json.dumps(data, ensure_ascii=False, indent=indent), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA, help="carpeta con los datos (Data/ del repo)")
    data_dir = parser.parse_args().data_dir.resolve()

    df = load_results(data_dir)
    rk = FifaRanking(data_dir)
    largo = team_rows(df)
    d = build_dataset(df, largo, rk)
    print(f"Partidos listos para el modelo: {len(d):,}")

    metrics = evaluate(d)

    # Modelo final para produccion: mismos hiperparametros, reentrenado con todo el historico.
    final = new_model().fit(d[FEATURES], d["objetivo"])
    ARTIFACTS.mkdir(exist_ok=True)
    joblib.dump(final, ARTIFACTS / "model.joblib", compress=3)

    last_match = df["date"].max()
    write_json("team_state.json", current_team_state(largo, rk, last_match + pd.Timedelta(days=1)), indent=1)
    now = datetime.now(timezone.utc)
    write_json(
        "metrics.json",
        {
            "version": now.strftime("%Y.%m.%d-%H%M"),
            "algorithm": ALGORITHM,
            "features": FEATURES,
            "classes": [int(c) for c in final.classes_],
            "trained_at": now.isoformat(timespec="seconds"),
            "data_until": str(last_match.date()),
            "data_source": "Carpeta Data/ del repositorio Bet-IPS (results.csv + ranking FIFA)",
            "metrics": metrics,
        },
        indent=2,
    )
    print(f"Artefactos guardados en {ARTIFACTS}")


if __name__ == "__main__":
    main()
