// UNA COMPOSICION CON VARIEDAD, para probar el exportador contra algo que no sea un rectangulo rojo.
//
// Todo lo medido hasta ahora movia UN solido con UNA propiedad. Un exportador que solo se prueba
// contra eso no esta probado: esta esperando a que aparezca la primera composicion de verdad para
// romperse. Esta arma, en una sola comp:
//
//   · una capa de TEXTO con posicion, escala y opacidad animadas
//   · un SOLIDO con rotacion y punto de anclaje animados (dos propiedades que ninguna prueba toco)
//   · una capa EMPARENTADA a otra, que es como se construye cualquier movimiento compuesto
//   · un segundo texto con otro tamaño y otro color
//   · Y A PROPOSITO, UN EFECTO Y UNA CAPA DE FORMA que el exportador NO puede exportar.
//
// Ese ultimo punto es el que hace que esto sea una prueba y no una demostracion. El inventario de "lo
// que no viaja" es la pieza central del diseño; si la composicion de prueba no tuviera nada
// inexportable, el inventario saldria vacio y yo escribiria "funciona" sin haberlo ejercitado ni una
// vez. Es la misma leccion que el control negativo de la Prueba 3: un caso que pasa no es un caso que
// prueba.

var RUTA = "C:/ae-probe/escena-prueba.txt";

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

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("escena de prueba");

var NOMBRE = "ESCENA-PRUEBA";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 3;

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}

var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
comp.resolutionFactor = [1, 1];
comp.openInViewer();
anotar("comp " + comp.name + " " + ANCHO + "x" + ALTO + " " + FPS + "fps " + DUR + "s");

var suave = new KeyframeEase(0, 33.333333);
function bezierYSuave(prop, terna) {
  var k;
  for (k = 1; k <= prop.numKeys; k++) {
    prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
  }
  for (k = 1; k <= prop.numKeys; k++) {
    prop.setTemporalEaseAtKey(k, terna, terna);
  }
}

// ---------------------------------------------------------------- 1. titulo con tres propiedades
var titulo = comp.layers.addText("MOTION");
titulo.name = "titulo";
var pt = titulo.property("ADBE Text Properties").property("ADBE Text Document");
var td = pt.value;
td.fontSize = 180;
td.fillColor = [1, 1, 1];
td.applyFill = true;
td.justification = ParagraphJustification.CENTER_JUSTIFY;
pt.setValue(td);

var trT = titulo.property("ADBE Transform Group");
var posT = trT.property("ADBE Position");
posT.setValueAtTime(0, [960, 700]);
posT.setValueAtTime(0.8, [960, 430]);
bezierYSuave(posT, [suave]);

var escT = trT.property("ADBE Scale");
escT.setValueAtTime(0, [70, 70, 100]);
escT.setValueAtTime(0.8, [100, 100, 100]);
bezierYSuave(escT, [suave, suave, suave]);

var opT = trT.property("ADBE Opacity");
opT.setValueAtTime(0, 0);
opT.setValueAtTime(0.5, 100);
bezierYSuave(opT, [suave]);
anotar("titulo listo (posicion, escala, opacidad)");

// ---------------------------------------------------------------- 2. solido con rotacion y anclaje
// Rotacion y punto de anclaje son las dos propiedades de transformacion que NINGUNA prueba anterior
// toco, y el anclaje es especialmente traicionero porque mueve el centro de giro: si el exportador lo
// pierde, la capa gira alrededor del lugar equivocado y el resultado sale "parecido".
var barra = comp.layers.addSolid([0.95, 0.25, 0.15], "barra", 520, 26, 1);
var trB = barra.property("ADBE Transform Group");
trB.property("ADBE Position").setValue([960, 560]);

var ancB = trB.property("ADBE Anchor Point");
ancB.setValueAtTime(0, [0, 13, 0]);          // gira desde el extremo izquierdo
ancB.setValueAtTime(1.2, [260, 13, 0]);      // y termina girando desde el centro
bezierYSuave(ancB, [suave]);

var rotB = trB.property("ADBE Rotate Z");
rotB.setValueAtTime(0, -8);
rotB.setValueAtTime(1.2, 0);
bezierYSuave(rotB, [suave]);
anotar("barra lista (anclaje, rotacion)");

