// ANTHEM · 02 TORO — 6 beats (2.90 s). El beat en el que la pieza declara que hay un ESPACIO.
//
// POR QUE ESTA ESCENA EXISTE
// Todo lo anterior podria haberse hecho en canvas 2D. Acá no: hay un cuerpo con geometria real, con
// masa oscura y cantos encendidos, y una CAMARA que lo rodea. El paralaje entre el toro, los aros que
// tumban a otra velocidad y el polvo del fondo es la unica prueba honesta de que esto es 3D — y es
// justo lo que separa una plantilla animada de una pieza de After Effects.
//
// COMO ESTA ARMADO EL TIEMPO (124 BPM)
//   0.00 – 0.80  el cuerpo llega desde z=-9 escalando de 0 con back.out; aros y nodos con stagger;
//                el polvo entra por delays propios (stagger REAL, dentro del shader).
//   0.00 – 5.92  nada descansa: cuerpo, aros y nucleo interno giran en ejes distintos y a
//                velocidades NO multiplos (3.35 / 1.31 = 2.557), asi el tumbo no se vuelve periodico.
//   0.00 – 5.70  la camara describe un arco lateral + un descenso, siempre apuntando al objeto, y
//                vuelve EXACTA a (0,0,distBase) porque el arco es un polinomio que vale 0 en los dos
//                extremos. El target sube al objeto al principio y baja cuando entra la tipografia:
//                el encuadre se reacomoda solo, como cuando un operador "encuentra" la composicion.
//   1.00 · 2.00 · 3.00 · 3.50 · 4.00   EL PULSO: en cada corte de beat un aro SALTA de plano con un
//                golpe de escala y la pauta salta de posicion. El de 3.50 es el acelerando que
//                anuncia la salida. Ver "LA DENSIDAD" mas abajo.
//   1.50 – 3.04  el tercio inferior se revela POR MASCARA, una palabra por CONTRATIEMPO, con overshoot
//                y rotacion en x; el filete crece debajo y despues lo recorre un escaner.
//   4.28 – 5.20  las palabras se apagan UNA POR UNA, de derecha a izquierda.
//   4.35 – 5.92  el cuerpo se va hacia arriba con power3.in, el polvo se dispersa desde el shader y
//                quedan dos ondas de choque abriendose. La camara ya volvio a su marca.
//
// LA DENSIDAD — por que la escena se reescribio en el tiempo y no en el espacio
// Medido contra la pieza hecha a mano: el motor mueve 0.118 de pixeles contra 0.226, y corta 44 veces
// por minuto contra 55. Esta era de las escenas mas quietas de la pieza: tenia CUATRO eventos duros en
// seis beats —el objeto que llega, la tipografia que llega, el escaner, la salida— y los cuatro caian
// en las fronteras. En el medio habia movimiento continuo precioso y ni un solo corte.
//
// El arreglo no agrega elementos ni cambia la composicion: le pone EVENTOS a lo que ya estaba. Las
// cuatro palabras entraban juntas (55 ms de stagger es un solo golpe para el ojo) y se quedaban tres
// beats; ahora entran de a una y salen de a una. Los aros giraban parejo; ahora saltan de plano en
// cada beat. Y una pauta de acento marca el compas en el hueco que deja el kicker a su derecha, que
// era la unica banda muerta que el cuadro tiene DE VERDAD (ver la nota de la pauta: la primera version
// la puso en el borde de abajo, donde no hay cuadro, y no se veia ninguno de sus seis eventos).
//
// El numero que decidio cada ajuste no fue la cuenta de eventos sino el HUECO MAYOR: el tramo mas
// largo en el que no pasaba nada duro. Era de 1.24 beats —entre el escaner y la salida, mas de medio
// segundo de espera— y quedo en 0.41. La cuenta, de paso, va de ocho momentos discretos a diecisiete,
// y la composicion no cambio: es la misma escena, con el tiempo lleno.
//
// EL TELON
// Una escena que orbita la camara descubre el BORDE del fondo vivo (su plano mide 2.6x el cuadro y a
// 20 grados el frustum se le escapa). El telon es un plano gigante a la MISMA z que el fondo que
// reproduce su degrade en coordenadas de mundo: la union cae en el mismo punto del espacio, asi que
// no hay costura. Se resuelve acá adentro para no tocar el kit.

import { E, LOOK, b, texto, materialMascara, filete, matAcento, matTarjeta, hex, nivel, dolly, orbita } from '../kit.js'
// El COPY sale de los DATOS. Lo que queda escrito aca es CHROME de la pieza (rotulos de
// capitulo, indicadores tecnicos): eso es direccion de arte y no cambia con el contenido.
// Lo que la marca DICE — su nombre, sus cifras, su claim, su CTA — sale de los datos o NO SALE.
import { D, marca, sello } from '../datos.js'

export const meta = { id: 'toro', beats: 6 }

const ALTO_OBJ = 0.95          // el cuerpo vive arriba del centro: el tercio inferior es de la tipografia
const U_FIN = 5.7              // beats que dura el recorrido de camara (termina antes que la escena)

