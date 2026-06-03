"""
Upload de videos a Cloudinary.
Retorna la URL pública del video.
"""
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name = "dnbylaj2y",
    api_key    = "474391961355116",
    api_secret = "AjmdN_-65z1XG0GO0i_QhL79p5Y",
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
