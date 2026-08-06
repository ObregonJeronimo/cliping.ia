// COMPUERTA E-TEXTO-SOBRE-FONDO — lo que se lee tiene que contrastar con LO QUE TIENE DETRAS.
//
// POR QUE EXISTE. `adn-check` mide los colores contra `bg` y `bg2`, que es el fondo del MUNDO. Pero
// varias escenas escriben encima de otra cosa: una cinta con el acento, una cama de nivel, una tarjeta.
// Ahi el fondo relevante no es `bg`, y elegir el color contra `bg` es medir contra algo que no esta
// detras de las letras.
//
// El caso que la hizo falta: `marquesina` escribia con `nivel(CLARO ? 0.92 : 0.86)` sobre una cama de
// `nivel(CLARO ? 0.88 : 0.10)`. En mundo claro eso es texto 0.92 sobre banda 0.88 —cuatro centesimas de
// la MISMA rampa—, y las dos compuertas de color daban verde porque las dos miraban el fondo del mundo.
// Medido: 55 de 77 combinaciones por debajo del piso en cada cinta, la peor a 1.05:1. Confirmado en
// pixeles renderizados: basecamp.com, cuadro 410, la frase de la cinta gris a 1.13:1.
//
// COMO MIDE, y por que asi:
//
//   Se construye cada escena de verdad —el mismo `build(ctx)` que corre en el video— y se recorre el
//   grafo. Una malla es TEXTO si su textura lo declara (`tex.userData.esTexto`, que pone `texto()`).
//   No se adivina: adivinar cual de las mallas con `map` lleva letras es como se acusa en falso.
//
//   Para cada texto se busca que hay detras: la malla OPACA mas cercana con z menor que la del texto y
//   que lo solape en x/y. Si no hay ninguna, lo de atras es el fondo del mundo, y ahi vale el peor de
//   `bg`/`bg2` — que es justo lo que ya mide `adn-check`, asi que las dos compuertas coinciden en ese
//   caso en vez de contradecirse.
//
//   El color del texto tampoco se adivina: sale de `tex.userData.color`, salvo que el material lo tiña
//   (`materialMascara` con color pisa el canvas: `if (uUsaTinte > 0.5) t.rgb = uTinte`), y entonces
//   manda el tinte.
//
// EL PISO ES EL MISMO que el de la paleta —`pisoLegible(claro)`, 3.2 en claro y 2.6 en oscuro—, no uno
// nuevo: dos umbrales para la misma pregunta es como una compuerta contradice a la otra.
//
// Uso:  node tools/fondo-check.mjs
import { createCanvas } from '@napi-rs/canvas'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')