// PRESUPUESTO DE LUZ — el numero mas importante de esta escena.
// UnrealBloomPass no atenua: su filtro de paso alto es un smoothstep de ancho 0.01 sobre el umbral
// 0.62. O un pixel queda por debajo y no florece NADA, o lo pasa y entra ENTERO al bloom. No hay
// termino medio. La primera version tenia la tipografia en blanco (luminancia 0.95) y un titular de
// 90% del cuadro se convertia en cuatro lingotes blancos sin contraformas — ilegible.
//
// Asi que el reparto es explicito: la TIPOGRAFIA vive por debajo del umbral y sale con filo de
// navaja; los ACENTOS viven apenas por encima y son los unicos que florecen. Eso es tambien lo que
// hace un colorista: la luz la dan los graficos, no el texto.
// Dos escalones de jerarquia sobre la escala fondo->tinta. Estaban fijos en '#8c95ab' y '#7d879e',
// que son las luminancias correctas SOBRE NEGRO y dos fantasmas sobre blanco.
const TIPO_ALTA = () => nivel(0.56)
const TIPO_BAJA = () => nivel(0.50)
// Y los multiplicadores de acento se quedan cerca de 1.2: por encima de ~2 el nucleo satura a blanco
// y el color queda solo en el halo — un tubo de neon blanco en vez de una linea del color de la marca.

// smoothstep saturado. Vale EXACTAMENTE 0 y 1 en los extremos: de eso depende que la camara
// vuelva a su marca sin residuo de coma flotante.
const sat = x => (x < 0 ? 0 : x > 1 ? 1 : x)
const sm = x => { const y = sat(x); return y * y * (3 - 2 * y) }

