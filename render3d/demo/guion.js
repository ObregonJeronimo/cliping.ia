// GUION — decide QUÉ escenas entran, EN QUÉ ORDEN y CUÁNTO dura la pieza.
//
// EL DEFECTO QUE ARREGLA: UNA PÁGINA = UN SOLO VIDEO POSIBLE.
// La lista de escenas era una constante (`escenas/index.js`): las mismas seis, siempre, en el mismo
// orden, durando siempre 17.42 s. Cambiaban la paleta y el copy, y la ESTRUCTURA —que es lo que un
// espectador percibe como "otro video"— era idéntica en todos. Por eso, puestos uno al lado del otro,
// se veían iguales incluso ya con la identidad de cada marca aplicada.
//
// Y ADEMÁS SE COMPONÍA A CIEGAS. La escena de tipografía necesita cuatro frases para llenar sus ocho
// beats; la de tarjetas, al menos una cifra. La lista fija las metía igual: una página que dio una
// frase pasaba por tres beats de tipografía cinética con dos slots vacíos. El material que la página
// dio tiene que decidir qué se puede contar, no sólo qué dice cada slot.
//
// LAS TRES DECISIONES, EN ESTE ORDEN
//   1. QUÉ PUEDE ENTRAR   — cada escena declara el mínimo con el que se sostiene. Sin eso, no entra.
//   2. CUÁNTO TIENE QUE DURAR — el objetivo llega en segundos y se convierte a beats con el BPM del
//      aire, así que una pieza de lujo a 85 bpm y una técnica a 138 dan la MISMA duración con
//      distinta cantidad de escenas. El mercado pide 15 s y 30 s; 17.42 s fijos no es un formato.
//   3. EN QUÉ ORDEN — con la semilla, entre los órdenes que tienen sentido narrativo.
//
// LO QUE NO SE NEGOCIA. La apertura va primera y el cierre último. No es falta de imaginación: son
// las dos escenas que hacen que una sucesión de planos se lea como una pieza. Una apertura en el
// medio es un error de montaje, no una variante.

