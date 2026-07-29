// ANTHEM · tarjetas — cinco datos que se leen como UNA pieza, no como una lista.
//
// El error clásico de una escena de datos es dibujar cinco rectángulos iguales, alineados y quietos:
// eso es una tabla, no un plano de un reel. Acá cada dato entra desde un lado distinto y girado, se
// acomodan en un ARCO —una disposición que sólo existe porque hay cámara— y después la cámara los
// RECORRE de costado: se ve el canto de las tarjetas de los extremos y el paralaje entre ellas. Los
// números cuentan mientras tanto, y en el beat 4 el bloque se resuelve en una sola tarjeta que se
// viene encima mientras el resto se va hacia atrás.
//
// Tres decisiones que sostienen la escena:
//   · El CUADRO ESTÁ LLENO en vertical: titular arriba, arco al medio, epígrafe + barras abajo, y un
//     eco gigante del número héroe atrás, que casi no se mueve mientras el frente se desplaza.
//   · Los NÚMEROS cuentan con un juego de texturas PRECALCULADAS (9 por tarjeta). Generar una textura
//     por entero sería medio giga de canvas; con 8 pasos se lee igual de bien y cuesta nada.
//   · NADA se apaga con opacidad si puede irse por MÁSCARA: el texto se desescribe, no se funde.

import { E,
  LOOK, b, planoTexto, texto, materialMascara, matAcento, matTarjeta, enArco, nivel, dolly, orbita, MOB } from '../kit.js'
// TODO EL TEXTO SALE DE LOS DATOS. Este archivo decia que el 'chrome' (rotulos de capitulo,
// indicadores tecnicos) era direccion de arte y podia quedar escrito aca — y con esa licencia
// el video de Stripe salia diciendo 'BLOQUE 04 · DATOS' y 'DOS INDICADORES · UNA MISMA
// HISTORIA': castellano del motor, en la pieza de una marca inglesa. Un rotulo de chrome
// delata la plantilla aunque no mienta. Lo unico que puede escribirse a mano son indices sin
// letras (`marca`) y el pie real (`sello`); el gate E-PROCEDENCIA lo hace cumplir.
import { D, esDemo, marca, sello } from '../datos.js'

export const meta = { id: 'tarjetas', beats: 6 }

// ---------------------------------------------------------------- niveles
// El bloom del pase final corta en 0.62 de luminancia LINEAL, y `THREE.Color` ya convierte de sRGB a
// lineal: un #f2f4f8 entra con 0.92 y florece entero. En un glifo fino (DMSans) eso es un halo lindo;
// en un Anton de 0.6 de alto el bloom rellena los contrapunzones y el número se vuelve una mancha.
// Por eso la tipografía GRANDE va apenas por debajo del umbral y la chica se queda en el blanco del
// look. Lo mismo con el acento2 (#00e5c0, luminancia 0.60 a intensidad 1): pasado de 1.0 deja de ser
// un borde y pasa a ser una lámpara que lava el cuadro entero.
// Numero y titular, sobre la escala fondo->tinta. Ver `nivel` en kit.js: escritos como hex fijo
// eran gris claro sobre blanco, o sea nada.
const C_NUM = () => nivel(0.80)
const C_TIT = () => nivel(0.75)

// ---------------------------------------------------------------- el dato
// LAS CIFRAS SON DE LA PÁGINA O NO EXISTEN. Esta lista estaba escrita a mano y, en cuanto la pieza
// empezó a recibir datos reales, el video de un cliente mostraba "300 MARCAS" y "96 CIUDADES" — cifras
// de la demo, presentadas como si fueran suyas. Es la mentira más cara que puede cometer este motor y
// la regla anti-invención existe exactamente para impedirla.
//
// Si la página dio dos cifras, salen DOS tarjetas. No se completa la grilla, no se redondea, no se
// inventa un índice. Los valores de ANTHEM quedan sólo como datos de la propia demo, cuando nadie
// pasó una página.
function datosDeLaPagina() {
  const d = (D.datos || []).filter(x => x && x.etiqueta != null)
  if (!d.length) return []
  return d.slice(0, 5).map((x, i) => ({
    // El valor puede ser "4.9" o "30s": el contador sólo tiene sentido sobre un número entero, así
    // que lo que no es numérico se muestra fijo (n = null) en vez de contar hasta un NaN.
    n: /^\d+$/.test(String(x.valor)) ? parseInt(x.valor, 10) : null,
    txt: String(x.valor),
    et: String(x.etiqueta).toUpperCase(),
    ix: String(i + 1).padStart(2, '0'),
  }))
}
const DEMO = [
  { n: 12, txt: '12', et: 'PAISES', ix: '01' },
  { n: 48, txt: '48', et: 'EQUIPOS', ix: '02' },
  { n: 300, txt: '300', et: 'MARCAS', ix: '03' },
  { n: 96, txt: '96', et: 'CIUDADES', ix: '04' },
  { n: 24, txt: '24', et: 'PREMIOS', ix: '05' },
]
// DATOS, HERO y ORDEN se resuelven a la CANTIDAD real de cifras. Con cinco escritas a mano estos tres
// eran constantes; con dos, un HERO fijo en 2 apunta fuera de la lista y ORDEN pide indices que no
// existen — la escena no falla, dibuja undefined.
const PASOS = 8         // escalones del contador -> 9 texturas por tarjeta

