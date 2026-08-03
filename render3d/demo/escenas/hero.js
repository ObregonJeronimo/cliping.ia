// ESCENA "hero" — delega en el HERO elegido. No compone nada por su cuenta.
//
// Existe para que la eleccion del hero sea UN campo del spec y no una rama en el secuenciador: el
// usuario elige "telefono" o "vitrina" y la pieza sigue teniendo la misma cantidad de escenas y la
// misma duracion. Si el hero pedido no se puede armar con el material que la pagina dio, cae al
// primero que si — nunca dibuja el objeto vacio.
import { b, E, LOOK, hex, MOB, texto, materialMascara, nivel, encaje, finMascara } from '../kit.js'
import { HEROES, porId, elegibles } from '../heroes/index.js'
import { D, repartirFrases } from '../datos.js'

export const meta = { id: 'hero', beats: 8 }

export function build(ctx) {
  const { THREE, gsap, texturas, datosEls, rnd } = ctx
  const disponible = new Set()
  if (texturas && texturas.get('tira')) disponible.add('tira')
  if (datosEls && datosEls.length) disponible.add('elementos')

  // QUE HERO. El pedido del usuario manda en la PRIMERA aparicion. A partir de la segunda se rota,
  // porque una pieza de 30 s trae tres escenas de hero y las tres con el mismo objeto son la misma
  // escena tres veces — el corte entre ellas no se lee como corte. Rotando, el espectador ve el
  // telefono, despues el mosaico de su propia pagina, despues el cristal: tres formas de mirar lo
  // mismo, que es de lo que se trata un reel.
  // Y CUANDO NADIE PIDE NADA, LO ELIGE LA SEMILLA. Esto arrancaba SIEMPRE en `posibles[0]`, o sea que
  // toda pieza que no pidiera hero explicitamente empezaba por el mismo objeto — el telefono si habia
  // tira, y el orbital si no. `rep` rotaba DENTRO de una pieza pero nunca movia el punto de partida,
  // asi que doce heroes escritos producian dos en pantalla. Medido sobre 240 guiones: la escena de hero
  // sale en el 67% de las piezas, o sea que era el objeto mas visto del motor y era siempre el mismo.
  // Thiago, tres veces, sobre tres videos distintos: "ese objeto 3d que gira... devuelta lo mismo".
  const pedido = ctx.spec && ctx.spec.hero
  // El aire viaja para que la geometria abstracta no le toque a una marca a la que no le queda.
  const posibles = elegibles(disponible, (ctx.spec && ctx.spec.aire) || null, datosEls || [])
  const rep = ctx.repeticion || 0
  const base = pedido
    ? posibles.findIndex(h => h.meta.id === pedido)
    : Math.floor(rnd() * Math.max(1, posibles.length))
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
  rotular(ctx, r, elegido)
  // LA ESCENA MANDA EL LARGO, no el hero. `meta.beats` de la escena lo lee el secuenciador ANTES de
  // construir, asi que un hero mas corto o mas largo pisaria a la escena siguiente. Se reescala su
  // timeline al hueco disponible: un hero de 6 beats puesto en 8 se estira un 33%, que en un gesto de
  // llegada se lee como el mismo gesto un poco mas suave — no como un error.
  const largo = b(meta.beats)
  const suyo = r.tl.duration()
  if (suyo > 0.01 && Math.abs(suyo - largo) > 0.01) r.tl.timeScale(suyo / largo)
  return { g: r.g, gr: r.gr, tl: r.tl, heroUsado: elegido.meta.id }
}

