// COMPUERTA DE BOVEDA — que el catalogo cumpla su contrato.
//
// POR QUE ES UNA COMPUERTA Y NO UNA HERRAMIENTA DE AUDITORIA
//
// Todo lo que se comprueba aca da SI o NO, corre en segundos y no renderiza un solo pixel. Es la
// division que el archivo de instrucciones del repo pide en dos lugares: cuando una compuerta y una
// inspeccion visual pueden cazar el mismo defecto, gana la compuerta — una corre sobre las doce
// plantillas en dos segundos y la otra sobre un video.
//
// Y hay un motivo mas fuerte, propio de este motor: BOVEDA ESTA PENSADA PARA LLEGAR A CIENTAS. Con
// doce, un error de contrato se encuentra leyendo; con ciento veinte, no. Lo que esta compuerta
// protege es la promesa que hace el catalogo — "elegis otra y es otro video con los MISMOS datos" —
// y esa promesa se rompe en silencio.
//
// LO QUE COMPRUEBA
//
//   1. `meta` completo y con tipos. Un id que falta rompe el estudio, no el motor.
//   2. IDS UNICOS. Dos plantillas con el mismo id: `porId` devuelve la primera y la segunda es
//      inalcanzable. Sin esto no falla nada — simplemente hay una plantilla que nadie puede elegir.
//   3. LOS SEIS TIEMPOS, TODOS Y EN ORDEN. Es el contrato del motor. Una plantilla a la que le falta
//      PRUEBA no muestra la pagina del cliente, que es lo unico que ninguna plantilla generica puede
//      fingir; una con RAZONES antes que PROMESA cuenta otra historia.
//   4. QUE ENTREN EN LA PIEZA. Un tiempo declarado despues del ultimo beat no ocurre nunca.
//   5. QUE `build` DEVUELVA `dur` Y `alSeek`, y que `dur` coincida con los beats declarados. Una
//      plantilla que informa 40 beats y dura 30 segundos deja diez beats sin codificar.
//   6. QUE CONSTRUYA DE VERDAD, con datos reales de una pagina capturada y con datos MINIMOS. La
//      segunda es la que importa: la regla del motor es que sin material se compone sin ese tiempo,
//      NUNCA con un placeholder, y la unica forma de comprobarlo es construir sin material.
//   7. QUE HAYA TEXTO. Una plantilla que construye sin una sola malla de texto sale muda, y eso ya
//      paso tres veces en este motor: el domo pintando ultimo, el bloom del aire y `repartirFrases`
//      con el parametro equivocado. Ninguna de las tres dio error.
//   8. QUE `necesita` SEA VOCABULARIO CONOCIDO. Una palabra mal escrita en `necesita` hace que
//      `elegibles` la descarte siempre, y la plantilla desaparece del estudio sin que nadie lo note.
//
// LO QUE NO COMPRUEBA, Y HAY QUE DECIRLO: si la pieza se VE bien. Eso no lo puede decir una compuerta.
// La sonda (`tools/boveda-sonda.mjs`) mide cuantos beats quedan sin contenido, y las fotos
// (`backend/boveda_foto.py`) muestran los cuadros. Los tres hacen falta y ninguno reemplaza a otro.

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
const { configurar, BEAT, b, reiniciarRecortes } = await import(pathToFileURL(join(DEMO, 'kit.js')).href)
const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)
const { PLANTILLAS, TIEMPOS, elegibles } = await import(pathToFileURL(join(BOV, 'index.js')).href)
const { recetasDe } = await import(pathToFileURL(join(BOV, 'recetas.js')).href)

const fallos = []
const falla = (id, txt) => fallos.push(id + ': ' + txt)

// ---------------------------------------------------------------- 1-4 · el catalogo
const vistos = new Set()
const AIRES = ['artesanal', 'bienestar', 'corporativo', 'deportivo', 'editorial', 'gastronomico',
  'inmobiliario', 'jugueton', 'lujo', 'nocturno', 'tecnico']
const NECESITA = new Set(['nada', 'tira', 'elementos', 'cifras'])

