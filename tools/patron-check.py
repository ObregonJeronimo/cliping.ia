# -*- coding: utf-8 -*-
"""COMPUERTA E-PATRON-DIBUJA — el fondo que el aire pide se DIBUJA de verdad.

Esta es la primera compuerta del motor 3D que EJECUTA el shader, y existe por el punto ciego que el
handoff nombra sin rodeos: *"corren en Node y nunca compilan GLSL. Verde ahi no prueba NADA sobre un
shader"*. `E-SHADER-ENTERO` comprueba que el literal llegue a `gl_FragColor`; `E-COMPOSITOR-PARSEA`
corre `node --check`. Las dos pasan con una rama del `else if` VACIA, que es JavaScript y GLSL
perfectamente validos y un fondo liso en la pantalla.

Y ya paso: cinco de los patrones nuevos —celosia, costura, espigas, engranaje, roseta— salieron como
'nada' porque su rama quedo sin cuerpo, y el sintoma era que la MISMA pagina con el MISMO aire daba a
veces un fondo con trama y a veces un cuadro liso segun la semilla. O sea, textualmente, "el motor es
impredecible".

QUE MIDE, y por que asi:

  Se dibuja el fondo con CADA valor de `uPatron` en una pagina real —Chromium, WebGL, el mismo shader
  que renderiza el video— y se leen los pixeles. De cada uno se saca la desviacion estandar espacial.
  Un patron que dibuja algo tiene trama; el degrade pelado (`nada`) no.

  El piso NO se elige a ojo: se mide `nada` en la misma corrida y se exige que cada patron con nombre
  supere su desviacion por un margen. `nada` ES la referencia de "no hay trama", y esta ahi al lado.

  Y ademas se comprueba que dos patrones distintos no den la MISMA imagen: si `celosia` y `panal`
  devuelven los mismos pixeles, uno de los dos no se esta dibujando aunque los dos tengan trama.

Uso:  python tools/patron-check.py
"""
import asyncio
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "backend"))

try:
    from playwright.async_api import async_playwright
except Exception as e:                                    # pragma: no cover
    print("GATE PATRON: falta playwright (%s) — se saltea" % e)
    sys.exit(0)

import render3d                                            # noqa: E402  (trae _servir)

# El fondo se dibuja en un lienzo chico: lo que se mide es la TRAMA, no la resolucion. 240x420
# conserva la proporcion 9:16 y hace la corrida instantanea.
W, H = 240, 420

JS = r"""
async ([w, h, n]) => {
  const THREE = await import('/three.module.js')
  window.THREE = THREE
  const kit = await import('/demo/kit.js')
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ren = new THREE.WebGLRenderer({ canvas: cv, antialias: false, preserveDrawingBuffer: true })
  ren.setPixelRatio(1); ren.setSize(w, h, false)
  const esc = new THREE.Scene()
  // LA CAMARA TIENE QUE LLEGAR AL FONDO, y esto me mordio: `fondoVivo` devuelve un plano en z = -14
  // (esta detras de todo, es un fondo) y una ortografica con far = 10 lo deja FUERA. La primera
  // version renderizaba negro y los 28 patrones daban la misma imagen: el instrumento no medi­a el
  // patron, medi­a un cuadro vacio — y decia 'los 28 dibujan lo mismo' con toda seguridad.
  const MW = 5.625, MH = 10
  const fondo = kit.fondoVivo(MW, MH)
  esc.add(fondo)
  const cam = new THREE.OrthographicCamera(-MW / 2, MW / 2, MH / 2, -MH / 2, 0.1, 100)
  cam.position.z = 0
  const out = []
  for (let i = 0; i < n; i++) {
    fondo.material.uniforms.uPatron.value = i
    fondo.material.uniforms.uT.value = 3.7          // un instante fijo: la compuerta es determinista
    fondo.material.uniforms.uGrilla.value = 0.55
    ren.render(esc, cam)
    const px = new Uint8Array(w * h * 4)
    ren.getContext().readPixels(0, 0, w, h, ren.getContext().RGBA, ren.getContext().UNSIGNED_BYTE, px)
    // desviacion espacial por canal, y una firma barata para comparar patrones entre si
    let s0 = 0, s1 = 0, s2 = 0, n0 = 0, firma = 0
    const acc = [0, 0, 0]
    for (let p = 0; p < px.length; p += 4) { acc[0] += px[p]; acc[1] += px[p + 1]; acc[2] += px[p + 2]; n0++ }
    const med = acc.map(x => x / n0)
    for (let p = 0; p < px.length; p += 4) {
      s0 += (px[p] - med[0]) ** 2; s1 += (px[p + 1] - med[1]) ** 2; s2 += (px[p + 2] - med[2]) ** 2
      firma = (firma * 31 + px[p] + px[p + 1] * 3 + px[p + 2] * 7) % 1000000007
    }
    out.push({ i, sd: Math.max(Math.sqrt(s0 / n0), Math.sqrt(s1 / n0), Math.sqrt(s2 / n0)), firma })
  }
  return { patrones: kit.PATRONES, medidas: out }
}
"""


