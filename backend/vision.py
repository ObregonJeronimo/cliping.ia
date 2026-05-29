import base64, json, os, re, asyncio
import aiohttp

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
TEXT_MODEL = "llama-3.3-70b-versatile"


def _img(screenshot_bytes: bytes) -> dict:
    b64 = base64.b64encode(screenshot_bytes).decode()
    return {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}


async def _groq_vision(messages: list, max_tokens: int = 400) -> str:
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": VISION_MODEL, "messages": messages, "max_tokens": max_tokens, "temperature": 0.1}
    for attempt in range(3):
        try:
            async with aiohttp.ClientSession() as s:
                async with s.post(GROQ_URL, json=payload, headers=headers,
                                  timeout=aiohttp.ClientTimeout(total=35)) as r:
                    data = await r.json()
            msg = data["choices"][0]["message"]["content"]
            if isinstance(msg, list):
                # puede ser lista — tomar primer texto
                for item in msg:
                    if isinstance(item, dict) and item.get("type") == "text":
                        return item["text"]
                return str(msg[0])
            return str(msg)
        except Exception as e:
            print(f"[groq vision] attempt={attempt}: {str(e)[:60]}")
            if attempt < 2:
                await asyncio.sleep(3)
    return "{}"


async def _groq_text(prompt: str, max_tokens: int = 200) -> str:
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": TEXT_MODEL, "messages": [{"role": "user", "content": prompt}],
               "max_tokens": max_tokens, "temperature": 0.3}
    try:
        async with aiohttp.ClientSession() as s:
            async with s.post(GROQ_URL, json=payload, headers=headers,
                              timeout=aiohttp.ClientTimeout(total=20)) as r:
                data = await r.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[groq text] {e}")
        return ""


def _parse_json(text: str) -> dict | list:
    text = re.sub(r"```json|```", "", text).strip()
    # si hay multiples JSONs, tomar el primero
    try:
        return json.loads(text)
    except Exception:
        # intentar extraer JSON con regex
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
        return {}


async def analyze_page(screenshot_bytes: bytes, url: str, user_action: str) -> dict:
    """
    Analiza la página y crea un plan de accion detallado.
    Retorna: { page_type, plan, steps: [{goal, action_type}] }
    """
    prompt = f"""Analizá esta página web y creá un plan detallado para grabar un video de marketing.

URL: {url}
Instrucción del usuario: {user_action}

Respondé SOLO con JSON válido:
{{
  "page_type": "landing" | "ecommerce" | "saas" | "portfolio" | "blog" | "otro",
  "page_summary": "descripción breve de qué hace la página",
  "plan": "descripción del recorrido que vas a hacer para el video",
  "steps": [
    {{"goal": "descripción del objetivo de este paso", "action_type": "scroll_down|scroll_up|click|wait|scroll_to_top"}}
  ]
}}

Creá entre 8 y 12 pasos que muestren la página de forma atractiva para marketing.
Para landing pages: mostrar el hero, scrollear por las secciones, mostrar beneficios, CTA.
Para ecommerce: mostrar productos, agregar al carrito, ir al carrito.
Para SaaS: mostrar features, pricing, demo si hay."""

    raw = await _groq_vision([{"role": "user", "content": [
        {"type": "text", "text": prompt},
        _img(screenshot_bytes)
    ]}], max_tokens=600)

    print(f"[analyze] raw: {raw[:200]}")
    result = _parse_json(raw)
    if not result or "steps" not in result:
        # fallback generico
        result = {
            "page_type": "landing",
            "plan": "Mostrar la pagina de forma atractiva",
            "steps": [
                {"goal": "Mostrar el inicio de la pagina", "action_type": "wait"},
                {"goal": "Scrollear para ver mas contenido", "action_type": "scroll_down"},
                {"goal": "Continuar explorando", "action_type": "scroll_down"},
                {"goal": "Ver mas secciones", "action_type": "scroll_down"},
                {"goal": "Volver arriba", "action_type": "scroll_to_top"},
            ]
        }
    return result


async def execute_step(screenshot_bytes: bytes, step: dict, url: str) -> dict:
    """
    Ejecuta un paso especifico. Si es click, devuelve coordenadas x,y.
    """
    goal = step.get("goal", "")
    action_type = step.get("action_type", "scroll_down")

    if action_type in ("scroll_down", "scroll_up", "scroll_to_top", "wait"):
        amounts = {"scroll_down": 380, "scroll_up": 380}
        return {
            "action": action_type,
            "description": goal,
            "scroll_amount": amounts.get(action_type, 380)
        }

    # para clicks: pedir coordenadas exactas
    prompt = f"""Objetivo: {goal}

Mirá el screenshot. Necesito las coordenadas exactas (x, y en pixels) del elemento que hay que clickear para lograr el objetivo.

El viewport es 390x844 pixels.

Respondé SOLO con JSON:
{{"action": "click", "x": 195, "y": 400, "description": "{goal}"}}

Si no hay nada clickeable para este objetivo, respondé:
{{"action": "scroll_down", "description": "{goal}", "scroll_amount": 380}}"""

    raw = await _groq_vision([{"role": "user", "content": [
        {"type": "text", "text": prompt},
        _img(screenshot_bytes)
    ]}], max_tokens=150)

    result = _parse_json(raw)
    if isinstance(result, list):
        result = result[0] if result else {}
    if not result:
        result = {"action": "scroll_down", "description": goal, "scroll_amount": 380}

    result["description"] = goal
    print(f"[execute] {result.get('action')} x={result.get('x')} y={result.get('y')} — {goal}")
    return result


async def generate_voiceover_script(action: str, url: str, descriptions: list, page_analysis: dict, duration: float = 30.0) -> str:
    domain = url.replace("https://","").replace("http://","").split("/")[0]
    page_type = page_analysis.get("page_type", "")
    summary = page_analysis.get("page_summary", "")
    steps_done = " → ".join(descriptions[:8]) if descriptions else action
    # locutor profesional habla ~2.3 palabras por segundo
    target_words = max(25, int(duration * 2.3))

    prompt = f"""Escribí un script de voz en off para un video de marketing de {int(duration)} segundos.

Sitio: {domain}
Tipo: {page_type}
Descripción: {summary}
Secciones mostradas: {steps_done}

Requisitos ESTRICTOS:
- Entre {target_words - 8} y {target_words + 8} palabras (el video dura {int(duration)} segundos)
- Tono de locutor profesional, cálido y confiable — no un bot
- Español rioplatense natural
- Mencioná el nombre del producto o sitio
- Destacá 2-3 beneficios concretos que viste en la página
- Terminá con una llamada a la acción clara
- No uses signos de exclamación excesivos
- No menciones "IA" ni "agente"

Escribí SOLO el texto del script, sin títulos ni comillas."""

    result = await _groq_text(prompt, max_tokens=300)
    if not result:
        result = f"Conocé {domain}, la herramienta que simplifica tu trabajo. Gestioná todo desde un solo lugar, de forma rápida y segura. Probalo hoy."
    return result
