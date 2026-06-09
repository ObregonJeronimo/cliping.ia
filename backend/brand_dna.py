"""
brand_dna.py — "ADN de marca": lee el ALMA visual del sitio para que el video sea una extensión
de la página, no una plantilla recoloreada.

Dos fuentes:
  1) Lectura visual con modelo multimodal sobre el SCREENSHOT (mood, paleta real, vibra tipográfica,
     energía, densidad, y el theme que mejor pega). Es el desbloqueo del "alma".
  2) Paleta dominante del screenshot vía PIL (fallback y refuerzo).

TODO es best-effort: si el modelo o PIL fallan, devuelve {} o lo que pueda y el pipeline sigue
exactamente como hoy (rotación de theme + acento dominante). Logea [dna] en cada paso para debug.
"""
import base64
import json
import os

try:
    from anthropic import AsyncAnthropic
    _client = AsyncAnthropic()
except Exception:
    _client = None

# Modelo de visión. Sonnet es multimodal y barato; se puede subir a Opus para más finura visual.
VISION_MODEL = "claude-sonnet-4-6"
MODEL_PRICES = {
    "claude-opus-4-8": (5.0, 25.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-haiku-4-5-20251001": (1.0, 5.0),
}


# ---------- helpers de color (puros, testeables) ----------

def _hex_ok(h: str) -> bool:
    if not isinstance(h, str):
        return False
    h = h.strip()
    return len(h) == 7 and h[0] == "#" and all(c in "0123456789abcdefABCDEF" for c in h[1:])


def _rgb(h: str):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _rellum(h: str) -> float:
    """Luminancia relativa (WCAG) de un hex. 0 = negro, 1 = blanco."""
    def chan(c):
        c /= 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = _rgb(h)
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def contrast_ratio(h1: str, h2: str) -> float:
    """Ratio de contraste WCAG entre dos hex (1..21). Para verificar legibilidad del acento."""
    try:
        l1, l2 = _rellum(h1), _rellum(h2)
    except Exception:
        return 21.0
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def lighten(h: str, amount: float = 0.4) -> str:
    """Aclara un hex hacia el blanco (amount 0..1). Para rescatar acentos muy oscuros sobre fondo oscuro."""
    try:
        r, g, b = _rgb(h)
    except Exception:
        return h
    r = int(r + (255 - r) * amount)
    g = int(g + (255 - g) * amount)
    b = int(b + (255 - b) * amount)
    return f"#{r:02x}{g:02x}{b:02x}"


def ensure_visible_on_dark(h: str, min_ratio: float = 3.0) -> str:
    """Si el acento tiene poco contraste contra un fondo casi negro, lo aclara hasta que se vea.
    Devuelve un hex usable (o el original si no se puede mejorar)."""
    if not _hex_ok(h):
        return h
    out = h
    for _ in range(4):
        if contrast_ratio(out, "#0b0b10") >= min_ratio:
            return out
        out = lighten(out, 0.35)
    return out


# ---------- paleta por PIL (fallback / refuerzo) ----------

def palette_from_screenshot(image_path: str):
    """Devuelve {'primary','accent'} (hex) dominantes y vibrantes del screenshot, o {} si falla.
    No rompe si no está Pillow."""
    try:
        from PIL import Image
    except Exception:
        print("[dna] PIL no disponible -> sin paleta por screenshot")
        return {}
    try:
        img = Image.open(image_path).convert("RGB").resize((80, 80))
    except Exception as e:
        print(f"[dna] no se pudo abrir screenshot para paleta: {e}")
        return {}
    buckets = {}
    for r, g, b in img.getdata():
        mx, mn = max(r, g, b), min(r, g, b)
        if (mx - mn) < 45 or mx < 50 or mx > 240:
            continue
        key = (r // 32, g // 32, b // 32)
        acc = buckets.setdefault(key, [0, 0, 0, 0])
        acc[0] += r; acc[1] += g; acc[2] += b; acc[3] += 1
    if not buckets:
        return {}
    ranked = sorted(buckets.values(), key=lambda a: a[3], reverse=True)
    def to_hex(a):
        n = a[3]
        return f"#{a[0]//n:02x}{a[1]//n:02x}{a[2]//n:02x}"
    primary = to_hex(ranked[0])
    accent = to_hex(ranked[1]) if len(ranked) > 1 else primary
    return {"primary": primary, "accent": accent}


# ---------- lectura visual con modelo multimodal ----------

_VISION_SYSTEM = """Sos director de arte. Mirás el SCREENSHOT de un sitio web y describís su ALMA
visual para guiar un video de marketing que se sienta de la misma marca.
Respondé SOLO un JSON válido (sin markdown, sin texto antes ni después) con EXACTO estas claves:
{
  "summary": "una frase: el alma visual del sitio",
  "mood": ["3-5 adjetivos de la estética: ej minimalista, oscuro, cálido, lujoso, jugueton, corporativo, editorial, orgánico, futurista, brutalista"],
  "energy": "alto | medio | bajo",
  "type_vibe": "geometrica | humanista | serif | slab | display | mono | manuscrita",
  "density": "alta | media | baja",
  "primary": "#rrggbb (color de marca principal que ves)",
  "accent": "#rrggbb (color de acento/destaque que ves)",
  "theme": "una de las opciones de theme que te paso, la que MEJOR pega con la estética"
}
Los colores tienen que ser los que REALMENTE ves en el sitio. No inventes."""


async def analyze_brand_dna(image_path: str, theme_options=None, usage: list = None) -> dict:
    """Lee el alma visual del sitio desde el screenshot. Devuelve un dict (o {} si falla).
    Combina la lectura del modelo con la paleta de PIL (PIL como refuerzo/fallback de color).
    NUNCA rompe el pipeline: ante cualquier error devuelve lo que tenga y logea [dna]."""
    pil = palette_from_screenshot(image_path) if image_path else {}

    if not image_path or _client is None or not os.path.exists(image_path):
        if not image_path:
            print("[dna] sin screenshot -> sin lectura visual (sigue con defaults)")
        elif _client is None:
            print("[dna] anthropic no disponible -> sin lectura visual")
        else:
            print(f"[dna] screenshot no existe en disco: {image_path}")
        return {"primary": pil.get("primary", ""), "accent": pil.get("accent", "")} if pil else {}

    theme_list = ", ".join(f"{k} ({v})" for k, v in (theme_options or {}).items()) or "saas-explainer, ocean-deep, organic-natural, gold-lux, crimson-bold, berry-glow, cyber-neon, sunset-warm, clinical-formal, mono-ink"

    try:
        with open(image_path, "rb") as f:
            b64 = base64.standard_b64encode(f.read()).decode("utf-8")
    except Exception as e:
        print(f"[dna] no se pudo leer el screenshot ({e}) -> uso solo PIL")
        return {"primary": pil.get("primary", ""), "accent": pil.get("accent", "")}

    try:
        resp = await _client.messages.create(
            model=VISION_MODEL, max_tokens=400, temperature=0.2,
            system=_VISION_SYSTEM,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}},
                {"type": "text", "text": f"Opciones de theme (elegí la que mejor pega): {theme_list}"},
            ]}],
        )
        if usage is not None:
            try:
                u = resp.usage
                usage.append({"stage": "vision_dna", "model": VISION_MODEL,
                              "in": int(getattr(u, "input_tokens", 0) or 0),
                              "out": int(getattr(u, "output_tokens", 0) or 0)})
            except Exception:
                pass
        raw = (resp.content[0].text or "").strip()
        # tolerar fences ```json
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:]
        dna = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
    except Exception as e:
        print(f"[dna] lectura visual falló ({e}) -> uso solo PIL (sigue con defaults)")
        return {"primary": pil.get("primary", ""), "accent": pil.get("accent", "")}

    # Validaciones + refuerzo con PIL si el modelo no dio colores válidos.
    if not _hex_ok(dna.get("primary", "")):
        dna["primary"] = pil.get("primary", "")
    if not _hex_ok(dna.get("accent", "")):
        dna["accent"] = pil.get("accent", dna.get("primary", ""))
    # acento legible sobre fondo oscuro
    if _hex_ok(dna.get("accent", "")):
        fixed = ensure_visible_on_dark(dna["accent"])
        if fixed != dna["accent"]:
            print(f"[dna] acento {dna['accent']} con poco contraste -> aclarado a {fixed}")
            dna["accent"] = fixed
    th = dna.get("theme", "")
    if theme_options and th not in theme_options:
        print(f"[dna] theme '{th}' no válido -> lo ignora (rotación elige)")
        dna["theme"] = ""
    print(f"[dna] alma: {dna.get('summary','?')} | mood={dna.get('mood')} energy={dna.get('energy')} "
          f"theme={dna.get('theme') or '(rotación)'} accent={dna.get('accent') or '?'}")
    return dna
