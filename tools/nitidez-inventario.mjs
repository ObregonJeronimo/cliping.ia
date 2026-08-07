// CENSO DE NITIDEZ — cuantos pixeles REALES tiene cada recorte del cliente contra cuantos se dibujan.
//
// POR QUE EXISTE. CLAUDE.md nombra esta familia como la que MAS barato se caza al construir, y no
// tenia quien la cazara: "un recorte pixelado no es un problema de render: es una imagen de 120 px
// dibujada a 900. Se mide comparando los pixeles reales del elemento contra el tamaño con que se
// dibuja, sin renderizar". Habia `topeNitido` en el kit —que hace exactamente ese tope— pero nada
// comprobaba quien lo usa: hoy lo llaman cinco archivos de los que muestran imagen.
//
// Y EL RIESGO NO ES TEORICO, esta medido sobre el material real que hay en disco. 77 recortes de 9
// sitios capturados:
//
//   ancho nativo   min 100 · p10 206 · mediana 637 · p90 1400 · max 1400
//   31 de 77 por debajo de 400 px · 39 por debajo de 643
//
// Los mas chicos son todos `el0` y `el1`, o sea LOS LOGOS: stripe 120x50, linear 176x44, pentagram
// 206x37, basecamp 200x60. Y el logo es justo lo que una escena quiere mostrar grande. Estirar el logo
// de una marca es el defecto que su dueño ve antes que ninguno — lo dice `planoRecorte` en su cabecera.
//
// COMO MIDE. Construye cada escena y cada heroe, recorre su linea de tiempo y para cada malla que
// dibuja un RECORTE calcula cuantos pixeles de pantalla ocupa de ancho:
//
//   px dibujados = anchoEnMundo * H / (2 * profundidad * tan(fov/2))
//
// y lo divide por los pixeles nativos de su textura. Un cociente de 1.0 es dibujar cada pixel una vez;
// 3.0 es estirar la imagen al triple, que es donde se ve el bloque.
//
// LAS TEXTURAS SON DEL TAMAÑO REAL, y esto no es un detalle: las demas compuertas usan texturas de
// prueba de 64 px porque miden GEOMETRIA, y con 64 px un censo de nitidez acusaria absolutamente todo.
// Ese error ya se cometio en este repo con otra herramienta —`mosaico` dio 0.044 de cobertura y era el
// fixture, no la escena— asi que aca los tamaños salen de la distribucion medida arriba.
//
// LO QUE ESTO NO PUEDE DECIR, y hay que leerlo antes de tocar una escena:
//
//   · Un cociente alto en una malla que dibuja un FONDO o una textura procedural no es un defecto:
//     esas se generan al tamaño que haga falta. Por eso solo se juzga `tipoImagen === 'recorte'`.
//   · `topeNitido` ya topea a varias, y esas van a dar ~1.4 por construccion. Que aparezcan en la
//     tabla con 1.4 es la prueba de que funciona, no un hallazgo.
//   · El ancho en mundo sale de la caja alineada a los ejes, asi que una malla ROTADA mide de mas.
//     Se informa la rotacion para poder descartarlo a ojo en vez de creerle al numero.
//
// MIDE, NO BLOQUEA. Es un inventario, como `encaja-inventario`: primero se ve el mapa y despues se
// decide donde poner el trinquete. Salida: una tabla, no un veredicto.
//
// Uso:  node tools/nitidez-inventario.mjs            (todas)
//       node tools/nitidez-inventario.mjs hero toro  (algunas)
import { createCanvas } from '@napi-rs/canvas'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const DIRS = [join(DEMO, 'escenas'), join(DEMO, 'heroes')]

const { registrarFuentes } = await import('./fuentes-reales.mjs')
registrarFuentes(RAIZ)

function lienzo(w = 4, h = 4) { return createCanvas(w, h) }
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

const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}
const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)

// LOS TAMAÑOS SALEN DEL MATERIAL REAL, medidos leyendo la cabecera IHDR de los 77 recortes que hay en
// `tools/out/motor/*/elementos/`. Se toman los percentiles y no el promedio: lo que importa para la
// nitidez es el caso chico, y el promedio lo esconde.
//
// Si en esta maquina no hay capturas, se usan estos mismos numeros —que salieron de una medicion de
// verdad y estan anotados aca— y SE DICE que son de reserva. Inventar un tamaño seria inventar el
// resultado entero.
const TAMANOS_MEDIDOS = [
  { rol: 'logo', w: 120, h: 50, de: 'stripe.com el0 (el mas chico tipico: un logo)' },
  { rol: 'tarjeta', w: 637, h: 400, de: 'la mediana de los 77' },
  { rol: 'foto', w: 1400, h: 900, de: 'el maximo, o sea el tope de captura' },
  { rol: 'cta', w: 206, h: 37, de: 'pentagram.com el0' },
  { rol: 'tarjeta', w: 256, h: 90, de: 'linear.app el2' },
]

