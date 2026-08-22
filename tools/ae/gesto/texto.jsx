// ================================================================================================
// GESTO · FAMILIA T — TEXTO
// ================================================================================================
//
// Las catorce tecnicas de texto del catalogo (`docs/AE-MCP/catalogo/09-PLAN.md`, familia T), escritas
// como funciones que CONSTRUYEN en After Effects y devuelven las capas que crearon.
//
// POR QUE ESTE ARCHIVO EXISTE Y NO ES UN DOCUMENTO MAS.
//
// El catalogo ya estaba escrito, con sus cuadros y sus curvas, y aun asi las piezas salian muertas:
// "1,03 gestos/segundo contra un piso de 1,20". El motivo no es que nadie supiera el numero — es que
// cada gesto habia que volver a deducirlo desde cero, y en la deduccion se pierde el detalle que lo
// hace funcionar. La suavidad del selector viene en 100 y hay que pedir 0; el pivote de un caracter no
// es el centro de su tinta; una tapa no puede revelar dos mitades complementarias. Ninguna de esas
// tres cosas falla ruidosamente: las tres dan un video que se ve *casi* bien.
//
// Asi que aca cada una de esas trampas es un valor por defecto que ya esta bien, un paso que no se
// puede saltear, o un `throw` con el numero adentro. Igual que el nucleo.
//
// LA INFRAESTRUCTURA QUE DESBLOQUEA 11 DE LAS 14: LA PARTICION MEDIDA (`Gt.partir`).
// Una capa por caracter, colocada por `G.avances()` — que devuelve el AVANCE, con el par de kerning ya
// aplicado, y NO la caja de tinta. Midiendo tinta la "r" queda pegada a la "U" y sobra hueco antes de
// la "v": se ve en el video y no lo dice ninguna compuerta.
//
// USO
//   #include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/nucleo.jsx"
//   #include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/texto.jsx"
//   G.iniciar({ nombre: "MI-PIEZA", cuadros: 240 });
//   G.camara({ distancia: 2666.67 });
//   Gt.subidaPorCaracter({ cadena: "Tu marca, en video", fuente: "CenturyGothic", tam: 96,
//                          x: 960, y: 540, colorFondo: [0.07, 0.07, 0.08], desde: 15 });
//   G.cerrar();
//
// LO QUE TODAS LAS FUNCIONES DE ESTE ARCHIVO DAN POR SENTADO, y por que
//
//   · EL FONDO ES UN SOLIDO REAL. La captura omite el fondo de la composicion (LEY 4), asi que una
//     tapa "del color del fondo" sobre nada es una mancha opaca sobre transparencia. Por eso toda
//     funcion con tapa exige `colorFondo` y no lo adivina.
//   · LAS CAPAS SON 3D. En una comp con camara una capa 2D se dibuja SIEMPRE encima de todo el mundo
//     3D (LEY 2), asi que un rotulo plano se come la escena. `plana: true` existe, pero es para
//     rotulos de pantalla completa.
//   · UNA TAPA VA 1 UNIDAD MAS CERCA DE LA CAMARA **Y** INMEDIATAMENTE ARRIBA EN EL APILADO. Los dos
//     criterios apuntan al mismo lado, asi que AE (que ordena por Z) y el motor (que ordena por
//     apilado) coinciden por partida doble. Por eso las tapas se crean DESPUES de lo que tapan: en AE
//     la capa nueva entra en el indice 1.
//   · EL TEXTO ES DE UNA SOLA LINEA (LEY 3). Una capa por linea, siempre. Ninguna funcion de aca parte
//     por saltos de linea: si la cadena trae uno, el resultado es basura silenciosa.
//
// Y UNA QUE SE DESCUBRIO LEYENDO EL MOTOR, no el catalogo, y que no da error:
//   UNA CAPA DE TEXTO **CON ANIMADOR** NUNCA PASA POR EL CODIGO DE MASCARAS (`comp3d.html:842-857`
//   hace `continue` antes de llegar). O sea que animador + mascara en la misma capa = la mascara se
//   ignora en el motor y se aplica en AE: divergencia muda, del peor tipo. `sinAnimador()` lo caza.
//
// ------------------------------------------------------------------------------------------------
// RECURSOS HORNEADOS: NINGUNO. Las catorce salen de texto, solidos y mascaras rectangulares. No hace
// falta que la pieza provea un solo PNG para esta familia — si alguna funcion de aca te pide uno,
// alguien la cambio.
//
// LO QUE ESTAS FUNCIONES SE NIEGAN A HACER, con el reemplazo que construyen en su lugar. Todas tiran
// con el motivo escrito en vez de aproximar, porque una aproximacion silenciosa se descubre mirando
// el video y para entonces ya se decidieron cosas encima:
//
//   · SELECTOR DE EXPRESION (T06 `porAnimador`) — es la unica forma de escalonar por caracter dentro
//     de un animador, y el exportador lo rechaza por nombre. Reemplazo: N capas con el inPoint corrido.
//   · SELECTOR ONDULADO / WIGGLY (T09 `modo:"wiggly"`) — ruido con el PRNG propio de AE, rechazado.
//     Reemplazo: `modo:"flotacion"`, un seno de fase declarada horneado en claves.
//   · ORDEN ALEATORIO DEL SELECTOR (T05 `ordenAleatorio`) — el mismo PRNG. Reemplazo: sortear el
//     orden vos con la semilla en las opciones, sobre capas partidas.
//   · BASE DEL SELECTOR DISTINTA DE "CARACTERES" (T05 `base`) — palabras y lineas nunca se midieron.
//     Reemplazo: partir por palabra y coreografiar con `Gt.escalonado`.
//   · TEXTO DE ORIGEN CON CLAVES (T12 `porTextoAnimado`) — el exportador lo rechaza y el motor arma
//     textura y geometria una sola vez. Reemplazo: flipbook de capas efimeras.
//   · CORTE CON TAPAS (T11 `conTapas`) — las mitades son regiones complementarias y superpuestas, y
//     una tapa oculta todo lo que tiene debajo. Reemplazo: mascaras rectangulares, que si viajan.
//   · MASCARA SOBRE UNA CAPA QUE YA TIENE ANIMADOR — `sinAnimador()`. Reemplazo: una de las dos.
//   · T04 SOBRE LA VARIANTE DE TAPA QUIETA — sin borde que se mueva no hay nada que arrastre.
// ================================================================================================

