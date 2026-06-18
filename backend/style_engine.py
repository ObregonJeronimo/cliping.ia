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


# ====================================================================================================
# MOTOR DE UNICIDAD — parameter-space ORTOGONAL (ref docs/INVESTIGACION-MOTION.md, Tyler Hobbs/QQL).
# El problema: preset() sacaba TODAS sus elecciones (theme/bg/tone/formas/hook/...) de UN solo
# random.Random(seed) -> el stream es comun, asi que dos marcas con semillas cercanas (o el simple
# orden de consumo) caen en combos CORRELACIONADOS: cambiar una decision desbarajusta las demas.
# La solucion (fxhash/SFC32 + QQL): cada EJE deriva de su PROPIO sub-seed (hash de seed + nombre del
# eje) -> ejes estadisticamente INDEPENDIENTES. Mover un eje no toca los otros, y dos marcas que
# coinciden en un eje siguen divergiendo en los demas. Donde se puede, ejes CONTINUOS (0..1); para
# discretos, distribuciones SESGADAS (weighted/gaussian con colas raras) en vez de uniforme plana.
# ====================================================================================================
def sub_seed(seed, axis: str) -> int:
    """Sub-semilla INDEPENDIENTE por eje (namespace), estilo fxhash. hash(seed|axis) -> 32 bits.
    Dos ejes del MISMO seed NO comparten stream -> descorrelacionados; iterar un eje no mueve los otros."""
    h = hashlib.sha1(f"{int(seed) & 0xFFFFFFFF}:{axis}".encode("utf-8")).hexdigest()
    return int(h[:8], 16)


def _axis_rng(seed, axis: str) -> random.Random:
    return random.Random(sub_seed(seed, axis))


def _gauss01(rng: random.Random, mu: float = 0.5, sigma: float = 0.22) -> float:
    """Float en 0..1 con distribucion GAUSSIANA (masa al centro, colas raras). Clamp a [0,1]."""
    return min(1.0, max(0.0, rng.gauss(mu, sigma)))


def _skew01(rng: random.Random, power: float = 1.8) -> float:
    """Float 0..1 SESGADO hacia 0 (power>1) o hacia 1 (power<1). u**power -> cola larga del lado raro."""
    return rng.random() ** power


def _weighted_pick(rng: random.Random, options, weights):
    """Eleccion DISCRETA con pesos (no uniforme): el comun sale seguido, el raro a veces. Determinista por rng."""
    return rng.choices(list(options), weights=list(weights), k=1)[0]


# ====================================================================================================
# POOL COMPLETO de SISTEMAS DE FONDO (familias visuales que el motor sabe dibujar -> BG_STYLE en engineCore).
# El eje ORTOGONAL bg_system elige UNO de aca por marca, DESACOPLADO del theme/tono/estilo: dos marcas del
# mismo rubro/estilo pueden caer en familias distintas. Cada entrada lleva (peso, tonos_coherentes): el peso
# sesga la frecuencia (mesh comun, morphfield raro) y los tonos evitan combos feos (flowfield no se elige en
# claro -> evita el "blanco sobre blanco"; brutalist pide oscuro para el contraste de su slab). Determinista.
#   mesh       fluido Canva (universal)        | field      campo sobrio premium (universal)
#   spotlight  luz de escenario editorial      | bands      franjas graficas
#   aurora     organico (boreal)               | flowfield  campo de lineas generativo (Hobbs) -> oscuro
#   morphfield gran silueta que morfea         | sunburst   rayos retro 70s
#   halftone   trama riso de puntos            | brutalist  grilla cruda + slab (oscuro)
#   fluid      fluido por noise multi-octava + ondas (port Scene2Fluid) -> oscuro
_BG_SYSTEMS = {
    "mesh":       (0.15, ("dark", "light")),
    "field":      (0.15, ("dark", "light")),
    "spotlight":  (0.12, ("dark", "light")),
    "bands":      (0.12, ("dark", "light")),
    "aurora":     (0.11, ("dark", "light")),
    "flowfield":  (0.11, ("dark",)),            # campo de lineas: pide fondo oscuro (en claro lava -> blanco/blanco).
                                                # subido (0.07->0.11): con peso ralo NUNCA salia en el banco -> no se auditaba.
    "fluid":      (0.09, ("dark",)),            # fluido por noise (manchas de color que fluyen + ondas): mas rico que el
                                                # gradiente plano. Pide oscuro (el campo aditivo 'lighter' brilla sobre dark).
    "halftone":   (0.08, ("dark", "light")),
    "sunburst":   (0.07, ("dark", "light")),
    "morphfield": (0.05, ("dark", "light")),    # protagonico: raro a proposito (no abruma la galeria)
    "brutalist":  (0.04, ("dark",)),            # slab crudo: el contraste vive en oscuro
}


