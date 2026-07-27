// HERO "mosaico" — los pedazos REALES de la página vuelan y se arman en formación.
//
// ES EL HERO QUE MÁS IMPORTA, Y ES EL QUE FALTABA.
// El motor extrae de cada página sus objetos de verdad como PNG con transparencia: el logo, los
// botones, las tarjetas, las fotos (backend/element_extract.py). De Stripe salen doce. De otras,
// cincuenta. Y no aparecían en NINGUNA escena: se medían, se recortaban, se guardaban y se tiraban.
//
// La diferencia entre este hero y todos los demás es lo que el espectador entiende. Un toro de geometría
// pura con la paleta de la marca dice "alguien hizo un video". Las tarjetas reales de su propia home
// girando en el aire dicen "esto es MI página" — y eso no lo puede fingir ninguna plantilla, porque el
// material no existía hasta que se midió esa página.
//
// LA COMPOSICIÓN SE ADAPTA A CUÁNTOS HAY, Y ESO NO ES UN DETALLE
// Una página puede dar dos recortes o dieciséis. Con una grilla fija, dos recortes dejan catorce
// agujeros y dieciséis se pisan. Acá el número de columnas sale de la cantidad, y los tamaños de la
// relación de aspecto real de cada pieza — un botón ancho y una foto cuadrada no pueden ocupar la misma
// celda sin deformarse, y deformar el logo de alguien es peor que no mostrarlo.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, planoRecorte, recortesDe } from '../kit.js'

export const meta = {
  id: 'mosaico',
  nombre: 'Mosaico de la página',
  necesita: ['elementos'],
  beats: 8,
}

