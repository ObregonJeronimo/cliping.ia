// HERO "farol" — tres faroles de papel colgados que SE ENCIENDEN, se mecen y sueltan chispas.
//
// QUE REGISTRO LLENA, Y ES UNO QUE NO TENIA NINGUNO
// Los heroes de geometria pura dicen materia, orbita, sistema, gesto, peso, cuerpo blando, crecimiento
// y textura. Ninguno DA LUZ: todos la reciben. Y eso deja afuera un argumento entero de venta, el de
// cualquier marca que lo que ofrece es un rato — un restaurante de noche, un hotel, un bar, un teatro,
// una feria, una casa de te. Esas marcas no venden un producto, venden estar ahi cuando cae la tarde,
// y la unica forma de decir eso en 3D es que el objeto sea la fuente de luz y no el objeto iluminado.
//
// Es ademas el unico hero calido del catalogo. Los otros son grises con un acento; este pinta el
// cuadro entero de la temperatura de la marca.
//
// POR QUE EL PAPEL NO USA EL ESTUDIO DE LUZ
// La regla de este motor es que un hero que escribe su propio ShaderMaterial renuncia al estudio que
// monta el PMREMGenerator y lo reimplementa peor: es lo que documenta gota.js y es cierto para todo lo
// que RECIBE luz. El papel de un farol no recibe: emite. Iluminarlo con el estudio seria pedirle a la
// escena que le pegue un reflejo a una lampara prendida. Por eso el papel —y solo el papel— es un
// shader propio, y la estructura (los aros, el cordel, el casquete) sigue siendo material fisico y
// sigue atrapando el estudio. Esa mezcla es justamente lo que hace que se lea como un objeto y no como
// una calcomania brillante.
//
// El degrade del papel sale de cuanto lo miramos de frente: donde la superficie encara a la camara se
// ve el nucleo y donde se va de canto se ve el papel apagado. Es la aproximacion mas barata que existe
// a un difusor esferico y alcanza de sobra, porque lo que el ojo pide de una lampara de papel no es
// exactitud fotometrica: es que el borde no sea tan brillante como el centro.
//
// EL PULSO ENTRA POR LAS CHISPAS, NO POR LA LUZ
// Un farol que late con el beat es una luz de boliche y contradice todo lo que este hero vende. El
// evento contable lo ponen las brasas: nace una cada medio beat, sube y se apaga. Ocho eventos en la
// grilla sin que la escena tenga que cortar ni parpadear nada. El titileo del papel, en cambio, corre
// a su propia frecuencia y a proposito: una llama no obedece a un metronomo, y si lo hiciera se veria
// como un LED.
//
// NADA DE COMILLAS INVERTIDAS DENTRO DE LOS DOS SHADERS DE ACA ABAJO, ni siquiera en un comentario de
// GLSL: cierran el template literal de JavaScript y el archivo deja de parsear con un error que no
// menciona ni el shader ni la linea. En este repo ya rompio el build siete veces.
//
// NO USA NADA DE LA PAGINA: se arma siempre, tambien cuando la captura fallo.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, nivel, CLARO, dolly } from '../kit.js'

export const meta = {
  id: 'farol',
  nombre: 'Faroles',
  necesita: ['nada'],
  beats: 8,
}

const N_CHISPAS = 8

