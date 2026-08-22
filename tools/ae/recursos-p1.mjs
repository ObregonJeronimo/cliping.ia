// RECURSOS DE LA PIEZA-P · fondos, tipografia cinetica, malla clara y anillos.
//
// ================================================================================================
// ESTE ARCHIVO SE REESCRIBIO ENTERO, Y LA RAZON IMPORTA MAS QUE EL CODIGO
// ================================================================================================
//
// La primera version de la PIEZA-P no era una recreacion: era una pieza propia montada sobre el
// esqueleto de tiempos de la referencia. Thiago lo dijo sin vueltas — "la recreacion la verdad no se
// acerca mucho, cumpli por favor" — y tenia razon.
//
// Debajo habia un error concreto y comprobable: LEI MAL LOS PLANOS. Arme el mapa desde una hoja de
// contacto a 320 px y llame "revelado de marca" a un plano de 9,7 s que en realidad son CUATRO cosas
// distintas — una barra de busqueda que se dibuja sola, se escribe, se aleja de camara y recibe un
// clic. Es exactamente el fallo que la skill ya tiene documentado con otro nombre: preguntarse a que
// cadencia se observo. A 320 px una barra que se aleja y un logotipo quieto se ven parecidos.
//
// Ahora esta medido sobre cuadros en COLOR a 640 px, en tres hojas de contacto y dos de detalle a
// 0,13 s de paso. Lo que sigue es lo que hay en el video, no lo que me parecio.
//
// ================================================================================================
// LA GRAMATICA DE LA REFERENCIA, que es UNA y se repite cuatro veces
// ================================================================================================
//
//   1. una palabra GIGANTE cruza el cuadro con ESTELA (mas alta que medio cuadro)
//   2. un zoom-out violento de ~20 cuadros la deja chica, y ahi ya es la FRASE ENTERA
//   3. las palabras de la frase SE ENFOCAN DE A UNA, de izquierda a derecha
//   4. la frase se sigue alejando despacio hasta que la levanta el latigazo siguiente
//
// Pasa con "Build SaaS Promo", con "Engineered for Scale", con "Give your team" y con "Growth".
//
// Y EL DESENFOQUE ES EL 80% DEL EFECTO. No es adorno: es lo que hace que un texto que aparece se lea
// como un texto que LLEGA. Thiago lo nombro solo — "las letras en unos momentos al principio se
// desenfocan".
//
// COMO SE HACE SIN EFECTOS, que es lo que el motor tiene. El motor no tiene desenfoque gaussiano y la
// profundidad de campo es cara y global. Pero la estela de movimiento ES un promedio de N muestras
// corridas, asi que se hornea: se dibuja la palabra 28 veces con la x corrida y `lighter` al 1/28.
// Eso no imita una estela, ES una estela — la misma cuenta que hace un obturador, resuelta al generar
// en vez de al renderizar, y sin costar un solo cuadro de render.
//
// USO
//   node tools/ae/recursos-p1.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const DESTINO = process.env.RECURSOS_P || 'C:/ae-probe/recursos-p'
if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true })

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
  hechos.push(`${n.padEnd(20)} ${String(cv.width).padStart(5)}x${String(cv.height).padEnd(5)} ${nota}`)
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

// LA FUENTE SE COMPRUEBA CONTRA LA SUSTITUTA. Skia acepta cualquier cadena en `g.font` y dibuja con la
// sustituta sin decir nada: medido, "Helvetica" NO existe en esta maquina y devuelve exactamente el
// mismo ancho que una familia inventada.
{
  const g = createCanvas(10, 10).getContext('2d')
  const an = (f, p = '') => { g.font = `${p}100px "${f}"`; return g.measureText('Handgloves 123').width }
  if (Math.abs(an(FUENTE) - an('__no-existe__')) < 0.01) {
    throw new Error(`"${FUENTE}" no existe en Skia: mide igual que una familia inventada.`)
  }
}

