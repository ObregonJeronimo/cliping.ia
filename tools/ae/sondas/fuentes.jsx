// QUE TIPOGRAFIAS PUEDE USAR UNA PIEZA, PREGUNTADO A AE EN VEZ DE SUPUESTO.
//
// La PIEZA-C usa Arial Black para todo lo que importa, y eso es una de las huellas que la skill manda
// evitar: no elegir tipografia es elegir la de siempre. Esta maquina tiene Bahnschrift (una grotesca
// tecnica con cuatro pesos y variantes condensadas), la familia Segoe UI completa y Cascadia Mono. Con
// eso alcanza para una jerarquia de verdad.
//
// PERO HAY UNA TRAMPA QUE HAY QUE MEDIR ANTES DE AUTORAR. El documento viaja con el nombre PostScript,
// y del otro lado `tipografia()` lo traduce a familia + peso de CSS. Bahnschrift es una fuente
// VARIABLE: sus variantes condensadas no son familias distintas sino un eje, y un traductor que solo
// entiende familia y peso va a pedirle al navegador la version normal. El texto saldria mas ancho que
// en AE, sin ningun error, y el defecto aparece recien comparando pixeles.
//
// Asi que primero se le pregunta a AE que nombres PostScript existen de verdad (`app.fonts`), y despues
// se arma una composicion con una linea por candidata para medir la desviacion contra el navegador.
// La que mida mal no se usa. No hay nada que arreglar del lado del motor: hay que elegir fuentes que
// viajen.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/fuentes.jsx
//   node tools/ae/pieza.mjs FUENTES --comparar --rapido

var RUTA = "C:/ae-probe/fuentes.txt";

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

app.beginUndoGroup("FUENTES");

// ---------------------------------------------------------------- 1. que hay, segun AE
// `app.fonts` existe desde AE 24. Se filtra por las familias que interesan para no volcar 211 fuentes.
var INTERES = ["Bahnschrift", "Segoe UI", "Cascadia", "Century Gothic", "Franklin Gothic", "Corbel", "Candara"];
var candidatas = [];

// LA ENUMERACION ES UN LUJO, NO EL EXPERIMENTO. `app.fonts.allFonts` existe pero no siempre entrega un
// arreglo indexable, y una sonda que se muere enumerando no llega a medir, que es para lo que se
// escribio. Cada acceso va envuelto y la parte 2 corre pase lo que pase.
var todas = null;
try { todas = app.fonts ? app.fonts.allFonts : null; } catch (exFo) { todas = null; }
anotar("ENUMERAR|" + (todas === null ? "no se pudo" : ("largo=" + texto(todas.length))));

// SE LE PREGUNTA AL OBJETO COMO SE LLAMAN SUS PROPIEDADES en vez de adivinarlas. `familyName` devolvio
// undefined en las 168 y el filtro las descarto a todas: el nombre correcto sale de la reflexion, que
// es la unica fuente que no puede estar desactualizada.
if (todas !== null && todas.length) {
  try {
    var refl = todas[0].reflect.properties;
    var rs = "", rr;
    for (rr = 0; rr < refl.length; rr++) { rs = rs + (rr ? "," : "") + refl[rr].name; }
    anotar("PROPIEDADES|" + rs);
  } catch (exRefl) { anotar("PROPIEDADES|no se pudo reflejar|" + texto(exRefl)); }
}

