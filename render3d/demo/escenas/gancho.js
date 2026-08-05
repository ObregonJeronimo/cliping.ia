// ESCENA "gancho" — los primeros dos segundos. Va ANTES de la marca.
//
// POR QUE EXISTE, Y POR QUE ROMPE LA UNICA REGLA QUE NO SE ROMPIA
// El guion tenia una regla innegociable: la apertura va primera. Es correcta para una pieza de marca —
// son las dos escenas que hacen que una sucesion de planos se lea como pieza— y es equivocada para el
// unico lugar donde estos videos se ven, que es un feed. En un feed nadie decide seguir mirando porque
// le mostraron un logo: decide en los primeros dos segundos, y decide sobre si le prometieron algo.
// Un logo estatico de dos segundos es la señal de scroll mas confiable que existe.
//
// Asi que la regla pasa a ser: la marca va primera ENTRE LAS ESCENAS DE MARCA. Adelante puede ir una
// promesa, y solo una promesa.
//
// QUE MUESTRA, Y POR QUE NO PUEDE MOSTRAR OTRA COSA
// La promesa de la pagina —`D.claim`, la description que la marca escribio— a cuerpo de cartel. No un
// rotulo, no el nombre, no una frase de seccion: lo unico que responde "que hago por vos". Si la pagina
// no tiene description no hay gancho, y la pieza abre como abria: es preferible empezar por la marca
// que empezar por un encabezado de seccion puesto en cuerpo gigante.
//
// COMO SE VA — EL ENLACE CON LA APERTURA
// El bloque se ACHICA hacia el centro mientras se apaga. La apertura entra con su rotulo y su claim en
// cuerpo chico justo ahi: no es un match cut de verdad —dos escenas del motor no comparten estado, cada
// una devuelve la camara a su marca y el compositor hace la transicion— pero el gesto de escala hace
// que el corte se lea como que el mismo texto se acomodo, y no como que empezo otra cosa.
//
// CUATRO BEATS Y NO SEIS. Es un gancho: si dura mas deja de ser la entrada y pasa a ser una escena de
// texto mas, compitiendo con `tipografia` por lo mismo que ella hace mejor.

import { LOOK, b, E, texto, nivel, matAcento, materialMascara, CLARO, finMascara, deriva, encaje, dolly } from '../kit.js'
import { D, marcarClaimUsado } from '../datos.js'

export const meta = { id: 'gancho', beats: 4 }

// Cuantos renglones. Tres es el maximo que deja un cuerpo de cartel: con cuatro, una promesa larga baja
// al tamaño de un parrafo y deja de ser un gancho.
const MAX_LINEAS = 3

