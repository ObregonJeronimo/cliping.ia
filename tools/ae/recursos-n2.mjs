// RECURSOS DE INTERFAZ Y FONDOS DE MALLA — lo que le faltaba a la PIEZA-N para parecerse al genero.
//
// EL DIAGNOSTICO, DICHO POR EL USUARIO MIRANDO LA REFERENCIA AL LADO DE MI PIEZA:
//
//   · los fondos eran degradados PLANOS de dos puntas; el genero usa manchas de color suaves que se
//     mezclan entre si (malla), y eso no se consigue con un `createLinearGradient`
//   · no habia NADA que se escribiera solo
//   · no habia NINGUN estado que se fuera completando
//
// Los tres son deficits reales de la pieza, no diferencias de gusto. Y los tres tienen la misma forma:
// yo habia construido lo que se MUEVE y no lo que OCURRE. Un cuadro donde algo se escribe o algo
// termina de cargar cuenta una historia; uno donde un rotulo entra y sale, no.
//
// LA MALLA NO ES UN DEGRADADO LINEAL CON MAS PARADAS. Es N manchas radiales grandes superpuestas, cada
// una con su centro y su radio, dibujadas una encima de otra con alfa. Un degradado lineal siempre
// tiene una direccion y se lee como una direccion; la malla no tiene ninguna y por eso se lee como luz.
//
// USO
//   node tools/ae/recursos-n2.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_N || 'C:/ae-probe/recursos-n'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

const W = 1920, H = 1080
const FUENTE = 'Segoe UI'
const hechos = []

const lienzo = (w, h, k = 1) => {
  const cv = createCanvas(Math.round(w * k), Math.round(h * k))
  const g = cv.getContext('2d')
  g.scale(k, k)
  return [cv, g]
}
function guardar (n, cv, nota) {
  writeFileSync(`${DESTINO}/${n}.png`, cv.toBuffer('image/png'))
  hechos.push(`${n.padEnd(18)} ${String(cv.width).padStart(5)}x${String(cv.height).padEnd(5)} ${nota}`)
}
function ruta (g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.lineTo(x + w - rr, y); g.arcTo(x + w, y, x + w, y + rr, rr)
  g.lineTo(x + w, y + h - rr); g.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  g.lineTo(x + rr, y + h); g.arcTo(x, y + h, x, y + h - rr, rr)
  g.lineTo(x, y + rr); g.arcTo(x, y, x + rr, y, rr)
  g.closePath()
}

// ---------------------------------------------------------------- la malla
//
// Cada mancha es un radial de alfa 1 en el centro a alfa 0 en el borde, y se apilan. El radio va entre
// el 45% y el 85% del ancho del cuadro: mas chicas se leen como manchas y lo que se busca es que NO se
// distingan una de otra. Es la diferencia entre "un fondo con burbujas" y "un fondo con luz".
function malla (nombre, base, manchas, nota) {
  const [cv, g] = lienzo(W, H, 1)
  g.fillStyle = base
  g.fillRect(0, 0, W, H)
  for (const m of manchas) {
    const d = g.createRadialGradient(m.x * W, m.y * H, 0, m.x * W, m.y * H, m.r * W)
    d.addColorStop(0.00, m.c.replace(/,1\)$/, `,${m.a})`))
    d.addColorStop(0.55, m.c.replace(/,1\)$/, `,${m.a * 0.42})`))
    d.addColorStop(1.00, m.c.replace(/,1\)$/, ',0)'))
    g.fillStyle = d
    g.fillRect(0, 0, W, H)
  }
  guardar(nombre, cv, nota)
}

