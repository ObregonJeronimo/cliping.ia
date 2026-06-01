"""
Biblioteca de animaciones SVG/CSS predefinidas para Remotion.
Cada animación es una función React que recibe frame, colors y content.
Claude solo elige qué animaciones usar y con qué contenido — no genera código.
"""

# Catálogo de animaciones disponibles para que Claude elija
ANIMATION_CATALOG = {
    # ─── INTRO / HOOK ──────────────────────────────────────────────
    "liquid_title": {
        "desc": "Título que emerge de un blob líquido que se expande desde el centro",
        "best_for": ["saas", "startup", "app"],
        "scene": "hook",
        "params": ["title", "subtitle", "primaryColor"],
    },
    "typewriter_glitch": {
        "desc": "Texto que se escribe como terminal con efecto glitch antes de estabilizarse",
        "best_for": ["tech", "saas", "developer"],
        "scene": "hook",
        "params": ["line1", "line2", "color"],
    },
    "counter_explosion": {
        "desc": "Número/estadística que explota desde 0 con partículas al llegar al máximo",
        "best_for": ["ecommerce", "saas", "fintech"],
        "scene": "hook",
        "params": ["number", "label", "prefix", "suffix", "primaryColor"],
    },
    "word_split": {
        "desc": "Palabras que se separan y reúnen para formar el headline",
        "best_for": ["agency", "brand", "creative"],
        "scene": "hook",
        "params": ["words", "primaryColor"],
    },
    "morphing_shapes": {
        "desc": "Formas geométricas que se morphean entre sí hasta revelar el logo/nombre",
        "best_for": ["brand", "design", "creative"],
        "scene": "hook",
        "params": ["siteName", "primaryColor", "secondaryColor"],
    },
    "reveal_swipe": {
        "desc": "Swipe de color que revela el headline de izquierda a derecha como pincelada",
        "best_for": ["landing", "marketing", "ecommerce"],
        "scene": "hook",
        "params": ["headline", "primaryColor"],
    },
    "particle_text": {
        "desc": "Partículas que vuelan y se ensamblan para formar el nombre del producto",
        "best_for": ["tech", "saas", "startup"],
        "scene": "hook",
        "params": ["siteName", "primaryColor"],
    },

    "liquid_blob_morph": {
        "desc": "Blobs orgánicos que morphean continuamente con SVG gooey filter — formas líquidas que se fusionan y separan",
        "best_for": ["brand", "creative", "startup", "premium"],
        "scene": "hook",
        "params": ["siteName", "headline", "primaryColor", "secondaryColor"],
    },
    "paint_brush_reveal": {
        "desc": "Texto revelado por un pincel animado con salpicaduras de tinta SVG — efecto de pintura artístico",
        "best_for": ["creative", "agency", "art", "brand", "startup"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "secondaryColor"],
    },
    "terminal_reveal": {
        "desc": "Texto que aparece como si se escribiera en una terminal con cursor parpadeante y fondo de código",
        "best_for": ["tech", "saas", "developer", "startup"],
        "scene": "hook",
        "params": ["headline", "subheadline", "primaryColor"],
    },
    "water_ripple_cta": {
        "desc": "Botón CTA que al aparecer genera ondas concéntricas como gotas en el agua",
        "best_for": ["saas", "ecommerce", "landing", "app"],
        "scene": "cta",
        "params": ["cta", "subtext", "primaryColor", "guarantee"],
    },
    "morphing_card": {
        "desc": "Card cuyo border-radius morphea orgánicamente mientras rota entre los beneficios del producto",
        "best_for": ["saas", "app", "startup", "product"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "secondaryColor"],
    },
    "neon_sign": {
        "desc": "Letrero de neón que se enciende letra por letra con parpadeo realista y glow pulsante",
        "best_for": ["brand", "creative", "restaurant", "entertainment", "startup"],
        "scene": "outro",
        "params": ["siteName", "primaryColor", "secondaryColor"],
    },
    "water_drop_title": {
        "desc": "Una gota SVG cae desde arriba, impacta y genera ondas de agua, luego el título emerge desde el centro — MUY impactante",
        "best_for": ["saas", "fintech", "health", "startup", "premium", "landing"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "secondaryColor"],
    },
    "liquid_fill_text": {
        "desc": "El nombre del producto se llena de líquido de abajo hacia arriba con ola sinusoidal y burbujas — único y memorable",
        "best_for": ["brand", "startup", "beverage", "saas", "premium"],
        "scene": "hook",
        "params": ["siteName", "headline", "primaryColor", "secondaryColor"],
    },
    "ink_splash_cta": {
        "desc": "Una mancha de tinta explota desde el centro llenando la pantalla, luego revela el CTA — transición cinematográfica",
        "best_for": ["creative", "agency", "brand", "startup", "saas"],
        "scene": "cta",
        "params": ["cta", "subtext", "primaryColor", "secondaryColor", "guarantee"],
    },
    "cursor_click_reveal": {
        "desc": "Cursor animado SVG se mueve hacia un botón, hace click con ripple, y revela el producto en un iPhone — narrativo e interactivo",
        "best_for": ["saas", "webapp", "tool", "dashboard", "app"],
        "scene": "product",
        "params": ["screenshotUrl", "cta", "primaryColor"],
    },
    "scramble_decode": {
        "desc": "Texto que se decodifica desde caracteres random estilo hacker — muy impactante para tech/fintech",
        "best_for": ["tech", "saas", "fintech", "startup", "developer"],
        "scene": "hook",
        "params": ["headline", "primaryColor"],
    },
    "split_chars_reveal": {
        "desc": "Cada letra del titular entra volando desde una dirección distinta con rotación — efecto dramático único",
        "best_for": ["brand", "creative", "startup", "agency", "landing"],
        "scene": "hook",
        "params": ["headline", "primaryColor"],
    },
    "ticker_tape": {
        "desc": "Tickers de noticias corriendo horizontalmente encuadrando el headline central — muy viral en 2025",
        "best_for": ["news", "finance", "saas", "ecommerce", "launch"],
        "scene": "hook",
        "params": ["headline", "siteName", "primaryColor", "secondaryColor"],
    },
    "card_flip_3d": {
        "desc": "Cards de beneficios que dan vuelta en 3D mostrando frente/dorso — efecto táctil y memorable",
        "best_for": ["saas", "app", "product", "ecommerce"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "secondaryColor"],
    },
    "grid_reveal": {
        "desc": "Beneficios que aparecen en una grilla 2x2 con delays escalonados y glow dinámico",
        "best_for": ["saas", "b2b", "service", "platform"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "secondaryColor"],
    },
    "spotlight_reveal": {
        "desc": "Foco de luz que recorre la pantalla revelando los beneficios — cinematográfico y elegante",
        "best_for": ["premium", "creative", "brand", "saas"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor", "siteName"],
    },
    "zoom_punch_cta": {
        "desc": "Zoom dramático desde 3x que se contrae al CTA — efecto de impacto visual muy efectivo",
        "best_for": ["saas", "ecommerce", "launch", "urgent"],
        "scene": "cta",
        "params": ["cta", "subtext", "primaryColor", "secondaryColor", "guarantee"],
    },
    "freeze_frame_outro": {
        "desc": "Screenshot congelado con filtro, badge PLAY parpadeante y nombre del sitio emergiendo — cierre cinematográfico",
        "best_for": ["saas", "app", "product", "webapp"],
        "scene": "outro",
        "params": ["siteName", "primaryColor", "secondaryColor", "screenshotUrl"],
    },
    "split_screen_problem": {
        "desc": "Pantalla dividida: izquierda muestra el caos/problema, derecha la solución",
        "best_for": ["saas", "productivity", "b2b"],
        "scene": "hook",
        "params": ["problemText", "solutionText", "primaryColor"],
    },
    "kinetic_text": {
        "desc": "Palabras del headline que entran una por una con física y peso, muy impactante",
        "best_for": ["brand", "startup", "saas", "landing"],
        "scene": "hook",
        "params": ["headline", "primaryColor", "secondaryColor"],
    },
    "particle_reveal": {
        "desc": "Partículas que convergen desde los bordes para revelar el nombre del producto",
        "best_for": ["tech", "premium", "saas", "brand"],
        "scene": "hook",
        "params": ["siteName", "headline", "primaryColor", "secondaryColor"],
    },

    # ─── PRODUCTO / DEMO ────────────────────────────────────────────
    "iphone_rise": {
        "desc": "iPhone que sube desde abajo con el screenshot del sitio, flota suavemente",
        "best_for": ["saas", "app", "ecommerce"],
        "scene": "product",
        "params": ["screenshotUrl", "primaryColor"],
    },
    "cursor_demo": {
        "desc": "Cursor animado SVG que se mueve, hace click en botones y navega la UI",
        "best_for": ["saas", "tool", "dashboard"],
        "scene": "product",
        "params": ["screenshotUrl", "ctaText", "primaryColor"],
    },
    "browser_window": {
        "desc": "Ventana de browser que se abre con animación y carga el screenshot",
        "best_for": ["webapp", "saas", "tool"],
        "scene": "product",
        "params": ["screenshotUrl", "url", "primaryColor"],
    },
    "dashboard_build": {
        "desc": "Dashboard que se construye elemento por elemento: cards, gráficos, stats",
        "best_for": ["saas", "analytics", "fintech", "dashboard"],
        "scene": "product",
        "params": ["stats", "primaryColor", "siteName"],
    },
    "flow_diagram": {
        "desc": "Diagrama de flujo animado: paso 1 → paso 2 → paso 3 con íconos SVG",
        "best_for": ["process", "saas", "b2b"],
        "scene": "product",
        "params": ["steps", "primaryColor"],
    },
    "phone_notification": {
        "desc": "Notificaciones que aparecen en el teléfono mostrando eventos del producto",
        "best_for": ["app", "saas", "ecommerce"],
        "scene": "product",
        "params": ["notifications", "primaryColor", "siteName"],
    },

    # ─── BENEFICIOS / FEATURES ──────────────────────────────────────
    "benefit_cards_stagger": {
        "desc": "Cards que entran desde los lados con delay, tienen glow de color",
        "best_for": ["saas", "service", "b2b"],
        "scene": "benefits",
        "params": ["benefits", "primaryColor"],
    },
    "icon_draw_reveal": {
        "desc": "Íconos SVG que se dibujan progresivamente con animación de trazo, luego aparece título y descripción",
        "best_for": ["service", "feature", "explainer", "saas"],
        "scene": "benefits",
        "params": ["features", "primaryColor"],
    },
    "progress_bars": {
        "desc": "Barras de progreso que se llenan animadas mostrando métricas clave con porcentajes",
        "best_for": ["analytics", "performance", "saas", "results"],
        "scene": "benefits",
        "params": ["metrics", "primaryColor"],
    },
    "stat_counters": {
        "desc": "Múltiples contadores animados que suben simultáneamente con sus labels",
        "best_for": ["ecommerce", "saas", "fintech"],
        "scene": "benefits",
        "params": ["stats", "primaryColor"],
    },
    "timeline_scroll": {
        "desc": "Timeline vertical que se dibuja de arriba a abajo, ideal para mostrar el proceso paso a paso",
        "best_for": ["process", "onboarding", "howto", "saas"],
        "scene": "benefits",
        "params": ["steps", "primaryColor"],
    },
    "comparison_table": {
        "desc": "Tabla que compara el antes (X rojo) vs después (checkmark verde) animada",
        "best_for": ["saas", "b2b", "productivity"],
        "scene": "benefits",
        "params": ["before", "after", "primaryColor", "siteName"],
    },
    "floating_feature_orbs": {
        "desc": "Orbes flotantes que orbitan el centro, cada uno con un ícono y texto",
        "best_for": ["tech", "saas", "platform"],
        "scene": "benefits",
        "params": ["features", "primaryColor", "secondaryColor"],
    },
    "progress_bars": {
        "desc": "Barras de progreso que se llenan animadas mostrando métricas clave",
        "best_for": ["analytics", "performance", "saas"],
        "scene": "benefits",
        "params": ["metrics", "primaryColor"],
    },

    # ─── CTA ───────────────────────────────────────────────────────
    "liquid_button_cta": {
        "desc": "Botón que tiene efecto líquido/blob al hacer hover, pulsa con glow",
        "best_for": ["saas", "ecommerce", "landing"],
        "scene": "cta",
        "params": ["cta", "subtext", "primaryColor", "guarantee"],
    },
    "screenshot_zoom_cta": {
        "desc": "Screenshot del sitio con zoom lento, overlay oscuro y botón CTA flotante",
        "best_for": ["saas", "webapp", "tool"],
        "scene": "cta",
        "params": ["screenshotUrl", "cta", "primaryColor", "guarantee"],
    },
    "urgency_countdown": {
        "desc": "CTA con elementos de urgencia: puntos de usuarios activos, garantía",
        "best_for": ["saas", "ecommerce", "launch"],
        "scene": "cta",
        "params": ["cta", "guarantee", "primaryColor", "audience"],
    },

    # ─── LOGO / OUTRO ───────────────────────────────────────────────
    "logo_particle_burst": {
        "desc": "Partículas que explotan y se reensamblan formando el nombre del sitio",
        "best_for": ["brand", "saas", "startup"],
        "scene": "outro",
        "params": ["siteName", "primaryColor", "secondaryColor"],
    },
    "orbit_logo": {
        "desc": "Letra inicial del producto con partículas orbitando, glow pulsante",
        "best_for": ["saas", "app", "tech"],
        "scene": "outro",
        "params": ["siteName", "primaryColor", "secondaryColor"],
    },
    "gradient_text_outro": {
        "desc": "Nombre del sitio con gradient animado y tagline que aparece debajo",
        "best_for": ["brand", "agency", "creative"],
        "scene": "outro",
        "params": ["siteName", "tagline", "primaryColor", "secondaryColor"],
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
