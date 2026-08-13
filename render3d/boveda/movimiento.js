// EL VOCABULARIO DE MOVIMIENTO DE BOVEDA.
//
// POR QUE ESTE ARCHIVO EXISTE, Y ES LA CORRECCION MAS IMPORTANTE DEL MOTOR
//
// Las dos primeras plantillas quedaron por debajo de la vara y la razon no fue tecnica: fue que
// compuse como se compone una escena, no como se compone una template. `reticula` bajaba la camara
// despacio y prendia y apagaba elementos por turno. Eso es "escenas 3D con texto encima".
//
// Una template del genero que estamos replicando tiene tres propiedades que NO son decorativas — son
// lo que la hace leerse como cara:
//
//   1. LA CAMARA NO SE DETIENE NUNCA. Ni un beat. Puede frenar para el pedido, pero frenar es llegar a
//      una velocidad baja, no a cero. Un cuadro con la camara quieta se lee como una diapositiva por
//      buena que sea la tipografia.
//   2. NADA APARECE POR ENCENDIDO. Un elemento que pasa de invisible a visible en su sitio es un
//      cartel. Un elemento que ENTRA —volando, girando, cayendo, barriendo— es motion graphics. La
//      diferencia cuesta cuatro lineas y es la mitad del efecto.
//   3. EL ESPACIO TIENE CAPAS A DISTINTAS VELOCIDADES. Sin paralaje, un vuelo por un espacio vacio es
//      indistinguible de un zoom. Lo que convence de que hay PROFUNDIDAD es que lo cercano pase mas
//      rapido que lo lejano.
//
// Todo lo de aca son helpers para eso. No traen composicion: no deciden que se muestra ni donde. Solo
// resuelven COMO se mueve, que es justamente lo que las doce plantillas tienen que compartir para que
// se sientan del mismo estudio.

import * as THREE from 'three'
import { E, b } from '../demo/kit.js'

// ---------------------------------------------------------------- vuelos de camara
//
// Cada vuelo devuelve `{ zEn, mira }`:
//   `zEn(beat, lectura)` — donde poner algo para que la camara lo lea EN ese beat, a esa distancia.
//     Es el helper que evita el peor defecto de un vuelo continuo: la posicion y el tiempo son la
//     MISMA variable, y elegirlos por separado garantiza que no coincidan. Paso de verdad — la marca
//     se escribia cuatro beats despues de que la camara ya la habia pasado, y la pieza salio muda.
//   `mira` — un Vector3 vivo al que la camara tiene que mirar en `alSeek`, si el vuelo lo necesita.

// AVANCE: la camara entra por un eje y no para. El vuelo mas caro de fingir y el que mejor rinde en 3D.
export function vueloAvance(camara, tl, op) {
  const { distBase, beats, largo } = op
  const Z0 = distBase * (op.desde != null ? op.desde : 0.9)
  const ZF = Z0 - largo
  tl.fromTo(camara.position, { z: Z0 }, { z: ZF, duration: b(beats), ease: 'none' }, 0)
  // Y UNA DERIVA LATERAL Y VERTICAL QUE NUNCA SE REPITE. Un vuelo en linea recta perfecta se lee como
  // un riel de tren: correcto y muerto. Dos senos de periodos que no son multiplos entre si no vuelven
  // a alinearse nunca, asi que el movimiento nunca se siente en bucle.
  const amp = op.deriva != null ? op.deriva : 0.5
  const alSeek = (t) => {
    camara.position.x = Math.sin(t * 0.37) * amp
    camara.position.y = Math.sin(t * 0.23 + 1.7) * amp * 0.55
    // Un balanceo minimo en z: es lo que separa "una camara" de "un trackeo por software".
    camara.rotation.z = Math.sin(t * 0.19 + 0.4) * 0.012
  }
  return {
    zEn: (beat, lectura) => Z0 + (ZF - Z0) * (Math.min(beat, beats) / beats) - lectura,
    alSeek,
  }
}

