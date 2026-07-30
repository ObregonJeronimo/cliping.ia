// GATE del ADN: la identidad medida de la página tiene que LLEGAR A LA PANTALLA, y legible.
//
// Este gate existe porque el defecto que arregla era invisible desde el código: el motor medía fondo,
// acento, tinta y tipografía de cada página, y después construía el video con la paleta escrita a mano
// en el aire. Nada fallaba. Simplemente todos los videos salían iguales, y hacía falta ponerlos al lado
// para verlo. Un gate convierte eso en un número.
//
// Prueba el producto cruzado FIXTURES × AIRES, que es lo que el motor va a producir de verdad, y
// controla cuatro cosas:
//   E-ADN-POLARIDAD  el mundo es claro si y sólo si la página medida es clara
//   E-ADN-HUE        el acento conserva el TONO de la marca (±14°) cuando la marca tiene color
//   E-ADN-LEGIBLE    tinta y los tres acentos tienen contraste suficiente contra SU fondo
//   E-ADN-VARIEDAD   dos páginas distintas con el mismo aire NO dan la misma paleta,
//                    y una misma página con aires distintos TAMPOCO
//
// El de VARIEDAD es el que responde al reclamo textual del usuario: "en todos los ejemplos q me
// mandaste se vieron videos identicos".
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Los aires son módulos de navegador: algunos registran fuentes con FontFace al importarse. El stub es
// lo mínimo para que `import` no explote en Node — no se ejecuta nada de render acá.
// El stub ANOTA que familias construye cada aire. No alcanza con leer el archivo: los aires registran
// de cuatro formas distintas —`for (const nombre of [...])`, `for (const n of [...])`, y gastronomico
// desde `Object.values(CARAS)`, o sea una variable— y una version de esta compuerta que buscaba el
// nombre en el texto daba verde SIEMPRE, porque el propio `fuentes: { display: 'X' }` ya contiene la
// cadena. Probado A/B: con la version de texto, vaciarle la lista de registro a "lujo" no fallaba.
// Ejecutar el modulo y anotar lo que construye mide lo que pasa de verdad, sin importar como se escriba.
let _capturando = []
globalThis.document = { fonts: { *[Symbol.iterator]() {}, add() {}, check: () => true, load: async () => {} } }
globalThis.FontFace = class {
  constructor(familia) { this.family = familia; _capturando.push(familia) }
  async load() { return this }
}

const HERE = dirname(fileURLToPath(import.meta.url))
const { personalizar, contraste, aHsl, SAT_GRIS } = await import('../render3d/demo/adn.js')

const dirAires = join(HERE, '..', 'render3d', 'demo', 'aires')
const dirFix = join(HERE, 'fixtures', 'director', 'elementos')
const AIRES = {}
const REGISTRA = new Map()               // aire -> familias que su modulo construye de verdad
for (const f of readdirSync(dirAires).filter(f => f.endsWith('.js'))) {
  const nom = f.replace('.js', '')
  _capturando = []                       // el modulo corre su registro al importarse: lo que caiga aca es suyo
  AIRES[nom] = (await import(`../render3d/demo/aires/${f}`)).default
  REGISTRA.set(nom, new Set(_capturando))
}
const FIX = readdirSync(dirFix).filter(f => f.endsWith('.json'))
  .map(f => ({ id: f.replace('.json', ''), pm: JSON.parse(readFileSync(join(dirFix, f), 'utf8')) }))
  .filter(x => x.pm.dna && x.pm.dna.palette)

const fallos = []
const F = (cod, msg) => fallos.push(`${cod}  ${msg}`)
// Distancia angular de tono: 350° y 10° están a 20°, no a 340°.
const dHue = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180)

