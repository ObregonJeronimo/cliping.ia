"""
site_capture.py — Captura un screenshot del sitio del usuario para usarlo como
mockup real en la escena MockupShowcase.

Usa Playwright (Chromium headless). Es best-effort: si Playwright no está
instalado o falla, devuelve None y el render cae al dashboard genérico.

Setup en el backend (una vez):
    pip install playwright
    playwright install chromium
"""

from __future__ import annotations

from pathlib import Path

try:
    from playwright.async_api import async_playwright
    _PW_OK = True
except Exception as _e:  # pragma: no cover
    _PW_OK = False
    print(f"[capture] Playwright no disponible: {_e}")


async def capture_site(url: str, out_path: str,
                       width: int = 1280, height: int = 900) -> str | None:
    """
    Captura el viewport superior del sitio (no la página entera, para que se vea
    como un 'hero' de la app). Devuelve out_path si salió bien, None si no.
    """
    if not _PW_OK or not url:
        return None
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            page = await browser.new_page(viewport={"width": width, "height": height},
                                          device_scale_factor=2)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as ge:
                print(f"[capture] goto lento ({ge}); capturo lo que haya")
            await page.wait_for_timeout(2200)
            # Cerrar banners de cookies comunes (best-effort)
            for sel in ["#onetrust-accept-btn-handler", "button:has-text('Aceptar')",
                        "button:has-text('Accept')", "[aria-label*='accept' i]"]:
                try:
                    await page.click(sel, timeout=800)
                    break
                except Exception:
                    pass
            await page.screenshot(path=out_path, clip={"x": 0, "y": 0, "width": width, "height": height})
            await browser.close()
        return out_path if Path(out_path).exists() else None
    except Exception as e:
        print(f"[capture] error: {e}")
        return None


# JS que corre EN la página ya renderizada: junta texto visible + señales para el director.
_JS_EXTRACT = r"""
() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const txt = (el) => clean(el && el.innerText);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const meta = (sel, attr) => { const e = document.querySelector(sel); return e ? (e.getAttribute(attr) || '') : ''; };
  const headings = uniq([...document.querySelectorAll('h1,h2,h3')].map(txt)
    .filter(t => t.length >= 3 && t.length <= 90)).slice(0, 14);
  const nav = uniq([...document.querySelectorAll('nav a, header a')].map(txt)
    .filter(t => t.length >= 2 && t.length <= 26)).slice(0, 14);
  const ctas = uniq([...document.querySelectorAll('button, a.btn, a[class*="button" i], [role="button"]')].map(txt)
    .filter(t => t.length >= 2 && t.length <= 32)).slice(0, 10);
  const paragraphs = uniq([...document.querySelectorAll('p, li')].map(txt)
    .filter(t => t.length >= 30 && t.length <= 240)).slice(0, 14);
  let logoRaw = '';
  const ico = document.querySelector('link[rel*="apple-touch-icon" i]')
    || document.querySelector('meta[property="og:image"]')
    || document.querySelector('link[rel*="icon" i]');
  if (ico) logoRaw = ico.getAttribute('href') || ico.getAttribute('content') || '';
  let logo = '';
  try { logo = logoRaw ? new URL(logoRaw, location.href).href : ''; } catch (e) { logo = ''; }
  return {
    lang: clean(document.documentElement.lang).slice(0, 5),
    title: clean(document.title),
    siteName: meta('meta[property="og:site_name"]', 'content'),
    description: clean(meta('meta[name="description"]', 'content') || meta('meta[property="og:description"]', 'content')).slice(0, 300),
    themeColor: meta('meta[name="theme-color"]', 'content'),
    logo, headings, nav, ctas, paragraphs,
    bodyText: clean(document.body && document.body.innerText).slice(0, 4000),
  };
}
"""


