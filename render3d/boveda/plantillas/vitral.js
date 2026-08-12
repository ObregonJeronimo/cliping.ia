// PLANTILLA "vitral" — la camara ORBITA un cilindro de paneles de vidrio a contraluz.
//
// EL GESTO
// Un anillo de laminas de color, iluminadas desde atras, y la camara girando por dentro mientras baja.
// Cada bloque se apoya sobre uno de los paneles, asi que aparece cuando la orbita llega a el. Es la
// plantilla mas "cara" de las de arquitectura y la que mejor le sienta a una marca de moda, hoteleria
// o cosmetica.
//
// ---------------------------------------------------------------- LA ORBITA TIENE UNA TRAMPA
//
// `entra()` desplaza en coordenadas de MUNDO: "izq" es -x del mundo, no la izquierda de la camara. En
// un vuelo de avance da igual porque la camara mira siempre a -z, pero en una orbita la camara encara
// cada objeto desde un angulo distinto, asi que "entra por la izquierda" saldria en una direccion
// distinta para cada uno — y para los que estan a 90 grados seria entrar DE FRENTE, o sea no entrar.
//
// La solucion es de dos grupos y no cuesta nada:
//     `gExt`   posicion y giro que da `puntoEn`. Lo planta mirando a la camara.
//     `blk.g`  hijo de `gExt`, en el origen local. `entra` lo mueve en coordenadas LOCALES, que ya
//              estan alineadas con la camara. Su izquierda es la izquierda del cuadro, siempre.
//
// Toda plantilla orbital de la boveda tiene que hacer esto. Esta escrito aca porque `vitral` es la
// primera; las que vengan copian el patron, no lo redescubren.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   los paneles pasando a contraluz, la camara girando y bajando. Nada de texto.
//   5   MARCA     el nombre se planta sobre el panel que la orbita esta encarando.
//   11  PROMESA   el claim entra desde el costado del cuadro, dos paneles mas adelante.
//   17  PRUEBA    la pagina ocupa el hueco de un panel, como si fuera uno mas del anillo.
//   25  RAZONES   las cifras aparecen sobre paneles alternos, arriba y abajo del eje.
//   32  PEDIDO    la orbita se cierra sobre el ultimo panel y el CTA queda al frente, latiendo.

