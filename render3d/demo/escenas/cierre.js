// ANTHEM · cierre — 6 beats (2.90 s). El final asienta la pieza.
//
// UN CIERRE FLOJO ARRUINA UNA PIEZA BUENA. Lo que se hace acá:
//   · el ANILLO se dibuja desde el centro y CIERRA sobre un beat entero — el ojo lo espera y el
//     golpe cae donde tiene que caer;
//   · la marca llega DENTRO del anillo, con giro que se resuelve y overshoot que la deja clavada;
//   · la píldora de CTA entra desde abajo pasándose y rebotando: es lo único que le pide algo al
//     que mira, así que tiene que llegar con cuerpo;
//   · el filete cruza el cuadro y FRENA, y sobre él caen escalonadas las tres marcas;
//   · y todo se comprime hacia el centro mientras el bloom baja, hasta que queda solo el anillo
//     encendido — que se apaga en tres frames.
//
// El cuadro nunca está vacío: brackets de esquina, ticks radiales, anillo punteado que gira y
// polvo en profundidad. Y nada descansa: si un elemento llegó a su lugar, respira.

import { E, LOOK, b, planoTexto, materialMascara, filete, hex } from '../kit.js'
// El COPY sale de los DATOS. Lo que queda escrito aca es CHROME de la pieza (rotulos de
// capitulo, indicadores tecnicos): eso es direccion de arte y no cambia con el contenido.
// Lo que la marca DICE — su nombre, sus cifras, su claim, su CTA — sale de los datos o NO SALE.
import { D } from '../datos.js'

export const meta = { id: 'cierre', beats: 6 }

