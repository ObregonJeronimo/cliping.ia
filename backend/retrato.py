"""RETRATO — el análisis profundo de una página, escrito PARA UN MOTOR 3D.

POR QUÉ EXISTE, Y POR QUÉ NO ES "MÁS ANÁLISIS"
==============================================

El repo ya analiza mucho: `pagemodel.json` trae paleta, tipografía, forma, densidad, ánimo, señales de
modernidad y semántica. El problema no era que faltara análisis: era que **Bóveda lo ignoraba**. Las
doce primeras plantillas leían siete campos —marca, claim, frases, cifras, CTA, dominio, rótulo— y
componían el resto con números que yo elegí a ojo. O sea que el motor medía una página con precisión y
después construía el mismo espacio para todas.

El síntoma es exactamente el que el usuario señaló: doce plantillas que se ven bien pero que no se
sienten *de esa marca*. Un sitio denso y anguloso y uno aireado y redondeado producían la misma
columnata, con los mismos anchos, la misma velocidad de cámara y la misma cantidad de capas.

LA REGLA DE ESTE ARCHIVO
------------------------

**Cada campo tiene que ser algo que una plantilla pueda USAR.** No hay una sola medición acá que no
tenga un consumidor concreto del otro lado. Si mañana un campo deja de leerse, se borra: un número
medido con cuidado que nadie mira es peor que no medirlo, porque parece que el motor lo tiene en cuenta.

Por eso todo lo que sale de acá viene con su destino escrito al lado, y por eso hay una sección
`recetas` que traduce las mediciones a los parámetros que las plantillas piden de verdad: velocidad de
vuelo, cantidad de capas, radio de las aristas, cuánto dura cada tiempo.

DE DÓNDE SALE CADA COSA
-----------------------

    site.json        el DOM leído: titulares, párrafos, CTAs, navegación, testimonios, imágenes
    pagemodel.json   el ADN ya destilado: paleta, tipografía, forma, densidad, ánimo, semántica
    tira.png         LA PÁGINA ENTERA EN PÍXELES — y esto es lo que nadie estaba mirando
    elementos/*.png  los recortes reales, con sus dimensiones nativas

La tira es la fuente más rica y la más ignorada. Es una imagen de 1080 × 8190 que contiene la página
completa tal como la ve un humano: de ahí salen el ritmo de las secciones, cuánto aire respira el
diseño, dónde vive el acento y qué tan movida es la composición. Nada de eso está en el DOM.

LO QUE ESTE ARCHIVO NO HACE
---------------------------

- **No inventa.** Si la página no dio testimonios, `pruebas.testimonios` es 0 y las plantillas componen
  sin ese tiempo. Un cero es un dato; un uno inventado es una mentira firmada por la marca del cliente.
- **No renderiza.** Cuesta segundos de CPU sobre imágenes que ya están en disco. Se puede correr en
  cada build sin pensarlo.
- **No decide.** Propone afinidades con un puntaje y explica el porqué; la plantilla la elige el
  usuario, y si elige una con afinidad baja se construye igual.
"""
from __future__ import annotations

import json
import math
import os

import numpy as np
from PIL import Image


# ---------------------------------------------------------------------------- utilidades de color

def _hex(rgb) -> str:
    return "#%02x%02x%02x" % (int(rgb[0]), int(rgb[1]), int(rgb[2]))


