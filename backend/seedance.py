"""
seedance.py - MULTI-MODELO de video image-to-video en fal (la feature "Cine IA"). Registry de modelos curados
con su SCHEMA real (cuantas imagenes acepta, resoluciones, duraciones) + generate() que arma el input correcto por
modelo. Extraer imagenes del sitio = $0; el costo de generar lo paga FAL_KEY (.env).
"""
import asyncio
import os
import re
from pathlib import Path

FAL_QUEUE = "https://queue.fal.run/"


def fal_key() -> str:
    k = os.environ.get("FAL_KEY", "").strip()
    if k:
        return k
    try:
        for line in (Path(__file__).parent / ".env").read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("FAL_KEY="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""


# REGISTRY (precios reales de fal). img_mode: single (1) | startend (1 + frame final) | multi (array, @ImageN).
# dur_fmt: int (10) | str ("10") | veo ("10s") | frames (num_frames = fps*seg). res_field None = la resolucion va en el slug.
MODELS = [
    # --- cinematografico / realista, barato ---
    {"id": "longcat-d720", "label": "LongCat distilled 720p", "desc": "El mas barato creible ($0.01/s). Pans suaves de producto, para volumen.",
     "slug": "fal-ai/longcat-video/distilled/image-to-video/720p", "price_s": 0.01, "max_images": 1, "img_mode": "single",
     "resolutions": [], "res_field": None, "durations": [5, 6, 8], "dur_fmt": "frames", "fps": 30, "aspect": True, "audio_field": None},
    {"id": "ltx23-fast", "label": "LTX-2.3 Fast (recomendado)", "desc": "El mejor todoterreno: 9:16 nativo + audio + hasta 20s, realista O estilizado. $0.04/s.",
     "slug": "fal-ai/ltx-2.3/image-to-video/fast", "price_s": 0.04, "max_images": 2, "img_mode": "startend", "end_field": "end_image_url",
     "resolutions": ["1080p", "1440p", "2160p"], "res_field": "resolution", "durations": [6, 8, 10], "dur_fmt": "int", "aspect": True, "audio_field": "generate_audio"},
    {"id": "seedance1-lite", "label": "Seedance v1 lite", "desc": "Mejor fidelidad por dolar, adherencia confiable ($0.036/s). (Puede estar deprecado en fal.)",
     "slug": "fal-ai/bytedance/seedance/v1/lite/image-to-video", "price_s": 0.036, "max_images": 1, "img_mode": "single",
     "resolutions": ["480p", "720p", "1080p"], "res_field": "resolution", "durations": [4, 5, 6, 8, 10], "dur_fmt": "str", "aspect": True, "audio_field": None},
    {"id": "seedance1-pro-fast", "label": "Seedance v1 Pro Fast", "desc": "Camino barato a 1080p nitido (~$0.05/s).",
     "slug": "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video", "price_s": 0.05, "max_images": 1, "img_mode": "single",
     "resolutions": ["480p", "720p", "1080p"], "res_field": "resolution", "durations": [4, 5, 6, 8, 10], "dur_fmt": "str", "aspect": True, "audio_field": None},
    {"id": "hailuo23-fast-pro", "label": "Hailuo 2.3 Fast Pro", "desc": "Realismo photoreal 1080p, 10s (~$0.33/video). El vertical sale del recorte de la imagen (no controla aspecto).",
     "slug": "fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video", "price_s": 0.033, "max_images": 1, "img_mode": "single",
     "resolutions": [], "res_field": None, "durations": [6, 10], "dur_fmt": "int", "aspect": False, "audio_field": None},
    # --- animado / estilizado (no photoreal) ---
    {"id": "pixverse55", "label": "PixVerse v5.5 (recomendado, animado)", "desc": "Look ANIMADO/estilizado (anime, 3D, clay, comic, cyberpunk). El mejor para no-photoreal.",
     "slug": "fal-ai/pixverse/v5.5/image-to-video", "price_s": 0.04, "max_images": 1, "img_mode": "single",
     "resolutions": ["540p", "720p", "1080p"], "res_field": "resolution", "durations": [5, 8, 10], "dur_fmt": "int", "aspect": True, "audio_field": "generate_audio_switch"},
    {"id": "kandinsky5", "label": "Kandinsky 5 Pro", "desc": "Artistico/ilustrado (~$0.04/s @512p). No controla 9:16 (sale del recorte de la imagen).",
     "slug": "fal-ai/kandinsky5-pro/image-to-video", "price_s": 0.04, "max_images": 1, "img_mode": "single",
     "resolutions": ["512P", "1024P"], "res_field": "resolution", "durations": [5, 10], "dur_fmt": "veo", "aspect": False, "audio_field": None},
    {"id": "grok", "label": "Grok Imagine", "desc": "Movimiento creativo, aspectos flexibles ($0.05/s @480p).",
     "slug": "xai/grok-imagine-video/image-to-video", "price_s": 0.05, "max_images": 1, "img_mode": "single",
     "resolutions": ["480p", "720p"], "res_field": "resolution", "durations": [5, 6, 8, 10], "dur_fmt": "int", "aspect": True, "audio_field": None},
]
MODELS_BY_ID = {m["id"]: m for m in MODELS}


def public_models():
    """Lo que el frontend muestra para elegir (sin detalles internos del schema)."""
    return [{"id": m["id"], "label": m["label"], "desc": m["desc"], "price_s": m["price_s"],
             "max_images": m["max_images"], "img_mode": m["img_mode"],
             "resolutions": m.get("resolutions", []), "durations": m["durations"]} for m in MODELS]


# rubro -> (sujeto, lugar, mood) en ingles para un prompt CONCRETO.
WORLD = {
    "salud":        ("natural health-food products (glass jars of grains, seeds and dried herbs), fresh wholesome ingredients", "a cozy, tidy home kitchen", "wholesome, natural, trustworthy"),
    "gastronomia":  ("the freshly made dish with vivid fresh ingredients", "a warm wooden table", "appetizing, fresh, inviting"),
    "finanzas":     ("a clean phone dashboard with rising charts and coins", "a minimal bright desk", "reliable, professional, calm"),
    "tech":         ("a sleek modern device with clean glowing interfaces", "a minimal futuristic space", "innovative, precise"),
    "moda":         ("the garment with rich fabric texture and detail", "a clean editorial set", "aspirational, stylish"),
    "belleza":      ("the skincare bottle with soft drips and creamy texture", "a clean spa-like vanity", "sensorial, premium, soft"),
    "fitness":      ("the product with dynamic athletic energy", "a gym or bright outdoor", "energetic, powerful"),
    "inmobiliaria": ("the bright interior of the property with light pouring in", "spacious sunlit rooms", "aspirational, warm"),
    "educacion":    ("the course material with hands taking notes", "a tidy study desk", "clear, inspiring"),
    "eventos":      ("the event space coming alive with people and lights", "a vibrant venue", "exciting, celebratory"),
    "default":      ("the brand product", "a clean, on-brand set", "premium"),
}
TONE = {"dark": "warm side rim light with deep soft shadows, premium moody key light",
        "light": "bright airy natural daylight, clean soft fill, gentle highlights"}


def build_prompt(brief: dict, img_mode: str, n_images: int, desarrollo: str = "", seconds: int = 10) -> str:
    """Prompt MULTI-SHOT por beats (Subject->Action->Env->Camera->Lighting->Style->Constraints). Si el modelo es
    'multi' referencia las fotos como @Image1..@ImageN; si no, el producto = la imagen frame."""
    b = brief or {}
    subj, place, mood = WORLD.get(b.get("rubro"), WORLD["default"])
    light = TONE.get(b.get("tone"), TONE["dark"])
    if img_mode == "multi" and n_images:
        tags = ", ".join(f"@Image{i + 1}" for i in range(min(n_images, 9)))
        hero = f"the product from {tags}"
    else:
        hero = "the product"
    s = int(seconds)
    mid = max(3, s // 2)
    shots = [
        f"Shot 1 (0-{min(3, mid)}s): {hero} — {subj} — sits on a clean surface in {place}; the camera slowly pushes in toward it in one smooth continuous move.",
        f"Shot 2 ({min(3, mid)}-{mid + 2}s): a slow gentle pan reveals more of {subj} arranged neatly in {place}.",
        f"Shot 3 ({mid + 2}-{s}s): a hand gently reaches in and presents the product, one calm satisfying final beat.",
    ]
    d = re.sub(r'[\r\n]+', ' ', desarrollo or '').strip()[:300]
    lead = f"Creative direction (top priority): {d} " if d else ""   # lo que escribe el usuario va PRIMERO = el modelo lo pesa mas
    glob = (f"{light}; {mood} mood; shallow depth of field, photoreal product texture. "
            f"Vertical 9:16, slow and smooth, seamless. No fast motion, no on-screen text, no captions, no logos, no words.")
    return lead + " ".join(shots) + " " + glob


def _duration(m, seconds):
    ds = m["durations"]
    s = min(ds, key=lambda d: abs(d - int(seconds or 10)))
    fmt = m.get("dur_fmt", "int")
    if fmt == "frames":
        return "num_frames", int(m.get("fps", 30)) * int(s)
    if fmt == "veo":
        return "duration", f"{s}s"
    if fmt == "str":
        return "duration", str(s)
    return "duration", int(s)


async def generate(model_id: str, images, prompt: str, seconds: int = 10, resolution: str = None) -> dict:
    """Genera con el modelo elegido. Arma el input segun su schema. Devuelve {ok, videoUrl, prompt, model}."""
    key = fal_key()
    if not key:
        return {"ok": False, "error": "FAL_KEY no configurada (backend/.env)"}
    m = MODELS_BY_ID.get(model_id) or MODELS[0]
    imgs = [u for u in (images or []) if isinstance(u, str) and u.startswith("http")]
    if not imgs:
        return {"ok": False, "error": "no hay imagenes"}

    inp = {"prompt": prompt}
    if m["img_mode"] == "multi":
        inp[m.get("images_field", "image_urls")] = imgs[:m["max_images"]]
    else:
        inp["image_url"] = imgs[0]
        if m["img_mode"] == "startend" and len(imgs) > 1 and m.get("end_field"):
            inp[m["end_field"]] = imgs[1]
    if m.get("res_field") and m.get("resolutions"):
        inp[m["res_field"]] = resolution if resolution in m["resolutions"] else m["resolutions"][0]
    if m.get("aspect"):
        inp["aspect_ratio"] = "9:16"
    dk, dv = _duration(m, seconds)
    inp[dk] = dv
    if m.get("audio_field"):
        inp[m["audio_field"]] = False

    headers = {"Authorization": f"Key {key}", "Content-Type": "application/json"}
    try:
        import httpx
        async with httpx.AsyncClient(timeout=90.0) as c:
            r = await c.post(FAL_QUEUE + m["slug"], headers=headers, json=inp)
            if r.status_code >= 400:
                return {"ok": False, "error": f"fal submit {r.status_code}: {r.text[:240]}"}
            sub = r.json()
            status_url, resp_url = sub.get("status_url"), sub.get("response_url")
            if not (status_url and resp_url):
                return {"ok": False, "error": f"respuesta fal sin urls: {str(sub)[:200]}"}
            for _ in range(160):                          # ~8 min
                await asyncio.sleep(3)
                st = (await c.get(status_url, headers=headers)).json().get("status", "")
                if st == "COMPLETED":
                    break
                if st in ("FAILED", "ERROR"):
                    return {"ok": False, "error": f"fal status: {st}"}
            data = (await c.get(resp_url, headers=headers)).json()
            vid = (data.get("video") or {}).get("url") or (data.get("video") if isinstance(data.get("video"), str) else None)
            if not vid:
                return {"ok": False, "error": f"fal sin video: {str(data)[:200]}"}
            return {"ok": True, "videoUrl": vid, "prompt": prompt, "model": m["id"], "seed": data.get("seed")}
    except Exception as e:
        return {"ok": False, "error": str(e)[:240]}
