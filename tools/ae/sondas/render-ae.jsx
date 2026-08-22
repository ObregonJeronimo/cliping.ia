// ¿PUEDE AE ESCRIBIR UN CUADRO A DISCO POR SCRIPT?
//
// POR QUE ESTA PREGUNTA VALE MAS QUE LA SONDA QUE LA MOTIVA. Todo este proyecto verifica el motor
// contra NUMEROS que AE expone —`valueAtTime`, `sourceRectAtTime`— porque AE no renderiza. Eso alcanzo
// hasta hoy: las curvas, la camara, la tipografia y los animadores de texto se pudieron comparar
// contra una medicion.
//
// Con las MASCARAS se acaba. Recien se midio que `sourceRectAtTime` NO refleja las mascaras: la caja
// de un solido de 400x300 sigue siendo 400x300 con la mascara puesta, invertida, con calado, con
// expansion, con opacidad y con varias mascaras en todos los modos. O sea que no hay ningun numero que
// dependa de la mascara, y sin numero no hay compuerta.
//
// Si `saveFrameToPng` existe, aparece un canal nuevo: AE escribe UN cuadro, el motor escribe el mismo
// cuadro, y se comparan pixeles. No cambia la arquitectura —AE sigue sin renderizar el video— pero da
// una verdad de referencia para cualquier funcion, no solo para las mascaras.
//
// SE PRUEBAN LAS DOS VIAS y se dice cual anda:
//   1. `comp.saveFrameToPng(tiempo, archivo)`  — directo, si existe
//   2. la cola de render con una plantilla de PNG — mas vueltas, y bloquea la sesion mientras corre
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/render-ae.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/render-ae.jsx

var RUTA = "C:/ae-probe/render-ae.txt";
var SALIDA = "C:/ae-probe/ae-cuadro.png";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (e) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("RENDER-AE");
var NOMBRE = "SONDA-RENDER-AE";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, 640, 360, 1, 1, 30);
comp.bgColor = [0, 0, 0];

// una figura simple y una mascara triangular: si el cuadro sale, se ve de una si la mascara se aplico
var s = comp.layers.addSolid([0.36, 0.55, 1], "bloque", 400, 300, 1);
s.property("ADBE Transform Group").property("ADBE Position").setValue([320, 180]);
var m = s.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
var sh = new Shape();
sh.vertices = [[50, 40], [340, 40], [200, 250]];
sh.inTangents = [[0, 0], [0, 0], [0, 0]];
sh.outTangents = [[0, 0], [0, 0], [0, 0]];
sh.closed = true;
m.property("ADBE Mask Shape").setValue(sh);

// ---------------------------------------------------------------- via 1: saveFrameToPng
anotar("TIPO|saveFrameToPng=" + texto(typeof comp.saveFrameToPng));
var previoPng = new File(SALIDA);
if (previoPng.exists) { previoPng.remove(); }
var r1 = "no intentado";
if (typeof comp.saveFrameToPng === "function") {
  try {
    comp.saveFrameToPng(0, new File(SALIDA));
    var f = new File(SALIDA);
    r1 = f.exists ? ("OK, " + f.length + " bytes") : "la llamada no tiro pero el archivo no existe";
  } catch (ex1) {
    r1 = "FALLO: " + texto(ex1.message ? ex1.message : ex1);
  }
}
anotar("VIA1|" + r1);

// ---------------------------------------------------------------- que mas ofrece la composicion
var metodos = ["saveFrameToPng", "openInViewer", "ramPreviewTest", "exportAsMotionGraphicsTemplate"];
var k, cuales = "";
for (k = 0; k < metodos.length; k++) {
  cuales = cuales + metodos[k] + "=" + texto(typeof comp[metodos[k]]) + ";";
}
anotar("METODOS|" + cuales);

// ---------------------------------------------------------------- via 2: la cola de render
// Se MIRA si se puede armar, y NO se lanza: `render()` bloquea la aplicacion y este canal tiene que
// costar milisegundos para servir de compuerta. Lo que interesa es si el camino existe.
var r2 = "";
try {
  var rq = app.project.renderQueue;
  var item = rq.items.add(comp);
  var om = item.outputModule(1);
  var plantillas = "";
  var pl = om.templates;
  for (k = 0; k < pl.length && k < 30; k++) { plantillas = plantillas + pl[k] + ";"; }
  r2 = "cola OK, " + rq.numItems + " item(s) · plantillas de salida: " + plantillas;
  item.remove();
} catch (ex2) {
  r2 = "FALLO: " + texto(ex2.message ? ex2.message : ex2);
}
anotar("VIA2|" + r2);

anotar("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
