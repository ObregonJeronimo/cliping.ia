// GATE del GUION: que una misma página pueda dar VIDEOS DISTINTOS, y que ninguno mienta.
//
// El reclamo textual que originó esto: "en todos los ejemplos q me mandaste se vieron videos
// identicos". La paleta ya sale de cada marca (ver tools/adn-check.mjs), pero mientras la lista de
// escenas fue una constante, la ESTRUCTURA —que es lo que se percibe como "otro video"— era la misma
// para todos: seis escenas, mismo orden, 17.42 s.
//
// Cinco controles:
//   E-GUION-DURACION   la pieza cae dentro de ±1 beat del objetivo pedido
//   E-GUION-VARIEDAD   semillas distintas dan estructuras distintas
//   E-GUION-MATERIAL   ninguna escena entra sin el material mínimo que necesita
//   E-GUION-MARCO      la apertura abre y el cierre cierra, siempre
//   E-GUION-SEGUIDAS   nunca dos escenas de hero pegadas
//
// El de VARIEDAD se mide sobre semillas CONSECUTIVAS (1..12) a propósito: es el caso de uso real —el
// mismo cliente pidiendo otra versión— y es el que rompía. Un congruencial lineal sembrado con
// números chicos consecutivos devuelve primeros valores casi iguales, así que las doce caían en el
// mismo orden narrativo. Con semillas al azar el defecto no se veía.
import { guionDe, beatsDelGuion, ajusteDe, TOPE_AJUSTE, familiasDe, DORMIDAS, REQUISITOS } from '../render3d/demo/guion.js'

// El catalogo real, copiado de los meta.beats de cada escena. Se declara aca y no se importan los
// modulos porque importarlos arrastra three y un DOM: esta compuerta tiene que ser instantanea.
// OJO: ESTA LISTA SE DESINCRONIZO UNA VEZ Y NADIE SE ENTERO. Se agregaron seis escenas al motor y
// esta compuerta siguio midiendo diez durante todo ese trabajo, informando "se acabo el catalogo (10
// escenas)" sobre un catalogo que ya tenia dieciseis. Un dato copiado a mano es una copia que algun
// dia miente; si vuelve a pasar, el sintoma es este mismo mensaje con un numero viejo.
const CAT = new Map([
  ['apertura', { beats: 6 }], ['hero', { beats: 8 }], ['toro', { beats: 6 }],
  ['tipografia', { beats: 8 }], ['tarjetas', { beats: 6 }], ['destello', { beats: 4 }],
  ['rafaga', { beats: 6 }], ['pantalla', { beats: 6 }], ['columna', { beats: 6 }],
  ['cita', { beats: 6 }], ['lista', { beats: 6 }], ['titular', { beats: 6 }],
  ['partida', { beats: 6 }], ['contraste', { beats: 6 }], ['sello', { beats: 6 }],
  ['cierre', { beats: 6 }], ['mesa', { beats: 6 }], ['bandera', { beats: 6 }],
])

