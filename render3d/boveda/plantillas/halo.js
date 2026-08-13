// PLANTILLA "halo" — un anillo de luz suave sobre un campo casi blanco. Todo pasa adentro del anillo.
//
// EL GESTO
// Un solo circulo, muy grande, dibujado con un degradado blando en vez de un borde duro. No es un
// objeto: es una PRESENCIA. La camara casi no se mueve, el anillo respira, y cada tiempo de la pieza
// aparece dentro de el. Es la plantilla mas cercana a lo que un estudio de motion presenta cuando le
// muestra su trabajo a una marca de software: la destreza esta en el timing, no en la cantidad.
//
// EN QUE SE DIFERENCIA DE `eclipse`, que tambien es un circulo:
//
//   `eclipse`  el disco es OPACO y la luz esta detras. Es contraste duro, alto drama, y la camara lo
//              atraviesa. Sirve para fintech y cripto.
//   `halo`     el circulo es LUZ y no hay nada detras. Es contraste bajo, sin drama, y la camara se
//              queda. Sirve para una marca que no necesita gritar.
//
// El mismo primitivo geometrico —un circulo que ocupa media pantalla— da dos piezas opuestas, y la
// diferencia entera esta en si el circulo tapa la luz o es la luz.
//
// COMO SE HACE UN BORDE BLANDO SIN UN SHADER PROPIO: tres anillos concentricos con opacidades
// decrecientes y radios que se solapan. Es la misma cuenta que un degradado radial, resuelta con tres
// mallas en vez de con un fragment shader — y a esta escala el ojo no distingue una de la otra.
//
// LOS SEIS TIEMPOS (beats sobre 36)
//   0   ESPACIO   el anillo solo, respirando. Nada mas en el cuadro.
//   5   MARCA     el nombre aparece en el centro del anillo.
//   11  PROMESA   el claim ocupa el ancho interior, en tres renglones.
//   17  PRUEBA    la pagina del cliente se recorta DENTRO del anillo, que hace de marco.
//   24  RAZONES   las cifras entran de a una en el centro, sin superponerse.
//   30  PEDIDO    el anillo se cierra un poco y el CTA queda en su centro exacto.

