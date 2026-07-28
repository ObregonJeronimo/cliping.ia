// HERO "cinta" — una cinta que se retuerce en el espacio, se dibuja de una punta a la otra y sale
// desenrollándose.
//
// PARA CUÁNDO. No necesita NADA de la página: ni captura, ni recortes, ni que el sitio haya dejado
// entrar al bot. Es el respaldo elegante para cuando el material falló —y falla seguido— y es el
// registro propio de las marcas que no tienen producto que mostrar: estudios, consultoras,
// servicios, moda, perfumería. Un frasco de perfume en un reel no se muestra: se envuelve.
//
// POR QUÉ UNA CINTA Y NO OTRO SÓLIDO. `prisma` ya cubre el respaldo con un objeto que gira sobre su
// eje, y girar es un gesto cerrado: empieza y termina en la misma pose. Una cinta tiene DOS PUNTAS,
// así que admite el gesto que un sólido no puede hacer —dibujarse— y ese trazo es lo que convierte
// ocho beats de geometría bonita en algo que PASA. El hero es el eje de variedad más visible de la
// pieza: cambiarlo cambia de qué trata el video, no sólo cómo se ve.
//
// EL AZAR DESPEINA, NO DIBUJA. La primera idea era sembrar puntos al azar en una caja y dejar que la
// Catmull-Rom los uniera. Sale un NUDO: los tramos se cruzan donde no toca, la cinta se tapa a sí
// misma y no se lee ni el gesto ni el material — que es todo lo que este hero tiene para dar. Acá la
// FORMA la pone una de dos familias (una hélice o un ocho de pie) y `rnd()` sólo elige la familia,
// sus proporciones y una perturbación chica por punto. Cada video tiene SU cinta y ninguna sale fea.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, dolly } from '../kit.js'

export const meta = {
  id: 'cinta',
  nombre: 'Cinta que fluye',
  necesita: ['nada'],
  beats: 8,
}

const TAU = Math.PI * 2

// ---------------------------------------------------------------- las dos familias de curva
// Las dos se recorren de abajo hacia arriba o de punta a punta, nunca cerradas: una cinta que se
// muerde la cola no se puede EMPEZAR a dibujar, y el dibujo es el gesto del hero.

function helice(THREE, rnd, mundoW, mundoH) {
  const N = 20
  const vueltas = 2.0 + rnd() * 1.3
  // EL ANCHO SE MIDE CONTRA EL GIRO, NO CONTRA EL CUADRO QUIETO. La cinta da media vuelta sobre el
  // eje Y, así que lo que hoy es profundidad dentro de un beat es ANCHO en pantalla: el límite no es
  // la caja, es el radio en el plano xz. Con `radio` hasta 0.40 la hélice medía 3.0 de radio contra
  // un semicuadro de 2.81 y se salía por los dos costados justo cuando termina de dibujarse — que es
  // el único cuadro donde la silueta entera es el contenido.
  const radio = mundoW * (0.27 + rnd() * 0.08)
  const alto = mundoH * (0.58 + rnd() * 0.10)
  const fase = rnd() * TAU
  const jitter = mundoW * 0.042
  const pts = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = fase + t * vueltas * TAU
    // PANZA. Con radio constante sale un resorte de ferretería: la misma vuelta repetida n veces, que
    // el ojo lee como una textura y no como un gesto. Abriendo hacia el medio y cerrando en las
    // puntas, la cinta tiene principio, cuerpo y final — que es lo que hace falta para dibujarla.
    const r = radio * (0.72 + 0.42 * Math.sin(Math.PI * t))
    pts.push(new THREE.Vector3(
      Math.cos(a) * r + (rnd() - 0.5) * jitter,
      (t - 0.5) * alto + (rnd() - 0.5) * jitter,
      Math.sin(a) * r + (rnd() - 0.5) * jitter))
  }
  return pts
}