// Mínimo con el que cada escena se sostiene. Se lee como "qué le tengo que poder dar".
// El costo en beats sale de `meta.beats` del módulo, no de acá: duplicarlo es garantía de que en
// algún momento los dos números dejen de coincidir.
const REQUISITOS = {
  // El gancho necesita la PROMESA de la pagina y nada mas. Sin description no hay gancho: es preferible
  // abrir por la marca que abrir con un encabezado de seccion puesto en cuerpo de cartel.
  gancho: (d) => !!String(d.claim || '').trim(),
  // La apertura sólo necesita el nombre. Toda página tiene uno.
  apertura: (d) => !!d.marca,
  // El hero cae a geometría pura si no hay material: siempre se puede armar.
  hero: () => true,
  // CUATRO ES EL MINIMO PARA ELEGIRLA, PERO LA ESCENA COREOGRAFIA SIETE, y esa diferencia es un
  // defecto REAL que se ve en el video: `tipografia.js:151-201` pide `frase(0)` hasta `frase(6)`, asi
  // que con cuatro frases —lo que dio basecamp.com, y lo que dan las tres paginas de prueba de
  // guion-check, incluida la "rica"— los tres ultimos slots salen vacios y la escena pasa casi UN
  // SEGUNDO sin dibujar una sola palabra. Medido mirando el render: cinco cuadros seguidos con el
  // fondo, el HUD y nada mas. En un reel vertical, un segundo en blanco es la señal de scroll.
  //
  // Y SUBIR ESTE NUMERO NO ES EL ARREGLO. Se probo en 7 y se midio: ninguna pagina real llega a
  // siete frases, asi que la escena de tipografia cinetica —una de las centrales del catalogo—
  // simplemente dejaba de elegirse. El arreglo esta en la ESCENA, que tiene que componerse con las
  // frases que hay en vez de coreografiar siete a ciegas: es lo que ya hace `columna`, que con dos
  // recortes reparte esos dos y lo documenta. Mientras eso no se haga, cuatro sigue siendo el umbral
  // porque una escena con huecos es mejor que ninguna escena.
  tipografia: (d) => (d.frases || []).filter(Boolean).length >= 4,
  // Una cifra alcanza: la escena ya se compone con la cantidad real. Cero cifras es una escena de
  // datos sin datos.
  tarjetas: (d) => (d.datos || []).length >= 1,
  // La ráfaga necesita CON QUE rafaguear: tres piezas, sean recortes reales o frases. Con dos, doce
  // slots se llenan con dos cosas repetidas y el corte deja de significar algo.
  rafaga: (d) => ((d.elementos || []).length + (d.frases || []).filter(Boolean).length) >= 3,
  // La pagina a sangre necesita la TIRA, que es la captura movil scrolleable. No hay forma de
  // sustituirla: sin tira la escena es un rectangulo vacio.
  pantalla: (d) => !!d.tira,
  // La MESA necesita una superficie con contenido: la tira de la pagina, o en su defecto un recorte
  // grande. Es lo mismo que pide `pantalla` mas la alternativa del recorte, porque el sujeto de esta
  // escena no es la pagina ENTERA sino una superficie que se pueda mirar en escorzo.
  mesa: (d) => !!d.tira || (d.elementos || []).some(e => e && e.url),
  // La columna es un feed de recortes reales. Con menos de dos piezas no es una columna, es una foto.
  columna: (d) => (d.elementos || []).length >= 2,
  // La cita necesita que ALGUIEN HAYA HABLADO. Es el unico requisito que no se puede sustituir con
  // otro material: sin testimonio no hay cita, y una cita fabricada es la mentira mas cara del motor.
  // Basta uno — la escena cita a UNA persona, no arma un muro de opiniones.
  cita: (d) => (d.testimonios || []).some(t => t && t.texto),
  // TRES FRASES, DE LAS QUE SEAN. El filtro de "una sola linea" es de cuando la escena NUMERABA: un
  // titular de dos renglones no podia ser un item de lista sin romper la grilla. Desde que dejo de
  // enumerar compone bloques de dos renglones sin problema — y el filtro quedo. Como ademas el
  // extractor ahora entrega los titulos COMPLETOS, y casi todos se componen en dos renglones, la
  // cuenta de frases de una linea bajo a una o dos y la escena quedo inalcanzable: 0% de 200 guiones.
  // Es el mismo defecto que `pantalla` con otra forma — un requisito que ya no describe a su escena.
  lista: (d) => (d.frases || []).filter(Boolean).length >= 3,
  // La portada necesita las DOS cosas: una foto real de la pagina y algo con forma de titular. Sin
  // foto es un titular sobre el fondo, y eso ya lo hace `destello`; sin texto es una foto suelta.
  titular: (d) => (d.elementos || []).some(e => e && ['foto', 'hero', 'tarjeta'].includes(e.rol))
    && (d.frases || []).filter(Boolean).length >= 1,
  // Partir el cuadro sirve para decir DOS cosas a la vez, asi que necesita dos. Con una, la mitad
  // vacia es un rectangulo de color esperando contenido. Solo frases de una linea: las de dos
  // renglones son titulares y no entran en media pantalla.
  partida: (d) => (d.frases || []).filter(f => f && !/\n/.test(String(f))).length >= 2,
  // Una comparacion necesita DOS piezas reales Y COMPARABLES. Con una es una foto, y eso ya lo hacen
  // otras dos. Pero ademas: dos piezas de proporciones muy distintas —un logo apaisado contra una
  // captura vertical— no se comparan, se estorban; encajadas en la misma caja una queda enorme y la
  // otra en un rincon, y el barrido pierde el sentido. Se exige que sus proporciones esten dentro de
  // un factor de 2, que es lo que separa "dos versiones de lo mismo" de "dos cosas distintas".
  contraste: (d) => {
    const ars = (d.elementos || []).filter(e => e && e.url && e.ar > 0).map(e => e.ar)
    for (let i = 0; i < ars.length; i++) {
      for (let j = i + 1; j < ars.length; j++) {
        const k = ars[i] / ars[j]
        if (k >= 0.5 && k <= 2) return true
      }
    }
    return false
  },
  // El sello solo necesita el nombre, y toda pagina tiene uno. Es la escena que sostiene las piezas
  // de lujo e inmobiliaria, que componen con AIRE y no toleran un catalogo de cuadros llenos.
  sello: (d) => !!d.marca,
  // El beat de inversión es un titular a sangre. Sin golpe no hay nada que romper.
  destello: (d) => !!d.golpe,
  // El toro es geometría: no necesita nada, y por eso es el relleno honesto cuando falta material.
  toro: () => true,
  cierre: (d) => !!d.marca,
}

