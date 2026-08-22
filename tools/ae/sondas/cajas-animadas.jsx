// LA CAJA DE TINTA DE CADA CAPA CON ANIMADOR, CUADRO A CUADRO, MEDIDA POR AE.
//
// POR QUE. El motor ahora dibuja los animadores de texto caracter por caracter, con la cuenta del
// selector verificada contra AE. Pero verificar el FACTOR no verifica la DISPOSICION: el motor coloca
// las letras con las metricas de fuente del navegador y AE con las suyas, y esas dos no tienen por que
// coincidir. Lo unico que cierra el circulo es comparar la caja que sale de cada lado, en los mismos
// instantes.
//
// `sourceRectAtTime(t, false)` devuelve la caja AJUSTADA A LA TINTA con los animadores ya aplicados —
// medido en las sondas anteriores, es lo que hace posible todo esto sin renderizar.
//
// Lee la composicion que diga C:/ae-probe/exportar-comp.txt, o la activa. Los cuadros se piden por
// C:/ae-probe/cajas-cuadros.txt (lista separada por comas); si no existe, barre de a diez.
//
// USO
//   printf 'SONDA-ANIM6' > C:/ae-probe/exportar-comp.txt
//   printf '0,12,24,36,48,60,72,84' > C:/ae-probe/cajas-cuadros.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/cajas-animadas.jsx

var RUTA = "C:/ae-probe/cajas-animadas.txt";
var PEDIDO = "C:/ae-probe/exportar-comp.txt";
var CUADROS = "C:/ae-probe/cajas-cuadros.txt";

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
var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
var comp = null;
var nombre = leerArchivo(PEDIDO);
if (nombre !== null) {
  var q;
  for (q = 1; q <= app.project.numItems; q++) {
    var it = app.project.item(q);
    if (it instanceof CompItem && it.name === nombre) { comp = it; break; }
  }
}
if (comp === null && app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; }
if (comp === null) { throw new Error("no hay composicion"); }
anotar("COMP|" + comp.name + "|" + comp.frameRate + "|" + Math.round(comp.duration * comp.frameRate));

var lista = leerArchivo(CUADROS);
var cuadros = [], i;
if (lista !== null && lista !== "") {
  var partes = lista.split(",");
  for (i = 0; i < partes.length; i++) {
    var v = parseInt(partes[i], 10);
    if (!isNaN(v)) { cuadros[cuadros.length] = v; }
  }
} else {
  var total = Math.round(comp.duration * comp.frameRate);
  for (i = 0; i < total; i = i + 10) { cuadros[cuadros.length] = i; }
}

// QUE CAPAS SE MIDEN: las de texto que tengan al menos un animador. Se dice cuales son, porque una
// compuerta que no encuentra nada y sale en verde es peor que no tenerla.
var conAnim = [], L;
for (L = 1; L <= comp.numLayers; L++) {
  var capa = comp.layer(L);
  var anims = null;
  try { anims = capa.property("ADBE Text Properties").property("ADBE Text Animators"); } catch (exA) { anims = null; }
  if (anims !== null && anims.numProperties > 0) {
    conAnim[conAnim.length] = L;
    anotar("CAPA|" + L + "|" + capa.name + "|animadores=" + anims.numProperties);
  }
}
if (conAnim.length === 0) { anotar("VACIO|la composicion no tiene ninguna capa de texto con animador"); }

var c, k;
for (c = 0; c < cuadros.length; c++) {
  var t = cuadros[c] / comp.frameRate;
  for (k = 0; k < conAnim.length; k++) {
    var cap = comp.layer(conAnim[k]);
    var r = null;
    try { r = cap.sourceRectAtTime(t, false); } catch (exR) { r = null; }
    if (r === null) { anotar("FALLO_CAJA|" + conAnim[k] + "|" + cuadros[c]); continue; }
    anotar("CAJA|" + conAnim[k] + "|" + cuadros[c] +
           "|" + r.left.toFixed(4) + "|" + r.top.toFixed(4) +
           "|" + r.width.toFixed(4) + "|" + r.height.toFixed(4));
  }
}
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
