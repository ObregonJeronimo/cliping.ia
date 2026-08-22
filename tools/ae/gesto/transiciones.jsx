// ================================================================================================
// GESTO · FAMILIA X — LAS TRANSICIONES
// ================================================================================================
//
// QUE ES ESTA FAMILIA. Como se pasa de una cosa a la siguiente. Doce tecnicas, X01 a X12, todas
// escritas contra la cadena real del proyecto: transformaciones, emparentado, apilado, solidos, PNG
// rasterizados, camara 3D y obturador. Nada de efectos, mascaras, matas ni modos de fusion — salvo
// Anadir, que si viaja y es la familia de la luz.
//
// LA REGLA DE DISENO DEL MODULO, y sale de una medicion, no de un gusto: en los ocho avisos de
// referencia la transicion es SIEMPRE un objeto que ya estaba en escena, y 0 de 8 usan cortinilla
// generica. O sea que el barrido de tapa suelto (X01) es la excepcion y no el idioma. El idioma es
// X03 (algo cruza), X11 (dos cosas ocupan el mismo lugar) y X12 (mientras algo tapa, atras cambio).
// Por eso X01 y X02 son los mas cortos del archivo y X11 y X12 los que traen la aritmetica.
//
// LAS TRES LEYES QUE ESTE MODULO HACE CUMPLIR SOLO, y que no hay que acordarse:
//
//   (1) UNA TAPA 3D NO PUEDE TAPAR UNA CAPA 2D. NUNCA, y no depende del apilado. Es la LEY 2 del
//       motor: `comp3d.html:446-453` dibuja todas las 2D despues de todo el mundo 3D. Se tira.
//   (2) LA TAPA VA ARRIBA EN EL APILADO Y UNA UNIDAD MAS CERCA. La LEY 1 dice que la Z no ocluye
//       nunca y que manda el orden de la lista, asi que la tapa tiene que ganar por apilado; y el
//       criterio de Z apunta al mismo lado, para que AE y el motor coincidan por partida doble. La Z
//       la CALCULA este modulo (min z de lo tapado, menos 1) en vez de pedirtela.
//   (3) LA TAPA SE CREA DESPUES DEL CONTENIDO. Una capa nueva nace en el indice 1: si construis el
//       contenido despues de la tapa, el contenido queda arriba y la tapa no tapa nada, sin un solo
//       error. Eso NO se puede ver al construir la tapa. Por eso cada funcion registra el par
//       (tapa, contenido) y hay que llamar a `Gx.revisar()` justo antes de `G.cerrar()`.
//
// USO
//   G.iniciar({...});  ...construir el contenido...
//   var b = Gx.objetoQueBarre({ desde: 100, hasta: 110, color: [0.9,0.2,0.2], ancho: 2600 });
//   Gx.sustitucionBajoTapa({ cobertura: b.cobertura, cuadro: b.cuadroDeCambio,
//                            sale: [panelViejo], entra: [panelNuevo] });
//   Gx.revisar();
//   G.cerrar();
//
// Toda funcion toma UN objeto de opciones, tiene los valores por defecto adentro, y devuelve las capas
// que creo mas los numeros que calculo. Los que empiezan con `cobertura` son la ventana de cuadros en
// que esa tapa tapa de verdad, y estan pensados para pasarselos a X12 sin tocarlos.
//
//   X01  barridoPorTapa          la tapa invisible que cruza. Exige fondo plano.
//   X02  tapaVisible             el bloque de color. Sobre cualquier fondo.
//   X03  objetoQueBarre          algo con personalidad cruza y atras cambio todo.
//   X04  ventanaDeCuatroTapas    una mascara rectangular animada, hecha con cuatro solidos y un nulo.
//   X05  irisConDona             el agujero que se abre o se cierra. Tiene un limite y lo calcula.
//        irisDeDisco             el reemplazo cuando el iris tiene que cerrar hasta cero.
//   X06  telonOPersiana          dos hojas, o N franjas escalonadas.
//   X07  latigazo                el unico que cuesta plata: obliga a obturador en toda la pieza.
//   X08  volteoDeTarjetaDosCaras TIRA · reemplazo: volteoAlPerfil
//   X09  atravesar               TIRA · reemplazo: atravesarPorCorte
//   X10  destello                el corte que se acentua en vez de disimularse.
//   X11  matchCut                la aritmetica de que dos cosas ocupen el mismo lugar. Con medirCaja
//                                y encajar, que tambien sirven sueltas.
//   X12  sustitucionBajoTapa     no hubo corte, pero cambio.
//        revisar                 la compuerta de apilado. Va antes de G.cerrar().
//
// LAS DOS QUE NO SE PUEDEN Y TIRAN: X08 (volteo con dos caras) y X09 (atravesar). Las dos por la
// misma razon —la Z no ocluye— y las dos con su reemplazo construido al lado, con otro nombre, para
// que nadie tenga que elegir a ojo: `volteoAlPerfil` y `atravesarPorCorte`.
//
// LOS RECURSOS QUE HACEN FALTA: ninguno, salvo los dos iris. `irisConDona` pide un PNG cuadrado del
// color del fondo con un agujero circular centrado (y hay que decirle `razon`, el diametro del agujero
// dividido el ancho del archivo); `irisDeDisco` pide un PNG cuadrado con un circulo relleno centrado
// que toca los cuatro bordes, del color del mundo que viene. Los dos, opacos y sin borde suave: el
// motor no tiene degradados ni desenfoque por capa, asi que lo blando va horneado o no existe.
//
// LO QUE ESTE MODULO NO USA A PROPOSITO. El exportador HOY ya lleva mascaras (trazado muestreado
// cuadro por cuadro) y un matte de pista rectangular para el caso coplanar sin girar. Con eso, varios
// de estos gestos dejarian de depender de fondo plano. No lo uso porque el plan consolidado todavia
// los da por NOSOP y porque una tapa cuesta cero maquinaria nueva: cuando alguien mida el matte contra
// un cuadro de AE, X04 es la primera que se reescribe. Lo dejo escrito para que se sepa que la
// decision es una decision y no un olvido.
//
// ================================================================================================

