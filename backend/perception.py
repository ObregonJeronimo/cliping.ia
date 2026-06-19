# perception.py - urvid 1.0 · PERCEPTION (analisis REAL de una pagina/URL -> BRIEF rico del motor urvid 1.0).
# UNA SOLA llamada multimodal a Sonnet 4.6 (texto curado de la pagina + screenshot juntos) -> brief con el material
# YA SELECCIONADO para el video: que decir (claim/tagline/cta), que props mostrar (bullets), que datos (stats) y la
# prueba social. Reemplaza las 2 llamadas anteriores (vision + texto) por 1 -> mas robusto Y mas barato.
# Cache POR URL (lo hace main.py) -> la misma pagina NO re-llama. Input acotado + max_tokens chico = bajo gasto.
# Best-effort: si la captura o el LLM fallan, devuelve un brief con defaults sensatos (no rompe).
import base64
import json
import os
import re

try:
    from anthropic import AsyncAnthropic
    _client = AsyncAnthropic()
except Exception:  # pragma: no cover
    _client = None

BRIEF_MODEL = "claude-sonnet-4-6"

RUBROS = ["tech", "finanzas", "inmobiliaria", "salud", "educacion", "gastronomia",
          "moda", "belleza", "fitness", "eventos", "default"]

_SYS = (
    "Sos director creativo de reels verticales (9:16) + analista de marca. Te paso lo que se capturo de una pagina "
    "(texto real + un screenshot) y devolves el BRIEF para un reel corto de esa marca, con el material YA SELECCIONADO "
    "(elegis lo mejor, descartas relleno/nav/legales). Respondes SOLO un objeto JSON (sin texto afuera) con estas claves:\n"
    '- "brand": nombre corto y real de la marca\n'
    '- "rubro": UNO EXACTO de: tech, finanzas, inmobiliaria, salud, educacion, gastronomia, moda, belleza, fitness, eventos, default\n'
    '- "tone": "dark" o "light" segun la identidad visual del screenshot (si dudas, "dark")\n'
    '- "brandColor": color de acento de la marca en hex "#rrggbb" — el que REALMENTE ves dominante/vivido en el screenshot\n'
    '- "tagline": gancho corto, MAX 6 palabras\n'
    '- "claim": el mensaje principal del reel, MAX 12 palabras, concreto y fiel a la pagina\n'
    '- "cta": llamado a la accion corto, MAX 4 palabras (preferi el CTA real de la pagina si hay)\n'
    '- "bullets": 2 a 4 props/beneficios CORTOS (cada uno MAX 5 palabras), sacados de los titulos/contenido reales. [] si no hay claros.\n'
    '- "stats": 0 a 3 datos numericos REALES de la pagina, cada uno {"value": "600" | "+10" | "98%", "label": "etiqueta corta"}. SOLO numeros que figuren; [] si no hay.\n'
    '- "proof": una linea de prueba social REAL (rating, cant. de clientes, premio) o "" si no hay\n'
    '- "seriousness": numero 0 a 1 (salud/finanzas alto ~0.8; gastronomia/moda bajo ~0.35)\n'
    "REGLAS: espanol rioplatense (voseo), FIEL a la pagina (NO inventes datos, cifras, premios ni features que no esten; "
    "si no hay, deja [] o \"\"), conciso, sin comillas tipograficas. SOLO el JSON."
)


def _safe_hex(s):
    m = re.search(r"#([0-9a-fA-F]{6})", str(s or ""))
    return "#" + m.group(1).lower() if m else None


