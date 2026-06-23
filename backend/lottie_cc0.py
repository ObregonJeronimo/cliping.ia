"""
lottie_cc0.py - FUENTES 100% LIBRES DE LICENCIA (CC0 / dominio publico / permisivas redistribuibles) para la
biblioteca Lottie de urvid. Reemplaza la dependencia de LottieFiles (cuyo pool entero esta bajo la "Lottie Simple
License" -> NO redistribuible -> lo que el usuario NO quiere). Aca cada fuente declara su LICENCIA EXACTA y solo se
usan licencias que PERMITEN redistribuir (re-hostear el JSON): CC0, dominio publico, MIT, Apache-2.0, ISC, BSD.

Fuente principal (verificada): Google "Noto Animated Emoji" (Apache-2.0) -> 881 Lottie JSON, SIN expresiones/efectos
(deterministas tal cual), riesgo de IP minimo (autoria Google), y los emoji CUBREN TODOS los rubros por concepto.
La descarga + categorizacion + registro de licencias la orquesta tools/lottie_manifest.py.

NOTA legal (registro): la licencia es del ARCHIVO/fuente (P1). Que el dibujo no contenga IP/marca ajena (P2) es
INDEPENDIENTE de la licencia y se chequea aparte (ip_suspect + revision visual). CC0 no garantiza P2.
"""
import json
import re
import urllib.request
import urllib.error

