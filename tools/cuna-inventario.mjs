// HERRAMIENTA — que textos caen en la franja donde puede llegar la cuña, y cuales NO tienen cama.
//
// NO ES UNA COMPUERTA Y NO DEBE SERLO: su salida es una lista de CANDIDATOS, no de defectos. Lo dice
// la seccion de la cuña en docs/ESCENAS-AUDIT.md con todas las letras — "40 no son 40 defectos" — y
// esta herramienta existe justamente para no volver a confundir las dos cosas.
//
// EL PROBLEMA. El fondo del mundo claro dibuja una cuña de acento en la esquina inferior derecha, y su
// comentario en kit.js declara el supuesto sobre el que esta construida: "LA DIAGONAL VA POR DEBAJO DE
// LA BANDA DE TIPOGRAFIA". Sobre ese supuesto se eligieron sus coeficientes. Pero 11 de las 20 escenas
// ponen texto adentro de esa franja, asi que el supuesto no se cumple — y donde no se cumple, el texto
// pierde contraste. Medido sobre pixeles en dos escenas: el titular de `toro` daba 1.11:1 y el dominio
// del cliente en `cierre` 1.77:1, contra un piso de 3.2 en mundo claro. Las dos ya estan arregladas con
// cama; las otras nueve estaban medidas y sin verificar, y no habia forma barata de saber cuales.
//
// POR QUE LA FRANJA ES UN SOBRE Y NO LA CUÑA EXACTA. Reproducir el shader aca —con su `donde` que salta
// cada dos beats entre cuatro valores, y el factor de mapeo que se corre cuando la camara hace dolly—
// seria copiar una cuenta que puede desincronizarse, que es el error que este repo ya pago tres veces
// con listas escritas a mano. En vez de eso se toma el SOBRE: la posicion mas alta que la cuña puede
// alcanzar con su `donde` mas chico. Eso hace que la lista sea un SUPERCONJUNTO:
//
//   · lo que NO aparece aca esta a salvo, seguro.
//   · lo que aparece HAY QUE MIRARLO — puede estar sobre la parte clara del cuadro igual.
//
// Un sobre de mas es barato; una cuenta desincronizada que deja pasar un texto ilegible, no.
//
// Uso:  node tools/cuna-inventario.mjs
import { createCanvas } from '@napi-rs/canvas'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')

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
const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)
// LAS DORMIDAS SE MARCAN, no se cuentan como pendientes. `columna` y `contraste` estan registradas y
// pasan las compuertas, pero el guion las tiene FUERA DEL SORTEO: no salen en ninguna pieza. La primera
// corrida de esta herramienta puso a `columna` primera en el ranking —texto al 0% del alto, el mas
// hondo de las veinte escenas— y eso habria mandado a arreglar algo que ningun espectador ve. Se
// descubrio buscandole una semilla para verificarla y no encontrandola en 120 guiones.
// Se lee de `guion.js` y no se copia: una lista repetida se desincroniza el dia que alguien despierta
// una escena, y entonces el pendiente real quedaria escondido detras de una etiqueta vieja.
const { DORMIDAS } = await import(pathToFileURL(join(DEMO, 'guion.js')).href)

const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov / 2) * Math.PI / 180)

function tejidoFalso(relaciones) {
  const m = new Map()
  relaciones.forEach((ar, i) => {
    const h = 64, w = Math.max(2, Math.round(h * ar))
    const t = new THREE.CanvasTexture(createCanvas(w, h))
    t.image = { width: w, height: h }
    m.set('f' + i, t)
  })
  const tira = new THREE.CanvasTexture(createCanvas(4, 4))
  tira.image = { width: 720, height: 6240 }
  m.set('tira', tira)
  return m
}

