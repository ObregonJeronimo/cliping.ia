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
import { execFileSync } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..', '..')
// SE VERIFICAN LAS DOS CARPETAS. Los heroes cumplen exactamente el mismo contrato que las escenas
// —meta {id, beats}, build(ctx) -> {g, gr, tl}— y por eso les corresponden exactamente los mismos
// chequeos: determinismo, duracion dentro de sus beats, camara devuelta, nada quieto mas de un beat.
// Mirando solo `escenas/`, los heroes eran el unico codigo del motor sin ninguna compuerta, y son
// justo la parte que mas rapido va a crecer: la idea es que sean cientos.
const DIRS = [join(HERE, 'escenas'), join(HERE, 'heroes')]
const rutaDe = (id) => {
  for (const d of DIRS) { const r = join(d, `${id}.js`); if (existsSync(r)) return r }
  return join(DIRS[0], `${id}.js`)
}
// Con el nombre que el motor PIDE, no con la familia interna del archivo. Ver tools/fuentes-reales.mjs:
// sin esto, diez de los once aires se median con la cara de reserva.
const { registrarFuentes } = await import(pathToFileURL(join(RAIZ, 'tools', 'fuentes-reales.mjs')).href)
registrarFuentes(RAIZ)

// ---- DOM mínimo. El kit usa document.createElement('canvas') para rasterizar tipografía y
// document.fonts para esperarla; nada más del navegador hace falta para ARMAR la escena.
// Se intercepta `fillText` para saber QUE ESCRIBE cada escena. Es la única forma de auditar el
// contenido sin renderizar: el kit rasteriza toda su tipografía en un canvas 2D, así que todo lo que
// el espectador va a leer pasa por acá.
const ESCRITO = []
function lienzo(w = 4, h = 4) {
  const cv = createCanvas(w, h)
  const get = cv.getContext.bind(cv)
  cv.getContext = (tipo, o) => {
    const c = get(tipo, o)
    if (c && c.fillText && !c.__espiado) {
      const orig = c.fillText.bind(c)
      c.fillText = (txt, x, y) => { ESCRITO.push(String(txt)); return orig(txt, x, y) }
      c.__espiado = true
    }
    return c
  }
  return cv
}
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? lienzo() : { style: {} }),
  getElementById: () => lienzo(),
  // `add`, el iterador y `check` los pide el registro de tipografias de los modulos de aire, que corre
  // al importarse. E-EASE-VALIDO los importa para leer su gesto, asi que sin esto la compuerta ni
  // arranca. No cargan nada de verdad: FontFace es un cascaron y lo que importa es que no explote.
  fonts: { ready: Promise.resolve(), load: async () => {}, add() {}, check: () => true, *[Symbol.iterator]() {} },
}
globalThis.FontFace = class { constructor(f) { this.family = f } async load() { return this } }
globalThis.window = globalThis

// ---- GSAP avisa por consola cuando le pedis animar un target que no existe, y sigue como si nada.
// Es exactamente la forma de un defecto de composicion: la escena se armo con menos material del que
// esperaba (una pagina con un solo dato, sin CTA) y quedaron tweens apuntando al vacio. No falla, no
// se ve en el codigo, y en el video sale un hueco. Se captura el aviso y se convierte en FAIL.
const AVISOS = []
const _warn = console.warn.bind(console)
console.warn = (...a) => { AVISOS.push(a.join(' ')); }
// GSAP entra por el build de `dist/` y NO por `index.js`, y no es cuestion de gusto: `index.js` esta
// escrito en ESM pero el package.json de gsap no declara `"type": "module"`, asi que Node lo carga
// como CJS y muere con "Cannot use import statement outside a module" ANTES de correr una sola
// verificacion. La compuerta no fallaba: no arrancaba, que se parece demasiado a que no exista.
// Y ademas `dist/` es EXACTAMENTE lo que corre en el render — render3d.py sirve /gsap.min.js desde
// node_modules/gsap/dist/ —, asi que verificar contra `index.js` era verificar otro build que el que
// se renderiza. Esta linea cierra las dos cosas de una.
const { gsap } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'gsap', 'dist', 'gsap.js')).href)
globalThis.gsap = gsap
const THREE = await import(pathToFileURL(join(RAIZ, 'node_modules', 'three', 'build', 'three.module.js')).href)
const { BEAT, LOOK, b, limpiarCache, reiniciarRecortes } = await import(pathToFileURL(join(HERE, 'kit.js')).href)
// LOS AIRES, PARA ROTARLOS EN E-ENCAJE. Ese chequeo barria cuatro marcas con UN SOLO aire —el que
// quedara configurado— y la tipografia display es lo que mas cambia entre aires: medido con la
// compuerta de encuadre, una cara ancha mide 39% mas que una angosta sobre el mismo texto. O sea que
// la compuerta cuyo encabezado dice 'la composicion tiene que aguantar nombres que no midan lo que
// mide ANTHEM' auditaba un solo vestuario.
//
// SE ROTA, NO SE MULTIPLICA: cuatro marcas x once aires x 37 escenas son 1628 construcciones y esta es
// una de las rapidas. Rotando —cada marca recibe un aire distinto, y el punto de partida avanza con la
// escena— el costo queda igual y a lo largo del barrido entero se ejercitan los once.
//
// Y ES UN INTERCAMBIO, NO UNA MEJORA PURA — conviene saberlo antes de tocarlo. Con el aire fijo, cada
// (escena, marca) se medi­a siempre con el mismo vestuario y el otro eje no existia; rotando, el eje
// del aire pasa de 1 a 11 pero cada combinacion se mide con UNO solo. Medido: el ancho maximo que ve
// la compuerta pasa de 8.25 a 7.80 unidades, porque la combinacion que daba 8.25 (tipografia con
// 'CONSTRUCCIONES') ahora corre bajo otro aire. Se elige la amplitud porque la cara display es el
// factor mas grande del ancho —39% de diferencia entre una angosta y una ancha sobre el mismo texto,
// ya medido en encuadre-check— y porque la contencion con el producto cartesiano completo YA la cubre
// `encuadre-check` con sus 407 construcciones.
const _kitA = await import(pathToFileURL(join(HERE, 'kit.js')).href)
const AIRES_E = []
for (const f of readdirSync(join(HERE, 'aires')).filter(x => x.endsWith('.js'))) {
  try { AIRES_E.push([f.replace('.js', ''), (await import(pathToFileURL(join(HERE, 'aires', f)).href)).default]) } catch { /* E-EASE ya lo reporta */ }
}
let _iAire = 0

// Texturas de mentira con relaciones de aspecto de verdad. Los heroes solo leen `image.width/height`
// para decidir la composicion, asi que un canvas de 4 px alcanza y no cuesta memoria: lo que se esta
// probando es la GEOMETRIA de la grilla, no los pixeles.
function tejidoFalso(relaciones) {
  const m = new Map()
  relaciones.forEach((ar, i) => {
    const h = 64, w = Math.max(2, Math.round(h * ar))
    const t = new THREE.CanvasTexture(createCanvas(w, h))
    t.image = { width: w, height: h }
    m.set('f' + i, t)
  })
  // El hero de telefono y el de portatil piden la tira larga de la pagina, con su alto real.
  const tira = new THREE.CanvasTexture(createCanvas(4, 4))
  tira.image = { width: 720, height: 6240 }
  m.set('tira', tira)
  return m
}

