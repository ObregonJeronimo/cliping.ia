// ANTHEM · tarjetas — cinco datos que se leen como UNA pieza, no como una lista.
//
// El error clásico de una escena de datos es dibujar cinco rectángulos iguales, alineados y quietos:
// eso es una tabla, no un plano de un reel. Acá cada dato entra desde un lado distinto y girado, se
// acomodan en un ARCO —una disposición que sólo existe porque hay cámara— y después la cámara los
// RECORRE de costado: se ve el canto de las tarjetas de los extremos y el paralaje entre ellas. Los
// números cuentan mientras tanto, y en el beat 4 el bloque se resuelve en una sola tarjeta que se
// viene encima mientras el resto se va hacia atrás.
//
// Tres decisiones que sostienen la escena:
//   · El CUADRO ESTÁ LLENO en vertical: titular arriba, arco al medio, epígrafe + barras abajo, y un
//     eco gigante del número héroe atrás, que casi no se mueve mientras el frente se desplaza.
//   · Los NÚMEROS cuentan con un juego de texturas PRECALCULADAS (9 por tarjeta). Generar una textura
//     por entero sería medio giga de canvas; con 8 pasos se lee igual de bien y cuesta nada.
//   · NADA se apaga con opacidad si puede irse por MÁSCARA: el texto se desescribe, no se funde.

import {
  LOOK, b, planoTexto, texto, materialMascara, matAcento, matTarjeta, enArco,
} from '../kit.js'

export const meta = { id: 'tarjetas', beats: 6 }

// ---------------------------------------------------------------- niveles
// El bloom del pase final corta en 0.62 de luminancia LINEAL, y `THREE.Color` ya convierte de sRGB a
// lineal: un #f2f4f8 entra con 0.92 y florece entero. En un glifo fino (DMSans) eso es un halo lindo;
// en un Anton de 0.6 de alto el bloom rellena los contrapunzones y el número se vuelve una mancha.
// Por eso la tipografía GRANDE va apenas por debajo del umbral y la chica se queda en el blanco del
// look. Lo mismo con el acento2 (#00e5c0, luminancia 0.60 a intensidad 1): pasado de 1.0 deja de ser
// un borde y pasa a ser una lámpara que lava el cuadro entero.
const C_NUM = '#c9d1e4'   // número: 0.63, apenas asoma el halo
const C_TIT = '#bcc4d8'   // titular: 0.55, limpio

// ---------------------------------------------------------------- el dato
const DATOS = [
  { n: 12, et: 'PAISES', ix: '01' },
  { n: 48, et: 'EQUIPOS', ix: '02' },
  { n: 300, et: 'MARCAS', ix: '03' },
  { n: 96, et: 'CIUDADES', ix: '04' },
  { n: 24, et: 'PREMIOS', ix: '05' },
]
const HERO = 2          // la que se queda
const PASOS = 8         // escalones del contador -> 9 texturas por tarjeta
const ORDEN = [0, 4, 1, 3, 2]   // entran de afuera hacia adentro: la héroe aterriza última

// geometría de la tarjeta y del arco, en unidades de mundo (cuadro visible: x ±2.81, y ±5)
const CW = 1.24, CH = 1.86, CD = 0.07
const ARCO_R = 4.4, ARCO_A = 1.30, ARCO_Y = 0.06

// cada una llega de un lado distinto: si entran todas del mismo lado se lee como una lista que baja
const ENTRADAS = [
  { dx: -3.7, dy: -2.5, dz: -1.7, ry: 1.05, rz: 0.22 },
  { dx: -1.2, dy: 4.5, dz: -1.1, ry: -0.95, rz: -0.18 },
  { dx: 0.0, dy: 0.7, dz: -6.6, ry: 0.85, rz: 0.10 },
  { dx: 1.4, dy: -4.7, dz: -1.1, ry: 0.95, rz: 0.18 },
  { dx: 3.9, dy: 2.7, dz: -1.7, ry: -1.05, rz: -0.22 },
]

