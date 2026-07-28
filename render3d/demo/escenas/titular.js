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

import { LOOK, b, E, texto, nivel, matAcento, materialMascara, planoRecorte, recortesDe, filete } from '../kit.js'
import { D } from '../datos.js'

export const meta = { id: 'titular', beats: 6 }

const ROLES = ['foto', 'hero', 'tarjeta']
const MAX_LINEAS = 3

// El titular sale del material con FORMA de titular. Un medio manda sus titulares partidos en dos
// renglones (ver anthem-datos), asi que una frase con salto de linea ES un titular ya compuesto; si
// no hay ninguna, se toma la frase mas larga, que es la que mas se le parece. Nunca se fabrica.
function titularDe() {
  const fr = (D.frases || []).filter(Boolean).map(String)
  const dosLineas = fr.find(f => f.includes('\n'))
  if (dosLineas) return dosLineas
  if (!fr.length) return ''
  return fr.slice().sort((a, b) => b.length - a.length)[0]
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
    const t = texturas && texturas.get(e.url)
    if (t && t.image) { tex = t; break }
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
  const altoCubre = Math.max(BANDA_H, mundoW / Math.max(0.08, arFoto))
  const foto = planoRecorte(tex, altoCubre)
  if (!foto) {                                     // defensivo: planoRecorte devuelve null sin imagen
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl, vacia: true }
  }
  const FOTO_Y = mundoH * 0.5 - BANDA_H / 2       // anclada al canto superior del cuadro
  foto.position.set(0, FOTO_Y, -0.2)
  gr.add(foto)

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
  const sobra = Math.max(0, (altoCubre - BANDA_H) / 2)
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
  const anchoMax = Math.max(...texs.map(t => ALTO_BASE * t.ar))
  const ALTO_L = anchoMax > ANCHO_UTIL ? ALTO_BASE * (ANCHO_UTIL / anchoMax) : ALTO_BASE
  const PASO = ALTO_L * 1.12                        // titular: interlinea CERRADA, como en una portada

  // En `gr` el texto NO pasa por el bloom, asi que puede ir casi a tinta sin reventarse. Es la unica
  // escena del catalogo donde eso es cierto, y se aprovecha: un titular de portada tiene que pegar.
  const COLOR_T = nivel(0.97)
  const FIN = 1.06                                  // 1 + uSuave: con 1 la ultima letra queda lavada
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
  const reloj = { t: 0 }
  const derivar = () => {
    const u = reloj.t / DUR
    foto.position.x = Math.sin(u * Math.PI * 0.9) * mundoW * 0.05
    foto.scale.setScalar(1 + u * 0.045)             // la foto se acerca despacio: la portada respira
    g.position.y = -u * mundoH * 0.010
    // El titular NO deriva: es el ancla del cuadro. Si se moviera con la foto, el paralaje
    // desapareceria — el efecto existe justamente porque una capa se mueve y la otra no.
    gr.position.y = -u * mundoH * 0.004
  }
  derivar()
  tl.to(reloj, { t: DUR, duration: DUR, ease: 'none', onUpdate: derivar }, 0)

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
  tl.fromTo(camera.position, { z: distBase + 0.36 }, { z: distBase - 0.14, duration: DUR * 0.84, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.16, ease: E.vaiven() }, DUR * 0.84)
  tl.fromTo(camera.position, { y: -0.10 }, { y: 0.06, duration: DUR * 0.66, ease: E.vaiven(), immediateRender: false }, 0)
  tl.to(camera.position, { y: 0, duration: DUR * 0.34, ease: E.vaiven() }, DUR * 0.66)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, DUR - 0.001)

  return { g, gr, tl }
}
