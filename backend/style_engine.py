"""
style_engine.py — capa de DIRECCION GENERATIVA anti-patron (POC 3).

Problema: la IA director arma siempre estructuras parecidas. La causa NO es el motor (puede infinito);
es que el vocabulario es chico y el sampling colapsa al "modo". Este modulo es una GRAMATICA COMPOSITIVA
PURA (sin IA, sin red): mapea rubro + publico + una SEMILLA a un "preset de estilo" con tokens visuales
DISJUNTOS por rubro. Dos marcas del mismo rubro reciben semillas distintas -> presets distintos; dos
rubros distintos reciben familias de color/forma/ritmo distintas -> se sienten MUY distintos.

Es determinista (random.Random(seed)) -> testeable y reproducible. El director (timeline_director.py)
lo usa para: (a) fijar tl["seed"] (el fondo fluido varia por marca), (b) inyectar tokens al prompt
(paleta/ritmo/densidad/formas permitidas) y un String-Seed para diversidad fiel a la marca.

NO reemplaza al LLM: lo ACOTA y lo DIVERSIFICA. El LLM sigue escribiendo el copy y el arco.
"""
from __future__ import annotations
import json
import random
import hashlib


# ---------- color helpers (puros) ----------
def _hsl_to_hex(h: float, s: float, l: float) -> str:
    h = (h % 360) / 360.0
    s = max(0.0, min(1.0, s))
    l = max(0.0, min(1.0, l))

    def hue2rgb(p, q, t):
        if t < 0: t += 1
        if t > 1: t -= 1
        if t < 1 / 6: return p + (q - p) * 6 * t
        if t < 1 / 2: return q
        if t < 2 / 3: return p + (q - p) * (2 / 3 - t) * 6
        return p

    if s == 0:
        r = g = b = l
    else:
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def stable_seed(*parts) -> int:
    """Semilla ESTABLE (32 bits) a partir de strings (marca+url+...). Misma entrada => misma semilla."""
    h = hashlib.sha1("|".join(str(p or "") for p in parts).encode("utf-8")).hexdigest()
    return int(h[:8], 16)


# ---------- gramatica por RUBRO ----------
# Cada perfil define FAMILIAS DISJUNTAS de color (rango de hue), formas (morph), iconos, ritmo (pacing),
# densidad y enfasis de movimiento. Es dato CURADO (tendencia, no taxonomia dura) -> se ajusta a mano.
# Los rangos de hue por rubro hacen que dos rubros NO compartan paleta; la semilla elige dentro del rango.
PROFILES = {
    "gastronomia": {
        "hue": (16, 40), "sat": (0.62, 0.82), "themes": ["sunset-warm", "organic-natural", "crimson-bold"],
        "morphs": ["drop", "blob", "circle", "flower"], "icons": ["leaf", "check", "star"],
        "pacing": "calido", "density": "media", "motion": ["outBack", "stagger", "morph"],
        "hooks": ["sensorial", "antojo", "origen"],
    },
    "tech": {
        "hue": (224, 248), "sat": (0.58, 0.82), "themes": ["saas-explainer", "cyber-neon", "clinical-formal"],
        "morphs": ["hexagon", "square", "gear", "triangle"], "icons": ["box", "check", "dot"],
        "pacing": "rapido", "density": "alta", "motion": ["path", "outExpo", "stagger"],
        "hooks": ["dolor", "antes-despues", "dato"],
    },
    "salud": {
        "hue": (172, 192), "sat": (0.42, 0.60), "themes": ["clinical-formal", "ocean-deep", "organic-natural"],
        "morphs": ["plus", "circle", "heart", "leaf"], "icons": ["check", "star", "leaf"],
        "pacing": "sereno", "density": "baja", "motion": ["outCubic", "morph"],
        "hooks": ["confianza", "cuidado", "dato"],
    },
    "moda": {
        "hue": (292, 316), "sat": (0.55, 0.8), "themes": ["berry-glow", "crimson-bold", "gold-lux"],
        "morphs": ["star5", "diamond", "flower", "blob"], "icons": ["star", "dot"],
        "pacing": "editorial", "density": "media", "motion": ["path", "outExpo", "morph"],
        "hooks": ["aspiracional", "drop", "identidad"],
    },
    "inmobiliaria": {
        "hue": (200, 216), "sat": (0.34, 0.52), "themes": ["ocean-deep", "clinical-formal", "saas-explainer"],
        "morphs": ["square", "house", "hexagon", "circle"], "icons": ["house", "check", "dot"],
        "pacing": "sereno", "density": "media", "motion": ["outCubic", "stagger"],
        "hooks": ["aspiracional", "oportunidad", "dato"],
    },
    "fitness": {
        # rojo/crimson (350-372 -> wrap) para SEPARARLO del naranja de gastronomia (8-42) en la galeria.
        "hue": (350, 372), "sat": (0.7, 0.9), "themes": ["crimson-bold", "cyber-neon", "sunset-warm"],
        "morphs": ["triangle", "star5", "blob"], "icons": ["star", "check", "dot"],
        "pacing": "energico", "density": "alta", "motion": ["outBack", "stagger", "outExpo"],
        "hooks": ["reto", "antes-despues", "energia"],
    },
    "educacion": {
        # violeta (separa del azul de tech/inmobiliaria en la galeria)
        "hue": (262, 286), "sat": (0.5, 0.72), "themes": ["berry-glow", "saas-explainer", "clinical-formal"],
        "morphs": ["circle", "hexagon", "star5", "plus"], "icons": ["check", "star", "box"],
        "pacing": "claro", "density": "media", "motion": ["stagger", "morph"],
        "hooks": ["dolor", "promesa", "dato"],
    },
    "finanzas": {
        "hue": (140, 162), "sat": (0.42, 0.58), "themes": ["clinical-formal", "saas-explainer", "mono-ink"],
        "morphs": ["square", "hexagon", "triangle", "circle"], "icons": ["check", "dot", "box"],
        "pacing": "sobrio", "density": "baja", "motion": ["outCubic", "path"],
        "hooks": ["confianza", "dato", "oportunidad"],
    },
    "belleza": {
        "hue": (320, 344), "sat": (0.5, 0.75), "themes": ["berry-glow", "gold-lux", "crimson-bold"],
        "morphs": ["flower", "drop", "blob", "star5"], "icons": ["star", "leaf", "dot"],
        "pacing": "editorial", "density": "baja", "motion": ["morph", "outExpo"],
        "hooks": ["aspiracional", "sensorial", "identidad"],
    },
    "default": {
        # neutro grafito (baja saturacion) para que NO colisione con ningun rubro vivido (ej tech azul).
        "hue": (210, 232), "sat": (0.10, 0.22), "themes": ["mono-ink", "clinical-formal"],
        "morphs": ["circle", "square", "blob", "hexagon"], "icons": ["check", "dot"],
        "pacing": "claro", "density": "media", "motion": ["outCubic", "stagger", "morph"],
        "hooks": ["dolor", "promesa", "dato"],
    },
}