def _lum(rgb) -> float:
    """Luminancia relativa sRGB (WCAG). Sobre 0..255.

    OJO: esto opera sobre CANALES sRGB de una imagen, que es lo correcto acá. La trampa documentada en
    CLAUDE.md es la contraria —medir sobre `.r/.g/.b` de un `THREE.Color`, que salen en lineal— y no
    aplica: acá los píxeles vienen de un PNG y son sRGB de verdad.
    """
    c = [v / 255.0 for v in rgb[:3]]
    c = [(v / 12.92) if v <= 0.04045 else (((v + 0.055) / 1.055) ** 2.4) for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def _contraste(a, b) -> float:
    la, lb = _lum(a), _lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


def _croma(rgb) -> float:
    """Saturación cruda 0..1. Sirve para separar el gris de la estructura del color de la marca."""
    mx, mn = max(rgb[:3]), min(rgb[:3])
    return 0.0 if mx == 0 else (mx - mn) / mx


# ---------------------------------------------------------------------------- la tira, en píxeles

def _leer_tira(ruta: str, alto_max: int = 4096):
    """La tira reescalada a un ancho manejable, como array de floats.

    Se reescala porque 1080 × 8190 son 8.8 millones de píxeles y todo lo que se mide acá es de grano
    grueso —bandas, ritmo, cobertura— así que trabajar a 270 de ancho da el MISMO resultado y cuesta
    dieciséis veces menos. Lo que sí se conserva es el alto relativo: el ritmo vertical es el dato.
    """
    if not os.path.exists(ruta):
        return None, (0, 0)
    im = Image.open(ruta).convert("RGB")
    w0, h0 = im.size
    escala = 270 / max(1, w0)
    w, h = 270, max(1, int(h0 * escala))
    if h > alto_max:
        h = alto_max
    im = im.resize((w, h), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32), (w0, h0)


def _perfil_vertical(a: np.ndarray) -> dict:
    """EL RITMO DE LA PÁGINA, leído del brillo fila por fila.

    Una página no es un bloque uniforme: alterna franjas claras y oscuras, secciones con foto y
    secciones con texto. Ese patrón es la estructura que el diseñador compuso, y es exactamente lo que
    una pieza de video tiene que respetar para sentirse "de ese sitio".

    Se mide con la luminancia media por fila. Los CAMBIOS de esa curva —no sus valores— marcan los
    bordes de sección: donde el brillo salta, el diseñador cambió de tema.

    QUIÉN LO CONSUME: `recetas.movimientos` (cuántos cambios de espacio pide la pieza) y
    `recetas.beatsSugeridos` (una página de tres secciones no necesita 42 beats).
    """
    if a is None or a.size == 0:
        return {"bandas": 0, "cortes": [], "regularidad": 0.0, "contrasteBandas": 0.0}
    # Luminancia perceptual por fila, suavizada: sin suavizar, cada línea de texto es un "corte".
    lum = (0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]).mean(axis=1) / 255.0
    k = max(3, len(lum) // 200)
    nucleo = np.ones(k) / k
    suave = np.convolve(lum, nucleo, mode="same")
    d = np.abs(np.diff(suave))
    if d.size == 0:
        return {"bandas": 0, "cortes": [], "regularidad": 0.0, "contrasteBandas": 0.0}
    # Umbral relativo al propio material: un sitio de bajo contraste tiene cortes suaves y siguen
    # siendo cortes. Un umbral absoluto encontraría 40 secciones en un sitio y 0 en otro.
    # DOS CONDICIONES A LA VEZ, y con una sola no alcanzaba.
    #
    # La primera versión usaba sólo un percentil relativo, y sobre las doce capturas del repo devolvía
    # 30 bandas o más en once de ellas: el número se iba al tope del rango en TODOS los sitios, o sea
    # que no informaba nada. Un percentil siempre encuentra su cola por definición — un sitio de una
    # sola sección tiene su propio 1% superior de cambios, y ese 1% son las líneas de texto.
    #
    # Un corte de sección tiene que ser además un cambio de brillo ABSOLUTO: 5.5 puntos sobre 100 de la
    # escala perceptual, que es aproximadamente lo que separa un blanco de un gris muy claro. Con las
    # dos juntas, el conteo sobre las mismas doce capturas pasa a moverse entre 2 y 14.
    umbral = max(0.055, float(np.percentile(d, 99)) * 0.55)
    cortes, ultimo = [], -999
    sep = max(8, len(lum) // 25)      # dos cortes a menos de 1/25 de la página son el mismo corte
    for i in range(len(d)):
        if d[i] > umbral and (i - ultimo) > sep:
            cortes.append(round(i / len(lum), 4))
            ultimo = i
    # Regularidad: qué tan parejas son las distancias entre cortes. Un sitio con secciones de igual
    # alto se lee como sistemático; uno irregular, como editorial.
    reg = 0.0
    if len(cortes) >= 3:
        pasos = np.diff(np.array(cortes))
        reg = float(max(0.0, 1.0 - (pasos.std() / max(1e-6, pasos.mean()))))
    return {
        "bandas": len(cortes) + 1,
        "cortes": cortes[:24],
        "regularidad": round(reg, 3),
        "contrasteBandas": round(float(suave.max() - suave.min()), 3),
    }


def _fondo_medido(a: np.ndarray) -> dict:
    """EL COLOR DE FONDO, MEDIDO SOBRE LOS PÍXELES — y no el que declara el DOM.

    `palette.bgLum` sale de leer el `background-color` del `<body>` o de un contenedor, y se equivoca
    de una manera concreta y frecuente: cuando el sitio tiene una sección oscura grande arriba, o un
    `<html>` con tema oscuro y un `<body>` claro encima. Medido sobre las doce capturas del repo,
    tailwindcss declara `bgLum` 0.002 —o sea negro— y su tira mide 0.98. Todo lo que se derive de ese
    número queda invertido: `vacio` daba 7% en el sitio más aireado del conjunto.

    El modo de la luminancia no se puede equivocar así: el fondo es, por definición, el valor que más
    superficie ocupa. Se devuelve también el declarado y la diferencia, porque un desacuerdo grande es
    una señal útil —quiere decir que el DOM y los píxeles no cuentan la misma historia— y callarla
    sería perder información.
    """
    if a is None or a.size == 0:
        return {"lum": 1.0, "modo": 1.0, "desacuerdo": 0.0}
    g = (0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]) / 255.0
    h, _bordes = np.histogram(g, bins=32, range=(0, 1))
    modo = float((int(h.argmax()) + 0.5) / 32)
    return {"lum": modo, "modo": round(modo, 3)}


def _aire(a: np.ndarray, bg_lum: float) -> dict:
    """CUÁNTO RESPIRA EL DISEÑO: qué fracción de la página es fondo liso.

    Se mide como el porcentaje de píxeles que están a menos de un umbral del color de fondo Y cuyo
    entorno no tiene bordes. Un sitio aireado (mucho blanco) pide una pieza con la cámara lenta, pocos
    objetos y márgenes grandes; uno denso pide lo contrario. Componer una pieza aireada para un sitio
    denso no se ve mal — se ve de otra marca.

    QUIÉN LO CONSUME: `recetas.velocidadCamara`, `recetas.capas`, `recetas.margenTexto`.
    """
    if a is None or a.size == 0:
        return {"vacio": 0.5, "bordes": 0.5, "tinta": 0.5}
    g = (0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]) / 255.0
    # Bordes por gradiente: |dx| + |dy|. Es un Sobel pobre y alcanza — lo que importa es cuánta
    # frontera hay por unidad de área, no dónde está.
    dx = np.abs(np.diff(g, axis=1))
    dy = np.abs(np.diff(g, axis=0))
    bordes = float((dx > 0.06).mean() * 0.5 + (dy > 0.06).mean() * 0.5)
    # Vacío: cerca del fondo y sin borde alrededor.
    cerca_fondo = np.abs(g - bg_lum) < 0.10
    vacio = float(cerca_fondo.mean())
    # Tinta: lo contrario, píxeles claramente separados del fondo.
    tinta = float((np.abs(g - bg_lum) > 0.35).mean())
    return {"vacio": round(vacio, 3), "bordes": round(bordes, 3), "tinta": round(tinta, 3)}


