"""MOTOR — de una URL a un MP4 vertical, en un solo comando.

POR QUE EXISTE
Todas las piezas del camino estaban hechas y NINGUNA estaba conectada: la captura del sitio vive en
site_capture, el modelo semantico en pagemodel, los recortes en element_extract, la tira scrolleable en
captura_hero, la traduccion a DATOS en tools/anthem-datos.mjs (Node) y el render en render3d (Python +
Chrome). Para sacar un video habia que encadenarlas a mano cada vez, y eso significaba dos cosas: que
nadie que no fuera el autor podia usar el motor, y —peor— que el camino COMPLETO no se probaba nunca.
Cada pieza andaba sola; el unico que sabia si andaban juntas era el que se acordaba del orden.

Este archivo es ese orden, escrito una vez. Es tambien el contrato que va a llamar la interfaz cuando
exista: el selector de hero de la pantalla es este `--hero`.

    python backend/motor.py https://linear.app
    python backend/motor.py https://stripe.com --hero mosaico --dur 30 --seed 3
    python backend/motor.py --heroes            (que heroes hay y que necesita cada uno)

QUE HACE FALTA PARA CADA HERO
Un hero declara su material y el registro no ofrece uno que no se pueda armar: un telefono con la
pantalla negra es peor que no tener telefono. `--heroes` imprime esa tabla leyendola de los modulos,
que son la unica fuente de verdad.

CACHE
La captura de un sitio tarda entre veinte y cuarenta segundos y el render entre uno y tres minutos.
Probar cinco heroes sobre la misma pagina no puede costar cinco capturas: lo capturado se guarda por
dominio en tools/out/motor/<dominio>/ y se reusa salvo que se pase --recapturar. Sin esto, iterar
sobre el hero —que es exactamente lo que va a hacer un usuario— es insoportable.
"""
import argparse
import asyncio
import json
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)

SALIDA = os.path.join(RAIZ, "tools", "out", "motor")

import cerrojo                                             # noqa: E402  (necesita el sys.path de arriba)