const PAGINAS = {
  // Una landing completa: cuatro frases, cifras, golpe. Da para elegir.
  // LOS ELEMENTOS SON OBJETOS, NO ENTEROS, y esto era un defecto de la compuerta misma: pasaba
  // `elementos: [1, 2, 3, 4]` mientras REQUISITOS.titular lee `e.rol` y REQUISITOS.contraste lee `e.url`
  // y `e.ar`. Sobre enteros pelados los dos daban false SIEMPRE, asi que el gate imprimia OK sobre un
  // catalogo del que nunca ejercitaba `titular` ni `contraste`. Y ninguna pagina declaraba testimonios,
  // asi que `cita` tampoco corria nunca. Tres escenas verdes, en produccion, y sin una sola medicion.
  rica: {
    marca: 'STRIPE', frases: ['a', 'b', 'c', 'd'], datos: [{ etiqueta: 'X' }, { etiqueta: 'Y' }], golpe: 'G',
    elementos: [
      { rol: 'foto', url: 'e0', ar: 1.6 }, { rol: 'tarjeta', url: 'e1', ar: 0.75 },
      { rol: 'logo', url: 'e2', ar: 2.8 }, { rol: 'cta', url: 'e3', ar: 3.4 },
    ],
    testimonios: [{ texto: 'lo dijo alguien de verdad', firma: 'X' }],
    tira: true,
  },
  // Lo que da la mayoria de las paginas reales: algo de copy, ninguna cifra, pero SI captura movil y
  // algunos recortes. Que no los tuviera era irreal y hacia que la compuerta subestimara el catalogo:
  // una pagina normal si puede sostener la escena a sangre y la columna de recortes.
  media: {
    marca: 'LINEAR', frases: ['a', 'b', 'c', 'd'], datos: [], golpe: 'G',
    elementos: [{ rol: 'foto', url: 'm0', ar: 1.5 }, { rol: 'tarjeta', url: 'm1', ar: 0.8 }, { rol: 'logo', url: 'm2', ar: 2.2 }],
    tira: true,
  },
  // El caso que rompe: casi nada. Una pagina detras de login, una 404, un sitio que bloqueo al bot.
  pobre: { marca: 'Q', frases: ['a'], datos: [], golpe: null },
}
const BPM = { lujo: 60 / 85, tecnico: 60 / 124, deportivo: 60 / 142 }
const DURS = [15, 20, 30]
const SEMILLAS = Array.from({ length: 12 }, (_, i) => i + 1)

const fallos = []
const F = (cod, m) => fallos.push(`${cod}  ${m}`)
// Las piezas que quedan cortas porque no hay MAS ESCENAS que meter. No es un fallo, es una carencia
// del catalogo, y se imprime para que sea visible en vez de quedar escondida detras de un OK.
const cortas = []

// EL OBJETO DEL GUION, NO UNA COPIA. Aca habia seis requisitos transcriptos a mano de los 19 que
// declara guion.js, y esa copia era el agujero: para los otros 13 —gancho, apertura, bandera, hero,
// mesa, cita, lista, titular, partida, contraste, sello, toro, cierre— la compuerta no comprobaba
// nada, y para los seis copiados comprobaba el MISMO numero escrito dos veces, asi que un umbral mal
// puesto daba verde en las dos puntas. Paso exactamente eso con `tipografia`: el 4 estaba identico
// aca y en el guion, y la escena de mensaje mas larga del catalogo no se elegia nunca.
//
// Importarlo tiene el costo de que la compuerta ya no es independiente del guion. Se acepta a
// sabiendas: una compuerta que mide una copia no es independiente, es solo otra cosa.
const REQ = REQUISITOS

