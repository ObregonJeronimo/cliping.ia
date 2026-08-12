// PLANTILLA "tectonica" — bloques enormes deslizandose unos contra otros.
//
// EL GESTO
// Escala. Todo lo demas de la boveda esta hecho a medida del cuadro; aca los objetos son MAS GRANDES
// que el cuadro y siempre se ve un pedazo. La camara se desliza de costado por una falla entre dos
// masas que se mueven en sentidos opuestos, y los bloques de texto caen en el hueco entre las dos.
//
// Es la plantilla mas seria del catalogo: industria, energia, logistica, mineria, construccion. Una
// marca de cosmetica aca se ve fuera de lugar, y esta bien que asi sea — doce plantillas que le sirven
// a cualquiera son doce plantillas que no le sirven bien a ninguna.
//
// LO QUE SOSTIENE LA ESCALA: nada tiene borde visible dentro del cuadro. En cuanto se ve el canto de
// una masa, el ojo calcula su tamano y la ilusion se cae. Por eso las masas son mas largas que el
// recorrido entero de la camara y mas altas que el cuadro por un factor de tres.
//
// LOS SEIS TIEMPOS (beats sobre 36)
//   0   ESPACIO   las dos masas cruzandose, el polvo bajando por la falla. Nada de texto.
//   4   MARCA     el nombre entra por la falla, del tamano del hueco.
//   10  PROMESA   el claim baja por la falla mientras las masas siguen corriendo.
//   16  PRUEBA    la pagina sube desde el fondo de la falla, iluminada desde abajo.
//   24  RAZONES   las cifras se apoyan contra el canto de la masa de arriba.
//   30  PEDIDO    las masas frenan casi del todo y el CTA queda clavado en el centro de la falla.

