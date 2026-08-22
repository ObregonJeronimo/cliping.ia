// PRUEBA DEL 3D: ¿el modelo de camara de After Effects se reproduce con una camara de perspectiva
// estandar? Es la pregunta que decide la arquitectura del reproductor.
//
// POR QUE IMPORTA TANTO. Lo que separa nuestra pieza del video de Gemini es, sobre todo, paneles en
// PERSPECTIVA con una camara que se mueve entre ellos. Eso no es un efecto: son transformaciones, o
// sea el terreno donde ya demostramos 0,014 px de fidelidad. Pero si la proyeccion de AE no se puede
// reproducir, el reproductor tiene que rehacerse igual y sin saber si va a coincidir — y eso es
// gastar el trabajo antes de saber si sirve.
//
// EL METODO ES EL MISMO QUE YA FUNCIONO DOS VECES: autorar en AE, volcar los numeros que AE dice,
// renderizar los pixeles, y comparar las tres columnas. Con una diferencia importante: aca no alcanza
// con medir DONDE cae el objeto, porque una proyeccion equivocada puede acertar el centro y errar la
// escala. Se miden las dos cosas: el centroide (donde) y la huella (cuan grande), y la huella es la
// que delata el modelo de camara.
//
// LO QUE NO SE ASUME. No se da por sentado que `zoom` sea la distancia focal en pixeles, ni que la
// camara mire al origen, ni como se combinan orientacion y rotaciones. TODO se vuelca y se deja que
// los numeros digan. Adivinar el modelo y despues "corregirlo" hasta que cierre es la forma mas rapida
// de construir una formula que funciona para el caso probado y para ninguno mas.

var RUTA = "C:/ae-probe/camara.txt";
var DIR = "C:/ae-probe/camara";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}

function anotar(t) {
  var a = new File(RUTA);
  a.encoding = "UTF-8";
  a.open("a");
  a.write(t + "\n");
  a.close();
}

function lista(v) {
  if (v === null || v === undefined) { return ""; }
  if (typeof v.length === "number" && typeof v !== "string") { return v.join(";"); }
  return "" + v;
}

function tresDigitos(n) {
  if (n < 10) { return "00" + n; }
  if (n < 100) { return "0" + n; }
  return "" + n;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("prueba de camara");

var NOMBRE = "CAMARA-PRUEBA";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 4;
var LADO = 120;

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}

var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
comp.resolutionFactor = [1, 1];
comp.motionBlur = false;                 // el desenfoque emborrona la huella, y la huella es el dato
comp.bgColor = [0, 0, 0];
comp.openInViewer();

anotar("COMP|" + ANCHO + "|" + ALTO + "|" + FPS + "|" + DUR + "|" + LADO);

// ---------------------------------------------------------------- la camara
// addCamera crea una camara de DOS NODOS: mira siempre a su punto de interes. Eso es comodo para
// autorar y agrega una incognita al modelo (la orientacion sale de mirar al punto, no de sus propias
// claves). Se prueban las dos: primero de dos nodos, y despues se le apaga la auto-orientacion para
// ver si las rotaciones propias mandan.
var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var opciones = camara.property("ADBE Camera Options Group");
var trC = camara.property("ADBE Transform Group");

// SE VUELCA TODO LO QUE LA CAMARA SABE DE SI MISMA, sin interpretar nada todavia.
var CAMPOS = ["ADBE Camera Zoom", "ADBE Camera Focus Distance", "ADBE Camera Aperture",
              "ADBE Camera Blur Level", "ADBE Iris Shape", "ADBE Iris Rotation"];
