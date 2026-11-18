"""API de pronosticos del Mundial 2026 (FastAPI).

Rutas:
    GET  /api/health    estado del servicio y del modelo
    GET  /api/teams     las 48 selecciones con su ranking FIFA y forma reciente
    GET  /api/model     metadatos y metricas del modelo entrenado
    POST /api/predict   probabilidades gana / empata / pierde para un VS
"""

from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.config import settings
from app.predictor import Predictor
from app.teams import TEAMS, TEAMS_BY_ID


class PredictIn(BaseModel):
    team_a: str = Field(pattern=r"^[a-z-]{2,30}$")
    team_b: str = Field(pattern=r"^[a-z-]{2,30}$")

    @model_validator(mode="after")
    def check(self):
        for tid in (self.team_a, self.team_b):
            if tid not in TEAMS_BY_ID:
                raise ValueError(f"Seleccion desconocida: {tid}")
        if self.team_a == self.team_b:
            raise ValueError("Elige dos selecciones distintas")
        return self


class Probabilities(BaseModel):
    win: float
    draw: float
    loss: float


class PredictOut(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    team_a: str
    team_b: str
    probabilities: Probabilities
    venue: Literal["neutral", "local", "visitante"]
    model_version: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.predictor = Predictor(settings.artifacts_dir)
    yield


app = FastAPI(
    title="Bet-IPS · API de pronósticos",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.enable_docs else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if settings.enable_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
    max_age=600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(Exception)
async def unhandled(_: Request, __: Exception):
    # Nunca se devuelven trazas ni detalles internos al cliente.
    return JSONResponse(status_code=500, content={"detail": "Error interno"})


def predictor(request: Request) -> Predictor:
    return request.app.state.predictor


@app.get("/api/health")
def health(request: Request):
    return {"status": "ok", "model_version": predictor(request).meta["version"]}


@app.get("/api/teams")
def teams(request: Request):
    p = predictor(request)
    return [
        {
            "id": t.id,
            "name": t.name,
            "flag": t.flag,
            "confederation": t.confederation,
            "host": t.host,
            **p.team_summary(t.id),
        }
        for t in TEAMS
    ]


@app.get("/api/model")
def model_info(request: Request):
    m = predictor(request).meta
    return {k: m[k] for k in ("version", "algorithm", "features", "trained_at", "data_until", "metrics")}


@app.post("/api/predict", response_model=PredictOut)
def predict(body: PredictIn, request: Request):
    p = predictor(request)
    try:
        result = p.predict(TEAMS_BY_ID[body.team_a], TEAMS_BY_ID[body.team_b])
    except KeyError as err:
        raise HTTPException(status_code=400, detail="Seleccion no valida") from err
    return {
        "team_a": body.team_a,
        "team_b": body.team_b,
        "probabilities": {k: round(result[k], 4) for k in ("win", "draw", "loss")},
        "venue": result["venue"],
        "model_version": p.meta["version"],
    }
