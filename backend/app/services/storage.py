import uuid
from pathlib import Path

from .. import config

_LOCAL_ROOT = Path(__file__).resolve().parents[2] / "public" / "uploads"


async def upload_file(bucket: str, file_bytes: bytes, original_name: str, mime_type: str) -> dict:
    ext = original_name.rsplit(".", 1)[-1] if "." in original_name else "bin"
    file_name = f"{uuid.uuid4().hex}.{ext}"
    relative = f"{bucket}/{file_name}"
    directory = _LOCAL_ROOT / bucket
    directory.mkdir(parents=True, exist_ok=True)
    (directory / file_name).write_bytes(file_bytes)
    base_url = config.PUBLIC_BASE_URL
    return {"url": f"{base_url}/uploads/{relative}", "path": relative}