// EL SOBRE DE LA CUÑA, derivado del shader y no copiado de el.
//
// kit.js: `dg = (f.x * 0.35 + (1 - f.y) * 1.15) - donde`, y hay cuña donde `dg > 0`. `donde` toma cada
// dos beats uno de cuatro valores: 1.05 + k*0.055 - 0.08 con k en 0..3, o sea de 0.97 a 1.135. El sobre
// es el `donde` MAS CHICO (0.97), que es cuando la cuña sube mas.
//
//   en el borde izquierdo (f.x = 0):  1 - f.y = 0.970 / 1.15 = 0.843  ->  f.y = 0.157
//   en el borde derecho  (f.x = 1):  1 - f.y = 0.620 / 1.15 = 0.539  ->  f.y = 0.461
//
// O sea que la cuña puede llegar hasta el 15.7% del alto sobre la izquierda y el 46.1% sobre la
// derecha, contando desde abajo. En NDC (y de -1 abajo a +1 arriba) eso es una recta.
const DONDE_MIN = 1.05 - 0.08
const techoUV = (fx) => 1 - (DONDE_MIN - fx * 0.35) / 1.15     // f.y del borde de la cuña
const enCuna = (ndcX, ndcY) => {
  const fx = (ndcX + 1) / 2, fy = (ndcY + 1) / 2
  return fy <= techoUV(Math.min(1, Math.max(0, fx)))
}

// ---- las mallas de texto se reconocen por la TEXTURA, que es lo unico que las dos familias comparten.
//
// `planoTexto` marca la malla con `userData.tipoImagen = 'texto'`, pero el texto por MASCARA —el de 19
// de las 20 escenas— no marca nada: cada escena tiene su propio `textoMascara` local y el primitivo
// compartido es `materialMascara`, que devuelve un material y no una malla. Filtrar por `tipoImagen`
// perderia casi todo, que es exactamente el punto ciego que en esta sesion hizo fallar cinco censos
// distintos. Lo que si comparten las dos familias es que la textura sale de `texto()`, y esa se declara
// con `userData.esTexto` (kit.js:988).
const mapaDe = (o) => {
  const m = o.material
  if (!m || Array.isArray(m)) return null
  if (m.uniforms && m.uniforms.map && m.uniforms.map.value) return m.uniforms.map.value
  return m.map || null
}
const esTexto = (o) => { const t = mapaDe(o); return !!(t && t.userData && t.userData.esTexto) }

// ---- una cama es una malla OPACA, DETRAS, que contiene la caja del texto
const opacidadDe = (o) => {
  const m = o.material
  if (!m || Array.isArray(m)) return 0
  if (m.uniforms && m.uniforms.uAlfa && typeof m.uniforms.uAlfa.value === 'number') return m.uniforms.uAlfa.value
  return typeof m.opacity === 'number' ? m.opacity : 1
}

const _caja = new THREE.Box3()
const _v = new THREE.Vector3()
function cajaNDC(obj, m) {
  _caja.setFromObject(obj)
  if (_caja.isEmpty()) return null
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? _caja.max.x : _caja.min.x, i & 2 ? _caja.max.y : _caja.min.y, i & 4 ? _caja.max.z : _caja.min.z)
    _v.applyMatrix4(m)
    x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x)
    y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y)
  }
  return { x0, x1, y0, y1, z: _caja.min.z }
}

const rutaDe = (id) => join(DEMO, 'escenas', id + '.js')
const ids = readdirSync(join(DEMO, 'escenas'))
  .filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.replace(/\.js$/, '')).sort()

