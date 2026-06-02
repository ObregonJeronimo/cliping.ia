"""
Sistema de Composición Generativa.
Claude genera el JSX completo de cada video — no solo elige nombres.
Cada video es único: la estructura, los parámetros, las transiciones y el brief
se aplican directamente al JSX generado.
"""
import json
import re
import asyncio
from pathlib import Path
from anthropic import AsyncAnthropic

client = AsyncAnthropic()

ANIMATIONS_REFERENCE = """
═══ ANIME.JS v4 REAL ═══════════════════════════════════════════════════════

AnimeStaggerCenter(headline, primaryColor, bg, staggerDelay=90, staggerFrom='center'|'first'|'last'|idx, easeName, fontSize, glowIntensity, showLine)
AnimeStaggerGrid2D(benefits[], headline, primaryColor, bg, cols=2, staggerDelay=80, easeName, cardStyle='glass'|'solid'|'outline', glowIntensity)
AnimeStaggerIrregular(headline, benefits[], primaryColor, bg, irregularSegments=10, irregularRandomness=0.5, fontSize, gap)
AnimeScrambleReveal(headline, primaryColor, bg, scrambleSpeed=0.5, scrambleChars, fontSize, fontWeight, monospace, glowColor)
AnimeLetterByLetter(headline, primaryColor, bg, staggerDelay=45, rotateAngle=-12, easeName='outBack(1.4)', fontSize, accentEvery, fontWeight)
AnimeBlurWords(headline, primaryColor, bg, staggerDelay=70, blurAmount=12, fontSize, direction='up'|'down', fontWeight)
AnimeKineticTimeline(headline, subtext, cta, primaryColor, bg, headlineSize=58, headlineEase='outBack(1.6)', subOpacity=0.65, badgeStyle='pill'|'square', showBadge)
AnimeTrueFocus(headline, primaryColor, bg, wordDuration=50, blurOut=5, scaleActive=1.06, activeColor)
AnimeSvgDraw(headline, primaryColor, bg, pathStyle='wave'|'straight'|'curve'|'zigzag'|'spiral', strokeWidth=3, glowStrength=6, drawDuration=1500, showDot)
AnimeMorphBlob(headline, primaryColor, bg, blobSize=210, morphSpeed=90, blobOpacity=0.85, glowStrength=24, gradientStyle='radial'|'linear'|'solid')
AnimeKeyframeBounce(headline, primaryColor, bg, staggerDelay=80, overshootScale=1.1, fontSize, accentEvery)
AnimeCinematicTimeline(headline, subtext, numbers[], primaryColor, bg, headlineSize=52, numSize=60, showLine, numStyle)
AnimeAlternateComparison(benefits[], primaryColor, bg, cycleDuration=1000, labels=[], activeScale=1.04, inactiveOpacity=0.25)
AnimeRotatingWords(headline, options[], primaryColor, bg, wordDuration=60, staticFontSize=30, activeFontSize=66, staticOpacity=0.45)
AnimeShinyButton(cta, subtext, primaryColor, bg, shineSpeed=900, shineDelay=1400, shineWidth='45%', buttonPadding, fontSize, textColor, glowIntensity, subtextOpacity)
AnimeMagneticCTA(cta, subtext, primaryColor, bg, ringCount=3, ringBaseSize=18, pulseSpeed=0.07, buttonSize, glowMax=24)
AnimeContextualCountdown(deliveryTime, cta, primaryColor, bg, barColor, numberSize=100, unitSize=28, showBar, barWidth='65%')
AnimeCounterCascade(stats[], primaryColor, bg, staggerDelay=150, numSize=72, easeName, cardStyle, showLabels)
AnimeGlassCards(benefits[], headline, primaryColor, bg, glowIntensity=0.14, dotSize=8, dotGlow=8, cardPadding, staggerDelay=100, spotlightSpeed=0.035)
AnimeTickerTape(benefits[], primaryColor, bg, speed=1.4, dotSize=6, fontSize=22, fadeEdgeWidth=64, gap=22)
AnimeSpectrumOutro(siteName, primaryColor, bg, barCount=28, barGap=4, barWidth=7, waveSpeed=0.08, waveAmplitude=18, logoSize=52, showDivider)
AnimeTypefaceFade(siteName, primaryColor, bg, fontSize=68, fontWeight=800, letterSpacing='-0.04em', revealDuration=900, showSubline, sublineText)
AnimeParticleForm(siteName, primaryColor, bg, particleCount=22, particleOrbitRadius=90, orbitSpeed=0.05, settleConfig={}, fontSize=64)

═══ GSAP 3.15 REAL ══════════════════════════════════════════════════════════

GsapPhysicsShatter(headline, primaryColor, bg) — SplitText + Physics2D letras caen con gravedad
GsapMaskReveal(headline, subtext, primaryColor, bg) — SplitText mask:lines emerge de máscara
GsapCharsRotate(headline, primaryColor, bg) — SplitText chars rotationX 3D
GsapWordsScramble(headline, primaryColor, bg) — SplitText words scatter aleatorio
GsapDrawSvg(headline, primaryColor, bg) — DrawSVG path con control preciso
GsapMorphShapes(headline, primaryColor, bg) — Morphing SVG entre shapes
GsapMotionPath(headline, steps[], primaryColor, bg) — MotionPath + DrawSVG simultáneo
GsapPhysicsRain(benefits[], primaryColor, bg) — Physics2D lluvia de beneficios
GsapLinesWave(headline, primaryColor, bg) — SplitText chars con wave stagger
GsapElasticCards(benefits[], headline, primaryColor, bg) — elastic.out stagger cards
GsapFlipReveal(benefits[], primaryColor, bg) — rotationY flip 3D cards
GsapPhysicsBurst(cta, subtext, primaryColor, bg) — Physics2D burst partículas del CTA
"""

