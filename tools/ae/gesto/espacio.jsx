// ================================================================================================
// GESTO · ESPACIO Y CAMARA  —  familia C del catalogo (C00 a C14)
// ================================================================================================
//
// QUE ES ESTO. Quince tecnicas de espacio: la matematica de la camara, los movimientos con nombre
// propio, la construccion del volumen (multiplano, nube, escalonado en profundidad) y la sombra de
// contacto. Cada una es una funcion que CONSTRUYE y DEVUELVE lo que creo, y se apoya en el nucleo
// (`G`), que ya hace cumplir las leyes de claves, rebote, emparentado y tipografia.
//
// LO QUE ORDENA TODO EL ARCHIVO, Y NO ES UNA TECNICA: LA PROPORCION.
//
//   La camara aporta <=20% de la energia de la pieza, y <=35% en cualquier ventana de 30 cuadros.
//   En numeros que se pueden medir al construir: la camara mueve 2-3 px por cuadro sobre un punto en
//   z=0; el elemento mas rapido del plano mueve 25-30. Factor diez. Cuando esa relacion se invierte,
//   el espectador lee "me estan paseando por una maqueta" — que es, con esas palabras, el reclamo que
//   origino este catalogo.
//
//   Por eso TODA funcion de camara de este modulo calcula su desplazamiento aparente en pixeles antes
//   de escribir una sola clave. Y las separa en dos clases, porque medirlas con la misma vara es
//   insostenible — la primera version de esta compuerta reprobaba la orbita, el paneo y la grua con la
//   regla escrita para las derivas, o sea que reprobaba tres tecnicas del propio catalogo:
//
//     QUE ACOMPANA — deriva (C10), empuje de fondo (C01), travelling (C03), puntuacion (C08),
//       contragolpe (C07). TECHO DURO del 12% del ancho de cuadro. Arriba de ahi la funcion tira y
//       dice cual es el gesto narrativo que corresponde.
//     NARRATIVO — paneo (C04), orbita (C05), grua (C06), remate (C01 modo remate), dolly zoom (C02).
//       Mueven mucho porque para eso existen, asi que no tienen techo — pero EXIGEN `motivo` escrito,
//       siempre, igual que el obturador del nucleo. La regla del oficio es "movimiento motivado": el
//       que responde a algo se lee natural y el que no, decorativo. Escribirlo es lo unico que
//       convierte esa decision en una decision, en vez de en algo que ocurrio.
//
//   Y al final de la pieza, `Gc.revisar()` suma todo lo que la camara aporto y lo dice en una linea.
//   Lo que NO puede decir es el 20%: eso necesita la energia de los ELEMENTOS, que vive en las otras
//   familias y la mide `ritmo.mjs` (M5) sobre el documento exportado. Se dice, no se inventa.
//
// UNA CORRECCION AL PLAN, VERIFICADA CONTRA EL CODIGO Y NO SUPUESTA. El plan consolidado dice dos
// cosas de esta familia que el repo YA NO cumple, y autorar con ellas sale caro en las dos
// direcciones:
//
//   1. "LEY 1 — el apilado manda siempre, la Z no ocluye nunca". FALSO HOY.
//      `comp3d.html:1408-1437` ordena las capas 3D por el EJE DE LA CAMARA antes de dibujar, igual que
//      el 3D Clasico de AE, y desempata por apilado — que es tambien lo que hace AE. `ritmo.mjs` lo
//      dejo escrito al cambiar M7: un cruce en Z dejo de ser un defecto. Lo que SI quedo como riesgo
//      real es el EMPATE: dos capas que se pisan en pantalla y estan a menos de 1 unidad de
//      profundidad. Ahi no decide la profundidad sino el desempate, y nadie garantiza que AE y el
//      motor desempaten igual. Este modulo comprueba EMPATES, no cruces. Ordenar el apilado a mano
//      dejo de hacer falta.
//
//   2. "C04 pan/tilt/roll es (b), un agujero mudo del exportador". FALSO HOY.
//      `exportar.jsx:381-382` hace `es3D = (tipo === "camara") || capa.threeDLayer` — la version vieja
//      preguntaba solo por `threeDLayer`, que en una CameraLayer no existe, y por eso las rotaciones
//      de camara salian en cero sin avisar. Y `comp3d.html:1144-1147` las compone encima de la base de
//      apuntado. Paneo, inclinacion y balanceo VIAJAN. Se puede autorar hoy.
//
// LAS TRES TRAMPAS DE ESTA FAMILIA QUE CUESTAN UN RENDER ENTERO:
//
//   A. EMPARENTAR REESCRIBE VALORES. Al colgar una capa, AE le reescribe posicion y angulos para
//      conservar su transformacion en el mundo — y con claves no puede reescribirlas todas. Por eso
//      todos los nulos de este modulo se construyen como IDENTIDAD (posicion = ancla, sin giro, escala
//      100): colgar de una identidad no cambia un solo numero, ni de una capa quieta ni de una con
//      cincuenta claves. Es la unica forma de emparentar contenido ya animado sin romperlo.
//
//   B. `prop.value` DE UNA PROPIEDAD CON CLAVES ES EL VALOR EN EL TIEMPO ACTUAL DE LA COMP, no el del
//      cuadro donde arranca tu gesto. Encadenar dos movimientos leyendo `.value` da un salto que no da
//      error. Aca se lee siempre con `valorEn(prop, cuadro)`.
//
//   C. UNA CAPA 3D NO PUEDE PASAR DETRAS DE LA CAMARA, y en esta familia es LA CAMARA la que se
//      mueve: un empuje que termina 200 unidades mas cerca puede dejar el adelanto a espaldas del ojo.
//      Toda funcion que acerque la camara calcula el punto de salida contra `zCercano` y tira.
//
// LO QUE EL MOTOR NO TIENE, y por eso no aparece aca: luces (la sombra de C14 es un PNG), profundidad
// de campo real como gesto (el desenfoque de AE y el de three no coinciden al 1%: el rack focus se
// hace con doble copia, nitida y desenfocada, las dos hechas en AE), degradados, modos de fusion.
//
// UNA TRAMPA DEL VOCABULARIO: el plan habla de "C5" para la deriva y **C5 NO EXISTE en G.CURVAS** —
// C5 es influencia 0/0, o sea LINEAL, que ya es el defecto. Donde el catalogo dice C5, aca va "LINEAL".
//
// COMO SE USA
//   #include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/gesto.jsx"
//   G.iniciar({ nombre: "MI-PIEZA", cuadros: 450, recursos: "C:/ae-probe/recursos" });
//   G.camara({ distancia: 2666.67 });
//   Gc.eventos([0, 15, 30, 120, 150]);            // los arranques de los ELEMENTOS, para el desfase
//   Gc.multiplano({ planos: [...] });
//   Gc.deriva({ desde: 0, hasta: 150, unidades: -40 });
//   Gc.contragolpe({ cuadro: 152, eje: "z", magnitud: -8 });
//   Gc.revisar();
//   G.cerrar();
// ================================================================================================

