// GATE DE ENCUADRE: lo que una escena anima tiene que VERSE.
//
// POR QUE EXISTE, y es el mejor ejemplo que dio este repo de un defecto que ninguna compuerta veia.
//
// Una revision adversarial encontro que la pauta de compas que se le habia agregado a la escena del
// toro NO SE VEIA NUNCA: proyectada cuadro por cuadro, quedaba fuera del encuadre desde el beat 0.25
// hasta el 4.25 y entraba recien en el 4.50, justo cuando se le manda encoger. Sus SEIS eventos —la
// entrada y cinco saltos sobre el beat— pasaban todos por debajo del borde inferior. El verificador
// estaba en verde: la escena se construia, la timeline duraba lo que debia, la camara volvia y nada
// descansaba mas de un beat. Todo cierto, y el espectador no veia nada.
//
// El error de quien lo escribio fue razonable: midio contra el cuadro EN REPOSO. Pero el toro es la
// unica escena que ORBITA y REAPUNTA la camara, asi que su encuadre real nunca coincide con el de
// reposo. Y despues volvio a pasar, en otro archivo y con otra forma: la cuña de color del mundo claro
// se puso en coordenadas del plano de fondo, que mide 2.6x el cuadro, y caia entera fuera de campo.
// Se noto por casualidad — las metricas con cuña y sin cuña salieron identicas hasta el ultimo decimal.
//
// Dos veces el mismo defecto en dos semanas es una compuerta que falta.
//
// QUE MIDE
// Construye cada escena, recorre su timeline a 30 fps con la CAMARA QUE LA ESCENA MUEVE, y proyecta la
// caja de cada malla al espacio de recorte. Para cada objeto calcula cuantos cuadros estuvo, aunque
// sea parcialmente, dentro del encuadre.
//
//   E-ENCUADRE-NUNCA   un objeto visible que no entra en el cuadro en NINGUN momento
//   E-ENCUADRE-CASI    un objeto que entra en menos del 12% de los cuadros en que esta visible
//
// LO QUE NO ES UN DEFECTO, y por eso hay excepciones explicitas:
// · Un objeto APAGADO (`visible: false`) no cuenta: estar fuera de cuadro esperando su turno es
//   exactamente como se compone una escena.
// · Los fondos, telones y halos DESBORDAN el cuadro a proposito — su caja proyectada siempre cruza el
//   encuadre, asi que pasan solos.
// · Una escena puede tener piezas que entran y salen; por eso el umbral se mide sobre los cuadros en
//   que el objeto esta ENCENDIDO, no sobre la escena entera.
//
// Uso:  node tools/encuadre-check.mjs [id ...]
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { freemem } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..')
const DEMO = join(RAIZ, 'render3d', 'demo')
const DIRS = [join(DEMO, 'escenas'), join(DEMO, 'heroes')]
// SE REGISTRAN CON EL NOMBRE QUE EL MOTOR PIDE. `loadFontsFromDir` las registra por su familia interna
// ("DM Sans" con espacio) y el motor las pide por nombre de archivo ('DMSans'), asi que NINGUNA
// matcheaba salvo Anton —por casualidad, su familia interna se llama igual—. Medido: Oswald-700 mide 837
// y Archivo-900 mide 1167 sobre el mismo texto, un 39% de diferencia, y esta compuerta las medía a las
// dos con la cara de reserva. Ver tools/fuentes-reales.mjs.
const { registrarFuentes } = await import('./fuentes-reales.mjs')
registrarFuentes(RAIZ)

