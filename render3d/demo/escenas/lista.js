// ESCENA "lista" — lo que la pagina enumera, enumerado. Alineada a la IZQUIERDA.
//
// POR QUE EXISTE
// El diagnostico que abrio este trabajo fue "toda escena es centrada". Un catalogo entero compuesto
// sobre el mismo eje se percibe como un solo video con distinta paleta, y es exactamente lo que
// hacia que dos piezas de rubros opuestos se vieran iguales. Esta escena existe para romper ese eje:
// bandera a la izquierda, numeros colgados en el margen y una linea vertical que los ata. Es la
// composicion mas vieja del diseño editorial y ninguna escena del motor la estaba usando.
//
// Y ADEMAS ENUMERA, que no es lo mismo que mostrar. `tipografia` reparte las mismas frases por el
// cuadro como impactos sueltos; aca van una debajo de la otra, numeradas, y eso las convierte en un
// INVENTARIO: el espectador entiende "hay cuatro cosas" antes de leer ninguna.
//
// QUE CUENTA COMO ITEM DE LISTA
// `frases` viene mezclada a proposito: el primer elemento suele ser el claim partido en DOS
// RENGLONES (lleva \n) y detras vienen los titulos de feature y los pasos, cortos y de una sola
// linea. Un titular de dos renglones no es un item de lista — numerarlo lo degrada a viñeta y ademas
// rompe la grilla, porque mide el doble de alto que sus vecinos. Asi que el filtro es la forma del
// material y no un campo nuevo: item de lista = frase de UNA sola linea.
//
// SIN TRES ITEMS NO HAY LISTA. Con dos es un par, y un par numerado se lee como un error de conteo.
// No se rellena: se declara vacia y el guionista es quien no deberia haberla elegido.

import { LOOK, b, E, texto, nivel, matAcento, materialMascara, CLARO, finMascara, deriva, encaje } from '../kit.js'
import { D } from '../datos.js'

export const meta = { id: 'lista', beats: 6 }

