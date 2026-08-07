// HERO "ventana" — una ventana de navegador suelta, flotando, con la página adentro.
//
// POR QUÉ, HABIENDO YA UN TELÉFONO Y UNA NOTEBOOK
// Porque el dispositivo es una AFIRMACIÓN sobre el producto, y los tres dicen cosas distintas. El
// teléfono dice consumo: algo que se descubre scrolleando en el colectivo. La notebook dice trabajo:
// una sesión larga, un aparato sobre una mesa, alguien sentado. Una ventana SUELTA —sin aparato
// alrededor, sin cuerpo humano implícito— no dice nada de dónde está el que mira: dice "esto es la
// web". Es el registro de un SaaS, de un panel, de una documentación; cosas que no viven en un
// dispositivo sino en una pestaña, y que quedaban sin hero.
//
// LA BARRA DE DIRECCIONES VA VACÍA, Y NO ES UNA CONCESIÓN
// Escribir una URL ahí sería texto que la página nunca dijo —la regla de procedencia— y además, a esta
// escala, seis píxeles de gris ilegible que sólo agregan ruido. Una pastilla vacía se lee igual como
// barra de direcciones: lo que la identifica es su FORMA y su LUGAR, no su contenido. Lo mismo con los
// tres círculos: no llevan los colores del semáforo de macOS porque eso ya es la marca de un sistema
// operativo ajeno metida en el video de un cliente. Tres puntos grises a la izquierda de una barra ya
// dicen "navegador" sin firmar por nadie.
//
// LA VENTANA ENTERA VIVE EN `gr`, Y ESO RESUELVE TRES COSAS DE UNA
// El teléfono y la notebook ponen el chasis en `g` (con luces, metal) y sólo la pantalla en `gr`. Acá
// no: una ventana de navegador no es un objeto físico, es SOFTWARE — no tiene metal, no tiene canto
// pulido, no refleja el ambiente. Llevándola entera a la escena post-bloom se gana:
//   · en un mundo CLARO la carcasa es casi blanca, y en `g` el bloom la convertiría en la misma mancha
//     que ya obliga a sacar de ahí a la página (ver la nota de main.js/_composer);
//   · la barra y la página quedan en el MISMO plano, o sea que se dibujan con un solo shader y con un
//     solo recorte de esquinas: no hay costura entre el marco y el contenido, que es exactamente lo que
//     delata un mockup armado con dos rectángulos;
//   · hay UNA sola copia de matriz por cuadro, en vez de una por plano.
// El precio: `escenaReal` NO tiene luces (main.js sólo se las agrega a `this.scene`), así que cualquier
// MeshStandard/Physical puesto ahí sale NEGRO. Por eso el canto usa un shader con una luz escrita a
// mano — ver `materialChapa`.
//
// CONTRATO: ver heroes/telefono.js

import { LOOK, b, E, hex, matAcento, nivel, dolly } from '../kit.js'

export const meta = {
  id: 'ventana',
  nombre: 'Ventana de navegador',
  necesita: ['tira'],
  beats: 8,
}

const AR_VENT = 16 / 10.4          // proporción de una ventana de navegador CONTANDO su barra
const F_BARRA = 0.086              // la barra, como fracción del alto de la ventana (~40 px de 470)
const R_ESQ = 0.013                // radio de esquina como fracción del ANCHO