SYSTEM_PROMPT = """Sos un director creativo de motion graphics de nivel mundial.
Tu trabajo es generar una composición JSX completa y única para un video de marketing de 33 segundos (990 frames a 30fps).

ARQUITECTURA DEL VIDEO — estructura narrativa que SIEMPRE se respeta:
1. HOOK (0-150 frames): Captura atención. Plantea el problema o el resultado. SIN mostrar el logo todavía.
2. PRODUCTO (150-360 frames): Muestra qué es y qué tiene. Números reales, catálogo, diferenciadores.
3. BENEFICIOS (360-630 frames): Por qué elegirnos. Cada beneficio con su propia animación distinta.
4. CTA (630-840 frames): Construir deseo y llamar a la acción. El botón tiene que "magnetizar".
5. OUTRO (840-990 frames): Sello de marca. El logo se forma, se asienta y queda grabado.

REGLAS DE COMPOSICIÓN:
- Cada escena dura entre 60-120 frames según su importancia
- Los parámetros deben VARIAR según el brief: si el ritmo es "urgente" los staggerDelay son menores (40-60), si es "orgánico" son mayores (80-120)
- El color acento del brief (NO el primaryColor del sitio) es lo que se usa en las animaciones con más punch
- Los números del sitio se muestran una sola vez y en la escena más impactante para ese dato
- NUNCA repetir la misma animación dos veces en el mismo video
- Las transiciones entre escenas se hacen con cambios de fondo o flashes suaves
- El bg de cada escena puede variar levemente (distintos gradientes del mismo color base) para dar profundidad
- Los params de cada animación deben reflejar la personalidad del brief: fontSize, glowIntensity, pulseSpeed, etc.

IMPORTANTE: Los "key" de las escenas DEBEN ser exactamente estos en inglés:
hook_a, hook_b, product_a, product_b, benefits_a, benefits_b, benefits_c, cta_a, cta_b, outro
NO usar español (producto_a, beneficios_a, etc). NO usar otros nombres.

OUTPUT: Un objeto JSON con la estructura de composición. Nada más, sin explicaciones, sin markdown."""