malla('n-malla-a', '#4A2E86', [
  { x: 0.10, y: 0.78, r: 0.72, c: 'rgba(226,88,54,1)',  a: 0.92 },
  { x: 0.92, y: 0.72, r: 0.70, c: 'rgba(232,110,48,1)', a: 0.88 },
  { x: 0.52, y: 0.14, r: 0.60, c: 'rgba(150,60,190,1)', a: 0.85 },
  { x: 0.56, y: 0.52, r: 0.48, c: 'rgba(28,32,120,1)',  a: 0.90 },
  { x: 0.20, y: 0.30, r: 0.52, c: 'rgba(120,52,168,1)', a: 0.70 },
], 'malla calida: naranjas a los costados, azul profundo al centro')

malla('n-malla-b', '#0B2FA8', [
  { x: 0.50, y: 0.50, r: 0.80, c: 'rgba(20,86,224,1)',  a: 0.95 },
  { x: 0.14, y: 0.20, r: 0.58, c: 'rgba(64,140,255,1)', a: 0.80 },
  { x: 0.88, y: 0.84, r: 0.60, c: 'rgba(90,170,255,1)', a: 0.75 },
  { x: 0.50, y: 0.96, r: 0.55, c: 'rgba(6,20,80,1)',    a: 0.85 },
], 'malla azul, para el segundo acto')

// LAS DOS CINTAS DE LUZ del acto azul: una curva clara arriba y otra abajo. Son lo que convierte un
// fondo azul en una SUPERFICIE curva — sin ellas la malla azul es una pantalla azul.
{
  const [cv, g] = lienzo(W, H, 1)
  const cinta = (y0, y1, ancho, alfa) => {
    g.beginPath()
    g.moveTo(-40, y0)
    g.bezierCurveTo(W * 0.3, y0 - ancho * 1.6, W * 0.7, y1 + ancho * 1.6, W + 40, y1)
    g.lineTo(W + 40, y1 + ancho)
    g.bezierCurveTo(W * 0.7, y1 + ancho * 2.6, W * 0.3, y0 - ancho * 0.6, -40, y0 + ancho)
    g.closePath()
    const d = g.createLinearGradient(0, 0, W, 0)
    d.addColorStop(0.00, `rgba(180,220,255,0)`)
    d.addColorStop(0.42, `rgba(220,240,255,${alfa})`)
    d.addColorStop(1.00, `rgba(160,210,255,0)`)
    g.fillStyle = d
    g.fill()
  }
  cinta(H * 0.06, H * 0.16, 6, 0.85)
  cinta(H * 0.90, H * 0.74, 7, 0.95)
  guardar('n-cintas', cv, 'las dos curvas de luz que hacen que el azul sea una superficie')
}

// ---------------------------------------------------------------- la caja de escritura
//
// Blanca, esquina muy redondeada, sombra suave. El margen del lienzo es para que la sombra no se corte
// contra el borde — 3x el desenfoque, o queda un rectangulo visible alrededor de la nada.
{
  const w = 1160, h = 400, m = 90, k = 2
  const [cv, g] = lienzo(w + m * 2, h + m * 2, k)
  g.save()
  g.shadowColor = 'rgba(24,32,72,0.16)'
  g.shadowBlur = 46
  g.shadowOffsetY = 16
  ruta(g, m, m, w, h, 34)
  g.fillStyle = '#FFFFFF'
  g.fill()
  g.restore()
  guardar('n-caja', cv, 'la caja donde se escribe (vacia: el texto va vivo encima)')
}

