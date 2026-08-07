// INVENTARIO DE `encaja` — que mallas muestran una imagen y cual declara si tiene que entrar entera.
//
// POR QUE EXISTE. `encuadre-check` exige contencion total SOLO a las mallas que declaran
// `userData.encaja`, y hoy las declara una minoria. El resto no es que este permitido sangrar: es que
// nadie decidio. La diferencia importa, porque una malla que muestra el logo del cliente cortado por
// la mitad es un defecto y una banda decorativa que sangra es composicion.
//
// El camino decidido (lo propuso un critico adversario y es mejor que exigir contencion universal):
// INVERTIR EL DEFAULT. Que cada malla con imagen declare `encaja` o `sangra`, y que la compuerta falle
// sobre la malla SIN CLASIFICAR en vez de sobre la geometria. Eso convierte un juicio de composicion
// caso por caso —caro, subjetivo, imposible de revisar— en una tarea mecanica archivo por archivo.
//
// Esto NO es una compuerta: no falla nunca. Es el censo que dice cuanto trabajo hay y donde.
//
// Uso:  node tools/encaja-inventario.mjs            (resumen por escena)
//       node tools/encaja-inventario.mjs --detalle  (una linea por malla)
//       node tools/encaja-inventario.mjs --json     (para que otra herramienta lo lea)
import { createCanvas } from '@napi-rs/canvas'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const DIRS = [join(DEMO, 'escenas'), join(DEMO, 'heroes')]

// EL MISMO ARNES QUE `encuadre-check`, y por la misma razon que documenta `eco-check`: una escena
// construida sin fuentes ni texturas se declara `vacia` y queda SIN MEDIR, mientras el inventario
// informa cero mallas y parece que no hay trabajo. Es el cero tranquilizador de siempre.
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
const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}

// DE DONDE SALE CADA MALLA. Sin esto el censo lista 59 filas que dicen "(sin nombre) SIN CLASIFICAR" y
// clasificarlas seria adivinar: las escenas casi nunca le ponen `name` a sus mallas. Se intercepta la
// construccion y se guarda la cadena de llamadas recortada a los archivos del motor, asi cada fila
// dice el archivo y la linea que la creo — que es exactamente lo que hay que ir a editar.
//
// La espia EXTIENDE Mesh en vez de reemplazarlo, asi que todo `instanceof THREE.Mesh` de three sigue
// dando true. Y se pasa a las escenas una COPIA del namespace con la espia adentro, porque los modulos
// ES son de solo lectura y `THREE.Mesh = ...` tira TypeError.
const _MeshReal = THREE.Mesh
class _MeshEspia extends _MeshReal {
  constructor(...a) {
    super(...a)
    const st = (new Error().stack || '').split('\n').slice(2)
    const dentro = st
      .filter(l => /render3d[\\/]demo[\\/]/.test(l))
      .slice(0, 3)
      .map(l => {
        const m = l.match(/render3d[\\/]demo[\\/](.+?):(\d+):\d+/)
        return m ? `${m[1].replace(/\\/g, '/')}:${m[2]}` : null
      })
      .filter(Boolean)
    if (dentro.length) this.userData._origen = dentro.join(' <- ')
  }
}
const THREE_ESPIA = { ...THREE, Mesh: _MeshEspia }

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

// CUANTO MATERIAL RECIBE EL CENSO. Se declara, pero NO por lo que yo supuse: escribi que "el censo
// escala con el material porque varias escenas crean una malla por recorte" y la medicion lo refuto —
// con 5 recortes y con 12 el resultado es el MISMO, 68 mallas con imagen. Las escenas toman un cupo
// fijo, no todo lo que les den. Se deja en 12 (el maximo real del repo, stripe.com) porque es el peor
// caso y no cuesta nada, pero queda dicho que el numero no depende de esto.
const N_ELS = Number(process.env.ENCAJA_ELS || 12)
const _AR = [2.4, 1.0, 0.6, 3.4, 1.35, 1.8, 0.75, 2.0, 1.2, 3.0, 0.9, 1.5]
const RELACIONES = Array.from({ length: N_ELS }, (_, i) => _AR[i % _AR.length])
const _ROLES = ['logo', 'tarjeta', 'foto', 'cta', 'tarjeta', 'foto', 'cta', 'tarjeta', 'foto', 'tarjeta', 'foto', 'cta']
const ELS = Array.from({ length: N_ELS }, (_, i) => ({ rol: _ROLES[i % _ROLES.length], url: 'f' + i }))