for (const P of PLANTILLAS) {
  const m = P.meta
  const id = (m && m.id) || '(sin id)'
  if (!m) { falla(id, 'no exporta `meta`'); continue }
  for (const k of ['id', 'nombre', 'familia', 'pitch']) {
    if (typeof m[k] !== 'string' || !m[k].trim()) falla(id, 'meta.' + k + ' vacio o no es texto')
  }
  if (typeof P.build !== 'function') falla(id, 'no exporta `build`')
  if (!(m.beats > 0)) falla(id, 'meta.beats tiene que ser un numero positivo')

  if (vistos.has(m.id)) falla(id, 'ID REPETIDO — `porId` devuelve la primera y esta es inalcanzable')
  vistos.add(m.id)

  for (const n of (m.necesita || [])) {
    if (!NECESITA.has(n)) falla(id, 'meta.necesita tiene ' + JSON.stringify(n) + ', que no es vocabulario conocido (' + [...NECESITA].join(', ') + ')')
  }

  const t = m.tiempos || {}
  let previo = -1
  for (const nombre of TIEMPOS) {
    const v = t[nombre]
    if (typeof v !== 'number') { falla(id, 'le falta el tiempo "' + nombre + '"'); previo = Infinity; continue }
    if (v < previo) falla(id, 'el tiempo "' + nombre + '" (beat ' + v + ') va antes que el anterior (beat ' + previo + ')')
    if (v > m.beats) falla(id, 'el tiempo "' + nombre + '" arranca en el beat ' + v + ' y la pieza dura ' + m.beats)
    previo = v
  }
  // El ultimo tiempo tiene que tener aire para ocurrir. Un PEDIDO que arranca en el penultimo beat es
  // un CTA que aparece y se corta — y el CTA es lo unico que tiene que quedar.
  if (typeof t.pedido === 'number' && m.beats - t.pedido < 3) {
    falla(id, 'PEDIDO arranca en el beat ' + t.pedido + ' de ' + m.beats + ': quedan menos de 3 beats para el CTA')
  }
}

// ---------------------------------------------------------------- 5-7 · construir de verdad
//
// DOS JUEGOS DE DATOS Y NO UNO. Con datos completos se comprueba que la pieza se arma; con datos
// MINIMOS —una marca y nada mas— se comprueba la regla que el motor no puede romper: lo que la pagina
// no dio, no se inventa. Una plantilla que explota sin cifras es una plantilla que en produccion falla
// justo con las paginas mas pobres, que son la mayoria.
let DATOS = ANTHEM
try {
  const f = join(RAIZ, 'tools', 'out', 'motor', 'basecamp-com', 'datos.json')
  if (existsSync(f)) DATOS = JSON.parse(readFileSync(f, 'utf8')).datos
} catch { /* sin captura se usa ANTHEM, que tambien es una pagina real */ }

const MINIMO = { marca: 'X', claim: '', frases: [], datos: [], cta: '', dominio: 'x.com', rotulo: '' }

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H), fov = 32
const distBase = (mundoH / 2) / Math.tan((fov / 2) * Math.PI / 180)

// UN RETRATO EXTREMO, hecho a mano y a proposito. No es el de una pagina real: es el de la pagina mas
// incomoda que el motor puede recibir, con TODAS las recetas en un extremo del rango a la vez.
//
// Ninguna pagina real va a dar esto —un sitio con la camara al maximo, cuatro capas, todo redondeado,
// margen al minimo y dos cifras es una combinacion improbable—, y esa es justamente la gracia: si una
// plantilla sobrevive a los extremos simultaneos, sobrevive a cualquier punto interior.
const EXTREMO = {
  recetas: {
    velocidadCamara: 1.45, capas: 4, dureza: 0.0, margenTexto: 0.74, beatsSugeridos: 44,
    cifrasAPedir: 4, frasesAPedir: 3, acentoComoMasa: true, pruebaGrande: false,
    movimientos: 6, sistematico: true, formalidad: 0.05, calidez: 0.95,
  },
  aire: { vacio: 0.05 },
  paleta: [{ hex: '#123456', peso: 0.4, croma: 0.75, lum: 0.08 },
           { hex: '#9a9a9a', peso: 0.2, croma: 0.0, lum: 0.32 }],
}

function construir(P, datos, aire, retrato) {
  configurar(aire, 5)
  configurarDatos(datos)
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
  const datosEls = [{ rol: 'logo', url: 'f0' }, { rol: 'tarjeta', url: 'f1' }, { rol: 'foto', url: 'f2' }]
  datosEls.forEach((e, i) => texturas.set(e.url, tex(600 + i * 40, 420)))
  const r = P.build({
    THREE, gsap, escena, pagina: paginaEsc, camara, tl, W, H, mundoW, mundoH, distBase,
    BEAT, b, rnd, spec: { W, H }, texturas, datosEls,
    retrato: retrato || null, recetas: recetasDe(retrato),
    bloom: { strength: 0.55 }, pelicula: { uFlash: { value: 0 } },
    rig: { scene: escena, escenaPagina: paginaEsc, camera: camara, tl },
  }) || {}
  let textos = 0
  for (const raiz of [escena, paginaEsc]) {
    raiz.traverse(o => {
      const u = o.isMesh && o.material && !Array.isArray(o.material) && o.material.uniforms
      if (u && u.uProg && u.map) textos++
    })
  }
  return { r, textos, tl, escena, paginaEsc, camara }
}