export function build(ctx) {
  const { THREE, gsap, camera, distBase, rnd, fondo, pelicula } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })

  // ------------------------------------------------------------ helpers locales
  // Un plano de texto que se revela por máscara. `materialMascara` SIEMPRE con color: su uniform de
  // tinte es un vec3 y three lo sube aunque no se use — con null revienta al primer render.
  const conMascara = (m, color, dir) => {
    const map = m.material.map
    m.material.dispose()
    m.material = materialMascara(map, color)
    m.material.uniforms.uDir.value = dir
    return m
  }
  const txt = (str, alto, opts, color, dir = 0) => conMascara(planoTexto(str, alto, opts), color, dir)
  const fundible = (mat) => { mat.transparent = true; mat.needsUpdate = true; return mat }
  const regla = (largo, grosor, color, intensidad) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largo, grosor), fundible(matAcento(color, intensidad)))
    return m
  }

  // Contador: en vez de una textura por entero (medio giga de canvas), PASOS+1 texturas fijas y un
  // índice que las intercambia. El plano se construye con el ancho del valor final y se compensa con
  // scale.x, así el glifo mantiene su tamaño aunque el número gane dígitos.
  function contador(alto, valorFinal, size, color, texsPrestadas, arPrestado) {
    let texs = texsPrestadas
    if (!texs) {
      texs = []
      for (let k = 0; k <= PASOS; k++) texs.push(texto(String(Math.round(valorFinal * k / PASOS)), { fuente: 'Anton', size }))
    }
    const arFin = arPrestado || texs[PASOS].ar
    const mat = materialMascara(texs[0].tex, color)
    mat.uniforms.uDir.value = 2                      // se escribe de abajo hacia arriba
    const malla = new THREE.Mesh(new THREE.PlaneGeometry(alto * arFin, alto), mat)
    malla.scale.x = texs[0].ar / arFin
    const poner = (k) => {
      const t = texs[k < 0 ? 0 : k > PASOS ? PASOS : k]
      mat.uniforms.map.value = t.tex
      malla.scale.x = t.ar / arFin
    }
    return { malla, mat, texs, arFin, poner }
  }

  // ------------------------------------------------------------ ECO: el número héroe, gigante, atrás
  // Comparte las texturas de la tarjeta héroe, así que cuenta con ella sin costar una sola textura
  // más. A z=-7.2 casi no se desplaza mientras el frente barre: eso es lo que se lee como profundidad.
  const heroTexs = []
  for (let k = 0; k <= PASOS; k++) heroTexs.push(texto(String(Math.round(DATOS[HERO].n * k / PASOS)), { fuente: 'Anton', size: 130 }))
  const eco = contador(3.8, DATOS[HERO].n, 130, '#243066', heroTexs, heroTexs[PASOS].ar)
  eco.mat.uniforms.uSuave.value = 0.22
  eco.malla.position.set(0, 0.10, -7.2)
  g.add(eco.malla)

  // ------------------------------------------------------------ bloque superior
  const kicker = txt('BLOQUE 04 · DATOS', 0.13, { fuente: 'DMSans', size: 64, tracking: 0.34 }, LOOK.acento2, 0)
  kicker.position.set(0, 3.85, 1.20)
  g.add(kicker)

  const titulo = txt('EN NUMEROS', 1.05, { fuente: 'Anton', size: 110 }, C_TIT, 0)
  titulo.position.set(0, 3.10, 1.20)
  g.add(titulo)

  const reglaTit = regla(4.40, 0.030, LOOK.acento, 2.2)
  reglaTit.position.set(0, 2.50, 1.20)
  reglaTit.scale.x = 0
  g.add(reglaTit)

  // ------------------------------------------------------------ bloque inferior
  const epigrafe = txt('CINCO INDICADORES · UNA MISMA HISTORIA', 0.135, { fuente: 'DMSans', size: 72, tracking: 0.16 }, LOOK.tinta, 0)
  epigrafe.position.set(0, -1.70, 0.42)
  g.add(epigrafe)

  const reglaPie = regla(4.90, 0.026, LOOK.acento, 2.2)
  reglaPie.position.set(0, -2.20, 0.42)
  reglaPie.scale.x = 0
  g.add(reglaPie)

  const pieI = txt('ANTHEM', 0.15, { fuente: 'DMSans', size: 64, tracking: 0.30 }, LOOK.tinta, 0)
  pieI.position.set(-2.38 + 0.15 * pieI.userData.ar / 2, -2.48, 0.42)
  g.add(pieI)
  const pieD = txt('2026', 0.15, { fuente: 'DMSans', size: 64, tracking: 0.30 }, LOOK.acento2, 1)
  pieD.position.set(2.38 - 0.15 * pieD.userData.ar / 2, -2.48, 0.42)
  g.add(pieD)

  // Barras: la banda de abajo no puede quedar negra, y un gráfico abstracto además respira durante
  // todo el travelling. La geometría se traslada media altura para que crezcan desde su base.
  const NB = 26, PASO_B = 0.19
  const barras = new THREE.Group()
  barras.position.set(0, -4.05, 0.42)
  const altoB = [], alt2 = [], per2 = []
  for (let i = 0; i < NB; i++) {
    const h = 0.22 + rnd() * 1.13
    altoB.push(h)
    const geo = new THREE.PlaneGeometry(0.055, h)
    geo.translate(0, h / 2, 0)
    const acentua = i % 5 === 2
    const m = new THREE.Mesh(geo, fundible(matAcento(acentua ? LOOK.acento2 : LOOK.acento, acentua ? 0.95 : 1.10)))
    m.position.x = (i - (NB - 1) / 2) * PASO_B
    m.scale.y = 0
    barras.add(m)
    alt2.push(0.40 + rnd() * 0.95)
    per2.push(rnd())
  }
  g.add(barras)

  const zocalo = regla(4.90, 0.022, LOOK.acento, 1.0)
  zocalo.position.set(0, -4.11, 0.42)
  zocalo.scale.x = 0
  g.add(zocalo)

  // ------------------------------------------------------------ las cinco tarjetas
  const tarjetas = []
  for (let i = 0; i < 5; i++) {
    const d = DATOS[i]
    const esHero = i === HERO
    const gr = new THREE.Group()

    // borde de acento: un plano apenas más grande DETRÁS del cuerpo. Al girar, asoma por un canto y
    // no por el otro — que es exactamente lo que delata que hay volumen.
    const rimMat = fundible(matAcento(esHero ? LOOK.acento2 : LOOK.acento, esHero ? 0.95 : 1.10))
    const rim = new THREE.Mesh(new THREE.PlaneGeometry(CW + 0.055, CH + 0.055), rimMat)
    rim.position.z = -CD / 2 - 0.014
    gr.add(rim)

    // cuerpo con espesor real: el travelling lateral necesita un canto que atrape la luz
    const cuerpoMat = fundible(matTarjeta(esHero ? '#111c40' : '#0c1124'))
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CD), cuerpoMat)
    gr.add(cuerpo)

    const zf = CD / 2 + 0.008
    const idx = txt(d.ix, 0.088, { fuente: 'DMSans', size: 60, tracking: 0.30 }, esHero ? LOOK.acento2 : LOOK.acento, 0)
    idx.position.set(0, CH / 2 - 0.20, zf)
    gr.add(idx)

    const num = contador(0.62, d.n, esHero ? 130 : 80, C_NUM, esHero ? heroTexs : null, esHero ? heroTexs[PASOS].ar : null)
    num.malla.position.set(0, 0.20, zf)
    gr.add(num.malla)

    const fil = regla(0.70, 0.032, esHero ? LOOK.acento2 : LOOK.acento, esHero ? 0.95 : 2.6)
    fil.position.set(0, -0.24, zf)
    fil.scale.x = 0
    gr.add(fil)

    const lab = txt(d.et, 0.115, { fuente: 'DMSans', size: 76, tracking: 0.16 }, LOOK.tinta, 0)
    lab.position.set(0, -0.47, zf)
    gr.add(lab)

    // barrita de progreso: se llena con el contador, así el número no es el único que avanza
    const anchoP = CW * 0.72
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(anchoP, 0.022), fundible(matAcento(LOOK.acento, 0.5)))
    pista.position.set(0, -0.72, zf)
    pista.material.opacity = 0
    gr.add(pista)
    const geoR = new THREE.PlaneGeometry(anchoP, 0.022)
    geoR.translate(anchoP / 2, 0, 0)
    const relleno = new THREE.Mesh(geoR, fundible(matAcento(esHero ? LOOK.acento2 : LOOK.acento, esHero ? 0.9 : 2.2)))
    relleno.position.set(-anchoP / 2, -0.72, zf + 0.002)
    relleno.scale.x = 0
    gr.add(relleno)

    g.add(gr)
    tarjetas.push({ gr, rim, rimMat, cuerpoMat, idx, num, fil, lab, pista, relleno, esHero })
  }

  // el arco: sólo existe porque hay cámara, y es lo que convierte cinco fichas en una composición
  enArco(tarjetas.map(t => t.gr), ARCO_R, ARCO_A)
  tarjetas.forEach((t, i) => {
    const u = Math.abs(i / 4 - 0.5) * 2                   // 1 en los bordes, 0 en el centro
    t.gr.position.y = ARCO_Y + 0.17 * (1 - u)             // arco también en y: leve, pero se nota
    t.base = { x: t.gr.position.x, y: t.gr.position.y, z: t.gr.position.z, ry: t.gr.rotation.y }
  })

  // estado del primer frame, explícito: los tweens son fromTo con immediateRender:false para no
  // tocar la cámara ni las capas antes de que el cabezal entre en esta escena
  tarjetas.forEach((t, i) => {
    const e = ENTRADAS[i]
    t.gr.position.set(t.base.x + e.dx, t.base.y + e.dy, t.base.z + e.dz)
    t.gr.rotation.set(0, t.base.ry + e.ry, e.rz)
    t.gr.scale.setScalar(0.55)
  })

  // ================================================================ TIEMPO
  // Todo cae sobre la grilla de beats. Nada arranca "a los 2.3 segundos".

  // ---------------------------------------------------------------- cámara
  // Beat 0-1.15: viene de más lejos y se acerca. Beat 1.15-4: TRAVELLING LATERAL delante del arco,
  // con una contra-rotación del 70% (no del 100%: si compensa todo, el arco queda clavado al centro
  // y el movimiento se pierde). Beat 4-5.15: vuelve exactamente a su lugar — es contrato.
  tl.fromTo(camera.position, { x: -0.30, y: 0.18, z: distBase + 3.30 },
    { x: -1.45, y: 0.02, z: distBase - 0.55, duration: b(1.15), ease: 'power4.out', immediateRender: false }, 0)
  tl.fromTo(camera.rotation, { x: 0, y: 0, z: 0 },
    { x: 0.004, y: -0.050, z: 0.012, duration: b(1.15), ease: 'power4.out', immediateRender: false }, 0)

  tl.to(camera.position, { x: 1.62, duration: b(2.85), ease: 'sine.inOut' }, b(1.15))
  tl.to(camera.rotation, { y: 0.058, duration: b(2.85), ease: 'sine.inOut' }, b(1.15))
  // el acercamiento se queda en -1.70: más adentro y el bloque de titular se sale por arriba
  tl.to(camera.position, { z: distBase - 1.70, duration: b(1.45), ease: 'sine.inOut' }, b(1.15))
  tl.to(camera.position, { z: distBase - 0.60, duration: b(1.40), ease: 'sine.inOut' }, b(2.60))
  tl.to(camera.position, { y: -0.16, duration: b(1.60), ease: 'sine.inOut' }, b(1.15))
  tl.to(camera.position, { y: 0.05, duration: b(1.25), ease: 'sine.inOut' }, b(2.75))
  tl.to(camera.rotation, { x: -0.006, z: -0.016, duration: b(1.60), ease: 'sine.inOut' }, b(1.15))
  tl.to(camera.rotation, { x: 0.004, z: 0.008, duration: b(1.25), ease: 'sine.inOut' }, b(2.75))

  tl.to(camera.position, { x: 0, y: 0, z: distBase, duration: b(1.15), ease: 'power3.inOut' }, b(4.0))
  tl.to(camera.rotation, { x: 0, y: 0, z: 0, duration: b(1.15), ease: 'power3.inOut' }, b(4.0))

  // ---------------------------------------------------------------- fondo y pase final
  tl.fromTo(fondo.uPulso, { value: 0 }, { value: 0.42, duration: b(0.18), ease: 'power2.out', immediateRender: false }, 0)
  tl.to(fondo.uPulso, { value: 0, duration: b(1.10), ease: 'power2.out' }, b(0.18))
  tl.fromTo(fondo.uGrilla, { value: 0.55 }, { value: 0.74, duration: b(1.40), ease: 'sine.inOut', immediateRender: false }, b(1.0))
  tl.to(fondo.uGrilla, { value: 0.26, duration: b(0.70), ease: 'power2.in' }, b(3.90))
  tl.to(fondo.uGrilla, { value: 0.55, duration: b(1.00), ease: 'sine.inOut' }, b(4.80))
  tl.fromTo(fondo.uPulso, { value: 0.55 }, { value: 0, duration: b(1.00), ease: 'power2.out', immediateRender: false }, b(4.0))
  // dos frames de blanco sobre el beat 4: el corte interno se lee como decisión de montaje
  tl.fromTo(pelicula.uFlash, { value: 0.30 }, { value: 0, duration: 0.075, ease: 'power2.in', immediateRender: false }, b(4.0))

  // ---------------------------------------------------------------- titular, epígrafe, barras
  tl.fromTo(kicker.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.45), ease: 'power2.out', immediateRender: false }, b(0.20))
  tl.fromTo(titulo.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.85), ease: 'power3.inOut', immediateRender: false }, b(0.32))
  tl.fromTo(titulo.position, { y: 3.37 }, { y: 3.10, duration: b(0.90), ease: 'back.out(2.0)', immediateRender: false }, b(0.32))
  tl.fromTo(reglaTit.scale, { x: 0 }, { x: 1, duration: b(0.70), ease: 'power3.out', immediateRender: false }, b(0.55))
  tl.fromTo(epigrafe.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.80), ease: 'power2.out', immediateRender: false }, b(0.85))
  tl.fromTo(reglaPie.scale, { x: 0 }, { x: 1, duration: b(0.75), ease: 'power3.out', immediateRender: false }, b(0.62))
  tl.fromTo(zocalo.scale, { x: 0 }, { x: 1, duration: b(0.80), ease: 'power3.out', immediateRender: false }, b(0.48))
  tl.fromTo(pieI.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.50), ease: 'power2.out', immediateRender: false }, b(0.75))
  tl.fromTo(pieD.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.50), ease: 'power2.out', immediateRender: false }, b(0.82))
  tl.fromTo(eco.mat.uniforms.uProg, { value: 0 }, { value: 1, duration: b(1.20), ease: 'power2.out', immediateRender: false }, b(0.75))

  for (let i = 0; i < NB; i++) {
    const m = barras.children[i]
    tl.fromTo(m.scale, { y: 0 }, { y: 1, duration: b(0.60), ease: 'back.out(2.2)', immediateRender: false }, b(0.55) + i * 0.016)
    // respiración: cada barra con su propio período, así el bloque nunca queda quieto
    const s = b(1.90) + i * 0.010 + per2[i] * 0.08
    tl.to(m.scale, { y: alt2[i], duration: (b(3.90) - s) / 2, ease: 'sine.inOut', repeat: 1, yoyo: true }, s)
    tl.to(m.scale, { y: 0, duration: b(0.45), ease: 'power3.in' }, b(4.0) + (NB - 1 - i) * 0.008)
  }

  // ---------------------------------------------------------------- entrada de las tarjetas
  ORDEN.forEach((i, p) => {
    const t = tarjetas[i], e = ENTRADAS[i], base = t.base
    const t0 = p * 0.07                                  // stagger: nunca llegan juntas
    tl.fromTo(t.gr.position,
      { x: base.x + e.dx, y: base.y + e.dy, z: base.z + e.dz },
      { x: base.x, y: base.y, z: base.z, duration: b(0.72), ease: 'back.out(1.9)', immediateRender: false }, t0)
    tl.fromTo(t.gr.rotation, { y: base.ry + e.ry, z: e.rz },
      { y: base.ry, z: 0, duration: b(0.80), ease: 'back.out(1.6)', immediateRender: false }, t0)
    tl.fromTo(t.gr.scale, { x: 0.55, y: 0.55, z: 0.55 },
      { x: 1, y: 1, z: 1, duration: b(0.70), ease: 'back.out(2.3)', immediateRender: false }, t0)

    // el contenido se escribe mientras la tarjeta todavía está frenando
    const tc = t0 + 0.16
    tl.fromTo(t.idx.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.40), ease: 'power2.out', immediateRender: false }, tc - 0.03)
    tl.fromTo(t.fil.scale, { x: 0 }, { x: 1, duration: b(0.50), ease: 'back.out(2.6)', immediateRender: false }, tc)
    tl.fromTo(t.num.mat.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.62), ease: 'power3.out', immediateRender: false }, tc + 0.05)
    tl.fromTo(t.pista.material, { opacity: 0 }, { opacity: 1, duration: b(0.40), ease: 'power2.out', immediateRender: false }, tc + 0.06)
    tl.fromTo(t.lab.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.55), ease: 'power2.out', immediateRender: false }, tc + 0.10)

    // ------------------------------------------------------------ el número CUENTA
    const est = { v: 0 }
    const esHero = i === HERO
    tl.to(est, {
      v: 1, duration: b(2.15), ease: 'power2.out',
      onUpdate: () => {
        const k = Math.round(est.v * PASOS)
        t.num.poner(k)
        t.relleno.scale.x = est.v
        if (esHero) eco.poner(k)                          // el eco gigante cuenta con la héroe
      },
    }, b(1.0) + p * 0.05)

    // ------------------------------------------------------------ flotación
    // repeat:3 + yoyo termina en el valor de PARTIDA: la tarjeta vuelve exacto a su base en el beat 4
    // y la salida arranca de un valor limpio. El desfasaje sale de rnd(), no de un múltiplo.
    const fs = b(1.50) + rnd() * 0.22
    const amp = (0.05 + rnd() * 0.08) * (rnd() < 0.5 ? -1 : 1)
    tl.to(t.gr.position, { y: base.y + amp, duration: (b(4.0) - fs) / 4, ease: 'sine.inOut', repeat: 3, yoyo: true }, fs)
    const fs2 = b(1.55) + rnd() * 0.24
    const gir = (rnd() < 0.5 ? -1 : 1) * 0.024
    tl.to(t.gr.rotation, { z: gir, duration: (b(4.0) - fs2) / 4, ease: 'sine.inOut', repeat: 3, yoyo: true }, fs2)
  })

  // ---------------------------------------------------------------- beat 4: se resuelve en una
  const h = tarjetas[HERO]
  tl.to(h.gr.position, { x: 0, y: 0, z: 12.2, duration: b(1.20), ease: 'back.out(1.2)' }, b(4.0))
  tl.to(h.gr.rotation, { x: 0, y: 0, z: 0, duration: b(1.00), ease: 'power2.out' }, b(4.0))
  tl.to(h.gr.scale, { x: 1.06, y: 1.06, z: 1.06, duration: b(1.20), ease: 'back.out(1.4)' }, b(4.0))
  tl.fromTo(h.rim.scale, { x: 1, y: 1 }, { x: 1.05, y: 1.035, duration: b(0.35), ease: 'power2.out', immediateRender: false }, b(4.0))
  tl.to(h.rim.scale, { x: 1, y: 1, duration: b(0.55), ease: 'elastic.out(1, 0.45)' }, b(4.35))
  // hasta el corte no descansa: sigue empujando y el borde late
  tl.to(h.gr.position, { z: 12.85, duration: b(0.65), ease: 'sine.inOut' }, b(5.20))
  tl.to(h.gr.rotation, { y: 0.045, duration: b(0.65), ease: 'sine.inOut' }, b(5.20))
  tl.to(h.rimMat, { opacity: 0.5, duration: b(0.50), ease: 'sine.inOut', repeat: 1, yoyo: true }, b(4.85))

  // las otras se van hacia atrás, acelerando (power3.in): el obturador las arrastra al irse
  tarjetas.forEach((t, i) => {
    if (i === HERO) return
    const base = t.base
    const s = i < HERO ? -1 : 1
    const d = b(4.0) + (2 - Math.abs(i - HERO)) * 0.035
    tl.to(t.gr.position, { x: base.x * 2.15 + s * 0.5, y: base.y + (i % 2 ? -0.95 : 0.95), z: base.z - 6.4, duration: b(0.90), ease: 'power3.in' }, d)
    tl.to(t.gr.rotation, { y: base.ry + s * 0.85, z: s * 0.22, duration: b(0.90), ease: 'power2.in' }, d)
    tl.to(t.gr.scale, { x: 0.62, y: 0.62, z: 0.62, duration: b(0.90), ease: 'power3.in' }, d)
    tl.to([t.num.mat.uniforms.uProg, t.idx.material.uniforms.uProg, t.lab.material.uniforms.uProg],
      { value: 0, duration: b(0.45), ease: 'power2.in', stagger: 0.03 }, d + 0.06)
    tl.to([t.rimMat, t.cuerpoMat, t.fil.material, t.pista.material, t.relleno.material],
      { opacity: 0, duration: b(0.55), ease: 'power2.in' }, d + 0.14)
  })

  // y el cuadro se despeja: el texto se DESESCRIBE, no se funde
  tl.to([kicker.material.uniforms.uProg, titulo.material.uniforms.uProg, epigrafe.material.uniforms.uProg,
    pieI.material.uniforms.uProg, pieD.material.uniforms.uProg, eco.mat.uniforms.uProg],
  { value: 0, duration: b(0.55), ease: 'power2.in', stagger: 0.035 }, b(4.0))
  tl.to([reglaTit.scale, reglaPie.scale, zocalo.scale], { x: 0.02, duration: b(0.60), ease: 'power3.in', stagger: 0.035 }, b(4.0))
  tl.to(titulo.position, { y: 4.00, duration: b(0.70), ease: 'power2.in' }, b(4.0))
  tl.to(epigrafe.position, { y: -2.55, duration: b(0.70), ease: 'power2.in' }, b(4.0))
  tl.to(eco.malla.position, { z: -11.5, duration: b(0.80), ease: 'power2.in' }, b(4.0))

  // Se suelta el freno ANTES de devolverla. GSAP nace la timeline pausada (contrato) pero un hijo
  // pausado tiene _ts = 0, y el bucle de render del padre saltea a los hijos con _ts = 0: la maestra
  // movía su cabezal y esta escena se quedaba clavada en el frame 0. No la deja correr sola, porque
  // el secuenciador la adopta en el mismo tick —sin que corra el ticker— dentro de una maestra que sí
  // está pausada: el tiempo lo sigue poniendo el seek de afuera.
  tl.paused(false)

  return { g, tl }
}
