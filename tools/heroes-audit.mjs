// AUDITORIA DE HEROES — que produce cada uno cuando SI se ofrece.
//
// POR QUE EXISTE. `heroes-check` comprueba ELEGIBILIDAD: que un hero no se ofrezca sin material y que
// con material real si se ofrezca. Eso deja sin mirar la otra mitad, que es la que se ve: un hero
// puede ser elegible, construirse sin una sola queja y salir POBRE — tres objetos chiquitos en el
// medio de un cuadro vacio, o una composicion que no se mueve.
//
// Y hay un motivo concreto para no confiar en el catalogo: doce de los dieciocho declaran
// `necesita: ['nada']`, y eso dice que no les hace falta material — no que se vean bien. Nadie los
// habia mirado a todos.
//
// QUE MIDE, y con que honestidad. Todo esto se saca CONSTRUYENDO la escena y proyectando su geometria
// contra la camara que la escena mueve. NO es el video: no hay shaders, ni bloom, ni grano, ni
// texturas reales dibujadas. Son proxies geometricos, y sirven para COMPARAR heroes entre si y para
// encontrar los casos extremos, no para dar un numero absoluto de calidad.
//
//   mallas      cuantos objetos dibujables tiene la escena, promedio sobre los instantes
//   conImagen   cuantos de esos muestran una imagen (recorte del cliente o texto)
//   cobertura   fraccion del cuadro cubierta por las cajas proyectadas, saturada a 1. Es un PROXY:
//               suma areas y no descuenta solapamiento, asi que sobreestima cuando hay pilas.
//   movimiento  cuanto se desplaza el centro proyectado de las mallas entre instantes consecutivos,
//               en fracciones de cuadro. Un hero que no se mueve se lee como diapositiva.
//               DICE "(gpu)" cuando el hero deforma por shader: ahi este numero NO significa nada,
//               porque el GLSL no corre en Node. Se marca en vez de imprimir un cero que miente.
//   muestra     si alguna malla lleva un recorte real de la pagina del cliente
//
// Uso:  node tools/heroes-audit.mjs            (tabla, peor primero)
//       node tools/heroes-audit.mjs --json
import { createCanvas } from '@napi-rs/canvas'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const HEROES = join(DEMO, 'heroes')

const { registrarFuentes } = await import('./fuentes-reales.mjs')
registrarFuentes(RAIZ)
const lz = (w = 4, h = 4) => createCanvas(w, h)
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? lz() : { style: {} }),
  getElementById: () => lz(),
  fonts: { ready: Promise.resolve(), load: async () => {}, add() {}, check: () => true, *[Symbol.iterator]() {} },
}
globalThis.FontFace = class { constructor(f) { this.family = f } async load() { return this } }
globalThis.window = globalThis
console.warn = () => {}
const { gsap } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'gsap', 'dist', 'gsap.js')).href)
globalThis.gsap = gsap
const THREE = await import(pathToFileURL(join(RAIZ, 'node_modules', 'three', 'build', 'three.module.js')).href)
const { BEAT, LOOK, b, configurar, reiniciarRecortes } = await import(pathToFileURL(join(DEMO, 'kit.js')).href)
const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)
const { datosDe } = await import(pathToFileURL(join(RAIZ, 'tools', 'anthem-datos.mjs')).href)
const { normalizePageModel } = await import(pathToFileURL(join(RAIZ, 'src', 'director', 'core', 'schema.js')).href)

const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}

// MATERIAL REAL Y ABUNDANTE. Un hero auditado con material pobre da pobre por el material y no por el
// hero, y eso seria culpar al mensajero. Se usan los fixtures con elementos, que son paginas de verdad.
const JUEGOS = []
{
  const dir = join(RAIZ, 'tools', 'fixtures', 'director', 'elementos')
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
      try {
        const pm = normalizePageModel(JSON.parse(readFileSync(join(dir, f), 'utf8')))
        JUEGOS.push({ nombre: f.replace('.json', ''), datos: datosDe(pm) })
      } catch { /* un fixture que no convierte no puede tirar la auditoria */ }
    }
  }
}
if (!JUEGOS.length) JUEGOS.push({ nombre: 'ANTHEM', datos: ANTHEM })

