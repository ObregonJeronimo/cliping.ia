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

ANIMACIONES REACTBITS + ANIMEJS v4 - LAS MEJORES DEL MERCADO (MIT, open source):
Fuente: reactbits.dev (39k estrellas GitHub) + animejs.com v4 (MIT)

TEXT ANIMATIONS (reactbits.dev):
- blur_text_reveal: cada palabra aparece desde blur extremo con stagger — signature ReactBits
- true_focus_reveal: una palabra a la vez en foco, las demas en blur — efecto hipnotico
- rotating_text_hook: linea fija + palabra que rota entre opciones (slide vertical)
- gradient_shimmer_text: texto con destello de gradiente que viaja — como logo de Linear
- neon_text_reveal: glow de neon que se activa letra por letra — premium
- aurora_text: texto con gradiente aurora animado que rota (colores derivados del sitio)

ANIMEJS v4 TECHNIQUES:
- stagger_from_center: elementos animados desde el centro hacia afuera (stagger(65, center))
- alternate_comparison: ping-pong entre antes/despues con easeInOutQuint
- horizontal_wipe: palabras entran por derecha salen por izquierda (GSAP ScrollTrigger style)
- particle_form_text: particulas que orbitan y forman el logo (AnimeJS particle system)
- count_up_metrics: numeros cuentan hacia arriba con easing (react-countup style)

REACTBITS UI COMPONENTS:
- spotlight_card: card con spotlight que se mueve organicamente — muy premium
- shiny_button_cta: boton con destello de luz que viaja por encima — muy efectivo para CTA

ANIMACIONES 2026 - USA ESTAS PRIMERO (tecnicas de vanguardia, son las mejores):

KINETIC TYPOGRAPHY (texto con fisica):
- word_pressure: palabras con peso fisico diferente, cada una aterriza con masa propia — muy impactante
- variable_weight_title: headline que respira de thin a black (variable fonts 2026) — para conceptos de fuerza
- scramble_reveal: texto empieza como ruido y se cristaliza letra por letra (Vercel/Anthropic style)
- split_char_cascade: cada letra vuela con golden angle distribution (Spotify style) — muy cinematografico
- depth_parallax_hook: 3 capas de texto a velocidades distintas, profundidad real sin 3D (Apple Vision)

PRODUCT / DATA PREMIUM:
- glass_card_reveal: cards glassmorphism con glow pulsante en cascada (Framer style) — nunca generico
- liquid_number_morph: numeros que rotan entre si con transicion liquida y dots indicadores (Stripe style)
- svg_path_draw: SVG que se dibuja en tiempo real con dot viajero — para marcas con recorrido/proceso
- stagger_grid_cards: grid 2x2 con micro-animaciones individuales y float (MagicUI library style)

BENEFITS DE CALIDAD:
- ticker_tape_pro: beneficios en ticker horizontal continuo estilo Bloomberg — para muchos beneficios
- number_explosion: numero explota desde centro con particulas y se asienta (Spotify Wrapped style)

CTA DE CONVERSION REAL:
- magnetic_button: boton con anillos magneticos pulsantes — atrae la mirada fisicamente
- split_screen_reveal: pantalla se parte y CTA emerge desde dentro (Apple trailer cinematografico)
- contextual_countdown: tiempo de entrega/respuesta real con barra de progreso (no fake urgency)

OUTRO MEMORABLE:
- spectrum_outro: barras de espectro de audio que forman el logo (Spotify Wrapped 2025 style)
- typeface_fade_outro: nombre en tipografia grande que se disuelve como niebla (editorial/Vogue motion)

UNIVERSAL DE CALIDAD:
- noise_texture_slide: fondo con ruido SVG animado, contenido flota sobre textura (Framer sites 2026)
- arc_browser_card: card premium con gradient mesh y borde luminoso (Arc Browser style)
- geometric_loop_bg: formas geometricas en loop como background (Abstract Geometric trend 2026)

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
- Para iphone_rise y cursor_click_reveal NO incluyas screenshotUrl en params
- Solo elegí animaciones que existan en el catálogo listado arriba — si querés una nueva, anotala en new_animations_for_industry

ANTI-REPETICIÓN DE DATOS — MUY IMPORTANTE:
- Cada escena debe mostrar información DIFERENTE. Nunca repitas el mismo número, texto o beneficio en dos escenas distintas.
- Antes de definir los params de cada escena, revisá todas las escenas anteriores y verificá que no estés repitiendo datos.
- Si product_a muestra "+800" y "24h", product_b NO puede mostrar esos mismos números — debe mostrar otros datos del sitio.
- Los benefits deben ser los beneficios reales extraídos del sitio: {json.dumps(benefits, ensure_ascii=False)}
- El CTA debe usar el CTA real del sitio, no inventar "26 usando ahora" ni frases genéricas de SaaS si el sitio es un ecommerce.
- Si el sitio es un ecommerce, el CTA debe ser sobre productos/compra. Si es SaaS, sobre registrarse/probar.
- urgency_countdown con "usuarios activos" NO tiene sentido para un ecommerce — usá contexto correcto al tipo de negocio.
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
        "hook_a": {"animation": "counter_explosion", "params": {"number": nums[0] if nums else "1000", "label": hl, "primaryColor": pc}},
        "hook_b": {"animation": "reveal_swipe", "params": {"headline": hl, "primaryColor": pc}},
        "product_a": {"animation": "iphone_rise", "params": {"primaryColor": pc}},
        "product_b": {"animation": "dashboard_build", "params": {"stats": nums[:3], "primaryColor": pc, "siteName": site}},
        "benefits_a": {"animation": "card_flip_3d", "params": {"benefits": bens[:1], "primaryColor": pc}},
        "benefits_b": {"animation": "spotlight_reveal", "params": {"benefits": bens[1:2], "primaryColor": pc}},
        "benefits_c": {"animation": "icon_draw_reveal", "params": {"features": bens[2:3], "primaryColor": pc}},
        "cta_a": {"animation": "urgency_countdown", "params": {"cta": ct, "primaryColor": pc}},
        "cta_b": {"animation": "zoom_punch_cta", "params": {"cta": ct, "primaryColor": pc, "secondaryColor": sc}},
        "outro": {"animation": "neon_sign", "params": {"siteName": site, "primaryColor": pc}},
        "brief": {"paleta": {"fondo": "linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)", "acento": pc, "texto": "#ffffff"}},
        "reasoning": "Selección por defecto",
        # Fix: también mantener claves viejas para el renderer viejo
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
