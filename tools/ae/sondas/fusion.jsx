// SONDA DE FUSION E INTERLETRA — comprueba de punta a punta las dos correcciones del motor.
//
// POR QUE UNA SONDA Y NO LA PIEZA. Las dos correcciones cruzan tres archivos (exportar.jsx ->
// comp.mjs -> comp3d.html) y hasta ahora estan probadas de a pedazos: se que el documento ahora lleva
// el campo, no se que AE emita el codigo correcto ni que el reproductor lo dibuje distinto. Construir
// una pieza de sesenta segundos encima de eso seria mezclar "el arreglo no anda" con "la pieza esta mal
// autorada", y despues no se sabe cual de las dos se esta mirando.
//
// QUE MONTA
//   1. un fondo negro solido
//   2. dos discos IGUALES, uno en modo Normal y otro en modo Anadir, encimados sobre una franja clara:
//      si la fusion viaja, el segundo se ve mas claro donde se solapan y el primero no
//   3. dos textos IGUALES, uno sin interletra y otro con 200/1000 de em: si la medicion del lienzo
//      quedo bien, el segundo se lee entero; si no, le faltan las ultimas letras
//
// COMO SE LEE EL RESULTADO
//   node tools/ae/comp.mjs            -> "LO QUE NO VIAJA" tiene que estar vacio (antes salia NOSOP)
//   y en el documento, la capa `disco-suma` tiene que traer fusion: "suma"
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/fusion.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/fusion.jsx

var RUTA = "C:/ae-probe/fusion.txt";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA);
  a.encoding = "UTF-8";
  a.open("a");
  a.write(t + String.fromCharCode(10));
  a.close();
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("SONDA-FUSION");

var NOMBRE = "SONDA-FUSION";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 60;

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, CUADROS / FPS, FPS);
comp.bgColor = [0, 0, 0];
comp.openInViewer();

function tr(c) { return c.property("ADBE Transform Group"); }

// UNA CAMARA, aunque nada la use: es lo que hace que el documento se reproduzca en comp3d.html en vez
// de comp.html. Sin ella la sonda verificaba el reproductor EQUIVOCADO — el arreglo de fusion vive en
// el 3D, que es el que usan todas las piezas de verdad, y la sonda habria dado verde sin probar nada.
comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);

// el fondo, que es lo que hace visible la diferencia entre sumar y no sumar
var fondo = comp.layers.addSolid([0, 0, 0], "fondo-negro", ANCHO, ALTO, 1);
var franja = comp.layers.addSolid([0.22, 0.24, 0.30], "franja", ANCHO, 260, 1);
tr(franja).property("ADBE Position").setValue([ANCHO / 2, 540]);

// DOS DISCOS IGUALES, uno normal y otro sumando. Mismo color, mismo tamano, misma posicion relativa:
// lo unico distinto es el modo de fusion, asi que cualquier diferencia en el render ES la fusion.
function disco(nombre, x, modo) {
  var s = comp.layers.addSolid([0.30, 0.45, 0.85], nombre, 420, 420, 1);
  tr(s).property("ADBE Position").setValue([x, 540]);
  if (modo !== null) { s.blendingMode = modo; }
  return s;
}
var discoNormal = disco("disco-normal", 620, null);
var discoSuma = disco("disco-suma", 1300, BlendingMode.ADD);

// DOS TEXTOS IGUALES, uno sin interletra y otro con 200 milesimas de em. El de abajo es el que
// delataba el defecto: el lienzo se dimensionaba sin el tracking y las ultimas letras se cortaban.
function rotulo(cadena, y, track) {
  var t = comp.layers.addText(cadena);
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = 86;
  d.fillColor = [0.95, 0.96, 0.98];
  d.applyFill = true;
  d.justification = ParagraphJustification.CENTER_JUSTIFY;
  try { d.font = "CenturyGothic"; } catch (exF) {}
  d.tracking = track;
  p.setValue(d);
  tr(t).property("ADBE Position").setValue([ANCHO / 2, y]);
  return t;
}
var textoSinTrack = rotulo("INTERLETRA CERO", 260, 0);
var textoConTrack = rotulo("INTERLETRA DOSCIENTOS", 860, 200);

anotar("SONDA|" + NOMBRE + "|capas=" + comp.numLayers);
anotar("FUSION|disco-normal=" + discoNormal.blendingMode + "|disco-suma=" + discoSuma.blendingMode +
       "|NORMAL=" + BlendingMode.NORMAL + "|ADD=" + BlendingMode.ADD);
var cajaSin = textoSinTrack.sourceRectAtTime(0, false);
var cajaCon = textoConTrack.sourceRectAtTime(0, false);
anotar("CAJAS|sinTrack=" + cajaSin.width.toFixed(1) + "x" + cajaSin.height.toFixed(1) +
       "|conTrack=" + cajaCon.width.toFixed(1) + "x" + cajaCon.height.toFixed(1));

comp.time = 0;
app.endUndoGroup();
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
