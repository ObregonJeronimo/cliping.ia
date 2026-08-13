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

const idP = process.argv[2] || 'atrio'
const nomAire = process.argv[3] || 'editorial'
const aire = (await import(pathToFileURL(join(DEMO, 'aires', nomAire + '.js')).href)).default
// LOS DATOS SON LOS DE UNA PAGINA CAPTURADA, NO ANTHEM.
//
// La sonda medía con ANTHEM mientras las fotos se sacaban con basecamp, y los dos no se parecen en lo
// que importa aca: el claim de ANTHEM tiene 19 caracteres y el de una pagina real puede tener 150. O
// sea que la sonda decia "los renglones miden 6.4% del cuadro" mientras la foto mostraba texto de 8
// pixeles — las dos verdades, sobre piezas distintas. Un instrumento que mide otro caso no es un
// instrumento.
let DATOS = ANTHEM
const cual = process.argv[6] || 'basecamp-com'
try {
  const f = join(RAIZ, 'tools', 'out', 'motor', cual, 'datos.json')
  if (existsSync(f)) DATOS = JSON.parse(readFileSync(f, 'utf8')).datos
  else console.log('  (sin captura de ' + cual + ': se mide con ANTHEM)')
} catch { /* si no se puede leer, ANTHEM y se avisa arriba */ }
configurar(aire, 5)
configurarDatos(DATOS)
reiniciarReparto(); reiniciarRecortes()

const { porId, PLANTILLAS } = await import(pathToFileURL(join(BOV, 'index.js')).href)
const { recetasDe } = await import(pathToFileURL(join(BOV, 'recetas.js')).href)
// EL MISMO RETRATO QUE VE EL VIDEO. La sonda ya aprendio esta leccion una vez: medía con ANTHEM
// mientras las fotos se sacaban con basecamp, y las dos verdades eran sobre piezas distintas. Con las
// recetas pasa igual — sin el retrato, la sonda mediria una pieza compuesta con los valores neutros.
let RETRATO = null
try {
  const fr = join(RAIZ, 'tools', 'out', 'motor', cual, 'retrato.json')
  if (existsSync(fr)) RETRATO = JSON.parse(readFileSync(fr, 'utf8'))
  else console.log('  (sin retrato de ' + cual + ': se mide con los valores neutros)')
} catch { /* neutros, y ya se aviso */ }
const P = porId(idP)
if (!P) { console.error('no existe: ' + idP + '. Hay: ' + PLANTILLAS.map(p => p.meta.id).join(', ')); process.exit(2) }

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H), fov = 32
const distBase = (mundoH / 2) / Math.tan((fov / 2) * Math.PI / 180)
const escena = new THREE.Scene(), paginaEsc = new THREE.Scene()
const camara = new THREE.PerspectiveCamera(fov, W / H, 0.1, 600)
camara.position.set(0, 0, distBase)
const tl = gsap.timeline({ paused: true })
let s = 1
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }

// Texturas falsas del tamaño real: una tira 720x8192 y unos recortes. Sin esto la plantilla toma la
// rama "no hay material" y la sonda mediria una pieza que el motor no produce.
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
const dur = r.dur || b(P.meta.beats)

// ---- que hay en el grafo
const textos = [], imagenes = [], otras = []
for (const raiz of [escena, paginaEsc]) {
  raiz.traverse(o => {
    if (!o.isMesh) return
    const u = o.material && !Array.isArray(o.material) && o.material.uniforms
    if (u && u.uProg && u.map) { o.userData.__que = 'texto#' + textos.length; textos.push(o) }
    // LA PAGINA DEL CLIENTE CUENTA COMO CONTENIDO, y no contarla era un defecto del instrumento.
    //
    // La primera version solo miraba mallas de texto, asi que en el tiempo de PRUEBA —ocho beats en los
    // que se muestra la pagina y a proposito no hay una sola letra— informaba "encendido 0, legible 0" y
    // remataba con "MAS DE LA MITAD DE LA PIEZA ES MUDA". La pieza no estaba muda: la sonda era ciega
    // justo al unico tiempo que ninguna plantilla generica puede fingir.
    else if (o.userData.tipoImagen === 'recorte') { o.userData.__que = 'pagina#' + imagenes.length; imagenes.push(o) }
    else otras.push(o)
  })
}

