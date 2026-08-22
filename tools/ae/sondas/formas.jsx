// PRUEBA DE FORMAS RASTERIZADAS: lo que no se puede hacer con solidos.
//
// Un solido es un rectangulo de esquinas vivas y color plano. Todo lo que una interfaz necesita para
// parecer una interfaz —esquinas redondeadas, elipses, contornos— es una capa de forma, y portar el
// arbol de formas de AE (trazados, rellenos, trazos, grupos anidados, repetidores) es el build mas
// grande de todo el exportador.
//
// LA SALIDA: casi ninguna forma necesita ser EDITABLE en la web. Lo editable de una plantilla es el
// texto, los colores y las imagenes; una esquina redondeada es decoracion. Asi que se RASTERIZA —se
// renderiza la forma sola a un PNG y se trata como una imagen— y se pierde la editabilidad del trazado
// a cambio del aspecto EXACTO. Es el intercambio correcto: el aspecto no se puede aproximar, y a nadie
// le hace falta editar los vertices de un rectangulo redondeado desde un navegador.
//
// Los matchName de las formas ("ADBE Vector Shape - Rect") NO estan traducidos, a diferencia de los
// nombres de menu y de los parametros de efecto. Son identificadores internos y por eso se pueden usar.

var RUTA = "C:/ae-probe/formas.txt";

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

app.beginUndoGroup("prueba de formas");

var NOMBRE = "FORMAS-PRUEBA";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 3;
var FONDO   = [0.043, 0.043, 0.055];
var PANEL   = [0.114, 0.125, 0.161];
var ACENTO  = [0.949, 0.251, 0.149];
var CIAN    = [0.149, 0.741, 0.949];
var HUESO   = [0.949, 0.945, 0.925];

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}

var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
comp.bgColor = FONDO;
comp.resolutionFactor = [1, 1];
comp.motionBlur = false;
comp.openInViewer();

// ---------------------------------------------------------------- constructores de forma
function grupoDe(capa) {
  var raiz = capa.property("ADBE Root Vectors Group");
  var g = raiz.addProperty("ADBE Vector Group");
  return g.property("ADBE Vectors Group");
}

function panelRedondeado(nombre, ancho, alto, radio, color, x, y, z, rotY) {
  var capa = comp.layers.addShape();
  capa.name = nombre;
  var v = grupoDe(capa);
  var rect = v.addProperty("ADBE Vector Shape - Rect");
  rect.property("ADBE Vector Rect Size").setValue([ancho, alto]);
  rect.property("ADBE Vector Rect Roundness").setValue(radio);
  var relleno = v.addProperty("ADBE Vector Graphic - Fill");
  relleno.property("ADBE Vector Fill Color").setValue(color);
  capa.threeDLayer = true;
  var tr = capa.property("ADBE Transform Group");
  tr.property("ADBE Position").setValue([x, y, z]);
  if (rotY) { tr.property("ADBE Rotate Y").setValue(rotY); }
  return capa;
}

function anilloContorneado(nombre, diametro, grosor, color, x, y, z) {
  var capa = comp.layers.addShape();
  capa.name = nombre;
  var v = grupoDe(capa);
  var elipse = v.addProperty("ADBE Vector Shape - Ellipse");
  elipse.property("ADBE Vector Ellipse Size").setValue([diametro, diametro]);
  var trazo = v.addProperty("ADBE Vector Graphic - Stroke");
  trazo.property("ADBE Vector Stroke Color").setValue(color);
  trazo.property("ADBE Vector Stroke Width").setValue(grosor);
  capa.threeDLayer = true;
  capa.property("ADBE Transform Group").property("ADBE Position").setValue([x, y, z]);
  return capa;
}

// ---------------------------------------------------------------- la escena
var anillo = anilloContorneado("anillo", 260, 14, CIAN, 1520, 340, 520);
var panelB = panelRedondeado("panel-b", 560, 360, 34, PANEL, 1380, 640, 300, -26);
var panelA = panelRedondeado("panel-a", 640, 400, 40, PANEL, 560, 560, 120, 18);

// una pastilla de acento con esquinas MUY redondeadas: imposible con un solido
var pastilla = panelRedondeado("pastilla", 300, 84, 42, ACENTO, 560, 300, 60, 18);
pastilla.comment = "brillo 1.4 0.7 0.16";
anotar("DECLARA|pastilla|" + pastilla.comment);

var titulo = comp.layers.addText("FORMAS");
titulo.name = "titulo";
var pt = titulo.property("ADBE Text Properties").property("ADBE Text Document");
var d = pt.value;
d.fontSize = 96;
d.fillColor = HUESO;
d.applyFill = true;
d.justification = ParagraphJustification.CENTER_JUSTIFY;
try { d.font = "Arial-Black"; } catch (exF) {}
pt.setValue(d);
titulo.threeDLayer = true;
titulo.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO / 2, 960, 0]);

// la camara, con un travelling suave
var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var ZOOM = 2666.6666666;
try { ZOOM = camara.property("ADBE Camera Options Group").property("ADBE Camera Zoom").value; } catch (exZ) {}
camara.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([ANCHO / 2, ALTO / 2, 0]);
var pc = camara.property("ADBE Transform Group").property("ADBE Position");
pc.setValueAtTime(0, [ANCHO / 2 - 300, ALTO / 2 - 60, -ZOOM * 0.86]);
pc.setValueAtTime(DUR, [ANCHO / 2 + 260, ALTO / 2 + 70, -ZOOM * 1.02]);
var k;
for (k = 1; k <= pc.numKeys; k++) {
  pc.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
  pc.setTemporalEaseAtKey(k, [new KeyframeEase(0, 60)], [new KeyframeEase(0, 60)]);
}

anotar("CAPAS|" + comp.numLayers);
app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
