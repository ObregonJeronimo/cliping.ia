"""
Diccionario de variaciones para asegurar videos únicos.
Cada combinación de estilo + narrativa + hook + tono produce animaciones distintas.
"""
import hashlib
import random

# ─── Estilos visuales ─────────────────────────────────────────────────────

VISUAL_STYLES = {
    "dark_premium": {
        "bg": "linear-gradient(160deg, #07070f 0%, #0d0d1a 100%)",
        "bg2": "#000",
        "text": "#ffffff",
        "muted": "rgba(255,255,255,0.6)",
        "accent_desc": "gradiente oscuro premium, partículas sutiles, glow morado/azul",
        "card_bg": "rgba(255,255,255,0.04)",
        "card_border": "rgba(255,255,255,0.08)",
    },
    "neon": {
        "bg": "linear-gradient(135deg, #0a0015 0%, #000a1f 100%)",
        "bg2": "#050010",
        "text": "#ffffff",
        "muted": "rgba(255,255,255,0.7)",
        "accent_desc": "neon vibrante, líneas de grid, glitch effects, colores cyan/magenta",
        "card_bg": "rgba(0,255,200,0.05)",
        "card_border": "rgba(0,255,200,0.2)",
    },
    "minimal": {
        "bg": "#ffffff",
        "bg2": "#f8f8f8",
        "text": "#0a0a0a",
        "muted": "#666666",
        "accent_desc": "minimalista blanco, tipografía grande, mucho espacio en blanco",
        "card_bg": "#f4f4f4",
        "card_border": "#e0e0e0",
    },
    "brand": {
        "bg": "usar primaryColor del sitio como fondo",
        "bg2": "usar secondaryColor",
        "text": "#ffffff",
        "muted": "rgba(255,255,255,0.7)",
        "accent_desc": "colores exactos de la marca, coherencia total con la identidad",
        "card_bg": "rgba(255,255,255,0.1)",
        "card_border": "rgba(255,255,255,0.2)",
    },
    "corporate": {
        "bg": "linear-gradient(180deg, #1a2332 0%, #0d1520 100%)",
        "bg2": "#0a1018",
        "text": "#ffffff",
        "muted": "rgba(255,255,255,0.65)",
        "accent_desc": "azul corporativo, limpio, profesional, serif fonts",
        "card_bg": "rgba(255,255,255,0.05)",
        "card_border": "rgba(100,150,255,0.2)",
    },
}

# ─── Estructuras narrativas ────────────────────────────────────────────────

NARRATIVES = {
    "problem_solution": {
        "structure": ["hook_problem", "agitate", "solution_reveal", "features", "cta"],
        "desc": "Comenzá mostrando el dolor del usuario, agitalo, luego revelá la solución como héroe",
        "scene_labels": ["El problema", "¿Te pasa esto?", "La solución", "Cómo funciona", "Empezá ya"],
    },
    "before_after": {
        "structure": ["before_state", "transition", "after_state", "proof", "cta"],
        "desc": "Contraste visual poderoso entre el antes (caos/dolor) y el después (solución/alivio)",
        "scene_labels": ["Antes de {product}", "El cambio", "Después de {product}", "Lo que lograrás", "Transformate"],
    },
    "features": {
        "structure": ["hero", "feature1", "feature2", "feature3", "cta"],
        "desc": "Cada feature tiene su propio momento de brillo con animación específica",
        "scene_labels": ["Conocé {product}", "Feature 1", "Feature 2", "Feature 3", "Probalo gratis"],
    },
    "social_proof": {
        "structure": ["claim", "numbers", "testimonial", "guarantee", "cta"],
        "desc": "Construí confianza con números reales, testimonios y garantías",
        "scene_labels": ["Lo que dicen", "Los números", "Clientes reales", "Garantía", "Únete"],
    },
    "urgency": {
        "structure": ["hook_loss", "stakes", "solution", "scarcity", "cta"],
        "desc": "Creá urgencia mostrando lo que el usuario pierde por no actuar ahora",
        "scene_labels": ["Estás perdiendo", "El costo de esperar", "La solución existe", "Es ahora", "Actúa ya"],
    },
    "story": {
        "structure": ["character", "conflict", "journey", "resolution", "invitation"],
        "desc": "Historia de 3 actos: personaje → conflicto → resolución con el producto como guía",
        "scene_labels": ["Conocé a {character}", "El desafío", "El camino", "La transformación", "Tu historia"],
    },
}

# ─── Hooks de apertura ────────────────────────────────────────────────────

HOOKS = {
    "question": {
        "template": "¿{pain_question}?",
        "animation": "texto grande que aparece letra por letra, fondo oscuro",
        "desc": "Pregunta directa que genera identificación inmediata",
    },
    "stat": {
        "template": "{stat_number} de {audience} {pain_stat}",
        "animation": "contador que sube rápido, número gigante en pantalla",
        "desc": "Dato estadístico impactante que valida el problema",
    },
    "bold": {
        "template": "{bold_statement}",
        "animation": "palabras grandes que entran con punch, zoom dramático",
        "desc": "Afirmación provocadora que interrumpe el scroll",
    },
    "did_you": {
        "template": "¿Sabías que {surprising_fact}?",
        "animation": "revelación progresiva, texto que aparece gradualmente",
        "desc": "Dato curioso que genera curiosidad y retención",
    },
    "result": {
        "template": "Así es como {result_promise}",
        "animation": "resultado revelado con fade dramático",
        "desc": "Promete el resultado antes de mostrar cómo",
    },
    "pain": {
        "template": "{pain_direct}. Hasta ahora.",
        "animation": "texto en rojo/oscuro, luego transición a esperanza",
        "desc": "Dolor directo seguido de esperanza inmediata",
    },
}

