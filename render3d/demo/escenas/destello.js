// ANTHEM · destello — el beat de INVERSIÓN. 4 beats · 1.94 s.
//
// POR QUÉ EXISTE ESTA ESCENA
// Una pieza de 36 beats que mantiene el mismo aire de principio a fin se lee como un loop, no como un
// montaje. Acá el cuadro se da vuelta entero durante cuatro beats: fondo blanco, tipografía negra,
// bloom apagado, viñeta abierta. No es un cambio de color — es un cambio de REGISTRO, y es lo que hace
// que la segunda mitad de la pieza se sienta distinta de la primera sin tener que decirlo.
//
// LOS TRES GOLPES
//   b0.0   flash de un frame + inversión instantánea. El corte no se cruza: se rompe.
//   b2.0   la palabra hero se parte por la mitad y entre las dos mitades entra la única línea de color
//          del bloque. Es el "segundo golpe" — el que evita que el beat de inversión sea una postal.
//   b3.5   segundo flash y vuelta a oscuro. Obligatorio: la escena siguiente cuenta con el fondo negro.
//
// TODO LO PRESTADO SE DEVUELVE
// Esta escena escribe sobre uniforms compartidos (fondo, película, bloom) y sobre la cámara. Se guarda
// el valor original al construir y se restituye con un .set() explícito antes del final: si el motor
// arranca `cierre` con el fondo en blanco y el bloom en cero, la pieza se desarma y el bug aparece
// recién en el video terminado.

import { LOOK, b, texto, materialMascara, filete, hex } from '../kit.js'

export const meta = { id: 'destello', beats: 4 }

const F = 1 / 30                    // un frame a 30 fps: la unidad del corte seco
const PAPEL_BORDE = '#dde1ea'
const PAPEL_CENTRO = '#ffffff'
const GRIS = '#98a1b3'              // el segundo valor: deja pasar la tipografía negra por encima
const NEGRO = '#000000'
const ABIERTO = 1.10                // la máscara abre MÁS que el plano: si termina en 1.0, el borde
                                    // suave del shader se come la última letra y nunca se ve entera

