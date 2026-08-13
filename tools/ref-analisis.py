"""REF-ANALISIS — desarma un video de referencia para poder replicarlo.

POR QUE EXISTE
==============

Bóveda replica un género. Hasta ahora ese género lo tenía yo en la cabeza y lo escribía de memoria, y
eso produjo exactamente lo que se esperaría: piezas que se parecen a lo que yo *creo* que es el género.
Cuando el usuario pasó una referencia concreta y le erré al registro dos veces seguidas, quedó claro que
el problema no era la ejecución sino que **no estaba midiendo la referencia**.

Esto la mide. Le das un video —un reel, un showreel de After Effects, lo que sea— y te devuelve los
números que hacen falta para replicarlo: dónde corta, a qué ritmo, cuánto se mueve la cámara, qué
paleta usa y cómo cambia, dónde vive la masa en el cuadro, cuánta pantalla ocupa el texto.

No es un análisis "de video" genérico. Cada medición está elegida porque **hay un parámetro de Bóveda
del otro lado**:

    corte / ritmo        ->  meta.beats y meta.tiempos de la plantilla
    movimiento global    ->  el vuelo: avance, desliz, órbita, o quieto
    zoom (divergencia)   ->  si la cámara se acerca o el objeto crece
    paleta en el tiempo  ->  si el espacio cambia de color entre tiempos
    masa en el cuadro    ->  dónde se compone: centrado, tercios, borde
    cobertura de texto   ->  cuánto cuadro ocupa la tipografía
    energía              ->  R.velocidad, R.capas

COMO ESTA OPTIMIZADO, que es la parte que importa
-------------------------------------------------

1. **Una sola decodificación.** ffmpeg decodifica el video UNA vez, ya reescalado, y lo escupe por una
   tubería en `rgb24` crudo. No se escriben 900 PNG al disco para volver a leerlos: eso cuesta más en
   E/S que todo el análisis junto.
2. **Resolución de trabajo chica y fija.** Todo lo que se mide acá es de grano grueso —cortes, masas,
   movimiento global— y a 160 px de ancho da el mismo resultado que a 1080 con 45 veces menos píxeles.
   Los cuadros que se guardan como imagen se extraen después, en un segundo pase y sólo esos.
3. **Memoria constante.** Se procesa en streaming: en cualquier instante hay dos cuadros en RAM, no
   novecientos. Un reel de 60 s ocupa lo mismo que uno de 5.
4. **Todo vectorizado en numpy.** Ni un bucle sobre píxeles en Python.
5. **El movimiento global se estima por CORRELACION DE FASE** —una FFT por cuadro— y no por flujo
   óptico denso. Da el desplazamiento entero de la imagen, que es justo lo que hace una cámara, y
   cuesta O(n log n) en vez de O(n·k).

Uso:

    python tools/ref-analisis.py <archivo.mp4>
    python tools/ref-analisis.py <archivo.mp4> --hoja 12      (además, una hoja de contactos)
    python tools/ref-analisis.py <url>                        (baja con yt-dlp y analiza)

Escribe `tools/out/ref/<nombre>.analisis.json` con todo, e imprime la lectura en castellano.
"""
from __future__ import annotations

import argparse
import json
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


# ---------------------------------------------------------------------------- entrada

def sondear(ruta: str) -> dict:
    """Dimensiones, fps y duración reales. Se leen del contenedor, no se suponen."""
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate,nb_frames:format=duration", "-of", "json", ruta],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("ffprobe fallo: " + (r.stderr or "")[:200])
    j = json.loads(r.stdout)
    st = (j.get("streams") or [{}])[0]
    num, _, den = (st.get("r_frame_rate") or "30/1").partition("/")
    fps = float(num) / float(den or 1)
    dur = float((j.get("format") or {}).get("duration") or 0)
    return {
        "w": int(st.get("width") or 0), "h": int(st.get("height") or 0),
        "fps": round(fps, 3), "dur": round(dur, 3),
        "cuadros": int(st.get("nb_frames") or 0) or int(round(dur * fps)),
    }


