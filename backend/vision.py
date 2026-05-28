import base64, json, os, re, asyncio
import aiohttp

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

async def analyze_screenshot(screenshot_bytes: bytes, action: str, page_url: str, step: int) -> dict:
    img_b64 = base64.b64encode(screenshot_bytes).decode()
    prompt = f"""Sos un agente de navegación web para videos de marketing.
URL: {page_url} | Instrucción: {action} | Paso: {step}
Analizá el screenshot. Respondé SOLO JSON válido sin markdown:
{{"action":"click"|"scroll_down"|"scroll_up"|"type"|"wait"|"done","selector":"texto visible del elemento","text":"texto a escribir si es type","description":"descripción en español de la acción","scroll_amount":350}}
Reglas: clickeá elementos relevantes para la instrucción, explorá con scroll, done cuando terminaste."""

    payload = {
        "model": VISION_MODEL,
        "messages": [{"role":"user","content":[
            {"type":"text","text":prompt},
            {"type":"image_url","image_url":{"url":f"data:image/jpeg;base64,{img_b64}"}}
        ]}],
        "max_tokens": 200,
        "temperature": 0.1,
    }
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}

    for attempt in range(3):
        try:
            async with aiohttp.ClientSession() as s:
                async with s.post(GROQ_URL, json=payload, headers=headers,
                                  timeout=aiohttp.ClientTimeout(total=30)) as r:
                    data = await r.json()
            print(f"[groq raw] {str(data)[:300]}")
            msg = data["choices"][0]["message"]["content"]
            # Groq devuelve content como string o como lista JSON
            if isinstance(msg, list):
                # puede ser lista de objetos de accion directamente
                result = msg[0] if msg else {}
            else:
                text = re.sub(r"```json|```","",str(msg)).strip()
                parsed = json.loads(text)
                result = parsed[0] if isinstance(parsed, list) else parsed
            print(f"[vision OK] step={step}: {result.get('action')} — {result.get('description','')}")
            return result
        except Exception as e:
            print(f"[vision fail] attempt={attempt}: {str(e)[:80]}")
            if attempt < 2:
                await asyncio.sleep(2)

    return {"action": "scroll_down", "description": "Explorando la página", "scroll_amount": 350}


async def generate_voiceover_script(action: str, page_url: str, descriptions: list) -> str:
    domain = page_url.replace("https://","").replace("http://","").split("/")[0]
    steps = " → ".join(descriptions[:5]) if descriptions else action
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "messages": [{"role":"user","content":
            f"Script voz en off marketing, max 30 palabras, español rioplatense, entusiasta.\nSitio: {domain}\nAcciones: {steps}\nSolo el texto:"}],
        "max_tokens": 80, "temperature": 0.7
    }
    try:
        async with aiohttp.ClientSession() as s:
            async with s.post(OPENROUTER_URL, json=payload, headers=headers,
                              timeout=aiohttp.ClientTimeout(total=15)) as r:
                data = await r.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return f"Mirá qué fácil es en {domain}. Todo en segundos, sin complicaciones."
