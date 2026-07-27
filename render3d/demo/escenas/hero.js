// ESCENA "hero" — delega en el HERO elegido. No compone nada por su cuenta.
//
// Existe para que la eleccion del hero sea UN campo del spec y no una rama en el secuenciador: el
// usuario elige "telefono" o "vitrina" y la pieza sigue teniendo la misma cantidad de escenas y la
// misma duracion. Si el hero pedido no se puede armar con el material que la pagina dio, cae al
// primero que si — nunca dibuja el objeto vacio.
import { b, E, LOOK, hex } from '../kit.js'
import { HEROES, porId, elegibles } from '../heroes/index.js'

export const meta = { id: 'hero', beats: 8 }

export function build(ctx) {
  const { THREE, gsap, texturas, datosEls } = ctx
  const disponible = new Set()
  if (texturas && texturas.get('tira')) disponible.add('tira')
  if (datosEls && datosEls.length) disponible.add('elementos')

  // QUE HERO. El pedido del usuario manda en la PRIMERA aparicion. A partir de la segunda se rota,
  // porque una pieza de 30 s trae tres escenas de hero y las tres con el mismo objeto son la misma
  // escena tres veces — el corte entre ellas no se lee como corte. Rotando, el espectador ve el
  // telefono, despues el mosaico de su propia pagina, despues el cristal: tres formas de mirar lo
  // mismo, que es de lo que se trata un reel.
  const pedido = ctx.spec && ctx.spec.hero
  const posibles = elegibles(disponible)
  const rep = ctx.repeticion || 0
  const base = pedido ? posibles.findIndex(h => h.meta.id === pedido) : 0
  const elegido = posibles.length
    ? posibles[(Math.max(0, base) + rep) % posibles.length]
    : null

  if (!elegido) {
    // Sin material para ningun hero, la escena no tiene sujeto. Grupo vacio: el secuenciador la salta
    // y la pieza queda mas corta, que es la respuesta honesta.
    return { g: new THREE.Group(), tl: gsap.timeline({ paused: true }), vacia: true }
  }
  const r = elegido.build(ctx)
  ambiente(ctx, r)
  // LA ESCENA MANDA EL LARGO, no el hero. `meta.beats` de la escena lo lee el secuenciador ANTES de
  // construir, asi que un hero mas corto o mas largo pisaria a la escena siguiente. Se reescala su
  // timeline al hueco disponible: un hero de 6 beats puesto en 8 se estira un 33%, que en un gesto de
  // llegada se lee como el mismo gesto un poco mas suave — no como un error.
  const largo = b(meta.beats)
  const suyo = r.tl.duration()
  if (suyo > 0.01 && Math.abs(suyo - largo) > 0.01) r.tl.timeScale(suyo / largo)
  return { g: r.g, gr: r.gr, tl: r.tl, heroUsado: elegido.meta.id }
}

// ---------------------------------------------------------------- AMBIENTE
// LO QUE LE FALTA A UN HERO NO ES UN GESTO MAS GRANDE: SON MAS PARTES.
//
// Medido, los nueve heroes en las dos polaridades. La ocupacion de cuadro esta bien en todos
// (0.20 a 0.88), y el movimiento esta mal en TODOS menos uno:
//
//     orbital  0.165 / 0.194        <- el toro
//     telefono 0.090 / 0.092
//     portatil 0.072 / 0.088
//     ventana  0.061 / 0.064
//     mosaico  0.076 / 0.050
//     prisma   0.054 / 0.088
//     enjambre 0.060 / 0.064
//     cinta    0.034 / 0.047
//     vitrina  0.032 / 0.048
//
// contra 0.23 de la escena de destello y 0.29 de la de columna. La causa es estructural y se ve en
// cual es la excepcion: el toro no se mueve MAS, se mueve en MAS PARTES — un cuerpo, dos aros que
// tumban a velocidades no multiplos, un nucleo interno y un campo de polvo. Los otros ocho son UN
// objeto que llega, flota y se va, y un objeto solido desplazandose suave cambia pocos pixeles por
// cuadro por grande que sea.
//
// Arreglarlo hero por hero serian ocho archivos y ocho oportunidades de romper una composicion que ya
// esta afinada. El ambiente va en el ENVOLTORIO: la escena compone el cuadro ALREDEDOR del objeto que
// el hero devuelva, sin tocarlo. Cada hero nuevo lo hereda gratis, que es justo lo que hace falta si
// van a ser cientos.
function ambiente(ctx, r) {
  const { THREE, gsap, mundoW, mundoH, rnd, b: bb } = ctx
  const tl = r.tl
  const DUR = tl.duration() || bb(8)
  const g = new THREE.Group()
  r.g.add(g)

  // SE PROBO UN CAMPO DE POLVO Y SE SACO. Doscientos puntos derivando detras del hero: en pantalla no
  // se ven —a 0.045 de tamano son nueve pixeles y doscientos de ellos cubren el 0.8% del cuadro— y el
  // movimiento medido subio 0.001 en los cinco heroes probados, o sea nada. Costaba doscientas
  // posiciones reescritas por cuadro para eso. Queda anotado porque el impulso de "agregar
  // particulas" vuelve solo cada vez que una escena se siente vacia, y la medicion dice que no.
  // MARCAS DE COMPAS en los dos margenes. Saltan de largo en cada medio beat: es el metronomo visible
  // que el toro tiene y los demas no, y ademas ancla el cuadro mientras el objeto flota.
  const marcas = []
  for (let i = 0; i < 10; i++) {
    const lado = i < 5 ? -1 : 1
    const k = i % 5
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.30, 0.022),
      new THREE.MeshBasicMaterial({ color: hex(k === 2 ? LOOK.acento2 : LOOK.acento),
        transparent: true, opacity: 0, toneMapped: false }))
    m.position.set(lado * mundoW * 0.455, (k - 2) * mundoH * 0.115, 0.5)
    g.add(m)
    marcas.push(m)
  }

  // ------------------------------------------------------------------ tiempo
  marcas.forEach((m, i) => {
    tl.to(m.material, { opacity: 0.85, duration: bb(0.3), ease: E.frena(2) }, bb(0.3 + i * 0.06))
    tl.to(m.material, { opacity: 0, duration: bb(0.4), ease: E.acelera(2) }, DUR - bb(0.5))
    // El salto de largo cae en medios beats y alterna por lado: dos marcas que saltan a la vez en el
    // mismo margen se leen como una sola cosa.
    for (let k = 1; k < Math.floor(DUR / bb(0.5)) - 1; k++) {
      if ((k + i) % 3) continue
      tl.to(m.scale, { x: 1.9, duration: bb(0.12), ease: E.llega(2.6) }, bb(k * 0.5))
      tl.to(m.scale, { x: 1, duration: bb(0.3), ease: E.frena(3) }, bb(k * 0.5 + 0.14))
    }
  })

}

export const beatsDe = (id) => (porId(id) || HEROES[0]).meta.beats
export { HEROES }
