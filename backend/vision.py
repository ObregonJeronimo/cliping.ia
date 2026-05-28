import base64
import json
import os
import re

import aiohttp

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemma-4-31b-it:free"

async def analyze_screenshot(screenshot_bytes: bytes, action: str, page_url: str, step: int) -> dict:
    img_b64 = base64.b64encode(screenshot_bytes).decode()

    prompt = f"""Sos un agente que navega páginas web para crear videos de marketing.

URL: {page_url}
Instrucción: {action}
Paso: {step}

Analizá el screenshot y decime qué hacer AHORA. Respondé SOLO con JSON válido:
{{
  "action": "click" | "scroll_down" | "scroll_up" | "type" | "wait" | "done",
  "selector": "texto visible del elemento o selector CSS",
  "text": "texto a escribir (solo si action es type)",
  "description": "descripción en español de lo que hacés",
  "scroll_amount": 350
}}

Reglas:
- Clickeá botones, productos, links relevantes para completar la instrucción
- Si ya completaste todo, poné action: "done"
- Usá scroll_down para ver más contenido
- Máximo 12 pasos"""

    payload = {
        "model": MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}
            ]
        }],
        "max_tokens": 300,
        "temperature": 0.1,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cliping-ia.vercel.app",
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(OPENROUTER_URL, json=payload, headers=headers,
                                timeout=aiohttp.ClientTimeout(total=30)) as resp:
            data = await resp.json()

    try:
        text = data["choices"][0]["message"]["content"]
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        print(f"Vision error: {e} — {str(data)[:200]}")
        return {"action": "scroll_down", "description": "Explorando la página", "scroll_amount": 350}


async def generate_voiceover_script(action: str, page_url: str, descriptions: list) -> str:
    domain = page_url.replace("https://", "").replace("http://", "").split("/")[0]
    steps = " → ".join(descriptions[:5]) if descriptions else action

    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "messages": [{
            "role": "user",
            "content": f"""Escribí un script de voz en off para un video de marketing. Máximo 30 palabras, español rioplatense, entusiasta y natural.

Sitio: {domain}
Acciones realizadas: {steps}

Solo el texto, sin comillas."""
        }],
        "max_tokens": 80,
        "temperature": 0.7,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(OPENROUTER_URL, json=payload, headers=headers,
                                timeout=aiohttp.ClientTimeout(total=15)) as resp:
            data = await resp.json()

    try:
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return f"Mirá qué fácil es en {domain}. Todo en segundos, sin complicaciones."
