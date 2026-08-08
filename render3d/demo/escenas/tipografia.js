// ANTHEM · TIPOGRAFIA — 8 beats (3.87 s). El bloque que lleva el mensaje.
//
// Acá la tipografía no es un rótulo encima de algo: ES la animación. Siete frases se REEMPLAZAN entre
// sí sobre la grilla de beats (0 · 1.5 · 3 · 3.5 · 4 · 4.5 · 6), y ninguna entra como la anterior:
// split, escala anclada, máscara horizontal, máscara vertical, rotación en X, llegada desde fuera de
// cuadro y empuje en Z. Cada una se va por un camino distinto del que entró.
//
// TRES DECISIONES QUE VALE LA PENA DEFENDER
//
// 1. LA QUE SALE TERMINA DE IRSE ANTES DE QUE LLEGUE LA SIGUIENTE. Durante mucho tiempo esto decia
//    que el solape era de tres frames "y esa era la diferencia entre un corte y un parpadeo". En el
//    video no era eso lo que se veia: eran dos frases DISTINTAS ocupando el mismo renglon durante
//    tres cuadros —"BIG NU|VIBERS.", "REMEMBER|WHEN"— dos veces en cinco segundos, y no se lee como
//    un corte sino como un error de render. La salida arrancaba 5 frames antes del beat y duraba 6,
//    o sea que terminaba DESPUES del corte, encima de la que entraba.
//    Ahora la salida empieza 7 frames antes y la entrada cae EN el beat: queda casi un cuadro de aire
//    entre las dos. El parpadeo en negro que el numero viejo temia no aparece, y la razon es que el
//    cuadro nunca se queda vacio — abajo hay fondo, filete, barras y la columna de marcas, que son
//    justamente lo que esta escena pone para que nunca haya un instante sin nada.
//
// 2. NADA DE PIVOTES-GRUPO. El anclaje de escala se hace moviendo la GEOMETRÍA (geo.translate), no
//    metiendo la malla en un Group. Así "crece desde el borde izquierdo" queda escrito en la malla y
//    no en un padre invisible: position/scale/rotation de cada objeto son su estado real, que es lo
//    que audita verificar.mjs y lo que uno lee al depurar.
//
// 3. TODO ES `set` + `to`, NUNCA `from`/`fromTo`. Un fromTo tiene immediateRender y aplica su estado
//    inicial en el momento de construirse: una palabra del beat 6 aparecería en el frame 0. El estado
//    de partida se escribe al construir y la timeline sólo lo lleva a otro lado.
//
// El cuadro nunca queda compuesto por una sola cosa: filete de acento que salta en cada corte, tres
// barras que entran a contratiempo (en los medios beats), columna de marcas que baja sin parar,
// regla de progreso escalonada arriba y epígrafe abajo.

import { E, LOOK, b, texto, planoTexto, matAcento, hex, dolly, orbita, MOB } from '../kit.js'
// Las frases salen de los DATOS, no del archivo: la misma escena sirve para cualquier pagina.
// El estilo de cada entrada (que fuente, que ancho, que gesto) SI es de la escena — eso es direccion
// de arte y no cambia con el contenido.
import { frase, D, nFrases, sello, repartirFrases } from '../datos.js'

export const meta = { id: 'tipografia', beats: 8 }

// Un frame a 30 fps. Todos los solapes se miden en frames, no "a ojo".
const F = 1 / 30

// Los cortes de la escena, en beats. Todo lo demás cuelga de acá.
const CORTE = [0, 1.5, 3, 3.5, 4, 4.5, 6]

// Familias. Mezclar tres pesos distintos es lo que separa una pieza tipográfica de una plantilla con
// una sola fuente a distintos cuerpos.
const ANTON = { fuente: 'Anton', tracking: 0.005 }
const NEGRA = { fuente: 'ArchivoBlack', tracking: 0 }
const ANCHA = { fuente: 'BigShoulders', peso: 900, tracking: 0.02 }
const CHICA = { fuente: 'DMSans', peso: 500, tracking: 0.22, size: 120 }

// EXPOSICIÓN DE LA TIPOGRAFÍA. El bloom de la pieza florece todo lo que pase de 0.62 de luminancia, y
// está calibrado para FILETES: sobre una línea de 5 cm de grosor da un halo precioso, sobre una palabra
// que ocupa un tercio del cuadro da una mancha blanca donde no se leen ni las letras. El blanco del kit
// vale 0.887 en lineal, así que el texto grande se baja a 0.58 — justo por debajo del umbral. Queda
// nítido, y el halo se lo reservan los elementos finos, que es donde el bloom es una herramienta y no
// una avería. Sobre negro, 0.58 lineal sale a 0.80 en pantalla: se lee blanco igual.
const LUM = 0.655   // 0.655 x 0.887 = 0.581 lineal, apenas debajo del umbral

