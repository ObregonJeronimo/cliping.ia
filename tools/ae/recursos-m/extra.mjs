// LOS RECURSOS QUE PIDIO LA BIBLIOTECA AL CONSTRUIR, y que la especificacion no habia previsto.
//
// No es un descuido que valga la pena esconder: la especificacion de recursos se escribio ANTES de
// autorar, mirando el guion, y el guion no sabe que `Gc.sombraDeContacto` necesita su propia mancha
// horneada. La biblioteca lo dijo al construir —"sombra-web necesita `recurso`"— que es exactamente
// cuando conviene enterarse.
//
// USO
//   node tools/ae/recursos-m/extra.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = 'C:/ae-probe/recursos-m'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

const guardar = (n, cv) => {
  writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png'))
  return `${n}.png ${cv.width}x${cv.height}`
}
const rgba = (hex, a) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}

const hechos = []

// ---------------------------------------------------------------- la sombra de contacto
//
// C14. Es la mancha que un objeto deja DEBAJO, y su forma no es un rectangulo ni un circulo: es una
// elipse muy achatada y muy difusa. La cuenta que la hace creible es que el centro sea bastante mas
// oscuro que las puntas — una elipse de densidad pareja se lee como una pastilla gris.
//
// VA EN TINTA Y NO EN NEGRO. Sobre papel calido (#FAFAF8) el negro puro ensucia: la sombra tira a gris
// azulado y el papel pierde su temperatura. Con la tinta de la pieza (#0E0E10) el apoyo se lee y el
// papel sigue siendo papel.
//
// Y NO LLEVA MARGEN CALCULADO porque no usa `shadowBlur`: la caida la hace el propio degradado radial,
// que llega a alfa 0 exactamente en el borde del lienzo por construccion.
{
  // 3800 y no 1800: la biblioteca dibuja esta mancha a 1877 px (115% del ancho de la web), y con
  // 1800 nativos Q2 daba 0,96x — se estaba AGRANDANDO un degradado, que es justo donde el escalon
  // se ve. `escalaBase` sale de `115 * anchoObjeto / itm.width`, asi que el PNG mas grande baja la
  // escala solo y la pieza no se toca.
  const W = 3800, H = 970
  const cv = createCanvas(W, H)
  const g = cv.getContext('2d')
  g.save()
  g.translate(W / 2, H / 2)
  g.scale(1, H / W)                       // createRadialGradient solo hace circulos: se achata el eje
  const d = g.createRadialGradient(0, 0, 0, 0, 0, W / 2)
  d.addColorStop(0.00, rgba('#0E0E10', 0.30))
  d.addColorStop(0.32, rgba('#0E0E10', 0.19))
  d.addColorStop(0.62, rgba('#0E0E10', 0.07))
  d.addColorStop(1.00, rgba('#0E0E10', 0))
  g.fillStyle = d
  g.fillRect(-W, -W, W * 2, W * 2)
  g.restore()
  hechos.push(guardar('m-sombra-contacto', cv))
}

console.log(`\nextra -> ${DESTINO}`)
for (const h of hechos) console.log('  ' + h)