var q;
for (q = 0; q < CAMPOS.length; q++) {
  var val = "no existe";
  try { val = lista(opciones.property(CAMPOS[q]).value); } catch (exC) { val = "no existe"; }
  anotar("CAMOPT|" + CAMPOS[q] + "|" + val);
}
anotar("CAMPOS|posicion|" + lista(trC.property("ADBE Position").value));
anotar("CAMPOS|puntoDeInteres|" + lista(trC.property("ADBE Anchor Point").value));
var ROT = ["ADBE Orientation", "ADBE Rotate X", "ADBE Rotate Y", "ADBE Rotate Z"];
for (q = 0; q < ROT.length; q++) {
  var rv = "no existe";
  try { rv = lista(trC.property(ROT[q]).value); } catch (exR) { rv = "no existe"; }
  anotar("CAMPOS|" + ROT[q] + "|" + rv);
}
// LA CAMARA SE CENTRA A MANO, y no es un detalle de comodidad.
// `addCamera` la deja en (0, 0, -zoom) mirando a (960, 540, 0): DESCENTRADA. Con esa geometria la
// direccion de vista no es el eje Z, asi que una capa plana en el plano XY se ve escorzada y su
// huella deja de ser un rectangulo — se proyecta como un cuadrilatero. Mi instrumento mide el ancho
// como el maximo de las sumas por fila, que es exacto para un rectangulo alineado a ejes y aproximado
// para cualquier otra cosa.
//
// Medir el caso dificil con un instrumento que solo es exacto en el facil da un error que no se sabe
// de quien es. Primero se verifica el modelo canonico —camara sobre el eje, mirando al centro— y
// recien despues, si cierra, se prueba descentrada. Un experimento a la vez.
var ZOOM = 2666.6666666;
try { ZOOM = opciones.property("ADBE Camera Zoom").value; } catch (exZZ) {}
trC.property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -ZOOM]);
trC.property("ADBE Anchor Point").setValue([ANCHO / 2, ALTO / 2, 0]);
anotar("CAMPOS|posicionCentrada|" + lista(trC.property("ADBE Position").value));

var auto = "?";
try { auto = camara.autoOrient; } catch (exA) { auto = "?"; }
anotar("CAMPOS|autoOrient|" + auto);
// los nombres de los valores del enum, para no hardcodearlos del otro lado
anotar("ENUM|NO_AUTO_ORIENT|" + AutoOrientType.NO_AUTO_ORIENT +
       "|CAMERA_OR_POINT_OF_INTEREST|" + AutoOrientType.CAMERA_OR_POINT_OF_INTEREST);

// ---------------------------------------------------------------- el objeto 3D
// Un cuadrado macizo, para que la huella sea medible sin ambiguedad. La ESCALA APARENTE es la que
// delata el modelo: una proyeccion equivocada puede acertar el centro y errar el tamaño, y con solo
// el centroide eso pasaria por bueno.
var cubo = comp.layers.addSolid([1, 0.25, 0.15], "marca", LADO, LADO, 1);
cubo.threeDLayer = true;
var trM = cubo.property("ADBE Transform Group");
var posM = trM.property("ADBE Position");

// Un recorrido que toca las tres dimensiones y varias profundidades. La Z de AE crece HACIA ADENTRO
// de la pantalla: mas Z = mas lejos = mas chico. Se eligen valores que dejen el cuadrado entero
// dentro del encuadre, porque una huella que toca el borde no mide el objeto sino su parte visible.
var CAMINO = [
  [960, 540, 0],
  [660, 380, 600],
  [1320, 700, -300],
  [960, 540, 1400],
  [520, 820, 200]
];
var c;
for (c = 0; c < CAMINO.length; c++) {
  posM.setValueAtTime(c * (DUR / CAMINO.length), CAMINO[c]);
}
var k;
for (k = 1; k <= posM.numKeys; k++) {
  posM.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
}

// ---------------------------------------------------------------- renderizar y volcar por cuadro
var raiz = new Folder(DIR);
if (!raiz.exists) { raiz.create(); }
var viejos = raiz.getFiles("*.png");
var v;
for (v = 0; v < viejos.length; v++) { viejos[v].remove(); }