def _dominio(url: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", url.split("//")[-1].split("/")[0].lower()).strip("-")


def heroes_disponibles() -> list[dict]:
    """Lee el registro de heroes de los modulos. Node porque son modulos ES del navegador.

    Se lee y no se copia a proposito: una lista duplicada aca se desincroniza el dia que alguien
    agregue un hero, y el sintoma seria un selector que ofrece algo que no existe.
    """
    js = (
        "const m=await import('file://" + RAIZ.replace("\\", "/") + "/render3d/demo/heroes/index.js');"
        "console.log(JSON.stringify(m.HEROES.map(h=>h.meta)))"
    )
    r = subprocess.run([("node"), "--input-type=module", "-e", js],
                       capture_output=True, text=True, cwd=RAIZ)
    if r.returncode != 0:
        raise RuntimeError("no se pudo leer el registro de heroes: " + (r.stderr or "").strip()[:400])
    return json.loads(r.stdout.strip().splitlines()[-1])


async def capturar(url: str, dst: str, con_tira: bool = True) -> dict:
    """Captura TODO lo que el motor puede necesitar, en UNA sola apertura de Chromium.

    Abrir el navegador es el paso caro del proceso (entre veinte y cuarenta segundos con la espera de
    red). Hacerlo tres veces —una para el modelo, una para los recortes, una para la tira— triplicaba
    el costo del video entero para no ganar nada.
    """
    os.makedirs(dst, exist_ok=True)
    from site_capture import capture_all
    from pagemodel import build_pagemodel

    # .PNG, NO .JSON. Ese segundo argumento es donde `capture_all` escribe el SCREENSHOT, y Playwright
    # deduce el formato de la extension: con ".json" tiraba "Unsupported screenshot mime type" en cada
    # captura y `site["screenshot"]` quedaba None en las siete paginas del repo. No sale un video peor
    # —el screenshot NO entra al video, ver pagemodel.py:562 §4.3— pero es la unica imagen de la pagina
    # tal como la vimos, y sin ella no se puede auditar a mano si la captura fue la pagina de verdad.
    # De los seis llamadores de `capture_all`, este era el unico que no pasaba una imagen.
    #
    # El nombre de los recortes NO cambia: se derivan de `Path(out_path).stem`, y el stem de las dos
    # variantes es "captura". Siguen siendo captura_el0.png y siguen emparejando mas abajo.
    site = await capture_all(url, os.path.join(dst, "captura.png"), elementos=True)
    # SE GUARDA LA CAPTURA ENTERA, no solo el texto. Lo caro de este proceso es abrir el navegador y
    # esperar la red; con la captura completa en disco, el modelo semantico se puede REHACER sin volver
    # a bajar el sitio. Guardando solo `content` habia que recapturar cada vez que cambiaba una linea
    # del interprete, y eso mordio tres veces: se corregia la lectura del DOM, se renderizaba, y el
    # video salia con el modelo viejo porque el pagemodel del cache no se habia tocado.
    with open(os.path.join(dst, "site.json"), "w", encoding="utf-8") as f:
        json.dump(site, f, ensure_ascii=False, indent=1, default=str)

    # EL BRIEF SALE DEL DOM, GRATIS. Sin brief, `build_pagemodel` devuelve el bloque `semantica`
    # entero VACIO y no falla: un modelo valido que no dice nada. La primera corrida de punta a punta
    # lo mostro de golpe — Linear en vivo salio con cero frases, cero cifras, sin CTA y con la marca
    # puesta en "LINEAR.APP". Ver backend/semantica_gratis.py.
    from semantica_gratis import brief_de
    brief = brief_de(site, url)
    pm = build_pagemodel(url, site=site, brief=brief)
    # El nombre de la marca tambien: `build_pagemodel` sin brief cae al dominio y pone el TLD adentro
    # del cuadro mas grande de la pieza.
    if brief.get("brand") and (not pm.get("brand") or "." in str(pm.get("brand"))):
        pm["brand"] = brief["brand"]
    with open(os.path.join(dst, "pagemodel.json"), "w", encoding="utf-8") as f:
        json.dump(pm, f, ensure_ascii=False, indent=1)

    if con_tira:
        # La tira va en su propia visita porque necesita un viewport MOVIL y `is_mobile`, y cambiarle
        # el viewport a la pagina ya cargada no le devuelve el layout responsive de forma confiable:
        # muchas landings deciden su layout una sola vez, al montar.
        from playwright.async_api import async_playwright
        from site_capture import _CTX
        from captura_hero import capturar_tira, ANCHO_MOVIL, ESCALA
        async with async_playwright() as p:
            br = await p.chromium.launch(args=["--no-sandbox"])
            ctx = await br.new_context(viewport={"width": ANCHO_MOVIL, "height": 780},
                                       device_scale_factor=ESCALA, is_mobile=True,
                                       has_touch=True, ignore_https_errors=True, **_CTX)
            pg = await ctx.new_page()
            try:
                await pg.goto(url, wait_until="domcontentloaded", timeout=45000)
                try:
                    await pg.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
                png, vp, total = await capturar_tira(pg)
                with open(os.path.join(dst, "tira.png"), "wb") as f:
                    f.write(png)
                pm["_tira"] = {"viewport": vp, "alto": total}
            except Exception as e:
                # Sin tira NO se aborta: el registro de heroes simplemente no va a ofrecer telefono ni
                # portatil, y el mosaico o el prisma sostienen la pieza igual. Un sitio que bloquea al
                # bot movil es un caso frecuente, no un error del motor.
                print(f"  (sin tira: {type(e).__name__} — los heroes de dispositivo no van a estar)")
            await br.close()
    with open(os.path.join(dst, "pagemodel.json"), "w", encoding="utf-8") as f:
        json.dump(pm, f, ensure_ascii=False, indent=1)
    return pm


# ¿LO QUE SE CAPTURO ES LA PAGINA, O UN MURO?
#
# El motor construyo 20 segundos enteros sobre una pagina de error de CloudFront: en el cuadro 87 se
# lee "Request blocked. We cant connect to the server for..." con el Request ID impreso, y la pieza se
# entrego sin una sola queja. De las 7 capturas cacheadas del repo, DOS estaban podridas — una era ese
# error del CDN y la otra una pantalla anti-bot cuya MARCA quedo como "HUMAN VERIFICA". Un 29%.
#
# La senal ya estaba a la vista y nadie la leia: el propio log del render imprime "0 frases · 0 cifras
# · cta NINGUNO", y una pagina real no da eso nunca. Esto es esa lectura.
#
# DOS REGLAS INDEPENDIENTES, las dos calibradas contra las 6 capturas reales que quedan en el repo:
#
#   SIN MATERIAL   cero frases Y cero cifras Y sin CTA. La peor pagina real medida —mercadolibre—
#                  trae 2 frases, 1 cifra y claim de 54 caracteres, asi que el piso de cero deja un
#                  margen amplio y no puede acusar a una pagina pobre pero legitima.
#   VOCABULARIO    la marca o los textos dicen lo que dice un muro y no lo que dice un negocio. Se
#                  compara sin tildes y en minusculas contra frases que ninguna marca usa de si misma.
#
# Se devuelve el MOTIVO en texto y no un booleano: quien lo lea tiene que poder decir por que, porque
# la salida correcta ante esto no es adivinar sino volver a capturar.
_MUROS = (
    "human verifica", "verifying you are human", "are you a robot", "checking your browser",
    "just a moment", "attention required", "access denied", "acceso denegado",
    "request blocked", "solicitud bloqueada", "403 forbidden", "404 not found",
    "captcha", "enable javascript", "habilita javascript", "cloudfront", "cloudflare",
    "service unavailable", "servicio no disponible", "too many requests",
)


def _plano(t):
    import unicodedata
    t = unicodedata.normalize("NFD", str(t or ""))
    return "".join(c for c in t if unicodedata.category(c) != "Mn").lower()


def pagina_sospechosa(datos):
    """Devuelve el motivo (texto) si la captura no parece la pagina del cliente, o None."""
    d = datos or {}
    frases = [f for f in (d.get("frases") or []) if str(f).strip()]
    cifras = d.get("datos") or []
    cta = str(d.get("cta") or "").strip()
    if not frases and not cifras and not cta:
        return "0 frases, 0 cifras y sin CTA: no hay NADA que decir, y una pagina real nunca da eso"
    campos = [d.get("marca"), d.get("claim"), (d.get("bloque") or {}).get("titulo"), cta]
    campos += list(frases)
    for c in campos:
        p = _plano(c)
        for muro in _MUROS:
            if muro in p:
                return 'dice "%s" (en "%s"): es un muro anti-bot o un error del CDN, no la pagina' % (
                    muro, str(c)[:60])
    return None

# EL FILTRO DE PLACEHOLDERS, Y VIVE ACA ARRIBA PARA QUE SE PUEDA PROBAR.
#
# Estaba anidado dentro de `datos_de`, o sea que ninguna prueba podia importarlo: el unico filtro que
# separa la foto real del cliente de su LQIP borroso —el que se descarga primero, se ve como un
# rectangulo de bloques de color y ocupa medio cuadro— corria en el camino de captura sin una sola
# compuerta. Si se rompia, las siete rapidas seguian en verde. Lo encontro el dueño en un video, no
# nosotros. Ahora lo cubre `tools/placeholder-check.py`.
#
# COMO SEPARA, que no es obvio y por eso conviene dejarlo escrito. Se miden dos cosas sobre el gris:
#
#   corrida  cuantos pixeles hay por cada cambio de valor a lo largo de una fila. Una imagen borrosa
#            o de bloques grandes cambia poco: corrida ALTA. Texto o una foto nitida cambia todo el
#            tiempo: corrida BAJA.
#   tonos    cuantos de los 32 cajones del histograma tienen mas del 1% de los pixeles. Un logo plano
#            o un boton usan dos o tres; una foto —aunque este borrosa— usa muchos.
#
# Se piden LAS DOS a la vez, y esa conjuncion es la que hace el trabajo: un LQIP cae en el unico
# cuadrante que queda libre —borroso Y colorido— y por eso se lo puede separar sin tocar nada mas.
#
# EL UMBRAL DE TONOS ERA 8 Y EL COMENTARIO DECIA VEINTE. Cuando esto se escribio se midio sobre los 53
# recortes que habia, y ahi "corrida alta venia siempre con tonos 1-4". Esa frase dejo de ser cierta en
# cuanto entro material nuevo: al recapturar stripe.com el 2026-08-06 aparecieron DOS recortes reales
# con corrida alta y tonos 8-9, y los dos se descartaban.
#
#   captura_el11  el degradado naranja-rosa de la portada, arte de marca a resolucion completa
#                 corrida 24.1 · tonos 9  ·  se lo tiraba por SUAVE, que es como fue disenado
#   captura_el5   la tarjeta de Stripe Atlas, con texto negro perfectamente legible
#                 corrida  9.9 · tonos 8  ·  saltos de 121 niveles, o sea todo lo contrario a borroso
#
# Medidos los LQIP contra ellos, el hueco es amplio y esta en `tonos`: los dos LQIP que fabrica
# `placeholder-check` dan 21 y 23, el material real da 8 y 9. El umbral pasa a 16 —el medio del
# hueco— y no a 20 como decia el texto, para dejar margen de los dos lados. Lo que fallaba no era la
# idea sino el numero: el propio comentario ya decia que un LQIP "reparte veinte".
#
# LIMITE CONOCIDO, y ahora es mas ancho: un placeholder de menos de 16 tonos NO se detecta. Es
# deliberado y la direccion es la correcta — la cabecera de `placeholder-check` lo dice sin vueltas:
# un filtro que descarta la foto del cliente es peor que no tenerlo, porque el defecto que evita es
# feo y el que causa es no mostrar al cliente.
TONOS_LQIP = 16


def es_placeholder(ruta):
    try:
        import numpy as np
        from PIL import Image
        im = Image.open(ruta).convert("L")
        a = np.asarray(im.resize((min(400, im.size[0]), min(400, im.size[1]))), dtype=np.int16)
        d = np.abs(np.diff(a, axis=1))
        corrida = d.size / max(1, int((d > 2).sum()))       # pixeles por cambio
        h = np.histogram(a, bins=32, range=(0, 255))[0].astype(float)
        h /= max(1e-9, h.sum())
        tonos = int((h > 0.01).sum())
        return corrida > 8 and tonos >= TONOS_LQIP
    except Exception:
        return False                                        # ante la duda, se conserva

def datos_de(pagemodel_path: str, dst: str, seed: int | None = None) -> dict:
    """pagemodel -> DATOS + aire + adn, con el puente de Node.

    El puente esta en JS y no se reescribe en Python porque es el MISMO codigo que corre en el
    navegador para la demo: dos implementaciones de la regla anti-invencion es una que se olvida.
    """
    salida = os.path.join(dst, "datos.json")
    # LA SEMILLA VIAJA AL PUENTE. Sin ella el aire es una funcion pura de la pagina: `saas` y `app`
    # caen los dos en "tecnico", el respaldo de un rubro desconocido tambien, y en la practica todo lo
    # que se rendia salia del mismo aire de los once. Con la semilla, la pieza puede vestir cualquier
    # aire de la FAMILIA que su rubro autoriza, asi que cambiar --seed cambia de verdad la direccion de
    # arte y no solo el orden de las escenas.
    cmd = ["node", os.path.join("tools", "anthem-datos.mjs"), pagemodel_path, salida]
    if seed is not None:
        cmd.append(str(seed))
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=RAIZ)
    if r.returncode != 0:
        raise RuntimeError("anthem-datos fallo: " + (r.stderr or r.stdout or "").strip()[:500])
    print("  " + (r.stdout or "").strip().replace("\n", "\n  "))
    with open(salida, encoding="utf-8") as f:
        return json.load(f)