// Los órdenes posibles del bloque del medio. No es una permutación cualquiera — cada uno es una forma
// distinta de contar y las cuatro funcionan:
//   objeto→mensaje→datos   establece el espacio, después habla, después prueba   (el de ANTHEM)
//   mensaje→objeto→datos   entra por el claim, el objeto ilustra                (más publicitario)
//   datos→mensaje→objeto   abre con la prueba dura                              (más B2B)
//   mensaje→datos→objeto   claim y prueba juntos, el objeto cierra              (más de producto)
// La RAFAGA va siempre despues de una escena lenta y antes de un corte de estructura: su gracia es el
// contraste de densidad. Doce cuadros en seis beats pegados a otra escena rapida se leen como ruido.
// LA CITA VA PEGADA A LA PRUEBA, y no en cualquier lado. Un testimonio es prueba social: al lado de
// las cifras arma UN bloque de prueba (el dato duro y despues alguien que lo confirma), y suelto en
// el medio del mensaje se lee como una frase mas del claim, que es justo lo que no es. Por eso entra
// despues de `tarjetas` en los ordenes que la tienen antes, y en el orden que abre con la prueba
// (el tercero, el mas B2B) va segunda, cerrando el bloque de entrada.
//
// EL SELLO VA TEMPRANO O NO VA. Lo puse ultimo en las cuatro listas y, medido corriendo el guion
// contra una pagina con material, NUNCA entraba: el presupuesto de beats se agota antes de llegar al
// final de la lista, asi que la escena existia, estaba registrada, cumplia sus REQUISITOS y no se
// elegia jamas. Y es justo la escena que sostiene a `lujo` e `inmobiliario`, los dos aires que
// componen con AIRE y no toleran un catalogo de cuadros llenos. Ahora abre una pieza (declaracion de
// marca) y cierra el bloque de prueba en otra (la firma despues del dato), que ademas es donde un
// sello significa algo.
//
// TRES ESCENAS BEBEN DEL MISMO POZO, y con poco material se nota. `tipografia` recorre TODAS las
// frases, `partida` usa las dos primeras y `lista` cuatro. Una pagina normal da cuatro frases
// —basecamp dio exactamente cuatro— asi que las tres pueden terminar diciendo lo mismo con distinta
// tipografia: en el render se vio "01 BIG NUMBERS. / 02 REMEMBER WHEN" en la lista, que eran las dos
// frases que `tipografia` acababa de pasar diez segundos antes. El espectador no lee dos escenas: lee
// una repetida.
//
// Mitigado a medias en `lista`, que ahora toma las ULTIMAS frases en vez de las primeras, asi que con
// cinco o mas ya no coincide. Lo que falta es la decision de GUION: cuantas escenas de texto entran
// en una pieza segun cuantas frases dio la pagina. Con cuatro frases deberia entrar UNA sola. No se
// hizo todavia porque el cambio obvio —subir un minimo en REQUISITOS— ya demostro ser trampa una vez
// (ver la nota de `tipografia`): hay que medirlo con guion-check antes, y mirar el video despues.
//
// OJO AL AGREGAR ESCENAS NUEVAS: una escena que no figura en NINGUNA de estas listas no se elige
// jamas, aunque exista, este registrada y cumpla sus REQUISITOS — `medio` sale de filtrar ESTA lista.
// Es la forma mas silenciosa que tiene el catalogo de crecer sin que se note.
// DE QUE HABLA CADA ESCENA. La familia no es una etiqueta decorativa: es lo unico que permite armar
// un orden nuevo por semilla sin que la pieza se lea repetida. Dos escenas de la misma familia
// seguidas dicen lo mismo con distinta tipografia — es exactamente el defecto que el cupo de escenas
// de texto vino a tapar, visto desde el otro lado.
//
// SI FALTA UNA, guion-check falla. Una tabla escrita a mano al lado de un catalogo que crece es la
// receta del catalogo fantasma: a este mismo repo le paso con guion-check midiendo diez escenas
// cuando ya habia dieciseis, y por eso no reportaba guiones cortos durante meses.
const FAMILIA = {
  tipografia: 'texto', lista: 'texto', partida: 'texto', titular: 'texto', cita: 'texto',
  marquesina: 'texto', gancho: 'texto',
  pantalla: 'pagina', columna: 'pagina', mesa: 'pagina',
  hero: 'objeto',
  // `toro` NO es de la familia del hero, y ponerlo ahi fue un error propio que costo nueve segundos de
  // pieza: en una pagina pobre el relleno solo puede repetir hero/toro/sello, y si hero y toro no
  // pueden tocarse se queda sin huecos y la pieza sale en 21.3s de 30. La familia responde a QUE DICE
  // la escena, y el toro es geometria pura: no afirma nada sobre la marca. Por eso puede ir al lado de
  // cualquier cosa —es el unico que puede— y por eso es el que sostiene una pieza sin material.
  toro: 'abstracto',
  tarjetas: 'dato', rafaga: 'dato',
  sello: 'marca', destello: 'marca',
  contraste: 'comparacion',
}
export const familiasDe = () => FAMILIA

