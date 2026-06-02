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

    # Animaciones de industria desactivadas — solo usamos Anime.js v4 y GSAP
    # if industry_anims:
    #     ...

    # Historial de animaciones usadas recientemente
    from pathlib import Path as _P
    import glob as _glob, random as _random
    _used_by_scene = {"hook_a": [], "hook_b": [], "product_a": [], "product_b": [],
                       "benefits_a": [], "benefits_b": [], "benefits_c": [],
                       "cta_a": [], "cta_b": [], "outro": []}
    for f in sorted(_glob.glob("debug_reports/*_debug.json"))[-6:]:
        try:
            import json as _j
            d = _j.loads(_P(f).read_text(encoding="utf-8"))
            scenes = d.get("data",{}).get("animation_selection",{})
            for scene, v in scenes.items():
                if scene in _used_by_scene and isinstance(v, dict) and "animation" in v:
                    _used_by_scene[scene].append(v["animation"])
        except: pass
    recently_used = list(set(a for lst in _used_by_scene.values() for a in lst))[:15]
    hook_avoid    = list(set(_used_by_scene["hook_a"] + _used_by_scene["hook_b"]))[-3:]
    product_avoid = list(set(_used_by_scene["product_a"] + _used_by_scene["product_b"]))[-3:]
    benefits_avoid= list(set(_used_by_scene["benefits_a"] + _used_by_scene["benefits_b"] + _used_by_scene["benefits_c"]))[-4:]
    cta_avoid     = list(set(_used_by_scene["cta_a"] + _used_by_scene["cta_b"]))[-3:]
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
- El fondo YA está calculado por el sistema — lo recibirás en el prop "bg"
- NO necesitás inventar fondos — el sistema ya calcula uno derivado del color del sitio
- Para el brief, podés sugerir un ajuste de opacidad o textura adicional si querés
- Si el sitio es de salud (verde), el fondo ya será verde muy oscuro
- Si el sitio es de fintech, ya será navy oscuro
- Nunca uses negro puro #000 ni blancos puros — ya está controlado por el sistema

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
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — primer impacto en 2.3s",
    "params": {{}},
    "razon": "por qué este hook frena el scroll en 0.5s"
  }},
  "hook_b": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — DISTINTO a hook_a",
    "params": {{}},
    "razon": "cómo refuerza el mensaje del hook_a"
  }},
  "product_a": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — muestra el producto",
    "params": {{}},
    "razon": "cómo muestra el producto en 3.7s"
  }},
  "product_b": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — DISTINTO a product_a — muestra valor/stats",
    "params": {{}},
    "razon": "qué dato concreto refuerza"
  }},
  "benefits_a": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — para el beneficio: {benefits[0] if benefits else 'beneficio 1'}",
    "params": {{}},
    "razon": "por qué esta animación comunica este beneficio específico"
  }},
  "benefits_b": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — DISTINTO — para el beneficio: {benefits[1] if len(benefits)>1 else 'beneficio 2'}",
    "params": {{}},
    "razon": "por qué esta animación comunica este beneficio específico"
  }},
  "benefits_c": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — DISTINTO — para el beneficio: {benefits[2] if len(benefits)>2 else 'beneficio 3'}",
    "params": {{}},
    "razon": "por qué esta animación comunica este beneficio específico"
  }},
  "cta_a": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — construir urgencia/deseo",
    "params": {{}},
    "razon": "cómo genera urgencia antes del botón"
  }},
  "cta_b": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — DISTINTO a cta_a — botón final con impacto",
    "params": {{}},
    "razon": "por qué este remate convierte"
  }},
  "outro": {{
    "animation": "NOMBRE_DE_LA_LISTA_EXACTA — cierre memorable",
    "params": {{}},
    "razon": "por qué este cierre graba la marca"
  }},
  "reasoning": "narrativa completa del video de 10 momentos"
}}

IMPORTANTE PARA LA ESCENA "product":
- NUNCA inventes un nombre que no esté en la lista de arriba
- Para ecommerce/retail: usa "anime_kinetic_timeline" (cursor comprando) o "dashboard_build" (stats de ventas)  
- Para SaaS: usa "anime_glass_cards", "anime_kinetic_timeline", "dashboard_build"
- Para restaurants: usa "morphing_shapes" o "liquid_blob_morph"
- Para agencias/creativos: usa "floating_feature_orbs" o "particle_reveal"


NUEVA BIBLIOTECA 2025/2026 — USARLAS CON PRIORIDAD (son más modernas y atractivas):