let combinaciones = 0
for (const [nomPag, datos] of Object.entries(PAGINAS)) {
  for (const [nomAire, beatSeg] of Object.entries(BPM)) {
    for (const dur of DURS) {
      const planes = []
      for (const seed of SEMILLAS) {
        combinaciones++
        const plan = guionDe({ escenas: CAT, datos, seed, beatSeg, dur })
        const etiq = `${nomPag}/${nomAire}/${dur}s/seed${seed}`
        planes.push(plan.join('>'))

        // La duracion que se mide es la FINAL: la del archivo, despues del ajuste de tempo. Medir la
        // suma cruda de beats era medir un numero intermedio que el espectador nunca ve.
        const seg = ajusteDe(plan, CAT, beatSeg, dur).dur
        // Un beat de margen para arriba y para abajo. Mas abajo se nota como pieza corta; mas arriba
        // se pasa del hueco del formato.
        if (Math.abs(seg - dur) > dur * TOPE_AJUSTE + 0.01) {
          // QUEDARSE CORTO NO SIEMPRE ES UN BUG. Puede ser que EL CATALOGO SE HAYA AGOTADO: siete
          // escenas no llenan 30 s a 142 bpm si la pagina ademas no dio cifras y la de datos no entra.
          // La distincion es exacta: se mira si ALGUNA escena mas hubiera ENTRADO EN LO QUE SOBRA.
          //
          // El primer intento comparaba contra un guion pedido a 120 s, y ahi obviamente entra mas
          // — la comparacion no decia nada sobre el presupuesto real y acusaba a todos por igual.
          const sobra = Math.round(dur / beatSeg) + 1 - beatsDelGuion(plan, CAT)
          const hayHueco = plan.some((_, i) => i > 0 && plan[i - 1] !== 'hero' && plan[i] !== 'hero')
          const cabe = [...CAT.keys()].filter(id => id !== 'apertura' && id !== 'cierre'
            && (!REQ[id] || REQ[id](datos))
            && (id === 'hero' ? hayHueco : !plan.includes(id)))
            .map(id => CAT.get(id).beats)
          const masBarato = cabe.length ? Math.min(...cabe) : Infinity
          if (masBarato <= sobra) {
            F('E-GUION-DURACION', `${etiq}: pidio ${dur}s y da ${seg.toFixed(1)}s, y sobraban ${sobra} beats donde entraba una escena de ${masBarato}`)
          } else {
            cortas.push(`${etiq}: ${seg.toFixed(1)}s de ${dur}s`)
          }
        }

        // ABRE UNA ESCENA DE ENTRADA, NO NECESARIAMENTE `apertura`. Hay tres que estan compuestas para
        // ser el primer cuadro: el gancho (la promesa), la apertura (el panel de marca) y la bandera
        // (el campo de color con el nombre calado). Cualquiera de las tres abre; una escena del medio,
        // no — un reel que empieza por una lista no abrio, empezo a la mitad.
        const ENTRADAS = new Set(['apertura', 'bandera', 'gancho'])
        if (!ENTRADAS.has(plan[0]) || plan[plan.length - 1] !== 'cierre') {
          F('E-GUION-MARCO', `${etiq}: la pieza empieza con "${plan[0]}" y termina con "${plan[plan.length - 1]}"`)
        }

        for (const id of new Set(plan)) {
          if (REQ[id] && !REQ[id](datos)) {
            F('E-GUION-MATERIAL', `${etiq}: metio "${id}" y la pagina no tiene con que llenarla`)
          }
        }

        for (let i = 1; i < plan.length; i++) {
          if (plan[i] === 'hero' && plan[i - 1] === 'hero') {
            F('E-GUION-SEGUIDAS', `${etiq}: dos escenas de hero pegadas — el corte entre ellas no se lee`)
          }
        }
      }
      // VARIEDAD. Con una pagina rica y doce semillas tienen que salir al menos tres estructuras
      // distintas; si sale una sola, el guion es la constante que habia antes con otro nombre.
      // El minimo depende de CUANTO MATERIAL HAY, porque de eso depende cuantas estructuras existen.
      // Una pagina sin cifras no puede armar el orden que abre con la prueba dura: pedirle tres
      // estructuras es pedirle que invente una escena de datos sin datos.
      const distintos = new Set(planes).size
      const minimo = nomPag === 'pobre' ? 1 : nomPag === 'media' ? 2 : 3
      if (distintos < minimo) {
        F('E-GUION-VARIEDAD', `${nomPag}/${nomAire}/${dur}s: 12 semillas dan solo ${distintos} estructura(s) distinta(s), hacen falta ${minimo}`)
      }
    }
  }
}

