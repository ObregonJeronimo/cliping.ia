// SONDA DE BOVEDA — construye una plantilla en Node y cuenta lo que quedo en el grafo.
//
// Existe porque un render que sale mal no dice POR QUE: la pieza de `atrio` salio sin una sola letra y
// la consola del navegador no tenia un solo error. Las mallas se creaban y no se veian, que es el peor
// caso — no hay nada que leer.
//
// Construir en Node cuesta un segundo y responde las tres preguntas que importan: cuantas mallas de
// texto hay, DONDE quedaron respecto de la camara en cada beat, y si su `uProg` llega a encenderse.
//
// Uso:  node tools/boveda-sonda.mjs [plantilla] [aire]
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { createCanvas } from '@napi-rs/canvas'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const BOV = join(RAIZ, 'render3d', 'boveda')

const { registrarFuentes } = await import('./fuentes-reales.mjs')
registrarFuentes(RAIZ)
const lienzo = (w = 4, h = 4) => createCanvas(w, h)
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? lienzo() : { style: {} }),
  getElementById: () => lienzo(),
  fonts: { ready: Promise.resolve(), load: async () => {}, add() {}, check: () => true, *[Symbol.iterator]() {} },
}
globalThis.FontFace = class { constructor(f) { this.family = f } async load() { return this } }
globalThis.window = globalThis
console.warn = () => {}
const { gsap } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'gsap', 'dist', 'gsap.js')).href)
globalThis.gsap = gsap
const THREE = await import(pathToFileURL(join(RAIZ, 'node_modules', 'three', 'build', 'three.module.js')).href)
const { configurar, BEAT, b } = await import(pathToFileURL(join(DEMO, 'kit.js')).href)
const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)
const { reiniciarRecortes } = await import(pathToFileURL(join(DEMO, 'kit.js')).href)

// COMPUERTA DEL OBTURADOR — el motor tiene que dar el MISMO cuadro sin importar cuantas veces se lo
// busque para llegar a el.
//
// POR QUE EXISTE
//
// `render3d/demo/main.js:frameCon` busca la linea de tiempo CUATRO veces por cuadro para el desenfoque
// de obturador, y cada busqueda corre `tl.time(t)` y despues `alSeek(t)`. De ahi sale la regla que este
// motor tiene escrita en tres lugares: en `alSeek` se SUMA si un tween anima esa clave y se ASIGNA
// sobre una base si no la anima nadie.
//
// El problema es que la regla se venia comprobando a ojo, y `boveda-check` llama a `alSeek` UNA vez —
// asi que un `+=` sobre un eje sin tween pasa la compuerta, pasa la sonda (un seek por beat) y pasa las
// fotos (24 seeks en toda la pieza). Solo aparece en el video, donde son ~120 por segundo, y aparece
// como "un bloque se fue de cuadro" sin ningun error.
//
// LO QUE MIDE, que es un invariante y no una heuristica: se construye la MISMA plantilla dos veces y se
// la recorre entera, una con una muestra por cuadro y otra con cuatro. Al llegar al mismo instante, las
// dos tienen que estar en el mismo estado. Si difieren, hay algo que acumula.
//
// No renderiza: construye y busca. Uso:
//     node tools/boveda-obturador-check.mjs            (todas)
//     node tools/boveda-obturador-check.mjs vortice    (una)
// LAZY OFF, y esto es parte de lo que se esta midiendo.
//
// gsap difiere la PRIMERA escritura de un tween hasta el siguiente tick del ticker, para no provocar
// relayouts. Un motor que busca la linea de tiempo cuatro veces por cuadro sin que corra el ticker
// puede leer un valor viejo, y entonces el resultado depende de cuantas busquedas hubo — que es
// exactamente lo que esta compuerta declara ilegal. Se apaga aca y se apaga tambien en el arnes real
// (`render3d/demo/main.js`), porque si se apagara solo aca el instrumento estaria midiendo un motor
// que no existe.
gsap.config({ lazy: false })

const soloEsta = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null
const nomAire = 'editorial'
const aire = (await import(pathToFileURL(join(DEMO, 'aires', nomAire + '.js')).href)).default
let DATOS = ANTHEM
try {
  const f = join(RAIZ, 'tools', 'out', 'motor', 'basecamp-com', 'datos.json')
  if (existsSync(f)) DATOS = JSON.parse(readFileSync(f, 'utf8')).datos
} catch { /* ANTHEM */ }
const { porId, PLANTILLAS } = await import(pathToFileURL(join(RAIZ, 'render3d', 'boveda', 'index.js')).href)
const { recetasDe } = await import(pathToFileURL(join(RAIZ, 'render3d', 'boveda', 'recetas.js')).href)
let RETRATO = null
try {
  const fr = join(RAIZ, 'tools', 'out', 'motor', 'basecamp-com', 'retrato.json')
  if (existsSync(fr)) RETRATO = JSON.parse(readFileSync(fr, 'utf8'))
} catch { /* neutros */ }

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H), fov = 32
const distBase = (mundoH / 2) / Math.tan((fov / 2) * Math.PI / 180)

