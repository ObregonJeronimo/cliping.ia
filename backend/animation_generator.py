"""
Generador de animaciones nuevas por rubro.
Claude investiga el rubro, diseña animaciones JSX específicas,
las valida y las agrega permanentemente a la biblioteca.
"""
import json
import os
import asyncio
import subprocess
import tempfile
import aiohttp
from pathlib import Path

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

GENERATED_DIR = Path("industry_animations")
GENERATED_DIR.mkdir(exist_ok=True)

# Sistema de prompt para generar animaciones JSX
SYSTEM_PROMPT = """Sos un experto en motion graphics y React/Remotion.
Tu tarea es diseñar e implementar animaciones JSX específicas para un rubro de negocio.

REGLAS CRÍTICAS del código JSX que generás:
1. Usás SOLO estas funciones/variables disponibles globalmente:
   - lerp(frame, a, b, from, to) — interpolación linear con clamp
   - spr(frame, fps, delay, damping, stiffness) — spring animation
   - hex2rgb(hex) — convierte "#rrggbb" a "r,g,b"
   - isDarkBg(bg) — retorna true si el bg es oscuro
   - AbsoluteFill, Img, Sequence — de remotion (ya importados)
   - useCurrentFrame, useVideoConfig — de remotion (ya importados)
   - Particles({frame, color, count}) — componente compartido
   - RadialGlow({color, opacity, size}) — componente compartido
   - DarkScene({color, children, bg}) — wrapper de escena con fondo
   - Label({children, color, style}) — texto etiqueta uppercase
   - Headline({children, size, color, style}) — texto headline grande
   - GlowLine({color, progress, width}) — línea con glow animada
   
   NUNCA uses isDarkBg sin importar — ya está disponible globalmente
   NUNCA uses variables no declaradas — solo las de esta lista

2. Cada animación recibe EXACTAMENTE estos props: { frame, fps, primaryColor, bg, ...otrosProps }
3. NUNCA uses: useState, useEffect, hooks de React, setTimeout, fetch, imports externos
4. Todo el movimiento se basa en `frame` (número de frame actual)
5. Timings: hook=120 frames(4s), benefits=300 frames(10s), cta=210 frames(7s), outro=120 frames(4s)
6. El texto debe aparecer lo suficientemente LENTO para que se lea (mínimo 2s en pantalla)
7. Usás `bg` como fondo de la escena, nunca hardcodeás negro
8. Los tamaños están en px para un viewport de 390px de ancho
9. La función se llama exactamente como indicás en el JSON de respuesta"""


async def generate_industry_animations(
    industry_key: str,
    industry_name: str, 
    page_data: dict,
    num_animations: int = 4,
) -> list[dict]:
    """
    Genera animaciones JSX nuevas para un rubro específico.
    Retorna lista de {name, scene, code, description} validadas.
    """
    if not ANTHROPIC_API_KEY:
        return []

    audience = page_data.get("audience", "")
    emotion = page_data.get("emotion", "confianza")
    page_type = page_data.get("pageType", "")
    benefits = page_data.get("benefits", [])

    prompt = f"""Necesito {num_animations} animaciones JSX únicas y profesionales para el rubro: "{industry_name}".

CONTEXTO DEL NEGOCIO:
- Audiencia: {audience}
- Emoción objetivo: {emotion}
- Tipo: {page_type}
- Beneficios del producto: {benefits[:3]}

INVESTIGACIÓN DEL RUBRO "{industry_name}":
Pensá en qué elementos visuales, movimientos y metáforas conectan emocionalmente con este rubro.
Por ejemplo:
- Dietética/natural → agua fluyendo, hojas cayendo, partículas orgánicas, crecimiento
- Consultorio médico → latidos de corazón, precisión quirúrgica, líneas limpias
- Restaurant → vapor, platos revelándose, colores cálidos
- Gym/fitness → energía, impacto, movimiento intenso

Diseñá {num_animations} animaciones COMPLETAMENTE DISTINTAS entre sí, que nadie más tenga.
Distribuílas entre las escenas: hook, benefits, cta, outro.

Para cada animación, respondé con un objeto JSON:
{{
  "name": "nombre_en_snake_case_único",
  "scene": "hook|benefits|cta|outro",
  "description": "qué hace y por qué conecta con {industry_name} en 1 oración",
  "params": ["lista", "de", "props", "además de frame,fps,primaryColor,bg"],
  "jsx_code": "EL CÓDIGO JSX COMPLETO DE LA FUNCIÓN — function NombreAnimacion({{ frame, fps, primaryColor, bg, ...props }}) {{ ... }}"
}}

Respondé SOLO con un array JSON válido de {num_animations} objetos. Sin markdown, sin explicaciones extra.

REGLAS DEL JSX:
- El timing debe ser LENTO: texto visible mínimo 2 segundos (60 frames)
- Usá lerp() y spr() para todas las animaciones, nunca CSS transitions
- El fondo siempre usa la variable `bg` recibida como prop
- Fuentes: fontFamily: 'system-ui, sans-serif'
- Partículas y efectos sutiles para no competir con el texto
- El texto principal debe tener opacity final de 1.0, nunca menos
- Los tamaños de fuente entre 14px y 72px para 390px de viewport"""

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": "claude-sonnet-4-5",
        "max_tokens": 8000,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": prompt}],
    }

    print(f"[anim_gen] Generando {num_animations} animaciones para rubro '{industry_name}'...")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                ANTHROPIC_URL, headers=headers, json=payload,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as resp:
                data = await resp.json()
    except Exception as e:
        print(f"[anim_gen] Error HTTP: {e}")
        return []

    raw = data.get("content", [{}])[0].get("text", "")

    # Parsear JSON
    try:
        # Limpiar posibles backticks
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        animations = json.loads(clean.strip())
        print(f"[anim_gen] {len(animations)} animaciones generadas por Claude")
    except Exception as e:
        print(f"[anim_gen] Error parseando JSON: {e}")
        print(f"[anim_gen] Raw: {raw[:300]}")
        return []

    # Validar cada animación
    validated = []
    for anim in animations:
        name = anim.get("name", "")
        code = anim.get("jsx_code", "")
        scene = anim.get("scene", "")

        if not name or not code or not scene:
            print(f"[anim_gen] Animación inválida (campos faltantes): {name}")
            continue

        # Validar que el código es JSX válido básicamente
        if f"function " not in code:
            print(f"[anim_gen] '{name}' no contiene función JSX")
            continue

        # Verificar que no usa imports prohibidos
        forbidden = ["useState", "useEffect", "import ", "require(", "fetch(", "axios"]
        has_forbidden = any(f in code for f in forbidden)
        if has_forbidden:
            print(f"[anim_gen] '{name}' usa sintaxis prohibida")
            continue

        print(f"[anim_gen] ✓ '{name}' ({scene}) — {anim.get('description','')[:60]}")
        validated.append({
            "name": name,
            "scene": scene,
            "description": anim.get("description", ""),
            "params": anim.get("params", []),
            "jsx_code": code,
            "industry": industry_key,
        })

    return validated