def _aires_de_hero(hid):
    """A que aires se le ofrece este hero. `[]` = a todos. `None` = no existe.

    Se le pregunta al REGISTRO de heroes/index.js, que es el mismo que usa el motor para decidir, en
    vez de mantener una copia aca. Una copia se desincroniza el dia que alguien toque un aire, y el
    aviso pasaria a mandar al usuario a un aire que ya no sirve — peor que no avisar.
    """
    import subprocess as _sp
    idx = os.path.join(RAIZ, "render3d", "demo", "heroes", "index.js").replace("\\", "/")
    js = ("import('file:///" + idx + "').then(m => { "
          "const id = process.argv[1]; "
          "if (!m.porId(id)) return console.log('__NO__'); "
          "console.log(m.airesDe(id).join(',')) })")
    try:
        r = _sp.run(["node", "--input-type=module", "-e", js, "--", hid],
                    capture_output=True, text=True, cwd=RAIZ, timeout=30)
        out = (r.stdout or "").strip()
        if out == "__NO__":
            return None
        return [x for x in out.split(",") if x]
    except Exception:
        return []


def captura_rancia(site) -> str:
    """Devuelve por que la captura cacheada NO sirve, o "" si esta al dia.

    `pagina_sospechosa` ya cuida de no construir sobre una captura que no es la pagina. Esto cuida el
    otro caso, que era silencioso: una captura que SI es la pagina pero la escribio una version
    anterior del extractor, con menos claves de las que el interprete lee hoy.

    Medido sobre las 7 capturas del repo: stripe-com (27/7 18:08) y mercadolibre (27/7 19:32) tienen
    UNA clave, `content` — son anteriores a que la captura devolviera `elementos`. Las otras cinco,
    todas posteriores a las 20:06 de ese dia, tienen las seis. `build_pagemodel` sobre una de las
    viejas devuelve un modelo SIN elementos y sin una sola queja: los 12 recortes de stripe-com estan
    en disco, al lado del site.json, y ninguno llego nunca a un video. Comprobado A/B pasando el site
    completo de linear-app por `build_pagemodel` (7 elementos) y el mismo degradado a `{content}` (0).

    El criterio es la AUSENCIA de la clave, no que venga vacia: una lista vacia es una respuesta
    legitima —la pagina no dio recortes— y esa captura no hay que rehacerla.
    """
    from site_capture import CLAVES_CAPTURA
    if not isinstance(site, dict):
        return "el site.json no es un objeto"
    faltan = [k for k in CLAVES_CAPTURA if k not in site]
    if not faltan:
        return ""
    return "la escribio una version anterior del extractor (le faltan: %s)" % ", ".join(sorted(faltan))