// ---------------------------------------------------------------- el perfil del farol
// Un farol de papel no es una esfera ni un cilindro: es un tonel con las dos bocas abiertas, y esa
// proporcion es lo unico que lo separa de una bola de navidad. La primera version usaba exponente 0.72
// con la boca al 0.22 del radio y en el render salieron TRES ESFERAS ROJAS con anillos: los hombros
// caian como los de una pelota y las bocas casi no se veian.
//
// Un exponente mas bajo empuja el perfil hacia el cilindro —los flancos quedan casi paralelos y los
// hombros se aplanan—, y una boca del 0.30 del radio es la que de verdad tienen los de papel, porque
// por ahi entra el aro de arriba. Con el alto en 1.28 del radio el cuerpo queda ancho y bajo, que es
// como cuelga algo liviano.
const radioEn = (R, v) => R * (0.30 + 0.70 * Math.pow(Math.sin(Math.PI * v), 0.45))

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // DOS GRUPOS ANIDADOS. `gSarta` hace la bajada y la subida final con tweens; `gAire`, hijo suyo,
  // lleva la brisa escrita a mano. Separarlos evita que dos escrituras se peleen por la misma
  // propiedad, que es el defecto que este motor ya pago cinco veces.
  const gSarta = new THREE.Group()
  const gAire = new THREE.Group()
  gSarta.add(gAire)
  g.add(gSarta)

  // El punto del que cuelgan esta ARRIBA DEL CUADRO. No es un detalle de composicion: un pendulo se
  // reconoce por el largo del hilo, y si el nudo se viera, el cuadro tendria un techo — que es
  // exactamente lo que un patio de noche no tiene.
  const ANCLA = mundoH * 0.58

  // ---------------------------------------------------------------- luz difusa reutilizable
  // Un disco con degrade radial. Lo usan los tres halos y el charco de luz del piso. NO es aditivo, y
  // es una decision: sobre un fondo claro la mezcla aditiva se satura a blanco y el halo desaparece
  // justo en las paginas que son mayoria. Con alfa se lee como un velo calido en las dos polaridades.
  const discoLuz = (radio, color, f0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(radio * 2, radio * 2),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uCol: { value: hex(color) }, uF: { value: f0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: `
          uniform vec3 uCol; uniform float uF; varying vec2 vUv;
          void main(){
            // El cuadrado del degrade y no el degrade pelado: una caida lineal deja un borde de disco
            // visible justo donde el halo tendria que haberse terminado hace rato.
            float d = smoothstep(0.5, 0.02, distance(vUv, vec2(0.5)));
            gl_FragColor = vec4(uCol, d * d * uF);
          }`,
      }))
    return m
  }

  // ---------------------------------------------------------------- el papel
  // El color del papel pasa por el CALIDO del aire, que es el unico de los tres colores de la paleta
  // que existe para esto. En mundo claro el papel se mezcla con un gris de `nivel`: un calido puro
  // sobre blanco se lava y el farol queda como una mancha sin silueta. En mundo oscuro se hunde para
  // que el nucleo tenga contra que destacarse.
  const papel = CLARO ? hex(LOOK.calido).lerp(hex(nivel(0.50)), 0.45) : hex(LOOK.calido).multiplyScalar(0.40)
  const nucleo = hex(LOOK.calido).multiplyScalar(CLARO ? 1.02 : 1.55)
  // EL PAPEL APAGADO, Y ESTO SE VIO EN EL PRIMER CUADRO DEL RENDER. Con el alfa atado a `enc`, un farol
  // sin encender era literalmente invisible y lo unico que quedaba en pantalla eran sus aros flotando:
  // durante todo el primer beat la escena mostraba tres resortes colgados. Un farol apagado no
  // desaparece — es un cuerpo de papel oscuro—, y ademas tenerlo ahi es lo que convierte el encendido
  // en un ACONTECIMIENTO: algo que estaba y cambia, en vez de algo que aparece.
  const frio = hex(nivel(CLARO ? 0.56 : 0.24))

  // LOS AROS NO SE VEN POR SU COLOR, SE VEN POR EL REFLEJO, y conviene decirlo porque leyendo el
  // codigo se concluye lo contrario. El color base es casi el del fondo —`nivel(0.15)` en mundo
  // oscuro—, o sea que su difusa no aporta nada; lo que los dibuja es el estudio pegando en el barniz.
  // Es lo correcto para una varilla: una varilla se ve porque brilla en el canto, no porque sea clara.
  // Los valores estan bajos a proposito. En el primer render, con metal 0.3 y barniz 0.4, los aros
  // salian BLANCOS y un farol apagado se leia como una jaula de alambre — mas fuerte que el papel, que
  // es el sujeto. Con menos metal y mas rugosidad el reflejo se queda en el canto, que es donde va.
  const matEstr = new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.66 : 0.15)),
    roughness: 0.62, metalness: 0.15, clearcoat: 0.25, clearcoatRoughness: 0.45,
  })
  // EL CORDEL VA APARTE Y VA MATE. Con el material de los aros —que tiene barniz y algo de metal— tres
  // hilos de seis unidades cruzaban el cuadro entero como tres alambres BLANCOS, y en un cuadro que
  // vive de la penumbra eso es lo mas brillante que hay. Un cordel es fibra: sin barniz y sin metal.
  const matHilo = new THREE.MeshPhysicalMaterial({
    color: hex(nivel(CLARO ? 0.74 : 0.20)), roughness: 0.92, metalness: 0.0,
  })

  // ---------------------------------------------------------------- los faroles
  // El azar se gasta primero en fases, que es donde da exactamente lo mismo por donde empiece un seno.
  // `rnd()` es un congruencial lineal y su primer tiro casi no depende de la semilla —medido en
  // cinta.js sobre diez semillas: 0.236, 0.237, 0.237, 0.238...—, asi que la primera decision que se le
  // pide sale casi siempre igual.
  const fases = [rnd() * 6.283, rnd() * 6.283, rnd() * 6.283, rnd() * 6.283]

  // Tres, a tres profundidades y tres tamaños. Uno solo se lee como un objeto de catalogo; tres arman
  // un LUGAR, que es lo unico que este hero vino a vender. El grande adelante y apenas bajo del eje —
  // la mirada cae ahi—, los otros dos abriendo el espacio hacia atras y sin alinearse con el.
  const PLAN = [
    { x: 0.00, y: -0.50, z: 0.90, R: mundoW * 0.200, w: 0.62, amp: 0.055 },
    { x: -1.42, y: 1.90, z: -2.40, R: mundoW * 0.125, w: 0.83, amp: 0.075 },
    { x: 1.30, y: -2.60, z: -1.10, R: mundoW * 0.145, w: 0.71, amp: 0.048 },
  ]

  const faroles = PLAN.map((p, k) => {
    const H = p.R * 1.28
    const L = ANCLA - p.y                       // largo del pendulo, del nudo al centro del farol

    // El grupo tiene su origen EN EL NUDO. Es lo que hace que rotar en z sea un pendulo de verdad y no
    // un objeto girando sobre si mismo: con el pivote en el centro del farol, el mismo seno da un
    // trompo, y la diferencia se ve al primer cuadro.
    const pend = new THREE.Group()
    pend.position.set(p.x, ANCLA, p.z)
    gAire.add(pend)

    // El cordel llega hasta adentro de la boca de arriba, no hasta el borde: un hilo que termina justo
    // donde empieza el papel deja ver el despegue en cuanto el farol se inclina.
    const Lc = L - H * 0.42
    const cordel = new THREE.Mesh(new THREE.CylinderGeometry(mundoW * 0.0026, mundoW * 0.0026, Lc, 5), matHilo)
    cordel.position.y = -Lc / 2
    pend.add(cordel)

    const farol = new THREE.Group()
    farol.position.y = -L
    pend.add(farol)

    // El papel. 26 puntos de perfil: con menos, la silueta —que es TODO lo que hace reconocible a un
    // farol— acusa los segmentos justo en el vientre, que es donde mas ancho es cada tramo.
    const perfil = []
    for (let i = 0; i <= 26; i++) {
      const v = i / 26
      perfil.push(new THREE.Vector2(Math.max(p.R * 0.004, radioEn(p.R, v)), (v - 0.5) * H))
    }
    const uEnc = { value: 0 }                   // cuanto esta encendido: es el ALFA
    const uBri = { value: 1 }                   // el titileo: multiplica el COLOR, asi que puede pasarse de 1
    const paperMat = new THREE.ShaderMaterial({
      // Con las dos bocas abiertas se ve la cara interna del papel del otro lado, asi que DoubleSide no
      // es opcional: sin el, el farol se ve hueco por arriba y por abajo.
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: { uPapel: { value: papel }, uNucleo: { value: nucleo }, uFrio: { value: frio }, uEnc, uBri },
      vertexShader: `
        varying vec3 vN; varying vec3 vV;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uPapel; uniform vec3 uNucleo; uniform vec3 uFrio;
        uniform float uEnc; uniform float uBri;
        varying vec3 vN; varying vec3 vV;
        void main(){
          // Valor absoluto: con DoubleSide la mitad de los triangulos nos muestra el dorso y su normal
          // apunta al reves. Sin el abs, medio farol sale negro y el defecto se lee como un agujero.
          float f = abs(dot(normalize(vN), normalize(vV)));
          // El papel apagado tiene su propio color y NO es el encendido bajado de brillo: una lampara
          // que se apaga no se vuelve marron, se vuelve del color de su material.
          vec3 c = mix(uFrio, mix(uPapel, uNucleo, pow(f, 1.7)) * uBri, uEnc);
          // Y tampoco desaparece: apagado sigue siendo un cuerpo, apenas mas translucido que encendido.
          gl_FragColor = vec4(c, mix(0.86, 1.0, uEnc));
        }`,
      // Sin tonemapear: el nucleo tiene que pasarse del umbral del bloom, que es lo que convierte un
      // color claro en LUZ. Es la unica razon por la que este hero existe.
      toneMapped: false,
    })
    const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 44), paperMat)
    farol.add(cuerpo)

    // LOS AROS. Un farol de papel tiene varillas, y sin ellas el tonel se lee como un huevo de luz.
    // Siete y no cinco: con cinco la separacion es tan grande que se leen como tres cinturones, y lo
    // que tiene que decir el aro no es "hay un aro" sino "esto esta plegado".
    for (const v of [0.04, 0.19, 0.34, 0.5, 0.66, 0.81, 0.96]) {
      const aro = new THREE.Mesh(
        new THREE.TorusGeometry(radioEn(p.R, v), p.R * 0.017, 6, 34), matEstr)
      aro.rotation.x = Math.PI / 2
      aro.position.y = (v - 0.5) * H
      farol.add(aro)
    }

    // El halo va DETRAS del farol y dentro de su grupo, asi que lo acompaña en el balanceo sin que haya
    // que sincronizar nada. Un objeto que emite luz sobre un fondo plano necesita que el fondo se
    // aclare donde el objeto esta, o la luz se queda encerrada adentro de su propia silueta.
    const halo = discoLuz(p.R * 2.6, LOOK.calido, 0)
    halo.position.z = -p.R * 1.15
    farol.add(halo)

    return { pend, halo, uEnc, uBri, enc: { v: 0 }, w: p.w, amp: p.amp, fase: fases[k], y: p.y }
  })

  // ---------------------------------------------------------------- el charco de luz
  // La luz que cae sobre la mesa. Es lo que convierte tres objetos colgados en un LUGAR: sin una
  // superficie abajo, los faroles flotan en el vacio y la escena pierde la mitad de lo que vende.
  // Casi horizontal, como el anillo de apoyo de gota.js y por el mismo motivo: un plano de piso pide
  // luz propia para no salir como una mancha gris, y un degrade no pide nada.
  const charco = discoLuz(mundoW * 0.46, LOOK.calido, 0)
  charco.rotation.x = -Math.PI / 2.10
  charco.position.set(mundoW * 0.04, -mundoH * 0.39, -0.4)
  gAire.add(charco)

  // ---------------------------------------------------------------- las chispas
  // Nacen de a una cada medio beat. No son decoracion: son el unico evento contable de la escena y
  // ademas resuelven un problema real — tres faroles quietos en un cuadro oscuro no tienen contra que
  // medirse, asi que el balanceo no se nota. Una brasa que sube da la referencia.
  const chispas = []
  for (let i = 0; i < N_CHISPAS; i++) {
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(mundoW * (0.007 + rnd() * 0.005), 0),
      matAcento(i % 3 === 1 ? LOOK.acento2 : LOOK.calido, 1.35))
    m.material.transparent = true
    m.material.opacity = 0
    gAire.add(m)
    chispas.push({
      m,
      x: (rnd() - 0.5) * mundoW * 0.62,
      z: (rnd() - 0.5) * 2.2,
      y0: -mundoH * 0.30,
      alza: mundoH * (0.42 + rnd() * 0.22),
      bamboleo: mundoW * (0.03 + rnd() * 0.04),
      w: 1.1 + rnd() * 0.9,
      fase: rnd() * 6.283,
      // Cada media negra sale una. Nacer en la grilla es lo que las vuelve un evento del compas y no
      // un adorno que flota.
      nace: b(2.0 + i * 0.5),
      vida: b(2.4),
    })
  }

  // ================================================================ TIEMPO

  // BAJAN COLGADAS. No aparecen: alguien las esta colgando, y esa es la unica llegada que no
  // contradice lo que el objeto es. Un farol no viaja por el aire ni crece.
  gSarta.position.y = mundoH * 0.16
  tl.to(gSarta.position, { y: 0, duration: b(1.3), ease: E.llega(1.5) }, 0)

  // SE ENCIENDEN DE A UNO, en beats enteros, y el grande PRIMERO. Encender primero los del fondo
  // arruinaria el unico momento que esta escena tiene: el ojo tiene que agarrarse del sujeto y recien
  // despues descubrir que hay un lugar alrededor.
  faroles.forEach((f, k) => {
    tl.fromTo(f.enc, { v: 0 },
      { v: 1, duration: b(0.85), ease: E.frena(2.4), immediateRender: false }, b(1 + k))
  })

  // ---------------------------------------------------------------- lo continuo
  // UN SOLO ESCRITOR para todo lo que depende del reloj: el balanceo, el titileo, los halos y las
  // chispas.
  //
  // VA EN EL onUpdate DE LA TIMELINE Y NO EN UN `deriva`, Y ESTO LO CAZO LA COMPUERTA DE DETERMINISMO.
  // `deriva` cuelga un tween hijo puesto en 0, y GSAP renderiza sus hijos ORDENADOS POR TIEMPO DE
  // INICIO: los tweens que encienden cada farol arrancan en el beat 1, 2 y 3, o sea que se renderizan
  // DESPUES, y esta funcion leia `enc.v` del cuadro ANTERIOR. El sintoma fue exacto y valioso: las
  // chispas salian apagadas en una construccion en frio y encendidas en la que ya habia recorrido la
  // timeline. Avanzando cuadro a cuadro el error es de un frame y no se ve; se ve cuando la aguja SALTA
  // EN FRIO, que es lo que hace un editor al arrastrarla. Es el defecto que documenta telefono.js.
  //
  // El onUpdate de la TIMELINE corre despues de todos sus hijos, que es la garantia que hace falta.
  // `main.js` avanza con `tl.time(t, false)` —sin suprimir eventos—, asi que dispara. Y hay que
  // llamarlo a mano una vez, porque GSAP no dispara onUpdate en el instante cero.
  const animar = () => {
    const t = tl.time()
    for (const f of faroles) {
      // Pendulo puro: un seno sobre la rotacion en z, con el origen del grupo en el nudo. Los tres
      // periodos NO son multiplos entre si — si lo fueran, volverian a alinearse cada tanto y los tres
      // faroles se leerian como una sola pieza rigida, que se nota mucho mas que la quietud.
      f.pend.rotation.z = Math.sin(t * f.w + f.fase) * f.amp
      // El segundo eje va mas lento y a un tercio de amplitud: un pendulo en un solo plano se lee como
      // un limpiaparabrisas.
      f.pend.rotation.x = Math.sin(t * f.w * 0.57 + f.fase * 1.6) * f.amp * 0.34

      // EL TITILEO NO ES RUIDO SEMBRADO: son dos senos rapidos de periodos distintos. Con ruido de
      // verdad la lampara chisporrotea y se lee como un contacto flojo; con dos senos respira, que es
      // lo que hace una llama detras de un papel.
      f.uBri.value = 1 + (Math.sin(t * 7.1 + f.fase) * 0.045 + Math.sin(t * 11.7 + f.fase * 2.1) * 0.03) * f.enc.v
      f.uEnc.value = f.enc.v
      f.halo.material.uniforms.uF.value = f.enc.v * (CLARO ? 0.20 : 0.34)
    }
    // El charco toma su fuerza del farol grande: es SU luz cayendo, no una lampara de piso.
    charco.material.uniforms.uF.value = faroles[0].enc.v * (CLARO ? 0.14 : 0.26)

    for (const c of chispas) {
      const u = (t - c.nace) / c.vida
      // LA POSICION SE ESCRIBE SIEMPRE, TAMBIEN CUANDO LA CHISPA ESTA APAGADA, y esto lo caza la
      // compuerta de determinismo antes que ningun ojo. La primera version salteaba la escritura con un
      // `continue` cuando la brasa todavia no habia nacido o ya se habia apagado — parecia gratis,
      // porque una malla con opacidad cero no se ve. Lo que quedaba era una posicion HEREDADA del
      // ultimo cuadro en que si se habia escrito, o sea un estado que depende de POR DONDE PASO la
      // aguja y no de donde esta. En el render cuadro a cuadro no se nota nunca; se nota cuando un
      // editor arrastra la aguja hacia atras, que es justo el caso que este motor promete sostener.
      // Con `uc` acotado, la posicion es una funcion pura del tiempo y saltar en frio da lo mismo.
      const uc = Math.min(1, Math.max(0, u))
      // Sube frenando —una brasa pierde empuje— y se apaga con una campana, asi que nace y muere en
      // cero y nunca hay un salto de opacidad que se lea como un parpadeo.
      c.m.position.set(c.x + Math.sin(t * c.w + c.fase) * c.bamboleo,
                       c.y0 + c.alza * Math.pow(uc, 0.72), c.z)
      c.m.material.opacity = u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) * 0.92 * faroles[0].enc.v
    }

    // La sarta entera deriva un pelo de lado. Es lo que impide que el cuadro quede clavado en los
    // instantes en que los tres pendulos pasan a la vez por su punto muerto.
    gAire.position.x = Math.sin(t * 0.31 + fases[3]) * mundoW * 0.012
  }
  tl.eventCallback('onUpdate', animar)
  animar()

  // ---------------------------------------------------------------- camara
  // Se acerca mientras se encienden y VUELVE a su marca antes del corte: la escena siguiente arranca
  // contando con (0, 0, distBase). El acercamiento es lo que separa a los tres faroles entre si — sin
  // paralaje, tres discos de luz a tres profundidades son tres discos pegados al fondo.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.70) },
    { z: dolly(distBase, -0.55), duration: DUR * 0.82, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // ---------------------------------------------------------------- salida
  // Se apagan de a uno y los levantan. Apagarse solo dejaria un cuadro negro con tres bultos; subir
  // solo dejaria tres lamparas prendidas saliendo por el techo. Las dos cosas juntas son lo que hace
  // un patio cuando cierra, y le dan al corte siguiente un cuadro ya vacio.
  const SAL = DUR - b(0.9)
  faroles.forEach((f, k) => {
    tl.to(f.enc, { v: 0, duration: b(0.5), ease: E.acelera(2) }, SAL + k * b(0.09))
  })
  tl.to(gSarta.position, { y: mundoH * 0.5, duration: b(0.85), ease: E.acelera(3) }, SAL)

  return { g, tl }
}
