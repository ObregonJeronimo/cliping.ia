import base64, json, os, re, asyncio
import aiohttp

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

VISION_MODELS = [
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-4-scout:free",
    "qwen/qwen2.5-vl-72b-instruct:free",
]

async def _call_vision(model: str, payload: dict, headers: dict) -> dict:
    async with aiohttp.ClientSession() as s:
        async with s.post(OPENROUTER_URL, json={**payload, "model": model},
                          headers=headers, timeout=aiohttp.ClientTimeout(total=40)) as r:
            return await r.json()

async def analyze_screenshot(screenshot_bytes: bytes, action: str, page_url: str, step: int) -> dict:
    img_b64 = base64.b64encode(screenshot_bytes).decode()
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json",
               "HTTP-Referer": "https://cliping-ia.vercel.app"}
    prompt = f"""Sos un agente de navegación web para videos de marketing.
URL: {page_url} | Instrucción: {action} | Paso: {step}
Analizá el screenshot. Respondé SOLO JSON válido:
{{"action":"click"|"scroll_down"|"scroll_up"|"type"|"wait"|"done","selector":"texto o CSS del elemento","text":"texto a escribir","description":"descripción en español","scroll_amount":350}}
Reglas: clickeá elementos relevantes, scroll para explorar, done cuando terminaste."""
    payload = {"messages": [{"role":"user","content":[
        {"type":"text","text":prompt},
        {"type":"image_url","image_url":{"url":f"data:image/png;base64,{img_b64}"}}
    ]}], "max_tokens": 200, "temperature": 0.1}

    for model in VISION_MODELS:
        for attempt in range(2):
            try:
                data = await _call_vision(model, payload, headers)
                text = data["choices"][0]["message"]["content"]
                text = re.sub(r"```json|```","",text).strip()
                result = json.loads(text)
                print(f"[vision OK] {model} step={step}: {result.get('action')} — {result.get('description','')}")
                return result
            except Exception as e:
                msg = str(data)[:100] if 'data' in dir() else str(e)
                print(f"[vision fail] {model} attempt={attempt}: {msg[:80]}")
                if attempt == 0:
                    await asyncio.sleep(3)
    return {"action": "scroll_down", "description": "Explorando la página", "scroll_amount": 350}

async def generate_voiceover_script(action: str, page_url: str, descriptions: list) -> str:
    domain = page_url.replace("https://","").replace("http://","").split("/")[0]
    steps = " → ".join(descriptions[:5]) if descriptions else action
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": "meta-llama/llama-3.3-70b-instruct:free",
               "messages": [{"role":"user","content":
                   f"Script voz en off marketing, max 30 palabras, español rioplatense, entusiasta.\nSitio: {domain}\nAcciones: {steps}\nSolo el texto:"}],
               "max_tokens": 80, "temperature": 0.7}
    try:
        async with aiohttp.ClientSession() as s:
            async with s.post(OPENROUTER_URL, json=payload, headers=headers,
                              timeout=aiohttp.ClientTimeout(total=15)) as r:
                data = await r.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return f"Mirá qué fácil es en {domain}. Todo en segundos, sin complicaciones."