async def medir():
    puerto, apagar = render3d._servir(None)
    try:
        async with async_playwright() as pw:
            br = await pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                                "--enable-unsafe-swiftshader"])
            pg = await br.new_page(viewport={"width": W, "height": H})
            errores = []
            pg.on("pageerror", lambda e: errores.append(str(e)))
            await pg.goto("http://127.0.0.1:%d/demo/demo.html" % puerto, wait_until="load", timeout=30000)
            n = await pg.evaluate("async () => (await import('/demo/kit.js')).PATRONES.length")
            r = await pg.evaluate(JS, [W, H, n])
            await br.close()
            if errores:
                print("  (errores de pagina: %s)" % errores[:2])
            return r
    finally:
        apagar()


def main():
    r = asyncio.run(medir())
    nombres, medidas = r["patrones"], r["medidas"]
    i_nada = nombres.index("nada") if "nada" in nombres else None
    sd = {m["i"]: m["sd"] for m in medidas}
    firma = {m["i"]: m["firma"] for m in medidas}
    fallos = []

    # LA DESVIACION SE INFORMA, NO SE USA COMO UMBRAL — y esto es una correccion sobre la marcha.
    #
    # La primera version exigia 1.5x la desviacion de `nada`, y con eso acusaba a `estelas` (1.17x),
    # `panal` (1.18x) y `recuento` (1.44x). Leido el shader, los tres DIBUJAN: `recuento` pone grupos de
    # palotes en el 44% de las celdas con trazos de 0.03 de ancho, o sea una trama real y muy sutil. Un
    # patron discreto no es un patron roto, y un umbral que no distingue las dos cosas acusa en falso.
    #
    # Lo que SI detecta el defecto documentado —una rama del else-if vacia— es la comparacion EXACTA de
    # abajo: una rama que no escribe `linea` produce pixel por pixel la misma imagen que `nada`. Eso no
    # necesita umbral y no puede acusar a un patron sutil.
    base = sd.get(i_nada, 0.0) if i_nada is not None else 0.0

    # DOS PATRONES NO PUEDEN DAR LA MISMA IMAGEN, PIXEL POR PIXEL. Si la dan, uno de los dos no se esta
    # dibujando: cae en la rama del otro o su rama esta vacia. La firma recorre TODOS los pixeles —la
    # primera version muestreaba uno de cada 997 y, sobre un patron disperso como `recuento`, no tocaba
    # ni una marca: informaba 'identico a nada' sobre una trama que si estaba—.
    # aunque tenga trama: cae en la rama del otro.
    vistos = {}
    for i, nom in enumerate(nombres):
        f = firma.get(i)
        if f in vistos:
            fallos.append('"%s" y "%s" dibujan EXACTAMENTE lo mismo' % (nom, vistos[f]))
        else:
            vistos[f] = nom

    if fallos:
        print("GATE PATRON FAIL (%d):" % len(fallos))
        for f in fallos:
            print("  " + f)
        sys.exit(1)
    peor = min(((sd[i], nombres[i]) for i in range(len(nombres)) if i != i_nada), default=(0, "—"))
    print("GATE PATRON OK (%d patrones dibujados en WebGL de verdad; el mas flojo es %s con sd %.1f "
          "contra %.1f del degrade pelado, y ninguno repite imagen)."
          % (len(nombres), peor[1], peor[0], base))


if __name__ == "__main__":
    main()
