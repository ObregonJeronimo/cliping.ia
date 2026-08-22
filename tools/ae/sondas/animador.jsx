// MEDIR EL ANIMADOR DE TEXTO DE AE, CARACTER POR CARACTER, SIN RENDERIZAR UN SOLO CUADRO.
//
// POR QUE. La escritura por caracter aparece en 8 de 8 referencias del genero y hoy se falsea con UNA
// CAPA POR CARACTER: quince capas escritas a mano para una frase. El animador nativo lo hace con tres
// lineas, pero el exportador lo rechaza entero (exportar.jsx:695) porque el motor no sabe evaluarlo.
// Para que lo sepa hace falta LA FUNCION DEL SELECTOR: dado el indice de un caracter, cuanto le toca
// de la propiedad animada. Esa funcion esta documentada en prosa y en ningun lado en numeros.
//
// EL TRUCO QUE HACE POSIBLE MEDIRLA. AE no expone la caja de cada caracter (doc.value.boxText es un
// booleano, medido en render3d-prueba.jsx). Pero si el animador anima la INTERLETRA, el ancho total de
// la capa crece con la SUMA de los factores de todos los caracteres:
//
//     ancho(config) - ancho(sin animador) = interletra * suma de factores
//
// y si ademas el selector se restringe a UN SOLO caracter por indice, esa suma ES el factor de ese
// caracter. O sea: sourceRectAtTime —una llamada, sin dibujar nada— alcanza para leer el factor de
// cada caracter. Es exacto y cuesta milisegundos.
//
// QUE SE MIDE
//   A  la estructura real de ADBE Text Range Advanced (los matchName no los se de memoria)
//   B  el factor de cada caracter con el selector CUADRADO, que es el caso base
//   C  el acumulado por rango con cada FORMA de selector
//   D  que le hace Ease High / Ease Low a esa curva
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/animador.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/animador.jsx

var RUTA = "C:/ae-probe/animador.txt";
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
app.beginUndoGroup("ANIMADOR");
var NOMBRE = "SONDA-ANIMADOR", N = 10, INTER = 100;
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, 1920, 1080, 1, 2, 30);

// diez caracteres iguales: cualquier diferencia de ancho viene del animador y no de la tipografia
var cadena = "", q;
for (q = 0; q < N; q++) { cadena = cadena + "H"; }
var capa = comp.layers.addText(cadena);
var td = capa.property("ADBE Text Properties").property("ADBE Text Document");
var d = td.value;
d.fontSize = 80;
try { d.font = "SegoeUI"; } catch (eF) {}
td.setValue(d);

var BASE = capa.sourceRectAtTime(0, false).width;
anotar("BASE|caracteres=" + N + "|ancho=" + BASE.toFixed(4));

// ---------------------------------------------------------------- el animador de interletra
var anims = capa.property("ADBE Text Properties").property("ADBE Text Animators");
var an = anims.addProperty("ADBE Text Animator");
var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
var props = an.property("ADBE Text Animator Properties");
var tr = props.addProperty("ADBE Text Tracking Amount");
tr.setValue(INTER);

// A · la estructura del selector entero y de su grupo avanzado, que es donde vive la FORMA
var s, ls = "";
for (s = 1; s <= sel.numProperties; s++) {
  var sp = sel.property(s);
  var sv = "?";
  try { sv = texto(sp.value); } catch (e1) { sv = "<grupo>"; }
  ls = ls + sp.matchName + "=" + sv + ";";
}
anotar("SELECTOR|" + ls);

var av = null;
try { av = sel.property("ADBE Text Range Advanced"); } catch (e2) { av = null; }
if (av === null || av === undefined) { anotar("AVANZADO|no existe"); }
else {
  var k, la = "";
  for (k = 1; k <= av.numProperties; k++) {
    var pr = av.property(k);
    var vv = "?";
    try { vv = texto(pr.value); } catch (e3) { vv = "<grupo>"; }
    la = la + pr.matchName + "=" + vv + ";";
  }
  anotar("AVANZADO|" + la);
}

