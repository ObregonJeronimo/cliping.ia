// EL PUENTE: pagemodel de una pagina real -> los DATOS que consumen las escenas de ANTHEM.
//
// Es la pieza que convierte la referencia hecha a mano en un motor. Del otro lado del puente ya esta
// todo: las escenas, los once aires, el render WebGL, el encoder y el analizador. Lo unico que faltaba
// era que lo que la pieza DICE saliera de la pagina del usuario en vez de estar escrito en el archivo.
//
// REGLA ANTI-INVENCION — la mas dura del repo, y acá es donde se juega.
// Este archivo NO completa listas, NO redondea cifras que la pagina no dio, NO escribe un CTA cuando
// la pagina no tiene ninguno y NO traduce. Si la pagina dijo tres features, salen tres. Un slot que
// queda vacio es una escena que el guionista no deberia elegir — no un hueco para rellenar con
// material propio. Poner "+500 clientes" en el video de una marca que nunca lo dijo es la mentira mas
// cara que puede cometer este motor.
//
// Uso:  node tools/anthem-datos.mjs <fixture> [salida.json]
//       node tools/anthem-datos.mjs stripe-com
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizePageModel } from '../src/director/core/schema.js'

const HERE = dirname(fileURLToPath(import.meta.url))

// Palabras que NO pueden quedar al final de una frase. Cortar en el limite de palabra no alcanza:
// "Hasta 18 cuotas sin" y "Global payments platform to accept," son cortes limpios y frases ROTAS —
// prometen un final que nunca llega, y en tipografia cinetica, donde la frase ocupa el cuadro entero
// durante medio segundo, eso se lee como un error del sistema. Se retrocede hasta la ultima palabra
// que puede cerrar.
const COLGANTE = new Set(('de del la el los las un una unos unas y o u a al con sin por para en que'
  + ' como mas pero desde hasta entre sobre tras su sus mi tu es son fue ser to of in on at for and'
  + ' or the an with without from by into over under your our its is are was be that this').split(' '))

function sinColgar(s) {
  const pal = s.replace(/[,;:·\-–—]+$/, '').split(' ').filter(Boolean)
  while (pal.length > 1 && COLGANTE.has(pal[pal.length - 1].toLowerCase().replace(/[^\wáéíóúñ]/gi, ''))) pal.pop()
  return pal.join(' ').replace(/[,;:]+$/, '')
}

// Corta sin partir palabras y sin dejar la frase colgando.
function corto(t, n) {
  const s = String(t || '').replace(/\s+/g, ' ').trim()
  if (s.length <= n) return sinColgar(s)
  const c = s.slice(0, n)
  const sp = c.lastIndexOf(' ')
  return sinColgar((sp > n * 0.55 ? c.slice(0, sp) : c).trim())
}

// La tipografia cinetica quiere frases de UNA o DOS palabras que peguen. Una oracion entera en un
// cuadro a 3 unidades de alto sale ilegible, y partirla en renglones la vuelve un parrafo.
// Se prefiere: el claim partido en dos renglones, despues los titulos de features, despues verbos.
function frasesDe(pm) {
  const s = pm.semantica || {}
  const out = []
  // El claim entra SOLO si sobrevive casi entero a un largo que se pueda leer en pantalla. Un claim
  // de ochenta caracteres recortado a cuarenta no es un titular corto: es una frase mutilada. Si no
  // entra, no va — atras hay cuatro titulos de feature esperando, y esos ya nacieron cortos.
  const claim = corto(s.queHace, 46)
  const largoOriginal = String(s.queHace || '').trim().length
  if (claim && claim.split(' ').length >= 3 && claim.length >= largoOriginal * 0.72) {
    // dos renglones equilibrados: el titular de apertura del bloque
    const pal = claim.split(' ')
    const mitad = Math.ceil(pal.length / 2)
    out.push(pal.slice(0, mitad).join(' ') + '\n' + pal.slice(mitad).join(' '))
  }
  for (const f of (s.features || []).slice(0, 4)) {
    const t = corto(f.titulo, 22)
    if (t) out.push(t)
  }
  for (const p of (s.comoFunciona || []).slice(0, 2)) {
    const t = corto(p, 18)
    if (t) out.push(t)
  }
  // Sin relleno: si la pagina dio dos frases, salen dos. El guionista decide si con dos alcanza para
  // sostener una escena de tipografia cinetica de ocho beats — probablemente no, y entonces esa
  // escena no va. Esa decision NO se toma acá.
  return out
}