// ---------------------------------------------------------------- ROTULO
// UN OBJETO QUE NO DICE NADA NECESITA QUE ALGUIEN DIGA ALGO.
//
// Esta escena delega en el hero y no componia nada por su cuenta. Para los seis que muestran LA
// PAGINA del cliente eso es correcto: el contenido es la pagina, y ponerle texto encima seria taparla.
// Para los de geometria pura no: la pieza se queda casi cuatro segundos con un objeto girando y ni una
// palabra. Thiago, sobre la columnata: "no hace nada, se mueven y suben y bajan esos pilares blancos
// pero no se muestra texto, no tiene sentido esa escena".
//
// La frase sale del MOSTRADOR, no de un texto propio: es una de las que la pagina dijo, y el mostrador
// se encarga de que ninguna otra escena la repita. Si la pagina no dio ninguna, no hay rotulo — un
// objeto sin texto es peor que un objeto, pero un texto inventado es peor que las dos cosas.
function rotular(ctx, r, elegido) {
  const { THREE, gsap, mundoW, mundoH } = ctx
  // Solo los abstractos. `necesita: ['nada']` es exactamente la marca de "no muestra la pagina".
  const nec = elegido.meta.necesita || ['nada']
  if (!nec.every(n => n === 'nada')) return
  const fr = (repartirFrases(1) || [])[0]
  const linea = String(fr || '').split(String.fromCharCode(10)).join(' ').trim()
  if (!linea) return

  const g = new THREE.Group()
  r.g.add(g)
  const ANCHO = mundoW * 0.80
  const t = texto(linea, { fuente: 'DMSans', peso: 700, size: 130, tracking: 0.01, upper: true })
  // CON PISO, Y SI NO ENTRA CON EL PISO NO SE DIBUJA. `encaje` solo achica y no tiene suelo, asi que
  // el rotulo era una funcion inversa del largo de la frase: medido con copy real de linear.app, 'Plan
  // and build with AI agents' queda en 0.367 (~37 px de mayuscula sobre 1920) pero el claim completo
  // 'The product development system for teams and agents' cae a 0.195 — unos 20 px, en el borde de lo
  // legible en un reel vertical. Y hero.js:77 aplana los saltos de linea, asi que una frase pensada en
  // dos renglones duplica su proporcion y `encaje` le baja el alto a la mitad.
  //
  // El piso es la mitad del alto de diseno (0.040 -> 0.020 de mundo = 38 px de mayuscula), o sea el
  // limite donde el propio hallazgo dice que la cosa deja de leerse.
  //
  // Y SI CON EL PISO NO ENTRA, NO SE DIBUJA. Es la misma regla que el resto del motor: un slot que no
  // se puede componer se compone SIN el. Un rotulo ilegible no aporta el dato, solo ensucia el cuadro
  // —y este es un hero de geometria pura, que se sostiene solo—.
  const PISO = mundoH * 0.020
  const ALTO = Math.max(PISO, encaje(mundoH * 0.040, t.ar, ANCHO))
  if (ALTO * t.ar > ANCHO * 1.001) return
  const mat = materialMascara(t.tex, nivel(0.90))
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ALTO * t.ar, ALTO), mat)
  // Abajo y a la izquierda, fuera del eje donde vive el objeto: el rotulo acompaña, no compite.
  m.position.set(-mundoW * 0.40 + (ALTO * t.ar) / 2, -mundoH * 0.355, 0.6)
  m.userData.encaja = true
  g.add(m)

  const filete = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, mundoH * 0.0042),
    new THREE.MeshBasicMaterial({ color: hex(LOOK.acento), toneMapped: false, transparent: true }))
  filete.geometry.translate(ANCHO / 2, 0, 0)
  filete.position.set(-mundoW * 0.40, -mundoH * 0.385, 0.6)
  filete.scale.x = 0.0001
  g.add(filete)

  const tl = r.tl
  const FIN = finMascara()
  tl.fromTo(filete.scale, { x: 0.0001 }, { x: 1, duration: b(0.5), ease: E.frena(4), immediateRender: false }, b(1.1))
  tl.fromTo(mat.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.62), ease: E.frena(3), immediateRender: false }, b(1.35))
  const DUR = tl.duration()
  tl.to(mat.uniforms.uProg, { value: 0, duration: b(0.34), ease: E.acelera(2) }, DUR - b(0.62))
  tl.to(filete.scale, { x: 0.0001, duration: b(0.30), ease: E.acelera(3) }, DUR - b(0.52))
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
  // MARCAS DE COMPAS en los margenes. Saltan de largo en cada medio beat: es el metronomo visible que el
  // toro tiene y los demas no, y ademas ancla el cuadro mientras el objeto flota.
  //
  // LAS PONE EL AIRE, Y ANTES NO. Eran diez planos fijos —cinco por lado, siempre a las mismas cinco
  // alturas, siempre del mismo color— y `hero` entra en practicamente toda pieza de treinta segundos.
  // Resultado: dos videos de dos paginas distintas con dos aires distintos compartian la MISMA firma en
  // los dos margenes, y Thiago lo dijo con esas palabras: "los que me venis mostrando son iguales, usan
  // esos bordes a los costados". Tenia razon y no era el marco del cuadro — era esto.
  //
  // Ahora la cantidad y los lados salen del mueble del aire, igual que `marco()`:
  //   'nada'          un aire que decidio no tener borde tampoco tiene acotacion en el margen;
  //   'passepartout'  las bandas del margen TAPAN x = ±0.455 del ancho, asi que estas marcas se
  //                   dibujaban debajo y no se veian nunca: diez mallas de trabajo invisible;
  //   'rotulado'      un solo lado, que es la asimetria que ese mueble propone;
  //   'reglas' 3      'escuadras' 5      'ticks' 7      — tres densidades distintas.
  const POR_MUEBLE = { nada: 0, passepartout: 0, reglas: 3, escuadras: 5, ticks: 7, rotulado: 5 }
  const N_MARCAS = POR_MUEBLE[MOB.marco] !== undefined ? POR_MUEBLE[MOB.marco] : 5
  const LADOS = MOB.marco === 'rotulado' ? [-1] : [-1, 1]
  const marcas = []
  for (const lado of LADOS) {
    for (let k = 0; k < N_MARCAS; k++) {
      const c = (N_MARCAS - 1) / 2
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.30, 0.022),
        // La del medio en el segundo acento. Con una cantidad par no hay medio: no se tiñe ninguna, que
        // es mejor que teñir una cualquiera y que se lea como un error.
        new THREE.MeshBasicMaterial({ color: hex(k === c ? LOOK.acento2 : LOOK.acento),
          transparent: true, opacity: 0, toneMapped: false }))
      m.position.set(lado * mundoW * 0.455, (k - c) * mundoH * (N_MARCAS > 5 ? 0.082 : 0.115), 0.5)
      g.add(m)
      marcas.push(m)
    }
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
