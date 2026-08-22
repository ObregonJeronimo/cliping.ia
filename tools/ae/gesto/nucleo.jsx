// ================================================================================================
// GESTO · EL NUCLEO
// ================================================================================================
//
// POR QUE EXISTE ESTA BIBLIOTECA, y no es para escribir menos.
//
// Las leyes de este proyecto estan escritas en la skill, con su medicion y su costo. Y aun asi, el
// mismo dia que escribi "las claves que alimentan un rebote van lineales", autore una pieza entera con
// Easy Ease en exactamente esas claves. El sobrepaso medido dio 0,11 px — o sea que el rebote no
// existia — y no lo caz ninguna compuerta: lo dijo el usuario, mirando el video.
//
// Ese es el patron que esta biblioteca ataca. Un documento lo lee quien ya sabia que existia; una
// funcion que se NIEGA A CONSTRUIR no se puede desobedecer por distraccion.
//
// LA REGLA DE DISENO: cada ley que costo cara aparece aca como una de tres cosas —
//   (a) un valor por defecto que ya es el correcto     (el obturador apagado, 8 bits)
//   (b) un paso obligatorio que no se puede saltear    (colgar() pone la orientacion en cero)
//   (c) un `throw` con el numero medido en el mensaje  (el rebote sin velocidad, la clave a mitad de cuadro)
//
// Nunca un comentario suelto. Un comentario ya fallo una vez.
//
// ================================================================================================
// USO
//   #include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/nucleo.jsx"
//   G.iniciar({ nombre: "MI-PIEZA", cuadros: 240 });
//   ... construir ...
//   G.cerrar();
// ================================================================================================