// ORBITA: la camara gira alrededor de un eje mientras se acerca. Sirve cuando hay UN objeto
// protagonico: mostrarlo desde varios angulos es lo que lo convierte en volumen y no en silueta.
export function vueloOrbita(camara, tl, op) {
  const { distBase, beats } = op
  const r0 = distBase * (op.radio0 != null ? op.radio0 : 1.35)
  const r1 = distBase * (op.radio1 != null ? op.radio1 : 0.85)
  const vueltas = op.vueltas != null ? op.vueltas : 0.62
  const alto0 = op.alto0 != null ? op.alto0 : 3.2
  const alto1 = op.alto1 != null ? op.alto1 : 0.2
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(beats), ease: 'none' }, 0)
  const mira = new THREE.Vector3(0, op.miraY != null ? op.miraY : 0, 0)
  const alSeek = () => {
    const k = est.k
    const a = k * vueltas * Math.PI * 2 + (op.fase || 0)
    const r = r0 + (r1 - r0) * k
    camara.position.set(Math.sin(a) * r, alto0 + (alto1 - alto0) * k, Math.cos(a) * r)
    camara.lookAt(mira)
  }
  // DONDE PONER ALGO PARA QUE LA ORBITA LO LEA EN SU BEAT — el equivalente de `zEn` para este vuelo.
  //
  // Es la misma trampa que documenta `vueloAvance` y hay que resolverla igual: en un vuelo continuo la
  // POSICION y el TIEMPO son la misma variable, y elegirlas por separado garantiza que no coincidan.
  // Con una orbita es peor que con un avance, porque el error no se ve como "llego tarde" sino como
  // "nunca estuvo": el objeto queda del otro lado del eje y no aparece en ningun cuadro.
  //
  // Devuelve la posicion Y el giro con que hay que plantarlo para que quede DE FRENTE a la camara en
  // ese instante. `frac` es que tan cerca del centro se para (0 = en el eje, 1 = donde esta la camara).
  const puntoEn = (beat, frac, alturaY) => {
    const k = Math.min(beat, beats) / beats
    const a = k * vueltas * Math.PI * 2 + (op.fase || 0)
    const r = (r0 + (r1 - r0) * k) * (frac != null ? frac : 0.45)
    return {
      pos: new THREE.Vector3(Math.sin(a) * r, alturaY != null ? alturaY : (alto0 + (alto1 - alto0) * k) * 0.5, Math.cos(a) * r),
      // La camara esta en ese mismo angulo mirando al centro, asi que un objeto girado `a` en Y la
      // encara. Sin esto se ve de canto, que en un plano es no verse.
      yaw: a,
      // Y A QUE DISTANCIA DEL LENTE QUEDA, que es lo que hace falta para dimensionarlo.
      //
      // La camara esta a `R` del eje y el objeto a `frac·R` sobre la misma linea, asi que los separan
      // `(1 - frac)·R` — y NO `distBase`. Medir el ancho de un bloque contra `distBase` cuando esta a
      // 0.43 de eso lo hace verse dos veces y media mas grande de lo calculado: el claim de `vitral`
      // salia cortado a los dos lados con el numero "bien" puesto.
      dist: (r0 + (r1 - r0) * k) - r,
    }
  }
  return { est, mira, alSeek, puntoEn, radioEn: (k) => r0 + (r1 - r0) * k }
}

// DESLIZ LATERAL: la camara viaja de costado por delante de una fila de objetos. Es el vuelo que mejor
// aprovecha un formato vertical, porque cada objeto entra por un borde y sale por el otro.
export function vueloDesliz(camara, tl, op) {
  const { distBase, beats, largo } = op
  const X0 = -largo / 2
  const X1 = largo / 2
  tl.fromTo(camara.position, { x: X0 }, { x: X1, duration: b(beats), ease: 'none' }, 0)
  camara.position.z = distBase * (op.dist != null ? op.dist : 0.95)
  const alSeek = (t) => {
    camara.position.y = Math.sin(t * 0.29) * 0.42
    camara.position.z = distBase * (op.dist != null ? op.dist : 0.95) + Math.sin(t * 0.17) * 0.7
    camara.rotation.z = Math.sin(t * 0.21) * 0.008
  }
  return {
    xEn: (beat) => X0 + (X1 - X0) * (Math.min(beat, beats) / beats),
    alSeek,
  }
}

