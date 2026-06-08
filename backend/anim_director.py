"""
anim_director — el "cerebro creativo" del modo de animaciones generativas.

Lee el sitio del cliente y, con Sonnet, INVENTA una animación de transformación
encadenada (objetos que se MORFEAN uno en otro con continuidad causal), específica de
ESA marca, distinta cada vez y sin caer en patrones. Devuelve un storyboard beat-por-beat
con los prompts listos para:
  - generación de imagen (frame inicial de cada beat)
  - image-to-video con control de primer/último frame (ej. Kling) para encadenar

El render generativo es la FASE 2 (necesita API key del proveedor). Esta fase produce el
concepto + los prompts, que es lo que prueba la creatividad/variedad por página.
"""

import json
import re
from anthropic import AsyncAnthropic
from cine_generator import analyze_url_light

_client = AsyncAnthropic()
MODEL = "claude-sonnet-4-6"

ANIM_SYSTEM = """Sos un director creativo de animación cinematográfica de marca. Tu trabajo:
a partir de la web de un cliente, IDEAR una animación corta de TRANSFORMACIÓN ENCADENADA
—donde un objeto se convierte/morfea en el siguiente con continuidad causal— pensada
específicamente para ESA marca. Estilo: épico, fluido, detallado, memorable.

PRINCIPIOS (clave):
- CREATIVIDAD REAL: inventá un concepto único para ESTA marca. NUNCA repitas una fórmula.
  Variá radicalmente el concepto entre ideas (no siempre "logo -> X -> producto"). Sorprendé.
- CAUSALIDAD/CONTINUIDAD: cada beat nace del anterior. El ÚLTIMO frame de un beat es el
  PRIMER frame del siguiente (eso permite encadenar clips sin cortes). Describí ese enlace.
- ESPECIFICIDAD: usá lo que la marca realmente vende/transmite. Nada genérico.
- HONESTIDAD: no inventes datos/cifras. Esto es visual/conceptual, no estadísticas.
- 3 a 5 beats. Cada beat dura 2-4 segundos.

Para cada beat devolvés:
- "scene": qué se ve y qué transformación ocurre, EN ESPAÑOL (para que el cliente lo lea).
- "imagePrompt": prompt en INGLÉS para generar el FRAME INICIAL del beat (modelo de imagen).
  Detallado: sujeto, estilo, paleta, iluminación, encuadre vertical 9:16, calidad cine.
- "motionPrompt": prompt en INGLÉS para image-to-video (qué se mueve, cómo, la cámara).
- "linkToNext": EN ESPAÑOL, cómo el último frame de este beat se transforma en el primero
  del siguiente (la "costura" del morph).
- "seconds": 2, 3 o 4.

Respondé SOLO con JSON válido, sin texto extra, con esta forma EXACTA:
{
  "title": "título corto del concepto",
  "logline": "una frase que resume la idea (español)",
  "style": "estética global: paleta, mood, tipo de render (español)",
  "totalSeconds": <suma de seconds>,
  "beats": [
    {"n":1,"scene":"...","imagePrompt":"...","motionPrompt":"...","linkToNext":"...","seconds":3}
  ]
}"""


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", text).strip()
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text)


async def build_concept(url: str, idea: str = "") -> dict:
    """Devuelve un storyboard creativo de transformación para la web dada."""
    site = {}
    try:
        site = await analyze_url_light(url) if url else {}
    except Exception:
        site = {}

    ctx_parts = [
        f"Marca/sitio: {site.get('siteName') or url or 'desconocido'}",
        f"Titular: {site.get('headline','')}",
        f"Descripción: {site.get('description','')}",
        f"Secciones: {', '.join((site.get('sections') or [])[:8])}",
        f"Contexto: {site.get('context','')}",
    ]
    user = "CONTEXTO DEL SITIO:\n" + "\n".join(p for p in ctx_parts if p.split(': ', 1)[-1])
    if idea.strip():
        user += f"\n\nIDEA / PEDIDO DEL USUARIO (respetala y potenciala): {idea.strip()}"
    else:
        user += "\n\nNo hay idea del usuario: inventá vos el concepto más original y a medida de esta marca."
    user += "\n\nIdeá la animación de transformación encadenada. JSON solamente."

    resp = await _client.messages.create(
        model=MODEL, max_tokens=1600, temperature=1.0,  # alta -> creatividad/variedad
        system=ANIM_SYSTEM,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    concept = _parse_json(text)
    concept["brand"] = site.get("siteName") or concept.get("title") or (url or "")
    concept["url"] = url
    # normalizar seconds/total
    beats = concept.get("beats") or []
    for b in beats:
        try:
            b["seconds"] = max(2, min(4, int(b.get("seconds", 3))))
        except Exception:
            b["seconds"] = 3
    concept["totalSeconds"] = sum(b.get("seconds", 3) for b in beats)
    return concept
