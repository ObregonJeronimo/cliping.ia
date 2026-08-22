// LA GESTION DE COLOR DEL PROYECTO, que una pieza HEREDA sin enterarse.
//
// Una comp creada por script no vive en el vacio: vive adentro del proyecto que este abierto, y hereda
// su espacio de trabajo, su profundidad de bits y su mezcla lineal. Si ese proyecto tiene un espacio de
// trabajo puesto —cosa comun en proyectos ajenos— cada PNG importado se CONVIERTE al entrar, y un fondo
// claro de sRGB puede salir oscuro sin que nadie haya tocado un color.
//
// No da error, no aparece en ninguna compuerta y no se parece a un problema de color: se parece a "el
// fondo quedo raro".
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/color-proyecto.jsx

var RUTA = "C:/ae-probe/color-proyecto.txt";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
anotar("ARCHIVO|" + texto(app.project.file ? app.project.file.fsName : "(sin guardar)"));

var campos = [
  "workingSpace", "linearBlending", "bitsPerChannel", "linearizeWorkingSpace",
  "compensateForSceneReferredProfiles", "workingGamma", "colorSettings",
  "expressionEngine", "framesCountType", "feetFramesFilmType", "footageTimecodeDisplayStartType"
];
var i;
for (i = 0; i < campos.length; i++) {
  var v = "<no existe>";
  try { v = texto(app.project[campos[i]]); } catch (exC) { v = "<no se pudo leer>"; }
  anotar("CAMPO|" + campos[i] + "|" + v);
}

// y de cada comp, la profundidad y si preserva
var ci;
for (ci = 1; ci <= app.project.numItems; ci++) {
  var itm = app.project.item(ci);
  if (!(itm instanceof CompItem)) { continue; }
  var pres = "?";
  try { pres = texto(itm.preserveNestedResolution); } catch (exP) {}
  anotar("COMP|" + itm.name + "|" + itm.width + "x" + itm.height + "|bg " +
         texto(itm.bgColor) + "|preserva " + pres);
}

anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