// ESCENAS DORMIDAS — registradas, verdes en las compuertas, y FUERA del sorteo.
//
// No es lo mismo que borrarlas. Una escena borrada se lleva su archivo, sus comentarios y el trabajo
// de medicion que costo; una dormida sigue existiendo, sigue pasando `verificar` y se despierta
// quitandola de este Set. Que este aca y no en el archivo de la escena es a proposito: la decision es
// del GUION —de que material tiene sentido mostrar en una pieza— y no de la escena, que no puede
// saberlo.
//
// `columna`: el feed vertical de recortes. Se le arreglo el tamaño, la nitidez y el fantasma del
// obturador y aun asi lo que muestra son PEDAZOS de pagina fuera de contexto, y en una pagina con dos
// o tres elementos utiles los repite. Thiago, mirando el render de basecamp: "vuelven a aparecer las
// mismas imagenes que aparecieron en escenas atras, y estan horribles y tampoco tienen sentido, esa
// escena que no aparezca, no pega nada". El problema no es como se ve: es que un feed necesita un
// caudal de material que una landing no da. Cuando la cosecha de elementos entregue piezas con
// sentido propio —hoy corta filas a mitad de palabra— esto se puede reconsiderar.
// `contraste`: el barrido A|B. Se le arreglo el respaldo que cortaba la pieza al medio y se le saco el
// rol 'cta' —comparaba el boton "Contact sales" contra el boton "Listen"—, y aun asi lo que enfrenta son
// dos recortes que la pagina publico por separado y que no tienen por que compararse entre si. Thiago,
// mirando el render: "no tiene sentido mostrar botones de la pagina, esa escena que no aparezca". Se
// duerme con los arreglos hechos, asi que despertarla es sacarla de este Set y no volver a arreglarla.
export const DORMIDAS = new Set(['columna', 'contraste'])

// EL ORDEN LO ARMA LA SEMILLA, y antes elegia entre CUATRO listas escritas a mano. Medido sobre las
// nueve combinaciones de pagina x ritmo x duracion: casi todas daban 4 estructuras para 100 semillas,
// y la peor daba UNA. O sea que un cliente que pedia "otra version del mismo video" recibia el mismo
// video. La semilla existia y no llegaba a nada, que es el defecto que este motor tiene tres veces.
//
// Las cuatro listas ademas escondian una trampa que estaba documentada y sin arreglar: una escena que
// no figurara en NINGUNA no se elegia jamas, aunque existiera, estuviera registrada y cumpliera sus
// requisitos. Era la forma mas silenciosa que tenia el catalogo de crecer sin que se note. Barajando
// las escenas REGISTRADAS eso se cierra solo: entra al sorteo todo lo que existe.
//
// El orden no es un sorteo pelado, porque un sorteo pelado pone dos escenas de texto seguidas y la
// pieza se lee repetida. Se baraja y despues se REPARTE POR FAMILIA: en cada paso se toma la primera
// candidata cuya familia no sea la de la anterior. Es la misma regla que el montaje usa para no
// repetir gesto, aplicada al guion.
function barajar(ids, rnd) {
  const a = ids.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp
  }
  return a
}