let fails = 0
const die = m => { console.error('FAIL  ' + m); fails++ }
const ok = (c, m) => { if (!c) die(m) }

const PROHIBIDO = [
  [/\bMath\.random\b/, 'Math.random — usa ctx.rnd(), o dos renders del mismo video no son iguales'],
  [/\bDate\.now\b|\bnew Date\b/, 'reloj propio — el tiempo lo pone el driver'],
  [/\brequestAnimationFrame\b/, 'requestAnimationFrame — el render no corre en tiempo real'],
  [/\bsetTimeout\b|\bsetInterval\b/, 'temporizador — todo tiene que estar declarado en la timeline'],
  // PRESUPUESTO DE LUZ, como regla de codigo. UnrealBloomPass no atenua: o un pixel queda debajo
  // del umbral y no florece nada, o lo pasa y entra ENTERO. La tinta de un mundo oscuro esta en
  // ~0.9 de luminancia contra un umbral de 0.62, asi que CUALQUIER texto pintado con LOOK.tinta
  // florece completo y sale como una mancha sin contraformas. Paso TRES veces —la rafaga, el
  // nombre de la marca en el cierre, los rotulos de la apertura— y las tres se descubrieron
  // mirando un render en vivo, nunca con una compuerta. El color de un texto sale de nivel(k),
  // que E-LUZ mantiene por debajo del umbral.
  [/color:\s*LOOK\.tinta/, 'texto en LOOK.tinta — florece entero con el bloom y sale ilegible; usa nivel(0.80) o menos'],
  [/textoMascara\([^)]*,\s*LOOK\.tinta\b/, 'textoMascara en LOOK.tinta — florece entero con el bloom; usa nivel(0.78) o menos'],
]

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [...new Set(DIRS.flatMap(d => (existsSync(d)
    ? readdirSync(d).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.replace('.js', ''))
    : [])))]

if (!ids.length) { console.error('no hay escenas ni heroes en ' + DIRS.join(' ni ')); process.exit(1) }

// ---- EL POST LIMPIO, con valores CENTINELA a proposito.
//
// El stub de esta compuerta estaba sembrado en 0.85 / 0.055 / 0.9 / 0.0022 — los valores de ANTHEM—, y
// resulta que 0.85 es EXACTAMENTE el numero que `tipografia` tiene escrito a mano para "restaurar" el
// bloom despues de subirlo. O sea que el fixture confirmaba el defecto en vez de cazarlo: una escena
// que devuelve un literal en lugar del valor del aire pasaba en verde.
//
// Con numeros que nadie va a hardcodear, restaurar a mano falla siempre. Es la misma idea que un
// centinela en un test de memoria: si el valor que sale es "redondo", alguien lo escribio.
const POST_LIMPIO = {
  strength: 0.6137, radius: 0.5411, threshold: 0.7219,
  grano: 0.0731, vinieta: 0.8137, aberr: 0.00413, flash: 0,
}

const W = 1080, H = 1920, mundoH = 10, mundoW = mundoH * (W / H)
const fov = 30
const distBase = (mundoH / 2) / Math.tan((fov * Math.PI / 180) / 2)