// ================================================================ 1 · EL SUELO, EN CAPAS SEPARADAS
//
// En la referencia la luz de abajo CAMBIA DE COLOR a lo largo de la pieza: arranca violeta, se pone
// magenta cuando la barra se escribe, y vira a NARANJA mientras la barra se aleja. Con un solo PNG eso
// seria imposible — L23, un PNG plano tiene un estado. Salen cuatro manchas sueltas y la pieza cruza
// sus opacidades.
//
// LA CUENTA DE LA ESCALA, que ya me la comi una vez: AE escala sobre los pixeles NATIVOS, no sobre el
// tamano logico del lienzo. Estos archivos miden 4800 px, asi que cubrir el cuadro pide escala >= 40
// (1920/4800) y el piso de nitidez de 2x se mantiene hasta escala 50. La banda legal es 40-50.
function mancha (nombre, x, y, r, color, alfa, nota) {
  const W = 2400, H = 1350, k = 2
  const [cv, g] = lienzo(W, H, k)
  const d = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W)
  d.addColorStop(0.00, `rgba(${color},${alfa})`)
  d.addColorStop(0.35, `rgba(${color},${alfa * 0.55})`)
  d.addColorStop(0.70, `rgba(${color},${alfa * 0.14})`)
  d.addColorStop(1.00, `rgba(${color},0)`)
  g.fillStyle = d
  g.fillRect(0, 0, W, H)
  guardar(nombre, cv, nota)
}

mancha('p-luz-violeta', 0.50, 1.02, 0.46, '104,58,255', 1.00, 'la luz violeta de abajo')
mancha('p-luz-magenta', 0.34, 1.04, 0.40, '214,54,190', 0.95, 'el magenta, para cuando se escribe')
mancha('p-luz-naranja', 0.56, 1.06, 0.42, '255,110,36', 1.00, 'el naranja, para cuando se aleja')
mancha('p-luz-azul',    0.50, 0.96, 0.34, '72,64,255',  0.95, 'el azul cerrado del revelado de marca')

{
  const [cv, g] = lienzo(2400, 1350, 2)
  g.fillStyle = '#030308'
  g.fillRect(0, 0, 2400, 1350)
  guardar('p-negro', cv, 'el negro de base')
}

// ================================================================ 2 · LA TIPOGRAFIA, CON SU ESTELA
//
// `medirCuerpo` despeja el cuerpo que hace falta para que una cadena mida X px de tinta. Es al reves
// de lo comodo —elegir un cuerpo y ver que sale— y es lo unico que sirve cuando lo que esta fijado es
// el ANCHO EN EL CUADRO: en la referencia "Build" ocupa el 90% del ancho, y ese dato no se puede
// convertir a un cuerpo sin medir.
function medirCuerpo (cadena, anchoObjetivo, peso) {
  const g = createCanvas(10, 10).getContext('2d')
  g.font = `${peso}100px "${FUENTE}"`
  return Math.round(100 * anchoObjetivo / g.measureText(cadena).width)
}

// LA ESTELA. 28 muestras corridas en x, compuestas con `lighter` al 1/28.
//
// `lighter` y no alfa normal, y la diferencia no es de gusto: con `source-over` cada muestra tapa a la
// anterior y el resultado es una escalera de copias semitransparentes. Con `lighter` los canales SE
// SUMAN, asi que donde las 28 muestras se pisan el alfa llega a 1 y el color es el promedio exacto —
// que es la definicion de una estela de movimiento.
//
// Y LAS DOS VERSIONES COMPARTEN LIENZO Y CENTRO a proposito: la pieza las intercambia con opacidad, y
// si la nitida y la de estela tuvieran anclas distintas la palabra pegaria un salto justo en el cuadro
// en que se enfoca, que es el cuadro que el ojo esta mirando.
function palabraConEstela (base, cadena, cuerpo, opciones = {}) {
  const peso = opciones.peso || '700 '
  const k = opciones.k || 2
  const MUESTRAS = 28
  const gm = createCanvas(10, 10).getContext('2d')
  gm.font = `${peso}${cuerpo}px "${FUENTE}"`
  const ancho = gm.measureText(cadena).width
  const margen = Math.ceil(cuerpo * 0.30)
  const estela = opciones.estela === undefined ? Math.round(cuerpo * 0.55) : opciones.estela

  const W = Math.ceil(ancho) + margen * 2 + estela
  const H = Math.ceil(cuerpo * 1.42) + margen * 2

  function pintar (g, x0) {
    if (opciones.plano) {
      g.fillStyle = opciones.color || '#111'
    } else {
      const d = g.createLinearGradient(x0, 0, x0 + ancho, 0)
      d.addColorStop(0.00, opciones.c0 || '#FFFFFF')
      d.addColorStop(0.55, opciones.c1 || '#CFC0FF')
      d.addColorStop(1.00, opciones.c2 || '#6B3BFF')
      g.fillStyle = d
    }
    g.font = `${peso}${cuerpo}px "${FUENTE}"`
    g.textBaseline = 'middle'
    g.fillText(cadena, x0, H / 2)
  }

  const x0 = margen + estela / 2
  const [cvN, gN] = lienzo(W, H, k)
  pintar(gN, x0)
  guardar(base, cvN, `"${cadena}" · ${cuerpo}px · ${Math.round(ancho)} px de tinta`)

  const [cvE, gE] = lienzo(W, H, k)
  gE.globalCompositeOperation = 'lighter'
  gE.globalAlpha = 1 / MUESTRAS
  for (let i = 0; i < MUESTRAS; i++) {
    pintar(gE, x0 - estela / 2 + (estela * i) / (MUESTRAS - 1))
  }
  guardar(base + '-e', cvE, `"${cadena}" CON ESTELA de ${estela} px · 28 muestras`)
  return { ancho, W, H }
}

