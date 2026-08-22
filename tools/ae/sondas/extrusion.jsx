// EL MOTOR CINEMA 4D DE AE: ¿que se apaga al activarlo?
//
// POR QUE ESTA PREGUNTA VA PRIMERA. Ya esta medido que `comp.renderer` acepta "ADBE Ernst" y que con el
// una capa de texto 3D expone extrusion, biseles y un juego completo de materiales. Eso dice que el
// camino EXISTE. Lo que no dice es si es transitable.
//
// AE cambia de motor de composicion entero, no de "modo de dibujo": con el motor de Cinema 4D hay
// funciones del 3D Clasico que dejan de estar. Si las que se apagan son las que la pieza ya usa
// —modos de fusion, mattes de pista, efectos, sombras paralelas— entonces extruir no es una mejora
// sino una rama aparte, y hay que saberlo ANTES de escribir una linea de motor.
//
// COMO SE MIDE, sin creerle a nadie: se arma la MISMA composicion con las funciones puestas, se lee
// todo con el motor clasico, se cambia el motor, y se vuelve a leer lo mismo. Lo que cambie de valor,
// desaparezca o pase a ser inescribible, se apago.
//
// Y ADEMAS, con `saveFrameToPng` se puede MIRAR: dos cuadros, uno por motor, del mismo proyecto. Si una
// funcion sigue declarada pero deja de dibujarse, en los numeros no se ve y en el pixel si.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/extrusion.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/extrusion.jsx
//   node tools/ae/cuadro-ae.mjs SONDA-EXTRUSION 0

var RUTA = "C:/ae-probe/extrusion.txt";
var ANCHO = 960, ALTO = 540;

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
app.beginUndoGroup("EXTRUSION");
var NOMBRE = "SONDA-EXTRUSION";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, 1, 30);
comp.bgColor = [0, 0, 0];
anotar("MOTORES|" + (function () {
  var s = "", i;
  try { for (i = 0; i < comp.renderers.length; i++) { s = s + comp.renderers[i] + ";"; } }
  catch (e) { s = "<no se pudo leer>"; }
  return s;
})());
anotar("MOTOR_INICIAL|" + texto(comp.renderer));

// ---------------------------------------------------------------- la composicion de prueba
// Cada capa lleva UNA de las funciones que la pieza ya usa, para poder decir cual sobrevive y cual no.
function solido(nombre, col, x, y, w, h) {
  var s = comp.layers.addSolid(col, nombre, w, h, 1);
  s.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
  s.threeDLayer = true;
  return s;
}

// 1 · modo de fusion ANADIR
var fondo = solido("fondo-plano", [0.15, 0.15, 0.2], 480, 270, 900, 500);
var suma = solido("con-suma", [0.3, 0.45, 0.9], 260, 170, 260, 160);
suma.blendingMode = BlendingMode.ADD;

// 2 · matte de pista
var abajo = solido("bajo-matte", [1, 0.7, 0.3], 700, 170, 240, 150);
var matte = solido("el-matte", [1, 1, 1], 700, 170, 150, 150);
abajo.trackMatteType = TrackMatteType.ALPHA;

// 3 · mascara
var conMasc = solido("con-mascara", [0.4, 0.9, 0.6], 260, 400, 240, 150);
var m = conMasc.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
var sh = new Shape();
sh.vertices = [[20, 20], [220, 20], [120, 130]];
sh.inTangents = [[0, 0], [0, 0], [0, 0]];
sh.outTangents = [[0, 0], [0, 0], [0, 0]];
sh.closed = true;
m.property("ADBE Mask Shape").setValue(sh);

// 4 · un texto 3D, que es lo que se querria extruir
var tx = comp.layers.addText("VOLUMEN");
tx.name = "texto3d";
var td = tx.property("ADBE Text Properties").property("ADBE Text Document");
var d = td.value;
d.fontSize = 72; d.fillColor = [1, 1, 1]; d.applyFill = true;
d.justification = ParagraphJustification.CENTER_JUSTIFY;
try { d.font = "SegoeUI"; } catch (exF) {}
td.setValue(d);
tx.threeDLayer = true;
tx.property("ADBE Transform Group").property("ADBE Position").setValue([700, 420, 0]);

// 5 · una LUZ, que hoy el exportador rechaza y que un extruido necesita
var luz = comp.layers.addLight("luz", [480, 100]);
luz.property("ADBE Transform Group").property("ADBE Position").setValue([300, 100, -600]);

var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
cam.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -1400]);

// ---------------------------------------------------------------- el inventario, por motor
function inventario(etiqueta) {
  anotar("== " + etiqueta + " | motor=" + texto(comp.renderer));
  var i;
  for (i = 1; i <= comp.numLayers; i++) {
    var c = comp.layer(i);
    var fus = "-", mt = "-", masc = "-", ext = "-", mat = "-";
    try { fus = texto(c.blendingMode); } catch (e1) { fus = "ERR"; }
    try { mt = texto(c.trackMatteType); } catch (e2) { mt = "ERR"; }
    try {
      var mp = c.property("ADBE Mask Parade");
      masc = mp === null ? "no" : texto(mp.numProperties);
    } catch (e3) { masc = "ERR"; }
    // el grupo de extrusion: existe solo con el motor de Cinema 4D
    try {
      var g = c.property("ADBE Extrsn Options Group");
      ext = (g === null || g === undefined) ? "no" : texto(g.numProperties);
    } catch (e4) { ext = "no"; }
    try {
      var mo = c.property("ADBE Material Options Group");
      mat = (mo === null || mo === undefined) ? "no" : texto(mo.numProperties);
    } catch (e5) { mat = "no"; }
    anotar("CAPA|" + c.name + "|fusion=" + fus + "|matte=" + mt + "|mascaras=" + masc +
           "|extrusion=" + ext + "|material=" + mat);
  }
}

inventario("CLASICO");

// ---------------------------------------------------------------- cambiar de motor
var puesto = "si";
try { comp.renderer = "ADBE Ernst"; }
catch (exM) { puesto = "FALLO: " + texto(exM.message ? exM.message : exM); }
anotar("CAMBIO|" + puesto + "|ahora=" + texto(comp.renderer));

inventario("CINEMA4D");

// ¿SE PUEDE ESCRIBIR la extrusion, o solo leerla?
var prof = null;
try { prof = comp.layer("texto3d").property("ADBE Extrsn Options Group").property("ADBE Extrsn Depth"); }
catch (exE) { prof = null; }
if (prof === null) { anotar("EXTRUIR|no se encontro la profundidad"); }
else {
  var ok = "si";
  try { prof.setValue(40); } catch (exS) { ok = "FALLO: " + texto(exS.message ? exS.message : exS); }
  anotar("EXTRUIR|profundidad 40|" + ok + "|valor=" + texto(prof.value));
}

// ¿y las funciones que la pieza usa siguen siendo ESCRIBIBLES?
var pruebas = [["fusion", function () { comp.layer("con-suma").blendingMode = BlendingMode.ADD; }],
               ["matte", function () { comp.layer("bajo-matte").trackMatteType = TrackMatteType.ALPHA; }],
               ["mascara", function () { comp.layer("con-mascara").property("ADBE Mask Parade").property(1).maskMode = MaskMode.ADD; }]];
var pi;
for (pi = 0; pi < pruebas.length; pi++) {
  var r = "si";
  try { pruebas[pi][1](); } catch (exP) { r = "FALLO: " + texto(exP.message ? exP.message : exP); }
  anotar("ESCRIBIBLE|" + pruebas[pi][0] + "|" + r);
}

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
