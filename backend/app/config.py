"""Configuracion del backend leida de variables de entorno (o del archivo backend/.env)."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    # Origenes (dominios del frontend) que pueden llamar a la API, separados por coma.
    allowed_origins: str = "http://localhost:5173"
    # Carpeta local donde se guardan/leen model.joblib, team_state.json y metrics.json.
    artifacts_dir: Path = ROOT / "artifacts"
    # Mostrar /docs (Swagger). Recomendado false en produccion.
    enable_docs: bool = False

    # --- Amazon S3 (opcional) ---
    # Si se define S3_BUCKET, al arrancar la API descarga los artefactos desde S3 a
    # artifacts_dir (una sola vez). Las credenciales las aporta el ROL IAM del EC2;
    # NO se ponen claves en el codigo ni en variables de entorno.
    s3_bucket: str = ""
    # Prefijo (carpeta) dentro del bucket donde estan los artefactos. Ej: "artifacts/".
    s3_prefix: str = ""
    # Region del bucket (ej. us-east-1). Si se deja vacio, boto3 usa la del entorno/EC2.
    aws_region: str = ""

    @property
    def origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
