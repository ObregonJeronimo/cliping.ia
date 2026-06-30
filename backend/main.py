import asyncio
import hashlib
import json
import re
import time
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel


OUTPUTS_DIR = Path("outputs")
OUTPUTS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="cliping.ia backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
    expose_headers=["*"],
)

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
from fastapi import Request
from fastapi.responses import Response

@app.middleware("http")
async def add_ngrok_header(request: Request, call_next):
    # Para preflight OPTIONS, responder inmediatamente con los headers correctos
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "ngrok-skip-browser-warning": "true",
            }
        )
    response = await call_next(request)
    response.headers["ngrok-skip-browser-warning"] = "true"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


jobs: dict[str, dict] = {}

@app.get("/")
def root():
    return {"status": "ok", "service": "cliping.ia"}

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        return {"error": "not found"}
    return jobs[job_id]

@app.get("/api/video/{filename}")
def serve_video(filename: str):
    path = OUTPUTS_DIR / filename
    if not path.exists():
        return {"error": "not found"}
    return FileResponse(path, media_type="video/mp4")


# ─── Firebase Admin SDK para guardar jobs y descontar créditos ─────────────
import os, json
from pathlib import Path

_firebase_admin_initialized = False
_firestore_client = None

def get_firestore():
    global _firebase_admin_initialized, _firestore_client
    if _firestore_client:
        return _firestore_client
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as fs_admin

        if not _firebase_admin_initialized:
            cred_path = Path("firebase-service-account.json")
            if cred_path.exists():
                cred = credentials.Certificate(str(cred_path))
                firebase_admin.initialize_app(cred)
                _firebase_admin_initialized = True
            else:
                print("[firebase] No se encontró firebase-service-account.json — guardado en Firestore deshabilitado")
                return None

        _firestore_client = fs_admin.client()
        return _firestore_client
    except Exception as e:
        print(f"[firebase] Error inicializando: {e}")
        return None


# ─── CINEMATIC FORGE ENDPOINTS ───────────────────────────────────────────────
import asyncio as _asyncio

# Jobs de forge activos
forge_jobs: dict = {}


# ─── CINE — RENDER DE CINEMATOGRAFÍAS COMPLETAS ──────────────────────────────


# ─── VIDEO POR PLANTILLAS (director + escenas) ───────────────────────────────
import template_director
import timeline_director
import brand_dna
import perception
import seedance
import re as _re


def _get_rating_bias(db, user_id: str) -> dict:
    """Agrega los ratings 👍/👎 del usuario por dimensión de receta -> el director sesga la rotación
    hacia lo que puntuó bien y evita lo que puntuó mal. Best-effort; sin ratings -> dict vacío
    (no cambia nada). Es el cierre del loop de feedback."""
    out = {"angles": {}, "arts": {}, "decors": {}, "hooks": {}, "arcs": {}, "styles": {}, "themes": {}}
    if not (db and user_id):
        return out
    try:
        snap = db.collection("users").document(user_id).collection("videos").get()
        DIMS = [("angle", "angles"), ("artName", "arts"), ("decorName", "decors"),
                ("hookName", "hooks"), ("arcName", "arcs"), ("editStyle", "styles"), ("theme", "themes")]
        for d in snap:
            v = d.to_dict() or {}
            r = v.get("rating", 0)
            if not r:
                continue
            rec = v.get("recipe") or {}
            for kspec, kdim in DIMS:
                val = rec.get(kspec) or v.get(kspec)
                if val:
                    out[kdim][val] = out[kdim].get(val, 0) + r
    except Exception as e:
        print(f"[rating] bias falló: {e}")
    return out


def _brand_key(url: str) -> str:
    """Clave estable por marca/dominio para el historial de estilos (rotacion de variedad por marca)."""
    host = _re.sub(r"^https?://(www\.)?", "", (url or "").strip().lower()).split("/")[0]
    key = _re.sub(r"[^a-z0-9]+", "_", host).strip("_")
    return key or "sin_url"


def _brand_cache_key(url: str) -> str:
    """Clave del CACHE de analisis POR URL (no por dominio): dominio + path normalizado. Asi dos paginas
    distintas del mismo sitio (/, /precios, /producto-x) NO comparten el analisis cacheado (antes se pisaban)."""
    u = _re.sub(r"^https?://(www\.)?", "", (url or "").strip().lower())
    u = u.split("#")[0].split("?")[0].rstrip("/")   # ignora fragment/query/trailing slash
    key = _re.sub(r"[^a-z0-9]+", "_", u).strip("_")
    return key or "sin_url"


def _content_fingerprint(site) -> str:
    """Huella estable del CONTENIDO capturado (titulo + descripcion + texto). Si la pagina cambia, cambia la
    huella -> el cache se invalida y se RE-ANALIZA aunque no hayan pasado los 14 dias. La captura corre fresca
    en cada pedido, asi que comparar la huella es gratis (no gasta IA salvo cuando la pagina realmente cambio)."""
    try:
        c = (site or {}).get("content") if isinstance(site, dict) else None
        if not c:
            return ""
        raw = json.dumps(c, ensure_ascii=False, sort_keys=True) if isinstance(c, (dict, list)) else str(c)
        norm = _re.sub(r"\s+", " ", raw.lower()).strip()[:8000]
        return hashlib.sha1(norm.encode("utf-8")).hexdigest()
    except Exception:
        return ""