// Reparte en `n` renglones lo mas parejos posible. Es la misma cuenta que usa `titular`, y esta duplicada
// a proposito: cuantos renglones entran es una decision de composicion de CADA escena, y compartirla
// obligaria a las dos a moverse juntas.
function enLineas(t, n) {
  const pal = String(t).split(/\s+/).filter(Boolean)
  if (pal.length <= 1 || n <= 1) return [pal.join(' ')]
  const objetivo = Math.ceil(String(t).length / n)
  const lineas = []
  let actual = ''
  for (const p of pal) {
    const cand = actual ? actual + ' ' + p : p
    if (actual && cand.length > objetivo && lineas.length < n - 1) { lineas.push(actual); actual = p }
    else actual = cand
  }
  if (actual) lineas.push(actual)
  return lineas
}

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---- el material que hay
  const claim = String(D.claim || '').trim()
  if (!claim) {
    tl.to({}, { duration: DUR }, 0)
    return { g, tl, vacia: true }
  }
  // Se AVISA que la promesa ya se uso. `titular` la queria para su portada y con las dos escenas en la
  // misma pieza el espectador leia dos veces la misma linea, que es exactamente el defecto que el
  // mostrador de frases vino a resolver. Quien la toma primero se la queda; la otra cae a su respaldo.
  marcarClaimUsado()

  // (los renglones se eligen mas abajo, cuando ya estan ANCHO_UTIL y ALTO_BASE)

  // ---- geometria: bandera a la izquierda, cuerpo de cartel
  // A la izquierda y no centrado: el ojo entra por ahi y el primer cuadro tiene que dar la primera
  // palabra sin que nadie la busque. Ademas separa el gancho de la apertura, que compone al centro.
  const MARGEN = -mundoW * 0.42
  const ANCHO_UTIL = mundoW * 0.84
  const ALTO_BASE = mundoH * 0.088                  // cuerpo de cartel: casi el 9% del alto por renglon
  // EL COLOR TIENE DOS TRAMPAS Y LAS PISE LAS DOS.
  //
  // (1) `nivel(x)` interpola de FONDO a TINTA, no de claro a oscuro: vale para las dos polaridades. Un
  //     `CLARO ? 0.06 : 0.94` pone el texto casi del color del fondo en las paginas claras — en el
  //     render de basecamp salio blanco sobre celeste, ilegible. Se sube en las DOS, y en la clara un
  //     poco mas, porque ahi no hay bloom que ayude a despegarlo.
  //
  // (2) EN MUNDO OSCURO NO PUEDE PASAR EL UMBRAL DE FLORACION. El bloom de esta pieza no atenua: o el
  //     pixel queda debajo del umbral y no florece nada, o lo pasa y entra entero. La tinta a 0.94 se
  //     va muy por encima y un cartel que ocupa medio cuadro se convierte en una mancha con halo. Es
  //     exactamente el presupuesto de luz que documenta `toro`: la tipografia vive DEBAJO del umbral y
  //     el halo se lo quedan los filetes, que es donde el bloom es una herramienta y no una averia.
  const COLOR = nivel(CLARO ? 0.96 : 0.62)

  const FUENTE = { fuente: 'Anton', peso: 400, size: 190, tracking: 0.004, upper: true, alineado: 'left' }

  // CUANTOS RENGLONES: TRES, SALVO QUE TRES DEJEN EL CARTEL ILEGIBLE.
  //
  // `MAX_LINEAS = 3` es una decision de composicion y sigue siendo la de siempre. El problema aparece
  // con claims largos: `encaje` achica el bloque entero hasta que el renglon mas ancho entre, asi que
  // tres renglones largos dan un cuerpo chico. Medido con los 4 claims reales del repo (78 a 87
  // caracteres) sobre los 11 aires, el peor cuerpo de esta escena cae a **35 px** de alto sobre 1920 —
  // por debajo de los 38 px que `hero.js` declara como 'el limite donde la cosa deja de leerse'.
  //
  // Con un renglon mas el mismo texto entra mas grande, porque cada renglon es mas corto: medido, de
  // 43-53 px a 60-67. Asi que se prueban 3, 4 y 5 y se toma EL PRIMERO que pase el piso. Una pagina de
  // claim corto no se entera —tres renglones ya le sobran— y solo cambian de forma las que hoy salen
  // ilegibles, que es la unica parte que hay que cambiar.
  //
  // El piso es el mismo numero y la misma medida que usa `hero.js`, no uno nuevo: si algun dia se
  // decide que 38 px no es el limite, se cambia en un lugar y las dos escenas lo siguen.
  const PISO_LEGIBLE = mundoH * 0.020
  let lineas = enLineas(claim, MAX_LINEAS)
  let texs = lineas.map(l => texto(l, FUENTE))
  for (const n of [MAX_LINEAS + 1, MAX_LINEAS + 2]) {
    if (encaje(ALTO_BASE, Math.max(...texs.map(t => t.ar)), ANCHO_UTIL) >= PISO_LEGIBLE) break
    const otras = enLineas(claim, n)
    if (otras.length <= lineas.length) break            // el texto no da para mas renglones
    lineas = otras
    texs = lineas.map(l => texto(l, FUENTE))
  }
  // El bloque entero se achica hasta que el renglon MAS ANCHO entre: si se midiera renglon por renglon,
  // cada uno saldria de un cuerpo distinto y el bloque dejaria de leerse como un bloque.
  const ALTO_L = encaje(ALTO_BASE, Math.max(...texs.map(t => t.ar)), ANCHO_UTIL)
  const PASO = ALTO_L * 1.16
  const TOPE = ((lineas.length - 1) * PASO) / 2

  // `cont` existe para que la SALIDA tenga su propia propiedad: la deriva continua escribe `g`, y dos
  // escritores sobre la misma posicion dejan de ser deterministas. Es la trampa que el kit documenta.
  const cont = new THREE.Group()
  g.add(cont)

  const FIN = finMascara()
  const filas = []
  lineas.forEach((l, i) => {
    const t = texs[i]
    const mat = materialMascara(t.tex, COLOR)
    mat.uniforms.uDir.value = i % 2 ? 1 : 0          // alternado: cada renglon se escribe hacia su lado
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_L * t.ar, ALTO_L), mat)
    m.position.set(MARGEN + (ALTO_L * t.ar) / 2, TOPE - i * PASO, 0)
    m.userData.encaja = true                          // un gancho cortado por el margen no es un gancho
    cont.add(m)
    filas.push({ m, mat })
  })

  // ---- la barra de acento que subraya el bloque. Es lo unico que no es tipografia, y entra primero:
  // sin ella el primer cuadro es un cuadro vacio esperando que se escriba la primera palabra.
  const barra = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_UTIL, mundoH * 0.010), matAcento(LOOK.acento, 1.3))
  barra.geometry.translate(ANCHO_UTIL / 2, 0, 0)
  barra.position.set(MARGEN, TOPE + ALTO_L * 0.95, 0.1)
  barra.scale.x = 0.001
  cont.add(barra)

  // ================================================================ TIEMPO
  // Deriva minima: la compuerta pide que nada descanse mas de un beat y lo mide sobre matrixWorld.
  deriva(tl, DUR, (u) => {
    g.position.x = Math.sin(u * Math.PI * 1.15) * mundoW * 0.007
    g.position.y = -u * mundoH * 0.010
  })

  // La barra primero, y despues UN RENGLON POR MEDIO BEAT. A beat entero, una promesa de tres renglones
  // no termina de escribirse antes de que la escena se acabe.
  tl.fromTo(barra.scale, { x: 0.001 }, { x: 1, duration: b(0.32), ease: E.frena(4), immediateRender: false }, 0)
  filas.forEach((f, i) => {
    const t0 = b(0.18 + i * 0.5)
    tl.fromTo(f.mat.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.46), ease: E.frena(3), immediateRender: false }, t0)
    // Y llega empujado desde su propio lado: el renglon aterriza en vez de aparecer.
    const desde = f.m.position.x + (i % 2 ? 1 : -1) * mundoW * 0.06
    tl.fromTo(f.m.position, { x: desde }, { x: f.m.position.x, duration: b(0.52), ease: E.llega(1.8), immediateRender: false }, t0)
  })

  // ---- SALIDA: el bloque se achica hacia el centro. Ver la nota de arriba — es lo que hace que la
  // apertura, que compone su claim en cuerpo chico, se lea como continuacion y no como otro tema.
  const SAL = DUR - b(0.72)
  tl.to(cont.scale, { x: 0.34, y: 0.34, duration: b(0.72), ease: E.acelera(2) }, SAL)
  tl.to(cont.position, { x: -MARGEN * 0.55, y: -TOPE * 0.34, duration: b(0.72), ease: E.acelera(2) }, SAL)
  filas.forEach((f, i) => {
    tl.set(f.mat.uniforms.uDir, { value: i % 2 ? 0 : 1 }, SAL + b(0.10))
    tl.to(f.mat.uniforms.uProg, { value: 0, duration: b(0.40), ease: E.acelera(2) }, SAL + b(0.10) + i * b(0.05))
  })
  tl.to(barra.scale, { x: 0.001, duration: b(0.34), ease: E.acelera(3) }, SAL)

  // ---- camara: un acercamiento corto que se DEVUELVE. Contrato: la escena siguiente arranca en su marca.
  tl.fromTo(camera.position, { z: dolly(distBase, 0.55) }, { z: dolly(distBase, -0.16), duration: DUR * 0.78, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.22, ease: E.vaiven() }, DUR * 0.78)

  return { g, tl }
}