HOOK NUEVAS (muy impactantes):
- glitch_slice: texto en franjas que se reensamblan — para productos tech/disruptivos
- magnetic_words: palabras que vuelan con física — para headlines con pocas palabras
- staggered_lines: líneas con stagger premium — estilo Linear/Arc Browser
- elastic_scale_in: spring con overshoot — muy moderno, estilo iOS
- blur_reveal: headline desde blur a nitidez — para conceptos de claridad/precisión
- typewriter_premium: typewriter con cursor — para productos SaaS/tech
- morphing_number: número que cuenta + headline — para productos con métricas
- split_reveal_h: pantalla se abre como puerta — muy cinematográfico
- noise_reveal: emerge del ruido estático — para mensajes de IA/tech

PRODUCT NUEVAS:
- app_preview_slide: pantalla app que desliza con sombra premium
- metrics_dashboard: dashboard de métricas animadas — para SaaS/fintech
- code_terminal: terminal con comandos — para productos tech
- notification_stack: notificaciones apiladas estilo iOS — para apps móviles
- feature_spotlight: zoom en feature específica

BENEFITS NUEVAS:
- checklist_reveal: checkmarks animados — para listas de beneficios
- pill_tags_cloud: pills flotantes — para muchos beneficios cortos
- accordion_reveal: cards que se abren — para beneficios con descripción
- bento_grid: layout tipo bento — muy moderno, estilo Notion/Linear
- wave_stats: stats con ondas — para productos con números impactantes

CTA NUEVAS:
- glow_pulse_cta: botón con glow pulsante — muy Apple
- swipe_up_cta: flechas animadas — para reels/TikTok
- split_cta: pantalla antes/después — para mostrar transformación

OUTRO NUEVAS:
- minimal_logo: cierre minimalista — estilo Apple/Linear
- grid_collapse: tiles que revelan logo — muy cinematográfico
- particle_dissolve: logo que se disuelve — memorable
- wipe_out_outro: barrido de color con logo

UNIVERSALES (útiles en cualquier escena):
- cinematic_title: estilo película con letterbox
- floating_text_badge: badge premium flotante

CATALOGO COMPLETO DE ANIMACIONES (34 en total — TODAS de Anime.js v4 o GSAP 3.15):

═══ ANIME.JS v4 REAL (22 animaciones) ════════════════════════════════════════

STAGGER (desde el centro, 2D grid, irregular):
- anime_stagger_center: stagger(90, from:'center') — palabras desde el centro con blur. El clasico de anime.js. PARA HOOK
- anime_stagger_grid_2d: stagger(80, grid:[2,N], from:'center') — grilla 2D para beneficios. PARA BENEFITS
- anime_stagger_irregular: stagger con irregular(10,0.5) — orden caotico organico. PARA BENEFITS

TEXT (scrambleText, blur, kinetic):
- anime_scramble_reveal: scrambleText() real — texto se cristaliza del ruido de caracteres. PARA HOOK
- anime_letter_by_letter: stagger(45) letra con rotate — iconico de anime.js. PARA HOOK
- anime_blur_words: blur+opacity+y stagger(70) — ReactBits style. PARA HOOK
- anime_kinetic_timeline: createTimeline labels: headline->sub->badge. PARA HOOK/PRODUCT
- anime_true_focus: una palabra en foco, resto en blur — hipnotico. PARA HOOK

SVG (createDrawable, morphTo):
- anime_svg_draw: createDrawable() — path SVG que se dibuja en tiempo real. PARA PRODUCT
- anime_morph_blob: morphTo() — blob que morphea entre shapes reales. PARA HOOK/PRODUCT

KEYFRAMES / TIMELINE:
- anime_keyframe_bounce: keyframes % con outBounce — letras que rebotan. PARA HOOK
- anime_cinematic_tl: createTimeline con .label() — secuencia cinematografica. PARA PRODUCT

ALTERNATE / LOOP:
- anime_alternate_cmp: alternate:true — comparacion antes/despues pulsante. PARA BENEFITS
- anime_rotating_words: palabra que rota entre opciones con spring. PARA HOOK

CTA:
- anime_shiny_button: timeline con destello loop — el mejor CTA. PARA CTA
- anime_magnetic_cta: anillos concentricos con outElastic. PARA CTA
- anime_countdown: countdown con tiempo real de entrega. PARA CTA

DATA / PRODUCT:
- anime_counter_cascade: stagger(150) numeros con outBack. PARA PRODUCT
- anime_glass_cards: glassmorphism con spotlight organico. PARA BENEFITS/PRODUCT
- anime_ticker_tape: beneficios en ticker horizontal continuo. PARA BENEFITS

OUTRO:
- anime_spectrum_outro: barras de espectro stagger(center) + logo. PARA OUTRO
- anime_typeface_fade: nombre se disuelve con blur — editorial. PARA OUTRO
- anime_particle_form: particulas que orbitan y forman el logo. PARA OUTRO

═══ GSAP 3.15 REAL (12 animaciones — Physics2D, SplitText, DrawSVG, MorphSVG) ═