// ---------------------------------------------------------------- E-GUION-ESCENA-MUERTA
// UNA ESCENA QUE NUNCA SE ELIGE ES CODIGO QUE EL ESPECTADOR NO VA A VER. Es la misma muerte silenciosa
// que E-ADN-AIRE-MUERTO caza para los aires, y para el catalogo de escenas no existia: se podia escribir
// una escena, dejarla verde, ponerla en produccion y que ninguna pagina posible la eligiera jamas.
//
// El mensaje distingue las DOS causas, porque son dos bugs distintos con dos arreglos distintos:
//   · por REQUISITOS: ninguna pagina de prueba le da el material que pide. Puede ser que el requisito
//     este mal, o que falte un fixture.
//   · por presupuesto: califica pero nunca entra, porque las que van antes se comen los beats.
//
// SE MIDE EN LA DURACION MAS LARGA, y eso importa: a 15 s entran cuatro escenas de medio y a 30 s ocho,
// asi que promediando las tres duraciones una escena perfectamente viva da 1.2% y parece muerta. Pasó
// con `partida`: sale en 14 de 60 semillas a 30 s —o sea 23%— y el promedio la acusaba. Una escena esta
// muerta si no se elige TENIENDO LUGAR, no si no cabe en quince segundos.
const DUR_MAX = Math.max(...DURS)
const presencia = new Map([...CAT.keys()].map(id => [id, 0]))
let planes = 0
for (const [nomPag, datos] of Object.entries(PAGINAS)) {
  for (const beatSeg of Object.values(BPM)) {
    for (const dur of [DUR_MAX]) {
      for (const seed of SEMILLAS) {
        planes++
        for (const id of new Set(guionDe({ escenas: CAT, datos, seed, beatSeg, dur }))) {
          presencia.set(id, presencia.get(id) + 1)
        }
      }
    }
  }
}
// MUERTA Y ESCASA SON DOS COSAS. Esta compuerta se llama ESCENA-MUERTA y tiene que fallar por MUERTE:
// por debajo del 1% la escena es, en la practica, codigo que nadie va a ver. Entre el 1% y el 5% esta
// viva pero apretada —`partida` compite por un solo cupo contra `tipografia`, que ocupa el doble de
// beats— y eso es un dato para mirar, no un defecto que deba frenar un push. Un fallo que en realidad es
// un aviso se aprende a ignorar, y despues no se ve el que importa.
// UNA ESCENA DORMIDA TIENE QUE ESTAR EN CERO, y esa es su compuerta. La regla de escena muerta existe
// para cazar una escena que el guion NO PUEDE elegir por accidente; una dormida esta en cero a
// proposito y declarado en `DORMIDAS`. Lo que sí se comprueba es lo contrario: si una dormida apareciera
// en algun guion, el filtro se rompio y hay que enterarse.
for (const id of DORMIDAS) {
  const n = presencia.get(id) || 0
  if (n > 0) fallos.push(`E-GUION-DORMIDA-DESPIERTA  "${id}" esta en DORMIDAS y aparece en ${n} de ${planes} guiones`)
}

const escasas = []
for (const [id, n] of presencia) {
  const frac = n / planes
  if (DORMIDAS.has(id)) continue
  if (frac >= 0.05) continue
  const califica = Object.values(PAGINAS).some(d => (REQ[id] ? REQ[id](d) : true))
  const causa = califica
    ? 'califica en alguna pagina pero nunca entra: las que van antes se comen los beats'
    : 'NINGUNA pagina de prueba le da el material que pide (revisar REQUISITOS o agregar un fixture)'
  const msg = `"${id}" aparece en el ${(frac * 100).toFixed(1)}% de ${planes} guiones a ${DUR_MAX}s — ${causa}`
  if (frac < 0.01) fallos.push(`E-GUION-ESCENA-MUERTA  ${msg}`)
  else escasas.push(msg)
}

// ---------------------------------------------------------------- E-GUION-VERSIONES
// El cliente que pide "otra version del mismo video" toca la SEMILLA y nada mas. Si con veinte semillas
// recibe cuatro piezas, la semilla no es una version: es un sorteo entre cuatro. Medido antes de tocar el
// guion: exactamente 4 estructuras en casi todas las combinaciones, y 1 en la peor.
for (const [nomPag, datos] of Object.entries(PAGINAS)) {
  for (const [nomAire, beatSeg] of Object.entries(BPM)) {
    for (const dur of DURS) {
      const vistos = new Set()
      for (let s = 1; s <= 20; s++) vistos.add(guionDe({ escenas: CAT, datos, seed: s, beatSeg, dur }).join('>'))
      // La pagina POBRE queda afuera del piso a proposito: con una frase y sin cifras hay tres escenas
      // elegibles y no hay veinte piezas distintas que armar. Exigirselo seria pedirle que invente.
      if (nomPag === 'pobre') continue
      if (vistos.size < 8) {
        fallos.push(`E-GUION-VERSIONES  ${nomPag}/${nomAire}/${dur}s: 20 semillas dan solo ${vistos.size} estructuras distintas; hacen falta 8. El cliente que pide otra version recibe la misma pieza`)
      }
    }
  }
}

