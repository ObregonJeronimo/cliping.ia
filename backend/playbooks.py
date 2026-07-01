"""
playbooks.py — Conocimiento de marketing por RUBRO (y modificadores por PÚBLICO).

Cada playbook define cómo se cuenta un video para ese vertical: tono, ritmo, qué prueba importa,
qué escenas priorizar/evitar, estilo de CTA y energía. El director recupera SOLO el playbook
relevante (lo elige el brief vía INDUSTRIA/PÚBLICO) y lo inyecta como guía. Es DATA editable:
mejora con el tiempo sin tocar código.

Esto es el foso: criterio curado por rubro para que el video sea perfecto para ESE público.
"""

# Clave -> guía. Mantener corto (entra al prompt). 'energy' alto|medio|bajo, 'theme' = sugerencia
# de paleta (debe existir en THEME_VIBES; es solo una pista, la dirección de arte puede cambiarla).
PLAYBOOKS = {
    "saas": {
        "match": ["saas", "software", "app", "plataforma", "herramienta", "dashboard", "crm", "api", "b2b", "tech", "startup"],
        "tono": "claro, seguro, competente; cero relleno",
        "ritmo": "ágil pero legible",
        "energy": "medio",
        "prueba": "demo de la UI, números de resultado (ahorro de tiempo, %), integraciones",
        "priorizar": "KineticStatement (problema), MockupShowcase/ProcessSteps (cómo funciona), StatReveal (resultado), IntegrationCluster",
        "evitar": "tono publicitario barato; promesas sin dato",
        "cta": "acción de prueba: 'Probalo gratis' / 'Agendá una demo'",
        "theme": "saas-explainer",
        "do": "mostrá el producto en acción y el resultado concreto",
        "dont": "no llenes de adjetivos vacíos",
    },
    "ecommerce": {
        "match": ["tienda", "shop", "ecommerce", "e-commerce", "productos", "comprar", "catálogo", "envío", "carrito", "oferta", "venta"],
        "tono": "deseo + claridad; directo a la compra",
        "ritmo": "dinámico",
        "energy": "medio",
        "prueba": "producto real (fotos), precio, envío, reseñas, garantía",
        "priorizar": "ProductShowcase (fotos reales), OfferPrice, StatReveal (catálogo/reviews), FeatureList (beneficios)",
        "evitar": "demasiado texto; esconder el precio/oferta",
        "cta": "compra/urgencia: 'Aprovechá hoy' / 'Comprá ahora'",
        "theme": "sunset-warm",
        "do": "mostrá el producto y el beneficio de comprarlo ya",
        "dont": "no abuses de listas largas",
    },
    "restaurante": {
        "match": ["restaurante", "café", "cafetería", "bar", "comida", "gastronom", "menú", "delivery", "pizzería", "dietética", "panadería", "food"],
        "tono": "cálido, apetitoso, sensorial; da hambre",
        "ritmo": "medio, con respiro para 'saborear'",
        "energy": "medio",
        "prueba": "imágenes apetitosas reales, variedad, cercanía/horarios, reseñas",
        "priorizar": "ProductShowcase (platos/productos reales), KineticStatement (antojo), FeatureList (variedad/beneficios), MapLocation",
        "evitar": "frialdad corporativa; mucho número",
        "cta": "pedido/visita: 'Pedí ya' / 'Vení a probar'",
        "theme": "organic-natural",
        "do": "que se vea rico y cercano",
        "dont": "no lo hagas frío ni técnico",
    },
    "salud": {
        "match": ["clínica", "salud", "médic", "consultorio", "terapia", "psicolog", "dentista", "fonoaudio", "odontolog", "kinesiolog", "nutricion", "wellness"],
        "tono": "confiable, cálido, profesional; tranquiliza",
        "ritmo": "calmo y claro",
        "energy": "bajo",
        "prueba": "credenciales, trayectoria, testimonios, cercanía/turnos",
        "priorizar": "KineticStatement (empatía con el problema), FeatureList (servicios/confianza), Testimonial, StatReveal (años/pacientes), MapLocation",
        "evitar": "urgencia agresiva; promesas médicas exageradas",
        "cta": "turno/contacto: 'Reservá tu turno' / 'Consultanos'",
        "theme": "clinical-formal",
        "do": "transmití confianza y calma",
        "dont": "no metas presión ni claims médicos fuertes",
    },
    "belleza": {
        "match": ["belleza", "estética", "spa", "peluquería", "cosmétic", "skincare", "maquillaje", "uñas", "salón", "barber"],
        "tono": "aspiracional, elegante, sensorial",
        "ritmo": "suave y elegante",
        "energy": "bajo",
        "prueba": "antes/después, resultado visual, experiencia",
        "priorizar": "KineticStatement (aspiración), ProductShowcase, FeatureList (servicios), Testimonial",
        "evitar": "saturación; tono barato",
        "cta": "reserva: 'Reservá tu cita'",
        "theme": "berry-glow",
        "do": "elegancia y resultado visual",
        "dont": "no satures de info",
    },
    "fitness": {
        "match": ["gym", "gimnasio", "fitness", "entrenamiento", "crossfit", "yoga", "pilates", "deporte", "coach", "personal trainer", "nutrición deportiva"],
        "tono": "motivacional, enérgico, directo",
        "ritmo": "rápido y con punch",
        "energy": "alto",
        "prueba": "transformaciones, resultados, comunidad",
        "priorizar": "KineticStatement (motivación), StatReveal (resultados), FeatureList (beneficios), Comparison (antes/después)",
        "evitar": "lentitud; tono blando",
        "cta": "acción: 'Empezá hoy' / 'Sumate'",
        "theme": "crimson-bold",
        "do": "energía y resultado",
        "dont": "no lo hagas lento ni tibio",
    },
    "inmobiliaria": {
        "match": ["inmobiliaria", "propiedad", "inmueble", "real estate", "departamento", "casa", "alquiler", "venta de propiedades", "desarrollo inmobiliario"],
        "tono": "aspiracional, cinematográfico, confiable",
        "ritmo": "cinemático, con aire",
        "energy": "bajo",
        "prueba": "imágenes de la propiedad, ubicación, trayectoria",
        "priorizar": "ProductShowcase (propiedades), KineticStatement (sueño/estilo de vida), MapLocation, FeatureList",
        "evitar": "saturación; tono barato",
        "cta": "contacto: 'Agendá una visita'",
        "theme": "gold-lux",
        "do": "espacio, elegancia y ubicación",
        "dont": "no lo apures",
    },
    "fintech": {
        "match": ["fintech", "banco", "finanzas", "pagos", "inversión", "billetera", "crédito", "préstamo", "cripto", "seguros", "contabilidad"],
        "tono": "confianza + claridad; seguro y simple",
        "ritmo": "ágil y limpio",
        "energy": "medio",
        "prueba": "seguridad, números, simpleza, respaldo",
        "priorizar": "KineticStatement (problema de plata), StatReveal (dato/ahorro), ProcessSteps (cómo funciona), FeatureList (seguridad/beneficios)",
        "evitar": "jerga; promesas de rendimiento exageradas",
        "cta": "registro: 'Abrí tu cuenta' / 'Empezá gratis'",
        "theme": "ocean-deep",
        "do": "claridad y seguridad",
        "dont": "no uses jerga ni promesas de ganancia",
    },
    "educacion": {
        "match": ["curso", "academia", "educación", "escuela", "universidad", "capacitación", "clases", "e-learning", "tutorial", "formación", "bootcamp"],
        "tono": "inspirador, claro, cercano",
        "ritmo": "medio, claro",
        "energy": "medio",
        "prueba": "resultados de alumnos, temario, certificación, testimonios",
        "priorizar": "KineticStatement (transformación), FeatureList (qué aprendés), StatReveal (egresados), Testimonial",
        "evitar": "aburrido; demasiado texto",
        "cta": "inscripción: 'Inscribite' / 'Empezá a aprender'",
        "theme": "saas-explainer",
        "do": "mostrá la transformación que logra el alumno",
        "dont": "no lo hagas acartonado",
    },
    "agencia": {
        "match": ["agencia", "estudio", "marketing", "diseño", "branding", "publicidad", "consultora", "servicios creativos", "desarrollo web"],
        "tono": "creativo, seguro, con estilo",
        "ritmo": "dinámico y pulido",
        "energy": "medio",
        "prueba": "trabajos/casos, resultados de clientes, estilo",
        "priorizar": "KineticStatement (propuesta), ProductShowcase (trabajos), StatReveal (resultados), FeatureList (servicios)",
        "evitar": "genérico; sin personalidad",
        "cta": "contacto: 'Hablemos' / 'Pedí tu propuesta'",
        "theme": "berry-glow",
        "do": "mostrá estilo y resultados",
        "dont": "no seas genérico",
    },
    "servicio_local": {
        "match": ["servicio", "reparación", "plomero", "electricista", "cerrajero", "limpieza", "mudanza", "fletes", "jardinería", "técnico", "oficio", "mantenimiento"],
        "tono": "confiable, cercano, directo",
        "ritmo": "ágil y claro",
        "energy": "medio",
        "prueba": "rapidez, garantía, zona de cobertura, reseñas",
        "priorizar": "KineticStatement (problema cotidiano), FeatureList (beneficios/garantía), StatReveal (trabajos/años), MapLocation",
        "evitar": "tono corporativo; mucho texto",
        "cta": "contacto inmediato: 'Llamanos hoy' / 'Pedí presupuesto'",
        "theme": "ocean-deep",
        "do": "resolvé un problema concreto y mostrá confianza",
        "dont": "no lo hagas frío",
    },
    "evento": {
        "match": ["evento", "festival", "concierto", "conferencia", "feria", "show", "fiesta", "entradas", "ticket"],
        "tono": "enérgico, vibrante, FOMO",
        "ritmo": "rápido, con beat",
        "energy": "alto",
        "prueba": "fecha, lugar, line-up/programa, urgencia de entradas",
        "priorizar": "KineticStatement (hype), StatReveal (fecha/datos), FeatureList (qué incluye), CtaOutro con urgencia",
        "evitar": "lentitud; falta de fecha/lugar",
        "cta": "entradas/urgencia: 'Conseguí tu lugar' / 'Últimas entradas'",
        "theme": "cyber-neon",
        "do": "generá hype y dejá clarísimos fecha y lugar",
        "dont": "no lo hagas lento",
    },
    "ong": {
        "match": ["ong", "fundación", "causa", "donación", "voluntariado", "social", "sin fines de lucro", "comunidad", "solidari"],
        "tono": "humano, emotivo, esperanzador",
        "ritmo": "medio, con peso emocional",
        "energy": "bajo",
        "prueba": "impacto real, historias, transparencia",
        "priorizar": "KineticStatement (la causa), StatReveal (impacto), Testimonial, FeatureList (cómo ayuda tu aporte)",
        "evitar": "frialdad; culpa agresiva",
        "cta": "sumate: 'Sumá tu ayuda' / 'Doná hoy'",
        "theme": "organic-natural",
        "do": "conmoví con impacto real",
        "dont": "no manipules con culpa",
    },
    "lujo": {
        "match": ["lujo", "premium", "joyería", "joyas", "alta gama", "exclusivo", "boutique", "relojes", "diseñador"],
        "tono": "elegante, aspiracional, sobrio; mucho aire",
        "ritmo": "lento y elegante",
        "energy": "bajo",
        "prueba": "estética, materiales, exclusividad, herencia/trayectoria",
        "priorizar": "KineticStatement (aspiración), ProductShowcase (producto cuidado), LogoReveal",
        "evitar": "urgencia barata; saturación; mucho texto",
        "cta": "sutil: 'Descubrí la colección'",
        "theme": "gold-lux",
        "do": "menos es más; elegancia y aire",
        "dont": "nunca metas urgencia ni descuentos chillones",
    },
}

