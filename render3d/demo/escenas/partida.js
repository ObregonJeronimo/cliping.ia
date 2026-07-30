// ESCENA "partida" — el cuadro partido al medio. Dos mitades que llegan de lados opuestos.
//
// POR QUE EXISTE
// Ninguna escena del catalogo PARTIA el cuadro. Todas componen sobre un lienzo entero —centrado,
// en bandera o a sangre—, y por eso el ojo siempre recibe la misma cantidad de superficie. Partirlo
// es el cambio de tipo mas barato que existe: dos rectangulos donde habia uno, y el corte entre
// ellos hace de tercer elemento sin dibujar nada.
//
// Y ADEMAS DICE DOS COSAS A LA VEZ. Todas las escenas de texto del motor presentan UNA idea por
// beat; esta presenta un PAR. La division no es decorativa: es lo que convierte dos frases sueltas
// en una relacion —esto y aquello, antes y despues, problema y respuesta— sin afirmar cual es cual,
// que es lo unico honesto que se puede hacer con dos frases que la pagina escribio por separado.
//
// LAS MITADES ENTRAN DE LADOS OPUESTOS y se encuentran en la costura. Entrando juntas seria un
// fundido partido; entrando cruzadas, el cuadro se arma delante del espectador y la costura queda
// senalada por el propio movimiento.
//
// SIN DOS FRASES NO HAY PAR. Con una, la mitad vacia es un rectangulo de color esperando contenido
// —el defecto exacto que la regla anti-invencion existe para impedir—. Se declara vacia.

import { LOOK, b, E, texto, nivel, matAcento, materialMascara, CLARO, finMascara, deriva, encaje, dolly , orbita} from '../kit.js'
import { D, repartirFrases } from '../datos.js'

