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


# REGISTRY (precios REALES verificados contra las paginas de fal, jun-2026). img_mode: single (1) | startend (1 + frame final) | multi (array, @ImageN).
# dur_fmt: int (10) | str ("10") | veo ("10s") | frames (num_frames = fps*seg). res_field None = la resolucion va en el slug.
# price = costo REAL (casi todos son tiered por resolucion, NO plano por segundo):
#   {"mode":"per_s","rate":r}            -> r * seg                          (mismo a toda resolucion)
#   {"mode":"per_s_res","rates":{...}}   -> rates[res] * seg                 (+ "img_fee" opcional por request)
#   {"mode":"flat","usd":x}              -> x fijo por video
#   {"mode":"pixverse","base":{...},"mult":{seg:m}} -> base[res] * mult[seg]
# dur_caps {res: maxseg}  -> a esa resolucion la duracion no puede superar maxseg (combo invalido en fal).
# img_field               -> nombre del campo de la imagen de entrada (default "image_url"; Kling I2V usa "start_image_url").
# extra {..}              -> params fijos extra del modelo (ej. Sora delete_video=false para que fal no borre el output).
# CINE IA — MENU de modelos de fal, de MAS BARATO a MAS CARO (survey verificado contra fal, jun-2026). Sirven para
# animar el producto (I2V de la imagen real) o un fondo abstracto. Precios reales. Los marcados (nuevo) tienen el
# precio confirmado pero el schema exacto de inputs se confirma en la 1ra llamada (generate() devuelve el error de fal).
# OJO: en varios el I2V NO tiene param aspect -> el 9:16 sale de la imagen de entrada.
MODELS = [
    # ───────── BARATOS ─────────
    {"id": "longcat-d720", "label": "LongCat distilled 720p — $0.01/s (lo más barato)", "desc": "El más barato creíble. 720p, $0.01/s plano (10s=$0.10). Pans suaves de producto, para iterar/volumen.",
     "slug": "fal-ai/longcat-video/distilled/image-to-video/720p", "price_s": 0.01, "price": {"mode": "per_s", "rate": 0.01}, "max_images": 1, "img_mode": "single",
     "resolutions": [], "res_field": None, "durations": [5, 8, 10], "dur_fmt": "frames", "fps": 30, "aspect": False, "audio_field": None},
    {"id": "wan22-turbo", "label": "Wan 2.2 Turbo — desde $0.05 (estilizado) (nuevo)", "desc": "Movimiento estilizado barato por VIDEO: $0.05 480p / $0.075 580p / $0.10 720p (~5s). Bueno para motion-graphics.",
     "slug": "fal-ai/wan/v2.2-a14b/image-to-video/turbo", "price_s": 0.02, "price": {"mode": "per_s_res", "rates": {"480p": 0.01, "580p": 0.015, "720p": 0.02}}, "max_images": 1, "img_mode": "single",
     "resolutions": ["480p", "580p", "720p"], "res_field": "resolution", "durations": [5], "dur_fmt": "frames", "fps": 16, "aspect": True, "audio_field": None},
    {"id": "hunyuan15", "label": "Hunyuan 1.5 — $0.075/s (480p)", "desc": "Movimiento barato 480p ($0.075/s, ~5s = $0.375). Blando para overlay premium; relleno.",
     "slug": "fal-ai/hunyuan-video-v1.5/image-to-video", "price_s": 0.075, "price": {"mode": "per_s", "rate": 0.075}, "max_images": 1, "img_mode": "single",
     "resolutions": [], "res_field": None, "durations": [5], "dur_fmt": "frames", "fps": 24, "aspect": True, "audio_field": None},
    {"id": "ltx23-fast", "label": "LTX-2.3 Fast — $0.04/s 1080p (motion-graphics ⭐)", "desc": "El mejor barato para MOTION-GRAPHICS: 1080p nativo $0.04/s (10s=$0.40), 1440p $0.08/s, 4K $0.16/s. 9:16 + audio. Acepta frame final.",
     "slug": "fal-ai/ltx-2.3/image-to-video/fast", "price_s": 0.04, "price": {"mode": "per_s_res", "rates": {"1080p": 0.04, "1440p": 0.08, "2160p": 0.16}}, "max_images": 2, "img_mode": "startend", "end_field": "end_image_url",
     "resolutions": ["1080p", "1440p", "2160p"], "res_field": "resolution", "durations": [6, 8, 10], "dur_fmt": "int", "aspect": True, "audio_field": "generate_audio"},
    {"id": "pixverse55", "label": "PixVerse v5.5 — 1080p 5s $0.40 (animado)", "desc": "Look estilizado/animado. 1080p 5s $0.40, 8s $0.80 (1080p NO en 10s; 10s solo <=720p).",
     "slug": "fal-ai/pixverse/v5.5/image-to-video", "price_s": 0.08, "price": {"mode": "pixverse", "base": {"540p": 0.15, "720p": 0.20, "1080p": 0.40}, "mult": {"5": 1, "8": 2, "10": 2.2}}, "dur_caps": {"1080p": 8}, "max_images": 1, "img_mode": "single",
     "resolutions": ["540p", "720p", "1080p"], "res_field": "resolution", "durations": [5, 8, 10], "dur_fmt": "int", "aspect": False, "audio_field": "generate_audio_switch"},
    {"id": "seedance1-pro-fast", "label": "Seedance v1 Pro Fast — 1080p $0.0486/s", "desc": "Camino barato a 1080p nítido: $0.0486/s (10s=$0.49); 720p la mitad. Buena adherencia.",
     "slug": "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video", "price_s": 0.0486, "price": {"mode": "per_s_res", "rates": {"480p": 0.0096, "720p": 0.0216, "1080p": 0.0486}}, "max_images": 1, "img_mode": "single",
     "resolutions": ["480p", "720p", "1080p"], "res_field": "resolution", "durations": [4, 5, 6, 8, 10], "dur_fmt": "str", "aspect": True, "audio_field": None},
    # ───────── MEDIOS ─────────
    {"id": "kling25-turbo-pro", "label": "Kling 2.5 Turbo Pro — 10s $0.70 (recomendado calidad/precio) (nuevo)", "desc": "Gran relación calidad/precio: 1080p ~$0.07/s (10s=$0.70). Movimiento premium fluido. 9:16 por imagen.",
     "slug": "fal-ai/kling-video/v2.5-turbo/pro/image-to-video", "price_s": 0.07, "price": {"mode": "per_s", "rate": 0.07}, "max_images": 1, "img_mode": "single",
     "resolutions": [], "res_field": None, "durations": [5, 10], "dur_fmt": "int", "aspect": False, "audio_field": "generate_audio"},
    {"id": "pika22", "label": "Pika v2.2 — 10s $0.90 (efectos) (nuevo)", "desc": "Bueno para efectos creativos/transiciones. ~$0.09/s (10s=$0.90). 720p/1080p.",
     "slug": "fal-ai/pika/v2.2/image-to-video", "price_s": 0.09, "price": {"mode": "per_s", "rate": 0.09}, "max_images": 1, "img_mode": "single",
     "resolutions": ["720p", "1080p"], "res_field": "resolution", "durations": [5], "dur_fmt": "int", "aspect": True, "audio_field": None},
]
# (quitados los que pasan de $1 por 10s: Kling v3 pro $1.12, Wan 2.5 $1.50, Kling 2.1 Master $2.80, Sora 2 pro $5.60,
#  Seedance 2.0 $6.82. Si en algun momento se quiere un "hero" caro, se re-agregan.)
MODELS_BY_ID = {m["id"]: m for m in MODELS}