# Modificador por PÚBLICO: ajusta energía/tono sin reemplazar el playbook del rubro.
AUDIENCE_MODS = {
    "gen z": "Público Gen Z: más punch, cortes rápidos, lenguaje directo y actual, alto contraste.",
    "jóvenes": "Público joven: enérgico, fresco, directo.",
    "profesionales": "Público profesional: claro, seguro, sin relleno, foco en resultado/tiempo.",
    "empresas": "Público B2B: foco en ROI, eficiencia y confianza; tono competente.",
    "padres": "Público familias/padres: cálido, confiable, foco en seguridad y bienestar.",
    "lujo": "Público premium: sobrio, aspiracional, mucho aire, cero urgencia barata.",
    "adultos mayores": "Público adulto mayor: claro, legible, calmo, lenguaje simple.",
}

_DEFAULT = {
    "tono": "claro y persuasivo", "ritmo": "ágil pero legible", "energy": "medio",
    "prueba": "lo más concreto y real que tenga el sitio (datos, beneficios, prueba social)",
    "priorizar": "KineticStatement potente al inicio, prueba real en el medio, CTA claro al final",
    "evitar": "texto de más; promesas sin sustento", "cta": "acción clara según el objetivo",
    "theme": "", "do": "mensaje claro y específico de la marca", "dont": "no caer en lo genérico",
}