export const meta = { id: 'partida', beats: 6 }

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---- el material que hay: dos frases de UNA linea (las de dos renglones son titulares)
  // DEL MOSTRADOR, no desde el principio del pozo. Tomando siempre las dos primeras, esta escena decia
  // palabra por palabra lo mismo que la de tipografia que suele venir antes. Ver datos.js.
  const fr = repartirFrases(2, true)
  if (fr.length < 2) {
    tl.to({}, { duration: DUR }, 0)
    return { g, tl, vacia: true }
  }
  const par = [fr[0], fr[1]]

  // ---- geometria: dos paneles horizontales, costura al medio
  // Partir en HORIZONTAL y no en vertical: en 9:16 dos columnas de 2.8 de ancho no dejan lugar a una
  // tipografia que se lea, y el formato ya es una columna. Dos bandas apiladas, en cambio, dan a cada
  // frase el ancho entero del cuadro.
  const COSTURA = 0
  const PANEL_H = mundoH * 0.32
  const MARGEN = mundoW * 0.40
  const ANCHO_UTIL = mundoW * 0.80
  const FIN = finMascara()                          // 1 + uSuave: con 1 la ultima letra queda lavada
  const COLOR_TXT = nivel(CLARO ? 0.94 : 0.82)

  const paneles = []
  for (let i = 0; i < 2; i++) {
    const arriba = i === 0
    const cy = COSTURA + (arriba ? PANEL_H / 2 : -PANEL_H / 2)

    // El fondo del panel. El de arriba lleva el acento y el de abajo el nivel bajo: es lo que hace
    // que las dos mitades se lean como DOS y no como una banda partida por una linea.
    // DOS CAPAS, Y NO ES BUROCRACIA. `cont` existe solo para que la DERIVA continua tenga donde
    // escribir sin pelearse con la ENTRADA. Las dos animan un desplazamiento horizontal, y con las
    // dos escribiendo `fondo.position.x` la escena dejaba de ser determinista: la compuerta lo cazo
    // con "dos construcciones con la misma semilla dan escenas distintas". Una propiedad, un solo
    // escritor; si hacen falta dos movimientos, hacen falta dos objetos.
    const cont = new THREE.Group()
    cont.position.y = 0
    g.add(cont)

    const fondo = new THREE.Mesh(
      new THREE.PlaneGeometry(mundoW * 1.2, PANEL_H),
      arriba
        ? matAcento(LOOK.acento, 0.9)
        : new THREE.MeshBasicMaterial({ color: nivel(0.10), toneMapped: false }),
    )
    fondo.position.set(0, cy, -0.1)
    cont.add(fondo)

    // El texto. Se MIDE y se achica si no entra: el ancho de un renglon lo decide la fuente que
    // eligio el aire, y encuadre-check no lo caza (verifica interseccion, no contencion, y saltea
    // las mallas con materialMascara porque no exponen material.map).
    const t = texto(par[i], { fuente: 'Anton', peso: 400, size: 160, tracking: 0.004, upper: true, alineado: 'left' })
    const ALTO_BASE = mundoH * 0.062
    const alto = encaje(ALTO_BASE, t.ar, ANCHO_UTIL)
    // Sobre el panel de acento el texto va casi a papel; sobre el oscuro, a tinta. Es la misma
    // inversion que hace `destello`, pero dentro del mismo cuadro y al mismo tiempo.
    const mat = materialMascara(t.tex, arriba ? nivel(CLARO ? 0.02 : 0.98) : COLOR_TXT)
    mat.uniforms.uDir.value = arriba ? 0 : 1        // cada mitad se escribe hacia su propio lado
    const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * t.ar, alto), mat)
    m.position.set(arriba ? -MARGEN + (alto * t.ar) / 2 : MARGEN - (alto * t.ar) / 2, cy, 0.2)
    m.userData.encaja = true       // los PANELES sangran a proposito; su texto no
    cont.add(m)

    paneles.push({ cont, fondo, m, mat, arriba, cy })
  }

  // ---- la costura: un filete de acento2 que crece desde el centro hacia los dos lados
  const costura = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 1.2, mundoH * 0.006),
    matAcento(LOOK.acento2, 1.4),
  )
  costura.position.set(0, COSTURA, 0.4)
  costura.scale.x = 0.001
  g.add(costura)

  // ================================================================ TIEMPO
  // DERIVA CONTINUA: nada puede quedar quieto mas de un beat y se mide sobre matrixWorld, asi que
  // mover la camara no alcanza. Un tween sobre un reloj con las props escritas a mano — `modifiers`
  // de GSAP no corre si la propiedad no esta tambien en vars, y esa trampa ya costo cuatro heroes.
  deriva(tl, DUR, u => {
    // Las dos mitades derivan en sentidos OPUESTOS: la costura se mantiene y el cuadro respira.
    paneles[0].cont.position.x = Math.sin(u * Math.PI * 1.2) * mundoW * 0.02
    paneles[1].cont.position.x = -Math.sin(u * Math.PI * 1.2) * mundoW * 0.02
    g.position.y = Math.sin(u * Math.PI * 0.8) * mundoH * 0.006
  })

  // ---- las mitades llegan de lados opuestos
  paneles.forEach((p, i) => {
    const desde = (p.arriba ? -1 : 1) * mundoW * 1.25
    tl.fromTo(p.fondo.position, { x: desde }, { x: 0, duration: b(0.85), ease: E.frena(4), immediateRender: false }, b(0.10) + i * b(0.16))
  })
  tl.fromTo(costura.scale, { x: 0.001 }, { x: 1, duration: b(0.50), ease: E.frena(4), immediateRender: false }, b(1.05))

  // ---- una frase por beat: los eventos duros de la escena
  paneles.forEach((p, i) => {
    tl.fromTo(p.mat.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.62), ease: E.frena(2), immediateRender: false }, b(1.35) + i * b(1.05))
  })

  // ---- un golpe en el beat 4: la costura late y los paneles se separan un instante
  const GOLPE = b(4.0)
  tl.to(costura.scale, { y: 3.2, duration: b(0.14), ease: E.acelera(2) }, GOLPE)
  tl.to(costura.scale, { y: 1, duration: b(0.42), ease: E.frena(3) }, GOLPE + b(0.14))
  paneles.forEach((p) => {
    const d = (p.arriba ? 1 : -1) * mundoH * 0.020
    tl.to(p.fondo.position, { y: p.cy + d, duration: b(0.16), ease: E.acelera(2) }, GOLPE)
    tl.to(p.fondo.position, { y: p.cy, duration: b(0.5), ease: E.frena(3) }, GOLPE + b(0.16))
  })

  // ---- salida: cada mitad se va por donde vino
  const SALIDA = DUR - b(0.50)
  paneles.forEach((p) => {
    tl.to(p.mat.uniforms.uProg, { value: 0, duration: b(0.30), ease: E.acelera(2) }, SALIDA)
    tl.to(p.fondo.position, { x: (p.arriba ? 1 : -1) * mundoW * 1.25, duration: b(0.38), ease: E.acelera(3) }, SALIDA + b(0.06))
  })
  tl.to(costura.scale, { x: 0.001, duration: b(0.34), ease: E.acelera(3) }, SALIDA)

  // ---- camara: devolverla es CONTRATO. El `set` final es el seguro ante el ajuste de tempo.
  // CAMARA QUE CRUZA LA COSTURA. El sujeto de esta escena es la LINEA donde se parte el cuadro, asi que
  // la camara se desliza lateralmente y la atraviesa en vez de acercarse: el desplazamiento hace que la
  // costura se lea como un borde con profundidad y no como una division dibujada. Sin acercamiento a
  // proposito — dos movimientos a la vez sobre una composicion partida se leen como inestabilidad.
  tl.fromTo(camera.position, { x: orbita(-0.26) }, { x: orbita(0.26), duration: DUR * 0.88, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { x: 0, duration: DUR * 0.12, ease: E.frena(2) }, DUR * 0.88)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, DUR - 0.001)

  return { g, tl }
}
