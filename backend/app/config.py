"""Configuracion del backend leida de variables de entorno (o del archivo backend/.env)."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    # Origenes (dominios del frontend) que pueden llamar a la API, separados por coma.
    allowed_origins: str = "http://localhost:5173"
    # Carpeta donde estan model.joblib, team_state.json y metrics.json.
    artifacts_dir: Path = ROOT / "artifacts"
    # Mostrar /docs (Swagger). Recomendado false en produccion.
    enable_docs: bool = False

    @property
    def origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
