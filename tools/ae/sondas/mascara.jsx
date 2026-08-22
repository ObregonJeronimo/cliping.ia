// LAS MASCARAS DE AFTER EFFECTS, medidas.
//
// POR QUE. `exportar.jsx:354` rechaza CUALQUIER mascara, entera. Eso deja al motor sin la unica forma
// de revelar algo que no sea un rectangulo — y la gramatica del genero, medida sobre ocho avisos, dice
// que la transicion es SIEMPRE un objeto que ya estaba en escena y que 0 de 8 usan cortinilla generica.
// Sin mascaras no hay revelado con forma, ni trazo que se dibuja, ni texto recortado por una figura.
//
// LO QUE SE MIDE, en orden de cuanto decide:
//
//   A  ¿`sourceRectAtTime` REFLEJA LAS MASCARAS? Es la pregunta mas valiosa de todas. Si la respuesta
//      es si, la compuerta que compara AE contra el motor sale gratis: la misma que se acaba de
//      construir para los animadores de texto. Si es no, hay que inventar otro canal de verificacion.
//   B  la estructura del grupo y los matchName, que no se escriben de memoria
//   C  la clase Shape: en que coordenadas estan los vertices y si las tangentes son RELATIVAS al
//      vertice o absolutas. Errar esto dibuja cualquier cosa y no da error.
//   D  el enum de los modos, preguntado y no recordado
//   E  si un trazado animado se puede leer en un tiempo dado
//   F  calado, expansion, opacidad e invertida: que le hacen a la caja
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/mascara.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/mascara.jsx

var RUTA = "C:/ae-probe/mascara.txt";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (e) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
function lista(v) {
  if (v === null || v === undefined) { return ""; }
  if (typeof v.length === "number" && typeof v !== "string") { return v.join(";"); }
  return "" + v;
}
function pares(arr) {
  if (!arr) { return "-"; }
  var s = "", i;
  for (i = 0; i < arr.length; i++) {
    s = s + "(" + arr[i][0].toFixed(2) + "," + arr[i][1].toFixed(2) + ")";
  }
  return s;
}
function caja(capa, t) {
  var r = capa.sourceRectAtTime(t, false);
  return r.left.toFixed(2) + ";" + r.top.toFixed(2) + ";" + r.width.toFixed(2) + ";" + r.height.toFixed(2);
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("MASCARA");
var NOMBRE = "SONDA-MASCARA", W = 400, H = 300;
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, 1920, 1080, 1, 3, 30);

// UN SOLIDO DE 400x300: sus coordenadas de capa van de (0,0) a (400,300), asi que cualquier vertice
// que devuelva AE se puede leer contra esos numeros y saber en que espacio esta.
var solido = comp.layers.addSolid([1, 1, 1], "lienzo", W, H, 1);
solido.property("ADBE Transform Group").property("ADBE Position").setValue([960, 540]);
anotar("SOLIDO|" + W + "x" + H + "|caja sin mascara=" + caja(solido, 0));

// ---------------------------------------------------------------- B · la estructura
var parade = solido.property("ADBE Mask Parade");
anotar("PARADE|" + texto(parade.matchName) + "|" + texto(parade.numProperties));

var m1 = parade.addProperty("ADBE Mask Atom");
var k, estructura = "";
for (k = 1; k <= m1.numProperties; k++) {
  estructura = estructura + m1.property(k).matchName + ";";
}
anotar("ATOMO|" + m1.matchName + "|" + estructura);
// los atributos que NO son propiedades hijas sino del objeto
anotar("ATRIB|maskMode=" + texto(m1.maskMode) + "|inverted=" + texto(m1.inverted) +
       "|locked=" + texto(m1.locked) + "|name=" + texto(m1.name) +
       "|rotoBezier=" + texto(m1.rotoBezier) + "|maskMotionBlur=" + texto(m1.maskMotionBlur));

// ---------------------------------------------------------------- D · el enum de modos
anotar("ENUM_MODOS|NONE=" + MaskMode.NONE + "|ADD=" + MaskMode.ADD + "|SUBTRACT=" + MaskMode.SUBTRACT +
       "|INTERSECT=" + MaskMode.INTERSECT + "|LIGHTEN=" + MaskMode.LIGHTEN +
       "|DARKEN=" + MaskMode.DARKEN + "|DIFFERENCE=" + MaskMode.DIFFERENCE);

// ---------------------------------------------------------------- C · la clase Shape
// Un TRIANGULO con tangentes explicitas en un solo vertice: si las tangentes vuelven con valores del
// orden de las decenas son RELATIVAS al vertice; si vuelven del orden de las coordenadas, absolutas.
var trazado = m1.property("ADBE Mask Shape");
var s = new Shape();
s.vertices = [[50, 40], [340, 40], [200, 250]];
s.inTangents = [[0, 0], [-60, 0], [0, 0]];
s.outTangents = [[0, 0], [60, 0], [0, 0]];
s.closed = true;
trazado.setValue(s);

