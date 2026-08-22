// LA SONDA MAESTRA — todas las funciones del motor en UNA composicion y UN cuadro.
//
// POR QUE EXISTE. Cada funcion nueva traia su propia sonda, su propia llamada a AE, su propia
// exportacion y su propio render. Seis funciones son seis renders, y cada arreglo posterior los vuelve
// a pedir todos: es como se termina renderizando cuarenta veces para verificar seis cosas.
//
// Aca entran todas juntas, colocadas para que NO SE ESTORBEN, y con MARCADORES: reglas finas dibujadas
// en posiciones conocidas, para que el lector (`tools/ae/todo-check.mjs`) pueda MEDIR sobre el PNG en
// vez de que una persona mire y opine. Un cuadro, una medicion, un veredicto.
//
// EL TRUCO QUE HACE POSIBLE MEZCLARLO TODO: la profundidad de campo solo toca capas 3D
// (`radioDesenfoque` sale con cero si `capa.es3D` es falso). Asi que los paneles del ensayo de foco van
// en 3D y TODO LO DEMAS va en 2D, donde el desenfoque no llega. Sin eso, una sola camara enfocada a una
// distancia desenfocaria tambien los textos que hay que medir nitidos.
//
// Y EL FONDO VA EN 3D Y LEJOS — LEY 7. Una capa 2D se dibuja DESPUES del mundo 3D, o sea encima: un
// fondo en 2D taparia los paneles del ensayo de foco y el cuadro saldria sin ellos, sin ningun error.
//
// QUE SE VERIFICA, y donde
//   A  fusion aditiva      arriba izquierda   dos discos iguales sobre una franja clara
//   B  interletra y origen abajo izquierda    cuatro textos con una regla en su origen de capa
//   C  cursiva             abajo izquierda    la misma palabra romana y cursiva
//   D  recorte por matte   centro abajo       un texto que solo existe dentro de una banda
//   E  arco que crece      derecha abajo      un anillo al 60%
//   F  profundidad         derecha arriba     dos paneles 3D, uno en el plano de foco y otro no
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/todo.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/todo.jsx
//   printf 'SONDA-TODO' > C:/ae-probe/exportar-comp.txt && node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/sonda-todo.json
//   python tools/ae/motor/capturar-comp.py --doc C:/ae-probe/sonda-todo.json --salida C:/ae-probe/render/TODO --con-fondo --obturador 1 --cuadros 20
//   node tools/ae/todo-check.mjs

var RUTA = "C:/ae-probe/todo.txt";

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

app.beginUndoGroup("SONDA-TODO");

var NOMBRE = "SONDA-TODO";
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
var TINTA = [0.95, 0.96, 0.98];

// ---------------------------------------------------------------- la camara y el fondo
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
tr(cam).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -1600]);
var opc = cam.property("ADBE Camera Options Group");
opc.property("ADBE Camera Depth of Field").setValue(1);
opc.property("ADBE Camera Aperture").setValue(200);
// el foco cae EXACTAMENTE sobre el panel cercano: asi uno tiene que salir nitido y el otro no, y la
// diferencia entre los dos ES la medicion
opc.property("ADBE Camera Focus Distance").setValue(2000);

var fondoNegro = comp.layers.addSolid([0, 0, 0], "fondo-negro", 9000, 5200, 1);
fondoNegro.threeDLayer = true;
tr(fondoNegro).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, 4200]);

// ---------------------------------------------------------------- F · profundidad de campo (3D)
var cachePng = {};
function recurso(archivo) {
  if (cachePng[archivo]) { return cachePng[archivo]; }
  var f = new File("C:/ae-probe/recursos-h/" + archivo + ".png");
  if (!f.exists) { throw new Error("falta el recurso " + archivo); }
  cachePng[archivo] = app.project.importFile(new ImportOptions(f));
  return cachePng[archivo];
}
function panel(nombre, x, z) {
  var c = comp.layers.add(recurso("panel-doc"));
  c.name = nombre;
  c.threeDLayer = true;
  // el mismo tamano EN PANTALLA para los dos: la unica diferencia visible tiene que ser la nitidez
  var esc = 15 * (1600 + z) / 1600;
  tr(c).property("ADBE Position").setValue([x, 300, z]);
  tr(c).property("ADBE Scale").setValue([esc, esc, esc]);
  return c;
}
panel("foco-nitido", 1240, 400);     // distancia 2000 = el plano de foco
panel("foco-borroso", 1660, 1800);   // distancia 3400

// ---------------------------------------------------------------- A · fusion aditiva (2D)
var franja = comp.layers.addSolid([0.24, 0.26, 0.32], "franja", 700, 200, 1);
tr(franja).property("ADBE Position").setValue([400, 200]);
function disco(nombre, x, modo) {
  var s = comp.layers.addSolid([0.30, 0.42, 0.80], nombre, 200, 200, 1);
  tr(s).property("ADBE Position").setValue([x, 200]);
  if (modo !== null) { s.blendingMode = modo; }
  return s;
}
disco("disco-normal", 250, null);
disco("disco-suma", 550, BlendingMode.ADD);

