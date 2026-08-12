// PLANTILLA "cinta" — una banda ancha que serpentea por el espacio, y la camara volando junto a ella.
//
// EL GESTO
// Una sola forma continua: una cinta que sube, baja y gira, hecha de segmentos que reflejan. La camara
// la acompana por afuera y los bloques de texto se apoyan EN los tramos rectos. Lo que da la sensacion
// de velocidad no es el fondo sino la cinta misma pasando por el costado del cuadro.
//
// Es la plantilla de recorrido: un proceso, un viaje del cliente, un antes-y-despues, una trayectoria.
// La forma dice "esto va a algun lado" antes de que se lea una palabra.
//
// LA CURVA SE CALCULA UNA VEZ Y SIRVE PARA TODO: para construir la cinta, para colocar los bloques y
// para saber a que altura vuela la camara en cada beat. Definir la geometria y despues colocar los
// textos a ojo es como se consigue una pieza en la que el texto flota al lado de la forma en vez de
// estar sobre ella — y ademas se rompe en cuanto se cambia un beat.
//
// LOS SEIS TIEMPOS (beats sobre 40)
//   0   ESPACIO   la cinta pasando, los reflejos corriendo por sus segmentos. Nada de texto.
//   5   MARCA     primer tramo recto: el nombre se apoya sobre la cinta.
//   12  PROMESA   la cinta sube y el claim va con ella.
//   18  PRUEBA    la cinta se ensancha y la pagina se monta encima.
//   27  RAZONES   las cifras van montadas en tramos alternos, a un lado y al otro.
//   34  PEDIDO    la cinta se endereza, se aquieta y el CTA queda en el ultimo tramo.