function lienzo(w = 4, h = 4) { return createCanvas(w, h) }
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? lienzo() : { style: {} }),
  getElementById: () => lienzo(),
  // `add`, el iterador y `check` los necesitan los modulos de aire, que registran sus tipografias al
  // importarse. Sin ellos `[...document.fonts]` explota y el barrido no arranca.
  fonts: { ready: Promise.resolve(), load: async () => {}, add() {}, check: () => true, *[Symbol.iterator]() {} },
}
globalThis.FontFace = class { constructor(f) { this.family = f } async load() { return this } }
globalThis.window = globalThis
console.warn = () => {}
// Por `dist/` y no por `index.js`: ver la nota larga en render3d/demo/verificar.mjs. En resumen,
// `index.js` es ESM sin `"type": "module"` en el package de gsap -> Node lo lee como CJS y la
// compuerta ni arranca; y `dist/` es el build que el render sirve de verdad (/gsap.min.js).
const { gsap } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'gsap', 'dist', 'gsap.js')).href)
globalThis.gsap = gsap
const THREE = await import(pathToFileURL(join(RAIZ, 'node_modules', 'three', 'build', 'three.module.js')).href)
const { BEAT, LOOK, b, configurar, reiniciarRecortes } = await import(pathToFileURL(join(DEMO, 'kit.js')).href)
// LOS ONCE AIRES, NO SOLO EL DEFAULT. Esta compuerta construia siempre con la configuracion de ANTHEM,
// asi que era CIEGA a todo lo que el aire cambia: la tipografia (una display ancha ocupa mas renglon),
// el ritmo (el bpm cambia la duracion y con ella cuanto recorre cada tween) y —desde que `camara` esta
// cableada— cuanto se mueve la camara, que va de 0.4 a 1.55 en dolly y de 0.35 a 1.3 en orbita. Con
// dolly 1.55 la camara se acerca un 55% mas que en la linea de base: si algo se sale del cuadro, se
// sale ahi y no en tecnico. Auditar ese cableado sin barrer los aires seria auditar el caso que no falla.
const AIRES = {}
for (const f of readdirSync(join(DEMO, 'aires')).filter(f => f.endsWith('.js'))) {
  AIRES[f.replace('.js', '')] = (await import(pathToFileURL(join(DEMO, 'aires', f)).href)).default
}
// ENCUADRE_AIRE=nombre limita el barrido a UN aire, y existe para poder correr el cartesiano.
//
// El producto completo son 3256 construcciones y en un solo proceso NO ENTRA: medido, revienta con
// "Create skia surface failed" a mitad del barrido. No es un defecto de composicion — es la fuga
// conocida de `texto()`, que compromete memoria que la libreria nativa de canvas no devuelve nunca.
// Es la misma razon por la que `fondo-check`, `tira-check` y `eco-check` se parten en procesos "para
// que la memoria vuelva al sistema".
//
// Con esto, el cartesiano se corre en once tandas de ~300 construcciones cada una:
//   for a in artesanal bienestar ...; do ENCUADRE_CARTESIANO=1 ENCUADRE_AIRE=$a node tools/encuadre-check.mjs; done
if (process.env.ENCUADRE_AIRE) {
  const soloEste = process.env.ENCUADRE_AIRE
  if (!AIRES[soloEste]) {
    console.error(`ENCUADRE: el aire "${soloEste}" no existe. Hay: ${Object.keys(AIRES).join(', ')}`)
    process.exit(2)
  }
  for (const k of Object.keys(AIRES)) if (k !== soloEste) delete AIRES[k]
}
const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(DEMO, 'datos.js')).href)

// EL CONTENIDO TAMBIEN SE BARRE, NO SOLO LOS AIRES.
//
// Esta compuerta documenta con orgullo que recorre los once aires, y recorria UN SOLO juego de datos:
// el fixture ANTHEM, cuya frase mas larga tiene 19 caracteres. Convertidos los 7 pagemodels REALES que
// ya estan en el repo, la frase mas larga es de 121 — seis veces mas. O sea que la compuerta auditaba
// la tipografia con el copy mas corto que el motor va a ver en su vida.
//
// SE ROTA, NO SE MULTIPLICA. El producto cartesiano (8 juegos x 11 aires x 37 escenas) son 3256
// construcciones y ~55 segundos, y esta es una de las rapidas: ese no es su presupuesto. Rotando
// —cada aire recibe un juego distinto— el costo queda igual (407 construcciones, ~7 s) y se ejercitan
// las dos dimensiones en vez de una.
//
// Y CONVIENE SABER QUE HOY NO CAMBIA EL VEREDICTO, medido: los 7 juegos reales pasan los 7, y el
// conteo de mallas con textura que no entran enteras se mueve un 2% (38432 con ANTHEM, 39241 con
// stripe). No puede ser de otra manera: esta compuerta pregunta si la caja CRUZA el cuadro, no si
// entra entera, asi que el largo del copy no tiene por donde hacerla fallar. Esto es cobertura para el
// dia que alguien toque el encaje, no el arreglo de un defecto de hoy.
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
      } catch { /* un fixture que no convierte no puede tirar la compuerta abajo */ }
    }
  }
}

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