const porAire = {}
for (const { id, pm } of FIX) {
  for (const [nombreAire, aire] of Object.entries(AIRES)) {
    const a = personalizar(aire, pm.dna, () => 0.5)
    const P = a.paleta
    const etiq = `${id} × ${nombreAire}`

    const claroMedido = pm.dna.palette.bgLum > 0.42
    if (a.claro !== claroMedido) {
      F('E-ADN-POLARIDAD', `${etiq}: la página mide bgLum ${pm.dna.palette.bgLum} y el aire salió ${a.claro ? 'claro' : 'oscuro'}`)
    }

    const marca = pm.dna.palette.accentText || pm.dna.palette.accent
    if (marca && aHsl(marca).s >= SAT_GRIS) {
      const d = dHue(aHsl(P.acento).h, aHsl(marca).h)
      if (d > 14) F('E-ADN-HUE', `${etiq}: la marca es ${marca} (tono ${aHsl(marca).h.toFixed(0)}°) y el acento salió ${P.acento} (${aHsl(P.acento).h.toFixed(0)}°), ${d.toFixed(0)}° de corrimiento`)
    }

    const piso = a.claro ? 3.2 : 2.6
    const chequeos = [['tinta', P.tinta, 6.5], ['acento', P.acento, piso],
      ['acento2', P.acento2, piso], ['calido', P.calido, piso * 0.85]]
    for (const [rol, col, min] of chequeos) {
      const c = contraste(col, P.bg)
      if (c < min - 0.05) F('E-ADN-LEGIBLE', `${etiq}: ${rol} ${col} sobre ${P.bg} da ${c.toFixed(2)}:1, hace falta ${min}`)
    }

    ;(porAire[nombreAire] ||= []).push({ id, firma: JSON.stringify(P) })
  }
}

// VARIEDAD entre páginas: el mismo aire con dos ADN distintos no puede dar la misma paleta.
for (const [nombreAire, filas] of Object.entries(porAire)) {
  const vistos = new Map()
  for (const { id, firma } of filas) {
    if (vistos.has(firma)) F('E-ADN-VARIEDAD', `${nombreAire}: "${id}" y "${vistos.get(firma)}" dan la MISMA paleta`)
    else vistos.set(firma, id)
  }
}
// VARIEDAD entre aires: una misma página con dos aires distintos tampoco. Sin esto, el ADN pisaría
// tanto que los once aires colapsarían en uno — el error opuesto y igual de malo.
for (const { id, pm } of FIX) {
  const vistos = new Map()
  for (const [nombreAire, aire] of Object.entries(AIRES)) {
    const f = JSON.stringify(personalizar(aire, pm.dna, () => 0.5).paleta)
    if (vistos.has(f)) F('E-ADN-VARIEDAD', `${id}: los aires "${nombreAire}" y "${vistos.get(f)}" dan la MISMA paleta — el ADN pisó la personalidad`)
    else vistos.set(f, nombreAire)
  }
}

// ---------------------------------------------------------------- E-ADN-AIRE-MUERTO
// Once aires escritos, nueve alcanzables. "bienestar" y "deportivo" no los producia NINGUNA entrada
// posible: existian, se mantenian, y ningun video del mundo iba a usarlos. Un gimnasio recibia el aire
// de una panaderia porque los dos son 'servicio-local'.
//
// Se barre una grilla de paginas plausibles —los ocho rubros que el clasificador puede devolver, por
// energia, calidez y registro— y se exige que cada aire de la carpeta salga al menos una vez. Es la
// unica forma de que "escribi un aire nuevo" y "el motor puede elegirlo" sean la misma cosa: sin esto
// las dos afirmaciones se separan en silencio y nadie se entera hasta que alguien las cuenta.
const { aireDe } = await import('./anthem-datos.mjs')
const RUBROS = ['saas', 'app', 'ecommerce', 'servicio-local', 'educacion', 'media', 'portfolio',
  'evento', 'otro']
const producidos = new Set()
const porRubro = new Map()               // rubro -> Set de aires que ese rubro puede producir
let barridos = 0
for (const tipoNegocio of RUBROS) {
  porRubro.set(tipoNegocio, new Set())
  for (const energia of [0.1, 0.25, 0.35, 0.5, 0.7, 0.85, 0.95]) {
    for (const calidez of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      for (const register of ['casual', 'formal']) {
        barridos++
        const elegido = aireDe({
          semantica: { tipoNegocio, audiencia: { register } },
          dna: { mood: { energia, calidez } },
        })
        producidos.add(elegido)
        porRubro.get(tipoNegocio).add(elegido)
      }
    }
  }
}
const muertos = Object.keys(AIRES).filter(a => !producidos.has(a))
for (const m of muertos) {
  F('E-ADN-AIRE-MUERTO', `el aire "${m}" existe en render3d/demo/aires/ y NINGUNA pagina posible lo elige — ${barridos} combinaciones barridas`)
}

