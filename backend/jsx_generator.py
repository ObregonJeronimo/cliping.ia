"""
Genera código JSX de Remotion usando Claude claude-sonnet-4-20250514.
Claude tiene conocimiento profundo de Remotion y genera animaciones épicas y únicas.
"""
import asyncio
import json
import os
import re
import aiohttp

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


SYSTEM_PROMPT = """Sos un experto en motion graphics y Remotion (React para videos programáticos).
Generás código JSX de Remotion que crea videos de marketing ÉPICOS, únicos y visualmente impresionantes.

REGLAS ABSOLUTAS:
1. Respondé SOLO con código JSX válido — sin explicaciones, sin markdown, sin comentarios fuera del código
2. El componente principal DEBE llamarse exactamente: MarketingVideo
3. Imports disponibles (NO los repitas en tu respuesta):
   import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Img, Sequence } from 'remotion';
4. NUNCA uses useState, useEffect, useRef ni hooks de React — SOLO useCurrentFrame y useVideoConfig de Remotion
5. Toda animación DEBE depender de useCurrentFrame() — es el único source of truth del tiempo
6. Para variedad visual usá Math.sin(frame * constante + offset) donde offset es número hardcodeado
7. NO uses Math.random() — los frames se renderizan en paralelo y random daría resultados inconsistentes
8. El export final DEBE ser: export const MarketingVideo = (props) => { ... }
9. Comenzá directo con los componentes helper, sin imports
10. Hacé el video VISUALMENTE IMPRESIONANTE — como si lo hiciera un motion designer de nivel mundial"""