export function build(ctx) {
  const { THREE, gsap, camera, distBase, mundoW, fondo, pelicula, bloom, rnd } = ctx
  // MUEBLE DE BORDE: LO PIDE EL AIRE, NO LA ESCENA. Este archivo dibujaba perimetro por su cuenta sin
  // preguntar nunca por MOB, y por eso una pieza que eligio "sin marco" seguia teniendo lineas pegadas
  // a los costados: no las ponia el marco, las ponia la escena. Es el reclamo del usuario visto desde
  // el codigo. Se conserva en las familias donde la caja cerrada ES el punto —las escuadras de camara
  // y los ticks de acotacion— y se retira en las demas.
  const hudBorde = MOB.hud !== false && (MOB.marco === 'escuadras' || MOB.marco === 'ticks')

  // EL BLOOM ES DEL AIRE Y HAY QUE DEVOLVERLO. Es estado COMPARTIDO por toda la pieza: una escena que
  // lo mueve y lo deja movido se lo cambia a todas las que siguen. Esta escena lo subia y despues
  // "restauraba" a un literal —el valor de ANTHEM—, asi que diez de los once aires terminaban la pieza
  // con la floracion del aire tecnico. Un aire editorial declara 0.14 y seguia en 0.85: seis veces mas.
  // Todo va RELATIVO a lo que puso el aire, para que el gesto valga igual en los once.
  const oBloom = (bloom && bloom.strength) || 0.85


  const g = new THREE.Group()
  const tl = gsap.timeline({ paused: true })

  const XI = -mundoW / 2 + 0.26   // margen izquierdo del cuadro
  const XD = mundoW / 2 - 0.26    // margen derecho

  // ANCHO DE COMPOSICIÓN. El cuadro mide 5.63 de ancho, pero la cámara se acerca 0.9 unidades a lo
  // largo de la escena y eso amplía un 5%: lo que en reposo llegaba justo al borde, a mitad de escena
  // queda cortado. 5.05 es el ancho que sigue entrando con la cámara en su punto más cerca — y aun así
  // ocupa el 93% del cuadro visible, que es lo que se pide de un titular de reel.
  const ANCHO = 5.05

  // ------------------------------------------------------------------ herramientas de la escena

  // REVELADO POR MÁSCARA CON FILO VIVO. El kit trae materialMascara, pero sin intensidad ni borde: acá
  // el frente del barrido va teñido de acento y por encima de 1.0, así el bloom lo agarra y la línea
  // que descubre la palabra brilla. Es el detalle que hace que un wipe se lea dibujado y no recortado.
  function matWipe(map, o = {}) {
    const col = hex(o.color || LOOK.tinta).multiplyScalar(o.intensidad || LUM)
    const filo = hex(o.filo || LOOK.acento).multiplyScalar(o.intFilo || 2.6)
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        map: { value: map }, uProg: { value: 0 },
        uDir: { value: o.dir || 0 },              // 0 izq->der · 1 der->izq · 2 abajo->arriba · 3 arriba->abajo
        uSuave: { value: o.suave || 0.05 }, uBorde: { value: o.borde || 0.07 },
        uCol: { value: col }, uFilo: { value: filo },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `
        uniform sampler2D map; uniform float uProg, uDir, uSuave, uBorde;
        uniform vec3 uCol, uFilo; varying vec2 vUv;
        void main(){
          float a = texture2D(map, vUv).a;
          float e = uDir < 0.5 ? vUv.x : uDir < 1.5 ? 1.0 - vUv.x : uDir < 2.5 ? vUv.y : 1.0 - vUv.y;
          float m = smoothstep(uProg, uProg - uSuave, e);
          // banda justo detrás del frente del barrido; se apaga cuando el barrido ya terminó, para que
          // no quede un fleco de acento pegado al canto de la palabra en reposo.
          float d = clamp((uProg - e) / max(uBorde, 0.0001), 0.0, 1.0);
          float banda = (1.0 - d) * smoothstep(0.0, 0.05, uProg) * (1.0 - smoothstep(0.84, 1.0, uProg));
          gl_FragColor = vec4(mix(uCol, uFilo, banda), a * m);
          if (gl_FragColor.a < 0.004) discard;
        }`,
    })
  }

  // Mide una frase para que ocupe un ANCHO dado, con techo de alto: en un reel la tipografía se compone
  // por ancho de cuadro (llega al borde o se lee tímida), pero una condensada puede dispararse de alto.
  function medida(str, op, ancho, altoMax) {
    const t = texto(str, op)
    let a = ancho, h = ancho / t.ar
    if (h > altoMax) { h = altoMax; a = altoMax * t.ar }
    // Y PISO, que faltaba. El ancho es siempre la constante que se le pasa y el alto era la variable
    // dependiente sin suelo: medido con las fuentes reales sobre m1 = medida(fr(0), ANTON, 5.10, 3.1),
    // 'MIDE' sale a 3.100 de alto (595 px de 1920) y un encabezado real de 35 caracteres o mas cae a una
    // fraccion de eso. La escena ademas APLANA los saltos de linea (linea 195), asi que un titulo pensado
    // en dos renglones llega como una sola linea larguisima y dispara el caso peor.
    // El piso es el 22% del alto maximo que la propia llamada declara: por debajo de eso la palabra deja
    // de funcionar como tipografia cinetica y pasa a ser un pie de foto en movimiento.
    // Y EL PISO NO PUEDE EMPUJAR EL ANCHO FUERA DEL CUADRO, que es el defecto que este mismo archivo
    // tiene en otra linea: subir el alto sube el ancho en la misma proporcion, asi que un piso sin techo
    // de ancho cambia "ilegible" por "cortado a los costados", que es peor. Si el piso no entra, se toma
    // el mayor cuerpo que SI entra — que puede seguir siendo chico, y en ese caso el problema no es de
    // esta funcion sino del largo del texto que le llega.
    const PISO = altoMax * 0.22
    const A_MAX = mundoW * 0.94
    if (h < PISO) {
      a = Math.min(PISO * t.ar, A_MAX)
      h = a / t.ar
    }
    return { str, op, ancho: a, alto: h, tex: t.tex }
  }

  // Malla de texto con material plano. `anc` ancla la geometría: -1 borde izquierdo, +1 derecho, 0
  // centro. Anclar en la geometría y no en un Group deja el estado real escrito en la malla.
  function plano(m, anc = 0, color = null, intensidad = LUM) {
    const mesh = planoTexto(m.str, m.alto, m.op)
    // LA CLASIFICACION VA POR LLAMADA, NO EN LA FABRICA, y esto se probo antes de decidirlo: declarar
    // `encaja` aca de una vez deja verde a las frases compuestas y acusa a las que SE VAN DISPARADAS,
    // que es el gesto de la escena. Medido con el aire tecnico, una llega a 4.448 anchos de cuadro y
    // otra a 1.787, contra una tercera que se pasa apenas 1.021 en 7 de sus 117 cuadros. Son tres
    // intenciones distintas saliendo de la misma funcion.
    mesh.userData.tipoImagen = 'texto'
    mesh.geometry.translate(-anc * m.ancho / 2, 0, 0)
    // multiplyScalar y no setStyle: acá se opera sobre el valor LINEAL ya convertido, sin que la
    // gestión de color vuelva a interpretar el número como sRGB.
    mesh.material.color = color ? hex(color).multiplyScalar(intensidad)
      : mesh.material.color.multiplyScalar(LUM)
    g.add(mesh)
    return mesh
  }

  // Ídem pero con el material de máscara.
  function planoW(m, anc = 0, o = {}) {
    const geo = new THREE.PlaneGeometry(m.ancho, m.alto)
    geo.translate(-anc * m.ancho / 2, 0, 0)
    const mesh = new THREE.Mesh(geo, matWipe(m.tex, o))
    // SIN `encaja`, MEDIDO, y acá el resultado es el mas interesante de los tres. Declararlo rechaza
    // DOS de estas cinco mallas: una llega a 1.055 (43 de 114 cuadros) y otra a 1.512 (58 de 114).
    //
    // Y las cinco estan dimensionadas con `medida()` contra un ancho maximo explicito (ANCHO, 3.5,
    // 3.2), o sea que el dimensionado esta hecho. Lo que las saca es lo mismo que en `tarjetas` y
    // `cierre`: el cuadro contra el que se dimensiono es el de REPOSO, y la camara se acerca.
    //
    // Tres escenas, tres veces la misma causa. No son tres arreglos: es una sola pregunta.
    g.add(mesh)
    return mesh
  }

  // Rectángulo unitario anclado: se coloca con position y se dimensiona con scale, así "crecer desde
  // el borde" es una sola propiedad animable.
  function barra(color, intensidad, anc = -1, anv = 0) {
    const geo = new THREE.PlaneGeometry(1, 1)
    geo.translate(-anc * 0.5, -anv * 0.5, 0)
    const mesh = new THREE.Mesh(geo, matAcento(color, intensidad))
    g.add(mesh)
    return mesh
  }

  // ------------------------------------------------------------------ palabras

  // 1 · SPLIT. Dos mitades de la MISMA textura (partida por UV) que llegan desde los costados y se
  // encuentran. Que el corte pase por el medio de los glifos es justamente lo que se ve.
  // LAS FRASES CICLAN CUANDO SON MENOS QUE LOS SLOTS, y no es relleno: es el material de la pagina
  // volviendo a pasar. Esta escena coreografia SIETE entradas y una pagina normal da cuatro —basecamp
  // dio exactamente cuatro—, asi que los tres ultimos slots salian vacios y la escena se quedaba
  // CUATRO BEATS sin dibujar una sola palabra. Medido mirando el render: cinco cuadros seguidos con
  // el fondo, el HUD y nada mas. En un reel vertical eso es la señal de scroll.
  //
  // Sostener la ultima frase hasta el final NO se puede: el contrato prohibe que algo quede quieto
  // mas de un beat, y una frase clavada cuatro beats es justo eso. Reciclar SI: es exactamente lo que
  // hace `columna` con sus recortes —y lo documenta— porque volver a pasar por lo que la pagina dijo
  // se lee como continuidad, no como material inventado. No aparece ni una palabra que la marca no
  // haya escrito, que es la unica condicion que importa.
  // PIDE TRES Y RECICLA DENTRO DE ESAS TRES. Antes recorria TODAS las frases de la pagina, o sea
  // vaciaba el pozo para las escenas que vinieran despues — y con cuatro o cinco frases eso significa
  // que la escena siguiente repetia palabra por palabra lo que esta acababa de decir. Reciclar de a
  // tres es lo que esta escena ya hacia por dentro (ver la nota de arriba) y ahora ademas deja material
  // para las otras. Ver `repartirFrases` en datos.js.
  const mias = repartirFrases(3)
  const NF = Math.max(1, mias.length)
  // UN RENGLON, SIEMPRE. Esta escena parte una frase en mitades por UV, la reparte por el cuadro y la
  // reemplaza en cada beat: todo eso supone UNA linea, y desde que el extractor entrega los titulos
  // completos la mayoria llega compuesta en dos. En el render de linear se vio el resultado —"MOVE WORK
  // FORWARD" dibujado encima de "ACROSS TEAMS AND AGENTS"—. El salto se aplana y `medida` ajusta el
  // cuerpo al ancho del cuadro, que es exactamente para lo que existe. La composicion en dos renglones
  // es de las escenas que la aprovechan: `titular`, `lista` y `partida`.
  const fr = (i) => String(mias[i % NF] || '').replace(/\n/g, ' ')

  const m1 = medida(fr(0), ANTON, ANCHO + 0.05, 3.1)
  function mitad(lado) {
    const geo = new THREE.PlaneGeometry(m1.ancho / 2, m1.alto)
    const uv = geo.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5 + lado * 0.5)
    uv.needsUpdate = true
    const mat = new THREE.MeshBasicMaterial({
      map: m1.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    })
    mat.color.multiplyScalar(LUM)
    const mesh = new THREE.Mesh(geo, mat)
    g.add(mesh)
    return mesh
  }
  const x1 = m1.ancho / 4
  const w1a = mitad(0), w1b = mitad(1)
  // SANGRAN LAS DOS, y es lo que la escena hace con ellas: arrancan en ±(x1 + 5.0) —el cuadro mide
  // 5.63 de ancho, o sea que empiezan a una pantalla entera de distancia—, se juntan, y salen
  // disparadas a ±(x1 + 6.6). Su composicion "quieta" dura desde que llegan hasta que se van, que es
  // el 8% de la escena: son la primera de TRES frases que se suceden.
  //
  // Lo correcto seria "enteras mientras estan compuestas" y eso existe (`encajaEntre`), pero medido
  // contra la escena entera un tramo del 8% es indistinguible de una rendija para esquivar la
  // compuerta, y su guardarrail lo rechaza con razon. Ver docs/ENCAJE-ESTADO.md.
  w1a.userData.sangra = true
  w1b.userData.sangra = true
  w1a.position.set(-x1 - 5.0, 0.30, 0); w1a.scale.y = 0.55
  w1b.position.set(x1 + 5.0, 0.30, 0); w1b.scale.y = 0.55

  // 2 · ESCALA DESDE 0 ANCLADA A LA IZQUIERDA. Crece desde el margen, no desde su propio centro: el
  // ojo lee que la palabra sale del borde del cuadro.
  const m2 = medida(fr(1), ANCHA, ANCHO, 2.35)
  // SANGRA POR SU OVERSHOOT, y el numero lo dice: `medida` la topea en A_MAX = mundoW * 0.94 = 5.29,
  // y medida en el cuadro da 5.56 — un 5% de mas, que es exactamente el rebote de su tween de entrada
  // (arranca en `scale 0`). No es un dimensionado mal hecho: es el golpe de llegada, la misma familia
  // que el transitorio ya confirmado de `destello` (su malla mide 0.96 del cuadro y un tween la escala
  // 2.429x).
  //
  // Igual que `w6`, lo correcto seria "entera una vez asentada" — `encajaEntre` lo expresa pero solo
  // lo entiende `encuadre-check`. `verificar.mjs` mide UN instante y la agarra en el rebote.
  const w2 = plano(m2, -1)
  w2.userData.sangra = true
  w2.position.set(XI, 0.55, 0); w2.scale.set(0, 0, 1); w2.rotation.z = -0.07

  // 3 · MÁSCARA HORIZONTAL, pegada a la derecha, casi de borde a borde.
  const m3 = medida(fr(2), NEGRA, ANCHO, 2.7)
  const w3 = planoW(m3, 1, { dir: 0, borde: 0.05, filo: LOOK.acento2 })
  w3.position.set(XD + 0.32, 0.15, 0)

  // 4 · MÁSCARA VERTICAL (de abajo hacia arriba), pegada a la izquierda.
  const m4 = medida(fr(3), ANTON, ANCHO, 2.45)
  const w4 = planoW(m4, -1, { dir: 2, borde: 0.09, filo: LOOK.acento })
  w4.position.set(XI, 0.60 - 0.30, 0)

  // 5 · ROTACIÓN EN X DESDE 90°: cae de plano hacia la cámara. Es la ÚNICA que va en el acento, y por
  // eso es también la más grande del tramo rápido: el color y el cuerpo dicen lo mismo.
  // EL ANCHO SALE DEL CUADRO, NO DE UNA CONSTANTE. El 4.8 y el 1.18 de la linea de abajo no salian de
  // mundoW y su producto es 5.664 sobre un cuadro de 5.625: la palabra del acento YA sangraba en reposo,
  // antes de que la camara se mueva. Lo unico que la salvaba a veces era el relleno transparente que
  // texto() le pone al canvas (0.3 * size), que con una palabra corta es el 13% del ancho y tapa el
  // problema, y con una frase de mas de ~30 caracteres es el 1.5% y no tapa nada.
  // mundoW * 0.80 = 4.5, y 4.5 * 1.18 = 5.31: entra con margen y la palabra sigue siendo la mas grande
  // del tramo rapido, que es lo que la escena declara arriba.
  const m5 = medida(fr(4), ANCHA, mundoW * 0.80, 3.2)
  // 1.3 y no 2.4: es la única palabra que se deja pasar el umbral, y apenas. Con más, el acento deja de
  // ser una palabra encendida y pasa a ser una mancha turquesa.
  // SANGRA, Y LO DECLARA SU PROPIA ESCALA. La linea de abajo la agranda un 18% (`scale.set(1.18,
  // 1.18, 1)`) sobre un ancho que ya se topea cerca del cuadro, y medido en `encuadre-check` llega a
  // 1.160 anchos de cuadro en 69 de sus 134 cuadros — sostenido, no un rebote. El 1.16 medido y el
  // 1.18 declarado son el mismo numero: la escena la quiere pasada de cuadro.
  const w5 = plano(m5, 0, LOOK.acento2, 1.3)
  w5.userData.sangra = true
  w5.position.set(0, 0.25 - 0.22, 0); w5.rotation.x = Math.PI / 2; w5.scale.set(1.18, 1.18, 1)

  // 6 · LLEGADA DESDE FUERA DE CUADRO con overshoot, pegada a la derecha.
  const m6 = medida(fr(5), ANTON, ANCHO, 2.25)
  // SANGRA, y es una limitacion declarada y no una preferencia. Su gesto ES la llegada: arranca en
  // XD + 6.8, bien fuera del cuadro. Lo que habria que declarar es "entera UNA VEZ llegada", y eso
  // existe (`encajaEntre`) pero solo lo entiende `encuadre-check`, que recorre la linea de tiempo.
  // `verificar.mjs` mide UN instante y no puede saber si esta llegando o ya llego, asi que declararla
  // `encaja` la acusa en el medio del vuelo. Entre una compuerta que acusa en falso y una proteccion
  // que no tengo, gana no mentir: queda anotado en docs/ENCAJE-ESTADO.md como el caso que pide llevar
  // `encajaEntre` tambien a `verificar.mjs`.
  const w6 = plano(m6, 1)
  w6.userData.sangra = true
  w6.position.set(XD + 6.8, 0.50, 0); w6.rotation.z = 0.06

  // 7 · EMPUJE EN Z: llega desde el fondo y se pasa hacia la cámara. Se compone a 7.5 de ancho sobre un
  // cuadro de 5.63: se sale por los dos lados a propósito. Un titular al 40% del ancho se lee tímido.
  const m7 = medida(fr(6), NEGRA, 7.5, 3.8)
  // SANGRA, y lo declara su propio ancho: `medida(fr(6), NEGRA, 7.5, 3.8)` pide 7.5 en un cuadro de
  // 5.63. El comentario de arriba lo dice sin vueltas: "se sale por los dos lados a proposito".
  const w7 = plano(m7, 0)
  w7.userData.sangra = true
  w7.position.set(0, 0.10, -13); w7.rotation.z = 0.045
  // Las otras seis se esconden solas por construcción (fuera de cuadro, escala 0, máscara en 0 o
  // canto de plano). Ésta no: aparcada en z=-13 sigue delante de la cámara, sólo que un 40% más
  // chica — o sea que el titular del cierre estaría plantado en el medio del cuadro desde el frame 0.
  // Se apaga y se enciende en su beat, y entra ya en movimiento.
  w7.visible = false

  // Línea de apoyo del cierre: cuerpo chico y muy espaciado contra el titular enorme. El contraste de
  // escala es lo que hace que el titular se lea grande.
  // Estaba fija en 'SU PROPIO' — un fragmento del copy de ANTHEM ('CADA PAGINA / SU PROPIO / VIDEO')
  // que en cualquier otra pieza queda como dos palabras sueltas sin sujeto. Es la linea de apoyo del
  // cierre: le corresponde la ultima frase real que la pagina dio.
  const s7 = medida(fr(NF - 1), CHICA, 3.5, 0.44)
  const w7b = planoW(s7, 0, { dir: 0, borde: 0.12, filo: LOOK.acento2 })
  w7b.position.set(0, 2.55, 0)

  // ------------------------------------------------------------------ estructura del cuadro

  // FILETE de acento: un estado por corte (más un salto extra en el beat 7 para que el cierre no se
  // quede quieto). scale.x negativo = crece hacia la izquierda desde el margen derecho.
  const FIL = [
    { bt: 0, x: -1.65, y: -1.75, l: 3.30, gr: 0.075, c: LOOK.acento },
    { bt: 1.5, x: XI, y: -1.05, l: 2.55, gr: 0.055, c: LOOK.acento2 },
    { bt: 3, x: XD, y: -1.40, l: -2.10, gr: 0.095, c: LOOK.acento },
    { bt: 3.5, x: XI, y: 1.85, l: 3.05, gr: 0.055, c: LOOK.acento2 },
    { bt: 4, x: -0.72, y: -1.95, l: 1.45, gr: 0.125, c: LOOK.acento },
    { bt: 4.5, x: XD, y: 1.95, l: -3.65, gr: 0.060, c: LOOK.acento },
    { bt: 6, x: -2.50, y: -2.45, l: 5.00, gr: 0.100, c: LOOK.acento2 },
    { bt: 7, x: XD, y: -2.45, l: -3.20, gr: 0.100, c: LOOK.acento },
  ]
  const fil = barra(LOOK.acento, 3.4, -1, 0)
  fil.position.set(FIL[0].x, FIL[0].y, 0.05)
  fil.scale.set(0, FIL[0].gr, 1)

  // TRES BARRAS a contratiempo. Entran en los medios beats — nunca sobre el corte de una palabra — para
  // que el cuadro tenga siempre dos tiempos superpuestos y no uno solo.
  const barV = barra(LOOK.acento, 3.0, 0, -1)   // vertical, crece hacia arriba desde abajo
  barV.position.set(-2.70, -3.55, -0.2); barV.scale.set(0.10, 0, 1)
  const barH = barra(LOOK.tinta, 0.5, -1, 0)    // regla inferior, crece hacia la derecha
  barH.position.set(XI, -3.05, -0.2); barH.scale.set(0, 0.13, 1)
  // 0.7 y no 2.2: es el único macizo grande de acento del cuadro, y a plena intensidad deja de ser un
  // bloque y pasa a ser una lámpara que ilumina media escena.
  const bloque = barra(LOOK.acento2, 0.7, 0, 0) // bloque macizo arriba a la derecha
  bloque.position.set(1.92, 2.90, -0.2); bloque.scale.set(0, 0, 1)

  const PLAN = [
    { m: barV, eje: 'y', larg: 4.6, fase: 0.000, hits: [[0.5, 0.75], [2, 0.8], [5, 0.8], [7, 0.5]] },
    { m: barH, eje: 'x', larg: 5.05, fase: 0.045, hits: [[1, 1.2], [2.5, 0.9], [5.5, 0.7], [6.5, 0.9]] },
    { m: bloque, eje: 'xy', larg: 1, fase: 0.090, hits: [[1, 0.4], [2.5, 0.4], [7, 0.55]] },
  ]

  // BARRIDO del cierre: una línea que cruza el titular. Aditiva, así atraviesa la tipografía en vez de
  // taparla.
  const barrido = barra(LOOK.acento2, 2.8, 0, 0)
  barrido.material.blending = THREE.AdditiveBlending
  barrido.material.transparent = true
  barrido.position.set(0, -1.7, 0.45); barrido.scale.set(0, 0.09, 1)

  // COLUMNA DE MARCAS en el borde derecho. Baja sin parar durante toda la escena: es el seguro contra
  // la regla 2 — por rápido que se corte, siempre hay algo en movimiento continuo debajo del montaje.
  const marcas = []
  // El bucle entero va bajo la condicion, no solo el push: `barra()` hace `g.add(mesh)` por dentro, asi
  // que filtrar el array dejaba las 24 mallas en la escena igual. Se vio renderizando jugueton —que
  // declara marco 'nada'— y encontrando la columna intacta en el borde derecho.
  // CUANTAS MARCAS: SALE DE LA GEOMETRIA, NO DEL 24 QUE HABIA ESCRITO.
  //
  // La columna arranca en MK_Y0 y SUBE MK_SUBE durante toda la escena (el tween de mas abajo; el
  // comentario decia 'baja' y el codigo suma en y). Entonces una marca que arranca POR ENCIMA del borde
  // superior no entra NUNCA: solo se aleja. Con 24 y paso 0.55, las tres ultimas empezaban en 5.35,
  // 5.90 y 6.45 contra un semicuadro de 5 y terminaban en 7.03, 7.58 y 8.13 — medido construyendo la
  // escena: encendidas los 31 instantes muestreados y dentro del cuadro en ninguno.
  //
  // Es poca cosa en pixeles y es exactamente lo que E-ENCUADRE existe para no dejar pasar: geometria
  // animada que nadie ve. Y las compuertas no podian: la regla por malla pide lado > mundoW*0.12 y
  // estas miden 0.12-0.21, y la de grupo se conforma con que 3 de 24 sean invisibles.
  const MK_Y0 = -6.2, MK_PASO = 0.55, MK_SUBE = 1.68
  // El semicuadro sale de la proporcion 9:16 sobre `mundoW`, que es lo que esta escena SI recibe:
  // mundoH = mundoW * 16/9. Pedir `mundoH` en el ctx seria cambiarle la firma a la escena por una
  // cuenta de una linea.
  const MK_N = Math.floor(((mundoW * 16 / 9) / 2 - MK_Y0) / MK_PASO) + 1
  if (hudBorde) for (let i = 0; i < MK_N; i++) {
    const largo = 0.10 + rnd() * 0.16
    const acentuada = rnd() > 0.72
    const mk = barra(acentuada ? LOOK.acento : LOOK.tinta, acentuada ? 2.6 : 0.8, 1, 0)
    mk.position.set(2.62, MK_Y0 + i * MK_PASO, -0.3)
    mk.scale.set(largo, 0.028, 1)
    marcas.push(mk)
  }

  // HUD superior: rótulo fijo + regla de progreso escalonada en 16 pasos, o sea un escalón por medio
  // beat. Es un metrónomo visible, y de paso confirma que la grilla existe.
  const rot = medida(D.rotulo, CHICA, 2.9, 0.20)
  // ENCAJA: es el rotulo-metronomo, texto chico arriba a la izquierda. Un rotulo cortado por el
  // borde se lee como error de maquetado.
  const hud = plano(rot, -1)
  hud.userData.encaja = true
  hud.position.set(XI, 4.45, 0)
  hud.scale.set(0.001, 1, 1)

  const riel = barra(LOOK.tinta, 0.45, -1, 0)
  riel.position.set(XI, 4.12, -0.1); riel.scale.set(XD - XI, 0.022, 1)
  const relleno = barra(LOOK.acento, 3.4, -1, 0)
  relleno.position.set(XI, 4.12, 0); relleno.scale.set(0, 0.05, 1)

  // Epígrafes de abajo: dos, y el cambio cae en el beat 4 — el mismo pulso que el tramo rápido.
  // ESTOS DOS EPIGRAFES ERAN LA FUGA MAS CARA DEL MOTOR. Decian 'SIETE ENTRADAS · NINGUNA IGUAL' y
  // 'CADA CORTE CAE EN EL BEAT': copy de urvid sobre su propia tecnica, en castellano, impreso en el
  // video de Stripe. El gate E-INVENCION no los veia porque solo conocia los literales del objeto
  // ANTHEM de datos.js, y estos estaban escritos aca adentro. De ahi salio E-PROCEDENCIA.
  // Ahora los ocupan el rotulo de la pagina y su dominio: reales, cortos y del mismo largo.
  const e1 = medida(D.rotulo || sello(0), CHICA, 3.5, 0.22)
  const c1 = planoW(e1, -1, { dir: 0, borde: 0.1, filo: LOOK.acento })
  c1.position.set(XI, -3.62, 0)
  const e2 = medida(sello(0), CHICA, 3.2, 0.22)
  const c2 = planoW(e2, -1, { dir: 0, borde: 0.1, filo: LOOK.acento2 })
  c2.position.set(XI, -3.62, 0)

  // ------------------------------------------------------------------ timeline
  //
  // Entradas 2 frames ANTES del corte (el impacto cae sobre el beat, no después) y salidas 5 frames
  // antes: exactamente 3 frames de solape. En el tramo rápido (medios beats) la salida arranca 3
  // frames antes, porque no hay lugar para más y aun así quedan los 3 frames de solape.
  // LA QUE SE VA TERMINA DE IRSE ANTES DE QUE LLEGUE LA SIGUIENTE, y eso hay que decirlo con numeros
  // porque antes no pasaba. La salida arrancaba 5 cuadros antes del beat y duraba b(0.42) —unos 6—,
  // asi que terminaba 1 cuadro DESPUES del beat; la entrada arrancaba 2 antes. Resultado: tres
  // cuadros con las dos frases ocupando el mismo renglon. En el video se leia "BIG NU|VIBERS." y
  // "REMEMBER|WHEN" encimados, dos veces en cinco segundos, y no se lee como un efecto: se lee como
  // un error de render. Ahora la salida empieza antes y la entrada cae EN el beat, con casi un cuadro
  // de aire entre las dos. El corte sigue cayendo en la grilla; lo unico que cambia es que ya no hay
  // solape.
  const ent = bt => Math.max(0, b(bt))
  const sal = (bt, rapido) => b(bt) - (rapido ? 5 : 7) * F

  // 1 · las mitades se juntan (con stagger: nunca llegan a la vez) y se van disparadas al revés
  tl.to(w1a.position, { x: -x1, duration: b(0.85), ease: E.llega(1.9) }, 0)
  tl.to(w1b.position, { x: x1, duration: b(0.85), ease: E.llega(1.9) }, 0.055)
  tl.to(w1a.scale, { y: 1, duration: b(0.8), ease: E.llega(2.6) }, 0)
  tl.to(w1b.scale, { y: 1, duration: b(0.8), ease: E.llega(2.6) }, 0.055)
  tl.to(w1a.position, { y: 0.42, duration: b(0.55), ease: E.vaiven() }, b(0.9))
  tl.to(w1b.position, { y: 0.18, duration: b(0.55), ease: E.vaiven() }, b(0.9))
  tl.to(w1a.position, { x: -x1 - 6.6, duration: b(0.42), ease: E.acelera(3) }, sal(1.5))
  tl.to(w1b.position, { x: x1 + 6.6, duration: b(0.42), ease: E.acelera(3) }, sal(1.5) + 0.03)

  // 2 · escala anclada al margen; se va aplastándose (escala a 0 en Y mientras se estira en X)
  tl.to(w2.scale, { x: 1, y: 1, duration: b(0.78), ease: E.llega(2.6) }, ent(1.5))
  tl.to(w2.rotation, { z: 0, duration: b(0.92), ease: E.llega(2.2) }, ent(1.5))
  tl.to(w2.position, { x: XI + 0.14, duration: b(0.9), ease: E.vaiven() }, b(1.9))
  tl.to(w2.scale, { y: 0, x: 1.3, duration: b(0.42), ease: E.acelera(3) }, sal(3))

  // 3 · máscara horizontal que descubre; se borra por máscara inversa y se escapa hacia arriba
  tl.to(w3.material.uniforms.uProg, { value: 1, duration: b(0.36), ease: E.frena(2) }, ent(3))
  tl.to(w3.position, { x: XD, duration: b(0.5), ease: E.frena(5) }, ent(3))
  tl.to(w3.material.uniforms.uProg, { value: 0, duration: b(0.31), ease: E.acelera(2) }, sal(3.5, 1))
  tl.to(w3.position, { y: 0.62, duration: b(0.31), ease: E.acelera(2) }, sal(3.5, 1))

  // 4 · máscara vertical; se va por aceleración hacia arriba, fuera de cuadro
  tl.to(w4.material.uniforms.uProg, { value: 1, duration: b(0.36), ease: E.frena(2) }, ent(3.5))
  tl.to(w4.position, { y: 0.60, duration: b(0.34), ease: E.frena(5) }, ent(3.5))
  tl.to(w4.position, { y: 6.8, duration: b(0.33), ease: E.acelera(3) }, sal(4, 1))

  // 5 · cae de plano desde 90° y sigue girando hasta desaparecer por el otro lado
  tl.to(w5.rotation, { x: 0, duration: b(0.42), ease: E.llega(2.4) }, ent(4))
  tl.to(w5.scale, { x: 1, y: 1, duration: b(0.42), ease: E.frena(5) }, ent(4))
  tl.to(w5.position, { y: 0.25, duration: b(0.42), ease: E.llega(2.0) }, ent(4))
  tl.to(w5.rotation, { x: -Math.PI / 2, duration: b(0.31), ease: E.acelera(3) }, sal(4.5, 1))
  tl.to(w5.position, { y: 0.62, duration: b(0.31), ease: E.acelera(3) }, sal(4.5, 1))

  // 6 · entra de fuera de cuadro con overshoot y se va por el lado contrario
  tl.to(w6.position, { x: XD, duration: b(0.82), ease: E.llega(1.7) }, ent(4.5))
  tl.to(w6.rotation, { z: 0, duration: b(1.0), ease: E.llega(2.0) }, ent(4.5))
  tl.to(w6.position, { y: 0.58, duration: b(0.4), ease: E.vaiven() }, b(5.3))
  tl.to(w6.position, { x: XD - 9.4, duration: b(0.42), ease: E.acelera(3) }, sal(6))
  tl.to(w6.rotation, { z: -0.10, duration: b(0.42), ease: E.acelera(2) }, sal(6))

  // 7 · llega desde el fondo pasándose de largo, vuelve a golpear en el beat 7 y se escapa creciendo
  //     justo cuando el corte de escena la interrumpe
  tl.set(w7, { visible: true }, ent(6))
  tl.to(w7.position, { z: 0, duration: b(0.95), ease: E.llega(2.2) }, ent(6))
  tl.to(w7.rotation, { z: 0, duration: b(1.1), ease: E.llega(1.8) }, ent(6))
  tl.to(w7.scale, { x: 1.10, y: 1.10, duration: b(0.42), ease: E.llega(3) }, b(7) - F)
  tl.to(w7.position, { y: 0.22, duration: b(0.8), ease: E.vaiven() }, b(6.85))
  tl.to(w7.scale, { x: 1.34, y: 1.34, duration: b(0.35), ease: E.acelera(2) }, b(7.6))
  tl.to(w7b.material.uniforms.uProg, { value: 1, duration: b(0.5), ease: E.frena(2) }, b(6) + 3 * F)
  tl.to(w7b.scale, { x: 1.09, duration: b(1.2), ease: E.vaiven() }, b(6.6))
  tl.to(w7b.position, { y: 2.75, duration: b(0.4), ease: E.acelera(2) }, b(7.5))

  // -------- filete: se contrae, SALTA de sitio y vuelve a crecer. El salto es lo que se ve.
  let prev = FIL[0].l
  for (let i = 0; i < FIL.length; i++) {
    const s = FIL[i]
    const tc = b(s.bt)
    if (i > 0) tl.to(fil.scale, { x: 0, duration: 2.5 * F, ease: E.acelera(2) }, tc - 3 * F)
    const t0 = Math.max(0, tc - 0.5 * F)
    const col = hex(s.c).multiplyScalar(3.4)
    tl.set(fil.position, { x: s.x, y: s.y }, t0)
    tl.set(fil.scale, { y: s.gr }, t0)
    tl.set(fil.material.color, { r: col.r, g: col.g, b: col.b }, t0)
    tl.to(fil.scale, { x: s.l, duration: b(0.26), ease: E.frena(5) }, t0)
    prev = s.l
  }
  void prev

  // -------- barras a contratiempo
  for (const p of PLAN) {
    for (const [bt, vida] of p.hits) {
      const t0 = b(bt) + p.fase
      const t1 = b(bt + vida) + p.fase
      if (p.eje === 'xy') {
        tl.to(p.m.scale, { x: 1, y: 1, duration: b(0.34), ease: E.llega(2.8) }, t0)
        tl.to(p.m.rotation, { z: 0, duration: b(0.5), ease: E.llega(2.2) }, t0)
        tl.to(p.m.scale, { x: 0, y: 0, duration: b(0.26), ease: E.acelera(3) }, t1)
        tl.to(p.m.rotation, { z: -0.55, duration: b(0.26), ease: E.acelera(2) }, t1)
      } else {
        tl.to(p.m.scale, { [p.eje]: p.larg, duration: b(0.34), ease: E.frena(5) }, t0)
        tl.to(p.m.scale, { [p.eje]: 0, duration: b(0.26), ease: E.acelera(3) }, t1)
      }
    }
  }
  bloque.rotation.z = 0.42

  // -------- barrido del cierre
  tl.to(barrido.scale, { x: 6.7, duration: 0.07, ease: E.frena(2) }, b(7.5))
  tl.to(barrido.position, { y: 1.9, duration: b(0.45), ease: 'power1.inOut' }, b(7.5))
  tl.to(barrido.scale, { x: 0, duration: 0.07, ease: E.acelera(2) }, b(7.5) + 0.13)

  // -------- columna de marcas: un solo movimiento continuo, de punta a punta de la escena
  // El recorrido es el MISMO valor con el que se dimensiono la columna (MK_SUBE): escribirlo dos veces
  // es garantia de que algun dia dejen de coincidir y vuelvan las marcas que nadie ve.
  for (const mk of marcas) {
    tl.to(mk.position, { y: mk.position.y + MK_SUBE, duration: b(7.9), ease: 'none' }, 0)
  }

  // -------- HUD: rótulo y regla escalonada (un escalón por medio beat)
  tl.to(hud.scale, { x: 1, duration: b(0.7), ease: E.frena(5) }, 0.06)
  tl.to(relleno.scale, { x: XD - XI, duration: b(7.85), ease: 'steps(16)' }, 0)
  tl.to(riel.scale, { y: 0.05, duration: b(1.2), ease: E.vaiven() }, b(6))

  // -------- epígrafes
  tl.to(c1.material.uniforms.uProg, { value: 1, duration: b(0.7), ease: E.frena(2) }, 0.10)
  tl.to(c1.material.uniforms.uProg, { value: 0, duration: b(0.4), ease: E.acelera(2) }, sal(4, 1))
  tl.to(c2.material.uniforms.uProg, { value: 1, duration: b(0.7), ease: E.frena(2) }, ent(4))
  tl.to(c2.scale, { x: 1.06, duration: b(2.4), ease: E.vaiven() }, b(5))
  tl.to(c2.position, { y: -3.70, duration: b(0.6), ease: E.acelera(2) }, b(7.3))

  // ------------------------------------------------------------------ fondo, pase final y cámara
  //
  // Van con set + to y nunca con fromTo: son uniforms COMPARTIDOS con el resto de la pieza, y un
  // fromTo dejaría su valor inicial aplicado desde el frame 0 de todo el video.

  for (const bt of CORTE) {
    const t0 = Math.max(0, b(bt) - 2 * F)
    tl.set(fondo.uPulso, { value: bt === 0 ? 0.52 : 0.42 }, t0)
    tl.to(fondo.uPulso, { value: 0.05, duration: b(0.44), ease: E.frena(5) }, t0)
  }
  tl.set(fondo.uPulso, { value: 0.40 }, b(7) - 2 * F)
  tl.to(fondo.uPulso, { value: 0, duration: b(0.9), ease: E.frena(5) }, b(7) - 2 * F)

  tl.set(fondo.uGrilla, { value: 0.55 }, 0)
  tl.to(fondo.uGrilla, { value: 0.95, duration: b(2.6), ease: E.vaiven() }, 0)
  tl.set(fondo.uGrilla, { value: 1.55 }, b(3) - 2 * F)
  tl.to(fondo.uGrilla, { value: 0.30, duration: b(1.4), ease: E.frena(5) }, b(3) - 2 * F)
  tl.to(fondo.uGrilla, { value: 1.10, duration: b(1.5), ease: E.vaiven(2) }, b(4.5))
  tl.to(fondo.uGrilla, { value: 0.55, duration: b(1.6), ease: E.vaiven() }, b(6))

  // Micro-flashes SÓLO en el tramo rápido y en el golpe del beat 7. Los cortes de escena ya los pone
  // el secuenciador; estos son los cortes de adentro y por eso valen la mitad.
  for (const bt of [3, 3.5, 4, 7]) {
    const t0 = b(bt) - F
    tl.set(pelicula.uFlash, { value: 0.3 }, t0)
    tl.to(pelicula.uFlash, { value: 0, duration: 2 * F, ease: E.acelera(2) }, t0)
  }

  // 1.15 sobre una base de 0.85 es x1.35; 0.85 era la base misma, o sea x1.
  tl.to(bloom, { strength: oBloom * 1.35, duration: b(1.0), ease: E.frena(2) }, b(6))
  tl.to(bloom, { strength: oBloom, duration: b(0.5), ease: E.vaiven() }, b(7.1))

  // CÁMARA: un acercamiento lento que sostiene los 8 beats y dos ladeos secos sobre el tramo rápido.
  // Vuelve a su sitio antes del final — si no, la escena siguiente arranca desde otro punto de vista.
  tl.to(camera.position, { z: dolly(distBase, -0.9), duration: b(6), ease: E.vaiven() }, 0)
  tl.to(camera.position, { z: distBase, duration: b(1.5), ease: E.vaiven(2) }, b(6))
  tl.to(camera.position, { y: orbita(0.24), duration: b(4), ease: E.vaiven() }, 0)
  tl.to(camera.position, { y: 0, duration: b(3.5), ease: E.vaiven() }, b(4))
  for (const [bt, lado] of [[3, 1], [3.5, -1], [4, 1]]) {
    const t0 = b(bt) - 2 * F
    tl.set(camera.rotation, { z: orbita(0.019) * lado }, t0)
    tl.to(camera.rotation, { z: 0, duration: b(0.42), ease: E.frena(5) }, t0)
  }
  tl.set(camera.position, { x: 0, y: 0, z: distBase }, b(7.92))
  tl.set(camera.rotation, { x: 0, y: 0, z: 0 }, b(7.92))

  // SE SUELTA LA PAUSA ANTES DE DEVOLVERLA. GSAP calcula el tiempo local de un hijo como
  // (tiempoDelPadre - inicio) * timeScaleDelHijo, y pausar es exactamente poner ese timeScale en 0:
  // una timeline pausada metida en otra con .add() se queda clavada en el frame 0 para siempre, sin
  // error ni aviso. Se construye en pausa (así ningún tween se renderiza a medias mientras se arma y
  // los valores de partida se capturan donde corresponde) y se suelta acá, con el cabezal en 0.
  // Manejada sola con .time() — como hace verificar.mjs — se comporta igual que antes.
  tl.pause(0)
  tl.paused(false)

  return { g, tl }
}