// ---------------------------------------------------------------- E-MOBILIARIO-DECLARADO / E-MARCO-VARIEDAD
// El mueble del cuadro —fondo, marco, hud— era la mitad de la identidad de una pieza y se HEREDABA en
// silencio: "inmobiliario" no declaraba `mobiliario` y configurar() le pegaba el de ANTHEM entero, asi
// que el aire de arquitectura salia con grilla en fuga, corchetes de camara y rotulos de ficha tecnica.
// Nadie lo decidio y nada fallaba. Es exactamente la clase de defecto que este archivo existe para
// cazar: invisible desde el codigo, visible solo poniendo dos videos al lado.
//
// MARCOS se IMPORTA del kit y no se copia. Una lista escrita a mano en un gate deja de coincidir con la
// del motor sin avisar — le paso a guion-check, que medio un catalogo fantasma de 10 escenas cuando ya
// habia 16 y por eso no reportaba guiones cortos.
const { MARCOS, MONTAJES } = await import('../render3d/demo/kit.js')
for (const [nombre, a] of Object.entries(AIRES)) {
  if (!a.mobiliario) { F('E-MOBILIARIO-DECLARADO', `el aire "${nombre}" no declara mobiliario: hereda el de ANTHEM sin que nadie lo haya decidido`); continue }
  const mc = a.mobiliario.marco
  if (!mc) F('E-MOBILIARIO-DECLARADO', `el aire "${nombre}" declara mobiliario pero no "marco"`)
  else if (!MARCOS.includes(mc)) F('E-MOBILIARIO-DECLARADO', `el aire "${nombre}" pide el marco "${mc}", que no esta en MARCOS (${MARCOS.join(', ')})`)
}

// El marco era un BOOLEANO y por eso todas las piezas se veian iguales por el borde: prendido dibujaba
// siempre el mismo corchete. Con la familia no alcanza que EXISTAN cinco formas — hay que exigir que se
// repartan, y sobre todo que dos aires alcanzables desde el MISMO rubro no compongan el mismo mueble,
// que es el caso que el espectador puede ver uno al lado del otro.
const marcosVivos = new Set([...producidos].map(a => AIRES[a] && AIRES[a].mobiliario && AIRES[a].mobiliario.marco).filter(Boolean))
if (marcosVivos.size < 4) {
  F('E-MARCO-VARIEDAD', `los aires alcanzables reparten solo ${marcosVivos.size} marcos distintos (${[...marcosVivos].join(', ')}); hacen falta 4`)
}
for (const [rubro, aires] of porRubro) {
  const vistos = new Map()
  for (const nombre of aires) {
    const mb = AIRES[nombre] && AIRES[nombre].mobiliario
    if (!mb) continue
    const firma = `${mb.fondo}|${mb.marco}|${!!mb.hud}`
    if (vistos.has(firma)) F('E-MARCO-VARIEDAD', `rubro "${rubro}": los aires "${nombre}" y "${vistos.get(firma)}" componen el MISMO mueble (${firma})`)
    else vistos.set(firma, nombre)
  }
}