// EL ANCHO QUE DE VERDAD SE PUEDE USAR CUANDO LA CAMARA DERIVA.
//
// Un vuelo en linea recta perfecta se lee como un riel, asi que todos los vuelos de aca llevan una
// deriva lateral. El precio es que el cuadro se CORRE: un elemento centrado y del ancho del cuadro
// queda cortado justo cuando la deriva llega a su maximo.
//
// Se vio en `atrio`: el nombre de la marca, compuesto al 86% del ancho, salia con la B comida en el
// beat 7 — que es exactamente donde la deriva pasaba por su pico. El defecto no estaba en el 86%: el
// 86% se midio contra un cuadro que no era el que iba a haber.
//
// Es el mismo idioma que `cuadroMasAngosto` en el otro motor, para el otro eje: se mide contra el
// cuadro que VA A HABER, no contra el de reposo.
// Y LA PROFUNDIDAD IMPORTA, en los dos sentidos y en direcciones opuestas. A `k · distBase` el cuadro
// mide `k · mundoW` —mas angosto si el objeto esta mas cerca— mientras que la deriva sigue midiendo lo
// mismo en unidades de mundo. O sea que acercar un bloque le quita ancho DOS VECES.
//
// NO SE LLAMA `anchoUtil` aunque eso diria: `kit.js` YA exporta un `anchoUtil` que significa otra cosa
// —el ancho segun el margen del mobiliario— y toda plantilla importa de los dos modulos. Dos nombres
// iguales con dos significados distintos en el mismo archivo es un error que no da sintomas.
//
// Con `k` en 1 esto se olvidaba, y por eso la primera version de este helper no alcanzo: la marca de
// `atrio` esta a 0.92, donde el cuadro mide 5.17 y no 5.62, y seguia saliendo cortada despues de
// "arreglarla".
export const anchoConDeriva = (mundoW, deriva, k) => (k != null ? k : 1) * mundoW - 2 * (deriva != null ? deriva : 0.5)

// EL ANCHO UTIL A UNA DISTANCIA CUALQUIERA DEL LENTE.
//
// `anchoConDeriva` responde la pregunta para un objeto a `k · distBase`, que es como se colocan las
// cosas en un vuelo de avance. En una orbita, en un vuelo sobre curva o en cualquier espacio donde el
// bloque se planta por geometria y no por profundidad, lo que se conoce es la DISTANCIA — y traducirla
// a un `k` a mano es justo donde se cuela el error.
//
// El cuadro crece linealmente con la distancia: a `d` del lente mide `mundoW · d / distBase`.
export const anchoADistancia = (mundoW, distBase, dist, deriva) =>
  Math.max(0.5, mundoW * (dist / distBase) - 2 * (deriva || 0))

// ---------------------------------------------------------------- entradas y salidas
//
// LA REGLA: NADA APARECE POR ENCENDIDO. Un elemento que pasa de invisible a visible EN SU SITIO es un
// cartel; uno que llega desde afuera es motion graphics. Estos helpers son la diferencia, y son cuatro
// lineas cada uno justamente para que no haya excusa para no usarlos.
//
// Todos escriben sobre el grupo CONTENEDOR, no sobre la malla: asi la mascara de texto (`uProg`) queda
// libre para el gesto de ESCRITURA, y los dos se pueden componer — la palabra se escribe mientras el
// bloque todavia esta llegando, que es exactamente como se ve caro.

const DESDE = {
  izq: (d) => ({ x: -d, y: 0, rotY: 0.5, rotZ: 0.06 }),
  der: (d) => ({ x: d, y: 0, rotY: -0.5, rotZ: -0.06 }),
  arriba: (d) => ({ x: 0, y: d, rotX: 0.4, rotZ: 0.03 }),
  abajo: (d) => ({ x: 0, y: -d, rotX: -0.4, rotZ: -0.03 }),
  fondo: (d) => ({ z: -d * 1.6, escala: 0.62 }),
  frente: (d) => ({ z: d * 0.9, escala: 1.5 }),
}

