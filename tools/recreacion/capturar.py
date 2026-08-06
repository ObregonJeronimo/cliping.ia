# CAPTURADOR CUADRO POR CUADRO — sin motor de urvid.
#
# Abre la pagina con Playwright, le pide `__seek(t)` cuadro a cuadro y guarda un PNG por cuadro.
# Despues ffmpeg los junta. Es determinista: la timeline de GSAP esta en PAUSA y solo se la posiciona,
# asi que no hay reloj propio ni rAF — dos corridas dan el mismo archivo.

import asyncio, os, shutil, subprocess, sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
FPS = 25
W, H = 1920, 1080


async def main(pagina, salida):
    from playwright.async_api import async_playwright
    tmp = AQUI / '_frames'
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir()

    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--force-color-profile=srgb', '--font-render-hinting=none'])
        pg = await br.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
        await pg.goto((AQUI / pagina).as_uri())
        await pg.wait_for_function("document.title === 'listo'")
        await pg.evaluate("document.fonts.ready")
        await asyncio.sleep(0.6)                       # que terminen de cargar las caras

        dur = await pg.evaluate('window.__dur')
        n = int(round(dur * FPS))
        print(f'  {n} cuadros a {FPS} fps ({dur}s)')
        for i in range(n):
            await pg.evaluate(f'window.__seek({i / FPS})')
            await pg.screenshot(path=str(tmp / f'f{i:05d}.png'))
            if i % 50 == 0:
                print(f'    {i}/{n}')
        await br.close()

    print('  encodeando...')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS),
                    '-i', str(tmp / 'f%05d.png'),
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
                    '-pix_fmt', 'yuv420p', str(salida)], check=True)
    shutil.rmtree(tmp)
    print(f'  {salida}  ({os.path.getsize(salida) // 1024} kb)')


if __name__ == '__main__':
    pagina = sys.argv[1] if len(sys.argv) > 1 else 'firefit.html'
    salida = sys.argv[2] if len(sys.argv) > 2 else str(AQUI / 'firefit.mp4')
    asyncio.run(main(pagina, salida))