TEXT con SplitText:
- gsap_physics_shatter: SplitText + Physics2D — letras aparecen y luego caen con gravedad real. UNICO, PARA HOOK
- gsap_mask_reveal: SplitText mask:lines — lineas emergen de detras de mascara. PREMIUM, PARA HOOK
- gsap_chars_rotate: SplitText chars con rotationX 3D. PARA HOOK
- gsap_words_scramble: SplitText words con scatter aleatorio. PARA HOOK
- gsap_lines_wave: SplitText chars con wave stagger. PARA HOOK/PRODUCT

SVG con DrawSVG / MorphSVG:
- gsap_draw_svg: DrawSVG con control preciso de %. PARA PRODUCT
- gsap_morph_shapes: MorphSVG — circulo→ovoide→cuadrado→triangulo loop. PARA HOOK/PRODUCT

Motion y Physics:
- gsap_motion_path: MotionPath — elemento viaja por path SVG con DrawSVG simultaneo. PARA PRODUCT
- gsap_physics_rain: Physics2D — beneficios llueven desde arriba. PARA BENEFITS

UI:
- gsap_elastic_cards: elastic.out(1,0.6) stagger — cards con resorte. PARA BENEFITS
- gsap_flip_reveal: rotationY flip 3D cards. PARA BENEFITS
- gsap_physics_burst: Physics2D burst — particulas explotan del CTA. PARA CTA

REGLAS DE USO:
1. CRÍTICO: SOLO podés usar nombres de esta lista EXACTA — copia el nombre tal cual, sin inventar nada:
   anime_stagger_center
   anime_stagger_grid_2d
   anime_stagger_irregular
   anime_scramble_reveal
   anime_letter_by_letter
   anime_blur_words
   anime_kinetic_timeline
   anime_true_focus
   anime_svg_draw
   anime_morph_blob
   anime_keyframe_bounce
   anime_cinematic_tl
   anime_alternate_cmp
   anime_rotating_words
   anime_shiny_button
   anime_magnetic_cta
   anime_countdown
   anime_counter_cascade
   anime_glass_cards
   anime_ticker_tape
   anime_spectrum_outro
   anime_typeface_fade
   anime_particle_form
   gsap_physics_shatter
   gsap_mask_reveal
   gsap_chars_rotate
   gsap_words_scramble
   gsap_draw_svg
   gsap_morph_shapes
   gsap_motion_path
   gsap_physics_rain
   gsap_lines_wave
   gsap_elastic_cards
   gsap_flip_reveal
   gsap_physics_burst

2. Si se te ocurre un nombre que no está en esa lista — NO lo uses. Elegí el más apropiado de la lista.
2. Para hook: prioriza anime_stagger_center, anime_scramble_reveal, gsap_mask_reveal, gsap_physics_shatter
3. Para benefits: prioriza anime_stagger_grid_2d, anime_glass_cards, gsap_elastic_cards
4. Para CTA: anime_shiny_button, anime_magnetic_cta, gsap_physics_burst
5. Para outro: anime_spectrum_outro, anime_typeface_fade, anime_particle_form
6. Para product: anime_cinematic_tl, gsap_draw_svg, gsap_motion_path, anime_counter_cascade
7. Nunca repitas la misma animacion en dos escenas del mismo video

REGLAS CRÍTICAS — ANTI-REPETICIÓN ACUMULATIVA:
Vas a elegir 10 animaciones. A medida que elijas cada una, la siguiente NO puede repetirla.
La lista de "ya usadas" crece con cada elección:

- Histórico de videos anteriores a evitar por sección:
  * hook (hook_a + hook_b): evitar {hook_avoid}
  * product (product_a + product_b): evitar {product_avoid}
  * benefits (a+b+c): evitar {benefits_avoid}
  * cta (a+b): evitar {cta_avoid}
  * outro: evitar {outro_avoid}

- Dentro de ESTE video, nunca repitas la misma animación en dos sub-escenas distintas.
  Ejemplo: si hook_a = water_drop_title, hook_b NO puede ser water_drop_title.
  Si benefits_a = card_flip_3d, benefits_b y benefits_c deben ser DISTINTAS entre sí Y distintas a card_flip_3d.

- Verificá antes de cada elección: ¿ya usé esta animación en alguna sub-escena anterior de este video?
  Si sí → elegí otra diferente.