// LOS JUEGOS DE DATOS REALES. El copy cambia cuantos renglones escribe cada escena, y el texto se
// dibuja en un canvas que llega como textura, asi que el juego SI puede mover el conteo.
const { datosDe } = await import(pathToFileURL(join(RAIZ, 'tools', 'anthem-datos.mjs')).href)
const { normalizePageModel } = await import(pathToFileURL(join(RAIZ, 'src', 'director', 'core', 'schema.js')).href)
const JUEGOS = [{ nombre: 'ANTHEM', datos: ANTHEM }]
{
  const dirFix = join(RAIZ, 'tools', 'fixtures', 'director', 'elementos')
  if (existsSync(dirFix)) {
    for (const f of readdirSync(dirFix).filter(x => x.endsWith('.json')).sort()) {
      try {
        const pm = normalizePageModel(JSON.parse(readFileSync(join(dirFix, f), 'utf8')))
        JUEGOS.push({ nombre: f.replace('.json', ''), datos: datosDe(pm) })
      } catch { /* un fixture que no convierte no puede tirar el censo abajo */ }
    }
  }
}

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

function rutaDe(id) {
  for (const d of DIRS) { const r = join(d, `${id}.js`); if (existsSync(r)) return r }
  return null
}

const ids = [...new Set(DIRS.flatMap(d => (existsSync(d)
  ? readdirSync(d).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.replace('.js', ''))
  : [])))].sort()

// UN SOLO AIRE ALCANZA, y esto SI esta medido en vez de supuesto — la primera version afirmaba que "el
// aire no cambia que mallas existen" y es falso a medias: el TOTAL se mueve entre 726 y 796 segun el
// aire (cambian los ornamentos). Lo que no se mueve es lo unico que le importa a este censo: las
// mallas CON IMAGEN dan exactamente 68 en artesanal, editorial, inmobiliario, tecnico y jugueton.
// `encuadre-check` si barre los once, porque lo que ella mide —si la malla SE SALE— depende de la
// camara, y la camara la pone el aire.
const AIRE = process.env.ENCAJA_AIRE || Object.keys(AIRES)[0]
configurar(AIRES[AIRE])

async function censarEscena(id, juego) {
  const ruta = rutaDe(id)
  if (!ruta) return null
  let mod
  try { mod = await import(pathToFileURL(ruta).href) } catch (e) { return { error: `no importa — ${e.message}` } }
  if (!mod.meta || typeof mod.build !== 'function') return null

  reiniciarReparto()
  reiniciarRecortes()
  configurarDatos(juego.datos)
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
  camera.position.set(0, 0, distBase)
  let semilla = 1
  const rnd = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296 }
  const uni = () => ({ uT: { value: 0 }, uGrilla: { value: 0.55 }, uPulso: { value: 0 }, uA: { value: new THREE.Color(LOOK.bg) }, uB: { value: new THREE.Color(LOOK.bg2) } })
  let r
  try {
    r = await mod.build({
      THREE: THREE_ESPIA, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
      fondo: uni(),
      pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
      bloom: { strength: 0.85, radius: 0.62, threshold: 0.62 },
      texturas: tejidoFalso(RELACIONES),
      datosEls: ELS,
      spec: { tiraViewport: 1560 }, claro: false, repeticion: 0,
    })
  } catch (e) { return { error: `build lanzo — ${e.message}` } }
  if (!r || !r.g) return null

  // SE RECORRE LA LINEA DE TIEMPO ENTERA, no un instante: varias escenas CREAN mallas dentro de la
  // linea de tiempo, asi que cualquier instante unico cuenta de menos. Se deduplica por IDENTIDAD DE
  // OBJETO (el Set guarda la referencia), que es lo unico fiable — la mayoria de las mallas no tienen
  // `name`, y deduplicar por nombre colapsa la escena entera en una fila. Paso: el censo se derrumbo
  // de 736 mallas a 57 y el numero parecia plausible.
  const vistos = new Set()
  const filas = []
  const dur = (() => { try { return r.tl.duration() } catch { return 0 } })()
  const N = dur > 0 ? 30 : 0
  for (let i = 0; i <= N; i++) {
    if (dur > 0) { try { r.tl.time((i / N) * dur, false) } catch { /* sin tl no se rompe */ } }
    for (const raiz of [r.g, r.gr]) {
      if (!raiz) continue
      raiz.updateWorldMatrix(true, true)
      raiz.traverse(o => {
        if (!o.isMesh || vistos.has(o)) return
        vistos.add(o)
        // LA PREGUNTA ES SI MUESTRA UNA IMAGEN. El texto tambien se dibuja en un canvas, asi que esto
        // incluye texto a proposito: un titular cortado por el borde es tan defecto como un logo
        // cortado, y la clasificacion tiene que decidir sobre los dos.
        //
        // Y NO ALCANZA CON `.map`, aunque el comentario que estaba aca decia que el texto "llega como
        // map". Llega asi el que dibuja `planoTexto`; el que REVELA un barrido no. `materialMascara`
        // —que usan 19 de las 20 escenas— y el `matWipe` de `tipografia` son ShaderMaterial escritos a
        // mano y llevan la textura en `uniforms.map.value`. Lo mismo la tira en `telefono`, `ventana` y
        // `portatil`. Contarlas como "sin imagen" hacia que este censo informara de menos.
        //
        // Es el mismo punto ciego encontrado el mismo dia en `heroes-audit` (decia "muestra: no" para
        // tres heroes que muestran), en `nitidez-inventario` (los dejaba fuera de la medicion Y de la
        // lista de faltantes) y en `fondo-check` (ahi es una COMPUERTA: ver docs/HEROES-AUDIT.md).
        //
        // NO CAMBIA EL VEREDICTO DE `encaja-check`, y conviene saberlo: esa compuerta mira `clase`, que
        // sale de `userData` y no de aca. Esto corrige un numero que se informa, no una regla.
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        const conMapa = mats.some(m => m && (m.map
          || (m.uniforms && Object.keys(m.uniforms).some(k => {
            const v = m.uniforms[k] && m.uniforms[k].value
            return v && v.isTexture
          }))))
        const u = o.userData || {}
        const clase = u.encaja ? 'encaja' : (u.sangra ? 'sangra' : (u.relleno ? 'relleno' : 'SIN CLASIFICAR'))
        filas.push({ escena: id, malla: o.name || '(sin nombre)', clase, conMapa, rol: u.rol || '', tipo: u.tipoImagen || '(sin tipo)', origen: u._origen || '(lo crea el kit)' })
      })
    }
  }
  return { filas }
}

