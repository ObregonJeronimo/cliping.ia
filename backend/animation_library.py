"""
Biblioteca de animaciones SVG/CSS predefinidas para Remotion.
Cada animación es una función React que recibe frame, colors y content.
Claude solo elige qué animaciones usar y con qué contenido — no genera código.
"""

# Catálogo de animaciones disponibles para que Claude elija
ANIMATION_CATALOG = {
    # ─── ANIME.JS v4 — STAGGER ────────────────────────────────────────────
    "anime_stagger_center": {
        "desc": "stagger(90, from:'center') — palabras desde el centro con blur. El clasico de anime.js",
        "best_for": ["hook", "cualquier"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    "anime_stagger_grid_2d": {
        "desc": "stagger(80, grid:[2,N], from:'center') — grilla 2D de beneficios desde el centro",
        "best_for": ["benefits"],
        "scene": "benefits",
        "params": ["benefits", "headline", "primaryColor", "bg"],
    },
    "anime_stagger_irregular": {
        "desc": "stagger con irregular(10,0.5) — orden caotico organico, muy dinamico",
        "best_for": ["benefits"],
        "scene": "benefits",
        "params": ["benefits", "headline", "primaryColor", "bg"],
    },
    # ─── ANIME.JS v4 — TEXT ───────────────────────────────────────────────
    "anime_scramble_reveal": {
        "desc": "scrambleText() real — texto se cristaliza del ruido de caracteres",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    "anime_letter_by_letter": {
        "desc": "stagger(45) letra a letra con rotate — iconico de anime.js",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    "anime_blur_words": {
        "desc": "blur+opacity+y con stagger(70) — cada palabra aparece desde blur extremo",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    "anime_kinetic_timeline": {
        "desc": "createTimeline con labels: headline->sub->badge encadenados cinematograficamente",
        "best_for": ["hook", "product"],
        "scene": "hook",
        "params": ["headline", "subtext", "cta", "primaryColor", "bg"],
    },
    "anime_true_focus": {
        "desc": "una palabra en foco, resto en blur — efecto hipnotico que cambia palabra a palabra",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    # ─── ANIME.JS v4 — SVG ────────────────────────────────────────────────
    "anime_svg_draw": {
        "desc": "createDrawable() — path SVG que se dibuja en tiempo real con punto viajero",
        "best_for": ["product"],
        "scene": "product",
        "params": ["headline", "primaryColor", "bg"],
    },
    "anime_morph_blob": {
        "desc": "morphTo() — blob SVG que morphea entre shapes organicamente",
        "best_for": ["hook", "product"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    # ─── ANIME.JS v4 — KEYFRAMES / TIMELINE ──────────────────────────────
    "anime_keyframe_bounce": {
        "desc": "keyframes porcentuales con outBounce — letras que rebotan al aterrizar",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    "anime_cinematic_tl": {
        "desc": "createTimeline con .label() — secuencia cinematografica headline+sub+numeros",
        "best_for": ["product"],
        "scene": "product",
        "params": ["headline", "subtext", "numbers", "primaryColor", "bg"],
    },
    # ─── ANIME.JS v4 — ALTERNATE / LOOP ──────────────────────────────────
    "anime_alternate_cmp": {
        "desc": "alternate:true loop — comparacion antes/despues pulsante con easeInOutQuint",
        "best_for": ["benefits"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "bg"],
    },
    "anime_rotating_words": {
        "desc": "palabra que rota entre opciones con slide vertical y spring physics",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "options", "primaryColor", "bg"],
    },
    # ─── ANIME.JS v4 — CTA ────────────────────────────────────────────────
    "anime_shiny_button": {
        "desc": "timeline con destello loop usando translateX — el mejor CTA de la biblioteca",
        "best_for": ["cta"],
        "scene": "cta",
        "params": ["cta", "subtext", "primaryColor", "bg"],
    },
    "anime_magnetic_cta": {
        "desc": "anillos concentricos pulsantes con outElastic — boton que atrae la mirada",
        "best_for": ["cta"],
        "scene": "cta",
        "params": ["cta", "subtext", "primaryColor", "bg"],
    },
    "anime_countdown": {
        "desc": "tiempo de entrega real con barra de progreso — countdown contextual no fake",
        "best_for": ["cta"],
        "scene": "cta",
        "params": ["deliveryTime", "cta", "primaryColor", "bg"],
    },
    # ─── ANIME.JS v4 — DATA / PRODUCT ─────────────────────────────────────
    "anime_counter_cascade": {
        "desc": "stagger(150) numeros/stats con outBack — cada stat cae y rebota",
        "best_for": ["product"],
        "scene": "product",
        "params": ["stats", "primaryColor", "bg"],
    },
    "anime_glass_cards": {
        "desc": "glassmorphism con spotlight que se mueve organicamente — cards premium",
        "best_for": ["benefits", "product"],
        "scene": "benefits",
        "params": ["benefits", "headline", "primaryColor", "bg"],
    },
    "anime_ticker_tape": {
        "desc": "beneficios en ticker horizontal continuo estilo Bloomberg",
        "best_for": ["benefits"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "bg"],
    },
    # ─── ANIME.JS v4 — OUTRO ──────────────────────────────────────────────
    "anime_spectrum_outro": {
        "desc": "barras de espectro stagger(center) + logo — Spotify Wrapped style",
        "best_for": ["outro"],
        "scene": "outro",
        "params": ["siteName", "primaryColor", "bg"],
    },
    "anime_typeface_fade": {
        "desc": "nombre se disuelve con blur — editorial style, muy elegante",
        "best_for": ["outro"],
        "scene": "outro",
        "params": ["siteName", "primaryColor", "bg"],
    },
    "anime_particle_form": {
        "desc": "particulas que orbitan y forman el logo con spring physics",
        "best_for": ["outro"],
        "scene": "outro",
        "params": ["siteName", "primaryColor", "bg"],
    },
    # ─── GSAP 3.15 — SplitText ────────────────────────────────────────────
    "gsap_physics_shatter": {
        "desc": "SplitText + Physics2D — letras aparecen y caen con gravedad real. UNICO",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    "gsap_mask_reveal": {
        "desc": "SplitText mask:lines — lineas emergen de detras de mascara. Tecnica premium",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "subtext", "primaryColor", "bg"],
    },
    "gsap_chars_rotate": {
        "desc": "SplitText chars con rotationX 3D — cada caracter gira en el eje X",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    "gsap_words_scramble": {
        "desc": "SplitText words con scatter aleatorio — palabras vuelan y se asientan",
        "best_for": ["hook"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    "gsap_lines_wave": {
        "desc": "SplitText chars con wave stagger — ola de caracteres",
        "best_for": ["hook", "product"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    # ─── GSAP 3.15 — SVG ──────────────────────────────────────────────────
    "gsap_draw_svg": {
        "desc": "DrawSVG con control preciso de % — path que se dibuja de X% a Y%",
        "best_for": ["product"],
        "scene": "product",
        "params": ["headline", "primaryColor", "bg"],
    },
    "gsap_morph_shapes": {
        "desc": "MorphSVG — circulo a ovoide a cuadrado a triangulo en loop",
        "best_for": ["hook", "product"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "bg"],
    },
    # ─── GSAP 3.15 — MOTION / PHYSICS ─────────────────────────────────────
    "gsap_motion_path": {
        "desc": "MotionPath — elemento viaja por path SVG con DrawSVG simultaneo",
        "best_for": ["product"],
        "scene": "product",
        "params": ["headline", "steps", "primaryColor", "bg"],
    },
    "gsap_physics_rain": {
        "desc": "Physics2D — beneficios llueven desde arriba con gravedad real",
        "best_for": ["benefits"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "bg"],
    },
    # ─── GSAP 3.15 — UI ───────────────────────────────────────────────────
    "gsap_elastic_cards": {
        "desc": "elastic.out(1,0.6) stagger — cards con resorte fisico",
        "best_for": ["benefits", "cta"],
        "scene": "benefits",
        "params": ["benefits", "headline", "primaryColor", "bg"],
    },
    "gsap_flip_reveal": {
        "desc": "rotationY flip 3D cards — cada card hace flip de costado",
        "best_for": ["benefits"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "bg"],
    },
    "gsap_physics_burst": {
        "desc": "Physics2D burst — particulas explotan del CTA con gravedad",
        "best_for": ["cta"],
        "scene": "cta",
        "params": ["cta", "subtext", "primaryColor", "bg"],
    },
}


def get_catalog_for_claude() -> str:
    """Retorna el catálogo en formato legible para Claude."""
    lines = ["ANIMACIONES DISPONIBLES (elegí UNA por escena):\n"]
    current_scene = None
    for key, anim in ANIMATION_CATALOG.items():
        if anim["scene"] != current_scene:
            current_scene = anim["scene"]
            scene_labels = {"hook": "ESCENA 1 - HOOK", "product": "ESCENA 2 - PRODUCTO",
                           "benefits": "ESCENA 3 - BENEFICIOS", "cta": "ESCENA 4 - CTA",
                           "outro": "ESCENA 5 - OUTRO"}
            lines.append(f"\n── {scene_labels.get(current_scene, current_scene)} ──")
        lines.append(f"  {key}: {anim['desc']}")
        lines.append(f"    params: {anim['params']}")
    return "\n".join(lines)

# ── NUEVA BIBLIOTECA 2025/2026 ─────────────────────────────────────────────
HOOK_NEW = [
    "glitch_slice",       # texto cortado en franjas que se reensamblan — muy dramático
    "magnetic_words",     # palabras que vuelan desde distintos ángulos con física
    "noise_reveal",       # texto emerge desde ruido estático de pantalla
    "staggered_lines",    # líneas de texto con stagger desde abajo estilo Linear/Arc
    "morphing_number",    # número grande que cuenta hacia arriba y revela headline
    "split_reveal_h",     # pantalla se divide en dos puertas que se abren
    "typewriter_premium", # typewriter con cursor real y efecto premium
    "elastic_scale_in",   # título entra con spring con overshoot tipo iOS
    "blur_reveal",        # headline emerge desde blur extremo a nitidez
]

PRODUCT_NEW = [
    "app_preview_slide",  # pantalla de app que desliza desde abajo con sombra premium
    "feature_spotlight",  # zoom que enfoca una feature específica del producto
    "metrics_dashboard",  # dashboard de métricas con barras animadas
    "code_terminal",      # terminal que muestra código o comandos línea a línea
    "notification_stack", # notificaciones que se apilan desde arriba estilo iOS
]

BENEFITS_NEW = [
    "checklist_reveal",   # checkmarks que se revelan con animación de tick
    "pill_tags_cloud",    # beneficios como pills flotantes con stagger
    "accordion_reveal",   # cards que se expanden como acordeón
    "bento_grid",         # layout tipo bento box con cards de distintos tamaños
    "wave_stats",         # estadísticas con ondas de fondo animadas
]

CTA_NEW = [
    "glow_pulse_cta",     # botón con pulso de glow expansivo estilo Apple
    "swipe_up_cta",       # flecha animada que invita a swipe estilo TikTok
    "split_cta",          # pantalla dividida antes/después con CTA en el centro
]

OUTRO_NEW = [
    "minimal_logo",       # cierre minimalista estilo Apple: logo solo
    "wipe_out_outro",     # contenido se barre con color revelando el logo
    "particle_dissolve",  # logo se forma y se disuelve en partículas
    "grid_collapse",      # grilla de tiles que colapsan revelando el logo
]

UNIVERSAL_NEW = [
    "floating_text_badge", # badge flotante con texto para cualquier escena
    "cinematic_title",     # título cinemático con letterbox estilo película
]

ALL_NEW_ANIMATIONS = HOOK_NEW + PRODUCT_NEW + BENEFITS_NEW + CTA_NEW + OUTRO_NEW + UNIVERSAL_NEW

MORPHING_LIQUID = [
    "blob_morph_hero",    # forma blob orgánica que late y revela headline — muy impactante
    "liquid_button_hook", # botón que morphea forma orgánicamente con blob
    "morphing_cta",       # CTA donde el botón cambia de forma fluida (blob → pill → blob)
    "blob_cards",         # cards de beneficios con forma blob animada
    "shape_shift",        # formas geométricas que se transforman: círculo → cuadrado → rombo
    "blob_outro",         # logo que emerge desde un blob orgánico expansivo
]
ALL_MORPHING = MORPHING_LIQUID
