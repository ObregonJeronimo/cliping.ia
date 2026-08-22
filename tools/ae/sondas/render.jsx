// RENDERIZAR UNA COMPOSICION A PNG, cuadro por cuadro. Reutilizable para cualquier comp.
//
// Es la contraparte de `exportar.jsx`: aquel saca los DATOS, este saca los PIXELES. Con los dos se
// puede hacer la unica pregunta que decide algo — reproducir el documento en la web y comparar contra
// lo que renderizo After Effects.
//
// LO QUE YA COSTO CARO Y ESTA APLICADO:
//   · `resolutionFactor = [1,1]` FORZADO. Medido: con el visor en "Mitad", saveFrameToPng escribe el
//     PNG a la mitad. Cada medicion saldria dividida por dos y la conclusion seria "el reproductor
//     esta roto" cuando lo roto es el instrumento.
//   · NO se verifica desde aca que el archivo exista. Medido: File.exists devuelve false para cuadros
//     que estan en disco, y una carpeta destino inexistente no tira excepcion — el aviso sale como
//     dialogo modal minutos despues. La verificacion vive afuera y mira el contenido del PNG.
//   · El parametro llega por archivo porque `AfterFX.exe -r` no acepta argumentos. Ninguno.

var RUTA = "C:/ae-probe/render.txt";
var PEDIDO = "C:/ae-probe/render-comp.txt";
var DESTINO = "C:/ae-probe/render";

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

function tresDigitos(n) {
  if (n < 10) { return "00" + n; }
  if (n < 100) { return "0" + n; }
  return "" + n;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

var nombre = "";
var pedido = new File(PEDIDO);
if (pedido.exists) {
  pedido.open("r");
  nombre = ("" + pedido.read()).replace(/^[\s]+/, "").replace(/[\s]+$/, "");
  pedido.close();
}

var comp = null;
var q;
for (q = 1; q <= app.project.numItems; q++) {
  var it = app.project.item(q);
  if (it instanceof CompItem && (nombre === "" || it.name === nombre)) { comp = it; break; }
}
if (comp === null) { throw new Error("no encontre la composicion '" + nombre + "'"); }

comp.resolutionFactor = [1, 1];
comp.openInViewer();

var raiz = new Folder(DESTINO);
if (!raiz.exists) { raiz.create(); }
var carpeta = new Folder(DESTINO + "/" + comp.name);
if (!carpeta.exists) { carpeta.create(); }

// BORRAR LOS PNG VIEJOS. Si un cuadro falla mudo, el de la corrida anterior queda ahi entero, con su
// IEND, indistinguible de uno nuevo — y el error sale mezclado: chico donde el cuadro es nuevo,
// plausible donde es viejo.
var viejos = carpeta.getFiles("*.png");
var v;
for (v = 0; v < viejos.length; v++) { viejos[v].remove(); }

anotar("COMP|" + comp.name + "|" + comp.width + "|" + comp.height + "|" + comp.frameRate + "|" + comp.duration);

var total = Math.floor(comp.duration * comp.frameRate);
var k;
for (k = 0; k < total; k++) {
  var t = k * comp.frameDuration;
  comp.saveFrameToPng(t, new File(DESTINO + "/" + comp.name + "/f" + tresDigitos(k) + ".png"));
  anotar("CUADRO|" + k + "|" + t + "|" + comp.name + "/f" + tresDigitos(k) + ".png");
}
anotar("PEDIDOS|" + total);

// Y LOS VALORES QUE AE DICE QUE TIENE CADA CAPA EN CADA CUADRO. Es la columna que separa "mi
// matematica contra la de AE" de "mi dibujado contra el de AE": con un solo numero, un error de
// conversion y un sesgo del instrumento son indistinguibles, y si se compensaran el resultado saldria
// MEJOR de lo que la conversion merece. Ya resolvio un diagnostico falso en la Prueba 3.
var i;
for (i = 1; i <= comp.numLayers; i++) {
  var capa = comp.layer(i);
  var tr = capa.property("ADBE Transform Group");
  for (k = 0; k < total; k++) {
    var tt = k * comp.frameDuration;
    var partes = ["VALOR", i, k];
    var nombres = ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Opacity"];
    var p;
    for (p = 0; p < nombres.length; p++) {
      var val = "";
      try {
        var pr = tr.property(nombres[p]);
        var vv = pr.valueAtTime(tt, false);
        val = (typeof vv.length === "number") ? vv.join(";") : ("" + vv);
      } catch (exVal) { val = "?"; }
      partes[partes.length] = val;
    }
    anotar(partes.join("|"));
  }
}

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