// SE CENSA CADA ESCENA CON CADA JUEGO Y SE GUARDA EL PEOR CASO — el juego que mas mallas con imagen le
// saca. No se intenta unir las mallas de distintos juegos por identidad: son objetos de
// construcciones distintas y no hay clave estable que las relacione. El maximo es la respuesta
// correcta a "cuantas mallas hay que clasificar en este archivo".
const peorPorEscena = new Map()
const rotos = []
for (const juego of JUEGOS) {
  for (const id of ids) {
    const res = await censarEscena(id, juego)
    if (!res) continue
    if (res.error) { rotos.push(`${id} [${juego.nombre}]: ${res.error}`); continue }
    const conImagen = res.filas.filter(f => f.conMapa).length
    const prev = peorPorEscena.get(id)
    if (!prev || conImagen > prev.conImagen) {
      peorPorEscena.set(id, { conImagen, juego: juego.nombre, filas: res.filas })
    }
  }
}

const filas = [...peorPorEscena.values()].flatMap(v => v.filas)
const conImagen = filas.filter(f => f.conMapa)
const total = conImagen.length
const porClase = {}
for (const f of conImagen) porClase[f.clase] = (porClase[f.clase] || 0) + 1
const sinClasificar = conImagen.filter(f => f.clase === 'SIN CLASIFICAR')

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    aire: AIRE, juegos: JUEGOS.map(j => j.nombre), total, porClase,
    porEscena: [...peorPorEscena].map(([id, v]) => ({ escena: id, conImagen: v.conImagen, peorJuego: v.juego })),
    filas: conImagen, rotos,
  }, null, 1))
} else {
  console.log(`INVENTARIO DE ENCAJE — aire "${AIRE}", ${ids.length} escenas/heroes x ${JUEGOS.length} juegos de datos (se guarda el peor caso de cada escena)`)
  console.log(`  mallas en total: ${filas.length}   ·   con imagen: ${total}   ·   sin imagen: ${filas.length - total}`)
  for (const [k, v] of Object.entries(porClase).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(16)} ${String(v).padStart(4)}   ${(100 * v / Math.max(1, total)).toFixed(1)}%`)
  }
  const porTipo = {}
  for (const f of conImagen) porTipo[f.tipo] = (porTipo[f.tipo] || 0) + 1
  console.log('  por tipo:')
  for (const [k, v] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(16)} ${String(v).padStart(4)}`)
  }
  const porEscena = new Map()
  for (const f of sinClasificar) porEscena.set(f.escena, (porEscena.get(f.escena) || 0) + 1)
  if (porEscena.size) {
    console.log(`\n  sin clasificar, por archivo (${porEscena.size} archivos):`)
    for (const [e, n] of [...porEscena].sort((a, b) => b[1] - a[1])) {
      const v = peorPorEscena.get(e)
      console.log(`    ${e.padEnd(18)} ${String(n).padStart(3)}   (peor juego: ${v ? v.juego : '?'})`)
    }
  }
  if (process.argv.includes('--detalle')) {
    console.log('\n  detalle (solo las que muestran imagen):')
    for (const f of conImagen) {
      console.log(`    ${f.escena.padEnd(14)} ${f.tipo.padEnd(10)} ${f.clase.padEnd(16)} ${f.origen}`)
    }
  }
  if (rotos.length) {
    console.log(`\n  NO SE PUDIERON CONSTRUIR (${rotos.length}) — quedan fuera del censo, o sea que el numero de arriba es un PISO:`)
    for (const r of rotos.slice(0, 12)) console.log(`    ${r}`)
  }
}