// UNA CONSTRUCCION LIMPIA CADA VEZ. Es todo el punto: si se reusara la escena, el estado acumulado de
// la primera pasada contaminaria la segunda y las dos darian lo mismo — el instrumento diria "no hay
// acumulacion" justamente porque acumulo.
function construir(P) {
  configurar(aire, 5)
  configurarDatos(DATOS)
  reiniciarReparto(); reiniciarRecortes()
  const escena = new THREE.Scene(), paginaEsc = new THREE.Scene()
  const camara = new THREE.PerspectiveCamera(fov, W / H, 0.1, 600)
  camara.position.set(0, 0, distBase)
  const tl = gsap.timeline({ paused: true })
  let s = 1
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const texturas = new Map()
  const tex = (w, h) => { const t = new THREE.CanvasTexture(createCanvas(4, 4)); t.image = { width: w, height: h }; return t }
  texturas.set('tira', tex(720, 8192))
  const datosEls = [
    { rol: 'logo', url: 'f0' }, { rol: 'tarjeta', url: 'f1' }, { rol: 'foto', url: 'f2' },
    { rol: 'cta', url: 'f3' }, { rol: 'tarjeta', url: 'f4' },
  ]
  datosEls.forEach((e, i) => texturas.set(e.url, tex(600 + i * 40, 420)))
  const r = P.build({
    THREE, gsap, escena, pagina: paginaEsc, camara, tl, W, H, mundoW, mundoH, distBase,
    BEAT, b, rnd, spec: { W, H }, texturas, datosEls,
    retrato: RETRATO, recetas: recetasDe(RETRATO),
    bloom: { strength: 0.55 }, pelicula: { uFlash: { value: 0 } },
    rig: { scene: escena, escenaPagina: paginaEsc, camera: camara, tl },
  }) || {}
  return { escena, paginaEsc, camara, tl, r, dur: r.dur || b(P.meta.beats) }
}

// El mismo `seek` que hace el arnes: `tl.time(tt, false)` y despues `alSeek(tt)`. Copiarlo y no
// llamarlo seria medir otra cosa que la que corre — el error que este repo ya cometio con la sonda.
const seek = (E, t) => {
  const tt = Math.max(0, Math.min(E.dur, t))
  E.tl.time(tt, false)
  if (E.r.alSeek) E.r.alSeek(tt)
}

// La foto del estado: posicion, rotacion y escala de todo lo que hay, en orden de recorrido. El orden
// de `traverse` es determinista, asi que dos construcciones de la misma plantilla dan la misma lista.
const CLAVES = ['pos.x', 'pos.y', 'pos.z', 'rot.x', 'rot.y', 'rot.z', 'esc.x', 'esc.y', 'esc.z']

// QUE ES CADA OBJETO. Las mallas no tienen nombre, asi que se arma uno con el tipo de geometria, el
// tipo de material y la profundidad en el arbol. Es feo y alcanza: con "TorusGeometry rot.x" ya se
// sabe donde mirar, que es todo lo que un instrumento tiene que dar.
const quien = (o) => {
  const g = (o.geometry && o.geometry.type) || (o.isGroup ? 'Group' : o.type)
  const m = (o.material && !Array.isArray(o.material) && o.material.type) || ''
  let d = 0
  for (let n = o.parent; n; n = n.parent) d++
  return `${g}${m ? '/' + m.replace('Material', '') : ''}@${d}`
}

function foto(E) {
  const v = [], que = []
  for (const raiz of [E.escena, E.paginaEsc]) {
    raiz.traverse(o => {
      v.push(o.position.x, o.position.y, o.position.z,
        o.rotation.x, o.rotation.y, o.rotation.z,
        o.scale.x, o.scale.y, o.scale.z)
      const q = quien(o)
      for (let i = 0; i < 9; i++) que.push(q + ' ' + CLAVES[i])
    })
  }
  v.push(E.camara.position.x, E.camara.position.y, E.camara.position.z,
    E.camara.rotation.x, E.camara.rotation.y, E.camara.rotation.z)
  for (let i = 0; i < 6; i++) que.push('CAMARA ' + CLAVES[i < 3 ? i : i + 3 - 3])
  return { v, que }
}

