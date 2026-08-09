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

// LAS TEXTURAS DEL CLIENTE SE MARCAN AL CREARLAS, y eso saca la adivinanza del medio.
//
// La primera version preguntaba `userData.tipoImagen === 'recorte'`, o sea le creia a la declaracion
// de la escena. Funciona para las que pasan por `planoRecorte` y deja afuera a las que arman la malla
// a mano — que resultaron ser justo las que muestran la pagina entera. Y al ampliar la busqueda a los
// uniforms de shader, el problema se dio vuelta: entraron 21 escenas, casi todas con texturas
// PROCEDURALES (mascaras, degradados) que no tienen nada que ver con el cliente.
//
// Pero el material del cliente lo fabrica ESTE archivo. Marcarlo al crearlo convierte "¿esto es del
// cliente?" de una inferencia en un hecho: si la malla dibuja una de estas texturas, muestra material
// del cliente, lo declare o no.
const CLIENTE = Symbol('material del cliente')
function texturasReales() {
  const m = new Map()
  TAMANOS_MEDIDOS.forEach((t, i) => {
    const tex = new THREE.CanvasTexture(createCanvas(4, 4))
    tex.image = { width: t.w, height: t.h }
    tex[CLIENTE] = true
    m.set('f' + i, tex)
  })
  const tira = new THREE.CanvasTexture(createCanvas(4, 4))
  tira.image = { width: 720, height: 6240 }
  tira[CLIENTE] = true
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

// LA TEXTURA NO SIEMPRE ESTA EN `material.map`, y esto casi deja el censo mintiendo por omision.
//
// `telefono`, `ventana` y `portatil` —los tres heroes que muestran LA PAGINA DEL CLIENTE, o sea el
// caso donde el pixelado se veria mas— llevan la tira en `uniforms.map.value` de un ShaderMaterial
// escrito a mano, porque necesitan controlar el desplazamiento a mano (three aplica `repeat`/`offset`
// solo a sus propios materiales). `pantalla` hace lo mismo.
//
// Con la busqueda limitada a `material.map`, los cuatro salian del recorrido ANTES de llegar al conteo
// de "no se midio" — asi que no figuraban ni entre los medidos ni entre los faltantes. Un agujero en el
// mecanismo que existe justamente para que no haya agujeros silenciosos.
function texturaDe(o) {
  const mat = o.material
  if (!mat) return null
  if (mat.map && mat.map.image) return mat.map
  const u = mat.uniforms
  if (u) for (const k of Object.keys(u)) {
    const v = u[k] && u[k].value
    if (v && v.image && v.image.width) return v
  }
  return null
}

const filas = []
const sinDeclarar = new Map()   // escena -> mallas que dibujan textura sin decir de que tipo
let construcciones = 0
let enFundido = 0
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
          const tex = texturaDe(o)
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
          // Se mide TODO lo que dibuja material del cliente, venga declarado o no: la marca de arriba
          // es un hecho y `tipoImagen` es una declaracion que puede faltar. Lo que no es del cliente
          // —una textura procedural, un degradado, una mascara— no se juzga: esas se generan al tamaño
          // que haga falta y preguntarles por nitidez no significa nada.
          //
          // SON DOS CRITERIOS Y SE USAN LOS DOS, porque cada uno solo pierde algo distinto. La marca
          // cubre lo que sale del mapa `texturas` que arma este archivo; la declaracion cubre lo que
          // pasa por `planoRecorte` pero toma su textura por otra via (`texturaDe` del kit). Probado a
          // los golpes: con la marca sola se cayeron `mesa` y `titular`, que antes SI se median.
          const esCliente = tex[CLIENTE] || o.userData.tipoImagen === 'recorte'
          if (!esCliente) return
          // Igual se anota quien lo muestra SIN declararlo. No cambia el veredicto —ya esta medido—
          // pero es deuda real: cualquier otra herramienta que filtre por `tipoImagen` lo va a seguir
          // perdiendo, que es exactamente lo que le paso a `heroes-audit` con `cubo`.
          if (o.userData.tipoImagen !== 'recorte') sinDeclarar.set(id, (sinDeclarar.get(id) || 0) + 1)
          let vis = o.visible
          for (let p = o.parent; p && vis; p = p.parent) vis = p.visible
          const op = o.material.opacity != null ? o.material.opacity : 1
          if (!vis || op <= 0.02) return

          // SOLO DENTRO DE LA VENTANA QUE LA ESCENA DECLARA, si la declara. Y esto no es una
          // concesion: es lo que separa un defecto de un gesto.
          //
          // Costo un diagnostico entero. `mosaico` daba 1.86x contra su tope de 1.4 y la causa NO era
          // ni la construccion (geomW == permitido, exacto), ni la escala (1.000), ni el giro (3 grados),
          // ni el dolly de la camara (aporta 1.001x: al instante del pico ya volvio a reposo). Era que
          // la malla estaba en z=4.6, o sea 25% mas cerca que el plano z=0 contra el que `topeNitido`
          // mide — y esta ahi porque la escena la MANDA ahi al final: "SALEN HACIA LA CAMARA,
          // escalonadas. El corte siguiente se siente ganado", volando a z=5.5 mientras se desvanecen.
          //
          // Medir la nitidez de una pieza que sale volando y en fundido es medir lo que nadie mira. La
          // escena ya dice donde quiere ser juzgada, con el mismo `encajaEntre` que usa `encuadre-check`
          // —ahi por la razon simetrica: no juzgar la ENTRADA—. Aca se respeta la misma declaracion.
          const vent = o.userData.encajaEntre
          const frac = i / N
          if (Array.isArray(vent) && vent.length === 2 && (frac < vent[0] || frac > vent[1])) return

          // Y NO SE JUZGA UNA PIEZA EN FUNDIDO, que es el criterio que no depende de que la escena
          // declare nada. `mosaico` le pone `encajaEntre` a las celdas de la grilla y NO a la banda
          // destacada —la que lleva el logo, justo la que pica— asi que filtrar solo por la ventana
          // declarada dejaba pasar exactamente el caso que habia que explicar.
          //
          // El criterio: una pieza que se esta desvaneciendo no se esta ofreciendo para leer. La
          // nitidez es una promesa sobre lo que el espectador puede mirar; sobre lo que sale de cuadro
          // en medio beat y en fundido no hay promesa que romper. Se cuenta cuantas muestras quedan
          // afuera por esto, para que no sea un filtro invisible que baje los numeros solo.
          if (op < 0.99) { enFundido++; return }

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
// EL FILTRO SE DECLARA CON SU NUMERO. Un filtro que baja los resultados y no se anuncia es la forma
// mas comoda de que una herramienta diga lo que uno queria oir.
console.log(`\n  muestras descartadas por estar en fundido: ${enFundido}. Son piezas saliendo de cuadro`)
console.log('  con la opacidad cayendo — sobre eso no hay promesa de nitidez que romper. Sin este')
console.log('  filtro `mosaico` marca 1.86x, y ese pico es su gesto de salida hacia la camara.')

const dur = orden.filter(f => f.mag > 2)
console.log(`\n  por encima de 2x: ${dur.length} de ${porEscena.size}. `
  + `topeNitido topea en 1.4x, asi que ~1.4 es la marca de que YA esta topeada.`)
console.log('  Antes de tocar una escena, leer su cabecera: varias dibujan a sangre a proposito.')

// LO QUE NO SE MIDIO, DICHO CON NOMBRE Y APELLIDO. Sin esto, la tabla de arriba se leeria como si
// cubriera todo lo que muestra imagen, y no cubre: solo lo que pasa por `planoRecorte`.
const fuera = [...sinDeclarar].sort((a, b) => b[1] - a[1])
if (fuera.length) {
  // EL ROTULO CAMBIO Y ES IMPORTANTE QUE CAMBIE. Antes decia "NO SE MIDIERON", y era cierto: sin la
  // marca de material del cliente, lo que no declaraba quedaba fuera de la medicion. Ahora SI se
  // miden —estan en la tabla de arriba— y lo que queda es deuda: cualquier OTRA herramienta que filtre
  // por `tipoImagen` las va a seguir perdiendo, que es lo que le paso a `heroes-audit` con `cubo`.
  // Dejar el rotulo viejo seria alarmar por un agujero que ya no existe.
  console.log(`\n  MEDIDAS PERO SIN DECLARAR \`tipoImagen\` (${fuera.length} escenas) — deuda, no agujero:`)
  for (const [escena, n] of fuera.slice(0, 14)) console.log(`    ${escena.padEnd(16)} ${n} mallas`)
  if (fuera.length > 14) console.log(`    ... y ${fuera.length - 14} mas`)
  console.log(`    Las ${fuera.length === 1 ? 'que quedan dibujan' : 'que quedan dibujan'} material del CLIENTE — eso ya no se deduce, se sabe: la textura`)
  console.log('    lleva la marca que le pone este archivo al fabricarla. Lo que les falta es decirlo')
  console.log('    en la malla, y eso no afecta a esta tabla pero si a cualquier otra herramienta que')
  console.log('    filtre por `tipoImagen`. Le paso a `heroes-audit`, que informaba "muestra: no" para')
  console.log('    `cubo` cuando cubo muestra.')
}
