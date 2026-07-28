// HERO "enjambre" — varios miles de partículas que se ORDENAN en una forma y vuelven a dispersarse.
//
// PARA CUÁNDO. Es el registro técnico y enérgico: datos, IA, cripto, deporte, fintech — cualquier marca
// que venda PROCESO en vez de objeto. Como `prisma` no necesita material de la página, así que también
// sirve cuando la captura falló; pero dice algo distinto. Prisma vende materia y precisión. Esto vende
// cantidad organizándose, que es la única imagen que tiene un negocio cuyo producto no se puede fotografiar.
//
// LO QUE SE LEE ES EL CONTRASTE, NO LAS PARTÍCULAS. Cuatro mil puntos sueltos sobre un fondo oscuro son
// grano de película, no un protagonista: un enjambre disperso es RUIDO. Lo que cuenta algo es el instante
// en que ese ruido COLAPSA en una forma reconocible, y el instante en que estalla. Por eso las
// transiciones duran 0.6 beats y las poses se sostienen 1.5–1.8: al revés —transiciones largas y poses
// cortas— sale una mancha que respira durante ocho beats y no se entiende qué está mirando uno.
//
// LAS FORMAS SALEN DE LA GEOMETRÍA, NO DE UNA IMAGEN. Muestrear la silueta de un logo desde un canvas
// ataría el hero a un recurso que puede no existir, y además da poses PLANAS: un cartel de puntos, que
// desaparece de canto. Un catálogo de superficies paramétricas —esfera, toro, retícula de cubo, espiral—
// se muestrea con ctx.rnd(), tiene volumen de verdad y da una pieza distinta por semilla, que es
// exactamente para lo que existen los heroes.
//
// TODO SE CALCULA UNA VEZ. Las tres poses y la nube dispersa viven en Float32Array construidos en
// build(); el onUpdate sólo interpola entre dos de ellos. Recalcular una superficie por cuadro con
// cuatro mil puntos cuesta los fps y, peor, mete azar DENTRO del tiempo: dos renders del mismo video
// dejarían de ser iguales, que es la regla que más caro sale romper.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, nivel, dolly } from '../kit.js'

export const meta = {
  id: 'enjambre',
  nombre: 'Enjambre de partículas',
  necesita: ['nada'],
  beats: 8,
}

// El tamaño del enjambre y la retícula del cubo están ATADOS: 6 caras de 26 x 26 nodos son exactamente
// 4056 puntos, así que en la pose de grilla cada punto ocupa un nodo distinto y no sobra ni falta
// ninguno. Tocar uno sin tocar el otro deja la retícula con agujeros o con puntos apilados.
const MALLA = 26
const N = 6 * MALLA * MALLA
const TAU = Math.PI * 2

// ---------------------------------------------------------------- el catálogo de poses
// Cada generador llena `dest` con N puntos SOBRE su superficie. Todos reciben el mismo radio de
// referencia y se dimensionan contra él, así que las tres poses de una pieza ocupan el mismo lugar del
// cuadro y la transición se lee como una transformación y no como un cambio de plano.

function esfera(dest, n, R, rnd) {
  for (let i = 0; i < n; i++) {
    // u UNIFORME en [-1,1], no un ángulo uniforme. Con dos ángulos uniformes los puntos se apelotonan
    // en los polos: la esfera sale con dos manchas brillantes arriba y abajo y el ecuador vacío, que es
    // el defecto que delata a cualquier "esfera de partículas" hecha a las apuradas.
    const u = rnd() * 2 - 1
    const a = rnd() * TAU
    const s = Math.sqrt(Math.max(0, 1 - u * u))
    // Un pelo de espesor: una cáscara matemáticamente fina se lee como alambre, no como enjambre.
    const r = R * (0.95 + rnd() * 0.05)
    const k = i * 3
    dest[k] = Math.cos(a) * s * r
    dest[k + 1] = u * r
    dest[k + 2] = Math.sin(a) * s * r
  }
}