const MAX_ITEMS = 4
const MIN_ITEMS = 3

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---- el material que hay
  // SE TOMAN LAS ULTIMAS, NO LAS PRIMERAS, y es para no repetir lo que la pieza ya dijo.
  // `frases` la consumen tres escenas: `tipografia` las recorre todas, `partida` usa las DOS primeras
  // y esta usa cuatro. Tomando tambien desde el principio, una pieza con `tipografia` cerca mostraba
  // el mismo copy palabra por palabra dos veces en diez segundos — visto en el render de basecamp:
  // "01 BIG NUMBERS. / 02 REMEMBER WHEN" son exactamente las dos frases que la escena anterior acababa
  // de pasar. Desde el final, en cuanto la pagina da cinco o mas, la lista enumera material que el
  // espectador todavia no vio.
  //
  // OJO: con cuatro frases justas las tres escenas siguen coincidiendo, porque no hay de donde sacar
  // mas. Eso NO se arregla acá — se arregla en el guion, decidiendo cuantas escenas de texto entran
  // segun el material que hay. Queda anotado ahi.
  const todas = (D.frases || [])
    .filter(f => f && !String(f).includes('\n'))
    .map(f => String(f).trim())
    .filter(Boolean)
  const items = todas.slice(-MAX_ITEMS)
  if (items.length < MIN_ITEMS) {
    tl.to({}, { duration: DUR }, 0)
    return { g, tl, vacia: true }
  }

  // ---- geometria: bandera a la izquierda
  const MARGEN = -mundoW * 0.40
  const SANGRIA = mundoW * 0.15                 // donde arranca el texto: los numeros COLGAN a su izquierda
  const ALTO_NUM = mundoH * 0.030
  const ALTO_BASE = mundoH * 0.050
  const ANCHO_UTIL = mundoW * 0.86 - SANGRIA

  // Se MIDE y se achica el bloque entero si el item mas largo no entra. Un item que se sale por la
  // derecha es el defecto que la primera version de `cita` mostro en el render de basecamp.com: el
  // ancho de un renglon no lo decide la cantidad de letras sino la fuente que eligio el aire.
  // Los items se marcan con `userData.encaja = true` para que E-ENCAJE compruebe que entraron: sin
  // esa marca nadie lo mira, porque `encuadre-check` solo pregunta si la pieza se CRUZA con el cuadro
  // (sangrar es una decision de composicion valida) y no si entro entera.
  const FUENTE_ITEM = { fuente: 'Anton', peso: 400, size: 150, tracking: 0.004, upper: true, alineado: 'left' }
  const texs = items.map(t => texto(t, FUENTE_ITEM))
  const ALTO_ITEM = encaje(ALTO_BASE, Math.max(...texs.map(t => t.ar)), ANCHO_UTIL)
  const PASO = Math.max(ALTO_ITEM, ALTO_BASE * 0.62) * 1.95

  // El bloque se centra vertical: con tres items o con cuatro, la lista queda a la misma altura
  // optica y no "cuelga" de arriba cuando la pagina dio uno menos.
  const TOPE = ((items.length - 1) * PASO) / 2

  // COLOR POR MUNDO: el tope de 0.80 existe por el bloom, que solo muerde en mundo oscuro (la display
  // por encima del umbral 0.62 florece entera y sale sin contraformas). En mundo claro el riesgo es
  // el opuesto —un gris que se lava contra el fondo— y conviene empujar hacia la tinta.
  const COLOR_ITEM = nivel(CLARO ? 0.94 : 0.80)
  const COLOR_NUM = nivel(CLARO ? 0.62 : 0.52)
  const FIN = finMascara()                       // 1 + uSuave: ver la nota del revelado, abajo

  // ---- la linea vertical que ata la lista
  // Es lo que convierte cuatro renglones sueltos en UNA lista. Crece de arriba hacia abajo con los
  // items, asi que ademas marca el progreso sin ser una barra de progreso.
  const riel = new THREE.Mesh(
    new THREE.PlaneGeometry(mundoW * 0.006, (items.length - 1) * PASO + ALTO_ITEM * 1.6),
    matAcento(LOOK.acento, 1.1),
  )
  riel.geometry.translate(0, -((items.length - 1) * PASO + ALTO_ITEM * 1.6) / 2, 0)   // crece desde arriba
  riel.position.set(MARGEN - mundoW * 0.035, TOPE + ALTO_ITEM * 0.8, -0.02)
  riel.scale.y = 0.001
  g.add(riel)

  // ---- los items
  const filas = []
  for (let i = 0; i < items.length; i++) {
    const y = TOPE - i * PASO

    // El numero. Va en el margen, COLGADO a la izquierda del texto: es la sangria francesa de
    // cualquier lista impresa, y es lo que hace que el ojo lea la columna de numeros como un indice.
    const tn = texto(String(i + 1).padStart(2, '0'), { fuente: 'DMSans', peso: 500, size: 90, tracking: 0.08, upper: true, alineado: 'left', color: COLOR_NUM })
    const matN = materialMascara(tn.tex, COLOR_NUM)
    const mN = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_NUM * tn.ar, ALTO_NUM), matN)
    mN.position.set(MARGEN + (ALTO_NUM * tn.ar) / 2, y + ALTO_ITEM * 0.30, 0)
    g.add(mN)

    // El texto del item, anclado por su borde izquierdo a la sangria.
    const t = texs[i]
    const matT = materialMascara(t.tex, COLOR_ITEM)
    const mT = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_ITEM * t.ar, ALTO_ITEM), matT)
    mT.position.set(MARGEN + SANGRIA + (ALTO_ITEM * t.ar) / 2, y, 0)
    mT.userData.encaja = true      // un item de lista que se sale no es una lista
    g.add(mT)

    filas.push({ matN, matT, mT })
  }

  // ================================================================ TIEMPO
  // DERIVA CONTINUA. La compuerta exige que nada quede quieto mas de un beat y lo mide sobre
  // matrixWorld: mover la camara no alcanza porque los objetos no se enteran. Va como UN tween sobre
  // un reloj con las propiedades escritas a mano — `modifiers` de GSAP no corre si la propiedad no
  // esta tambien en vars, y esa trampa ya costo cuatro heroes que nunca flotaron.
  deriva(tl, DUR, u => {
    g.position.x = -u * mundoW * 0.020            // la lista deriva hacia el margen mientras se lee
    g.position.y = Math.sin(u * Math.PI * 1.3) * mundoH * 0.006
  })

  // ---- el riel primero: establece la columna antes de que llegue el primer item
  tl.fromTo(riel.scale, { y: 0.001 }, { y: 1, duration: b(0.75), ease: E.frena(3), immediateRender: false }, 0)

  // ---- UN ITEM POR BEAT: son los eventos duros de la escena
  // La metrica de movimiento cuenta pixeles que cruzan un umbral de luma entre cuadros, y lo que la
  // mueve son EVENTOS, no deriva. Cuatro items que se escriben en cuatro beats son cuatro eventos.
  //
  // EL REVELADO TERMINA EN 1.06 Y NO EN 1: la mascara calcula smoothstep(uProg, uProg-uSuave, e), asi
  // que con uProg=1 la banda suave cae exactamente en el canto y la ultima letra de cada renglon
  // queda lavada para siempre. Se vio en el render de `cita` sobre basecamp.com; pantalla.js y
  // destello.js ya lo sabian (usan 1.11 y 1.10).
  const T0 = b(0.35)
  const PASO_BEAT = b(1.0)
  filas.forEach((f, i) => {
    const t0 = T0 + i * PASO_BEAT
    // El numero entra ANTES que su texto: primero aparece el orden, despues lo que dice. Invertido se
    // lee como que el numero llega tarde a etiquetar algo que ya estaba.
    tl.fromTo(f.matN.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.30), ease: E.frena(2), immediateRender: false }, t0)
    tl.fromTo(f.matT.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.52), ease: E.frena(2), immediateRender: false }, t0 + b(0.12))
    // Un empuje corto desde la izquierda: el item "aterriza" en su renglon en vez de aparecer.
    tl.fromTo(f.mT.position, { x: f.mT.position.x - mundoW * 0.05 }, { x: f.mT.position.x, duration: b(0.42), ease: E.llega(1.8), immediateRender: false }, t0 + b(0.12))
  })

  // ---- salida: se apaga de abajo hacia arriba, contra el orden de entrada
  const SALIDA = DUR - b(0.42)
  filas.forEach((f, i) => {
    const d = (filas.length - 1 - i) * b(0.04)
    tl.to(f.matT.uniforms.uProg, { value: 0, duration: b(0.30), ease: E.acelera(2) }, SALIDA + d)
    tl.to(f.matN.uniforms.uProg, { value: 0, duration: b(0.26), ease: E.acelera(2) }, SALIDA + d)
  })
  tl.to(riel.scale, { y: 0.001, duration: b(0.34), ease: E.acelera(3) }, SALIDA)

  // ---- camara: un paneo lateral corto que se devuelve
  // Devolverla es CONTRATO: la escena siguiente arranca en (0,0,distBase) y si esta la deja corrida,
  // el corte se lee como un salto. El `set` final es el seguro ante cualquier ajuste de tempo.
  tl.fromTo(camera.position, { x: -0.14 }, { x: 0.10, duration: DUR * 0.72, ease: E.vaiven(), immediateRender: false }, 0)
  tl.to(camera.position, { x: 0, duration: DUR * 0.28, ease: E.vaiven() }, DUR * 0.72)
  tl.fromTo(camera.position, { z: distBase + 0.22 }, { z: distBase - 0.10, duration: DUR * 0.82, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, DUR - 0.001)

  return { g, tl }
}
