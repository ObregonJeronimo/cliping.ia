# CAPTURADOR DE LA COMPOSICION ENTERA — el reproductor, cuadro por cuadro.
#
# Abre `comp.html`, le pide `__poner(t)` para cada cuadro y guarda un PNG. Lo mismo que
# `capturar.py` pero sobre una composicion completa en vez de una pieza suelta.
#
# TRES COSAS QUE NO SON OBVIAS Y QUE YA COSTARON UNA CORRIDA CADA UNA:
#
#   1. FONDO TRANSPARENTE (`omit_background`). La medicion pesa por ALFA. Si el fondo fuera opaco, el
#      lector caeria a luminancia y el fondo entero sumaria masa.
#   2. `.mjs` HAY QUE SERVIRLO COMO `text/javascript`. En Windows no esta registrado, sale como
#      `application/octet-stream` y Chromium se niega a ejecutarlo por MIME estricto — sin decir nada
#      visible: el import falla y la pagina se queda a medias.
#   3. ESCUCHAR LA CONSOLA DEL NAVEGADOR. Un "no arranco" sin motivo es igual de util que un timeout.

import asyncio, functools, http.server, json, shutil, socket, socketserver, subprocess, sys, threading
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent.parent
# EL DOCUMENTO Y LA SALIDA SE PUEDEN APUNTAR A OTRO LADO. Estaban clavados, asi que verificar una
# sonda chica obligaba a pisar el comp.json de la pieza en la que se esta trabajando — o sea a
# destruir lo que se estaba midiendo para poder medir otra cosa.
def _arg(nombre, porDefecto):
    for i, a in enumerate(sys.argv):
        if a == nombre and i + 1 < len(sys.argv):
            return Path(sys.argv[i + 1])
    return Path(porDefecto)

SALIDA = _arg('--salida', "C:/ae-probe/render/MOTOR")
DOC = _arg('--doc', "C:/ae-probe/p3/motor/comp.json")


