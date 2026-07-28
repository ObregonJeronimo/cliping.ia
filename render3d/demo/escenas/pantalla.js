// ESCENA "pantalla" — la pagina del usuario A SANGRE, cortada en bandas que se van escribiendo.
//
// POR QUE EXISTE, CON LOS NUMEROS AL LADO
// Dos brechas medidas contra la pieza hecha a mano. La primera es OCUPACION DE CUADRO: 0.234 contra
// 0.317. El motor compone objetos flotando en el medio de un fondo, y un fondo no ocupa — la pieza de
// referencia llena el cuadro con MEDIO, o sea imagen, no geometria. La segunda es MOVIMIENTO: 0.118
// contra 0.226. Las dos se arreglan con la misma escena, porque la unica imagen que este motor tiene
// y que puede ocupar el cuadro ENTERO y ademas desplazarse entera es la tira scrolleable de la pagina.
//
// Y hay una tercera razon, la que la pidio: el gate de guion reporta 72 de 324 guiones cortos porque
// SE ACABO EL CATALOGO — ocho escenas no llenan 30 s a tempo alto. Eso no se arregla con mas tolerancia
// de tempo, se arregla con material nuevo.
//
// COMO SE MUEVE. El scroll NO mueve el plano: mueve el `offset` de la textura, igual que en el hero de
// telefono. Por eso recorre cuatro mil pixeles de pagina sin que la geometria se entere y sigue siendo
// scrubbeable cuadro a cuadro. Encima de eso, el plano esta cortado en siete bandas horizontales que se
// DESCUBREN POR MASCARA, una en cada medio beat: el cuadro nunca esta dos veces igual y cada aparicion
// es un evento duro, que es lo que el ojo cuenta como corte.
//
// DONDE VIVE CADA COSA, Y NO ES UN DETALLE
// Una pagina es mayormente blanca: pasada por el bloom se convierte en una mancha que se come el
// cuadro. Va en `gr`, la escena POST-BLOOM. Y como ese pase se compone ENCIMA del otro (ver _composer
// en main.js), todo lo que tiene que leerse SOBRE la pagina —el marco, el rotulo, la regleta— tambien
// tiene que vivir ahi: puesto en `g` quedaria tapado por el plano a sangre. El precio es que el marco
// de acento no florece. Un marco que no brilla se ve; un marco escondido detras de la pagina, no.
// En `g` queda lo que se ve POR LOS HUECOS mientras la pagina todavia se esta escribiendo: la cama de
// luz y el cabezal. Esos si florecen, que es justo lo que hace que un hueco se lea como luz y no como
// un agujero.

import { LOOK, b, E, texto, materialMascara, matAcento, nivel, dolly } from '../kit.js'
import { sello } from '../datos.js'

export const meta = { id: 'pantalla', beats: 6 }

const N = 7                 // bandas: impar, para que el revelado pueda abrir desde el centro
const SOLAPE = 1.004        // las bandas se pisan un pelo: si quedan al ras se ve la costura

