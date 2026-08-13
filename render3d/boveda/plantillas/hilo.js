// PLANTILLA "hilo" — una sola linea que se dibuja sola y cambia de forma en cada tiempo.
//
// EL GESTO
// No hay espacio, no hay objeto y casi no hay fondo: hay UNA LINEA. Se dibuja de punta a punta, se
// queda mientras se lee lo que dice, y se borra por el otro extremo mientras la siguiente ya empezo a
// dibujarse. Seis tiempos, seis formas.
//
// Es el gesto mas reconocible del genero que estamos replicando —la linea continua que se convierte en
// cosas— y es tambien el mas facil de hacer mal: si las formas son ilustrativas (una nube, un carrito)
// la pieza se vuelve un icono animado. Aca las seis formas son ABSTRACTAS y lo que cambia entre ellas
// es la TENSION: una recta, un arco, una espiral que se cierra. La forma no dice nada; acompana.
//
// COMO SE DIBUJA UNA LINEA QUE SE DIBUJA SOLA, que es la unica decision tecnica del archivo:
//
// Un tubo con muchos segmentos y `setDrawRange`. La geometria completa existe desde el primer cuadro y
// lo que se anima es CUANTOS TRIANGULOS SE DIBUJAN — o sea un contador, no una geometria. La
// alternativa —reconstruir el tubo cada cuadro— cuesta una geometria nueva por submuestra de obturador,
// que son cuatro por cuadro y 2376 en una pieza de 36 beats.
//
// Y el borrado es el mismo contador desde el otro lado: se mueve el INICIO del rango en vez del final.
// Por eso la linea se borra por donde empezo, que es como se borra un trazo de verdad.
//
// LOS SEIS TIEMPOS (beats sobre 36)
//   0   ESPACIO   la primera forma se dibuja sola, sin texto. Es la unica que se ve entera.
//   5   MARCA     la linea se cierra en un arco y el nombre queda dentro.
//   11  PROMESA   se estira en una recta larga y el claim se apoya encima.
//   17  PRUEBA    se abre en un marco y la pagina del cliente aparece adentro.
//   24  RAZONES   se enrosca; cada cifra llega con una vuelta.
//   30  PEDIDO    se cierra en un circulo y el CTA queda en el centro.

import { THREE, mate, luz, iluminar, domo } from '../nucleo.js'
import { entra, sale, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { colorDePeso, grisDePeso } from '../recetas.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'hilo',
  nombre: 'Hilo',
  familia: 'sobrio',
  necesita: ['nada'],
  beats: 36,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 24, pedido: 30 },
  pitch: 'Una sola línea que se dibuja sola y cambia de forma en cada tiempo. Mínima, de marca digital.',
}