export function build(ctx) {
  const { THREE, gsap, mundoW, camera, distBase, fondo, pelicula, bloom, rnd } = ctx

  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })

  // ---------------------------------------------------------------- estado prestado
  const oA = fondo.uA.value.clone()
  const oB = fondo.uB.value.clone()
  const oGrilla = fondo.uGrilla.value
  const oPulso = fondo.uPulso.value
  const oBloom = bloom.strength
  const oVin = pelicula.uVinieta.value
  const oAb = pelicula.uAberr.value
  const papelA = hex(PAPEL_BORDE)
  const papelB = hex(PAPEL_CENTRO)

  // ---------------------------------------------------------------- útiles locales
  // El acento del kit viene multiplicado x3.2 porque está pensado para florecer sobre negro. Sobre
  // blanco y con el bloom apagado eso se lava y queda un celeste sucio: acá el color va PLANO.
  const plano = c => new THREE.MeshBasicMaterial({ color: hex(c), toneMapped: false })
  const matNegro = plano(NEGRO)
  const matGris = plano(GRIS)
  const matAzul = plano(LOOK.acento)

  // Una barra con el pivote en un borde: escalarla la hace CRECER desde ahí en vez de inflarse desde
  // el centro. Es la diferencia entre una barra que se dibuja y una que aparece.
  function barra(w, h, ancla = 'izq', mat = matNegro) {
    const geo = new THREE.PlaneGeometry(w, h)
    if (ancla === 'izq') geo.translate(w / 2, 0, 0)
    else if (ancla === 'der') geo.translate(-w / 2, 0, 0)
    else if (ancla === 'abajo') geo.translate(0, h / 2, 0)
    return new THREE.Mesh(geo, mat)
  }

  // Arco y no anillo completo: un círculo perfecto girando no se ve girar. El corte es lo que hace
  // legible la rotación, y una rotación lenta y constante es la capa que impide que el cuadro descanse.
  function arco(rInt, rExt, vuelta, mat = matNegro) {
    return new THREE.Mesh(new THREE.RingGeometry(rInt, rExt, 96, 1, 0, Math.PI * 2 * vuelta), mat)
  }

  // Texto dimensionado por ANCHO (no por alto): en un reel la tipografía se compone contra los bordes
  // del cuadro, y el alto es lo que salga de la fuente. Revelado por máscara, tintado a negro puro:
  // el glifo se dibuja en blanco y el shader lo pinta, así no hay franjas oscuras en el antialias.
  function capa(str, ancho, o = {}) {
    const t = texto(str, { fuente: 'ArchivoBlack', size: 200, ...o })
    const ar = Math.max(0.2, t.ar || 4)
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(ancho, ancho / ar),
      materialMascara(t.tex, o.tinta || NEGRO),
    )
    m.material.uniforms.uSuave.value = o.suave != null ? o.suave : 0.045
    m.material.uniforms.uDir.value = o.dir != null ? o.dir : 0
    m.userData.u = m.material.uniforms
    return m
  }

  // La mitad superior o inferior de una textura de texto, recortada por UV. Dos mallas que juntas se
  // leen como una sola palabra — hasta que dejan de estarlo.
  function mitad(t, ancho, arriba) {
    const ar = Math.max(0.2, t.ar || 4)
    const alto = ancho / ar
    const geo = new THREE.PlaneGeometry(ancho, alto / 2)
    const uv = geo.attributes.uv
    for (let i = 0; i < uv.count; i++) {
      const v = uv.getY(i)
      uv.setY(i, arriba ? 0.5 + v * 0.5 : v * 0.5)
    }
    uv.needsUpdate = true
    const m = new THREE.Mesh(geo, materialMascara(t.tex, NEGRO))
    m.material.uniforms.uSuave.value = 0.03
    m.position.y = arriba ? alto / 4 : -alto / 4
    m.userData.u = m.material.uniforms
    m.userData.y0 = m.position.y
    return m
  }

  // ---------------------------------------------------------------- composición
  const XI = -2.44                              // margen izquierdo del bloque de texto
  const XD = 2.44
  const formas = new THREE.Group(); formas.position.z = -0.4; g.add(formas)
  const tipo = new THREE.Group(); g.add(tipo)

  // — zona superior: etiqueta, regla, arco que se sale por la derecha, disco
  const etiqueta = capa('05 · INVERSION', 1.75, { fuente: 'DMSans', peso: 500, tracking: 0.26 })
  etiqueta.position.set(XI + 1.75 / 2, 4.32, 0); tipo.add(etiqueta)

  const regla = barra(XD - XI, 0.035, 'izq')
  regla.position.set(XI, 4.02, 0); formas.add(regla)

  const arcoTop = arco(1.34, 1.43, 0.80)
  arcoTop.position.set(1.75, 3.35, 0); formas.add(arcoTop)

  const disco = new THREE.Mesh(new THREE.CircleGeometry(0.60, 64), matNegro)
  disco.position.set(-1.80, 3.05, 0); formas.add(disco)

  // — regla vertical: en gris, porque la cruzan las palabras a sangre. Negro sobre negro es una mancha.
  // Los grises van un poco más al fondo que los negros: son opacos y comparten pase, así que sin
  // separarlos en z el orden de dibujado lo decide el sorter y una barra negra aparece tapada por un
  // filete gris en unos frames sí y en otros no.
  const vRegla = barra(0.05, 9.4, 'abajo', matGris)
  vRegla.position.set(-2.62, -4.7, -0.12); formas.add(vRegla)

  // — bloque de texto
  const L1 = capa('ESTO NO LO HACE', mundoW * 0.945)
  L1.position.set(0, 1.45, 0); tipo.add(L1)

  const L2 = capa('UNA', 1.75, { dir: 2, suave: 0.10 })
  L2.position.set(XI + 1.75 / 2, 0.42, 0); tipo.add(L2)

  const barraUna = barra(2.95, 0.56, 'der')
  barraUna.position.set(XD, 0.42, 0); formas.add(barraUna)

  // — el hero: a sangre por los dos lados, partido en dos desde que se construye
  const tHero = texto('PLANTILLA', { fuente: 'ArchivoBlack' })
  const ANCHO_HERO = mundoW * 1.12
  const ALTO_HERO = ANCHO_HERO / Math.max(0.2, tHero.ar || 4.6)
  const heroWrap = new THREE.Group(); heroWrap.position.set(0, -0.90, 0); tipo.add(heroWrap)
  const heroG = new THREE.Group(); heroWrap.add(heroG)
  const mArriba = mitad(tHero, ANCHO_HERO, true); heroG.add(mArriba)
  const mAbajo = mitad(tHero, ANCHO_HERO, false); heroG.add(mAbajo)

  const anilloGrande = arco(2.10, 2.145, 0.86, matGris)
  anilloGrande.position.set(0, -0.90, -0.18); formas.add(anilloGrande)

  // El único color del bloque, y entra recién en el segundo golpe. Va detrás del texto en z para que
  // la tipografía nunca quede recortada contra él.
  const lineaAcento = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 1.20, 0.075), matAzul)
  lineaAcento.position.set(0, -0.90, -0.05)
  lineaAcento.scale.x = 0.0001
  g.add(lineaAcento)

  const caption = capa('HECHO CUADRO POR CUADRO', 3.30, { fuente: 'DMSans', peso: 500, tracking: 0.20 })
  caption.position.set(XI + 3.30 / 2, -2.14, 0); tipo.add(caption)

  // — zona inferior: una fila de cuadraditos con anchos sembrados y tres barras a sangre
  const puntos = []
  let px = XI
  for (let i = 0; i < 7; i++) {
    const w = 0.16 + rnd() * 0.40
    const p = barra(w, 0.10, 'izq')
    p.position.set(px, -2.52, 0)
    formas.add(p); puntos.push(p)
    px += w + 0.11
  }

  const barrasG = new THREE.Group(); formas.add(barrasG)
  const barras = [
    barra(4.35, 0.115, 'izq'),
    barra(5.60, 0.115, 'izq'),
    barra(2.60, 0.115, 'izq'),
  ]
  barras.forEach((m, i) => { m.position.set(XI, -2.95 - i * 0.40, 0); barrasG.add(m) })

  const cuadrito = barra(0.42, 0.42, 'izq')
  cuadrito.position.set(2.15, -4.30, 0); formas.add(cuadrito)

  // — el panel que traga el cuadro antes del segundo flash, con un filo de acento en su borde
  const panelG = new THREE.Group(); g.add(panelG)
  const panel = barra(8.0, 13.0, 'abajo', matNegro)
  panel.position.set(0, -6.4, 0.62)
  panel.scale.y = 0.0001
  panelG.add(panel)
  const filoPanel = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 0.06), matAzul)
  filoPanel.position.set(0, -6.4, 0.64)
  panelG.add(filoPanel)

  // — el barrido que firma la vuelta a oscuro: acá sí, acento del kit, para que el bloom restituido
  //   lo haga brillar como luz y no como pintura.
  // Arranca ENTERO fuera de cuadro: con medio filete asomando por la izquierda, el primer frame de la
  // escena (que todavía es oscuro) se come una raya de color que no tiene por qué estar ahí.
  const barrido = filete(3.4, 0.055, LOOK.acento2)
  barrido.position.set(-5.0, 2.20, 0.30)
  g.add(barrido)

  // ================================================================= TIMELINE
  // Todo cae en beats enteros, medios o cuartos. Nada "a los 2.3 segundos".

  // ---------------------------------------------------------------- b0.00 · LA INVERSIÓN
  // El flash dura un frame de subida y tres de bajada. Menos no se ve; más se lee como un error de
  // codec. Y en ese mismo frame se da vuelta TODO: si el fondo cruzara suave, el corte desaparecería.
  // Ojo con el orden de los tweens sobre un mismo valor: un fromTo posterior fija su estado inicial
  // en TODO el tiempo anterior (y encima lo aplica al construir). El primero de cada cadena puede ser
  // fromTo — es el que declara de dónde sale —; los que siguen tienen que ser .to() o pisan hacia
  // atrás. Con uFlash eso significaba un cuadro entero en blanco durante los cuatro beats.
  tl.fromTo(pelicula.uFlash, { value: 0 }, { value: 1, duration: F, ease: 'none' }, 0)
  tl.to(pelicula.uFlash, { value: 0, duration: 3 * F, ease: 'power2.in' }, F)

  tl.fromTo(fondo.uA.value, { r: oA.r, g: oA.g, b: oA.b },
    { r: papelA.r, g: papelA.g, b: papelA.b, duration: F, ease: 'none' }, 0)
  tl.fromTo(fondo.uB.value, { r: oB.r, g: oB.g, b: oB.b },
    { r: papelB.r, g: papelB.g, b: papelB.b, duration: F, ease: 'none' }, 0)
  // La grilla en fuga tiñe de acento: sobre papel ensucia el blanco. Se apaga y vuelve al final.
  tl.fromTo(fondo.uGrilla, { value: oGrilla }, { value: 0.04, duration: F, ease: 'none' }, 0)
  // Sobre blanco TODO supera el umbral del bloom, así que el pase difumina el cuadro entero y lo suma
  // encima: las letras negras se llenaban de blanco y salían GRISES. No alcanza con bajarlo — con
  // strength 0.10 el negro puro llegaba a un 35% de gris. En el bloque invertido el bloom va a CERO.
  tl.fromTo(bloom, { strength: oBloom }, { strength: 0, duration: F, ease: 'none' }, 0)
  // Y la viñeta pensada para negro, sobre papel, se lee como suciedad de escaneo.
  tl.fromTo(pelicula.uVinieta, { value: oVin }, { value: 0.30, duration: F, ease: 'none' }, 0)
  tl.fromTo(pelicula.uAberr, { value: oAb }, { value: 0.0070, duration: F, ease: 'none' }, 0)
  tl.to(pelicula.uAberr, { value: 0.0020, duration: b(0.6), ease: 'power2.out' }, F)

  // Golpe de cámara: entra de un frame y se acomoda durante beat y medio. El asentamiento largo es la
  // capa que sostiene el "nada descansa" mientras la tipografía todavía está entrando.
  tl.fromTo(camera.position, { z: distBase }, { z: distBase * 0.885, duration: F, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: b(1.7), ease: 'power3.out' }, F)
  tl.fromTo(camera.rotation, { z: 0 }, { z: 0.014, duration: F, ease: 'none' }, 0)
  tl.to(camera.rotation, { z: 0, duration: b(0.9), ease: 'elastic.out(1, 0.5)' }, F)

  // ---------------------------------------------------------------- b0.10–b1.30 · ENTRA EL CUADRO
  // Primero el hero, que es el que manda; el resto llega detrás, siempre a destiempo.
  tl.fromTo([mArriba.userData.u.uProg, mAbajo.userData.u.uProg], { value: 0 },
    { value: ABIERTO, duration: b(0.42), ease: 'power4.out', stagger: 0.035 }, b(0.10))
  tl.fromTo(heroWrap.position, { x: -0.16 }, { x: 0, duration: b(0.55), ease: 'back.out(2.2)' }, b(0.10))
  tl.fromTo(heroWrap.scale, { x: 1.10 }, { x: 1, duration: b(0.50), ease: 'back.out(1.9)' }, b(0.10))

  tl.fromTo(vRegla.scale, { y: 0.0001 }, { y: 1, duration: b(0.42), ease: 'back.out(1.7)' }, b(0.22))

  tl.fromTo(L1.userData.u.uProg, { value: 0 }, { value: ABIERTO, duration: b(0.34), ease: 'power4.out' }, b(0.28))
  tl.fromTo(L1.position, { x: -0.10 }, { x: 0, duration: b(0.42), ease: 'back.out(2.4)' }, b(0.28))

  tl.fromTo(arcoTop.scale, { x: 0.0001, y: 0.0001 }, { x: 1, y: 1, duration: b(0.60), ease: 'back.out(2.4)' }, b(0.40))
  tl.fromTo(arcoTop.rotation, { z: -0.95 }, { z: 0, duration: b(0.70), ease: 'power3.out' }, b(0.40))

  tl.fromTo(anilloGrande.scale, { x: 0.0001, y: 0.0001 }, { x: 1, y: 1, duration: b(0.65), ease: 'back.out(2.0)' }, b(0.46))
  tl.fromTo(anilloGrande.rotation, { z: 0.7 }, { z: 0, duration: b(0.80), ease: 'power3.out' }, b(0.46))

  tl.fromTo(L2.userData.u.uProg, { value: 0 }, { value: ABIERTO, duration: b(0.30), ease: 'power3.out' }, b(0.52))
  tl.fromTo(barraUna.scale, { x: 0.0001 }, { x: 1, duration: b(0.36), ease: 'back.out(1.9)' }, b(0.58))
  tl.fromTo(disco.scale, { x: 0.0001, y: 0.0001 }, { x: 1, y: 1, duration: b(0.42), ease: 'back.out(2.7)' }, b(0.70))

  tl.fromTo(barras.map(m => m.scale), { x: 0.0001 },
    { x: 1, duration: b(0.34), ease: 'back.out(1.7)', stagger: 0.055 }, b(0.80))

  tl.fromTo(etiqueta.userData.u.uProg, { value: 0 }, { value: ABIERTO, duration: b(0.28), ease: 'power3.out' }, b(0.95))
  tl.fromTo(regla.scale, { x: 0.0001 }, { x: 1, duration: b(0.40), ease: 'expo.out' }, b(0.95))
  tl.fromTo(caption.userData.u.uProg, { value: 0 }, { value: ABIERTO, duration: b(0.32), ease: 'power3.out' }, b(1.05))
  tl.fromTo(puntos.map(m => m.scale), { x: 0.0001 },
    { x: 1, duration: b(0.20), ease: 'back.out(3)', stagger: 0.038 }, b(1.12))
  tl.fromTo(cuadrito.scale, { x: 0.0001, y: 0.0001 }, { x: 1, y: 1, duration: b(0.26), ease: 'back.out(3)' }, b(1.20))

  // ---------------------------------------------------------------- capas que NUNCA se detienen
  // Entre b1.3 y b2.0 no entra nada nuevo. Si estas cuatro capas no estuvieran, ese medio segundo se
  // leería como una diapositiva y se llevaría puesta la escena entera.
  tl.to(arcoTop.rotation, { z: 0.55, duration: b(2.2), ease: 'none' }, b(1.10))
  tl.to(anilloGrande.rotation, { z: -0.38, duration: b(2.2), ease: 'none' }, b(1.26))
  tl.fromTo(cuadrito.position, { x: 2.15 }, { x: -2.55, duration: b(2.5), ease: 'none' }, b(1.15))
  tl.to(barrasG.position, { x: 0.22, duration: b(2.0), ease: 'none' }, b(1.20))
  tl.to(disco.position, { y: 2.78, duration: b(2.0), ease: 'sine.inOut' }, b(1.30))
  tl.to(tipo.scale, { x: 1.012, y: 1.012, duration: b(2.4), ease: 'none' }, b(0.20))

  // Pulsos de un cuarto de beat sobre el hero: la palabra "respira" con la música en vez de esperar.
  tl.fromTo(heroG.scale, { x: 1, y: 1 }, { x: 1.028, y: 1.028, duration: b(0.12), ease: 'power2.out' }, b(1.00))
  tl.to(heroG.scale, { x: 1, y: 1, duration: b(0.22), ease: 'power2.inOut' }, b(1.12))
  tl.to(heroG.scale, { x: 1.028, y: 1.028, duration: b(0.12), ease: 'power2.out' }, b(1.50))
  tl.to(heroG.scale, { x: 1, y: 1, duration: b(0.22), ease: 'power2.inOut' }, b(1.62))
  tl.to(regla.scale, { x: 0.62, duration: b(0.10), ease: 'power3.in' }, b(1.75))
  tl.to(regla.scale, { x: 1, duration: b(0.20), ease: 'back.out(2.6)' }, b(1.85))

  // ---------------------------------------------------------------- b2.00 · EL SEGUNDO GOLPE
  // La palabra se parte por la mitad. El corte pasa por el medio de las letras, no entre ellas: el ojo
  // sigue leyendo "PLANTILLA" mientras se abre, y esa tensión es todo el efecto.
  tl.to(pelicula.uFlash, { value: 0.20, duration: F, ease: 'none' }, b(2.00))
  tl.to(pelicula.uFlash, { value: 0, duration: F, ease: 'power2.in' }, b(2.00) + F)
  tl.to(pelicula.uAberr, { value: 0.0065, duration: F, ease: 'none' }, b(2.00))
  tl.to(pelicula.uAberr, { value: 0.0020, duration: b(0.5), ease: 'power2.out' }, b(2.00) + F)

  tl.fromTo(mArriba.position, { y: mArriba.userData.y0, x: 0 },
    { y: mArriba.userData.y0 + 0.42, x: 0.15, duration: b(0.32), ease: 'back.out(2.6)' }, b(2.00))
  tl.fromTo(mAbajo.position, { y: mAbajo.userData.y0, x: 0 },
    { y: mAbajo.userData.y0 - 0.42, x: -0.15, duration: b(0.32), ease: 'back.out(2.6)' }, b(2.03))
  tl.fromTo(lineaAcento.scale, { x: 0.0001 }, { x: 1, duration: b(0.34), ease: 'expo.out' }, b(2.02))

  // El cuadro se vacía de arriba hacia abajo apenas terminó de abrirse el corte, y las máscaras salen
  // al revés de como entraron. Que la fila de "UNA" despeje primero no es un detalle: la mitad de
  // arriba de la palabra sube justo hasta ahí, y dos negros pegados se leen como una mancha.
  tl.to(barraUna.scale, { x: 0.0001, duration: b(0.26), ease: 'power3.in' }, b(2.20))
  tl.set(L1.userData.u.uDir, { value: 1 }, b(2.27))
  tl.to(L1.userData.u.uProg, { value: 0, duration: b(0.30), ease: 'power2.in' }, b(2.28))
  tl.to(L2.userData.u.uProg, { value: 0, duration: b(0.26), ease: 'power2.in' }, b(2.36))
  tl.to(etiqueta.userData.u.uProg, { value: 0, duration: b(0.24), ease: 'power2.in' }, b(2.44))
  tl.to(puntos.map(m => m.scale), { x: 0.0001, duration: b(0.18), ease: 'power3.in', stagger: 0.03 }, b(2.44))
  tl.to(caption.userData.u.uProg, { value: 0, duration: b(0.24), ease: 'power2.in' }, b(2.52))

  // ---------------------------------------------------------------- b2.72 · LA PALABRA SE VA DE CUADRO
  // Crece más allá del encuadre mientras las dos mitades siguen separándose y las máscaras se cierran:
  // no es un fundido, es una salida.
  tl.to(heroWrap.scale, { x: 2.40, y: 2.40, duration: b(0.60), ease: 'power3.in' }, b(2.72))
  tl.to(mArriba.position, { y: mArriba.userData.y0 + 0.95, duration: b(0.55), ease: 'power2.in' }, b(2.72))
  tl.to(mAbajo.position, { y: mAbajo.userData.y0 - 0.95, duration: b(0.55), ease: 'power2.in' }, b(2.72))
  tl.to([mArriba.userData.u.uProg, mAbajo.userData.u.uProg],
    { value: 0.04, duration: b(0.50), ease: 'power2.in', stagger: 0.03 }, b(2.80))
  tl.to(formas.scale, { x: 1.9, y: 1.9, duration: b(0.55), ease: 'power3.in' }, b(2.74))
  tl.to(lineaAcento.scale, { x: 1.6, y: 4.0, duration: b(0.42), ease: 'power3.in' }, b(2.80))

  // b3.05 · el panel negro se traga el cuadro de abajo hacia arriba. El filo de acento viaja con su
  // borde superior (mismo ease, misma duración: dos tweens en fase se leen como un solo objeto).
  tl.fromTo(panel.scale, { y: 0.0001 }, { y: 1, duration: b(0.42), ease: 'expo.inOut' }, b(3.05))
  tl.fromTo(filoPanel.position, { y: -6.4 }, { y: 6.6, duration: b(0.42), ease: 'expo.inOut' }, b(3.05))

  // ---------------------------------------------------------------- b3.50 · SEGUNDO FLASH · VUELVE LA NOCHE
  // Obligatorio: `cierre` cuenta con el fondo oscuro, con el bloom entero y con la cámara en su sitio.
  tl.to(pelicula.uFlash, { value: 1, duration: F, ease: 'none' }, b(3.50))
  tl.to(pelicula.uFlash, { value: 0, duration: 3 * F, ease: 'power2.in' }, b(3.50) + F)

  // La vuelta de color arranca un frame DESPUÉS del flash, no con él: así el cambio ocurre debajo del
  // pico blanco y no se ve un cuadro gris a mitad de camino.
  tl.to(fondo.uA.value, { r: oA.r, g: oA.g, b: oA.b, duration: F, ease: 'none' }, b(3.50) + F)
  tl.to(fondo.uB.value, { r: oB.r, g: oB.g, b: oB.b, duration: F, ease: 'none' }, b(3.50) + F)
  tl.to(bloom, { strength: oBloom, duration: F, ease: 'none' }, b(3.50) + F)
  tl.to(pelicula.uVinieta, { value: oVin, duration: F, ease: 'none' }, b(3.50) + F)
  tl.to(fondo.uGrilla, { value: oGrilla, duration: b(0.40), ease: 'power2.out' }, b(3.50) + F)
  tl.to(pelicula.uAberr, { value: 0.0085, duration: F, ease: 'none' }, b(3.50))
  tl.to(pelicula.uAberr, { value: oAb, duration: b(0.40), ease: 'power2.out' }, b(3.50) + F)

  tl.to(camera.position, { z: distBase * 1.06, duration: F, ease: 'none' }, b(3.50))
  tl.to(camera.position, { z: distBase, duration: b(0.42), ease: 'power3.out' }, b(3.52))

  // Y el bloque invertido se apaga DEBAJO del flash. El panel negro tapa el cuadro sólo mientras está
  // arriba: cuando se retira tiene que destapar noche limpia, no los restos blancos de la escena — un
  // anillo gris al 190% y una barra de acento cruzada eran justo eso, basura del beat anterior.
  tl.set([tipo, formas, lineaAcento], { visible: false }, b(3.50))

  // El halo del fondo late una vez sobre el corte: es lo que hace que la vuelta a negro se lea como
  // una entrada y no como un apagón.
  tl.fromTo(fondo.uPulso, { value: oPulso }, { value: 0.30, duration: b(0.10), ease: 'power2.out' }, b(3.52))
  tl.to(fondo.uPulso, { value: oPulso, duration: b(0.30), ease: 'power2.in' }, b(3.62))

  // El panel se retira hacia abajo y destapa el fondo oscuro desde arriba, con su filo por delante.
  tl.to(panel.scale, { y: 0.0001, duration: b(0.34), ease: 'power3.inOut' }, b(3.55))
  tl.to(filoPanel.position, { y: -6.4, duration: b(0.34), ease: 'power3.inOut' }, b(3.55))
  tl.fromTo(barrido.position, { x: -5.0 }, { x: 5.0, duration: b(0.32), ease: 'power2.inOut' }, b(3.62))

  // ---------------------------------------------------------------- b3.95 · devolución explícita
  // Los tweens ya aterrizan en estos valores; el .set() es el seguro. Un uniform compartido que queda
  // a medio camino no rompe esta escena: rompe la siguiente, y ahí es imposible de encontrar.
  tl.set(fondo.uA.value, { r: oA.r, g: oA.g, b: oA.b }, b(3.95))
  tl.set(fondo.uB.value, { r: oB.r, g: oB.g, b: oB.b }, b(3.95))
  tl.set(fondo.uGrilla, { value: oGrilla }, b(3.95))
  tl.set(fondo.uPulso, { value: oPulso }, b(3.95))
  tl.set(bloom, { strength: oBloom }, b(3.95))
  tl.set(pelicula.uVinieta, { value: oVin }, b(3.95))
  tl.set(pelicula.uAberr, { value: oAb }, b(3.95))
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, b(3.95))
  tl.set(camera.rotation, { x: 0, y: 0, z: 0 }, b(3.95))

  // La timeline NACE en pausa (contrato: nada tiene que moverse solo mientras se construye la pieza),
  // pero se despausa antes de devolverla. GSAP 3 no renderiza una hija pausada: `maestra.add(hija)`
  // con hija.paused() === true la deja fuera del cálculo de duración y el playhead del padre nunca la
  // toca — la escena queda congelada en su primer cuadro y no hay error en ninguna parte. Acá el reloj
  // sigue siendo de afuera: el padre está en pausa y sólo avanza por seek(), así que despausar la hija
  // no la hace correr sola, sólo la vuelve visible para el padre.
  tl.paused(false)

  return { g, tl }
}