export function entra(g, tl, t0, op) {
  op = op || {}
  const d = op.dist != null ? op.dist : 5.5
  const desde = (DESDE[op.desde] || DESDE.abajo)(d)
  const dur = op.dur != null ? op.dur : 1.5
  const ease = op.ease || E.llega(2.2)
  const p0 = { x: g.position.x, y: g.position.y, z: g.position.z }
  const r0 = { x: g.rotation.x, y: g.rotation.y, z: g.rotation.z }
  const e0 = g.scale.x

  // SE ESTACIONA AFUERA DESDE EL CUADRO CERO, y esto no es un detalle.
  //
  // Con `immediateRender: false` el objeto se queda en su posicion FINAL hasta que arranca su tween, o
  // sea VISIBLE Y QUIETO en el medio del cuadro durante todos los beats anteriores. En un vuelo eso es
  // peor que un cartel: se ven cuatro bloques de texto flotando en el pasillo esperando su turno.
  // Medido en la primera version de `atrio`: en el beat 3 ya se veian el claim, las dos frases y la
  // pagina, todos parados en el aire.
  //
  // Se lo manda al punto de partida en t=0 con un `set`, asi antes de su entrada esta afuera del
  // cuadro. Encenderlo estando afuera no contradice la regla de "nada aparece por encendido": la regla
  // es sobre lo que el espectador VE, y lo que pasa fuera del encuadre no lo ve nadie.
  tl.set(g.position, {
    x: p0.x + (desde.x || 0), y: p0.y + (desde.y || 0), z: p0.z + (desde.z || 0),
  }, 0)
  if (desde.escala) tl.set(g.scale, { x: e0 * desde.escala, y: e0 * desde.escala, z: e0 * desde.escala }, 0)
  tl.set(g, { visible: false }, 0)
  tl.set(g, { visible: true }, b(t0))

  tl.fromTo(g.position,
    { x: p0.x + (desde.x || 0), y: p0.y + (desde.y || 0), z: p0.z + (desde.z || 0) },
    { x: p0.x, y: p0.y, z: p0.z, duration: b(dur), ease, immediateRender: false }, b(t0))
  if (desde.rotX || desde.rotY || desde.rotZ) {
    tl.fromTo(g.rotation,
      { x: r0.x + (desde.rotX || 0), y: r0.y + (desde.rotY || 0), z: r0.z + (desde.rotZ || 0) },
      { x: r0.x, y: r0.y, z: r0.z, duration: b(dur * 1.15), ease, immediateRender: false }, b(t0))
  }
  if (desde.escala) {
    tl.fromTo(g.scale, { x: e0 * desde.escala, y: e0 * desde.escala, z: e0 * desde.escala },
      { x: e0, y: e0, z: e0, duration: b(dur), ease, immediateRender: false }, b(t0))
  }
  return g
}

export function sale(g, tl, t0, op) {
  op = op || {}
  const d = op.dist != null ? op.dist : 6.5
  const hacia = (DESDE[op.hacia] || DESDE.arriba)(d)
  const dur = op.dur != null ? op.dur : 1.0
  const ease = op.ease || E.acelera(2.6)
  tl.to(g.position, {
    x: g.position.x + (hacia.x || 0), y: g.position.y + (hacia.y || 0),
    z: g.position.z + (hacia.z || 0), duration: b(dur), ease,
  }, b(t0))
  if (hacia.rotX || hacia.rotY || hacia.rotZ) {
    tl.to(g.rotation, {
      x: g.rotation.x + (hacia.rotX || 0) * 1.4, y: g.rotation.y + (hacia.rotY || 0) * 1.4,
      z: g.rotation.z + (hacia.rotZ || 0) * 1.4, duration: b(dur * 1.1), ease,
    }, b(t0))
  }
  // Y SE APAGA AL TERMINAR DE SALIR. En una plantilla con vuelo, un objeto que "ya salio" sigue en el
  // camino: la camara lo alcanza unos beats despues y lo atraviesa de cerca. En `atrio` eso puso la
  // pagina del cliente A DOS UNIDADES DEL LENTE en el beat 28 — dos estrellas de un testimonio
  // ocupando media pantalla, cuando ese tiempo ya era el de las cifras.
  //
  // Salir del cuadro no alcanza; hay que dejar de existir. Se apaga cuando ya no se ve, asi que el
  // apagado en si nunca se percibe.
  tl.set(g, { visible: false }, b(t0 + dur * 1.2))
  return g
}

