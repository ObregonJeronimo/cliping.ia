"""
Claude elige qué animaciones usar y con qué contenido — devuelve JSON.
El template Remotion ejecuta esas animaciones predefinidas.
Costo: ~$0.008 por video (10x más barato que generar JSX completo).
"""
import json
import os
import re
import aiohttp
from animation_library import ANIMATION_CATALOG, get_catalog_for_claude

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


async def select_animations(video_context: dict, industry_key: str = 'generic', industry_anims: list = None, used_in_industry: list = None, needs_new_anims: bool = False) -> dict:
    """
    Claude actúa como director creativo:
    1. Primero crea un brief visual detallado
    2. Luego elige animaciones coherentes con ese brief
    Retorna JSON con la selección + brief.
    """
    page_data = video_context["page_data"]
    site_name    = page_data.get("siteName", "Mi Sitio")
    headline     = page_data.get("headline", "")
    subheadline  = page_data.get("subheadline", "")
    benefits     = page_data.get("benefits", [])
    features     = page_data.get("features", [])
    cta          = page_data.get("cta", "Empezá gratis")
    problem      = page_data.get("problem", "")
    audience     = page_data.get("audience", "")
    primary      = page_data.get("primaryColor", "#6366f1")
    secondary    = page_data.get("secondaryColor", "#818cf8")
    guarantee    = page_data.get("guarantee", "")
    numbers      = page_data.get("numbers", [])
    page_type    = page_data.get("pageType", "saas")
    emotion      = page_data.get("emotion", "confianza")
    narrative    = video_context.get("narrative", "features")
    tone         = video_context.get("tone", "enthusiastic")
    visual_style = video_context.get("visual_style", "dark_premium")

    catalog = get_catalog_for_claude()

    # Agregar animaciones generadas para este rubro al catálogo
    if industry_anims:
        from industry_animator import get_industry_animations as _get_ia
        from animation_generator import get_industry_function_map
        _generated_map = get_industry_function_map(industry_key)
        if _generated_map:
            _extra = "\n\nANIMACIONES EXCLUSIVAS PARA ESTE RUBRO (úsalas prioritariamente):\n"
            for snake, fn in _generated_map.items():
                _extra += f"- {snake}: animación diseñada específicamente para {industry_key}\n"
            catalog = catalog + _extra

    # Historial de animaciones usadas recientemente
    from pathlib import Path as _P
    import glob as _glob, random as _random
    _used_by_scene = {"hook": [], "product": [], "benefits": [], "cta": [], "outro": []}
    for f in sorted(_glob.glob("debug_reports/*_debug.json"))[-6:]:
        try:
            import json as _j
            d = _j.loads(_P(f).read_text(encoding="utf-8"))
            scenes = d.get("data",{}).get("animation_selection",{})
            for scene, v in scenes.items():
                if scene in _used_by_scene and isinstance(v, dict) and "animation" in v:
                    _used_by_scene[scene].append(v["animation"])
        except: pass
    recently_used = list(set(a for lst in _used_by_scene.values() for a in lst))[:10]
    # Qué no usar POR ESCENA
    hook_avoid    = _used_by_scene["hook"][-2:]
    product_avoid = _used_by_scene["product"][-2:]
    benefits_avoid= _used_by_scene["benefits"][-2:]
    cta_avoid     = _used_by_scene["cta"][-2:]
    outro_avoid   = _used_by_scene["outro"][-2:]

    # Análisis visual profundo
    audience_insight = f"Audiencia: {audience}. Emoción objetivo: {emotion}."
    bg_color     = page_data.get("bgColor", "#ffffff")
    is_dark      = page_data.get("isDark", False)
    text_color   = page_data.get("textColor", "#0a0a0a")
    color_context = f"Color primario: {primary} — secundario: {secondary} — fondo real de la página: {bg_color} — página oscura: {is_dark}"

    prompt = f"""Sos el dueño de una agencia de marketing digital especializada en videos virales para Instagram y TikTok.
Antes de crear el video, te metés en la cabeza del dueño del negocio que lo va a publicar:
¿Qué le duele? ¿Qué le da miedo? ¿Qué quiere lograr? ¿Qué lo haría parar de scrollear?

PRIMERO pensás como el cliente ideal del producto ({audience}):
- ¿Qué problema tiene que lo desvela?
- ¿Qué emoción quiere sentir al ver este video?
- ¿Qué necesita ver para confiar y actuar?

LUEGO diseñás el video pensando en esa persona específica.

═══ PRODUCTO ═══
Nombre: {site_name}
Tipo: {page_type}
Headline: {headline}
Problema: {problem}
Audiencia: {audience}
Beneficios: {json.dumps(benefits[:4], ensure_ascii=False)}
Features: {json.dumps(features[:3], ensure_ascii=False)}
CTA: {cta}
Garantía: {guarantee}
Números reales: {json.dumps(numbers, ensure_ascii=False)}
Color primario: {primary}
Color secundario: {secondary}
Emoción objetivo: {emotion}

═══ DIRECCIÓN CREATIVA SOLICITADA ═══
Estilo visual: {visual_style}
Narrativa: {narrative}
Tono: {tone}

{catalog}

═══ TU TAREA ═══
Pensá como un director creativo que va a hacer un reel de 30 segundos para Instagram/TikTok.
El video debe hacer que {audience} pare de scrollear en el primer segundo.

CONTEXTO VISUAL DE LA MARCA:
- La página real tiene fondo {bg_color} y es {"OSCURA" if is_dark else "CLARA/BLANCA"}
- Color primario real: {primary} — usalo como acento principal
- Si la página es clara/blanca, podés usar fondo oscuro cinematográfico para contraste
  o fondo claro que respete la identidad visual — elegí lo que impacta más
- NUNCA uses negro puro #000000 como fondo — siempre oscuro CON TEXTURA VISUAL
- El fondo debe ser un gradiente de al menos 2 colores con dirección diagonal
- Tipos de fondo según industria:
  * Finanzas/salud → deep navy: "linear-gradient(145deg, #0a0f1e 0%, #0d1528 50%, #0a0a1a 100%)"
  * Tech/SaaS → dark purple: "linear-gradient(145deg, #0d0b1e 0%, #1a0f2e 50%, #0a0a14 100%)"
  * Creatividad/agencia → warm dark: "linear-gradient(145deg, #0f0a0a 0%, #1e0f0a 50%, #0a0808 100%)"
  * Retail/moda → midnight: "linear-gradient(160deg, #080810 0%, #0f0f18 50%, #080808 100%)"
  * Restaurant/food → deep brown: "linear-gradient(145deg, #0a0600 0%, #1a0e00 50%, #0d0800 100%)"
  * Startup/innovacion → electric dark: "linear-gradient(135deg, #050510 0%, #0a0520 50%, #050510 100%)"
- El fondo siempre debe tener al menos 3 stops de color para que sea rico visualmente
- Nunca usar el mismo fondo que el video anterior — variar siempre el ángulo y los tonos

NUEVA ESTRUCTURA — el video tiene 10 sub-escenas (2 por sección):
- hook_a (2.3s): primer impacto que frena el scroll
- hook_b (2.7s): refuerzo del mensaje principal
- product_a (3.7s): mostrar el producto en acción
- product_b (3.3s): demostrar valor concreto (números, stats)
- benefits_a (3s): beneficio 1 individual
- benefits_b (3s): beneficio 2 individual
- benefits_c (3s): beneficio 3 individual (o variante del 2)
- cta_a (3s): construir urgencia/deseo antes del botón
- cta_b (4s): el botón final con máximo impacto
- outro (5s): cierre memorable de marca

Cada sub-escena es independiente — animaciones DISTINTAS entre sí.
Nunca repitas la misma animación en dos sub-escenas.

Respondé SOLO con JSON válido:
{{
  "brief": {{
    "concepto": "En 1 oración: la idea creativa central del video",
    "paleta": {{
      "fondo": "color exacto o gradiente para el fondo (NUNCA negro puro #000 — siempre oscuro con personalidad: deep navy, dark purple, midnight, etc)",
      "acento": "color vibrante para acentos — si {primary} es vibrante usalo, sino sugerí uno mejor",
      "texto": "color del texto principal",
      "justificacion": "por qué esta paleta funciona para {audience}"
    }},
    "uso_del_espacio": "cómo ocupar bien los 390x844px — qué elementos grandes, qué pequeños, dónde va el foco",
    "ritmo": "rápido/medio/lento — justificación según la audiencia",
    "must_avoid": "qué evitar específicamente para este tipo de página y audiencia"
  }},
  "hook_a": {{
    "animation": "nombre_exacto — primer impacto en 2.3s",
    "params": {{}},
    "razon": "por qué este hook frena el scroll en 0.5s"
  }},
  "hook_b": {{
    "animation": "nombre_exacto — DISTINTO a hook_a",
    "params": {{}},
    "razon": "cómo refuerza el mensaje del hook_a"
  }},
  "product_a": {{
    "animation": "nombre_exacto — muestra el producto",
    "params": {{}},
    "razon": "cómo muestra el producto en 3.7s"
  }},
  "product_b": {{
    "animation": "nombre_exacto — DISTINTO a product_a — muestra valor/stats",
    "params": {{}},
    "razon": "qué dato concreto refuerza"
  }},
  "benefits_a": {{
    "animation": "nombre_exacto — para el beneficio: {benefits[0] if benefits else 'beneficio 1'}",
    "params": {{}},
    "razon": "por qué esta animación comunica este beneficio específico"
  }},
  "benefits_b": {{
    "animation": "nombre_exacto — DISTINTO — para el beneficio: {benefits[1] if len(benefits)>1 else 'beneficio 2'}",
    "params": {{}},
    "razon": "por qué esta animación comunica este beneficio específico"
  }},
  "benefits_c": {{
    "animation": "nombre_exacto — DISTINTO — para el beneficio: {benefits[2] if len(benefits)>2 else 'beneficio 3'}",
    "params": {{}},
    "razon": "por qué esta animación comunica este beneficio específico"
  }},
  "cta_a": {{
    "animation": "nombre_exacto — construir urgencia/deseo",
    "params": {{}},
    "razon": "cómo genera urgencia antes del botón"
  }},
  "cta_b": {{
    "animation": "nombre_exacto — DISTINTO a cta_a — botón final con impacto",
    "params": {{}},
    "razon": "por qué este remate convierte"
  }},
  "outro": {{
    "animation": "nombre_exacto — cierre memorable",
    "params": {{}},
    "razon": "por qué este cierre graba la marca"
  }},
  "reasoning": "narrativa completa del video de 10 momentos"
}}

IMPORTANTE PARA LA ESCENA "product":
- NO uses siempre "iphone_rise" — es la más genérica y aburrida
- Para ecommerce/retail: usa "cursor_click_reveal" (cursor comprando) o "dashboard_build" (stats de ventas)  
- Para SaaS: usa "phone_notification", "cursor_click_reveal", "dashboard_build"
- Para restaurants: usa "morphing_shapes" o "liquid_blob_morph"
- Para agencias/creativos: usa "floating_feature_orbs" o "particle_reveal"
- "iphone_rise" solo si realmente tiene sentido para ese producto

ANIMACIONES SIGNATURE QUE DEBES USAR CON FRECUENCIA (son únicas y muy impactantes):
- water_drop_title: gota SVG que cae e impacta con ondas — muy visual para hook
- liquid_fill_text: nombre del producto que se llena de líquido — para hook de marca
- paint_brush_reveal: pincel que revela el texto — para hook creativo
- scramble_decode: texto que se decodifica estilo hacker — para hook tech
- split_chars_reveal: letras que vuelan desde distintas direcciones
- ticker_tape: tickers de noticias corriendo horizontalmente
- phone_notification: iPhone con notificaciones deslizantes en tiempo real
- cursor_click_reveal: cursor que hace click y revela el producto
- ink_splash_cta: explosión de tinta que revela el CTA
- zoom_punch_cta: zoom de 3x que impacta en el CTA
- water_ripple_cta: ondas concéntricas del botón
- card_flip_3d: cards que dan vuelta en 3D (benefits)
- grid_reveal: grilla 2x2 con reveal escalonado
- spotlight_reveal: foco de luz cinematográfico
- freeze_frame_outro: screenshot congelado con badge PLAY
- neon_sign: letrero de neón encendiéndose letra por letra

REGLAS CRÍTICAS — VARIEDAD OBLIGATORIA:
- HOOK: NO uses ninguna de estas: {hook_avoid}. Elegí algo DISTINTO.
- PRODUCT: NO uses ninguna de estas: {product_avoid}. Elegí algo DISTINTO.
- BENEFITS: NO uses ninguna de estas: {benefits_avoid}. Elegí algo DISTINTO.
- CTA: NO uses ninguna de estas: {cta_avoid}. Elegí algo DISTINTO.
- OUTRO: NO uses ninguna de estas: {outro_avoid}. Elegí algo DISTINTO.
- CADA VIDEO DEBE VERSE DIFERENTE: varía colores del brief, tipografía, uso del espacio,
  ritmo y elementos visuales aunque el producto sea el mismo.
- Si el fondo fue navy la vez anterior, esta vez usá dark purple, midnight teal, o dark warm.
- Si el hook fue un número, esta vez que sea texto. Si fue texto, que sea visual.
- NUNCA inventes datos — usá SOLO los números reales: {json.dumps(numbers, ensure_ascii=False)}
- NUNCA pongas screenshotUrl en ningún params — esa prop se maneja automáticamente
- Para card_flip_3d los benefits deben ser STRINGS simples, nunca objetos con front/back
- Para iphone_rise y cursor_click_reveal NO incluyas screenshotUrl en params
- Si no hay números reales, usá strings descriptivos sin inventar cifras
- El contenido va en español rioplatense
- Usá SOLO animaciones del catálogo
- Para fondo oscuro con personalidad: navy (#0a0f1e), deep purple (#0d0b1e), midnight (#07080f), dark teal (#070f0d), etc"""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": "claude-sonnet-4-5",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}],
    }

    print(f"[jsx_generator] Claude eligiendo animaciones...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                ANTHROPIC_URL, headers=headers, json=payload,
                timeout=aiohttp.ClientTimeout(total=90),
            ) as resp:
                data = await resp.json()
    except Exception as e:
        print(f"[jsx_generator] error HTTP: {e}")
        return None

    if resp.status != 200:
        print(f"[jsx_generator] error HTTP {resp.status}: {data}")
        return None

    try:
        raw = data["content"][0]["text"].strip()
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        result = json.loads(raw)
        # Guardar animaciones nuevas sugeridas para el rubro
        new_for_industry = result.get("new_animations_for_industry", [])
        if new_for_industry and industry_key != "generic":
            from industry_animator import save_generated_animations
            save_generated_animations(industry_key, new_for_industry)
            print(f"[jsx_generator] +{len(new_for_industry)} animaciones nuevas para rubro '{industry_key}': {new_for_industry}")

        # Loguear brief creativo
        brief = result.get("brief", {})
        if brief:
            print(f"[jsx_generator] BRIEF CREATIVO:")
            print(f"  concepto: {brief.get('concepto','')[:80]}")
            paleta = brief.get("paleta", {})
            print(f"  fondo: {paleta.get('fondo','')}")
            print(f"  acento: {paleta.get('acento','')}")
            print(f"  espacio: {brief.get('uso_del_espacio','')[:60]}")
            print(f"  evitar: {brief.get('must_avoid','')[:60]}")

        print(f"[jsx_generator] animaciones elegidas:")
        for scene, choice in result.items():
            if scene not in ("reasoning", "brief") and isinstance(choice, dict):
                anim = choice.get("animation")
                razon = choice.get("razon", "")[:50]
                print(f"  {scene:10}: {anim} | {razon}")
        print(f"  reasoning: {result.get('reasoning','')[:100]}")

        # Guardar JSON completo para debug
        import json as _json
        from pathlib import Path as _Path
        debug_dir = _Path("debug_reports")
        debug_dir.mkdir(exist_ok=True)
        debug_file = debug_dir / "last_animation_selection.json"
        debug_file.write_text(_json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[jsx_generator] selección completa → {debug_file}")
        return result
    except Exception as e:
        print(f"[jsx_generator] parse error: {e} — {data}")
        return None


def get_default_selection(page_data: dict) -> dict:
    """Selección por defecto si Claude falla."""
    return {
        "hook": {"animation": "reveal_swipe", "params": {
            "headline": page_data.get("headline", ""),
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
        }},
        "product": {"animation": "iphone_rise", "params": {
            "screenshotUrl": None,
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
        }},
        "benefits": {"animation": "benefit_cards_stagger", "params": {
            "benefits": page_data.get("benefits", []),
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
        }},
        "cta": {"animation": "liquid_button_cta", "params": {
            "cta": page_data.get("cta", "Empezá gratis"),
            "subtext": "Transformá tu negocio hoy",
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
            "guarantee": page_data.get("guarantee", ""),
        }},
        "outro": {"animation": "orbit_logo", "params": {
            "siteName": page_data.get("siteName", ""),
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
            "secondaryColor": page_data.get("secondaryColor", "#818cf8"),
        }},
        "reasoning": "Selección por defecto",
    }
