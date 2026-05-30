"""
Sistema de animaciones por rubro/industria.
Mantiene un registro de qué animaciones existen para cada industria
y genera nuevas cuando hay pocas o ya se usaron todas.
"""
import json
import hashlib
from pathlib import Path
from typing import Optional

INDUSTRY_DIR = Path("industry_animations")
INDUSTRY_DIR.mkdir(exist_ok=True)

# Categorías de industrias y sus animaciones base
INDUSTRY_CATALOG = {
    "saas":        ["counter_explosion","dashboard_build","comparison_table","terminal_reveal","scramble_decode","phone_notification","cursor_click_reveal","ticker_tape","icon_draw_reveal","progress_bars"],
    "health":      ["water_drop_title","split_chars_reveal","card_flip_3d","spotlight_reveal","morphing_shapes","benefit_cards_stagger"],
    "fintech":     ["counter_explosion","liquid_fill_text","scramble_decode","dashboard_build","stat_counters","urgency_countdown"],
    "ecommerce":   ["reveal_swipe","kinetic_text","split_chars_reveal","grid_reveal","screenshot_zoom_cta","freeze_frame_outro"],
    "restaurant":  ["paint_brush_reveal","liquid_blob_morph","water_drop_title","morphing_shapes","split_screen_problem"],
    "agency":      ["paint_brush_reveal","liquid_blob_morph","split_chars_reveal","kinetic_text","neon_sign","orbit_logo"],
    "startup":     ["particle_reveal","typewriter_glitch","scramble_decode","ticker_tape","zoom_punch_cta","logo_particle_burst"],
    "landing":     ["reveal_swipe","water_drop_title","kinetic_text","liquid_fill_text","ink_splash_cta","gradient_text_outro"],
    "portfolio":   ["morphing_shapes","paint_brush_reveal","split_chars_reveal","floating_feature_orbs","freeze_frame_outro"],
    "generic":     ["counter_explosion","reveal_swipe","benefit_cards_stagger","liquid_button_cta","orbit_logo"],
}

MIN_ANIMATIONS_PER_INDUSTRY = 20

def get_industry_key(page_type: str, audience: str) -> str:
    """Determina la clave de industria según el tipo de página y audiencia."""
    pt = (page_type or "").lower()
    aud = (audience or "").lower()

    if "salud" in aud or "médic" in aud or "consultori" in aud or "doctor" in aud:
        return "health"
    if "fintech" in pt or "pago" in aud or "banco" in aud or "finanz" in aud:
        return "fintech"
    if "saas" in pt or "software" in pt:
        return "saas"
    if "ecommerce" in pt or "tienda" in aud or "product" in pt:
        return "ecommerce"
    if "restaurant" in aud or "comida" in aud or "gastro" in aud:
        return "restaurant"
    if "agency" in pt or "agencia" in aud or "creativ" in aud:
        return "agency"
    if "startup" in pt or "startup" in aud:
        return "startup"
    if "portfolio" in pt or "portafolio" in pt:
        return "portfolio"
    if "landing" in pt:
        return "landing"
    return "generic"

def get_industry_animations(industry_key: str) -> list:
    """Obtiene la lista completa de animaciones para una industria (base + generadas)."""
    base = INDUSTRY_CATALOG.get(industry_key, INDUSTRY_CATALOG["generic"]).copy()

    # Agregar animaciones generadas dinámicamente
    generated_file = INDUSTRY_DIR / f"{industry_key}_generated.json"
    if generated_file.exists():
        try:
            generated = json.loads(generated_file.read_text(encoding="utf-8"))
            base.extend(generated.get("animations", []))
        except: pass

    # Siempre agregar las animaciones universales de alta calidad
    universal = ["liquid_fill_text","water_drop_title","paint_brush_reveal","neon_sign","freeze_frame_outro","ink_splash_cta","water_ripple_cta","card_flip_3d","grid_reveal","timeline_scroll"]
    for a in universal:
        if a not in base:
            base.append(a)

    return list(dict.fromkeys(base))  # deduplicar manteniendo orden

def get_used_animations(industry_key: str, limit: int = 15) -> list:
    """Obtiene las animaciones recientemente usadas para esta industria."""
    import glob as _glob
    used = []
    for f in sorted(_glob.glob("debug_reports/*_debug.json"))[-20:]:
        try:
            d = json.loads(Path(f).read_text(encoding="utf-8"))
            # Solo contar si es la misma industria
            pd = d.get("data", {}).get("page_data", {})
            key = get_industry_key(pd.get("pageType",""), pd.get("audience",""))
            if key == industry_key:
                scenes = d.get("data",{}).get("animation_selection",{})
                for k, v in scenes.items():
                    if isinstance(v, dict) and "animation" in v:
                        used.append(v["animation"])
        except: pass
    return list(dict.fromkeys(used))[-limit:]

def needs_new_animations(industry_key: str) -> tuple[bool, str]:
    """
    Determina si hay que buscar animaciones nuevas para este rubro.
    Retorna (necesita, motivo).
    """
    available = get_industry_animations(industry_key)
    used = get_used_animations(industry_key)

    if len(available) < MIN_ANIMATIONS_PER_INDUSTRY:
        return True, f"Solo {len(available)} animaciones para '{industry_key}' (mínimo {MIN_ANIMATIONS_PER_INDUSTRY})"

    # Si más del 80% de disponibles ya fueron usadas
    used_set = set(used)
    available_set = set(available)
    unused = available_set - used_set
    usage_ratio = len(used_set & available_set) / len(available_set)

    if usage_ratio > 0.8 and len(unused) < 5:
        return True, f"El {usage_ratio:.0%} de animaciones ya usadas ({len(unused)} inéditas restantes)"

    return False, f"{len(unused)} animaciones inéditas disponibles"

def save_generated_animations(industry_key: str, new_animations: list) -> None:
    """Guarda nuevas animaciones generadas para una industria."""
    generated_file = INDUSTRY_DIR / f"{industry_key}_generated.json"
    existing = []
    if generated_file.exists():
        try:
            data = json.loads(generated_file.read_text(encoding="utf-8"))
            existing = data.get("animations", [])
        except: pass

    all_anims = list(dict.fromkeys(existing + new_animations))
    generated_file.write_text(json.dumps({
        "industry": industry_key,
        "animations": all_anims,
        "count": len(all_anims),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[industry] guardadas {len(new_animations)} nuevas animaciones para '{industry_key}'")
