"""
Claude elige qué animaciones usar y con qué contenido — devuelve JSON.
El template Remotion ejecuta esas animaciones predefinidas.
Costo: ~$0.008 por video (10x más barato que generar JSX completo).
"""
import json
import os
import re
import aiohttp
from animation_library import ANIMATION_CATALOG, get_catalog_for_claude

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


async def select_animations(video_context: dict) -> dict:
    """
    Claude analiza el producto y elige las mejores animaciones + contenido.
    Retorna JSON con la selección.
    """
    page_data = video_context["page_data"]
    site_name    = page_data.get("siteName", "Mi Sitio")
    headline     = page_data.get("headline", "")
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
    narrative    = video_context.get("narrative", "features")
    tone         = video_context.get("tone", "enthusiastic")
    visual_style = video_context.get("visual_style", "dark_premium")

    catalog = get_catalog_for_claude()

    prompt = f"""Sos un director creativo de motion graphics. Analizá este producto y elegí las mejores animaciones para su video de marketing.

PRODUCTO:
- Nombre: {site_name}
- Tipo: {page_type}
- Headline: {headline}
- Problema que resuelve: {problem}
- Audiencia: {audience}
- Beneficios: {json.dumps(benefits[:4], ensure_ascii=False)}
- Features: {json.dumps(features[:3], ensure_ascii=False)}
- CTA: {cta}
- Garantía: {guarantee}
- Números/stats: {json.dumps(numbers, ensure_ascii=False)}
- Color primario: {primary}
- Color secundario: {secondary}
- Emoción objetivo: {emotion}

DIRECCIÓN CREATIVA:
- Estilo visual: {visual_style}
- Narrativa: {narrative}
- Tono: {tone}

{catalog}

Respondé SOLO con JSON válido con esta estructura exacta:
{{
  "hook": {{
    "animation": "nombre_de_animacion",
    "params": {{
      // parámetros específicos de esa animación con contenido real del producto
    }}
  }},
  "product": {{
    "animation": "nombre_de_animacion", 
    "params": {{}}
  }},
  "benefits": {{
    "animation": "nombre_de_animacion",
    "params": {{}}
  }},
  "cta": {{
    "animation": "nombre_de_animacion",
    "params": {{}}
  }},
  "outro": {{
    "animation": "nombre_de_animacion",
    "params": {{}}
  }},
  "reasoning": "breve explicación de por qué elegiste estas animaciones para este producto"
}}

REGLAS:
- Elegí animaciones que hagan sentido para {page_type} con tono {tone}
- Los params deben tener contenido REAL del producto (no placeholders)
- Para stats/numbers, usá los números reales si existen, sino inventá valores verosímiles
- Para steps/flow, creá pasos reales del proceso del producto
- Para before/after, usá el problema real vs la solución
- El contenido en params va en español, usando la información real del producto"""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": "claude-sonnet-4-5",
        "max_tokens": 1500,
        "messages": [{"role": "user", "content": prompt}],
    }

    print(f"[jsx_generator] Claude eligiendo animaciones...")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            ANTHROPIC_URL, headers=headers, json=payload,
            timeout=aiohttp.ClientTimeout(total=60),
        ) as resp:
            data = await resp.json()

    if resp.status != 200:
        print(f"[jsx_generator] error HTTP {resp.status}: {data}")
        return None

    try:
        raw = data["content"][0]["text"].strip()
        raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        result = json.loads(raw)
        print(f"[jsx_generator] animaciones elegidas:")
        for scene, choice in result.items():
            if scene != "reasoning" and isinstance(choice, dict):
                anim = choice.get("animation")
                params_keys = list(choice.get("params", {}).keys())
                print(f"  {scene:10}: {anim} | params={params_keys}")
        print(f"  reasoning: {result.get('reasoning','')[:100]}")

        # Guardar JSON completo para debug
        import json as _json
        from pathlib import Path as _Path
        debug_dir = _Path("debug_reports")
        debug_dir.mkdir(exist_ok=True)
        debug_file = debug_dir / "last_animation_selection.json"
        debug_file.write_text(_json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[jsx_generator] selección completa → {debug_file}")
        return result
    except Exception as e:
        print(f"[jsx_generator] parse error: {e} — {data}")
        return None


def get_default_selection(page_data: dict) -> dict:
    """Selección por defecto si Claude falla."""
    return {
        "hook": {"animation": "reveal_swipe", "params": {
            "headline": page_data.get("headline", ""),
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
        }},
        "product": {"animation": "iphone_rise", "params": {
            "screenshotUrl": None,
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
        }},
        "benefits": {"animation": "benefit_cards_stagger", "params": {
            "benefits": page_data.get("benefits", []),
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
        }},
        "cta": {"animation": "liquid_button_cta", "params": {
            "cta": page_data.get("cta", "Empezá gratis"),
            "subtext": "Transformá tu negocio hoy",
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
            "guarantee": page_data.get("guarantee", ""),
        }},
        "outro": {"animation": "orbit_logo", "params": {
            "siteName": page_data.get("siteName", ""),
            "primaryColor": page_data.get("primaryColor", "#6366f1"),
            "secondaryColor": page_data.get("secondaryColor", "#818cf8"),
        }},
        "reasoning": "Selección por defecto",
    }
