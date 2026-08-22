// TODOS LOS MODOS DE MASCARA, LA INVERSION Y LA EXPANSION — los casos que NO probe.
//
// POR QUE EXISTE. La sonda anterior (`mascara2.jsx`) ejercito SUMA, SUMA+RESTA y CALADO, y la compuerta
// de pixeles dio 0,007% contra AE. Eso probo lo que implemente, no lo que el motor va a encontrar: la
// aritmetica del alfa —que hace cada modo, con que se siembra el acumulador cuando el PRIMERO no es
// suma, la forma del calado, la expansion en una esquina— quedo apoyada en supuestos que ninguna sonda
// midio.
//
// Es el patron que este repo ya repitio tres veces: el matte modelado como prisma, el recorte que
// fallaba abierto, la compuerta escrita para el caso implementado. Escribir la prueba para el caso que
// uno programo y creer que probo la funcion.
//
// Una capa por caso, todas con la MISMA figura base y la misma segunda mascara, para que la unica
// variable sea el modo. Los cinco modos que faltaban, la inversion, la expansion positiva y la
// negativa, y el caso que mas me preocupa: que la PRIMERA mascara sea RESTAR.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/mascara3.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/mascara3.jsx
//   node tools/ae/cuadro-ae.mjs SONDA-MASCARA3 0

var RUTA = "C:/ae-probe/mascara3.txt";
var ANCHO = 1200, ALTO = 800, FPS = 30;

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (e) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
function forma(vs) {
  var s = new Shape(), z = [], i;
  for (i = 0; i < vs.length; i++) { z[i] = [0, 0]; }
  s.vertices = vs; s.inTangents = z; s.outTangents = z; s.closed = true;
  return s;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("MASCARA3");
var NOMBRE = "SONDA-MASCARA3";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, 1, FPS);
comp.bgColor = [0, 0, 0];

var W = 260, H = 170;
// la figura base: un rectangulo que ocupa casi toda la capa
var BASE = [[10, 10], [W - 10, 10], [W - 10, H - 10], [10, H - 10]];
// la segunda: un rombo que se solapa a medias, para que sumar, restar e intersecar den tres cosas
// bien distintas y la comparacion pueda distinguirlas
var ROMBO = [[W / 2, -20], [W + 20, H / 2], [W / 2, H + 20], [W / 2 - 90, H / 2]];

function caso(nombre, col, fil, modo2, invertir, expansion, soloUna, modo1) {
  var s = comp.layers.addSolid([0.36, 0.66, 1], nombre, W, H, 1);
  s.property("ADBE Transform Group").property("ADBE Position")
    .setValue([160 + col * 300, 120 + fil * 220]);
  var m1 = s.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
  m1.property("ADBE Mask Shape").setValue(forma(BASE));
  if (modo1 !== undefined) { m1.maskMode = modo1; }
  if (invertir) { m1.inverted = true; }
  if (expansion) { m1.property("ADBE Mask Offset").setValue(expansion); }
  if (!soloUna) {
    var m2 = s.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    m2.property("ADBE Mask Shape").setValue(forma(ROMBO));
    m2.maskMode = modo2;
  }
  anotar("CASO|" + nombre + "|col=" + col + " fil=" + fil);
  return s;
}

// fila 0 · los cinco modos que faltaban, sobre la segunda mascara
caso("m-suma", 0, 0, MaskMode.ADD, false, 0, false);
caso("m-intersecar", 1, 0, MaskMode.INTERSECT, false, 0, false);
caso("m-aclarar", 2, 0, MaskMode.LIGHTEN, false, 0, false);
caso("m-oscurecer", 3, 0, MaskMode.DARKEN, false, 0, false);

// fila 1 · diferencia, inversion, y la primera en RESTAR (el caso que mas me preocupa)
caso("m-diferencia", 0, 1, MaskMode.DIFFERENCE, false, 0, false);
caso("m-invertida", 1, 1, MaskMode.ADD, true, 0, true);
caso("m-primera-resta", 2, 1, MaskMode.ADD, false, 0, true, MaskMode.SUBTRACT);
caso("m-primera-inter", 3, 1, MaskMode.ADD, false, 0, true, MaskMode.INTERSECT);

// fila 2 · la expansion, que tampoco probe
caso("m-expande-20", 0, 2, MaskMode.ADD, false, 20, true);
caso("m-encoge-20", 1, 2, MaskMode.ADD, false, -20, true);
caso("m-expande-invertida", 2, 2, MaskMode.ADD, true, 15, true);
// y una con calado Y expansion a la vez, que es como se usan de verdad
var ce = caso("m-calado-y-expansion", 3, 2, MaskMode.ADD, false, 12, true);
ce.property("ADBE Mask Parade").property(1).property("ADBE Mask Feather").setValue([26, 26]);

var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
cam.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -1900]);

comp.openInViewer();
comp.time = 0;
anotar("CAPAS|" + comp.numLayers);
anotar("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
