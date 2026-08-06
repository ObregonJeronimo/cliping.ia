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
  // SI NO SE CORTA, NO SE TOCA. `sinColgar` existe para arreglar el final de una frase MUTILADA por el
  // recorte; aplicarlo a un texto que entero se convierte en un censor de las palabras de la marca.
  // Medido en vivo: el CTA de stripe.com es "Sign in" y en el boton salia "SIGN", porque "in" esta en
  // la lista de colgantes. Un boton que dice SIGN no es un boton corto: es un boton roto. Y lo mismo
  // le pasaba a cualquier titular que la pagina hubiera decidido terminar en preposicion.
  if (s.length <= n) return s
  const c = s.slice(0, n)
  // CORTAR A MITAD DE PALABRA SE LEE COMO HERRAMIENTA ROTA, y el umbral decide cuando se prefiere eso
  // antes que un texto demasiado corto. Estaba en 0.55 y fallaba por una decima en un caso REAL:
  // "Big numbers. Highly-trusted." con tope 22 deja el ultimo espacio en 12 y el umbral pedia >12.1,
  // asi que salia "BIG NUMBERS. HIGHLY-TR" — visible en el render de basecamp.com, y en una lista
  // numerada, donde los items se leen como un conjunto, canta muchisimo mas que suelto.
  // Con 0.45 ese caso corta en "Big numbers.", que es una frase entera y ademas dice lo mismo. El
  // umbral sigue existiendo para lo que existia: que una primera palabra larguisima no deje el slot
  // en dos letras. Sin espacio util no hay nada que hacer y se corta igual — pero eso es una palabra
  // sola mas larga que el campo, no una frase mutilada.
  const sp = c.lastIndexOf(' ')
  return sinColgar((sp > n * 0.45 ? c.slice(0, sp) : c).trim())
}