// ---- E-LUZ. El presupuesto de luz de la pieza, comprobado una vez.
//
// UnrealBloomPass no atenua: su filtro de paso alto es un smoothstep de ancho 0.01 sobre el umbral.
// O un pixel queda debajo y no florece NADA, o lo pasa y entra ENTERO al bloom. Por eso la escala de
// grises de la tipografia esta calibrada para vivir JUSTO por debajo, y por eso una escala que se
// corre un poco hacia arriba no degrada: revienta.
//
// Paso exactamente eso. `nivel(k)` mezclaba con THREE.Color.lerp, que trabaja en espacio LINEAL, y
// nivel(0.78) daba luminancia 0.707 contra un umbral de 0.62: en un mundo oscuro el titular salia
// como un ladrillo blanco sin contraformas. El gris escrito a mano que reemplazo tenia 0.594. Nada
// fallo; lo encontre mirando un render en vivo de tailwindcss.com.
{
  const lum = (h) => {
    const t = String(h).replace('#', '')
    const f = i => { const v = parseInt(t.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4)
  }
  const { nivel } = await import(pathToFileURL(join(HERE, 'kit.js')).href)
  const UMBRAL = 0.62                      // el del aire tecnico, que es el mas bajo del sistema
  // 0.80 es el nivel mas alto que usa una escena para tipografia (el numero de las tarjetas).
  for (const k of [0.50, 0.56, 0.75, 0.78, 0.80]) {
    const c = nivel(k)
    ok(lum(c) < UMBRAL, `E-LUZ: nivel(${k}) da ${c}, luminancia ${lum(c).toFixed(3)} — por encima del `
      + `umbral de bloom ${UMBRAL}. La tipografia de display va a florecer entera y salir ilegible. `
      + `Casi seguro que la mezcla volvio al espacio LINEAL: tiene que ser en sRGB.`)
  }
}

for (const id of ids) {
  const ruta = rutaDe(id)
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
    // Sembrado con POST_LIMPIO: valores CENTINELA, no los de ANTHEM. Ver la nota donde se declaran.
    pelicula: {
      uT: { value: 0 }, uFlash: { value: POST_LIMPIO.flash }, uGrano: { value: POST_LIMPIO.grano },
      uVinieta: { value: POST_LIMPIO.vinieta }, uAberr: { value: POST_LIMPIO.aberr },
    },
    bloom: { strength: POST_LIMPIO.strength, radius: POST_LIMPIO.radius, threshold: POST_LIMPIO.threshold },
    // MATERIAL SINTETICO PARA LOS HEROES. Con `texturas` vacio, el hero de mosaico devolvia un grupo
    // vacio -que es lo correcto y honesto- y toda su logica de composicion quedaba SIN PROBAR: cuantas
    // columnas, como encaja cada pieza en su celda segun su relacion de aspecto, como se centra la
    // ultima fila incompleta. Justo lo que puede romperse.
    //
    // Las relaciones de aspecto no son al azar: 2.4 es un logo apaisado, 1.0 un cuadrado, 0.6 una foto
    // vertical, 3.4 un boton. Son las formas reales que devuelve la extraccion, y son las que hacen que
    // una grilla ingenua deforme el logo de alguien.
    texturas: tejidoFalso([2.4, 1.0, 0.6, 3.4, 1.35]),
    datosEls: [
      { rol: 'logo', url: 'f0' }, { rol: 'tarjeta', url: 'f1' }, { rol: 'foto', url: 'f2' },
      { rol: 'cta', url: 'f3' }, { rol: 'tarjeta', url: 'f4' },
    ],
    spec: { tiraViewport: 1560 }, claro: false,
  }

  // ---- PAGINA POBRE. Antes de nada, se construye la escena con el material MINIMO que puede dar una
  // pagina real: una cifra, una frase, sin bloque y sin CTA. Es el caso que rompe, y el que el
  // verificador no miraba: con los datos de ANTHEM (cinco de todo) toda escena parece correcta.
  const { configurarDatos, ANTHEM, reiniciarReparto } = await import(pathToFileURL(join(HERE, 'datos.js')).href)
  const CENTINELA = 'ZZQX'
  configurarDatos({ marca: CENTINELA, rotulo: CENTINELA, claim: CENTINELA + ' UNO',
    frases: [CENTINELA + ' UNO'], bloque: null,
    datos: [{ valor: '4.9', etiqueta: CENTINELA }], golpe: CENTINELA + ' UNO', cta: null,
    pie: [CENTINELA], dominio: CENTINELA, elementos: [] })
  ESCRITO.length = 0
  try {
    const camPobre = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
    camPobre.position.set(0, 0, distBase)
    let sp = 1
    reiniciarReparto(); reiniciarRecortes()
    const rp = await mod.build({ ...ctx, camera: camPobre, fondo: uni(), rnd: () => { sp = (sp * 1664525 + 1013904223) >>> 0; return sp / 4294967296 } })
    ok(rp && rp.g, `${id}: con una pagina POBRE no devolvio grupo`)
    if (rp && rp.tl) rp.tl.time(mod.meta.beats * BEAT, false)
  } catch (e) {
    die(`${id}: con una pagina POBRE (1 cifra, 1 frase, sin CTA) build() lanzo — ${e.message}`)
  }

  // ---- E-VACIO. Ver el interceptor de console.warn arriba.
  const vacios = [...new Set(AVISOS.filter(a => /target.*not found/i.test(a)))]
  ok(vacios.length === 0,
    `E-VACIO ${id}: con una pagina POBRE la timeline anima objetos que la escena no llego a crear `
    + `(${vacios.length} aviso(s) de GSAP). La escena tiene que componerse con lo que hay, no dejar el hueco.`)
  AVISOS.length = 0

  // ---- E-INVENCION. La regla anti-invencion vivia en cuatro comentarios largos y en NINGUN test, y
  // por eso pudo romperse sin que nada avisara: medido sobre los fixtures, 46 de 84 slots de frase y
  // las cifras de 7 de 12 paginas salian del copy de la demo. El video de Stripe decia "ANIMA" y el
  // de una 404 decia "300 MARCAS · 96 CIUDADES".
  //
  // Se construye con datos marcados con un centinela y se mira TODO lo que la escena escribio. Si
  // aparece una frase o una cifra de ANTHEM, la escena esta rellenando con contenido ajeno.
  const norm = t => String(t).toUpperCase().replace(/\s+/g, ' ').trim()
  const escrito = ESCRITO.map(norm)
  const prohibido = [
    ...ANTHEM.frases.flatMap(f => f.split('\n')),
    ...ANTHEM.datos.map(d => d.etiqueta),
    ...ANTHEM.datos.map(d => String(d.valor)),
    ANTHEM.marca, ANTHEM.cta, ANTHEM.claim,
  ].map(norm).filter(t => t.length >= 3)
  const fugas = [...new Set(prohibido.filter(p => escrito.some(e => e === p)))]
  ok(fugas.length === 0,
    `E-INVENCION ${id}: con una pagina que NO dijo eso, la escena escribe contenido de la demo: ${fugas.slice(0, 4).map(f => JSON.stringify(f)).join(', ')}`)

  // ---- E-PROCEDENCIA. El punto ciego del chequeo de arriba: solo conoce los literales que viven en
  // el objeto ANTHEM de datos.js. Una frase escrita A MANO DENTRO DE UNA ESCENA no esta en esa lista y
  // pasaba invisible. Y habia varias: el video de Stripe salia diciendo "SIETE ENTRADAS · NINGUNA
  // IGUAL" y "CADA CORTE CAE EN EL BEAT" — copy sobre el motor, en castellano, en la pieza de una
  // marca inglesa que nunca dijo nada parecido. Exactamente el defecto que la regla existe para
  // impedir, cometido desde el otro lado.
  //
  // Este chequeo invierte la carga de la prueba: en vez de una lista de lo PROHIBIDO, exige que todo
  // lo que la escena escribe sea RASTREABLE a los datos que recibio. Se permiten dos cosas mas:
  //   · texto sin letras (numeros, indices, filetes tipo "01 / 06") — no afirma nada del negocio;
  //   · lo declarado en DECORATIVO, la lista corta y compartida de rotulos de sistema.
  // Cualquier copy nuevo escrito a mano falla hasta que alguien lo ponga en esa lista a la vista.
  const { DECORATIVO } = await import(pathToFileURL(join(HERE, 'datos.js')).href)
  const permitido = new Set([...DECORATIVO].map(norm))
  // Todos los strings del objeto de datos, en profundidad. La escena puede recortar, partir en
  // renglones o separar en palabras, asi que vale como rastreable si es SUBCADENA de alguno.
  const rastro = []
  ;(function hondo(v) {
    if (typeof v === 'string' || typeof v === 'number') rastro.push(norm(v))
    else if (Array.isArray(v)) v.forEach(hondo)
    else if (v && typeof v === 'object') Object.values(v).forEach(hondo)
  })(await import(pathToFileURL(join(HERE, 'datos.js')).href).then(m => m.D))
  const inventado = [...new Set(escrito.filter(e => {
    if (!/[A-ZÁÉÍÓÚÑÜ]/.test(e)) return false                     // sin letras: no afirma nada
    if (permitido.has(e)) return false
    return !rastro.some(f => f.includes(e))
  }))]
  ok(inventado.length === 0,
    `E-PROCEDENCIA ${id}: escribe texto que la pagina nunca dijo y no esta declarado en DECORATIVO: `
    + `${inventado.slice(0, 5).map(f => JSON.stringify(f)).join(', ')}`)

  // ---- E-ENCAJE. La composición tiene que aguantar nombres que no midan lo que mide "ANTHEM".
  // Medido antes de este chequeo: la banda segura de la marca era de 5 a 9 letras. Con "Q" la letra
  // ocupaba el 143% del alto útil; con diez o más el nombre se truncaba EN SILENCIO
  // ("CONSTRUCCIONES DEL SUR" salía "CONSTRUCC"). Ninguna de las dos cosas movía una sola métrica del
  // analizador, porque el ritmo seguía perfecto — el proyecto tenía compuerta de ritmo y ninguna de
  // composición.
  //
  // Se construye con marcas de 1, 2, 12 y 22 letras y se mide la caja real de cada malla contra el
  // cuadro visible. No se comprueba que quede lindo: se comprueba que ENTRE y que el nombre esté
  // completo, que es lo que un test puede saber.
  for (const marca of ['Q', 'GO', 'CONSTRUCCIONES', 'TRANSPORTES INTERNACIONALES']) {
    // El aire rota con la marca: cada construccion se mide con un vestuario tipografico distinto.
    const [nomAire, aireE] = AIRES_E.length ? AIRES_E[_iAire++ % AIRES_E.length] : ['—', null]
    if (aireE) _kitA.configurar(aireE)
    // CON DATOS Y CON DOMINIO. Esto mandaba `datos: []` y `cta: null`, y con eso el gate se quedaba
    // ciego a las dos escenas que MAS dependen del largo de la marca:
    //   · `tarjetas` sale por `vacia: true` sin datos (tarjetas.js:131), justo la escena que dibuja
    //     D.marca tres veces;
    //   · la pildora de `cierre` ni se agrega al grupo sin CTA ni dominio, asi que su ancho —que se
    //     construye A LA MEDIDA DEL TEXTO— no se medía nunca. Con un CTA real entra: medido, el peor
    //     ancho de `cierre` con la marca "Q" pasa de 1.56 a 1.59 unidades, que es la pildora sumandose
    //     a la cuenta. Es poco, y esa es la prueba de que antes NO estaba.
    // O sea que la compuerta cuyo encabezado dice "la composicion tiene que aguantar nombres que no
    // midan lo que mide ANTHEM" no miraba ninguna malla de tarjetas y ninguna pildora.
    // El dominio se arma DEL nombre para que crezca con el: es el caso real, porque el dominio de una
    // marca larga es largo.
    configurarDatos({
      ...ANTHEM, marca, frases: [marca], datos: ANTHEM.datos, cta: ANTHEM.cta, golpe: marca,
      dominio: marca.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com.ar',
    })
    // El cache de texturas hace que un glifo ya rasterizado no vuelva a pasar por fillText, asi que
    // sin soltarlo el chequeo de truncado ve menos letras de las que la escena dibuja y acusa en
    // falso. Le paso: la primera version reporto "CONSTRUCCIONES" como truncada estando entera.
    limpiarCache()
    ESCRITO.length = 0
    let rm
    try {
      const cm = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
      cm.position.set(0, 0, distBase)
      let sm = 1
      reiniciarReparto(); reiniciarRecortes()
      rm = await mod.build({ ...ctx, camera: cm, fondo: uni(), rnd: () => { sm = (sm * 1664525 + 1013904223) >>> 0; return sm / 4294967296 } })
    } catch (e) { die(`E-ENCAJE ${id}: con la marca "${marca}" build() lanzo — ${e.message}`); continue }
    if (!rm || !rm.g) continue
    // (el muestreo va mas abajo: cuatro instantes, no uno)
    // SE MIDE OBJETO POR OBJETO, no la union. La primera version tomaba el bounding box de todo el
    // grupo y acusaba a las dos escenas correctas: `toro` tiene particulas a 80 unidades y
    // `tipografia` estaciona las frases fuera del cuadro esperando su turno. Eso es composicion
    // valida — lo que no puede pasar es que UNA pieza visible sea mucho mas grande que el cuadro.
    // Se ignora lo que esta lejos del centro (estacionado) y lo que es fondo (muy grande a proposito
    // y detras de todo).
    const caja = new THREE.Box3()
    const v = new THREE.Vector3()
    let peor = null
    const noEncajan = []
    // DOS RAICES PARA EL CHEQUEO DECLARATIVO, UNA SOLA PARA EL HEURISTICO. `titular` compone TODO en
    // `gr` —foto, banda y titular— porque la escena post-bloom se dibuja encima de `g` sin importar el
    // z. Recorriendo solo `g`, sus tres renglones declaraban `encaja = true` y nadie los miraba: la
    // escena con el cuerpo tipografico mas grande de las seis era justo la que no estaba chequeada.
    // Es el mismo defecto que el commit anterior ("la compuerta que miraba la mitad de los casos"),
    // cometido de nuevo veinte lineas mas abajo.
    // El heuristico `peor` ("se come el cuadro") SIGUE mirando solo `g`, y a proposito: esta calibrado
    // contra el, y en `gr` vive la FOTO de titular, que se dimensiona para CUBRIR el cuadro. Abrirsela
    // seria acusarla de hacer exactamente lo que corresponde.
    // NO se fuerza updateWorldMatrix aca: `Box3.setFromObject` ya actualiza lo que necesita, y
    // forzarlo cambia las cajas que mide el heuristico `peor` —que esta calibrado con las de antes—.
    // Probado: agregandolo, `destello` pasaba a fallar por una pieza de 6.42x14.34, que es su titular
    // a sangre haciendo exactamente lo que esa escena existe para hacer. Una compuerta que acusa en
    // falso se aprende a ignorar, y despues no ve el defecto de verdad.
    const raices = [rm.g, rm.gr].filter(Boolean)
    const mirar = (o, esG) => {
      if (!o.isMesh || !o.visible) return
      if (o.material && o.material.opacity != null && o.material.opacity <= 0.05) return
      caja.setFromObject(o)
      if (caja.isEmpty()) return
      caja.getCenter(v)
      // fuera de cuadro = estacionada esperando entrar, no es un defecto
      if (Math.abs(v.x) > mundoW * 0.9 || Math.abs(v.y) > mundoH * 0.7 || v.z < -20) return
      const t = caja.getSize(new THREE.Vector3())
      // Un PANEL de fondo ocupa el cuadro entero a proposito (el beat de inversion pinta uno blanco);
      // un FILETE es una barra finita que puede cruzar el cuadro de punta a punta. Ninguno de los dos
      // es un problema de encaje — el problema es una pieza con CUERPO que no entra.
      //
      // EL FONDO SE RECONOCE POR NO TENER TEXTURA, no por ser grande. Distinguirlo por tamaño hacia
      // que este chequeo fuera VACIO: una marca de una sola letra sin tope de alto mide 5.3 x 9.6 en
      // un cuadro de 5.6 x 10, o sea que la "Q" gigante —el defecto exacto que hay que cazar— entraba
      // en la definicion de fondo y se salteaba. Comprobado devolviendo el defecto: el gate pasaba en
      // verde. Toda tipografia lleva `material.map`; un panel de color plano no.
      // SOLO SE MIDE LO QUE LLEVA TEXTURA. Es lo que este chequeo siempre quiso mirar: la tipografia
      // (que se rasteriza a textura) y los recortes reales de la pagina. Un cuerpo de geometria pura
      // -el chasis de un telefono, el halo detras de un producto, un panel de fondo- es GRANDE A
      // PROPOSITO: un anuncio de telefono encuadra el aparato ocupando el cuadro, y el halo tiene que
      // desbordarlo o no es un halo. Midiendolos, los cuatro heroes fallaban por hacer justo lo que
      // corresponde, mientras el defecto que hay que cazar -una marca de una letra que se come el
      // cuadro- sigue siendo tipografia y sigue entrando.
      // LA TEXTURA PUEDE VIVIR EN DOS LADOS, y preguntar por uno solo dejaba ciega a la compuerta.
      // `material.map` es lo que expone un MeshBasicMaterial, pero TODA malla revelada por mascara usa
      // un ShaderMaterial y su textura esta en `uniforms.map`. Preguntando solo por la primera, este
      // chequeo salteaba el texto entero de las seis escenas nuevas —que entran por barrido— y por eso
      // dos de ellas salieron al video con el renglon cortado por la derecha mientras el gate decia
      // OK. Un chequeo que mira la mitad de los casos no es medio chequeo: es uno que da confianza.
      const mat = o.material
      const conTextura = !!(mat && (mat.map || (mat.uniforms && mat.uniforms.map && mat.uniforms.map.value)))
      if (!conTextura) return
      // E-ENCAJE-ENTERO: lo que la escena DECLARA que tiene que entrar, entra ENTERO.
      // No se puede deducir del dibujo: un titular a sangre y un titular que no entro se ven igual en
      // una caja. Asi que lo declara quien compone —`userData.encaja = true`— y la compuerta lo hace
      // cumplir. La escena que sangra a proposito simplemente no marca nada y nadie la acusa, que es
      // la unica forma de tener esta regla sin volverla ruido.
      if (o.userData && o.userData.encaja) {
        const dx = Math.abs(v.x) + t.x / 2, dy = Math.abs(v.y) + t.y / 2
        if (dx > mundoW * 0.51 || dy > mundoH * 0.51) {
          noEncajan.push(`${o.geometry.type} ${t.x.toFixed(2)}x${t.y.toFixed(2)} centrada en (${v.x.toFixed(2)}, ${v.y.toFixed(2)})`)
        }
      }
      if (!esG) return                              // el heuristico de abajo es solo para `g`
      const esFilete = Math.min(t.x, t.y) < 0.15
      if (esFilete || t.y > mundoH * 1.6) return
      // CADA EJE SE MIDE POR SU CUENTA. Esto guardaba UNA sola pieza —la mas ALTA— y despues comprobaba
      // SU ancho, asi que una pieza ancha y baja no se medi­a nunca: alcanzaba con que hubiera en la
      // escena otra mas alta y mas angosta para que el ancho de la primera no llegara a mirarse. Un
      // renglon que se derrama por los dos costados es exactamente eso, ancho y bajo.
      if (!peor || t.y > peor.y) peor = { x: t.x, y: t.y, ancha: peor ? peor.ancha : null }
      if (!peor.ancha || t.x > peor.ancha.x) peor.ancha = { x: t.x, y: t.y }
    }
    // EN VARIOS INSTANTES, NO EN UNO. Esto medía SOLO el 72% de la escena —"ya asentada, antes de la
    // salida"— y con eso todo lo que sobresale en la ENTRADA o en la SALIDA sencillamente no existía
    // para la compuerta: un texto que se corta en los costados mientras entra y despues se acomoda es
    // exactamente lo que se ve en el video y no en una captura. En `destello` el heroWrap arranca
    // fuera de escala y en `rafaga` las piezas entran desplazadas y creciendo — dos casos donde el
    // unico instante medido es justo el que no falla.
    //
    // Los cuatro instantes son los que la composicion de este motor usa: 0.18 (entrada, con el
    // overshoot todavia puesto), 0.45 y 0.72 (asentada) y 0.92 (salida, creciendo o escapando). Se
    // acumula el PEOR de los cuatro por malla, que es lo que `mirar` ya hacia con `peor` y `noEncajan`.
    for (const frac of [0.18, 0.45, 0.72, 0.92]) {
      rm.tl.time(mod.meta.beats * BEAT * frac, false)
      for (const raiz of raices) raiz.traverse(o => mirar(o, raiz === rm.g))
    }
    ok(noEncajan.length === 0,
      `E-ENCAJE ${id}: con la marca "${marca}" y el aire ${nomAire}, ${noEncajan.length} pieza(s) declaradas encaja=true se salen del cuadro (${mundoW.toFixed(2)}x${mundoH.toFixed(2)}): ${noEncajan.join(' · ')}`)
    if (peor) {
      if (process.env.MEDIR_ANCHO) console.log(`  ANCHO ${id}/${marca}: alta ${peor.y.toFixed(2)} (ancho ${peor.x.toFixed(2)}) · ancha ${peor.ancha.x.toFixed(2)} = ${(peor.ancha.x / mundoW).toFixed(2)} cuadros`)
      ok(peor.y <= mundoH * 0.85 && peor.ancha.x <= mundoW * 2.2,
        `E-ENCAJE ${id}: con la marca "${marca}" y el aire ${nomAire}, una pieza mide ${peor.ancha.x.toFixed(2)} de ancho y otra ${peor.y.toFixed(2)} de alto en un cuadro de ${mundoW.toFixed(2)}x${mundoH.toFixed(2)} — se come el cuadro`)
    }
    // El nombre entero o nada: un truncado silencioso es peor que un nombre chico.
    //
    // Se comparan CONJUNTOS de letras y no cantidades: `texto()` cachea por clave, así que una marca
    // con letras repetidas ("CONSTRUCCIONES" tiene tres C y dos O) rasteriza cada glifo UNA sola vez
    // y contar los fillText da menos letras de las que la palabra tiene. La primera versión de este
    // chequeo acusaba de truncado a una escena que dibujaba el nombre completo.
    // La regla la pone LA ESCENA y se importa; deducirla aca era una copia que ya diverguio una vez.
    const larga = (mod.palabraDeMarca ? mod.palabraDeMarca(marca)
      : marca.split(/\s+/).sort((a, c) => c.length - a.length)[0])
    const dibujadas = new Set(ESCRITO.filter(t => t.length === 1 && /[A-ZÁÉÍÓÚÑ]/i.test(t)).map(t => t.toUpperCase()))
    if (dibujadas.size) {
      const faltan = [...new Set(larga.split(''))].filter(L => !dibujadas.has(L))
      ok(faltan.length === 0,
        `E-ENCAJE ${id}: de la marca "${larga}" no se dibujaron las letras ${faltan.join('')} — se trunco en silencio`)
    }
  }
  // SE DEVUELVE EL VOCABULARIO COMO ESTABA. `configurar(aire)` reasigna BEAT, y BEAT es lo que usa el
  // chequeo de duracion de la escena SIGUIENTE: sin este reset, rotar aires aca dejaba el beat del
  // ultimo y 29 escenas fallaban por "se come la escena siguiente" con timelines que estan bien. El
  // sintoma no aparece en la escena que rota, aparece en la que viene despues — que es lo que lo hace
  // dificil de leer. Mismo modismo que E-EASE-VALIDO al terminar su barrido.
  if (AIRES_E.length) _kitA.configurar(null)

  configurarDatos(ANTHEM)

  let r
  // SE VUELVE A DEJAR EL POST COMO ESTABA ANTES DE LA CONSTRUCCION QUE SE MIDE. Arriba hay otras dos
  // construcciones —la de pagina pobre y la de E-ENCAJE— que reciben `{ ...ctx }`, o sea el MISMO
  // objeto `bloom` y los mismos uniforms, y ya lo ensuciaron: `tl.set` de GSAP escribe al crearse.
  // Sin este reset la compuerta comparaba contra un valor sucio y dejaba pasar justo lo que busca.
  const POST0 = POST_LIMPIO
  ctx.bloom.strength = POST0.strength; ctx.bloom.radius = POST0.radius; ctx.bloom.threshold = POST0.threshold
  ctx.pelicula.uGrano.value = POST0.grano; ctx.pelicula.uVinieta.value = POST0.vinieta
  ctx.pelicula.uAberr.value = POST0.aberr; ctx.pelicula.uFlash.value = POST0.flash
  reiniciarReparto(); reiniciarRecortes()
  try { r = await mod.build(ctx) } catch (e) { die(`${id}: build() lanzo — ${e.message}`); continue }
  ok(r && r.g && r.tl, `${id}: build() tiene que devolver { g, tl }`)
  if (!r || !r.g || !r.tl) continue
  ok(r.g.isObject3D, `${id}: g no es un Object3D`)
  ok(r.g.children.length > 0, `${id}: el grupo esta vacio — la escena no construyo nada`)

  // ---- DURACION. Es el chequeo que mas vale: una timeline que se pasa no falla, solo pisa a la
  // escena siguiente, y eso se descubre mirando la pieza entera y sin saber quien fue.
  const limite = mod.meta.beats * BEAT
  // `duration()` NO cuenta el timeScale propio de la timeline: una escena de 6 beats reescalada para
  // llenar 8 sigue reportando 2.88s. Midiendo eso, el verificador veia un segundo de quietud al final
  // que en el video no existe — y al reves, una escena ACELERADA se le habria pasado por larga.
  // El largo real es duration() / timeScale(), y `time()` se mueve en las unidades SIN escalar.
  const escala = r.tl.timeScale() || 1
  const dur = r.tl.duration() / escala
  const finPropio = r.tl.duration()
  // Una escena puede declararse VACIA a proposito: es la respuesta honesta cuando la pagina no dio el
  // material que necesita (sin cifras no hay escena de datos, sin captura no hay hero de telefono).
  // Exigirle duracion y movimiento a eso seria exigirle que invente.
  if (r.vacia) { console.log(`  ${id}: vacia a proposito (sin material) — se saltea`); continue }
  ok(dur <= limite + 1e-3, `${id}: la timeline dura ${dur.toFixed(3)}s y su lugar es ${limite.toFixed(3)}s (${mod.meta.beats} beats) — se come la escena siguiente`)
  ok(dur > limite * 0.5, `${id}: la timeline dura ${dur.toFixed(3)}s de ${limite.toFixed(3)}s disponibles — mas de la mitad de la escena queda congelada`)

  // ---- CAMARA. Se recorre hasta el final y se comprueba que volvio. Si una escena mueve la camara y
  // no la devuelve, la siguiente arranca desde otro punto de vista y la pieza se desarma.
  // SE RECORRE LA ESCENA ANTES DE MIRAR EL FINAL, y no es un detalle. Saltando directo al ultimo
  // instante, una escena que escribe estado compartido desde un onUpdate entra por su rama de salida
  // —"si u>=1 devuelvo la camara y me voy"— y NUNCA llega a escribir. `toro` pasaba asi: en el render
  // real la timeline se recorre cuadro a cuadro y deja el bloom en 0.85, y aca daba verde porque el
  // unico seek era al final. Treinta muestras alcanzan para que todo onUpdate haya corrido.
  for (let k = 0; k <= 30; k++) r.tl.time((k / 30) * finPropio, false)
  r.tl.time(finPropio, false)
  const p = camera.position
  const vuelve = Math.abs(p.x) < 0.02 && Math.abs(p.y) < 0.02 && Math.abs(p.z - distBase) < 0.02
    && Math.abs(camera.rotation.x) < 0.01 && Math.abs(camera.rotation.y) < 0.01 && Math.abs(camera.rotation.z) < 0.01
  ok(vuelve, `${id}: la camara termina en (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) rot(${camera.rotation.x.toFixed(2)}, ${camera.rotation.y.toFixed(2)}, ${camera.rotation.z.toFixed(2)}) y tiene que volver a (0, 0, ${distBase.toFixed(2)}) rot(0,0,0)`)

  // ---- EL POST TAMBIEN SE DEVUELVE. Es la misma regla que la camara y faltaba: bloom y el pase de
  // pelicula son estado COMPARTIDO por toda la pieza, asi que una escena que los mueve y no los deja
  // como los encontro se los cambia a TODAS las que siguen.
  //
  // Y no era teorico. `tipografia` subia el bloom a 1.15 y despues "restauraba" a 0.85 escrito a mano
  // —el valor de ANTHEM, no el del aire—, y esta temprano en las cuatro ordenes del guion: diez de los
  // once aires terminaban la pieza con la floracion del aire tecnico. Un aire editorial declara 0.14 y
  // seguia en 0.85, seis veces mas bloom del que se calibro. La compuerta no podia verlo porque su
  // propio fixture estaba sembrado en 0.85; ahora va con centinelas.
  const postFin = [
    ['bloom.strength', ctx.bloom.strength, POST0.strength],
    ['bloom.radius', ctx.bloom.radius, POST0.radius],
    ['bloom.threshold', ctx.bloom.threshold, POST0.threshold],
    ['uGrano', ctx.pelicula.uGrano.value, POST0.grano],
    ['uVinieta', ctx.pelicula.uVinieta.value, POST0.vinieta],
    ['uAberr', ctx.pelicula.uAberr.value, POST0.aberr],
    ['uFlash', ctx.pelicula.uFlash.value, POST0.flash],
  ]
  for (const [nombre, fin, ini] of postFin) {
    ok(Math.abs(fin - ini) < 1e-4,
      `${id}: deja ${nombre} en ${fin} y lo encontro en ${ini} — el post es estado COMPARTIDO y se lo cambia a todas las escenas que siguen`)
  }

  // ---- NADA DESCANSA. Se recorre la timeline muestreando la posicion/escala/opacidad de todo el
  // grupo y se busca la ventana mas larga sin cambios. Un beat entero sin movimiento no es un
  // silencio, es una diapositiva.
  // La firma se toma sobre la matriz MUNDIAL, no sobre la posicion local. Leyendo la local, una malla
  // quieta dentro de un grupo que se mueve figura como quieta — y asi se mueve casi todo hero: la
  // geometria esta fija en su grupo y lo que viaja es el grupo. Con la version local, un hero que
  // llegaba, flotaba y salia daba "nada se mueve" en toda su duracion, y mando a arreglar un bug que
  // no existia. Una compuerta que acusa en falso cuesta mas que no tenerla.
  // PUNTO CIEGO QUE COSTO UNA ESCENA ENTERA. Esta firma miraba SOLO `r.g`, y hay escenas que dejan
  // ahi apenas dos mallas: todo lo que el espectador ve —la pagina, los recortes reales, el marco—
  // vive en `gr`, la escena post-bloom. Con la version vieja, una escena podia quedarse
  // completamente quieta durante sus seis beats y salir en verde, porque lo unico que se movia era lo
  // que la compuerta no miraba. Lo encontro una revision adversarial sobre la escena "pantalla": el
  // verificador estaba verde con CINCO defectos adentro.
  //
  // `gr` es donde va TODO recorte real de la pagina, o sea la parte mas valiosa del producto. Era
  // justo lo que no se estaba controlando.
  // LOS UNIFORMS TAMBIEN SON MOVIMIENTO, y esta firma miraba UNO SOLO: `uProg`. Todo lo que se anima
  // por otro uniform quedaba afuera de las dos preguntas que esta funcion contesta, y son las dos que
  // mas importan: "¿esto se quedo quieto un beat entero?" y "¿esto es determinista?".
  //
  // El caso que lo probo es el scroll de la pagina. `portatil`, `telefono`, `ventana`, `pantalla` y
  // `mesa` mueven la pagina animando `tira.offset`, que viaja al shader en un uniform vec2. Con la
  // firma vieja eso no existia: el hero del portatil tuvo durante semanas un shader que IGNORABA el
  // offset —o sea que el scroll no movia un pixel— y la compuerta no podia ni acusarlo ni
  // desmentirlo, porque tampoco lo leia. Un movimiento que la compuerta no mira es un movimiento que
  // puede no estar ocurriendo.
  //
  // Se registran numeros, vectores y colores; las texturas y las matrices se saltean (una textura no
  // se anima, y su identidad no dice nada sobre el cuadro). Sumar informacion a la firma NO puede
  // inventar un fallo de quietud —solo puede revelar movimiento donde antes se veia una diapositiva—
  // y en cambio hace mas ESTRICTO el determinismo, que es exactamente lo que se le pide.
  const valorUniforme = (v) => {
    if (typeof v === 'number') return v.toFixed(4)
    if (!v || typeof v !== 'object') return ''
    if (v.isVector2) return `${v.x.toFixed(4)}/${v.y.toFixed(4)}`
    if (v.isVector3) return `${v.x.toFixed(4)}/${v.y.toFixed(4)}/${v.z.toFixed(4)}`
    if (v.isVector4 || v.isQuaternion) return `${v.x.toFixed(4)}/${v.y.toFixed(4)}/${v.z.toFixed(4)}/${v.w.toFixed(4)}`
    if (v.isColor) return `${v.r.toFixed(4)}/${v.g.toFixed(4)}/${v.b.toFixed(4)}`
    return ''
  }
  const firmaDe = (grupo, extra) => {
    let s = ''
    for (const raiz of [grupo, extra]) {
      if (!raiz) continue
      raiz.updateWorldMatrix(true, true)
      raiz.traverse(o => {
      // LINEAS Y SPRITES CUENTAN. Las aristas encendidas de un cubo, los filetes y los halos son
      // `LineSegments` y `Sprite`, y quedaban fuera de la firma: una escena cuyo unico movimiento
      // fueran sus lineas figuraba como diapositiva.
      if (!o.isMesh && !o.isPoints && !o.isLine && !o.isLineSegments && !o.isSprite) return
      const e = o.matrixWorld.elements
      for (let i = 0; i < 16; i++) s += e[i].toFixed(3) + ','
      s += `${o.visible ? 1 : 0},`
        + `${(o.material && o.material.opacity != null ? o.material.opacity : 1).toFixed(3)},`
      const u = o.material && o.material.uniforms
      if (u) for (const k of Object.keys(u).sort()) {
        const t = u[k] && valorUniforme(u[k].value)
        if (t) s += `${k}=${t},`
      }
      s += ';'
      })
    }
    return s
  }
  const firma = () => firmaDe(r.g, r.gr)
  const N = Math.max(12, Math.round(dur * 30))
  let previa = null, quieto = 0, peor = 0
  for (let i = 0; i <= N; i++) {
    r.tl.time((i / N) * finPropio, false)
    const f = firma()
    if (f === previa) { quieto++; peor = Math.max(peor, quieto) } else { quieto = 0 }
    previa = f
  }
  const quietoSeg = (peor / N) * dur
  ok(quietoSeg < BEAT * 1.05, `${id}: ${quietoSeg.toFixed(2)}s sin que se mueva NADA (mas de un beat) — eso se lee como diapositiva`)

  // ---- DETERMINISMO: construir dos veces con la misma semilla tiene que dar la misma firma.
  const camera2 = new THREE.PerspectiveCamera(fov, W / H, 0.1, 400)
  camera2.position.set(0, 0, distBase)
  let semilla2 = 1
  const ctx2 = { ...ctx, camera: camera2, fondo: uni(), rnd: () => { semilla2 = (semilla2 * 1664525 + 1013904223) >>> 0; return semilla2 / 4294967296 } }
  reiniciarReparto(); reiniciarRecortes()
  const r2 = await mod.build(ctx2)
  r.tl.time(finPropio * 0.5, false); const fa = firma()
  const gg = r.g; const guardar = gg
  void guardar
  r2.tl.time((r2.tl.duration()) * 0.5, false)
  // La MISMA funcion de firma para las dos construcciones. Estaba duplicada a mano, y al cambiar una
  // sola -la de arriba, a matriz mundial- las dos dejaron de hablar el mismo idioma: el chequeo empezo
  // a acusar de no-determinista a toda escena correcta. Una comparacion con dos formatos distintos no
  // compara nada.
  const fb = firmaDe(r2.g, r2.gr)
  if (fa !== fb && process.env.DIFF) {
    const A = fa.split(';'), B = fb.split(';')
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (A[i] !== B[i]) { console.error(`  DIFF obj ${i}:
    A=${A[i]}
    B=${B[i]}`); break }
    }
    console.error(`  objetos A=${A.length} B=${B.length}`)
  }
  ok(fa === fb, `${id}: dos construcciones con la misma semilla dan escenas distintas`)

  if (!fails) console.log(`  ${id}: OK — ${r.g.children.length} objetos, ${dur.toFixed(2)}s de ${limite.toFixed(2)}s, quietud maxima ${quietoSeg.toFixed(2)}s`)
  else console.log(`  ${id}: revisado (${dur.toFixed(2)}s / ${limite.toFixed(2)}s)`)
}