def public_models():
    """Lo que el frontend muestra para elegir (sin detalles internos del schema). Incluye `price` para estimar el costo REAL por resolucion."""
    return [{"id": m["id"], "label": m["label"], "desc": m["desc"], "price_s": m["price_s"], "price": m.get("price"),
             "max_images": m["max_images"], "img_mode": m["img_mode"], "dur_caps": m.get("dur_caps", {}),
             "resolutions": m.get("resolutions", []), "durations": m["durations"]} for m in MODELS]


def estimate_cost(model_id: str, resolution: str = "", seconds: int = 10) -> float:
    """Costo REAL estimado (la misma logica que el frontend, para validar server-side)."""
    m = MODELS_BY_ID.get(model_id) or MODELS[0]
    p = m.get("price") or {"mode": "per_s", "rate": m.get("price_s", 0.04)}
    s = int(seconds or 0)
    if p["mode"] == "flat":
        return float(p["usd"])
    if p["mode"] == "per_s":
        return p["rate"] * s
    if p["mode"] == "per_s_res":
        rates = p["rates"]
        r = rates.get(resolution) or next(iter(rates.values()))
        return r * s + p.get("img_fee", 0.0)
    if p["mode"] == "pixverse":
        base = p["base"].get(resolution) or p["base"].get("720p")
        mult = p["mult"].get(str(s)) or (s / 5.0)
        return base * mult
    return m.get("price_s", 0.04) * s


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
    """Prompt de MOTION GRAPHICS (NO foto-realismo, NO personas/manos, NO escenas de la vida real). El producto es un
    HERO flotante rodeado de formas/gradientes/particulas en los colores de la marca. La 'desarrollo' del usuario manda.
    OJO: en I2V el modelo arranca de la FOTO del producto -> no sale 100% plano; los negativos empujan a lo grafico."""
    b = brief or {}
    if img_mode == "multi" and n_images:
        tags = ", ".join(f"@Image{i + 1}" for i in range(min(n_images, 9)))
        hero = f"the product ({tags})"
    else:
        hero = "the product"
    acc = (b.get("brandColor") or "").strip()
    palette = f"in the brand color palette ({acc})" if re.match(r'^#?[0-9A-Fa-f]{6}$', acc) else "in a cohesive premium color palette"
    d = re.sub(r'[\r\n]+', ' ', desarrollo or '').strip()[:300]
    lead = f"Creative direction (top priority): {d} " if d else ""   # lo que escribe el usuario va PRIMERO = pesa mas
    body = (f"Motion graphics animation {palette}. {hero} as a clean floating hero element that slowly rotates and "
            "drifts, surrounded by flowing abstract geometric shapes, smooth color gradients, glowing light streaks and "
            "floating particles. Kinetic premium branded-explainer / After Effects aesthetic, flat 2D-3D motion design, "
            "soft glow, smooth continuous camera, seamless loop. ")
    neg = ("STRICT NEGATIVE: no people, no hands, no human body parts, no realistic kitchen/room/office, no photographic "
           "real-world environment, no live-action footage, no on-screen text, no logos, no words. Pure graphic motion "
           "design. Vertical 9:16.")
    return lead + body + neg


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