# EL BITRATE ES LA CALIDAD DEL VIDEO ENTERO, porque no hay segunda codificacion: `grabar_mp4` REMUXEA
# con `-c copy` lo que codifico Chromium, asi que no queda un CRF que compense despues. Lo que se le
# pide aca es literalmente lo unico que decide cuantos artefactos tiene la pieza.
#
# ESTABA EN 8 Y NO HABIA NINGUNA RAZON ESCRITA. Sale del commit que quito la doble codificacion
# (7a50b37), cuyo tema era otro; `render3d.grabar_mp4` declara 12 por su cuenta desde entonces, o sea
# que este 8 la estaba pisando para abajo sin decirlo. Medido sobre basecamp/editorial/semilla 11, 331
# cuadros de `toro` y `cierre`, con el bloqueo 8x8 (energia de borde EN los limites de bloque contra la
# de en medio; 1.00 seria no tener bloques):
#
#     pedido    archivo   real      bloqueo p95
#      8 Mbps   19.0 MB   6.90      2.824
#     12 Mbps   30.4 MB  11.04      2.438   (-14%)
#     20 Mbps   49.2 MB  17.87      2.074   (-27%)
#
# Se elige 12 y no 20. No hay codo en la curva —la mejora sigue bajando parejo— asi que el corte es por
# tamaño: 20 Mbps son 49 MB en una pieza de 20 s y ~74 MB en una de 30, que ya molesta para subir. Y la
# mediana casi no se mueve en ningun caso (1.648 / 1.579 / 1.455) porque el grueso de ese numero NO es
# compresion: son los bordes duros de la propia geometria cayendo sobre la reticula de 8x8. Lo que
# mejora es el p95, que son los cuadros de mas movimiento — justo donde se ven los bloques.
async def render(url: str, salida: str, hero: str | None = None, dur: int = 20,
                 seed: int = 7, aire: str | None = None, recapturar: bool = False,
                 bitrate: int = 12_000_000, forzar: bool = False, escena: str | None = None) -> str:
    dst = os.path.join(SALIDA, _dominio(url))
    pm_path = os.path.join(dst, "pagemodel.json")
    site_path = os.path.join(dst, "site.json")
    # SE REUSA LA CAPTURA, PERO NO A CIEGAS. El unico criterio era que el archivo EXISTIERA, y eso
    # alcanzaba para reusar una captura escrita por una version anterior del extractor: el modelo se
    # rehacia sobre menos datos de los que hoy se leen y salia incompleto EN SILENCIO. Ver
    # `captura_rancia`: les paso a stripe-com y a mercadolibre, que perdieron sus 12 y 8 recortes.
    site = None
    rancia = ""
    if not recapturar and os.path.exists(site_path):
        try:
            with open(site_path, encoding="utf-8") as f:
                site = json.load(f)
            rancia = captura_rancia(site)
        except Exception as e:
            site, rancia = None, f"el site.json no se puede leer ({str(e)[:60]})"
    if rancia:
        print(f"  la captura cacheada esta vieja: {rancia}")
        print("  se vuelve a bajar la pagina (reusarla daria un video con menos material del que hay).")
    if recapturar or site is None or rancia:
        print(f"capturando {url} ...")
        await capturar(url, dst)
    else:
        # EL MODELO SE REHACE SIEMPRE, la captura no. Son dos cosas distintas: bajar el sitio cuesta
        # medio minuto de red y no cambia si no cambio el sitio; interpretarlo cuesta milisegundos y
        # cambia cada vez que se toca el interprete. Reusar el modelo cacheado hacia que un arreglo de
        # la lectura del DOM no se viera en el video hasta acordarse de pasar --recapturar.
        print(f"reusando la captura de {dst} y rehaciendo el modelo  (--recapturar para volver a bajarla)")
        from semantica_gratis import brief_de
        from pagemodel import build_pagemodel
        brief = brief_de(site, url)
        pm = build_pagemodel(url, site=site, brief=brief)
        if brief.get("brand") and (not pm.get("brand") or "." in str(pm.get("brand"))):
            pm["brand"] = brief["brand"]
        if os.path.exists(pm_path):
            try:
                with open(pm_path, encoding="utf-8") as f:
                    pm["_tira"] = json.load(f).get("_tira")
            except Exception:
                pass
        with open(pm_path, "w", encoding="utf-8") as f:
            json.dump(pm, f, ensure_ascii=False, indent=1)

    d = datos_de(pm_path, dst, seed)
    # NO SE CONSTRUYE UN VIDEO SOBRE UN MURO. Ver `pagina_sospechosa` arriba: ya paso, y salio una
    # pieza de 20 segundos con el Request ID de CloudFront impreso en pantalla.
    _motivo = pagina_sospechosa(d.get("datos"))
    if _motivo and not forzar:
        print("  LA CAPTURA NO PARECE LA PAGINA: " + _motivo)
        print("  No se construye el video. Opciones: --recapturar (volver a bajarla) o --forzar (igual).")
        raise SystemExit(2)
    if _motivo:
        print("  (--forzar: la captura parece un muro y se construye igual) " + _motivo)
    with open(pm_path, encoding="utf-8") as f:
        pm = json.load(f)

    # LOS RECORTES SE SIRVEN DESDE EL DISCO, y hay que EMPAREJARLOS, no adivinarlos.
    #
    # La extraccion guarda los PNG en <dst>/elementos/ Y ademas los sube a Cloudinary, y en el
    # pagemodel queda la URL REMOTA. La primera version armaba la ruta local con el basename de esa
    # URL — y no coinciden: el remoto es "el_captura_el0.png" y el archivo en disco es
    # "captura_el0.png". El TextureLoader no encontraba nada, fallaba EN SILENCIO (su callback de
    # error existe y lo unico que hace es seguir), y el hero de mosaico y la escena de columna salian
    # vacios en todos los videos hechos desde una URL real. En los fixtures del repo no pasaba porque
    # ahi los nombres si coinciden: el defecto solo existia en el camino de produccion.
    #
    # Se empareja por el token "elN", que es lo unico estable entre los dos nombres. Si no hay archivo
    # local, se deja la URL REMOTA: el navegador del render tiene red y bajarla es mejor que no
    # mostrar nada.
    dir_el = os.path.join(dst, "elementos")
    locales = {}
    if os.path.isdir(dir_el):
        for f in os.listdir(dir_el):
            m = re.search(r"(el\d+)", f)
            if m:
                locales[m.group(1)] = f
    # ---------------------------------------------------------------- recortes que son PLACEHOLDERS
    # Muchos sitios sirven una miniatura borrosa (LQIP) mientras carga la foto de verdad, y la cambian
    # por JS al terminar. Si la captura llega antes del cambio, el archivo queda con el tamaño de la
    # foto final —959x1400— y el CONTENIDO de una imagen de diez por quince pixeles estirada. En el
    # video de oatly.com eso salio como un rectangulo de bloques rosados ocupando medio cuadro, y lo
    # encontro Thiago, no las compuertas: el archivo pesaba y medía como una foto buena.
    #
    # No alcanza con mirar el tamaño ni con medir "cuanto detalle fino tiene": un boton de CTA tambien
    # es plano y no por eso esta roto. Las dos señales juntas si lo separan — BLOQUES LARGOS mas
    # PALETA DE FOTO. Un boton repite el mismo pixel decenas de veces pero tiene dos tonos; un LQIP
    # repite igual y reparte veinte, porque abajo hay una foto.

    descartados = 0
    faltan = 0
    for e in d["datos"].get("elementos", []):
        if e["url"].startswith("/assets/"):
            continue
        m = re.search(r"(el\d+)", os.path.basename(e["url"]))
        f = locales.get(m.group(1)) if m else None
        if f:
            if es_placeholder(os.path.join(dir_el, f)):
                e["_descartar"] = True
                descartados += 1
                continue
            e["url"] = "/assets/elementos/" + f
        else:
            faltan += 1
    if faltan:
        print(f"  ({faltan} recortes sin archivo local: se piden por red)")
    if descartados:
        d["datos"]["elementos"] = [e for e in d["datos"]["elementos"] if not e.get("_descartar")]
        print(f"  ({descartados} recorte/s descartado/s: son placeholders borrosos, no la foto real)")

    spec = {
        "W": 1080, "H": 1920, "fps": 30,
        # `dur` es el tope del arnes de grabacion; el largo REAL lo fija el guion y lo devuelve la
        # pagina. Se deja holgado a proposito: un tope corto trunca la pieza sin avisar.
        "dur": dur + 15,
        "durObjetivo": dur,
        "seed": seed,
        "pagina": "demo/demo.html",
        "aire": aire or d["aire"],
        "datos": d["datos"],
        "dna": d.get("dna"),
        # CUATRO MUESTRAS, NO DOS. El motor ya pedia cuatro por defecto y esta linea las bajaba a dos
        # para que el render entrara en tiempo: con dos, las dos muestras caen a 8.8 ms una de otra y
        # todo lo que se mueve en continuo sale DUPLICADO en vez de barrido.
        # Medido en esta maquina (basecamp, 20 s, 600 cuadros, GPU): el bucle de dibujo tardaba 11.8 ms
        # por cuadro contra un presupuesto de 33.3. Sobraba casi el triple. La razon para recortar a dos
        # dejo de existir el dia que el render paso a rendir mas rapido que tiempo real.
        "obturador": {"angulo": 190, "muestras": 4},
    }
    if hero:
        spec["hero"] = hero
    # UNA SOLA ESCENA, CON LA PAGINA Y LA PALETA DE VERDAD.
    #
    # `main.js` ya sabia hacerlo (`spec.soloEscena`, linea 423) y no habia forma de pedirlo desde aca:
    # el unico que lo usaba era `backend/render_escena.py`, que arma la pieza con los datos de demo y
    # el mundo de ANTHEM. Para auditar una escena eso no alcanza — la mitad de los defectos de contraste
    # de esta tanda solo existen en MUNDO CLARO, y el mundo claro lo decide la pagina del cliente.
    #
    # Sin esto, verificar una escena era ruleta de semillas: hay que rendir la pieza entera y rezar que
    # el guion la sortee. Buscando `titular` salieron dos piezas sin ella, o sea dos renders tirados —y
    # predecir el plan por afuera tampoco sirve, porque el motor no corre al BPM del aire. Con `--escena`
    # es un render y siempre trae lo que se pidio.
    if escena:
        spec["soloEscena"] = escena
    tira = os.path.join(dst, "tira.png")
    if os.path.exists(tira):
        spec["tira"] = "/assets/tira.png"
        spec["tiraViewport"] = (pm.get("_tira") or {}).get("viewport", 1560)

    import render3d
    print(f"renderizando: aire {spec['aire']} · hero {hero or 'automatico'} · {dur}s · semilla {seed}")
    await render3d.grabar_mp4(spec, salida, raiz_assets=dst, gpu=True, bitrate=bitrate,
                              log=lambda *a: None)
    # LO QUE NO CARGO, SE DICE. El render silencia su log entero (la linea de arriba) porque imprime
    # una linea por cuadro, y con eso se perdia tambien el unico aviso que importa: cuantos recortes no
    # cargaron. Se lee del plan que el render acaba de escribir, que es quien lo sabe.
    try:
        with open(str(salida) + '.plan.json', encoding='utf-8') as _f:
            _plan = json.load(_f)
        _faltan = _plan.get('faltan') or []
        if _faltan:
            print('  ATENCION: %d recorte/s no cargaron y su escena queda sin imagen: %s'
                  % (len(_faltan), ', '.join(str(x) for x in _faltan[:4])))

        # SI PEDISTE UN HERO Y SALIO OTRO, TE LO DECIMOS — Y TE DECIMOS COMO CONSEGUIRLO.
        #
        # Reclamo textual del usuario: "los heros no pude usarlos". Y tenia razon por dos motivos
        # distintos, los dos silenciosos:
        #
        #   1. la escena `hero` entraba al plan por SORTEO, asi que `--hero X` podia renderizar un video
        #      perfecto que no mostraba ningun hero. Arreglado en guion.js (`fija`).
        #   2. y aun con la escena adentro, el REGISTRO puede rechazar el hero pedido: la geometria
        #      abstracta esta restringida por aire a proposito —"no tienen ningun sentido esas formas,
        #      son formas para algo tecnologico, no para una marca de cafes"—. Ahi el motor elegia otro
        #      y no decia nada. Pedias `gota` sobre stripe.com y salia `vitrina`, sin una linea.
        #
        # Rechazar esta bien; callarse no. Lo que hacia falta es que el aviso traiga la SALIDA: en que
        # aires si le queda, para poder pedirlo con `--aire`.
        #   3. y hay un tercer caso que este aviso CONFUNDIA con el segundo: que la escena de hero no
        #      haya entrado a la pieza. Ahi no sobro ni falto registro ni material — no hubo lugar en
        #      la duracion pedida. El aviso igual imprimia la lista de aires y mandaba a reintentar con
        #      `--aire tecnico`, que no arregla nada porque el problema es el presupuesto de beats.
        #      Visto con `--hero pulso --dur 12`: tramos `gancho,apertura,mesa,cierre`, `heroes: []`.
        _pedido = spec.get('hero')
        _salieron = _plan.get('heroes') or []
        _tramos = [t.split(':')[0] for t in str(_plan.get('tramos') or '').split(',') if t]
        if _pedido and _pedido not in _salieron and 'hero' not in _tramos:
            print('  ATENCION: pediste el hero "%s" y la escena de hero NO ENTRO en la pieza.' % _pedido)
            print('    No es el registro de aires ni el material: no hubo lugar en %ss.' % spec.get('dur'))
            print('    Los tramos que entraron: %s' % ', '.join(_tramos))
            print('    Pedi mas duracion:')
            print('      python backend/motor.py %s --hero %s --dur %d'
                  % (url, _pedido, int(spec.get('dur') or 20) + 8))
        elif _pedido and _pedido not in _salieron:
            print('  ATENCION: pediste el hero "%s" y salio %s.'
                  % (_pedido, ('"%s"' % _salieron[0]) if _salieron else 'ninguno'))
            _aires = _aires_de_hero(_pedido)
            if _aires is None:
                print('    Ese hero no existe. Corre `python backend/motor.py --heroes` para ver la lista.')
            elif not _aires:
                print('    Le queda a cualquier aire, asi que lo que falto es MATERIAL de la pagina')
                print('    (necesita recortes o la tira, y esta pagina no dio suficiente).')
            else:
                print('    El registro solo se lo ofrece a estos aires: %s' % ', '.join(_aires))
                print('    Esta pagina cayo en "%s". Para forzarlo:' % spec.get('aire'))
                print('      python backend/motor.py %s --hero %s --aire %s' % (url, _pedido, _aires[0]))
    except Exception:
        pass                                            # el video ya se grabo; esto es un aviso
    return salida