def _extract_json(text):
    s = str(text or "")
    i = s.find("{")
    if i < 0:
        return None
    depth = 0
    for j in range(i, len(s)):
        c = s[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(s[i:j + 1])
                except Exception:
                    return None
    return None


def _brand_from_url(url):
    host = re.sub(r"^https?://(www\.)?", "", (url or "").strip().lower()).split("/")[0]
    part = host.split(".")[0] if host else ""
    return part.capitalize() if part else None


def _clip(s, n):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return s[:n]


def _page_digest(content):
    """Resumen CURADO y compacto de la captura para el prompt (señal alta, pocos tokens). Evita dumpear bodyText crudo."""
    c = content if isinstance(content, dict) else {}
    parts = []
    if c.get("title"): parts.append("Titulo: " + _clip(c["title"], 120))
    if c.get("siteName"): parts.append("Sitio: " + _clip(c["siteName"], 60))
    if c.get("description"): parts.append("Descripcion: " + _clip(c["description"], 260))
    H = [x for x in (c.get("headings") or []) if isinstance(x, str)][:12]
    if H: parts.append("Titulos de la pagina: " + " | ".join(_clip(h, 80) for h in H))
    CTA = [x for x in (c.get("ctas") or []) if isinstance(x, str)][:8]
    if CTA: parts.append("Botones/CTA: " + " | ".join(_clip(x, 30) for x in CTA))
    P = [x for x in (c.get("paragraphs") or []) if isinstance(x, str)][:8]
    if P: parts.append("Parrafos: " + " || ".join(_clip(p, 180) for p in P))
    if not parts and c.get("bodyText"): parts.append("Texto: " + _clip(c["bodyText"], 1500))
    return "\n".join(parts)[:5000]


def _shot_b64(path):
    try:
        if path and os.path.exists(path):
            with open(path, "rb") as f:
                return base64.standard_b64encode(f.read()).decode("utf-8")
    except Exception as e:
        print(f"[perceive] no se pudo leer el screenshot ({e})")
    return None


def _norm_list(v, n, maxlen):
    out = []
    if isinstance(v, list):
        for it in v:
            s = _clip(it, maxlen)
            if s:
                out.append(s)
            if len(out) >= n:
                break
    return out


def _norm_stats(v):
    out = []
    if isinstance(v, list):
        for it in v:
            if isinstance(it, dict) and (it.get("value") not in (None, "")):
                out.append({"value": _clip(it.get("value"), 12), "label": _clip(it.get("label"), 24)})
            if len(out) >= 3:
                break
    return out


def _normalize(b, url, content):
    b = b if isinstance(b, dict) else {}
    content = content if isinstance(content, dict) else {}
    rubro = b.get("rubro") if b.get("rubro") in RUBROS else "default"
    tone = b.get("tone") if b.get("tone") in ("dark", "light") else "dark"
    brand = (b.get("brand") or content.get("siteName") or content.get("title")
             or _brand_from_url(url) or "Marca")
    out = {
        "brand": _clip(brand, 40) or "Marca", "rubro": rubro, "tone": tone,
        "brandColor": _safe_hex(b.get("brandColor")) or "#5b8cff",
        "tagline": _clip(b.get("tagline"), 80), "claim": _clip(b.get("claim"), 120), "cta": _clip(b.get("cta"), 40),
        "bullets": _norm_list(b.get("bullets"), 4, 40),
        "stats": _norm_stats(b.get("stats")),
        "proof": _clip(b.get("proof"), 90),
    }
    try:
        out["seriousness"] = max(0.0, min(1.0, float(b.get("seriousness"))))
    except Exception:
        pass
    return out


async def analyze_to_brief(url, desarrollo="", site=None, usage=None):
    """UNA llamada multimodal (texto + screenshot) -> brief rico. `site` = resultado de site_capture.capture_all."""
    content = (site or {}).get("content") if isinstance(site, dict) else None
    shot = (site or {}).get("screenshot") if isinstance(site, dict) else None
    brief = {}
    parse_ok = False
    if _client is not None:
        digest = _page_digest(content)
        b64 = _shot_b64(shot)
        desarrollo = _clip(desarrollo, 500)   # cap: limita tokens y la superficie de prompt-injection de input del usuario
        text = f"URL: {url}\n"
        if desarrollo:
            text += f"Notas del usuario (priorizalas): {desarrollo}\n"
        text += ("Contenido capturado de la pagina:\n" + digest + "\n") if digest else "(No se pudo capturar texto; usa el screenshot, la URL y las notas.)\n"
        text += ("Tambien te paso el screenshot (para tono y colores reales).\n" if b64 else "")
        text += "\nDevolve SOLO el JSON del brief, eligiendo lo mejor y mas fiel."
        blocks = []
        if b64:
            blocks.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}})
        blocks.append({"type": "text", "text": text})

        async def _call(max_toks, temp):
            resp = await _client.messages.create(
                model=BRIEF_MODEL, max_tokens=max_toks, temperature=temp,
                system=_SYS, messages=[{"role": "user", "content": blocks}])
            if usage is not None:
                try:
                    usage.append({"stage": "perceive", "model": BRIEF_MODEL,
                                  "in": resp.usage.input_tokens, "out": resp.usage.output_tokens})
                except Exception:
                    pass
            return "".join(getattr(x, "text", "") for x in resp.content if getattr(x, "type", "") == "text")

        try:
            txt = await _call(750, 0.4)
            parsed = _extract_json(txt)
            # REPAIR: si el JSON no parseo (p.ej. se trunco en 750 tokens), reintenta UNA vez con mas tokens y menos
            # temperatura. Solo cuando falla -> no agrega costo en el caso normal. Antes un near-miss caia a un brief
            # generico SIN señal -> indistinguible de una falla total.
            if not parsed:
                print(f"[perceive] JSON no parseo, reintento. raw[:200]={txt[:200]!r}")
                txt2 = await _call(1200, 0.2)
                parsed = _extract_json(txt2)
                if not parsed:
                    print(f"[perceive] reintento tampoco parseo. raw2[:200]={txt2[:200]!r}")
            brief = parsed or {}
            parse_ok = bool(parsed)
        except Exception as e:
            print(f"[perceive] LLM fallo (sigo con defaults): {e}")
    else:
        print("[perceive] anthropic no disponible -> brief con defaults")

    out = _normalize(brief, url, content)
    out["_parse_ok"] = parse_ok   # señal interna para el caller (decidir si cachear); se saca antes de cachear/enviar
    # fallback de color: si el modelo no dio uno usable, el theme-color de la pagina.
    if out["brandColor"] == "#5b8cff":
        tc = _safe_hex((content or {}).get("themeColor")) if isinstance(content, dict) else None
        if tc:
            out["brandColor"] = tc
    return out
