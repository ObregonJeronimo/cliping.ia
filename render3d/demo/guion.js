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
// QUIEN SE QUEDA CON UN ASSET CUANDO DOS ESCENAS LO QUIEREN.
//
// El motor ya tenia dos reparticiones para que nada se repita: el mostrador de datos.js reparte las
// FRASES (repartirFrases / claimLibre / marcarClaimUsado) y `recortesDe` (kit.js) rota un cursor entre
// escenas para que no se repitan los RECORTES. La TIRA —la captura scrolleable de la pagina entera—
// no tenia ninguna de las dos: `pantalla` y `mesa` la leian las dos con un `texturas.get('tira')`
// directo, sin preguntarle a nadie.
//
// El costo, medido en el render de stripe.com del 2026-07-31: la misma captura en pantalla de 0:02 a
// 0:04 y otra vez de 0:07 a 0:10. No es un defecto de encaje ni de nitidez, asi que ninguna compuerta
// podia verlo: las dos escenas estaban perfectamente compuestas, y el problema era que contaban lo
// mismo.
//
// LA REGLA DE DESEMPATE NO ES EL ORDEN, ES QUIEN TIENE ALTERNATIVA. `pantalla` ES la tira: sin ella
// devuelve `vacia` y son seis beats de cuadro liso. `mesa` pide "una superficie con contenido" y ya
// tenia escrita la rama del recorte. Asi que la tira es de `pantalla` aunque `mesa` vaya antes, y no
// hay que ordenar nada ni que las escenas se enteren de en que posicion cayeron.
export const DUENO = { tira: 'pantalla' }

// Y CON QUE SE QUEDA LA QUE PERDIO. Una escena que cede el asset sigue en pie solo si tiene con que
// componerse; si no, no se la deja adentro esperando a declararse vacia. Es la diferencia entre una
// pieza mas corta y una pieza con seis beats de fondo pelado en el medio.
const RESPALDO_SIN_TIRA = {
  mesa: (d) => (d.elementos || []).some(e => e && e.url),
}

// LAS FRASES QUE EL MOSTRADOR VA A REPARTIR DE VERDAD — que no son todas las que trae la pagina.
//
// `repartirFrases` (datos.js:193) saca del pozo la frase que el GOLPE ya va a decir entera: `pozo
// .filter(f => _norm(f) !== golpe)`. Y el golpe se elige de los mismos titulos de feature que las
// frases (anthem-datos.mjs:222-226), asi que casi siempre es una de ellas. Este archivo contaba sobre
// `d.frases` ENTERO en dos lugares —el cupo de texto y el requisito de `partida`— o sea que creia
// tener una frase mas de las que hay.
//
// El costo medido: sobre stripe-com, 180 guiones, el 42% de las piezas repiten una frase en dos
// escenas distintas. Y en awwwards `partida` calificaba con dos y el mostrador le devolvia DOS VECES
// 'Submit your website': el cuadro partido mostrando la misma linea arriba y abajo, que es justo lo
// que partida.js:18-19 declara imposible. La guarda de partida.js:36 no lo ve porque el mostrador
// nunca devuelve de menos — da la vuelta al pozo y repite antes que faltar.
//
// Es el mismo defecto que la IMAGEN repetida entre `pantalla` y `mesa`, en el otro material: dos
// reparticiones que no se hablan. La regla es una sola —contar sobre el mismo pozo del que se pide—
// y esta funcion existe para que no haya dos versiones de esa cuenta.
//
// `_norm` es una copia de datos.js:185 a proposito: importarla obligaria a guion.js a depender del
// modulo de datos, y este archivo se prueba con objetos planos.
const _norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9à-ÿ ]+/gi, ' ').replace(/[ ]+/g, ' ').trim()
const frasesRepartibles = (d) => {
  const pozo = (d.frases || []).filter(Boolean)
  const golpe = _norm(d.golpe || '')
  if (!golpe) return pozo
  const sinGolpe = pozo.filter(f => _norm(f) !== golpe)
  // El mismo respaldo que el mostrador: si sacar el golpe deja el pozo vacio, el pozo entero vale.
  // Sin esta linea el requisito seria MAS estricto que la escena y la suprimiria donde si se compone.
  return sinGolpe.length ? sinGolpe : pozo
}

