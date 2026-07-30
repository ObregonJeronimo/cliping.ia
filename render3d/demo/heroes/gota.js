// HERO "gota" — un cuerpo blando que respira y se deforma sin perder el volumen.
//
// QUE REGISTRO LLENA
// Contando la columnata, los heroes de geometria pura ya dicen materia (cristal), orbita (toro),
// sistema (enjambre), gesto (cinta) y peso (columnata). Los cinco tienen ARISTAS: son duros, medidos,
// industriales. No hay uno solo blando, y hay tres aires que no piden otra cosa — `bienestar`,
// `gastronomico` y `artesanal`. A un spa, a una panaderia o a un estudio de ceramica se les estaba
// dando un poliedro facetado, que en ese contexto se lee como software.
//
// COMO SE DEFORMA, Y POR QUE NO ES RUIDO
// La forma sale de tres senos cruzados sobre la normal de cada vertice, con periodos no multiplos
// entre si para que el ciclo no se cierre nunca. Con ruido de verdad la silueta hierve y se lee como
// una interferencia; con tres senos lentos se lee como algo VIVO, que es lo que hace falta. La
// amplitud es chica a proposito (12% del radio): pasado eso deja de ser una gota y pasa a ser una
// mancha, y una mancha no tiene volumen.
//
// POR QUE SE DEFORMA EN EL VERTEX SHADER Y NO EN JS
// El motor ya monta un estudio de iluminacion propio con PMREMGenerator y los heroes que se ven caros
// son los que lo aprovechan. Escribir un ShaderMaterial propio —como hace el cristal— significa
// renunciar a esa luz y reimplementarla peor. Con `onBeforeCompile` se le inyecta el desplazamiento al
// material fisico de three: la deformacion es de la GPU y la luz sigue siendo la del estudio. La
// normal se recalcula con dos vecinos, o el bulto se mueve y el sombreado se queda quieto — que se ve
// exactamente como un objeto rigido con una textura corriendole por encima.
//
// DETERMINISMO: el tiempo entra por un uniform que escribe la timeline, no por un reloj del shader.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, nivel, CLARO, dolly } from '../kit.js'

export const meta = {
  id: 'gota',
  nombre: 'Cuerpo blando',
  necesita: ['nada'],
  beats: 8,
}

