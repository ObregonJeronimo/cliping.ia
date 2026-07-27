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
  fonts: { ready: Promise.resolve(), load: async () => {} },
}
globalThis.window = globalThis

// ---- GSAP avisa por consola cuando le pedis animar un target que no existe, y sigue como si nada.
// Es exactamente la forma de un defecto de composicion: la escena se armo con menos material del que
// esperaba (una pagina con un solo dato, sin CTA) y quedaron tweens apuntando al vacio. No falla, no
// se ve en el codigo, y en el video sale un hueco. Se captura el aviso y se convierte en FAIL.
const AVISOS = []
const _warn = console.warn.bind(console)
console.warn = (...a) => { AVISOS.push(a.join(' ')); }
const { gsap } = await import(pathToFileURL(join(RAIZ, 'node_modules', 'gsap', 'index.js')).href)
globalThis.gsap = gsap
const THREE = await import(pathToFileURL(join(RAIZ, 'node_modules', 'three', 'build', 'three.module.js')).href)
const { BEAT, LOOK, b, limpiarCache } = await import(pathToFileURL(join(HERE, 'kit.js')).href)

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
    configurarDatos({ ...ANTHEM, marca, frases: [marca], datos: [], cta: null, golpe: marca })
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
      rm = await mod.build({ ...ctx, camera: cm, fondo: uni(), rnd: () => { sm = (sm * 1664525 + 1013904223) >>> 0; return sm / 4294967296 } })
    } catch (e) { die(`E-ENCAJE ${id}: con la marca "${marca}" build() lanzo — ${e.message}`); continue }
    if (!rm || !rm.g) continue
    rm.tl.time(mod.meta.beats * BEAT * 0.72, false)      // ya asentada, antes de la salida
    // SE MIDE OBJETO POR OBJETO, no la union. La primera version tomaba el bounding box de todo el
    // grupo y acusaba a las dos escenas correctas: `toro` tiene particulas a 80 unidades y
    // `tipografia` estaciona las frases fuera del cuadro esperando su turno. Eso es composicion
    // valida — lo que no puede pasar es que UNA pieza visible sea mucho mas grande que el cuadro.
    // Se ignora lo que esta lejos del centro (estacionado) y lo que es fondo (muy grande a proposito
    // y detras de todo).
    const caja = new THREE.Box3()
    const v = new THREE.Vector3()
    let peor = null
    rm.g.traverse(o => {
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
      const esFondo = !(o.material && o.material.map) && t.x >= mundoW * 0.9 && t.y >= mundoH * 0.9
      const esFilete = Math.min(t.x, t.y) < 0.15
      if (esFondo || esFilete || t.y > mundoH * 1.6) return
      if (!peor || t.y > peor.y) peor = { x: t.x, y: t.y }
    })
    if (peor) {
      ok(peor.y <= mundoH * 0.85 && peor.x <= mundoW * 2.2,
        `E-ENCAJE ${id}: con la marca "${marca}" una pieza mide ${peor.x.toFixed(2)}x${peor.y.toFixed(2)} en un cuadro de ${mundoW.toFixed(2)}x${mundoH.toFixed(2)} — se come el cuadro`)
    }
    // El nombre entero o nada: un truncado silencioso es peor que un nombre chico.
    //
    // Se comparan CONJUNTOS de letras y no cantidades: `texto()` cachea por clave, así que una marca
    // con letras repetidas ("CONSTRUCCIONES" tiene tres C y dos O) rasteriza cada glifo UNA sola vez
    // y contar los fillText da menos letras de las que la palabra tiene. La primera versión de este
    // chequeo acusaba de truncado a una escena que dibujaba el nombre completo.
    const larga = marca.split(/\s+/).sort((a, c) => c.length - a.length)[0]
    const dibujadas = new Set(ESCRITO.filter(t => t.length === 1 && /[A-ZÁÉÍÓÚÑ]/i.test(t)).map(t => t.toUpperCase()))
    if (dibujadas.size) {
      const faltan = [...new Set(larga.split(''))].filter(L => !dibujadas.has(L))
      ok(faltan.length === 0,
        `E-ENCAJE ${id}: de la marca "${larga}" no se dibujaron las letras ${faltan.join('')} — se trunco en silencio`)
    }
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
  r.tl.time(finPropio, false)
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
  const r2 = await mod.build(ctx2)
  r.tl.time(finPropio * 0.5, false); const fa = firma()
  const gg = r.g; const guardar = gg
  void guardar
  r2.tl.time((r2.tl.duration()) * 0.5, false)
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
