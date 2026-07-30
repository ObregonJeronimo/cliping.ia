// ESCENA "titular" — un titular editorial A SANGRE sobre una foto real de la pagina.
//
// POR QUE EXISTE
// Las paginas traen FOTOS y el motor las usaba chiquitas: en `columna` pasan de a una en un feed, en
// `rafaga` duran tres cuadros. Ninguna escena las trataba como lo que son en una portada — el fondo
// sobre el que se escribe. Y del otro lado, los medios traen titulares y terminaban repartidos como
// frases sueltas de tipografia cinetica, que es exactamente al reves de como se lee un medio.
//
// QUE LA SEPARA DE `destello`
// `destello` ya es un titular a sangre, pero sobre una HOJA: es una inversion de polaridad, papel y
// tinta. Esta es una PORTADA: foto real de la marca, banda de color y titular montado sobre el borde
// de la foto. El sujeto de una es la tipografia; el de la otra, la imagen que la pagina publico.
//
// LA TRAMPA DE LA CAPA, Y POR QUE LA COMPOSICION ES ASI
// Los recortes viven en `gr`, la escena POST-BLOOM, y esa escena se compone DESPUES: todo lo que
// este ahi se dibuja por encima de `g`, sin importar el z. O sea que un titular puesto en `g` sobre
// una foto puesta en `gr` desaparece debajo de la foto, y no hay z que lo salve. Por eso la foto, la
// banda y el titular van los TRES en `gr`, ordenados entre si por z; y en `g` quedan el filete y el
// pie, abajo, donde la foto no llega. Ademas el texto en `gr` no pasa por el bloom, asi que puede
// ir mas claro que en cualquier otra escena sin reventarse: la restriccion del umbral 0.62 no aplica.
//
// SIN FOTO NO HAY PORTADA. Una portada sin imagen es un titular sobre el fondo, y eso ya existe.
// Se declara vacia y el guionista es quien no deberia haberla elegido.

import { LOOK, b, E, texto, nivel, matAcento, materialMascara, planoRecorte, recortesDe, filete, finMascara, deriva, encaje, dolly, orbita, hex, texturaDe } from '../kit.js'
import { D, repartirFrases } from '../datos.js'

export const meta = { id: 'titular', beats: 6 }

const ROLES = ['foto', 'hero', 'tarjeta']
const MAX_LINEAS = 3

// EL TITULAR DE UNA PORTADA ES LA PROMESA, NO UN ROTULO DE SECCION.
//
// Antes tomaba una frase del mostrador, y las frases son los ENCABEZADOS de la pagina. En el render de
// basecamp eso puso la captura del workspace arriba —seis paneles, calendario, chat, tareas— y debajo,
// en cuerpo de portada, "REMEMBER WHEN COMPANIES CARED ABOUT SERVICE?". Las dos cosas salen de la
// pagina y no tienen nada que ver entre si: la imagen muestra el producto y el texto habla de atencion
// al cliente. Thiago lo dijo asi: el texto tiene que ser "la mano que le da al usuario", un "veni,
// mira lo que hago por vos".
//
// Ese material EXISTE y es `D.claim`: la description que la marca escribio para que la lea Google, o
// sea su promesa en una linea. Sobre una imagen del producto dice exactamente eso. Para basecamp da
// "Trusted by millions, Basecamp puts everything you need to get work done in one place."
//
// La frase del mostrador queda de RESPALDO, para las paginas sin description. Y el reparto en renglones
// se hace aca y no en los datos, porque cuantos renglones entran es una decision de ESTA escena:
// `destello` compone el mismo tipo de material en dos.
function titularDe() {
  const claim = String(D.claim || '').trim()
  if (claim) return enLineas(claim, MAX_LINEAS)
  const fr = repartirFrases(2)
  const dosLineas = fr.find(f => f.includes('\n'))
  if (dosLineas) return dosLineas
  if (!fr.length) return ''
  return fr.slice().sort((a, b) => b.length - a.length)[0]
}

