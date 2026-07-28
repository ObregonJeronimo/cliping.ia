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
  // La columna es un feed de recortes reales. Con menos de dos piezas no es una columna, es una foto.
  columna: (d) => (d.elementos || []).length >= 2,
  // La cita necesita que ALGUIEN HAYA HABLADO. Es el unico requisito que no se puede sustituir con
  // otro material: sin testimonio no hay cita, y una cita fabricada es la mentira mas cara del motor.
  // Basta uno — la escena cita a UNA persona, no arma un muro de opiniones.
  cita: (d) => (d.testimonios || []).some(t => t && t.texto),
  // Una lista necesita TRES cosas que enumerar. Con dos es un par, y un par numerado se lee como un
  // error de conteo. Solo cuentan las frases de UNA linea: las de dos renglones son titulares (el
  // claim viene partido asi), y numerar un titular lo degrada a viñeta ademas de romper la grilla.
  lista: (d) => (d.frases || []).filter(f => f && !/\n/.test(String(f))).length >= 3,
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
const ORDENES = [
  ['sello', 'hero', 'tipografia', 'partida', 'rafaga', 'lista', 'titular', 'pantalla', 'tarjetas', 'contraste', 'cita', 'destello', 'columna', 'toro'],
  ['pantalla', 'titular', 'tipografia', 'partida', 'lista', 'hero', 'rafaga', 'tarjetas', 'contraste', 'cita', 'columna', 'destello', 'sello', 'toro'],
  ['tarjetas', 'contraste', 'cita', 'sello', 'tipografia', 'partida', 'lista', 'hero', 'titular', 'rafaga', 'columna', 'destello', 'pantalla', 'toro'],
  ['tipografia', 'partida', 'lista', 'titular', 'pantalla', 'tarjetas', 'contraste', 'rafaga', 'hero', 'cita', 'columna', 'sello', 'toro', 'destello'],
]

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

  const orden = ORDENES[Math.floor(rnd() * ORDENES.length) % ORDENES.length]
  const medio = orden.filter(puede)

  const fijas = ['apertura', 'cierre'].filter(puede)
  const beatsFijos = fijas.reduce((n, id) => n + beatsDe(id), 0)
  const objetivo = dur ? Math.round(dur / beatSeg) : Infinity
  // Un beat de tolerancia. Sin ella, pidiendo 15 s salian 13.5: la ultima escena que entraba se
  // pasaba por medio beat y se descartaba entera, dejando un segundo y medio de nada. Pasarse un beat
  // (medio segundo) es invisible; quedarse corto un 10% se nota.
  const disponibles = objetivo === Infinity ? Infinity : objetivo - beatsFijos + 1

  const plan = []
  let usados = 0
  for (const id of medio) {
    const c = beatsDe(id)
    if (usados + c > disponibles) continue           // no entra: se saltea y se sigue probando
    plan.push(id); usados += c
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
      const huecos = []
      for (let i = 0; i <= plan.length; i++) {
        if (plan[i - 1] !== relleno && plan[i] !== relleno) huecos.push(i)
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
  return [...ini, ...plan, ...fin]
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