// EL MUNDO CLARO SE FUERZA, no se busca entre los aires. `CLARO` no es una propiedad del aire: lo
// inyecta el motor a partir de la PALETA DE LA PAGINA (`configurar` hace `CLARO = !!aire.claro`, y
// ningun archivo de aires/ declara esa clave). Buscar "los aires claros" devolvia CERO y el barrido
// salia vacio informando que no habia nada que revisar — un falso verde perfecto.
//
// Lo correcto es medir LOS ONCE aires como si la pagina fuera clara, que es justamente el caso en el
// que la cuña existe. Cualquier aire puede tocarle a una pagina de fondo blanco.
const filas = []
const rotos = []
for (const [nomAire, aire] of Object.entries(AIRES)) {
  configurar({ ...aire, claro: true })
  for (const id of ids) {
    if (!existsSync(rutaDe(id))) continue
    let mod
    try { mod = await import(pathToFileURL(rutaDe(id)).href) } catch { continue }
    if (!mod.meta || typeof mod.build !== 'function') continue
    reiniciarReparto(); reiniciarRecortes(); configurarDatos(ANTHEM)
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
        texturas: tejidoFalso([2.4, 1.0, 0.6, 3.4, 1.35]),
        datosEls: [{ rol: 'logo', url: 'f0' }, { rol: 'tarjeta', url: 'f1' }, { rol: 'foto', url: 'f2' },
          { rol: 'cta', url: 'f3' }, { rol: 'tarjeta', url: 'f4' }],
        spec: { tiraViewport: 1560 }, claro: true, repeticion: 0,
      })
    } catch (e) {
      if (/skia surface|out of memory|heap out of memory/i.test(e.message || '')) {
        console.error(`NO SE PUDO MEDIR — se acabo la memoria construyendo "${id}" en ${nomAire}.`)
        console.error('  Es la fuga de `texto()`, no un defecto de la escena. Corre de nuevo con la maquina despejada.')
        process.exit(2)
      }
      rotos.push(`${id} en ${nomAire}: ${e.message}`); continue
    }
    const raiz = r && (r.g || r.grupo || r)
    if (!raiz || !raiz.traverse) continue

    // SE MIDE CON LA ESCENA MONTADA, NO EN t=0, y esto invalidaba el barrido entero.
    //
    // La primera version media el estado recien construido. Ahi casi nada esta en su lugar: los textos
    // por mascara tienen `uProg` en 0 (no se dibujan todavia) y las camas que entran animadas estan
    // colapsadas — la de `cierre` arranca en `scale.x = 0.0001` a proposito, asi que su propia cama se
    // leia como AUSENTE y la escena aparecia con 33 textos sin cama. O sea que el arreglo que acababa
    // de verificar sobre pixeles salia acusado por esta herramienta.
    //
    // Y CON UN SOLO INSTANTE TAMPOCO ALCANZA, que fue el segundo intento. A mitad de `cierre` el pie
    // todavia no aterrizo: sus marcas llegan en el beat 3.2 de 6, o sea al 53% del tramo, y la cama
    // recien esta creciendo. Seguian saliendo 29 sin cama por la misma razon, solo que mas tarde.
    //
    // Se muestrean tres momentos y cada texto se juzga por su MEJOR caso: si en alguno tuvo cama, la
    // tiene. Es lo correcto porque la pregunta es si la escena PREVE una cama para ese texto, no si la
    // tiene puesta en un cuadro cualquiera — durante la entrada y la salida no tenerla es lo normal.
    // Y de la POSICION se guarda el peor caso, o sea el momento en que mas se mete en la cuña.
    const m = new THREE.Matrix4()
    const estado = new Map()
    for (const p of [0.40, 0.55, 0.72]) {
      if (r.tl && typeof r.tl.progress === 'function') {
        try { r.tl.progress(p) } catch { /* una timeline que no acepta seek se mide como este */ }
      }
      camera.updateMatrixWorld(true); raiz.updateMatrixWorld(true)
      m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      const textos = [], camas = []
      raiz.traverse(o => {
        if (!o.isMesh || !o.geometry) return
        const c = cajaNDC(o, m)
        if (!c) return
        if (esTexto(o)) textos.push({ o, c })
        else if (opacidadDe(o) >= 0.8) camas.push({ o, c })
      })
      for (const t of textos) {
        // Toca la franja si CUALQUIERA de sus dos esquinas de abajo cae adentro del sobre.
        if (!(enCuna(t.c.x0, t.c.y0) || enCuna(t.c.x1, t.c.y0))) continue
        // LA CONTENCION SE MIDE SOBRE LO QUE ESTA EN PANTALLA, recortando las dos cajas al cuadro.
        //
        // Sin recortar, cualquier texto MAS ANCHO que el cuadro sale acusado aunque su cama lo cubra
        // entero de punta a punta. Lo encontro `marquesina`: sus dos cintas son camas opacas —y su
        // propio archivo documenta que se pusieron justamente para arreglar un 1.05:1 medido— pero las
        // frases se desplazan en bucle, asi que la caja de cada una se extiende bastante afuera del
        // cuadro y la prueba de contencion fallaba. 22 acusaciones sobre una escena YA ARREGLADA.
        //
        // Es el mismo error de forma que `encuadre-check` documenta al reves ("interseccion caja-frustum,
        // no contencion de vertices"): la pregunta correcta no es sobre la geometria completa sino sobre
        // la parte que se ve.
        const rec = (c) => ({ x0: Math.max(-1, c.x0), x1: Math.min(1, c.x1), y0: Math.max(-1, c.y0), y1: Math.min(1, c.y1) })
        const tv = rec(t.c)
        const cama = camas.some(k => {
          const kv = rec(k.c)
          return kv.x0 <= tv.x0 + 1e-3 && kv.x1 >= tv.x1 - 1e-3 &&
            kv.y0 <= tv.y0 + 1e-3 && kv.y1 >= tv.y1 - 1e-3 &&
            (k.o.renderOrder < t.o.renderOrder || k.c.z <= t.c.z + 1e-6)
        })
        const prev = estado.get(t.o)
        if (!prev) estado.set(t.o, { c: t.c, cama })
        else { if (cama) prev.cama = true; if (t.c.y0 < prev.c.y0) prev.c = t.c }
      }
    }
    for (const [, t] of estado) {
      const tieneCama = t.cama
      // CUANTO SE METE, no solo si toca. Un texto cuyo borde inferior queda al 45% del alto roza el
      // sobre y solo del lado derecho —donde la cuña llega mas arriba— y lo mas probable es que este
      // sobre la parte clara. Uno al 8% esta en el corazon de la cuña, que es donde estaban los dos
      // defectos confirmados: el pie de `cierre` vive al 8% y el titular de `toro` al 22%. Sin este
      // numero la lista son 279 renglones iguales y no se sabe por cual empezar.
      const alturaPct = (t.c.y0 + 1) / 2 * 100
      // Y CUANTO DEL ANCHO OCUPA DEL LADO DONDE LA CUÑA ES MAS ALTA: la cuña sube hacia la derecha, asi
      // que un texto pegado a la izquierda casi no la toca aunque este bajo.
      const derecha = (t.c.x1 + 1) / 2 * 100
      filas.push({ id, aire: nomAire, cama: tieneCama, alturaPct, derecha })
    }
  }
}

