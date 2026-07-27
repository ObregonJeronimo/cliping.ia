// Verifica una escena de ANTHEM sin abrir un navegador: contrato, determinismo, duración y cámara.
//
// Existe porque los tres defectos que rompen una pieza secuenciada no se ven mirando UNA escena
// aislada en el navegador — se ven recién cuando la pieza entera está mal y no se sabe quién la
// rompió:
//   · una timeline que se pasa de sus beats pisa la escena siguiente,
//   · una cámara que no vuelve a su lugar arranca la escena siguiente desde otro punto de vista,
//   · un Math.random hace que dos renders del mismo video no sean iguales.
//
// Se construye la escena en Node con un DOM mínimo (el kit dibuja texto en un canvas 2D). Nunca se
// renderiza WebGL: alcanza con que la timeline exista para poder medirla.
//
// Uso:  node render3d/demo/verificar.mjs [id ...]      (sin argumentos, verifica todas)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..', '..')
const DIR = join(HERE, 'escenas')
try { GlobalFonts.loadFontsFromDir(join(RAIZ, 'tools', 'fonts')) } catch { /* la medida de texto cae a la fuente por defecto */ }

// ---- DOM mínimo. El kit usa document.createElement('canvas') para rasterizar tipografía y
// document.fonts para esperarla; nada más del navegador hace falta para ARMAR la escena.
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? createCanvas(4, 4) : { style: {} }),
  getElementById: () => createCanvas(4, 4),
  fonts: { ready: Promise.resolve(), load: async () => {} },
}
globalThis.window = globalThis
const { gsap } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'gsap', 'index.js')).href)
globalThis.gsap = gsap
const THREE = await import(pathToFileURL(join(RAIZ, 'node_modules', 'three', 'build', 'three.module.js')).href)
const { BEAT, LOOK, b } = await import(pathToFileURL(join(HERE, 'kit.js')).href)

let fails = 0
const die = m => { console.error('FAIL  ' + m); fails++ }
const ok = (c, m) => { if (!c) die(m) }

const PROHIBIDO = [
  [/\bMath\.random\b/, 'Math.random — usa ctx.rnd(), o dos renders del mismo video no son iguales'],
  [/\bDate\.now\b|\bnew Date\b/, 'reloj propio — el tiempo lo pone el driver'],
  [/\brequestAnimationFrame\b/, 'requestAnimationFrame — el render no corre en tiempo real'],
  [/\bsetTimeout\b|\bsetInterval\b/, 'temporizador — todo tiene que estar declarado en la timeline'],
]

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : (existsSync(DIR) ? readdirSync(DIR).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.replace('.js', '')) : [])

if (!ids.length) { console.error('no hay escenas en ' + DIR); process.exit(1) }

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