var Gc = (function () {

  var api = {};

  var GRADO = Math.PI / 180;

  // ==============================================================================================
  // UTILES INTERNOS
  // ==============================================================================================

  function pedir(o, campo, donde) {
    if (o[campo] === undefined || o[campo] === null) {
      throw new Error(donde + " necesita `" + campo + "`");
    }
    return o[campo];
  }

  function un(v) { return Math.round(v * 10) / 10; }
  function pct(v) { return Math.round(v * 1000) / 10; }

  function entero(v, nombre, donde) {
    if (v === undefined || v === null) { throw new Error(donde + " necesita `" + nombre + "`"); }
    if (Math.abs(v - Math.round(v)) > 1e-9) {
      throw new Error(donde + ": `" + nombre + "` = " + v + " y tiene que ser un cuadro entero.");
    }
    return Math.round(v);
  }

  // Las bandas de duracion del catalogo no son decoracion: son la diferencia entre un gesto que se lee
  // y uno que se nota. Se tiran con el numero medido adentro para que el mensaje sirva y no solo acuse.
  function banda(v, min, max, que, donde, porque) {
    if (v < min || v > max) {
      throw new Error(donde + ": " + que + " = " + un(v) + ", y la banda es " + min + " a " + max +
                      ". " + porque);
    }
    return v;
  }

  // NADA DE Math.random. Park-Miller con semilla en las opciones: la misma semilla da la misma nube,
  // hoy y dentro de seis meses. Una perturbacion irreproducible convierte cualquier comparacion de
  // cuadros en una discusion.
  function semillero(semilla) {
    var s = Math.round(semilla) % 2147483647;
    if (s <= 0) { s = s + 2147483646; }
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  // TRAMPA B · el valor de una propiedad CON CLAVES en `.value` es el del tiempo actual de la comp, no
  // el del cuadro donde arranca el gesto. Encadenar dos movimientos leyendo `.value` da un salto que no
  // da error y que solo se ve en el video.
  //
  // Y EL SEGUNDO ARGUMENTO ES `preExpression`, EN true A PROPOSITO. Con una expresion enganchada —la
  // deriva de la nube, por ejemplo— `valueAtTime(t, false)` devuelve el valor YA CON el seno sumado, y
  // encadenar un gesto sobre eso lo deja corrido hasta la amplitud entera de la deriva. Lo que hace
  // falta para continuar un gesto es la base: el valor de las claves, sin la expresion.
  function valorEn(prop, cuadro) {
    var conExpr = false;
    try { conExpr = prop.expressionEnabled ? true : false; } catch (exX) { conExpr = false; }
    if (prop.numKeys > 0 || conExpr) { return prop.valueAtTime(cuadro / G.fps(), true); }
    return prop.value;
  }

  // ESCRIBIR UNA POSICION CUANDO LAS DIMENSIONES YA ESTAN SEPARADAS. `ADBE Position` deja de aceptar
  // valores en cuanto alguien separo los ejes, y como casi todo este modulo separa para evitar la
  // Auto-Bezier espacial, colocar una capa "a mano" despues de eso falla — o peor, no hace nada.
  function ponerPos(capa, xyz) {
    var pos = G.pos(capa);
    var sep = false;
    try { sep = pos.dimensionsSeparated ? true : false; } catch (exS) { sep = false; }
    if (!sep) {
      if (capa.threeDLayer) { pos.setValue([xyz[0], xyz[1], xyz[2]]); }
      else { pos.setValue([xyz[0], xyz[1]]); }
      return capa;
    }
    var tr = G.tr(capa);
    tr.property("ADBE Position_0").setValue(xyz[0]);
    tr.property("ADBE Position_1").setValue(xyz[1]);
    try { tr.property("ADBE Position_2").setValue(xyz[2]); } catch (exZ) { }
    return capa;
  }

  // Dos gestos escribiendo el mismo tramo de la misma propiedad no dan error: el segundo pisa claves
  // del primero y el gesto desaparece. Se mira la propiedad de verdad, no un registro propio, asi que
  // tambien caza lo que escribio otro modulo.
  function libre(prop, desde, hasta, donde, que) {
    var k, t;
    for (k = 1; k <= prop.numKeys; k++) {
      t = prop.keyTime(k) * G.fps();
      if (t > desde + 0.5 && t < hasta - 0.5) {
        throw new Error(donde + ": " + que + " ya tiene una clave en el cuadro " + Math.round(t) +
                        ", adentro del tramo " + desde + "-" + hasta + " que estas por escribir. AE no " +
                        "avisa: pisa la clave y el gesto anterior desaparece. Movelo, o llevalo a la " +
                        "plataforma con `sobre: \"plataforma\"`.");
      }
    }
  }

  // ==============================================================================================
  // LA CAMARA
  // ==============================================================================================

  // ==============================================================================================
  // EL ESTADO DEL MODULO, Y POR QUE SE REINICIA SOLO
  // ==============================================================================================
  //
  // Este modulo recuerda tres cosas entre llamadas: la plataforma que sostiene la camara, los arranques
  // de elemento declarados, y el presupuesto que la camara lleva gastado. En una pieza que corre una
  // vez eso esta bien. Pero `G.iniciar` se puede llamar dos veces en la misma sesion —una prueba, dos
  // variantes, un barrido— y entonces la plataforma de la comp ANTERIOR sigue en memoria: se le
  // escriben claves a una capa que ya no esta en ninguna composicion, sin un solo error, y los gestos
  // de la pieza nueva no mueven nada.
  //
  // No es hipotetico: aparecio en el banco de pruebas a la tercera composicion, y el sintoma era una
  // compuerta acusando choque de claves en un cuadro donde la pieza nueva no habia escrito nada.
  var LA_COMP = null;
  function sincronizar() {
    var c = G.comp();
    if (LA_COMP !== c) {
      LA_COMP = c;
      LA_PLATAFORMA = null;
      APORTE = [];
      EVENTOS = null;
      avisadoSinEventos = false;
    }
  }

  function laCamara(o, donde) {
    sincronizar();
    if (o && o.camara) { return o.camara; }
    var c = G.comp(), i, hallada = null, cuantas = 0;
    for (i = 1; i <= c.numLayers; i++) {
      if (c.layer(i) instanceof CameraLayer) { cuantas = cuantas + 1; hallada = c.layer(i); }
    }
    if (cuantas === 0) {
      throw new Error(donde + ": no hay camara en la composicion. Llama a G.camara({ distancia: ... }) " +
                      "antes — y ojo, sin camara las capas 3D se dibujan con proyeccion ortografica y " +
                      "todo el paralaje de esta familia vale cero.");
    }
    if (cuantas > 1) {
      throw new Error(donde + ": hay " + cuantas + " camaras en la composicion y no puedo elegir. AE " +
                      "usa la de mas arriba en el apilado y el exportador vuelca la PRIMERA que " +
                      "encuentra: dos camaras es un documento que no se sabe leer. Pasa `camara:` " +
                      "explicitamente o deja una sola.");
    }
    return hallada;
  }

  function opciones(cam) {
    var opc = null;
    try { opc = cam.property("ADBE Camera Options Group"); } catch (exO) { opc = null; }
    return opc;
  }

  function zoomEn(cam, cuadro) {
    var opc = opciones(cam);
    if (opc === null) { return G.distanciaCamara(); }
    var p = null;
    try { p = opc.property("ADBE Camera Zoom"); } catch (exZ) { p = null; }
    if (p === null) { return G.distanciaCamara(); }
    return valorEn(p, cuadro);
  }

  // Con dimensiones separadas `ADBE Position` deja de ser la fuente: hay que leer las tres pistas o el
  // gesto se calcula contra un valor viejo.
  function posEn(capa, cuadro) {
    var pos = G.pos(capa);
    var sep = false;
    try { sep = pos.dimensionsSeparated ? true : false; } catch (exS) { sep = false; }
    if (!sep) {
      var v = valorEn(pos, cuadro);
      return [v[0], v[1], v.length > 2 ? v[2] : 0];
    }
    var tr = G.tr(capa);
    var z = 0;
    try { z = valorEn(tr.property("ADBE Position_2"), cuadro); } catch (exZ2) { z = 0; }
    return [valorEn(tr.property("ADBE Position_0"), cuadro),
            valorEn(tr.property("ADBE Position_1"), cuadro), z];
  }

  // LA POSICION DE UNA CAPA COLGADA ES LOCAL, NO DEL MUNDO — y todas las cuentas de esta familia son
  // distancias al ojo, o sea del mundo. En cuanto la camara cuelga de la plataforma, `posEn(cam)`
  // deja de decir donde esta: dice donde esta RESPECTO DE SU SOPORTE. Con la plataforma quieta da
  // igual; en cuanto la plataforma deriva, la cuenta queda vieja y nada avisa.
  //
  // Con padres sin giro la composicion es una suma: mundo = (local − ancla)·escala + posicion. Con un
  // padre GIRADO (el nulo de la orbita) hace falta la matriz entera, y antes que devolver un numero
  // plausible se devuelve `null` y decide quien llama. Un numero plausible es peor que no tenerlo.
  function posMundoEn(capa, cuadro) {
    var p = posEn(capa, cuadro);
    var padre = capa.parent, guarda = 0;
    while (padre !== null && padre !== undefined && guarda < 12) {
      var rx = 0, ry = 0, rz = 0, or = [0, 0, 0];
      try { rx = G.rotX(padre).value; ry = G.rotY(padre).value; rz = G.rotZ(padre).value; } catch (e1) { }
      try { or = G.ori(padre).value; } catch (e2) { or = [0, 0, 0]; }
      if (Math.abs(rx) > 1e-6 || Math.abs(ry) > 1e-6 || Math.abs(rz) > 1e-6 ||
          Math.abs(or[0]) > 1e-6 || Math.abs(or[1]) > 1e-6 || Math.abs(or[2]) > 1e-6) { return null; }
      var pp = posEn(padre, cuadro);
      var an = G.anc(padre).value;
      var es = G.esc(padre).value;
      var az = an.length > 2 ? an[2] : 0;
      p = [(p[0] - an[0]) * es[0] / 100 + pp[0],
           (p[1] - an[1]) * es[1] / 100 + pp[1],
           (p[2] - az) * (es.length > 2 ? es[2] : 100) / 100 + pp[2]];
      padre = padre.parent;
      guarda = guarda + 1;
    }
    return p;
  }

  function mundoDe(capa, cuadro, donde) {
    var p = posMundoEn(capa, cuadro);
    if (p === null) {
      throw new Error(donde + ": '" + capa.name + "' cuelga de un aparejo GIRADO (tipico despues de " +
                      "C05 orbita), asi que su posicion en el mundo pide la matriz entera y no la " +
                      "calculo aca. Todas las distancias de esta familia son al ojo: con un numero " +
                      "local, el empuje, el foco y el punto de salida salen todos corridos. Autora el " +
                      "gesto antes de colgar la camara de la orbita, o hacelo sobre el nulo de la orbita.");
    }
    return p;
  }

  // SEPARAR DIMENSIONES NO ES UN CAPRICHO: es lo que evita que AE le invente una curvatura al camino.
  // Con la posicion entera, tres o mas claves interpolan en Auto-Bezier ESPACIAL — una curva que el
  // documento no lleva y que el motor no reproduce, asi que AE y el reproductor divergen en silencio.
  // El reproductor ya contempla la camara con dimensiones separadas (`comp3d.html:1098`).
  function ejesDe(capa, donde) {
    var e = null;
    try { e = G.ejes(capa); } catch (exE) {
      throw new Error(donde + ": no pude separar las dimensiones de la posicion de '" + capa.name +
                      "'. Sin separar, tres claves de posicion interpolan en Auto-Bezier ESPACIAL y " +
                      "el camino de AE deja de ser el del motor, sin ningun aviso.");
    }
    if (e.z === null) {
      throw new Error(donde + ": '" + capa.name + "' no tiene eje Z. Prendele el interruptor 3D " +
                      "(`capa.threeDLayer = true`) antes de moverla en profundidad.");
    }
    return e;
  }

  // ==============================================================================================
  // NULOS DE IDENTIDAD  —  la respuesta a la trampa A
  // ==============================================================================================
  //
  // Un nulo con posicion = ancla, sin giro y con escala 100 tiene matriz IDENTIDAD: colgar de el no
  // cambia un solo numero del hijo, tenga claves o no. Y como el ancla queda donde uno la puso, los
  // giros y las escalas del nulo pivotean AHI — por eso el nulo del mundo va con ancla y posicion en el
  // centro del cuadro y no en el origen: escalar el mundo desde la esquina superior izquierda empuja
  // todo hacia abajo y a la derecha, que es un defecto que se ve y no se entiende.
  function nuloIdentidad(nombre, x, y, z) {
    var n = G.comp().layers.addNull(G.cuadros() / G.fps());
    n.name = nombre;
    n.threeDLayer = true;
    G.anc(n).setValue([x, y, z]);
    G.pos(n).setValue([x, y, z]);
    G.esc(n).setValue([100, 100, 100]);
    G.ori(n).setValue([0, 0, 0]);
    return n;
  }

  function esIdentidad(nulo) {
    var p = posEn(nulo, 0), a = G.anc(nulo).value, e = G.esc(nulo).value;
    var o = [0, 0, 0], rx = 0, ry = 0, rz = 0;
    try { o = G.ori(nulo).value; } catch (e1) { o = [0, 0, 0]; }
    try { rx = G.rotX(nulo).value; ry = G.rotY(nulo).value; rz = G.rotZ(nulo).value; } catch (e2) { }
    var ancla = [a[0], a[1], a.length > 2 ? a[2] : 0];
    var esc = [e[0], e[1], e.length > 2 ? e[2] : 100];
    var i;
    for (i = 0; i < 3; i++) {
      if (Math.abs(p[i] - ancla[i]) > 1e-6) { return false; }
      if (Math.abs(esc[i] - 100) > 1e-6) { return false; }
      if (Math.abs(o[i]) > 1e-6) { return false; }
    }
    return Math.abs(rx) < 1e-6 && Math.abs(ry) < 1e-6 && Math.abs(rz) < 1e-6;
  }

  // COLGAR SIN TOCAR NADA. `G.colgar` pone la orientacion y las tres rotaciones del hijo en cero, y eso
  // es exactamente lo que hay que hacer al armar un aparejo (el panel tiene que quedar plano en el
  // marco de su nulo). Pero al colgar contenido QUE YA ESTA GIRADO A PROPOSITO de un nulo del mundo,
  // ponerle las rotaciones en cero lo destruye. Como el nulo es identidad, AE no reescribe nada y no
  // hay nada que compensar: se cuelga y listo. La identidad se COMPRUEBA, no se supone.
  function colgarSinTocar(hijo, nulo, donde) {
    if (!esIdentidad(nulo)) {
      throw new Error(donde + ": el nulo '" + nulo.name + "' no es identidad (posicion != ancla, o " +
                      "tiene giro o escala distinta de 100). Colgar de un nulo que no es identidad hace " +
                      "que AE reescriba la posicion y los angulos del hijo para conservar su " +
                      "transformacion en el mundo — y con claves no puede reescribirlas todas.");
    }
    if (hijo.parent !== null && hijo.parent !== undefined) {
      throw new Error(donde + ": '" + hijo.name + "' ya cuelga de '" + hijo.parent.name + "'. " +
                      "Reemparentarlo lo saca de su aparejo. Cuelga el PADRE del nulo del mundo, no el " +
                      "nieto.");
    }
    hijo.parent = nulo;
    return hijo;
  }

  // ==============================================================================================
  // PROYECCION  —  la unica cuenta que decide si un gesto de camara es chico o es un paseo
  // ==============================================================================================
  //
  // C00 en dos lineas: a distancia d, un objeto se ve al (zoom/d)·100 % de su tamano, y un punto del
  // mundo cae en   pantalla = centro_de_comp + (x − Cx, y − Cy) · zoom / d.
  // Con zoom = distancia (lo que fuerza G.camara) el plano z=0 se dibuja 1:1 y las coordenadas 2D y 3D
  // coinciden. Ese es el ancla de fidelidad de todo el motor.
  function proyectar(p, camPos, zoom) {
    var d = p[2] - camPos[2];
    if (d <= 0) { return null; }
    var m = zoom / d;
    return [(p[0] - camPos[0]) * m + G.ancho() / 2, (p[1] - camPos[1]) * m + G.alto() / 2, d];
  }

  // El desplazamiento aparente de un ACERCAMIENTO, medido sobre el punto que estaba en el borde del
  // cuadro — que es el que mas se mueve y por lo tanto el que manda.
  //     px = (ancho/2) · (d0/d1 − 1)
  function pxDeAcercamiento(d0, d1) {
    return Math.abs(G.ancho() / 2 * (d0 / d1 - 1));
  }

  // El de un GIRO desde tripode: el centro del cuadro se corre zoom·tan(theta). Por eso un paneo de 10
  // grados con zoom 2666 mueve 470 px — casi un cuarto de pantalla — y es, siempre, un gesto narrativo.
  function pxDeGiro(zoom, grados) {
    return Math.abs(zoom * Math.tan(grados * GRADO));
  }

  // ==============================================================================================
  // EL PRESUPUESTO DE CAMARA
  // ==============================================================================================
  var APORTE = [];
  var EVENTOS = null;

  // Los arranques de los ELEMENTOS, declarados una vez. Con esto, toda funcion de camara puede
  // comprobar la regla de la NO COINCIDENCIA sin que haya que pasarsela en cada llamada.
  api.eventos = function (lista) {
    sincronizar();
    var i;
    EVENTOS = [];
    for (i = 0; i < lista.length; i++) { EVENTOS[i] = Math.round(lista[i]); }
    G.anotar("C-EVENTOS|" + EVENTOS.length + " arranques de elemento declarados");
    return EVENTOS;
  };

  // REGLA DE LA NO COINCIDENCIA. La camara no arranca ni frena junto con un evento de elemento: si la
  // camara acelera justo cuando entra el panel, el ojo lee UNA sola cosa y se pierden los dos gestos.
  // El desfase util es 4-8 cuadros. Sin eventos declarados no se puede comprobar, y no saber no es lo
  // mismo que estar bien: se avisa una vez.
  var avisadoSinEventos = false;
  function noCoincide(cuadro, donde) {
    if (EVENTOS === null) {
      if (!avisadoSinEventos) {
        avisadoSinEventos = true;
        G.avisar("no se declararon los arranques de los elementos (Gc.eventos([...])), asi que no puedo " +
                 "comprobar la regla de la no coincidencia: la camara no arranca ni frena junto con un " +
                 "evento de elemento, se desfasa 4-8 cuadros.");
      }
      return;
    }
    // EL CUADRO 0 NO CUENTA. En el arranque de la pieza empieza todo por definicion —el fondo, el
    // heroe, la deriva— y exigir desfase ahi reprobaria la disposicion de apertura de cualquier pieza,
    // incluida la que el propio plan usa de ejemplo (deriva de camara y entrada del heroe, las dos en
    // el cuadro 0). La regla protege contra DOS GESTOS QUE COMPITEN a mitad de pieza, no contra el
    // hecho de que una pieza empiece.
    if (cuadro === 0) { return; }
    var i, d;
    for (i = 0; i < EVENTOS.length; i++) {
      d = Math.abs(EVENTOS[i] - cuadro);
      if (d < 4) {
        throw new Error(donde + ": el gesto de camara arranca o frena en el cuadro " + cuadro + " y hay " +
                        "un evento de elemento en el " + EVENTOS[i] + " (" + d + " cuadros). Se solapan: " +
                        "el ojo lee una sola cosa y se pierden los dos gestos. Corrilo a " +
                        (EVENTOS[i] + 6) + " o a " + (EVENTOS[i] - 6) + ".");
      }
    }
  }

  // LA COMPUERTA DE LA PROPORCION. Todo gesto de camara pasa por aca antes de escribir una clave.
  //
  // HAY DOS CLASES DE MOVIMIENTO DE CAMARA Y NO SE MIDEN CON LA MISMA VARA — la primera version de esta
  // funcion las media igual y era insostenible: reprobaba la orbita, el paneo y la grua, o sea tres
  // tecnicas del propio catalogo, con la regla escrita para las derivas.
  //
  //   QUE ACOMPANA (deriva, empuje de fondo, travelling, puntuacion, contragolpe): tiene un techo duro.
  //     Arriba del 12% del ancho deja de ser "el plano esta vivo" y hay que usar otro gesto.
  //   NARRATIVO (paneo, orbita, grua, remate): mueve mucho porque para eso existe. No tiene techo, pero
  //     EXIGE MOTIVO ESCRITO, siempre. La regla del oficio es "movimiento motivado": cuando el
  //     movimiento responde a algo se lee natural, y cuando no, se lee decorativo. Escribirlo es la
  //     unica forma de que esa decision quede tomada y no ocurrida.
  function aporte(px, desde, hasta, donde, motivo, narrativo) {
    var cuadros = hasta - desde;
    var frac = px / G.ancho();
    if (narrativo && !motivo) {
      throw new Error(donde + ": es un movimiento de camara NARRATIVO (" + Math.round(px) + " px " +
                      "aparentes, " + pct(frac) + "% del ancho) y va con `motivo` escrito. No es " +
                      "burocracia: la regla del oficio es que la camara se mueve porque algo lo pide " +
                      "—un revelado, un cambio de atencion, una transicion— y cuando no lo pide nada se " +
                      "lee decorativo. Si no podes escribir que lo pide, el gesto sobra.");
    }
    if (!narrativo && frac > 0.12) {
      throw new Error(donde + ": la camara mueve " + Math.round(px) + " px aparentes (" + pct(frac) +
                      "% del ancho) en " + cuadros + " cuadros. Este gesto es de los que ACOMPANAN y su " +
                      "techo es el 12%: arriba de ahi deja de ser \"el plano esta vivo\" y se lee como " +
                      "que te pasean por una maqueta. O bajas el recorrido a " + un(0.12 * G.ancho()) +
                      " px de desplazamiento aparente, o usas el gesto narrativo que corresponda " +
                      "(C01 modo remate, C04, C05) — que es corto y lleva motivo.");
    }
    if (cuadros >= 60 && px / cuadros > 3) {
      G.avisar(donde + ": la camara aporta " + un(px / cuadros) + " px por cuadro sostenidos durante " +
               cuadros + " cuadros. El presupuesto es 2-3 px por cuadro; el elemento mas rapido del " +
               "plano tiene que estar en 25-30. Factor diez.");
    }
    APORTE[APORTE.length] = { donde: donde, desde: desde, hasta: hasta, px: px, motivo: motivo || "" };
    G.anotar("C-APORTE|" + donde + "|" + desde + "-" + hasta + "|" + Math.round(px) + " px|" +
             un(px / Math.max(1, cuadros)) + " px/cuadro");
    return px;
  }

  // ==============================================================================================
  // FOCO Y PUNTO DE SALIDA
  // ==============================================================================================
  //
  // `G.revisarFoco` es la ley del nucleo —el motor dibuja liso hasta 24 px de circulo de confusion, y
  // una capa detras del ojo es un error— pero cuenta la distancia contra la camara EN SU LUGAR
  // ORIGINAL, y en esta familia la camara se mueve. Se le pasa una z equivalente: si la camara esta en
  // zCam, la distancia real a una capa en z es (z − zCam), y G la calcula como (z' + DIST), asi que
  // z' = z − zCam − DIST. Los numeros del mensaje son los correctos; el nombre lleva la z de verdad.
  //
  // Y EL PUNTO DE SALIDA SE CALCULA CON LA Z A LA QUE LA CAMARA VA A LLEGAR, no con la que tiene. Todas
  // estas comprobaciones corren ANTES de escribir las claves —para no dejar un documento a medio
  // construir— asi que preguntarle a la propiedad donde va a estar en el cuadro 120 devuelve donde esta
  // AHORA. Era un agujero completo: el chequeo se hacia, daba bien siempre, y la capa se iba igual
  // detras del ojo. Por eso `zCamara` viaja como argumento.
  function revisarProfundidad(cam, z, cuadro, nombre, zCamara) {
    var camPos = posMundoEn(cam, cuadro);
    if (camPos === null) { return 0; }   // camara colgada de un aparejo girado: lo dice `mundoDe`
    if (zCamara !== undefined && zCamara !== null) { camPos = [camPos[0], camPos[1], zCamara]; }
    var d = z - camPos[2];
    var DIST = G.distanciaCamara();
    var opc = opciones(cam);
    var conProf = 0, apertura = 12, enfoque = DIST;
    if (opc !== null) {
      try { conProf = opc.property("ADBE Camera Depth of Field").value ? 1 : 0; } catch (e1) { conProf = 0; }
      try { apertura = valorEn(opc.property("ADBE Camera Aperture"), cuadro); } catch (e2) { apertura = 12; }
      try { enfoque = valorEn(opc.property("ADBE Camera Focus Distance"), cuadro); } catch (e3) { enfoque = DIST; }
    }
    var etiqueta = nombre + " (z=" + un(z) + ", camara en z=" + un(camPos[2]) + ", cuadro " + cuadro + ")";
    if (!conProf) {
      // sin profundidad de campo no hay circulo de confusion que revisar, pero la capa detras del ojo
      // sigue siendo un error y esa parte la hace la misma funcion
      if (d <= 0) {
        throw new Error(etiqueta + " queda DETRAS de la camara: distancia " + un(d) + ". Una capa 3D " +
                        "detras del ojo se proyecta invertida y `marco-check` la cuenta como miles de " +
                        "px fuera de cuadro. Calculale el punto de salida al gesto.");
      }
      if (d < 200) {
        G.avisar(etiqueta + " queda a " + un(d) + " unidades del ojo. Abajo de 200 la perspectiva se " +
                 "vuelve extrema —una capa plana se abre como un abanico— y el plano cercano del " +
                 "reproductor esta en 1 (`comp3d.html:1080`): un pelo mas y se recorta.");
      }
      return d;
    }
    return G.revisarFoco(z - camPos[2] - DIST, apertura, enfoque - DIST, etiqueta);
  }

  // ==============================================================================================
  // EMPATES DE PROFUNDIDAD  —  lo que reemplazo a la vieja LEY 1
  // ==============================================================================================
  //
  // El reproductor ordena por el eje de la camara y desempata por apilado, igual que AE. Un CRUCE en Z
  // ya no es un defecto. Lo que queda es el EMPATE: dos capas a menos de 1 unidad de profundidad que
  // ademas se pisan en pantalla. Ahi el orden lo decide el desempate y no hay ninguna garantia de que
  // los dos lados desempaten igual — es un defecto de un cuadro, intermitente, del que se descubre
  // tarde. El criterio de solape es el mismo que usa `ritmo.mjs` en M7: mas del 5% del area de la
  // menor de las dos cajas. Que se rocen no alcanza.
  function solapan(A, B) {
    var w = Math.min(A[2], B[2]) - Math.max(A[0], B[0]);
    var h = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
    if (w <= 0 || h <= 0) { return false; }
    var menor = Math.min((A[2] - A[0]) * (A[3] - A[1]), (B[2] - B[0]) * (B[3] - B[1]));
    return menor > 0 && (w * h) / menor > 0.05;
  }

  // cosas: [{ nombre, prof, caja:[x0,y0,x1,y1], holgura }] — `holgura` es cuanto puede variar su
  // profundidad por su propia deriva, para que el empate se juzgue contra el peor momento y no contra
  // la foto quieta.
  function revisarEmpates(cosas, donde, acepto) {
    var i, j, malos = [];
    for (i = 0; i < cosas.length; i++) {
      for (j = i + 1; j < cosas.length; j++) {
        var a = cosas[i], b = cosas[j];
        var sep = Math.abs(a.prof - b.prof) - (a.holgura || 0) - (b.holgura || 0);
        if (sep >= 1.0) { continue; }
        if (a.caja === null || b.caja === null) { continue; }
        if (!solapan(a.caja, b.caja)) { continue; }
        malos[malos.length] = a.nombre + " y " + b.nombre + " (separacion " + un(Math.max(0, sep)) + ")";
      }
    }
    if (malos.length === 0) { return 0; }
    if (acepto) {
      G.avisar(donde + ": " + malos.length + " empate(s) de profundidad aceptados por declaracion: " +
               malos.join(" · "));
      return malos.length;
    }
    throw new Error(donde + ": " + malos.length + " par(es) quedan a menos de 1 unidad de profundidad " +
                    "Y se pisan en pantalla: " + malos.join(" · ") + ". Ahi el orden de dibujo no lo " +
                    "decide la profundidad sino el desempate, y nadie garantiza que AE y el motor " +
                    "desempaten igual: es un cuadro que sale al reves, intermitente. Separalos en Z, o " +
                    "corrigelos en pantalla. Si sabes que no importa, declara `aceptoElEmpate: true`.");
  }

  // La caja de una capa en PANTALLA. `kx` es el achatamiento horizontal de una capa girada en Y (cos
  // del giro): sin el, un panel de una pared inclinada se declara mas ancho de lo que se ve. Va como
  // parametro y no calculado adentro porque el giro lo pone el aparejo, no la capa.
  function cajasDe(cosas) {
    var i, out = [];
    for (i = 0; i < cosas.length; i++) { out[i] = cosas[i].caja; }
    return out;
  }

  function cajaDeCapa(capa, mundo, camPos, zoom, kx) {
    var w = 0, h = 0;
    try { w = capa.width; h = capa.height; } catch (exW) { return null; }
    if (!w || !h) { return null; }
    var e = G.esc(capa).value;
    var W = w * e[0] / 100 * (kx === undefined ? 1 : kx), H = h * e[1] / 100;
    var p = proyectar(mundo, camPos, zoom);
    if (p === null) { return null; }
    var m = zoom / (mundo[2] - camPos[2]);
    return [p[0] - W * m / 2, p[1] - H * m / 2, p[0] + W * m / 2, p[1] + H * m / 2];
  }

  // ==============================================================================================
  // C00 · LA MATEMATICA, para que nada se corra
  // ==============================================================================================
  //
  // No construye nada: contesta. Y contesta lo unico que, si esta mal, corre TODO lo demas sin dar un
  // solo error — el ancla de fidelidad es que el zoom valga lo mismo que la distancia, porque ahi una
  // capa 3D en z=0 se dibuja exactamente igual que una 2D al 100%. Si alguien crea la camara a mano y
  // los desacopla, las coordenadas 2D y 3D dejan de coincidir y toda la pieza queda corrida de escala.
  api.matematica = function (o) {
    o = o || {};
    var donde = o.donde || "C00 matematica";
    var ancho = G.ancho(), alto = G.alto();
    var pelicula = o.pelicula === undefined ? 36 : o.pelicula;
    var focal = o.focal === undefined ? 50 : o.focal;
    var zoom = o.zoom === undefined ? focal * ancho / pelicula : o.zoom;
    var fov = 2 * Math.atan(alto / (2 * zoom)) * 180 / Math.PI;

    var cam = null;
    try { cam = laCamara(o, donde); } catch (exC) { cam = null; }
    var pcam = cam === null ? null : posMundoEn(cam, 0);
    if (cam !== null && pcam !== null) {
      var zc = pcam[2];
      zoom = zoomEn(cam, 0);
      focal = zoom * pelicula / ancho;
      fov = 2 * Math.atan(alto / (2 * zoom)) * 180 / Math.PI;
      if (Math.abs(zoom + zc) > 1) {
        G.avisar(donde + ": el zoom vale " + un(zoom) + " y la camara esta a " + un(-zc) + " del plano " +
                 "z=0. Con zoom != distancia, una capa 3D en z=0 NO se dibuja igual que una 2D al 100%: " +
                 "el ancla de fidelidad del motor se rompe y todas las coordenadas quedan corridas por " +
                 "el factor " + un(zoom / -zc) + ". G.camara() los iguala sola.");
      }
    }

    var r = {
      ancho: ancho, alto: alto, zoom: zoom, focal: focal, pelicula: pelicula,
      fovVertical: fov, distancia: G.distanciaCamara()
    };
    G.anotar("C00|" + donde + "|zoom " + un(zoom) + "|focal " + un(focal) + " mm|fov vertical " +
             un(fov) + " grados");
    return r;
  };

  // el tamano aparente de algo que vive en z, en % — a distancia d se ve al (zoom/d)·100
  api.escalaAparente = function (z) {
    return G.distanciaCamara() / (z + G.distanciaCamara()) * 100;
  };

  // y la vuelta: con cuanta escala hay que dibujarlo en z para que se vea del mismo tamano que en z=0
  api.escalaQueConserva = function (z) {
    return (z + G.distanciaCamara()) / G.distanciaCamara() * 100;
  };

  // ==============================================================================================
  // C01 · PUSH IN / PULL OUT  —  "empuje", "retroceso"
  // ==============================================================================================
  //
  // La camara avanza sobre su eje. NO es lo mismo que animar el zoom: el empuje cambia el paralaje —lo
  // cercano crece mas que lo lejano— y el zoom aplana. Esa es toda la diferencia y es la que se ve.
  //
  // El recorrido se pide en FRACCION DE LA DISTANCIA, no en unidades, y no es comodidad: 300 unidades
  // son un empuje discreto a 2666 de distancia y un salto brutal a 600. La fraccion se lee igual en
  // cualquier escenario.
  //
  // Y el punto de salida se calcula SIEMPRE. Un empuje que termina 300 unidades mas cerca puede dejar
  // el adelanto (z=-600) a 200 del ojo, o directamente detras.
  api.empuje = function (o) {
    o = o || {};
    var donde = o.donde || "C01 empuje";
    var cam = laCamara(o, donde);
    var desde = entero(pedir(o, "desde", donde), "desde", donde);
    var hasta = entero(pedir(o, "hasta", donde), "hasta", donde);
    var dur = hasta - desde;
    if (dur <= 0) { throw new Error(donde + ": `hasta` (" + hasta + ") no es posterior a `desde` (" + desde + ")"); }

    var modo = o.modo === undefined ? "deriva" : o.modo;
    if (modo !== "deriva" && modo !== "remate" && modo !== "atras") {
      throw new Error(donde + ": `modo` es 'deriva' (empuje de fondo, 90-300 cuadros), 'remate' " +
                      "(narrativo, 20-35) o 'atras' (pull out, 45-90). Vino '" + modo + "'.");
    }
    if (modo === "deriva") { banda(dur, 90, 300, "la duracion", donde, "Un empuje de fondo mas corto se nota como movimiento; mas largo deja de tener principio y final, que es lo unico que separa una animacion de una deriva."); }
    if (modo === "remate") { banda(dur, 20, 35, "la duracion", donde, "El empuje narrativo es un remate: si dura mas de 35 cuadros deja de rematar nada."); }
    if (modo === "atras") { banda(dur, 45, 90, "la duracion", donde, "El retroceso necesita freno largo para aterrizar en la composicion final, y con menos de 45 cuadros no hay donde frenar."); }

    var rec = o.recorrido === undefined ? 0.08 : o.recorrido;
    if (rec <= 0) { throw new Error(donde + ": `recorrido` es una FRACCION positiva de la distancia (0.05 a 0.12). El sentido lo pone `modo`, no el signo."); }
    if (modo !== "remate") {
      banda(rec, 0.03, 0.14, "el recorrido", donde, "El catalogo mide 5-12% de la distancia para un empuje que acompana. Mas es un gesto narrativo y va con `modo: \"remate\"`.");
    }

    var zRef = o.zReferencia === undefined ? 0 : o.zReferencia;
    var p0 = mundoDe(cam, desde, donde);
    var d0 = zRef - p0[2];
    if (d0 <= 0) { throw new Error(donde + ": el plano de referencia (z=" + zRef + ") ya esta detras de la camara."); }
    var d1 = modo === "atras" ? d0 * (1 + rec) : d0 * (1 - rec);
    var z0 = p0[2];
    var z1 = z0 + (d0 - d1);

    var curva = o.curva;
    if (curva === undefined) { curva = modo === "deriva" ? "LINEAL" : (modo === "remate" ? "C1" : "C2"); }

    // el punto de salida: contra la capa mas cercana que declaro la pieza
    var zCerca = o.zCercano === undefined ? zRef : o.zCercano;
    revisarProfundidad(cam, zCerca, hasta, o.nombreCercano || "la capa mas cercana", z1);

    var px = pxDeAcercamiento(d0, d1);
    noCoincide(desde, donde);
    noCoincide(hasta, donde);
    aporte(px, desde, hasta, donde, o.motivo, modo === "remate");

    var blanco = api.plataforma({ camara: cam, usar: o.sobre === "plataforma" });
    var capa = o.sobre === "plataforma" ? blanco : cam;
    var e = ejesDe(capa, donde);
    var base = posEn(capa, desde)[2];
    var delta = z1 - z0;
    libre(e.z, desde, hasta, donde, "la Z de '" + capa.name + "'");
    G.claves(e.z, [[desde, base, curva], [hasta, base + delta]], donde);

    G.anotar("C01|" + donde + "|" + modo + "|" + desde + "-" + hasta + "|d " + un(d0) + "->" + un(d1) +
             "|" + Math.round(px) + " px aparentes");
    return { camara: cam, capa: capa, eje: e.z, z0: base, z1: base + delta,
             distancia0: d0, distancia1: d1, px: px };
  };

  // ==============================================================================================
  // C02 · ZOOM PURO / DOLLY ZOOM  —  "zoom optico", "efecto Vertigo"
  // ==============================================================================================
  //
  // El zoom animable SI viaja: `exportar.jsx:747` vuelca `ADBE Camera Zoom` con sus claves y
  // `comp3d.html:1091` lo consume. El catalogo lo daba como (b) y estaba mirando el codigo viejo.
  //
  // EL DOLLY ZOOM SALE EXACTO Y NO POR CASUALIDAD. La condicion para que el sujeto no se mueva un pelo
  // es zoom(t) = zoom0 · d(t)/d0. Con la MISMA curva en los dos ejes, la distancia recorre
  // d(u) = d0 + (d1−d0)·u y el zoom recorre zoom0 + (zoom1−zoom0)·u; poniendo zoom1 = zoom0·d1/d0 las
  // dos rectas son la misma funcion de u, asi que la igualdad vale en TODO el tramo, no solo en las
  // claves. Con curvas distintas deja de valer entre claves y el sujeto "respira" — por eso se tira.
  //
  // Y UNA PERDIDA QUE HAY QUE SABER: mover el zoom rompe el 1:1 de z=0. Cualquier capa 2D de la comp se
  // queda quieta mientras el mundo 3D se agranda. Con capas 2D en escena, eso se ve.
  api.zoomDeLente = function (o) {
    o = o || {};
    var donde = o.donde || "C02 zoomDeLente";
    var cam = laCamara(o, donde);
    var desde = entero(pedir(o, "desde", donde), "desde", donde);
    var hasta = entero(pedir(o, "hasta", donde), "hasta", donde);
    var dur = hasta - desde;
    if (dur <= 0) { throw new Error(donde + ": `hasta` no es posterior a `desde`"); }

    var opc = opciones(cam);
    if (opc === null) { throw new Error(donde + ": la camara no expone `ADBE Camera Options Group`."); }
    var pz = opc.property("ADBE Camera Zoom");
    var zoom0 = valorEn(pz, desde);
    var factor = o.factor === undefined ? null : o.factor;
    var zoom1 = o.zoom === undefined ? (factor === null ? zoom0 * 1.15 : zoom0 * factor) : o.zoom;
    if (zoom1 <= 0) { throw new Error(donde + ": el zoom final da " + un(zoom1) + " y tiene que ser positivo."); }

    var curva = o.curva === undefined ? "C6" : o.curva;
    var dolly = o.dolly === true;

    if (dolly) { banda(dur, 45, 90, "la duracion", donde, "El dolly zoom necesita tiempo para que la deformacion del fondo se lea; abajo de 45 cuadros es un tiron."); }
    else if (dur < 20) { banda(dur, 8, 12, "la duracion", donde, "Un zoom puro es de 30-60 cuadros, o un remate de 8-12. Entre 13 y 19 no es ninguna de las dos cosas."); }
    else { banda(dur, 30, 60, "la duracion", donde, "Un zoom puro es de 30-60 cuadros, o un remate de 8-12."); }

    var p0 = mundoDe(cam, desde, donde);
    var zRef = o.zReferencia === undefined ? 0 : o.zReferencia;
    var d0 = zRef - p0[2];
    var px = 0, e = null, z1 = p0[2];

    if (dolly) {
      if (o.curvaZ !== undefined && o.curvaZ !== curva) {
        throw new Error(donde + ": pediste la curva '" + curva + "' para el zoom y '" + o.curvaZ +
                        "' para la Z. En un dolly zoom van LA MISMA: la condicion zoom = zoom0·d/d0 " +
                        "solo se cumple entre claves si las dos propiedades recorren el mismo parametro. " +
                        "Con curvas distintas el sujeto respira, y eso se ve como que el encuadre late.");
      }
      var d1 = d0 * zoom1 / zoom0;
      z1 = zRef - d1;
      revisarProfundidad(cam, o.zCercano === undefined ? zRef : o.zCercano, hasta,
                         o.nombreCercano || "la capa mas cercana", z1);
      // en un dolly zoom el sujeto NO se mueve: lo que se mueve es el fondo. El aporte se mide sobre
      // un plano de referencia distinto del sujeto, porque medirlo en el sujeto daria cero siempre.
      var zFondo = o.zFondo === undefined ? 1500 : o.zFondo;
      var f0 = zFondo - p0[2], f1 = zFondo - z1;
      px = Math.abs(G.ancho() / 2 * ((zoom1 / f1) / (zoom0 / f0) - 1));
      e = ejesDe(cam, donde);
      libre(e.z, desde, hasta, donde, "la Z de la camara");
      G.claves(e.z, [[desde, p0[2], curva], [hasta, z1]], donde);
    } else {
      px = Math.abs(G.ancho() / 2 * (zoom1 / zoom0 - 1));
    }

    noCoincide(desde, donde);
    noCoincide(hasta, donde);
    aporte(px, desde, hasta, donde, o.motivo, dolly);

    libre(pz, desde, hasta, donde, "el zoom de la camara");
    G.claves(pz, [[desde, zoom0, curva], [hasta, zoom1]], donde);

    var comp = G.comp(), i, hay2D = 0;
    for (i = 1; i <= comp.numLayers; i++) {
      var c = comp.layer(i);
      if (!(c instanceof CameraLayer) && !c.threeDLayer && !c.nullLayer) { hay2D = hay2D + 1; }
    }
    if (hay2D > 0) {
      G.avisar(donde + ": hay " + hay2D + " capa(s) 2D en la comp y el zoom se mueve. Una capa 2D no " +
               "vive en el mundo: se queda exactamente donde esta mientras todo lo 3D se agranda. " +
               "Sobre un rotulo de pantalla completa da igual; sobre algo que tenia que acompanar al " +
               "fondo, se despega.");
    }

    G.anotar("C02|" + donde + "|" + (dolly ? "dolly zoom" : "zoom puro") + "|" + un(zoom0) + "->" +
             un(zoom1) + "|" + Math.round(px) + " px aparentes");
    return { camara: cam, zoom: pz, zoom0: zoom0, zoom1: zoom1, eje: e, z1: z1, px: px };
  };

  // ==============================================================================================
  // C03 · TRUCK / PEDESTAL  —  y va como NULO DEL MUNDO, no como camara
  // ==============================================================================================
  //
  // Trasladar el mundo con un nulo padre es indistinguible en pantalla de un travelling de camara, es
  // mas facil de encuadrar y no tiene NINGUN riesgo de interpolacion espacial. La camara se reserva
  // para lo que el nulo no puede: cambiar la perspectiva (el empuje, la orbita).
  //
  // Lo que hace que esto sea seguro con contenido ya animado es que el nulo es IDENTIDAD: colgar no
  // reescribe un solo numero. Y por eso mismo aca NO se usa `G.colgar`, que pondria en cero las
  // rotaciones de cada hijo — que es lo correcto al armar un aparejo y es destructivo al colgar
  // paneles que ya estan girados a proposito.
  api.trasladoDelMundo = function (o) {
    o = o || {};
    var donde = o.donde || "C03 trasladoDelMundo";
    var capas = pedir(o, "capas", donde);
    var desde = entero(pedir(o, "desde", donde), "desde", donde);
    var hasta = entero(pedir(o, "hasta", donde), "hasta", donde);
    var dur = hasta - desde;
    if (dur <= 0) { throw new Error(donde + ": `hasta` no es posterior a `desde`"); }
    banda(dur, 60, 150, "la duracion", donde, "Un travelling lateral es un movimiento de recorrido: abajo de 60 cuadros se lee como un tiron y arriba de 150 el ojo pierde el hilo de que lo llevan a algun lado.");

    var dx = o.dx === undefined ? 0 : o.dx;
    var dy = o.dy === undefined ? 0 : o.dy;
    if (dx === 0 && dy === 0) { throw new Error(donde + ": `dx` y `dy` valen cero: no hay traslado."); }
    if (dx !== 0 && dy !== 0) {
      throw new Error(donde + ": pediste " + dx + " en X y " + dy + " en Y a la vez. Un travelling " +
                      "lateral y un pedestal son DOS gestos y se leen distinto; juntos dan una " +
                      "diagonal, que no es ninguno de los dos. Si querias un arco, es C06 (grua) y " +
                      "necesita curvas distintas por eje.");
    }

    var curva = o.curva === undefined ? "LINEAL" : o.curva;
    if (curva === "SUAVE" || curva === "C6") {
      throw new Error(donde + ": pediste la curva '" + curva + "' para un travelling. Va casi lineal: " +
                      "con arranque y frenada marcados se lee como \"arranque y frenada de auto\" y el " +
                      "movimiento llama la atencion sobre si mismo, que es exactamente lo contrario de " +
                      "lo que hace un travelling.");
    }

    var nulo = o.nulo === undefined ? nuloIdentidad(o.nombre || "mundo", G.ancho() / 2, G.alto() / 2, 0) : o.nulo;
    var i;
    for (i = 0; i < capas.length; i++) {
      if (capas[i] instanceof CameraLayer) {
        throw new Error(donde + ": una CAMARA en `capas`. Colgar la camara del nulo del mundo la deja " +
                        "quieta respecto del mundo: el traslado se cancela solo y no se mueve nada. " +
                        "El nulo lleva el CONTENIDO; la camara se queda afuera.");
      }
      colgarSinTocar(capas[i], nulo, donde);
    }

    var eje = dx !== 0 ? "x" : "y";
    var e = ejesDe(nulo, donde);
    var prop = eje === "x" ? e.x : e.y;
    var base = valorEn(prop, desde);
    var px = Math.abs(dx !== 0 ? dx : dy);   // en z=0 la magnificacion es 1: unidad = pixel

    noCoincide(desde, donde);
    noCoincide(hasta, donde);
    aporte(px, desde, hasta, donde, o.motivo);
    libre(prop, desde, hasta, donde, "el eje " + eje + " del nulo del mundo");
    G.claves(prop, [[desde, base, curva], [hasta, base + (dx !== 0 ? dx : dy)]], donde);

    G.anotar("C03|" + donde + "|" + eje + " " + (dx !== 0 ? dx : dy) + "|" + capas.length + " capas|" +
             Math.round(px) + " px aparentes");
    return { nulo: nulo, eje: prop, px: px, capas: capas };
  };

  // ==============================================================================================
  // C04 · PAN / TILT / ROLL  —  giro desde tripode
  // ==============================================================================================
  //
  // La camara gira sin trasladarse: NO hay paralaje, todo el plano se corre en bloque. Es lo que lo
  // separa del travelling y es la razon para elegir uno u otro.
  //
  // ESTO SE PUEDE HACER HOY, y el plan dice que no. Lo verifique en el codigo: `exportar.jsx:381` ya
  // marca la camara como 3D (antes preguntaba por `threeDLayer`, que en una CameraLayer no existe, y
  // por eso orientacion y rotaciones salian en cero SIN AVISO) y `comp3d.html:1144-1147` las compone
  // encima de la base de apuntado. El agujero mudo esta tapado.
  //
  // LO QUE SI SIGUE SIENDO CIERTO: con camara de DOS NODOS las rotaciones no reemplazan al apuntado,
  // se suman a el. Girar 20 grados una camara que ademas mira a un punto de interes da un resultado que
  // nadie predijo. Por eso aca se exige un solo nodo — que es lo que crea `G.camara`.
  //
  // Y UN NUMERO QUE SORPRENDE: el centro del cuadro se corre zoom·tan(theta). Con zoom 2666, DIEZ
  // grados son 470 px, casi un cuarto de pantalla. Un paneo NUNCA es una deriva: es un gesto narrativo
  // y hay que escribir por que.
  api.paneo = function (o) {
    o = o || {};
    var donde = o.donde || "C04 paneo";
    var cam = laCamara(o, donde);
    var desde = entero(pedir(o, "desde", donde), "desde", donde);
    var hasta = entero(pedir(o, "hasta", donde), "hasta", donde);
    var dur = hasta - desde;
    if (dur <= 0) { throw new Error(donde + ": `hasta` no es posterior a `desde`"); }

    var ao = null;
    try { ao = cam.autoOrient; } catch (exA) { ao = null; }
    if (ao !== AutoOrientType.NO_AUTO_ORIENT) {
      throw new Error(donde + ": la camara es de DOS NODOS (auto-orientacion hacia el punto de interes). " +
                      "Sus rotaciones NO reemplazan al apuntado: el reproductor las compone ENCIMA del " +
                      "look-at (`comp3d.html:1144`), asi que un paneo de 20 grados sale girado sobre un " +
                      "marco que ya estaba girado. Con dos nodos, un paneo se hace moviendo el punto de " +
                      "interes. Para girar de verdad: `camara.autoOrient = AutoOrientType.NO_AUTO_ORIENT`, " +
                      "que es lo que pone G.camara().");
    }

    var eje = o.eje === undefined ? "y" : o.eje;
    var grados = pedir(o, "grados", donde);
    var prop, nombreEje;
    if (eje === "y") { prop = G.rotY(cam); nombreEje = "paneo"; }
    else if (eje === "x") { prop = G.rotX(cam); nombreEje = "inclinacion"; }
    else if (eje === "z") { prop = G.rotZ(cam); nombreEje = "balanceo"; }
    else { throw new Error(donde + ": `eje` es 'y' (paneo), 'x' (inclinacion) o 'z' (balanceo). Vino '" + eje + "'."); }

    banda(dur, 30, 90, "la duracion", donde, "Un giro de tripode de 10-30 grados vive entre 30 y 90 cuadros. Mas rapido es un latigazo (X07) y necesita obturador; mas lento se lee como que la camara se cae.");
    banda(Math.abs(grados), 2, 30, "el giro", donde, "Arriba de 30 grados el gran angular deforma los bordes de forma muy visible, y con el campo horizontal de esta comp practicamente no queda en cuadro nada de lo que habia al empezar: eso ya no es un paneo, es una transicion.");

    var zoom = zoomEn(cam, desde);
    var fovH = 2 * Math.atan(G.ancho() / (2 * zoom)) * 180 / Math.PI;
    if (eje !== "z" && Math.abs(grados) > fovH * 0.75) {
      G.avisar(donde + ": el giro es de " + un(Math.abs(grados)) + " grados y el campo horizontal de " +
               "esta comp mide " + un(fovH) + ". Al terminar queda en cuadro menos de un cuarto de lo " +
               "que habia al empezar: hay que TENER algo puesto ahi, o el paneo termina en vacio.");
    }

    // el balanceo no corre el encuadre, lo inclina: su aporte se mide sobre la esquina, no sobre el centro
    var px = eje === "z"
      ? Math.abs(Math.sqrt(G.ancho() * G.ancho() + G.alto() * G.alto()) / 2 * 2 * Math.sin(Math.abs(grados) * GRADO / 2))
      : pxDeGiro(zoom, grados);

    var curva = o.curva === undefined ? "C6" : o.curva;
    var base = valorEn(prop, desde);

    noCoincide(desde, donde);
    noCoincide(hasta, donde);
    aporte(px, desde, hasta, donde, o.motivo, true);
    libre(prop, desde, hasta, donde, "la rotacion " + eje + " de la camara");
    G.claves(prop, [[desde, base, curva], [hasta, base + grados]], donde);

    G.anotar("C04|" + donde + "|" + nombreEje + " " + grados + " grados|" + Math.round(px) + " px aparentes");
    return { camara: cam, prop: prop, grados: grados, px: px, eje: eje };
  };

  // ==============================================================================================
  // C05 · ORBITA
  // ==============================================================================================
  //
  // La receta del nulo, que es la unica que cierra: nulo 3D en el centro del objeto, camara colgada del
  // nulo y corrida en Z, y se anima LA ROTACION Y DEL NULO. Un escalar, dos claves, cero trayectoria
  // espacial. La receta clasica —punto de interes fijo y la posicion de la camara recorriendo un arco—
  // obliga a hornear cada 2 grados (46 claves para 90) porque AE interpola la posicion en Auto-Bezier
  // espacial y ese camino no viaja en el documento.
  //
  // EL ANCLA DEL NULO VA EN EL ORIGEN, no en su posicion. La posicion de un hijo se mide desde el ANCLA
  // del padre: con ancla en el origen y posicion en el centro del objeto, la camara colgada en
  // [0,0,-R] cae exactamente a R del centro y orbita alrededor de el. Con ancla = posicion (que es lo
  // que hace falta para el nulo del mundo) la cuenta da otra cosa y la orbita sale descentrada.
  //
  // CRITERIO, y es lo que mas se desobedece: la orbita se gana con un objeto que la merezca. Sobre
  // paneles planos delata que son planos, que es justo lo que no se queria mostrar.
  api.orbita = function (o) {
    o = o || {};
    var donde = o.donde || "C05 orbita";
    var cam = laCamara(o, donde);
    var desde = entero(pedir(o, "desde", donde), "desde", donde);
    var hasta = entero(pedir(o, "hasta", donde), "hasta", donde);
    var dur = hasta - desde;
    if (dur <= 0) { throw new Error(donde + ": `hasta` no es posterior a `desde`"); }
    var grados = pedir(o, "grados", donde);

    if (Math.abs(grados) > 180 && !o.motivo) {
      throw new Error(donde + ": " + grados + " grados de orbita. Arriba de media vuelta se lee como " +
                      "salvapantallas — es el reclamo mas repetido del oficio sobre este gesto. El " +
                      "rango util es 30-90. Si de verdad hace falta, escribi `motivo`.");
    }
    banda(dur, 60, 150, "la duracion", donde, "Una orbita de 30-90 grados vive entre 60 y 150 cuadros. Mas rapida se lee como un tiron de la camara y pierde el volumen, que es lo unico que la orbita venia a mostrar.");

    var centro = o.centro === undefined ? [G.ancho() / 2, G.alto() / 2, 0] : o.centro;
    var p0 = mundoDe(cam, desde, donde);
    var radio = o.radio === undefined ? (centro[2] - p0[2]) : o.radio;
    if (radio <= 0) { throw new Error(donde + ": el radio da " + un(radio) + ". La camara tiene que estar DELANTE del centro de la orbita."); }

    var nulo = G.comp().layers.addNull(G.cuadros() / G.fps());
    nulo.name = o.nombre || "orbita";
    nulo.threeDLayer = true;
    G.anc(nulo).setValue([0, 0, 0]);
    G.pos(nulo).setValue([centro[0], centro[1], centro[2]]);
    G.esc(nulo).setValue([100, 100, 100]);
    G.ori(nulo).setValue([0, 0, 0]);

    // G.colgar (y no colgarSinTocar) A PROPOSITO: aca la camara TIENE que quedar alineada con el marco
    // del nulo, mirando a su origen. Es el caso para el que existe: AE le reescribe los angulos al
    // emparentar y ponerlos en cero es lo que hace que la orbita apunte al centro y no a cualquier lado.
    G.colgar(cam, nulo, [0, 0, -radio]);

    var prop = G.rotY(nulo);
    var base = valorEn(prop, desde);
    var curva = o.curva === undefined ? "C6" : o.curva;

    // el aporte de una orbita: el sujeto no se corre —esta en el centro— pero el ENCUADRE gira alrededor
    // de el, y lo que el ojo mide es cuanto se desplaza un punto del propio objeto. Media cuerda:
    // 2·R·sin(theta/2) proyectada, contra el ancho de cuadro.
    var zoom = zoomEn(cam, desde);
    var cuerda = 2 * radio * Math.sin(Math.abs(grados) * GRADO / 2);
    var px = cuerda * zoom / radio;

    noCoincide(desde, donde);
    noCoincide(hasta, donde);
    aporte(px, desde, hasta, donde, o.motivo, true);
    G.claves(prop, [[desde, base, curva], [hasta, base + grados]], donde);

    // LA ORBITA REORDENA LA ESCENA EN PROFUNDIDAD, y ahi es donde muerde. Todo par que pase por la
    // misma profundidad mientras se pisa en pantalla es un empate, y ahi el orden lo decide el
    // desempate, no la geometria. Se comprueba al arrancar, en la mitad y al final.
    //
    // LA GEOMETRIA, escrita porque el signo importa: el nulo lleva la camara a local [0,0,−R], y con
    // Ry(theta) eso cae en (−R·sin, 0, −R·cos) respecto del centro. O sea que la camara mira con
    // f = (sin, 0, cos), y la profundidad de un punto P es (P − centro)·f + R. Sin el +R los numeros
    // no son distancias; para comparar PARES da igual porque es una constante, pero un valor absoluto
    // ahi si rompe las diferencias — y esa era la version anterior de estas cuatro lineas.
    if (o.puntos === undefined) {
      G.avisar(donde + ": sin `puntos` ([[x, y, z, ancho, alto], ...] de lo que hay en escena) no puedo " +
               "comprobar empates de profundidad. Una orbita cambia el orden de todo lo que no este en " +
               "su eje: es el gesto de esta familia donde mas facil aparecen.");
    } else {
      var pasos = [0, 0.5, 1], q, k, cosas;
      for (q = 0; q < pasos.length; q++) {
        var th = grados * pasos[q] * GRADO;
        var c = Math.cos(th), s = Math.sin(th);
        var ojo = [centro[0] - radio * s, centro[1], centro[2] - radio * c];
        cosas = [];
        for (k = 0; k < o.puntos.length; k++) {
          var pt = o.puntos[k];
          var lx = pt[0] - centro[0], ly = pt[1] - centro[1], lz = pt[2] - centro[2];
          var prof = lx * s + lz * c + radio;
          var caja = null;
          if (prof > 0) {
            // la caja en pantalla: el punto proyectado con la magnificacion de SU profundidad. Se toma
            // el objeto de frente a la camara — conservador, porque de canto se ve mas angosto.
            var m = zoom / prof;
            var sx = (lx * c - lz * s) * m + G.ancho() / 2;
            var sy = ly * m + G.alto() / 2;
            var pw = (pt.length > 3 ? pt[3] : 2) * m / 2;
            var ph = (pt.length > 4 ? pt[4] : 2) * m / 2;
            caja = [sx - pw, sy - ph, sx + pw, sy + ph];
          }
          cosas[k] = { nombre: (o.nombres && o.nombres[k]) ? o.nombres[k] : ("punto " + k),
                       prof: prof, holgura: 0, caja: caja };
          if (prof <= 1) {
            throw new Error(donde + ": con el giro en " + Math.round(grados * pasos[q]) + " grados, " +
                            cosas[k].nombre + " queda a " + un(prof) + " del ojo — practicamente encima " +
                            "o detras. La orbita lo va a atravesar. Achicale el arco o alejalo del eje. " +
                            "(el ojo pasa por " + Math.round(ojo[0]) + "," + Math.round(ojo[2]) + ")");
          }
        }
        revisarEmpates(cosas, donde + " (giro " + Math.round(grados * pasos[q]) + " grados)", o.aceptoElEmpate);
      }
    }

    G.anotar("C05|" + donde + "|" + grados + " grados|radio " + un(radio) + "|" + Math.round(px) + " px");
    return { camara: cam, nulo: nulo, prop: prop, radio: radio, px: px };
  };

  // ==============================================================================================
  // C06 · GRUA
  // ==============================================================================================
  //
  // Descenso (o ascenso) combinado con avance: un arco en Y-Z. Lo que hace que no parezca una diagonal
  // recta NO es la magnitud: son las CURVAS DISTINTAS POR EJE. Y con freno largo, Z casi lineal. Con la
  // misma curva en los dos ejes, el punto recorre exactamente la recta que une los extremos — que es
  // "una camara que se desplaza en diagonal", no una grua. Por eso se tira.
  api.grua = function (o) {
    o = o || {};
    var donde = o.donde || "C06 grua";
    var cam = laCamara(o, donde);
    var desde = entero(pedir(o, "desde", donde), "desde", donde);
    var hasta = entero(pedir(o, "hasta", donde), "hasta", donde);
    var dur = hasta - desde;
    if (dur <= 0) { throw new Error(donde + ": `hasta` no es posterior a `desde`"); }
    banda(dur, 75, 150, "la duracion", donde, "La grua es el movimiento mas caro del repertorio y necesita tiempo: abajo de 75 cuadros el arco no se lee y queda una diagonal apurada.");

    var dy = o.dy === undefined ? 0 : o.dy;
    var dz = o.dz === undefined ? 0 : o.dz;
    if (dy === 0 || dz === 0) {
      throw new Error(donde + ": una grua es Y **y** Z a la vez (`dy` y `dz`). Con uno solo es un " +
                      "pedestal (C03) o un empuje (C01), y esos ya existen y se autoran mejor solos.");
    }
    var curvaY = o.curvaY === undefined ? "C2" : o.curvaY;
    var curvaZ = o.curvaZ === undefined ? "LINEAL" : o.curvaZ;
    if (curvaY === curvaZ) {
      throw new Error(donde + ": los dos ejes con la curva '" + curvaY + "'. Con la misma curva en Y y " +
                      "en Z el punto recorre exactamente la RECTA entre los extremos: eso es una camara " +
                      "en diagonal, no una grua. El arco sale de que los ejes lleguen a destiempo — Y " +
                      "con freno largo (C2), Z casi lineal.");
    }

    var e = ejesDe(cam, donde);
    var y0 = valorEn(e.y, desde), z0 = valorEn(e.z, desde);
    var p0 = mundoDe(cam, desde, donde);
    var zRef = o.zReferencia === undefined ? 0 : o.zReferencia;
    var d0 = zRef - p0[2], d1 = zRef - (p0[2] + dz);
    if (d1 <= 0) { throw new Error(donde + ": con dz = " + dz + " la camara termina en el plano de referencia o detras. Calculale el punto de salida."); }
    revisarProfundidad(cam, o.zCercano === undefined ? zRef : o.zCercano, hasta, o.nombreCercano || "la capa mas cercana", p0[2] + dz);

    var px = Math.abs(dy) * zoomEn(cam, desde) / d0 + pxDeAcercamiento(d0, d1);
    noCoincide(desde, donde);
    noCoincide(hasta, donde);
    aporte(px, desde, hasta, donde, o.motivo, true);

    libre(e.y, desde, hasta, donde, "la Y de la camara");
    libre(e.z, desde, hasta, donde, "la Z de la camara");
    G.claves(e.y, [[desde, y0, curvaY], [hasta, y0 + dy]], donde);
    G.claves(e.z, [[desde, z0, curvaZ], [hasta, z0 + dz]], donde);

    G.anotar("C06|" + donde + "|dy " + dy + " (" + curvaY + ") · dz " + dz + " (" + curvaZ + ")|" +
             Math.round(px) + " px");
    return { camara: cam, ejeY: e.y, ejeZ: e.z, px: px };
  };

  // ==============================================================================================
  // LA PLATAFORMA  —  el nulo del que cuelga la camara
  // ==============================================================================================
  //
  // El contragolpe, la puntuacion y la deriva van en un nulo que sostiene la camara, no en la camara:
  // asi se pueden apagar por plano, se pueden sumar sin pisarse entre ellos, y sobre todo NO chocan con
  // los cortes (C09), que si necesitan la posicion de la camara para si solos.
  // Es identidad, asi que colgar la camara no le cambia un valor.
  var LA_PLATAFORMA = null;
  api.plataforma = function (o) {
    o = o || {};
    sincronizar();
    if (o.usar === false) { return null; }
    if (LA_PLATAFORMA !== null) { return LA_PLATAFORMA; }
    var donde = o.donde || "Gc.plataforma";
    var cam = laCamara(o, donde);
    var n = nuloIdentidad(o.nombre || "plataforma", G.ancho() / 2, G.alto() / 2, 0);
    // la plataforma tiene que quedar ARRIBA de la camara en el apilado para que se lea como su soporte;
    // el orden no cambia nada del render (un nulo no se dibuja) pero si la lectura del documento
    try { n.moveBefore(cam); } catch (exM) { }
    // SI LA CAMARA YA CUELGA DE ALGO —tipico: el nulo de una orbita— la plataforma va ARRIBA DE TODO
    // EL APAREJO, no al lado. Colgarla al lado seria un nulo que no mueve nada: el gesto se
    // construiria entero, sin error, y no se veria. Un no-op silencioso es de los peores defectos que
    // se pueden dejar en una biblioteca.
    var raiz = cam, guarda = 0;
    while (raiz.parent !== null && raiz.parent !== undefined && guarda < 12) { raiz = raiz.parent; guarda = guarda + 1; }
    if (raiz !== n) { colgarSinTocar(raiz, n, donde); }
    LA_PLATAFORMA = n;
    return n;
  };

  // ==============================================================================================
  // C07 · CONTRAGOLPE DE CAMARA
  // ==============================================================================================
  //
  // El unico movimiento de camara que hace falta la mayor parte del tiempo: algo golpea y la camara
  // acusa 3-8 px en contra, o retrocede 6-15 en Z. Ida de 1-2 cuadros, vuelta de 8-12. LA ASIMETRIA ES
  // EL GESTO: con ida y vuelta parejas se lee como que la camara se balancea sola.
  //
  // Y VA UNA SOLA OSCILACION. Aca NO se usa `G.conRebote`: el rebote inercial da varias oscilaciones
  // amortiguadas, que en un objeto es vida y en la camara es temblor de videojuego. Es la diferencia
  // entre "algo golpeo" y "se cayo el tripode".
  //
  // El retroceso en Z se siente mas caro que el desplazamiento lateral, y es gratis: la misma cuenta.
  api.contragolpe = function (o) {
    o = o || {};
    var donde = o.donde || "C07 contragolpe";
    var cuadro = entero(pedir(o, "cuadro", donde), "cuadro", donde);
    var eje = o.eje === undefined ? "z" : o.eje;
    var ida = o.ida === undefined ? 2 : entero(o.ida, "ida", donde);
    var vuelta = o.vuelta === undefined ? 10 : entero(o.vuelta, "vuelta", donde);
    var magnitud = o.magnitud === undefined ? (eje === "z" ? -8 : 6) : o.magnitud;

    banda(ida, 1, 2, "la ida", donde, "El golpe llega de una: con tres cuadros o mas deja de ser un impacto y se lee como que la camara se movio.");
    banda(vuelta, 8, 12, "la vuelta", donde, "La vuelta larga es lo que da el peso. Con menos de 8 cuadros el conjunto se lee como un temblor.");
    if (eje === "z") { banda(Math.abs(magnitud), 4, 20, "la magnitud", donde, "El retroceso en Z util es 6-15 unidades. Arriba de 20 el encuadre entero cambia de tamano y se ve como un zoom, no como un golpe."); }
    else { banda(Math.abs(magnitud), 2, 12, "la magnitud", donde, "El acuse lateral util es 3-8 px. Arriba de 12 se lee como temblor de videojuego."); }
    if (o.oscilaciones !== undefined && o.oscilaciones > 1) {
      throw new Error(donde + ": pediste " + o.oscilaciones + " oscilaciones. El contragolpe es UNA. " +
                      "Varias oscilaciones amortiguadas son un rebote (G.conRebote), que en un objeto " +
                      "es vida y en la camara es temblor: se lee \"se cayo el tripode\", no \"algo golpeo\".");
    }

    var nulo = o.nulo === undefined ? api.plataforma({ donde: donde }) : o.nulo;
    var e = ejesDe(nulo, donde);
    var prop = eje === "z" ? e.z : (eje === "x" ? e.x : e.y);
    if (eje !== "x" && eje !== "y" && eje !== "z") { throw new Error(donde + ": `eje` es 'x', 'y' o 'z'. Vino '" + eje + "'."); }

    var fin = cuadro + ida + vuelta;
    var base = valorEn(prop, cuadro);
    libre(prop, cuadro, fin, donde, "el eje " + eje + " de la plataforma");

    // el contragolpe SI puede caer sobre un evento de elemento: es su acuse. Lo que no puede es
    // arrancar antes que el golpe que lo produce, y eso lo decide quien autora.
    var cam = laCamara(o, donde);
    var zoom = zoomEn(cam, cuadro);
    var p0 = mundoDe(cam, cuadro, donde);
    var d0 = 0 - p0[2];
    var px = eje === "z" ? pxDeAcercamiento(d0, d0 - magnitud) : Math.abs(magnitud) * zoom / d0;
    aporte(px, cuadro, fin, donde, o.motivo || "acuse de un golpe");

    G.claves(prop, [[cuadro, base, "LINEAL"], [cuadro + ida, base + magnitud, "C2"], [fin, base]], donde);
    G.anotar("C07|" + donde + "|" + eje + " " + magnitud + "|ida " + ida + " vuelta " + vuelta + "|" +
             Math.round(px) + " px");
    return { nulo: nulo, prop: prop, desde: cuadro, hasta: fin, px: px };
  };

  // ==============================================================================================
  // C08 · CAMARA COMO PUNTUACION
  // ==============================================================================================
  //
  // La mecanica de la referencia que se admira, y es lo contrario de lo que sale solo: empujones de
  // 6-12 cuadros sobre beats concretos, y la camara QUIETA 30-60 cuadros entre ellos. La camara no
  // acompana todo el tiempo — puntua.
  //
  // Los empujones ACUMULAN por defecto (cada uno deja la camara donde llego, como una serie de pasos
  // de dolly), asi que el total se controla: seis pasos del 5% dejan la camara 26% mas cerca, que ya es
  // otro plano. Con `volver: true` cada empujon regresa y no acumula nada.
  api.puntuacion = function (o) {
    o = o || {};
    var donde = o.donde || "C08 puntuacion";
    var cam = laCamara(o, donde);
    var beats = pedir(o, "beats", donde);
    if (beats.length < 2) { throw new Error(donde + ": `beats` con " + beats.length + " entrada(s). Un empujon suelto es C01 con modo remate; la puntuacion son varios."); }
    var dur = o.duracion === undefined ? 8 : entero(o.duracion, "duracion", donde);
    var empuje = o.empuje === undefined ? 0.05 : o.empuje;
    var volver = o.volver === true;

    banda(dur, 6, 12, "cada empujon", donde, "Un empujon de puntuacion es un acento: 6-12 cuadros. Mas largo deja de puntuar y se vuelve un movimiento con vida propia.");
    banda(empuje, 0.02, 0.09, "el empuje", donde, "3-8% de la distancia por empujon. Menos no se percibe; mas deja de ser puntuacion y se vuelve el gesto principal del plano.");

    var i, prev = null;
    for (i = 0; i < beats.length; i++) {
      beats[i] = entero(beats[i], "beats[" + i + "]", donde);
      if (prev !== null) {
        var hueco = beats[i] - prev - dur;
        if (hueco < 30) {
          throw new Error(donde + ": entre el empujon del cuadro " + prev + " y el del " + beats[i] +
                          " quedan " + hueco + " cuadros de camara quieta, y el minimo es 30. Sin " +
                          "quietud entre acentos no hay puntuacion: hay una camara que se mueve todo " +
                          "el tiempo, que es exactamente el diagnostico que este gesto viene a corregir.");
        }
        if (hueco > 60 + dur) {
          G.avisar(donde + ": " + hueco + " cuadros de camara quieta entre dos empujones. Arriba de 60 " +
                   "el ojo pierde la relacion entre uno y otro y cada empujon se lee suelto.");
        }
      }
      prev = beats[i];
    }

    var blanco = o.sobre === "camara" ? cam : api.plataforma({ donde: donde });
    var e = ejesDe(blanco, donde);
    var p0 = mundoDe(cam, beats[0], donde);
    var d = 0 - p0[2];
    var base = valorEn(e.z, beats[0]);
    var lista = [], acumulado = 0, pxTotal = 0;

    for (i = 0; i < beats.length; i++) {
      var salto = d * empuje;
      var antes = base + acumulado;
      var despues = antes + salto;
      pxTotal = pxTotal + pxDeAcercamiento(d, d - salto);
      lista[lista.length] = [beats[i], antes, "C1"];
      lista[lista.length] = [beats[i] + dur, despues, volver ? "C2" : "LINEAL"];
      if (volver) {
        lista[lista.length] = [beats[i] + dur + Math.round(dur * 1.5), antes];
      } else {
        acumulado = acumulado + salto;
        d = d - salto;
      }
      noCoincide(beats[i], donde);
    }

    if (!volver) {
      var total = Math.abs(acumulado) / (0 - p0[2]);
      if (total > 0.25) {
        throw new Error(donde + ": los " + beats.length + " empujones acumulan " + pct(total) + "% de la " +
                        "distancia inicial. Arriba del 25% la camara termino en otro plano sin que nadie " +
                        "lo decidiera: o bajas `empuje`, o pones `volver: true`, o partis la pieza en " +
                        "planos de verdad con C09.");
      }
    }

    var ult = lista[lista.length - 1][0];
    libre(e.z, beats[0], ult, donde, "la Z de '" + blanco.name + "'");
    revisarProfundidad(cam, o.zCercano === undefined ? 0 : o.zCercano, ult, o.nombreCercano || "la capa mas cercana", p0[2] + acumulado);
    aporte(pxTotal, beats[0], ult, donde, o.motivo);
    G.claves(e.z, lista, donde);

    G.anotar("C08|" + donde + "|" + beats.length + " empujones de " + dur + " cuadros|" +
             (volver ? "vuelven" : "acumulan") + "|" + Math.round(pxTotal) + " px");
    return { capa: blanco, eje: e.z, beats: beats, px: pxTotal, fin: ult };
  };

  // ==============================================================================================
  // C09 · CORTE DE CAMARA
  // ==============================================================================================
  //
  // El gesto mas barato del catalogo y el que mas falta hace: seis claves HOLD son seis planos. Una
  // pieza de 14 segundos con un solo plano es lenta por definicion, por mucho que se mueva adentro — y
  // el "beat que falta" se construye antes con cortes que con animacion.
  //
  // ADEMAS ES EL UNICO MOVIMIENTO DE CAMARA SIN RIESGO ESPACIAL NINGUNO: entre dos claves HOLD no hay
  // interpolacion, asi que la Auto-Bezier espacial de AE —la que diverge del motor en silencio— no
  // llega ni a existir. Por eso aca se usa la posicion entera y no las dimensiones separadas.
  //
  // Y ACA VA LA TRAMPA QUE NO TIENE SINTOMA PROPIO: con el obturador encendido, el reproductor toma
  // varias muestras DENTRO de la ventana del obturador (`capturar-comp.py:267-284`) y las promedia. Con
  // el defecto de AE —angulo 180, fase −90— la ventana esta centrada en el cuadro, o sea que la MITAD
  // de las muestras del cuadro del corte todavia ven el plano viejo. El corte sale como un fundido de
  // un cuadro. No da error y en el video se lee como un fantasma.
  api.corteDeCamara = function (o) {
    o = o || {};
    var donde = o.donde || "C09 corteDeCamara";
    var cam = laCamara(o, donde);
    var planos = pedir(o, "planos", donde);
    if (planos.length < 2) { throw new Error(donde + ": `planos` con " + planos.length + ". Un solo plano no es un corte."); }

    var lista = [], i, prev = null;
    for (i = 0; i < planos.length; i++) {
      var cu = entero(planos[i][0], "planos[" + i + "][0]", donde);
      var pos = planos[i][1];
      if (!pos || pos.length < 3) { throw new Error(donde + ": el plano " + i + " no trae [x, y, z]."); }
      if (prev !== null) {
        var largo = cu - prev;
        if (largo < 20) {
          throw new Error(donde + ": el plano que arranca en " + prev + " dura " + largo + " cuadros. " +
                          "El piso es 20 (ritmo alto); en piezas de producto los planos van de 45 a 120. " +
                          "Abajo de 20 no es montaje, es parpadeo.");
        }
        if (largo > 150) {
          G.avisar(donde + ": el plano que arranca en " + prev + " dura " + largo + " cuadros. Arriba de " +
                   "120 vuelve el problema que los cortes venian a resolver: un plano largo es lento por " +
                   "definicion.");
        }
      }
      // M4 · la cuantizacion. Un corte es el acento mas fuerte que hay: cae en la grilla o suena mal y
      // nadie sabe decir por que. A 30 fps y 120 bpm la negra son 15 cuadros y la corchea 8.
      if (cu % 15 !== 0 && cu % 8 !== 0) {
        G.avisar(donde + ": el corte del cuadro " + cu + " no cae en multiplo de 8 ni de 15. Los " +
                 "arranques macro van en la grilla (negra = 15 cuadros a 120 bpm); el mas cercano es " +
                 (Math.round(cu / 15) * 15) + ".");
      }
      revisarProfundidad(cam, o.zCercano === undefined ? 0 : o.zCercano, cu,
                         (o.nombreCercano || "la capa mas cercana") + " en el plano " + i, pos[2]);
      lista[lista.length] = [cu, [pos[0], pos[1], pos[2]], "HOLD"];
      prev = cu;
    }

    var conObturador = false;
    try { conObturador = G.comp().motionBlur ? true : false; } catch (exB) { conObturador = false; }
    if (conObturador && o.aceptoElFundido !== true) {
      throw new Error(donde + ": la comp tiene el obturador ENCENDIDO y estas poniendo " + planos.length +
                      " cortes. El reproductor toma sus muestras dentro de la ventana del obturador y las " +
                      "promedia; con angulo 180 y fase -90 la ventana esta centrada en el cuadro, asi que " +
                      "la mitad de las muestras del cuadro del corte todavia ven el plano viejo y el " +
                      "corte sale como un fundido de un cuadro. No da error: se ve como un fantasma. " +
                      "O apagas el obturador en esta pieza, o declaras `aceptoElFundido: true`.");
    }
    if (conObturador) {
      G.avisar(donde + ": " + planos.length + " cortes con obturador encendido — cada corte sale como un " +
               "fundido de medio cuadro, declarado a proposito.");
    }

    var prop = G.pos(cam);
    var sep = false;
    try { sep = prop.dimensionsSeparated ? true : false; } catch (exS) { sep = false; }
    if (sep) {
      throw new Error(donde + ": la posicion de la camara ya tiene las dimensiones SEPARADAS, o sea que " +
                      "otro gesto (C01, C06, C08) ya la esta usando. Los cortes necesitan la posicion " +
                      "entera. Llevate el otro gesto a la plataforma con `sobre: \"plataforma\"` y deja " +
                      "la camara para el montaje.");
    }
    libre(prop, lista[0][0], lista[lista.length - 1][0], donde, "la posicion de la camara");
    G.claves(prop, lista, donde);

    G.anotar("C09|" + donde + "|" + planos.length + " planos");
    return { camara: cam, prop: prop, planos: planos };
  };

  // ==============================================================================================
  // C10 · DERIVA SOSTENIDA
  // ==============================================================================================
  //
  // Dos claves, principio y fin del plano, LINEAL. La deriva tiene que ser INDIFERENTE: con ease se lee
  // como intencion —como que la camara va a algun lado— y arruina el efecto, que es justamente que no
  // se perciba como movimiento sino como que el plano esta vivo. Por eso una curva pedida se tira en vez
  // de aceptarse en silencio: es la misma familia de error que un rebote con ease de entrada.
  //
  // REGLA DE CONVIVENCIA: deriva y micro-movimiento NO van en el mismo eje. La deriva vive en escala o
  // en Z; el micro en X/Y/rotacion. Dos cosas lentas en el mismo eje se suman y ninguna de las dos se
  // lee como lo que era.
  api.deriva = function (o) {
    o = o || {};
    var donde = o.donde || "C10 deriva";
    var desde = entero(pedir(o, "desde", donde), "desde", donde);
    var hasta = entero(pedir(o, "hasta", donde), "hasta", donde);
    var dur = hasta - desde;
    if (dur <= 0) { throw new Error(donde + ": `hasta` no es posterior a `desde`"); }
    banda(dur, 90, 150, "la duracion", donde, "La deriva cubre un plano entero. Abajo de 90 cuadros se percibe como un movimiento y deja de ser deriva; arriba de 150 conviene partirla en dos planos.");

    if (o.curva !== undefined && o.curva !== "LINEAL") {
      throw new Error(donde + ": pediste la curva '" + o.curva + "' para una deriva. Va LINEAL y punto. " +
                      "Una deriva con ease se lee como INTENCION —como que la camara va a algun lado— y " +
                      "eso rompe lo unico que la deriva hace: no notarse. Es la misma familia de error " +
                      "que ponerle ease a las claves que alimentan un rebote.");
    }

    var cam = laCamara(o, donde);
    var modo = o.modo === undefined ? "z" : o.modo;
    var capa, prop, base, valorFinal, px;
    var zoom = zoomEn(cam, desde);
    var p0 = mundoDe(cam, desde, donde);
    var d = 0 - p0[2];

    if (modo === "z") {
      var unidades = o.unidades === undefined ? -40 : o.unidades;
      banda(Math.abs(unidades), 15, 70, "la deriva en Z", donde, "El rango medido es 20-60 unidades por plano. Menos no se percibe ni de casualidad; mas deja de ser deriva y es un empuje (C01).");
      capa = o.capa === undefined ? api.plataforma({ donde: donde }) : o.capa;
      var e = ejesDe(capa, donde);
      prop = e.z;
      base = valorEn(prop, desde);
      valorFinal = base + unidades;
      px = pxDeAcercamiento(d, d - unidades);
    } else if (modo === "escala") {
      var pctFinal = o.escala === undefined ? 103 : o.escala;
      banda(pctFinal, 100.5, 106, "la escala final", donde, "La deriva de escala util es 102-105%. Arriba de 106 se lee como un zoom, y un zoom es otro gesto.");
      capa = o.capa === undefined ? api.plataforma({ donde: donde }) : o.capa;
      if (capa instanceof CameraLayer) {
        throw new Error(donde + ": una camara no tiene ESCALA. La deriva de escala se hace sobre el nulo " +
                        "del mundo (C03) o sobre la plataforma, que si la tienen — y por eso la " +
                        "plataforma se construye con el ancla en el centro del cuadro: escalar desde la " +
                        "esquina empujaria todo hacia abajo y a la derecha.");
      }
      prop = G.esc(capa);
      base = valorEn(prop, desde);
      valorFinal = [base[0] * pctFinal / 100, base[1] * pctFinal / 100,
                    base.length > 2 ? base[2] * pctFinal / 100 : 100];
      px = G.ancho() / 2 * Math.abs(pctFinal / 100 - 1);
    } else {
      throw new Error(donde + ": `modo` es 'z' (la camara se acerca despacio) o 'escala' (el mundo crece " +
                      "despacio). Vino '" + modo + "'.");
    }

    if (px / dur > 0.6) {
      G.avisar(donde + ": la deriva aporta " + un(px / dur) + " px por cuadro. Durante un silencio de " +
               "protagonista el techo es 0,6 — arriba de eso la camara pasa a ser el elemento que se " +
               "mueve, que es lo que la deriva no tiene que ser nunca.");
    }
    // LA DERIVA NO PASA POR LA REGLA DE LA NO COINCIDENCIA, y es la unica del modulo que no lo hace.
    // Esa regla protege contra dos gestos LEGIBLES que arrancan juntos y se tapan entre si; una deriva
    // lineal de 0,1 px por cuadro no es un gesto legible — es, a proposito, algo que no se percibe como
    // movimiento. Y ademas la deriva cubre el plano entero, asi que sus extremos caen siempre donde
    // empieza o termina una seccion, que es exactamente donde hay eventos de elemento.
    aporte(px, desde, hasta, donde, o.motivo);
    libre(prop, desde, hasta, donde, "la propiedad de la deriva de '" + capa.name + "'");
    G.claves(prop, [[desde, base, "LINEAL"], [hasta, valorFinal]], donde);

    G.anotar("C10|" + donde + "|" + modo + "|" + desde + "-" + hasta + "|" + un(px) + " px (" +
             un(px / dur) + " px/cuadro)");
    return { capa: capa, prop: prop, px: px };
  };

  // ==============================================================================================
  // C11 · MULTIPLANO
  // ==============================================================================================
  //
  // Capas repartidas en Z que al moverse la camara se desplazan a velocidades distintas. Es la unica
  // forma de que un monton de planos se lea como un espacio, y es la base de todo: el consejo que
  // aparece una y otra vez es "dolly lento con separacion fuerte en Z gana a orbitar", y los
  // principiantes hacen exactamente lo contrario.
  //
  // DOS CUENTAS QUE NO SE PUEDEN SALTEAR:
  //   · la separacion entre planos vecinos tiene que ser >=15% del zoom, o el paralaje no se percibe y
  //     lo unico que se consigue es tener las capas mas chicas.
  //   · alejar una capa la ACHICA. Si no se compensa la escala con (d/zoom)·100, la composicion que se
  //     penso en plano se deshace al repartir la profundidad. Se compensa sola salvo que se pida que no.
  api.multiplano = function (o) {
    o = o || {};
    var donde = o.donde || "C11 multiplano";
    var cam = laCamara(o, donde);
    var planos = pedir(o, "planos", donde);
    var cuadro = o.cuadro === undefined ? 0 : entero(o.cuadro, "cuadro", donde);
    var zoom = zoomEn(cam, cuadro);
    var camPos = mundoDe(cam, cuadro, donde);
    var compensa = o.compensar !== false;

    var i, salida = [], cosas = [], zs = [];
    for (i = 0; i < planos.length; i++) {
      var pl = planos[i];
      var capa = pl.capa;
      if (!capa) { throw new Error(donde + ": el plano " + i + " no trae `capa`."); }
      if (pl.z === undefined) { throw new Error(donde + ": el plano " + i + " ('" + capa.name + "') no trae `z`."); }
      if (!capa.threeDLayer) {
        throw new Error(donde + ": '" + capa.name + "' no es 3D. Una capa 2D no vive en el mundo: se " +
                        "dibuja despues de todo lo 3D y sin paralaje ninguno, asi que repartirle una z " +
                        "no hace absolutamente nada (`comp3d.html:1071`).");
      }
      if (capa.parent !== null && capa.parent !== undefined) {
        throw new Error(donde + ": '" + capa.name + "' cuelga de '" + capa.parent.name + "', asi que la " +
                        "`z` que le paso no es la profundidad que va a tener: es local a su padre. " +
                        "Reparti la profundidad ANTES de armar los aparejos, o pasale al plano la z del " +
                        "padre y colgale el resto.");
      }
      var p = posEn(capa, cuadro);
      ponerPos(capa, [p[0], p[1], pl.z]);
      var esc = G.esc(capa).value;
      if (compensa) {
        // COMPENSAR LA ESCALA supone que la capa se compuso en z=0, que es como se compone: se mira el
        // cuadro y se acomoda. Si ya venia repartida en profundidad hay que decir de donde viene
        // (`zPrevio`), o la compensacion se aplica dos veces.
        var k = api.escalaQueConserva(pl.z) / 100;
        var k0 = pl.zPrevio === undefined ? 1 : api.escalaQueConserva(pl.zPrevio) / 100;
        G.esc(capa).setValue([esc[0] * k / k0, esc[1] * k / k0, esc.length > 2 ? esc[2] * k / k0 : 100]);
      }
      revisarProfundidad(cam, pl.z, cuadro, capa.name);
      var mundo = [p[0], p[1], pl.z];
      cosas[cosas.length] = { nombre: capa.name, prof: pl.z - camPos[2], holgura: pl.holgura || 0,
                              caja: cajaDeCapa(capa, mundo, camPos, zoom) };
      zs[zs.length] = pl.z;
      salida[salida.length] = { capa: capa, z: pl.z, escalaAparente: api.escalaAparente(pl.z) };
    }

    zs.sort(function (a, b) { return a - b; });
    // EL 15% DEL ZOOM, CON UN PELO DE TOLERANCIA, y el pelo no es pereza: el reparto canonico del
    // catalogo —fondo 1500, medio 400, sujeto 0, adelanto −600— deja 400 justos entre el sujeto y el
    // medio, y el 15% de 2666,67 da 400,0005. Sin tolerancia, la biblioteca rechaza la disposicion que
    // el propio catalogo recomienda, y una compuerta que reprueba el ejemplo de su manual se aprende a
    // ignorar en la primera hora.
    var minimo = 0.15 * zoom;
    for (i = 1; i < zs.length; i++) {
      var sep = zs[i] - zs[i - 1];
      if (sep > 0 && sep < minimo * 0.99) {
        throw new Error(donde + ": dos planos vecinos quedan a " + un(sep) + " unidades (z=" + zs[i - 1] +
                        " y z=" + zs[i] + ") y el minimo util es " + Math.round(minimo) + " — el 15% del " +
                        "zoom. Con menos separacion no hay paralaje que se perciba: lo unico que se " +
                        "consigue es tener las capas mas chicas y compensarlas con escala, o sea " +
                        "trabajo y ningun efecto.");
      }
    }
    revisarEmpates(cosas, donde, o.aceptoElEmpate);

    G.anotar("C11|" + donde + "|" + planos.length + " planos|z " + zs.join(", ") + "|separacion minima " +
             Math.round(minimo));
    return salida;
  };

  // ==============================================================================================
  // C12 · NUBE DE PANELES
  // ==============================================================================================
  //
  // Ocho a catorce paneles en el espacio, hijos de un nulo girado 15-25 grados en Y. Es EL recurso de
  // las piezas de producto de software, y es la respuesta directa al diagnostico: la nube hace cosas
  // mientras la camara casi no se mueve.
  //
  // DOS COSAS SEPARAN UNA NUBE VIVA DE UNA UTILERIA QUIETA:
  //   · LA GRILLA VA PERTURBADA. Una grilla pura se lee como pared; perturbada se lee como espacio.
  //   · LOS PANELES NO ESTAN QUIETOS. Cada uno con deriva propia en Z de +-20-40 unidades, periodo 4-7
  //     segundos y fase desfasada. Individualmente es imperceptible; en conjunto cambia el plano entero.
  //
  // LA DERIVA VA COMO EXPRESION Y ESO ES SEGURO: el exportador NO manda expresiones, las HORNEA
  // (`exportar.jsx:210-220`) muestreando `valueAtTime` cuadro por cuadro, y ademas MIDE el error de
  // muestreo. Un seno de periodo 120-210 cuadros muestreado 30 veces por segundo tiene error de
  // subpixel. Lo que si aliasaria es un wiggle rapido — por eso el periodo tiene piso.
  //
  // Y LA DERIVA PUEDE CREAR EMPATES. Dos paneles a la misma profundidad que se pisan en pantalla y
  // oscilan con fases distintas cruzan el orden de dibujo, y ahi AE y el motor no tienen por que
  // desempatar igual. Se comprueba contra el peor momento, no contra la foto quieta.
  api.nubeDePaneles = function (o) {
    o = o || {};
    var donde = o.donde || "C12 nubeDePaneles";
    var cam = laCamara(o, donde);
    var capas = pedir(o, "capas", donde);
    var n = capas.length;
    if (n < 6 || n > 16) {
      throw new Error(donde + ": " + n + " paneles. La nube vive entre 8 y 14 (6 y 16 con holgura): con " +
                      "menos se leen como objetos sueltos y con mas se lee como una textura y ningun " +
                      "panel se puede mirar.");
    }

    var giro = o.giro === undefined ? 20 : o.giro;
    banda(Math.abs(giro), 12, 28, "el giro del nulo", donde, "El rango util es 15-25 grados: con menos la pared queda frontal y no hay volumen, con mas los paneles del fondo se ven de canto y su contenido deja de leerse.");
    var cols = o.columnas === undefined ? Math.ceil(Math.sqrt(n)) : o.columnas;
    var filas = Math.ceil(n / cols);
    var pasoX = o.pasoX === undefined ? 620 : o.pasoX;
    var pasoY = o.pasoY === undefined ? 420 : o.pasoY;
    var amp = o.amplitud === undefined ? 30 : o.amplitud;
    banda(amp, 15, 45, "la amplitud de la deriva", donde, "20-40 unidades. Menos no cambia nada; mas se percibe como que los paneles se mueven, y la gracia es que no se perciba.");
    var periodo = o.periodo === undefined ? 5.5 : o.periodo;
    banda(periodo, 4, 7, "el periodo de la deriva", donde, "4-7 segundos. Mas rapido se lee como que la nube respira y llama la atencion; y abajo de 2 segundos el muestreo cuadro a cuadro del exportador empieza a perder la forma del seno.");

    var centro = o.centro === undefined ? [G.ancho() / 2, G.alto() / 2, 400] : o.centro;
    var nulo = G.comp().layers.addNull(G.cuadros() / G.fps());
    nulo.name = o.nombre || "nube";
    nulo.threeDLayer = true;
    G.anc(nulo).setValue([0, 0, 0]);
    G.pos(nulo).setValue([centro[0], centro[1], centro[2]]);
    G.rotY(nulo).setValue(giro);

    var azar = semillero(o.semilla === undefined ? 7 : o.semilla);
    var i, paneles = [], locales = [];
    for (i = 0; i < n; i++) {
      var col = i % cols, fil = Math.floor(i / cols);
      var lx = (col - (cols - 1) / 2) * pasoX + (azar() - 0.5) * pasoX * 0.30;
      var ly = (fil - (filas - 1) / 2) * pasoY + (azar() - 0.5) * pasoY * 0.30;
      var lz = (azar() - 0.5) * 2 * (o.espesor === undefined ? 160 : o.espesor);
      // G.colgar (no colgarSinTocar) A PROPOSITO: el panel tiene que quedar PLANO en el marco del nulo.
      // Es exactamente el caso que costo la PIEZA-J: al emparentar, AE le escribe al hijo el angulo
      // contrario al del padre para conservar su orientacion en el mundo, y una tira de seis paneles
      // quedo girada 104 grados —de perfil, 17 px de ancho— sin un solo error.
      G.colgar(capas[i], nulo, [lx, ly, lz]);
      locales[i] = [lx, ly, lz];
      paneles[i] = capas[i];
    }

    // LOS PANELES EN EL MUNDO. La pared esta girada en Y, asi que la profundidad de un panel la decide
    // sobre todo su X local: con 20 grados, una pared de 1600 de ancho reparte 547 unidades de
    // profundidad entre la columna de la izquierda y la de la derecha. Ese es el volumen de la nube, y
    // es tambien lo que hace que el orden de dibujo NO sea el de la lista.
    var camPos = mundoDe(cam, o.cuadro === undefined ? 0 : o.cuadro, donde);
    var zoom = zoomEn(cam, o.cuadro === undefined ? 0 : o.cuadro);
    var c = Math.cos(giro * GRADO), s = Math.sin(giro * GRADO);
    var cosas = [], profundidades = [];
    for (i = 0; i < n; i++) {
      var L = locales[i];
      var wx = centro[0] + L[0] * c + L[2] * s;
      var wy = centro[1] + L[1];
      var wz = centro[2] - L[0] * s + L[2] * c;
      profundidades[i] = wz;
      revisarProfundidad(cam, wz, 0, paneles[i].name);
      // el `c` como achatamiento: un panel de una pared girada 20 grados se ve al 94% de su ancho
      cosas[i] = { nombre: paneles[i].name, prof: wz - camPos[2], holgura: amp,
                   caja: cajaDeCapa(paneles[i], [wx, wy, wz], camPos, zoom, Math.abs(c)) };
    }
    revisarEmpates(cosas, donde, o.aceptoElEmpate);

    // LA ENTRADA VA ANTES QUE LA DERIVA, y el orden importa: la entrada necesita leer la Z BASE de cada
    // panel, y con la expresion ya enganchada lo que se lee es la base MAS el seno de ese instante.
    // (`valorEn` pide el valor pre-expresion justamente por esto, asi que el orden es cinturon y
    // tirantes — pero uno de los dos tenia que estar y los dos son gratis.)
    var entrada = null;
    if (o.entra !== false) {
      entrada = api.escalonadoEnProfundidad({
        donde: donde + " (entrada)", capas: paneles, desde: o.desde === undefined ? 0 : o.desde,
        duracion: o.duracionEntrada, retardo: o.retardo, offset: o.offsetEntrada,
        sentido: o.sentido, curva: "C1", opacidad: true, cam: cam, profundidades: profundidades,
        // las cajas ya estan calculadas aca arriba CON el giro de la pared, que es la unica forma de
        // que la comprobacion de cruces sepa que se pisa y que no
        cajas: cajasDe(cosas), aceptoElEmpate: o.aceptoElEmpate
      });
    }

    // LA DERIVA, con la fase corrida panel a panel. 1,1 rad no es divisor de 2*pi a proposito: con 1,57
    // (pi/2) los paneles se sincronizarian de a cuatro y la nube volveria a respirar toda junta, que es
    // exactamente el defecto que la deriva desfasada viene a evitar.
    for (i = 0; i < n; i++) {
      var e = ejesDe(paneles[i], donde);
      e.z.expression = G.lineas([
        "amp = " + amp + "; per = " + periodo + "; fase = " + un(i * 1.1) + ";",
        "value + amp * Math.sin(time * 2 * Math.PI / per + fase);"
      ]);
    }

    G.anotar("C12|" + donde + "|" + n + " paneles|" + cols + "x" + filas + "|giro " + giro +
             "|deriva +-" + amp + " cada " + periodo + " s");
    return { nulo: nulo, paneles: paneles, locales: locales, entrada: entrada };
  };

  // ==============================================================================================
  // C13 · ESCALONADO EN PROFUNDIDAD
  // ==============================================================================================
  //
  // La mejor relacion resultado/costo del frente, y lo contrario exacto de la utileria quieta: los
  // elementos entran desde el fondo hacia adelante, uno tras otro, y el ojo lee una ola que avanza.
  //
  // DOS FORMAS, Y LA SEGUNDA ES LA QUE PIDE LA PIEZA:
  //
  //   modo "ola"  — cada capa entra desde su z + offset hasta su z final, con opacidad 0 a 100. El
  //                 retardo lo pone la PROFUNDIDAD, no el orden de la lista.
  //
  //   modo "pila" — N copias superpuestas que se abren en profundidad. El gesto EMPIEZA EN CERO: los
  //                 naipes ya estan vivos y visibles antes de moverse. Y esto solo funciona asi: si las
  //                 copias entran justo cuando arranca la apertura, se lee como que aparecieron de la
  //                 nada y el gesto no existe. Por eso se exige que esten vivas y con opacidad antes.
  //
  // EL OFFSET ES UNIFORME —cada capa entra "desde SU z mas 400", no "desde z=400"— y esa cuenta hay que
  // hacerla, no confiarla. Con offset uniforme las capas se cruzan igual, porque la ola las suelta a
  // destiempo: mientras la del fondo ya llego, la de adelante todavia esta 400 mas atras que su lugar.
  // La condicion exacta de que dos capas se crucen es
  //
  //     |z_i − z_j|  <  offset · min(1, |arranque_i − arranque_j| / duracion)
  //
  // o sea que con retardo 3 y duracion 14, dos vecinas se cruzan si estan a menos de offset·0,21 = 86
  // unidades. Con el reparto del multiplano (400 y mas) no pasa nunca; con una ola de diez capas
  // repartidas cada 50, pasa entre todas.
  //
  // Y UN CRUCE YA NO ES UN DEFECTO: el reproductor ordena por distancia a la camara igual que AE. Lo
  // que importa es que TODO cruce pasa por un EMPATE, y un empate entre dos capas que se pisan en
  // pantalla es un cuadro que puede salir al reves. Por eso se comprueban las dos cosas juntas: cruce
  // posible Y solape en pantalla.
  //
  // Y UNA COSA QUE EL CATALOGO NO DICE: una pila EXACTAMENTE superpuesta son N empates perfectos. Un
  // mazo de naipes tiene espesor; se le da 2 unidades por copia, que rompe el empate (el umbral es 1) y
  // no se ve.
  api.escalonadoEnProfundidad = function (o) {
    o = o || {};
    var donde = o.donde || "C13 escalonadoEnProfundidad";
    var cam = o.cam === undefined ? laCamara(o, donde) : o.cam;
    var modo = o.modo === undefined ? "ola" : o.modo;
    var desde = entero(o.desde === undefined ? 0 : o.desde, "desde", donde);
    var dur = o.duracion === undefined ? 14 : entero(o.duracion, "duracion", donde);
    var retardo = o.retardo === undefined ? 3 : o.retardo;
    var curva = o.curva === undefined ? "C1" : o.curva;
    banda(dur, 12, 18, "la duracion de cada capa", donde, "12-18 cuadros por elemento. Mas corto y la ola se lee como un parpadeo; mas largo y deja de haber ola porque todas estan en el aire a la vez.");
    banda(retardo, 2, 4, "el retardo", donde, "2-4 cuadros entre vecinas. Con menos no hay escalonado y con mas se leen como N entradas sueltas, no como una ola.");

    if (modo === "pila") { return pila(o, donde, cam, desde, dur, retardo, curva); }
    if (modo !== "ola") { throw new Error(donde + ": `modo` es 'ola' o 'pila'. Vino '" + modo + "'."); }

    var capas = pedir(o, "capas", donde);
    var offset = o.offset === undefined ? 400 : o.offset;
    if (offset <= 0) { throw new Error(donde + ": `offset` es cuanto MAS LEJOS arranca cada capa, y tiene que ser positivo."); }
    var haciaElFondo = o.sentido === "haciaElFondo";
    var conOpacidad = o.opacidad !== false;

    var i, zmax = -1e9, zmin = 1e9, zs = [];
    for (i = 0; i < capas.length; i++) {
      var p = posEn(capas[i], desde);
      zs[i] = p[2];
      if (p[2] > zmax) { zmax = p[2]; }
      if (p[2] < zmin) { zmin = p[2]; }
    }
    var span = Math.max(1, zmax - zmin);

    // los arranques primero, para poder mirar los cruces ANTES de escribir una sola clave
    var arranques = [], fin = desde;
    for (i = 0; i < capas.length; i++) {
      // el retardo lo pone la PROFUNDIDAD, no el indice: es lo que hace que la ola avance en el espacio
      // y no en el orden en que alguien escribio la lista
      var fr = (zmax - zs[i]) / span;
      if (haciaElFondo) { fr = 1 - fr; }
      arranques[i] = desde + Math.round(fr * retardo * (capas.length - 1));
      if (arranques[i] + dur > fin) { fin = arranques[i] + dur; }
    }
    revisarCruces(capas, zs, arranques, dur, offset, cam, desde, donde, o);

    for (i = 0; i < capas.length; i++) {
      var t0 = arranques[i];
      var t1 = t0 + dur;
      var e = ejesDe(capas[i], donde);
      libre(e.z, t0, t1, donde, "la Z de '" + capas[i].name + "'");
      G.claves(e.z, [[t0, zs[i] + offset, curva], [t1, zs[i]]], donde);
      if (conOpacidad) {
        var op = G.op(capas[i]);
        libre(op, t0, t1, donde, "la opacidad de '" + capas[i].name + "'");
        G.claves(op, [[t0, 0, curva], [t1, 100]], donde);
      }
      // LA Z QUE SE ANIMA ES LOCAL Y LA DISTANCIA AL OJO ES DEL MUNDO. Con las capas sueltas coinciden;
      // colgadas de un nulo (la nube) no, y comprobar la profundidad con el numero local da un aviso
      // que habla de otra escena. Si el aparejo esta girado no se puede resolver aca: lo comprueba
      // quien lo armo, que si conoce la rotacion, y lo pasa en `profundidades`.
      var zMundo = o.profundidades ? o.profundidades[i] : null;
      if (zMundo === null || zMundo === undefined) {
        var pm = posMundoEn(capas[i], desde);
        zMundo = pm === null ? null : pm[2];
      }
      if (zMundo !== null) {
        revisarProfundidad(cam, zMundo + offset, t0, capas[i].name + " al arrancar");
        revisarProfundidad(cam, zMundo, t1, capas[i].name + " al llegar");
      }
    }

    G.anotar("C13|" + donde + "|ola de " + capas.length + "|offset " + offset + "|" + desde + "-" + fin);
    return { capas: capas, desde: desde, fin: fin, offset: offset };
  };

  // LOS CRUCES DE LA OLA. Se comprueba par por par con la condicion exacta, y solo se acusa cuando el
  // cruce ADEMAS coincide con solape en pantalla — que es cuando el desempate decide lo que se ve.
  // Sin las cajas en pantalla no se puede confirmar, y ahi se avisa en vez de tirar: acusar un defecto
  // que no se pudo comprobar es la manera mas rapida de que a esta biblioteca se la empiece a ignorar.
  function revisarCruces(capas, zs, arranques, dur, offset, cam, cuadro, donde, o) {
    var camPos = posMundoEn(cam, cuadro);
    var zoom = zoomEn(cam, cuadro);
    var cajas = o.cajas || null;
    var i, j, duros = [], flojos = [];
    for (i = 0; i < capas.length; i++) {
      for (j = i + 1; j < capas.length; j++) {
        var dz = Math.abs(zs[i] - zs[j]);
        var dt = Math.abs(arranques[i] - arranques[j]);
        var cruce = offset * Math.min(1, dt / dur);
        if (dz >= cruce + 1) { continue; }
        var ca = null, cb = null;
        if (cajas) { ca = cajas[i]; cb = cajas[j]; }
        else if (camPos !== null) {
          var pa = posMundoEn(capas[i], cuadro), pb = posMundoEn(capas[j], cuadro);
          if (pa !== null && pb !== null) {
            ca = cajaDeCapa(capas[i], pa, camPos, zoom);
            cb = cajaDeCapa(capas[j], pb, camPos, zoom);
          }
        }
        var texto = "'" + capas[i].name + "' y '" + capas[j].name + "' (separadas " + un(dz) +
                    " en Z, se cruzan hasta " + un(cruce) + ")";
        if (ca === null || cb === null) { flojos[flojos.length] = texto; }
        else if (solapan(ca, cb)) { duros[duros.length] = texto; }
      }
    }
    if (flojos.length > 0) {
      G.avisar(donde + ": " + flojos.length + " par(es) se cruzan en profundidad durante la ola y no " +
               "pude medir si se pisan en pantalla: " + flojos.join(" · ") + ". Un cruce no es un " +
               "defecto; un cruce con solape es un cuadro que puede salir al reves.");
    }
    if (duros.length > 0 && o.aceptoElEmpate !== true) {
      throw new Error(donde + ": " + duros.length + " par(es) se cruzan en profundidad MIENTRAS se pisan " +
                      "en pantalla: " + duros.join(" · ") + ". En el cruce las dos quedan a la misma " +
                      "distancia del ojo y el orden lo decide el desempate, que AE y el motor no tienen " +
                      "por que resolver igual. Tres salidas: bajar `offset` por debajo de la separacion " +
                      "en Z, achicar el `retardo` (menos destiempo, menos cruce), o entrarlas juntas. " +
                      "Si sabes que da lo mismo, `aceptoElEmpate: true`.");
    }
    return duros.length;
  }

  // LA PILA: N copias superpuestas que se abren. El gesto empieza en cero — o sea que lo que se abre ya
  // estaba ahi, vivo y visible. Es la unica forma de que "empezar en cero" no se lea como aparecer.
  function pila(o, donde, cam, desde, dur, retardo, curva) {
    var capas = o.capas;
    if (capas === undefined) {
      var base = pedir(o, "capa", donde);
      var copias = entero(pedir(o, "copias", donde), "copias", donde);
      if (copias < 2 || copias > 12) {
        throw new Error(donde + ": " + copias + " copias. La pila vive entre 3 y 8: con dos no hay pila " +
                        "y arriba de 12 son 12 capas de documento y 12 mallas por un gesto de un segundo.");
      }
      capas = [base];
      var q;
      for (q = 1; q < copias; q++) {
        var d = base.duplicate();
        d.name = base.name + "-" + q;
        capas[q] = d;
      }
    }
    var n = capas.length;
    var grosor = o.grosor === undefined ? 2 : o.grosor;
    if (grosor < 1.5) {
      throw new Error(donde + ": `grosor` = " + grosor + ". Dos copias a menos de 1,5 unidades de " +
                      "profundidad, pisandose en pantalla al 100%, son un EMPATE: el orden de dibujo lo " +
                      "decide el desempate y nadie garantiza que AE y el motor desempaten igual. Un mazo " +
                      "de naipes tiene espesor de verdad; 2 unidades por copia no se ven y rompen el empate.");
    }
    // `apertura` es la separacion final ENTRE VECINAS, la misma unidad que `grosor`: la pila pasa de
    // estar apilada (grosor) a estar desplegada (apertura), copia por copia.
    var apertura = o.apertura === undefined ? 90 : o.apertura;
    if (apertura <= grosor) { throw new Error(donde + ": `apertura` (" + apertura + ") tiene que ser mayor que el grosor de la pila (" + grosor + "): las dos son la separacion entre copias vecinas, antes y despues."); }
    // EL ABANICO LATERAL, opcional y muy barato. Una pila que se abre SOLO en profundidad se ve como
    // copias que se achican hacia el punto de fuga; con 20-40 px de corrimiento por copia se lee como
    // un mazo que se despliega. Empieza tambien en cero: apiladas, las copias no tienen corrimiento.
    var dx = o.dx === undefined ? 0 : o.dx;
    var dy = o.dy === undefined ? 0 : o.dy;

    // EL GESTO EMPIEZA EN CERO SOLO SI EL OBJETO YA ESTA VIVO Y VISIBLE. Se comprueba, porque es
    // exactamente el defecto que no tiene sintoma: la animacion es correcta y la lectura es "aparecio".
    var i;
    for (i = 0; i < n; i++) {
      var entra = capas[i].inPoint * G.fps();
      if (entra > desde - 6) {
        throw new Error(donde + ": '" + capas[i].name + "' entra en el cuadro " + Math.round(entra) +
                        " y la apertura arranca en el " + desde + ". El gesto que empieza en cero solo " +
                        "funciona si lo que se mueve YA ESTABA ahi: si entra junto con el gesto, se lee " +
                        "como que aparecio de la nada y la apertura no existe. Ponelo en cuadro al menos " +
                        "6 cuadros antes (G.plano).");
      }
      if (valorEn(G.op(capas[i]), desde) < 1) {
        throw new Error(donde + ": '" + capas[i].name + "' tiene opacidad 0 en el cuadro " + desde +
                        ", justo cuando arranca la apertura. Mismo problema: el mazo tiene que verse " +
                        "antes de abrirse.");
      }
    }

    var p0 = posEn(capas[0], desde);
    var fin = desde;
    for (i = 0; i < n; i++) {
      var t0 = desde + Math.round(i * retardo);
      var t1 = t0 + dur;
      if (t1 > fin) { fin = t1; }
      var z0 = p0[2] + i * grosor;
      var z1 = p0[2] + i * apertura;
      // LA POSICION SE ESCRIBE ANTES DE SEPARAR LOS EJES. Al reves, `ADBE Position` ya no acepta valores
      // y la copia se queda donde estaba — sin error y sin pila.
      ponerPos(capas[i], [p0[0], p0[1], z0]);
      var e = ejesDe(capas[i], donde);
      libre(e.z, t0, t1, donde, "la Z de '" + capas[i].name + "'");
      G.claves(e.z, [[t0, z0, curva], [t1, z1]], donde);
      if (dx !== 0) {
        libre(e.x, t0, t1, donde, "la X de '" + capas[i].name + "'");
        G.claves(e.x, [[t0, p0[0], curva], [t1, p0[0] + i * dx]], donde);
      }
      if (dy !== 0) {
        libre(e.y, t0, t1, donde, "la Y de '" + capas[i].name + "'");
        G.claves(e.y, [[t0, p0[1], curva], [t1, p0[1] + i * dy]], donde);
      }
      // el desplazamiento local se traslada tal cual al mundo mientras ningun padre gire, que es lo que
      // `posMundoEn` garantiza al no devolver null
      var pm = posMundoEn(capas[i], desde);
      if (pm !== null) { revisarProfundidad(cam, pm[2] + (z1 - z0), t1, capas[i].name + " abierto"); }
    }

    G.anotar("C13|" + donde + "|pila de " + n + "|grosor " + grosor + " -> apertura " + apertura +
             "|abanico " + dx + "," + dy + "|" + desde + "-" + fin);
    return { capas: capas, desde: desde, fin: fin, grosor: grosor, apertura: apertura };
  }

  // ==============================================================================================
  // C14 · SOMBRA DE CONTACTO
  // ==============================================================================================
  //
  // La mancha oscura debajo de un objeto que flota. Sin ella todo flota en el vacio y el espacio no se
  // lee. Y es la prueba de que no hacen falta luces: una luz de AE es un modelo de iluminacion entero
  // que habria que replicar en three con exactitud de pixel; la sombra falsa cuesta un PNG y da el 90%.
  //
  // EL PNG QUE ESTA FUNCION PIDE:
  //   · un ovalo de degradado radial, del centro opaco al borde TRANSPARENTE, llegando a alfa 0 al 100%
  //     del radio (si el degradado corta antes, se ve el borde del ovalo y parece una mancha pegada);
  //   · negro puro o el color de la sombra ya horneado — la opacidad la pone la capa;
  //   · centrado en el lienzo, con margen: el ovalo no puede tocar el borde del PNG;
  //   · al menos 2x los pixeles con los que se va a dibujar en su momento MAS GRANDE (`G.img` avisa).
  //
  // DOS TRAMPAS, Y LAS DOS ARRUINAN EL GESTO SIN DAR ERROR:
  //
  //   1. LA SOMBRA NO SE CUELGA DEL OBJETO. El catalogo dice "emparentada al objeto" y eso, tal cual,
  //      hace que la sombra SUBA con el: una sombra que vuela es peor que ninguna. La sombra se queda
  //      en el piso y toma del objeto su altura para modular opacidad y escala.
  //
  //   2. UNA SOMBRA ACOSTADA CON LA CAMARA A LA MISMA ALTURA NO SE VE. Un plano acostado (rotacion X
  //      90 grados) visto exactamente de canto proyecta una linea. Con la camara al centro del cuadro
  //      (y = alto/2) y el objeto a la misma altura, la elevacion es CERO y la sombra desaparece — sin
  //      error, sin aviso, solo un PNG que no aparece en el video. Se mide el angulo y se tira.
  //      Salida para composiciones frontales: `acostada: false`, un ovalo paralelo al plano de la
  //      camara puesto debajo del objeto. No es una sombra fisica; se lee igual y siempre se ve.
  api.sombraDeContacto = function (o) {
    o = o || {};
    var donde = o.donde || "C14 sombraDeContacto";
    var cam = laCamara(o, donde);
    var recurso = pedir(o, "recurso", donde);
    var objeto = o.objeto;
    var anchoObjeto = o.anchoObjeto;
    if (anchoObjeto === undefined) {
      if (!objeto) { throw new Error(donde + ": pasa `objeto` (la capa) o `anchoObjeto` (su ancho dibujado en unidades)."); }
      var eo = G.esc(objeto).value;
      anchoObjeto = objeto.width * eo[0] / 100;
    }
    // la sombra es una capa suelta de la comp, o sea que sus coordenadas son del MUNDO. Sacarlas de la
    // posicion propia de un objeto que cuelga de algo la deja en cualquier lado.
    var pObj = objeto ? posMundoEn(objeto, 0) : null;
    if (objeto && pObj === null) {
      throw new Error(donde + ": '" + objeto.name + "' cuelga de un aparejo girado y no puedo sacar su " +
                      "posicion en el mundo. Pasa `x` y `z` de la sombra a mano.");
    }
    var x = o.x === undefined ? (pObj ? pObj[0] : G.ancho() / 2) : o.x;
    var z = o.z === undefined ? (pObj ? pObj[2] : 0) : o.z;
    var ySuelo = pedir(o, "ySuelo", donde);
    var acostada = o.acostada !== false;

    // el angulo con el que la camara ve el piso. Es el numero que decide si este gesto existe.
    var camPos = mundoDe(cam, 0, donde);
    var d = z - camPos[2];
    if (d <= 0) { throw new Error(donde + ": el objeto esta detras de la camara (distancia " + un(d) + ")."); }
    var elevacion = Math.atan((ySuelo - camPos[1]) / d) * 180 / Math.PI;
    if (acostada && elevacion < 3) {
      throw new Error(donde + ": la camara ve el piso con " + un(elevacion) + " grados de elevacion " +
                      "(camara en y=" + un(camPos[1]) + ", suelo en y=" + un(ySuelo) + ", a " +
                      Math.round(d) + " de distancia). Un plano acostado visto de canto proyecta una " +
                      "LINEA: la sombra no se va a ver y no va a dar ningun error. O bajas la camara / " +
                      "subis el suelo hasta pasar los 3 grados (hacen falta " +
                      Math.round(camPos[1] + d * Math.tan(3 * GRADO)) + " de y de suelo, o mas), o usas " +
                      "`acostada: false`, que pone el ovalo paralelo a la camara: no es una sombra " +
                      "fisica, se lee igual y siempre se ve.");
    }
    if (acostada && elevacion < 8) {
      G.avisar(donde + ": la elevacion es de " + un(elevacion) + " grados, asi que la sombra se ve " +
               "aplastada al " + pct(Math.sin(elevacion * GRADO)) + "% de su alto. Se ve, pero es una " +
               "astilla. Y ojo: si la camara ademas esta inclinada (C04 en X), el angulo real no es " +
               "este — esta cuenta usa solo la geometria de las posiciones.");
    }

    // ancho de la sombra = 1,15 x el ancho del objeto en contacto
    var itm = G.recurso(recurso);
    var escalaBase = 115 * anchoObjeto / itm.width;
    // la sombra va 1 unidad MAS LEJOS que el objeto: coplanar exacto es el empate que nadie desempata igual
    var sombra = G.img(recurso, o.nombre || "sombra", x, ySuelo, z + 1, escalaBase);

    // DOS COSAS QUE UNA SOMBRA DE CONTACTO TIENE QUE DECLARAR SOLA, y que no declaraba.
    //
    // 1) VIVE LO QUE VIVE SU OBJETO. Una mancha de apoyo sin nada apoyado encima no es una sombra: es
    //    una mancha. Vivia las 600 cuadros de la comp y se veia sola durante los actos en que su objeto
    //    ni existia.
    //
    // 2) SANGRA POR EL BORDE, Y ESO ES SU FORMA, NO UN DESCUIDO. Es un degradado radial que llega a
    //    alfa 0 en el borde del lienzo, dibujado al 115% del ancho del objeto: se sale del cuadro por
    //    diseno. `marco-check` la reprobaba por "quieta, visible y cortada", que es el mismo criterio
    //    que salvo a la PIEZA-I — y aca es un falso positivo. La compuerta ya tiene la puerta correcta
    //    para esto (declarar SANGRA en el comentario de la capa) y la funcion la usa por su cuenta,
    //    con el motivo escrito, en vez de dejarle el tramite al autor.
    if (objeto) {
      try { G.plano(sombra, objeto.inPoint * G.fps(), objeto.outPoint * G.fps()); } catch (exPl) { }
    }
    sombra.comment = "SANGRA · C14 sombra de contacto: degradado radial al 115% del ancho del objeto, " +
                     "con alfa 0 en el borde del lienzo. Que se salga del cuadro es la tecnica.";
    if (acostada) { G.rotX(sombra).setValue(90); }
    try { if (objeto) { sombra.moveAfter(objeto); } } catch (exM) { }
    G.op(sombra).setValue(o.opacidadBase === undefined ? 26 : o.opacidadBase);

    var op26 = o.opacidadBase === undefined ? 26 : o.opacidadBase;
    var alturas = o.alturas;
    if (alturas === undefined) {
      G.anotar("C14|" + donde + "|estatica|elevacion " + un(elevacion) + " grados|escala " + un(escalaBase));
      return { sombra: sombra, escalaBase: escalaBase, elevacion: elevacion };
    }

    // LIGADURA A LA ALTURA, horneada con LOS MISMOS CUADROS que el objeto. Una sombra desfasada del
    // objeto es peor que ninguna: se ve como que la sombra es de otra cosa.
    //     opacidad(h) = 26 · (1 − h/H)      escala(h) = 100 + 45 · (h/H)
    var H = o.altura === undefined ? 0 : o.altura;
    if (H <= 0) { throw new Error(donde + ": con `alturas` hace falta `altura` (H), la altura desde la que cae — es el divisor de las dos formulas."); }
    var listaOp = [], listaEsc = [], i, ultimo = null;
    for (i = 0; i < alturas.length; i++) {
      var cu = entero(alturas[i][0], "alturas[" + i + "][0]", donde);
      var h = Math.max(0, Math.min(H, alturas[i][1]));
      var f = h / H;
      var cur = alturas[i][2];
      listaOp[listaOp.length] = [cu, op26 * (1 - f), cur];
      listaEsc[listaEsc.length] = [cu, escalaBase * (100 + 45 * f) / 100, cur];
      if (h === 0 && ultimo === null) { ultimo = cu; }
    }

    // EL ACUSE DEL ATERRIZAJE: al tocar, la sombra se encoge un 10% en dos cuadros y vuelve. Eso es lo
    // que dice "toco"; sin eso, el objeto se posa y la sombra no se entera.
    //
    // Y SOLO SE PUEDE AGREGAR AL FINAL. Si el contacto pasa a mitad de la lista —el objeto toca, rebota
    // y vuelve a subir— estas dos claves quedarian fuera de orden, y una lista desordenada NO da error
    // en AE: pisa la clave anterior en silencio (por eso `G.claves` la rechaza). Se dice y no se hace.
    if (ultimo !== null && o.aterriza !== false) {
      if (listaEsc.length > 0 && ultimo === listaEsc[listaEsc.length - 1][0]) {
        listaEsc[listaEsc.length] = [ultimo + 2, escalaBase * 0.90, "C8"];
        listaEsc[listaEsc.length] = [ultimo + 6, escalaBase];
      } else {
        G.avisar(donde + ": el contacto cae en el cuadro " + ultimo + ", que no es la ultima clave de " +
                 "`alturas`, asi que no agrego el acuse del aterrizaje (dos claves DESPUES del contacto " +
                 "quedarian fuera de orden). Si el objeto toca y vuelve a subir, el acuse se autora a " +
                 "mano dentro de `alturas`.");
      }
    }

    var pe = G.esc(sombra), po = G.op(sombra);
    G.claves(po, listaOp, donde + " (opacidad)");
    var lista3 = [], k;
    for (k = 0; k < listaEsc.length; k++) {
      lista3[k] = [listaEsc[k][0], [listaEsc[k][1], listaEsc[k][1], listaEsc[k][1]], listaEsc[k][2]];
    }
    G.claves(pe, lista3, donde + " (escala)");

    G.anotar("C14|" + donde + "|ligada a la altura|H " + H + "|elevacion " + un(elevacion) +
             " grados|" + alturas.length + " claves");
    return { sombra: sombra, escalaBase: escalaBase, elevacion: elevacion, opacidad: po, escala: pe };
  };

  // ==============================================================================================
  // EL RECUENTO
  // ==============================================================================================
  //
  // Lo que esta funcion PUEDE decir: cuanto desplazamiento aparente aporto la camara, en cuantos
  // cuadros, y con que ritmo. Lo que NO puede: cuanto aportaron los elementos — eso vive en las otras
  // familias y se mide sobre el documento exportado con `ritmo.mjs` (M5, cuota de camara <= 0,20). Si
  // la pieza declara `pxDelElementoMasRapido`, aca sale el factor; si no, sale el numero crudo y se
  // dice que falta la otra mitad. Un recuento que se inventara la mitad que no tiene seria peor que no
  // tenerlo.
  api.revisar = function (o) {
    o = o || {};
    sincronizar();
    var i, px = 0, marcados = {}, cuadros = 0, conMotivo = 0;
    for (i = 0; i < APORTE.length; i++) {
      px = px + APORTE[i].px;
      if (APORTE[i].motivo) { conMotivo = conMotivo + 1; }
      var c;
      for (c = APORTE[i].desde; c < APORTE[i].hasta; c++) {
        if (!marcados["c" + c]) { marcados["c" + c] = 1; cuadros = cuadros + 1; }
      }
    }
    var total = G.cuadros();
    var linea = APORTE.length + " gestos de camara · " + Math.round(px) + " px aparentes · se mueve en " +
                cuadros + " de " + total + " cuadros (" + pct(cuadros / Math.max(1, total)) + "%)";
    G.anotar("C-RECUENTO|" + linea);

    if (o.pxDelElementoMasRapido) {
      var porCuadro = px / Math.max(1, cuadros);
      var factor = o.pxDelElementoMasRapido / Math.max(0.001, porCuadro);
      G.anotar("C-FACTOR|camara " + un(porCuadro) + " px/cuadro · elemento " + o.pxDelElementoMasRapido +
               " px/cuadro · factor " + un(factor));
      if (factor < 5) {
        G.avisar("la camara aporta " + un(porCuadro) + " px por cuadro contra " + o.pxDelElementoMasRapido +
                 " del elemento mas rapido: factor " + un(factor) + ". El objetivo es 10 y el piso " +
                 "honesto es 5. Abajo de eso el espectador lee \"me estan paseando por una maqueta\", " +
                 "que es el diagnostico completo de este catalogo.");
      }
    } else {
      G.anotar("C-FACTOR|sin `pxDelElementoMasRapido` no se puede calcular la proporcion camara/elemento; " +
               "la mide ritmo.mjs (M5) sobre el documento exportado");
    }
    if (cuadros > total * 0.6) {
      G.avisar("la camara se mueve en el " + pct(cuadros / total) + "% de los cuadros. La camara es " +
               "continua, si, pero ser continua no es estar siempre en movimiento: entre acentos va " +
               "quieta 30-60 cuadros (C08). Sin quietud no hay contraste y todo pesa igual.");
    }
    return { gestos: APORTE.length, px: px, cuadros: cuadros, conMotivo: conMotivo };
  };

  return api;
})();