var G = (function () {

  var api = {};

  // ==============================================================================================
  // ESTADO
  // ==============================================================================================
  var comp = null;
  var FPS = 30, ANCHO = 1920, ALTO = 1080, CUADROS = 240;
  var RECURSOS = null;
  var PROYECTO = null;   // el .aep propio, cuando `G.iniciar` recibe `proyecto`
  var DIST_CAM = 2400;
  var camara = null, opcCam = null;
  var avisos = [];
  var construidos = 0;
  var expresiones = 0;
  var RUTA_INFORME = "C:/ae-probe/gesto.txt";

  function texto(x) {
    if (x === null) { return "null"; }
    if (x === undefined) { return "undefined"; }
    try { return x.toString(); } catch (e) { return "<inconvertible>"; }
  }
  function anotar(t) {
    var a = new File(RUTA_INFORME); a.encoding = "UTF-8"; a.open("a");
    a.write(t + String.fromCharCode(10)); a.close();
  }
  function avisar(t) { avisos[avisos.length] = t; anotar("AVISO|" + t); }

  // EL SALTO DE LINEA CRUDO DENTRO DE UNA CADENA DE ExtendScript ES UN ERROR DE ANALISIS: no falla la
  // linea, no corre el archivo entero. Las expresiones son multilinea por naturaleza.
  var NL = String.fromCharCode(10);
  function lineas(arr) { return arr.join(NL); }
  api.lineas = lineas;
  api.NL = NL;

  // acentos sin escribirlos crudos, que en algunos editores viajan mal
  function ac(s) {
    s = s.replace(/\{a\}/g, String.fromCharCode(225));
    s = s.replace(/\{e\}/g, String.fromCharCode(233));
    s = s.replace(/\{i\}/g, String.fromCharCode(237));
    s = s.replace(/\{o\}/g, String.fromCharCode(243));
    s = s.replace(/\{u\}/g, String.fromCharCode(250));
    s = s.replace(/\{n\}/g, String.fromCharCode(241));
    s = s.replace(/\{A\}/g, String.fromCharCode(193));
    s = s.replace(/\{N\}/g, String.fromCharCode(209));
    return s;
  }
  api.ac = ac;

  // ==============================================================================================
  // LAS CURVAS
  // ==============================================================================================
  //
  // LO QUE MIDIO EL DISECTOR SOBRE SEIS PROYECTOS REALES, 282 influencias:
  //     mediana 16,667 (el defecto de AE, o sea SIN ease) · 57,8% en ese valor exacto
  //     p75 33,3 (Easy Ease) · p90 72,4 · solo el 11% pasa de 70
  //
  // Las ocho curvas C1..C8 de este repo viven TODAS entre 70 y 92: son el 11% de lo que hace la gente,
  // y se venian aplicando al 100% de los gestos. Por eso el defecto de `claves()` es LINEAL.
  //
  // Y la regla vieja "nunca Easy Ease" era falsa: Easy Ease es el p75. Lo que estaba mal no era usarlo,
  // era usar SIEMPRE una curva pesada en vez de poner el caracter con una expresion.
  var CURVAS = {
    LINEAL: null,                 // 16,667 — el defecto, y el defecto de esta biblioteca
    SUAVE: [33.33, 33.33],        // Easy Ease, el p75
    C1: [20, 85],   // entrada
    C2: [10, 92],   // pesada
    C3: [90, 15],   // salida
    C4: [85, 85],   // latigazo
    C6: [70, 70],   // traslado
    C7: [0.1, 80],  // golpe
    C8: [70, 20]    // asentamiento
  };
  api.CURVAS = CURVAS;

  // ==============================================================================================
  // INICIAR
  // ==============================================================================================
  api.iniciar = function (o) {
    o = o || {};
    if (!o.nombre) { throw new Error("G.iniciar necesita un nombre de composicion"); }

    ANCHO = o.ancho || 1920;
    ALTO = o.alto || 1080;
    FPS = o.fps || 30;
    CUADROS = o.cuadros || 240;
    RECURSOS = o.recursos || null;
    RUTA_INFORME = o.informe || "C:/ae-probe/gesto.txt";

    var pv = new File(RUTA_INFORME);
    if (pv.exists) { pv.remove(); }

    // ---------------------------------------------------------------- `proyecto`: un .aep propio
    //
    // POR QUE EXISTE. Una comp creada por script nace adentro del PROYECTO ABIERTO. Autorar dos piezas
    // seguidas las deja a las dos en el mismo .aep, y el usuario que queria conservar la anterior se
    // encuentra la nueva encima. Pedido textual: "no uses el .aep VideoUrvidPrueba, ese lo quiero
    // dejar guardado, crea otro proyecto desde cero para este video nuevo".
    //
    // Y POR QUE NO CIERRA SIN MAS. `app.project.close(DO_NOT_SAVE_CHANGES)` deja un proyecto nuevo al
    // instante y **tira los cambios sin preguntar**. Un script no puede tomar esa decision por nadie:
    // si el proyecto abierto tiene cambios sin guardar, esta funcion los GUARDA primero cuando sabe
    // donde, y cuando no sabe (proyecto sin archivo) se NIEGA y lo dice. Perder trabajo ajeno para
    // ahorrarse un mensaje no es una opcion.
    if (o.proyecto) {
      var destino = new File(o.proyecto);
      var abierto = null;
      try { abierto = app.project.file; } catch (exF) { abierto = null; }
      var mismo = (abierto !== null && abierto.fsName === destino.fsName);

      if (!mismo) {
        if (app.project.dirty) {
          if (abierto === null) {
            throw new Error("hay un proyecto SIN GUARDAR abierto en AE y con cambios. No lo cierro yo: " +
                            "no tiene archivo, asi que cerrarlo perderia todo. Guardalo con un nombre " +
                            "y volve a correr esto.");
          }
          app.project.close(CloseOptions.SAVE_CHANGES);
        } else if (abierto !== null || app.project.numItems > 0) {
          app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        }
        // despues de cerrar, AE ya deja un proyecto vacio; si el .aep de destino existe se abre, y si
        // no, se guarda el vacio con ese nombre para que exista desde el primer momento
        if (destino.exists) { app.open(destino); } else { app.project.save(destino); }
      }
      PROYECTO = destino;
    }

    // LEY (a) · LA PROFUNDIDAD DE COLOR SE FIJA, NO SE HEREDA.
    // Una comp creada por script vive adentro del proyecto abierto y hereda su profundidad de bits. Con
    // un proyecto ajeno en 32 bits flotantes, un fondo claro (246,247,250) renderizo (24,24,24): casi
    // negro. Medido y reproducible; el mecanismo exacto no lo tengo y no lo invento.
    try { app.project.bitsPerChannel = 8; } catch (exB) { avisar("no se pudo fijar 8 bits: " + texto(exB.message)); }

    var n = app.project.numItems;
    while (n > 0) {
      var it = app.project.item(n);
      if (it instanceof CompItem && it.name === o.nombre) { it.remove(); }
      n = n - 1;
    }
    comp = app.project.items.addComp(o.nombre, ANCHO, ALTO, 1, CUADROS / FPS, FPS);
    comp.resolutionFactor = [1, 1];

    // LEY (a) · EL OBTURADOR VA APAGADO Y ES OPT-IN.
    // Las 77 capas de los cuatro proyectos medidos traen el desenfoque de movimiento en 0. El 100%. El
    // "180 grados fase -90" que declara toda comp es el DEFECTO de AE, no la decision de nadie: la
    // nitidez del salto ES el efecto. Ademas cuesta N renders por cuadro.
    if (o.obturador) {
      if (!o.motivoObturador) {
        throw new Error("prender el obturador exige `motivoObturador`: el 100% de las capas de los " +
                        "proyectos medidos lo tienen apagado, asi que encenderlo es una decision que " +
                        "hay que poder defender por escrito");
      }
      comp.motionBlur = true;
      comp.shutterAngle = o.anguloObturador || 180;
      comp.shutterPhase = o.faseObturador === undefined ? -90 : o.faseObturador;
      comp.motionBlurSamplesPerFrame = o.muestrasObturador || 4;
      anotar("OBTURADOR|encendido|" + o.motivoObturador);
    } else {
      comp.motionBlur = false;
    }

    if (o.fondo) { comp.bgColor = o.fondo; }
    comp.openInViewer();
    anotar("COMP|" + o.nombre + "|" + ANCHO + "x" + ALTO + "|" + FPS + "fps|" + CUADROS + " cuadros");
    return comp;
  };

  api.comp = function () { return comp; };
  api.fps = function () { return FPS; };
  api.cuadros = function () { return CUADROS; };
  api.ancho = function () { return ANCHO; };
  api.alto = function () { return ALTO; };

  // ==============================================================================================
  // ATAJOS DE PROPIEDAD
  // ==============================================================================================
  function tr(c) { return c.property("ADBE Transform Group"); }
  api.tr = tr;
  api.op = function (c) { return tr(c).property("ADBE Opacity"); };
  api.pos = function (c) { return tr(c).property("ADBE Position"); };
  api.esc = function (c) { return tr(c).property("ADBE Scale"); };
  api.anc = function (c) { return tr(c).property("ADBE Anchor Point"); };
  api.rotX = function (c) { return tr(c).property("ADBE Rotate X"); };
  api.rotY = function (c) { return tr(c).property("ADBE Rotate Y"); };
  api.rotZ = function (c) { return tr(c).property("ADBE Rotate Z"); };
  api.ori = function (c) { return tr(c).property("ADBE Orientation"); };
  api.docTexto = function (c) { return c.property("ADBE Text Properties").property("ADBE Text Document"); };

  // SEPARAR DIMENSIONES devuelve las tres pistas. Se usa cada vez que hay que animar un solo eje —
  // que es casi siempre, porque un rebote en X no tiene por que tocar Y.
  api.ejes = function (capa) {
    api.pos(capa).dimensionsSeparated = true;
    var e = {
      x: tr(capa).property("ADBE Position_0"),
      y: tr(capa).property("ADBE Position_1"),
      z: null
    };
    try { e.z = tr(capa).property("ADBE Position_2"); } catch (exZ) { e.z = null; }
    return e;
  };

  // ==============================================================================================
  // CLAVES
  // ==============================================================================================
  //
  // LEY (c) · TODAS LAS CLAVES CAEN EN CUADRO ENTERO.
  // Medido en el proyecto del tunel a 25 fps: los tiempos dan 27, 30, 32, 63, 99, 100 y 245 — ni una
  // entre cuadros. Una clave a mitad de cuadro se redondea impredeciblemente y el golpe cae donde no
  // era; con cuantizacion temporal el dano se duplica. Se caza sin renderizar y son dos lineas.
  //
  // LEY (c) · LAS CLAVES VAN EN ORDEN ESTRICTO. Una lista desordenada no da error en AE: pisa la clave
  // anterior en silencio y el gesto desaparece.
  //
  // Y PONER UNA INFLUENCIA PROMUEVE LA CLAVE A BEZIER DE LOS DOS LADOS, pisando el tipo del tramo
  // anterior. En la PIEZA-H fueron 64 tramos rechazados de golpe. Por eso los tipos se fijan DESPUES.
  function aplicarInfluencia(prop, k, k2, c) {
    var n = prop.keyOutTemporalEase(k).length;
    var sal = [], ent = [], q;
    for (q = 0; q < n; q++) { sal[q] = new KeyframeEase(0, c[0]); ent[q] = new KeyframeEase(0, c[1]); }
    var entradaDeK = prop.keyInInterpolationType(k);
    var salidaDeK2 = prop.keyOutInterpolationType(k2);
    prop.setInterpolationTypeAtKey(k, entradaDeK, KeyframeInterpolationType.BEZIER);
    prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, salidaDeK2);
    prop.setTemporalEaseAtKey(k, prop.keyInTemporalEase(k), sal);
    prop.setTemporalEaseAtKey(k2, ent, prop.keyOutTemporalEase(k2));
    prop.setInterpolationTypeAtKey(k, entradaDeK, KeyframeInterpolationType.BEZIER);
    prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, salidaDeK2);
  }

  // revisarTramos(prop, lista, donde) — LEE DE AE lo que quedo escrito y se niega si un tramo salio
  // con un extremo lineal y el otro bezier.
  //
  // ES UNA FUNCION APARTE Y NO UN PEDAZO DE `claves()` POR UNA RAZON QUE COSTO UNA PRUEBA FALSA: el
  // control negativo ensuciaba un tipo a mano y despues llamaba a `claves()` para que lo mirara, pero
  // `claves()` REESCRIBE todos los tipos antes de comprobarlos, asi que reparaba el defecto y la prueba
  // pasaba en verde sin haber probado nada. Separada, el defecto se puede fabricar y ver caer.
  function revisarTramos(prop, lista, dondeEstoy) {
    var i, mal = 0, primero = "";
    for (i = 0; i < lista.length - 1; i++) {
      var ka = prop.nearestKeyIndex(lista[i][0] / FPS);
      var kb = prop.nearestKeyIndex(lista[i + 1][0] / FPS);
      if (prop.keyOutInterpolationType(ka) === KeyframeInterpolationType.HOLD) { continue; }
      var salA = prop.keyOutInterpolationType(ka) === KeyframeInterpolationType.LINEAR;
      var entB = prop.keyInInterpolationType(kb) === KeyframeInterpolationType.LINEAR;
      if (salA !== entB) {
        mal++;
        if (!primero) {
          primero = "cuadros " + lista[i][0] + "->" + lista[i + 1][0] + " (curva '" +
                    (lista[i][2] || "LINEAL") + "'): sale " + (salA ? "LINEAL" : "BEZIER") +
                    " y entra " + (entB ? "LINEAL" : "BEZIER");
        }
      }
    }
    if (mal > 0) {
      throw new Error("tramo con tipos mezclados" + (dondeEstoy ? " en " + dondeEstoy : "") + ": " +
                      mal + " de " + (lista.length - 1) + ". El primero es " + primero + ". " +
                      "Un tramo tiene UNA forma: o los dos extremos son lineales, o los dos son " +
                      "bezier. Mezclados, el exportador los rechaza uno por uno y el documento sale " +
                      "INCOMPLETO. Se arregla dandole al tramo una curva de verdad en vez de LINEAL " +
                      "(o LINEAL a los dos), nunca tocando los tipos a mano despues de claves().");
    }
    return true;
  }
  api.revisarTramos = revisarTramos;

  // claves(prop, [[cuadro, valor, curva?], ...])
  // La curva es opcional y por defecto LINEAL. Los nombres validos son los de CURVAS mas "HOLD".
  function claves(prop, lista, dondeEstoy) {
    var i;
    if (!lista || lista.length < 1) { throw new Error("claves() sin lista" + (dondeEstoy ? " en " + dondeEstoy : "")); }
    for (i = 0; i < lista.length; i++) {
      var cu = lista[i][0];
      if (Math.abs(cu - Math.round(cu)) > 1e-9) {
        throw new Error("clave a mitad de cuadro: " + cu + (dondeEstoy ? " en " + dondeEstoy : "") +
                        ". Todas las claves caen en cuadro entero — con cuantizacion temporal una " +
                        "clave fraccionaria se redondea impredeciblemente y el golpe cae donde no era.");
      }
      if (i > 0 && lista[i][0] <= lista[i - 1][0]) {
        throw new Error("claves fuera de orden: " + lista[i - 1][0] + " -> " + lista[i][0] +
                        (dondeEstoy ? " en " + dondeEstoy : "") +
                        ". AE pisa la clave anterior en silencio y el gesto desaparece sin error.");
      }
    }
    for (i = 0; i < lista.length; i++) { prop.setValueAtTime(lista[i][0] / FPS, lista[i][1]); }
    for (i = 0; i < lista.length - 1; i++) {
      var nom = lista[i][2] || "LINEAL";
      var k = prop.nearestKeyIndex(lista[i][0] / FPS);
      var k2 = prop.nearestKeyIndex(lista[i + 1][0] / FPS);
      if (nom === "HOLD") {
        prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.HOLD);
      } else if (nom === "LINEAL") {
        // LA ENTRADA DE `k` NO ES MIA: ES DEL TRAMO ANTERIOR. Esta linea decia
        // `setInterpolationTypeAtKey(k, LINEAR, LINEAR)` y con eso pisaba el lado entrante que el tramo
        // de antes ya habia dejado en bezier. El resultado era un tramo con bezier de un lado y lineal
        // del otro, que `escena.mjs:129` RECHAZA con nombre — y con razon: esa forma no se puede
        // reproducir con un solo cubic-bezier, asi que el motor la aproximaria y saldria PARECIDO.
        // La linea de `k2` ya lo hacia bien (preserva su salida); esta era la unica que faltaba.
        prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.LINEAR);
        prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.LINEAR, prop.keyOutInterpolationType(k2));
      } else {
        var c = CURVAS[nom];
        if (!c) { throw new Error("curva desconocida: " + nom + ". Validas: LINEAL, SUAVE, C1..C4, C6..C8, HOLD"); }
        aplicarInfluencia(prop, k, k2, c);
      }
    }
    // ==========================================================================================
    // Y AHORA SE RELEE DE AE LO QUE QUEDO ESCRITO, CLAVE POR CLAVE.
    //
    // Esto no es paranoia: es la unica forma de que la ley valga para todos. Arriba arregle la rama
    // LINEAL, pero cualquier funcion de las siete familias puede tocar `setInterpolationTypeAtKey`
    // por su cuenta y volver a dejar un tramo mezclado. Un comentario avisando de eso lo lee quien ya
    // abrio este archivo; esta comprobacion la choca el que no sabia que existia.
    //
    // Y el sintoma que evita es el peor de todos: NO HAY SINTOMA. La comp se ve bien en AE —AE si
    // sabe dibujar bezier contra lineal— y el defecto recien aparece al exportar, como 162 lineas de
    // "tipos mezclados" que no dicen que funcion las escribio.
    revisarTramos(prop, lista, dondeEstoy);

    construidos++;
    return prop;
  }
  api.claves = claves;

  // ==============================================================================================
  // EL REBOTE INERCIAL — y las tres formas de que no exista
  // ==============================================================================================
  //
  // Lee la VELOCIDAD con la que la propiedad venia llegando y le suma un seno amortiguado. Es lo que
  // ninguna curva Bezier puede hacer: una Bezier termina con velocidad cero y no sobrepasa NUNCA.
  // Y sale proporcional gratis — un gesto rapido rebota mucho y uno lento casi nada, con los mismos
  // numeros. Medido en el abanico de la PIEZA-L: la placa que viaja 396 px rebota 9,7 y la de 132 px
  // rebota 3,2, sin calibrar ninguna por separado.
  //
  // LA FORMULA DEL SOBREPASO, que es lo que hay que calibrar y no `amp`:
  //     sobrepaso = v · amp · exp(−decay / (4·freq))          v en unidades/segundo
  // El pico cae en t = 1/(4·freq), y ahi el amortiguamiento ya se comio parte.
  //
  // TRES FORMAS DE QUE NO EXISTA, LAS TRES SIN NINGUN SINTOMA:
  //   1. las claves tienen EASE de entrada  -> la velocidad en la clave final es 0 -> rebote 0
  //   2. falta el corrimiento frameDuration/10 -> se lee la velocidad EN la parada, que es 0
  //   3. el gesto es demasiado lento -> v chica -> sobrepaso invisible
  // La (1) me paso a mi el mismo dia que escribi la ley: sobrepaso medido 0,11 px.
  var REBOTE_POR_DEFECTO = { amp: 0.06, freq: 1.8, decay: 5 };
  api.REBOTE = REBOTE_POR_DEFECTO;

  function cuerpoRebote(amp, freq, decay) {
    return lineas([
      "n = 0;",
      "if (numKeys > 0) {",
      "  n = nearestKey(time).index;",
      "  if (key(n).time > time) { n--; }",
      "}",
      "t = (n == 0) ? 0 : time - key(n).time;",
      "if (n > 0) {",
      // el corrimiento: sin el, la velocidad se lee EN la parada y vale cero
      "  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);",
      "  amp = " + amp + "; freq = " + freq + "; decay = " + decay + ";",
      "  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);",
      "} else { value; }"
    ]);
  }
  api.cuerpoRebote = cuerpoRebote;

  api.sobrepasoDe = function (velocidad, amp, freq, decay) {
    return Math.abs(velocidad) * amp * Math.exp(-decay / (4 * freq));
  };

  // conRebote(prop, [[cuadro, valor], ...], opciones)
  //
  // EL CONSTRUCTOR SEGURO. Fuerza las claves lineales, engancha la expresion, CALCULA el sobrepaso con
  // la formula y SE NIEGA A CONSTRUIR si da menos que el piso. La ley deja de poder desobedecerse.
  api.conRebote = function (prop, lista, o) {
    o = o || {};
    var amp = o.amp === undefined ? REBOTE_POR_DEFECTO.amp : o.amp;
    var freq = o.freq === undefined ? REBOTE_POR_DEFECTO.freq : o.freq;
    var decay = o.decay === undefined ? REBOTE_POR_DEFECTO.decay : o.decay;
    var piso = o.piso === undefined ? 4 : o.piso;
    var donde = o.donde || "(sin nombre)";

    if (lista.length < 2) {
      throw new Error("conRebote en " + donde + " necesita al menos dos claves: el rebote sale de la " +
                      "VELOCIDAD DE LLEGADA, y con una sola clave no hay llegada.");
    }
    // LEY (b) · las claves de un rebote van LINEALES, sin excepcion. Si alguien paso una curva, se tira:
    // silenciarlo seria construir un rebote que no rebota, que es peor que fallar.
    var i;
    for (i = 0; i < lista.length; i++) {
      if (lista[i][2] && lista[i][2] !== "LINEAL") {
        throw new Error("conRebote en " + donde + ": la clave del cuadro " + lista[i][0] + " pide la " +
                        "curva '" + lista[i][2] + "'. Las claves que alimentan un rebote van LINEALES. " +
                        "Una curva con ease de entrada llega con velocidad CERO y el rebote multiplica " +
                        "por cero: medido, 0,11 px de sobrepaso. El ease y el rebote no se suman, se anulan.");
      }
      lista[i][2] = "LINEAL";
    }

    // el ultimo tramo es el que decide: de ahi sale la velocidad de llegada
    var a = lista[lista.length - 2], b = lista[lista.length - 1];
    var dur = (b[0] - a[0]) / FPS;
    if (dur <= 0) { throw new Error("conRebote en " + donde + ": el ultimo tramo dura cero"); }

    var d = 0;
    if (typeof b[1] === "number") {
      d = Math.abs(b[1] - a[1]);
    } else {
      var q, m = 0;
      for (q = 0; q < b[1].length; q++) { m = Math.max(m, Math.abs(b[1][q] - a[1][q])); }
      d = m;
    }
    var v = d / dur;
    var sob = api.sobrepasoDe(v, amp, freq, decay);

    if (sob < piso) {
      // se calcula cuantos cuadros harian falta, para que el mensaje sirva y no solo acuse
      var durNecesaria = d * amp * Math.exp(-decay / (4 * freq)) / piso;
      var cuadrosNec = Math.max(1, Math.round(durNecesaria * FPS));
      throw new Error("conRebote en " + donde + ": el sobrepaso daria " + (Math.round(sob * 100) / 100) +
                      " unidades y el piso es " + piso + ". El gesto es demasiado LENTO: recorre " +
                      Math.round(d) + " unidades en " + (b[0] - a[0]) + " cuadros (" + Math.round(v) +
                      " u/s). Con " + cuadrosNec + " cuadros o menos llega al piso. " +
                      "Formula: sobrepaso = v * amp * exp(-decay/(4*freq)).");
    }

    claves(prop, lista, donde);
    expresion(prop, cuerpoRebote(amp, freq, decay), donde + " (rebote)");
    anotar("REBOTE|" + donde + "|v " + Math.round(v) + " u/s|sobrepaso " + (Math.round(sob * 10) / 10));
    return prop;
  };

  // ==============================================================================================
  // EXPRESIONES Y ENLACES
  // ==============================================================================================
  //
  // TODO ESTO SALE DE UNA SONDA, NO DE LA DOCUMENTACION. `tools/ae/sondas/enlaces.jsx` le pregunto a
  // AE las siete cosas de abajo y tres respuestas cambian el diseno:
  //
  //   · UNA EXPRESION ROTA NO TIRA: AE LA DESHABILITA Y DEVUELVE EL VALOR DE ABAJO. Medido: un enlace
  //     a una capa que no existe dejo la propiedad en su valor estatico y siguio como si nada. O sea
  //     que el sintoma de un enlace mal escrito es "esa capa no se mueve", sin una sola linea de error
  //     en ningun lado. Por eso `expresion()` RELEE `expressionError` y tira: es la unica forma de que
  //     el defecto aparezca al construir y no mirando el video.
  //
  //   · LA REFERENCIA CIRCULAR NO DA ERROR Y NO CUELGA: devuelve un valor por defecto en silencio.
  //     A -> B -> A dio opacidad 100 en las dos capas, con `expressionError` vacio en las dos. AE no
  //     nos va a avisar nunca, asi que el ciclo hay que impedirlo ANTES de escribir. De ahi el registro.
  //
  //   · EL NOMBRE DEL DESLIZADOR EN ESTE AE ES "Control del deslizador". No "Slider" ni "Deslizador":
  //     los tres son el mismo efecto con `matchName` ADBE Slider Control. Leerlo por nombre desde una
  //     expresion falla en cuanto cambia el idioma —medido: `effect("Slider")` tiro "el efecto
  //     denominado Slider falta o no existe"— y es exactamente el bug de los 41 errores del proyecto
  //     descargado. Aca se lee SIEMPRE POR INDICE.
  //
  // Y una que confirma el modelo que la biblioteca ya usaba: una expresion sobre claves propias lee
  // `value` como el valor interpolado de esas claves (claves de 20 y 80 con un slider en 7 dieron 27
  // y 87).

  // expresion(prop, cuerpo, donde) — el UNICO camino para escribir una expresion.
  function expresion (prop, cuerpo, donde) {
    prop.expression = cuerpo;
    var err = "";
    try { err = prop.expressionError; } catch (exE) { err = ""; }
    if (err !== "") {
      prop.expression = "";
      throw new Error("expresion rota en " + (donde || "?") + ".\n" +
                      "AE dice: " + err + "\n" +
                      "El cuerpo era:\n" + cuerpo + "\n" +
                      "OJO: AE no tira por esto — DESHABILITA la expresion y devuelve el valor de " +
                      "abajo. Sin esta comprobacion el sintoma habria sido 'esa capa no se mueve'.");
    }
    expresiones++;
    return prop;
  }
  api.expresion = expresion;

  // ---------------------------------------------------------------- el nulo de control
  //
  // UN SOLO LUGAR DEL QUE CUELGA TODA LA PIEZA. Es lo que hace que cambiar el pulso, la energia o el
  // desfase sea mover un deslizador en vez de editar cuarenta llamadas.
  //
  // Los deslizadores se RENOMBRAN para que en el panel de AE se lean "beat", "energia" y no tres
  // "Control del deslizador" iguales — pero la expresion los lee por INDICE igual, porque el nombre es
  // comodidad de lectura y el indice es lo que no se rompe.
  var LOS_CONTROLES = {};
  api.control = function (o) {
    o = o || {};
    var nombre = o.nombre || "control";
    if (LOS_CONTROLES[nombre]) { return LOS_CONTROLES[nombre]; }
    var valores = o.valores;
    if (!valores) { throw new Error("G.control necesita `valores`: {beat: 12, energia: 1, ...}"); }

    var capa = comp.layers.addNull(CUADROS / FPS);
    capa.name = nombre;
    // CAPA GUIA: AE la excluye del render y el exportador la saltea. Sin esto, cada deslizador se
    // informaba como un efecto que "no viaja" y el documento salia INCOMPLETO — un rechazo falso,
    // porque las expresiones que los leen ya estan horneadas y el valor viaja adentro de las muestras.
    try { capa.guideLayer = true; } catch (exGL) { }
    var fx = capa.property("ADBE Effect Parade");
    var nombres = [], k;
    for (k in valores) { if (valores.hasOwnProperty(k)) { nombres[nombres.length] = k; } }
    if (!nombres.length) { throw new Error("G.control " + nombre + ": `valores` vino vacio."); }

    var i;
    for (i = 0; i < nombres.length; i++) { fx.addProperty("ADBE Slider Control"); }
    // LAS REFERENCIAS SE PIDEN DESPUES DE AGREGARLOS TODOS. `addProperty` devuelve una referencia que
    // se INVALIDA al agregar el efecto siguiente: guardarla y usarla despues da "El objeto no es
    // valido". Medido en la sonda, y cuesta media hora encontrarlo.
    for (i = 0; i < nombres.length; i++) {
      var ef = fx.property(i + 1);
      ef.name = nombres[i];
      ef.property(1).setValue(valores[nombres[i]]);
    }

    var h = {
      capa: capa,
      nombre: nombre,
      orden: nombres,
      indice: function (que) {
        var j;
        for (j = 0; j < nombres.length; j++) { if (nombres[j] === que) { return j + 1; } }
        throw new Error("el control '" + nombre + "' no tiene '" + que + "'. Tiene: " + nombres.join(", "));
      },
      leer: function (que) {
        return 'thisComp.layer("' + nombre + '").effect(' + h.indice(que) + ')(1)';
      },
      poner: function (que, v) {
        capa.property("ADBE Effect Parade").property(h.indice(que)).property(1).setValue(v);
        return h;
      }
    };
    LOS_CONTROLES[nombre] = h;
    anotar("CONTROL|" + nombre + "|" + nombres.length + " deslizadores|" + nombres.join(","));
    return h;
  };

  // ---------------------------------------------------------------- el registro de enlaces
  //
  // Existe SOLO para impedir ciclos, porque AE no los detecta. Se guarda "esta capa depende de esta
  // otra" y antes de escribir se camina hacia arriba buscando volver al punto de partida.
  var DEPENDE = {};
  function registrarEnlace (hijo, padre, donde) {
    var visto = {}, pila = [padre], cur, i;
    while (pila.length) {
      cur = pila.pop();
      if (cur === hijo) {
        throw new Error("enlace circular en " + donde + ": '" + hijo + "' ya esta arriba de '" + padre +
                        "' en la cadena. AE NO detecta esto: no da error, no cuelga, y devuelve un " +
                        "valor por defecto en silencio (medido: dos opacidades enlazadas entre si " +
                        "dieron 100 las dos, con expressionError vacio). El ciclo se rompe aca.");
      }
      if (visto[cur]) { continue; }
      visto[cur] = true;
      var arriba = DEPENDE[cur] || [];
      for (i = 0; i < arriba.length; i++) { pila[pila.length] = arriba[i]; }
    }
    if (!DEPENDE[hijo]) { DEPENDE[hijo] = []; }
    DEPENDE[hijo][DEPENDE[hijo].length] = padre;
  }

  // ---------------------------------------------------------------- enlazar una propiedad con otra
  //
  // enlazar({ capa, prop, a, deQue, factor, offset, retardo, donde })
  //
  //   capa/prop  la propiedad que va a OBEDECER
  //   a          la capa LIDER
  //   deQue      "posX" | "posY" | "posZ" | "escala" | "opacidad" | "rotZ" ... (o una ruta cruda)
  //   factor     multiplicador (1 = igual, -1 = espejo, 0.4 = acompana al 40%)
  //   offset     se suma despues del factor
  //   retardo    EN CUADROS. El lider se lee en `time - retardo/fps`: es el arrastre.
  var RUTAS = {
    posX: "transform.xPosition", posY: "transform.yPosition", posZ: "transform.zPosition",
    pos: "transform.position", escala: "transform.scale", opacidad: "transform.opacity",
    rotZ: "transform.rotation", rotX: "transform.xRotation", rotY: "transform.yRotation",
    ancla: "transform.anchorPoint"
  };
  api.enlazar = function (o) {
    o = o || {};
    var donde = o.donde || "G.enlazar";
    if (!o.prop) { throw new Error(donde + ": falta `prop`, la propiedad que va a obedecer."); }
    if (!o.a) { throw new Error(donde + ": falta `a`, la capa lider."); }
    var deQue = o.deQue || "pos";
    var ruta = RUTAS[deQue] || deQue;
    var factor = o.factor === undefined ? 1 : o.factor;
    var offset = o.offset === undefined ? 0 : o.offset;
    var retardo = o.retardo === undefined ? 0 : o.retardo;
    if (retardo < 0) {
      throw new Error(donde + ": `retardo` es " + retardo + ". Un seguidor va DETRAS, no adelante: " +
                      "para leer el futuro el lider tendria que estar ya calculado, y no lo esta.");
    }
    // EL LIDER TIENE QUE TENER LAS DIMENSIONES SEPARADAS SI SE LE PIDE UN EJE SUELTO.
    //
    // `transform.xPosition` NO EXISTE en una capa cuya posicion no esta separada, y el sintoma no es un
    // error de la biblioteca: es AE deshabilitando la expresion y devolviendo el valor de abajo. Lo
    // encontro la prueba del enlace circular, que fallo por esto y no por el ciclo. `api.ejes` separa y
    // es idempotente, asi que llamarla aca no rompe nada de lo que el lider ya tuviera.
    if (deQue === "posX" || deQue === "posY" || deQue === "posZ") { api.ejes(o.a); }

    var quien = o.capa ? o.capa.name : "(?)";
    registrarEnlace(quien, o.a.name, donde);

    // SI EL LIDER TIENE PADRE, SU POSICION ES LOCAL Y NO SIRVE. Este defecto costo una vuelta entera:
    // `Gd.acuseDeGolpe` cuelga la capa de un nulo para poder acusarla, y desde ese momento su
    // `transform.xPosition` deja de ser una coordenada del mundo y pasa a ser un desplazamiento
    // respecto del padre. Una fila centrada en 960 leia -620, y el icono enlazado la siguio
    // obedientemente fuera del cuadro.
    //
    // No da error, no da aviso, y el sintoma —"el circulo esta fuera del cuadrado"— no nombra la causa.
    // `toWorld(anchorPoint)` devuelve la posicion en el mundo con la cadena de padres ya resuelta, que
    // es lo que un enlace necesita SIEMPRE que el lider cuelgue de algo.
    var COMP_EJE = { posX: 0, posY: 1, posZ: 2 };
    // Y SE USA SIEMPRE, NO SOLO SI EL LIDER YA TIENE PADRE. Preguntar por el padre EN EL MOMENTO DE
    // ENLAZAR es una trampa: el orden de las llamadas decide la respuesta. En esta misma pieza el
    // enlace se escribia antes que `Gd.acuseDeGolpe`, asi que la fila todavia no tenia padre, se elegia
    // la lectura local, y el acuse la emparentaba UN RENGLON DESPUES dejando el enlace apuntando a otra
    // cosa. `toWorld` da lo mismo en los dos casos y no depende de en que orden se escriba la pieza.
    var lect;
    if (COMP_EJE[deQue] !== undefined) {
      var L = 'thisComp.layer("' + o.a.name + '")';
      lect = L + '.toWorld(' + L + '.transform.anchorPoint)';
      if (retardo > 0) { lect = L + '.toWorld(' + L + '.transform.anchorPoint, time - ' + (retardo / FPS) + ')'; }
      lect = lect + '[' + COMP_EJE[deQue] + ']';
    } else {
      lect = 'thisComp.layer("' + o.a.name + '").' + ruta;
      if (retardo > 0) { lect = lect + '.valueAtTime(time - ' + (retardo / FPS) + ')'; }
    }
    var cuerpo = lineas([
      "v = " + lect + ";",
      "f = " + factor + "; o = " + offset + ";",
      "if (v.length) {",
      "  r = [];",
      "  for (var i = 0; i < v.length; i++) { r[i] = v[i] * f + o; }",
      "  r;",
      "} else { v * f + o; }"
    ]);
    expresion(o.prop, cuerpo, donde);
    anotar("ENLACE|" + donde + "|" + quien + " <- " + o.a.name + "." + deQue +
           "|factor " + factor + "|offset " + offset + "|retardo " + retardo);
    return o.prop;
  };

  // ---------------------------------------------------------------- el seguidor
  //
  // LA COREOGRAFIA GRATIS: una capa hace lo mismo que otra, N cuadros despues. Es el escalonado que
  // hasta ahora se escribia clave por clave, capa por capa — y ahi cambiar el retardo era editar
  // cuarenta numeros a mano. Aca es un numero.
  //
  // El retardo va en 2-8 cuadros: con menos no se lee como cascada (las dos capas parecen una sola) y
  // con mas se leen como gestos sueltos. Es la misma banda que el catalogo pide para el escalonado.
  api.seguir = function (o) {
    o = o || {};
    var donde = o.donde || "G.seguir";
    if (!o.capa) { throw new Error(donde + ": falta `capa`, la que sigue."); }
    if (!o.lider) { throw new Error(donde + ": falta `lider`, la que manda."); }
    var retardo = o.retardo === undefined ? 3 : o.retardo;
    if (retardo < 2 || retardo > 8) {
      throw new Error(donde + ": retardo de " + retardo + " cuadros. La banda es 2-8: con menos la " +
                      "cascada no se lee (las dos capas parecen una sola) y con mas se leen como dos " +
                      "gestos sueltos en vez de uno escalonado.");
    }
    var ejes = o.ejes || ["x", "y"];
    var d = o.desplazamiento || [0, 0, 0];
    var e = api.ejes(o.capa);
    var mapa = { x: "posX", y: "posY", z: "posZ" };
    var i, n = 0;
    for (i = 0; i < ejes.length; i++) {
      var eje = ejes[i];
      var prop = e[eje];
      if (!prop) { continue; }
      api.enlazar({
        capa: o.capa, prop: prop, a: o.lider, deQue: mapa[eje],
        factor: o.factor === undefined ? 1 : o.factor,
        offset: d[i] || 0, retardo: retardo,
        donde: donde + " (" + eje + ")"
      });
      n++;
    }
    if (!n) { throw new Error(donde + ": no se enlazo ningun eje. `ejes` fue " + ejes.join(",")); }
    anotar("SEGUIR|" + donde + "|" + o.capa.name + " <- " + o.lider.name + "|" + retardo + " cuadros");
    return o.capa;
  };

  // ==============================================================================================
  // EL PLANO TEMPORAL
  // ==============================================================================================
  api.plano = function (capa, desde, hasta) {
    capa.inPoint = desde / FPS;
    capa.outPoint = Math.min(hasta, CUADROS) / FPS;
    return capa;
  };

  // ==============================================================================================
  // EMPARENTAR
  // ==============================================================================================
  //
  // LEY (b) · AL EMPARENTAR, AE REESCRIBE POSICION **Y ANGULOS** DEL HIJO para conservar su
  // transformacion en el mundo. La regla conocida es "el padre primero, la posicion despues" y NO
  // ALCANZA: si el padre tiene ry = -104 en el momento de colgar, AE le escribe +104 al hijo.
  //
  // En la PIEZA-J una tira de seis paneles quedo girada 104 grados —de perfil, 17 px de ancho en vez de
  // 155— sin ningun error. Y paso DOS VECES: el nulo y despues cada panel, porque cada nivel calcula su
  // propia compensacion contra la orientacion del abuelo.
  //
  // Por eso esto es una funcion y no una linea suelta: es imposible acordarse del orden en cada capa.
  api.colgar = function (hijo, padre, posLocal) {
    hijo.parent = padre;
    try { api.ori(hijo).setValue([0, 0, 0]); } catch (e1) {}
    try { api.rotX(hijo).setValue(0); } catch (e2) {}
    try { api.rotY(hijo).setValue(0); } catch (e3) {}
    try { api.rotZ(hijo).setValue(0); } catch (e4) {}
    if (posLocal) { api.pos(hijo).setValue(posLocal); }
    return hijo;
  };

  // ==============================================================================================
  // RECURSOS
  // ==============================================================================================
  var cacheRec = {};
  api.recurso = function (archivo) {
    if (!RECURSOS) { throw new Error("G.iniciar necesita `recursos` para usar G.recurso()"); }
    if (cacheRec[archivo]) { return cacheRec[archivo]; }
    var f = new File(RECURSOS + "/" + archivo + ".png");
    if (!f.exists) { throw new Error("falta el recurso " + archivo + ".png en " + RECURSOS); }
    var itm = app.project.importFile(new ImportOptions(f));
    cacheRec[archivo] = itm;
    return itm;
  };

  // LEY (c) · Q2: LA IMAGEN NECESITA ENTRE 2x Y 4x LOS PIXELES CON LOS QUE SE DIBUJA.
  // `lectura-check` lo mide despues; aca se avisa al construir, que es cuando todavia es barato
  // regenerar el recurso con otro multiplicador.
  function revisarQ2(itm, nombre, escala) {
    // LO DECORATIVO NO ENTRA EN Q2, y no es una excusa: la regla existe para que no se vea borroso un
    // recorte CON DETALLE. Un degradado de fondo, una reticula de lineas de 1 px y una lamina de grano
    // no tienen frecuencia espacial que perder — medido en la PIEZA-K: 34 escalones de valor en 4200 px,
    // o sea un cambio cada 120. `lectura-check` exime los mismos prefijos por el mismo motivo; el nucleo
    // no lo hacia y avisaba seis veces por pieza sobre capas que estaban bien.
    //
    // Un aviso que se repite y siempre es falso ensena a ignorar todos los avisos.
    if (nombre.indexOf("deco-") === 0 || nombre.indexOf("grano") === 0 || nombre.indexOf("fondo") === 0) { return; }
    var dibujado = itm.width * escala / 100;
    if (dibujado <= 0) { return; }
    var razon = itm.width / dibujado;
    if (razon < 2) {
      avisar("Q2: '" + nombre + "' se dibuja a " + Math.round(dibujado) + " px con " + itm.width +
             " nativos = " + (Math.round(razon * 100) / 100) + "x. El piso es 2x — regenera el recurso " +
             "con un multiplicador mayor, o bajale la escala.");
    }
  }

  api.img = function (archivo, nombre, x, y, z, escala) {
    var itm = api.recurso(archivo);
    var c = comp.layers.add(itm);
    c.name = nombre;
    c.threeDLayer = true;
    api.pos(c).setValue([x, y, z]);
    api.esc(c).setValue([escala, escala, escala]);
    revisarQ2(itm, nombre, escala);
    construidos++;
    return c;
  };

  api.img2d = function (archivo, nombre, x, y, escala) {
    var itm = api.recurso(archivo);
    var c = comp.layers.add(itm);
    c.name = nombre;
    api.pos(c).setValue([x, y]);
    api.esc(c).setValue([escala, escala]);
    revisarQ2(itm, nombre, escala);
    construidos++;
    return c;
  };

  api.solido = function (nombre, color, w, h, x, y, z) {
    var s = comp.layers.addSolid(color, nombre, w, h, 1);
    if (z === undefined) { api.pos(s).setValue([x, y]); }
    else { s.threeDLayer = true; api.pos(s).setValue([x, y, z]); }
    construidos++;
    return s;
  };

  // ==============================================================================================
  // TIPOGRAFIA
  // ==============================================================================================
  //
  // LEY (c) · LA FAMILIA SE COMPRUEBA CONTRA LA SUSTITUTA.
  // AE sustituye en silencio: pedir una familia que no esta no da error, dibuja con otra. Y la pieza
  // pasa por TRES manos que fallan igual (AE, Chromium, Skia). Se mide como en `fuentes-skia.mjs`: se
  // pide un nombre imposible, se anota el ancho, y una familia que mida EXACTAMENTE eso no existe.
  var anchoSustituta = null;
  var fuentesVistas = {};

  function medirCon(familia, cadena, tam) {
    var t = comp.layers.addText(cadena);
    var p = api.docTexto(t);
    var d = p.value;
    d.fontSize = tam; d.tracking = 0;
    try { d.font = familia; } catch (exF) {}
    p.setValue(d);
    var r = t.sourceRectAtTime(0, false);
    t.remove();
    return r.width;
  }

  api.pedirFuente = function (familia) {
    if (fuentesVistas[familia]) { return true; }
    if (anchoSustituta === null) {
      anchoSustituta = medirCon("NoExisteEstaFuenteXYZ", "Handoff 95/100", 72);
    }
    var a = medirCon(familia, "Handoff 95/100", 72);
    if (Math.abs(a - anchoSustituta) < 0.01) {
      throw new Error("la familia \"" + familia + "\" NO existe en este AE: mide exactamente lo mismo " +
                      "que una inventada (" + a + " px). Dibujaria con la sustituta sin avisar. " +
                      "Ojo con el nombre: en AE va el PostScript (CenturyGothic, sin espacio) y en " +
                      "Skia el de familia (Century Gothic, con espacio).");
    }
    fuentesVistas[familia] = true;
    return true;
  };

  api.rotulo = function (o) {
    if (!o.cadena) { throw new Error("G.rotulo necesita `cadena`"); }
    api.pedirFuente(o.fuente);
    var t = comp.layers.addText(ac(o.cadena));
    var p = api.docTexto(t);
    var d = p.value;
    d.fontSize = o.tam || 72;
    d.fillColor = o.color || [0, 0, 0];
    d.applyFill = true;
    d.tracking = o.interletra || 0;
    d.justification = o.centrado === false ? ParagraphJustification.LEFT_JUSTIFY
                                           : ParagraphJustification.CENTER_JUSTIFY;
    try { d.font = o.fuente; } catch (exF2) {}
    p.setValue(d);
    if (o.nombre) { t.name = o.nombre; }
    t.threeDLayer = o.plana ? false : true;
    if (t.threeDLayer) { api.pos(t).setValue([o.x, o.y, o.z || 0]); }
    else { api.pos(t).setValue([o.x, o.y]); }
    construidos++;
    return t;
  };

  // ==============================================================================================
  // EL AVANCE DE UN CARACTER, que NO es su caja de tinta
  // ==============================================================================================
  //
  // LEY (b) · `sourceRectAtTime` devuelve la CAJA DE TINTA. La tinta de una "r" termina donde termina su
  // trazo; el AVANCE incluye el espacio que la separa de la letra siguiente. Midiendo tinta, la "r"
  // queda pegada a la "U" y sobra hueco antes de la "v" — se ve en el video y no lo dice ninguna
  // compuerta.
  //
  // El truco estandar: se mide con una LETRA SONDA pegada al final. La diferencia de tinta entre
  // "Ul" y "l" es el avance de la "U", porque la sonda arranca justo donde el avance la deja.
  api.avances = function (cadena, tam, fuente) {
    api.pedirFuente(fuente);
    var SONDA = "l";
    var base = medirCon(fuente, SONDA, tam);
    function avance(pref) { return medirCon(fuente, pref + SONDA, tam) - base; }
    var out = [], total = 0, i;
    for (i = 0; i < cadena.length; i++) {
      var w = avance(cadena.substring(0, i + 1)) - avance(cadena.substring(0, i));
      out[i] = w;
      total += w;
    }
    return { anchos: out, total: total };
  };

  // ==============================================================================================
  // LA CAMARA
  // ==============================================================================================
  //
  // LEY (a) · zoom = distancia, para que el plano z=0 se dibuje 1:1 y las coordenadas 2D y 3D coincidan.
  // LEY (a) · auto-orientacion APAGADA: por defecto la camara gira para mirar el punto de interes, y
  //           cualquier deriva lateral la inclina. Eso corto tres paneles en la PIEZA-I.
  //
  // Y `addCamera(nombre, [x,y])` NO pone la camara ahi: ese argumento es el PUNTO DE INTERES y la
  // posicion queda en [0,0,-zoom]. Se centra a mano.
  api.camara = function (o) {
    o = o || {};
    DIST_CAM = o.distancia || 2400;
    camara = comp.layers.addCamera(o.nombre || "camara", [ANCHO / 2, ALTO / 2]);
    api.pos(camara).setValue([ANCHO / 2, ALTO / 2, -DIST_CAM]);
    camara.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
    opcCam = camara.property("ADBE Camera Options Group");
    opcCam.property("ADBE Camera Zoom").setValue(DIST_CAM);
    if (o.profundidad) {
      opcCam.property("ADBE Camera Depth of Field").setValue(1);
      opcCam.property("ADBE Camera Focus Distance").setValue(DIST_CAM + (o.foco || 0));
      opcCam.property("ADBE Camera Aperture").setValue(o.apertura || 12);
    }
    construidos++;
    return camara;
  };
  api.opcCamara = function () { return opcCam; };
  api.distanciaCamara = function () { return DIST_CAM; };
  api.focoEn = function (z) { return z + DIST_CAM; };

  // LEY (c) · EL MOTOR DIBUJA LISO HASTA 24 px DE CIRCULO DE CONFUSION.
  //     coc = apertura · |d − enfoque| / d
  // Mas alla granula. Y la consecuencia que sorprende: con una apertura grande —la que hace falta para
  // que el relevo de foco se lea— NADA puede vivir mas alla de cierta Z. Despejado:
  //     d_max = enfoque / (1 − 24/apertura)
  api.revisarFoco = function (z, apertura, enfoqueZ, nombre) {
    var d = z + DIST_CAM;
    var f = enfoqueZ + DIST_CAM;
    if (d <= 0) {
      throw new Error("'" + nombre + "' esta DETRAS de la camara (z=" + z + "). Una capa 3D detras del " +
                      "ojo se proyecta invertida, pide un circulo de confusion enorme y `marco-check` " +
                      "la cuenta como miles de px fuera de cuadro. Calculale el punto de salida.");
    }
    var coc = apertura * Math.abs(d - f) / d;
    if (coc > 24) {
      avisar("foco: '" + nombre + "' pide " + Math.round(coc) + " px de circulo de confusion y el motor " +
             "dibuja liso hasta 24. Acercalo al plano de foco o bajale la apertura en ese tramo.");
    }
    return coc;
  };

  // ==============================================================================================
  // EL SUELO
  // ==============================================================================================
  //
  // LEY (a) · EL FONDO NUNCA ES UN SOLIDO PLANO. Es el reclamo que ya costo una pieza entera: "esta muy
  // vacio, el fondo demasiado simple". Van capas a distinta Z con deriva lenta.
  //
  // Y LA ESCALA SE CALCULA, NO SE ELIGE: a distancia d el factor de proyeccion es DIST/d, asi que un PNG
  // de W px al E% se dibuja W·E/100·DIST/d. Elegir 90% "porque parece" deja un borde visible.
  api.escalaParaCubrir = function (anchoNativo, altoNativo, z, margen) {
    var d = z + DIST_CAM;
    var factor = DIST_CAM / d;
    var nx = ANCHO / (anchoNativo * factor);
    var ny = ALTO / (altoNativo * factor);
    return Math.ceil(Math.max(nx, ny) * 100 * (margen || 1.25));
  };

  // EL GRANO CICLA. Con uno solo queda congelado y se lee como suciedad de la lente.
  api.grano = function (nombres, opacidad, cada) {
    cada = cada || 2;
    var capas = [], i;
    for (i = 0; i < nombres.length; i++) {
      var gr = api.img2d(nombres[i], "grano-" + i, ANCHO / 2, ALTO / 2, 100);
      api.op(gr).setValue(0);
      api.plano(gr, 0, CUADROS);
      capas[i] = gr;
    }
    for (i = 0; i < capas.length; i++) {
      var pg = api.op(capas[i]), cu, q;
      for (cu = 0; cu < CUADROS; cu += cada) {
        pg.setValueAtTime(cu / FPS, (Math.floor(cu / cada) % capas.length) === i ? opacidad : 0);
      }
      for (q = 1; q <= pg.numKeys; q++) {
        pg.setInterpolationTypeAtKey(q, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
      }
    }
    return capas;
  };

  // ==============================================================================================
  // CERRAR
  // ==============================================================================================
  api.cerrar = function () {
    comp.time = 0;
    anotar("CAPAS|" + comp.numLayers);
    anotar("CONSTRUIDOS|" + construidos);
    anotar("AVISOS|" + avisos.length);
    // SE GUARDA SOLO CUANDO LA PIEZA TIENE PROYECTO PROPIO. Sin esto el .aep queda en disco vacio —
    // el que se creo al arrancar— y todo lo construido vive nada mas que en la memoria de AE: se
    // pierde entero al cerrar la aplicacion, y peor, la proxima corrida lo abre y lo encuentra vacio.
    if (PROYECTO !== null) {
      app.project.save(PROYECTO);
      anotar("PROYECTO|" + PROYECTO.fsName);
    }
    anotar("--- fin ---");
    return { capas: comp.numLayers, avisos: avisos };
  };

  api.anotar = anotar;
  api.avisar = avisar;

  return api;
})();
