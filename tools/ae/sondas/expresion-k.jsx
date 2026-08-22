// LAS EXPRESIONES, HORNEADAS: la prueba de punta a punta.
//
// Hasta hoy el exportador informaba NOSOP ante cualquier expresion y el documento salia incompleto. O
// sea que la mitad del oficio de After Effects —el rebote inercial, el escalonado por caracter, el
// seguimiento con retardo— no llegaba al motor. Ahora se MUESTREA con `valueAtTime`, igual que los
// trazados de mascara, y por el mismo motivo: AE devuelve el valor ya evaluado, asi que no hace falta
// interpretar el lenguaje del otro lado.
//
// ESTA SONDA USA LAS EXPRESIONES REALES DEL PROYECTO DEL USUARIO, no versiones de manual:
//
//   A · REBOTE INERCIAL tras la ultima clave. Lee la VELOCIDAD con la que la propiedad llegaba y le
//       suma un seno amortiguado. Es lo que hace que un objeto se sienta con masa en vez de frenar en
//       seco, y es lo que ninguna de las ocho curvas C1..C8 puede hacer: una curva Bezier termina con
//       velocidad cero y no sobrepasa.
//
//   B · ESCALONADO POR CARACTER con `textIndex`. Cada letra arranca 0,05 s despues que la anterior y
//       hace su propio coseno amortiguado. Un animador con selector da un barrido; esto da una CASCADA
//       de rebotes independientes, que es otra cosa.
//
//   C · SEGUIMIENTO CON RETARDO: `valueAtTime(time - 0.1)` sobre otra propiedad. Un segundo elemento
//       que copia al primero con un decimo de segundo de atraso — el secundario de animacion, gratis.
//
// LO QUE SE MIDE: que aparezcan las lineas HORNEADO, que EXPRERROR sea chico (el error de interpolar
// linealmente entre muestras de un cuadro) y que el motor dibuje lo mismo que AE.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/expresion-k.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/expresion-k.jsx
//   printf 'SONDA-EXPRESION' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/expresion-k.json
//   node tools/ae/cuadro-ae.mjs SONDA-EXPRESION 0,18,26,40
//   node tools/ae/mascara-check.mjs C:/ae-probe/expresion-k.json C:/ae-probe/ae-cuadros/SONDA-EXPRESION 0,18,26,40

var RUTA = "C:/ae-probe/expresion-k.txt";
var ANCHO = 1280, ALTO = 720, FPS = 30, CUADROS = 60;

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
// EL SALTO DE LINEA NO SE PUEDE ESCRIBIR CRUDO DENTRO DE UNA CADENA DE ExtendScript: es un error de
// analisis, no un error en tiempo de ejecucion, asi que el archivo entero no corre. Las expresiones son
// multilinea por naturaleza, asi que se arman uniendo un arreglo.
var NL = String.fromCharCode(10);
function lineas(arr) { return arr.join(NL); }

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("EXPRESION-K");

var NOMBRE = "SONDA-EXPRESION";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, CUADROS / FPS, FPS);
comp.motionBlur = true;
comp.shutterAngle = 180;
comp.shutterPhase = -90;
comp.motionBlurSamplesPerFrame = 4;
comp.bgColor = [0.06, 0.07, 0.09];
comp.openInViewer();

function tr(c) { return c.property("ADBE Transform Group"); }
function pos(c) { return tr(c).property("ADBE Position"); }
function esc(c) { return tr(c).property("ADBE Scale"); }

// ---------------------------------------------------------------- A · el rebote inercial
//
// Los numeros de calibracion: amp 0,06 (cuanto sobrepasa), freq 1,8 (periodo 16,7 cuadros a 30 fps) y
// decay 5 (cuanto tarda en morirse). Salen del proyecto del usuario, no de un tutorial.
var REBOTE = lineas([
  "n = 0;",
  "if (numKeys > 0) {",
  "  n = nearestKey(time).index;",
  "  if (key(n).time > time) { n--; }",
  "}",
  "t = (n == 0) ? 0 : time - key(n).time;",
  "if (n > 0) {",
  "  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);",
  "  amp = 0.06; freq = 1.8; decay = 5;",
  "  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);",
  "} else { value; }"
]);

