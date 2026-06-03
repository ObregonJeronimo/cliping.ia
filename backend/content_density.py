"""
Calcula la densidad de información útil de una página analizada.
No depende del tipo de página — evalúa cuántos mensajes distintos
y no redundantes puede transmitir el video.
"""

def calculate_density(page_data: dict) -> dict:
    """
    Retorna:
    - score: float, puntos totales
    - messages: list de mensajes únicos disponibles
    - available_durations: list de duraciones disponibles [15, 30, 45, 60]
    - optimal_scenes: dict duración → cantidad óptima de escenas
    - breakdown: dict con detalle de qué aportó puntos
    """
    score = 0.0
    messages = []  # mensajes únicos para el video
    breakdown = {}

    def add(key, label, value, points, msg=None):
        nonlocal score
        if value and str(value).strip():
            score += points
            breakdown[key] = {"label": label, "value": str(value)[:80], "points": points}
            messages.append(msg or str(value)[:80])

    # Datos de texto principales
    add("headline", "Titular", page_data.get("headline"), 1.0)
    add("subheadline", "Subtítulo", page_data.get("subheadline"), 0.75)
    add("problem", "Problema que resuelve", page_data.get("problem"), 1.0)
    add("value_prop", "Propuesta de valor", page_data.get("value_prop"), 0.75)

    # Beneficios únicos (no repetidos entre sí)
    benefits = page_data.get("benefits", [])
    seen_benefit_words = set()
    unique_benefits = []
    for b in benefits:
        text = str(b).lower()[:30]
        words = set(text.split())
        if not words & seen_benefit_words:
            seen_benefit_words |= words
            unique_benefits.append(b)
    for i, b in enumerate(unique_benefits[:6]):
        add(f"benefit_{i}", f"Beneficio {i+1}", b, 0.75)

    # Números/stats únicos
    numbers = page_data.get("numbers", [])
    for i, n in enumerate(numbers[:5]):
        if str(n).strip():
            add(f"number_{i}", f"Stat {i+1}", n, 0.75)

    # Features/características
    features = page_data.get("features", [])
    for i, f in enumerate(features[:4]):
        if str(f).strip():
            add(f"feature_{i}", f"Feature {i+1}", f, 0.5)

    # Datos contextuales
    add("zone", "Zona geográfica", page_data.get("zone"), 0.75)
    add("cta", "CTA real", page_data.get("cta") if page_data.get("cta") not in ("", "Empezá gratis", "Empezar", "Submit") else None, 0.5)
    add("guarantee", "Garantía", page_data.get("guarantee"), 0.75)
    add("contact", "Contacto específico", page_data.get("contact"), 0.5)
    add("audience", "Audiencia objetivo", page_data.get("audience"), 0.5)
    add("emotion", "Emoción/tono", page_data.get("emotion"), 0.25)

    # Calcular duraciones disponibles
    available = []
    if score >= 3:  available.append(15)
    if score >= 6:  available.append(30)
    if score >= 10: available.append(45)
    if score >= 14: available.append(60)
    if not available: available = [15]

    # Escenas óptimas por duración
    optimal_scenes = {
        15: min(5, max(3, int(score * 0.5))),
        30: min(10, max(6, int(score * 0.8))),
        45: min(14, max(9, int(score * 1.0))),
        60: min(18, max(12, int(score * 1.2))),
    }

    return {
        "score": round(score, 2),
        "messages": messages,
        "available_durations": available,
        "optimal_scenes": optimal_scenes,
        "breakdown": breakdown,
        "message_count": len(messages),
    }
