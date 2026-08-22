// UNA COMPOSICION CON ANIMADORES DE TEXTO DE VERDAD, para probar el exportador y el motor.
//
// Tres capas, cada una con un animador distinto, elegidas porque son las tres cosas que el genero usa:
//
//   A  TECLEO      cuadrada, suavidad 0, el final del rango animado de 0 a 100. Corte seco por letra.
//   B  OLA         rampa arriba con ease, desplazamiento animado: cada letra sube y baja escalonada.
//   C  DISPERSION  triangulo, posicion + rotacion + opacidad, el rango barriendo la palabra.
//
// Y una CUARTA capa que usa a proposito lo que NO se soporta —orden aleatorio— para comprobar que el
// exportador la rechaza POR NOMBRE en vez de exportarla a medias. Un exportador que se saltea lo que no
// entiende produce un documento que se reproduce PARECIDO, y "parecido" no se puede discutir.
//
// EL DESPLAZAMIENTO VA DE -100 A 100 Y AE LO HACE CUMPLIR. La primera version pedia 115 para que la
// ola terminara de salir por la derecha, y AE corto con "el valor 115 esta fuera del rango entre -100 y
// 100" — a mitad de la construccion, dejando la composicion con dos capas de cuatro. Para barrer mas
// alla del final hay que mover el INICIO y el FIN, no el desplazamiento.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/animador6.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/animador6.jsx
//   printf 'SONDA-ANIM6' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx

var RUTA = "C:/ae-probe/animador6.txt";
var FPS = 30, CUADROS = 90, ANCHO = 1920, ALTO = 1080;

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
app.beginUndoGroup("ANIM6");
var NOMBRE = "SONDA-ANIM6";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, CUADROS / FPS, FPS);
comp.bgColor = [0, 0, 0];

function tr(c) { return c.property("ADBE Transform Group"); }
function rotulo(cadena, y, tam) {
  var t = comp.layers.addText(cadena);
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = tam;
  d.fillColor = [0.945, 0.953, 0.969];
  d.applyFill = true;
  d.justification = ParagraphJustification.CENTER_JUSTIFY;
  try { d.font = "SegoeUI"; } catch (exF) {}
  p.setValue(d);
  tr(t).property("ADBE Position").setValue([ANCHO / 2, y]);
  return t;
}
// nada de cachear propiedades del selector: cambiar las unidades invalida las referencias
function animadorDe(capa) {
  return capa.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
}
function selectorDe(an) { return an.property("ADBE Text Selectors").addProperty("ADBE Text Selector"); }
function avDe(an, s) { return an.property("ADBE Text Selectors").property(s).property("ADBE Text Range Advanced"); }
function selDe(an, s) { return an.property("ADBE Text Selectors").property(s); }
function propsDe(an) { return an.property("ADBE Text Animator Properties"); }

// ================================================================ A · EL TECLEO
var A = rotulo("Escribiendo en vivo", 300, 92);
A.name = "tecleo";
var anA = animadorDe(A);
selectorDe(anA);
propsDe(anA).addProperty("ADBE Text Opacity").setValue(0);
// SUAVIDAD 0: el corte seco NO es lo que sale de fabrica. Por defecto vale 100 y cada letra se cubre a
// lo largo de un paso entero, o sea una cortina en vez de un tecleo.
avDe(anA, 1).property("ADBE Text Selector Smoothness").setValue(0);
avDe(anA, 1).property("ADBE Text Range Units").setValue(1);
selDe(anA, 1).property("ADBE Text Percent Start").setValue(0);
// el rango arranca cubriendo TODO (opacidad 0 en todas) y se retira: las letras van quedando
var finA = selDe(anA, 1).property("ADBE Text Percent End");
finA.setValueAtTime(6 / FPS, 100);
finA.setValueAtTime(66 / FPS, 0);
finA.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
finA.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
anotar("A|tecleo|cuadrada suavidad 0, fin animado 100->0 entre 6 y 66");

// ================================================================ B · LA OLA
var B = rotulo("una ola de letras", 560, 92);
B.name = "ola";
var anB = animadorDe(B);
selectorDe(anB);
propsDe(anB).addProperty("ADBE Text Position 3D").setValue([0, -70, 0]);
avDe(anB, 1).property("ADBE Text Range Shape").setValue(4);        // triangulo
avDe(anB, 1).property("ADBE Text Levels Max Ease").setValue(60);
avDe(anB, 1).property("ADBE Text Levels Min Ease").setValue(60);
avDe(anB, 1).property("ADBE Text Range Units").setValue(1);
selDe(anB, 1).property("ADBE Text Percent Start").setValue(0);
selDe(anB, 1).property("ADBE Text Percent End").setValue(28);
var offB = selDe(anB, 1).property("ADBE Text Percent Offset");
offB.setValueAtTime(0 / FPS, -30);
offB.setValueAtTime(72 / FPS, 100);
offB.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
offB.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
anotar("B|ola|triangulo ease 60/60, ventana 0-28 con desplazamiento -30->100");

// ================================================================ C · LA DISPERSION
var C = rotulo("y se dispersa", 800, 92);
C.name = "dispersion";
var anC = animadorDe(C);
selectorDe(anC);
propsDe(anC).addProperty("ADBE Text Position 3D").setValue([0, 120, 0]);
propsDe(anC).addProperty("ADBE Text Rotation").setValue(24);
propsDe(anC).addProperty("ADBE Text Opacity").setValue(0);
avDe(anC, 1).property("ADBE Text Range Shape").setValue(2);        // rampa arriba
avDe(anC, 1).property("ADBE Text Range Units").setValue(1);
selDe(anC, 1).property("ADBE Text Percent Start").setValue(0);
var finC = selDe(anC, 1).property("ADBE Text Percent End");
finC.setValueAtTime(20 / FPS, 0);
finC.setValueAtTime(84 / FPS, 100);
finC.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
finC.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
anotar("C|dispersion|rampa arriba, posicion + rotacion + opacidad, fin 0->100");

// ================================================================ D · LO QUE HAY QUE RECHAZAR
var D = rotulo("esta no viaja", 980, 54);
D.name = "rechazable";
var anD = animadorDe(D);
selectorDe(anD);
propsDe(anD).addProperty("ADBE Text Opacity").setValue(0);
avDe(anD, 1).property("ADBE Text Randomize Order").setValue(1);
avDe(anD, 1).property("ADBE Text Random Seed").setValue(7);
// y una propiedad que el motor no aplica, para ver el segundo rechazo
propsDe(anD).addProperty("ADBE Text Blur").setValue([12, 0]);
anotar("D|rechazable|orden aleatorio semilla 7 + desenfoque por caracter — los dos se tienen que rechazar");

// UNA CAMARA, Y NO ES DECORACION: `capturar-comp.py` elige `comp.html` (2D) cuando no hay camara ni
// capas 3D, y ese reproductor NO aplica animadores. Sin camara, esta sonda mide el reproductor
// equivocado y da un verde falso. Centrada a mano, que addCamera no la deja donde uno cree.
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
cam.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -1900]);

comp.openInViewer();
comp.time = 0;
app.endUndoGroup();
anotar("CAPAS|" + comp.numLayers);
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
