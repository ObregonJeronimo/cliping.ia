// ================================================================================================
// GESTO · FAMILIA E — ENTRADAS Y SALIDAS
// ================================================================================================
//
// POR QUE ESTA FAMILIA EXISTE APARTE, y no es simetria de catalogo.
//
// El catalogo original traia unas ciento cuarenta fichas de entradas y UNA frase sobre salidas. Una
// pieza con cuarenta entradas autoradas y cuarenta salidas por opacidad se siente exactamente igual
// de muerta: la mitad de los gestos de una pieza son "irse", y nadie los escribe. Estas doce
// funciones son seis entradas y seis salidas a proposito.
//
// LAS TRES LEYES DE LA FAMILIA. No estan escritas para que alguien se acuerde: estan hechas cumplir.
//
//   1. LA SALIDA DURA EL 60% DE LA ENTRADA, redondeado a par. Invertirlo es el motivo mas comun de
//      que una pieza "se sienta lenta". Todas las salidas de aca aceptan `durEntrada` y sacan su
//      propia duracion de ahi.                                    -> Ge.duracionDeSalida()
//
//   2. NINGUNA SALIDA SOBREPASA. El sobrepaso dice "llegue"; una salida no llega a ningun lado, y un
//      elemento que se va rebotando se lee como que se arrepintio. -> entradaConSobrepaso({esSalida:1}) TIRA.
//
//   3. UN GESTO QUE EMPIEZA EN CERO SOLO SE LEE SI EL OBJETO YA ESTABA AHI. Una anticipacion sobre
//      una capa que entra en ese mismo cuadro no se lee como carga: se lee como que aparecio de la
//      nada. Se comprueba contra el inPoint Y contra la opacidad, porque una capa viva con opacidad
//      cero es igual de invisible y el defecto no da sintoma.      -> exigirViva()
//
// LA TRAMPA QUE MAS CARA SALE ACA, y es de esta familia mas que de ninguna otra: `ADBE Position` es
// una propiedad ESPACIAL. Con TRES claves o mas —o sea, con cualquier sobrepaso, cualquier
// anticipacion y cualquier rebote— AE le pone tangentes auto-bezier y LA TRAYECTORIA SE CURVA SOLA.
// Un sobrepaso en X termina describiendo un arco en Y que nadie escribio, y encima el motor
// interpola distinto, asi que AE y el video ni siquiera se curvan igual. Por eso TODO lo que anima
// posicion en este archivo pasa por G.ejes(): separar dimensiones no es comodidad, elimina la
// interpolacion espacial de raiz.
//
// UNA ACLARACION DE VOCABULARIO QUE YA CONFUNDIO A ALGUIEN: el plan habla de C5 (deriva, 0/0) y el
// nucleo no la tiene. No falta: C5 ES "LINEAL". Pedir "C5" tira "curva desconocida".
//
// LO QUE ESTA FAMILIA NO PIDE: ni un PNG. Son doce gestos de transformacion pura mas un solido de
// tapa en E07. Si alguna de estas funciones te pide un recurso horneado, esta mal escrita.
//
// USO
//   (el nucleo ya esta cargado cuando esto corre; aca NO va #include)
//   G.iniciar({ nombre: "MI-PIEZA", cuadros: 240 });
//   var t = G.solido("tarjeta", [0.2, 0.5, 1], 300, 180, 700, 540, 0);
//   Ge.deslizarConFundido({ capa: t, cuadro: 30, dx: -60 });
//   Ge.salidaPorColapso({ capa: t, cuadro: 120, durEntrada: 14 });
//   G.cerrar();
// ================================================================================================