// ---------------------------------------------------------------- acompanar a la camara
//
// CUANTO DURA UN OBJETO QUIETO EN UN VUELO QUE NO PARA. La cuenta es simple y decide la mitad del
// ritmo de una plantilla: si la camara recorre `v` unidades por beat y el cuadro mide `mundoW`, un
// objeto plantado en un punto fijo se ve durante `mundoW / v` beats y ni uno mas.
//
// En `reticula` eso daban cinco beats — y el tiempo de PRUEBA dura ocho, y el de PEDIDO seis. El
// resultado no fue "se ve poco": fue la pagina desapareciendo a mitad de su propio tiempo y el CTA
// entrando fuera de cuadro y llegando recien tres beats despues. La sonda lo marco como "encendido
// pero NO se ve" y tenia razon.
//
// La respuesta del genero no es frenar la camara —eso rompe la regla 1— sino que los bloques LARGOS
// VIAJEN. Un objeto que acompana a la camara sigue teniendo movimiento relativo contra el fondo, que
// es de donde sale la sensacion de velocidad; simplemente no se sale del cuadro.
//
//   `retraso` 1.0  clavado al cuadro. Es lo que corresponde al CTA final: el ultimo bloque de una
//                  pieza tiene que quedarse quieto respecto del ojo aunque el mundo siga corriendo.
//   `retraso` 0.7  se queda atras despacio. Para la pagina: dura todo su tiempo y ademas se percibe
//                  que la camara la esta pasando, que es lo que la vuelve un objeto del espacio.
//   `retraso` 0    no acompana. Equivale a no llamar a esto.
export function acompanar(g, tl, t0, t1, en, retraso) {
  const r = retraso != null ? retraso : 1
  const x0 = en(t0), x1 = en(t1)
  tl.to(g.position, { x: g.position.x + (x1 - x0) * r, duration: b(t1 - t0), ease: 'none' }, b(t0))
  return g
}

// ---------------------------------------------------------------- paralaje
//
// CAPAS A DISTINTAS VELOCIDADES. Sin esto, volar por un espacio vacio es indistinguible de un zoom: no
// hay contra que medir el avance. Con tres capas a velocidades distintas, el ojo reconstruye la
// profundidad solo — es el efecto mas barato y mas convincente del genero.
//
// Devuelve una funcion para `alSeek`. La capa se REPITE: cuando un elemento pasa detras de la camara,
// vuelve al fondo. Asi un espacio de treinta unidades se siente infinito.
export function paralaje(capas) {
  return (t) => {
    for (const c of capas) {
      const largo = c.largo || 30
      const av = (t * (c.vel || 1)) % largo
      c.grupo.position.z = (c.z0 || 0) + av
      if (c.gira) c.grupo.rotation.y = t * c.gira
    }
  }
}

// Una capa de elementos repartidos a lo largo de un eje, para paralaje. No compone nada: devuelve el
// grupo y sus hijos para que la plantilla decida que meterles adentro.
export function capa(escena, n, sep, hacer) {
  const g = new THREE.Group()
  const hijos = []
  for (let i = 0; i < n; i++) {
    const h = hacer(i)
    if (!h) continue
    h.position.z = -i * sep
    g.add(h)
    hijos.push(h)
  }
  escena.add(g)
  return { grupo: g, hijos, largo: n * sep }
}