- NUNCA inventes datos — usá SOLO los números reales: {json.dumps(numbers, ensure_ascii=False)}
- NUNCA pongas screenshotUrl en ningún params — esa prop se maneja automáticamente
- NUNCA pongas "bg" en los params de ninguna escena — ya viene del sistema con el color del sitio
- Si querés ajustar colores, usá "primaryColor" en los params de la escena
- NUNCA pongas "bg" en los params de ninguna escena — ya viene del sistema con el color del sitio
- Si querés ajustar el color de fondo de una escena específica, usá "primaryColor" en sus params
- Para card_flip_3d los benefits deben ser STRINGS simples, nunca objetos con front/back
- NUNCA incluyas screenshotUrl en ningún params
- Solo elegí animaciones que existan en el catálogo listado arriba — si querés una nueva, anotala en new_animations_for_industry

ANTI-REPETICIÓN DE DATOS — MUY IMPORTANTE:
- Cada escena debe mostrar información DIFERENTE. Nunca repitas el mismo número, texto o beneficio en dos escenas distintas.
- Antes de definir los params de cada escena, revisá todas las escenas anteriores y verificá que no estés repitiendo datos.
- Si product_a muestra "+800" y "24h", product_b NO puede mostrar esos mismos números — debe mostrar otros datos del sitio.
- Los benefits deben ser los beneficios reales extraídos del sitio: {json.dumps(benefits, ensure_ascii=False)}
- El CTA debe usar el CTA real del sitio, no inventar "26 usando ahora" ni frases genéricas de SaaS si el sitio es un ecommerce.
- Si el sitio es un ecommerce, el CTA debe ser sobre productos/compra. Si es SaaS, sobre registrarse/probar.
- Usá contexto correcto al tipo de negocio en todas las animaciones
- Tipo de sitio actual: {page_type} — todos los CTAs y urgencias deben ser coherentes con esto.

PALETA DE COLORES CONTEXTUAL:
- El sitio tiene bgColor: {bg_color}, primaryColor: {primary}, isDark: {is_dark}
- Si el sitio tiene fondo claro (bgColor blanco o claro), el fondo del video debe ser oscuro pero coherente — no negro puro sin motivo.
- Usá el primaryColor del sitio como base del acento. Ajustá brillo/saturación si es necesario para que se vea bien en dark.
- El fondo del brief debe estar JUSTIFICADO por la paleta del sitio, no ser siempre el mismo negro genérico.
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
        "max_tokens": 4000,
        "messages": [{"role": "user", "content": prompt}],
    }

    print(f"[jsx_generator] Claude eligiendo animaciones...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                ANTHROPIC_URL, headers=headers, json=payload,
                timeout=aiohttp.ClientTimeout(total=120),
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
        raw_preview = ""
        try: raw_preview = data["content"][0]["text"][:500]
        except: pass
        print(f"[jsx_generator] parse error: {e}")
        print(f"[jsx_generator] raw preview: {raw_preview}")
        return None


def get_default_selection(page_data: dict) -> dict:
    """Selección por defecto si Claude falla — estructura de 10 sub-escenas."""
    pc = page_data.get("primaryColor", "#6366f1")
    sc = page_data.get("secondaryColor", "#a855f7")
    hl = page_data.get("headline", "")
    site = page_data.get("siteName", "")
    bens = page_data.get("benefits", ["Beneficio 1","Beneficio 2","Beneficio 3"])
    ct = page_data.get("cta", "Empezá ahora")
    nums = page_data.get("numbers", ["1000"])
    return {
        "hook_a": {"animation": "anime_stagger_center", "params": {"number": nums[0] if nums else "1000", "label": hl, "primaryColor": pc}},
        "hook_b": {"animation": "anime_blur_words", "params": {"headline": hl, "primaryColor": pc}},
        "product_a": {"animation": "anime_cinematic_tl", "params": {"primaryColor": pc}},
        "product_b": {"animation": "anime_counter_cascade", "params": {"stats": nums[:3], "primaryColor": pc, "siteName": site}},
        "benefits_a": {"animation": "card_flip_3d", "params": {"benefits": bens[:1], "primaryColor": pc}},
        "benefits_b": {"animation": "spotlight_reveal", "params": {"benefits": bens[1:2], "primaryColor": pc}},
        "benefits_c": {"animation": "icon_draw_reveal", "params": {"features": bens[2:3], "primaryColor": pc}},
        "cta_a": {"animation": "anime_magnetic_cta", "params": {"cta": ct, "primaryColor": pc}},
        "cta_b": {"animation": "anime_shiny_button", "params": {"cta": ct, "primaryColor": pc, "secondaryColor": sc}},
        "outro": {"animation": "anime_spectrum_outro", "params": {"siteName": site, "primaryColor": pc}},
        "brief": {"paleta": {"fondo": "linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)", "acento": pc, "texto": "#ffffff"}},
        "reasoning": "Selección por defecto",
        # Fix: también mantener claves viejas para el renderer viejo
        "hook": {"animation": "anime_blur_words", "params": {
            "headline": page_data.get("headline", ""),
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
        }},
        "product": {"animation": "anime_cinematic_tl", "params": {
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
