// ANTHEM · kit — el vocabulario compartido de la pieza de referencia.
//
// QUE ES ESTA PIEZA
// Un reel de motion graphics hecho A MANO, con el vocabulario que se usa hoy, para tener un OBJETIVO
// MEDIBLE en vez de una opinión. El motor generativo (src/director + render3d) produce piezas limpias
// y correctas — y aburridas. Esto existe para poner sobre la mesa qué hay que alcanzar: se mide con
// las mismas métricas que el video generado y la diferencia deja de ser "no me gusta" y pasa a ser un
// número.
//
// LAS SIETE COSAS QUE HACEN QUE UNA PIEZA SE LEA COMO AFTER EFFECTS
//   1. RITMO. Los cortes caen sobre una grilla de beats, no cada "2.3 segundos". 120 BPM = 0.5 s.
//   2. NADA DESCANSA. Siempre hay algo moviéndose; el reposo total lee como una diapositiva.
//   3. OVERSHOOT. Lo que llega se pasa y vuelve. Una interpolación que sólo desacelera se lee a máquina.
//   4. STAGGER. Los elementos nunca llegan juntos: 40–80 ms de diferencia y el ojo lee intención.
//   5. REVELADO POR MÁSCARA, no por opacidad. Un fundido es la transición por defecto de quien no eligió.
//   6. EL CUADRO ESTÁ LLENO. Fondo con textura + medio + tipografía a varias escalas.
//   7. TRATAMIENTO. Bloom sobre el acento, grano, aberración, viñeta y desenfoque de movimiento.

import * as THREE from 'three'

// ---------------------------------------------------------------- ritmo
// Todo el tiempo de la pieza se expresa en BEATS y se convierte acá. Es la diferencia entre un video
// que "va" y uno que arrastra: los cortes caen donde el ojo ya los espera.
// Todo lo que define la PERSONALIDAD de la pieza vive en un AIRE y entra por `configurar()`. Se
// exporta con `let` a proposito: los modulos ES exportan BINDINGS VIVOS, asi que reasignar aca cambia
// el valor que ven las seis escenas sin que ninguna tenga que enterarse. Eso es lo que permite que un
// asador, un estudio juridico y una marca de zapatillas usen las MISMAS escenas y salgan tres piezas
// que no se parecen en nada.
export let BPM = 124
export let BEAT = 60 / BPM
export const b = n => n * BEAT                     // lee el BEAT vigente, no una copia

// ---------------------------------------------------------------- cuanto se mueve la camara
// CUANTA CAMARA TIENE ESTE AIRE. Los once aires declaran `camara: { dolly, orbita }` desde que existen
// —de 0.4 a 1.55 en dolly, de 0.35 a 1.3 en orbita, o sea casi cuatro veces— y NADIE LO LEIA: main.js
// lo copiaba a `this.camaraE` (main.js:126) y ese campo no aparecia en ninguna otra linea del motor.
// Resultado: una pieza de lujo y una de deportivo movian la camara exactamente igual. Es el mismo
// defecto que el de las fuentes —declarado, medido, y nunca llega a la pantalla— y por eso las once
// personalidades se sentian mas parecidas de lo que dicen sus archivos.
//
//   dolly   cuanto AVANZA o RETROCEDE la camara. Es el eje de la intimidad: acercarse es enfatizar.
//   orbita  cuanto se corre de lado y cuanto se inclina. Es el eje de la inquietud.
//
// Se aplica al DELTA y nunca al reposo: `dolly(distBase, -0.35)` mueve el acercamiento, y el
// `tl.set(camera.position, { z: distBase })` con el que toda escena devuelve la camara queda intacto.
// Esa separacion es lo que hace que el cableado no pueda romper la regla de que la camara vuelve.
export let CAM = { dolly: 1, orbita: 1 }
export const dolly = (base, d) => base + d * CAM.dolly
export const orbita = v => v * CAM.orbita

// ---------------------------------------------------------------- deriva continua
// EL MOVIMIENTO LENTO QUE NO PARA: la escena respira, se acerca, se corre un pelo hacia el margen.
// No se escribe con tweens sobre las propiedades, y hay dos razones, las dos pagadas caro:
//
//   1. La trampa de `modifiers` sin la propiedad declarada en `vars` costo cuatro bugs en este repo.
//      Aca `t` SI esta en vars, asi que el tween corre de verdad, y las propiedades se escriben a mano.
//   2. UNA PROPIEDAD, UN SOLO ESCRITOR. Deriva, entrada y golpe queriendo la misma `position.x` como
//      tweens separados se pisan, y el resultado deja de ser determinista: `partida` salio con dos
//      escritores sobre `fondo.position.x` y el render no repetia dos veces igual.
//
// El molde estaba copiado en siete escenas y escondia un tercer filo: la llamada a mano ANTES del
// tween. Sin ella el cuadro 0 queda sin escribir —GSAP no dispara onUpdate en el instante cero— y la
// escena arranca con un salto de un frame. Es invisible leyendo y se ve mirando, que es la peor
// combinacion. Metido aca adentro, ya no hay como olvidarselo.
//
// `paso` recibe (u, t): u normalizado 0..1 para las escenas que respiran, t en segundos para las que
// cuentan beats (columna reparte por beat y necesita el crudo).
export function deriva(tl, dur, paso) {
  const reloj = { t: 0 }
  const correr = () => paso(reloj.t / dur, reloj.t)
  correr()
  tl.to(reloj, { t: dur, duration: dur, ease: 'none', onUpdate: correr }, 0)
  return reloj
}

// ---------------------------------------------------------------- escalera: mover TEXTO sin duplicarlo
// LA CUENTA QUE OBLIGA A ESTO, hecha con el obturador que este motor usa de verdad.
//
// `frameCon` promedia `muestras` capturas repartidas en `angulo/360` de un cuadro. Con muestras=2 y
// angulo=190 las dos caen separadas 0.5 * (190/360) / 30 = 8.8 ms. Eso convierte cualquier
// desplazamiento continuo en DOS COPIAS separadas por velocidad x 8.8 ms:
//
//   escena    px/s en pantalla   separacion   alto del texto   resultado
//   mesa            1820            16 px         30 px        ilegible, se lee dos veces
//   columna          635             5.6 px       22 px        fantasma sobre cada glifo
//
// Y NO SE ARREGLA CON MAS MUESTRAS. Con 4 muestras las copias pasan a estar a 4.4 ms una de otra: son
// cuatro copias mas juntas, o sea un borron parejo en vez de un eco doble. Mas lindo, y sigue ilegible:
// para que 1820 px/s no se note haria falta que la separacion total fuera de un pixel, o sea un angulo
// de obturador de 12 grados, que es lo mismo que no tener obturador. La conclusion es incomoda y es
// firme: NINGUN ajuste del obturador hace legible un texto que se mueve. Solo hace falta que se DETENGA.
//
// `escalera(u, n)` devuelve el mismo recorrido 0..1 de siempre, pero repartido en `n` tramos donde cada
// uno DESLIZA rapido y despues SE QUEDA QUIETO. En la quietud las dos submuestras caen en el mismo lugar
// y el texto sale nitido; en el desliz hay borron, que es exactamente lo que corresponde ver cuando algo
// se mueve rapido. El desliz usa media cosenoide, asi que arranca y termina con velocidad CERO: el cuadro
// de la transicion tampoco tiene un salto duro, que es lo que hacia que cuatro `tl.set` se leyeran como
// "cuatro imagenes y listo" en vez de como un scroll.
//
// `desliz` es la fraccion del tramo que dura el movimiento. 0.26 deja tres cuartos del tiempo para leer,
// y la velocidad de pico queda en pi/(2*0.26) = 6x la media — o sea el borron esta CONCENTRADO, que es
// lo que lo hace leer como un gesto y no como suciedad.
// EL DESLIZ DURA UN TIEMPO FIJO, NO UNA FRACCION DEL PASO. Esto se vio recien al renderizar OTRO aire, y
// es el tipo de defecto que un solo tempo no puede mostrar: con `desliz` como fraccion, la duracion del
// borron depende de cuantos peldaños haya y de a que bpm corra la pieza. En `mesa` a 100 bpm con dos
// peldaños el desliz duraba 0.47 s — CATORCE cuadros con el texto arrastrado, o sea un cuarto de la escena
// ilegible—, mientras que a 124 bpm con cuatro duraba 0.19 s y se leia como un gesto.
//
// Un tiron del pulgar dura lo que dura, no lo que dure el compas: 0.18 s son cinco o seis cuadros, los
// suficientes para que el ojo vea DIRECCION y los pocos suficientes para que el borron sea el gesto y no
// el estado. Convertido a fraccion del paso, es la misma curva con la duracion despegada del tempo.
export const deslizFijo = (dur, n, seg = 0.18) =>
  Math.max(0.04, Math.min(0.5, seg / (dur / Math.max(1, n))))

// CUANTOS PELDAÑOS, PERO EN LA GRILLA. Medido: pasar de deriva a peldaños subio los cortes de la pieza
// de 32 a 78 por minuto —bien dentro del rango de un reel moderno— y de paso BAJO "cortes sobre el beat"
// de 0.875 a 0.692, porque cinco tirones repartidos en seis beats caen en 1.2, 2.4, 3.6... o sea en
// ningun lado. Cada tiron es un evento tan audible como un corte: si no cae en el pulso, desafina.
//
// Solo se permiten cantidades que dividen la escena en medios beats exactos. Es la misma disciplina que
// ya tiene el montaje entre escenas, aplicada a los eventos de adentro.
export function pasosEnBeats(nBeats, deseado) {
  const ok = [2, 3, 4, 6, 8].filter(o => ((nBeats * 2) % o) === 0)
  if (!ok.length) return Math.max(2, Math.round(deseado))
  return ok.reduce((a, o) => (Math.abs(o - deseado) < Math.abs(a - deseado) ? o : a))
}

export const escalera = (u, n, desliz = 0.26) => {
  if (!(n > 1)) return Math.max(0, Math.min(1, u))
  const x = Math.max(0, Math.min(1, u)) * n
  const k = Math.min(n - 1, Math.floor(x))
  const f = x - k
  const s = f <= 0 ? 0 : f >= desliz ? 1 : (1 - Math.cos((f / desliz) * Math.PI)) / 2
  return (k + s) / n
}

// ---------------------------------------------------------------- cuanto se puede AMPLIAR un recorte
// El defecto medido: el logo de linear.app se captura con 176 px de ancho y `columna` lo mostraba
// ocupando 624 px del cuadro — TRES VECES Y MEDIA su resolucion. En el video es lo mas grande que se ve
// y sale con los bordes deshechos. `rafaga` ya tenia el tope escrito adentro; el resto de las escenas
// no, asi que vive aca y lo usan todas.
//
// 1.4x es el techo: por encima de eso el remuestreo se nota en el canto de un boton, que es la peor
// superficie posible —borde recto, alto contraste, texto adentro—. Un recorte que no llega al ancho que
// la escena le ofrece se muestra MAS CHICO, y esta bien: mejor nitido y menor que grande y sucio.
export const topeNitido = (img, W, mundoW, mag = 1.4) =>
  ((img && img.width ? img.width : W) * mag / (W || 1080)) * mundoW

// ---------------------------------------------------------------- donde de una PAGINA se puede leer algo
// EL DEFECTO QUE ESTO ARREGLA, VISTO EN EL VIDEO. El telefono scrolleaba desde el pixel 0 de la tira y
// recorria 1780 px. Medida la tira de linear.app por bandas de 130 px, eso es exactamente el peor camino
// posible: los primeros 390 px estan VACIOS (luminancia 8.9, cero detalle) y de 780 a 1820 vive la
// captura de la app de escritorio, que en un viewport movil entra a 720 px de ancho y deja su tipografia
// en 4 px. El aparato mostraba medio cuadro en blanco y despues una pantalla entera de ruido gris — "una
// imagen toda rota", textual.
//
// COMO SE DISTINGUE "TEXTO GRANDE" DE "RUIDO FINO" SIN LEER NADA. Se mide el detalle a DOS escalas: el
// fino a media resolucion y el grueso a 1/16. Un titular sobrevive el remuestreo a 1/16 (grueso alto); un
// panel de UI diminuta se promedia a gris plano (grueso bajo) aunque tenga muchisimo detalle fino. Una
// banda vacia no tiene ninguno de los dos. El puntaje grueso^2/(grueso+fino) ordena las tres cosas de
// una: en linear da 26.7 al titular, 8.2 a la fila de logos, 0.7 al panel de UI y 0 al vacio.
//
// Es la misma leccion que el punto 5 del informe de auditoria —la resolucion a la que se mide decide lo
// que se puede ver— usada al reves: comparar DOS resoluciones es lo que convierte "hay detalle" en "hay
// algo legible".
// El alto de banda y las dos escalas TIENEN que dividirse exacto, y esto costo un render entero. Con
// bandas de 130 px y escala 16 el limite de cada banda cae en la fila 8.125 del mapa reducido; indexar un
// Uint8ClampedArray con un indice fraccionario devuelve `undefined`, y de ahi salen NaN. La mitad de las
// bandas quedaba en NaN, el objetivo comparaba NaN contra NaN —siempre falso— y `ventanaLegible` devolvia
// su primer candidato: y0 = 0, o sea exactamente la ventana que existe para evitar. En el video se veia
// como si la medicion no estuviera puesta. 128 con escalas 2 y 8 da 64 y 16 filas: enteras las dos.
const B_ALTO = 128, ESC_FINA = 2, ESC_GRUESA = 8
const _cacheBandas = new WeakMap()
export function bandas(img, alto = B_ALTO) {
  if (!img || !img.width || !img.height) return null
  if (_cacheBandas.has(img)) return _cacheBandas.get(img)
  if (typeof document === 'undefined' || !document.createElement) return null
  let p = null
  try {
    const H = img.height, W = img.width
    // Dos remuestreos con el filtro del navegador, que es promediado por area: justo el que hace falta.
    const leer = (esc) => {
      const w = Math.max(2, Math.round(W / esc)), h = Math.max(2, Math.round(H / esc))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const x = c.getContext('2d', { willReadFrequently: true })
      x.imageSmoothingEnabled = true
      x.imageSmoothingQuality = 'high'
      x.drawImage(img, 0, 0, w, h)
      return { d: x.getImageData(0, 0, w, h).data, w, h }
    }
    const fina = leer(ESC_FINA), gruesa = leer(ESC_GRUESA)
    // Detalle horizontal medio de una franja de filas, a la escala que sea. Los limites se redondean a
    // ENTERO antes de indexar: ver la nota de arriba sobre los NaN.
    const det = (m, y0, y1) => {
      let s = 0, n = 0
      const a = Math.max(0, Math.min(m.h - 1, Math.floor(y0))), bb = Math.max(a + 1, Math.min(m.h, Math.ceil(y1)))
      for (let y = a; y < bb; y++) {
        const fila = y * m.w * 4
        for (let x = 0; x < m.w - 1; x++) {
          const i = fila + x * 4
          const l0 = 0.2126 * m.d[i] + 0.7152 * m.d[i + 1] + 0.0722 * m.d[i + 2]
          const l1 = 0.2126 * m.d[i + 4] + 0.7152 * m.d[i + 5] + 0.0722 * m.d[i + 6]
          s += Math.abs(l0 - l1); n++
        }
      }
      return n ? s / n : 0
    }
    // Color medio de la franja, a la escala gruesa. Sirve para saber de que color es el FONDO de la
// pagina sin adivinarlo: es el de la banda mas plana, o sea la que no tiene ni detalle fino ni grueso.
    const col = (m, y0, y1) => {
      let r = 0, g2 = 0, bl = 0, n = 0
      const a = Math.max(0, Math.min(m.h - 1, Math.floor(y0))), bb = Math.max(a + 1, Math.min(m.h, Math.ceil(y1)))
      for (let y = a; y < bb; y++) for (let x = 0; x < m.w; x++) {
        const i = (y * m.w + x) * 4
        r += m.d[i]; g2 += m.d[i + 1]; bl += m.d[i + 2]; n++
      }
      return n ? [r / n / 255, g2 / n / 255, bl / n / 255] : [0, 0, 0]
    }
    // Detalle POR FILA del mapa grueso, o sea con una resolucion de 8 px de pagina. Se guarda porque
    // sirve para lo que las bandas no pueden decir: DONDE hay un hueco entre dos renglones. Cortar una
    // ventana en el medio de una linea de texto se ve como una linea partida —"Tho product" en la mesa— y
    // el hueco esta siempre a menos de medio renglon de distancia.
    const porFila = new Float32Array(gruesa.h)
    for (let y = 0; y < gruesa.h; y++) porFila[y] = det(gruesa, y, y + 1)
    const filas = []
    for (let y = 0; y < H; y += alto) {
      const f = det(fina, y / ESC_FINA, (y + alto) / ESC_FINA)
      const gr = det(gruesa, y / ESC_GRUESA, (y + alto) / ESC_GRUESA)
      filas.push({
        y, fino: f, grueso: gr,
        score: (gr * gr) / (gr + f + 0.5),
        col: col(gruesa, y / ESC_GRUESA, (y + alto) / ESC_GRUESA),
      })
    }
    p = { alto, H, filas, porFila, escFila: ESC_GRUESA }
  } catch { p = null }        // canvas manchado o sin contexto 2d: la escena sigue con su ventana de siempre
  _cacheBandas.set(img, p)
  return p
}