for (const id of ids) {
  const ruta = join(DIR, `${id}.js`)
  if (!existsSync(ruta)) { die(`${id}: no existe ${ruta}`); continue }

  const fuente = readFileSync(ruta, 'utf8')
  for (const [rx, porque] of PROHIBIDO) {
    if (rx.test(fuente)) die(`${id}: ${porque}`)
  }

  let mod
  try { mod = await import(pathToFileURL(ruta).href + '?v=' + fuente.length) } catch (e) { die(`${id}: no importa — ${e.message}`); continue }
  ok(mod.meta && mod.meta.id === id, `${id}: meta.id tiene que ser '${id}'`)
  ok(mod.meta && Number.isFinite(mod.meta.beats) && mod.meta.beats > 0, `${id}: meta.beats invalido`)
  ok(typeof mod.build === 'function', `${id}: falta export function build(ctx)`)
  if (!mod.meta || typeof mod.build !== 'function') continue

  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
  camera.position.set(0, 0, distBase)
  let semilla = 1
  const rnd = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296 }
  const uni = () => ({ uT: { value: 0 }, uGrilla: { value: 0.55 }, uPulso: { value: 0 }, uA: { value: new THREE.Color(LOOK.bg) }, uB: { value: new THREE.Color(LOOK.bg2) } })
  const ctx = {
    THREE, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
    fondo: uni(),
    pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
    bloom: { strength: 0.85, radius: 0.62, threshold: 0.62 },
  }

  // ---- PAGINA POBRE. Antes de nada, se construye la escena con el material MINIMO que puede dar una
  // pagina real: una cifra, una frase, sin bloque y sin CTA. Es el caso que rompe, y el que el
  // verificador no miraba: con los datos de ANTHEM (cinco de todo) toda escena parece correcta.
  const { configurarDatos, ANTHEM } = await import(pathToFileURL(join(HERE, 'datos.js')).href)
  configurarDatos({ marca: 'Q', rotulo: 'Q', claim: 'UNA COSA', frases: ['UNA COSA'],
    bloque: null, datos: [{ valor: '4.9', etiqueta: 'RESEÑAS' }], golpe: 'UNA COSA', cta: null,
    pie: ['q.com'], dominio: 'q.com', elementos: [] })
  try {
    const camPobre = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
    camPobre.position.set(0, 0, distBase)
    let sp = 1
    const rp = await mod.build({ ...ctx, camera: camPobre, fondo: uni(), rnd: () => { sp = (sp * 1664525 + 1013904223) >>> 0; return sp / 4294967296 } })
    ok(rp && rp.g && rp.g.children.length > 0, `${id}: con una pagina POBRE el grupo queda vacio`)
    rp.tl.time(mod.meta.beats * BEAT, false)
  } catch (e) {
    die(`${id}: con una pagina POBRE (1 cifra, 1 frase, sin CTA) build() lanzo — ${e.message}`)
  }
  configurarDatos(ANTHEM)

  let r
  try { r = await mod.build(ctx) } catch (e) { die(`${id}: build() lanzo — ${e.message}`); continue }
  ok(r && r.g && r.tl, `${id}: build() tiene que devolver { g, tl }`)
  if (!r || !r.g || !r.tl) continue
  ok(r.g.isObject3D, `${id}: g no es un Object3D`)
  ok(r.g.children.length > 0, `${id}: el grupo esta vacio — la escena no construyo nada`)

  // ---- DURACION. Es el chequeo que mas vale: una timeline que se pasa no falla, solo pisa a la
  // escena siguiente, y eso se descubre mirando la pieza entera y sin saber quien fue.
  const limite = mod.meta.beats * BEAT
  const dur = r.tl.duration()
  ok(dur <= limite + 1e-3, `${id}: la timeline dura ${dur.toFixed(3)}s y su lugar es ${limite.toFixed(3)}s (${mod.meta.beats} beats) — se come la escena siguiente`)
  ok(dur > limite * 0.5, `${id}: la timeline dura ${dur.toFixed(3)}s de ${limite.toFixed(3)}s disponibles — mas de la mitad de la escena queda congelada`)

  // ---- CAMARA. Se recorre hasta el final y se comprueba que volvio. Si una escena mueve la camara y
  // no la devuelve, la siguiente arranca desde otro punto de vista y la pieza se desarma.
  r.tl.time(limite, false)
  const p = camera.position
  const vuelve = Math.abs(p.x) < 0.02 && Math.abs(p.y) < 0.02 && Math.abs(p.z - distBase) < 0.02
    && Math.abs(camera.rotation.x) < 0.01 && Math.abs(camera.rotation.y) < 0.01 && Math.abs(camera.rotation.z) < 0.01
  ok(vuelve, `${id}: la camara termina en (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) rot(${camera.rotation.x.toFixed(2)}, ${camera.rotation.y.toFixed(2)}, ${camera.rotation.z.toFixed(2)}) y tiene que volver a (0, 0, ${distBase.toFixed(2)}) rot(0,0,0)`)

  // ---- NADA DESCANSA. Se recorre la timeline muestreando la posicion/escala/opacidad de todo el
  // grupo y se busca la ventana mas larga sin cambios. Un beat entero sin movimiento no es un
  // silencio, es una diapositiva.
  const firma = () => {
    let s = ''
    r.g.traverse(o => {
      if (!o.isMesh && !o.isPoints) return
      s += `${o.position.x.toFixed(3)},${o.position.y.toFixed(3)},${o.position.z.toFixed(3)},`
        + `${o.scale.x.toFixed(3)},${o.rotation.y.toFixed(3)},${o.visible ? 1 : 0},`
        + `${(o.material && o.material.opacity != null ? o.material.opacity : 1).toFixed(3)},`
        + `${(o.material && o.material.uniforms && o.material.uniforms.uProg ? o.material.uniforms.uProg.value : 0).toFixed(3)};`
    })
    return s
  }
  const N = Math.max(12, Math.round(limite * 30))
  let previa = null, quieto = 0, peor = 0
  for (let i = 0; i <= N; i++) {
    r.tl.time((i / N) * limite, false)
    const f = firma()
    if (f === previa) { quieto++; peor = Math.max(peor, quieto) } else { quieto = 0 }
    previa = f
  }
  const quietoSeg = (peor / N) * limite
  ok(quietoSeg < BEAT * 1.05, `${id}: ${quietoSeg.toFixed(2)}s sin que se mueva NADA (mas de un beat) — eso se lee como diapositiva`)

  // ---- DETERMINISMO: construir dos veces con la misma semilla tiene que dar la misma firma.
  const camera2 = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
  camera2.position.set(0, 0, distBase)
  let semilla2 = 1
  const ctx2 = { ...ctx, camera: camera2, fondo: uni(), rnd: () => { semilla2 = (semilla2 * 1664525 + 1013904223) >>> 0; return semilla2 / 4294967296 } }
  const r2 = await mod.build(ctx2)
  r.tl.time(limite * 0.5, false); const fa = firma()
  const gg = r.g; const guardar = gg
  void guardar
  r2.tl.time(limite * 0.5, false)
  let fb = ''
  r2.g.traverse(o => {
    if (!o.isMesh && !o.isPoints) return
    fb += `${o.position.x.toFixed(3)},${o.position.y.toFixed(3)},${o.position.z.toFixed(3)},`
      + `${o.scale.x.toFixed(3)},${o.rotation.y.toFixed(3)},${o.visible ? 1 : 0},`
      + `${(o.material && o.material.opacity != null ? o.material.opacity : 1).toFixed(3)},`
      + `${(o.material && o.material.uniforms && o.material.uniforms.uProg ? o.material.uniforms.uProg.value : 0).toFixed(3)};`
  })
  ok(fa === fb, `${id}: dos construcciones con la misma semilla dan escenas distintas`)

  if (!fails) console.log(`  ${id}: OK — ${r.g.children.length} objetos, ${dur.toFixed(2)}s de ${limite.toFixed(2)}s, quietud maxima ${quietoSeg.toFixed(2)}s`)
  else console.log(`  ${id}: revisado (${dur.toFixed(2)}s / ${limite.toFixed(2)}s)`)
}

if (fails) { console.error(`\nVERIFICAR: ${fails} FAIL`); process.exit(1) }
console.log(`VERIFICAR OK (${ids.length} escena${ids.length > 1 ? 's' : ''}: contrato, sin azar ni reloj propio, duracion dentro de sus beats, camara devuelta, nada descansa mas de un beat, determinista).`)
