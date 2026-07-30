// ESCENA "contraste" — un barrido A|B entre dos piezas reales de la pagina.
//
// POR QUE EXISTE
// El motor no tenia NINGUNA comparacion. Podia mostrar cosas en serie —una despues de otra, en un
// feed, en una rafaga— pero nunca dos en el mismo lugar, que es la unica forma de que el ojo las
// mida entre si. Un barrido pone las dos en las mismas coordenadas y deja que el corte viaje: lo que
// cambia salta, lo que se repite desaparece de la atencion. Es el gesto de comparacion mas viejo que
// hay y no cuesta un solo objeto nuevo.
//
// EL BARRIDO ES LA ESCENA, NO UN EFECTO
// Las demas escenas usan la mascara para ESCRIBIR (el texto entra por un lado). Aca la mascara es el
// sujeto: una pieza tapa a la otra y el filo que las separa es lo unico que se mueve. Por eso el filo
// lleva un filete de acento — sin el, dos recortes parecidos se funden y el barrido no se lee.
//
// NO DICE CUAL ES MEJOR. Poner "antes/despues" o "A/B" seria afirmar una relacion que la pagina no
// declaro: son dos piezas que la pagina publico, y el unico dato honesto es que son distintas. La
// escena las enfrenta y se calla.
//
// SIN DOS RECORTES NO HAY COMPARACION. Con uno es una foto, y eso ya lo hacen `titular` y `columna`.

import { LOOK, b, E, nivel, matAcento, materialMascara, planoRecorte, recortesDe, finMascara, deriva, dolly, orbita } from '../kit.js'

export const meta = { id: 'contraste', beats: 6 }

