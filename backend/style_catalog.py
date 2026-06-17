"""
style_catalog.py — CATALOGO DE ESTILOS compartido (lo que el USUARIO elige) + resolucion a campos de timeline.

Lo usan el director MOCK (mock_director, offline/test) y el director de PRODUCCION (timeline_director, con LLM).
Cada estilo es una direccion de arte completa: tratamiento de FONDO + tono + modo de sombra + textura +
composiciones de hero + statement + lista + end-card + ritmo + estructura narrativa. El RUBRO queda ORTOGONAL:
aporta color + el MOTIVO del fondo (skyline/sparkline/vapor/...). 12 estilos, ordenados de seguro -> audaz.
Basado en investigacion de video marketing 2026.
"""
from __future__ import annotations

# multiplicadores de RITMO (duracion por tipo de escena) y POOLS de estructura narrativa reutilizables
_RH_SLOW = {"scene": 1.12, "statement": 1.0, "checklist": 1.02, "bigStat": 0.98, "outro": 1.06}
_RH_MED = {"scene": 1.0, "statement": 0.95, "checklist": 1.0, "bigStat": 0.96, "outro": 1.0}
_RH_FAST = {"scene": 0.95, "statement": 0.8, "checklist": 0.86, "bigStat": 0.84, "outro": 0.9}
# NOTA: las variantes con "bigStat" (numero que cuenta de 0) solo rinden el count-up si el director da un dato
# numerico REAL (precio/m2/ROI); si no hay numero, el motor cae a statement (nunca inventa cifras).
_ST_PREMIUM = [["hero", "statement", "outro"], ["statement", "hero", "outro"], ["hero", "statement", "checklist", "outro"], ["hero", "bigStat", "outro"]]
_ST_PUNCHY = [["statement", "hero", "outro"], ["statement", "statement", "outro"], ["hero", "outro"], ["hero", "statement", "outro"], ["hero", "bigStat", "outro"]]
_ST_FULL = [["hero", "statement", "checklist", "outro"], ["hero", "checklist", "outro"], ["statement", "hero", "checklist", "outro"], ["hero", "statement", "outro"], ["hero", "bigStat", "checklist", "outro"]]

