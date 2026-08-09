// SONDA DE ENCUADRE — cuando E-ENCAJE-REAL dice "se sale 1.18", esto dice POR QUE.
//
// POR QUE EXISTE. La compuerta contesta si una malla se sale, y con eso alcanza para saber que hay un
// problema. No alcanza para arreglarlo: una malla puede salirse porque se construyo grande, porque
// algo la escala despues, porque gira —y la caja alineada a los ejes mide de mas—, porque la camara se
// acerco o porque la escena la manda fuera de cuadro a proposito. Son cinco arreglos distintos y el
// numero es el mismo.
//
// Esto separa las cinco causas midiendo, en el instante PEOR de cada malla:
//
//   recorte   cuanto se sale, en coordenadas de recorte. 1.0 es el borde. ES EL MISMO NUMERO que
//             informa la compuerta, asi que se puede cruzar directo con su salida.
//   geomW     el ancho con el que se CONSTRUYO. Si ya es mayor que el cuadro, el defecto es de
//             dimensionado y no hay animacion que lo explique.
//   esc       la escala de MUNDO en ese instante — incluye a todos los ancestros. Si es > 1, algo la
//             agranda despues de construirla.
//   giro      cuanto esta girada en el mundo. La caja alineada a los ejes de una malla girada mide de
//             mas, asi que un `recorte` alto con giro alto puede ser del instrumento y no de la escena.
//   camara    cuanto se acerco respecto del reposo, y cuanto aporta eso.
//   t         EN QUE MOMENTO del tramo pasa. 0.05 es la entrada, 0.95 la salida, 0.5 la escena
//             asentada. Esto solo ya decide si mirar el dimensionado o el gesto.
//
// EL ORDEN ES POR RECORTE, Y ESO NO ES UN DETALLE. La primera version de esta sonda ordenaba por
// nitidez (`px dibujados / pixeles nativos`), que era la pregunta para la que se habia escrito. Usada
// para una pregunta de ENCUADRE eligio otra malla —con texturas de texto, que miden miles de pixeles,
// el orden por nitidez nunca elige la que la compuerta acusa— y reporte su escala como si fuera la de
// la malla que fallaba. Un dato falso con cara de medicion, escrito en un comentario de una escena.
// Se corrigio; el orden ahora es el mismo criterio que usa la compuerta.
//
// Uso:  node tools/encuadre-sonda.mjs cierre           (todas las mallas `encaja` de una escena)
//       node tools/encuadre-sonda.mjs cierre --todas   (tambien las que NO declaran nada)
import { createCanvas } from '@napi-rs/canvas'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const { registrarFuentes } = await import(pathToFileURL(join(RAIZ, 'tools', 'fuentes-reales.mjs')).href)
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
const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}
const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)

// EL MESH ESPIA, igual que en `encuadre-check --ENCUADRE_ORIGEN` y en `encaja-inventario`: sin esto la
// salida dice "una malla" y hay que adivinar cual, que es exactamente lo que esta sonda viene a evitar.
class MeshEspia extends THREE.Mesh {
  constructor(...a) {
    super(...a)
    const st = (new Error().stack || '').split('\n').slice(2)
    const d = st.filter(l => /render3d[\\/]demo[\\/]/.test(l)).slice(0, 2)
      .map(l => { const m = l.match(/render3d[\\/]demo[\\/](.+?):(\d+):\d+/); return m ? `${m[1].replace(/\\/g, '/')}:${m[2]}` : null })
      .filter(Boolean)
    if (d.length) this.userData._origen = d.join(' <- ')
  }
}
const THREE_ESC = { ...THREE, Mesh: MeshEspia }

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

const args = process.argv.slice(2)
const TODAS = args.includes('--todas')
const QUIEN = args.find(a => !a.startsWith('--'))
if (!QUIEN) { console.error('uso: node tools/encuadre-sonda.mjs <escena|hero> [--todas]'); process.exit(2) }
const RUTA = ['heroes', 'escenas'].map(d => join(DEMO, d, QUIEN + '.js')).find(p => existsSync(p))
if (!RUTA) { console.error(`no existe la escena/hero "${QUIEN}"`); process.exit(2) }
const mod = await import(pathToFileURL(RUTA).href)

const _caja = new THREE.Box3()
const _pos = new THREE.Vector3(); const _q = new THREE.Quaternion(); const _esc = new THREE.Vector3()
const _v = new THREE.Vector3()

