// PRUEBA DE IMAGENES: ¿una imagen viaja de After Effects al reproductor sin cambiar?
//
// Es el punto 2 del camino hacia una pieza como la de Gemini: sin contenido adentro, los paneles son
// rectangulos. Y es donde vive una trampa que ya me comio una vez —recreando Gemini con three.js, los
// negros salieron grises porque el lienzo 2D ya entrega sRGB y three lo volvia a convertir.
//
// DOS CAPAS, Y LA PRIMERA ES LA QUE DECIDE:
//
//   A · la imagen a ESCALA 100, sin rotar, alineada a pixeles enteros. Cualquier diferencia en esta
//       capa es del CAMINO —espacio de color, alfa, codificacion— y no del remuestreo. Si esta capa
//       no da identica, no tiene sentido mirar la otra.
//   B · la misma imagen escalada y rotada en 3D. Aca si va a haber remuestreo, y lo que se mide es
//       otra cosa: que el filtrado no la corra ni la deforme.
//
// Separarlas importa: con una sola capa escalada, un error de color y un error de filtrado se suman en
// el mismo numero y no se sabe cual es cual.

var RUTA = "C:/ae-probe/imagen.txt";
var PATRON = "C:/ae-probe/recursos/patron.png";

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

app.beginUndoGroup("prueba de imagen");

var NOMBRE = "IMAGEN-PRUEBA";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 2;

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}

var archivo = new File(PATRON);
if (!archivo.exists) { throw new Error("no existe " + PATRON + " — corre node tools/ae/patron.mjs"); }

// SE REUTILIZA EL METRAJE SI YA ESTA IMPORTADO. Importar el mismo archivo dos veces deja dos items
// distintos apuntando al mismo PNG, y despues "cual de los dos" es una pregunta sin respuesta util.
var metraje = null;
var q;
for (q = 1; q <= app.project.numItems; q++) {
  var itm = app.project.item(q);
  if (itm instanceof FootageItem && itm.file && itm.file.fsName === archivo.fsName) { metraje = itm; break; }
}
if (metraje === null) {
  metraje = app.project.importFile(new ImportOptions(archivo));
}
anotar("METRAJE|" + metraje.name + "|" + metraje.width + "x" + metraje.height +
       "|" + (metraje.file ? metraje.file.fsName : "?") + "|alfa=" + metraje.mainSource.alphaMode);

var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
comp.bgColor = [0, 0, 0];
comp.resolutionFactor = [1, 1];
comp.motionBlur = false;
comp.openInViewer();

// ---------------------------------------------------------------- B: escalada y rotada en 3D
var b = comp.layers.add(metraje);
b.name = "imagen-3d";
b.threeDLayer = true;
var trB = b.property("ADBE Transform Group");
trB.property("ADBE Position").setValue([1400, 700, 420]);
trB.property("ADBE Scale").setValue([70, 70, 100]);
trB.property("ADBE Rotate Y").setValue(-32);
trB.property("ADBE Rotate X").setValue(14);

// ---------------------------------------------------------------- A: 1:1, sin rotar, en pixeles enteros
// LA POSICION ES ENTERA Y LA ESCALA ES 100 A PROPOSITO. Con la imagen alineada a la grilla de pixeles
// no hay remuestreo posible: cada pixel del archivo cae sobre un pixel de salida. Cualquier diferencia
// que aparezca es del espacio de color, del alfa o de la codificacion — nunca del filtrado.
var a = comp.layers.add(metraje);
a.name = "imagen-1a1";
var trA = a.property("ADBE Transform Group");
trA.property("ADBE Position").setValue([500, 340]);
trA.property("ADBE Scale").setValue([100, 100]);

// una camara, para que el 3D tenga por donde mirarse
var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var ZOOM = 2666.6666666;
try { ZOOM = camara.property("ADBE Camera Options Group").property("ADBE Camera Zoom").value; } catch (exZ) {}
camara.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -ZOOM]);
camara.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([ANCHO / 2, ALTO / 2, 0]);

anotar("CAPAS|" + comp.numLayers);
anotar("A|posicion|" + trA.property("ADBE Position").value.join(";") + "|escala|100");
anotar("B|posicion|" + trB.property("ADBE Position").value.join(";") + "|escala|70|rotY|-32|rotX|14");

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
