// ESCENA "lista" — lo que la pagina dice, en bandera a la IZQUIERDA. Ya NO enumera.
//
// POR QUE EXISTE
// El diagnostico que abrio este trabajo fue "toda escena es centrada". Un catalogo entero compuesto
// sobre el mismo eje se percibe como un solo video con distinta paleta, y es exactamente lo que
// hacia que dos piezas de rubros opuestos se vieran iguales. Esta escena existe para romper ese eje:
// bandera a la izquierda contra una regla de margen. Es la composicion mas vieja del diseño
// editorial y ninguna escena del motor la estaba usando.
//
// YA NO ENUMERA, Y QUITARLO ARREGLA UN PROBLEMA DE VERACIDAD, no de gusto. Numeraba las frases 01,
// 02, 03, 04 — y las frases son los ENCABEZADOS de la pagina en orden de documento, no los pasos de
// un procedimiento. El ordinal AFIRMA que hay una secuencia, y esa secuencia la inventaba la escena.
// En el render de basecamp se veia el resultado: "01 BIG NUMBERS. / 02 REMEMBER WHEN / 03 PICK A
// PACKAGE / 04 THE SAME CORE", cuatro fragmentos numerados como si fueran un manual. Thiago: "esta
// lista no tiene sentido, esta muy perdida, no deberia de ser una lista sino un texto libre".
//
// Se conserva la unica razon por la que la escena existe: el EJE. Bandera a la izquierda contra un
// catalogo compuesto al centro. La regla del margen se queda —es una barra de citacion, no una
// viñeta— y los ordinales se van. Queda un bloque de texto libre, que es lo que el material fue
// siempre.
//
// Y ADMITE FRASES DE DOS RENGLONES. Antes las filtraba porque un item del doble de alto rompia la
// grilla NUMERADA; sin numeros no hay grilla que romper. Con los titulos completos —que ahora llegan
// enteros desde el extractor— la mayoria viene compuesta en dos renglones, y filtrarlas dejaba la
// escena vacia en las dos paginas medidas.
//
// SIN TRES FRASES NO HAY BLOQUE. Con dos es un par, y para un par ya esta `partida`. No se rellena.

import { LOOK, b, E, texto, nivel, matAcento, materialMascara, CLARO, finMascara, deriva, encaje, dolly, orbita } from '../kit.js'
import { repartirFrases } from '../datos.js'

export const meta = { id: 'lista', beats: 6 }

