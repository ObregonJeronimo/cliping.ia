import asyncio
import json
import re
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
    """Clave estable por marca/dominio para el historial de estilos."""
    host = _re.sub(r"^https?://(www\.)?", "", (url or "").strip().lower()).split("/")[0]
    key = _re.sub(r"[^a-z0-9]+", "_", host).strip("_")
    return key or "sin_url"


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


class VideoGenRequest(BaseModel):
    url: str = ""
    desarrollo: str = ""
    proposito: str = "marketing"
    theme: str = ""        # override opcional del theme
    seconds: int = 0       # duración exacta elegida (10/15/20); 0 = automática
    userId: str = ""
    idioma: str = ""       # idioma del video elegido por el usuario ('' = auto/según la página)
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
        if isinstance(getattr(req, "spec", None), dict) and req.spec.get("scenes"):
            # Variante ya elegida por el usuario: la renderamos tal cual (igual inyectamos
            # screenshot/logo/imágenes reales abajo). Saltea al director.
            spec = req.spec
            print("[video] usando spec pre-elegido (variante)")
        else:
            _recent = _get_recent_profile(_db, req.userId, _bkey)
            _bias = _get_rating_bias(_db, req.userId)
            spec = await template_director.build_storyboard(
                req.url, req.desarrollo, req.proposito, seconds=req.seconds,
                recent_profile=_recent, prefetched_site=_site.get("content"),
                idioma=req.idioma, rating_bias=_bias)
            _push_recent_profile(_db, req.userId, _bkey, spec)
        if req.theme in template_director.VALID_THEMES:
            spec["theme"] = req.theme
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

        # 1c. Logo real del sitio para el/los LogoReveal: lo bajamos y re-hosteamos en
        # Cloudinary (URL confiable para Remotion). Si falla, la escena cae al wordmark.
        needs_logo = [s for s in spec.get("scenes", [])
                      if s.get("type") in ("LogoReveal", "CtaOutro") and str(s.get("logo", "")).startswith("http")]
        if needs_logo:
            raw_logo = needs_logo[0]["logo"]
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
                    elif "x-icon" in ct or "vnd.microsoft.icon" in ct or raw_logo.lower().endswith(".ico"): ext = ".ico"
                    logo_path = str(OUTPUTS_DIR / f"{job_id}_logo{ext}")
                    with open(logo_path, "wb") as f:
                        f.write(lr.content)
                    # .ico/.svg no son ideales para <Img>; solo subimos formatos ráster usables.
                    if ext in (".png", ".jpg"):
                        from cloudinary_upload import upload_image
                        logo_url = await upload_image(logo_path, f"logo_{job_id[:8]}")
            except Exception as le:
                print(f"[video] logo del sitio falló (uso wordmark): {le}")
            for s in needs_logo:
                if logo_url:
                    s["logo"] = logo_url
                    print("[video] logo del sitio listo")
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
        args = [remotion_bin, "render", entry, comp_id,
                str(output_path.absolute()),
                "--codec", "h264", "--fps", "30",
                "--width", "1080", "--height", "1920",
                "--duration-in-frames", str(total_frames),
                "--concurrency", "4", "--jpeg-quality", "90", "--crf", "22",
                "--log", "error"]
        print(f"[video] Renderizando {comp_id} ({total_frames} frames, theme={spec.get('theme')})...")
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
        try:
            db = get_firestore()
            if db and req.userId and cloudinary_url:
                db.collection("users").document(req.userId).collection("videos").document(job_id).set({
                    "id": job_id, "url": req.url, "desarrollo": req.desarrollo,
                    "proposito": req.proposito, "userId": req.userId,
                    "theme": spec.get("theme"), "brand": spec.get("brand"),
                    # Receta de generación (base del loop de feedback: cuando la app sume el rating,
                    # ya sabemos qué combinación se uso para sesgar futuras generaciones).
                    "recipe": {
                        "editStyle": spec.get("editStyle"), "angle": spec.get("angle"),
                        "artName": spec.get("artName"), "decorName": spec.get("decorName"),
                        "hookName": spec.get("hookName"), "arcName": spec.get("arcName"),
                        "theme": spec.get("theme"),
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