# clasificador rubro: free-text (es/en) -> clave canonica, por keywords.
_KEYWORDS = {
    "gastronomia": ["restaurant", "comida", "food", "gastro", "cocina", "cafe", "panaderia", "dietetica", "almacen", "bebida", "menu", "delivery de comida", "pizzeria"],
    "tech": ["software", "saas", "tech", "plataforma", "startup", "datos", "cloud", "dev", "automatiz", "aplicacion"],
    "salud": ["salud", "health", "clinica", "medic", "odonto", "dental", "psico", "terapia", "wellness", "farmacia", "nutri"],
    "moda": ["moda", "fashion", "ropa", "indumentaria", "boutique", "calzado", "accesorio", "marca de ropa"],
    "inmobiliaria": ["inmobili", "real estate", "propiedad", "alquiler", "venta de casas", "departamento", "remax", "broker"],
    "fitness": ["gym", "gimnasio", "fitness", "crossfit", "entrenamiento", "personal trainer", "deporte", "yoga"],
    "educacion": ["educa", "curso", "academia", "escuela", "universidad", "ensen", "learning", "capacitacion", "bootcamp"],
    "finanzas": ["finanz", "fintech", "banco", "credito", "inversion", "seguro", "contab", "prestamo", "cripto"],
    "belleza": ["belleza", "beauty", "estetica", "spa", "peluqueria", "cosmetic", "maquillaje", "skincare", "uñas", "barberia"],
}


def classify(industria_text: str) -> str:
    """Free-text de rubro -> clave canonica. Por PUNTAJE (mas keywords = gana), no por 1er match: asi
    'fintech de inversiones' cae en finanzas (fintech+inversion) y no en tech, y 'inmobiliaria' no se
    confunde. Mas especifico antes que generico cuando hay empate (orden de _KEYWORDS)."""
    t = (industria_text or "").lower()
    best, best_score = "default", 0
    for key, words in _KEYWORDS.items():
        score = sum(1 for w in words if w in t)
        if score > best_score:
            best_score, best = score, key
    return best


_ENERGY_LIGHT = {"alto": 0.60, "medio": 0.56, "bajo": 0.52}