// el chip de adjuntar, adentro de la caja
//
// DOS DEFECTOS QUE VIO EL USUARIO Y ERAN LOS DOS MIOS:
//   · "Adjuntar archivos" se CORTABA: el lienzo media 330 y el texto no entraba. Ahora el ancho se
//     MIDE y el lienzo se hace de ese tamano, en vez de elegir un numero y esperar que entre.
//   · el clip parecia "una U rotada", y lo era: lo dibuje a mano con un arco y dos rectas sin mirarlo.
//     Un clip son DOS curvas concentricas, no una. Si no se puede dibujar bien, mejor no ponerlo — pero
//     esta vez se puede.
{
  const k = 3, alto = 84, izq = 96, der = 34
  const gm = createCanvas(10, 10).getContext('2d')
  gm.font = `400 34px "${FUENTE}"`
  const anchoTexto = gm.measureText('Adjuntar archivos').width
  const w = Math.ceil(izq + anchoTexto + der)
  const [cv, g] = lienzo(w, alto, k)
  ruta(g, 0, 0, w, alto, alto / 2)
  g.fillStyle = '#F1F3F7'; g.fill()
  g.font = `400 34px "${FUENTE}"`
  g.fillStyle = '#4B5563'
  g.textBaseline = 'middle'
  g.fillText('Adjuntar archivos', izq, alto / 2 + 1)

  // EL CLIP: dos curvas concentricas que comparten el mismo centro de giro abajo. La de afuera sube
  // hasta arriba de todo, la de adentro se queda corta — eso es lo que lo hace leer como un clip y no
  // como una letra.
  g.save()
  g.translate(52, alto / 2)
  g.rotate(0.32)
  g.strokeStyle = '#4B5563'; g.lineWidth = 4.5; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(7, -22)
  g.lineTo(7, 12)
  g.arc(0, 12, 7, 0, Math.PI, false)
  g.lineTo(-7, -18)
  g.arc(-1.5, -18, 5.5, Math.PI, 0, false)
  g.lineTo(4, 6)
  g.stroke()
  g.restore()
  guardar('n-chip', cv, `el chip, con el ancho MEDIDO (${w} px) y un clip que parece un clip`)
}

// ---------------------------------------------------------------- el puntero
//
// FALTABA, Y NO ES UN ADORNO. La pieza muestra un boton y NADIE LO APRIETA: el usuario lo dijo asi,
// "no aparece ningun mouse que clickee lo de Generar". Un boton que se enciende solo no cuenta que
// alguien pidio algo — cuenta que algo paso. Y el motor ya tiene una compuerta para esto
// (`gesto-check`): un puntero que acciona algo que despues no cambia es un defecto declarado.
{
  const L = 64, k = 4
  const [cv, g] = lienzo(L, L * 1.45, k)
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.30)'
  g.shadowBlur = 7
  g.shadowOffsetY = 3
  g.beginPath()
  g.moveTo(6, 4)
  g.lineTo(6, 62)
  g.lineTo(21, 48)
  g.lineTo(31, 72)
  g.lineTo(41, 67)
  g.lineTo(31, 44)
  g.lineTo(50, 42)
  g.closePath()
  g.fillStyle = '#FFFFFF'; g.fill()
  g.restore()
  g.strokeStyle = '#111827'; g.lineWidth = 3.5; g.lineJoin = 'round'
  g.stroke()
  guardar('n-puntero', cv, 'el puntero, con su sombra: la punta esta en (6,4) del lienzo')
}

// el anillo del click: se expande y se apaga en el cuadro en que el puntero aprieta
{
  const L = 220, k = 3
  const [cv, g] = lienzo(L, L, k)
  g.strokeStyle = 'rgba(255,255,255,0.95)'
  g.lineWidth = 9
  g.beginPath(); g.arc(L / 2, L / 2, L / 2 - 8, 0, Math.PI * 2); g.stroke()
  guardar('n-click', cv, 'el anillo del click: entra en escala 0 y se expande')
}

