// ESCENA "mesa" — el plano OBLICUO. La pagina apoyada sobre una superficie, mirada en angulo.
//
// POR QUE EXISTE
// Las dieciseis escenas del catalogo miran su composicion de frente y de lleno: no hay un solo plano
// picado, contrapicado ni oblicuo en todo el motor. Todo es perpendicular a la camara. Ese es el
// cambio de TIPO mas grande que quedaba disponible — y es ademas lo unico que este motor puede hacer y
// un render 2D no, porque no se trata de dibujar una perspectiva sino de tener uno.
//
// El gesto es el de mirar algo apoyado sobre una mesa: la camara sube, se inclina, y la pagina se lee
// en escorzo mientras se desplaza. Un sitio visto asi deja de ser "una captura de pantalla" y pasa a
// ser un objeto sobre una superficie, que es exactamente la diferencia entre mostrar un producto y
// mostrar la foto de un producto.
//
// EL TEXTO NO VA SOBRE EL PLANO, y no es una preferencia. En escorzo la tipografia pierde altura de x
// contra el borde lejano y se vuelve ilegible justo donde mas importa; y peor, no hay forma de medirlo
// —encuadre-check proyecta cajas, no legibilidad—, asi que seria un defecto sin compuerta posible. El
// rotulo y el pie quedan FRONTALES en `g`, en las bandas que el plano no ocupa.
//
// Y HAY UNA RAZON DE ORDEN DE DIBUJADO ADEMAS: `gr` se dibuja SIEMPRE por encima de `g`, sin importar
// z. Un rotulo en `g` que se solape con el plano queda tapado sin que ningun z lo salve. Por eso la
// composicion reserva la banda de arriba y la de abajo para el texto y deja el medio para la mesa.
//
// SIN MATERIAL NO HAY ESCENA. El sujeto es la pagina: sin la tira y sin recortes, devuelve el grupo
// vacio y ocupa su lugar en silencio, que es la respuesta honesta y la que dan `pantalla`, `columna` y
// `hero` cuando les falta el suyo.

import { LOOK, hex, magnificaInclinado, cuadroMasAngosto, b, E, texto, planoRecorte, recortesDe, nivel, matAcento, materialMascara, finMascara, deriva, dolly, orbita, escalera, ventanaLegible, escalones, enEscalon, deslizFijo, pasosEnBeats } from '../kit.js'
import { D, sello } from '../datos.js'

export const meta = { id: 'mesa', beats: 6 }

