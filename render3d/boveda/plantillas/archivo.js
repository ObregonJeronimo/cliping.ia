// PLANTILLA "archivo" — un mueble de cajones que se abre SOLO al paso de la camara.
//
// EL GESTO
// El muro no es el fondo: es el que ACTUA. La camara se desliza de costado por delante de un mueble de
// archivo —cajones, fichas, cajas rotuladas— y el cajon que le toca a cada tiempo SALE hacia afuera con
// el bloque montado en su cara. Cuando la camara lo pasa, el cajon se vuelve a cerrar y el dato queda
// guardado. Entre medio hay un CORO: uno de cada seis cajones se abre y se cierra por su cuenta durante
// los treinta y ocho beats, asi que el mueble esta vivo desde el cuadro uno y no solo cuando le toca.
//
// EN QUE SE DIFERENCIA DE `reticula`, QUE TAMBIEN ES UN MURO EN DESLIZ
// En `reticula` el muro es una SUPERFICIE: pasa, da volumen y no hace nada — todo el trabajo lo hacen
// los bloques que lo cruzan por delante. Aca el muro es el MECANISMO, y los seis tiempos no son textos
// que pasan por delante del espacio sino cajones del espacio que se abren. Un bloque no aparece encima
// del mueble: SALE del mueble. La prueba de que la diferencia es real es que aca el texto se coloca
// contra la CARA de su cajon —una superficie que existe, que se puede medir y que se mueve— y no
// contra el cuadro.
//
// PARA QUE MARCA SIRVE
// Datos, catalogo, biblioteca, gestion, inventario. Un CRM, un ERP, un estudio contable, una
// inmobiliaria con cartera, un laboratorio de analisis. La metafora es literal y esa es la gracia: lo
// que la marca hace es guardar cosas y encontrarlas cuando hacen falta.
//
// LOS SEIS TIEMPOS (beats sobre 38)
//   0   ESPACIO   el mueble pasando, el coro abriendo y cerrando, las fichas sueltas cruzando. Sin texto.
//   5   MARCA     un cajon ancho se abre y el nombre CAE dentro de su cara.
//   11  PROMESA   otro cajon, mas abajo; el claim entra por la izquierda y sale por la derecha.
//   17  PRUEBA    una bandeja baja se abre y la pagina se LEVANTA de ella, como un documento que se saca.
//   25  RAZONES   cinco cajones a distintas alturas, encabalgados: las cifras arriba, las frases abajo.
//   32  PEDIDO    el ultimo cajon se abre, se SUELTA del mueble y viaja pegado al cuadro hasta el final.
//
// SIN MATERIAL: cada tiempo que la pagina no puede llenar simplemente no reserva su cajon, y el mueble
// se arma con cajones chicos en ese lugar. Un tiempo que falta no deja un agujero con forma de cartel.

import { THREE, metal, luz, barra, iluminar, domo, polvo } from '../nucleo.js'
import { vueloDesliz, entra, sale, acompanar, respirar, juntar, anchoADistancia } from '../movimiento.js'
import { bloqueMarca, bloquePromesa, bloquePrueba, bloquesCifra, bloquesFrase, bloquePedido } from '../bloques.js'
import { LOOK, nivel, E, b } from '../../demo/kit.js'

