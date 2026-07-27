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
  // Cuatro entradas tipográficas es lo que su composición reparte. Con menos quedan slots vacíos, que
  // es de lo que se trataba todo esto.
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
const ORDENES = [
  ['hero', 'tipografia', 'rafaga', 'pantalla', 'tarjetas', 'destello', 'columna', 'toro'],
  ['pantalla', 'tipografia', 'hero', 'rafaga', 'tarjetas', 'columna', 'destello', 'toro'],
  ['tarjetas', 'tipografia', 'hero', 'rafaga', 'columna', 'destello', 'pantalla', 'toro'],
  ['tipografia', 'pantalla', 'tarjetas', 'rafaga', 'hero', 'columna', 'toro', 'destello'],
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
  if (objetivo !== Infinity && puede('hero')) {
    const c = beatsDe('hero')
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
        if (plan[i - 1] !== 'hero' && plan[i] !== 'hero') huecos.push(i)
      }
      if (!huecos.length) break
      plan.splice(huecos[Math.floor(rnd() * huecos.length) % huecos.length], 0, 'hero')
      usados += c; vueltas++
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