// Elige DONDE empieza la ventana y CUANTO recorre, maximizando lo que se puede leer.
//
// El recorrido es una VARIABLE y no un dato, y eso es lo que hace que esto funcione con cualquier
// pagina: si el tramo legible es mas largo que la ventana, recorre entero; si la pagina pone su titular
// en 390 px y despues una captura de escritorio —que es el caso de linear.app— recorre poco y se queda
// donde se lee. El movimiento de la escena no depende de este scroll: el aparato flota, la camara hace
// dolly y el reflejo cruza. Preferir un recorrido largo sobre un cuadro ilegible es elegir el numero
// sobre la imagen, que es justo el error que el informe de auditoria documenta.
//
// El tramo FINAL pesa el 40%: es el que queda en pantalla hasta el corte, o sea el que el espectador
// realmente lee.
// El renglon mas cercano SIN TINTA, buscando hasta `radio` px de distancia. Es lo que evita que el borde
// de una ventana parta una linea de texto por la mitad.
function alHueco(p, y, radio) {
  if (!p || !p.porFila || !p.porFila.length) return y
  const E = p.escFila, R = Math.max(1, Math.round(radio / E))
  const c = Math.round(y / E)
  let mej = c, val = Infinity
  for (let k = Math.max(0, c - R); k <= Math.min(p.porFila.length - 1, c + R); k++) {
    // A igual detalle gana el mas cercano al pedido: el desempate por distancia es chico a proposito.
    const v = p.porFila[k] + Math.abs(k - c) * 0.02
    if (v < val) { val = v; mej = k }
  }
  return mej * E
}

// LOS PELDAÑOS DE UN SCROLL, CADA UNO EN UN HUECO ENTRE RENGLONES.
//
// Corregir solo el ARRANQUE de la ventana no alcanza y se vio en el render: `mesa` empieza en un hueco y
// a mitad de escena, en el segundo peldaño, el canto de la hoja cortaba "The product" por la mitad de las
// mayusculas. Cada posicion de reposo es un cuadro que el espectador MIRA QUIETO durante tres cuartos de
// beat, asi que cada una tiene que caer bien, no solo la primera.
//
// Devuelve n+1 posiciones absolutas en pixeles de pagina. El radio de correccion es medio peldaño: no
// puede reordenarlos ni cambiar el recorrido total de forma perceptible, solo elegir donde exactamente
// se detiene cada uno.
export function escalones(img, y0, recorrido, n) {
  const p = bandas(img)
  const out = []
  const paso = n > 0 ? recorrido / n : 0
  for (let k = 0; k <= n; k++) {
    const y = y0 + paso * k
    out.push(p ? Math.max(0, Math.min(p.H, alHueco(p, y, paso * 0.5))) : y)
  }
  return out
}

// La posicion dentro de esa lista de peldaños: desliza con media cosenoide y se queda quieta. Es
// `escalera` con destinos a medida en vez de repartidos parejo.
export function enEscalon(lista, u, desliz = 0.26) {
  const n = lista.length - 1
  if (n < 1) return lista[0] || 0
  const x = Math.max(0, Math.min(1, u)) * n
  const k = Math.min(n - 1, Math.floor(x))
  const f = x - k
  const s = f <= 0 ? 0 : f >= desliz ? 1 : (1 - Math.cos((f / desliz) * Math.PI)) / 2
  return lista[k] + (lista[k + 1] - lista[k]) * s
}

// El color de FONDO de la pagina, medido: la banda mas plana de todas. Un mockup que reserva la franja
// de la isla necesita rellenarla con algo, y el negro del aparato solo esta bien si la pagina es oscura.
export function fondoDe(img) {
  const p = bandas(img)
  if (!p || !p.filas.length) return null
  let mejor = p.filas[0]
  for (const f of p.filas) if (f.fino + f.grueso < mejor.fino + mejor.grueso) mejor = f
  return mejor.col
}

export function ventanaLegible(img, altoVentana, recorridoMax, recorridoMin = 0) {
  const p = bandas(img)
  const nada = { y0: 0, recorrido: recorridoMax }
  if (!p || !p.filas.length) return nada
  const B = p.alto, n = p.filas.length
  const nV = Math.max(1, Math.round(altoVentana / B))
  if (nV >= n) return nada
  // Un puntaje que no sea finito cuenta como CERO y no envenena la media. Sin esta guarda, un solo NaN
  // hacia que toda comparacion diera falso y la funcion devolviera su primer candidato en silencio — que
  // es y0 = 0, justo la ventana que existe para evitar. Un defecto que se disfraza de "no esta puesto".
  const medio = (i, j) => {
    let s = 0
    const a = Math.max(0, i), bb = Math.min(n, j)
    for (let k = a; k < bb; k++) s += Number.isFinite(p.filas[k].score) ? p.filas[k].score : 0
    return bb > a ? s / (bb - a) : 0
  }
  let mejor = null
  for (let i = 0; i + nV <= n; i++) {
    for (const frac of [1, 0.62, 0.38, 0.2, 0.08]) {
      const rec = recorridoMin + (recorridoMax - recorridoMin) * frac
      const nR = Math.round(rec / B)
      if (i + nV + nR > n) continue
      // 60% todo el recorrido, 40% el cuadro en el que queda. El bonus por recorrer es chico a proposito:
      // rompe empates a favor del movimiento y no compra un cuadro ilegible.
      const val = (0.6 * medio(i, i + nV + nR) + 0.4 * medio(i + nR, i + nR + nV)) * (0.94 + 0.06 * frac)
      if (!mejor || val > mejor.val) mejor = { y0: i * B, recorrido: rec, val }
    }
  }
  // El arranque se corre al hueco mas cercano, hasta media banda: no puede cambiar QUE tramo se eligio.
  if (mejor) mejor.y0 = Math.max(0, Math.min(p.H - altoVentana, alHueco(p, mejor.y0, B / 2)))
  return mejor || nada
}

// ---------------------------------------------------------------- paleta
// Base oscura + UN acento saturado + blanco. Es la fórmula del 90% de los reels de marca que
// funcionan: el negro deja respirar al bloom y el acento no compite con nada.
const _cacheTexto = new Map()

export let LOOK = {
  tinta: '#f2f4f8',
  bg: '#05060a',
  bg2: '#0b1020',
  acento: '#5b6cff',
  acento2: '#00e5c0',
  calido: '#ff5a3c',
}

// ---------------------------------------------------------------- GESTO
// La familia de curvas. Es la mitad de la personalidad de una pieza y casi nadie la mira: el MISMO
// movimiento con `back.out` se lee decidido, con `elastic.out` juguetón, con `power4.out` costoso y
// con `steps` artesanal. Las escenas piden un GESTO ("llega", "sale", "frena") y el aire decide con
// que curva se resuelve, asi que cambiar de aire cambia como se mueve todo sin tocar una escena.
//
// El aire por defecto devuelve exactamente las curvas con las que se compuso ANTHEM: cambiar de
// familia tiene que ser una decision, no un efecto secundario de haber refactorizado.
//
// GSAP SOLO CONOCE power0..power4 CON POTENCIA ENTERA, y no avisa cuando le pasas otra cosa: parsea
// `power2.4.in` a undefined y cae en silencio a su ease por defecto, que es power1.out. O sea que
// `acelera` —el verbo de IRSE RAPIDO— terminaba desacelerando. Pasaba en tres aires (tecnico,
// artesanal y deportivo) y en el primer movimiento de la pieza: la cortina de apertura.js:196. No lo
// veia nadie porque no hay error, ni excepcion, ni aviso por consola; el video simplemente se movia al
// reves de lo pedido. Por eso `pot` se exporta: la regla vive en UN lugar y los aires que retocan la
// potencia la piden en vez de volver a interpolar a mano.
export const pot = (n, dir) => `power${Math.max(0, Math.min(4, Math.round(n)))}.${dir}`

const GESTO_BASE = {
  llega: (n = 2.2) => `back.out(${n})`,             // entra y se pasa: lo que hace que algo "llegue"
  // `frena` ya trataba el desborde por arriba —n>=5 no existe como potencia y va a expo.out, la
  // frenada mas fuerte del vocabulario estandar—; lo que faltaba era el caso no entero.
  frena: (n = 2) => (n >= 5 ? 'expo.out' : pot(n, 'out')),
  acelera: (n = 2) => pot(n, 'in'),
  vaiven: (n = 0) => (n ? pot(n, 'inOut') : 'sine.inOut'),
}
export let E = GESTO_BASE

export let AIRE = null

// EL MOBILIARIO DEL CUADRO — lo que faltaba para que dos videos no se parezcan.
//
// Un aire declaraba paleta, tipografia, ritmo, gestos, camara y pelicula, y con eso dos piezas de
// rubros opuestos SEGUIAN VIENDOSE IGUAL: cambiaba el color y la letra, y el MUEBLE era el mismo —
// la misma grilla en fuga, los mismos corchetes de encuadre, los mismos rotulos tecnicos. Una
// panaderia recibia el HUD de una herramienta de ingenieria con otra tipografia.
//
// El mueble es la mitad de la identidad de una pieza y estaba horneado en las escenas. Ahora lo
// pide el aire, y la escena pregunta en vez de imponer.
//
//   fondo     'fuga'    la grilla en perspectiva de ANTHEM: espacio, tecnologia, velocidad
//             'puntos'  una reticula de puntos: papel, editorial, artesanal
//             'ondas'   curvas suaves que respiran: bienestar, gastronomia, cuidado
//             'rayas'   diagonales duras en movimiento: deporte, urgencia
//             'bloques' celdas grandes que se encienden en el beat: jugueton, ecommerce
//             'nada'    solo el degrade: lujo, arquitectura, todo lo que necesita AIRE
//   marco     QUE forma tiene el borde del cuadro. Ver MARCOS, abajo.
//   margen    [fx, fy] la fraccion del semieje donde compone el contenido. El rectangulo invisible.
//   hud       los rotulos chicos de formato y dominio. Dicen 'ficha tecnica'.
//
// El orden de PATRONES importa: es el indice que viaja al shader como uPatron.
// Los cuatro ultimos entran ANTES de 'nada' y no despues: el shader cierra con un `else` que atrapa
// todo lo que pase del ultimo umbral, asi que un patron agregado al final del arreglo saldria pintado
// como 'nada' — presente en la lista, invisible en pantalla, y sin una compuerta que lo dijera.
export const PATRONES = ['fuga', 'puntos', 'ondas', 'rayas', 'bloques', 'panal', 'contorno', 'circuito',
                         'arcos', 'terrazo', 'malla', 'topografia', 'destellos',
                         'craquelado', 'veta', 'escamas', 'haces', 'bruma', 'caustica', 'recuento', 'estelas', 'latido',
                         'nada']