export const meta = {
  id: 'archivo',
  nombre: 'Archivo',
  familia: 'objeto',
  necesita: ['nada'],
  beats: 38,
  tiempos: { espacio: 0, marca: 5, promesa: 11, prueba: 17, razones: 25, pedido: 32 },
  pitch: 'Un mueble de cajones que se abren solos al paso de la cámara y traen cada dato en su cara. Para marcas de datos, catálogo y gestión.',
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

  iluminar(escena, { key: 1.15, relleno: 0.48 })
  const uDomo = domo(escena, { fuerza: 0.20 })
  const motas = polvo(escena, 950, 26)

  // ---------------------------------------------------------------- el vuelo, y por que a esta velocidad
  //
  // LA VELOCIDAD DEL DESLIZ LA DECIDE CUANTO TIENE QUE DURAR UN CAJON ABIERTO, no el gusto. Un objeto
  // quieto en un desliz se ve `mundoW / v` beats, y con `v = LARGO / beats` eso es `beats · mundoW /
  // LARGO`: 38 / 4.6 = 8.3 beats de ventana. Los dos tiempos mas largos de la pieza —prueba con 7 y
  // pedido con 6— entran enteros, que es exactamente lo que hace falta aca: un cajon del mueble no
  // puede perseguir a la camara sin arrancarse del mueble.
  //
  // `reticula` corre a 7.5 anchos y su ventana da 4.8 beats, y por eso alli TODO viaja. Que las dos
  // sean deslices y elijan velocidades tan distintas no es un descuido: la velocidad sale de lo que el
  // espacio permite, y un muro liso permite lo que un mecanismo no.
  const LARGO = mundoW * 4.6
  const vuelo = vueloDesliz(camara, tl, { distBase, beats: meta.beats, largo: (LARGO) * R.velocidad, dist: 1.0 })
  const xEn = vuelo.xEn
  const Z_CAM = distBase

  // Lo que el vaiven del vuelo se come del ancho, con la cuenta hecha: el balanceo de z es +-0.7, y a
  // 0.7 mas cerca el cuadro se angosta `mundoW · 0.7 / distBase` = 0.23, o sea 0.11 por lado; el
  // balanceo de 0.008 rad en z se lleva otros `mundoH/2 · 0.008` = 0.04. Son 0.15 por lado y se reserva
  // el doble, que es lo que cuesta no tener que volver a mirarlo.
  const DERIVA = 0.30

  // ---------------------------------------------------------------- las medidas del mueble
  const PROF = 1.25                 // fondo de un cajon
  const SAL = 2.2                   // cuanto sale un cajon protagonico
  const MODW = 1.85, MODH = 1.24    // el modulo del mueble
  const JUNTA = 0.07                // la junta entre dos cajones. Por ahi se ve la luz de adentro.
  const MARGEN = 0.26               // aire entre el bloque y el canto de su cara

  // EL ANCHO DE LA CARA DE UN CAJON ABIERTO SE MIDE CONTRA EL CUADRO QUE HAY A SU DISTANCIA, y con el
  // cajon afuera esa distancia no es `distBase`: es `Z_CAM - SAL` = 15.2, donde el cuadro mide 4.91 y
  // no 5.62. Medir contra `mundoW` daria una cara un 14% mas ancha que el cuadro que la tiene que
  // contener — o sea el texto cortado a los dos lados justo en el beat en que hay que leerlo, que es el
  // defecto que `anchoADistancia` existe para evitar.
  const CARA = anchoADistancia(mundoW, distBase, Z_CAM - SAL, DERIVA)
  const ANCHO_TXT = CARA - MARGEN * 2
  // Y el alto por la misma cuenta: `mundoH · 15.2 / 17.4` = 8.74, o sea +-4.37 desde el eje.
  const ALTO_CARA = mundoH * ((Z_CAM - SAL) / distBase)
  const TOPE_Y = ALTO_CARA * 0.47

  // Semilla propia y determinista. `ctx.rnd` la comparten los bloques, y compartirla haria que el
  // dibujo del mueble cambiara porque la pagina trajo una frase mas. Un mueble que cambia con el texto
  // es un mueble que no se puede depurar.
  let sem = 19470311
  const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296 }

  const matCajon = [metal(nivel(0.18), 0.42), metal(nivel(0.26), 0.52), metal(nivel(0.34), 0.34)]
  const matGrande = metal(nivel(0.21), 0.38)
  const matFicha = metal(nivel(0.14), 0.46)

  // LA LUZ VIVE DETRAS DEL MUEBLE Y SE VE POR LAS JUNTAS. Una sola malla dibuja la cuadricula entera:
  // cada junta de 0.07 y cada hueco sin cajon se vuelve una linea encendida, y no hay que modelar ni
  // una.
  //
  // La otra opcion —una boca iluminada por cajon— NO FUNCIONA, y la cuenta lo dice antes que el render.
  // Un cajon abierto queda 2.2 mas cerca del lente: en pantalla se agranda un 14%, asi que TAPA su
  // propio agujero por grande que se lo haga. Para ver luz alrededor de un cajon afuera, la boca
  // tendria que ser una unidad mas ancha que el, y eso ya no es un cajon en su hueco sino un cajon
  // perdido en un agujero.
  //
  // Va en el acento y no en `nivel(k)`: `nivel(0.05)` es casi blanco en un aire claro y casi negro en
  // uno oscuro, o sea que la lampara se apagaria sola en la mitad de los once aires. El acento es lo
  // unico de la paleta con contraste garantizado contra los dos fondos.
  const fondoLuz = new THREE.Mesh(new THREE.PlaneGeometry(LARGO * 2.6, mundoH * 3.4),
    luz(LOOK.acento2 || LOOK.acento, 1.0))
  fondoLuz.position.z = -PROF * 3.4
  escena.add(fondoLuz)

  // ---------------------------------------------------------------- un cajon
  //
  // El origen del grupo esta en el CENTRO DE SU CARA con el cajon cerrado, asi que abrirlo es mover
  // `position.z` y nada mas. Ninguna otra parte de la plantilla tiene que saber de que fondo es.
  const cajon = (w, h, mat, conTirador) => {
    const g = new THREE.Group()
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, PROF), mat)
    c.position.z = -PROF / 2
    g.add(c)
    if (conTirador) {
      const t = barra(w * 0.34, Math.min(0.05, h * 0.06), LOOK.acento, 1.4)
      t.position.set(0, -h * 0.30, 0.006)
      g.add(t)
    }
    return g
  }

  // EL FILETE DE LA CARA, y es la senal de que ESE cajon es el que esta hablando. Se dibuja solo
  // mientras el cajon sale y se borra mientras vuelve, asi que el mecanismo se lee aunque el
  // desplazamiento en z de un objeto frontal sea el movimiento mas dificil de percibir que hay.
  const marcoLuz = (w, h) => {
    const g = new THREE.Group()
    const gr = 0.032
    const lados = [[w, gr, 0, h / 2 - gr / 2], [w, gr, 0, -h / 2 + gr / 2],
      [gr, h, -w / 2 + gr / 2, 0], [gr, h, w / 2 - gr / 2, 0]]
    for (const l of lados) {
      const m = barra(l[0], l[1], LOOK.acento, 1.5)
      m.position.set(l[2], l[3], 0.014)
      g.add(m)
    }
    g.scale.set(0.0001, 0.0001, 1)
    return g
  }

  // ---------------------------------------------------------------- el encaje de los cajones grandes
  //
  // Cada cajon protagonico RESERVA su rectangulo, y el mueble se arma despues alrededor de las
  // reservas. Asi ningun cajon chico queda metido adentro de uno grande.
  const reservas = []
  const chocan = (r) => reservas.some(o => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0)

  // Y BUSCAR UNA ALTURA LIBRE NO ES UNA PRECAUCION TEORICA. El ancho de un cajon sale del ancho de SU
  // texto y el texto sale de la pagina del cliente: dos tiempos que con una pagina quedan a medio metro
  // se pisan con la siguiente. El defecto no daria error ni aviso — saldrian dos cajones cruzados
  // adentro del mismo agujero, que es la familia de defectos que este motor ya pago tres veces.
  //
  // Se prueba la altura pedida y despues de a un modulo para arriba y para abajo, sin pasarse del
  // cuadro. Las alturas pedidas ya estan elegidas para no tocarse con una pagina normal; esto es la red.
  const rectDe = (x, y, w, h) => ({
    x0: x - w / 2 - JUNTA, x1: x + w / 2 + JUNTA,
    y0: y - h / 2 - JUNTA, y1: y + h / 2 + JUNTA,
  })
  const alturaLibre = (x, y, w, h) => {
    for (const d of [0, -1, 1, -2, 2, -3, 3]) {
      const yy = y + d * MODH
      if (Math.abs(yy) + h / 2 > TOPE_Y) continue
      if (!chocan(rectDe(x, yy, w, h))) return yy
    }
    // Y SI NINGUN MODULO ENTERO ENTRA, SE BUSCA FINO ANTES DE RENDIRSE. El salto de un modulo es
    // groseramente grande cuando una cara mide tres unidades y media: hay huecos de un cuarto de modulo
    // que sirven y que la busqueda gruesa saltea, y entonces la funcion devolvia la altura PEDIDA — o
    // sea dos cajones cruzados dentro del mismo agujero, que es exactamente lo que esto existe para
    // evitar. Un cajon grande no esta alineado a la grilla del mueble de todos modos: su alto sale del
    // texto, no del modulo.
    for (let k = 1; k <= 40; k++) {
      for (const s of [-1, 1]) {
        const yy = y + s * k * (MODH / 8)
        if (Math.abs(yy) + h / 2 > TOPE_Y) continue
        if (!chocan(rectDe(x, yy, w, h))) return yy
      }
    }
    return y
  }

  const cajonEn = (beat, y, w, h) => {
    const x = xEn(beat)
    const yy = alturaLibre(x, y, w, h)
    reservas.push(rectDe(x, yy, w, h))
    const g = cajon(w, h, matGrande, false)
    g.position.set(x, yy, 0)
    escena.add(g)
    const marco = marcoLuz(w, h)
    g.add(marco)
    return { g, marco, w, h, x, y: yy }
  }

  // UN CAJON HECHO A LA MEDIDA DE SU BLOQUE, y en ese orden. `bloques.js` MIDE lo que compuso, asi que
  // preguntarle primero y cortar la madera despues es lo que garantiza que ningun texto se salga de la
  // cara que lo sostiene — con cualquier pagina, no con la que tenia a mano el dia que lo escribi.
  //
  // `sesgo` sube el bloque dentro de la cara, y hace falta en tres de los seis: la marca cuelga su
  // filete y su rotulo, la cifra su etiqueta y el pedido su dominio, asi que el centro de dibujo de
  // esos bloques NO es el centro de su caja. Sin corregirlo quedan pegados al canto de abajo del cajon.
  // `altoK` es la misma correccion del otro lado: cuanto mide de verdad lo que el bloque declara.
  //
  // Y LO QUE UN BLOQUE DIBUJA NO ES SIEMPRE LO QUE DECLARA, que es el agujero por el que se colaba el
  // unico bloque que no entraba en su propia cara. `bloquePromesa` monta una CAMA detras del claim y
  // `cama()` la hace `alto·0.32` mas ancha y `alto·0.34` mas alta que el texto: con tres renglones son
  // 0.31 y 0.35 por lado que NO figuran en `bloque.ancho` ni en `bloque.alto`. Cortada la madera a la
  // medida declarada, la placa quedaba colgando fuera de la cara y tapaba el filete — que es justo la
  // senal de que ese cajon es el que esta hablando.
  //
  // `cama()` y `letras()` anotan su tamano en `userData`, asi que se mide lo que hay colgado del grupo
  // en vez de creerle al bloque. Para los cinco que no traen cama el maximo es el declarado y no cambia
  // nada; es la misma idea de siempre —preguntar antes de cortar— aplicada al objeto y no al informe.
  const dibujado = (bloque) => {
    let w = bloque.ancho, h = bloque.alto
    for (const o of bloque.g.children) {
      const u = o.userData || {}
      if (u.ancho > w) w = u.ancho
      if (u.alto > h) h = u.alto
    }
    return { w, h }
  }
  const cajonPara = (bloque, beat, y, op) => {
    op = op || {}
    const dib = dibujado(bloque)
    const w = Math.min(CARA, dib.w + MARGEN * 2)
    const h = Math.max(bloque.alto * (op.altoK != null ? op.altoK : 1), dib.h) + MARGEN * 2
    const c = cajonEn(beat, y, w, h)
    bloque.g.position.set(0, (op.sesgo || 0) * bloque.alto, 0.06)
    c.g.add(bloque.g)
    return c
  }

  // ABRIR Y CERRAR. Sale con `frena` —un cajon pesado que llega y se planta— y vuelve con `acelera`,
  // que es como se guarda algo: sin ganas al principio y de golpe al final.
  const abrir = (c, t0, dur) => {
    tl.to(c.g.position, { z: SAL, duration: b(dur != null ? dur : 1.6), ease: E.frena(3) }, b(t0))
    tl.to(c.marco.scale, { x: 1, y: 1, duration: b(1.0), ease: 'power3.out' }, b(t0 + 0.4))
  }
  const cerrar = (c, t0, dur) => {
    tl.to(c.marco.scale, { x: 0.0001, y: 0.0001, duration: b(0.5), ease: 'power2.in' }, b(t0))
    tl.to(c.g.position, { z: 0, duration: b(dur != null ? dur : 1.4), ease: E.acelera(2) }, b(t0 + 0.2))
  }

  // ---------------------------------------------------------------- los bloques, medidos contra la cara
  const marca = bloqueMarca({ alto: 1.10, anchoMax: ANCHO_TXT , margen: R.margen })
  const promesa = bloquePromesa({ alto: 0.52, anchoMax: ANCHO_TXT, maxLineas: 3 , margen: R.margen })
  const prueba = bloquePrueba(ctx, { ancho: mundoW * 0.44, ar: 1.5 })
  const cifras = bloquesCifra(R.cifras, { alto: 0.78, anchoMax: ANCHO_TXT * 0.52 , margen: R.margen })
  const frases = bloquesFrase(R.frases, { alto: 0.28, anchoMax: ANCHO_TXT * 0.70, maxLineas: 2 , margen: R.margen })
  const pedido = bloquePedido({ alto: 0.32, anchoMax: ANCHO_TXT * 0.72 , margen: R.margen })

  // LOS BLOQUES ENTRAN POR EL AIRE Y SALEN POR EL AIRE; EL QUE SE GUARDA ES EL CAJON. Un bloque que se
  // fuera hacia el fondo desapareceria en el primer decimo de su salida —cualquier z negativa ya esta
  // adentro de la caja que lo sostiene— y eso se leeria como un corte, no como una salida. La lectura
  // de "esto se archiva" la da el cajon cerrandose despues, que es lo unico que de verdad se guarda.

  // ---------------------------------------------------------------- 2 · MARCA
  //
  // El cajon se abre ANTES de que llegue el nombre: primero se ve al mueble hacer algo y recien despues
  // aparece que era eso lo que traia. Al reves, el texto llega a un sitio que todavia no existe.
  if (marca) {
    const c = cajonPara(marca, 7.0, 0.9, { altoK: 1.15, sesgo: 0.24 })
    abrir(c, 4.2, 1.7)
    entra(marca.g, tl, 5, { desde: 'arriba', dist: 5.5, dur: 1.6 })
    marca.escribir(tl, 5.4, 1.3)
    marca.borrar(tl, 9.3)
    sale(marca.g, tl, 9.5, { hacia: 'arriba', dist: 5.5, dur: 1.0 })
    cerrar(c, 10.4)
    uso.marca = true
  }

  // ---------------------------------------------------------------- 3 · PROMESA
  // Cruza la cara del cajon de lado a lado. Es el unico bloque que entra y sale por lados OPUESTOS: el
  // claim es lo que hay que leer entero, y un texto que atraviesa se lee mas tiempo que uno que vuelve.
  if (promesa) {
    const c = cajonPara(promesa, 13.8, -0.7, {})
    abrir(c, 10.2, 1.7)
    entra(promesa.g, tl, 11, { desde: 'izq', dist: 6.5, dur: 1.7 })
    promesa.escribir(tl, 11.4, 1.0)
    promesa.borrar(tl, 15.3)
    sale(promesa.g, tl, 15.5, { hacia: 'der', dist: 7, dur: 1.1 })
    cerrar(c, 16.5)
    uso.claim = true
    uso.claimRecortado = promesa.recortado
  }

  // ---------------------------------------------------------------- 4 · PRUEBA
  //
  // EL UNICO BLOQUE QUE NO VA MONTADO EN UNA CARA, y por una medida: la pagina mide casi cuatro
  // unidades de alto y el cajon mas alto del mueble mide dos y media. No hay cara que la sostenga. Asi
  // que su cajon es una BANDEJA baja y la pagina se LEVANTA de ella — que ademas es el gesto correcto,
  // un documento que se saca de la ficha y no una lamina pegada a un frente.
  //
  // Y va a `ctx.pagina`, que es OTRA ESCENA y se dibuja en un pase posterior, asi que no se puede
  // colgar del grupo del cajon como los demas. Se las mantiene pegadas con DOS `acompanar` identicos
  // —mismo t0, mismo t1, mismo retraso, misma ease lineal— que es lo unico que garantiza que no se
  // separen. Y por lo mismo la pagina NO puede quedar tapada por la bandeja: ese pase no comparte la
  // profundidad, asi que se dibuja siempre encima. Se compone contando con eso, no peleandolo.
  if (prueba) {
    const wB = Math.min(CARA, prueba.ancho + 0.9)
    const c = cajonEn(20.6, -2.6, wB, MODH - JUNTA)
    abrir(c, 16.2, 1.8)
    prueba.g.position.set(c.x, c.y + prueba.alto / 2 + 0.42, SAL + 0.1)
    prueba.g.rotation.y = 0.30
    pagina.add(prueba.g)
    // ENTRA Y SALE POR FUERA DEL CUADRO, Y EL CUADRO A SU PROFUNDIDAD NO MIDE `mundoH`. La pagina vive
    // en `SAL + 0.1`, o sea a 15.14 del lente, donde el alto util es `mundoH · 15.14 / 17.44` = 8.68:
    // +-4.34 desde el eje, mas el vaiven de 0.42 que el desliz le mete a la camara en `y`.
    //
    // Con la distancia atada al alto de la pagina —`alto·0.9 + 1.4` = 4.74— arrancaba con su borde de
    // arriba 0.84 unidades DENTRO del encuadre, y salia dejandolo 0.69 adentro: la pagina se encendia y
    // se apagaba a la vista. Es el cartel que prohibe la regla 2, y encima en la unica capa que se
    // dibuja siempre por encima de todo, asi que no hay nada que la tape mientras aparece.
    //
    // El salto se calcula, no se calibra: desde donde esta parada hasta el piso del cuadro, mas su
    // propio medio alto y un margen. El piso de `alto·0.9 + 1.4` queda por si la bandeja termina muy
    // abajo y la cuenta diera un salto corto.
    const ALTO_PAG = mundoH * ((Z_CAM - (SAL + 0.1)) / distBase)
    const SALTO_P = Math.max(prueba.alto * 0.9 + 1.4,
      prueba.g.position.y + ALTO_PAG / 2 + prueba.alto / 2 + 0.6)
    entra(prueba.g, tl, 17, { desde: 'abajo', dist: SALTO_P, dur: 2.0 })
    prueba.escribir(tl, 17.2, 1.2)
    prueba.recorrer(tl, 17.8, 5.4, 0.92)
    // El giro es lo que la vuelve un OBJETO. Un plano de frente con una captura encima es una textura
    // pegada; el mismo plano girando mientras la camara lo pasa es una pantalla en un espacio.
    tl.to(prueba.g.rotation, { y: -0.24, duration: b(6.0), ease: 'none' }, b(18.4))
    acompanar(prueba.g, tl, 18.6, 24.0, xEn, 0.6)
    acompanar(c.g, tl, 18.6, 24.0, xEn, 0.6)
    sale(prueba.g, tl, 23.4, { hacia: 'abajo', dist: SALTO_P, dur: 1.3 })
    cerrar(c, 24.6)
    respiraciones.push(respirar(prueba.g, { amp: 0.07, giro: 0.018, fase: 0.9 }))
    uso.pagina = prueba.fuente
  }

  // ---------------------------------------------------------------- 5 · RAZONES
  //
  // CINCO CAJONES ENCABALGADOS, que es el unico tiempo donde el mecanismo se ve como mecanismo: uno se
  // esta cerrando mientras el siguiente ya sale. Las cifras arriba y las frases abajo, y las alturas
  // elegidas para que dos rectangulos vecinos no se toquen con una pagina normal — `alturaLibre` cubre
  // las que no lo son.
  const Y_CIFRA = [2.4, 0.6, 2.4]
  cifras.forEach((c, i) => {
    const t0 = 25 + i * 2.0
    const s = i % 2 === 0 ? 1 : -1
    const caj = cajonPara(c, t0 + 1.2, Y_CIFRA[i % 3], { altoK: 1.35, sesgo: 0.15 })
    abrir(caj, t0 - 0.8, 1.4)
    entra(c.g, tl, t0, { desde: s > 0 ? 'der' : 'izq', dist: 5.5, dur: 1.2 })
    c.escribir(tl, t0 + 0.3, 0.75)
    sale(c.g, tl, t0 + 2.2, { hacia: s > 0 ? 'izq' : 'der', dist: 6, dur: 0.9 })
    cerrar(caj, t0 + 3.0, 1.2)
  })
  uso.cifras = cifras.length

  const Y_FRASE = [-2.6, -1.35]
  frases.forEach((f, i) => {
    const t0 = 26 + i * 3.6
    const caj = cajonPara(f, t0 + 1.2, Y_FRASE[i % 2], {})
    abrir(caj, t0 - 0.8, 1.4)
    entra(f.g, tl, t0, { desde: 'abajo', dist: 4.5, dur: 1.3 })
    f.escribir(tl, t0 + 0.4, 0.8)
    f.borrar(tl, t0 + 2.4)
    sale(f.g, tl, t0 + 2.6, { hacia: 'abajo', dist: 5, dur: 1.0 })
    cerrar(caj, t0 + 3.4, 1.2)
  })
  uso.frases = frases.length

  // ---------------------------------------------------------------- 6 · PEDIDO
  //
  // EL ULTIMO CAJON SE SUELTA DEL MUEBLE. Sale como los otros y despues, en vez de volver, se queda
  // clavado al cuadro mientras el archivo entero sigue corriendo detras: es lo unico de la pieza que no
  // se mueve respecto del ojo, que es lo que hace falta para leer y tipear un CTA. La camara no frena
  // —la regla 1 no lo admite— y no hace falta que frene, porque el mueble pasando atras alcanza y sobra
  // para que se siga sintiendo en movimiento.
  //
  // Y NO SE SACA MAS DE `SAL`. A 2.2 la cara ya ocupa el 88% del cuadro util; un poco mas afuera queda
  // mas cerca del lente, el cuadro a esa distancia se angosta y el CTA sale cortado a los dos lados.
  let latido = null
  if (pedido) {
    const c = cajonPara(pedido, 33.6, 0.25, { altoK: 0.82, sesgo: 0.15 })
    abrir(c, 31.2, 1.8)
    entra(pedido.g, tl, 32, { desde: 'der', dist: 5.5, dur: 1.6 })
    acompanar(c.g, tl, 33.6, meta.beats, xEn, 1.0)
    pedido.escribir(tl, 32.4, 0.9)
    latido = pedido.latir(0.032)
    uso.cta = pedido.tieneCta
    // El unico sitio de la pieza donde la luz sube. El ojo lo lee como que algo se resolvio.
    tl.to(ctx.bloom, { strength: (ctx.bloom.strength || 0.5) * 1.6, duration: b(2.0), ease: E.frena(2) }, b(31.6))
  }

  // ---------------------------------------------------------------- el mueble
  //
  // SE CONSTRUYE AL FINAL, y no es un capricho de orden: los cajones grandes ya reservaron su
  // rectangulo, asi que el mueble se arma ALREDEDOR de ellos. Y los que no existen —porque la pagina no
  // dio ese dato— dejan su lugar a cajones chicos, o sea que un tiempo que falta no deja un hueco con
  // forma de cartel: no se nota.
  //
  // Va FILA POR FILA caminando en x y eligiendo cada ancho. Un archivo real no es una grilla perfecta
  // —hay cajones anchos, angostos y huecos donde falta uno— y la grilla perfecta es justo lo que hace
  // que un muro se lea como papel pintado.
  // EL MUEBLE SE MIDE CONTRA EL RECORRIDO REAL, NO CONTRA `LARGO`. La camara viaja `LARGO · R.velocidad`
  // y el retrato manda esa velocidad hasta 1.45, asi que el multiplicador tiene que estar en los DOS
  // lados de la cuenta. Estaba solo en el vuelo: con 1.45 la camara llegaba a 18.76 y el mueble
  // terminaba en 20.25, o sea que en el ultimo beat —el del CTA— el borde derecho del cuadro se quedaba
  // 1.32 unidades sin mueble, un 23% del ancho. Y lo que se ve ahi no es el vacio: es `fondoLuz`, un
  // plano emisivo de acento a intensidad plena que ademas florece con el bloom.
  //
  // No hay sintoma a velocidad neutra y por eso se escapa leyendo: la cuenta sale mal recien pasado
  // 1.348. Es el mismo aviso que `reticula` deja escrito para su muro — "tiene que ser mas largo que
  // eso o se termina antes que la pieza" — y el caso que la compuerta ejerce con su retrato extremo.
  const ANCHO_MUEBLE = LARGO * R.velocidad + mundoW * 2.6
  const mueble = new THREE.Group()
  escena.add(mueble)
  const coro = []
  const ANCHOS = [1, 1, 1.5, 2]
  for (let j = -5; j <= 5; j++) {
    const y = j * MODH
    let x = -ANCHO_MUEBLE / 2
    while (x < ANCHO_MUEBLE / 2) {
      const w = MODW * ANCHOS[Math.floor(az() * 4)] - JUNTA
      const cx = x + w / 2
      x += w + JUNTA
      const r = az()
      if (r < 0.13) continue                                  // huecos: por ahi se ve la luz del fondo
      if (chocan({ x0: cx - w / 2, x1: cx + w / 2, y0: y - MODH / 2, y1: y + MODH / 2 })) continue
      const g = cajon(w, MODH - JUNTA, matCajon[Math.floor(az() * 3)], r > 0.55)
      g.position.set(cx, y, 0)
      mueble.add(g)
      // EL CORO. Uno de cada seis se abre y se cierra solo durante toda la pieza, y es lo unico que
      // pasa en el tiempo de ESPACIO: sin el, los primeros cinco beats serian un muro quieto pasando y
      // la plantilla no se distinguiria de `reticula` hasta el beat 5.
      if (coro.length < 24 && az() < 0.17) {
        coro.push({ g, sal: 0.45 + az() * 0.5, per: 4.5 + az() * 6.5, fase: cx / 9 + az() * 0.3 })
      }
    }
  }

  // ---------------------------------------------------------------- las otras dos velocidades
  //
  // LA CAPA LEJANA HAY QUE GANARSELA EN ESTE ESPACIO: el mueble tapa el cuadro entero, asi que lo que
  // este detras solo se ve POR LOS HUECOS. Son cajas chicas un par de unidades mas atras que derivan
  // lentisimo; por un hueco se ve que ahi hay mas archivo y que se mueve a otro ritmo, que es lo unico
  // que un hueco tiene que decir.
  const hondo = new THREE.Group()
  escena.add(hondo)
  for (let i = 0; i < 44; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7 + az() * 0.8, 0.5 + az() * 0.4, 0.4), matCajon[2])
    m.position.set(-ANCHO_MUEBLE / 2 + az() * ANCHO_MUEBLE, (az() - 0.5) * mundoH * 1.5, -PROF * (1.2 + az() * 1.1))
    hondo.add(m)
  }

  // Y LA CAPA CERCANA SON FICHAS SUELTAS cruzando a toda velocidad. Van repartidas hacia arriba y hacia
  // abajo A PROPOSITO: una ficha cruzando delante del claim es ruido en el unico momento en que hay que
  // LEER, y a mas de 1.8 del eje pasan por donde no hay texto.
  const PASO_F = 11
  const fichas = new THREE.Group()
  escena.add(fichas)
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.46 + az() * 0.3, 0.30 + az() * 0.16), matFicha)
    f.userData.x0 = az() * PASO_F
    f.userData.y = (az() < 0.5 ? -1 : 1) * (1.8 + az() * 2.4)
    f.userData.z = distBase * (0.22 + az() * 0.16)
    f.rotation.set(az() * 0.5, az() * 0.8, az() * 1.2)
    fichas.add(f)
  }

  // ---------------------------------------------------------------- lo continuo
  //
  // Todo lo de aca se evalua en CADA submuestra del obturador. Escrito como tween se muestrearia una
  // vez por cuadro y saldria a saltos justo donde el obturador deberia barrerlo — y en esta plantilla
  // eso se llevaria puesto el coro entero, que es su idea.
  //
  // `paralaje()` no sirve: mueve en z y aca el eje es x. No es una excepcion a la regla 3 sino la misma
  // regla en el otro eje.
  const T0 = b(31), TF = b(meta.beats)
  const alSeek = juntar(vuelo.alSeek, latido, (t) => {
    uDomo.uT.value = t
    // EL RUIDO BAJA PARA EL PEDIDO Y LA CAMARA NO. El desliz sigue a la misma velocidad; lo que se
    // aquieta es el mecanismo y las fichas, que es lo que estorba para leer. El descuento crece al
    // cuadrado, asi que la velocidad al entrar en el freno es continua: un escalon de velocidad en una
    // capa rapida se ve como un tiron.
    const d = Math.min(1, Math.max(0, (t - T0) / (TF - T0)))
    const tf = t - 0.4 * Math.max(0, t - T0) * d

    // EL CORO. Cada cajon tiene su periodo y su fase depende de su x, asi que la ola RECORRE el mueble
    // en vez de que se abran todos a la vez. `sin^2` arranca y termina con velocidad cero: ninguno pega
    // un tiron al salir ni al cerrar, y entre medio se queda cerrado el resto del ciclo.
    for (const c of coro) {
      const u = ((tf / c.per + c.fase) % 1 + 1) % 1
      const k = Math.min(1, Math.max(0, (u - 0.05) / 0.45))
      const s = Math.sin(Math.PI * k)
      c.g.position.z = c.sal * s * s
    }

    // Las fichas viven en una franja de 11 unidades ANCLADA A LA CAMARA, y por eso la capa no se acaba
    // nunca sin tener que dibujar sesenta metros de fichas para que pasen cuatro. El salto del bucle
    // cae en `cam.x - 5.5`, y a su distancia el cuadro mide 1.83 de medio ancho: la vuelta ocurre a
    // tres cuadros del borde, o sea que no la ve nadie.
    for (const f of fichas.children) {
      const u = ((f.userData.x0 - tf * 2.6) % PASO_F + PASO_F) % PASO_F
      f.position.set(camara.position.x + u - PASO_F / 2, f.userData.y, f.userData.z)
    }

    hondo.position.x = tf * 0.62
    fondoLuz.position.x = camara.position.x
    motas.position.x = camara.position.x
    motas.rotation.z = t * 0.015
  }, ...respiraciones)

  return { dur: b(meta.beats), alSeek, uso }
}