def _paleta(a: np.ndarray, n: int = 6) -> list:
    """LA PALETA REAL, CON PESOS — y no sólo el acento.

    `pagemodel` da acento, fondo y tinta: tres colores. Un espacio 3D puede usar cinco o seis, y la
    diferencia entre una pieza que parece de la marca y una que parece plantilla suele estar ahí.

    Se cuantiza a una rejilla gruesa y se cuentan ocurrencias. No es k-means y no hace falta: lo que se
    busca son las masas de color que el ojo registra, y esas sobreviven a cualquier cuantización.

    Cada entrada trae `peso` (fracción de la página), `croma` (si es color o gris) y `lum`. Con eso una
    plantilla puede decidir, por ejemplo, "usá el color de más peso que además tenga croma > 0.25 para
    el material del espacio, y el gris de más peso para el piso".
    """
    if a is None or a.size == 0:
        return []
    px = a.reshape(-1, 3)
    if len(px) > 400000:
        px = px[:: len(px) // 400000]
    q = (px // 32).astype(np.int32)             # 8 niveles por canal
    claves = q[:, 0] * 64 + q[:, 1] * 8 + q[:, 2]
    vals, cuentas = np.unique(claves, return_counts=True)
    orden = np.argsort(-cuentas)[: n * 3]
    total = float(cuentas.sum())
    out = []
    for i in orden:
        clave = int(vals[i])
        r = (clave // 64) * 32 + 16
        g = ((clave // 8) % 8) * 32 + 16
        b = (clave % 8) * 32 + 16
        rgb = (r, g, b)
        e = {
            "hex": _hex(rgb),
            "peso": round(float(cuentas[i]) / total, 4),
            "croma": round(_croma(rgb), 3),
            "lum": round(_lum(rgb), 3),
        }
        # Se descartan los casi-duplicados: dos celdas vecinas de la rejilla son el mismo color para
        # el ojo, y devolverlas las dos desperdicia la mitad de la paleta.
        if any(_contraste(rgb, tuple(int(x["hex"][i:i + 2], 16) for i in (1, 3, 5))) < 1.12 for x in out):
            continue
        out.append(e)
        if len(out) >= n:
            break
    return out


def _acento_espacial(a: np.ndarray, acento_hex: str) -> dict:
    """DÓNDE VIVE EL ACENTO en la página, no sólo cuál es.

    Un sitio que usa su acento en un botón chiquito arriba y nada más no es lo mismo que uno que lo usa
    como masa en media pantalla, aunque el hex sea idéntico. Lo primero pide un espacio 3D neutro con
    el acento en filetes; lo segundo pide el acento como material del espacio.

    Devuelve la cobertura total y en qué tercio vertical se concentra.

    QUIÉN LO CONSUME: `recetas.acentoComoMasa` (si el espacio se construye en acento o en gris).
    """
    if a is None or a.size == 0 or not acento_hex:
        return {"cobertura": 0.0, "concentracion": "ninguna", "masa": False}
    try:
        ac = np.array([int(acento_hex[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)
    except Exception:
        return {"cobertura": 0.0, "concentracion": "ninguna", "masa": False}
    d = np.sqrt(((a - ac) ** 2).sum(axis=2))
    cerca = d < 60.0
    cob = float(cerca.mean())
    h = cerca.shape[0]
    tercios = [float(cerca[: h // 3].mean()), float(cerca[h // 3: 2 * h // 3].mean()), float(cerca[2 * h // 3:].mean())]
    nombres = ["arriba", "medio", "abajo"]
    conc = nombres[int(np.argmax(tercios))] if cob > 0.002 else "ninguna"
    return {
        "cobertura": round(cob, 4),
        "concentracion": conc,
        "porTercio": [round(t, 4) for t in tercios],
        # 3% de la página en acento ya es "masa": el ojo lo lee como color de marca y no como detalle.
        "masa": cob > 0.03,
    }


# ---------------------------------------------------------------------------- el contenido

def _contenido(site: dict, pm: dict) -> dict:
    """CUÁNTO TIENE PARA DECIR la marca, contado.

    No es lo mismo una landing de una frase que un sitio con doce features y siete testimonios. La
    primera necesita una pieza corta con un objeto protagónico; la segunda puede sostener seis tiempos
    largos y varias cifras. Elegir mal acá produce el defecto más caro del género: una pieza con huecos
    o una pieza que atropella.

    QUIÉN LO CONSUME: `recetas.beatsSugeridos`, `recetas.bloquesPorTiempo`, `afinidad`.
    """
    c = (site or {}).get("content") or {}
    sem = (pm or {}).get("semantica") or {}
    pruebas = sem.get("pruebas") or {}
    titulares = [t for t in (c.get("titulares") or []) if str(t).strip()]
    parrafos = [p for p in (c.get("paragraphs") or []) if str(p).strip()]
    largos = [len(str(p)) for p in parrafos] or [0]
    return {
        "titulares": len(titulares),
        "parrafos": len(parrafos),
        "largoParrafoMediano": int(np.median(largos)),
        "ctas": len([x for x in (c.get("ctas") or []) if str(x).strip()]),
        "nav": len([x for x in (c.get("nav") or []) if str(x).strip()]),
        "testimonios": len(pruebas.get("testimonios") or []),
        "cifras": len(pruebas.get("stats") or []),
        "features": len(sem.get("features") or []),
        "imagenes": len((site or {}).get("images") or []),
        "recortes": len((site or {}).get("elementos") or []),
        "idioma": sem.get("idioma") or "",
        "tipoNegocio": sem.get("tipoNegocio") or "",
        "registro": ((sem.get("audiencia") or {}).get("register") or ""),
    }


def _imagenes(site: dict, dst: str) -> dict:
    """QUÉ MATERIAL VISUAL HAY DE VERDAD, medido en píxeles nativos.

    La lista de imágenes del DOM miente por omisión: un `<img>` puede ser un icono de 24 px o una foto
    de 2400. Lo que decide si un recorte se puede mostrar grande en 3D es su ancho NATIVO — dibujar
    120 px a 900 es el defecto de pixelado que este repo ya documenta en otro motor.

    QUIÉN LO CONSUME: `recetas.pruebaGrande` (si el tiempo de PRUEBA puede ocupar el cuadro) y la
    elegibilidad de las plantillas que piden `elementos`.
    """
    els = (site or {}).get("elementos") or []
    meta = ((site or {}).get("dna") or {}).get("imagesMeta") or []
    anchos = []
    d_els = os.path.join(dst, "elementos")
    for e in els:
        w = int(e.get("w") or 0)
        if w <= 0 and os.path.isdir(d_els):
            # Si el DOM no dio el ancho, se lee del PNG. Un dato medido vale más que uno ausente.
            f = os.path.join(d_els, f"captura_{e.get('id','')}.png")
            if os.path.exists(f):
                try:
                    w = Image.open(f).size[0]
                except Exception:
                    w = 0
        if w > 0:
            anchos.append(w)
    ars = [float(m.get("ar") or 0) for m in meta if m.get("ar")]
    tipos = {}
    for m in meta:
        k = str(m.get("kind") or "otro")
        tipos[k] = tipos.get(k, 0) + 1
    return {
        "recortes": len(els),
        "anchoMaximo": max(anchos) if anchos else 0,
        "anchoMediano": int(np.median(anchos)) if anchos else 0,
        # 640 px nativos es el piso para llenar medio cuadro de 1080 sin verse blando.
        "hayGrande": bool(anchos and max(anchos) >= 640),
        "aspectoMediano": round(float(np.median(ars)), 2) if ars else 0.0,
        "tipos": tipos,
    }


# ---------------------------------------------------------------------------- las recetas

def _recetas(dna: dict, perfil: dict, aire: dict, cont: dict, img: dict, acento: dict) -> dict:
    """LA TRADUCCIÓN: de lo medido a lo que una plantilla pide de verdad.

    Ésta es la parte que justifica el archivo. Todo lo de arriba son mediciones; acá se convierten en
    los seis o siete números que una plantilla necesita para no ser igual para todos los sitios.

    Cada receta dice de qué medición sale. Si mañana alguien cambia una fórmula, tiene que poder ver en
    una línea qué se rompe.
    """
    mood = (dna or {}).get("mood") or {}
    dens = (dna or {}).get("density") or {}
    shape = (dna or {}).get("shape") or {}
    tipo = (dna or {}).get("typography") or {}

    energia = float(mood.get("energia") or 0.5)
    formalidad = float(mood.get("formalidad") or 0.5)
    calidez = float(mood.get("calidez") or 0.5)
    densidad = float(dens.get("score") or 0.5)
    vacio = float(aire.get("vacio") or 0.5)
    bordes = float(aire.get("bordes") or 0.3)

    # VELOCIDAD DE CÁMARA. Sale de la energía del sitio y se corrige con el aire: un sitio enérgico
    # pero muy aireado (mucha marca de lujo) se mueve rápido y con calma a la vez, y el promedio de los
    # dos es más honesto que cualquiera de los dos solo. Rango 0.75..1.35 sobre la velocidad base.
    velocidad = 0.75 + 0.6 * (energia * 0.65 + (1.0 - vacio) * 0.35)

    # CAPAS DE PARALAJE. Un sitio denso soporta —y pide— más cosas pasando; uno vacío se arruina con
    # ellas.
    #
    # LA PRIMERA FÓRMULA ERA `densidad*0.6 + bordes*1.4` Y DABA 3 EN ONCE DE DOCE SITIOS. No estaba mal
    # razonada: estaba saturada. `density.score` vive entre 0.4 y 0.8 en la práctica y `bordes` entre
    # 0.05 y 0.2, así que la suma caía siempre en la misma banda y el redondeo la aplastaba a un único
    # valor. Una receta que no varía entre un sitio de Berkshire Hathaway y uno de MercadoLibre no está
    # midiendo: está decorando.
    #
    # `vacio` sí discrimina —se mueve entre 0.07 y 0.99 sobre las mismas doce capturas— porque sale de
    # contar píxeles y no de un puntaje ya normalizado. Es la señal correcta: cuánto lugar hay para que
    # pase algo por delante es literalmente cuánto fondo liso hay.
    capas = int(round(2 + 2 * max(0.0, min(1.0, (1.0 - vacio) * 1.15 + bordes * 0.8))))

    # RADIO DE LAS ARISTAS. Es la traducción más directa que hay: si la marca usa esquinas redondeadas
    # en sus tarjetas, el espacio 3D también. Se expresa como fracción del lado de una pieza.
    radio_ratio = float(shape.get("radiusRatio") or 0.0)
    dureza = 1.0 - min(1.0, radio_ratio * 6.0)   # 1 = filoso, 0 = redondeado
    if shape.get("pill"):
        dureza = min(dureza, 0.25)

    # MARGEN DEL TEXTO. Un sitio aireado compone con márgenes grandes; replicarlo es la mitad de que se
    # sienta de esa marca. 0.78..0.94 del cuadro útil.
    margen = 0.94 - 0.16 * vacio

    # CUÁNTOS BEATS. Sale del material: seis tiempos necesitan contenido para llenarlos. Un sitio con
    # dos titulares y sin cifras no sostiene 42 beats, y estirarlo produce huecos.
    material = (min(cont["titulares"], 6) + min(cont["testimonios"], 4) * 1.2
                + min(cont["cifras"], 4) * 1.5 + min(cont["features"], 6) * 0.6)
    beats = int(max(30, min(44, round(30 + material * 0.85))))

    # CUÁNTAS CIFRAS Y FRASES PEDIR. Pedir tres y recibir una es normal; pedir tres cuando hay ocho es
    # desperdiciar el material que la página sí dio.
    cifras = int(max(1, min(4, cont["cifras"])))
    frases = int(max(1, min(3, max(cont["testimonios"], cont["titulares"] // 2))))

    return {
        "velocidadCamara": round(velocidad, 3),
        "_velocidadDe": "mood.energia (65%) + falta de aire (35%)",
        "capas": capas,
        "_capasDe": "density.score + densidad de bordes de la tira",
        "dureza": round(dureza, 3),
        "_durezaDe": "shape.radiusRatio y shape.pill — 1 filoso, 0 redondeado",
        "margenTexto": round(margen, 3),
        "_margenDe": "fraccion de pixeles de fondo liso en la tira",
        "beatsSugeridos": beats,
        "_beatsDe": "cuanto material hay: titulares, testimonios, cifras y features",
        "cifrasAPedir": cifras,
        "frasesAPedir": frases,
        "acentoComoMasa": bool(acento.get("masa")),
        "_acentoDe": "cobertura del acento en la tira; >3% se lee como color de marca y no como detalle",
        "pruebaGrande": bool(img.get("hayGrande")),
        "_pruebaDe": "ancho nativo maximo de los recortes; <640 px se ve blando a media pantalla",
        "movimientos": int(max(2, min(6, perfil.get("bandas", 3)))),
        "_movimientosDe": "cortes de luminancia en la tira = secciones que compuso el disenador",
        "sistematico": bool(perfil.get("regularidad", 0) > 0.55),
        "_sistematicoDe": "que tan parejas son las alturas de seccion; alto = grilla, bajo = editorial",
        "formalidad": round(formalidad, 3),
        "calidez": round(calidez, 3),
    }


# ---------------------------------------------------------------------------- afinidad

# Qué le pide cada familia de plantillas a una página. No es una tabla de gustos: cada peso responde a
# una propiedad medible que hace que la pieza funcione o no.
FAMILIAS = {
    "arquitectura": {"formalidad": 0.9, "sistematico": 0.8, "dureza": 0.7, "densidad": 0.4},
    "objeto": {"formalidad": 0.5, "sistematico": 0.3, "dureza": 0.5, "densidad": 0.2, "vacio": 0.8},
    "luz": {"formalidad": 0.4, "calidez": 0.7, "dureza": 0.2, "acentoMasa": 0.8},
    "atmosfera": {"formalidad": 0.2, "calidez": 0.8, "dureza": 0.1, "vacio": 0.7},
    "escala": {"formalidad": 0.85, "dureza": 0.95, "densidad": 0.6},
    "grafico": {"formalidad": 0.6, "dureza": 0.6, "acentoMasa": 0.9, "vacio": 0.6},
    "multitud": {"densidad": 0.9, "energia": 0.8},
    "recorrido": {"sistematico": 0.6, "energia": 0.6, "densidad": 0.5},
    "energia": {"energia": 0.95, "densidad": 0.7, "formalidad": 0.15},
    "trama": {"densidad": 0.85, "dureza": 0.6, "sistematico": 0.7},
}


def _afinidad(rec: dict, dna: dict, aire: dict) -> list:
    """QUÉ FAMILIA DE PLANTILLAS LE QUEDA A ESTA PÁGINA, con puntaje y con el motivo.

    Esto NO elige por el usuario. El estudio ofrece las dieciocho y el usuario elige la que quiera; lo
    que hace la afinidad es ordenar el catálogo para que arriba estén las que tienen sentido, y decir
    en una línea por qué. Un catálogo de cientas sin orden es un catálogo inusable.

    El puntaje es una distancia: cada familia declara el valor que espera de cada rasgo, y se penaliza
    la diferencia. Una familia que no menciona un rasgo no lo penaliza — no todas las decisiones
    dependen de todo.
    """
    mood = (dna or {}).get("mood") or {}
    dens = (dna or {}).get("density") or {}
    rasgos = {
        "formalidad": float(mood.get("formalidad") or 0.5),
        "calidez": float(mood.get("calidez") or 0.5),
        "energia": float(mood.get("energia") or 0.5),
        "densidad": float(dens.get("score") or 0.5),
        "dureza": float(rec.get("dureza") or 0.5),
        "vacio": float(aire.get("vacio") or 0.5),
        "sistematico": 1.0 if rec.get("sistematico") else 0.0,
        "acentoMasa": 1.0 if rec.get("acentoComoMasa") else 0.0,
    }
    out = []
    for fam, esperado in FAMILIAS.items():
        err, peso = 0.0, 0.0
        peor, peor_d = "", 0.0
        for k, v in esperado.items():
            d = abs(rasgos.get(k, 0.5) - v)
            err += d
            peso += 1
            if d > peor_d:
                peor_d, peor = d, k
        score = max(0.0, 1.0 - (err / max(1, peso)))
        # El motivo se escribe siempre, tanto cuando la afinidad es alta como cuando es baja: por que NO
        # es tan util como por que SI cuando hay que elegir entre dieciocho plantillas.
        mejor = min(esperado.items(), key=lambda kv: abs(rasgos.get(kv[0], 0.5) - kv[1]))
        out.append({
            "familia": fam,
            "score": round(score, 3),
            "aFavor": mejor[0],
            "enContra": peor,
        })
    out.sort(key=lambda x: -x["score"])
    return out


# ---------------------------------------------------------------------------- entrada pública

def retrato_de(dst: str) -> dict:
    """El retrato completo de una página ya capturada. `dst` es tools/out/motor/<dominio>."""
    def _leer(nombre):
        p = os.path.join(dst, nombre)
        if not os.path.exists(p):
            return {}
        try:
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    site = _leer("site.json")
    pm = _leer("pagemodel.json")
    dna = pm.get("dna") or site.get("dna") or {}
    pal = dna.get("palette") or {}

    a, tam = _leer_tira(os.path.join(dst, "tira.png"))
    declarado = float(pal.get("bgLum") if pal.get("bgLum") is not None else 1.0)
    fondo = _fondo_medido(a)
    fondo["declarado"] = round(declarado, 3)
    fondo["desacuerdo"] = round(abs(fondo["lum"] - declarado), 3)

    perfil = _perfil_vertical(a)
    aire = _aire(a, fondo["lum"])
    paleta = _paleta(a)
    acento = _acento_espacial(a, pal.get("accent") or "")
    cont = _contenido(site, pm)
    img = _imagenes(site, dst)
    rec = _recetas(dna, perfil, aire, cont, img, acento)
    afin = _afinidad(rec, dna, aire)

    return {
        "v": 1,
        "url": pm.get("url") or site.get("url") or "",
        "marca": pm.get("brand") or "",
        "tira": {"ancho": tam[0], "alto": tam[1],
                 "razon": round(tam[1] / max(1, tam[0]), 2) if tam[0] else 0},
        "perfil": perfil,
        "fondo": fondo,
        "aire": aire,
        "paleta": paleta,
        "acento": acento,
        "contenido": cont,
        "imagenes": img,
        "recetas": rec,
        "afinidad": afin,
    }


def escribir(dst: str) -> dict:
    r = retrato_de(dst)
    with open(os.path.join(dst, "retrato.json"), "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, indent=1)
    return r


def _tabla(r: dict) -> str:
    """La salida por pantalla. Una tabla, no un veredicto: esto MIDE, no bloquea."""
    L = []
    L.append(f"RETRATO de {r.get('marca') or '(sin marca)'} — {r.get('url')}")
    t = r["tira"]
    L.append(f"  tira {t['ancho']}x{t['alto']} (razon {t['razon']}:1)")
    p, ai = r["perfil"], r["aire"]
    L.append(f"  ritmo: {p['bandas']} bandas · regularidad {p['regularidad']} · contraste entre bandas {p['contrasteBandas']}")
    fo = r["fondo"]
    L.append(f"  fondo medido {fo['modo']:.2f} (el DOM declara {fo['declarado']:.2f})"
             + ("   <- NO COINCIDEN: se usa el medido" if fo["desacuerdo"] > 0.25 else ""))
    L.append(f"  aire: {ai['vacio']*100:.0f}% de fondo liso · bordes {ai['bordes']*100:.1f}% · tinta {ai['tinta']*100:.1f}%")
    ac = r["acento"]
    L.append(f"  acento: {ac['cobertura']*100:.2f}% de la pagina, concentrado {ac['concentracion']}"
             + ("  <- MASA (el espacio se puede construir en acento)" if ac["masa"] else "  (detalle: va en filetes)"))
    L.append("  paleta medida:  " + "  ".join(f"{c['hex']}({c['peso']*100:.0f}%)" for c in r["paleta"]))
    c = r["contenido"]
    L.append(f"  contenido: {c['titulares']} titulares · {c['parrafos']} parrafos · {c['cifras']} cifras · "
             f"{c['testimonios']} testimonios · {c['features']} features · {c['recortes']} recortes")
    im = r["imagenes"]
    L.append(f"  imagenes: ancho maximo {im['anchoMaximo']} px" + ("  (alcanza para media pantalla)" if im["hayGrande"] else "  (NO alcanza: la prueba va chica)"))
    rc = r["recetas"]
    L.append("  RECETAS — lo que las plantillas leen:")
    for k in ["velocidadCamara", "capas", "dureza", "margenTexto", "beatsSugeridos", "cifrasAPedir",
              "frasesAPedir", "movimientos", "sistematico", "acentoComoMasa", "pruebaGrande"]:
        de = rc.get("_" + k.replace("APedir", "").replace("Camara", "").replace("Texto", "").replace("Sugeridos", ""), "")
        L.append(f"    {k:<18} {str(rc[k]):<8} {de}")
    L.append("  AFINIDAD por familia (ordena el catalogo; no elige por el usuario):")
    for a in r["afinidad"][:6]:
        L.append(f"    {a['familia']:<14} {a['score']:.2f}   a favor: {a['aFavor']:<12} en contra: {a['enContra']}")
    return "\n".join(L)


def main():
    import argparse
    import sys
    AQUI = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, AQUI)
    import motor

    ap = argparse.ArgumentParser(description="El retrato profundo de una pagina ya capturada")
    ap.add_argument("url", help="la URL (tiene que estar capturada: se lee de tools/out/motor/<dominio>)")
    ap.add_argument("--json", action="store_true", help="volcar el JSON entero en vez de la tabla")
    a = ap.parse_args()
    dst = os.path.join(motor.SALIDA, motor._dominio(a.url))
    if not os.path.isdir(dst):
        print(f"no hay captura de {a.url} en {dst}. Corre primero el motor o boveda.")
        raise SystemExit(2)
    r = escribir(dst)
    print(json.dumps(r, ensure_ascii=False, indent=1) if a.json else _tabla(r))


if __name__ == "__main__":
    main()