// ENCUADRE_ORIGEN=1 — QUE LA COMPUERTA DIGA CUAL MALLA, no "una malla".
//
// El mensaje de E-ENCAJE-REAL dice "una malla marcada `encaja` se sale del cuadro", y con eso alcanza
// para saber que hay un problema y no para arreglarlo: las mallas de este motor no tienen nombre, y
// una escena como `tarjetas` tiene veintiuna. Clasificando el atraso de `encaja-check` aparecieron
// siete fallos de golpe en cuatro escenas y no habia forma de saber cual de cada grupo era, asi que la
// unica salida era revertir el archivo entero y perder tambien lo que si estaba bien.
//
// Con esta bandera cada Mesh anota en que archivo y linea se construyo —la misma tecnica que ya usa
// `encaja-inventario`, leyendo la pila en el constructor— y el fallo lo dice.
//
// ES OPT-IN A PROPOSITO: capturar una pila por malla son ~300.000 pilas en las 407 construcciones, y
// esta es una de las compuertas rapidas (9 s). Se paga solo cuando hace falta diagnosticar.
const _ORIGEN = !!process.env.ENCUADRE_ORIGEN
class _MeshEspia extends THREE.Mesh {
  constructor(...a) {
    super(...a)
    const st = (new Error().stack || '').split('\n').slice(2)
    const dentro = st
      .filter(l => /render3d[\\/]demo[\\/]/.test(l))
      .slice(0, 2)
      .map(l => {
        const m = l.match(/render3d[\\/]demo[\\/](.+?):(\d+):\d+/)
        return m ? `${m[1].replace(/\\/g, '/')}:${m[2]}` : null
      })
      .filter(Boolean)
    if (dentro.length) this.userData._origen = dentro.join(' <- ')
  }
}
const THREE_ESC = _ORIGEN ? { ...THREE, Mesh: _MeshEspia } : THREE

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [...new Set(DIRS.flatMap(d => (existsSync(d)
    ? readdirSync(d).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.replace('.js', ''))
    : [])))]

const fallos = []
const rutaDe = (id) => {
  for (const d of DIRS) { const r = join(d, `${id}.js`); if (existsSync(r)) return r }
  return join(DIRS[0], `${id}.js`)
}

// INTERSECCION CAJA-FRUSTUM, no contencion de vertices.
//
// La primera version proyectaba los ocho vertices y preguntaba si ALGUNO caia dentro del cuadro. Eso
// da falso para todo lo que es MAS GRANDE que el encuadre: una banda a sangre de 6.2 de ancho en un
// cuadro de 5.63 tiene sus cuatro esquinas afuera y ocupa la pantalla entera. La compuerta acuso 29
// defectos inexistentes en su primera corrida, todos de piezas perfectamente centradas en el origen.
//
// Lo que hay que preguntar no es "esta un vertice adentro" sino "se cruzan la caja y el frustum", que
// es una prueba distinta y three ya la trae. La diferencia importa justo en los casos que este motor
// usa mas: sangrar por los bordes es una decision de composicion repetida en media docena de escenas.
const _frustum = new THREE.Frustum()
function enCuadro(obj, caja, m) {
  caja.setFromObject(obj)
  if (caja.isEmpty()) return false
  _frustum.setFromProjectionMatrix(m)
  return _frustum.intersectsBox(caja)
}

// E-ENCAJE-REAL: CONTENCION, no interseccion. `enCuadro` pregunta si la caja TOCA el cuadro, y con eso
// un renglon que se sale por la derecha da true igual —le basta que un pixel entre—. Es el punto ciego
// que el handoff documenta y por el que dos textos salieron cortados con la compuerta en verde.
//
// Para las mallas que la escena marco `userData.encaja` la exigencia es otra: entran ENTERAS o es un
// defecto. Se proyectan los ocho vertices de la caja y se pide |x| <= 1 y |y| <= 1 en todos.
const _cajaE = new THREE.Box3()
const _vE = new THREE.Vector3()
function entraEntera(obj, m) {
  _cajaE.setFromObject(obj)
  if (_cajaE.isEmpty()) return { ok: true, x: 0, y: 0 }
  let mx = 0, my = 0
  for (let i = 0; i < 8; i++) {
    _vE.set(i & 1 ? _cajaE.max.x : _cajaE.min.x, i & 2 ? _cajaE.max.y : _cajaE.min.y, i & 4 ? _cajaE.max.z : _cajaE.min.z)
    _vE.applyMatrix4(m)
    mx = Math.max(mx, Math.abs(_vE.x)); my = Math.max(my, Math.abs(_vE.y))
  }
  // 1.5% de tolerancia: el antialias de un canto no es un texto cortado.
  return { ok: mx <= 1.015 && my <= 1.015, x: mx, y: my }
}

