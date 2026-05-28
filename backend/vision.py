"""
Vision agent usando Gemini 2.0 Flash para analizar screenshots
y decidir qué acciones tomar en la página.
"""
import base64
import json
import os
import re
from pathlib import Path

import aiohttp

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

async def analyze_screenshot(screenshot_bytes: bytes, action: str, page_url: str, step: int) -> dict:
    """
    Manda un screenshot a Gemini y recibe instrucciones de qué hacer.
    Retorna: { "action": "click|scroll|type|wait|done", "selector": "...", "text": "...", "description": "..." }
    """
    img_b64 = base64.b64encode(screenshot_bytes).decode()

    prompt = f"""Sos un agente que navega páginas web para crear videos de marketing.

URL actual: {page_url}
Instrucción del usuario: {action}
Paso actual: {step}

Analizá el screenshot y decime exactamente qué hacer AHORA para avanzar hacia completar la instrucción.

Respondé SOLO con un JSON válido, sin markdown, sin explicaciones:
{{
  "action": "click" | "scroll_down" | "scroll_up" | "type" | "wait" | "done",
  "selector": "selector CSS o texto del elemento a clickear (si action es click o type)",
  "text": "texto a escribir (solo si action es type)",
  "description": "descripción en español de lo que estás haciendo (para la voz en off)",
  "scroll_amount": 400
}}

Reglas:
- Si ves un botón "Agregar al carrito" o similar, clickealo
- Si ves un formulario para completar, completá los campos uno a uno
- Si ya completaste todo lo pedido, poné action: "done"
- Describí cada acción de forma natural para marketing (ej: "Agregando el producto al carrito")
- Si no sabés qué hacer, usá scroll_down para ver más contenido
- Máximo 15 pasos para completar la tarea
"""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/png", "data": img_b64}}
            ]
        }],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 512}
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json=payload,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as resp:
            data = await resp.json()

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        # limpiar posible markdown
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini parse error: {e} — data: {data}")
        return {"action": "scroll_down", "description": "Analizando la página", "scroll_amount": 400}


async def generate_voiceover_script(action: str, page_url: str, descriptions: list[str]) -> str:
    """
    Genera un script natural para la voz en off basado en las acciones realizadas.
    """
    domain = page_url.replace("https://", "").replace("http://", "").split("/")[0]
    steps_text = " → ".join(descriptions[:6]) if descriptions else action

    prompt = f"""Escribí un script corto y natural para la voz en off de un video de marketing.

Sitio: {domain}
Lo que hizo el agente: {steps_text}

El script debe:
- Durar máximo 15 segundos (unas 35 palabras)
- Sonar entusiasta y natural, no robótico
- Destacar lo fácil que es usar el sitio
- Estar en español rioplatense (Argentina)
- NO mencionar "IA" ni "agente"

Respondé SOLO con el texto del script, sin comillas ni explicaciones."""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 100}
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json=payload,
            timeout=aiohttp.ClientTimeout(total=15)
        ) as resp:
            data = await resp.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return f"Mirá qué fácil es en {domain}. Todo en segundos, sin complicaciones."