// El aire rota por plantilla en vez de correr los once por cada una: once aires por doce plantillas
// por dos juegos de datos son 264 construcciones y esta compuerta tiene que costar segundos. Rotando,
// cada aire se ejerce igual y el costo es de 24.
PLANTILLAS.forEach((P, i) => {
  const id = P.meta.id
  const aire = AIRES[i % AIRES.length]

  let full
  try { full = construir(P, DATOS, aire) } catch (e) {
    falla(id, 'EXPLOTA al construir con datos completos (aire ' + aire + '): ' + String(e && e.message || e).slice(0, 160))
    return
  }
  const { r, textos } = full
  if (typeof r.dur !== 'number' || !(r.dur > 0)) falla(id, 'build() no devuelve `dur`')
  if (typeof r.alSeek !== 'function') {
    // No es un capricho: `alSeek` es donde vive TODO lo continuo de este motor, y la regla 1 dice que
    // la camara no se detiene nunca. Una plantilla sin `alSeek` tiene la camara en tweens, y un tween
    // se muestrea una vez por cuadro — o sea que el obturador la barre a saltos.
    falla(id, 'build() no devuelve `alSeek`: sin el no hay movimiento continuo ni obturador limpio')
  }
  const esperado = b(P.meta.beats)
  if (typeof r.dur === 'number' && Math.abs(r.dur - esperado) > 0.001) {
    falla(id, 'dice ' + P.meta.beats + ' beats (' + esperado.toFixed(2) + ' s) y devuelve dur ' + r.dur.toFixed(2) + ' s')
  }
  if (textos < 4) falla(id, 'solo ' + textos + ' mallas de texto con datos completos: la pieza sale casi muda')

  // Y con lo minimo. Aca lo unico que se exige es que NO EXPLOTE y que la marca se vea: todo lo demas
  // puede faltar legitimamente, y componer sin ello es el comportamiento correcto.
  // Y CON EL RETRATO EN LOS EXTREMOS. Es una comprobacion distinta de la de datos minimos y no la
  // reemplaza: alli falta CONTENIDO, aca sobra PERSONALIDAD. Una plantilla que multiplica su recorrido
  // por la velocidad medida y no acota el resultado se rompe con 1.45 y con nada mas.
  try {
    const ext = construir(P, DATOS, aire, EXTREMO)
    if (ext.textos < 4) falla(id, 'con el retrato en los extremos quedan solo ' + ext.textos + ' mallas de texto')
    if (typeof ext.r.alSeek === 'function') {
      ext.tl.time(Math.min(b(P.meta.beats * 0.5), ext.r.dur || 1), false)
      ext.r.alSeek(b(P.meta.beats * 0.5))
    }
  } catch (e) {
    falla(id, 'EXPLOTA con el retrato en los extremos (velocidad 1.45, 4 capas, dureza 0, margen 0.74): '
      + String(e && e.message || e).slice(0, 160))
    return
  }

  let min
  try { min = construir(P, MINIMO, aire) } catch (e) {
    falla(id, 'EXPLOTA con datos minimos (sin claim, sin cifras, sin frases, sin CTA): ' + String(e && e.message || e).slice(0, 160))
    return
  }
  if (min.textos < 1) falla(id, 'con datos minimos no queda una sola malla de texto (la marca tiene que salir igual)')

  // Y QUE `alSeek` NO EXPLOTE, que es distinto de que exista. Se lo llama en los seis tiempos: es
  // donde vive el codigo que corre 4 veces por cuadro, o sea el mas caro de descubrir roto en un render.
  if (typeof r.alSeek === 'function') {
    for (const nombre of TIEMPOS) {
      const bt = (P.meta.tiempos || {})[nombre] || 0
      try {
        full.tl.time(Math.min(b(bt), r.dur), false)
        r.alSeek(b(bt))
      } catch (e) {
        falla(id, 'alSeek() explota en el tiempo "' + nombre + '" (beat ' + bt + '): ' + String(e && e.message || e).slice(0, 140))
        break
      }
    }
  }
})

// ---------------------------------------------------------------- 8 · elegibilidad
//
// Con material completo tienen que estar TODAS: una plantilla que se descarta con la pagina mas rica
// posible no se puede elegir nunca, y eso es un error de `necesita`, no una decision.
const todas = elegibles(['tira', 'elementos'], DATOS)
if (todas.length !== PLANTILLAS.length) {
  const faltan = PLANTILLAS.filter(p => !todas.includes(p)).map(p => p.meta.id)
  falla('catalogo', 'con material completo quedan ' + todas.length + ' de ' + PLANTILLAS.length + ' elegibles; no entran: ' + faltan.join(', '))
}
// Y sin nada tiene que quedar al menos una, o el estudio no puede ofrecer NADA para una pagina pobre.
const pobres = elegibles([], MINIMO)
if (!pobres.length) falla('catalogo', 'sin tira, sin recortes y sin cifras no queda una sola plantilla elegible')

// ---------------------------------------------------------------- veredicto
if (fallos.length) {
  console.log('GATE BOVEDA FAIL (' + fallos.length + ')')
  for (const f of fallos) console.log('  - ' + f)
  process.exit(1)
}
console.log('GATE BOVEDA OK (' + PLANTILLAS.length + ' plantillas · ' + TIEMPOS.length + ' tiempos · datos completos, minimos y retrato en los extremos)')