// ---------------------------------------------------------------- E-LUZ-VARIEDAD
// La viñeta era la tercera fuente del "recuadro en los cuatro costados" del que se quejo el usuario, y
// la mas escondida: la FORMA estaba horneada en el shader —`smoothstep(0.95, 0.10, r2)` con r2 en UV—
// y era byte a byte la misma en los once aires. Solo variaba `vinieta`, o sea CUANTO oscurece, nunca
// DONDE. Once personalidades declarando su exposicion y las once recibiendo el mismo recorte de luz.
//
// Se mide la terna completa (forma, centro, aspecto) porque cambiar solo la intensidad es exactamente
// el error que este archivo existe para cazar: variedad de parametro disfrazada de variedad de tipo.
// LAS DOS CAPAS, no solo la viñeta. El "recuadro en los cuatro costados" lo hacian DOS mascaras
// radiales apiladas: la viñeta del pase de post y el degrade del fondo, las dos centradas, las dos
// con umbrales escritos a mano y las dos identicas en los once aires. Medido antes de tocarlas: la
// esquina del cuadro quedaba al 38% de la luminancia del centro en TODA pieza de TODO aire. Auditar
// una sola dejaba la otra libre para volver a igualarlo todo.
const firmaLuz = (a) => {
  const p = a.pelicula || {}
  const m = a.mobiliario || {}
  return `${p.vinietaForma || 0}|${(p.vinietaCentro || [0.5, 0.5]).join(',')}|${p.vinietaAsp || 1}`
    + `//${m.fondoForma || 0}|${(m.fondoCentro || [0.5, 0.58]).join(',')}|${m.fondoAsp || 1}`
}
const lucesVivas = new Set([...producidos].map(n => firmaLuz(AIRES[n] || {})))
// CADA CAPA POR SEPARADO. Con la firma combinada alcanza que UNA de las dos varie para dar verde, y
// probandolo se vio: revirtiendo la luz del fondo en los diez aires, la compuerta seguia en verde
// porque las viñetas solas ya daban once firmas. Pero el recuadro lo hacen las DOS apiladas, asi que
// dejar una plana devuelve la mitad del defecto. Se exige que las dos repartan.
const fondosVivos = new Set([...producidos].map(n => {
  const m = (AIRES[n] || {}).mobiliario || {}
  return `${m.fondoForma || 0}|${(m.fondoCentro || [0.5, 0.58]).join(',')}|${m.fondoAsp || 1}`
}))
if (fondosVivos.size < 4) {
  F('E-LUZ-VARIEDAD', `el degrade del fondo reparte solo ${fondosVivos.size} formas entre los aires alcanzables; hacen falta 4. Es la segunda mitad del recuadro: la viñeta puede variar y el fondo seguir siendo el mismo ovalo centrado en los once`)
}
if (lucesVivas.size < 6) {
  F('E-LUZ-VARIEDAD', `los aires alcanzables reparten solo ${lucesVivas.size} formas de luz distintas; hacen falta 6`)
}
for (const [rubro, aires] of porRubro) {
  const vistos = new Map()
  for (const nombre of aires) {
    const f = firmaLuz(AIRES[nombre] || {})
    if (vistos.has(f)) F('E-LUZ-VARIEDAD', `rubro "${rubro}": los aires "${nombre}" y "${vistos.get(f)}" recortan la luz con la MISMA forma`)
    else vistos.set(f, nombre)
  }
}

// ---------------------------------------------------------------- E-MONTAJE-DECLARADO / E-MONTAJE-VARIEDAD
// EL MONTAJE ERA LA DIMENSION MAS MUERTA DE TODAS. main.js sabia repartir cinco gestos de corte y leer
// `AIRE.transiciones` desde que se escribio el sistema, y NINGUNO de los once aires lo declaraba: los
// once caian al reparto de ANTHEM. Una pieza de joyeria cortaba exactamente igual que una de deporte.
// Y el modo de falla es silencioso en los dos sentidos: no declararlo no rompe nada, y declarar un
// gesto que no existe tampoco —main.js cae en un `else` vacio y el corte sale duro sin avisar—.
for (const [nombre, a] of Object.entries(AIRES)) {
  const tr = a.transiciones
  if (!Array.isArray(tr) || !tr.length) { F('E-MONTAJE-DECLARADO', `el aire "${nombre}" no declara "transiciones": cae al reparto de ANTHEM y corta como el aire tecnico`); continue }
  for (const x of tr) {
    if (!MONTAJES.includes(x)) F('E-MONTAJE-DECLARADO', `el aire "${nombre}" pide el gesto de montaje "${x}", que no esta en MONTAJES (${MONTAJES.join(', ')}): main.js lo ignora y ese corte sale duro`)
  }
}
// Que existan cinco gestos no reparte nada por si solo. Se exige que los aires alcanzables compongan
// montajes distintos, y sobre todo que dos aires del MISMO rubro no corten igual — que es el par que
// un cliente puede llegar a ver uno al lado del otro.
const montajesVivos = new Set([...producidos].map(a => JSON.stringify((AIRES[a] || {}).transiciones || null)))
if (montajesVivos.size < 5) {
  F('E-MONTAJE-VARIEDAD', `los aires alcanzables reparten solo ${montajesVivos.size} montajes distintos; hacen falta 5`)
}
for (const [rubro, aires] of porRubro) {
  const vistos = new Map()
  for (const nombre of aires) {
    const firma = JSON.stringify((AIRES[nombre] || {}).transiciones || null)
    if (vistos.has(firma)) F('E-MONTAJE-VARIEDAD', `rubro "${rubro}": los aires "${nombre}" y "${vistos.get(firma)}" cortan EXACTAMENTE igual`)
    else vistos.set(firma, nombre)
  }
}