const FPS = 30
const ANGULO = 190
const MUESTRAS = 4

// Los instantes donde se comparan las dos pasadas. En cuartos: si algo acumula, para el 25% ya se nota
// y decir DONDE empieza a divergir es la mitad del diagnostico.
function correr(P) {
  const A = construir(P), B = construir(P)
  const n = Math.ceil(A.dur * FPS)
  const vent = (ANGULO / 360) / FPS
  const cortes = [Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1]
  const dif = []
  let peor = 0, peorEn = null, primera = null
// COMO SE COMPARAN LAS DOS PASADAS, que es donde este instrumento se equivoco primero.
//
// La primera version buscaba las cuatro submuestras en B y despues VOLVIA al instante nominal para
// comparar contra A. Ese salto hacia atras es un movimiento que el render real nunca hace, y gsap no
// es indiferente: al retroceder vuelve a capturar el valor de partida de los tweens `from`, asi que la
// pasada B quedaba en un estado que ninguna corrida de verdad produce. Resultado: doce plantillas
// marcadas FAIL por un transitorio de 0,02 a 0,13 que era del instrumento.
//
// Ahora las dos pasadas TERMINAN en el mismo instante —la ultima submuestra— y ninguna retrocede. Lo
// unico que las diferencia es cuantas busquedas intermedias hubo, que es exactamente lo que se quiere
// medir.
  for (let i = 0; i < n; i++) {
    const t = i / FPS
    const tk = (k) => Math.max(0, t + ((k + 0.5) / MUESTRAS - 0.5) * vent)
    // A: una sola muestra, en el MISMO instante en que B termina. B: las cuatro del obturador.
    seek(A, tk(MUESTRAS - 1))
    for (let k = 0; k < MUESTRAS; k++) seek(B, tk(k))
    if (!cortes.includes(i)) continue
    const fa = foto(A), fb = foto(B)
    let d = 0, idx = -1
    const culpables = new Map()
    for (let j = 0; j < Math.min(fa.v.length, fb.v.length); j++) {
      const e = Math.abs(fa.v[j] - fb.v[j])
      if (e <= EPS) continue
      const k = fa.que[j]
      if (e > (culpables.get(k) || 0)) culpables.set(k, e)
      if (e > d) { d = e; idx = j }
    }
    const top = [...culpables.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3)
    dif.push({ cuadro: i, t: +(t).toFixed(2), d: +d.toFixed(4), idx, top })
    if (d > peor) { peor = d; peorEn = { cuadro: i, t: +(t).toFixed(2), idx, quien: fa.que[idx] } }
    if (primera === null && d > 1e-4) primera = +(t).toFixed(2)
  }
  // Persiste si el ULTIMO corte todavia difiere: si a esa altura volvio a cero, lo que hubo fue un
  // transitorio mientras corria algun tween.
  const ultimo = dif.length ? dif[dif.length - 1].d : 0
  return { peor, peorEn, primera, dif, n, persiste: ultimo > EPS }
}

// DOS UMBRALES, PORQUE SON DOS DEFECTOS DISTINTOS Y UNO SOLO NO PUEDE JUZGARLOS.
//
// ACUMULACION: la diferencia aparece y NO se va. Es un `+=` o un `*=` sobre una clave sin tween, y se
// multiplica por las ~120 busquedas por segundo del obturador. Llega a decenas de unidades de mundo.
// Eso es un FAIL sin discusion.
//
// TRANSITORIO: la diferencia aparece mientras corre un tween y vuelve a cero al terminar. gsap guarda
// el valor de partida de un `to()` la PRIMERA VEZ que lo renderiza, y cual de las cuatro submuestras es
// esa depende de cuantas haya; el desfase dura lo que dura el tween. Medido en las 31: entre 0,0017 y
// 0,027 unidades de mundo, o sea de medio pixel a cinco sobre 1080. No es bueno, pero no es lo mismo, y
// llamarlo FAIL junto con lo otro esconde lo que importa.
//
// Un transitorio grande SI falla: por encima de TOPE_TRANSITORIO ya no es un desfase de arranque.
const EPS = 1e-4
const TOPE_TRANSITORIO = 0.15

