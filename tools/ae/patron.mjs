// UNA IMAGEN DE PRUEBA DISEÑADA PARA DELATAR, no una foto cualquiera.
//
// Meter una imagen en la cadena AE -> documento -> navegador puede fallar de cinco formas distintas, y
// cuatro de ellas NO se ven con una fotografia:
//
//   1. ESPACIO DE COLOR. Si alguien convierte sRGB a lineal de mas (o de menos), los medios tonos se
//      corren y los extremos no. Con una foto eso se ve como "quedo un poco mas oscura" y se acepta.
//      Con una RAMPA DE GRISES numerada, un 50% que rinde 73% se ve de una.
//   2. ALFA PREMULTIPLICADO. Un borde suave sobre un fondo oscuro se ve bien de las dos maneras; sobre
//      un fondo CLARO, el alfa mal interpretado deja una orla negra. Por eso hay una mitad clara.
//   3. RESOLUCION Y FILTRADO. Lineas de un pixel revelan si la textura se esta escalando, si hay
//      mipmaps donde no corresponde, o si el muestreo esta corrido medio pixel.
//   4. ORIENTACION. Un patron simetrico no distingue una imagen dada vuelta. Las esquinas van
//      marcadas con colores distintos y hay una L asimetrica.
//   5. RECORTE. Un borde de un pixel en el perimetro dice si la imagen se dibujo entera o si le
//      comieron una fila.
//
// Es la misma idea que el control negativo de la Prueba 3: si el patron no puede distinguir un fallo,
// pasar la prueba no significa nada.
//
// USO
//   node tools/ae/patron.mjs [salida.png] [ancho] [alto]

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

const salida = process.argv[2] || 'C:/ae-probe/recursos/patron.png'
const W = +(process.argv[3] || 800)
const H = +(process.argv[4] || 600)

const { createCanvas } = await import('@napi-rs/canvas')
const cv = createCanvas(W, H)
const g = cv.getContext('2d')

// --- fondo partido: mitad oscura, mitad clara. El alfa mal interpretado sólo se delata sobre claro.
g.fillStyle = '#101014'; g.fillRect(0, 0, W / 2, H)
g.fillStyle = '#e8e6e0'; g.fillRect(W / 2, 0, W / 2, H)

// --- rampa de grises con su valor escrito al lado. Si alguien convierte de más, el 50 % rinde 73 %.
const pasos = 8
for (let i = 0; i < pasos; i++) {
  const v = Math.round(255 * i / (pasos - 1))
  const x = 40, y = 60 + i * 34
  g.fillStyle = `rgb(${v},${v},${v})`
  g.fillRect(x, y, 130, 28)
  g.fillStyle = i > pasos / 2 ? '#101014' : '#e8e6e0'
  g.font = 'bold 15px sans-serif'
  g.fillText(String(v), x + 8, y + 20)
}

// --- primarios saturados, donde más se nota una conversión de color equivocada
const COLORES = ['#f24026', '#26a0f2', '#2ef26a', '#f2d426', '#a026f2']
for (let i = 0; i < COLORES.length; i++) {
  g.fillStyle = COLORES[i]
  g.fillRect(40, 350 + i * 42, 130, 34)
}

// --- líneas de un píxel: si la textura se escala o el muestreo se corre, se vuelven grises o desaparecen
g.fillStyle = '#101014'
for (let i = 0; i < 30; i++) g.fillRect(W / 2 + 40 + i * 6, 60, 1, 200)
g.fillStyle = '#101014'
for (let i = 0; i < 24; i++) g.fillRect(W / 2 + 40, 300 + i * 6, 200, 1)

// --- una L asimétrica: un patrón simétrico no distingue una imagen dada vuelta
g.fillStyle = '#f24026'
g.fillRect(W / 2 + 280, 320, 30, 180)
g.fillRect(W / 2 + 280, 470, 110, 30)

// --- las cuatro esquinas con colores distintos: dicen la orientación sin ambigüedad
const ESQ = [['#ff0000', 0, 0], ['#00ff00', W - 46, 0], ['#0000ff', 0, H - 46], ['#ffff00', W - 46, H - 46]]
for (const [c, x, y] of ESQ) { g.fillStyle = c; g.fillRect(x, y, 46, 46) }

// --- marco de un píxel: dice si la imagen se dibujó entera o le comieron una fila
g.strokeStyle = '#ff00ff'; g.lineWidth = 1
g.strokeRect(0.5, 0.5, W - 1, H - 1)

const dir = dirname(salida)
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
writeFileSync(salida, cv.toBuffer('image/png'))
console.log(`patron ${W}x${H} -> ${salida}`)
console.log('  rampa de grises (espacio de color) · mitad clara (alfa) · lineas de 1 px (filtrado)')
console.log('  L asimetrica y esquinas de color (orientacion) · marco magenta (recorte)')