function toro(dest, n, R, rnd) {
  // En el plano XY, o sea de frente a la cámara: un toro tumbado en XZ se ve de canto y se lee como una
  // barra horizontal. La inclinación que lo convierte en anillo en perspectiva la pone el grupo.
  const Rm = R * 0.76, rt = R * 0.25
  for (let i = 0; i < n; i++) {
    // RECHAZO, y no es purismo. Sorteando el ángulo del tubo uniforme, el borde INTERIOR del anillo
    // —que es más corto— recibe tantos puntos como el exterior y sale una cresta densa alrededor del
    // agujero con el borde de afuera desflecado. Se acepta con probabilidad proporcional al radio
    // local; ocho intentos alcanzan de sobra y el peor caso cae en el último ángulo sorteado.
    let v = 0
    for (let t = 0; t < 8; t++) {
      v = rnd() * TAU
      if (rnd() * (Rm + rt) <= Rm + rt * Math.cos(v)) break
    }
    const u = rnd() * TAU
    const rr = Rm + rt * Math.cos(v)
    const k = i * 3
    dest[k] = Math.cos(u) * rr
    dest[k + 1] = Math.sin(u) * rr
    dest[k + 2] = rt * Math.sin(v)
  }
}

function grilla(dest, n, R, rnd) {
  // RETÍCULA SOBRE LAS SEIS CARAS DE UN CUBO. Una grilla plana es la pose obvia y la peor: cuando el
  // enjambre gira queda de canto y desaparece en una línea. Una cáscara de cubo se lee como ESTRUCTURA
  // desde cualquier ángulo, y es la pose que dice "datos" sin escribir la palabra — que es la única
  // forma que tiene este hero de decirlo, porque no dibuja tipografía.
  const lado = R * 1.34
  const paso = lado / (MALLA - 1)
  const h = lado / 2
  for (let i = 0; i < n; i++) {
    // Cada punto ocupa un nodo DISTINTO y el paso de 17 —primo con 4056— los recorre todos en un orden
    // salteado. Sorteando el nodo con rnd() un tercio quedaría vacío y otro tanto apilaría dos o tres
    // puntos: la retícula saldría comida de agujeros. Y tomándolos en orden natural sería peor, porque
    // las capas de color son TRAMOS CONTIGUOS del índice y pintarían franjas: la cara de arriba de un
    // color y la de abajo de otro.
    const nodo = (i * 17) % n
    const cara = nodo % 6
    const j = (nodo / 6) | 0
    const a = (j % MALLA) * paso - h
    const c = ((j / MALLA) | 0) * paso - h
    const d = (cara & 1) ? h : -h
    const eje = cara >> 1
    const k = i * 3
    // Un jitter de un sexto del paso. Una retícula perfecta a tres píxeles por punto hace moaré con la
    // grilla del cuadro y titila; desalineada apenas, se sigue leyendo como retícula y no vibra.
    const j1 = (rnd() - 0.5) * paso * 0.16
    const j2 = (rnd() - 0.5) * paso * 0.16
    const j3 = (rnd() - 0.5) * paso * 0.16
    dest[k] = (eje === 0 ? d : a) + j1
    dest[k + 1] = (eje === 0 ? a : eje === 1 ? d : c) + j2
    dest[k + 2] = (eje === 2 ? d : c) + j3
  }
}

function espiral(dest, n, R, rnd) {
  for (let i = 0; i < n; i++) {
    const brazo = rnd() < 0.5 ? 0 : Math.PI
    // u elevado a 0.6 concentra el centro. Una espiral de densidad pareja se lee como un remolino hueco;
    // lo que hace que una galaxia sea una galaxia es que tenga NÚCLEO.
    const u = Math.pow(rnd(), 0.6)
    const ang = brazo + u * 3.6 + (rnd() - 0.5) * 0.55
    const rad = R * (0.06 + u * 1.0)
    const ancho = R * 0.13 * (0.30 + u)
    const k = i * 3
    dest[k] = Math.cos(ang) * rad + (rnd() - 0.5) * ancho
    dest[k + 1] = Math.sin(ang) * rad + (rnd() - 0.5) * ancho
    dest[k + 2] = (rnd() - 0.5) * R * 0.16 * (1.1 - u * 0.7)
  }
}