# Extrae URLs de imágenes REALES del sitio (fotos de producto/hero), priorizando las grandes.
# Descarta iconos, data-URIs y svgs. Devuelve hasta 6 URLs absolutas, mayor área primero.
_JS_IMAGES = r"""
() => {
  const abs = (u) => { try { return new URL(u, location.href).href } catch (e) { return null } };
  const seen = new Set(); const out = [];
  const push = (u, area) => {
    if (!u) return;
    const a = abs(u); if (!a) return;
    if (a.startsWith('data:')) return;
    if (a.toLowerCase().split('?')[0].endsWith('.svg')) return;
    if (seen.has(a)) return;
    seen.add(a); out.push({ u: a, area });
  };
  const og = document.querySelector('meta[property="og:image"], meta[name="og:image"]');
  if (og && og.content) push(og.content, 5e9);            // suele ser la mejor foto de marca
  for (const im of Array.from(document.images)) {
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    if (w < 400 || h < 250) continue;
    const r = im.getBoundingClientRect();
    if (r.width < 160) continue;
    push(im.currentSrc || im.src, w * h);
  }
  const els = Array.from(document.querySelectorAll('section,header,div,figure,a')).slice(0, 250);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width < 600 || r.height < 280) continue;
    const bg = getComputedStyle(el).backgroundImage;
    const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    if (m && m[1]) push(m[1], r.width * r.height);
  }
  return out.sort((a, b) => b.area - a.area).slice(0, 6).map(x => x.u);
}
"""


async def extract_content(url: str) -> dict | None:
    """
    Carga la página con Chromium y extrae el texto YA RENDERIZADO (clave para sitios
    React/Vue/Next que devuelven HTML vacío en un GET crudo) + señales para el director:
    headings, nav, párrafos, CTAs, logo, theme-color e idioma. Best-effort: None si falla.
    """
    if not _PW_OK or not url:
        return None
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            page = await browser.new_page(viewport={"width": 1280, "height": 900})
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as ge:
                print(f"[extract] goto lento ({ge}); leo lo que haya")
            await page.wait_for_timeout(1800)
            data = await page.evaluate(_JS_EXTRACT)
            await browser.close()
        return data if isinstance(data, dict) else None
    except Exception as e:
        print(f"[extract] error: {e}")
        return None


async def capture_all(url: str, out_path: str, width: int = 1280, height: int = 900) -> dict:
    """UNA sola carga de Chromium: extrae el texto renderizado (content) Y saca el screenshot,
    en vez de abrir el navegador dos veces por video. Devuelve {'screenshot': path|None,
    'content': dict|None}. Best-effort: cualquier parte que falle vuelve None, no rompe."""
    out = {"screenshot": None, "content": None, "images": []}
    if not _PW_OK or not url:
        return out
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            page = await browser.new_page(viewport={"width": width, "height": height},
                                          device_scale_factor=2)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as ge:
                print(f"[capture_all] goto lento ({ge}); sigo con lo que haya")
            # Cerrar cookies temprano (si las hay) para no taparle el hero al screenshot.
            for sel in ["#onetrust-accept-btn-handler", "button:has-text('Aceptar')",
                        "button:has-text('Accept')", "[aria-label*='accept' i]"]:
                try:
                    await page.click(sel, timeout=800)
                    break
                except Exception:
                    pass
            # Esperar a que la red se calme: hero, imágenes y FONDOS CSS terminan de cargar.
            # (Antes sacábamos la foto apenas cargaba el DOM y el hero salía vacío.)
            try:
                await page.wait_for_load_state("networkidle", timeout=9000)
            except Exception:
                pass
            # Forzar lazy-load: muchos heroes cargan recién al entrar al viewport.
            try:
                await page.evaluate("window.scrollTo(0, Math.round(document.body.scrollHeight*0.4))")
                await page.wait_for_timeout(700)
                await page.evaluate("window.scrollTo(0, 0)")
                await page.wait_for_timeout(500)
            except Exception:
                pass
            # Esperar a que las <img> grandes (hero incluido) estén realmente cargadas.
            try:
                await page.wait_for_function(
                    "() => Array.from(document.images).filter(i=>i.width>200)"
                    ".every(i=>i.complete && i.naturalWidth>0)",
                    timeout=5000)
            except Exception:
                pass
            await page.wait_for_timeout(900)
            try:
                data = await page.evaluate(_JS_EXTRACT)
                if isinstance(data, dict):
                    out["content"] = data
            except Exception as ee:
                print(f"[capture_all] extract: {ee}")
            try:
                imgs = await page.evaluate(_JS_IMAGES)
                if isinstance(imgs, list):
                    out["images"] = imgs
            except Exception as ie:
                print(f"[capture_all] images: {ie}")
            try:
                await page.screenshot(path=out_path, clip={"x": 0, "y": 0, "width": width, "height": height})
                if Path(out_path).exists():
                    out["screenshot"] = out_path
            except Exception as se:
                print(f"[capture_all] screenshot: {se}")
            await browser.close()
    except Exception as e:
        print(f"[capture_all] error: {e}")
    return out