export function datosDe(pm) {
  const s = pm.semantica || {}
  const pr = s.pruebas || {}
  return {
    marca: (pm.brand || '').toUpperCase(),
    rotulo: [pm.brand, s.tipoNegocio].filter(Boolean).join(' · ').toUpperCase(),
    claim: corto(s.queHace, 60).toUpperCase(),
    frases: frasesDe(pm),
    bloque: (s.features || [])[0]
      ? { titulo: corto(s.features[0].titulo, 26).toUpperCase(), bajada: corto(s.features[0].detalle, 34).toUpperCase() }
      : null,
    // Las cifras salen TAL CUAL de las pruebas medidas. Nada de inventar un "+300" porque la escena
    // tiene cinco tarjetas: si hay una sola stat, va una sola tarjeta.
    datos: (pr.stats || []).slice(0, 5).map(x => ({
      valor: x.valor, etiqueta: corto(x.etiqueta, 12).toUpperCase(),
    })),
    golpe: corto(s.queHace, 34).toUpperCase() || null,
    cta: s.cta ? corto(s.cta, 20).toUpperCase() : null,
    // El pie son datos REALES: el dominio y el formato. Nunca una promesa.
    pie: [pm.url ? new URL(pm.url).hostname.replace(/^www\./, '') : '', '1080x1920', '30 FPS'].filter(Boolean),
    dominio: pm.url ? new URL(pm.url).hostname.replace(/^www\./, '') : '',
    elementos: (pm.assets?.elementos || []).map(e => ({ rol: e.rol, url: e.url, ar: e.ar })),
    // Si la captura consiguio la TIRA scrolleable. No es contenido: es una condicion de material, y el
    // guionista la necesita para saber si puede elegir la escena que muestra la pagina a sangre.
    // Sin este dato, el guion metia esa escena en piezas de sitios que bloquearon al bot movil y salia
    // un rectangulo vacio de tres segundos.
    tira: !!pm._tira,
  }
}

// El aire se ELIGE con lo medido, no se pide. Es la union entre el DNA de la pagina y el sistema de
// personalidad: el rubro dice el registro, el mood dice la energia y la formalidad dice si la pieza
// rebota o se posa.
const POR_RUBRO = {
  saas: 'tecnico', app: 'tecnico', ecommerce: 'jugueton', 'servicio-local': 'gastronomico',
  educacion: 'editorial', media: 'editorial', portfolio: 'inmobiliario', evento: 'nocturno',
}
// EL RUBRO MANDA Y LA ENERGIA MODULA DENTRO DE ESA FAMILIA. Al reves — energia primero — una empresa
// de infraestructura de pagos con el mood alto salia "deportivo", que es un aire de gimnasio: el
// registro que impone el rubro es una restriccion mucho mas fuerte que la temperatura de su paleta.
// La energia elige entre las variantes de una misma familia; no salta de familia.
const VARIANTES = {
  // La variante alta de tecnico sigue siendo tecnico: ya ES el aire energico de su familia. Mandarlo
  // a nocturno hacia que una herramienta de gestion de proyectos saliera con estetica de boliche —
  // el rubro no cambia porque su paleta este caliente.
  tecnico: { alta: 'tecnico', baja: 'corporativo' },
  jugueton: { alta: 'jugueton', baja: 'editorial' },
  gastronomico: { alta: 'gastronomico', baja: 'artesanal' },
  editorial: { alta: 'editorial', baja: 'editorial' },
  inmobiliario: { alta: 'inmobiliario', baja: 'lujo' },
  nocturno: { alta: 'nocturno', baja: 'nocturno' },
  // Sin estas dos entradas, un gimnasio con energia > 0.80 —que es la mitad de los gimnasios— caia
  // en el `|| base` y volvia a salir deportivo por accidente; pero uno con energia < 0.30 se iba a
  // 'corporativo' y perdia el aire que se le acababa de asignar. La variante baja de un aire
  // especializado es EL MISMO aire: la energia modula dentro de la familia, no salta de familia.
  deportivo: { alta: 'deportivo', baja: 'deportivo' },
  bienestar: { alta: 'bienestar', baja: 'bienestar' },
}
// DENTRO DE 'servicio-local' HAY TRES NEGOCIOS QUE NO SE PARECEN EN NADA.
//
// `tipoNegocio` es una clasificacion gruesa y mete en la misma bolsa a una panaderia, un gimnasio y un
// spa. Con el mapeo por rubro a secas, los tres recibian el aire "gastronomico" — o sea que un
// gimnasio salia con la direccion de arte de una panaderia. Y los dos aires que existen exactamente
// para esos casos, "deportivo" y "bienestar", eran CODIGO MUERTO: once aires escritos, nueve
// alcanzables, y ninguna compuerta que lo dijera.
//
// La segunda señal es el MOOD medido, que dentro de un mismo rubro si discrimina:
//   energia alta + calidez baja   -> deportivo   (un gimnasio: frio, duro, rapido)
//   energia baja + calidez alta   -> bienestar   (un spa, una clinica: tibio, lento, amable)
//   el resto                       -> gastronomico / artesanal, que es lo que ya hacia
// Los umbrales son deliberadamente exigentes (0.66 / 0.34): la duda tiene que caer en el aire generico
// del rubro, no en el especializado. Un aire de gimnasio en la pieza de una panaderia es peor error
// que una panaderia en el aire neutro de su rubro.
function afinarServicioLocal(mood) {
  const e = mood?.energia ?? 0.5
  const c = mood?.calidez ?? 0.5
  if (e >= 0.66 && c <= 0.40) return 'deportivo'
  if (e <= 0.42 && c >= 0.60) return 'bienestar'
  return null
}