// VISIBLE DE VERDAD: `visible` no se hereda como una bandera que se pueda leer en la malla. Un objeto
// cuyo grupo padre esta apagado se dibuja igual de invisible, y la sonda lo contaba como encendido —
// por eso marcaba "encendido pero NO se ve" en los beats 29 a 33 de `atrio`, que es exactamente cuando
// las cifras YA SALIERON y `sale()` las apago. Eso no es un defecto de la plantilla: es la salida
// funcionando. Un instrumento que llama defecto al comportamiento correcto hace perder mas tiempo que
// no tenerlo.
const seVe = (o) => {
  for (let n = o; n; n = n.parent) if (!n.visible) return false
  // Y LA OPACIDAD TAMBIEN, que la primera version no miraba. Una malla transparente con `opacity` en 0
  // es invisible de verdad —no dibuja un solo pixel— y la sonda la contaba igual. Lo encontro `panal`:
  // sus celdas encienden la cara del cliente al acercarse la camara, o sea que durante ESPACIO valen 0,
  // y la sonda seguia informando dos imagenes de pagina en el cuadro cero. El arreglo estaba bien y el
  // instrumento decia que no. Es la tercera vez que esta sonda llama defecto a algo que funciona.
  const m = o.material
  if (m && !Array.isArray(m) && m.transparent && typeof m.opacity === 'number' && m.opacity <= 0.02) return false
  return true
}
console.log('\nSONDA — plantilla "%s" · aire %s · %s beats (%.1f s a %d bpm)',
  P.meta.id, nomAire, P.meta.beats, dur, Math.round(60 / BEAT))
console.log('  datos: "%s" · claim de %d caracteres · %d frases · %d cifras',
  DATOS.marca, String(DATOS.claim || '').length, (DATOS.frases || []).length, (DATOS.datos || []).length)
console.log('  mallas de TEXTO: %d   ·   de PAGINA: %d   ·   otras: %d', textos.length, imagenes.length, otras.length)
if (!textos.length) console.log('  >>> NO HAY UNA SOLA MALLA DE TEXTO. La pieza va a salir muda.')

