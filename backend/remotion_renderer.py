"""
Renderiza videos animados con Remotion.
Claude genera JSX épico y único. Si falla, usa template sólido como fallback.
"""
import asyncio
import base64
import json
import os
import re
from pathlib import Path

from vision import _groq_vision, _parse_json, _img
from variations import build_video_context
from jsx_generator import select_animations, get_default_selection
from animation_cache import get_cached, save_cache
from industry_animator import get_industry_key, get_industry_animations, needs_new_animations, get_used_animations
from animation_generator import generate_industry_animations, save_industry_animations, get_industry_function_map
from jsx_injector import inject_animations

OUTPUTS_DIR = Path("outputs")
REMOTION_DIR = Path(__file__).parent.parent / "remotion"
TEMPLATE_PATH = REMOTION_DIR / "src" / "compositions" / "MarketingVideo.jsx"


# ── Paletas predefinidas por tipo de negocio ────────────────────────────────
BG_PALETTES = {
    "health":     "linear-gradient(145deg, #050e05 0%, #0a1a0a 55%, #06100a 100%)",
    "fintech":    "linear-gradient(145deg, #04080f 0%, #080f1e 55%, #050810 100%)",
    "saas":       "linear-gradient(145deg, #08060f 0%, #0f0b1e 55%, #08060f 100%)",
    "ecommerce":  "linear-gradient(160deg, #080810 0%, #0f0f1a 55%, #08080e 100%)",
    "restaurant": "linear-gradient(145deg, #0a0500 0%, #160b00 55%, #0d0600 100%)",
    "agency":     "linear-gradient(145deg, #0a0608 0%, #1a0a10 55%, #0a0608 100%)",
    "startup":    "linear-gradient(135deg, #040410 0%, #080516 55%, #040410 100%)",
    "generic":    "linear-gradient(145deg, #070710 0%, #0d0d1a 55%, #07070e 100%)",
}

def get_bg_for_site(page_data: dict, industry_key: str) -> str:
    """Elige fondo basado en industria + color primario del sitio."""
    primary = page_data.get("primaryColor", "#6366f1")
    h = primary.lstrip("#")
    try:
        r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
        # Generar tonos oscuros del color real del sitio
        d1 = f"#{max(0,r//16):02x}{max(0,g//16):02x}{max(0,b//16):02x}"
        d2 = f"#{max(0,r//10):02x}{max(0,g//10):02x}{max(0,b//10):02x}"
        d3 = f"#{max(0,r//14):02x}{max(0,g//14):02x}{max(0,b//14):02x}"
        base = BG_PALETTES.get(industry_key, BG_PALETTES["generic"])
        # Mezclar: usar el gradiente de industria como base pero teñido con color del sitio
        return f"linear-gradient(145deg, {d1} 0%, {d2} 55%, {d3} 100%)"
    except:
        return BG_PALETTES.get(industry_key, BG_PALETTES["generic"])


