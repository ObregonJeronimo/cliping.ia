"""medir-video — el perfil de movimiento de una pieza, en numeros.

POR QUE EXISTE
"El video no es bueno" no es un defecto accionable. Esto convierte esa frase en una tabla, y la
distancia entre lo que genera el motor y una referencia hecha a mano deja de ser una opinion: pasa a
ser una lista ordenada por cuanto pesa cada cosa.

Es el metodo que hay que robarle a los trabajos que se ven bien: no la libreria de render, la
MEDICION. Un rebuild de After Effects que "queda tremendo" tiene una verdad de referencia y una
funcion de perdida; nosotros generamos sin referencia, asi que primero hay que fabricar una y despues
medir contra ella.

SIN DEPENDENCIAS NUEVAS
Solo numpy y el ffmpeg que ya trae imageio-ffmpeg. Nada de OpenCV ni SciPy: en esta maquina no estan,
y una herramienta de diagnostico que no se puede correr no diagnostica nada. Todo lo que hace falta
—diferencia entre frames, laplaciano, histogramas— son unas lineas de numpy.

Uso:  python tools/medir-video.py <video.mp4> [--bpm 124] [--ancho 240]
      python tools/medir-video.py v.mp4 --bpm 120 --tramos "apertura:6,hero:8,cierre:6"
          (desglose POR ESCENA: el promedio de la pieza esconde cual arrastra)
      python tools/medir-video.py a.mp4 b.mp4 --bpm 124        (compara dos)
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

try:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:  # pragma: no cover
    FFMPEG = "ffmpeg"


# ---------------------------------------------------------------- decodificacion
def _info(video):
    """fps y duracion, leidos de ffmpeg. Se parsea el stderr porque no hay ffprobe garantizado."""
    r = subprocess.run([FFMPEG, "-i", str(video)], capture_output=True)
    txt = r.stderr.decode("utf-8", "replace")
    fps, dur = 30.0, 0.0
    for tok in txt.split(","):
        if " fps" in tok:
            try:
                fps = float(tok.strip().split(" ")[0])
            except ValueError:
                pass
    if "Duration:" in txt:
        d = txt.split("Duration:")[1].split(",")[0].strip()
        try:
            h, m, s = d.split(":")
            dur = int(h) * 3600 + int(m) * 60 + float(s)
        except ValueError:
            pass
    return fps, dur


def _frames(video, ancho=240):
    """Devuelve un array (n, alto, ancho, 3) uint8.

    Se decodifica a baja resolucion a proposito. Todas las metricas de aca son ESTADISTICAS del cuadro
    —cuanto cambia, cuanto ocupa, cuanto contrasta— y ninguna mejora con mas pixeles; a 240 de ancho un
    reel de 17 s entra en 200 MB de RAM y se mide en segundos en vez de en minutos. La unica que
    depende del detalle es la nitidez, y ahi lo que importa es la DIFERENCIA relativa entre frames del
    mismo video, no su valor absoluto.
    """
    fps, dur = _info(video)
    alto = int(round(ancho * 16 / 9 / 2)) * 2
    cmd = [FFMPEG, "-v", "error", "-i", str(video), "-vf", f"scale={ancho}:{alto}",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.run(cmd, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError("ffmpeg: " + p.stderr.decode("utf-8", "replace")[-300:])
    buf = np.frombuffer(p.stdout, dtype=np.uint8)
    n = buf.size // (alto * ancho * 3)
    return buf[: n * alto * ancho * 3].reshape(n, alto, ancho, 3), fps, dur


# ---------------------------------------------------------------- metricas
def _luma(f):
    return (0.2126 * f[..., 0] + 0.7152 * f[..., 1] + 0.0722 * f[..., 2])


def _laplaciano(l):
    """Varianza del laplaciano = proxy de NITIDEZ. Sin scipy: el kernel se aplica con rebanadas."""
    a = l[1:-1, 1:-1]
    lap = (l[:-2, 1:-1] + l[2:, 1:-1] + l[1:-1, :-2] + l[1:-1, 2:] - 4 * a)
    return float(lap.var())


def medir(video, bpm=124.0, ancho=240, desde=None, hasta=None, _cache={}):
    """Metricas de un video, o de un TRAMO de un video si se dan `desde`/`hasta` en segundos.

    El tramo existe porque el promedio de la pieza entera esconde justo lo que hay que arreglar. La
    pieza mide 0.118 de movimiento contra 0.226 de la referencia, y ese numero no dice NADA sobre que
    hacer: puede ser que todas las escenas esten igual de flojas o que dos arrastren a las otras seis.
    Son dos problemas distintos y el arreglo es distinto. Medido por escena, aparece el culpable.

    Los frames se decodifican UNA sola vez por video y se cachean: medir nueve tramos de una pieza de
    30 s decodificando nueve veces tarda nueve veces mas para leer exactamente los mismos pixeles.
    """
    clave = (str(video), ancho)
    if clave not in _cache:
        _cache.clear()                                  # un video por vez: no se acumulan 30 s en RAM
        _cache[clave] = _frames(video, ancho)
    fr, fps, dur = _cache[clave]
    if desde is not None or hasta is not None:
        i0 = max(0, int(round((desde or 0.0) * fps)))
        i1 = min(len(fr), int(round((hasta if hasta is not None else dur) * fps)))
        fr = fr[i0:i1]
    n = len(fr)
    if n < 4:
        raise RuntimeError(f"{video}: solo {n} frames")
    L = _luma(fr.astype(np.float32))

    # ---- 1. MOVIMIENTO. Fraccion de pixeles que cambian mas de un umbral entre frames contiguos.
    # Es LA metrica que separa un video de una presentacion. Un reel moderno tiene movimiento en casi
    # todos los frames; una pieza de escenas que aparecen y se quedan quietas tiene picos en las
    # transiciones y planicies de cero en el medio.
    d = np.abs(np.diff(L, axis=0))
    mov_frac = (d > 8).mean(axis=(1, 2))            # 8/255: por debajo es ruido de compresion
    mov_mag = d.mean(axis=(1, 2))

    # ---- 2. CORTES. Un corte es un salto que se despega de su vecindario. Se usa mediana + MAD y no
    # media + desvio porque la media la arrastran los propios cortes: con un umbral basado en la media,
    # una pieza con muchos cortes se auto-oculta los cortes.
    med = float(np.median(mov_mag))
    mad = float(np.median(np.abs(mov_mag - med))) + 1e-6
    z = (mov_mag - med) / (1.4826 * mad)
    picos = np.where(z > 6)[0]
    cortes, ultimo = [], -99
    for i in picos:
        if i - ultimo > max(2, int(fps * 0.12)):     # no contar dos veces el mismo corte
            cortes.append(float((i + 1) / fps))
            ultimo = i
    inter = np.diff(cortes) if len(cortes) > 1 else np.array([dur])

    # ---- 3. QUIETUD. La ventana mas larga donde practicamente no se movio nada. Un beat entero
    # quieto ya se lee como diapositiva; dos beats es una pausa que el ojo interpreta como error.
    quieto = mov_frac < 0.005
    peor, corrida = 0, 0
    for q in quieto:
        corrida = corrida + 1 if q else 0
        peor = max(peor, corrida)
    quietud = peor / fps

    # ---- 4. OCUPACION DEL CUADRO. Fraccion de pixeles lejos del color de fondo del propio frame
    # (se toma la mediana como fondo). Mide si el cuadro esta LLENO o es tipografia flotando en aire.
    ocup = []
    for i in range(0, n, max(1, n // 60)):
        f = fr[i].astype(np.float32)
        fondo = np.median(f.reshape(-1, 3), axis=0)
        ocup.append(float((np.abs(f - fondo).sum(axis=2) > 60).mean()))
    ocupacion = float(np.mean(ocup))

    # ---- 5. CONTRASTE Y COLOR. Un reel moderno vive de contraste alto y de UN acento saturado; una
    # pieza lavada tiene desvio de luminancia bajo y saturacion baja.
    contraste = float(np.mean([L[i].std() for i in range(0, n, max(1, n // 60))])) / 255.0
    mx = fr.max(axis=3).astype(np.float32)
    mn = fr.min(axis=3).astype(np.float32)
    sat = float(np.mean((mx - mn) / np.maximum(mx, 1)))

    # ---- 6. RITMO. Que fraccion de los cortes cae sobre la grilla de beats. Es lo que separa una
    # pieza que "va" de una que arrastra: el ojo predice el beat y un corte que cae ahi se siente
    # inevitable; el mismo corte 200 ms despues se siente flojo.
    beat = 60.0 / bpm
    en_beat = 0
    for c in cortes:
        fase = (c % (beat / 2)) / (beat / 2)
        if min(fase, 1 - fase) * (beat / 2) < 0.06:
            en_beat += 1
    ritmo = en_beat / max(1, len(cortes))

    # ---- 7. DESENFOQUE DE MOVIMIENTO. Con obturador de verdad, los frames con MAS movimiento son
    # MENOS nitidos. Si no hay correlacion negativa, no hay motion blur: cada frame es una foto fija
    # y el movimiento se lee escalonado por mas suave que sea la interpolacion.
    idx = list(range(0, n - 1, max(1, (n - 1) // 120)))
    nit = np.array([_laplaciano(L[i]) for i in idx])
    mv = mov_mag[idx]
    if nit.std() > 1e-6 and mv.std() > 1e-6:
        corr = float(np.corrcoef(nit, mv)[0, 1])
    else:
        corr = 0.0

    return {
        "video": str(video), "frames": n, "fps": round(fps, 2), "dur": round(n / fps, 2),
        "cortes": len(cortes), "cortes_por_min": round(len(cortes) / max(0.01, n / fps) * 60, 1),
        "intervalo_medio": round(float(np.mean(inter)), 2) if len(cortes) > 1 else None,
        "tiempos_corte": [round(c, 2) for c in cortes],
        "mov_frac_media": round(float(mov_frac.mean()), 4),
        "mov_frac_mediana": round(float(np.median(mov_frac)), 4),
        "frames_casi_quietos": round(float((mov_frac < 0.02).mean()), 3),
        "quietud_max_s": round(quietud, 2),
        "ocupacion": round(ocupacion, 3),
        "contraste": round(contraste, 3),
        "saturacion": round(sat, 3),
        "ritmo_en_beat": round(ritmo, 3),
        "corr_mov_nitidez": round(corr, 3),
    }


# ---------------------------------------------------------------- salida
FILAS = [
    ("dur", "duracion", "s", None),
    ("cortes", "cortes", "", None),
    ("cortes_por_min", "cortes por minuto", "", "un reel moderno: 40-140"),
    ("intervalo_medio", "intervalo entre cortes", "s", "0.4-1.5 s"),
    ("mov_frac_media", "pixeles en movimiento", "", "que fraccion del cuadro cambia por frame"),
    ("frames_casi_quietos", "frames casi quietos", "", "cuanto del video es una foto fija"),
    ("quietud_max_s", "quietud maxima", "s", "un beat quieto ya se lee como diapositiva"),
    ("ocupacion", "ocupacion del cuadro", "", "cuanto del cuadro NO es fondo"),
    ("contraste", "contraste", "", "desvio de luminancia"),
    ("saturacion", "saturacion", "", "un acento saturado o una pieza lavada"),
    ("ritmo_en_beat", "cortes sobre el beat", "", "1.0 = todos caen en la grilla"),
    ("corr_mov_nitidez", "movimiento vs nitidez", "", "negativo = hay obturador de verdad"),
]


def tabla(ms):
    an = max(24, max(len(m["video"].split("/")[-1].split("\\")[-1]) for m in ms) + 2)
    print()
    print("metrica".ljust(26) + "".join(m["video"].split("/")[-1].split("\\")[-1].ljust(an) for m in ms) + "referencia")
    print("-" * (26 + an * len(ms) + 40))
    for k, nombre, uni, ref in FILAS:
        fila = nombre.ljust(26)
        for m in ms:
            v = m.get(k)
            fila += (("-" if v is None else f"{v}{uni}")).ljust(an)
        print(fila + (ref or ""))
    print()


def tramos_de(spec, bpm):
    """"apertura:6,hero:8,..." -> [(id, desde, hasta)] en segundos, con el beat de ESE bpm.

    Se declaran en BEATS y no en segundos porque asi es como el guion las declara, y porque el bpm
    cambia con el aire de cada pagina: escribir los segundos a mano es garantizar que un dia no
    coincidan con los cortes reales y que la tabla mienta sin avisar.
    """
    beat = 60.0 / bpm
    out, t = [], 0.0
    for parte in str(spec).split(","):
        parte = parte.strip()
        if not parte:
            continue
        nombre, _, beats = parte.partition(":")
        b = float(beats or 0)
        out.append((nombre.strip(), t, t + b * beat))
        t += b * beat
    return out


# Las columnas del desglose por escena. Son menos que las de la tabla completa a proposito: sobre un
# tramo de tres segundos, la saturacion media o la correlacion movimiento/nitidez no tienen suficiente
# muestra para significar algo, y una cifra sin respaldo en una tabla se lee igual de firme que una
# con respaldo.
FILAS_TRAMO = [
    ("dur", "dur", "s"),
    ("cortes", "cortes", ""),
    ("mov_frac_media", "movimiento", ""),
    ("frames_casi_quietos", "casi quietos", ""),
    ("quietud_max_s", "quietud max", "s"),
    ("ocupacion", "ocupacion", ""),
]


def tabla_tramos(video, tramos, bpm, ancho):
    print()
    print(f"  DESGLOSE POR ESCENA — {Path(video).name}")
    cab = "  " + "escena".ljust(14)
    for _, nombre, _u in FILAS_TRAMO:
        cab += nombre.rjust(14)
    print(cab)
    print("  " + "-" * (14 + 14 * len(FILAS_TRAMO)))
    filas = []
    for nombre, t0, t1 in tramos:
        try:
            m = medir(video, bpm=bpm, ancho=ancho, desde=t0, hasta=t1)
        except RuntimeError as e:
            print(f"  {nombre.ljust(14)}  (sin frames: {e})")
            continue
        linea = "  " + nombre.ljust(14)
        for k, _n, uni in FILAS_TRAMO:
            v = m.get(k)
            linea += ("-" if v is None else f"{v}{uni}").rjust(14)
        print(linea)
        filas.append((nombre, m))
    if filas:
        # El peor de la lista, que es el unico numero por el que vale la pena leer esta tabla.
        flojo = min(filas, key=lambda f: f[1]["mov_frac_media"])
        quieto = max(filas, key=lambda f: f[1]["quietud_max_s"])
        print()
        print(f"  la escena mas floja de movimiento es \"{flojo[0]}\" ({flojo[1]['mov_frac_media']})")
        print(f"  la que mas tiempo se queda quieta es \"{quieto[0]}\" ({quieto[1]['quietud_max_s']}s)")
    print()


def main():
    # Se saltea el VALOR que sigue a cada bandera. Filtrar solo lo que empieza con "--" dejaba el
    # "124" de "--bpm 124" como si fuera un archivo, y ffmpeg fallaba diciendo que no existe el
    # archivo 124 — un error que no apunta ni de lejos a la causa.
    bpm, ancho, args, saltear, tramos = 124.0, 240, [], False, None
    for i, a in enumerate(sys.argv[1:], start=1):
        if saltear:
            saltear = False
            continue
        if a == "--bpm":
            bpm = float(sys.argv[i + 1]); saltear = True
        elif a == "--ancho":
            ancho = int(sys.argv[i + 1]); saltear = True
        elif a == "--tramos":
            tramos = sys.argv[i + 1]; saltear = True
        elif not a.startswith("--"):
            args.append(a)
    if not args:
        print(__doc__)
        return
    ms = []
    for v in args:
        m = medir(v, bpm=bpm, ancho=ancho)
        Path(str(v) + ".metricas.json").write_text(json.dumps(m, indent=1), encoding="utf-8")
        ms.append(m)
    tabla(ms)
    if tramos:
        for v in args:
            tabla_tramos(v, tramos_de(tramos, bpm), bpm, ancho)
    for m in ms:
        print(f"{Path(m['video']).name}: cortes en {', '.join(str(t) for t in m['tiempos_corte'][:14])}"
              + (" ..." if len(m["tiempos_corte"]) > 14 else ""))


if __name__ == "__main__":
    main()
