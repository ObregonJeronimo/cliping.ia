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
//
// QUE RESPIRE NO ALCANZA — y eso costó una medición para verse. De b1.5 a b4.5 esta escena no tenía
// un solo cambio DURO: todo lo que pasaba en tres beats era deriva lenta, y una placa que deriva se
// lee como una placa. Por eso abajo hay un bloque entero de METRÓNOMO que mete un golpe cada medio
// beat. No cambia la composición: el anillo cierra una sola vez, la marca sigue clavada adentro y el
// CTA sigue siendo lo único que pide algo. Lo que cambia es que ninguno de los tres espera al final.

import { E, LOOK, b, planoTexto, materialMascara, filete, hex, nivel } from '../kit.js'
// El COPY sale de los DATOS. Lo que queda escrito aca es CHROME de la pieza (rotulos de
// capitulo, indicadores tecnicos): eso es direccion de arte y no cambia con el contenido.
// Lo que la marca DICE — su nombre, sus cifras, su claim, su CTA — sale de los datos o NO SALE.
import { D, sello } from '../datos.js'

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
  //
  // EL BARRIDO DE BRILLO VA ACÁ ADENTRO, no como un plano encima. Una barra blanca cruzando por
  // delante habría que recortarla a la forma de la píldora, y recortar un SDF con otro plano es
  // exactamente el trabajo que el SDF ya está haciendo: `uBrillo` es la posición de la banda en el
  // mismo espacio en el que se calcula la máscara, así que sale clipeada gratis y con las esquinas
  // redondeadas correctas. Arranca fuera de rango (-99) para que no haya destello en el frame cero.
  function pildora(w, h, color) {
    const pad = 0.08
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uW: { value: w }, uH: { value: h }, uR: { value: h * 0.5 }, uPad: { value: pad },
        uCol: { value: hex(color).multiplyScalar(1.02) }, uAlfa: { value: 1 },
        uBrillo: { value: -99 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform float uW,uH,uR,uPad,uAlfa,uBrillo; uniform vec3 uCol; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * vec2(uW + uPad, uH + uPad);
          vec2 q = abs(p) - (vec2(uW, uH) * 0.5 - uR);
          float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uR;
          float m = smoothstep(0.010, -0.010, d);
          // degradé interno: la píldora deja de ser una mancha plana de color
          vec3 c = uCol * (0.82 + 0.40 * smoothstep(0.0, 1.0, vUv.y));
          // banda INCLINADA: vertical se lee como un error de render, inclinada se lee como reflejo
          float bri = smoothstep(0.19, 0.0, abs(p.x - uBrillo + p.y * 0.62));
          // EL BARRIDO SUMA SOBRE LO QUE FALTA PARA BLANCO, no blanco a secas. Sumando blanco puro por
          // 0.72, el canal azul del acento por defecto llegaba a 1.96 medido: con toneMapped en false no
          // rueda, RECORTA, y como el umbral del bloom esta en 0.62 la banda salia como una barra
          // blanca reventada. Es el mismo defecto que este archivo documenta arriba sobre las
          // intensidades, cometido desde el otro lado. Contra el hueco que queda hasta 1.0 el brillo
          // no puede pasarse por definicion: el pico del cuadro sigue siendo el que ya tenia la
          // pildora sola, y un acento clarito (un amarillo) deja de irse a blanco lavado.
          c += (vec3(1.0) - min(c, vec3(1.0))) * bri * 0.85;
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
    // La dirección RADIAL de cada tick, guardada al construirlo. Los golpes del metrónomo empujan los
    // ticks fuertes hacia afuera, y sin esto habría que recalcular el ángulo dentro de la timeline —
    // que es donde el azar y la trigonometría repetida se convierten en bugs de determinismo.
    t.userData.dx = Math.sin(a); t.userData.dy = Math.cos(a)
    t.userData.bx = t.position.x; t.userData.by = t.position.y
    t.userData.fuerte = fuerte
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
    // Los golpes del metrónomo re-asientan las esquinas, y para eso hace falta saber hacia dónde es
    // "afuera". Va por POSICIÓN y no por escala a propósito: la escala de los brackets ya está
    // ocupada de punta a punta por la entrada y la salida, y dos tweens sobre la misma propiedad se
    // pisan sin avisar.
    par.userData.sx = sx; par.userData.sy = sy
    par.userData.bx = bx; par.userData.by = by
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
  const MY = CY - 0.24                            // su Y de reposo: los golpes la sacuden y vuelven acá
  gMarca.position.set(0, MY, 0.05)
  // NO en LOOK.tinta. Es el nombre de la marca a tamano 1 —la tipografia mas grande de la pieza— y la
  // tinta de un mundo oscuro tiene luminancia ~0.9 contra un umbral de bloom de 0.62: florece entera y
  // sale como un ladrillo blanco sin contraformas. Visto en un render en vivo de tailwindcss.com. Es
  // el mismo defecto que ya habia aparecido en la rafaga; ver el presupuesto de luz en toro.js.
  const marca = textoMascara(D.marca, 1, nivel(0.78), { fuente: 'Anton', tracking: 0.01 })
  marca.material.uniforms.uDir.value = 2          // se descubre de abajo hacia arriba
  marca.material.uniforms.uSuave.value = 0.10
  marca.scale.setScalar(4.34 / ancho(marca))      // 77% del ancho del cuadro
  marca.renderOrder = 6
  gMarca.add(marca)
  gComp.add(gMarca)

  // ---- píldora de CTA
  // SIN CTA NO HAY BOTON. Con D.cta en null esto dibujaba `textoMascara('')` —una textura vacia— y
  // despues una pildora de `ancho(cta) + 1.15`, o sea un boton REDONDO Y VACIO con su chevron, en el
  // ultimo cuadro de la pieza. Un boton sin nada escrito es peor que no tener boton: promete una
  // accion y no dice cual. Y pasa seguido: paginas cuyo CTA es una imagen, o que lo tienen fuera del
  // area capturada, dan cta null y componian igual el boton.
  //
  // Es la misma regla de siempre, aplicada donde faltaba: un slot vacio se compone SIN el, no con un
  // recuadro de su tamano.
  const hayCta = !!(D.cta && String(D.cta).trim())
  const gPill = new THREE.Group()
  gPill.position.set(0, -5.7, 0.12)
  // El texto va del color del FONDO, no de un negro fijo: sobre la pildora de acento, en un mundo
  // claro tiene que ser claro y en uno oscuro, oscuro. '#050810' acertaba solo en el mundo oscuro.
  const cta = textoMascara((D.cta || ''), 0.26, LOOK.bg, { fuente: 'DMSans', tracking: 0.075 })
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
  if (hayCta) gComp.add(gPill)

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
  // El pie sale de D.pie, que trae el dominio real de la pagina y el formato del archivo. Estaba
  // escrito a mano y el tercero decia 'SIN IA GENERATIVA': una afirmacion sobre COMO SE HIZO EL VIDEO,
  // firmada como si fuera de la marca, en la pieza de un cliente que nunca dijo eso.
  const datos = sello.lista().slice(0, 3).map((t, i) => [t, i === 2 ? LOOK.acento2 : LOOK.tinta])
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
  if (hayCta) tl.fromTo(gPill.position, { y: -5.7 }, { y: -2.15, duration: b(0.9), ease: E.llega(2.4) }, b(1.5))
  if (hayCta) tl.to(gPill.scale, { y: 0.84, x: 1.05, duration: b(0.14), ease: E.frena(2) }, b(2.4))
  if (hayCta) tl.to(gPill.scale, { y: 1, x: 1, duration: b(0.6), ease: 'elastic.out(1, 0.42)' }, b(2.54))
  tl.set(fondo.uPulso, { value: 0.22 }, b(2.4))
  tl.to(fondo.uPulso, { value: 0, duration: b(0.55), ease: E.frena(2) }, b(2.4))
  if (hayCta) tl.fromTo(cta.material.uniforms.uProg, { value: 0 },
    { value: 1.04, duration: b(0.55), ease: E.frena(2) }, b(2.5))
  // el chevron empuja: la píldora sigue viva después de aterrizar
  if (hayCta) tl.fromTo(gChev.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: b(0.4), ease: E.llega(3.0) }, b(2.7))
  if (hayCta) tl.to(gChev.position, { x: pillW / 2 - 0.22, duration: b(0.3), ease: E.vaiven(2) }, b(3.5))
  if (hayCta) tl.to(gChev.position, { x: pillW / 2 - 0.31, duration: b(0.4), ease: E.vaiven(2) }, b(3.8))
  if (hayCta) tl.to(gChev.position, { x: pillW / 2 - 0.24, duration: b(0.3), ease: E.vaiven(2) }, b(4.2))

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
  // Con una sola marca no hay separadores, y `tl.to([], ...)` no falla: avisa por consola y sigue. Un
  // aviso que nadie lee es peor que un error — se guarda para que la escena se componga con lo que hay.
  if (puntos.length) tl.to(puntos.map(p => p.scale), { x: 1, y: 1, z: 1, duration: b(0.34), ease: E.llega(3.2), stagger: 0.07 }, b(3.55))

  // ==================================================================== EL METRÓNOMO · b1.5 → b4
  // POR QUÉ EXISTE ESTE BLOQUE, con el número al lado.
  // Medido frame a frame sobre esta misma escena: entre b1.6 y b5.1 —tres beats y medio, más de la
  // mitad del cierre— no pasaba NADA duro. El anillo cerraba, la marca llegaba, la píldora aterrizaba,
  // y de ahí al apagón todo era deriva lenta. El verificador daba verde porque nada se quedaba quieto
  // del todo, y ese es justo su punto ciego: mide REPOSO, no RITMO. Una placa que respira no está
  // quieta y aun así se lee como una placa.
  //
  // La corrección no es acelerar lo que ya hay ni cambiar la composición: es que el cierre TENGA
  // PULSO. Cada medio beat cae un golpe. Y cada golpe es un ACORDE —los ticks del anillo revientan
  // siempre, y encima entra un protagonista distinto cada vez— porque seis golpes idénticos se leen
  // como un loop roto, no como un ritmo.
  //
  // Lo que NO se toca: el anillo principal se dibuja y cierra UNA sola vez (ese golpe es el eje de la
  // escena y repetirlo lo gastaría), la marca sigue clavada en el centro y el CTA sigue siendo lo
  // único que le pide algo al que mira.
  // --- los TICKS son el metrónomo, y ésta es su grilla: los demás elementos entran sobre algunas de
  // estas casillas, no sobre todas. En cada golpe revienta un tercio de los ticks, y el tercio ROTA
  // con el número de golpe: así el patrón viaja alrededor del anillo en vez de parpadear siempre igual.
  const GOLPES = [1.5, 2, 2.5, 3, 3.5, 4]
  GOLPES.forEach((bt, k) => {
    ticks.forEach((t, i) => {
      if ((i + k) % 3 !== 0) return
      tl.to(t.scale, { y: 2.7, duration: b(0.06), ease: E.frena(3) }, b(bt))
      tl.to(t.scale, { y: 1, duration: b(0.22), ease: E.acelera(2) }, b(bt + 0.06))
      // los cuatro ticks FUERTES además salen disparados hacia afuera: "reventar" tiene dirección, y
      // un tick que sólo se estira hacia los dos lados se lee como que respira, no como que golpea
      if (!t.userData.fuerte) return
      tl.to(t.position, { x: t.userData.bx + t.userData.dx * 0.17, y: t.userData.by + t.userData.dy * 0.17, duration: b(0.07), ease: E.frena(3) }, b(bt))
      tl.to(t.position, { x: t.userData.bx, y: t.userData.by, duration: b(0.30), ease: 'elastic.out(1, 0.5)' }, b(bt + 0.07))
    })
  })

  // --- el punteado exterior hace RADAR: se apaga de golpe y se vuelve a dibujar dando la vuelta.
  // Es el único anillo que puede permitírselo — está declarado arriba como el elemento inquieto de la
  // escena, así que barrerlo dos veces no contradice nada. Velocidad constante a propósito: con una
  // curva de frenado deja de leerse como barrido y pasa a leerse como un fundido circular.
  for (const bt of [2, 3.5]) {
    tl.set(aroDeco.material.uniforms.uProg, { value: 0.02 }, b(bt))
    tl.to(aroDeco.material.uniforms.uProg, { value: 1, duration: b(0.62), ease: 'none' }, b(bt))
  }

  // --- las esquinas se re-asientan: salen y vuelven con overshoot, escalonadas.
  brackets.forEach((par, i) => {
    for (const bt of [1.5, 3]) {
      const t0 = b(bt) + i * 0.022
      tl.to(par.position, { x: (2.52 + 0.26) * par.userData.sx, y: (4.52 + 0.20) * par.userData.sy, duration: b(0.10), ease: E.frena(3) }, t0)
      tl.to(par.position, { x: par.userData.bx, y: par.userData.by, duration: b(0.46), ease: 'elastic.out(1, 0.5)' }, t0 + b(0.10))
    }
  })

  // --- el anillo entero acusa el golpe en los acentos (b2.5 y b3.5). Sólo pop de escala: el trazo no
  // se vuelve a dibujar nunca.
  for (const [bt, esc] of [[2.5, 1.028], [3.5, 1.022]]) {
    tl.to(gAnillo.scale, { x: esc, y: esc, z: esc, duration: b(0.10), ease: E.frena(3) }, b(bt))
    tl.to(gAnillo.scale, { x: 1, y: 1, z: 1, duration: b(0.42), ease: 'elastic.out(1, 0.45)' }, b(bt + 0.10))
  }

  // --- LA MARCA SE VUELVE A ESCRIBIR. Este es el evento grande del bloque, y hay una medición atrás:
  // contando cuánta pantalla cambia por frame, en esta escena sólo DOS piezas tienen superficie —la
  // marca (7% del cuadro) y la píldora (4%)—. Todo lo demás (ticks, brackets, polvo, puntos) suma
  // menos del 1% junto: el ojo lo registra como textura, pero no mueve la densidad de corte ni un
  // punto. Los golpes que no tocan la marca o la píldora no son golpes, son adorno.
  //
  // Por eso la marca se RE-ESCRIBE dos veces: la máscara la borra y la vuelve a dibujar en cinco
  // frames. Es el mismo revelado por máscara con el que entra —no es un recurso nuevo— usado como
  // acento en vez de sólo en la entrada y la salida.
  //
  // Barre y vuelve POR EL MISMO LADO, y nunca baja de 0.16. Probé el cruce elegante —borrar hacia la
  // izquierda y volver desde la derecha invirtiendo uDir— y se ve mal: al invertir la dirección con
  // uProg bajo, el pedazo visible SALTA de un borde al otro y la palabra parpadea partida. Volviendo
  // por donde se fue se lee como que se re-escribe, que es lo que se busca.
  tl.set(marca.material.uniforms.uDir, { value: 0 }, b(2.5))
  for (const bt of [2.5, 4]) {
    tl.to(marca.material.uniforms.uProg, { value: 0.16, duration: b(0.08), ease: E.acelera(2) }, b(bt))
    tl.to(marca.material.uniforms.uProg, { value: 1.05, duration: b(0.15), ease: E.frena(2) }, b(bt + 0.08))
    // y encima el sacudón: un tirón hacia abajo y una guiñada que se resuelven solos. La escala está
    // ocupada por la respiración de b1.75 a b4.45, así que el impacto va por posición y rotación —
    // que además se lee como golpe y no como zoom.
    tl.to(gMarca.position, { y: MY - 0.075, duration: b(0.08), ease: E.frena(3) }, b(bt))
    tl.to(gMarca.position, { y: MY, duration: b(0.42), ease: 'elastic.out(1, 0.5)' }, b(bt + 0.08))
    tl.to(gMarca.rotation, { y: -0.055, duration: b(0.09), ease: E.frena(3) }, b(bt))
    tl.to(gMarca.rotation, { y: 0, duration: b(0.40), ease: E.vaiven(2) }, b(bt + 0.09))
  }

  // --- LA PÍLDORA GOLPEA TRES VECES antes del cierre, en b3, b3.5 y b4. Es la otra pieza con
  // superficie, y un CTA que aterriza y se queda quieto era justo lo que esta escena hacía mal.
  // Tres saltos en la grilla de medio beat se leen como una llamada; uno solo se leería como que algo
  // lo empujó sin querer. Van creciendo —0.34, 0.40, 0.46— para que el último quede como el pedido
  // final antes del apagón.
  // Va por POSICIÓN: la escala de gPill está tomada por el aterrizaje (b2.4–b3.14) y por la salida.
  for (const [bt, alto, vuelta] of [[3, 0.34, 0.30], [3.5, 0.40, 0.32], [4, 0.46, 0.40]]) {
    if (hayCta) tl.to(gPill.position, { y: -2.15 + alto, duration: b(0.10), ease: E.frena(3) }, b(bt))
    if (hayCta) tl.to(gPill.position, { y: -2.15, duration: b(vuelta), ease: 'elastic.out(1, 0.5)' }, b(bt + 0.10))
  }

  // --- BARRIDO DE BRILLO sobre el CTA, dos pasadas. La primera cuando el texto ya terminó de
  // revelarse (antes barrería una píldora medio vacía), la segunda un beat más tarde para que el
  // último elemento vivo antes del apagón sea justamente el que pide la acción.
  // `immediateRender: false` no es decorativo: con el fromTo por defecto, GSAP escribe el valor
  // inicial AL CONSTRUIR la timeline, y las dos pasadas se pisarían la una a la otra antes de correr.
  // LA SEGUNDA PASADA ESTABA EN b(4.05) y eso no era "un beat más tarde", eran 0.8: caía 24 ms
  // después de b4 —menos de un frame a 30— o sea ni en el golpe ni a contratiempo, que es como se
  // lee un error de sincro. En b(4.25) es un beat exacto después de la primera, cae en la misma
  // subdivisión de cuarto que ella, y no se amontona con las seis cosas que ya pasan en b4.
  const BR = pillW * 0.78
  for (const bt of [3.25, 4.25]) {
    if (hayCta) tl.fromTo(pill.material.uniforms.uBrillo, { value: -BR },
      { value: BR, duration: b(0.34), ease: 'none', immediateRender: false }, b(bt))
  }

  // --- chispas en el polvo: dos ráfagas, un quinto de las partículas cada una.
  ;[2.5, 3.75].forEach((bt, k) => {
    polvo.forEach((p, i) => {
      if ((i + k * 2) % 5 !== 0) return
      tl.to(p.scale, { x: 2.4, y: 2.4, z: 2.4, duration: b(0.08), ease: E.frena(3) }, b(bt))
      tl.to(p.scale, { x: 1, y: 1, z: 1, duration: b(0.30), ease: E.acelera(2) }, b(bt + 0.08))
    })
  })

  // --- el filete tampoco se queda: da un tic (se retrae y vuelve) y su cabeza reaparece un frame en
  // la punta, como si el trazo se rearmara. Va en b4, la última casilla libre antes de la salida.
  tl.to(gFilete.scale, { x: 0.955, duration: b(0.08), ease: E.acelera(2) }, b(4))
  tl.to(gFilete.scale, { x: 1, duration: b(0.34), ease: 'elastic.out(1, 0.5)' }, b(4.08))
  tl.to(cabeza.scale, { x: 1, y: 1, z: 1, duration: b(0.07), ease: E.llega(3) }, b(4))
  tl.to(cabeza.scale, { x: 0, y: 0, z: 0, duration: b(0.20), ease: E.acelera(2) }, b(4.12))

  // --- las marcas del pie se mueven DESPUÉS de entrar: una ola que las levanta en orden y una deriva
  // lenta de toda la fila. Entrar escalonadas y después congelarse era la mitad del problema medido.
  // Todo por forEach y no por array: con `D.pie` vacío no hay marcas, `marcasM.map(...)` daría un
  // array vacío y GSAP avisaría por consola sin fallar — el aviso que el verificador convierte en FAIL.
  // El ancla estaba en b(4.15): no es beat, ni medio, ni cuarto. Nadie la sincroniza con nada y cae a
  // 24 ms de b4, o sea que el ojo la agrupa con el golpe de b4 igual pero desalineada — el defecto de
  // sincro sin el beneficio del contratiempo. b(4.25) es la primera casilla de la grilla que queda
  // libre después de que termina de entrar la última marca (b4.18).
  marcasM.forEach((m, i) => {
    const t1 = b(4.25 + i * 0.10)
    tl.to(m.position, { y: 0.13, duration: b(0.12), ease: E.frena(3) }, t1)
    tl.to(m.position, { y: 0, duration: b(0.34), ease: 'elastic.out(1, 0.5)' }, t1 + b(0.12))
  })
  tl.to(gMarcas.position, { x: 0.09, duration: b(1.4), ease: E.vaiven() }, b(3.3))
  tl.to(gMarcas.position, { x: 0, duration: b(0.9), ease: E.vaiven() }, b(4.7))
  // los separadores laten con el metrónomo, y sólo si la página dio material para que existan
  if (puntos.length) {
    tl.to(puntos.map(p => p.scale), { x: 1.9, y: 1.9, z: 1.9, duration: b(0.08), ease: E.frena(3), stagger: 0.04 }, b(4))
    tl.to(puntos.map(p => p.scale), { x: 1, y: 1, z: 1, duration: b(0.30), ease: E.acelera(2), stagger: 0.04 }, b(4.08))
  }

  // --- y el cuadro entero acusa cada acento. Los huecos NO son arbitrarios: uPulso y bloom ya tienen
  // tweens corriendo en b1–b1.85, b2.4–b2.95, b3.42–b3.92 y b4.5–b5.3, y un `set` en medio de un tween
  // en curso lo pisa el tween en el frame siguiente — no falla, simplemente no se ve. Estos tres caen
  // en las ventanas libres.
  for (const [bt, v, d] of [[2, 0.14, 0.38], [3, 0.16, 0.40], [4, 0.15, 0.45]]) {
    tl.set(fondo.uPulso, { value: v }, b(bt))
    tl.to(fondo.uPulso, { value: 0, duration: b(d), ease: E.frena(2) }, b(bt))
  }
  for (const bt of [2.5, 3.5]) {
    tl.to(bloom, { strength: 0.34, duration: b(0.10), ease: E.frena(2) }, b(bt))
    tl.to(bloom, { strength: 0.22, duration: b(0.40), ease: E.vaiven(2) }, b(bt + 0.10))
  }

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
  if (puntos.length) tl.to(puntos.map(p => p.scale), { x: 0, y: 0, z: 0, duration: b(0.3), ease: 'back.in(2)', stagger: 0.04 }, b(4.6))
  tl.to(gFilete.scale, { x: 0.0001, duration: b(0.45), ease: E.acelera(3) }, b(4.75))
  if (hayCta) tl.set(cta.material.uniforms.uDir, { value: 1 }, b(4.8))
  if (hayCta) tl.to(cta.material.uniforms.uProg, { value: 0, duration: b(0.3), ease: E.acelera(2) }, b(4.8))
  if (hayCta) tl.to(gChev.scale, { x: 0, y: 0, z: 0, duration: b(0.2), ease: 'back.in(2.4)' }, b(4.8))
  if (hayCta) tl.to(gPill.scale, { x: 0.72, y: 0.0001, duration: b(0.42), ease: E.acelera(3) }, b(4.9))
  if (hayCta) tl.to(pill.material.uniforms.uAlfa, { value: 0, duration: b(0.42), ease: E.acelera(2) }, b(4.9))
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