// ---------------------------------------------------------------- E-EASE-VALIDO
// GSAP NO AVISA CUANDO NO ENTIENDE UN EASE. Parsea el string a undefined y cae en silencio a su ease
// por defecto —power1.out—, asi que un `power2.4.in` no tira error, no rompe el render y no ensucia la
// consola: el objeto simplemente se mueve al reves de lo pedido. Medido: `acelera` producia una cadena
// invalida en tres aires (tecnico, artesanal y deportivo), y uno de los dos sitios de llamada es la
// cortina de apertura.js:196 — el PRIMER movimiento de la pieza, desacelerando donde tenia que acelerar.
//
// Se barren los cuatro verbos de los once aires contra los argumentos que las escenas usan DE VERDAD,
// leidos de los archivos: asi la compuerta se actualiza sola cuando alguien escribe una llamada nueva y
// no hay una lista a mano que se desincronice. `gsap.parseEase` es el mismo parser que usa el render.
{
  // El namespace y no la desestructuracion: `E` es un binding vivo que `configurar()` reasigna, y
  // destructurarlo congela el valor del momento del import — leeria siempre el gesto base.
  const kit = await import(pathToFileURL(join(HERE, 'kit.js')).href)
  const VERBOS = ['llega', 'frena', 'acelera', 'vaiven']
  const usados = { llega: new Set(), frena: new Set(), acelera: new Set(), vaiven: new Set() }
  for (const d of ['escenas', 'heroes']) {
    const dir = join(HERE, d)
    for (const f of readdirSync(dir).filter(x => x.endsWith('.js'))) {
      const src = readFileSync(join(dir, f), 'utf8')
      for (const m of src.matchAll(/E\.(llega|frena|acelera|vaiven)\(([^)]*)\)/g)) {
        const a = m[2].trim()
        if (a === '') usados[m[1]].add(undefined)
        else if (/^[\d.]+$/.test(a)) usados[m[1]].add(parseFloat(a))
      }
    }
  }
  const dirAires = join(HERE, 'aires')
  for (const f of readdirSync(dirAires).filter(x => x.endsWith('.js'))) {
    const aire = (await import(pathToFileURL(join(dirAires, f)).href)).default
    kit.configurar(aire)
    for (const v of VERBOS) {
      for (const arg of usados[v]) {
        const s = kit.E[v](arg)
        if (!gsap.parseEase(s)) {
          die(`E-EASE-VALIDO  el aire "${f.replace('.js', '')}" con ${v}(${arg}) produce "${s}", que GSAP no parsea: cae en silencio a power1.out y el movimiento sale al reves del pedido`)
        }
      }
    }
  }
  kit.configurar(null)                               // se deja el vocabulario como estaba
}