def cuadros(ruta: str, w: int, h: int):
    """Generador de cuadros como arrays uint8 (h, w, 3), en streaming.

    UNA sola decodificación y ni un archivo intermedio. `-vsync 0` para que ffmpeg no duplique ni tire
    cuadros al reescalar: si lo hiciera, el eje de tiempo del análisis dejaría de coincidir con el del
    video y todos los tiempos medidos estarían corridos.
    """
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", ruta, "-vf", f"scale={w}:{h}:flags=area",
         "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=w * h * 3 * 8)
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


# ---------------------------------------------------------------------------- mediciones

def _lum(f: np.ndarray) -> np.ndarray:
    """Luminancia perceptual en 0..1. Sobre float32 porque todo lo demás la consume así."""
    return (0.2126 * f[:, :, 0] + 0.7152 * f[:, :, 1] + 0.0722 * f[:, :, 2]).astype(np.float32) / 255.0


def _hist(f: np.ndarray) -> np.ndarray:
    """Histograma conjunto de color, 4×4×4 celdas, normalizado.

    Grueso a propósito. Un histograma fino distingue dos cuadros consecutivos del MISMO plano —cambia
    el grano, cambia una sombra— y entonces todo parece un corte. Con 64 celdas sólo se mueve cuando
    cambia la distribución de color de verdad, que es lo que hace un corte.
    """
    q = (f >> 6).astype(np.int32)          # 0..3 por canal
    idx = (q[:, :, 0] << 4) | (q[:, :, 1] << 2) | q[:, :, 2]
    h = np.bincount(idx.ravel(), minlength=64).astype(np.float32)
    return h / max(1.0, h.sum())


def _fase(a: np.ndarray, b: np.ndarray, ventana: np.ndarray):
    """Desplazamiento global entre dos cuadros por CORRELACION DE FASE.

    Es la forma barata y robusta de contestar "¿cuánto se movió la cámara?". Se multiplican los
    espectros de los dos cuadros (uno conjugado), se normaliza por el módulo —de ahí lo de *fase*: se
    tira la amplitud y se queda sólo el desfase— y la antitransformada tiene un pico en el
    desplazamiento. Es inmune a cambios de brillo, que es exactamente lo que hace falta en un video con
    luces animadas.

    La ventana de Hann evita que los bordes del cuadro, que son un salto abrupto, metan un pico falso
    en el centro.
    """
    A = np.fft.rfft2(a * ventana)
    B = np.fft.rfft2(b * ventana)
    R = A * np.conj(B)
    m = np.abs(R)
    R = np.divide(R, m, out=np.zeros_like(R), where=m > 1e-8)
    c = np.fft.irfft2(R, s=a.shape)
    pico = int(np.argmax(c))
    y, x = np.unravel_index(pico, c.shape)
    # El pico vive en coordenadas cíclicas: más de medio cuadro significa desplazamiento negativo.
    if y > a.shape[0] // 2:
        y -= a.shape[0]
    if x > a.shape[1] // 2:
        x -= a.shape[1]
    return float(x), float(y), float(c.max())


