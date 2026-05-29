"""
Genera código JSX de Remotion dinámicamente usando Groq.
Cada video es único porque el LLM escribe el código basado en:
- Los datos reales de la página
- La combinación de estilo/narrativa/hook/tono elegida
- Las técnicas de animación seleccionadas aleatoriamente
"""
import json
import re
from vision import _groq_text


REMOTION_SYSTEM_PROMPT = """Sos un experto en Remotion (React para videos) y motion graphics.
Tu tarea es escribir código JSX de Remotion para un video de marketing épico y único.

REGLAS CRÍTICAS:
1. Respondé SOLO con código JSX válido, sin explicaciones ni markdown
2. El componente principal debe llamarse EXACTAMENTE: MarketingVideo
3. Usá SOLO estas APIs de Remotion (ya están importadas):
   - useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, Img
4. NO uses useState, useEffect, ni ningún hook de React que no sea los de Remotion
5. Todas las animaciones DEBEN depender de useCurrentFrame() — nada de Math.random() directo
6. Para "aleatoriedad" visual usá: Math.sin(frame * N + offset) donde offset es una constante
7. El video tiene exactamente {total_frames} frames a 30fps ({duration}s)
8. Width: {width}px, Height: {height}px
9. Los imports ya están hechos — comenzá directo con los componentes helper y luego MarketingVideo
10. El export debe ser: export const MarketingVideo = ({{ ...props }}) => {{ ... }}"""


async def generate_jsx(video_context: dict, screenshot_b64: str | None = None) -> str:
    """
    Genera código JSX de Remotion usando Groq basado en el contexto de variación.
    """
    page_data = video_context["page_data"]
    duration = video_context["duration"]
    total_frames = duration * 30
    fmt = video_context["format"]
    width = 390 if fmt == "reel" else (1280 if fmt == "youtube" else 1080)
    height = 844 if fmt == "reel" else (720 if fmt == "youtube" else 1080)

    style = video_context["style_data"]
    narrative = video_context["narrative_data"]
    hook = video_context["hook_data"]
    tone = video_context["tone_data"]

    site_name = page_data.get("siteName", "Mi Sitio")
    headline = page_data.get("headline", "La solución que necesitás")
    benefits = page_data.get("benefits", ["Beneficio 1", "Beneficio 2", "Beneficio 3"])
    cta = page_data.get("cta", "Empezá gratis")
    primary_color = page_data.get("primaryColor", "#6366f1")
    secondary_color = page_data.get("secondaryColor", "#818cf8")
    page_type = page_data.get("pageType", "saas")
    features = page_data.get("features", [])
    problem = page_data.get("problem", "")
    audience = page_data.get("audience", "")
    numbers = page_data.get("numbers", [])

    anim_descs = "\n".join([f"- {a}" for a in video_context["anim_descs"]])
    scene_labels = narrative.get("scene_labels", ["Escena 1", "Escena 2", "Escena 3", "Escena 4", "Escena 5"])
    scene_labels = [l.replace("{product}", site_name).replace("{character}", audience or "tu cliente") for l in scene_labels]

    screenshot_instruction = ""
    if screenshot_b64:
        screenshot_instruction = f"""
La screenshot del sitio está disponible como prop screenshotUrl (string base64).
Podés usarla con: <Img src={{screenshotUrl}} style={{...}} />
Usala en las escenas donde sea relevante mostrar la UI real del producto."""

    prompt = f"""Escribí el código JSX completo para un video de marketing de Remotion con estas especificaciones:

═══ PRODUCTO ═══
Nombre: {site_name}
Tipo: {page_type}
Headline: {headline}
Beneficios: {json.dumps(benefits, ensure_ascii=False)}
CTA: {cta}
Color primario: {primary_color}
Color secundario: {secondary_color}
Problema que resuelve: {problem or 'No especificado'}
Audiencia: {audience or 'No especificada'}
Números/estadísticas: {json.dumps(numbers, ensure_ascii=False)}
Features específicas: {json.dumps(features[:5], ensure_ascii=False)}

═══ CONFIGURACIÓN DEL VIDEO ═══
Duración: {duration} segundos ({total_frames} frames a 30fps)
Dimensiones: {width}x{height}px
Estructura narrativa: {video_context['narrative']} — {narrative.get('desc', '')}
Escenas: {json.dumps(scene_labels, ensure_ascii=False)}

═══ ESTILO VISUAL ═══
Estilo: {video_context['visual_style']}
Descripción visual: {style.get('accent_desc', '')}
Fondo: {style.get('bg', '')}
Tono: {video_context['tone']} — {tone.get('desc', '')}
Peso tipográfico: {tone.get('font_weight', '700')}
Velocidad animaciones: {tone.get('animation_speed', 'smooth')}

═══ HOOK DE APERTURA ═══
Tipo: {video_context['hook']} — {hook.get('desc', '')}
Animación del hook: {hook.get('animation', '')}

═══ TÉCNICAS DE ANIMACIÓN A USAR ═══
{anim_descs}
{screenshot_instruction}

═══ CÓDIGO JSX REQUERIDO ═══
El componente MarketingVideo recibe estas props:
- siteName: string
- headline: string  
- benefits: string[]
- cta: string
- primaryColor: string
- secondaryColor: string
- screenshotUrl: string | null

Imports ya disponibles (NO los repitas):
import {{ AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Img, Sequence }} from 'remotion';

Escribí SOLO el código JSX. Comenzá directamente con los componentes helper.
Hacé el video ÉPICO, ÚNICO y POTENTE para marketing viral.
Usá las técnicas de animación especificadas. Distribuí el contenido en {len(scene_labels)} escenas bien diferenciadas.
Cada escena debe durar aproximadamente {duration // len(scene_labels)} segundos.
Asegurate que NO haya solapamiento entre escenas — usá Sequence con from y durationInFrames exactos."""

    system = REMOTION_SYSTEM_PROMPT.format(
        total_frames=total_frames,
        duration=duration,
        width=width,
        height=height,
    )

    # Groq tiene límite de tokens — necesitamos el modelo de texto largo
    result = await _groq_text_long(system + "\n\n" + prompt, max_tokens=4000)

    # Limpiar markdown si lo incluye
    result = re.sub(r"```(?:jsx|javascript|js)?", "", result)
    result = re.sub(r"```$", "", result, flags=re.MULTILINE)
    result = result.strip()

    return result


async def _groq_text_long(prompt: str, max_tokens: int = 4000) -> str:
    """Llama a Groq con modelo que soporta outputs más largos."""
    import aiohttp, os
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,  # algo de creatividad para variedad
    }
    try:
        async with aiohttp.ClientSession() as s:
            async with s.post(GROQ_URL, json=payload, headers=headers,
                              timeout=aiohttp.ClientTimeout(total=60)) as r:
                data = await r.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[jsx_generator] error: {e}")
        return ""