STYLE_PRESETS = {
    "blueprint":   {"nombre": "Blueprint", "bg": "blueprint", "light_p": 0.12, "shadow": "soft", "tex": "grid",
                    "comps": ["typeStack", "typeLower", "sideLeft"], "stmt": ["editorial", "left"], "list": "number", "grid_p": 0.0,
                    "outro": ["bigtype", "diagonal", "left"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "swiss":       {"nombre": "Swiss / Grid", "bg": "blueprint", "light_p": 0.92, "shadow": "soft", "tex": "grid",
                    "comps": ["typeStack", "typeLower", "sideLeft"], "stmt": ["centered", "panel"], "list": "dash", "grid_p": 0.5,
                    "outro": ["left", "diagonal", "center"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "platinum":    {"nombre": "Platinum Linear", "bg": "spotlight", "light_p": 0.08, "shadow": "soft", "tex": "grid",
                    "comps": ["typeSlam", "typeOnly", "sideLeft"], "stmt": ["editorial", "centered"], "list": "dash", "grid_p": 0.3,
                    "outro": ["bigtype", "ctaOnly", "diagonal"], "rhythm": _RH_MED, "structs": _ST_PREMIUM},
    "obsidian":    {"nombre": "Obsidian Luxe", "bg": "field", "light_p": 0.0, "shadow": "soft", "tex": "grain",
                    "comps": ["typeOnly", "typeStack", "cornerAnchor"], "stmt": ["quote", "editorial"], "list": "number", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype", "center"], "rhythm": _RH_SLOW, "structs": _ST_PREMIUM},
    "meshflow":    {"nombre": "Mesh Flow", "bg": "mesh", "light_p": 0.25, "shadow": "soft", "tex": "none",
                    "comps": ["typeSlam", "typeStack", "shapeBehind"], "stmt": ["centered", "editorial"], "list": "check", "grid_p": 0.0,
                    "outro": ["bigtype", "center", "diagonal"], "rhythm": _RH_MED, "structs": _ST_PREMIUM},
    "aurora":      {"nombre": "Aurora Flux", "bg": "aurora", "light_p": 0.4, "shadow": "soft", "tex": "grain",
                    "comps": ["shapeBehind", "cornerAnchor", "typeStack"], "stmt": ["quote", "panel"], "list": "check", "grid_p": 0.3,
                    "outro": ["center", "bar", "ctaOnly"], "rhythm": _RH_SLOW, "structs": _ST_PREMIUM},
    "handmade":    {"nombre": "Hecho a Mano", "bg": "paper", "light_p": 0.9, "shadow": "soft", "tex": "grain",
                    "comps": ["typeStack", "cornerAnchor", "typeOnly"], "stmt": ["panel", "quote"], "list": "check", "grid_p": 0.0,
                    "outro": ["left", "center", "diagonal"], "rhythm": _RH_SLOW, "structs": _ST_FULL},
    "brutalist":   {"nombre": "Neo-Brutalist", "bg": "brutalist", "light_p": 0.25, "shadow": "hard", "tex": "none",
                    "comps": ["typeTop", "typeOnly", "typeStack"], "stmt": ["editorial", "centered"], "list": "bar", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
    "typographic": {"nombre": "Typographic", "bg": "typo", "light_p": 0.25, "shadow": "soft", "tex": "none",
                    "comps": ["typeSlam", "typeOnly", "typeStack"], "stmt": ["editorial"], "list": "number", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_MED, "structs": _ST_PUNCHY},
    "riso":        {"nombre": "Risograph", "bg": "halftone", "light_p": 0.25, "shadow": "hard", "tex": "none",
                    "comps": ["typeStack", "cornerAnchor", "typeOnly"], "stmt": ["editorial", "quote"], "list": "number", "grid_p": 0.0,
                    "outro": ["diagonal", "left", "ctaOnly"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "retro70s":    {"nombre": "Retro 70s", "bg": "sunburst", "light_p": 0.45, "shadow": "soft", "tex": "grain",
                    "comps": ["typeSlam", "typeStack", "typeOnly"], "stmt": ["centered", "panel"], "list": "check", "grid_p": 0.0,
                    "outro": ["center", "bigtype"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "sport":       {"nombre": "Sport Velocity", "bg": "speedlines", "light_p": 0.05, "shadow": "hard", "tex": "none",
                    "comps": ["typeOnly", "typeSlam", "diagonal"], "stmt": ["editorial", "centered"], "list": "bar", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
    # --- ESTILOS NUEVOS (tanda 1): cubren huecos del catalogo para mas opciones del usuario ---
    "editorial":   {"nombre": "Editorial Magazine", "bg": "editorial", "light_p": 0.95, "shadow": "soft", "tex": "grain",
                    "comps": ["typeStack", "typeOnly", "sideLeft"], "stmt": ["editorial", "quote"], "list": "number", "grid_p": 0.0,
                    "outro": ["left", "center", "bigtype"], "rhythm": _RH_SLOW, "structs": _ST_PREMIUM},
    "corporate":   {"nombre": "Corporate Modern", "bg": "corporate", "light_p": 0.95, "shadow": "soft", "tex": "none",
                    "comps": ["typeStack", "typeTop", "sideLeft"], "stmt": ["centered", "panel"], "list": "check", "grid_p": 0.5,
                    "outro": ["center", "ctaOnly", "bar"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "broadcast":   {"nombre": "Breaking News", "bg": "broadcast", "light_p": 0.0, "shadow": "hard", "tex": "none",
                    "comps": ["typeTop", "typeSlam", "typeStack"], "stmt": ["left", "editorial"], "list": "bar", "grid_p": 0.0,
                    "outro": ["bar", "ctaOnly", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
    "organic":     {"nombre": "Organic Natural", "bg": "organic", "light_p": 0.9, "shadow": "soft", "tex": "grain",
                    "comps": ["typeStack", "cornerAnchor", "typeOnly"], "stmt": ["centered", "quote"], "list": "check", "grid_p": 0.0,
                    "outro": ["center", "left", "diagonal"], "rhythm": _RH_SLOW, "structs": _ST_PREMIUM},
    # --- ESTILOS NUEVOS (tanda 2): nicho/tech para completar la variedad ---
    "cyber":       {"nombre": "Cyber Glitch", "bg": "cyber", "light_p": 0.0, "shadow": "hard", "tex": "none",
                    "comps": ["typeSlam", "typeOnly", "diagonal"], "stmt": ["editorial", "centered"], "list": "bar", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
    "surveillanceHUD": {"nombre": "Surveillance HUD", "bg": "hud", "light_p": 0.0, "shadow": "hard", "tex": "none",
                    "comps": ["typeTop", "typeStack", "cornerAnchor"], "stmt": ["left", "editorial"], "list": "number", "grid_p": 0.0,
                    "outro": ["left", "ctaOnly"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "y2k":         {"nombre": "Y2K Chrome", "bg": "y2k", "light_p": 1.0, "shadow": "soft", "tex": "none",
                    "comps": ["typeSlam", "typeStack", "typeOnly"], "stmt": ["centered", "panel"], "list": "check", "grid_p": 0.0,
                    "outro": ["center", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
    # --- ESTILO NUEVO: MORPH protagonico (lo que pidio el usuario) -> gran silueta del rubro que morfea de continuo
    # detras del texto, anclada al borde; el scrim tone-aware mantiene el titulo legible. Sirve dark o claro.
    "morph":       {"nombre": "Morph Flow", "bg": "morphfield", "light_p": 0.25, "shadow": "soft", "tex": "none",
                    "comps": ["typeStack", "typeSlam", "cornerAnchor"], "stmt": ["centered", "editorial"], "list": "check", "grid_p": 0.0,
                    "outro": ["center", "bigtype", "diagonal"], "rhythm": _RH_MED, "structs": _ST_PREMIUM},
}
# orden seguro -> audaz (para la UI del selector) + sesgo de estilo recomendado por rubro (auto cuando el
# usuario no elige). El usuario SIEMPRE puede pisar esto con su eleccion.
STYLE_ORDER = ["blueprint", "swiss", "platinum", "obsidian", "meshflow", "morph", "aurora", "handmade", "typographic", "riso", "retro70s", "brutalist", "sport", "editorial", "corporate", "broadcast", "organic", "cyber", "surveillanceHUD", "y2k"]
# SISTEMA DE FUENTES por estilo (rompe el "Inter para todo"). display=titular/hero; text=cuerpo/listas
# (caption-safe); accent=numeros/indices (mono). Familias = Google Fonts (cargadas en el motor por estilo).
# Basado en la investigacion de tipografia para video marketing 2026. El motor lee fontDisplay/Text/Accent.
STYLE_FONTS = {
    "blueprint":   {"display": "Space Grotesk", "text": "IBM Plex Mono", "accent": "JetBrains Mono"},
    "swiss":       {"display": "Archivo", "text": "Inter", "accent": "Archivo"},
    "platinum":    {"display": "Fraunces", "text": "Hanken Grotesk", "accent": "Space Mono"},
    "obsidian":    {"display": "Sora", "text": "Inter Tight", "accent": "Space Mono"},
    "meshflow":    {"display": "Outfit", "text": "Plus Jakarta Sans", "accent": "Space Grotesk"},
    "morph":       {"display": "Bricolage Grotesque", "text": "Plus Jakarta Sans", "accent": "Space Grotesk"},
    "aurora":      {"display": "Bricolage Grotesque", "text": "Onest", "accent": "Caveat"},
    "handmade":    {"display": "Caveat", "text": "Familjen Grotesk", "accent": "Caveat"},
    "typographic": {"display": "Big Shoulders Display", "text": "Newsreader", "accent": "Space Mono"},
    "riso":        {"display": "Space Grotesk", "text": "Space Grotesk", "accent": "Space Mono"},
    "retro70s":    {"display": "Caprasimo", "text": "DM Sans", "accent": "Righteous"},
    "brutalist":   {"display": "Anton", "text": "Darker Grotesque", "accent": "Space Mono"},
    "sport":       {"display": "Oswald", "text": "Barlow", "accent": "Big Shoulders Display"},
    "editorial":   {"display": "Fraunces", "text": "Newsreader", "accent": "Space Mono"},
    "corporate":   {"display": "Plus Jakarta Sans", "text": "Inter", "accent": "JetBrains Mono"},
    "broadcast":   {"display": "Anton", "text": "Archivo", "accent": "JetBrains Mono"},
    "organic":     {"display": "Quicksand", "text": "Hanken Grotesk", "accent": "Caveat"},
    "cyber":           {"display": "Chakra Petch", "text": "JetBrains Mono", "accent": "Space Mono"},
    "surveillanceHUD": {"display": "Archivo", "text": "JetBrains Mono", "accent": "Space Mono"},
    "y2k":             {"display": "Bagel Fat One", "text": "Space Grotesk", "accent": "JetBrains Mono"},
}
_DEFAULT_FONTS = {"display": "Space Grotesk", "text": "Inter", "accent": "JetBrains Mono"}
RUBRO_STYLE_BIAS = {
    "inmobiliaria": ["editorial", "blueprint", "swiss", "obsidian", "meshflow", "morph", "corporate", "surveillanceHUD"],
    "finanzas":     ["corporate", "swiss", "blueprint", "obsidian", "broadcast", "surveillanceHUD"],
    "tech":         ["corporate", "cyber", "meshflow", "morph", "typographic", "surveillanceHUD", "brutalist"],
    "salud":        ["organic", "aurora", "swiss", "meshflow", "handmade"],
    "belleza":      ["aurora", "editorial", "morph", "y2k", "obsidian", "handmade", "riso"],
    "gastronomia":  ["handmade", "retro70s", "riso", "organic", "editorial", "y2k"],
    "fitness":      ["sport", "brutalist", "broadcast", "cyber", "typographic"],
    "educacion":    ["swiss", "corporate", "retro70s", "typographic"],
    "moda":         ["editorial", "obsidian", "typographic", "riso", "y2k"],
    "default":      ["corporate", "meshflow", "swiss", "editorial", "typographic"],
}


def recommend_style(rubro: str, rnd) -> str:
    """Estilo recomendado para un rubro (la semilla/rnd elige uno del pool). El usuario puede pisarlo."""
    pool = RUBRO_STYLE_BIAS.get(rubro, RUBRO_STYLE_BIAS["default"])
    return rnd.choice(pool)


# Estilos cuyo FONDO es parte INSEPARABLE de su identidad de marca: ahi el bgStyle NO se pisa con el eje
# ortogonal (seria romper el estilo). El resto usa el fondo del estilo solo como DEFAULT y deja que el eje
# bg_system (style_engine.features) elija una familia del pool completo -> dos marcas del mismo estilo/rubro
# pueden tener fondos de familias distintas (lo que pide la unicidad), manteniendo el contrato (campo bgStyle).
_BG_LOCKED_STYLES = {
    "typographic",      # el wordmark fantasma ES el fondo (firma del estilo)
    "brutalist",        # slab crudo = la identidad
    "sport",            # speedlines = velocidad, sin ellas no es sport
    "broadcast", "cyber", "surveillanceHUD", "y2k",   # fondos-firma de nicho
    "morph",            # morphfield protagonico ES el estilo
    "blueprint", "swiss",   # blueprint grid = la identidad del estilo
    "riso",             # halftone = riso
    "retro70s",         # sunburst 70s = la identidad
}
# Sistemas que el motor sabe dibujar (BG_STYLE en engineCore). Solo se pisa el fondo si el eje cae en uno valido.
_RENDERABLE_BG = {"mesh", "field", "spotlight", "bands", "aurora", "halftone", "sunburst", "flowfield", "morphfield", "brutalist"}


def style_fields(style_id: str, tone: str, bg_system: str = None):
    """Campos de timeline a NIVEL VIDEO que el motor lee para aplicar el estilo (bgStyle/shadowMode/texture).
    El tono (dark/light) lo decide el llamador (suele venir de light_p del estilo).

    bg_system: SISTEMA DE FONDO del eje ORTOGONAL (style_engine.features.bg_system) -> si el estilo NO bloquea
    su fondo (ver _BG_LOCKED_STYLES) y el sistema es renderizable, PISA el bgStyle del estilo. Asi la FAMILIA de
    fondo queda DESACOPLADA del theme/tono/estilo (dos marcas del mismo estilo/rubro pueden caer en familias
    distintas) sin romper el contrato (sigue saliendo el campo bgStyle que el motor ya lee)."""
    s = STYLE_PRESETS.get(style_id, STYLE_PRESETS["meshflow"])
    f = STYLE_FONTS.get(style_id, _DEFAULT_FONTS)
    bg = s["bg"]
    if bg_system and style_id not in _BG_LOCKED_STYLES and bg_system in _RENDERABLE_BG:
        bg = bg_system   # el eje ortogonal manda (familia de fondo desacoplada del estilo)
    return {"style": style_id, "bgStyle": bg, "shadowMode": s["shadow"], "texture": s["tex"], "tone": tone,
            "fontDisplay": f["display"], "fontText": f["text"], "fontAccent": f["accent"]}


def catalog_for_ui():
    """Lista ordenada (seguro -> audaz) de {id, nombre} para poblar el selector de estilos en la UI."""
    return [{"id": sid, "nombre": STYLE_PRESETS[sid]["nombre"]} for sid in STYLE_ORDER]