// Reparte un texto en `n` renglones lo mas parejos posible, sin cortar palabras. Busca el reparto que
// minimiza el renglon MAS LARGO: es lo que decide el cuerpo tipografico, porque la escena escala el
// bloque entero hasta que la linea mas ancha entre en el cuadro.
function enLineas(t, n) {
  const pal = String(t).split(/\s+/).filter(Boolean)
  if (pal.length <= 1 || n <= 1) return pal.join(' ')
  const objetivo = Math.ceil(String(t).length / n)
  const lineas = []
  let actual = ''
  for (const p of pal) {
    const cand = actual ? actual + ' ' + p : p
    if (actual && cand.length > objetivo && lineas.length < n - 1) { lineas.push(actual); actual = p }
    else actual = cand
  }
  if (actual) lineas.push(actual)
  return lineas.join(String.fromCharCode(10))
}

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, texturas, datosEls } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---- el material que hay
  const txt = titularDe()
  let tex = null
  for (const e of recortesDe(datosEls || [], ROLES, 4)) {
    const t = texturaDe(texturas, e)
    if (t) { tex = t; break }
  }
  if (!txt || !tex) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl, vacia: true }
  }

  // ---- la foto, a sangre
  // Se dimensiona para CUBRIR la banda, no para entrar en ella: una foto que entra deja franjas de
  // fondo a los costados y eso ya no es sangre, es una imagen pegada. Se elige el alto que la haga
  // desbordar por el lado que le falta.
  // LA IMAGEN OCUPA LO QUE LA TIPOGRAFIA NO NECESITA. Es como se arma una portada y ademas es lo que
  // arregla el defecto que mostro el render de basecamp.com: con un alto fijo, un titular de UNA sola
  // linea dejaba el tercio inferior vacio y la pieza se leia partida —todo el peso arriba y un
  // agujero abajo—. La banda arranca siempre en el canto superior (asi la foto sangra de verdad) y su
  // alto se calcula para que el bloque de texto aterrice contra el margen de abajo.
  const lineas = String(txt).split('\n').map(s => s.trim()).filter(Boolean).slice(0, MAX_LINEAS)
  const BANDA_H = mundoH * (lineas.length >= 3 ? 0.50 : lineas.length === 2 ? 0.60 : 0.70)
  const arFoto = tex.image.width / tex.image.height

  // LA PAGINA NO SE CORTA DE LOS COSTADOS, Y ANTES SI. La version anterior escalaba la captura para
  // CUBRIR la banda: con una captura ancha —arFoto 1.6— cubrir un alto de 5.0 da 8.0 de ancho contra los
  // 5.625 del cuadro, o sea un 42% de desborde, y el cuadro se lo comia. Thiago lo vio en el video:
  // "aster app launch" en vez de "Faster app launch", "ctivity" en vez de "Activity" — CADA LINEA
  // perdiendo sus primeras letras. Una foto puede sangrar; una captura de pagina con texto NO, porque
  // sangrar de costado le come las palabras.
  //
  // Se compone a ANCHO COMPLETO y se recorta por UV en vertical, que es la unica direccion segura: una
  // pagina se lee de arriba hacia abajo, asi que perder el pie no cuesta nada y perder el margen
  // izquierdo cuesta todo. Es la misma cuenta que documentan `pantalla` y `mesa`.
  const ANCHO_FOTO = mundoW * 1.02
  const altoNativo = ANCHO_FOTO / Math.max(0.08, arFoto)
  let visibleFoto = altoNativo > 0 ? Math.min(1, BANDA_H / altoNativo) : 1
  const texFoto = tex.clone()
  texFoto.needsUpdate = true
  texFoto.wrapS = THREE.ClampToEdgeWrapping
  texFoto.wrapT = THREE.ClampToEdgeWrapping
  texFoto.repeat.set(1, visibleFoto)
  texFoto.offset.set(0, 1 - visibleFoto)           // la ventana arranca ARRIBA: ahi empieza la pagina
  const foto = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_FOTO, Math.min(BANDA_H, altoNativo)),
    new THREE.MeshBasicMaterial({ map: texFoto, toneMapped: false, transparent: true }),
  )
  const FOTO_Y = mundoH * 0.5 - BANDA_H / 2       // anclada al canto superior del cuadro
  foto.position.set(0, FOTO_Y, -0.2)
  gr.add(foto)

  // ---------------------------------------------------------------- LA FRANJA QUE BARRE LA FOTO
  // ESTA ESCENA ERA LA SEGUNDA MAS MUERTA, MEDIDO: 2.92 de diferencia media entre cuadros a 270x480,
  // contra 16.97 de `columna` y 12.84 de `toro`. Compone una portada —foto arriba, titular abajo— y
  // despues la sostiene: dos masas que entran y se quedan. `verificar` la deja pasar porque su regla
  // mide SI la firma cambia, no CUANTO.
  //
  // Y LA LECCION DE `sello` SE APLICA DIRECTO: pulsar lo que ya esta no alcanza —ahi dio un 3% y se
  // reverti—, hace falta un elemento que ENTRE. Para una portada el gesto es una pasada de luz sobre la
  // foto, como una tapa bajo el escaner: tiene MASA (todo el ancho del cuadro) y baja A SALTOS de un
  // sexto de la banda por medio beat, porque la deriva suave no la cuenta ni el ojo ni la medicion.
  //
  // ADITIVA Y NO SOLIDA: una banda opaca sobre la captura de la pagina del cliente la TAPA, y esta
  // escena existe para mostrarla. Sumando luz al 22% se lee como un reflejo que pasa y la pagina sigue
  // ahi debajo. Va en `gr` como la foto: si fuera en `g` quedaria detras, porque `gr` se dibuja siempre
  // por encima sin importar z.
  const FRANJA_H = BANDA_H * 0.15
  const franja = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 1.04, FRANJA_H),
    new THREE.MeshBasicMaterial({ color: hex(LOOK.acento).multiplyScalar(0.22), toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  )
  franja.position.set(0, FOTO_Y + BANDA_H / 2 - FRANJA_H / 2, 0.1)
  gr.add(franja)

  const PASOS_F = 6
  const ARRIBA = FOTO_Y + BANDA_H / 2 - FRANJA_H / 2
  tl.to(franja.material, { opacity: 1, duration: b(0.16), ease: E.frena(2) }, b(1.5))
  for (let k = 1; k <= PASOS_F; k++) {
    tl.set(franja.position, { y: ARRIBA - (k / PASOS_F) * (BANDA_H - FRANJA_H) }, b(1.5 + k * 0.5))
  }
  tl.to(franja.material, { opacity: 0, duration: b(0.24), ease: E.acelera(2) }, b(1.5 + PASOS_F * 0.5))

  // Recorte de la banda: la foto desborda a proposito, pero tiene que CORTARSE con filo arriba y
  // abajo o se lee como una imagen suelta flotando. Dos planos del color del fondo tapan lo que sobra;
  // van en `gr` como todo lo demas de esta escena, y por encima de la foto en z.
  const tapa = (y, h) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(mundoW * 1.2, h),
      new THREE.MeshBasicMaterial({ color: nivel(0), toneMapped: false }),
    )
    m.position.set(0, y, 0.1)
    gr.add(m)
    return m
  }
  // LAS TAPAS MIDEN EL DESBORDE EXACTO, NI UN PIXEL MAS. Estaban con un tercio de cuadro de margen
  // "por las dudas" y eso se comio el pie entero: viven en `gr`, que se compone DESPUES del bloom y
  // por lo tanto se dibuja encima de todo `g`, sin importar el z. El dominio estaba dibujado y no se
  // veia nunca. Si la foto no desborda —el caso normal, porque el alto se elige para cubrir— no se
  // crea ninguna tapa: un plano opaco de mas es siempre algo tapando otra cosa.
  const sobra = Math.max(0, (Math.min(BANDA_H, altoNativo) - BANDA_H) / 2)
  if (sobra > 0.001) {
    tapa(FOTO_Y + BANDA_H / 2 + sobra / 2, sobra)
    tapa(FOTO_Y - BANDA_H / 2 - sobra / 2, sobra)
  }

  // ---- la banda de acento donde se monta el titular
  // Es lo que convierte una foto con texto encima en una PORTADA: el titular no flota sobre la
  // imagen, se apoya en una barra que muerde su borde inferior.
  const BANDA_Y = FOTO_Y - BANDA_H / 2
  const barra = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 1.2, mundoH * 0.012),
    matAcento(LOOK.acento, 1.3),
  )
  barra.position.set(0, BANDA_Y, 0.35)
  barra.scale.x = 0.001
  gr.add(barra)

  // ---- el titular
  // Se MIDE y se achica el bloque entero si no entra: el ancho de un renglon lo decide la fuente que
  // eligio el aire, no la cantidad de letras. Las lineas se marcan con `userData.encaja = true` y
  // E-ENCAJE se encarga de que entren; la FOTO no se marca, porque su trabajo es justamente sangrar.
  const FUENTE = { fuente: 'Anton', peso: 400, size: 190, tracking: 0.002, upper: true, alineado: 'left' }
  const texs = lineas.map(l => texto(l, FUENTE))
  const ANCHO_UTIL = mundoW * 0.88
  const ALTO_BASE = mundoH * 0.085
  const ALTO_L = encaje(ALTO_BASE, Math.max(...texs.map(t => t.ar)), ANCHO_UTIL)
  const PASO = ALTO_L * 1.12                        // titular: interlinea CERRADA, como en una portada

  // En `gr` el texto NO pasa por el bloom, asi que puede ir casi a tinta sin reventarse. Es la unica
  // escena del catalogo donde eso es cierto, y se aprovecha: un titular de portada tiene que pegar.
  const COLOR_T = nivel(0.97)
  const FIN = finMascara()                          // 1 + uSuave: con 1 la ultima letra queda lavada
  const MARGEN = -mundoW * 0.42
  const filas = []
  for (let i = 0; i < lineas.length; i++) {
    const t = texs[i]
    const mat = materialMascara(t.tex, COLOR_T)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_L * t.ar, ALTO_L), mat)
    m.position.set(MARGEN + (ALTO_L * t.ar) / 2, BANDA_Y - ALTO_L * 0.72 - i * PASO, 0.5)
    m.userData.encaja = true       // la FOTO sangra a proposito; el titular no
    gr.add(m)
    filas.push({ m, mat })
  }

  // ---- pie: el dominio, abajo, donde la foto ya no llega. Va en `g` (no es un recorte).
  // `g` no puede quedar vacio: la compuerta E-VACIO existe para cazar escenas que se arman enteras en
  // la escena post-bloom y dejan el grupo normal sin un solo objeto.
  const raya = filete(mundoW * 0.20, mundoH * 0.006, LOOK.acento2)
  const yPie = BANDA_Y - ALTO_L * 0.72 - (lineas.length - 1) * PASO - mundoH * 0.075
  raya.position.set(MARGEN + mundoW * 0.10, yPie, 0)
  raya.scale.x = 0.001
  g.add(raya)

  const pieTxt = String(D.dominio || D.marca || '').trim()
  let matPie = null
  if (pieTxt) {
    const tp = texto(pieTxt, { fuente: 'DMSans', peso: 500, size: 80, tracking: 0.22, upper: true, alineado: 'left', color: nivel(0.55) })
    const ALTO_P = mundoH * 0.024
    matPie = materialMascara(tp.tex, nivel(0.55))
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_P * tp.ar, ALTO_P), matPie)
    mp.position.set(MARGEN + (ALTO_P * tp.ar) / 2, yPie - mundoH * 0.030, 0)
    g.add(mp)
  }

  // ================================================================ TIEMPO
  // DERIVA CONTINUA. Nada puede quedar quieto mas de un beat y se mide sobre matrixWorld, asi que
  // mover la camara no alcanza. Un tween sobre un reloj con las props escritas a mano: `modifiers` de
  // GSAP no corre si la propiedad no esta tambien en vars, y esa trampa ya costo cuatro heroes.
  // La foto deriva MAS que el texto: es el paralaje barato que separa el fondo del titular.
  deriva(tl, DUR, u => {
    foto.position.x = Math.sin(u * Math.PI * 0.9) * mundoW * 0.05
    foto.scale.setScalar(1 + u * 0.045)             // la foto se acerca despacio: la portada respira
    g.position.y = -u * mundoH * 0.010
    // El titular NO deriva: es el ancla del cuadro. Si se moviera con la foto, el paralaje
    // desapareceria — el efecto existe justamente porque una capa se mueve y la otra no.
    gr.position.y = -u * mundoH * 0.004
  })

  // ---- la foto entra revelandose desde abajo, como una cortina que sube
  tl.fromTo(foto.material, { opacity: 0 }, { opacity: 1, duration: b(0.55), ease: E.frena(2), immediateRender: false }, 0)
  tl.fromTo(barra.scale, { x: 0.001 }, { x: 1, duration: b(0.60), ease: E.frena(4), immediateRender: false }, b(0.30))

  // ---- el titular: un renglon por beat, que son los eventos duros de la escena
  const T0 = b(0.75)
  const PASO_BEAT = b(1.0)
  filas.forEach((f, i) => {
    tl.fromTo(f.mat.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.58), ease: E.frena(2), immediateRender: false }, T0 + i * PASO_BEAT)
  })

  const TP = T0 + filas.length * PASO_BEAT + b(0.10)
  tl.fromTo(raya.scale, { x: 0.001 }, { x: 1, duration: b(0.40), ease: E.frena(3), immediateRender: false }, TP)
  if (matPie) tl.fromTo(matPie.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.45), ease: E.frena(2), immediateRender: false }, TP + b(0.15))

  // ---- salida
  const SALIDA = DUR - b(0.45)
  filas.forEach((f, i) => tl.to(f.mat.uniforms.uProg, { value: 0, duration: b(0.32), ease: E.acelera(2) }, SALIDA + i * b(0.03)))
  if (matPie) tl.to(matPie.uniforms.uProg, { value: 0, duration: b(0.28), ease: E.acelera(2) }, SALIDA)
  tl.to(raya.scale, { x: 0.001, duration: b(0.28), ease: E.acelera(3) }, SALIDA)
  tl.to(barra.scale, { x: 0.001, duration: b(0.34), ease: E.acelera(3) }, SALIDA)
  tl.to(foto.material, { opacity: 0, duration: b(0.40), ease: E.acelera(2) }, SALIDA)

  // ---- camara: un empuje lento y su devolucion. Devolverla es CONTRATO.
  // CAMARA QUE ENDEREZA. Empieza inclinada y se acomoda mientras empuja: es el gesto de apoyar una
  // portada sobre la mesa y ponerla derecha. El roll resuelve a cero antes del final, asi que el titular
  // se lee recto justo cuando termino de escribirse.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.36) }, { z: dolly(distBase, -0.14), duration: DUR * 0.84, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.16, ease: E.vaiven() }, DUR * 0.84)
  tl.fromTo(camera.rotation, { z: orbita(-0.026) }, { z: 0, duration: DUR * 0.72, ease: E.frena(3), immediateRender: false }, 0)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, DUR - 0.001)

  return { g, gr, tl }
}