// ---------------------------------------------------------------- E-GESTO-VARIEDAD
// TRES LLAMADAS SON EL 54% DE TODO EL MOVIMIENTO DEL MOTOR. Medido sobre las 600 llamadas a E.* de
// escenas y heroes: acelera(2) 115 usos, frena(2) 113, vaiven() 98. Si los aires colapsan ahi, colapsan
// en mas de la mitad de lo que se mueve, por mucho que difieran en los verbos raros.
//
// Y colapsaban: `vaiven()` daba sine.inOut en NUEVE de once aires. Entre ellos lujo, nocturno y
// jugueton — tres personalidades opuestas respirando exactamente igual que el aire tecnico.
//
// El criterio no es "todos distintos", que seria variedad nominal: hay aires calmos a los que sine.inOut
// les corresponde. Es que dos aires alcanzables desde el MISMO rubro —o sea el par que un cliente puede
// llegar a ver uno al lado del otro— no se muevan igual en las tres llamadas dominantes.
const DOMINANTES = [['vaiven', undefined], ['acelera', 2], ['frena', 2]]
const kitG = await import('../render3d/demo/kit.js')
const firmaGesto = (aire) => {
  kitG.configurar(aire)
  return DOMINANTES.map(([v, a]) => kitG.E[v](a)).join('|')
}
const gestosVivos = new Set([...producidos].map(n => firmaGesto(AIRES[n])))
if (gestosVivos.size < 5) {
  F('E-GESTO-VARIEDAD', `los aires alcanzables se mueven con solo ${gestosVivos.size} combinaciones distintas en las tres llamadas que son el 54% del movimiento; hacen falta 5`)
}
for (const [rubro, aires] of porRubro) {
  const vistos = new Map()
  for (const nombre of aires) {
    const f = firmaGesto(AIRES[nombre])
    if (vistos.has(f)) F('E-GESTO-VARIEDAD', `rubro "${rubro}": los aires "${nombre}" y "${vistos.get(f)}" se mueven IGUAL en las tres llamadas dominantes (${f})`)
    else vistos.set(f, nombre)
  }
}
kitG.configurar(null)

// ---------------------------------------------------------------- E-FUENTE-RESUELVE
// UNA CARA QUE NO RESUELVE NO DA ERROR: mide con la de reserva. Es distinto de E-FUENTE-LLEGA —que
// comprueba que ALGUIEN la registre para el render— y complementario: aca se comprueba que el nombre
// que el motor pide sea un nombre que el rasterizador ENCUENTRA.
//
// Medido antes de arreglarlo: 'DMSans', 'PlayfairDisplay-700', 'Oswald-700', 'Archivo-900' y una familia
// INVENTADA daban las cuatro el mismo ancho —1023.73 sobre "ANTHEM HAMBURGO" a 100 px—, o sea la cara de
// reserva. Solo Anton acertaba, y por casualidad: su familia interna se llama igual que su archivo. Toda
// compuerta que mide ancho de texto media diez de los once aires con una cara ajena, y el rango real es
// de 837 (Oswald-700) a 1167 (Archivo-900): un 39% de diferencia.
//
// La deteccion es el ancho de una familia que se sabe inexistente: si una cara declarada mide IGUAL que
// esa, no resolvio.
{
  const { registrarFuentes } = await import('./fuentes-reales.mjs')
  registrarFuentes(join(HERE, '..'))
  const { createCanvas } = await import('@napi-rs/canvas')
  const cx = createCanvas(8, 8).getContext('2d')
  const mide = (fam) => { cx.font = `100px "${fam}"`; return cx.measureText('ANTHEM HAMBURGO').width }
  const reserva = mide('familiaQueNoExisteXYZ')
  for (const [nombre, a] of Object.entries(AIRES)) {
    const pares = [a.fuentes || {}, ...(Array.isArray(a.caras) ? a.caras : [])]
    for (const [i, par] of pares.entries()) {
      for (const [rol, fam] of Object.entries(par || {})) {
        if (Math.abs(mide(fam) - reserva) > 0.01) continue
        F('E-FUENTE-RESUELVE', `el aire "${nombre}" pide ${i === 0 ? rol : `caras[${i - 1}].${rol}`} "${fam}" y el rasterizador NO la encuentra: mide exactamente igual que una familia inexistente, o sea que toda compuerta que mida su ancho lo hace con la cara de reserva`)
      }
    }
  }
}