// ---------------------------------------------------------------- respiracion
//
// LO QUE NUNCA PARA. Un objeto protagonico quieto durante ocho beats mata la pieza aunque la camara se
// mueva. Esto le da una deriva continua que no se lee como animacion sino como que el objeto ESTA VIVO.
// Va en `alSeek` y no en tweens: tiene que evaluarse en cada submuestra del obturador o sale a saltos
// justo donde el obturador deberia barrerlo.
// SUMARLE ALGO A LO QUE ESCRIBIO LA LINEA DE TIEMPO, SIN PISARLA Y SIN ACUMULAR.
//
// Es el problema mas sutil de este motor y se equivoco tres veces, cada una arreglando la anterior:
//
//   1. ASIGNAR.     `seek()` corre `tl.time(t)` y despues `alSeek(t)`, asi que asignar pisa el tween.
//                   La pagina de `atrio` perdio su entrada y su giro; el CTA aparecia abierto de golpe.
//   2. SUMAR (`+=`) Arregla lo anterior y rompe otra cosa: gsap no vuelve a escribir una propiedad
//      o MULTIPLICAR  cuyo tween ya termino —no tiene por que— y el video busca la linea de tiempo
//      (`*=`).      CUATRO veces por cuadro para el obturador. Fuera de la ventana del tween el valor
//                   se suma sobre si mismo ~120 veces por segundo. Medido con
//                   `tools/boveda-obturador-check.mjs`: las 31 plantillas divergian, de 1,4 a 38,3
//                   unidades de mundo, en un cuadro que mide 5,6 de ancho.
//   3. ESTO.        Se recuerda lo que se dejo escrito. Si al volver el valor es exactamente ese,
//                   nadie lo toco y la base sigue siendo la de antes; si es otro, lo escribio un tween
//                   en este mismo seek y esa es la base nueva.
//
// La comparacion por igualdad exacta de flotantes es deliberada y es lo que hace que esto funcione:
// no se pregunta "cambio mucho" sino "lo escribio alguien". Si nadie escribio, los bits son los
// mismos. Y no hace falta saber de antemano que ejes anima la plantilla — que es justo lo que no se
// puede saber desde aca.
//
// Devuelve `aplicar(campo, eje, delta)` para sumar y `aplicarPor(campo, eje, factor)` para multiplicar.
export function sumador(obj) {
  const memo = {}
  const base = (clave, actual) => {
    const m = memo[clave]
    return (m && actual === m.salida) ? m.base : actual
  }
  return {
    aplicar(campo, eje, delta) {
      const clave = campo + eje
      const b0 = base(clave, obj[campo][eje])
      const salida = b0 + delta
      obj[campo][eje] = salida
      memo[clave] = { base: b0, salida }
    },
    aplicarPor(campo, eje, factor) {
      const clave = campo + eje
      const b0 = base(clave, obj[campo][eje])
      const salida = b0 * factor
      obj[campo][eje] = salida
      memo[clave] = { base: b0, salida }
    },
  }
}

