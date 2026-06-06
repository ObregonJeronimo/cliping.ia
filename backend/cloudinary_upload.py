"""
Upload de videos a Cloudinary.
Retorna la URL pública del video.

Las credenciales se leen de variables de entorno (.env). El api_secret NUNCA
debe quedar hardcodeado ni commiteado.

Variables esperadas (en backend/.env o en el .env raíz):
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
"""
import os

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Idempotente: run.py ya lo llama, pero por si se importa este módulo aparte.
load_dotenv()

# cloud_name y api_key no son secretos (identifican la cuenta); el api_secret SÍ
# lo es y solo puede venir del entorno.
CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "dnbylaj2y")
API_KEY    = os.getenv("CLOUDINARY_API_KEY", "474391961355116")
API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

if not API_SECRET:
    print("[cloudinary] FALTA CLOUDINARY_API_SECRET en el .env — "
          "el upload a Cloudinary va a fallar (el render igual se guarda local).")

cloudinary.config(
    cloud_name = CLOUD_NAME,
    api_key    = API_KEY,
    api_secret = API_SECRET,
    secure     = True,
)


async def upload_video(file_path: str, public_id: str) -> str:
    """
    Sube un video MP4 a Cloudinary y retorna la URL pública.
    public_id: identificador único (ej: 'cinematicas/EcommerceJourney_abc123')
    """
    import asyncio
    loop = asyncio.get_event_loop()

    def _upload():
        result = cloudinary.uploader.upload(
            file_path,
            resource_type = "video",
            public_id     = f"cinematicas/{public_id}",
            overwrite     = True,
            eager         = [{"format": "mp4", "quality": "auto"}],
        )
        return result.get("secure_url", "")

    url = await loop.run_in_executor(None, _upload)
    return url


async def delete_video(public_id: str) -> bool:
    """Borra un video de Cloudinary por public_id (ej 'cinematicas/video_abc12345').
    Devuelve True si Cloudinary respondió ok o si ya no existía."""
    if not public_id:
        return False
    import asyncio
    loop = asyncio.get_event_loop()

    def _del():
        res = cloudinary.uploader.destroy(public_id, resource_type="video", invalidate=True)
        return res.get("result") in ("ok", "not found")

    return await loop.run_in_executor(None, _del)


async def upload_image(file_path: str, public_id: str) -> str:
    """Sube una imagen (ej. screenshot del sitio) y retorna la URL pública."""
    import asyncio
    loop = asyncio.get_event_loop()

    def _upload():
        result = cloudinary.uploader.upload(
            file_path,
            resource_type="image",
            public_id=f"sitecaps/{public_id}",
            overwrite=True,
        )
        return result.get("secure_url", "")

    return await loop.run_in_executor(None, _upload)