// ---------------------------------------------------------------- E-SHADER-ENTERO
// `node --check` caza la comilla invertida perdida SOLO cuando rompe la sintaxis. El caso silencioso es
// peor: si el template literal se cierra antes de tiempo y lo que sigue resulta ser JavaScript valido,
// el shader llega al navegador MUTILADO —sin su main, sin su salida— y el error aparece como un objeto
// que no se dibuja, sin una linea en ninguna consola.
//
// Esto ya me paso CUATRO veces en este repo, siempre por escribir un identificador entre comillas
// invertidas dentro de un comentario del shader. La comprobacion es tonta y definitiva: todo literal de
// fragmentShader tiene que terminar declarando su salida, y todo vertexShader la suya. Si una comilla lo
// corto antes, el texto no las contiene.
// LEIA DOS ARCHIVOS Y LOS SHADERS VIVEN EN TREINTA. `main.js` y `kit.js` tienen algunos; escenas/ y
// heroes/ tienen 28 literales mas y 2 asignados por variable, o sea que la compuerta escrita porque el
// defecto paso CUATRO veces cubria una fraccion de la superficie donde puede volver a pasar. La lista
// se arma leyendo las carpetas para que no haya que acordarse de actualizarla: es el mismo modismo que
// ya usa E-EASE-VALIDO unas lineas mas arriba.
//
// Y SE MIRAN LAS DOS FORMAS DE DECLARAR UN SHADER. `ventana.js` no escribe `fragmentShader: \`...\``
// sino `fragmentShader: FRAG`, con FRAG definido antes como template literal. Buscando solo la forma
// directa, los dos shaders mas largos del motor —los de la ventana, que es el hero que MUESTRA LA
// PAGINA— quedaban afuera justo por estar bien escritos.
const ARCH_SHADER = ['main.js', 'kit.js']
for (const d of ['escenas', 'heroes']) {
  for (const f of readdirSync(join(HERE, d)).filter(x => x.endsWith('.js'))) ARCH_SHADER.push(join(d, f))
}
let shadersMirados = 0
for (const arch of ARCH_SHADER) {
  const src = readFileSync(join(RAIZ, 'render3d', 'demo', arch), 'utf8')
  // Un literal de shader que arranca en `desde` tiene que llegar a su marca ANTES de la comilla que lo
  // cierra. Si una comilla invertida perdida lo corto antes, el texto no la contiene y eso es todo lo
  // que hay que preguntar.
  const revisar = (desde, clave, marca, comoLlega) => {
    const fin = src.indexOf('`', desde)
    const cuerpo = fin < 0 ? src.slice(desde) : src.slice(desde, fin)
    shadersMirados++
    if (!cuerpo.includes(marca)) {
      die(`E-SHADER-ENTERO  ${arch}: un ${clave}${comoLlega} se cierra sin llegar a ${marca} — casi seguro una comilla invertida dentro de un comentario del shader`)
    }
    return fin < 0 ? src.length : fin + 1
  }
  for (const [clave, marca] of [['fragmentShader', 'gl_FragColor'], ['vertexShader', 'gl_Position']]) {
    let i = 0
    while ((i = src.indexOf(clave + ': `', i)) >= 0) i = revisar(i + clave.length + 3, clave, marca, '')
    // La forma por variable: se busca a que identificador se le asigna y se revisa SU literal.
    for (const m of src.matchAll(new RegExp(clave + String.fromCharCode(58) + ' ([A-Za-z_$][\w$]*)', 'g'))) {
      const decl = src.indexOf('const ' + m[1] + ' = `')
      if (decl >= 0) revisar(decl + ('const ' + m[1] + ' = `').length, clave, marca, ` (por ${m[1]})`)
    }
  }
}

