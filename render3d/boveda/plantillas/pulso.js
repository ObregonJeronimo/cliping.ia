// PLANTILLA "pulso" — la hermana clara de `vortice`: mismo genero, regla de fondo opuesta.
//
// POR QUE EXISTE ESTA Y NO OTRA VARIACION DEL REMOLINO
//
// `vortice` salio de medir una referencia y de esa medicion quedaron tres cosas que son el GENERO, y
// una cuarta que era solo esa pieza:
//
//   del genero  ->  encuadre fijo · el golpe cada medio beat · UNA palabra gigante por golpe
//   de la pieza ->  el suelo oscuro y saturado
//
// Confundir las dos es como se hace un catalogo de treinta plantillas que se ven igual. `vortice`
// construye su propio suelo oscuro y por eso tiene que hacerse cargo de la tinta; `pulso` hace lo
// contrario —se apoya en el fondo del mundo, sea claro u oscuro— y saca toda su intensidad de lo que
// EMITE: anillos que salen disparados del centro en cada golpe.
//
// El resultado es que sobre una pagina blanca `vortice` da una pieza nocturna y `pulso` da una pieza
// clara, y las dos cuentan lo mismo con la misma gramatica. Esa es la variacion que le sirve a un
// catalogo: no otro fondo bonito, otra REGLA.
//
// Y NO HAY SHADER NUEVO. Los anillos son geometria de verdad —toros que se escalan— y eso no es una
// economia: un anillo 3D se desalinea del campo plano cuando la camara empuja aunque sea un decimo, y
// esa desalineacion es la unica pista de que hay volumen. Un anillo dibujado en el shader no la tiene.
//
// LOS SEIS TIEMPOS (beats sobre 30)
//   0   ESPACIO   los anillos saliendo del centro, vacios. Ni una letra.
//   4   MARCA     el nombre, y el primer anillo sale DEL nombre.
//   9   PROMESA   el claim en renglones sobre el campo.
//   14  PRUEBA    la pagina entra desde el fondo, centrada en el eje de los anillos.
//   21  RAZONES   las cifras, una por golpe.
//   26  PEDIDO    los anillos se cierran y el CTA queda solo.