var caja = comp.layers.addSolid([0.24, 0.55, 1.0], "A-rebote", 200, 200, 1);
var pA = pos(caja);
pA.setValueAtTime(0 / FPS, [260, 300]);
pA.setValueAtTime(14 / FPS, [900, 300]);
pA.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
pA.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
pA.expression = REBOTE;

// una capa de control SIN expresion, con las mismas claves: la diferencia entre las dos ES el rebote
var control = comp.layers.addSolid([0.35, 0.35, 0.4], "A-control-sin-expresion", 200, 200, 1);
var pC = pos(control);
pC.setValueAtTime(0 / FPS, [260, 560]);
pC.setValueAtTime(14 / FPS, [900, 560]);
pC.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
pC.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);

// ---------------------------------------------------------------- C · el seguimiento con retardo
// Copia la posicion de otra capa un decimo de segundo tarde. El secundario de animacion sin animarlo.
var sombra = comp.layers.addSolid([0.16, 0.30, 0.55], "C-retardo", 140, 140, 1);
pos(sombra).expression = lineas([
  "thisComp.layer(\"A-rebote\").transform.position.valueAtTime(time - 0.1) + [0, 0]"
]);

// ---------------------------------------------------------------- B · el escalonado por caracter
//
// Va sobre el NIVEL de un animador de texto, no sobre una propiedad de la capa: `textIndex` solo existe
// ahi. El animador aporta la propiedad (escala) y la expresion decide cuanto de esa propiedad recibe
// cada caracter, en funcion de su indice.
var titulo = comp.layers.addText("SUAVE");
var docT = titulo.property("ADBE Text Properties").property("ADBE Text Document");
var dv = docT.value;
dv.fontSize = 120; dv.fillColor = [1, 1, 1]; dv.applyFill = true;
dv.justification = ParagraphJustification.CENTER_JUSTIFY;
try { dv.font = "CenturyGothic"; } catch (exF) {}
docT.setValue(dv);
pos(titulo).setValue([640, 190]);

// EL SELECTOR DE EXPRESION ES UN TIPO DE SELECTOR APARTE, y esto lo aprendi leyendo el proyecto del
// usuario en vez de adivinando. Hay tres familias: rango ("ADBE Text Selector"), ondulacion y
// EXPRESION ("ADBE Text Expressible Selector"). Un selector de rango se maneja con inicio/fin/nivel y
// da un BARRIDO; el de expresion no tiene rango: tiene una sola propiedad, "ADBE Text Expressible
// Amount", que se evalua UNA VEZ POR CARACTER con `textIndex` disponible. Por eso da una CASCADA de
// rebotes independientes y no un barrido — son dos animaciones distintas, no dos formas de la misma.
//
// Dos nombres que probe antes y NO existen: "ADBE Text Scale" (la escala del animador se llama de otra
// forma) y "ADBE Text Selector Max Amount". Los dos matan el script entero, porque `addProperty` con un
// matchName invalido tira y `property()` devuelve null.
var anim = titulo.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
anim.property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D").setValue([0, -90, 0]);
var sel = anim.property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
sel.property("ADBE Text Expressible Amount").expression = lineas([
  "delay = 0.05;",
  "t = time - inPoint - textIndex*delay;",
  "if (t < 0) value",
  "else {",
  "  a = 150;",
  "  f = 2.1;",
  "  d = 8;",
  "  s = a*Math.cos(f*t*2*Math.PI)/Math.exp(d*t);",
  "  s;",
  "}"
]);

comp.time = 0;
anotar("SONDA|" + NOMBRE + "|" + ANCHO + "x" + ALTO + "|" + CUADROS + " cuadros");
anotar("CAPAS|" + comp.numLayers);
anotar("EXPRESIONES|rebote inercial (posicion) · seguimiento con retardo · escalonado por caracter");
anotar("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