// ---------------------------------------------------------------- B · interletra y ORIGEN
// LA REGLA EN EL ORIGEN es lo que convierte "se ve corrido" en un numero. Se dibuja un solido de 2 px
// exactamente en la X de la capa de texto; si AE centra la tinta en el origen, el centro de la tinta
// medido sobre el PNG tiene que coincidir con esa regla. El defecto que se busca vale 8,6 px.
function regla(x, y, alto) {
  var s = comp.layers.addSolid([1, 0.3, 0.3], "deco-regla", 2, alto, 1);
  tr(s).property("ADBE Position").setValue([x, y]);
  return s;
}
function rotulo(nombre, cadena, x, y, track, alin, cursiva) {
  var t = comp.layers.addText(cadena);
  t.name = nombre;
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = 64;
  d.fillColor = TINTA;
  d.applyFill = true;
  d.justification = alin;
  d.tracking = track;
  try { d.font = cursiva ? "SegoeUI-Italic" : "CenturyGothic"; } catch (exF) {}
  p.setValue(d);
  tr(t).property("ADBE Position").setValue([x, y]);
  return t;
}
var CX = 430;
regla(CX, 470, 210);
rotulo("txt-centro-0", "CENTRO CERO", CX, 420, 0, ParagraphJustification.CENTER_JUSTIFY, false);
rotulo("txt-centro-200", "CENTRO DOSCIENTOS", CX, 520, 200, ParagraphJustification.CENTER_JUSTIFY, false);

var DX = 800;
regla(DX, 690, 210);
rotulo("txt-derecha-0", "DERECHA CERO", DX, 640, 0, ParagraphJustification.RIGHT_JUSTIFY, false);
rotulo("txt-derecha-200", "DERECHA DOSCIENTOS", DX, 740, 200, ParagraphJustification.RIGHT_JUSTIFY, false);

// ---------------------------------------------------------------- C · cursiva
// LA MISMA PALABRA Y LA MISMA FAMILIA, y empezando por una letra de asta vertical.
//
// La primera version ponia "Romana" en CenturyGothic contra "Cursiva" en SegoeUI-Italic: dos palabras
// distintas en dos tipografias distintas, o sea una comparacion que no significa nada. Y "C" tiene su
// punto mas a la izquierda a media altura, asi que ni siquiera acusa la inclinacion en el borde.
// "Hilo" empieza con asta vertical, no tiene descendentes y mide igual en las dos.
rotulo("txt-romana", "Hilo", 200, 880, 0, ParagraphJustification.LEFT_JUSTIFY, false);
rotulo("txt-cursiva", "Hilo", 520, 880, 0, ParagraphJustification.LEFT_JUSTIFY, true);

// ---------------------------------------------------------------- D · recorte por matte (2D, coplanar)
// LA MATTE VA ARRIBA DE LA CAPA QUE RECORTA: en este script las capas se agregan al TOPE, asi que la
// matte se crea DESPUES del texto.
var txtRecortado = rotulo("txt-recortado", "RECORTADO", 1100, 900, 0, ParagraphJustification.CENTER_JUSTIFY, false);
var matte = comp.layers.addSolid([1, 1, 1], "matte", 420, 46, 1);
tr(matte).property("ADBE Position").setValue([1100, 880]);
txtRecortado.trackMatteType = TrackMatteType.ALPHA;

// ---------------------------------------------------------------- E · arco al 60%
var LA = comp.layers.addShape();
LA.name = "arco-60";
var raiz = LA.property("ADBE Root Vectors Group");
var grupo = raiz.addProperty("ADBE Vector Group");
var conten = grupo.property("ADBE Vectors Group");
var el = conten.addProperty("ADBE Vector Shape - Ellipse");
el.property("ADBE Vector Ellipse Size").setValue([220, 220]);
var tz = conten.addProperty("ADBE Vector Graphic - Stroke");
tz.property("ADBE Vector Stroke Color").setValue([0.36, 0.55, 1, 1]);
tz.property("ADBE Vector Stroke Width").setValue(22);
var rc = conten.addProperty("ADBE Vector Filter - Trim");
rc.property("ADBE Vector Trim Start").setValue(0);
rc.property("ADBE Vector Trim End").setValue(60);
tr(LA).property("ADBE Position").setValue([1650, 830]);

anotar("SONDA|" + NOMBRE + "|capas=" + comp.numLayers);
anotar("MARCA|centro=" + CX + "|derecha=" + DX);
var cajaC0 = comp.layer("txt-centro-0").sourceRectAtTime(0, false);
var cajaC2 = comp.layer("txt-centro-200").sourceRectAtTime(0, false);
anotar("CAJAS|centro0=" + cajaC0.left.toFixed(1) + "+" + cajaC0.width.toFixed(1) +
       "|centro200=" + cajaC2.left.toFixed(1) + "+" + cajaC2.width.toFixed(1));
comp.time = 0;
app.endUndoGroup();
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
