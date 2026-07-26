# Cosechador: corre el extractor sobre paginas REALES y deja los recortes en tools/out/elementos/<host>/
# para mirarlos (tools/elementos-sheet.mjs) y para armar fixtures (tools/director-fixture-elementos.mjs).
#
# Existe como herramienta y no como script de una vez porque el extractor se juzga MIRANDOLO. Un
# "14/14 capturados" en consola no dice nada: los recortes pueden ser rectangulos en blanco, fondos que
# se colaron o un logo cortado al medio. Todos los defectos que este extractor tuvo salieron de la hoja
# de contacto, ninguno de leer el codigo.
#
# Uso:  python cosecha_elementos.py                 (las 8 paginas de referencia)
#       python cosecha_elementos.py https://otra.com
import asyncio
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from playwright.async_api import async_playwright

from element_extract import extraer_elementos
from site_capture import _CTX

OUT = os.path.join(os.path.dirname(__file__), "..", "tools", "out", "elementos")

# Las mismas 8 de los fixtures del Director. La mezcla importa: landing SaaS clasica (stripe, ghost),
# pagina que arma todo con CSS y casi no tiene <img> (linear, tailwind), marketplace denso en español
# (mercadolibre), pagina liviana en imagenes (basecamp), y la nuestra.
PAGINAS = [
    "https://stripe.com", "https://linear.app", "https://ghost.org", "https://www.notion.com",
    "https://www.mercadolibre.com.ar", "https://tailwindcss.com", "https://basecamp.com",
    "https://cliping-ia.vercel.app",
]


async def una(p, url):
    br = await p.chromium.launch(args=["--no-sandbox"])
    # el mismo contexto que usa el backend: sin UA/locale reales muchos sitios devuelven 403 al
    # headless, y una pagina que da 403 se lee como "el extractor no encuentra nada"
    ctx = await br.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2,
                               ignore_https_errors=True, **_CTX)
    page = await ctx.new_page()
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        # bajar y volver dispara el lazy-load de todo lo que carga al entrar en pantalla
        await page.evaluate("async()=>{const h=document.body.scrollHeight;for(let y=0;y<h;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0)}")
        try:
            await page.evaluate("document.fonts && document.fonts.ready")
        except Exception:
            pass
        await page.wait_for_timeout(700)

        els = await extraer_elementos(page)
        host = re.sub(r"[^a-z0-9]+", "-", url.split("//")[-1].split("/")[0].lower()).strip("-")
        d = os.path.join(OUT, host)
        os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            os.remove(os.path.join(d, f))
        meta = []
        print(f"\n{url} -> {len(els)} elementos")
        for e in els:
            f = f"{e['id']}-{e['rol']}.png"
            with open(os.path.join(d, f), "wb") as fh:
                fh.write(e["png"])
            kb = len(e["png"]) // 1024
            meta.append({k: v for k, v in e.items() if k != "png"} | {"file": f, "kb": kb})
            print(f"  {e['rol']:8s} {e['w']:4d}x{e['h']:4d} {kb:4d}kb tinta={e['tinta']:.2f} "
                  f"tex={e['textura']:.2f} {e['color']} lum={e['lum']:.2f} "
                  f"{'alfa' if e['alfa'] else '    '} min={e['minPx']:2d}px {e['texto'][:30]!r}")
        with open(os.path.join(d, "meta.json"), "w", encoding="utf-8") as fh:
            json.dump(meta, fh, ensure_ascii=False, indent=2)
    except Exception as ex:
        print(f"\n{url} FALLO: {str(ex).splitlines()[0][:120]}")
    finally:
        await br.close()


async def main(urls):
    async with async_playwright() as p:
        for u in urls:
            await una(p, u)


asyncio.run(main(sys.argv[1:] or PAGINAS))