# Mapa RUBRO-CANONICO de perception (tech/finanzas/gastronomia/moda/eventos/...) -> CLAVE de playbook. perception y
# playbooks usan taxonomias DISTINTAS; sin este mapa, 'tech'/'gastronomia'/'moda'/'eventos' caerian al _DEFAULT (o
# matchearian por casualidad via substrings). Con el mapa, cada rubro detectado activa SU playbook. Los rubros que ya
# coinciden por nombre con una clave (salud/belleza/fitness/inmobiliaria/educacion) no necesitan entrada.
RUBRO_ALIAS = {
    "tech": "saas", "finanzas": "fintech", "gastronomia": "restaurante",
    "moda": "ecommerce", "eventos": "evento",
}


def _match_key(industria: str) -> str:
    """Mapea una industria (rubro canonico o texto libre) a una clave de playbook. Devuelve '' si no matchea."""
    s = (industria or "").lower().strip()
    if not s:
        return ""
    if s in PLAYBOOKS:      # el rubro YA es una clave de playbook (salud/belleza/fitness/inmobiliaria/educacion)
        return s
    if s in RUBRO_ALIAS:    # rubro canonico de perception -> su clave (tech->saas, gastronomia->restaurante, ...)
        return RUBRO_ALIAS[s]
    best, best_hits = "", 0
    for key, pb in PLAYBOOKS.items():
        hits = sum(1 for kw in pb["match"] if kw in s)
        if hits > best_hits:
            best, best_hits = key, hits
    return best