# ─── Técnicas de animación por tipo de contenido ─────────────────────────

ANIMATION_TECHNIQUES = {
    "counter": "número que sube animado desde 0 hasta el valor real",
    "typing": "texto que se escribe letra por letra como una terminal",
    "reveal": "elemento que aparece con un sweep de izquierda a derecha",
    "stagger": "lista de items que aparecen con delay entre cada uno",
    "zoom_punch": "zoom brusco hacia el elemento clave",
    "slide_up": "elemento que sube desde abajo con spring",
    "flip": "card que gira mostrando frente y dorso",
    "draw": "línea o ícono SVG que se dibuja progresivamente",
    "morph": "forma que muta de una cosa a otra",
    "glitch": "efecto glitch digital antes de revelar el mensaje",
    "split": "pantalla dividida para mostrar contraste",
    "orbit": "elementos que rotan alrededor de un centro",
    "cascade": "elementos que caen en cascada",
    "pulse": "elemento que pulsa al ritmo de la música",
    "typewriter": "texto como máquina de escribir con cursor parpadeante",
}

# ─── Tonos visuales ───────────────────────────────────────────────────────

TONES = {
    "professional": {
        "font_weight": "600-700",
        "animation_speed": "smooth, damping alto",
        "color_usage": "colores sobrios, poco contraste dramático",
        "desc": "Movimientos suaves, tipografía limpia, colores sobrios",
    },
    "enthusiastic": {
        "font_weight": "800-900",
        "animation_speed": "rápido, energético, bouncy",
        "color_usage": "colores vibrantes, contrastes altos",
        "desc": "Animaciones con rebote, colores saturados, texto grande",
    },
    "urgent": {
        "font_weight": "900",
        "animation_speed": "muy rápido, sin suavizado",
        "color_usage": "rojo/naranja para urgencia, alto contraste",
        "desc": "Cortes rápidos, texto que aparece de golpe, cuenta regresiva",
    },
    "trustworthy": {
        "font_weight": "500-600",
        "animation_speed": "lento, fluido, sin sobresaltos",
        "color_usage": "azules, verdes, colores seguros",
        "desc": "Movimientos suaves, íconos de check, tonos tranquilizadores",
    },
    "disruptive": {
        "font_weight": "900 + italic",
        "animation_speed": "impredecible, glitch effects",
        "color_usage": "neón, saturado, inesperado",
        "desc": "Glitch, cortes abruptos, tipografía experimental, inesperado",
    },
}

# ─── Selector de variación única ─────────────────────────────────────────

def get_variation_seed(job_id: str, url: str) -> random.Random:
    """Genera un seed único basado en job_id + url para reproducibilidad."""
    seed_str = f"{job_id}:{url}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)

def select_random_params(rng: random.Random) -> dict:
    """En modo simple, selecciona parámetros aleatorios únicos."""
    return {
        "visualStyle": rng.choice(list(VISUAL_STYLES.keys())),
        "narrative": rng.choice(list(NARRATIVES.keys())),
        "hook": rng.choice(list(HOOKS.keys())),
        "tone": rng.choice(list(TONES.keys())),
        "animTechniques": rng.sample(list(ANIMATION_TECHNIQUES.keys()), 3),
    }

def build_video_context(params: dict, page_data: dict, job_id: str, url: str) -> dict:
    """Construye el contexto completo para el generador de JSX."""
    rng = get_variation_seed(job_id, url)

    visual_style = params.get("visualStyle", "dark_premium")
    narrative_key = params.get("narrative", "problem_solution")
    hook_key = params.get("hook", "question")
    tone_key = params.get("tone", "enthusiastic")

    # Si es modo simple, agregar variaciones aleatorias
    if params.get("mode") == "simple":
        random_params = select_random_params(rng)
        visual_style = random_params["visualStyle"]
        narrative_key = random_params["narrative"]
        hook_key = random_params["hook"]
        tone_key = random_params["tone"]
        anim_techniques = random_params["animTechniques"]
    else:
        anim_techniques = rng.sample(list(ANIMATION_TECHNIQUES.keys()), 3)

    style_data = VISUAL_STYLES.get(visual_style, VISUAL_STYLES["dark_premium"])
    narrative_data = NARRATIVES.get(narrative_key, NARRATIVES["features"])
    hook_data = HOOKS.get(hook_key, HOOKS["question"])
    tone_data = TONES.get(tone_key, TONES["enthusiastic"])

    # Técnicas de animación seleccionadas
    anim_descs = [f"{t}: {ANIMATION_TECHNIQUES[t]}" for t in anim_techniques]

    return {
        "visual_style": visual_style,
        "style_data": style_data,
        "narrative": narrative_key,
        "narrative_data": narrative_data,
        "hook": hook_key,
        "hook_data": hook_data,
        "tone": tone_key,
        "tone_data": tone_data,
        "anim_techniques": anim_techniques,
        "anim_descs": anim_descs,
        "page_data": page_data,
        "duration": params.get("duration", 30),
        "focus": params.get("focus", "product"),
        "format": params.get("format", "reel"),
    }