// SE RESUELVE DENTRO DE build(), NO AL IMPORTAR EL MODULO. Evaluado a nivel de modulo, esto corre
// cuando el navegador resuelve el grafo de imports — o sea ANTES de que configurarDatos() haya puesto
// los datos de la pagina. `D` todavia era ANTHEM y el video de un cliente salia con las cifras de la
// demo: 300 MARCAS, 96 CIUDADES. Es exactamente la violacion anti-invencion que este archivo dice
// impedir, y el codigo no fallaba — mentia en silencio.
function resolver() {
  const d = datosDeLaPagina()
  // Las cifras de DEMO son SOLO para la demo. Medido: 7 de 12 fixtures caian en este fallback, y el
  // video de Linear salia diciendo "300 MARCAS / 96 CIUDADES / 24 PREMIOS" — cifras de ANTHEM
  // presentadas como suyas. Sin cifras propias la escena no tiene sujeto y devuelve una lista vacia:
  // el guionista es quien tiene que no elegirla, y un cuadro que falta se ve; una cifra ajena no.
  const DATOS = d.length ? d : (esDemo ? DEMO : [])
  const HERO = Math.min(2, DATOS.length - 1)   // la que se queda: la del medio, o la ultima si hay pocas
  // entran de afuera hacia adentro y la heroe aterriza ULTIMA
  const resto = DATOS.map((_, i) => i).filter(i => i !== HERO)
  const ORDEN = []
  while (resto.length) { ORDEN.push(resto.shift()); if (resto.length) ORDEN.push(resto.pop()) }
  ORDEN.push(HERO)
  return { DATOS, HERO, ORDEN }
}

// geometría de la tarjeta y del arco, en unidades de mundo (cuadro visible: x ±2.81, y ±5)
const CW = 1.24, CH = 1.86, CD = 0.07
const ARCO_R = 4.4, ARCO_A = 1.30, ARCO_Y = 0.06

// cada una llega de un lado distinto: si entran todas del mismo lado se lee como una lista que baja
// Cinco direcciones de entrada. Con menos tarjetas se eligen REPARTIDAS y no las tres primeras:
// tres tarjetas entrando todas desde la izquierda se leen como una lista que baja.
const dirDe = (i, n) => ENTRADAS[n >= 5 ? i : Math.round(i * (ENTRADAS.length - 1) / Math.max(1, n - 1))]
const ENTRADAS = [
  { dx: -3.7, dy: -2.5, dz: -1.7, ry: 1.05, rz: 0.22 },
  { dx: -1.2, dy: 4.5, dz: -1.1, ry: -0.95, rz: -0.18 },
  { dx: 0.0, dy: 0.7, dz: -6.6, ry: 0.85, rz: 0.10 },
  { dx: 1.4, dy: -4.7, dz: -1.1, ry: 0.95, rz: 0.18 },
  { dx: 3.9, dy: 2.7, dz: -1.7, ry: -1.05, rz: -0.22 },
]