const ROLES = ['foto', 'tarjeta', 'hero', 'cta', 'logo']

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, texturas, datosEls } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---- el material que hay: DOS piezas distintas
  const fuentes = []
  for (const e of recortesDe(datosEls || [], ROLES, 6)) {
    const t = texturas && texturas.get(e.url)
    if (t && t.image && !fuentes.includes(t)) fuentes.push(t)
    if (fuentes.length >= 2) break
  }
  if (fuentes.length < 2) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl, vacia: true }
  }

  // ---- las dos piezas, EN LA MISMA CAJA
  // No alcanza con darles el mismo ALTO: medido en el render de basecamp.com, dos capturas de
  // proporciones distintas con el mismo alto ocupan anchos que difieren en mas del doble, y el
  // barrido termina descubriendo una pieza donde la otra ni llegaba. Eso no es una comparacion, es
  // ruido. Las dos se encajan en la MISMA caja (contain, cada una con su proporcion intacta) y
  // quedan centradas: recien ahi el filo que viaja compara lo mismo contra lo mismo.
  const BOX_W = mundoW * 0.76
  const BOX_H = mundoH * 0.40
  const encaje = (ar) => { const h = Math.min(BOX_H, BOX_W / Math.max(0.08, ar)); return { h, w: h * ar } }
  const ALTO = BOX_H
  const planos = []
  for (let i = 0; i < 2; i++) {
    const tex = fuentes[i]
    const ar = tex.image.width / tex.image.height
    const caja = encaje(ar)
    // La de abajo va con material normal; la de arriba con mascara, que es la que barre.
    if (i === 0) {
      const m = planoRecorte(tex, caja.h)
      if (!m) { tl.to({}, { duration: DUR }, 0); return { g, gr, tl, vacia: true } }
      m.position.set(0, 0, 0)
      gr.add(m)
      planos.push({ m, mat: m.material })
    } else {
      // materialMascara SIN color: un recorte trae los colores de la marca y teñirlo seria pintarla
      // de otro color. El null es el caso correcto acá y el unico lugar del motor donde se usa.
      const mat = materialMascara(tex, null)
      mat.uniforms.uDir.value = 0                   // izquierda -> derecha
      const m = new THREE.Mesh(new THREE.PlaneGeometry(caja.w, caja.h), mat)
      m.position.set(0, 0, 0.1)
      gr.add(m)
      planos.push({ m, mat })
    }
  }
  const encima = planos[1]

  // EL RESPALDO OPACO QUE BARRE CON LA PIEZA DE ARRIBA.
  // Un recorte de pagina es un PNG CON TRANSPARENCIA: donde el elemento no pinta, se ve lo que hay
  // detras. Con dos apilados eso significa que las dos piezas se leen A LA VEZ, mezcladas, y el
  // barrido no revela nada — se vio clarito en el render de basecamp.com, con los textos de una
  // atravesando a la otra. La mascara sola no alcanza porque recorta el PNG, no lo vuelve opaco.
  // Este plano crece desde el borde izquierdo con el MISMO uProg, asi que la mitad ya barrida tiene
  // fondo propio y tapa de verdad a la de abajo.
  const respaldo = new THREE.Mesh(
    // Un pelo mas ancho que la caja y arrancando un pelo antes: con el ancho EXACTO quedaba una tira
    // del recorte de abajo asomando contra el canto izquierdo, que es el tipico borde de un pixel que
    // se ve en el video y no en la cuenta.
    new THREE.PlaneGeometry(BOX_W * 1.06, BOX_H * 1.06),
    new THREE.MeshBasicMaterial({ color: nivel(0.06), toneMapped: false }),
  )
  respaldo.geometry.translate(BOX_W * 1.06 / 2, 0, 0)   // crece desde su borde izquierdo
  // EL ORIGEN ES EL BORDE IZQUIERDO DE LA CAJA, o sea la MITAD del ancho — y estaba puesto el ancho
  // entero. Con `translate(W/2)` el plano crece hacia la derecha desde su origen, asi que ese origen
  // tiene que ser -W/2 y no -W. La diferencia es media caja: 2.13 unidades, y el respaldo terminaba
  // sangrando fuera del cuadro por la izquierda y CORTANDO la pieza justo en el centro. En el render se
  // veia como una placa negra que empieza fuera del cuadro y termina a mitad de la tarjeta, con el
  // testimonio partido al medio — en dos de los tres videos mirados, o sea en la escena y no en el aire.
  respaldo.position.set(-BOX_W * 1.06 / 2, 0, 0.05)     // detras de la pieza de arriba (que va en z 0.1)
  respaldo.scale.x = 0.001
  gr.add(respaldo)

  // ---- el filo: la linea que viaja y separa las dos piezas
  // Va en `g`, no en `gr`: es geometria de la pieza y el bloom la ayuda a leerse como un filo de luz.
  // Pero OJO — `gr` se compone DESPUES del bloom y se dibuja SIEMPRE encima de `g`, asi que un filo
  // en `g` quedaria tapado por los recortes. Va en `gr`, con z por delante de los dos planos.
  const ANCHO_MAX = BOX_W
  const filo = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 0.008, ALTO * 1.12),
    matAcento(LOOK.acento2, 1.5),
  )
  filo.position.set(-ANCHO_MAX / 2, 0, 0.6)
  gr.add(filo)

  // ---- marco: dos filetes arriba y abajo que encuadran la comparacion. Estos SI van en `g`, y como
  // quedan FUERA del area de los recortes, no los tapa nadie.
  const marco = []
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 0.86, mundoH * 0.005), matAcento(LOOK.acento, 1.2))
    f.position.set(0, s * ALTO * 0.62, 0)
    f.scale.x = 0.001
    g.add(f)
    marco.push(f)
  }
  // Un plano de fondo detras de la comparacion: sin el, un recorte con transparencia deja ver la
  // grilla del aire por sus huecos y las dos piezas dejan de estar "en el mismo lugar".
  const cama = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 0.92, ALTO * 1.16),
    new THREE.MeshBasicMaterial({ color: nivel(0.06), toneMapped: false }),
  )
  cama.position.set(0, 0, -0.5)
  g.add(cama)

  // ================================================================ TIEMPO
  // DERIVA CONTINUA: nada quieto mas de un beat, medido sobre matrixWorld. Va como UN tween sobre un
  // reloj con las props escritas a mano (`modifiers` de GSAP no corre si la prop no esta en vars).
  // EL FILO SE MUEVE CON EL BARRIDO, no aparte: se lee del mismo uProg que corta la pieza de arriba,
  // asi que no hay dos verdades sobre donde esta el corte. Sincronizarlos con dos tweens paralelos
  // fue lo primero que probe y se despegaban en cada cambio de ease.
  deriva(tl, DUR, u => {
    g.position.x = Math.sin(u * Math.PI * 1.4) * mundoW * 0.008
    gr.position.x = Math.sin(u * Math.PI * 1.4) * mundoW * 0.008
    gr.scale.setScalar(1 + u * 0.03)                // la comparacion se acerca despacio
  })

  // EL FILO SE SINCRONIZA EN eventCallback, NO EN EL RELOJ. Los hijos de una timeline se renderizan
  // por orden de START-TIME: el reloj arranca en 0 y el tween de uProg en el beat 1.1, asi que si el
  // filo leyera uProg desde el onUpdate del reloj estaria leyendo el valor del cuadro ANTERIOR. La
  // compuerta lo caza como no-determinismo, porque el resultado pasa a depender de por donde vino el
  // playhead. `eventCallback('onUpdate')` corre DESPUES de todos los hijos, que es el unico lugar
  // donde uProg ya vale lo que vale en ESTE cuadro. Es la trampa #2 del repo, en su forma exacta.
  const sincronizarFilo = () => {
    const p = Math.min(1, Math.max(0, encima.mat.uniforms.uProg.value))
    filo.position.x = -ANCHO_MAX / 2 + ANCHO_MAX * p
    respaldo.scale.x = Math.max(0.001, p)
  }
  sincronizarFilo()
  tl.eventCallback('onUpdate', sincronizarFilo)

  // ---- entrada
  tl.fromTo(cama.scale, { y: 0.001 }, { y: 1, duration: b(0.45), ease: E.frena(4), immediateRender: false }, 0)
  marco.forEach((f, i) => tl.fromTo(f.scale, { x: 0.001 }, { x: 1, duration: b(0.50), ease: E.frena(3), immediateRender: false }, b(0.18) + i * b(0.10)))
  tl.fromTo(planos[0].mat, { opacity: 0 }, { opacity: 1, duration: b(0.50), ease: E.frena(2), immediateRender: false }, b(0.30))

  // ---- EL BARRIDO, en dos pasadas
  // Una sola pasada de seis beats es una deriva, y la metrica de movimiento —que cuenta pixeles
  // cruzando un umbral de luma entre cuadros— apenas la registra. Dos pasadas con un alto en el medio
  // son DOS eventos duros, y ademas dejan ver cada pieza entera antes de volver.
  const FIN = finMascara()                          // 1 + uSuave: con 1 queda una franja sin revelar
  tl.fromTo(encima.mat.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(1.30), ease: E.frena(3), immediateRender: false }, b(1.10))
  tl.to(encima.mat.uniforms.uProg, { value: 0.06, duration: b(1.10), ease: E.vaiven(2) }, b(3.00))
  tl.to(encima.mat.uniforms.uProg, { value: FIN, duration: b(0.85), ease: E.frena(3) }, b(4.30))

  // ---- salida
  const SALIDA = DUR - b(0.45)
  tl.to(planos[0].mat, { opacity: 0, duration: b(0.34), ease: E.acelera(2) }, SALIDA)
  tl.to(encima.mat.uniforms.uProg, { value: 0, duration: b(0.34), ease: E.acelera(2) }, SALIDA)
  marco.forEach(f => tl.to(f.scale, { x: 0.001, duration: b(0.30), ease: E.acelera(3) }, SALIDA))
  tl.to(cama.scale, { y: 0.001, duration: b(0.34), ease: E.acelera(3) }, SALIDA + b(0.06))

  // ---- camara: devolverla es CONTRATO
  // CAMARA QUE VA DE A HACIA B. La escena compara dos cosas, asi que la camara hace el recorrido de la
  // comparacion: arranca del lado de A y termina del lado de B, monotona. Un vaiven que vuelve al centro
  // decia "mira las dos" y lo que hay que decir es "pasa de una a la otra".
  tl.fromTo(camera.position, { x: orbita(-0.20) }, { x: orbita(0.20), duration: DUR * 0.90, ease: E.vaiven(), immediateRender: false }, 0)
  tl.to(camera.position, { x: 0, duration: DUR * 0.10, ease: E.frena(2) }, DUR * 0.90)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, DUR - 0.001)

  return { g, gr, tl }
}