def save_industry_animations(industry_key: str, animations: list[dict]) -> Path:
    """Guarda las animaciones generadas en un archivo JSX del rubro."""
    output_file = GENERATED_DIR / f"{industry_key}_animations.jsx"

    # Leer existentes si hay
    existing_names = set()
    existing_code = ""
    if output_file.exists():
        existing_content = output_file.read_text(encoding="utf-8")
        existing_code = existing_content
        import re
        existing_names = set(re.findall(r'function (\w+)\(', existing_content))

    # Agregar nuevas (sin duplicar)
    new_code_parts = []
    new_names = []
    for anim in animations:
        fn_name = _extract_function_name(anim["jsx_code"])
        if fn_name and fn_name not in existing_names:
            new_code_parts.append(f"\n// {anim['description']}\n// Rubro: {industry_key} | Escena: {anim['scene']}\n{anim['jsx_code']}\n")
            new_names.append((anim["name"], fn_name, anim["scene"]))
            existing_names.add(fn_name)

    if not new_code_parts:
        print(f"[anim_gen] No hay animaciones nuevas para agregar")
        return output_file

    # Escribir archivo
    header = f"// Animaciones generadas para rubro: {industry_key}\n// Usán helpers globales del MarketingVideo.jsx\n\n"
    full_content = (existing_code or header) + "\n".join(new_code_parts)
    output_file.write_text(full_content, encoding="utf-8")

    print(f"[anim_gen] Guardadas en {output_file}: {[n[0] for n in new_names]}")
    return output_file


def _extract_function_name(jsx_code: str) -> str:
    """Extrae el nombre de la función JSX."""
    import re
    m = re.search(r'function\s+(\w+)\s*\(', jsx_code)
    return m.group(1) if m else ""


def get_industry_function_map(industry_key: str) -> dict:
    """
    Lee el archivo de animaciones del rubro y retorna un mapa
    {animation_name: function_name} para usar en el ANIM_MAP.
    """
    jsx_file = GENERATED_DIR / f"{industry_key}_animations.jsx"
    if not jsx_file.exists():
        return {}

    import re
    content = jsx_file.read_text(encoding="utf-8")
    # Buscar comentarios de rubro para extraer name→function_name
    result = {}
    blocks = re.split(r'\n// Rubro:', content)
    for block in blocks[1:]:
        lines = block.strip().split("\n")
        fn_match = re.search(r'function\s+(\w+)\s*\(', block)
        if fn_match:
            fn_name = fn_match.group(1)
            # El name en snake_case lo derivamos del fn_name
            snake = re.sub(r'(?<!^)(?=[A-Z])', '_', fn_name).lower()
            result[snake] = fn_name
    return result
