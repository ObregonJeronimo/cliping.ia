// REPRODUCIR EL CORRIMIENTO DE 85 PX. En la PIEZA-I, `panel-linea` recibio y=520 y AE guardo 605,676;
// `panel-documento`, con una secuencia casi identica, guardo 520. Se replican las dos secuencias en una
// composicion limpia, cambiando UNA cosa por vez, hasta que una de las dos se corra.
var RUTA = "C:/ae-probe/linea-prueba.txt";
function texto(x) { if (x === null) { return "null"; } if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (e) { return "<inconvertible>"; } }
function anotar(t) { var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close(); }
var previo = new File(RUTA); if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }
try {
app.beginUndoGroup("LINEA-PRUEBA");
var NOMBRE = "LINEA-PRUEBA", ANCHO = 1920, ALTO = 1080, FPS = 30;
var n = app.project.numItems;
while (n > 0) { var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); } n = n - 1; }
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, 30, FPS);
function tr(c) { return c.property("ADBE Transform Group"); }
function pos(c) { return tr(c).property("ADBE Position"); }
var cache = {};
function recurso(archivo) {
  if (cache[archivo]) { return cache[archivo]; }
  var f = new File("C:/ae-probe/recursos-h/" + archivo + ".png");
  if (!f.exists) { throw new Error("falta " + archivo); }
  cache[archivo] = app.project.importFile(new ImportOptions(f));
  return cache[archivo];
}
function img(archivo, nombre, x, y, z, escala) {
  var c = comp.layers.add(recurso(archivo));
  c.name = nombre; c.threeDLayer = true; c.motionBlur = true;
  pos(c).setValue([x, y, z]);
  tr(c).property("ADBE Scale").setValue([escala, escala, escala]);
  return c;
}
function ejes(capa) {
  pos(capa).dimensionsSeparated = true;
  return { x: tr(capa).property("ADBE Position_0"), y: tr(capa).property("ADBE Position_1"),
           z: tr(capa).property("ADBE Position_2") };
}
function informar(c, etiqueta) {
  var g = tr(c);
  anotar("Y|" + etiqueta + "|y=" + texto(g.property("ADBE Position_1").value) +
         "|clavesY=" + texto(g.property("ADBE Position_1").numKeys) +
         "|clavesX=" + texto(g.property("ADBE Position_0").numKeys));
}
function unaClave(prop, cuadro, valor) {
  prop.setValueAtTime(cuadro / FPS, valor);
}

// A · secuencia EXACTA de panel-linea: img, claves de Rotate Y, separar, claves de X
var a = img("panel-linea", "A-como-panel-linea", 700, 520, 900, 50);
unaClave(tr(a).property("ADBE Rotate Y"), 502, 30);
unaClave(tr(a).property("ADBE Rotate Y"), 560, 23);
var ea = ejes(a);
unaClave(ea.x, 502, 260); unaClave(ea.x, 546, 700); unaClave(ea.x, 576, 730);
informar(a, "A-panel-linea-tal-cual");

// B · lo mismo SIN las claves de Rotate Y
var b = img("panel-linea", "B-sin-rotacion", 700, 520, 900, 50);
var eb = ejes(b);
unaClave(eb.x, 502, 260); unaClave(eb.x, 546, 700); unaClave(eb.x, 576, 730);
informar(b, "B-sin-claves-de-rotacion");

// C · con rotacion pero SIN claves de X despues
var c3 = img("panel-linea", "C-sin-claves-x", 700, 520, 900, 50);
unaClave(tr(c3).property("ADBE Rotate Y"), 502, 30);
unaClave(tr(c3).property("ADBE Rotate Y"), 560, 23);
ejes(c3);
informar(c3, "C-sin-claves-de-x");

// D · secuencia de panel-documento: con Rotate Z fijo en el medio
var d = img("panel-doc", "D-como-panel-documento", 1020, 520, 620, 58);
unaClave(tr(d).property("ADBE Rotate Y"), 350, -34);
unaClave(tr(d).property("ADBE Rotate Y"), 420, -27);
tr(d).property("ADBE Rotate Z").setValue(-2);
var ed = ejes(d);
unaClave(ed.x, 350, 1520); unaClave(ed.x, 420, 1020);
informar(d, "D-panel-documento-tal-cual");

// E · el sospechoso principal: separar mientras el tiempo de la composicion NO es cero
comp.time = 18;
var e5 = img("panel-linea", "E-tiempo-18s", 700, 520, 900, 50);
unaClave(tr(e5).property("ADBE Rotate Y"), 502, 30);
var ee = ejes(e5);
unaClave(ee.x, 502, 260);
informar(e5, "E-separada-con-tiempo-18s");
comp.time = 0;

app.endUndoGroup();
anotar("--- fin ---");
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