def analizar(ruta: str) -> dict:
    info = sondear(ruta)
    if not info["w"]:
        raise RuntimeError("el archivo no tiene stream de video")
    w = ANCHO_W
    h = max(2, int(round(ANCHO_W * info["h"] / info["w"])) // 2 * 2)
    fps = info["fps"] or 30.0

    ventana = np.outer(np.hanning(h), np.hanning(w)).astype(np.float32)
    # Cuadrantes, para sacar la DIVERGENCIA del movimiento: si los cuatro se separan del centro, la
    # cámara se acerca (o el objeto crece). Es la señal que distingue un avance de un desliz.
    mitad_y, mitad_x = h // 2, w // 2

    prev_l = prev_h = None
    prev_q = None
    L, DIF, HD, MX, MY, DIVG, TINTA, CX, CY, TXT = [], [], [], [], [], [], [], [], [], []
    paleta_acum = np.zeros(64, dtype=np.float64)

    ys = np.arange(h, dtype=np.float32)[:, None]
    xs = np.arange(w, dtype=np.float32)[None, :]

    for f in cuadros(ruta, w, h):
        l = _lum(f)
        hh = _hist(f)
        paleta_acum += hh

        L.append(float(l.mean()))

        # TINTA: cuánto del cuadro se aparta del valor dominante. Es la medida de "cuánto está pasando"
        # y no depende de si el fondo es claro u oscuro.
        modo = float(np.median(l))
        tinta = float((np.abs(l - modo) > 0.18).mean())
        TINTA.append(tinta)

        # DONDE ESTA LA MASA. El centro de gravedad de lo que se aparta del fondo, en coordenadas
        # 0..1. Es lo que dice si la pieza compone al centro, a un tercio o contra un borde.
        peso = np.abs(l - modo)
        s = float(peso.sum())
        if s > 1e-6:
            CX.append(float((peso * xs).sum() / s) / w)
            CY.append(float((peso * ys).sum() / s) / h)
        else:
            CX.append(0.5)
            CY.append(0.5)

        # TEXTO: energía de bordes VERTICALES en franjas horizontales. Un glifo es un patrón de trazos
        # verticales cortos y muy juntos; una foto o un degradado no tienen esa firma. No detecta
        # *qué* dice, que no hace falta: lo que se quiere saber es cuánta pantalla ocupa la tipografía.
        gx = np.abs(np.diff(l, axis=1))
        fuerte = gx > 0.10
        # densidad por fila: una fila de texto tiene muchos cruces; una de imagen, pocos y dispersos
        por_fila = fuerte.mean(axis=1)
        TXT.append(float((por_fila > 0.09).mean()))

        if prev_l is not None:
            DIF.append(float(np.abs(l - prev_l).mean()))
            # Distancia de histograma en L1. Entre 0 (idéntico) y 2 (sin un color en común).
            HD.append(float(np.abs(hh - prev_h).sum()))
            dx, dy, _pk = _fase(l, prev_l, ventana)
            MX.append(dx)
            MY.append(dy)
            # Divergencia: se compara el desplazamiento del cuadrante superior-izquierdo contra el
            # inferior-derecho. Si se separan, hay zoom.
            a1 = l[:mitad_y, :mitad_x]
            b1 = prev_l[:mitad_y, :mitad_x]
            a2 = l[mitad_y:, mitad_x:]
            b2 = prev_l[mitad_y:, mitad_x:]
            v1 = np.outer(np.hanning(a1.shape[0]), np.hanning(a1.shape[1])).astype(np.float32)
            v2 = np.outer(np.hanning(a2.shape[0]), np.hanning(a2.shape[1])).astype(np.float32)
            dx1, dy1, _ = _fase(a1, b1, v1)
            dx2, dy2, _ = _fase(a2, b2, v2)
            DIVG.append(float((dx2 - dx1) + (dy2 - dy1)))
        prev_l, prev_h = l, hh

    n = len(L)
    if n < 4:
        raise RuntimeError(f"solo {n} cuadros: el video no se pudo decodificar")

    L = np.array(L); TINTA = np.array(TINTA); CX = np.array(CX); CY = np.array(CY); TXT = np.array(TXT)
    DIF = np.array(DIF); HD = np.array(HD); MX = np.array(MX); MY = np.array(MY); DIVG = np.array(DIVG)

    # ---------------------------------------------------------------- cortes
    #
    # DOS SEÑALES Y LAS DOS TIENEN QUE ESTAR DE ACUERDO. La diferencia de píxeles sola marca cualquier
    # movimiento rápido como corte; la de histograma sola se pierde los cortes entre dos planos de la
    # misma paleta, que en este género son la mayoría. Juntas, el falso positivo tiene que engañar a las
    # dos a la vez.
    #
    # Y el umbral es RELATIVO al propio material —mediana más k desviaciones— porque un video con mucho
    # movimiento tiene un piso alto y uno quieto lo tiene casi en cero. Un umbral absoluto encuentra
    # cuarenta cortes en uno y ninguno en el otro.
    def _umbral(v, k=4.5):
        med = float(np.median(v))
        mad = float(np.median(np.abs(v - med))) or 1e-6
        return med + k * mad * 1.4826

    u_dif, u_hd = _umbral(DIF), _umbral(HD)
    cand = (DIF > u_dif) & (HD > u_hd)
    cortes, ultimo = [], -99
    sep = max(2, int(fps * 0.20))          # dos cortes a menos de 200 ms son el mismo corte
    for i in range(len(cand)):
        if cand[i] and (i - ultimo) > sep:
            cortes.append(round((i + 1) / fps, 3))
            ultimo = i

    # ---------------------------------------------------------------- ritmo
    planos = np.diff([0.0] + cortes + [n / fps]) if cortes else np.array([n / fps])
    planos = planos[planos > 0.05]
    bpm = None
    regular = 0.0
    if len(planos) >= 2:
        med = float(np.median(planos))
        if med > 0.05:
            bpm = round(60.0 / med, 1)
        regular = float(max(0.0, 1.0 - (planos.std() / max(1e-6, planos.mean()))))

    # ---------------------------------------------------------------- movimiento de cámara
    #
    # La mediana y no la media: un solo corte mete un desplazamiento enorme y espurio que arrastraría
    # cualquier promedio. La mediana lo ignora por construcción.
    mov_x = float(np.median(np.abs(MX)))
    mov_y = float(np.median(np.abs(MY)))
    zoom = float(np.median(np.abs(DIVG)))
    # Fracción del ancho por segundo, que es la unidad con la que se puede comparar contra Bóveda.
    pan_seg = round(float(np.median(np.abs(MX)) / w * fps), 4)
    tilt_seg = round(float(np.median(np.abs(MY)) / h * fps), 4)

    if mov_x < 0.35 and mov_y < 0.35 and zoom < 0.6:
        vuelo = "quieta"
    elif zoom > max(mov_x, mov_y) * 1.4:
        vuelo = "avance (zoom / dolly)"
    elif mov_x > mov_y * 1.8:
        vuelo = "desliz lateral"
    elif mov_y > mov_x * 1.8:
        vuelo = "vertical"
    else:
        vuelo = "mixto / orbita"

    # ---------------------------------------------------------------- paleta
    paleta_acum /= max(1e-9, paleta_acum.sum())
    orden = np.argsort(-paleta_acum)[:8]
    paleta = []
    for i in orden:
        if paleta_acum[i] < 0.004:
            break
        r = ((int(i) >> 4) & 3) * 64 + 32
        g = ((int(i) >> 2) & 3) * 64 + 32
        bl = (int(i) & 3) * 64 + 32
        mx, mn = max(r, g, bl), min(r, g, bl)
        paleta.append({
            "hex": "#%02x%02x%02x" % (r, g, bl),
            "peso": round(float(paleta_acum[i]), 4),
            "croma": round((mx - mn) / max(1, mx), 3),
        })

    # ---------------------------------------------------------------- lecturas de composición
    comp_x = float(np.median(CX))
    comp_y = float(np.median(CY))
    disp_x = float(np.std(CX))

    return {
        "v": 1,
        "archivo": os.path.basename(ruta),
        "info": info,
        "trabajo": {"w": w, "h": h, "cuadros_leidos": n},
        "cortes": cortes,
        "ritmo": {
            "planos": len(planos),
            "duracion_mediana": round(float(np.median(planos)), 3) if len(planos) else None,
            "bpm_equivalente": bpm,
            "regularidad": round(regular, 3),
            "corte_mas_corto": round(float(planos.min()), 3) if len(planos) else None,
            "corte_mas_largo": round(float(planos.max()), 3) if len(planos) else None,
        },
        "camara": {
            "tipo": vuelo,
            "pan_por_segundo": pan_seg,
            "tilt_por_segundo": tilt_seg,
            "zoom": round(zoom, 3),
            "quietud": round(float((np.abs(MX) < 0.5).mean()), 3),
        },
        "energia": {
            "movimiento_medio": round(float(DIF.mean()), 4),
            "movimiento_p90": round(float(np.percentile(DIF, 90)), 4),
            "tinta_media": round(float(TINTA.mean()), 4),
            "brillo_medio": round(float(L.mean()), 4),
            "brillo_rango": round(float(L.max() - L.min()), 4),
        },
        "texto": {
            "cobertura_media": round(float(TXT.mean()), 4),
            "cobertura_p90": round(float(np.percentile(TXT, 90)), 4),
            "cuadros_con_texto": round(float((TXT > 0.05).mean()), 3),
        },
        "composicion": {
            "centro_x": round(comp_x, 3),
            "centro_y": round(comp_y, 3),
            "dispersion_x": round(disp_x, 3),
            "lectura": ("centrada" if abs(comp_x - 0.5) < 0.06 else
                        ("a la izquierda" if comp_x < 0.5 else "a la derecha")),
        },
        "paleta": paleta,
        # Las series completas, para poder graficarlas o volver a leerlas sin re-decodificar.
        "series": {
            "fps": fps,
            "brillo": [round(float(v), 4) for v in L],
            "movimiento": [round(float(v), 4) for v in DIF],
            "texto": [round(float(v), 4) for v in TXT],
            "centro_x": [round(float(v), 3) for v in CX],
            "centro_y": [round(float(v), 3) for v in CY],
        },
    }


# ---------------------------------------------------------------------------- cuadros clave

def clave(a: dict, cuantos: int = 12) -> list:
    """Qué instantes conviene MIRAR, elegidos por la medición y no a ojo.

    Uno por plano, en su punto medio: es donde el plano ya se estableció y todavía no empezó a salir.
    Si hay menos planos que cuadros pedidos, se completa con los instantes de mayor cobertura de texto,
    que son los que más dicen sobre cómo compone la pieza.
    """
    fps = a["series"]["fps"]
    n = a["trabajo"]["cuadros_leidos"]
    bordes = [0.0] + list(a["cortes"]) + [n / fps]
    medios = [(bordes[i] + bordes[i + 1]) / 2 for i in range(len(bordes) - 1)]
    medios = [t for t in medios if 0 <= t < n / fps]
    if len(medios) >= cuantos:
        paso = len(medios) / cuantos
        return sorted(medios[int(i * paso)] for i in range(cuantos))
    txt = np.array(a["series"]["texto"])
    extra = np.argsort(-txt)[: cuantos * 3]
    vistos = set(round(t, 1) for t in medios)
    for i in extra:
        t = round(float(i) / fps, 2)
        if round(t, 1) in vistos:
            continue
        vistos.add(round(t, 1))
        medios.append(t)
        if len(medios) >= cuantos:
            break
    return sorted(medios)


def extraer(ruta: str, tiempos: list, dst: str, ancho: int = 540) -> list:
    """Segundo pase: sólo los cuadros elegidos, a resolución de mirar.

    Un `-ss` por cuadro con `-accurate_seek`. Son doce llamadas cortas contra una decodificación entera
    del video, y para un reel de 30 s eso es diez veces más rápido.
    """
    os.makedirs(dst, exist_ok=True)
    out = []
    for i, t in enumerate(tiempos):
        f = os.path.join(dst, f"f{i:02d}_{t:.2f}s.png")
        r = subprocess.run(["ffmpeg", "-v", "error", "-accurate_seek", "-ss", f"{t:.3f}",
                            "-i", ruta, "-frames:v", "1", "-vf", f"scale={ancho}:-1", "-y", f],
                           capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(f):
            out.append(f)
    return out


def hoja(imgs: list, destino: str, cols: int = 6):
    from PIL import Image
    if not imgs:
        return None
    ims = [Image.open(p).convert("RGB") for p in imgs]
    w, h = ims[0].size
    esc = 220 / w
    w, h = int(w * esc), int(h * esc)
    filas = (len(ims) + cols - 1) // cols
    out = Image.new("RGB", (w * cols, h * filas), "#101010")
    for i, im in enumerate(ims):
        out.paste(im.resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
    out.save(destino)
    return destino


# ---------------------------------------------------------------------------- salida

def tabla(a: dict) -> str:
    L = []
    i, r, c, e, t, co = a["info"], a["ritmo"], a["camara"], a["energia"], a["texto"], a["composicion"]
    L.append(f"REFERENCIA  {a['archivo']}")
    L.append(f"  {i['w']}x{i['h']} · {i['fps']} fps · {i['dur']:.1f} s · {a['trabajo']['cuadros_leidos']} cuadros analizados")
    L.append("")
    L.append(f"  RITMO      {r['planos']} planos · mediana {r['duracion_mediana']} s"
             + (f" (equivale a {r['bpm_equivalente']} bpm)" if r["bpm_equivalente"] else "")
             + f" · regularidad {r['regularidad']}")
    if r["corte_mas_corto"] is not None:
        L.append(f"             el mas corto {r['corte_mas_corto']} s · el mas largo {r['corte_mas_largo']} s")
    L.append(f"  CAMARA     {c['tipo']} · pan {c['pan_por_segundo']} del ancho por segundo · "
             f"tilt {c['tilt_por_segundo']} · zoom {c['zoom']} · quieta el {c['quietud']*100:.0f}% del tiempo")
    L.append(f"  ENERGIA    movimiento medio {e['movimiento_medio']} (p90 {e['movimiento_p90']}) · "
             f"tinta {e['tinta_media']} · brillo {e['brillo_medio']} con rango {e['brillo_rango']}")
    L.append(f"  TEXTO      ocupa {t['cobertura_media']*100:.1f}% del cuadro de media "
             f"(p90 {t['cobertura_p90']*100:.1f}%) · hay texto en el {t['cuadros_con_texto']*100:.0f}% de los cuadros")
    L.append(f"  COMPOSICION {co['lectura']} · centro ({co['centro_x']}, {co['centro_y']}) · "
             f"dispersion horizontal {co['dispersion_x']}")
    L.append("  PALETA     " + "  ".join(f"{p['hex']}({p['peso']*100:.0f}%)" for p in a["paleta"]))
    if a["cortes"]:
        cs = ", ".join(f"{t:.2f}" for t in a["cortes"][:18])
        L.append(f"  CORTES     {cs}" + (" ..." if len(a["cortes"]) > 18 else ""))
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser(description="Desarma un video de referencia para poder replicarlo")
    ap.add_argument("entrada", help="archivo mp4 o URL")
    ap.add_argument("--hoja", type=int, default=0, help="ademas, extraer N cuadros clave y armar una hoja")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    os.makedirs(SALIDA, exist_ok=True)
    ruta = a.entrada
    if ruta.startswith("http"):
        nom = ruta.rstrip("/").split("/")[-1] or "ref"
        dst = os.path.join(SALIDA, nom + ".mp4")
        if not os.path.exists(dst):
            print(f"bajando {ruta} ...")
            r = subprocess.run(["yt-dlp", "--no-warnings", "-f", "bv*+ba/b", "-o", dst, ruta],
                               capture_output=True, text=True)
            if r.returncode != 0:
                print("no se pudo bajar:\n" + (r.stderr or "")[-500:])
                raise SystemExit(2)
        ruta = dst

    if not os.path.exists(ruta):
        print(f"no existe: {ruta}")
        raise SystemExit(2)

    res = analizar(ruta)
    base = os.path.splitext(os.path.basename(ruta))[0]
    with open(os.path.join(SALIDA, base + ".analisis.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    print(json.dumps(res, ensure_ascii=False, indent=1) if a.json else tabla(res))

    if a.hoja:
        ts = clave(res, a.hoja)
        d = os.path.join(SALIDA, base + "_cuadros")
        imgs = extraer(ruta, ts, d)
        h = hoja(imgs, os.path.join(SALIDA, base + "_hoja.png"))
        print(f"\n  {len(imgs)} cuadros clave en {d}")
        if h:
            print(f"  hoja de contactos: {h}")


if __name__ == "__main__":
    main()