// una frase entregada palabra por palabra, con la tabla de centros que la pieza necesita
function frase (base, palabras, cuerpo, opciones) {
  const gm = createCanvas(10, 10).getContext('2d')
  gm.font = `${opciones.peso}${cuerpo}px "${FUENTE}"`
  const anchos = palabras.map(w => gm.measureText(w).width)
  const HUECO = cuerpo * (opciones.hueco === undefined ? 0.40 : opciones.hueco)
  const total = anchos.reduce((a, b) => a + b, 0) + HUECO * (palabras.length - 1)
  let acum = 0
  console.log(`\n  ${base} — "${palabras.join(' ')}" · ${cuerpo}px · linea de ${Math.round(total)} px`)
  for (let i = 0; i < palabras.length; i++) {
    const o = Object.assign({}, opciones)
    if (opciones.colores) { o.plano = true; o.color = opciones.colores[i] }
    palabraConEstela(`${base}-${i + 1}`, palabras[i], cuerpo, o)
    console.log(`    ${base}-${i + 1}  "${palabras[i]}"  centro relativo ${Math.round(acum + anchos[i] / 2 - total / 2)}`)
    acum += anchos[i] + HUECO
  }
}

const CUERPO_CHICO = 92
const CLARO_SOBRE_OSCURO = { peso: '600 ', c0: '#F2EEFF', c1: '#F2EEFF', c2: '#CBB8FF', estela: 62, k: 3 }

// ---- PLANOS 1-2 · "Build" gigante y despues "Build SaaS Promo" chico
const CG1 = medirCuerpo('Build', 1730, '700 ')
console.log(`\n  "Build" a 1730 px de tinta pide cuerpo ${CG1}`)
palabraConEstela('p-build-g', 'Build', CG1, { c0: '#FFFFFF', c1: '#D8CBFF', c2: '#7C4DFF', k: 1.4 })
frase('p-f1', ['Build', 'SaaS', 'Promo'], CUERPO_CHICO, CLARO_SOBRE_OSCURO)

// ---- PLANOS 3-4 · "Engineered for Scale"
const CG2 = medirCuerpo('Engineered', 2600, '700 ')
console.log(`\n  "Engineered" a 2600 px de tinta pide cuerpo ${CG2}`)
palabraConEstela('p-eng-g', 'Engineered', CG2, { c0: '#FFFFFF', c1: '#FFFFFF', c2: '#EFEAFF', k: 1.1 })
frase('p-f2', ['Engineered', 'for', 'Scale'], CUERPO_CHICO, CLARO_SOBRE_OSCURO)