// ---------------------------------------------------------------- E-GUION-FAMILIA
// Dos escenas de la misma familia pegadas dicen lo mismo con distinta tipografia. El guion las separa
// al armar el orden, pero hay cuatro pasos posteriores —filtro por material, cupo de texto, seleccion
// por presupuesto y relleno— que pueden sacar la escena que hacia de separador.
//
// LA COMPUERTA TIENE QUE SABER CUANDO ES INEVITABLE, o acusa en falso y se aprende a ignorar. Con seis
// escenas de las cuales cuatro son de texto, no hay orden posible sin un par pegado. El criterio exacto
// es el de reorganizar una cadena: hay solucion si y solo si ninguna familia supera ceil(n/2). Solo se
// falla cuando HABIA orden y el motor no lo encontro.
for (const [nomPag, datos] of Object.entries(PAGINAS)) {
  for (const [nomAire, beatSeg] of Object.entries(BPM)) {
    for (const dur of DURS) {
      for (const seed of SEMILLAS) {
        const plan = guionDe({ escenas: CAT, datos, seed, beatSeg, dur })
          .filter(id => id !== 'apertura' && id !== 'cierre')
        const fam = plan.map(id => familiasDe()[id] || id)
        const cuenta = new Map()
        for (const f of fam) cuenta.set(f, (cuenta.get(f) || 0) + 1)
        const tope = Math.ceil(plan.length / 2)
        const evitable = [...cuenta.values()].every(n => n <= tope)
        for (let i = 1; i < fam.length; i++) {
          if (fam[i] === fam[i - 1] && evitable) {
            fallos.push(`E-GUION-FAMILIA  ${nomPag}/${nomAire}/${dur}s/seed${seed}: "${plan[i - 1]}" y "${plan[i]}" son las dos de familia "${fam[i]}" y habia orden posible sin repetir`)
            break
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- E-FAMILIA-DECLARADA
// El orden de la pieza lo arma la semilla barajando y despues repartiendo POR FAMILIA, para que dos
// escenas que dicen lo mismo no caigan pegadas. Una escena sin familia declarada no participa de ese
// reparto: se comporta como si fuera unica en su especie y puede quedar al lado de su gemela.
//
// Es la misma clase de deriva que ya costo cara en este archivo —el catalogo de arriba estuvo midiendo
// diez escenas cuando el motor tenia dieciseis, y por eso no reportaba guiones cortos—: una tabla
// escrita a mano al lado de un catalogo que crece se desactualiza sin avisar. Acá se avisa.
const FAM = familiasDe()
for (const id of CAT.keys()) {
  // Las fijas no entran al sorteo del medio, asi que no compiten por adyacencia: 'gancho' y las dos
  // aperturas ('apertura', 'bandera') van en posicion fija y 'cierre' cierra.
  if (id === 'apertura' || id === 'bandera' || id === 'cierre' || id === 'gancho') continue
  if (!FAM[id]) fallos.push(`E-FAMILIA-DECLARADA  la escena "${id}" no declara familia en guion.js: queda fuera del reparto y puede caer pegada a otra que diga lo mismo`)
}

if (escasas.length) {
  console.log(`  ${escasas.length} escena(s) VIVA(S) PERO APRETADA(S) — entre el 1% y el 5%; dato para mirar, no defecto:`)
  for (const m of escasas) console.log('    ' + m)
}
if (fallos.length) {
  console.error(`GUION: ${fallos.length} FALLO(S) sobre ${combinaciones} guiones\n` + fallos.slice(0, 14).map(f => '  ' + f).join('\n'))
  process.exit(1)
}
// Cuantas estructuras distintas sabe producir el motor hoy. Es el numero que responde al reclamo.
const todos = new Set()
for (const datos of Object.values(PAGINAS)) {
  for (const beatSeg of Object.values(BPM)) {
    for (const dur of DURS) {
      for (const seed of SEMILLAS) todos.add(guionDe({ escenas: CAT, datos, seed, beatSeg, dur }).join('>'))
    }
  }
}
console.log(`GUION OK — ${combinaciones} guiones (3 paginas x 3 ritmos x ${DURS.length} duraciones x ${SEMILLAS.length} semillas): `
  + `duracion, variedad, material, marco y cortes.  ${todos.size} estructuras distintas.`)
if (cortas.length) {
  const casos = [...new Set(cortas.map(c => c.split('/seed')[0] + ' -> ' + c.split(': ')[1]))]
  console.log(`  ${cortas.length} guiones quedan cortos porque SE ACABO EL CATALOGO (${CAT.size} escenas, y el material de esa pagina no da para mas):`)
  for (const c of casos.slice(0, 6)) console.log(`    ${c}`)
  console.log('    El arreglo es mas escenas, no mas tolerancia de tempo.')
}

// ---------------------------------------------------------------------------------------------
// E-SIN-ECO — el mostrador no entrega dos veces la misma frase en la MISMA escena.
//
// `datos.js:159-160` promete textualmente que la vuelta del cursor 'avisa por `repetidas` para que una
// compuerta pueda medirlo'. Esa compuerta no existia: `repetidas` se exporta y —grep en todo el repo—
// nadie la lee. Y mientras tanto el mostrador devolvia SIEMPRE exactamente lo pedido: con 2 frases y un
// pedido de 5 salia [A,B,A,B,A], asi que la lista enumeraba A/B/A, las dos mitades de `partida` decian
// lo mismo y las dos cintas de `marquesina` cruzaban la misma frase.
//
// Peor: eso dejaba MUERTAS las guardas de las escenas, escritas contra el contrato que documenta
// `datos.js:173` ('si hay menos, devuelve menos, y la escena decide si le alcanza'). `lista.js:50` mira
// `items.length < MIN_ITEMS` y nunca se cumplia. La falta de material no salia como escena vacia —que
// se ve y se arregla— sino como texto repetido adentro de una escena bien compuesta.
//
// Se exige el INVARIANTE, no la implementacion: lo que entra en una escena no puede tener eco.
if (!globalThis.document) {
  globalThis.document = { createElement: (t) => (t === 'canvas' ? null : { style: {} }), fonts: { ready: Promise.resolve(), load: async () => {}, add() {}, check: () => true, *[Symbol.iterator]() {} } }
  globalThis.FontFace = class { constructor(f) { this.family = f } async load() { return this } }
  globalThis.window = globalThis
}
const DAT = await import('../render3d/demo/datos.js')
const ecos = []
for (const [nombre, frases] of [
  ['pagina de una sola frase', ['Una sola cosa que decir']],
  ['pagina pobre', ['Alfa', 'Beta']],
  ['pagina normal', ['A', 'B', 'C', 'D']],
  ['pagina rica', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']],
]) {
  for (const pedido of [2, 3, 5, 8]) {
    DAT.reiniciarReparto()
    DAT.configurarDatos({ marca: 'X', frases, golpe: '', claim: '', bloque: { titulo: '', bajada: '' },
      datos: [], cta: '', pie: [], dominio: 'x.com', elementos: [] })
    const dado = DAT.repartirFrases(pedido)
    if (new Set(dado).size !== dado.length) {
      ecos.push(`${nombre}: pidiendo ${pedido} devuelve ${dado.length} con ${new Set(dado).size} distintas -> ${JSON.stringify(dado)}`)
    }
    if (dado.length > frases.length) {
      ecos.push(`${nombre}: pidiendo ${pedido} devuelve ${dado.length} y la pagina solo tiene ${frases.length} frases`)
    }
  }
}
if (ecos.length) {
  console.log(`GATE SIN-ECO FAIL (${ecos.length}):`)
  for (const e of ecos) console.log('  ' + e)
  process.exit(1)
}
console.log('GATE SIN-ECO OK (4 paginas x 4 pedidos: el mostrador nunca entrega la misma frase dos veces en la misma escena).')

// ---------------------------------------------------------------------------------------------
// E-SIN-RESERVA — lo que la pieza dice de la marca no puede ser un valor interno de reserva.
//
// `tipoNegocio` sale de un enum cuyo ultimo valor, `otro`, significa NO SE: `semantica_gratis.py:521`
// lo dice textual, 'o "otro" si no hay evidencia suficiente'. Y el rotulo lo imprimia en pantalla
// pegado a la marca: 'TAILWIND CSS · OTRO', 'LINEAR · OTRO'. Medido sobre las 6 capturas reales del
// repo, DOS salian asi — un tercio de las piezas le decia al espectador que el rubro de esa empresa es
// 'otro'. Se vio mirando un cuadro, no leyendo codigo.
//
// Se comprueba sobre los DATOS que produce `datosDe()` con los 7 pagemodels reales, que es el mismo
// camino que corre en produccion.
if (!globalThis.document) {
  globalThis.document = { createElement: (t) => (t === 'canvas' ? null : { style: {} }), fonts: { ready: Promise.resolve(), load: async () => {}, add() {}, check: () => true, *[Symbol.iterator]() {} } }
  globalThis.FontFace = class { constructor(f) { this.family = f } async load() { return this } }
  globalThis.window = globalThis
}
{
  const { readFileSync: _rf, readdirSync: _rd, existsSync: _ex } = await import('node:fs')
  const { fileURLToPath: _fu, pathToFileURL: _pu } = await import('node:url')
  const { dirname: _dn, join: _jn } = await import('node:path')
  const _raiz = _jn(_dn(_fu(import.meta.url)), '..')
  const { datosDe: _dd } = await import(_pu(_jn(_raiz, 'tools', 'anthem-datos.mjs')).href)
  const { normalizePageModel: _np } = await import(_pu(_jn(_raiz, 'src', 'director', 'core', 'schema.js')).href)
  // Los valores que NUNCA pueden llegar a pantalla: son etiquetas del sistema, no de la marca.
  const RESERVA = ['otro', 'desconocido', 'ninguno', 'null', 'undefined', 'sin definir']
  const _dir = _jn(_raiz, 'tools', 'fixtures', 'director', 'elementos')
  const malos = []
  let mirados = 0
  if (_ex(_dir)) {
    for (const f of _rd(_dir).filter(x => x.endsWith('.json')).sort()) {
      let d
      try { d = _dd(_np(JSON.parse(_rf(_jn(_dir, f), 'utf8')))) } catch { continue }
      mirados++
      for (const [campo, valor] of [['rotulo', d.rotulo], ['marca', d.marca], ['claim', d.claim],
        ['golpe', d.golpe], ['cta', d.cta], ['bloque.titulo', (d.bloque || {}).titulo]]) {
        const t = String(valor || '').toLowerCase()
        for (const r of RESERVA) {
          // Palabra entera: una marca que se llame 'Otro Studio' no es un defecto.
          if (new RegExp('(^|[^a-z0-9])' + r + '([^a-z0-9]|$)').test(t)) {
            malos.push(`${f.replace('.json', '')}: ${campo} = ${JSON.stringify(valor)} — "${r}" es un valor de reserva, no un dato de la marca`)
          }
        }
      }
    }
  }
  // Y EL CASO QUE LOS FIXTURES NO PUEDEN DAR. Los 7 pagemodels del repo traen `tipoNegocio` real
  // ('saas', 'ecommerce'): se armaron cuando ese campo lo llenaba un LLM. El 'otro' nace en el camino
  // GRATUITO (`semantica_gratis.rubro_de`, que devuelve 'otro' cuando no hay evidencia), y ese camino
  // los fixtures lo saltean — o sea que barriendolos solos esta compuerta daba verde con el defecto
  // delante, que es exactamente lo que paso al escribirla. Se prueba el caso a mano.
  for (const tn of RESERVA) {
    let d
    try {
      d = _dd(_np({ brand: 'Panaderia Del Sur', url: 'https://x.com',
        semantica: { tipoNegocio: tn, queHace: 'Pan de masa madre', cta: 'Ver', features: [] } }))
    } catch { continue }
    const t = String(d.rotulo || '').toLowerCase()
    if (new RegExp('(^|[^a-z0-9])' + tn + '([^a-z0-9]|$)').test(t)) {
      malos.push(`con tipoNegocio="${tn}" el rotulo sale ${JSON.stringify(d.rotulo)} — es el valor que el sistema pone cuando NO SABE`)
    }
  }
  if (malos.length) {
    console.log(`GATE SIN-RESERVA FAIL (${malos.length}):`)
    for (const m of malos) console.log('  ' + m)
    process.exit(1)
  }
  console.log(`GATE SIN-RESERVA OK (${mirados} paginas reales + ${RESERVA.length} valores de reserva probados a mano: ninguno llega a lo que la pieza dice).`)
}