// ---------------------------------------------------------------- el boton de accion
{
  const w = 460, h = 128, m = 44, k = 3
  const [cv, g] = lienzo(w + m * 2, h + m * 2, k)
  g.save()
  g.shadowColor = 'rgba(180,60,120,0.34)'
  g.shadowBlur = 34
  g.shadowOffsetY = 12
  ruta(g, m, m, w, h, h / 2)
  const d = g.createLinearGradient(m, 0, m + w, 0)
  d.addColorStop(0.00, '#3B7BF7')
  d.addColorStop(0.50, '#B24BE0')
  d.addColorStop(1.00, '#F0533F')
  g.fillStyle = d
  g.fill()
  g.restore()
  g.font = `600 42px "${FUENTE}"`
  g.fillStyle = '#FFFFFF'
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  g.fillText('Generar', m + w / 2 + 26, m + h / 2 + 1)
  // la chispa
  g.save()
  g.translate(m + w / 2 - 84, m + h / 2)
  g.fillStyle = '#FFFFFF'
  g.beginPath()
  const R = 17
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2
    g.moveTo(0, 0)
    g.quadraticCurveTo(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.34, Math.cos(a) * R, Math.sin(a) * R)
    g.quadraticCurveTo(Math.cos(a + Math.PI / 2) * R * 0.34, Math.sin(a + Math.PI / 2) * R * 0.34, 0, 0)
  }
  g.fill()
  g.restore()
  guardar('n-boton', cv, 'el boton de accion, con degradado y chispa')
}

// ---------------------------------------------------------------- las filas de estado
//
// UNA FILA POR ESTADO Y NO UNA IMAGEN CON LOS TRES, que es la ley L23 del motor: un PNG plano tiene UN
// estado. Si el tilde estuviera horneado en la fila, ninguna animacion podria encenderlo y el defecto
// seria del recurso, no de la coreografia.
const FILAS = [
  { n: 'n-fila-1', t: 'Armando el backend' },
  { n: 'n-fila-2', t: 'Diseñando el frontend' },
  { n: 'n-fila-3', t: 'Publicando la app' },
]
for (const f of FILAS) {
  const w = 900, h = 152, m = 40, k = 3
  const [cv, g] = lienzo(w + m * 2, h + m * 2, k)
  g.save()
  g.shadowColor = 'rgba(24,32,72,0.13)'
  g.shadowBlur = 30
  g.shadowOffsetY = 10
  ruta(g, m, m, w, h, 26)
  g.fillStyle = '#FFFFFF'; g.fill()
  g.restore()
  g.font = `600 44px "${FUENTE}"`
  g.fillStyle = '#111827'
  g.textBaseline = 'middle'
  g.fillText(f.t, m + 150, m + h / 2 + 1)
  // la flechita de desplegar, a la derecha
  g.strokeStyle = '#9CA3AF'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(m + w - 92, m + h / 2 - 10)
  g.lineTo(m + w - 70, m + h / 2 + 10)
  g.lineTo(m + w - 48, m + h / 2 - 10)
  g.stroke()
  guardar(f.n, cv, `fila de estado: "${f.t}" (SIN el tilde: va aparte)`)
}

// el tilde, en capa aparte para poder encenderlo
{
  const L = 96, k = 4
  const [cv, g] = lienzo(L, L, k)
  g.beginPath(); g.arc(L / 2, L / 2, L / 2, 0, Math.PI * 2)
  g.fillStyle = '#16A34A'; g.fill()
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(L * 0.28, L * 0.52)
  g.lineTo(L * 0.44, L * 0.68)
  g.lineTo(L * 0.73, L * 0.34)
  g.stroke()
  guardar('n-check', cv, 'el tilde, EN CAPA APARTE para que se pueda encender (ley L23)')
}

// el aro del cargador, para la fila activa
{
  const L = 96, k = 4
  const [cv, g] = lienzo(L, L, k)
  g.strokeStyle = 'rgba(59,123,247,0.22)'; g.lineWidth = 9
  g.beginPath(); g.arc(L / 2, L / 2, L / 2 - 6, 0, Math.PI * 2); g.stroke()
  g.strokeStyle = '#3B7BF7'; g.lineWidth = 9; g.lineCap = 'round'
  g.beginPath(); g.arc(L / 2, L / 2, L / 2 - 6, -Math.PI / 2, Math.PI * 0.35); g.stroke()
  guardar('n-cargando', cv, 'el aro del cargador: gira con una expresion de fase lineal')
}

console.log(`\nrecursos-n2 -> ${DESTINO}\n`)
for (const h of hechos) console.log('  ' + h)
console.log(`\n  ${hechos.length} recursos`)