var total = Math.floor(DUR * FPS);
for (k = 0; k < total; k++) {
  var t = k * comp.frameDuration;
  comp.saveFrameToPng(t, new File(DIR + "/f" + tresDigitos(k) + ".png"));
  // LO QUE AE DICE, cuadro por cuadro: la posicion 3D del objeto y TODO el estado de la camara. Sin
  // esta columna, un error de proyeccion y un error de medicion son indistinguibles — es la misma
  // leccion de `valueAtTime` que ya evito un diagnostico falso en la prueba de curvas.
  var partes = ["CUADRO", k, t, lista(posM.valueAtTime(t, false))];
  partes[partes.length] = lista(trC.property("ADBE Position").valueAtTime(t, false));
  partes[partes.length] = lista(trC.property("ADBE Anchor Point").valueAtTime(t, false));
  var zoomV = "?";
  try { zoomV = opciones.property("ADBE Camera Zoom").valueAtTime(t, false); } catch (exZ) { zoomV = "?"; }
  partes[partes.length] = zoomV;
  var orV = "?";
  try { orV = lista(trC.property("ADBE Orientation").valueAtTime(t, false)); } catch (exO) { orV = "?"; }
  partes[partes.length] = orV;
  anotar(partes.join("|"));
}
anotar("PEDIDOS|" + total);

// ================================================================ SEGUNDA PARTE: capas ROTADAS
// Es lo que de verdad usa un panel en perspectiva, y cambia el instrumento: un rectangulo rotado no
// proyecta un rectangulo, asi que medir "el ancho de la huella" deja de tener sentido. Lo que si es
// exacto son el CENTROIDE del area proyectada y su AREA — y las dos se pueden predecir proyectando las
// cuatro esquinas y aplicando la formula del poligono.
//
// Y SE ROTA UN EJE POR VEZ, a proposito. AE aplica orientacion y despues las tres rotaciones, y el
// ORDEN en que las compone es justamente lo que no quiero adivinar. Con un solo eje activo el orden no
// influye, asi que primero se verifica la proyeccion; el orden se determina despues, con un caso que
// combine dos ejes. Un experimento a la vez.
var EJES = ["ADBE Rotate Y", "ADBE Rotate X", "ADBE Rotate Z"];
var NOMBRES = ["rotY", "rotX", "rotZ"];
var e;
for (e = 0; e < EJES.length; e++) {
  var sub = new Folder(DIR + "/" + NOMBRES[e]);
  if (!sub.exists) { sub.create(); }
  var vv = sub.getFiles("*.png");
  var w;
  for (w = 0; w < vv.length; w++) { vv[w].remove(); }

  // El objeto quieto en el centro, a una profundidad fija, girando sobre UN eje.
  // PRIMERO SE SACAN LAS CLAVES Y DESPUES SE FIJA EL VALOR: `setValue` sobre una propiedad animada
  // tira "No se puede llamar a setValue() en una propiedad con fotogramas clave". Es una linea de
  // orden, y sin la envoltura de try/catch habria salido como cartel modal en vez de como dato.
  while (posM.numKeys > 0) { posM.removeKey(1); }
  posM.setValue([ANCHO / 2, ALTO / 2, 300]);

  var rot = trM.property(EJES[e]);
  var j;
  for (j = 0; j < EJES.length; j++) { trM.property(EJES[j]).setValue(0); }

  var CUANTOS = 13;
  var g;
  for (g = 0; g < CUANTOS; g++) {
    // de -72 a +72 grados: mas alla el plano se ve casi de canto y la huella se vuelve una linea,
    // donde cualquier medicion de area es ruido
    var grados = -72 + g * (144 / (CUANTOS - 1));
    rot.setValue(grados);
    comp.saveFrameToPng(0, new File(DIR + "/" + NOMBRES[e] + "/f" + tresDigitos(g) + ".png"));
    anotar("GIRO|" + NOMBRES[e] + "|" + g + "|" + grados + "|" + lista(posM.value) +
           "|" + lista(trM.property("ADBE Anchor Point").value) +
           "|" + lista(trM.property("ADBE Scale").value));
  }
  rot.setValue(0);
  anotar("GIROS|" + NOMBRES[e] + "|" + CUANTOS);
}

