// ESCENA "rafaga" — doce cuadros en seis beats. Un corte cada medio beat.
//
// POR QUE EXISTE, CON EL NUMERO AL LADO
// Medido contra la pieza hecha a mano: el motor daba 26 cortes por minuto y ANTHEM 55; el piso de un
// reel moderno es 40. Y movimiento 0.116 contra 0.226 — la mitad. Las dos brechas tienen la MISMA
// causa: las escenas del motor duran de cuatro a ocho beats y cortan sólo en su frontera, o sea ocho
// cortes en treinta segundos. ANTHEM corta ADENTRO de la escena; su bloque de tipografía cinética mete
// siete entradas en ocho beats, cada una un reemplazo duro. No le falta ritmo al motor: le faltan
// EVENTOS POR ESCENA.
//
// Esta escena es ese arreglo en su forma más pura. No compone: RAFAGUEA. Doce piezas, media hora de
// pantalla cada una —241 ms a 124 bpm—, reemplazo duro, sin fundidos. Sola sube el ritmo de corte de
// la pieza entera, y de paso mete el material real de la página que casi ninguna escena usa.
//
// POR QUE MEDIO BEAT Y NO UN CUARTO
// A un cuarto de beat (120 ms) el ojo ya no lee una imagen: percibe un parpadeo. Medio beat es el
// límite en el que todavía se reconoce QUE se vio, y es exactamente donde trabajan los reels de moda
// y de música. Debajo de eso el contenido deja de importar, y si el contenido no importa, mostrar la
// página del usuario tampoco.
//
// LO QUE MUESTRA CADA CUADRO
// Alterna recorte real y frase, empezando por el recorte: la primera cosa que se ve es un pedazo de la
// página de verdad, que es lo que separa esta pieza de una plantilla. Si la página no dio recortes van
// todas frases; si no dio frases, todos recortes. El guionista no la elige si no hay ni una cosa ni la
// otra — no hay ráfaga de nada.

import { LOOK, b, E, hex, texto, planoRecorte, recortesDe, nivel, matAcento } from '../kit.js'
import { D, frase, nFrases, marca } from '../datos.js'

export const meta = { id: 'rafaga', beats: 6 }