// SEPARAR FAMILIAS VA AL FINAL, y ponerlo antes fue un defecto propio que se vio mirando el plan: con
// la semilla 7 salio `toro > hero`, las dos de familia 'objeto'. Repartiendo sobre la lista completa
// y filtrando DESPUES por material y por presupuesto, las escenas que hacian de separador se caen y
// las gemelas vuelven a quedar pegadas. La invariante hay que garantizarla sobre la lista que se va a
// ver, no sobre una intermedia.
function separarFamilias(ids) {
  const a = ids.slice()
  const salida = []
  let ultima = null
  const fam = (id) => FAMILIA[id] || id
  while (a.length) {
    // SE ELIGE LA FAMILIA CON MAS PENDIENTES, no la primera que no repita. La version codiciosa
    // parecia equivalente y no lo es: con dos 'objeto', un 'dato' y dos 'texto' existe un orden sin
    // pares repetidos, y tomando la primera que sirve los dos 'texto' quedaban pegados al final. Se
    // vio en el plan de la semilla 7. Gastar primero la familia mas numerosa es lo que garantiza que
    // alcancen los separadores — es el mismo argumento por el que se ordena una baraja por palo.
    const cuenta = new Map()
    for (const id of a) cuenta.set(fam(id), (cuenta.get(fam(id)) || 0) + 1)
    let mejorFam = null
    for (const [f, n] of cuenta) {
      if (f === ultima) continue
      if (mejorFam === null || n > cuenta.get(mejorFam)) mejorFam = f
    }
    // Sin candidata, lo que queda es todo de la familia anterior: se toma igual. Quedarse sin escenas
    // es peor que un par repetido en la cola.
    let k = mejorFam === null ? 0 : a.findIndex(id => fam(id) === mejorFam)
    if (k < 0) k = 0
    const id = a.splice(k, 1)[0]
    ultima = fam(id)
    salida.push(id)
  }
  return salida
}

export const DUR_OBJETIVO = { corto: 15, medio: 20, largo: 30 }