def bg_system_for(seed, tone: str = "dark") -> str:
    """Elige un SISTEMA DE FONDO del POOL completo, ORTOGONAL al theme/estilo (su propio sub-seed 'bg_system')
    y COHERENTE con el tono (filtra los que se ven mal en ese tono -> nunca flowfield en claro). Determinista:
    misma (seed, tono) => mismo sistema. Es lo que desacopla la FAMILIA de fondo de dos marcas iguales de rubro."""
    tone = "light" if str(tone).lower() == "light" else "dark"
    items = [(name, w) for name, (w, tones) in _BG_SYSTEMS.items() if tone in tones]
    rng = _axis_rng(seed, "bg_system")
    return _weighted_pick(rng, [n for n, _ in items], [w for _, w in items])


# Ejes del parameter-space. Cada uno es ORTOGONAL (su propio sub-seed). Los continuos (0..1) los lee el
# motor/director para modular sin caer en enums; los discretos usan distribucion sesgada (no plana).
_FEATURE_AXES = (
    "bg_system", "color_mood", "tempo", "hero_layout", "energy",
    "density", "asymmetry", "type_mood", "motion_signature",
)


def features(seed: int) -> dict:
    """Deriva EJES ORTOGONALES e INDEPENDIENTES, cada uno de su PROPIO sub-seed (hashear seed+nombre del
    eje). Cambiar un eje NO desbarajusta los otros; dos marcas que coinciden en un eje divergen en el resto.
    Es la CAPA que alimenta y DESACOPLA las elecciones de preset() (el contrato de preset NO cambia)."""
    seed = int(seed) & 0xFFFFFFFF

    r_bg = _axis_rng(seed, "bg_system")
    r_col = _axis_rng(seed, "color_mood")
    r_tempo = _axis_rng(seed, "tempo")
    r_hero = _axis_rng(seed, "hero_layout")
    r_en = _axis_rng(seed, "energy")
    r_den = _axis_rng(seed, "density")
    r_asym = _axis_rng(seed, "asymmetry")
    r_type = _axis_rng(seed, "type_mood")
    r_mot = _axis_rng(seed, "motion_signature")

    return {
        # --- CONTINUOS (0..1): el motor/director los lee para modular finamente sin enums ---
        "tempo": _gauss01(r_tempo, 0.5, 0.24),            # lento(0) <-> rapido(1); centro=medio, colas raras
        "energy": _gauss01(r_en, 0.5, 0.24),              # sereno(0) <-> electrico(1)
        "density": _gauss01(r_den, 0.5, 0.20),            # vacio/aireado(0) <-> denso/lleno(1)
        "asymmetry": _skew01(r_asym, 1.5),                # centrado(0) <-> descentrado/editorial(1); sesgo al centro
        "color_warmth": _gauss01(r_col, 0.5, 0.26),       # frio(0) <-> calido(1) (matiz fino, NO pisa el hue de rubro)
        "color_pop": _skew01(r_col, 0.9),                 # apagado(0) <-> saturado/pop(1); del MISMO sub-seed de color (mood coherente)
        # --- DISCRETOS con distribucion SESGADA (no uniforme): comun seguido, raro a veces ---
        # indice ORTOGONAL al pool de fondos del estilo (lo aplica preset, ver abajo) -> descorrelaciona bg de theme/tone
        "bg_index": _weighted_pick(r_bg, (0, 1, 2), (0.5, 0.32, 0.18)),
        # SISTEMA DE FONDO del POOL COMPLETO, eje ORTOGONAL (mismo sub-seed 'bg_system') -> la FAMILIA de fondo
        # (mesh/sunburst/halftone/brutalist/flowfield/morphfield/...) se elige DESACOPLADA del theme/estilo. Esta es
        # la version tono-agnostica (pool oscuro = el mas amplio); el director la re-resuelve por tono con bg_system_for.
        "bg_system": bg_system_for(seed, "dark"),
        # sesgo de layout de hero: type-led(0) comun, shape-led(1) a veces, asimetrico-fuerte(2) raro
        "hero_bias": _weighted_pick(r_hero, ("type", "shape", "edge"), (0.5, 0.3, 0.2)),
        # caracter tipografico: 0..1 (condensado/display vs neutro); continuo para el director
        "type_mood": _gauss01(r_type, 0.5, 0.25),
        # firma de movimiento: que ease/recurso domina (sesgado -> no todos iguales)
        "motion_signature": _weighted_pick(
            r_mot, ("smooth", "snappy", "elastic", "mechanical"), (0.34, 0.3, 0.2, 0.16)),
        # tono claro/oscuro como PROBABILIDAD independiente (la decide su propio sub-seed, ver preset)
        "tone_light_bias": _gauss01(_axis_rng(seed, "tone"), 0.5, 0.26),
        "tone_u": _axis_rng(seed, "tone_pick").random(),  # elige dentro del pool curado del rubro en el empate
        # eleccion de tema dentro del pool del rubro, de su PROPIO sub-seed (descorrela theme de bg/tono)
        "theme_u": _axis_rng(seed, "theme").random(),
        # variante de hook, sub-seed propio (no comparte stream con formas/motion)
        "hook_u": _axis_rng(seed, "hook").random(),
        # u's para las formas/iconos/lightness: cada uno su sub-seed -> intra-rubro descorrelacionado
        "morph_u": _axis_rng(seed, "morph").random(),
        "icon_u": _axis_rng(seed, "icon").random(),
        "light_u": _axis_rng(seed, "lightness").random(),
        "hue_u": _axis_rng(seed, "hue").random(),
        "sat_u": _axis_rng(seed, "sat").random(),
        "_seed": seed,
    }


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
    "tech": ["software", "saas", "tech", "tecnolog", "gadget", "plataforma", "startup", "datos", "cloud", "dev", "automatiz", "aplicacion", "videojuego", "gaming", "informatica", "robotica", "inteligencia artificial", "ciberseguridad", "streaming", "internet"],
    "salud": ["salud", "health", "clinica", "medic", "odonto", "dental", "psico", "terapia", "wellness", "farmacia", "nutri", "meditacion", "bienestar", "mental", "mindfulness"],
    "moda": ["moda", "fashion", "ropa", "indumentaria", "boutique", "calzado", "accesorio", "marca de ropa"],
    "inmobiliaria": ["inmobili", "real estate", "propiedad", "alquiler", "venta de casas", "departamento", "remax", "broker"],
    "fitness": ["gym", "gimnasio", "fitness", "crossfit", "entrenamiento", "personal trainer", "deporte", "yoga"],
    "educacion": ["educa", "curso", "academia", "escuela", "universidad", "ensen", "learning", "capacitacion", "bootcamp", "ciencia", "cientific", "divulgacion"],
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
    # flowfield = campo de lineas por value-noise seedeado (arte generativo, ref Tyler Hobbs). Sobrio/premium ->
    # va como opcion RARA (indice 2, peso 0.18) en rubros que toleran un grafico tecnico-elegante.
    "tech":         ["bands", "spotlight", "flowfield"],
    "finanzas":     ["bands", "field", "flowfield"],
    "salud":        ["field", "aurora", "mesh"],
    "belleza":      ["aurora", "field", "spotlight"],
    "moda":         ["spotlight", "bands", "aurora"],
    "gastronomia":  ["field", "mesh", "aurora"],
    "inmobiliaria": ["field", "spotlight", "flowfield"],
    "fitness":      ["spotlight", "bands", "mesh"],
    "educacion":    ["mesh", "bands", "field"],
    "default":      ["mesh", "field", "flowfield"],
}
# TONO por rubro (dark/light): rubros editoriales (moda/belleza/inmob/salud) tienden a CLARO; los bold/
# tecnicos (fitness/tech/finanzas) tienden a OSCURO. ~45% claro -> mitad de los videos cambian de liga.
# TONO por rubro. REBALANCEADO a DARK-DOMINANTE (queja del usuario: "palido lavado"): los reels premium son
# mayormente OSCUROS (el glow/particulas/acento POPEAN sobre oscuro; sobre crema se lavan). Light queda como
# MINORIA (~1/3) para variedad editorial (moda/belleza). Antes moda/belleza/inmob/salud eran 2/3 light -> palido.
_RUBRO_TONE = {
    "moda":         ["dark", "light", "dark"],
    "belleza":      ["dark", "light", "dark"],
    "inmobiliaria": ["dark", "light", "dark"],
    "salud":        ["dark", "light", "dark"],
    "educacion":    ["dark", "dark", "light"],
    "gastronomia":  ["dark", "dark", "light"],
    "tech":         ["dark", "dark", "light"],
    "finanzas":     ["dark", "dark", "light"],
    "fitness":      ["dark", "dark", "dark"],
    "default":      ["dark", "dark", "light"],
}