let revisados = 0
const _push = fallos.push.bind(fallos)
let _iJuego = 0
for (const [nombreAire, aire] of Object.entries(AIRES)) {
  // El juego rota con el aire: el primero con ANTHEM, el segundo con el primer fixture real, y asi.
  // ENCUADRE_CARTESIANO=1 BARRE TODAS LAS COMBINACIONES en vez de rotar. Rotar da 407 construcciones
  // y el producto completo 3256 — o sea que la compuerta cubre el 12.5%. La cabecera de arriba dice
  // que rotar "hoy no cambia el veredicto, medido", y eso se midio ANTES de que 71 mallas declararan
  // `encaja`: la compuerta ahora exige muchisimo mas que entonces, asi que el numero hay que
  // rehacerlo. No entra en la cadena —tarda ocho veces mas— pero se corre a mano cuando se toca el
  // encaje, que es justo cuando la diferencia podria aparecer.
  const juegosDeEstaVuelta = process.env.ENCUADRE_CARTESIANO ? JUEGOS : [JUEGOS[_iJuego++ % JUEGOS.length]]
  for (const juego of juegosDeEstaVuelta) {
 configurar(aire)
 // cada fallo dice en QUE aire aparecio: sin eso, "se sale del cuadro" no se puede reproducir
 fallos.push = (m) => _push(`${m}   [aire ${nombreAire} · datos ${juego.nombre}]`)
 for (const id of ids) {
  const ruta = rutaDe(id)
  if (!existsSync(ruta)) continue
  let mod
  try { mod = await import(pathToFileURL(ruta).href) } catch (e) { fallos.push(`${id}: no importa — ${e.message}`); continue }
  if (!mod.meta || typeof mod.build !== 'function') continue

  // EL MOSTRADOR SE REINICIA ENTRE CONSTRUCCIONES. Esta compuerta encadenaba 37 modulos x 11 aires con
  // el reparto SUCIO: cada escena recibia las frases y los recortes que quedaban despues de las 406
  // anteriores, o sea que ninguna se auditaba con el material que le va a tocar en una pieza real.
  // Verificado ejecutando el mismo orden: con el reparto sucio `titular` escribe 3 renglones y con el
  // limpio 4. Una compuerta que mide una composicion que el motor nunca va a producir no mide nada.
  // verificar.mjs SI las llama (lineas 239, 326 y 441) y main.js tambien (451-452); faltaba aca.
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
      THREE: THREE_ESC, gsap, look: LOOK, W, H, mundoW, mundoH, camera, distBase, rnd, BEAT, b,
      fondo: uni(),
      pelicula: { uT: { value: 0 }, uFlash: { value: 0 }, uGrano: { value: 0.055 }, uVinieta: { value: 0.9 }, uAberr: { value: 0.0022 } },
      bloom: { strength: 0.85, radius: 0.62, threshold: 0.62 },
      texturas: tejidoFalso([2.4, 1.0, 0.6, 3.4, 1.35]),
      datosEls: [{ rol: 'logo', url: 'f0' }, { rol: 'tarjeta', url: 'f1' }, { rol: 'foto', url: 'f2' },
        { rol: 'cta', url: 'f3' }, { rol: 'tarjeta', url: 'f4' }],
      spec: { tiraViewport: 1560 }, claro: false, repeticion: 0,
    })
  } catch (e) {
    // QUEDARSE SIN MEMORIA NO ES UN DEFECTO DE COMPOSICION, Y CONFUNDIRLOS ES PEOR QUE LAS DOS COSAS.
    //
    // `texto()` compromete pixeles que la libreria nativa de canvas no devuelve nunca —es la fuga que
    // este repo documenta en cinco lugares— y cuando se agotan, `createCanvas` tira "Create skia
    // surface failed". Eso llegaba aca y salia como `${id}: build lanzo`, o sea contado igual que "la
    // malla se sale del cuadro": la compuerta decia FAIL y el mensaje sonaba a defecto de la escena.
    //
    // Visto el 8/8/2026: con un juego cargado, `titular` y `toro` "fallaron" en `nocturno`. Volviendo a
    // correr con la maquina despejada, las 407 construcciones pasan sin tocar una linea. Una compuerta
    // que acusa a una escena por el estado de la maquina se aprende a ignorar, y despues no ve el
    // defecto de verdad.
    //
    // Se corta con exit 2 —ni verde ni rojo: NO SE PUDO MEDIR— que es la unica respuesta honesta.
    if (/skia surface|out of memory|Array buffer allocation|heap out of memory/i.test(e.message || '')) {
      console.error(`ENCUADRE: NO SE PUDO MEDIR — se acabo la memoria al construir "${id}" (${e.message}).`)
      console.error(`  Van ${revisados} construcciones de las ~${ids.length * Object.keys(AIRES).length}.`)
      console.error('  NO es un defecto de la escena: es la fuga de `texto()`, que compromete memoria que')
      console.error('  la libreria nativa de canvas no devuelve. Se corta en vez de acusar a la escena.')
      console.error(`  Disponible ahora: ${Math.round(freemem() / 1048576)} MB. Cerra`)
      console.error('  aplicaciones y volve a correr, o parti el barrido con ENCUADRE_AIRE=<aire>.')
      process.exit(2)
    }
    fallos.push(`${id}: build lanzo — ${e.message}`)
    continue
  }
  if (!r || !r.g) continue
  revisados++

  const dur = r.tl.duration() / (r.tl.timeScale() || 1)
  const N = Math.max(12, Math.round(dur * 30))
  const caja = new THREE.Box3()
  const cuenta = new Map()          // malla -> { visto, dentro, nombre }
  for (let i = 0; i <= N; i++) {
    r.tl.time((i / N) * r.tl.duration(), false)
    camera.updateMatrixWorld()
    // `updateMatrixWorld` NO actualiza `matrixWorldInverse`: eso lo hace el renderer justo antes de
    // dibujar, y aca no hay renderer. Sin esta linea la proyeccion usa una inversa vieja y TODO da
    // fuera de cuadro — la primera corrida de esta compuerta acuso 29 defectos que no existian, con
    // bandas perfectamente centradas en el origen. Una compuerta que acusa en falso cuesta mas que no
    // tenerla: se aprende a ignorarla y despues no ve el defecto de verdad.
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    camera.updateProjectionMatrix()
    const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    for (const raiz of [r.g, r.gr]) {
      if (!raiz) continue
      raiz.updateWorldMatrix(true, true)
      raiz.traverse(o => {
        if (!o.isMesh && !o.isPoints) return
        // Un objeto apagado o transparente no esta "en escena": no se le pide estar en cuadro.
        let vis = o.visible
        for (let p = o.parent; p && vis; p = p.parent) vis = p.visible
        const op = o.material && o.material.opacity != null ? o.material.opacity : 1
        if (!vis || op <= 0.02) return
        let e = cuenta.get(o)
        if (!e) { e = { visto: 0, dentro: 0 }; cuenta.set(o, e) }
        e.visto++
        if (enCuadro(o, caja, m)) e.dentro++
        if (o.userData && o.userData.encaja) {
          e.enc = true
          // "ENTRA ENTERA" NO SIEMPRE QUIERE DECIR "EN TODO CUADRO". Hay mallas que VUELAN hasta su
          // lugar: en `mosaico` los recortes entran desde fuera y se arman en formacion, y medido
          // sobre 101 instantes se salen entre 0.00-0.22 y 0.96-1.00 y en el 74% del medio no se sale
          // ninguna. Exigirles contencion durante el vuelo obliga a marcarlas `sangra`, y ahi se
          // pierde la proteccion en el tramo que importa — que es justo cuando el espectador las mira.
          //
          // `userData.encajaEntre = [a, b]` declara ese tramo en fracciones de la escena. Sin el, se
          // exige en todos los cuadros y nada cambia para las 12 mallas que ya lo declaraban.
          // Y EL TRAMO SE MIDE SOBRE LA VIDA VISIBLE DE LA MALLA, no sobre la escena. La primera
          // version lo media sobre la escena y no alcanzaba: en `tipografia` las mitades de la palabra
          // se componen y se van en el beat 1.5 de una escena de 8 —son la primera de TRES frases que
          // se suceden— asi que su tramo compuesto es el 8% de la escena y cualquier guardarrail
          // razonable lo rechaza, con razon: medido contra la escena entera, un 8% es indistinguible
          // de una rendija puesta para esquivar la compuerta.
          //
          // Contra su propia vida visible la pregunta se vuelve la correcta: "de todo el tiempo en que
          // se la ve, ¿entra entera en el tramo declarado?". Una malla efimera bien compuesta pasa; una
          // rendija sigue sin pasar, porque el guardarrail mira el tramo y no la escena.
          //
          // Las muestras se acumulan y se juzgan al final: en este punto todavia no se sabe cuantos
          // cuadros va a estar visible.
          const ent = o.userData.encajaEntre
          if (Array.isArray(ent) && ent.length === 2) e.tramo = ent
          // Y HAY UN TERCER CASO, que no es "entera" ni "sangra": entera EN UN EJE. Un feed vertical
          // como `columna` sube: sus recortes entran por abajo y salen por arriba, o sea que en alto
          // sangran por definicion — pero en ancho tienen que entrar enteros, y ese es justo el corte
          // que duele (un recorte cortado por los costados se lee mal; uno que asoma por abajo es el
          // gesto de la escena). Sin esta distincion la unica salida era marcarlo `sangra` y perder la
          // proteccion del ancho, que es la que importa.
          const eje = o.userData.encajaEje
          const r = entraEntera(o, m)
          e.eje = eje
          const excede = eje === 'x' ? r.x : eje === 'y' ? r.y : Math.max(r.x, r.y)
          ;(e.muestras || (e.muestras = [])).push(excede)
        }
      })
    }
  }

  if (process.env.DETALLE) {
    const caja2 = new THREE.Box3()
    r.tl.time(r.tl.duration() * 0.5, false)
    r.g.updateWorldMatrix(true, true); if (r.gr) r.gr.updateWorldMatrix(true, true)
    for (const [o, e] of cuenta) {
      if (e.dentro > e.visto * 0.12) continue
      caja2.setFromObject(o)
      const c = caja2.getCenter(new THREE.Vector3()), t = caja2.getSize(new THREE.Vector3())
      console.error(`   ${id} · ${o.geometry.type} centro(${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)}) `
        + `tam(${t.x.toFixed(1)} x ${t.y.toFixed(1)}) grupo=${r.gr && r.gr.getObjectById(o.id) ? 'gr' : 'g'} `
        + `dentro ${e.dentro}/${e.visto}`)
    }
  }

  // SE JUZGA POR GRUPO, no por objeto suelto. Una regla de 24 marcas deja seis fuera del cuadro A
  // PROPOSITO: es lo que hace que se lea como que sigue mas alla del borde, y es una decision de
  // composicion repetida en media docena de escenas. Mirando objeto por objeto, esas seis marcas son
  // seis acusaciones falsas — y una compuerta que acusa en falso se aprende a ignorar, que es la
  // unica forma de que despues no vea el defecto de verdad.
  //
  // EL TRAMO DECLARADO NO PUEDE SER UNA RENDIJA. `encajaEntre` existe para no castigar el vuelo de
  // entrada, no para apagar la compuerta: con [0.5, 0.51] una malla pasaria midiendose en un instante.
  //
  // EL PRIMER GUARDARRAIL QUE ESCRIBI PEDIA 60% DE COBERTURA Y ESTABA CALIBRADO A OJO — el mismo error
  // que vengo corrigiendo en las escenas. En `mosaico` las piezas vuelan hasta el beat 3.55 de 6, o sea
  // que el vuelo ocupa el 59% de la escena LEGITIMAMENTE: es el gesto del hero, no una excusa. Con el
  // piso en 60% la unica salida habria sido marcarlas `sangra` y perder la proteccion entera.
  //
  // Lo que de verdad separa "vuela y despues se compone" de "me mido donde me conviene" no es cuanto
  // dura el tramo: es DONDE TERMINA. Una rendija en el medio deja el final sin mirar, y el final es
  // donde la composicion esta quieta y el espectador la lee. Se exige entonces que el tramo llegue al
  // 90% de la escena y cubra al menos el 25%.
  // SE JUZGA CON LA VIDA VISIBLE YA CONOCIDA. `muestras` trae un valor por cada cuadro en que la malla
  // estuvo encendida, en orden; el tramo declarado recorta sobre ESE arreglo y no sobre la escena.
  for (const [, gg] of cuenta) {
    if (!gg.muestras) continue
    let ms = gg.muestras
    if (gg.tramo) {
      const [a, z] = gg.tramo
      ms = ms.slice(Math.floor(a * ms.length), Math.max(1, Math.ceil(z * ms.length)))
    }
    gg.peor = ms.reduce((p, v) => Math.max(p, v), 0)
    gg.fuera = ms.filter(v => v > 1.015).length
  }

  for (const [, gg] of cuenta) {
    if (!gg.tramo) continue
    const [a, z] = gg.tramo
    const cobertura = z - a
    if (z < 0.9 || cobertura < 0.25) {
      fallos.push(`E-ENCAJE-TRAMO  ${id}: una malla declara \`encajaEntre\` [${a}, ${z}] — tiene que llegar al menos a 0.90 y cubrir el 25% de la escena. Un tramo que corta antes del final deja sin mirar justo donde la composicion se lee.`)
      break
    }
  }

  for (const [o, gg] of cuenta) {
    if (!gg.fuera) continue
    // Dos cuadros de gracia: una entrada con overshoot puede pasarse un frame y volver, y eso no es un
    // texto cortado. Tres o mas es geometria que no entra.
    if (gg.fuera <= 2) continue
    const enEje = gg.eje ? ` en el eje ${gg.eje.toUpperCase()}` : ''
    const donde = o.userData && o.userData._origen ? `  <${o.userData._origen}>`
      : (_ORIGEN ? '  <sin origen: la crea el kit>' : '')
    fallos.push(`E-ENCAJE-REAL  ${id}: una malla marcada \`encaja\` se sale del cuadro${enEje} en ${gg.fuera} de sus ${gg.visto} cuadros — llega a ${gg.peor.toFixed(3)} en coordenadas de recorte (el limite es 1.0)${donde}`)
  }

  // Lo que SI es un defecto es que TODO un grupo quede afuera: eso ya no es una serie que sangra, es
  // una pieza que nadie ve. Asi era la pauta del toro, que motivo esta compuerta.
  // DOS REGLAS, porque hay dos defectos distintos y una sola no los caza a los dos.
  //
  // (1) POR OBJETO, si es GRANDE. Una pieza cuyo lado mayor pasa del 12% del ancho del cuadro y no
  //     entra nunca es una pieza muerta, sin vueltas. Es lo que era la pauta del toro. El umbral deja
  //     afuera las marcas finas de una regla, que es justo el caso legitimo.
  // (2) POR GRUPO, para lo chico. Una regla de 24 marcas deja seis fuera A PROPOSITO —es lo que la
  //     hace leer como que sigue mas alla del borde— asi que juzgarlas de a una da seis acusaciones
  //     falsas. Pero si TODAS quedan afuera, el grupo entero es una pieza que nadie ve.
  //
  // Con una sola regla el A/B fallaba en las dos direcciones: por objeto acusaba las marcas de la
  // regla; por grupo, mandar el nucleo del cristal catorce unidades abajo NO disparaba nada, porque
  // sus hermanos en el mismo grupo seguian en cuadro.
  // Ver la nota de RELLENO DECLARADO mas abajo: una banda en bucle necesita repeticiones que solo
  // asoman en la costura, y se declaran.
  const esRellenoDecl = (o) => { for (let x = o; x; x = x.parent) if (x.userData && x.userData.relleno) return true; return false }
  const LADO_MIN = mundoW * 0.12
  const cajaT = new THREE.Box3(), tam = new THREE.Vector3()
  r.tl.time(r.tl.duration() * 0.5, false)
  r.g.updateWorldMatrix(true, true); if (r.gr) r.gr.updateWorldMatrix(true, true)
  for (const [o, e] of cuenta) {
    if (e.dentro > 0 || e.visto < N * 0.06) continue
    if (esRellenoDecl(o)) continue
    cajaT.setFromObject(o); if (cajaT.isEmpty()) continue
    cajaT.getSize(tam)
    if (Math.max(tam.x, tam.y) < LADO_MIN) continue
    fallos.push(`E-ENCUADRE-NUNCA  ${id}: una ${(o.geometry && o.geometry.type) || 'malla'} de `
      + `${tam.x.toFixed(1)}x${tam.y.toFixed(1)} esta encendida el ${Math.min(100, Math.round(e.visto / N * 100))}% `
      + 'de la escena y NO entra en el cuadro en ningun momento — se anima algo que nadie ve')
  }

  // RELLENO DECLARADO: una banda continua necesita material a los lados que casi nunca se ve.
  //
  // `marquesina` corre dos cintas horizontales en bucle. Para que el bucle no descubra el cuadro en los
  // extremos hace falta repetir la cola antes y la cabeza despues, y esas repeticiones solo asoman en el
  // instante de la costura — por definicion. La regla de abajo las acusa de "encendidas y casi nunca en
  // cuadro", y la descripcion es correcta pero el veredicto no: no son trabajo invisible, son lo que
  // hace que la banda se lea continua.
  //
  // Se declara con `userData.relleno = true`, igual que `userData.encaja` declara lo contrario. Es una
  // excepcion DECLARADA y no un umbral aflojado: una escena que se olvide de declararlo sigue fallando,
  // y quien lea el archivo de la escena ve por que existe. Lo que la compuerta protege —que nadie anime
  // piezas que nadie ve— se sigue protegiendo en todo lo demas.
  const esRelleno = (o) => {
    for (let x = o; x; x = x.parent) if (x.userData && x.userData.relleno) return true
    return false
  }

  const porGrupo = new Map()
  for (const [o, e] of cuenta) {
    if (esRelleno(o)) continue
    const clave = o.parent || o
    let g = porGrupo.get(clave)
    if (!g) { g = { visto: 0, dentro: 0, n: 0, tipo: (o.geometry && o.geometry.type) || 'malla' }; porGrupo.set(clave, g) }
    g.visto = Math.max(g.visto, e.visto)
    g.dentro = Math.max(g.dentro, e.dentro)
    g.n++
    // MEDICION: cuantos miembros del grupo estan encendidos lo suficiente para juzgarlos, y cuantos
    // de esos NO entran en el cuadro ni una vez.
    if (e.visto >= N * 0.06) { g.juzgables = (g.juzgables || 0) + 1; if (e.dentro === 0) g.mudos = (g.mudos || 0) + 1 }
  }
  for (const [, g] of porGrupo) {
    if (process.env.MEDIR_MUDOS && g.mudos) {
      console.log(`  MUDOS ${id}: grupo de ${g.n} (${g.juzgables} juzgables) -> ${g.mudos} nunca en cuadro  [${g.tipo}]`)
    }
    if (g.visto < N * 0.06) continue          // aparece un instante: no hay muestra para juzgar
    if (g.n === 1) continue                   // pieza suelta: ya la juzgo la regla de arriba, por tamano
    const cuantos = g.n > 1 ? `un grupo de ${g.n} piezas` : `una ${g.tipo}`
    const frac = g.dentro / g.visto
    if (g.dentro === 0) {
      fallos.push(`E-ENCUADRE-NUNCA  ${id}: ${cuantos} esta encendido el ${Math.min(100, Math.round(g.visto / N * 100))}% `
        + 'de la escena y NO entra en el cuadro en ningun momento — se anima algo que nadie ve')
    } else if (frac < 0.10) {
      fallos.push(`E-ENCUADRE-CASI  ${id}: ${cuantos} esta encendido el ${Math.min(100, Math.round(g.visto / N * 100))}% `
        + `de la escena y solo entra en el ${(frac * 100).toFixed(0)}% de esos cuadros`)
    }
    // E-ENCUADRE-MUDOS: el grupo se juzgaba por su MEJOR hijo y eso lo volvia casi ciego.
    //
    // `g.dentro` y `g.visto` se acumulan con `Math.max`, asi que alcanzaba UN hermano bien colocado
    // para que `frac` diera 1 y las dos reglas de arriba se callaran, aunque los otros veinte no
    // entraran nunca. Es exactamente la pauta del `toro` volviendo por la ventana: seis eventos
    // animados que el espectador no ve, con la compuerta en verde.
    //
    // No se puede exigir que TODO miembro entre —un enjambre tiene particulas afuera a proposito, y una
    // compuerta que acusa en falso cuesta mas que no tenerla—, asi que se mide la PROPORCION del grupo
    // que trabaja sin que nadie la vea. El umbral sale de la medicion, no del gusto: barriendo las 407
    // construcciones (37 escenas y heroes x 11 aires) los unicos grupos con miembros mudos son
    // `columna` (1 de 19 juzgables = 0.053) y `tipografia` (3 de 43 = 0.070). La mitad esta siete veces
    // por encima del peor caso legitimo que el motor produce hoy, y por debajo del caso que hay que
    // cazar, que es un grupo entero animandose fuera del cuadro.
    //
    // Se piden ademas 2 mudos como minimo: uno solo y grande ya lo caza la regla por malla de arriba,
    // y uno solo y chico no es un defecto, es un borde.
    const juzgables = g.juzgables || 0
    const mudos = g.mudos || 0
    if (mudos >= 2 && juzgables > 0 && mudos / juzgables >= 0.5) {
      fallos.push(`E-ENCUADRE-MUDOS  ${id}: de ${juzgables} piezas encendidas del grupo, ${mudos} `
        + 'no entran en el cuadro NI UNA VEZ — el grupo pasa porque un hermano bien colocado lo tapa')
    }
  }
 }
 }
}