export function build(ctx) {
  const { THREE, gsap, camera, distBase, rnd, fondo, bloom } = ctx

  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })

  const FIN = b(meta.beats)
  const FRAME = 1 / 30

  // ------------------------------------------------------------------ helpers locales
  // (el kit no los trae; se resuelven acá adentro sin tocarlo)

  // NIVELES. El acento del kit ya es 1.0 en el canal azul: multiplicarlo por 3 no lo hace "mas
  // acento", lo satura y sale BLANCO — y con bloom encima, blanco lavado. Todo lo emisivo de esta
  // escena vive entre 0.7 y 1.4 para que el color se lea como COLOR y el bloom sea un halo, no una
  // mancha. La misma razon por la que el bloom base baja a 0.22: la marca ocupa media pantalla y a
  // 0.85 los huecos de la Anton se rellenan y "ANTHEM" queda como un ladrillo blanco.
  const matLuz = (color, inten = 1.2, op = 1) => new THREE.MeshBasicMaterial({
    color: hex(color).multiplyScalar(inten), toneMapped: false,
    transparent: true, opacity: op, depthWrite: false,
  })
  // el kit fija la intensidad del filete adentro; se la bajo sin tocar el kit
  const atenuar = (m, color, inten) => {
    m.material.color = hex(color).multiplyScalar(inten)
    m.material.transparent = true
    return m
  }

  // Texto que se revela por MÁSCARA, no por opacidad. El tinte va siempre puesto: el uniform vec3
  // del kit en null revienta al subirlo.
  function textoMascara(str, alto, tinte, op = {}) {
    const m = planoTexto(str, alto, { color: tinte, ...op })
    const map = m.material.map
    m.material.dispose()
    m.material = materialMascara(map, tinte)
    m.material.uniforms.uProg.value = -0.2
    return m
  }

  // ANILLO recortado por ÁNGULO. RingGeometry entera + un shader que descarta lo que el trazo
  // todavía no alcanzó: así se "dibuja" de verdad en vez de aparecer. Con cabeza brillante en el
  // borde que avanza, que es lo que lo hace leer como trazo y no como máscara.
  function anillo(radio, grosor, color, inten, segs = 0, segmentos = 384) {
    const geo = new THREE.RingGeometry(radio - grosor / 2, radio + grosor / 2, segmentos, 1)
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uProg: { value: 0 }, uAlfa: { value: 1 }, uGiro: { value: 0 },
        uSuave: { value: 0.014 }, uCabeza: { value: 1 }, uSegs: { value: segs },
        uCol: { value: hex(color).multiplyScalar(inten) },
      },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform float uProg, uAlfa, uGiro, uSuave, uCabeza, uSegs; uniform vec3 uCol;
        varying vec2 vP;
        #define TAU 6.283185307
        void main(){
          float a = mod(atan(vP.x, vP.y) - uGiro, TAU) / TAU;   // 0 arriba, horario
          // al cerrar hay que forzar el 1: si no, el smoothstep deja una muesca en la costura
          float m = max(smoothstep(uProg, uProg - uSuave, a), step(0.999, uProg));
          if (uSegs > 0.5) m *= smoothstep(0.30, 0.42, abs(fract(a * uSegs) - 0.5) + 0.12);
          float cab = smoothstep(uProg - 0.05, uProg, a) * step(a, uProg) * uCabeza;
          gl_FragColor = vec4(uCol * (1.0 + cab * 2.4), uAlfa * m);
          if (gl_FragColor.a < 0.004) discard;
        }`,
    })
    return new THREE.Mesh(geo, mat)
  }

  // PÍLDORA: esquinas redondeadas por SDF. Un plano con la textura ya redondeada quedaría atado a
  // una resolución; el SDF aguanta que la cámara se acerque.
  function pildora(w, h, color) {
    const pad = 0.08
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uW: { value: w }, uH: { value: h }, uR: { value: h * 0.5 }, uPad: { value: pad },
        uCol: { value: hex(color).multiplyScalar(1.02) }, uAlfa: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform float uW,uH,uR,uPad,uAlfa; uniform vec3 uCol; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * vec2(uW + uPad, uH + uPad);
          vec2 q = abs(p) - (vec2(uW, uH) * 0.5 - uR);
          float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uR;
          float m = smoothstep(0.010, -0.010, d);
          // degradé interno: la píldora deja de ser una mancha plana de color
          vec3 c = uCol * (0.82 + 0.40 * smoothstep(0.0, 1.0, vUv.y));
          gl_FragColor = vec4(c, m * uAlfa);
          if (gl_FragColor.a < 0.004) discard;
        }`,
    })
    return new THREE.Mesh(new THREE.PlaneGeometry(w + pad, h + pad), mat)
  }

  const ancho = m => (m.geometry.parameters && m.geometry.parameters.width) || 1

  // ==================================================================== composición
  // Dos grupos: lo que se comprime fuerte al final y el anillo, que se comprime apenas porque es
  // lo último que queda encendido.
  const gComp = new THREE.Group()
  const gAnillo = new THREE.Group()
  gAnillo.position.set(0, 1.35, 0)
  g.add(gComp, gAnillo)

  const CY = 1.35            // centro del anillo
  const R = 2.55             // radio: casi el ancho del cuadro (mundoW/2 = 2.81)

  // ---- anillo principal
  const aro = anillo(R, 0.055, LOOK.acento, 1.45)
  aro.renderOrder = 4
  gAnillo.add(aro)

  // ---- anillo punteado exterior: gira todo el tiempo. Es el seguro contra el reposo.
  const aroDeco = anillo(R + 0.20, 0.016, LOOK.acento2, 0.95, 46, 256)
  aroDeco.renderOrder = 3
  aroDeco.material.uniforms.uCabeza.value = 0
  gAnillo.add(aroDeco)

  // ---- ticks radiales, cada uno pop cuando el trazo del anillo le pasa por encima
  const NT = 28
  const gTicks = new THREE.Group()
  const ticks = []
  for (let i = 0; i < NT; i++) {
    const a = (i / NT) * Math.PI * 2
    const fuerte = i % 7 === 0
    const largo = fuerte ? 0.17 : 0.075 + rnd() * 0.03
    const t = new THREE.Mesh(
      new THREE.PlaneGeometry(fuerte ? 0.026 : 0.018, largo),
      matLuz(fuerte ? LOOK.acento2 : LOOK.acento, fuerte ? 1.05 : 0.80),
    )
    t.position.set(Math.sin(a) * (R + 0.115), Math.cos(a) * (R + 0.115), -0.02)
    t.rotation.z = -a
    t.scale.setScalar(0)
    ticks.push(t); gTicks.add(t)
  }
  gAnillo.add(gTicks)

  // ---- brackets de esquina: el cuadro tiene bordes y se nota
  const gBrackets = new THREE.Group()
  const brackets = []
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const bx = 2.52 * sx, by = 4.52 * sy
    const par = new THREE.Group()
    const h = atenuar(filete(0.46, 0.030, LOOK.acento), LOOK.acento, 1.25)
    h.position.set(-0.23 * sx, 0, 0)
    const v = atenuar(filete(0.34, 0.030, LOOK.acento), LOOK.acento, 1.25)
    v.rotation.z = Math.PI / 2; v.position.set(0, -0.17 * sy, 0)
    par.add(h, v)
    par.position.set(bx, by, -0.4)
    par.scale.setScalar(0)
    brackets.push(par); gBrackets.add(par)
  }
  gComp.add(gBrackets)

  // ---- polvo en profundidad: paralaje barato, y algo que siempre se está moviendo
  const gPolvo = new THREE.Group()
  const polvo = []
  for (let i = 0; i < 30; i++) {
    const s = 0.018 + rnd() * 0.030
    const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), matLuz(rnd() > 0.62 ? LOOK.acento2 : LOOK.acento, 0.95, 0.55))
    p.position.set((rnd() - 0.5) * 5.4, (rnd() - 0.5) * 9.4, -2.6 - rnd() * 2.6)
    p.scale.setScalar(0)
    polvo.push(p); gPolvo.add(p)
  }
  gComp.add(gPolvo)

  // ---- la marca, dentro del anillo, a escala agresiva
  const gMarca = new THREE.Group()
  gMarca.position.set(0, CY - 0.24, 0.05)
  const marca = textoMascara(D.marca, 1, LOOK.tinta, { fuente: 'Anton', tracking: 0.01 })
  marca.material.uniforms.uDir.value = 2          // se descubre de abajo hacia arriba
  marca.material.uniforms.uSuave.value = 0.10
  marca.scale.setScalar(4.34 / ancho(marca))      // 77% del ancho del cuadro
  marca.renderOrder = 6
  gMarca.add(marca)
  gComp.add(gMarca)

  // ---- píldora de CTA
  const gPill = new THREE.Group()
  gPill.position.set(0, -5.7, 0.12)
  const cta = textoMascara((D.cta || ''), 0.26, '#050810', { fuente: 'DMSans', tracking: 0.075 })
  cta.material.uniforms.uSuave.value = 0.05
  cta.renderOrder = 9
  const pillW = ancho(cta) + 1.15
  const pillH = 0.74
  const pill = pildora(pillW, pillH, LOOK.acento)
  pill.renderOrder = 8
  cta.position.set(-0.17, 0, 0.014)
  const gChev = new THREE.Group()
  gChev.position.set(pillW / 2 - 0.31, 0, 0.014)
  for (const s of [1, -1]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.148, 0.040), new THREE.MeshBasicMaterial({ color: hex('#050810'), toneMapped: false, transparent: true, depthWrite: false }))
    bar.position.set(0, 0.052 * s, 0)
    bar.rotation.z = -0.785 * s
    bar.renderOrder = 9
    gChev.add(bar)
  }
  gPill.add(pill, cta, gChev)
  gComp.add(gPill)

  // ---- filete que cruza. La geometría va corrida para que escale desde el borde IZQUIERDO:
  // si escala desde el centro se lee como "aparece", no como "cruza".
  const LF = 5.74
  const gFilete = new THREE.Group()
  gFilete.position.set(-LF / 2, -3.30, 0)
  const lineaGeo = new THREE.PlaneGeometry(LF, 0.034); lineaGeo.translate(LF / 2, 0, 0)
  const linea = new THREE.Mesh(lineaGeo, matLuz(LOOK.acento, 1.35))
  const cabeza = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.13), matLuz(LOOK.tinta, 1.5))
  cabeza.position.set(0, 0, 0.01)
  cabeza.scale.setScalar(0)
  gFilete.scale.x = 0.0001
  gFilete.add(linea)
  gComp.add(gFilete, cabeza)
  cabeza.position.set(-LF / 2, -3.30, 0.02)

  // ---- tres marcas, repartidas y escalonadas
  const datos = [
    ['1080x1920', LOOK.tinta],
    ['30 FPS', LOOK.tinta],
    ['SIN IA GENERATIVA', LOOK.acento2],
  ]
  const gMarcas = new THREE.Group()
  gMarcas.position.set(0, -3.92, 0.02)
  const marcasM = []
  const puntos = []
  const GAP = 0.44
  const piezas = datos.map(([txt, col]) => {
    const m = textoMascara(txt, 0.20, col, { fuente: 'DMSans', tracking: 0.075, upper: false })
    m.material.uniforms.uSuave.value = 0.05
    return m
  })
  const total = piezas.reduce((n, m) => n + ancho(m), 0) + GAP * (piezas.length - 1)
  let x = -total / 2
  piezas.forEach((m, i) => {
    m.position.set(x + ancho(m) / 2, 0, 0)
    m.userData.y0 = 0
    marcasM.push(m); gMarcas.add(m)
    x += ancho(m)
    if (i < piezas.length - 1) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.030, 12), matLuz(LOOK.acento, 1.45))
      d.position.set(x + GAP / 2, 0, 0)
      d.scale.setScalar(0)
      puntos.push(d); gMarcas.add(d)
      x += GAP
    }
  })
  if (total > 4.9) gMarcas.scale.setScalar(4.9 / total)
  gComp.add(gMarcas)

  // ==================================================================== timeline
  // Todo cae en beats enteros o medios. Nada "a los 2.3 segundos".

  const pe = gsap.parseEase ? gsap.parseEase(E.vaiven(3)) : (t => t)
  // invierto la curva del trazo para que cada tick reviente EXACTAMENTE cuando el borde le pasa
  const inv = y => { let lo = 0, hi = 1; for (let k = 0; k < 34; k++) { const m = (lo + hi) / 2; if (pe(m) < y) lo = m; else hi = m } return (lo + hi) / 2 }

  // --- estado inicial explícito: el seek tiene que dar lo mismo venga de donde venga
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, 0)
  tl.set(camera.rotation, { x: 0, y: 0, z: 0 }, 0)
  tl.set(fondo.uPulso, { value: 0 }, 0)
  tl.set(bloom, { strength: 0.22 }, 0)
  tl.fromTo(fondo.uGrilla, { value: 0.28 }, { value: 0.28, duration: b(4.5), ease: 'none' }, 0)

  // --- BEAT 0 → 1 · el anillo se dibuja y CIERRA
  tl.fromTo(aro.material.uniforms.uProg, { value: 0 },
    { value: 1, duration: b(1), ease: E.vaiven(3) }, 0)
  tl.fromTo(aroDeco.material.uniforms.uProg, { value: 0 },
    { value: 1, duration: b(1.2), ease: E.frena(2) }, b(0.1))
  // el punteado gira TODA la escena: nunca hay reposo total en el cuadro
  tl.to(aroDeco.material.uniforms.uGiro, { value: -1.15, duration: b(5.4), ease: 'none' }, 0)
  tl.to(gTicks.rotation, { z: 0.16, duration: b(5.4), ease: 'none' }, 0)

  // brackets: llegan pasándose, escalonados
  tl.to(brackets.map(o => o.scale), { x: 1, y: 1, z: 1, duration: b(0.55), ease: E.llega(2.6), stagger: 0.055 }, b(0.04))
  // polvo
  tl.to(polvo.map(o => o.scale), { x: 1, y: 1, z: 1, duration: b(0.7), ease: E.llega(1.8), stagger: 0.012 }, b(0.06))
  tl.fromTo(gPolvo.position, { y: -0.40 }, { y: 0.48, duration: b(5.6), ease: 'none' }, 0)

  // ticks sincronizados con el borde del trazo
  ticks.forEach((t, i) => {
    tl.to(t.scale, { x: 1, y: 1, z: 1, duration: b(0.32), ease: E.llega(3.0) },
      Math.max(0, b(1) * inv(i / NT) - 0.03))
  })

  // el cierre del anillo golpea: pop de escala, pulso de fondo, y se apaga la cabeza del trazo
  tl.fromTo(gAnillo.scale, { x: 1, y: 1, z: 1 }, { x: 1.055, y: 1.055, z: 1.055, duration: b(0.18), ease: E.frena(3) }, b(1))
  tl.to(gAnillo.scale, { x: 1, y: 1, z: 1, duration: b(0.7), ease: 'elastic.out(1, 0.45)' }, b(1.18))
  tl.to(aro.material.uniforms.uCabeza, { value: 0, duration: b(0.3), ease: E.frena(2) }, b(1))
  tl.to(bloom, { strength: 0.40, duration: b(0.12), ease: E.frena(2) }, b(1))
  tl.to(bloom, { strength: 0.22, duration: b(0.55), ease: E.vaiven(2) }, b(1.12))
  tl.set(fondo.uPulso, { value: 0.34 }, b(1))
  tl.to(fondo.uPulso, { value: 0, duration: b(0.85), ease: E.frena(2) }, b(1))

  // --- BEAT 0.5 → 2 · la marca llega adentro del anillo
  tl.fromTo(gMarca.scale, { x: 0.70, y: 0.70, z: 0.70 },
    { x: 1, y: 1, z: 1, duration: b(1.2), ease: E.llega(2.0) }, b(0.5))
  tl.fromTo(gMarca.rotation, { y: 0.62 }, { y: 0, duration: b(1.25), ease: E.frena(3) }, b(0.5))
  tl.fromTo(marca.material.uniforms.uProg, { value: 0.15 },
    { value: 1.05, duration: b(1.0), ease: E.vaiven(2) }, b(0.55))
  // asienta respirando: llegar y quedarse quieto mata la pieza
  tl.to(gMarca.scale, { x: 1.012, y: 1.012, z: 1.012, duration: b(1.4), ease: E.vaiven() }, b(1.75))
  tl.to(gMarca.scale, { x: 1, y: 1, z: 1, duration: b(1.3), ease: E.vaiven() }, b(3.15))

  // --- BEAT 1.5 → 3 · la píldora entra desde abajo y rebota
  tl.fromTo(gPill.position, { y: -5.7 }, { y: -2.15, duration: b(0.9), ease: E.llega(2.4) }, b(1.5))
  tl.to(gPill.scale, { y: 0.84, x: 1.05, duration: b(0.14), ease: E.frena(2) }, b(2.4))
  tl.to(gPill.scale, { y: 1, x: 1, duration: b(0.6), ease: 'elastic.out(1, 0.42)' }, b(2.54))
  tl.set(fondo.uPulso, { value: 0.22 }, b(2.4))
  tl.to(fondo.uPulso, { value: 0, duration: b(0.55), ease: E.frena(2) }, b(2.4))
  tl.fromTo(cta.material.uniforms.uProg, { value: 0 },
    { value: 1.04, duration: b(0.55), ease: E.frena(2) }, b(2.5))
  // el chevron empuja: la píldora sigue viva después de aterrizar
  tl.fromTo(gChev.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: b(0.4), ease: E.llega(3.0) }, b(2.7))
  tl.to(gChev.position, { x: pillW / 2 - 0.22, duration: b(0.3), ease: E.vaiven(2) }, b(3.5))
  tl.to(gChev.position, { x: pillW / 2 - 0.31, duration: b(0.4), ease: E.vaiven(2) }, b(3.8))
  tl.to(gChev.position, { x: pillW / 2 - 0.24, duration: b(0.3), ease: E.vaiven(2) }, b(4.2))

  // --- BEAT 3 → 4.5 · el filete cruza y frena, y caen las tres marcas
  tl.fromTo(gFilete.scale, { x: 0.0001 }, { x: 1, duration: b(0.42), ease: E.frena(4) }, b(3))
  tl.fromTo(cabeza.position, { x: -LF / 2 }, { x: LF / 2, duration: b(0.42), ease: E.frena(4) }, b(3))
  tl.fromTo(cabeza.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: b(0.1), ease: E.llega(3) }, b(3))
  tl.to(cabeza.scale, { x: 0, y: 0, z: 0, duration: b(0.22), ease: E.acelera(2) }, b(3.36))
  tl.to(gFilete.scale, { x: 1.02, duration: b(0.1), ease: E.frena(2) }, b(3.42))
  tl.to(gFilete.scale, { x: 1, duration: b(0.35), ease: 'elastic.out(1, 0.5)' }, b(3.52))
  tl.set(fondo.uPulso, { value: 0.18 }, b(3.42))
  tl.to(fondo.uPulso, { value: 0, duration: b(0.5), ease: E.frena(2) }, b(3.42))

  marcasM.forEach((m, i) => {
    const t0 = b(3.2 + i * 0.24)
    tl.fromTo(m.position, { y: -0.20 }, { y: 0, duration: b(0.5), ease: E.llega(2.4) }, t0)
    tl.fromTo(m.material.uniforms.uProg, { value: 0 }, { value: 1.04, duration: b(0.5), ease: E.frena(2) }, t0)
  })
  tl.to(puntos.map(p => p.scale), { x: 1, y: 1, z: 1, duration: b(0.34), ease: E.llega(3.2), stagger: 0.07 }, b(3.55))

  // --- BEAT 4.5 → 6 · CIERRE. Todo se comprime, el bloom baja, queda el anillo.
  tl.set(fondo.uPulso, { value: 0.30 }, b(4.5))
  tl.to(fondo.uPulso, { value: 0, duration: b(0.8), ease: E.frena(2) }, b(4.5))
  tl.to(gComp.scale, { x: 0.90, y: 0.90, z: 0.90, duration: b(0.9), ease: E.vaiven(2) }, b(4.5))
  tl.to(gAnillo.scale, { x: 0.965, y: 0.965, z: 0.965, duration: b(0.9), ease: E.vaiven(2) }, b(4.5))
  tl.to(bloom, { strength: 0.44, duration: b(0.28), ease: E.frena(2) }, b(4.5))
  tl.to(bloom, { strength: 0.17, duration: b(0.80), ease: E.vaiven(2) }, b(4.78))
  tl.to(fondo.uGrilla, { value: 0.015, duration: b(0.95), ease: E.acelera(2) }, b(4.5))

  // salidas: por MÁSCARA y escalonadas, en orden inverso al de entrada
  tl.to(polvo.map(o => o.scale), { x: 0, y: 0, z: 0, duration: b(0.4), ease: E.acelera(2), stagger: 0.008 }, b(4.55))
  tl.to(brackets.map(o => o.scale), { x: 0, y: 0, z: 0, duration: b(0.38), ease: 'back.in(2.2)', stagger: 0.04 }, b(4.6))
  marcasM.forEach((m, i) => {
    tl.set(m.material.uniforms.uDir, { value: 1 }, b(4.6))
    tl.to(m.material.uniforms.uProg, { value: 0, duration: b(0.4), ease: E.acelera(2) }, b(4.6 + i * 0.09))
  })
  tl.to(puntos.map(p => p.scale), { x: 0, y: 0, z: 0, duration: b(0.3), ease: 'back.in(2)', stagger: 0.04 }, b(4.6))
  tl.to(gFilete.scale, { x: 0.0001, duration: b(0.45), ease: E.acelera(3) }, b(4.75))
  tl.set(cta.material.uniforms.uDir, { value: 1 }, b(4.8))
  tl.to(cta.material.uniforms.uProg, { value: 0, duration: b(0.3), ease: E.acelera(2) }, b(4.8))
  tl.to(gChev.scale, { x: 0, y: 0, z: 0, duration: b(0.2), ease: 'back.in(2.4)' }, b(4.8))
  tl.to(gPill.scale, { x: 0.72, y: 0.0001, duration: b(0.42), ease: E.acelera(3) }, b(4.9))
  tl.to(pill.material.uniforms.uAlfa, { value: 0, duration: b(0.42), ease: E.acelera(2) }, b(4.9))
  tl.set(marca.material.uniforms.uDir, { value: 3 }, b(4.9))
  tl.to(marca.material.uniforms.uProg, { value: -0.08, duration: b(0.40), ease: E.acelera(2) }, b(4.9))
  tl.to(gMarca.scale, { x: 0.86, y: 0.86, z: 0.86, duration: b(0.45), ease: E.acelera(2) }, b(4.9))
  tl.to(gMarca.rotation, { y: -0.34, duration: b(0.45), ease: E.acelera(2) }, b(4.9))
  tl.to(ticks.map(t => t.scale), { x: 0, y: 0, z: 0, duration: b(0.30), ease: 'back.in(2.4)', stagger: 0.006 }, b(4.6))
  tl.to(aroDeco.material.uniforms.uAlfa, { value: 0, duration: b(0.45), ease: E.acelera(2) }, b(4.95))

  // El anillo solo, respirando: ni el último medio beat descansa. La respiración tiene que CERRAR
  // antes del apagón — un tween que se solapa y termina después le vuelve a subir el alfa y el
  // anillo queda encendido en el último frame. Por eso los tiempos van en segundos y no en beats:
  // el apagón se mide en frames, no en música.
  const t0Apagon = FIN - 3 * FRAME - 0.004
  const tRespira = b(5.4)
  const dRespira = (t0Apagon - tRespira - 0.002) / 2
  tl.to(gAnillo.scale, { x: 0.995, y: 0.995, z: 0.995, duration: dRespira * 2, ease: E.vaiven() }, tRespira)
  tl.to(aro.material.uniforms.uAlfa, { value: 0.80, duration: dRespira, ease: E.vaiven() }, tRespira)
  tl.to(aro.material.uniforms.uAlfa, { value: 1, duration: dRespira, ease: E.vaiven() }, tRespira + dRespira)

  // --- cámara: empuje mínimo, retroceso al cerrar, y vuelve EXACTO a (0,0,distBase)
  tl.to(camera.position, { z: distBase - 0.35, duration: b(4.5), ease: E.vaiven() }, 0)
  tl.to(camera.rotation, { z: 0.010, duration: b(2.4), ease: E.vaiven() }, 0)
  tl.to(camera.rotation, { z: 0, duration: b(2.1), ease: E.vaiven() }, b(2.4))
  tl.to(camera.position, { z: distBase + 0.72, duration: b(0.85), ease: E.vaiven(2) }, b(4.5))
  tl.to(camera.position, { z: distBase, duration: b(0.55), ease: E.frena(2) }, b(5.35))
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, b(5.94))
  tl.set(camera.rotation, { x: 0, y: 0, z: 0 }, b(5.94))

  // --- y el anillo se apaga en los últimos 3 frames
  tl.to(gAnillo.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 3 * FRAME, ease: E.frena(2) }, t0Apagon)
  tl.to(aro.material.uniforms.uAlfa, { value: 0, duration: 3 * FRAME, ease: E.acelera(2) }, t0Apagon)

  // La timeline se ARMA en pausa (así ningún tween corre mientras se la construye) pero se devuelve
  // corriendo. Un hijo pausado tiene timeScale 0 y el padre lo SALTEA al renderizar: colgado de la
  // maestra de main.js se quedaba clavado en su frame 0 — el grupo entero existía, con sus 78 draw
  // calls, y no se veía nada. El reloj lo sigue poniendo el driver: la maestra está en pausa y
  // avanza sólo con tl.time(), así que esto no introduce ningún reloj propio.
  tl.paused(false)

  return { g, tl }
}