import { THREE, campoDegradado, luz, barra, iluminar } from '../nucleo.js'
import { vueloAvance, entra, sale, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso, aclarar } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'pulso',
  nombre: 'Pulso',
  familia: 'grafico',
  necesita: ['nada'],
  beats: 30,
  tiempos: { espacio: 0, marca: 4, promesa: 9, prueba: 14, razones: 21, pedido: 26 },
  pitch: 'Encuadre fijo y anillos que salen disparados del centro en cada golpe. La palabra no se mueve.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const respiraciones = []

  iluminar(escena, { key: 0.55, relleno: 0.5 })

  // El mismo empuje minimo que `vortice`: medido, la camara de este genero recorre 0.0146 del ancho
  // por segundo. Lo que no puede ser es CERO — un encuadre congelado del todo se lee como un JPG.
  const DERIVA = 0.10
  const vuelo = vueloAvance(camara, tl, {
    distBase, beats: meta.beats, largo: distBase * 0.18 * R.velocidad, desde: 1.0, deriva: DERIVA,
  })
  const zEn = vuelo.zEn
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)

  const ACENTO = colorDePeso(R, LOOK.acento, 0.20)
  const ACENTO2 = aclarar(ACENTO, 1.4)

  // ---------------------------------------------------------------- el campo
  //
  // ACA SI SE RESPETA EL MUNDO. Es la diferencia de regla con `vortice`, y por eso los colores salen
  // de `nivel()` y de la paleta medida en vez de forzar un suelo oscuro. Sobre una pagina blanca esto
  // da un campo claro y la tipografia en tinta; sobre una nocturna, al reves. `nivelTexto` sigue
  // valiendo sin que la plantilla tenga que hacer nada.
  const uCampo = campoDegradado(escena, {
    camara,
    // TRES DE LOS CUATRO COLORES SON CASI EL FONDO, y uno solo es el acento. Con dos manchas de
    // color el campo se convierte en un lavado azul parejo —fue la segunda foto de esta plantilla— y
    // ahi los anillos, que son lo unico que tiene que brillar, quedan del mismo valor que el suelo.
    // El campo de esta plantilla es un PAPEL con un resplandor, no un degradado de color.
    colores: [nivel(0.02), nivel(0.09), aclarar(ACENTO, 1.35), grisDePeso(R, nivel(0.05))],
    vel: 0.035 * R.velocidad,
    foco: 1.20,
    // Viñeta mas fuerte que la de las plantillas sobrias: medido en la referencia, el borde vale 0.54
    // de lo que vale el centro. Es lo que empuja la mirada al eje, que es donde vive todo aca.
    vineta: 0.34,
  })

  // ---------------------------------------------------------------- los anillos
  //
  // SEIS, DESFASADOS UN SEXTO DE PERIODO CADA UNO. Con tres se ve el hueco entre pulso y pulso; con
  // doce se convierte en una textura de rayas y deja de leerse como emision.
  //
  // Y el ciclo es funcion pura de `t` —`(t/PERIODO + i/6) % 1`— sin un solo estado acumulado. Es lo
  // que permite que el motor haga cuatro submuestras de obturador por cuadro y siga siendo
  // determinista: la regla de `alSeek` de este motor, que ya costo una plantilla entera.
  // DETRAS DE TODO, y esto no es un detalle de profundidad: los anillos EMITEN, asi que puestos
  // delante del texto le pasan por encima. La primera foto tenia un aro azul cruzando "BASECAMP" y el
  // nucleo tapando el CTA. Todo lo que brilla va al fondo; el texto, siempre delante.
  const gPulsos = new THREE.Group()
  gPulsos.position.z = zEn(15, distBase * 1.14)
  escena.add(gPulsos)
  const RB = mundoW * 0.22
  const NA = 6
  for (let i = 0; i < NA; i++) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(RB, RB * 0.016, 10, 128),
      luz(i % 2 ? ACENTO : ACENTO2, 1.75))
    a.material.transparent = true
    a.material.depthWrite = false
    a.material.opacity = 0
    gPulsos.add(a)
  }

  // Y UN NUCLEO QUE LOS PARE. Sin algo en el centro, seis anillos saliendo de la nada se leen como
  // ondas en el agua; con un punto emisivo del que salen, se leen como una FUENTE. Es la misma
  // diferencia que hay entre un halo dibujado y una lampara.
  const nucleo = new THREE.Mesh(new THREE.CircleGeometry(RB * 0.10, 48), luz(ACENTO2, 1.4))
  nucleo.material.transparent = true
  nucleo.material.opacity = 0.7
  nucleo.material.depthWrite = false
  nucleo.position.z = -RB * 0.05
  gPulsos.add(nucleo)

  // Marcas radiales fijas, como las de un dial. No se mueven: son la referencia contra la que se ve
  // que los anillos SI se mueven. Un campo donde todo late a la vez no late.
  const dial = new THREE.Group()
  gPulsos.add(dial)
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2
    const l = RB * (i % 6 === 0 ? 0.20 : 0.09)
    const m = barra(l, RB * 0.011, ACENTO, 1.3)
    m.material.transparent = true
    m.material.opacity = i % 6 === 0 ? 0.75 : 0.40
    m.material.depthWrite = false
    m.position.set(Math.cos(ang) * (RB * 1.55), Math.sin(ang) * (RB * 1.55), -RB * 0.1)
    m.rotation.z = ang
    dial.add(m)
  }

  // ---------------------------------------------------------------- los bloques
  //
  // El segundo argumento de `UTIL` es la PROFUNDIDAD del bloque, no un margen. A 0.78 del lente el
  // cuadro mide 0.78 del ancho, y pedir mas es como sale una marca cortada por los dos lados.
  const marca = bloqueMarca({ alto: 1.8, anchoMax: UTIL(0.74) * 0.94, margen: R.margen, cama: false })
  const promesa = bloquePromesa({ alto: 0.46, anchoMax: UTIL(0.86) * 0.88, cama: false, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.56, ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 1.30, anchoMax: UTIL(0.76) * 0.92, margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.32, anchoMax: UTIL(0.88) * 0.90, cama: false, margen: R.margen })
  const pedido = bloquePedido({ alto: 0.40, anchoMax: UTIL(0.84) * 0.88, margen: R.margen })

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    marca.g.position.set(0, 0.12, zEn(6, distBase * 0.74))
    escena.add(marca.g)
    entra(marca.g, tl, 4, { desde: 'fondo', dist: 4.6, dur: 1.2 })
    marca.escribir(tl, 4.25, 0.9)
    marca.borrar(tl, 7.9)
    sale(marca.g, tl, 8.1, { hacia: 'frente', dist: 4.4, dur: 0.9 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  //
  // SIN CAMA, y se probo con ella primero. El argumento era bueno —el campo aca es el del mundo y
  // puede quedar claro justo detras del claim— pero la foto mostro otra cosa: una placa blanca
  // rectangular sobre un campo de papel se lee como una etiqueta pegada, y ademas el ultimo renglon
  // salia cortado contra su borde. `nivelTexto` ya garantiza el contraste contra este fondo, que es
  // exactamente el fondo del mundo; la cama no estaba resolviendo nada que estuviera roto.
  if (promesa) {
    promesa.g.position.set(0, 0.05, zEn(11, distBase * 0.86))
    escena.add(promesa.g)
    entra(promesa.g, tl, 9, { desde: 'abajo', dist: 4.2, dur: 1.2 })
    promesa.escribir(tl, 9.35, 0.85)
    promesa.borrar(tl, 12.4)
    sale(promesa.g, tl, 12.6, { hacia: 'arriba', dist: 4.6, dur: 0.9 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  if (prueba) {
    prueba.g.position.set(0, 0, zEn(17, distBase * 0.92))
    pagina.add(prueba.g)
    entra(prueba.g, tl, 14, { desde: 'fondo', dist: 6.0, dur: 1.7 })
    prueba.escribir(tl, 14.2, 1.0)
    prueba.recorrer(tl, 15, 4.4, 0.9)
    tl.to(prueba.g.rotation, { y: -0.22, duration: b(4.2), ease: 'none' }, b(14.8))
    sale(prueba.g, tl, 19.4, { hacia: 'frente', dist: 5.5, dur: 1.0 })
    respiraciones.push(respirar(prueba.g, { amp: 0.06, giro: 0.016, fase: 1.1 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // UNA CIFRA POR GOLPE, 1.5 beats cada una, sin cruce. Medido en la referencia: cada palabra ocupa el
  // cuadro entero y la siguiente la reemplaza, no se superponen nunca.
  cifras.forEach((c, i) => {
    const t0 = 21 + i * 1.5
    c.g.position.set(0, 0.18, zEn(t0 + 0.6, distBase * 0.76))
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: 'fondo', dist: 4.0, dur: 0.7 })
    c.escribir(tl, t0 + 0.14, 0.45)
    sale(c.g, tl, t0 + 1.05, { hacia: 'frente', dist: 3.4, dur: 0.55 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 21.75 + i * 1.5
    f.g.position.set(0, -mundoH * 0.27, zEn(t0 + 0.5, distBase * 0.88))
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'der', dist: 3.8, dur: 0.75 })
    f.escribir(tl, t0 + 0.18, 0.5)
    f.borrar(tl, t0 + 1.05)
    sale(f.g, tl, t0 + 1.2, { hacia: 'izq', dist: 3.8, dur: 0.65 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    pedido.g.position.set(0, 0, zEn(28, distBase * 0.84))
    escena.add(pedido.g)
    entra(pedido.g, tl, 26.6, { desde: 'fondo', dist: 3.8, dur: 1.1 })
    pedido.escribir(tl, 27.0, 0.75)
    latido = pedido.latir(0.035)
    uso.cta = pedido.tieneCta
  }

  // El bloom con techo, por la misma razon que en `vortice`: el halo medido en la referencia es un
  // ABSOLUTO y aplicarlo como factor sobre once aires calibrados en un orden de magnitud da once
  // resultados, de los cuales uno solo se parece a lo medido.
  const BLOOM0 = ctx.bloom.strength || 0.5
  const BLOOMF = Math.min(BLOOM0 * 1.7, 0.50)
  tl.to(ctx.bloom, { strength: BLOOMF, duration: b(2.6), ease: E.frena(2) }, b(0.5))

  // ---------------------------------------------------------------- lo continuo
  //
  // TODO ASIGNACION Y TODO FUNCION PURA DE `t`. Ningun tween toca ninguna de estas claves: los anillos
  // solo existen aca, el nucleo solo existe aca, y el campo se mueve por su propio uniforme. La regla
  // del motor —SUMAR si hay tween sobre esa clave, ASIGNAR si no— se cumple por construccion, que es
  // mas seguro que cumplirla por cuidado.
  const PERIODO = b(1.0)
  const MEDIO = b(0.5)
  const GOLPES = [meta.tiempos.marca, meta.tiempos.promesa, meta.tiempos.prueba,
    meta.tiempos.razones, meta.tiempos.pedido].map(x => b(x))
  const anillos = gPulsos.children.filter(o => o.geometry && o.geometry.type === 'TorusGeometry')

  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uCampo.uT.value = t

    // El golpe: medio beat, que a 124 BPM son 0.242 s — el corte medido en la referencia es 0.23 s.
    const frac = (t / MEDIO) - Math.floor(t / MEDIO)
    let pulso = 0.28 * Math.pow(1 - frac, 5)
    for (let i = 0; i < GOLPES.length; i++) {
      const dt = t - GOLPES[i]
      if (dt >= 0 && dt < MEDIO * 2) pulso = Math.max(pulso, 0.70 * Math.pow(1 - dt / (MEDIO * 2), 4))
    }

    // LOS ANILLOS. Cada uno recorre su ciclo desfasado y vuelve al centro sin que nadie lo reinicie.
    // La opacidad es un seno del ciclo elevado: nace de la nada, se afirma y se va, y nunca aparece ni
    // desaparece de golpe — que es la primera de las tres reglas de movimiento de este motor.
    for (let i = 0; i < anillos.length; i++) {
      const k = ((t / PERIODO) + i / anillos.length) % 1
      const s = 0.18 + k * k * 2.9        // acelera hacia afuera: una onda no viaja a velocidad fija
      anillos[i].scale.set(s, s, 1)
      anillos[i].material.opacity = Math.pow(Math.sin(Math.PI * k), 1.2) * (0.55 + pulso * 0.8)
      anillos[i].rotation.z = k * 0.35 + i * 0.4
    }
    // El nucleo late con el golpe y no con el ciclo de los anillos: son dos relojes, y que no coincidan
    // es lo que hace que la composicion no se lea como una animacion en bucle.
    const sn = 1 + pulso * 1.6
    nucleo.scale.set(sn, sn, 1)
    nucleo.material.opacity = 0.55 + pulso * 0.45
    dial.rotation.z = t * 0.035
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