import { THREE, mate, luz, iluminar, domo } from '../nucleo.js'
import { entra, sale, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'halo',
  nombre: 'Halo',
  familia: 'sobrio',
  necesita: ['nada'],
  beats: 36,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 24, pedido: 30 },
  pitch: 'Un anillo de luz suave sobre un campo casi blanco. Contenida, de software y servicios.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  // ---------------------------------------------------------------- LO QUE LA PAGINA DECIDE
  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  // La mitad del desvio, por lo mismo que en `folio`: una pieza callada que acelera un 45% porque la
  // pagina es enerxica deja de ser callada, y el registro es lo que promete la plantilla.
  const medio = (v) => 1 + (v - 1) * 0.45

  iluminar(escena, { key: 0.75, relleno: 1.05 })
  const uDomo = domo(escena, { fuerza: 0.05 })
  // El bloom baja, pero MENOS que en `folio`: aca si hay un emisivo grande y es el sujeto. 0.34 le deja
  // al anillo su halo sin lavar el fondo.
  if (ctx.bloom) ctx.bloom.strength = Math.min(ctx.bloom.strength || 0.5, 0.34)

  // ---------------------------------------------------------------- el vuelo: casi ninguno
  //
  // 1.1 unidades en 36 beats, y un giro de un grado. Lo que se mueve de verdad es el anillo, no la
  // camara — y aun asi la camara no se detiene, que es la regla 1.
  const Z_CAM = distBase * 0.95
  const RECORRIDO = 1.1 * medio(R.velocidad)
  const DERIVA = 0.10
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(meta.beats), ease: 'none' }, 0)
  const UTIL = anchoADistancia(mundoW, distBase, Z_CAM, DERIVA)

  // ---------------------------------------------------------------- el espacio: el anillo
  //
  // El radio sale del cuadro util y no de `mundoW`: el anillo tiene que entrar entero con margen, y a
  // 0.95 de `distBase` el cuadro es un 5% mas angosto que en reposo.
  const RAD = UTIL * 0.44
  const gHalo = new THREE.Group()
  escena.add(gHalo)

  // EL COLOR DEL ANILLO SALE DE LOS PIXELES DE LA PAGINA. Es lo unico con color de toda la pieza, asi
  // que si no es el color de la marca, la pieza no es de la marca.
  const COL = colorDePeso(R, LOOK.acento, 0.18)

  // TRES ANILLOS PARA UN BORDE BLANDO. Los radios se solapan a proposito: si no se tocaran se verian
  // tres aros y no un degradado. Las opacidades bajan mas rapido que los radios suben, que es lo que
  // hace que el conjunto se lea como una sola cosa que se desvanece.
  const aros = []
  const CAPAS = [
    [1.000, 0.030, 0.85],
    [1.030, 0.075, 0.34],
    [1.080, 0.150, 0.13],
  ]
  for (const [r, grosor, op] of CAPAS) {
    const m = new THREE.Mesh(new THREE.RingGeometry(RAD * r, RAD * (r + grosor), 128),
      luz(COL, 1.0))
    m.material.transparent = true
    m.material.opacity = op
    m.material.depthWrite = false
    gHalo.add(m)
    aros.push({ m, op })
  }
  // Y un relleno interior apenas mas claro que el fondo. Es lo que convierte el anillo en un LUGAR:
  // sin el, los bloques flotan sobre el mismo campo que hay afuera y el anillo es un adorno.
  const dentro = new THREE.Mesh(new THREE.CircleGeometry(RAD * 0.995, 96), mate(nivel(0.015), 1.0))
  dentro.position.z = -0.05
  gHalo.add(dentro)

  // El campo: un plano liso y grande, apenas mas oscuro que el interior del anillo. Como en `folio`, no
  // se usa el domo — el domo tine y gira, y aca hace falta un fondo quieto.
  const campo = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 6, mundoH * 6), mate(grisDePeso(R, nivel(0.07)), 1.0))
  campo.position.z = -5
  escena.add(campo)

  // La unica capa aparte del anillo: un segundo halo mucho mas grande, muy tenue y detras. No se lee
  // como objeto — se lee como que el aire tiene algo. Es la regla 3 en su version mas callada.
  const eco = new THREE.Mesh(new THREE.RingGeometry(RAD * 1.9, RAD * 2.5, 96), luz(COL, 1.0))
  eco.material.transparent = true
  eco.material.opacity = 0.055
  eco.material.depthWrite = false
  eco.position.z = -2.4
  escena.add(eco)

  // ---------------------------------------------------------------- los bloques
  //
  // Todo se compone contra el DIAMETRO INTERIOR del anillo, no contra el cuadro. Un renglon que se pasa
  // del anillo rompe la unica regla de composicion que tiene la pieza.
  const CAJA = RAD * 2 * 0.78 * (R.margen / 0.88)

  const marca = bloqueMarca({ alto: RAD * 0.30, anchoMax: CAJA, filete: false, margen: R.margen })
  const promesa = bloquePromesa({ alto: RAD * 0.135, anchoMax: CAJA, cama: false, maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: RAD * 1.30, ar: 1.5, marco: false })
  const cifras = bloquesCifra(Math.min(2, R.cifras), { alto: RAD * 0.34, anchoMax: CAJA * 0.9, margen: R.margen })
  const frases = bloquesFrase(1, { alto: RAD * 0.085, anchoMax: CAJA, cama: false, margen: R.margen })
  const pedido = bloquePedido({ alto: RAD * 0.085, anchoMax: CAJA * 0.75, margen: R.margen })

  const enCentro = (blk, y, padre) => {
    blk.g.position.set(0, (y || 0) * RAD, 0.02)
    ;(padre || gHalo).add(blk.g)
    return blk.g
  }

  // ---------------------------------------------------------------- 2 · MARCA
  // Entra desde MUY cerca —0.8 unidades— y con una duracion larga. En una pieza sin paisaje, un gesto
  // corto y lento se lee como caro; uno largo y rapido, como una plantilla.
  if (marca) {
    enCentro(marca, 0.04)
    entra(marca.g, tl, 5, { desde: 'abajo', dist: 0.8, dur: 2.2, ease: E.frena(2.6) })
    marca.escribir(tl, 5.6, 1.8)
    marca.borrar(tl, 9.6)
    sale(marca.g, tl, 9.8, { hacia: 'arriba', dist: 0.8, dur: 1.4 })
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    enCentro(promesa, 0.0)
    entra(promesa.g, tl, 11, { desde: 'abajo', dist: 0.7, dur: 2.0, ease: E.frena(2.6) })
    promesa.escribir(tl, 11.6, 1.4)
    promesa.borrar(tl, 15.6)
    sale(promesa.g, tl, 15.8, { hacia: 'arriba', dist: 0.7, dur: 1.3 })
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // EL ANILLO HACE DE MARCO. Por eso `bloquePrueba` se pide con `marco: false`: ponerle su propio borde
  // emisivo adentro de un anillo emisivo son dos marcos concentricos, que es exactamente el error que
  // comete una plantilla cuando no sabe que hay alrededor.
  //
  // La pagina vive en `ctx.pagina`, que se dibuja despues del bloom y sin la profundidad de la escena:
  // se veria ENCIMA del anillo. Se acepta a proposito —la pagina tiene que leerse— y se compensa
  // haciendola mas chica que el diametro interior, para que el anillo la enmarque igual.
  if (prueba) {
    prueba.g.position.set(0, 0, 0.03)
    pagina.add(prueba.g)
    entra(prueba.g, tl, 17, { desde: 'fondo', dist: 1.6, dur: 2.2, ease: E.frena(2.4) })
    prueba.escribir(tl, 17.4, 1.5)
    prueba.recorrer(tl, 18.4, 4.6, 0.9)
    sale(prueba.g, tl, 22.6, { hacia: 'fondo', dist: 1.6, dur: 1.4 })
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  // DE A UNA Y EN EL MISMO SITIO. Es la decision que mas separa esta plantilla de las intensas: alli
  // las cifras entran por los costados y conviven; aca se reemplazan en el centro. Que el ojo no tenga
  // que elegir donde mirar es la mitad del registro.
  cifras.forEach((c, i) => {
    const t0 = 24 + i * 2.6
    enCentro(c, 0.02)
    entra(c.g, tl, t0, { desde: 'abajo', dist: 0.6, dur: 1.7, ease: E.frena(2.4) })
    c.escribir(tl, t0 + 0.4, 1.1)
    c.borrar(tl, t0 + 2.0)
    sale(c.g, tl, t0 + 2.2, { hacia: 'arriba', dist: 0.6, dur: 1.2 })
  })
  uso.cifras = cifras.length

  frases.forEach((f) => {
    const t0 = 25.4
    enCentro(f, -0.42)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 0.5, dur: 1.6, ease: E.frena(2.4) })
    f.escribir(tl, t0 + 0.4, 1.0)
    f.borrar(tl, t0 + 2.8)
    sale(f.g, tl, t0 + 3.0, { hacia: 'abajo', dist: 0.5, dur: 1.2 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL ANILLO SE CIERRA UN POCO. Es el unico cambio del espacio en toda la pieza y esta guardado para
  // el final: un 8% de radio no se percibe como una animacion sino como que algo se resolvio.
  let latido = null
  if (pedido) {
    enCentro(pedido, -0.02)
    entra(pedido.g, tl, 30, { desde: 'abajo', dist: 0.7, dur: 1.9, ease: E.frena(2.6) })
    pedido.escribir(tl, 30.6, 1.2)
    latido = pedido.latir(0.014)
    uso.cta = pedido.tieneCta
    tl.to(gHalo.scale, { x: 0.92, y: 0.92, duration: b(3.2), ease: E.frena(2.2) }, b(29.4))
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // EL ANILLO RESPIRA. Tres senos de periodos inconmensurables sobre las tres opacidades, desfasados
  // entre si: el borde blando "hierve" apenas y nunca vuelve al mismo estado. Es lo unico que pasa
  // durante los cinco beats de ESPACIO, y alcanza.
  //
  // Se ASIGNA la opacidad porque ningun tween la anima —el unico tween sobre el anillo es la escala del
  // pedido— y sumar sobre algo que nadie restablece acumularia en cada submuestra. Y se asigna sobre la
  // opacidad BASE guardada, no sobre la actual, que es la otra mitad de la regla.
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const k = est.k
    camara.position.set(Math.sin(t * 0.09) * DERIVA, Math.sin(t * 0.071 + 1.3) * DERIVA * 0.6,
      Z_CAM + RECORRIDO * 0.5 - RECORRIDO * k)
    camara.rotation.set(0, 0, Math.sin(t * 0.06) * 0.003)
    aros.forEach((a, i) => {
      a.m.material.opacity = a.op * (1 + Math.sin(t * (0.27 + i * 0.11) + i * 1.7) * 0.16)
    })
    // El eco gira lentisimo. Un anillo perfectamente quieto detras de otro que respira se lee como un
    // error de render; girando, se lee como aire.
    eco.rotation.z = t * 0.013
    gHalo.rotation.z = Math.sin(t * 0.047) * 0.010
  })

  return { dur: b(meta.beats), alSeek, uso }
}
