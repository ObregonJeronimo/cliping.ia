// SONDA DE PROFUNDIDAD DE CAMPO — cuatro paneles a cuatro profundidades y un cambio de foco.
//
// QUE PRUEBA. Que el desenfoque por capa (1) existe, (2) respeta el plano de enfoque —lo que esta a la
// distancia de foco tiene que salir NITIDO mientras el resto se difumina— y (3) sigue al foco cuando el
// foco se anima, que es el "cambio de foco" y es una de las cuatro formas de entrada que midio el
// barrido de referencias.
//
// EL FOCO VIAJA de 900 a 3400: al principio esta enfocado el panel de adelante y al final el de atras.
// En el cuadro del medio tiene que estar nitido el del medio. Si el desenfoque fuera un valor fijo por
// capa, o si el foco no viajara, los tres cuadros saldrian iguales — por eso son tres y no uno.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/profundidad2.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/profundidad2.jsx

var RUTA = "C:/ae-probe/profundidad2.txt";
var RECURSOS = "C:/ae-probe/recursos-h";

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

app.beginUndoGroup("SONDA-PROF");

var NOMBRE = "SONDA-PROF";
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

var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
tr(cam).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -1600]);
var opc = cam.property("ADBE Camera Options Group");
opc.property("ADBE Camera Depth of Field").setValue(1);
opc.property("ADBE Camera Aperture").setValue(220);
// EL FOCO VIAJA: de lo mas cercano a lo mas lejano
opc.property("ADBE Camera Focus Distance").setValueAtTime(0, 900);
opc.property("ADBE Camera Focus Distance").setValueAtTime(CUADROS / FPS, 3400);

var fondoNegro = comp.layers.addSolid([0, 0, 0], "fondo-negro", 9000, 5200, 1);
fondoNegro.threeDLayer = true;
tr(fondoNegro).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, 4200]);

var cache = {};
function recurso(archivo) {
  if (cache[archivo]) { return cache[archivo]; }
  var f = new File(RECURSOS + "/" + archivo + ".png");
  if (!f.exists) { throw new Error("falta el recurso " + archivo); }
  cache[archivo] = app.project.importFile(new ImportOptions(f));
  return cache[archivo];
}
// cuatro paneles escalonados en Z, con el MISMO tamano en pantalla para que la unica diferencia
// visible sea la nitidez y no el tamano
var ZETAS = [700, 1500, 2400, 3400];
var i;
for (i = 0; i < ZETAS.length; i++) {
  var z = ZETAS[i];
  var c = comp.layers.add(recurso("panel-doc"));
  c.name = "panel-z" + z;
  c.threeDLayer = true;
  var esc = 26 * (1600 + z) / 1600;
  tr(c).property("ADBE Position").setValue([340 + i * 420, ALTO / 2, z]);
  tr(c).property("ADBE Scale").setValue([esc, esc, esc]);
}

anotar("SONDA|" + NOMBRE + "|capas=" + comp.numLayers);
anotar("CAMARA|apertura=" + opc.property("ADBE Camera Aperture").value +
       "|profundidad=" + opc.property("ADBE Camera Depth of Field").value +
       "|zetas=" + ZETAS.join(","));
comp.time = 0;
app.endUndoGroup();
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