// ---------------------------------------------------------------- 3. capa EMPARENTADA
// El emparentado es como se construye cualquier movimiento compuesto: el hijo hereda la
// transformacion del padre. Un exportador que lo ignore produce capas que se mueven solas.
var punto = comp.layers.addNull();
punto.name = "guia";
var trP = punto.property("ADBE Transform Group");
var posP = trP.property("ADBE Position");
posP.setValueAtTime(0, [400, 860]);
posP.setValueAtTime(1.5, [1520, 860]);
bezierYSuave(posP, [suave]);

var pastilla = comp.layers.addSolid([1, 1, 1], "pastilla", 120, 120, 1);
pastilla.parent = punto;
pastilla.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0]);
anotar("guia + pastilla emparentada");

// ---------------------------------------------------------------- 4. segundo texto, otro tamaño
var bajada = comp.layers.addText("hecho en After Effects");
bajada.name = "bajada";
var pb = bajada.property("ADBE Text Properties").property("ADBE Text Document");
var tdb = pb.value;
tdb.fontSize = 54;
tdb.fillColor = [0.72, 0.74, 0.80];
tdb.applyFill = true;
tdb.tracking = 40;
pb.setValue(tdb);
bajada.property("ADBE Transform Group").property("ADBE Position").setValue([960, 640]);
anotar("bajada lista");

// ---------------------------------------------------------------- 5. LO QUE NO TIENE QUE VIAJAR
// Sin esto el inventario saldria vacio y yo diria "funciona" sin haberlo ejercitado.
var conEfecto = comp.layers.addSolid([0.2, 0.4, 0.9], "con efecto", 300, 300, 1);
conEfecto.property("ADBE Transform Group").property("ADBE Position").setValue([300, 200]);
var puestos = 0;
var CANDIDATOS = ["ADBE Gaussian Blur 2", "ADBE Gaussian Blur", "ADBE Fast Blur"];
var c;
for (c = 0; c < CANDIDATOS.length; c++) {
  try {
    conEfecto.property("ADBE Effect Parade").addProperty(CANDIDATOS[c]);
    anotar("efecto puesto: " + CANDIDATOS[c]);
    puestos = puestos + 1;
    break;
  } catch (exEf) { /* ese nombre no existe en esta version, se prueba el siguiente */ }
}
if (puestos === 0) { anotar("AVISO: no se pudo poner ningun efecto, el inventario queda sin probar por ese lado"); }

var forma = comp.layers.addShape();
forma.name = "forma sin exportar";
anotar("capa de forma agregada");

// una expresion, que es la otra familia que no viaja: no es un dato, es un programa
try {
  comp.layer("bajada").property("ADBE Transform Group").property("ADBE Opacity")
    .expression = "wiggle(2, 10)";
  anotar("expresion puesta en la opacidad de la bajada");
} catch (exEx) { anotar("no se pudo poner la expresion: " + texto(exEx)); }

anotar("capas totales: " + comp.numLayers);

// ---------------------------------------------------------------- 6. la version LIMPIA
// Hacen falta las dos, y por razones opuestas:
//
//   ESCENA-PRUEBA  tiene lo inexportable a proposito, para probar EL INVENTARIO. Si no lo tuviera, el
//                  inventario saldria vacio y yo diria "funciona" sin haberlo ejercitado.
//   ESCENA-LIMPIA  no lo tiene, para poder comparar PIXELES contra el reproductor. Comparando la
//                  sucia, el resultado fallaria por cosas que ya se que no viajan, y ese fallo taparia
//                  cualquier defecto de verdad — que es justo lo que hay que poder ver.
//
// Se hace DUPLICANDO y sacando, no construyendo de nuevo: asi las dos son identicas salvo en lo que se
// quito, y una diferencia entre ellas no puede venir de que las escribi dos veces distinto.
var limpia = comp.duplicate();
limpia.name = "ESCENA-LIMPIA";
var FUERA = ["forma sin exportar", "con efecto"];
var z = limpia.numLayers;
while (z > 0) {
  var cap = limpia.layer(z);
  var f;
  for (f = 0; f < FUERA.length; f++) {
    if (cap.name === FUERA[f]) { cap.remove(); break; }
  }
  z = z - 1;
}
try {
  var opBajada = limpia.layer("bajada").property("ADBE Transform Group").property("ADBE Opacity");
  opBajada.expression = "";
  anotar("expresion quitada de la copia limpia");
} catch (exQ) { anotar("no se pudo quitar la expresion: " + texto(exQ)); }
anotar("ESCENA-LIMPIA con " + limpia.numLayers + " capas");

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
