// ESCENA "sello" — la marca construida con geometria, en el aire.
//
// POR QUE EXISTE
// Dos aires no tenian escena propia: `lujo` e `inmobiliario`. Los dos declaran mobiliario `nada` —
// "lo caro se vende con AIRE"— y el catalogo entero estaba escrito para cuadros LLENOS: feeds,
// grillas, rafagas, listas. Una pieza de lujo compuesta con escenas densas deja de ser de lujo por
// mucho que se le cambie la paleta. Esta escena es la unica que compone con el vacio: un emblema
// chico, centrado, y tres cuartos de cuadro sin nada.
//
// Y ADEMAS ES LA UNICA QUE NO NECESITA MATERIAL. Toda pagina tiene un nombre. `toro` cumplia ese rol
// —geometria pura cuando no hay con que— pero es un objeto generico que no dice nada de la marca;
// este dice el nombre, y lo dice construyendolo.
//
// SE CONSTRUYE, NO APARECE. El anillo se dibuja arco por arco, los ejes crecen desde el centro y el
// nombre se escribe al final: la escena es el PROCESO de sellar. Un emblema que entra con un fundido
// es un logo pegado; uno que se traza delante del espectador es una marca haciendose.
//
// TODO ES GEOMETRIA Y NO UNA FUENTE ICONOGRAFICA: pedirle un simbolo a la tipografia es apostar a
// que la familia que eligio el aire lo tenga dibujado, y una que no lo tenga devuelve un rectangulo
// vacio sin avisar.

import { LOOK, b, E, texto, nivel, matAcento, materialMascara, CLARO } from '../kit.js'
import { D } from '../datos.js'

export const meta = { id: 'sello', beats: 6 }