// EL BORDE BLANDO DE LA MASCARA — Y POR QUE EL REVELADO NO TERMINA EN 1.
// `materialMascara` resuelve el alfa como smoothstep(uProg, uProg - uSuave, e). Con uProg en 1 lo
// unico que queda del todo opaco es e < 1 - uSuave: la banda se queda PARA SIEMPRE con una franja
// translucida de este ancho del lado hacia el que barrio. Medido sobre el cuadro, con el barrido
// terminado: 0.371 de alfa contra el canto y un 7.1% del ancho a medio pintar, alternando de lado
// segun la banda — un peine de tiras semitransparentes por donde se ve la cama de acento, en la unica
// escena cuya razon de ser es OCUPAR EL CUADRO. cierre.js ya se habia comido este defecto ("si no, el
// smoothstep deja una muesca en la costura") y lo tapo con un step(0.999) dentro de su propio shader;
// aca el kit no se toca, asi que el barrido se lleva un `uSuave` mas alla y el degrade sale del plano
// en vez de quedarse dentro del cuadro.
const SUAVE = 0.11
const FIN = 1 + SUAVE
// El rotulo lleva su propio borde, mucho mas corto: sobre una tipografia de 0.135 de alto un degrade
// de 0.11 se comeria la mitad de la palabra.
const SUAVE_TXT = 0.06
const FIN_TXT = 1 + SUAVE_TXT

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, spec } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)
  const MEDIO = b(0.5)
  const PASOS = meta.beats * 2                       // doce medios beats, doce eventos

  // Sin la tira no hay escena: esta escena ES la tira. El guionista no deberia haberla elegido; si
  // igual llego aca, un grupo vacio con la duracion correcta es la respuesta honesta — la pieza no se
  // descoloca y el hueco se ve, que es lo que hay que poder ver.
  const tira = texturas && texturas.get('tira')
  if (!tira || !tira.image) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl, vacia: true }
  }

  // ---------------------------------------------------------------- geometria del plano a sangre
  // Desborda el cuadro por los cuatro lados. Tiene que aguantar el empuje de camara sin descubrir el
  // fondo por un canto: 1.10 de ancho deja 0.28 de margen a la distancia base, que es donde la camara
  // termina y donde el cuadro es mas grande.
  const ANCHO = mundoW * 1.10
  const anchoTira = tira.image.width || 720
  const altoTira = tira.image.height || (spec && spec.tiraViewport) || 1560

  // CUANTA PAGINA ENTRA. Esto NO se copia de telefono.js, y ahi hay una trampa que cuesta un video:
  // el hero calcula `visible = tiraViewport / altoTira` porque su pantalla tiene la proporcion del
  // aparato (9:19.5), que es EXACTAMENTE la del viewport capturado. El cuadro de la pieza es 9:16.
  // Con la misma cuenta, la pagina del cliente sale estirada un 22% a lo ancho — el defecto que su
  // dueño ve antes que ninguno, el mismo por el que `planoRecorte` no recorta ni deforma. Asi que la
  // fraccion visible sale de la PROPORCION REAL del archivo, y `tiraViewport` queda de respaldo para
  // cuando la textura no trae medidas.
  let ALTO = mundoH * 1.12
  let visible = (ALTO / ANCHO) * (anchoTira / altoTira)
  if (visible > 1) {
    // La tira es mas CORTA que lo que el cuadro muestra a este zoom. Forzar visible = 1 estiraria la
    // pagina a lo alto; se achica el plano hasta su proporcion real. Una pagina entera con aire arriba
    // y abajo es peor composicion que una a sangre, pero es la pagina — la otra es otra pagina.
    ALTO = ANCHO * (altoTira / anchoTira)
    visible = 1
  }
  const arriba = 1 - visible                          // el offset que muestra el TOPE de la pagina

  // CUANTO RECORRE. El 72% de lo que queda, como en el hero: llegar al final delata que la pagina se
  // acabo y deja el cuadro en el pie de pagina, que es lo mas feo que tiene cualquier sitio. La
  // diferencia con el hero no es el recorrido sino el TIEMPO — el mismo viaje en la mitad de beats.
  const recorrido = Math.max(0, 1 - visible) * 0.72

  const hB = ALTO / N
  const yDe = i => ALTO / 2 - (i + 0.5) * hB

  const bandas = []
  for (let i = 0; i < N; i++) {
    // UN CLON DE TEXTURA POR BANDA. `texturas` es un Map COMPARTIDO y la tira es UN solo objeto que
    // tambien usan los heroes: escribirle el offset cada cuadro la dejaria donde esta escena la
    // abandono, y el hero de telefono que venga despues abre mostrando el medio de la pagina durante
    // casi un beat (su tween arranca recien en b(0.9)). El clon comparte la imagen —three comparte el
    // `source`, o sea que no hay una segunda subida a la GPU— y nos da un offset propio. De paso es lo
    // que permite que cada banda se desfase por su cuenta, que es el evento de la segunda mitad.
    const tex = tira.clone()
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    tex.anisotropy = 8
    tex.repeat.set(1, visible)
    tex.offset.set(0, arriba)

    // La banda se queda con SU franja de la pagina metiendola en las uv de la geometria. Asi las siete
    // juntas reconstruyen la imagen entera sin una costura, y cada una puede revelarse por su lado.
    const geo = new THREE.PlaneGeometry(ANCHO, hB * SOLAPE)
    const vC = 1 - (i + 0.5) / N
    const mitad = (0.5 / N) * SOLAPE
    const uv = geo.attributes.uv
    for (let k = 0; k < uv.count; k++) uv.setY(k, vC - mitad + uv.getY(k) * mitad * 2)
    uv.needsUpdate = true

    // MASCARA SIN TINTE, y va con `null` a proposito. tarjetas.js advierte "siempre con color" porque
    // su uniform de tinte es un vec3 — pero `materialMascara` ya resuelve eso mandando negro y dejando
    // `uUsaTinte` en 0. Teñir la pagina del cliente seria pintarla del color de la plantilla.
    const mat = materialMascara(tex, null)
    // EL BARRIDO VA EN HORIZONTAL, Y NO ES ESTETICO. La mascara vertical (uDir 2 y 3) mide sobre vUv.y,
    // que aca esta remapeado a la franja de la banda (0.71 a 0.86, por ejemplo): con uProg de 0 a 1 la
    // banda entera aparece de golpe en el primer instante y el revelado no existe. vUv.x sigue yendo de
    // 0 a 1, asi que el barrido lateral es el unico que mide lo que uno cree que mide.
    mat.uniforms.uDir.value = i % 2 ? 1 : 0            // alternado: la pagina se teje, no se barre
    mat.uniforms.uSuave.value = SUAVE
    const m = new THREE.Mesh(geo, mat)
    m.position.set(0, yDe(i), 0)
    gr.add(m)
    bandas.push({ m, mat, tex, y: yDe(i), dir: i % 2 })
  }

  // ---------------------------------------------------------------- lo que se ve por los huecos
  // LA CAMA. Mientras la pagina se escribe hay bandas que todavia no estan, y por ahi se ve el fondo:
  // una grilla en fuga detras de un recorte de pagina se lee como que la pagina esta ROTA. Con una
  // plancha de acento debajo, el mismo hueco se lee como luz que todavia no fue cubierta. Vive en `g`
  // porque es lo unico de esta escena que TIENE que florecer.
  // El alto NO sale solo de ALTO. Una pagina corta achica el plano (ver el `visible > 1` de arriba) y
  // 1.25 de esa medida dejaba 0.17 de cuadro sin cubrir arriba y abajo: la grilla del fondo asomando
  // por el canto, justo en el caso en que la pagina tampoco llega a los bordes y mas se necesita que
  // debajo haya luz y no vacio. El piso cubre el cuadro entero MAS el 1.10 que la cama viaja.
  const cama = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO, Math.max(ALTO * 1.25, mundoH + 2.6)),
    new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: { uA: { value: new THREE.Color(LOOK.acento) }, uB: { value: new THREE.Color(LOOK.acento2) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 uA, uB; varying vec2 vUv;
        void main(){
          vec3 c = mix(uA, uB, smoothstep(0.15, 0.85, vUv.y));
          gl_FragColor = vec4(c * (0.34 + 0.30 * smoothstep(0.0, 0.5, abs(vUv.x - 0.5))), 1.0);
        }`,
    }))
  cama.position.z = -0.4
  g.add(cama)

  // EL CABEZAL. Un filete que va PEGADO al borde de la mascara mientras la banda se descubre. Es lo que
  // convierte un revelado en un gesto: sin el, una banda simplemente aparece; con el, algo la escribio.
  // Como se lo mantiene sobre el borde exacto —y por que NO se lee el uniform de la banda— esta abajo,
  // en el bloque del cuadro a cuadro.
  const cabezal = new THREE.Mesh(new THREE.PlaneGeometry(0.075, hB * 1.02), matAcento(LOOK.acento2, 1.9))
  cabezal.position.z = -0.2
  cabezal.visible = false
  g.add(cabezal)

  // ---------------------------------------------------------------- el marco y la regleta (sobre la pagina)
  const X = mundoW * 0.44
  const Y = mundoH * 0.448
  const gMarco = new THREE.Group()
  gMarco.position.z = 0.6
  gr.add(gMarco)
  const barra = (w, h, x, y, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matAcento(col, 1.5))
    m.position.set(x, y, 0)
    gMarco.add(m)
    return m
  }
  const mSup = barra(X * 2, 0.028, 0, Y, LOOK.acento)
  const mInf = barra(X * 2, 0.028, 0, -Y, LOOK.acento2)
  const mIzq = barra(0.028, Y * 2, -X, 0, LOOK.acento)
  const mDer = barra(0.028, Y * 2, X, 0, LOOK.acento)
  mSup.scale.x = 0.0001
  mInf.scale.x = 0.0001
  mIzq.scale.y = 0.0001
  mDer.scale.y = 0.0001

  // REGLETA. Las marcas por las que pasa el indicador de scroll. No dicen nada —no tienen letras— y
  // hacen dos cosas: dan una referencia fija contra la que se mide el desplazamiento (sin ella, una
  // pagina que scrollea rapido es una textura que vibra) y llenan el canto derecho, que en un cuadro
  // vertical es la zona que siempre queda muerta.
  const rail = { alto: Y * 0.74, x: X - 0.055 }
  const marcas = []
  for (let i = 0; i < 9; i++) {
    const largo = 0.09 + rnd() * 0.05
    const geo = new THREE.PlaneGeometry(largo, 0.016)
    geo.translate(-largo / 2, 0, 0)                    // ancla al canto derecho: al crecer, crece hacia adentro
    const m = new THREE.Mesh(geo, matAcento(LOOK.acento, 1.1))
    m.position.set(rail.x, rail.alto - (i / 8) * rail.alto * 2, 0.6)
    gr.add(m)
    marcas.push(m)
  }
  const geoInd = new THREE.PlaneGeometry(0.34, 0.030)
  geoInd.translate(-0.17, 0, 0)
  const indicador = new THREE.Mesh(geoInd, matAcento(LOOK.acento2, 1.8))
  indicador.position.set(rail.x, rail.alto, 0.62)
  gr.add(indicador)

  // ---------------------------------------------------------------- el rotulo
  // EL PIE REAL DE LA PAGINA, no un rotulo de sistema escrito a mano. Ver `sello` en datos.js: es el
  // unico texto que una escena puede poner sin que la pagina lo haya dicho, porque es exactamente lo
  // que la pagina dijo.
  //
  // Y VA SOBRE UNA PLACA. El rotulo cae encima de la pagina del cliente, cuyo color no elegimos: la
  // misma tipografia que se lee sobre un hero oscuro desaparece sobre una seccion blanca, y la mitad
  // de las paginas reales son blancas. La placa lo resuelve de una vez y para cualquier pagina —
  // escrita con nivel() se da vuelta sola en un mundo claro, asi que nunca es un parche negro.
  const pie = sello(0)
  let rotulo = null
  let placa = null
  if (pie) {
    const t = texto(pie, { fuente: 'DMSans', peso: 500, size: 72, tracking: 0.26, color: nivel(0.94) })
    const alto = 0.135
    const mat = materialMascara(t.tex, nivel(0.94))
    // El mismo borde blando de las bandas, y por la misma razon: con el barrido terminado en 1 la
    // mascara dejaba el dominio opaco solo hasta el 94% de su ancho y la ULTIMA letra en alfa 0.000.
    // Un pie que termina en ".com.ar" perdia el remate — y el sello es el unico texto de la escena,
    // asi que medio sello es media escena. Se declara el uSuave para que el final del barrido quede
    // atado a el en vez de ser dos numeros que hay que acordarse de mover juntos.
    mat.uniforms.uSuave.value = SUAVE_TXT
    const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * t.ar, alto), mat)
    // ANCLADO POR SU BORDE IZQUIERDO. Colocado por el centro, un pie largo tipo "midominio.com.ar"
    // sobresale medio metro por fuera del marco y en pantalla se lee ".com.ar".
    const x0 = -X + 0.16
    m.position.set(x0 + (alto * t.ar) / 2, -Y + 0.30, 0.66)
    gr.add(m)
    rotulo = m

    placa = new THREE.Mesh(
      new THREE.PlaneGeometry(alto * t.ar + 0.24, alto + 0.16),
      new THREE.MeshBasicMaterial({ color: nivel(0.05), toneMapped: false, transparent: true, opacity: 0 }))
    placa.position.set(m.position.x + 0.005, m.position.y, 0.62)
    gr.add(placa)
    const canto = new THREE.Mesh(new THREE.PlaneGeometry(0.026, alto + 0.16), matAcento(LOOK.acento2, 1.6))
    canto.position.set(x0 - 0.105, m.position.y, 0.64)
    gr.add(canto)
    placa.userData.canto = canto
    canto.scale.y = 0.0001
  }

  // ================================================================ TIEMPO
  // El fondo cede mientras la pagina se escribe: una grilla en fuga asomando por los huecos de un
  // recorte de pagina es la lectura equivocada del cuadro. Vuelve antes del corte porque la escena
  // siguiente cuenta con ella — desde el beat 3 la pagina la tapa entera y restituirla no cuesta nada.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.30, duration: b(0.45), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.70), ease: E.vaiven() }, DUR - b(0.70))
  }

  // ---------------------------------------------------------------- el revelado, uno por medio beat
  // ABRE DESDE EL CENTRO. De arriba hacia abajo el revelado es un barrido, o sea un solo gesto largo
  // que el ojo entiende en la primera banda y despues espera; abriendo desde el medio hacia los dos
  // extremos, cada aparicion cae en un lado distinto del cuadro y las siete se cuentan como siete.
  const orden = []
  const centro = Math.floor(N / 2)
  orden.push(centro)
  for (let d = 1; d <= centro; d++) {
    if (centro - d >= 0) orden.push(centro - d)
    if (centro + d < N) orden.push(centro + d)
  }
  // 0.34 de beat: el barrido cruza el cuadro en 164 ms y termina bastante antes del medio beat
  // siguiente. Estirado a medio beat entero, dos revelados quedan siempre encimados y lo que se ve es
  // una pagina que se disuelve — que es el fundido que esta escena vino a no hacer.
  const REV = b(0.34)
  const GESTO_REV = E.frena(3)
  // Termina en FIN y no en 1: ver la nota de SUAVE arriba. Es la diferencia entre una pagina a sangre
  // y una pagina con el canto a medio pintar.
  orden.forEach((i, p) => {
    tl.fromTo(bandas[i].mat.uniforms.uProg, { value: 0 },
      { value: FIN, duration: REV, ease: GESTO_REV, immediateRender: false }, p * MEDIO)
  })

  // Dos cuadros de blanco cuando la pagina queda ENTERA. Es el unico corte interno que esta escena
  // tiene y conviene que se lea como decision de montaje: hasta aca se estaba escribiendo, desde aca es
  // una pagina. El instante se calcula, no se escribe a mano: estaba clavado en b(3.0), que es cuando
  // la ultima banda EMPIEZA, asi que el golpe caia con el cuadro todavia abriendose y anunciaba en vez
  // de cerrar. La pagina esta entera cuando esa ultima banda TERMINA.
  const ENTERA = (orden.length - 1) * MEDIO + REV
  if (ctx.pelicula && ctx.pelicula.uFlash) {
    tl.fromTo(ctx.pelicula.uFlash, { value: 0.26 }, { value: 0, duration: 0.07, ease: E.acelera(2), immediateRender: false }, ENTERA)
  }

  // ---------------------------------------------------------------- el marco
  tl.fromTo(mSup.scale, { x: 0.0001 }, { x: 1, duration: b(0.42), ease: E.frena(4), immediateRender: false }, b(0.05))
  tl.fromTo(mInf.scale, { x: 0.0001 }, { x: 1, duration: b(0.42), ease: E.frena(4), immediateRender: false }, b(0.14))
  tl.fromTo(mIzq.scale, { y: 0.0001 }, { y: 1, duration: b(0.46), ease: E.frena(4), immediateRender: false }, b(0.10))
  tl.fromTo(mDer.scale, { y: 0.0001 }, { y: 1, duration: b(0.46), ease: E.frena(4), immediateRender: false }, b(0.19))

  // EL MARCO GOLPEA EN CADA MEDIO BEAT. Es el metronomo del cuadro: la pagina se desplaza continuo y un
  // desplazamiento continuo no tiene pulso, por rapido que sea. El golpe empieza pasado y vuelve, asi
  // que cae EN el beat en vez de anunciarlo.
  for (let j = 2; j < PASOS; j++) {
    tl.fromTo(gMarco.scale, { x: 1.016, y: 1.010 },
      { x: 1, y: 1, duration: b(0.40), ease: E.frena(3), immediateRender: false }, j * MEDIO)
  }

  if (rotulo) {
    tl.fromTo(placa.material, { opacity: 0 }, { opacity: 0.88, duration: b(0.30), ease: E.frena(2), immediateRender: false }, b(0.55))
    tl.fromTo(placa.userData.canto.scale, { y: 0.0001 }, { y: 1, duration: b(0.34), ease: E.llega(2.4), immediateRender: false }, b(0.55))
    tl.fromTo(rotulo.material.uniforms.uProg, { value: 0 }, { value: FIN_TXT, duration: b(0.50), ease: E.frena(2), immediateRender: false }, b(0.66))
  }

  // ---------------------------------------------------------------- camara
  // Empuje parejo hacia adentro y suelta al final. Le da direccion al plano y, sobre todo, mete
  // PARALAJE: sin ella la pagina scrolleando es una textura corriendo detras de un vidrio fijo.
  // NUNCA se aleja mas alla de distBase — ahi el cuadro es el mas grande que va a ser y el plano deja
  // 0.28 de margen; un paso mas atras y se ve el borde de la pagina.
  tl.fromTo(camera.position, { z: dolly(distBase, -0.05) },
    { z: dolly(distBase, -1.15), duration: DUR * 0.86, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.14, ease: E.vaiven() }, DUR * 0.86)

  // ================================================================ EL CUADRO A CUADRO
  // Todo lo continuo se escribe A MANO desde un solo tween sobre un objeto vacio. No es una preferencia:
  // `modifiers` de GSAP solo corre sobre propiedades DECLARADAS en `vars`, asi que un tween con un
  // modificador y nada que animar no corre nunca, sin error y sin aviso — ya costo cuatro bugs en este
  // repo. Y un solo escritor por propiedad evita que dos tweens se peleen por el ultimo render.

  // AVANCE DEL SCROLL. Mitad viaje parejo, mitad EMPUJON por medio beat. Solo parejo, un scroll rapido
  // es una textura que se desliza y no tiene ritmo; solo a saltos, la pagina se congela entre golpe y
  // golpe y la escena mas movida del catalogo pasa la mitad del tiempo quieta. Mezclados, avanza
  // siempre y late doce veces.
  const avance = (t) => {
    const u = Math.min(1, Math.max(0, t / DUR))
    const k = Math.min(PASOS, Math.max(0, t / MEDIO))
    const i = Math.floor(k)
    const f = Math.min(1, (k - i) / 0.45)               // el empujon ocupa el 45% del medio beat
    const suave = f * f * (3 - 2 * f)
    const pulso = Math.min(1, (i + suave) / PASOS)
    return recorrido * (0.45 * u + 0.55 * pulso)
  }

  // La curva del revelado, resuelta a funcion. Es la MISMA que usa el tween, no una copia escrita a
  // mano: un aire que cambie `frena` por otra familia mueve el barrido y el cabezal juntos.
  const curvaRev = (gsap.parseEase && gsap.parseEase(GESTO_REV)) || (f => f)

  // DESFASE. Desde el medio beat 7 —con la pagina ya entera— las bandas pares e impares saltan a
  // contramano y vuelven a alinearse antes del proximo golpe. Es el unico evento duro que se puede
  // meter sobre una pagina a sangre sin abrir un hueco: no mueve el plano, mueve el CONTENIDO de cada
  // banda, asi que la ocupacion de cuadro sigue siendo entera mientras pasa.
  const AMP = 0.0062
  const desfase = (i, t) => {
    const k = t / MEDIO
    const j = Math.floor(k)
    if (j < 7 || j >= PASOS) return 0
    const cae = 1 - Math.min(1, (k - j) / 0.5)          // golpea en el beat y se acomoda en la mitad
    return ((i + j) % 2 ? 1 : -1) * AMP * cae * cae
  }

  const pintar = () => {
    const t = tl.time()
    const a = avance(t)
    // SIN SCROLL TAMBIEN TIENE QUE MOVERSE. Esto era `a / Math.max(1e-6, recorrido)`, y esa guardia
    // no protegia nada: una pagina que entra entera en el cuadro (visible = 1, o sea recorrido = 0)
    // dejaba `u` clavado en 0 y con el se congelaban la cama, el indicador y las marcas. Medido, `g`
    // se quedaba 1.27 s sin mover NADA — mas del doble del beat, la compuerta de "nada descansa" en
    // rojo. No lo cazaba nadie porque el fixture del verificador es una tira de 720x6240 y ese camino
    // no se ejerce nunca; una captura de 1080x1920 de una pagina de una sola pantalla cae justo ahi
    // (el umbral es una tira mas corta que 1.81 veces su ancho). Cuando no hay recorrido que seguir,
    // el reloj hace de recorrido: la escena sigue siendo la misma, solo que la pagina no scrollea.
    const u = recorrido > 1e-6 ? a / recorrido : Math.min(1, t / DUR)

    // El offset se queda dentro de [0, arriba], que es exactamente el rango que la textura tiene para
    // ofrecer (arriba = 1 - visible). Fuera de ahi ClampToEdge repite la primera o la ultima fila de
    // la captura y el canto sale chorreado: pasaba con el desfase sobre una pagina corta, donde
    // `arriba` ya vale 0 y cualquier empujon negativo se sale del archivo. Sobre una pagina larga no
    // muerde nunca; sobre una corta apaga el desfase, que es la degradacion honesta.
    for (let i = 0; i < N; i++) {
      bandas[i].tex.offset.y = Math.min(arriba, Math.max(0, arriba - a - desfase(i, t)))
    }

    // La cama acompaña el scroll: la luz de atras corre con la pagina, no contra ella. Es ademas lo
    // unico de `g` que se mueve todo el tiempo, o sea lo que sostiene la compuerta de "nada descansa".
    cama.position.y = u * 1.10

    // El cabezal se planta en el borde exacto de la mascara de la banda que se esta escribiendo.
    //
    // DOS COSAS QUE ROMPIERON EL DETERMINISMO ACA, Y LAS DOS SE VEN IGUAL DESDE AFUERA: NADA.
    //  · La posicion se escribia solo cuando el cabezal estaba a la vista. Apagado se quedaba con la
    //    ultima que tuvo, o sea que su estado dependia de POR DONDE PASO el cabezal de reproduccion y
    //    no del instante. Ahora se escribe siempre y `visible` es lo unico que se apaga.
    //  · La progresion se leia del uProg de la banda. Parece lo mas directo —es el valor de verdad— y
    //    es justo lo que no se puede hacer: GSAP resuelve el PRIMER render de un tween de forma
    //    perezosa, asi que lo que hay en ese uniform depende de cuantas veces se renderizo la timeline.
    //    Construida dos veces y consultada en el mismo tiempo, la escena daba dos cuadros distintos.
    // Se calcula del TIEMPO con la misma curva que usa el tween —`gsap.parseEase` la resuelve tal como
    // la definio el aire, asi que sigue al barrido aunque el aire cambie de familia de curvas— que es
    // la unica fuente que no tiene historia.
    const p = Math.floor(t / MEDIO)
    const activa = p >= 0 && p < orden.length
    const bnd = bandas[orden[Math.min(orden.length - 1, Math.max(0, p))]]
    const prog = activa ? curvaRev(Math.min(1, Math.max(0, (t - p * MEDIO) / REV))) : 1
    // El borde de la mascara vive en uProg, que ahora va de 0 a FIN y no de 0 a 1: escrito contra
    // `prog` pelado el cabezal se quedaba corto un `uSuave` de ancho de plano y terminaba el barrido
    // adentro del cuadro, despegado del borde que dice estar dibujando.
    const pm = prog * FIN
    cabezal.visible = activa && prog > 0.002 && prog < 0.998
    cabezal.position.y = bnd.y
    cabezal.position.x = bnd.dir ? (0.5 - pm) * ANCHO : (pm - 0.5) * ANCHO

    // El indicador baja por la regleta y las marcas se abren a su paso. Es la unica pieza del cuadro
    // que dice CUANTO se avanzo — un scroll sin referencia no se percibe como recorrido.
    const y = rail.alto - u * rail.alto * 2
    indicador.position.y = y
    for (const m of marcas) {
      const k = Math.max(0, 1 - Math.abs(m.position.y - y) / 0.55)
      m.scale.x = 1 + k * k * 2.1
    }
  }
  // UN SOLO TWEEN, DE PUNTA A PUNTA. Cubre la escena entera para que no exista un instante en el que
  // nadie escriba el scroll: un hueco de un cuadro deja la pagina donde la dejo la escena anterior.
  tl.to({}, { duration: DUR, ease: 'none', onUpdate: pintar }, 0)
  // Y una vez a mano, porque el onUpdate recien corre cuando el cabezal de reproduccion se mueve: sin
  // esto el cuadro 0 sale con la pagina y el indicador en su estado de construccion.
  pintar()

  return { g, gr, tl }
}