function ocho(THREE, rnd, mundoW, mundoH) {
  const N = 26
  // El punto más ancho del ocho y el más hondo son EL MISMO punto (en a = π/4 el seno del doble vale
  // 1), así que los dos radios se suman en cuadratura y no por separado: son las dos medidas que hay
  // que bajar juntas para que el giro no se lleve la silueta fuera del cuadro. Ver `helice`.
  const ancho = mundoW * (0.28 + rnd() * 0.07)
  const alto = mundoH * (0.27 + rnd() * 0.05)
  const hondo = mundoW * (0.15 + rnd() * 0.11)
  const jitter = mundoW * 0.032
  // Se recorre casi la vuelta entera y se deja un hueco a propósito: las dos puntas quedan cerca sin
  // tocarse, así que el lazo se lee cerrado y sin embargo tiene dónde empezar y dónde terminar.
  const desde = 0.11, hasta = TAU - 0.11
  const pts = []
  for (let i = 0; i <= N; i++) {
    const a = desde + (hasta - desde) * (i / N)
    const den = 1 + Math.sin(a) * Math.sin(a)
    // Lemniscata de Bernoulli PUESTA DE PIE. Acostada —como se escribe siempre— deja dos franjas
    // muertas arriba y abajo de un cuadro 9:16; de pie lo llena. El 2.83 normaliza el eje corto a
    // [-1, 1], que si no el cruce del ocho queda aplastado contra el eje.
    const u = Math.cos(a) / den
    const w = Math.sin(a) * Math.cos(a) / den * 2.83
    pts.push(new THREE.Vector3(
      w * ancho + (rnd() - 0.5) * jitter,
      u * alto + (rnd() - 0.5) * jitter,
      // La profundidad es lo que la salva de ser un dibujo plano: sin esto el ocho es un logo.
      Math.sin(a * 2) * hondo + (rnd() - 0.5) * jitter))
  }
  return pts
}