# Estilo de marcador del checklist y de CTA por rubro -> rompe el molde compartido (no solo el color).
# Lo consume el motor (engineCore sceneList/sceneOutro) via los campos listStyle/ctaStyle de la escena.
_RUBRO_MARKER = {
    "gastronomia": ("check", "pill"), "tech": ("dash", "chip"), "salud": ("check", "pill"),
    "moda": ("number", "chip"), "inmobiliaria": ("number", "pill"), "fitness": ("bar", "chip"),
    "educacion": ("number", "pill"), "finanzas": ("bar", "chip"), "belleza": ("check", "pill"),
    "default": ("dash", "pill"),
}
# Textura del fondo por rubro -> el fondo deja de ser un gradiente generico y aporta IDENTIDAD.
_RUBRO_TEX = {
    "gastronomia": "grain", "tech": "grid", "salud": "grain", "moda": "lines", "inmobiliaria": "lines",
    "fitness": "grain2", "educacion": "grid", "finanzas": "grid", "belleza": "grain", "default": "none",
}
# Energia del fondo por rubro: rapido/electrico (tech, fitness) vs sereno (salud, inmobiliaria).
_RUBRO_ENERGY = {
    "gastronomia": 1.0, "tech": 1.5, "salud": 0.7, "moda": 1.1, "inmobiliaria": 0.7,
    "fitness": 1.6, "educacion": 1.2, "finanzas": 1.2, "belleza": 0.8, "default": 1.0,
}
# Layout del statement: 'left' editorial (tech/finanzas/moda/inmob/educ) vs 'centered' (calidos).
_RUBRO_STMT = {
    "tech": "left", "finanzas": "left", "moda": "left", "inmobiliaria": "left", "educacion": "left",
    "gastronomia": "centered", "salud": "centered", "belleza": "centered", "fitness": "centered", "default": "centered",
}
# SISTEMA DE FONDO por rubro (la semilla elige uno del pool) -> dos marcas no comparten el mismo "mundo"
# visual de fondo. mesh=fluido | field=sobrio | spotlight=editorial dramatico | bands=grafico | aurora=organico.
_RUBRO_BGSTYLE = {
    "tech":         ["bands", "spotlight", "mesh"],
    "finanzas":     ["bands", "field", "spotlight"],
    "salud":        ["field", "aurora", "mesh"],
    "belleza":      ["aurora", "field", "spotlight"],
    "moda":         ["spotlight", "bands", "aurora"],
    "gastronomia":  ["field", "mesh", "aurora"],
    "inmobiliaria": ["field", "spotlight", "mesh"],
    "fitness":      ["spotlight", "bands", "mesh"],
    "educacion":    ["mesh", "bands", "field"],
    "default":      ["mesh", "field", "spotlight"],
}
# TONO por rubro (dark/light): rubros editoriales (moda/belleza/inmob/salud) tienden a CLARO; los bold/
# tecnicos (fitness/tech/finanzas) tienden a OSCURO. ~45% claro -> mitad de los videos cambian de liga.
_RUBRO_TONE = {
    "moda":         ["light", "dark", "light"],
    "belleza":      ["light", "light", "dark"],
    "inmobiliaria": ["light", "dark", "light"],
    "salud":        ["light", "dark", "light"],
    "educacion":    ["light", "dark", "dark"],
    "gastronomia":  ["light", "dark", "dark"],
    "tech":         ["dark", "dark", "light"],
    "finanzas":     ["dark", "light", "dark"],
    "fitness":      ["dark", "dark", "dark"],
    "default":      ["dark", "light", "dark"],
}


