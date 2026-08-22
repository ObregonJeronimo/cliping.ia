// PRUEBA DEL RESPLANDOR: paneles en perspectiva, unos que brillan y otros que no.
//
// EL RESPLANDOR ES LA UNICA PARTE DE LA CADENA DONDE NO SE EXIGE IDENTIDAD CON AE, y es a proposito:
// los efectos de AE se calculan sobre el raster 2D de la capa ANTES de la transformacion 3D —o sea que
// un resplandor se deforma junto con el panel— y el bloom de un motor web es post-proceso en espacio
// de pantalla. Son dos lugares distintos del pipeline. Perseguir identidad de pixel ahi es perseguir
// algo que no existe.
//
// Lo que viaja es la INTENCION, escrita en el COMENTARIO de la capa:
//
//     brillo <fuerza> <radio> <umbral>          por ejemplo:  brillo 1.4 0.7 0.55
//
// Y se usa el comentario, y no los parametros del efecto Glow de AE, por una razon medida: los nombres
// de las propiedades de efecto estan TRADUCIDOS, igual que los de menu — donde findMenuCommandId
// ("Easy Ease") devolvia 0 y el que existia era "Aceleracion suave". Un exportador que busque
// "Glow Intensity" anda en ingles y falla mudo en español.
//
// LA ESCENA TIENE CAPAS QUE BRILLAN Y CAPAS QUE NO, a proposito: si todas brillaran, un bloom global
// mal implementado pasaria por selectivo y nadie se enteraria hasta la primera pieza donde importa.

var RUTA = "C:/ae-probe/brillo.txt";

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

app.beginUndoGroup("prueba de brillo");

var NOMBRE = "BRILLO-PRUEBA";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 4;
var FONDO  = [0.043, 0.043, 0.055];
var ACENTO = [0.949, 0.251, 0.149];
var CIAN   = [0.149, 0.741, 0.949];
var HUESO  = [0.949, 0.945, 0.925];
var APAGADO = [0.176, 0.192, 0.239];

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}

var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
comp.bgColor = FONDO;
comp.resolutionFactor = [1, 1];
comp.motionBlur = false;
comp.openInViewer();

function tr(c) { return c.property("ADBE Transform Group"); }

// ---------------------------------------------------------------- paneles apagados, al fondo
// Estan primero para que queden ABAJO en el apilado, y sirven de referencia: si el bloom fuera global
// en vez de selectivo, estos tambien se encenderian y el defecto se veria de una.
var apagados = [
  [520, 620, 560, 340, -22],
  [1450, 640, 520, 320, 26]
];
var a;
for (a = 0; a < apagados.length; a++) {
  var P = apagados[a];
  var panel = comp.layers.addSolid(APAGADO, "panel-apagado" + (a + 1), P[2], P[3], 1);
  panel.threeDLayer = true;
  tr(panel).property("ADBE Position").setValue([P[0], P[1], 380]);
  tr(panel).property("ADBE Rotate Y").setValue(P[4]);
}

// ---------------------------------------------------------------- las barras que SI brillan
// EL UMBRAL SE COMPARA CONTRA LA LUMINANCIA EN LINEAL, no contra "que tan brillante se ve".
// El rojo #F24026 parece intenso y en lineal su luminancia es 0,226 — por debajo de un umbral de 0,35,
// asi que con ese numero NO desborda y la capa sale plana. El cian #26BDF2 da 0,417 y si desborda.
// Los dos van con parametros DISTINTOS a proposito: si el reproductor agrupara mal y aplicara una sola
// pasada para todos, las dos barras saldrian con el mismo halo y nadie se enteraria.
var barras = [
  [430, 300, 540, 16, ACENTO, "brillo 1.7 0.80 0.14"],
  [1360, 330, 460, 16, CIAN,  "brillo 0.8 0.45 0.34"]
];
var b;
for (b = 0; b < barras.length; b++) {
  var B = barras[b];
  var barra = comp.layers.addSolid(B[4], "barra-brillo" + (b + 1), B[2], B[3], 1);
  barra.threeDLayer = true;
  tr(barra).property("ADBE Position").setValue([B[0], B[1], 200]);
  tr(barra).property("ADBE Rotate Y").setValue(b === 0 ? -18 : 22);
  // LA DECLARACION. Es texto que escribe el autor: no depende del idioma de la interfaz.
  barra.comment = B[5];
  anotar("DECLARA|" + barra.name + "|" + B[5]);
}

// ---------------------------------------------------------------- un titulo que brilla suave
var titulo = comp.layers.addText("PERSPECTIVA");
titulo.name = "titulo";
var pt = titulo.property("ADBE Text Properties").property("ADBE Text Document");
var d = pt.value;
d.fontSize = 132;
d.fillColor = HUESO;
d.applyFill = true;
d.justification = ParagraphJustification.CENTER_JUSTIFY;
try { d.font = "Arial-Black"; } catch (exF) {}
pt.setValue(d);
titulo.threeDLayer = true;
tr(titulo).property("ADBE Position").setValue([ANCHO / 2, 900, 0]);
// EL UMBRAL ALTO NO ES UN GUSTO: es lo que hace que un texto BLANCO no se vuelva un borron.
// El bloom trabaja sobre las altas luces DENTRO de una imagen. Un glifo blanco macizo esta ENTERO por
// encima de un umbral bajo, asi que no le brilla el borde: le brilla todo, y "PERSPECTIVA" sale como
// una mancha ilegible. Con el umbral casi al tope, solo desborda lo que de verdad satura, y el
// resplandor queda como un halo en vez de como una capa de pintura.
titulo.comment = "brillo 0.42 0.55 0.92";
anotar("DECLARA|titulo|" + titulo.comment);

// ---------------------------------------------------------------- una bajada que NO brilla
var bajada = comp.layers.addText("el resplandor se declara, no se porta");
bajada.name = "bajada";
var pb = bajada.property("ADBE Text Properties").property("ADBE Text Document");
var db = pb.value;
db.fontSize = 40;
db.fillColor = [0.545, 0.565, 0.627];
db.applyFill = true;
db.justification = ParagraphJustification.CENTER_JUSTIFY;
pb.setValue(db);
bajada.threeDLayer = true;
tr(bajada).property("ADBE Position").setValue([ANCHO / 2, 975, 0]);

// ---------------------------------------------------------------- la camara, viajando
var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var ZOOM = 2666.6666666;
try { ZOOM = camara.property("ADBE Camera Options Group").property("ADBE Camera Zoom").value; } catch (exZ) {}
var pc = camara.property("ADBE Transform Group").property("ADBE Position");
camara.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([ANCHO / 2, ALTO / 2, 0]);
pc.setValueAtTime(0, [ANCHO / 2 - 420, ALTO / 2 - 120, -ZOOM * 0.82]);
pc.setValueAtTime(DUR, [ANCHO / 2 + 380, ALTO / 2 + 90, -ZOOM * 1.05]);
var k;
for (k = 1; k <= pc.numKeys; k++) {
  pc.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
  pc.setTemporalEaseAtKey(k, [new KeyframeEase(0, 62)], [new KeyframeEase(0, 62)]);
}

anotar("CAPAS|" + comp.numLayers);
app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
