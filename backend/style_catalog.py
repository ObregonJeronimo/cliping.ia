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
_ST_PREMIUM = [["hero", "statement", "outro"], ["statement", "hero", "outro"], ["hero", "statement", "checklist", "outro"]]
_ST_PUNCHY = [["statement", "hero", "outro"], ["statement", "statement", "outro"], ["hero", "outro"], ["hero", "statement", "outro"]]
_ST_FULL = [["hero", "statement", "checklist", "outro"], ["hero", "checklist", "outro"], ["statement", "hero", "checklist", "outro"], ["hero", "statement", "outro"]]

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
    "meshflow":    {"nombre": "Mesh Flow", "bg": "mesh", "light_p": 0.5, "shadow": "soft", "tex": "none",
                    "comps": ["typeSlam", "typeStack", "shapeBehind"], "stmt": ["centered", "editorial"], "list": "check", "grid_p": 0.0,
                    "outro": ["bigtype", "center", "diagonal"], "rhythm": _RH_MED, "structs": _ST_PREMIUM},
    "aurora":      {"nombre": "Aurora Flux", "bg": "aurora", "light_p": 0.72, "shadow": "soft", "tex": "grain",
                    "comps": ["shapeBehind", "cornerAnchor", "typeStack"], "stmt": ["quote", "panel"], "list": "check", "grid_p": 0.3,
                    "outro": ["center", "bar", "ctaOnly"], "rhythm": _RH_SLOW, "structs": _ST_PREMIUM},
    "handmade":    {"nombre": "Hecho a Mano", "bg": "field", "light_p": 0.9, "shadow": "soft", "tex": "grain",
                    "comps": ["typeStack", "cornerAnchor", "typeOnly"], "stmt": ["panel", "quote"], "list": "check", "grid_p": 0.0,
                    "outro": ["left", "center", "diagonal"], "rhythm": _RH_SLOW, "structs": _ST_FULL},
    "brutalist":   {"nombre": "Neo-Brutalist", "bg": "brutalist", "light_p": 0.25, "shadow": "hard", "tex": "none",
                    "comps": ["typeTop", "typeOnly", "typeStack"], "stmt": ["editorial", "centered"], "list": "bar", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
    "typographic": {"nombre": "Typographic", "bg": "field", "light_p": 0.4, "shadow": "soft", "tex": "none",
                    "comps": ["typeTop", "typeOnly", "typeSlam"], "stmt": ["editorial"], "list": "number", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_MED, "structs": _ST_PUNCHY},
    "riso":        {"nombre": "Risograph", "bg": "halftone", "light_p": 0.5, "shadow": "hard", "tex": "none",
                    "comps": ["typeStack", "cornerAnchor", "typeOnly"], "stmt": ["editorial", "quote"], "list": "number", "grid_p": 0.0,
                    "outro": ["diagonal", "left", "ctaOnly"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "retro70s":    {"nombre": "Retro 70s", "bg": "sunburst", "light_p": 0.35, "shadow": "soft", "tex": "grain",
                    "comps": ["typeSlam", "typeStack", "typeOnly"], "stmt": ["centered", "panel"], "list": "check", "grid_p": 0.0,
                    "outro": ["center", "bigtype"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "sport":       {"nombre": "Sport Velocity", "bg": "speedlines", "light_p": 0.05, "shadow": "hard", "tex": "none",
                    "comps": ["typeOnly", "typeSlam", "diagonal"], "stmt": ["editorial", "centered"], "list": "bar", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
}
# orden seguro -> audaz (para la UI del selector) + sesgo de estilo recomendado por rubro (auto cuando el
# usuario no elige). El usuario SIEMPRE puede pisar esto con su eleccion.
STYLE_ORDER = ["blueprint", "swiss", "platinum", "obsidian", "meshflow", "aurora", "handmade", "typographic", "riso", "retro70s", "brutalist", "sport"]
RUBRO_STYLE_BIAS = {
    "inmobiliaria": ["blueprint", "swiss", "obsidian", "platinum"],
    "finanzas":     ["platinum", "swiss", "blueprint", "brutalist"],
    "tech":         ["platinum", "meshflow", "typographic", "brutalist"],
    "salud":        ["aurora", "swiss", "meshflow", "handmade"],
    "belleza":      ["aurora", "obsidian", "handmade", "riso"],
    "gastronomia":  ["handmade", "retro70s", "riso", "meshflow"],
    "fitness":      ["sport", "brutalist", "typographic", "platinum"],
    "educacion":    ["swiss", "retro70s", "typographic", "meshflow"],
    "moda":         ["obsidian", "typographic", "riso", "brutalist"],
    "default":      ["meshflow", "swiss", "platinum", "typographic"],
}


def recommend_style(rubro: str, rnd) -> str:
    """Estilo recomendado para un rubro (la semilla/rnd elige uno del pool). El usuario puede pisarlo."""
    pool = RUBRO_STYLE_BIAS.get(rubro, RUBRO_STYLE_BIAS["default"])
    return rnd.choice(pool)


def style_fields(style_id: str, tone: str):
    """Campos de timeline a NIVEL VIDEO que el motor lee para aplicar el estilo (bgStyle/shadowMode/texture).
    El tono (dark/light) lo decide el llamador (suele venir de light_p del estilo)."""
    s = STYLE_PRESETS.get(style_id, STYLE_PRESETS["meshflow"])
    return {"style": style_id, "bgStyle": s["bg"], "shadowMode": s["shadow"], "texture": s["tex"], "tone": tone}


def catalog_for_ui():
    """Lista ordenada (seguro -> audaz) de {id, nombre} para poblar el selector de estilos en la UI."""
    return [{"id": sid, "nombre": STYLE_PRESETS[sid]["nombre"]} for sid in STYLE_ORDER]