function anchoAhora() { return capa.sourceRectAtTime(0, false).width; }
// CON LAS UNIDADES EN INDICE, LAS PROPIEDADES DE PORCENTAJE QUEDAN OCULTAS Y setValue FALLA con
// "la propiedad o una propiedad primaria esta oculta". O sea que el selector tiene DOS juegos de
// propiedades excluyentes y solo uno esta vivo por vez. Es un dato exportable: el documento tiene que
// llevar las unidades, porque las otras tres no significan nada.
function ponerIndice(desde, hasta) {
  sel.property("ADBE Text Index Start").setValue(desde);
  sel.property("ADBE Text Index End").setValue(hasta);
  sel.property("ADBE Text Index Offset").setValue(0);
}
function ponerPorciento(desde, hasta) {
  sel.property("ADBE Text Percent Start").setValue(desde);
  sel.property("ADBE Text Percent End").setValue(hasta);
  sel.property("ADBE Text Percent Offset").setValue(0);
}

// LA INTERLETRA SE REPARTE ENTRE LOS HUECOS O ENTRE LOS CARACTERES: no se cual, asi que se calibra
// midiendo el caso conocido —todos seleccionados, factor 1— en vez de suponerlo.
var unidades = null;
try { unidades = av.property("ADBE Text Range Units"); } catch (e4) { unidades = null; }
if (unidades !== null) { try { unidades.setValue(2); } catch (e5) {} }   // 2 = indice (se confirma abajo)
anotar("UNIDADES|" + (unidades ? unidades.matchName + "=" + texto(unidades.value) : "no encontrada"));

ponerIndice(0, N);
var TODO = anchoAhora() - BASE;
anotar("CALIBRE|todos|delta=" + TODO.toFixed(4) +
       "|/N=" + (TODO / N).toFixed(4) + "|/(N-1)=" + (TODO / (N - 1)).toFixed(4));

// B · el factor de CADA caracter, aislandolo por indice
var c, fila = "";
for (c = 0; c < N; c++) {
  ponerIndice(c, c + 1);
  fila = fila + (anchoAhora() - BASE).toFixed(2) + ";";
}
anotar("CUADRADO|un caracter por vez|" + fila);

// C · las FORMAS. Con el rango creciendo de a un caracter, el acumulado dibuja la curva del selector.
var propForma = null;
// LA FORMA ES "ADBE Text Range Shape". Yo habia apuntado a "ADBE Text Range Type2", que es otra cosa:
// la BASE del selector (caracteres, caracteres sin espacios, palabras, lineas). Medido, no supuesto.
try { propForma = av.property("ADBE Text Range Shape"); } catch (e6) { propForma = null; }
if (propForma === null) { anotar("FORMAS|no se encontro la propiedad de forma"); }
else {
  anotar("FORMA_PROP|" + propForma.matchName + "|valor=" + texto(propForma.value));
  if (unidades !== null) { try { unidades.setValue(1); } catch (e8) {} }   // 1 = porcentaje
  var f;
  for (f = 1; f <= 6; f++) {
    var puesto = "si";
    try { propForma.setValue(f); } catch (e9) { puesto = "FALLO " + texto(e9); }
    if (puesto !== "si") { anotar("FORMA|" + f + "|" + puesto); continue; }
    var fila2 = "";
    for (c = 1; c <= N; c++) {
      ponerPorciento(0, c * 100 / N);
      fila2 = fila2 + (anchoAhora() - BASE).toFixed(2) + ";";
    }
    anotar("FORMA|" + f + "|acumulado|" + fila2);
  }
  try { propForma.setValue(1); } catch (e10) {}
}

// D · Ease High / Ease Low
var eh = null, el = null;
try { eh = av.property("ADBE Text Levels Max Ease"); } catch (e11) {}
try { el = av.property("ADBE Text Levels Min Ease"); } catch (e12) {}
anotar("EASE_PROPS|alto=" + (eh ? eh.matchName : "no encontrada") +
       "|bajo=" + (el ? el.matchName : "no encontrada"));
if (eh !== null && el !== null && propForma !== null) {
  try { propForma.setValue(2); } catch (e13) {}
  var pares = [[0, 0], [100, 0], [0, 100], [100, 100], [-100, 0]];
  var pi;
  for (pi = 0; pi < pares.length; pi++) {
    eh.setValue(pares[pi][0]);
    el.setValue(pares[pi][1]);
    var fila3 = "";
    for (c = 1; c <= N; c++) {
      ponerPorciento(0, c * 100 / N);
      fila3 = fila3 + (anchoAhora() - BASE).toFixed(2) + ";";
    }
    anotar("EASE|alto=" + pares[pi][0] + "|bajo=" + pares[pi][1] + "|" + fila3);
  }
}

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