async def generate_jsx(video_context: dict, screenshot_b64: str | None = None) -> str:
    """Genera JSX épico con Claude claude-sonnet-4-20250514."""

    page_data = video_context["page_data"]
    duration = video_context["duration"]
    total_frames = duration * 30
    fmt = video_context.get("format", "reel")
    width  = 390  if fmt == "reel" else (1280 if fmt == "youtube" else 1080)
    height = 844  if fmt == "reel" else (720  if fmt == "youtube" else 1080)

    site_name    = page_data.get("siteName", "Mi Sitio")
    headline     = page_data.get("headline", "La solución que necesitás")
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

    # Parámetros de variación
    visual_style = video_context.get("visual_style", "dark_premium")
    narrative    = video_context.get("narrative", "features")
    hook_type    = video_context.get("hook", "question")
    tone         = video_context.get("tone", "enthusiastic")
    anim_techs   = video_context.get("anim_techniques", ["reveal", "stagger", "zoom_punch"])

    style_desc = {
        "dark_premium": "fondo muy oscuro (#07070f a #0d0d1a), partículas sutiles blancas, glows de color, tipografía blanca pesada, sensación premium/tech",
        "neon":         "fondo negro profundo, efectos neon con cyan/magenta/verde eléctrico, grid lines, glitch effects, cyberpunk",
        "minimal":      "fondo blanco puro, tipografía negra grande, muchísimo espacio en blanco, colores de marca solo en acentos, ultra clean",
        "brand":        f"usar {primary} como color dominante del fondo, todo coherente con la identidad de marca, {secondary} como acento",
        "corporate":    "azul corporativo oscuro (#0d1a2e), líneas geométricas limpias, tipografía sans-serif profesional, confianza",
    }.get(visual_style, "dark premium")

    narrative_desc = {
        "problem_solution": f"Abrí con el PROBLEMA que tiene {audience} (sin {site_name}). Agitá esa emoción. Luego revelá {site_name} como la solución heroica.",
        "before_after":     f"Contraste visual BRUTAL entre el caos/dolor de antes vs la calma/eficiencia con {site_name}.",
        "features":         f"Cada feature de {site_name} tiene su propia escena con animación específica que visualiza lo que hace.",
        "social_proof":     f"Construí confianza progresivamente: números reales → testimonial → garantía → CTA irresistible.",
        "urgency":          f"Mostrá lo que {audience} PIERDE cada día que no usa {site_name}. Creá urgencia genuina.",
        "story":            f"Historia de 3 actos: {audience} tiene un problema → descubre {site_name} → su vida/trabajo mejora.",
    }.get(narrative, "mostrá las features más importantes con animaciones épicas")

    hook_desc = {
        "question":  f"Abrí con una pregunta que golpea directo: '¿{problem or f'Cansado de perder tiempo en {page_type}?'}'",
        "stat":      f"Abrí con un número impactante que valida el problema (contador animado gigante)",
        "bold":      f"Afirmación bold que interrumpe el scroll — texto que entra con punch dramático",
        "did_you":   f"'¿Sabías que...' seguido de un dato sorprendente sobre el problema",
        "result":    f"Mostrá el resultado final primero, luego explicá cómo llegar ahí",
        "pain":      f"Nombrá el dolor exacto de {audience} — que se sientan identificados instantáneamente",
    }.get(hook_type, "hook impactante que detiene el scroll")

    tone_desc = {
        "professional": "movimientos suaves, damping alto, tipografía elegante, colores sobrios",
        "enthusiastic": "animaciones con rebote (stiffness alto), colores saturados, texto grande y bold",
        "urgent":       "cortes rápidos, texto que aparece de golpe (sin spring suave), cuenta regresiva si aplica",
        "trustworthy":  "movimientos lentos y fluidos, íconos de check, colores azul/verde que transmiten seguridad",
        "disruptive":   "efectos glitch (usar Math.sin para simular), tipografía experimental, inesperado",
    }.get(tone, "energético y atractivo")

    screenshot_instruction = ""
    if screenshot_b64:
        screenshot_instruction = """
IMPORTANTE: screenshotUrl está disponible como prop y contiene el screenshot real del sitio.
Usalo con <Img src={screenshotUrl} /> en la escena donde mostrás el producto en acción.
Colocalo dentro de un mockup de iPhone o browser window animado."""

    prompt = f"""Creá un video de marketing de Remotion ÉPICO y ÚNICO para este producto:

═══ PRODUCTO ═══
Nombre: {site_name}
Tipo: {page_type}
Headline: {headline}
Subheadline: {subheadline}
Problema que resuelve: {problem}
Audiencia: {audience}
Beneficios: {json.dumps(benefits[:4], ensure_ascii=False)}
Features: {json.dumps(features[:3], ensure_ascii=False)}
CTA principal: {cta}
Garantía: {guarantee}
Números/stats: {json.dumps(numbers, ensure_ascii=False)}
Color primario: {primary}
Color secundario: {secondary}
Emoción objetivo: {emotion}

═══ CONFIGURACIÓN DEL VIDEO ═══
Duración total: {duration}s = {total_frames} frames a 30fps
Dimensiones: {width}x{height}px ({"vertical mobile" if fmt == "reel" else "horizontal" if fmt == "youtube" else "cuadrado"})

═══ DIRECCIÓN CREATIVA ═══
Estilo visual: {visual_style} → {style_desc}
Narrativa: {narrative} → {narrative_desc}
Hook de apertura: {hook_type} → {hook_desc}
Tono: {tone} → {tone_desc}
Técnicas de animación a usar: {', '.join(anim_techs)}
{screenshot_instruction}

═══ ESTRUCTURA DEL VIDEO ═══
Dividí el video en 5 escenas usando <Sequence from={{X}} durationInFrames={{Y}}>.
Los frames de inicio deben ser EXACTOS sin superposición:
- Escena 1: from=0, dur=90 (0-3s) → Hook de apertura impactante
- Escena 2: from=90, dur=210 (3-10s) → Presentación del producto con mockup
- Escena 3: from=300, dur=270 (10-19s) → Beneficios/features con animaciones específicas  
- Escena 4: from=570, dur=210 (19-26s) → CTA con screenshot y glow
- Escena 5: from=780, dur=120 (26-30s) → Logo final con partículas

═══ REQUISITOS DE CALIDAD ═══
- Cada escena debe tener elementos SIEMPRE EN MOVIMIENTO (no frames estáticos)
- Usá Math.sin(frame * velocidad + offset) para movimiento continuo (float, pulse, rotate)
- spring() para entradas suaves con rebote natural
- interpolate() para transiciones lineales precisas
- Agregá profundidad con múltiples capas (fondo, medio, frente)
- Los textos deben entrar con animaciones, no aparecer de golpe
- Hacé un video que deje al espectador con la mandíbula caída

Props disponibles en MarketingVideo:
siteName, headline, subheadline, benefits (array), features (array), cta, 
primaryColor, secondaryColor, screenshotUrl, problem, audience, 
numbers (array), guarantee

Escribí el código JSX ahora. Comenzá directamente con los componentes helper."""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 6000,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": prompt}],
    }

    print(f"[jsx_generator] llamando a Claude claude-sonnet-4-20250514...")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            ANTHROPIC_URL,
            headers=headers,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=120),
        ) as resp:
            data = await resp.json()

    if resp.status != 200:
        print(f"[jsx_generator] error HTTP {resp.status}: {data}")
        return ""

    try:
        jsx = data["content"][0]["text"].strip()
        # Limpiar markdown si lo incluyó
        jsx = re.sub(r"```(?:jsx|javascript|js|tsx)?", "", jsx)
        jsx = re.sub(r"```\s*$", "", jsx, flags=re.MULTILINE)
        jsx = jsx.strip()
        print(f"[jsx_generator] JSX generado: {len(jsx)} chars")
        return jsx
    except Exception as e:
        print(f"[jsx_generator] parse error: {e} — {data}")
        return ""
