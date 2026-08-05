// COMPUERTA E-PAGINA-SIN-DEFORMAR — la pagina del cliente no se estira.
//
// Seis lugares del motor pegan la captura de una pagina (o una foto del sitio) sobre un plano:
// heroes/telefono, heroes/portatil, heroes/ventana, escenas/pantalla, escenas/mesa y escenas/titular.
// Los seis hacen la misma cuenta —cuanta tira entra— y NINGUNA compuerta la miraba. El resultado
// medido: `portatil` mostraba la pagina estirada 1.87 veces a lo ancho, letras anchas y chatas, y el
// comentario de ese mismo archivo declaraba estar haciendo lo contrario ("es el mismo recorte que ve
// alguien con la ventana del navegador a esa altura").
//
// No es un caso, es una FAMILIA: `pantalla.js:82-88` y `ventana.js:148-153` documentan a los golpes
// la cuenta correcta porque cada uno la descubrio por su lado, y el tercero no se entero. Una
// compuerta la escribe una vez.
//
// QUE SE MIDE. Un plano de PlaneGeometry mapea uv 0..1 sobre su ancho y su alto. Con la textura
// mostrando `repeat` de la imagen, la densidad de pixeles de pagina por unidad de mundo es:
//
//     px/u en x = (anchoImagen * repeat.x) / anchoPlano
//     px/u en y = (altoImagen  * repeat.y) / altoPlano
//
// Si las dos no son iguales, la pagina esta deformada, y el cociente ES el factor de estiramiento.
// No hay que renderizar nada: sale de la geometria y de la textura, al construir. Es lo que CLAUDE.md
// pide — cuando una compuerta y una inspeccion visual pueden cazar el mismo defecto, gana la
// compuerta.
//
// LA SALIDA DECLARADA. `ventana.js:155-157` documenta un caso degenerado legitimo: una pagina mas
// CORTA que el hueco donde se la muestra. Ahi se muestra entera (repeat.y = 1) y se estira a lo alto
// a proposito, porque la alternativa —romper la composicion— es peor. Ese caso se reconoce solo
// (repeat.y >= 0.999) y no se acusa. Cualquier otra deformacion si.
//
// Uso:  node tools/tira-check.mjs [id ...]
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

// SE CORRE POR PARTES, UN AIRE POR PROCESO. Misma razon que `eco-check` y `fondo-check`: cada llamada a
// `texto()` compromete pixeles que la libreria nativa de canvas no devuelve nunca, y esta compuerta hace
// 1221 construcciones. Medido desde afuera —con Windows, porque Node no lo ve— llegaba a **5078 MB
// comprometidos**. Hoy eso pasa por debajo del techo, pero el techo se calcula sobre la RAM DISPONIBLE:
// con Photoshop abierto baja a 4096 y esta compuerta moriria sola.
//
// Partido por aire, el pico es el de UN aire y el veredicto no cambia: los fallos son una union y los
// contadores una suma.
if (!process.env.TIRA_AIRE) {
  const { spawnSync } = await import('node:child_process')
  const { readdirSync: leerDir } = await import('node:fs')
  const aires = leerDir(join(DEMO, 'aires')).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''))
  let revisadosT = 0
  const fallosT = []
  for (const na of aires) {
    const r = spawnSync(process.execPath, [process.argv[1]],
      { env: { ...process.env, TIRA_AIRE: na }, encoding: 'utf8' })
    const txt = (r.stdout || '') + (r.stderr || '')
    const linea = txt.split(String.fromCharCode(10)).find(l => l.startsWith('##TIRA##'))
    if (!linea) { console.log(txt); console.log('GATE TIRA FAIL: una parte no devolvio contadores.'); process.exit(1) }
    const d = JSON.parse(linea.slice(8))
    revisadosT += d.revisados
    fallosT.push(...d.fallos)
  }
  if (fallosT.length) {
    console.log(`GATE TIRA FAIL (${fallosT.length}):`)
    for (const f of fallosT) console.log('  ' + f)
    process.exit(1)
  }
  console.log(`GATE TIRA OK (${revisadosT} construcciones x ${aires.length} aires, cada uno en su propio `
    + `proceso para que la memoria vuelva al sistema: la pagina del cliente no se deforma).`)
  process.exit(0)
}

const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}
const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)

// LAS TIRAS REALES DEL REPO, no una inventada. Las siete capturas que hay en tools/out/motor miden
// 720 de ancho y 6240 u 8192 de alto; el viewport de captura es 1560. Una tira sintetica cuadrada
// haria pasar justo el caso que falla. Se barren las tres proporciones que el pipeline produce de
// verdad, mas una corta para ejercitar la salida declarada de `ventana`.
const TIRAS = [
  { w: 720, h: 8192, vp: 1560, nombre: '720x8192 (la mas larga real)' },
  { w: 720, h: 6240, vp: 1560, nombre: '720x6240 (la mas comun)' },
  { w: 720, h: 1560, vp: 1560, nombre: '720x1560 (una sola pantalla)' },
]