var Gx = (function () {

  var api = {};

  // ==============================================================================================
  // UTILES INTERNOS
  // ==============================================================================================

  function un(v) { return Math.round(v * 10) / 10; }

  // Toda funcion de este archivo acepta una capa suelta o un arreglo de capas, porque la mitad de las
  // veces se tapa una y la mitad seis. Y no alcanza con `instanceof Array`: se comprueba tambien por
  // forma (tiene `length` y no tiene `property`), porque un arreglo que cruzo un contexto distinto
  // deja de ser `instanceof Array` y ahi la lista entera se trataria como UNA capa — que despues falla
  // como "'undefined' es 2D", o sea acusando a cualquier cosa menos a la causa.
  function comoLista(x) {
    if (x === undefined || x === null) { return []; }
    if (x instanceof Array) { return x; }
    if (typeof x.length === "number" && typeof x.property !== "function") { return x; }
    var u = []; u[0] = x; return u;
  }

  // LA C5 DEL PLAN ES LA LINEAL DEL NUCLEO, y confundirlas tira con un mensaje que no explica nada.
  // El plan numera ocho curvas C1..C8 y la C5 (deriva, influencia 0/0) es exactamente la lineal; el
  // nucleo no la llama C5 porque su tabla salio del disector, donde la lineal es el DEFECTO. Traducir
  // aca cuesta tres lineas y evita un "curva desconocida: C5" en medio de una pieza.
  function curva(nom, donde) {
    if (nom === undefined || nom === null) { return "LINEAL"; }
    if (nom === "C5") { return "LINEAL"; }
    if (nom === "LINEAL" || nom === "HOLD") { return nom; }
    if (!G.CURVAS[nom]) {
      throw new Error(donde + ": curva desconocida '" + nom + "'. El nucleo tiene LINEAL, SUAVE, C1, " +
                      "C2, C3, C4, C6, C7, C8 y HOLD. La C5 del plan (deriva 0/0) ES la LINEAL; " +
                      "escrita como C5 pelada tiraria, asi que se traduce sola.");
    }
    return nom;
  }

  function entero(v, nombre, donde) {
    if (v === undefined || v === null) {
      throw new Error(donde + ": falta `" + nombre + "` (un cuadro)");
    }
    if (Math.abs(v - Math.round(v)) > 1e-9) {
      throw new Error(donde + ": `" + nombre + "` = " + v + " no es un cuadro entero. Con cuantizacion " +
                      "temporal una clave fraccionaria se redondea impredeciblemente y el golpe cae " +
                      "donde no era.");
    }
    return Math.round(v);
  }

  // Un tramo de cero cuadros no es un tramo. Sin esto, el nucleo tira "claves fuera de orden" —
  // correcto, pero apuntando a la clave y no a la opcion que la genero, que es lo que hay que corregir.
  function positivo(v, nombre, donde) {
    if (v < 1) {
      throw new Error(donde + ": `" + nombre + "` = " + v + " cuadros. Un tramo de cero cuadros deja dos " +
                      "claves en el mismo lugar, y AE pisa la anterior en silencio: el gesto desaparece " +
                      "sin error. El minimo es 1.");
    }
    return v;
  }

  // Las duraciones del catalogo estan MEDIDAS, pero salirse de la banda no es un defecto: es que el
  // gesto cambia de nombre (un latigazo de 20 cuadros es una panoramica). Aviso, no tiro.
  function ritmo(dur, min, max, que, donde) {
    if (dur < min || dur > max) {
      G.avisar(donde + ": " + que + " dura " + dur + " cuadros y el catalogo mide " + min + "-" + max +
               ". Fuera de esa banda el gesto se lee como otra cosa.");
    }
  }

  function leerPos(capa, t) {
    var tr = G.tr(capa), sep = false, v;
    try { sep = G.pos(capa).dimensionsSeparated ? true : false; } catch (exS) { sep = false; }
    if (!sep) { return G.pos(capa).valueAtTime(t, false); }
    v = [];
    v[0] = tr.property("ADBE Position_0").valueAtTime(t, false);
    v[1] = tr.property("ADBE Position_1").valueAtTime(t, false);
    if (capa.threeDLayer) {
      try { v[2] = tr.property("ADBE Position_2").valueAtTime(t, false); } catch (exZ) { v[2] = 0; }
    }
    return v;
  }

  function zDe(capa, t) {
    if (!capa.threeDLayer) { return 0; }
    var v = leerPos(capa, t);
    return (v.length > 2 && v[2] !== undefined) ? v[2] : 0;
  }

  // EL FACTOR DE PROYECCION, que es lo que hace que dos cosas a distinta Z no midan lo mismo aunque
  // tengan la misma escala. A distancia d el tamano aparente se multiplica por DIST/d. Sin esto, un
  // match cut entre una capa en z=0 y otra en z=600 sale con 20% de diferencia y parece un error de
  // medicion de la caja.
  function factorZ(capa, z, donde) {
    if (!capa.threeDLayer) { return 1; }
    var dist = G.distanciaCamara();
    var d = z + dist;
    if (d <= 0) {
      throw new Error(donde + ": '" + capa.name + "' esta DETRAS de la camara (z=" + un(z) + "). Se " +
                      "proyecta invertida y `marco-check` la cuenta como miles de px fuera de cuadro.");
    }
    return dist / d;
  }

  // ==============================================================================================
  // LA COMPUERTA DE LAS TAPAS
  // ==============================================================================================
  //
  // Se revisa DOS veces y no es redundancia: al construir se caza lo que ya esta mal, y en `revisar()`
  // se caza lo unico que al construir es invisible — que el contenido se haya creado DESPUES y haya
  // quedado arriba de su propia tapa.
  var pares = [];

  function revisarPar(tapa, capa, donde) {
    if (tapa.threeDLayer && !capa.threeDLayer) {
      throw new Error(donde + ": la tapa es 3D y '" + capa.name + "' es 2D. Una capa 2D se dibuja " +
                      "DESPUES de todo el mundo 3D (LEY 2, comp3d.html:446-453), asi que esta tapa no " +
                      "la va a cubrir nunca, gire lo que gire la camara y este donde este en la lista. " +
                      "O la tapa es 2D tambien (y queda pegada al cuadro), o la capa pasa a 3D.");
    }
    if (!tapa.threeDLayer && capa.threeDLayer) { return; }   // 2D sobre 3D: siempre gana la tapa
    if (tapa.index > capa.index) {
      throw new Error(donde + ": la tapa esta en el indice " + tapa.index + " y '" + capa.name +
                      "' en el " + capa.index + ", o sea ARRIBA de la tapa. La LEY 1 dice que la Z no " +
                      "ocluye nunca y que manda el apilado: esta tapa no tapa nada y no da ningun " +
                      "error. Construi el contenido PRIMERO y la tapa despues.");
    }
  }

  function registrar(tapa, cubre, donde) {
    var lista = comoLista(cubre), i;
    for (i = 0; i < lista.length; i++) { revisarPar(tapa, lista[i], donde); }
    if (lista.length > 0) {
      pares[pares.length] = { tapa: tapa, cubre: lista, donde: donde };
    } else {
      G.avisar(donde + ": tapa sin `cubre`. No puedo verificar el apilado ni calcular su Z. Pasale las " +
               "capas que tiene que ocultar y la ley se comprueba sola.");
    }
    return tapa;
  }

  // La Z de la tapa NO se elige: es la del contenido menos uno. Es un valor por defecto que ya es el
  // correcto, que sale mas barato que una compuerta que lo revise despues.
  function zMinimoDe(cubre, porDefecto) {
    var lista = comoLista(cubre), i, z = null, zz;
    for (i = 0; i < lista.length; i++) {
      if (!lista[i].threeDLayer) { continue; }
      zz = zDe(lista[i], 0);
      if (z === null || zz < z) { z = zz; }
    }
    return z === null ? porDefecto : z;
  }

  function zDeTapa(cubre, porDefecto) {
    var z = zMinimoDe(cubre, null);
    return z === null ? porDefecto : z - 1;
  }

  // Se llama justo antes de G.cerrar(). Tiene que estar en toda pieza que use tapas.
  api.revisar = function () {
    var i, j, n = 0;
    for (i = 0; i < pares.length; i++) {
      for (j = 0; j < pares[i].cubre.length; j++) {
        revisarPar(pares[i].tapa, pares[i].cubre[j], pares[i].donde + " (revision final)");
        n++;
      }
    }
    G.anotar("TAPAS|" + pares.length + " tapas|" + n + " pares verificados");
    return { tapas: pares.length, pares: n };
  };

  // ==============================================================================================
  // EL CORTE
  // ==============================================================================================
  //
  // Todo cambio instantaneo de este archivo pasa por aca. Dos cosas:
  //
  // (1) EL OBTURADOR PARTE LOS CORTES. El reproductor decide visibilidad en CADA sub-muestra
  //     (`comp3d.html:502-505`), asi que un corte que cae adentro de la ventana de exposicion sale a
  //     media opacidad: un cuadro fantasma que no da error y que en el video se lee como un parpadeo.
  //     AVISO y no `throw`, y el motivo importa: la fase que recomienda el plan (-angulo/2, o sea la
  //     ventana centrada en el cuadro) es justamente la que parte el corte al medio, y una compuerta
  //     que se pone roja con la configuracion recomendada se aprende a ignorar. Con fase = -angulo la
  //     ventana queda entera ANTES del cuadro y el corte sale limpio; eso es lo que dice el aviso.
  //
  // (2) UNA CLAVE POSTERIOR DESHACE EL CORTE. El corte es una clave HOLD; si la capa ya tenia una
  //     clave de opacidad mas adelante, el tramo interpola de vuelta y la capa REAPARECE sola. Eso si
  //     se tira, porque es silencioso y no tiene lectura alternativa.
  function revisarCorte(cuadro, donde) {
    var c = G.comp(), ang, fase;
    if (!c.motionBlur) { return; }
    try { ang = c.shutterAngle; fase = c.shutterPhase; } catch (exO) { return; }
    if (fase < 0 && fase + ang > 0) {
      G.avisar(donde + ": el corte del cuadro " + cuadro + " cae adentro de la ventana del obturador " +
               "(angulo " + ang + ", fase " + fase + " => expone de " + un(fase / 360) + " a " +
               un((fase + ang) / 360) + " de cuadro alrededor del corte). El reproductor promedia las " +
               "sub-muestras y ese cuadro sale a media opacidad. Con fase " + (-ang) + " la ventana " +
               "queda entera antes del corte y sale limpio.");
    }
  }

  function cortarOpacidad(capa, cuadro, prender, donde) {
    var p = G.op(capa), fps = G.fps(), t = cuadro / fps, k, tk, lista, previo;
    if (cuadro < 1) {
      throw new Error(donde + ": un corte en el cuadro 0 no es un corte, es un estado inicial. " +
                      "Poné la opacidad con setValue y listo.");
    }
    for (k = 1; k <= p.numKeys; k++) {
      tk = p.keyTime(k);
      if (tk > t + 1e-9) {
        throw new Error(donde + ": '" + capa.name + "' ya tiene una clave de opacidad en el cuadro " +
                        Math.round(tk * fps) + ", DESPUES del corte del cuadro " + cuadro + ". El corte " +
                        "es una clave HOLD y el tramo siguiente interpola de vuelta: la capa reaparece " +
                        "sola, sin error. Sacale esa clave o corta antes.");
      }
    }
    if (p.numKeys === 0) {
      lista = [[0, prender ? 0 : 100, "HOLD"], [cuadro, prender ? 100 : 0]];
    } else {
      previo = p.valueAtTime((cuadro - 1) / fps, false);
      if (Math.abs(previo - (prender ? 0 : 100)) > 1) {
        G.avisar(donde + ": '" + capa.name + "' llegaba al corte con opacidad " + un(previo) +
                 " y el corte la lleva a " + (prender ? 100 : 0) + ". Se respeta el valor que traia.");
      }
      lista = [[cuadro - 1, previo, "HOLD"], [cuadro, prender ? 100 : 0]];
    }
    G.claves(p, lista, donde + " opacidad de " + capa.name);
    revisarCorte(cuadro, donde);
    return p;
  }

  // ==============================================================================================
  // LA GEOMETRIA DE UN BARRIDO
  // ==============================================================================================
  //
  // Todo barrido de este archivo —recto o diagonal, tapa invisible o bloque de color— es el mismo
  // problema en una dimension: una franja de ancho W avanza sobre un eje y tiene que cruzar una region.
  //
  //   L = cuanto hay que RECORRER para cruzar la region entera, medido sobre el eje de movimiento
  //   T = cuanto tiene que medir la tapa A LO ANCHO para que no se le vean los costados
  //
  // Con la tapa girada `ang` grados y el eje de movimiento girado los mismos `ang` (que es lo que hace
  // que el filo quede perpendicular al recorrido), la region de w x h se proyecta sobre el eje como
  // w·|cos| + h·|sen|, y a lo ancho como w·|sen| + h·|cos|. Elegir el tamano "porque parece" es lo que
  // deja el borde de la tapa entrando en cuadro en un barrido diagonal.
  function geometriaBarrido(w, h, ang) {
    var r = ang * Math.PI / 180;
    var c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
    return { L: w * c + h * s, T: w * s + h * c };
  }

  function anguloDe(hacia, extra, donde) {
    var base;
    if (hacia === "derecha") { base = 0; }
    else if (hacia === "abajo") { base = 90; }
    else if (hacia === "izquierda") { base = 180; }
    else if (hacia === "arriba") { base = 270; }
    else {
      throw new Error(donde + ": `hacia` es derecha, izquierda, arriba o abajo, y vino '" + hacia + "'");
    }
    return base + (extra || 0);
  }

  function regionDe(o) {
    if (o.region) { return o.region; }
    return { x: G.ancho() / 2, y: G.alto() / 2, w: G.ancho(), h: G.alto() };
  }

  // Escribe el recorrido de una tapa sobre su eje. `pasos` = [[cuadro, s, curva], ...] donde `s` es la
  // coordenada SOBRE EL EJE, medida desde el centro de la region. Se anima con dimensiones separadas
  // —que el exportador vuelca como posX/posY (`exportar.jsx:1079-1081`)— y no con la posicion entera:
  // dos claves de posicion en 2D arrastran interpolacion ESPACIAL, que es una curva mas que nadie pidio.
  function recorrer(capa, cx, cy, ang, pasos, donde) {
    var r = ang * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    var lx = [], ly = [], i, hayY = false, e;
    for (i = 0; i < pasos.length; i++) {
      lx[i] = [pasos[i][0], cx + cs * pasos[i][1], pasos[i][2]];
      ly[i] = [pasos[i][0], cy + sn * pasos[i][1], pasos[i][2]];
      if (Math.abs(sn * pasos[i][1]) > 1e-6) { hayY = true; }
    }
    e = G.ejes(capa);
    G.claves(e.x, lx, donde + " posX");
    if (hayY) { G.claves(e.y, ly, donde + " posY"); }
    return e;
  }

  function puntoEn(cx, cy, ang, s) {
    var r = ang * Math.PI / 180;
    var p = []; p[0] = cx + Math.cos(r) * s; p[1] = cy + Math.sin(r) * s;
    return p;
  }

  function nuevaTapa(nombre, color, W, H, ang, x, y, z, plana) {
    var t;
    if (plana) { t = G.solido(nombre, color, Math.ceil(W), Math.ceil(H), x, y); }
    else { t = G.solido(nombre, color, Math.ceil(W), Math.ceil(H), x, y, z); }
    if (Math.abs(ang) > 1e-9) { G.rotZ(t).setValue(ang); }
    return t;
  }

  // EN AE EL OBTURADOR SE PRENDE POR CAPA **Y** POR COMPOSICION, y hacen falta las dos: el exportador
  // vuelca `MOVBLUR` por capa (`exportar.jsx:868`). Una comp con el obturador encendido y la capa que
  // cruza sin el da un latigazo nitido, o sea roto, sin ningun aviso.
  //
  // Se puede apagar por gesto con `obturador: false`, y hay un caso real: los cuatro bordes de una
  // ventana (X04) se desenfocan al moverse, y una ventana con los bordes borrosos ya no es una ventana.
  function heredarObturador(capa, o) {
    if (o && o.obturador === false) { return false; }
    if (!G.comp().motionBlur) { return false; }
    try { capa.motionBlur = true; } catch (exM) { return false; }
    return true;
  }

  // COLGAR SIN TOCAR NADA — y por que no se usa G.colgar para trasladar escenas enteras.
  //
  // `G.colgar` pone orientacion y las tres rotaciones del hijo en CERO, y tiene razon: al emparentar,
  // AE le reescribe los angulos al hijo para conservar su transformacion en el mundo. Pero eso pasa
  // SOLO SI EL PADRE TIENE ANGULO. Con un nulo identidad AE no reescribe nada, y ahi el cero deja de
  // ser una proteccion y pasa a ser un destrozo: una escena ya autorada perderia todas sus rotaciones.
  // Un latigazo que ademas endereza tres paneles no da error — da tres paneles enderezados.
  //
  // Asi que se comprueba que el padre sea de verdad la identidad y se emparenta, sin tocar al hijo.
  function colgarQuieto(hijo, padre, donde) {
    var mal = 0, i, v;
    try {
      v = G.ori(padre).value; mal += Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]);
      mal += Math.abs(G.rotX(padre).value) + Math.abs(G.rotY(padre).value);
    } catch (exO) {}
    try { mal += Math.abs(G.rotZ(padre).value); } catch (exZ) {}
    try { v = G.pos(padre).value; for (i = 0; i < v.length; i++) { mal += Math.abs(v[i]); } } catch (exP) {}
    try { v = G.anc(padre).value; for (i = 0; i < v.length; i++) { mal += Math.abs(v[i]); } } catch (exA) {}
    if (mal > 1e-6) {
      throw new Error(donde + ": el nulo '" + padre.name + "' no esta en la identidad (suma " + un(mal) +
                      "). Emparentar contra un padre con transformacion hace que AE reescriba los " +
                      "valores del hijo, y una escena ya autorada se mueve sola. Los nulos de traslado " +
                      "de este archivo van al origen, sin girar y sin anclaje, a proposito.");
    }
    hijo.parent = padre;
    return hijo;
  }

  // NULO IDENTIDAD: anclaje en (0,0,0) y posicion en (0,0,0).
  //
  // Y no es cosmetica. Al emparentar, AE REESCRIBE los valores del hijo para conservar su posicion en
  // el mundo (cuaderno 145). Si el nulo esta en el centro del cuadro, colgar una escena YA ANIMADA le
  // reescribe la posicion a cada capa. Con la transformacion del padre en identidad la reescritura es
  // la identidad y no se mueve un pixel: por eso los nulos de traslado de este archivo van al origen y
  // NO se giran nunca.
  function nuloIdentidad(nombre, tresD) {
    var n = G.comp().layers.addNull(G.comp().duration);
    n.name = nombre;
    n.threeDLayer = tresD ? true : false;
    if (tresD) { G.anc(n).setValue([0, 0, 0]); G.pos(n).setValue([0, 0, 0]); }
    else { G.anc(n).setValue([0, 0]); G.pos(n).setValue([0, 0]); }
    return n;
  }

  function algunaEs3D(lista) {
    var i;
    for (i = 0; i < lista.length; i++) { if (lista[i].threeDLayer) { return true; } }
    return false;
  }

  function exigirColor(o, donde) {
    if (o.color) { return o.color; }
    throw new Error(donde + ": falta `color`. Y no hay defecto posible: el fondo de la composicion NO " +
                    "EXISTE hasta el codificado — `capturar-comp.py` captura con omit_background " +
                    "(LEY 4). El fondo plano que necesita toda tapa es un SOLIDO real que construyo la " +
                    "pieza, y su color lo sabe la pieza, no la biblioteca.");
  }

  // ==============================================================================================
  // X01 · BARRIDO POR TAPA
  // ==============================================================================================
  //
  // Un filo cruza: de un lado el contenido viejo, del otro el nuevo. La tapa es del color del fondo,
  // asi que no se ve: lo que se ve es que algo se descubre.
  //
  // ESTE ES EL GESTO QUE MENOS HAY QUE USAR DE TODO EL ARCHIVO, y lo escribo igual porque la
  // infraestructura la usan los otros once. En los ocho avisos medidos, CERO usan cortinilla generica:
  // la transicion siempre monta sobre un objeto que ya estaba. Si estas por llamar a esta funcion,
  // fijate primero si no es X03 (que ademas es mas barata de mirar) o X12.
  //
  // LA CONDICION DURA: fondo plano y conocido. Sobre imagen o degradado la tapa se ve y el gesto
  // desaparece. Ahi va X02, que es lo mismo pero con el bloque a la vista y a proposito.
  api.barridoPorTapa = function (o) {
    o = o || {};
    var donde = o.donde || "X01 barridoPorTapa";
    var color = exigirColor(o, donde);
    var desde = entero(o.desde, "desde", donde);
    var hasta = entero(o.hasta, "hasta", donde);
    if (hasta <= desde) {
      throw new Error(donde + ": `hasta` (" + hasta + ") no es posterior a `desde` (" + desde + ")");
    }
    ritmo(hasta - desde, 8, 14, "el barrido", donde);

    if (o.modo === undefined) { o.modo = "cubre"; }
    if (o.hacia === undefined) { o.hacia = "derecha"; }
    if (o.angulo === undefined) { o.angulo = 0; }
    if (o.margen === undefined) { o.margen = 40; }
    var cur = curva(o.curva === undefined ? "C1" : o.curva, donde);
    var reg = regionDe(o);
    var ang = anguloDe(o.hacia, o.angulo, donde);
    var g = geometriaBarrido(reg.w, reg.h, ang);
    var L = g.L, Tmin = g.T + 2 * o.margen;
    var W = o.ancho === undefined ? 2 * L : o.ancho;
    var H = o.alto === undefined ? Tmin : o.alto;

    if (W < L) {
      throw new Error(donde + ": la tapa mide " + Math.round(W) + " px sobre el eje del barrido y hay " +
                      "que recorrer " + Math.round(L) + ". En el mejor cuadro quedan " +
                      Math.round(L - W) + " px de contenido a la vista, y eso no da error: da una " +
                      "franja del mundo viejo colgada del borde. Minimo duro " + Math.ceil(L) +
                      ", el catalogo pide 2x = " + Math.ceil(2 * L) + ".");
    }
    if (H < Tmin) {
      throw new Error(donde + ": la tapa mide " + Math.round(H) + " px a lo ancho y la region proyectada " +
                      "sobre ese eje mide " + Math.round(g.T) + " (mas " + o.margen + " de margen por " +
                      "lado). Se le ven los costados. Con el eje a " + ang + " grados hace falta " +
                      Math.ceil(Tmin) + ".");
    }

    var sIni, sFin, cobertura;
    if (o.modo === "cubre") {
      sIni = -(L + W) / 2; sFin = (L - W) / 2;
      cobertura = [hasta, G.cuadros()];
    } else if (o.modo === "descubre") {
      sIni = (W - L) / 2; sFin = (L + W) / 2;
      cobertura = [0, desde];
    } else {
      throw new Error(donde + ": `modo` es 'cubre' (entra y se queda tapando) o 'descubre' (arranca " +
                      "tapando y se va), y vino '" + o.modo + "'. La tapa que cruza y sigue de largo es " +
                      "X03, que ademas calcula cuantos cuadros tapa de verdad.");
    }

    var cubre = comoLista(o.cubre);
    var plana = o.plana === undefined ? !algunaEs3D(cubre) : o.plana;
    var z = o.z === undefined ? zDeTapa(cubre, 0) : o.z;
    var p0 = puntoEn(reg.x, reg.y, ang, sIni);
    var t = nuevaTapa(o.nombre || "tapa-barrido", color, W, H, ang, p0[0], p0[1], z, plana);
    // LA TAPA VIVE LO QUE DURA SU TRABAJO, NI UN CUADRO MAS.
    //
    // Sin esto la capa queda viva las 600 cuadros de la comp, estacionada fuera de cuadro o a medias
    // adentro, y `marco-check` la reprueba con razon: "quieta, visible y cortada por el borde" es
    // exactamente la familia de defectos de la PIEZA-I. Una tapa aparcada no es invisible — es una
    // franja de color plano colgada de un borde esperando que alguien mire ahi.
    //
    // En 'cubre' entra y SE QUEDA tapando (esa es su definicion), asi que vive de `desde` al final.
    // En 'descubre' arranca tapando y se va, asi que vive del principio a `hasta`.
    if (o.modo === "cubre") { G.plano(t, desde, G.cuadros()); }
    else { G.plano(t, 0, hasta); }
    registrar(t, cubre, donde);
    heredarObturador(t);
    recorrer(t, reg.x, reg.y, ang, [[desde, sIni, cur], [hasta, sFin]], donde);
    G.anotar("X01|" + donde + "|" + o.modo + "|recorrido " + Math.round(L) + "|tapa " + Math.round(W) +
             "x" + Math.round(H) + "|eje " + ang + " grados");
    return { tapa: t, cobertura: cobertura, recorrido: L, ancho: W, alto: H };
  };

  // ==============================================================================================
  // X02 · TAPA VISIBLE (bloque de color)
  // ==============================================================================================
  //
  // El mismo barrido, pero el bloque se ve a proposito: entra por un lado, retiene, sale por el otro, y
  // atras cambio todo. Y por eso FUNCIONA SOBRE CUALQUIER FONDO — es el salvavidas del gesto anterior,
  // que muere sobre una imagen o un degradado.
  //
  // LAS CURVAS NO SON SIMETRICAS Y ESA ES LA MITAD DEL GESTO. La entrada va con C3 (influencia de
  // salida 90: arranca lento y se dispara), asi que el bloque llega a toda velocidad y lo frena su
  // propia cobertura. La salida va con C1 (arranca rapido): se va de un tiron. Un bloque que entra y
  // sale con la misma curva se lee como una diapositiva.
  //
  // LA RETENCION ES DONDE VIVE EL CAMBIO: `cobertura` devuelve la ventana en la que el bloque tapa
  // seguro, y es lo que hay que pasarle a X12.
  api.tapaVisible = function (o) {
    o = o || {};
    var donde = o.donde || "X02 tapaVisible";
    var color = exigirColor(o, donde);
    var desde = entero(o.desde, "desde", donde);
    if (o.entrada === undefined) { o.entrada = 8; }
    if (o.retencion === undefined) { o.retencion = 2; }
    if (o.salida === undefined) { o.salida = 10; }
    if (o.hacia === undefined) { o.hacia = "derecha"; }
    if (o.angulo === undefined) { o.angulo = 0; }
    if (o.margen === undefined) { o.margen = 40; }
    var entrada = positivo(entero(o.entrada, "entrada", donde), "entrada", donde);
    var retencion = positivo(entero(o.retencion, "retencion", donde), "retencion", donde);
    var salida = positivo(entero(o.salida, "salida", donde), "salida", donde);
    ritmo(entrada, 6, 12, "la entrada del bloque", donde);
    ritmo(salida, 8, 14, "la salida del bloque", donde);

    var curEnt = curva(o.curvaEntrada === undefined ? "C3" : o.curvaEntrada, donde);
    var curSal = curva(o.curvaSalida === undefined ? "C1" : o.curvaSalida, donde);
    var reg = regionDe(o);
    var ang = anguloDe(o.hacia, o.angulo, donde);
    var g = geometriaBarrido(reg.w, reg.h, ang);
    var L = g.L, Tmin = g.T + 2 * o.margen;
    var W = o.ancho === undefined ? 1.6 * L : o.ancho;
    var H = o.alto === undefined ? Tmin : o.alto;

    if (W < L) {
      throw new Error(donde + ": el bloque mide " + Math.round(W) + " px sobre el eje y la region " +
                      "proyectada mide " + Math.round(L) + ": en el cuadro central quedan " +
                      Math.round(L - W) + " px sin tapar, o sea que el cambio de atras se ve ocurrir. " +
                      "Minimo " + Math.ceil(L) + " px.");
    }
    if (H < Tmin) {
      throw new Error(donde + ": el bloque mide " + Math.round(H) + " px a lo ancho y hacen falta " +
                      Math.ceil(Tmin) + " para que no se le vean los costados.");
    }

    var cubre = comoLista(o.cubre);
    var plana = o.plana === undefined ? !algunaEs3D(cubre) : o.plana;
    var z = o.z === undefined ? zDeTapa(cubre, 0) : o.z;
    var sIni = -(L + W) / 2, sFin = (L + W) / 2;
    var cA = desde + entrada, cB = cA + retencion, cC = cB + salida;
    var p0 = puntoEn(reg.x, reg.y, ang, sIni);
    var t = nuevaTapa(o.nombre || "bloque", color, W, H, ang, p0[0], p0[1], z, plana);
    registrar(t, cubre, donde);
    heredarObturador(t);
    recorrer(t, reg.x, reg.y, ang,
             [[desde, sIni, curEnt], [cA, 0, "LINEAL"], [cB, 0, curSal], [cC, sFin]], donde);
    G.anotar("X02|" + donde + "|bloque " + Math.round(W) + "x" + Math.round(H) +
             "|cobertura " + cA + "-" + cB);
    return { tapa: t, cobertura: [cA, cB], cuadroDeCambio: cA + Math.floor(retencion / 2),
             fin: cC, ancho: W, alto: H };
  };

  // ==============================================================================================
  // X03 · OBJETO QUE BARRE EL CUADRO
  // ==============================================================================================
  //
  // El mas "produccion" por menos trabajo, y el que hace el idioma del genero: un objeto con
  // personalidad —un panel, una barra gorda, una tarjeta— cruza rapidisimo, y en los cuadros en que lo
  // tapa todo, atras cambio todo.
  //
  // LA CURVA ES LINEAL Y ESO NO SE NEGOCIA: la funcion se niega a construir con otra. Si el objeto
  // desacelera adentro del cuadro se lee como un objeto que pasa, no como una transicion; la
  // aceleracion vive fuera de cuadro, donde nadie la ve. Es la unica ficha del catalogo donde la curva
  // es parte de la definicion y no del gusto.
  //
  // Y LA CUENTA QUE NADIE HACE: un objeto mas ancho que la comp no garantiza NADA. Cruzando linealmente
  // en `n` cuadros, la cobertura total dura (W - L)/(L + W) * n cuadros. Con L = 1920 y W = 2200, un
  // cruce de 10 cuadros tapa 0,68 cuadros: o sea que NUNCA hay un cuadro entero tapado y el corte se ve.
  // Despejado, para tapar `c` cuadros hace falta W = L*(n + c)/(n - c). Eso es lo que calcula (o exige)
  // esta funcion, y es la diferencia entre un corte invisible y uno que se ve.
  api.objetoQueBarre = function (o) {
    o = o || {};
    var donde = o.donde || "X03 objetoQueBarre";
    var desde = entero(o.desde, "desde", donde);
    var hasta = entero(o.hasta, "hasta", donde);
    var n = hasta - desde;
    if (n <= 0) { throw new Error(donde + ": el cruce dura " + n + " cuadros"); }
    ritmo(n, 8, 12, "el cruce", donde);
    if (o.cobertura === undefined) { o.cobertura = 3; }
    ritmo(o.cobertura, 2, 4, "la cobertura total", donde);
    if (o.hacia === undefined) { o.hacia = "derecha"; }
    if (o.angulo === undefined) { o.angulo = 0; }
    if (o.margen === undefined) { o.margen = 40; }
    if (o.curva !== undefined && curva(o.curva, donde) !== "LINEAL") {
      throw new Error(donde + ": pediste la curva '" + o.curva + "' para el cruce. Va LINEAL y punto: " +
                      "un objeto que desacelera adentro del cuadro se lee como un objeto que pasa, no " +
                      "como una transicion. Si queres que arranque y frene, poné las claves de " +
                      "aceleracion FUERA de cuadro, antes de `desde` y despues de `hasta`.");
    }

    var reg = regionDe(o);
    var ang = anguloDe(o.hacia, o.angulo, donde);
    var g = geometriaBarrido(reg.w, reg.h, ang);
    var L = g.L, Tmin = g.T + 2 * o.margen;
    if (o.cobertura >= n) {
      throw new Error(donde + ": pedis " + o.cobertura + " cuadros de cobertura en un cruce de " + n +
                      ". Para tapar tanto tiempo el objeto tendria que ser infinito.");
    }
    var Wnec = L * (n + o.cobertura) / (n - o.cobertura);

    var capa = o.capa || null, W;
    if (capa === null) {
      W = o.ancho === undefined ? Math.ceil(Wnec) : o.ancho;
      var color = exigirColor(o, donde);
      var cubre0 = comoLista(o.cubre);
      var plana0 = o.plana === undefined ? !algunaEs3D(cubre0) : o.plana;
      var z0 = o.z === undefined ? zDeTapa(cubre0, 0) : o.z;
      var q0 = puntoEn(reg.x, reg.y, ang, -(L + W) / 2);
      capa = nuevaTapa(o.nombre || "objeto-barre", color, W,
                       o.alto === undefined ? Tmin : o.alto, ang, q0[0], q0[1], z0, plana0);
    } else {
      if (o.ancho === undefined) {
        throw new Error(donde + ": si le pasas una capa ya construida tenes que decirme su `ancho` " +
                        "APARENTE en px de comp. La caja de tinta de una imagen con alfa no es su " +
                        "tamano, y adivinarlo me haria calcular una cobertura que no existe.");
      }
      W = o.ancho;
    }
    if (W < Wnec) {
      throw new Error(donde + ": el objeto mide " + Math.round(W) + " px sobre el eje y cruzando " + n +
                      " cuadros tapa el cuadro entero durante " +
                      un((W - L) / (L + W) * n) + " cuadros. Pediste " + o.cobertura + ". " +
                      "Hace falta " + Math.ceil(Wnec) + " px (formula W = L*(n+c)/(n-c), con L=" +
                      Math.round(L) + "). Con menos, el cambio de atras se ve ocurrir.");
    }

    // Mismo criterio que X01, con una diferencia que importa: si el objeto que barre lo trajo el autor
    // (`o.capa`), NO se le toca el plano. Esa capa puede tener vida propia antes y despues del cruce —
    // es justamente la gracia de X03, que barra "un objeto que ya estaba" y no una cortinilla.
    if (o.capa === undefined || o.capa === null) { G.plano(capa, desde, hasta); }
    registrar(capa, comoLista(o.cubre), donde);
    heredarObturador(capa);
    var sIni = -(L + W) / 2, sFin = (L + W) / 2;
    recorrer(capa, reg.x, reg.y, ang, [[desde, sIni, "LINEAL"], [hasta, sFin]], donde);

    // la ventana real de cobertura: |s| <= (W - L)/2, y como el recorrido es lineal sale en cuadros
    var medio = (desde + hasta) / 2;
    var delta = n * (W - L) / (2 * (L + W));
    var a = Math.ceil(medio - delta), b = Math.floor(medio + delta);
    if (b < a) { b = a; }
    G.anotar("X03|" + donde + "|objeto " + Math.round(W) + " px|cobertura real " + a + "-" + b);
    return { capa: capa, cobertura: [a, b], cuadroDeCambio: Math.round(medio),
             ancho: W, anchoNecesario: Math.ceil(Wnec) };
  };

  // ==============================================================================================
  // X04 · VENTANA DE CUATRO TAPAS
  // ==============================================================================================
  //
  // Una mascara rectangular animada, hecha con lo que hay: cuatro tapas colgadas de un nulo. La
  // ventana se anima MOVIENDO LAS CUATRO POSICIONES, nunca escalando — una tapa escalada cambia de
  // tamano y deja de tapar el borde de afuera.
  //
  // LOS ANCLAJES SON EL GESTO ENTERO. Cada tapa se ancla en el borde que da a la ventana, asi que su
  // posicion ES el filo: la de arriba se ancla en su borde inferior, la de abajo en el superior, la
  // izquierda en el derecho, la derecha en el izquierdo. Con el anclaje al centro habria que mover
  // cada una media tapa mas, y esa cuenta se equivoca sola cuando la ventana cambia de tamano.
  //
  // POR QUE 3x LA DIAGONAL: las cuatro tienen que seguir tapando con la ventana cerrada Y con el nulo
  // girado. Girado 45 grados, lo que asoma por la esquina es la diagonal del contenido, no su ancho.
  //
  // Y COMO SON HIJAS DEL MISMO NULO, girar el nulo gira la ventana entera sin que se despeguen. Es la
  // unica forma de tener una ventana inclinada sin cuatro rotaciones coordinadas.
  //
  // LO QUE ESTA VENTANA NO ES: un recorte. Tapa con color de fondo, asi que exige fondo plano. El
  // exportador HOY lleva un matte de pista rectangular para el caso coplanar sin girar (`exportar.jsx`
  // 810-816); el dia que alguien lo mida contra un cuadro de AE, esta funcion se reescribe con eso y
  // deja de depender del fondo.
  api.ventanaDeCuatroTapas = function (o) {
    o = o || {};
    var donde = o.donde || "X04 ventanaDeCuatroTapas";
    var color = exigirColor(o, donde);
    if (o.diagonal === undefined) {
      throw new Error(donde + ": falta `diagonal` — la diagonal del contenido que la ventana enmarca. " +
                      "De ahi sale el tamano de las cuatro tapas, y no hay defecto razonable: una " +
                      "ventana sobre un rotulo y una sobre el cuadro entero no se tapan con lo mismo.");
    }
    if (o.x === undefined) { o.x = G.ancho() / 2; }
    if (o.y === undefined) { o.y = G.alto() / 2; }
    if (o.cx === undefined) { o.cx = 0; }
    if (o.cy === undefined) { o.cy = 0; }
    var cubre = comoLista(o.cubre);
    var tresD = o.z !== undefined || algunaEs3D(cubre);
    // el nulo va al PLANO DEL CONTENIDO y las cuatro tapas a una unidad de ahi (posicion local -1).
    // Restarle uno tambien al nulo dejaria las tapas dos unidades adelante: no rompe nada, pero la
    // ventana dejaria de estar en el plano que enmarca y con la camara moviendose eso se nota.
    var z = o.z === undefined ? zMinimoDe(cubre, 0) : o.z;
    var lado = o.lado === undefined ? 3 * o.diagonal : o.lado;
    if (lado < 3 * o.diagonal) {
      throw new Error(donde + ": las tapas miden " + Math.round(lado) + " y la diagonal del contenido es " +
                      Math.round(o.diagonal) + ". Con la ventana cerrada o el nulo girado se ve el " +
                      "contenido por las esquinas. Minimo 3x = " + Math.ceil(3 * o.diagonal) + ".");
    }
    var pasos = o.pasos || [];
    if (pasos.length < 1) {
      throw new Error(donde + ": falta `pasos`, la lista [[cuadro, ancho, alto, curva], ...] de la " +
                      "ventana. Sin pasos esto no es un gesto: son cuatro solidos quietos.");
    }

    var W = lado, H = lado, i;
    var nul = G.comp().layers.addNull(G.comp().duration);
    nul.name = (o.nombre || "ventana") + "-nulo";
    nul.threeDLayer = tresD ? true : false;
    if (tresD) { G.anc(nul).setValue([50, 50, 0]); G.pos(nul).setValue([o.x, o.y, z]); }
    else { G.anc(nul).setValue([50, 50]); G.pos(nul).setValue([o.x, o.y]); }
    if (o.giro !== undefined) { G.rotZ(nul).setValue(o.giro); }

    // Entre ellas el orden da igual —son del mismo color y sus cuatro medios planos no se contradicen—
    // pero las cuatro tienen que quedar arriba del contenido, y eso lo comprueba `registrar` capa por
    // capa. Se crean despues del nulo, asi que ademas quedan arriba de el, que es lo comodo para leer
    // el documento.
    var nombres = ["superior", "inferior", "izquierda", "derecha"];
    var anclas = [[W / 2, H], [W / 2, 0], [W, H / 2], [0, H / 2]];
    var orden = [];
    for (i = 0; i < 4; i++) {
      var t = G.solido((o.nombre || "ventana") + "-" + nombres[i], color, Math.ceil(W), Math.ceil(H), 0, 0);
      t.threeDLayer = tresD ? true : false;
      if (tresD) { G.anc(t).setValue([anclas[i][0], anclas[i][1], 0]); }
      else { G.anc(t).setValue([anclas[i][0], anclas[i][1]]); }
      // el padre PRIMERO y la posicion despues: colgar() hace las dos y ademas deja orientacion y
      // rotaciones en cero, que es lo que AE reescribe al emparentar
      G.colgar(t, nul, tresD ? [0, 0, -1] : [0, 0]);
      registrar(t, cubre, donde + " " + nombres[i]);
      heredarObturador(t, o);
      orden[i] = t;
    }

    // las cuatro listas de claves: arriba/abajo mueven Y, izquierda/derecha mueven X
    var ly = [[], []], lx = [[], []];
    for (i = 0; i < pasos.length; i++) {
      var cu = entero(pasos[i][0], "pasos[" + i + "][0]", donde);
      var aw = pasos[i][1], ah = pasos[i][2], cv = curva(pasos[i][3], donde);
      if (aw < 0 || ah < 0) { throw new Error(donde + ": una ventana no puede medir negativo (paso " + i + ")"); }
      if (aw > W || ah > H) {
        throw new Error(donde + ": el paso " + i + " pide una ventana de " + Math.round(aw) + "x" +
                        Math.round(ah) + " y las tapas miden " + Math.round(W) + ": la ventana es mas " +
                        "grande que lo que la rodea y las tapas se salen del cuadro por el otro lado.");
      }
      ly[0][i] = [cu, o.cy - ah / 2, cv];
      ly[1][i] = [cu, o.cy + ah / 2, cv];
      lx[0][i] = [cu, o.cx - aw / 2, cv];
      lx[1][i] = [cu, o.cx + aw / 2, cv];
    }
    var eSup = G.ejes(orden[0]), eInf = G.ejes(orden[1]);
    var eIzq = G.ejes(orden[2]), eDer = G.ejes(orden[3]);
    G.claves(eSup.y, ly[0], donde + " superior");
    G.claves(eInf.y, ly[1], donde + " inferior");
    G.claves(eIzq.x, lx[0], donde + " izquierda");
    G.claves(eDer.x, lx[1], donde + " derecha");
    G.anotar("X04|" + donde + "|tapas " + Math.round(W) + "|pasos " + pasos.length);
    return { nulo: nul, superior: orden[0], inferior: orden[1], izquierda: orden[2], derecha: orden[3],
             tapas: orden, lado: W };
  };

  // ==============================================================================================
  // X05 · IRIS CON TAPA-DONA
  // ==============================================================================================
  //
  // Un PNG de anillo del color del fondo, con el agujero al centro: el contenido se ve por el agujero.
  // Escalando la dona hacia abajo el agujero se cierra, hacia arriba se abre.
  //
  // Y ACA ESTA EL LIMITE QUE LA RECETA NO DICE, y que es el motivo de que esta funcion tenga cuentas.
  // El agujero y el anillo escalan JUNTOS, asi que no son independientes: si el agujero mide `d` en
  // pantalla, el anillo mide `d / razon`, donde `razon` es agujero/ancho MEDIDO EN EL PNG. Para que el
  // anillo siga tapando el cuadro entero hace falta d/razon >= diagonal, o sea
  //
  //     EL AGUJERO NO PUEDE CERRARSE POR DEBAJO DE  razon * diagonal.
  //
  // Con una dona de razon 0,25 en 1920x1080 eso son 551 px: el iris se cierra hasta un agujero del
  // tamano de una cara y ahi se planta. Bajar la razon para cerrar mas obliga a escalar el anillo
  // 1/razon veces la diagonal, y el PNG se va a decenas de miles de px por Q2. No hay dona que cierre
  // a cero: es geometria, no una limitacion del exportador.
  //
  // EL REEMPLAZO PARA CERRAR DE VERDAD es `Gx.irisDeDisco`, que es un disco lleno que CRECE. Cierra
  // completo, pero cierra del centro hacia afuera en vez de de afuera hacia adentro: es otro gesto y
  // hay que llamarlo por su nombre.
  //
  // EL RECURSO. `o.recurso` es el nombre de un PNG que tiene que tener:
  //   · cuadrado, opaco, del COLOR DEL FONDO, sin degradado ni borde suave
  //   · un agujero circular CENTRADO y transparente
  //   · `o.razon` = diametro del agujero / ancho del PNG, medido en ese archivo (por defecto 0,25)
  //   · nativo grande: se dibuja a diametro/razon px, y Q2 pide el doble de pixeles nativos que eso
  api.irisConDona = function (o) {
    o = o || {};
    var donde = o.donde || "X05 irisConDona";
    if (!o.recurso) {
      throw new Error(donde + ": falta `recurso`, el nombre del PNG de la dona. El motor no tiene " +
                      "esquinas redondeadas ni formas: un agujero circular solo puede venir horneado.");
    }
    var desde = entero(o.desde, "desde", donde);
    var hasta = entero(o.hasta, "hasta", donde);
    if (hasta <= desde) { throw new Error(donde + ": `hasta` no es posterior a `desde`"); }
    if (o.razon === undefined) { o.razon = 0.25; }
    if (o.abre === undefined) { o.abre = true; }
    ritmo(hasta - desde, o.abre ? 18 : 10, o.abre ? 24 : 14, o.abre ? "la apertura" : "el cierre", donde);

    var itm = G.recurso(o.recurso);
    var nativo = itm.width;
    var diag = Math.sqrt(G.ancho() * G.ancho() + G.alto() * G.alto());
    var cubre = comoLista(o.cubre);
    var plana = o.plana === undefined ? !algunaEs3D(cubre) : o.plana;
    var z = o.z === undefined ? zDeTapa(cubre, 0) : o.z;
    var dist = G.distanciaCamara();
    var factor = plana ? 1 : dist / (z + dist);
    if (factor <= 0) { throw new Error(donde + ": la dona quedaria detras de la camara (z=" + z + ")"); }

    var dMin = o.razon * diag;
    var dCerrado = o.cerrado === undefined ? Math.ceil(dMin) : o.cerrado;
    var dAbierto = o.abierto === undefined ? Math.ceil(diag * 1.02) : o.abierto;
    if (dCerrado < dMin - 0.5) {
      throw new Error(donde + ": pedis cerrar el iris hasta un agujero de " + Math.round(dCerrado) +
                      " px y con una dona de razon " + o.razon + " el minimo es " + Math.ceil(dMin) +
                      " px (razon * diagonal " + Math.round(diag) + "). Por debajo de eso el ANILLO ya " +
                      "no llega a los bordes del cuadro y se ve el contenido por las esquinas. " +
                      "Salidas: una dona de razon menor (y un PNG " + un(dMin / dCerrado) + "x mas " +
                      "grande), o `Gx.irisDeDisco`, que cierra a cero pero del centro hacia afuera.");
    }
    if (dAbierto < dCerrado) {
      throw new Error(donde + ": `abierto` (" + dAbierto + ") es menor que `cerrado` (" + dCerrado + ")");
    }

    function escalaPara(d) { return 100 * d / (nativo * o.razon * factor); }
    var eCer = escalaPara(dCerrado), eAbi = escalaPara(dAbierto);
    var eMax = Math.max(eCer, eAbi);
    var dibujado = nativo * eMax / 100;
    if (dibujado > nativo / 2) {
      G.avisar(donde + ": la dona se dibuja a " + Math.round(dibujado) + " px con " + nativo +
               " nativos = " + un(nativo / dibujado) + "x. El piso de Q2 es 2x: el borde del agujero " +
               "va a escalonar. Regenera el PNG con " + Math.ceil(dibujado * 2) + " px de lado.");
    }

    var x = o.x === undefined ? G.ancho() / 2 : o.x;
    var y = o.y === undefined ? G.alto() / 2 : o.y;
    var capa;
    if (plana) { capa = G.img2d(o.recurso, o.nombre || "iris-dona", x, y, o.abre ? eCer : eAbi); }
    else { capa = G.img(o.recurso, o.nombre || "iris-dona", x, y, z, o.abre ? eCer : eAbi); }
    registrar(capa, cubre, donde);
    heredarObturador(capa);

    var cur = curva(o.curva === undefined ? (o.abre ? "C1" : "C3") : o.curva, donde);
    var a = o.abre ? eCer : eAbi, b = o.abre ? eAbi : eCer;
    var va = plana ? [a, a] : [a, a, a];
    var vb = plana ? [b, b] : [b, b, b];
    G.claves(G.esc(capa), [[desde, va, cur], [hasta, vb]], donde + " escala");
    G.anotar("X05|" + donde + "|agujero " + Math.round(dCerrado) + "->" + Math.round(dAbierto) +
             " px|escala " + un(a) + "->" + un(b) + "|minimo cerrable " + Math.ceil(dMin));
    return { capa: capa, escalas: [a, b], diametroMinimo: dMin,
             cobertura: o.abre ? [0, desde] : [hasta, G.cuadros()] };
  };

  // EL REEMPLAZO DE X05 CUANDO EL IRIS TIENE QUE CERRAR HASTA CERO.
  //
  // Un disco lleno que crece desde 0 hasta tapar el cuadro. Cierra completo —cosa que la dona no puede
  // por geometria— y encima no necesita tapa aparte: cuando termino, ESE disco es el fondo nuevo.
  // Lo que se pierde es la direccion: la dona cierra de afuera hacia adentro y el disco de adentro
  // hacia afuera. Son dos gestos distintos y por eso son dos funciones distintas.
  //
  // EL RECURSO: PNG cuadrado con un circulo relleno CENTRADO que toca los cuatro bordes, del color del
  // mundo que viene, sobre transparente.
  api.irisDeDisco = function (o) {
    o = o || {};
    var donde = o.donde || "X05b irisDeDisco";
    if (!o.recurso) { throw new Error(donde + ": falta `recurso`, el PNG del disco lleno."); }
    var desde = entero(o.desde, "desde", donde);
    var hasta = entero(o.hasta, "hasta", donde);
    if (hasta <= desde) { throw new Error(donde + ": `hasta` no es posterior a `desde`"); }
    ritmo(hasta - desde, 16, 24, "el iris", donde);

    var itm = G.recurso(o.recurso);
    var diag = Math.sqrt(G.ancho() * G.ancho() + G.alto() * G.alto());
    var cubre = comoLista(o.cubre);
    var plana = o.plana === undefined ? !algunaEs3D(cubre) : o.plana;
    var z = o.z === undefined ? zDeTapa(cubre, 0) : o.z;
    var dist = G.distanciaCamara();
    var factor = plana ? 1 : dist / (z + dist);
    var eFin = 100 * diag * 1.02 / (itm.width * factor);
    var dibujado = itm.width * eFin / 100;
    if (dibujado > itm.width / 2) {
      G.avisar(donde + ": el disco se dibuja a " + Math.round(dibujado) + " px con " + itm.width +
               " nativos. Q2 pide " + Math.ceil(dibujado * 2) + " px de lado o el borde escalona.");
    }
    var x = o.x === undefined ? G.ancho() / 2 : o.x;
    var y = o.y === undefined ? G.alto() / 2 : o.y;
    var capa;
    if (plana) { capa = G.img2d(o.recurso, o.nombre || "iris-disco", x, y, eFin); }
    else { capa = G.img(o.recurso, o.nombre || "iris-disco", x, y, z, eFin); }
    registrar(capa, cubre, donde);
    heredarObturador(capa);
    var cur = curva(o.curva === undefined ? "C1" : o.curva, donde);
    var v0 = plana ? [0, 0] : [0, 0, 0];
    var v1 = plana ? [eFin, eFin] : [eFin, eFin, eFin];
    G.claves(G.esc(capa), [[desde, v0, cur], [hasta, v1]], donde + " escala");
    G.anotar("X05b|" + donde + "|disco 0->" + un(eFin) + "%");
    return { capa: capa, escalaFinal: eFin, cobertura: [hasta, G.cuadros()] };
  };

  // ==============================================================================================
  // X06 · TELON / PERSIANA
  // ==============================================================================================
  //
  // Dos tapas que se cierran por el centro (telon) o N franjas que barren escalonadas (persiana). Las
  // dos salen del mismo barrido de X01, una por franja.
  //
  // DOS NUMEROS QUE ESTA FUNCION SE NIEGA A DEJAR PASAR:
  //
  //   · EL DESFASE DEL TELON NO PUEDE SER CERO. Dos mitades que salen exactamente juntas y exactamente
  //     iguales se leen como muertas — es simetria de programa, no de mano. Dos cuadros de diferencia
  //     alcanzan y no se "ven": se sienten.
  //   · EL RETARDO DE LA PERSIANA NO PASA DE 4. Mas que eso y las franjas dejan de leerse como UNA
  //     cosa que barre y pasan a leerse como N cosas que barren, que es otro gesto y peor.
  //
  // Y EL RETARDO FRACCIONARIO SE ACUMULA, NO SE REDONDEA POR PASO. El catalogo pide 1,5-3 justamente
  // porque los enteros suenan mecanicos, y 1,5 con claves en cuadro entero solo existe si se redondea
  // el ACUMULADO: sale 0, 2, 3, 5, 6, 8, 9, 11 — que promedia 1,5 de verdad. Redondeando cada paso
  // saldria 2 fijo, o sea 0, 2, 4, 6, 8, 10, 12, 14: tres cuadros mas largo y sin la irregularidad,
  // que era todo el punto.
  //
  // Con `franjas: 2` sale el telon; con `franjas: 2, persiana: true`, dos franjas barriendo del mismo
  // lado, que es otra cosa.
  api.telonOPersiana = function (o) {
    o = o || {};
    var donde = o.donde || "X06 telonOPersiana";
    var color = exigirColor(o, donde);
    var desde = entero(o.desde, "desde", donde);
    if (o.franjas === undefined) { o.franjas = 2; }
    if (o.modo === undefined) { o.modo = "cierra"; }
    if (o.orientacion === undefined) { o.orientacion = "horizontal"; }
    var n = Math.round(o.franjas);
    if (n < 2) { throw new Error(donde + ": `franjas` va de 2 (telon) a 12 (persiana), y vino " + n); }
    if (n > 12) {
      throw new Error(donde + ": " + n + " franjas. Arriba de 12 deja de leerse como una cosa que barre " +
                      "y se lee como " + n + " cosas; y son " + n + " capas por transicion, que en seis " +
                      "transiciones son " + (n * 6) + " capas de documento.");
    }
    var dur = o.duracion === undefined ? (n === 2 ? 12 : 11) : entero(o.duracion, "duracion", donde);
    ritmo(dur, 10, 14, "cada franja", donde);
    var modo = o.modo === "cierra" ? "cubre" : "descubre";
    var cur = o.curva === undefined ? (o.modo === "cierra" ? "C3" : "C1") : o.curva;
    var W = G.ancho(), H = G.alto(), tapas = [], i, r, fin = desde + dur;

    if (n === 2 && o.persiana !== true) {
      var desfase = o.desfase === undefined ? 2 : Math.round(o.desfase);
      if (desfase < 1) {
        throw new Error(donde + ": `desfase` = " + desfase + ". Las dos mitades de un telon NO salen " +
                        "juntas: la simetria exacta se lee como muerta y nadie sabe decir por que. " +
                        "Dos cuadros es lo medido; uno es el minimo honesto.");
      }
      var vert = o.orientacion === "vertical";
      var regA = vert ? { x: W / 2, y: H / 4, w: W, h: H / 2 } : { x: W / 4, y: H / 2, w: W / 2, h: H };
      var regB = vert ? { x: W / 2, y: 3 * H / 4, w: W, h: H / 2 } : { x: 3 * W / 4, y: H / 2, w: W / 2, h: H };
      var hA = vert ? "abajo" : "derecha", hB = vert ? "arriba" : "izquierda";
      var mA = o.modo === "cierra" ? hA : hB, mB = o.modo === "cierra" ? hB : hA;
      var a = api.barridoPorTapa({ donde: donde + " hoja A", nombre: (o.nombre || "telon") + "-A",
        color: color, desde: desde, hasta: fin, modo: modo, hacia: mA, region: regA,
        curva: cur, cubre: o.cubre, z: o.z, plana: o.plana, margen: o.margen });
      var b = api.barridoPorTapa({ donde: donde + " hoja B", nombre: (o.nombre || "telon") + "-B",
        color: color, desde: desde + desfase, hasta: fin + desfase, modo: modo, hacia: mB, region: regB,
        curva: cur, cubre: o.cubre, z: o.z, plana: o.plana, margen: o.margen });
      tapas[0] = a.tapa; tapas[1] = b.tapa;
      G.anotar("X06|" + donde + "|telon|desfase " + desfase);
      return { tapas: tapas, fin: fin + desfase,
               cobertura: o.modo === "cierra" ? [fin + desfase, G.cuadros()] : [0, desde] };
    }

    var retardo = o.retardo === undefined ? 2 : o.retardo;
    if (retardo > 4) {
      throw new Error(donde + ": retardo " + retardo + " entre franjas. Arriba de 4 cuadros el grupo " +
                      "deja de leerse como un grupo: se ven " + n + " barridos, uno atras del otro.");
    }
    var ultimo = desde;
    for (i = 0; i < n; i++) {
      var off = Math.round(i * retardo);
      var reg = o.orientacion === "vertical"
        ? { x: (i + 0.5) * W / n, y: H / 2, w: W / n, h: H }
        : { x: W / 2, y: (i + 0.5) * H / n, w: W, h: H / n };
      // margen 0 a proposito: dos franjas con margen se pisan y el filo deja de caer en el limite de la
      // banda, que es justo lo unico que se ve de una persiana
      r = api.barridoPorTapa({ donde: donde + " franja " + i, nombre: (o.nombre || "persiana") + "-" + i,
        color: color, desde: desde + off, hasta: desde + off + dur, modo: modo,
        hacia: o.orientacion === "vertical" ? "abajo" : "derecha", region: reg, curva: cur,
        cubre: o.cubre, z: o.z, plana: o.plana, margen: 0,
        alto: o.orientacion === "vertical" ? W / n : H / n });
      tapas[i] = r.tapa;
      ultimo = desde + off + dur;
    }
    G.anotar("X06|" + donde + "|persiana " + n + " franjas|retardo " + retardo + "|fin " + ultimo);
    return { tapas: tapas, fin: ultimo,
             cobertura: o.modo === "cierra" ? [ultimo, G.cuadros()] : [0, desde] };
  };

  // ==============================================================================================
  // X07 · LATIGAZO
  // ==============================================================================================
  //
  // Todo el cuadro se va de barrido para un lado y vuelve del otro con contenido nuevo. Se siente como
  // girar la cabeza de golpe.
  //
  // Y ES EL UNICO GESTO DE ESTE ARCHIVO QUE TIENE PRESUPUESTO. El borron no lo pone un efecto: lo pone
  // el OBTURADOR, que en AE es por COMPOSICION, asi que un latigazo de 8 cuadros obliga a renderizar
  // los 750 con N muestras por cuadro (LEY 5). Eso se decide al planificar la pieza, no al escribir el
  // gesto — por eso esta funcion se niega a construir si el obturador esta apagado en vez de dejar un
  // latigazo nitido, que no se ve "menos bueno": se ve ROTO, dos cuadros con la escena en dos lugares
  // distintos y nada que una la lectura. La tabla de la PIEZA-K ya reemplazo un latigazo por eso.
  //
  // Y HAY QUE PRENDERLO TAMBIEN POR CAPA: `exportar.jsx:868` vuelca MOVBLUR capa por capa y en AE hacen
  // falta las dos. Una comp con el obturador prendido y la capa sin el da un latigazo nitido y mudo.
  // Lo hace esta funcion en todas las capas que mueve.
  //
  // LA VELOCIDAD ES LA CONDICION, NO LA DISTANCIA: si el desplazamiento por cuadro no llega a un ancho
  // de pantalla, el borron no alcanza a tapar y se ve el salto. Se calcula y se tira con el numero.
  function exigirObturador(donde, minAngulo) {
    var c = G.comp(), ang = 0;
    if (!c.motionBlur) {
      throw new Error(donde + ": la composicion tiene el OBTURADOR APAGADO. Sin borron esto no se ve " +
                      "menos bueno: se ve ROTO. Pasale a G.iniciar: obturador true, anguloObturador " +
                      minAngulo + ", faseObturador " + (-minAngulo / 2) + " y un motivoObturador escrito. " +
                      "Y sabé lo que estas comprando (LEY 5): el obturador es por composicion, asi que " +
                      "el render de la pieza ENTERA se multiplica por las muestras. Si no lo vas a " +
                      "pagar, el reemplazo es X02 (bloque de color que cruza) o E10 (empuje), que " +
                      "cambian de escena sin borron.");
    }
    try { ang = c.shutterAngle; } catch (exA) { ang = 0; }
    if (ang < minAngulo) {
      throw new Error(donde + ": el obturador esta en " + ang + " grados y un latigazo pide " +
                      minAngulo + "-360. Con 180 el borron cubre medio cuadro de recorrido y la mitad " +
                      "del salto queda nitida.");
    }
    return ang;
  }

  api.latigazo = function (o) {
    o = o || {};
    var donde = o.donde || "X07 latigazo";
    var desde = entero(o.desde, "desde", donde);
    var sale = comoLista(o.sale), entra = comoLista(o.entra);
    if (sale.length < 1 || entra.length < 1) {
      throw new Error(donde + ": el latigazo mueve DOS escenas: `sale` y `entra`. Con una sola no es un " +
                      "latigazo, es una salida — y para eso esta E06 o X01.");
    }
    exigirObturador(donde, o.anguloMinimo === undefined ? 270 : o.anguloMinimo);
    if (o.salida === undefined) { o.salida = 4; }
    if (o.entrada === undefined) { o.entrada = 5; }
    if (o.solape === undefined) { o.solape = 1; }
    var salida = positivo(entero(o.salida, "salida", donde), "salida", donde);
    var entrada = positivo(entero(o.entrada, "entrada", donde), "entrada", donde);
    var solape = entero(o.solape, "solape", donde);
    ritmo(salida + entrada - solape, 8, 10, "el latigazo entero", donde);
    if (o.hacia === undefined) { o.hacia = "izquierda"; }
    var signo = o.hacia === "izquierda" ? -1 : 1;
    if (o.hacia !== "izquierda" && o.hacia !== "derecha") {
      throw new Error(donde + ": `hacia` en un latigazo es izquierda o derecha. Un latigazo vertical " +
                      "existe pero se lee como caida, no como giro de cabeza.");
    }
    var anchoComp = G.ancho();
    var desp = o.desplazamiento === undefined ? 2.5 * anchoComp : o.desplazamiento;
    if (desp < 1.5 * anchoComp) {
      throw new Error(donde + ": el desplazamiento es " + Math.round(desp) + " px y el minimo son 1,5 " +
                      "anchos de pantalla (" + Math.round(1.5 * anchoComp) + "). Con menos, en el cuadro " +
                      "del cambio todavia se lee la escena vieja y el latigazo se ve como un empujon.");
    }
    // EL PISO ES MEDIO ANCHO DE PANTALLA POR CUADRO **DE PROMEDIO**, y la mitad viene de una cuenta y
    // no de la tabla. El catalogo pide "un ancho de comp por cuadro o el borron no tapa", pero eso es
    // la velocidad del CUADRO CENTRAL, no el promedio: con C4 (85/85) el movimiento se concentra en el
    // medio y el pico anda por el doble del promedio. Por eso el piso del promedio es la mitad.
    //
    // Y sirve de control: la receta del propio catalogo —2,5 anchos en 4 cuadros de salida y 5 de
    // entrada— cae EXACTAMENTE en el piso. Un limite que deja pasar justo la receta medida y nada mas
    // lento es un limite bien puesto, no uno inventado.
    var vSal = desp / salida, vEnt = desp / entrada, piso = anchoComp / 2;
    if (vSal < piso - 1e-9 || vEnt < piso - 1e-9) {
      throw new Error(donde + ": la escena se mueve a " + Math.round(Math.min(vSal, vEnt)) + " px por " +
                      "cuadro de promedio y el piso es " + Math.round(piso) + " (medio ancho de " +
                      "pantalla; con C4 el pico es el doble, o sea el ancho entero que pide el " +
                      "catalogo). Mas lento que eso el borron no llega a tapar y se ve el salto. O mas " +
                      "desplazamiento, o menos cuadros: con " + Math.floor(desp / piso) +
                      " cuadros o menos por tramo entra.");
    }

    var cur = curva(o.curva === undefined ? "C4" : o.curva, donde);
    var i, nS = nuloIdentidad((o.nombre || "latigazo") + "-sale", algunaEs3D(sale));
    var nE = nuloIdentidad((o.nombre || "latigazo") + "-entra", algunaEs3D(entra));
    for (i = 0; i < sale.length; i++) { colgarQuieto(sale[i], nS, donde); heredarObturador(sale[i], o); }
    for (i = 0; i < entra.length; i++) { colgarQuieto(entra[i], nE, donde); heredarObturador(entra[i], o); }

    var finSal = desde + salida;
    var iniEnt = finSal - solape;
    var finEnt = iniEnt + entrada;
    var eS = G.ejes(nS), eE = G.ejes(nE);
    G.claves(eS.x, [[desde, 0, cur], [finSal, signo * desp]], donde + " sale");
    G.claves(eE.x, [[iniEnt, -signo * desp, cur], [finEnt, 0]], donde + " entra");

    // la escena vieja se apaga cuando ya salio: sigue costando render mientras exista. Se toca el
    // outPoint y NO el inPoint de la que entra — LEY 7: una capa de forma con inPoint > 0 puede
    // rasterizar vacia, y ese defecto no da error, da una capa que no aparece.
    if (o.apagar !== false) {
      for (i = 0; i < sale.length; i++) { sale[i].outPoint = finSal / G.fps(); }
    }
    G.anotar("X07|" + donde + "|desplazamiento " + Math.round(desp) + " px|" +
             Math.round(vSal) + " px/cuadro|cambio en " + finSal);
    return { nuloSale: nS, nuloEntra: nE, cuadroDeCambio: finSal, fin: finEnt,
             velocidad: vSal };
  };

  // ==============================================================================================
  // X08 · VOLTEO DE TARJETA CON DOS CARAS — NO SE PUEDE, Y TIRA
  // ==============================================================================================
  //
  // La receta clasica es dos capas coplanares separadas 1 px en Z, una rotada 180 grados, colgadas del
  // mismo nulo que gira: la cara que mira para atras se esconde sola porque la Z decide quien tapa a
  // quien.
  //
  // ACA LA Z NO DECIDE NADA. `comp3d.html:267-272` pone depthTest y depthWrite en false y ordena por
  // `renderOrder = capas.length - indice`: manda el APILADO, siempre. Dos capas coplanares se dibujan
  // en orden de lista y la de arriba gana en toda la superposicion, gire lo que gire el nulo. O sea que
  // la cara de atras se ve ATRAVESANDO la de adelante durante la mitad del giro.
  //
  // Y no alcanza con "probarlo": en AE la previsualizacion se ve BIEN, porque AE si ordena por
  // distancia. Es un defecto que solo aparece en el video final.
  api.volteoDeTarjetaDosCaras = function (o) {
    throw new Error("X08 volteo de tarjeta con dos caras: NO SE PUEDE en este motor y no lo voy a " +
                    "construir a medias. Falta PRUEBA DE PROFUNDIDAD: el reproductor dibuja con " +
                    "depthTest en false y ordena por apilado (LEY 1), asi que la cara de atras se " +
                    "dibuja SIEMPRE segun su indice y se ve atravesando a la de adelante durante medio " +
                    "giro. En AE se previsualiza bien, que es lo que lo hace caro: el defecto aparece " +
                    "recien en el video. REEMPLAZO: Gx.volteoAlPerfil — la cara gira hasta el perfil " +
                    "exacto (donde mide cero y es invisible), ahi hay un corte seco, y el dorso sigue " +
                    "el giro desde el otro perfil. Mismo tiempo, mismo lugar, una sola cara por vez.");
  };

  // EL REEMPLAZO DE X08. Un relevo al perfil: dos planos distintos que nunca coexisten.
  //
  // La cara gira de 0 a -90 acelerando (C3), y en el cuadro en que llega a 90 grados exactos mide CERO
  // de ancho: ahi el corte es invisible por construccion, no por suerte. El dorso arranca en +90 —
  // tambien de canto— y frena en 0 con C1 y 5 grados de sobrepaso, que es lo que le da peso.
  //
  // LO QUE NO ES, dicho antes de que alguien lo descubra en el video: no es un giro continuo. En -90 y
  // en +90 el plano esta de canto de las dos maneras posibles, y el borde que estaba mas cerca de la
  // camara cambia de lado. O sea que la tarjeta se va girando hacia un lado y vuelve girando desde el
  // otro. En una tarjeta sin espesor y a esa velocidad casi no se lee, pero es un relevo y no un
  // volteo, y por eso la funcion se llama asi.
  api.volteoAlPerfil = function (o) {
    o = o || {};
    var donde = o.donde || "X08b volteoAlPerfil";
    var desde = entero(o.desde, "desde", donde);
    var hasta = entero(o.hasta, "hasta", donde);
    if (!o.cara || !o.dorso) {
      throw new Error(donde + ": faltan `cara` y `dorso`. Son dos capas distintas y coplanares: el " +
                      "motor no dibuja el reverso de una capa, asi que el dorso es contenido propio.");
    }
    if (!o.cara.threeDLayer || !o.dorso.threeDLayer) {
      throw new Error(donde + ": las dos capas tienen que ser 3D. Un volteo es una rotacion en Y y una " +
                      "capa 2D no la tiene.");
    }
    ritmo(hasta - desde, 14, 20, "el volteo", donde);
    var medio = o.medio === undefined ? Math.round((desde + hasta) / 2) : entero(o.medio, "medio", donde);
    if (medio <= desde || medio >= hasta) {
      throw new Error(donde + ": el cuadro del perfil (" + medio + ") tiene que caer entre " + desde +
                      " y " + hasta + ": es donde la tarjeta mide cero y el corte se puede esconder.");
    }
    var sobrepaso = o.sobrepaso === undefined ? 5 : o.sobrepaso;
    var eje = o.eje === undefined ? "y" : o.eje;
    var propCara = eje === "x" ? G.rotX(o.cara) : G.rotY(o.cara);
    var propDorso = eje === "x" ? G.rotX(o.dorso) : G.rotY(o.dorso);
    var vuelta = positivo(o.vuelta === undefined ? 4 : entero(o.vuelta, "vuelta", donde), "vuelta", donde);
    if (hasta - medio <= vuelta) {
      throw new Error(donde + ": el tramo del dorso dura " + (hasta - medio) + " cuadros y el sobrepaso " +
                      "se come " + vuelta + ". Alargá el volteo o bajá `vuelta`.");
    }
    G.claves(propCara, [[desde, 0, curva(o.curvaIda === undefined ? "C3" : o.curvaIda, donde)],
                        [medio, -90]], donde + " cara");
    G.claves(propDorso, [[medio, 90, curva(o.curvaVuelta === undefined ? "C1" : o.curvaVuelta, donde)],
                         [hasta - vuelta, -sobrepaso, "C8"], [hasta, 0]], donde + " dorso");
    cortarOpacidad(o.cara, medio, false, donde + " cara");
    cortarOpacidad(o.dorso, medio, true, donde + " dorso");
    G.anotar("X08b|" + donde + "|perfil en " + medio + "|sobrepaso " + sobrepaso + " grados");
    return { cara: o.cara, dorso: o.dorso, cuadroDeCambio: medio };
  };

  // ==============================================================================================
  // X09 · ATRAVESAR (push-through) — NO SE PUEDE, Y TIRA
  // ==============================================================================================
  //
  // La camara entra en un panel y del otro lado hay una escena nueva, sin cortar el plano. Exige que la
  // escena vieja deje de dibujarse cuando la camara la pasa, y eso lo hace la PROFUNDIDAD.
  //
  // Aca la capa que queda atras se sigue dibujando segun su indice, para siempre. Y encima el plano
  // cercano del reproductor (`near = 1`) recorta a otra distancia que AE, asi que ni siquiera falla
  // igual en los dos lados: en AE se ve una cosa y en el video otra.
  api.atravesar = function (o) {
    throw new Error("X09 atravesar (push-through): NO SE PUEDE en este motor. La capa que la camara " +
                    "deja atras se sigue dibujando segun su INDICE (LEY 1: la Z no ocluye), asi que la " +
                    "escena vieja no desaparece al pasarla; y el plano cercano del reproductor recorta " +
                    "a otra distancia que AE, o sea que AE y el video ni siquiera se rompen igual. " +
                    "REEMPLAZO: Gx.atravesarPorCorte — el mismo viaje en Z con un corte seco en el " +
                    "cuadro del cruce. Es un corte disfrazado y hay que llamarlo por su nombre, pero " +
                    "funciona y se ve igual, porque en el cuadro del cruce el portal tapa el cuadro.");
  };

  // EL REEMPLAZO DE X09. El viaje en Z de verdad, y un corte en el cuadro en que el portal tapa todo.
  //
  // TRES COSAS QUE ESTA FUNCION CALCULA Y QUE A OJO SALEN MAL:
  //
  //   · LA CURVA DE UN ZOOM NO ES UN EASE COMUN. El tamano aparente crece con el inverso de la
  //     distancia, asi que velocidad percibida constante exige velocidad real CRECIENTE. Va C3
  //     (arranca lento, se dispara). Con C1 el zoom se frena justo cuando deberia acelerar y se lee
  //     como una grua, no como una caida.
  //   · EL CORTE TIENE QUE CAER ANTES DE QUE EL PORTAL SE COMA LA CAMARA. Se lee la Z que quedo
  //     escrita —con la interpolacion de AE, no con la mia— y se exige margen contra el ojo.
  //   · NADA PUEDE PASAR DETRAS DE LA CAMARA. Una capa 3D detras del ojo se proyecta invertida y
  //     `marco-check` la cuenta como miles de px fuera de cuadro.
  api.atravesarPorCorte = function (o) {
    o = o || {};
    var donde = o.donde || "X09b atravesarPorCorte";
    var desde = entero(o.desde, "desde", donde);
    var hasta = entero(o.hasta, "hasta", donde);
    var corte = entero(o.corte === undefined ? hasta : o.corte, "corte", donde);
    var mundo = comoLista(o.mundo), entra = comoLista(o.entra);
    if (mundo.length < 1) {
      throw new Error(donde + ": falta `mundo`, las capas de la escena que se atraviesa.");
    }
    if (!o.portal) {
      throw new Error(donde + ": falta `portal`, la capa por la que se entra. Es la que tiene que tapar " +
                      "el cuadro en el cuadro del corte; sin ella no se cual medir.");
    }
    if (corte <= desde || corte > hasta) {
      throw new Error(donde + ": el corte (" + corte + ") tiene que caer entre " + desde + " y " + hasta);
    }
    ritmo(hasta - desde, 20, 40, "el viaje", donde);
    if (o.zDesde === undefined || o.zHasta === undefined) {
      throw new Error(donde + ": faltan `zDesde` y `zHasta`, el recorrido en Z del mundo. Positivo es " +
                      "lejos: para atravesar, `zHasta` es MENOR que `zDesde`.");
    }
    var margen = o.margen === undefined ? 60 : o.margen;
    var dist = G.distanciaCamara();
    var cur = curva(o.curva === undefined ? "C3" : o.curva, donde);
    var nul = nuloIdentidad((o.nombre || "atravesar") + "-mundo", true);
    var i;
    for (i = 0; i < mundo.length; i++) {
      if (!mundo[i].threeDLayer) {
        throw new Error(donde + ": '" + mundo[i].name + "' es 2D y no viaja en Z. Una capa 2D se dibuja " +
                        "despues de todo el mundo 3D y ademas no tiene profundidad que animar.");
      }
      colgarQuieto(mundo[i], nul, donde);
      heredarObturador(mundo[i], o);
    }
    var e = G.ejes(nul);
    if (!e.z) { throw new Error(donde + ": el nulo no expone posicion en Z"); }
    G.claves(e.z, [[desde, o.zDesde, cur], [hasta, o.zHasta]], donde + " z del mundo");

    // se lee de vuelta lo que quedo escrito: la interpolacion la hace AE, no yo
    var zPortal = zDe(o.portal, corte / G.fps());
    var zNulo = e.z.valueAtTime(corte / G.fps(), false);
    var dCorte = zPortal + zNulo + dist;
    if (dCorte <= margen) {
      throw new Error(donde + ": en el cuadro del corte (" + corte + ") el portal esta a " +
                      Math.round(dCorte) + " unidades de la camara y el margen es " + margen +
                      ". Mas cerca que eso el plano cercano del reproductor (near = 1) lo recorta a otra " +
                      "distancia que AE, y si cruza el cero se proyecta invertido. Corta antes o " +
                      "acercá menos: con zHasta >= " + Math.round(o.zHasta + (margen - dCorte)) + " entra.");
    }
    for (i = 0; i < mundo.length; i++) { cortarOpacidad(mundo[i], corte, false, donde + " sale"); }
    for (i = 0; i < entra.length; i++) { cortarOpacidad(entra[i], corte, true, donde + " entra"); }
    G.anotar("X09b|" + donde + "|z " + o.zDesde + "->" + o.zHasta + "|corte " + corte +
             "|portal a " + Math.round(dCorte) + " del ojo");
    return { nulo: nul, cuadroDeCambio: corte, distanciaEnElCorte: dCorte };
  };

  // ==============================================================================================
  // X10 · DESTELLO
  // ==============================================================================================
  //
  // El cuadro se lava a blanco (o al color de marca) dos o tres cuadros y vuelve con contenido nuevo.
  // Es el corte mas honesto que existe: no disimula, acentua. Y es el sustituto legitimo de la
  // transicion por luminancia, que no tenemos.
  //
  // LA SUBIDA VA LINEAL Y LA FUNCION NO ACEPTA OTRA COSA. Un destello con ease de entrada no golpea:
  // se enciende. Son 2-3 cuadros; cualquier suavizado se come el gesto entero. La bajada si lleva
  // curva, y es donde vive el aire.
  //
  // Y DOS COSAS QUE LO SACAN DE "PINTURA BLANCA":
  //   · MODO ANADIR. Un destello dibujado en Normal es un rectangulo blanco tapando; dibujado como
  //     suma es luz. Anadir es uno de los pocos modos que el exportador deja pasar, justamente porque
  //     es la familia de la luz (`exportar.jsx:840-843`).
  //   · EL RESPLANDOR SE DECLARA EN EL COMENTARIO DE LA CAPA: "brillo <fuerza> <radio> <umbral>", que
  //     es la sintaxis que lee el exportador. No es un efecto de AE —los nombres de propiedad de
  //     efecto estan traducidos y fallan mudos en una interfaz en español—: es texto del autor.
  api.destello = function (o) {
    o = o || {};
    var donde = o.donde || "X10 destello";
    var pico = entero(o.pico, "pico", donde);
    if (o.subida === undefined) { o.subida = 3; }
    if (o.bajada === undefined) { o.bajada = 8; }
    var subida = positivo(entero(o.subida, "subida", donde), "subida", donde);
    var bajada = positivo(entero(o.bajada, "bajada", donde), "bajada", donde);
    ritmo(subida, 2, 3, "la subida", donde);
    ritmo(bajada, 6, 10, "la bajada", donde);
    if (pico - subida < 0) { throw new Error(donde + ": el destello arrancaria en el cuadro " + (pico - subida)); }
    if (o.curvaSubida !== undefined && curva(o.curvaSubida, donde) !== "LINEAL") {
      throw new Error(donde + ": pediste '" + o.curvaSubida + "' para la subida del destello. Va LINEAL: " +
                      "son 2-3 cuadros y con ease de entrada el destello no golpea, se enciende.");
    }
    var color = o.color || [1, 1, 1];
    var tope = o.opacidad === undefined ? 100 : o.opacidad;
    var capa = G.solido(o.nombre || "destello", color, G.ancho() + 8, G.alto() + 8,
                        G.ancho() / 2, G.alto() / 2);
    if (comoLista(o.cubre).length > 0) { registrar(capa, o.cubre, donde); }
    if (o.aditivo !== false) {
      try { capa.blendingMode = BlendingMode.ADD; } catch (exB) {
        G.avisar(donde + ": no se pudo poner el modo Anadir (" + exB.message + "). En Normal el " +
                 "destello se lee como pintura blanca, no como luz.");
      }
    }
    if (o.brillo !== false) {
      var b = o.brillo || [1.4, 0.7, 0.55];
      capa.comment = "brillo " + b[0] + " " + b[1] + " " + b[2];
    }
    G.claves(G.op(capa), [[pico - subida, 0, "LINEAL"], [pico, tope,
             curva(o.curvaBajada === undefined ? "C1" : o.curvaBajada, donde)],
             [pico + bajada, 0]], donde + " opacidad");
    G.plano(capa, pico - subida, pico + bajada);
    G.anotar("X10|" + donde + "|pico " + pico + "|" + subida + " arriba / " + bajada + " abajo|" +
             (o.aditivo !== false ? "anadir" : "normal"));
    return { capa: capa, cuadroDeCambio: pico, cobertura: [pico, pico] };
  };

  // ==============================================================================================
  // X11 · MATCH CUT CALCULADO
  // ==============================================================================================
  //
  // Un objeto se convierte en otro porque los dos ocupan el mismo lugar en el cuadro del cambio. No es
  // una funcion de AE: es disciplina de autoria. Nada se anima DURANTE la transicion; lo que hay es una
  // caja que coincide.
  //
  // LA VENTAJA PROPIA, y es la razon de que esto sea una funcion y no un parrafo: `sourceRectAtTime`
  // nos da la caja medida, asi que la escala a la que un panel coincide con el ancho de una palabra se
  // CALCULA. Emparejar a ojo dos cosas que se ven un solo cuadro es exactamente donde el ojo no sirve.
  //
  // LAS CUATRO CUENTAS QUE HAY QUE HACER Y QUE A MANO SE OLVIDAN:
  //   1. `sourceRectAtTime` devuelve la CAJA DE TINTA en coordenadas de la capa, no el tamano de la
  //      capa. Para un texto centrado, `left` es negativo.
  //   2. La caja de tinta se mide desde el ANCLAJE, asi que la posicion de la capa no es el centro de
  //      su tinta salvo que el anclaje este ahi.
  //   3. Dos capas a distinta Z con la misma escala NO miden lo mismo: hay que multiplicar por el
  //      factor de proyeccion DIST/(z+DIST). Sin eso, una capa en z=600 sale 20% mas chica y parece un
  //      error de medicion.
  //   4. La continuidad: si el saliente venia girando a X grados por cuadro, el entrante sigue a X
  //      grados por cuadro DESDE ESE ANGULO. Se lee la velocidad real y se escribe.
  api.medirCaja = function (capa, cuadro, donde) {
    donde = donde || "medirCaja";
    var t = cuadro / G.fps(), r, rx = 0, ry = 0, ori = null, rz = 0;
    if (capa.nullLayer) {
      throw new Error(donde + ": '" + capa.name + "' es un nulo y no tiene caja: un nulo no dibuja nada.");
    }
    if (capa.parent) {
      throw new Error(donde + ": '" + capa.name + "' cuelga de '" + capa.parent.name + "'. Su posicion y " +
                      "su anclaje estan en el espacio del padre, asi que la caja que yo calcularia no " +
                      "es la que se ve. Medí y encajá el nulo padre, o desemparentala.");
    }
    try { r = capa.sourceRectAtTime(t, false); } catch (exR) {
      throw new Error(donde + ": '" + capa.name + "' no tiene caja medible: " + exR.message);
    }
    try { rx = G.rotX(capa).valueAtTime(t, false); } catch (exX) { rx = 0; }
    try { ry = G.rotY(capa).valueAtTime(t, false); } catch (exY) { ry = 0; }
    try { ori = G.ori(capa).valueAtTime(t, false); } catch (exO) { ori = null; }
    try { rz = G.rotZ(capa).valueAtTime(t, false); } catch (exZ2) { rz = 0; }
    if (Math.abs(rx) > 0.5 || Math.abs(ry) > 0.5 ||
        (ori !== null && (Math.abs(ori[0]) > 0.5 || Math.abs(ori[1]) > 0.5))) {
      throw new Error(donde + ": '" + capa.name + "' esta girada en X o en Y (" + un(rx) + ", " + un(ry) +
                      "). En escorzo su caja proyectada no es su caja de tinta escalada, y cualquier " +
                      "numero que yo devuelva seria mentira. Un match cut se hace de frente.");
    }
    var esc = G.esc(capa).valueAtTime(t, false);
    var anc = G.anc(capa).valueAtTime(t, false);
    var pos = leerPos(capa, t);
    var z = (capa.threeDLayer && pos.length > 2 && pos[2] !== undefined) ? pos[2] : 0;
    var f = factorZ(capa, z, donde);
    var cxL = r.left + r.width / 2, cyL = r.top + r.height / 2;
    if (Math.abs(rz) > 0.5 && (Math.abs(cxL - anc[0]) > 0.5 || Math.abs(cyL - anc[1]) > 0.5)) {
      throw new Error(donde + ": '" + capa.name + "' esta girada " + un(rz) + " grados en Z y su anclaje " +
                      "no esta en el centro de su tinta (esta a " + Math.round(cxL - anc[0]) + ", " +
                      Math.round(cyL - anc[1]) + "). Girada, la tinta se va a otro lado y mi cuenta no " +
                      "lo ve. Poné el anclaje en el centro de la tinta —que es lo que un match cut " +
                      "quiere igual— y la cuenta vuelve a valer.");
    }
    var A = G.ancho() / 2, B = G.alto() / 2;
    var cxM = pos[0] + (cxL - anc[0]) * esc[0] / 100;
    var cyM = pos[1] + (cyL - anc[1]) * esc[1] / 100;
    return { x: A + (cxM - A) * f, y: B + (cyM - B) * f,
             w: r.width * esc[0] / 100 * f, h: r.height * esc[1] / 100 * f,
             escala: esc, ancla: anc, pos: pos, z: z, factor: f, tinta: r, giro: rz };
  };

  function ponerPos(capa, x, y, z) {
    var tr = G.tr(capa), sep = false;
    try { sep = G.pos(capa).dimensionsSeparated ? true : false; } catch (exS) { sep = false; }
    if (!sep) {
      if (capa.threeDLayer) { G.pos(capa).setValue([x, y, z]); } else { G.pos(capa).setValue([x, y]); }
      return;
    }
    tr.property("ADBE Position_0").setValue(x);
    tr.property("ADBE Position_1").setValue(y);
    if (capa.threeDLayer) {
      try { tr.property("ADBE Position_2").setValue(z); } catch (exZ) {}
    }
  }

  function sinClaves(prop, capa, que, donde) {
    if (prop && prop.numKeys > 0) {
      throw new Error(donde + ": '" + capa.name + "' ya tiene claves de " + que + ", y encajarla las " +
                      "pisaria a medias. Encajá primero y animá despues; o pedí `soloCalcular` y usá " +
                      "los numeros que devuelvo.");
    }
  }

  api.encajar = function (o) {
    o = o || {};
    var donde = o.donde || "X11 encajar";
    var capa = o.capa, caja = o.caja;
    if (!capa || !caja) { throw new Error(donde + ": faltan `capa` o `caja`"); }
    var cuadro = entero(o.cuadro, "cuadro", donde);
    var ajuste = o.ajuste === undefined ? "ancho" : o.ajuste;
    var m = api.medirCaja(capa, cuadro, donde);
    if (m.w <= 0 || m.h <= 0) {
      throw new Error(donde + ": '" + capa.name + "' mide 0 en el cuadro " + cuadro + ": no hay tinta " +
                      "que encajar. Si es un texto, fijate que ya exista en ese cuadro.");
    }
    var sx, sy, k;
    if (ajuste === "ancho") { k = caja.w / m.w; sx = m.escala[0] * k; sy = m.escala[1] * k; }
    else if (ajuste === "alto") { k = caja.h / m.h; sx = m.escala[0] * k; sy = m.escala[1] * k; }
    else if (ajuste === "caja") {
      sx = m.escala[0] * caja.w / m.w; sy = m.escala[1] * caja.h / m.h;
      if (Math.abs(sx - sy) > 0.5) {
        G.avisar(donde + ": `ajuste` caja deja la escala en " + un(sx) + " x " + un(sy) + ". Sobre " +
                 "tipografia eso es deformacion, no encaje: en texto usá 'ancho'.");
      }
    } else {
      throw new Error(donde + ": `ajuste` es 'ancho', 'alto' o 'caja', y vino '" + ajuste + "'");
    }
    var A = G.ancho() / 2, B = G.alto() / 2;
    var cxL = m.tinta.left + m.tinta.width / 2, cyL = m.tinta.top + m.tinta.height / 2;
    var cxM = A + (caja.x - A) / m.factor, cyM = B + (caja.y - B) / m.factor;
    var px = cxM - (cxL - m.ancla[0]) * sx / 100;
    var py = cyM - (cyL - m.ancla[1]) * sy / 100;
    var res = { escala: capa.threeDLayer ? [sx, sy, 100] : [sx, sy], posicion: [px, py, m.z],
                caja: caja, medida: m };
    if (o.soloCalcular) { return res; }
    sinClaves(G.esc(capa), capa, "escala", donde);
    // con dimensiones separadas la posicion entera dice numKeys 0 aunque posX este llena de claves:
    // hay que preguntarle a las tres pistas o el aviso no salta nunca
    sinClaves(G.pos(capa), capa, "posicion", donde);
    var trE = G.tr(capa), sepE = false, ejeE;
    try { sepE = G.pos(capa).dimensionsSeparated ? true : false; } catch (exSe) { sepE = false; }
    if (sepE) {
      var nombresEje = ["ADBE Position_0", "ADBE Position_1", "ADBE Position_2"];
      for (k = 0; k < 3; k++) {
        ejeE = null;
        try { ejeE = trE.property(nombresEje[k]); } catch (exPe) { ejeE = null; }
        sinClaves(ejeE, capa, "posicion (eje " + k + ")", donde);
      }
    }
    G.esc(capa).setValue(res.escala);
    ponerPos(capa, px, py, m.z);
    return res;
  };

  api.matchCut = function (o) {
    o = o || {};
    var donde = o.donde || "X11 matchCut";
    var cuadro = entero(o.cuadro, "cuadro", donde);
    if (!o.saliente || !o.entrante) { throw new Error(donde + ": faltan `saliente` y/o `entrante`"); }
    var caja = api.medirCaja(o.saliente, cuadro, donde + " saliente");

    // LA CONTINUIDAD DEL GIRO, y es lo que separa un match cut de dos animaciones pegadas: si el
    // saliente llegaba girando, el entrante ARRANCA girando igual, desde el mismo angulo. Se mide la
    // velocidad real de llegada (diferencia hacia atras, un cuadro) en vez de suponerla.
    var w = 0, ang = caja.giro;
    if (o.continuarGiro !== false && cuadro >= 1) {
      try {
        var rzS = G.rotZ(o.saliente);
        if (rzS && rzS.numKeys > 1) {
          w = (rzS.valueAtTime(cuadro / G.fps(), false) -
               rzS.valueAtTime((cuadro - 1) / G.fps(), false)) * G.fps();
        }
      } catch (exW) { w = 0; }
    }
    var rzE = null;
    try { rzE = G.rotZ(o.entrante); } catch (exE) { rzE = null; }
    if (rzE) {
      if (Math.abs(w) > 0.05) {
        var n = o.cuadrosDeGiro === undefined ? 12 : entero(o.cuadrosDeGiro, "cuadrosDeGiro", donde);
        sinClaves(rzE, o.entrante, "rotacion en Z", donde);
        G.claves(rzE, [[cuadro, ang, "LINEAL"], [cuadro + n, ang + w * n / G.fps()]],
                 donde + " continuidad de giro");
      } else if (Math.abs(ang) > 0.01 && rzE.numKeys === 0) {
        rzE.setValue(ang);
      }
    }

    var enc = api.encajar({ donde: donde, capa: o.entrante, caja: caja, cuadro: cuadro,
                            ajuste: o.ajuste, soloCalcular: o.soloCalcular });
    if (o.opacidad !== false && !o.soloCalcular) {
      cortarOpacidad(o.saliente, cuadro, false, donde + " saliente");
      cortarOpacidad(o.entrante, cuadro, true, donde + " entrante");
    }
    G.anotar("X11|" + donde + "|caja " + Math.round(caja.w) + "x" + Math.round(caja.h) + " en (" +
             Math.round(caja.x) + "," + Math.round(caja.y) + ")|escala entrante " + un(enc.escala[0]) +
             "|giro " + un(ang) + " a " + un(w) + " grados/s");
    return { caja: caja, escala: enc.escala, posicion: enc.posicion, giro: ang, velocidadGiro: w,
             cuadroDeCambio: cuadro };
  };

  // ==============================================================================================
  // X12 · SUSTITUCION BAJO TAPA
  // ==============================================================================================
  //
  // No hubo corte, pero cambio. Mientras algo tapa una region —una tapa, un bloque, un objeto que
  // cruza— el contenido de esa region se sustituye. La tapa se va y hay otra cosa.
  //
  // ES EL MECANISMO QUE ESTA CADENA SOPORTA MEJOR Y QUE MENOS SE USA, y es lo que hace que una pieza
  // sin cortes no sea papilla: la transicion no es un efecto entre dos planos, es un relevo adentro de
  // uno solo.
  //
  // LO QUE ESTA FUNCION VERIFICA Y QUE ES TODO EL RIESGO DEL GESTO: que el cambio caiga ADENTRO de la
  // ventana en que la tapa tapa de verdad. Un cuadro antes o despues y se ve cambiar, que es
  // exactamente lo que el gesto promete que no pasa. Por eso X01, X02, X03 y X06 devuelven `cobertura`
  // ya calculada: se le pasa entera y no hay nada que estimar.
  api.sustitucionBajoTapa = function (o) {
    o = o || {};
    var donde = o.donde || "X12 sustitucionBajoTapa";
    var cuadro = entero(o.cuadro, "cuadro", donde);
    var cob = o.cobertura;
    if (!cob || cob.length !== 2) {
      throw new Error(donde + ": falta `cobertura`, la ventana [primerCuadro, ultimoCuadro] en que la " +
                      "tapa cubre de verdad. No la estimo: X01, X02, X03 y X06 la devuelven calculada, " +
                      "pasale esa. Si la tapa la construiste a mano, la ventana es tuya de medir.");
    }
    if (cuadro < cob[0] || cuadro > cob[1]) {
      throw new Error(donde + ": el cambio cae en el cuadro " + cuadro + " y la tapa cubre de " + cob[0] +
                      " a " + cob[1] + ". Fuera de esa ventana el espectador VE cambiar el contenido, " +
                      "que es lo unico que este gesto promete que no pasa. Movelo adentro, o alargá la " +
                      "retencion de la tapa.");
    }
    if (cob[1] - cob[0] < 1) {
      G.avisar(donde + ": la ventana de cobertura dura " + (cob[1] - cob[0] + 1) + " cuadro. Alcanza, " +
               "pero no hay margen: un cuadro de error en cualquier lado y el cambio se ve.");
    }
    var sale = comoLista(o.sale), entra = comoLista(o.entra), i, t = cuadro / G.fps();
    if (sale.length + entra.length < 1) {
      throw new Error(donde + ": no hay nada que sustituir: `sale` y `entra` estan vacios.");
    }
    for (i = 0; i < entra.length; i++) {
      if (entra[i].inPoint > t + 1e-9) {
        throw new Error(donde + ": '" + entra[i].name + "' recien entra en el cuadro " +
                        Math.round(entra[i].inPoint * G.fps()) + " y el cambio es en el " + cuadro +
                        ": levantarle la opacidad no muestra nada porque la capa todavia no existe. " +
                        "Y ojo con arreglarlo moviendo el inPoint si es una capa de forma: por la LEY 7 " +
                        "una forma con inPoint > 0 puede rasterizar vacia. La visibilidad va por " +
                        "opacidad, que es lo que hace esta funcion.");
      }
    }
    for (i = 0; i < sale.length; i++) {
      if (sale[i].outPoint < t - 1e-9) {
        throw new Error(donde + ": '" + sale[i].name + "' ya termino en el cuadro " +
                        Math.round(sale[i].outPoint * G.fps()) + ", antes del cambio del " + cuadro +
                        ": no hay nada que ocultar y el hueco se vio antes de que llegara la tapa.");
      }
    }
    for (i = 0; i < sale.length; i++) { cortarOpacidad(sale[i], cuadro, false, donde + " sale"); }
    for (i = 0; i < entra.length; i++) { cortarOpacidad(entra[i], cuadro, true, donde + " entra"); }
    G.anotar("X12|" + donde + "|cambio " + cuadro + " dentro de " + cob[0] + "-" + cob[1] + "|" +
             sale.length + " salen, " + entra.length + " entran");
    return { cuadro: cuadro, cobertura: cob, sale: sale, entra: entra };
  };

  return api;
})();
