// B0 — LOS DOS DEFECTOS MUDOS: las rotaciones de camara y el orden por profundidad.
//
// Se llaman mudos porque ninguno da error, ninguno da aviso y los dos dan una imagen. Salen bien
// formados, plausibles, y distintos de lo que AE pinta. Son la peor clase de defecto que puede tener
// un portador de animaciones: el que se descubre mirando el video terminado, o peor, el que no se
// descubre.
//
//   1. LAS ROTACIONES DE CAMARA. Una capa de camara no tiene `threeDLayer` —vive en el espacio 3D por
//      definicion, asi que AE ni le pone la propiedad—, y el exportador decidia si volcar orientacion
//      y rotaciones preguntando justamente por eso. Resultado: toda camara se exportaba con las
//      rotaciones en cero. Un balanceo (inclinar el horizonte, el "dutch") salia perfectamente
//      horizontal.
//
//   2. EL ORDEN POR PROFUNDIDAD. El reproductor dibuja con la prueba de profundidad apagada, asi que
//      el orden de dibujo ES el orden de oclusion, y ese orden salia del apilado. AE ordena sus capas
//      3D por distancia a la camara. Coinciden solo mientras uno los haga coincidir.
//
// LAS DOS HIPOTESIS QUE ESTA SONDA VA A DECIDIR, y que NO se dan por buenas:
//
//   H1  En una camara de dos nodos, las rotaciones se componen ENCIMA del apuntado calculado.
//       La alternativa es que lo reemplacen (y entonces el punto de interes deja de mandar).
//   H2  AE compone las capas 3D de atras hacia adelante por distancia a la camara, y el apilado solo
//       desempata.
//
// Cada una se prueba en su propia composicion, con un caso construido para que las dos respuestas
// posibles den imagenes MUY distintas. Un experimento a la vez.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/b0.jsx --salida C:/ae-probe/b0.txt
//   node tools/ae/pieza.mjs B0-ROT-DOS   --comparar
//   node tools/ae/pieza.mjs B0-ROT-UNO   --comparar
//   node tools/ae/pieza.mjs B0-PROF      --comparar

var RUTA = "C:/ae-probe/b0.txt";

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