// ---------------------------------------------------------------- de tubo a CINTA
// `TubeGeometry` da un fideo de sección redonda. Una cinta es una sección APLASTADA que además se
// RETUERCE a lo largo del recorrido, y esa torsión es la mitad del efecto: hace que la misma cinta
// muestre la cara en un tramo y el filo en el siguiente, o sea que el material cambie sin que cambie
// la luz. Sin torsión, un tubo aplastado se lee como un papel doblado.
//
// Se reescribe la geometría YA GENERADA en vez de armar una propia: three calcula los marcos de
// Frenet y los índices, que es lo caro y lo fácil de romper. El vértice k se encuentra por su `uv.x`,
// que en un tubo vale exactamente i/segmentos — así no hay que depender del orden en que three
// escupe los vértices, que es justo lo que cambia entre versiones.
//
// LAS NORMALES SE CALCULAN A MANO, no con computeVertexNormals(): los dos vértices de la costura
// (v = 0 y v = 2π) están en el mismo punto pero son distintos, y el promedio de caras les da normales
// distintas — una línea de sombra a lo largo de toda la cinta. Con la fórmula de la elipse
// (semiejes cruzados) los dos reciben la misma normal y la costura desaparece.
function acintar(THREE, geo, curva, segs, radio, ancho, grueso, torsion) {
  const marcos = curva.computeFrenetFrames(segs, false)
  const ejeW = [], ejeT = [], centro = []
  for (let i = 0; i <= segs; i++) {
    const a = torsion * (i / segs)
    const c = Math.cos(a), s = Math.sin(a)
    const N = marcos.normals[i], B = marcos.binormals[i]
    ejeW.push(new THREE.Vector3().copy(N).multiplyScalar(c).addScaledVector(B, s))
    ejeT.push(new THREE.Vector3().copy(N).multiplyScalar(-s).addScaledVector(B, c))
    centro.push(curva.getPointAt(i / segs, new THREE.Vector3()))
  }
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv
  const v = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3()
  for (let k = 0; k < pos.count; k++) {
    const i = Math.round(uv.getX(k) * segs)
    const P = centro[i], W = ejeW[i], T = ejeT[i]
    v.fromBufferAttribute(pos, k)
    // El vértice está a exactamente `radio` del centro, así que su desplazamiento proyectado sobre
    // los dos ejes de la sección da el coseno y el seno del ángulo dentro de la elipse.
    d.subVectors(v, P)
    const cw = d.dot(W) / radio, ct = d.dot(T) / radio
    v.copy(P).addScaledVector(W, cw * radio * ancho).addScaledVector(T, ct * radio * grueso)
    pos.setXYZ(k, v.x, v.y, v.z)
    // Normal de una elipse (a·cosθ, b·senθ): es proporcional a (b·cosθ, a·senθ) — los semiejes van
    // CRUZADOS. Usar (a·cosθ, b·senθ) es el error clásico y deja la cinta iluminada al revés.
    n.copy(W).multiplyScalar(grueso * cw).addScaledVector(T, ancho * ct).normalize()
    nor.setXYZ(k, n.x, n.y, n.z)
  }
  pos.needsUpdate = true
  nor.needsUpdate = true
  geo.computeBoundingSphere()
}

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()          // vacío a propósito: este hero no toca nada de la página
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // DOS GRUPOS. `gCinta` hace la llegada y la salida con tweens; `gGiro`, hijo suyo, hace el giro
  // continuo desde un onUpdate. Separarlos es lo que evita que dos escrituras se peleen por la misma
  // propiedad — el defecto que ya costó cinco bugs en este motor.
  const gCinta = new THREE.Group()
  const gGiro = new THREE.Group()
  gCinta.add(gGiro)
  g.add(gCinta)

  // EL AZAR NO ARRANCA EN CERO, Y ESTO CASI DEJA MEDIO ARCHIVO MUERTO. `rnd()` es un congruencial
  // lineal y su PRIMER tiro casi no depende de la semilla: medido sobre las semillas 1 a 10 del
  // verificador da 0.236, 0.237, 0.237, 0.238, 0.238, 0.238, 0.239… Un parámetro CONTINUO aguanta
  // eso —un radio parecido sigue siendo un radio distinto—, pero una decisión BINARIA se degrada a
  // una constante: la familia de la curva salía siempre la misma y la otra no se dibujaba nunca.
  // Es el mismo defecto que documenta guion.js, que por esto mezcla la semilla antes de usarla.
  // Acá se gastan dos tiros en las dos fases que menos importan —el cabeceo y el alabeo son un seno
  // de ±0.19 rad, da igual dónde empiece— y recién con el tercero se elige la forma.
  const f1 = rnd() * TAU, f2 = rnd() * TAU
  const puntos = rnd() < 0.5
    ? ocho(THREE, rnd, mundoW, mundoH)
    : helice(THREE, rnd, mundoW, mundoH)
  // 'centripetal' y no la Catmull-Rom por defecto: con puntos de espaciado irregular —y la
  // perturbación los deja irregulares— la uniforme se pasa de largo y arma rulos en las curvas
  // cerradas. La centrípeta tiene demostrado que no forma cúspides ni se cruza consigo misma.
  const curva = new THREE.CatmullRomCurve3(puntos, false, 'centripetal')

  const SEGS = 340                      // el borde del trazo mide 0.010 de la longitud: ~3 segmentos
  const RADIO = mundoW * 0.078
  const ANCHO = 1.0, GRUESO = 0.13      // 7.7 a 1: una cinta, no una manguera aplastada
  const torsion = (2.2 + rnd() * 3.6) * (rnd() < 0.5 ? -1 : 1)

  const geo = new THREE.TubeGeometry(curva, SEGS, RADIO, 12, false)
  acintar(THREE, geo, curva, SEGS, RADIO, ANCHO, GRUESO, torsion)

  // NADA DE COMILLAS INVERTIDAS DENTRO DE LOS DOS SHADERS DE ACÁ ABAJO, ni siquiera en un comentario
  // de GLSL: cierran el template literal de JavaScript y el archivo deja de parsear con un error que
  // no menciona ni el shader ni la línea (a mí me dijo "Unexpected identifier 'prisma'").
  const mat = new THREE.ShaderMaterial({
    // OPACA Y CON PROFUNDIDAD, y no es un descuido. Una cinta que se retuerce SE CRUZA CONSIGO MISMA
    // muchas veces; con `depthWrite: false` —lo que pide cualquier material translúcido— los tramos
    // de atrás se dibujan encima de los de adelante según el orden de los triángulos y el nudo se
    // desarma. La materia acá no la da el ver a través: la da que el color CAMBIE con el ángulo.
    transparent: true, depthWrite: true, side: THREE.DoubleSide,
    uniforms: {
      uA: { value: hex(LOOK.acento) }, uB: { value: hex(LOOK.acento2) },
      uTinta: { value: hex(LOOK.tinta) }, uClaro: { value: ctx.claro ? 1 : 0 },
      uProg: { value: 0 }, uCola: { value: 0 }, uCabeza: { value: 1 },
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){
        vUv = uv;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uA, uB, uTinta; uniform float uClaro, uProg, uCola, uCabeza;
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){
        // EL TRAZO. En un tubo, uv.x va de 0 en una punta a 1 en la otra, así que la cinta visible es
        // la banda [uCola, uProg]: la cabeza avanza para dibujarla y la cola avanza para
        // desenrollarla. Se hace acá y no con drawRange porque drawRange corta de a triángulos
        // enteros —la punta salta de a saltos— y porque un uniforme admite el borde suave.
        float s = vUv.x;
        float a = smoothstep(uProg, uProg - 0.010, s) * smoothstep(uCola, uCola + 0.010, s);
        if (a < 0.02) discard;

        // FRESNEL: 0 mirando la cara de frente, 1 en el filo. Es lo mismo que hace el cristal de
        // heroes/prisma.js, y es lo único que separa una cinta de un fideo de color plano.
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        // Los dos acentos se mezclan SEGÚN EL ÁNGULO: la cara es de un color y el canto del otro, así
        // que retorcerse cuenta algo en vez de sólo moverse.
        vec3 col = mix(uA, uB, clamp(f * 1.35, 0.0, 1.0));
        // EL CENTRO APAGADO Y EL FILO ENCENDIDO. También es presupuesto de luz: la cara ocupa casi
        // todo el píxel de la cinta y si pasara el umbral del bloom florecería entera y saldría una
        // mancha con forma de S. Lo que puede pasar el umbral es el filo, que es una línea.
        col *= mix(0.40, 1.10, f);
        col += uTinta * pow(f, 3.4) * 0.70 * (1.0 - uClaro);

        // LA PUNTA QUE DIBUJA, encendida sólo mientras se dibuja.
        col += uB * smoothstep(uProg - 0.055, uProg, s) * uCabeza * 1.30;

        // En un mundo claro una cinta que SUMA luz sobre blanco desaparece: acá tiene que OSCURECER,
        // y queda un cuerpo saturado y profundo con el canto más vivo, que es como se ve una cinta de
        // raso contra una ventana.
        col = mix(col, col * 0.52, uClaro * (1.0 - f * 0.6));
        gl_FragColor = vec4(col, a);
      }`,
  })
  const cinta = new THREE.Mesh(geo, mat)
  gGiro.add(cinta)

  // LA CABEZA: el punto de luz que va dejando la cinta detrás. Sin él, la cinta "aparece de a poco",
  // que es un fundido con otro nombre; con él, algo la ESTÁ dibujando y el ojo lo sigue.
  //
  // Con la intensidad POR DEFECTO y no subida a mano. Un punto que tiene que leerse como luz invita a
  // multiplicarlo, y es la trampa que documenta kit.js: acento2 (#00e5c0) ya tiene el verde en 0.90,
  // así que con 1.35 se le saturan dos canales y el punto sale blanco — deja de ser el color de la
  // marca. Lo que convierte un color en luz acá es el bloom, no el multiplicador.
  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(RADIO * 0.72, 14, 10), matAcento(LOOK.acento2))
  cabeza.scale.setScalar(0)
  gGiro.add(cabeza)

  // HALO detrás. Va colgado de `g` y NO del grupo que gira: dentro del giro el plano se pone de
  // canto y el halo se apaga justo cuando más falta hace. Un objeto oscuro sobre un fondo oscuro no
  // se separa por más canto que se le ponga — hace falta que el fondo se aclare donde el objeto está.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 2.2, mundoH * 0.95),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: hex(LOOK.acento) }, uF: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uCol; uniform float uF; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(uCol, smoothstep(0.5, 0.03, distance(vUv, vec2(0.5))) * uF); }`,
    }))
  halo.position.z = -mundoW * 0.75
  g.add(halo)

  // ------------------------------------------------------------------ tiempo
  gCinta.position.set(0, 0, -3.2)
  gCinta.scale.setScalar(0.82)
  tl.to(gCinta.position, { z: 0, duration: b(1.6), ease: E.llega(1.5) }, 0)
  tl.to(gCinta.scale, { x: 1, y: 1, z: 1, duration: b(1.8), ease: E.llega(1.6) }, 0)

  // EL TRAZO, en tres beats. Con `frena` la punta sale disparada y se arrastra hasta el final; con
  // `vaiven` arranca, toma velocidad y se asienta — que es como se mueve una mano que dibuja.
  tl.to(mat.uniforms.uProg, { value: 1, duration: b(3), ease: E.vaiven(2) }, 0)
  tl.to(cabeza.scale, { x: 1, y: 1, z: 1, duration: b(0.5), ease: E.llega(2) }, b(0.1))
  tl.to(cabeza.scale, { x: 0, y: 0, z: 0, duration: b(0.6), ease: E.acelera(2) }, b(2.85))
  tl.to(mat.uniforms.uCabeza, { value: 0, duration: b(0.6), ease: E.acelera(2) }, b(2.9))

  tl.to(halo.material.uniforms.uF, { value: ctx.claro ? 0.16 : 0.34, duration: b(1.4), ease: E.frena(2) }, b(0.4))
  tl.to(halo.material.uniforms.uF, { value: ctx.claro ? 0.09 : 0.20, duration: b(1.6), ease: E.vaiven() }, b(3.2))
  tl.to(halo.material.uniforms.uF, { value: ctx.claro ? 0.15 : 0.32, duration: b(1.5), ease: E.vaiven() }, b(4.9))
  tl.to(halo.material.uniforms.uF, { value: 0, duration: b(1.6), ease: E.acelera(2) }, DUR - b(1.6))

  // El fondo ACUSA el momento en que la cinta se cierra. Es un golpe de un beat y vuelve a su valor,
  // porque la escena siguiente cuenta con el fondo como estaba.
  if (ctx.fondo && ctx.fondo.uPulso) {
    const base = ctx.fondo.uPulso.value
    tl.to(ctx.fondo.uPulso, { value: base + 0.30, duration: b(0.35), ease: E.frena(3) }, b(2.65))
    tl.to(ctx.fondo.uPulso, { value: base, duration: b(1.1), ease: E.vaiven() }, b(3.0))
  }

  // SE DESENROLLA. La cola persigue a la cabeza y se la come: la cinta no se apaga ni se va del
  // cuadro, se termina. Acelerando, para que el corte siguiente se sienta ganado.
  tl.to(mat.uniforms.uCola, { value: 1, duration: b(1.6), ease: E.acelera(2) }, DUR - b(1.6))
  tl.to(gCinta.position, { z: 1.8, y: mundoH * 0.09, duration: b(1.6), ease: E.acelera(2) }, DUR - b(1.6))

  tl.fromTo(camera.position, { z: dolly(distBase, 0.9) }, { z: dolly(distBase, -0.5), duration: DUR * 0.8, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.2, ease: E.vaiven() }, DUR * 0.8)

  // EL GIRO, en una sola función y en función del TIEMPO, nunca acumulando. Dos ejes de períodos que
  // no son múltiplos entre sí para que la pose no se repita, y una rampa suave en el medio: durante
  // el trazo la cinta casi no gira —girar mientras se dibuja tapa el dibujo— y una vez cerrada se
  // da vuelta para mostrar que tiene dos caras y un canto.
  //
  // La rampa es un smoothstep INTEGRADO en el ángulo, no una velocidad que se enciende: sumando un
  // término que arranca y termina con derivada cero, el giro acelera y frena sin ningún salto.
  const f0 = rnd() * TAU
  const girar = () => {
    const t = tl.time()
    const k = Math.min(1, Math.max(0, (t - b(2.4)) / b(3.4)))
    gGiro.rotation.y = f0 + t * 0.30 + (k * k * (3 - 2 * k)) * 2.55
    gGiro.rotation.x = 0.14 + Math.sin(t * 0.46 + f1) * 0.19
    gGiro.rotation.z = Math.sin(t * 0.33 + f2) * 0.07
    // La cabeza va donde llegó el trazo. Lee `uProg` DESPUÉS de que su tween corrió, que es la
    // garantía que da el onUpdate de la timeline y no la de un tween hijo — ver heroes/telefono.js.
    curva.getPointAt(Math.min(1, Math.max(0, mat.uniforms.uProg.value)), cabeza.position)
  }
  tl.eventCallback('onUpdate', girar)
  girar()

  return { g, gr, tl }
}