// LA PROMESA DE LA PAGINA, EN ORACIONES ENTERAS.
//
// `queHace` es la description que el equipo de marketing de la marca escribio para que la lea Google:
// es, literalmente, "esto es lo que hacemos por vos". Es el mejor material que tiene el motor para el
// titular de una portada — y llegaba MUTILADO por los mismos cortes ciegos que ya arregle en los
// titulos de feature:
//
//   linear    "Purpose-built for planning and building products with AI agents."  (64)
//     claim -> "PURPOSE-BUILT FOR PLANNING AND BUILDING PRODUCTS WITH AI"          (se come "agents")
//     golpe -> "PURPOSE-BUILT FOR PLANNING"                                        (no dice nada)
//   basecamp  "Trusted by millions, Basecamp puts everything you need to get work done in one place. ..."
//     claim -> "TRUSTED BY MILLIONS, BASECAMP PUTS EVERYTHING YOU NEED"            (promesa sin final)
//
// Se corta por ORACION, igual que los titulos: se toman las primeras que entren en el presupuesto y
// nunca media. Para basecamp eso da "Trusted by millions, Basecamp puts everything you need to get work
// done in one place." — que es exactamente la mano que la pagina le extiende al usuario.
function promesa(t, n) {
  const s = String(t || '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  if (s.length <= n) return s
  const partes = s.split(/(?<=[.!?])\s+/)
  let acum = ''
  for (const p of partes) {
    const cand = acum ? acum + ' ' + p : p
    if (cand.length > n) break
    acum = cand
  }
  return acum
}

// Compone una frase en uno o dos renglones, SIN recortarla. Devuelve [] si no hay frase, nunca un
// pedazo. El tope duro de 52 es el unico caso en que se cae algo, y no deberia ocurrir: `_titulo_util`
// en el extractor ya garantiza 48 como maximo. Existe por si otro camino alimenta este campo.
function enRenglones(t, unaLinea) {
  const s = String(t || '').replace(/\s+/g, ' ').trim()
  if (!s || s.length > 52) return []
  if (s.length <= unaLinea) return [s]
  // El punto de quiebre es el que deja los dos renglones MAS PAREJOS, no la mitad de las palabras: con
  // "Move work forward across teams and agents" partir por palabras da 21/19 y por largo 22/18; la
  // diferencia se nota en el bloque, porque el ojo lee el desnivel antes que el texto.
  const pal = s.split(' ')
  if (pal.length < 2) return [s]
  let mejor = 1, dif = Infinity
  for (let k = 1; k < pal.length; k++) {
    const a = pal.slice(0, k).join(' ').length, b2 = pal.slice(k).join(' ').length
    if (Math.abs(a - b2) < dif) { dif = Math.abs(a - b2); mejor = k }
  }
  return [pal.slice(0, mejor).join(' ') + String.fromCharCode(10) + pal.slice(mejor).join(' ')]
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
  // UN TITULAR NO ENTRA EN VEINTIDOS CARACTERES, y un medio no tiene otra cosa que titulares. Para
  // ese rubro se admiten cuarenta y se parten en DOS RENGLONES equilibrados, que es como se compone un
  // titular en cualquier portada: asi la tipografia queda al doble de alto que puesta en una sola
  // linea, y a una sola linea de cuarenta caracteres no se lee nada.
  // UNA FRASE ENTRA ENTERA O NO ENTRA — no se recorta nunca mas.
  //
  // Esto recortaba a 22 caracteres SOBRE un pagemodel que ya venia recortado a 28, dos cortes ciegos
  // encadenados, y lo que llegaba al video eran cuatro fragmentos: "MAKE PRODUCT", "MOVE WORK
  // FORWARD", "PICK A PACKAGE", "THE SAME CORE". Arriba, `_titulo_util` ya garantiza que lo que llega
  // es una frase completa de 48 caracteres o menos; aca lo unico que queda por decidir es en cuantos
  // renglones se compone, y eso es una decision de TIPOGRAFIA, no un recorte de contenido.
  //
  // Pasados 28 caracteres va en DOS RENGLONES equilibrados. Es como se compone un titular en cualquier
  // portada: la tipografia queda al doble de alto que en una sola linea, y a una sola linea de
  // cuarenta caracteres el cuadro obliga a un cuerpo que no se lee.
  const esMedio = s.tipoNegocio === 'media'
  for (const f of (s.features || []).slice(0, esMedio ? 1 : 5)) {
    out.push(...enRenglones(f.titulo, esMedio ? 20 : 28))
  }
  // EN UN MEDIO, `comoFunciona` trae los TITULARES y son el contenido principal, no un apoyo: van
  // primero y con el largo que necesitan. Ver backend/semantica_gratis.py — un medio no tiene
  // features, tiene titulares, y meterlos en el campo de etiquetas los partia al medio.
  for (const p of (s.comoFunciona || []).slice(0, esMedio ? 4 : 2)) {
    out.push(...enRenglones(p, esMedio ? 20 : 26))
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
    // "OTRO" NO ES UNA CATEGORIA, ES "NO SE". `tipoNegocio` sale de un enum cuyo ultimo valor es el
    // que se pone cuando NO HAY EVIDENCIA suficiente (`semantica_gratis.py:521`, textual: "o 'otro' si
    // no hay evidencia suficiente"), y el rotulo lo imprimia en pantalla como si fuera un dato de la
    // marca: "TAILWIND CSS · OTRO", "LINEAR · OTRO". Medido sobre las 6 capturas reales del repo, DOS
    // salian asi — un tercio de las piezas le decia al espectador que el rubro de esa empresa es "otro".
    //
    // Es primo de la anti-invencion y del mismo lado: la pieza afirma algo que la pagina nunca dijo.
    // Sin categoria, el rotulo es la marca sola, que es verdad y alcanza.
    rotulo: [pm.brand, s.tipoNegocio === 'otro' ? '' : s.tipoNegocio]
      .filter(Boolean).join(' · ').toUpperCase(),
    // 92 es lo que entra en tres renglones de portada sin que el cuerpo baje de lo legible.
    claim: promesa(s.queHace, 92).toUpperCase(),
    frases: frasesDe(pm),
    // EL BLOQUE ES UN ROTULO DE CUATRO PALABRAS Y SE ELIGE, NO SE RECORTA.
    //
    // Era `corto(features[0].titulo, 26)`: el QUINTO recorte ciego de la cadena. Y encima `toro` —el
    // unico que lo consume— se queda con las primeras cuatro palabras, asi que el recorte se aplicaba
    // dos veces. En el render se leia "MAKE PRODUCT OPERATIONS" debajo del objeto, que es la mitad de
    // "Make product operations self-driving".
    //
    // Un slot de cuatro palabras no necesita cortar nada: necesita ELEGIR un titulo que ya tenga cuatro
    // palabras o menos. Si la pagina no dio ninguno, el bloque no existe — que es la respuesta honesta
    // y la que el resto del motor ya da.
    bloque: (() => {
      const cabe = (s.features || []).map(f => String(f.titulo || '').trim())
        .find(t => t && t.split(/\s+/).length <= 4)
      if (!cabe) return null
      const det = (s.features || []).find(f => String(f.titulo || '').trim() === cabe)
      return { titulo: cabe.toUpperCase(), bajada: corto(det && det.detalle, 34).toUpperCase() }
    })(),
    // Las cifras salen TAL CUAL de las pruebas medidas. Nada de inventar un "+300" porque la escena
    // tiene cinco tarjetas: si hay una sola stat, va una sola tarjeta.
    datos: (pr.stats || []).slice(0, 5).map(x => ({
      valor: x.valor, etiqueta: corto(x.etiqueta, 12).toUpperCase(),
    })),
    // LA VOZ DEL CLIENTE. Se capturaba desde hace tiempo y moria aca: `pruebas` entraba a esta funcion
    // y solo se leia `stats`, asi que ninguna escena podia pedir un testimonio ni aunque la pagina lo
    // publicara. Va SIN mayusculizar, al reves que el resto: una cita en versales deja de sonar a
    // persona y pasa a sonar a cartel. Y la firma viaja como venga —vacia incluida—: linear.app
    // publica sus citas sin autor, y ponerle uno generico seria escribirle a la marca del cliente
    // palabras que nadie dijo. El corte de 120/24 es el del contrato de pagemodel (140/28) con aire
    // para que la escena no tenga que elidir.
    testimonios: (pr.testimonios || []).slice(0, 3)
      .filter(x => x && x.texto)
      .map(x => ({ texto: corto(x.texto, 120), firma: corto(x.firma || '', 24) })),
    // EL GOLPE NO ES EL CLAIM. `destello` compone en DOS renglones a sangre y quiere una linea corta y
    // cerrada; el claim de una pagina rara vez lo es, y ademas ya se lo lleva la portada — mostrarlo dos
    // veces en la misma pieza es el defecto que el mostrador de frases vino a resolver.
    // El titulo de feature MAS CORTO es exactamente lo que hace falta: nacio corto, esta completo y es
    // material distinto. Si la pagina no dio ninguno usable, se cae a la promesa; si tampoco, no hay
    // golpe y la escena no se elige, que es la respuesta honesta.
    golpe: (() => {
      // Y NO PUEDE SER EL NOMBRE DE UN PRODUCTO. Tres palabras completas alcanzaba como filtro hasta
      // que salio "Duolingo English Test" a cuerpo de cartel: cumple el largo, cumple las palabras, y
      // no dice absolutamente nada — es una etiqueta de producto puesta suelta en el medio de la
      // pieza. Thiago: "ese texto no aporta nada y tampoco tiene sentido que este asi suelto".
      //
      // Un titulo que ARRANCA con el nombre de la marca es casi siempre eso: el nombre de una linea
      // de producto, no una afirmacion sobre lo que hace. La marca ya se dice en la apertura, en el
      // sello y en el cierre; repetirla acá gasta el unico cuadro de la pieza que grita.
      const marcaN = String(pm.brand || '').trim().toLowerCase()
      const esNombreDeProducto = (t) => {
        if (!marcaN || marcaN.length < 3) return false
        const n = t.trim().toLowerCase()
        // Arranca con la marca y lo que sigue son dos o tres palabras sueltas: "<Marca> English Test".
        return n.startsWith(marcaN) && n.slice(marcaN.length).trim().split(/\s+/).filter(Boolean).length <= 3
      }
      const cortos = (s.features || []).map(f => String(f.titulo || '').trim())
        .filter(t => t && t.length <= 64 && t.split(/\s+/).length >= 3)
        .filter(t => !esNombreDeProducto(t))
        .sort((a, b) => a.length - b.length)
      return (cortos[0] || promesa(s.queHace, 64)).toUpperCase() || null
    })(),
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

// LA FAMILIA: QUE OTROS AIRES SIGUEN SIENDO CREIBLES PARA ESTA PAGINA.
//
// El mapeo de arriba es correcto y no se toca: el rubro impone un registro y eso es una restriccion
// fuerte. Pero es una funcion, no una eleccion — la misma pagina da SIEMPRE el mismo aire, y como
// `saas` y `app` caen los dos en `tecnico` y el respaldo de un rubro no reconocido TAMBIEN es
// `tecnico`, en la practica casi todo lo que se rinde sale del mismo aire. Once personalidades
// escritas y una sola en pantalla. Medido: de los once aires, `tecnico` es el unico con
// `marco: escuadras` y `hud: true`, o sea que todas las piezas salian con las mismas escuadras en las
// esquinas — el defecto que se veia como "son todos el mismo video" y que no era falta de catalogo
// sino colapso de la eleccion.
//
// La familia dice cuales OTROS aires puede vestir la misma pagina sin mentir sobre lo que es. No es un
// sorteo libre: un gimnasio no puede salir de panaderia. El PRIMERO de cada lista es el canonico —el
// que devuelve la funcion cuando no hay semilla— asi que nada de lo que ya andaba cambia.
const FAMILIA = {
  tecnico:      ['tecnico', 'corporativo', 'nocturno', 'editorial'],
  corporativo:  ['corporativo', 'tecnico', 'editorial'],
  jugueton:     ['jugueton', 'editorial', 'deportivo'],
  editorial:    ['editorial', 'corporativo', 'lujo'],
  gastronomico: ['gastronomico', 'artesanal', 'bienestar'],
  artesanal:    ['artesanal', 'gastronomico', 'editorial'],
  inmobiliario: ['inmobiliario', 'lujo', 'editorial'],
  lujo:         ['lujo', 'editorial', 'nocturno'],
  nocturno:     ['nocturno', 'tecnico', 'lujo'],
  deportivo:    ['deportivo', 'tecnico', 'jugueton'],
  bienestar:    ['bienestar', 'artesanal', 'editorial'],
}

// Un revoltijo de enteros, no un generador: se necesita UN indice a partir de UN numero y tiene que
// dar lo mismo en cualquier maquina y en cualquier corrida. `Math.random` no entra en este repo.
const revolver = (n) => {
  let x = (n >>> 0) || 1
  x ^= x << 13; x >>>= 0
  x ^= x >> 17
  x ^= x << 5; x >>>= 0
  return x >>> 0
}

// `semilla` es OPCIONAL y sin ella la funcion se comporta exactamente como siempre. Eso mantiene a las
// compuertas —que comparan contra el aire canonico de cada fixture— midiendo lo mismo que median, y
// deja la variacion donde tiene que estar: en el render, que es el unico lugar donde alguien pidio
// "otra toma".
export function aireDe(pm, semilla = null) {
  const s = pm.semantica || {}
  const mood = pm.dna?.mood
  const energia = mood?.energia ?? 0.5
  let base = POR_RUBRO[s.tipoNegocio] || 'tecnico'
  if (s.tipoNegocio === 'servicio-local') base = afinarServicioLocal(mood) || base
  // Un registro formal DECLARADO pesa mas que cualquier otra señal: es lo unico que la pagina dijo
  // explicitamente sobre como quiere que le hablen a su publico.
  let elegido
  if (s.audiencia?.register === 'formal') elegido = VARIANTES[base]?.baja || 'corporativo'
  else if (energia > 0.80) elegido = VARIANTES[base]?.alta || base
  else if (energia < 0.30) elegido = VARIANTES[base]?.baja || base
  else elegido = base

  if (semilla == null || !Number.isFinite(Number(semilla))) return elegido
  const fam = FAMILIA[elegido] || [elegido]
  return fam[revolver(Number(semilla)) % fam.length]
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
// `_tira` SE RESCATA DEL CRUDO, PORQUE LA NORMALIZACION LO TIRA. `normalizePageModel` valida contra el
// schema del director y devuelve solo lo que el schema conoce; `_tira` empieza con guion bajo, no esta
// en el schema, y se perdia ahi. El efecto era silencioso y grande: `tira: !!pm._tira` daba SIEMPRE
// false, o sea que los tres heroes de dispositivo —telefono, portatil y ventana— no se ofrecian NUNCA,
// en ninguna pagina. Medido el 2026-08-06 sobre las 8 corridas reales de tools/out/motor/: las 8 tienen
// `tira.png` en disco (922 a 2249 kB) y las 8 tienen `_tira` en su pagemodel, y las 8 llegaban al
// guionista con `tira: false`.
//
// Se rescata del JSON crudo en vez de agregar `_tira` al schema: el schema lo comparte el director y
// meterle una clave privada del motor 3D lo ensuciaria para todos sus otros usuarios.
const _crudo = JSON.parse(readFileSync(ruta, 'utf8'))
const pm = normalizePageModel(_crudo)
if (_crudo._tira && !pm._tira) pm._tira = _crudo._tira
const d = datosDe(pm)
// El cuarto argumento es la SEMILLA de la pieza. Sin ella el aire es el canonico de la pagina, que es
// lo que quieren las compuertas y cualquiera que corra esto a mano; con ella, la misma pagina puede
// vestir cualquier aire de su familia y "otra toma" pasa a ser de verdad otra toma.
const aire = aireDe(pm, process.argv[4])
const salida = process.argv[3] || join(HERE, 'out', `datos-${nombre}.json`)
// El ADN viaja ENTERO al spec. Es lo que hace que la paleta, la polaridad claro/oscuro, la tipografía y
// los radios de la marca lleguen a la pantalla en vez de quedarse en el informe de medición.
writeFileSync(salida, JSON.stringify({ datos: d, aire, dna: pm.dna || null }, null, 1))
const bl = pm.dna?.palette?.bgLum
console.log(`${salida}\n  marca "${d.marca}" · aire "${aire}"${bl != null ? ` · mundo ${bl > 0.42 ? 'CLARO' : 'oscuro'} (${pm.dna.palette.bg} / acento ${pm.dna.palette.accent})` : ''} · ${d.frases.length} frases · ${d.datos.length} cifras · cta ${d.cta ? `"${d.cta}"` : 'NINGUNO'}`)
console.log('  frases:', d.frases.map(f => JSON.stringify(f)).join(' '))
}
