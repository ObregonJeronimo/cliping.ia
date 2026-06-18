# perception.py - urvid 1.0 · PERCEPTION (analisis REAL de una pagina/URL -> BRIEF del motor urvid 1.0).
# Toma lo que captura site_capture (titulo/descripcion/texto + themeColor + screenshot) y, con Claude, produce el
# brief que el motor del front consume: { brand, rubro, tone, brandColor, tagline, claim, cta, seriousness }.
# El front llama makeVideo(brief) en el navegador; aca SOLO producimos el brief. Cierra el ciclo "pego una URL -> sale el video".
# Best-effort: si la captura o el LLM fallan, devuelve un brief con defaults sensatos (no rompe).
import json
import re

try:
    from anthropic import AsyncAnthropic
    _client = AsyncAnthropic()
except Exception:  # pragma: no cover - sin anthropic -> degradamos a defaults
    _client = None

BRIEF_MODEL = "claude-sonnet-4-6"   # mismo tier que el director; soporta temperature

# rubros que el motor urvid 1.0 conoce (deben matchear los rubros de las bibliotecas/escenas).
RUBROS = ["tech", "finanzas", "inmobiliaria", "salud", "educacion", "gastronomia",
          "moda", "belleza", "fitness", "eventos", "default"]

_SYS = (
    "Sos un director creativo de reels verticales. A partir de la informacion de una pagina, devolves el BRIEF para "
    "un video corto (reel 9:16) de esa marca. Respondes SOLO con un objeto JSON (sin texto antes ni despues), con EXACTAMENTE estas claves:\n"
    '- "brand": nombre corto de la marca (string)\n'
    '- "rubro": UNO EXACTO de: tech, finanzas, inmobiliaria, salud, educacion, gastronomia, moda, belleza, fitness, eventos, default\n'
    '- "tone": "dark" o "light" (segun la identidad visual de la marca; si dudas, "dark")\n'
    '- "brandColor": color de acento de la marca en hex "#rrggbb"\n'
    '- "tagline": gancho corto, maximo 6 palabras\n'
    '- "claim": mensaje principal, maximo 12 palabras, concreto; INCLUI un numero/dato si la pagina lo tiene\n'
    '- "cta": llamado a la accion corto, maximo 4 palabras\n'
    '- "seriousness": numero 0 a 1 (que tan sobrio/serio es el rubro: salud/finanzas alto ~0.8, gastronomia/moda bajo ~0.35)\n'
    "Reglas: espanol rioplatense (voseo), fiel a la pagina (NO inventes datos ni cifras que no esten), conciso, sin comillas tipograficas. SOLO el JSON."
)


def _safe_hex(s):
    m = re.search(r"#([0-9a-fA-F]{6})", str(s or ""))
    return "#" + m.group(1).lower() if m else None


def _extract_json(text):
    """Primer objeto {...} balanceado del texto (tolerante a preambulos)."""
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


def _normalize(b, url, content):
    b = b if isinstance(b, dict) else {}
    content = content if isinstance(content, dict) else {}
    rubro = b.get("rubro") if b.get("rubro") in RUBROS else "default"
    tone = b.get("tone") if b.get("tone") in ("dark", "light") else "dark"
    brand = (b.get("brand") or content.get("siteName") or content.get("title")
             or _brand_from_url(url) or "Marca")
    brand = str(brand).strip()[:40] or "Marca"
    color = _safe_hex(b.get("brandColor")) or "#5b8cff"
    out = {
        "brand": brand, "rubro": rubro, "tone": tone, "brandColor": color,
        "tagline": str(b.get("tagline") or "").strip()[:80],
        "claim": str(b.get("claim") or "").strip()[:120],
        "cta": str(b.get("cta") or "").strip()[:40],
    }
    try:
        s = float(b.get("seriousness"))
        out["seriousness"] = max(0.0, min(1.0, s))
    except Exception:
        pass
    return out


async def analyze_to_brief(url, desarrollo="", site=None, usage=None):
    """Devuelve el brief para makeVideo. `site` = resultado de site_capture.capture_all (para no recapturar)."""
    content = (site or {}).get("content") if isinstance(site, dict) else None
    brief = {}
    if _client is not None:
        facts = json.dumps(content, ensure_ascii=False)[:6000] if content else ""
        user = f"URL: {url}\n"
        if desarrollo:
            user += f"Notas del usuario (priorizalas): {desarrollo}\n"
        if facts:
            user += f"Contenido capturado de la pagina (JSON):\n{facts}\n"
        else:
            user += "(No se pudo capturar la pagina; infiere lo razonable desde la URL y las notas.)\n"
        user += "\nDevolve SOLO el JSON del brief."
        try:
            resp = await _client.messages.create(
                model=BRIEF_MODEL, max_tokens=500, temperature=0.4,
                system=_SYS, messages=[{"role": "user", "content": user}])
            txt = "".join(getattr(b, "text", "") for b in resp.content if getattr(b, "type", "") == "text")
            brief = _extract_json(txt) or {}
            if usage is not None:
                try:
                    usage.append({"stage": "perceive", "model": BRIEF_MODEL,
                                  "in": resp.usage.input_tokens, "out": resp.usage.output_tokens})
                except Exception:
                    pass
        except Exception as e:
            print(f"[perceive] LLM fallo (sigo con defaults): {e}")
    else:
        print("[perceive] anthropic no disponible -> brief con defaults")

    out = _normalize(brief, url, content)
    # color de marca: el theme-color real de la pagina pisa al LLM si existe (mas fiel a la identidad).
    tc = _safe_hex((content or {}).get("themeColor")) if isinstance(content, dict) else None
    if tc:
        out["brandColor"] = tc
    return out
