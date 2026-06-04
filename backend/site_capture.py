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
            await page.goto(url, wait_until="networkidle", timeout=20000)
            await page.wait_for_timeout(800)
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
