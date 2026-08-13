// PLANTILLA "vortice" — la camara no se mueve y aun asi no hay un cuadro quieto.
//
// EL GESTO, Y DE DONDE SALIO
//
// Esta es la primera plantilla de la boveda que no se escribio de memoria. Se midio una referencia
// real —un reel de motion graphics corriendo en pantalla— con `tools/ref-analisis.py`, recortando el
// analisis a la zona de la pantalla y al tramo de los graficos, y se compuso contra esos numeros:
//
//   camara quieta el 75% del tiempo, velocidad 0.0146 del ancho por segundo
//   cortes cada 0.23 s (257 bpm equivalente) SIN cambio de encuadre
//   campo radial: simetria angular 0.743, perfil de centro a borde 0.60 -> 0.33
//   pendiente espectral -4.20, o sea un campo liso, sin grano ni detalle
//   halo de 0.067 del ancho alrededor de las altas luces  =>  bloom fuerte, umbral bajo
//   UNA palabra por plano, centrada, 0.49 del ancho, trazo 0.019 (letra pesada)
//   el tono gira: violeta -> azul -> celeste -> azul en tres segundos
//
// La conclusion de esa tabla es una sola frase, y es contraria a las otras veintinueve plantillas:
// **el movimiento no lo hace la camara, lo hace el fondo y lo hace la tipografia.** Volar aca seria
// traicionar la referencia. La camara hace un empuje minimo y nada mas.
//
// Y EL RITMO CAE SOLO. La referencia corta cada 0.23 s; el motor trabaja a 124 BPM, o sea 0.484 s por
// beat. El MEDIO BEAT de este motor mide 0.242 s. No hay que forzar nada: el golpe del genero es el
// contratiempo de la grilla que ya existe.
//
// POR QUE ESTA PLANTILLA ES NECESARIA
//
// Las veintinueve anteriores resuelven el espacio: corredores, discos, torres, telas. Todas apuestan a
// que la camara viaje. Este genero —el que hace la gente que le arma piezas de producto a Google o a
// una marca de software— apuesta a lo contrario: encuadre fijo, campo vivo, palabra gigante, corte
// duro. Sin una plantilla asi, el catalogo entero tiene un solo tempo.
//
// LOS SEIS TIEMPOS (beats sobre 32)
//   0   ESPACIO   el vortice solo, girando, con el anillo al centro. Ni una letra.
//   4   MARCA     el nombre gigante, centrado, atravesado por el nucleo.
//   9   PROMESA   el claim en renglones, apenas sobre el eje.
//   15  PRUEBA    la pagina del cliente entra desde el fondo y gira sobre el campo.
//   22  RAZONES   las cifras y las frases, UNA POR GOLPE, como la referencia.
//   28  PEDIDO    el campo se da vuelta a claro y el CTA queda en tinta sobre el.