// Rectángulo de esquinas redondeadas como `THREE.Shape`, igual que en telefono.js: extruido con bisel
// da la esquina continua y el canto de una sola vez.
function formaRedonda(THREE, w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

// LA ESCENA POST-BLOOM NO TIENE UNA SOLA LUZ. `main.js` le cuelga la ambiental, la key y el rim a
// `this.scene`; `this.escenaReal` se crea pelada. Un MeshPhysicalMaterial ahí no queda oscuro: queda
// NEGRO, y el canto de la ventana desaparece justo cuando la ventana gira y es lo único que se ve.
// Una luz direccional fija escrita en el shader alcanza y sobra: el canto es una tira de dos milímetros
// y lo único que se le pide es que un lado esté más claro que el otro cuando el objeto rota.
//
// El canto COMPARTE el uniform del revelado con la carcasa —el mismo objeto, no una copia— y se recorta
// con la misma cuenta. Sin eso, la primera versión dejaba una plancha opaca del tamaño de la ventana
// visible desde el primer cuadro, y la ventana se desenrollaba DENTRO de ella: el gesto de apertura
// quedaba anulado por el objeto que se supone que está apareciendo.
function materialChapa(THREE, color, uProg, alto) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: hex(color) }, uProg, uAlto: { value: alto } },
    vertexShader: `
      uniform float uAlto; varying vec3 vN; varying float vProf;
      void main(){
        vN = normalize(normalMatrix * normal);
        vProf = 0.5 - position.y / uAlto;             // 0 en la barra, 1 en el borde de abajo
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uCol; uniform float uProg; varying vec3 vN; varying float vProf;
      void main(){
        // Se corta medio ancho de degradé ANTES que la carcasa, para que el canto no asome nunca por
        // delante del borde que se está revelando.
        if (vProf > uProg - 0.035) discard;
        float d = 0.46 + 0.54 * max(0.0, dot(normalize(vN), normalize(vec3(-0.42, 0.70, 0.58))));
        gl_FragColor = vec4(uCol * d, 1.0);
      }`,
  })
}