// TRAZA: cuadro por cuadro, para una sola plantilla. Un instrumento que dice "difiere 0.13 en el
// segundo 12" y nada mas obliga a adivinar; este imprime los primeros cuadros donde aparece y los dos
// valores, que es lo unico con lo que se puede decidir si es acumulacion o transitorio.
// AUTOCONTROL DEL INSTRUMENTO. Antes de acusar al motor hay que descartar que las dos construcciones
// sean piezas distintas: si `construir()` no fuera reproducible, las dos listas no serian comparables
// y todo lo que informe esta compuerta seria ruido. Se compara ANTES de buscar nada.
if (process.argv.includes('--gemelas')) {
  const P = porId(soloEsta) || PLANTILLAS[0]
  const A = construir(P), B = construir(P)
  const fa = foto(A), fb = foto(B)
  console.log(`  dur      A=${A.dur.toFixed(4)}  B=${B.dur.toFixed(4)}`)
  console.log(`  objetos  A=${fa.v.length / 9}  B=${fb.v.length / 9}`)
  console.log(`  tl dur   A=${A.tl.duration().toFixed(4)}  B=${B.tl.duration().toFixed(4)}`)
  let d = 0, idx = -1
  for (let j = 0; j < Math.min(fa.v.length, fb.v.length); j++) {
    const e = Math.abs(fa.v[j] - fb.v[j])
    if (e > d) { d = e; idx = j }
  }
  console.log(`  estado recien construidas, peor diferencia ${d.toFixed(5)}` + (idx >= 0 ? `  ${fa.que[idx]}  A=${fa.v[idx].toFixed(4)} B=${fb.v[idx].toFixed(4)}` : ''))
  process.exit(0)
}

if (process.argv.includes('--traza')) {
  const P = porId(soloEsta)
  if (!P) { console.error('--traza necesita una plantilla'); process.exit(2) }
  const A = construir(P), B = construir(P)
  const n = Math.ceil(A.dur * FPS)
  const vent = (ANGULO / 360) / FPS
  let mostrados = 0
  for (let i = 0; i < n && mostrados < 14; i++) {
    const t = i / FPS
    const tk = (k) => Math.max(0, t + ((k + 0.5) / MUESTRAS - 0.5) * vent)
    seek(A, tk(MUESTRAS - 1))
    for (let k = 0; k < MUESTRAS; k++) seek(B, tk(k))
    const fa = foto(A), fb = foto(B)
    let d = 0, idx = -1
    for (let j = 0; j < fa.v.length; j++) {
      const e = Math.abs(fa.v[j] - fb.v[j])
      if (e > d) { d = e; idx = j }
    }
    if (d > EPS) {
      console.log(`  cuadro ${String(i).padStart(4)}  t=${t.toFixed(3)}  dif ${d.toFixed(5)}  ${fa.que[idx]}   A=${fa.v[idx].toFixed(5)}  B=${fb.v[idx].toFixed(5)}`)
      mostrados++
    }
  }
  if (!mostrados) console.log('  sin diferencias por encima de ' + EPS)
  process.exit(0)
}

const lista = soloEsta ? [porId(soloEsta)].filter(Boolean) : PLANTILLAS
if (!lista.length) { console.error('no existe: ' + soloEsta); process.exit(2) }
let malas = 0, avisos = 0
for (const P of lista) {
  const r = correr(P)
  const ok = r.peor <= EPS
  const acumula = !ok && (r.persiste || r.peor > TOPE_TRANSITORIO)
  if (!ok) { if (acumula) malas++; else avisos++ }
  const detalle = r.dif.map(d => `${d.t}s:${d.d}`).join('  ')
  const rot = ok ? 'ok   ' : (acumula ? 'FAIL ' : 'aviso')
  console.log(`  ${rot}${P.meta.id.padEnd(12)} peor ${r.peor.toFixed(4)}` +
    (ok ? '' : `  (${acumula ? 'ACUMULA' : 'transitorio'} desde ${r.primera}s - ${r.peorEn.quien})`) +
    `   ${detalle}`)
  if (!ok) {
    const acum = new Map()
    for (const d of r.dif) for (const [k, e] of (d.top || [])) if (e > (acum.get(k) || 0)) acum.set(k, e)
    for (const [k, e] of [...acum.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4)) {
      console.log(`         ${e.toFixed(4)}  ${k}`)
    }
  }
}
const cola = avisos ? ` - ${avisos} con desfase de arranque de tween (transitorio, tope ${TOPE_TRANSITORIO})` : ''
if (malas) {
  console.log(`
GATE OBTURADOR FAIL (${malas} de ${lista.length} ACUMULAN${cola})`)
  console.log('  Acumular es un `+=` o un `*=` en alSeek sobre una clave que ningun tween anima: el video')
  console.log('  busca la linea de tiempo 4 veces por cuadro y el valor se suma sobre si mismo. Usa')
  console.log('  `sumador()` de movimiento.js, o mete el gesto en un grupo propio y asigna ahi.')
  process.exit(1)
}
console.log(`GATE OBTURADOR OK (${lista.length} plantillas: ninguna acumula${cola})`)