// LAS TEXTURAS DE PRUEBA VAN CON RESOLUCION REALISTA, Y ESTO NO ES UN DETALLE. La primera version las
// hacia de 64 px de alto, como el resto de las compuertas —que miden geometria, donde la resolucion no
// importa—. Aca si importa: varios heroes topean el tamaño dibujado con `topeNitido` para no pixelar el
// recorte del cliente, asi que con texturas de 64 px las dibujan DIMINUTAS. Medido: `mosaico` daba
// 0.044 de cobertura, la peor de los 17 y diez veces menos que la siguiente, y no era un defecto del
// hero: era el instrumento. Los recortes reales miden de 120 a 1400 px (los de stripe.com en disco).
function tejido(n) {
  const ar = [2.4, 1.0, 0.6, 3.4, 1.35, 1.8, 0.75, 2.0, 1.2, 3.0, 0.9, 1.5]
  const m = new Map()
  for (let i = 0; i < n; i++) {
    const h = 700, w = Math.max(2, Math.round(h * ar[i % ar.length]))
    const t = new THREE.CanvasTexture(createCanvas(w, h))
    t.image = { width: w, height: h }
    m.set('f' + i, t); TEXS.add(t)
  }
  const tira = new THREE.CanvasTexture(createCanvas(4, 4))
  tira.image = { width: 720, height: 6240 }
  m.set('tira', tira); TEXS.add(tira); texTira = tira
  return m
}
// Se guardan las texturas de prueba para reconocerlas despues: si una malla lleva una de estas, esta
// mostrando material del cliente, sin importar por que camino la haya puesto la escena.
const TEXS = new Set()
let texTira = null
const N_ELS = 12
const ROLES = ['logo', 'tarjeta', 'foto', 'cta', 'tarjeta', 'foto', 'cta', 'tarjeta', 'foto', 'tarjeta', 'foto', 'cta']
const ELS = Array.from({ length: N_ELS }, (_, i) => ({ rol: ROLES[i % ROLES.length], url: 'f' + i }))

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H), fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

const ids = readdirSync(HEROES).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.replace('.js', '')).sort()

async function auditar(id, juego, nombreAire) {
  configurar(AIRES[nombreAire])
  reiniciarReparto(); reiniciarRecortes(); configurarDatos(juego.datos)
  let mod
  try { mod = await import(pathToFileURL(join(HEROES, `${id}.js`)).href) } catch (e) { return { error: e.message } }
  if (!mod.meta || typeof mod.build !== 'function') return null

  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
  camera.position.set(0, 0, distBase)
  let s = 1
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  let r
  try {
    r = await mod.build({
      THREE, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
      fondo: { uT: { value: 0 }, uGrilla: { value: 0.55 }, uPulso: { value: 0 }, uA: { value: new THREE.Color(LOOK.bg) }, uB: { value: new THREE.Color(LOOK.bg2) } },
      pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
      bloom: { strength: 0.85, radius: 0.62, threshold: 0.62 },
      texturas: tejido(N_ELS), datosEls: ELS,
      spec: { tiraViewport: 1560 }, claro: false, repeticion: 0,
    })
  } catch (e) { return { error: `build lanzo — ${e.message}` } }
  if (!r || !r.g) return { error: 'no devolvio grupo' }
  if (r.vacia) return { vacia: true }

  const dur = (() => { try { return r.tl.duration() } catch { return 0 } })()
  const N = 24
  const caja = new THREE.Box3()
  let sumMallas = 0, sumImg = 0, sumCob = 0, sumMov = 0, muestra = false, instantes = 0
  let enShader = false
  let prev = null
  for (let i = 0; i <= N; i++) {
    if (dur > 0) { try { r.tl.time((i / N) * dur, false) } catch { /* sin tl */ } }
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    camera.updateProjectionMatrix()
    const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    let nM = 0, nI = 0, cob = 0
    const centros = []
    for (const raiz of [r.g, r.gr]) {
      if (!raiz) continue
      raiz.updateWorldMatrix(true, true)
      raiz.traverse(o => {
        if (!o.isMesh || !o.visible) return
        const mat = Array.isArray(o.material) ? o.material[0] : o.material
        if (mat && mat.opacity !== undefined && mat.opacity <= 0.02) return
        nM++
        const conMapa = (Array.isArray(o.material) ? o.material : [o.material]).some(x => x && x.map)
        if (conMapa) nI++
        // ¿ESTA MALLA SE MUEVE EN LA GPU? Si deforma por shader, este instrumento NO puede verlo: mide
        // posiciones de vertices en CPU y el GLSL no corre en Node. `gota` deformaba con
        // `onBeforeCompile` y media 0.0029 de movimiento —cuarenta veces menos que el resto— y no es
        // que estuviera quieta: su movimiento vive entero en la GPU. Es el mismo punto ciego que el
        // repo ya tiene anotado para los shaders. Se marca para que el numero no se lea como un
        // defecto.
        if (mat && (mat.isShaderMaterial || mat.userData?.shader || mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile)) enShader = true
        // `muestra` mira la TEXTURA y no solo `tipoImagen`. La primera version preguntaba por
        // `tipoImagen === 'recorte'`, que lo declara `planoRecorte`, y por eso decia "no" para
        // `telefono`, `ventana`, `portatil` —que dibujan la TIRA— y para `cubo`, que arma sus caras a
        // mano. Los cuatro muestran la pagina del cliente; el que no la veia era el instrumento.
        if (mat && mat.map && (mat.map === texTira || (o.userData && o.userData.tipoImagen === 'recorte')
          || TEXS.has(mat.map))) muestra = true
        caja.setFromObject(o)
        if (caja.isEmpty()) return
        // Caja proyectada: se toman los 8 vertices, se descartan los que estan DETRAS de la camara
        // (ahi la proyeccion se invierte y da numeros sin sentido) y se mide el rectangulo que ocupan.
        let x0 = 9, x1 = -9, y0 = 9, y1 = -9, ok = false
        for (let k = 0; k < 8; k++) {
          const v = new THREE.Vector3(
            k & 1 ? caja.max.x : caja.min.x, k & 2 ? caja.max.y : caja.min.y, k & 4 ? caja.max.z : caja.min.z)
          if (v.clone().applyMatrix4(camera.matrixWorldInverse).z > 0) continue
          const p = v.applyMatrix4(m)
          x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); ok = true
        }
        if (!ok) return
        // recortado al cuadro (-1..1 en las dos), y normalizado a fraccion de cuadro
        const w = Math.max(0, Math.min(1, x1) - Math.max(-1, x0)) / 2
        const h = Math.max(0, Math.min(1, y1) - Math.max(-1, y0)) / 2
        cob += w * h
        centros.push([(x0 + x1) / 2, (y0 + y1) / 2])
      })
    }
    sumMallas += nM; sumImg += nI; sumCob += Math.min(1, cob); instantes++
    if (prev && centros.length && prev.length) {
      const n = Math.min(prev.length, centros.length)
      let d = 0
      for (let k = 0; k < n; k++) d += Math.hypot(centros[k][0] - prev[k][0], centros[k][1] - prev[k][1]) / 2
      sumMov += d / Math.max(1, n)
    }
    prev = centros
  }
  return {
    mallas: sumMallas / instantes,
    conImagen: sumImg / instantes,
    cobertura: sumCob / instantes,
    movimiento: sumMov / Math.max(1, instantes - 1),
    muestra, dur, enShader,
  }
}