const SLOTS = 12                       // doce cuadros en seis beats = uno cada medio beat
const ROLES = ['tarjeta', 'foto', 'logo', 'cta']

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, datosEls } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()         // los recortes van post-bloom: traen los colores de la marca
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)
  const PASO = DUR / SLOTS

  // ---- el material que hay
  const recortes = []
  for (const e of recortesDe(datosEls || [], ROLES, SLOTS)) {
    const tex = texturas && texturas.get(e.url)
    if (tex && tex.image) recortes.push(tex)
  }
  const frases = []
  for (let i = 0; i < nFrases(); i++) {
    const f = frase(i)
    if (f) frases.push(String(f).replace(/\n/g, ' '))
  }

  // Se ALTERNA, y se arranca por el recorte. Con las frases primero, los primeros cuadros de la
  // ráfaga son tipografía y la escena se confunde con la de tipografía cinética que suele venir
  // antes; arrancando por un pedazo de la página real, la primera impresión es "esta es mi página".
  const piezas = []
  let ir = 0, ifr = 0
  for (let i = 0; i < SLOTS; i++) {
    const quiereRecorte = i % 2 === 0
    if (quiereRecorte && ir < recortes.length) piezas.push({ tipo: 'recorte', tex: recortes[ir++] })
    else if (ifr < frases.length) piezas.push({ tipo: 'frase', txt: frases[ifr++] })
    else if (ir < recortes.length) piezas.push({ tipo: 'recorte', tex: recortes[ir++] })
    else break                          // se acabó el material: la ráfaga es más corta, no se repite
  }

  // Sin material no hay escena. El guionista no debería haberla elegido; si igual llegó acá, un grupo
  // vacío es la respuesta honesta.
  if (!piezas.length) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl }
  }

  // ---- estructura fija del cuadro: lo único que NO parpadea
  // Sin un ancla, doce reemplazos duros seguidos se leen como un error de reproducción. Dos filetes y
  // un índice alcanzan para que el ojo tenga dónde apoyarse mientras el centro cambia.
  const MX = mundoW * 0.42
  const filete = (y, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(MX * 2, 0.03), matAcento(col, 1.3))
    m.position.set(0, y, 0.6)
    g.add(m)
    return m
  }
  const arriba = filete(mundoH * 0.34, LOOK.acento)
  const abajo = filete(-mundoH * 0.34, LOOK.acento2)
  arriba.scale.x = 0.0001
  abajo.scale.x = 0.0001
  tl.to(arriba.scale, { x: 1, duration: b(0.5), ease: E.frena(4) }, 0)
  tl.to(abajo.scale, { x: 1, duration: b(0.5), ease: E.frena(4) }, b(0.12))

  // El índice: sólo números, así que no puede afirmar nada sobre el negocio. Ver `marca` en datos.js.
  const idx = texto(marca(3, 6), { fuente: 'DMSans', peso: 500, size: 90, tracking: 0.3, color: nivel(0.55) })
  const mIdx = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9 * idx.ar, 0.9),
    new THREE.MeshBasicMaterial({ map: idx.tex, transparent: true, depthWrite: false, toneMapped: false }))
  // Anclado por su BORDE IZQUIERDO, no por su centro. Puesto por el centro, un rotulo de seis
  // caracteres sobresale un metro y medio por fuera del cuadro y en pantalla se lee "/ 06".
  mIdx.position.set(-mundoW * 0.5 + 0.34 + (0.9 * idx.ar) / 2, mundoH * 0.29, 0.6)
  g.add(mIdx)

  // ---- las doce piezas
  // GRANDE. Con 0.46 de alto y 0.86 de ancho, un recorte apaisado —que es la forma de casi toda
  // tarjeta de landing— quedaba limitado por el ancho y salia ocupando el 19% del cuadro: doce
  // estampillas flotando en el medio de la pantalla. En una rafaga la pieza tiene que LLENAR, porque
  // se la ve un cuarto de segundo y no hay tiempo para que el ojo la busque. Se deja SANGRAR por los
  // costados: una tarjeta ancha cortada por los dos bordes se lee mejor que una entera y chiquita.
  const ALTO_MAX = mundoH * 0.56
  const ANCHO_MAX = mundoW * 1.24
  const mallas = piezas.map((p) => {
    let m
    if (p.tipo === 'recorte') {
      const ar = p.tex.image.width / p.tex.image.height
      const alto = Math.min(ALTO_MAX, ANCHO_MAX / Math.max(0.08, ar))
      m = planoRecorte(p.tex, alto)
      if (m) gr.add(m)
    } else {
      // NO va en LOOK.tinta. Es tipografia de DISPLAY a media pantalla, y la tinta de un mundo oscuro
      // tiene luminancia ~0.9 contra un umbral de bloom de 0.62: florece entera y sale como un
      // ladrillo blanco sin contraformas. Se vio en un render en vivo de tailwindcss.com — cuatro
      // manchas blancas donde tenian que leerse cuatro frases. Ver el presupuesto de luz en toro.js.
      const t = texto(p.txt, { fuente: 'Anton', size: 200, color: nivel(0.78) })
      // La frase entra por el lado que la limita. Un titular de dos palabras y uno de cinco no pueden
      // salir del mismo alto: el de cinco se saldría del cuadro.
      // La tipografia NO sangra: una palabra cortada por el borde no se lee, y una frase es lo unico
      // de esta escena que hay que poder leer entero.
      const alto = Math.min(ALTO_MAX * 0.66, (mundoW * 0.90) / Math.max(0.08, t.ar))
      m = new THREE.Mesh(
        new THREE.PlaneGeometry(alto * t.ar, alto),
        new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, toneMapped: false }))
      g.add(m)
    }
    if (m) m.visible = false
    return m
  }).filter(Boolean)

  // ---- tiempo
  // El fondo cede: doce reemplazos duros contra una grilla en fuga es demasiada información por
  // segundo, y lo que se pierde es justo lo que la escena vino a mostrar.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.35, duration: b(0.5), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.6), ease: E.vaiven() }, DUR - b(0.6))
  }

  mallas.forEach((m, i) => {
    const t0 = i * PASO
    const dentro = i < mallas.length - 1 ? PASO : DUR - t0
    // REEMPLAZO DURO: `visible` se prende y se apaga en el frame exacto. Nada de opacidad — un fundido
    // de 240 ms entre dos piezas deja la mitad del tiempo con las dos encima y la ráfaga se convierte
    // en un barro. El corte es el efecto.
    tl.set(m, { visible: true }, t0)
    tl.set(m, { visible: false }, t0 + dentro)

    // Cada pieza se mueve DENTRO de su cuadro. Sin esto son doce fotos fijas encadenadas: el ritmo de
    // corte sube y el de movimiento no, que era la otra mitad del problema medido.
    const lado = i % 2 ? 1 : -1
    const desde = 0.30 + rnd() * 0.22
    m.position.set(lado * desde, (rnd() - 0.5) * 0.5, 0)
    tl.fromTo(m.position, { x: lado * desde }, { x: -lado * desde * 0.35, duration: dentro, ease: 'none', immediateRender: false }, t0)
    tl.fromTo(m.scale, { x: 0.92, y: 0.92, z: 1 }, { x: 1.06, y: 1.06, z: 1, duration: dentro, ease: 'none', immediateRender: false }, t0)
  })

  // El filete de abajo SALTA en cada corte: es la marca de tiempo que hace que doce reemplazos se lean
  // como un ritmo y no como una falla. Salta a paso doble para no caer siempre con la pieza.
  for (let i = 0; i < SLOTS; i += 2) {
    tl.set(abajo.position, { x: ((i / SLOTS) - 0.4) * mundoW * 0.7 }, i * PASO)
  }
  tl.set(abajo.position, { x: 0 }, DUR - 0.001)

  // La cámara empuja parejo y vuelve: le da a la ráfaga una dirección, que es lo que la separa de un
  // pase de diapositivas rápido.
  tl.fromTo(camera.position, { z: distBase + 0.55 }, { z: distBase - 0.30, duration: DUR * 0.85, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.15, ease: E.vaiven() }, DUR * 0.85)

  tl.to(arriba.scale, { x: 0.0001, duration: b(0.35), ease: E.acelera(2) }, DUR - b(0.35))
  tl.to(abajo.scale, { x: 0.0001, duration: b(0.35), ease: E.acelera(2) }, DUR - b(0.35))
  tl.to(mIdx.material, { opacity: 0, duration: b(0.35), ease: E.acelera(2) }, DUR - b(0.35))

  void D
  return { g, gr, tl }
}