// ---------------------------------------------------------------- E-CARAS-ALCANZABLES
// LA SEMILLA ELIGE EL VESTUARIO, y hay que comprobar que de verdad lo elija. Un `caras[]` con un solo par
// es codigo que el usuario no va a ver nunca — la misma muerte silenciosa que ya paso con `sello` (una
// escena que no figuraba en ninguna orden del guion) y con los ocho aires que declaraban camara sin que
// nadie la leyera. Se barren ocho semillas por aire y se exige que salga mas de una cara de display.
//
// Y que la MISMA semilla de la MISMA cara: si no, dos renders del mismo pedido salen con distinta
// tipografia, que es peor que no tener variedad.
for (const [nombre, a] of Object.entries(AIRES)) {
  if (!Array.isArray(a.caras) || a.caras.length < 2) continue
  const vistas = new Set()
  for (let s = 1; s <= 8; s++) {
    let x = (s * 2654435761) >>> 0; x = (x ^ (x >>> 15)) >>> 0
    const rnd = () => { x = (x * 1664525 + 1013904223) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296 }
    vistas.add(personalizar(a, { palette: { bgLum: 0.1 }, mood: {} }, rnd).fuentes.display)
  }
  if (vistas.size < 2) {
    F('E-CARAS-ALCANZABLES', `el aire "${nombre}" declara ${a.caras.length} vestuarios y ocho semillas dan siempre "${[...vistas][0]}": el segundo par es codigo que nadie va a ver`)
  }
  // determinismo del pick: la misma semilla, la misma cara
  const dos = [1, 1].map(() => {
    let x = (7 * 2654435761) >>> 0; x = (x ^ (x >>> 15)) >>> 0
    const rnd = () => { x = (x * 1664525 + 1013904223) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296 }
    return personalizar(a, { palette: { bgLum: 0.1 }, mood: {} }, rnd).fuentes.display
  })
  if (dos[0] !== dos[1]) F('E-CARAS-ALCANZABLES', `el aire "${nombre}" da dos caras distintas para la misma semilla: "${dos[0]}" y "${dos[1]}"`)
}

// ---------------------------------------------------------------- E-HALACION
// La halacion tiñe los mips ANCHOS del bloom: es la luz que atraveso la emulsion, rebota contra el
// soporte y vuelve teñida por la capa roja. Un neon blanco en pelicula tiene aura naranja; en digital
// no tiene ninguna.
//
// Se valida la DECLARACION, que es lo unico auditable sin renderizar: color parseable y fuerza en
// rango. Un color con una letra de mas no tira error —THREE.Color lo resuelve a negro— y un aire
// entero saldria con el halo apagado sin que nada lo diga. Es exactamente la familia de defecto que
// este archivo ya caza tres veces: declarado, y no llega.
const HEX6 = /^#[0-9a-fA-F]{6}$/
for (const [nombre, a] of Object.entries(AIRES)) {
  const h = (a.pelicula || {}).halacion
  if (!h) continue
  if (!HEX6.test(String(h.color || ''))) {
    F('E-HALACION', `el aire "${nombre}" declara halacion con color "${h.color}", que no es un hex de seis digitos: THREE.Color lo resuelve a negro y el halo sale apagado sin avisar`)
  }
  const f = h.fuerza == null ? 0.5 : h.fuerza
  if (!(f > 0 && f <= 1)) {
    F('E-HALACION', `el aire "${nombre}" declara halacion con fuerza ${f}: fuera de (0, 1] el tinte o no hace nada o invierte el color del halo`)
  }
}