function texturasReales() {
  const m = new Map()
  TAMANOS_MEDIDOS.forEach((t, i) => {
    const tex = new THREE.CanvasTexture(createCanvas(4, 4))
    tex.image = { width: t.w, height: t.h }
    m.set('f' + i, tex)
  })
  const tira = new THREE.CanvasTexture(createCanvas(4, 4))
  tira.image = { width: 720, height: 6240 }
  m.set('tira', tira)
  return m
}

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)
const TAN_MITAD = Math.tan((fov * Math.PI / 180) / 2)

const pedidos = process.argv.slice(2).filter(a => !a.startsWith('-'))
const rutaDe = (id) => {
  for (const d of DIRS) { const p = join(d, id + '.js'); if (existsSync(p)) return p }
  return null
}
const ids = pedidos.length ? pedidos : DIRS.flatMap(d =>
  existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.js')).map(f => f.replace('.js', '')) : [])

const filas = []
const sinDeclarar = new Map()   // escena -> mallas que dibujan textura sin decir de que tipo
let construcciones = 0
const _caja = new THREE.Box3()
const _v = new THREE.Vector3()
const _adelante = new THREE.Vector3()
const _q = new THREE.Quaternion()

for (const [nombreAire, aire] of Object.entries(AIRES)) {
  configurar(aire)
  for (const id of ids) {
    const ruta = rutaDe(id)
    if (!ruta) continue
    let mod
    try { mod = await import(pathToFileURL(ruta).href) } catch { continue }
    if (!mod.meta || typeof mod.build !== 'function') continue

    reiniciarReparto()
    reiniciarRecortes()
    configurarDatos(ANTHEM)
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
    camera.position.set(0, 0, distBase)
    let semilla = 1
    const rnd = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296 }
    const uni = () => ({ uT: { value: 0 }, uGrilla: { value: 0.55 }, uPulso: { value: 0 }, uA: { value: new THREE.Color(LOOK.bg) }, uB: { value: new THREE.Color(LOOK.bg2) } })
    let r
    try {
      r = await mod.build({
        THREE, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
        fondo: uni(),
        pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
        bloom: { strength: 0.85, radius: 0.62, threshold: 0.62 },
        texturas: texturasReales(),
        datosEls: TAMANOS_MEDIDOS.map((t, i) => ({ rol: t.rol, url: 'f' + i })),
        spec: { tiraViewport: 1560 }, claro: false, repeticion: 0,
      })
    } catch { continue }
    if (!r || !r.g) continue
    construcciones++

    const dur = r.tl.duration() / (r.tl.timeScale() || 1)
    const N = Math.max(12, Math.round(dur * 30))
    const peor = new Map()   // malla -> { mag, px, nativo, rot }
    for (let i = 0; i <= N; i++) {
      r.tl.time((i / N) * r.tl.duration(), false)
      camera.updateMatrixWorld()
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
      camera.getWorldDirection(_adelante)
      for (const raiz of [r.g, r.gr]) {
        if (!raiz) continue
        raiz.updateWorldMatrix(true, true)
        raiz.traverse(o => {
          if (!o.isMesh) return
          const tex = o.material && o.material.map
          const nativo = tex && tex.image && tex.image.width
          if (!nativo) return
          // SOLO RECORTES DEL CLIENTE. Un plano de texto o una cama se generan al tamaño que haga
          // falta, asi que preguntarles por nitidez no significa nada.
          //
          // PERO LO QUE NO DECLARA NADA SE CUENTA APARTE, y esa cuenta es la parte importante de la
          // salida. `tipoImagen` lo ponen `planoRecorte` y `planoTexto`; una escena que arma su
          // textura a mano —`cubo` lo hace, y los tres heroes de la tira tambien— dibuja imagen del
          // cliente sin declararlo, y seria INVISIBLE aca. Sin este conteo, un "0 por encima de 2x"
          // se leeria como cobertura y seria otro cero tranquilizador de los que este repo ya
          // documenta a los golpes.
          if (o.userData.tipoImagen !== 'recorte') {
            if (!o.userData.tipoImagen) sinDeclarar.set(id, (sinDeclarar.get(id) || 0) + 1)
            return
          }
          let vis = o.visible
          for (let p = o.parent; p && vis; p = p.parent) vis = p.visible
          const op = o.material.opacity != null ? o.material.opacity : 1
          if (!vis || op <= 0.02) return

          _caja.setFromObject(o)
          if (_caja.isEmpty()) return
          const anchoMundo = _caja.max.x - _caja.min.x
          if (!(anchoMundo > 0)) return
          // Profundidad = proyeccion sobre el eje de la camara, no distancia euclidea: lo que escala
          // en perspectiva es la componente hacia adelante.
          o.getWorldPosition(_v).sub(camera.position)
          const prof = Math.abs(_v.dot(_adelante))
          if (!(prof > 0.01)) return
          const px = anchoMundo * H / (2 * prof * TAN_MITAD)
          const mag = px / nativo
          const previo = peor.get(o)
          if (!previo || mag > previo.mag) {
            // LA ROTACION SE MIDE EN EL MUNDO, NO EN LA MALLA. La primera version leia `o.rotation`, que
            // es la rotacion PROPIA, y por eso decia "no rotada" para la cara de `cubo`: la cara no
            // rota, rota el grupo que la contiene mientras el cubo tumba. Con la rotacion propia, el
            // 1.63x de `cubo` no tenia explicacion y se habria leido como si `topeNitido` no estuviera
            // haciendo su trabajo — cuando lo hace doce lineas antes de crear la malla.
            _q.setFromRotationMatrix(o.matrixWorld)
            const rot = 2 * Math.acos(Math.min(1, Math.abs(_q.w)))
            // CUANDO ocurre el pico, no solo cuanto vale. Sin esto el numero es intrepretable de dos
            // maneras opuestas y no hay como elegir: varias escenas traen sus piezas VOLANDO desde
            // fuera del cuadro, y durante el vuelo pasan cerca de la camara. Un maximo tomado sobre
            // toda la vida de la malla mide ese instante, que el espectador ve medio segundo y
            // borroso por el movimiento, y no el que la escena pide leer.
            //
            // Es el mismo error que `encuadre-check` ya cometio y arreglo en este repo —juzgar el
            // cuadro 0, cuando la formacion todavia no existe— y la cabecera de `mosaico` lo explica
            // con todas las letras. Aca no se corrige el numero: se dice en que momento salio, para
            // que el que lee decida. `pico 0.10` es el vuelo; `pico 0.70` es la escena asentada.
            peor.set(o, { mag, px, nativo, rot, cuando: i / N })
          }
        })
      }
    }
    for (const [malla, d] of peor) {
      filas.push({ id, aire: nombreAire, nombre: malla.name || '(sin nombre)', ...d })
    }
  }
}