// TRES Y NO CUATRO: con los titulos completos cada frase ocupa dos renglones, y cuatro de esas son
// ocho lineas de texto — un parrafo, no un bloque de display.
const MAX_ITEMS = 3
const MIN_ITEMS = 3

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase } = ctx
  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)

  // ---- el material que hay
  // DEL MOSTRADOR. Antes tomaba las ULTIMAS frases para no repetir lo que la pieza ya habia dicho, y su
  // propio comentario admitia que no alcanzaba: con cuatro frases justas las tres escenas de texto
  // coinciden igual. El arreglo no era local y ahora esta donde corresponde — ver `repartirFrases`.
  const items = repartirFrases(MAX_ITEMS).map(f => String(f).trim()).filter(Boolean)
  if (items.length < MIN_ITEMS) {
    tl.to({}, { duration: DUR }, 0)
    return { g, tl, vacia: true }
  }

  // ---- geometria: bandera a la izquierda
  const MARGEN = -mundoW * 0.40
  // SIN SANGRIA FRANCESA: existia para que los ordinales colgaran a la izquierda del texto. Sin
  // ordinales, el texto arranca contra el margen y el bloque gana el 15% del ancho que ocupaban.
  const SANGRIA = 0
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
  // POR RENGLON, NO POR BLOQUE. `t.ar` es ancho/alto del BLOQUE de textura, y `texto()` hace crecer el
  // canvas con la cantidad de lineas: un item de dos renglones tiene la MITAD de proporcion que el mismo
  // texto en uno. Tomando el max se elegia siempre el de UNA linea, ALTO_ITEM salia calibrado para el, y
  // el de dos renglones repartia ese mismo alto entre sus dos lineas — o sea que salia a la mitad de
  // cuerpo que sus vecinos, en una lista donde todos los items tienen la misma jerarquia.
  //
  // Es el caso ESPERADO y no el raro: la linea 49 llama `repartirFrases(MAX_ITEMS)` SIN el flag
  // `soloUnaLinea` (partida.js:35 si lo pasa), y la cabecera de este archivo dice que las frases de dos
  // renglones se admiten a proposito.
  //
  // Normalizar por lineas pone a todos los items a medir lo mismo POR RENGLON, que es lo que el ojo
  // compara. El item de dos renglones ocupa el doble de alto, que es correcto: tiene el doble de texto.
  const LINEAS = items.map(t => String(t).split(String.fromCharCode(10)).length)
  const arPorRenglon = texs.map((t, i) => t.ar * LINEAS[i])
  const ALTO_ITEM = encaje(ALTO_BASE, Math.max(...arPorRenglon), ANCHO_UTIL)
  const PASO = Math.max(ALTO_ITEM, ALTO_BASE * 0.62) * 1.95

  // El bloque se centra vertical: con tres items o con cuatro, la lista queda a la misma altura
  // optica y no "cuelga" de arriba cuando la pagina dio uno menos.
  const TOPE = ((items.length - 1) * PASO) / 2

  // COLOR POR MUNDO: el tope de 0.80 existe por el bloom, que solo muerde en mundo oscuro (la display
  // por encima del umbral 0.62 florece entera y sale sin contraformas). En mundo claro el riesgo es
  // el opuesto —un gris que se lava contra el fondo— y conviene empujar hacia la tinta.
  const COLOR_ITEM = nivel(CLARO ? 0.94 : 0.80)
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

  // `cont` le da a la CASCADA su propia propiedad. La deriva continua ya escribe `g.position.y`, y dos
  // escritores sobre la misma propiedad dejan de ser deterministas — es la trampa que el kit documenta
  // y que ya costo una vez en `partida`.
  const cont = new THREE.Group()
  g.add(cont)

  // ---- los items
  const filas = []
  for (let i = 0; i < items.length; i++) {
    const y = TOPE - i * PASO

    // El texto del item, anclado por su borde izquierdo a la sangria.
    const t = texs[i]
    const matT = materialMascara(t.tex, COLOR_ITEM)
    const mT = new THREE.Mesh(new THREE.PlaneGeometry(ALTO_ITEM * t.ar, ALTO_ITEM), matT)
    mT.position.set(MARGEN + SANGRIA + (ALTO_ITEM * t.ar) / 2, y, 0)
    mT.userData.encaja = true      // una frase que se sale por el margen derecho no se lee
    cont.add(mT)

    filas.push({ matT, mT })
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
  // CASCADA: CADA FRASE LLEGA DESDE EL FONDO Y EMPUJA A LA ANTERIOR HACIA ARRIBA.
  //
  // Antes entraban con un empuje lateral de 0.05 del ancho y se quedaban en su renglon: tres frases
  // apiladas que aparecen es una lista estatica con revelado, y una lista estatica es lo que el ojo
  // saltea. El bloque tiene que ARMARSE delante del espectador.
  //
  // Cada frase entra desde z negativo con overshoot —llega, se pasa un poco y se acomoda— y el bloque
  // entero sube medio paso en cada beat, asi que la que estaba arriba se corre para hacerle lugar. Es
  // la unica forma de que un bloque de texto tenga movimiento propio sin que el texto se mueva mientras
  // se lee: el desplazamiento ocurre ENTRE frase y frase, y en el reposo todo esta quieto.
  //
  // EL BLOQUE ARRANCA ABAJO Y TERMINA CENTRADO. Se compensa el corrimiento acumulado en la posicion de
  // partida, asi que la ultima frase deja la composicion exactamente donde el resto de la escena la
  // espera — el riel y el margen no se enteran.
  const SUBE = PASO * 0.5
  cont.position.y = -SUBE * (filas.length - 1) / 2
  filas.forEach((f, i) => {
    const t0 = T0 + i * PASO_BEAT
    tl.fromTo(f.matT.uniforms.uProg, { value: 0 }, { value: FIN, duration: b(0.46), ease: E.frena(3), immediateRender: false }, t0 + b(0.10))
    // Desde el fondo, con overshoot: el gesto de `llega` del aire ES el rebote, y un aire calmo lo hace
    // de milimetros mientras uno jugueton se pasa de verdad. Vale para los once sin tocar nada.
    tl.fromTo(f.mT.position, { z: -2.6 }, { z: 0, duration: b(0.62), ease: E.llega(2.4), immediateRender: false }, t0)
    tl.fromTo(f.mT.scale, { x: 0.82, y: 0.82 }, { x: 1, y: 1, duration: b(0.62), ease: E.llega(2.0), immediateRender: false }, t0)
    // Y el bloque sube medio paso: la anterior se corre para hacerle lugar a esta.
    if (i > 0) tl.to(cont.position, { y: `+=${SUBE}`, duration: b(0.50), ease: E.frena(3) }, t0)
  })

  // ---- salida: se apaga de abajo hacia arriba, contra el orden de entrada
  const SALIDA = DUR - b(0.42)
  filas.forEach((f, i) => {
    const d = (filas.length - 1 - i) * b(0.04)
    tl.to(f.matT.uniforms.uProg, { value: 0, duration: b(0.30), ease: E.acelera(2) }, SALIDA + d)
  })
  tl.to(riel.scale, { y: 0.001, duration: b(0.34), ease: E.acelera(3) }, SALIDA)

  // ---- camara: un paneo lateral corto que se devuelve
  // Devolverla es CONTRATO: la escena siguiente arranca en (0,0,distBase) y si esta la deja corrida,
  // el corte se lee como un salto. El `set` final es el seguro ante cualquier ajuste de tempo.
  // CAMARA QUE BAJA. Una lista se lee de arriba hacia abajo, asi que la camara hace eso: desciende
  // monotona mientras los items entran, sin acercarse. Es el unico movimiento vertical sostenido del
  // catalogo y se lee como recorrer, no como respirar.
  tl.fromTo(camera.position, { y: orbita(0.30) }, { y: orbita(-0.22), duration: DUR * 0.86, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { y: 0, duration: DUR * 0.14, ease: E.frena(2) }, DUR * 0.86)
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, DUR - 0.001)

  return { g, tl }
}
