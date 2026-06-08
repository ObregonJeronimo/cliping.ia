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
    out = {"screenshot": None, "content": None}
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
            await page.wait_for_timeout(2200)
            for sel in ["#onetrust-accept-btn-handler", "button:has-text('Aceptar')",
                        "button:has-text('Accept')", "[aria-label*='accept' i]"]:
                try:
                    await page.click(sel, timeout=800)
                    break
                except Exception:
                    pass
            try:
                data = await page.evaluate(_JS_EXTRACT)
                if isinstance(data, dict):
                    out["content"] = data
            except Exception as ee:
                print(f"[capture_all] extract: {ee}")
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
