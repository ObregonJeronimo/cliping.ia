// ¿ALREDEDOR DE QUE PUNTO ESCALA Y ROTA CADA CARACTER?
//
// POR QUE HACE FALTA. Para dibujar el animador por caracter, el motor tiene que aplicar escala y
// rotacion a cada letra — y toda transformacion necesita un PIVOTE. Si lo pongo donde me parece, el
// resultado se ve "casi bien" y diverge de AE de una forma que no se puede señalar con el dedo, que es
// el modo de falla que este proyecto viene esquivando desde el primer dia.
//
// Los candidatos razonables son tres y dan resultados distintos:
//   · el origen del caracter sobre la linea de base (esquina inferior izquierda de su avance)
//   · el centro del avance sobre la linea de base
//   · el centro de la caja de tinta del caracter
//
// COMO SE MIDE SIN RENDERIZAR. Una capa de UN SOLO CARACTER, y un animador que lo escala al 200% con
// el selector cubriendolo entero. `sourceRectAtTime` devuelve la caja de tinta: si el pivote es el
// origen, la caja crece SOLO hacia la derecha y hacia arriba; si es el centro del avance, crece
// simetrica en X; si es el centro de la tinta, crece simetrica en las dos. Los tres se distinguen con
// dos numeros —el borde izquierdo y el superior— y no hay que dibujar nada.
//
// Se repite con rotacion 90 grados, que separa los mismos tres candidatos por otro camino: una letra
// rotada alrededor de su origen se va entera hacia un lado.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/animador8.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/animador8.jsx

var RUTA = "C:/ae-probe/animador8.txt";
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
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("ANIM8");
var NOMBRE = "SONDA-ANIM8";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, 1920, 1080, 1, 2, 30);

function caja(capa) {
  var r = capa.sourceRectAtTime(0, false);
  return r.left.toFixed(3) + ";" + r.top.toFixed(3) + ";" + r.width.toFixed(3) + ";" + r.height.toFixed(3);
}
function nuevaCapa(cadena, alineacion) {
  var t = comp.layers.addText(cadena);
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = 100;
  d.justification = alineacion;
  try { d.font = "SegoeUI"; } catch (exF) {}
  p.setValue(d);
  return t;
}
function animarCon(capa, matchName, valor) {
  var an = capa.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
  an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  an.property("ADBE Text Animator Properties").addProperty(matchName).setValue(valor);
  return an;
}

// ---------------------------------------------------------------- 1 · UN caracter, escala 200%
var A = nuevaCapa("H", ParagraphJustification.LEFT_JUSTIFY);
A.name = "un-caracter";
anotar("BASE_1|" + caja(A));
animarCon(A, "ADBE Text Scale 3D", [200, 200, 100]);
anotar("ESCALA200_1|" + caja(A));

// ---------------------------------------------------------------- 2 · UN caracter, rotacion 90
var B = nuevaCapa("H", ParagraphJustification.LEFT_JUSTIFY);
B.name = "rotado";
anotar("BASE_2|" + caja(B));
animarCon(B, "ADBE Text Rotation", 90);
anotar("ROT90_2|" + caja(B));

// ---------------------------------------------------------------- 3 · TRES caracteres, escala 200%
// con tres se ve si cada uno escala alrededor de SU punto o si escala el conjunto
var C = nuevaCapa("HHH", ParagraphJustification.LEFT_JUSTIFY);
C.name = "tres";
anotar("BASE_3|" + caja(C));
animarCon(C, "ADBE Text Scale 3D", [200, 200, 100]);
anotar("ESCALA200_3|" + caja(C));

// ---------------------------------------------------------------- 4 · el ancla del animador
// Si `ADBE Text Anchor Point 3D` corre el pivote, entonces el pivote por defecto es un punto conocido
// y esta propiedad lo desplaza. Se mueve 50 px a la derecha y se mira cuanto se corrio la caja.
var D = nuevaCapa("H", ParagraphJustification.LEFT_JUSTIFY);
D.name = "con-ancla";
anotar("BASE_4|" + caja(D));
var anD = animarCon(D, "ADBE Text Scale 3D", [200, 200, 100]);
anD.property("ADBE Text Animator Properties").addProperty("ADBE Text Anchor Point 3D").setValue([50, 0, 0]);
anotar("ESCALA200_ANCLA50_4|" + caja(D));

// ---------------------------------------------------------------- 5 · una letra con descendente
// "y" baja de la linea de base: separa "centro de la tinta" de "centro del avance sobre la base"
var E = nuevaCapa("y", ParagraphJustification.LEFT_JUSTIFY);
E.name = "descendente";
anotar("BASE_5|" + caja(E));
animarCon(E, "ADBE Text Scale 3D", [200, 200, 100]);
anotar("ESCALA200_5|" + caja(E));

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
