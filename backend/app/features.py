"""Variables del modelo. Se usan igual al entrenar y al predecir.

Reproducen exactamente las del notebook de Juan Fernandez (`Prediccion_WC2026.ipynb`,
seccion 9). Cada partido se describe desde la perspectiva del LOCAL, con informacion
ANTERIOR al partido:
  - rank_local / rank_visita:   posicion en el ranking FIFA vigente
  - dif_rank:                   rank_visita - rank_local (positivo = local mejor ranking)
  - dif_pts:                    puntos FIFA del local - puntos FIFA del visitante
  - forma_local / forma_visita: promedio de puntos (3/1/0) en los ultimos 5 partidos
  - dif_forma:                  forma_local - forma_visita
  - neutral:                    1 si el partido es en campo neutral, 0 si el local juega en casa
"""

from dataclasses import dataclass

FEATURES = ["dif_rank", "dif_pts", "dif_forma", "rank_local", "rank_visita", "forma_local", "forma_visita", "neutral"]
FORM_N = 5  # ventana de forma reciente (N del notebook)
CLASSES = {0: "gana local", 1: "empate", 2: "gana visitante"}


@dataclass
class TeamState:
    """Estado actual de una seleccion, guardado en artifacts/team_state.json."""

    rank: int
    points: float
    form: float  # promedio de puntos en los ultimos FORM_N partidos


def build_row(local: TeamState, visita: TeamState, neutral: int) -> list[float]:
    return [
        visita.rank - local.rank,
        local.points - visita.points,
        local.form - visita.form,
        local.rank,
        visita.rank,
        local.form,
        visita.form,
        float(neutral),
    ]