export function aireDe(pm) {
  const s = pm.semantica || {}
  const mood = pm.dna?.mood
  const energia = mood?.energia ?? 0.5
  let base = POR_RUBRO[s.tipoNegocio] || 'tecnico'
  if (s.tipoNegocio === 'servicio-local') base = afinarServicioLocal(mood) || base
  // Un registro formal DECLARADO pesa mas que cualquier otra señal: es lo unico que la pagina dijo
  // explicitamente sobre como quiere que le hablen a su publico.
  if (s.audiencia?.register === 'formal') return VARIANTES[base]?.baja || 'corporativo'
  if (energia > 0.80) return VARIANTES[base]?.alta || base
  if (energia < 0.30) return VARIANTES[base]?.baja || base
  return base
}

// Acepta un NOMBRE de fixture o una RUTA a un pagemodel cualquiera. Lo segundo es lo que usa
// backend/motor.py con una pagina recien capturada: sin eso, el puente solo servia para los siete
// fixtures del repo y el camino completo URL -> video no se podia correr nunca de punta a punta.
// EL CLI SOLO CORRE SI ESTE ARCHIVO ES EL PROGRAMA. Lo de abajo lee un fixture y ESCRIBE un json:
// como efecto de un `import` desde una compuerta, eso es una bomba — lee un archivo que puede no
// existir y pisa una salida que nadie pidio. `datosDe` y `aireDe` se exportan para poder probarlos.
const esPrograma = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (esPrograma) {
const nombre = process.argv[2] || 'stripe-com'
const dirFix = join(HERE, 'fixtures', 'director', 'elementos')
const ruta = nombre.endsWith('.json') && existsSync(nombre) ? nombre
  : existsSync(join(dirFix, `${nombre}.json`))
    ? join(dirFix, `${nombre}.json`)
    : join(HERE, 'fixtures', 'director', `${nombre}.json`)
const pm = normalizePageModel(JSON.parse(readFileSync(ruta, 'utf8')))
const d = datosDe(pm)
const aire = aireDe(pm)
const salida = process.argv[3] || join(HERE, 'out', `datos-${nombre}.json`)
// El ADN viaja ENTERO al spec. Es lo que hace que la paleta, la polaridad claro/oscuro, la tipografía y
// los radios de la marca lleguen a la pantalla en vez de quedarse en el informe de medición.
writeFileSync(salida, JSON.stringify({ datos: d, aire, dna: pm.dna || null }, null, 1))
const bl = pm.dna?.palette?.bgLum
console.log(`${salida}\n  marca "${d.marca}" · aire "${aire}"${bl != null ? ` · mundo ${bl > 0.42 ? 'CLARO' : 'oscuro'} (${pm.dna.palette.bg} / acento ${pm.dna.palette.accent})` : ''} · ${d.frases.length} frases · ${d.datos.length} cifras · cta ${d.cta ? `"${d.cta}"` : 'NINGUNO'}`)
console.log('  frases:', d.frases.map(f => JSON.stringify(f)).join(' '))
}