export function build(ctx) {
  const { THREE, gsap, mundoW, camera, distBase, rnd, fondo, pelicula, bloom } = ctx
  // EL BLOOM ES DEL AIRE Y HAY QUE DEVOLVERLO. Es estado COMPARTIDO por toda la pieza: una escena que
  // lo mueve y lo deja movido se lo cambia a todas las que siguen. Esta escena lo subia y despues
  // "restauraba" a un literal —el valor de ANTHEM—, asi que diez de los once aires terminaban la pieza
  // con la floracion del aire tecnico. Un aire editorial declara 0.14 y seguia en 0.85: seis veces mas.
  // Todo va RELATIVO a lo que puso el aire, para que el gesto valga igual en los once.
  const oBloom = (bloom && bloom.strength) || 0.85


  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })

  // ------------------------------------------------------------------ telon (ver nota de arriba)
  const telon = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        uA: { value: hex(LOOK.bg) }, uB: { value: hex(LOOK.bg2) },
        uEsc: { value: new THREE.Vector2(80 / (mundoW * 2.6), 80 / (10 * 2.6)) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 uA, uB; uniform vec2 uEsc; varying vec2 vUv;
        void main(){
          vec2 w = (vUv - 0.5) * uEsc + 0.5;          // mismas coordenadas que el fondo vivo
          float d = distance(w, vec2(0.5, 0.58));
          gl_FragColor = vec4(mix(uA, uB, smoothstep(0.95, 0.05, d)), 1.0);
        }`,
    })
  )
  telon.position.z = -14.05
  telon.renderOrder = -200
  g.add(telon)

  // ------------------------------------------------------------------ el cuerpo
  // Masa oscura + filo encendido. El toro tiene 4 segmentos radiales: la seccion es un CUADRADO, asi
  // que hay aristas duras de verdad y el bloom tiene de donde agarrarse. Un tubo redondo se lee blando.
  const nucleo = new THREE.Group()
  nucleo.position.set(0, ALTO_OBJ, 0)
  g.add(nucleo)

  const cuerpo = new THREE.Group()
  nucleo.add(cuerpo)

  // 18 segmentos tubulares y no 28: a 28 el contorno ya es un circulo y la pieza deja de leerse como
  // CONSTRUIDA. Con 18 se ven las facetas, que es de lo que trata la escena.
  const R = 1.34, TUBO = 0.32
  const geoToro = new THREE.TorusGeometry(R, TUBO, 4, 18)
  const toro = new THREE.Mesh(geoToro, matTarjeta('#1c2244'))
  cuerpo.add(toro)

  const matCantos = new THREE.LineBasicMaterial({
    color: hex(LOOK.acento).multiplyScalar(1.5), toneMapped: false, transparent: true, opacity: 0.9,
  })
  cuerpo.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoToro, 18), matCantos))

  // Dos aros finos pegados al ecuador exterior e interior: geometria real de 2-3 px que el bloom
  // convierte en luz. Las lineas de 1 px solas no alcanzan a florecer.
  cuerpo.add(new THREE.Mesh(new THREE.TorusGeometry(R + TUBO, 0.022, 3, 120), matAcento(LOOK.acento2, 1.15)))
  cuerpo.add(new THREE.Mesh(new THREE.TorusGeometry(R - TUBO, 0.018, 3, 100), matAcento(LOOK.acento, 1.35)))

  // Nodos calidos sobre la circunferencia: el tercer color, en dosis chicas, para que el cuadro no
  // sea bicromo.
  const nodos = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const n = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), matAcento(LOOK.calido, 1.5))
    n.position.set(Math.cos(a) * (R + TUBO + 0.13), Math.sin(a) * (R + TUBO + 0.13), 0)
    n.scale.setScalar(0)
    cuerpo.add(n)
    nodos.push(n)
  }

  // Nucleo interno, visible por el agujero del toro. Gira mucho mas rapido: da lectura de mecanismo.
  const interno = new THREE.Group()
  const geoIco = new THREE.IcosahedronGeometry(0.44, 0)
  interno.add(new THREE.Mesh(geoIco, matTarjeta('#2a3160')))
  interno.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoIco, 1),
    new THREE.LineBasicMaterial({ color: hex(LOOK.acento2).multiplyScalar(1.2), toneMapped: false })))
  cuerpo.add(interno)

  // Dos aros que tumban por fuera, hijos de nucleo y no de cuerpo: asi llevan su propio eje y su
  // propia velocidad y el conjunto nunca se lee como una sola pieza rigida.
  const aroA = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.026, 3, 140), matAcento(LOOK.acento, 1.4))
  aroA.rotation.set(1.15, 0, 0.42)
  const aroB = new THREE.Mesh(new THREE.TorusGeometry(2.34, 0.019, 3, 160), matAcento(LOOK.acento2, 1.1))
  aroB.rotation.set(-0.72, 0, -0.55)
  aroA.scale.setScalar(0); aroB.scale.setScalar(0)
  nucleo.add(aroA, aroB)

  // ------------------------------------------------------------------ polvo (320 puntos)
  // El stagger de entrada esta DENTRO del shader: cada punto tiene su propio retardo, asi que 320
  // elementos llegan escalonados con un solo tween. Y la dispersion final es un uniform, no 320 tweens.
  const N = 320
  const pos = new Float32Array(N * 3), del = new Float32Array(N), tam = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2
    let r, y
    if (rnd() < 0.62) {                                   // disco: da el plano del espacio
      r = 2.6 + Math.pow(rnd(), 0.55) * 2.9
      y = (rnd() - 0.5) * 1.3
    } else {                                              // cascara: da el volumen
      const u = rnd() * 2 - 1, rr = 2.8 + rnd() * 2.6
      r = rr * Math.sqrt(1 - u * u); y = rr * u * 0.8
    }
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r
    del[i] = rnd() * 0.72
    tam[i] = 0.35 + rnd() * rnd() * 1.5
  }
  const geoPolvo = new THREE.BufferGeometry()
  geoPolvo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geoPolvo.setAttribute('aDelay', new THREE.BufferAttribute(del, 1))
  geoPolvo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1))

  const matPolvo = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      // uProg arranca en 0.22 y no en 0: si no, el PRIMER cuadro de la escena esta vacio y el corte
      // cae sobre negro. Que ya haya polvo cuando el objeto todavia no llego es exactamente lo que
      // hace que el objeto "entre" en un espacio en vez de aparecer en la nada.
      uProg: { value: 0.22 }, uDisp: { value: 0 }, uEsc: { value: 1 }, uOp: { value: 1 },
      uC1: { value: hex(LOOK.acento).multiplyScalar(1.25) },
      uC2: { value: hex(LOOK.acento2).multiplyScalar(1.1) },
    },
    vertexShader: `
      attribute float aDelay; attribute float aTam;
      uniform float uProg, uDisp, uEsc;
      varying float vE, vT;
      void main(){
        float e = clamp((uProg - aDelay) / 0.30, 0.0, 1.0);
        e = e * e * (3.0 - 2.0 * e);
        vE = e; vT = aTam;
        vec3 p = position * (1.0 + uDisp * (0.4 + aTam));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aTam * uEsc * (240.0 / max(1.0, -mv.z)) * mix(0.25, 1.0, e);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uC1, uC2; uniform float uOp;
      varying float vE, vT;
      void main(){
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.04, d) * vE * uOp;
        if (a < 0.004) discard;
        gl_FragColor = vec4(mix(uC1, uC2, step(1.25, vT)) * (0.6 + vT * 0.5), a);
      }`,
  })
  const polvo = new THREE.Points(geoPolvo, matPolvo)
  polvo.position.set(0, ALTO_OBJ, 0)
  polvo.rotation.x = 0.22
  g.add(polvo)

  // ------------------------------------------------------------------ HUD: cuatro escuadras
  // Encuadran al objeto mientras es el unico protagonista y se retiran cuando entra la tipografia.
  // Un elemento que se va a tiempo vale mas que uno que se queda ocupando lugar.
  const matHUD = new THREE.MeshBasicMaterial({
    color: hex(LOOK.acento2).multiplyScalar(1.1), toneMapped: false, transparent: true, opacity: 0,
  })
  const escuadras = []
  const EX = 2.48, EY = 2.62, LB = 0.44, GB = 0.022
  const esquinas = [[-EX, EY, 0], [EX, EY, -Math.PI / 2], [EX, -EY, Math.PI], [-EX, -EY, Math.PI / 2]]
  for (const [x, y, rz] of esquinas) {
    const e = new THREE.Group()
    const h = new THREE.Mesh(new THREE.PlaneGeometry(LB, GB), matHUD); h.position.x = LB / 2
    const v = new THREE.Mesh(new THREE.PlaneGeometry(GB, LB), matHUD); v.position.y = -LB / 2
    e.add(h, v)
    e.position.set(x, ALTO_OBJ + y, 0.8)
    e.rotation.z = rz
    e.scale.setScalar(0)
    g.add(e)
    escuadras.push(e)
  }

  // ------------------------------------------------------------------ tipografia (tercio inferior)
  const tipo = new THREE.Group()
  tipo.position.z = 0.6
  g.add(tipo)

  // Un plano dimensionado por ANCHO: el ancho es lo que no puede desbordar el cuadro, el alto sale de
  // las metricas reales de la fuente. Al reves se descubre el desborde recien en el video.
  //
  // `materialMascara` sin color deja el uniform uTinte en null y WebGLUniforms.setValueV3f revienta
  // al subirlo (lee .x de null) — aunque el shader no lo use porque uUsaTinte vale 0. Se le pone un
  // color valido acá: no cambia un pixel y evita tocar el kit.
  const lineaMasc = (str, ancho, opts, dir, suave) => {
    const T = texto(str, opts)
    const mat = materialMascara(T.tex)
    if (!mat.uniforms.uTinte.value) mat.uniforms.uTinte.value = hex(LOOK.tinta)
    mat.uniforms.uDir.value = dir
    mat.uniforms.uSuave.value = suave
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho / T.ar), mat)
    m.userData.alto = ancho / T.ar
    return m
  }

  const ANCHO = mundoW * 0.86
  const X0 = -ANCHO / 2
  const Y_KICK = -1.94, Y_PAL = -2.62, Y_FIL = -3.06, Y_SUB = -3.48

  // -- titular partido en palabras: cuatro masas que llegan escalonadas se leen como intencion; una
  //    sola imagen que aparece se lee como un slide.
  // `filete()` del kit nace con matAcento(color, 3.2): a 3.2 el nucleo satura a blanco y la linea
  // pierde el color de la marca. Se atenua acá, que es donde se decide el balance de luz de la escena.
  const fileteSuave = (largo, grosor, color, k) => {
    const f = filete(largo, grosor, color)
    f.material.color.copy(hex(color)).multiplyScalar(k)
    return f
  }

  // Las cuatro palabras que cruzan el cuadro DECIAN 'CADA OBJETO ES REAL': una frase sobre el metodo
  // del motor, en castellano, en el video de cualquier marca del mundo. Salen del bloque destacado de
  // la propia pagina, que es el titular corto que la escena siempre necesito. Si la pagina no dio
  // ninguno se usa el golpe, y si tampoco hay golpe la escena se compone sin palabras: el toro y la
  // estructura ya sostienen el cuadro.
  const frasePal = String((D.bloque && D.bloque.titulo) || D.golpe || '').replace(/\s+/g, ' ').trim()
  const PAL = frasePal ? frasePal.split(/\s+/).slice(0, 4) : []
  const optPal = { fuente: 'Anton', size: 200, tracking: 0.006, color: TIPO_ALTA() }
  const ars = PAL.map(p => texto(p, optPal).ar)
  const sumaAr = ars.reduce((a, v) => a + v, 0)
  const ALTO_PAL = ANCHO / sumaAr
  const palabras = []
  let cur = X0
  PAL.forEach((p, i) => {
    const w = ALTO_PAL * ars[i]
    const m = lineaMasc(p, w, optPal, 2, 0.05)
    m.position.set(cur + w / 2, Y_PAL, 0)
    tipo.add(m)
    palabras.push(m)
    cur += w
  })
  const uProgPal = palabras.map(m => m.material.uniforms.uProg)

  // -- kicker + marca de tick
  const kick = lineaMasc(marca(2, 6), mundoW * 0.34,
    { fuente: 'DMSans', size: 120, tracking: 0.2, alineado: 'left', color: TIPO_BAJA() }, 0, 0.14)
  kick.position.set(X0 + mundoW * 0.17 + 0.06, Y_KICK, 0)
  tipo.add(kick)

  const tick = fileteSuave(0.03, 0.19, LOOK.acento2, 1.3)
  tick.position.set(X0 + 0.015, Y_KICK, 0)
  tick.scale.y = 0
  tipo.add(tick)

  // -- filete que subraya y CRECE con la linea (envuelto para que el pivote quede a la izquierda)
  const fileteWrap = new THREE.Group()
  const fil = fileteSuave(ANCHO, 0.026, LOOK.acento, 1.45)
  fil.position.x = ANCHO / 2
  fileteWrap.add(fil)
  fileteWrap.position.set(X0, Y_FIL, 0)
  fileteWrap.scale.x = 0
  tipo.add(fileteWrap)

  // -- escaner: un segmento corto que recorre el filete. Un beat y medio en el que, si no, nada
  //    se movia en el tercio inferior.
  const escaner = fileteSuave(0.5, 0.05, LOOK.acento2, 1.3)
  escaner.material.transparent = true
  escaner.material.opacity = 0
  escaner.position.set(X0, Y_FIL, 0.02)
  tipo.add(escaner)

  // -- bajada
  const sub = lineaMasc((D.bloque ? D.bloque.bajada : ''), mundoW * 0.68,
    { fuente: 'DMSans', size: 120, tracking: 0.16, alineado: 'left', color: TIPO_BAJA() }, 2, 0.12)
  sub.position.set(X0 + mundoW * 0.34, Y_SUB, 0)
  tipo.add(sub)

  // -- lectura tecnica arriba a la derecha: el cuadro esta lleno tambien donde no hay protagonista
  // Decia 'R 1.34 · SEG 18 · MALLA VIVA': jerga interna disfrazada de lectura tecnica. El dominio real
  // llena el mismo hueco con el mismo peso visual.
  const lectura = lineaMasc(sello(0), mundoW * 0.5,
    { fuente: 'DMSans', size: 110, tracking: 0.18, alineado: 'left', color: TIPO_BAJA() }, 0, 0.12)
  lectura.position.set(2.6 - mundoW * 0.25, 3.55, 0.6)
  g.add(lectura)

  // ------------------------------------------------------------------ la pauta del renglon del kicker
  // El evento mas barato que existe. Un filete de acento que SALTA a otra posicion en cada corte de
  // beat: no se desplaza —un desplazamiento suave no es un evento, es movimiento continuo— sino que
  // reaparece en otro lado, que es lo unico que el ojo registra como corte. Es el metronomo visible de
  // la escena.
  //
  // ESTABA EN EL BORDE DE ABAJO, EN y=-4.40, Y NO SE VEIA NUNCA. Medido proyectando su caja a NDC
  // cuadro por cuadro: quedaba FUERA del cuadro desde el beat 0.25 hasta el 4.25, y recien entraba en
  // 4.50 — que es justo cuando se le manda encoger. O sea que sus seis eventos (la entrada y los cinco
  // saltos) pasaban todos abajo del borde y el unico cuadro en que se la veia era el de su propia
  // desaparicion.
  //
  // El error fue medir contra el cuadro EN REPOSO, que llega a y=-5. Esta es la unica escena de la
  // pieza que orbita Y reapunta la camara: con el target en 0.92 al principio y en 0.15 despues, mas
  // el dolly que acerca un 8.5%, el piso real del cuadro nunca baja de y=-3.53. Debajo de la bajada no
  // habia una banda muerta — no habia cuadro. Y arriba tampoco sirve: los aros barren hasta y=4.59.
  //
  // El hueco de verdad esta en el RENGLON DEL KICKER. `kick` es una linea corta alineada a la
  // izquierda: ocupa de x=-2.36 a x=-0.45 y deja casi tres unidades libres a su derecha durante toda
  // la escena. Ahi la pauta esta siempre dentro del cuadro, se apoya en una linea de base que YA
  // EXISTE —asi se lee como parte de la reticula y no como una barra suelta— y el hueco no depende de
  // cuanto escribio la pagina, porque el ancho de `kick` es fijo por construccion. Eso ultimo era el
  // otro problema de la posicion vieja: se la habia bajado a -4.40 para esquivar a `sub`, que se
  // dimensiona por ANCHO y por lo tanto crece hacia abajo cuando la bajada es corta (con dos
  // caracteres su caja llega a -5.25). Aca arriba `sub` no llega nunca.
  //
  // Vive en `g` y no en `tipo` a proposito: es chrome del cuadro, no parte del bloque tipografico, asi
  // que cuando el bloque baja en la salida la pauta se queda un par de decimas antes de encogerse.
  //
  // [beat, x] — el primero es donde nace, los demas son los saltos. Las x son fracciones del ancho de
  // mundo y viven entre 0.02 y 0.36: con el filete midiendo 0.15 de ancho, 0.36 deja su borde derecho
  // en 2.45 contra un limite seguro de 2.52, y 0.02 deja el izquierdo en -0.31, despejado del kicker.
  // Va y viene en vez de avanzar en fila, porque una fila ordenada se lee como un deslizamiento lento
  // y no como saltos; el salto mas corto mide 0.96 de unidad, algo mas que el ancho del propio filete,
  // que es el minimo para que se lea como reemplazo y no como temblor.
  const PAUTA = [[0, 0.05], [1, 0.30], [2, 0.11], [3, 0.36], [3.5, 0.15], [4, 0.32]]
  const pauta = fileteSuave(mundoW * 0.15, 0.032, LOOK.acento2, 1.25)
  pauta.position.set(PAUTA[0][1] * mundoW, Y_KICK, 0.6)
  pauta.scale.x = 0.0001
  g.add(pauta)

  // ------------------------------------------------------------------ ondas de salida
  const ondas = []
  for (let i = 0; i < 2; i++) {
    const o = new THREE.Mesh(new THREE.TorusGeometry(1, 0.014, 3, 120),
      new THREE.MeshBasicMaterial({
        color: hex(i ? LOOK.acento2 : LOOK.acento).multiplyScalar(3.0),
        toneMapped: false, transparent: true, opacity: 0,
      }))
    o.position.set(0, ALTO_OBJ, 0)
    o.scale.setScalar(0.6)
    g.add(o)
    ondas.push(o)
  }

  // ================================================================== CAMARA + TRATAMIENTO
  // TODO lo que vive FUERA de mi grupo — camara, bloom, fondo, pase de pelicula — se escribe desde
  // aca y solo desde aca. Dos razones:
  //
  //   1. Un solo tween lineal mueve u de 0 a 1 y de ahi salen ang/alt/dist/target por funciones
  //      analiticas. Con varios tweens sobre el mismo proxy el orden de render decide cual gana y la
  //      camara salta un frame; con uno solo el recorrido no tiene junta.
  //   2. Una timeline hija con un .set() en la posicion 0 lo dispara cuando la maestra se rebobina —
  //      es decir, MIENTRAS CORRE OTRA ESCENA. Escribir bajo la guarda `0 < u < 1` es la unica forma
  //      de tocar recursos compartidos sin ensuciar a los vecinos. Y todas las funciones aterrizan en
  //      el valor por defecto cuando u -> 1, asi que la escena siguiente hereda el estado limpio.
  const cam = { u: 0 }
  const mira = new THREE.Vector3()

  // golpe con decaimiento: 1 en t0, 0 en t0+dur. Es el "set + power2.out" de siempre, en forma cerrada.
  const golpe = (t, t0, dur) => { const x = (t - t0) / dur; return x < 0 || x > 1 ? 0 : (1 - x) * (1 - x) }

  function aplicar() {
    const u = cam.u
    if (u <= 0) return                       // antes de mi ventana no soy dueño de nada
    if (u >= 1) {                            // marca de salida, exacta y sin residuo
      camera.position.set(0, 0, distBase)
      camera.rotation.set(0, 0, 0)
      // El bloom se devuelve ACA, en la misma marca de salida que la camara y por la misma razon. Sin
      // esto la escena terminaba dejandolo en su ultimo valor y se lo llevaba puesto la que seguia.
      if (bloom) bloom.strength = oBloom
      return
    }
    const y = sm(u)
    const arco = 4 * y * (1 - y)             // 0 en los dos extremos, 1 en el medio — por eso vuelve
    // La AMPLITUD de la orbita la pone el aire: arco lateral y altura por `orbita`, acercamiento por
    // `dolly`. La forma de la curva no se toca —sigue valiendo 0 en los dos extremos, que es lo que
    // hace que la camara vuelva sola— asi que escalarla no puede romper el contrato de devolucion.
    const ang = orbita(0.36) * arco          // arco lateral
    const alt = orbita(5.47) * arco * (0.5 - y)   // sube, cruza el ecuador y desciende
    const dist = dolly(distBase, distBase * -0.085 * arco)

    // El punto al que mira sube al objeto en la entrada y baja cuando llega la tipografia: el
    // encuadre se reacomoda solo en vez de quedar decidido de antemano.
    const sube = sm(u / 0.055)
    const baja = sm((u - 0.12) / 0.17)
    const cierra = sm((u - 0.84) / 0.16)
    const ty = (0.92 * sube * (1 - baja) + 0.15 * baja) * (1 - cierra)

    camera.position.set(Math.sin(ang) * dist, alt, Math.cos(ang) * dist)
    mira.set(0, ty, 0)
    camera.lookAt(mira)

    const tb = u * U_FIN                     // tiempo de escena, en BEATS

    if (bloom) {
      bloom.strength = oBloom * (1 + 0.765 * (1 - sm(tb / 0.80)) + 0.647 * golpe(tb, 4.50, 1.10))
    }
    if (fondo) {
      fondo.uPulso.value = 0.60 * golpe(tb, 0.00, 0.85) + 0.26 * golpe(tb, 1.50, 0.50)
        + 0.70 * golpe(tb, 4.50, 0.95) + 0.30 * golpe(tb, 5.00, 0.55)
      // la grilla sube al llegar el objeto, se retira bajo la tipografia y vuelve a subir al vaciarse
      // el cuadro; el ultimo tramo la deja en 0.55, que es su valor de fabrica.
      fondo.uGrilla.value = 0.55
        + 0.33 * sm(tb / 0.35)
        - 0.33 * sm((tb - 0.55) / 0.85)
        - 0.13 * sm((tb - 1.40) / 0.90)
        + 0.58 * sm((tb - 4.50) / 0.50)
        - 0.45 * sm((tb - 5.05) / 0.65)
    }
    // El flash SOLO se escribe en su ventana: main.js pone su propio flash sobre cada corte y pisarlo
    // con un 0 le comeria la mitad.
    if (pelicula && tb >= 4.50 && tb <= 4.80) pelicula.uFlash.value = 0.45 * golpe(tb, 4.50, 0.16)
  }

  tl.to(cam, { u: 1, duration: b(U_FIN), ease: 'none', onUpdate: aplicar }, 0)

  // ================================================================== ENTRADA · beat 0 – 0.8
  nucleo.scale.setScalar(0)
  nucleo.position.z = -9
  tl.to(nucleo.scale, { x: 1, y: 1, z: 1, duration: b(0.75), ease: E.llega(1.85) }, 0)
  tl.to(nucleo.position, { z: 0, duration: b(0.85), ease: E.frena(3) }, 0)

  tl.to(aroA.scale, { x: 1, y: 1, z: 1, duration: b(0.8), ease: E.llega(2.4) }, b(0.16))
  tl.to(aroB.scale, { x: 1, y: 1, z: 1, duration: b(0.8), ease: E.llega(2.4) }, b(0.28))
  tl.to(nodos.map(n => n.scale), { x: 1, y: 1, z: 1, duration: b(0.55), ease: E.llega(2.8), stagger: 0.045 }, b(0.24))

  tl.to(matPolvo.uniforms.uProg, { value: 1.35, duration: b(1.4), ease: E.frena(2) }, b(0.12))

  tl.to(escuadras.map(e => e.scale), { x: 1, y: 1, z: 1, duration: b(0.6), ease: E.llega(2.2), stagger: 0.06 }, b(0.3))
  tl.to(matHUD, { opacity: 1, duration: b(0.4), ease: E.frena(2) }, b(0.3))

  // ================================================================== GIRO CONTINUO · toda la escena
  // Nada descansa: estos tweens no paran nunca. Las velocidades no son multiplos entre si (3.35/1.31)
  // para que el tumbo no cierre ciclo y no se lea barato.
  cuerpo.rotation.set(0.20, -0.60, 0)
  tl.to(cuerpo.rotation, { y: 2.75, duration: b(5.92), ease: 'none' }, 0)
  tl.to(cuerpo.rotation, { x: -1.11, duration: b(5.92), ease: 'none' }, 0)
  tl.to(interno.rotation, { y: -5.1, x: 3.3, duration: b(5.92), ease: 'none' }, 0)
  tl.to(aroA.rotation, { y: 3.9, duration: b(5.92), ease: 'none' }, 0)
  tl.to(aroB.rotation, { y: -2.35, z: 0.9, duration: b(5.92), ease: 'none' }, 0)
  tl.to(polvo.rotation, { y: 0.62, duration: b(5.92), ease: 'none' }, 0)

  // Respiracion del polvo y latido de los nodos sobre medios beats: el ritmo se siente aunque no
  // haya un corte.
  tl.to(matPolvo.uniforms.uEsc, { value: 1.18, duration: b(1.5), ease: E.vaiven() }, b(1.0))
  tl.to(matPolvo.uniforms.uEsc, { value: 1.0, duration: b(1.5), ease: E.vaiven() }, b(2.5))
  for (const t0 of [3.0, 3.5, 4.0]) {
    tl.to(nodos.map(n => n.scale), { x: 1.55, y: 1.55, z: 1.55, duration: b(0.14), ease: E.frena(2), stagger: 0.022 }, b(t0))
    tl.to(nodos.map(n => n.scale), { x: 1, y: 1, z: 1, duration: b(0.36), ease: E.frena(2), stagger: 0.022 }, b(t0) + b(0.14))
  }

  // ================================================================== EL PULSO · un corte por beat
  // Un objeto que gira parejo no corta nunca, por rapido que gire: el ojo lo integra y lo lee como una
  // sola cosa continua. Lo que corta es que el DIBUJO del cuadro cambie de golpe. Asi que en cada beat
  // uno de los aros salta de plano en b(0.10) —tres centesimas, cuadro y medio de video— con un golpe
  // de escala encima. Sin el golpe de escala el salto se lee como un error de reproduccion; con el se
  // lee como acento, que es la diferencia entre un glitch y un corte.
  //
  // OJO CON EL EJE. Se saltan ejes que NO estan tumbando: aroA.z y aroB.x. aroA.y, aroB.y y aroB.z
  // tienen un tween de 5.92 beats corriendo encima, y un salto sobre esos lo pisa el tween largo en el
  // frame siguiente — el salto no pasa, sin error y sin aviso.
  // Los tres primeros caen en el beat; el cuarto se mete en el CONTRATIEMPO de 3.5 y el quinto vuelve
  // al beat 4. Medido, ahi estaba el ultimo pozo de la escena: entre 3.25 y 4.00 no pasaba nada duro,
  // tres cuartos de beat de espera justo antes de la salida. Un acelerando en la ultima vuelta es lo
  // que hace cualquier pieza montada a mano antes de cortar, y de paso empata con el latido de los
  // nodos, que ya pulsaban en 3.0 / 3.5 / 4.0.
  const SALTOS = [
    [1.0, aroA, 'z', -0.31], [2.0, aroB, 'x', 0.34], [3.0, aroA, 'z', 0.68],
    [3.5, aroB, 'x', -0.95], [4.0, aroA, 'z', -0.12],
  ]
  for (const [t0, aro, eje, val] of SALTOS) {
    tl.to(aro.rotation, { [eje]: val, duration: b(0.10), ease: E.frena(4) }, b(t0))
    tl.to(aro.scale, { x: 1.16, y: 1.16, z: 1.16, duration: b(0.10), ease: E.frena(3) }, b(t0))
    tl.to(aro.scale, { x: 1, y: 1, z: 1, duration: b(0.34), ease: E.frena(2) }, b(t0) + b(0.10))
  }

  // La pauta entra antes del primer salto y despues marca los mismos cinco tiempos desde abajo. Los
  // dos sistemas caen JUNTOS a proposito: cinco acentos grandes valen mas que diez chicos repartidos,
  // y el contratiempo entre beats ya lo llenan las palabras.
  tl.to(pauta.scale, { x: 1, duration: b(0.18), ease: E.frena(4) }, b(0.80))
  for (const [t0, x] of PAUTA.slice(1)) tl.set(pauta.position, { x: x * mundoW }, b(t0))
  tl.to(pauta.scale, { x: 0.0001, duration: b(0.22), ease: E.acelera(3) }, b(4.55))

  // ================================================================== TIPOGRAFIA · beat 1.35 – 4.35
  // Las escuadras se retiran justo antes: el cuadro cambia de estado en vez de acumular.
  tl.to(matHUD, { opacity: 0, duration: b(0.5), ease: E.acelera(2) }, b(1.35))
  tl.to(escuadras.map(e => e.scale), { x: 0.72, y: 0.72, z: 0.72, duration: b(0.6), ease: E.acelera(2), stagger: 0.04 }, b(1.35))

  tl.to(tick.scale, { y: 1, duration: b(0.3), ease: E.llega(2.6) }, b(1.35))
  tl.to(kick.material.uniforms.uProg, { value: 1, duration: b(0.55), ease: E.frena(2) }, b(1.4))

  // Las cuatro palabras ENTRABAN JUNTAS: 55 ms de stagger es un solo golpe para el ojo, no cuatro. Y
  // despues se quedaban tres beats sin hacer nada. O sea: un evento, y el bloque mas grande del cuadro
  // congelado en el medio de la escena.
  //
  // Ahora entra UNA POR CONTRATIEMPO. El paso NO es un octavo (0.5) ni un dieciseisavo (0.25) de beat
  // porque cuatro entradas parejas sobre la reticula siempre terminan pisando beats enteros: con 0.5
  // caen en 2.00 y 3.00, con 0.25 cae una en 2.00. Y pisar el beat es PERDER el evento, no sumarlo —
  // ahi ya saltan un aro y la pauta, y dos golpes en el mismo cuadro se leen como uno.
  //
  // Asi que el paso se elige por la distancia al golpe mas cercano. Estaba en 0.38 y la segunda
  // palabra caia en 1.88, a 58 ms del salto del beat 2: el ojo integra eso como un solo acento, de
  // manera que la escena decia tener dos eventos donde tenia uno. Con 0.34 las cuatro caen en
  // 1.50 · 1.84 · 2.18 · 2.52 y ninguna queda a menos de 0.16 de beat (77 ms) de un golpe.
  //
  // De paso la frase termina de armarse en 3.04 en vez de 3.22 y gana casi un quinto de beat de
  // lectura antes de empezar a irse en 4.28, que con un titular de cuatro palabras largas es lo que
  // estaba mas justo. Menos de 0.34 y las entradas vuelven a fundirse en un solo golpe.
  const PASO_PAL = 0.34
  palabras.forEach((m, i) => {
    const t0 = b(1.50 + i * PASO_PAL)
    tl.fromTo(m.position, { y: Y_PAL - 0.19 }, { y: Y_PAL, duration: b(0.52), ease: E.llega(2.4) }, t0)
    tl.fromTo(m.rotation, { x: -0.45 }, { x: 0, duration: b(0.58), ease: E.llega(1.9) }, t0)
    // La mascara se cierra en un tercio de beat. Por debajo de eso el reemplazo se lee como parpadeo;
    // por encima deja de ser un evento y pasa a ser un fundido, que es exactamente lo que no suma.
    tl.to(m.material.uniforms.uProg, { value: 1, duration: b(0.34), ease: E.frena(2) }, t0)
  })

  tl.to(fileteWrap.scale, { x: 1, duration: b(0.8), ease: E.frena(3) }, b(1.62))
  tl.to(sub.material.uniforms.uProg, { value: 1, duration: b(0.7), ease: E.frena(2) }, b(2.05))
  tl.fromTo(sub.position, { y: Y_SUB - 0.1 }, { y: Y_SUB, duration: b(0.7), ease: E.llega(1.9) }, b(2.05))

  tl.to(lectura.material.uniforms.uProg, { value: 1, duration: b(0.5), ease: E.frena(2) }, b(0.9))

  tl.to(escaner.material, { opacity: 1, duration: b(0.2) }, b(2.6))
  tl.fromTo(escaner.position, { x: X0 }, { x: -X0, duration: b(1.7), ease: 'power1.inOut' }, b(2.6))
  tl.to(escaner.material, { opacity: 0, duration: b(0.3) }, b(4.0))

  // ================================================================== SALIDA · beat 4.35 – 5.92
  // Y SE APAGAN UNA POR UNA, de derecha a izquierda. Con 40 ms de stagger las cuatro se iban en un
  // solo gesto y la escena se vaciaba de golpe; con 0.20 de beat cada palabra es su propio corte y el
  // cuadro se descompone en cuatro tiempos mientras el objeto ya se esta yendo. La ultima arranca en
  // 4.88 y termina en 5.18, comoda dentro de los 5.92 que dura la timeline.
  //
  // Se guarda por si `palabras` quedo vacio: si la pagina no dio ni bloque ni golpe no hay titular, y
  // GSAP contra una lista vacia avisa por consola y sigue — que es como se cuela un hueco en el video.
  if (uProgPal.length) {
    tl.to(uProgPal, { value: 0, duration: b(0.30), ease: E.acelera(2), stagger: { each: b(0.20), from: 'end' } }, b(4.28))
  }
  tl.to([kick.material.uniforms.uProg, sub.material.uniforms.uProg, lectura.material.uniforms.uProg],
    { value: 0, duration: b(0.45), ease: E.acelera(2), stagger: 0.05 }, b(4.28))
  tl.to(tipo.position, { y: -0.5, duration: b(1.0), ease: E.acelera(2) }, b(4.35))
  tl.to(fileteWrap.scale, { x: 0, duration: b(0.4), ease: E.acelera(3) }, b(4.5))
  tl.to(tick.scale, { y: 0, duration: b(0.25), ease: E.acelera(3) }, b(4.6))

  // El objeto acelera hacia arriba y hacia el fondo. power3.in: sale, no se desvanece.
  tl.to(nucleo.position, { y: 9.6, z: -5.2, duration: b(1.05), ease: E.acelera(3) }, b(4.5))
  tl.to(nucleo.scale, { x: 0.72, y: 0.72, z: 0.72, duration: b(1.05), ease: E.acelera(2) }, b(4.5))

  ondas.forEach((o, i) => {
    const t0 = b(4.5) + i * 0.11
    tl.set(o.material, { opacity: 0.95 }, t0)
    tl.fromTo(o.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 6.4, y: 6.4, z: 6.4, duration: b(1.2), ease: E.frena(2) }, t0)
    tl.to(o.material, { opacity: 0, duration: b(1.1), ease: 'power1.in' }, t0 + b(0.12))
  })

  tl.to(matPolvo.uniforms.uDisp, { value: 1.55, duration: b(1.4), ease: E.acelera(2) }, b(4.5))
  tl.to(matPolvo.uniforms.uOp, { value: 0, duration: b(1.1), ease: E.acelera(2) }, b(4.8))

  return { g, tl }
}