import { THREE, campoVortice, letras, luz, barra, metal, iluminar } from '../nucleo.js'
import { vueloAvance, entra, sale, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, aclarar } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'vortice',
  nombre: 'Vórtice',
  familia: 'grafico',
  necesita: ['nada'],
  beats: 32,
  tiempos: { espacio: 0, marca: 4, promesa: 9, prueba: 15, razones: 22, pedido: 28 },
  pitch: 'Encuadre fijo y un remolino de color que late en el contratiempo. Palabra gigante por golpe.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes: no hay una
  // rama distinta ni un caso especial. Lo que se modula es el GRADO, nunca la idea.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const respiraciones = []

  iluminar(escena, { key: 0.5, relleno: 0.55 })

  // EL EMPUJE MINIMO. `largo` es una decima parte de lo que usa cualquier otra plantilla, y la deriva
  // es un quinto. No es timidez: la referencia mide 0.0146 del ancho por segundo, que a esta escala es
  // casi cero. Lo que se busca es que el encuadre NO se sienta congelado, no que viaje.
  const DERIVA = 0.10
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: distBase * 0.22 * R.velocidad, desde: 1.0, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  // ---------------------------------------------------------------- el campo
  //
  // Tres colores y no cuatro. `campoDegradado` usa cuatro porque reparte manchas por el cuadro; aca la
  // estructura es radial y los tres papeles estan definidos: el fondo lejano, el cuerpo del remolino y
  // el nucleo. Un cuarto color no tendria donde vivir.
  // EL REGISTRO DEL MUNDO DECIDE LA INTENSIDAD, Y HAY QUE MEDIRLO, NO SUPONERLO.
  //
  // La referencia es oscura y saturada. Componer siempre asi seria ignorar que la mitad de las paginas
  // que entran a Boveda tienen fondo blanco — y la primera foto de esta plantilla lo demostro: sobre
  // basecamp, que es `bg` blanco, el campo salio blanco con humo y el texto (que `nivelTexto` elige
  // OSCURO porque el mundo es claro) quedo sobre el unico sitio saturado del cuadro.
  //
  // Asi que se mide la luminancia del fondo real. SOBRE LA CADENA HEX y dividiendo por 255, que es la
  // unica forma correcta en este motor: `new THREE.Color(hex).r` devuelve LINEAL y hunde la cuenta.
  const _lumHex = (h) => {
    const c = String(h || '#000000').replace('#', '')
    const v = c.length === 3 ? c.split('').map(x => parseInt(x + x, 16)) : [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16))
    return (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255
  }
  const _mez = (a, b, k) => {
    const A = String(a).replace('#', ''), B = String(b).replace('#', '')
    const g = (h, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16)
    return '#' + [0, 1, 2].map(i => Math.round(g(A, i) + (g(B, i) - g(A, i)) * k).toString(16).padStart(2, '0')).join('')
  }
  const CLAROMUNDO = _lumHex(LOOK.bg) > 0.5
  // EL OSCURO Y EL CLARO DEL MUNDO, sin suponer cual es cual. `nivel(0)` es `bg` y `nivel(1)` es
  // `tinta`, y cual de los dos es el oscuro depende del aire: en un aire claro la tinta es negra, en
  // uno nocturno es casi blanca. Se mide, no se asume — es el mismo error que ya costo dos lamparas
  // negras en otras plantillas.
  const OSCURO = CLAROMUNDO ? nivel(1) : nivel(0)
  const CLARIN = CLAROMUNDO ? nivel(0) : nivel(1)

  // `R.paleta` NO ES UNA LISTA DE COLORES: es una lista de `{hex, peso, croma, lum}`. Indexarla y
  // usar el elemento como color da `[object Object]`, que `THREE.Color` acepta sin chistar y pinta
  // BLANCO — y un campo blanco a pantalla completa es, exactamente, la pantalla blanca que costo
  // cuatro tandas de fotos aca. El accesor correcto es `colorDePeso`, que ademas filtra por croma y
  // por luminancia; usarlo no es una preferencia de estilo, es la unica forma de leer esa estructura.
  const ACENTO = colorDePeso(R, LOOK.acento, 0.20)
  // EL NUCLEO ES EL MISMO COLOR, MAS CLARO — no `LOOK.acento2`. El segundo acento del aire puede ser
  // de otra familia (en basecamp sale un caqui) y ahi el centro del remolino queda de un color que no
  // tiene nada que ver con el resto: se ve como una mancha, no como una fuente de luz. En la
  // referencia el nucleo es literalmente el mismo tono del campo, subido de valor.
  const ACENTO2 = aclarar(ACENTO, 1.55)

  // ESTA PLANTILLA CONSTRUYE SU PROPIO SUELO, Y ES LA PRIMERA DE LA BOVEDA QUE LO HACE.
  //
  // Las otras veintinueve componen sobre el fondo del mundo, asi que `nivelTexto` les garantiza el
  // contraste y no hay mas que hablar. Aca el suelo es un remolino que ocupa el cuadro entero, y el
  // genero que se replica es OSCURO Y SATURADO — medido: brillo 0.44 con nucleo encendido, saturacion
  // 0.53, halo de 0.067 del ancho. Componerlo claro porque la pagina del cliente es clara seria
  // replicar otra cosa.
  //
  // Se intento primero la version que respeta el mundo, y las fotos la refutaron dos veces seguidas:
  // con `bg` blanco de suelo, el campo entero queda a un paso del blanco y el bloom —que este genero
  // necesita fuerte— lo termina de quemar. Las seis fotos salieron en blanco con la palabra flotando.
  //
  // Asi que el suelo es oscuro siempre y la tinta va forzada a claro con `op.tinta`, que existe para
  // esto (ver la cabecera de `bloques.js`). Lo que sigue viniendo del mundo es el COLOR: el acento de
  // la marca es el que pinta el remolino, y por eso dos paginas distintas siguen dando dos piezas
  // distintas.
  const CBASE = _mez(OSCURO, ACENTO, 0.10)
  const CCUERPO = ACENTO
  const CNUCLEO = _mez(ACENTO2, CLARIN, 0.34)
  // La tinta de esta plantilla: el claro del mundo empujado hacia el blanco. No blanco puro —eso
  // pierde el tinte del aire y las treinta piezas dejarian de sentirse del mismo estudio.
  const TINTA = _mez(CLARIN, '#ffffff', CLAROMUNDO ? 0.55 : 0.30)
  const uCampo = campoVortice(escena, {
    camara, colores: [CBASE, CCUERPO, CNUCLEO],
    aspecto: mundoW / mundoH,
    // `dureza` de la pagina: un sitio anguloso pide filamentos finos y muchos; uno blando, brazos
    // gruesos. Es el unico parametro del remolino que la pagina decide.
    brazos: 2.6 + R.dureza * 1.8,
    vel: 0.30 + R.velocidad * 0.10,
    giro: 1.22, nucleo: 0.26, vineta: 0.46,
    // La banda vuelve al suelo del campo, no al fondo del mundo: el suelo ya es oscuro y la tinta ya
    // es clara, asi que lo unico que hace falta es CALMAR el remolino donde vive la palabra.
  })

  // ---------------------------------------------------------------- el anillo
  //
  // El unico cuerpo de verdad de la pieza, y esta en la referencia: un toro luminoso en el centro que
  // la palabra atraviesa. Sirve para dos cosas a la vez — le da un eje 3D al campo, que es plano, y le
  // pone al texto un borde detras en vez de una mancha.
  const gAnillo = new THREE.Group()
  gAnillo.position.z = zEn(16, distBase * 0.62)
  escena.add(gAnillo)
  // FINO. La primera version le puso un tubo de 0.075 del radio y quedo un aro opaco pintado encima
  // de las seis fotos, identico en todas: no se leia como luz sino como un circulo dibujado. Un anillo
  // luminoso se hace con poco cuerpo y mucho halo —de eso se encarga el bloom—, no con espesor.
  const RA = mundoW * 0.30
  const toro = new THREE.Mesh(new THREE.TorusGeometry(RA, RA * 0.020, 14, 128), luz(CNUCLEO, 1.25))
  toro.material.transparent = true
  toro.material.opacity = 0.88
  toro.material.depthWrite = false
  gAnillo.add(toro)
  const toro2 = new THREE.Mesh(new THREE.TorusGeometry(RA * 1.34, RA * 0.010, 10, 128), luz(CCUERPO, 1.0))
  toro2.material.transparent = true
  toro2.material.opacity = 0.42
  toro2.material.depthWrite = false
  toro2.position.z = -RA * 0.4
  gAnillo.add(toro2)
  // Y CRECE A LO LARGO DE LA PIEZA. Un anillo del mismo tamano en los seis tiempos es un marco; uno
  // que se abre acompana el relato sin que la camara tenga que moverse — que es todo el problema que
  // esta plantilla resuelve. Va por tween, no por `alSeek`: es un gesto con principio y fin.
  tl.fromTo(gAnillo.scale, { x: 0.52, y: 0.52, z: 0.52 },
    { x: 1.30, y: 1.30, z: 1.30, duration: b(meta.beats), ease: 'none' }, 0)

  // ESQUIRLAS DE VERDAD, no solo las del shader. El shader las dibuja planas y perfectas; estas tienen
  // profundidad y por eso se desalinean con el campo cuando la camara empuja. Esa desalineacion es la
  // unica pista de que hay volumen, y sin ella la pieza se lee como un video 2D.
  const esquirlas = new THREE.Group()
  gAnillo.add(esquirlas)
  const NES = 18
  for (let i = 0; i < NES; i++) {
    const a = (i / NES) * Math.PI * 2 + (i % 3) * 0.11
    const largo = RA * (0.12 + (i % 5) * 0.07)
    const e = barra(largo, RA * 0.012, i % 2 ? CNUCLEO : CCUERPO, 1.5)
    e.material.transparent = true
    e.material.opacity = 0.75
    e.material.depthWrite = false
    e.userData.a = a
    e.userData.r0 = RA * (0.55 + (i % 7) * 0.13)
    e.userData.v = 0.35 + (i % 4) * 0.22
    e.userData.z = (i % 5 - 2) * RA * 0.22
    esquirlas.add(e)
  }

  // ---------------------------------------------------------------- los bloques
  //
  // MEDIDO: la palabra ocupa 0.49 del ancho de una pantalla 16:9. Este cuadro es 9:16, asi que lo que
  // se conserva no es la fraccion sino el GESTO — una sola palabra, centrada, del ancho util entero.
  // `letras` la achica sola si no entra, que es lo que hace que "Nombre Muy Largo S.A." no rompa la
  // composicion.
  // EL SEGUNDO ARGUMENTO DE `UTIL` ES LA PROFUNDIDAD, NO UN MARGEN, y confundirlo es como salio
  // "BASECAMD" con la B y la P cortadas en la primera foto: la marca esta a 0.80 del lente, donde el
  // cuadro mide 0.80 del ancho, y se le habia pedido 0.94 — un 18% mas de lo que entra.
  const marca = bloqueMarca({ alto: 1.9, anchoMax: UTIL(0.80) * 0.94, margen: R.margen, cama: false, tinta: TINTA })
  const promesa = bloquePromesa({ alto: 0.50, anchoMax: UTIL(0.86) * 0.92, cama: false, margen: R.margen, tinta: TINTA })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.58, ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 1.35, anchoMax: UTIL(0.78) * 0.92, margen: R.margen, tinta: TINTA })
  const frases = bloquesFrase(R.frases, { alto: 0.34, anchoMax: UTIL(0.88) * 0.90, cama: false, margen: R.margen, tinta: TINTA })
  const pedido = bloquePedido({ alto: 0.40, anchoMax: UTIL(0.84) * 0.88, margen: R.margen, tinta: TINTA })

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    marca.g.position.set(0, 0.15, zEn(6, distBase * 0.80))
    escena.add(marca.g)
    entra(marca.g, tl, 4, { desde: 'fondo', dist: 5.5, dur: 1.4 })
    marca.escribir(tl, 4.3, 1.0)
    marca.borrar(tl, 7.9)
    sale(marca.g, tl, 8.1, { hacia: 'frente', dist: 5, dur: 0.9 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    promesa.g.position.set(0, 0.1, zEn(11, distBase * 0.86))
    escena.add(promesa.g)
    entra(promesa.g, tl, 9, { desde: 'abajo', dist: 4.5, dur: 1.3 })
    promesa.escribir(tl, 9.4, 0.9)
    promesa.borrar(tl, 13.2)
    sale(promesa.g, tl, 13.4, { hacia: 'arriba', dist: 5, dur: 1.0 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // VA EN `pagina`, o sea en el segundo pase, DESPUES del bloom. El campo esta colgado de la camara y
  // la camara vive en `escena`, asi que el segundo pase no lo dibuja: la pagina del cliente queda
  // encima del remolino y sin florecer. Eso no es casualidad, esta explicado en `nucleo.js`.
  if (prueba) {
    prueba.g.position.set(0, 0, zEn(18, distBase * 0.92))
    pagina.add(prueba.g)
    entra(prueba.g, tl, 15, { desde: 'fondo', dist: 6.5, dur: 1.8 })
    prueba.escribir(tl, 15.2, 1.1)
    prueba.recorrer(tl, 16, 4.6, 0.9)
    tl.to(prueba.g.rotation, { y: 0.26, duration: b(4.4), ease: 'none' }, b(15.8))
    sale(prueba.g, tl, 20.6, { hacia: 'frente', dist: 6, dur: 1.1 })
    respiraciones.push(respirar(prueba.g, { amp: 0.07, giro: 0.018, fase: 1.4 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // UNA POR GOLPE. La referencia cambia de palabra cada 0.23 s y cada palabra ocupa el cuadro entero;
  // eso, con cifras de una pagina real, es exactamente esto: la cifra entra desde el fondo creciendo,
  // se queda un beat y medio, y la siguiente la reemplaza sin que se crucen.
  //
  // El reparto es 1.6 beats por cifra y no 2: a 2 beats la pieza se afloja justo donde el genero pega.
  cifras.forEach((c, i) => {
    const t0 = 22 + i * 1.6
    c.g.position.set(0, 0.2, zEn(t0 + 0.7, distBase * 0.78))
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: 'fondo', dist: 4.2, dur: 0.75 })
    c.escribir(tl, t0 + 0.15, 0.5)
    sale(c.g, tl, t0 + 1.15, { hacia: 'frente', dist: 3.6, dur: 0.6 })
  })
  uso.cifras = cifras.length

  // Las frases van ABAJO y en el contratiempo de las cifras, no encima. Dos textos grandes al centro
  // peleando por el mismo eje es como se arruina un tiempo que ya funcionaba.
  frases.forEach((f, i) => {
    const t0 = 22.8 + i * 1.6
    f.g.position.set(0, -mundoH * 0.26, zEn(t0 + 0.6, distBase * 0.88))
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'izq', dist: 4.0, dur: 0.8 })
    f.escribir(tl, t0 + 0.2, 0.55)
    f.borrar(tl, t0 + 1.15)
    sale(f.g, tl, t0 + 1.3, { hacia: 'der', dist: 4.0, dur: 0.7 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL REMATE ES DAR VUELTA EL REGISTRO. La referencia termina invirtiendo: despues de quince segundos
  // de campo oscuro y saturado, el ultimo plano es blanco con una linea fina en color. Es lo que hace
  // que el cierre se lea como un cierre y no como un plano mas.
  //
  // Se hace tweando LOS COLORES del campo, que son objetos `THREE.Color` con `.r/.g/.b` numericos. Y se
  // hace SOLO con tweens: todo lo demas del campo lo escribe `alSeek`, y mezclar las dos cosas sobre la
  // misma clave es el defecto que `boveda-check` caza eje por eje.
  // EL DESTINO DEL REMATE ES `bg`, EN LOS DOS REGISTROS, y no por prudencia decorativa: `nivelTexto`
  // —que es quien elige el color de TODO el texto de Boveda— garantiza contraste contra `bg` y `bg2`,
  // contra nada mas. Si el campo terminara en un color cualquiera, el CTA del ultimo tiempo quedaria
  // con un contraste que nadie midio.
  //
  // Escrito al reves primero: se hizo "invertir a claro", que en un mundo OSCURO significa ir hacia
  // `tinta` — que en un mundo oscuro es el color CLARO — y ahi el texto tambien es claro. Texto claro
  // sobre fondo claro, en el unico tiempo que la pieza necesita que se lea.
  //
  // El gesto de cierre sigue existiendo y es el mismo: el remolino se apaga, el nucleo se cierra, el
  // bloom baja, y el CTA aterriza sobre el suelo limpio del mundo.
  const CLARO = new THREE.Color(_mez(OSCURO, ACENTO, 0.04))
  const CLARO2 = new THREE.Color(_mez(OSCURO, ACENTO2, 0.16))
  tl.to(uCampo.uC0.value, { r: CLARO.r, g: CLARO.g, b: CLARO.b, duration: b(2.2), ease: E.frena(2) }, b(27.4))
  tl.to(uCampo.uC1.value, { r: CLARO2.r, g: CLARO2.g, b: CLARO2.b, duration: b(2.2), ease: E.frena(2) }, b(27.6))

  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0, zEn(30, distBase * 0.84))
    escena.add(pedido.g)
    entra(pedido.g, tl, 28.6, { desde: 'fondo', dist: 4.0, dur: 1.2 })
    pedido.escribir(tl, 29.0, 0.8)
    latido = pedido.latir(0.035)
    uso.cta = pedido.tieneCta
  }

  // El bloom sube al principio y no baja: medido, el halo alrededor de las altas luces mide 0.067 del
  // ancho, que es mucho. Y baja en el ultimo tiempo, porque sobre fondo claro un bloom fuerte no se
  // lee como resplandor sino como una foto velada.
  // EL BLOOM SUBE, PERO CON TECHO — Y EL TECHO NO ES PRUDENCIA, ES UNA MEDICION QUE FALLO.
  //
  // Medido en la referencia: halo de 0.067 del ancho alrededor de las altas luces, o sea bloom fuerte.
  // La traduccion directa fue "multiplicar por 1.85 lo que pida el aire", y sobre `editorial` (0.14)
  // funciona. Sobre `nocturno`, que pide 1.15, da 2.13: la foto salio con "BASECAMP" convertido en una
  // mancha blanca sin contorno y "10X" igual.
  //
  // El error de razonamiento es el mismo de siempre: se midio el halo de la referencia y se lo aplico
  // como FACTOR, cuando lo que se midio es un ABSOLUTO. Un factor sobre once aires calibrados en un
  // orden de magnitud da once resultados distintos, y solo uno se parece a lo medido.
  //
  // Y esta plantilla puede permitirse menos bloom que ninguna: el resplandor no depende del filtro,
  // porque el campo y el anillo YA emiten. En `nocturno` el techo baja el bloom por debajo de su base,
  // y esta bien que lo haga.
  const BLOOM0 = ctx.bloom.strength || 0.5
  const BLOOMF = Math.min(BLOOM0 * 1.85, 0.55)
  tl.to(ctx.bloom, { strength: BLOOMF, duration: b(3), ease: E.frena(2) }, b(0.5))
  tl.to(ctx.bloom, { strength: BLOOMF * 0.55, duration: b(2.4), ease: E.frena(2) }, b(27.6))

  // ---------------------------------------------------------------- lo continuo
  //
  // ACA VIVE LA PLANTILLA. En las otras veintinueve `alSeek` es el acompanamiento del vuelo; aca es el
  // gesto principal, porque la camara no hace nada.
  //
  // TODO LO QUE SE ESCRIBE ACA ES ASIGNACION, y esta bien que lo sea: ningun tween toca ninguna de
  // estas claves. La regla del motor —SUMAR si un tween anima esa clave, ASIGNAR sobre una base si no
  // la anima nadie— se cumple por construccion: los unicos tweens sobre el campo son los DOS COLORES
  // del remate, y `alSeek` no los toca.
  //
  // Y todo es funcion pura de `t`. No hay estado acumulado, asi que las cuatro submuestras del
  // obturador dan el mismo resultado que daria una sola: el motor sigue siendo determinista y el
  // escalon de color, en vez de saltar feo, sale con un cuadro de transicion que parece intencional.
  const MEDIO = b(0.5)
  const NUC0 = 0.24
  const VIN0 = 0.46
  // LA BANDA SE ABRE CUANDO HAY TEXTO GRANDE Y SE CIERRA CUANDO NO.
  //
  // Los tramos salen de los mismos beats declarados en `meta.tiempos`, no de una lista paralela: una
  // segunda copia de los tiempos es una copia que algun dia va a decir otra cosa que la primera.
  // Cada tramo es [beat de apertura, beat de cierre, fuerza, centro en y del cuadro].
  const T = meta.tiempos
  const BANDAS = [
    [T.marca - 0.6, T.promesa - 0.6, 0.72, 0.50],
    [T.promesa - 0.6, T.prueba - 1.4, 0.68, 0.50],
    [T.razones - 0.6, T.pedido - 0.8, 0.66, 0.47],
    [T.pedido - 0.8, meta.beats + 1, 0.62, 0.50],
  ].map(([a, c, f, y]) => [b(a), b(c), f, y])
  // Seis pasos de tono y ninguno vuelve al anterior. Medidos de la referencia: violeta -> azul ->
  // celeste -> azul -> violeta -> magenta, en radianes de giro sobre el eje gris.
  const TINTES = [0, 0.42, 0.95, 0.58, -0.30, 0.22]
  // Los golpes grandes: el arranque de cada tiempo. Un pulso ahi es lo que hace que el corte de
  // contenido se SIENTA aunque el encuadre no cambie.
  const GOLPES = [meta.tiempos.marca, meta.tiempos.promesa, meta.tiempos.prueba,
    meta.tiempos.razones, meta.tiempos.pedido].map(x => b(x))

  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uCampo.uT.value = t

    // EL CONTRATIEMPO. `paso` avanza cada medio beat = 0.242 s, que es el corte medido (0.23 s).
    const bruto = t / MEDIO
    const paso = Math.floor(bruto)
    const frac = bruto - paso
    uCampo.uTinte.value = TINTES[((paso % TINTES.length) + TINTES.length) % TINTES.length]

    // El golpe: sube de un tiron y decae en el medio beat. Exponente 5 y no 2 — con 2 el brillo queda
    // alto casi todo el intervalo y la pieza se lee lavada en vez de percusiva.
    let pulso = 0.26 * Math.pow(1 - frac, 5)
    for (let i = 0; i < GOLPES.length; i++) {
      const dt = t - GOLPES[i]
      if (dt >= 0 && dt < MEDIO * 2) pulso = Math.max(pulso, 0.62 * Math.pow(1 - dt / (MEDIO * 2), 4))
    }
    uCampo.uPulso.value = pulso
    // Las esquirlas del shader salen disparadas EN el golpe y se apagan entre golpe y golpe. Un valor
    // constante las convierte en una textura de estrella fija, que es lo contrario del efecto.
    uCampo.uEsquirlas.value = 0.18 + 0.95 * Math.pow(1 - frac, 3)

    // El nucleo se abre y se cierra con el mismo pulso, apenas. Y en el ultimo tiempo se apaga: el
    // remate es claro y un nucleo brillante sobre fondo claro es una mancha sin forma.
    const finRamp = Math.min(1, Math.max(0, (t - b(27.4)) / b(2.2)))
    uCampo.uNucleo.value = (NUC0 + pulso * NUC0 * 1.2) * (1 - finRamp * 0.92)
    uCampo.uVineta.value = VIN0 * (1 - finRamp * 0.75)

    // La banda: se busca el tramo activo y se le hacen bordes de medio beat para que no aparezca de
    // golpe. Funcion pura de `t`, como todo lo demas de este bloque.
    let ban = 0, banY = 0.5
    for (let i = 0; i < BANDAS.length; i++) {
      const [ta, tc, f, y] = BANDAS[i]
      if (t >= ta && t < tc) {
        const borde = Math.min(1, (t - ta) / MEDIO) * Math.min(1, (tc - t) / MEDIO)
        if (f * borde > ban) { ban = f * borde; banY = y }
      }
    }
    uCampo.uBanda.value = ban
    uCampo.uBandaY.value = banY

    // El anillo gira siempre y en sentido contrario al campo. Dos giros del mismo signo se leen como
    // uno solo mal antialiasado; opuestos, se leen como dos capas.
    gAnillo.rotation.z = -t * 0.22
    toro2.rotation.z = t * 0.38
    toro.scale.setScalar(1 + pulso * 0.10)

    // Las esquirlas 3D salen del anillo y vuelven. `% 1` las recicla sin acumular estado.
    for (let i = 0; i < esquirlas.children.length; i++) {
      const e = esquirlas.children[i]
      const k = (t * e.userData.v * 0.22 + i / NES) % 1
      const rad = e.userData.r0 * (0.55 + k * 1.5)
      e.position.set(Math.cos(e.userData.a) * rad, Math.sin(e.userData.a) * rad, e.userData.z)
      e.rotation.z = e.userData.a
      e.material.opacity = 0.80 * Math.sin(Math.PI * k) * (0.35 + pulso)
    }
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