# ── Extractor HTML + Vision ─────────────────────────────────────────────────
async def extract_html_data(url: str) -> dict:
    """Extrae datos estructurados del HTML real de la página — sin depender de visión."""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; cliping-bot/1.0)"}
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                html = await resp.text(errors="ignore")

        # Extraer datos estructurados
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        data = {}

        # Título
        title_tag = soup.find("title")
        data["title"] = title_tag.get_text(strip=True) if title_tag else ""

        # Meta description
        meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        data["description"] = meta_desc.get("content", "") if meta_desc else ""

        # OG title
        og_title = soup.find("meta", attrs={"property": "og:title"})
        data["og_title"] = og_title.get("content", "") if og_title else ""

        # Headings — H1, H2
        h1s = [h.get_text(strip=True) for h in soup.find_all("h1")]
        h2s = [h.get_text(strip=True) for h in soup.find_all("h2")]
        data["h1"] = h1s[:3]
        data["h2"] = h2s[:6]

        # Párrafos descriptivos (>40 chars)
        paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 40]
        data["paragraphs"] = paragraphs[:5]

        # Botones / CTAs
        buttons = []
        for btn in soup.find_all(["button", "a"]):
            text = btn.get_text(strip=True)
            if text and 3 < len(text) < 40 and not text.startswith("http"):
                buttons.append(text)
        data["buttons"] = list(dict.fromkeys(buttons))[:8]  # deduplicar

        # Números explícitos en el HTML (ej: +600, 24h, 3 años)
        import re as _re
        all_text = soup.get_text(separator=" ")
        number_patterns = _re.findall(r'[+\-]?\d+[\.,]?\d*\s*(?:hs?|años?|días?|meses?|productos?|clientes?|usuarios?|%|x\d+)?', all_text)
        # Filtrar los relevantes (no precios de productos)
        meaningful_numbers = []
        for n in number_patterns:
            n = n.strip()
            if len(n) > 1 and any(c.isdigit() for c in n):
                # Excluir si parece precio ($ seguido de muchos dígitos)
                if not _re.match(r'^\$?\d{4,}', n):
                    meaningful_numbers.append(n)
        data["numbers_raw"] = list(dict.fromkeys(meaningful_numbers))[:10]

        # Listas de features/benefits
        list_items = [li.get_text(strip=True) for li in soup.find_all("li") if 10 < len(li.get_text(strip=True)) < 100]
        data["list_items"] = list_items[:10]

        # Colores del CSS inline y estilos
        style_tags = soup.find_all("style")
        css_text = " ".join([s.get_text() for s in style_tags])
        colors_in_css = _re.findall(r'#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}', css_text)
        data["css_colors"] = list(dict.fromkeys(colors_in_css))[:15]

        print(f"[html_extract] OK — h1={data['h1'][:1]}, buttons={data['buttons'][:3]}, numbers={data['numbers_raw'][:4]}")
        return data

    except ImportError:
        print("[html_extract] BeautifulSoup no disponible — solo visión")
        return {}
    except Exception as e:
        print(f"[html_extract] Error: {e}")
        return {}


