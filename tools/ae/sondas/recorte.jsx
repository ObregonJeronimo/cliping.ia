// SONDA DE RECORTE — el revelado por mascara, que hasta hoy era una de las cuatro cosas irreproducibles.
//
// QUE MONTA. Tres columnas sobre negro, todas con el MISMO texto subiendo la misma distancia:
//   izquierda  SIN recorte  -> se ve entrar desde abajo, flotando (lo que se podia hacer antes)
//   centro     CON recorte  -> aparece por detras de un borde invisible (el revelado de verdad)
//   derecha    la matte VISIBLE, para ver donde esta el borde que recorta al del centro
//
// El matte es un MATTE DE PISTA DE AE, no una capa apagada que solo mire el motor: asi la
// previsualizacion de AE muestra exactamente lo que va a renderizar el navegador. Una regla que
// muestra otra cosa que el resultado no es una regla.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/recorte.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/recorte.jsx

var RUTA = "C:/ae-probe/recorte.txt";

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

app.beginUndoGroup("SONDA-RECORTE");

var NOMBRE = "SONDA-RECORTE";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 40;

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

// EL FONDO ES UN SOLIDO REAL — LEY 4, y me la saltee en mi propia sonda. `comp.bgColor` no existe hasta
// la codificacion: sin el solido, el cuadro sale transparente y se compone sobre blanco, que es
// exactamente lo que hace imposible ver si un texto claro esta recortado o no.
// EL FONDO VA EN 3D Y LEJOS — LEY 7, y me la volvi a saltear. Una capa 2D se dibuja DESPUES del mundo
// 3D, o sea ENCIMA: con el fondo en 2D, las capas 3D de esta sonda quedaban tapadas por un rectangulo
// negro y el cuadro salia sin ellas. No dio error: dio un cuadro plausible al que le faltaban tres
// capas, que es peor.
var fondoNegro = comp.layers.addSolid([0, 0, 0], "fondo-negro", 9000, 5200, 1);
fondoNegro.threeDLayer = true;
tr(fondoNegro).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, 4000]);

function rotulo(cadena, x) {
  var t = comp.layers.addText(cadena);
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = 72; d.fillColor = [0.95, 0.96, 0.98]; d.applyFill = true;
  d.justification = ParagraphJustification.CENTER_JUSTIFY;
  try { d.font = "CenturyGothic"; } catch (exF) {}
  p.setValue(d);
  // sube 120 px: entra desde abajo de la linea de base
  // arranca 140 px por debajo de la banda: en el cuadro 0 el texto recortado tiene que ser INVISIBLE,
  // y esa es la unica prueba que sirve. Empezando apenas afuera, "recortado" y "sin recortar" se ven
  // casi igual y el veredicto lo pone uno.
  tr(t).property("ADBE Position").setValueAtTime(0, [x, 700]);
  tr(t).property("ADBE Position").setValueAtTime(CUADROS / FPS, [x, 545]);
  return t;
}

// LA MATTE VA ARRIBA DE LA CAPA QUE RECORTA. Es como AE define el matte de pista, y por eso el orden
// de creacion importa: en este script las capas se agregan al TOPE, asi que la matte se crea DESPUES.
var textoRecortado = rotulo("RECORTADO", ANCHO / 2);
var matte = comp.layers.addSolid([1, 1, 1], "matte", 700, 110, 1);
tr(matte).property("ADBE Position").setValue([ANCHO / 2, 540]);
textoRecortado.trackMatteType = TrackMatteType.ALPHA;

var textoLibre = rotulo("SIN RECORTE", 380);

// y una copia visible del rectangulo, para ver donde esta el borde
var muestra = comp.layers.addSolid([0.16, 0.18, 0.24], "deco-muestra-del-borde", 700, 110, 1);
tr(muestra).property("ADBE Position").setValue([1540, 540]);
var textoMuestra = rotulo("EL BORDE", 1540);

// EL CASO QUE ESTABA ROTO Y QUE LA SONDA NO PROBABA: matte 3D GIRADA, y la capa recortada a OTRA
// profundidad. El matte de pista de AE es alfa de PANTALLA, asi que lo que vale es el cuadrilatero
// PROYECTADO de la matte — no su plano. Con la version anterior (un prisma desde la normal del
// rectangulo) esto ensanchaba un 187%.
var textoLejos = comp.layers.addText("EN PERSPECTIVA");
var pl = textoLejos.property("ADBE Text Properties").property("ADBE Text Document");
var dl = pl.value;
dl.fontSize = 64; dl.fillColor = [0.55, 0.72, 1]; dl.applyFill = true;
dl.justification = ParagraphJustification.CENTER_JUSTIFY;
try { dl.font = "CenturyGothic"; } catch (exFL) {}
pl.setValue(dl);
textoLejos.threeDLayer = true;
tr(textoLejos).property("ADBE Position").setValue([ANCHO / 2, 880, 600]);

var matteGirada = comp.layers.addSolid([1, 1, 1], "matte-girada", 640, 130, 1);
matteGirada.threeDLayer = true;
tr(matteGirada).property("ADBE Position").setValue([ANCHO / 2, 880, 200]);
tr(matteGirada).property("ADBE Rotate Y").setValue(42);
textoLejos.trackMatteType = TrackMatteType.ALPHA;

// y una copia visible de esa misma matte, al lado, para poder comparar el recorte contra su proyeccion
var muestraGirada = comp.layers.addSolid([0.16, 0.18, 0.24], "deco-muestra-girada", 640, 130, 1);
muestraGirada.threeDLayer = true;
// ABAJO, no encima del texto: al estar a z=200 queda MAS CERCA de la camara que el texto (z=600), asi
// que dibujada en el mismo sitio lo tapaba entero. Estuve un rato buscando un defecto del recorte que
// era la sonda ocultando su propio sujeto.
tr(muestraGirada).property("ADBE Position").setValue([ANCHO / 2, 1010, 200]);
tr(muestraGirada).property("ADBE Rotate Y").setValue(42);

// diagnostico: que ve el exportador de cada capa
var k;
for (k = 1; k <= comp.numLayers; k++) {
  var L2 = comp.layer(k);
  var tm = "?", nl = "?", ms = "?";
  try { tm = L2.trackMatteType; } catch (e1) { tm = "sin"; }
  try { nl = L2.nullLayer; } catch (e2) { nl = "sin"; }
  try { ms = (L2.source && L2.source.mainSource instanceof SolidSource) ? "solido" : "otro"; } catch (e3) { ms = "sin"; }
  anotar("DIAG|" + k + "|" + L2.name + "|matte=" + tm + "|nula=" + nl + "|fuente=" + ms);
}
anotar("SONDA|" + NOMBRE + "|capas=" + comp.numLayers + "|NO_TRACK=" + TrackMatteType.NO_TRACK_MATTE + "|ALFA=" + TrackMatteType.ALPHA);
anotar("MATTE|texto=" + textoRecortado.index + "|matte=" + matte.index +
       "|tipo=" + textoRecortado.trackMatteType + "|ALFA=" + TrackMatteType.ALPHA);
comp.time = 0;
app.endUndoGroup();
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
