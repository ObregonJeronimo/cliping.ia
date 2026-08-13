"""REF-ANALISIS v2 — desarma un video de referencia para poder replicarlo.

POR QUE EXISTE
==============

Bóveda replica un género. Hasta ahora ese género lo tenía yo en la cabeza y lo escribía de memoria, y
eso produjo exactamente lo que se esperaría: piezas que se parecen a lo que yo *creo* que es el género.
Cuando el usuario pasó una referencia concreta y le erré al registro dos veces seguidas, quedó claro que
el problema no era la ejecución sino que **no estaba midiendo la referencia**.

Esto la mide. Le das un video —un reel, un showreel de After Effects, lo que sea— y te devuelve los
números que hacen falta para replicarlo.

QUE CAMBIO EN LA v2, Y POR QUE
------------------------------

La v1 promediaba TODO el video. Para un reel de 19 planos cortados cada 0,6 s eso es casi un dato
falso con cara de medición: mezcla el gancho filmado con cámara en mano, los planos de pantalla, y el
cierre. Decía "cámara quieta el 89% del tiempo" cuando en realidad hay planos quietos y planos con
paneo, y "paleta #202020 59%" cuando en verdad **cada plano tiene su propio color**, que es justo el
dato que hace falta para replicarlo.

La v2 mide **por plano**, y agrega lo que faltaba para escribir la plantilla sin adivinar:

    tono (HSV) por plano       ->  el color del campo de degradado, en hex, listo para usar
    perfil radial              ->  si el fondo es un estallido centrado o un campo parejo
    simetria angular           ->  vortice / radial  vs  direccional
    divergencia y ROTACION     ->  zoom  vs  giro, separados (4 cuadrantes, no 2)
    espectro radial            ->  cuanto es degradado suave y cuanto es detalle duro
    falda de altas luces       ->  cuanto bloom hay
    caja del texto             ->  donde vive la palabra y cuanto ocupa, no solo cuanta area
    curva de aparicion         ->  el easing, ajustado, y su nombre en GSAP
    transiciones               ->  corte seco / fundido a negro / flash / disolvencia
    tempo por autocorrelacion  ->  el pulso real, que no es lo mismo que la mediana de los planos
    planos repetidos           ->  si la pieza vuelve a un plano ya visto
    RECETA                     ->  la traduccion a parametros de Boveda, al final

COMO ESTA OPTIMIZADO, que es la parte que importa
-------------------------------------------------

1. **Una sola decodificación.** ffmpeg decodifica el video UNA vez, ya reescalado, y lo escupe por una
   tubería en `rgb24` crudo. No se escriben 900 PNG al disco para volver a leerlos: eso cuesta más en
   E/S que todo el análisis junto.
2. **Resolución de trabajo chica y fija.** Todo lo que se mide acá es de grano grueso —cortes, masas,
   movimiento global— y a 160 px de ancho da el mismo resultado que a 1080 con 45 veces menos píxeles.
   Los cuadros que se guardan como imagen se extraen después, en un segundo pase y sólo esos.
3. **Memoria constante.** Se procesa en streaming: en cualquier instante hay dos cuadros en RAM, no
   novecientos. Un reel de 60 s ocupa lo mismo que uno de 5. Lo único que crece con la duración son
   series de escalares y una miniatura de 16x28 por cuadro: **medio megabyte para un reel de 17 s.**
4. **Todo vectorizado en numpy.** Ni un bucle sobre píxeles en Python.
5. **Las FFT se calculan UNA vez por cuadro y se guardan para el siguiente.** La v1 transformaba el
   cuadro anterior de nuevo en cada paso: la mitad del trabajo de FFT era trabajo repetido. Con el
   caché, las cinco regiones (cuadro entero + cuatro cuadrantes) cuestan lo mismo que costaban dos.
6. **El espectro radial sale gratis.** Es `|F|²` de una transformada que ya se hizo para la correlación
   de fase, sumada por anillos con un `bincount`. Medir la suavidad del fondo no agrega ni una FFT.
7. **El movimiento global se estima por CORRELACION DE FASE** —no por flujo óptico denso—. Da el
   desplazamiento entero de la imagen, que es justo lo que hace una cámara, y cuesta O(n log n).

Uso:

    python tools/ref-analisis.py <archivo.mp4>
    python tools/ref-analisis.py <archivo.mp4> --planos          (un cuadro por plano + hoja)
    python tools/ref-analisis.py <archivo.mp4> --rango 9.3 13.5  (analizar solo ese tramo)
    python tools/ref-analisis.py <archivo.mp4> --denso 9.3 13.5 6
    python tools/ref-analisis.py <url>                           (baja con yt-dlp y analiza)

Escribe `tools/out/ref/<nombre>.analisis.json` con todo, e imprime la lectura en castellano.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SALIDA = os.path.join(RAIZ, "tools", "out", "ref")

# Ancho de trabajo. 160 px es donde las mediciones de grano grueso dejan de cambiar: probado contra 320
# sobre el mismo material, los cortes detectados son los mismos y el movimiento global difiere menos de
# un 2%. Bajar a 80 empieza a perder cortes suaves.
ANCHO_W = 160

ANILLOS = 12        # anillos concéntricos del perfil radial
SECTORES = 16       # sectores angulares de la simetría
TONOS = 24          # celdas del histograma de tono (15° cada una)
BANDAS = 8          # bandas del espectro radial
MINI_W, MINI_H = 16, 28   # miniatura por cuadro, para comparar planos entre sí


# ---------------------------------------------------------------------------- entrada

def sondear(ruta: str) -> dict:
    """Dimensiones, fps y duración reales. Se leen del contenedor, no se suponen."""
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate,nb_frames,codec_name:format=duration", "-of", "json", ruta],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("ffprobe fallo: " + (r.stderr or "")[:200])
    j = json.loads(r.stdout)
    st = (j.get("streams") or [{}])[0]
    num, _, den = (st.get("r_frame_rate") or "30/1").partition("/")
    # "0/0" es lo que informan algunos contenedores sin indice de tiempo, y el `or 1` no lo cubre
    # porque la cadena "0" es verdadera. Sin esto muere con ZeroDivisionError antes de llegar al
    # respaldo de 30 fps que ya existe mas abajo.
    try:
        fps = float(num) / float(den or 1)
    except (ValueError, ZeroDivisionError):
        fps = 0.0
    if not (fps > 0):
        fps = 0.0
    dur = float((j.get("format") or {}).get("duration") or 0)
    return {
        "w": int(st.get("width") or 0), "h": int(st.get("height") or 0),
        "codec": st.get("codec_name") or "?",
        "fps": round(fps, 3), "dur": round(dur, 3),
        "cuadros": int(st.get("nb_frames") or 0) or int(round(dur * fps)),
    }


def cuadros(ruta: str, w: int, h: int, desde: float = 0.0, hasta: float = 0.0, recorte=None):
    """Generador de cuadros como arrays uint8 (h, w, 3), en streaming.

    UNA sola decodificación y ni un archivo intermedio. `-vsync 0` para que ffmpeg no duplique ni tire
    cuadros al reescalar: si lo hiciera, el eje de tiempo del análisis dejaría de coincidir con el del
    video y todos los tiempos medidos estarían corridos.

    `desde`/`hasta` van ANTES de `-i` (búsqueda por contenedor, salta sin decodificar) salvo que se
    pida precisión, que acá no hace falta: el recorte es para elegir un tramo, no para cuadrar un
    fotograma exacto.
    """
    cmd = ["ffmpeg", "-v", "error"]
    if desde > 0:
        cmd += ["-ss", f"{desde:.3f}"]
    if hasta > desde:
        cmd += ["-to", f"{hasta:.3f}"]
    vf = ""
    if recorte:
        x0, y0, x1, y1 = recorte
        vf = "crop=iw*%.5f:ih*%.5f:iw*%.5f:ih*%.5f," % (x1 - x0, y1 - y0, x0, y0)
    cmd += ["-i", ruta, "-vf", vf + f"scale={w}:{h}:flags=area",
            "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=w * h * 3 * 8)
    n = w * h * 3
    try:
        while True:
            buf = p.stdout.read(n)
            if not buf or len(buf) < n:
                break
            yield np.frombuffer(buf, dtype=np.uint8).reshape(h, w, 3)
    finally:
        try:
            p.stdout.close()
        except Exception:
            pass
        p.wait()


# ---------------------------------------------------------------------------- primitivas

def _hist(f: np.ndarray) -> np.ndarray:
    """Histograma conjunto de color, 4x4x4 celdas, normalizado.

    Grueso a propósito. Un histograma fino distingue dos cuadros consecutivos del MISMO plano —cambia
    el grano, cambia una sombra— y entonces todo parece un corte. Con 64 celdas sólo se mueve cuando
    cambia la distribución de color de verdad, que es lo que hace un corte.
    """
    q = (f >> 6).astype(np.int32)          # 0..3 por canal
    idx = (q[:, :, 0] << 4) | (q[:, :, 1] << 2) | q[:, :, 2]
    hh = np.bincount(idx.ravel(), minlength=64).astype(np.float32)
    return hh / max(1.0, hh.sum())


def _vertice(a: float, b: float, d: float) -> float:
    """Vertice de la parabola que pasa por (-1,a), (0,b), (1,d). Acotado a media celda."""
    den = a - 2.0 * b + d
    if abs(den) < 1e-12:
        return 0.0
    return float(max(-0.5, min(0.5, 0.5 * (a - d) / den)))


def _pico(A: np.ndarray, B: np.ndarray, forma: tuple):
    """Desplazamiento entre dos espectros ya calculados, por CORRELACION DE FASE.

    Es la forma barata y robusta de contestar "¿cuánto se movió?". Se multiplican los espectros (uno
    conjugado), se normaliza por el módulo —de ahí lo de *fase*: se tira la amplitud y queda sólo el
    desfase— y la antitransformada tiene un pico en el desplazamiento. Es inmune a cambios de brillo,
    que es exactamente lo que hace falta en un video con luces animadas.

    Recibe los espectros YA transformados porque el del cuadro anterior se guarda de la vuelta
    anterior: transformarlo de nuevo sería hacer dos veces el mismo trabajo.
    """
    R = A * np.conj(B)
    m = np.abs(R)
    R = np.divide(R, m, out=np.zeros_like(R), where=m > 1e-8)
    c = np.fft.irfft2(R, s=forma)
    iy, ix = np.unravel_index(int(np.argmax(c)), c.shape)
    # SUBPIXEL. A 160 px de ancho, un temblor de camara de medio pixel por cuadro se redondea a cero:
    # la primera version informaba "pan 0.00 - quieta x19" sobre material filmado a pulso, que es un
    # cero de resolucion disfrazado de cero de movimiento. Una parabola por los tres valores
    # alrededor del pico recupera la fraccion y cuesta seis lecturas.
    ay = _vertice(float(c[(iy - 1) % forma[0], ix]), float(c[iy, ix]), float(c[(iy + 1) % forma[0], ix]))
    ax = _vertice(float(c[iy, (ix - 1) % forma[1]]), float(c[iy, ix]), float(c[iy, (ix + 1) % forma[1]]))
    y, x = float(iy), float(ix)
    # El pico vive en coordenadas ciclicas: mas de medio cuadro significa desplazamiento negativo.
    if y > forma[0] // 2:
        y -= forma[0]
    if x > forma[1] // 2:
        x -= forma[1]
    return x + ax, y + ay, float(c.max())


def _hsv_hex(tono_grados: float, sat: float, val: float) -> str:
    """HSV -> hex. Para poder DEVOLVER un color usable, no un número de bin."""
    h = (tono_grados % 360.0) / 60.0
    s = max(0.0, min(1.0, sat))
    v = max(0.0, min(1.0, val))
    i = int(math.floor(h)) % 6
    f = h - math.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r, g, b = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i]
    return "#%02x%02x%02x" % (int(r * 255 + 0.5), int(g * 255 + 0.5), int(b * 255 + 0.5))


NOMBRE_TONO = [
    (0, "rojo"), (15, "bermellon"), (30, "naranja"), (45, "ambar"), (60, "amarillo"),
    (75, "lima"), (90, "verde claro"), (120, "verde"), (150, "esmeralda"), (165, "turquesa"),
    (180, "cian"), (200, "celeste"), (220, "azul"), (250, "indigo"), (275, "violeta"),
    (300, "magenta"), (320, "fucsia"), (340, "carmin"), (360, "rojo"),
]


def _nombre_tono(g: float) -> str:
    g = g % 360.0
    mejor, dist = "rojo", 999.0
    for a, n in NOMBRE_TONO:
        d = abs(((g - a + 180) % 360) - 180)
        if d < dist:
            mejor, dist = n, d
    return mejor


# ---------------------------------------------------------------------------- pase unico
#
# LA CAJA DE CONTENIDO, que es lo que la v2.0 hacia mal
# ------------------------------------------------------
# La primera version media TODO el cuadro. Para esta referencia —un telefono filmando un monitor en
# una pieza a oscuras— eso significa que el 60% de cada medicion es pared negra. Salia "paleta
# #202020 al 59%", "casi sin halo" y "simetria 0.125", y las tres son ciertas del cuadro y falsas
# del video que se quiere copiar, que es EL QUE ESTA EN LA PANTALLA.
#
# Asi que el color, la estructura, el texto y el bloom se miden dentro de la caja de contenido: el
# rectangulo donde hay algo. Se calcula por cuadro, se cuantiza a 4 px y se suaviza con la mediana de
# los ultimos cuadros —una caja que salta de tamano cada cuadro invalidaria la comparacion— y los
# mapas de anillos y sectores se cachean por tamano, asi que se reconstruyen una vez por plano y no
# mil veces.

_CACHE_MAPAS: dict = {}


def _mapas(hc: int, wc: int):
    """Anillos concentricos y sectores angulares para un recorte de (hc, wc). Cacheado por tamano."""
    k = (hc, wc)
    m = _CACHE_MAPAS.get(k)
    if m is not None:
        return m
    yy = (np.arange(hc, dtype=np.float32)[:, None] - (hc - 1) / 2) / max(1.0, hc / 2.0)
    xx = (np.arange(wc, dtype=np.float32)[None, :] - (wc - 1) / 2) / max(1.0, wc / 2.0)
    rad = np.sqrt(yy * yy + xx * xx)
    rad = rad / max(1e-6, float(rad.max()))
    ia = np.clip((rad * ANILLOS).astype(np.int32), 0, ANILLOS - 1).ravel()
    ca = np.maximum(1.0, np.bincount(ia, minlength=ANILLOS).astype(np.float32))
    # La simetria angular se mide solo en la corona media: el centro no tiene angulo definido y las
    # esquinas entran en unos sectores si y en otros no, lo que fabricaria asimetria donde no la hay.
    corona = (rad > 0.25) & (rad < 0.95)
    ang = ((np.arctan2(yy + 0 * xx, xx + 0 * yy) + np.pi) / (2 * np.pi) * SECTORES).astype(np.int32) % SECTORES
    isec = ang[corona]
    cs = np.maximum(1.0, np.bincount(isec, minlength=SECTORES).astype(np.float32))
    if len(_CACHE_MAPAS) > 32:
        _CACHE_MAPAS.clear()
    _CACHE_MAPAS[k] = (ia, ca, corona, isec, cs)
    return _CACHE_MAPAS[k]


def _caja(l: np.ndarray, modo: float):
    """El rectangulo donde hay algo, en pixeles. Devuelve (y0, y1, x0, x1)."""
    m = l > (modo + 0.12)
    h, w = l.shape
    pf, pc = m.mean(axis=1), m.mean(axis=0)
    y0, y1 = _extremos(pf)
    x0, x1 = _extremos(pc)
    y0, y1 = int(y0 * h), max(int(y1 * h), int(y0 * h) + 8)
    x0, x1 = int(x0 * w), max(int(x1 * w), int(x0 * w) + 8)
    return y0, min(h, y1), x0, min(w, x1)


def _trazos(lc: np.ndarray, dmax: int = 8):
    """Cuenta TRAZOS de glifo y estima su grosor.

    Un glifo es un par de bordes horizontales opuestos muy cerca: sube el brillo al entrar en el asta
    y baja al salir. Contar bordes fuertes sueltos —lo que hacia la v2.0— tambien cuenta el marco de
    un monitor, la juntura de una ventana y el borde de una foto, y por eso decia que el 93% del
    cuadro era tipografia cuando lo que habia era un navegador abierto.

    Devuelve (mapa de trazos por fila-columna, grosor tipico en px). El grosor es el que mas pares
    produce, y es informacion util por si sola: dice si la letra es fina o pesada.
    """
    g = np.diff(lc, axis=1)
    pos = g > 0.10
    neg = g < -0.10
    acum = np.zeros((lc.shape[0], lc.shape[1] - 1), dtype=np.float32)
    total_d = np.zeros(dmax + 1, dtype=np.float64)
    for d in range(1, dmax + 1):
        par = pos[:, :-d] & neg[:, d:]
        total_d[d] = float(par.sum())
        acum[:, :par.shape[1]] += par
    grosor = int(np.argmax(total_d)) if total_d.max() > 0 else 0
    return acum, grosor


def _bandas_texto(dens: np.ndarray, umbral: float = 0.045, alto_max: float = 0.34):
    """Filas densas en trazos, agrupadas en BANDAS de altura razonable.

    Una linea de texto es una franja acotada: si la franja densa ocupa media pantalla no es una
    palabra, es una textura. Se exige entre 1.5% y 34% del alto.
    """
    n = len(dens)
    marca = dens > umbral
    bandas = []
    i = 0
    while i < n:
        if marca[i]:
            j = i
            while j + 1 < n and marca[j + 1]:
                j += 1
            alt = (j - i + 1) / n
            if 0.015 <= alt <= alto_max:
                bandas.append((i, j + 1))
            i = j + 1
        else:
            i += 1
    return bandas


def medir(ruta: str, info: dict, desde: float = 0.0, hasta: float = 0.0, recorte=None) -> dict:
    """EL PASE. Una decodificacion, memoria constante, todo lo que se mide por cuadro sale de aca.

    Devuelve series de numpy. Nada de esto interpreta todavia: interpretar es el paso siguiente y se
    hace sobre arrays chicos, no sobre pixeles.

    Que se mide DONDE, que no es un detalle:
      - composicion y movimiento  ->  cuadro entero (es una propiedad del encuadre y de la camara)
      - color, estructura, texto, bloom, detalle  ->  DENTRO de la caja de contenido
    """
    w = ANCHO_W
    prop = info["h"] / max(1, info["w"])
    if recorte:
        prop *= (recorte[3] - recorte[1]) / max(1e-6, (recorte[2] - recorte[0]))
    # Techo duro ademas de la validacion de `main`: `medir` es publica y nadie garantiza que quien la
    # llame haya validado. 4096 de alto de trabajo ya es absurdo para medir grano grueso.
    h = max(2, min(4096, int(round(ANCHO_W * prop)) // 2 * 2))
    fps = info["fps"] or 30.0
    my, mx_ = h // 2, w // 2

    # Espectro radial del cuadro entero: anillos en el plano de frecuencias de la rfft2.
    fy = np.fft.fftfreq(h).astype(np.float32)[:, None]
    fx = np.fft.rfftfreq(w).astype(np.float32)[None, :]
    fr = np.sqrt(fy * fy + fx * fx)
    fr = fr / max(1e-6, float(fr.max()))
    idx_banda = np.clip((fr * BANDAS).astype(np.int32), 0, BANDAS - 1).ravel()
    cnt_banda = np.maximum(1.0, np.bincount(idx_banda, minlength=BANDAS).astype(np.float32))
    log_f = np.log10(np.arange(1, BANDAS) + 0.5)
    log_f = log_f - log_f.mean()
    den_f = float((log_f * log_f).sum())

    # Cinco regiones: cuadro entero + cuatro cuadrantes. Con los cuatro se separan DIVERGENCIA (zoom)
    # y ROTACION (giro), que con dos cuadrantes se confunden — y en este genero el giro es la mitad
    # del vocabulario.
    regiones = [(slice(0, h), slice(0, w)),
                (slice(0, my), slice(0, mx_)), (slice(0, my), slice(mx_, w)),
                (slice(my, h), slice(0, mx_)), (slice(my, h), slice(mx_, w))]
    formas = [(sy.stop - sy.start, sx.stop - sx.start) for sy, sx in regiones]
    ventanas = [np.outer(np.hanning(a), np.hanning(b)).astype(np.float32) for a, b in formas]
    prevF = [None] * len(regiones)
    SGN = [(-1, -1), (1, -1), (-1, 1), (1, 1)]   # signo (x, y) del centro de cada cuadrante

    sy_mini = np.round(np.linspace(0, h - 1, MINI_H)).astype(np.int32)
    sx_mini = np.round(np.linspace(0, w - 1, MINI_W)).astype(np.int32)
    ang_bin = ((np.arange(TONOS) + 0.5) / TONOS * 2 * np.pi).astype(np.float64)
    ys = np.arange(h, dtype=np.float32)[:, None]
    xs = np.arange(w, dtype=np.float32)[None, :]

    S = {k: [] for k in (
        "brillo", "contraste", "tinta", "cx", "cy", "sat", "tono", "tono_disp",
        "detalle", "pendiente", "altas", "falda", "vineta", "simetria", "brillo_caja",
        "txt_area", "txt_x0", "txt_x1", "txt_y0", "txt_y1", "txt_alto", "txt_lineas", "trazo",
        "caja_x0", "caja_x1", "caja_y0", "caja_y1", "caja_area", "borde_oscuro",
        "dif", "hd", "mx", "my", "div", "rot", "conf")}
    anillos_ser, tonos_ser, minis = [], [], []
    paleta_acum = np.zeros(64, dtype=np.float64)
    ultimas_cajas: list = []
    prev_l = None
    prev_h = None

    for f in cuadros(ruta, w, h, desde, hasta, recorte):
        ff = f.astype(np.float32)
        l = (0.2126 * ff[:, :, 0] + 0.7152 * ff[:, :, 1] + 0.0722 * ff[:, :, 2]) / 255.0

        # ---------------------------------------------------------------- cuadro entero
        S["brillo"].append(float(l.mean()))
        S["contraste"].append(float(l.std()))
        modo = float(np.median(l))
        peso = np.abs(l - modo)
        S["tinta"].append(float((peso > 0.18).mean()))
        s = float(peso.sum())
        if s > 1e-6:
            S["cx"].append(float((peso * xs).sum() / s) / w)
            S["cy"].append(float((peso * ys).sum() / s) / h)
        else:
            S["cx"].append(0.5)
            S["cy"].append(0.5)
        minis.append(l[sy_mini][:, sx_mini].astype(np.float32))

        # ---------------------------------------------------------------- la caja
        y0, y1, x0, x1 = _caja(l, modo)
        ultimas_cajas.append((y0, y1, x0, x1))
        if len(ultimas_cajas) > 9:
            ultimas_cajas.pop(0)
        cj = np.median(np.array(ultimas_cajas), axis=0)
        y0 = int(cj[0]) // 4 * 4
        y1 = min(h, max(y0 + 16, int(math.ceil(cj[1] / 4)) * 4))
        x0 = int(cj[2]) // 4 * 4
        x1 = min(w, max(x0 + 16, int(math.ceil(cj[3] / 4)) * 4))
        S["caja_y0"].append(y0 / h); S["caja_y1"].append(y1 / h)
        S["caja_x0"].append(x0 / w); S["caja_x1"].append(x1 / w)
        S["caja_area"].append((y1 - y0) * (x1 - x0) / float(h * w))
        fuera = float(l.sum() - l[y0:y1, x0:x1].sum()) / max(1.0, float(h * w - (y1 - y0) * (x1 - x0)))
        S["borde_oscuro"].append(fuera)

        lc = l[y0:y1, x0:x1]
        fc = f[y0:y1, x0:x1]
        ffc = ff[y0:y1, x0:x1]
        hc, wc = lc.shape
        S["brillo_caja"].append(float(lc.mean()))

        hh = _hist(fc)
        paleta_acum += hh

        # ---------------------------------------------------------------- color, dentro de la caja
        # El histograma RGB de 64 celdas dice "hay gris y hay rojo"; el TONO dice QUE rojo, y eso es
        # lo que se copia a un degradado. Se pondera por saturacion*valor para que el negro —que
        # tiene un tono numerico pero no tiene color— no vote.
        r, g, b = ffc[:, :, 0], ffc[:, :, 1], ffc[:, :, 2]
        mxc = ffc.max(axis=2)
        d = mxc - ffc.min(axis=2)
        dz = np.maximum(d, 1e-6)
        sat = np.where(mxc > 1e-6, d / np.maximum(mxc, 1e-6), 0.0)
        hu = np.where(mxc == r, ((g - b) / dz) % 6.0,
                      np.where(mxc == g, (b - r) / dz + 2.0, (r - g) / dz + 4.0)) * 60.0
        wgt = (sat * (mxc / 255.0)).astype(np.float32)
        tb = ((hu / 360.0 * TONOS).astype(np.int32) % TONOS).ravel()
        ht = np.bincount(tb, weights=wgt.ravel(), minlength=TONOS).astype(np.float64)
        tot = float(ht.sum())
        tonos_ser.append((ht / max(1e-6, tot)).astype(np.float32))
        S["sat"].append(float(wgt.sum() / max(1e-6, float((mxc / 255.0).sum()))))
        if tot > 1e-6:
            # Media CIRCULAR: promediar 350 y 10 grados a mano da 180, que es el color opuesto.
            vx = float((ht * np.cos(ang_bin)).sum() / tot)
            vy = float((ht * np.sin(ang_bin)).sum() / tot)
            S["tono"].append(float(np.degrees(np.arctan2(vy, vx)) % 360.0))
            S["tono_disp"].append(float(1.0 - math.hypot(vx, vy)))
        else:
            S["tono"].append(0.0)
            S["tono_disp"].append(1.0)

        # ---------------------------------------------------------------- estructura, en la caja
        ia, ca, corona, isec, cs = _mapas(hc, wc)
        anillos = np.bincount(ia, weights=lc.ravel(), minlength=ANILLOS) / ca
        anillos_ser.append(anillos.astype(np.float32))
        S["vineta"].append(float(anillos[-1] / max(1e-4, anillos[0])))
        sect = np.bincount(isec, weights=lc[corona], minlength=SECTORES) / cs
        S["simetria"].append(float(1.0 - sect.std() / max(1e-4, sect.mean())))

        if hc > 3 and wc > 3:
            lap = np.abs(4.0 * lc[1:-1, 1:-1] - lc[:-2, 1:-1] - lc[2:, 1:-1] - lc[1:-1, :-2] - lc[1:-1, 2:])
            S["detalle"].append(float(lap.mean()))
        else:
            S["detalle"].append(0.0)

        # ALTAS LUCES y ANCHO DEL HALO.
        #
        # La primera version dividia el area por encima de 0.60 por el area por encima de 0.85 y lo
        # llamaba "falda". Esa cuenta esta dominada por el TAMANO DEL NUCLEO, no por el halo: una
        # palabra blanca gigante con un halo hermoso da 2, igual que una palabra sin halo ninguno.
        # Por eso informaba "casi sin halo" sobre cuadros que tienen un resplandor evidente.
        #
        # Lo que hay que medir es el ESPESOR de la rampa: cuantos pixeles de ancho tiene el anillo
        # intermedio alrededor del nucleo quemado. Area del anillo dividido el perimetro del nucleo
        # da exactamente eso, y el perimetro sale de dos diferencias sobre la mascara.
        nuc = lc > 0.82
        a85 = float(nuc.mean())
        anillo = float(((lc > 0.45) & (~nuc)).sum())
        if nuc.any():
            per = float(np.abs(np.diff(nuc.astype(np.int8), axis=1)).sum()
                        + np.abs(np.diff(nuc.astype(np.int8), axis=0)).sum())
        else:
            per = 0.0
        S["altas"].append(a85)
        S["falda"].append(float(anillo / per / max(1.0, wc)) if per > 4 else 0.0)

        # ---------------------------------------------------------------- texto, en la caja
        trz, grosor = _trazos(lc)
        S["trazo"].append(grosor / max(1.0, float(wc)))
        dens = trz.mean(axis=1)
        bandas_t = _bandas_texto(dens)
        if bandas_t:
            filas = sum(b - a for a, b in bandas_t)
            S["txt_area"].append(filas / float(hc))
            S["txt_lineas"].append(float(len(bandas_t)))
            a0, b0 = bandas_t[0][0], bandas_t[-1][1]
            S["txt_y0"].append((y0 + a0) / h)
            S["txt_y1"].append((y0 + b0) / h)
            S["txt_alto"].append(max(b - a for a, b in bandas_t) / float(hc))
            sel = np.zeros(hc, dtype=bool)
            for a, b in bandas_t:
                sel[a:b] = True
            perfil = trz[sel].mean(axis=0)
            pmax = float(perfil.max())
            if pmax > 1e-6:
                ci = np.flatnonzero(perfil > 0.18 * pmax)
                S["txt_x0"].append((x0 + float(ci[0])) / w)
                S["txt_x1"].append((x0 + float(ci[-1] + 2)) / w)
            else:
                S["txt_x0"].append(0.5)
                S["txt_x1"].append(0.5)
        else:
            S["txt_area"].append(0.0)
            S["txt_lineas"].append(0.0)
            S["txt_alto"].append(0.0)
            S["txt_y0"].append(0.5); S["txt_y1"].append(0.5)
            S["txt_x0"].append(0.5); S["txt_x1"].append(0.5)

        # ---------------------------------------------------------------- movimiento, cuadro entero
        # Cinco FFT por cuadro; las cinco del cuadro anterior estan guardadas de la vuelta anterior.
        Fs = [np.fft.rfft2(l[sy, sx] * ventanas[k]) for k, (sy, sx) in enumerate(regiones)]
        # PENDIENTE ESPECTRAL, gratis: |F|^2 de una transformada que ya esta hecha, ajustada en
        # log-log. Una imagen natural cae como 1/f^2; un degradado liso cae mucho mas rapido. Es la
        # forma bien condicionada de preguntar "cuanto de esto es campo suave y cuanto es detalle":
        # la version anterior dividia la banda baja por el total y daba 0.99 para TODO.
        P = (np.abs(Fs[0]) ** 2).ravel()
        bandas = np.bincount(idx_banda, weights=P, minlength=BANDAS) / cnt_banda
        lp = np.log10(np.maximum(bandas[1:], 1e-12))
        S["pendiente"].append(float((log_f * (lp - lp.mean())).sum() / max(1e-9, den_f)))

        if prev_l is not None:
            S["dif"].append(float(np.abs(l - prev_l).mean()))
            S["hd"].append(float(np.abs(hh - prev_h).sum()))
            dx, dy, pk = _pico(Fs[0], prevF[0], formas[0])
            S["mx"].append(dx)
            S["my"].append(dy)
            S["conf"].append(pk)
            div = rot = 0.0
            for k in range(1, 5):
                qx, qy, _ = _pico(Fs[k], prevF[k], formas[k])
                sgx, sgy = SGN[k - 1]
                div += qx * sgx + qy * sgy          # componente radial: si crece, se acerca
                rot += qx * (-sgy) + qy * sgx       # componente tangencial: si crece, gira
            S["div"].append(div / 4.0)
            S["rot"].append(rot / 4.0)
        prevF = Fs
        prev_l, prev_h = l, hh

    n = len(S["brillo"])
    if n < 4:
        raise RuntimeError("solo %d cuadros: el video no se pudo decodificar" % n)

    out = {k: np.asarray(v, dtype=np.float32) for k, v in S.items()}
    out["_anillos"] = np.stack(anillos_ser)
    out["_tonos"] = np.stack(tonos_ser)
    out["_minis"] = np.stack(minis)
    out["_paleta"] = paleta_acum / max(1e-9, float(paleta_acum.sum()))
    out["_n"] = n
    out["_w"], out["_h"], out["_fps"] = w, h, fps
    return out

# ---------------------------------------------------------------------------- interpretacion

def _extremos(p: np.ndarray):
    """Primer y ultimo indice, en 0..1, donde el perfil supera el 15% de su maximo."""
    m = float(p.max())
    if m < 1e-6:
        return 0.0, 1.0
    i = np.flatnonzero(p > 0.15 * m)
    return float(i[0]) / len(p), float(i[-1] + 1) / len(p)


def _umbral(v: np.ndarray, k: float = 4.5, piso: float = 0.02) -> float:
    """Mediana mas k desviaciones robustas (MAD escalada).

    RELATIVO al propio material, no absoluto: un video con mucho movimiento tiene el piso alto y uno
    quieto lo tiene casi en cero. Un umbral fijo encuentra cuarenta cortes en uno y ninguno en el otro.
    """
    med = float(np.median(v))
    mad = float(np.median(np.abs(v - med)))
    # MAD CERO NO ES "ESCALA CHIQUITA", ES "NO HAY ESCALA". Pasa cuando mas de la mitad de los cuadros
    # son identicos: una animacion a 12 fps exportada a 30 (ffmpeg pasa los duplicados tal cual con
    # `-vsync 0`) o una captura de pantalla casi quieta. Con `or 1e-6` el umbral quedaba en 6.7e-6, o
    # sea cero absoluto, y CADA cambio minimo era un corte: simulado, 20 s a 12 fps con 4 cortes reales
    # daban 80 cortes y "257 bpm con regularidad 0.899". Es exactamente el umbral fijo contra el que
    # previene el parrafo de arriba, colado por la puerta de atras.
    if mad <= 1e-9:
        return med + piso
    return med + k * mad * 1.4826


def _cortes(dif: np.ndarray, hd: np.ndarray, fps: float):
    """DOS SEÑALES Y LAS DOS TIENEN QUE ESTAR DE ACUERDO.

    La diferencia de pixeles sola marca cualquier movimiento rapido como corte; la de histograma sola
    se pierde los cortes entre dos planos de la misma paleta, que en este genero son la mayoria.
    Juntas, el falso positivo tiene que enganar a las dos a la vez.
    """
    # El piso de cada senal en su propia unidad: `dif` es una media de |diferencia| en 0..1 y `hd` una
    # distancia L1 de histograma en 0..2.
    u_dif, u_hd = _umbral(dif, piso=0.02), _umbral(hd, piso=0.08)
    degenerado = bool(float(np.median(np.abs(dif - np.median(dif)))) <= 1e-9)
    cand = (dif > u_dif) & (hd > u_hd)
    sep = max(2, int(fps * 0.20))          # dos cortes a menos de 200 ms son el mismo corte
    idx, ultimo = [], -99
    for i in range(len(cand)):
        if cand[i] and (i - ultimo) > sep:
            idx.append(i + 1)              # DIF[i] compara el cuadro i+1 contra el i
            ultimo = i
    return idx, u_dif, u_hd, degenerado


def _transicion(i: int, brillo: np.ndarray, dif: np.ndarray, u_dif: float, fps: float) -> str:
    """Que CLASE de corte es. Un fundido a negro y un corte seco piden cosas distintas en la plantilla.

    Se mira una ventana de +-4 cuadros alrededor del corte: si el brillo cae a una fraccion del
    entorno hay negro de por medio; si sube, es un flash; si la diferencia se sostiene alta durante
    varios cuadros en vez de un pico, es una disolvencia.
    """
    r = max(2, int(fps * 0.08))
    a, b = max(0, i - r), min(len(brillo), i + r + 1)
    ent = brillo[a:b]
    if len(ent) < 3:
        return "corte"
    base = float(np.median(brillo))
    mn, mx = float(ent.min()), float(ent.max())
    if mn < 0.35 * max(1e-4, base):
        return "fundido a negro"
    if mx > 1.9 * max(1e-4, base) and mx > 0.55:
        return "flash"
    ancho = int(np.sum(dif[max(0, i - r - 1):min(len(dif), i + r)] > u_dif * 0.5))
    if ancho >= max(4, int(fps * 0.10)):
        return "disolvencia"
    return "corte"


def _curva(y: np.ndarray):
    """Que EASING describe esta serie. Devuelve (tipo, exponente, error, nombre GSAP).

    Se normaliza a 0..1 y se ajusta contra las dos familias que usa todo el mundo —t^p (entrada) y
    1-(1-t)^p (salida)— barriendo el exponente. Si la recta explica casi lo mismo, gana la recta: un
    ajuste con exponente 1.2 y 5% menos de error que lineal no es "ease", es ruido.

    Sale barato: 41 exponentes por dos familias sobre una serie de decenas de muestras.
    """
    y = np.asarray(y, dtype=np.float64)
    if len(y) < 5:
        return None
    y = y - y.min()
    top = float(y.max())
    if top < 1e-6:
        return None
    y = y / top
    t = np.linspace(0.0, 1.0, len(y))
    e_lin = float(np.mean((y - t) ** 2))
    mejor = ("lineal", 1.0, e_lin)
    # TRES FAMILIAS, NO DOS. `t^p` esta siempre por DEBAJO de la recta y `1-(1-t)^p` siempre por
    # ENCIMA: una `inOut` es una S —debajo en la primera mitad, encima en la segunda— y no pertenece a
    # ninguna de las dos. Con dos familias ninguna mejoraba a la recta y la funcion informaba "lineal /
    # gsap none", o sea AFIRMABA que no hay ease. Y cuanto mas marcado el inOut, mas firme la
    # afirmacion: power2.inOut daba error 0.008, power5.inOut 0.034.
    mitad = t < 0.5
    for p in np.arange(1.2, 5.01, 0.1):
        ei = float(np.mean((y - t ** p) ** 2))
        eo = float(np.mean((y - (1.0 - (1.0 - t) ** p)) ** 2))
        s_io = np.where(mitad, 0.5 * (2 * t) ** p, 1.0 - 0.5 * (2.0 - 2 * t) ** p)
        eio = float(np.mean((y - s_io) ** 2))
        if ei < mejor[2]:
            mejor = ("entrada", float(p), ei)
        if eo < mejor[2]:
            mejor = ("salida", float(p), eo)
        if eio < mejor[2]:
            mejor = ("simetrica", float(p), eio)
    if mejor[0] != "lineal" and e_lin <= mejor[2] * 1.15:
        mejor = ("lineal", 1.0, e_lin)
    tipo, p, err = mejor
    # NO ENCAJAR NO ES SER LINEAL. Si la mejor de las cuatro sigue errando mas que este piso, la curva
    # no es de esta familia y decirlo es la respuesta honesta.
    if err > 0.006 and tipo != "lineal":
        return {"tipo": "no encaja", "exponente": round(p, 2), "error": round(err, 5), "gsap": None}
    if tipo == "lineal":
        gsap = "none" if e_lin <= 0.006 else None
    elif p < 1.5:
        # Un exponente entre 1.2 y 1.5 no es una cuadratica: `power1` lo agrandaria. `sine` es la curva
        # suave del vocabulario de GSAP y es la que corresponde a ese tramo.
        gsap = "sine.%s" % ("in" if tipo == "entrada" else ("out" if tipo == "salida" else "inOut"))
    else:
        k = max(1, min(4, int(round(p)) - 1))
        suf = "in" if tipo == "entrada" else ("out" if tipo == "salida" else "inOut")
        gsap = "power%d.%s" % (k, suf)
    return {"tipo": tipo, "exponente": round(p, 2), "error": round(err, 5), "gsap": gsap}


def _tempo(dif: np.ndarray, fps: float):
    """El PULSO, por autocorrelacion de la señal de movimiento.

    No es lo mismo que 60/mediana-de-los-planos: esa cuenta supone que todos los planos duran igual.
    La autocorrelacion encuentra el periodo que de verdad se repite, aunque haya planos de uno y de
    dos tiempos mezclados — que es como se corta de verdad contra la musica.
    """
    x = np.asarray(dif, dtype=np.float64)
    if len(x) < int(fps * 2):
        return None
    x = x - x.mean()
    nfft = 1 << int(math.ceil(math.log2(len(x) * 2)))
    F = np.fft.rfft(x, n=nfft)
    ac = np.fft.irfft(F * np.conj(F), n=nfft)[:len(x)]
    ac = ac / max(1e-9, float(ac[0]))
    lo, hi = max(2, int(fps * 0.15)), min(len(ac) - 1, int(fps * 2.5))
    if hi - lo < 3:
        return None
    seg = ac[lo:hi]
    k = int(np.argmax(seg)) + lo
    # CORRECCION DE OCTAVA. En un tren de cortes sobre una grilla con beats salteados, el retardo donde
    # TODOS los cortes emparejan es el del COMPAS, no el del pulso, y siempre gana el maximo. Sobre un
    # patron 1-1-2 con beat de 0.40 s devolvia 1.60 s = 37.5 bpm con fuerza 0.92 —lo bastante alto para
    # pasar por fiable— y la receta imprimia "30 beats de 1.60 s = 16.0 s totales", dos numeros que se
    # contradicen en la misma linea. Si un submultiplo explica casi lo mismo, gana el mas chico: es la
    # misma navaja que usa cualquier detector de tempo.
    for m in (k // 2, k // 3, k // 4):
        if m >= lo and float(ac[m]) >= 0.75 * float(ac[k]):
            k = m
            break
    return {"periodo": round(k / fps, 3), "bpm": round(60.0 * fps / k, 1),
            "fuerza": round(float(ac[k]), 3)}


def _clase(sat, detalle, pendiente, simetria, contraste):
    """GRAFICO SINTETICO o IMAGEN REAL. Se devuelve con los numeros al lado, a proposito.

    Ninguna de las cuatro señales alcanza sola: una foto de un atardecer tambien esta saturada, y un
    grafico con grano tambien tiene detalle. El puntaje suma evidencia y el que lee ve de que se
    compone, para poder desconfiar del rotulo sin tener que volver a medir.
    """
    ev = 0.0
    ev += 1.0 if sat > 0.34 else (-0.6 if sat < 0.18 else 0.0)
    ev += 1.0 if detalle < 0.035 else (-1.0 if detalle > 0.075 else 0.0)
    ev += 0.9 if pendiente < -3.2 else (-0.9 if pendiente > -2.4 else 0.0)
    ev += 0.6 if simetria > 0.62 else 0.0
    ev += 0.4 if contraste > 0.18 else 0.0
    return ("grafico" if ev >= 1.4 else ("real" if ev <= -0.6 else "mixto")), round(ev, 2)


def _planos(S: dict, idx_cortes: list) -> list:
    """UN INFORME POR PLANO. Esto es lo que faltaba en la v1.

    Promediar diecinueve planos de 0,6 s da el promedio de nada. Cada plano de este genero tiene su
    color, su palabra y su movimiento, y la plantilla se escribe plano por plano.
    """
    n, fps = S["_n"], S["_fps"]
    bordes = [0] + [i for i in idx_cortes if 0 < i < n] + [n]
    out = []
    for k in range(len(bordes) - 1):
        a, b = bordes[k], bordes[k + 1]
        if b - a < 2:
            continue
        # LAS SERIES DE MOVIMIENTO TIENEN UN ELEMENTO MENOS Y ESTAN CORRIDAS UNO, y el borde de abajo
        # NO se incluye: `dif[a-1]` es exactamente la diferencia que CRUZA el corte —la mas grande de
        # la serie por construccion, porque es la que disparo la deteccion—. Incluirla duplicaba el
        # movimiento informado de un plano quieto: en la referencia, el plano 6 daba 0.0277 en vez de
        # 0.0132. No afecta a pan/tilt/zoom/giro, que son medianas y la ignoran.
        am, bm = a, max(a + 1, b - 1)
        sl = slice(a, b)
        ml = slice(am, bm)

        ht = S["_tonos"][sl].mean(axis=0)
        tot = float(ht.sum())
        ang_bin = (np.arange(TONOS) + 0.5) / TONOS * 2 * np.pi
        if tot > 1e-6:
            vx = float((ht * np.cos(ang_bin)).sum() / tot)
            vy = float((ht * np.sin(ang_bin)).sum() / tot)
            tono = float(np.degrees(np.arctan2(vy, vx)) % 360.0)
            pureza = float(math.hypot(vx, vy))
        else:
            tono, pureza = 0.0, 0.0
        sat = float(S["sat"][sl].mean())
        # EL BRILLO DE LA CAJA, no el del cuadro. El tono y la saturacion salen del recorte; tomar el
        # valor del cuadro entero mezclaba las dos escalas y devolvia un color hasta 40% mas oscuro que
        # el que se ve — justo en los planos de pantalla filmada, que son los que se quieren copiar.
        # Sobre la referencia, el plano 3 (pantalla al 33% del cuadro, pared negra alrededor) devolvia
        # un oliva sucio para una pantalla casi blanca. Y ese hex es el que viaja a `receta.colores`.
        bri = float(S["brillo_caja"][sl].mean())
        # La rampa se reescala con la fuente: con el piso 0.35 y la ganancia 1.6 de antes, `brillo_caja`
        # satura en 0.406 y casi todos los planos clipearian a valor 1.0. Cambiar la clave sin tocar la
        # rampa habria cambiado un sesgo por otro.
        hexa = _hsv_hex(tono, min(1.0, sat * 1.35), min(1.0, 0.30 + bri * 1.20))
        # segundo tono: el pico del histograma mas lejano al dominante (los degradados son de dos)
        lejos = np.array([abs(((i + 0.5) / TONOS * 360 - tono + 180) % 360 - 180) for i in range(TONOS)])
        sec = int(np.argmax(ht * (lejos > 45)))
        hexa2 = _hsv_hex((sec + 0.5) / TONOS * 360.0, min(1.0, sat * 1.2), min(1.0, 0.26 + bri * 1.20))

        pan = float(np.median(np.abs(S["mx"][ml]))) if bm > am else 0.0
        tilt = float(np.median(np.abs(S["my"][ml]))) if bm > am else 0.0
        zoom = float(np.median(S["div"][ml])) if bm > am else 0.0
        giro = float(np.median(S["rot"][ml])) if bm > am else 0.0
        if pan < 0.35 and tilt < 0.35 and abs(zoom) < 0.45 and abs(giro) < 0.45:
            camara = "quieta"
        elif abs(giro) > max(pan, tilt, abs(zoom)) * 1.3:
            camara = "giro"
        elif abs(zoom) > max(pan, tilt) * 1.2:
            camara = "acerca" if zoom > 0 else "aleja"
        elif pan > tilt * 1.6:
            camara = "desliz"
        elif tilt > pan * 1.6:
            camara = "vertical"
        else:
            camara = "mixto"

        cls, ev = _clase(sat, float(S["detalle"][sl].mean()), float(S["pendiente"][sl].mean()),
                         float(S["simetria"][sl].mean()), float(S["contraste"][sl].mean()))
        area = float(S["caja_area"][sl].mean())
        borde = float(S["borde_oscuro"][sl].mean())
        # PANTALLA FILMADA: el contenido no ocupa el cuadro y lo que sobra es negro. Es un dato
        # distinto de la clase —lo que se ve DENTRO puede ser grafico igual— y hace falta saberlo,
        # porque lo que se replica es el contenido, no el cuarto donde se filmo.
        pantalla = bool(area < 0.55 and borde < 0.12)
        ancho_txt = S["txt_x1"][sl] - S["txt_x0"][sl]
        curva = _curva(np.maximum.accumulate(ancho_txt)) if float(S["txt_area"][sl].max()) > 0.04 else None
        if curva is None:
            cum = np.cumsum(S["dif"][ml]) if bm > am else np.array([0.0])
            curva = _curva(cum)
        out.append({
            "n": len(out) + 1,
            "t0": round(a / fps, 3), "t1": round(b / fps, 3), "dur": round((b - a) / fps, 3),
            # LOS INDICES ENTEROS VIAJAN CON EL PLANO. `_repetidos` los reconstruia con
            # `int(t0*fps)` sobre un `t0` ya redondeado a milesimas, y el truncado devolvia `a-1` en
            # un tercio de los casos a 29.97 fps: el ultimo cuadro del plano ANTERIOR, del otro lado
            # de un corte duro, o sea el mas distinto que existe.
            "_i0": a, "_i1": b,
            "clase": cls, "evidencia": ev,
            "color": hexa, "color2": hexa2,
            "tono": round(tono, 1), "tono_nombre": _nombre_tono(tono), "pureza_tono": round(pureza, 3),
            "saturacion": round(sat, 3), "brillo": round(bri, 3),
            "contraste": round(float(S["contraste"][sl].mean()), 3),
            "detalle": round(float(S["detalle"][sl].mean()), 4),
            "pendiente": round(float(S["pendiente"][sl].mean()), 3),
            "caja_area": round(area, 3), "pantalla_filmada": pantalla,
            "borde": round(borde, 3),
            "brillo_caja": round(float(S["brillo_caja"][sl].mean()), 3),
            "trazo": round(float(np.median(S["trazo"][sl])), 4),
            "lineas_texto": round(float(np.median(S["txt_lineas"][sl])), 1),
            "simetria": round(float(S["simetria"][sl].mean()), 3),
            "vineta": round(float(S["vineta"][sl].mean()), 3),
            "bloom_halo": round(float(np.median(S["falda"][sl])), 4),
            "altas_luces": round(float(S["altas"][sl].mean()), 4),
            "camara": camara,
            "pan": round(pan, 2), "tilt": round(tilt, 2), "zoom": round(zoom, 2), "giro": round(giro, 2),
            "movimiento": round(float(S["dif"][ml].mean()), 4) if bm > am else 0.0,
            "texto_area": round(float(S["txt_area"][sl].max()), 3),
            "texto_ancho": round(float(np.percentile(ancho_txt, 85)), 3),
            "texto_alto": round(float(np.percentile(S["txt_alto"][sl], 85)), 3),
            "texto_y": round(float(np.median((S["txt_y0"][sl] + S["txt_y1"][sl]) / 2)), 3),
            "caja": [round(float(np.median(S["caja_x0"][sl])), 3), round(float(np.median(S["caja_y0"][sl])), 3),
                     round(float(np.median(S["caja_x1"][sl])), 3), round(float(np.median(S["caja_y1"][sl])), 3)],
            "curva": curva,
            "perfil_radial": [round(float(v), 3) for v in S["_anillos"][sl].mean(axis=0)],
        })
    return out


def _repetidos(S: dict, planos: list, umbral: float = 0.055) -> list:
    """PLANOS QUE VUELVEN. Una pieza que retoma un plano ya visto tiene estructura de estribillo, y eso
    se replica con una escena reutilizada, no con una nueva.

    Se compara la MEDIANA de las miniaturas de cada plano —16x28 luminancias— contra las de los otros.
    Es O(planos^2) sobre veinte elementos: no cuesta nada y evita guardar cuadros.
    """
    fps = S["_fps"]
    firmas = []
    for p in planos:
        firmas.append(np.median(S["_minis"][p["_i0"]:p["_i1"]], axis=0).ravel())
    pares = []
    for i in range(len(firmas)):
        for j in range(i + 1, len(firmas)):
            d = float(np.abs(firmas[i] - firmas[j]).mean())
            if d < umbral:
                pares.append({"a": planos[i]["n"], "b": planos[j]["n"], "distancia": round(d, 4)})
    return sorted(pares, key=lambda x: x["distancia"])[:12]


def analizar(ruta: str, desde: float = 0.0, hasta: float = 0.0, recorte=None) -> dict:
    info = sondear(ruta)
    if not info["w"]:
        raise RuntimeError("el archivo no tiene stream de video")
    S = medir(ruta, info, desde, hasta, recorte)
    n, fps, w, h = S["_n"], S["_fps"], S["_w"], S["_h"]

    idx, u_dif, u_hd, degenerado = _cortes(S["dif"], S["hd"], fps)
    cortes = [round(i / fps, 3) for i in idx]
    tipos = [_transicion(i, S["brillo"], S["dif"], u_dif, fps) for i in idx]
    planos = _planos(S, idx)

    dur = [p["dur"] for p in planos] or [n / fps]
    med = float(np.median(dur))
    regular = float(max(0.0, 1.0 - (np.std(dur) / max(1e-6, np.mean(dur))))) if len(dur) > 1 else 0.0

    mov_x = float(np.median(np.abs(S["mx"])))
    mov_y = float(np.median(np.abs(S["my"])))
    zoom = float(np.median(np.abs(S["div"])))
    giro = float(np.median(np.abs(S["rot"])))

    pal = S["_paleta"]
    orden = np.argsort(-pal)[:8]
    paleta = []
    for i in orden:
        if pal[i] < 0.004:
            break
        rr = ((int(i) >> 4) & 3) * 64 + 32
        gg = ((int(i) >> 2) & 3) * 64 + 32
        bb = (int(i) & 3) * 64 + 32
        mxc, mnc = max(rr, gg, bb), min(rr, gg, bb)
        paleta.append({"hex": "#%02x%02x%02x" % (rr, gg, bb), "peso": round(float(pal[i]), 4),
                       "croma": round((mxc - mnc) / max(1, mxc), 3)})

    anillo_medio = S["_anillos"].mean(axis=0)
    hayTxt = S["txt_area"] > 0.05
    graf = [p for p in planos if p["clase"] == "grafico"]
    reales = [p for p in planos if p["clase"] == "real"]

    return {
        "v": 2,
        "archivo": os.path.basename(ruta),
        "info": info,
        "rango": {"desde": desde, "hasta": hasta} if (desde or hasta) else None,
        "recorte": list(recorte) if recorte else None,
        "trabajo": {"w": w, "h": h, "cuadros_leidos": n, "umbral_dif": round(u_dif, 5),
                    "umbral_hist": round(u_hd, 5),
                    # Cuando mas de la mitad de los cuadros son identicos el umbral no salio del
                    # material sino de un piso, y quien lea los cortes tiene que saberlo.
                    "umbral_de_piso": degenerado},
        "cortes": cortes,
        "transiciones": [{"t": cortes[i], "tipo": tipos[i]} for i in range(len(cortes))],
        "ritmo": {
            "planos": len(planos),
            "duracion_mediana": round(med, 3),
            "bpm_equivalente": round(60.0 / med, 1) if med > 0.05 else None,
            "regularidad": round(regular, 3),
            "mas_corto": round(float(np.min(dur)), 3),
            "mas_largo": round(float(np.max(dur)), 3),
            "tempo_autocorrelacion": _tempo(S["dif"], fps),
        },
        "camara": {
            "pan_px": round(mov_x, 3), "tilt_px": round(mov_y, 3),
            "zoom": round(zoom, 3), "giro": round(giro, 3),
            # LOS CUATRO EJES, no solo el horizontal. El clasificador por plano define "quieta" con
            # pan, tilt, zoom y giro; este agregado usaba la misma palabra mirando solo `mx`, asi que
            # un tilt puro de 3 px por cuadro imprimia "quieta el 100%".
            "quietud": round(float(((np.abs(S["mx"]) < 0.5) & (np.abs(S["my"]) < 0.5)
                                    & (np.abs(S["div"]) < 0.5) & (np.abs(S["rot"]) < 0.5)).mean()), 3),
            "reparto": {c: sum(1 for p in planos if p["camara"] == c)
                        for c in sorted(set(p["camara"] for p in planos))},
        },
        "energia": {
            "movimiento_medio": round(float(S["dif"].mean()), 4),
            "movimiento_p90": round(float(np.percentile(S["dif"], 90)), 4),
            "tinta_media": round(float(S["tinta"].mean()), 4),
            "brillo_medio": round(float(S["brillo"].mean()), 4),
            "brillo_rango": round(float(S["brillo"].max() - S["brillo"].min()), 4),
            "contraste_medio": round(float(S["contraste"].mean()), 4),
            "saturacion_media": round(float(S["sat"].mean()), 4),
            "detalle_medio": round(float(S["detalle"].mean()), 4),
            "pendiente_espectral": round(float(S["pendiente"].mean()), 3),
            "brillo_caja": round(float(S["brillo_caja"].mean()), 4),
            "bloom_falda_mediana": round(float(np.median(S["falda"])), 4),
            "altas_luces_p90": round(float(np.percentile(S["altas"], 90)), 5),
        },
        "estructura": {
            "perfil_radial": [round(float(v), 3) for v in anillo_medio],
            "vineta": round(float(anillo_medio[-1] / max(1e-4, anillo_medio[0])), 3),
            "simetria_angular": round(float(S["simetria"].mean()), 3),
            "caja_contenido": [round(float(np.median(S["caja_x0"])), 3), round(float(np.median(S["caja_y0"])), 3),
                               round(float(np.median(S["caja_x1"])), 3), round(float(np.median(S["caja_y1"])), 3)],
            "caja_area": round(float(np.median(S["caja_area"])), 3),
            "borde_oscuro": round(float(np.median(S["borde_oscuro"])), 3),
            "planos_de_pantalla": sum(1 for p in planos if p.get("pantalla_filmada")),
        },
        "texto": {
            "cobertura_media": round(float(S["txt_area"].mean()), 4),
            "cobertura_p90": round(float(np.percentile(S["txt_area"], 90)), 4),
            "cuadros_con_texto": round(float(hayTxt.mean()), 3),
            # SOLO LOS CUADROS QUE TIENEN TEXTO. Cuando no hay bandas, `medir()` escribe 0.5 en los
            # cuatro bordes y 0 en el alto; promediar eso con los cuadros reales no da un valor
            # imposible sino exactamente "centrado", asi que el fallo es mudo: un reel con el texto
            # siempre en el tercio inferior y presente en el 40% de los cuadros imprimia "centrado en
            # y=0.50" y la receta mandaba la palabra al centro. Dos claves de al lado ya filtraban.
            "ancho_p85": (round(float(np.percentile((S["txt_x1"] - S["txt_x0"])[hayTxt], 85)), 3)
                          if hayTxt.any() else None),
            "alto_p85": round(float(np.percentile(S["txt_alto"][hayTxt], 85)), 3) if hayTxt.any() else None,
            "y_mediana": (round(float(np.median(((S["txt_y0"] + S["txt_y1"]) / 2)[hayTxt])), 3)
                          if hayTxt.any() else None),
            "trazo_mediano": round(float(np.median(S["trazo"][S["trazo"] > 0])) if float((S["trazo"] > 0).sum()) else 0.0, 4),
            "lineas_tipicas": round(float(np.median(S["txt_lineas"][S["txt_lineas"] > 0])) if float((S["txt_lineas"] > 0).sum()) else 0.0, 1),
        },
        "composicion": {
            "centro_x": round(float(np.median(S["cx"])), 3),
            "centro_y": round(float(np.median(S["cy"])), 3),
            "dispersion_x": round(float(S["cx"].std()), 3),
            "lectura": ("centrada" if abs(float(np.median(S["cx"])) - 0.5) < 0.06 else
                        ("a la izquierda" if float(np.median(S["cx"])) < 0.5 else "a la derecha")),
        },
        "paleta": paleta,
        "planos": planos,
        "repetidos": _repetidos(S, planos),
        "reparto_clase": {"grafico": len(graf), "real": len(reales),
                          "mixto": len(planos) - len(graf) - len(reales)},
        "series": {
            "fps": fps,
            "brillo": [round(float(v), 4) for v in S["brillo"]],
            "movimiento": [round(float(v), 4) for v in S["dif"]],
            "texto": [round(float(v), 4) for v in S["txt_area"]],
            "texto_ancho": [round(float(v), 3) for v in (S["txt_x1"] - S["txt_x0"])],
            "caja_area": [round(float(v), 3) for v in S["caja_area"]],
            "saturacion": [round(float(v), 3) for v in S["sat"]],
            "tono": [round(float(v), 1) for v in S["tono"]],
            "centro_x": [round(float(v), 3) for v in S["cx"]],
            "centro_y": [round(float(v), 3) for v in S["cy"]],
            "giro": [round(float(v), 3) for v in S["rot"]],
            "zoom": [round(float(v), 3) for v in S["div"]],
        },
    }


# ---------------------------------------------------------------------------- receta

def receta(a: dict) -> dict:
    """LA TRADUCCION. De numeros medidos a parametros de Boveda, que es para lo que se midio.

    Cada linea de acá tiene del otro lado una clave que existe en el motor. Lo que NO se puede derivar
    de la medicion no se inventa: se deja en None y se dice.
    """
    r, c, e, t, es = a["ritmo"], a["camara"], a["energia"], a["texto"], a["estructura"]
    planos = a["planos"]
    graf = [p for p in planos if p["clase"] != "real"]
    fuente = graf or planos

    beat = r["duracion_mediana"]
    tempo = r.get("tempo_autocorrelacion") or {}
    # El pulso: si la autocorrelacion es fuerte, manda ella; si no, la mediana de los planos. Y si se
    # la descarta por debil, se la descarta ENTERA: la primera version se quedaba con la mediana para
    # el beat pero imprimia igual el bpm de la autocorrelacion descartada, y por eso decia "beats de
    # 0.60 s - 360 bpm", dos numeros que se contradicen en la misma linea.
    fiable = (tempo.get("fuerza", 0) > 0.25 and 0.2 < tempo.get("periodo", 0) < 2.0)
    if fiable:
        beat = tempo["periodo"]

    # velocidad de camara: fraccion del ancho por segundo, que es como se compara contra Boveda
    fps = a["series"]["fps"]
    vel = round((c["pan_px"] + c["tilt_px"]) / max(1, a["trabajo"]["w"]) * fps, 4)

    tonos = [p["tono"] for p in fuente]
    colores = []
    vistos = []
    for p in fuente:
        if any(abs(((p["tono"] - v + 180) % 360) - 180) < 22 for v in vistos):
            continue
        vistos.append(p["tono"])
        colores.append(p["color"])
    curvas = [p["curva"]["gsap"] for p in fuente if p.get("curva") and p["curva"].get("gsap")]
    comun = max(set(curvas), key=curvas.count) if curvas else None

    caja = es["caja_contenido"]
    return {
        "beats": len(planos),
        "beat_segundos": round(beat, 3),
        "duracion_total": round(sum(p["dur"] for p in planos), 2),
        "bpm": (tempo.get("bpm") if fiable else r["bpm_equivalente"]),
        "bpm_fuente": ("autocorrelacion" if fiable else "mediana de los planos"),
        "regularidad": r["regularidad"],
        "camara": {
            "velocidad": vel,
            "modo_dominante": max(c["reparto"], key=c["reparto"].get) if c["reparto"] else "quieta",
            "reparto": c["reparto"],
            "nota": ("la camara casi no vuela: el movimiento lo hace la TIPOGRAFIA y el FONDO"
                     if vel < 0.05 else "hay vuelo real de camara"),
        },
        "fondo": {
            "tipo": ("campo radial" if es["simetria_angular"] > 0.60 and es["perfil_radial"][0] > es["perfil_radial"][-1] * 1.25
                     else ("campo parejo" if es["simetria_angular"] > 0.60 else "direccional")),
            "vineta": es["vineta"],
            "pendiente_espectral": e["pendiente_espectral"],
            "giro_medio": c["giro"],
            "colores": colores[:8],
            "saturacion": e["saturacion_media"],
        },
        "bloom": {
            "falda": e["bloom_falda_mediana"],
            # "SIN ALTAS LUCES QUE MEDIR" NO ES "SIN HALO". Los umbrales del nucleo son absolutos
            # (0.82 de luminancia): un material oscuro no llega nunca y la cuenta da cero en todos los
            # cuadros. Decir "casi sin halo" ahi es afirmar algo que no se midio.
            "lectura": ("sin altas luces que medir: nada del material pasa de 0.82 de luminancia"
                        if e["altas_luces_p90"] < 1e-4 else
                        ("halo ancho: bloom fuerte y umbral bajo" if e["bloom_falda_mediana"] > 0.06
                         else ("halo medio" if e["bloom_falda_mediana"] > 0.025 else "casi sin halo"))),
            "unidad": "espesor del halo como fraccion del ancho de la caja",
        },
        "tipografia": {
            "ancho_relativo_al_cuadro": t["ancho_p85"],
            "ancho_relativo_a_la_caja": (round(t["ancho_p85"] / max(1e-3, caja[2] - caja[0]), 3)
                                         if (t["ancho_p85"] is not None and caja[2] > caja[0]) else None),
            "alto_relativo": t["alto_p85"],
            "y": t["y_mediana"],
            "presencia": t["cuadros_con_texto"],
            "easing_dominante": comun,
            "grosor_de_trazo": t["trazo_mediano"],
            "lineas_por_plano": t["lineas_tipicas"],
            "lectura": ("sin texto medible" if t["ancho_p85"] is None else
                        ("una palabra gigante centrada por plano" if t["ancho_p85"] > 0.45
                         else "texto de apoyo, no protagonista")),
        },
        "tono_general": {
            "brillo": e["brillo_medio"],
            "brillo_del_contenido": e["brillo_caja"],
            "contraste": e["contraste_medio"],
            "registro": ("oscuro y saturado" if e["brillo_caja"] < 0.35 and e["saturacion_media"] > 0.25
                         else ("claro" if e["brillo_caja"] > 0.6 else "medio")),
        },
        "transiciones": {k: sum(1 for x in a["transiciones"] if x["tipo"] == k)
                         for k in sorted(set(x["tipo"] for x in a["transiciones"]))},
        "no_medible": ["texto literal de cada palabra", "tipo de letra", "musica"],
    }


# ---------------------------------------------------------------------------- cuadros a mirar

def clave(a: dict, cuantos: int = 12) -> list:
    """Que instantes conviene MIRAR, elegidos por la medicion y no a ojo.

    Uno por plano, en su punto medio: es donde el plano ya se establecio y todavia no empezo a salir.
    Si hay menos planos que cuadros pedidos, se completa con los instantes de mayor cobertura de texto,
    que son los que mas dicen sobre como compone la pieza.
    """
    fps = a["series"]["fps"]
    n = a["trabajo"]["cuadros_leidos"]
    medios = [round((p["t0"] + p["t1"]) / 2, 3) for p in a["planos"]]
    if len(medios) >= cuantos:
        paso = len(medios) / cuantos
        return sorted(medios[int(i * paso)] for i in range(cuantos))
    txt = np.array(a["series"]["texto"])
    vistos = set(round(t, 1) for t in medios)
    for i in np.argsort(-txt)[: cuantos * 4]:
        t = round(float(i) / fps, 2)
        if round(t, 1) in vistos:
            continue
        vistos.add(round(t, 1))
        medios.append(t)
        if len(medios) >= cuantos:
            break
    return sorted(medios)


def extraer(ruta: str, tiempos: list, dst: str, ancho: int = 540, desfase: float = 0.0, recorte=None) -> list:
    """Segundo pase: solo los cuadros elegidos, a resolucion de mirar.

    Un `-ss` por cuadro con `-accurate_seek`. Son doce llamadas cortas contra una decodificacion entera
    del video, y para un reel de 30 s eso es diez veces mas rapido.
    """
    os.makedirs(dst, exist_ok=True)
    out = []
    for i, t in enumerate(tiempos):
        f = os.path.join(dst, "f%02d_%.2fs.png" % (i, t))
        vf = ""
        if recorte:
            x0, y0, x1, y1 = recorte
            vf = "crop=iw*%.5f:ih*%.5f:iw*%.5f:ih*%.5f," % (x1 - x0, y1 - y0, x0, y0)
        r = subprocess.run(["ffmpeg", "-v", "error", "-accurate_seek", "-ss", "%.3f" % (t + desfase),
                            "-i", ruta, "-frames:v", "1", "-vf", vf + "scale=%d:-1" % ancho, "-y", f],
                           capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(f):
            out.append(f)
    return out


def denso(ruta: str, t0: float, t1: float, fps: float, dst: str, ancho: int = 420) -> list:
    """Muchos cuadros seguidos de un tramo, en UNA sola llamada a ffmpeg.

    Para mirar COMO se anima algo —una palabra que aparece, un barrido— hace falta la secuencia, no
    instantes sueltos. Y `-r` dentro de un solo proceso cuesta una decodificacion del tramo, no una
    por cuadro.
    """
    os.makedirs(dst, exist_ok=True)
    for viejo in os.listdir(dst):
        if viejo.endswith(".png"):
            os.remove(os.path.join(dst, viejo))
    subprocess.run(["ffmpeg", "-v", "error", "-accurate_seek", "-ss", "%.3f" % t0, "-to", "%.3f" % t1,
                    "-i", ruta, "-vf", "fps=%g,scale=%d:-1" % (fps, ancho), "-y",
                    os.path.join(dst, "d%03d.png")], capture_output=True, text=True)
    return sorted(os.path.join(dst, f) for f in os.listdir(dst) if f.endswith(".png"))


def hoja(imgs: list, destino: str, cols: int = 6, ancho: int = 220):
    from PIL import Image
    if not imgs:
        return None
    ims = [Image.open(p).convert("RGB") for p in imgs]
    w, h = ims[0].size
    esc = ancho / w
    w, h = int(w * esc), int(h * esc)
    filas = (len(ims) + cols - 1) // cols
    out = Image.new("RGB", (w * cols, h * filas), "#101010")
    for i, im in enumerate(ims):
        out.paste(im.resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
    out.save(destino)
    return destino


# ---------------------------------------------------------------------------- salida

def _n(x, fmt="%.2f", si_no="sin medir"):
    """Un valor que no se pudo medir se escribe como tal, nunca como 0.00.

    Es la regla de todo este archivo aplicada al ultimo tramo: `t["ancho_p85"] or 0` convertia un "no
    hay texto en ningun cuadro" en un 0.00 con cara de medicion, y `%s` sobre None imprimia "None bpm".
    """
    return si_no if x is None else (fmt % x)


def tabla(a: dict) -> str:
    L = []
    i, r, c, e, t, co, es = a["info"], a["ritmo"], a["camara"], a["energia"], a["texto"], a["composicion"], a["estructura"]
    L.append("REFERENCIA  %s" % a["archivo"])
    L.append("  %dx%d - %s - %s fps - %.1f s - %d cuadros analizados"
             % (i["w"], i["h"], i["codec"], i["fps"], i["dur"], a["trabajo"]["cuadros_leidos"]))
    if a.get("rango"):
        L.append("  RANGO      solo %.2f s a %.2f s" % (a["rango"]["desde"], a["rango"]["hasta"]))
    if a.get("recorte"):
        L.append("  RECORTE    solo x[%.2f-%.2f] y[%.2f-%.2f] del cuadro"
                 % (a["recorte"][0], a["recorte"][2], a["recorte"][1], a["recorte"][3]))
    L.append("")
    ta = r.get("tempo_autocorrelacion") or {}
    L.append("  RITMO      %d planos - mediana %.2f s (%s bpm) - regularidad %.3f - de %.2f a %.2f s"
             % (r["planos"], r["duracion_mediana"], r["bpm_equivalente"], r["regularidad"],
                r["mas_corto"], r["mas_largo"]))
    if ta:
        L.append("             pulso por autocorrelacion: %.2f s = %s bpm (fuerza %.2f)"
                 % (ta["periodo"], ta["bpm"], ta["fuerza"]))
    trs = {}
    for x in a["transiciones"]:
        trs[x["tipo"]] = trs.get(x["tipo"], 0) + 1
    if trs:
        L.append("             transiciones: " + ", ".join("%s x%d" % (k, v) for k, v in sorted(trs.items())))
    L.append("  CAMARA     pan %.2f px/cuadro - tilt %.2f - zoom %.2f - giro %.2f - quieta el %.0f%%"
             % (c["pan_px"], c["tilt_px"], c["zoom"], c["giro"], c["quietud"] * 100))
    L.append("             por plano: " + ", ".join("%s x%d" % (k, v) for k, v in c["reparto"].items()))
    L.append("  ENERGIA    mov %.4f (p90 %.4f) - tinta %.3f - brillo %.3f (rango %.3f) - contraste %.3f"
             % (e["movimiento_medio"], e["movimiento_p90"], e["tinta_media"], e["brillo_medio"],
                e["brillo_rango"], e["contraste_medio"]))
    L.append("             saturacion %.3f - detalle %.4f - pendiente espectral %.2f - halo %.3f"
             % (e["saturacion_media"], e["detalle_medio"], e["pendiente_espectral"], e["bloom_falda_mediana"]))
    L.append("             brillo del contenido (dentro de la caja) %.3f" % e["brillo_caja"])
    L.append("  ESTRUCTURA perfil radial centro->borde  " + " ".join("%.2f" % v for v in es["perfil_radial"]))
    L.append("             vineta %.2f - simetria angular %.3f - caja de contenido x[%.2f-%.2f] y[%.2f-%.2f]"
             % (es["vineta"], es["simetria_angular"], es["caja_contenido"][0], es["caja_contenido"][2],
                es["caja_contenido"][1], es["caja_contenido"][3]))
    L.append("             la caja ocupa el %.0f%% del cuadro - lo de afuera brilla %.3f - %d planos son pantalla filmada"
             % (es["caja_area"] * 100, es["borde_oscuro"], es["planos_de_pantalla"]))
    L.append("  TEXTO      area media %.1f%% (p90 %.1f%%) - presente en %.0f%% de los cuadros"
             % (t["cobertura_media"] * 100, t["cobertura_p90"] * 100, t["cuadros_con_texto"] * 100))
    L.append("             ancho p85 %s del cuadro - alto %s - centrado en y=%s - trazo %s - %s lineas"
             % (_n(t["ancho_p85"]), _n(t["alto_p85"]), _n(t["y_mediana"]),
                _n(t["trazo_mediano"], "%.3f"), _n(t["lineas_tipicas"], "%.0f")))
    L.append("  COMPOSICION %s - centro (%.2f, %.2f) - dispersion %.3f"
             % (co["lectura"], co["centro_x"], co["centro_y"], co["dispersion_x"]))
    L.append("  PALETA     " + "  ".join("%s(%.0f%%)" % (p["hex"], p["peso"] * 100) for p in a["paleta"]))
    L.append("  CLASE      " + ", ".join("%s x%d" % (k, v) for k, v in a["reparto_clase"].items() if v))
    return "\n".join(L)


def tabla_planos(a: dict) -> str:
    L = ["", "  PLANO POR PLANO", "  " + "-" * 116,
         "  %-3s %-6s %-6s %-8s %-9s %-8s %-7s %-6s %-6s %-5s %-5s %s"
         % ("#", "t0", "dur", "clase", "camara", "color", "tono", "sat", "bri", "txt", "pant", "curva")]
    for p in a["planos"]:
        cur = p["curva"]["gsap"] if p.get("curva") else "-"
        L.append("  %-3d %-6.2f %-6.2f %-8s %-9s %-8s %-7s %-6.2f %-6.2f %-5.2f %-5s %s"
                 % (p["n"], p["t0"], p["dur"], p["clase"], p["camara"], p["color"],
                    p["tono_nombre"][:7], p["saturacion"], p["brillo_caja"], p["texto_ancho"],
                    "si" if p.get("pantalla_filmada") else "-", cur))
    if a["repetidos"]:
        L.append("")
        L.append("  PLANOS QUE VUELVEN: " + ", ".join("%d~%d(%.3f)" % (x["a"], x["b"], x["distancia"])
                                                      for x in a["repetidos"][:6]))
    return "\n".join(L)


def tabla_receta(rc: dict) -> str:
    L = ["", "  RECETA PARA BOVEDA", "  " + "-" * 116]
    # El "=" de antes decia una falsedad cuando el beat sale de la autocorrelacion: beats x beat no
    # tiene por que dar el total, porque no todos los planos duran un beat. Se separan.
    L.append("  ritmo       %d planos - beat %s s - %.1f s totales - %s bpm (%s) - regularidad %.2f"
             % (rc["beats"], _n(rc["beat_segundos"]), rc["duracion_total"], _n(rc["bpm"], "%.1f"),
                rc["bpm_fuente"], rc["regularidad"]))
    L.append("  camara      velocidad %.4f del ancho/s - dominante '%s'  ->  %s"
             % (rc["camara"]["velocidad"], rc["camara"]["modo_dominante"], rc["camara"]["nota"]))
    f = rc["fondo"]
    L.append("  fondo       %s - vineta %.2f - pendiente espectral %.2f - giro %.2f - saturacion %.2f"
             % (f["tipo"], f["vineta"], f["pendiente_espectral"], f["giro_medio"], f["saturacion"]))
    L.append("  colores     " + "  ".join(f["colores"]))
    L.append("  bloom       halo de %s del ancho  ->  %s" % (_n(rc["bloom"]["falda"], "%.3f"), rc["bloom"]["lectura"]))
    tp = rc["tipografia"]
    L.append("  tipografia  ancho %s del cuadro (%s de la caja util) - alto %s - y=%s - easing %s"
             % (_n(tp["ancho_relativo_al_cuadro"]), _n(tp["ancho_relativo_a_la_caja"]),
                _n(tp["alto_relativo"]), _n(tp["y"]), tp["easing_dominante"] or "sin medir"))
    L.append("              %s - trazo %s del ancho - %s linea(s) por plano"
             % (tp["lectura"], _n(tp["grosor_de_trazo"], "%.3f"), _n(tp["lineas_por_plano"], "%.0f")))
    L.append("  registro    %s (brillo %.2f, contraste %.2f)"
             % (rc["tono_general"]["registro"], rc["tono_general"]["brillo"], rc["tono_general"]["contraste"]))
    L.append("  transiciones " + ", ".join("%s x%d" % (k, v) for k, v in rc["transiciones"].items()))
    L.append("  NO MEDIBLE  " + ", ".join(rc["no_medible"]))
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser(description="Desarma un video de referencia para poder replicarlo")
    ap.add_argument("entrada", help="archivo mp4 o URL")
    ap.add_argument("--hoja", type=int, default=0, help="extraer N cuadros clave y armar una hoja")
    ap.add_argument("--planos", action="store_true", help="un cuadro por plano + hoja")
    ap.add_argument("--rango", nargs=2, type=float, metavar=("T0", "T1"), help="analizar solo ese tramo")
    ap.add_argument("--recorte", nargs=4, type=float, metavar=("X0", "Y0", "X1", "Y1"),
                    help="analizar solo ese rectangulo del cuadro, en fracciones 0..1")
    ap.add_argument("--denso", nargs=3, type=float, metavar=("T0", "T1", "FPS"),
                    help="ademas, muchos cuadros seguidos de ese tramo")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    os.makedirs(SALIDA, exist_ok=True)
    ruta = a.entrada
    if ruta.startswith("http"):
        nom = ruta.rstrip("/").split("/")[-1] or "ref"
        dst = os.path.join(SALIDA, nom + ".mp4")
        if not os.path.exists(dst):
            print("bajando %s ..." % ruta)
            r = subprocess.run(["yt-dlp", "--no-warnings", "-f", "bv*+ba/b", "-o", dst, ruta],
                               capture_output=True, text=True)
            if r.returncode != 0:
                print("no se pudo bajar:\n" + (r.stderr or "")[-500:])
                raise SystemExit(2)
        ruta = dst

    if not os.path.exists(ruta):
        print("no existe: %s" % ruta)
        raise SystemExit(2)

    # VALIDAR EL RECORTE ANTES DE CONSTRUIR NADA. Con `x1 < x0`, el `max(1e-6, x1-x0)` de `medir`
    # convertia un divisor negativo en 1e-6 y la proporcion se multiplicaba por ~800.000: el alto de
    # trabajo daba 72 millones y las ventanas de Hann se reservaban con ese alto, todo antes de que
    # ffmpeg arrancara. En esta maquina eso son 23 GB de pedido, o sea el cuelgue que este repo tiene
    # documentado en tres lugares. Y con el eje Y invertido el sintoma era mudo: h=2, ffmpeg fallaba
    # con el stderr en DEVNULL y el error culpaba al video en vez del argumento.
    if a.recorte:
        x0, y0, x1, y1 = a.recorte
        malos = []
        if not (0 <= x0 < x1 <= 1):
            malos.append("X (%.3f a %.3f)" % (x0, x1))
        if not (0 <= y0 < y1 <= 1):
            malos.append("Y (%.3f a %.3f)" % (y0, y1))
        if malos:
            print("--recorte va X0 Y0 X1 Y1 en fracciones de 0 a 1, y cada par tiene que ir de menor a")
            print("mayor. Esta mal: " + ", ".join(malos))
            raise SystemExit(2)
    if a.rango and not (a.rango[1] > a.rango[0] >= 0):
        print("--rango va T0 T1 en segundos, con T1 mayor que T0.")
        raise SystemExit(2)

    d0, d1 = (a.rango or (0.0, 0.0))
    res = analizar(ruta, d0, d1, tuple(a.recorte) if a.recorte else None)
    res["receta"] = receta(res)
    base = os.path.splitext(os.path.basename(ruta))[0]
    if a.rango:
        base += "_%.0f-%.0f" % (d0, d1)
    if a.recorte:
        base += "_rec"
    with open(os.path.join(SALIDA, base + ".analisis.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    if a.json:
        print(json.dumps(res, ensure_ascii=False, indent=1))
    else:
        print(tabla(res))
        print(tabla_planos(res))
        print(tabla_receta(res["receta"]))

    n_hoja = a.hoja or (len(res["planos"]) if a.planos else 0)
    if n_hoja:
        ts = clave(res, n_hoja)
        dd = os.path.join(SALIDA, base + "_cuadros")
        imgs = extraer(ruta, ts, dd, desfase=d0, recorte=tuple(a.recorte) if a.recorte else None)
        h = hoja(imgs, os.path.join(SALIDA, base + "_hoja.png"))
        print("\n  %d cuadros clave en %s" % (len(imgs), dd))
        if h:
            print("  hoja de contactos: %s" % h)

    if a.denso:
        t0, t1, fp = a.denso
        dd = os.path.join(SALIDA, base + "_denso")
        imgs = denso(ruta, t0, t1, fp, dd)
        h = hoja(imgs, os.path.join(SALIDA, base + "_denso.png"), cols=8, ancho=180)
        print("\n  %d cuadros densos (%.1f a %.1f s, %g fps) en %s" % (len(imgs), t0, t1, fp, dd))
        if h:
            print("  hoja densa: %s" % h)


if __name__ == "__main__":
    main()