// ---------------------------------------------------------------- E-COMPOSITOR-PARSEA
// NINGUNA de las cinco compuertas de la zona tocaba main.js. Las escenas se importan una por una y el
// compositor no, asi que un error de sintaxis ahi pasaba las cinco en verde y aparecia recien al
// renderizar — como un timeout de Playwright esperando window.URVID, sin una linea que diga que paso.
// Costo una tanda entera de renders, y el error era una comilla invertida dentro de un comentario del
// shader: el shader se escribe como template literal y se cierra con la primera que aparezca.
//
// node --check parsea sin resolver imports ni ejecutar nada: cuesta milisegundos y cierra la clase.
for (const arch of ['main.js', 'kit.js', 'guion.js', 'datos.js', 'adn.js']) {
  try {
    execFileSync(process.execPath, ['--check', join(RAIZ, 'render3d', 'demo', arch)], { stdio: 'pipe' })
  } catch (e) {
    const linea = String(e.stderr || e.message).split(/\r?\n/).find(l => l.includes('Error')) || 'error de sintaxis'
    die(`render3d/demo/${arch} no parsea: ${linea}`)
  }
}

if (fails) { console.error(`\nVERIFICAR: ${fails} FAIL`); process.exit(1) }

console.log(`  E-SHADER-ENTERO: ${shadersMirados} shaders revisados en ${ARCH_SHADER.length} archivos (literales y asignados por variable).`)
console.log(`VERIFICAR OK (${ids.length} escena${ids.length > 1 ? 's' : ''}: contrato, sin azar ni reloj propio, duracion dentro de sus beats, camara devuelta, nada descansa mas de un beat, determinista).`)