async def generate(model_id: str, images, prompt: str, seconds: int = 10, resolution: str = None, on_status=None) -> dict:
    """Genera con el modelo elegido. Arma el input segun su schema. Devuelve {ok, videoUrl, prompt, model}.
    on_status(status, queue_position) se llama cuando cambia el estado en fal (IN_QUEUE/IN_PROGRESS/...) para reportar progreso."""
    key = fal_key()
    if not key:
        return {"ok": False, "error": "FAL_KEY no configurada (backend/.env)"}
    m = MODELS_BY_ID.get(model_id) or MODELS[0]
    imgs = [u for u in (images or []) if isinstance(u, str) and u.startswith("http")]
    if not imgs:
        return {"ok": False, "error": "no hay imagenes"}

    # resolucion elegida (o la primera del modelo) y duracion ya CLAMPEADA por los limites del combo (ej. pixverse 1080p max 8s)
    res_sel = resolution if (m.get("res_field") and resolution in m.get("resolutions", [])) else (m.get("resolutions") or [None])[0]
    secs = int(seconds or 10)
    cap = (m.get("dur_caps") or {}).get(res_sel)
    if cap and secs > cap:
        secs = cap

    img_field = m.get("img_field", "image_url")   # Kling I2V usa "start_image_url"
    inp = {"prompt": prompt}
    if m["img_mode"] == "multi":
        inp[m.get("images_field", "image_urls")] = imgs[:m["max_images"]]
    else:
        inp[img_field] = imgs[0]
        if m["img_mode"] == "startend" and len(imgs) > 1 and m.get("end_field"):
            inp[m["end_field"]] = imgs[1]
    if m.get("params") != "image_only":          # 'image_only' = el modelo SOLO acepta prompt + imagen
        if m.get("res_field") and res_sel:
            inp[m["res_field"]] = res_sel
        if m.get("aspect"):
            inp["aspect_ratio"] = "9:16"
        dk, dv = _duration(m, secs)
        inp[dk] = dv
        if m.get("audio_field"):
            inp[m["audio_field"]] = False
    inp.update(m.get("extra", {}))               # params fijos extra (ej. Sora delete_video=false)

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
            req_id = sub.get("request_id", "?")
            last = ""
            for _ in range(300):                          # ~15 min (la cola de fal puede demorar, sobre todo el 1er pedido)
                await asyncio.sleep(3)
                try:
                    sj = (await c.get(status_url, headers=headers)).json()
                except Exception:
                    continue                              # un GET que falla no aborta la espera
                st = sj.get("status", "")
                if st and st != last:                     # avisar progreso solo cuando cambia el estado
                    last = st
                    if on_status:
                        try:
                            on_status(st, sj.get("queue_position"))
                        except Exception:
                            pass
                if st == "COMPLETED":
                    break
                if st in ("FAILED", "ERROR"):
                    return {"ok": False, "error": f"fal status {st}: {str(sj)[:160]}"}
            else:                                          # el for termino sin 'break' = timeout
                return {"ok": False, "error": f"fal tardo demasiado (sigue en cola/procesando ~15 min). La generacion puede seguir en fal; proba de nuevo en un rato. request_id={req_id}"}
            # COMPLETED: traer el resultado (con reintentos por si tarda un instante en publicarse)
            data = {}
            for _ in range(4):
                data = (await c.get(resp_url, headers=headers)).json()
                if data.get("video"):
                    break
                await asyncio.sleep(2)
            vid = (data.get("video") or {}).get("url") or (data.get("video") if isinstance(data.get("video"), str) else None)
            if not vid:
                return {"ok": False, "error": f"fal sin video: {str(data)[:200]}"}
            return {"ok": True, "videoUrl": vid, "prompt": prompt, "model": m["id"], "seed": data.get("seed")}
    except Exception as e:
        return {"ok": False, "error": str(e)[:240]}
