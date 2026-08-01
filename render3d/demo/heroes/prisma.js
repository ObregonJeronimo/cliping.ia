// HERO "prisma" — un cristal facetado que gira y refracta el acento de la marca.
//
// PARA CUÁNDO. Es el hero que se puede armar SIEMPRE: no necesita captura, ni recortes, ni que la
// página haya dejado entrar al bot. Cuando el material falla —y falla seguido: sitios que bloquean
// headless, páginas detrás de login, capturas en blanco— la alternativa no puede ser un cuadro vacío.
//
// Y NO ES UN RESPALDO TRISTE. Un cristal es exactamente el registro de las marcas que no tienen nada
// que mostrar todavía: estudios, consultoras, servicios, lanzamientos. Vende materia y precisión sin
// afirmar nada, que es justo lo que corresponde cuando no hay nada medido para afirmar.
//
// LA REFRACCIÓN ES FALSA Y ESTÁ BIEN QUE LO SEA. Refracción de verdad quiere un cubemap del entorno y
// dos pasadas de render; acá el entorno es una grilla en fuga sobre un degradé, o sea casi nada que
// refractar. Lo que hace que un cristal se lea como cristal no es la física: es que el color CAMBIE con
// el ángulo. Eso se consigue con un término de Fresnel —cuánto se aleja la normal de la cámara— y una
// separación de canales sobre esa misma curva. Cuesta veinte líneas y a 30 fps no hay diferencia.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, dolly } from '../kit.js'

