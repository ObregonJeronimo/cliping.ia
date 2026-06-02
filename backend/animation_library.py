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
    # Nuevas 2026
    "AnimeMotionPathStagger": {
        "desc": "dot viaja por path SVG + beneficios con stagger irregular organico",
        "best_for": ["benefits"],
        "scene": "benefits",
        "params": ["headline", "benefits", "primaryColor", "bg", "pathStyle", "staggerDelay"],
    },
    "GsapFlipCards": {
        "desc": "cards con entrada flip 3D desde el centro + pulse highlight alternado",
        "best_for": ["benefits", "cta"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "bg", "cols"],
    },
}


def get_catalog_for_claude() -> str:
    """Retorna los nombres válidos de animaciones para el prompt de Claude."""
    lines = ["ANIMACIONES VALIDAS — usa SOLO estos nombres (PascalCase):\n"]
    for key, anim in ANIMATION_CATALOG.items():
        lines.append(f"  {key}: {anim['desc'][:80]}")
    return "\n".join(lines)