const AIRE = process.env.HERO_AIRE || Object.keys(AIRES)[0]
const filas = []
for (const id of ids) {
  const acc = { id, mallas: 0, conImagen: 0, cobertura: 0, movimiento: 0, muestra: false, enShader: false, vacias: 0, errores: [] }
  let n = 0
  for (const juego of JUEGOS) {
    const r = await auditar(id, juego, AIRE)
    if (!r) continue
    if (r.error) { acc.errores.push(`${juego.nombre}: ${r.error}`); continue }
    if (r.vacia) { acc.vacias++; continue }
    acc.mallas += r.mallas; acc.conImagen += r.conImagen
    acc.cobertura += r.cobertura; acc.movimiento += r.movimiento
    acc.muestra = acc.muestra || r.muestra
    acc.enShader = acc.enShader || r.enShader
    n++
  }
  if (n) { acc.mallas /= n; acc.conImagen /= n; acc.cobertura /= n; acc.movimiento /= n }
  acc.construidos = n
  filas.push(acc)
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ aire: AIRE, juegos: JUEGOS.map(j => j.nombre), filas }, null, 1))
} else {
  console.log(`AUDITORIA DE HEROES — aire "${AIRE}", ${JUEGOS.length} paginas reales, 25 instantes cada una`)
  console.log('  proxies geometricos, NO pixeles del video: sirven para comparar heroes entre si.\n')
  console.log(`  ${'hero'.padEnd(12)}${'ok'.padStart(4)}${'vacio'.padStart(6)}${'mallas'.padStart(8)}${'img'.padStart(6)}${'cobertura'.padStart(11)}${'movim'.padStart(8)}  muestra`)
  for (const f of [...filas].sort((a, b) => a.cobertura - b.cobertura)) {
    console.log(`  ${f.id.padEnd(12)}${String(f.construidos).padStart(4)}${String(f.vacias).padStart(6)}`
      + `${f.mallas.toFixed(1).padStart(8)}${f.conImagen.toFixed(1).padStart(6)}`
      + `${f.cobertura.toFixed(3).padStart(11)}${(f.enShader ? '  (gpu)' : f.movimiento.toFixed(4)).padStart(8)}  ${f.muestra ? 'SI' : 'no'}`)
  }
  const conErr = filas.filter(f => f.errores.length)
  if (conErr.length) {
    console.log('\n  NO SE PUDIERON CONSTRUIR:')
    for (const f of conErr) console.log(`    ${f.id}: ${f.errores[0]}`)
  }
  const vacios = filas.filter(f => f.vacias)
  if (vacios.length) {
    console.log('\n  DEVOLVIERON ESCENA VACIA en alguna pagina (puede ser correcto: sin material no se inventa):')
    for (const f of vacios) console.log(`    ${f.id}: ${f.vacias} de ${JUEGOS.length}`)
  }
}
