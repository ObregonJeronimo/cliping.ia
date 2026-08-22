// LOS ERRORES DE EXPRESION, LEIDOS POR SCRIPT.
//
// AE los cuenta en una barra amarilla ("este proyecto contiene errores de expresion: error 1 de 41") y
// para verlos a mano hay que ir uno por uno con las flechitas. Por script estan todos juntos:
// `prop.expressionError` devuelve el texto del error de esa propiedad, o cadena vacia si anda.
//
// UN DETALLE QUE IMPORTA: una expresion con error NO se apaga sola. `expressionEnabled` sigue en true y
// `value` devuelve el valor SIN la expresion. O sea que una propiedad rota se ve como una propiedad
// quieta, sin ningun sintoma en el cuadro — que es exactamente el modo de fallo que este repo persigue.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/errores-expresion.jsx

var RUTA = "C:/ae-probe/errores-expresion.txt";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
function limpio(s) {
  s = texto(s);
  s = s.replace(/\|/g, "/");
  s = s.replace(/[\r\n]+/g, " ~ ");
  return s;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
anotar("PROYECTO|" + limpio(app.project.file ? app.project.file.fsName : "(sin guardar)"));

var rotos = 0, sanas = 0;

function ver(comp, capa, prop, hondo, ruta) {
  if (prop === null || prop === undefined || hondo > 6) { return; }
  if (ruta === undefined) { ruta = ""; }
  var tipo = 0;
  try { tipo = prop.propertyType; } catch (exT) { return; }

  if (tipo === PropertyType.PROPERTY) {
    var hay = false;
    try { hay = prop.expressionEnabled; } catch (exE) { return; }
    if (!hay) { return; }
    var err = "";
    try { err = prop.expressionError; } catch (exEr) { err = "<no se pudo leer>"; }
    var nom = "?";
    try { nom = (ruta === "" ? "" : ruta + " > ") + prop.name; } catch (exN) {}
    if (err && err !== "") {
      rotos++;
      var cuerpo = "";
      try { cuerpo = prop.expression; } catch (exC) { cuerpo = "?"; }
      anotar("ERROR|" + limpio(comp) + "|" + limpio(capa) + "|" + limpio(nom) + "|" + limpio(err) +
             "|" + limpio(cuerpo));
    } else {
      sanas++;
    }
    return;
  }

  var n = 0;
  try { n = prop.numProperties; } catch (exNP) { return; }
  var mio = "";
  try { if (hondo > 0) { mio = prop.name; } } catch (exNm) { mio = ""; }
  var sub = (mio === "" ? ruta : (ruta === "" ? mio : ruta + " > " + mio));
  var j;
  for (j = 1; j <= n; j++) {
    var hijo = null;
    try { hijo = prop.property(j); } catch (exH) { hijo = null; }
    ver(comp, capa, hijo, hondo + 1, sub);
  }
}

var ci;
for (ci = 1; ci <= app.project.numItems; ci++) {
  var itm = app.project.item(ci);
  if (!(itm instanceof CompItem)) { continue; }
  var li;
  for (li = 1; li <= itm.numLayers; li++) {
    var L = itm.layer(li);
    ver(itm.name, li + " " + L.name, L, 0, "");
  }
}

anotar("");
anotar("TOTAL|" + rotos + " con error|" + sanas + " sanas");
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