def main():
    ap = argparse.ArgumentParser(description="URL -> reel vertical 9:16")
    ap.add_argument("url", nargs="?", help="la pagina a convertir")
    ap.add_argument("--hero", help="que objeto protagoniza (ver --heroes)")
    # 25 Y NO 30. La duracion no es un gusto: es cuanto material tiene la pagina. Una landing da cuatro
    # o cinco frases y dos o tres recortes utiles, y treinta segundos obligan al guion a poner mas
    # escenas de las que ese material sostiene — las ultimas terminan repitiendo lo que ya se dijo.
    # Thiago lo diagnostico mirando el video: "el posible problema que veo yo es la duracion, un video
    # de 30 segundos yo lo bajaria a 25". Con 25 entran dos escenas menos y ninguna repite.
    ap.add_argument("--dur", type=int, default=25, help="duracion objetivo en segundos (15/20/25/30)")
    ap.add_argument("--seed", type=int, default=7, help="cambiala para OTRA version del mismo video")
    ap.add_argument("--aire", help="forzar un aire en vez del que elige el rubro")
    ap.add_argument("--salida", help="ruta del mp4")
    ap.add_argument("--recapturar", action="store_true", help="volver a bajar la pagina")
    ap.add_argument("--forzar", action="store_true",
                    help="construir aunque la captura parezca un muro anti-bot o un error del CDN")
    ap.add_argument("--heroes", action="store_true", help="listar los heroes y que necesita cada uno")
    # El parametro existia en `render()` desde siempre y NO habia forma de tocarlo desde la linea de
    # comandos: para probar otra calidad habia que importar el modulo a mano. Es el unico control de
    # calidad del video que hay, asi que tiene que estar a la vista.
    ap.add_argument("--escena", help="rendir UNA escena sola, con la pagina y la paleta reales "
                                     "(para auditarla sin ruleta de semillas)")
    ap.add_argument("--bitrate", type=float, default=12.0,
                    help="calidad del video en Mbps (12 por defecto; 20 para bloques mas limpios "
                         "a costa de 2.6x el peso)")
    a = ap.parse_args()

    if a.heroes:
        print(f"{'id':<12} {'necesita':<14} {'beats':<6} nombre")
        for h in heroes_disponibles():
            print(f"{h['id']:<12} {','.join(h.get('necesita') or ['nada']):<14} "
                  f"{h.get('beats', '?'):<6} {h.get('nombre', '')}")
        return
    if not a.url:
        ap.error("hace falta una URL (o --heroes)")

    # EL CERROJO VA ACA, antes de levantar Chromium. Un render en paralelo con `gates:guard` es lo que
    # colgo la maquina el 4 de agosto de 2026 — ver backend/cerrojo.py.
    cerrojo.exigir(f"motor.py {a.url}")

    salida = a.salida or os.path.join(SALIDA, f"{_dominio(a.url)}-{a.escena or a.hero or 'auto'}-{a.dur}s.mp4")
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    ruta = asyncio.run(render(a.url, salida, hero=a.hero, dur=a.dur, seed=a.seed, forzar=a.forzar,
                              aire=a.aire, recapturar=a.recapturar,
                              bitrate=int(a.bitrate * 1_000_000), escena=a.escena))
    print(f"\n{ruta}  ({os.path.getsize(ruta) // 1024} kb)")


if __name__ == "__main__":
    main()