var leido = trazado.value;
anotar("SHAPE|closed=" + texto(leido.closed) + "|vertices=" + pares(leido.vertices));
anotar("SHAPE_TANG|in=" + pares(leido.inTangents) + "|out=" + pares(leido.outTangents));
// que campos trae de verdad, sin suponer
var campos = "", cs = ["vertices", "inTangents", "outTangents", "closed", "featherSegLocs",
                       "featherRelSegLocs", "featherRadii", "featherInterps", "featherTensions",
                       "featherTypes", "featherRelCornerAngles"];
for (k = 0; k < cs.length; k++) {
  var v = "no existe";
  try { v = (leido[cs[k]] === undefined) ? "undefined" : ("" + lista(leido[cs[k]])).substring(0, 40); }
  catch (exC) { v = "ERR"; }
  campos = campos + cs[k] + "=" + v + " | ";
}
anotar("SHAPE_CAMPOS|" + campos);

// ---------------------------------------------------------------- A · ¿la caja refleja la mascara?
// ESTA ES LA PREGUNTA QUE DECIDE SI HAY COMPUERTA GRATIS. El triangulo cubre de x=50 a x=340 y de
// y=40 a y=250; si `sourceRectAtTime` lo refleja, la caja tiene que encogerse a eso.
anotar("A_CAJA_CON_MASCARA|modo=ADD|" + caja(solido, 0));
m1.maskMode = MaskMode.NONE;
anotar("A_CAJA_MODO_NONE|" + caja(solido, 0));
m1.maskMode = MaskMode.ADD;
m1.inverted = true;
anotar("A_CAJA_INVERTIDA|" + caja(solido, 0));
m1.inverted = false;

// ---------------------------------------------------------------- F · calado, expansion, opacidad
var lista2 = [["ADBE Mask Feather", [30, 30]], ["ADBE Mask Offset", 25], ["ADBE Mask Opacity", 50]];
for (k = 0; k < lista2.length; k++) {
  var prop = null;
  try { prop = m1.property(lista2[k][0]); } catch (exF) { prop = null; }
  if (prop === null) { anotar("F|" + lista2[k][0] + "|NO EXISTE"); continue; }
  var antes = caja(solido, 0);
  prop.setValue(lista2[k][1]);
  anotar("F|" + lista2[k][0] + "=" + lista(lista2[k][1]) + "|antes=" + antes + "|despues=" + caja(solido, 0));
  // se deja como estaba para que la siguiente medicion no arrastre
  prop.setValue(lista2[k][0] === "ADBE Mask Feather" ? [0, 0] : (lista2[k][0] === "ADBE Mask Offset" ? 0 : 100));
}

// ---------------------------------------------------------------- E · un trazado ANIMADO
var s2 = new Shape();
s2.vertices = [[100, 80], [300, 80], [300, 220], [100, 220]];
s2.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
s2.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
s2.closed = true;
trazado.setValueAtTime(0, s);
trazado.setValueAtTime(1, s2);
anotar("E_ANIMADO|claves=" + trazado.numKeys + "|puedeAnimarse=" + texto(trazado.canVaryOverTime));
var tt, muestras = [0, 0.25, 0.5, 0.75, 1];
for (k = 0; k < muestras.length; k++) {
  tt = muestras[k];
  var vv = null;
  try { vv = trazado.valueAtTime(tt, false); } catch (exV) { vv = null; }
  if (vv === null) { anotar("E_EN|" + tt + "|NO SE PUDO LEER"); continue; }
  anotar("E_EN|" + tt + "|n=" + vv.vertices.length + "|" + pares(vv.vertices) + "|caja=" + caja(solido, tt));
}

// ---------------------------------------------------------------- morphing con distinta cantidad
var s3 = new Shape();
s3.vertices = [[150, 100], [250, 100], [250, 200], [150, 200], [200, 260], [120, 160]];
s3.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
s3.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
s3.closed = true;
trazado.setValueAtTime(2, s3);
var vm = trazado.valueAtTime(1.5, false);
anotar("MORPH|de 4 vertices a 6|en el medio n=" + vm.vertices.length + "|" + pares(vm.vertices));

// ---------------------------------------------------------------- varias mascaras
var m2 = parade.addProperty("ADBE Mask Atom");
var s4 = new Shape();
s4.vertices = [[180, 60], [380, 60], [380, 260], [180, 260]];
s4.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
s4.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
s4.closed = true;
m2.property("ADBE Mask Shape").setValue(s4);
var modos = [MaskMode.ADD, MaskMode.SUBTRACT, MaskMode.INTERSECT, MaskMode.DARKEN, MaskMode.DIFFERENCE];
var nm = ["ADD", "SUBTRACT", "INTERSECT", "DARKEN", "DIFFERENCE"];
for (k = 0; k < modos.length; k++) {
  m2.maskMode = modos[k];
  anotar("VARIAS|segunda en " + nm[k] + "|caja=" + caja(solido, 2.5));
}

anotar("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