var Ge = (function () {

  var api = {};

  // ==============================================================================================
  // PLOMERIA
  // ==============================================================================================

  // `undefined` y `null` faltan; el cero NO falta. Un `if (!o.cuadro)` rechaza el cuadro 0, que es el
  // primero de la pieza y el mas usado de todos.
  function pedir(o, campo, quien) {
    if (o[campo] === undefined || o[campo] === null) {
      throw new Error(quien + " necesita `" + campo + "`");
    }
    return o[campo];
  }

  function nombreDe(o, capa) {
    if (o.donde) { return o.donde; }
    if (capa && capa.name) { return capa.name; }
    return "(sin nombre)";
  }

  // ES3 no tiene Math.sign
  function signo(x) { if (x > 0) { return 1; } if (x < 0) { return -1; } return 0; }

  function vec(n, v) { var a = [], i; for (i = 0; i < n; i++) { a[i] = v; } return a; }
  function copia(v) { var a = [], i; for (i = 0; i < v.length; i++) { a[i] = v[i]; } return a; }

  // "redondeado a par" de la regla de familia 1
  function aPar(x) {
    var r = Math.round(x / 2) * 2;
    if (r < 2) { r = 2; }
    return r;
  }
  api.duracionDeSalida = function (durEntrada) { return aPar(durEntrada * 0.6); };

  // Resuelve la duracion de una salida y avisa si contradice la regla de familia. No tira: hay
  // salidas legitimamente largas (un traslado, una meseta que se cierra), pero que sea a sabiendas.
  function durSalida(o, quien, don, porDefecto) {
    if (o.dur !== undefined) {
      if (o.durEntrada !== undefined) {
        var deb = api.duracionDeSalida(o.durEntrada);
        if (o.dur > deb + 2) {
          G.avisar(quien + " en " + don + ": la salida dura " + o.dur + " cuadros y la entrada duro " +
                   o.durEntrada + ", asi que le tocaban " + deb + " (60%, a par). Una salida mas larga " +
                   "que su entrada es el motivo numero uno de que una pieza se sienta lenta.");
        }
      }
      return o.dur;
    }
    if (o.durEntrada !== undefined) { return api.duracionDeSalida(o.durEntrada); }
    return porDefecto;
  }

  function esCamara(capa) {
    var si = false;
    try { si = (capa instanceof CameraLayer); } catch (exCam) { si = false; }
    return si;
  }

  function hayCamara() {
    var c = G.comp(), i;
    for (i = 1; i <= c.numLayers; i++) { if (esCamara(c.layer(i))) { return true; } }
    return false;
  }

  function obturador() {
    var c = G.comp(), o = { on: false, angulo: 180, fase: -90, muestras: 4 };
    try { o.on = c.motionBlur ? true : false; } catch (exOb) { o.on = false; }
    try { o.angulo = c.shutterAngle; } catch (exAn) { o.angulo = 180; }
    try { o.fase = c.shutterPhase; } catch (exFa) { o.fase = -90; }
    try { o.muestras = c.motionBlurSamplesPerFrame; } catch (exMu) { o.muestras = 4; }
    return o;
  }

  // ==============================================================================================
  // POSICION: siempre por dimensiones separadas
  // ==============================================================================================
  function pista(capa, eje, quien) {
    var e = G.ejes(capa);
    if (eje === "x") { return e.x; }
    if (eje === "y") { return e.y; }
    if (eje === "z") {
      if (e.z === null) {
        throw new Error(quien + ": '" + capa.name + "' no es una capa 3D, asi que no tiene eje Z. " +
                        "Prendele threeDLayer, o anima x/y. Ojo con la LEY 2: en una comp con camara, " +
                        "una capa 2D se dibuja SIEMPRE encima de todo el mundo 3D, sin importar el apilado.");
      }
      return e.z;
    }
    throw new Error(quien + ": eje desconocido '" + eje + "'. Validos: x, y, z");
  }

  // Con dimensiones separadas, `ADBE Position` deja de ser la fuente de verdad: hay que leer y
  // escribir las tres pistas. Leer la propiedad madre devuelve el valor que tenia ANTES de separar,
  // que es un dato viejo con cara de dato bueno.
  function leerPos(capa) {
    var p = G.pos(capa), sep = false;
    try { sep = p.dimensionsSeparated ? true : false; } catch (exLS) { sep = false; }
    if (!sep) { return p.value; }
    var e = G.ejes(capa);
    var v = [e.x.value, e.y.value];
    if (e.z !== null) { v[2] = e.z.value; }
    return v;
  }

  function ponerPos(capa, v) {
    var p = G.pos(capa), sep = false;
    try { sep = p.dimensionsSeparated ? true : false; } catch (exPS) { sep = false; }
    if (!sep) { p.setValue(v); return; }
    var e = G.ejes(capa);
    e.x.setValue(v[0]);
    e.y.setValue(v[1]);
    if (e.z !== null && v.length > 2) { e.z.setValue(v[2]); }
  }

  // ==============================================================================================
  // LA PROPIEDAD SOBRE LA QUE CAE EL GESTO
  // ==============================================================================================
  // Tres de estas fichas (E02, E03, E04) valen igual en posicion, escala y rotacion, y la unica
  // diferencia real es si el valor es un escalar o un vector. Resolverlo en un lugar evita tres
  // copias del mismo `if` — que es donde se cuelan las divergencias.
  function propDe(capa, o, quien) {
    var cual = o.propiedad === undefined ? "posicion" : o.propiedad;
    if (cual === "posicion") {
      var eje = o.eje === undefined ? "x" : o.eje;
      return { prop: pista(capa, eje, quien), vec: false, n: 1, unidad: "px", nombre: "pos" + eje };
    }
    if (cual === "escala") {
      var pe = G.esc(capa);
      return { prop: pe, vec: true, n: pe.value.length, unidad: "%", nombre: "escala" };
    }
    if (cual === "rotacion") {
      return { prop: G.rotZ(capa), vec: false, n: 1, unidad: "grados", nombre: "rotZ" };
    }
    throw new Error(quien + ": propiedad desconocida '" + cual + "'. Validas: posicion, escala, rotacion");
  }

  function valorDe(d) { return d.vec ? d.prop.value[0] : d.prop.value; }
  function comoValor(d, v) { return d.vec ? vec(d.n, v) : v; }

  // ==============================================================================================
  // ESTA VIVA Y SE VE
  // ==============================================================================================
  function opacidadEn(capa, cuadro) {
    var p = G.op(capa), v = 100;
    try { v = p.valueAtTime(cuadro / G.fps(), false); } catch (exOp) { v = p.value; }
    return v;
  }

  // LEY DE FAMILIA 3. Se miran las DOS cosas: una capa puede estar viva (inPoint 0, como manda la
  // LEY 7 para las formas) y ser invisible porque su opacidad todavia vale cero. Mirar solo el
  // inPoint deja pasar justo el caso que la LEY 7 fabrica.
  function exigirViva(capa, cuadro, margen, quien, don) {
    var fps = G.fps();
    var entra = Math.round(capa.inPoint * fps);
    var antes = cuadro - margen;
    if (entra > antes) {
      throw new Error(quien + " en " + don + ": el gesto arranca en el cuadro " + cuadro + " y la capa " +
                      "recien vive desde el " + entra + ". Un gesto que le pasa a algo que ya estaba " +
                      "(una carga, un acuse, una salida) no existe si el objeto no estaba: se lee como " +
                      "que aparecio de la nada, o directamente no se ve. Adelantale el inPoint al menos " +
                      margen + " cuadros, o usa una entrada (E01/E02) en vez de esto.");
    }
    var op = opacidadEn(capa, antes);
    if (op <= 1) {
      throw new Error(quien + " en " + don + ": en el cuadro " + antes + " la capa esta viva pero su " +
                      "opacidad vale " + Math.round(op) + ". Invisible es invisible: el gesto le va a " +
                      "pasar a algo que el espectador no vio nunca, y no da error ni sintoma — " +
                      "simplemente no pasa nada en pantalla. Resolvele la opacidad antes.");
    }
  }

  // ==============================================================================================
  // GEOMETRIA
  // ==============================================================================================
  function giroCero(capa) {
    var s = 0;
    try { s += Math.abs(G.rotZ(capa).value); } catch (exG1) { s += 0; }
    try { s += Math.abs(G.rotX(capa).value); } catch (exG2) { s += 0; }
    try { s += Math.abs(G.rotY(capa).value); } catch (exG3) { s += 0; }
    try {
      var o3 = G.ori(capa).value;
      s += Math.abs(o3[0]) + Math.abs(o3[1]) + Math.abs(o3[2]);
    } catch (exG4) { s += 0; }
    return s < 0.001;
  }

  // LA CAJA EN EL MUNDO, que NO es la posicion de la capa. `sourceRectAtTime` devuelve la caja de
  // TINTA en el espacio de la capa: para un texto empieza en la linea de base y no en el ancla, asi
  // que una tapa dimensionada con la posicion de la capa le pasa por al lado. Y para una capa 3D esto
  // devuelve unidades de MUNDO, no pixeles de pantalla; sirve igual porque la tapa es coplanar.
  function cajaMundo(o, capa, cuadro, quien) {
    if (o.ancho !== undefined && o.alto !== undefined && o.centro !== undefined) {
      return { cx: o.centro[0], cy: o.centro[1], ancho: o.ancho, alto: o.alto };
    }
    var don = nombreDe(o, capa);
    var tieneP = false;
    try { tieneP = (capa.parent !== null); } catch (exPa) { tieneP = false; }
    if (tieneP || !giroCero(capa)) {
      throw new Error(quien + " en " + don + ": la capa esta emparentada o girada, asi que su caja en " +
                      "el mundo no sale de sourceRect y no la voy a adivinar. Pasale `ancho`, `alto` y " +
                      "`centro` a mano — medidos, no estimados.");
    }
    var r = null;
    try { r = capa.sourceRectAtTime(cuadro / G.fps(), false); } catch (exSR) { r = null; }
    if (r === null || r.width <= 0 || r.height <= 0) {
      throw new Error(quien + " en " + don + ": no pude medir la caja con sourceRectAtTime. Pasale " +
                      "`ancho`, `alto` y `centro`.");
    }
    var anc = G.anc(capa).value;
    var esc = G.esc(capa).value;
    var pos = leerPos(capa);
    return {
      cx: pos[0] + (r.left + r.width / 2 - anc[0]) * esc[0] / 100,
      cy: pos[1] + (r.top + r.height / 2 - anc[1]) * esc[1] / 100,
      ancho: r.width * esc[0] / 100,
      alto: r.height * esc[1] / 100
    };
  }

  // Sumarle el mismo delta a TODAS las claves de un eje. La alternativa —negarse cuando la posicion
  // ya esta animada— convertiria a E06 en inservible en el caso normal, que es una capa que entro
  // deslizandose y despues colapsa.
  function correrEje(prop, delta) {
    var k;
    if (prop.numKeys === 0) { prop.setValue(prop.value + delta); return 0; }
    for (k = 1; k <= prop.numKeys; k++) {
      prop.setValueAtTime(prop.keyTime(k), prop.keyValue(k) + delta);
    }
    return prop.numKeys;
  }

  function correrPosVector(prop, dx, dy) {
    var k, v;
    if (prop.numKeys === 0) {
      v = copia(prop.value); v[0] += dx; v[1] += dy; prop.setValue(v); return 0;
    }
    for (k = 1; k <= prop.numKeys; k++) {
      v = copia(prop.keyValue(k)); v[0] += dx; v[1] += dy;
      prop.setValueAtTime(prop.keyTime(k), v);
    }
    return prop.numKeys;
  }

  // MOVER EL ANCLA MUEVE LA CAPA, y es el error de un valor que corre el cuadro entero: la posicion
  // dice donde cae el ANCLA, asi que cambiar el ancla de centro a borde teletransporta la capa medio
  // ancho. Aca se compensa, y se compensa TAMBIEN si la posicion ya estaba animada — sumandole el
  // corrimiento a todas las claves, que es exacto para una traslacion. Compensar un solo instante y
  // dejar los demas desalineados seria peor que no compensar: el defecto aparece a mitad del gesto.
  api.anclarEn = function (capa, ax, ay) {
    var don = capa.name;
    if (!giroCero(capa)) {
      throw new Error("anclarEn en " + don + ": la capa ya esta girada. La compensacion de posicion " +
                      "asume ejes alineados; con la capa girada te la corre. Movele el ancla ANTES de girarla.");
    }
    var pa = null;
    try { pa = capa.parent; } catch (exPar) { pa = null; }
    if (pa !== null && (!giroCero(pa) || Math.abs(G.esc(pa).value[0] - 100) > 0.001)) {
      throw new Error("anclarEn en " + don + ": el padre ('" + pa.name + "') esta girado o escalado, asi " +
                      "que el corrimiento del ancla no se traduce a la posicion local con una suma. " +
                      "Pone el ancla ANTES de colgar la capa.");
    }
    var an = G.anc(capa);
    if (an.numKeys > 0) {
      throw new Error("anclarEn en " + don + ": el ancla ya tiene claves y esto las pisaria.");
    }
    var v = an.value;
    var esc = G.esc(capa).value;
    var dx = (ax - v[0]) * esc[0] / 100;
    var dy = (ay - v[1]) * esc[1] / 100;
    var nv = [ax, ay];
    if (v.length > 2) { nv[2] = v[2]; }
    an.setValue(nv);

    var movidas = 0, p = G.pos(capa), sep = false;
    try { sep = p.dimensionsSeparated ? true : false; } catch (exAS) { sep = false; }
    if (sep) {
      var e = G.ejes(capa);
      movidas = correrEje(e.x, dx) + correrEje(e.y, dy);
    } else {
      movidas = correrPosVector(p, dx, dy);
    }
    if (movidas > 0) {
      G.avisar("anclarEn en " + don + ": la posicion ya tenia " + movidas + " claves y se les sumo el " +
               "corrimiento del ancla (" + Math.round(dx) + ", " + Math.round(dy) + "). Es exacto para " +
               "una traslacion; si esas claves venian de un rebote, el reposo se movio con ellas.");
    }
    return capa;
  };

  // ==============================================================================================
  // EL HORNEADO DE LA EXPRESION, que le pone techo a la frecuencia del rebote
  // ==============================================================================================
  // El exportador no manda la expresion: la MUESTREA, una vez por cuadro (`exportar.jsx`, HORNEADO).
  // O sea que la frecuencia del rebote esta atada al muestreo igual que cualquier senal: con periodo
  // de menos de 6 cuadros el motor va a dibujar OTRA curva que AE y el video no se va a parecer al
  // preview. Con 1,8 el periodo son 16,7 cuadros a 30 fps y sobra.
  function revisarHorneado(freq, quien, don) {
    var periodo = G.fps() / freq;
    if (periodo < 6) {
      throw new Error(quien + " en " + don + ": freq " + freq + " da un periodo de " +
                      (Math.round(periodo * 10) / 10) + " cuadros, y el exportador hornea la expresion " +
                      "con UNA muestra por cuadro. Por debajo de 6 cuadros de periodo el motor dibuja " +
                      "otra curva que AE y no lo caza nadie. Bajala a " +
                      (Math.round(G.fps() / 8 * 10) / 10) + " o menos.");
    }
    if (periodo < 10) {
      G.avisar(quien + " en " + don + ": periodo de " + (Math.round(periodo * 10) / 10) + " cuadros. " +
               "Entra, pero el horneado a una muestra por cuadro ya empieza a redondear los picos.");
    }
  }

  // El rebote se engancha a TODAS las claves de la propiedad, no solo a la ultima: la expresion lee
  // `nearestKey` en cada instante. Si la pista ya venia con claves, cada parada anterior tambien va a
  // rebotar — y eso no da error, da una pieza con rebotes que nadie pidio.
  function avisarClavesPrevias(prop, cuadro, quien, don) {
    if (prop.numKeys > 0) {
      G.avisar(quien + " en " + don + ": la propiedad ya tenia " + prop.numKeys + " claves antes del " +
               "cuadro " + cuadro + ". La expresion del rebote se aplica a TODAS: cada parada previa " +
               "va a rebotar tambien. Si no es lo que queres, pone el gesto en otra pista o en un nulo propio.");
    }
  }

  // ==============================================================================================
  // EL REGISTRO DE SOBREPASOS SIMULTANEOS
  // ==============================================================================================
  // "No mas de 3 elementos con sobrepaso a la vez" es criterio, y el criterio no se puede comentar:
  // se cuenta. Cuatro cosas rebotando en la misma ventana se lee como gelatina y es de los defectos
  // que solo aparecen cuando la pieza ya esta armada.
  var sobrepasos = [];
  function registrarSobrepaso(a, b, quien, don) {
    var i, chocan = [], n = 0;
    for (i = 0; i < sobrepasos.length; i++) {
      if (a <= sobrepasos[i].b && b >= sobrepasos[i].a) { n++; chocan[chocan.length] = sobrepasos[i].quien; }
    }
    if (n >= 3) {
      throw new Error(quien + " en " + don + ": ya hay " + n + " sobrepasos vivos en la ventana " + a +
                      "-" + b + " (" + chocan.join(", ") + ") y este seria el " + (n + 1) + ". Mas de " +
                      "tres cosas rebotando a la vez se lee como gelatina, no como vida. Escalona los " +
                      "arranques (D04) o sacale el sobrepaso a los que no son el protagonista.");
    }
    sobrepasos[sobrepasos.length] = { a: a, b: b, quien: don };
  }
  // para una segunda comp en el mismo script
  api.olvidarSobrepasos = function () { sobrepasos = []; };

  // ==============================================================================================
  // E01 · DESLIZAMIENTO CON DESVANECIDO
  // ==============================================================================================
  //
  // La entrada mas usada del oficio y la que peor se copia, porque el gesto NO es "posicion mas
  // opacidad": es el DESFASE entre las dos. La opacidad tiene que resolverse a los 8-10 cuadros de
  // 14-18 — antes de que el objeto frene. Si terminan juntas, el elemento parece llegar tarde a su
  // propio lugar, y esa media docena de cuadros es literalmente la mitad del oficio de esta ficha.
  //
  // AL SALIR ES AL REVES, por el mismo argumento dado vuelta: si la opacidad se va primero, el objeto
  // desaparece antes de moverse y el movimiento no se lee. AVISO HONESTO: el numero de la entrada
  // (60% del recorrido) esta publicado; el de la salida (arranca al 30%) es la simetria que deduje,
  // no una cifra de nadie. Se puede pisar con `finFundido` / `iniFundido`.
  //
  // Y HACE UNA COSA MAS QUE NO SE VE: si la opacidad no tenia ninguna clave, le pone una en el cuadro
  // 0 en cero, con HOLD. Es la LEY 7 — las capas de forma van con inPoint 0 y se ocultan con
  // opacidad, porque una forma con inPoint > 0 puede rasterizar VACIA. Sin esa clave, la capa se ve
  // desde el cuadro 0 hasta su entrada.
  api.deslizarConFundido = function (o) {
    o = o || {};
    var quien = "E01 deslizarConFundido";
    var capa = pedir(o, "capa", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var don = nombreDe(o, capa);
    var sale = (o.sentido === "sale");
    var dur = sale ? durSalida(o, quien, don, 8) : (o.dur === undefined ? 14 : o.dur);
    var dx = o.dx === undefined ? 0 : o.dx;
    var dy = o.dy === undefined ? 0 : o.dy;
    var dz = o.dz === undefined ? 0 : o.dz;
    var curva = o.curva === undefined ? (sale ? "C3" : "C1") : o.curva;

    if (dur < 2) { throw new Error(quien + " en " + don + ": dur " + dur + " no alcanza para nada."); }

    var recorrido = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (recorrido < 1) {
      throw new Error(quien + " en " + don + ": no hay desplazamiento (dx, dy y dz en cero). Un fundido " +
                      "solo no es E01: es opacidad, y la opacidad sola es exactamente lo que hace que " +
                      "una pieza se sienta muerta. Si de verdad queres solo opacidad, es E12 (corte) o " +
                      "es un error de guion.");
    }
    if (recorrido < 20) {
      G.avisar(quien + " en " + don + ": " + Math.round(recorrido) + " px de recorrido. Por debajo de 20 " +
               "no se lee como deslizamiento, se lee como que la capa tiembla. El rango del oficio es 40-80.");
    }
    if (recorrido > 140) {
      G.avisar(quien + " en " + don + ": " + Math.round(recorrido) + " px de recorrido ya es un TRASLADO " +
               "(D06: 200-1500 px, 24-40 cuadros), no un desliz. Con 14 cuadros va a cruzar el cuadro " +
               "como un latigazo sin serlo.");
    }
    if (!sale && dur > 18) {
      G.avisar(quien + " en " + don + ": " + dur + " cuadros. La entrada estandar vive entre 14 y 18; " +
               "de 24 para arriba se siente muerta (a 120 bpm un beat son 15 cuadros).");
    }

    // el desfase, que es el gesto
    var iniFundido = o.iniFundido === undefined ? (sale ? cuadro + Math.round(dur * 0.3) : cuadro) : o.iniFundido;
    var finFundido = o.finFundido === undefined ? (sale ? cuadro + dur : cuadro + Math.round(dur * 0.6)) : o.finFundido;
    if (finFundido <= iniFundido) {
      throw new Error(quien + " en " + don + ": el fundido iria del cuadro " + iniFundido + " al " +
                      finFundido + ", que no es un tramo.");
    }
    if (!sale && finFundido >= cuadro + dur) {
      throw new Error(quien + " en " + don + ": la opacidad terminaria en el cuadro " + finFundido +
                      " y la posicion en el " + (cuadro + dur) + ". LA OPACIDAD TIENE QUE " +
                      "TERMINAR ANTES: si terminan juntas el elemento parece llegar tarde a su propio " +
                      "lugar. El numero del oficio es el 60% del recorrido (aca, cuadro " +
                      (cuadro + Math.round(dur * 0.6)) + ").");
    }

    var pistas = [], ejes = ["x", "y", "z"], deltas = [dx, dy, dz], k;
    var pos = leerPos(capa);
    for (k = 0; k < 3; k++) {
      if (deltas[k] === 0) { continue; }
      var pk = pista(capa, ejes[k], quien);
      var reposo = pos[k];
      var a = sale ? reposo : reposo + deltas[k];
      var b = sale ? reposo + deltas[k] : reposo;
      G.claves(pk, [[cuadro, a, curva], [cuadro + dur, b]], don + "/" + ejes[k]);
      pistas[pistas.length] = pk;
    }

    // LA UNICA VEZ QUE EASY EASE ES LA RESPUESTA CORRECTA y no la firma de plantilla: la ficha de
    // opacidad del catalogo pide cubic-bezier(0.33, 0, 0.67, 1), que es influencia 33/33 exacta, o sea
    // SUAVE. Una opacidad casi nunca quiere una curva agresiva.
    var op = G.op(capa);
    var lista = [];
    if (sale) {
      lista = [[iniFundido, 100, "SUAVE"], [finFundido, 0]];
    } else {
      if (op.numKeys === 0 && cuadro > 0) { lista[lista.length] = [0, 0, "HOLD"]; }
      lista[lista.length] = [cuadro, 0, "SUAVE"];
      lista[lista.length] = [finFundido, 100];
    }
    G.claves(op, lista, don + "/opacidad");

    G.anotar("E01|" + don + "|" + (sale ? "sale" : "entra") + "|c" + cuadro + "+" + dur + "|recorrido " +
             Math.round(recorrido) + "|fundido " + iniFundido + "-" + finFundido);
    return { capa: capa, pistas: pistas, opacidad: op, dur: dur, finFundido: finFundido };
  };

  // ==============================================================================================
  // E02 · ENTRADA CON SOBREPASO
  // ==============================================================================================
  //
  // El objeto entra pasandose de largo y vuelve. Es lo que hace que algo se sienta VIVO en vez de
  // traducido — y es tambien el gesto que mas rapido arruina una pieza si se pone en todo.
  //
  // DOS MODOS, y los dos son legitimos:
  //   · "rebote" (por defecto) — G.conRebote: la expresion lee la velocidad de llegada y le suma un
  //     seno amortiguado. Sale PROPORCIONAL gratis: la placa que viaja 400 px rebota mucho y la que
  //     viaja 130 rebota poco, con los mismos numeros y sin calibrar ninguna.
  //   · "claves" — las tres claves del manual (0 -> 106 -> 100). Deterministico, sin expresion, y es
  //     lo unico que sirve cuando el sobrepaso tiene que valer un numero exacto.
  //
  // Y UN TERCER MODO QUE NO EXISTE Y HAY QUE DECIRLO: "curva". easeOutBack es
  // cubic-bezier(0.34, 1.56, 0.64, 1) y ese 1.56 esta FUERA DEL RANGO de una influencia de AE, que
  // vive en [0,100] y no puede producir y>1. No hay curva que sobrepase. Pedir modo "curva" tira.
  //
  // CUANDO NO (y esto es la mitad de la ficha): texto de lectura · cifras y datos · masas de mas del
  // 40% del cuadro · CUALQUIER SALIDA · cuando el elemento le entrega el turno al siguiente · en mas
  // de 3 elementos a la vez · marcas serias (banco, salud, lujo: 0-3% o nada). Las cuatro que se
  // pueden medir, se miden y tiran; la masa se mide y avisa.
  api.entradaConSobrepaso = function (o) {
    o = o || {};
    var quien = "E02 entradaConSobrepaso";
    var capa = pedir(o, "capa", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var don = nombreDe(o, capa);
    var modo = o.modo === undefined ? "rebote" : o.modo;

    if (o.esSalida) {
      throw new Error(quien + " en " + don + ": REGLA DE FAMILIA — ninguna salida sobrepasa. El " +
                      "sobrepaso dice 'llegue', y una salida no llega a ningun lado: un elemento que " +
                      "se va rebotando se lee como que se arrepintio. Usa E06 (colapso), E07 (tapa) o " +
                      "E01 con sentido 'sale'.");
    }
    if (o.textoDeLectura) {
      throw new Error(quien + " en " + don + ": no se sobrepasa el texto de lectura. Una linea que " +
                      "rebota se vuelve ilegible justo en los cuadros en que el ojo la engancha. " +
                      "El gesto de entrada de texto es T04 (revelado con tapa retrasada).");
    }
    if (o.cifra) {
      throw new Error(quien + " en " + don + ": no se sobrepasan las cifras ni los datos. Un numero " +
                      "que rebota se lee como que el dato es aproximado. Si queres que la cifra haga " +
                      "algo, es U07 (odometro).");
    }
    if (modo === "curva") {
      throw new Error(quien + " en " + don + ": NO EXISTE la curva que sobrepasa. easeOutBack es " +
                      "cubic-bezier(0.34, 1.56, 0.64, 1) y la influencia de AE vive en [0,100]: no " +
                      "puede producir y>1 ni por casualidad. Reemplazos, los dos exactos: modo " +
                      "'claves' (tres claves, C1 subiendo y C8 volviendo) o modo 'rebote' (G.conRebote).");
    }

    var dur = o.dur === undefined ? 12 : o.dur;
    if (dur < 6 || dur > 16) {
      G.avisar(quien + " en " + don + ": " + dur + " cuadros al pico. El rango del oficio es 10-14.");
    }

    // la masa: >40% del cuadro no sobrepasa. Se mide si se puede; si la capa esta emparentada o
    // girada, cajaMundo tira y no se mide — no se inventa.
    var caja = null;
    try { caja = cajaMundo(o, capa, cuadro + dur, quien); } catch (exCj) { caja = null; }
    if (caja !== null) {
      var frac = (caja.ancho * caja.alto) / (G.ancho() * G.alto());
      if (frac > 0.40) {
        G.avisar(quien + " en " + don + ": la capa ocupa el " + Math.round(frac * 100) + "% del cuadro. " +
                 "Por encima del 40% el sobrepaso deja de leerse como vida y se lee como gelatina: una " +
                 "masa grande tiene inercia y la inercia no rebota.");
      }
    }

    var d = propDe(capa, o, quien);
    var hasta = o.hasta === undefined ? valorDe(d) : o.hasta;
    var desde = o.desde;
    if (desde === undefined) {
      if (o.entrada !== undefined) { desde = hasta + o.entrada; }
      else if (d.unidad === "%") { desde = 0; }   // la escala nace de cero: 0 -> 106 -> 100
      else {
        throw new Error(quien + " en " + don + ": deciles de donde entra, con `desde` (valor) o " +
                        "`entrada` (desplazamiento respecto del reposo).");
      }
    }
    if (desde === hasta) { throw new Error(quien + " en " + don + ": desde y hasta son el mismo valor."); }

    // ESTA FAMILIA TRABAJA SOBRE UNA PROPIEDAD ESCALAR, y sin esta negativa un arreglo se cuela hasta el
    // fondo: `Math.abs(hasta - desde)` sobre dos arreglos da NaN, el sobrepaso da NaN, ninguna
    // comparacion contra el piso o el techo es verdadera —NaN no es mayor ni menor que nada, asi que
    // los DOS guardas se saltean solos— y recien explota `setValueAtTime` con "Array no es un numero",
    // que no dice donde ni por que. Lo pise armando la prueba de integracion.
    if (typeof desde !== "number" || typeof hasta !== "number") {
      throw new Error(quien + " en " + don + ": `desde` y `hasta` son NUMEROS, no arreglos. Esta " +
                      "funcion anima UNA propiedad escalar. Para mover en dos ejes usa G.ejes(capa) y " +
                      "llamala una vez por eje — que ademas es lo correcto, porque un rebote en X no " +
                      "tiene por que tocar Y.");
    }

    var res = { capa: capa, prop: d.prop, modo: modo, dur: dur };

    if (modo === "rebote") {
      var amp = o.amp === undefined ? G.REBOTE.amp : o.amp;
      var freq = o.freq === undefined ? G.REBOTE.freq : o.freq;
      var decay = o.decay === undefined ? G.REBOTE.decay : o.decay;
      var esPos = (d.unidad === "px");
      var piso = o.piso === undefined ? (esPos ? 8 : 3) : o.piso;
      var techo = o.techo === undefined ? (esPos ? 14 : 10) : o.techo;

      revisarHorneado(freq, quien, don);
      avisarClavesPrevias(d.prop, cuadro, quien, don);

      var dist = Math.abs(hasta - desde);
      var v = dist / (dur / G.fps());
      var sob = G.sobrepasoDe(v, amp, freq, decay);
      if (sob > techo) {
        // cuantos cuadros harian falta para bajar del techo, para que el mensaje sirva y no solo acuse
        var durNec = dist * amp * Math.exp(-decay / (4 * freq)) / techo;
        throw new Error(quien + " en " + don + ": el sobrepaso daria " + (Math.round(sob * 10) / 10) +
                        " " + d.unidad + " y el techo es " + techo + ". El excedente de una entrada vive " +
                        "entre 8 y 14 px; mas que eso es un rebote, y el rebote es E04 y se calibra " +
                        "distinto. Arreglos: estirar el gesto a " + Math.ceil(durNec * G.fps()) +
                        " cuadros o mas, o bajar amp (hoy " + amp + "). " +
                        "Formula: sobrepaso = v * amp * exp(-decay/(4*freq)).");
      }
      G.conRebote(d.prop, [[cuadro, comoValor(d, desde)], [cuadro + dur, comoValor(d, hasta)]],
                  { amp: amp, freq: freq, decay: decay, piso: piso, donde: don + "/" + d.nombre });
      // el bamboleo esta visualmente muerto a los 12-15 cuadros (decaimiento 5, medido por Ebberts)
      registrarSobrepaso(cuadro, cuadro + dur + Math.round(G.fps() / 2), quien, don);
      res.sobrepaso = sob;
      G.anotar("E02|" + don + "|rebote|" + d.nombre + "|c" + cuadro + "+" + dur + "|sobrepaso " +
               (Math.round(sob * 10) / 10) + " " + d.unidad);

    } else if (modo === "claves") {
      // LA VUELTA ES LA MITAD O MENOS. Si la vuelta dura lo mismo que la ida, el objeto no vuelve:
      // oscila, y eso se ve gomoso — es la diferencia entre "aterrizo" y "es de goma".
      var vuelta = o.vuelta === undefined ? Math.max(2, Math.round(dur * 0.45)) : o.vuelta;
      if (vuelta > dur / 2) {
        throw new Error(quien + " en " + don + ": la vuelta dura " + vuelta + " cuadros y la ida " + dur +
                        ". La vuelta es la mitad o menos (5-7 contra 10-14), o el gesto se ve gomoso.");
      }
      var pico = o.pico;
      if (pico === undefined) {
        pico = (d.unidad === "%") ? (hasta + 6) : (hasta + signo(hasta - desde) * 10);
      }
      var exceso = Math.abs(pico - hasta);
      if (d.unidad === "%" && exceso > 15) {
        G.avisar(quien + " en " + don + ": el pico se pasa " + Math.round(exceso) + " puntos de escala. " +
                 "Por encima de 15 ya es dibujo animado; el rango es 6-12.");
      }
      if (d.unidad === "px" && exceso > 14) {
        G.avisar(quien + " en " + don + ": el excedente es " + Math.round(exceso) + " px y el rango del " +
                 "oficio es 8-14.");
      }
      G.claves(d.prop, [[cuadro, comoValor(d, desde), "C1"],
                        [cuadro + dur, comoValor(d, pico), "C8"],
                        [cuadro + dur + vuelta, comoValor(d, hasta)]], don + "/" + d.nombre);
      registrarSobrepaso(cuadro, cuadro + dur + vuelta, quien, don);
      res.pico = pico;
      res.vuelta = vuelta;
      G.anotar("E02|" + don + "|claves|" + d.nombre + "|c" + cuadro + "+" + dur + "+" + vuelta +
               "|pico " + Math.round(pico));

    } else {
      throw new Error(quien + ": modo desconocido '" + modo + "'. Validos: rebote, claves.");
    }
    return res;
  };

  // ==============================================================================================
  // E03 · ANTICIPACION
  // ==============================================================================================
  //
  // Antes de ir hacia alla, va un poco hacia aca. Sin anticipacion un movimiento EMPIEZA; con
  // anticipacion un movimiento SE DECIDE.
  //
  // DOS COSAS QUE LA MATAN, las dos silenciosas:
  //   1. Que el objeto no estuviera ahi. Una carga sobre algo que aparece en ese mismo cuadro no se
  //      lee como carga: se lee como que aparecio de la nada. Por eso esto exige `exigirViva`, que
  //      mira el inPoint Y la opacidad.
  //   2. Ponerle ease de salida a la clave de anticipacion. La carga SE PAGA CON VELOCIDAD: la clave
  //      cargada tiene que arrancar a maxima velocidad hacia el destino (influencia de salida 0), y
  //      eso es C7. Con una curva simetrica ahi, la anticipacion se convierte en un paseo de ida y
  //      vuelta y el gesto se pierde entero.
  //
  // NO VA EN: barras de progreso, cifras, y cualquier cosa que ya este en pantalla y solo cambie de
  // estado — ahi la anticipacion se lee como duda.
  api.anticipacion = function (o) {
    o = o || {};
    var quien = "E03 anticipacion";
    var capa = pedir(o, "capa", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var don = nombreDe(o, capa);
    var dur = o.dur === undefined ? 12 : o.dur;
    var margen = o.margenVivo === undefined ? 2 : o.margenVivo;

    exigirViva(capa, cuadro, margen, quien, don);

    var d = propDe(capa, o, quien);
    var desde = o.desde === undefined ? valorDe(d) : o.desde;
    var hasta = pedir(o, "hasta", quien);
    var recorrido = hasta - desde;
    if (Math.abs(recorrido) < 1) {
      throw new Error(quien + " en " + don + ": desde " + desde + " hasta " + hasta + " no es un " +
                      "movimiento, y una anticipacion sin movimiento principal es un tic.");
    }

    // 3-5 cuadros para un gesto rapido, 6-8 para uno pesado. NUNCA mas de 8.
    var ant = o.anticipacion === undefined ? (dur <= 12 ? 4 : 6) : o.anticipacion;
    if (ant < 1) { throw new Error(quien + " en " + don + ": la anticipacion no puede durar 0 cuadros."); }
    if (ant > 8) {
      throw new Error(quien + " en " + don + ": " + ant + " cuadros de anticipacion. Pasando 8 deja de " +
                      "leerse como carga y se lee como un movimiento aparte — el espectador cuenta dos " +
                      "gestos y el golpe se pierde. El rango es 3-5 rapido / 6-8 pesado.");
    }

    // LA MAGNITUD NO SE MIDE IGUAL EN LAS TRES PROPIEDADES, y esto no es un capricho: en posicion la
    // carga es PROPORCIONAL al recorrido (8-15%), porque un viaje largo tiene que cargar mas. En
    // escala y en rotacion los numeros del oficio son ABSOLUTOS (-3 puntos de escala, -6 grados) — un
    // 3% de un recorrido de escala de 30 puntos daria 0,9 puntos, o sea una carga invisible. Tomar la
    // regla de posicion y aplicarla a las tres es el error que deja la anticipacion sin existir.
    var mag, magAbs;
    if (d.unidad === "px") {
      mag = o.magnitud === undefined ? 0.12 : o.magnitud;
      if (mag <= 0) { throw new Error(quien + " en " + don + ": la magnitud va en positivo; el sentido lo pongo yo."); }
      if (mag > 0.30) {
        G.avisar(quien + " en " + don + ": magnitud " + Math.round(mag * 100) + "% del recorrido. El " +
                 "rango es 8-15%; por encima del 30% la anticipacion compite con el gesto en vez de cargarlo.");
      }
      magAbs = Math.abs(recorrido) * mag;
    } else {
      magAbs = o.magnitud === undefined ? (d.unidad === "%" ? 3 : 6) : o.magnitud;
      if (magAbs <= 0) { throw new Error(quien + " en " + don + ": la magnitud va en positivo; el sentido lo pongo yo."); }
      if (magAbs > Math.abs(recorrido)) {
        G.avisar(quien + " en " + don + ": la carga (" + magAbs + " " + d.unidad + ") es mas grande que " +
                 "el gesto (" + Math.round(Math.abs(recorrido)) + "). Eso ya no es anticipacion: es un " +
                 "gesto de ida y vuelta con una excursion al final.");
      }
    }
    // EL SENTIDO LO PONE LA FUNCION. Pedir la magnitud con signo es la forma mas comoda que hay de
    // escribir una anticipacion que carga para el MISMO lado que el gesto, y eso no da error: da nada.
    var carga = desde - signo(recorrido) * magAbs;

    // C1 para entrar a la carga (20/85, lo mas cerca del 20/70 del manual) y C7 para salir de ella
    // (influencia de salida 0,1: arranca a maxima velocidad).
    G.claves(d.prop, [[cuadro, comoValor(d, desde), "C1"],
                      [cuadro + ant, comoValor(d, carga), "C7"],
                      [cuadro + ant + dur, comoValor(d, hasta)]], don + "/" + d.nombre);

    G.anotar("E03|" + don + "|" + d.nombre + "|c" + cuadro + "|carga " + ant + " cuadros " +
             (Math.round((carga - desde) * 10) / 10) + " " + d.unidad + "|gesto " + dur);
    return { capa: capa, prop: d.prop, carga: carga, cuadroCarga: cuadro + ant, fin: cuadro + ant + dur };
  };

  // ==============================================================================================
  // E04 · REBOTE AMORTIGUADO
  // ==============================================================================================
  //
  // No un sobrepaso sino varios, cada uno mas chico. Es el gesto que mas rapido envejece una pieza:
  // maximo TRES oscilaciones. Cuatro es decorativo, cinco es juguete, y eso no es opinion sino la
  // linea que separa "app amigable" de "pieza de 2012".
  //
  // LOS DOS MODOS NO SON EL MISMO GESTO, y confundirlos es el error de esta ficha:
  //   · "rebote" — G.conRebote. Un seno amortiguado: PERIODO CONSTANTE, amplitud que decae. Es lo que
  //     hace un resorte.
  //   · "claves" — la progresion del manual: 6, 4, 3, 2 cuadros. El periodo SE ACHICA. Es lo que hace
  //     una pelota, porque cada arco es mas bajo y por lo tanto mas corto.
  // O sea que "periodo 0,7x el anterior" NO se puede pedir en modo rebote: el seno tiene un solo
  // periodo. Si lo que queres es una pelota, es modo "claves" y no es un defecto del motor.
  //
  // Y LA CURVA VA AL REVES DE LA INTUICION: lo suave esta en los PICOS (influencia alta, C4) y los
  // cruces por el reposo van casi lineales. Poner Easy Ease en el punto de impacto mata el rebote —
  // la velocidad ahi tiene que ser maxima, no cero.
  api.reboteAmortiguado = function (o) {
    o = o || {};
    var quien = "E04 reboteAmortiguado";
    var capa = pedir(o, "capa", quien);
    var don = nombreDe(o, capa);
    var modo = o.modo === undefined ? "rebote" : o.modo;
    var osc = o.oscilaciones === undefined ? 3 : o.oscilaciones;
    var razon = o.razon === undefined ? 0.35 : o.razon;

    if (osc > 3) {
      throw new Error(quien + " en " + don + ": " + osc + " oscilaciones. Maximo 3 — cuatro es " +
                      "decorativo y cinco es juguete. Es el gesto que mas rapido envejece una pieza.");
    }
    if (osc < 1) { throw new Error(quien + " en " + don + ": con menos de una oscilacion no hay rebote."); }
    if (razon <= 0 || razon >= 0.6) {
      var visibles = razon >= 1 ? 99 : Math.log(0.05) / Math.log(razon);
      throw new Error(quien + " en " + don + ": razon de amortiguacion " + razon + ". Con esa razon la " +
                      "cola tarda " + Math.round(visibles) + " oscilaciones en bajar del 5% y el gesto " +
                      "no termina nunca. El numero del oficio es 0,35 (cada extremo es un tercio del " +
                      "anterior); el tope util es 0,5.");
    }

    var d = propDe(capa, o, quien);
    var reposo = o.hasta === undefined ? valorDe(d) : o.hasta;
    var res = { capa: capa, prop: d.prop, modo: modo, reposo: reposo };

    if (modo === "rebote") {
      var cuadro = pedir(o, "cuadro", quien);
      var dur = o.dur === undefined ? 12 : o.dur;
      var desde = o.desde;
      if (desde === undefined) {
        if (o.entrada === undefined) {
          throw new Error(quien + " en " + don + ": el rebote SALE DE LA VELOCIDAD DE LLEGADA, asi que " +
                          "necesita el viaje: pasale `desde` (valor) o `entrada` (desplazamiento).");
        }
        desde = reposo + o.entrada;
      }
      var freq = o.freq === undefined ? 1.8 : o.freq;
      // razon por extremo = exp(-decay/(2*freq)): los extremos caen cada medio periodo
      var decay = o.decay === undefined ? (2 * freq * Math.log(1 / razon)) : o.decay;
      var amp = o.amp === undefined ? G.REBOTE.amp : o.amp;

      revisarHorneado(freq, quien, don);
      avisarClavesPrevias(d.prop, cuadro, quien, don);

      G.conRebote(d.prop, [[cuadro, comoValor(d, desde)], [cuadro + dur, comoValor(d, reposo)]],
                  { amp: amp, freq: freq, decay: decay,
                    piso: o.piso === undefined ? (d.unidad === "px" ? 6 : 3) : o.piso,
                    donde: don + "/" + d.nombre });

      var medioPeriodo = G.fps() / (2 * freq);
      res.decay = decay;
      res.muereEn = cuadro + dur + Math.round(medioPeriodo * (osc + 1));
      G.anotar("E04|" + don + "|rebote|" + d.nombre + "|c" + cuadro + "+" + dur + "|razon " + razon +
               "|decay " + (Math.round(decay * 100) / 100) + "|extremo cada " +
               (Math.round(medioPeriodo * 10) / 10) + " cuadros");

    } else if (modo === "claves") {
      var impacto = pedir(o, "cuadroImpacto", quien);
      exigirViva(capa, impacto, 1, quien, don);
      var A = o.amplitud;
      if (A === undefined) {
        throw new Error(quien + " en " + don + ": modo claves necesita `amplitud` — cuanto se pasa el " +
                        "PRIMER extremo, en " + d.unidad + ". El oficio pone 8-12% del recorrido.");
      }
      var dur1 = o.dur1 === undefined ? 6 : o.dur1;
      var lista = [], t = impacto, amp2 = Math.abs(A), paso = dur1, k;

      // el viaje previo, si lo hay, llega LINEAL: la velocidad en el impacto tiene que ser maxima
      if (o.desde !== undefined && o.cuadro !== undefined) {
        lista[lista.length] = [o.cuadro, comoValor(d, o.desde), "LINEAL"];
      }
      lista[lista.length] = [impacto, comoValor(d, reposo), "C7"];
      for (k = 0; k < osc; k++) {
        t = t + paso;
        lista[lista.length] = [t, comoValor(d, reposo + (k % 2 === 0 ? amp2 : -amp2)), "C4"];
        amp2 = amp2 * razon;
        paso = Math.max(2, Math.round(paso * 0.7));
      }
      t = t + Math.max(2, paso);
      lista[lista.length] = [t, comoValor(d, reposo)];
      G.claves(d.prop, lista, don + "/" + d.nombre);
      res.muereEn = t;
      G.anotar("E04|" + don + "|claves|" + d.nombre + "|impacto c" + impacto + "|" + osc +
               " oscilaciones|amplitud " + Math.round(Math.abs(A)) + "|termina c" + t);

    } else {
      throw new Error(quien + ": modo desconocido '" + modo + "'. Validos: rebote, claves.");
    }
    return res;
  };

  // ==============================================================================================
  // E05 · VOLTEO DE UNA CARA
  // ==============================================================================================
  //
  // El panel gira sobre su eje vertical y aparece. Es un "aparecer" que no gasta ninguna tapa, y por
  // eso es el revelado mas barato que hay sobre fondo NO liso.
  //
  // UNA CARA. La tarjeta de dos caras (X08) NO es (a) en este motor y no es por falta de ganas: por
  // la LEY 1 el apilado manda y la Z no ocluye NUNCA, asi que dos capas coplanares separadas 1 unidad
  // se dibujan siempre en el orden de la lista y la de arriba gana en toda la superposicion, gire lo
  // que gire el nulo. Por eso esta funcion se niega a cruzar los +-90 grados: pasado el perfil
  // estarias mirando el dorso, y el sustituto exacto es este volteo mas un corte seco (E12) en el
  // cuadro exacto del perfil.
  //
  // Y EL PIVOTE ES EL GESTO: al centro es un giro; al borde es una PUERTA. Son dos lecturas distintas
  // y la diferencia es un valor de ancla — que mueve la capa si no se compensa (ver anclarEn).
  api.volteoDeUnaCara = function (o) {
    o = o || {};
    var quien = "E05 volteoDeUnaCara";
    var capa = pedir(o, "capa", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var don = nombreDe(o, capa);

    if (!capa.threeDLayer) {
      throw new Error(quien + " en " + don + ": la capa no es 3D y la rotacion Y no existe en 2D. " +
                      "Prendele threeDLayer. Y ojo con la LEY 2: si la comp tiene camara, todo tiene " +
                      "que ser 3D salvo lo que va a proposito encima de todo.");
    }
    var desde = o.desde === undefined ? -90 : o.desde;
    var hasta = o.hasta === undefined ? 0 : o.hasta;
    var dur = o.dur === undefined ? 18 : o.dur;
    var sobre = o.sobrepaso === undefined ? 5 : o.sobrepaso;
    var sob = signo(hasta - desde) * Math.abs(sobre);

    if (Math.abs(desde) > 90 || Math.abs(hasta) > 90 || Math.abs(hasta + sob) > 90) {
      throw new Error(quien + " en " + don + ": el giro va de " + desde + " a " + hasta + " con " +
                      Math.abs(sobre) + " de sobrepaso, y eso cruza los +-90 grados: a partir de ahi " +
                      "se ve el DORSO. La tarjeta de dos caras (X08) es (b) en este motor — por la " +
                      "LEY 1 la capa de arriba gana en toda la superposicion, gire lo que gire. " +
                      "Sustituto exacto: una cara + corte seco (E12) en el cuadro del perfil.");
    }
    if (dur < 12 || dur > 24) {
      G.avisar(quien + " en " + don + ": " + dur + " cuadros. El rango del oficio es 16-20.");
    }
    if (Math.abs(sobre) > 8) {
      G.avisar(quien + " en " + don + ": sobrepaso de " + Math.abs(sobre) + " grados. El rango es 4-6; " +
               "mas que eso y la tarjeta parece de goma.");
    }

    var pivote = o.pivote === undefined ? "centro" : o.pivote;
    if (pivote !== "centro") {
      var r = null;
      try { r = capa.sourceRectAtTime(cuadro / G.fps(), false); } catch (exPv) { r = null; }
      if (r === null) {
        throw new Error(quien + " en " + don + ": no puedo medir la caja para poner el ancla en el " +
                        "borde. Pone el ancla a mano con Ge.anclarEn() antes de llamar a esto.");
      }
      var ax = (pivote === "izquierda") ? r.left : (r.left + r.width);
      api.anclarEn(capa, ax, r.top + r.height / 2);
    }

    var vuelta = Math.max(2, Math.round(dur * 0.25));
    var pico = dur - vuelta;
    if (pico < 4) {
      throw new Error(quien + " en " + don + ": con dur " + dur + " la ida queda en " + pico +
                      " cuadros y no alcanza para leer el giro.");
    }
    G.claves(G.rotY(capa), [[cuadro, desde, "C1"],
                            [cuadro + pico, hasta + sob, "C8"],
                            [cuadro + dur, hasta]], don + "/rotY");

    G.anotar("E05|" + don + "|c" + cuadro + "+" + dur + "|" + desde + " a " + hasta + "|sobrepaso " +
             sob + "|pivote " + pivote);
    return { capa: capa, prop: G.rotY(capa), pico: cuadro + pico, fin: cuadro + dur };
  };

  // ==============================================================================================
  // E06 · SALIDA POR COLAPSO AL ORIGEN
  // ==============================================================================================
  //
  // El elemento se chupa hacia el punto de donde salio. Escala 100 -> 0 con el ANCLA en el punto de
  // fuga: el ancla es lo unico que decide hacia donde colapsa, porque una escala siempre encoge
  // hacia el ancla. Con el ancla al centro, todo colapsa al centro y todos los colapsos de la pieza
  // se ven iguales.
  //
  // ACELERANDO (C3): se va rapido al final. Una salida que desacelera se lee como que le costo irse.
  // Y SIN SOBREPASO, por la regla de familia 2.
  //
  // Con dimensiones separadas se puede aplastar SOLO en Y, y eso ya no es un colapso: se lee como una
  // persiana que cae. Es otro gesto y esta bien elegirlo, pero a sabiendas.
  api.salidaPorColapso = function (o) {
    o = o || {};
    var quien = "E06 salidaPorColapso";
    var capa = pedir(o, "capa", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var don = nombreDe(o, capa);
    var dur = durSalida(o, quien, don, 7);
    var eje = o.eje === undefined ? "ambos" : o.eje;

    if (dur > 12) {
      G.avisar(quien + " en " + don + ": " + dur + " cuadros para un colapso. El rango es 6-8 — una " +
               "salida larga es lo que hace que una pieza se sienta lenta.");
    }
    // una salida sobre algo invisible no falla: no hace nada, y eso se descubre mirando el video
    exigirViva(capa, cuadro, 0, quien, don);

    // el punto de fuga, en coordenadas del mundo, traducido a ancla local
    if (o.hacia !== undefined) {
      if (!giroCero(capa)) {
        throw new Error(quien + " en " + don + ": para traducir el punto de fuga a ancla local necesito " +
                        "la capa sin girar. Pone el ancla a mano con Ge.anclarEn().");
      }
      var anc = G.anc(capa).value;
      var esc0 = G.esc(capa).value;
      var pos0 = leerPos(capa);
      api.anclarEn(capa,
                   anc[0] + (o.hacia[0] - pos0[0]) * 100 / esc0[0],
                   anc[1] + (o.hacia[1] - pos0[1]) * 100 / esc0[1]);
    } else if (o.ancla !== undefined) {
      api.anclarEn(capa, o.ancla[0], o.ancla[1]);
    }

    var pe = G.esc(capa);
    var base = pe.value;
    var fin = copia(base);
    if (eje === "ambos") { fin = vec(base.length, 0); }
    else if (eje === "x") { fin[0] = 0; }
    else if (eje === "y") { fin[1] = 0; }
    else { throw new Error(quien + ": eje desconocido '" + eje + "'. Validos: ambos, x, y"); }

    G.claves(pe, [[cuadro, base, "C3"], [cuadro + dur, fin]], don + "/escala");

    // Se apaga con outPoint y NO con inPoint: la LEY 7 prohibe tocar el inPoint de una capa de forma
    // (rasteriza vacia), pero el final es seguro. Una capa en escala 0 que sigue viva es geometria
    // degenerada esperando que alguien le vuelva a animar la escala.
    if (o.apagar !== false) { capa.outPoint = Math.min(cuadro + dur, G.cuadros()) / G.fps(); }

    G.anotar("E06|" + don + "|c" + cuadro + "+" + dur + "|eje " + eje + "|ancla " +
             Math.round(G.anc(capa).value[0]) + "," + Math.round(G.anc(capa).value[1]));
    return { capa: capa, prop: pe, fin: cuadro + dur };
  };

  // ==============================================================================================
  // E07 · SALIDA BARRIDA POR TAPA
  // ==============================================================================================
  //
  // La tapa vuelve a cruzar en la direccion contraria a la que revelo, y el elemento se queda quieto
  // y desaparece detras. Es la salida que menos ruido hace y la que mejor encadena con la entrada del
  // siguiente.
  //
  // TRES COSAS QUE ESTA FUNCION HACE Y QUE A MANO SE OLVIDAN:
  //   1. LA TAPA VA 1 UNIDAD MAS CERCA DE LA CAMARA **Y** INMEDIATAMENTE ARRIBA EN EL APILADO. Por la
  //      LEY 1 el apilado manda y la Z no ocluye nunca, asi que los dos criterios tienen que apuntar
  //      al mismo lado o AE y el motor muestran cosas distintas. Poner solo la Z no tapa nada.
  //   2. LA TAPA SE DIMENSIONA CON 2x EL RECORRIDO, minimo. Una tapa que "justo alcanza" deja una
  //      linea de fondo asomando en UN cuadro de setecientos: de los que no se encuentran mirando.
  //   3. EL CUADRO DEL CORTE SE MIDE, no se estima. Se muestrea la posicion real de la tapa cuadro a
  //      cuadro (que con curva C3 no es lineal en el tiempo) y se busca la ventana en la que cubre de
  //      verdad. Si no hay ni un cuadro de cobertura total, tira: el elemento se filtraria por el borde.
  //
  // LIMITE HONESTO: la tapa asume FONDO LISO Y QUIETO. Sobre imagen, degradado o fondo que se mueve,
  // este gesto no existe — y el reemplazo es X02 (tapa visible de color de marca) o E10 (empuje), que
  // no dependen del color del fondo. Por eso `color` es obligatorio: es el color EXACTO del solido de
  // fondo, que por la LEY 4 tiene que ser una capa real y no el color de la comp.
  api.salidaBarridaPorTapa = function (o) {
    o = o || {};
    var quien = "E07 salidaBarridaPorTapa";
    var capa = pedir(o, "capa", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var don = nombreDe(o, capa);
    var color = pedir(o, "color", quien);

    if (o.fondoPlano === false) {
      throw new Error(quien + " en " + don + ": declaraste que el fondo no es liso, y entonces este " +
                      "gesto no existe: una tapa de un color sobre un fondo que no es ese color se ve. " +
                      "Reemplazos que funcionan sobre cualquier fondo: X02 (tapa visible de color de " +
                      "marca) o E10 (empuje del siguiente).");
    }
    var dur = durSalida(o, quien, don, 9);
    exigirViva(capa, cuadro, 0, quien, don);
    var dirn = o.direccion === undefined ? "derecha" : o.direccion;
    var horizontal = (dirn === "derecha" || dirn === "izquierda");
    if (!horizontal && dirn !== "arriba" && dirn !== "abajo") {
      throw new Error(quien + ": direccion desconocida '" + dirn + "'. Validas: derecha, izquierda, arriba, abajo");
    }
    var sgn = (dirn === "derecha" || dirn === "abajo") ? 1 : -1;

    var caja = cajaMundo(o, capa, cuadro, quien);
    var largo = horizontal ? caja.ancho : caja.alto;
    var grueso = horizontal ? caja.alto : caja.ancho;
    var margen = o.margen === undefined ? 24 : o.margen;
    var W = o.anchoTapa === undefined ? Math.ceil(2 * largo + 4 * margen) : Math.ceil(o.anchoTapa);
    if (W < 2 * largo) {
      throw new Error(quien + " en " + don + ": la tapa mide " + W + " y el recorrido util es " +
                      Math.round(largo) + ". La regla de higiene pide 2x el recorrido, minimo: una tapa " +
                      "que justo alcanza deja una linea de fondo asomando en un solo cuadro, y ese es " +
                      "el defecto que no se encuentra mirando.");
    }
    var Gr = Math.ceil(grueso + 4 * margen);
    if (W > 30000 || Gr > 30000) {
      throw new Error(quien + " en " + don + ": la tapa daria " + W + "x" + Gr + " px y AE no crea " +
                      "solidos de mas de 30000. La capa que estas tapando mide " + Math.round(caja.ancho) +
                      "x" + Math.round(caja.alto) + ": revisa esa medida antes que la tapa.");
    }

    var z = 0, es3D = capa.threeDLayer ? true : false;
    if (es3D) {
      var pz = leerPos(capa);
      z = (pz.length > 2 ? pz[2] : 0) - 1;
    }
    var c0 = horizontal ? caja.cx : caja.cy;
    var mitad = largo / 2;
    var salto = mitad + margen + W / 2;
    var ini = c0 - sgn * salto;
    var fin = c0 + sgn * salto;

    var tapa;
    if (horizontal) {
      tapa = es3D ? G.solido(don + "-tapa", color, W, Gr, ini, caja.cy, z)
                  : G.solido(don + "-tapa", color, W, Gr, ini, caja.cy);
    } else {
      tapa = es3D ? G.solido(don + "-tapa", color, Gr, W, caja.cx, ini, z)
                  : G.solido(don + "-tapa", color, Gr, W, caja.cx, ini);
    }
    // el apilado, que es el otro 50% de la LEY 1
    tapa.moveBefore(capa);
    // El inPoint de un SOLIDO es seguro: la LEY 7 habla de capas de FORMA, que se rasterizan a t=0 y
    // pueden salir vacias. Un solido es una fuente de color y no se rasteriza.
    G.plano(tapa, cuadro, cuadro + dur);

    var pt = pista(tapa, horizontal ? "x" : "y", quien);
    G.claves(pt, [[cuadro, ini, o.curva === undefined ? "C3" : o.curva], [cuadro + dur, fin]], don + "/tapa");

    // LA MEDICION: donde cubre de verdad
    var f, cubre = [], izqCaja = c0 - mitad, derCaja = c0 + mitad;
    for (f = cuadro; f <= cuadro + dur; f++) {
      var c = pt.valueAtTime(f / G.fps(), false);
      if (c - W / 2 <= izqCaja && c + W / 2 >= derCaja) { cubre[cubre.length] = f; }
    }
    if (cubre.length === 0) {
      throw new Error(quien + " en " + don + ": la tapa NUNCA llega a cubrir del todo. Recorre " +
                      Math.round(2 * salto) + " unidades en " + dur + " cuadros y el elemento mide " +
                      Math.round(largo) + ": con una muestra por cuadro no hay ni uno con cobertura " +
                      "total, asi que el elemento se filtra por el borde. Ensancha la tapa (`anchoTapa`) " +
                      "o alarga `dur`.");
    }
    var corte = cubre[Math.floor(cubre.length / 2)];
    G.claves(G.op(capa), [[cuadro, opacidadEn(capa, cuadro), "HOLD"], [corte, 0]], don + "/opacidad");

    G.anotar("E07|" + don + "|c" + cuadro + "+" + dur + "|" + dirn + "|tapa " + W + "x" + Gr +
             "|cubre " + cubre.length + " cuadros|corte c" + corte);
    return { capa: capa, tapa: tapa, corte: corte, pista: pt, cubre: cubre.length };
  };

  // ==============================================================================================
  // E08 · SALIDA POR DESARME
  // ==============================================================================================
  //
  // Las partes se van escalonadas y EN ORDEN INVERSO AL QUE ENTRARON. Esa inversion es todo el gesto:
  // con el mismo orden de la entrada, el desarme se lee como una segunda entrada fallida.
  //
  // PASALE LAS CAPAS EN EL ORDEN EN QUE ENTRARON. La inversion la hace esta funcion. Si se las pasas
  // ya invertidas, sale en el mismo orden que la entrada y el defecto NO da sintoma: se ve prolijo y
  // esta mal.
  api.salidaPorDesarme = function (o) {
    o = o || {};
    var quien = "E08 salidaPorDesarme";
    var capas = pedir(o, "capas", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var paso = o.paso === undefined ? 2 : o.paso;
    var modo = o.modo === undefined ? "colapso" : o.modo;
    var n = capas.length;

    if (n < 2) { throw new Error(quien + ": un desarme de una sola parte es una salida, no un desarme."); }
    if (paso < 1) {
      throw new Error(quien + ": el retardo entre partes no puede ser 0 — sin escalonado no hay " +
                      "desarme, hay un corte de N capas a la vez.");
    }
    var dur = durSalida(o, quien, "desarme", 6);
    var total = (n - 1) * paso + dur;
    var tope = o.tope === undefined ? 20 : o.tope;
    if (total > tope) {
      G.avisar(quien + ": el desarme entero dura " + total + " cuadros (" + n + " partes, retardo " +
               paso + ", " + dur + " por parte) y el techo del oficio es " + tope + ". Bajale el retardo " +
               "o sacale partes: una salida larga es lo que hace que el final se sienta lento.");
    }

    var partes = [], i;
    for (i = 0; i < n; i++) {
      var ci = cuadro + (n - 1 - i) * paso;
      var opc = { capa: capas[i], cuadro: ci, dur: dur, donde: nombreDe({}, capas[i]) };
      if (modo === "colapso") {
        opc.eje = o.eje;
        opc.hacia = o.hacia;
        opc.apagar = o.apagar;
        partes[partes.length] = api.salidaPorColapso(opc);
      } else if (modo === "deslizar") {
        opc.sentido = "sale";
        opc.dx = o.dx;
        opc.dy = o.dy;
        opc.dz = o.dz;
        partes[partes.length] = api.deslizarConFundido(opc);
      } else {
        throw new Error(quien + ": modo desconocido '" + modo + "'. Validos: colapso, deslizar.");
      }
    }
    G.anotar("E08|" + n + " partes|c" + cuadro + "|retardo " + paso + "|modo " + modo + "|total " + total);
    return { partes: partes, total: total, fin: cuadro + total };
  };

  // ==============================================================================================
  // E09 · SALIDA HACIA LA CAMARA
  // ==============================================================================================
  //
  // El panel se viene encima y se sale de cuadro. La escala no se compensa: la perspectiva hace todo
  // el trabajo, y ese es el punto del gesto.
  //
  // EL PUNTO DE SALIDA SE CALCULA, Y ES LA UNICA PARTE QUE IMPORTA. La camara vive en z = -distancia,
  // asi que la profundidad real de una capa es d = z + distancia. Con d <= 0 la capa esta DETRAS DEL
  // OJO: se proyecta invertida, pide un circulo de confusion enorme y `marco-check` la cuenta como
  // miles de px fuera de cuadro. Y con d muy chico se choca con el plano cercano del motor (near = 1),
  // que recorta distinto que AE — o sea que AE te muestra una cosa y el video otra, sin error.
  //
  // Por eso el destino no se pide: se calcula como -distancia + margen, y el margen tiene piso.
  api.salidaHaciaLaCamara = function (o) {
    o = o || {};
    var quien = "E09 salidaHaciaLaCamara";
    var capa = pedir(o, "capa", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var don = nombreDe(o, capa);

    if (!capa.threeDLayer) {
      throw new Error(quien + " en " + don + ": la capa no es 3D, asi que no tiene Z y no puede venirse " +
                      "encima de nadie. Prendele threeDLayer.");
    }
    if (!hayCamara()) {
      throw new Error(quien + " en " + don + ": no hay camara en la comp. Sin camara la Z no proyecta " +
                      "nada: la capa se quedaria exactamente del mismo tamano y el gesto no existe.");
    }
    var dur = durSalida(o, quien, don, 9);
    exigirViva(capa, cuadro, 0, quien, don);
    var DIST = G.distanciaCamara();
    var margen = o.margen === undefined ? 200 : o.margen;
    if (margen < 50) {
      throw new Error(quien + " en " + don + ": margen " + margen + ". El motor recorta en near = 1 y AE " +
                      "no recorta igual: por debajo de ~50 unidades de la camara los dos dibujan cosas " +
                      "distintas y el video deja de parecerse al preview. El valor del oficio es 200.");
    }
    var pz = leerPos(capa);
    var z0 = pz.length > 2 ? pz[2] : 0;
    var zFin = -DIST + margen;
    if (zFin >= z0) {
      throw new Error(quien + " en " + don + ": la capa ya esta en z=" + Math.round(z0) + " y el punto de " +
                      "salida calculado es z=" + Math.round(zFin) + ", o sea que tendria que ALEJARSE " +
                      "para 'venirse encima'. O la capa esta demasiado cerca ya, o la distancia de " +
                      "camara (" + DIST + ") no es la que crees.");
    }

    var crece = DIST / margen;
    if (crece > 20) {
      G.avisar(quien + " en " + don + ": al final la capa se ve " + Math.round(crece) + " veces mas " +
               "grande. Entra, pero revisa que la textura aguante: es el mismo problema de nitidez que " +
               "mide Q2 (piso 2x), solo que en movimiento.");
    }
    var ob = obturador();
    if (ob.on) {
      G.avisar(quien + " en " + don + ": la comp tiene el obturador encendido y este es EL gesto donde " +
               "mas se paga (LEY 5: el arnes captura una vez por sub-muestra). Una capa que cruza medio " +
               "mundo en 9 cuadros con 16 muestras son 144 capturas para ese tramo.");
    }
    // LEY 1: lo que este arriba en el apilado le va a pasar por delante aunque la capa este pegada al
    // ojo. Es el defecto tipico de este gesto y no da error: se ve como que el panel pasa por detras.
    var arriba = [], i, c = G.comp();
    for (i = 1; i < capa.index; i++) {
      if (!esCamara(c.layer(i))) { arriba[arriba.length] = c.layer(i).name; }
    }
    if (arriba.length > 0) {
      G.avisar(quien + " en " + don + ": hay " + arriba.length + " capa(s) arriba en el apilado (" +
               arriba.join(", ") + "). Por la LEY 1 el apilado manda y la Z no ocluye NUNCA: el panel " +
               "va a pasar POR DETRAS de ellas aunque este pegado al ojo. Subilo en la lista.");
    }

    var pkz = pista(capa, "z", quien);
    G.claves(pkz, [[cuadro, z0, o.curva === undefined ? "C3" : o.curva], [cuadro + dur, zFin]], don + "/z");

    var fund = o.fundido === undefined ? 4 : o.fundido;
    if (fund > 0) {
      if (fund >= dur) { throw new Error(quien + " en " + don + ": el fundido (" + fund + ") no puede durar mas que el gesto (" + dur + ")."); }
      G.claves(G.op(capa), [[cuadro + dur - fund, opacidadEn(capa, cuadro), "C1"], [cuadro + dur, 0]],
               don + "/opacidad");
    }
    if (o.apagar !== false) { capa.outPoint = Math.min(cuadro + dur, G.cuadros()) / G.fps(); }

    G.anotar("E09|" + don + "|c" + cuadro + "+" + dur + "|z " + Math.round(z0) + " -> " + Math.round(zFin) +
             "|d final " + margen + "|se ve " + Math.round(crece) + "x");
    return { capa: capa, prop: pkz, zFin: zFin, crece: crece, fin: cuadro + dur };
  };

  // ==============================================================================================
  // E10 · SALIDA POR EMPUJE DEL SIGUIENTE
  // ==============================================================================================
  //
  // Lo nuevo entra empujando lo viejo. El gesto mas barato del catalogo y el mas dificil de que salga
  // mal: no hay tapa, asi que FUNCIONA SOBRE CUALQUIER FONDO, y se anima UN SOLO VALOR.
  //
  // LA CUENTA QUE CASI NADIE HACE: "un ancho de pantalla" no es 1920 cuando la capa esta a otra Z. A
  // profundidad d el factor de proyeccion es distancia/d, asi que el ancho de pantalla EN UNIDADES DE
  // MUNDO a esa profundidad vale ancho * d / distancia. Empujar 1920 unidades una capa que esta lejos
  // la deja a medio salir, y empujar una que esta cerca la manda al otro barrio. Aca se calcula.
  //
  // Y EL EMPARENTADO PONE LAS ROTACIONES DEL HIJO EN CERO (es la ley del nucleo, porque AE las
  // reescribe al colgar y ya giro 104 grados una tira entera sin avisar). O sea: colga primero, gira
  // despues. Si el hijo ya venia girado, esto tira en vez de borrarselo en silencio.
  api.salidaPorEmpuje = function (o) {
    o = o || {};
    var quien = "E10 salidaPorEmpuje";
    var saliente = pedir(o, "saliente", quien);
    var entrante = pedir(o, "entrante", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var dur = o.dur === undefined ? 18 : o.dur;
    var desde = o.desde === undefined ? "derecha" : o.desde;
    var don = o.donde === undefined ? (saliente.name + ">" + entrante.name) : o.donde;

    var horizontal = (desde === "derecha" || desde === "izquierda");
    if (!horizontal && desde !== "arriba" && desde !== "abajo") {
      throw new Error(quien + ": `desde` desconocido '" + desde + "'. Validos: derecha, izquierda, arriba, abajo");
    }
    // "desde la derecha" = el entrante espera a la derecha y todo se mueve hacia la izquierda
    var sgn = (desde === "derecha" || desde === "abajo") ? 1 : -1;

    if (!giroCero(saliente) || !giroCero(entrante)) {
      throw new Error(quien + " en " + don + ": una de las dos capas ya esta girada, y colgar() pone las " +
                      "rotaciones del hijo en CERO — AE las reescribe al emparentar y el nucleo lo " +
                      "normaliza para que no aparezca un giro fantasma. Emparenta ANTES de girar.");
    }
    var fps = G.fps();
    if (Math.round(entrante.inPoint * fps) > cuadro) {
      throw new Error(quien + " en " + don + ": el entrante recien vive desde el cuadro " +
                      Math.round(entrante.inPoint * fps) + " y el empuje arranca en el " + cuadro +
                      ". Va a aparecer a mitad del viaje, dentro del cuadro, y se lee como un error de " +
                      "render. Su inPoint tiene que ser <= " + cuadro + " (espera fuera de cuadro, que " +
                      "es gratis).");
    }
    if (dur < 14 || dur > 24) {
      G.avisar(quien + " en " + don + ": " + dur + " cuadros. El rango del oficio es 16-20 (C4).");
    }

    var es3D = (saliente.threeDLayer || entrante.threeDLayer) ? true : false;
    if (es3D && (!saliente.threeDLayer || !entrante.threeDLayer)) {
      throw new Error(quien + " en " + don + ": una capa es 3D y la otra no. Por la LEY 2 la 2D se " +
                      "dibuja DESPUES de todo el mundo 3D, asi que en el empuje una va a pasar por " +
                      "encima de la otra sin importar el apilado.");
    }

    var nulo = G.comp().layers.addNull(G.cuadros() / G.fps());
    nulo.name = o.nombreNulo === undefined ? (don + "-empuje") : o.nombreNulo;
    nulo.threeDLayer = es3D;
    nulo.moveBefore(saliente);
    G.plano(nulo, 0, G.cuadros());

    G.colgar(saliente, nulo);
    G.colgar(entrante, nulo);

    // el recorrido, en unidades de mundo a la profundidad del entrante
    var largo;
    if (es3D && hayCamara()) {
      var pe = leerPos(entrante);
      var zz = pe.length > 2 ? pe[2] : 0;
      var DIST = G.distanciaCamara();
      var d = zz + DIST;
      if (d <= 0) {
        throw new Error(quien + " en " + don + ": el entrante esta en z=" + Math.round(zz) + ", o sea " +
                        "DETRAS de la camara (distancia " + DIST + ").");
      }
      largo = (horizontal ? G.ancho() : G.alto()) * d / DIST;
    } else {
      largo = horizontal ? G.ancho() : G.alto();
    }
    largo = largo * (o.holgura === undefined ? 1 : o.holgura);

    // el entrante espera un ancho de pantalla mas alla de donde va a terminar
    var pl = leerPos(entrante);
    var np = copia(pl);
    np[horizontal ? 0 : 1] = pl[horizontal ? 0 : 1] + sgn * largo;
    ponerPos(entrante, np);

    var pn = pista(nulo, horizontal ? "x" : "y", quien);
    var v0 = pn.value;
    G.claves(pn, [[cuadro, v0, o.curva === undefined ? "C4" : o.curva], [cuadro + dur, v0 - sgn * largo]],
             don + "/nulo");

    G.anotar("E10|" + don + "|c" + cuadro + "+" + dur + "|desde " + desde + "|recorrido " +
             Math.round(largo) + (es3D ? " unidades de mundo" : " px"));
    return { nulo: nulo, saliente: saliente, entrante: entrante, recorrido: largo, fin: cuadro + dur };
  };

  // ==============================================================================================
  // E11 · SALIDA A DESTIEMPO
  // ==============================================================================================
  //
  // Criterio, no tecnica: el elemento se va ANTES de que uno termine de mirarlo, y eso empuja el
  // ritmo. No es un gesto — es donde pones el arranque de la salida. La regla: la salida arranca
  // cuando el SIGUIENTE ya lleva el 30% de su entrada.
  //
  // Y ACA VIVE EL UNICO NUMERO DURO PUBLICADO DE TODO EL PLAN, que manda sobre esta ficha: EL TEXTO
  // SE QUEDA INMOVIL 1 SEGUNDO CADA 13 CARACTERES. Un claim de 30 caracteres necesita 69 cuadros
  // quietos a 30 fps, no 30. Si le pasas `caracteres` y `cuadroQuieto`, esta funcion hace la cuenta y
  // se niega a sacarlo antes — porque acelerar acá no es ritmo, es que no se lea.
  api.salidaADestiempo = function (o) {
    o = o || {};
    var quien = "E11 salidaADestiempo";
    var cSig = pedir(o, "cuadroEntradaSiguiente", quien);
    var dSig = pedir(o, "durEntradaSiguiente", quien);
    var frac = o.fraccion === undefined ? 0.30 : o.fraccion;
    var don = o.donde === undefined ? "(sin nombre)" : o.donde;

    if (frac <= 0 || frac >= 1) {
      throw new Error(quien + " en " + don + ": la fraccion va entre 0 y 1 (el oficio pone 0,30).");
    }
    var cuadro = cSig + Math.round(frac * dSig);
    var lectura = 0;

    if (o.caracteres !== undefined && o.caracteres > 0) {
      lectura = Math.ceil(o.caracteres / 13 * G.fps());
      if (o.cuadroQuieto === undefined) {
        throw new Error(quien + " en " + don + ": me diste `caracteres` pero no `cuadroQuieto` (el " +
                        "cuadro en que el texto DEJO de moverse). Sin eso no puedo comprobar la regla " +
                        "de legibilidad y no la voy a dar por buena.");
      }
      var minimo = o.cuadroQuieto + lectura;
      if (cuadro < minimo) {
        throw new Error(quien + " en " + don + ": la salida a destiempo caeria en el cuadro " + cuadro +
                        " y el texto tiene " + o.caracteres + " caracteres, o sea que necesita " +
                        lectura + " cuadros INMOVIL (1 segundo cada 13 caracteres) desde el " +
                        o.cuadroQuieto + ": no puede irse antes del " + minimo + ". E11 esta " +
                        "contraindicado en texto justamente por esto — ahi manda la legibilidad.");
      }
    }

    G.anotar("E11|" + don + "|salida en c" + cuadro + "|el siguiente entra en c" + cSig + " y dura " +
             dSig + "|fraccion " + frac + (lectura > 0 ? ("|lectura " + lectura + " cuadros") : ""));
    if (typeof o.aplicar === "function") { o.aplicar(cuadro); }
    return { cuadro: cuadro, lectura: lectura };
  };

  // ==============================================================================================
  // E12 · CORTE SECO
  // ==============================================================================================
  //
  // Claves HOLD de opacidad, cero cuadros de transicion. NO es la ausencia de una tecnica: en medio
  // de una pieza toda con ease, un corte seco ES un acento, y es de las pocas cosas que suenan a
  // decision. Cae EXACTO en el beat: a un cuadro del beat se siente mal y nadie sabe por que.
  //
  // Y ACA HAY UNA TRAMPA QUE SOLO SE VE EN EL VIDEO: con el obturador encendido, el reproductor
  // decide la visibilidad EN CADA SUB-MUESTRA, asi que un corte que cae dentro de la ventana del
  // obturador sale a media opacidad — un corte "seco" difuminado, que es lo contrario del gesto. Con
  // fase = -angulo/2 la ventana queda centrada en el cuadro y el corte en cuadro entero se salva; con
  // cualquier otra fase, no. Por eso esto se niega a construir si la fase esta mal: es una linea de
  // configuracion contra un defecto que solo aparece renderizando.
  api.corteSeco = function (o) {
    o = o || {};
    var quien = "E12 corteSeco";
    var capa = o.capa;
    var pasos = pedir(o, "pasos", quien);
    var don = nombreDe(o, capa);
    var prop = o.prop === undefined ? G.op(pedir(o, "capa", quien)) : o.prop;

    if (pasos.length < 2) {
      throw new Error(quien + " en " + don + ": una sola clave no es un corte, es un valor constante " +
                      "para toda la pieza. Un corte son al menos dos: el estado de antes y el de despues.");
    }
    var ob = obturador();
    if (ob.on && Math.abs(ob.fase + ob.angulo / 2) > 0.001) {
      throw new Error(quien + " en " + don + ": la comp tiene obturador de " + ob.angulo + " grados con " +
                      "fase " + ob.fase + ", y tendria que ser " + (-ob.angulo / 2) + " (fase = -angulo/2). " +
                      "Con la ventana descentrada el reproductor evalua la visibilidad en cada " +
                      "sub-muestra y el corte sale a media opacidad: un corte seco difuminado. " +
                      "Arreglos: corregir la fase, o apagar el obturador en una pieza con muchos cortes.");
    }
    if (ob.on) {
      G.avisar(quien + " en " + don + ": hay obturador encendido. Los cortes van en cuadro entero (el " +
               "nucleo ya lo exige) y la fase esta bien, asi que se salvan — pero una pieza con muchos " +
               "cortes rinde mejor con el obturador apagado, y encima cuesta " + ob.muestras +
               " capturas por cuadro (LEY 5).");
    }

    var beat = o.beat === undefined ? 15 : o.beat;
    var lista = [], i;
    for (i = 0; i < pasos.length; i++) {
      lista[lista.length] = [pasos[i][0], pasos[i][1], "HOLD"];
      if (beat > 0) {
        var resto = pasos[i][0] % beat;
        // la sincopa legitima cae en beat + 7 (contratiempo); todo lo demas al lado del beat es error
        if (resto !== 0 && resto !== Math.floor(beat / 2)) {
          G.avisar(quien + " en " + don + ": el corte del cuadro " + pasos[i][0] + " cae a " + resto +
                   " cuadros del beat (" + beat + "). Un corte tiene que caer EXACTO: a uno o dos " +
                   "cuadros del beat se siente mal y nadie sabe por que. Los mas cercanos son " +
                   (pasos[i][0] - resto) + " y " + (pasos[i][0] - resto + beat) + ".");
        }
      }
    }
    G.claves(prop, lista, don + "/corte");

    G.anotar("E12|" + don + "|" + pasos.length + " cortes|primero c" + pasos[0][0] + "|obturador " +
             (ob.on ? "SI" : "no"));
    return { capa: capa, prop: prop, cortes: pasos.length };
  };

  return api;
})();