async def generate_composition(page_data: dict, brief: dict, video_context: dict) -> dict:
    """
    Genera la composición completa del video como JSON.
    Claude decide qué animaciones usar, con qué parámetros exactos,
    y cómo estructurar las escenas para que cada video sea único.
    """
    site_name = page_data.get('siteName', '')
    headline = page_data.get('headline', '')
    benefits = page_data.get('benefits', [])
    numbers = page_data.get('numbers', [])
    cta = page_data.get('cta', 'Empezá ahora')
    problem = page_data.get('problem', '')
    audience = page_data.get('audience', '')
    primary_color = page_data.get('primaryColor', '#6366f1')
    subheadline = page_data.get('subheadline', '')
    features = page_data.get('features', [])

    brief_concepto = brief.get('concepto', '')
    brief_fondo = brief.get('paleta', {}).get('fondo', '')
    brief_acento = brief.get('paleta', {}).get('acento', primary_color)
    brief_ritmo = brief.get('ritmo', '')
    brief_espacio = brief.get('uso_del_espacio', '')
    brief_evitar = brief.get('must_avoid', '')

    # Limpiar comentarios de Claude en colores
    def clean_color(v):
        if not v: return v
        return re.split(r'\s+[—–-]\s+', str(v))[0].strip()

    bg_color = clean_color(brief_fondo) or f'#07070f'
    accent = clean_color(brief_acento) or primary_color

    prompt = f"""SITIO: {site_name}
HEADLINE: {headline}
SUBHEADLINE: {subheadline}
PROBLEMA: {problem}
AUDIENCIA: {audience}
BENEFICIOS: {json.dumps(benefits, ensure_ascii=False)}
FEATURES: {json.dumps(features, ensure_ascii=False)}
NUMEROS: {json.dumps(numbers, ensure_ascii=False)}
CTA: {cta}
COLOR PRIMARIO DEL SITIO: {primary_color}

BRIEF CREATIVO:
- Concepto: {brief_concepto}
- Fondo: {bg_color}
- Acento: {accent}
- Ritmo: {brief_ritmo}
- Uso del espacio: {brief_espacio}
- Evitar: {brief_evitar}

VARIACIÓN: style={video_context.get('visual_style','dark_premium')} narrative={video_context.get('narrative','features')} hook={video_context.get('hook','bold')} tone={video_context.get('tone','professional')}

{ANIMATIONS_REFERENCE}

Generá la composición JSON con esta estructura exacta:

{{
  "bg": "{bg_color}",
  "accent": "{accent}",
  "scenes": [
    {{
      "key": "hook_a",
      "from": 0,
      "duration": 75,
      "animation": "NombreExactoDelComponente",
      "params": {{
        // parámetros específicos que hacen esta escena única
        // usa el accent como primaryColor, no el color del sitio
        "primaryColor": "{accent}",
        "bg": "{bg_color}",
        // ... todos los params relevantes con valores concretos
      }},
      "razon": "por qué esta animación con estos params para este momento"
    }},
    // ... 8-10 escenas más cubriendo hook→producto→beneficios→cta→outro
  ],
  "transitions": [
    {{"at_frame": 75, "type": "flash", "intensity": 0.3}},
    // ... una transición entre cada escena
  ],
  "creative_reasoning": "narrativa completa del video en 2-3 oraciones"
}}

IMPORTANTE: Los frames de "from" deben sumar cronológicamente hasta 990 frames total.
Los "duration" de todas las escenas deben sumar exactamente 990."""

    response = await client.messages.create(
        model="claude-opus-4-5-20251101",
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    # Limpiar markdown si lo hay
    raw = re.sub(r'^```json\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'^```\s*', '', raw, flags=re.MULTILINE)

    try:
        composition = json.loads(raw)
        print(f"[composition] {len(composition.get('scenes', []))} escenas generadas")
        print(f"[composition] reasoning: {composition.get('creative_reasoning','')[:80]}")
        return composition
    except json.JSONDecodeError as e:
        print(f"[composition] ERROR JSON: {e}")
        print(f"[composition] Raw: {raw[:200]}")
        return _fallback_composition(page_data, accent, bg_color)


def _fallback_composition(page_data: dict, accent: str, bg: str) -> dict:
    """Composición fallback si Claude falla."""
    site = page_data.get('siteName', 'Mi Sitio')
    hl = page_data.get('headline', '')
    benefits = page_data.get('benefits', [])
    numbers = page_data.get('numbers', [])
    cta = page_data.get('cta', 'Empezá ahora')

    return {
        "bg": bg,
        "accent": accent,
        "scenes": [
            {"key": "hook_a", "from": 0, "duration": 75, "animation": "AnimeStaggerCenter",
             "params": {"headline": hl, "primaryColor": accent, "bg": bg, "staggerDelay": 90, "staggerFrom": "center", "fontSize": 56}},
            {"key": "hook_b", "from": 75, "duration": 75, "animation": "AnimeBlurWords",
             "params": {"headline": hl, "primaryColor": accent, "bg": bg, "blurAmount": 12, "staggerDelay": 70}},
            {"key": "product_a", "from": 150, "duration": 110, "animation": "AnimeCinematicTimeline",
             "params": {"headline": hl, "numbers": numbers[:2], "primaryColor": accent, "bg": bg, "headlineSize": 52}},
            {"key": "product_b", "from": 260, "duration": 100, "animation": "AnimeCounterCascade",
             "params": {"stats": numbers[:3], "primaryColor": accent, "bg": bg, "numSize": 72}},
            {"key": "benefits_a", "from": 360, "duration": 90, "animation": "AnimeGlassCards",
             "params": {"benefits": benefits[:3], "primaryColor": accent, "bg": bg, "glowIntensity": 0.14}},
            {"key": "benefits_b", "from": 450, "duration": 90, "animation": "AnimeStaggerGrid2D",
             "params": {"benefits": benefits, "primaryColor": accent, "bg": bg, "cols": 2}},
            {"key": "benefits_c", "from": 540, "duration": 90, "animation": "AnimeTickerTape",
             "params": {"benefits": benefits, "primaryColor": accent, "bg": bg, "speed": 1.4}},
            {"key": "cta_a", "from": 630, "duration": 90, "animation": "AnimeMagneticCTA",
             "params": {"cta": cta, "primaryColor": accent, "bg": bg, "ringCount": 3}},
            {"key": "cta_b", "from": 720, "duration": 120, "animation": "AnimeShinyButton",
             "params": {"cta": cta, "primaryColor": accent, "bg": bg, "glowIntensity": 0.4}},
            {"key": "outro", "from": 840, "duration": 150, "animation": "AnimeParticleForm",
             "params": {"siteName": site, "primaryColor": accent, "bg": bg, "particleCount": 22}},
        ],
        "transitions": [
            {"at_frame": 75, "type": "flash", "intensity": 0.3},
            {"at_frame": 150, "type": "flash", "intensity": 0.3},
            {"at_frame": 260, "type": "flash", "intensity": 0.2},
            {"at_frame": 360, "type": "flash", "intensity": 0.3},
            {"at_frame": 450, "type": "flash", "intensity": 0.2},
            {"at_frame": 540, "type": "flash", "intensity": 0.2},
            {"at_frame": 630, "type": "flash", "intensity": 0.3},
            {"at_frame": 720, "type": "flash", "intensity": 0.2},
            {"at_frame": 840, "type": "flash", "intensity": 0.4},
        ],
        "creative_reasoning": "Composición fallback."
    }


def composition_to_props(composition: dict, page_data: dict) -> dict:
    """
    Convierte la composición generada a los props que recibe MarketingVideo.
    Robusto contra respuestas malformadas de Claude.
    """
    if not isinstance(composition, dict):
        composition = {}

    scenes = composition.get('scenes', [])
    if not isinstance(scenes, list):
        scenes = []

    # Normalizar cada escena — Claude puede usar keys distintas
    normalized_scenes = []
    for s in scenes:
        if not isinstance(s, dict):
            continue
        dur = s.get('duration') or s.get('dur') or s.get('durationInFrames') or 90
        params = s.get('params', {})
        # Si params es string, ignorar
        if not isinstance(params, dict):
            params = {}
        normalized_scenes.append({
            'key': s.get('key', ''),
            'from': s.get('from', 0),
            'duration': int(dur),
            'animation': s.get('animation', ''),
            'params': params,
        })

    # Normalizar keys — Claude a veces usa español
    KEY_MAP = {
        'producto_a': 'product_a', 'producto_b': 'product_b',
        'beneficios_a': 'benefits_a', 'beneficios_b': 'benefits_b', 'beneficios_c': 'benefits_c',
        'beneficio_a': 'benefits_a', 'beneficio_b': 'benefits_b', 'beneficio_c': 'benefits_c',
        'gancho_a': 'hook_a', 'gancho_b': 'hook_b',
        'llamada': 'cta_a', 'llamada_a': 'cta_a', 'llamada_b': 'cta_b',
        'cierre': 'outro', 'final': 'outro',
    }
    for s in normalized_scenes:
        if s['key'] in KEY_MAP:
            s['key'] = KEY_MAP[s['key']]

    scene_map = {s['key']: s for s in normalized_scenes}
    bg = composition.get('bg', '')

    def scene_anim(key, default_anim):
        s = scene_map.get(key, {})
        anim = s.get('animation', default_anim)
        return anim if anim else default_anim

    def scene_params(key):
        s = scene_map.get(key, {})
        return s.get('params', {})

    # Timing dinámico basado en la composición
    timing = {}
    for s in normalized_scenes:
        if s['key']:
            timing[s['key']] = {'from': s['from'], 'dur': s['duration']}

    transitions = composition.get('transitions', [])
    if not isinstance(transitions, list):
        transitions = []

    return {
        # Datos del sitio
        'siteName': page_data.get('siteName', ''),
        'headline': page_data.get('headline', ''),
        'subheadline': page_data.get('subheadline', ''),
        'benefits': page_data.get('benefits', []),
        'features': page_data.get('features', []),
        'cta': page_data.get('cta', 'Empezá ahora'),
        'problem': page_data.get('problem', ''),
        'audience': page_data.get('audience', ''),
        'numbers': page_data.get('numbers', []),
        'primaryColor': page_data.get('primaryColor', '#6366f1'),
        'secondaryColor': page_data.get('secondaryColor', '#818cf8'),
        'bg': bg,
        # Animaciones con params
        'hookAAnimation': scene_anim('hook_a', 'AnimeStaggerCenter'),
        'hookAParams': scene_params('hook_a'),
        'hookBAnimation': scene_anim('hook_b', 'AnimeBlurWords'),
        'hookBParams': scene_params('hook_b'),
        'productAAnimation': scene_anim('product_a', 'AnimeCinematicTimeline'),
        'productAParams': scene_params('product_a'),
        'productBAnimation': scene_anim('product_b', 'AnimeCounterCascade'),
        'productBParams': scene_params('product_b'),
        'benefitsAAnimation': scene_anim('benefits_a', 'AnimeGlassCards'),
        'benefitsAParams': scene_params('benefits_a'),
        'benefitsBAnimation': scene_anim('benefits_b', 'AnimeStaggerGrid2D'),
        'benefitsBParams': scene_params('benefits_b'),
        'benefitsCAnimation': scene_anim('benefits_c', 'AnimeTickerTape'),
        'benefitsCParams': scene_params('benefits_c'),
        'ctaAAnimation': scene_anim('cta_a', 'AnimeMagneticCTA'),
        'ctaAParams': scene_params('cta_a'),
        'ctaBAnimation': scene_anim('cta_b', 'AnimeShinyButton'),
        'ctaBParams': scene_params('cta_b'),
        'outroAnimation': scene_anim('outro', 'AnimeParticleForm'),
        'outroParams': scene_params('outro'),
        # Timing dinámico
        '__timing': timing,
        '__transitions': transitions,
        '__reasoning': composition.get('creative_reasoning', ''),
    }