async def extract_page_data_deep(screenshot_bytes: bytes, url: str, action: str) -> dict:
    """Extracción profunda: HTML real + visión combinados."""
    domain = url.replace("https://", "").replace("http://", "").split("/")[0]

    # 1. Extraer datos del HTML real
    html_data = await extract_html_data(url)

    # 2. Construir contexto HTML para el prompt de visión
    html_context = ""
    if html_data:
        html_context = f"""
DATOS REALES DEL HTML DE LA PÁGINA (úsalos como fuente de verdad — son exactos):
- Título: {html_data.get('title', '')}
- Descripción meta: {html_data.get('description', '')}
- H1s: {html_data.get('h1', [])}
- H2s: {html_data.get('h2', [])[:4]}
- Párrafos: {html_data.get('paragraphs', [])[:3]}
- Botones/CTAs: {html_data.get('buttons', [])}
- Números en el HTML: {html_data.get('numbers_raw', [])}
- Items de listas: {html_data.get('list_items', [])[:6]}
- Colores en CSS: {html_data.get('css_colors', [])[:8]}
"""

    prompt = f"""Analizá este screenshot de {url} combinado con los datos HTML reales para extraer información de marketing.

{html_context}

INSTRUCCIONES CRÍTICAS:
1. Los datos del HTML son la FUENTE DE VERDAD — no inventes datos que no aparezcan ahí
2. Para números: usá SOLO los que aparecen en "Números en el HTML" — NO inventes estadísticas
3. Para beneficios: extraé de los H2s, párrafos y listas — no inventes
4. Para colores: usá los colores del CSS si están disponibles
5. Para el CTA: usá el texto exacto del botón principal de los botones listados

Respondé SOLO con JSON válido:
{{
  "siteName": "nombre exacto (max 2 palabras, del título/H1)",
  "headline": "titular principal EXACTO del H1",
  "subheadline": "subtítulo del párrafo o H2 más cercano al H1",
  "benefits": ["beneficio 1 extraído del HTML", "beneficio 2", "beneficio 3", "beneficio 4"],
  "features": ["feature 1 del HTML", "feature 2", "feature 3"],
  "cta": "texto EXACTO del botón principal de los CTAs listados",
  "problem": "el problema que resuelve — inferido del contenido real",
  "audience": "audiencia específica según el contenido (ej: 'vecinos de Villa Allende', 'médicos')",
  "pageType": "saas|ecommerce|landing|portfolio|agency|startup",
  "primaryColor": "color vibrante del logo/botones del CSS — NUNCA gris o negro",
  "secondaryColor": "color complementario del CSS",
  "bgColor": "color de fondo real de la página",
  "textColor": "color del texto principal",
  "isDark": false,
  "numbers": ["SOLO estadísticas de marketing de los números del HTML: ej '+600 Productos', '24h', '+3 años'"],
  "guarantee": "garantía si hay",
  "emotion": "confianza|urgencia|aspiración|alivio|entusiasmo",
  "value_prop": "propuesta de valor en una frase (del contenido real)",
  "logoText": "texto del logo si se puede leer",
  "zone": "zona geográfica si la hay (ej: Villa Allende, Córdoba)",
  "contact": "WhatsApp/email/teléfono si hay",
  "social": "redes sociales mencionadas"
}}

isDark: true solo si el fondo del CSS es oscuro"""

    raw = await _groq_vision([{
        "role": "user",
        "content": [{"type": "text", "text": prompt}, _img(screenshot_bytes)]
    }], max_tokens=700)

    data = _parse_json(raw)
    if isinstance(data, list):
        data = data[0] if data else {}

    if not data or "siteName" not in data:
        data = {
            "siteName": domain.split(".")[0].capitalize(),
            "headline": html_data.get("h1", ["La solución que necesitás"])[0] if html_data else "La solución que necesitás",
            "subheadline": "",
            "benefits": html_data.get("list_items", ["Fácil de usar", "Ahorrá tiempo", "Resultados reales"])[:4],
            "features": [],
            "cta": html_data.get("buttons", ["Empezá gratis"])[0] if html_data else "Empezá gratis",
            "problem": "El proceso actual es lento",
            "audience": "personas",
            "pageType": "landing",
            "primaryColor": "#6366f1",
            "secondaryColor": "#818cf8",
            "numbers": html_data.get("numbers_raw", [])[:4] if html_data else [],
            "guarantee": "",
            "emotion": "confianza",
            "value_prop": "La mejor solución",
        }

    # Override con datos del HTML cuando son más confiables
    if html_data:
        # H1 real tiene prioridad sobre lo que vio la visión
        if html_data.get("h1"):
            data["headline"] = html_data["h1"][0]
        # Botones reales
        if html_data.get("buttons"):
            # Tomar el primer botón que no sea "Iniciar sesión" o similar
            skip = {"iniciar sesión", "login", "ingresar", "registrarse", "cerrar sesión", "mi perfil"}
            for btn in html_data["buttons"]:
                if btn.lower() not in skip:
                    data["cta"] = btn
                    break
        # Números reales del HTML (filtrar precios)
        if html_data.get("numbers_raw"):
            data["numbers"] = [n for n in html_data["numbers_raw"]
                               if not re.match(r'^\$?\d{4,}', n.strip())][:5]

    # Validar color primario
    def is_boring_color(hex_color: str) -> bool:
        if not hex_color or not hex_color.startswith("#"):
            return True
        h = hex_color.lstrip("#")
        if len(h) == 3: h = "".join(c*2 for c in h)
        if len(h) != 6: return True
        try:
            r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
            max_c, min_c = max(r,g,b), min(r,g,b)
            sat = (max_c - min_c) / max_c if max_c > 0 else 0
            bri = max_c / 255
            return sat < 0.12 or bri < 0.12 or (bri > 0.96 and sat < 0.05)
        except: return True

    # Si el CSS tiene colores, intentar extraer el mejor
    if html_data and html_data.get("css_colors") and is_boring_color(data.get("primaryColor", "")):
        for c in html_data["css_colors"]:
            if not is_boring_color(c):
                data["primaryColor"] = c
                break

    if is_boring_color(data.get("primaryColor", "")):
        data["primaryColor"] = "#f59e0b"
    if is_boring_color(data.get("secondaryColor", "")):
        data["secondaryColor"] = "#6366f1"

    print(f"[renderer] {data.get('siteName')} | {data.get('pageType')} | {data.get('emotion')} | {data.get('primaryColor')}")
    print(f"[renderer] headline: {data.get('headline','')[:70]}")
    print(f"[renderer] numbers: {data.get('numbers', [])}")
    print(f"[renderer] zone: {data.get('zone', '')} | cta: {data.get('cta', '')}")
    return data