// Cuanto se inclina la superficie. Empezo en 0.62 rad (35 grados) y se vio en el render que NO ALCANZA:
// a la distancia base de este motor —18.66 unidades con fov 30— la perspectiva es debil, asi que un
// plano a 35 grados se lee como una pagina apenas torcida y no como algo apoyado. 0.86 rad son 49
// grados, y ahi el borde lejano se cierra lo suficiente para que el ojo lea SUPERFICIE. Mas de 1.0 la
// pagina deja de reconocerse, que es el otro extremo.
const INCLINA = -0.86

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, datosEls, spec, sinTira } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()          // la pagina va post-bloom: trae los colores reales de la marca
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)
  const F = 1 / 30

  // ---------------------------------------------------------------- el material que hay
  // Primero la tira, que es la pagina entera y el mejor sujeto para una mesa. Si no hay, un recorte
  // grande sirve igual: lo que la escena necesita es UNA superficie con contenido, no la pagina toda.
  // ...SALVO QUE LA TIRA YA LA HAYA MOSTRADO OTRA ESCENA. `pantalla` ES la tira —no tiene con que
  // sustituirla— asi que cuando las dos entran en la misma pieza la tira es de ella y esta escena
  // baja a su respaldo, que es el recorte y ya estaba escrito aca abajo.
  //
  // El defecto que cierra: en el render de stripe.com del 2026-07-31, `pantalla` (0:02 a 0:04) y
  // `mesa` (0:07 a 0:10) mostraron LA MISMA CAPTURA con cinco segundos de diferencia. Thiago lo vio
  // mirando el video. Las dos leian `texturas.get('tira')` directo, salteandose todo reparto: el
  // mostrador de datos.js reparte FRASES para que no se repitan, `recortesDe` rota un cursor para que
  // no se repitan los RECORTES, y la tira no tenia ni una cosa ni la otra.
  const tira = (!sinTira && texturas) ? texturas.get('tira') : null
  let mapa = null, arMapa = 1
  if (tira && tira.image) {
    mapa = tira
    arMapa = (tira.image.width || 720) / (tira.image.height || 1560)
  } else {
    for (const e of recortesDe(datosEls || [], ['foto', 'tarjeta', 'logo'], 1)) {
      const t = texturas && texturas.get(e.url)
      if (t && t.image) { mapa = t; arMapa = (t.image.width || 1) / (t.image.height || 1); break }
    }
  }
  if (!mapa) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl, vacia: true }
  }

  // ---------------------------------------------------------------- la superficie
  // El plano se compone ANCHO y se recorta por UV, igual que `pantalla`: la pagina no se estira nunca.
  // El ancho sale del cuadro y el alto del escorzo — un plano inclinado 35 grados ocupa cos(0.62) del
  // alto que declara, o sea el 81%, asi que para llenar la banda del medio hay que darle mas geometria
  // de la que se ve. Sin esa correccion la mesa entra flotando en una franja demasiado angosta.
  // EL ANCHO SE CORRIGE POR LA INCLINACION, IGUAL QUE EL ALTO. La escena ya divide el alto por el
  // coseno de `INCLINA` —dos lineas mas abajo— pero al ancho esa correccion nunca le llego, y el ancho
  // es el que se sale por los costados. Medido proyectando el recorte sobre los 7 pagemodels x los 11
  // aires: llegaba a **1.507 anchos de cuadro** contra el 1.06 que esta escena declara sangrar, o sea
  // ocho veces el sangrado declarado. Se ve como texto cortado: 'ors' donde dice 'Colors'.
  // Ver la cuenta en `magnificaInclinado`, en el kit.
  const ALTO_VISTO = mundoH * 0.58
  let ALTO = ALTO_VISTO / Math.cos(INCLINA)
  //
  // Y ADEMAS LA CAMARA SE ACERCA. Son dos cosas distintas que agrandan la misma pieza: la inclinacion
  // (el borde de adelante esta mas cerca) y el dolly (toda la escena esta mas cerca). Corrigiendo solo
  // la primera quedaba en 1.117; con las dos, en el 1.06 que la escena declara. El `-0.22` se declara
  // UNA vez y lo usan el ancho y el movimiento de camara — separados, vuelven a desincronizarse.
  const ACERCA = -0.22
  const ANCHO = (cuadroMasAngosto(mundoW, ACERCA / distBase) * 1.06)
    / magnificaInclinado(distBase, ALTO, INCLINA)

  // Cuanta pagina entra en esa ventana, con la PROPORCION REAL del archivo. Es la misma cuenta que
  // documenta pantalla.js y por la misma razon: copiar la del hero estira la pagina un 22% a lo ancho,
  // que es el defecto que el dueño de la marca ve antes que nadie.
  let visible = (ALTO / ANCHO) * arMapa
  if (visible > 1) {
    // CLAMPEAR `visible` SIN TOCAR EL PLANO ES ESTIRAR LA IMAGEN, y era lo que pasaba aca. Cuando la
    // imagen es MAS CORTA que la ventana —una tarjeta apaisada, un recorte 16:9, cualquier cosa que no
    // sea la tira larga— la cuenta pide mostrar mas del 100% del alto disponible. Topearla en 1 hace
    // que se muestre la imagen entera... sobre un plano cuya proporcion no es la suya, asi que se
    // estira a lo alto para llenarlo. Medido: plano 5.96 x 8.89 contra una tarjeta 1400x845, la imagen
    // salia estirada 2.5 veces. Es el mismo defecto que `pantalla` ya tenia resuelto y que esta escena
    // no copio, aunque su propio comentario dice "la pagina no se estira nunca".
    //
    // Se achica el PLANO hasta la proporcion real de la imagen. Se pierde altura de mesa —la
    // superficie queda mas baja de lo que la composicion pedia— y se gana que lo que se ve sea la
    // pagina y no una version deformada de la pagina. Es la misma degradacion honesta que eligio
    // pantalla.js: una imagen con aire alrededor es peor composicion que una a sangre, pero es la
    // imagen; la otra es otra imagen.
    ALTO = ANCHO / arMapa
    visible = 1
  }

  const mat = new THREE.MeshBasicMaterial({ map: mapa, toneMapped: false, transparent: true })
  // La textura se comparte entre escenas, asi que NO se le tocan repeat ni offset: se clona. Un
  // `map.repeat.set()` sobre la textura original se lo lleva puesto la escena siguiente que la use, y
  // ese es un defecto de estado compartido igual que el del bloom.
  const tex = mapa.clone()
  tex.needsUpdate = true
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.repeat.set(1, visible)
  mat.map = tex

  // CUANTA PAGINA PASA POR LA MESA, Y DE DONDE. La version anterior recorria `min(0.62, 1-visible)` de la
  // tira, y con una tira de 8192 px eso son CINCO MIL pixeles de pagina en 2.9 segundos: 1750 px/s. A esa
  // velocidad no hay nada que leer, y ademas el obturador la dibujaba dos veces —"Purpose-built" salia
  // escrito uno arriba del otro, medido 16 px de separacion contra 30 px de altura de letra—. Era la
  // escena mas ilegible de la pieza y el defecto no estaba en la inclinacion ni en la luz: estaba en que
  // 0.62 se penso como "un poco de la pagina" y para una tira larga significa media pagina.
  //
  // Ahora el recorrido lo elige la MEDICION (ver `ventanaLegible` en el kit) con dos topes duros: nunca
  // mas de 0.85 de la propia ventana, y en pasos con pausa para que en la pausa se lea.
  const altoMapa = (mapa.image && mapa.image.height) || 1
  const VENT_PX = visible * altoMapa
  const REC_MAX = Math.min(VENT_PX * 0.85, Math.max(0, altoMapa - VENT_PX))
  const vl = mapa.image ? ventanaLegible(mapa.image, VENT_PX, REC_MAX, VENT_PX * 0.12) : { y0: 0, recorrido: REC_MAX }
  const OFF0 = Math.max(0, Math.min(1 - visible, 1 - (vl.y0 + VENT_PX) / altoMapa))
  const RECOR = Math.min(vl.recorrido / altoMapa, OFF0)
  tex.offset.set(0, OFF0)

  // LA ENTRADA Y LA DERIVA NO PUEDEN ESCRIBIR LA MISMA PROPIEDAD. `deriva` mueve `gr.position.y` y el
  // tween de entrada queria moverlo tambien: dos escritores sobre la misma propiedad se pisan y el
  // render deja de repetir dos veces igual. Es la trampa que el kit documenta y que ya costo una vez en
  // `partida` — la compuerta de determinismo la caza, pero solo si uno la corre antes de mirar el video.
  // El contenedor le da a la entrada su propia propiedad.
  const cont = new THREE.Group()
  gr.add(cont)

  const hoja = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, ALTO), mat)
  // SANGRA, Y ESTA DECLARADO EN SU PROPIO ANCHO: `ANCHO` es `cuadroMasAngosto(...) * 1.06`, o sea un 6%
  // mas que el cuadro a proposito. Lo que faltaba era decirlo en la malla — no declarar nada era
  // indistinguible de "nadie lo penso", que es justo lo que este censo vino a separar.
  hoja.userData.sangra = true
  hoja.userData.tipoImagen = 'recorte'
  hoja.rotation.x = INCLINA
  hoja.position.set(0, -mundoH * 0.02, 0)
  cont.add(hoja)

  // Un filete de acento sobre el canto CERCANO de la hoja: es lo que le da espesor al plano y lo hace
  // leer como algo apoyado en vez de como una textura torcida. Va en `gr` para que quede sobre la hoja.
  const canto = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, 0.028), matAcento(LOOK.acento, 1.5))
  canto.rotation.x = INCLINA
  // sobre el borde inferior de la hoja, en el plano de la hoja: se rota igual y se corre por su propio eje
  canto.position.set(0, hoja.position.y - (ALTO / 2) * Math.cos(INCLINA), (ALTO / 2) * Math.sin(-INCLINA) + 0.01)
  cont.add(canto)

  // ---------------------------------------------------------------- el texto, FRONTAL
  // EL TEXTO VIVE EN LA BANDA QUE LA CAMARA VA A MOSTRAR, y eso hay que CALCULARLO, no suponerlo. La
  // camara sube 1.55 y ademas se inclina 0.145 rad hacia abajo: a la distancia base eso corre el centro
  // del encuadre 2.7 unidades, asi que la banda visible pasa de [-5, 5] a [-6.2, 3.8]. Un rotulo en
  // y = 4.0 —el borde de arriba del cuadro con la camara al frente— queda AFUERA. Se vio en el render:
  // quedaba solo la regla pegada al canto superior. Y encuadre-check no lo caza porque prueba
  // INTERSECCION con el frustum y no contencion, que es el punto ciego que el handoff documenta.
  //
  // Se probo primero mover el grupo CON la camara y no alcanza: compensa la subida pero no la
  // inclinacion, que es la mitad del corrimiento.
  const gTexto = new THREE.Group()
  g.add(gTexto)
  const ANCHO_UTIL = mundoW * 0.86
  const chico = (str, alto, col) => {
    const t = texto(str, { fuente: 'DMSans', peso: 500, size: 90, tracking: 0.18, upper: true, alineado: 'left', color: col })
    const a = Math.min(alto, ANCHO_UTIL / Math.max(0.08, t.ar) )
    const m = new THREE.Mesh(new THREE.PlaneGeometry(a * t.ar, a), materialMascara(t.tex, col))
    m.material.uniforms.uSuave.value = 0.05
    // Entra entero, y el propio helper ya lo garantiza: el alto se acota con `ANCHO_UTIL / ar`, o sea
    // que ninguna cadena pasa de `mundoW * 0.86` por larga que sea. Se declara aca y no en los dos
    // sitios que lo llaman, para que el que agregue un tercero lo herede.
    m.userData.encaja = true
    return m
  }
  const FIN = finMascara()

  const rot = chico(String(D.rotulo || sello(0) || '').slice(0, 40), 0.22, nivel(0.72))
  rot.position.set(-ANCHO_UTIL / 2 + (rot.geometry.parameters.width) / 2, mundoH * 0.295, 0.2)
  gTexto.add(rot)

  const pieTxt = String(sello(1) || D.dominio || '').slice(0, 40)
  let pie = null, camaPie = null
  if (pieTxt) {
    pie = chico(pieTxt, 0.19, nivel(0.55))
    pie.position.set(-ANCHO_UTIL / 2 + (pie.geometry.parameters.width) / 2, -mundoH * 0.475, 0.2)

    // UNA CAMA, POR UN DEFECTO MEDIDO SOBRE PIXELES: 1.03:1.
    //
    // Este renglon vive en el 5% de abajo del cuadro, que es adentro de la cuña del fondo del mundo
    // claro. Medido en el render de basecamp con aire `editorial`, cuadro 60 del tramo: la letra sale
    // rgb(104,142,215) sobre un fondo rgb(97,140,204). Eso no es "poco contraste" contra el piso de
    // 3.2 del repo — a 1.03:1 el texto NO SE VE, y en el cuadro se lee como una mancha fantasma que
    // parece un error de render.
    //
    // Y NO ES UN ROTULO DECORATIVO: `sello(1) || D.dominio`. En esa pagina cayo "1080X1920", pero el
    // respaldo es el DOMINIO DEL CLIENTE — lo que uno tipea despues de ver el video. Es el mismo texto,
    // en la misma franja y por la misma causa que el pie de `cierre`, que medía 1.77:1 y ya se arreglo
    // asi. El de `toro` tambien. Tercera escena de la misma familia.
    //
    // Lo encontro `tools/cuna-inventario.mjs`, que ordena por cuanto se mete el texto en la franja:
    // `mesa` quedo primera de las escenas que se despachan, con el borde inferior al 5% del alto.
    const HOLG_X = 0.20, HOLG_Y = 0.13
    const W_CAMA = pie.geometry.parameters.width + HOLG_X * 2
    camaPie = new THREE.Mesh(
      new THREE.PlaneGeometry(W_CAMA, 0.19 + HOLG_Y * 2),
      // 0.94, como las otras tres camas del motor y por la razon anotada alla: deja ver que hay algo
      // detras —lo que la integra a la escena— sin que eso le coma el contraste.
      new THREE.MeshBasicMaterial({
        color: hex(nivel(0.0)), transparent: true, opacity: 0.94,
        depthWrite: false, toneMapped: false,
      }))
    // ANCLADA A LA IZQUIERDA, como el propio pie: la geometria se corre media placa para que su origen
    // quede en el borde izquierdo y crecer sea avanzar, no abrirse hacia los dos lados.
    camaPie.geometry.translate(W_CAMA / 2, 0, 0)
    camaPie.position.set(-ANCHO_UTIL / 2 - HOLG_X, -mundoH * 0.475, 0.19)
    // EL ORDEN DE DIBUJO, NO EL Z. Las dos son transparentes con `depthWrite: false`, asi que three las
    // pinta en el orden en que se agregaron y no por profundidad. Agregar la cama despues —que es lo
    // natural, porque necesita el ancho del texto— la taparia. Paso exactamente eso en `toro`, y ahi el
    // numero MEJORO igual: se vio abriendo el cuadro, no midiendo.
    camaPie.renderOrder = -1
    camaPie.userData.sangra = true
    gTexto.add(camaPie)
    gTexto.add(pie)
  }

  // Regla frontal bajo el rotulo: separa la banda de texto de la mesa y le da al cuadro un evento duro
  // que dibujar en el primer beat.
  const regla = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_UTIL, 0.012), matAcento(nivel(0.40), 1.0))
  regla.geometry.translate(ANCHO_UTIL / 2, 0, 0)
  regla.position.set(-ANCHO_UTIL / 2, mundoH * 0.250, 0.2)
  regla.scale.x = 0.0001
  gTexto.add(regla)

  // ---------------------------------------------------------------- tiempo
  // DERIVA: la hoja se desplaza sobre su propio plano y la escena respira. Es el movimiento continuo
  // que sostiene la regla de que nada descansa; los golpes duros van aparte, en los beats.
  // La hoja avanza en CUATRO tramos —un tramo y medio de beat cada uno— que deslizan rapido y se quedan
  // quietos. La respiracion continua se queda en el cuadro entero (`g.position.x`, `gr.position.y`), que
  // se mueve 9 y 23 px en toda la escena: tres ordenes de magnitud por debajo de lo que el obturador
  // convierte en fantasma, asi que ahi lo continuo es correcto.
  // Los tramos salen del recorrido y no de un numero fijo, por lo mismo que en el hero: un tramo que
  // mueve menos de dos renglones no se lee como desplazamiento. Ver la nota en telefono.js.
  const PASOS_M = pasosEnBeats(meta.beats, Math.max(2, Math.min(6, Math.round((RECOR * altoMapa) / 170))))
  // Y cada peldaño cae en un hueco entre renglones: sin esto, el segundo se detenia partiendo el titular
  // por la mitad de las mayusculas contra el canto de la hoja.
  const ESC_M = mapa.image ? escalones(mapa.image, vl.y0, RECOR * altoMapa, PASOS_M, VENT_PX) : null
  const DESLIZ_M = deslizFijo(DUR, PASOS_M)
  deriva(tl, DUR, (u) => {
    tex.offset.y = ESC_M
      ? Math.max(0, 1 - (enEscalon(ESC_M, u, DESLIZ_M) + VENT_PX) / altoMapa)
      : OFF0 - RECOR * escalera(u, PASOS_M)
    g.position.x = Math.sin(u * Math.PI * 1.1) * mundoW * 0.008
    gr.position.y = -u * mundoH * 0.012
  })

  // ---- entrada: la hoja llega desde abajo y se posa. El escorzo hace el resto.
  tl.fromTo(hoja.scale, { x: 0.94, y: 0.90 }, { x: 1, y: 1, duration: b(0.9), ease: E.llega(2.2), immediateRender: false }, 0)
  tl.fromTo(cont.position, { y: -mundoH * 0.28 }, { y: 0, duration: b(0.9), ease: E.llega(2.2), immediateRender: false }, 0)
  tl.fromTo(mat, { opacity: 0 }, { opacity: 1, duration: b(0.35), ease: E.frena(2), immediateRender: false }, 0)

  // ---- el canto se traza de izquierda a derecha: el evento duro del primer beat
  canto.scale.x = 0.0001
  tl.to(canto.scale, { x: 1, duration: b(0.55), ease: E.frena(3) }, b(0.5))

  // ---- texto: se escribe por mascara, escalonado
  rot.material.uniforms.uProg.value = 0
  tl.to(rot.material.uniforms.uProg, { value: FIN, duration: b(0.6), ease: E.frena(2) }, b(0.35))
  tl.to(regla.scale, { x: 1, duration: b(0.7), ease: E.frena(3) }, b(0.6))
  if (pie) {
    pie.material.uniforms.uProg.value = 0
    tl.to(pie.material.uniforms.uProg, { value: FIN, duration: b(0.5), ease: E.frena(2) }, b(1.0))
    // La cama se dibuja JUSTO ANTES del renglon y con la misma curva que la regla de arriba, que es el
    // otro elemento horizontal de la escena. Termina de abrirse en b1.0, cuando el texto recien empieza
    // a escribirse: la placa va siempre delante, nunca detras. Al reves, aunque fueran dos cuadros, la
    // primera letra caeria sobre la cuña — que es el 1.03:1 que esta cama vino a arreglar.
    //
    // Y NO SE QUEDA SOLA EN EL CUADRO: sin entrada ni salida seria una barra blanca vacia los primeros
    // 30 cuadros y otros tantos al final. Ese error lo cometi en las camas de `toro` y `cierre` y ahi
    // costo el cuadro FINAL del video, que es el que queda congelado.
    tl.set(camaPie.scale, { x: 0.0001 }, 0)
    tl.to(camaPie.scale, { x: 1, duration: b(0.34), ease: E.frena(3) }, b(0.66))
  }

  // ---- METRONOMO: la hoja acusa el beat con un pop de escala minimo. Sin esto la escena es deriva
  // pura entre el beat 1.5 y el 5, y la deriva no se cuenta como movimiento: es la trampa nº8 del
  // handoff, la que se repitio cuatro veces en este repo.
  for (const bt of [2, 3, 4, 5]) {
    tl.to(hoja.scale, { x: 1.012, y: 1.012, duration: b(0.09), ease: E.frena(3) }, b(bt))
    tl.to(hoja.scale, { x: 1, y: 1, duration: b(0.4), ease: 'elastic.out(1, 0.5)' }, b(bt) + b(0.09))
  }

  // ---- salida: la hoja se va por donde vino y el texto se borra
  tl.set(rot.material.uniforms.uDir, { value: 1 }, b(5.2))
  tl.to(rot.material.uniforms.uProg, { value: 0, duration: b(0.35), ease: E.acelera(2) }, b(5.2))
  if (pie) {
    tl.set(pie.material.uniforms.uDir, { value: 1 }, b(5.25))
    tl.to(pie.material.uniforms.uProg, { value: 0, duration: b(0.32), ease: E.acelera(2) }, b(5.25))
    // SALE POR OPACIDAD Y NO POR ESCALA. El renglon termina de borrarse en b5.57 y una placa que se
    // encoge le sacaria la cama a las ultimas letras antes de que se vayan, sobre la cuña. Un fundido
    // no descubre nada: bajan las dos cosas juntas.
    tl.set(camaPie.material, { opacity: 0.94 }, 0)
    tl.to(camaPie.material, { opacity: 0, duration: b(0.36), ease: E.acelera(2) }, b(5.35))
  }
  tl.to(regla.scale, { x: 0.0001, duration: b(0.4), ease: E.acelera(3) }, b(5.3))
  tl.to(canto.scale, { x: 0.0001, duration: b(0.35), ease: E.acelera(3) }, b(5.35))
  tl.to(mat, { opacity: 0, duration: b(0.45), ease: E.acelera(2) }, b(5.4))

  // ---------------------------------------------------------------- camara
  // SUBE Y SE INCLINA para mirar la mesa, y VUELVE EXACTO. La amplitud la pone el aire: `orbita` es el
  // eje del corrimiento y la inclinacion, y este es el unico plano del motor donde esa palanca cambia
  // la LECTURA de la composicion y no solo su energia — con orbita baja la mesa se ve casi de frente y
  // con orbita alta se ve picada de verdad.
  //
  // La rotacion se devuelve con un `set` en el ultimo beat ademas del tween: un residuo de 0.001 rad en
  // la camara arranca la escena siguiente torcida, y eso no se ve hasta que se ve.
  tl.fromTo(camera.position, { y: 0 }, { y: orbita(1.55), duration: b(1.2), ease: E.frena(2), immediateRender: false }, 0)
  tl.fromTo(camera.rotation, { x: 0 }, { x: orbita(-0.145), duration: b(1.2), ease: E.frena(2), immediateRender: false }, 0)
  tl.fromTo(camera.position, { z: dolly(distBase, 0.30) }, { z: dolly(distBase, ACERCA), duration: DUR * 0.86, ease: 'none', immediateRender: false }, 0)
  tl.to(camera.position, { y: 0, duration: b(0.8), ease: E.vaiven(2) }, b(5.0))
  tl.to(camera.rotation, { x: 0, duration: b(0.8), ease: E.vaiven(2) }, b(5.0))
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, b(5.94))
  tl.set(camera.rotation, { x: 0, y: 0, z: 0 }, b(5.94))

  tl.paused(false)
  return { g, gr, tl }
}