var Gt = (function () {

  var api = {};

  // ==============================================================================================
  // UTILIDADES PRIVADAS
  // ==============================================================================================

  function def(o, campo, valor) {
    if (o[campo] === undefined || o[campo] === null) { o[campo] = valor; }
    return o[campo];
  }

  function exigir(o, campo, quien, porque) {
    if (o[campo] === undefined || o[campo] === null) {
      throw new Error(quien + " necesita `" + campo + "`. " + porque);
    }
    return o[campo];
  }

  // EL MENSAJE DE UNA TECNICA QUE NO SE PUEDE HACER. Nunca se aproxima en silencio: aprobar algo que
  // da otra cosa es peor que fallar, porque el que lo mira no tiene como saber que esta mirando otra
  // cosa. Siempre lleva el REEMPLAZO, o el mensaje solo acusa.
  function rechazar(quien, que, porque, reemplazo) {
    throw new Error(quien + ": " + que + " NO llega al motor. " + porque + " REEMPLAZO: " + reemplazo);
  }

  var TECHO_GLIFOS = 25;          // el techo practico del catalogo: mas de 25 glifos a la vez satura
  var TECHO_CASCADA = 24;         // cuadros entre el primer arranque y el ultimo

  // GENERADOR CONGRUENCIAL CON SEMILLA — Park-Miller, el minimo estandar.
  //
  // Nada de Math.random: una pieza tiene que salir igual dos veces o la comparacion contra AE no
  // significa nada. Y el multiplicador es 16807 y no uno de los grandes a proposito: 16807 * 2^31 da
  // 3,6e13, comodo por debajo de 2^53, asi que el producto es EXACTO en punto flotante. Con 1103515245
  // el producto pasa de 2^53 y el generador deja de ser el que uno cree que es.
  function azar(semilla) {
    var s = Math.floor(Math.abs(semilla)) % 2147483646;
    if (s === 0) { s = 1; }
    return function () {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  // ---------------------------------------------------------------- el reproductor correcto
  //
  // LEY (c) · `capturar-comp.py` ELIGE EL REPRODUCTOR 2D cuando la comp no tiene camara NI capas 3D, y
  // ese reproductor NO APLICA ANIMADORES DE TEXTO. O sea: un tecleo autorado con animador en una comp
  // plana se ve perfecto en AE y sale sin animar del motor, sin error y sin aviso. Lo dejo escrito la
  // sonda `animador6.jsx` despues de comerselo.
  function hayCamara() {
    var c = G.comp(), i;
    for (i = 1; i <= c.numLayers; i++) {
      if (c.layer(i) instanceof CameraLayer) { return true; }
    }
    return false;
  }

  function exigirReproductor3D(capa, quien) {
    if (capa.threeDLayer) { return true; }
    if (hayCamara()) { return true; }
    throw new Error(quien + ": la capa es PLANA y la composicion no tiene camara. El arnes elige " +
                    "entonces el reproductor 2D, que NO aplica animadores de texto: el gesto se ve " +
                    "en AE y sale quieto del motor, sin error. Sacale `plana`, o llama a G.camara() " +
                    "antes de construir el texto.");
  }

  function sinAnimador(capa, quien) {
    var props = null, anim = null;
    try { props = capa.property("ADBE Text Properties"); } catch (exP) { props = null; }
    if (props === null) { return true; }
    try { anim = props.property("ADBE Text Animators"); } catch (exA) { anim = null; }
    if (anim === null || anim.numProperties === 0) { return true; }
    throw new Error(quien + ": esta capa ya tiene " + anim.numProperties + " animador(es) de texto y " +
                    "se le esta por poner una mascara. El motor descarta las mascaras de toda capa de " +
                    "texto con animador (comp3d.html corta antes de llegar al bloque de mascaras), " +
                    "asi que AE mostraria el recorte y el motor no. Una de las dos cosas, no las dos.");
  }

  // ---------------------------------------------------------------- la caja medida de una capa
  //
  // `sourceRectAtTime` devuelve la CAJA DE TINTA en coordenadas de capa, y en una capa de texto el
  // origen de esas coordenadas es el punto de alineacion sobre la LINEA DE BASE. Asi que `-top` es el
  // ascenso real de esa cadena con esa fuente, medido, y no `0,75 · cuerpo`, que es la constante que
  // uno inventa y que se equivoca justo en las fuentes con caja alta.
  function cajaDe(capa) {
    var r = null;
    try { r = capa.sourceRectAtTime(0, false); } catch (exR) { r = null; }
    if (r === null) { return null; }
    return { arriba: -r.top, abajo: r.top + r.height, izq: r.left, ancho: r.width, alto: r.height };
  }

  // ---------------------------------------------------------------- anclaje
  //
  // LEY (b) · EL ANCLA DESPLAZA EL ORIGEN, NO EL DESTINO. Mover el ancla sin reponer la posicion corre
  // la capa exactamente lo que se movio el ancla, y en un texto partido eso se lee como kerning roto —
  // que es lo ultimo que uno sospecha, porque el kerning es justo lo que la particion medida arregla.
  function anclarEn(capa, px, py, pz, ax, ay) {
    if (capa.threeDLayer) {
      G.anc(capa).setValue([ax, ay, 0]);
      G.pos(capa).setValue([px, py, pz]);
    } else {
      G.anc(capa).setValue([ax, ay]);
      G.pos(capa).setValue([px, py]);
    }
    return capa;
  }

  // ---------------------------------------------------------------- la escala, con la aridad correcta
  //
  // La escala de una capa 3D lleva TRES componentes y la de una 2D lleva DOS. Pasarle `[0,0,0]` a una
  // capa plana no da un aviso: da un error de AE a mitad de la construccion, con la composicion
  // armada por la mitad. Y no se puede deducir del guion, porque `plana` es una opcion.
  function vEsc(capa, v) { return capa.threeDLayer ? [v, v, v] : [v, v]; }

  // ---------------------------------------------------------------- el rotulo, con dos controles mas
  //
  // (1) `x` e `y` OBLIGATORIAS Y NUMERICAS. Con `undefined` la que explota es la llamada a AE, y el
  //     error que vuelve habla de otra cosa: uno termina buscando el defecto en la fuente.
  // (2) LEY 3 · INTERLETRA + CENTRADO ES UNA DIVERGENCIA CONOCIDA Y MUDA. El motor arma la linea con
  //     el `letterSpacing` de canvas, que agrega espacio DESPUES del ultimo caracter; AE no lo hace.
  //     Con la linea centrada eso corre el texto media interletra respecto de AE —`tam*interletra/2000`
  //     px— y no lo dice ninguna compuerta, porque cada uno por su lado esta bien.
  //     La cura del catalogo: con interletra distinta de cero, alinear a la izquierda.
  function rot(o2, quien) {
    if (!o2.cadena) { throw new Error(quien + ": falta `cadena`."); }
    if (!o2.fuente) {
      throw new Error(quien + ": falta `fuente`. AE sustituye la familia en SILENCIO —pedir una que " +
                      "no esta no da error, dibuja con otra— asi que la familia nunca se omite.");
    }
    if (typeof o2.x !== "number" || typeof o2.y !== "number") {
      throw new Error(quien + ": `x` e `y` tienen que ser numeros y llegaron como " + (typeof o2.x) +
                      " / " + (typeof o2.y) + ". La `y` es la LINEA DE BASE, no el centro optico.");
    }
    if (o2.interletra && o2.centrado !== false) {
      G.avisar(quien + ": interletra " + o2.interletra + " con la linea CENTRADA. El motor mide el " +
               "ancho con el letterSpacing de canvas, que suma espacio despues del ultimo caracter, y " +
               "AE no: la linea queda corrida " +
               (Math.round(o2.tam * o2.interletra / 2000 * 10) / 10) + " px respecto de AE (LEY 3). " +
               "Con interletra distinta de cero se alinea a la izquierda (`centrado: false`).");
    }
    return G.rotulo(o2);
  }

  // ---------------------------------------------------------------- la tapa
  function tapa(o, nombre, x, y, w, h, z) {
    exigir(o, "colorFondo", "una tapa",
           "La captura omite el fondo de la composicion (LEY 4): una tapa sobre nada es una mancha " +
           "opaca sobre transparencia. Tiene que ser el color EXACTO del solido de fondo, y ese fondo " +
           "tiene que ser plano donde pasa la tapa.");
    var s = G.solido(nombre, o.colorFondo, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)),
                     x, y, z);
    return s;
  }

  // ==============================================================================================
  // T-INFRA · LA PARTICION MEDIDA
  // ==============================================================================================
  //
  // Una capa por caracter, colocada con el avance real de la fuente. Es lo que desbloquea T02, T06,
  // T07, T08, T09, T10, T12 y la mitad de T01.
  //
  // DOS COSAS QUE NO SE DEDUCEN Y HAY QUE SABER:
  //
  // (1) `G.avances` mide con interletra CERO. La interletra de AE se suma DESPUES de cada caracter, en
  //     milesimas de cuerpo, asi que aca se agrega a mano: `tam · interletra / 1000` por hueco.
  //
  // (2) EL ANCHO DE TINTA NO INCLUYE EL HUECO QUE SIGUE AL ULTIMO CARACTER. Son N avances pero N-1
  //     huecos visibles. Centrar con la suma de los N avances corre la linea media interletra a la
  //     izquierda — que es exactamente el defecto que la LEY 3 describe en el motor ("el letterSpacing
  //     del canvas agrega espacio despues del ultimo caracter, cosa que AE no hace"), y que aca no
  //     puede pasar porque cada caracter se coloca a mano.
  function medidaDe(o, quien) {
    exigir(o, "cadena", quien, "sin cadena no hay nada que medir.");
    exigir(o, "fuente", quien, "la familia se comprueba contra la sustituta: AE sustituye en silencio.");
    def(o, "tam", 72);
    def(o, "interletra", 0);
    var m = G.avances(o.cadena, o.tam, o.fuente);
    var extra = o.tam * o.interletra / 1000;
    var av = [], i, suma = 0;
    for (i = 0; i < m.anchos.length; i++) {
      av[i] = m.anchos[i] + extra;
      suma += av[i];
    }
    return { avances: av, ancho: suma - extra, extra: extra };
  }
  api.medidaDe = medidaDe;

  // Gt.partir({ cadena, fuente, tam, color, x, y, z, interletra, centrado, plana, nombre })
  //   -> { capas: [capa|null], avances: [], izq: [], ancho, x0, cadena }
  // Los espacios NO gastan capa: una capa de texto con un espacio no tiene tinta, y el motor no le
  // puede calcular la caja. Quedan como `null` en el arreglo para que el indice siga siendo el indice
  // del caracter — el escalonado tiene que contarlos aunque no se vean.
  api.partir = function (o) {
    var quien = "Gt.partir";
    def(o, "centrado", true);
    def(o, "z", 0);
    def(o, "color", [1, 1, 1]);
    def(o, "nombre", "T");
    def(o, "techoGlifos", TECHO_GLIFOS);
    exigir(o, "x", quien, "sin x no hay donde poner la linea.");
    exigir(o, "y", quien, "la y es la LINEA DE BASE, no el centro optico del texto.");

    var med = medidaDe(o, quien);
    var n = o.cadena.length;
    if (n > o.techoGlifos) {
      throw new Error(quien + ": " + n + " glifos, y el techo practico es " + o.techoGlifos + ". " +
                      "Por encima de eso la particion por caracter satura (y cuesta una capa por " +
                      "letra). Parti por PALABRA o por LINEA: la regla es partir por la unidad mas " +
                      "grande que produzca el gesto.");
    }

    var x0 = o.centrado === false ? o.x : o.x - med.ancho / 2;
    var capas = [], izq = [], vivas = [], acum = 0, i, ch;
    var zs = [];
    for (i = 0; i < n; i++) {
      izq[i] = x0 + acum;
      acum += med.avances[i];
      ch = o.cadena.charAt(i);
      if (ch === " ") { capas[i] = null; continue; }
      // CADA LETRA VA 2 UNIDADES MAS ATRAS QUE LA ANTERIOR, y no es un capricho.
      //
      // Las letras de una palabra son coplanares, y sus cajas de tinta SE ROZAN por el kerning. El motor
      // web ordena por distancia a la camara: con profundidades exactamente iguales, el desempate lo
      // decide cada uno por su cuenta y no hay ninguna garantia de que AE y el motor lo resuelvan igual.
      // Sobre dos letras superpuestas 2 px eso no se ve nunca... hasta que se ve, en un cuadro, y no hay
      // nada que señalar.
      //
      // 2 unidades es el mismo valor que usa la pila de naipes de C13: rompe el empate (el umbral es 1)
      // y no se ve. Sobre una palabra de cinco letras a 2400 de la camara, la ultima queda un 0,33% mas
      // chica que la primera. Y solo aplica a las capas 3D: una palabra plana compone por orden de capa,
      // igual que en AE, y ahi no hay nada ambiguo que romper.
      var zLetra = o.plana ? o.z : o.z + i * 2;
      zs[i] = zLetra;
      capas[i] = rot({
        cadena: ch, tam: o.tam, color: o.color, fuente: o.fuente,
        x: izq[i], y: o.y, z: zLetra, centrado: false, plana: o.plana,
        nombre: o.nombre + "-" + (i + 1)
      }, quien);
      vivas[vivas.length] = capas[i];
    }
    return { capas: capas, vivas: vivas, avances: med.avances, izq: izq, zs: zs,
             ancho: med.ancho, x0: x0, cadena: o.cadena };
  };

  // ==============================================================================================
  // T01 · ESCALONADO TIPOGRAFICO — el motor de todos los demas
  // ==============================================================================================
  //
  // EL RETARDO ES FRACCIONARIO Y LAS CLAVES CAEN EN CUADRO ENTERO. Las dos cosas son ciertas y la
  // unica forma de que convivan es REDONDEAR EL ACUMULADO, nunca el paso. Con 1,5 por caracter,
  // redondear el paso da 1 (cascada 33% mas corta) o 2 (33% mas larga); redondear el acumulado da
  // 0,2,3,5,6,8,9 — que promedia 1,5 exacto y es lo que el catalogo pide.
  //
  // Y CON MAS DE 15 UNIDADES EL RETARDO DECAE. Un retardo constante sobre una frase larga hace eterna
  // la cascada: el plan lo escribe como "2,2,2,1,1,1". Aca decae linealmente hasta la mitad.
  api.arranques = function (n, desde, retardo) {
    var out = [], acum = 0, i, paso;
    for (i = 0; i < n; i++) {
      out[i] = Math.round(desde + acum);
      paso = retardo;
      if (n > 15 && n > 1) { paso = retardo * (1 - 0.5 * (i / (n - 1))); }
      acum += paso;
    }
    return out;
  };

  // EL TECHO DE LA CASCADA se mide aca como SPAN DE ARRANQUES (del primero al ultimo), no como
  // span mas duracion. Y lo digo porque el plan da las dos lecturas: "Techo: la cascada entera <= 24"
  // junto a "Total de 8 letras: 22" (que son 10,5 de span mas 12 de gesto).
  // Con la lectura estricta, una linea de 12 caracteres al retardo que el propio plan recomienda
  // (1,5) daria 28,5 y quedaria prohibida — o sea el caso mas comun del genero. Una compuerta que
  // reprueba lo normal se aprende a ignorar. Con el span, 12 caracteres dan 16,5 y pasan; 25 dan 28 y
  // no, que es una cascada genuinamente demasiado lenta.
  function revisarCascada(arr, techo, quien, retardo) {
    if (arr.length < 2 || techo <= 0) { return; }
    var span = arr[arr.length - 1] - arr[0];
    if (span > techo) {
      var sug = Math.round(techo / (arr.length - 1) * 100) / 100;
      throw new Error(quien + ": la cascada abarca " + span + " cuadros y el techo es " + techo +
                      ". Con " + arr.length + " unidades y retardo " + retardo + " el ojo deja de " +
                      "leer una ola y empieza a contar. Bajá el retardo a " + sug + " o menos, o " +
                      "parti por palabra en vez de por caracter.");
    }
  }

  // Gt.escalonado({ capas, desde, retardo, gesto, techo, entrada })
  //   `gesto` es function(capa, cuadro, indice, total) y construye las claves de ESA unidad.
  //   `entrada` (por defecto true) corre ademas el inPoint de cada capa a su arranque.
  //
  // CUANDO `entrada` TIENE QUE IR EN FALSE, y esto no es un detalle de implementacion: "el gesto
  // empieza en cero" solo funciona si el objeto YA ESTA VIVO Y VISIBLE antes de moverse. Si la capa
  // entra justo en el cuadro en que arranca el gesto, se lee como que aparecio de la nada, y el gesto
  // —que era el evento— se pierde adentro de la aparicion.
  api.escalonado = function (o) {
    var quien = "Gt.escalonado (T01)";
    exigir(o, "capas", quien, "el escalonado no construye capas: las coreografia.");
    def(o, "desde", 0);
    def(o, "retardo", 1.5);
    def(o, "techo", TECHO_CASCADA);
    def(o, "entrada", true);
    def(o, "hasta", G.cuadros());

    var n = o.capas.length;
    var arr = api.arranques(n, o.desde, o.retardo);
    revisarCascada(arr, o.techo, quien, o.retardo);

    var i;
    for (i = 0; i < n; i++) {
      if (o.capas[i] === null || o.capas[i] === undefined) { continue; }
      if (o.entrada) { G.plano(o.capas[i], arr[i], o.hasta); }
      if (o.gesto) { o.gesto(o.capas[i], arr[i], i, n); }
    }
    G.anotar("T01|escalonado|" + n + " unidades|retardo " + o.retardo + "|span " +
             (arr[n - 1] - arr[0]) + " cuadros");
    return { capas: o.capas, arranques: arr };
  };

  // ==============================================================================================
  // T02 · SUBIDA POR CARACTER TRAS TAPA — el gesto insignia
  // ==============================================================================================
  //
  // Cada letra emerge de detras de una linea invisible, en cascada. UNA sola tapa para toda la linea:
  // N capas, una tapa. Es barato y es el gesto que aparece en 8 de 8 referencias del genero.
  //
  // EL DESPLAZAMIENTO NO SE ELIGE, SE MIDE. La letra tiene que arrancar ENTERA por debajo del borde de
  // la tapa, y "la altura del cuerpo" no alcanza en todas las fuentes: el ascenso real de una caja
  // alta puede pasar el cuerpo. Se mide con `sourceRectAtTime` de la letra mas alta y se exige. Elegir
  // 40 px "porque parece" deja asomando la punta de la "T" en el primer cuadro, que se ve como
  // suciedad y nadie sabe de donde salio.
  //
  // Y LA HOLGURA EXISTE POR LOS DESCENDENTES. Con el borde de la tapa exactamente en la linea de base,
  // la cola de la "y" y de la "p" queda cortada para siempre — no durante el gesto: SIEMPRE. La tapa
  // baja `holgura` px por debajo de la base y las letras arrancan por debajo de eso.
  api.subidaPorCaracter = function (o) {
    var quien = "Gt.subidaPorCaracter (T02)";
    def(o, "desde", 0);
    def(o, "duracion", 12);
    def(o, "retardo", 1.5);
    def(o, "curva", "C1");
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "techo", TECHO_CASCADA);
    def(o, "hasta", G.cuadros());
    def(o, "holgura", Math.round(o.tam * 0.28));
    exigir(o, "colorFondo", quien, "sin el color exacto del solido de fondo la tapa se ve (LEY 4).");

    var p = api.partir(o);
    var i, c, caja, ascenso = 0;
    for (i = 0; i < p.vivas.length; i++) {
      caja = cajaDe(p.vivas[i]);
      if (caja !== null && caja.arriba > ascenso) { ascenso = caja.arriba; }
    }
    var minimo = Math.ceil(ascenso + o.holgura);
    if (o.desplazamiento === undefined || o.desplazamiento === null) {
      o.desplazamiento = minimo;
    } else if (o.desplazamiento < minimo) {
      throw new Error(quien + ": desplazamiento " + o.desplazamiento + " px y hacen falta " + minimo +
                      ". El ascenso MEDIDO de la letra mas alta es " + Math.round(ascenso) +
                      " px y la tapa arranca " + o.holgura + " px por debajo de la base, asi que con " +
                      "menos que eso la punta de la letra asoma en el primer cuadro. No es un margen " +
                      "de seguridad: es geometria.");
    }

    var arr = api.arranques(o.cadena.length, o.desde, o.retardo);
    revisarCascada(arr, o.techo, quien, o.retardo);

    for (i = 0; i < p.capas.length; i++) {
      c = p.capas[i];
      if (c === null) { continue; }
      // las letras viven desde el principio: estan escondidas detras de la tapa, no ausentes
      G.plano(c, Math.min(o.desde, arr[0]), o.hasta);
      var ej = G.ejes(c);
      G.claves(ej.y, [[arr[i], o.y + o.desplazamiento, o.curva],
                      [arr[i] + o.duracion, o.y]], quien + " letra " + (i + 1));
    }

    // LA TAPA VA ULTIMA: en AE la capa nueva entra en el indice 1, o sea arriba. Y a z-1, un paso mas
    // cerca de la camara. Los dos criterios juntos hacen que AE (que ordena por Z) y el motor (que
    // ordena por apilado) dibujen lo mismo sin que haya que confiar en ninguno de los dos.
    var t = tapa(o, (o.nombre || "T") + "-tapa",
                 o.x, o.y + o.holgura + G.alto() / 2,
                 def(o, "anchoTapa", G.ancho() * 2), G.alto(), o.z - 1);
    G.plano(t, 0, o.hasta);

    G.anotar("T02|subida|" + o.cadena.length + " glifos|desplazamiento " + o.desplazamiento +
             " px (ascenso medido " + Math.round(ascenso) + ")|span " + (arr[arr.length - 1] - arr[0]));
    return { capas: p.capas, tapa: t, arranques: arr, particion: p };
  };

  // ==============================================================================================
  // T03 · REVELADO DE LINEA TRAS TAPA
  // ==============================================================================================
  //
  // Lo mismo que T02 pero la unidad es la LINEA ENTERA: una capa de texto, una tapa. Dos variantes.
  //
  //   "subida"  — la tapa esta quieta debajo de la base y el texto sube desde abajo.
  //   "barrido" — la tapa cubre la linea y se corre en X hasta salir.
  //
  // EL ANCHO DE LA TAPA DEL BARRIDO NO ES DECORATIVO: tiene que valer al menos 2x el recorrido. Con
  // una tapa del ancho justo, al empezar a correrse su borde de atras entra en cuadro y destapa el
  // texto por el otro lado — o sea que el revelado sale por los dos extremos a la vez.
  api.revelarLinea = function (o) {
    var quien = "Gt.revelarLinea (T03)";
    def(o, "modo", "subida");
    def(o, "desde", 0);
    def(o, "duracion", 14);
    def(o, "curva", "C1");
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "hasta", G.cuadros());
    def(o, "centrado", true);
    def(o, "sentido", 1);
    def(o, "holgura", Math.round(o.tam * 0.28));
    exigir(o, "colorFondo", quien, "sin el color exacto del solido de fondo la tapa se ve (LEY 4).");
    exigir(o, "x", quien, "sin x no hay donde poner la linea.");
    exigir(o, "y", quien, "la y es la LINEA DE BASE.");

    var capa = rot({ cadena: o.cadena, tam: o.tam, color: def(o, "color", [1, 1, 1]),
                     fuente: o.fuente, x: o.x, y: o.y, z: o.z,
                     centrado: o.centrado, plana: o.plana, interletra: o.interletra,
                     nombre: def(o, "nombre", "T03") }, quien);
    var caja = cajaDe(capa);
    if (caja === null) {
      throw new Error(quien + ": no se pudo medir la caja del texto, y las dos variantes necesitan " +
                      "la medida para dimensionar la tapa. Revisa la cadena y la familia.");
    }
    G.plano(capa, 0, o.hasta);

    var t = null;
    if (o.modo === "subida") {
      var minimo = Math.ceil(caja.arriba + o.holgura);
      if (o.desplazamiento === undefined) { o.desplazamiento = minimo; }
      if (o.desplazamiento < minimo) {
        throw new Error(quien + ": desplazamiento " + o.desplazamiento + " y hacen falta " + minimo +
                        " (ascenso medido " + Math.round(caja.arriba) + " + holgura " + o.holgura +
                        "). Con menos, la linea asoma por encima de la tapa antes de arrancar.");
      }
      var ej = G.ejes(capa);
      G.claves(ej.y, [[o.desde, o.y + o.desplazamiento, o.curva],
                      [o.desde + o.duracion, o.y]], quien);
      t = tapa(o, o.nombre + "-tapa", o.x, o.y + o.holgura + G.alto() / 2,
               def(o, "anchoTapa", G.ancho() * 2), G.alto(), o.z - 1);
      G.plano(t, 0, o.hasta);

    } else if (o.modo === "barrido") {
      // EL BORDE IZQUIERDO DE LA TINTA ES `o.x + caja.izq`, CENTRADA O NO. `sourceRectAtTime` devuelve
      // el rectangulo en coordenadas de CAPA, y en una capa de texto el origen de esas coordenadas es
      // el punto de alineacion: en una linea centrada `caja.izq` YA vale mas o menos -ancho/2. Restarle
      // otra media caja "porque esta centrada" corre la tapa un ancho de texto entero hacia la
      // izquierda, y el barrido arranca fuera de cuadro.
      var izqTexto = o.x + caja.izq;
      var recorrido = caja.ancho + o.tam * 0.5;
      var W = def(o, "anchoTapa", Math.ceil(recorrido * 2.2));
      if (W < recorrido * 2) {
        throw new Error(quien + ": la tapa mide " + W + " px y el recorrido es " +
                        Math.round(recorrido) + ". Con menos de 2x, al correrse la tapa su borde de " +
                        "atras entra en cuadro y el texto se destapa por los DOS extremos a la vez.");
      }
      var H = Math.ceil(caja.alto + o.tam * 0.8);
      var yTapa = o.y + (caja.abajo - caja.arriba) / 2;
      var desdeX = izqTexto - o.tam * 0.25 + W / 2;
      var hastaX = desdeX + recorrido * o.sentido;
      if (o.sentido < 0) { desdeX = izqTexto + caja.ancho + o.tam * 0.25 - W / 2; hastaX = desdeX - recorrido; }
      t = tapa(o, o.nombre + "-tapa", desdeX, yTapa, W, H, o.z - 1);
      G.plano(t, 0, o.hasta);
      var ejT = G.ejes(t);
      G.claves(ejT.x, [[o.desde, desdeX, o.curva], [o.desde + o.duracion, hastaX]], quien + " tapa");

    } else {
      throw new Error(quien + ": modo '" + o.modo + "' desconocido. Validos: 'subida', 'barrido'.");
    }

    G.anotar("T03|revelarLinea|" + o.modo + "|" + o.duracion + " cuadros");
    return { capa: capa, tapa: t, caja: caja };
  };

  // ==============================================================================================
  // T04 · REVELADO CON TAPA RETRASADA — la version cara de T03
  // ==============================================================================================
  //
  // El texto parece ARRASTRADO por el borde de la tapa en vez de esperar quieto debajo. Es el gesto de
  // entrada de texto con mejor relacion calidad/costo del catalogo: se ve vivo y no viola la
  // prohibicion de sobrepaso en tipografia.
  //
  // EL TEXTO VA 2 CUADROS DESPUES QUE LA TAPA, NUNCA AL REVES. Si el texto arranca primero, se ve
  // moverse por debajo de la tapa antes de que nada lo destape y el efecto se lee como un error de
  // sincronizacion. El orden es la mitad del gesto.
  //
  // Y EL TEXTO SE MUEVE EN EL MISMO SENTIDO QUE LA TAPA. El plan lo escribe como "+18 px -> 0", que es
  // relativo al sentido del barrido: arranca 18 px ATRAS del borde que lo destapa y lo alcanza. Al
  // reves —arrancar adelante y retroceder— se lee como que el texto lo estan empujando hacia afuera.
  api.tapaRetrasada = function (o) {
    var quien = "Gt.tapaRetrasada (T04)";
    def(o, "modo", "barrido");
    if (o.modo !== "barrido") {
      throw new Error(quien + ": T04 solo existe sobre el barrido de T03. Con la tapa QUIETA (modo " +
                      "'subida') no hay borde que arrastre nada, y el desplazamiento del texto se " +
                      "queda sin causa visible. Si querias la subida, es T03 o T02.");
    }
    def(o, "arrastre", 18);
    def(o, "retraso", 2);
    def(o, "duracion", 12);
    def(o, "curva", "C1");
    def(o, "sentido", 1);
    def(o, "desde", 0);

    var r = api.revelarLinea(o);
    var ej = G.ejes(r.capa);
    var x0 = o.x - o.arrastre * o.sentido;
    G.claves(ej.x, [[o.desde + o.retraso, x0, o.curva],
                    [o.desde + o.retraso + o.duracion, o.x]], quien + " texto");

    G.anotar("T04|tapaRetrasada|arrastre " + o.arrastre + " px|texto +" + o.retraso + " cuadros");
    return { capa: r.capa, tapa: r.tapa, caja: r.caja };
  };

  // ==============================================================================================
  // T05 · MAQUINA DE ESCRIBIR — con animador nativo
  // ==============================================================================================
  //
  // POR QUE ANIMADOR Y NO UNA CAPA POR LETRA. El plan escribia T05 como "una capa por caracter,
  // inPoint = i*2" porque cuando se escribio, el exportador rechazaba los animadores enteros. Ya no:
  // el selector de rango esta medido contra AE en 88 configuraciones y viaja. Una capa contra quince.
  //
  // SE ANIMA EL **INICIO** DEL RANGO, NO EL FINAL. El animador pone la opacidad en 0 sobre lo
  // SELECCIONADO. Si se anima el final de 0 a N, lo que crece es la zona INVISIBLE: el texto se borra
  // en vez de escribirse. Arrancando con todo seleccionado (todo invisible) y corriendo el INICIO
  // hacia la derecha, cada letra va quedando fuera del rango y aparece. Es el mismo gesto leido al
  // reves y es la diferencia entre escribir y borrar.
  //
  // SUAVIDAD 0, Y NO ES LO QUE SALE DE FABRICA. `ADBE Text Selector Smoothness` viene en 100, que es la
  // identidad: cada letra se cubre a lo largo de un paso entero de rango. Eso es una CORTINA, no un
  // tecleo. Con 0 el factor es un escalon exacto en media cobertura — medido: cobertura 0,50 da 0,50
  // con suavidad 100 y da 0 con suavidad 0.
  //
  // LAS DOS TRAMPAS DE LAS UNIDADES, medidas y documentadas en `reference/animador-de-texto.md`:
  //   (1) los dos juegos de propiedades son EXCLUYENTES. Con unidades en indice, las de porcentaje
  //       quedan ocultas y `setValue` muere con "la propiedad esta oculta".
  //   (2) CAMBIAR LAS UNIDADES INVALIDA TODA REFERENCIA QUE YA TENIAS EN LA MANO. AE rehace el grupo y
  //       la referencia guardada muere con "El objeto no es valido", treinta lineas mas abajo del
  //       cambio que lo causo. Por eso aca NADA se cachea: cada linea vuelve a buscar por matchName.
  //
  // EL CURSOR NO PARPADEA MIENTRAS SE ESCRIBE. Ese detalle es la mitad de la credibilidad, y es una
  // sola linea de logica: fijo en 100 durante el tecleo, alternando antes y despues.
  function avDe(an, s) {
    return an.property("ADBE Text Selectors").property(s).property("ADBE Text Range Advanced");
  }
  function selDe(an, s) { return an.property("ADBE Text Selectors").property(s); }

  api.maquinaDeEscribir = function (o) {
    var quien = "Gt.maquinaDeEscribir (T05)";
    def(o, "desde", 0);
    def(o, "porCaracter", 2);
    def(o, "suavidad", 0);
    def(o, "cursor", true);
    def(o, "parpadeo", 15);
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "centrado", true);
    def(o, "hasta", G.cuadros());
    def(o, "color", [1, 1, 1]);
    def(o, "nombre", "T05");
    if (o.ordenAleatorio) {
      rechazar(quien, "el orden aleatorio del selector",
               "es el PRNG propio de AE y no se reprodujo: el exportador lo rechaza por nombre.",
               "sortea vos el orden con `Gt.partir` y una capa por caracter, con la semilla en las " +
               "opciones — asi el orden viaja como dato y no como algoritmo.");
    }
    if (o.base !== undefined && o.base !== 1) {
      rechazar(quien, "una base de selector distinta de 'caracteres'",
               "palabras y lineas nunca se midieron contra AE, y el exportador las rechaza.",
               "parti por palabra con `Gt.partir` y coreografia con `Gt.escalonado`.");
    }
    if (o.suavidad > 0) {
      G.avisar("T05: suavidad " + o.suavidad + ". Medido: con cobertura 0,50 el factor da 0,50 a " +
               "suavidad 100 y 0 a suavidad 0. Por encima de 0 cada letra se DESVANECE a lo largo de " +
               "un paso de rango, o sea una cortina; el corte seco ES el gesto del tecleo.");
    }

    var capa = rot({ cadena: o.cadena, tam: o.tam, color: o.color, fuente: o.fuente,
                     x: o.x, y: o.y, z: o.z, centrado: o.centrado, plana: o.plana,
                     interletra: o.interletra, nombre: o.nombre }, quien);
    exigirReproductor3D(capa, quien);
    var caja = cajaDe(capa);
    G.plano(capa, Math.min(0, o.desde), o.hasta);

    var n = o.cadena.length;
    var an = capa.property("ADBE Text Properties")
                 .property("ADBE Text Animators").addProperty("ADBE Text Animator");
    an.name = "tecleo";
    an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    an.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);

    // las unidades PRIMERO, y todo lo demas se vuelve a buscar despues (trampa 2)
    avDe(an, 1).property("ADBE Text Range Units").setValue(2);      // 2 = indice
    avDe(an, 1).property("ADBE Text Range Shape").setValue(1);      // 1 = cuadrada
    avDe(an, 1).property("ADBE Text Selector Smoothness").setValue(o.suavidad);
    selDe(an, 1).property("ADBE Text Index End").setValue(n);

    var fin = o.desde + n * o.porCaracter;
    G.claves(selDe(an, 1).property("ADBE Text Index Start"),
             [[o.desde, 0], [fin, n]], quien + " inicio del rango");

    // EN QUE CUADRO APARECE CADA LETRA, y no es una estimacion: la cuadrada es COBERTURA DE CELDA y
    // con suavidad 0 el escalon cae en media cobertura, o sea cuando el inicio del rango pasa k+0,5.
    // El cursor tiene que saltar en ESE cuadro y no uno antes ni uno despues, o se ve adelantado.
    var arr = [], k;
    for (k = 0; k < n; k++) { arr[k] = Math.ceil(o.desde + (k + 0.5) * o.porCaracter); }

    var cursor = null;
    if (o.cursor) {
      var med = medidaDe(o, quien);
      var x0 = o.centrado === false ? o.x : o.x - med.ancho / 2;
      var alto = Math.max(4, Math.ceil(caja === null ? o.tam : caja.arriba + caja.abajo));
      var yc = o.y + (caja === null ? -o.tam * 0.36 : (caja.abajo - caja.arriba) / 2);
      var ancho = def(o, "anchoCursor", Math.max(2, Math.round(o.tam * 0.07)));
      var entraC = Math.round(def(o, "cursorDesde", o.desde));
      var hastaC = Math.round(def(o, "cursorHasta", o.hasta));
      cursor = G.solido(o.nombre + "-cursor", def(o, "colorCursor", o.color),
                        ancho, alto, x0, yc, o.z);
      G.plano(cursor, entraC, hastaC);

      var pos = [], acum = 0, i2;
      pos[pos.length] = [entraC, x0, "HOLD"];
      for (i2 = 0; i2 < n; i2++) {
        acum += med.avances[i2];
        if (arr[i2] > pos[pos.length - 1][0]) { pos[pos.length] = [arr[i2], x0 + acum, "HOLD"]; }
      }
      G.claves(G.ejes(cursor).x, pos, quien + " cursor");

      var op = [], cu, j = 0;
      for (cu = entraC; cu < o.desde; cu += o.parpadeo) {
        op[op.length] = [cu, (j % 2 === 0) ? 100 : 0, "HOLD"];
        j++;
      }
      if (op.length === 0 || op[op.length - 1][0] < o.desde) {
        op[op.length] = [o.desde, 100, "HOLD"];      // mientras escribe NO parpadea
      }
      j = 0;
      for (cu = arr[n - 1]; cu <= hastaC; cu += o.parpadeo) {
        if (cu > op[op.length - 1][0]) { op[op.length] = [cu, (j % 2 === 0) ? 100 : 0, "HOLD"]; }
        j++;
      }
      G.claves(G.op(cursor), op, quien + " parpadeo");
    }

    G.anotar("T05|tecleo|" + n + " glifos|" + o.porCaracter + " cuadros por caracter|suavidad " +
             o.suavidad + "|fin " + arr[n - 1]);
    return { capa: capa, animador: an, cursor: cursor, arranques: arr, fin: arr[n - 1] };
  };

  // ==============================================================================================
  // T06 · GOLPE CON SOBREPASO POR CARACTER
  // ==============================================================================================
  //
  // POR QUE UNA CAPA POR CARACTER Y NO UN ANIMADOR. En AE esto se escribe con un SELECTOR DE EXPRESION
  // (`selectorValue * textIndex/textTotal` y variantes), que es la unica forma de que cada caracter
  // tenga su propio retardo dentro de un solo animador. **El selector de expresion no viaja**: el
  // exportador lo rechaza por nombre, porque es una familia entera de lenguaje que habria que
  // reimplementar en el navegador. El selector de RANGO si viaja, pero un rango no puede darle a cada
  // caracter una curva propia con sobrepaso: da un barrido, que es otro gesto (ese es T09).
  // Asi que aca son N capas con el inPoint corrido, y hay que decirlo en vez de dejarlo implicito.
  //
  // EL SOBREPASO SALE DE `G.conRebote`, NO DE UNA TERCERA CLAVE. Una tercera clave (0 -> 112 -> 100) da
  // un sobrepaso FIJO; el rebote inercial lee la velocidad de llegada, asi que sale proporcional
  // gratis y no hay que calibrar cada letra. Y `conRebote` se NIEGA a construir si el gesto es tan
  // lento que el sobrepaso no se ve, que es la falla que no tiene sintoma.
  //
  // LOS NUMEROS, para que el que los cambie sepa que esta cambiando:
  //   escala 0 -> 100 en 6 cuadros = 500 unidades/segundo.
  //   sobrepaso = v * amp * exp(-decay / (4*freq)) = 500 * 0,048 * 0,4995 = 12,0 unidades de escala.
  // O sea que se pasa hasta 112 y vuelve, que es exactamente lo que pide el catalogo — pero calculado
  // en vez de dibujado, asi que una letra con otra duracion sigue saliendo bien.
  //
  // EL PIVOTE. Por defecto va en (centro del avance, -0,35 * cuerpo): centro optico de la LINEA, igual
  // para todas las letras. Con `pivote: "avance"` va en la linea de base, que es el pivote exacto del
  // animador de AE (medido: escala 200% sobre una "H" da px = 35,499 sobre un avance de 70,996, y py =
  // 0 incluso en una "y" con descendente). Lo que NO conviene es el centro de la TINTA de cada letra:
  // una "o" y una "y" tienen centros de tinta a distinta altura y el golpe sale desparejo.
  api.golpePorCaracter = function (o) {
    var quien = "Gt.golpePorCaracter (T06)";
    def(o, "desde", 0);
    def(o, "duracion", 6);
    def(o, "retardo", 1);
    def(o, "curva", "LINEAL");
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "pivote", "linea");
    def(o, "amp", 0.048);
    def(o, "freq", 1.8);
    def(o, "decay", 5);
    def(o, "piso", 6);
    def(o, "techo", TECHO_CASCADA);
    def(o, "hasta", G.cuadros());
    if (o.porAnimador) {
      rechazar(quien, "el selector de expresion",
               "es la unica forma de escalonar por caracter dentro de un animador, y el exportador " +
               "lo rechaza por nombre: es una familia de lenguaje entera.",
               "esto mismo, que es N capas con el inPoint corrido i*retardo (lo que ya hace la funcion).");
    }
    if (o.cadena && o.cadena.length > 12) {
      G.avisar("T06 sobre " + o.cadena.length + " glifos. El golpe con sobrepaso no va en texto de " +
               "LECTURA: una palabra suelta y grande. En una frase, cada letra pide atencion por su " +
               "cuenta y no se lee ninguna.");
    }

    var p = api.partir(o);
    var arr = api.arranques(o.cadena.length, o.desde, o.retardo);
    revisarCascada(arr, o.techo, quien, o.retardo);

    var i, c, ax, ay;
    for (i = 0; i < p.capas.length; i++) {
      c = p.capas[i];
      if (c === null) { continue; }
      ax = p.avances[i] / 2;
      ay = o.pivote === "avance" ? 0 : -0.35 * o.tam;
      // `p.zs[i]` Y NO `o.z`: `partir` separa las letras 2 unidades en profundidad para que el
      // orden de dibujo no sea ambiguo, y reanclar con la Z del bloque las volvia a empatar a
      // todas. El arreglo estaba puesto y esta linea lo pisaba en silencio.
      anclarEn(c, p.izq[i] + ax, o.y + ay, p.zs[i], ax, ay);
      // el gesto ES la aparicion: aca el inPoint en el cuadro del golpe es lo correcto, no un atajo
      G.plano(c, arr[i], o.hasta);
      G.conRebote(G.esc(c), [[arr[i], vEsc(c, 0)], [arr[i] + o.duracion, vEsc(c, 100)]],
                  { amp: o.amp, freq: o.freq, decay: o.decay, piso: o.piso,
                    donde: quien + " letra " + (i + 1) });
    }

    G.anotar("T06|golpe|" + o.cadena.length + " glifos|subida " + o.duracion + " cuadros|pivote " +
             o.pivote);
    return { capas: p.capas, arranques: arr, particion: p };
  };

  // ==============================================================================================
  // T07 · VOLTEO 3D POR CARACTER
  // ==============================================================================================
  //
  // Cada letra gira sobre su eje Y como una tarjeta, de -90 grados a 0.
  //
  // A -90 EXACTOS LA LETRA ES INVISIBLE, y eso es el gesto, no un defecto: el plano esta de canto y no
  // tiene ancho. Por eso no hace falta animar opacidad ni tapar nada. Pero SI hace falta camara con
  // perspectiva de verdad, o el giro sale como un aplastamiento horizontal sin escorzo.
  //
  // SIN CARA TRASERA. Dos capas coplanares separadas 1 unidad NO conmutan al girar: el motor dibuja
  // por apilado y la de arriba gana en toda la superposicion, gire lo que gire (LEY 1). El volteo de
  // dos caras es (b) y esta fuera del catalogo; aca es una cara sola.
  //
  // Y LAS LETRAS NO SE CRUZAN EN Z: la rotacion en Y mueve los vertices del plano, no la posicion de
  // la capa, asi que las N capas conservan su Z y M7 (cruces en Z) no tiene nada que reportar.
  api.volteoPorCaracter = function (o) {
    var quien = "Gt.volteoPorCaracter (T07)";
    def(o, "desde", 0);
    def(o, "duracion", 10);
    def(o, "retardo", 2);
    def(o, "curva", "C1");
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "angulo", -90);
    def(o, "eje", "y");
    def(o, "techo", TECHO_CASCADA);
    def(o, "hasta", G.cuadros());
    if (o.plana) {
      throw new Error(quien + ": el volteo necesita la capa en 3D y `plana: true` la deja en 2D. " +
                      "Una capa 2D no tiene rotacion X ni Y, asi que el giro no existiria — y no " +
                      "daria error: daria una letra quieta.");
    }

    var p = api.partir(o);
    if (!hayCamara()) {
      G.avisar("T07 sin camara en la composicion. El giro se va a ver, pero SIN ESCORZO: el motor " +
               "usa una camara por defecto y AE otra, asi que la lectura de 'tarjeta que gira' se " +
               "pierde. Llama a G.camara() antes.");
    }

    var arr = api.arranques(o.cadena.length, o.desde, o.retardo);
    revisarCascada(arr, o.techo, quien, o.retardo);

    var i, c, ax, prop;
    for (i = 0; i < p.capas.length; i++) {
      c = p.capas[i];
      if (c === null) { continue; }
      ax = p.avances[i] / 2;
      anclarEn(c, p.izq[i] + ax, o.y - 0.35 * o.tam, p.zs[i], ax, -0.35 * o.tam);
      G.plano(c, arr[i], o.hasta);
      prop = o.eje === "x" ? G.rotX(c) : G.rotY(c);
      G.claves(prop, [[arr[i], o.angulo, o.curva], [arr[i] + o.duracion, 0]],
               quien + " letra " + (i + 1));
    }

    G.anotar("T07|volteo|" + o.cadena.length + " glifos|eje " + o.eje + "|" + o.angulo + " grados");
    return { capas: p.capas, arranques: arr, particion: p };
  };

  // ==============================================================================================
  // T08 · INTERLETRA QUE SE CIERRA — obliga a partir
  // ==============================================================================================
  //
  // El texto entra abierto y se acomoda a su interletra final. Es *el* gesto premium barato.
  //
  // POR QUE OBLIGA A PARTIR. La interletra de una capa de texto es una propiedad ESTATICA en nuestro
  // canal: animarla como propiedad es el unico agregado que comprometeria la garantia del 1% de ancho,
  // porque `sourceRectAtTime` cambia con el tracking y entonces la caja medida deja de significar lo
  // que dice. Con una capa por caracter el gesto sale EXACTO, porque las dos disposiciones —la abierta
  // y la cerrada— se MIDEN, no se interpolan.
  //
  // Y ES UN GESTO DE CONJUNTO: NO SE ESCALONA. Escalonarlo lo convierte en T01 y pierde exactamente lo
  // que lo hace leerse como caro — que todas las letras llegan juntas a su sitio.
  //
  // La opacidad entra en la primera mitad y despues el movimiento sigue solo. Ese desfase es lo mismo
  // que hace E01 y es la mitad del oficio: si la opacidad y la posicion terminan juntas, el gesto se
  // lee como una sola cosa y se apaga.
  api.interletraQueSeCierra = function (o) {
    var quien = "Gt.interletraQueSeCierra (T08)";
    def(o, "desde", 0);
    def(o, "duracion", 18);
    def(o, "opacidad", 8);
    def(o, "apertura", 18);
    def(o, "curva", "C2");
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "interletra", 0);
    def(o, "hasta", G.cuadros());

    // la disposicion CERRADA es la que va a quedar; la ABIERTA es la misma medida con mas interletra
    var p = api.partir(o);
    var abierta = { cadena: o.cadena, fuente: o.fuente, tam: o.tam,
                    interletra: o.interletra + o.apertura };
    var medA = medidaDe(abierta, quien);
    var x0A = o.centrado === false ? o.x : o.x - medA.ancho / 2;

    var i, c, acum = 0, ej;
    for (i = 0; i < p.capas.length; i++) {
      c = p.capas[i];
      if (c !== null) {
        G.plano(c, o.desde, o.hasta);
        ej = G.ejes(c);
        G.claves(ej.x, [[o.desde, x0A + acum, o.curva], [o.desde + o.duracion, p.izq[i]]],
                 quien + " letra " + (i + 1));
        G.claves(G.op(c), [[o.desde, 0, o.curva], [o.desde + o.opacidad, 100]],
                 quien + " opacidad " + (i + 1));
      }
      acum += medA.avances[i];
    }

    G.anotar("T08|interletra|" + o.cadena.length + " glifos|de +" + o.apertura + " a " +
             o.interletra + " milesimas|ancho " + Math.round(medA.ancho) + " -> " +
             Math.round(p.ancho));
    return { capas: p.capas, particion: p, anchoAbierto: medA.ancho, anchoCerrado: p.ancho };
  };

  // ==============================================================================================
  // T09 · ONDULACION / FLOTACION TIPOGRAFICA
  // ==============================================================================================
  //
  // Dos modos, y son dos gestos distintos que la gente confunde:
  //
  //   "ola"       — UNA capa, animador nativo con selector TRIANGULO y ease. Una onda que RECORRE la
  //                 palabra de punta a punta. Barata: un animador, cero capas extra.
  //   "flotacion" — N capas, claves horneadas con un seno desfasado por letra. Ruido CONTINUO, cada
  //                 letra por su lado. Es la respuesta directa a "esta muerto".
  //
  // LO QUE NO SE PUEDE, Y HAY QUE DECIRLO: el SELECTOR ONDULADO de AE (`ADBE Text Wiggly Selector`) es
  // la herramienta con la que el oficio hace la flotacion, y el exportador lo rechaza por nombre —
  // solo viaja `ADBE Text Selector`. No es una limitacion tonta: el ondulado es ruido temporal con su
  // propio PRNG, y reproducirlo "parecido" es la palabra que este proyecto no acepta. Por eso el modo
  // "flotacion" hornea claves con un seno de fase declarada, que es determinista y verificable.
  //
  // LA CURVA DE LAS CLAVES HORNEADAS. El plan pide influencia 50/50 y el vocabulario del nucleo no la
  // tiene (SUAVE es 33/33, C6 es 70/70). Se usa SUAVE, que es la mas cercana por debajo, y lo digo en
  // vez de callarlo: con claves cada 4 cuadros y amplitudes de +-4 px, la diferencia entre 33 y 50
  // sobre un tramo es sub-pixel. Si algun dia hace falta 50/50 exacto, es una curva nueva en el
  // nucleo, no un parche aca.
  //
  // EL DESPLAZAMIENTO DEL SELECTOR VA DE -100 A 100 Y AE LO HACE CUMPLIR. Pedir 115 corta la
  // construccion a mitad de camino con "el valor esta fuera del rango", dejando la comp incompleta.
  // Para barrer mas alla del final se mueve la VENTANA, no se pide un desplazamiento imposible.
  api.ondulacion = function (o) {
    var quien = "Gt.ondulacion (T09)";
    def(o, "modo", "ola");
    def(o, "desde", 0);
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "hasta", G.cuadros());
    def(o, "color", [1, 1, 1]);
    def(o, "nombre", "T09");
    if (o.modo === "wiggly" || o.ondulado) {
      rechazar(quien, "el selector ondulado de AE",
               "es ruido temporal con el PRNG propio de AE; el exportador solo acepta " +
               "`ADBE Text Selector` (el de rango) y rechaza el ondulado por nombre.",
               "modo 'flotacion', que hornea el mismo movimiento con un seno de fase declarada — " +
               "determinista, reproducible y verificable contra AE cuadro a cuadro.");
    }

    if (o.modo === "ola") {
      var capa = rot({ cadena: o.cadena, tam: o.tam, color: o.color, fuente: o.fuente,
                       x: o.x, y: o.y, z: o.z, centrado: def(o, "centrado", true),
                       plana: o.plana, interletra: o.interletra, nombre: o.nombre }, quien);
      exigirReproductor3D(capa, quien);
      G.plano(capa, Math.min(0, o.desde), o.hasta);

      var n = o.cadena.length;
      def(o, "glifosDeOla", 3);
      def(o, "duracion", 60);
      def(o, "easeAlto", 60);
      def(o, "easeBajo", 60);
      def(o, "subida", Math.round(o.tam * 0.35));

      // la ventana en PORCENTAJE, porque el desplazamiento en porcentaje esta acotado a -100..100 y
      // esa cota es la que hay que respetar para que el barrido entre y salga entero
      var w = Math.min(90, o.glifosDeOla / n * 100);
      var an2 = capa.property("ADBE Text Properties")
                    .property("ADBE Text Animators").addProperty("ADBE Text Animator");
      an2.name = "ola";
      an2.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
      an2.property("ADBE Text Animator Properties")
         .addProperty("ADBE Text Position 3D").setValue([0, -o.subida, 0]);
      avDe(an2, 1).property("ADBE Text Range Units").setValue(1);     // 1 = porcentaje
      avDe(an2, 1).property("ADBE Text Range Shape").setValue(4);     // 4 = triangulo
      avDe(an2, 1).property("ADBE Text Levels Max Ease").setValue(o.easeAlto);
      avDe(an2, 1).property("ADBE Text Levels Min Ease").setValue(o.easeBajo);
      selDe(an2, 1).property("ADBE Text Percent Start").setValue(0);
      selDe(an2, 1).property("ADBE Text Percent End").setValue(w);
      G.claves(selDe(an2, 1).property("ADBE Text Percent Offset"),
               [[o.desde, -w], [o.desde + o.duracion, 100]], quien + " desplazamiento");

      G.anotar("T09|ola|" + n + " glifos|ventana " + Math.round(w) + "%|ease " + o.easeAlto + "/" +
               o.easeBajo + "|" + o.duracion + " cuadros");
      return { capa: capa, animador: an2 };
    }

    if (o.modo !== "flotacion") {
      throw new Error(quien + ": modo '" + o.modo + "' desconocido. Validos: 'ola', 'flotacion'.");
    }

    def(o, "periodo", 110);
    def(o, "cada", 4);
    def(o, "amplitudY", 4);
    def(o, "amplitudRot", 0);
    def(o, "amplitudEsc", 0);
    def(o, "desfase", 0.7);
    def(o, "curva", "SUAVE");
    if (o.periodo < 12) {
      throw new Error(quien + ": periodo " + o.periodo + " cuadros. Por debajo de 12 el muestreo cada " +
                      o.cada + " cuadros aliasa: quedan menos de 3 claves por ciclo y la onda que sale " +
                      "no es la que se pidio. Subi el periodo o baja `cada`.");
    }
    if (o.amplitudY > 8) {
      G.avisar("T09 flotacion con amplitud " + o.amplitudY + " px. El umbral del oficio: si podes VER " +
               "que se mueve mirandolo fijo, es el doble de lo que deberia ser. El catalogo pide " +
               "+-4 px para flotacion y +-4 px con periodo corto para nervio.");
    }

    var pf = api.partir(o);
    var i2, c2, cu2, fase, lY, lR, lE, v, ej2;
    for (i2 = 0; i2 < pf.capas.length; i2++) {
      c2 = pf.capas[i2];
      if (c2 === null) { continue; }
      G.plano(c2, o.desde, o.hasta);
      fase = i2 * o.desfase;
      lY = []; lR = []; lE = [];
      for (cu2 = o.desde; cu2 <= o.hasta; cu2 += o.cada) {
        v = Math.sin(2 * Math.PI * (cu2 - o.desde) / o.periodo + fase);
        if (o.amplitudY) { lY[lY.length] = [cu2, o.y + o.amplitudY * v, o.curva]; }
        if (o.amplitudRot) { lR[lR.length] = [cu2, o.amplitudRot * v, o.curva]; }
        if (o.amplitudEsc) { lE[lE.length] = [cu2, vEsc(c2, 100 + o.amplitudEsc * v), o.curva]; }
      }
      if (lY.length > 1) { ej2 = G.ejes(c2); G.claves(ej2.y, lY, quien + " y " + (i2 + 1)); }
      if (lR.length > 1) { G.claves(G.rotZ(c2), lR, quien + " rot " + (i2 + 1)); }
      if (lE.length > 1) { G.claves(G.esc(c2), lE, quien + " esc " + (i2 + 1)); }
    }

    G.anotar("T09|flotacion|" + o.cadena.length + " glifos|periodo " + o.periodo + "|clave cada " +
             o.cada + "|desfase " + o.desfase + " rad");
    return { capas: pf.capas, particion: pf };
  };

  // ==============================================================================================
  // T10 · TEXTO SOBRE TRAZADO
  // ==============================================================================================
  //
  // LA RECETA ES NUESTRA, NO LA DE AE. `Path Options` de AE no viaja: el exportador no lee trazados de
  // texto. Asi que el AE que ve el disenador tiene que ser YA el AE de las capas partidas, o la
  // fidelidad se mide contra algo que el motor nunca va a poder dibujar.
  //
  //   (1) la curva es una bezier cubica declarada por sus 4 puntos
  //   (2) se samplea a 200 puntos y se acumula la LONGITUD DE ARCO
  //   (3) por particion medida sale el avance acumulado de cada caracter, en pixeles
  //   (4) se busca el punto de la curva a esa longitud, interpolando entre muestras
  //   (5) la capa-caracter va ahi, con rotacion = tangente
  //
  // EL RADIO MINIMO ES 4x EL CUERPO, y aca se CALCULA en vez de confiarse. La curvatura de una bezier
  // cubica sale de sus derivadas; por debajo de ese radio las letras se separan visiblemente, porque
  // cada una es un rectangulo recto sobre una linea que dobla. No es un gusto: es que el texto sobre
  // trazado de AE deforma el glifo y el nuestro no puede.
  //
  // LA ROTACION SALE DIRECTA DE `atan2(dy, dx)` SIN CAMBIARLE EL SIGNO. La Y de AE apunta hacia ABAJO
  // y su rotacion es positiva en sentido horario: las dos convenciones se cancelan. Corregir el signo
  // "por las dudas" da un texto espejado sobre la curva, que se ve bien en una curva simetrica y mal
  // en cualquier otra.
  function muestrearBezier(p, n) {
    var X = [], Y = [], L = [], i, t, mt, x, y;
    for (i = 0; i <= n; i++) {
      t = i / n; mt = 1 - t;
      x = mt * mt * mt * p[0][0] + 3 * mt * mt * t * p[1][0] + 3 * mt * t * t * p[2][0] + t * t * t * p[3][0];
      y = mt * mt * mt * p[0][1] + 3 * mt * mt * t * p[1][1] + 3 * mt * t * t * p[2][1] + t * t * t * p[3][1];
      X[i] = x; Y[i] = y;
      L[i] = i === 0 ? 0 : L[i - 1] + Math.sqrt((x - X[i - 1]) * (x - X[i - 1]) + (y - Y[i - 1]) * (y - Y[i - 1]));
    }
    return { X: X, Y: Y, L: L };
  }

  function radioMinimo(p, n) {
    var i, t, mt, dx, dy, ddx, ddy, num, R, mejor = -1;
    for (i = 0; i <= n; i++) {
      t = i / n; mt = 1 - t;
      dx = 3 * mt * mt * (p[1][0] - p[0][0]) + 6 * mt * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]);
      dy = 3 * mt * mt * (p[1][1] - p[0][1]) + 6 * mt * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]);
      ddx = 6 * mt * (p[2][0] - 2 * p[1][0] + p[0][0]) + 6 * t * (p[3][0] - 2 * p[2][0] + p[1][0]);
      ddy = 6 * mt * (p[2][1] - 2 * p[1][1] + p[0][1]) + 6 * t * (p[3][1] - 2 * p[2][1] + p[1][1]);
      num = Math.abs(dx * ddy - dy * ddx);
      if (num < 1e-9) { continue; }
      R = Math.pow(dx * dx + dy * dy, 1.5) / num;
      if (mejor < 0 || R < mejor) { mejor = R; }
    }
    return mejor;
  }

  function enLargo(m, s) {
    var n = m.L.length - 1, k = 1, f, dx, dy;
    if (s <= 0) { s = 0; }
    if (s >= m.L[n]) { s = m.L[n]; }
    while (k < n && m.L[k] < s) { k++; }
    var den = m.L[k] - m.L[k - 1];
    f = den === 0 ? 0 : (s - m.L[k - 1]) / den;
    dx = m.X[k] - m.X[k - 1];
    dy = m.Y[k] - m.Y[k - 1];
    return { x: m.X[k - 1] + f * dx, y: m.Y[k - 1] + f * dy,
             ang: Math.atan2(dy, dx) * 180 / Math.PI };
  }

  api.textoSobreTrazado = function (o) {
    var quien = "Gt.textoSobreTrazado (T10)";
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "muestras", 200);
    def(o, "margen", 0);
    def(o, "desde", 0);
    def(o, "hasta", G.cuadros());
    def(o, "curva", "LINEAL");
    def(o, "cada", 2);
    exigir(o, "puntos", quien,
           "la curva se declara por sus CUATRO puntos de una bezier cubica: [P0, C1, C2, P3]. " +
           "`Path Options` de AE no viaja al motor, asi que la curva tiene que vivir en el guion.");
    if (o.puntos.length !== 4) {
      throw new Error(quien + ": `puntos` tiene " + o.puntos.length + " y una bezier cubica lleva 4.");
    }

    var m = muestrearBezier(o.puntos, o.muestras);
    var largo = m.L[o.muestras];
    var R = radioMinimo(o.puntos, o.muestras);
    if (R > 0 && R < 4 * o.tam) {
      throw new Error(quien + ": el radio minimo de la curva es " + Math.round(R) + " px y el cuerpo " +
                      "es " + o.tam + ", o sea " + (Math.round(R / o.tam * 100) / 100) + "x. El piso " +
                      "es 4x. Por debajo de eso las letras se SEPARAN visiblemente, porque cada una " +
                      "es un rectangulo recto sobre una linea que dobla — AE deforma el glifo sobre " +
                      "el trazado y nosotros no podemos. Abri la curva o baja el cuerpo a " +
                      Math.floor(R / 4) + ".");
    }

    // la particion se hace fuera de la curva y despues se recoloca: asi los avances salen del mismo
    // medidor que todo lo demas y no hay una segunda forma de medir el kerning
    var p = api.partir({ cadena: o.cadena, fuente: o.fuente, tam: o.tam, color: o.color,
                         interletra: o.interletra, x: 0, y: 0, z: o.z, centrado: false,
                         plana: o.plana, nombre: def(o, "nombre", "T10"),
                         techoGlifos: o.techoGlifos });
    if (p.ancho + o.margen > largo) {
      throw new Error(quien + ": el texto mide " + Math.round(p.ancho) + " px y la curva " +
                      Math.round(largo) + ". No entra. Alarga la curva, baja el cuerpo o corta la " +
                      "cadena — colocarlo igual amontonaria las ultimas letras en el ultimo punto.");
    }

    // el centro del AVANCE de cada caracter es lo que se apoya sobre la curva
    var centros = [], acum = 0, i;
    for (i = 0; i < p.avances.length; i++) {
      centros[i] = o.margen + acum + p.avances[i] / 2;
      acum += p.avances[i];
    }

    var c, q, ax = 0;
    for (i = 0; i < p.capas.length; i++) {
      c = p.capas[i];
      if (c === null) { continue; }
      ax = p.avances[i] / 2;
      q = enLargo(m, centros[i]);
      anclarEn(c, q.x, q.y, p.zs[i], ax, 0);
      G.rotZ(c).setValue(q.ang);
      G.plano(c, o.desde, o.hasta);
    }

    // ANIMAR ES REHORNEAR: la posicion y el angulo de cada letra en cada muestra. No hay atajo, porque
    // el avance sobre la curva no es una transformacion afin de nada.
    if (o.recorrido && o.recorrido.length > 1) {
      var lp, lr, cu, s, j, d, prop;
      for (i = 0; i < p.capas.length; i++) {
        c = p.capas[i];
        if (c === null) { continue; }
        lp = []; lr = [];
        for (cu = o.recorrido[0][0]; cu <= o.recorrido[o.recorrido.length - 1][0]; cu += o.cada) {
          d = o.recorrido[0][1];
          for (j = 1; j < o.recorrido.length; j++) {
            if (cu <= o.recorrido[j][0]) {
              var t0 = o.recorrido[j - 1][0], t1 = o.recorrido[j][0];
              var f2 = t1 === t0 ? 0 : (cu - t0) / (t1 - t0);
              d = o.recorrido[j - 1][1] + f2 * (o.recorrido[j][1] - o.recorrido[j - 1][1]);
              break;
            }
            d = o.recorrido[j][1];
          }
          s = enLargo(m, centros[i] + d);
          lp[lp.length] = [cu, c.threeDLayer ? [s.x, s.y, o.z] : [s.x, s.y], o.curva];
          lr[lr.length] = [cu, s.ang, o.curva];
        }
        if (lp.length > 1) {
          G.claves(G.pos(c), lp, quien + " pos " + (i + 1));
          G.claves(G.rotZ(c), lr, quien + " ang " + (i + 1));
        }
      }
    }

    G.anotar("T10|trazado|" + o.cadena.length + " glifos|largo " + Math.round(largo) + " px|radio " +
             (R < 0 ? "infinito (la curva es recta)"
                    : "minimo " + Math.round(R) + " px (" + (Math.round(R / o.tam * 10) / 10) + "x)"));
    return { capas: p.capas, particion: p, largo: largo, radioMinimo: R, curva: m };
  };

  // ==============================================================================================
  // T11 · TEXTO CORTADO / MITADES DESFASADAS
  // ==============================================================================================
  //
  // ESTA ES LA UNICA DE LAS CATORCE QUE **NO** SE PUEDE HACER CON TAPAS, y el plan la da como receta de
  // tapas. Digo por que, porque el motivo es el mismo que el propio plan usa para descartar el barrido
  // de resalte:
  //
  //   Una tapa oculta TODO lo que tiene debajo en el apilado, no solo la capa a la que apunta. Aca hay
  //   que mostrar la mitad de arriba de la copia A y la mitad de abajo de la copia B, que son regiones
  //   COMPLEMENTARIAS y —una vez que las mitades se desplazan— HORIZONTALMENTE SUPERPUESTAS. Cualquier
  //   tapa que borre la mitad sobrante de A borra tambien la mitad util de B, porque estan en la misma
  //   banda. Se prueban las tres ordenaciones posibles y ninguna cierra. No es un detalle de
  //   implementacion: es que las tapas son rectangulos opacos y esto pide una MATA.
  //
  // Lo que si hay es MASCARAS: viajan (el exportador las vuelca con sus vertices y tangentes, y las
  // animadas muestreadas cuadro a cuadro) y el motor las aplica como alfa por pixel en coordenadas de
  // capa. Una mascara recorta SU capa y ninguna otra, que es exactamente lo que hace falta.
  //
  // EL CORTE DIAGONAL Y EL DESPLAZAMIENTO VAN EN LA MISMA DIRECCION, y eso no es una preferencia
  // estetica: la mascara vive en coordenadas de CAPA, asi que viaja con la mitad que recorta. Si la
  // mitad se mueve en cualquier direccion que no sea la del corte, el borde del corte se mueve con
  // ella y se ve una diagonal deslizandose. Moviendo cada mitad A LO LARGO de la linea de corte, la
  // linea se mapea sobre si misma y el corte queda clavado en el cuadro. Con corte horizontal (el
  // caso por defecto) esto es simplemente "las mitades se mueven en horizontal", que es lo que uno
  // hubiera hecho igual — pero con corte a 12 grados es la diferencia entre que funcione y que no.
  function mascaraDeMitad(capa, nombre, cx, cy, angulo, lado, largo) {
    var g = angulo * Math.PI / 180;
    var dx = Math.cos(g), dy = Math.sin(g);
    var nx = Math.sin(g) * lado, ny = -Math.cos(g) * lado;
    var v = [[cx - dx * largo, cy - dy * largo],
             [cx + dx * largo, cy + dy * largo],
             [cx + dx * largo + nx * largo, cy + dy * largo + ny * largo],
             [cx - dx * largo + nx * largo, cy - dy * largo + ny * largo]];
    var ceros = [[0, 0], [0, 0], [0, 0], [0, 0]];
    var forma = new Shape();
    forma.vertices = v;
    forma.inTangents = ceros;
    forma.outTangents = ceros;
    forma.closed = true;
    var M = capa.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    M.name = nombre;
    M.maskMode = MaskMode.ADD;
    M.inverted = false;
    M.property("ADBE Mask Shape").setValue(forma);
    return M;
  }

  api.textoCortado = function (o) {
    var quien = "Gt.textoCortado (T11)";
    def(o, "desde", 0);
    def(o, "duracion", 12);
    def(o, "desplazamiento", 22);
    def(o, "angulo", 0);
    def(o, "curva", "C1");
    def(o, "modo", "elegante");
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "color", [1, 1, 1]);
    def(o, "centrado", true);
    def(o, "nombre", "T11");
    def(o, "hasta", G.cuadros());
    if (o.conTapas) {
      rechazar(quien, "el corte con tapas",
               "las dos mitades ocupan regiones COMPLEMENTARIAS y superpuestas: cualquier tapa que " +
               "borre la mitad sobrante de una copia borra tambien la mitad util de la otra, porque " +
               "una tapa oculta todo lo que tiene debajo en el apilado y no solo su capa.",
               "mascaras rectangulares (lo que hace esta funcion): viajan al motor y recortan SU " +
               "capa y ninguna otra.");
    }

    var comun = { tam: o.tam, color: o.color, fuente: o.fuente, x: o.x, y: o.y, z: o.z,
                  centrado: o.centrado, plana: o.plana, interletra: o.interletra };
    var abajo = rot({ cadena: o.cadena, tam: comun.tam, color: comun.color, fuente: comun.fuente,
                      x: comun.x, y: comun.y, z: comun.z, centrado: comun.centrado,
                      plana: comun.plana, interletra: comun.interletra,
                      nombre: o.nombre + "-abajo" }, quien);
    var arriba = rot({ cadena: o.cadena, tam: comun.tam, color: comun.color, fuente: comun.fuente,
                       x: comun.x, y: comun.y, z: comun.z, centrado: comun.centrado,
                       plana: comun.plana, interletra: comun.interletra,
                       nombre: o.nombre + "-arriba" }, quien);
    sinAnimador(abajo, quien);
    sinAnimador(arriba, quien);

    var caja = cajaDe(arriba);
    if (caja === null) { throw new Error(quien + ": no se pudo medir la caja del texto."); }
    var yCorte = def(o, "corte", (caja.abajo - caja.arriba) / 2);
    var largo = Math.ceil((caja.ancho + caja.alto) * 3 + o.tam * 4);

    mascaraDeMitad(arriba, "mitad-arriba", 0, yCorte, o.angulo, 1, largo);
    mascaraDeMitad(abajo, "mitad-abajo", 0, yCorte, o.angulo, -1, largo);

    var g2 = o.angulo * Math.PI / 180;
    var ux = Math.cos(g2) * o.desplazamiento, uy = Math.sin(g2) * o.desplazamiento;
    var lista;
    if (o.modo === "glitch") {
      def(o, "paso", 3);
      lista = [[o.desde, 1, "HOLD"], [o.desde + o.paso, 0, "HOLD"],
               [o.desde + o.paso * 2, 1, "HOLD"], [o.desde + o.paso * 3, 0]];
    } else {
      lista = [[o.desde, 1, o.curva], [o.desde + o.duracion, 0]];
    }

    var i3, lA = [], lB = [];
    for (i3 = 0; i3 < lista.length; i3++) {
      lA[i3] = [lista[i3][0], mueve(o, ux, uy, lista[i3][1], 1), lista[i3][2]];
      lB[i3] = [lista[i3][0], mueve(o, ux, uy, lista[i3][1], -1), lista[i3][2]];
    }
    G.claves(G.pos(arriba), lA, quien + " mitad de arriba");
    G.claves(G.pos(abajo), lB, quien + " mitad de abajo");
    G.plano(arriba, o.desde, o.hasta);
    G.plano(abajo, o.desde, o.hasta);

    G.anotar("T11|cortado|corte a " + o.angulo + " grados en y=" + Math.round(yCorte) +
             "|desplazamiento " + o.desplazamiento + " px|" + o.modo);
    return { arriba: arriba, abajo: abajo, caja: caja, corte: yCorte };
  };

  function mueve(o, ux, uy, f, signo) {
    var x = o.x + ux * f * signo, y = o.y + uy * f * signo;
    return o.plana ? [x, y] : [x, y, o.z];
  }

  // ==============================================================================================
  // T12 · REVOLTIJO / DECODE — por flipbook de capas
  // ==============================================================================================
  //
  // POR QUE FLIPBOOK Y NO TEXTO DE ORIGEN CON CLAVES. El catalogo daba "texto de origen animado" como
  // la adicion de mejor retorno; en este motor no lo es. `comp3d.html` construye una textura de canvas
  // por capa EN EL ARMADO y dimensiona el plano con esas metricas: cambiar la cadena por cuadro obliga
  // a rehacer textura y geometria en cada cuadro y en cada submuestra del obturador. Y el exportador
  // lo rechaza directamente ("el TEXTO esta animado (N keyframes)"). El flipbook es lo barato: el
  // reproductor decide visibilidad con un rango de tiempo y las capas efimeras no le cuestan nada.
  //
  // UNA CAPA POR CARACTER **Y** POR ESTADO, no una por estado de la frase entera. Es mas capas y es la
  // unica forma de que la disposicion no baile: si cada estado es una capa con la frase completa, cada
  // revoltijo tiene otro ancho y —con el texto centrado— TODO SE CORRE en cada cuadro. Con una capa
  // por posicion, el glifo aleatorio se centra dentro del hueco del caracter final y la linea no se
  // mueve un pixel.
  //
  // LA VISIBILIDAD VA POR OPACIDAD **ADEMAS** DEL RANGO DE TIEMPO, y no es cinturon y tiradores: el
  // reproductor evalua `t >= entra && t <= sale` con los dos extremos INCLUSIVE, asi que en el cuadro
  // en que un estado termina y el siguiente empieza se dibujan LOS DOS, superpuestos. Una clave HOLD
  // de opacidad en 0 en ese mismo cuadro lo resuelve exacto, y funciona igual en AE.
  //
  // EL GLIFO SE ELIGE CON GENERADOR CONGRUENCIAL Y SEMILLA EN LAS OPCIONES. La misma semilla da el
  // mismo video, siempre. Y respeta la clase del caracter final —mayuscula, minuscula, digito— que es
  // lo que en AE hace "Preservar mayusculas y digitos": un revoltijo que mezcla clases se lee como
  // ruido, no como algo que se esta resolviendo.
  var MAYUS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var MINUS = "abcdefghijklmnopqrstuvwxyz";
  var DIGIT = "0123456789";

  function alfabetoDe(ch) {
    var c = ch.charCodeAt(0);
    if (c >= 48 && c <= 57) { return DIGIT; }
    if (c >= 65 && c <= 90) { return MAYUS; }
    if (c >= 97 && c <= 122) { return MINUS; }
    return null;
  }

  api.revoltijo = function (o) {
    var quien = "Gt.revoltijo (T12)";
    def(o, "desde", 0);
    def(o, "porCaracter", 2);
    def(o, "cada", 2);
    def(o, "preludio", 6);
    def(o, "semilla", 20260820);
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "color", [1, 1, 1]);
    def(o, "nombre", "T12");
    def(o, "hasta", G.cuadros());
    def(o, "techoCapas", 200);
    if (o.porTextoAnimado) {
      rechazar(quien, "el texto de origen con claves",
               "el exportador lo rechaza ('el TEXTO esta animado'), y aunque viajara, el motor arma " +
               "la textura y la geometria de cada capa de texto UNA vez, en el armado.",
               "el flipbook de capas efimeras, que es lo que hace esta funcion y ademas es mas barato " +
               "para el reproductor.");
    }

    var med = medidaDe(o, quien);
    var n = o.cadena.length;
    var x0 = def(o, "centrado", true) === false ? o.x : o.x - med.ancho / 2;
    var izq = [], acum = 0, i;
    for (i = 0; i < n; i++) { izq[i] = x0 + acum; acum += med.avances[i]; }

    var resol = [], estados = 0;
    for (i = 0; i < n; i++) {
      resol[i] = o.desde + o.preludio + i * o.porCaracter;
      if (alfabetoDe(o.cadena.charAt(i)) !== null) {
        estados += Math.ceil((resol[i] - o.desde) / o.cada);
      }
    }
    if (estados + n > o.techoCapas) {
      throw new Error(quien + ": " + (estados + n) + " capas y el techo es " + o.techoCapas + ". " +
                      "Cada una es una rasterizacion y una textura. Baja `preludio`, subi `cada`, o " +
                      "corta la cadena: un revoltijo de 30 caracteres no se lee de todos modos.");
    }

    var rnd = azar(o.semilla);
    var capas = [], finales = [], ch, alf, cu, cap, cx;
    for (i = 0; i < n; i++) {
      ch = o.cadena.charAt(i);
      alf = alfabetoDe(ch);
      cx = izq[i] + med.avances[i] / 2;
      if (alf !== null) {
        for (cu = o.desde; cu < resol[i]; cu += o.cada) {
          cap = rot({ cadena: alf.charAt(Math.floor(rnd() * alf.length)),
                      tam: o.tam, color: o.color, fuente: o.fuente,
                      x: cx, y: o.y, z: o.z, centrado: true, plana: o.plana,
                      nombre: o.nombre + "-" + (i + 1) + "-" + cu }, quien);
          G.plano(cap, cu, Math.min(cu + o.cada, resol[i]));
          G.claves(G.op(cap), [[cu, 100, "HOLD"], [Math.min(cu + o.cada, resol[i]), 0]],
                   quien + " estado " + (i + 1) + "@" + cu);
          capas[capas.length] = cap;
        }
      }
      if (ch !== " ") {
        // el caracter final va alineado a la IZQUIERDA en su origen natural: la linea resuelta tiene
        // que ser tipograficamente exacta, y centrar el glifo en su avance no lo es. El salto de uno o
        // dos pixeles al resolverse cae en el mismo cuadro que el cambio de glifo, o sea invisible.
        cap = rot({ cadena: ch, tam: o.tam, color: o.color, fuente: o.fuente,
                    x: izq[i], y: o.y, z: o.z, centrado: false, plana: o.plana,
                    nombre: o.nombre + "-" + (i + 1) + "-fin" }, quien);
        G.plano(cap, resol[i], o.hasta);
        finales[finales.length] = cap;
      }
    }

    G.anotar("T12|revoltijo|" + n + " glifos|" + (capas.length + finales.length) + " capas|semilla " +
             o.semilla + "|resuelve en " + resol[n - 1]);
    return { estados: capas, finales: finales, resoluciones: resol, fin: resol[n - 1] };
  };

  // ==============================================================================================
  // T13 · PALABRA POR BEAT
  // ==============================================================================================
  //
  // Una palabra sola, grande, reemplazada al golpe. Es *el* genero, y lo que le falta casi siempre no
  // es un gesto nuevo: es la GRILLA. `cuadros/beat = 1800 / BPM`; a 120 bpm son 15 cuadros exactos a
  // 30 fps. Lo que cae en la grilla es el ARRANQUE, no la duracion.
  //
  // LA ENTRADA OCUPA COMO MAXIMO EL 40% DEL BEAT. Con 15 cuadros por beat son 6. Si ocupa mas, la
  // palabra nunca se lee quieta y la pieza se siente lenta — que es exactamente el diagnostico que
  // este catalogo existe para arreglar. Por eso es un `throw` y no un consejo.
  //
  // Y LA SALIDA ES UN CORTE SECO EN EL BEAT, con claves HOLD de opacidad. Un corte a un cuadro del
  // beat se siente mal y nadie sabe por que. Ademas asi la palabra siguiente entra en el mismo cuadro
  // en que se va la anterior, sin un hueco de fondo vacio en el medio.
  api.palabraPorBeat = function (o) {
    var quien = "Gt.palabraPorBeat (T13)";
    exigir(o, "palabras", quien, "es una lista de cadenas, o de objetos {cadena, beats, tam}.");
    def(o, "bpm", 120);
    def(o, "desde", 0);
    def(o, "tam", 140);
    def(o, "z", 0);
    def(o, "color", [1, 1, 1]);
    def(o, "entrada", "desliz");
    def(o, "duracionEntrada", 6);
    def(o, "curva", "C1");
    def(o, "empuje", 60);
    def(o, "acento", 1.25);
    def(o, "nombre", "T13");
    def(o, "pisoLegibilidad", 8);

    var porBeat = Math.round(1800 / o.bpm);
    if (o.duracionEntrada > porBeat * 0.4) {
      throw new Error(quien + ": la entrada dura " + o.duracionEntrada + " cuadros y el beat mide " +
                      porBeat + " (a " + o.bpm + " bpm). El techo es el 40% del beat, o sea " +
                      Math.floor(porBeat * 0.4) + ". Por encima de eso la palabra nunca se lee quieta " +
                      "y la pieza se siente lenta — es el diagnostico exacto que hay que evitar.");
    }

    var capas = [], arranques = [], cu = o.desde, i, w, cad, beats, tam, dur, salida;
    for (i = 0; i < o.palabras.length; i++) {
      w = o.palabras[i];
      cad = (typeof w === "string") ? w : w.cadena;
      beats = ((typeof w === "string") ? 1 : (w.beats || 1));
      tam = ((typeof w === "string") ? o.tam : (w.tam || (beats > 1 ? Math.round(o.tam * o.acento) : o.tam)));
      dur = beats * porBeat;
      salida = cu + dur;

      var capa = rot({ cadena: cad, tam: tam, color: o.color, fuente: o.fuente,
                       x: (typeof w === "string" ? o.x : (w.x === undefined ? o.x : w.x)),
                       y: (typeof w === "string" ? o.y : (w.y === undefined ? o.y : w.y)),
                       z: o.z, centrado: true, plana: o.plana,
                       nombre: o.nombre + "-" + (i + 1) }, quien);
      G.plano(capa, cu, salida);
      // el corte seco: opacidad HOLD, cero cuadros de transicion, exacto en el beat
      G.claves(G.op(capa), [[cu, 100, "HOLD"], [salida, 0]], quien + " corte " + (i + 1));

      if (o.entrada === "desliz") {
        var ej = G.ejes(capa);
        var yBase = (typeof w === "string" ? o.y : (w.y === undefined ? o.y : w.y));
        G.claves(ej.y, [[cu, yBase + o.empuje, o.curva], [cu + o.duracionEntrada, yBase]],
                 quien + " desliz " + (i + 1));
      } else if (o.entrada === "escala") {
        G.claves(G.esc(capa), [[cu, vEsc(capa, 0), o.curva],
                               [cu + o.duracionEntrada, vEsc(capa, 100)]],
                 quien + " escala " + (i + 1));
      } else if (o.entrada !== "ninguna") {
        throw new Error(quien + ": entrada '" + o.entrada + "' desconocida. " +
                        "Validas: 'desliz', 'escala', 'ninguna'.");
      }

      // LEY DE LEGIBILIDAD: 1 segundo inmovil por cada 13 caracteres. Manda sobre las ganas de
      // acelerar. Se avisa en vez de tirar porque en este genero las palabras de relleno pasan rapido
      // a proposito; el piso se aplica a las que hay que LEER.
      var quieto = dur - o.duracionEntrada;
      if (cad.length >= o.pisoLegibilidad && quieto < G.fps() * cad.length / 13) {
        G.avisar("T13: '" + cad + "' (" + cad.length + " caracteres) se queda quieta " + quieto +
                 " cuadros y la regla pide " + Math.round(G.fps() * cad.length / 13) +
                 " (1 segundo cada 13 caracteres). Dale otro beat.");
      }

      capas[capas.length] = capa;
      arranques[arranques.length] = cu;
      cu = salida;
    }

    G.anotar("T13|palabraPorBeat|" + capas.length + " palabras|" + o.bpm + " bpm|" + porBeat +
             " cuadros por beat|termina en " + cu);
    return { capas: capas, arranques: arranques, porBeat: porBeat, fin: cu };
  };

  // ==============================================================================================
  // T14 · RELEVO DE PALABRA
  // ==============================================================================================
  //
  // Una palabra sale por arriba mientras la siguiente sube desde abajo, en el mismo renglon. Dos tapas
  // —una arriba y una abajo de la caja medida— hacen la ventana.
  //
  // AQUI LAS TAPAS SI FUNCIONAN, y conviene ver por que, contra T11 donde no: las dos tapas ocultan la
  // MISMA region para las DOS capas de texto. No hay nada complementario. Las dos palabras viven
  // debajo de las dos tapas y se ven solo dentro de la ventana. Es el caso limpio.
  //
  // EL DESPLAZAMIENTO SE CALCULA CON LA CAJA MEDIDA, no se elige. La saliente tiene que subir hasta que
  // su DESCENDENTE pase el borde de arriba de la ventana; la entrante tiene que arrancar tan abajo que
  // su ASCENDENTE quede por debajo del borde de abajo. Las dos cuentas dan lo mismo —alto de caja mas
  // holgura— y las dos se ven mal si uno pone "80 px porque parece": queda una franja de la palabra
  // vieja colgando del borde durante todo el relevo.
  //
  // 4 CUADROS DE SUPERPOSICION, y la saliente ACELERA (C3) mientras la entrante DESACELERA (C1). Si
  // las dos llevan la misma curva se lee como una tira que se desliza, no como un relevo.
  api.relevoDePalabra = function (o) {
    var quien = "Gt.relevoDePalabra (T14)";
    exigir(o, "sale", quien, "la cadena que se va.");
    exigir(o, "entra", quien, "la cadena que llega.");
    def(o, "desde", 0);
    def(o, "salida", 8);
    def(o, "entrada", 12);
    def(o, "solape", 4);
    def(o, "curvaSale", "C3");
    def(o, "curvaEntra", "C1");
    def(o, "tam", 72);
    def(o, "z", 0);
    def(o, "color", [1, 1, 1]);
    def(o, "centrado", true);
    def(o, "nombre", "T14");
    def(o, "holgura", Math.round(o.tam * 0.2));
    def(o, "hasta", G.cuadros());
    exigir(o, "colorFondo", quien, "las dos tapas tienen que ser el color exacto del fondo (LEY 4).");
    if (o.solape >= o.salida) {
      throw new Error(quien + ": solape " + o.solape + " y la saliente dura " + o.salida + ". Con un " +
                      "solape mayor o igual, la entrante arranca antes que la saliente y el relevo se " +
                      "invierte: se ve como que la palabra nueva empuja a la vieja hacia adentro.");
    }

    var comunes = { tam: o.tam, color: o.color, fuente: o.fuente, x: o.x, y: o.y, z: o.z,
                    centrado: o.centrado, plana: o.plana, interletra: o.interletra };
    var saliente = rot({ cadena: o.sale, tam: comunes.tam, color: comunes.color,
                         fuente: comunes.fuente, x: comunes.x, y: comunes.y, z: comunes.z,
                         centrado: comunes.centrado, plana: comunes.plana,
                         interletra: comunes.interletra, nombre: o.nombre + "-sale" }, quien);
    var entrante = rot({ cadena: o.entra, tam: comunes.tam, color: comunes.color,
                         fuente: comunes.fuente, x: comunes.x, y: comunes.y, z: comunes.z,
                         centrado: comunes.centrado, plana: comunes.plana,
                         interletra: comunes.interletra, nombre: o.nombre + "-entra" }, quien);

    var cS = cajaDe(saliente), cE = cajaDe(entrante);
    if (cS === null || cE === null) {
      throw new Error(quien + ": no se pudo medir la caja de una de las dos palabras, y la ventana " +
                      "sale de esa medida.");
    }
    var arriba = Math.max(cS.arriba, cE.arriba);
    var abajo = Math.max(cS.abajo, cE.abajo);
    var salto = Math.ceil(arriba + abajo + o.holgura);

    var arranqueEntra = o.desde + o.salida - o.solape;
    var ejS = G.ejes(saliente);
    G.claves(ejS.y, [[o.desde, o.y, o.curvaSale], [o.desde + o.salida, o.y - salto]],
             quien + " saliente");
    G.plano(saliente, Math.min(0, o.desde), o.desde + o.salida);

    var ejE = G.ejes(entrante);
    G.claves(ejE.y, [[arranqueEntra, o.y + salto, o.curvaEntra],
                     [arranqueEntra + o.entrada, o.y]], quien + " entrante");
    G.plano(entrante, arranqueEntra, o.hasta);

    // las dos tapas van DESPUES de los dos textos, a z-1: arriba en el apilado y un paso mas cerca
    var yTapaArriba = o.y - arriba - o.holgura - G.alto() / 2;
    var yTapaAbajo = o.y + abajo + o.holgura + G.alto() / 2;
    var W = def(o, "anchoTapa", G.ancho() * 2);
    var tAbajo = tapa(o, o.nombre + "-tapa-abajo", o.x, yTapaAbajo, W, G.alto(), o.z - 1);
    var tArriba = tapa(o, o.nombre + "-tapa-arriba", o.x, yTapaArriba, W, G.alto(), o.z - 1);
    G.plano(tAbajo, 0, o.hasta);
    G.plano(tArriba, 0, o.hasta);

    G.anotar("T14|relevo|'" + o.sale + "' -> '" + o.entra + "'|salto " + salto +
             " px (ascenso " + Math.round(arriba) + " + descenso " + Math.round(abajo) +
             ")|solape " + o.solape);
    return { saliente: saliente, entrante: entrante, tapaArriba: tArriba, tapaAbajo: tAbajo,
             salto: salto, arranqueEntra: arranqueEntra, fin: arranqueEntra + o.entrada };
  };

  return api;
})();
