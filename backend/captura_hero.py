"""Captura la pagina como TIRA LARGA en viewport movil, para que un hero 3D pueda scrollearla.

POR QUE
Un hero de "telefono flotando que muestra la pagina scrolleando" no se arma con un screenshot: se arma
con una TIRA. La pantalla del telefono es una ventana de 9:19.5 sobre una imagen mucho mas alta, y el
scroll es mover el desplazamiento de la textura. Un video del scroll seria mas fiel pero pesa cien
veces mas, hay que decodificarlo en el navegador y no se puede scrubbear frame a frame de forma
determinista — la tira se mueve con una sola resta.

QUE DEVUELVE
Un PNG de ancho 720 (viewport movil x2) y alto variable, mas la altura del viewport en esa escala.
Con eso el hero sabe cuanto puede desplazar antes de quedarse sin pagina.

DECISIONES QUE COSTARON
· VIEWPORT MOVIL DE VERDAD, no un escritorio angosto. Una landing responsive REORDENA su layout: el
  hero se apila, el menu se vuelve hamburguesa, las columnas se convierten en filas. Capturar 1280 y
  recortar da una pagina que ningun visitante vio nunca.
· Se baja hasta el fondo antes de capturar. Media web moderna carga las imagenes al entrar en pantalla,
  y una tira con seis huecos grises es peor que no tener tira.
· Se corta contra el limite de textura de la GPU. Una home de ecommerce mide veinte pantallas: el hero va a scrollear
  dos o tres, y una textura de 20.000 px de alto no entra en la memoria de textura de una GPU modesta
  (el limite tipico son 8192 px por lado; arriba de eso la textura se rechaza y el plano sale negro).
"""
import asyncio
import os
import re
import sys

ANCHO_MOVIL = 360          # el viewport CSS mas comun en telefonos reales
ESCALA = 2                 # retina: 720 px de textura, que es lo que se ve nitido en un reel 1080
# TOPE DURO DE TEXTURA. SwiftShader —el rasterizador que usa el render determinista— reporta
# MAX_TEXTURE_SIZE 8192, y una textura mas alta no se rechaza con un error claro: el plano sale NEGRO.
# Con viewport de 780 CSS a escala 2 son 1560 px por pantalla, asi que cinco entran y seis no (9360).
# El calculo se hace abajo contra este numero en vez de fijar un conteo, para que cambiar el viewport
# no vuelva a pasarse sin que nadie se entere.
MAX_TEXTURA = 8192


async def capturar_tira(page, alto_viewport=780):
    """Sobre una `page` de Playwright YA cargada. Devuelve (bytes_png, alto_viewport_px, alto_total_px).

    Recibe la pagina y no la URL a proposito: capture_all abre Chromium una sola vez por video y este
    es el mismo paso caro.
    """
    original = page.viewport_size or {"width": 1280, "height": 900}
    await page.set_viewport_size({"width": ANCHO_MOVIL, "height": alto_viewport})
    # Un reflow de layout responsive no es instantaneo: sin esperar, la tira sale con el layout de
    # escritorio a medio reacomodar.
    await page.wait_for_timeout(650)

    # bajar y volver: dispara el lazy-load de todo lo que carga al entrar en pantalla
    await page.evaluate(
        "async()=>{const h=document.body.scrollHeight;"
        "for(let y=0;y<h;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,45))}"
        "scrollTo(0,0)}")
    await page.wait_for_timeout(450)

    # Los fijos se ocultan: un header pegajoso aparece repetido cada pantalla dentro de la tira y el
    # scroll del hero se ve como un error de render.
    await page.evaluate("""() => {
      window.__uvH = []
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el)
        if (cs.position === 'fixed' || cs.position === 'sticky') {
          window.__uvH.push([el, el.style.getPropertyValue('display'), el.style.getPropertyPriority('display')])
          el.style.setProperty('display', 'none', 'important')
        }
      }
    }""")

    alto_total = await page.evaluate("() => document.body.scrollHeight")
    tope = MAX_TEXTURA // ESCALA
    alto_corte = max(alto_viewport, min(int(alto_total), tope))

    png = await page.screenshot(full_page=True, clip={"x": 0, "y": 0, "width": ANCHO_MOVIL, "height": alto_corte})

    await page.evaluate("() => { for (const [el, v, p] of (window.__uvH || [])) { if (v) el.style.setProperty('display', v, p); else el.style.removeProperty('display') } window.__uvH = [] }")
    await page.set_viewport_size(original)
    await page.wait_for_timeout(200)
    return png, alto_viewport * ESCALA, alto_corte * ESCALA


async def _solo(url, salida):
    from playwright.async_api import async_playwright
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from site_capture import _CTX
    async with async_playwright() as p:
        br = await p.chromium.launch(args=["--no-sandbox"])
        pg = await (await br.new_context(viewport={"width": ANCHO_MOVIL, "height": 780},
                                         device_scale_factor=ESCALA, is_mobile=True,
                                         has_touch=True, ignore_https_errors=True, **_CTX)).new_page()
        await pg.goto(url, wait_until="domcontentloaded", timeout=45000)
        try:
            await pg.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        png, vp, total = await capturar_tira(pg)
        with open(salida, "wb") as f:
            f.write(png)
        print(f"{salida}  tira {total}px de alto · viewport {vp}px · {len(png) // 1024}kb")
        await br.close()


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://linear.app"
    host = re.sub(r"[^a-z0-9]+", "-", url.split("//")[-1].split("/")[0].lower()).strip("-")
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(raiz, "tools", "out", "heroes")
    os.makedirs(out, exist_ok=True)
    asyncio.run(_solo(url, os.path.join(out, f"tira-{host}.png")))