def _pick_u(pool, u: float):
    """Elige un elemento del pool con un float 0..1 (uniforme) -> indexa sin consumir un stream compartido."""
    pool = list(pool)
    return pool[min(len(pool) - 1, int(u * len(pool)))]


def _shuffle_u(items, rng: random.Random):
    """Baraja una COPIA con un rng dedicado (sub-seed propio) -> no comparte stream con otras decisiones."""
    out = list(items)
    rng.shuffle(out)
    return out


def preset(industria: str = "", publico: str = "", energy: str = "medio", seed: int = 0) -> dict:
    """rubro + publico + semilla -> preset de estilo determinista (tokens visuales DISJUNTOS por rubro).

    DESACOPLADO (motor de unicidad): cada eleccion (hue/sat/lightness/theme/bg/tono/formas/iconos/hook/motion)
    se sortea de su PROPIO sub-seed via features(seed) -> ejes ORTOGONALES. Antes salian todas de un solo
    random.Random(seed): el stream comun correlacionaba a dos marcas de semillas cercanas (cambiar una decision
    movia todas). Ahora theme NO comparte stream con bg_style, ni bg_style con tone, etc. El CONTRATO (claves
    devueltas) se preserva intacto: features es la CAPA que las alimenta y descorrelaciona."""
    canon = classify(industria)
    p = PROFILES[canon]
    ft = features(seed)

    # COLOR: hue y sat de sub-seeds INDEPENDIENTES (antes consumian el stream comun, arrastrando theme/tono).
    hlo, hhi = p["hue"]
    hue = hlo + ft["hue_u"] * (hhi - hlo)
    slo, shi = p["sat"]
    sat = slo + ft["sat_u"] * (shi - slo)
    # LIGHTNESS del acento VARIADA por semilla, de su PROPIO sub-seed (light_u) -> dos marcas del MISMO rubro y
    # energia ya NO salen con el MISMO color (era el caso: todos los inmobiliaria = el mismo azul). El rango de hue
    # por rubro es angosto a proposito (rubros cromaticamente DISJUNTOS); la variacion intra-rubro viene del BRILLO.
    # Banda amplia clamped a [0.42,0.70] (legible y vivo). El hue NO se toca -> los rubros siguen disjuntos.
    light = min(0.70, max(0.42, _ENERGY_LIGHT.get((energy or "medio").lower(), 0.56) + (ft["light_u"] * 0.31 - 0.15)))
    accent = _hsl_to_hex(hue, sat, light)
    # theme / bg_style / tone: cada uno de su EJE ortogonal -> descorrelacionados entre si (auditoria de acoplamiento).
    theme = _pick_u(p["themes"], ft["theme_u"])
    _bg_pool = _RUBRO_BGSTYLE.get(canon, _RUBRO_BGSTYLE["default"])
    bg_style = _bg_pool[min(len(_bg_pool) - 1, ft["bg_index"])]              # bg_index = eje propio (no el stream de theme)
    _tone_pool = _RUBRO_TONE.get(canon, _RUBRO_TONE["default"])
    tone = "light" if ft["tone_light_bias"] >= 0.5 else "dark"              # tono por su PROPIO sub-seed (no arrastrado)
    # en el empate cercano respeto el sesgo curado por rubro (pool _RUBRO_TONE), via un sub-seed propio (tone_u)
    if 0.42 < ft["tone_light_bias"] < 0.58:
        tone = _pick_u(_tone_pool, ft["tone_u"])

    # subconjunto DISJUNTO de formas/iconos para ESTA marca (de la familia del rubro), cada uno con su sub-seed
    morphs = _shuffle_u(p["morphs"], _axis_rng(seed, "morph"))
    morphs = morphs[:max(2, min(3, len(morphs)))]
    icons = _shuffle_u(p["icons"], _axis_rng(seed, "icon"))[:2]

    # densidad -> cantidad de blobs del fondo + escenas; pacing -> velocidad de lectura
    blobs = {"baja": 5, "media": 7, "alta": 9}.get(p["density"], 7)
    n_scenes = {"baja": 4, "media": 4, "alta": 5}.get(p["density"], 4)
    hook = _pick_u(p["hooks"], ft["hook_u"])
    motion = _shuffle_u(p["motion"], _axis_rng(seed, "motion_signature"))

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
        # SISTEMA DE FONDO ORTOGONAL (pool COMPLETO, eje propio bg_system) y COHERENTE con el tono ya elegido.
        # Es lo que DESACOPLA la familia de fondo del theme/estilo: el director lo usa para pisar bg_style ->
        # dos marcas del mismo rubro/estilo pueden tener fondos de familias distintas. Determinista por (seed, tono).
        "bg_system": bg_system_for(seed, tone),
        "tone": tone,
        "stmt_style": _RUBRO_STMT.get(canon, "centered"),
        # 'stmt' = POOL de estilos de statement (lista). El director (timeline_director) ya lee _preset.get("stmt")
        # para variar la composicion del statement por seed+indice; antes no existia y caia siempre al default.
        # Ahora se deriva del eje ortogonal asymmetry: descentrado -> mas editorial/left; centrado -> centered/panel.
        "stmt": (["editorial", "left", "panel", "centered"] if ft["asymmetry"] >= 0.5
                 else ["centered", "panel", "editorial", "left"]),
        "bg_texture": _RUBRO_TEX.get(canon, _RUBRO_TEX["default"]),
        # EJES ORTOGONALES (parameter-space): expuestos para que el motor/director modulen sin enums. No pisan
        # ninguna clave del contrato; son una CAPA extra. Continuos 0..1 + discretos sesgados (ver features()).
        "features": {k: ft[k] for k in (
            "tempo", "energy", "density", "asymmetry", "color_warmth", "color_pop",
            "bg_index", "bg_system", "hero_bias", "type_mood", "motion_signature", "tone_light_bias")},
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