# ------------------------------------------------------------------ utilidades de red (sin deps nuevas)
def fetch_json(url, timeout=20.0):
    """Baja un JSON. None si falla (nunca rompe el pipeline)."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "urvid/1.0 (+lottie-cc0)"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as e:
        print(f"[cc0] fetch fallo: {url[:80]} -> {e}")
        return None


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:56]


# ------------------------------------------------------------------ REGISTRO DE LICENCIAS (base legal por fuente)
# Cada item del manifiesto referencia source -> esta tabla. tools/lottie_manifest.py la vuelca a lottie_licenses.json.
LICENSES = {
    "noto-animated-emoji": {
        "source": "noto-animated-emoji",
        "title": "Google Noto Animated Emoji",
        "license": "Apache-2.0",
        "spdx": "Apache-2.0",
        "redistributable": True,
        "attribution_per_render": False,
        "home": "https://googlefonts.github.io/noto-emoji-animation/",
        "license_url": "https://github.com/googlefonts/noto-emoji/blob/main/LICENSE",
        "note": ("Apache-2.0 (image resources del repo googlefonts/noto-emoji). Permite usar, modificar y "
                 "REDISTRIBUIR conservando el aviso de licencia en la fuente; no exige atribucion por render. "
                 "Autoria Google -> sin logos/marcas de terceros (riesgo IP minimo)."),
    },
}


# ------------------------------------------------------------------ CATEGORIZADOR rubro + concepto
# Mapea tokens del nombre/tag del emoji -> (rubro, concepto). El `concepto` se alinea al vocabulario de ANIM_ROUTES
# (src/urvid/core/assemble.js) para que el ruteo fino por escena encuentre la anim correcta. PRIMER match gana.
RUBROS = ("default", "finanzas", "tech", "inmobiliaria", "salud", "educacion", "gastronomia", "moda", "belleza", "fitness")

# token -> (rubro, concepto). Tokens en minuscula, sin signos (se matchea contra los tokens del tag/nombre).
CONCEPT_MAP = {
    # --- finanzas
    "money": ("finanzas", "money"), "moneybag": ("finanzas", "money"), "cash": ("finanzas", "money"),
    "banknote": ("finanzas", "money"), "dollar": ("finanzas", "dollar"), "euro": ("finanzas", "money"),
    "yen": ("finanzas", "money"), "pound": ("finanzas", "money"), "coin": ("finanzas", "coins"),
    "coins": ("finanzas", "coins"), "credit": ("finanzas", "card"), "card": ("finanzas", "card"),
    "bank": ("finanzas", "bank"), "chart": ("finanzas", "growth"), "moneybag": ("finanzas", "money"),
    "gem": ("finanzas", "savings"), "scales": ("finanzas", "finance"), "balance": ("finanzas", "finance"),
    "receipt": ("finanzas", "finance"), "abacus": ("finanzas", "finance"),
    # --- tech
    "laptop": ("tech", "code"), "computer": ("tech", "code"), "desktop": ("tech", "code"),
    "keyboard": ("tech", "code"), "robot": ("tech", "ai"), "gear": ("tech", "automation"),
    "battery": ("tech", "automation"), "satellite": ("tech", "network"), "antenna": ("tech", "network"),
    "signal": ("tech", "network"), "floppy": ("tech", "database"), "cd": ("tech", "database"),
    "dvd": ("tech", "database"), "printer": ("tech", "automation"), "joystick": ("tech", "automation"),
    "plug": ("tech", "automation"), "wrench": ("tech", "automation"), "nut": ("tech", "automation"),
    # --- salud
    "pill": ("salud", "pill"), "syringe": ("salud", "vaccine"), "stethoscope": ("salud", "stethoscope"),
    "hospital": ("salud", "hospital"), "ambulance": ("salud", "hospital"), "thermometer": ("salud", "health"),
    "microbe": ("salud", "health"), "dna": ("salud", "dna"), "bandage": ("salud", "health"),
    "tooth": ("salud", "health"), "bone": ("salud", "health"), "mask": ("salud", "health"),
    "drop": ("salud", "health"), "pills": ("salud", "pill"), "crutch": ("salud", "health"),
    # --- fitness
    "muscle": ("fitness", "muscle"), "biceps": ("fitness", "muscle"), "running": ("fitness", "running"),
    "runner": ("fitness", "running"), "lifting": ("fitness", "dumbbell"), "weightlifter": ("fitness", "dumbbell"),
    "bicycle": ("fitness", "cycling"), "cyclist": ("fitness", "cycling"), "soccer": ("fitness", "sports"),
    "basketball": ("fitness", "sports"), "football": ("fitness", "sports"), "tennis": ("fitness", "sports"),
    "swimmer": ("fitness", "sports"), "boxing": ("fitness", "sports"), "medal": ("fitness", "sports"),
    "yoga": ("fitness", "yoga"), "skier": ("fitness", "sports"), "surfer": ("fitness", "sports"),
    # --- inmobiliaria
    "house": ("inmobiliaria", "house"), "home": ("inmobiliaria", "house"), "houses": ("inmobiliaria", "house"),
    "building": ("inmobiliaria", "building"), "office": ("inmobiliaria", "building"), "hotel": ("inmobiliaria", "building"),
    "key": ("inmobiliaria", "key"), "door": ("inmobiliaria", "door"), "construction": ("inmobiliaria", "moving"),
    "brick": ("inmobiliaria", "building"), "bricks": ("inmobiliaria", "building"), "hammer": ("inmobiliaria", "moving"),
    "city": ("inmobiliaria", "building"), "cityscape": ("inmobiliaria", "building"),
    # --- educacion
    "graduation": ("educacion", "graduation"), "book": ("educacion", "book"), "books": ("educacion", "book"),
    "notebook": ("educacion", "study"), "pencil": ("educacion", "pencil"), "pen": ("educacion", "pencil"),
    "school": ("educacion", "school"), "backpack": ("educacion", "school"), "microscope": ("educacion", "study"),
    "telescope": ("educacion", "study"), "ruler": ("educacion", "study"), "memo": ("educacion", "study"),
    "newspaper": ("educacion", "study"),
    # --- gastronomia
    "pizza": ("gastronomia", "pizza"), "hamburger": ("gastronomia", "burger"), "burger": ("gastronomia", "burger"),
    "coffee": ("gastronomia", "coffee"), "tea": ("gastronomia", "coffee"), "beverage": ("gastronomia", "coffee"),
    "wine": ("gastronomia", "wine"), "beer": ("gastronomia", "wine"), "cocktail": ("gastronomia", "wine"),
    "cake": ("gastronomia", "cake"), "cupcake": ("gastronomia", "cake"), "icecream": ("gastronomia", "ice"),
    "ice": ("gastronomia", "ice"), "sushi": ("gastronomia", "food"), "taco": ("gastronomia", "food"),
    "donut": ("gastronomia", "food"), "doughnut": ("gastronomia", "food"), "bread": ("gastronomia", "food"),
    "croissant": ("gastronomia", "food"), "fries": ("gastronomia", "food"), "hotdog": ("gastronomia", "food"),
    "salad": ("gastronomia", "food"), "fruit": ("gastronomia", "food"), "apple": ("gastronomia", "food"),
    "banana": ("gastronomia", "food"), "chef": ("gastronomia", "chef"), "cooking": ("gastronomia", "chef"),
    "fork": ("gastronomia", "menu"), "plate": ("gastronomia", "menu"), "spoon": ("gastronomia", "menu"),
    # --- moda / ecommerce
    "shopping": ("moda", "shopping"), "handbag": ("moda", "bag"), "purse": ("moda", "bag"),
    "bag": ("moda", "bag"), "dress": ("moda", "dress"), "shirt": ("moda", "dress"), "tshirt": ("moda", "dress"),
    "jeans": ("moda", "dress"), "coat": ("moda", "dress"), "bikini": ("moda", "dress"), "kimono": ("moda", "dress"),
    "shoe": ("moda", "shoes"), "sandal": ("moda", "shoes"), "boot": ("moda", "shoes"), "sneaker": ("moda", "shoes"),
    "heel": ("moda", "shoes"), "sunglasses": ("moda", "store"), "glasses": ("moda", "store"),
    "hat": ("moda", "store"), "crown": ("moda", "store"), "ring": ("moda", "store"),
    # --- belleza
    "lipstick": ("belleza", "lipstick"), "nail": ("belleza", "cosmetics"), "polish": ("belleza", "cosmetics"),
    "makeup": ("belleza", "makeup"), "comb": ("belleza", "salon"), "mirror": ("belleza", "salon"),
    "haircut": ("belleza", "salon"), "lotion": ("belleza", "skincare"), "soap": ("belleza", "skincare"),
    "razor": ("belleza", "salon"), "massage": ("belleza", "spa"), "barber": ("belleza", "salon"),
    # --- universal / default (alineado a routes default/contacto/rating/crece/seguro/agenda)
    "star": ("default", "star"), "glowingstar": ("default", "star"), "sparkles": ("default", "magic"),
    "sparkle": ("default", "magic"), "heart": ("default", "heart"), "hearts": ("default", "heart"),
    "thumbsup": ("default", "thumbs"), "thumbs": ("default", "thumbs"), "ok": ("default", "check"),
    "check": ("default", "check"), "checkmark": ("default", "check"), "tick": ("default", "check"),
    "bell": ("default", "notification"), "rocket": ("default", "rocket"), "trophy": ("default", "trophy"),
    "gift": ("default", "gift"), "party": ("default", "confetti"), "confetti": ("default", "confetti"),
    "popper": ("default", "confetti"), "balloon": ("default", "confetti"), "calendar": ("default", "calendar"),
    "alarm": ("default", "clock"), "clock": ("default", "clock"), "watch": ("default", "clock"),
    "timer": ("default", "clock"), "hourglass": ("default", "clock"), "bulb": ("default", "idea"),
    "lightbulb": ("default", "idea"), "magnifying": ("default", "search"), "glass": ("default", "search"),
    "lock": ("tech", "lock"), "locked": ("tech", "lock"), "unlock": ("tech", "lock"), "shield": ("tech", "shield"),
    "key": ("inmobiliaria", "key"), "speech": ("default", "chat"), "balloon": ("default", "confetti"),
    "telephone": ("default", "phone"), "phone": ("default", "phone"), "envelope": ("default", "email"),
    "email": ("default", "email"), "mail": ("default", "email"), "megaphone": ("default", "notification"),
    "loudspeaker": ("default", "notification"), "fire": ("default", "fire"), "eye": ("default", "eye"),
    "eyes": ("default", "eye"), "handshake": ("default", "handshake"), "globe": ("default", "world"),
    "world": ("default", "world"), "target": ("default", "target"), "dart": ("default", "target"),
    "bullseye": ("default", "target"), "package": ("moda", "send"), "rainbow": ("default", "magic"),
    "crown": ("moda", "store"), "hundred": ("default", "growth"), "up": ("default", "up"),
    "chartincreasing": ("finanzas", "growth"), "flag": ("default", "flag"),
}

# si ningun token matchea: fallback por categoria de Noto -> (rubro, concepto)
CATEGORY_FALLBACK = {
    "Smileys and emotions": ("default", "face"),
    "People": ("default", "people"),
    "Animals and nature": ("default", "nature"),
    "Food and drink": ("gastronomia", "food"),
    "Travel and places": ("default", "travel"),
    "Activities and events": ("default", "confetti"),
    "Objects": ("default", "object"),
    "Symbols": ("default", "symbol"),
    "Flags": ("default", "flag"),
}


def _tokens(name, tag):
    """tokens en minuscula del tag (':money-bag:' -> [money, bag]) + nombre legible. Solo match EXACTO por token:
    el match por subcadena daba falsos positivos graves (monkey->key, snail->nail, open->pen)."""
    raw = (tag or "").strip(":") + " " + (name or "")
    parts = re.split(r"[^a-z0-9]+", raw.lower())
    return [p for p in parts if p]


def categorize(name, tag, categories):
    """Devuelve (rubro, concepto). Match EXACTO de algun token contra CONCEPT_MAP; si no, fallback por categoria Noto."""
    for t in _tokens(name, tag):
        if t in CONCEPT_MAP:
            return CONCEPT_MAP[t]
    for c in (categories or []):
        if c in CATEGORY_FALLBACK:
            return CATEGORY_FALLBACK[c]
    return ("default", "object")


# ------------------------------------------------------------------ VERIFICACION DE IP (P2) - parseo estatico, $0
# Detecta senales de IP/marca AJENA dentro del JSON (independiente de la licencia del archivo). Lo que marca como
# sospechoso se revisa visualmente (yo, en sesion) antes de incluirlo. Para Noto da limpio (shapes puros, sin imagenes
# ni texto). Sirve sobre todo para fuentes con assets embebidos (airbnb) y, a futuro, uploads de usuario.
# OJO: solo tokens DISTINTIVOS de marca. Se excluyen los que chocan con palabras comunes / naturaleza
# (apple=fruta, amazon=selva/rio, coca=coco/planta) para no marcar emoji genericos como sospechosos.
BRANDS = {"nike", "adidas", "google", "spotify", "netflix", "disney", "marvel", "twitter", "facebook",
          "instagram", "tiktok", "youtube", "starbucks", "mcdonalds", "pepsi",
          "deadpool", "batman", "superman", "pokemon", "mickey", "pikachu", "bb8", "dalek"}


def ip_suspect(lottie, name=""):
    """Devuelve lista de razones de sospecha de IP (vacia = limpio). NO baja red; opera sobre el JSON ya cargado."""
    reasons = []
    assets = lottie.get("assets") or []
    for a in assets:
        p = str(a.get("p") or "")
        if a.get("e") == 1 or p.startswith("data:") or p.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
            reasons.append("imagen-embebida")          # un raster embebido puede ser un logo/foto con IP
            break
    layers = lottie.get("layers") or []
    if any((l.get("ty") == 5) for l in layers):
        reasons.append("capa-de-texto")               # texto puede traer una marca
    toks = set(_tokens(name, name))
    if toks & BRANDS:
        reasons.append("nombre-de-marca")
    return reasons


# ------------------------------------------------------------------ FUENTE: Noto Animated Emoji
NOTO_INDEX = "https://googlefonts.github.io/noto-emoji-animation/data/api.json"
NOTO_ASSET = "https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/lottie.json"


def noto_candidates():
    """Lista de candidatos Noto: {id, name, concept, rubro, url, source, license, tag, codepoint}. Sin bajar el JSON."""
    idx = fetch_json(NOTO_INDEX)
    if not idx or "icons" not in idx:
        print("[cc0] no se pudo leer el indice de Noto")
        return []
    out, seen_names, seen_cp = [], set(), set()
    for it in idx["icons"]:
        cp = it.get("codepoint")
        if not cp:
            continue
        # DEDUP de variantes de tono de piel (mismo codepoint base + modificador 1f3fb..1f3ff) y nombres repetidos
        # -> evita 6 'muscle'/'nail care' identicos. Nos quedamos con la primera (base) de cada nombre.
        base = "-".join(p for p in cp.split("-") if p not in ("1f3fb", "1f3fc", "1f3fd", "1f3fe", "1f3ff"))
        if base in seen_cp:
            continue
        tag = (it.get("tags") or [""])[0]
        nm = (tag or "").strip(":").replace("-", " ") or it.get("name") or cp
        if nm in seen_names:
            continue
        seen_cp.add(base); seen_names.add(nm)
        rubro, concept = categorize(nm, tag, it.get("categories"))
        out.append({
            "id": "noto-" + slug(nm) + "-" + cp,
            "name": nm[:60],
            "concept": concept,
            "rubro": rubro,
            "url": NOTO_ASSET.format(cp=cp),       # url de descarga (el manifiesto guardara la ruta self-host)
            "source": "noto-animated-emoji",
            "license": "Apache-2.0",
            "tag": tag,
            "codepoint": cp,
        })
    return out


if __name__ == "__main__":
    # dry-run: distribucion de categorizacion (sin bajar JSON)
    cands = noto_candidates()
    from collections import Counter
    rc = Counter(c["rubro"] for c in cands)
    print(f"candidatos: {len(cands)}")
    print("por rubro:", dict(rc))
    for ru in RUBROS:
        sample = [c for c in cands if c["rubro"] == ru][:8]
        print(f"  {ru:14}", ", ".join(f"{c['name']}~{c['concept']}" for c in sample))