// ---- PLANO 8 · "Give your team", sobre blanco. La tercera palabra va en el acento, como el original.
const CG3 = medirCuerpo('Give', 900, '700 ')
palabraConEstela('p-give-g', 'Give', CG3, { peso: '700 ', plano: true, color: '#120B24', k: 2 })
frase('p-f3', ['Give', 'your', 'team'], CUERPO_CHICO, {
  peso: '700 ', colores: ['#1A1030', '#6B6480', '#6B3BFF'], hueco: 0.32, estela: 62, k: 3
})

// ---- PLANO 10 · "Growth" gigante sobre oscuro
const CG4 = medirCuerpo('Growth', 1500, '700 ')
palabraConEstela('p-growth-g', 'Growth', CG4, { c0: '#FFFFFF', c1: '#F0EBFF', c2: '#B9A6FF', k: 1.6 })

// ================================================================ 3 · EL ODOMETRO DEL PLANO 9
//
// Tres cifras sueltas que la pieza intercambia. En la referencia el numero SALTA de uno a otro
// mientras los anillos crecen; no es un contador continuo, son tres estados, y por eso son tres capas
// y no una animacion de texto.
const ODO = ['2x Faster', '9x Faster', '10x Faster']
for (let i = 0; i < ODO.length; i++) {
  const [cv, g] = lienzo(760, 200, 3)
  g.font = `700 96px "${FUENTE}"`
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  const gr = g.createLinearGradient(120, 0, 640, 0)
  gr.addColorStop(0, '#33249E'); gr.addColorStop(1, '#5B3BFF')
  g.fillStyle = gr
  g.fillText(ODO[i], 380, 100)
  guardar(`p-odo-${i + 1}`, cv, `"${ODO[i]}" — un estado del odometro`)
}

// ================================================================ 4 · LOS ANILLOS DEL PLANO 9
//
// En la referencia son pastillas concentricas RELLENAS y difusas, no trazos: cada una es un halo que
// se desvanece hacia afuera, y el apilado de cuatro es lo que produce las bandas. Con `stroke` saldrian
// cuatro lineas duras, que es lo que tenia la version anterior y lo que la hacia parecer un diagrama.
const AROS = [[840, 320], [1200, 490], [1580, 670], [2000, 860]]
for (let i = 0; i < AROS.length; i++) {
  const CW = 2140, CH = 920, k = 2
  const [cv, g] = lienzo(CW, CH, k)
  const w = AROS[i][0], h = AROS[i][1]
  ruta(g, (CW - w) / 2, (CH - h) / 2, w, h, h / 2)
  g.fillStyle = `rgba(122,98,255,${0.52 - i * 0.10})`
  g.fill()
  guardar(`p-aro-${i + 1}`, cv, `pastilla ${i + 1} de 4, ${w}x${h}, RELLENA — el apilado hace el halo`)
}

// ================================================================ 5 · LA MALLA CLARA DE LOS PLANOS 8-9
{
  const W = 2400, H = 1350, k = 2
  const [cv, g] = lienzo(W, H, k)
  g.fillStyle = '#FBFAFF'
  g.fillRect(0, 0, W, H)
  const manchas = [
    { x: 0.30, y: 0.94, r: 0.52, c: '86,58,246',   a: 0.98 },
    { x: 0.74, y: 1.02, r: 0.44, c: '128,96,255',  a: 0.82 },
    { x: 0.12, y: 0.76, r: 0.30, c: '176,150,255', a: 0.55 },
    { x: 0.52, y: 0.36, r: 0.34, c: '255,255,255', a: 0.85 },
  ]
  for (const m of manchas) {
    const d = g.createRadialGradient(m.x * W, m.y * H, 0, m.x * W, m.y * H, m.r * W)
    d.addColorStop(0.00, `rgba(${m.c},${m.a})`)
    d.addColorStop(0.50, `rgba(${m.c},${m.a * 0.36})`)
    d.addColorStop(1.00, `rgba(${m.c},0)`)
    g.fillStyle = d
    g.fillRect(0, 0, W, H)
  }
  guardar('p-blanco', cv, 'el mundo claro: blanco con la luz violeta subiendo desde abajo')
}

console.log(`\nrecursos-p1 -> ${DESTINO}\n`)
for (const h of hechos) console.log('  ' + h)
console.log(`\n  ${hechos.length} recursos`)
