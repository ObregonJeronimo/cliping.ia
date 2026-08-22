# CAPTURADOR DE LA TERCERA COLUMNA — el motor web, cuadro por cuadro.
#
# Abre `escena.html` con Playwright, le pide `__poner(pieza, t)` para cada cuadro y guarda un PNG.
# Es el mismo patron que `tools/recreacion/capturar.py`, con tres diferencias que importan:
#
#   1. FONDO TRANSPARENTE (`omit_background`). La medicion pesa por ALFA, asi que el fondo tiene que
#      ser alfa cero: si fuera negro opaco, `pesos()` caeria a luminancia, el fondo entero sumaria masa
#      y el centroide se iria a cualquier lado con un numero plausible.
#   2. NO CODIFICA VIDEO. Lo que se compara son los PNG contra los de After Effects; meter H.264 en el
#      medio agregaria una perdida que no tiene nada que ver con lo que se quiere medir.
#   3. ANOTA LO QUE LA PAGINA CREIA DIBUJAR. `__poner` devuelve el estado, y eso se guarda junto a los
#      cuadros. Es una columna gratis que separa "el motor calculo mal" de "el navegador dibujo
#      distinto" — la misma idea que `valueAtTime` del lado de AE, que ya resolvio un diagnostico.
#
# El servidor HTTP sirve la RAIZ DEL REPO y no esta carpeta, porque la pagina carga gsap desde
# /node_modules. Sobre file:// eso ni siquiera cargaria: Chromium bloquea los modulos por CORS.

import asyncio, functools, http.server, json, shutil, socket, socketserver, sys, threading
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent.parent          # tools/ae/motor -> repo
FPS = 30
CUADROS = 31
SALIDA = Path("C:/ae-probe/p3/motor")


class Manejador(http.server.SimpleHTTPRequestHandler):
    """UN NAVEGADOR SE NIEGA A EJECUTAR UN MODULO SERVIDO CON EL TIPO EQUIVOCADO, y no dice por que en
    ningun lado visible: el `import` falla, el modulo no se evalua, la pagina se queda a medias.
    `SimpleHTTPRequestHandler` adivina el tipo por la extension y en Windows `.mjs` no esta en el
    registro de tipos, asi que sale como `application/octet-stream` y Chromium lo rechaza por
    "strict MIME type checking". Se registra a mano."""
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.mjs': 'text/javascript', '.js': 'text/javascript'}

    def log_message(self, *a):     # sin ruido: el servidor no es lo que se esta probando
        pass


def servir(directorio):
    s = socket.socket(); s.bind(('127.0.0.1', 0)); puerto = s.getsockname()[1]; s.close()
    h = functools.partial(Manejador, directory=str(directorio))
    srv = socketserver.TCPServer(('127.0.0.1', puerto), h)
    srv.allow_reuse_address = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, puerto


async def main():
    from playwright.async_api import async_playwright

    escena = SALIDA / 'escena.json'
    if not escena.exists():
        print(f'FALTA {escena}. Corre primero: node tools/ae/motor-check.mjs --exportar')
        return 2

    doc = json.loads(escena.read_text(encoding='utf-8'))
    ancho, alto = doc['mundo']['ancho'], doc['mundo']['alto']

    srv, puerto = servir(RAIZ)
    # la pagina se sirve desde la raiz del repo para que /node_modules/gsap resuelva
    rel = SALIDA.as_posix()
    estados = {}

    async with async_playwright() as p:
        br = await p.chromium.launch(args=['--force-color-profile=srgb', '--font-render-hinting=none'])
        pg = await br.new_page(viewport={'width': ancho, 'height': alto}, device_scale_factor=1)

        # QUE NO FALLE MUDO. La primera version se limitaba a informar "la pagina no arranco
        # (title = 'cargando')", que es exactamente igual de util que un timeout: dice que algo salio
        # mal y no que. El error real estaba en la consola del navegador y nadie lo estaba escuchando.
        errores = []
        pg.on('console', lambda m: errores.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errores.append(f'[excepcion] {e}'))
        pg.on('requestfailed', lambda r: errores.append(f'[pedido fallido] {r.url}'))

        # EL DOCUMENTO DE ESCENA VIVE FUERA DEL REPO (en C:/ae-probe), asi que no lo puede servir el
        # servidor de archivos: se intercepta el pedido y se responde con el contenido. De paso, eso
        # deja claro que la pagina no sabe de donde sale el documento — recibe datos, no rutas.
        async def responder(ruta):
            await ruta.fulfill(status=200, content_type='application/json',
                               body=escena.read_text(encoding='utf-8'))
        await pg.route('**/escena.json', responder)
        await pg.goto(f'http://127.0.0.1:{puerto}/tools/ae/motor/escena.html')
        try:
            await pg.wait_for_function("document.title === 'listo'", timeout=20000)
        except Exception:
            msg = await pg.evaluate("document.title")
            print(f'la pagina no arranco (title = {msg!r})')
            if errores:
                print('  lo que dijo el navegador:')
                for e in errores[:10]:
                    print(f'    {e}')
            else:
                print('  y el navegador no dijo nada: mira si `document.title` se pone en otro lado')
            await br.close()
            return 2

        piezas = await pg.evaluate('window.__piezas')
        modos = await pg.evaluate('window.__modos')
        print(f'  {len(piezas)} piezas x {len(modos)} modos ({", ".join(modos)})')

        # DOS MODOS DE REPRODUCIR LA MISMA CURVA. 'custom' usa GSAP CustomEase con la cadena de nuestro
        # conversor; 'propio' resuelve el bezier. Capturar los dos es lo que permite ATRIBUIR el error
        # que quede, en vez de cargarselo a la conversion — que ya esta medida contra AE en 0,016 px.
        for modo in modos:
            for pid in piezas:
                carpeta = SALIDA / modo / pid
                if carpeta.exists():
                    shutil.rmtree(carpeta)
                carpeta.mkdir(parents=True)
                clave = f'{modo}/{pid}'
                estados[clave] = []
                for k in range(CUADROS):
                    t = k / FPS
                    st = await pg.evaluate(f'window.__poner({pid!r}, {t}, {modo!r})')
                    estados[clave].append({'k': k, 't': t, **(st or {})})
                    await pg.screenshot(path=str(carpeta / f'f{k:03d}.png'), omit_background=True)
            print(f'  {modo}: {len(piezas)} piezas x {CUADROS} cuadros')

        await br.close()

    (SALIDA / 'estados.json').write_text(json.dumps(estados, indent=1), encoding='utf-8')
    print(f'  estados -> {SALIDA / "estados.json"}')
    return 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