async def render_video(
    page_data: dict,
    screenshot_path: Path,
    job_id: str,
    params: dict = None,
    debugger = None,
) -> Path:
    """Genera JSX con Claude y renderiza con Remotion."""

    if params is None:
        params = {"mode": "simple", "duration": 30, "format": "reel"}

    output_path = OUTPUTS_DIR / f"{job_id}_remotion.mp4"

    # Screenshot a base64
    screenshot_b64 = None
    if screenshot_path and screenshot_path.exists():
        b64 = base64.b64encode(screenshot_path.read_bytes()).decode()
        screenshot_b64 = f"data:image/png;base64,{b64}"

    # Industria
    industry_key = get_industry_key(page_data.get("pageType",""), page_data.get("audience",""))
    industry_anims = get_industry_animations(industry_key)
    needs_new, reason = needs_new_animations(industry_key)
    used_in_industry = get_used_animations(industry_key)
    print(f"[industry] rubro='{industry_key}' | animaciones={len(industry_anims)} | {reason}")
    if debugger: debugger.log("industry", f"rubro={industry_key} | {reason}", {"needs_new": needs_new, "available": len(industry_anims)})

    if needs_new and os.environ.get("ANTHROPIC_API_KEY"):
        industry_name = {
            "health": "dietética/salud/natural", "saas": "software SaaS/productividad",
            "fintech": "finanzas/pagos/fintech", "ecommerce": "comercio electrónico/retail",
            "restaurant": "gastronomía/restaurant", "agency": "agencia creativa/marketing",
            "startup": "startup/innovación tecnológica", "landing": "landing page/captación",
            "portfolio": "portfolio/personal brand", "generic": "negocio general",
        }.get(industry_key, industry_key)
        try:
            new_anims = await generate_industry_animations(
                industry_key=industry_key, industry_name=industry_name,
                page_data=page_data, num_animations=4,
            )
            if new_anims:
                save_industry_animations(industry_key, new_anims)
                ok, injected = inject_animations(industry_key, new_anims)
                if ok and injected:
                    print(f"[renderer] ✓ {len(injected)} animaciones inyectadas al JSX: {injected}")
                    if debugger: debugger.log("anim_gen", f"{len(injected)} animaciones nuevas inyectadas para {industry_key}", {"names": injected}, level="ok")
        except Exception as e:
            print(f"[renderer] Error generando animaciones: {e}")

    video_context = build_video_context(params, page_data, job_id, params.get("url", ""))
    video_context["format"] = params.get("format", "reel")
    video_context["duration"] = params.get("duration", 30)
    print(f"[renderer] style={video_context['visual_style']} | narrative={video_context['narrative']} | hook={video_context['hook']} | tone={video_context['tone']}")
    if debugger: debugger.set_variation(video_context)

    # Dimensiones
    fmt = params.get("format", "reel")
    width  = 1080 if fmt == "reel" else (1920 if fmt == "youtube" else 1080)
    height = 1920 if fmt == "reel" else (1080 if fmt == "youtube" else 1920)
    total_frames = 990

    # Selección de animaciones
    url_key = params.get("url", "")
    cache_context = {
        "isDark": page_data.get("isDark", False),
        "primaryColor": page_data.get("primaryColor", ""),
        "bgColor": page_data.get("bgColor", ""),
        "visual_style": video_context.get("visual_style", ""),
        "narrative": video_context.get("narrative", ""),
        "tone": video_context.get("tone", ""),
    }
    is_simple_mode = params.get("mode", "simple") == "simple"
    anim_selection = None if is_simple_mode else get_cached(url_key, cache_context)

    if anim_selection:
        print(f"[renderer] cache HIT para {url_key[:40]}")
    else:
        if os.environ.get("ANTHROPIC_API_KEY"):
            try:
                anim_selection = await select_animations(
                    video_context, industry_key=industry_key,
                    industry_anims=industry_anims,
                    used_in_industry=used_in_industry,
                    needs_new_anims=needs_new,
                )
                if anim_selection and not is_simple_mode:
                    save_cache(url_key, anim_selection, cache_context)
            except Exception as e:
                print(f"[renderer] error seleccionando animaciones: {e}")
        if not anim_selection:
            anim_selection = get_default_selection(page_data)

    if debugger: debugger.set_animation_selection(anim_selection)

    # ── Fondo contextual ──────────────────────────────────────────────────
    # El brief de Claude puede proponer un fondo — si no, calculamos uno
    brief_bg = anim_selection.get("brief", {}).get("paleta", {}).get("fondo", "")
    if not brief_bg or brief_bg in ("#000000", "black", "#000"):
        brief_bg = get_bg_for_site(page_data, industry_key)

    # Props
    props = {
        "siteName":           page_data.get("siteName", "Mi Sitio"),
        "headline":           page_data.get("headline", "La solución que necesitás"),
        "subheadline":        page_data.get("subheadline", ""),
        "benefits":           page_data.get("benefits", []),
        "features":           page_data.get("features", []),
        "cta":                page_data.get("cta", "Empezá gratis"),
        "problem":            page_data.get("problem", ""),
        "audience":           page_data.get("audience", ""),
        "numbers":            page_data.get("numbers", []),
        "guarantee":          page_data.get("guarantee", ""),
        "primaryColor":       page_data.get("primaryColor", "#6366f1"),
        "secondaryColor":     page_data.get("secondaryColor", "#818cf8"),
        "screenshotUrl":      screenshot_b64,
        "bg":                 brief_bg,
        # Hook
        "hookAAnimation":     anim_selection.get("hook_a", {}).get("animation", "counter_explosion"),
        "hookAParams":        anim_selection.get("hook_a", {}).get("params", {}),
        "hookBAnimation":     anim_selection.get("hook_b", {}).get("animation", "reveal_swipe"),
        "hookBParams":        anim_selection.get("hook_b", {}).get("params", {}),
        # Product
        "productAAnimation":  anim_selection.get("product_a", {}).get("animation", "iphone_rise"),
        "productAParams":     anim_selection.get("product_a", {}).get("params", {}),
        "productBAnimation":  anim_selection.get("product_b", {}).get("animation", "dashboard_build"),
        "productBParams":     anim_selection.get("product_b", {}).get("params", {}),
        # Benefits
        "benefitsAAnimation": anim_selection.get("benefits_a", {}).get("animation", "benefit_cards_stagger"),
        "benefitsAParams":    anim_selection.get("benefits_a", {}).get("params", {}),
        "benefitsBAnimation": anim_selection.get("benefits_b", {}).get("animation", "icon_draw_reveal"),
        "benefitsBParams":    anim_selection.get("benefits_b", {}).get("params", {}),
        "benefitsCAnimation": anim_selection.get("benefits_c", {}).get("animation", "stat_counters"),
        "benefitsCParams":    anim_selection.get("benefits_c", {}).get("params", {}),
        # CTA
        "ctaAAnimation":      anim_selection.get("cta_a", {}).get("animation", "urgency_countdown"),
        "ctaAParams":         anim_selection.get("cta_a", {}).get("params", {}),
        "ctaBAnimation":      anim_selection.get("cta_b", {}).get("animation", "liquid_button_cta"),
        "ctaBParams":         anim_selection.get("cta_b", {}).get("params", {}),
        # Outro
        "outroAnimation":     anim_selection.get("outro", {}).get("animation", "orbit_logo"),
        "outroParams":        anim_selection.get("outro", {}).get("params", {}),
        "brief":              anim_selection.get("brief", {}),
    }

    # Sanitizar params
    all_param_keys = [
        "hookAParams","hookBParams","productAParams","productBParams",
        "benefitsAParams","benefitsBParams","benefitsCParams",
        "ctaAParams","ctaBParams","outroParams",
    ]
    for scene_key in all_param_keys:
        scene_params = props.get(scene_key, {})
        if not scene_params: continue

        # Quitar screenshotUrl de cualquier params
        scene_params.pop("screenshotUrl", None)

        # Inyectar bg global en cada escena si no tiene uno
        if "bg" not in scene_params:
            scene_params["bg"] = brief_bg

        # lists: benefits/features/steps/items/sections → normalizar
        for list_key in ["benefits", "features", "steps", "badges", "items", "sections", "notifications"]:
            if list_key in scene_params and isinstance(scene_params[list_key], list):
                sanitized = []
                for item in scene_params[list_key]:
                    if isinstance(item, dict):
                        icon = item.get("icon", "")
                        title = (item.get("title") or item.get("label") or item.get("text") or
                                 item.get("front") or item.get("benefit") or item.get("step") or
                                 item.get("name") or item.get("description") or "")
                        text = f"{icon} {title}".strip() if icon else str(title)
                        if not text:
                            text = str(list(item.values())[0] if item else "")
                        sanitized.append(str(text))
                    elif item is not None:
                        sanitized.append(str(item))
                scene_params[list_key] = sanitized

        # stats → preservar como objetos {value, label}
        if "stats" in scene_params and isinstance(scene_params["stats"], list):
            normalized = []
            for stat in scene_params["stats"]:
                if isinstance(stat, dict):
                    val = stat.get("value") or stat.get("number") or ""
                    lbl = stat.get("label") or stat.get("title") or ""
                    suf = stat.get("suffix") or ""
                    pre = stat.get("prefix") or ""
                    normalized.append({"value": str(val), "label": str(lbl), "suffix": suf, "prefix": pre})
                else:
                    normalized.append(str(stat) if stat else "")
            scene_params["stats"] = normalized

    props_file = OUTPUTS_DIR / f"{job_id}_props.json"
    props_file.write_text(json.dumps(props))

    print(f"[renderer] props → siteName={props['siteName']} primaryColor={props['primaryColor']}")
    print(f"[renderer] bg → {brief_bg[:60]}")
    print(f"[renderer] hook_a={props.get('hookAAnimation')} hook_b={props.get('hookBAnimation')}")
    print(f"[renderer] product_a={props.get('productAAnimation')} product_b={props.get('productBAnimation')}")
    print(f"[renderer] benefits_a={props.get('benefitsAAnimation')} b={props.get('benefitsBAnimation')} c={props.get('benefitsCAnimation')}")
    print(f"[renderer] cta_a={props.get('ctaAAnimation')} cta_b={props.get('ctaBAnimation')} outro={props.get('outroAnimation')}")
    print(f"[renderer] props → screenshotUrl={'SI' if props.get('screenshotUrl') else 'NO'} benefits_count={len(props.get('benefits',[]))}")

    debug_props = OUTPUTS_DIR / f"{job_id}_props_debug.json"
    debug_props.write_text(json.dumps(props, indent=2, default=lambda x: str(x)[:50] if isinstance(x, str) and len(str(x)) > 100 else x))
    print(f"[renderer] props debug → {debug_props.name}")

    candidates = [
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion.cmd"),
        str(REMOTION_DIR / "node_modules" / ".bin" / "remotion"),
        "npx",
    ]
    remotion_bin = next((c for c in candidates if Path(c).exists()), "npx")
    concurrency = min(os.cpu_count() or 4, 8)

    cmd = [
        remotion_bin, "render", "index.jsx", "MarketingVideo",
        str(output_path.absolute()),
        "--props", str(props_file.absolute()),
        "--codec", "h264",
        "--fps", "30",
        "--width", str(width),
        "--height", str(height),
        "--duration-in-frames", str(total_frames),
        "--concurrency", str(concurrency),
        "--jpeg-quality", "98",
        "--crf", "14",
        "--pixel-format", "yuv420p",
        "--log", "error",
    ]

    print(f"[renderer] rendering {width}x{height} concurrency={concurrency}...")
    proc = await asyncio.create_subprocess_exec(
        *cmd, cwd=str(REMOTION_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    try: props_file.unlink()
    except: pass

    if proc.returncode != 0:
        err = stderr.decode()[-800:]
        print(f"[renderer] remotion error: {err}")
        if debugger: debugger.set_render_result(False, error=err[-200:])
        raise RuntimeError(f"Remotion falló: {err[-200:]}")

    if not output_path.exists():
        raise RuntimeError("Remotion no generó el archivo")

    from editor import get_duration as _get_dur
    dur = await _get_dur(output_path)
    if debugger: debugger.set_render_result(True, output_path, duration_s=dur)

    optimized_path = OUTPUTS_DIR / f"{job_id}_scaled.mp4"
    opt_cmd = [
        "ffmpeg", "-y",
        "-i", str(output_path),
        "-vf", "unsharp=3:3:0.5:3:3:0.3",
        "-c:v", "libx264",
        "-crf", "14",
        "-preset", "slow",
        "-profile:v", "high",
        "-level", "4.2",
        "-pix_fmt", "yuv420p",
        "-color_range", "tv",
        "-movflags", "+faststart",
        str(optimized_path),
    ]
    opt_proc = await asyncio.create_subprocess_exec(
        *opt_cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await opt_proc.communicate()

    if optimized_path.exists() and optimized_path.stat().st_size > 50000:
        try: output_path.unlink()
        except: pass
        output_path = optimized_path
        print(f"[renderer] optimized OK: {output_path.name} ({output_path.stat().st_size//1024}KB)")
    else:
        print(f"[renderer] optimización falló, usando original")

    print(f"[renderer] OK: {output_path.name} ({output_path.stat().st_size//1024}KB)")
    return output_path
