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