export function build(ctx) {
  const { THREE, gsap, camera, distBase, rnd, fondo, pelicula } = ctx
  // MUEBLE DE BORDE: LO PIDE EL AIRE, NO LA ESCENA. Este archivo dibujaba perimetro por su cuenta sin
  // preguntar nunca por MOB, y por eso una pieza que eligio "sin marco" seguia teniendo lineas pegadas
  // a los costados: no las ponia el marco, las ponia la escena. Es el reclamo del usuario visto desde
  // el codigo. Se conserva en las familias donde la caja cerrada ES el punto —las escuadras de camara
  // y los ticks de acotacion— y se retira en las demas.
  const hudBorde = MOB.hud !== false && (MOB.marco === 'escuadras' || MOB.marco === 'ticks')
  const { DATOS, HERO, ORDEN } = resolver()
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  // Sin una sola cifra esta escena no tiene de que hablar. Devuelve un grupo vacio en vez de inventar:
  // el secuenciador lo salta y la pieza queda mas corta, que es la respuesta honesta.
  //
  // VA DESPUES de crear g y tl. Estaba antes, y como son `const` el early return caia en la zona
  // muerta temporal: "Cannot access 'g' before initialization". O sea que el camino honesto —el que
  // se toma justamente cuando la pagina no dio cifras— era el unico que crasheaba.
  if (!DATOS.length) return { g, tl, vacia: true }

  // ------------------------------------------------------------ helpers locales
  // Un plano de texto que se revela por máscara. `materialMascara` SIEMPRE con color: su uniform de
  // tinte es un vec3 y three lo sube aunque no se use — con null revienta al primer render.
  const conMascara = (m, color, dir) => {
    const map = m.material.map
    m.material.dispose()
    m.material = materialMascara(map, color)
    m.material.uniforms.uDir.value = dir
    return m
  }
  const txt = (str, alto, opts, color, dir = 0) => conMascara(planoTexto(str, alto, opts), color, dir)
  const fundible = (mat) => { mat.transparent = true; mat.needsUpdate = true; return mat }
  const regla = (largo, grosor, color, intensidad) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largo, grosor), fundible(matAcento(color, intensidad)))
    return m
  }

  // Contador: en vez de una textura por entero (medio giga de canvas), PASOS+1 texturas fijas y un
  // índice que las intercambia. El plano se construye con el ancho del valor final y se compensa con
  // scale.x, así el glifo mantiene su tamaño aunque el número gane dígitos.
  function contador(alto, valorFinal, size, color, texsPrestadas, arPrestado) {
    let texs = texsPrestadas
    if (!texs) {
      texs = []
      for (let k = 0; k <= PASOS; k++) texs.push(texto(String(Math.round(valorFinal * k / PASOS)), { fuente: 'Anton', size }))
    }
    const arFin = arPrestado || texs[PASOS].ar
    const mat = materialMascara(texs[0].tex, color)
    mat.uniforms.uDir.value = 2                      // se escribe de abajo hacia arriba
    const malla = new THREE.Mesh(new THREE.PlaneGeometry(alto * arFin, alto), mat)
    malla.scale.x = texs[0].ar / arFin
    const poner = (k) => {
      const t = texs[k < 0 ? 0 : k > PASOS ? PASOS : k]
      mat.uniforms.map.value = t.tex
      malla.scale.x = t.ar / arFin
    }
    return { malla, mat, texs, arFin, poner }
  }

  // ------------------------------------------------------------ ECO: el número héroe, gigante, atrás
  // Comparte las texturas de la tarjeta héroe, así que cuenta con ella sin costar una sola textura
  // más. A z=-7.2 casi no se desplaza mientras el frente barre: eso es lo que se lee como profundidad.
  const heroTexs = []
  // Sin numero entero no hay cuenta: se repite la misma textura y la tarjeta simplemente aparece.
  const nHero = DATOS[HERO].n
  for (let k = 0; k <= PASOS; k++) heroTexs.push(texto(nHero == null ? DATOS[HERO].txt : String(Math.round(nHero * k / PASOS)), { fuente: 'Anton', size: 130 }))
  const eco = contador(3.8, nHero == null ? 0 : nHero, 130, nivel(0.22, 0.45), heroTexs, heroTexs[PASOS].ar)
  eco.mat.uniforms.uSuave.value = 0.22
  eco.malla.position.set(0, 0.10, -7.2)
  g.add(eco.malla)

  // ------------------------------------------------------------ bloque superior
  // 'BLOQUE 04 · DATOS' era el nombre interno de la escena impreso en el cuadro, en castellano, en el
  // video de cualquier marca. Un indice ocupa el mismo lugar y no afirma nada.
  const kicker = txt(marca(4, 6), 0.13, { fuente: 'DMSans', size: 64, tracking: 0.34 }, LOOK.acento2, 0)
  kicker.position.set(0, 3.85, 1.20)
  g.add(kicker)

  const titulo = txt(D.marca, 1.05, { fuente: 'Anton', size: 110 }, C_TIT(), 0)
  titulo.position.set(0, 3.10, 1.20)
  g.add(titulo)

  const reglaTit = regla(4.40, 0.030, LOOK.acento, 2.2)
  reglaTit.position.set(0, 2.50, 1.20)
  reglaTit.scale.x = 0
  g.add(reglaTit)

  // El TICK que corre sobre el filete del titular llevando el compás. Vive acá arriba porque es parte
  // del bloque de titular, pero su razón de ser es de TIEMPO y está explicada en la sección EVENTOS.
  // Nace invisible: hasta que las tarjetas no aterrizan no hay nada que marcar.
  const compas = regla(0.42, 0.075, LOOK.acento2, 0.95)
  compas.position.set(-1.85, 2.50, 1.22)
  compas.visible = false
  g.add(compas)

  // ------------------------------------------------------------ bloque inferior
  // El epigrafe DECIA "CINCO INDICADORES" siempre, incluso sobre UNA sola tarjeta. No es ruido de
  // demo: es una afirmacion falsa sobre lo que hay en pantalla, y el espectador la puede contar.
  // Se deriva de la cantidad real.
  // Y SEGUIA SIENDO VOZ DEL MOTOR. Derivarlo de la cantidad real arreglo la parte falsa, no la parte
  // ajena: "DOS INDICADORES · UNA MISMA HISTORIA" es castellano editorial de urvid metido en la pieza
  // de una marca inglesa que jamas dijo eso. En la demo el motor habla de si mismo y esta bien; en el
  // video de un cliente, el renglon lo ocupa el dominio de su propia pagina.
  const NUM = ['CERO', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO']
  const epi = esDemo
    ? (DATOS.length === 1 ? 'UN INDICADOR' : `${NUM[DATOS.length] || DATOS.length} INDICADORES · UNA MISMA HISTORIA`)
    : sello(0)
  const epigrafe = txt(epi, 0.135, { fuente: 'DMSans', size: 72, tracking: 0.16 }, LOOK.tinta, 0)
  epigrafe.position.set(0, -1.70, 0.42)
  g.add(epigrafe)

  const reglaPie = regla(4.90, 0.026, LOOK.acento, 2.2)
  reglaPie.position.set(0, -2.20, 0.42)
  reglaPie.scale.x = 0
  g.add(reglaPie)

  const pieI = txt(D.marca, 0.15, { fuente: 'DMSans', size: 64, tracking: 0.30 }, LOOK.tinta, 0)
  pieI.position.set(-2.38 + 0.15 * pieI.userData.ar / 2, -2.48, 0.42)
  g.add(pieI)
  const pieD = txt('2026', 0.15, { fuente: 'DMSans', size: 64, tracking: 0.30 }, LOOK.acento2, 1)
  pieD.position.set(2.38 - 0.15 * pieD.userData.ar / 2, -2.48, 0.42)
  g.add(pieD)

  // Barras: la banda de abajo no puede quedar negra, y un gráfico abstracto además respira durante
  // todo el travelling. La geometría se traslada media altura para que crezcan desde su base.
  const NB = 26, PASO_B = 0.19
  const barras = new THREE.Group()
  barras.position.set(0, -4.05, 0.42)
  const altoB = [], alt2 = [], per2 = []
  for (let i = 0; i < NB; i++) {
    const h = 0.22 + rnd() * 1.13
    altoB.push(h)
    const geo = new THREE.PlaneGeometry(0.055, h)
    geo.translate(0, h / 2, 0)
    const acentua = i % 5 === 2
    const m = new THREE.Mesh(geo, fundible(matAcento(acentua ? LOOK.acento2 : LOOK.acento, acentua ? 0.95 : 1.10)))
    m.position.x = (i - (NB - 1) / 2) * PASO_B
    m.scale.y = 0
    barras.add(m)
    alt2.push(0.40 + rnd() * 0.95)
    per2.push(rnd())
  }
  g.add(barras)

  const zocalo = regla(4.90, 0.022, LOOK.acento, 1.0)
  zocalo.position.set(0, -4.11, 0.42)
  zocalo.scale.x = 0
  if (hudBorde) g.add(zocalo)

  // ------------------------------------------------------------ las cinco tarjetas
  const tarjetas = []
  // Tantas tarjetas como cifras dio la pagina. El 5 escrito a mano hacia que la escena pidiera
  // DATOS[2] con una lista de dos y muriera leyendo .ix de undefined.
  for (let i = 0; i < DATOS.length; i++) {
    const d = DATOS[i]
    const esHero = i === HERO
    const gr = new THREE.Group()

    // borde de acento: un plano apenas más grande DETRÁS del cuerpo. Al girar, asoma por un canto y
    // no por el otro — que es exactamente lo que delata que hay volumen.
    const rimMat = fundible(matAcento(esHero ? LOOK.acento2 : LOOK.acento, esHero ? 0.95 : 1.10))
    const rim = new THREE.Mesh(new THREE.PlaneGeometry(CW + 0.055, CH + 0.055), rimMat)
    rim.position.z = -CD / 2 - 0.014
    gr.add(rim)

    // cuerpo con espesor real: el travelling lateral necesita un canto que atrape la luz
    // Las tarjetas se levantan del fondo un escalon corto, tenidas hacia el acento de la marca. Con el
    // navy fijo, en una pieza blanca eran rectangulos azul marino plantados en el medio.
    const cuerpoMat = fundible(matTarjeta(nivel(esHero ? 0.13 : 0.09, 0.40)))
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CD), cuerpoMat)
    gr.add(cuerpo)

    const zf = CD / 2 + 0.008
    const idx = txt(d.ix, 0.088, { fuente: 'DMSans', size: 60, tracking: 0.30 }, esHero ? LOOK.acento2 : LOOK.acento, 0)
    idx.position.set(0, CH / 2 - 0.20, zf)
    gr.add(idx)

    const num = contador(0.62, d.n, esHero ? 130 : 80, C_NUM(), esHero ? heroTexs : null, esHero ? heroTexs[PASOS].ar : null)
    num.malla.position.set(0, 0.20, zf)
    gr.add(num.malla)

    const fil = regla(0.70, 0.032, esHero ? LOOK.acento2 : LOOK.acento, esHero ? 0.95 : 2.6)
    fil.position.set(0, -0.24, zf)
    fil.scale.x = 0
    gr.add(fil)

    const lab = txt(d.et, 0.115, { fuente: 'DMSans', size: 76, tracking: 0.16 }, LOOK.tinta, 0)
    lab.position.set(0, -0.47, zf)
    gr.add(lab)

    // barrita de progreso: se llena con el contador, así el número no es el único que avanza
    const anchoP = CW * 0.72
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(anchoP, 0.022), fundible(matAcento(LOOK.acento, 0.5)))
    pista.position.set(0, -0.72, zf)
    pista.material.opacity = 0
    gr.add(pista)
    const geoR = new THREE.PlaneGeometry(anchoP, 0.022)
    geoR.translate(anchoP / 2, 0, 0)
    const relleno = new THREE.Mesh(geoR, fundible(matAcento(esHero ? LOOK.acento2 : LOOK.acento, esHero ? 0.9 : 2.2)))
    relleno.position.set(-anchoP / 2, -0.72, zf + 0.002)
    relleno.scale.x = 0
    gr.add(relleno)

    g.add(gr)
    tarjetas.push({ gr, rim, rimMat, cuerpoMat, idx, num, fil, lab, pista, relleno, esHero })
  }

  // el arco: sólo existe porque hay cámara, y es lo que convierte cinco fichas en una composición
  enArco(tarjetas.map(t => t.gr), ARCO_R, ARCO_A)
  tarjetas.forEach((t, i) => {
    // El 4 estaba escrito a mano —los cinco datos de la demo— y con menos cifras el arco salía
    // TORCIDO. Medido: con dos tarjetas quedaban a 0.060 y 0.145 de alto, o sea una más alta que su
    // par simétrico; con tres subían en escalera 0.060 / 0.145 / 0.230 en vez de arquearse; con cuatro
    // el punto alto caía en la tercera y no en el medio. Y desde que las tarjetas se REPARTEN en el
    // beat 2 y medio esto dejó de ser cosmético: la que cruza no mueve su y, así que el asiento espejo
    // tiene que estar a la MISMA altura o aterriza 0.17 fuera de lugar — toda la amplitud del arco.
    const u = DATOS.length > 1 ? Math.abs(i / (DATOS.length - 1) - 0.5) * 2 : 0
    t.gr.position.y = ARCO_Y + 0.17 * (1 - u)             // 1 en los bordes, 0 en el centro
    t.base = { x: t.gr.position.x, y: t.gr.position.y, z: t.gr.position.z, ry: t.gr.rotation.y }
  })

  // estado del primer frame, explícito: los tweens son fromTo con immediateRender:false para no
  // tocar la cámara ni las capas antes de que el cabezal entre en esta escena
  tarjetas.forEach((t, i) => {
    const e = dirDe(i, DATOS.length)
    t.gr.position.set(t.base.x + e.dx, t.base.y + e.dy, t.base.z + e.dz)
    t.gr.rotation.set(0, t.base.ry + e.ry, e.rz)
    t.gr.scale.setScalar(0.55)
  })

  // ================================================================ TIEMPO
  // Todo cae sobre la grilla de beats. Nada arranca "a los 2.3 segundos".

  // ---------------------------------------------------------------- cámara
  // Beat 0-1.15: viene de más lejos y se acerca. Beat 1.15-4: TRAVELLING LATERAL delante del arco,
  // con una contra-rotación del 70% (no del 100%: si compensa todo, el arco queda clavado al centro
  // y el movimiento se pierde). Beat 4-5.15: vuelve exactamente a su lugar — es contrato.
  tl.fromTo(camera.position, { x: orbita(-0.30), y: orbita(0.18), z: dolly(distBase, 3.30) },
    { x: orbita(-1.45), y: orbita(0.02), z: dolly(distBase, -0.55), duration: b(1.15), ease: E.frena(4), immediateRender: false }, 0)
  tl.fromTo(camera.rotation, { x: 0, y: 0, z: 0 },
    { x: orbita(0.004), y: orbita(-0.050), z: orbita(0.012), duration: b(1.15), ease: E.frena(4), immediateRender: false }, 0)

  tl.to(camera.position, { x: orbita(1.62), duration: b(2.85), ease: E.vaiven() }, b(1.15))
  tl.to(camera.rotation, { y: orbita(0.058), duration: b(2.85), ease: E.vaiven() }, b(1.15))
  // el acercamiento se queda en -1.70: más adentro y el bloque de titular se sale por arriba
  tl.to(camera.position, { z: dolly(distBase, -1.70), duration: b(1.45), ease: E.vaiven() }, b(1.15))
  tl.to(camera.position, { z: dolly(distBase, -0.60), duration: b(1.40), ease: E.vaiven() }, b(2.60))
  tl.to(camera.position, { y: orbita(-0.16), duration: b(1.60), ease: E.vaiven() }, b(1.15))
  tl.to(camera.position, { y: orbita(0.05), duration: b(1.25), ease: E.vaiven() }, b(2.75))
  tl.to(camera.rotation, { x: orbita(-0.006), z: orbita(-0.016), duration: b(1.60), ease: E.vaiven() }, b(1.15))
  tl.to(camera.rotation, { x: orbita(0.004), z: orbita(0.008), duration: b(1.25), ease: E.vaiven() }, b(2.75))

  tl.to(camera.position, { x: 0, y: 0, z: distBase, duration: b(1.15), ease: E.vaiven(3) }, b(4.0))
  tl.to(camera.rotation, { x: 0, y: 0, z: 0, duration: b(1.15), ease: E.vaiven(3) }, b(4.0))

  // ---------------------------------------------------------------- fondo y pase final
  tl.fromTo(fondo.uPulso, { value: 0 }, { value: 0.42, duration: b(0.18), ease: E.frena(2), immediateRender: false }, 0)
  tl.to(fondo.uPulso, { value: 0, duration: b(1.10), ease: E.frena(2) }, b(0.18))
  tl.fromTo(fondo.uGrilla, { value: 0.55 }, { value: 0.74, duration: b(1.40), ease: E.vaiven(), immediateRender: false }, b(1.0))
  tl.to(fondo.uGrilla, { value: 0.26, duration: b(0.70), ease: E.acelera(2) }, b(3.90))
  tl.to(fondo.uGrilla, { value: 0.55, duration: b(1.00), ease: E.vaiven() }, b(4.80))
  tl.fromTo(fondo.uPulso, { value: 0.55 }, { value: 0, duration: b(1.00), ease: E.frena(2), immediateRender: false }, b(4.0))
  // dos frames de blanco sobre el beat 4: el corte interno se lee como decisión de montaje
  tl.fromTo(pelicula.uFlash, { value: 0.30 }, { value: 0, duration: 0.075, ease: E.acelera(2), immediateRender: false }, b(4.0))

  // ---------------------------------------------------------------- titular, epígrafe, barras
  tl.fromTo(kicker.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.45), ease: E.frena(2), immediateRender: false }, b(0.20))
  tl.fromTo(titulo.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.85), ease: E.vaiven(3), immediateRender: false }, b(0.32))
  tl.fromTo(titulo.position, { y: 3.37 }, { y: 3.10, duration: b(0.90), ease: E.llega(2.0), immediateRender: false }, b(0.32))
  tl.fromTo(reglaTit.scale, { x: 0 }, { x: 1, duration: b(0.70), ease: E.frena(3), immediateRender: false }, b(0.55))
  tl.fromTo(epigrafe.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.80), ease: E.frena(2), immediateRender: false }, b(0.85))
  tl.fromTo(reglaPie.scale, { x: 0 }, { x: 1, duration: b(0.75), ease: E.frena(3), immediateRender: false }, b(0.62))
  tl.fromTo(zocalo.scale, { x: 0 }, { x: 1, duration: b(0.80), ease: E.frena(3), immediateRender: false }, b(0.48))
  tl.fromTo(pieI.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.50), ease: E.frena(2), immediateRender: false }, b(0.75))
  tl.fromTo(pieD.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.50), ease: E.frena(2), immediateRender: false }, b(0.82))
  tl.fromTo(eco.mat.uniforms.uProg, { value: 0 }, { value: 1, duration: b(1.20), ease: E.frena(2), immediateRender: false }, b(0.75))

  for (let i = 0; i < NB; i++) {
    const m = barras.children[i]
    tl.fromTo(m.scale, { y: 0 }, { y: 1, duration: b(0.60), ease: E.llega(2.2), immediateRender: false }, b(0.55) + i * 0.016)
    // respiración: cada barra con su propio período, así el bloque nunca queda quieto
    const s = b(1.90) + i * 0.010 + per2[i] * 0.08
    tl.to(m.scale, { y: alt2[i], duration: (b(3.90) - s) / 2, ease: E.vaiven(), repeat: 1, yoyo: true }, s)
    tl.to(m.scale, { y: 0, duration: b(0.45), ease: E.acelera(3) }, b(4.0) + (NB - 1 - i) * 0.008)
  }

  // ---------------------------------------------------------------- entrada de las tarjetas
  ORDEN.forEach((i, p) => {
    const t = tarjetas[i], e = dirDe(i, DATOS.length), base = t.base
    const t0 = p * 0.07                                  // stagger: nunca llegan juntas
    tl.fromTo(t.gr.position,
      { x: base.x + e.dx, y: base.y + e.dy, z: base.z + e.dz },
      { x: base.x, y: base.y, z: base.z, duration: b(0.72), ease: E.llega(1.9), immediateRender: false }, t0)
    tl.fromTo(t.gr.rotation, { y: base.ry + e.ry, z: e.rz },
      { y: base.ry, z: 0, duration: b(0.80), ease: E.llega(1.6), immediateRender: false }, t0)
    tl.fromTo(t.gr.scale, { x: 0.55, y: 0.55, z: 0.55 },
      { x: 1, y: 1, z: 1, duration: b(0.70), ease: E.llega(2.3), immediateRender: false }, t0)

    // el contenido se escribe mientras la tarjeta todavía está frenando
    const tc = t0 + 0.16
    tl.fromTo(t.idx.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.40), ease: E.frena(2), immediateRender: false }, tc - 0.03)
    tl.fromTo(t.fil.scale, { x: 0 }, { x: 1, duration: b(0.50), ease: E.llega(2.6), immediateRender: false }, tc)
    tl.fromTo(t.num.mat.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.62), ease: E.frena(3), immediateRender: false }, tc + 0.05)
    tl.fromTo(t.pista.material, { opacity: 0 }, { opacity: 1, duration: b(0.40), ease: E.frena(2), immediateRender: false }, tc + 0.06)
    tl.fromTo(t.lab.material.uniforms.uProg, { value: 0 }, { value: 1, duration: b(0.55), ease: E.frena(2), immediateRender: false }, tc + 0.10)

    // ------------------------------------------------------------ el número CUENTA
    const est = { v: 0 }
    const esHero = i === HERO
    tl.to(est, {
      v: 1, duration: b(2.15), ease: E.frena(2),
      onUpdate: () => {
        const k = Math.round(est.v * PASOS)
        t.num.poner(k)
        t.relleno.scale.x = est.v
        if (esHero) eco.poner(k)                          // el eco gigante cuenta con la héroe
      },
    }, b(1.0) + p * 0.05)

    // ------------------------------------------------------------ flotación
    // repeat:3 + yoyo termina en el valor de PARTIDA: la tarjeta vuelve exacto a su base en el beat 4
    // y la salida arranca de un valor limpio. El desfasaje sale de rnd(), no de un múltiplo.
    const fs = b(1.50) + rnd() * 0.22
    const amp = (0.05 + rnd() * 0.08) * (rnd() < 0.5 ? -1 : 1)
    tl.to(t.gr.position, { y: base.y + amp, duration: (b(4.0) - fs) / 4, ease: E.vaiven(), repeat: 3, yoyo: true }, fs)
    const fs2 = b(1.55) + rnd() * 0.24
    const gir = (rnd() < 0.5 ? -1 : 1) * 0.024
    tl.to(t.gr.rotation, { z: gir, duration: (b(4.0) - fs2) / 4, ease: E.vaiven(), repeat: 3, yoyo: true }, fs2)
  })

  // ================================================================ EVENTOS ADENTRO DE LA ESCENA
  // Medido contra la pieza hecha a mano: el motor mueve 0.118 de píxeles contra 0.226 y corta 44 veces
  // por minuto contra 55. La causa no es el ritmo del guion: es que las escenas cortan SOLO en su
  // frontera. Acá se veía crudo — entre que las tarjetas aterrizan (beat 1) y que la escena se resuelve
  // (beat 4) hay dos beats y medio en los que lo único que cambia es un dígito. Eso es movimiento
  // continuo con CERO eventos, y un evento —algo que aparece, salta o se reemplaza— es lo único que el
  // ojo cuenta como corte.
  //
  // Lo que sigue no reescribe la escena: le mete golpes adentro. Todo está escrito para N tarjetas,
  // porque la página pudo haber dado UNA sola cifra: nada de esto asume que hay un vecino.

  // ---------------------------------------------------------------- el compás
  // Un filete quieto es una línea; uno que SALTA cada medio beat es un metrónomo, y le da al tramo
  // muerto una referencia de tiempo sin taparle nada al contador. Salta con `set` y no con un tween:
  // medio beat de deslizamiento suave es exactamente lo que NO sube el ritmo de corte.
  const PASOS_C = [-1.85, -1.11, -0.37, 0.37, 1.11, 1.85]
  tl.set(compas, { visible: true }, b(1.0))
  PASOS_C.forEach((x, j) => {
    const k = b(1.0 + j * 0.5)
    tl.set(compas.position, { x }, k)
    // Fuerte en el beat, débil en el contratiempo. Seis saltos del mismo tamaño se leen como un objeto
    // que se arrastra; con la diferencia de peso se leen como un pulso.
    tl.set(compas.scale, { x: j % 2 ? 0.5 : 1, y: j % 2 ? 0.45 : 1 }, k)
  })
  tl.set(compas, { visible: false }, b(4.0))

  // ---------------------------------------------------------------- el filete de cada tarjeta
  // CONTRATIEMPO DE VERDAD: en el medio EXACTO entre dos ticks. Esto decía b(1.55), b(2.05), b(2.55)…
  // o sea 0.05 de beat DESPUÉS del tick — 24 ms — y a los 30 cuadros por segundo a los que se rinde
  // esto es el mismo cuadro o el siguiente. Medido sobre la timeline: el tick caía en el cuadro 30 y
  // el filete también; en el 37 y el 38; en el 44 y el 45. Los dos golpes se leían como UNO y la
  // escena pagaba dos eventos para cobrar uno — exactamente lo que este comentario decía evitar. En el
  // cuarto de beat el ojo los cuenta separados, que es todo el punto.
  //
  // No hay golpe antes de b(1.75) porque la entrada del filete corre hasta b(1.41) en la última
  // tarjeta y un `set` pisado por un tween vivo no se ve. Tampoco hay uno en b(2.75): ahí las tarjetas
  // están de canto por el reparto y el filete no existe en pantalla. El de b(3.25) sí queda, aunque
  // caiga de canto, porque lo que se ve es su RESULTADO cuando la tarjeta vuelve a mirar a cámara.
  //
  // Y ALTERNAN EN DAMERO, no en barrido con desfasaje. El desfasaje era de 12 ms por tarjeta: 0.36 de
  // cuadro, así que las cinco saltaban en el MISMO cuadro y el barrido no existía. Para que se leyera
  // hacía falta un cuadro entero por tarjeta —0.33 de beat con cinco cifras— y hasta el tick siguiente
  // hay un cuarto de beat: no entra, y la última tarjeta terminaba cruzándose al corte. Con pares e
  // impares en contrafase el golpe es simultáneo, no hay nada que se pueda ir a la escena de al lado,
  // y la fila igual cambia de dibujo entera.
  const OFF = [1.75, 2.25, 3.25, 3.75]
  tarjetas.forEach((t, i) => {
    OFF.forEach((k, j) => {
      // El último golpe deja TODOS los filetes enteros: si la escena se resuelve con el de la héroe a
      // media asta, la tarjeta se va al primer plano mostrando algo que parece a medio dibujar.
      const entero = j === OFF.length - 1 || (i + j) % 2 === 1
      tl.set(t.fil.scale, { x: entero ? 1 : 0.44 }, b(k))
    })
  })

  // ---------------------------------------------------------------- beat 1 y medio: la héroe se adelanta
  // El contador subiendo dos beats es INFORMACIÓN, no imagen: el número cambia y la composición no. Un
  // empujón corto de la tarjeta que ya es el sujeto de la escena resuelve las dos cosas —marca quién
  // manda antes de que el beat 4 lo diga, y mete un evento donde no había ninguno—. Y es lo único de
  // todo este bloque que funciona IGUAL con una tarjeta que con cinco: la héroe siempre existe.
  //
  // SALE EN b(1.5) Y VUELVE EN b(2.0), sobre el tick y no entre dos. Estaba en b(1.72) y b(2.06), que
  // no son ni beat ni medio beat: el empujón caía cinco cuadros después del tick y se leía como un
  // movimiento suelto en vez de como el golpe fuerte del compás. Un evento que no cae en la grilla no
  // suma ritmo, sólo suma movimiento — y de movimiento esta escena ya andaba sobrada.
  const h = tarjetas[HERO]
  tl.to(h.gr.position, { z: h.base.z + 1.30, duration: b(0.34), ease: E.llega(2.6) }, b(1.5))
  tl.to(h.gr.scale, { x: 1.09, y: 1.09, z: 1.09, duration: b(0.34), ease: E.llega(2.6) }, b(1.5))
  // El borde late y vuelve solo con repeat+yoyo. Encadenado a mano pedía una tercera marca de tiempo
  // —b(1.90)— que no caía en ningún lado de la grilla y sólo existía para empalmar dos tweens.
  tl.fromTo(h.rim.scale, { x: 1, y: 1 }, { x: 1.08, y: 1.05, duration: b(0.25), ease: E.frena(2), repeat: 1, yoyo: true, immediateRender: false }, b(1.5))
  tl.to(h.gr.position, { z: h.base.z, duration: b(0.40), ease: E.acelera(2) }, b(2.0))
  tl.to(h.gr.scale, { x: 1, y: 1, z: 1, duration: b(0.40), ease: E.acelera(2) }, b(2.0))

  // ------------------------------------------------------- beat 2 y medio: el arco se DA VUELTA
  // Las tarjetas se reparten de nuevo: cada una se va al lugar de su espejo. Es el evento más grande
  // que admite esta composición sin dejar de ser ella misma —el arco sigue siendo el arco, cambia
  // quién ocupa cada asiento—.
  //
  // TRES COSAS QUE HAY QUE HACER BIEN O NO FUNCIONA:
  //  · Se gira hasta 1.25 rad y NUNCA hasta pi/2 o más. Los planos de texto son DoubleSide: pasado el
  //    canto, el número se lee al revés. A 1.25 la tarjeta ya se ve como un filo (cos = 0.32) y el
  //    cambio de asiento no se percibe como un teletransporte.
  //  · El par espejo comparte la MISMA z del arco (cos es simétrico), así que sin separarlos se
  //    atraviesan. Las de la izquierda pasan por delante y las de la derecha por detrás — que es cómo
  //    se reparten unas cartas de verdad.
  //  · Se mueven x y z, NO y. La flotación es dueña de y durante todo este tramo y dos tweens sobre la
  //    misma propiedad se pelean por el último render. Se puede no tocarla porque el arco es SIMÉTRICO
  //    y el asiento espejo está exactamente a la misma altura — con el arco torcido que había antes
  //    (ver el `u` de más arriba) la que cruzaba aterrizaba 0.17 arriba o abajo de su asiento.
  //
  // CON UNA SOLA TARJETA el espejo es ella misma: no hay viaje, y queda el giro de canto con el paso
  // atrás. Sigue siendo un evento duro, que es lo que se vino a buscar — no se inventa un vecino.
  const espejo = i => DATOS.length - 1 - i
  tarjetas.forEach((t, i) => { t.destino = tarjetas[espejo(i)].base })
  // ARRANCA EN b(2.5), sobre el cuarto tick. Estaba en b(2.60): 0.1 de beat después, que a 30 cuadros
  // es cuadro y medio — el tick quedaba tapado por el evento más grande de la escena y se perdía. Un
  // golpe grande que cae SOBRE el pulso lo confirma; uno que cae un cuadro y medio tarde lo borra.
  const VUELTA = b(2.5)
  tarjetas.forEach((t, i) => {
    const d = t.destino
    const izq = i < (DATOS.length - 1) / 2
    const s = VUELTA + i * 0.028                        // stagger: se reparten, no saltan en bloque
    tl.to(t.gr.rotation, { y: t.base.ry + (izq ? 1.25 : -1.25), duration: b(0.26), ease: E.acelera(2) }, s)
    tl.to(t.gr.position, { x: (t.base.x + d.x) / 2, z: d.z + (izq ? 0.95 : -0.95), duration: b(0.22), ease: E.acelera(2) }, s + b(0.18))
    tl.to(t.gr.position, { x: d.x, z: d.z, duration: b(0.26), ease: E.frena(2) }, s + b(0.40))
    tl.to(t.gr.rotation, { y: d.ry, duration: b(0.42), ease: E.llega(2.0) }, s + b(0.52))
  })

  // El reparto se puntúa con el mismo vocabulario que el corte del beat 4: dos frames de blanco y un
  // golpe de fondo. Sin eso el movimiento se lee como que se movió la cámara; con eso se lee como una
  // decisión de montaje, que es lo que es. El blanco NO cae en el arranque —decía que lo "anunciaba" y
  // no era cierto—: cae a 0.14 de beat, con las tarjetas a mitad de giro, que es el instante feo del
  // reparto y el único que conviene tapar.
  //
  // Estos tres son satélites del golpe de b(2.5), no eventos propios: por eso cuelgan de VUELTA y no
  // de la grilla. Un satélite no tiene que caer en el pulso — el que cae en el pulso es su dueño.
  tl.fromTo(pelicula.uFlash, { value: 0.22 }, { value: 0, duration: 0.06, ease: E.acelera(2), immediateRender: false }, VUELTA + b(0.14))
  tl.fromTo(fondo.uPulso, { value: 0.34 }, { value: 0, duration: b(0.60), ease: E.frena(2), immediateRender: false }, VUELTA + b(0.14))
  tl.to(fondo.uGrilla, { value: 0.38, duration: b(0.14), ease: E.acelera(2) }, VUELTA)
  tl.to(fondo.uGrilla, { value: 0.74, duration: b(0.50), ease: E.frena(2) }, VUELTA + b(0.20))
  // El eco gigante contra-desliza: es lo único que distingue "las tarjetas cambiaron de lugar" de "se
  // movió el punto de vista". Vuelve a 0 antes del beat 4, donde lo espera su propia salida.
  tl.to(eco.malla.position, { x: -0.62, duration: b(0.45), ease: E.vaiven() }, VUELTA)
  tl.to(eco.malla.position, { x: 0, duration: b(0.55), ease: E.vaiven() }, VUELTA + b(0.50))

  // ---------------------------------------------------------------- beat 4: se resuelve en una
  tl.to(h.gr.position, { x: 0, y: 0, z: 12.2, duration: b(1.20), ease: E.llega(1.2) }, b(4.0))
  tl.to(h.gr.rotation, { x: 0, y: 0, z: 0, duration: b(1.00), ease: E.frena(2) }, b(4.0))
  tl.to(h.gr.scale, { x: 1.06, y: 1.06, z: 1.06, duration: b(1.20), ease: E.llega(1.4) }, b(4.0))
  tl.fromTo(h.rim.scale, { x: 1, y: 1 }, { x: 1.05, y: 1.035, duration: b(0.35), ease: E.frena(2), immediateRender: false }, b(4.0))
  tl.to(h.rim.scale, { x: 1, y: 1, duration: b(0.55), ease: 'elastic.out(1, 0.45)' }, b(4.35))
  // hasta el corte no descansa: sigue empujando y el borde late
  tl.to(h.gr.position, { z: 12.85, duration: b(0.65), ease: E.vaiven() }, b(5.20))
  tl.to(h.gr.rotation, { y: 0.045, duration: b(0.65), ease: E.vaiven() }, b(5.20))
  tl.to(h.rimMat, { opacity: 0.5, duration: b(0.50), ease: E.vaiven(), repeat: 1, yoyo: true }, b(4.85))

  // las otras se van hacia atrás, acelerando (power3.in): el obturador las arrastra al irse
  tarjetas.forEach((t, i) => {
    if (i === HERO) return
    // SE VA DESDE EL ASIENTO QUE OCUPA, no desde el que tenía antes del reparto. Con `t.base` una
    // tarjeta que acababa de cruzarse al otro lado salía volando de vuelta hacia donde ya no estaba:
    // atravesaba el cuadro entero en 0.9 beats y el corte se leía como un error. Y el lado del giro
    // sale del signo de esa x, no del índice, por lo mismo.
    const base = t.destino
    const s = base.x < 0 ? -1 : 1
    const d = b(4.0) + (2 - Math.abs(i - HERO)) * 0.035
    // La y también sale del asiento ocupado. Con el arco simétrico las dos son el mismo número, pero
    // leerla de `t.base` dejaba escrito que no lo eran — y es justo lo que estaba roto un rato arriba.
    tl.to(t.gr.position, { x: base.x * 2.15 + s * 0.5, y: base.y + (i % 2 ? -0.95 : 0.95), z: base.z - 6.4, duration: b(0.90), ease: E.acelera(3) }, d)
    tl.to(t.gr.rotation, { y: base.ry + s * 0.85, z: s * 0.22, duration: b(0.90), ease: E.acelera(2) }, d)
    tl.to(t.gr.scale, { x: 0.62, y: 0.62, z: 0.62, duration: b(0.90), ease: E.acelera(3) }, d)
    tl.to([t.num.mat.uniforms.uProg, t.idx.material.uniforms.uProg, t.lab.material.uniforms.uProg],
      { value: 0, duration: b(0.45), ease: E.acelera(2), stagger: 0.03 }, d + 0.06)
    tl.to([t.rimMat, t.cuerpoMat, t.fil.material, t.pista.material, t.relleno.material],
      { opacity: 0, duration: b(0.55), ease: E.acelera(2) }, d + 0.14)
  })

  // y el cuadro se despeja: el texto se DESESCRIBE, no se funde
  tl.to([kicker.material.uniforms.uProg, titulo.material.uniforms.uProg, epigrafe.material.uniforms.uProg,
    pieI.material.uniforms.uProg, pieD.material.uniforms.uProg, eco.mat.uniforms.uProg],
  { value: 0, duration: b(0.55), ease: E.acelera(2), stagger: 0.035 }, b(4.0))
  tl.to([reglaTit.scale, reglaPie.scale, zocalo.scale], { x: 0.02, duration: b(0.60), ease: E.acelera(3), stagger: 0.035 }, b(4.0))
  tl.to(titulo.position, { y: 4.00, duration: b(0.70), ease: E.acelera(2) }, b(4.0))
  tl.to(epigrafe.position, { y: -2.55, duration: b(0.70), ease: E.acelera(2) }, b(4.0))
  tl.to(eco.malla.position, { z: -11.5, duration: b(0.80), ease: E.acelera(2) }, b(4.0))

  // Se suelta el freno ANTES de devolverla. GSAP nace la timeline pausada (contrato) pero un hijo
  // pausado tiene _ts = 0, y el bucle de render del padre saltea a los hijos con _ts = 0: la maestra
  // movía su cabezal y esta escena se quedaba clavada en el frame 0. No la deja correr sola, porque
  // el secuenciador la adopta en el mismo tick —sin que corra el ticker— dentro de una maestra que sí
  // está pausada: el tiempo lo sigue poniendo el seek de afuera.
  tl.paused(false)

  return { g, tl }
}
