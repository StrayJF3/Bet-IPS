"""Carga los artefactos del modelo y calcula probabilidades para un enfrentamiento."""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.features import CLASSES, FEATURES, TeamState, build_row
from app.teams import TEAMS_BY_ID, Team


class Predictor:
    def __init__(self, artifacts_dir: Path):
        self.model = joblib.load(artifacts_dir / "model.joblib")
        self.meta = json.loads((artifacts_dir / "metrics.json").read_text(encoding="utf-8"))
        self.raw = json.loads((artifacts_dir / "team_state.json").read_text(encoding="utf-8"))
        self.states = {
            tid: TeamState(rank=s["rank"], points=s["points"], form=sum(r[0] for r in s["recent"]) / len(s["recent"]))
            for tid, s in self.raw.items()
        }
        missing = set(TEAMS_BY_ID) - set(self.states)
        if missing:
            raise RuntimeError(f"Faltan selecciones en team_state.json: {sorted(missing)}")
        # Clases del modelo: 0 gana local, 1 empate, 2 gana visitante.
        self._class_index = {int(c): i for i, c in enumerate(self.model.classes_)}

    def _proba(self, local: TeamState, visita: TeamState, neutral: int) -> np.ndarray:
        """Devuelve [gana local, empate, gana visitante]."""
        x = pd.DataFrame([build_row(local, visita, neutral)], columns=FEATURES)
        p = self.model.predict_proba(x)[0]
        return np.array([p[self._class_index[c]] for c in CLASSES])

    def predict(self, team_a: Team, team_b: Team) -> dict:
        a, b = self.states[team_a.id], self.states[team_b.id]

        # En el Mundial casi todo es campo neutral; solo los anfitriones juegan en casa.
        if team_a.host and not team_b.host:
            p, venue = self._proba(a, b, 0), "local"
        elif team_b.host and not team_a.host:
            p, venue = self._proba(b, a, 0)[::-1], "visitante"
        else:
            # Neutral: se promedia A-vs-B con B-vs-A para que el orden no cambie el resultado.
            p, venue = (self._proba(a, b, 1) + self._proba(b, a, 1)[::-1]) / 2, "neutral"

        p = p / p.sum()
        return {"win": float(p[0]), "draw": float(p[1]), "loss": float(p[2]), "venue": venue}

    def team_summary(self, team_id: str) -> dict:
        s, recent = self.states[team_id], self.raw[team_id]["recent"]
        return {
            "fifa_rank": s.rank,
            "fifa_points": round(s.points, 1),
            "form": [("V" if p == 3 else "E" if p == 1 else "D") for p, _, _ in recent],
            "form_points": round(s.form, 2),
        }