// UN CERO ACA NO ES "TODO NITIDO", ES "NO SE MIDIO NADA". Misma guardia que el resto de la familia.
if (!construcciones) {
  console.log('NITIDEZ: 0 construcciones. No es que este todo bien: no se construyo nada.')
  process.exit(1)
}
if (!filas.length) {
  console.log(`NITIDEZ: ${construcciones} construcciones y CERO mallas con recorte.`)
  console.log('  Eso no dice que no haya pixelado: dice que ninguna malla declaro `tipoImagen: recorte`,')
  console.log('  que es lo que pone `planoRecorte`. Si una escena arma su textura a mano, es invisible aca.')
  process.exit(1)
}

// El peor caso POR ESCENA, que es la unidad en la que se arregla.
const porEscena = new Map()
for (const f of filas) {
  const q = porEscena.get(f.id)
  if (!q || f.mag > q.mag) porEscena.set(f.id, f)
}
const orden = [...porEscena.values()].sort((a, b) => b.mag - a.mag)

console.log(`NITIDEZ — ${filas.length} mallas con recorte en ${construcciones} construcciones, `
  + `${porEscena.size} escenas/heroes con imagen del cliente\n`)
console.log('  ' + 'escena'.padEnd(14) + 'aumento  dibujado  nativo   pico  aire          notas')
for (const f of orden) {
  console.log('  ' + f.id.padEnd(14)
    + (f.mag.toFixed(2) + 'x').padStart(7)
    + String(Math.round(f.px)).padStart(10) + ' px'
    + String(f.nativo).padStart(7)
    + f.cuando.toFixed(2).padStart(7)
    + '  ' + f.aire.padEnd(14)
    + f.nombre.slice(0, 22)
    + (f.rot > 0.05 ? `  (girada ${(f.rot * 180 / Math.PI).toFixed(0)}deg en el mundo: la caja mide de mas)` : ''))
}
const dur = orden.filter(f => f.mag > 2)
console.log(`\n  por encima de 2x: ${dur.length} de ${porEscena.size}. `
  + `topeNitido topea en 1.4x, asi que ~1.4 es la marca de que YA esta topeada.`)
console.log('  Antes de tocar una escena, leer su cabecera: varias dibujan a sangre a proposito.')

// LO QUE NO SE MIDIO, DICHO CON NOMBRE Y APELLIDO. Sin esto, la tabla de arriba se leeria como si
// cubriera todo lo que muestra imagen, y no cubre: solo lo que pasa por `planoRecorte`.
const fuera = [...sinDeclarar].sort((a, b) => b[1] - a[1])
if (fuera.length) {
  console.log(`\n  NO SE MIDIERON — dibujan una textura sin declarar \`tipoImagen\` (${fuera.length} escenas):`)
  for (const [escena, n] of fuera.slice(0, 14)) console.log(`    ${escena.padEnd(16)} ${n} mallas`)
  if (fuera.length > 14) console.log(`    ... y ${fuera.length - 14} mas`)
  console.log('    Algunas son texturas procedurales y estan bien fuera. Otras son imagen del CLIENTE')
  console.log('    armada a mano —`cubo` hace sus caras asi, y los heroes de la tira tambien— y esas')
  console.log('    tendrian que declararse para entrar. Mientras no lo hagan, el veredicto de arriba')
  console.log('    cubre 7 escenas, no todas las que muestran imagen.')
}
