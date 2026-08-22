// ================================================================================================
// GESTO · FAMILIA D — DETALLE DE SEGUNDO ORDEN  (D01 a D12)
// ================================================================================================
//
// QUE ES ESTA FAMILIA Y POR QUE ES DISTINTA DE LAS OTRAS SEIS.
//
// Las familias T, F, E, X y C construyen COSAS: un texto que entra, una barra que crece, una tapa que
// barre. Esta no. Esta familia le pasa cosas a lo que YA ESTA CONSTRUIDO — y por eso casi todas sus
// funciones son MODIFICADORES, no constructores: reciben una capa viva y le agregan el segundo orden.
//
// Es la familia que separa una pieza autorada de una plantilla, y es tambien la que nadie escribe,
// porque ninguna de estas doce cosas se ve en un cuadro fijo. Se ven todas en el movimiento, y se
// notan por ausencia: "esta muerto", "es de plastico", "parecen capas de Photoshop moviendose".
//
// LAS CUATRO LEYES DE LA FAMILIA, hechas cumplir y no comentadas:
//
//   1. UN GESTO QUE EMPIEZA EN CERO SOLO SE LEE SI EL OBJETO YA ESTABA AHI. Un acuse (D01) o un micro
//      (D05) sobre una capa que entra en ese mismo cuadro no se lee como reaccion: se lee como que
//      aparecio de la nada, o directamente no se ve. Se comprueba contra el inPoint Y contra la
//      opacidad, porque una capa viva con opacidad cero es igual de invisible.      -> exigirViva()
//
//   2. EL SEGUNDO ORDEN NO PISA EL PRIMERO. El acuse y el micro van en un NULO PROPIO, nunca sobre la
//      propiedad que ya lleva el gesto del elemento. Si la propiedad ya tiene claves, estas funciones
//      se niegan y te mandan a `Gd.nuloPara()`. Escribir encima no da error: da un gesto que
//      desaparece.                                                                  -> nuloPara()
//
//   3. LO QUE SE COPIA SE COPIA ENTERO, CURVA INCLUIDA. El arrastre (D02), la estela (D09) y la
//      sombra (D11) son la MISMA animacion corrida en el tiempo. Cambiarle la curva al hijo rompe el
//      gesto: el arrastre esta en el TIEMPO, no en la forma. Por eso aca las claves se copian con su
//      influencia y su tipo, y no se re-autoran.                            -> leerClaves/escribirClaves
//
//   4. AL EMPARENTAR SE VERIFICA QUE LA ANIMACION SOBREVIVIO. AE compensa la transformacion del hijo
//      al colgarlo, y esa compensacion es un solo instante: una capa con la posicion YA ANIMADA puede
//      quedar corrida en todos los demas cuadros, sin error y sin sintoma hasta el render. `nuloPara`
//      compara la posicion en el mundo en cada clave, antes y despues, y tira si no coincide.
//
// LO QUE ESTA FAMILIA NO PUEDE HACER, dicho antes de que alguien lo busque:
//
//   · NO HAY EFECTO ECO. D09 (estela) es duplicados con las claves corridas, y cuesta x4 capas. No es
//     una version pobre del efecto: es la unica que viaja por el exportador.
//   · NO SE PUEDE TENIR UN DUPLICADO. El motor no tiene efectos, asi que la sombra de D11 no puede ser
//     una copia oscurecida de una imagen: o el objeto es un solido (y la sombra es otro solido), o la
//     pieza tiene que proveer un PNG de silueta. La funcion lo exige y explica que tiene que tener ese
//     PNG. Aprobar en silencio una sombra rectangular debajo de un logo redondo seria peor.
//   · LA SOMBRA NO ES FOTOGRAFICA. Sin desenfoque por capa el borde es duro: es una *long shadow*
//     grafica. Es una estetica valida y NO es lo mismo; la funcion lo avisa cada vez.
//   · EL OBTURADOR ES UNO SOLO PARA TODA LA PIEZA (LEY 6). "La tipografia no lleva borron" no se puede
//     cumplir hoy. El sustituto esta escrito en D12.
//
// UNA TRAMPA DEL VOCABULARIO, la misma que ya mordio en dos familias: el plan habla de C5 (deriva) y
// **C5 NO EXISTE en G.CURVAS**, porque C5 es influencia 0/0, o sea LINEAL, que ya es el defecto.
// Pedir "C5" tira "curva desconocida". Donde el catalogo dice C5, aca va "LINEAL".
// Y hay una segunda: D05 pide influencia 50/50 y esa curva TAMPOCO existe en el nucleo. Esta explicado
// en su ficha, con la cuenta de cuanto se pierde.
//
// COMO SE USA
//   (el nucleo ya esta cargado cuando esto corre; aca NO va #include)
//   G.iniciar({ nombre: "MI-PIEZA", cuadros: 240 });
//   var panel = G.solido("panel", [0.2, 0.2, 0.25], 900, 500, 960, 540, 0);
//   Gd.microMovimiento({ capa: panel, i: 1 });                      // respira desde el cuadro 0
//   Gd.acuseDeGolpe({ capa: panel, cuadro: 48, direccion: 1 });     // acusa la llegada de otra cosa
//   G.cerrar();
// ================================================================================================