def _dominant_accent(image_path: str):
    """Color de marca dominante y VIBRANTE del screenshot, para usar de acento cuando el sitio
    no expone un theme-color usable. Descarta grises/negros/blancos. Devuelve '#rrggbb' o None.
    Requiere Pillow; si no está, devuelve None (no rompe)."""
    try:
        from PIL import Image
    except Exception:
        return None
    try:
        img = Image.open(image_path).convert("RGB").resize((64, 64))
    except Exception:
        return None
    buckets = {}
    for r, g, b in img.getdata():
        mx, mn = max(r, g, b), min(r, g, b)
        if (mx - mn) < 55 or mx < 60 or mx > 235:   # poco saturado / muy oscuro / muy claro
            continue
        key = (r // 32, g // 32, b // 32)
        acc = buckets.setdefault(key, [0, 0, 0, 0])
        acc[0] += r; acc[1] += g; acc[2] += b; acc[3] += 1
    if not buckets:
        return None
    best = max(buckets.values(), key=lambda a: a[3])
    n = best[3]
    return f"#{best[0] // n:02x}{best[1] // n:02x}{best[2] // n:02x}"


async def _rehost_images(urls, job_id: str, limit: int = 3):
    """Baja imágenes reales del sitio y las re-hostea en Cloudinary (URLs confiables para Remotion).
    Filtra por content-type y tamaño real (descarta iconos/logos chicos). Devuelve solo las que
    subieron OK (puede ser []). Con guardas: si algo falla, se saltea esa imagen, no rompe."""
    out = []
    if not urls:
        return out
    try:
        import httpx
        from cloudinary_upload import upload_image
    except Exception as e:
        print(f"[video] rehost imgs: deps no disponibles ({e})")
        return out
    n = 0
    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (compatible; clipingbot/1.0)"}) as c:
            for u in urls:
                if n >= limit:
                    break
                try:
                    r = await c.get(u)
                    if r.status_code != 200 or not r.content:
                        continue
                    ct = r.headers.get("content-type", "")
                    if "image" not in ct or "svg" in ct:
                        continue
                    ext = ".jpg" if ("jpeg" in ct or "jpg" in ct) else ".webp" if "webp" in ct else ".png"
                    p = str(OUTPUTS_DIR / f"{job_id}_img{n}{ext}")
                    with open(p, "wb") as f:
                        f.write(r.content)
                    # Filtro de tamaño real: descartar imágenes chicas (probables iconos/logos).
                    try:
                        from PIL import Image
                        w, h = Image.open(p).size
                        if w < 500 or h < 300:
                            continue
                    except Exception:
                        pass
                    up = await upload_image(p, f"siteimg_{job_id[:8]}_{n}")
                    if up:
                        out.append(up)
                        n += 1
                except Exception as ie:
                    print(f"[video] rehost img saltada ({ie})")
    except Exception as e:
        print(f"[video] rehost imgs error: {e}")
    return out


def _get_recent_profile(db, user_id: str, brand_key: str) -> dict:
    """Perfil de rotación reciente de esta marca/usuario: estilos, ángulos, paletas y artes
    usados (reciente primero). Sirve para que dos videos de la misma marca NO se repitan."""
    empty = {"styles": [], "angles": [], "themes": [], "arts": [], "decors": [], "hooks": [], "arcs": []}
    if not (db and user_id):
        return empty
    try:
        doc = db.collection("users").document(user_id).collection("style_history").document(brand_key).get()
        if doc.exists:
            d = doc.to_dict() or {}
            return {
                "styles": d.get("recent", []) or [],          # compat con docs viejos
                "angles": d.get("recent_angles", []) or [],
                "themes": d.get("recent_themes", []) or [],
                "arts":   d.get("recent_arts", []) or [],
                "decors": d.get("recent_decors", []) or [],
                "hooks":  d.get("recent_hooks", []) or [],
                "arcs":   d.get("recent_arcs", []) or [],
            }
    except Exception as e:
        print(f"[styles] leer historial falló: {e}")
    return empty


def _push_recent_profile(db, user_id: str, brand_key: str, spec: dict):
    """Agrega lo recién usado a cada eje del historial (cap 4, reciente primero)."""
    if not (db and user_id and isinstance(spec, dict)):
        return
    try:
        prev = _get_recent_profile(db, user_id, brand_key)

        def _bump(lst, val):
            return ([val] + [x for x in lst if x != val])[:4] if val else lst[:4]

        db.collection("users").document(user_id).collection("style_history").document(brand_key).set({
            "brand_key": brand_key,
            "recent":         _bump(prev["styles"], spec.get("editStyle", "")),
            "recent_angles":  _bump(prev["angles"], spec.get("angle", "")),
            "recent_themes":  _bump(prev["themes"], spec.get("theme", "")),
            "recent_arts":    _bump(prev["arts"],   spec.get("artName", "")),
            "recent_decors":  _bump(prev["decors"], spec.get("decorName", "")),
            "recent_hooks":   _bump(prev["hooks"],  spec.get("hookName", "")),
            "recent_arcs":    _bump(prev["arcs"],   spec.get("arcName", "")),
        })
    except Exception as e:
        print(f"[styles] guardar historial falló: {e}")


_BRAND_CACHE_TTL = 14 * 24 * 3600  # 14 días: la identidad visual de un sitio casi nunca cambia


def _get_brand_cache(db, user_id: str, brand_key: str, fresh_hash: str = ""):
    """Análisis cacheado de una URL (ADN visual + hechos de marca). Devuelve dict o None si no hay/venció/cambió.
    Evita re-analizar la misma página en cada video -> baja costos. El VIDEO igual sale distinto.
    Invalida si: pasó el TTL (14d) O la página cambió de contenido (fresh_hash != el guardado)."""
    if not (db and user_id):
        return None
    try:
        doc = db.collection("users").document(user_id).collection("brand_cache").document(brand_key).get()
        if not doc.exists:
            return None
        d = doc.to_dict() or {}
        if (time.time() - float(d.get("ts", 0))) > _BRAND_CACHE_TTL:
            return None
        # Invalidación por CONTENIDO: si la página cambió (huella distinta), no reuses el análisis viejo.
        stored = d.get("content_hash") or ""
        if fresh_hash and stored and stored != fresh_hash:
            print(f"[cache] '{brand_key}' cambió de contenido -> re-analizo ({stored[:8]} != {fresh_hash[:8]})")
            return None
        return d
    except Exception as e:
        print(f"[cache] leer análisis falló: {e}")
        return None


def _set_brand_cache(db, user_id: str, brand_key: str, dna: dict, brand: str, content_hash: str = "", url: str = ""):
    """Guarda el análisis (ADN + hechos + huella de contenido) de una URL. Best-effort. Multi-página: cada
    URL queda cacheada por separado (clave con path; se gestionan/borran desde la lista en Animaciones).
    Guarda también la URL ORIGINAL -> la lista de Animaciones muestra el link real, no el slug normalizado."""
    if not (db and user_id):
        return
    try:
        col = db.collection("users").document(user_id).collection("brand_cache")
        col.document(brand_key).set({
            "brand_key": brand_key, "dna": dna or {}, "brand": brand or "", "ts": time.time(),
            "content_hash": content_hash or "", "url": (url or "").strip(),
        })
        print(f"[cache] análisis guardado para {brand_key} (se reusa salvo que la página cambie o pasen 14 días)")
    except Exception as e:
        print(f"[cache] guardar análisis falló: {e}")


class ClearBrandCacheRequest(BaseModel):
    userId: str = ""


@app.post("/api/brand-cache/clear")
async def brand_cache_clear(req: ClearBrandCacheRequest):
    """TESTING: borra el análisis de marca guardado del usuario (todas las URLs), así un análisis
    viejo no queda pegado 14 días mientras iterás el look. Best-effort."""
    db = get_firestore()
    if not db:
        return {"deleted": 0, "error": "sin Firestore"}
    if not req.userId:
        return {"deleted": 0, "error": "falta userId"}
    try:
        col = db.collection("users").document(req.userId).collection("brand_cache")
        n = 0
        for d in col.stream():
            d.reference.delete()
            n += 1
        print(f"[cache] borrado manual: {n} doc(s) de brand_cache de {req.userId}")
        return {"deleted": n, "error": ""}
    except Exception as e:
        print(f"[cache] borrado manual falló: {e}")
        return {"deleted": 0, "error": str(e)}


# ─── URVID 1.0 — SHARE (puente para que Claude vea el video). El estudio manda el {brief, seed, recipe} del
#     video que el usuario esta viendo; lo guardamos en un archivo del repo (tools/urvid-shared.json). Como el
#     motor es DETERMINISTA, Claude regenera el video EXACTO desde ahi (node tools/urvid1-shot.mjs) y lo ve. ──
class UrvidShareRequest(BaseModel):
    brief: dict | None = None
    seed: int = 0
    recipe: dict | None = None
    note: str = ""


@app.post("/api/urvid/share")
async def urvid_share(req: UrvidShareRequest):
    if not req.brief:
        return {"ok": False, "error": "falta el brief"}
    p = Path(__file__).parent.parent / "tools" / "urvid-shared.json"   # raiz del repo cliping.ia/tools/
    try:
        prev = []
        if p.exists():
            try:
                prev = json.loads(p.read_text(encoding="utf-8")) or []
            except Exception:
                prev = []
            if not isinstance(prev, list):
                prev = []
        entry = {"brief": req.brief, "seed": int(req.seed or 0), "recipe": req.recipe or {},
                 "note": req.note or "", "ts": datetime.utcnow().isoformat()}
        prev = ([entry] + prev)[:20]   # ultimos 20, mas nuevo primero
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(prev, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[share] urvid video compartido: {req.brief.get('brand')} (seed {req.seed}) -> {p.name}")
        return {"ok": True, "count": len(prev)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


# ─── URVID 1.0 — PERCEPTION (URL -> brief). El front (Urvid1Studio) hace makeVideo(brief) en el navegador ───
class PerceiveRequest(BaseModel):
    url: str = ""
    desarrollo: str = ""
    userId: str = ""
    refresh: bool = False   # True = ignora el cache y re-analiza


_urvid_brief_cache: dict = {}   # in-memory: "ckey|chash" -> brief (rapido; se pierde al reiniciar el backend)


def _get_urvid_brief_fs(db, uid, ckey, chash):
    """Brief cacheado de una URL en Firestore. None si no hay / vencio (14d) / la pagina cambio de contenido."""
    if not (db and uid):
        return None
    try:
        doc = db.collection("users").document(uid).collection("urvid_briefs").document(ckey).get()
        if not doc.exists:
            return None
        d = doc.to_dict() or {}
        if (time.time() - float(d.get("ts", 0))) > _BRAND_CACHE_TTL:
            return None
        if chash and d.get("content_hash") and d["content_hash"] != chash:
            return None
        return d.get("brief")
    except Exception as e:
        print(f"[perceive] cache leer fallo: {e}")
        return None


def _set_urvid_brief_fs(db, uid, ckey, brief, chash, url):
    if not (db and uid):
        return
    try:
        db.collection("users").document(uid).collection("urvid_briefs").document(ckey).set({
            "brief": brief, "content_hash": chash or "", "ts": time.time(), "url": (url or "").strip()})
    except Exception as e:
        print(f"[perceive] cache guardar fallo: {e}")


@app.post("/api/urvid/perceive")
async def urvid_perceive(req: PerceiveRequest):
    """Analiza una pagina/URL (como el motor viejo: brand_dna lee el screenshot + el texto capturado) y devuelve el
    BRIEF de urvid 1.0 ({brand,rubro,tone,brandColor,tagline,claim,cta,seriousness}). CACHE por URL (in-memory +
    Firestore, invalida si la pagina cambia o pasan 14 dias) -> la MISMA pagina NO re-llama a Claude. La captura NO
    se dibuja en el video (el video es generado); el screenshot solo se usa para leer color/mood. Best-effort."""
    if not req.url.strip() and not req.desarrollo.strip():
        return {"error": "Necesitas una URL o una descripcion"}
    site = {"screenshot": None, "content": None, "logo": "", "images": []}
    if req.url.strip():
        try:
            import site_capture
            site = await site_capture.capture_all(
                req.url.strip(), str(OUTPUTS_DIR / f"perceive_{uuid.uuid4().hex[:8]}.png"))
        except Exception as e:
            print(f"[perceive] capture_all fallo (sigo con lo que haya): {e}")
    # SCREENSHOT del HERO (HD, 2x) -> Cloudinary. Lo usa Cine IA como semilla del fondo de IA cuando la pagina NO tiene
    # imagenes de producto usables (asi NO depende solo de fotos del sitio). Best-effort (si falla, screenshotUrl = "").
    screenshot_url = ""
    if site.get("screenshot"):
        try:
            from cloudinary_upload import upload_image
            screenshot_url = await upload_image(site["screenshot"], f"shot_{uuid.uuid4().hex[:8]}") or ""
        except Exception as e:
            print(f"[perceive] upload screenshot fallo: {e}")
    # "v2-": version del SCHEMA del brief (claim/tagline/cta + bullets/stats/proof). Bumpear si cambia el shape ->
    # invalida cache vieja (no servir briefs sin el material nuevo). El cache por URL sigue evitando re-llamar a Claude.
    ckey = "v7-" + _brand_cache_key(req.url)   # v7: idioma solo si latino (no-latino->español, anti-tofu) + bot-wall + guardrail + stats sin simbolos decorativos (tofu) + bullets completos (prompt: frase con sentido, no fragmentos) + copy en el IDIOMA de la pagina (content.lang) + audience (who/register/awareness)
    chash = _content_fingerprint(site)
    # memkey scopeado POR USUARIO: antes el cache in-memory cruzaba usuarios (el analisis de A se servia a B). El de
    # Firestore ya era por uid; ahora el in-memory tambien.
    memkey = (req.userId or "") + "|" + ckey + "|" + chash
    db = get_firestore()
    if not req.refresh:
        cached = _urvid_brief_cache.get(memkey) or _get_urvid_brief_fs(db, req.userId, ckey, chash)
        if cached:
            print(f"[perceive] '{req.url}' desde CACHE")
            return {"brief": cached, "source": {}, "cost": {}, "cached": True, "images": site.get("images") or [], "screenshotUrl": screenshot_url}
    usage = []
    # UNA sola llamada multimodal (texto + screenshot juntos) -> brief rico. Mas robusto Y mas barato que 2 llamadas.
    brief = await perception.analyze_to_brief(req.url.strip(), req.desarrollo.strip(), site=site, usage=usage)
    # ultimo fallback de color: dominante vibrante del screenshot.
    if site.get("screenshot") and brief.get("brandColor", "#5b8cff") == "#5b8cff":
        try:
            col = _dominant_accent(site["screenshot"])
            if col:
                brief["brandColor"] = col
        except Exception as e:
            print(f"[perceive] accent desde screenshot fallo: {e}")
    parse_ok = brief.pop("_parse_ok", True)   # señal interna; no se cachea ni se envia al cliente
    if chash and parse_ok:   # solo cacheamos con captura real Y JSON valido (un brief que fallo no queda pegado 14 dias)
        _urvid_brief_cache[memkey] = brief
        _set_urvid_brief_fs(db, req.userId, ckey, brief, chash, req.url)
    cost = template_director.usage_cost(usage) if usage else {}
    src = {"title": (site.get("content") or {}).get("title", "") if isinstance(site.get("content"), dict) else "",
           "logo": site.get("logo", "")}
    print(f"[perceive] '{req.url}' -> {brief.get('brand')} / {brief.get('rubro')} / {brief.get('brandColor')} (parse_ok={parse_ok})")
    return {"brief": brief, "source": src, "cost": cost, "cached": False, "parse_ok": parse_ok, "images": site.get("images") or [], "screenshotUrl": screenshot_url}


class CineAnalyzeRequest(BaseModel):
    url: str = ""   # URL del video (mp4) de IA a analizar


@app.post("/api/cine/analyze")
async def cine_analyze(req: CineAnalyzeRequest):
    """Cine IA: analiza un clip de IA -> beats (timings, cortes, zona legible, color) para que el motor coloque el
    texto del brief en los momentos/zonas correctos. Backend: ffmpeg (cortes+frames) + numpy/Pillow. Sin deps nuevas."""
    if not req.url.strip():
        return {"error": "falta la URL del video"}
    import video_analyze
    return await video_analyze.analyze(req.url.strip())


# ─── SEEDANCE — video generativo IA (fal.ai) desde las imagenes reales del sitio + prompt por beats ──────────
class SeedanceRequest(BaseModel):
    images: list[str] = []        # URLs de imagenes REALES del sitio elegidas por el usuario (1a = primer frame)
    brief: dict | None = None     # brief de la perception (para armar el prompt si no viene uno)
    desarrollo: str = ""          # notas del usuario que priorizan el prompt
    prompt: str = ""              # prompt explicito; si viene se usa tal cual, si no se arma del brief
    model: str = "ltx23-fast"     # id del modelo de seedance.MODELS (LTX-2.3 Fast por defecto = barato + 9:16)
    seconds: int = 10
    resolution: str = ""          # resolucion elegida; vacio = el default del modelo
    userId: str = ""


@app.get("/api/seedance/models")
def seedance_models():
    """Lista de modelos de video IA (Cine IA) para que el front muestre el selector: id, label, desc, precio,
    cuantas imagenes acepta, resoluciones y duraciones."""
    return {"models": seedance.public_models()}


class PromptPreviewRequest(BaseModel):
    brief: dict | None = None
    model: str = "ltx23-fast"
    images: int = 1
    desarrollo: str = ""
    seconds: int = 10


@app.post("/api/seedance/prompt")
def seedance_prompt(req: PromptPreviewRequest):
    """Devuelve el prompt por beats armado del analisis -> el front lo muestra EDITABLE antes de generar."""
    m = seedance.MODELS_BY_ID.get(req.model) or seedance.MODELS[0]
    return {"prompt": seedance.build_prompt(req.brief or {}, m["img_mode"], max(1, int(req.images or 1)), req.desarrollo, req.seconds)}


@app.post("/api/seedance/generate")
async def seedance_generate(req: SeedanceRequest):
    """Genera UN clip con Seedance (I2V) desde la(s) imagen(es) elegida(s) + prompt detallado. Job-based: el front
    pollea /api/jobs/{job_id} y lee videoUrl al terminar. El costo lo paga la FAL_KEY (.env); extraer imagenes = $0."""
    if not req.images:
        return {"error": "Elegi al menos una imagen del sitio"}
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"id": job_id, "status": "queued", "step": "seedance", "progress": 5,
                    "videoUrl": "", "cloudinaryUrl": "", "prompt": "", "error": None,
                    "createdAt": datetime.utcnow().isoformat()}
    asyncio.create_task(_run_seedance(job_id, req))
    return {"job_id": job_id}


async def _run_seedance(job_id: str, req: SeedanceRequest):
    try:
        m = seedance.MODELS_BY_ID.get(req.model) or seedance.MODELS[0]
        prompt = (req.prompt or "").strip() or seedance.build_prompt(
            req.brief or {}, m["img_mode"], len(req.images), req.desarrollo, req.seconds)
        jobs[job_id].update({"status": "processing", "step": f"enviando a {m['label']}",
                             "progress": 20, "prompt": prompt})
        print(f"[seedance] job {job_id[:8]} -> {m['id']}, {len(req.images)} img, {req.seconds}s {req.resolution}")

        def _on_status(st, qpos=None):                    # refleja el estado de la cola de fal en el job
            human = {"IN_QUEUE": "en cola en fal" + (f" (#{qpos})" if qpos is not None else ""),
                     "IN_PROGRESS": "generando en fal"}.get(st, st or "procesando")
            jobs[job_id].update({"step": human, "progress": 45 if st == "IN_PROGRESS" else 30})

        res = await seedance.generate(req.model, req.images, prompt, req.seconds, req.resolution, on_status=_on_status)
        if res.get("ok"):
            jobs[job_id].update({"status": "done", "step": "done", "progress": 100,
                                 "videoUrl": res["videoUrl"], "cloudinaryUrl": res["videoUrl"],
                                 "prompt": prompt, "seed": res.get("seed")})
            print(f"[seedance] OK -> {res['videoUrl']}")
        else:
            jobs[job_id].update({"status": "error", "error": res.get("error", "fallo desconocido")})
            print(f"[seedance] ERROR: {res.get('error')}")
    except Exception as e:
        jobs[job_id].update({"status": "error", "error": str(e)[:300]})
        print(f"[seedance] EXCEPTION: {e}")


class VideoGenRequest(BaseModel):
    url: str = ""
    desarrollo: str = ""
    proposito: str = "marketing"
    theme: str = ""        # override opcional del theme
    seconds: int = 0       # duración exacta elegida (10/15/20); 0 = automática
    userId: str = ""
    idioma: str = ""       # idioma del video elegido por el usuario ('' = auto/según la página)
    formato: str = "vertical"  # 'vertical' (9:16) | 'square' (1:1) | 'wide' (16:9)
    refreshBrand: bool = False  # True = ignora el cache de análisis de la URL y re-analiza
    styleId: str = ""      # ESTILO visual elegido por el usuario ('' = recomendado por rubro). Ver style_catalog.
    spec: dict | None = None  # variante ya elegida: si viene, se renderiza sin pasar por el director


@app.post("/api/video/generate")
async def video_generate(req: VideoGenRequest):
    """Modo simple/avanzado: URL + desarrollo -> video con plantillas."""
    if not req.url.strip() and not req.desarrollo.strip():
        return {"error": "Necesitás al menos una URL o una descripción"}
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id, "status": "queued", "step": None, "progress": 0,
        "videoPath": None, "videoFilename": None, "cloudinaryUrl": "",
        "error": None, "spec": None, "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(_render_video_job(job_id, req))
    return {"job_id": job_id}


class VariantsRequest(BaseModel):
    url: str = ""
    desarrollo: str = ""
    proposito: str = "marketing"
    theme: str = ""
    seconds: int = 0
    userId: str = ""
    idioma: str = ""
    count: int = 3


@app.post("/api/video/variants")
async def video_variants(req: VariantsRequest):
    """Genera N variantes de STORYBOARD (hooks/arcos/paletas DISTINTOS entre sí) para la misma URL,
    para que el usuario elija / haga A·B antes de renderizar. UNA sola carga del sitio (reusada por
    todas). Devuelve previews + el spec de cada una; renderizar la elegida = POST a /api/video/generate
    con ese spec. NO renderiza acá (es barato: solo llamadas al director)."""
    if not req.url.strip() and not req.desarrollo.strip():
        return {"error": "Necesitás al menos una URL o una descripción"}
    n = max(1, min(int(req.count or 3), 4))
    OUTPUTS_DIR.mkdir(exist_ok=True)
    content = None
    if req.url.strip():
        try:
            import site_capture
            cap = await site_capture.capture_all(
                req.url.strip(), str(OUTPUTS_DIR / f"variants_{uuid.uuid4().hex[:8]}.png"))
            content = cap.get("content")
        except Exception as e:
            print(f"[variants] capture_all falló: {e}")
    # Perfil 'rodante' local: acumula lo usado para que cada variante rote respecto de la anterior.
    rolling = {"styles": [], "angles": [], "themes": [], "arts": [], "decors": [], "hooks": [], "arcs": []}
    out = []
    for i in range(n):
        try:
            spec = await template_director.build_storyboard(
                req.url, req.desarrollo, req.proposito, seconds=req.seconds,
                recent_profile=rolling, prefetched_site=content, idioma=req.idioma)
            if req.theme in template_director.VALID_THEMES:
                spec["theme"] = req.theme
            for ks, kr in [("editStyle", "styles"), ("angle", "angles"), ("theme", "themes"),
                           ("artName", "arts"), ("decorName", "decors"),
                           ("hookName", "hooks"), ("arcName", "arcs")]:
                v = spec.get(ks)
                if v:
                    rolling[kr] = [v] + [x for x in rolling[kr] if x != v]
            first = ""
            for s in spec.get("scenes", []):
                if s.get("type") == "KineticStatement" and s.get("lines"):
                    ln = s["lines"][0]
                    first = ln if isinstance(ln, str) else "".join(
                        seg.get("t", "") for seg in ln if isinstance(seg, dict))
                    break
            out.append({
                "index": i, "hookName": spec.get("hookName"), "arcName": spec.get("arcName"),
                "theme": spec.get("theme"), "brand": spec.get("brand"), "firstLine": first,
                "sceneTypes": [s.get("type") for s in spec.get("scenes", [])], "spec": spec,
            })
        except Exception as e:
            print(f"[variants] variante {i} falló: {e}")
    return {"variants": out}


class DeleteVideoRequest(BaseModel):
    publicId: str = ""


@app.post("/api/video/delete")
async def delete_video_endpoint(req: DeleteVideoRequest):
    """Borra el asset de Cloudinary cuando se elimina una cinemática desde la galería.
    El doc de Firestore lo borra el cliente (las reglas se lo permiten al dueño); acá
    solo limpiamos el archivo en Cloudinary. Guard: solo la carpeta de cinemáticas."""
    pid = (req.publicId or "").strip()
    if not pid.startswith("cinematicas/"):
        return {"ok": False, "error": "publicId inválido"}
    try:
        from cloudinary_upload import delete_video
        ok = await delete_video(pid)
        return {"ok": bool(ok)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


async def _render_video_job(job_id: str, req: VideoGenRequest):
    from pathlib import Path as _Path
    import asyncio as _asyncio
    REMOTION_DIR = _Path(__file__).parent.parent / "remotion"
    OUTPUTS_DIR  = _Path(__file__).parent / "outputs"
    OUTPUTS_DIR.mkdir(exist_ok=True)
    output_path = OUTPUTS_DIR / f"{job_id}_video.mp4"
    temp_files = []

    try:
        jobs[job_id].update({"status": "processing", "step": "script", "progress": 14})
        # 0. UNA sola carga del sitio (Chromium): texto para el guion + screenshot para Mockup.
        #    Antes se abría el navegador dos veces por video; ahora una sola -> más rápido.
        _site = {"screenshot": None, "content": None}
        _shot_path = str(OUTPUTS_DIR / f"{job_id}_cap.png")
        if req.url.strip():
            try:
                import site_capture
                _site = await site_capture.capture_all(req.url.strip(), _shot_path)
            except Exception as ce:
                print(f"[video] capture_all falló (sigo con scrape liviano): {ce}")

        # 1. Director: usa el texto YA extraído (no recarga el browser).
        # Rotación MULTIDIMENSIONAL por usuario+marca: no repetir ángulo/estilo/paleta/arte/decor
        # recientes -> dos videos de la misma marca (mismo rubro) NO se sienten iguales.
        _db = get_firestore()
        _bkey = _brand_key(req.url)
        _usage = []   # uso de tokens por etapa (para medir costo real por video)
        if isinstance(getattr(req, "spec", None), dict) and req.spec.get("scenes"):
            # Variante ya elegida por el usuario: la renderamos tal cual (igual inyectamos
            # screenshot/logo/imágenes reales abajo). Saltea al director.
            spec = req.spec
            print("[video] usando spec pre-elegido (variante)")
        else:
            _recent = _get_recent_profile(_db, req.userId, _bkey)
            _bias = _get_rating_bias(_db, req.userId)
            # Cache de análisis POR URL (clave con path) + huella de contenido: repetir la MISMA página sin
            # cambios NO re-analiza -> más barato; si la página cambió, se re-analiza sola. El VIDEO igual sale distinto.
            _ckey = _brand_cache_key(req.url)
            _chash = _content_fingerprint(_site)
            _cache = None if req.refreshBrand else _get_brand_cache(_db, req.userId, _ckey, _chash)
            if _cache:
                _dna = _cache.get("dna") or {}
                _cached_brand = _cache.get("brand") or ""
                print(f"[cache] análisis de '{req.url}' desde cache (skip visión + hechos de marca)")
            else:
                _dna = {}
                try:
                    _dna = await brand_dna.analyze_brand_dna(
                        _site.get("screenshot"), theme_options=template_director.THEME_VIBES, usage=_usage)
                except Exception as _de:
                    print(f"[dna] error (no crítico, sigue con defaults): {_de}")
                _cached_brand = None
            _brand_sink = []
            if req.styleId:
                _dna["styleId"] = req.styleId   # el estilo elegido por el usuario viaja al director via el ADN
            spec = await template_director.build_storyboard(
                req.url, req.desarrollo, req.proposito, seconds=req.seconds,
                recent_profile=_recent, prefetched_site=_site.get("content"),
                idioma=req.idioma, rating_bias=_bias, usage=_usage, dna=_dna,
                cached_brand=_cached_brand, brand_sink=_brand_sink)
            # Guardar el análisis SOLO si fue fresco y completo (ADN visual OK + hechos) -> así un fallo
            # transitorio de visión no queda cacheado y se reintenta la próxima.
            if not _cache:
                _facts = _brand_sink[0] if _brand_sink else ""
                if _dna and (_dna.get("summary") or _dna.get("mood")) and _facts:
                    _set_brand_cache(_db, req.userId, _ckey, _dna, _facts, _chash, req.url)
            _push_recent_profile(_db, req.userId, _bkey, spec)
        if req.theme in template_director.VALID_THEMES:
            spec["theme"] = req.theme
        if req.formato in ("vertical", "square", "wide"):
            spec["format"] = req.formato
        jobs[job_id]["spec"] = spec

        # 1b. MockupShowcase: REUSAMOS el screenshot de la carga única (no recapturamos).
        needs_shot = [s for s in spec.get("scenes", [])
                      if s.get("type") == "MockupShowcase" and not s.get("screenshot")]
        if needs_shot and _site.get("screenshot"):
            try:
                jobs[job_id].update({"step": "capture", "progress": 30})
                shot_url = ""
                try:
                    from cloudinary_upload import upload_image
                    shot_url = await upload_image(_site["screenshot"], f"cap_{job_id[:8]}")
                except Exception as ie:
                    print(f"[video] upload screenshot error: {ie}")
                if shot_url:
                    for s in needs_shot:
                        s["screenshot"] = shot_url
                    print(f"[video] screenshot del sitio listo")
            except Exception as ce:
                print(f"[video] screenshot del sitio falló (uso skeleton): {ce}")

        # 1b-bis. ProductShowcase: inyectar FOTOS REALES del sitio (re-hosteadas a Cloudinary).
        #   Si no se consigue ninguna imagen usable, convertimos la escena a una frase (con su
        #   título) o la descartamos -> nunca queda un ProductShowcase vacío que rompa el render.
        needs_imgs = [s for s in spec.get("scenes", []) if s.get("type") == "ProductShowcase"]
        if needs_imgs:
            real_imgs = await _rehost_images(_site.get("images") or [], job_id, limit=3)
            if real_imgs:
                for s in needs_imgs:
                    s["images"] = real_imgs
                print(f"[video] {len(real_imgs)} imagen(es) real(es) del sitio para ProductShowcase")
            else:
                new_scenes = []
                for s in spec["scenes"]:
                    if s.get("type") == "ProductShowcase":
                        if s.get("title"):
                            new_scenes.append({"type": "KineticStatement", "lines": [s["title"]],
                                               "durationInFrames": s.get("durationInFrames", 90)})
                        # sin título -> se descarta
                    else:
                        new_scenes.append(s)
                if len(new_scenes) >= 2:
                    spec["scenes"] = new_scenes
                else:
                    for s in needs_imgs:  # caso borde: dejarla como placeholder, no romper
                        s["images"] = []
                print("[video] sin imágenes reales usables -> ProductShowcase convertida/descartada")

        # 1c. Logo real del sitio: lo bajamos y re-hosteamos en Cloudinary (URL confiable para
        # Remotion). Sirve para el/los LogoReveal/CtaOutro Y para la marca de arriba (BrandMark).
        # Fuente: el logo que el director puso en una escena, o el favicon/apple-touch-icon del sitio.
        needs_logo = [s for s in spec.get("scenes", [])
                      if s.get("type") in ("LogoReveal", "CtaOutro") and str(s.get("logo", "")).startswith("http")]
        raw_logo = ""
        if needs_logo:
            raw_logo = needs_logo[0]["logo"]
        elif str(_site.get("logo", "")).startswith("http"):
            raw_logo = _site["logo"]   # favicon/apple-touch-icon para la marca de arriba
        if raw_logo:
            logo_url = ""
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True,
                        headers={"User-Agent": "Mozilla/5.0 (compatible; clipingbot/1.0)"}) as c:
                    lr = await c.get(raw_logo)
                if lr.status_code == 200 and lr.content:
                    ext = ".png"
                    ct = lr.headers.get("content-type", "")
                    if "svg" in ct: ext = ".svg"
                    elif "jpeg" in ct or "jpg" in ct: ext = ".jpg"
                    elif "webp" in ct: ext = ".webp"
                    elif "x-icon" in ct or "vnd.microsoft.icon" in ct or raw_logo.lower().endswith(".ico"): ext = ".ico"
                    logo_path = str(OUTPUTS_DIR / f"{job_id}_logo{ext}")
                    with open(logo_path, "wb") as f:
                        f.write(lr.content)
                    # .ico/.svg no son ideales para <Img>; solo subimos formatos ráster usables.
                    if ext in (".png", ".jpg", ".webp"):
                        from cloudinary_upload import upload_image
                        logo_url = await upload_image(logo_path, f"logo_{job_id[:8]}")
            except Exception as le:
                print(f"[video] logo del sitio falló (uso wordmark): {le}")
            if logo_url:
                spec["brandLogo"] = logo_url   # icono real para la marca de arriba en todas las escenas
                print("[video] logo del sitio listo")
            for s in needs_logo:
                if logo_url:
                    s["logo"] = logo_url
                else:
                    s.pop("logo", None)  # sin logo confiable -> wordmark

        # 1d. Color de marca: si NO salió un theme-color usable, derivamos el acento del color
        #     dominante vibrante del screenshot -> el fondo/acentos pegan más con la marca.
        if not spec.get("accent") and _site.get("screenshot"):
            try:
                col = _dominant_accent(_site["screenshot"])
                if col:
                    spec["accent"] = col
                    print(f"[video] accent desde screenshot -> {col}")
            except Exception as ae:
                print(f"[video] accent desde screenshot falló: {ae}")

        # 2. Construir los archivos del render
        jobs[job_id].update({"step": "build", "progress": 40})
        entry, comp_id, total_frames, temp_files = template_director.build_video_files(
            job_id, spec, REMOTION_DIR
        )

        # 3. Render con Remotion
        jobs[job_id].update({"step": "render", "progress": 52})
        candidates = [
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        ]
        remotion_bin = next((c for c in candidates if _Path(c).exists()), "npx")
        # Las dimensiones las define la composición (Root del formato). NO pasamos --width/--height
        # por CLI para no forzar un reescalado (eso bajaba la calidad en cuadrado/horizontal).
        _FMT = {"vertical": (1080, 1920), "square": (1080, 1080), "wide": (1920, 1080)}
        _w, _h = _FMT.get(spec.get("format", "vertical"), _FMT["vertical"])
        args = [remotion_bin, "render", entry, comp_id,
                str(output_path.absolute()),
                "--codec", "h264", "--fps", "30",
                "--duration-in-frames", str(total_frames),
                "--concurrency", "4", "--jpeg-quality", "100", "--crf", "18",
                "--log", "error"]
        print(f"[video] Renderizando {comp_id} ({total_frames} frames, {_w}x{_h}, theme={spec.get('theme')})...")
        proc = await _asyncio.create_subprocess_exec(
            *args, cwd=str(REMOTION_DIR),
            stdout=_asyncio.subprocess.PIPE, stderr=_asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            out = stdout.decode(errors='replace'); err = stderr.decode(errors='replace')
            print(f"[video] ERROR STDOUT:\n{out[:800]}")
            print(f"[video] ERROR STDERR:\n{err[:800]}")
            raise RuntimeError((out + err)[-400:])

        # 4. Cloudinary
        jobs[job_id].update({"status": "uploading", "step": "upload", "progress": 86})
        cloudinary_url = ""
        try:
            from cloudinary_upload import upload_video
            cloudinary_url = await upload_video(str(output_path), f"video_{job_id[:8]}")
            print(f"[video] Cloudinary OK -> {cloudinary_url}")
        except Exception as ce:
            print(f"[video] Cloudinary error: {ce}")

        # 5. Firestore: guardar en users/{uid}/videos (las reglas permiten que el dueño
        #    lo lea/borre desde el cliente). Guardamos SOLO si hay URL de Cloudinary:
        #    el archivo local no es durable (cambia el ngrok / se limpia outputs/), así que
        #    sin Cloudinary el video no sería reproducible más tarde -> no se persiste.
        # Costo real de tokens de este video (por etapa: brief + director [+ retry] [+ critic]).
        _cost = template_director.usage_cost(_usage)
        if _usage:
            _per = " · ".join(f"{e['stage']}: {e['in']}+{e['out']}" for e in _usage)
            print(f"[video] tokens: {_cost['in']} in + {_cost['out']} out  (~${_cost['cost_usd']})  [{_per}]")

        try:
            db = get_firestore()
            if db and req.userId and cloudinary_url:
                db.collection("users").document(req.userId).collection("videos").document(job_id).set({
                    "id": job_id, "url": req.url, "desarrollo": req.desarrollo,
                    "proposito": req.proposito, "userId": req.userId,
                    "theme": spec.get("theme"), "brand": spec.get("brand"),
                    "format": spec.get("format", "vertical"),
                    # Costo real de generación (tokens por etapa + estimado USD) para medir economía.
                    "tokens": _cost,
                    # Receta de generación (base del loop de feedback: cuando la app sume el rating,
                    # ya sabemos qué combinación se uso para sesgar futuras generaciones).
                    "recipe": {
                        "editStyle": spec.get("editStyle"), "angle": spec.get("angle"),
                        "artName": spec.get("artName"), "decorName": spec.get("decorName"),
                        "hookName": spec.get("hookName"), "arcName": spec.get("arcName"),
                        "theme": spec.get("theme"), "criticModel": spec.get("criticModel"),
                    },
                    "rating": 0,  # 0 = sin puntuar; la app lo actualiza con el pulgar arriba/abajo
                    "videoUrl": cloudinary_url, "localFile": output_path.name,
                    "publicId": f"cinematicas/video_{job_id[:8]}",
                    "frames": total_frames, "createdAt": datetime.utcnow().isoformat(),
                })
                print(f"[video] Firestore OK -> users/{req.userId[:8]}/videos/{job_id[:8]}")
            elif not cloudinary_url:
                print("[video] sin URL de Cloudinary -> no se guarda en la galería (no sería reproducible)")
        except Exception as fe:
            print(f"[video] Firestore error: {fe}")

        jobs[job_id].update({
            "status": "done", "step": "export", "progress": 100,
            "videoPath": str(output_path), "videoFilename": output_path.name,
            "cloudinaryUrl": cloudinary_url,
        })
        print(f"[video] OK -> {output_path.name}")
    except Exception as e:
        print(f"[video] ERROR: {e}")
        jobs[job_id].update({"status": "error", "error": str(e)[:400]})
    finally:
        for f in temp_files:
            try:
                f.unlink(missing_ok=True)
            except Exception:
                pass


# ──────────────────────────────────────────────────────────────────────────────
# MOTOR NUEVO (animaciones por timeline, Canvas -> Remotion -> MP4 -> Cloudinary).
# Mismo render que las cinematografias, pero la composicion es TimelineVideo (el motor Canvas,
# el mismo nucleo que el preview en vivo del sidebar). Por ahora renderiza la DEMO horneada,
# sin analisis ni IA -> costo $0. Cuando sumemos la IA, ella escribe el `timeline` desde la URL.
# ──────────────────────────────────────────────────────────────────────────────
class TimelineGenRequest(BaseModel):
    userId: str = ""
    formato: str = "vertical"   # vertical (9:16) por ahora
    timeline: dict | None = None  # guion ya armado (interno). Si no viene y hay url, lo escribe la IA.
    url: str = ""
    desarrollo: str = ""
    proposito: str = "marketing"
    idioma: str = ""
    refreshBrand: bool = False   # ignora el cache de marca y re-analiza
    styleId: str = ""            # ESTILO visual elegido por el usuario ('' = recomendado por rubro)


@app.post("/api/timeline/generate")
async def timeline_generate(req: TimelineGenRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id, "status": "queued", "step": None, "progress": 0,
        "videoPath": None, "videoFilename": None, "cloudinaryUrl": "",
        "error": None, "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(_render_timeline_job(job_id, req))
    return {"job_id": job_id}


async def _render_timeline_job(job_id: str, req: TimelineGenRequest):
    from pathlib import Path as _Path
    REMOTION_DIR = _Path(__file__).parent.parent / "remotion"
    OUT = _Path(__file__).parent / "outputs"
    OUT.mkdir(exist_ok=True)
    output_path = OUT / f"{job_id}_timeline.mp4"
    temp_files = []
    try:
        # ── Armar el timeline ─────────────────────────────────────────────────────
        if req.timeline and req.timeline.get("scenes"):
            # Timeline ya armado (uso interno) -> render directo.
            timeline = req.timeline
            jobs[job_id].update({"status": "processing", "step": "build", "progress": 35})
        elif req.url.strip():
            # PIPELINE REAL: mismo analisis/rotacion que cinematicas, pero el director escribe un TIMELINE.
            jobs[job_id].update({"status": "processing", "step": "script", "progress": 12})
            _db = get_firestore()
            _bkey = _brand_key(req.url)
            _usage = []
            _shot_path = str(OUT / f"{job_id}_cap.png")
            _site = {"screenshot": None, "content": None}
            try:
                import site_capture
                _site = await site_capture.capture_all(req.url.strip(), _shot_path)
            except Exception as ce:
                print(f"[timeline] capture_all fallo (sigo con scrape liviano): {ce}")
            _recent = _get_recent_profile(_db, req.userId, _bkey)
            _bias = _get_rating_bias(_db, req.userId)
            _ckey = _brand_cache_key(req.url)
            _chash = _content_fingerprint(_site)
            _cache = None if req.refreshBrand else _get_brand_cache(_db, req.userId, _ckey, _chash)
            if _cache:
                _dna = _cache.get("dna") or {}
                _cached_brand = _cache.get("brand") or ""
                print(f"[timeline] analisis de '{req.url}' desde cache (skip vision + hechos)")
            else:
                _dna = {}
                try:
                    _dna = await brand_dna.analyze_brand_dna(
                        _site.get("screenshot"), theme_options=template_director.THEME_VIBES, usage=_usage)
                except Exception as _de:
                    print(f"[timeline] dna error (no critico): {_de}")
                _cached_brand = None
            _brand_sink = []
            if req.styleId:
                _dna["styleId"] = req.styleId   # el estilo elegido por el usuario -> el director lo aplica
            _logo_url = (_site or {}).get("logo") or ""
            if _logo_url:
                _dna["logo"] = _logo_url   # logo extraido del sitio -> el motor lo dibuja en el cierre (fallback monograma)
            _imgs = (_site or {}).get("images") or []
            if _imgs:
                _dna["images"] = _imgs[:6]   # fotos reales del sitio -> hero/escenas fotograficas (kind:'photo')
            jobs[job_id].update({"step": "script", "progress": 32})
            timeline = await timeline_director.write_timeline(
                req.url, req.desarrollo, req.proposito, idioma=req.idioma,
                recent_profile=_recent, rating_bias=_bias, prefetched_site=_site.get("content"),
                dna=_dna, cached_brand=_cached_brand, usage=_usage, brand_sink=_brand_sink)
            if not _cache:
                _facts = _brand_sink[0] if _brand_sink else ""
                if _dna and (_dna.get("summary") or _dna.get("mood")) and _facts:
                    _set_brand_cache(_db, req.userId, _ckey, _dna, _facts, _chash, req.url)
            try:
                _push_recent_profile(_db, req.userId, _bkey, timeline)
            except Exception as _pe:
                print(f"[timeline] push recent fallo: {_pe}")
            jobs[job_id]["timeline"] = timeline   # el front lo usa para previsualizar el guion generado
            print(f"[timeline] costo: {template_director.usage_cost(_usage)}")
        else:
            timeline = {"durationInFrames": timeline_director.DEMO_FRAMES}

        jobs[job_id].update({"status": "processing", "step": "build", "progress": 42})
        entry, comp_id, total, temp_files = timeline_director.build_timeline_files(
            job_id, timeline, REMOTION_DIR, req.formato)

        jobs[job_id].update({"step": "render", "progress": 45})
        candidates = [
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
            str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        ]
        remotion_bin = next((c for c in candidates if _Path(c).exists()), "npx")
        args = [remotion_bin, "render", entry, comp_id, str(output_path.absolute()),
                "--codec", "h264", "--fps", "30", "--duration-in-frames", str(total),
                "--concurrency", "4", "--jpeg-quality", "100", "--crf", "18", "--log", "error"]
        print(f"[timeline] Renderizando {comp_id} ({total} frames)...")
        proc = await _asyncio.create_subprocess_exec(
            *args, cwd=str(REMOTION_DIR),
            stdout=_asyncio.subprocess.PIPE, stderr=_asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            out = stdout.decode(errors="replace"); err = stderr.decode(errors="replace")
            print(f"[timeline] ERROR STDOUT:\n{out[:800]}")
            print(f"[timeline] ERROR STDERR:\n{err[:800]}")
            raise RuntimeError((out + err)[-400:])

        jobs[job_id].update({"status": "uploading", "step": "upload", "progress": 86})
        cloudinary_url = ""
        try:
            from cloudinary_upload import upload_video
            cloudinary_url = await upload_video(str(output_path), f"timeline_{job_id[:8]}")
            print(f"[timeline] Cloudinary OK -> {cloudinary_url}")
        except Exception as ce:
            print(f"[timeline] Cloudinary fallo (sigue con archivo local): {ce}")

        db = get_firestore()
        if db and req.userId and cloudinary_url:
            try:
                db.collection("users").document(req.userId).collection("videos").add({
                    "kind": "timeline", "format": req.formato, "rating": 0,
                    "brand": (timeline.get("brand") if isinstance(timeline, dict) else "") or "",
                    "url": req.url, "publicId": f"cinematicas/timeline_{job_id[:8]}",
                    "videoUrl": cloudinary_url, "localFile": output_path.name,
                    "createdAt": datetime.utcnow().isoformat(),
                })
            except Exception as fe:
                print(f"[timeline] Firestore error: {fe}")

        jobs[job_id].update({
            "status": "done", "step": "export", "progress": 100,
            "videoPath": str(output_path), "videoFilename": output_path.name,
            "cloudinaryUrl": cloudinary_url,
        })
        print(f"[timeline] OK -> {output_path.name}")
    except Exception as e:
        print(f"[timeline] ERROR: {e}")
        jobs[job_id].update({"status": "error", "error": str(e)[:400]})
    finally:
        for f in temp_files:
            try:
                f.unlink(missing_ok=True)
            except Exception:
                pass


# ─── Prueba de 5: genera N videos en serie y, tras CADA render, corre la crítica con visión ───
def _scene_titles(tl):
    return " · ".join((s.get("type") or "?") for s in (tl or {}).get("scenes", []) or [])


class TimelineBatchRequest(BaseModel):
    userId: str = ""
    url: str = ""
    desarrollo: str = ""
    proposito: str = "marketing"
    idioma: str = ""
    formato: str = "vertical"
    n: int = 5
    refreshBrand: bool = False


@app.post("/api/timeline/batch")
async def timeline_batch(req: TimelineBatchRequest):
    batch_id = str(uuid.uuid4())
    n = max(1, min(8, int(req.n or 5)))
    jobs[batch_id] = {
        "id": batch_id, "kind": "batch", "status": "running", "step": "queued",
        "progress": 0, "current": 0, "total": n, "videos": [], "error": None,
        "cost": "", "createdAt": datetime.utcnow().isoformat(),
    }
    asyncio.create_task(_run_batch_job(batch_id, req, n))
    return {"job_id": batch_id}


async def _run_batch_job(batch_id: str, req: TimelineBatchRequest, n: int):
    from pathlib import Path as _Path
    REMOTION_DIR = _Path(__file__).parent.parent / "remotion"
    OUT = _Path(__file__).parent / "outputs"
    OUT.mkdir(exist_ok=True)
    J = jobs[batch_id]

    def setv(i, **kw):
        vs = J["videos"]
        while len(vs) < i:
            vs.append({"index": len(vs) + 1, "status": "pending"})
        vs[i - 1].update(kw)

    try:
        import vision_critic  # perezoso: si falta imageio-ffmpeg, no tira abajo todo el backend
        db = get_firestore()
        bkey = _brand_key(req.url)
        usage = []
        # Captura del sitio UNA vez (se reusa en los N videos).
        site = {"screenshot": None, "content": None}
        try:
            import site_capture
            J.update({"step": "capture", "progress": 3})
            site = await site_capture.capture_all(req.url.strip(), str(OUT / f"{batch_id}_cap.png"))
        except Exception as ce:
            print(f"[batch] capture_all fallo: {ce}")
        bias = _get_rating_bias(db, req.userId)
        ckey = _brand_cache_key(req.url)
        chash = _content_fingerprint(site)
        cache = None if req.refreshBrand else _get_brand_cache(db, req.userId, ckey, chash)
        reuse_dna = (cache.get("dna") or {}) if cache else None
        reuse_brand = (cache.get("brand") or "") if cache else None

        for i in range(1, n + 1):
            base = (i - 1) / n * 100
            J.update({"current": i, "step": "script", "progress": round(base + 4)})
            setv(i, status="running", step="script")
            vid_id = uuid.uuid4().hex
            out_path = OUT / f"{vid_id}_timeline.mp4"
            temp_files = []
            try:
                recent = _get_recent_profile(db, req.userId, bkey)
                brand_sink = []
                dna_for = reuse_dna if reuse_dna is not None else {}
                if reuse_dna is None:
                    try:
                        dna_for = await brand_dna.analyze_brand_dna(
                            site.get("screenshot"), theme_options=template_director.THEME_VIBES, usage=usage)
                    except Exception as de:
                        print(f"[batch] dna error: {de}")
                        dna_for = {}
                if isinstance(dna_for, dict) and (site or {}).get("logo"):
                    dna_for["logo"] = site["logo"]   # logo del sitio -> el motor lo dibuja (fallback monograma)
                if isinstance(dna_for, dict) and (site or {}).get("images"):
                    dna_for["images"] = site["images"][:6]   # fotos reales -> escenas fotograficas
                timeline = await timeline_director.write_timeline(
                    req.url, req.desarrollo, req.proposito, idioma=req.idioma,
                    recent_profile=recent, rating_bias=bias, prefetched_site=site.get("content"),
                    dna=dna_for, cached_brand=reuse_brand, usage=usage, brand_sink=brand_sink)
                facts = (brand_sink[0] if brand_sink else "") or reuse_brand or ""
                if reuse_dna is None:
                    reuse_dna, reuse_brand = dna_for, facts
                    if dna_for and (dna_for.get("summary") or dna_for.get("mood")) and facts:
                        _set_brand_cache(db, req.userId, ckey, dna_for, facts, chash, req.url)
                try:
                    _push_recent_profile(db, req.userId, bkey, timeline)   # variedad dentro de la tanda
                except Exception:
                    pass

                # Build + render (idéntico al job single).
                J.update({"step": "render", "progress": round(base + 8)})
                setv(i, step="render", sceneSummary=_scene_titles(timeline), brand=(timeline.get("brand") or ""))
                entry, comp_id, total, temp_files = timeline_director.build_timeline_files(
                    vid_id, timeline, REMOTION_DIR, req.formato)
                candidates = [str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
                              str(REMOTION_DIR / "node_modules" / ".bin" / "remotion")]
                remotion_bin = next((c for c in candidates if _Path(c).exists()), "npx")
                args = [remotion_bin, "render", entry, comp_id, str(out_path.absolute()),
                        "--codec", "h264", "--fps", "30", "--duration-in-frames", str(total),
                        "--concurrency", "4", "--jpeg-quality", "100", "--crf", "18", "--log", "error"]
                proc = await _asyncio.create_subprocess_exec(
                    *args, cwd=str(REMOTION_DIR),
                    stdout=_asyncio.subprocess.PIPE, stderr=_asyncio.subprocess.PIPE)
                stdout, stderr = await proc.communicate()
                if proc.returncode != 0:
                    raise RuntimeError((stdout.decode(errors="replace") + stderr.decode(errors="replace"))[-300:])

                cloud = ""
                try:
                    from cloudinary_upload import upload_video
                    cloud = await upload_video(str(out_path), f"timeline_{vid_id[:8]}")
                except Exception as ue:
                    print(f"[batch] cloudinary fallo: {ue}")

                if db and req.userId and cloud:
                    try:
                        db.collection("users").document(req.userId).collection("videos").add({
                            "kind": "timeline", "format": req.formato, "rating": 0,
                            "brand": (timeline.get("brand") or ""), "url": req.url,
                            "publicId": f"cinematicas/timeline_{vid_id[:8]}",
                            "videoUrl": cloud, "localFile": out_path.name,
                            "createdAt": datetime.utcnow().isoformat(),
                        })
                    except Exception as fe:
                        print(f"[batch] firestore: {fe}")
                setv(i, videoUrl=(cloud or f"/api/video/{out_path.name}"))

                # CRÍTICA CON VISIÓN (lo nuevo).
                J.update({"step": "vision", "progress": round(base + 14)})
                setv(i, step="vision")
                _sum = (dna_for.get("summary", "") if isinstance(dna_for, dict) else "")
                brief = (facts + (("\nResumen de marca: " + _sum) if _sum else "") + f"\nObjetivo: {req.proposito}").strip()
                crit = await vision_critic.analyze_video(str(out_path), timeline, brief, fmt=req.formato, usage=usage)
                if crit.get("ok"):
                    setv(i, status="done", step="done", scores=crit.get("scores"),
                         analysis=crit.get("analysis"), frames=crit.get("frames"), critModel=crit.get("model"))
                else:
                    setv(i, status="done", step="done", scores=None,
                         analysis=f"(la crítica con visión falló: {crit.get('error')})")
            except Exception as ve:
                print(f"[batch] video {i} ERROR: {ve}")
                setv(i, status="error", error=str(ve)[:300])
            finally:
                for f in temp_files:
                    try:
                        f.unlink(missing_ok=True)
                    except Exception:
                        pass
            J.update({"progress": round(i / n * 100)})
            _c = template_director.usage_cost(usage)
            J["cost"] = f"US${_c['cost_usd']:.2f} · {_c['calls']} llamadas IA · {_c['in'] + _c['cache_w'] + _c['cache_r']:,} tok in / {_c['out']:,} out"

        ok = sum(1 for v in J["videos"] if v.get("status") == "done")
        J.update({"status": "done" if ok else "error", "step": "export", "progress": 100,
                  "error": None if ok else "todos los videos fallaron"})
        print(f"[batch] {batch_id} listo: {ok}/{n} | costo {J.get('cost')}")
    except Exception as e:
        print(f"[batch] ERROR fatal: {e}")
        J.update({"status": "error", "error": str(e)[:400]})