export const meta = {
  id: 'prisma',
  nombre: 'Cristal facetado',
  necesita: ['nada'],
  beats: 8,
}

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, claro } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // EL RADIO SALE DEL LADO QUE RECORTA, QUE EN 9:16 ES EL ANCHO. Estaba atado a mundoH (10) en un cuadro
  // donde el semiancho es 2.8125 —y 2.71 con el dolly de esta escena, que se acerca—: el anillo de
  // afuera mide R*2.05 = 3.485 y llegaba a x=1.313 en coordenadas de recorte, o sea 31% pasado el borde,
  // cortado en 60 de sus 75 cuadros. Los tres anillos son el sujeto del hero, no un fondo que sangra.
  //
  // El 0.215 no es a ojo: el anillo mayor tiene que entrar entero, o sea R*2.05 <= mundoW*0.44 (el 0.44
  // deja el margen que se come el dolly), y 0.44/2.05 = 0.2146. Se conserva el `mundoH * 0.17` como tope
  // superior para que en un cuadro que no sea 9:16 el hero no se agrande de golpe.
  const R = Math.min(mundoH * 0.17, mundoW * 0.215)
  const gP = new THREE.Group()
  g.add(gP)

  // Icosaedro sin subdividir: veinte caras planas. Con detail 1 o 2 se acerca a una esfera y pierde
  // exactamente lo que lo hace un cristal — las aristas duras donde la luz salta de una cara a otra.
  const geo = new THREE.IcosahedronGeometry(R, 0)

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    uniforms: {
      uA: { value: hex(LOOK.acento) }, uB: { value: hex(LOOK.acento2) },
      uTinta: { value: hex(LOOK.tinta) }, uClaro: { value: 0 }, uProg: { value: 0 },
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uA, uB, uTinta; uniform float uClaro, uProg; varying vec3 vN; varying vec3 vV;
      void main(){
        // FRESNEL: 0 mirando la cara de frente, 1 en el filo. Es lo único que hace falta para que un
        // sólido se lea como vidrio — el borde brilla y el centro deja ver "a través".
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
        // Los dos acentos se mezclan SEGÚN EL ÁNGULO. Es la dispersión: el mismo cristal es violeta de
        // frente y turquesa de canto, y por eso girar cuenta algo en vez de sólo moverse.
        vec3 col = mix(uA, uB, clamp(f * 1.4, 0.0, 1.0));
        col += uTinta * pow(f, 3.0) * 0.85;                      // el filo encendido
        float a = (0.20 + f * 0.80) * uProg;
        // En un mundo claro un vidrio que SUMA luz sobre blanco desaparece: lo que da volumen ahí es
        // que las caras de frente OSCUREZCAN, como un vidrio ahumado contra una ventana.
        col = mix(col, col * 0.55, uClaro * (1.0 - f));
        a = mix(a, (0.34 + f * 0.66) * uProg, uClaro);
        gl_FragColor = vec4(col, a);
      }`,
  })
  const cristal = new THREE.Mesh(geo, mat)
  gP.add(cristal)
  mat.uniforms.uClaro.value = ctx.claro ? 1 : 0

  // ARISTAS SÓLIDAS por encima. El vidrio transparente pierde la silueta contra cualquier fondo; el
  // alambre de sus aristas es lo que la devuelve, y además da la línea fina que el ojo sigue al girar.
  const aristas = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: hex(LOOK.tinta), transparent: true, opacity: 0, toneMapped: false }))
  gP.add(aristas)

  // NÚCLEO opaco chico: sin algo sólido adentro, el conjunto se lee como una burbuja hueca.
  const nucleo = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.33, 0), matAcento(LOOK.acento, 1.1))
  gP.add(nucleo)

  // Tres anillos en planos distintos. No son decoración: son la referencia que hace visible la
  // rotación del cristal, que si no se lee como un objeto quieto con la luz cambiando.
  const anillos = []
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Mesh(
      new THREE.TorusGeometry(R * (1.45 + i * 0.30), R * 0.011, 8, 96),
      new THREE.MeshBasicMaterial({
        color: hex(i === 1 ? LOOK.acento2 : LOOK.acento), transparent: true, opacity: 0, toneMapped: false,
      }))
    a.rotation.set(1.2 + rnd() * 0.8, rnd() * 1.4, rnd() * 3.14)
    a.userData.vel = (0.16 + rnd() * 0.22) * (i % 2 ? -1 : 1)
    a.userData.rx = a.rotation.x
    gP.add(a)
    anillos.push(a)
  }

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 9, R * 9),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: hex(LOOK.acento) }, uF: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uCol; uniform float uF; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(uCol, smoothstep(0.5, 0.02, distance(vUv, vec2(0.5))) * uF); }`,
    }))
  halo.position.z = -R * 2.2
  gP.add(halo)

  // ------------------------------------------------------------------ tiempo
  gP.position.set(0, 0, -4.5)
  gP.scale.setScalar(0.3)
  gP.rotation.set(0.4, 0.2, 0)

  tl.to(gP.position, { z: 0, duration: b(1.2), ease: E.llega(1.7) }, 0)
  tl.to(gP.scale, { x: 1, y: 1, z: 1, duration: b(1.3), ease: E.llega(1.9) }, 0)
  tl.to(mat.uniforms.uProg, { value: 1, duration: b(1.1), ease: E.frena(2) }, 0)
  tl.to(aristas.material, { opacity: 0.85, duration: b(1), ease: E.frena(2) }, b(0.35))
  anillos.forEach((a, i) => tl.to(a.material, { opacity: 0.7, duration: b(0.6), ease: E.frena(2) }, b(0.8 + i * 0.22)))

  // GIRA SIN PARAR, con dos ejes de períodos primos entre sí para que no vuelva nunca a la misma pose.
  // El giro y el paralaje de los anillos, en un solo onUpdate. NO con `modifiers`: sólo se aplica a
  // propiedades declaradas en `vars`, y un tween sin propiedades con un modificador colgado no corre
  // nunca — sin error y sin aviso. Ver heroes/telefono.js.
  const f1 = rnd() * 6.28
  const girar = () => {
    const t = tl.time()
    gP.rotation.y = 0.2 + t * 0.55
    gP.rotation.x = 0.4 + Math.sin(t * 0.37 + f1) * 0.22
    for (const a of anillos) a.rotation.x = a.userData.rx + t * a.userData.vel
  }
  tl.to({}, { duration: DUR, ease: 'none', onUpdate: girar }, 0)
  girar()

  // El halo LATE con el pulso del fondo, no con un reloj propio.
  // CON RAMA DE POLARIDAD, que era lo unico que le faltaba. El halo compone en NormalBlending sobre un
  // plano de R*9 —2.7 veces el ancho del cuadro— y sus tres valores eran fijos. Sobre una pagina CLARA
  // (bgLum > 0.42, o sea cinco de cada siete paginas reales segun main.js:474) eso es alfa 0.36 del
  // acento sobre blanco en todo el cuadro: un velo lavanda que no baja nunca.
  //
  // Es la misma familia que el defecto ya documentado en enjambre.js:263-273, al reves: aquel
  // DESAPARECIA en mundo claro por sumar luz sobre blanco, este INVADE por cubrirlo. Y es incoherente
  // dentro del propio archivo: el cristal SI tiene su rama (`uClaro` en el fragment, lineas 79-80).
  //
  // El 0.33 deja el pico en 0.12 de alfa, que sobre blanco se lee como un halo y no como un fondo
  // teñido. En oscuro no cambia nada: el factor es 1.
  const HALO = claro ? 0.33 : 1
  tl.to(halo.material.uniforms.uF, { value: 0.36 * HALO, duration: b(1.4), ease: E.frena(2) }, b(0.5))
  tl.to(halo.material.uniforms.uF, { value: 0.20 * HALO, duration: b(1.6), ease: E.vaiven() }, b(3.4))
  tl.to(halo.material.uniforms.uF, { value: 0.34 * HALO, duration: b(1.6), ease: E.vaiven() }, b(5.0))

  tl.fromTo(camera.position, { z: dolly(distBase, 0.8) }, { z: dolly(distBase, -0.55), duration: DUR * 0.8, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.2, ease: E.vaiven() }, DUR * 0.8)

  // Sale creciendo hacia la cámara y apagándose: el cristal se traga el cuadro y corta.
  tl.to(gP.scale, { x: 3.4, y: 3.4, z: 3.4, duration: b(0.85), ease: E.acelera(3) }, DUR - b(0.85))
  tl.to(mat.uniforms.uProg, { value: 0, duration: b(0.7), ease: E.acelera(2) }, DUR - b(0.75))
  tl.to(aristas.material, { opacity: 0, duration: b(0.7), ease: E.acelera(2) }, DUR - b(0.75))
  anillos.forEach(a => tl.to(a.material, { opacity: 0, duration: b(0.6), ease: E.acelera(2) }, DUR - b(0.8)))
  tl.to(halo.material.uniforms.uF, { value: 0, duration: b(0.6), ease: E.acelera(2) }, DUR - b(0.8))

  return { g, gr, tl }
}