var Gd = (function () {

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

  function copia(v) { var a = [], i; for (i = 0; i < v.length; i++) { a[i] = v[i]; } return a; }

  function esVector(v) {
    return v !== null && v !== undefined && typeof v !== "string" && typeof v.length === "number";
  }

  function red(x, n) { var f = Math.pow(10, n); return Math.round(x * f) / f; }

  function apretar(x, lo, hi) { if (x < lo) { return lo; } if (x > hi) { return hi; } return x; }

  function esTexto(capa) {
    var s = false;
    try { s = (capa instanceof TextLayer); } catch (exTx) { s = false; }
    return s;
  }

  function esCamara(capa) {
    var s = false;
    try { s = (capa instanceof CameraLayer); } catch (exCa) { s = false; }
    return s;
  }

  function esLuz(capa) {
    var s = false;
    try { s = (capa instanceof LightLayer); } catch (exLu) { s = false; }
    return s;
  }

  function esNulo(capa) {
    var s = false;
    try { s = capa.nullLayer ? true : false; } catch (exNu) { s = false; }
    return s;
  }

  function buscarCapa(nombre) {
    var c = G.comp(), i;
    for (i = 1; i <= c.numLayers; i++) {
      if (c.layer(i).name === nombre) { return c.layer(i); }
    }
    return null;
  }

  // ==============================================================================================
  // POSICION: siempre por dimensiones separadas
  // ==============================================================================================
  //
  // `ADBE Position` es una propiedad ESPACIAL: con tres claves o mas AE le pone tangentes auto-bezier
  // y LA TRAYECTORIA SE CURVA SOLA. Un acuse de 3 claves en Y termina describiendo un arco en X que
  // nadie escribio. Todo lo que anima posicion en este archivo pasa por G.ejes().
  function pista(capa, eje, quien) {
    var e = G.ejes(capa);
    if (eje === "x") { return e.x; }
    if (eje === "y") { return e.y; }
    if (eje === "z") {
      if (e.z === null) {
        throw new Error(quien + ": '" + capa.name + "' no es una capa 3D, asi que no tiene eje Z. " +
                        "Prendele threeDLayer, o anima x/y.");
      }
      return e.z;
    }
    throw new Error(quien + ": eje desconocido '" + eje + "'. Validos: x, y, z");
  }

  // Con dimensiones separadas, `ADBE Position` deja de ser la fuente de verdad: leer la propiedad
  // madre devuelve el valor que tenia ANTES de separar, que es un dato viejo con cara de dato bueno.
  function separada(capa) {
    var s = false;
    try { s = G.pos(capa).dimensionsSeparated ? true : false; } catch (exSe) { s = false; }
    return s;
  }

  function leerPos(capa) {
    if (!separada(capa)) { return copia(G.pos(capa).value); }
    var e = G.ejes(capa);
    var v = [e.x.value, e.y.value];
    if (e.z !== null) { v[2] = e.z.value; }
    return v;
  }

  function posEn(capa, t) {
    if (!separada(capa)) { return copia(G.pos(capa).valueAtTime(t, false)); }
    var e = G.ejes(capa);
    var v = [e.x.valueAtTime(t, false), e.y.valueAtTime(t, false)];
    if (e.z !== null) { v[2] = e.z.valueAtTime(t, false); }
    return v;
  }

  function tiemposDeClavesPos(capa) {
    var out = [], k, j;
    if (!separada(capa)) {
      var p = G.pos(capa);
      for (k = 1; k <= p.numKeys; k++) { out[out.length] = p.keyTime(k); }
      return out;
    }
    var e = G.ejes(capa), ejes = [e.x, e.y];
    if (e.z !== null) { ejes[ejes.length] = e.z; }
    for (j = 0; j < ejes.length; j++) {
      for (k = 1; k <= ejes[j].numKeys; k++) { out[out.length] = ejes[j].keyTime(k); }
    }
    return out;
  }

  // ==============================================================================================
  // ESTA VIVA Y SE VE — LEY DE FAMILIA 1
  // ==============================================================================================
  function opacidadEn(capa, cuadro) {
    var p = G.op(capa), v = 100;
    try { v = p.valueAtTime(cuadro / G.fps(), false); } catch (exOp) { v = p.value; }
    return v;
  }

  function exigirViva(capa, cuadro, margen, quien, don) {
    var entra = Math.round(capa.inPoint * G.fps());
    var antes = cuadro - margen;
    if (entra > antes) {
      throw new Error(quien + " en " + don + ": el gesto arranca en el cuadro " + cuadro + " y la capa " +
                      "recien vive desde el " + entra + ". El segundo orden le pasa a algo que YA ESTABA: " +
                      "un acuse sobre una capa que entra en el mismo cuadro no se lee como reaccion, se " +
                      "lee como que aparecio de la nada. Adelantale el inPoint al menos " + margen +
                      " cuadros, o lo que queres es una entrada (familia E), no esto.");
    }
    var op = opacidadEn(capa, antes);
    if (op <= 1) {
      throw new Error(quien + " en " + don + ": en el cuadro " + antes + " la capa esta viva pero su " +
                      "opacidad vale " + Math.round(op) + ". Invisible es invisible: el gesto le va a " +
                      "pasar a algo que el espectador no vio nunca, y no da error ni sintoma — " +
                      "simplemente no pasa nada en pantalla.");
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

  function escalaUno(capa) {
    var e = G.esc(capa).value, i;
    for (i = 0; i < e.length; i++) { if (Math.abs(Math.abs(e[i]) - 100) > 0.001) { return false; } }
    return true;
  }

  // La caja EN EL MUNDO, que no es la posicion de la capa: `sourceRectAtTime` devuelve la caja de
  // TINTA en el espacio de la capa, y para un texto empieza en la linea de base y no en el ancla.
  function cajaDe(o, capa, cuadro, quien) {
    if (o.ancho !== undefined && o.alto !== undefined && o.centro !== undefined) {
      return { cx: o.centro[0], cy: o.centro[1], ancho: o.ancho, alto: o.alto, medida: false };
    }
    var don = nombreDe(o, capa);
    if (!giroCero(capa)) {
      throw new Error(quien + " en " + don + ": la capa esta girada, asi que su caja en el mundo no " +
                      "sale de sourceRect y no la voy a adivinar. Pasale `ancho`, `alto` y `centro` a " +
                      "mano — medidos, no estimados.");
    }
    var r = null;
    try { r = capa.sourceRectAtTime(cuadro / G.fps(), false); } catch (exSR) { r = null; }
    if (r === null || r.width <= 0 || r.height <= 0) {
      throw new Error(quien + " en " + don + ": no pude medir la caja con sourceRectAtTime. Pasale " +
                      "`ancho`, `alto` y `centro`.");
    }
    // LAS TRES LECTURAS VAN EN EL CUADRO QUE PIDIERON, NO EN "AHORA".
    //
    // Decian `.value`, que es el valor actual de la propiedad — el de la ultima clave escrita, o el
    // pre-expresion. Sobre una capa que entra con un rebote de escala (que arranca en 0) eso devuelve
    // CERO, y la caja medida sale 0x0. El brillo entonces se dimensiona contra la nada: construye sin
    // error, no tira, y no cruza nada. Un no-op silencioso.
    //
    // `sourceRectAtTime` ya recibia el cuadro correcto; eran el anclaje, la escala y la posicion los que
    // se leian de otro momento. Medir la mitad de una cosa en un instante y la otra mitad en otro es la
    // familia de errores que este repo ya pago tres veces con otro nombre.
    var t = cuadro / G.fps();
    var anc = G.anc(capa).valueAtTime(t, false);
    var esc = G.esc(capa).valueAtTime(t, false);
    var pos = posEn(capa, t);
    var anchoCaja = r.width * Math.abs(esc[0]) / 100;
    var altoCaja = r.height * Math.abs(esc[1]) / 100;
    if (anchoCaja < 2 || altoCaja < 2) {
      throw new Error(quien + " en " + don + ": en el cuadro " + cuadro + " la caja mide " +
                      Math.round(anchoCaja) + "x" + Math.round(altoCaja) + " px. La fuente mide " +
                      Math.round(r.width) + "x" + Math.round(r.height) + " y la escala en ese cuadro es " +
                      Math.round(esc[0]) + "%. Sobre una caja de ese tamano el gesto se construye y no " +
                      "se ve: elegi un cuadro en que la capa ya este a su tamano, o pasale `ancho`, " +
                      "`alto` y `centro` a mano.");
    }
    return {
      cx: pos[0] + (r.left + r.width / 2 - anc[0]) * esc[0] / 100,
      cy: pos[1] + (r.top + r.height / 2 - anc[1]) * esc[1] / 100,
      ancho: anchoCaja,
      alto: altoCaja,
      medida: true
    };
  }

  function anchoDeCaja(capa, cuadro) {
    var r = null;
    try { r = capa.sourceRectAtTime(cuadro / G.fps(), false); } catch (exAC) { r = null; }
    if (r === null || r.width <= 0) { return 0; }
    return r.width * Math.abs(G.esc(capa).value[0]) / 100;
  }

  // A distancia d la camara achica todo por DIST/d. Sirve para hablar de PIXELES DE PANTALLA cuando lo
  // que se tiene son unidades de mundo — que es la unica manera de comparar contra el ancho de un
  // objeto, que tambien se achica.
  function factorPantalla(capa, z) {
    if (!capa.threeDLayer) { return 1; }
    var dist = G.distanciaCamara();
    var d = z + dist;
    if (d <= 0) { return 0; }
    return dist / d;
  }

  // ==============================================================================================
  // CLAVES: LEER, CORRER Y COPIAR CON SU CURVA — LEY DE FAMILIA 3
  // ==============================================================================================
  //
  // D02, D09 y D11 son la MISMA animacion corrida en el tiempo, y eso no se puede hacer con
  // `G.claves()`: G.claves toma curvas por NOMBRE, y aca las curvas ya existen como influencias
  // concretas en la propiedad de origen. Re-autorarlas con el nombre mas parecido cambiaria el gesto —
  // y el arrastre esta en el tiempo, no en la forma.
  //
  // Lo que si se conserva son las dos leyes del nucleo: cuadro entero y orden estricto. Se revisan
  // aca con los mismos numeros y el mismo mensaje, porque saltearlas por escribir directo seria
  // exactamente el agujero que el nucleo cerro.
  function leerClaves(prop) {
    var out = [], k;
    for (k = 1; k <= prop.numKeys; k++) {
      var c = {
        t: prop.keyTime(k),
        v: prop.keyValue(k),
        tipoIn: KeyframeInterpolationType.LINEAR,
        tipoOut: KeyframeInterpolationType.LINEAR,
        easeIn: null,
        easeOut: null
      };
      try { c.tipoIn = prop.keyInInterpolationType(k); } catch (exKI) { c.tipoIn = KeyframeInterpolationType.LINEAR; }
      try { c.tipoOut = prop.keyOutInterpolationType(k); } catch (exKO) { c.tipoOut = KeyframeInterpolationType.LINEAR; }
      try { c.easeIn = prop.keyInTemporalEase(k); } catch (exEI) { c.easeIn = null; }
      try { c.easeOut = prop.keyOutTemporalEase(k); } catch (exEO) { c.easeOut = null; }
      out[out.length] = c;
    }
    return out;
  }

  // Las influencias son por DIMENSION, y una propiedad espacial trae una sola pareja para las tres.
  // Copiar de una pista de 1 dimension a un vector de 3 —o al reves— sin adaptar tira un error de tipo
  // que culpa a la linea equivocada.
  //
  // Y la VELOCIDAD se escala junto con el valor: si el hijo hace el 22% del recorrido del padre, su
  // velocidad tambien es el 22%. Copiar la velocidad cruda deforma la curva justo en el unico lugar
  // donde el arrastre exige que sea identica.
  function adaptarEase(arr, n, factor) {
    var out = [], i, s;
    if (!arr || arr.length < 1) {
      for (i = 0; i < n; i++) { out[i] = new KeyframeEase(0, 16.666667); }
      return out;
    }
    for (i = 0; i < n; i++) {
      s = arr[i < arr.length ? i : arr.length - 1];
      out[i] = new KeyframeEase(s.speed * factor, s.influence);
    }
    return out;
  }

  function validarClaves(lista, donde) {
    var i, fps = G.fps();
    if (!lista || lista.length < 1) { throw new Error("claves sin lista en " + donde); }
    for (i = 0; i < lista.length; i++) {
      var cu = lista[i].t * fps;
      if (Math.abs(cu - Math.round(cu)) > 1e-6) {
        throw new Error("clave a mitad de cuadro: " + red(cu, 3) + " en " + donde +
                        ". Todas las claves caen en cuadro entero — con cuantizacion temporal una " +
                        "clave fraccionaria se redondea impredeciblemente y el golpe cae donde no era. " +
                        "Si esto salio de correr claves, el desplazamiento tiene que ser un entero.");
      }
      if (i > 0 && lista[i].t <= lista[i - 1].t) {
        throw new Error("claves fuera de orden en " + donde + ": " + red(lista[i - 1].t * fps, 2) +
                        " -> " + red(lista[i].t * fps, 2) + ". AE pisa la clave anterior en silencio y " +
                        "el gesto desaparece sin error.");
      }
    }
  }

  // PONER UNA INFLUENCIA PROMUEVE LA CLAVE A BEZIER DE LOS DOS LADOS y pisa el tipo del tramo vecino.
  // Por eso el tipo se fija DESPUES de la influencia, igual que en el nucleo.
  function escribirClaves(prop, lista, factor, donde) {
    var i, k;
    if (factor === undefined) { factor = 1; }
    validarClaves(lista, donde);
    for (i = 0; i < lista.length; i++) { prop.setValueAtTime(lista[i].t, lista[i].v); }
    for (i = 0; i < lista.length; i++) {
      k = prop.nearestKeyIndex(lista[i].t);
      var esB = (lista[i].tipoIn === KeyframeInterpolationType.BEZIER) ||
                (lista[i].tipoOut === KeyframeInterpolationType.BEZIER);
      if (esB && lista[i].easeIn && lista[i].easeOut) {
        try {
          var dims = prop.keyOutTemporalEase(k).length;
          prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
          prop.setTemporalEaseAtKey(k, adaptarEase(lista[i].easeIn, dims, factor),
                                       adaptarEase(lista[i].easeOut, dims, factor));
        } catch (exEE) { G.avisar("no pude copiar la influencia de una clave en " + donde + ": " + exEE.message); }
      }
      try { prop.setInterpolationTypeAtKey(k, lista[i].tipoIn, lista[i].tipoOut); } catch (exTI) { }
    }
    return lista.length;
  }

  function borrarClaves(prop) {
    var n = 0;
    while (prop.numKeys > 0) { prop.removeKey(prop.numKeys); n++; }
    return n;
  }

  function correrClaves(prop, dc, donde) {
    var nk = 0;
    try { nk = prop.numKeys; } catch (exCC) { nk = 0; }
    if (nk === 0) { return 0; }
    if (Math.abs(dc - Math.round(dc)) > 1e-9) {
      throw new Error("correr claves en " + donde + ": el desplazamiento " + dc + " no es un numero " +
                      "entero de cuadros, y eso pone TODAS las claves a mitad de cuadro.");
    }
    var lista = leerClaves(prop), i, dt = dc / G.fps();
    borrarClaves(prop);
    for (i = 0; i < lista.length; i++) { lista[i].t = lista[i].t + dt; }
    return escribirClaves(prop, lista, 1, donde);
  }

  // Con dimensiones separadas el grupo de transformacion trae Position_0/1/2 Y la Position madre. Se
  // recorren todas: la que no tenga claves no cuesta nada y la que las tenga no se puede olvidar.
  function propsDeTransformacion(capa) {
    var t = G.tr(capa), out = [], i, p;
    var n = 0;
    try { n = t.numProperties; } catch (exNT) { n = 0; }
    for (i = 1; i <= n; i++) {
      p = null;
      try { p = t.property(i); } catch (exPP) { p = null; }
      if (p === null) { continue; }
      var ok = false;
      try { ok = (typeof p.numKeys === "number"); } catch (exNQ) { ok = false; }
      if (ok) { out[out.length] = p; }
    }
    return out;
  }

  // El gesto de una capa: la propiedad de transformacion con mas claves, y la ventana que ocupan
  // TODAS. Sirve para saber cuando empieza y cuando frena, que es lo que gobierna la estela y la
  // sombra.
  function gestoDe(capa) {
    var props = propsDeTransformacion(capa), i, mejor = null, nMejor = 0, tmin = null, tmax = null;
    for (i = 0; i < props.length; i++) {
      var p = props[i], nk = 0;
      try { nk = p.numKeys; } catch (exNK) { nk = 0; }
      if (nk < 2) { continue; }
      var a = p.keyTime(1), b = p.keyTime(nk);
      if (tmin === null || a < tmin) { tmin = a; }
      if (tmax === null || b > tmax) { tmax = b; }
      if (nk > nMejor) { mejor = p; nMejor = nk; }
    }
    if (mejor === null) { return null; }
    return {
      prop: mejor,
      claves: nMejor,
      inicio: Math.round(tmin * G.fps()),
      fin: Math.round(tmax * G.fps())
    };
  }

  function pistaAnimada(capa, quien, don) {
    var e = G.ejes(capa);
    var cand = [e.x, e.y], i, mejor = null, n = 0;
    if (e.z !== null) { cand[cand.length] = e.z; }
    for (i = 0; i < cand.length; i++) {
      if (cand[i].numKeys > n) { mejor = cand[i]; n = cand[i].numKeys; }
    }
    if (mejor === null || n < 2) {
      throw new Error(quien + " en " + don + ": la posicion de esa capa no tiene claves, asi que no hay " +
                      "movimiento del que sacar el arrastre. Anima el padre primero.");
    }
    return mejor;
  }

  // ==============================================================================================
  // EL NULO PROPIO — LEY DE FAMILIA 2 Y 4
  // ==============================================================================================
  //
  // El acuse y el micro NO van sobre la propiedad que ya lleva el gesto del elemento: van en un nulo.
  // Asi el segundo orden no ensucia el primero, se puede sacar sin tocar nada, y sobre todo: no lo
  // pisa. Escribir claves encima de un gesto existente no da error — da un gesto que desaparece.
  //
  // Y ACA VIVE LA COMPROBACION QUE COSTO ESCRIBIR Y VALE POR TODA LA FUNCION. Al colgar, AE reescribe
  // la transformacion del hijo para conservar su lugar en el mundo. Esa compensacion es de UN INSTANTE:
  // con la posicion ya animada, AE puede dejar la capa en su lugar en el cuadro actual y corrida en
  // todos los demas. No hay error, no hay dialogo, y el sintoma aparece recien en el video.
  //
  // Por eso: se anota la posicion en el mundo en cada clave ANTES, se cuelga, y se compara DESPUES.
  // Si no coincide se tira, con el numero medido y con la salida (colgar el nulo antes de animar).
  api.nuloPara = function (capa, nombre) {
    var don = capa.name;
    var existente = buscarCapa(nombre);
    if (existente !== null) { return existente; }

    var padreViejo = null;
    try { padreViejo = capa.parent; } catch (exNP) { padreViejo = null; }
    if (padreViejo !== null && padreViejo !== undefined) {
      if (!giroCero(padreViejo) || !escalaUno(padreViejo)) {
        throw new Error("nuloPara en " + don + ": el padre actual ('" + padreViejo.name + "') esta " +
                        "girado o escalado, asi que un desplazamiento en pixeles del nulo no llega a la " +
                        "pantalla como esos pixeles. Meté el nulo mas arriba en la cadena, o desarma el giro.");
      }
    }

    var tiempos = tiemposDeClavesPos(capa);
    tiempos[tiempos.length] = 0;
    var antes = [], i;
    for (i = 0; i < tiempos.length; i++) { antes[i] = posEn(capa, tiempos[i]); }

    // El nulo se crea con la duracion de la comp a proposito: el defecto de `addNull` cambio entre
    // versiones y un nulo de un segundo deja de mover a sus hijos a mitad de la pieza, sin error.
    var n = G.comp().layers.addNull(G.cuadros() / G.fps());
    n.name = nombre;
    if (capa.threeDLayer) { n.threeDLayer = true; }
    if (padreViejo !== null && padreViejo !== undefined) { n.parent = padreViejo; }

    // El nulo se planta EXACTAMENTE donde esta la capa y en el mismo marco, asi la posicion local del
    // hijo queda en cero y el desplazamiento del nulo se lee como desplazamiento del hijo, sin cuentas.
    var loc = leerPos(capa);
    if (n.threeDLayer) { G.pos(n).setValue([loc[0], loc[1], loc.length > 2 ? loc[2] : 0]); }
    else { G.pos(n).setValue([loc[0], loc[1]]); }

    // Un nulo no dibuja, pero el apilado ES el orden de dibujo (LEY 1): dejarlo pegado arriba de su
    // hijo mantiene la vecindad legible y no mete una capa en el medio de dos que se ordenan por Z.
    n.moveBefore(capa);
    capa.parent = n;

    var pn = leerPos(n), j;
    for (i = 0; i < tiempos.length; i++) {
      var d = posEn(capa, tiempos[i]), err = 0;
      for (j = 0; j < antes[i].length; j++) {
        var nuevo = d[j] + (j < pn.length ? pn[j] : 0);
        err = Math.max(err, Math.abs(nuevo - antes[i][j]));
      }
      if (err > 0.01) {
        throw new Error("nuloPara en " + don + ": al colgar la capa del nulo, su posicion en el cuadro " +
                        Math.round(tiempos[i] * G.fps()) + " se corrio " + red(err, 2) + " px. AE compensa " +
                        "el emparentado en UN instante, y con la posicion ya animada el resto de las " +
                        "claves queda corrido — sin error y sin sintoma hasta el render. Colgale el nulo " +
                        "ANTES de animarle la posicion, o construile el nulo vos y pasalo en `nulo`.");
      }
    }

    G.anotar("NULO|" + nombre + "|para " + don + "|claves revisadas " + tiempos.length);
    return n;
  };

  // ==============================================================================================
  // D01 · ACUSE DE GOLPE
  // ==============================================================================================
  //
  // Algo entra y lo que ya estaba SE CORRE UN POCO Y VUELVE. El espectador no lo lee como "se movio el
  // panel": lo lee como que la cosa que entro PESA. Es el gesto que establece que los objetos de la
  // escena se enteran uno del otro, y es la diferencia entre escenografia y utileria quieta.
  //
  // LA ASIMETRIA 2:8 *ES* EL GESTO, y por eso esta hecha cumplir. Ida 2 cuadros, vuelta 8. Un acuse
  // simetrico no es un golpe: es un empujon, y se lee como que el panel decidio moverse. Por eso la
  // funcion tira si la vuelta no es al menos el doble de la ida.
  //
  // LAS CURVAS TAMPOCO SON DECORACION. La ida va C7 (influencia de salida 0: arranca a maxima
  // velocidad — un golpe no acelera) y la vuelta C2 (10/92: se acomoda largo). Con Easy Ease en la ida
  // el golpe desaparece entero y no lo caza nada.
  //
  // LA MAGNITUD SALE DEL ANCHO DEL QUE ACUSA, NO DEL QUE GOLPEA: 1,5-3%. Un panel de 900 px acusa
  // 4-12 px; una tipografia, 2-4; hasta 25 si lo que llega es enorme. Pasando 25 deja de ser un acuse
  // y se convierte en un gesto propio que compite con el que lo causo.
  //
  // Y VA EN UN NULO PROPIO (ley de familia 2): asi el acuse no ensucia la animacion del elemento, se
  // puede sacar sin tocarla, y sobre todo no la pisa.
  api.acuseDeGolpe = function (o) {
    o = o || {};
    var quien = "D01 acuseDeGolpe";
    var cuadro = pedir(o, "cuadro", quien);
    var capas = o.capas ? o.capas : [pedir(o, "capa", quien)];
    var ida = o.ida === undefined ? 2 : o.ida;
    var vuelta = o.vuelta === undefined ? 8 : o.vuelta;
    var retardo = o.retardo === undefined ? 1 : o.retardo;
    var eje = o.eje === undefined ? "y" : o.eje;
    var direccion = o.direccion === undefined ? 1 : signo(o.direccion);
    var margen = o.margenVivo === undefined ? 2 : o.margenVivo;

    if (capas.length < 1) { throw new Error(quien + ": la lista de capas esta vacia."); }
    if (capas.length > 4) {
      throw new Error(quien + ": " + capas.length + " capas en cascada. El maximo es 4 — mas que eso el " +
                      "ojo deja de leer una onda que sale del impacto y empieza a contar elementos, que " +
                      "es exactamente lo contrario de lo que hace el acuse. Elegi los 4 mas cercanos al " +
                      "punto de contacto, o lo que queres es un escalonado (D04).");
    }
    if (ida < 1) { throw new Error(quien + ": la ida no puede durar 0 cuadros."); }
    if (vuelta < ida * 2) {
      throw new Error(quien + ": ida " + ida + " y vuelta " + vuelta + ". LA ASIMETRIA ES EL GESTO: el " +
                      "golpe sale de golpe (2 cuadros) y vuelve lento (8). Con la vuelta pareja a la ida " +
                      "no se lee un impacto, se lee un empujon — el objeto parece haber decidido moverse. " +
                      "La vuelta va al menos al doble de la ida.");
    }
    if (direccion === 0) { throw new Error(quien + ": `direccion` va 1 o -1; es el sentido del golpe."); }

    var nulos = [], i, fin = cuadro;
    for (i = 0; i < capas.length; i++) {
      var capa = capas[i];
      var don = nombreDe(o, capa) + (capas.length > 1 ? ("#" + (i + 1)) : "");
      var c0 = cuadro + i * retardo;

      exigirViva(capa, c0, margen, quien, don);

      // LA MAGNITUD, con su piso y su techo medidos contra el ancho del QUE ACUSA.
      var an = anchoDeCaja(capa, c0);
      var mag;
      if (o.desplazamiento !== undefined) {
        mag = o.desplazamiento;
      } else {
        if (an <= 0) {
          throw new Error(quien + " en " + don + ": no pude medir el ancho de la capa, asi que no puedo " +
                          "sacar la magnitud del acuse (1,5-3% del ancho DEL QUE ACUSA). Pasale " +
                          "`desplazamiento` en pixeles, medido.");
        }
        var base = an * 0.02;
        if (esTexto(capa)) { base = apretar(base, 2, 4); } else { base = apretar(base, 4, 12); }
        mag = base * direccion;
      }
      if (Math.abs(mag) < 1) {
        throw new Error(quien + " en " + don + ": " + red(mag, 2) + " px de acuse no se ve. Por debajo de " +
                        "1 px el gesto existe en el documento y no en la pantalla, que es la peor de las " +
                        "dos opciones: cuesta claves y no comunica nada.");
      }
      if (Math.abs(mag) > 25) {
        throw new Error(quien + " en " + don + ": " + Math.round(mag) + " px de acuse. El techo es 25, y " +
                        "es para cuando lo que golpea es enorme. Pasando eso el acuse deja de ser " +
                        "secundario y compite con el gesto que lo causo — se leen dos cosas moviendose, " +
                        "no una reaccionando a la otra.");
      }
      if (an > 0 && Math.abs(mag) > an * 0.06) {
        G.avisar(quien + " en " + don + ": el acuse mide " + Math.round(Math.abs(mag) / an * 100) +
                 "% del ancho de la capa (" + Math.round(an) + " px) y el rango es 1,5-3%.");
      }
      if (esTexto(capa) && Math.abs(mag) > 5) {
        G.avisar(quien + " en " + don + ": " + Math.round(Math.abs(mag)) + " px sobre tipografia. En " +
                 "texto el acuse va 2-4 px: mas que eso se lee como que el renglon salto.");
      }

      var nombreNulo = "acuse-" + capa.name;
      var nulo = o.nulo ? o.nulo : api.nuloPara(capa, nombreNulo);
      var prop = pista(nulo, eje, quien);

      // Varios acuses sobre el mismo nulo son lo normal (un panel acusa tres llegadas distintas). Lo
      // que no se puede es que se pisen: G.claves revisa el orden DE SU LISTA, no contra lo que ya
      // habia, y una clave anterior se pisa en silencio.
      if (prop.numKeys > 0) {
        var ultimo = Math.round(prop.keyTime(prop.numKeys) * G.fps());
        if (c0 <= ultimo) {
          throw new Error(quien + " en " + don + ": ya hay un acuse en ese nulo que termina en el cuadro " +
                          ultimo + " y este arranca en el " + c0 + ". Se pisarian, y AE pisa la clave " +
                          "anterior sin decir nada: el acuse viejo desaparece. Corré este al cuadro " +
                          (ultimo + 1) + " o mas.");
        }
      }

      var reposo = prop.value;
      G.claves(prop, [[c0, reposo, "C7"],
                      [c0 + ida, reposo + mag, "C2"],
                      [c0 + ida + vuelta, reposo]], don + "/acuse" + eje);

      nulos[nulos.length] = nulo;
      fin = Math.max(fin, c0 + ida + vuelta);
      G.anotar("D01|" + don + "|c" + c0 + "|eje " + eje + "|" + red(mag, 1) + " px|" + ida + "+" + vuelta);
    }

    return { nulos: nulos, nulo: nulos[0], fin: fin, cuadro: cuadro };
  };

  // ==============================================================================================
  // D02 · ARRASTRE
  // ==============================================================================================
  //
  // Una parte llega DESPUES que la otra, porque la sigue. Es lo que hace que un grupo de objetos
  // parezca tener una articulacion en vez de ser un bloque pegado con cinta.
  //
  // Y ACA HAY DOS GESTOS DISTINTOS QUE SE LLAMAN IGUAL. Confundirlos no da error: da un elemento que
  // se mueve el doble, o uno que no se mueve nada.
  //
  //   · "copiar"  — el hijo NO cuelga del padre. Se le copian las claves del padre corridas 2-4
  //                 cuadros y reducidas al 15-30%: hace su propia version chica del movimiento.
  //   · "colgado" — el hijo SI cuelga del padre, asi que el padre YA lo lleva. Copiarle el movimiento
  //                 encima lo moveria dos veces. Lo que falta es el RETARDO, que es una animacion
  //                 LOCAL de contra-movimiento: local(t) = fuerza * (padre(t - retardo) - padre(t)).
  //                 Eso se hornea una clave por cuadro, y el horneado es EXACTO: el exportador
  //                 muestrea una vez por cuadro, asi que entre dos claves consecutivas no queda
  //                 interpolacion que pueda diferir. Por eso van lineales y no es un atajo.
  //
  // El modo se DEDUCE del emparentado y se comprueba: pedir el que no es tira, con la explicacion.
  //
  // LA CURVA NO SE TOCA: es la misma del padre, copiada con su influencia. El arrastre esta en el
  // TIEMPO, no en la forma — cambiarle la curva al hijo lo convierte en otro gesto que arranca tarde.
  //
  // MAS DE 5 CUADROS YA NO ES ARRASTRE, es un segundo evento: el ojo cuenta dos cosas moviendose.
  api.arrastre = function (o) {
    o = o || {};
    var quien = "D02 arrastre";
    var hijo = pedir(o, "capa", quien);
    var padre = pedir(o, "padre", quien);
    var don = nombreDe(o, hijo);
    var retardo = o.retardo === undefined ? 3 : o.retardo;

    if (hijo === padre) { throw new Error(quien + " en " + don + ": el hijo y el padre son la misma capa."); }
    if (retardo < 1 || Math.abs(retardo - Math.round(retardo)) > 1e-9) {
      throw new Error(quien + " en " + don + ": el retardo va en cuadros enteros y al menos 1.");
    }
    if (retardo > 5) {
      throw new Error(quien + " en " + don + ": " + retardo + " cuadros de retardo. Pasando 5 el ojo deja " +
                      "de leer una parte que sigue a la otra y cuenta DOS gestos. El rango es 2 (rigido " +
                      "o liviano) a 4 (blando o lejano). Si lo que queres es un segundo evento, " +
                      "autoralo como tal, con su propia curva.");
    }

    var cuelga = false;
    try { cuelga = (hijo.parent === padre); } catch (exCu) { cuelga = false; }
    var modo = o.modo === undefined ? (cuelga ? "colgado" : "copiar") : o.modo;

    if (modo === "copiar" && cuelga) {
      throw new Error(quien + " en " + don + ": el hijo CUELGA del padre, asi que el padre ya lo lleva. " +
                      "Copiarle las claves encima lo mueve dos veces — y no da error, da un elemento que " +
                      "se va del cuadro. Con emparentado el arrastre es el modo 'colgado', que anima el " +
                      "retardo LOCAL. O desconecta el emparentado, si lo que queres son dos gestos.");
    }
    if (modo === "colgado" && !cuelga) {
      throw new Error(quien + " en " + don + ": el modo 'colgado' anima el retardo LOCAL respecto del " +
                      "padre, y esta capa no cuelga de '" + padre.name + "'. Colgala primero, o usa el " +
                      "modo 'copiar'.");
    }

    var fuente = o.propFuente ? o.propFuente : pistaAnimada(padre, quien, padre.name);
    var ejeHijo = o.eje === undefined ? "x" : o.eje;

    // ------------------------------------------------------------------ modo "rotacion"
    // La rotacion es el arrastre mas barato que hay: una etiqueta colgada que se atrasa cuatro grados
    // dice "esto cuelga" con una sola pista y sin tocar la posicion. Sale de la MISMA senal de retardo
    // que el modo colgado, normalizada a los grados pedidos: no es un adorno aparte, es el mismo dato.
    if (modo === "rotacion") {
      var grados = o.grados === undefined ? 6 : o.grados;
      if (grados <= 0) { throw new Error(quien + " en " + don + ": `grados` va en positivo."); }
      if (grados > 15) {
        throw new Error(quien + " en " + don + ": " + grados + " grados de arrastre. El rango del oficio " +
                        "es 4-10; pasando 15 no se lee como una parte que sigue, se lee como que la pieza " +
                        "se descolgo.");
      }
      return arrastreRotacion(hijo, fuente, retardo, grados, quien, don);
    }

    // ------------------------------------------------------------------ modo "colgado"
    if (modo === "colgado") {
      var fuerza = o.fuerza === undefined ? 1 : o.fuerza;
      if (o.factor !== undefined) {
        throw new Error(quien + " en " + don + ": en modo 'colgado' la perilla es `fuerza` (0 a 1), no " +
                        "`factor`. No son sinonimos: `factor` es cuanto del recorrido del padre repite " +
                        "el hijo, y aca el hijo no repite nada porque el padre ya lo lleva. Lo unico que " +
                        "se dosifica es cuanto del retardo natural se conserva.");
      }
      if (fuerza <= 0 || fuerza > 1.5) {
        throw new Error(quien + " en " + don + ": `fuerza` va entre 0 y 1. Con 1 el hijo se atrasa " +
                        "exactamente los " + retardo + " cuadros pedidos, que es el tamano correcto por " +
                        "construccion; bajarla es suavizar, subirla es inventar recorrido.");
      }
      return arrastreColgado(hijo, fuente, retardo, fuerza, ejeHijo, quien, don);
    }

    // ------------------------------------------------------------------ modo "copiar"
    if (modo !== "copiar") {
      throw new Error(quien + " en " + don + ": modo desconocido '" + modo + "'. Validos: copiar, colgado, rotacion");
    }
    var factor = o.factor === undefined ? 0.22 : o.factor;
    if (factor <= 0) { throw new Error(quien + " en " + don + ": `factor` va en positivo."); }
    if (factor > 0.5) {
      throw new Error(quien + " en " + don + ": factor " + factor + ". El hijo repetiria el " +
                      Math.round(factor * 100) + "% del recorrido del padre y el rango es 15-30%. Con mas " +
                      "de la mitad los dos se leen como el mismo gesto hecho dos veces, no como uno que " +
                      "arrastra al otro.");
    }
    if (factor < 0.15 || factor > 0.30) {
      G.avisar(quien + " en " + don + ": factor " + Math.round(factor * 100) + "%, y el rango es 15-30%.");
    }

    var destino = pista(hijo, ejeHijo, quien);
    if (destino.numKeys > 0) {
      throw new Error(quien + " en " + don + ": la pista " + ejeHijo + " del hijo ya tiene " +
                      destino.numKeys + " claves, y copiar encima las pisa en silencio. Poné el arrastre " +
                      "en un nulo propio: Gd.nuloPara(capa, 'arrastre-' + capa.name).");
    }

    var lista = leerClaves(fuente), i;
    if (lista.length < 2) {
      throw new Error(quien + " en " + don + ": el padre tiene " + lista.length + " clave(s) y no hay " +
                      "movimiento del que arrastrar.");
    }
    var base = destino.value;
    var v0 = lista[0].v;
    var dt = retardo / G.fps();
    for (i = 0; i < lista.length; i++) {
      lista[i].t = lista[i].t + dt;
      lista[i].v = base + factor * (lista[i].v - v0);
    }
    escribirClaves(destino, lista, factor, don + "/arrastre" + ejeHijo);

    var recorrido = Math.abs(lista[lista.length - 1].v - lista[0].v);
    G.anotar("D02|" + don + "|copiar|retardo " + retardo + "|factor " + factor + "|recorrido " +
             red(recorrido, 1));
    return { capa: hijo, prop: destino, modo: "copiar", claves: lista.length, recorrido: recorrido };
  };

  // El retardo local, horneado. Va aparte porque es el unico de los tres modos que MUESTREA en vez de
  // copiar: la senal de retardo no existe como claves en ningun lado, hay que calcularla.
  function arrastreColgado(hijo, fuente, retardo, fuerza, eje, quien, don) {
    var fps = G.fps();
    var n = fuente.numKeys;
    var c0 = Math.round(fuente.keyTime(1) * fps);
    var c1 = Math.round(fuente.keyTime(n) * fps) + retardo;
    if (c1 > G.cuadros()) {
      G.avisar(quien + " en " + don + ": el arrastre termina en el cuadro " + c1 + " y la pieza dura " +
               G.cuadros() + ". Las claves de mas alla del final existen y no se ven.");
    }
    var destino = pista(hijo, eje, quien);
    if (destino.numKeys > 0) {
      throw new Error(quien + " en " + don + ": la pista " + eje + " del hijo ya tiene " + destino.numKeys +
                      " claves. El horneado del retardo escribe una clave por cuadro y las pisaria a " +
                      "todas. Poné el arrastre en un nulo intermedio: Gd.nuloPara(capa, 'arrastre-' + capa.name).");
    }
    var base = destino.value;
    var lista = [], c, maxAbs = 0;
    for (c = c0; c <= c1; c++) {
      var a = fuente.valueAtTime((c - retardo) / fps, false);
      var b = fuente.valueAtTime(c / fps, false);
      var s = fuerza * (a - b);
      if (Math.abs(s) > maxAbs) { maxAbs = Math.abs(s); }
      lista[lista.length] = [c, base + s, "LINEAL"];
    }
    if (maxAbs < 0.5) {
      throw new Error(quien + " en " + don + ": el retardo maximo daria " + red(maxAbs, 2) + " px. El " +
                      "movimiento del padre es tan lento que atrasarse " + retardo + " cuadros no se ve. " +
                      "Un arrastre invisible cuesta " + lista.length + " claves y no comunica nada: o el " +
                      "gesto del padre tiene que ser mas rapido, o esto no va.");
    }
    if (lista.length > 120) {
      G.avisar(quien + " en " + don + ": " + lista.length + " claves horneadas. Es el precio correcto " +
               "(el retardo no existe como claves en ningun lado), pero si el gesto del padre dura tanto, " +
               "quizas lo que hace falta es una deriva y no un arrastre.");
    }
    G.claves(destino, lista, don + "/arrastre" + eje);
    G.anotar("D02|" + don + "|colgado|retardo " + retardo + "|pico " + red(maxAbs, 1) + " px|claves " + lista.length);
    return { capa: hijo, prop: destino, modo: "colgado", claves: lista.length, pico: maxAbs };
  }

  function arrastreRotacion(hijo, fuente, retardo, grados, quien, don) {
    var fps = G.fps();
    var n = fuente.numKeys;
    var c0 = Math.round(fuente.keyTime(1) * fps);
    var c1 = Math.round(fuente.keyTime(n) * fps) + retardo;
    var destino = G.rotZ(hijo);
    if (destino.numKeys > 0) {
      throw new Error(quien + " en " + don + ": la rotacion Z del hijo ya tiene " + destino.numKeys +
                      " claves y esto las pisaria.");
    }
    var base = destino.value;
    var crudo = [], c, maxAbs = 0;
    for (c = c0; c <= c1; c++) {
      var s = fuente.valueAtTime((c - retardo) / fps, false) - fuente.valueAtTime(c / fps, false);
      crudo[crudo.length] = s;
      if (Math.abs(s) > maxAbs) { maxAbs = Math.abs(s); }
    }
    if (maxAbs < 1e-6) {
      throw new Error(quien + " en " + don + ": el padre no se mueve lo suficiente como para que " +
                      retardo + " cuadros de retardo den rotacion.");
    }
    var lista = [], i;
    for (i = 0; i < crudo.length; i++) {
      lista[lista.length] = [c0 + i, base + grados * crudo[i] / maxAbs, "LINEAL"];
    }
    G.claves(destino, lista, don + "/arrastreRot");
    G.anotar("D02|" + don + "|rotacion|retardo " + retardo + "|" + grados + " grados|claves " + lista.length);
    return { capa: hijo, prop: destino, modo: "rotacion", claves: lista.length, grados: grados };
  }

  // ==============================================================================================
  // D03 · SOLAPAMIENTO
  // ==============================================================================================
  //
  // No es un gesto: es una regla de tiempos, y cuesta CERO. El gesto B arranca cuando A va por el 65%
  // de su recorrido, no cuando A termino. Una pieza donde cada cosa espera que la anterior termine se
  // siente lenta aunque ningun gesto dure mucho — es literalmente el diagnostico "esta muerto y no
  // tiene beat", y se arregla moviendo bloques de claves, sin tocar una sola curva.
  //
  // LOS DOS MODOS:
  //   · calcular  — {cuadro, dur} y devuelve en que cuadro arranca el siguiente.
  //   · revisar   — {gestos: [{nombre, cuadro, dur}, ...]} y verifica los pares consecutivos.
  //
  // Y LA REVISION TIENE UNA SUTILEZA QUE NO SE PUEDE SALTEAR: un HUECO no siempre es un defecto. El
  // reposo (4-10 cuadros donde no pasa nada) es un gesto y es el que hace que el siguiente pegue. Lo
  // que delata a un amateur es la tierra de nadie: B arrancando justo cuando A termina, o solapando un
  // 5%. Eso se lee secuencial y contable. Asi que se acepta solape >= 20% O hueco >= 4 cuadros, y se
  // tira exactamente en el medio, que es donde nadie decidio nada.
  api.solapamiento = function (o) {
    o = o || {};
    var quien = "D03 solapamiento";

    if (o.gestos) {
      var g = o.gestos, i, salida = [];
      if (g.length < 2) { throw new Error(quien + ": revisar necesita al menos dos gestos."); }
      for (i = 1; i < g.length; i++) {
        var a = g[i - 1], b = g[i];
        var na = a.nombre ? a.nombre : ("gesto " + i);
        var nb = b.nombre ? b.nombre : ("gesto " + (i + 1));
        if (a.dur === undefined || a.cuadro === undefined || b.cuadro === undefined) {
          throw new Error(quien + ": cada gesto necesita `cuadro` y `dur`.");
        }
        var finA = a.cuadro + a.dur;
        var hueco = b.cuadro - finA;
        var solape = (finA - b.cuadro) / a.dur;
        if (b.cuadro < a.cuadro) {
          throw new Error(quien + ": '" + nb + "' arranca en el cuadro " + b.cuadro + ", antes que '" +
                          na + "' (" + a.cuadro + "). La lista va en orden de tiempo.");
        }
        if (solape < 0.20 && hueco < 4) {
          throw new Error(quien + ": entre '" + na + "' y '" + nb + "' hay " +
                          (hueco >= 0 ? (hueco + " cuadros de hueco") : (Math.round(solape * 100) + "% de solape")) +
                          ". Eso es la tierra de nadie: no solapa lo suficiente como para leerse " +
                          "encadenado (hace falta 20% o mas, o sea que '" + nb + "' arranque en el " +
                          (a.cuadro + Math.round(a.dur * 0.65)) + ") ni descansa lo suficiente como para " +
                          "leerse como un reposo a proposito (hacen falta 4 cuadros, o sea el " +
                          (finA + 4) + "). Se lee secuencial y contable, que es el defecto #4 del catalogo.");
        }
        if (solape > 0.60) {
          G.avisar(quien + ": '" + na + "' y '" + nb + "' solapan " + Math.round(solape * 100) + "%. Si " +
                   "son elementos iguales de una cascada esta bien y es D04; si son gestos distintos, " +
                   "por encima del 60% se leen simultaneos y se pierde la jerarquia.");
        }
        salida[salida.length] = { de: na, a: nb, solape: red(solape, 3), hueco: hueco };
      }
      G.anotar("D03|revisar|" + g.length + " gestos|" + salida.length + " pares OK");
      return { ok: true, pares: salida };
    }

    var cuadro = pedir(o, "cuadro", quien);
    var dur = pedir(o, "dur", quien);
    var en = o.en === undefined ? 0.65 : o.en;
    if (dur < 1) { throw new Error(quien + ": `dur` va en cuadros y al menos 1."); }
    if (en < 0.40 || en > 0.80) {
      throw new Error(quien + ": `en` = " + en + ". B arranca cuando A va por el 65% de su recorrido; el " +
                      "rango util es 0,40 a 0,80 (o sea 60% a 20% de solape). Por debajo de 0,40 los dos " +
                      "gestos se leen simultaneos y se pierde la jerarquia; por encima de 0,80 se lee " +
                      "secuencial y contable.");
    }
    var arranque = cuadro + Math.round(dur * en);
    var sol = (cuadro + dur - arranque) / dur;
    G.anotar("D03|calcular|A c" + cuadro + " dur " + dur + "|B c" + arranque + "|solape " +
             Math.round(sol * 100) + "%");
    return { cuadro: arranque, arranque: arranque, solape: red(sol, 3), finA: cuadro + dur };
  };

  // ==============================================================================================
  // D04 · ESCALONADO GENERAL
  // ==============================================================================================
  //
  // N elementos iguales entran uno tras otro con un retardo fijo. Convierte una grilla muerta en una
  // ola. La formula del catalogo no es un adorno: `retardo = clamp(round(2*dur/(n-1)), 1, 6)` ata el
  // retardo a la duracion del gesto, que es lo que hace que una cascada de 4 y una de 12 se sientan
  // igual de vivas.
  //
  // EL PRESUPUESTO ES LO QUE MAS SE ROMPE: la cascada entera no pasa de 2x la duracion de un gesto.
  // Treinta elementos por dos cuadros son sesenta cuadros = dos segundos de espera mirando cargar una
  // lista. Por eso pasando el presupuesto esto TIRA, y ofrece las dos salidas del oficio: agrupar, o
  // delta decreciente (2,2,2,1,1,1).
  //
  // Y LA VARIANTE QUE CUESTA LO MISMO Y SE VE MUCHO MEJOR: escalonar DESDE EL CENTRO hacia afuera, o
  // desde donde estaba mirando el ojo, en vez de arriba-abajo. Es `orden`.
  api.escalonadoGeneral = function (o) {
    o = o || {};
    var quien = "D04 escalonadoGeneral";
    var n = pedir(o, "n", quien);
    var dur = pedir(o, "dur", quien);
    var cuadro = o.cuadro === undefined ? 0 : o.cuadro;
    var orden = o.orden === undefined ? "secuencia" : o.orden;

    if (n < 2) { throw new Error(quien + ": " + n + " elemento(s). Un escalonado necesita al menos dos."); }
    if (dur < 1) { throw new Error(quien + ": `dur` va en cuadros y al menos 1."); }
    if (n > 15) {
      throw new Error(quien + ": " + n + " elementos con delta fijo. El techo es 15 — mas que eso el ojo " +
                      "deja de leer una ola y se pone a esperar. Agrupalos (tres bloques de cinco que " +
                      "entran como tres elementos), o parti la cascada en dos momentos de la pieza.");
    }

    // LA FORMULA Y EL PRESUPUESTO SE CONTRADICEN POR UN REDONDEO, y hay que decir cual manda.
    // `retardo = round(2*dur/(n-1))` esta hecha para que la cascada mida EXACTAMENTE 2*dur — se ve
    // despejandola. El redondeo HACIA ARRIBA la pasa, y no en un caso raro: con n=6 y dur=14, que es de
    // lo mas comun que hay, da round(5,6)=6 y 5*6=30 cuadros contra un presupuesto de 28.
    // Gana el presupuesto. La formula es la manera de llegar al presupuesto, y el presupuesto es el que
    // tiene consecuencia visible: el espectador esperando al ultimo elemento. Asi que cuando el redondeo
    // lo rompe, se baja un cuadro. Queda anotado porque es una decision, no una cuenta.
    var retardo;
    if (o.retardo === undefined) {
      retardo = apretar(Math.round(2 * dur / (n - 1)), 1, 6);
      if ((n - 1) * retardo > 2 * dur && retardo > 1) { retardo = retardo - 1; }
    } else {
      retardo = o.retardo;
    }
    if (retardo < 1 || Math.abs(retardo - Math.round(retardo)) > 1e-9) {
      throw new Error(quien + ": el retardo va en cuadros enteros y al menos 1.");
    }

    // Delta decreciente: la unica forma honesta de meter muchos elementos sin gastar el presupuesto.
    // Con retardo 2 y n 7 da exactamente 2,2,2,1,1,1, que es la progresion del catalogo.
    var deltas = [], j;
    if (o.decreciente && n > 2) {
      for (j = 0; j < n - 1; j++) {
        deltas[j] = Math.max(1, Math.round(retardo - (retardo - 1) * j / (n - 2)));
      }
    } else {
      for (j = 0; j < n - 1; j++) { deltas[j] = retardo; }
    }

    var pasos = [], i;
    pasos[0] = 0;
    for (i = 1; i < n; i++) { pasos[i] = pasos[i - 1] + deltas[i - 1]; }

    var propios = [];
    if (orden === "secuencia") {
      for (i = 0; i < n; i++) { propios[i] = pasos[i]; }
    } else if (orden === "centro" || orden === "bordes" || orden === "desde") {
      var pivote;
      if (orden === "desde") { pivote = pedir(o, "desde", quien); }
      else { pivote = (n - 1) / 2; }
      for (i = 0; i < n; i++) {
        var d = Math.round(Math.abs(i - pivote));
        propios[i] = orden === "bordes" ? (pasos[n - 1] - pasos[Math.min(d, n - 1)]) : pasos[Math.min(d, n - 1)];
      }
    } else {
      throw new Error(quien + ": orden desconocido '" + orden + "'. Validos: secuencia, centro, bordes, desde");
    }

    // Se resta el minimo para que el PRIMER elemento arranque en `cuadro`. Sin esto, 'bordes' devolvia
    // la cascada entera corrida hacia adelante —los bordes empezaban en 2*retardo— y el gesto llegaba
    // tarde sin que nada lo dijera: la forma de la ola era correcta y el momento no.
    var minPaso = propios[0];
    for (i = 1; i < n; i++) { if (propios[i] < minPaso) { minPaso = propios[i]; } }
    var arranques = [], total = 0;
    for (i = 0; i < n; i++) {
      arranques[i] = cuadro + propios[i] - minPaso;
      total = Math.max(total, arranques[i] - cuadro);
    }
    if (total > 2 * dur) {
      throw new Error(quien + ": la cascada se estira " + total + " cuadros y el gesto dura " + dur +
                      ". El presupuesto es 2x la duracion de un gesto (" + (2 * dur) + " cuadros): pasando " +
                      "eso el espectador deja de ver una ola y se pone a esperar el ultimo elemento. " +
                      "Salidas: `decreciente: true` (2,2,2,1,1,1), `orden: 'centro'` (que cuesta la mitad " +
                      "porque la ola sale para los dos lados), o agrupar.");
    }

    G.anotar("D04|n " + n + "|dur " + dur + "|retardo " + retardo + "|orden " + orden + "|total " + total);
    return {
      arranques: arranques,
      retardo: retardo,
      total: total,
      fin: cuadro + total + dur
    };
  };

  // ==============================================================================================
  // D05 · MICRO-MOVIMIENTO HORNEADO
  // ==============================================================================================
  //
  // QUE SE VE: nada. Y por eso funciona — LA QUIETUD PERFECTA ES UNA FIRMA DIGITAL. En el mundo fisico
  // no existe una cosa completamente quieta, asi que un elemento con cero movimiento entre gestos
  // delata que es software. Es el gesto mas invisible del catalogo y probablemente el que mas aporta a
  // la sensacion de "caro".
  //
  // LA ESPECIFICACION ES EXACTA Y NO SE IMPROVISA, porque su unica virtud es ser reproducible:
  //     v(t) = A * [ 0,6*sin(2*PI*t/T1 + fi) + 0,4*sin(2*PI*t/T2 + 1,7*fi) ]
  //     T1 = 43 cuadros · T2 = 67 cuadros · fi = (i*2,39 + p*0,87) rad
  // Dos senos de periodos INCONMENSURABLES: la suma no se repite nunca dentro de la pieza, que es lo
  // que distingue "vida" de "bucle". Y la fase sale del INDICE DE CAPA: sin desfase todas las capas
  // laten juntas y se lee como temblor de camara, no como vida (defecto #16 del catalogo).
  //
  // NADA DE Math.random: la unica entrada es `i`. La misma pieza construida dos veces da los mismos
  // pixeles, que es la regla que sostiene todo el canal de verificacion.
  //
  // LA CURVA, Y ACA HAY QUE SER HONESTO: el plan pide influencia 50/50 y **esa curva no existe en
  // G.CURVAS**. La mas cercana es SUAVE (33/33, el Easy Ease de AE). Se usa esa, y la prohibicion de
  // Easy Ease del catalogo no aplica aca por una razon medible: esa prohibicion existe porque una
  // curva pareja hace que todo PESE IGUAL, y el micro no comunica peso — comunica que la cosa esta
  // viva. Ademas, entre dos claves separadas 6 cuadros, una bezier simetrica y una recta valen lo
  // MISMO en el punto medio (las dos dan 0,5): lo unico que cambia es el perfil de velocidad, y a
  // 2 px de amplitud eso no llega a la pantalla. Quien prefiera lineal tiene `curva: "LINEAL"`.
  //
  // EL COSTO ES EL PRECIO CORRECTO, no un descuido: ~25 claves por propiedad y por capa en 5 s. Diez
  // capas por dos propiedades son 500 claves. La via barata —declararlo en el comentario de capa y que
  // el motor lo genere— esta DESCARTADA a proposito: el comentario se acepto para el resplandor porque
  // ahi la identidad de pixel es imposible por construccion, y el micro SI puede ser identico. Que AE
  // muestre una cosa y el motor otra rompe la unica regla que sostiene el proyecto.
  //
  // EL UMBRAL PARA SABER SI TE PASASTE: si podes VER que se mueve mirandolo fijo, es el doble de lo
  // que deberia ser. Si tapas la pantalla, la volves a mirar y "algo cambio", esta bien.
  var MICRO_T1 = 43;
  var MICRO_T2 = 67;
  var MICRO_PROPS = {
    posx:   { p: 0, amp: 2,   min: 1,    max: 3,   unidad: "px" },
    posy:   { p: 1, amp: 2,   min: 1,    max: 3,   unidad: "px" },
    posz:   { p: 2, amp: 10,  min: 5,    max: 15,  unidad: "unidades" },
    escala: { p: 3, amp: 0.7, min: 0.4,  max: 1.0, unidad: "%" },
    rotz:   { p: 4, amp: 0.25, min: 0.15, max: 0.4, unidad: "grados" }
  };

  function propDeMicro(capa, nombre, quien, don) {
    var d = MICRO_PROPS[nombre];
    if (!d) {
      throw new Error(quien + " en " + don + ": propiedad desconocida '" + nombre + "'. Validas: " +
                      "posx, posy, posz, escala, rotz");
    }
    var salida = { p: d.p, amp: d.amp, min: d.min, max: d.max, unidad: d.unidad, vector: false, nombre: nombre };
    if (nombre === "posx") { salida.prop = pista(capa, "x", quien); }
    else if (nombre === "posy") { salida.prop = pista(capa, "y", quien); }
    else if (nombre === "posz") { salida.prop = pista(capa, "z", quien); }
    else if (nombre === "rotz") { salida.prop = G.rotZ(capa); }
    else { salida.prop = G.esc(capa); salida.vector = true; }
    return salida;
  }

  api.microMovimiento = function (o) {
    o = o || {};
    var quien = "D05 microMovimiento";
    var capa = pedir(o, "capa", quien);
    var don = nombreDe(o, capa);
    var i = o.i === undefined ? capa.index : o.i;
    var desde = o.desde === undefined ? 0 : o.desde;
    var hasta = o.hasta === undefined ? G.cuadros() : o.hasta;
    var cada = o.cada === undefined ? 6 : o.cada;
    var curva = o.curva === undefined ? "SUAVE" : o.curva;
    var props = o.propiedades ? o.propiedades : ["posx", "posy"];
    var amps = o.amplitudes ? o.amplitudes : {};

    if (Math.abs(desde - Math.round(desde)) > 1e-9 || Math.abs(hasta - Math.round(hasta)) > 1e-9) {
      throw new Error(quien + " en " + don + ": `desde` y `hasta` van en cuadros enteros.");
    }
    if (hasta <= desde) { throw new Error(quien + " en " + don + ": `hasta` tiene que ser mayor que `desde`."); }
    if (cada < 1 || Math.abs(cada - Math.round(cada)) > 1e-9) {
      throw new Error(quien + " en " + don + ": `cada` va en cuadros enteros y al menos 1.");
    }
    if (cada > 8) {
      G.avisar(quien + " en " + don + ": una clave cada " + cada + " cuadros. Con el periodo mas corto en " +
               MICRO_T1 + " cuadros, mas de 8 empieza a dibujar el seno con esquinas y el micro deja de " +
               "leerse como deriva.");
    }
    if (i < 0) { throw new Error(quien + " en " + don + ": `i` es el indice de capa y va de 0 para arriba."); }

    // LEY DE FAMILIA 1: el micro es lo que hace que algo que ESTA AHI no parezca software. Sobre una
    // capa que todavia no entro no hay nada que desmentir.
    exigirViva(capa, desde, 0, quien, don);

    var salidas = [], total = 0, k;
    for (k = 0; k < props.length; k++) {
      var d = propDeMicro(capa, props[k], quien, don);
      var amp = amps[props[k]] === undefined ? d.amp : amps[props[k]];

      if (amp <= 0) { throw new Error(quien + " en " + don + ": la amplitud va en positivo."); }
      if (amp > d.max * 2) {
        throw new Error(quien + " en " + don + "/" + props[k] + ": amplitud " + amp + " " + d.unidad +
                        " y el rango es " + d.min + " a " + d.max + ". Estas al doble del techo, y el " +
                        "umbral del catalogo es justamente ese: si se VE que se mueve mirandolo fijo, es " +
                        "el doble de lo que deberia ser. Con esta amplitud ya no es micro-movimiento, es " +
                        "un gesto — y compite con el que si querias que se viera.");
      }
      if (amp < d.min || amp > d.max) {
        G.avisar(quien + " en " + don + "/" + props[k] + ": amplitud " + amp + " " + d.unidad +
                 " fuera del rango " + d.min + "-" + d.max + ".");
      }
      if (props[k] === "escala" || props[k] === "posz") {
        G.avisar(quien + " en " + don + ": micro en " + props[k] + ". La regla de convivencia reserva " +
                 "escala y Z para la DERIVA (C10) y deja X/Y/rotacion para el micro. Si esta capa " +
                 "ademas deriva en ese mismo eje, los dos se pelean y queda un temblor sin caracter.");
      }

      // LEY DE FAMILIA 2. Escribir el micro encima de un gesto no da error: da un gesto que desaparece.
      if (d.prop.numKeys > 0) {
        throw new Error(quien + " en " + don + "/" + props[k] + ": esa propiedad ya tiene " +
                        d.prop.numKeys + " claves. El micro las pisaria y el gesto que estaba ahi " +
                        "desaparece sin error. El segundo orden va en un nulo propio: " +
                        "var n = Gd.nuloPara(capa, 'micro-' + capa.name); y el micro sobre `n`.");
      }

      var fi = i * 2.39 + d.p * 0.87;
      var base = d.vector ? copia(d.prop.value) : d.prop.value;
      var lista = [], c, j;
      for (c = desde; c <= hasta; c += cada) {
        var v = amp * (0.6 * Math.sin(2 * Math.PI * c / MICRO_T1 + fi) +
                       0.4 * Math.sin(2 * Math.PI * c / MICRO_T2 + 1.7 * fi));
        if (d.vector) {
          var vv = [];
          for (j = 0; j < base.length; j++) { vv[j] = base[j] + v; }
          lista[lista.length] = [c, vv, curva];
        } else {
          lista[lista.length] = [c, base + v, curva];
        }
      }
      // La ultima clave tiene que caer EN `hasta`: si cae antes, el valor se congela en el tramo final
      // y el ultimo plano de la pieza —el que mas se mira— es justo el que queda quieto.
      if (lista[lista.length - 1][0] < hasta) {
        var vf = amp * (0.6 * Math.sin(2 * Math.PI * hasta / MICRO_T1 + fi) +
                        0.4 * Math.sin(2 * Math.PI * hasta / MICRO_T2 + 1.7 * fi));
        if (d.vector) {
          var vfv = [];
          for (j = 0; j < base.length; j++) { vfv[j] = base[j] + vf; }
          lista[lista.length] = [hasta, vfv, curva];
        } else {
          lista[lista.length] = [hasta, base + vf, curva];
        }
      }

      G.claves(d.prop, lista, don + "/micro-" + props[k]);
      total += lista.length;
      salidas[salidas.length] = { propiedad: props[k], prop: d.prop, claves: lista.length, amplitud: amp, fase: red(fi, 3) };
    }

    G.anotar("D05|" + don + "|i " + i + "|" + props.length + " propiedades|" + total + " claves|c" +
             desde + "-" + hasta);
    return { capa: capa, i: i, pistas: salidas, claves: total };
  };

  // ==============================================================================================
  // D06 · JERARQUIA DE ESCALAS
  // ==============================================================================================
  //
  // NO ES UN GESTO: ES UNA REGLA, y por eso esto no construye nada — REVISA. En un cuadro caro conviven
  // siempre tres escalas de movimiento: un gesto grande, dos o tres medianos, y micro en todo lo demas.
  // Una pieza donde todo se mueve igual de mucho se ve caotica; una donde todo se mueve igual de poco
  // se ve muerta. "Anime la camara y nada mas" es exactamente una jerarquia con UN SOLO NIVEL.
  //
  //   macro  200-1500 px (o entra/sale de cuadro) · 16-24 cuadros · UNO. nunca dos
  //   meso   20-80 px, escala +-10%              ·  8-14 cuadros · 2 a 4
  //   micro  1-8 px, escala +-1%                 ·  3-8 o continuo · todo lo demas
  //
  // EL FACTOR ENTRE NIVELES ES 3x A 8x. Si el micro esta a menos de 3x del meso los dos se confunden y
  // el cuadro se ensucia — no se lee "una cosa grande y varias chicas", se lee "muchas cosas medianas".
  //
  // Y EL COROLARIO QUE MAS SIRVE: si no podes nombrar cual es el gesto macro de un plano, el plano no
  // tiene tema. Por eso un plano sin macro TIRA.
  function claseDe(g, quien) {
    if (g.clase) { return g.clase; }
    if (g.recorrido === undefined) {
      throw new Error(quien + ": el gesto '" + (g.nombre ? g.nombre : "(sin nombre)") + "' no declara " +
                      "`clase` ni `recorrido`, y sin uno de los dos no hay jerarquia que revisar.");
    }
    if (g.recorrido >= 200) { return "macro"; }
    if (g.recorrido >= 20) { return "meso"; }
    return "micro";
  }

  api.jerarquiaDeEscalas = function (o) {
    o = o || {};
    var quien = "D06 jerarquiaDeEscalas";
    var g = pedir(o, "gestos", quien);
    var plano = o.plano ? o.plano : "(el plano)";
    if (g.length < 1) { throw new Error(quien + ": la lista de gestos esta vacia."); }

    var LIM = {
      macro: { rMin: 200, rMax: 1500, dMin: 16, dMax: 24, ala: 1 },
      meso:  { rMin: 20,  rMax: 80,   dMin: 8,  dMax: 14, ala: 4 },
      micro: { rMin: 0.5, rMax: 8,    dMin: 3,  dMax: 8,  ala: 99 }
    };

    var i, j, clases = [], macros = [], mayorMicro = 0, menorMeso = null;
    for (i = 0; i < g.length; i++) {
      var cl = claseDe(g[i], quien);
      var nb = g[i].nombre ? g[i].nombre : ("gesto " + (i + 1));
      var lim = LIM[cl];
      if (!lim) { throw new Error(quien + ": clase desconocida '" + cl + "' en '" + nb + "'. Validas: macro, meso, micro"); }
      clases[i] = cl;

      if (g[i].recorrido !== undefined) {
        if (cl === "micro" && g[i].recorrido > mayorMicro) { mayorMicro = g[i].recorrido; }
        if (cl === "meso" && (menorMeso === null || g[i].recorrido < menorMeso)) { menorMeso = g[i].recorrido; }
        if (g[i].recorrido > lim.rMax && !(cl === "macro" && g[i].entraOSale)) {
          G.avisar(quien + " en " + plano + ": '" + nb + "' recorre " + Math.round(g[i].recorrido) +
                   " px y el techo de un " + cl + " es " + lim.rMax + ".");
        }
        if (g[i].recorrido < lim.rMin) {
          G.avisar(quien + " en " + plano + ": '" + nb + "' recorre " + red(g[i].recorrido, 1) +
                   " px y el piso de un " + cl + " es " + lim.rMin + ". Cae en la tierra de nadie entre " +
                   "dos niveles, que es donde el cuadro se ensucia.");
        }
      }
      // EL MICRO PUEDE SER CONTINUO, y eso no es una excepcion sino la mitad de los casos: el
      // micro-movimiento (D05) corre de punta a punta de la pieza. La primera version acusaba a todos
      // los micros de durar de mas, que es la clase de falso positivo que ensena a ignorar la
      // compuerta. Ahora se declara con `continuo: true` y no se revisa la duracion.
      var continuo = g[i].continuo ? true : false;
      if (g[i].dur !== undefined && !continuo && (g[i].dur < lim.dMin || g[i].dur > lim.dMax)) {
        G.avisar(quien + " en " + plano + ": '" + nb + "' dura " + g[i].dur + " cuadros y un " + cl +
                 " va de " + lim.dMin + " a " + lim.dMax +
                 (cl === "micro" ? ". Si es un micro que corre toda la pieza, declaralo con `continuo: true`." : "."));
      }
      if (cl === "macro") { macros[macros.length] = { nombre: nb, a: g[i].cuadro, b: g[i].cuadro + (g[i].dur || 0) }; }
    }

    if (macros.length === 0) {
      throw new Error(quien + " en " + plano + ": no hay ningun gesto macro. Si no podes nombrar cual es " +
                      "el gesto grande del plano, el plano no tiene tema: el ojo no sabe adonde ir y la " +
                      "pieza se lee como una lista de cosas que se mueven. Declara uno, o achicá el plano.");
    }

    // DOS MACROS A LA VEZ es el defecto #4 con otro nombre: dos cosas grandes peleando el ojo.
    for (i = 0; i < macros.length; i++) {
      for (j = i + 1; j < macros.length; j++) {
        if (macros[i].a <= macros[j].b && macros[j].a <= macros[i].b) {
          throw new Error(quien + " en " + plano + ": '" + macros[i].nombre + "' (" + macros[i].a + "-" +
                          macros[i].b + ") y '" + macros[j].nombre + "' (" + macros[j].a + "-" + macros[j].b +
                          ") son los dos MACRO y se pisan. Nunca dos: el macro define de que trata el " +
                          "plano, y dos temas a la vez no son dos temas, son ninguno. Bajá uno a meso, o " +
                          "escalonalos (D03).");
        }
      }
    }

    // Cuantos mesos hay vivos al mismo tiempo. Se cuenta en los arranques, que es donde se acumulan.
    for (i = 0; i < g.length; i++) {
      if (clases[i] !== "meso" || g[i].cuadro === undefined) { continue; }
      var n = 0, quienes = [];
      for (j = 0; j < g.length; j++) {
        if (clases[j] !== "meso" || g[j].cuadro === undefined) { continue; }
        if (g[j].cuadro <= g[i].cuadro && g[i].cuadro <= g[j].cuadro + (g[j].dur || 0)) {
          n++;
          quienes[quienes.length] = g[j].nombre ? g[j].nombre : ("gesto " + (j + 1));
        }
      }
      if (n > LIM.meso.ala) {
        throw new Error(quien + " en " + plano + ": en el cuadro " + g[i].cuadro + " hay " + n +
                        " gestos meso vivos (" + quienes.join(", ") + ") y el techo es " + LIM.meso.ala +
                        ". Mas que eso deja de haber jerarquia: el ojo no elige y la escena se lee " +
                        "como ruido. Escalonalos (D04) o bajá los que no son protagonistas a micro.");
      }
    }

    if (menorMeso !== null && mayorMicro > 0 && menorMeso < mayorMicro * 3) {
      G.avisar(quien + " en " + plano + ": el micro mas grande recorre " + red(mayorMicro, 1) +
               " px y el meso mas chico " + red(menorMeso, 1) + " — factor " +
               red(menorMeso / mayorMicro, 2) + "x. El factor entre niveles va de 3x a 8x; por debajo de " +
               "3x los dos niveles se confunden y el cuadro se ensucia.");
    }

    G.anotar("D06|" + plano + "|" + g.length + " gestos|macro: " + macros[0].nombre);
    return { ok: true, clases: clases, macro: macros[0].nombre, macros: macros };
  };

  // ==============================================================================================
  // D07 · PESO
  // ==============================================================================================
  //
  // TABLA, NO INTUICION. Dos objetos de tamanos distintos que se mueven con la misma duracion y la
  // misma curva PESAN LO MISMO, y eso es lo que hace que una escena se vea de plastico. El error que
  // delata es aplicar Easy Ease a todo: todo pesa igual y todo pesa poco.
  //
  // Esto tampoco construye: devuelve los numeros para que las duraciones salgan de una tabla y no de
  // la mano, y REVISA los que le pasen. Pedirle una duracion de 20 cuadros a algo liviano tira, porque
  // ese es exactamente el defecto #8 ("movimientos todos de duracion parecida") visto de cerca.
  //
  // UNA HONESTIDAD SOBRE LA CURVA DEL LIVIANO: la tabla del catalogo pide 15/80 y **G.CURVAS no la
  // tiene**. Las ocho curvas del vocabulario estan cerradas a proposito (son las verificadas contra
  // AE), asi que se devuelve C1 (20/85), que es la mas cercana — cinco puntos de influencia de salida
  // de diferencia. No es la curva pedida y no se va a decir que si lo es.
  var TABLA_PESO = {
    liviano: { durMin: 6,  durMax: 9,  dur: 8,  curva: "C1", pedida: "15/80", sobMin: 8, sobMax: 12, anticipacion: 2, arrastre: 2 },
    medio:   { durMin: 10, durMax: 14, dur: 12, curva: "C1", pedida: "20/85", sobMin: 4, sobMax: 6,  anticipacion: 4, arrastre: 3 },
    pesado:  { durMin: 16, durMax: 24, dur: 20, curva: "C2", pedida: "10/92", sobMin: 0, sobMax: 2,  anticipacion: 6, arrastre: 4 }
  };
  var avisadaLaCurva = false;

  api.peso = function (o) {
    o = o || {};
    var quien = "D07 peso";
    var clase = o.clase;

    // Deducir la clase del area es un DEFECTO, no una medicion: el catalogo da la tabla por clase y no
    // da umbrales de area. Se dice cada vez, con esas palabras, para que nadie cite el numero deducido
    // como si viniera del catalogo.
    if (!clase) {
      var capa = pedir(o, "capa", quien);
      var don = nombreDe(o, capa);
      var r = null;
      try { r = capa.sourceRectAtTime(0, false); } catch (exPR) { r = null; }
      if (r === null || r.width <= 0) {
        throw new Error(quien + " en " + don + ": no pude medir la capa y no me pasaste `clase`. " +
                        "Declarala: liviano, medio o pesado.");
      }
      var e = G.esc(capa).value;
      var frac = (r.width * Math.abs(e[0]) / 100) * (r.height * Math.abs(e[1]) / 100) / (G.ancho() * G.alto());
      clase = frac < 0.04 ? "liviano" : (frac < 0.18 ? "medio" : "pesado");
      G.avisar(quien + " en " + don + ": deduje clase '" + clase + "' porque la capa cubre el " +
               red(frac * 100, 1) + "% del cuadro. ESTO ES UN DEFECTO, NO UNA MEDICION DEL CATALOGO: el " +
               "catalogo da la tabla por clase y no da umbrales de area, asi que los umbrales (4% y 18%) " +
               "los puse yo. Declara `clase` y esto desaparece.");
    }

    var t = TABLA_PESO[clase];
    if (!t) { throw new Error(quien + ": clase desconocida '" + clase + "'. Validas: liviano, medio, pesado"); }

    if (!avisadaLaCurva) {
      G.anotar("D07|la curva del liviano pide 15/80 y G.CURVAS no la tiene: se devuelve C1 (20/85)");
      avisadaLaCurva = true;
    }

    if (o.dur !== undefined && (o.dur < t.durMin || o.dur > t.durMax)) {
      throw new Error(quien + ": pediste " + o.dur + " cuadros para algo '" + clase + "', y la tabla dice " +
                      t.durMin + "-" + t.durMax + ". Esto es el defecto #8 visto de cerca: cuando todos " +
                      "los gestos duran parecido la pieza se siente lenta aunque ninguno dure mucho, " +
                      "porque no hay contraste. Si de verdad tiene que durar " + o.dur + ", entonces no " +
                      "es '" + clase + "': cambiale la clase y que las otras perillas se muevan con ella.");
    }
    if (o.sobrepaso !== undefined && (o.sobrepaso < t.sobMin || o.sobrepaso > t.sobMax)) {
      throw new Error(quien + ": pediste " + o.sobrepaso + "% de sobrepaso para algo '" + clase +
                      "', y la tabla dice " + t.sobMin + "-" + t.sobMax + "%. A mayor masa, menos " +
                      "sobrepaso: un panel de pantalla completa que rebota parece de carton.");
    }

    return {
      clase: clase,
      dur: o.dur === undefined ? t.dur : o.dur,
      durMin: t.durMin,
      durMax: t.durMax,
      curva: t.curva,
      curvaPedida: t.pedida,
      sobrepaso: t.sobMax,
      sobrepasoMin: t.sobMin,
      anticipacion: t.anticipacion,
      arrastre: t.arrastre
    };
  };

  // ==============================================================================================
  // D08 · ANCLAJES
  // ==============================================================================================
  //
  // EL ERROR DE UN VALOR QUE CAMBIA TODO. El ancla al centro por defecto significa que todo escala y
  // rota desde el medio: nada tiene contacto ni apoyo. Un panel que sube crece DESDE ABAJO, una barra
  // crece desde su origen, algo que aterriza se aplasta desde su base.
  //
  // Y LA TRAMPA QUE VIENE CON ESTO ES SILENCIOSA: MOVER EL ANCLA MUEVE LA CAPA. La posicion dice donde
  // cae el ANCLA, asi que pasarla de centro a borde teletransporta la capa medio alto sin que nada
  // avise. Aca se compensa, y se compensa TAMBIEN si la posicion ya estaba animada — sumandole el
  // corrimiento a todas las claves, que es exacto para una traslacion. Compensar un solo instante y
  // dejar los demas desalineados seria peor que no compensar: el defecto aparece a mitad del gesto.
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

  var BORDES = {
    centro: [0.5, 0.5],
    arriba: [0.5, 0],
    abajo: [0.5, 1],
    izquierda: [0, 0.5],
    derecha: [1, 0.5]
  };
  BORDES["arriba-izquierda"] = [0, 0];
  BORDES["arriba-derecha"] = [1, 0];
  BORDES["abajo-izquierda"] = [0, 1];
  BORDES["abajo-derecha"] = [1, 1];

  api.anclarEnElBordeQueToca = function (o) {
    o = o || {};
    var quien = "D08 anclarEnElBordeQueToca";
    var capa = pedir(o, "capa", quien);
    var borde = pedir(o, "borde", quien);
    var don = nombreDe(o, capa);
    var cuadro = o.cuadro === undefined ? 0 : o.cuadro;

    var f = BORDES[borde];
    if (!f) {
      throw new Error(quien + " en " + don + ": borde desconocido '" + borde + "'. Validos: centro, " +
                      "arriba, abajo, izquierda, derecha, arriba-izquierda, arriba-derecha, " +
                      "abajo-izquierda, abajo-derecha");
    }
    if (!giroCero(capa)) {
      throw new Error(quien + " en " + don + ": la capa ya esta girada, y la compensacion de posicion " +
                      "asume ejes alineados: con la capa girada te la corre. Movele el ancla ANTES de girarla.");
    }
    var padre = null;
    try { padre = capa.parent; } catch (exPd) { padre = null; }
    if (padre !== null && padre !== undefined && (!giroCero(padre) || !escalaUno(padre))) {
      throw new Error(quien + " en " + don + ": el padre ('" + padre.name + "') esta girado o escalado, " +
                      "asi que el corrimiento del ancla no se traduce a la posicion local con una suma. " +
                      "Poné el ancla ANTES de colgar la capa.");
    }
    var an = G.anc(capa);
    if (an.numKeys > 0) {
      throw new Error(quien + " en " + don + ": el ancla ya tiene " + an.numKeys + " claves y esto las pisaria.");
    }

    var r = null;
    try { r = capa.sourceRectAtTime(cuadro / G.fps(), false); } catch (exSR2) { r = null; }
    if (r === null || r.width <= 0 || r.height <= 0) {
      throw new Error(quien + " en " + don + ": no pude medir la caja con sourceRectAtTime, asi que no se " +
                      "donde estan los bordes. Si es una forma, acordate de la LEY 7: se rasteriza a t=0.");
    }

    var ax = r.left + r.width * f[0];
    var ay = r.top + r.height * f[1];
    var v = an.value;
    var esc = G.esc(capa).value;
    var dx = (ax - v[0]) * esc[0] / 100;
    var dy = (ay - v[1]) * esc[1] / 100;
    var nv = [ax, ay];
    if (v.length > 2) { nv[2] = v[2]; }
    an.setValue(nv);

    var movidas = 0;
    if (separada(capa)) {
      var e = G.ejes(capa);
      movidas = correrEje(e.x, dx) + correrEje(e.y, dy);
    } else {
      movidas = correrPosVector(G.pos(capa), dx, dy);
    }
    if (movidas > 0) {
      G.avisar(quien + " en " + don + ": la posicion ya tenia " + movidas + " claves y se les sumo el " +
               "corrimiento del ancla (" + Math.round(dx) + ", " + Math.round(dy) + "). Es exacto para " +
               "una traslacion; si esas claves venian de un rebote, el reposo se movio con ellas.");
    }

    G.anotar("D08|" + don + "|" + borde + "|ancla " + Math.round(ax) + "," + Math.round(ay) +
             "|compenso " + Math.round(dx) + "," + Math.round(dy));
    return { capa: capa, ancla: [ax, ay], corrimiento: [dx, dy], claves: movidas };
  };

  // ==============================================================================================
  // D09 · ESTELA POR DUPLICADOS
  // ==============================================================================================
  //
  // Copias del elemento retrasadas en el tiempo y con opacidad decreciente. Da velocidad y cuerpo a un
  // movimiento sin ser desenfoque — y sin el efecto Echo, que no viaja por el exportador. No es una
  // version pobre de Echo: es la unica que existe en esta cadena, y sale de duplicar, correr claves y
  // apilar, que es todo lo que el motor sabe hacer.
  //
  // LA REGLA QUE SEPARA UNA ESTELA DE UN ERROR DE RENDER: LA ESTELA DEBE MORIR ANTES DE QUE EL OBJETO
  // FRENE. Si el objeto ya se detuvo y todavia hay copias moviendose detras, no se lee como velocidad:
  // se lee como que el render se rompio. Por eso la opacidad de cada copia llega a CERO en el cuadro
  // en que el original da su ultima clave, y si el gesto es tan corto que no da tiempo, esto tira.
  //
  // POR QUE NO SE DUPLICA UNA CAPA QUE SE MUEVE POR SU PADRE: `duplicate()` copia la capa, no su nulo.
  // Las copias seguirian colgando del MISMO nulo, se moverian las cuatro exactamente igual y la estela
  // no se desfasaria — cuatro capas apiladas sin ningun efecto y sin ningun error. Se comprueba.
  //
  // COSTO: x4 capas. En 3D las copias van a la misma Z (salen asi por construccion) y CONTIGUAS en el
  // apilado, por la LEY 1: el motor ordena por apilado y no por profundidad, asi que meter cualquier
  // otra cosa entre el original y sus copias las manda adelante o atras segun quien dibuje despues.
  api.estelaPorDuplicados = function (o) {
    o = o || {};
    var quien = "D09 estelaPorDuplicados";
    var capa = pedir(o, "capa", quien);
    var don = nombreDe(o, capa);
    var copias = o.copias === undefined ? 3 : o.copias;
    var retardo = o.retardo === undefined ? 2 : o.retardo;
    var apagado = o.apagado === undefined ? 3 : o.apagado;
    var niveles = o.niveles ? o.niveles : [45, 28, 16, 8];

    if (copias < 2 || copias > 5) {
      throw new Error(quien + " en " + don + ": " + copias + " copias. El rango es 3 a 5 (2 es el minimo " +
                      "para que se lea como estela y no como una capa doble). Con mas de 5 la estela pesa " +
                      "mas que el objeto y ademas son " + (copias + 1) + " capas por un solo elemento.");
    }
    if (retardo < 2 || retardo > 4 || Math.abs(retardo - Math.round(retardo)) > 1e-9) {
      throw new Error(quien + " en " + don + ": retardo " + retardo + ". Va en cuadros enteros, 2 para " +
                      "estela compacta y 3-4 para estela larga. Con 1 las copias se superponen y no se " +
                      "distinguen; con mas de 4 se leen como objetos separados que van atras.");
    }

    var g = gestoDe(capa);
    if (g === null) {
      var tienePadre = false;
      try { tienePadre = (capa.parent !== null && capa.parent !== undefined); } catch (exEP) { tienePadre = false; }
      if (tienePadre) {
        throw new Error(quien + " en " + don + ": la capa no tiene ninguna clave propia — se mueve porque " +
                        "la lleva su padre ('" + capa.parent.name + "'). `duplicate()` copia la capa pero " +
                        "NO el nulo: las copias colgarian del mismo padre, se moverian las " + copias +
                        " exactamente igual y la estela no se desfasaria. No daria error: daria " + copias +
                        " capas apiladas sin ningun efecto. Pasa la capa que LLEVA las claves, o bajale " +
                        "el gesto del nulo a la capa.");
      }
      throw new Error(quien + " en " + don + ": la capa no tiene claves de transformacion, asi que no hay " +
                      "movimiento del que hacer estela.");
    }
    var inicio = g.inicio, fin = g.fin;
    var ultimaCopia = inicio + copias * retardo;
    if (fin - apagado <= ultimaCopia + 1) {
      throw new Error(quien + " en " + don + ": el gesto va del cuadro " + inicio + " al " + fin + " (" +
                      (fin - inicio) + " cuadros) y la ultima copia recien arranca en el " + ultimaCopia +
                      ". No queda lugar para que la estela MUERA ANTES DE QUE EL OBJETO FRENE, que es la " +
                      "regla de esta ficha: copias moviendose despues de que el objeto se detuvo se leen " +
                      "como un error de render, no como velocidad. Hacen falta al menos " +
                      (copias * retardo + apagado + 2) + " cuadros de gesto, o bajá las copias a " +
                      Math.max(2, Math.floor((fin - inicio - apagado - 2) / retardo)) + ".");
    }

    var hechas = [], anterior = capa, i, k;
    for (i = 1; i <= copias; i++) {
      var dup = capa.duplicate();
      dup.name = capa.name + "-estela" + i;
      // `duplicate()` la deja ARRIBA del original. La estela va DEBAJO y contigua (LEY 1).
      dup.moveAfter(anterior);
      anterior = dup;

      // Todas las claves de transformacion, corridas. La opacidad tambien viene copiada y se borra
      // enseguida: la estela tiene su propia escalera y su propia muerte.
      var props = propsDeTransformacion(dup);
      for (k = 0; k < props.length; k++) {
        if (props[k] === undefined) { continue; }
        var nk = 0;
        try { nk = props[k].numKeys; } catch (exNK2) { nk = 0; }
        if (nk === 0) { continue; }
        try { correrClaves(props[k], i * retardo, don + "-estela" + i); } catch (exCK) {
          throw new Error(quien + " en " + don + ": no pude correr las claves de la copia " + i + ": " +
                          exCK.message);
        }
      }

      var op = G.op(dup);
      borrarClaves(op);
      var nivel = i <= niveles.length ? niveles[i - 1] : Math.round(niveles[niveles.length - 1] * 0.58);
      var lista = [];
      if (inicio > 0) { lista[lista.length] = [inicio - 1, 0, "HOLD"]; }
      lista[lista.length] = [inicio, nivel];
      lista[lista.length] = [fin - apagado, nivel];
      lista[lista.length] = [fin, 0, "HOLD"];
      G.claves(op, lista, don + "-estela" + i + "/opacidad");

      // LEY 7: la visibilidad de una copia se resuelve con opacidad, no con el tiempo de entrada. Una
      // forma con inPoint > 0 puede rasterizar vacia y no da error.
      dup.inPoint = capa.inPoint;
      dup.outPoint = capa.outPoint;
      hechas[hechas.length] = dup;
    }

    if (capa.threeDLayer) {
      G.avisar(quien + " en " + don + ": " + copias + " copias 3D a la MISMA Z que el original, " +
               "contiguas en el apilado. Si mas adelante metes una capa entre ellas, la LEY 1 hace que " +
               "el motor la dibuje adelante o atras de la estela segun el apilado y no segun la Z, y AE " +
               "va a mostrar otra cosa.");
    }
    G.anotar("D09|" + don + "|" + copias + " copias|retardo " + retardo + "|c" + inicio + "-" + fin);
    return { capa: capa, copias: hechas, inicio: inicio, fin: fin, retardo: retardo };
  };

  // ==============================================================================================
  // D10 · BARRIDO DE BRILLO
  // ==============================================================================================
  //
  // Una banda de luz que cruza el objeto en diagonal, rapido, UNA SOLA VEZ. Es un cliche, y es un
  // cliche porque funciona: le da material a una superficie plana. En bucle es la firma mas rapida de
  // plantilla barata que existe, asi que un segundo barrido sobre la misma capa TIRA.
  //
  // SIN MASCARAS NI DEGRADADOS, QUE ES LO QUE EL MOTOR NO TIENE: un solido angosto y rotado que cruza,
  // y TAPAS del color del fondo que lo recortan a la caja del objeto. El apilado ES el efecto.
  //
  // LA LEY DE LAS TAPAS, la misma de la familia F: una tapa oculta TODO lo que este debajo en el
  // apilado, no solo su objetivo. Por eso el objetivo va al fondo del apilado local, las tapas encima,
  // y el resto de la pieza por encima de las tapas. Y por eso esto exige `colorFondo`: si no podes
  // nombrar el color del fondo es que el fondo no es plano, y la tecnica NO SE PUEDE HACER HOY.
  //
  // LAS TAPAS SE DIMENSIONAN, NO SE ESTIRAN "PARA QUE SOBRE". Cubrir 2x la caja seria lo comodo y
  // borraria a los vecinos del objeto sin decir nada. Aca se calcula el sobrante REAL de la banda
  // rotada (su caja alineada mide |w*cos|+|h*sin| por |h*cos|+|w*sin|) y se avisa exactamente que
  // anillo alrededor del objeto queda tapado, para que se pueda comprobar que ahi no vive nada.
  //
  // LA CURVA VA LINEAL. El catalogo dice C5, y C5 es influencia 0/0, o sea LINEAL — no existe con ese
  // nombre en G.CURVAS. Un barrido con ease se lee como un objeto que pasa, no como luz.
  var barridas = {};

  api.barridoDeBrillo = function (o) {
    o = o || {};
    var quien = "D10 barridoDeBrillo";
    var objetivo = pedir(o, "capa", quien);
    var colorFondo = pedir(o, "colorFondo", quien);
    var cuadro = pedir(o, "cuadro", quien);
    var don = nombreDe(o, objetivo);
    var dur = o.dur === undefined ? 8 : o.dur;
    var ancho = o.ancho === undefined ? 90 : o.ancho;
    var angulo = o.angulo === undefined ? 20 : o.angulo;
    var color = o.color ? o.color : [1, 1, 1];
    var opacidad = o.opacidad === undefined ? 18 : o.opacidad;

    if (barridas[don]) {
      throw new Error(quien + " en " + don + ": ya hay un barrido en esa capa (cuadro " + barridas[don] +
                      "). UNA SOLA VEZ POR APARICION: un brillo que se repite es la firma mas rapida de " +
                      "plantilla barata que hay, y el espectador lo nota aunque no sepa por que. Si el " +
                      "objeto vuelve a entrar mas adelante, es otra capa y otra aparicion.");
    }
    if (dur < 4 || dur > 14) {
      throw new Error(quien + " en " + don + ": " + dur + " cuadros de cruce. El rango es 6-10: por debajo " +
                      "de 4 no se llega a ver que cruzo y por encima de 14 deja de leerse como luz y se " +
                      "lee como una barra que pasa.");
    }
    if (angulo < 10 || angulo > 35) {
      throw new Error(quien + " en " + don + ": " + angulo + " grados. El rango es 15-25. En 0 se lee como " +
                      "una persiana y pasando 35 la banda tiene que ser tan alta que las tapas se comen " +
                      "medio cuadro.");
    }
    if (ancho < 40 || ancho > 200) {
      G.avisar(quien + " en " + don + ": banda de " + ancho + " px y el rango es 60-120.");
    }
    if (opacidad < 8 || opacidad > 40) {
      G.avisar(quien + " en " + don + ": opacidad " + opacidad + ". El rango sutil es 12-25; al 100 no es " +
               "un brillo, es un solido blanco cruzando.");
    }
    if (!giroCero(objetivo)) {
      throw new Error(quien + " en " + don + ": el objetivo esta girado. La banda y las tapas viven en SU " +
                      "sistema de coordenadas, asi que con el objetivo girado el recorte no coincide con " +
                      "la caja. Barré antes de girarlo, o metelo en un nulo girado y barré la capa derecha.");
    }
    exigirViva(objetivo, cuadro, 2, quien, don);

    var caja = cajaDe(o, objetivo, cuadro, quien);
    var pos = leerPos(objetivo);
    var lcx = caja.cx - pos[0];
    var lcy = caja.cy - pos[1];
    var tresD = objetivo.threeDLayer ? true : false;

    var a = angulo * Math.PI / 180;
    var altoBanda = Math.ceil(caja.alto / Math.cos(a) + ancho * Math.abs(Math.tan(a)) + 8);
    var wb = Math.abs(ancho * Math.cos(a)) + Math.abs(altoBanda * Math.sin(a));
    var hb = Math.abs(altoBanda * Math.cos(a)) + Math.abs(ancho * Math.sin(a));

    var ovV = Math.ceil(Math.max(0, (hb - caja.alto) / 2) + 4);
    var ovH = Math.ceil(wb / 2 + 4);

    // La banda arranca y termina FUERA de la caja: si empieza adentro se ve aparecer, y eso delata la
    // tapa. Los dos extremos quedan debajo de las tapas laterales.
    var x0 = lcx - caja.ancho / 2 - wb / 2;
    var x1 = lcx + caja.ancho / 2 + wb / 2;

    var banda = tresD ? G.solido("brillo-" + don, color, ancho, altoBanda, 0, 0, 0)
                      : G.solido("brillo-" + don, color, ancho, altoBanda, 0, 0);
    G.colgar(banda, objetivo, tresD ? [x0, lcy, -1] : [x0, lcy]);
    // LA ROTACION VA DESPUES DE COLGAR, y esto no es estilo: G.colgar pone orientacion y las tres
    // rotaciones en CERO a proposito (AE las reescribe al emparentar). Girar antes es girar para nada.
    G.rotZ(banda).setValue(angulo);
    G.op(banda).setValue(opacidad);
    G.plano(banda, 0, G.cuadros());

    var px = pista(banda, "x", quien);
    G.claves(px, [[cuadro, x0, "LINEAL"], [cuadro + dur, x1]], don + "/brillo");

    // Cuatro tapas. Dos alcanzan solo si la banda nunca se asoma por los costados, y se asoma siempre:
    // arranca y termina fuera de la caja justamente para no verse aparecer.
    var anchoTapaH = Math.ceil(caja.ancho + 2 * ovH + 8);
    var altoTapaV = Math.ceil(caja.alto + 2 * ovV + 8);
    var defs = [
      ["arriba", lcx, lcy - caja.alto / 2 - ovV / 2, anchoTapaH, ovV],
      ["abajo", lcx, lcy + caja.alto / 2 + ovV / 2, anchoTapaH, ovV],
      ["izquierda", lcx - caja.ancho / 2 - ovH / 2, lcy, ovH, altoTapaV],
      ["derecha", lcx + caja.ancho / 2 + ovH / 2, lcy, ovH, altoTapaV]
    ];
    var tapas = [], t, arriba = banda;
    for (t = 0; t < defs.length; t++) {
      var d = defs[t];
      var tp = tresD ? G.solido("brillo-tapa-" + d[0] + "-" + don, colorFondo, Math.ceil(d[3]), Math.ceil(d[4]), 0, 0, 0)
                     : G.solido("brillo-tapa-" + d[0] + "-" + don, colorFondo, Math.ceil(d[3]), Math.ceil(d[4]), 0, 0);
      G.colgar(tp, objetivo, tresD ? [d[1], d[2], -2] : [d[1], d[2]]);
      G.plano(tp, 0, G.cuadros());
      tp.moveBefore(arriba);
      arriba = tp;
      tapas[tapas.length] = tp;
    }
    banda.moveBefore(objetivo);
    for (t = 0; t < tapas.length; t++) { tapas[t].moveBefore(banda); }

    barridas[don] = cuadro;
    G.avisar(quien + " en " + don + ": las tapas cubren un anillo de " + ovV + " px arriba y abajo y " +
             ovH + " px a los costados de la caja (" + Math.round(caja.ancho) + "x" + Math.round(caja.alto) +
             "). Comproba que ahi no viva nada: una tapa oculta TODO lo que este debajo en el apilado, " +
             "no solo la banda.");
    G.anotar("D10|" + don + "|c" + cuadro + "-" + (cuadro + dur) + "|banda " + ancho + "x" + altoBanda +
             "|" + angulo + " grados|op " + opacidad);
    return { banda: banda, tapas: tapas, cuadro: cuadro, fin: cuadro + dur, caja: caja };
  };

  // ==============================================================================================
  // D11 · SOMBRA DESFASADA
  // ==============================================================================================
  //
  // Un duplicado oscuro debajo del elemento que NO se mueve solidariamente con el: se retrasa 1-2
  // cuadros y su recorrido es un 10-20% mayor. Da separacion de plano y peso sin ningun efecto. Con 3
  // cuadros o mas ya no se lee como sombra: se lee como una segunda capa despegada.
  //
  // LA LIMITACION QUE HAY QUE DECIR ANTES DE CONSTRUIR NADA: **NO SE PUEDE TENIR UN DUPLICADO.** El
  // motor no tiene efectos, y en AE los solidos comparten el item de metraje, asi que cambiarle el
  // color a la copia se lo cambia tambien al original. O sea que la sombra no puede salir de duplicar
  // una imagen. Quedan dos caminos honestos y esta funcion no acepta otro:
  //
  //   · si el objeto es un SOLIDO (rectangular), la sombra es otro solido de su tamano. Exacto.
  //   · si es una imagen o un texto, la pieza tiene que traer un PNG de SILUETA.
  //
  // QUE TIENE QUE TENER ESE PNG, y esto es una especificacion, no una sugerencia:
  //   · la silueta del objeto YA PINTADA del color de la tinta del fondo (la opacidad la pone la capa)
  //   · exactamente las MISMAS dimensiones en pixeles que el original, sin recortar los margenes
  //     transparentes: el registro tiene que coincidir pixel a pixel, porque la sombra usa el mismo
  //     ancla y la misma escala que el objeto
  //   · sin desenfoque horneado si lo que se quiere es la estetica grafica; CON desenfoque horneado si
  //     se quiere sombra fotografica, que es la unica forma de tenerla hoy
  //
  // Y LA HONESTIDAD QUE VA EN CADA CORRIDA: sin desenfoque por capa el borde es DURO. Eso es una *long
  // shadow* grafica, que es una estetica valida y NO es una sombra fotografica. Se avisa siempre,
  // porque el dia que alguien mire el render y diga "la sombra esta mal" la respuesta ya tiene que
  // estar escrita.
  function escalarClaves(lista, base, factor) {
    var i, j, v0 = lista[0].v;
    for (i = 0; i < lista.length; i++) {
      if (esVector(lista[i].v)) {
        var vv = [];
        for (j = 0; j < lista[i].v.length; j++) {
          vv[j] = (esVector(base) ? base[j] : base) + factor * (lista[i].v[j] - v0[j]);
        }
        lista[i].v = vv;
      } else {
        lista[i].v = base + factor * (lista[i].v - v0);
      }
    }
    return lista;
  }

  api.sombraDesfasada = function (o) {
    o = o || {};
    var quien = "D11 sombraDesfasada";
    var capa = pedir(o, "capa", quien);
    var colorTinta = pedir(o, "colorTinta", quien);
    var don = nombreDe(o, capa);
    var opacidad = o.opacidad === undefined ? 22 : o.opacidad;
    var dx = o.dx === undefined ? 9 : o.dx;
    var dy = o.dy === undefined ? 9 : o.dy;
    var retardo = o.retardo === undefined ? 2 : o.retardo;
    var amplif = o.amplificacion === undefined ? 1.15 : o.amplificacion;

    if (retardo < 1 || Math.abs(retardo - Math.round(retardo)) > 1e-9) {
      throw new Error(quien + " en " + don + ": el retardo va en cuadros enteros y al menos 1.");
    }
    if (retardo > 2) {
      throw new Error(quien + " en " + don + ": " + retardo + " cuadros de retardo. El rango es 1-2: con " +
                      "3 o mas la sombra deja de leerse como sombra y se lee como una segunda capa " +
                      "despegada que viaja atras. Si lo que queres es eso, es una estela (D09).");
    }
    if (amplif < 1.05 || amplif > 1.35) {
      throw new Error(quien + " en " + don + ": amplificacion " + amplif + ". El rango es 1,10-1,20 — la " +
                      "sombra recorre un poco mas que el objeto, no el doble. Con 1 no hay desfase de " +
                      "recorrido y la sombra se pega al objeto como un calco.");
    }
    if (opacidad < 10 || opacidad > 40) {
      G.avisar(quien + " en " + don + ": opacidad " + opacidad + " y el rango es 15-30. Mas oscura que eso " +
               "compite con el objeto; mas clara no separa el plano.");
    }
    var desp = Math.sqrt(dx * dx + dy * dy);
    if (desp < 4 || desp > 20) {
      G.avisar(quien + " en " + don + ": la sombra se corre " + red(desp, 1) + " px y el rango es 6-14.");
    }

    var tresD = capa.threeDLayer ? true : false;
    var pos = leerPos(capa);
    var anc = G.anc(capa).value;
    var esc = G.esc(capa).value;
    var sombra;

    if (o.silueta) {
      // El PNG ya viene del color de la tinta: la capa solo le pone la opacidad y el desfase.
      sombra = tresD
        ? G.img(o.silueta, "sombra-" + don, pos[0] + dx, pos[1] + dy, (pos.length > 2 ? pos[2] : 0) + 1, esc[0])
        : G.img2d(o.silueta, "sombra-" + don, pos[0] + dx, pos[1] + dy, esc[0]);
      G.anc(sombra).setValue(anc.length > 2 ? [anc[0], anc[1], anc[2]] : [anc[0], anc[1]]);
      G.esc(sombra).setValue(copia(esc));
    } else {
      var esSolido = false;
      try { esSolido = (capa.source !== null && capa.source.mainSource instanceof SolidSource); } catch (exSo) { esSolido = false; }
      if (!esSolido) {
        throw new Error(quien + " en " + don + ": esta capa no es un solido, asi que su sombra no puede " +
                        "ser un rectangulo — un rectangulo debajo de un logo redondo o de una linea de " +
                        "texto no se lee como sombra, se lee como una caja mal puesta. Y tenir el " +
                        "duplicado NO SE PUEDE: el motor no tiene efectos, y los solidos de AE comparten " +
                        "el item de metraje (cambiarle el color a la copia se lo cambia al original). " +
                        "Pasale `silueta` con el nombre de un PNG: la silueta del objeto ya pintada del " +
                        "color de la tinta, con las MISMAS dimensiones en pixeles que el original y sin " +
                        "recortarle los margenes transparentes. Alternativa sin PNG: C14 sombra de contacto.");
      }
      sombra = tresD
        ? G.solido("sombra-" + don, colorTinta, capa.width, capa.height, pos[0] + dx, pos[1] + dy, (pos.length > 2 ? pos[2] : 0) + 1)
        : G.solido("sombra-" + don, colorTinta, capa.width, capa.height, pos[0] + dx, pos[1] + dy);
      G.anc(sombra).setValue(anc.length > 2 ? [anc[0], anc[1], anc[2]] : [anc[0], anc[1]]);
      G.esc(sombra).setValue(copia(esc));
    }

    G.op(sombra).setValue(opacidad);
    sombra.threeDLayer = tresD;
    var padre = null;
    try { padre = capa.parent; } catch (exSP) { padre = null; }
    if (padre !== null && padre !== undefined) { sombra.parent = padre; }
    // Debajo del objeto y contigua. En 3D ademas 1 unidad MAS LEJOS de la camara: los dos criterios de
    // la LEY 1 apuntan al mismo lado, asi que AE y el motor coinciden por partida doble.
    sombra.moveAfter(capa);
    G.plano(sombra, Math.round(capa.inPoint * G.fps()), Math.round(capa.outPoint * G.fps()));

    // Las claves, copiadas con su curva y corridas. La curva NO se toca: el desfase esta en el tiempo.
    if (separada(capa)) { G.ejes(sombra); }
    var props = propsDeTransformacion(capa), i, copiadas = 0, tocoEscala = false;
    var dt = retardo / G.fps();
    for (i = 0; i < props.length; i++) {
      var nk = 0;
      try { nk = props[i].numKeys; } catch (exNK3) { nk = 0; }
      if (nk < 2) { continue; }
      var mn = props[i].matchName;
      var destino = null;
      try { destino = G.tr(sombra).property(mn); } catch (exMN) { destino = null; }
      if (destino === null) { continue; }
      // LA OPACIDAD SE COPIA, NO SE AMPLIFICA NI SE RETRASA. Por la LEY 7 media pieza resuelve la
      // visibilidad con claves de opacidad y no con el inPoint, asi que un objeto que todavia no
      // aparecio tiene su capa VIVA en opacidad cero. Con la opacidad de la sombra fija en 22, esa
      // sombra se ve sola sobre el fondo antes de que exista el objeto — y no da error, se ve en el
      // video. Se copian las claves escaladas al nivel de la sombra, y sin retardo: una sombra que
      // aparece dos cuadros despues que su objeto se lee como un parpadeo, no como peso.
      if (mn === "ADBE Opacity") {
        var lo = leerClaves(props[i]), q;
        for (q = 0; q < lo.length; q++) { lo[q].v = lo[q].v * opacidad / 100; }
        escribirClaves(destino, lo, opacidad / 100, don + "/sombra-opacidad");
        copiadas += lo.length;
        continue;
      }
      if (mn === "ADBE Scale") { tocoEscala = true; }
      var lista = escalarClaves(leerClaves(props[i]), destino.value, amplif);
      var j;
      for (j = 0; j < lista.length; j++) { lista[j].t = lista[j].t + dt; }
      escribirClaves(destino, lista, amplif, don + "/sombra" + mn);
      copiadas += lista.length;
    }
    if (copiadas === 0) {
      G.avisar(quien + " en " + don + ": la capa no tiene claves propias, asi que la sombra queda quieta " +
               "debajo. Si el objeto se mueve por su padre, la sombra tambien se mueve con el — pero SIN " +
               "el retardo, que es lo unico que hacia que se leyera como sombra y no como calco.");
    }

    // "Cuando el elemento aterriza, la sombra se encoge un 8-12% en los 2 cuadros del contacto y
    // vuelve." Eso es lo que dice TOCO. Sin esto el aterrizaje se ve, pero no se siente.
    if (o.contacto !== undefined) {
      if (tocoEscala) {
        throw new Error(quien + " en " + don + ": pediste `contacto` pero la escala de la sombra ya tiene " +
                        "las claves copiadas del objeto, y el encogimiento las pisaria. Sacale la " +
                        "animacion de escala al objeto, o hace el contacto a mano sobre `sombra`.");
      }
      var pe = G.esc(sombra);
      var b = copia(pe.value), q;
      var chico = [];
      for (q = 0; q < b.length; q++) { chico[q] = b[q] * 0.90; }
      G.claves(pe, [[o.contacto, copia(b), "C7"],
                    [o.contacto + 2, chico, "C8"],
                    [o.contacto + 6, copia(b)]], don + "/sombra-contacto");
    }

    G.avisar(quien + " en " + don + ": esta sombra tiene BORDE DURO. Sin desenfoque por capa es una " +
             "*long shadow* grafica, no una sombra fotografica: es una estetica valida y no es lo mismo. " +
             "La unica forma de tenerla difusa hoy es hornear el desenfoque en el PNG de `silueta`.");
    G.anotar("D11|" + don + "|retardo " + retardo + "|" + Math.round(dx) + "," + Math.round(dy) +
             " px|amplif " + amplif + "|claves " + copiadas);
    return { sombra: sombra, capa: capa, claves: copiadas, retardo: retardo };
  };

  // ==============================================================================================
  // D12 · EL OBTURADOR COMO DECISION
  // ==============================================================================================
  //
  // No es un interruptor "desenfoque si/no": es CUANTO TIEMPO ESTUVO ABIERTO EL OBTURADOR, y comunica
  // cosas distintas. 0-45 seco y digital · 90 crujiente · 180 natural (el de cine, y el default
  // correcto) · 270 onirico · 360 estela pura.
  //
  // Y LA FASE ES LA PERILLA QUE NADIE TOCA Y ES LA QUE SE VE CARA: `fase = -angulo/2`. Con fase 0 —el
  // default de AE— el borron sale HACIA ADELANTE del objeto, y a alta velocidad se lee como que la
  // cosa va antes que ella misma. Casi nadie lo nota conscientemente; todos lo notan. Por eso aca la
  // fase se CALCULA y poner otra exige un motivo escrito aparte.
  //
  // TRES COSAS QUE ESTA FUNCION HACE ADEMAS DE PONER TRES NUMEROS, y son la razon de que exista:
  //
  //   1. EXIGE UN MOTIVO ESCRITO, igual que el nucleo. El 100% de las capas de los cuatro proyectos
  //      medidos tienen el obturador apagado: encenderlo es una decision que hay que poder defender.
  //   2. DICE LO QUE CUESTA (LEY 5). El arnes hace UNA CAPTURA POR SUB-MUESTRA: con 16 muestras, 10 s
  //      a 30 fps son 4800 capturas y ~17 minutos. Se enciende POR PIEZA y se decide al planificar, no
  //      al final.
  //   3. RECORRE LA PIEZA Y MIDE. Un objeto que recorre mas de 1,5x su propio ancho en un cuadro deja
  //      de ser un objeto borroneado y se convierte en una franja de color. Y por la LEY 6 el borron
  //      NO ES SELECTIVO —el arnes promedia el cuadro entero, `layer.motionBlur` viaja y no cambia
  //      nada—, asi que "la tipografia no lleva borron" no se puede cumplir: el sustituto es que la
  //      tipografia DE LECTURA nunca pase de 8 px por cuadro, y eso aca TIRA.
  var TABLA_OBTURADOR = [
    [0, 45, "seco, digital, de maquina — glitch, datos, interfaz"],
    [46, 90, "crujiente, tenso — accion con lectura, deporte"],
    [91, 200, "natural, el de cine — casi todo"],
    [201, 300, "onirico, lujoso, liquido — lujo, belleza, camara lenta"],
    [301, 360, "estela pura, el objeto es un borron — titulos, latigazos"],
    [361, 720, "irreal, arrastre — efecto, no realismo"]
  ];

  function anchoPantalla(capa, cuadro) {
    var r = null;
    try { r = capa.sourceRectAtTime(cuadro / G.fps(), false); } catch (exAP) { r = null; }
    if (r === null || r.width <= 0) { return 0; }
    var p = posEn(capa, cuadro / G.fps());
    var z = (capa.threeDLayer && p.length > 2) ? p[2] : 0;
    return r.width * Math.abs(G.esc(capa).value[0]) / 100 * factorPantalla(capa, z);
  }

  // Un nulo mide 100x100 y no dibuja nada: medirlo a el seria acusar a la capa equivocada. Lo que
  // importa es el ancho de lo que ARRASTRA.
  function anchoDeReferencia(capa, cuadro) {
    if (!esNulo(capa)) { return anchoPantalla(capa, cuadro); }
    var c = G.comp(), i, mayor = 0;
    for (i = 1; i <= c.numLayers; i++) {
      var h = c.layer(i), pa = null;
      try { pa = h.parent; } catch (exHP) { pa = null; }
      if (pa === capa) { mayor = Math.max(mayor, anchoPantalla(h, cuadro)); }
    }
    return mayor;
  }

  function barrerVelocidades() {
    var c = G.comp(), fps = G.fps(), i, out = [];
    for (i = 1; i <= c.numLayers; i++) {
      var L = c.layer(i);
      if (esCamara(L) || esLuz(L)) { continue; }
      var t = tiemposDeClavesPos(L);
      if (t.length < 2) { continue; }
      var c0 = null, c1 = null, k;
      for (k = 0; k < t.length; k++) {
        var cu = Math.round(t[k] * fps);
        if (c0 === null || cu < c0) { c0 = cu; }
        if (c1 === null || cu > c1) { c1 = cu; }
      }
      var maxD = 0, cuandoD = c0, cu2;
      for (cu2 = c0 + 1; cu2 <= c1; cu2++) {
        var a = posEn(L, (cu2 - 1) / fps);
        var b = posEn(L, cu2 / fps);
        var z = (L.threeDLayer && b.length > 2) ? b[2] : 0;
        var f = factorPantalla(L, z);
        var ddx = (b[0] - a[0]) * f;
        var ddy = (b[1] - a[1]) * f;
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d > maxD) { maxD = d; cuandoD = cu2; }
      }
      if (maxD <= 0) { continue; }
      out[out.length] = {
        capa: L,
        nombre: L.name,
        texto: esTexto(L),
        pico: maxD,
        cuadro: cuandoD,
        ancho: anchoDeReferencia(L, cuandoD)
      };
    }
    return out;
  }

  api.obturador = function (o) {
    o = o || {};
    var quien = "D12 obturador";
    var angulo = pedir(o, "angulo", quien);
    var comp = G.comp();

    if (angulo === 0) {
      comp.motionBlur = false;
      G.anotar("D12|apagado|angulo 0");
      return { encendido: false, angulo: 0, capturas: G.cuadros() };
    }

    var motivo = pedir(o, "motivo", quien);
    if (("" + motivo).length < 15) {
      throw new Error(quien + ": `motivo` tiene " + ("" + motivo).length + " caracteres. El 100% de las " +
                      "capas de los cuatro proyectos medidos trae el obturador APAGADO — el '180 grados " +
                      "fase -90' que declara toda comp es el default de AE, no la decision de nadie. " +
                      "Encenderlo multiplica el render por las muestras, asi que hay que poder " +
                      "defenderlo por escrito y en una frase entera.");
    }
    if (angulo < 0 || angulo > 720) {
      throw new Error(quien + ": angulo " + angulo + ". AE lo acepta entre 0 y 720.");
    }
    var muestras = o.muestras === undefined ? 4 : o.muestras;
    if (muestras < 2 || muestras > 64) {
      throw new Error(quien + ": " + muestras + " muestras. AE las acepta entre 2 y 64, y cada una es una " +
                      "captura mas del arnes.");
    }

    var fase = -angulo / 2;
    if (o.fase !== undefined && o.fase !== fase) {
      if (!o.motivoFase) {
        throw new Error(quien + ": pediste fase " + o.fase + " y la que centra el borron alrededor del " +
                        "cuadro es " + fase + " (-angulo/2). Con cualquier otra el borron sale corrido " +
                        "hacia adelante o hacia atras del objeto, y a alta velocidad se lee como que la " +
                        "cosa va antes que ella misma. Si igual la queres, escribi `motivoFase`.");
      }
      fase = o.fase;
      G.anotar("D12|fase fuera de centro|" + fase + "|" + o.motivoFase);
    }
    if (Math.abs(fase - Math.round(fase)) > 1e-9) {
      G.avisar(quien + ": la fase da " + fase + " grados, que no es entero. AE la acepta igual.");
    }

    var i, dice = "(fuera de tabla)";
    for (i = 0; i < TABLA_OBTURADOR.length; i++) {
      if (angulo >= TABLA_OBTURADOR[i][0] && angulo <= TABLA_OBTURADOR[i][1]) { dice = TABLA_OBTURADOR[i][2]; }
    }

    comp.motionBlur = true;
    comp.shutterAngle = angulo;
    comp.shutterPhase = fase;
    comp.motionBlurSamplesPerFrame = muestras;

    // LEY 5, dicha con el numero y no como advertencia general. La razon sale de la medicion del plan:
    // 16 muestras x 10 s x 30 fps = 4800 capturas ~ 17 min, o sea ~0,21 s por captura EN ESA MAQUINA.
    // Es una regla de tres sobre un dato medido, no una estimacion inventada — y si la maquina es otra,
    // el numero es otro.
    var capturas = G.cuadros() * muestras;
    var minutos = Math.round(capturas * 0.2125 / 60);
    G.avisar(quien + ": obturador ENCENDIDO a " + angulo + " grados (" + dice + "), fase " + fase + ", " +
             muestras + " muestras. El arnes hace UNA CAPTURA POR SUB-MUESTRA: " + G.cuadros() +
             " cuadros x " + muestras + " = " + capturas + " capturas, ~" + minutos + " min de render " +
             "(regla de tres sobre la medicion del plan: 4800 capturas ~ 17 min). Se enciende POR PIEZA " +
             "y se decide al planificar, no al final.");

    var franjas = [], lentos = [], sospechas = [];
    if (o.revisar !== false) {
      var m = barrerVelocidades(), j;
      var transito = o.textoDeTransito ? o.textoDeTransito : [];
      for (i = 0; i < m.length; i++) {
        var esTransito = false;
        for (j = 0; j < transito.length; j++) { if (transito[j] === m[i].nombre) { esTransito = true; } }

        // LEY 6: el borron no es selectivo. La regla "la tipografia no lleva borron" no se puede
        // cumplir, y el sustituto tiene numero: 8 px por cuadro en la tipografia DE LECTURA.
        if (m[i].texto && !esTransito && m[i].pico > 8) {
          throw new Error(quien + ": la capa de texto '" + m[i].nombre + "' recorre " + red(m[i].pico, 1) +
                          " px en el cuadro " + m[i].cuadro + ", y con el obturador encendido el primer " +
                          "tercio de ese texto es ilegible. Y NO se puede apagar por capa: el arnes " +
                          "promedia el cuadro entero (LEY 6), `layer.motionBlur` viaja y no cambia nada. " +
                          "El sustituto es duro: la tipografia de lectura nunca pasa de 8 px por cuadro. " +
                          "Alargá ese gesto, o si ese texto es un TRANSITO y no algo para leer, " +
                          "declaralo en `textoDeTransito: ['" + m[i].nombre + "']`.");
        }
        if (m[i].ancho > 0 && m[i].pico > 1.5 * m[i].ancho) {
          franjas[franjas.length] = m[i].nombre + " (" + red(m[i].pico, 0) + " px/cuadro contra " +
                                    red(m[i].ancho, 0) + " px de ancho, cuadro " + m[i].cuadro + ")";
        }
        if (m[i].ancho === 0) { sospechas[sospechas.length] = m[i].nombre; }
      }
      if (franjas.length > 0) {
        G.avisar(quien + ": " + franjas.length + " capa(s) recorren mas de 1,5x su propio ancho en un " +
                 "cuadro y con " + angulo + " grados se van a dibujar como una FRANJA DE COLOR, no como " +
                 "un objeto borroneado: " + franjas.join(" · ") + ". Tres salidas: bajar el angulo, " +
                 "alargar el gesto, o aceptar que ese tramo es una transicion y no un objeto — que para " +
                 "un latigazo es exactamente lo que se busca.");
      }
      if (sospechas.length > 0) {
        G.avisar(quien + ": no pude medir el ancho de " + sospechas.length + " capa(s) (" +
                 sospechas.join(", ") + "), asi que quedaron fuera de la revision de la franja. El " +
                 "barrido mide la posicion PROPIA de cada capa: si el movimiento viene de un padre, lo " +
                 "que se mide es el padre. Es un piso, no un techo.");
      }
    }

    G.anotar("D12|encendido|" + angulo + " grados|fase " + fase + "|" + muestras + " muestras|" +
             capturas + " capturas|~" + minutos + " min|" + motivo);
    return {
      encendido: true,
      angulo: angulo,
      fase: fase,
      muestras: muestras,
      capturas: capturas,
      minutos: minutos,
      comunica: dice,
      franjas: franjas
    };
  };

  return api;
})();
