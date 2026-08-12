// PLANTILLA "reticula" — tipografia cinetica sobre una reticula infinita, con la camara descendiendo.
//
// EL GESTO
// Es la mas sobria de la boveda y la que mas se apoya en el TIPO. Una reticula de blueprint que se
// pierde en el horizonte, la camara bajando despacio, y el texto ensamblandose sobre ella. No hay
// objetos: el volumen lo da la perspectiva de la grilla y la profundidad de campo del polvo.
//
// Existe porque no toda marca quiere un objeto. Un estudio de arquitectura, una consultora, un banco:
// para esos el poliedro giratorio es ruido, y lo que corresponde es tipografia grande sobre un plano
// que se lee como plano tecnico.
//
// LOS SEIS TIEMPOS (beats sobre 36)
//   0   ESPACIO   la reticula sola, la camara descendiendo. Nada de texto.
//   4   MARCA     el nombre se ensambla desde tres bandas que llegan de los costados.
//   10  PROMESA   el claim, en dos renglones, sobre una cama que se abre desde el centro.
//   16  PRUEBA    la pagina se levanta del piso de la reticula como una lamina.
//   24  RAZONES   las cifras caen en columna, alineadas a la izquierda del cuadro.
//   30  PEDIDO    la camara se detiene y el CTA queda centrado sobre la reticula.

import { THREE, letras, parrafo, cama, luz, barra, iluminar, domo, polvo, panelPagina } from '../nucleo.js'
import { LOOK, hex, nivel, nivelTexto, E, b, recortesDe, planoRecorte, topeNitido } from '../../demo/kit.js'
import { D, sello, repartirFrases } from '../../demo/datos.js'