export function build(ctx) {
  const { escena, pagina, camara, tl, mundoW, mundoH, distBase } = ctx
  const uso = {}

  const R = ctx.recetas || { velocidad: 1, capas: 3, dureza: 0.75, margen: 0.88, cifras: 3, frases: 2,
    acentoMasa: false, vacio: 0.5, movimientos: 4, paleta: [], medido: false }
  uso.retrato = !!R.medido
  const medio = (v) => 1 + (v - 1) * 0.45

  iluminar(escena, { key: 0.7, relleno: 1.0 })
  const uDomo = domo(escena, { fuerza: 0.05 })
  // El bloom se deja un poco mas alto que en `folio`: la linea ES emisiva y su halo es la mitad de lo
  // que la hace ver dibujada a mano y no vectorial. Pero no llega al del aire, que la fundiria.
  if (ctx.bloom) ctx.bloom.strength = Math.min(ctx.bloom.strength || 0.5, 0.30)

  const Z_CAM = distBase * 0.94
  const DERIVA = 0.09
  const RECORRIDO = 1.0 * medio(R.velocidad)
  const est = { k: 0 }
  tl.fromTo(est, { k: 0 }, { k: 1, duration: b(meta.beats), ease: 'none' }, 0)
  const UTIL = anchoADistancia(mundoW, distBase, Z_CAM, DERIVA)

  // EL CAMPO VA CLARO, Y ESO ES LO CONTRARIO DE LO QUE HICE EN `folio` — a proposito.
  //
  // La primera version copio de `folio` la correccion de "oscurece el fondo para que el sujeto se
  // separe", y salio mal: en `folio` el sujeto es una HOJA CLARA, asi que el cuarto tiene que ser
  // oscuro. Aca el sujeto es la LINEA y el TEXTO, y el texto lo pinta `nivelTexto`, que garantiza
  // contraste contra la paleta de la pagina —blanca en basecamp— y no contra lo que la plantilla
  // resolvio poner detras. Con el campo en nivel(0.46) el nombre salia casi negro sobre azul oscuro.
  //
  // La regla no es "oscurece el fondo": es que el fondo tiene que ir al lado OPUESTO del sujeto. Y en
  // una pieza cuyo sujeto es tipografia, el sujeto es oscuro — asi que el fondo va claro. Que ademas es
  // exactamente el registro que se buscaba: linea de color sobre casi blanco.
  const campo = new THREE.Mesh(new THREE.PlaneGeometry(mundoW * 6, mundoH * 6), mate(nivel(0.05), 1.0))
  campo.position.z = -4
  escena.add(campo)

  const COL = colorDePeso(R, LOOK.acento, 0.18)
  const GROSOR = 0.036 * (1 + (1 - R.vacio) * 0.5)   // un sitio denso pide un trazo un poco mas grueso

  // ---------------------------------------------------------------- las seis formas
  //
  // Cada una es una lista de puntos que `CatmullRomCurve3` suaviza. Se escriben en fracciones del cuadro
  // util y no en unidades: asi la pieza se compone igual en cualquier distancia de camara, y si manana
  // cambia `Z_CAM` no hay que redibujar seis formas a mano.
  const W = UTIL * 0.5, H = mundoH * 0.34
  const P = (x, y) => new THREE.Vector3(x * W, y * H, 0)

  // La TENSION es lo que cambia entre forma y forma, no el dibujo: recta, arco, marco, espiral, circulo.
  // Ninguna representa nada — una forma que representa algo convierte la pieza en un icono animado.
  const FORMAS = [
    // 0 · ESPACIO: una diagonal larga y suelta. Es la unica que se ve entera antes de que haya texto.
    [P(-1.5, -0.9), P(-0.5, -0.2), P(0.5, 0.3), P(1.5, 0.95)],
    // 1 · MARCA: un arco que abraza el nombre por debajo.
    [P(-1.25, 0.45), P(-0.9, -0.5), P(0, -0.78), P(0.9, -0.5), P(1.25, 0.45)],
    // 2 · PROMESA: una recta larga, apenas curvada. El claim se apoya encima.
    [P(-1.45, -0.42), P(-0.5, -0.36), P(0.5, -0.32), P(1.45, -0.26)],
    // 3 · PRUEBA: un marco abierto. No se cierra a proposito — un rectangulo cerrado compite con el
    //     borde del recorte de la pagina, y dos marcos concentricos es el error de `halo` documentado.
    [P(-0.72, -1.05), P(-0.72, 1.05), P(0.72, 1.05), P(0.72, -1.05), P(0.1, -1.05)],
    // 4 · RAZONES: una espiral que se abre. Cada cifra llega con una vuelta.
    [P(0, 0), P(0.35, 0.28), P(0.1, 0.62), P(-0.45, 0.5), P(-0.62, -0.1), P(-0.2, -0.62), P(0.55, -0.6), P(1.0, 0.0)],
    // 5 · PEDIDO: un circulo casi cerrado. Cierra la pieza sin decir "fin".
    [P(0.86, 0.0), P(0.6, 0.62), P(0, 0.86), P(-0.6, 0.62), P(-0.86, 0.0), P(-0.6, -0.62), P(0, -0.86), P(0.55, -0.66)],
  ]

  const SEG = 220        // segmentos a lo largo del tubo: define la finura del "dibujado"
  const hilos = FORMAS.map((pts, i) => {
    const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4)
    const geo = new THREE.TubeGeometry(curva, SEG, GROSOR, 8, false)
    const m = new THREE.Mesh(geo, luz(COL, 1.0))
    m.visible = false
    escena.add(m)
    // `setDrawRange` cuenta INDICES, no vertices. Un TubeGeometry indexado tiene
    // SEG * radialSegments * 6 indices, y ese es el numero que hay que animar de 0 al total.
    const total = geo.index ? geo.index.count : geo.attributes.position.count
    return { m, geo, total, i }
  })

  // Dibujar y borrar: dos tweens sobre un contador. El borrado mueve el INICIO del rango, que es lo que
  // hace que la linea se borre por donde empezo en vez de desaparecer de golpe.
  const est6 = hilos.map(() => ({ desde: 0, hasta: 0 }))
  const dibujar = (i, t0, dur) => {
    tl.set(hilos[i].m, { visible: true }, b(t0))
    tl.fromTo(est6[i], { hasta: 0 }, { hasta: 1, duration: b(dur), ease: E.frena(1.6), immediateRender: false }, b(t0))
  }
  const borrar = (i, t0, dur) => {
    tl.fromTo(est6[i], { desde: 0 }, { desde: 1, duration: b(dur), ease: E.acelera(1.6), immediateRender: false }, b(t0))
    tl.set(hilos[i].m, { visible: false }, b(t0 + dur))
  }

  // ---------------------------------------------------------------- los bloques
  const CAJA = UTIL * R.margen * 0.86
  const marca = bloqueMarca({ alto: mundoH * 0.10, anchoMax: CAJA, filete: false, margen: R.margen })
  const promesa = bloquePromesa({ alto: mundoH * 0.046, anchoMax: CAJA, cama: false, maxLineas: 3, margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: W * 1.26, ar: 1.45, marco: false })
  const cifras = bloquesCifra(Math.min(2, R.cifras), { alto: mundoH * 0.11, anchoMax: CAJA * 0.7, margen: R.margen })
  const frases = bloquesFrase(1, { alto: mundoH * 0.028, anchoMax: CAJA, cama: false, margen: R.margen })
  const pedido = bloquePedido({ alto: mundoH * 0.028, anchoMax: CAJA * 0.62, margen: R.margen })

  const poner = (blk, x, y, padre) => {
    blk.g.position.set(x * W, y * H, 0.04)
    ;(padre || escena).add(blk.g)
    return blk.g
  }

  // ---------------------------------------------------------------- 1 · ESPACIO
  // La forma 0 se dibuja sola durante los cinco primeros beats. Es lo unico que pasa, y alcanza: una
  // linea dibujandose es de las pocas cosas que sostienen un cuadro sin nada mas.
  dibujar(0, 0.6, 3.2)
  borrar(0, 4.2, 1.6)

  // ---------------------------------------------------------------- 2 · MARCA
  if (marca) {
    poner(marca, 0, 0.12)
    dibujar(1, 4.6, 2.2)
    entra(marca.g, tl, 5.4, { desde: 'abajo', dist: 0.7, dur: 1.9, ease: E.frena(2.6) })
    marca.escribir(tl, 5.9, 1.6)
    marca.borrar(tl, 9.4)
    sale(marca.g, tl, 9.6, { hacia: 'arriba', dist: 0.7, dur: 1.2 })
    borrar(1, 9.8, 1.6)
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  if (promesa) {
    poner(promesa, 0, 0.12)
    dibujar(2, 10.4, 2.2)
    entra(promesa.g, tl, 11.4, { desde: 'abajo', dist: 0.6, dur: 1.8, ease: E.frena(2.6) })
    promesa.escribir(tl, 11.9, 1.3)
    promesa.borrar(tl, 15.4)
    sale(promesa.g, tl, 15.6, { hacia: 'arriba', dist: 0.6, dur: 1.2 })
    borrar(2, 15.8, 1.6)
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  // El marco se dibuja ANTES que la pagina y se termina de cerrar DESPUES de que aparece: la linea
  // presenta y despues envuelve. Es la unica coreografia de la pieza y por eso es la que se recuerda.
  if (prueba) {
    poner(prueba, 0, 0, pagina)
    dibujar(3, 16.4, 2.6)
    entra(prueba.g, tl, 17.4, { desde: 'fondo', dist: 1.3, dur: 2.0, ease: E.frena(2.4) })
    prueba.escribir(tl, 17.8, 1.4)
    prueba.recorrer(tl, 18.8, 4.2, 0.9)
    sale(prueba.g, tl, 22.6, { hacia: 'fondo', dist: 1.3, dur: 1.3 })
    borrar(3, 22.8, 1.6)
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  cifras.forEach((c, i) => {
    const t0 = 24 + i * 2.8
    poner(c, 0, 0.05)
    if (i === 0) dibujar(4, 23.4, 3.0)
    entra(c.g, tl, t0, { desde: 'abajo', dist: 0.6, dur: 1.7, ease: E.frena(2.4) })
    c.escribir(tl, t0 + 0.4, 1.1)
    c.borrar(tl, t0 + 2.1)
    sale(c.g, tl, t0 + 2.3, { hacia: 'arriba', dist: 0.6, dur: 1.2 })
  })
  uso.cifras = cifras.length
  borrar(4, 29.0, 1.6)

  frases.forEach((f) => {
    const t0 = 25.6
    poner(f, 0, -0.62)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 0.5, dur: 1.6, ease: E.frena(2.4) })
    f.escribir(tl, t0 + 0.4, 1.0)
    f.borrar(tl, t0 + 2.6)
    sale(f.g, tl, t0 + 2.8, { hacia: 'abajo', dist: 0.5, dur: 1.2 })
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL CIRCULO NO SE BORRA. Es la unica forma de las seis que queda en pantalla hasta el ultimo cuadro:
  // durante toda la pieza la linea se dibujo y se borro, y que la ultima se quede es el cierre. No hace
  // falta nada mas — ni un fundido, ni un flash.
  let latido = null
  if (pedido) {
    poner(pedido, 0, 0)
    dibujar(5, 29.4, 3.0)
    entra(pedido.g, tl, 30.4, { desde: 'abajo', dist: 0.6, dur: 1.8, ease: E.frena(2.6) })
    pedido.escribir(tl, 30.9, 1.2)
    latido = pedido.latir(0.014)
    uso.cta = pedido.tieneCta
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // El rango de dibujo se aplica ACA y no con tweens sobre `geometry` porque `setDrawRange` no es una
  // propiedad interpolable: lo que se tuenea es el contador, y traducirlo a indices es una cuenta que
  // tiene que correr en cada submuestra del obturador — si corriera una vez por cuadro, el barrido del
  // obturador mostraria la linea a saltos justo donde deberia verse dibujandose.
  const alSeek = juntar(latido, (t) => {
    uDomo.uT.value = t
    const k = est.k
    camara.position.set(Math.sin(t * 0.087) * DERIVA, Math.sin(t * 0.069 + 1.2) * DERIVA * 0.6,
      Z_CAM + RECORRIDO * 0.5 - RECORRIDO * k)
    camara.rotation.set(0, 0, Math.sin(t * 0.05) * 0.003)
    for (let i = 0; i < hilos.length; i++) {
      const h = hilos[i], e = est6[i]
      // Los indices tienen que ser multiplos de 3: un rango que corta por la mitad de un triangulo
      // dibuja un triangulo con un vertice de otro, y eso se ve como un pico saliendo del trazo.
      const ini = Math.floor((e.desde * h.total) / 3) * 3
      const fin = Math.floor((e.hasta * h.total) / 3) * 3
      h.geo.setDrawRange(ini, Math.max(0, fin - ini))
    }
  })

  return { dur: b(meta.beats), alSeek, uso }
}
