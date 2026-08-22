// LEE, DE LA COMPOSICION VIVA, la posicion de la camara y el eje Y de cada capa separada.
// No construye nada: contesta si el documento exportado dice la verdad sobre lo que hay en AE.
var RUTA = "C:/ae-probe/leer-y.txt";
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
try {
  var comp = null, n = app.project.numItems;
  while (n > 0) {
    var it = app.project.item(n);
    if (it instanceof CompItem && it.name === "PIEZA-I") { comp = it; }
    n = n - 1;
  }
  if (comp === null) { throw new Error("no esta PIEZA-I abierta"); }
  var i = 1;
  while (i <= comp.numLayers) {
    var c = comp.layer(i);
    var g = c.property("ADBE Transform Group");
    var p = g.property("ADBE Position");
    var sep = p.dimensionsSeparated;
    var linea = "CAPA|" + c.name + "|separada=" + texto(sep);
    if (sep) {
      var y = g.property("ADBE Position_1");
      linea = linea + "|y=" + texto(y.value) + "|clavesY=" + texto(y.numKeys);
      var x = g.property("ADBE Position_0");
      linea = linea + "|x=" + texto(x.value) + "|clavesX=" + texto(x.numKeys);
    } else {
      linea = linea + "|pos=" + texto(p.value);
    }
    anotar(linea);
    i = i + 1;
  }
  anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo));
  anotar("--- fin ---");
}