// Un disco redondo y blando como textura del punto. La primera versión iba sin `map`: `PointsMaterial`
// dibuja entonces CUADRADOS de tres píxeles, y con el enjambre girando titilaban como ruido de
// compresión — el borde duro de un cuadrado tan chico entra y sale del píxel en cada cuadro. Un degradé
// radial con caída a alfa cero sirve para los dos mundos: sumado sobre negro da un destello, y con
// mezcla normal sobre blanco da un punto de tinta con el borde limpio.
function puntoRedondo(THREE) {
  const cv = document.createElement('canvas')
  cv.width = 64
  cv.height = 64
  const c = cv.getContext('2d')
  const gd = c.createRadialGradient(32, 32, 0, 32, 32, 32)
  gd.addColorStop(0.0, 'rgba(255,255,255,1)')
  gd.addColorStop(0.32, 'rgba(255,255,255,0.78)')
  gd.addColorStop(1.0, 'rgba(255,255,255,0)')
  c.fillStyle = gd
  c.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function build(ctx) {
  const { THREE, gsap, mundoW, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()          // no hay textura de la página en este hero: queda vacío a propósito
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)
  const oscuro = !ctx.claro

  // El radio se mide contra el ANCHO y no contra el alto: en 9:16 lo que recorta es el ancho, y una
  // esfera dimensionada por el alto se sale por los costados antes de llegar a media pieza.
  const R = mundoW * 0.46

  const gP = new THREE.Group()
  g.add(gP)

  // ------------------------------------------------------------------ las tres poses
  // Se eligen TRES de las cuatro y en orden sorteado. Barajar y cortar en vez de sortear tres veces
  // garantiza que no se repita ninguna: dos poses iguales seguidas serían una transición que no
  // transiciona, o sea un beat entero tirado.
  const catalogo = [esfera, toro, grilla, espiral]
  for (let i = catalogo.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = catalogo[i]
    catalogo[i] = catalogo[j]
    catalogo[j] = tmp
  }
  const poses = []
  for (let p = 0; p < 3; p++) {
    const arr = new Float32Array(N * 3)
    catalogo[p](arr, N, R, rnd)
    poses.push(arr)
  }

  // LA NUBE: el estado disperso del que sale el enjambre y al que vuelve. También es el pico de cada
  // estallido, así que un mismo array resuelve la entrada, las dos explosiones y la salida.
  const nube = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const u = rnd() * 2 - 1
    const a = rnd() * TAU
    const s = Math.sqrt(Math.max(0, 1 - u * u))
    const rr = R * (1.25 + Math.pow(rnd(), 0.55) * 1.75)
    const k = i * 3
    // Estirada en Y y MUCHO en Z. El cuadro tiene 5.6 unidades de ancho y 10 de alto: una nube esférica
    // se dispersa hacia los costados, se va de cuadro y el estallido queda fuera de campo justo cuando
    // es lo único que hay que ver. Empujada hacia el fondo, lo mismo se convierte en profundidad — los
    // puntos lejanos achican por atenuación de tamaño y el enjambre gana espacio en vez de perderlo.
    nube[k] = Math.cos(a) * s * rr * 0.98
    nube[k + 1] = u * rr * 1.42
    nube[k + 2] = Math.sin(a) * s * rr * 2.30 - R * 0.7
  }

  // Fase propia de cada punto para el temblor permanente. Sin esto, durante los casi dos beats que dura
  // una pose el enjambre es una escultura quieta: la pose se sostiene, pero el enjambre no zumba.
  const fase = new Float32Array(N)
  for (let i = 0; i < N; i++) fase[i] = rnd() * TAU

  // ------------------------------------------------------------------ las capas
  // TRES CAPAS Y NO UNA. `PointsMaterial` tiene UN color para todo el objeto: con una sola capa el
  // enjambre sale monocromo y plano, y lo que da lectura de volumen en una nube de puntos es que
  // convivan tamaños y brillos distintos. Partirlo en tres devuelve lo que un shader daría con un
  // attribute, sin escribir un shader — y de paso las tres pueden encenderse escalonadas.
  //
  // LA GANANCIA VA POR CAPA, y no es un detalle de gusto — es el presupuesto de luz. Con una ganancia
  // única de 1.2 para las tres, el gris de los destellos (nivel(0.92), luminancia 0.752) se pasaba al
  // TOPE y salía #f2f4f8: quinientos puntos de blanco puro y máxima luminancia, de siete píxeles, todos
  // por encima del umbral de bloom. Eso no es un destello, es leche. Es exactamente la trampa que
  // documenta `matAcento` en el kit: un color que ya tiene un canal arriba no se enciende
  // multiplicándolo, se satura y pierde el tono. Los acentos sí necesitan el empujón —son los que dan
  // la luz de la pieza—; el gris ya está donde tiene que estar y va sin tocar.
  const CAPAS = [
    // 1.15 es el número que el kit dejó documentado para el acento: margen para que el bloom trabaje
    // sin reventar el tono.
    { frac: 0.60, color: LOOK.acento, ganancia: 1.15, size: 0.075, op: 0.95 },
    // El acento2 va SIN ganancia, y esto sí lo medí. El turquesa de la paleta base tiene luminancia
    // 0.593 y el umbral del aire técnico es 0.62: multiplicarlo aunque sea por 1.05 lo empuja a 0.628 y
    // lo cruza. Con mil doscientos puntos floreciendo, el bloom deja de ser un brillo y se come la
    // FORMA, que es lo único que este hero tiene para contar. Que la paleta decida de qué lado cae; el
    // que tiene que florecer a propósito es el destello, y son trescientos.
    { frac: 0.31, color: LOOK.acento2, ganancia: 1.0, size: 0.100, op: 0.85 },
    // Los pocos destellos calientes — nueve de cada cien, no trece, porque son los ÚNICOS que florecen
    // enteros y su gracia es que se cuenten. Van en `nivel(0.92)` y no en un blanco escrito a mano
    // porque en un mundo claro eso mismo tiene que salir CASI TINTA, o sea puntos de tinta sobre papel.
    // Se llama dentro de build(): a nivel de módulo se congelaría con la paleta de ANTHEM.
    { frac: 0.09, color: nivel(0.92), ganancia: 1.0, size: 0.135, op: 0.75 },
  ]

  // UN SOLO ARRAY VIVO PARA LAS TRES CAPAS. Cada geometría toma un `subarray`, que COMPARTE el buffer:
  // el onUpdate escribe una vez, seguido, y las tres capas ven el resultado. Con tres arrays separados
  // habría que decidir a cuál escribe cada punto DENTRO del bucle caliente, que corre cuatro mil veces
  // por cuadro.
  const vivo = new Float32Array(N * 3)
  const sprite = puntoRedondo(THREE)
  const capas = []
  let desde = 0
  for (let i = 0; i < CAPAS.length; i++) {
    const c = CAPAS[i]
    const cuantos = i === CAPAS.length - 1 ? N - desde : Math.floor(N * c.frac)
    const geo = new THREE.BufferGeometry()
    const attr = new THREE.BufferAttribute(vivo.subarray(desde * 3, (desde + cuantos) * 3), 3)
    attr.setUsage(THREE.DynamicDrawUsage)          // se reescribe entero en cada cuadro
    geo.setAttribute('position', attr)
    const mat = new THREE.PointsMaterial({
      map: sprite,
      // En claro no hay bloom que valga y sumar sobre blanco no aclara nada, sólo desatura hasta el
      // gris: el mismo color va OSCURECIDO y con mezcla normal, que sobre papel es lo que se ve.
      // EN CLARO EL PUNTO SE MEZCLA HACIA LA TINTA, no se multiplica por un escalar.
      //
      // Multiplicar por 0.62 baja el brillo pero deja el mismo tono, y un violeta de marca a dos
      // tercios de brillo sobre papel blanco, con la caida suave del sprite y catorce pixeles de
      // diametro, no llega a existir: renderizado en vivo, la escena salia COMPLETAMENTE VACIA — cuatro
      // cuadros de fondo y nada mas. En oscuro andaba perfecto (cubo, toro y espiral bien legibles),
      // asi que el defecto era solo de polaridad y ninguna compuerta lo veia: el verificador cuenta que
      // las cosas se muevan, no que se vean.
      //
      // Mezclado hacia la tinta, el punto queda oscuro sobre papel — que es como se ve un enjambre en
      // un impreso— y conserva un resto del tono de la marca.
      color: oscuro
        ? hex(c.color).multiplyScalar(c.ganancia)
        : hex(c.color).lerp(hex(LOOK.tinta), 0.62),
      // Y mas grande: sobre blanco no hay bloom que agrande el punto, asi que el diametro tiene que
      // ponerlo la geometria.
      size: c.size * (oscuro ? 1 : 1.45), sizeAttenuation: true,
      transparent: true, depthWrite: false, toneMapped: false,
      blending: oscuro ? THREE.AdditiveBlending : THREE.NormalBlending,
      // Arranca encendida a menos de la mitad y no en cero: el enjambre YA está ahí, disperso y tenue,
      // cuando cae el corte. Que el primer cuadro de la escena esté vacío es lo que hace que un hero
      // "aparezca" en vez de "estar".
      opacity: c.op * (oscuro ? 0.42 : 0.62),
    })
    const pts = new THREE.Points(geo, mat)
    // La esfera de acotación se calcula una sola vez, con el buffer todavía en cero. Como las posiciones
    // cambian por cuadro y el estallido las manda mucho más lejos, el culling por frustum descartaría el
    // objeto entero justo en el momento más ancho. Acá no ahorra nada: siempre está en cuadro.
    pts.frustumCulled = false
    gP.add(pts)
    capas.push({ geo, mat, op: c.op })
    desde += cuantos
  }

  // HALO detrás. Un enjambre de puntos finos sobre un fondo oscuro no tiene silueta: son cuatro mil
  // cosas chicas y ninguna grande. El halo es lo que le da un CUERPO al conjunto y lo separa del fondo,
  // igual que la luz que un fotógrafo pone detrás del producto.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 4.6, R * 4.6),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: hex(LOOK.acento) }, uF: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uCol; uniform float uF; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(uCol, smoothstep(0.5, 0.02, distance(vUv, vec2(0.5))) * uF); }`,
    }))
  halo.position.z = -R * 1.9
  gP.add(halo)

  // ------------------------------------------------------------------ tiempo
  // UN SOLO ESCALAR MANDA TODO EL ENJAMBRE. `prog.v` recorre -1 → 0 → 1 → 2 → 3, donde -1 y 3 son la
  // nube y 0, 1, 2 son las poses. La parte entera dice entre qué dos estados se interpola y la
  // fraccionaria cuánto: un tween de GSAP por tramo, con el GESTO del aire, moviendo cuatro mil puntos.
  // Animar las posiciones con tweens habría sido doce mil propiedades.
  const prog = { v: -1 }

  // OJO CON LA CURVA: `prog` NO puede llevar una con rebote. `E.llega` es back.out y se pasa del
  // destino, y pasarse de 0 acá no significa "un overshoot elegante" — significa empezar a mezclar con
  // la pose SIGUIENTE, que todavía no tiene que existir en pantalla. El overshoot de este hero es el
  // estallido, y está en otro lado.
  tl.to(prog, { v: 0, duration: b(1.05), ease: E.frena(3) }, 0)
  tl.to(prog, { v: 1, duration: b(0.62), ease: E.frena(3) }, b(2.55))
  tl.to(prog, { v: 2, duration: b(0.62), ease: E.frena(3) }, b(4.62))
  tl.to(prog, { v: 3, duration: b(0.95), ease: E.acelera(3) }, DUR - b(0.95))

  // Las capas se encienden escalonadas y se apagan juntas: entrar es un gesto que se puede saborear,
  // salir es un corte.
  for (let i = 0; i < capas.length; i++) {
    tl.to(capas[i].mat, { opacity: capas[i].op, duration: b(1.0), ease: E.frena(2) }, b(0.15 + i * 0.12))
    tl.to(capas[i].mat, { opacity: 0, duration: b(0.8), ease: E.acelera(2) }, DUR - b(0.8))
  }

  tl.to(halo.material.uniforms.uF, { value: oscuro ? 0.34 : 0.16, duration: b(1.3), ease: E.frena(2) }, b(0.4))
  tl.to(halo.material.uniforms.uF, { value: oscuro ? 0.19 : 0.09, duration: b(1.6), ease: E.vaiven() }, b(3.2))
  tl.to(halo.material.uniforms.uF, { value: oscuro ? 0.32 : 0.15, duration: b(1.5), ease: E.vaiven() }, b(5.0))
  tl.to(halo.material.uniforms.uF, { value: 0, duration: b(0.7), ease: E.acelera(2) }, DUR - b(0.75))

  // El fondo CEDE mientras el hero es el sujeto, por la misma razón que en `telefono`: la grilla en fuga
  // y un enjambre de puntos finos son dos tramas compitiendo por la misma atención, y acá es peor
  // porque las dos están hechas de lo mismo. Vuelve antes del corte, que la escena siguiente la usa.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.34, duration: b(1.0), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // Un golpe de luz del fondo en cada colapso. No es decoración: es lo que hace que el momento en que
  // la forma se arma caiga EN el beat y no cerca del beat.
  if (ctx.fondo && ctx.fondo.uPulso) {
    const golpes = [b(1.0), b(2.70), b(4.77), b(7.15)]
    for (const m of golpes) {
      tl.to(ctx.fondo.uPulso, { value: 0.32, duration: b(0.14), ease: E.frena(2) }, m)
      tl.to(ctx.fondo.uPulso, { value: 0, duration: b(0.5), ease: E.acelera(2) }, m + b(0.14))
    }
  }

  tl.fromTo(camera.position, { z: dolly(distBase, 1.1) }, { z: dolly(distBase, -0.6), duration: DUR * 0.84, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.16, ease: E.vaiven() }, DUR * 0.84)

  // ------------------------------------------------------------------ el bucle
  const f1 = rnd() * TAU, f2 = rnd() * TAU
  const poseDe = i => (i >= 0 && i < 3 ? poses[i] : nube)

  const mover = () => {
    const t = tl.time()
    // Se acota por las dudas: si un aire reemplaza el gesto por una curva con rebote, un `prog` fuera de
    // rango indexaría una pose que no existe y el enjambre saldría en NaN — o sea, no saldría.
    const v = Math.max(-1, Math.min(3, prog.v))
    const i0 = Math.floor(v)
    const s = v - i0
    const A = poseDe(i0), B = poseDe(i0 + 1)
    // EL ESTALLIDO va sólo entre dos poses ORDENADAS (i0 es 0 ó 1). La entrada viene de la nube y la
    // salida va a la nube: ahí el estallido sería empujar hacia donde el enjambre ya está yendo, y en
    // vez de una explosión daría un frenazo en el medio del gesto.
    const est = (i0 === 0 || i0 === 1) ? Math.sin(Math.PI * s) * 0.86 : 0
    const w = R * 0.019
    for (let i = 0; i < N; i++) {
      const k = i * 3
      const f = fase[i]
      let x = A[k] + (B[k] - A[k]) * s
      let y = A[k + 1] + (B[k + 1] - A[k + 1]) * s
      let z = A[k + 2] + (B[k + 2] - A[k + 2]) * s
      if (est > 0) {
        x += (nube[k] - x) * est
        y += (nube[k + 1] - y) * est
        z += (nube[k + 2] - z) * est
      }
      // Tres senos por punto con frecuencias que no son múltiplos: el zumbido. Con una sola frecuencia
      // los cuatro mil puntos laten a la vez y el enjambre entero respira como un globo.
      vivo[k] = x + Math.sin(t * 1.7 + f) * w
      vivo[k + 1] = y + Math.sin(t * 2.1 + f * 1.7) * w
      vivo[k + 2] = z + Math.sin(t * 1.3 + f * 2.6) * w
    }
    for (const c of capas) c.geo.attributes.position.needsUpdate = true

    // El grupo TUMBA además de rodar. El giro en Z (rodar de frente) es el que nunca traiciona: mantiene
    // las poses planas —el toro, la espiral— mirando a la cámara. El de Y es lento y acotado a poco más
    // de medio radián en toda la pieza, porque pasado eso un anillo se ve de canto y se convierte en una
    // raya. Y sin el vaivén en X el cubo mostraría siempre la misma cara.
    gP.rotation.y = -0.42 + t * 0.27
    gP.rotation.z = t * 0.15
    gP.rotation.x = 0.17 + Math.sin(t * 0.44 + f1) * 0.12
    gP.scale.setScalar(1 + Math.sin(t * 0.95 + f2) * 0.022)
  }

  // El onUpdate de la TIMELINE corre DESPUÉS de todos sus hijos, y eso acá es la diferencia entre que
  // funcione y que no: `prog.v` lo escribe un tween hijo, y GSAP renderiza sus hijos ordenados por
  // tiempo de inicio. Colgado de un tween puesto en 0, este bucle leería el `prog` del cuadro anterior.
  // Ver heroes/telefono.js, donde el mismo error costó una escena entera.
  tl.eventCallback('onUpdate', mover)
  mover()

  return { g, gr, tl }
}