import { THREE, vidrio, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloOrbita, entra, sale, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'vitral',
  nombre: 'Vitral en anillo',
  familia: 'luz',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 25, pedido: 32 },
  pitch: 'Órbita por dentro de un anillo de vidrio a contraluz. Elegante, de moda y hotelería.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes: no hay una
  // rama distinta ni un caso especial. Lo que se modula es el GRADO, nunca la idea.
  //
  // La explicacion larga de cada receta esta en `render3d/boveda/recetas.js`, y la de por que existe
  // este mecanismo, en `atrio.js`.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const respiraciones = []

  iluminar(escena, { key: 0.7, relleno: 1.15 })
  const uDomo = domo(escena, { fuerza: 0.34 })
  const motas = polvo(escena, 1100, 26)

  // LA ORBITA, Y CUANTA VUELTA DA — que no es una decision estetica sino la que fija CUANTO DURA UN
  // BLOQUE EN PANTALLA.
  //
  // La camara barre `vueltas * 360` grados en `beats`, y el campo visual son 32. O sea que un objeto
  // plantado en el angulo de su beat se sale del cuadro en `16 / (vueltas * 360 / beats)` beats. Con
  // las 0.78 vueltas de la primera version eso daba 7.4 grados por beat: dos beats de ventana para
  // bloques que viven cuatro o seis. La sonda lo marco como "encendido pero NO se ve" en los beats 9,
  // 15, 33 y 34 — y no era que estuvieran mal colocados, era que la orbita los pasaba de largo.
  //
  // Con 0.46 vueltas son 4.4 grados por beat y la ventana sube a +-3.6 beats. Sigue sin dar la vuelta
  // entera, que era el motivo original de bajar de 1: volver al punto de partida hace que el ultimo
  // tercio se vea repetido.
  const vuelo = vueloOrbita(camara, tl, {
    distBase, beats: meta.beats, radio0: 1.15, radio1: 0.62, vueltas: 0.46, alto0: 2.6, alto1: -0.4, miraY: 0.1,
  })
  const puntoEn = vuelo.puntoEn

  // ---------------------------------------------------------------- el espacio: el anillo
  //
  // Doce paneles en circulo, cada uno con su lampara detras. LA LUZ VA DETRAS Y NO DELANTE: un vidrio
  // iluminado de frente es un espejo gris; iluminado de atras es un vitral. Es la diferencia entre que
  // el material se vea y que el material trabaje.
  const N = 12
  const RAD = distBase * 1.32
  const anillo = new THREE.Group()
  escena.add(anillo)
  const matPanel = vidrio(colorDePeso(R, LOOK.acento, 0.20), { rug: 0.05, trans: 0.88, grosor: 3.2, opacidad: 0.85 })
  const matPanel2 = vidrio(LOOK.acento2 || LOOK.acento, { rug: 0.05, trans: 0.88, grosor: 3.2, opacidad: 0.85 })
  const paneles = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const g = new THREE.Group()
    g.position.set(Math.sin(a) * RAD, 0, Math.cos(a) * RAD)
    // Mirando al centro. Sin esto los paneles se ven de canto desde adentro, que es no verse.
    g.rotation.y = a
    const p = new THREE.Mesh(new THREE.BoxGeometry(mundoW * 1.5, mundoH * 2.6, 0.22), i % 2 ? matPanel2 : matPanel)
    g.add(p)
    // El marco: dos filetes verticales en emisivo. Son lo que le da al anillo su ritmo de columnata.
    for (const s of [-1, 1]) {
      const f = barra(0.055, mundoH * 2.5, LOOK.acento2 || LOOK.acento, 1.4)
      f.position.set(s * mundoW * 0.74, 0, 0.15)
      g.add(f)
    }
    // La lampara: un plano emisivo detras del panel, no una luz de verdad. Doce luces reales cuestan
    // doce pasadas de sombreado por cuadro y se ven casi igual con el bloom encima.
    // `nivel(0)` ES EL CLARO Y `nivel(1)` LA TINTA — al reves de lo que dice la intuicion.
    // La rampa va del fondo a la tinta, asi que pedir `nivel(0.92)` para "casi blanco" devuelve
    // #26221c: una lampara negra. Para una FUENTE de luz el numero va cerca de cero.
    const lam = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 1.4, mundoH * 2.3), luz(nivel(0.03), 1.15))
    lam.position.z = -0.4
    g.add(lam)
    anillo.add(g)
    paneles.push(g)
  }
  // Piso y techo espejados, que es lo que cierra el cilindro. En metal y no en vidrio: el vidrio con
  // `transmission` a esta escala cuesta una pasada de refraccion por cuadro y aca no aporta nada.
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(RAD * 1.1, 48), metal(nivel(s < 0 ? 0.05 : 0.12), 0.24))
    p.rotation.x = s < 0 ? -Math.PI / 2 : Math.PI / 2
    p.position.y = s * mundoH * 1.3
    escena.add(p)
  }

  // ---------------------------------------------------------------- los bloques
  //
  // CADA BLOQUE SE MIDE CONTRA EL CUADRO QUE HAY A SU DISTANCIA, no contra `mundoW`.
  //
  // Un bloque plantado a `frac` del radio no esta a `distBase` del lente sino a `(1 - frac)*R`, y ese
  // radio ademas se cierra durante la pieza. Para el claim, a 0.32 del radio en el beat 12, el cuadro
  // mide 4.15 unidades; para una frase en el beat 29 mide 2.94. Dandoles `mundoW * 0.72 = 4.05` a las
  // dos, la primera entra justa y la segunda ocupa el 138% del ancho — sale cortada a los dos lados,
  // que es exactamente lo que mostro la foto.
  //
  // El sitio y el tamano dejan de ser dos decisiones separadas: se elige DONDE, y el ancho sale de ahi.
  const DONDE = {
    marca: [6.8, 0.30, 0.5], promesa: [12.6, 0.32, 0.0], prueba: [20.2, 0.30, 0.0],
    cifra: [26.0, 0.32, 0], frase: [26.0, 0.30, -1.7], pedido: [meta.beats - 0.8, 0.26, 0.0],
  }
  const anchoDe = (que, margen) => {
    const d = DONDE[que]
    return anchoADistancia(mundoW, distBase, puntoEn(d[0], d[1]).dist, 0) * margen
  }
  const marca = bloqueMarca({ alto: 1.25, anchoMax: anchoDe('marca', 0.86) , margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.52, anchoMax: anchoDe('promesa', 0.88) , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: anchoDe('prueba', 0.58), ar: 1.6 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.78, anchoMax: anchoDe('cifra', 0.5) , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.29, anchoMax: anchoDe('frase', 0.84) , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.32, anchoMax: anchoDe('pedido', 0.66) , margen: R.margen })

  // El patron de los dos grupos, explicado arriba. Devuelve el grupo externo por si la plantilla quiere
  // moverlo, pero lo que se le pasa a `entra` es SIEMPRE el del bloque.
  // `frac` CHICO ALARGA LA VENTANA, y es la otra mitad del mismo problema. Un objeto a `frac` del
  // radio, visto desde la camara que esta en 1.0, se corre en el cuadro un angulo de `frac/(1-frac)`
  // por cada grado que gira la orbita. A 0.62 eso amplifica x1.6; a 0.30 lo divide por 2.3. Por eso la
  // pagina —el bloque que mas tiene que durar— es la que mas cerca del eje se planta.
  const plantar = (blk, beat, frac, y, padre) => {
    const p = puntoEn(beat, frac, y)
    const gExt = new THREE.Group()
    gExt.position.copy(p.pos)
    gExt.rotation.y = p.yaw
    gExt.add(blk.g)
    ;(padre || escena).add(gExt)
    return gExt
  }

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    plantar(marca, DONDE.marca[0], DONDE.marca[1], DONDE.marca[2])
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 5, dur: 1.8 })
    marca.escribir(tl, 5.4, 1.3)
    marca.borrar(tl, 9.4)
    sale(marca.g, tl, 9.6, { hacia: 'arriba', dist: 5, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    plantar(promesa, DONDE.promesa[0], DONDE.promesa[1], DONDE.promesa[2])
    entra(promesa.g, tl, 11, { desde: 'der', dist: 5.5, dur: 1.6 })
    promesa.escribir(tl, 11.4, 0.95)
    promesa.borrar(tl, 15.4)
    sale(promesa.g, tl, 15.6, { hacia: 'izq', dist: 6, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // La pagina ocupa el hueco de un panel: se planta a la MISMA distancia del eje que el anillo, asi
  // que se lee como uno mas de la vuelta y no como algo pegado encima.
  if (prueba) {
    plantar(prueba, DONDE.prueba[0], DONDE.prueba[1], DONDE.prueba[2], pagina)
    entra(prueba.g, tl, 17, { desde: 'fondo', dist: 6, dur: 2.1 })
    prueba.escribir(tl, 17.2, 1.2)
    prueba.recorrer(tl, 18, 5.6, 0.92)
    sale(prueba.g, tl, 24.0, { hacia: 'der', dist: 6.5, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.09, giro: 0.022, fase: 1.6 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const t0 = 25 + i * 2.4
    const s = i % 2 === 0 ? 1 : -1
    plantar(c, t0 + 1.0, DONDE.cifra[1], s * 1.0)
    entra(c.g, tl, t0, { desde: s > 0 ? 'arriba' : 'abajo', dist: 4.5, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.75)
    sale(c.g, tl, t0 + 2.6, { hacia: s > 0 ? 'arriba' : 'abajo', dist: 5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 26.0 + i * 3.0
    plantar(f, t0 + 1.0, DONDE.frase[1], DONDE.frase[2])
    entra(f.g, tl, t0, { desde: 'izq', dist: 5, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.85)
    f.borrar(tl, t0 + 2.6)
    sale(f.g, tl, t0 + 2.8, { hacia: 'der', dist: 5.5, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    plantar(pedido, DONDE.pedido[0], DONDE.pedido[1], DONDE.pedido[2])
    entra(pedido.g, tl, 32, { desde: 'fondo', dist: 5, dur: 1.9 })
    pedido.escribir(tl, 32.4, 0.9)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.7, duration: b(2.2), ease: E.frena(2) }, b(32))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // EL ANILLO GIRA AL REVES QUE LA CAMARA, despacio. Es el detalle que separa "la camara gira dentro de
  // un decorado quieto" de "el lugar esta vivo": con el anillo quieto, la vuelta completa se percibe
  // como un panorama; con el anillo girando en contra, cada panel es un objeto que pasa.
  //
  // Y va aca y no en un tween porque tiene que evaluarse en cada submuestra del obturador — con doce
  // paneles de vidrio cruzando el cuadro, un giro muestreado una vez por cuadro se ve a saltos.
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    anillo.rotation.y = -t * 0.035
    motas.rotation.y = t * 0.04
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