// ---------------------------------------------------------------- el marco del cuadro
// `esquinas` ERA UN BOOLEANO, y esa es la razon de que todas las piezas se vieran iguales por el
// borde: cuando estaba prendido dibujaba SIEMPRE el mismo corchete de camara. No habia un tercer
// marco posible en todo el motor — o los brackets de ANTHEM, o nada.
//
// Las cinco familias no son cinco parametros del mismo dibujo: cada una compone el borde con un
// recurso distinto, y por eso se distinguen en un scroll.
//
//   'escuadras'    cuatro esquinas en L. PUNTOS en las cuatro esquinas. Dice camara, encuadre,
//                  capturado. Es lo que ANTHEM tiene hoy, y la linea de base: no se toca.
//   'reglas'       dos filetes horizontales, arriba y abajo, sin cerrar los lados. HORIZONTAL, y
//                  sobre todo ABIERTO: es la caja de una pagina impresa, no un recuadro.
//   'passepartout' cuatro bandas solidas que tapan el borde. MASA, no linea: enmarca por el vacio,
//                  como el pasepartu de un cuadro colgado. El unico que quita area util.
//   'ticks'        marcas cortas repartidas por el perimetro. RITMO: es la acotacion de un plano.
//   'rotulado'     una sola regla vertical con remate, de un lado. ASIMETRICO: el margen de un
//                  cuaderno editorial. Es el unico que rompe la simetria del cuadro.
//
// Ninguna dibuja un rectangulo continuo de acento a proposito: con el umbral de bloom de nocturno
// (0.58) una linea cerrada de acento FLORECE en un marco brillante, que es exactamente la queja.
// Por eso solo 'escuadras' —que son segmentos cortos— usa el acento; el resto nace en nivel().
// Ocho siluetas, y ninguna repite a otra: 'nada' (sin mueble), 'escuadras' (cuatro esquinas chicas,
// mira de instrumento), 'cantoneras' (DOS esquinas grandes en diagonal, el cuadro abierto), 'reglas'
// (dos barras horizontales), 'passepartout' (enmarca tapando), 'ticks' (acota los cuatro lados),
// 'escalimetro' (gradua UN canto), 'rotulado' (una vertical con remates, margen de cuaderno).
export const MARCOS = ['nada', 'escuadras', 'cantoneras', 'reglas', 'passepartout', 'ticks',
                       'escalimetro', 'rotulado']

// ---------------------------------------------------------------- como corta este aire
// EL MONTAJE ES DEL AIRE, y hasta ahora no lo era. main.js ya sabia repartir cinco gestos de corte y
// leer `AIRE.transiciones`, pero NINGUNO de los once aires lo declaraba: los once caian al reparto de
// ANTHEM. Una pieza de joyeria cortaba igual que una de deporte — el mismo defecto de siempre, un
// parametro que existe y nadie usa.
//
//   'corte'     seco, sin nada encima. Es la mayoria en casi todos los aires y esa es su gracia.
//   'flash'     dos frames de blanco. Acento duro; en un aire lento se lee como un error.
//   'barrido'   una banda de acento cruza en diagonal y tapa el salto. Elegante, cuesta medio beat.
//   'empuje'    el cuadro se corre en X y la entrante llega del otro lado. Lateral, de catalogo.
//   'empujeV'   lo mismo en Y. ES EL EJE QUE PIDE EL 9:16: en un cuadro de 1080x1920 el gesto nativo
//               es el vertical —asi se mira un feed—, y el motor solo tenia el horizontal.
// Nueve formas de cortar. 'iris' es la unica RADIAL —las otras ocho son rectas o de color— y
// 'tajo' la unica que parte el cuadro en dos mitades que se van para lados opuestos.
export const MONTAJES = ['corte', 'flash', 'barrido', 'empuje', 'empujeV', 'golpe', 'persiana',
                         'iris', 'tajo', 'atraviesa']

// El margen tambien es del aire. Era la razon MAS PROFUNDA de que todo se pareciera: el rectangulo
// invisible al que se alinea el contenido estaba escrito a mano en diez escenas, y las diez habian
// convergido a ojo al mismo lugar (rango medido: 0.30 unidades = 58 px en un cuadro de 1080). El
// default [0.87, 0.85] no es un numero nuevo: es EXACTAMENTE lo que apertura componia con literales
// —mundoW/2*0.87 = 2.446875 y mundoH/2*0.85 = 4.25—, asi que la linea de base no se mueve un pixel.
const MOBILIARIO_BASE = { fondo: 'fuga', marco: 'escuadras', hud: true, margen: [0.87, 0.85] }
export let MOB = MOBILIARIO_BASE

// marco(mundoW, mundoH, o) -> { g, piezas, X, Y } | null
//
// Devuelve null para 'nada', asi que la escena escribe `const m = marco(...)` y `if (m) g.add(m.g)`.
// `piezas` viene en orden de recorrido del perimetro para que la escena escalone la entrada SIN saber
// que forma tiene el marco: es lo que permite que las cinco familias entren con el gesto de su aire.
//
// Cada pieza trae en userData su posicion de reposo (`base`) y hacia donde queda AFUERA (`fuera`,
// unitario). Con eso una escena escribe "las piezas del marco salen y vuelven en el beat" una sola
// vez y funciona igual para cuatro esquinas, dos filetes o veintiocho ticks. cierre.js hacia eso a
// mano con los literales 2.52/4.52 repetidos dentro del tween.
//
// No toca ctx.rnd: un marco es una decision del aire, no un sorteo. El determinismo sale gratis.
export function marco(mundoW, mundoH, o = {}) {
  const tipo = o.tipo || MOB.marco || 'escuadras'
  if (tipo === 'nada' || !MARCOS.includes(tipo)) return null
  const m = o.margen || MOB.margen || [0.87, 0.85]
  const X = mundoW / 2 * m[0], Y = mundoH / 2 * m[1]
  const z = o.z === undefined ? -0.3 : o.z
  const peso = o.peso || 1                          // grosor y largo relativos: cierre compone mas pesado
  const g = new THREE.Group()
  // MARCA DE ORIGEN. La compuerta que caza mueble de borde horneado en las escenas necesita distinguir
  // "esto es perimetro que alguien dibujo por su cuenta" de "esto es el marco que el aire pidio". Sin
  // la marca tendria que adivinar por geometria, y acusaria en falso justo a la funcion correcta.
  g.userData.esMarco = true
  const piezas = []

  // Plano plano, sin sombreado ni tono: el borde no participa de la iluminacion de la escena. Sin
  // profundidad —ni escritura ni test— y con renderOrder fijo, que es como lo componian apertura y
  // cierre: el marco no se ordena contra la escena, se dibuja siempre en su capa.
  const placa = (w, h, color, k = 1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      color: hex(color).multiplyScalar(k), toneMapped: false, transparent: true,
      depthWrite: false, depthTest: false,
    }))
    m.renderOrder = o.orden === undefined ? 2 : o.orden
    return m
  }
  // registra una pieza con su reposo y su direccion de afuera
  const pieza = (obj, x, y, fx, fy) => {
    obj.position.set(x, y, z)
    obj.userData.base = { x, y }
    obj.userData.fuera = { x: fx, y: fy }
    g.add(obj); piezas.push(obj)
    return obj
  }

  if (tipo === 'escuadras') {
    // Geometria IDENTICA a la que apertura.js componia con literales: con margen [0.87,0.85] el brazo
    // horizontal cae en x = sx*(X - 0.15) y el vertical en y = sy*(Y - 0.15), que es lo de siempre.
    const col = o.color || LOOK.acento
    const br = o.brillo === undefined ? 1.6 : o.brillo
    const L = 0.30 * peso, GR = 0.024 * peso
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const e = new THREE.Group()
      const h = placa(L, GR, col, br); h.position.x = -sx * L / 2
      const v = placa(GR, L, col, br); v.position.y = -sy * L / 2
      e.add(h, v)
      pieza(e, sx * X, sy * Y, sx, sy)
    }
  } else if (tipo === 'reglas') {
    // Abierto a los lados A PROPOSITO. Un rectangulo cerrado es el recuadro del que hay que huir.
    const col = o.color || nivel(0.38)
    for (const sy of [1, -1]) pieza(placa(X * 2, 0.014 * peso, col), 0, sy * Y, 0, sy)
  } else if (tipo === 'passepartout') {
    // Enmarca TAPANDO, no dibujando. Las bandas van del borde real del mundo hasta el margen, asi que
    // cubren cualquier cosa que sangre — por eso una escena que sangra a proposito no pide esta.
    const col = o.color || nivel(0.07)
    const bx = mundoW / 2 - X, by = mundoH / 2 - Y
    for (const sy of [1, -1]) pieza(placa(mundoW, by, col), 0, sy * (mundoH / 2 - by / 2), 0, sy)
    for (const sx of [-1, 1]) pieza(placa(bx, mundoH, col), sx * (mundoW / 2 - bx / 2), 0, sx, 0)
  } else if (tipo === 'ticks') {
    // La acotacion de un plano. El recorrido va en sentido horario desde arriba-izquierda para que un
    // stagger sobre `piezas` se lea como que el cuadro se esta midiendo solo.
    const col = o.color || nivel(0.42)
    const NH = 5, NV = 9, LT = 0.11 * peso, GR = 0.014 * peso
    const fila = (n, f) => { for (let i = 0; i < n; i++) f(n === 1 ? 0.5 : i / (n - 1)) }
    fila(NH, t => pieza(placa(GR, LT, col), -X + t * X * 2, Y - LT / 2, 0, 1))
    fila(NV, t => pieza(placa(LT, GR, col), X - LT / 2, Y - t * Y * 2, 1, 0))
    fila(NH, t => pieza(placa(GR, LT, col), X - t * X * 2, -Y + LT / 2, 0, -1))
    fila(NV, t => pieza(placa(LT, GR, col), -X + LT / 2, -Y + t * Y * 2, -1, 0))
  } else if (tipo === 'cantoneras') {
    // DOS esquinas opuestas en vez de cuatro, y grandes. Las escuadras cierran el cuadro por los cuatro
    // lados: es la marca de mira de un instrumento, y es correcta para `tecnico`. Con dos en diagonal el
    // cuadro queda ABIERTO por las otras dos, la composicion gana una direccion —el ojo entra por una
    // cantonera y sale por la otra— y el mueble deja de leerse como interfaz. Es lo que le faltaba a los
    // aires editoriales, que hoy elegian entre un recuadro tecnico o nada.
    const col = o.color || nivel(0.44)
    const L = 0.72 * peso, GR = 0.030 * peso
    // Arriba-izquierda y abajo-derecha. La diagonal la fija `o.diag`: con 1 se invierte, y eso le da a
    // dos piezas del mismo aire dos composiciones distintas sin cambiar de familia.
    const d = o.diag === 1 ? -1 : 1
    for (const [sx, sy] of [[-d, 1], [d, -1]]) {
      const e = new THREE.Group()
      const h = placa(L, GR, col); h.position.x = -sx * L / 2
      const v = placa(GR, L, col); v.position.y = -sy * L / 2
      e.add(h, v)
      pieza(e, sx * X, sy * Y, sx, sy)
    }
  } else if (tipo === 'escalimetro') {
    // Una graduacion en UN solo canto vertical, con marcas largas cada cinco. `ticks` acota los cuatro
    // lados y por eso se lee como plano tecnico; esta acota uno y se lee como REGLA apoyada al costado
    // del cuadro. Ademas llena el canto, que en un formato vertical es la zona que siempre queda muerta,
    // sin cerrar el encuadre por arriba y por abajo.
    const col = o.color || nivel(0.40)
    const lado = o.lado === 1 ? 1 : -1
    const N = 21, GR = 0.011 * peso
    for (let i = 0; i < N; i++) {
      // Cada cinco marcas una larga: sin la jerarquia son veintiuna rayas iguales y el ojo no cuenta,
      // solo ve textura.
      const larga = i % 5 === 0
      const LT = (larga ? 0.16 : 0.075) * peso
      pieza(placa(LT, GR, col, larga ? 1.35 : 1),
            lado * (X - LT / 2), Y - (i / (N - 1)) * Y * 2, lado, 0)
    }
  } else if (tipo === 'rotulado') {
    // Una sola vertical, de un lado, con remate arriba y abajo. Rompe la simetria del cuadro: es el
    // margen de un cuaderno, no un marco. `lado` -1 izquierda (default) o 1 derecha.
    const col = o.color || nivel(0.40)
    const lado = o.lado === 1 ? 1 : -1
    const alto = Y * 1.72
    pieza(placa(0.012 * peso, alto, col), lado * X, 0, lado, 0)
    for (const sy of [1, -1]) pieza(placa(0.10, 0.012 * peso, col), lado * (X - 0.049), sy * (alto / 2), lado, 0)
  }

  // `tipo` viaja de vuelta porque hay gestos que solo tienen sentido en algunas familias: un parpadeo
  // sobre las escuadras o los ticks se lee como instrumento, y sobre un pasepartu es un fogonazo.
  return { g, piezas, X, Y, tipo }
}
// ¿El mundo es claro? Lo decide el ADN de la página, no el aire. Las escenas lo consultan para elegir
// entre sumar luz y restarla: la misma escena que sobre negro dibuja un halo, sobre blanco tiene que
// dibujar una sombra, o desaparece.
export let CLARO = false

// configurar(aire) — se llama UNA vez antes de construir la pieza. Todo lo que no venga en el aire
// se queda con el valor de ANTHEM.
export function configurar(aire, semilla = null) {
  if (!aire) return
  AIRE = aire
  CLARO = !!aire.claro
  MOB = { ...MOBILIARIO_BASE, ...(aire.mobiliario || {}) }
  // EL FONDO PUEDE VARIAR DENTRO DEL AIRE. `fondo` es el canonico —el que define la personalidad— y
  // `fondos` es la lista de los que tambien le quedan. Sin semilla se usa el canonico y nada cambia,
  // que es lo que necesitan las compuertas; con semilla, dos piezas del mismo aire dejan de tener la
  // misma trama detras. Es la misma leccion que la familia de aires: un patron nuevo agregado a un
  // selector que elige siempre lo mismo nace dormido, y en este repo eso ya paso demasiadas veces.
  // La SAL es distinta para cada cosa que se elige. Con una sola cuenta, el fondo y el marco caerian
  // siempre en el mismo indice de sus listas y variarian juntos: dos piezas tendrian dos combinaciones
  // en vez de las nueve que hay. Es media variedad disfrazada de variedad.
  const elegir = (lista, sal) => {
    if (!lista || !lista.length || semilla == null || !Number.isFinite(Number(semilla))) return null
    let x = ((Number(semilla) >>> 0) ^ sal) >>> 0 || 1
    x ^= x << 13; x >>>= 0
    x ^= x >> 17
    x ^= x << 5; x >>>= 0
    return lista[(x >>> 0) % lista.length]
  }
  const mo = aire.mobiliario || {}
  const fondo = elegir(mo.fondos, 0x9e37)
  if (fondo) MOB.fondo = fondo
  // El MARCO es el mueble mas persistente de la pieza: esta en casi todas las escenas y es lo primero
  // que hace que dos videos se vean "iguales" aunque cambie todo lo demas. Que varie dentro del aire es
  // lo que mas se nota por linea cambiada de todo el sistema de variedad.
  const marco = elegir(mo.marcos, 0x85eb)
  if (marco) MOB.marco = marco
  CAM = { dolly: 1, orbita: 1, ...(aire.camara || {}) }
  if (aire.bpm) { BPM = aire.bpm; BEAT = 60 / BPM }
  if (aire.paleta) LOOK = { ...LOOK, ...aire.paleta }
  if (aire.gesto) E = { ...GESTO_BASE, ...aire.gesto }
  _cacheTexto.clear()                                // el cache guarda color y fuente: hay que soltarlo
}