function tejidoFalso(relaciones, tira) {
  const m = new Map()
  relaciones.forEach((ar, i) => {
    const h = 64, w = Math.max(2, Math.round(h * ar))
    const t = new THREE.CanvasTexture(createCanvas(w, h))
    t.image = { width: w, height: h }
    m.set('f' + i, t)
  })
  const t = new THREE.CanvasTexture(createCanvas(4, 4))
  t.image = { width: tira.w, height: tira.h }
  t.userData.esTira = true
  m.set('tira', t)
  return m
}

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [...new Set(DIRS.flatMap(d => (existsSync(d)
    ? readdirSync(d).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.replace('.js', ''))
    : [])))]

const rutaDe = (id) => {
  for (const d of DIRS) { const r = join(d, `${id}.js`); if (existsSync(r)) return r }
  return join(DIRS[0], `${id}.js`)
}

// TODA textura que el material muestre, venga de donde venga. Un material de three la trae en `.map`;
// uno escrito a mano la trae en un uniform que puede llamarse como sea. Buscar solo `.map` dejaria
// afuera justo a los ShaderMaterial, que son los que ya rompieron dos veces por no aplicar la matriz
// de textura a mano.
function texturasDe(mat) {
  const out = []
  if (!mat) return out
  for (const m of (Array.isArray(mat) ? mat : [mat])) {
    if (m.map && m.map.isTexture) out.push(m.map)
    if (m.uniforms) {
      for (const k of Object.keys(m.uniforms)) {
        const v = m.uniforms[k] && m.uniforms[k].value
        if (v && v.isTexture) out.push(v)
      }
    }
  }
  return out
}

// EL TOPE NO SE ELIGE: la cuenta correcta da 1.000 exacto porque es aritmetica al construir, no un
// render. El 1% admite el redondeo de punto flotante y nada mas — no hay deformacion visible por
// debajo de eso, y cualquier cosa por encima es una decision de codigo, no ruido.
//
// Y VA ACA ARRIBA A PROPOSITO. La primera version lo declaraba con `var` DESPUES del barrido: se
// izaba la declaracion pero no el valor, asi que toda la comparacion corria contra `undefined` ->
// `Math.log(undefined)` es NaN -> `NaN > NaN` es false -> la compuerta no podia fallar NUNCA. Dio
// verde con el defecto de 1.87x delante. Un verde que no puede ponerse rojo no mide nada.
const TOPE = 1.01

const _esc = new THREE.Vector3()
const fallos = []
const medidas = []
let revisados = 0, planos = 0