class Manejador(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.mjs': 'text/javascript', '.js': 'text/javascript'}

    def log_message(self, *a):
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

    if not DOC.exists():
        print(f'FALTA {DOC}. Corre: node tools/ae/comp.mjs --json {DOC}')
        return 2
    doc = json.loads(DOC.read_text(encoding='utf-8'))
    ancho, alto = doc['comp']['ancho'], doc['comp']['alto']
    fps, dur = doc['comp']['fps'], doc['comp']['duracion']
    total = int(round(dur * fps))

    # UN MODO QUE SOLO MIDE NO PUEDE BORRAR NADA, y esto no es una precaucion teorica: la primera
    # version limpiaba la carpeta antes de mirar si le habian pedido `--solo-cajas`, asi que una
    # correccion de MEDICION se llevo puesto un render de diecisiete minutos. El borrado va DESPUES de
    # la bifurcacion, no antes.
    # Y LA BIFURCACION HAY QUE AMPLIARLA CADA VEZ QUE APARECE UN MODO NUEVO, que es justo lo que no
    # pasa. `--cuadros` se agrego despues y se leia 130 lineas mas abajo, asi que pedir doce cuadros
    # para mirar una composicion BORRABA el render completo que hubiera al lado — el mismo accidente
    # que esta cabecera describe, repetido por quien la habia escrito. La lista de cuadros se lee ACA,
    # antes de tocar el disco, y solo se limpia cuando se van a rendir todos.
    solo_cajas = '--solo-cajas' in sys.argv
    con_fondo = '--con-fondo' in sys.argv
    cuales = list(range(total))
    for i, a in enumerate(sys.argv):
        if a == '--cuadros' and i + 1 < len(sys.argv):
            cuales = [int(x) for x in sys.argv[i + 1].split(',') if x.strip() != '']
            cuales = [c for c in cuales if 0 <= c < total]
    if not solo_cajas and len(cuales) == total:
        if SALIDA.exists():
            shutil.rmtree(SALIDA)
        SALIDA.mkdir(parents=True)
    SALIDA.mkdir(parents=True, exist_ok=True)

    srv, puerto = servir(RAIZ)
    async with async_playwright() as p:
        # ================================================================ LA GPU, QUE NO SE ESTABA USANDO
        #
        # Chromium headless en Windows NO usa la placa de video salvo que se le pida. Sin estas opciones
        # cae a SwiftShader —render por software— y lo hace en silencio: WebGL "anda", el video sale
        # bien, y nadie se entera. Preguntado con WEBGL_debug_renderer_info:
        #
        #   sin opciones            ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))
        #   con --use-angle=d3d11   ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti, Direct3D11)
        #
        # El costo medido de no tenerlas: 6,8 s por cuadro en la PIEZA-L, o sea 27 min para 8 segundos
        # de video y 102 min para 30. Todos los renders que hizo este repo fueron por CPU.
        #
        # `--ignore-gpu-blocklist` hace falta porque Chromium bloquea por defecto a muchas placas en
        # headless; `--enable-gpu-rasterization` mueve tambien el rasterizado 2D a la placa.
        br = await p.chromium.launch(args=[
            '--force-color-profile=srgb', '--font-render-hinting=none',
            '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
        ])
        pg = await br.new_page(viewport={'width': ancho, 'height': alto}, device_scale_factor=1)

        errores = []
        pg.on('console', lambda m: errores.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errores.append(f'[excepcion] {e}'))
        pg.on('requestfailed', lambda r: errores.append(f'[pedido fallido] {r.url}'))

        async def responder(ruta):
            await ruta.fulfill(status=200, content_type='application/json',
                               body=DOC.read_text(encoding='utf-8'))
        await pg.route('**/comp.json', responder)

        # LOS MEDIOS VIVEN AL LADO DEL DOCUMENTO, fuera del repo, asi que tampoco los sirve el servidor
        # de archivos. Se interceptan igual que el documento. De paso queda explicito que la pagina no
        # sabe DONDE estan: pide un nombre y recibe bytes.
        MEDIOS = Path('C:/ae-probe/medios')
        async def responder_medio(ruta):
            from urllib.parse import unquote
            nombre = unquote(ruta.request.url.split('/medios/')[-1].split('?')[0])
            f = MEDIOS / nombre
            if not f.exists():
                await ruta.fulfill(status=404, body=f'no existe {nombre}')
                return
            tipo = 'image/png' if f.suffix.lower() == '.png' else 'application/octet-stream'
            await ruta.fulfill(status=200, content_type=tipo, body=f.read_bytes())
        await pg.route('**/medios/*', responder_medio)

        # LA PIEZA 2D SE PASA POR EL REPRODUCTOR 3D A PROPOSITO, y es LA prueba de la reescritura: si
        # una composicion ya medida da los mismos numeros por el camino nuevo, el cambio de base esta
        # bien. Verificar el reproductor 3D solo con escenas 3D nuevas seria no tener contra que
        # comparar — y una reescritura sin regresion es una reescritura sin red.
        # EL REPRODUCTOR SE ELIGE LEYENDO EL DOCUMENTO, no pidiendo una bandera.
        #
        # Con `--3d` opcional, olvidarlo no da error: da una comparacion COMPLETA y PLAUSIBLE hecha con
        # el reproductor equivocado. Acaba de pasar — la columna de geometria dio "exacto" en las cinco
        # capas, porque la geometria se calcula igual en los dos, y la unica pista era una linea que
        # decia "el reproductor NO pudo dibujar: capa 1 (camara)" en medio de la salida. Un veredicto
        # verde sobre un render que ignoro la camara es peor que ningun veredicto.
        #
        # Una composicion con camara o con una sola capa 3D no se puede reproducir en el motor 2D: no
        # es una preferencia, es que ese camino no sabe proyectar. Asi que se decide sola, y la bandera
        # que queda es la contraria —`--2d`— para forzar el caso raro a proposito.
        hay3d = any(c.get('tipo') == 'camara' or c.get('es3D') for c in doc['capas'])
        pagina = 'comp.html' if ('--2d' in sys.argv or not hay3d) else 'comp3d.html'
        print(f'  reproductor: {pagina}')
        # el fondo lo pinta la PAGINA solo si se lo piden: `omit_background` saca el fondo del
        # navegador y no un `background` de CSS, asi que pintarlo siempre arruinaba la captura con alfa
        _q = '?fondo=1' if con_fondo else ''
        await pg.goto(f'http://127.0.0.1:{puerto}/tools/ae/motor/{pagina}{_q}')
        try:
            await pg.wait_for_function("document.title === 'listo'", timeout=20000)
        except Exception:
            print(f"la pagina no arranco (title = {await pg.evaluate('document.title')!r})")
            for e in errores[:10]:
                print(f'    {e}')
            await br.close()
            return 2

        sin = await pg.evaluate('window.__sinSoporte')
        if sin:
            print('  el reproductor NO pudo dibujar:')
            for s in sin:
                print(f'    {s}')

        # LAS CAJAS DEL TEXTO, medidas por el navegador. Se comparan contra las que dio AE
        # (sourceRectAtTime): es la unica forma de saber cuanto se aparta la tipografia de un motor al
        # otro, que es un problema distinto del de la geometria y se arregla distinto.
        cajas = await pg.evaluate('window.__cajas()')

        # MEDIR LAS CAJAS NO EXIGE RENDERIZAR LA PIEZA. Con el obturador en 16 muestras, una pieza de
        # 10 s son 4800 capturas y ~17 minutos; las cajas del texto salen del layout y no cambian un
        # milimetro con el desenfoque. `--solo-cajas` las escribe y sale en cinco segundos, que es lo
        # que permite corregir una MEDICION sin volver a pagar el render entero.
        # LAS CAJAS DE UN TEXTO ANIMADO, CUADRO A CUADRO. `--cajas-animadas t1,t2,...` (en cuadros)
        # vuelca la union de la tinta visible de cada capa con animador, en coordenadas de capa, que es
        # lo mismo que mide `sourceRectAtTime` del lado de AE. Es lo que compara `animador-check.mjs`.
        # `_arg` devuelve siempre un Path —sirve para rutas y no para listas—, asi que este se lee
        # crudo. Con `_arg` esto moria con "WindowsPath object has no attribute split".
        arg_anim = None
        for _i, _a in enumerate(sys.argv):
            if _a == '--cajas-animadas' and _i + 1 < len(sys.argv):
                arg_anim = sys.argv[_i + 1]
        if arg_anim:
            cuadros_anim = [int(x) for x in arg_anim.split(',') if x.strip() != '']
            salida_anim = {}
            for k in cuadros_anim:
                salida_anim[str(k)] = await pg.evaluate('t => window.__cajasAnimadas(t)', k / fps)
            destino_anim = SALIDA.parent / 'cajas-animadas.json'
            destino_anim.write_text(json.dumps(salida_anim, indent=1), encoding='utf-8')
            print(f'  cajas animadas ({len(cuadros_anim)} cuadros) -> {destino_anim}')
            await br.close()
            return 0

        if solo_cajas:
            (SALIDA.parent / 'cajas.json').write_text(json.dumps(cajas, indent=1), encoding='utf-8')
            print(f'  cajas -> {SALIDA.parent / "cajas.json"}')
            await br.close()
            return 0

        # LAS ESQUINAS PROYECTADAS POR EL MOTOR DE VERDAD, para que la metrica de ritmo pueda
        # comprobarse. Esa metrica rehace la misma cuenta en Node —evaluar, componer, proyectar— porque
        # eso es lo que la hace costar milisegundos en vez de un render. El riesgo de tener la cuenta
        # escrita dos veces es que diverjan sin avisar, y entonces se estaria midiendo el ritmo de una
        # pieza que no es la que se va a ver. Con esto la diferencia se mide.
        #
        # Tampoco renderiza: pide `__esquinas(t)`, que solo evalua y proyecta. Sale en segundos.
        if '--esquinas' in sys.argv:
            porCuadro = {}
            for f in range(total):
                porCuadro[f] = await pg.evaluate('t => window.__esquinas(t)', f / fps)
            destino = SALIDA.parent / 'esquinas.json'
            destino.write_text(json.dumps(porCuadro), encoding='utf-8')
            print(f'  esquinas de {total} cuadros -> {destino}')
            await br.close()
            return 0

        # ---------------------------------------------------------------- el obturador
        # Un cuadro no es un instante: es lo que entro por el obturador mientras estuvo abierto. AE lo
        # hace tomando varias muestras dentro de esa ventana y promediandolas; aca se hace igual.
        #
        # LOS DOS NUMEROS QUE HAY QUE RESPETAR, y que vienen del documento en vez de asumirse:
        #   angulo  360 = abierto todo el cuadro. 180 = medio cuadro (el de cine, y el de AE).
        #   fase    donde empieza a abrirse. -90 con angulo 180 CENTRA la ventana en el cuadro. Sin la
        #           fase, el desenfoque aparece igual pero la imagen queda corrida medio cuadro — o sea
        #           el defecto se ve como "va adelantado", no como "esta mal el desenfoque".
        obt = doc.get('obturador') or {}
        pedidas = 0
        for i, a in enumerate(sys.argv):
            if a == '--obturador' and i + 1 < len(sys.argv):
                pedidas = int(sys.argv[i + 1])
        muestras = pedidas or (obt.get('muestras', 0) if obt.get('activo') else 1) or 1
        angulo = obt.get('angulo', 180)
        fase = obt.get('fase', -90)
        if muestras > 1:
            print(f'  obturador: {muestras} muestras, angulo {angulo} grados, fase {fase}')
            import numpy as np
            from PIL import Image
            import io

        # PEDIR CUADROS SUELTOS, que es como se mira una pieza para juzgar composicion.
        #
        # Verificar que un tiempo compone bien necesita DOCE cuadros elegidos, no mil ochocientos
        # renderizados. Sin esto la unica forma de ver un cuadro era pagar la pieza entera — 1800
        # capturas — y por eso terminaba mirando de menos: el costo empujaba a abrir cuatro imagenes y
        # decir que se habia revisado el video. La lista se escribe a mano porque los cuadros que
        # importan son los que estan EN el gesto, y eso lo decide quien escribio la pieza.
        # (`cuales` se calcula ARRIBA, antes de tocar el disco: ver la nota de la bifurcacion.)
        if len(cuales) != total:
            print(f'  solo {len(cuales)} cuadro(s), sin borrar lo que ya habia: {cuales}')

        estados = []
        for k in cuales:
            t = k / fps
            st = await pg.evaluate(f'window.__poner({t})')
            estados.append({'k': k, 't': t, 'capas': st})

            if muestras <= 1:
                # `omit_background` existe para MEDIR: el lector pesa por alfa, y con fondo opaco caeria
                # a luminancia y el fondo entero sumaria masa. Pero para MIRAR no sirve — sale un cuadro
                # blanco de punta a punta. `--con-fondo` captura lo que se ve de verdad. Son dos usos
                # distintos de la misma captura y necesitan cosas opuestas.
                await pg.screenshot(path=str(SALIDA / f'f{k:03d}.png'), omit_background=not con_fondo)
                continue

            # la ventana del obturador, en segundos, tal como la define AE
            t0 = t + (fase / 360.0) / fps
            ancho_t = (angulo / 360.0) / fps
            acc = None
            for s in range(muestras):
                # el centro de cada franja, no su borde: con los bordes la primera y la ultima muestra
                # pesan la mitad y el promedio queda corrido
                ts = t0 + ancho_t * (s + 0.5) / muestras
                await pg.evaluate(f'window.__poner({max(ts, 0.0)})')
                crudo_png = await pg.screenshot(omit_background=True)
                a = np.asarray(Image.open(io.BytesIO(crudo_png)).convert('RGBA'), dtype=np.float64)
                # SE PROMEDIA CON ALFA PREMULTIPLICADO. Promediar el color sin premultiplicar mezcla el
                # color de pixeles transparentes —que es basura— con el de los opacos, y los bordes del
                # rastro salen sucios. Es el mismo cuidado que el centroide pesado por alfa.
                al = a[:, :, 3:4] / 255.0
                a[:, :, :3] *= al
                acc = a if acc is None else acc + a
            acc /= muestras
            al = np.maximum(acc[:, :, 3:4] / 255.0, 1e-6)
            acc[:, :, :3] /= al
            Image.fromarray(np.clip(acc, 0, 255).astype(np.uint8)).save(SALIDA / f'f{k:03d}.png')
            if k % 30 == 0:
                print(f'    {k}/{total}')

            # el estado que se informa es el del INSTANTE del cuadro, no el de la ultima muestra
            await pg.evaluate(f'window.__poner({t})')
        await br.close()

    # SE ANOTA CON CUANTAS MUESTRAS SE RINDIO. Sin este dato, comparar una captura sin obturador contra
    # un render de AE con 16 muestras da diferencias grandes en todo cuadro con movimiento — y esas
    # diferencias parecen un defecto del reproductor cuando son la prueba comparando cosas distintas.
    # El comparador avisa si no coinciden en vez de dejar el numero suelto.
    (SALIDA / 'estados.json').write_text(json.dumps(
        {'cajas': cajas, 'cuadros': estados, 'muestras': muestras, 'pagina': pagina}, indent=1),
        encoding='utf-8')
    print(f'  {total} cuadros -> {SALIDA}')

    if '--mp4' in sys.argv:
        destino = sys.argv[sys.argv.index('--mp4') + 1]
        codificar(SALIDA, fps, ancho, alto, doc['comp']['fondo'] or '#000000', destino)
    return 0


def codificar(dir_cuadros, fps, ancho, alto, fondo, destino):
    """LOS PNG SE GUARDAN CON FONDO TRANSPARENTE Y EL COLOR SE COMPONE ACA.

    No es un rodeo: la medicion pesa por ALFA, asi que los cuadros TIENEN que salir transparentes o el
    fondo entero suma masa y el centroide se va a cualquier lado. Pero un MP4 no tiene alfa. Componer
    en ffmpeg deja las dos cosas: cuadros medibles Y un video mirable, del MISMO render — no de dos
    corridas distintas, que es como se cuelan las diferencias que despues nadie explica.

    Se usa el ffmpeg de imageio y no el del PATH: el resto del repo tiene las dos costumbres mezcladas
    y en otra maquina la del PATH puede no existir. El de imageio viene con la dependencia."""
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        exe = 'ffmpeg'
    color = '0x' + fondo.lstrip('#')
    orden = [
        exe, '-y', '-v', 'error',
        '-f', 'lavfi', '-i', f'color=c={color}:s={ancho}x{alto}:r={fps}',
        '-framerate', str(fps), '-i', str(dir_cuadros / 'f%03d.png'),
        '-filter_complex', '[0:v][1:v]overlay=shortest=1,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
        str(destino),
    ]
    subprocess.run(orden, check=True)
    tam = Path(destino).stat().st_size // 1024
    print(f'  video -> {destino}  ({tam} kb, fondo {fondo})')


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