if (todas !== null && todas.length) {
  var k, j;
  for (k = 0; k < todas.length; k++) {
    var fu = null;
    try { fu = todas[k]; } catch (exIt) { fu = null; }
    if (fu === null || fu === undefined) { continue; }
    // UNA PROPIEDAD QUE NO EXISTE DEVUELVE undefined SIN LANZAR, asi que el try/catch no alcanza: hay
    // que convertir. `undefined.substring` es un TypeError que apunta a la linea de la comparacion y
    // no a la de la lectura, o sea que el mensaje señala el lugar equivocado. Se normaliza todo a
    // cadena en el momento de leer.
    var fam = texto(fu.familyName), est = texto(fu.styleName), ps = texto(fu.postScriptName);
    if (fam === "undefined") { fam = texto(fu.family); }
    if (ps === "undefined") { ps = texto(fu.postscriptName); }
    if (fam === "undefined") { continue; }
    var sirve = false;
    for (j = 0; j < INTERES.length; j++) {
      // se compara con substring y no con indexOf: la compuerta de ES3 no puede distinguir el
      // indexOf de una cadena (que existe en ES3) del de un arreglo (que no), y tiene razon en
      // preferir el falso positivo — el metodo de arreglo falla en AE con un error que no dice nada.
      if (fam.substring(0, INTERES[j].length) === INTERES[j]) { sirve = true; }
    }
    if (!sirve) { continue; }
    anotar("FUENTE|" + ps + "|" + fam + "|" + est);
    candidatas[candidatas.length] = { ps: ps, fam: fam, est: est };
  }
  anotar("TOTAL|" + todas.length + " instaladas|" + candidatas.length + " de interes");
} else {
  anotar("NOTA|0|app.fonts no existe en esta version: no se puede enumerar|-");
}

// ---------------------------------------------------------------- 2. medir las que se van a usar
// Una linea por candidata, con la MISMA cadena y el MISMO cuerpo, para que la unica variable sea la
// fuente. Se incluye a proposito una cadena con numeros y con acento: los digitos tabulares y los
// acentos son donde mas se separan dos motores de texto.
var NOMBRE = "FUENTES";
var ANCHO = 1920, ALTO = 1080, FPS = 30;

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, 10 / FPS, FPS);
comp.resolutionFactor = [1, 1];
comp.motionBlur = false;
comp.bgColor = [0.04, 0.04, 0.05];

var fondo = comp.layers.addSolid([0.04, 0.04, 0.05], "fondo", ANCHO, ALTO, 1);

// las que quiero probar, por nombre PostScript mas probable. Si AE no la resuelve, lo dice el volcado:
// `d.font` devuelve lo que AE efectivamente uso, que puede no ser lo que se pidio.
var PEDIDAS = [
  "Bahnschrift", "Bahnschrift-SemiBold", "Bahnschrift-Light",
  "BahnschriftCondensed", "BahnschriftSemiBoldCondensed",
  "SegoeUI", "SegoeUI-Black", "SegoeUI-Semibold", "SegoeUI-Light",
  "CascadiaMono", "CenturyGothic", "FranklinGothic-Medium"
];
var CADENA = "Medido 0,014 px \u2014 47 de 47";

var i;
for (i = 0; i < PEDIDAS.length; i++) {
  var t = comp.layers.addText(CADENA);
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = 44;
  d.fillColor = [0.95, 0.95, 0.93];
  d.applyFill = true;
  d.justification = ParagraphJustification.LEFT_JUSTIFY;
  var pedido = PEDIDAS[i];
  var puesto = "?";
  try { d.font = pedido; p.setValue(d); } catch (exF) {}
  try { puesto = t.property("ADBE Text Properties").property("ADBE Text Document").value.font; } catch (exG) {}
  t.name = "f" + i + " " + pedido;
  t.property("ADBE Transform Group").property("ADBE Position").setValue([120, 90 + i * 78]);

  var caja = t.sourceRectAtTime(0, false);
  // SE VUELCA LO QUE SE PIDIO Y LO QUE AE PUSO. Cuando no coinciden, AE resolvio a otra cosa sin
  // avisar — y ese es exactamente el caso que hay que descartar antes de autorar, no despues.
  anotar("PRUEBA|" + i + "|" + pedido + "|" + puesto + "|" +
         caja.width.toFixed(2) + "|" + caja.height.toFixed(2) + "|" + (pedido === puesto ? "igual" : "RESOLVIO A OTRA"));
}
fondo.moveToEnd();

anotar("FUENTES|" + comp.numLayers + " capas");

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
