// SEPARAR DIMENSIONES: QUE PASA CON EL VALOR QUE YA ESTABA.
//
// POR QUE EXISTE. En la PIEZA-I la camara quedo en y=0 mirando al punto [960,540,0], o sea inclinada
// 17 grados hacia abajo, y eso subio 240 px en el cuadro a TODO lo que vive en z>0: los tres paneles de
// la pieza salieron cortados por el borde de arriba. Y un panel al que le escribi y=520 aparecio en el
// documento con y=605,67. Los dos pasaron por la misma funcion: `ejes()`, que hace
// `pos(capa).dimensionsSeparated = true`.
//
// LA PREGUNTA, exacta: cuando se separan las dimensiones de una posicion, ¿el valor que la propiedad ya
// tenia sobrevive? Y en particular, ¿sobrevive en una CAMARA, que nunca recibio un setValue explicito?
//
// Se mide el caso en las cuatro combinaciones que importan, porque una respuesta que valga para un
// solido puede no valer para una camara:
//   1  solido 3D:  setValue ANTES de separar
//   2  solido 3D:  separar ANTES del setValue
//   3  camara:     recien creada con addCamera(nombre, [960,540]), sin tocarla
//   4  camara:     separada, y despues leida
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/ejes-prueba.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/ejes-prueba.jsx

var RUTA = "C:/ae-probe/ejes-prueba.txt";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA);
  a.encoding = "UTF-8";
  a.open("a");
  a.write(t + String.fromCharCode(10));
  a.close();
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("EJES-PRUEBA");

var NOMBRE = "EJES-PRUEBA";
var ANCHO = 1920, ALTO = 1080;

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, 2, 30);

function tr(c) { return c.property("ADBE Transform Group"); }
function pos(c) { return tr(c).property("ADBE Position"); }
function leerSeparadas(c, etiqueta) {
  var g = tr(c);
  var vx = "-", vy = "-", vz = "-";
  try { vx = texto(g.property("ADBE Position_0").value); } catch (e0) { vx = "<sin Position_0>"; }
  try { vy = texto(g.property("ADBE Position_1").value); } catch (e1) { vy = "<sin Position_1>"; }
  try { vz = texto(g.property("ADBE Position_2").value); } catch (e2) { vz = "<sin Position_2>"; }
  anotar("SEP|" + etiqueta + "|x=" + vx + "|y=" + vy + "|z=" + vz);
}
function leerJunta(c, etiqueta) {
  var v = pos(c).value;
  anotar("JUN|" + etiqueta + "|" + texto(v[0]) + "," + texto(v[1]) + "," + texto(v.length > 2 ? v[2] : "-"));
}

// ---------------------------------------------------------------- 1 · solido: setValue y despues separar
var s1 = comp.layers.addSolid([1, 1, 1], "caso1", 200, 200, 1);
s1.threeDLayer = true;
pos(s1).setValue([700, 520, 900]);
leerJunta(s1, "1-antes-de-separar");
pos(s1).dimensionsSeparated = true;
leerSeparadas(s1, "1-despues-de-separar");

// ---------------------------------------------------------------- 2 · solido: separar y despues setValue
var s2 = comp.layers.addSolid([1, 1, 1], "caso2", 200, 200, 1);
s2.threeDLayer = true;
pos(s2).dimensionsSeparated = true;
leerSeparadas(s2, "2-recien-separado");
// OJO: con las dimensiones separadas, `ADBE Position` ya no es la propiedad que manda. Se prueba si
// setValue sobre ella hace algo, porque es exactamente lo que hace `img()` cuando el orden se invierte.
var fallo2 = "";
try { tr(s2).property("ADBE Position").setValue([700, 520, 900]); } catch (ex2) { fallo2 = texto(ex2.message); }
leerSeparadas(s2, "2-despues-del-setValue" + (fallo2 ? " (" + fallo2 + ")" : ""));

// ---------------------------------------------------------------- 3 · solido 2D separado, para contraste
var s3 = comp.layers.addSolid([1, 1, 1], "caso3", 200, 200, 1);
pos(s3).setValue([700, 520]);
pos(s3).dimensionsSeparated = true;
leerSeparadas(s3, "3-solido-2D");

// ---------------------------------------------------------------- 4 · la camara, tal como la crea la pieza
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
leerJunta(cam, "4-camara-recien-creada");
var poi = tr(cam).property("ADBE Anchor Point").value;
anotar("POI|4-camara-recien-creada|" + texto(poi[0]) + "," + texto(poi[1]) + "," + texto(poi[2]));
anotar("AUTO|" + texto(cam.autoOrient));
pos(cam).dimensionsSeparated = true;
leerSeparadas(cam, "4-camara-separada");

// ---------------------------------------------------------------- 5 · la camara con posicion explicita
var cam2 = comp.layers.addCamera("camara2", [ANCHO / 2, ALTO / 2]);
pos(cam2).setValue([ANCHO / 2, ALTO / 2, -1900]);
leerJunta(cam2, "5-camara-con-setValue");
pos(cam2).dimensionsSeparated = true;
leerSeparadas(cam2, "5-camara-con-setValue-separada");

app.endUndoGroup();
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
