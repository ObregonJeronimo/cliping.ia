# MIRAR UN VIDEO DE REFERENCIA — para estudiar como esta hecho, no para copiarlo.
#
# POR QUE EXISTE. El asistente no puede ver un video: puede abrir imagenes. Hasta ahora eso significaba
# sacar cuatro cuadros sueltos y opinar, que es exactamente lo que CLAUDE.md prohibe. Esta herramienta
# cambia el trato: primero MIDE el video entero por programa, y despues saca las imagenes que la
# medicion marco como interesantes.
#
# LO QUE ESTA HERRAMIENTA NO ARREGLA, y hay que decirlo cada vez: seguir viendo MUESTRAS no es ver
# movimiento. Una tira de nueve cuadros muestra la FORMA de un gesto, no su tacto. Lo que si captura
# el tacto son las MEDICIONES —el ritmo de corte y la curva de movimiento— y por eso son la mitad
# principal de la salida, no un adorno.
#
# QUE MIDE, y por que cada cosa importa para el motor:
#
#   · RITMO DE CORTE   cuantos planos, cuanto dura cada uno. Es el pulso de la pieza, lo que hace que
#                      se lea rapida o cara. Nuestro guion decide esto con beats: aca se ve contra que
#                      lo estamos comparando.
#   · CURVA DE MOVIMIENTO  cuanto se mueve la imagen en cada cuadro dentro de un plano. La FORMA de esa
#                      curva es el easing: una campana simetrica es un ease-in-out, una que arranca de
#                      golpe y frena largo es un ease-out, una que se pasa y vuelve es un overshoot.
#                      Esto es lo unico que deja portar el TACTO de una animacion ajena.
#   · QUIETUD          cuantos cuadros casi identicos al anterior. Mucha quietud en una pieza corta es
#                      tiempo muerto; es la misma metrica que usamos para auditar los nuestros.
#   · PALETA           los colores dominantes por plano.
#
# USO
#   python tools/mirar-video.py <url-de-youtube-o-archivo> [--desde SEG] [--hasta SEG] [--planos N]
#
# El video descargado y los cuadros quedan en tools/out/referencia/<nombre>/ y NO se suben al repo:
# es material ajeno que se estudia y se borra, no se redistribuye.

import argparse, json, os, re, subprocess, sys, shutil
from pathlib import Path
import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'tools' / 'out' / 'referencia'


def correr(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', **kw)


def bajar(origen, destino):
    """Si es una URL la baja; si es un archivo local lo usa tal cual."""
    if Path(origen).exists():
        return Path(origen)
    destino.mkdir(parents=True, exist_ok=True)
    salida = destino / 'fuente.mp4'
    if salida.exists():
        print(f'  ya estaba bajado: {salida}')
        return salida
    print('  bajando (hasta 1080p, un solo archivo)...')
    # Se pide 1080p y no lo mejor disponible: arriba de eso el peso se dispara y no cambia nada de lo
    # que se mide aca. `merge_output_format` evita quedarse con un webm que despues ffmpeg lea distinto.
    r = correr([sys.executable, '-m', 'yt_dlp', '-f',
                'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
                '--merge-output-format', 'mp4', '-o', str(salida), origen])
    if not salida.exists():
        print(r.stderr[-1500:] if r.stderr else 'yt-dlp no dejo archivo')
        sys.exit(1)
    return salida


def datos(v):
    r = correr(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                'stream=width,height,r_frame_rate,nb_frames:format=duration',
                '-of', 'json', str(v)])
    j = json.loads(r.stdout)
    s = j['streams'][0]
    num, den = s['r_frame_rate'].split('/')
    return {
        'w': s['width'], 'h': s['height'],
        'fps': float(num) / float(den or 1),
        'dur': float(j['format']['duration']),
    }


def cortes(v, desde, hasta):
    """Detecta los cortes con el filtro `scene` de ffmpeg. Devuelve tiempos absolutos en segundos.

    El umbral 0.30 esta elegido para CORTES, no para transiciones suaves: un fundido de medio segundo
    reparte el cambio entre muchos cuadros y ninguno solo supera el umbral. O sea que esta cuenta mide
    cortes DUROS y subestima a proposito — que es preferible a inventar cortes donde hay un barrido.
    """
    r = correr(['ffmpeg', '-v', 'info', '-ss', str(desde), '-to', str(hasta), '-i', str(v),
                '-filter:v', "select='gt(scene,0.30)',showinfo", '-f', 'null', '-'])
    ts = [float(m) + desde for m in re.findall(r'pts_time:([\d.]+)', (r.stderr or ''))]
    return sorted(set(round(t, 3) for t in ts))


def movimiento(v, desde, hasta, ancho=160):
    """Diferencia media entre cuadros consecutivos, sobre el video reducido a 160 px de ancho.

    Se reduce a proposito: a resolucion completa la metrica se llena de ruido de compresion y de grano,
    que no son movimiento. A 160 px queda la SILUETA del gesto, que es lo que se quiere leer.
    """
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(desde), '-to', str(hasta), '-i', str(v),
                        '-vf', f'scale={ancho}:-1,format=gray', '-f', 'rawvideo', '-'],
                       capture_output=True)
    if not r.stdout:
        return np.array([]), 0
    # el alto sale del propio flujo: se prueba el que divide exacto
    n = len(r.stdout)
    alto = None
    for a in range(60, 200):
        if n % (ancho * a) == 0:
            alto = a
            break
    if not alto:
        return np.array([]), 0
    q = np.frombuffer(r.stdout, dtype=np.uint8).reshape(-1, alto, ancho).astype(np.int16)
    return np.abs(np.diff(q, axis=0)).mean(axis=(1, 2)), q.shape[0]