if (fallos.length) {
  console.error(`ENCUADRE: ${fallos.length} FALLO(S)\n` + fallos.map(f => '  ' + f).join('\n'))
  process.exit(1)
}
// CERO CONSTRUCCIONES NO ES "TODO BIEN", ES QUE NO SE MIDIO NADA. Comprobado a mano el 2026-08-06:
// `node tools/encuadre-check.mjs escena-que-no-existe` imprimia `ENCUADRE OK — 0 construcciones` y
// salia con 0. O sea que el dia que el descubrimiento de escenas se rompa —una carpeta renombrada, un
// import que falla, una extension que cambia— esta compuerta pasaria en verde sin mirar un solo
// objeto, y es la que encontro el defecto que la motivo: la pauta del toro que no se veia NUNCA.
//
// Es la familia de defecto que mas veces aparecio en este repo: el cero tranquilizador. La unica
// defensa es que la compuerta se niegue a dar OK cuando no tuvo nada que revisar.
if (!revisados) {
  console.error('ENCUADRE: FALLO — 0 construcciones. No es que todo entre en el cuadro: es que no se')
  console.error('  midio NADA. Revisa que las escenas se esten descubriendo (render3d/demo/escenas y')
  console.error('  /heroes) o que los ids pasados por argumento existan.')
  process.exit(1)
}
console.log(`ENCUADRE OK — ${revisados} construcciones (${revisados / Object.keys(AIRES).length} escenas y heroes `
  + `x ${Object.keys(AIRES).length} aires): todo lo que se anima entra en el cuadro, proyectado a 30 fps `
  + 'contra la camara que mueve cada escena CON la amplitud que le pone su aire.'
  + `\n  contenido: ${JUEGOS.length} juegos rotando por aire — ${JUEGOS.map(j => j.nombre).join(', ')}.`)
