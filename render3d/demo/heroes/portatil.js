// HERO "portatil" — una notebook que se ABRE y muestra la página.
//
// POR QUÉ EXISTE SI YA HAY UN TELÉFONO
// Porque no dicen lo mismo. El teléfono dice consumo, scroll, inmediatez: es el gesto de una marca que
// se descubre en el colectivo. La notebook dice trabajo, herramienta, sesión larga — que es exactamente
// el registro de un SaaS, un panel, un editor. Elegir mal el dispositivo contradice al producto aunque
// la animación sea impecable, y por eso el hero es una decisión de guion y no un adorno.
//
// EL GESTO ES LA APERTURA, y no está de decoración: es la única forma que tiene una pieza de 3D de
// mostrar una pantalla SIN que la pantalla aparezca de la nada. La tapa sube, la página se revela con
// ella, y para cuando termina de abrir el espectador ya entendió qué es lo que está mirando.
//
// LA BISAGRA ES EL DETALLE QUE DELATA. Rotar la tapa alrededor de su centro la hunde dentro de la base;
// tiene que girar alrededor de su BORDE INFERIOR. Se resuelve con un grupo pivote en el borde y la tapa
// desplazada media altura hacia arriba dentro de él, que es como funciona la bisagra de verdad.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, dolly } from '../kit.js'

export const meta = {
  id: 'portatil',
  nombre: 'Notebook que se abre',
  necesita: ['tira'],
  beats: 8,
}

const AR_PANTALLA = 16 / 10        // proporción de pantalla de notebook, no de monitor