// ================================================================ TERCERA PARTE: el ORDEN
// AE aplica la orientacion y despues las tres rotaciones, y el ORDEN en que las compone es lo que no
// quiero adivinar. Con tres angulos DISTINTOS entre si, cada uno de los seis ordenes posibles da una
// proyeccion diferente — asi que se rinde una vez y del otro lado se prueban los seis. El que cierre
// gana, y se informan los residuos de todos para que el ganador no sea una interpretacion.
//
// Y SE USA UN RECTANGULO ALARGADO, no un cuadrado: un cuadrado es simetrico bajo giros de 90 grados y
// eso le regala coincidencias a candidatos que estan mal.
var LARGO = 340, CORTO = 90;
var barra = comp.layers.addSolid([0.15, 0.55, 1], "barra3d", LARGO, CORTO, 1);
barra.threeDLayer = true;
var trB = barra.property("ADBE Transform Group");
trB.property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, 250]);
cubo.enabled = false;                       // que no contamine la huella

var COMBOS = [
  [40, 35, 25,   0,  0,  0],
  [-30, 50, -20, 0,  0,  0],
  [0,  0,  0,   35, -25, 40],               // solo ORIENTACION
  [25, -40, 15, 20, 30, -15]                // las dos cosas a la vez
];
var cb;
for (cb = 0; cb < COMBOS.length; cb++) {
  var C = COMBOS[cb];
  trB.property("ADBE Rotate X").setValue(C[0]);
  trB.property("ADBE Rotate Y").setValue(C[1]);
  trB.property("ADBE Rotate Z").setValue(C[2]);
  trB.property("ADBE Orientation").setValue([C[3], C[4], C[5]]);
  comp.saveFrameToPng(0, new File(DIR + "/orden" + cb + ".png"));
  anotar("ORDEN|" + cb + "|" + C.join(";") + "|" + lista(trB.property("ADBE Position").value) +
         "|" + LARGO + "|" + CORTO);
}
anotar("ORDENES|" + COMBOS.length);

// ================================================================ CUARTA PARTE: la CAMARA que se mueve
// Hasta aca se movio el OBJETO y la camara estuvo quieta y sobre el eje. Faltan las dos cosas que un
// panel en perspectiva usa de verdad: una camara DESCENTRADA (que mira a un punto de interes, o sea la
// matematica de look-at) y una camara ANIMADA.
trB.property("ADBE Rotate X").setValue(0);
trB.property("ADBE Rotate Y").setValue(0);
trB.property("ADBE Rotate Z").setValue(0);
trB.property("ADBE Orientation").setValue([0, 0, 0]);
barra.enabled = false;
cubo.enabled = true;
while (posM.numKeys > 0) { posM.removeKey(1); }
posM.setValue([ANCHO / 2, ALTO / 2, 0]);

var subC = new Folder(DIR + "/camara-movil");
if (!subC.exists) { subC.create(); }
var vc = subC.getFiles("*.png");
for (v = 0; v < vc.length; v++) { vc[v].remove(); }

var CAMINOS = [
  [600, 300, -2200], [1400, 300, -2600], [1500, 900, -1900],
  [400, 800, -3000], [960, 540, -2666.67], [200, 200, -1500]
];
var cm;
for (cm = 0; cm < CAMINOS.length; cm++) {
  trC.property("ADBE Position").setValue(CAMINOS[cm]);
  comp.saveFrameToPng(0, new File(DIR + "/camara-movil/f" + tresDigitos(cm) + ".png"));
  // SE VUELCA LA ORIENTACION QUE AE CALCULO. La camara es de dos nodos: su orientacion no sale de sus
  // claves, sale de mirar al punto de interes. Preguntarsela es la unica forma de saber que convencion
  // usa AE para el vector "arriba" — y adivinarla es como se construye una formula que anda en un caso.
  anotar("CAMMOV|" + cm + "|" + lista(trC.property("ADBE Position").value) +
         "|" + lista(trC.property("ADBE Anchor Point").value) +
         "|" + lista(trC.property("ADBE Orientation").value) +
         "|" + trC.property("ADBE Rotate X").value +
         "|" + trC.property("ADBE Rotate Y").value +
         "|" + trC.property("ADBE Rotate Z").value +
         "|" + lista(posM.value));
}
anotar("CAMMOVS|" + CAMINOS.length);

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
