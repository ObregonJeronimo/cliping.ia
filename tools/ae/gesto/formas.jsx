// ================================================================================================
// GESTO · FORMAS Y OBJETOS  —  familia F del catalogo (F01 a F14)
// ================================================================================================
//
// QUE ES ESTO. Catorce tecnicas de forma, cada una como una funcion que CONSTRUYE las capas y las
// devuelve. Se apoya en el nucleo (`G`), que ya hace cumplir las leyes de claves, rebote, emparentado
// y tipografia. Aca viven las leyes de la FORMA, que son otras y son las que se rompen dibujando.
//
// LAS TRES QUE ORDENAN TODO EL ARCHIVO:
//
//   1. UN RECORTE DE TRAZADO ANIMADO NO VIAJA. El exportador lo rechaza. Todo lo que en AE se haria
//      con `ADBE Vector Filter - Trim` aca se hace con ESCALA DESDE EL ANCLA (F01, F02) o con TAPAS
//      (F03). No es una aproximacion pobre: una barra que crece es exactamente una escala en X con el
//      ancla en el borde, y coincide con AE al nivel que ya esta medido para las transformaciones.
//
//   2. ESCALAR SOLO SIRVE SOBRE CONTENIDO UNIFORME. Escalar un texto o una foto la DEFORMA, no la
//      revela — y es el error de criterio mas comun de esta familia. Por eso `crecerDesdeElBorde` se
//      NIEGA a escalar una capa de texto, y a una imagen le exige que quien la pasa declare por
//      escrito que su contenido es liso.
//
//   3. UNA TAPA SOLO EXISTE SOBRE FONDO PLANO Y CONOCIDO. Toda funcion que use tapas pide
//      `colorFondo`: si no se puede nombrar el color del fondo, es que el fondo no es plano y la
//      tecnica NO SE PUEDE HACER HOY. Ademas la tapa oculta TODO lo que este debajo en el apilado, no
//      solo su objetivo: el objetivo va al fondo del apilado local, las tapas encima, y el resto de la
//      pieza por encima de las tapas.
//
// LO QUE EL MOTOR NO TIENE, y por eso no aparece aca: efectos, degradados, esquinas redondeadas
// vivas, sombras suaves, desenfoque por capa, particulas, luces, modos de fusion. Todo lo "suave" va
// horneado en un PNG que la pieza provee como recurso — cada funcion documenta QUE tiene que tener el
// PNG que pide, con su tamano y su registro.
//
// UNA TRAMPA DEL VOCABULARIO DE CURVAS: el plan habla de C5 (deriva) y **C5 NO EXISTE en G.CURVAS**,
// porque C5 es influencia 0/0, o sea LINEAL, que ya es el defecto. Pedir "C5" tira "curva
// desconocida". Donde el catalogo dice C5, aca va "LINEAL".
//
// LAS MEDIDAS SON UNIDADES DEL MUNDO, NO PIXELES DE PANTALLA. Con `z` distinto de cero la camara
// achica todo por DIST/(z+DIST): un aro de 200 unidades a z=600 se ve de 160 px con la camara por
// defecto. Si te importa el tamano en pantalla, calculalo vos o construilo en z=0.
//
// COMO SE USA
//   #include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/nucleo.jsx"
//   #include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/formas.jsx"   // (o cargalos juntos)
//   G.iniciar({ nombre: "MI-PIEZA", cuadros: 240, recursos: "C:/ae-probe/recursos" });
//   var eq = Gf.ecualizador({ x: 960, y: 700, n: 9, color: [1, 1, 1], cuadro: 30, cuadros: 150 });
//   G.cerrar();
// ================================================================================================