// El cache de texturas guarda color, fuente y tracking dentro de su clave, asi que sobrevive a un
// cambio de DATOS pero no deberia sobrevivir a uno de AIRE — `configurar` ya lo suelta. Se exporta
// para que un arnes pueda forzar el rasterizado y auditar QUE se dibuja: con el cache caliente, un
// glifo que ya se rasterizo no vuelve a pasar por fillText y parece que la escena no lo dibujo.
export function limpiarCache() { _cacheTexto.clear() }

// Las escenas piden fuentes por nombre concreto ('Anton', 'DMSans'). El aire las REMAPEA por rol:
// asi una escena escrita con una grotesca de display sale en serif editorial o en condensada
// deportiva sin que la escena sepa que existe el concepto de aire.
const ROL_DISPLAY = new Set(['Anton', 'ArchivoBlack', 'BigShoulders', 'Bricolage'])
function resolverFuente(f) {
  const fu = AIRE && AIRE.fuentes
  if (!fu) return f
  if (ROL_DISPLAY.has(f)) return fu.display || f
  return fu.apoyo || f
}

export const hex = h => new THREE.Color(h)

// ---------------------------------------------------------------- azar con semilla
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------- tipografía a textura
// El texto se dibuja en un canvas 2D y entra como textura. En una pieza así la tipografía es el
// material principal, no un subtítulo: se supermuestrea x3 porque la cámara la acerca y un glifo
// pixelado delata todo el truco.
export function texto(str, opciones = {}) {
  const o = {
    fuente: 'Anton', peso: 400, size: 200, color: LOOK.tinta, tracking: 0,
    upper: true, linea: 0.92, alineado: 'center', ...opciones,
  }
  o.fuente = resolverFuente(o.fuente)
  const clave = JSON.stringify([str, o])
  if (_cacheTexto.has(clave)) return _cacheTexto.get(clave)

  const SS = 3
  const lineas = String(str).split('\n').map(l => (o.upper ? l.toUpperCase() : l))
  const med = document.createElement('canvas').getContext('2d')
  med.font = `${o.peso} ${o.size * SS}px "${o.fuente}"`
  med.letterSpacing = `${o.tracking * o.size * SS}px`
  const anchos = lineas.map(l => med.measureText(l).width)
  const w = Math.ceil(Math.max(...anchos)) + o.size * SS * 0.3
  const h = Math.ceil(o.size * SS * o.linea * lineas.length + o.size * SS * 0.42)

  const cv = document.createElement('canvas')
  cv.width = Math.max(2, w); cv.height = Math.max(2, h)
  const c = cv.getContext('2d')
  c.font = med.font
  c.letterSpacing = med.letterSpacing
  c.textBaseline = 'middle'
  c.fillStyle = o.color
  const y0 = h / 2 - (lineas.length - 1) * o.size * SS * o.linea / 2
  for (let i = 0; i < lineas.length; i++) {
    const x = o.alineado === 'left' ? o.size * SS * 0.15
      : o.alineado === 'right' ? w - anchos[i] - o.size * SS * 0.15
        : (w - anchos[i]) / 2
    c.fillText(lineas[i], x, y0 + i * o.size * SS * o.linea)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  const r = { tex, ar: cv.width / cv.height, w: cv.width, h: cv.height }
  _cacheTexto.set(clave, r)
  return r
}

// Un plano con esa textura, dimensionado por ALTO en unidades de mundo (el alto es lo que uno
// controla al componer tipografía; el ancho sale de la proporción).
export function planoTexto(str, altoMundo, opciones = {}) {
  const t = texto(str, opciones)
  const mat = new THREE.MeshBasicMaterial({
    map: t.tex, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(altoMundo * t.ar, altoMundo), mat)
  m.userData.ar = t.ar
  return m
}

// ---------------------------------------------------------------- revelado por MÁSCARA
// Una barra que descubre en vez de un fundido. El shader recorta por UV, así que el texto aparece
// "escrito" y no "encendido" — y esa es la diferencia entre un reel y una presentación.
//
// EL REVELADO NO TERMINA EN 1, TERMINA EN 1 + uSuave. El shader hace smoothstep(uProg, uProg-uSuave, e):
// con uProg en 1 la banda blanda queda PISANDO el borde derecho y la ultima letra sale lavada. Hay que
// pasarse el ancho de la banda para que el degrade salga del plano.
//
// Ese numero estaba escrito a mano —`1.06`, `1 + 0.06`, `1.06 // 1 + uSuave`— en seis escenas, cada una
// con su propio comentario reexplicando la misma trampa. El problema no era la repeticion: era que el
// numero DEPENDE de `SUAVE` y nadie los ataba. Cambiar el 0.06 de aca abajo dejaba las seis mal, sin
// romper ninguna compuerta y sin que nada lo dijera: la ultima letra de seis escenas se lavaba y habia
// que volver a descubrirlo mirando. Ahora se deriva, y quien tenga un uSuave propio pide finMascara(suyo)
// —pantalla.js usa 0.11 porque su barrido es mucho mas ancho—.
export const SUAVE = 0.06
export const finMascara = (suave = SUAVE) => 1 + suave

// ---------------------------------------------------------------- encaje de texto
// MEDIR NO ES OPCIONAL. Una escena que fija el alto de su tipografia y confia en que va a entrar
// funciona con la pagina que tenia enfrente el dia que se escribio y se sale del cuadro con la
// siguiente: `cita` se fue del encuadre por adivinar 26 caracteres por linea en vez de medir. Se mide
// con texto(), que devuelve el `ar` REAL de la textura, y se baja el alto hasta que la linea mas
// ancha entre en `anchoUtil`.
//
// Nunca agranda. Si ya entra se queda en `altoBase`, porque un texto corto no tiene por que ocupar
// todo el ancho: el alto es el que fija la jerarquia entre un titular y un pie, y estirarlo la borra.
//
// `arMax` es el aspecto de la linea mas ancha —Math.max(...texs.map(t => t.ar))— o el `ar` propio si
// hay una sola. Estaba escrito en cinco escenas con dos grafias, una de ellas dando el rodeo de un
// `anchoMax` intermedio que multiplicaba y dividia por `altoBase` para llegar exactamente aca.
export const encaje = (altoBase, arMax, anchoUtil) =>
  altoBase * arMax > anchoUtil ? anchoUtil / arMax : altoBase

export function materialMascara(map, color = null) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      map: { value: map }, uProg: { value: 0 }, uDir: { value: 0 },
      // uTinte SIEMPRE es un Color, nunca null: three sube los uniforms sin preguntar y un vec3 en
      // null revienta el shader con un error que no menciona el uniform. Cuando no hay tinte se
      // manda negro y `uUsaTinte` en 0 lo ignora.
      uSuave: { value: SUAVE }, uTinte: { value: hex(color || '#000000') }, uUsaTinte: { value: color ? 1 : 0 },
      // LA MATRIZ DE TEXTURA, A MANO. Los materiales que trae three aplican `repeat` y `offset` en su
      // vertex shader; un shader propio NO los aplica salvo que uno los escriba, y este no los escribia.
      // Costo una escena entera: `pantalla` le pedia a la tira `repeat.y = 0.159` para mostrar el 16% de
      // la pagina, y como el shader muestreaba vUv pelado, las siete bandas se repartian los 8192 px
      // ENTEROS — la pagina salia aplastada 6.3 veces a lo alto, con las letras anchas y chatas, que es
      // el defecto que su dueño ve antes que ninguno. Y peor: `offset.y`, que la escena reescribia en
      // cada cuadro para hacer el scroll, tampoco llegaba. El scroll, el indicador, las marcas y el
      // desfase animaban un valor que nadie leia. La escena cuya razon de ser es DESPLAZAR la pagina
      // nunca desplazo nada, y no habia como notarlo: el cuadro se ve, no se ve que no se mueve.
      // Arranca en identidad, asi que los otros veinte usuarios de este material —todos texturas de
      // texto, que nunca tocan repeat ni offset— no cambian un pixel.
      // Se apunta a los Vector2 PROPIOS de la textura, no a copias. three sube el valor que encuentra
      // en el uniform en cada render, asi que compartir el objeto hace que un `tex.offset.y = x` en
      // medio de la animacion llegue solo, sin gancho, sin sincronizar a mano y sin un orden que haya
      // que recordar. Es tambien lo unico que se mantiene determinista: no hay un paso que pueda
      // quedar sin correr. (Si alguien REEMPLAZA la textura del material en caliente tiene que
      // reapuntar estos dos; ninguna escena lo hace y por eso no se paga esa complejidad.)
      uRep: { value: map ? map.repeat : new THREE.Vector2(1, 1) },
      uOff: { value: map ? map.offset : new THREE.Vector2(0, 0) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D map; uniform float uProg, uDir, uSuave, uUsaTinte; uniform vec3 uTinte;
      uniform vec2 uRep, uOff;
      varying vec2 vUv;
      void main(){
        // La IMAGEN se muestrea por la uv transformada; la MASCARA sigue midiendo sobre la uv cruda,
        // porque el barrido es un gesto sobre el plano y no sobre el contenido. Si el barrido usara la
        // uv transformada, una banda que muestra el 2% de la textura barreria en el 2% del tiempo.
        vec4 t = texture2D(map, vUv * uRep + uOff);
        // uDir: 0 izq->der, 1 der->izq, 2 abajo->arriba, 3 arriba->abajo
        float e = uDir < 0.5 ? vUv.x : uDir < 1.5 ? 1.0 - vUv.x : uDir < 2.5 ? vUv.y : 1.0 - vUv.y;
        float m = smoothstep(uProg, uProg - uSuave, e);
        if (uUsaTinte > 0.5) t.rgb = uTinte;
        gl_FragColor = vec4(t.rgb, t.a * m);
        if (gl_FragColor.a < 0.003) discard;
      }`,
  })
}

// ---------------------------------------------------------------- fondo vivo
// Grilla en perspectiva + ruido + degradé. Existe para que el cuadro NUNCA esté vacío: un fondo plano
// convierte cualquier pieza en una diapositiva, por buena que sea la tipografía de adelante.
export function fondoVivo(mundoW, mundoH) {
  const mat = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uT: { value: 0 }, uA: { value: hex(LOOK.bg) }, uB: { value: hex(LOOK.bg2) },
      uAcento: { value: hex(LOOK.acento) }, uAcento2: { value: hex(LOOK.acento2) },
      uGrilla: { value: 0.55 }, uPulso: { value: 0 },
      // El beat, para que el fondo pueda caer en la grilla del montaje. Sin esto lo unico que podia
      // hacer una masa de fondo era DERIVAR, y lo suave no cuenta: ni para el ojo ni para la medicion.
      uBeat: { value: BEAT },
      // Que patron dibuja el fondo. Ver MOBILIARIO_BASE arriba: es lo que hace que una pieza de
      // lujo no tenga la misma grilla de ingenieria que una de software.
      uPatron: { value: Math.max(0, PATRONES.indexOf(MOB.fondo)) },
      // LA FORMA DE LA LUZ DEL FONDO, que era un ovalo centrado fijo e identico en los once aires:
      // `distance(uv, vec2(0.5, 0.58))` con umbrales escritos a mano. Apilado sobre la viñeta —que
      // tenia el mismo problema— daba la esquina del cuadro al 38% de la luminancia del centro en
      // TODA pieza de TODO aire. Es la otra mitad del "recuadro en los cuatro costados".
      //   uFonForma  0 = ovalo (foco), 1 = CAJA (pared iluminada pareja). No es el mismo degrade con
      //              otro numero: uno concentra la luz en un punto y el otro la reparte por lados.
      //   uFonCentro donde nace la luz. El default (0.5, 0.58) es el de siempre.
      uFonForma: { value: (MOB.fondoForma || 0) },
      uFonCentro: { value: new THREE.Vector2(...(MOB.fondoCentro || [0.5, 0.58])) },
      uFonAsp: { value: (MOB.fondoAsp || 1) },
      // 1 = mundo claro. La grilla y el pulso son ADITIVOS, que es lo correcto sobre negro y un
      // desastre sobre blanco: sumar sobre un fondo que ya está en 1.0 no aclara nada, sólo desatura
      // hasta el gris. En claro las mismas dos cosas tienen que OSCURECER hacia el acento.
      uClaro: { value: CLARO ? 1 : 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform float uT, uGrilla, uPulso, uClaro, uBeat, uPatron; uniform vec3 uA, uB, uAcento, uAcento2;
      uniform float uFonForma, uFonAsp; uniform vec2 uFonCentro;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        // Las dos normas se llevan al mismo maximo o la forma no hace nada: el ovalo toca 0.77 en la
        // esquina y la norma del maximo 0.58. Es la leccion que costo un render de mas en la viñeta.
        vec2 df = (uv - uFonCentro) * vec2(uFonAsp, 1.0);
        float dOv = length(df);
        float dCa = max(abs(df.x), abs(df.y)) * 1.4142;
        vec3 col = mix(uA, uB, smoothstep(0.95, 0.05, mix(dOv, dCa, uFonForma)));
        // EL PATRON DEL FONDO LO PIDE EL AIRE. Diez, y ninguno es decorado: cada uno dice de que
        // clase de negocio es la pieza antes de que se lea una palabra. La grilla en fuga —la de
        // ANTHEM— dice espacio y tecnologia, y sobre una panaderia dice 'software de panaderia'.
        vec2 g = uv - vec2(0.5, 0.52);
        float linea = 0.0;
        if (uPatron < 0.5) {
          // FUGA: las lineas se juntan hacia el horizonte y se desplazan. Espacio sin geometria.
          float persp = 1.0 / max(0.06, abs(g.y) * 2.4);
          float lx = abs(fract(g.x * persp * 5.0 + 0.5) - 0.5);
          float ly = abs(fract(g.y * 9.0 - uT * 0.18 + 0.5) - 0.5);
          linea = smoothstep(0.055, 0.0, lx) + smoothstep(0.05, 0.0, ly);
          linea *= smoothstep(0.62, 0.06, abs(g.y));
        } else if (uPatron < 1.5) {
          // PUNTOS: una reticula regular que deriva despacio. Es el papel milimetrado de un
          // cuaderno de diseno, y no tiene fuga: no promete profundidad, promete superficie.
          vec2 q = fract((g + vec2(uT * 0.006, -uT * 0.012)) * 26.0) - 0.5;
          linea = smoothstep(0.30, 0.06, length(q)) * 0.9;
        } else if (uPatron < 2.5) {
          // ONDAS: tres senos de periodos no multiplos entre si, o volverian a alinearse. Respira,
          // y nada tiene esquinas.
          float w = sin(g.x * 7.0 + uT * 0.30) * 0.055
                  + sin(g.x * 11.3 - uT * 0.21) * 0.035
                  + sin(g.x * 4.1 + uT * 0.13) * 0.045;
          float d = abs(fract((g.y - w) * 5.0 + 0.5) - 0.5);
          linea = smoothstep(0.09, 0.0, d) * 0.75;
        } else if (uPatron < 3.5) {
          // RAYAS: diagonales duras corriendo. Es la unica que NO se desvanece hacia los bordes,
          // porque su gracia es no dejar respirar.
          float d = abs(fract((g.x * 1.5 + g.y * 2.2) * 6.0 - uT * 0.55 + 0.5) - 0.5);
          linea = smoothstep(0.16, 0.05, d) * 0.8;
        } else if (uPatron < 4.5) {
          // BLOQUES: una cuadricula grande donde algunas celdas se encienden EN EL BEAT. Es el
          // unico patron con eventos propios, y por eso es el de las piezas que quieren gritar.
          vec2 celda = floor((g + vec2(0.5)) * vec2(3.0, 5.0));
          float paso = floor(uT / max(0.05, uBeat));
          float h = fract(sin(dot(celda, vec2(12.9898, 78.233)) + paso * 3.7) * 43758.5453);
          vec2 dentro = fract((g + vec2(0.5)) * vec2(3.0, 5.0));
          float borde = min(min(dentro.x, 1.0 - dentro.x), min(dentro.y, 1.0 - dentro.y));
          linea = step(0.78, h) * smoothstep(0.0, 0.04, borde) * 0.55;
        } else if (uPatron < 5.5) {
          // PANAL: una retícula hexagonal. Es la única trama del grupo que no tiene ni verticales ni
          // horizontales, así que no compite con la tipografía —que sí las tiene— y por eso puede ir
          // más marcada que las otras sin robarle contraste a una frase encima.
          // El hexágono sale de dos rejillas rectangulares desfasadas media celda: es el truco clásico
          // y cuesta dos fract en vez de una raíz por píxel.
          vec2 h1 = (g + vec2(uT * 0.004, -uT * 0.010)) * vec2(9.0, 5.2);
          vec2 a1 = abs(fract(h1) - 0.5);
          vec2 a2 = abs(fract(h1 + vec2(0.5)) - 0.5);
          float d1 = max(a1.x * 0.866 + a1.y * 0.5, a1.y);
          float d2 = max(a2.x * 0.866 + a2.y * 0.5, a2.y);
          linea = smoothstep(0.50, 0.44, min(d1, d2)) * 0.8;
          linea *= smoothstep(0.80, 0.10, length(g));
        } else if (uPatron < 6.5) {
          // CONTORNO: curvas de nivel, como un mapa topográfico. Son bandas cerradas y orgánicas que
          // se deforman lentísimo, y es la única que da la sensación de TERRENO en vez de rejilla.
          // El campo es una suma de senos cruzados —no un ruido— para que se pueda escrubbear frame a
          // frame sin depender de una tabla de azar.
          float campo = sin(g.x * 5.2 + sin(g.y * 3.1 + uT * 0.11) * 1.7)
                      + sin(g.y * 6.4 + sin(g.x * 2.3 - uT * 0.09) * 1.4);
          float f = fract(campo * 1.6);
          linea = smoothstep(0.06, 0.0, min(f, 1.0 - f)) * 0.7;
          linea *= smoothstep(0.85, 0.12, length(g));
        } else if (uPatron < 7.5) {
          // CIRCUITO: trazas en angulo recto con nodos encendidos. Es la unica trama del grupo con
          // ESQUINAS, y por eso rima con una interfaz y no con un material. Los nodos laten en el beat,
          // asi que ademas es la segunda con eventos propios — pero de un tamaño mucho menor que el
          // patron de bloques, que enciende celdas enteras. (Sin comillas invertidas aca adentro: cierran
          // el template literal del shader. Es la cuarta vez que me pasa y por eso hay una compuerta.)
          vec2 q = (g + vec2(-uT * 0.010, uT * 0.006)) * 11.0;
          vec2 ce = floor(q);
          vec2 d0 = fract(q) - 0.5;
          float sem = fract(sin(dot(ce, vec2(41.3, 289.1))) * 43758.5453);
          // Media celda lleva la traza horizontal y media la vertical: eso solo ya dibuja recorridos.
          float traza = sem < 0.5
            ? smoothstep(0.035, 0.0, abs(d0.y))
            : smoothstep(0.035, 0.0, abs(d0.x));
          // Un nodo en una de cada seis celdas, latiendo con el compas.
          float paso2 = floor(uT / max(0.05, uBeat));
          float hayNodo = step(0.82, fract(sem * 7.13));
          float vivo = step(0.55, fract(sem * 13.7 + paso2 * 0.37));
          float nodo = smoothstep(0.13, 0.04, length(d0)) * hayNodo * (0.30 + 0.70 * vivo);
          linea = (traza * 0.40 + nodo) * smoothstep(0.90, 0.10, length(g));
        } else if (uPatron < 8.5) {
          // ARCOS: circunferencias concentricas que se abren desde un foco bajo. Es la unica RADIAL del
          // grupo —todas las demas son cartesianas— y por eso es la que mejor sostiene una composicion
          // centrada: sus lineas apuntan al sujeto en vez de cruzarlo.
          float r = length((g - vec2(0.0, -0.34)) * vec2(1.0, 1.25));
          float fr = fract(r * 7.0 - uT * 0.14);
          linea = smoothstep(0.07, 0.0, min(fr, 1.0 - fr)) * 0.75;
          linea *= smoothstep(0.05, 0.30, r) * smoothstep(1.05, 0.30, r);
        } else if (uPatron < 9.5) {
          // TERRAZO: lascas de piedra de tamaños distintos, quietas. Es el unico patron MATERIAL del
          // grupo — los otros nueve son sistemas de lineas, o sea dibujo. Una lasca dice piso, taller,
          // mostrador: dice que atras hay una cosa y no una retícula. Va para lo hecho a mano y para
          // la comida, donde una grilla en fuga miente sobre el negocio.
          // Tres capas de celdas con escalas no multiplas para que no se lea la reticula que las genera.
          for (int k = 0; k < 3; k++) {
            float esc = 13.0 + float(k) * 8.0;
            vec2 c = floor(g * esc);
            vec2 f = fract(g * esc) - 0.5;
            float h = hash(c + float(k) * 37.0);
            // Solo una parte de las celdas trae lasca, o el fondo se convierte en un empedrado parejo.
            if (h > 0.62) {
              // El centro y el tamaño de cada lasca salen del mismo hash: no hay dos iguales y ninguna
              // se mueve, que es lo que la separa de un patron animado.
              vec2 off = vec2(hash(c + 5.0), hash(c + 9.0)) - 0.5;
              float rad = 0.16 + hash(c + 13.0) * 0.20;
              // Estiradas y giradas: una lasca redonda se lee como punto, y puntos ya hay.
              float a = h * 6.2831;
              vec2 d = f - off * 0.5;
              d = vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a)) * vec2(1.0, 0.62);
              linea += smoothstep(rad, rad * 0.55, length(d)) * (0.30 + h * 0.35);
            }
          }
          linea *= 0.62;
        } else if (uPatron < 10.5) {
          // MALLA: dos familias de hilos cruzados con un temblor lento, como un tejido flojo. Es la
          // version BLANDA de la cuadricula — los hilos no son rectos y no coinciden en los cruces —
          // y por eso dice textil y cuerpo donde 'bloques' dice pantalla.
          float ondaX = sin(g.y * 9.0 + uT * 0.16) * 0.012;
          float ondaY = sin(g.x * 7.4 - uT * 0.13) * 0.012;
          float hx = abs(fract((g.x + ondaX) * 17.0 + 0.5) - 0.5);
          float hy = abs(fract((g.y + ondaY) * 17.0 + 0.5) - 0.5);
          // El minimo y no la suma: en un tejido el cruce no brilla mas que el hilo, se tapa.
          linea = (smoothstep(0.085, 0.012, hx) + smoothstep(0.085, 0.012, hy)) * 0.42;
          linea -= smoothstep(0.085, 0.012, hx) * smoothstep(0.085, 0.012, hy) * 0.30;
          linea *= 0.55 + 0.45 * smoothstep(0.85, 0.10, length(g));
        } else if (uPatron < 11.5) {
          // TOPOGRAFIA: curvas de nivel de un terreno inventado. Dice suelo, mapa, lote — el registro
          // de una inmobiliaria o de cualquier cosa que se mida en metros. Es pariente de 'arcos' pero
          // al reves: arcos es una radial perfecta que apunta al centro, esta es irregular y no apunta
          // a ningun lado, que es justo lo que hace que se lea como terreno y no como diana.
          // Un campo suave hecho con tres senos cruzados hace de altura; las curvas son sus niveles.
          float h1 = sin(g.x * 3.1 + g.y * 2.3 + uT * 0.05);
          float h2 = sin(g.x * 5.7 - g.y * 4.1 - uT * 0.037) * 0.6;
          float h3 = sin(g.x * 1.7 + g.y * 6.2 + uT * 0.028) * 0.4;
          float alt = (h1 + h2 + h3) * 0.5;
          float fr2 = fract(alt * 4.0);
          float d2 = min(fr2, 1.0 - fr2);
          // Grosor CONSTANTE y no derivado del terreno. La funcion fwidth daria la curva pareja en la
          // ladera y en la meseta, pero es una derivada: en un shader compilado como GLSL ES 1.00
          // depende de una extension, y este motor tiene que dar el mismo pixel bajo SwiftShader y bajo
          // GPU. Con un umbral fijo la ladera junta sus curvas y la meseta las separa — que es como se
          // lee un mapa de verdad, asi que la restriccion tecnica y el dibujo correcto piden lo mismo.
          linea = smoothstep(0.030, 0.0, d2) * 0.80;
        } else if (uPatron < 12.5) {
          // DESTELLOS: motas de luz sueltas que respiran fuera de fase. No hay ninguna linea: es el
          // unico patron del grupo sin geometria, y por eso es el que deja respirar a una pieza que
          // vende noche o lujo, donde cualquier trama se lee como ruido.
          for (int k = 0; k < 3; k++) {
            float esc = 6.0 + float(k) * 3.5;
            vec2 c = floor(g * esc);
            vec2 f = fract(g * esc) - 0.5;
            float h = hash(c + float(k) * 71.0);
            if (h > 0.55) {
              vec2 off = (vec2(hash(c + 3.0), hash(c + 17.0)) - 0.5) * 0.7;
              // Cada mota late a su propio ritmo y con su propia fase: juntas no pulsan nunca a la vez.
              float lat = 0.55 + 0.45 * sin(uT * (0.35 + h * 0.5) + h * 6.2831);
              float d3 = length((f - off) * vec2(1.0, 1.0));
              linea += smoothstep(0.16 + h * 0.10, 0.0, d3) * lat * (0.35 + h * 0.5);
            }
          }
          linea *= 0.85 * smoothstep(1.05, 0.15, length(g));
        } else if (uPatron < 13.5) {
          // CRAQUELADO: la red de grietas de un esmalte que se contrajo al enfriarse. Es la juntura
          // y NADA mas. Terrazo llena las lascas y por eso pesa; aca la pieza es el fondo mismo y la
          // grieta es un pelo de luz, asi que puede ir detras de un titular sin comerle el contraste.
          // Le queda a la ceramica, a la cosmetica de arcilla, al queso de campo: todo lo que se vende
          // diciendo que lo hizo una mano y que el material tiene su propia voluntad.
          // La y va casi al doble que la x a proposito: el plano del fondo tiene el alto del cuadro
          // vertical, asi que una celda cuadrada en uv sale estirada en pantalla. Con 7 y 12.5 las
          // piezas salen parejas, que es lo unico que hace que se lean como material y no como trama.
          vec2 q = g * vec2(7.0, 12.5);
          vec2 ce = floor(q);
          vec2 fq = fract(q);
          // La distancia a la semilla mas cercana y a la segunda, sobre las nueve celdas vecinas.
          // Donde las dos empatan hay grieta: es literalmente como se parte un esmalte, por el medio
          // entre dos centros. No hace falta ruido de libreria, alcanza con el hash y la geometria.
          float d1 = 9.0;
          float d2 = 9.0;
          float sid = 0.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 off = vec2(float(i), float(j));
              vec2 sem = ce + off;
              vec2 pt = off + vec2(hash(sem), hash(sem + 23.0));
              float d = length(pt - fq);
              if (d < d1) { d2 = d1; d1 = d; sid = hash(sem + 5.0); }
              else if (d < d2) { d2 = d; }
            }
          }
          // EL MATERIAL NO SE MUEVE. Lo unico que respira es el ANCHO de la grieta, y cada pieza a su
          // tiempo porque la fase sale de su propia semilla. Esa es la diferencia entre una ceramica
          // bajo una luz que cambia y un dibujo animado: si las piezas se desplazaran, el fondo se
          // convertiria en agua y la pieza dejaria de decir barro cocido.
          float ancho = 0.055 + 0.028 * sin(uT * 0.07 + sid * 6.2831);
          linea = smoothstep(ancho, 0.0, d2 - d1) * 0.62;
          linea *= smoothstep(1.00, 0.12, length(g));
        } else if (uPatron < 14.5) {
          // VETA: la fibra de una tabla, con dos nudos que la obligan a abrirse. No es un patron de
          // lineas: es el CORTE de un material que crecio, y por eso la separacion entre vetas no es
          // constante — se aprieta contra el nudo y se afloja en el medio de la tabla. Eso solo ya
          // decide si se lee como madera o como rayado.
          // Le queda a la carpinteria, a la panaderia, al tostado, al bar: cualquier marca que apoye
          // el producto sobre una tabla antes de fotografiarlo.
          // La tabla se desliza a lo largo de su propia fibra, lentisimo: en veinticinco segundos los
          // nudos bajan un cuarto de cuadro y nada mas.
          vec2 p = g + vec2(0.0, uT * 0.006);
          // Los nudos son ovalos MUY estirados a lo largo de la veta. Uno redondo se lee como un ojo
          // dibujado; estirado se lee como una rama que quedo adentro de la tabla.
          float n1 = length((p - vec2(-0.17, 0.13)) * vec2(1.0, 0.50));
          float n2 = length((p - vec2(0.21, -0.19)) * vec2(1.0, 0.44));
          // El campo es la fibra recta MAS la deformacion de cada nudo. El termino inverso a la
          // distancia es enorme pegado al nudo y despreciable a medio cuadro, asi que solo ahi el
          // campo deja de ser vertical y se cierra en anillos; en el borde de esa zona la fibra pasa
          // de largo esquivandolo, que es el gesto que hace toda la lectura. Los dos nudos empujan al
          // reves —uno abre a la izquierda y el otro a la derecha— o la tabla saldria simetrica.
          // La fibra va apenas inclinada (el 0.18 en y): una vertical perfecta compite con la
          // tipografia, que tambien tiene verticales, y ademas ninguna tabla se corta tan derecha.
          float campo = (p.x + p.y * 0.18) * 22.0
                      + sin(p.y * 2.6 + uT * 0.02) * 2.4
                      - 4.0 / (n1 + 0.22)
                      + 3.6 / (n2 + 0.24);
          float fv = fract(campo);
          float anillo = smoothstep(0.09, 0.0, min(fv, 1.0 - fv));
          // La madera no tiene todas las vetas al mismo tono: vienen de a grupos, claros y oscuros.
          anillo *= 0.65 + 0.35 * sin(campo * 0.17 + p.y * 1.3);
          // En el centro del nudo los anillos se juntan mas de lo que conviene y ahi no queda dibujo,
          // queda ruido. Se apagan, y en su lugar va el ojo del nudo: macizo y blando.
          anillo *= smoothstep(0.030, 0.12, n1) * smoothstep(0.030, 0.12, n2);
          float ojo = smoothstep(0.055, 0.014, n1) * 0.30 + smoothstep(0.050, 0.012, n2) * 0.26;
          // El poro: una estria mucho mas fina que corre con la fibra, con otra inclinacion y una
          // frecuencia que no es multiplo de la veta, o las dos se alinearian y volveria a verse una
          // sola rejilla. Va a un octavo del peso: es el detalle que separa una tabla de una
          // superficie pintada, y con mas peso se come el cuadro.
          float poro = smoothstep(0.10, 0.01, abs(fract((p.x + p.y * 0.13) * 41.0 + 0.5) - 0.5)) * 0.12;
          linea = anillo * 0.60 + ojo + poro;
          linea *= 0.55 + 0.45 * smoothstep(0.95, 0.12, length(g));
        } else if (uPatron < 15.5) {
          // ESCAMAS: hileras de piezas curvas montadas una sobre otra, como un techo de tejas o el
          // esmalte de una vasija. La regularidad es de OFICIO y no de sistema: las hileras van
          // corridas media pieza, que es como se apoya una teja para tapar la union de las dos de
          // abajo, y cada pieza tiene su propio tono porque ninguna sale igual del horno.
          // Le queda a la ceramica, al bano, a la cocina, al vino: donde el producto se apila.
          // La y va casi al triple que la x y no es un descuido: el plano del fondo tiene el alto del
          // cuadro vertical, asi que una circunferencia dibujada en uv sale ovalada. Sin esa
          // correccion las escamas salen estiradas y dejan de parecer piezas.
          vec2 q = g * vec2(7.0, 19.0);
          float fila = floor(q.y);
          float corr = mod(fila, 2.0) * 0.5;
          vec2 c = vec2(floor(q.x + corr), fila);
          vec2 f = vec2(fract(q.x + corr) - 0.5, fract(q.y));
          float h = hash(c + 7.0);
          // El borde es media elipse que arranca en las dos esquinas de arriba de la celda y toca el
          // fondo: asi el pico de cada escama cae justo entre las dos puntas de las de la hilera
          // siguiente y el muro cierra sin huecos. El radio varia un pelo por pieza — nada hecho a
          // mano calza perfecto, y esa imperfeccion es la que hace que no se lea como una grilla.
          float r = length(vec2(f.x, f.y * 0.5));
          float borde = smoothstep(0.045, 0.0, abs(r - 0.5 - (h - 0.5) * 0.02));
          // Una luz rasante que recorre el muro. No es un brillo: es que una pieza esmaltada devuelve
          // la luz distinto segun donde este parada. Cada una con su desfasaje propio, o el frente de
          // onda barreria el cuadro como una linea de escaner y se llevaria toda la atencion.
          float luz = 0.55 + 0.45 * sin((g.x * 2.2 + g.y * 1.4) - uT * 0.11 + h * 2.4);
          // El lomo de la pieza, apenas encendido: da el volumen sin dibujar un contorno mas.
          float lomo = smoothstep(0.50, 0.24, r) * 0.16;
          linea = (borde * (0.55 + 0.45 * h) + lomo) * (0.45 + 0.55 * luz);
          linea *= 0.5 + 0.5 * smoothstep(1.00, 0.15, length(g));
          linea *= 0.62;
        } else if (uPatron < 16.5) {
          // HACES: la luz de un reflector cortando bruma. No hay ninguna linea dibujada: hay UNA
          // fuente fuera de cuadro, arriba a la derecha, y lo unico que se ve es el aire que ilumina.
          // Es el patron de la marca que se muestra de noche —musica en vivo, un evento, un bar, una
          // pasarela— donde cualquier trama se lee como mantel.
          // El haz sale de la PENDIENTE hacia el foco y no de un angulo: sin atan, dividiendo por la
          // distancia vertical, los haces convergen solos hacia la fuente y se abren hacia abajo, que
          // es como se abre un reflector de verdad. Un angulo constante daria una rueda de rayos.
          float dy = max(0.30, 1.25 - g.y);
          float pend = (g.x - 0.32) / dy;
          // Tres frecuencias que no son multiplos entre si: los haces salen de anchos distintos y no
          // se leen como un peine. Un reflector real nunca reparte parejo.
          float haz = sin(pend * 13.0 + uT * 0.050) * 0.50
                    + sin(pend * 21.7 - uT * 0.033) * 0.30
                    + sin(pend * 7.9 + uT * 0.022) * 0.28;
          // El umbral alto deja encendidas SOLO las crestas: pocos haces separados por mucho aire
          // oscuro. Bajarlo llena el cuadro de luz y ahi ya no es una atmosfera, es una pantalla velada.
          linea = smoothstep(0.32, 1.00, haz) * 0.65;
          // Se apagan con la distancia al foco. Que el pie del cuadro quede limpio no es un efecto
          // secundario: ahi es donde casi siempre cae el texto.
          linea *= smoothstep(1.95, 0.65, length(vec2(g.x - 0.32, g.y - 1.25)));
          // CALIBRADO PARA MUNDO CLARO. El shader ya documenta que en claro la trama necesita MAS
          // peso: una linea que sobre negro SUMA luz, sobre blanco tiñe apenas un blanco que ya
          // estaba lleno. Este patron nacio calibrado a ojo sobre fondo oscuro y en el render de
          // basecamp —mundo claro— salia casi invisible. El factor no es un gusto: se midio el
          // contraste de trama de los nueve patrones nuevos sobre el mismo cuadro y se llevo este
          // a la altura de los que si se leen. No a la par de los mas fuertes: un patron de
          // atmosfera que grita deja de ser atmosfera.
          //
          // El factor salio de DOS vueltas y no de una: la respuesta no es lineal. La mezcla final
          // del fondo satura —el factor de mix pasa de 1 y deja de sumar— asi que un patron denso
          // se dispara con poco y uno disperso casi no se mueve. La caustica se fue a 4.51 con x1.6
          // y la bruma subio a menos de la mitad con x5.4. Se midio el resultado y se corrigio.
          linea *= 13.0;
        } else if (uPatron < 17.5) {
          // BRUMA: humo lento atravesando el cuadro. Es el patron MAS FLOJO de contraste de todo el
          // grupo, y eso es la decision, no una limitacion: no tiene que poder nombrarse ninguna forma,
          // solo tiene que sentirse que el aire pesa. Va para perfumeria, hoteleria, destilados —lo que
          // vende clima y no producto— y es el reemplazo de nada cuando el degrade solo queda vacio.
          // El humo se arma con tres capas de ruido de valor, interpolando hash sobre una reticula,
          // porque en este shader no hay funcion de ruido. Las escalas no son multiplos entre si o se
          // veria la reticula que las genera, que es el defecto clasico de este truco.
          for (int k = 0; k < 3; k++) {
            float esc = 2.7 + float(k) * 4.3;
            float amp = 0.55 * pow(0.52, float(k));
            // Cada capa deriva a su propia velocidad. Eso solo ya alcanza para que la masa se DEFORME
            // en vez de pasar de largo entera, que es la diferencia entre humo y una calcomania.
            vec2 p = g * esc + vec2(uT * (0.010 + float(k) * 0.006), -uT * (0.016 + float(k) * 0.010));
            // Un corte lateral suave: el humo se dobla, nunca sube derecho.
            p.x += sin(p.y * 0.6 + uT * 0.05) * 0.30;
            vec2 ip = floor(p);
            vec2 fp = fract(p);
            // La curva suave de la interpolacion. Con fp crudo se ven los rombos de la celda.
            vec2 sp = fp * fp * (3.0 - 2.0 * fp);
            float n0 = mix(hash(ip), hash(ip + vec2(1.0, 0.0)), sp.x);
            float n1 = mix(hash(ip + vec2(0.0, 1.0)), hash(ip + vec2(1.0, 1.0)), sp.x);
            linea += mix(n0, n1, sp.y) * amp;
          }
          // La ventana angosta se queda con la parte alta del ruido: quedan jirones y claros abiertos.
          // Sin ese corte queda una niebla pareja, que no es atmosfera sino un degrade sucio.
          linea = smoothstep(0.38, 0.82, linea) * 0.50;
          linea *= smoothstep(1.10, 0.20, length(g));
          // CALIBRADO PARA MUNDO CLARO. El shader ya documenta que en claro la trama necesita MAS
          // peso: una linea que sobre negro SUMA luz, sobre blanco tiñe apenas un blanco que ya
          // estaba lleno. Este patron nacio calibrado a ojo sobre fondo oscuro y en el render de
          // basecamp —mundo claro— salia casi invisible. El factor no es un gusto: se midio el
          // contraste de trama de los nueve patrones nuevos sobre el mismo cuadro y se llevo este
          // a la altura de los que si se leen. No a la par de los mas fuertes: un patron de
          // atmosfera que grita deja de ser atmosfera.
          //
          // El factor salio de DOS vueltas y no de una: la respuesta no es lineal. La mezcla final
          // del fondo satura —el factor de mix pasa de 1 y deja de sumar— asi que un patron denso
          // se dispara con poco y uno disperso casi no se mueve. La caustica se fue a 4.51 con x1.6
          // y la bruma subio a menos de la mitad con x5.4. Se midio el resultado y se corrigio.
          linea *= 34.0;
        } else if (uPatron < 18.5) {
          // CAUSTICA: la luz que rebota en agua o cruza un vidrio tallado y deja una red de venas
          // brillantes moviendose. Es un fenomeno, no un dibujo: la superficie ondulada concentra la
          // luz en filamentos, y es la unica del grupo que llega REBOTADA — no se ve la fuente, se ve
          // lo que el agua le hizo. Por eso pone la pieza adentro de un lugar humedo: pileta, spa,
          // hotel, gin, perfume, vidrio.
          // No confundir con topografia: aquella es un mapa de curvas paralelas y parejas. Aca las venas
          // se cruzan en angulos distintos y arman celdas de tamaños distintos, y esa irregularidad es
          // exactamente lo que el ojo lee como agua.
          vec2 q = (g + vec2(0.0, 0.06)) * 11.0;
          for (int k = 0; k < 3; k++) {
            float fk = float(k);
            float t = uT * 0.10 + fk * 1.7;
            // Cada pasada dobla el dominio con la anterior. Sin esa deformacion encadenada quedarian
            // tres juegos de rayas rectas superpuestas, que es una trama y no una caustica.
            q += vec2(sin(q.y * 1.4 + t), cos(q.x * 1.2 - t)) * 0.90;
            // La vena vive donde el seno pasa por cero. Elevada a la quinta queda fina y con nucleo:
            // casi todo apagado y un hilo vivo, que es como se ve una caustica de verdad. Sin la
            // potencia sale una onda gorda y el fondo pierde el aire que necesita el texto.
            float vena = 1.0 - abs(sin(q.x * (1.0 + fk * 0.25) + q.y * (0.80 - fk * 0.35) + t));
            linea += pow(max(0.0, vena), 5.0);
          }
          // El oleaje entero sube y baja despacio, como cuando cruza una onda grande la pileta. Es un
          // solo latido para las tres capas: si cada una respirara sola se veria centelleo, no agua.
          linea *= 0.40 * (0.78 + 0.22 * sin(uT * 0.16));
          linea *= smoothstep(1.05, 0.18, length(g));
        } else if (uPatron < 19.5) {
          // RECUENTO: grupos de cuatro palotes tachados por una diagonal. Es la cuenta a mano — la de
          // la pared del deposito, la del margen de un cuaderno, la de una guardia anotando quien
          // entro. Dice inventario, asistencia, expediente: cosas que se llevan ANOTANDO. Es lo
          // contrario de un tablero: no muestra un numero, muestra que alguien conto.
          vec2 q4 = (g + vec2(0.0, uT * 0.004)) * vec2(5.0, 8.0);
          vec2 ce4 = floor(q4);
          float h4 = hash(ce4 * 1.7);
          // Menos de la mitad de las celdas trae un grupo: una pared contada entera vuelve a ser una
          // trama, y una trama ya no se lee como cuenta.
          if (h4 > 0.56) {
            // Ningun grupo cae en el centro exacto de su celda ni queda perfectamente derecho. Ese
            // corrimiento es la unica razon por la que esto se lee anotado a mano y no tipografiado:
            // sin el vuelve a asomar la reticula que lo genera, que es justo lo que no queremos.
            vec2 des = (vec2(hash(ce4 + 4.0), hash(ce4 + 8.0)) - 0.5) * 0.28;
            float ang = (h4 - 0.5) * 0.22;
            vec2 fr4 = fract(q4) - vec2(0.5) - des;
            fr4 = vec2(fr4.x * cos(ang) - fr4.y * sin(ang), fr4.x * sin(ang) + fr4.y * cos(ang)) + vec2(0.5);
            // De una a cinco marcas, distinto en cada grupo. Los grupos a medio cerrar son los que
            // hacen que la pared parezca contada en momentos distintos y no estampada de una vez.
            float n = 1.0 + floor(hash(ce4 + 21.0) * 4.999);
            // Cada grupo respira con su propia fase y lentisimo, como tiza que se aviva y se apaga.
            float vive = 0.72 + 0.28 * sin(uT * 0.16 + h4 * 6.2831);
            for (int k = 0; k < 4; k++) {
              float px = 0.30 + float(k) * 0.115;
              float palote = smoothstep(0.030, 0.008, abs(fr4.x - px))
                           * smoothstep(0.22, 0.18, abs(fr4.y - 0.5));
              linea += palote * step(float(k) + 0.5, n) * vive * 0.5;
            }
            // El quinto trazo no se agrega al lado: TACHA a los otros cuatro. Por eso un grupo cerrado
            // se distingue de uno abierto aun de lejos, que es toda la gracia de contar de a cinco.
            vec2 p0 = vec2(0.26, 0.28);
            vec2 dv = vec2(0.50, 0.44);
            float tt = min(1.0, max(0.0, dot(fr4 - p0, dv) / dot(dv, dv)));
            float dd = length(fr4 - p0 - dv * tt);
            linea += smoothstep(0.030, 0.008, dd) * step(4.5, n) * vive * 0.5;
          }
          linea *= 0.72 * smoothstep(1.05, 0.14, length(g));
          // CALIBRADO PARA MUNDO CLARO. El shader ya documenta que en claro la trama necesita MAS
          // peso: una linea que sobre negro SUMA luz, sobre blanco tiñe apenas un blanco que ya
          // estaba lleno. Este patron nacio calibrado a ojo sobre fondo oscuro y en el render de
          // basecamp —mundo claro— salia casi invisible. El factor no es un gusto: se midio el
          // contraste de trama de los nueve patrones nuevos sobre el mismo cuadro y se llevo este
          // a la altura de los que si se leen. No a la par de los mas fuertes: un patron de
          // atmosfera que grita deja de ser atmosfera.
          //
          // El factor salio de DOS vueltas y no de una: la respuesta no es lineal. La mezcla final
          // del fondo satura —el factor de mix pasa de 1 y deja de sumar— asi que un patron denso
          // se dispara con poco y uno disperso casi no se mueve. La caustica se fue a 4.51 con x1.6
          // y la bruma subio a menos de la mitad con x5.4. Se midio el resultado y se corrigio.
          linea *= 4.5;
        } else if (uPatron < 20.5) {
          // ESTELAS: trazos horizontales que cruzan el cuadro, cada uno en su carril, con su largo y su
          // velocidad. Es lo mas cerca que llega el motor a una foto de obturador lento: el objeto no se
          // ve, se ve por donde paso. No es una variante de rayas — aquellas son una trama infinita de
          // diagonales todas iguales, y esto son OBJETOS sueltos, con cabeza y con cola, que entran y
          // salen del cuadro. Una trama dice material; esto dice transito.
          float carriles = 13.0;
          float carril = floor((g.y + 0.5) * carriles);
          float dyE = fract((g.y + 0.5) * carriles) - 0.5;
          float hE = hash(vec2(carril, 7.0));
          // Todas para el mismo lado a proposito: cruzadas dan ruido, en fila dan corriente. Y el mismo
          // hash decide velocidad Y grosor, que es toda la profundidad que hace falta: la estela gruesa
          // pasa rapido porque esta cerca, la fina se arrastra porque esta lejos. Sin ese amarre son
          // trece rayas horizontales a la misma distancia, o sea una persiana.
          float velE = 0.07 + hE * 0.12;
          float anchoE = 0.09 + hE * 0.15;
          float xE = fract(g.x + 0.5 + hE * 3.7 - uT * velE);
          float dE = xE - 0.5;
          float largoE = 0.16 + hash(vec2(carril, 23.0)) * 0.24;
          // La cola nace de la nada y la cabeza corta seco. Con los dos bordes iguales queda un fideo
          // simetrico que no va para ningun lado: el corte al frente es lo unico que dice la direccion.
          float cuerpo = smoothstep(-largoE, -largoE * 0.12, dE) * smoothstep(0.012, -0.004, dE);
          cuerpo *= cuerpo;
          // Dos de cada tres carriles llevan estela. Con todos ocupados se cierra otra vez en trama.
          float hayE = step(0.34, hash(vec2(carril, 41.0)));
          linea = cuerpo * smoothstep(anchoE, anchoE * 0.35, abs(dyE)) * hayE * (0.45 + 0.55 * hE);
          linea *= 0.62 * smoothstep(1.00, 0.22, length(g));
        } else if (uPatron < 21.5) {
          // LATIDO: la linea de un monitor cardiaco cruzando el cuadro. Es la unica traza del motor con
          // un EVENTO dibujado adentro —un pico— en vez de una repeticion: el ojo la sigue esperando el
          // proximo, y esa espera es el movimiento, no la velocidad.
          // No la enganchamos al compas del montaje aunque tentaba: a 120 pulsos por minuto el fondo
          // entero se pone a correr, y un fondo que corre se lleva la frase puesta.
          float filas = 4.0;
          float fil = floor((g.y + 0.5) * filas);
          float dyL = fract((g.y + 0.5) * filas) - 0.5;
          float hL = hash(vec2(fil, 19.0));
          // Cada traza con su fase y su velocidad: cuatro picos alineados serian una grilla, no cuatro
          // cuerpos distintos midiendose al mismo tiempo.
          float xL = fract(g.x + 0.5 + hL - uT * (0.070 + hL * 0.035));
          float dL = xL - 0.55;
          // El complejo a mano: la bajada corta, el pico alto y angosto, el rebote, y la onda ancha que
          // viene atras. Sin esas cuatro piezas es un triangulo, y un triangulo no se lee como un latido.
          float alt = smoothstep(0.038, 0.0, abs(dL)) * 0.26
                    - smoothstep(0.020, 0.0, abs(dL + 0.048)) * 0.070
                    - smoothstep(0.026, 0.0, abs(dL - 0.052)) * 0.090
                    + smoothstep(0.080, 0.0, abs(dL - 0.155)) * 0.055;
          float trazoL = smoothstep(0.034, 0.008, abs(dyL - alt));
          // El halo ancho la hace fosforo en vez de alambre, y ademas es todo el antialias que tenemos:
          // sin derivadas, la subida casi vertical del pico queda de un pixel y titila cuadro a cuadro.
          float haloL = smoothstep(0.11, 0.0, abs(dyL - alt)) * 0.20;
          // La base va apagada y el pico enciende. Cuatro horizontales parejas detras de un titulo son
          // justo lo que no hay que hacer: horizontales compitiendo con horizontales.
          float brilloL = 0.20 + 0.80 * smoothstep(0.30, 0.02, abs(dL - 0.04));
          linea = (trazoL + haloL) * brilloL * 0.60;
          linea *= smoothstep(1.05, 0.20, length(g));
          // CALIBRADO PARA MUNDO CLARO. El shader ya documenta que en claro la trama necesita MAS
          // peso: una linea que sobre negro SUMA luz, sobre blanco tiñe apenas un blanco que ya
          // estaba lleno. Este patron nacio calibrado a ojo sobre fondo oscuro y en el render de
          // basecamp —mundo claro— salia casi invisible. El factor no es un gusto: se midio el
          // contraste de trama de los nueve patrones nuevos sobre el mismo cuadro y se llevo este
          // a la altura de los que si se leen. No a la par de los mas fuertes: un patron de
          // atmosfera que grita deja de ser atmosfera.
          //
          // El factor salio de DOS vueltas y no de una: la respuesta no es lineal. La mezcla final
          // del fondo satura —el factor de mix pasa de 1 y deja de sumar— asi que un patron denso
          // se dispara con poco y uno disperso casi no se mueve. La caustica se fue a 4.51 con x1.6
          // y la bruma subio a menos de la mitad con x5.4. Se midio el resultado y se corrigio.
          linea *= 4.50;
        }
        // 'nada' (uPatron >= 21.5) deja el degrade solo: es lo que necesita una pieza que vende aire.
        linea *= uGrilla;
        // En oscuro la línea SUMA luz; en claro TIÑE hacia el acento. Es la misma grilla y en los dos
        // casos aparece por delante del fondo, que es lo único que importa.
        // En claro hace falta MAS peso, no menos: sobre negro una linea de acento al 16% ya destaca
        // porque suma luz donde no habia, y sobre blanco la misma linea tiñe apenas un blanco que ya
        // estaba lleno. Con 0.26 la grilla en fuga quedaba de fantasma y los cuadros sin protagonista
        // salian en blanco liso.
        col = mix(col + uAcento * linea * 0.16, mix(col, uAcento * 0.58, linea * 0.52), uClaro);
        // PULSO: un halo que late con el beat. Se maneja desde la timeline, no con un reloj propio.
        float halo = uPulso * smoothstep(0.75, 0.0, distance(uv, vec2(0.5, 0.5)));
        col = mix(col + uAcento * halo * 0.5, mix(col, uAcento, halo * 0.32), uClaro);
        // ---------------------------------------------------------------- campos de color (mundo claro)
        // UN MUNDO CLARO NO PUEDE BRILLAR, Y ESE ERA TODO EL PROBLEMA.
        //
        // Medido: la MISMA pieza, los MISMOS datos, cambiando sólo la polaridad, pasa de 0.104 a 0.215
        // de píxeles en movimiento y de 0.075 a 0.134 de ocupación de cuadro. El doble, las dos. No es
        // el grano —a umbral 60, donde el grano no llega, la brecha es de 6×— ni el largo de las
        // frases: es que la mitad del "movimiento" de una pieza oscura la pone el GLOW. Un halo de
        // bloom desplazándose mueve cientos de píxeles alrededor de cada objeto, y la grilla aditiva
        // ilumina donde antes no había nada. Sobre blanco, sumar luz no hace nada.
        //
        // Lo que sí tiene una pieza clara es el CAMPO DE COLOR: manchas grandes y suaves del color de
        // la marca que se desplazan por debajo de todo. Es el vocabulario de las landings claras de
        // hoy y no es un truco para la métrica — es lo que hace que un cuadro blanco con una frase
        // encima se lea como diseñado en vez de como vacío. Y como son grandes y se mueven, aportan
        // exactamente lo que faltaba: área que cambia.
        //
        // Los períodos no son múltiplos entre sí: si lo fueran, las dos manchas volverían a alinearse
        // cada tanto y el fondo latiría como una sola cosa.
        // COORDENADAS DE CUADRO, no del plano. El plano del fondo mide 2.6x el cuadro y vive en
        // z=-14, asi que lo que la camara ve es apenas su parte central: uv 0..1 recorre mucho mas que
        // la pantalla. La primera version puso las manchas en uv (0.26, 0.30) y la cuña en la esquina
        // (1, 0) — TODO fuera de campo. Se noto porque las metricas no se movieron ni un digito entre
        // la version con cuña y la version sin cuña: identicas, hasta el ultimo decimal.
        vec2 f = (uv - 0.5) * 1.49 + 0.5;
        vec2 c1 = vec2(0.26 + sin(uT * 0.131) * 0.13, 0.30 + cos(uT * 0.107) * 0.10);
        vec2 c2 = vec2(0.76 + cos(uT * 0.091) * 0.11, 0.71 + sin(uT * 0.118) * 0.12);
        float m1 = smoothstep(0.62, 0.0, distance(f, c1));
        float m2 = smoothstep(0.54, 0.0, distance(f, c2));
        // El centro del cuadro cede: ahí vive la tipografía, y un campo fuerte detrás de una frase le
        // roba el contraste que la hace legible. La máscara se abre hacia los bordes.
        float borde = smoothstep(0.10, 0.42, distance(f, vec2(0.5, 0.52)));
        vec3 campos = mix(col, uAcento, m1 * 0.34);
        campos = mix(campos, uAcento2, m2 * 0.24);
        col = mix(col, mix(col, campos, 0.35 + 0.65 * borde), uClaro);

        // Y UNA CUÑA DE BORDE DURO. Los campos suaves de arriba subieron el movimiento un 19% y la
        // OCUPACIÓN NO SE MOVIÓ (0.075 -> 0.072), y eso no es un defecto de la métrica: la ocupación
        // toma la mediana del cuadro como fondo y cuenta lo que se aleja de ella, así que un degradé
        // grande y suave corre la propia mediana y no cuenta nunca. Un mundo claro sólo puede ocupar
        // el cuadro con MASA DE BORDE DURO, que además es lo que usa el diseño editorial claro: el
        // bloque de color plano, no la nube.
        //
        // Va en la esquina inferior derecha y con la diagonal corrida, o sea lejos del centro óptico
        // donde vive la tipografía: un bloque sólido detrás de una frase le come el contraste que la
        // hace legible, y la legibilidad no se negocia por una métrica.
        // El factor 1.49 vale a la distancia de reposo; cuando la camara hace dolly, la porcion del
        // plano que entra en cuadro cambia y el mapeo se corre. Por eso la cuña es GRANDE y su umbral
        // esta lejos del borde: con 1.02 desaparecia entera en los cuadros en que la camara se acerca
        // — que es exactamente el mismo error que dejo la pauta del toro fuera de campo cuatro beats.
        // Una masa que depende de un mapeo aproximado tiene que tener margen, o no depender de el.
        // LA DIAGONAL VA POR DEBAJO DE LA BANDA DE TIPOGRAFIA, y eso fija los coeficientes.
        // Con (0.62, 0.88) la cuña subia hasta el medio del cuadro y el titular la cruzaba: tinta
        // oscura sobre un violeta saturado pierde el contraste que la hace legible. La ocupacion daba
        // 0.391 —por encima de la referencia— y la pieza era peor. Con mas peso en Y (1.15) el borde
        // se aplana y queda entre el 9% y el 39% del alto, o sea debajo del renglon del titular.
        // LA CUÑA SALTA EN EL BEAT, no deriva. Derivando con un seno lentisimo era una masa enorme que
        // cambiaba tres pixeles por cuadro: la version anterior subio la ocupacion y NO subio el
        // movimiento, que es la misma leccion que dio el mosaico con el paralaje y el hero con el
        // polvo. Lo que el ojo registra —y lo que la medicion cuenta— es que algo CAMBIE DE GOLPE.
        //
        // Cada dos beats toma una posicion nueva de una lista de cuatro. Dos beats y no uno porque a
        // un beat el fondo compite con los cortes de la pieza; a dos, acompaña. Y son posiciones
        // discretas y no un valor al azar para que el salto se lea como una DECISION repetida, que es
        // lo que hace un diseño editorial, y no como un temblor.
        float paso = floor(uT / max(0.05, uBeat * 2.0));
        float sel = fract(sin(paso * 12.9898) * 43758.5453);
        float donde = 1.05 + floor(sel * 4.0) * 0.055 - 0.08;
        float dg = (f.x * 0.35 + (1.0 - f.y) * 1.15) - donde;
        float cuna = smoothstep(0.0, 0.006, dg);
        // SOLO EN CLARO, y no por falta de ganas. Probada tambien en el mundo oscuro, la cuña sube la
        // ocupacion de 0.28 a 0.61 —muy por encima de la referencia— y la pieza queda PEOR: el azul
        // profundo con las lineas de neon encima se convierte en un diagonal celeste apagado, y el
        // contraste baja de 0.177 a 0.171. Un mundo oscuro ya tiene cuerpo: se lo da el glow, que es
        // justo lo que un mundo claro no puede tener. Es la segunda vez en esta sesion que una version
        // gana la metrica y hay que tirarla; el 11% de ocupacion que le falta al mundo oscuro contra la
        // referencia es una diferencia de estetica, no un defecto, y cerrarla cuesta mas de lo que vale.
        col = mix(col, mix(col, uAcento, 0.86), cuna * uClaro);

        // grano fino, para que el degradé no muestre bandas
        col += (hash(uv * 1400.0 + uT * 13.0) - 0.5) * 0.016;
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 2.6, mundoH * 2.6), mat)
  m.position.z = -14
  m.renderOrder = -100
  return m
}

// ---------------------------------------------------------------- materiales de uso frecuente
// OJO CON LA INTENSIDAD. LOOK.acento (#5b6cff) ya tiene el canal azul en 1.0: multiplicarlo por 2.4
// lo lleva a (0.85, 1.06, 2.4), se satura y sale BLANCO. Con el default viejo el anillo, la pildora y
// la tipografia salian todos blanco-lavanda y el titulo era un ladrillo ilegible. Un color que ya
// tiene un canal al tope no se "enciende" multiplicandolo — se enciende con el BLOOM, que es lo que
// convierte un color en luz. 1.15 deja margen para que el bloom haga su trabajo sin reventar el tono.
export const matAcento = (color = LOOK.acento, intensidad = 1.15) => new THREE.MeshBasicMaterial({
  color: hex(color).multiplyScalar(intensidad), toneMapped: false,
})
// ---------------------------------------------------------------- la escala fondo → tinta
// nivel(k) — el color que está al k del camino que va del FONDO a la TINTA. k=0 es el fondo, k=1 es
// la tinta, 0.5 es el gris del medio.
//
// POR QUÉ EXISTE. Las escenas tenían la escala de grises escrita a mano: '#c3cbdb' para el titular,
// '#8c95ab' para la jerarquía alta, '#7d879e' para la baja. Son valores buenos, y están calibrados
// contra un fondo negro. En un mundo claro —cinco de cada siete páginas reales— el titular gris claro
// sobre blanco es un fantasma, y la tarjeta '#0c1124' es un rectángulo azul marino plantado en el medio
// de una pieza blanca. La misma jerarquía escrita como `nivel(0.78)` da gris claro sobre negro y gris
// oscuro sobre blanco, sin que la escena tenga que saber en qué mundo está.
//
// Y ARREGLA LA INVERSIÓN GRATIS. La escena de destello es una hoja de papel BLANCA con tipografía
// NEGRA, dentro de un mundo oscuro: una inversión deliberada. Escrita como nivel(1) para la hoja y
// nivel(0) para la letra, en un mundo claro se da vuelta sola —hoja oscura, letra clara— y sigue
// siendo la misma idea: el plano que se opone al fondo.
//
// OJO: se evalúa cuando se llama, NUNCA a nivel de módulo. LOOK cambia en `configurar()`, que corre
// después de que los módulos se importan; un `const C = nivel(0.7)` arriba de un archivo se queda con
// la paleta de ANTHEM para siempre y no falla — miente en silencio.
// SE MEZCLA EN sRGB, NO EN LINEAL, y la diferencia no es academica: es la que decide si el texto se
// lee o sale reventado.
//
// `THREE.Color.lerp` trabaja en el espacio LINEAL de trabajo, asi que `nivel(0.78)` entre #05060a y
// #f2f4f8 devolvia #d9dbde — luminancia 0.707. El umbral del bloom del aire tecnico es 0.62, o sea que
// TODA la tipografia de display quedaba por encima y florecia entera: en un mundo oscuro el titular
// salia como un ladrillo blanco sin contraformas, ilegible. El gris escrito a mano que reemplace
// (#c3cbdb) tenia luminancia 0.594, elegido a proposito para pasar JUSTO por debajo — el
// "presupuesto de luz" que documenta toro.js. Mezclando los mismos extremos en sRGB da #bec0c4,
// luminancia 0.526: debajo del umbral, con margen.
//
// Lo delato un render en vivo de tailwindcss.com, no una compuerta. Por eso hay una compuerta ahora.
const _canal = (h) => {
  const t = String(h).replace('#', '')
  const n = t.length === 3 ? t.split('').map(c => c + c).join('') : t
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) || 0)
}
const _hex = (v) => '#' + v.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')
export function nivel(k, tinte = 0) {
  const a = _canal(LOOK.bg), b = _canal(LOOK.tinta)
  const t = Math.min(1, Math.max(0, k))
  let v = a.map((x, i) => x + (b[i] - x) * t)
  if (tinte > 0) {
    const c = _canal(LOOK.acento)
    v = v.map((x, i) => x + (c[i] - x) * tinte)
  }
  return _hex(v)
}

export const matTarjeta = (color = null) => new THREE.MeshPhysicalMaterial({
  color: hex(color || nivel(0.10, 0.35)), roughness: 0.42, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.25,
})

// ---------------------------------------------------------------- helpers de composición
// Un filete de acento: el elemento más barato que existe para dar dirección y ritmo a un cuadro.
export function filete(largo, grosor = 0.05, color = LOOK.acento) {
  return new THREE.Mesh(new THREE.PlaneGeometry(largo, grosor), matAcento(color, 1.45))
}

// Reparte n elementos en un arco mirando a la cámara: es la disposición que hace que un grupo de
// tarjetas se lea como una sola pieza y no como una lista.
export function enArco(objs, radio, aperturaRad) {
  const n = objs.length
  objs.forEach((o, i) => {
    const t = n === 1 ? 0 : (i / (n - 1) - 0.5)
    const a = t * aperturaRad
    o.position.x = Math.sin(a) * radio
    o.position.z = -radio + Math.cos(a) * radio
    o.rotation.y = -a
  })
}


// ---------------------------------------------------------------- recortes REALES de la pagina
// Un recorte no es una foto: es un OBJETO de la marca — su logo, su tarjeta de precio, su boton. Se
// dibuja con SU proporcion y sin recortar. Estirar el logo de una marca un 20% es el defecto que su
// dueño ve antes que ninguno, y recortarlo lo rompe igual.
//
// `alto` es el alto en unidades de mundo; el ancho sale de la proporcion del archivo. Devuelve null
// si no hay textura: una escena que no puede mostrar el objeto se compone sin el, nunca con un hueco
// gris que se lee como un error de carga.
export function planoRecorte(tex, alto, o = {}) {
  if (!tex || !tex.image) return null
  const ar = tex.image.width / tex.image.height
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    // toneMapped false y sin multiplicar: el recorte YA trae los colores de la marca y cualquier
    // ganancia los falsea. Su integracion con la pieza la da el grano y la viñeta del pase final,
    // que se aplican despues porque el recorte vive en la escena post-bloom.
    toneMapped: false, opacity: o.opacidad == null ? 1 : o.opacidad,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * ar, alto), mat)
  m.userData.ar = ar
  return m
}

// Carga los recortes que declara D.elementos. Devuelve un Map url -> textura. El TextureLoader de
// three es asincronico: si una escena no espera, construye con texturas vacias y el plano sale negro.
export function cargarRecortes(elementos) {
  const cargador = new THREE.TextureLoader()
  const urls = [...new Set((elementos || []).map(e => e.url).filter(Boolean))]
  const mapa = new Map()
  return Promise.all(urls.map(u => new Promise(res => {
    cargador.load(u, t => { mapa.set(u, t); res() }, undefined, () => res())
  }))).then(() => mapa)
}

// Elige recortes por ROL, en el orden en que sirven para una escena. Nunca inventa: si la pagina no
// dio ninguno del rol pedido, devuelve una lista mas corta o vacia, y la escena se compone sin ellos.
// ---------------------------------------------------------------- laminas de texto
// UNA RESEÑA SE CUENTA CON PALABRAS, NO CON UNA CAPTURA DE LA RESEÑA.
//
// El reclamo, textual y por tercera vez: "las reseñas se deben de mostrar EN TEXTO, NO UNA IMAGEN".
// Y tiene razon hasta en lo practico: el motor YA tiene el testimonio como texto —con nombre y empresa,
// "Gabriel Peal, OpenAI"— y `cita` lo compone en la tipografia del aire, al tamaño del cuadro y sin
// perder un pixel. Mostrar en su lugar una foto de la tarjeta es cambiar tipografia legible por un JPG
// de tipografia ajena, y ademas repetir lo que otra escena ya dijo mejor.
//
// EL PROBLEMA ES QUE EL EXTRACTOR NO ETIQUETA "RESEÑA". Da roles de forma —tarjeta, foto, logo— y en
// linear.app las reseñas llegan como 'tarjeta' y en basecamp.com el bloque de estrellas llega como
// 'foto'. O sea que por rol no se pueden distinguir.
//
// LO QUE SI SE PUEDE MEDIR es que una LAMINA DE TEXTO no se parece a una foto. Medido sobre los siete
// elementos reales de las dos paginas, a dos escalas (detalle fino a 1/2 y grueso a 1/8):
//
//   elemento                        luma   grueso/fino
//   tarjeta de reseña (linear)       224      1.92
//   tarjeta de reseña (linear)       219      1.97
//   bloque de estrellas (basecamp)   246      1.34     <- llega como 'foto'
//   captura de la app (linear)        19      0.82
//   panel de proyecto (basecamp)      29      1.51
//   logo (linear)                     85      1.95
//
// Las tres laminas de texto son CLARAS y con estructura gruesa; las capturas de producto son oscuras.
// El umbral es luma > 200 y grueso/fino > 1.2, y separa los seis casos reales sin excepcion.
//
// Y SOLO SE APLICA CUANDO LA PAGINA DIO TESTIMONIOS, o sea solo donde el riesgo existe. Ahi la asimetria
// esta clara: publicar una reseña como captura es un error de contenido que ya se señalo tres veces;
// saltear una foto clara de mas cuesta un recorte. El vocabulario de un logo claro sobre fondo blanco
// entraria en la regla, y por eso el rol 'logo' queda exento — un logo ES una lamina y es correcto
// mostrarlo como imagen.
const _cacheLamina = new WeakMap()
export function esLamina(img) {
  if (!img || !img.width) return false
  if (_cacheLamina.has(img)) return _cacheLamina.get(img)
  const p = bandas(img)
  if (!p || !p.filas.length) { _cacheLamina.set(img, false); return false }
  let fino = 0, grueso = 0, luma = 0
  for (const f of p.filas) {
    fino += f.fino; grueso += f.grueso
    luma += (f.col[0] * 0.2126 + f.col[1] * 0.7152 + f.col[2] * 0.0722) * 255
  }
  const n = p.filas.length
  const r = (luma / n) > 200 && (grueso / n) / ((fino / n) + 0.5) > 1.2
  _cacheLamina.set(img, r)
  return r
}

// Lo prende `configurarDatos` cuando la pagina publico testimonios: ver la nota de arriba.
let SIN_LAMINAS = false
export const vetarLaminas = (v) => { SIN_LAMINAS = !!v }
// Devuelve la textura de un elemento, o null si es una lamina de texto que no corresponde mostrar como
// imagen. Las escenas la usan en lugar de `texturas.get(e.url)` para no repetir la regla cinco veces.
export function texturaDe(texturas, e) {
  const t = texturas && e && texturas.get(e.url)
  if (!t || !t.image) return null
  if (SIN_LAMINAS && e.rol !== 'logo' && esLamina(t.image)) return null
  return t
}

// LOS RECORTES TAMBIEN SE REPARTEN, por la misma razon que las frases.
//
// Cinco escenas piden recortes y TODAS empezaban por el primero de la lista. En el render de basecamp
// eso se ve sin ambiguedad: la captura del panel de proyecto aparece en `mesa`, vuelve en `columna` y
// vuelve otra vez en `rafaga` — tres escenas distintas mostrando exactamente la misma imagen, que es
// lo que Thiago describio como "vuelven a aparecer las mismas imagenes que aparecieron en escenas
// atras, no innovan nada".
//
// El cursor avanza por el POZO FILTRADO POR ROL y es global a la pieza, igual que el de las frases:
// `main.js` lo reinicia antes de armar cada video y los arneses antes de cada construccion. Si el
// material se acaba se da la vuelta —repetir es mejor que dejar la escena vacia— y eso se cuenta.
let _cursorEls = 0
export let recortesRepetidos = 0
export const reiniciarRecortes = () => { _cursorEls = 0; recortesRepetidos = 0 }

export function recortesDe(elementos, roles, n = 3) {
  // El pozo se arma en el orden de PRIORIDAD de roles que pide la escena, no en el del documento: una
  // escena que pide ['foto','tarjeta'] quiere una foto primero aunque la tarjeta venga antes en la
  // pagina. Eso ya era asi y se conserva.
  const pozo = []
  for (const rol of [].concat(roles)) {
    for (const e of (elementos || [])) {
      if (e.rol === rol && !pozo.includes(e)) pozo.push(e)
    }
  }
  if (!pozo.length) return []
  const out = []
  for (let k = 0; k < n; k++) {
    if (_cursorEls + k >= pozo.length) recortesRepetidos++
    out.push(pozo[(_cursorEls + k) % pozo.length])
  }
  _cursorEls += Math.min(n, pozo.length)
  return out
}
