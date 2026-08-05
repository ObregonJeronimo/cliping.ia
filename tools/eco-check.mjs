// COMPUERTA E-SIN-ECO-ENTRE-ESCENAS — la misma frase no sale dos veces en la misma pieza.
//
// Es el reclamo textual sobre dos videos distintos: "se repitieron los mismos textos en otras
// escenas". Y es el punto ciego que el handoff nombra sin rodeos: NINGUNA compuerta mide repeticion de
// contenido, porque dos escenas pueden estar perfectamente compuestas —entrar en el cuadro, tener
// contraste, respetar sus beats— y contar exactamente lo mismo. Todo lo que se auditaba era la forma.
//
// COMO SE MIDE, sin renderizar un pixel. `datos.js` reparte las frases desde UN mostrador compartido y
// ahora anota cada entrega en `entregadas`. Se construye la pieza entera en el orden del guion —que es
// lo que hace `main.js`— y se atribuye por tramos: lo que aparece en `entregadas` mientras se construye
// la escena i, se lo llevo la escena i. Si una frase figura en dos tramos, el espectador la va a leer
// dos veces.
//
// POR QUE HAY QUE CONSTRUIR Y NO ALCANZA CON EL PLAN: el consumo no esta en el guion. `guion.js` reparte
// un cupo entre cinco escenas SEDIENTAS, pero `hero` tambien bebe —una frase para su rotulo, en
// `hero.js:76`— y no figura ni en SEDIENTAS ni en APETITO. O sea que la escena que mas veces aparece en
// una pieza consume por fuera de la cuenta, y eso solo se ve construyendo.
//
// Uso:  node tools/eco-check.mjs
import { createCanvas } from '@napi-rs/canvas'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const DIRS = [join(DEMO, 'escenas'), join(DEMO, 'heroes')]

// SE CORRE POR PARTES, UNA PAGINA POR PROCESO, POR LA MISMA RAZON QUE `fondo-check`.
//
// Cada llamada a `texto()` compromete pixeles que NO vuelven —los reserva la libreria nativa de canvas
// y no los suelta ni soltando la textura, ni vaciando el cache, ni pidiendo la recoleccion a mano—.
// Esta compuerta construye 105 piezas de varias escenas cada una, y medida desde afuera llegaba a
// **12.376 MB de memoria COMPROMETIDA** en un solo proceso. Node informaba una fraccion de eso: la
// unica forma de verlo es preguntarle a Windows, y la unica forma de devolverlo es terminar el proceso.
//
// Se parte por pagina, cada parte emite sus contadores y el padre los suma. El veredicto no cambia
// —`conEco / piezas` es una suma— y el pico baja a lo que cuesta UNA pagina.
if (!process.env.ECO_PAGINA) {
  const { spawnSync } = await import('node:child_process')
  const NPAG = 8                                    // se descubre abajo; el padre solo necesita el tope
  let piezasT = 0, conEcoT = 0
  const culpablesT = new Map()
  const ejemplosT = []
  for (let i = 0; i < NPAG; i++) {
    const r = spawnSync(process.execPath, [process.argv[1]],
      { env: { ...process.env, ECO_PAGINA: String(i) }, encoding: 'utf8' })
    const txt = (r.stdout || '') + (r.stderr || '')
    const linea = txt.split(String.fromCharCode(10)).find(l => l.startsWith('##ECO##'))
    if (!linea) {
      if (txt.includes('##FUERA##')) break          // se acabaron las paginas
      console.log(txt)
      console.log('GATE ECO FAIL: una parte no devolvio contadores.')
      process.exit(1)
    }
    const d = JSON.parse(linea.slice(7))
    piezasT += d.piezas; conEcoT += d.conEco
    for (const [k, v] of d.culpables) culpablesT.set(k, (culpablesT.get(k) || 0) + v)
    ejemplosT.push(...d.ejemplos)
  }
  const pctT = piezasT ? (conEcoT / piezasT * 100) : 0
  const TOPE = 13.0
  if (culpablesT.size) {
    console.log('  escenas involucradas: '
      + [...culpablesT].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
  }
  for (const e of ejemplosT.slice(0, 6)) console.log('    ' + e)
  if (pctT > TOPE) {
    console.log(`
GATE ECO FAIL: ${conEcoT} de ${piezasT} piezas (${pctT.toFixed(1)}%) repiten una frase `
      + `en dos escenas, y el trinquete esta en ${TOPE}%.`)
    process.exit(1)
  }
  console.log(`GATE ECO OK (${pctT.toFixed(1)}% de ${piezasT} piezas repiten una frase entre escenas; `
    + `trinquete ${TOPE}%, y es un trinquete: ver la nota de arriba). Barrido en ${NPAG} procesos para `
    + `que la memoria vuelva al sistema.`)
  process.exit(0)
}

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
const { BEAT, LOOK, b, configurar, reiniciarRecortes } = await import(pathToFileURL(join(DEMO, 'kit.js')).href)
const DAT = await import(pathToFileURL(join(DEMO, 'datos.js')).href)
const { guionDe } = await import(pathToFileURL(join(DEMO, 'guion.js')).href)
const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}