// ---- informe
const claros = Object.keys(AIRES)
console.log(`\nTEXTOS EN EL SOBRE DE LA CUÑA — ${ids.length} escenas x ${claros.length} aires, todos forzados a mundo CLARO\n`)
const porEscena = new Map()
for (const f of filas) {
  const e = porEscena.get(f.id) || { total: 0, sin: 0, hondo: 100, derecha: 0, aires: new Set() }
  e.total++
  if (!f.cama) {
    e.sin++; e.aires.add(f.aire)
    if (f.alturaPct < e.hondo) { e.hondo = f.alturaPct; e.derecha = f.derecha }
  }
  porEscena.set(f.id, e)
}
const P = (v, n) => String(v).padEnd(n)
const D = (v, n) => String(v).padStart(n)
console.log('  ' + P('escena', 13) + D('franja', 7) + D('SIN cama', 10) + D('el mas hondo', 14) + '  llega hasta')
let totalSin = 0, dormidasSin = 0
const orden = [...porEscena.entries()].sort((a, b) => a[1].hondo - b[1].hondo || b[1].sin - a[1].sin)
for (const [id, e] of orden) {
  const durmiendo = DORMIDAS.has(id)
  if (durmiendo) dormidasSin += e.sin; else totalSin += e.sin
  console.log('  ' + P(id + (durmiendo ? ' (dormida)' : ''), 13) + D(e.total, 7) + D(e.sin, 10) +
    D(e.sin ? e.hondo.toFixed(0) + '% del alto' : '—', 14) +
    (e.sin ? '  x hasta ' + e.derecha.toFixed(0) + '%' : ''))
}
console.log(`\n  ${filas.length} textos en la franja; ${totalSin} sin cama en escenas que SE DESPACHAN` +
  (dormidasSin ? `, y ${dormidasSin} mas en dormidas (no salen en ninguna pieza: ${[...DORMIDAS].join(', ')})` : '') + '.')
console.log('  Ordenado por el MAS HONDO, que es por donde hay que empezar: los dos defectos ya')
console.log('  confirmados sobre pixeles estaban al 8% (`cierre`, 1.77:1) y al 22% (`toro`, 1.11:1).')
if (rotos.length) {
  console.log(`\n  ${rotos.length} construcciones no se pudieron medir:`)
  for (const r of rotos.slice(0, 6)) console.log('    ' + r)
}
console.log('\n  ESTO NO ES UNA LISTA DE DEFECTOS. La franja es un SOBRE: adentro entra tambien la parte')
console.log('  clara del cuadro. Un texto de aca puede estar perfectamente legible — hay que abrir el')
console.log('  cuadro y medirlo, como se hizo con `toro` (1.11:1, era defecto) y `cierre` (1.77:1, era')
console.log('  defecto). Lo que SI dice la lista es que fuera de ella no hay nada que revisar.\n')