const SEGMENTOS = 4                                 // en cuantos arcos se parte el anillo

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  const marca = String(D.marca || '').trim()
  if (!marca) {
    tl.to({}, { duration: DUR }, 0)
    return { g, tl, vacia: true }
  }

  const R = mundoW * 0.30                           // radio del anillo
  const FIN = 1.06                                  // 1 + uSuave

  // ---- el anillo, en arcos
  // Cada arco es su propia malla para poder trazarlos de a uno. Un RingGeometry entero solo se puede
  // escalar o desvanecer, y las dos cosas se leen como "aparecio", no como "se dibujo".
  const arcos = []
  for (let i = 0; i < SEGMENTOS; i++) {
    const desde = (i / SEGMENTOS) * Math.PI * 2
    const largo = (Math.PI * 2) / SEGMENTOS
    const geo = new THREE.RingGeometry(R * 0.965, R, 64, 1, desde, largo)
    const m = new THREE.Mesh(geo, matAcento(LOOK.acento, 1.25))
    m.material.transparent = true
    m.material.opacity = 0
    m.position.z = 0.1
    g.add(m)
    arcos.push(m)
  }

  // ---- los dos ejes: cruzan el anillo y salen del cuadro. Son lo que ancla el emblema al cuadro en
  // vez de dejarlo flotando en el centro como una pelota.
  const ejes = []
  for (let i = 0; i < 2; i++) {
    const horizontal = i === 0
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(horizontal ? mundoW * 1.2 : mundoH * 0.004, horizontal ? mundoH * 0.004 : mundoH * 1.2),
      matAcento(LOOK.acento2, 1.1),
    )
    m.material.transparent = true
    m.material.opacity = 0.55
    m.position.z = -0.05
    m.scale[horizontal ? 'x' : 'y'] = 0.001
    g.add(m)
    ejes.push({ m, horizontal })
  }

  // ---- el nombre, dentro del anillo
  // Se MIDE contra el diametro: una marca de cuatro letras y una de doce no pueden salir al mismo
  // cuerpo o la segunda se sale del anillo, que es el unico borde que esta escena tiene.
  const t = texto(marca, { fuente: 'Anton', peso: 400, size: 170, tracking: 0.03, upper: true, alineado: 'center' })
  const ANCHO_UTIL = R * 1.42
  const ALTO_BASE = mundoH * 0.055
  const alto = ALTO_BASE * t.ar > ANCHO_UTIL ? ANCHO_UTIL / t.ar : ALTO_BASE
  // nivel() YA SE DA VUELTA SOLO: va del fondo a la tinta, asi que un k ALTO es oscuro en un mundo
  // claro y claro en uno oscuro. Escribi `CLARO ? 0.06 : 0.97` —o sea, casi el fondo en mundo claro—
  // y el nombre de la marca salio blanco sobre fondo blanco: se leia apenas. El unico motivo para
  // mirar CLARO aca es el BLOOM, que solo muerde en mundo oscuro: por eso el tope de 0.80 de ese lado
  // y la libertad de empujar hasta 0.94 del otro. Es exactamente el mismo criterio que `cita`.
  const matN = materialMascara(t.tex, nivel(CLARO ? 0.94 : 0.80))
  matN.uniforms.uDir.value = 2                      // se escribe de abajo hacia arriba: se "sella"
  const nombre = new THREE.Mesh(new THREE.PlaneGeometry(alto * t.ar, alto), matN)
  nombre.position.set(0, 0, 0.3)
  nombre.userData.encaja = true    // el nombre de la marca, entero o nada
  g.add(nombre)

  // ---- el pie: el rubro o el dominio, chico, debajo del anillo. Puede no existir.
  const pieTxt = String(D.dominio || '').trim()
  let matPie = null
  if (pieTxt) {
    const tp = texto(pieTxt, { fuente: 'DMSans', peso: 500, size: 80, tracking: 0.30, upper: true, alineado: 'center', color: nivel(0.52) })
    const ALTO_P = mundoH * 0.020
    matPie = materialMascara(tp.tex, nivel(0.52))
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_P * tp.ar, ALTO_P), matPie)
    mp.position.set(0, -R - mundoH * 0.055, 0.3)
    g.add(mp)
  }

  // ================================================================ TIEMPO
  // DERIVA CONTINUA: nada quieto mas de un beat, medido sobre matrixWorld. Un tween sobre un reloj
  // con las props a mano (`modifiers` de GSAP no corre si la prop no esta tambien en vars).
  // El anillo gira LENTO y en un solo sentido: en una pieza de lujo el movimiento tiene que ser algo
  // que uno nota recien despues de mirarlo un rato.
  const giro0 = (rnd() - 0.5) * 0.2
  const reloj = { t: 0 }
  const derivar = () => {
    const u = reloj.t / DUR
    for (let i = 0; i < arcos.length; i++) arcos[i].rotation.z = giro0 + u * 0.16 * (i % 2 ? -1 : 1)
    g.position.y = Math.sin(u * Math.PI * 0.9) * mundoH * 0.005
    g.scale.setScalar(1 + u * 0.02)
  }
  derivar()
  tl.to(reloj, { t: DUR, duration: DUR, ease: 'none', onUpdate: derivar }, 0)

  // ---- se traza: un arco por beat, que son los eventos duros de la escena
  arcos.forEach((a, i) => {
    tl.fromTo(a.material, { opacity: 0 }, { opacity: 1, duration: b(0.34), ease: E.frena(3), immediateRender: false }, b(0.25) + i * b(0.55))
    tl.fromTo(a.scale, { x: 1.25, y: 1.25 }, { x: 1, y: 1, duration: b(0.55), ease: E.llega(2.2), immediateRender: false }, b(0.25) + i * b(0.55))
  })
  ejes.forEach((e, i) => {
    tl.fromTo(e.m.scale, { [e.horizontal ? 'x' : 'y']: 0.001 }, { [e.horizontal ? 'x' : 'y']: 1, duration: b(0.70), ease: E.frena(4), immediateRender: false }, b(0.45) + i * b(0.30))
  })

  // ---- el nombre se sella cuando el anillo ya esta cerrado
  const TN = b(0.25) + SEGMENTOS * b(0.55) + b(0.10)
  tl.fromTo(matN.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.70), ease: E.frena(3), immediateRender: false }, TN)
  if (matPie) tl.fromTo(matPie.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.50), ease: E.frena(2), immediateRender: false }, TN + b(0.35))

  // ---- el golpe del sello: el anillo se contrae un instante cuando el nombre termina de escribirse
  const GOLPE = TN + b(0.70)
  arcos.forEach(a => {
    tl.to(a.scale, { x: 0.94, y: 0.94, duration: b(0.12), ease: E.acelera(2) }, GOLPE)
    tl.to(a.scale, { x: 1, y: 1, duration: b(0.46), ease: E.frena(3) }, GOLPE + b(0.12))
  })

  // ---- salida
  const SALIDA = DUR - b(0.42)
  tl.to(matN.uniforms.uProg, { value: 0, duration: b(0.32), ease: E.acelera(2) }, SALIDA)
  if (matPie) tl.to(matPie.uniforms.uProg, { value: 0, duration: b(0.28), ease: E.acelera(2) }, SALIDA)
  arcos.forEach((a, i) => tl.to(a.material, { opacity: 0, duration: b(0.30), ease: E.acelera(2) }, SALIDA + i * b(0.03)))
  ejes.forEach(e => tl.to(e.m.scale, { [e.horizontal ? 'x' : 'y']: 0.001, duration: b(0.34), ease: E.acelera(3) }, SALIDA))

  // ---- camara: un acercamiento minimo. Devolverla es CONTRATO.
  tl.fromTo(camera.position, { z: distBase + 0.20 }, { z: distBase - 0.06, duration: DUR * 0.86, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.14, ease: E.vaiven() }, DUR * 0.86)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, DUR - 0.001)

  return { g, tl }
}
