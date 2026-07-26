# Renderiza UNA escena de ANTHEM y deja una tira de frames para mirarla.
#
# Existe porque una escena de motion graphics se afina MIRANDOLA, y renderizar los 17 segundos
# enteros para juzgar un easing de medio segundo es la forma mas rapida de no afinar nada.
#
# Uso:  python backend/render_escena.py apertura        (una escena)
#       python backend/render_escena.py                 (la pieza entera)
import asyncio
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render3d  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


async def main():
    escena = sys.argv[1] if len(sys.argv) > 1 else None
    cols = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    spec = {
        "W": 1080, "H": 1920, "fps": 30, "dur": 30, "seed": 7,
        "pagina": "demo/demo.html",
        # 1 muestra para las tiras: el obturador cuadruplica el costo y para juzgar composicion y
        # tiempos no aporta nada. Se prende para el video final.
        "obturador": {"angulo": 190, "muestras": 1},
    }
    if escena:
        spec["soloEscena"] = escena
    dst = os.path.join(RAIZ, "tools", "out", "anthem_frames")
    rutas = await render3d.render_frames(spec, dst, gpu=True, cada=1)
    if not rutas:
        print("sin frames")
        return
    # una tira pareja de `cols` cuadros repartidos a lo largo de la escena
    paso = max(1, len(rutas) // cols)
    sel = [str(rutas[i]) for i in range(0, len(rutas), paso)][:cols]
    salida = os.path.join(RAIZ, "tools", "out", f"anthem-{escena or 'completo'}.png")
    subprocess.run(["node", os.path.join(RAIZ, "tools", "anthem-tira.mjs"), salida, *sel], check=False)
    print(salida, f"({len(rutas)} frames, {len(sel)} en la tira)")


asyncio.run(main())