function formaRedonda(THREE, w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, spec } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  const tira = texturas && texturas.get('tira')
  const altoVP = (spec && spec.tiraViewport) || 1560
  const altoTira = tira && tira.image ? tira.image.height : altoVP

  const ANCHO = mundoW * 0.92
  const ALTO_P = ANCHO / AR_PANTALLA
  const GRUESO = ANCHO * 0.016
  const R = ANCHO * 0.012

  // `gEq` hace la LLEGADA y la SALIDA; `gFlota`, hijo suyo, el vaivén continuo. Dos grupos para que
  // dos tweens no escriban la misma propiedad. Ver el comentario largo en heroes/telefono.js: el
  // primer intento resolvía el vaivén con `modifiers` de GSAP y nunca corrió, porque `modifiers` sólo
  // se aplica a propiedades declaradas en `vars`.
  const gEq = new THREE.Group()
  gEq.position.y = -mundoH * 0.06
  g.add(gEq)
  const gFlota = new THREE.Group()
  gEq.add(gFlota)

  const matAlu = new THREE.MeshPhysicalMaterial({
    // Aluminio anodizado: metálico pero no espejo. Con roughness bajo se convierte en un espejo que
    // refleja una escena vacía y sale negro; con roughness alto es plástico.
    color: hex('#8b919c'), roughness: 0.38, metalness: 1.0, clearcoat: 0.4, clearcoatRoughness: 0.3,
  })

  // ---------------------------------------------------------------- base
  const PROF = ALTO_P * 0.92
  const base = new THREE.Mesh(
    new THREE.ExtrudeGeometry(formaRedonda(THREE, ANCHO, PROF, R * 2), {
      depth: GRUESO * 1.5, bevelEnabled: true, bevelThickness: GRUESO * 0.4,
      bevelSize: ANCHO * 0.004, bevelSegments: 2, curveSegments: 12,
    }), matAlu)
  base.geometry.center()
  base.rotation.x = -Math.PI / 2                      // acostada
  gFlota.add(base)

  // Teclado y trackpad: dos rectángulos oscuros. No se leen como teclas a esta distancia y no importa
  // — lo que hace falta es que la base no sea una plancha lisa, que es lo que grita "render".
  const oscuro = new THREE.MeshPhysicalMaterial({ color: hex('#15171c'), roughness: 0.62, metalness: 0.3 })
  const teclado = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 0.80, PROF * 0.46), oscuro)
  teclado.rotation.x = -Math.PI / 2
  teclado.position.set(0, GRUESO * 0.78, -PROF * 0.14)
  gFlota.add(teclado)
  const trackpad = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 0.26, PROF * 0.24), oscuro)
  trackpad.rotation.x = -Math.PI / 2
  trackpad.position.set(0, GRUESO * 0.79, PROF * 0.26)
  gFlota.add(trackpad)

  // ---------------------------------------------------------------- tapa
  // EL PIVOTE VA EN LA BISAGRA. La tapa cuelga media altura hacia arriba DENTRO del pivote, así que
  // rotar el pivote la levanta desde su borde inferior, como una bisagra real. Rotando la tapa
  // directamente, el borde de abajo atraviesa la base.
  const pivote = new THREE.Group()
  pivote.position.set(0, GRUESO * 0.75, -PROF / 2)
  gFlota.add(pivote)

  const tapa = new THREE.Mesh(
    new THREE.ExtrudeGeometry(formaRedonda(THREE, ANCHO, ALTO_P, R * 2), {
      depth: GRUESO, bevelEnabled: true, bevelThickness: GRUESO * 0.35,
      bevelSize: ANCHO * 0.003, bevelSegments: 2, curveSegments: 12,
    }), matAlu)
  tapa.geometry.center()
  tapa.position.y = ALTO_P / 2
  pivote.add(tapa)

  // ---------------------------------------------------------------- pantalla
  let pantalla = null
  if (tira) {
    tira.colorSpace = THREE.SRGBColorSpace
    tira.wrapS = tira.wrapT = THREE.ClampToEdgeWrapping
    tira.anisotropy = 8
    // La tira se capturó en viewport MÓVIL (9:19.5) y la pantalla de una notebook es 16:10. Mostrarla
    // entera la achataría hasta lo grotesco. Se muestra una VENTANA ancha de la tira, del alto que
    // corresponde: es el mismo recorte que ve alguien con la ventana del navegador a esa altura.
    const visible = Math.min(1, (altoVP / altoTira) * 0.52)
    tira.repeat.set(1, visible)
    tira.offset.set(0, 1 - visible)

    const pw = ANCHO * 0.935, ph = ALTO_P * 0.90
    const matP = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { map: { value: tira }, uR: { value: 0.006 }, uAR: { value: pw / ph }, uRevela: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform sampler2D map; uniform float uR, uAR, uRevela; varying vec2 vUv;
        float rr(vec2 p, vec2 h, float r){ vec2 d = abs(p) - h + vec2(r); return length(max(d,0.0)) + min(max(d.x,d.y),0.0) - r; }
        void main(){
          vec2 p = vec2(vUv.x - 0.5, (vUv.y - 0.5) / uAR);
          float dist = rr(p, vec2(0.5, 0.5 / uAR), uR);
          float a = smoothstep(0.003, -0.002, dist);
          // LA PANTALLA SE PRENDE DE ABAJO HACIA ARRIBA mientras la tapa sube. Es el gesto que hace que
          // el contenido parezca consecuencia de la apertura y no una textura que aparecio de golpe.
          a *= smoothstep(uRevela - 0.14, uRevela + 0.02, vUv.y) * 0.0 + smoothstep(1.0 - uRevela - 0.12, 1.0 - uRevela + 0.06, 1.0 - vUv.y);
          if (a < 0.004) discard;
          vec3 c = texture2D(map, vUv).rgb;
          // brillo de vidrio en diagonal + filo interno, recortados por el mismo SDF
          c += vec3(0.5, 0.56, 0.7) * smoothstep(0.5, 0.0, abs((vUv.x * 0.8 + vUv.y * 1.1) - 1.25)) * 0.05;
          c += vec3(0.4, 0.44, 0.54) * smoothstep(-0.009, -0.001, dist) * 0.5;
          gl_FragColor = vec4(c, a);
        }`,
    })
    pantalla = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), matP)
    gr.add(pantalla)
  }

  // HALO detrás del equipo, como la luz de fondo de una foto de producto.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO * 2.4, ALTO_P * 2.6),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: hex(LOOK.acento) }, uF: { value: 0.26 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uCol; uniform float uF; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(uCol, smoothstep(0.5, 0.05, distance(vUv, vec2(0.5))) * uF); }`,
    }))
  halo.position.set(0, ALTO_P * 0.25, -PROF * 0.9)
  gFlota.add(halo)

  // ------------------------------------------------------------------ tiempo
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base0 = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base0 * 0.30, duration: b(1), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base0, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // Llega cerrada, de abajo y de perfil.
  gEq.position.set(0, -mundoH * 0.06 - 1.6, -3.2)
  gEq.rotation.set(0.42, -0.62, 0)
  pivote.rotation.x = -Math.PI * 0.5 + 0.02              // cerrada del todo
  tl.to(gEq.position, { y: -mundoH * 0.06, z: 0, duration: b(1.3), ease: E.llega(1.5) }, 0)
  tl.to(gEq.rotation, { x: 0.30, y: -0.20, duration: b(1.6), ease: E.frena(3) }, 0)

  // ABRE. Es el gesto central y se le da un beat entero, con overshoot chico: una tapa que llega
  // clavada a su ángulo final se ve motorizada; con un rebote mínimo se ve empujada por una mano.
  tl.to(pivote.rotation, { x: -0.20, duration: b(1.5), ease: 'back.out(1.25)' }, b(0.9))
  if (pantalla) {
    tl.fromTo(pantalla.material.uniforms.uRevela, { value: 0 },
      { value: 1.25, duration: b(1.5), ease: E.frena(2), immediateRender: false }, b(1.05))
  }

  // FLOTA: períodos que no son múltiplos entre sí, o los ejes se realinean y el equipo late entero.
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28
  const flotar = () => {
    const t = tl.time()
    const k = Math.min(1, Math.max(0, (t - b(1.3)) / b(1.2)))
    gFlota.position.y = Math.sin(t * 0.63 + f1) * 0.13 * k
    gFlota.rotation.y = Math.sin(t * 0.47 + f2) * 0.13 * k
  }
  flotar()

  // EL SCROLL SALTA POR BEAT, no es una rampa.
  //
  // Medido: esta escena daba 0.072 de movimiento y 61% de frames casi quietos — la segunda peor de la
  // pieza, y la peor de los heroes. La causa era esta línea: después de que la tapa abre, en cuatro
  // beats no pasaba NADA salvo un desplazamiento continuo tan suave que el analizador no lo distingue
  // de una foto fija. Y no lo distingue porque el ojo tampoco.
  //
  // Un scroll REAL no es una rampa: alguien empuja el dedo, la página salta, frena, vuelve a saltar.
  // Cinco saltos rápidos con reposo entre medio dan cinco EVENTOS donde antes había una rampa, se leen
  // como una mano usando el aparato, y suman movimiento donde no había. Cada salto arranca en su beat.
  if (tira) {
    const visible = Math.min(1, (altoVP / altoTira) * 0.52)
    const recorrido = Math.max(0, 1 - visible) * 0.55
    const SALTOS = 5
    const y0 = 1 - visible
    for (let i = 0; i < SALTOS; i++) {
      // El primer salto es el más largo: es el que dice "esto se puede scrollear". Los siguientes se
      // acortan, como el gesto real de alguien que ya encontró lo que buscaba.
      const desde = y0 - recorrido * (i / SALTOS) ** 0.78
      const hasta = y0 - recorrido * ((i + 1) / SALTOS) ** 0.78
      tl.fromTo(tira.offset, { y: desde },
        { y: hasta, duration: b(0.38), ease: E.frena(4), immediateRender: false }, b(2.4 + i * 0.9))
    }
  }

  // EL APARATO GIRA A PERFIL Y VUELVE. Es el único gesto que aprovecha que hay un objeto de tres
  // dimensiones ahí: durante medio segundo se ve el CANTO —el aluminio, el grosor, la bisagra— y eso
  // es lo que separa un render 3D de una foto de producto con parallax. Cae en el beat 4 y vuelve en
  // el 5.5, o sea sobre la grilla, para que el giro se sienta parte del montaje y no un capricho.
  tl.to(gEq.rotation, { y: -0.78, duration: b(0.55), ease: E.frena(3) }, b(4))
  tl.to(gEq.rotation, { y: -0.20, duration: b(0.7), ease: E.llega(1.3) }, b(5.5))

  // El halo LATE en cada beat. Es el metrónomo visual de la escena: sin él, entre salto y salto de
  // scroll el cuadro vuelve a quedarse sin nada que cambie.
  const uHalo = halo.material.uniforms.uF
  for (let i = 2; i < meta.beats - 1; i++) {
    tl.to(uHalo, { value: 0.44, duration: b(0.16), ease: E.frena(3) }, b(i))
    tl.to(uHalo, { value: 0.26, duration: b(0.55), ease: E.vaiven() }, b(i + 0.16))
  }

  tl.fromTo(camera.position, { z: dolly(distBase, 1.1) }, { z: dolly(distBase, -0.45), duration: DUR * 0.82, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // Sale hacia abajo cerrando de a poco: el mismo gesto que la trajo, al revés y acelerando.
  tl.to(gEq.position, { y: -mundoH * 1.05, duration: b(0.9), ease: E.acelera(3) }, DUR - b(0.9))
  tl.to(pivote.rotation, { x: -0.55, duration: b(0.9), ease: E.acelera(2) }, DUR - b(0.9))

  // La pantalla vive en la escena post-bloom: hay que copiarle la transformación MUNDIAL del pivote,
  // porque su padre real (la tapa) está dos grupos adentro y rotado.
  const mundo = new THREE.Matrix4()
  const sincronizar = () => {
    if (!pantalla) return
    gEq.updateWorldMatrix(true, true)
    mundo.copy(tapa.matrixWorld)
    mundo.decompose(pantalla.position, pantalla.quaternion, pantalla.scale)
    pantalla.translateZ(GRUESO * 0.62)
  }
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
  tl.eventCallback('onUpdate', () => { flotar(); sincronizar() })
  sincronizar()

  return { g, gr, tl }
}