def forma_de_la_curva(m):
    """Nombra la forma de un tramo de movimiento. Es lo que traduce numeros a vocabulario de motion."""
    if len(m) < 4 or m.max() < 0.6:
        return 'quieto'
    p = int(np.argmax(m)) / (len(m) - 1)          # donde cae el pico, 0=al principio 1=al final
    cola = m[int(len(m) * 0.75):].mean() / max(m.max(), 1e-6)
    if p < 0.30:
        return 'arranca de golpe y frena largo (ease-out / llegada)'
    if p > 0.70:
        return 'entra suave y acelera (ease-in / salida)'
    if cola > 0.35:
        return 'campana con cola: se pasa y vuelve (overshoot / resorte)'
    return 'campana simetrica (ease-in-out)'


def tira(v, t0, t1, salida, n=6):
    """Hoja de contactos de n cuadros repartidos en el tramo. La idea es de render_filmstrip."""
    paso = max((t1 - t0) / n, 0.04)
    cols = 3 if n <= 6 else 3
    correr(['ffmpeg', '-v', 'error', '-ss', str(t0), '-to', str(t1), '-i', str(v),
            '-vf', f'fps=1/{paso:.4f},scale=480:-1,tile={cols}x{(n + cols - 1) // cols}',
            '-frames:v', '1', '-y', str(salida)])
    return salida.exists()


def cuadro(v, t, salida):
    correr(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', str(v), '-frames:v', '1', '-y', str(salida)])
    return salida.exists()


def main():
    ap = argparse.ArgumentParser(description='Medir y mirar un video de referencia')
    ap.add_argument('origen', help='URL de YouTube o ruta a un archivo')
    ap.add_argument('--desde', type=float, default=0)
    ap.add_argument('--hasta', type=float, default=None)
    ap.add_argument('--planos', type=int, default=6, help='cuantos planos estudiar en detalle')
    a = ap.parse_args()

    nombre = re.sub(r'[^a-zA-Z0-9_-]+', '-', Path(a.origen).stem or 'video')[:40]
    dest = SALIDA / nombre
    dest.mkdir(parents=True, exist_ok=True)

    print('MIRAR VIDEO')
    v = bajar(a.origen, dest)
    d = datos(v)
    hasta = a.hasta if a.hasta else d['dur']
    print(f"  {d['w']}x{d['h']}  {d['fps']:.2f} fps  {d['dur']:.1f}s   (se estudia {a.desde:.1f}-{hasta:.1f}s)")

    print('\nRITMO DE CORTE')
    cs = [c for c in cortes(v, a.desde, hasta) if a.desde < c < hasta]
    bordes = [a.desde] + cs + [hasta]
    planos = [(bordes[i], bordes[i + 1]) for i in range(len(bordes) - 1) if bordes[i + 1] - bordes[i] > 0.15]
    if not planos:
        planos = [(a.desde, hasta)]
    dur = [b - x for x, b in planos]
    print(f'  {len(planos)} planos duros en {hasta - a.desde:.1f}s  =  un corte cada {(hasta - a.desde) / max(len(planos), 1):.2f}s')
    print(f'  duracion de plano:  min {min(dur):.2f}s   mediana {sorted(dur)[len(dur) // 2]:.2f}s   max {max(dur):.2f}s')

    print('\nMOVIMIENTO')
    m, nq = movimiento(v, a.desde, hasta)
    if len(m):
        quietos = int((m < 0.5).sum())
        print(f'  {nq} cuadros medidos   movimiento medio {m.mean():.2f}   pico {m.max():.2f}')
        print(f'  casi identicos al anterior: {quietos} ({100 * quietos / len(m):.0f}%)')

    # los planos mas interesantes = los de mayor movimiento, que es donde vive la animacion
    fps_m = len(m) / max(hasta - a.desde, 0.001) if len(m) else 0
    puntaje = []
    for (t0, t1) in planos:
        i0, i1 = int((t0 - a.desde) * fps_m), int((t1 - a.desde) * fps_m)
        seg = m[i0:i1] if len(m) and i1 > i0 else np.array([])
        puntaje.append((seg.max() if len(seg) else 0, t0, t1, seg))
    puntaje.sort(reverse=True, key=lambda x: x[0])

    print(f'\nLOS {min(a.planos, len(puntaje))} PLANOS CON MAS ANIMACION')
    imgs = []
    for k, (pico, t0, t1, seg) in enumerate(puntaje[:a.planos]):
        f = forma_de_la_curva(seg)
        print(f'  [{k + 1}] {t0:6.2f}s -> {t1:6.2f}s  ({t1 - t0:.2f}s)  pico {pico:5.1f}   {f}')
        p = dest / f'plano{k + 1}-tira.jpg'
        if tira(v, t0, t1, p):
            imgs.append(p)
        q = dest / f'plano{k + 1}-cuadro.jpg'
        if cuadro(v, t0 + (t1 - t0) * 0.62, q):
            imgs.append(q)

    print('\nIMAGENES PARA ABRIR')
    for p in imgs:
        print(f'  {p}')
    print(f'\n  (las tiras son hojas de contacto: sirven para el GESTO. Para juzgar nitidez o')
    print(f'   legibilidad hay que abrir los *-cuadro.jpg, que estan a resolucion completa.)')


if __name__ == '__main__':
    main()