// ---------------------------------------------------------------- E-FUENTE-LLEGA
// La tipografia es la MITAD de la identidad de una pieza y tres aires enteros la perdian en silencio.
// demo.html declara por @font-face solo las cinco de ANTHEM; cualquier otra familia hay que meterla en
// `document.fonts` desde el modulo del aire. "lujo", "nocturno" y "jugueton" no lo hacian y "deportivo"
// lo hacia a medias, asi que sus piezas salian en la grotesca del sistema: los .ttf estaban bajados,
// declarados en el aire, y no llegaban al cuadro. No fallaba nada. Es el mismo defecto que este archivo
// caza para la paleta —lo medido no llega a la pantalla— entrando por la puerta de al lado.
//
// El camino de main.js:453 no cuenta como registro: saltea la carga si `document.fonts.check()` dice
// que si, y esa funcion contesta true para una familia inexistente. Por eso la compuerta exige el
// registro EXPLICITO en el modulo del aire, que es el unico que usa el test correcto.
const cssDemo = readFileSync(join(HERE, '..', 'render3d', 'demo', 'demo.html'), 'utf8')
const EN_CSS = new Set([...cssDemo.matchAll(/font-family:\s*"([^"]+)"/g)].map(m => m[1]))
const dirFuentes = join(HERE, 'fonts')
const TTF = new Set(readdirSync(dirFuentes).filter(f => f.endsWith('.ttf')).map(f => f.replace('.ttf', '')))
for (const [nombre, a] of Object.entries(AIRES)) {
  const registradas = REGISTRA.get(nombre) || new Set()
  // TODAS LAS CARAS, no solo el par por defecto. `caras[]` es el vestuario que elige la semilla, y si el
  // gate mira solo `fuentes` la mitad de los renders de un aire pueden salir en la fuente del sistema —
  // exactamente el defecto que esta compuerta existe para cazar, entrando por la puerta nueva. Paso: al
  // declarar caras[] en cinco aires, tecnico pidio Archivo-900 e IBMPlexMono-400 y nadie las registraba.
  const todas = {}
  for (const [rol, fam] of Object.entries(a.fuentes || {})) todas[rol] = fam
  for (const [i, par] of (Array.isArray(a.caras) ? a.caras : []).entries()) {
    for (const [rol, fam] of Object.entries(par || {})) todas[`caras[${i}].${rol}`] = fam
  }
  for (const [rol, fam] of Object.entries(todas)) {
    if (EN_CSS.has(fam)) continue                                     // la declara el CSS de demo.html
    if (!registradas.has(fam)) {
      F('E-FUENTE-LLEGA', `el aire "${nombre}" pide ${rol} "${fam}" y nadie la registra: no esta en el @font-face de demo.html ni en el FontFace del propio aire, asi que la pieza sale en la fuente del sistema`)
    } else if (!TTF.has(fam)) {
      F('E-FUENTE-LLEGA', `el aire "${nombre}" registra ${rol} "${fam}" pero tools/fonts/${fam}.ttf no existe: el FontFace va a fallar y la pieza sale en la fuente del sistema`)
    }
  }
}

const n = FIX.length * Object.keys(AIRES).length
if (fallos.length) {
  console.error(`ADN: ${fallos.length} FALLO(S) sobre ${n} combinaciones\n` + fallos.map(f => '  ' + f).join('\n'))
  process.exit(1)
}
const claras = FIX.filter(x => x.pm.dna.palette.bgLum > 0.42).length
console.log(`ADN OK — ${n} combinaciones (${FIX.length} páginas × ${Object.keys(AIRES).length} aires): `
  + `polaridad, tono de marca (±14°), legibilidad y variedad.  ${claras}/${FIX.length} páginas dan mundo CLARO.`)
console.log(`  los ${Object.keys(AIRES).length} aires son alcanzables (${barridos} combinaciones de rubro × energía × calidez × registro).`)
console.log(`  los 11 declaran su mobiliario y reparten ${marcosVivos.size} marcos distintos: ${[...marcosVivos].sort().join(', ')}.`)
console.log(`  los 11 declaran su montaje y reparten ${montajesVivos.size} formas distintas de cortar.`)
console.log(`  y ${lucesVivas.size} recortes de luz distintos (forma x centro x aspecto), no solo intensidades.`)
console.log(`  ${Object.values(AIRES).filter(a => (a.pelicula || {}).halacion).length} aires tiñen el halo (halacion), el resto lo deja blanco.`)
console.log(`  y ${gestosVivos.size} formas distintas de moverse en las tres llamadas que son el 54% del movimiento.`)
console.log(`  ${Object.values(AIRES).filter(a => Array.isArray(a.caras) && a.caras.length > 1).length} aires tienen dos vestuarios tipograficos y la semilla elige.`)