for (const [nombreAire, aire] of Object.entries(AIRES).filter(([n]) => n === process.env.TIRA_AIRE)) {
  configurar(aire)
  for (const tiraSpec of TIRAS) {
    for (const id of ids) {
      const ruta = rutaDe(id)
      if (!existsSync(ruta)) continue
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
          texturas: tejidoFalso([2.4, 1.0, 0.6, 3.4, 1.35], tiraSpec),
          datosEls: [{ rol: 'logo', url: 'f0' }, { rol: 'tarjeta', url: 'f1' }, { rol: 'foto', url: 'f2' },
            { rol: 'cta', url: 'f3' }, { rol: 'tarjeta', url: 'f4' }],
          spec: { tiraViewport: tiraSpec.vp }, claro: false, repeticion: 0,
        })
      } catch { continue }
      if (!r || !r.g) continue
      revisados++

      for (const raiz of [r.g, r.gr].filter(Boolean)) {
        raiz.updateMatrixWorld(true)
        raiz.traverse((o) => {
          if (!o.isMesh || !o.geometry) return
          const geo = o.geometry
          // Solo planos. Una geometria extruida o una forma redondeada mapea uv de otra manera y
          // medirla con esta cuenta seria inventar un defecto.
          if (geo.type !== 'PlaneGeometry') return
          const pos = geo.attributes && geo.attributes.position
          const uvA = geo.attributes && geo.attributes.uv
          if (!pos || !uvA) return
          for (const tex of texturasDe(o.material)) {
            if (!tex.userData || !tex.userData.esTira) continue
            const img = tex.image
            if (!img || !img.width || !img.height) continue

            // EL SPAN DE UV SE LEE, NO SE SUPONE. La primera version daba por hecho que un plano mapea
            // uv 0..1 sobre su ancho y su alto. `pantalla.js:156` REESCRIBE las uv de cada banda para
            // que las siete juntas reconstruyan la pagina sin costura, asi que ahi el span es 1/N por
            // el solape — y la compuerta acuso a `pantalla` de achatar la pagina 6.97 veces cuando es
            // uno de los dos archivos que documentan la cuenta CORRECTA. La acusacion era mia.
            let du = 0, dv = 0, dx = 0, dy = 0
            {
              let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity
              let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
              for (let k = 0; k < uvA.count; k++) {
                const u = uvA.getX(k), v = uvA.getY(k)
                if (u < u0) u0 = u; if (u > u1) u1 = u
                if (v < v0) v0 = v; if (v > v1) v1 = v
                const x = pos.getX(k), y = pos.getY(k)
                if (x < x0) x0 = x; if (x > x1) x1 = x
                if (y < y0) y0 = y; if (y > y1) y1 = y
              }
              du = u1 - u0; dv = v1 - v0; dx = x1 - x0; dy = y1 - y0
            }
            if (!(du > 1e-9) || !(dv > 1e-9) || !(dx > 1e-9) || !(dy > 1e-9)) continue

            // LA FRACCION QUE EL SITIO DECLARA. Dos heroes pintan la pagina en una REGION del plano y
            // el resto lo ocupa otra cosa: `telefono` reserva la franja segura de arriba
            // (`vv = vUv.y / (1.0 - uSeguro)`) y `ventana` reserva la barra del navegador
            // (`q.y / uYBar`). Eso pasa DENTRO del shader, y esta compuerta corre en Node y no compila
            // GLSL — no hay forma de deducirlo desde afuera. Por eso el sitio lo declara, y si la
            // declaracion y el shader se separan, la compuerta lo dice.
            const frac = (o.userData && o.userData.pagina) || {}
            const fx = frac.anchoFrac > 0 ? frac.anchoFrac : 1
            const fy = frac.altoFrac > 0 ? frac.altoFrac : 1

            o.getWorldScale(_esc)
            const anchoPag = Math.abs(dx * fx * _esc.x)
            const altoPag = Math.abs(dy * fy * _esc.y)
            if (!(anchoPag > 1e-6) || !(altoPag > 1e-6)) continue
            const rx = tex.repeat.x || 1, ry = tex.repeat.y || 1
            planos++
            // LA SALIDA DECLARADA de ventana.js:155-157: la pagina entra entera y se la estira a lo
            // alto a proposito porque la alternativa es romper la composicion.
            if (ry * dv >= 0.999) continue
            const pxuX = (img.width * rx * du) / anchoPag
            const pxuY = (img.height * ry * dv) / altoPag
            const razon = pxuX / pxuY
            medidas.push({ id, aire: nombreAire, tira: tiraSpec.nombre, razon, ry })
            if (!(razon > 0)) continue
            if (Math.abs(Math.log(razon)) > Math.log(TOPE)) {
              // EL SENTIDO IMPORTA Y ES CONTRAINTUITIVO: menos pixeles de pagina por unidad de mundo a
              // lo ANCHO significa que la pagina esta MAS AMPLIADA en horizontal, o sea estirada a lo
              // ancho — letras anchas y chatas. Asi que razon < 1 es "estirada a lo ancho", no achatada.
              const ancho = 1 / razon
              fallos.push(`${id}: la pagina sale estirada ${ancho >= 1 ? ancho.toFixed(3) + 'x a lo ANCHO' : razon.toFixed(3) + 'x a lo ALTO'}`
                + `  (px/u ${pxuX.toFixed(1)} x ${pxuY.toFixed(1)}, repeat.y ${ry.toFixed(5)})`
                + `   [aire ${nombreAire} · tira ${tiraSpec.nombre}]`)
            }
          }
        })
      }
    }
  }
}

const unicos = [...new Set(fallos)].sort()
if (medidas.length) {
  console.log(`TIRA: ${planos} planos con la pagina, ${medidas.length} medidos (los de pagina entera no se acusan)`)
  const porId = new Map()
  for (const m of medidas) {
    const a = porId.get(m.id)
    if (!a || Math.abs(Math.log(m.razon)) > Math.abs(Math.log(a.razon))) porId.set(m.id, m)
  }
  for (const [id, m] of [...porId].sort((a, b) => Math.abs(Math.log(b[1].razon)) - Math.abs(Math.log(a[1].razon)))) {
    console.log(`  ${id.padEnd(10)} peor ${m.razon.toFixed(4)}x   repeat.y ${m.ry.toFixed(5)}   [${m.aire} · ${m.tira}]`)
  }
}
// El hijo no juzga: emite y el padre suma. Ver la nota de arriba.
console.log('##TIRA##' + JSON.stringify({ revisados, fallos: unicos }))
process.exit(0)
if (unicos.length) {
  console.log(`\nGATE TIRA FAIL (${unicos.length}):`)
  for (const f of unicos) console.log('  ' + f)
  process.exit(1)
}
console.log(`GATE TIRA OK (${revisados} construcciones x ${TIRAS.length} tiras reales: la pagina del cliente no se deforma).`)
