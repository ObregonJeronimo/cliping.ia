// ESCENA "hero" — delega en el HERO elegido. No compone nada por su cuenta.
//
// Existe para que la eleccion del hero sea UN campo del spec y no una rama en el secuenciador: el
// usuario elige "telefono" o "vitrina" y la pieza sigue teniendo la misma cantidad de escenas y la
// misma duracion. Si el hero pedido no se puede armar con el material que la pagina dio, cae al
// primero que si — nunca dibuja el objeto vacio.
import { b } from '../kit.js'
import { HEROES, porId, elegibles } from '../heroes/index.js'

export const meta = { id: 'hero', beats: 8 }

export function build(ctx) {
  const { THREE, gsap, texturas, datosEls } = ctx
  const disponible = new Set()
  if (texturas && texturas.get('tira')) disponible.add('tira')
  if (datosEls && datosEls.length) disponible.add('elementos')

  const pedido = ctx.spec && ctx.spec.hero
  const posibles = elegibles(disponible)
  const elegido = (pedido && posibles.find(h => h.meta.id === pedido))
    || posibles[0]
    || null

  if (!elegido) {
    // Sin material para ningun hero, la escena no tiene sujeto. Grupo vacio: el secuenciador la salta
    // y la pieza queda mas corta, que es la respuesta honesta.
    return { g: new THREE.Group(), tl: gsap.timeline({ paused: true }), vacia: true }
  }
  const r = elegido.build(ctx)
  // LA ESCENA MANDA EL LARGO, no el hero. `meta.beats` de la escena lo lee el secuenciador ANTES de
  // construir, asi que un hero mas corto o mas largo pisaria a la escena siguiente. Se reescala su
  // timeline al hueco disponible: un hero de 6 beats puesto en 8 se estira un 33%, que en un gesto de
  // llegada se lee como el mismo gesto un poco mas suave — no como un error.
  const largo = b(meta.beats)
  const suyo = r.tl.duration()
  if (suyo > 0.01 && Math.abs(suyo - largo) > 0.01) r.tl.timeScale(suyo / largo)
  return { g: r.g, gr: r.gr, tl: r.tl, heroUsado: elegido.meta.id }
}

export const beatsDe = (id) => (porId(id) || HEROES[0]).meta.beats
export { HEROES }