def preset(industria: str = "", publico: str = "", energy: str = "medio", seed: int = 0) -> dict:
    """rubro + publico + semilla -> preset de estilo determinista (tokens visuales DISJUNTOS por rubro)."""
    canon = classify(industria)
    p = PROFILES[canon]
    rnd = random.Random(int(seed) & 0xFFFFFFFF)

    hue = rnd.uniform(*p["hue"])
    sat = rnd.uniform(*p["sat"])
    # LIGHTNESS del acento VARIADA por semilla. Antes era FIJA por energia (0.52/0.56/0.60) -> dos marcas del
    # MISMO rubro y energia salian con el MISMO color exacto (todos los inmobiliaria = el mismo azul, todos los
    # tech = el mismo indigo). El rango de hue por rubro es angosto a proposito (rubros cromaticamente DISJUNTOS),
    # asi que la variacion intra-rubro tiene que venir del BRILLO: una marca profunda/oscura, otra clara/brillante.
    # Banda amplia clamped a [0.42,0.70] (legible y vivo). El hue NO se toca -> los rubros siguen disjuntos.
    light = min(0.70, max(0.42, _ENERGY_LIGHT.get((energy or "medio").lower(), 0.56) + rnd.uniform(-0.15, 0.16)))
    accent = _hsl_to_hex(hue, sat, light)
    theme = rnd.choice(p["themes"])
    bg_style = rnd.choice(_RUBRO_BGSTYLE.get(canon, _RUBRO_BGSTYLE["default"]))
    tone = rnd.choice(_RUBRO_TONE.get(canon, _RUBRO_TONE["default"]))

    # subconjunto DISJUNTO de formas/iconos para ESTA marca (de la familia del rubro)
    morphs = p["morphs"][:]
    rnd.shuffle(morphs)
    morphs = morphs[:max(2, min(3, len(morphs)))]
    icons = p["icons"][:]
    rnd.shuffle(icons)
    icons = icons[:2]

    # densidad -> cantidad de blobs del fondo + escenas; pacing -> velocidad de lectura
    blobs = {"baja": 5, "media": 7, "alta": 9}.get(p["density"], 7)
    n_scenes = {"baja": 4, "media": 4, "alta": 5}.get(p["density"], 4)
    hook = rnd.choice(p["hooks"])
    motion = p["motion"][:]
    rnd.shuffle(motion)

    return {
        "rubro": canon,
        "seed": int(seed) & 0xFFFFFFFF,
        "accent": accent,
        "theme": theme,
        "pacing": p["pacing"],
        "density": p["density"],
        "bg_blobs": blobs,
        "n_scenes": n_scenes,
        "morphs": morphs,
        "icons": icons,
        "motion": motion[:2],
        "hook_bias": hook,
        "list_style": _RUBRO_MARKER.get(canon, _RUBRO_MARKER["default"])[0],
        "cta_style": _RUBRO_MARKER.get(canon, _RUBRO_MARKER["default"])[1],
        "bg_texture": _RUBRO_TEX.get(canon, _RUBRO_TEX["default"]),
        "bg_energy": _RUBRO_ENERGY.get(canon, 1.0),
        "bg_style": bg_style,
        "tone": tone,
        "stmt_style": _RUBRO_STMT.get(canon, "centered"),
        "bg_texture": _RUBRO_TEX.get(canon, _RUBRO_TEX["default"]),
        # String-Seed-of-Thought: cadena estable que el LLM usa como ancla de diversidad fiel a la marca
        "style_seed": f"{canon}-{seed & 0xFFFF:04x}-{theme}",
    }


def prompt_block(pre: dict) -> str:
    """Bloque legible para inyectar en el prompt del director (acota vocabulario sin matar creatividad)."""
    return (
        "PRESET DE ESTILO (gramatica por rubro; respetalo para que ESTA marca no se parezca a otras):\n"
        f"- rubro detectado: {pre['rubro']} | ritmo: {pre['pacing']} | densidad: {pre['density']}\n"
        f"- acento sugerido: {pre['accent']} | tema visual: {pre['theme']}\n"
        f"- formas (morph) preferidas para esta marca: {', '.join(pre['morphs'])}\n"
        f"- recursos de movimiento a priorizar: {', '.join(pre['motion'])}\n"
        f"- gancho sugerido: {pre['hook_bias']}\n"
        f"- STRING-SEED (anclate a esta semilla para tomar decisiones distintivas y NO genericas): "
        f"\"{pre['style_seed']}\"\n"
        "Usa estos tokens como GUIA (no los nombres literales en el copy). El objetivo: que el video se "
        "sienta de ESTE rubro y ESTA marca, distinto de cualquier otro."
    )


if __name__ == "__main__":
    # CLI: emite presets de ejemplo (para el renderer JS y el lab). Uso: python style_engine.py [n]
    import sys
    samples = [
        ("restaurant de comida natural", "familias", "medio"),
        ("almacen organico", "familias", "medio"),          # mismo rubro, otra marca -> distinto
        ("plataforma SaaS de automatizacion", "pymes", "alto"),
        ("clinica odontologica", "adultos", "bajo"),
        ("marca de ropa urbana", "jovenes", "alto"),
        ("inmobiliaria premium", "inversores", "medio"),
        ("gimnasio crossfit", "deportistas", "alto"),
        ("fintech de inversiones", "profesionales", "medio"),
    ]
    out = []
    for i, (ind, pub, en) in enumerate(samples):
        sd = stable_seed(ind, "demo", i)
        out.append({"label": ind, **preset(ind, pub, en, sd)})
    print(json.dumps(out, ensure_ascii=False, indent=2))