// SE EXPORTA PARA QUE LA COMPUERTA MIDA ESTE OBJETO Y NO UNA COPIA. tools/guion-check.mjs tenia seis
// requisitos transcriptos a mano (su `REQ`), o sea que auditaba una CREENCIA sobre el guion en vez del
// guion. Los efectos eran dos y los dos estaban medidos: los 13 requisitos que no estaban copiados no
// se auditaban en absoluto, y los 6 que si estaban repetian el mismo numero, asi que un umbral mal
// puesto salia verde en las dos puntas. Justo lo que paso con `tipografia`, cuyo 4 estaba escrito
// identico en los dos lados.
export const REQUISITOS = {
  // El gancho necesita la PROMESA de la pagina y nada mas. Sin description no hay gancho: es preferible
  // abrir por la marca que abrir con un encabezado de seccion puesto en cuerpo de cartel.
  gancho: (d) => !!String(d.claim || '').trim(),
  // La apertura sólo necesita el nombre. Toda página tiene uno.
  apertura: (d) => !!d.marca,
  // MARQUESINA ERA LA UNICA DE LAS VEINTE SIN CLAVE ACA, y el objeto de REQUISITOS tenia 19 entradas
  // para 20 escenas registradas. Sin clave, `puede()` devuelve true sin preguntar nada: la escena
  // entraba SIEMPRE, incluso en una pagina con una sola frase, y adentro se declaraba vacia. Antes de
  // que main.js honrara ese campo, eso eran 2.9 a 4.2 segundos de fondo pelado en la pieza.
  //
  // El numero sale de la escena y se leyo de ahi, no se eligio: `MIN_FRASES` es 2 (marquesina.js:26),
  // porque son dos tiras cruzadas y con una sola frase las dos dirian lo mismo. Se pone 2 y no 3
  // aunque la escena pida tres al mostrador: pedir mas de lo que la escena necesita la suprimiria en
  // paginas donde si puede componerse, y esta escena ya es de las raras del catalogo.
  marquesina: (d) => (d.frases || []).filter(Boolean).length >= 2,
  // La bandera tampoco pide mas: el nombre calado sobre el color de la marca. El dominio es opcional
  // —si no esta, la escena compone sin pie— porque exigirlo la volveria mas dificil de armar que la
  // apertura, y las dos tienen que poder abrir cualquier pieza o la eleccion por semilla se sesga.
  bandera: (d) => !!d.marca,
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
  // TRES, QUE ES LO QUE LA ESCENA PIDE. Todo el comentario de arriba describe una escena que ya no
  // existe: `tipografia` no coreografia siete slots a ciegas desde que se reescribio — pide
  // `repartirFrases(3)` y compone con lo que le den (`NF = Math.max(1, mias.length)`, tipografia.js:187).
  // El umbral quedo en 4 y el efecto fue el que el propio comentario decia querer evitar: medido, la
  // escena de mensaje MAS LARGA del catalogo (8 beats, el doble que las otras) aparecia en 0 de 180
  // guiones de una pagina con 3 frases y material de sobra. Un requisito mas exigente que su escena no
  // la protege, la borra.
  //
  // Se pone 3 y no 2: con dos, dos de los tres slots dirian lo mismo, que es el mismo defecto que
  // `marquesina` documenta arriba.
  tipografia: (d) => frasesRepartibles(d).length >= 3,
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
  // SE CUENTA SOBRE EL MISMO POZO DEL QUE SE PIDE. Ver la nota de `frasesRepartibles` arriba: la escena
  // llama `repartirFrases(2, true)` y el mostrador reparte sin la frase del golpe.
  partida: (d) => frasesRepartibles(d).filter(f => !/\n/.test(String(f))).length >= 2,
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
export function guionDe({ escenas, datos, seed = 1, beatSeg = 60 / 124, dur = null, fija = null }) {
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
  // UN SORTEO APARTE PARA LAS DECISIONES QUE NO SON DEL MEDIO.
  //
  // Elegir la apertura con `rnd()` corre el flujo entero y cambia QUE escenas entran para toda semilla.
  // No es que este mal en si —seguiria siendo determinista— pero destapo una combinacion que el
  // reordenador por familia no sabe resolver, y de paso invalida cualquier semilla que alguien haya
  // guardado. Una decision que no participa del reparto del medio no tiene por que moverlo: se saca de
  // un generador propio, sembrado con la misma semilla y otra constante.
  let s2 = ((seed >>> 0) || 1) * 2246822519 >>> 0
  s2 = (s2 ^ (s2 >>> 13)) >>> 0
  const rndFijas = () => { s2 = (s2 * 1664525 + 1013904223) >>> 0; return ((s2 ^ (s2 >>> 16)) >>> 0) / 4294967296 }

  // Se barajan las escenas REGISTRADAS menos las fijas: asi una escena nueva entra al sorteo el dia
  // que se registra, sin que nadie tenga que acordarse de agregarla a una lista.
  // LAS FIJAS NO ENTRAN AL SORTEO DEL MEDIO. Agregue `gancho` a las fijas y me olvide de esta linea: en
  // el primer render salio DOS VECES, al principio y a los 19 segundos, diciendo la misma promesa. Una
  // escena fija que ademas es candidata se duplica sola.
  const FIJAS = new Set(['apertura', 'bandera', 'cierre', 'gancho'])
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
  // `titular` ESTABA BEBIENDO SIN QUE NADIE LO CONTARA. Medido construyendo 105 piezas con los 7
  // fixtures reales (`tools/eco-check.mjs`): aparece 75 veces —mas que ninguna otra sedienta— y entraba
  // por fuera del cupo, asi que se llevaba frases que las demas ya tenian contadas y el mostrador
  // terminaba dando la vuelta. Ahora pide UNA (ver la nota en titular.js) y esa una se cuenta.
  const SEDIENTAS = ['tipografia', 'lista', 'partida', 'rafaga', 'marquesina']
  // SIN LA FRASE DEL GOLPE, por lo mismo que `partida`: el cupo reparte un pozo que el mostrador ya
  // achico. Contandola de mas, entraba una escena sedienta que no tenia con que llenarse y el
  // mostrador —que nunca se niega— daba la vuelta y repetia. Ver `frasesRepartibles`.
  // SIN LA FRASE DEL GOLPE, por lo mismo que `partida`: el cupo reparte un pozo que el mostrador ya
  // achico. Contandola de mas, entraba una escena sedienta que no tenia con que llenarse y el
  // mostrador —que nunca se niega— daba la vuelta y repetia. Ver `frasesRepartibles`.
  //
  // LO QUE ESTE NUMERO TODAVIA NO CUENTA, y queda anotado porque se intento y NO se pudo demostrar:
  // `hero` bebe una frase para su rotulo (hero.js:76, `repartirFrases(1)`) y no figura ni en SEDIENTAS
  // ni en APETITO. Se probo restarle una al cupo y el plan salio IDENTICO —0.44 sedientas y 0.41 heroes
  // por pieza a 20 s, 0.69 y 0.86 a 30 s, mismos numeros con y sin el cambio sobre 180 guiones—, asi
  // que en las duraciones que se usan el cupo no es la restriccion que ata: ata el presupuesto de
  // beats. Un arreglo que no mueve la medicion no se deja puesto.
  const nFr = frasesRepartibles(d).length
  // CUANTAS ENTRAN SALE DEL APETITO DE CADA UNA, NO DE UN ESCALON.
  //
  // Cada sedienta bebe una cantidad distinta del mismo pozo: partida 2, tipografia 3, lista 3, rafaga 3
  // y marquesina 4. El cupo era un escalon plano sobre el total de frases (1 / 2 / 3), y un escalon
  // trata igual a la que pide 2 y a la que pide 4: con ocho frases dejaba entrar DOS —digamos partida y
  // lista, cinco frases— y sobraban tres sin usar, suficientes para una tercera. Al reves nunca fallaba
  // por exceso, fallaba por desperdicio.
  //
  // Ahora se llena hasta donde alcance: se van sumando apetitos y entra la siguiente solo si el pozo la
  // banca entera. Con las cuatro o cinco frases que da una landing real el resultado es el mismo que
  // antes —una o dos escenas—, y eso NO es un defecto del reparto: es que la pagina no dio mas texto.
  // Subir el cupo ahi seria hacer que dos escenas se peleen las mismas frases, que es exactamente el
  // defecto que este bloque existe para evitar.
  // EL 4 DE `marquesina` NO ES UN ERROR AUNQUE TOME 3, y esto se midio antes de 'corregirlo'. Bajarlo a
  // su consumo real la deja entrar mas seguido, y cada vez que entra se lleva tres frases de un pozo
  // que en una landing tiene cuatro: la repeticion entre escenas SUBIO de 12.4% a 18.1% sobre 105
  // piezas. La frase de mas que reservaba funcionaba como margen. Se deja en 4 a proposito.
  const APETITO = { partida: 2, tipografia: 3, lista: 3, rafaga: 3, marquesina: 4 }
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
    let pozo = nFr
    for (let i = 0; i < califican.length; i++) {
      const id = califican[(desde + i) % califican.length]
      const pide = APETITO[id] || 3
      // La primera entra aunque el pozo quede corto: una pagina con dos frases igual merece su escena
      // de texto, servida con lo que hay. A partir de la segunda se exige que el pozo la banque entera.
      if (sobreviven.size && pide > pozo) continue
      sobreviven.add(id)
      pozo -= pide
    }
  }
  const medio = orden.filter(puede).filter(id => !SEDIENTAS.includes(id) || sobreviven.has(id))

  // `fija` GARANTIZA UNA ESCENA CUANDO EL USUARIO LA PIDIO, y esto arregla un reclamo directo: "los
  // heros no pude usarlos".
  //
  // `--hero mosaico` ponia el hero en el spec y nada mas. Que la escena `hero` ENTRARA al plan seguia
  // siendo un sorteo, asi que pedir un hero y no verlo era el resultado normal, no un caso raro — y el
  // video salia valido, sin un solo error, mostrando otra cosa. Documentado en HEROES-AUDIT como una
  // trampa de la auditoria; visto por el usuario como "no los puedo usar".
  //
  // El arreglo es de una linea porque `llenar` recorre la lista EN ORDEN y se saltea lo que no entra:
  // poniendola primera, la escena pedida entra siempre que quepa en el presupuesto. No se fuerza a la
  // brava —si no cabe en la duracion pedida no entra, y eso hay que decirlo, no disimularlo— pero deja
  // de competir por azar contra las otras diecinueve.
  //
  // Se aplica a los DOS llenados (el del orden y el de mayor-primero) porque los dos leen `medio`.
  if (fija && puede(fija)) {
    const resto = medio.filter(id => id !== fija)
    medio.length = 0
    medio.push(fija, ...resto)
  }

  // EL GANCHO ES FIJO Y VA ANTES DE LA MARCA. Es la unica escena que rompe "la apertura va primera", y
  // la razon no es estetica: estos videos se ven en un feed, donde nadie decide seguir mirando porque
  // le mostraron un logo. Decide en los primeros dos segundos y decide sobre si le prometieron algo.
  // La regla vieja sigue valiendo, con una palabra mas: la apertura va primera ENTRE LAS ESCENAS DE
  // MARCA. Adelante solo puede ir una promesa, y solo si la pagina la escribio.
  // LA APERTURA DEJA DE SER OBLIGATORIA, Y ES EL CAMBIO QUE MAS SE VE DE TODO EL GUION.
  //
  // Medido sobre 240 guiones: `gancho`, `apertura` y `cierre` salian en el 100% de las piezas. Son
  // casi la mitad de un video de siete escenas, o sea que todas las piezas compartian la mitad del
  // esqueleto y en el mismo orden. Ninguna cantidad de fondos, marcos o tipografias nuevas arregla eso
  // — Thiago, despues de tres tandas de variedad: "los videos son SIEMPRE LO MISMO".
  //
  // `gancho` y `cierre` se quedan fijos y no es simetria: el gancho es lo unico que decide si alguien
  // sigue mirando en un feed, y el cierre es el pedido — una pieza sin CTA no sirve para nada. La
  // apertura, en cambio, es la escena de MARCA, y la marca ya la dicen `sello`, `destello` y el propio
  // cierre. Es la unica de las tres que se puede sacar sin perder una funcion.
  //
  // Se saca UNA DE CADA TRES por semilla, y solo si el medio trae otra escena que nombre a la marca:
  // una pieza que nunca dice de quien es no es una pieza de marca, es un fondo de pantalla animado.
  // Como la decision se toma antes de repartir el presupuesto, los beats que libera se los queda el
  // medio — o sea que sacarla no acorta la pieza, la llena con otra cosa.
  // QUIEN ABRE: `apertura` o `bandera`, por semilla. Las dos hacen el mismo trabajo —decir de quien es
  // la pieza— y componen al reves: la apertura es un panel de instrumentos (marco, rotulo, contadores,
  // HUD) y la bandera es un campo de color a sangre con el nombre calado y nada mas. Hacerla opcional
  // bajo la apertura del 100% al 74%, pero ese 74% seguia siendo la misma imagen; con dos, el unico
  // cuadro que todo video tenia garantizado queda partido en dos.
  const abre = (puede('bandera') && rndFijas() < 0.5) ? 'bandera' : 'apertura'
  const fijas = ['gancho', abre, 'cierre'].filter(puede)
  // Y SOLO SI HAY GANCHO. Sin apertura y sin gancho la pieza arranca por una escena del medio: la
  // compuerta E-GUION-MARCO lo caza —"empieza con lista y termina con cierre"— y tiene razon, un reel
  // que abre por una lista no abrio, empezo a la mitad. El gancho es el unico que puede reemplazar a la
  // apertura como entrada porque es el unico que tambien esta compuesto para ser el primer cuadro.
  const sinApertura = fijas.includes(abre) && fijas.includes('gancho') && rndFijas() < 0.34
  const beatsFijos = fijas.reduce((n, id) => n + (id === abre && sinApertura ? 0 : beatsDe(id)), 0)
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

  // SE SACA LA QUE PERDIO LA TIRA Y NO TIENE RESPALDO. Va ACA, despues del reparto por familia y ANTES
  // del relleno, y ese orden importa: al liberar sus beats el relleno los vuelve a usar, asi que en vez
  // de una pieza mas corta con una escena muda entra otra escena que si tiene algo que mostrar. Que es
  // exactamente lo que pidio Thiago: "si no existe otra imagen VALIDA, descartar la escena y
  // reemplazarla por otra escena, con informacion VALIDA y que aporte al video".
  //
  // El filtro por REQUISITOS no puede hacer esto solo: corre ANTES de saber que escenas entraron, y la
  // condicion de `mesa` no depende de la pagina sino de con quien le toco compartir la pieza.
  if (plan.includes(DUENO.tira)) {
    for (const [id, tieneRespaldo] of Object.entries(RESPALDO_SIN_TIRA)) {
      const i = plan.indexOf(id)
      if (i >= 0 && !tieneRespaldo(d)) { plan.splice(i, 1); usados -= beatsDe(id) }
    }
  }

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
  // La marca tiene que quedar dicha en algun lado. `sello` y `destello` la nombran; si ninguna de las
  // dos entro al medio, la apertura se queda aunque la semilla haya pedido sacarla.
  const otraDeMarca = plan.some(id => id === 'sello' || id === 'destello')
  const ini = (fijas.includes(abre) && (!sinApertura || !otraDeMarca)) ? [abre] : []
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