export function build(ctx) {
  const { THREE, gsap, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  const gG = new THREE.Group()
  g.add(gG)

  const R = mundoH * 0.185

  // Detail 5 y no 2. La deformacion mueve VERTICES, asi que la silueta no puede ser mas suave que la
  // malla: con detail 2 los senos dibujan facetas y la gota se lee como un poliedro pulsando. Con 4 el
  // sombreado ya sale liso —la normal se recalcula por vertice— pero el CONTORNO todavia acusa los
  // poligonos, y en un cuerpo que vende blandura el contorno es exactamente lo que lo vende. Son 5120
  // triangulos: al lado de los 600 planos texturados que compone una pieza, no se siente.
  const geo = new THREE.IcosahedronGeometry(R, 5)

  const mat = new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.42 : 0.30)),
    roughness: 0.30, metalness: 0.05,
    clearcoat: 0.85, clearcoatRoughness: 0.22,
    // Un cuerpo blando sin translucidez se lee como plastico. `transmission` pediria otra pasada de
    // render; `sheen` da el borde encendido de una superficie tierna por una fraccion del costo.
    sheen: 0.6, sheenRoughness: 0.5, sheenColor: hex(LOOK.acento),
  })

  // El uniform vive afuera para que la timeline lo escriba: si el shader leyera su propio reloj, la
  // escena dejaria de ser scrubbeable cuadro a cuadro y el verificador la rechazaria.
  const uT = { value: 0 }
  const uAmp = { value: 0 }
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT
    sh.uniforms.uAmp = uAmp
    sh.vertexShader = 'uniform float uT; uniform float uAmp;\n' +
      'float bulto(vec3 p){\n' +
      '  return sin(p.x * 2.7 + uT * 0.9) * sin(p.y * 3.1 - uT * 0.7) * sin(p.z * 2.3 + uT * 1.1);\n' +
      '}\n' + sh.vertexShader
    // LA NORMAL SE REHACE EN `beginnormal_vertex` Y NO EN `begin_vertex`, Y EL ORDEN NO ES UN DETALLE.
    //
    // El vertex shader de three va: beginnormal_vertex (declara `objectNormal`) -> defaultnormal_vertex
    // (lo convierte en `transformedNormal`, que es lo que come la iluminacion) -> begin_vertex (declara
    // `transformed`, la posicion). Escribir la normal desde `begin_vertex` la escribe DESPUES de que la
    // luz ya se resolvio: la primera version de este hero salio negra plana, una silueta sin una sola
    // cara sombreada, y el sintoma no dice "la normal llego tarde", dice "no hay luz".
    //
    // Se calcula desplazando dos vecinos sobre la superficie y tomando el producto cruzado. Sin esto el
    // bulto viaja y el sombreado se queda quieto — se ve como un objeto rigido con una textura
    // corriendole por encima, que es peor que no deformar nada.
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>',
      'vec3 nrm = normalize(position);\n' +
      'vec3 pc = position + nrm * bulto(position) * uAmp;\n' +
      // El eje auxiliar no puede ser paralelo a la normal o el producto cruzado se anula justo en los
      // polos: se elige el mas lejano de los dos ejes candidatos.
      'vec3 aux = abs(nrm.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);\n' +
      'vec3 tg = normalize(cross(nrm, aux));\n' +
      'vec3 bt = normalize(cross(nrm, tg));\n' +
      'float h = 0.05;\n' +
      'vec3 pa = position + tg * h; vec3 pb = position + bt * h;\n' +
      'pa = pa + normalize(pa) * bulto(pa) * uAmp;\n' +
      'pb = pb + normalize(pb) * bulto(pb) * uAmp;\n' +
      'vec3 nd = normalize(cross(pa - pc, pb - pc));\n' +
      // El cruce puede salir invertido segun de que lado de la esfera se este: se lo alinea con la
      // normal de la esfera sin deformar, que siempre apunta hacia afuera.
      'vec3 objectNormal = dot(nd, nrm) < 0.0 ? -nd : nd;')
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>',
      'vec3 transformed = position + normalize(position) * bulto(position) * uAmp;')
  }

  const cuerpo = new THREE.Mesh(geo, mat)
  gG.add(cuerpo)

  // ANILLO DE APOYO en el piso. Una gota flotando sin nada debajo no tiene escala: el anillo dice a que
  // altura esta y cuanto mide. Es plano y de acento, o sea que no pide luz.
  const sombra = new THREE.Mesh(
    new THREE.RingGeometry(R * 0.55, R * 0.62, 64),
    matAcento(LOOK.acento, 1.2))
  sombra.rotation.x = -Math.PI / 2.05
  sombra.position.y = -R * 1.75
  sombra.material.transparent = true
  sombra.material.opacity = 0
  gG.add(sombra)

  // Dos motas que orbitan despacio. No son decoracion: sin nada alrededor la gota se lee como quieta
  // aunque se deforme, porque no hay contra que medir su movimiento.
  const motas = []
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(R * (0.075 + rnd() * 0.05), 1),
      matAcento(i ? LOOK.acento2 : LOOK.acento, 1.5))
    m.material.transparent = true
    m.material.opacity = 0
    m.userData.r = R * (1.55 + rnd() * 0.35)
    m.userData.f = rnd() * 6.28
    m.userData.v = 0.30 + rnd() * 0.22
    m.userData.incl = 0.4 + rnd() * 0.7
    gG.add(m)
    motas.push(m)
  }

  // ================================================================ TIEMPO
  gG.position.set(0, 0, -3.2)
  gG.scale.setScalar(0.42)

  tl.to(gG.position, { z: 0, duration: b(1.2), ease: E.llega(1.7) }, 0)
  tl.to(gG.scale, { x: 1, y: 1, z: 1, duration: b(1.35), ease: E.llega(1.9) }, 0)
  // La amplitud entra DESPUES de la llegada: deformandose mientras crece, el ojo no llega a establecer
  // cual es la forma en reposo y todo el gesto se lee como un error de render.
  tl.fromTo(uAmp, { value: 0 }, { value: R * 0.12, duration: b(1.1), ease: E.frena(2), immediateRender: false }, b(0.7))
  tl.to(sombra.material, { opacity: 0.55, duration: b(0.8), ease: E.frena(2) }, b(0.6))
  motas.forEach((m, i) => tl.to(m.material, { opacity: 0.9, duration: b(0.5), ease: E.frena(2) }, b(1.0 + i * 0.3)))

  // Un latido en los beats: la gota se hincha y vuelve. Es lo que la ata a la grilla — sin esto respira
  // a su propio ritmo y la pieza pierde el pulso justo en la escena mas larga.
  for (let k = 2; k < meta.beats - 1; k++) {
    tl.to(gG.scale, { x: 1.045, y: 1.045, z: 1.045, duration: b(0.16), ease: E.acelera(2) }, b(k))
    tl.to(gG.scale, { x: 1, y: 1, z: 1, duration: b(0.34), ease: E.llega(2.2) }, b(k) + b(0.16))
  }

  const fase = rnd() * 6.28
  const mover = () => {
    const t = tl.time()
    uT.value = t
    gG.rotation.y = t * 0.28
    gG.rotation.x = Math.sin(t * 0.33 + fase) * 0.16
    for (const m of motas) {
      const a = m.userData.f + t * m.userData.v
      m.position.set(Math.cos(a) * m.userData.r,
                     Math.sin(a * 0.7) * m.userData.r * m.userData.incl * 0.5,
                     Math.sin(a) * m.userData.r)
    }
  }
  tl.to({}, { duration: DUR, ease: 'none', onUpdate: mover }, 0)
  mover()

  tl.fromTo(camera.position, { z: dolly(distBase, 0.7) },
    { z: dolly(distBase, -0.5), duration: DUR * 0.8, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.2, ease: E.vaiven() }, DUR * 0.8)

  // Sale ACHICANDOSE y no creciendo, al reves que el cristal: un cuerpo blando que se traga el cuadro
  // se lee como una mancha que tapa: uno que se contrae se lee como que se guarda.
  const SAL = DUR - b(0.9)
  tl.to(gG.scale, { x: 0.05, y: 0.05, z: 0.05, duration: b(0.8), ease: E.acelera(3) }, SAL)
  tl.to(uAmp, { value: 0, duration: b(0.6), ease: E.acelera(2) }, SAL)
  tl.to(sombra.material, { opacity: 0, duration: b(0.5), ease: E.acelera(2) }, SAL)
  motas.forEach(m => tl.to(m.material, { opacity: 0, duration: b(0.45), ease: E.acelera(2) }, SAL))

  return { g, tl }
}
