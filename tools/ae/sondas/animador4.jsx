// QUE PASA FUERA DEL RANGO, forma por forma. Es el ultimo agujero del nucleo del selector.
//
// POR QUE NO SE PUEDE DEDUCIR. Para la rampa arriba ya esta medido y es CONTRAINTUITIVO: antes del
// inicio el factor es 0 y pasando el final es 1 — o sea que la rampa no "termina", se queda arriba.
// Si uno lo dedujera diria 0 en los dos lados y la mitad de la frase quedaria sin animar.
//
// Para el triangulo, la redonda y la suave la pregunta se repite y la respuesta puede ser distinta en
// cada una: son curvas que vuelven a cero en el borde derecho, asi que "seguir con el ultimo valor" y
// "cortar a cero" dan LO MISMO en el borde y cosas distintas mas alla. Con un rango parcial y
// caracteres a los dos lados se ve de una.
//
// Se mide con el mismo instrumento: interletra + un segundo selector por indice en modo interseccion.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/animador4.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/animador4.jsx

var RUTA = "C:/ae-probe/animador4.txt";
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
app.beginUndoGroup("ANIMADOR4");
var NOMBRE = "SONDA-ANIMADOR4", N = 20, INTER = 100;
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, 1920, 1080, 1, 2, 30);

var cadena = "", q;
for (q = 0; q < N; q++) { cadena = cadena + "H"; }
var capa = comp.layers.addText(cadena);
var td = capa.property("ADBE Text Properties").property("ADBE Text Document");
var d = td.value;
d.fontSize = 30;
try { d.font = "SegoeUI"; } catch (eF) {}
td.setValue(d);
var BASE = capa.sourceRectAtTime(0, false).width;
function ancho() { return capa.sourceRectAtTime(0, false).width - BASE; }

var anims = capa.property("ADBE Text Properties").property("ADBE Text Animators");
var an = anims.addProperty("ADBE Text Animator");
var sels = an.property("ADBE Text Selectors");
sels.addProperty("ADBE Text Selector");
an.property("ADBE Text Animator Properties").addProperty("ADBE Text Tracking Amount").setValue(INTER);

function selDe(i) { return sels.property(i); }
function avDe(i) { return selDe(i).property("ADBE Text Range Advanced"); }
function uni(i, v) { avDe(i).property("ADBE Text Range Units").setValue(v); }
function forma(i, v) { avDe(i).property("ADBE Text Range Shape").setValue(v); }
function modo(i, v) { avDe(i).property("ADBE Text Selector Mode").setValue(v); }
function porciento(i, a, b, off) {
  selDe(i).property("ADBE Text Percent Start").setValue(a);
  selDe(i).property("ADBE Text Percent End").setValue(b);
  selDe(i).property("ADBE Text Percent Offset").setValue(off);
}
function indice(i, a, b, off) {
  selDe(i).property("ADBE Text Index Start").setValue(a);
  selDe(i).property("ADBE Text Index End").setValue(b);
  selDe(i).property("ADBE Text Index Offset").setValue(off);
}

uni(1, 2); forma(1, 1);
var pesos = [], c;
for (c = 0; c < N; c++) { indice(1, c, c + 1, 0); pesos[c] = ancho(); }

indice(1, 0, N, 0);
sels.addProperty("ADBE Text Selector");
uni(2, 2); forma(2, 1); modo(2, 3);
function factores() {
  var i, s = "";
  for (i = 0; i < N; i++) {
    indice(2, i, i + 1, 0);
    s = s + (ancho() / pesos[i]).toFixed(5) + ";";
  }
  return s;
}

// EL RANGO VA DEL 40 AL 60 POR CIENTO: quedan ocho caracteres antes y ocho despues, que es donde vive
// la respuesta. Con veinte caracteres, p va de 0,025 a 0,975 de a 0,05.
uni(1, 1);
var f;
for (f = 1; f <= 6; f++) {
  var ok = "si";
  try { forma(1, f); } catch (eS) { ok = "FALLO"; }
  if (ok !== "si") { anotar("AFUERA|" + f + "|FALLO"); continue; }
  porciento(1, 40, 60, 0);
  anotar("AFUERA|" + f + "|" + factores());
}

// y el caso simetrico, con el rango pegado al principio, para separar "antes del inicio" de
// "el rango empieza en cero y no hay nada antes"
for (f = 1; f <= 6; f++) {
  var ok2 = "si";
  try { forma(1, f); } catch (eS2) { ok2 = "FALLO"; }
  if (ok2 !== "si") { continue; }
  porciento(1, 60, 100, 0);
  anotar("FINAL|" + f + "|" + factores());
}

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