import { THREE, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { entra, sale, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'cinta',
  nombre: 'Cinta',
  familia: 'recorrido',
  necesita: ['nada'],
  beats: 40,
  tiempos: { espacio: 0, marca: 5, promesa: 12, prueba: 18, razones: 27, pedido: 34 },
  pitch: 'Una banda que serpentea por el espacio con la cámara siguiéndola. De proceso, viaje o trayectoria.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  //
  // `ctx.recetas` sale de `backend/retrato.py`, que mide la tira, el DOM y los recortes de ESTA pagina.
  // Sin retrato devuelve los valores neutros y la plantilla compone como se componia antes: no hay una
  // rama distinta ni un caso especial. Lo que se modula es el GRADO, nunca la idea.
  //
  // La explicacion larga de cada receta esta en `render3d/boveda/recetas.js`, y la de por que existe
  // este mecanismo, en `atrio.js`.
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const respiraciones = []

  iluminar(escena, { key: 1.25, relleno: 0.6 })
  const uDomo = domo(escena, { fuerza: 0.24 })
  const motas = polvo(escena, 1100, 30)

  // ---------------------------------------------------------------- la curva, primero que todo
  //
  // Un vuelo propio y no uno de `movimiento.js`: los tres de alli son en linea, en circulo o de
  // costado, y esta plantilla necesita SEGUIR UNA CURVA. Cumple las mismas reglas —no para nunca,
  // deriva sin repetirse— pero la trayectoria sale de la geometria, que es justamente su idea.
  // El recorrido se estira o se acorta con la ENERGIA medida de la pagina: mismo tiempo, mas o menos
  // camino, que es literalmente la velocidad. Sin retrato, `R.velocidad` vale 1 y no cambia nada.
  const LARGO = distBase * 5.2 * R.velocidad
  const curva = (u) => new THREE.Vector3(
    Math.sin(u * Math.PI * 2.1) * mundoW * 0.95,
    Math.sin(u * Math.PI * 1.35 + 0.6) * mundoH * 0.42 - u * 0.6,
    distBase * 0.75 - u * LARGO)
  const BEATS = meta.beats
  const uEn = (beat) => Math.min(1, Math.max(0, beat / BEATS))
  // CUANTO POR DELANTE MIRA LA CAMARA, y este numero es de la plantilla entera y no del vuelo.
  //
  // La camara va sobre la curva y mira un tramo MAS ADELANTE — si mirara donde esta, la cinta quedaria
  // siempre fuera de cuadro en cada giro, porque el objetivo estaria clavado en el centro. El precio es
  // que "el punto que se ve" y "el punto donde esta la camara" son dos parametros distintos, y montar
  // los bloques en el segundo los pone 3.4 beats antes de su tiempo: se ven y se van antes de que les
  // toque. Paso: la sonda dio 80% de beats mudos con las doce composiciones bien.
  //
  // Un solo sitio para el numero, usado por el vuelo Y por el montaje. Dos copias del mismo valor en
  // dos formulas distintas es como se rompio esto la primera vez.
  const MIRA = 0.085
  const CAM = 0.012
  const LATERAL = (u) => Math.sin(u * 7.3) * mundoW * 0.5
  // La camara vuela DESPLAZADA de la curva y mirandola. Sobre la curva iria dentro de la cinta; a un
  // costado, la cinta entra y sale del cuadro sola en cada giro, que es lo que se quiere ver.
  const _mira = new THREE.Vector3()
  const _pos = new THREE.Vector3()

  // ---------------------------------------------------------------- el espacio: la cinta
  const SEG = 130
  const gCinta = new THREE.Group()
  escena.add(gCinta)
  const matSeg = metal(nivel(0.22), 0.28)
  const matLuz = luz(LOOK.acento, 1.3)
  const segmentos = []
  for (let i = 0; i < SEG; i++) {
    const u = i / (SEG - 1)
    const p = curva(u)
    const p2 = curva(Math.min(1, u + 0.008))
    const g = new THREE.Group()
    g.position.copy(p)
    g.lookAt(p2)
    const ancho = mundoW * (0.62 + Math.sin(u * Math.PI * 3) * 0.10)
    const s = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.07, LARGO / SEG * 1.35), matSeg)
    g.add(s)
    // Un filete en cada canto: es lo que hace que la cinta se lea como una cinta y no como un tubo.
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, LARGO / SEG * 1.35), matLuz)
      f.position.x = sx * ancho / 2
      g.add(f)
    }
    gCinta.add(g)
    segmentos.push({ g, u })
  }

  // ---------------------------------------------------------------- los bloques
  const DERIVA = 0.45
  const UTIL = (k) => anchoConDeriva(mundoW, DERIVA, k)
  const marca = bloqueMarca({ alto: 1.15, anchoMax: UTIL(0.85) * 0.86 , margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.50, anchoMax: UTIL(0.9) * 0.86 , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.44, ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.72, anchoMax: UTIL(0.8) * 0.44 , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.28, anchoMax: UTIL(0.8) * 0.78 , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.31, anchoMax: UTIL(0.8) * 0.60 , margen: R.margen })

  // MONTAR SOBRE LA CINTA: la posicion sale de la curva en el beat pedido, mas una separacion en la
  // normal. Asi el bloque queda sobre la banda por construccion, no por haber acertado un numero.
  // LOS BLOQUES VIAJAN POR LA CURVA, no se clavan en un punto de ella.
  //
  // Montarlos en `curva(u(beat) + MIRA)` los deja centrados EXACTAMENTE en su beat y fuera de cuadro
  // dos beats despues: la camara avanza 0.025 de `u` por beat y el adelanto son 0.085, o sea que lo
  // alcanza y lo pasa en 3.4. Con eso la sonda daba 39% de beats mudos.
  //
  // La respuesta es la misma que la de `acompanar` en el desliz, pero sobre una curva: el bloque se
  // queda en el punto que la camara MIRA, y ese punto se mueve. Lo que da la sensacion de velocidad no
  // es el bloque sino la cinta y el fondo pasando detras — que sobra.
  //
  // Y DOS GRUPOS, otra vez por lo que documenta `vitral`: el externo lo maneja `alSeek` sobre la curva,
  // el interno lo maneja `entra`/`sale`. Con uno solo se pelean por `position` y gana el ultimo.
  const viajeros = []
  const _camAux = new THREE.Vector3()
  const camaraEn = (uc) => {
    _camAux.copy(curva(Math.max(0, Math.min(1, uc))))
    _camAux.x += LATERAL(uc)
    _camAux.y += distBase * 0.16
    _camAux.z += distBase * 0.30
    return _camAux
  }
  const montar = (blk, beat, altura, ladear, padre) => {
    const g = new THREE.Group()
    g.add(blk.g)
    ;(padre || escena).add(g)
    // El desplazamiento va en el marco LOCAL del bloque —o sea, respecto del cuadro— y no en el del
    // mundo: en una curva que gira, "un poco a la izquierda" en coordenadas de mundo es cualquier cosa.
    viajeros.push({ g, dx: ladear || 0, dy: altura != null ? altura : 0.9 })
    // Se coloca ya para el beat pedido, porque `entra` lee la posicion de partida al construirse.
    const u = Math.min(1, uEn(beat) + MIRA)
    g.position.copy(curva(u))
    g.lookAt(camaraEn(u - MIRA + CAM))
    g.translateX(ladear || 0)
    g.translateY(altura != null ? altura : 0.9)
    return g
  }

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    montar(marca, 7.0, 1.15, 0)
    entra(marca.g, tl, 5, { desde: 'fondo', dist: 6, dur: 1.8 })
    marca.escribir(tl, 5.4, 1.3)
    marca.borrar(tl, 10.0)
    sale(marca.g, tl, 10.2, { hacia: 'arriba', dist: 5.5, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    montar(promesa, 13.8, 1.0, 0)
    entra(promesa.g, tl, 12, { desde: 'der', dist: 6, dur: 1.7 })
    promesa.escribir(tl, 12.4, 0.95)
    promesa.borrar(tl, 16.4)
    sale(promesa.g, tl, 16.6, { hacia: 'izq', dist: 6.5, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // MONTADA SOBRE LA CINTA Y VIAJANDO CON ELLA. Es el unico bloque que se apoya casi a ras: la pagina
  // tiene que leerse como CARGA de la cinta, que es la metafora entera de la plantilla.
  if (prueba) {
    montar(prueba, 20.6, prueba.alto * 0.55 + 0.2, 0, pagina)
    entra(prueba.g, tl, 18, { desde: 'fondo', dist: 7, dur: 2.2 })
    prueba.escribir(tl, 18.2, 1.2)
    prueba.recorrer(tl, 19, 6.4, 0.92)
    tl.to(prueba.g.rotation, { y: 0.45, duration: b(6.8), ease: 'none' }, b(18.8))
    sale(prueba.g, tl, 25.4, { hacia: 'arriba', dist: 7, dur: 1.3 })
    respiraciones.push(respirar(prueba.g, { amp: 0.07, giro: 0.018, fase: 1.9 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const s = i % 2 === 0 ? -1 : 1
    const t0 = 27 + i * 2.2
    montar(c, t0 + 1.0, 1.05, s * mundoW * 0.26)
    entra(c.g, tl, t0, { desde: s < 0 ? 'izq' : 'der', dist: 5, dur: 1.3 })
    c.escribir(tl, t0 + 0.3, 0.72)
    sale(c.g, tl, t0 + 2.2, { hacia: 'arriba', dist: 5, dur: 1.0 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 27.8 + i * 2.7
    montar(f, t0 + 1.0, 0.62, 0)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.2, dur: 1.4 })
    f.escribir(tl, t0 + 0.4, 0.82)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: 'abajo', dist: 4.8, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    montar(pedido, BEATS - 0.8, 1.0, 0)
    entra(pedido.g, tl, 34, { desde: 'fondo', dist: 5.5, dur: 1.9 })
    pedido.escribir(tl, 34.4, 0.9)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.7, duration: b(2.4), ease: E.frena(2) }, b(34))
  }

  // ---------------------------------------------------------------- lo continuo: el vuelo propio
  const est = { u: 0 }
  tl.fromTo(est, { u: 0 }, { u: 1, duration: b(BEATS), ease: 'none' }, 0)
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const u = est.u
    // Los viajeros primero: la camara se calcula despues sobre los mismos numeros, asi que si esto
    // cambiara de orden el bloque quedaria un cuadro atrasado respecto del punto que se mira.
    const uv = Math.min(1, u + MIRA)
    const pv = curva(uv)
    const cv = camaraEn(u + CAM)
    for (const v of viajeros) {
      v.g.position.copy(pv)
      v.g.lookAt(cv)
      v.g.translateX(v.dx)
      v.g.translateY(v.dy)
    }
    // La camara va un poco por DELANTE del punto que mira: mirar exactamente donde se esta deja la
    // curva fuera de cuadro en cada giro, porque el objetivo esta siempre en el centro.
    _pos.copy(curva(Math.min(1, u + CAM)))
    _mira.copy(curva(Math.min(1, u + MIRA)))
    // La separacion lateral tambien oscila, y con periodos que no son multiplos: es la deriva de esta
    // plantilla, y sin ella un vuelo pegado a una curva se lee como una camara montada en un riel.
    const lat = LATERAL(u) + Math.sin(t * 0.19) * DERIVA
    _pos.x += lat
    _pos.y += distBase * 0.16 + Math.sin(t * 0.27) * DERIVA * 0.7
    _pos.z += distBase * 0.30
    camara.position.copy(_pos)
    camara.lookAt(_mira)
    camara.rotation.z += Math.sin(t * 0.21 + 0.4) * 0.014
    // EL REFLEJO QUE CORRE POR LA CINTA. Un pulso de brillo que viaja de un extremo al otro: es el
    // gesto que hace que la forma se lea como METAL y no como una tira de cartulina, y cuesta una
    // multiplicacion por segmento.
    for (const s of segmentos) {
      const d = Math.abs(((s.u - (t * 0.07) % 1.4) + 1.4) % 1.4 - 0.2)
      s.g.scale.y = 1 + Math.max(0, 0.35 - d) * 1.2
    }
    motas.position.copy(camara.position)
  }, ...respiraciones)

  return { dur: b(BEATS), alSeek, uso }
}