// SE CORRE A SI MISMA POR PARTES, UNA PAGINA POR PROCESO. No es una manía: es la unica forma de
// devolver la memoria.
//
// Cada llamada a `texto()` compromete pixeles que NO se recuperan —ni soltando la textura, ni vaciando
// el cache, ni pidiendo la recoleccion a mano— porque los reserva la libreria nativa de canvas. Medido:
// 600 textos = 2.85 GB comprometidos (12.9 GB antes de acotar el ancho del lienzo) con `rss` en 94 MB.
// Este barrido construye 2849 escenas, asi que en un solo proceso termina en decenas de GB, que es
// exactamente como esta compuerta colgo la maquina la primera vez que se corrio.
//
// Lo que SI devuelve la memoria es terminar el proceso: el sistema operativo la reclama entera. Asi que
// el barrido se parte por pagina y cada parte corre en su propio Node. Cuesta siete arranques (~3 s en
// total) y a cambio el pico baja de decenas de GB a los ~2.5 GB de una pagina sola.
if (!process.env.FONDO_PAGINA && !process.env.FONDO_PAGINAS) {
  const { spawnSync } = await import('node:child_process')
  const { readdirSync: leerDir } = await import('node:fs')
  const dirF = join(RAIZ, 'tools', 'fixtures', 'director', 'elementos')
  const paginas = leerDir(dirF).filter(x => x.endsWith('.json'))
  let malas = 0
  const resumen = []
  for (let i = 0; i < paginas.length; i++) {
    const r = spawnSync(process.execPath, ['--expose-gc', process.argv[1]],
      { env: { ...process.env, FONDO_PAGINA: String(i) }, encoding: 'utf8' })
    const txt = (r.stdout || '') + (r.stderr || '')
    if (r.status !== 0) { malas++; process.stdout.write(txt) }
    else resumen.push(txt.trim().split(String.fromCharCode(10)).filter(l => l.includes('parte')).join(''))
  }
  if (malas) {
    console.log(`GATE FONDO FAIL — ${malas} de ${paginas.length} paginas con textos ilegibles (detalle arriba).`)
    process.exit(1)
  }
  console.log(`GATE FONDO OK — ${paginas.length} paginas barridas, cada una en su propio proceso para que `
    + `la memoria vuelva al sistema.`)
  for (const l of resumen) if (l) console.log('  ' + l)
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
const { BEAT, LOOK, b, configurar, reiniciarRecortes, limpiarCache } = await import(pathToFileURL(join(DEMO, 'kit.js')).href)
const DAT = await import(pathToFileURL(join(DEMO, 'datos.js')).href)
const { personalizar, pisoLegible } = await import(pathToFileURL(join(DEMO, 'adn.js')).href)
const { autolimitar, usoMb } = await import(pathToFileURL(join(RAIZ, 'tools', 'lib', 'autolimite.mjs')).href)
// Esta compuerta construye miles de escenas, o sea miles de canvas. Se autolimita: ver lib/autolimite.mjs.
const _ojo = autolimitar('fondo-check')
if (!global.gc) {
  console.error('fondo-check: FALTA --expose-gc. Sin eso los canvas no se recolectan y esta compuerta '
    + 'llego a 60 GB una vez. Corré:  node --expose-gc tools/fondo-check.mjs')
  process.exit(2)
}
let _traza = 0
const { datosDe } = await import(pathToFileURL(join(RAIZ, 'tools', 'anthem-datos.mjs')).href)

const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}
let _iHero = 0
const MOD = new Map()
const IDS_HEROES = []
for (const d of ['escenas', 'heroes']) {
  for (const f of readdirSync(join(DEMO, d)).filter(x => x.endsWith('.js') && x !== 'index.js')) {
    try {
      const m = await import(pathToFileURL(join(DEMO, d, f)).href)
      if (m.meta && typeof m.build === 'function') {
        MOD.set(m.meta.id, m)
        if (d === 'heroes') IDS_HEROES.push(m.meta.id)
      }
    } catch { /* que una escena no importe ya lo acusa verificar.mjs */ }
  }
}
const dirFix = join(RAIZ, 'tools', 'fixtures', 'director', 'elementos')
const FIX = readdirSync(dirFix).filter(x => x.endsWith('.json'))
  .map(f => ({ id: f.replace('.json', ''), pm: JSON.parse(readFileSync(join(dirFix, f), 'utf8')) }))

// ---------------------------------------------------------------- color
const canal = (h) => {
  const t = String(h).replace('#', '')
  const n = t.length === 3 ? t.split('').map(c => c + c).join('') : t
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) || 0)
}
const lum = (h) => canal(h).map(x => x / 255)
  .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  .reduce((s, v, i) => s + [0.2126, 0.7152, 0.0722][i] * v, 0)