const filas = []
for (const [nombreAire, aire] of Object.entries(AIRES)) {
  configurar(aire)
  reiniciarReparto(); reiniciarRecortes(); configurarDatos(ANTHEM)
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
  camera.position.set(0, 0, distBase)
  let s = 1
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const uni = () => ({ uT: { value: 0 }, uGrilla: { value: 0.55 }, uPulso: { value: 0 }, uA: { value: new THREE.Color(LOOK.bg) }, uB: { value: new THREE.Color(LOOK.bg2) } })
  const texturas = new Map()
  for (let i = 0; i < 6; i++) { const t = new THREE.CanvasTexture(createCanvas(4, 4)); t.image = { width: 700, height: 400 }; texturas.set('f' + i, t) }
  { const t = new THREE.CanvasTexture(createCanvas(4, 4)); t.image = { width: 720, height: 6240 }; texturas.set('tira', t) }
  let r
  try {
    r = await mod.build({
      THREE: THREE_ESC, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
      fondo: uni(),
      pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
      bloom: { strength: 0.85, radius: 0.62, threshold: 0.62 },
      texturas, datosEls: Array.from({ length: 6 }, (_, i) => ({ rol: ['logo', 'tarjeta', 'foto', 'cta', 'tarjeta', 'foto'][i], url: 'f' + i })),
      spec: { tiraViewport: 1560 }, claro: false, repeticion: 0,
    })
  } catch (e) { console.log(`${nombreAire}: no construyo — ${e.message}`); continue }
  if (!r || !r.g) continue

  const dur = r.tl.duration()
  const N = Math.max(12, Math.round((dur / (r.tl.timeScale() || 1)) * 30))
  const peor = new Map()
  for (let i = 0; i <= N; i++) {
    r.tl.time((i / N) * dur, false)
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    camera.updateProjectionMatrix()
    const M = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    for (const raiz of [r.g, r.gr]) {
      if (!raiz) continue
      raiz.updateWorldMatrix(true, true)
      raiz.traverse(o => {
        if (!o.isMesh) return
        if (!TODAS && !o.userData.encaja) return
        let vis = o.visible
        for (let p = o.parent; p && vis; p = p.parent) vis = p.visible
        const op = o.material && !Array.isArray(o.material) && o.material.opacity != null ? o.material.opacity : 1
        if (!vis || op <= 0.02) return
        _caja.setFromObject(o)
        if (_caja.isEmpty()) return
        // EL MISMO CRITERIO QUE LA COMPUERTA: los 8 vertices de la caja proyectados, descartando los
        // que caen DETRAS de la camara —ahi la proyeccion se invierte y da numeros sin sentido— y se
        // toma el |x| o |y| mas grande en coordenadas de recorte.
        let ext = 0, algo = false
        for (let k = 0; k < 8; k++) {
          _v.set(k & 1 ? _caja.max.x : _caja.min.x, k & 2 ? _caja.max.y : _caja.min.y, k & 4 ? _caja.max.z : _caja.min.z)
          const w = _v.x * M.elements[3] + _v.y * M.elements[7] + _v.z * M.elements[11] + M.elements[15]
          if (w <= 0.0001) continue
          _v.applyMatrix4(M)
          ext = Math.max(ext, Math.abs(_v.x), Math.abs(_v.y))
          algo = true
        }
        if (!algo) return
        const previo = peor.get(o)
        if (previo && previo.ext >= ext) return
        o.matrixWorld.decompose(_pos, _q, _esc)
        const prof = Math.abs(_pos.z - camera.position.z)
        peor.set(o, {
          ext, cuando: i / N,
          geomW: o.geometry.parameters ? o.geometry.parameters.width : null,
          esc: _esc.x,
          giro: 2 * Math.acos(Math.min(1, Math.abs(_q.w))) * 180 / Math.PI,
          camZ: camera.position.z, prof,
          origen: o.userData._origen || '(lo crea el kit)',
          marca: [o.userData.encaja && 'encaja', o.userData.sangra && 'sangra',
            o.userData.encajaEntre && 'entre'].filter(Boolean).join('+') || '-',
        })
      })
    }
  }
  for (const [, d] of peor) filas.push({ aire: nombreAire, ...d })
}

if (!filas.length) {
  console.log(`SONDA ${QUIEN}: 0 mallas. ${TODAS ? 'La escena no construyo nada.' : 'Ninguna declara `encaja` — probá con --todas.'}`)
  process.exit(1)
}

// Se agrupa por ORIGEN: la misma malla vista en once aires es una fila, no once.
const porOrigen = new Map()
for (const f of filas) {
  const q = porOrigen.get(f.origen)
  if (!q || f.ext > q.ext) porOrigen.set(f.origen, f)
}
const orden = [...porOrigen.values()].sort((a, b) => b.ext - a.ext)

console.log(`SONDA DE ENCUADRE — ${QUIEN}, ${porOrigen.size} mallas distintas en ${Object.keys(AIRES).length} aires`)
console.log('  "recorte" es el mismo numero que informa E-ENCAJE-REAL: 1.0 es el borde del cuadro.\n')
console.log('  recorte  geomW    esc   giro   camZ    t     marca      origen')
for (const f of orden) {
  console.log('  ' + f.ext.toFixed(3).padStart(7)
    + (f.geomW == null ? '     -' : f.geomW.toFixed(2).padStart(7))
    + f.esc.toFixed(3).padStart(7)
    + (f.giro.toFixed(0) + '°').padStart(6)
    + f.camZ.toFixed(2).padStart(8)
    + f.cuando.toFixed(2).padStart(6)
    + '  ' + f.marca.padEnd(10)
    + ' ' + f.origen + '  [' + f.aire + ']')
}
const fuera = orden.filter(f => f.ext > 1.0)
console.log(`\n  por encima de 1.0: ${fuera.length} de ${porOrigen.size}.`)
console.log('  Como leerlo: si `t` esta cerca de 0 o de 1, es el gesto de entrada o de salida y lo que')
console.log('  corresponde es `encajaEntre`, no achicar nada. Si `esc` > 1, algo la agranda despues de')
console.log('  construirla. Si `giro` es alto, la caja alineada a los ejes mide de mas y el numero')
console.log('  exagera. Si `camZ` esta bien por debajo del reposo, el cuadro se angosto y la medida se')
console.log(`  tomo contra el de reposo — ahi el arreglo es \`cuadroMasAngosto\` (reposo ${distBase.toFixed(2)}).`)