def pick(industria: str = "", publico: str = "") -> dict:
    """Devuelve {'key', 'pb', 'guide'}: la clave del playbook elegido, su dict, y un bloque de
    texto compacto listo para inyectar en el prompt del director. Nunca rompe: si no matchea,
    usa un playbook genérico."""
    key = _match_key(industria)
    pb = PLAYBOOKS.get(key, _DEFAULT)
    # modificador por público (match laxo por palabra)
    pl = (publico or "").lower()
    mod = ""
    for k, v in AUDIENCE_MODS.items():
        if k in pl:
            mod = v
            break
    guide = (
        f"PLAYBOOK DEL RUBRO ({key or 'genérico'}) — seguilo para que el video sea perfecto para este público:\n"
        f"- Tono: {pb['tono']}\n"
        f"- Ritmo/energía: {pb['ritmo']} (energía {pb['energy']})\n"
        f"- Prueba que importa acá: {pb['prueba']}\n"
        f"- Escenas a priorizar: {pb['priorizar']}\n"
        f"- Evitá: {pb['evitar']}\n"
        f"- Estilo de CTA: {pb['cta']}\n"
        f"- Regla: {pb['do']}. NO: {pb['dont']}."
    )
    if mod:
        guide += f"\n- {mod}"
    return {"key": key or "generico", "pb": pb, "guide": guide, "energy": pb["energy"], "theme_hint": pb.get("theme", "")}