export function build(ctx) {
  const { THREE, gsap, mundoW, mundoH, camera, distBase, rnd, texturas, spec } = ctx
  const g = new THREE.Group()
  const gr = new THREE.Group()
  const tl = gsap.timeline({ paused: true })
  const DUR = b(meta.beats)
  const claro = !!ctx.claro

  // Sin la tira este hero no tiene sujeto: una ventana de navegador vacía no es una composición más
  // austera, es una ventana rota. El registro no debería haberlo ofrecido (necesita: ['tira']); si
  // igual llegó acá, un grupo vacío con la duración correcta es la respuesta honesta.
  const fuente = texturas && texturas.get('tira')
  if (!fuente || !fuente.image) {
    tl.to({}, { duration: DUR }, 0)
    return { g, gr, tl, vacia: true }
  }

  // UN CLON DE LA TIRA, POR LA MISMA RAZÓN QUE EN escenas/pantalla.js: `texturas` es un Map COMPARTIDO
  // y la tira es UN solo objeto. Escribiéndole el offset cada cuadro, la escena siguiente que la use
  // abre mostrando el medio de la página hasta que su propio tween arranque. El clon comparte el
  // `source` —o sea que no hay una segunda subida a la GPU— y trae su propio offset.
  const tira = fuente.clone()
  tira.colorSpace = THREE.SRGBColorSpace
  tira.wrapS = tira.wrapT = THREE.ClampToEdgeWrapping
  tira.anisotropy = 8

  const anchoTira = fuente.image.width || 720
  const altoTira = fuente.image.height || (spec && spec.tiraViewport) || 1560

  // ---------------------------------------------------------------- medidas
  // EL TAMAÑO DECIDE SI LA PÁGINA SE LEE. Vale acá el mismo argumento que documenta telefono.js: una
  // ventana chica y centrada es elegante y su tipografía es una textura gris que no dice nada. A 1.02
  // del ancho de cuadro la ventana lo llena de punta a punta, y como además gira en Y —lo que la
  // ACHICA en pantalla, nunca la agranda— nunca se sale por los costados.
  const ANCHO = mundoW * 1.02
  const ALTO = ANCHO / AR_VENT
  const GRUESO = ANCHO * 0.016
  const R = ANCHO * R_ESQ

  // Todo lo que sigue está en el espacio "p" del shader: x normalizado al ANCHO y el eje y dividido por
  // la relación de aspecto, que es lo que hace que un radio no se deforme (ver telefono.js). Las
  // cuentas se hacen ACÁ y no en GLSL para que el shader se lea y para no repetirlas por cada píxel.
  const uAR = ANCHO / ALTO
  const yBarra = 1 - F_BARRA                       // la frontera barra/página, en uv de la carcasa
  const altoBarraP = F_BARRA / uAR                 // alto de la barra medido en unidades de ANCHO
  const yCentroP = (0.5 - F_BARRA / 2) / uAR       // centro vertical de la barra, en el espacio p
  const rPunto = altoBarraP * 0.155                // los círculos: 31% del alto de la barra de diámetro
  const xPunto = -0.5 + altoBarraP * 0.62          // el margen izquierdo también se mide con la barra
  const pasoPunto = rPunto * 2.95

  // ---------------------------------------------------------------- cuánta página entra
  // LA TIRA SE CAPTURÓ EN VIEWPORT MÓVIL (9:19.5) Y UNA VENTANA ES APAISADA. Mostrarla entera la
  // achataría a la mitad de su alto: el defecto que el dueño de la página ve antes que ninguno, el
  // mismo por el que `planoRecorte` no recorta ni deforma.
  //
  // Y NO ALCANZA CON LA CUENTA DEL TELÉFONO. Ahí `visible = tiraViewport / altoTira` funciona porque la
  // pantalla del aparato tiene EXACTAMENTE la proporción del viewport capturado. Acá no: la proporción
  // de la región visible tiene que salir de los PÍXELES REALES del archivo contra la proporción del
  // hueco de contenido, y entonces lo que se ve es una ventana de navegador de 720 px de ancho por los
  // ~430 px de alto que le corresponden. Que es, literalmente, lo que vería alguien con el navegador
  // abierto a esa altura.
  const phPag = ALTO * yBarra
  // El tope de 1 es para una página más CORTA que 1.68 veces su ancho — una captura casi cuadrada, que
  // el pipeline móvil no produce (su viewport mínimo ya es 9:19.5). Si alguna vez llega, la página se
  // estira a lo alto en vez de romper la composición, y se ve que algo pasó.
  const visible = Math.min(1, (anchoTira * phPag) / (altoTira * ANCHO))
  const arriba = 1 - visible                       // el offset que muestra el TOPE de la página
  tira.repeat.set(1, visible)
  tira.offset.set(0, arriba)

  // ---------------------------------------------------------------- grupos
  // `gVent` hace la LLEGADA y la SALIDA; `gFlota`, hijo suyo, el vaivén y el paralaje continuos. Dos
  // grupos para que dos tweens nunca escriban la misma propiedad — ver el comentario largo de
  // telefono.js sobre el vaivén resuelto con `modifiers`, que no corrió nunca y no avisó.
  const gVent = new THREE.Group()
  g.add(gVent)
  const gFlota = new THREE.Group()
  gVent.add(gFlota)

  // El espejo de `gFlota` en la escena post-bloom. Toda la ventana cuelga de acá.
  const gCara = new THREE.Group()
  gr.add(gCara)

  // UN SOLO REVELADO Y UN SOLO BARRIDO PARA LAS TRES MALLAS. Son objetos de uniform compartidos, no
  // copias: la carcasa, el canto y el reflejo apuntan al MISMO `{ value }`, así que un tween mueve a
  // los tres y no existe la posibilidad de que se desincronicen. La primera versión tenía un tween por
  // material con los mismos números escritos dos veces, que es la forma clásica de que dentro de tres
  // meses alguien toque uno y no el otro.
  const uProg = { value: 0 }
  const uBarrido = { value: 0.15 }

  // ---------------------------------------------------------------- el canto
  // Apenas más grande que la carcasa, así que además de dar grosor deja un filete de un píxel alrededor
  // de la ventana: el borde que tiene cualquier panel flotante y sin el cual la ventana se lee pegada
  // al fondo. El grosor sólo se ve cuando la ventana gira, y ese medio segundo es justamente lo que
  // separa un objeto 3D de una foto con paralaje.
  //
  // OJO CON LA PROFUNDIDAD, Y ACÁ NO SIRVE COPIAR DE telefono.js. Allá el chasis vive en `g` y la
  // pantalla en `gr`, que son DOS PASES con `clearDepth`, así que la pantalla puede estar hundida
  // dentro del cuerpo y se dibuja igual. Acá el canto y la carcasa están en la MISMA escena y comparten
  // el buffer de profundidad: una extrusión con bisel mide `depth + 2 * bevelThickness`, o sea que su
  // cara delantera queda en 0.70 de GRUESO y no en 0.50. Con la carcasa puesta en 0.56 —el número del
  // teléfono— el canto la tapaba entera y la ventana era una plancha gris.
  // La cara delantera del canto queda en (1.0 + 0.20 * 2) / 2 = 0.70 de GRUESO; la carcasa va apenas
  // por delante de eso, lo justo para ganar el test de profundidad y no para leerse como un escalón.
  const Z_CARA = GRUESO * 0.74
  const canto = new THREE.Mesh(
    new THREE.ExtrudeGeometry(formaRedonda(THREE, ANCHO + GRUESO * 0.22, ALTO + GRUESO * 0.22, R * 1.06), {
      depth: GRUESO, bevelEnabled: true,
      bevelThickness: GRUESO * 0.20, bevelSize: ANCHO * 0.0022, bevelSegments: 2, curveSegments: 20,
    }), materialChapa(THREE, nivel(0.22), uProg, ALTO))
  canto.geometry.center()
  gCara.add(canto)

  // ---------------------------------------------------------------- la ventana, en un solo shader
  // UNA VENTANA NO ES UN MARCO CON UNA PANTALLA ADENTRO: ES UNA SUPERFICIE. Dibujar la barra en un
  // plano y la página en otro obliga a recortar dos veces las mismas esquinas, deja una costura donde
  // los dos planos se tocan y —peor— hace que la pastilla o los círculos asomen por fuera de la esquina
  // curva en cuanto la ventana rota. Es el mismo error que telefono.js documenta con el reflejo que
  // salía como un rombo celeste flotando detrás del aparato. Acá el SDF recorta todo de una vez.
  //
  // LA TRAMPA QUE HAY QUE CONOCER PARA LEER ESTO: `texture.offset` y `texture.repeat` NO se aplican
  // solos en un ShaderMaterial. three los sube como `uvTransform` únicamente para sus materiales de
  // fábrica (`refreshUniformsCommon` y compañía); un shader propio que hace `texture2D(map, vUv)`
  // muestrea la textura ENTERA y el scroll no mueve nada. Por eso el offset y el repeat de la tira
  // entran como uniforms y la cuenta se hace acá: son los MISMOS Vector2 que vive adentro de la
  // textura, así que animar `tira.offset.y` sigue siendo lo que scrollea la página.
  const uCarcasa = (espejo) => ({
    map: { value: tira },
    uPag: { value: tira.offset }, uEsc: { value: tira.repeat },
    uR: { value: R_ESQ }, uAR: { value: uAR }, uYBar: { value: yBarra },
    uPuntoY: { value: yCentroP }, uPuntoX: { value: xPunto },
    uPuntoPaso: { value: pasoPunto }, uPuntoR: { value: rPunto },
    uPastillaH: { value: new THREE.Vector2(0.215, altoBarraP * 0.30) },
    // NADA DE GRISES FIJOS: la escala sale del fondo hacia la tinta, así que la misma barra es gris
    // oscuro en un mundo negro y gris claro en uno blanco, sin que este archivo sepa en cuál está.
    uChapa: { value: hex(nivel(0.16)) },
    uLinea: { value: hex(nivel(0.30)) },
    uPunto: { value: hex(nivel(0.34)) },
    uPastilla: { value: hex(nivel(0.07)) },
    uFilo: { value: hex(nivel(0.45)) },
    uProg, uBarrido,
    uClaro: { value: claro ? 1 : 0 }, uEspejo: { value: espejo ? 1 : 0 },
  })

  const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  const FRAG = `
    uniform sampler2D map;
    uniform vec2 uPag, uEsc, uPastillaH;
    uniform float uR, uAR, uYBar, uPuntoY, uPuntoX, uPuntoPaso, uPuntoR;
    uniform float uProg, uBarrido, uClaro, uEspejo;
    uniform vec3 uChapa, uLinea, uPunto, uPastilla, uFilo;
    varying vec2 vUv;
    // rectángulo redondeado, medido en el espacio del ANCHO para que el radio no se deforme
    float rr(vec2 p, vec2 h, float r){ vec2 d = abs(p) - h + vec2(r); return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r; }
    void main(){
      // EL REFLEJO ES LA MISMA VENTANA LEÍDA AL REVÉS. Una sola q resuelve las dos mallas: la de arriba
      // con uEspejo en 0 y la de abajo con uEspejo en 1. Se hace acá y no con un scale.y negativo
      // porque eso da vuelta el winding y obliga a DoubleSide en todo.
      vec2 q = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, uEspejo));
      vec2 p = vec2(q.x - 0.5, (q.y - 0.5) / uAR);
      float dist = rr(p, vec2(0.5, 0.5 / uAR), uR);
      float a = smoothstep(0.004, -0.002, dist);
      // LA VENTANA SE DESENROLLA DESDE SU BARRA HACIA ABAJO. Es un revelado por máscara y no un fundido:
      // primero aparece la barra —que es lo que dice "esto es un navegador"— y la página sale de abajo
      // de ella. Un fundido diría lo mismo sin decir cuándo empieza a ser una ventana.
      // El smoothstep va con los bordes EN ORDEN y la resta afuera. Los de más arriba están al revés
      // (0.004, -0.002) porque es el modismo que ya usa todo el motor para un SDF, pero de este depende
      // que la ventana sea visible o no, y un smoothstep con edge0 >= edge1 es, por especificación,
      // resultado indefinido: funciona en todos los drivers de hoy y no hay por qué apostar acá.
      a *= 1.0 - smoothstep(uProg - 0.07, uProg, 1.0 - q.y);
      a *= mix(1.0, pow(vUv.y, 2.2) * 0.40, uEspejo);
      if (a < 0.004) discard;

      // La página ocupa de 0 a uYBar; el resto es la barra. Las dos se calculan SIEMPRE y se mezclan al
      // final: un texture2D adentro de un if deja las derivadas indefinidas y el mipmap se rompe justo
      // en el borde, que es donde más se nota.
      vec2 uvp = uPag + vec2(q.x, clamp(q.y / uYBar, 0.0, 1.0)) * uEsc;
      vec3 c = texture2D(map, uvp).rgb;

      vec3 barra = uChapa;
      float dp = 9.0;
      for (int i = 0; i < 3; i++) {
        dp = min(dp, length(p - vec2(uPuntoX + float(i) * uPuntoPaso, uPuntoY)) - uPuntoR);
      }
      barra = mix(barra, uPunto, smoothstep(0.0016, -0.0010, dp));
      float dpa = rr(p - vec2(0.0, uPuntoY), uPastillaH, uPastillaH.y);
      barra = mix(barra, uPastilla, smoothstep(0.0016, -0.0010, dpa));
      barra = mix(barra, uLinea, smoothstep(0.0022, 0.0, abs(dpa) - 0.0011));
      c = mix(c, barra, smoothstep(uYBar - 0.0016, uYBar + 0.0016, q.y));
      // el pelo que separa la barra de la página: sin él las dos zonas se tocan y la ventana se lee
      // como una sola imagen con una franja arriba
      c = mix(c, uLinea, smoothstep(0.0030, 0.0, abs(q.y - uYBar)) * 0.85);

      // BARRIDO DE VIDRIO. Es el gesto que convierte "una imagen pegada" en "una superficie". Sobre
      // negro SUMA luz; sobre blanco sumar no aclara nada —el píxel ya está en 1.0— así que oscurece,
      // que es como se ve un reflejo en una pantalla clara.
      float band = smoothstep(0.42, 0.0, abs((q.x * 0.72 + q.y * 1.18) - uBarrido));
      c = mix(c + vec3(0.50, 0.56, 0.72) * band * 0.055, c * (1.0 - band * 0.06), uClaro);

      // FILO INTERNO. Se MEZCLA hacia un gris medio en vez de sumar blanco: sumando, en un mundo claro
      // el borde no existe y la ventana se derrama sobre el fondo sin que se vea dónde termina.
      c = mix(c, uFilo, smoothstep(-0.009, -0.0015, dist) * 0.55);
      gl_FragColor = vec4(c, a);
    }`

  const geoCara = new THREE.PlaneGeometry(ANCHO, ALTO)
  const carcasa = new THREE.Mesh(geoCara, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: uCarcasa(false), vertexShader: VERT, fragmentShader: FRAG,
  }))
  // La cara de la ventana ES la pagina del cliente (el shader dibuja la barra y la pagina en una sola
  // superficie, ver la nota de arriba). Iba en un uniform, asi que hasta hoy no la veia ni el censo de
  // encaje ni el de nitidez ni `heroes-audit`.
  carcasa.userData.tipoImagen = 'recorte'
  // Sin `encaja`, medido: se sale en 98 de 117 cuadros y llega a 1.999 con `tecnico`/cliping-ia. La
  // ventana se muestra GRANDE y encuadrada por la camara, asi que la mayor parte del tramo su cara
  // excede el cuadro a proposito. Lo que corresponde es `encaja` + `encajaEntre` derivado del tween.
  carcasa.position.z = Z_CARA
  // LA PAGINA VA DE 0 A `yBarra`; lo de arriba es la barra del navegador (el shader, en `q.y / uYBar`).
  // `tools/tira-check.mjs` corre en Node y no compila GLSL, asi que esa frontera no la puede ver: se la
  // declaramos. Sin esto mide la pagina contra `ALTO` entero y acusa 1.094x de deformacion inexistente
  // — justo a uno de los dos archivos que documentan la cuenta correcta (linea 154).
  carcasa.userData.pagina = { anchoFrac: 1, altoFrac: yBarra }
  gCara.add(carcasa)

  // EL REFLEJO NO ES DECORACIÓN: ES LO QUE LLENA EL CUADRO. Una ventana apaisada dentro de un cuadro
  // 9:16 deja dos tercios de alto vacíos, y un cuadro vacío convierte cualquier pieza en una
  // diapositiva. Un reflejo debajo apoya la ventana sobre algo, da la mitad inferior que faltaba y
  // cuesta una malla más con el mismo shader.
  //
  // Y COMPARTIENDO EL REVELADO SALE GRATIS UN GESTO: como el reflejo está dado vuelta, el mismo `uProg`
  // que desenrolla la ventana HACIA ABAJO desenrolla el reflejo HACIA ARRIBA, y las dos mitades se
  // encuentran en la línea de apoyo. No hubo que animar nada para eso.
  const reflejo = new THREE.Mesh(geoCara, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: uCarcasa(true), vertexShader: VERT, fragmentShader: FRAG,
  }))
  reflejo.position.set(0, -ALTO - ALTO * 0.014, Z_CARA)
  reflejo.userData.pagina = { anchoFrac: 1, altoFrac: yBarra }   // misma cara, dada vuelta
  gCara.add(reflejo)

  // ---------------------------------------------------------------- lo que SÍ tiene que florecer
  // En `g` queda sólo la luz: el halo y el filete de acento. Son las dos únicas cosas de este hero que
  // ganan pasando por el bloom — la carcasa y la página lo único que ganarían es reventarse.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO * 1.7, ALTO * 2.6),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uCol: { value: hex(LOOK.acento) }, uF: { value: 0.24 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uCol; uniform float uF; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(uCol, smoothstep(0.5, 0.04, distance(vUv, vec2(0.5))) * uF); }`,
    }))
  halo.position.set(0, -ALTO * 0.18, -GRUESO * 2.8)
  gFlota.add(halo)

  // El filete cae justo en la juntura entre la ventana y su reflejo: es la línea de apoyo, lo que hace
  // que el reflejo se lea como reflejo y no como una segunda ventana borrosa. Mide exactamente el hueco
  // que hay entre las dos mallas, así que el pase post-bloom no lo tapa.
  //
  // La ganancia va en 1.2 y no en el 1.45 de `filete()` del kit por lo que documenta matAcento: el
  // acento2 de ANTHEM (#00e5c0) ya tiene el verde en 0.90, y multiplicarlo por 1.45 lo satura y lo saca
  // blanco. Lo que enciende un color no es la ganancia, es el bloom — y este filete está en `g`
  // justamente para pasar por él.
  const filete = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 1.04, ALTO * 0.014), matAcento(LOOK.acento2, 1.2))
  filete.position.set(0, -ALTO / 2 - ALTO * 0.007, Z_CARA)
  filete.scale.x = 0.0001
  gFlota.add(filete)

  // ------------------------------------------------------------------ tiempo
  // El fondo CEDE mientras la ventana es el sujeto: una grilla en fuga y una página adentro de una
  // ventana son dos tramas finas peleando por el mismo ojo. Vuelve antes del corte porque la escena
  // siguiente cuenta con ella.
  if (ctx.fondo && ctx.fondo.uGrilla) {
    const base = ctx.fondo.uGrilla.value
    tl.to(ctx.fondo.uGrilla, { value: base * 0.30, duration: b(1.1), ease: E.frena(2) }, 0)
    tl.to(ctx.fondo.uGrilla, { value: base, duration: b(0.9), ease: E.vaiven() }, DUR - b(0.9))
  }

  // LLEGA girada y desde el fondo, y recién ahí se desenrolla. El orden importa: si se desenrollara
  // mientras viaja, los dos gestos se tapan y no se lee ninguno.
  gVent.position.set(0, ALTO * 0.16, -5.2)
  gVent.rotation.set(0.28, -0.74, 0.05)
  tl.to(gVent.position, { y: 0, z: 0, duration: b(1.15), ease: E.llega(1.5) }, 0)
  tl.to(gVent.rotation, { x: 0.055, y: -0.30, z: 0, duration: b(1.4), ease: E.llega(1.35) }, 0)
  tl.fromTo(uProg, { value: 0 }, { value: 1.07, duration: b(1.2), ease: E.frena(3) }, b(0.25))

  // FLOTA Y SE DESPLAZA. Cuatro períodos que no son múltiplos entre sí: si lo fueran, los ejes se
  // realinearían cada tanto y la ventana entera latiría como una sola cosa, que se nota más que la
  // quietud. El desplazamiento en x es el paralaje contra la grilla del fondo — sin él, un plano a z=0
  // se lee pegado a la imagen de atrás por más que la cámara se mueva.
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28, f3 = rnd() * 6.28, f4 = rnd() * 6.28
  const flotar = () => {
    const t = tl.time()
    // Arranca en cero y crece: con el vaivén a plena amplitud durante la llegada, la ventana entra
    // temblando en vez de llegar y asentarse.
    const k = Math.min(1, Math.max(0, (t - b(1.15)) / b(1.2)))
    gFlota.position.y = Math.sin(t * 0.67 + f1) * 0.16 * k
    gFlota.position.x = Math.sin(t * 0.31 + f4) * 0.22 * k
    gFlota.rotation.y = Math.sin(t * 0.51 + f2) * 0.15 * k
    gFlota.rotation.z = Math.sin(t * 0.39 + f3) * 0.022 * k
  }
  flotar()

  // EL SCROLL SALTA, NO ES UNA RAMPA — y en una ventana de escritorio esto es todavía más literal que
  // en el teléfono: la rueda del mouse avanza por muescas. Medido sobre el hero de la notebook, un
  // desplazamiento continuo daba 61% de cuadros casi quietos, porque el analizador no distingue una
  // rampa suave de una foto fija; y no la distingue porque el ojo tampoco. Seis saltos son seis
  // EVENTOS, caen cada uno en su beat y se leen como una mano usando el aparato.
  // ACOTADO PARA QUE DOS POSICIONES DE REPOSO COMPARTAN PAGINA. Medido, cada salto movia MAS de una
  // pantalla entera: 2.88, 2.00, 1.75, 1.59, 1.48 y 1.54 ventanas. Entre dos reposos no quedaba UN SOLO
  // PIXEL en comun, asi que la secuencia no se lee como un scroll sino como seis recortes al azar de la
  // pagina — justo lo contrario del gesto que el comentario de abajo declara ("una mano usando el
  // aparato"). Un scroll se reconoce por lo que NO cambia entre dos posiciones.
  //
  // El tope sale de la aritmetica del propio bucle: con el exponente 0.76 el salto mas largo es el
  // PRIMERO y vale recorrido * (1/SALTOS)^0.76 = recorrido * 0.2465. Pidiendo que ese salto no pase del
  // 85% de una ventana queda recorrido <= visible * 0.85 / 0.2465 = visible * 3.44. Con eso el peor
  // salto deja un 15% de pagina compartida y los otros cinco, mas.
  const recorrido = Math.min(Math.max(0, 1 - visible) * 0.62, visible * 3.44)
  const SALTOS = 6
  for (let i = 0; i < SALTOS; i++) {
    // El primero es el más largo: es el que dice "esto se puede scrollear". Los siguientes se acortan,
    // como el gesto de alguien que ya encontró lo que buscaba.
    const desde = arriba - recorrido * (i / SALTOS) ** 0.76
    const hasta = arriba - recorrido * ((i + 1) / SALTOS) ** 0.76
    tl.fromTo(tira.offset, { y: desde },
      { y: hasta, duration: b(0.34), ease: E.frena(4), immediateRender: false }, b(2.2 + i * 0.82))
  }

  // SE PONE DE FRENTE Y VUELVE AL TRES CUARTOS. La notebook gira A PERFIL para mostrar su canto —tiene
  // aluminio que enseñar—; una ventana no tiene nada en el canto, así que el giro que le corresponde es
  // el contrario: cuando la página tiene que LEERSE, la ventana se planta de frente. Cae en el beat 3.4
  // y vuelve en el 5, o sea sobre la grilla, para que se sienta parte del montaje.
  tl.to(gVent.rotation, { y: -0.02, x: 0.012, duration: b(0.55), ease: E.frena(3) }, b(3.4))
  tl.to(gVent.rotation, { y: -0.30, x: 0.055, duration: b(0.75), ease: E.llega(1.25) }, b(5.0))

  // El barrido de vidrio cruza UNA sola vez y empieza cuando la ventana ya frenó: durante la llegada
  // compite con el movimiento y no se lee.
  tl.fromTo(uBarrido, { value: 0.15 },
    { value: 2.05, duration: b(3.0), ease: E.vaiven(2), immediateRender: false }, b(1.6))

  tl.to(filete.scale, { x: 1, duration: b(0.65), ease: E.frena(4) }, b(1.9))

  // EL HALO LATE EN CADA BEAT. Es el metrónomo visual: entre salto y salto de scroll el cuadro se
  // quedaría sin nada que cambie, y un beat entero sin cambios se lee como diapositiva.
  const uHalo = halo.material.uniforms.uF
  for (let i = 2; i < meta.beats - 1; i++) {
    tl.to(uHalo, { value: 0.42, duration: b(0.15), ease: E.frena(3) }, b(i))
    tl.to(uHalo, { value: 0.24, duration: b(0.50), ease: E.vaiven() }, b(i + 0.15))
  }

  // La cámara se acerca mientras la ventana se asienta y vuelve antes del corte: es contrato de escena.
  tl.fromTo(camera.position, { z: dolly(distBase, 1.0) }, { z: dolly(distBase, -0.40), duration: DUR * 0.82, ease: 'none' }, 0)
  tl.to(camera.position, { z: distBase, duration: DUR * 0.18, ease: E.vaiven() }, DUR * 0.82)

  // SALE ENROLLÁNDOSE HACIA SU BARRA mientras se va para arriba: el mismo gesto que la trajo, al revés
  // y acelerando. Cerrar una ventana es un gesto que existe de verdad, y por eso el corte siguiente se
  // siente ganado y no impuesto.
  tl.to(gVent.position, { y: mundoH * 0.72, duration: b(0.85), ease: E.acelera(3) }, DUR - b(0.85))
  tl.to(gVent.rotation, { y: -0.52, z: 0.10, duration: b(0.85), ease: E.acelera(2) }, DUR - b(0.85))
  tl.to(uProg, { value: 0, duration: b(0.60), ease: E.acelera(2) }, DUR - b(0.60))
  tl.to(filete.scale, { x: 0.0001, duration: b(0.50), ease: E.acelera(2) }, DUR - b(0.75))

  // La ventana vive en la OTRA escena, así que no puede ser hija de `gFlota`: se le copia la
  // transformación MUNDIAL. Una sola copia para toda la ventana, porque la carcasa, el canto y el
  // reflejo cuelgan de `gCara` — es la ventaja concreta de no haber partido la ventana en dos escenas.
  const sincronizar = () => {
    g.updateWorldMatrix(true, true)
    gFlota.matrixWorld.decompose(gCara.position, gCara.quaternion, gCara.scale)
  }
  // EL ORDEN IMPORTA Y CUESTA CARO. Colgado de un tween hijo puesto en 0 con duración DUR, GSAP
  // renderiza sus hijos ORDENADOS POR TIEMPO DE INICIO: todo lo que arranca después de 0 —la llegada, el
  // giro, la salida— se renderiza DESPUÉS, o sea que la sincronización leería transformaciones de un
  // cuadro viejo. En el render no se nota, porque se avanza cuadro a cuadro y el error de uno es
  // invisible; se ve recién en un SALTO en frío, que es lo que hace un editor al arrastrar la aguja.
  // El onUpdate de la TIMELINE corre después de todos sus hijos, que es la garantía que hace falta.
  tl.eventCallback('onUpdate', () => { flotar(); sincronizar() })
  sincronizar()

  return { g, gr, tl }
}