export const meta = {
  id: 'reticula',
  nombre: 'Retícula técnica',
  familia: 'tipografica',
  necesita: ['nada'],
  beats: 36,
  tiempos: { espacio: 0, marca: 4, promesa: 10, prueba: 16, razones: 24, pedido: 30 },
  pitch: 'Tipografía grande sobre una retícula de plano técnico. Sobria, sin objetos, muy legible.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase, texturas, datosEls } = ctx
  const uso = {}

  iluminar(escena, { key: 1.0, relleno: 0.4 })
  const uDomo = domo(escena, { fuerza: 0.16 })
  polvo(escena, 700, 26)

  // ---------------------------------------------------------------- la reticula
  // Un plano enorme acostado, con la grilla dibujada en el shader. Dibujarla con lineas de geometria
  // costaria miles de mallas y encima se aliasea; en el shader se puede hacer que la linea mantenga un
  // grosor CONSTANTE EN PANTALLA, que es lo que hace que la perspectiva se lea limpia hasta el fondo.
  const grilla = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uCol: { value: hex(LOOK.acento) }, uCol2: { value: hex(nivel(0.35)) },
        uPaso: { value: 2.2 }, uT: { value: 0 },
      },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 uCol, uCol2; uniform float uPaso, uT; varying vec2 vP;',
        'float linea(float x, float w){ float f = abs(fract(x) - 0.5); return 1.0 - smoothstep(0.0, w, f); }',
        'void main(){',
        '  vec2 g = vP / uPaso;',
        // El ancho de linea crece con la derivada: asi la linea mide lo mismo en pantalla cerca y lejos,
        // en vez de convertirse en una masa gris en el horizonte.
        '  vec2 w = fwidth(g) * 1.2;',
        '  float m = max(linea(g.x, w.x), linea(g.y, w.y));',
        // Cada cinco, una linea mas marcada: le da escala al plano. Sin eso la grilla no dice cuan lejos
        // esta el horizonte.
        '  vec2 g5 = vP / (uPaso * 5.0); vec2 w5 = fwidth(g5) * 1.2;',
        '  float m5 = max(linea(g5.x, w5.x), linea(g5.y, w5.y));',
        '  float d = length(vP);',
        '  float fade = 1.0 - smoothstep(30.0, 150.0, d);',
        '  vec3 c = mix(uCol2, uCol, m5);',
        '  float a = (m * 0.35 + m5 * 0.55) * fade;',
        '  if (a < 0.004) discard;',
        '  gl_FragColor = vec4(c, a);',
        '}',
      ].join('\n'),
    }))
  grilla.rotation.x = -Math.PI / 2
  grilla.position.y = -mundoH * 0.52
  escena.add(grilla)

  // ---------------------------------------------------------------- 2 · MARCA
  const gMarca = new THREE.Group()
  gMarca.position.set(0, 0.9, 0)
  escena.add(gMarca)
  const marca = letras(D.marca || 'MARCA', 1.5, nivelTexto(0.94), { fuente: 'Anton', tracking: 0.02, anchoMax: mundoW * 0.9 })
  gMarca.add(marca)
  uso.marca = !!D.marca
  const rot = String(D.rotulo || sello(0) || '').trim()
  let rotM = null
  if (rot) {
    rotM = letras(rot, 0.20, nivelTexto(0.70), { fuente: 'DMSans', tracking: 0.32, anchoMax: mundoW * 0.7 })
    rotM.position.y = -1.15
    gMarca.add(rotM)
  }
  const fil = barra(marca.userData.ancho, 0.03, LOOK.acento, 1.2)
  fil.position.y = -0.82
  fil.scale.x = 0.0001
  gMarca.add(fil)

  // ---------------------------------------------------------------- 3 · PROMESA
  const gClaim = new THREE.Group()
  gClaim.position.set(0, 0.4, 0)
  escena.add(gClaim)
  let claimM = null
  const claim = String(D.claim || '').trim()
  if (claim) {
    // EN PARRAFO, NO EN UNA LINEA. Con `letras` y un tope de ancho, una frase larga se achica hasta
    // caber: el claim de basecamp salio ocupando el 92% del ancho y el 3% del alto. Entraba y no se
    // leia. `parrafo` la parte en renglones y conserva el cuerpo.
    claimM = parrafo(claim, 0.62, nivelTexto(0.92),
      { fuente: 'Bricolage', anchoMax: mundoW * 0.86, upper: false, maxLineas: 3 })
    const cm = cama(claimM.userData.ancho, claimM.userData.alto, { opacidad: 0.90, color: nivel(0.02) })
    cm.scale.x = 0.0001
    gClaim.add(cm); gClaim.add(claimM)
    gClaim.userData.cama = cm
    uso.claim = true
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  const gPag = new THREE.Group()
  gPag.position.set(0, -0.2, 0)
  pagina.add(gPag)
  const ANCHO_P = mundoW * 0.56, ALTO_P = ANCHO_P * 1.55
  let panel = panelPagina(texturas.get('tira'), ANCHO_P, ALTO_P)
  if (!panel) {
    for (const e of recortesDe(datosEls, ['foto', 'tarjeta', 'logo'], 1)) {
      const t = texturas.get(e.url)
      if (!t || !t.image) continue
      const ar = (t.image.width || 1) / (t.image.height || 1)
      const w = Math.min(ANCHO_P, topeNitido(t.image, ctx.W, mundoW, 1.4))
      panel = planoRecorte(t, w / Math.max(0.05, ar)); break
    }
  }
  if (panel) { gPag.add(panel); uso.pagina = true }

  // ---------------------------------------------------------------- 5 · RAZONES
  const cifras = ((D.datos || []).filter(d => d && d.valor)).slice(0, 3)
  const gRaz = new THREE.Group()
  gRaz.position.set(-mundoW * 0.30, 1.2, 0)
  escena.add(gRaz)
  const filasCifra = []
  cifras.forEach((c, i) => {
    const g = new THREE.Group()
    g.position.y = -i * 1.35
    gRaz.add(g)
    const val = letras(String(c.valor), 0.80, hex(LOOK.acento2 || LOOK.acento), { fuente: 'Anton', anchoMax: mundoW * 0.5 })
    val.position.x = val.userData.ancho / 2
    g.add(val)
    const et = letras(String(c.etiqueta || ''), 0.16, nivelTexto(0.74), { fuente: 'DMSans', tracking: 0.24, anchoMax: mundoW * 0.55 })
    et.position.set(et.userData.ancho / 2, -0.58, 0)
    g.add(et)
    filasCifra.push({ val, et })
  })
  uso.cifras = cifras.length

  const gFrase = new THREE.Group()
  escena.add(gFrase)
  const frases = repartirFrases(1).filter(Boolean)
  let fraseM = null
  if (frases.length) {
    fraseM = parrafo(String(frases[0]).replace(/\n/g, ' '), 0.30, nivelTexto(0.86),
      { fuente: 'DMSans', anchoMax: mundoW * 0.80, upper: false, maxLineas: 2 })
    fraseM.position.set(0, -2.6, 0)
    const cf = cama(fraseM.userData.ancho, fraseM.userData.alto, { opacidad: 0.86, color: nivel(0.02) })
    cf.position.copy(fraseM.position)
    // VAN EN SU PROPIO GRUPO, y esto es un defecto que costo caro y que es facil de repetir.
    //
    // Estaban colgados de `escena` directo, mientras el resto del tiempo de RAZONES cuelga de `gRaz` y
    // se apaga con el. O sea que la CAMA —una placa blanca de mundoW * 0.8— quedaba encendida durante
    // los 36 beats: en las fotos aparece una losa blanca fija en el medio de todos los cuadros, incluso
    // en los tiempos donde no hay ninguna frase que sostener.
    //
    // La regla que queda: en Boveda, todo lo que pertenece a un tiempo cuelga del grupo de ese tiempo.
    // Una cama huerfana no se ve como un error de codigo: se ve como una decision de diseño horrible.
    gFrase.add(cf); gFrase.add(fraseM)
    uso.frases = 1
  }

  // ---------------------------------------------------------------- 6 · PEDIDO
  const gCTA = new THREE.Group()
  gCTA.position.set(0, 0.1, 0)
  escena.add(gCTA)
  const ctaTxt = String(D.cta || '').trim()
  let pill = null, ctaM = null
  if (ctaTxt) {
    ctaM = letras(ctaTxt, 0.32, hex(LOOK.bg), { fuente: 'DMSans', tracking: 0.10, anchoMax: mundoW * 0.6 })
    pill = new THREE.Mesh(new THREE.PlaneGeometry(ctaM.userData.ancho + 1.0, 0.86), luz(LOOK.acento, 1.0))
    pill.renderOrder = -1
    gCTA.add(pill); gCTA.add(ctaM)
    uso.cta = true
  }
  const dom = String(D.dominio || D.marca || '').trim()
  let domM = null
  if (dom) {
    domM = letras(dom, 0.21, nivelTexto(0.90), { fuente: 'DMSans', tracking: 0.24, anchoMax: mundoW * 0.7 })
    domM.position.y = ctaTxt ? -0.95 : 0
    const cd = cama(domM.userData.ancho, domM.userData.alto, { opacidad: 0.92, color: nivel(0.0) })
    cd.position.y = domM.position.y
    gCTA.add(cd); gCTA.add(domM)
    uso.dominio = true
  }

  // ================================================================ TIEMPO
  //
  // ACA LA CAMARA NO VUELA: DESCIENDE Y SE ACERCA. Los grupos estan todos en z=0 y se encienden y
  // apagan por turno, asi que no hay que derivar posiciones de la trayectoria — es la otra manera de
  // resolver el problema que `atrio` resuelve con `zEn`, y esta plantilla existe tambien para tener
  // las dos formas en la boveda.
  // LAS DISTANCIAS SE MIDEN CONTRA `distBase`, QUE ES DONDE EL MUNDO MIDE `mundoH` DE ALTO. Un texto
  // compuesto a 1.5 de alto ocupa el 15% del cuadro EN `distBase` y la mitad de eso al doble. La
  // primera version puso la camara en 1.35 y ademas la hizo mirar a un punto SEIS unidades detras del
  // contenido: las dos cosas juntas dejaron la pieza entera diminuta en un cuadro blanco.
  camara.position.set(0, 2.1, distBase * 1.10)
  tl.to(camara.position, { y: 0.25, z: distBase * 0.98, duration: b(16), ease: E.frena(1.6) }, 0)
  tl.to(camara.position, { y: 0.05, z: distBase * 0.94, duration: b(14), ease: 'none' }, b(16))
  tl.to(camara.position, { y: 0, z: distBase * 0.92, duration: b(6), ease: E.frena(2) }, b(30))
  // Mira apenas por debajo del PLANO DEL CONTENIDO, no detras: deja la reticula en el tercio inferior
  // —que es lo que la hace leer como piso y no como pared— sin alejar el texto.
  const mira = new THREE.Vector3(0, -0.55, 0)

  const enc = (m, t0, dur, dir) => {
    if (!m) return
    m.userData.u.uProg.value = 0
    if (dir != null) m.userData.u.uDir.value = dir
    tl.to(m.userData.u.uProg, { value: 1.04, duration: b(dur), ease: E.frena(2) }, b(t0))
  }
  const apag = (m, t0) => {
    if (!m) return
    tl.set(m.userData.u.uDir, { value: 1 }, b(t0))
    tl.to(m.userData.u.uProg, { value: 0, duration: b(0.7), ease: E.acelera(2) }, b(t0))
  }

  // 2 · MARCA
  gMarca.visible = false
  tl.set(gMarca, { visible: true }, b(4))
  enc(marca, 4, 1.4)
  tl.to(fil.scale, { x: 1, duration: b(1.0), ease: E.frena(3) }, b(5.0))
  enc(rotM, 5.4, 0.8)
  apag(marca, 9.0); apag(rotM, 9.1)
  tl.to(fil.scale, { x: 0.0001, duration: b(0.5), ease: E.acelera(3) }, b(9.2))
  tl.set(gMarca, { visible: false }, b(10.2))

  // 3 · PROMESA
  gClaim.visible = false
  tl.set(gClaim, { visible: true }, b(10))
  if (claimM) {
    tl.to(gClaim.userData.cama.scale, { x: 1, duration: b(0.7), ease: E.frena(3) }, b(10))
    claimM.userData.escribir(tl, 10.5, 1.1, 0.42)
    claimM.userData.borrar(tl, 15.0)
    tl.to(gClaim.userData.cama.scale, { x: 0.0001, duration: b(0.5), ease: E.acelera(3) }, b(15.4))
  }
  tl.set(gClaim, { visible: false }, b(16))

  // 4 · PRUEBA — la lamina se levanta del piso
  gPag.visible = false
  if (panel) {
    tl.set(gPag, { visible: true }, b(16))
    gPag.rotation.x = -Math.PI / 2.1
    gPag.position.y = -mundoH * 0.42
    tl.to(gPag.rotation, { x: 0, duration: b(2.6), ease: E.frena(2.2) }, b(16))
    tl.to(gPag.position, { y: -0.15, duration: b(2.6), ease: E.frena(2.2) }, b(16))
    tl.to(gPag.rotation, { y: 0.30, duration: b(4.0), ease: E.vaiven() }, b(19))
    tl.to(gPag.scale, { x: 0.0001, y: 0.0001, duration: b(0.6), ease: E.acelera(3) }, b(23.4))
    tl.set(gPag, { visible: false }, b(24.1))
  }

  // 5 · RAZONES
  gRaz.visible = false
  tl.set(gRaz, { visible: true }, b(24))
  gFrase.visible = false
  tl.set(gFrase, { visible: true }, b(24))
  filasCifra.forEach((f, i) => {
    enc(f.val, 24 + i * 1.5, 0.6, 2)
    enc(f.et, 24.3 + i * 1.5, 0.6)
  })
  if (fraseM) fraseM.userData.escribir(tl, 25.2, 0.9, 0.35)
  filasCifra.forEach((f, i) => { apag(f.val, 29.2 + i * 0.12); apag(f.et, 29.3 + i * 0.12) })
  if (fraseM) fraseM.userData.borrar(tl, 29.2)
  tl.set(gRaz, { visible: false }, b(30.2))
  tl.set(gFrase, { visible: false }, b(30.2))

  // 6 · PEDIDO
  gCTA.visible = false
  tl.set(gCTA, { visible: true }, b(30))
  if (pill) {
    pill.scale.set(0.0001, 1, 1)
    tl.to(pill.scale, { x: 1, duration: b(0.8), ease: E.frena(3) }, b(30))
    enc(ctaM, 30.4, 0.8)
    for (const bt of [32.5, 34.5]) {
      tl.to(gCTA.scale, { x: 1.03, y: 1.03, duration: b(0.15), ease: E.frena(2) }, b(bt))
      tl.to(gCTA.scale, { x: 1, y: 1, duration: b(0.5), ease: 'elastic.out(1, 0.5)' }, b(bt) + b(0.15))
    }
  }
  enc(domM, 31.2, 0.9)

  const alSeek = (t) => {
    uDomo.uT.value = t
    camara.lookAt(mira)
    grilla.material.uniforms.uT.value = t
    // La reticula deriva hacia la camara: es lo que convierte "una grilla" en "avanzar sobre una grilla".
    grilla.position.z = (t * 1.35) % 11.0
  }

  return { dur: b(meta.beats), alSeek, uso }
}