const contraste = (a, B) => {
  const x = lum(a), y = lum(B)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
// EL COLOR SE LEE EN sRGB, NO EN LINEAL. `THREE.Color` guarda sus canales en espacio LINEAL (three
// convierte al construirlo desde un hex), asi que leer `c.r/g/b` y escalarlos a 0-255 da otro color:
// mas oscuro y con otro tono. La cama cyan `#2990be` se lei­a como `#064784`, y contra ese azul falso el
// texto daba 1.04:1 en vez de 2.70:1 — trece acusaciones a `marquesina` que no existian.
//
// La conversion la hace `getHexString(SRGBColorSpace)`, que es la que sabe de gamma. Comprobado a mano:
// 0x29 -> lineal 0.022 -> 0x06, 0x90 -> 0x47, 0xbe -> 0x84. Exactamente el color que la compuerta
// estaba acusando.
const deColor = (c) => '#' + c.getHexString(THREE.SRGBColorSpace)

// ---------------------------------------------------------------- el grafo
// Una malla TAPA si es opaca y su material pinta un color liso. Las que llevan `map` con letras no
// tapan (son el texto), y las transparentes tampoco: se ve el fondo a traves.
function esTapa(m) {
  const mat = m.material
  if (!mat || Array.isArray(mat)) return null
  if (mat.map) return null
  if (mat.transparent && (mat.opacity ?? 1) < 0.95) return null
  if (mat.isShaderMaterial) return null                 // fondos y mascaras: no son una cama de color
  if (!mat.color) return null
  return deColor(mat.color)
}

// El color con que se LEE una malla de texto: el tinte del material si lo hay, si no el del canvas.
function colorTexto(m) {
  const mat = m.material
  if (mat && mat.isShaderMaterial && mat.uniforms && mat.uniforms.uUsaTinte
      && mat.uniforms.uUsaTinte.value > 0.5 && mat.uniforms.uTinte) {
    return deColor(mat.uniforms.uTinte.value)
  }
  const map = mat && mat.map
  return (map && map.userData && map.userData.color) || null
}

// Caja en coordenadas de mundo. Solo planos: es lo que llevan texto y camas en este motor.
function caja(m) {
  m.updateWorldMatrix(true, false)
  const g = m.geometry
  if (!g || !g.parameters || g.parameters.width === undefined) return null
  const p = new THREE.Vector3()
  m.getWorldPosition(p)
  const e = new THREE.Vector3()
  m.getWorldScale(e)
  const w = Math.abs(g.parameters.width * e.x) / 2
  const h = Math.abs(g.parameters.height * e.y) / 2
  return { x0: p.x - w, x1: p.x + w, y0: p.y - h, y1: p.y + h, z: p.z }
}
// UNA BANDA CON AREA CERO NO TAPA NADA, y esto acuso 63 veces a `apertura` antes de verse: la "banda"
// medi­a `4.20 x 0.00`. Es un plano a medio abrir —se anima su escala— o sea invisible. La prueba de
// solapamiento aceptaba la caja degenerada porque `0 < 0.57 && 0 > -0.20` es cierto.
const AREA_MINIMA = 0.05                       // unidades de mundo; el cuadro mide ~5.06 x 8.99
// El cuadro es el mismo para todas las escenas: 9:16 a 42 grados y distancia 9.
const MUNDO_H = 2 * 9 * Math.tan((42 * Math.PI) / 360)
const MUNDO_W = MUNDO_H * (1080 / 1920)

// Y NO ALCANZA CON QUE SE TOQUEN: la banda tiene que estar DETRAS DEL CENTRO del texto. Un filete de
// 0.02 de alto que roza el pie de una cifra no es su fondo — lo que se lee detras de la letra sigue
// siendo el mundo. Se pide que contenga el centro y que cubra al menos la mitad del alto del texto.
function tapaDeVerdad(banda, texto) {
  const bw = banda.x1 - banda.x0, bh = banda.y1 - banda.y0
  if (bw < AREA_MINIMA || bh < AREA_MINIMA) return false
  // SE JUZGA LA PARTE QUE SE VE, no la pieza entera. Una frase de la cinta de `marquesina` entra por el
  // borde: su centro real esta fuera del cuadro y fuera de la cama, pero el pedazo visible SI esta
  // sobre la cama. Tomar el centro de la pieza entera acusaba siete veces algo que en pantalla se ve
  // perfecto. Se recorta el texto al cuadro y se usa el centro de ESE recorte.
  const vx0 = Math.max(texto.x0, -MUNDO_W / 2), vx1 = Math.min(texto.x1, MUNDO_W / 2)
  const vy0 = Math.max(texto.y0, -MUNDO_H / 2), vy1 = Math.min(texto.y1, MUNDO_H / 2)
  const cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2
  if (cx < banda.x0 || cx > banda.x1 || cy < banda.y0 || cy > banda.y1) return false
  return bh >= (texto.y1 - texto.y0) * 0.5
}

// LAS TEXTURAS DE RECORTE, O LA MITAD DE LAS ESCENAS NO SE CONSTRUYE. Aca se pasaba un `Map` vacio, asi
// que toda escena que necesita una imagen de la pagina se declaraba `vacia` y quedaba sin medir —
// `mesa` y `columna` entre ellas, que son justo dos fichas abiertas de la auditoria.
//
// Es exactamente la trampa que `eco-check` ya documenta: sus texturas se llenaban con claves 'f0'..'f4'
// mientras `datosEls` trae las urls del fixture, no resolvia ninguna, y la medicion decia "titular se
// cae el 100% de las veces". Era el arnes, no el motor. Se copian las claves REALES.
function tejido(els = []) {
  const m = new Map()
  const ARS = [2.4, 1.0, 0.6, 3.4, 1.35]
  ARS.forEach((ar, i) => {
    const h = 64, w = Math.max(2, Math.round(h * ar))
    const t = new THREE.CanvasTexture(lienzo(w, h))
    t.image = { width: w, height: h }
    m.set('f' + i, t)
  })
  ;(els || []).forEach((e, i) => {
    if (!e || !e.url) return
    const ar = ARS[i % ARS.length]
    const h = 64, w = Math.max(2, Math.round(h * ar))
    const t = new THREE.CanvasTexture(lienzo(w, h))
    t.image = { width: w, height: h }
    m.set(e.url, t)
  })
  const tira = new THREE.CanvasTexture(lienzo(4, 4))
  tira.image = { width: 720, height: 6240 }
  m.set('tira', tira)
  return m
}

const fallos = []
const F = (m) => fallos.push(m)
let textos = 0, sobreBanda = 0, construidas = 0, porLimpiar = 0

// UN AIRE POR PAGINA no alcanza y las 7x11 con todas las escenas seria eterno: se barren las 7 paginas
// contra los 11 aires, y las escenas se reparten para que cada una vea varios mundos claros y oscuros.
// BARRIDO ACOTADO PARA PROBAR LA PROPIA COMPUERTA. `FONDO_PAGINAS=1 FONDO_AIRES=2` corre una fraccion
// y sirve para comprobar que la memoria NO crece antes de soltarla sobre las 77 combinaciones. Existe
// porque esta compuerta llego a 60 GB la primera vez que se corrio: estrenar una herramienta a escala
// completa sobre la maquina de alguien es como se cuelga una PC.
const _unaPagina = process.env.FONDO_PAGINA !== undefined ? Number(process.env.FONDO_PAGINA) : null
const _paginas = Number(process.env.FONDO_PAGINAS || 0) || FIX.length
const _aires = Number(process.env.FONDO_AIRES || 0) || Object.keys(AIRES).length
const _lote = _unaPagina !== null ? FIX.slice(_unaPagina, _unaPagina + 1) : FIX.slice(0, _paginas)
for (const { id: idPag, pm } of _lote) {
  const datos = datosDe(pm)
  for (const [nombreAire, aire] of Object.entries(AIRES).slice(0, _aires)) {
    const a = personalizar(aire, pm.dna, () => 0.5)
    configurar({ ...aire, paleta: a.paleta, claro: a.claro })
    const piso = pisoLegible(a.claro)
    DAT.reiniciarReparto()
    reiniciarRecortes()
    DAT.configurarDatos(datos)
    if (process.env.FONDO_TRAZA) {
      const u = usoMb()
      console.error(`  [memoria] ${idPag} x ${nombreAire}: rss ${u.rss} MB · fuera del monton ${u.externo} MB`)
    }
    // EL PAR ESCENA+HERO SE BARRE, Y ANTES NO. `hero` es una escena que ENVUELVE a un hero: pone el
    // rotulo con la frase de la marca (hero.js:88, via `rotular`) encima de la geometria que el hero
    // dibuja. Esta compuerta construia cada modulo por su cuenta, asi que medía `hero` contra el hero
    // que le tocara por reparto y a cada hero solo, sin texto encima — y el defecto no vive en ninguna
    // de las dos piezas, vive en el PAR.
    //
    // Se encontro mirando un render de verdad: con el hero `calibre` y la pagina de stripe, la frase
    // sale en gris oscuro sobre el bloque gris-azulado del calibrador y el fondo violeta del aire
    // editorial (cuadros 260 y 320 del video de 20 s).
    //
    // SE ROTA, NO SE MULTIPLICA, que es lo que este mismo archivo ya decide para los juegos de datos:
    // el producto cartesiano seria 17 veces mas caro y esta compuerta ya construye ~2800 escenas. Con
    // 7 paginas x 11 aires hay 77 pasadas y 17 heroes, asi que cada hero se prueba cuatro o cinco veces
    // contra mundos y copys distintos.
    for (const [idEsc, mod] of MOD) {
      const heroForzado = idEsc === 'hero' && IDS_HEROES.length
        ? IDS_HEROES[(_iHero++) % IDS_HEROES.length]
        : null
      const W = 1080, H = 1920, fov = 42
      const distBase = 9
      const mundoH = 2 * distBase * Math.tan((fov * Math.PI) / 360)
      const mundoW = mundoH * (W / H)
      let s = 7
      const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
      const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
      camera.position.set(0, 0, distBase)
      let salida
      try {
        salida = await mod.build({
          THREE, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
          fondo: { uT: { value: 0 }, uGrilla: { value: 0.55 }, uPulso: { value: 0 }, uA: { value: new THREE.Color(a.paleta.bg) }, uB: { value: new THREE.Color(a.paleta.bg2) } },
          pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
          bloom: { strength: 0.85, radius: 0.62, threshold: (aire.pelicula || {}).umbral ?? 0.62 },
          texturas: tejido(datos.elementos || []), datosEls: datos.elementos || [],
          spec: { tiraViewport: 1560, aire: nombreAire, ...(heroForzado ? { hero: heroForzado } : {}) },
          claro: a.claro, repeticion: 0,
        })
      } catch { continue }
      if (!salida || salida.vacia) continue

      // SE MIDE A MITAD DE ESCENA, NO EN EL CUADRO 0. Esto lo enseño el primer FAIL de esta compuerta:
      // acusaba a `marquesina` 324 veces diciendo que su cinta estaba sobre el fondo del mundo. Mentira
      // — esta sobre una cama de color, pero la cama arranca en `scale.x = 0.001` porque SE ANIMA AL
      // ENTRAR (marquesina.js:162). En el cuadro 0 no tiene ancho, no solapa con el texto, y la
      // compuerta concluia que no habia nada detras.
      //
      // O sea que estaba midiendo la composicion ANTES de que se arme. La composicion que se ve es la
      // de mitad de escena, asi que ahi hay que mirar: se seekea la linea de tiempo como hace
      // `verificar.mjs` y recien despues se leen las cajas.
      try {
        if (salida.tl && salida.tl.duration()) salida.tl.time(salida.tl.duration() * 0.5, false)
      } catch { /* una escena sin linea de tiempo se mide como esta */ }
      for (const r of [salida.g, salida.gr].filter(Boolean)) r.updateMatrixWorld(true)
      construidas++
      const raiz = [salida.g, salida.gr].filter(Boolean)
      const mallas = []
      for (const r of raiz) r.traverse(o => { if (o.isMesh) mallas.push(o) })
      const tapas = mallas.map(m => ({ m, col: esTapa(m), c: caja(m) })).filter(t => t.col && t.c)
      for (const m of mallas) {
        const map = m.material && !Array.isArray(m.material) && m.material.map
        if (!(map && map.userData && map.userData.esTexto)) continue
        const col = colorTexto(m)
        const c = caja(m)
        if (!col || !c) continue

        // LO QUE NO ENTRA EN EL CUADRO NO SE JUZGA. Esto lo enseño el segundo FAIL: `marquesina` salia
        // acusada 34 veces por textos "sobre el fondo del mundo". Su cinta es una tira LARGA que se
        // desliza, asi que en cualquier instante la mayoria de sus frases esta fuera de pantalla — no
        // solapan la cama porque estan a ocho unidades del centro, y la compuerta juzgaba la
        // legibilidad de algo que nadie ve.
        //
        // Es la misma familia de error que medir en el cuadro 0: juzgar un estado que no es el que se
        // mira. El cuadro util es mundoW x mundoH centrado en el origen.
        if (c.x1 < -mundoW / 2 || c.x0 > mundoW / 2 || c.y1 < -mundoH / 2 || c.y0 > mundoH / 2) continue
        textos++
        // La tapa mas cercana POR DETRAS que solape. `depthWrite:false` es lo normal en este motor, asi
        // que el orden real lo da la z.
        let atras = null
        for (const t of tapas) {
          if (t.m === m || t.c.z >= c.z || !tapaDeVerdad(t.c, c)) continue
          if (!atras || t.c.z > atras.c.z) atras = t
        }
        const fondos = atras ? [atras.col] : [a.paleta.bg, a.paleta.bg2]
        if (atras) sobreBanda++
        const peor = Math.min(...fondos.map(f => contraste(col, f)))
        if (peor < piso - 0.05) {
          F(`${idPag} × ${nombreAire} · ${idEsc}: un texto en ${col} sobre `
            + `${atras ? `una banda ${atras.col}` : `el fondo ${fondos.join('/')}`} da ${peor.toFixed(2)}:1, `
            + `hace falta ${piso}`)
          // El detalle no va en el mensaje normal —serian 500 renglones ilegibles— pero hace falta para
          // ARREGLAR: sin saber donde esta el texto y que tamaño tiene la banda, no se sabe cual de las
          // veinte piezas de la escena es.
          if (process.env.FONDO_DETALLE) {
            console.error(`    texto ${col} en (${c.x0.toFixed(2)}..${c.x1.toFixed(2)}, `
              + `${c.y0.toFixed(2)}..${c.y1.toFixed(2)}) z ${c.z.toFixed(2)} · alto ${(c.y1 - c.y0).toFixed(2)}`
              + (atras ? ` || banda ${atras.col} de ${(atras.c.x1 - atras.c.x0).toFixed(2)}x`
                + `${(atras.c.y1 - atras.c.y0).toFixed(2)} en z ${atras.c.z.toFixed(2)}` : ''))
          }
        }
      }

      // SOLTAR LA ESCENA, Y OBLIGAR A RECOLECTAR. Esto es lo que faltaba y colgo la maquina.
      //
      // Esta compuerta construye ~2800 escenas, y cada una rasteriza sus textos en canvas que pueden
      // medir 4000 px de ancho: unos 3 MB cada uno. La cuenta da decenas de GB, y Windows la anoto sin
      // que quedara duda — `node.exe` en 52, 58 y 60 GB (evento 2004) en una maquina de 15.
      //
      // Lo contraintuitivo, y por eso costo caro: soltar las referencias NO ALCANZA. La memoria de un
      // canvas de @napi-rs vive FUERA del monton de JavaScript, asi que V8 no la siente, no le genera
      // presion y no corre una recoleccion mayor. El monton se ve chiquito y feliz mientras el proceso
      // reserva 60 GB. Es la misma familia que la fuga de `getImageData` del 26 de julio.
      //
      // Por eso hay que hacer las tres cosas: soltar las texturas, vaciar el cache de `texto()` —que es
      // quien retiene los canvas— y PEDIR la recoleccion a mano. Sin la tercera, las dos primeras solo
      // dejan basura que nadie levanta.
      for (const r of raiz) {
        r.traverse((o) => {
          if (!o.isMesh) return
          o.geometry?.dispose?.()
          for (const mt of (Array.isArray(o.material) ? o.material : [o.material])) {
            if (!mt) continue
            const tex = mt.map || mt.uniforms?.map?.value
            if (tex) { tex.image = null; tex.dispose?.() }
            mt.dispose?.()
          }
        })
      }
      salida.tl?.kill?.()
      if (++porLimpiar >= 8) {
        porLimpiar = 0
        limpiarCache()
        global.gc?.()                                  // node --expose-gc; ver la nota de arriba
        // La huella se INFORMA cada tanto. Una compuerta que ya colgo la maquina una vez no puede
        // volver a correr a ciegas: si el numero sube sin parar, se ve en el acto y no tres horas
        // despues en el registro de Windows.
        if (++_traza % 40 === 0) {
          const u = usoMb()
          process.stderr.write(`  [${construidas} escenas · ${u.rss} MB reservados, ${u.externo} MB fuera del monton]
`)
        }
      }
    }
  }
}

// Se agrupan: un mismo defecto sale en decenas de combinaciones y una lista de 500 lineas no se lee.
if (fallos.length) {
  const porEscena = new Map()
  for (const f of fallos) {
    const k = f.split('·')[1].split(':')[0].trim()
    const q = porEscena.get(k) || { n: 0, ej: f }
    q.n++
    porEscena.set(k, q)
  }
  console.log(`GATE FONDO FAIL — ${fallos.length} textos ilegibles sobre lo que tienen detras:`)
  for (const [esc, q] of [...porEscena].sort((x, y) => y[1].n - x[1].n)) {
    console.log(`  ${esc}: ${q.n} casos`)
    console.log(`    ej: ${q.ej}`)
  }
  process.exit(1)
}
// EL MENSAJE DICE EL ALCANCE REAL, no el nominal. Con `FONDO_PAGINAS=3 FONDO_AIRES=5` esto informaba
// "7 paginas x 11 aires" igual, o sea presumia una cobertura que no corrio. Un OK que exagera lo que
// midio es la forma mas barata de que una compuerta mienta.
const parcial = _paginas < FIX.length || _aires < Object.keys(AIRES).length
console.log(`GATE FONDO OK — ${textos} textos medidos en ${construidas} construcciones `
  + `(${_paginas} paginas × ${_aires} aires × ${MOD.size} escenas): cada uno contrasta con lo que `
  + `tiene DETRAS, que en ${sobreBanda} casos es una banda de color y no el fondo del mundo.`)
if (parcial) {
  console.log(`  OJO: BARRIDO PARCIAL (FONDO_PAGINAS/FONDO_AIRES). El completo es `
    + `${FIX.length} x ${Object.keys(AIRES).length}.`)
}