// Orden de preferencia. El logo primero porque es lo único que identifica a la marca de un vistazo;
// después las tarjetas, que son las piezas más "diseñadas" de una landing; después fotos y botones.
const ROLES = ['logo', 'tarjeta', 'foto', 'cta']
const MAX = 9

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, datosEls } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()          // los recortes van post-bloom: traen los colores de la marca
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  const elegidos = recortesDe(datosEls || [], ROLES, MAX)
  const piezas = []
  for (const e of elegidos) {
    const tex = texturas && texturas.get(e.url)
    if (!tex || !tex.image) continue
    piezas.push({ e, tex, ar: tex.image.width / tex.image.height })
  }

  // Sin material no hay mosaico. Devolver un grupo vacío es correcto y es lo que manda la regla: el
  // registro de heroes no debería haber ofrecido este hero para esta página, y si igual llegó acá, una
  // escena vacía es honesta — inventar rectángulos de relleno con la paleta no lo sería.
  if (!piezas.length) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl }
  }

  // COLUMNAS SEGÚN CUÁNTOS HAY. Con 1 o 2 piezas una grilla es un chiste: van grandes y centradas.
  const n = piezas.length
  const cols = n <= 2 ? n : n <= 4 ? 2 : n <= 6 ? 3 : 3
  const filas = Math.ceil(n / cols)
  const ANCHO_UTIL = mundoW * 0.86
  const ALTO_UTIL = mundoH * 0.62
  const celdaW = ANCHO_UTIL / cols
  const celdaH = ALTO_UTIL / filas
  const AIRE = 0.86                     // el respiro entre piezas; sin esto el mosaico es una pared

  const gM = new THREE.Group()
  g.add(gM)

  const mallas = []
  piezas.forEach((p, i) => {
    const col = i % cols, fila = Math.floor(i / cols)
    // La pieza entra en su celda por el lado que la limita, nunca estirada. Un logo apaisado en una
    // celda cuadrada tiene que sobrar por arriba y por abajo, no achatarse.
    const hPorAlto = celdaH * AIRE
    const hPorAncho = (celdaW * AIRE) / Math.max(0.05, p.ar)
    const alto = Math.min(hPorAlto, hPorAncho)
    const m = planoRecorte(p.tex, alto)
    if (!m) return
    const x = (col - (cols - 1) / 2) * celdaW
    // La última fila puede estar incompleta: se centra sola en vez de quedar pegada a la izquierda.
    const enFila = Math.min(cols, n - fila * cols)
    const xCentrado = (col - (enFila - 1) / 2) * celdaW
    const y = ((filas - 1) / 2 - fila) * celdaH
    m.userData.destino = new THREE.Vector3(fila === filas - 1 ? xCentrado : x, y, 0)
    m.userData.rol = p.e.rol
    gr.add(m)
    mallas.push(m)
  })

  // El fondo cede mientras el mosaico es el sujeto: doce recortes con su propia tipografía adentro y
  // una grilla en fuga son dos tramas finas peleando por el mismo ojo.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.30, duration: b(1), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // ------------------------------------------------------------------ tiempo
  // LLEGAN DESDE EL FONDO Y DESDE AFUERA, en desorden, y frenan en formación. El desorden es con la
  // semilla, así que dos renders del mismo video dan exactamente el mismo desorden.
  mallas.forEach((m, i) => {
    const ang = rnd() * Math.PI * 2
    const lejos = 3.4 + rnd() * 3.2
    m.position.set(
      m.userData.destino.x + Math.cos(ang) * lejos,
      m.userData.destino.y + Math.sin(ang) * lejos * 0.7,
      -5.5 - rnd() * 5)
    m.rotation.set((rnd() - 0.5) * 0.9, (rnd() - 0.5) * 1.5, (rnd() - 0.5) * 0.7)
    m.material.opacity = 0

    // El stagger va por DISTANCIA A LA CÁMARA y no por índice: las de atrás salen primero, así que el
    // grupo se lee como una nube que se ordena y no como una lista que se enumera.
    const t0 = b(0.15) + (i / Math.max(1, mallas.length)) * b(1.9)
    tl.to(m.material, { opacity: 1, duration: b(0.42), ease: E.frena(2) }, t0)
    tl.to(m.position, { x: m.userData.destino.x, y: m.userData.destino.y, z: 0,
      duration: b(1.5), ease: E.llega(1.5) }, t0)
    tl.to(m.rotation, { x: 0, y: 0, z: 0, duration: b(1.7), ease: E.frena(3) }, t0)

    // NADA QUEDA QUIETO. Cada pieza respira con su propio período: si compartieran uno, el mosaico
    // entero latiría como una sola cosa, que se nota más que la quietud.
    // El respiro va en userData y lo aplica UN solo onUpdate al final, no un tween con `modifiers`:
    // eso sólo corre para propiedades declaradas en `vars` y acá no había ninguna. Ver telefono.js.
    m.userData.osc = { f: rnd() * 6.28, vel: 0.5 + rnd() * 0.5, amp: 0.05 + rnd() * 0.05, desde: t0 + b(1.5) }
  })

  // EL ACENTO SEPARA. Un mosaico de recortes con fondo propio es una pared de rectángulos; un filete
  // que barre por detrás le da un plano y una dirección.
  const filete = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_UTIL * 1.25, 0.055),
    new THREE.MeshBasicMaterial({ color: hex(LOOK.acento), toneMapped: false }))
  filete.position.set(0, -ALTO_UTIL * 0.5 - 0.35, -0.4)
  filete.scale.x = 0.0001
  gM.add(filete)
  tl.to(filete.scale, { x: 1, duration: b(0.7), ease: E.frena(4) }, b(2.1))

  // LA CÁMARA respira sobre el conjunto: sin paralaje, nueve planos a z=0 se leen como una sola imagen
  // pegada. Vuelve a distBase antes del corte — es contrato de escena.
  tl.fromTo(camera.position, { z: distBase + 1.5 }, { z: distBase - 0.5, duration: DUR * 0.8, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.2, ease: E.vaiven() }, DUR * 0.8)
  tl.to(gM.rotation, { y: 0.09, duration: DUR * 0.55, ease: E.vaiven() }, 0)
  tl.to(gM.rotation, { y: 0, duration: DUR * 0.45, ease: E.vaiven() }, DUR * 0.55)
  // gM sólo mueve el filete; los recortes viven en la otra escena y copian su rotación cada frame.
  // Acá también respira cada pieza: entre que llegó a su celda y que empieza a salir.
  // EL ORDEN IMPORTA Y CUESTA CARO. Esto colgaba de un tween hijo puesto en 0 con duracion DUR, y
  // GSAP renderiza sus hijos ORDENADOS POR TIEMPO DE INICIO: cualquier tween que arranque despues de 0
  // —la llegada, el vaiven, la salida— se renderiza DESPUES, o sea que la sincronizacion leia
  // transformaciones de un frame viejo. En el render no se notaba porque se avanza cuadro a cuadro y
  // el error de un frame es invisible; se veia recien en un SALTO en frio, que es lo que hace un
  // editor al arrastrar la aguja. Lo encontro la compuerta de determinismo el dia que empezo a mirar
  // tambien el grupo post-bloom.
  //
  // El onUpdate de la TIMELINE corre despues de todos sus hijos, que es exactamente la garantia que
  // hace falta. `main.js` avanza con `tl.time(t, false)`, o sea sin suprimir eventos, asi que dispara.
  tl.eventCallback('onUpdate', () => {
    const t = tl.time()
    for (const m of mallas) {
      m.rotation.y = gM.rotation.y
      const o = m.userData.osc
      if (o && t > o.desde && t < DUR - b(1.1)) {
        m.position.y = m.userData.destino.y + Math.sin(t * o.vel + o.f) * o.amp
      }
    }
  })

  // DESTAQUE POR BEAT: en cada beat, UNA pieza se adelanta y vuelve.
  //
  // Sin esto, una vez que las nueve llegaron a su celda el cuadro es una grilla que respira — bonita y
  // quieta. Medido sobre los heroes: el que sólo llegaba y flotaba daba 0.072 de movimiento y 61% de
  // frames casi quietos. Un adelanto de medio beat es un EVENTO duro, dirige el ojo a una pieza
  // concreta —que es lo que hace un editor con un corte— y cuesta un tween.
  //
  // El paso es 3 y no 1 para que la pieza destacada SALTE por la grilla en vez de recorrerla en orden:
  // recorrerla en orden se lee como un barrido automático, saltar se lee como una decisión.
  if (mallas.length > 1) {
    for (let i = 2; i < meta.beats - 1; i++) {
      const m = mallas[(i * 3) % mallas.length]
      tl.to(m.position, { z: 0.85, duration: b(0.22), ease: E.llega(2.2) }, b(i))
      tl.to(m.position, { z: 0, duration: b(0.45), ease: E.frena(3) }, b(i + 0.25))
    }
  }

  // SALEN HACIA LA CÁMARA, escalonadas. El corte siguiente se siente ganado.
  mallas.forEach((m, i) => {
    const t = DUR - b(0.95) + (i / Math.max(1, mallas.length)) * b(0.3)
    tl.to(m.position, { z: 5.5, duration: b(0.6), ease: E.acelera(3) }, t)
    tl.to(m.material, { opacity: 0, duration: b(0.45), ease: E.acelera(2) }, t + b(0.12))
  })

  return { g, gr, tl }
}
