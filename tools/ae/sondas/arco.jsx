// SONDA DEL ARCO QUE CRECE — el anillo de progreso, que era la ultima de las cuatro irreproducibles.
//
// QUE MONTA. Tres anillos con el mismo radio y el mismo grosor, y lo unico que cambia es cuanto los
// recorta el "recortar trazados" de AE: 25%, 60% y 100%. Mas un cuarto que CRECE de 0 a 100 con el
// tiempo, que es el caso de verdad.
//
// SE DECLARA CON UNA FORMA REAL DE AE —elipse + trazo + recortar trazados— y no con un comentario ni
// con un flipbook de PNG. Asi AE lo previsualiza exacto, el motor lo dibuja con un anillo y un descarte
// por angulo, y no se pierde resolucion a ninguna escala. Un flipbook de veinte PNG habria dado veinte
// escalones y veinte imagenes.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/arco.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/arco.jsx

var RUTA = "C:/ae-probe/arco.txt";

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

app.beginUndoGroup("SONDA-ARCO");

var NOMBRE = "SONDA-ARCO";
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

comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var fondoNegro = comp.layers.addSolid([0, 0, 0], "fondo-negro", ANCHO, ALTO, 1);

// EL ARBOL SE ARMA A MANO, con matchName. Es la unica forma de saber que estructura tiene despues, que
// es exactamente lo que el exportador va a buscar: una elipse, un trazo y un recorte.
function anillo(nombre, x, diametro, grosor, desde, hasta, animar) {
  var L = comp.layers.addShape();
  L.name = nombre;
  var raiz = L.property("ADBE Root Vectors Group");
  var grupo = raiz.addProperty("ADBE Vector Group");
  var conten = grupo.property("ADBE Vectors Group");

  var el = conten.addProperty("ADBE Vector Shape - Ellipse");
  el.property("ADBE Vector Ellipse Size").setValue([diametro, diametro]);

  var tz = conten.addProperty("ADBE Vector Graphic - Stroke");
  tz.property("ADBE Vector Stroke Color").setValue([0.36, 0.55, 1, 1]);
  tz.property("ADBE Vector Stroke Width").setValue(grosor);

  var rc = conten.addProperty("ADBE Vector Filter - Trim");
  rc.property("ADBE Vector Trim Start").setValue(desde);
  if (animar) {
    rc.property("ADBE Vector Trim End").setValueAtTime(0, 0);
    rc.property("ADBE Vector Trim End").setValueAtTime(CUADROS / FPS, 100);
  } else {
    rc.property("ADBE Vector Trim End").setValue(hasta);
  }
  tr(L).property("ADBE Position").setValue([x, 540]);
  return L;
}

anillo("arco-25", 300, 300, 26, 0, 25, false);
anillo("arco-60", 720, 300, 26, 0, 60, false);
anillo("arco-100", 1140, 300, 26, 0, 100, false);
anillo("arco-crece", 1600, 300, 26, 0, 0, true);

anotar("SONDA|" + NOMBRE + "|capas=" + comp.numLayers);
comp.time = 0;
app.endUndoGroup();
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