var Gf = (function () {

  var api = {};

  // ==============================================================================================
  // HERRAMIENTAS INTERNAS
  // ==============================================================================================

  function pedir(o, campo, donde) {
    if (o[campo] === undefined || o[campo] === null) {
      throw new Error(donde + " necesita `" + campo + "`");
    }
    return o[campo];
  }

  function porDefecto(o, campo, valor) {
    if (o[campo] === undefined || o[campo] === null) { o[campo] = valor; }
    return o[campo];
  }

  // Un valor de POSICION/ESCALA/ANCLA tiene dos componentes en una capa 2D y tres en una 3D. Pasar el
  // largo equivocado no da un error claro: da una capa en un lugar raro.
  function tri(capa, a, b, c) {
    if (capa.threeDLayer) { return [a, b, c]; }
    return [a, b];
  }

  function esTresD(o) { return !(o.z === undefined || o.z === null); }

  function solido(nombre, color, w, h, x, y, z) {
    if (z === undefined || z === null) { return G.solido(nombre, color, w, h, x, y); }
    return G.solido(nombre, color, w, h, x, y, z);
  }

  function imagen(archivo, nombre, x, y, z, escala) {
    if (z === undefined || z === null) { return G.img2d(archivo, nombre, x, y, escala); }
    return G.img(archivo, nombre, x, y, z, escala);
  }

  // El nulo se crea con la duracion de la comp a proposito: el defecto de `addNull` cambio entre
  // versiones de AE y un nulo de un segundo deja de mover a sus hijos a mitad de la pieza, sin error.
  function nulo(nombre, x, y, z) {
    var n = G.comp().layers.addNull(G.cuadros() / G.fps());
    n.name = nombre;
    if (z === undefined || z === null) { G.pos(n).setValue([x, y]); }
    else { n.threeDLayer = true; G.pos(n).setValue([x, y, z]); }
    return n;
  }

  // El ancla de una capa recien creada se pone y listo, porque la posicion se fija despues. Esta es
  // para eso; para mover el ancla de una capa YA COLOCADA esta `anclarQuieto`.
  function anclar(capa, ax, ay) {
    var a0 = G.anc(capa).value;
    var az = (capa.threeDLayer && a0.length > 2) ? a0[2] : 0;
    G.anc(capa).setValue(tri(capa, ax, ay, az));
    return capa;
  }

  // MOVER EL ANCLA MUEVE LA CAPA, y es el defecto silencioso numero uno de toda esta familia: uno pone
  // el ancla en el borde para que la barra crezca desde ahi y la barra se corre media barra, sin que
  // nada avise. La compensacion es `posicion += (anclaNueva - anclaVieja) * escala/100`, rotada por el
  // giro propio de la capa.
  function anclarQuieto(capa, ax, ay, donde) {
    var pa = G.pos(capa);
    if (pa.numKeys > 0) {
      throw new Error(donde + ": la posicion ya tiene " + pa.numKeys + " claves. El ancla se mueve " +
                      "ANTES de animar: compensar despues obligaria a correr todas las claves una por " +
                      "una, y la que se olvide corre la capa sin avisar.");
    }
    var a0 = G.anc(capa).value;
    var e = G.esc(capa).value;
    var rz = 0;
    try { rz = G.rotZ(capa).value; } catch (exRz) { rz = 0; }
    if (capa.threeDLayer) {
      var rx = 0, ry = 0, or = [0, 0, 0];
      try { rx = G.rotX(capa).value; ry = G.rotY(capa).value; or = G.ori(capa).value; } catch (exR) { }
      if (Math.abs(rx) > 1e-6 || Math.abs(ry) > 1e-6 ||
          Math.abs(or[0]) > 1e-6 || Math.abs(or[1]) > 1e-6) {
        throw new Error(donde + ": la capa ya esta girada en X/Y (" + Math.round(rx) + ", " +
                        Math.round(ry) + "). Compensar el ancla ahi pide la matriz 3D completa y " +
                        "cualquier error se ve como que la capa salta. Ancla PRIMERO, gira DESPUES.");
      }
    }
    var dx = (ax - a0[0]) * e[0] / 100;
    var dy = (ay - a0[1]) * e[1] / 100;
    var c = Math.cos(rz * Math.PI / 180), s = Math.sin(rz * Math.PI / 180);
    var p0 = pa.value;
    var pz = (capa.threeDLayer && p0.length > 2) ? p0[2] : 0;
    anclar(capa, ax, ay);
    pa.setValue(tri(capa, p0[0] + dx * c - dy * s, p0[1] + dx * s + dy * c, pz));
    return capa;
  }

  // Los cuatro bordes por nombre, para no volver a escribir w/2 en cada tecnica.
  function anclaDeBorde(capa, borde, donde) {
    var w = capa.width, h = capa.height;
    if (borde === "izquierda") { return [0, h / 2]; }
    if (borde === "derecha") { return [w, h / 2]; }
    if (borde === "arriba") { return [w / 2, 0]; }
    if (borde === "abajo") { return [w / 2, h]; }
    if (borde === "centro") { return [w / 2, h / 2]; }
    throw new Error(donde + ": borde desconocido '" + borde + "'. Validos: izquierda, derecha, " +
                    "arriba, abajo, centro.");
  }

  function ejeDeBorde(borde) {
    if (borde === "izquierda" || borde === "derecha") { return "x"; }
    return "y";
  }

  function escalaEje(capa, base, eje, frac) {
    var sx = base[0], sy = base[1];
    var sz = (base.length > 2) ? base[2] : 100;
    if (eje === "x") { sx = base[0] * frac; } else { sy = base[1] * frac; }
    return tri(capa, sx, sy, sz);
  }

  function escalaXY(capa, base, kx, ky) {
    var sz = (base.length > 2) ? base[2] : 100;
    return tri(capa, base[0] * kx, base[1] * ky, sz);
  }

  // Q2 EN EL PICO, NO AL CONSTRUIR. `G.img` revisa la nitidez con la escala INICIAL, y en esta familia
  // media docena de tecnicas arrancan en 0% y terminan en 300%: la revision de origen siempre da bien
  // y el borde igual sale pixelado. Esto mira la escala MAXIMA que va a alcanzar.
  function revisarQ2Pico(archivo, nombre, escalaMax) {
    var itm = G.recurso(archivo);
    var dibujado = itm.width * escalaMax / 100;
    if (dibujado <= 0) { return; }
    var razon = itm.width / dibujado;
    if (razon < 2) {
      G.avisar("Q2 en el pico: '" + nombre + "' llega a dibujarse a " + Math.round(dibujado) +
               " px con " + itm.width + " nativos = " + (Math.round(razon * 100) / 100) + "x. El piso " +
               "es 2x. Regenera " + archivo + ".png con mas pixeles: el borde de una forma que se " +
               "agranda es justo donde se ve el pixelado.");
    }
    return itm;
  }

  function anchoNativo(archivo) { return G.recurso(archivo).width; }
  function altoNativo(archivo) { return G.recurso(archivo).height; }

  // NADA DE Math.random. Park-Miller con semilla en las opciones: la misma semilla da la misma pieza
  // hoy y dentro de un ano, que es lo unico que hace auditable un ecualizador.
  function azarCon(semilla) {
    var s = Math.round(Math.abs(semilla)) % 2147483646;
    // el cero es un punto fijo de este generador: da cero para siempre y el "azar" desaparece
    if (s <= 0) { s = 1; }
    return function () {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  function redondo(x) { return Math.round(x); }

  // Empuja una clave cuidando lo que `G.claves` exige: cuadro entero y orden estricto. Si el cuadro
  // repite al anterior lo PISA en vez de agregar — que es lo correcto cuando la caida de un golpe
  // termina justo donde arranca el siguiente, y es el caso que hace que estas listas sean seguras de
  // armar en un bucle.
  //
  // NO REDONDEA: el cuadro fraccionario TIRA, igual que en el nucleo. Redondear en silencio seria
  // esquivar la ley (c) por comodidad de esta biblioteca, y el golpe terminaria cayendo un cuadro
  // antes o despues sin que nadie se entere. Las cuentas que dan fracciones (el 40% del recorrido, el
  // 60% de la duracion) se redondean EN EL LUGAR donde se hacen, a la vista.
  function empujar(lista, cuadro, valor, curva) {
    var c = cuadro;
    if (Math.abs(c - Math.round(c)) > 1e-9) {
      throw new Error("clave a mitad de cuadro: " + c + ". Todas las claves caen en cuadro entero; " +
                      "si esto sale de una cuenta tuya, redondeala vos y mirá donde cae.");
    }
    if (lista.length > 0) {
      var ult = lista[lista.length - 1];
      if (c === ult[0]) { lista[lista.length - 1] = [c, valor, curva]; return lista; }
      if (c < ult[0]) {
        throw new Error("clave hacia atras: " + ult[0] + " -> " + c + ". Revisá los tiempos.");
      }
    }
    lista[lista.length] = [c, valor, curva];
    return lista;
  }

  function oscurecer(color, k) {
    return [color[0] * k, color[1] * k, color[2] * k];
  }

  // ==============================================================================================
  // F01 · CRECER DESDE EL BORDE
  // ==============================================================================================
  //
  // Una barra o una linea nace de cero desde una punta. En AE seria un Trim End; aca es ESCALA con el
  // ancla en el borde de origen, que es la unica forma que viaja por el exportador.
  //
  // LA TRAMPA, y es de criterio, no de codigo: esto SOLO sirve sobre contenido uniforme. Una barra de
  // color liso escalada al 40% se lee como una barra al 40%; un texto o una foto escalados al 40% se
  // leen como un texto aplastado. Por eso una capa de texto se rechaza siempre, y una imagen exige
  // `uniforme: true` — la declaracion existe para que la excepcion sea una decision escrita y no un
  // descuido.
  api.crecerDesdeElBorde = function (o) {
    o = o || {};
    var donde = "Gf.crecerDesdeElBorde";
    var capa = pedir(o, "capa", donde);
    porDefecto(o, "borde", "izquierda");
    porDefecto(o, "desde", 0);
    porDefecto(o, "hasta", 1);
    porDefecto(o, "dur", 14);
    porDefecto(o, "curva", "C1");
    var cuadro = pedir(o, "cuadro", donde);

    if (capa instanceof TextLayer) {
      throw new Error(donde + ": '" + capa.name + "' es una capa de TEXTO. Escalar texto lo DEFORMA, " +
                      "no lo revela: las letras se aplastan y se lee como un error de render. El " +
                      "revelado de texto se hace con una tapa (familia T, T02/T03) que lo descubre sin " +
                      "tocarle la escala.");
    }
    var uniforme = false;
    try {
      uniforme = (capa.source && capa.source.mainSource instanceof SolidSource);
    } catch (exU) { uniforme = false; }
    if (!uniforme && o.uniforme !== true) {
      throw new Error(donde + ": '" + capa.name + "' no es un solido, asi que su contenido puede no " +
                      "ser liso, y escalar contenido lo deforma en vez de revelarlo. Si el PNG es una " +
                      "barra de color plano pasá `uniforme: true` y queda declarado; si tiene dibujo " +
                      "adentro, esto no es lo que necesitás — revelalo con una tapa que se corre.");
    }

    var borde = o.borde;
    var eje = ejeDeBorde(borde);
    var a = anclaDeBorde(capa, borde, donde);
    anclarQuieto(capa, a[0], a[1], donde);

    var base = G.esc(capa).value;
    var lista = [];
    empujar(lista, cuadro, escalaEje(capa, base, eje, o.desde), o.curva);
    empujar(lista, cuadro + o.dur, escalaEje(capa, base, eje, o.hasta), "LINEAL");
    G.claves(G.esc(capa), lista, donde + " (" + capa.name + ")");

    G.anotar("F01|" + capa.name + "|" + borde + "|" + o.desde + "->" + o.hasta + "|" + o.dur + " cuadros");
    return { capa: capa, escala: G.esc(capa), eje: eje, capas: [capa] };
  };

  // ==============================================================================================
  // F02 · BARRA QUE SE LLENA, CON PUNTA REDONDA
  // ==============================================================================================
  //
  // La barra crece y su extremo de avance sigue siendo REDONDO. Es lo que distingue una barra de dato
  // de una barra de relleno, y es donde F01 sola falla: si el redondeo esta horneado en el PNG, la
  // escala lo aplasta a un ovalo, y se ve.
  //
  // POR QUE NO USO LA RECETA DE TAPA DEL CATALOGO. El catalogo pide barra completa quieta + tapa
  // deslizante + punta emparentada a la tapa. Funciona, pero la tapa exige fondo plano y suma una capa
  // que no aporta nada mas. Con la barra como SOLIDO —contenido uniforme, o sea el caso legitimo de
  // F01— la escala desde el ancla da exactamente el mismo dibujo, funciona sobre CUALQUIER fondo, y
  // las puntas se resuelven con dos circulos: uno quieto atras y uno que viaja adelante.
  //
  // LA PUNTA VIAJERA NO SE EMPARENTA A LA BARRA. Un hijo hereda la escala del padre, asi que el
  // circulo se estiraria igual que la barra. Se le anima su propia X con LAS MISMAS claves y LA MISMA
  // curva, que es lo que garantiza que no se despeguen ni un cuadro.
  //
  // EL PNG QUE ESPERA — `puntaPng`: un CIRCULO RELLENO del color de la barra, centrado en el lienzo,
  // cuadrado, con el borde suavizado (el motor no tiene antialias propio). Su diametro dibujado va a
  // ser `grosor`, asi que necesita al menos 2x esos pixeles nativos.
  api.barraQueSeLlena = function (o) {
    o = o || {};
    var donde = "Gf.barraQueSeLlena";
    var x = pedir(o, "x", donde);           // borde IZQUIERDO de la barra
    var y = pedir(o, "y", donde);           // centro vertical
    var largo = pedir(o, "largo", donde);
    var grosor = pedir(o, "grosor", donde);
    var color = pedir(o, "color", donde);
    var cuadro = pedir(o, "cuadro", donde);
    porDefecto(o, "desde", 0);
    porDefecto(o, "hasta", 1);
    porDefecto(o, "dur", 22);
    porDefecto(o, "curva", "C1");
    porDefecto(o, "puntaIzquierda", true);
    var z = o.z;

    if (o.hasta <= o.desde) {
      throw new Error(donde + ": `hasta` (" + o.hasta + ") tiene que ser mayor que `desde` (" +
                      o.desde + "). Una barra que se vacia es la misma tecnica al reves: invertí los " +
                      "valores y usá la curva C3, que es la de todo lo que se va.");
    }

    var capas = [];
    var punta = null, puntaFin = null;
    var escPunta = 0;
    if (o.puntaPng) {
      escPunta = grosor / anchoNativo(o.puntaPng) * 100;
      revisarQ2Pico(o.puntaPng, "punta de " + (o.nombre || "barra"), escPunta);
    }

    // EL ORDEN DE LAS TRES PARTES ESTA ESCRITO EN LOS COMENTARIOS Y NO ESTABA EN LA GEOMETRIA.
    //
    // "Atras del todo la punta quieta", "la punta que viaja va adelante": esa jerarquia existia solo
    // como orden de creacion de capas. En AE eso alcanza —compone por apilado— pero el motor web ordena
    // POR DISTANCIA A LA CAMARA, y las tres estaban en la misma z. Con profundidades iguales el
    // desempate lo decide cada uno por su cuenta, y una junta que se ve o no se ve segun quien dibuje
    // es un defecto que aparece en el video y no en el preview.
    //
    // 2 unidades por capa, que es el valor de oficio de la casa (rompe el umbral de 1 y no se ve). En
    // AE la camara mira hacia +z, asi que MENOS z es MAS CERCA: la punta que viaja queda en z, el
    // cuerpo en z+2 y la punta de atras en z+4. Y si la barra es 2D no se toca nada, porque ahi el
    // apilado ya es la respuesta.
    var hayZ = !(z === undefined || z === null);
    var zPunta = hayZ ? z : z, zCuerpo = hayZ ? z + 2 : z, zAtras = hayZ ? z + 4 : z;

    // atras del todo la punta quieta, para que la barra le tape la mitad interior y no se vea la junta
    if (o.puntaPng && o.puntaIzquierda) {
      punta = imagen(o.puntaPng, (o.nombre || "barra") + "-punta-atras", x, y, zAtras, escPunta);
      capas[capas.length] = punta;
    }

    // la barra: solido, ancla en el borde izquierdo, escala X animada
    var barra = solido((o.nombre || "barra") + "-cuerpo", color, Math.ceil(largo), Math.ceil(grosor),
                       x, y, zCuerpo);
    anclar(barra, 0, barra.height / 2);
    if (!hayZ) { G.pos(barra).setValue([x, y]); }
    else { G.pos(barra).setValue([x, y, zCuerpo]); }
    capas[capas.length] = barra;

    var base = G.esc(barra).value;
    var lista = [];
    empujar(lista, cuadro, escalaEje(barra, base, "x", o.desde), o.curva);
    empujar(lista, cuadro + o.dur, escalaEje(barra, base, "x", o.hasta), "LINEAL");
    G.claves(G.esc(barra), lista, donde + " (cuerpo)");

    // la punta que viaja: mismas claves, misma curva, su propia posicion
    if (o.puntaPng) {
      puntaFin = imagen(o.puntaPng, (o.nombre || "barra") + "-punta", x + largo * o.desde, y, zPunta, escPunta);
      capas[capas.length] = puntaFin;
      var ej = G.ejes(puntaFin);
      var lx = [];
      empujar(lx, cuadro, x + largo * o.desde, o.curva);
      empujar(lx, cuadro + o.dur, x + largo * o.hasta, "LINEAL");
      G.claves(ej.x, lx, donde + " (punta)");
    } else {
      G.avisar(donde + ": sin `puntaPng` la barra queda con el extremo CUADRADO. Si el diseno la " +
               "muestra con punta redonda, esa diferencia se ve en el primer cuadro.");
    }

    G.anotar("F02|" + (o.nombre || "barra") + "|" + largo + "x" + grosor + "|" +
             o.desde + "->" + o.hasta + "|" + o.dur + " cuadros");
    // LA BARRA NO EXISTE ANTES DE EMPEZAR A LLENARSE. Sus tres capas vivian las 600 cuadros de la comp:
    // un riel naranja plantado en pantalla durante la marca, la promesa y el cierre.
    //
    // `hasta` YA ESTABA OCUPADO y significa otra cosa —la FRACCION de llenado, 0 a 1— asi que la salida
    // va en `salida`, en cuadros. Reusar `hasta` para dos unidades distintas es como se escriben los
    // defectos que no dan error: el numero entra, la funcion construye, y el resultado es otro.
    var iS, finBarra = (o.salida === undefined) ? G.cuadros() : o.salida;
    if (finBarra <= cuadro) {
      throw new Error(donde + ": `salida` (" + finBarra + ") no es posterior al cuadro en que la barra " +
                      "empieza a llenarse (" + cuadro + "). Asi no se ve nunca.");
    }
    for (iS = 0; iS < capas.length; iS++) { G.plano(capas[iS], cuadro, finBarra); }

    return { barra: barra, punta: puntaFin, puntaAtras: punta, capas: capas };
  };

  // ==============================================================================================
  // F03 · ANILLO DE PROGRESO
  // ==============================================================================================
  //
  // Un arco que se completa alrededor de un circulo. Sin recorte de trazado y sin recorte polar, se
  // arma con DOS MEDIOS ARCOS Y DOS TAPAS, y conviene entender por que — porque la receta corta que
  // anda dando vueltas ("dos medias lunas tapa girando y se intercambia cual esta encima al 50%") NO
  // FUNCIONA: dos tapas del color del fondo tapan las dos, siempre; juntas cubren el plano entero y no
  // hay orden de apilado que revele nada. Lo verifique angulo por angulo antes de escribir esto.
  //
  // LO QUE SI FUNCIONA (de abajo hacia arriba del apilado):
  //   1. arcoB   — medio anillo, girado de 0 a (360*p - 180). Es el que dibuja la SEGUNDA mitad.
  //   2. tapaDer — media luna quieta que cubre la mitad DERECHA. Recorta a arcoB lo que le sobra.
  //   3. arcoA   — medio anillo, girado de (360*p - 180) hasta 0. Dibuja la PRIMERA mitad y despues
  //                se queda quieto siendo, exactamente, la mitad derecha del anillo.
  //   4. tapaIzq — media luna quieta que cubre la mitad IZQUIERDA. Recorta a arcoA. Se APAGA en el
  //                cuadro del relevo, con clave HOLD, para dejar salir a arcoB.
  //   5. punta   — el circulo del extremo, colgado de un nulo que gira con el progreso.
  //
  // POR QUE EL PROGRESO VA LINEAL SI CRUZA EL 50%. El relevo tiene que caer en un CUADRO ENTERO, y con
  // una curva el 50% no cae en ningun cuadro que se pueda calcular: el error se ve como un pedacito de
  // arco que aparece antes de tiempo del otro lado de las 12. Si querés el ease de un dato, pedí dos
  // tramos (0→50 con la curva que quieras, 50→100 con otra) o poné el ease en lo que entra.
  //
  // LOS PNG QUE ESPERA:
  //   `medioAnilloPng` — lienzo CUADRADO, anillo centrado, dibujada solo la MITAD DERECHA del aro (de
  //                      las 12 a las 6 pasando por las 3), extremos cortados a escuadra: el casquete
  //                      redondo lo pone la punta viajera. El centro del lienzo ES el centro de giro.
  //   `medialunaPng`   — mismo lienzo cuadrado, SEMICIRCULO RELLENO del color del fondo ocupando la
  //                      mitad DERECHA, mitad izquierda transparente. Radio >= radio exterior del aro
  //                      mas su grosor, o el aro asoma por afuera de la tapa.
  //   `puntaPng`       — circulo relleno del color del aro, diametro = grosor del aro (opcional).
  api.anilloDeProgreso = function (o) {
    o = o || {};
    var donde = "Gf.anilloDeProgreso";
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);
    var diametro = pedir(o, "diametro", donde);     // diametro exterior dibujado, en unidades de mundo
    var medioAnilloPng = pedir(o, "medioAnilloPng", donde);
    var medialunaPng = pedir(o, "medialunaPng", donde);
    var cuadro = pedir(o, "cuadro", donde);
    pedir(o, "colorFondo", donde);                  // no se usa como valor: es la PRUEBA de fondo plano
    porDefecto(o, "desde", 0);
    porDefecto(o, "hasta", 1);
    porDefecto(o, "dur", 36);
    porDefecto(o, "curva", "LINEAL");
    var z = o.z;

    if (o.desde < 0 || o.hasta > 1 || o.hasta <= o.desde) {
      throw new Error(donde + ": `desde`/`hasta` van entre 0 y 1 y en ese orden. Llegaron " +
                      o.desde + " y " + o.hasta + ".");
    }
    var cruza = (o.desde < 0.5 && o.hasta > 0.5);
    if (cruza && o.curva !== "LINEAL") {
      throw new Error(donde + ": este gesto cruza el 50% y ahi hay un RELEVO entre los dos medios " +
                      "arcos, que tiene que caer en un cuadro entero. Con la curva '" + o.curva +
                      "' el 50% no cae en ningun cuadro calculable y el relevo se ve como un pedazo de " +
                      "arco que aparece antes de tiempo. Opciones: dejalo LINEAL (que ademas es lo " +
                      "correcto para un cargador), o partilo en dos llamadas — 0→0.5 y 0.5→1 — cada " +
                      "una con la curva que quieras.");
    }

    var escAro = diametro / anchoNativo(medioAnilloPng) * 100;
    var escLuna = diametro / anchoNativo(medialunaPng) * 100;
    revisarQ2Pico(medioAnilloPng, (o.nombre || "anillo") + " (aro)", escAro);

    var nom = o.nombre || "anillo";
    var capas = [];
    var fin = cuadro + o.dur;
    // el cuadro del relevo, con el progreso lineal: donde p vale 0,5
    var fm = redondo(cuadro + o.dur * (0.5 - o.desde) / (o.hasta - o.desde));
    if (cruza && (fm <= cuadro || fm >= fin)) {
      throw new Error(donde + ": el relevo del 50% cae en el cuadro " + fm + ", fuera del tramo [" +
                      cuadro + ", " + fin + "]. Alargá `dur`: con menos de 4 cuadros por mitad el " +
                      "anillo no se lee como que se llena, se lee como que aparece.");
    }

    var arcoB = null, tapaDer = null, arcoA = null, tapaIzq = null;

    // --- 1 y 2: la segunda mitad, solo si el gesto llega a pasar del 50%
    if (o.hasta > 0.5) {
      arcoB = imagen(medioAnilloPng, nom + "-arco-2", x, y, z, escAro);
      capas[capas.length] = arcoB;
      var rB = [];
      var b0 = Math.max(360 * o.desde - 180, 0);
      empujar(rB, cruza ? fm : cuadro, b0, o.curva);
      empujar(rB, fin, 360 * o.hasta - 180, "LINEAL");
      G.claves(G.rotZ(arcoB), rB, donde + " (arco 2)");

      tapaDer = imagen(medialunaPng, nom + "-tapa-derecha", x, y, z, escLuna);
      capas[capas.length] = tapaDer;
    }

    // --- 3: la primera mitad. Cuando el gesto arranca pasado el 50%, este arco es la mitad derecha
    //        quieta y no se anima nada.
    arcoA = imagen(medioAnilloPng, nom + "-arco-1", x, y, z, escAro);
    capas[capas.length] = arcoA;
    if (o.desde < 0.5) {
      var rA = [];
      empujar(rA, cuadro, 360 * o.desde - 180, o.curva);
      empujar(rA, cruza ? fm : fin, Math.min(360 * o.hasta - 180, 0), "LINEAL");
      G.claves(G.rotZ(arcoA), rA, donde + " (arco 1)");
    } else {
      G.rotZ(arcoA).setValue(0);
    }

    // --- 4: la tapa izquierda, que es la que se apaga en el relevo
    if (o.desde < 0.5) {
      tapaIzq = imagen(medialunaPng, nom + "-tapa-izquierda", x, y, z, escLuna);
      G.rotZ(tapaIzq).setValue(180);
      capas[capas.length] = tapaIzq;
      if (o.hasta > 0.5) {
        // HOLD: el apagado tiene que ser de un cuadro al otro. Con una rampa, la tapa se hace
        // transparente y deja ver el arco de abajo antes de tiempo, que es justo lo que oculta.
        G.claves(G.op(tapaIzq), [[cuadro, 100, "HOLD"], [fm, 0]], donde + " (tapa izquierda)");
      }
    }

    // --- 5: la punta viajera, colgada de un nulo que gira con el progreso
    var nGiro = null, punta = null;
    if (o.puntaPng) {
      var grosorPunta = o.grosorPunta || (diametro * 0.12);
      var escPunta = grosorPunta / anchoNativo(o.puntaPng) * 100;
      revisarQ2Pico(o.puntaPng, nom + " (punta)", escPunta);
      nGiro = nulo(nom + "-giro", x, y, z);
      punta = imagen(o.puntaPng, nom + "-punta", x, y, z, escPunta);
      capas[capas.length] = punta;
      G.colgar(punta, nGiro, (z === undefined || z === null) ? [0, -diametro / 2] : [0, -diametro / 2, 0]);
      var rG = [];
      empujar(rG, cuadro, 360 * o.desde, o.curva);
      if (cruza) { empujar(rG, fm, 180, o.curva); }
      empujar(rG, fin, 360 * o.hasta, "LINEAL");
      G.claves(G.rotZ(nGiro), rG, donde + " (punta)");
    }

    G.anotar("F03|" + nom + "|" + o.desde + "->" + o.hasta + "|relevo en " + (cruza ? fm : "-") +
             "|" + capas.length + " capas");
    return { arcoA: arcoA, arcoB: arcoB, tapaIzq: tapaIzq, tapaDer: tapaDer,
             punta: punta, nulo: nGiro, capas: capas };
  };

  // ==============================================================================================
  // F04 · SEGMENTO QUE PERSIGUE (el gusano)
  // ==============================================================================================
  //
  // Un pedazo de linea corre por un contorno, en bucle. En circulo sale EXACTO y gratis: el arco
  // rasterizado gira, y como gira alrededor de su propio centro, la tangente lo acompana sola.
  //
  // NO LLEVA NULO. El catalogo pide "PNG de arco emparentado a un nulo que gira"; si el lienzo del PNG
  // esta centrado en el eje de giro, el nulo no aporta nada y es una capa menos que exportar.
  //
  // LA CURVA ES LINEAL Y NO ES NEGOCIABLE: cualquier ease delata el bucle, porque el ojo ve el
  // frenadito en el punto de empalme y a partir de ahi ya no puede dejar de verlo.
  //
  // EL PNG QUE ESPERA — `arcoPng`: lienzo CUADRADO con un arco corto (10% a 25% de la vuelta) dibujado
  // sobre el mismo radio que el aro de fondo, centrado en el lienzo.
  api.segmentoQuePersigue = function (o) {
    o = o || {};
    var donde = "Gf.segmentoQuePersigue";
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);
    var diametro = pedir(o, "diametro", donde);
    var arcoPng = pedir(o, "arcoPng", donde);
    var cuadro = pedir(o, "cuadro", donde);
    porDefecto(o, "ciclo", 52);        // cuadros por vuelta: 45-60
    porDefecto(o, "vueltas", 1);
    porDefecto(o, "sentido", 1);       // 1 = horario
    var z = o.z;

    var esc = diametro / anchoNativo(arcoPng) * 100;
    revisarQ2Pico(arcoPng, o.nombre || "gusano", esc);
    var capa = imagen(arcoPng, o.nombre || "gusano", x, y, z, esc);

    var vueltas = Math.max(1, Math.round(o.vueltas));
    G.claves(G.rotZ(capa), [
      [cuadro, 0, "LINEAL"],
      [cuadro + o.ciclo * vueltas, 360 * vueltas * (o.sentido < 0 ? -1 : 1)]
    ], donde);

    G.anotar("F04|" + (o.nombre || "gusano") + "|" + vueltas + " vueltas|" + o.ciclo + " cuadros cada una");
    return { capa: capa, capas: [capa] };
  };

  // ==============================================================================================
  // F05 · HORMIGAS QUE MARCHAN
  // ==============================================================================================
  //
  // Un contorno punteado cuyos guiones corren. En CIRCULO la coincidencia con AE es exacta y por una
  // razon bonita: correr los guiones un periodo es lo mismo que girar el aro entero 360/N grados, y un
  // giro es una transformacion pura. Un solo valor animado, bucle perfecto.
  //
  // EN RECTA sale con una tira mas larga que el tramo visible, trasladada exactamente un periodo, con
  // dos tapas comiendole las puntas — o sea que la recta SI necesita fondo plano y el circulo no.
  //
  // EL RECTANGULO NO TIENE RECETA y no la voy a fingir: cuatro tiras que corren no cierran la fase en
  // las esquinas y el defecto queda parpadeando en las cuatro. Si el diseno lo pide, o se redondea el
  // rectangulo hasta que sea un estadio y se usa la variante recta por lado sin cruzar las esquinas, o
  // espera al recorte rectangular por capa (B3 del plan).
  //
  // LOS PNG QUE ESPERA:
  //   circulo — `aroPunteadoPng`: lienzo cuadrado, aro punteado COMPLETO, con `guiones` guiones
  //             repartidos exactamente parejos. Si no son parejos, el bucle salta.
  //   recta   — `tiraPunteadaPng`: tira horizontal de largo >= tramo visible + 2 periodos, con el
  //             periodo (guion+hueco) constante y conocido.
  api.hormigasQueMarchan = function (o) {
    o = o || {};
    var donde = "Gf.hormigasQueMarchan";
    var cuadro = pedir(o, "cuadro", donde);
    porDefecto(o, "forma", "circulo");
    porDefecto(o, "ciclo", 11);        // cuadros por periodo: 8-15
    porDefecto(o, "repeticiones", 8);
    porDefecto(o, "sentido", 1);
    var z = o.z;
    var capas = [];

    if (o.forma === "rectangulo") {
      throw new Error(donde + ": el rectangulo NO tiene receta con lo que hay. Serian cuatro tiras " +
                      "corriendo y la fase no cierra en las esquinas: se ve un salto en las cuatro, " +
                      "cada periodo. No lo uses. Salidas honestas: (1) hacé el contorno CIRCULAR, " +
                      "donde sale exacto; (2) usá una sola tira RECTA por lado sin cruzar las " +
                      "esquinas; (3) esperá al recorte rectangular por capa, que lo resuelve entero.");
    }

    if (o.forma === "circulo") {
      var x = pedir(o, "x", donde);
      var y = pedir(o, "y", donde);
      var diametro = pedir(o, "diametro", donde);
      var aroPunteadoPng = pedir(o, "aroPunteadoPng", donde);
      var guiones = pedir(o, "guiones", donde);
      var esc = diametro / anchoNativo(aroPunteadoPng) * 100;
      revisarQ2Pico(aroPunteadoPng, o.nombre || "hormigas", esc);
      var aro = imagen(aroPunteadoPng, o.nombre || "hormigas", x, y, z, esc);
      capas[capas.length] = aro;
      var reps = Math.max(1, Math.round(o.repeticiones));
      // el bucle es perfecto porque el angulo total es un multiplo EXACTO del paso entre guiones
      G.claves(G.rotZ(aro), [
        [cuadro, 0, "LINEAL"],
        [cuadro + o.ciclo * reps, (360 / guiones) * reps * (o.sentido < 0 ? -1 : 1)]
      ], donde + " (circulo)");
      G.anotar("F05|circulo|" + guiones + " guiones|paso " + (Math.round(3600 / guiones) / 10) + " grados");
      return { aro: aro, capas: capas };
    }

    if (o.forma === "recta") {
      var rx = pedir(o, "x", donde);       // centro del tramo visible
      var ry = pedir(o, "y", donde);
      var tramo = pedir(o, "tramo", donde);          // largo visible
      var tiraPng = pedir(o, "tiraPunteadaPng", donde);
      var periodo = pedir(o, "periodo", donde);      // guion + hueco, en unidades de mundo
      var colorFondo = pedir(o, "colorFondo", donde);
      var grosor = pedir(o, "grosor", donde);
      var escT = (o.escala === undefined) ? 100 : o.escala;
      revisarQ2Pico(tiraPng, o.nombre || "hormigas", escT);
      var largoTira = anchoNativo(tiraPng) * escT / 100;
      if (largoTira < tramo + 2 * periodo) {
        throw new Error(donde + ": la tira mide " + Math.round(largoTira) + " y el tramo visible " +
                        Math.round(tramo) + ". Necesita al menos tramo + 2 periodos (" +
                        Math.round(tramo + 2 * periodo) + ") o al correrse se le ve el final.");
      }
      var tira = imagen(tiraPng, (o.nombre || "hormigas") + "-tira", rx, ry, z, escT);
      capas[capas.length] = tira;
      var rr = Math.max(1, Math.round(o.repeticiones));
      var ejT = G.ejes(tira);
      G.claves(ejT.x, [
        [cuadro, rx, "LINEAL"],
        [cuadro + o.ciclo * rr, rx + periodo * rr * (o.sentido < 0 ? -1 : 1)]
      ], donde + " (recta)");

      // las dos tapas: comen lo que sobra de la tira a cada lado del tramo visible
      var anchoTapa = Math.ceil(largoTira);
      var altoTapa = Math.ceil(grosor * 3);
      var tI = solido((o.nombre || "hormigas") + "-tapa-izq", colorFondo, anchoTapa, altoTapa,
                      rx - tramo / 2, ry, z);
      anclar(tI, tI.width, tI.height / 2);
      if (z === undefined || z === null) { G.pos(tI).setValue([rx - tramo / 2, ry]); }
      else { G.pos(tI).setValue([rx - tramo / 2, ry, z]); }
      var tD = solido((o.nombre || "hormigas") + "-tapa-der", colorFondo, anchoTapa, altoTapa,
                      rx + tramo / 2, ry, z);
      anclar(tD, 0, tD.height / 2);
      if (z === undefined || z === null) { G.pos(tD).setValue([rx + tramo / 2, ry]); }
      else { G.pos(tD).setValue([rx + tramo / 2, ry, z]); }
      capas[capas.length] = tI;
      capas[capas.length] = tD;

      G.anotar("F05|recta|periodo " + periodo + "|tramo " + tramo);
      return { tira: tira, tapaIzq: tI, tapaDer: tD, capas: capas };
    }

    throw new Error(donde + ": forma desconocida '" + o.forma + "'. Validas: circulo, recta. " +
                    "(rectangulo se rechaza a proposito: no cierra en las esquinas.)");
  };

  // ==============================================================================================
  // F06 · ECUALIZADOR
  // ==============================================================================================
  //
  // Una fila de barras que suben y bajan a distinto ritmo. Es el antidoto mas directo contra "el video
  // esta muerto", y no porque sea lindo: es la unica cosa de esta familia que garantiza que en TODO
  // cuadro haya varios elementos con energia, que es la regla que el diagnostico rompio.
  //
  // LO QUE SE LEE COMO BEAT ES LA ASIMETRIA, no la altura: golpe en 2-3 cuadros y caida en 8-12. Con
  // subida y bajada iguales queda una ola de mar y el pulso desaparece. Por eso la subida va con C7
  // (arranca a maxima velocidad) y la caida con C1.
  //
  // EL AZAR ES HORNEADO Y CON SEMILLA. El wiggle de AE es ruido continuo y no se puede exportar; aca se
  // hornean las claves con un generador congruencial. No es una perdida: es determinismo, o sea que la
  // misma semilla da el mismo ecualizador y una diferencia entre dos renders es un defecto de verdad.
  api.ecualizador = function (o) {
    o = o || {};
    var donde = "Gf.ecualizador";
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);          // LINEA DE BASE: las barras crecen hacia arriba desde aca
    var color = pedir(o, "color", donde);
    var cuadro = pedir(o, "cuadro", donde);
    var cuadros = pedir(o, "cuadros", donde);
    porDefecto(o, "n", 9);
    porDefecto(o, "altoMax", 220);
    porDefecto(o, "grosor", 22);
    porDefecto(o, "hueco", 14);
    porDefecto(o, "paso", 15);             // cuadros por golpe: 15 = 120 bpm a 30 fps
    porDefecto(o, "ataque", 3);
    porDefecto(o, "caida", 10);
    porDefecto(o, "minimo", 14);           // % del alto que queda cuando la barra "descansa"
    porDefecto(o, "retardo", 0);           // cuadros de desfase por barra: 1-2 lo vuelve una ola
    porDefecto(o, "semilla", 7);
    var z = o.z;

    if (o.n > 12) {
      throw new Error(donde + ": pediste " + o.n + " barras y el techo es 12. Cada barra es una capa " +
                      "y una rasterizacion; y por arriba de doce el ojo deja de leer barras y lee " +
                      "textura, o sea que pagas capas por menos lectura.");
    }
    if (o.paso < o.ataque + o.caida) {
      throw new Error(donde + ": el golpe dura " + (o.ataque + o.caida) + " cuadros (ataque " +
                      o.ataque + " + caida " + o.caida + ") y entre golpe y golpe hay " + o.paso +
                      ". La barra no llega a bajar antes del siguiente y el beat se empasta. Bajá la " +
                      "caida o subí `paso`.");
    }

    var rnd = azarCon(o.semilla);
    var total = o.n * o.grosor + (o.n - 1) * o.hueco;
    var capas = [];
    var i, b;

    for (i = 0; i < o.n; i++) {
      var bx = x - total / 2 + o.grosor / 2 + i * (o.grosor + o.hueco);
      var barra = solido((o.nombre || "eq") + "-" + (i + 1), color,
                         Math.ceil(o.grosor), Math.ceil(o.altoMax), bx, y, z);
      // el ancla al borde INFERIOR: es lo que hace que la barra crezca desde la linea de base en vez
      // de crecer para los dos lados desde su centro
      anclar(barra, barra.width / 2, barra.height);
      if (z === undefined || z === null) { G.pos(barra).setValue([bx, y]); }
      else { G.pos(barra).setValue([bx, y, z]); }
      capas[capas.length] = barra;

      var base = G.esc(barra).value;
      var reposo = escalaEje(barra, base, "y", o.minimo / 100);
      var lista = [];
      var f0 = cuadro + i * o.retardo;
      var fin = cuadro + cuadros;
      empujar(lista, f0, reposo, "LINEAL");
      b = 0;
      while (f0 + b * o.paso + o.ataque + o.caida <= fin) {
        var fA = f0 + b * o.paso;
        var fB = fA + o.ataque;
        var fC = fB + o.caida;
        // la fase por barra separa a las vecinas; el ruido evita que se lea como una onda dibujada
        var onda = 0.5 + 0.5 * Math.sin(i * 0.9 + b * 0.85);
        var nivel = 0.45 * onda + 0.55 * rnd();
        var pico = o.minimo / 100 + (1 - o.minimo / 100) * (0.35 + 0.65 * nivel);
        empujar(lista, fA, reposo, "C7");
        empujar(lista, fB, escalaEje(barra, base, "y", pico), "C1");
        empujar(lista, fC, reposo, "LINEAL");
        b++;
      }
      if (lista.length < 2) {
        throw new Error(donde + ": con `cuadros` = " + cuadros + " y `paso` = " + o.paso +
                        " no entra ni un golpe completo. El tramo tiene que durar al menos " +
                        (o.paso + o.ataque + o.caida) + " cuadros.");
      }
      G.claves(G.esc(barra), lista, donde + " (barra " + (i + 1) + ")");
      // CADA BARRA VIVE LO QUE DURA SU ANIMACION. Sin esto las nueve quedan en pantalla las 600
      // cuadros de la comp: nueve barras naranjas plantadas encima de la marca, de la promesa y del
      // cierre. No lo caza `marco-check` (no estan cortadas), no lo caza `escena-check` (se ven
      // perfecto), no lo caza `lectura` ni `colision`. Lo unico que lo insinuo fue un empate de
      // profundidad en el cuadro 1 — de una barra que no tendria que existir en el cuadro 1.
      G.plano(barra, f0, fin);
    }

    G.anotar("F06|" + o.n + " barras|paso " + o.paso + "|ataque " + o.ataque + "/caida " + o.caida +
             "|semilla " + o.semilla);
    return { barras: capas, capas: capas };
  };

  // ==============================================================================================
  // F07 · ONDAS CONCENTRICAS
  // ==============================================================================================
  //
  // Aros que nacen de un punto, se expanden y se desvanecen. Es vida ambiental: no cuenta nada, pero
  // sostiene el "algo pasa" durante las mesetas, que es donde una pieza se muere.
  //
  // TRES DETALLES QUE LO SEPARAN DE UN ARO QUE CRECE:
  //   · la opacidad no empieza a bajar al principio sino al 40% del recorrido. Si baja desde el
  //     arranque, el aro nace ya apagado y no se lee el nacimiento.
  //   · los tres aros arrancan con `inPoint` en 0 y la visibilidad la lleva la OPACIDAD con claves
  //     HOLD. Es la ley 7: una capa de forma con entrada tardia puede rasterizar vacia.
  //   · escalar el aro tambien engorda su trazo, y AE hace exactamente lo mismo al escalar la capa: la
  //     coincidencia es exacta. Si hace falta trazo de grosor constante, esto no es la tecnica.
  //
  // EL PNG QUE ESPERA — `aroPng`: lienzo cuadrado, aro de trazo (no relleno) centrado, del color y el
  // grosor finales. Como se dibuja hasta `diametro`, necesita 2x esos pixeles nativos.
  api.ondasConcentricas = function (o) {
    o = o || {};
    var donde = "Gf.ondasConcentricas";
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);
    var aroPng = pedir(o, "aroPng", donde);
    var diametro = pedir(o, "diametro", donde);   // diametro FINAL dibujado
    var cuadro = pedir(o, "cuadro", donde);
    porDefecto(o, "n", 3);
    porDefecto(o, "dur", 28);
    porDefecto(o, "retardo", 10);
    porDefecto(o, "repeticiones", 1);
    porDefecto(o, "diametroInicial", 0);
    var z = o.z;

    var escFin = diametro / anchoNativo(aroPng) * 100;
    var escIni = o.diametroInicial / anchoNativo(aroPng) * 100;
    revisarQ2Pico(aroPng, o.nombre || "onda", escFin);

    var ciclo = o.n * o.retardo;
    if (o.repeticiones > 1 && o.dur > ciclo) {
      throw new Error(donde + ": cada aro vive " + o.dur + " cuadros y vuelve a nacer cada " + ciclo +
                      " (" + o.n + " aros x " + o.retardo + " de retardo). El aro se pisaria a si " +
                      "mismo. Subí `n` o `retardo`, o bajá `dur`.");
    }

    var capas = [];
    var i, r;
    for (i = 0; i < o.n; i++) {
      var aro = imagen(aroPng, (o.nombre || "onda") + "-" + (i + 1), x, y, z, escIni);
      capas[capas.length] = aro;
      var lesc = [], lop = [];
      // arranca apagado: la primera clave de opacidad es HOLD en 0 desde el cuadro 0
      empujar(lop, 0, 0, "HOLD");
      for (r = 0; r < o.repeticiones; r++) {
        var ini = cuadro + i * o.retardo + r * ciclo;
        var fin = ini + o.dur;
        var caida = redondo(ini + o.dur * 0.4);
        empujar(lesc, ini, tri(aro, escIni, escIni, 100), "C1");
        empujar(lesc, fin, tri(aro, escFin, escFin, 100), "LINEAL");
        empujar(lop, ini, 100, "HOLD");
        empujar(lop, caida, 100, "LINEAL");
        empujar(lop, fin, 0, "HOLD");
      }
      G.claves(G.esc(aro), lesc, donde + " (aro " + (i + 1) + ", escala)");
      G.claves(G.op(aro), lop, donde + " (aro " + (i + 1) + ", opacidad)");
    }

    G.anotar("F07|" + o.n + " aros|dur " + o.dur + "|retardo " + o.retardo +
             "|x" + o.repeticiones + " repeticiones");
    return { aros: capas, capas: capas };
  };

  // ==============================================================================================
  // F08 · RAFAGA RADIAL
  // ==============================================================================================
  //
  // Rayos que salen disparados de un centro. Es un ACENTO: dura 8-12 cuadros y se va. Un rafagazo que
  // dura mas se lee como decoracion y envejece la pieza en un cuadro.
  //
  // COMO SE ARMA: los rayos son hijos de un nulo en el centro, cada uno con el ancla en SU PUNTA
  // INTERIOR. Con el ancla ahi, escalar de 0 a 100 dispara el rayo hacia afuera; con el ancla al centro
  // del lienzo (que es el defecto) el rayo crece para los dos lados y se ve como una barra que aparece.
  //
  // EL RETARDO ES 0 O 1. Con 0 es un impacto —todos a la vez— y con 1 es un barrido circular. Con 2 o
  // mas deja de leerse como una cosa y se leen N rayos, que es otro gesto y peor.
  //
  // EL PNG QUE ESPERA — `rayoPng`: el rayo APUNTANDO HACIA ARRIBA, con su punta interior tocando el
  // borde INFERIOR del lienzo y centrada horizontalmente. Todo el alto del lienzo es el largo del rayo.
  api.rafagaRadial = function (o) {
    o = o || {};
    var donde = "Gf.rafagaRadial";
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);
    var rayoPng = pedir(o, "rayoPng", donde);
    var largo = pedir(o, "largo", donde);        // largo dibujado del rayo, del centro hacia afuera
    var cuadro = pedir(o, "cuadro", donde);
    porDefecto(o, "n", 12);
    porDefecto(o, "dur", 10);
    porDefecto(o, "retardo", 0);
    porDefecto(o, "desdeAngulo", 0);
    porDefecto(o, "arco", 360);
    porDefecto(o, "radioInterno", 0);
    var z = o.z;

    if (o.n > 16) {
      throw new Error(donde + ": pediste " + o.n + " rayos y el techo es 16. Cada copia es una capa, " +
                      "un PNG y una textura: 40 copias son 40 rasterizaciones. Por arriba de 16 la " +
                      "rafaga se lee igual y el documento pesa el doble.");
    }
    if (o.retardo > 1) {
      throw new Error(donde + ": retardo " + o.retardo + ". En una rafaga el retardo es 0 (impacto) o " +
                      "1 (barrido); con 2 o mas se dejan de leer como una rafaga y se leen como " +
                      "rayos apareciendo de a uno, que es otro gesto — y mas pobre.");
    }
    if (o.dur < 4) {
      throw new Error(donde + ": dur " + o.dur + ". Por debajo de 4 cuadros el desvanecido del ultimo " +
                      "40% no tiene donde caer y las claves se pisan. El rango del oficio es 8-12.");
    }

    var esc = largo / altoNativo(rayoPng) * 100;
    revisarQ2Pico(rayoPng, o.nombre || "rafaga", esc);

    var centro = nulo((o.nombre || "rafaga") + "-centro", x, y, z);
    var capas = [];
    var i;
    var paso = (o.arco >= 360) ? (360 / o.n) : (o.arco / Math.max(1, o.n - 1));

    for (i = 0; i < o.n; i++) {
      var rayo = imagen(rayoPng, (o.nombre || "rafaga") + "-" + (i + 1), x, y, z, esc);
      capas[capas.length] = rayo;
      anclar(rayo, rayo.width / 2, rayo.height);
      // colgar PONE LAS ROTACIONES EN CERO, asi que el angulo del rayo va DESPUES de colgarlo. Al
      // reves, AE lo reescribe y todos los rayos salen apilados en el mismo angulo.
      var local = (z === undefined || z === null) ? [0, -o.radioInterno] : [0, -o.radioInterno, 0];
      G.colgar(rayo, centro, local);
      G.rotZ(rayo).setValue(o.desdeAngulo + i * paso);

      var f0 = cuadro + i * o.retardo;
      var f1 = f0 + o.dur;
      G.claves(G.esc(rayo), [
        [f0, tri(rayo, esc, 0, 100), "C1"],
        [f1, tri(rayo, esc, esc, 100)]
      ], donde + " (rayo " + (i + 1) + ")");
      // el desvanecido en el ultimo 40%: sin el, los rayos se quedan clavados y el acento se vuelve
      // decoracion
      var lop = [];
      empujar(lop, f0, 100, "LINEAL");
      empujar(lop, redondo(f0 + o.dur * 0.6), 100, "LINEAL");
      empujar(lop, f1 + Math.max(2, redondo(o.dur * 0.4)), 0, "LINEAL");
      G.claves(G.op(rayo), lop, donde + " (rayo " + (i + 1) + ", opacidad)");
    }

    G.anotar("F08|" + o.n + " rayos|paso " + (Math.round(paso * 10) / 10) + " grados|dur " + o.dur);
    return { centro: centro, rayos: capas, capas: capas };
  };

  // ==============================================================================================
  // F09 · GRILLA QUE SE ARMA
  // ==============================================================================================
  //
  // Una matriz de elementos que aparece en cascada. Dos decisiones hacen toda la diferencia:
  //
  //   · EL ESCALONADO VA EN DIAGONAL, `retardo = (fila + columna) * paso`. Por filas se lee como una
  //     lista que se va imprimiendo; en diagonal se lee como una ola que cruza la grilla. Cuesta lo
  //     mismo.
  //   · EL SOBREPASO SOLO SI SON POCAS. Con nueve celdas o menos, un 108% intermedio le da vida; con
  //     veinte celdas rebotando a destiempo la grilla se vuelve gelatina. Por eso se apaga solo.
  //
  // La visibilidad va por OPACIDAD y no por punto de entrada: una capa de forma con entrada tardia
  // puede rasterizar vacia (ley 7), y no se nota hasta el render.
  api.grillaQueSeArma = function (o) {
    o = o || {};
    var donde = "Gf.grillaQueSeArma";
    var x = pedir(o, "x", donde);              // centro de la grilla
    var y = pedir(o, "y", donde);
    var columnas = pedir(o, "columnas", donde);
    var filas = pedir(o, "filas", donde);
    var cuadro = pedir(o, "cuadro", donde);
    porDefecto(o, "dur", 12);
    porDefecto(o, "paso", 2);
    porDefecto(o, "ancho", 120);
    porDefecto(o, "alto", 120);
    porDefecto(o, "separacion", 24);
    var z = o.z;

    var celdas = columnas * filas;
    if (celdas > 36) {
      throw new Error(donde + ": " + celdas + " celdas (" + columnas + "x" + filas + ") y el techo es " +
                      "36. Una capa por celda es un PNG y una textura por celda; a partir de ahi el " +
                      "documento pesa mas que lo que agrega. Si necesitás una malla mas densa, es un " +
                      "PNG solo con la malla dibujada y un gesto de entrada unico.");
    }
    if (!o.archivo && !o.color) {
      throw new Error(donde + ": pasá `archivo` (un PNG de la celda) o `color` (y se hace un solido).");
    }

    var esc = 100;
    if (o.archivo) {
      esc = o.ancho / anchoNativo(o.archivo) * 100;
      revisarQ2Pico(o.archivo, o.nombre || "grilla", esc * 1.08);
    }
    var conSobrepaso = (celdas <= 9);
    var anchoTotal = columnas * o.ancho + (columnas - 1) * o.separacion;
    var altoTotal = filas * o.alto + (filas - 1) * o.separacion;

    var capas = [];
    var f, c;
    for (f = 0; f < filas; f++) {
      for (c = 0; c < columnas; c++) {
        var cx = x - anchoTotal / 2 + o.ancho / 2 + c * (o.ancho + o.separacion);
        var cy = y - altoTotal / 2 + o.alto / 2 + f * (o.alto + o.separacion);
        var nom = (o.nombre || "celda") + "-" + (f + 1) + "-" + (c + 1);
        var celda;
        if (o.archivo) { celda = imagen(o.archivo, nom, cx, cy, z, esc); }
        else { celda = solido(nom, o.color, Math.ceil(o.ancho), Math.ceil(o.alto), cx, cy, z); }
        capas[capas.length] = celda;

        var f0 = cuadro + (f + c) * o.paso;
        var base = G.esc(celda).value;
        var lista = [];
        empujar(lista, f0, escalaXY(celda, base, 0, 0), "C1");
        if (conSobrepaso) {
          empujar(lista, f0 + o.dur, escalaXY(celda, base, 1.08, 1.08), "C8");
          empujar(lista, f0 + o.dur + Math.max(3, redondo(o.dur * 0.45)), base, "LINEAL");
        } else {
          empujar(lista, f0 + o.dur, base, "LINEAL");
        }
        G.claves(G.esc(celda), lista, donde + " (" + nom + ")");
        // arranca apagada desde el cuadro 0 (ley 7). Si la primera celda entra justo en el cuadro 0,
        // `empujar` pisa la clave de apagado en vez de dejar dos claves en el mismo cuadro.
        var lop2 = [];
        empujar(lop2, 0, 0, "HOLD");
        empujar(lop2, f0, 100, "LINEAL");
        G.claves(G.op(celda), lop2, donde + " (" + nom + ", opacidad)");
      }
    }

    G.anotar("F09|" + columnas + "x" + filas + "|diagonal, paso " + o.paso +
             "|sobrepaso " + (conSobrepaso ? "si" : "no"));
    return { celdas: capas, capas: capas, sobrepaso: conSobrepaso };
  };

  // ==============================================================================================
  // F10 · ESPIRAL / ARREGLO GIRATORIO
  // ==============================================================================================
  //
  // N copias que giran y escalan a la vez. Es FONDO, no evento: 90 a 180 cuadros por vuelta y lineal.
  // Una espiral con ease se lee como que algo esta por pasar, y no pasa nada — es el fondo.
  //
  // EL EMPARENTADO HACE TODA LA MATEMATICA: las copias cuelgan de un nulo y el nulo gira. Lo unico que
  // hay que acordarse es que `G.colgar` pone las rotaciones del hijo en cero (porque AE se las
  // reescribe al emparentar), asi que el angulo propio de cada copia se pone DESPUES de colgarla.
  api.espiral = function (o) {
    o = o || {};
    var donde = "Gf.espiral";
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);
    var cuadro = pedir(o, "cuadro", donde);
    porDefecto(o, "n", 12);
    porDefecto(o, "radio", 120);
    porDefecto(o, "pasoRadio", 26);      // cuanto se aleja cada copia de la anterior
    porDefecto(o, "pasoAngulo", 32);     // grados entre copias
    porDefecto(o, "pasoEscala", 0.94);   // cada copia un poco mas chica
    porDefecto(o, "ciclo", 140);         // cuadros por vuelta
    porDefecto(o, "vueltas", 1);
    porDefecto(o, "sentido", 1);
    porDefecto(o, "ancho", 60);
    var z = o.z;

    if (o.n > 20) {
      throw new Error(donde + ": " + o.n + " copias. El techo practico es 20: son 20 capas y 20 " +
                      "texturas para un fondo que nadie mira de cerca.");
    }
    if (!o.archivo && !o.color) {
      throw new Error(donde + ": pasá `archivo` (PNG) o `color` (y se hace un solido).");
    }

    var esc0 = 100;
    if (o.archivo) { esc0 = o.ancho / anchoNativo(o.archivo) * 100; }
    var eje = nulo((o.nombre || "espiral") + "-eje", x, y, z);
    var capas = [];
    var i;
    for (i = 0; i < o.n; i++) {
      var ang = i * o.pasoAngulo * Math.PI / 180;
      var r = o.radio + i * o.pasoRadio;
      var k = Math.pow(o.pasoEscala, i);
      var nom = (o.nombre || "espiral") + "-" + (i + 1);
      var copia;
      if (o.archivo) { copia = imagen(o.archivo, nom, x, y, z, esc0 * k); }
      else {
        copia = solido(nom, o.color, Math.ceil(o.ancho), Math.ceil(o.alto || o.ancho), x, y, z);
        G.esc(copia).setValue(tri(copia, 100 * k, 100 * k, 100));
      }
      capas[capas.length] = copia;
      // las 12 en punto son -Y en AE, y el angulo crece en sentido horario: asi coincide con lo que
      // hace `rotZ` y no hay que pensarlo dos veces
      var lx = r * Math.sin(ang), ly = -r * Math.cos(ang);
      G.colgar(copia, eje, (z === undefined || z === null) ? [lx, ly] : [lx, ly, 0]);
      G.rotZ(copia).setValue(i * o.pasoAngulo);
    }

    var vueltas = Math.max(1, Math.round(o.vueltas));
    G.claves(G.rotZ(eje), [
      [cuadro, 0, "LINEAL"],
      [cuadro + o.ciclo * vueltas, 360 * vueltas * (o.sentido < 0 ? -1 : 1)]
    ], donde);

    G.anotar("F10|" + o.n + " copias|ciclo " + o.ciclo + "|" + vueltas + " vueltas");
    return { eje: eje, copias: capas, capas: capas };
  };

  // ==============================================================================================
  // F11 · BORDE QUE HIERVE (boil)
  // ==============================================================================================
  //
  // El contorno tiembla como dibujo a mano. Y no es una aproximacion de nada: ES como se hace en
  // animacion 2D de verdad — tres dibujos del mismo trazo alternandose a 10-12 por segundo. Que
  // nosotros tengamos que hornear los tres estados no nos aleja de la tecnica, nos deja adentro.
  //
  // El ojo no puede seguir tres estados a 12 Hz, asi que tres alcanzan y cuatro no agregan nada.
  // Alternar cada 2 o 3 cuadros; a cada cuadro se vuelve ruido y a cada 5 se ven los tres dibujos.
  //
  // Las tres capas viven desde el cuadro 0 y la visibilidad la lleva la OPACIDAD con claves HOLD
  // (ley 7). Y HOLD, no lineal: una rampa haria que dos estados se vean superpuestos, que es doble
  // exposicion y se lee como un error de render.
  //
  // LOS PNG QUE ESPERA — `archivos`: TRES PNG de la misma forma, del mismo tamano y con el mismo
  // registro (el mismo lienzo, la forma en el mismo lugar), rasterizados con tres semillas distintas
  // del Roughen / Wiggle Paths de AE. Si el registro no coincide, el hervor se convierte en un temblor
  // de posicion y se nota.
  api.bordeQueHierve = function (o) {
    o = o || {};
    var donde = "Gf.bordeQueHierve";
    var archivos = pedir(o, "archivos", donde);
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);
    porDefecto(o, "cada", 3);
    porDefecto(o, "desde", 0);
    porDefecto(o, "hasta", G.cuadros());
    porDefecto(o, "escala", 100);
    var z = o.z;

    if (archivos.length < 2) {
      throw new Error(donde + ": el hervor necesita al menos dos estados; con tres es el estandar del " +
                      "oficio. Llego " + archivos.length + ".");
    }
    if (o.cada < 2) {
      throw new Error(donde + ": alternar cada " + o.cada + " cuadro(s) da 30 estados por segundo y " +
                      "eso no se lee como dibujo a mano: se lee como ruido. El rango util es 2-3 " +
                      "cuadros (10-15 por segundo).");
    }

    var capas = [], i, cu;
    for (i = 0; i < archivos.length; i++) {
      revisarQ2Pico(archivos[i], (o.nombre || "hervor") + "-" + (i + 1), o.escala);
      var c = imagen(archivos[i], (o.nombre || "hervor") + "-" + (i + 1), x, y, z, o.escala);
      capas[capas.length] = c;
    }
    for (i = 0; i < capas.length; i++) {
      var lista = [];
      empujar(lista, 0, 0, "HOLD");
      for (cu = o.desde; cu <= o.hasta; cu += o.cada) {
        var turno = (Math.floor((cu - o.desde) / o.cada) % capas.length) === i;
        empujar(lista, cu, turno ? 100 : 0, "HOLD");
      }
      if (o.hasta + 1 <= G.cuadros()) { empujar(lista, o.hasta + 1, 0, "HOLD"); }
      G.claves(G.op(capas[i]), lista, donde + " (estado " + (i + 1) + ")");
    }

    G.anotar("F11|" + archivos.length + " estados|cada " + o.cada + " cuadros|" +
             (o.desde) + "-" + (o.hasta));
    return { estados: capas, capas: capas };
  };

  // ==============================================================================================
  // F12 · SQUASH & STRETCH
  // ==============================================================================================
  //
  // El objeto se alarga al moverse y se achata al frenar. Es la lectura de "esto tiene peso y es
  // blando", y es tambien el sustituto legitimo del pucker & bloat, que exigiria deformar el trazado.
  //
  // DOS COSAS QUE LO ARRUINAN Y NO DAN ERROR:
  //   · EL ANCLA AL CENTRO. Un objeto que aterriza se aplasta DESDE EL PISO: con el ancla al centro se
  //     hunde la mitad del aplastamiento en el suelo y la otra mitad flota. Por eso `contacto` es
  //     obligatorio y lo primero que hace la funcion es mover el ancla ahi.
  //   · NO CONSERVAR EL VOLUMEN. Estirar 12% en Y y dejar X en 100 se lee como que el objeto CRECIO.
  //     Aca el otro eje sale de 1/k, que es la conservacion exacta: 112 en un eje son 89,3 en el otro.
  api.aplastarYEstirar = function (o) {
    o = o || {};
    var donde = "Gf.aplastarYEstirar";
    var capa = pedir(o, "capa", donde);
    var impacto = pedir(o, "cuadroImpacto", donde);
    porDefecto(o, "magnitud", 0.12);
    porDefecto(o, "eje", "y");            // eje del movimiento: "y" para una caida, "x" para un tiro
    porDefecto(o, "contacto", "abajo");
    porDefecto(o, "estirar", 3);
    porDefecto(o, "aplastar", 2);
    porDefecto(o, "volver", 6);

    if (o.magnitud > 0.35) {
      throw new Error(donde + ": magnitud " + o.magnitud + ". Por arriba de 0,35 deja de leerse como " +
                      "peso y se lee como goma — y una vez que la pieza parece de goma, lo parece " +
                      "entera. El rango del oficio es 0,08-0,20 en objetos y 0,03-0,07 en paneles.");
    }
    if (o.magnitud > 0.22) {
      G.avisar(donde + " en '" + capa.name + "': magnitud " + o.magnitud + " esta por arriba del rango " +
               "de objetos (0,08-0,20). Miralo en el cuadro del impacto antes de dejarlo.");
    }
    if (o.aplastar >= o.volver) {
      G.avisar(donde + " en '" + capa.name + "': aplastar " + o.aplastar + " y volver " + o.volver +
               ". La vuelta tiene que ser bastante mas larga que la ida (2 contra 6): esa asimetria ES " +
               "el gesto; simetrico se lee como un parpadeo.");
    }

    var a = anclaDeBorde(capa, o.contacto, donde);
    anclarQuieto(capa, a[0], a[1], donde);
    var base = G.esc(capa).value;
    var k = 1 + o.magnitud;

    var estirado, aplastado;
    if (o.eje === "y") {
      estirado = escalaXY(capa, base, 1 / k, k);
      aplastado = escalaXY(capa, base, k, 1 / k);
    } else {
      estirado = escalaXY(capa, base, k, 1 / k);
      aplastado = escalaXY(capa, base, 1 / k, k);
    }

    var lista = [];
    empujar(lista, impacto - o.estirar, base, "C1");
    empujar(lista, impacto, estirado, "C7");
    empujar(lista, impacto + o.aplastar, aplastado, "C8");
    empujar(lista, impacto + o.aplastar + o.volver, base, "LINEAL");
    G.claves(G.esc(capa), lista, donde + " (" + capa.name + ")");

    G.anotar("F12|" + capa.name + "|impacto " + impacto + "|magnitud " + o.magnitud +
             "|ancla " + o.contacto);
    return { capa: capa, capas: [capa] };
  };

  // ==============================================================================================
  // F13 · FALSO EXTRUIDO
  // ==============================================================================================
  //
  // Un objeto plano parece tener espesor: N copias separadas 1 unidad en Z, las de atras mas oscuras,
  // todas colgadas de la delantera. Cuando el conjunto gira un poco, el ojo lee un solido.
  //
  // EL LIMITE ES DURO Y ES DE APILADO, NO DE GUSTO. El motor no ordena por profundidad: dibuja en el
  // orden de la lista de capas (depthTest apagado). Mientras el orden de apilado coincida con el orden
  // por Z visto desde la camara, AE y el motor dan lo mismo. Al pasar el perfil, AE reordena por
  // profundidad y el motor NO — y el objeto se da vuelta solo en el motor y no en AE. Por eso el giro
  // se limita a +-35 grados, que es justo el rango donde la extrusion se ve.
  //
  // NO SE PUEDE OSCURECER UN PNG SIN EFECTOS. Si las rodajas son un PNG, hace falta un segundo PNG con
  // la misma silueta en el tono oscuro; si son solidos, el tono sale de la cuenta. La funcion lo exige
  // en vez de dibujar dieciseis copias del mismo color, que se ven como un borron y no como espesor.
  api.falsoExtruido = function (o) {
    o = o || {};
    var donde = "Gf.falsoExtruido";
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);
    porDefecto(o, "rodajas", 10);
    porDefecto(o, "paso", 1);            // unidades de Z entre rodajas
    porDefecto(o, "oscuro", 0.55);
    porDefecto(o, "giro", 0);
    porDefecto(o, "dur", 24);
    porDefecto(o, "curva", "C6");
    porDefecto(o, "z", 0);
    var z = o.z;

    if (o.rodajas > 16) {
      throw new Error(donde + ": " + o.rodajas + " rodajas y el techo es 16. Cada rodaja es una capa y " +
                      "una textura; y con 16 a un paso de 1 unidad el espesor ya se lee entero.");
    }
    if (Math.abs(o.giro) > 35) {
      throw new Error(donde + ": giro de " + o.giro + " grados. El techo son 35 y el motivo no es " +
                      "estetico: el motor dibuja por orden de apilado, no por profundidad. Pasado el " +
                      "perfil, AE reordena las rodajas por Z y el motor no, asi que el objeto se da " +
                      "vuelta en el motor y en AE no — y la diferencia no la caza ninguna compuerta de " +
                      "documento. Si el guion pide una vuelta entera, es un corte (una sale, otra " +
                      "entra, mismo cuadro), no un giro.");
    }
    if (o.archivo && !o.archivoLado) {
      throw new Error(donde + ": pasaste `archivo` pero no `archivoLado`. Sin efectos no hay forma de " +
                      "oscurecer un PNG, y dieciseis copias del mismo tono no se ven como espesor: se " +
                      "ven como un borron. Pasá un segundo PNG con la MISMA silueta y el mismo " +
                      "registro, en el tono oscuro del canto.");
    }
    if (!o.archivo && !o.color) {
      throw new Error(donde + ": pasá `archivo` + `archivoLado` (PNG) o `color` + `ancho`/`alto` " +
                      "(solidos).");
    }

    var capas = [];
    var i;
    var esc = 100;
    if (o.archivo) { esc = (o.ancho ? (o.ancho / anchoNativo(o.archivo) * 100) : 100); }

    // DE ATRAS HACIA ADELANTE, a proposito: cada capa nueva entra arriba del apilado, asi que creando
    // la mas lejana primero el orden de la lista queda igual al orden por Z. Es la ley 1 cumplida por
    // construccion en vez de por revision.
    for (i = o.rodajas; i >= 1; i--) {
      var nom = (o.nombre || "extruido") + "-canto-" + i;
      var zi = z + i * o.paso;
      var rodaja;
      if (o.archivo) { rodaja = imagen(o.archivoLado, nom, x, y, zi, esc); }
      else {
        var k = 1 - (1 - o.oscuro) * (i / o.rodajas);
        rodaja = solido(nom, oscurecer(o.color, k), Math.ceil(o.ancho), Math.ceil(o.alto), x, y, zi);
      }
      capas[capas.length] = rodaja;
    }
    var frente;
    if (o.archivo) { frente = imagen(o.archivo, (o.nombre || "extruido") + "-frente", x, y, z, esc); }
    else {
      frente = solido((o.nombre || "extruido") + "-frente", o.color,
                      Math.ceil(o.ancho), Math.ceil(o.alto), x, y, z);
    }
    for (i = 0; i < capas.length; i++) {
      // colgar ANTES de animar el giro del padre: si el padre ya esta girado, AE le escribe al hijo el
      // angulo contrario para conservarlo en el mundo, y la rodaja sale de perfil
      G.colgar(capas[i], frente, [0, 0, (o.rodajas - i) * o.paso]);
    }
    capas[capas.length] = frente;

    if (o.giro !== 0) {
      var cuadroGiro = pedir(o, "cuadro", donde);
      var lg = [];
      empujar(lg, cuadroGiro, 0, o.curva);
      empujar(lg, cuadroGiro + o.dur, o.giro, "LINEAL");
      G.claves(G.rotY(frente), lg, donde + " (giro)");
    }

    G.anotar("F13|" + o.rodajas + " rodajas|paso " + o.paso + "|giro " + o.giro + " grados");
    return { frente: frente, rodajas: capas, capas: capas };
  };

  // ==============================================================================================
  // F14 · PANEL ELASTICO (nine-slice, y su caso de tres)
  // ==============================================================================================
  //
  // Un panel con esquinas redondeadas que cambia de tamano SIN que se le deformen las esquinas. Es el
  // primer defecto que aparece en cuanto algo crece, y casi nadie lo nombra: escalar un rectangulo
  // redondeado rasterizado estira el radio y las esquinas quedan ovaladas. Se ve al primer cuadro.
  //
  // DOS MODOS, y el segundo es un caso particular del primero:
  //   · "nueve"   — cambia de ancho Y de alto: cuatro esquinas de tamano fijo, cuatro bordes que
  //                 escalan en un solo eje, y un centro que escala en los dos. Nueve capas.
  //   · "pildora" — solo cambia de ancho y las puntas son semicirculos: DOS TAPAS QUE SE SEPARAN y una
  //                 barra lisa entre ellas. Tres capas, el radio intacto siempre, y ninguna esquina
  //                 que se pueda aplastar porque no hay esquina. Medido en la referencia: una pildora
  //                 que va de 342 a 1533 de ancho es 4,48x — a esa escala el ovalo es evidente.
  //
  // El modo "auto" elige: si el alto no cambia y el radio es la mitad del alto, es una pildora.
  //
  // Y SI EL PANEL NO CAMBIA DE TAMANO, ESTO NO ES LO QUE NECESITAS: es UN PNG y una capa. Nueve capas
  // para dibujar un rectangulo quieto es pagar nueve rasterizaciones por nada. Por eso pide dos
  // estados como minimo y tira si le das uno.
  //
  // LOS PNG QUE ESPERA:
  //   "nueve"   — `esquinaPng`: la esquina SUPERIOR IZQUIERDA sola, lienzo CUADRADO de lado = radio,
  //               con el arco tocando los bordes superior e izquierdo y el relleno hacia abajo-derecha.
  //               Las otras tres esquinas son ESTE MISMO PNG girado 90, 180 y 270 grados, que es exacto
  //               porque son multiplos de 90.
  //   "pildora" — `tapaPng`: circulo relleno del color del panel, diametro = alto del panel.
  api.panelElastico = function (o) {
    o = o || {};
    var donde = "Gf.panelElastico";
    var x = pedir(o, "x", donde);
    var y = pedir(o, "y", donde);
    var color = pedir(o, "color", donde);
    var estados = pedir(o, "estados", donde);      // [[cuadro, ancho, alto, curva?], ...]
    porDefecto(o, "modo", "auto");
    porDefecto(o, "curva", "C2");
    var z = o.z;
    var i, j;

    if (estados.length < 2) {
      throw new Error(donde + ": llego " + estados.length + " estado. Un panel que NO cambia de " +
                      "tamano es UN PNG y UNA capa; armarlo con tres o nueve es pagar rasterizaciones " +
                      "por nada. Esta funcion es para el panel que crece.");
    }
    var altoFijo = true, anchoMax = 0, altoMax = 0;
    for (i = 0; i < estados.length; i++) {
      if (i > 0 && estados[i][0] <= estados[i - 1][0]) {
        throw new Error(donde + ": los estados van en orden de cuadro y llegaron " +
                        estados[i - 1][0] + " -> " + estados[i][0] + ".");
      }
      if (estados[i][2] !== estados[0][2]) { altoFijo = false; }
      if (estados[i][1] > anchoMax) { anchoMax = estados[i][1]; }
      if (estados[i][2] > altoMax) { altoMax = estados[i][2]; }
    }
    var radio = (o.radio === undefined || o.radio === null) ? estados[0][2] / 2 : o.radio;
    var modo = o.modo;
    if (modo === "auto") { modo = (altoFijo && radio >= estados[0][2] / 2 - 0.001) ? "pildora" : "nueve"; }

    for (i = 0; i < estados.length; i++) {
      if (estados[i][1] < 2 * radio || estados[i][2] < 2 * radio) {
        throw new Error(donde + ": el estado del cuadro " + estados[i][0] + " mide " + estados[i][1] +
                        "x" + estados[i][2] + " y el radio es " + radio + ". Ningun lado puede ser " +
                        "menor que dos radios: las esquinas se pisarian entre si.");
      }
    }
    // el mayor de los estados es el que se rasteriza a tamano real y del que salen todas las escalas;
    // si su lado util diera cero, cada fraccion seria una division por cero y las capas saldrian con
    // escala NaN — que en AE es una capa invisible, sin error y sin pista de por que
    if (anchoMax <= 2 * radio + 0.001) {
      throw new Error(donde + ": el ancho mayor es " + anchoMax + " y dos radios son " + (2 * radio) +
                      ". No queda nada de tramo recto: eso ya no es un panel, es un circulo. Bajá el " +
                      "radio o subí el ancho.");
    }
    if (modo === "nueve" && altoMax <= 2 * radio + 0.001) {
      throw new Error(donde + ": el alto mayor es " + altoMax + " y dos radios son " + (2 * radio) +
                      ". Sin tramo recto vertical no hay nueve rodajas; si las puntas son " +
                      "semicirculos y el alto no cambia, esto es una pildora — pedí `modo: 'pildora'`.");
    }

    function curvaDe(e) { return (e.length > 3 && e[3]) ? e[3] : o.curva; }

    var capas = [];

    // ------------------------------------------------------------------ PILDORA: dos tapas y una barra
    if (modo === "pildora") {
      if (!altoFijo) {
        throw new Error(donde + ": en modo pildora el alto no puede cambiar, y los estados lo cambian " +
                        "(" + estados[0][2] + " -> " + estados[estados.length - 1][2] + "). Una " +
                        "pildora que cambia de alto ya no es una pildora: pedí `modo: 'nueve'`.");
      }
      var tapaPng = pedir(o, "tapaPng", donde);
      var alto = estados[0][2];
      var escTapa = alto / anchoNativo(tapaPng) * 100;
      revisarQ2Pico(tapaPng, (o.nombre || "pildora") + " (tapa)", escTapa);

      var tapaI = imagen(tapaPng, (o.nombre || "pildora") + "-tapa-izq",
                         x - estados[0][1] / 2 + radio, y, z, escTapa);
      var tapaD = imagen(tapaPng, (o.nombre || "pildora") + "-tapa-der",
                         x + estados[0][1] / 2 - radio, y, z, escTapa);
      // la barra ARRIBA de las tapas: asi les cubre la mitad interior y no se ve la junta de los dos
      // bordes suavizados sumandose
      var barra = solido((o.nombre || "pildora") + "-barra", color,
                         Math.ceil(anchoMax - 2 * radio), Math.ceil(alto), x, y, z);
      capas[capas.length] = tapaI; capas[capas.length] = tapaD; capas[capas.length] = barra;

      var baseB = G.esc(barra).value;
      var lI = [], lD = [], lB = [];
      var ejI = G.ejes(tapaI), ejD = G.ejes(tapaD);
      for (i = 0; i < estados.length; i++) {
        var cu = estados[i][0], an = estados[i][1], cv = curvaDe(estados[i]);
        empujar(lI, cu, x - an / 2 + radio, cv);
        empujar(lD, cu, x + an / 2 - radio, cv);
        empujar(lB, cu, escalaEje(barra, baseB, "x", (an - 2 * radio) / (anchoMax - 2 * radio)), cv);
      }
      G.claves(ejI.x, lI, donde + " (tapa izquierda)");
      G.claves(ejD.x, lD, donde + " (tapa derecha)");
      G.claves(G.esc(barra), lB, donde + " (barra)");

      G.anotar("F14|pildora|3 capas|" + estados[0][1] + " -> " + estados[estados.length - 1][1]);
      return { modo: "pildora", tapaIzq: tapaI, tapaDer: tapaD, barra: barra, capas: capas };
    }

    // ------------------------------------------------------------------ NUEVE RODAJAS
    var esquinaPng = pedir(o, "esquinaPng", donde);
    var escEsq = radio / anchoNativo(esquinaPng) * 100;
    revisarQ2Pico(esquinaPng, (o.nombre || "panel") + " (esquina)", escEsq);
    var eje0 = nulo((o.nombre || "panel") + "-eje", x, y, z);

    var w0 = estados[0][1], h0 = estados[0][2];
    var nom2 = o.nombre || "panel";
    var centro = solido(nom2 + "-centro", color, Math.ceil(anchoMax - 2 * radio),
                        Math.ceil(altoMax - 2 * radio), x, y, z);
    var arriba = solido(nom2 + "-borde-arriba", color, Math.ceil(anchoMax - 2 * radio),
                        Math.ceil(radio), x, y, z);
    var abajo = solido(nom2 + "-borde-abajo", color, Math.ceil(anchoMax - 2 * radio),
                       Math.ceil(radio), x, y, z);
    var izq = solido(nom2 + "-borde-izq", color, Math.ceil(radio),
                     Math.ceil(altoMax - 2 * radio), x, y, z);
    var der = solido(nom2 + "-borde-der", color, Math.ceil(radio),
                     Math.ceil(altoMax - 2 * radio), x, y, z);

    // el ancla de cada borde: centrada en el eje que escala y pegada al borde INTERIOR en el otro. Lo
    // segundo no ahorra animar la posicion —hay que animarla igual, porque el borde del panel se
    // mueve— pero deja el grosor del marco clavado hacia afuera, que es lo que se ve si se corre.
    anclar(centro, centro.width / 2, centro.height / 2);
    anclar(arriba, arriba.width / 2, arriba.height);
    anclar(abajo, abajo.width / 2, 0);
    anclar(izq, izq.width, izq.height / 2);
    anclar(der, 0, der.height / 2);

    var esq = [];
    var giros = [0, 90, 180, 270];
    var nombres = ["si", "sd", "id", "ii"];
    for (i = 0; i < 4; i++) {
      var e = imagen(esquinaPng, nom2 + "-esquina-" + nombres[i], x, y, z, escEsq);
      // el ancla en SU esquina exterior: girando el mismo PNG en multiplos de 90 alrededor de ese
      // punto, las cuatro caen exactas y no hace falta un PNG por esquina
      anclar(e, 0, 0);
      esq[esq.length] = e;
    }

    var todas = [centro, arriba, abajo, izq, der, esq[0], esq[1], esq[2], esq[3]];
    for (i = 0; i < todas.length; i++) {
      G.colgar(todas[i], eje0, (z === undefined || z === null) ? [0, 0] : [0, 0, 0]);
      capas[capas.length] = todas[i];
    }
    for (i = 0; i < 4; i++) { G.rotZ(esq[i]).setValue(giros[i]); }

    var baseC = G.esc(centro).value;
    var baseA = G.esc(arriba).value;
    var baseI = G.esc(izq).value;
    var lC = [], lA = [], lAb = [], lIz = [], lDe = [], lPa = [], lPab = [], lPi = [], lPd = [];
    var lE = [[], [], [], []];
    for (i = 0; i < estados.length; i++) {
      var f = estados[i][0], W = estados[i][1], H = estados[i][2], c2 = curvaDe(estados[i]);
      empujar(lC, f, escalaXY(centro, baseC, (W - 2 * radio) / (anchoMax - 2 * radio),
                              (H - 2 * radio) / (altoMax - 2 * radio)), c2);
      empujar(lA, f, escalaEje(arriba, baseA, "x", (W - 2 * radio) / (anchoMax - 2 * radio)), c2);
      empujar(lAb, f, escalaEje(abajo, baseA, "x", (W - 2 * radio) / (anchoMax - 2 * radio)), c2);
      empujar(lIz, f, escalaEje(izq, baseI, "y", (H - 2 * radio) / (altoMax - 2 * radio)), c2);
      empujar(lDe, f, escalaEje(der, baseI, "y", (H - 2 * radio) / (altoMax - 2 * radio)), c2);
      empujar(lPa, f, tri(arriba, 0, -H / 2 + radio, 0), c2);
      empujar(lPab, f, tri(abajo, 0, H / 2 - radio, 0), c2);
      empujar(lPi, f, tri(izq, -W / 2 + radio, 0, 0), c2);
      empujar(lPd, f, tri(der, W / 2 - radio, 0, 0), c2);
      empujar(lE[0], f, tri(esq[0], -W / 2, -H / 2, 0), c2);
      empujar(lE[1], f, tri(esq[1], W / 2, -H / 2, 0), c2);
      empujar(lE[2], f, tri(esq[2], W / 2, H / 2, 0), c2);
      empujar(lE[3], f, tri(esq[3], -W / 2, H / 2, 0), c2);
    }
    G.claves(G.esc(centro), lC, donde + " (centro)");
    G.claves(G.esc(arriba), lA, donde + " (borde arriba)");
    G.claves(G.esc(abajo), lAb, donde + " (borde abajo)");
    G.claves(G.esc(izq), lIz, donde + " (borde izquierda)");
    G.claves(G.esc(der), lDe, donde + " (borde derecha)");
    G.claves(G.pos(arriba), lPa, donde + " (pos arriba)");
    G.claves(G.pos(abajo), lPab, donde + " (pos abajo)");
    G.claves(G.pos(izq), lPi, donde + " (pos izquierda)");
    G.claves(G.pos(der), lPd, donde + " (pos derecha)");
    for (i = 0; i < 4; i++) { G.claves(G.pos(esq[i]), lE[i], donde + " (esquina " + nombres[i] + ")"); }

    G.anotar("F14|nueve|" + w0 + "x" + h0 + " -> " + estados[estados.length - 1][1] + "x" +
             estados[estados.length - 1][2] + "|radio " + radio);
    return { modo: "nueve", eje: eje0, centro: centro, bordes: [arriba, abajo, izq, der],
             esquinas: esq, capas: capas };
  };

  return api;
})();