// LOS MODULOS DE ESCENA, UNA SOLA VEZ. Importar 37 modulos por cada pieza mataria la compuerta.
const MOD = new Map()
for (const d of DIRS) {
  for (const f of readdirSync(d).filter(x => x.endsWith('.js') && x !== 'index.js')) {
    try {
      const m = await import(pathToFileURL(join(d, f)).href)
      if (m.meta && typeof m.build === 'function') MOD.set(m.meta.id, m)
    } catch { /* una escena que no importa ya la acusa verificar.mjs */ }
  }
}
// EL CATALOGO ES SOLO `escenas/`, Y ESTO YA ME MORDIO. La primera version lo armaba con los dos
// directorios, asi que `guionDe` programaba HEROES como si fueran escenas —los planes salian
// `...>vitrina>cubo>calibre>biela>...`— y la pieza no pasaba nunca por `hero.js`, que es exactamente
// donde vive el trago que hay que medir. La compuerta informaba 1.9% de eco sobre piezas que el motor
// no produce. Un instrumento que mide otra cosa da un numero igual de convincente.
const IDS_ESCENA = new Set(readdirSync(join(DEMO, 'escenas')).filter(x => x.endsWith('.js') && x !== 'index.js').map(x => x.replace('.js', '')))
const CAT = new Map([...MOD].filter(([id]) => IDS_ESCENA.has(id)).map(([id, m]) => [id, { beats: m.meta.beats }]))

// EL CONTENIDO ES EL REAL. Con frases de una letra —como las que usa el gate del guion— la repeticion
// existe igual pero no se parece a nada: lo que hay que medir es el pozo que dan las paginas de verdad.
const { datosDe } = await import(pathToFileURL(join(RAIZ, 'tools', 'anthem-datos.mjs')).href)
const { normalizePageModel } = await import(pathToFileURL(join(RAIZ, 'src', 'director', 'core', 'schema.js')).href)
const PAGINAS = []
{
  const dirFix = join(RAIZ, 'tools', 'fixtures', 'director', 'elementos')
  if (existsSync(dirFix)) {
    for (const f of readdirSync(dirFix).filter(x => x.endsWith('.json')).sort()) {
      try {
        const pm = normalizePageModel(JSON.parse(readFileSync(join(dirFix, f), 'utf8')))
        PAGINAS.push({ nombre: f.replace('.json', ''), datos: datosDe(pm) })
      } catch { /* ya lo reporta quien convierte */ }
    }
  }
}

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30, distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

function tejido(els = []) {
  const m = new Map()
  ;[2.4, 1.0, 0.6, 3.4, 1.35].forEach((ar, i) => {
    const h = 64, w = Math.max(2, Math.round(h * ar))
    const t = new THREE.CanvasTexture(createCanvas(w, h))
    t.image = { width: w, height: h }
    m.set('f' + i, t)
  })
  // Y CON LAS CLAVES REALES DE LA PAGINA. El Map se llenaba con 'f0'..'f4' mientras `datosEls` trae
  // las urls del fixture ('stripe-com__el0-logo.png'), asi que NINGUN recorte resolvia y toda escena
  // que necesita una imagen se declaraba vacia. La primera medicion decia "titular se cae el 100% de
  // las veces" y era el arnes, no el motor.
  ;(els || []).forEach((e, i) => {
    if (!e || !e.url) return
    const ar = [2.4, 1.0, 0.6, 3.4, 1.35][i % 5]
    const h = 64, w = Math.max(2, Math.round(h * ar))
    const t = new THREE.CanvasTexture(createCanvas(w, h))
    t.image = { width: w, height: h }
    m.set(e.url, t)
  })
  const t = new THREE.CanvasTexture(createCanvas(4, 4))
  t.image = { width: 720, height: 6240 }
  m.set('tira', t)
  return m
}