// guionDe({ escenas, datos, seed, beatSeg, dur }) -> [ids]
//
//   escenas   Map id -> meta (para leer meta.beats). El guion NO importa los módulos: así se puede
//             probar en Node sin arrastrar three.
//   beatSeg   cuánto dura un beat con el bpm de ESTE aire.
//   dur       objetivo en segundos. Sin objetivo, se usa lo que entre con el material disponible.
export function guionDe({ escenas, datos, seed = 1, beatSeg = 60 / 124, dur = null }) {
  const d = datos || {}
  const beatsDe = (id) => (escenas.get(id) || {}).beats || 0
  const puede = (id) => escenas.has(id) && (REQUISITOS[id] ? REQUISITOS[id](d) : true)

  // Azar con semilla, propio: el guion corre en Node (compuertas) y en el navegador (render), y en los
  // dos tiene que dar exactamente lo mismo para la misma semilla.
  //
  // LA SEMILLA SE MEZCLA ANTES DE USARSE, y no es paranoia. Un congruencial lineal con semillas
  // chicas y consecutivas (1, 2, 3...) devuelve PRIMEROS valores casi iguales: las cinco primeras
  // semillas caian todas en el mismo orden narrativo y la variedad estructural que este archivo
  // existe para dar no aparecia. Se ve sólo mirando la salida de varias semillas seguidas, que es
  // exactamente el caso de uso: el mismo cliente pidiendo otra version del mismo video.
  let s = ((seed >>> 0) || 1) * 2654435761 >>> 0
  s = (s ^ (s >>> 15)) >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return ((s ^ (s >>> 16)) >>> 0) / 4294967296 }

  // Se barajan las escenas REGISTRADAS menos las fijas: asi una escena nueva entra al sorteo el dia
  // que se registra, sin que nadie tenga que acordarse de agregarla a una lista.
  // LAS FIJAS NO ENTRAN AL SORTEO DEL MEDIO. Agregue `gancho` a las fijas y me olvide de esta linea: en
  // el primer render salio DOS VECES, al principio y a los 19 segundos, diciendo la misma promesa. Una
  // escena fija que ademas es candidata se duplica sola.
  const FIJAS = new Set(['apertura', 'cierre', 'gancho'])
  const candidatas = [...escenas.keys()].filter(id => !FIJAS.has(id) && !DORMIDAS.has(id))
  const orden = barajar(candidatas, rnd)

  // CUPO DE ESCENAS DE TEXTO, porque tres beben del mismo pozo.
  // `tipografia` recorre TODAS las frases, `lista` usa cuatro y `partida` dos. Con lo que da una
  // pagina normal —basecamp dio cuatro— las tres terminan diciendo lo MISMO con distinta tipografia,
  // y el espectador no ve tres escenas: ve una repetida tres veces. Se vio en el render: la lista
  // enumeraba "01 BIG NUMBERS. / 02 REMEMBER WHEN", las dos frases que `tipografia` acababa de pasar.
  //
  // El cupo sale de cuantas frases DISTINTAS hay para repartir, no de un gusto: con ocho o mas alcanza
  // para las tres sin que se pisen, con cinco a siete para dos, y con cuatro o menos para UNA sola.
  // El orden de la lista es de prioridad y tampoco es arbitrario: `tipografia` es la escena de mensaje
  // del catalogo y ocupa ocho beats —el doble que las otras—, asi que sacarla y dejar dos de seis
  // cambia la pieza mucho mas que sacar las otras dos.
  //
  // Los beats que se liberan NO se pierden: los toma el relleno, que ahora repite hero/toro/sello.
  // Por eso este cupo es asumible hoy y no lo era con el catalogo de diez.
  // `rafaga` ENTRA AL CUPO, y faltaba. Bebe del mismo pozo —alterna recorte y frase— y quedaba fuera
  // de la cuenta, asi que con cuatro frases el cupo dejaba pasar UNA escena sedienta y despues `rafaga`
  // mostraba las mismas dos frases igual. Se vio en el render de basecamp: la escena de 0:19 repetia
  // "BIG NUMBERS", que era el primer item del bloque de texto de 0:12. El mostrador de datos.js evita
  // que dos escenas muestren la MISMA frase mientras quede material; el cupo evita que se pidan mas
  // frases de las que la pagina dio.
  const SEDIENTAS = ['tipografia', 'lista', 'partida', 'rafaga', 'marquesina']
  const nFr = (d.frases || []).filter(Boolean).length
  // Cuantas frases pide cada una: tipografia 3, lista 3, partida 2, rafaga 3. El cupo sale de cuantas
  // hay para repartir sin que ninguna tenga que dar la vuelta al pozo.
  const cupo = nFr >= 9 ? 3 : nFr >= 5 ? 2 : 1
  // Y SE ROTA CON LA SEMILLA, no se corta por prioridad fija. El `slice(0, cupo)` hacia ganar SIEMPRE a
  // `tipografia`, asi que `lista` y `partida` quedaban inalcanzables en toda la franja de 3 a 7 frases —
  // que es justo donde caen las paginas reales. Medido con la compuerta nueva: aparecian en el 0.0% de
  // 324 guiones. Dos escenas escritas, verdes, en produccion, y que ningun espectador iba a ver.
  //
  // El cupo se conserva porque es correcto: tres escenas beben del mismo pozo de frases y ya se vio en
  // un render a la lista enumerando lo que tipografia acababa de decir. Lo que cambia es CUAL sobrevive:
  // con la semilla, no con un orden escrito a mano.
  const califican = SEDIENTAS.filter(puede)
  const sobreviven = new Set()
  if (califican.length) {
    const desde = Math.floor(rnd() * califican.length) % califican.length
    for (let i = 0; i < Math.min(cupo, califican.length); i++) sobreviven.add(califican[(desde + i) % califican.length])
  }
  const medio = orden.filter(puede).filter(id => !SEDIENTAS.includes(id) || sobreviven.has(id))

  // EL GANCHO ES FIJO Y VA ANTES DE LA MARCA. Es la unica escena que rompe "la apertura va primera", y
  // la razon no es estetica: estos videos se ven en un feed, donde nadie decide seguir mirando porque
  // le mostraron un logo. Decide en los primeros dos segundos y decide sobre si le prometieron algo.
  // La regla vieja sigue valiendo, con una palabra mas: la apertura va primera ENTRE LAS ESCENAS DE
  // MARCA. Adelante solo puede ir una promesa, y solo si la pagina la escribio.
  const fijas = ['gancho', 'apertura', 'cierre'].filter(puede)
  const beatsFijos = fijas.reduce((n, id) => n + beatsDe(id), 0)
  const objetivo = dur ? Math.round(dur / beatSeg) : Infinity
  // Un beat de tolerancia. Sin ella, pidiendo 15 s salian 13.5: la ultima escena que entraba se
  // pasaba por medio beat y se descartaba entera, dejando un segundo y medio de nada. Pasarse un beat
  // (medio segundo) es invisible; quedarse corto un 10% se nota.
  const disponibles = objetivo === Infinity ? Infinity : objetivo - beatsFijos + 1

  // QUIENES ENTRAN Y EN QUE ORDEN SON DOS PREGUNTAS DISTINTAS, y mezclarlas costaba segundos de
  // pieza. Llenando el presupuesto en el orden barajado, una escena de seis beats elegida primero le
  // saca el lugar a una de ocho que ya no entra: medido al barajar, los guiones cortos pasaron de 4 a
  // 14 sobre 324. El orden lo pone la semilla —que es de donde sale la variedad— y la SELECCION se
  // queda con el mejor de dos llenados: el del orden y el de mayor-primero. Despues se devuelve al
  // orden barajado, asi que la variedad no se pierde.
  const llenar = (lista) => {
    const dentro = new Set()
    let n = 0
    for (const id of lista) {
      const c = beatsDe(id)
      if (n + c > disponibles) continue               // no entra: se saltea y se sigue probando
      dentro.add(id); n += c
    }
    return { dentro, n }
  }
  const porOrden = llenar(medio)
  const porTamano = llenar(medio.slice().sort((x, y) => beatsDe(y) - beatsDe(x)))
  const mejor = porTamano.n > porOrden.n ? porTamano : porOrden
  // El reparto por familia se aplica ACA: despues del filtro por material, del cupo de texto y de la
  // seleccion por presupuesto —los tres pueden sacar la escena que hacia de separador y volver a pegar
  // dos gemelas— y ANTES del relleno, que tiene su propia regla de colocacion. Aplicarlo al final
  // deshacia esa colocacion: medido, dejaba dos heroes pegados en 14 de 324 guiones.
  const plan = separarFamilias(medio.filter(id => mejor.dentro.has(id)))
  let usados = mejor.n

  // TODAVÍA SOBRA TIEMPO. Pasa siempre que se piden 30 s: el material del medio da 20 y quedan diez
  // segundos de nada. La respuesta NO es estirar las escenas —una escena al 150% de su duración es la
  // misma escena en cámara lenta, y se nota— sino repetir la del HERO con OTRO hero. Es la única que
  // puede volver diciendo algo distinto, porque su sujeto es un objeto y hay varios.
  // SE REPITE LO QUE NO DEPENDE DEL MATERIAL, y no solo el hero. Con el catalogo del gate corregido
  // aparecio el agujero: una pagina POBRE (nombre y poco mas) pedia 30 s y entregaba 20, con
  // veinticuatro beats libres donde entraba una escena de seis. El relleno solo sabia repetir `hero`,
  // y una vez que no quedan huecos sin hero al lado, se rinde. `toro` no necesita nada y `sello` solo
  // el nombre: las dos pueden volver sin afirmar nada nuevo sobre la marca, que es la unica condicion
  // que importa. Un emblema que vuelve al final se lee como firma; veinticuatro beats de nada se leen
  // como que el video se corto.
  for (const relleno of ['hero', 'toro', 'sello']) {
  if (objetivo !== Infinity && puede(relleno)) {
    const c = beatsDe(relleno)
    // Hasta seis vueltas. Con tres, una pieza de 30 s a 142 bpm se quedaba en 25: el tope no lo ponia
    // el material sino un numero elegido a ojo.
    let vueltas = 0
    while (usados + c <= disponibles && vueltas < 6) {
      // NUNCA PEGADO A OTRO HERO: dos heroes seguidos son la misma escena dos veces, y aunque el
      // objeto cambie el corte entre ellos no se lee como corte. Se prueban posiciones hasta dar con
      // una que no tenga un hero de vecino; si no hay ninguna, no se inserta y la pieza queda mas
      // corta — que es mejor que el defecto.
      // Se ARMA la lista de posiciones validas y se elige una, en vez de probar al azar hasta acertar:
      // con el plan ya poblado de heroes quedan pocos huecos, y ocho intentos al azar fallaban seguido
      // dejando la pieza corta por mala suerte y no por falta de material.
      // Desde 0: la posicion de ADELANTE DE TODO tambien es valida. Arrancaba en 1 —"que no sea la
      // primera"— y eso dejaba fuera justo el arranque que usa la pieza de referencia (apertura y
      // enseguida el objeto). Costaba ocho beats por pieza: una de 30 s se quedaba en 22.8 con
      // dieciocho beats libres y un hueco perfectamente valido que nadie miraba.
      // Y SE MIRA LA FAMILIA, no el id. Comparando solo el id, el relleno metia `toro` pegado a `hero`
      // —las dos son de familia 'objeto'— y el corte entre ellas no se lee. Lo encontro E-GUION-FAMILIA
      // en su primera corrida: tres guiones de 324, todos en paginas con material de sobra, donde el
      // reparto por familia habia hecho bien su trabajo y el relleno lo deshacia despues.
      const famR = FAMILIA[relleno] || relleno
      const famDe = (id) => (id === undefined ? null : (FAMILIA[id] || id))
      const huecos = []
      for (let i = 0; i <= plan.length; i++) {
        if (famDe(plan[i - 1]) !== famR && famDe(plan[i]) !== famR) huecos.push(i)
      }
      if (!huecos.length) break
      plan.splice(huecos[Math.floor(rnd() * huecos.length) % huecos.length], 0, relleno)
      usados += c; vueltas++
    }
  }
  }

  // Si NADA del medio entró, la pieza sería apertura + cierre pegados. Antes que eso, entra el toro:
  // es geometría pura, no afirma nada y sostiene el espacio.
  if (!plan.length && puede('toro') && usados + beatsDe('toro') <= disponibles) plan.push('toro')

  const fin = fijas.includes('cierre') ? ['cierre'] : []
  const ini = fijas.includes('apertura') ? ['apertura'] : []
  const hook = fijas.includes('gancho') ? ['gancho'] : []
  return [...hook, ...ini, ...plan, ...fin]
}