function borrarComp(nombre) {
  var n = app.project.numItems;
  while (n > 0) {
    var it = app.project.item(n);
    if (it instanceof CompItem && it.name === nombre) { it.remove(); }
    n = n - 1;
  }
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 20 / 30;

try {

app.beginUndoGroup("B0");

// ============================================================ marcas de referencia
// Cinco parches planos repartidos por el encuadre y a profundidades distintas. Planos y sin rotacion
// propia: la UNICA variable de la escena es la camara. Si su orientacion se reproduce mal, las cinco
// se corren juntas y el residuo salta; con una sola marca, un giro y una traslacion pueden confundirse.
var MARCAS = [
  [520, 300, 0, 0.94, 0.31, 0.16],
  [1400, 300, 420, 0.16, 0.68, 0.95],
  [960, 620, -260, 0.98, 0.82, 0.24],
  [420, 860, 300, 0.35, 0.88, 0.45],
  [1500, 880, -120, 0.80, 0.42, 0.95]
];

function poblarMarcas(comp, lado) {
  var m;
  for (m = MARCAS.length - 1; m >= 0; m--) {
    var M = MARCAS[m];
    var s = comp.layers.addSolid([M[3], M[4], M[5]], "marca" + m, lado, lado, 1);
    s.threeDLayer = true;
    s.property("ADBE Transform Group").property("ADBE Position").setValue([M[0], M[1], M[2]]);
  }
}

// ============================================================ 1. camara de DOS nodos con rotaciones
// El caso decisivo. La camara mira a un punto de interes DESCENTRADO —para que el apuntado calculado
// no sea la identidad y se note si se pierde— y ademas gira sobre los tres ejes, con angulos distintos
// entre si para que ningun orden de composicion se salve por simetria.
//
// Si las rotaciones se componen ENCIMA (H1), la escena queda apuntada al punto de interes y ademas
// inclinada. Si lo REEMPLAZAN, la camara mira a cualquier lado y la mitad del encuadre queda vacia.
// Las dos respuestas dan imagenes que no se parecen en nada, que es exactamente lo que se busca.
borrarComp("B0-ROT-DOS");
var c1 = app.project.items.addComp("B0-ROT-DOS", ANCHO, ALTO, 1, DUR, FPS);
c1.resolutionFactor = [1, 1];
c1.motionBlur = false;
c1.bgColor = [0.05, 0.05, 0.07];
// EL FONDO DE LA COMPOSICION NO EXISTE HASTA LA CODIFICACION: el reproductor entrega transparencia.
// Sin un solido real abajo de todo, la comparacion de pixeles mide dos fondos distintos y culpa a la
// camara. Es la LEY 4 del reproductor, y ya costo una investigacion.
var f1 = c1.layers.addSolid([0.05, 0.05, 0.07], "fondo", ANCHO, ALTO, 1);
poblarMarcas(c1, 180);
f1.moveToEnd();

var cam1 = c1.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var tr1 = cam1.property("ADBE Transform Group");
var op1 = cam1.property("ADBE Camera Options Group");
var ZOOM = op1.property("ADBE Camera Zoom").value;
tr1.property("ADBE Position").setValue([1180, 340, -ZOOM * 0.72]);
tr1.property("ADBE Anchor Point").setValue([760, 700, 120]);
// el balanceo ANIMADO: si no viaja, la reproduccion sale horizontal y quieta
var rz1 = tr1.property("ADBE Rotate Z");
rz1.setValueAtTime(0, -14);
rz1.setValueAtTime(DUR, 22);
tr1.property("ADBE Rotate X").setValue(6);
tr1.property("ADBE Rotate Y").setValue(-9);
tr1.property("ADBE Orientation").setValue([0, 0, 0]);
anotar("CASO|B0-ROT-DOS|dosNodos|" + cam1.autoOrient +
       "|pos=" + lista(tr1.property("ADBE Position").value) +
       "|poi=" + lista(tr1.property("ADBE Anchor Point").value) +
       "|rx=" + tr1.property("ADBE Rotate X").value +
       "|ry=" + tr1.property("ADBE Rotate Y").value +
       "|rz=-14..22|zoom=" + ZOOM);

// ============================================================ 2. camara de UN nodo con rotaciones
// La misma escena con la auto-orientacion apagada. Aca las rotaciones son lo UNICO que orienta la
// camara, asi que si el reproductor las ignora la toma apunta al eje Z y no se parece a nada.
// Sirve ademas de control cruzado: si el caso 1 cierra y este no, el defecto esta en la composicion
// con el apuntado, no en la lectura de las rotaciones.
borrarComp("B0-ROT-UNO");
var c2 = app.project.items.addComp("B0-ROT-UNO", ANCHO, ALTO, 1, DUR, FPS);
c2.resolutionFactor = [1, 1];
c2.motionBlur = false;
c2.bgColor = [0.05, 0.05, 0.07];
var f2 = c2.layers.addSolid([0.05, 0.05, 0.07], "fondo", ANCHO, ALTO, 1);
poblarMarcas(c2, 180);
f2.moveToEnd();

var cam2 = c2.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
cam2.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
var tr2 = cam2.property("ADBE Transform Group");
tr2.property("ADBE Position").setValue([980, 520, -ZOOM * 0.80]);
var rx2 = tr2.property("ADBE Rotate X");
rx2.setValueAtTime(0, -7);
rx2.setValueAtTime(DUR, 5);
tr2.property("ADBE Rotate Y").setValue(11);
tr2.property("ADBE Rotate Z").setValue(-16);
tr2.property("ADBE Orientation").setValue([0, 0, 0]);
anotar("CASO|B0-ROT-UNO|unNodo|" + cam2.autoOrient +
       "|pos=" + lista(tr2.property("ADBE Position").value) +
       "|rx=-7..5|ry=11|rz=-16");

// ============================================================ 3. el orden por profundidad
// Dos parches que se pisan en pantalla, con el apilado EN CONTRA de la profundidad: el que esta mas
// abajo en la lista —el que el apilado manda dibujar primero, o sea debajo— es el que esta MAS CERCA
// de la camara. Las dos respuestas posibles se distinguen de un vistazo y en un solo numero, porque
// los colores son distintos: gana el naranja (cerca) o gana el azul (lejos).
//
// SE AGREGA UNA TERCERA CAPA que no toca a ninguna de las dos, como control: si el reproductor
// rompiera el orden en general y no solo en este cruce, esta tambien cambiaria y el diagnostico
// "es la profundidad" seria falso.
borrarComp("B0-PROF");
var c3 = app.project.items.addComp("B0-PROF", ANCHO, ALTO, 1, DUR, FPS);
c3.resolutionFactor = [1, 1];
c3.motionBlur = false;
c3.bgColor = [0.05, 0.05, 0.07];

// se crean de arriba hacia abajo en la lista: addSolid inserta en el indice 1
var lejos = c3.layers.addSolid([0.16, 0.55, 0.95], "LEJOS-arriba-en-la-lista", 620, 620, 1);
lejos.threeDLayer = true;
lejos.property("ADBE Transform Group").property("ADBE Position").setValue([1080, 540, 900]);

var cerca = c3.layers.addSolid([0.96, 0.36, 0.12], "CERCA-abajo-en-la-lista", 620, 620, 1);
cerca.threeDLayer = true;
cerca.property("ADBE Transform Group").property("ADBE Position").setValue([840, 540, 120]);
// queda en el indice 1; hay que empujarlo debajo del azul para que el apilado contradiga la Z
cerca.moveAfter(lejos);

var control = c3.layers.addSolid([0.30, 0.85, 0.45], "control-sin-cruce", 260, 260, 1);
control.threeDLayer = true;
control.property("ADBE Transform Group").property("ADBE Position").setValue([320, 260, 400]);

var f3 = c3.layers.addSolid([0.05, 0.05, 0.07], "fondo", ANCHO, ALTO, 1);
f3.moveToEnd();

var cam3 = c3.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var tr3 = cam3.property("ADBE Transform Group");
tr3.property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -ZOOM]);
tr3.property("ADBE Anchor Point").setValue([ANCHO / 2, ALTO / 2, 0]);

anotar("CASO|B0-PROF|indices|lejos=" + lejos.index + " z=900|cerca=" + cerca.index +
       " z=120|control=" + control.index + " z=400");
// LO QUE AE PINTA EN EL CRUCE, medido por AE mismo y no interpretado del otro lado: el color del pixel
// donde los dos parches se pisan. Es la respuesta a H2 en un solo dato, antes de que intervenga
// ninguna herramienta nuestra.
anotar("NOTA_CRUCE|el pixel (1000,540) cae dentro de los dos parches: naranja=cerca gana, azul=lejos gana");

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