import { THREE, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloDesliz, entra, sale, acompanar, respirar, juntar, anchoConDeriva } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'tectonica',
  nombre: 'Tectónica',
  familia: 'escala',
  necesita: ['nada'],
  beats: 36,
  tiempos: { espacio: 0, marca: 4, promesa: 10, prueba: 16, razones: 24, pedido: 30 },
  pitch: 'Masas enormes deslizándose en sentidos opuestos y una falla de luz en el medio. Industrial, serio.',
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

  // La primera version tenia key 0.75 y relleno 0.35 sobre metal a nivel 0.07-0.11. Resultado medido en
  // la foto del beat 16: TRES BARRAS NEGRAS. La falla —el sujeto entero de la plantilla— no se leia
  // como un hueco iluminado sino como el espacio entre dos rectangulos apagados.
  iluminar(escena, { key: 1.25, relleno: 0.55 })
  const uDomo = domo(escena, { fuerza: 0.18 })
  const motas = polvo(escena, 1300, 30)

  const LARGO = mundoW * 6.2
  const vuelo = vueloDesliz(camara, tl, { distBase, beats: meta.beats, largo: (LARGO) * R.velocidad, dist: 1.02 })
  const xEn = vuelo.xEn
  const UTIL = (k) => anchoConDeriva(mundoW, 0.35, k)

  // ---------------------------------------------------------------- el espacio: las dos masas
  //
  // La falla mide `HUECO` de alto y es TODO el espacio util de la pieza. Los bloques van ahi adentro,
  // asi que se dimensiona primero y los textos se piden contra el, no al reves.
  const HUECO = mundoH * 0.62
  const masa = (arriba) => {
    const g = new THREE.Group()
    const H = mundoH * 3.2
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(LARGO * 3.2, H, mundoW * 2.2), metal(nivel(arriba ? 0.26 : 0.18), 0.50))
    cuerpo.position.y = arriba ? (HUECO / 2 + H / 2) : -(HUECO / 2 + H / 2)
    // LAS MASAS SE CORREN HACIA ATRAS. Con la cara delantera en z = +6.2 y la camara en 17.7, cada
    // masa esta a 11.5 del lente: ahi el cuadro mide 6.6 de alto y el hueco de 6.2 se lo come entero,
    // asi que no queda masa visible arriba ni abajo — solo el borde. Corridas a -0.9·mundoW la cara
    // queda a ~17 del lente, el cuadro mide 9.7 y el hueco ocupa el 64%: se ve el hueco Y se ven las
    // dos masas que lo forman, que es lo unico que lo vuelve un hueco.
    cuerpo.position.z = -mundoW * 0.9
    g.add(cuerpo)
    // EL CANTO EN EMISIVO ES LO QUE HACE LA FALLA. Sin el, dos masas oscuras juntas son una sola masa
    // oscura: el hueco no se lee como hueco sino como sombra. La linea de luz es el sujeto.
    const canto = barra(LARGO * 3.2, 0.06, LOOK.acento, 1.7)
    canto.position.set(0, arriba ? HUECO / 2 : -HUECO / 2, mundoW * 0.22)
    g.add(canto)
    // Nervaduras: cajas finas cada tanto, que son lo que da la VELOCIDAD. Una masa lisa deslizandose no
    // se percibe moviendose — no hay nada contra que medirla.
    // LAS NERVADURAS VAN EN LA CARA QUE MIRA AL HUECO, no en el centro de la masa.
    //
    // Estaban en `cuerpo.position.y`, o sea a dieciseis unidades de altura: fuera de cuadro siempre.
    // Existian, se dibujaban y no las veia nadie — la masa se leia lisa, y una masa lisa deslizandose
    // no se percibe moviendose porque no hay nada contra que medirla, que es justo lo que venian a
    // resolver. Puestas al ras del hueco y hacia adentro, desfilan y dan la velocidad.
    for (let i = 0; i < 90; i++) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, mundoW * 1.9),
        metal(nivel(arriba ? 0.42 : 0.32), 0.34))
      n.position.set(-LARGO * 1.6 + i * (LARGO * 3.2 / 90),
        (arriba ? 1 : -1) * (HUECO / 2 + 0.22), -mundoW * 0.9)
      g.add(n)
    }
    return g
  }
  const arriba = masa(true), abajo = masa(false)
  escena.add(arriba); escena.add(abajo)

  // Una lampara larga en el fondo de la falla: es lo que la ilumina desde atras y separa los bloques de
  // texto del vacio. Emisiva y no una luz real, por lo mismo de siempre.
  // LA LAMPARA ES LA FUENTE, asi que tiene que ser LUZ y no acento oscuro al 45%. Con el acento a 0.45
  // el fondo del hueco medía menos que las masas y la falla salia mas oscura que lo que la rodea, o sea
  // exactamente al reves de lo que la plantilla dice hacer.
  //
  // Y la intensidad va por ENCIMA de 1: el umbral del bloom del aire esta en 0.80, asi que una fuente a
  // 0.9 x 0.8 = 0.72 no florece y se lee como una pared clara. Lo que la vuelve una LAMPARA es pasar el
  // umbral, no ser clara.
  // `nivel(0)` ES EL CLARO Y `nivel(1)` LA TINTA. Pedir `nivel(0.95)` para "casi blanco" devuelve
  // #1f1c17 — o sea que la lampara de esta plantilla era NEGRA, y por eso la falla salia mas oscura
  // que las masas que la rodean. Para una fuente el numero va cerca de cero.
  const lampara = new THREE.Mesh(new THREE.PlaneGeometry(LARGO * 3.2, HUECO * 1.6), luz(nivel(0.02), 1.55))
  lampara.position.set(0, 0, -mundoW * 3.0)
  escena.add(lampara)
  // Y una veladura de acento por delante, que es lo que la tine sin apagarla.
  const tinte = new THREE.Mesh(new THREE.PlaneGeometry(LARGO * 3.2, HUECO * 1.5), luz(LOOK.acento2 || LOOK.acento, 1.0))
  tinte.material.transparent = true
  tinte.material.opacity = 0.34
  tinte.material.depthWrite = false
  tinte.position.set(0, 0, -mundoW * 2.7)
  escena.add(tinte)

  // ---------------------------------------------------------------- los bloques
  //
  // El alto se pide contra `HUECO` y no contra `mundoH`: en esta plantilla el cuadro util no es el
  // cuadro, es la falla. Un claim que respeta el ancho y se pasa de alto queda tapado por una masa.
  const marca = bloqueMarca({ alto: Math.min(1.25, HUECO * 0.34), anchoMax: UTIL(0.92) * 0.90 , margen: R.margen })
  const promesa = bloquePromesa({ alto: Math.min(0.50, HUECO * 0.16), anchoMax: UTIL(0.95) * 0.88, maxLineas: 2 , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.42, ar: 1.35 })
  const cifras = bloquesCifra(R.cifras, { alto: Math.min(0.78, HUECO * 0.22), anchoMax: UTIL(0.9) * 0.5 , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.28, anchoMax: UTIL(0.9) * 0.80, maxLineas: 2 , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.32, anchoMax: UTIL(0.9) * 0.62 , margen: R.margen })

  const enBeat = (g, beat, y, z) => { g.position.set(xEn(beat), y || 0, z || 0) }

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    enBeat(marca.g, 5.6, 0.05, distBase * 0.16)
    escena.add(marca.g)
    entra(marca.g, tl, 4, { desde: 'der', dist: 6.5, dur: 1.6 })
    acompanar(marca.g, tl, 5.6, 9.2, xEn, 0.85)
    marca.escribir(tl, 4.4, 1.3)
    marca.borrar(tl, 8.6)
    sale(marca.g, tl, 8.8, { hacia: 'izq', dist: 6.5, dur: 1.0 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    enBeat(promesa.g, 11.6, 0.0, distBase * 0.16)
    escena.add(promesa.g)
    entra(promesa.g, tl, 10, { desde: 'arriba', dist: HUECO * 1.4, dur: 1.6 })
    acompanar(promesa.g, tl, 11.6, 15.2, xEn, 0.85)
    promesa.escribir(tl, 10.4, 0.95)
    promesa.borrar(tl, 14.4)
    sale(promesa.g, tl, 14.6, { hacia: 'abajo', dist: HUECO * 1.4, dur: 1.1 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // SUBE DESDE EL FONDO DE LA FALLA. Es el unico momento en que se ve algo abajo del hueco, y por eso
  // funciona: durante quince beats el ojo aprendio que abajo no hay nada.
  if (prueba) {
    enBeat(prueba.g, 17.4, 0.0, distBase * 0.20)
    pagina.add(prueba.g)
    entra(prueba.g, tl, 16, { desde: 'abajo', dist: HUECO * 2.2, dur: 2.0 })
    acompanar(prueba.g, tl, 17.4, 23.4, xEn, 0.80)
    prueba.escribir(tl, 16.3, 1.2)
    prueba.recorrer(tl, 17.2, 5.6, 0.92)
    tl.to(prueba.g.rotation, { y: 0.36, duration: b(6.0), ease: 'none' }, b(17.0))
    sale(prueba.g, tl, 22.6, { hacia: 'abajo', dist: HUECO * 2.2, dur: 1.2 })
    respiraciones.push(respirar(prueba.g, { amp: 0.06, giro: 0.014, fase: 0.9 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const t0 = 24 + i * 2.0
    enBeat(c.g, t0 + 0.9, HUECO * 0.10, distBase * 0.18)
    escena.add(c.g)
    entra(c.g, tl, t0, { desde: 'der', dist: 6, dur: 1.2 })
    acompanar(c.g, tl, t0 + 0.9, t0 + 2.2, xEn, 0.9)
    c.escribir(tl, t0 + 0.3, 0.72)
    sale(c.g, tl, t0 + 2.1, { hacia: 'izq', dist: 6, dur: 0.9 })
  })
  uso.cifras = cifras.length

  frases.forEach((f, i) => {
    const t0 = 24.6 + i * 2.6
    enBeat(f.g, t0 + 0.9, -HUECO * 0.22, distBase * 0.14)
    escena.add(f.g)
    entra(f.g, tl, t0, { desde: 'izq', dist: 6, dur: 1.3 })
    acompanar(f.g, tl, t0 + 0.9, t0 + 2.6, xEn, 0.9)
    f.escribir(tl, t0 + 0.4, 0.8)
    f.borrar(tl, t0 + 2.2)
    sale(f.g, tl, t0 + 2.4, { hacia: 'der', dist: 6, dur: 1.0 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  let latido = null
  if (pedido) {
    enBeat(pedido.g, 31.2, 0.0, distBase * 0.20)
    escena.add(pedido.g)
    entra(pedido.g, tl, 30, { desde: 'fondo', dist: 5.5, dur: 1.8 })
    acompanar(pedido.g, tl, 31.2, meta.beats, xEn, 1.0)
    pedido.escribir(tl, 30.4, 0.9)
    latido = pedido.latir(0.03)
    uso.cta = pedido.tieneCta
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.5, duration: b(2.0), ease: E.frena(2) }, b(30))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // LAS DOS MASAS VAN EN SENTIDOS CONTRARIOS, y eso es la plantilla entera. Con las dos al mismo lado
  // el ojo las lee como un solo bloque y la falla se vuelve una raya. En contra, cada una es un objeto
  // con su propia inercia y el hueco entre ellas se vuelve un lugar.
  //
  // Y FRENAN AL FINAL, pero no a cero: `1 - k * 0.72` deja un 28% de velocidad en el ultimo beat. La
  // camara sigue deslizando igual, asi que la regla 1 se cumple; lo que baja es el ruido de fondo, que
  // es lo que hace falta para leer un CTA.
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    const k = Math.min(1, t / b(meta.beats))
    const freno = 1 - k * 0.72
    arriba.position.x = -t * 1.55 * freno
    abajo.position.x = t * 1.05 * freno
    lampara.position.x = camara.position.x
    tinte.position.x = camara.position.x
    motas.position.x = camara.position.x
    motas.rotation.z = t * 0.02
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
