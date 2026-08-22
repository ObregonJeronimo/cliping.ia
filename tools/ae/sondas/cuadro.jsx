// AE ESCRIBE CUADROS SUELTOS A DISCO. Es la verdad de referencia contra la que se mide el motor.
//
// POR QUE EXISTE, Y POR QUE NO CONTRADICE LA ARQUITECTURA. Este proyecto se sostiene en que AE NO
// renderiza el video: autora, y el motor web reproduce. Eso sigue igual. Lo que hace esta sonda es
// pedirle a AE UN cuadro para COMPARAR, que es medicion, no produccion — la misma categoria que
// `valueAtTime` o `sourceRectAtTime`, solo que en pixeles.
//
// Y hacia falta. Hasta hoy cada funcion nueva se verificaba contra algun numero que AE expusiera. Con
// las MASCARAS eso se termina: esta medido en `sondas/mascara.jsx` que `sourceRectAtTime` NO refleja
// las mascaras — un solido de 400x300 sigue midiendo 400x300 con la mascara puesta, invertida, con
// calado, con expansion y con varias mascaras en todos los modos. Sin ningun numero que dependa de la
// mascara, no hay compuerta posible; con pixeles, si.
//
// `saveFrameToPng` ES ASINCRONA. La llamada vuelve enseguida y el archivo aparece despues — el mismo
// comportamiento que `AfterFX.exe -r`, que ya esta anotado en el cuaderno. Por eso esta sonda ANUNCIA
// los archivos que va a escribir y el que la maneja (`tools/ae/cuadro-ae.mjs`) los espera. Mirar el
// disco justo despues de la llamada da "el archivo no existe" y parece que fallo.
//
// El fondo sale TRANSPARENTE: medido, fuera de la mascara alfa=0. Eso es bueno para comparar, porque
// el alfa es justamente lo que una mascara modifica.
//
// PARAMETROS, por archivo, que `-r` no acepta argumentos:
//   C:/ae-probe/exportar-comp.txt   el nombre de la composicion
//   C:/ae-probe/cuadro-frames.txt   los cuadros, separados por comas
//
// USO
//   node tools/ae/cuadro-ae.mjs <COMPOSICION> <cuadros>

var RUTA = "C:/ae-probe/cuadro.txt";
var DESTINO = "C:/ae-probe/ae-cuadros";
var PEDIDO = "C:/ae-probe/exportar-comp.txt";
var FRAMES = "C:/ae-probe/cuadro-frames.txt";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (e) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
function leerArchivo(ruta) {
  var f = new File(ruta);
  if (!f.exists) { return null; }
  f.open("r");
  var s = "" + f.read();
  f.close();
  return s.replace(/^[\s]+/, "").replace(/[\s]+$/, "");
}
function conCeros(n) {
  var s = "" + n;
  while (s.length < 3) { s = "0" + s; }
  return s;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
var carpeta = new Folder(DESTINO);
if (!carpeta.exists) { carpeta.create(); }

var comp = null;
var nombre = leerArchivo(PEDIDO);
if (nombre !== null && nombre !== "") {
  var q;
  for (q = 1; q <= app.project.numItems; q++) {
    var it = app.project.item(q);
    if (it instanceof CompItem && it.name === nombre) { comp = it; break; }
  }
  if (comp === null) { throw new Error("no existe la composicion " + nombre); }
}
if (comp === null && app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
if (comp === null) { throw new Error("no hay composicion"); }
// UNA CARPETA POR COMPOSICION, Y NO ES ORDEN: ES CORRECCION.
// Con una sola carpeta y los cuadros nombrados por numero, dos composiciones se pisan. Correr la
// compuerta sobre A y despues sobre B compara los cuadros de AE de A contra los del motor de B. Aca lo
// cazo la diferencia de tamano (800x660 contra 1200x800) y salio con codigo 2 — pero con dos
// composiciones del MISMO tamano habria comparado piezas distintas y dado verde.
DESTINO = DESTINO + "/" + comp.name;
var sub = new Folder(DESTINO);
if (!sub.exists) { sub.create(); }
anotar("COMP|" + comp.name + "|" + comp.width + "x" + comp.height + "|" + comp.frameRate);

if (typeof comp.saveFrameToPng !== "function") {
  throw new Error("esta version de AE no tiene saveFrameToPng");
}

var listaTexto = leerArchivo(FRAMES);
var cuadros = [], i;
if (listaTexto !== null && listaTexto !== "") {
  var partes = listaTexto.split(",");
  for (i = 0; i < partes.length; i++) {
    var v = parseInt(partes[i], 10);
    if (!isNaN(v)) { cuadros[cuadros.length] = v; }
  }
}
if (cuadros.length === 0) { cuadros = [0]; }

// SE BORRA LO VIEJO ANTES DE PEDIR LO NUEVO. Como la escritura es asincrona, un archivo que ya estaba
// de una corrida anterior se lee como si fuera el de esta y la comparacion sale verde sobre datos
// viejos. Es el modo de falla mas silencioso que tiene un canal asincrono.
for (i = 0; i < cuadros.length; i++) {
  var viejo = new File(DESTINO + "/f" + conCeros(cuadros[i]) + ".png");
  if (viejo.exists) { viejo.remove(); }
}

for (i = 0; i < cuadros.length; i++) {
  var ruta = DESTINO + "/f" + conCeros(cuadros[i]) + ".png";
  var t = cuadros[i] / comp.frameRate;
  var estado = "pedido";
  try { comp.saveFrameToPng(t, new File(ruta)); }
  catch (exS) { estado = "FALLO: " + texto(exS.message ? exS.message : exS); }
  // se ANUNCIA, no se comprueba: la escritura es asincrona y mirar ahora da siempre "no existe"
  anotar("PIDO|" + cuadros[i] + "|" + ruta + "|" + estado);
}
anotar("TOTAL|" + cuadros.length);
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