// AJUSTE FINO DE TEMPO. Un plan sólo puede medir múltiplos enteros de beat, y a 85 bpm un beat dura
// 0.71 s: pidiendo 20 s, la mejor combinación de escenas cae en 18.4 y sobran un segundo y medio que
// ninguna escena puede llenar. Estirar UNA escena para tapar el hueco la deja en cámara lenta contra
// las demás y se nota enseguida.
//
// Lo que no se nota es correr el TEMPO DE TODA LA PIEZA. Si todo escala junto, la grilla de beats
// sigue siendo coherente —los cortes siguen cayendo donde caían, sólo que la pieza entera va un 8%
// más lenta— y la música es implícita, así que no hay nada con qué desincronizarse. Un 8% de tempo es
// invisible; un segundo y medio de nada al final, no.
//
// El tope es 15%, y sale de una medición, no de una intuición: con 12% una página sin cifras pedida a
// 30 s se quedaba en 26.1 — el catálogo tiene siete escenas y una pieza de 30 s necesita nueve huecos,
// así que sin la escena de datos no hay con qué llenar. 15% es la diferencia entre 124 y 108 bpm: dos
// tempos igual de normales. Más que eso ya no es un ajuste sino otra pieza a otra velocidad, y ahí lo
// correcto es que quede corta y que se vea que faltó material.
//
// El arreglo de fondo NO es subir este número: es tener más escenas. Con nueve o diez en el catálogo,
// una pieza de 30 s se llena con material distinto en vez de estirarse.
export const TOPE_AJUSTE = 0.15
export function ajusteDe(plan, escenas, beatSeg, dur) {
  const propia = beatsDelGuion(plan, escenas) * beatSeg
  if (!dur || propia <= 0) return { escala: 1, dur: propia }
  const escala = propia / dur
  if (Math.abs(escala - 1) > TOPE_AJUSTE) return { escala: 1, dur: propia }
  return { escala, dur }
}

// Cuántos beats mide un plan. Lo usan el secuenciador y la compuerta.
export const beatsDelGuion = (plan, escenas) =>
  plan.reduce((n, id) => n + ((escenas.get(id) || {}).beats || 0), 0)
