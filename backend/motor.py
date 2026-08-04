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

    site = await capture_all(url, os.path.join(dst, "captura.json"), elementos=True)
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
# Se piden LAS DOS a la vez, y esa conjuncion es la que hace el trabajo: medido sobre los 53 recortes
# reales del repo, corrida alta viene siempre con tonos 1-4 (logos, botones, bandas planas) y tonos
# altos vienen siempre con corrida 1.7-3.3 (fotos nitidas). Ninguno de los 53 se descarta, que es lo
# que tiene que pasar: el material de verdad no se tira. Un LQIP cae en el unico cuadrante que queda
# libre —borroso Y colorido— y por eso se lo puede separar sin tocar nada mas.
#
# LIMITE CONOCIDO: un placeholder de menos de 8 tonos (un bloque gris, dos colores planos) NO se
# detecta. Es deliberado: bajar el umbral empezaria a descartar logos y botones reales, y perder la
# imagen del cliente es peor que mostrar un placeholder.
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
        return corrida > 8 and tonos >= 8
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


async def render(url: str, salida: str, hero: str | None = None, dur: int = 20,
                 seed: int = 7, aire: str | None = None, recapturar: bool = False,
                 bitrate: int = 8_000_000, forzar: bool = False) -> str:
    dst = os.path.join(SALIDA, _dominio(url))
    pm_path = os.path.join(dst, "pagemodel.json")
    site_path = os.path.join(dst, "site.json")
    if recapturar or not os.path.exists(site_path):
        print(f"capturando {url} ...")
        await capturar(url, dst)
    else:
        # EL MODELO SE REHACE SIEMPRE, la captura no. Son dos cosas distintas: bajar el sitio cuesta
        # medio minuto de red y no cambia si no cambio el sitio; interpretarlo cuesta milisegundos y
        # cambia cada vez que se toca el interprete. Reusar el modelo cacheado hacia que un arreglo de
        # la lectura del DOM no se viera en el video hasta acordarse de pasar --recapturar.
        print(f"reusando la captura de {dst} y rehaciendo el modelo  (--recapturar para volver a bajarla)")
        with open(site_path, encoding="utf-8") as f:
            site = json.load(f)
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
    a = ap.parse_args()

    if a.heroes:
        print(f"{'id':<12} {'necesita':<14} {'beats':<6} nombre")
        for h in heroes_disponibles():
            print(f"{h['id']:<12} {','.join(h.get('necesita') or ['nada']):<14} "
                  f"{h.get('beats', '?'):<6} {h.get('nombre', '')}")
        return
    if not a.url:
        ap.error("hace falta una URL (o --heroes)")

    salida = a.salida or os.path.join(SALIDA, f"{_dominio(a.url)}-{a.hero or 'auto'}-{a.dur}s.mp4")
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    ruta = asyncio.run(render(a.url, salida, hero=a.hero, dur=a.dur, seed=a.seed, forzar=a.forzar,
                              aire=a.aire, recapturar=a.recapturar))
    print(f"\n{ruta}  ({os.path.getsize(ruta) // 1024} kb)")


if __name__ == "__main__":
    main()