// ---- se muestrea la timeline y se mira, en cada beat, que texto esta ENCENDIDO y DELANTE
const _v = new THREE.Vector3()
// HACIA DONDE MIRA LA CAMARA DE VERDAD, y no "a -z porque siempre fue asi".
//
// La primera version daba por hecho que la camara mira a -z del mundo, que es cierto en los vuelos de
// avance y de desliz y FALSO en una orbita, donde `lookAt` la reorienta en cada cuadro. Sobre `vitral`
// informo 87% de beats mudos con la plantilla funcionando: los textos estaban delante de la camara,
// pero no delante del eje -z del mundo. Un instrumento calibrado sobre un caso particular miente en
// cuanto aparece el segundo.
const _dir = new THREE.Vector3()
const filas = []
const fuera = []
const MUESTRA = Number(process.argv[4] || 7)
for (let bt = 0; bt <= P.meta.beats; bt += 1) {
  tl.time(Math.min(b(bt), dur), false)
  if (r.alSeek) r.alSeek(b(bt))
  escena.updateMatrixWorld(true); paginaEsc.updateMatrixWorld(true); camara.updateMatrixWorld(true)
  camara.getWorldDirection(_dir)
  let vivos = 0, delante = 0, legibles = 0, pag = 0
  for (const o of textos) {
    const u = o.material.uniforms
    if (!(u.uProg.value > 0.02)) continue
    if (!seVe(o)) continue
    vivos++
    o.getWorldPosition(_v)
    const d = _v.clone().sub(camara.position)
    // Delante = del lado en que mira la camara. En este motor la camara mira a -z siempre.
    if (d.dot(_dir) > 0.5) {
      delante++
      // Y DENTRO DEL CUADRO, que es la pregunta que de verdad importa y que la primera version de esta
      // sonda no hacia: media distancia y decia "legible" de algo que estaba fuera de pantalla.
      const dist = d.length()
      _v.project(camara)
      const dentro = Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05
      if (dentro && dist > distBase * 0.25 && dist < distBase * 3.2) legibles++
      else if (bt === MUESTRA) fuera.push(o.userData.__que + ' ndc(' + _v.x.toFixed(2) + ',' + _v.y.toFixed(2) + ') dist ' + dist.toFixed(1))
    }
  }
  for (const o of imagenes) {
    if (!seVe(o) || o.scale.x < 0.05) continue
    o.getWorldPosition(_v)
    const d = _v.clone().sub(camara.position)
    if (d.dot(_dir) <= 0.5) continue
    const dist = d.length()
    _v.project(camara)
    if (Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05 && dist > distBase * 0.2 && dist < distBase * 3.2) pag++
  }
  filas.push({ bt, vivos, delante, legibles, pag })
}
// ---- CUANTO OCUPA CADA TEXTO EN EL CUADRO. Es la pregunta que faltaba: un texto puede estar
// encendido, delante y dentro del cuadro, y aun asi ser ilegible por chico. Se proyectan las cuatro
// esquinas de su plano y se mide cuanta pantalla ocupa.
const _c = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
function enPantalla(o, cam) {
  const g = o.geometry.parameters || {}
  const w = (g.width || 1) / 2, h = (g.height || 1) / 2
  const pts = [[-w, -h], [w, -h], [-w, h], [w, h]]
  let x0 = 9, x1 = -9, y0 = 9, y1 = -9
  pts.forEach((pp, i) => {
    _c[i].set(pp[0], pp[1], 0).applyMatrix4(o.matrixWorld).project(cam)
    x0 = Math.min(x0, _c[i].x); x1 = Math.max(x1, _c[i].x)
    y0 = Math.min(y0, _c[i].y); y1 = Math.max(y1, _c[i].y)
  })
  return { w: (x1 - x0) / 2, h: (y1 - y0) / 2, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, mundo: g.width }
}
{
  const bt = Number(process.argv[5] || 12)
  tl.time(Math.min(b(bt), dur), false)
  if (r.alSeek) r.alSeek(b(bt))
  escena.updateMatrixWorld(true); paginaEsc.updateMatrixWorld(true); camara.updateMatrixWorld(true)
  console.log('')
  console.log('  EN EL BEAT ' + bt + ' — cuanto ocupa cada texto ENCENDIDO (1.0 = el cuadro entero)')
  console.log('    camara en (' + camara.position.x.toFixed(1) + ', ' + camara.position.y.toFixed(1) + ', ' + camara.position.z.toFixed(1) + ')  distBase ' + distBase.toFixed(1))
  let n = 0
  for (const o of textos) {
    if (!(o.material.uniforms.uProg.value > 0.02) || !seVe(o)) continue
    const m = enPantalla(o, camara)
    n++
    console.log('    ' + o.userData.__que.padEnd(9) + ' mundo ' + String(m.mundo).slice(0, 5).padStart(5)
      + '  ocupa ancho ' + m.w.toFixed(3) + '  alto ' + m.h.toFixed(3)
      + '  centro (' + m.cx.toFixed(2) + ', ' + m.cy.toFixed(2) + ')')
  }
  if (!n) console.log('    (ninguno encendido en ese beat)')
}

console.log('\n  beat  encendidos  delante  legibles  pagina')
let mudos = 0
for (const f of filas) {
  const alarma = f.vivos > 0 && f.legibles === 0 ? '   <-- encendido pero NO se ve' : ''
  // MUDO = ni una letra NI la pagina. El tiempo de PRUEBA no lleva texto y no por eso esta vacio.
  if (f.legibles === 0 && f.pag === 0) mudos++
  console.log('   %s %s %s %s %s%s',
    String(f.bt).padStart(4), String(f.vivos).padStart(9), String(f.delante).padStart(8),
    String(f.legibles).padStart(8), String(f.pag).padStart(6), alarma)
}
const pct = Math.round(100 * mudos / filas.length)
console.log('\n  beats SIN un solo texto legible: %d de %d (%d%%)', mudos, filas.length, pct)
if (pct > 45) console.log('  >>> MAS DE LA MITAD DE LA PIEZA ES MUDA. Revisar donde se colocan los textos.')