const _norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9à-ÿ ]+/gi, ' ').replace(/[ ]+/g, ' ').trim()

// Construye UNA pieza y devuelve, por escena, que frases se llevo del mostrador.
async function pieza(datos, seed, dur, aire) {
  configurar(AIRES[aire])
  DAT.reiniciarReparto()
  reiniciarRecortes()
  DAT.configurarDatos(datos)
  const plan = guionDe({ escenas: CAT, datos, seed, beatSeg: BEAT, dur })
  const tramos = []
  const repeticiones = new Map()
  for (const id of plan) {
    const mod = MOD.get(id)
    if (!mod) continue
    const antes = DAT.entregadas.length
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
    camera.position.set(0, 0, distBase)
    let s = seed || 1
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    const uni = () => ({ uT: { value: 0 }, uGrilla: { value: 0.55 }, uPulso: { value: 0 }, uA: { value: new THREE.Color(LOOK.bg) }, uB: { value: new THREE.Color(LOOK.bg2) } })
    try {
      await mod.build({
        THREE, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
        fondo: uni(),
        pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
        bloom: { strength: 0.85, radius: 0.62, threshold: 0.62 },
        texturas: tejido(datos.elementos || []),
        datosEls: datos.elementos || [],
        spec: { tiraViewport: 1560, aire },
        claro: false,
        repeticion: repeticiones.get(id) || 0,
      })
    } catch { /* que una escena falle al construir ya lo dice verificar.mjs */ }
    repeticiones.set(id, (repeticiones.get(id) || 0) + 1)
    tramos.push({ id, frases: DAT.entregadas.slice(antes).map(_norm).filter(Boolean) })
  }
  return tramos
}

const SEMILLAS = [3, 11, 20, 31, 47]
const DURS = [15, 20, 30]
const AIRE = 'tecnico'                                   // uno solo: el eco no depende del aire
let piezas = 0, conEco = 0
const culpables = new Map()
const _consumo = new Map()
const ejemplos = []

const _idx = Number(process.env.ECO_PAGINA)
if (_idx >= PAGINAS.length) { console.log('##FUERA##'); process.exit(0) }
for (const pag of PAGINAS.slice(_idx, _idx + 1)) {
  for (const dur of DURS) {
    for (const seed of SEMILLAS) {
      const tramos = await pieza(pag.datos, seed, dur, AIRE)
      piezas++
      for (const t of tramos) {
        const v = _consumo.get(t.id) || { veces: 0, total: 0 }
        v.veces++; v.total += t.frases.length; _consumo.set(t.id, v)
      }
      const donde = new Map()
      tramos.forEach((t, i) => {
        for (const f of new Set(t.frases)) {
          if (!donde.has(f)) donde.set(f, [])
          donde.get(f).push({ i, id: t.id })
        }
      })
      let eco = false
      for (const [f, sitios] of donde) {
        if (sitios.length < 2) continue
        eco = true
        for (const s of sitios) culpables.set(s.id, (culpables.get(s.id) || 0) + 1)
        if (ejemplos.length < 6) {
          ejemplos.push(`${pag.nombre}/seed${seed}/${dur}s: "${f.slice(0, 44)}" en ${sitios.map(s => s.id).join(' y ')}`
            + `   (plan ${tramos.map(t => t.id).join('>')})`)
        }
      }
      if (eco) conEco++
    }
  }
}

// MEDICION: cuanto bebe cada escena de verdad, que es lo que el cupo de guion.js deberia saber.
if (process.env.MEDIR_SED) {
  const sed = new Map()
  for (const [id, v] of _consumo) sed.set(id, v)
  console.log('  CONSUMO por escena (veces que aparecio / frases que se llevo / promedio):')
  for (const [id, v] of [...sed].sort((a, b) => (b[1].total / b[1].veces) - (a[1].total / a[1].veces))) {
    console.log(`    ${id.padEnd(12)} ${String(v.veces).padStart(4)} apariciones  ${String(v.total).padStart(4)} frases  ${(v.total / v.veces).toFixed(2)} por vez`)
  }
}
// EL HIJO NO JUZGA: emite sus contadores y el padre suma. El veredicto tiene que salir del TOTAL —una
// pagina sola nunca sabria si el 13% se cruzo— y ademas asi el trinquete vive en un solo lugar.
console.log('##ECO##' + JSON.stringify({
  piezas, conEco, culpables: [...culpables], ejemplos: ejemplos.slice(0, 2),
}))
process.exit(0)
