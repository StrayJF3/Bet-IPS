"""Obtiene los artefactos del modelo (model.joblib, team_state.json, metrics.json).

Dos modos, segun la configuracion:

- **Local:** si no se define S3_BUCKET, se usan los archivos que ya estan en
  `artifacts_dir`. Util para desarrollo en la maquina del equipo.

- **S3:** si se define S3_BUCKET, al arrancar se descargan los tres artefactos desde
  el bucket a `artifacts_dir` (una sola vez). Las credenciales las aporta el **rol IAM**
  de la instancia EC2; no se ponen claves en el codigo ni en variables de entorno.

La descarga ocurre una unica vez al iniciar la API (en el lifespan de FastAPI), por lo
que cada prediccion posterior ya trabaja en memoria y es instantanea.
"""

from pathlib import Path

from app.config import settings

ARTIFACTS = ("model.joblib", "team_state.json", "metrics.json")


def ensure_artifacts(artifacts_dir: Path) -> Path:
    """Garantiza que los tres artefactos esten en artifacts_dir y devuelve la ruta.

    Si hay bucket S3 configurado, los descarga de S3. Si no, valida que existan en local.
    """
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    if settings.s3_bucket:
        _download_from_s3(artifacts_dir)

    faltan = [n for n in ARTIFACTS if not (artifacts_dir / n).exists()]
    if faltan:
        origen = f"el bucket S3 '{settings.s3_bucket}'" if settings.s3_bucket else f"la carpeta {artifacts_dir}"
        raise RuntimeError(
            f"No se encontraron los artefactos {faltan} en {origen}. "
            "Entrena/exporta el modelo desde el notebook y subelo a esa ubicacion."
        )
    return artifacts_dir


def _download_from_s3(artifacts_dir: Path) -> None:
    """Descarga los tres artefactos desde S3 usando el rol IAM del EC2."""
    import boto3  # import diferido: solo se necesita en el modo S3

    session = boto3.session.Session(region_name=settings.aws_region or None)
    s3 = session.client("s3")
    prefix = settings.s3_prefix.strip("/")
    for nombre in ARTIFACTS:
        key = f"{prefix}/{nombre}" if prefix else nombre
        s3.download_file(settings.s3_bucket, key, str(artifacts_dir / nombre))