export function respirar(obj, op) {
  op = op || {}
  const a = op.amp != null ? op.amp : 0.12
  const g = op.giro != null ? op.giro : 0.06
  const f = op.fase != null ? op.fase : 0
  // SUMA, NO ESCRIBE — y la primera version escribia, que es un defecto sin sintomas visibles y por eso
  // el peor de todos.
  //
  // Guardaba la posicion del objeto al construirlo y en cada seek la volvia a poner. Como `seek()`
  // corre `tl.time(t)` PRIMERO y `alSeek(t)` DESPUES, eso pisaba la salida de la linea de tiempo: en
  // `atrio`, la pagina del cliente tenia una entrada volando desde la derecha y un giro de 7 beats, y
  // los dos quedaban anulados. La pieza no fallaba ni se veia rota — simplemente la pagina aparecia
  // quieta en su sitio final, o sea justo lo que la regla 2 prohibe, en la plantilla de referencia.
  //
  // ...Y SUMAR A SECAS TAMPOCO ERA CORRECTO, que es la segunda mitad de esta historia y costo mas que
  // la primera.
  //
  // Aca decia: "sumar no acumula porque cada submuestra del obturador vuelve a evaluar la linea de
  // tiempo antes de llamar aca, asi que el valor de partida siempre es el del tween". Eso vale MIENTRAS
  // EL TWEEN CORRE. Terminado el tween, gsap no vuelve a escribir la propiedad aunque se siga buscando
  // la linea de tiempo: no tiene por que, el valor ya es el final. Y `entra(desde:'fondo')` solo anima
  // `z` y la escala, asi que `rotation.x`, `rotation.z` y `position.y` de ese bloque no los anima NADIE
  // en toda la pieza.
  //
  // O sea que el `+=` se sumaba sobre su propio resultado, cuatro veces por cuadro, ~120 veces por
  // segundo. Medido con `tools/boveda-obturador-check.mjs`: en `vortice` el estado a los 4,8 s difiere
  // en 18,97 unidades de mundo segun cuantas muestras se hayan tomado para llegar. Un bloque a 19
  // unidades de donde deberia estar, en un cuadro que mide 5,6 de ancho, es un bloque que no esta.
  //
  // No lo cazaba nada: `boveda-check` llama a `alSeek` UNA vez, la sonda una por beat y las fotos 24 en
  // toda la pieza. Solo aparecia en el video, y aparecia como "se fue" sin ningun error. Por eso ahora
  // hay una compuerta que compara una pasada de una muestra por cuadro contra una de cuatro.
  //
  // LA SALIDA, que tiene que servir para los dos casos a la vez: se recuerda lo que ESTE respirar dejo
  // escrito. Si al volver el valor es exactamente ese, nadie lo toco y la base es la de antes; si es
  // otro, lo escribio un tween en este mismo seek y esa es la base nueva. Ni pisa ni acumula, y no hay
  // que saber de antemano que ejes anima la plantilla — que es justo lo que nadie puede saber desde
  // aca.
  // ...Y NI SIQUIERA `sumador` ALCANZA SI SE ESCRIBE DONDE TAMBIEN ESCRIBE UN TWEEN. Cuarta version, y
  // esta es la que la compuerta deja pasar.
  //
  // `sumador` arregla la acumulacion, pero queda un efecto mas fino y peor: `tl.to(obj.rotation, {y})`
  // NO guarda su valor de partida al crearse sino la primera vez que se lo renderiza. Si en ese
  // instante la respiracion ya sumo su delta, el tween arranca desde un punto que incluye la
  // respiracion — y COMO el primer renderizado cae en una submuestra distinta segun cuantas haya, la
  // trayectoria entera del tween cambia. Medido en `duna`: la misma pieza da 0.443 con una muestra por
  // cuadro y 0.528 con cuatro, a partir del segundo 11,9 y por el resto del tiempo del tween.
  //
  // La unica salida limpia es no compartir la propiedad. La respiracion pasa a un grupo INTERNO que se
  // mete entre `obj` y sus hijos: los tweens siguen escribiendo `obj` como siempre y la respiracion
  // escribe el interno, que no lo toca nadie. Asignar ahi es ademas lo correcto —no hay nada que
  // preservar— asi que no hace falta ni `sumador` ni recordar bases.
  //
  // LO QUE HAY QUE SABER PARA USARLO: los hijos que `obj` tenga DESPUES de esta llamada quedan afuera
  // del grupo interno y no respiran. En las 31 plantillas `respirar()` se llama cuando el bloque ya
  // esta armado, que es lo natural; si alguna vez hace falta al reves, se le pasa el grupo interno.
  const gi = new THREE.Group()
  while (obj.children.length) gi.add(obj.children[0])
  obj.add(gi)
  return (t) => {
    gi.position.set(Math.sin(t * 0.61 + f) * a * 0.7,
      Math.sin(t * 0.74 + f * 1.7) * a,
      Math.sin(t * 0.43 + f * 2.3) * a * 0.5)
    gi.rotation.set(Math.sin(t * 0.51 + f) * g * 0.5,
      Math.sin(t * 0.39 + f * 1.3) * g,
      Math.sin(t * 0.29 + f * 0.7) * g * 0.35)
  }
}

// Junta varios `alSeek` en uno. Una plantilla tiene vuelo, paralaje y respiraciones a la vez, y sin
// esto cada una tiene que acordarse de llamar a todas.
export function juntar(...fns) {
  const vivas = fns.filter(Boolean)
  return (t) => { for (const f of vivas) f(t) }
}
