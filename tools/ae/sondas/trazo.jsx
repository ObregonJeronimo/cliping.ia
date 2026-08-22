// "RECORTAR TRAZADOS" SOBRE UN TRAZADO CUALQUIERA: ¿por longitud de arco o por otra cosa?
//
// POR QUE. El motor sabe dibujar UN caso de forma animada: la elipse con recorte, y la resuelve
// descartando por angulo en el fragmento. Eso no generaliza a nada. Para que un trazo se DIBUJE —la
// figura que el genero usa para subrayados, flechas, firmas y contornos— hace falta saber que
// significan exactamente el inicio, el fin y el desfase sobre un trazado arbitrario.
//
// Y ES MEDIBLE, ahora que `comp.saveFrameToPng` anda. Cada capa es una figura de longitud CONOCIDA con
// un recorte distinto; el ancho o el alto de la tinta en el PNG dice cuanto se dibujo, y de ahi sale la
// regla. Sin renderizar el video y sin mirar a ojo.
//
//   A  linea recta horizontal de 300 px, recorte al 50%      -> ¿150 px de tinta?
//   B  la misma, recorte del 25% al 75%                      -> ¿150 px, empezando en 75?
//   C  ELE: 300 horizontal + 100 vertical = 400 de largo, al 50%
//        · por longitud de arco -> 200 px de horizontal y nada de vertical
//        · por cantidad de segmentos -> el segmento entero y medio del otro
//   D  la ELE con desfase de 25%
//   E  DOS subtrazados sueltos, para ver si el recorte los trata juntos o cada uno por su lado
//   F  una linea con extremos redondeados, para medir cuanto sobresale el remate
//
// Todas verticales y separadas, para poder medir cada una en su propia franja del cuadro.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/trazo.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/trazo.jsx
//   node tools/ae/cuadro-ae.mjs SONDA-TRAZO 0

var RUTA = "C:/ae-probe/trazo.txt";
var ANCHO = 800, ALTO = 660, FPS = 30;

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
app.beginUndoGroup("TRAZO");
var NOMBRE = "SONDA-TRAZO";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, 1, FPS);
comp.bgColor = [0, 0, 0];

// una figura por franja: y = 60, 160, 260, ... asi cada una se mide sola en el PNG
function capaForma(nombre, y) {
  var L = comp.layers.addShape();
  L.name = nombre;
  L.property("ADBE Transform Group").property("ADBE Position").setValue([50, y]);
  return L;
}
function grupoDe(L) {
  var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
  return g.property("ADBE Vectors Group");
}
function trazadoLibre(cont, vs, cerrado) {
  var p = cont.addProperty("ADBE Vector Shape - Group");
  var s = new Shape();
  var ceros = [], i;
  for (i = 0; i < vs.length; i++) { ceros[i] = [0, 0]; }
  s.vertices = vs;
  s.inTangents = ceros;
  s.outTangents = ceros;
  s.closed = cerrado ? true : false;
  p.property("ADBE Vector Shape").setValue(s);
  return p;
}
function trazoDe(cont, grosor) {
  var t2 = cont.addProperty("ADBE Vector Graphic - Stroke");
  t2.property("ADBE Vector Stroke Color").setValue([1, 1, 1, 1]);
  t2.property("ADBE Vector Stroke Width").setValue(grosor);
  return t2;
}
function recorteDe(cont, ini, fin, desf) {
  var r = cont.addProperty("ADBE Vector Filter - Trim");
  r.property("ADBE Vector Trim Start").setValue(ini);
  r.property("ADBE Vector Trim End").setValue(fin);
  r.property("ADBE Vector Trim Offset").setValue(desf);
  return r;
}

// ---------------------------------------------------------------- A · recta de 300, al 50%
var A = capaForma("A-recta-50", 60);
var cA = grupoDe(A);
trazadoLibre(cA, [[0, 0], [300, 0]], false);
trazoDe(cA, 8);
recorteDe(cA, 0, 50, 0);
anotar("A|recta de 300 px, recorte 0-50, grosor 8");

// ---------------------------------------------------------------- B · recta, del 25 al 75
var B = capaForma("B-recta-25-75", 160);
var cB = grupoDe(B);
trazadoLibre(cB, [[0, 0], [300, 0]], false);
trazoDe(cB, 8);
recorteDe(cB, 25, 75, 0);
anotar("B|recta de 300 px, recorte 25-75, grosor 8");

// ---------------------------------------------------------------- C · ELE de 300+100, al 50%
var C = capaForma("C-ele-50", 260);
var cC = grupoDe(C);
trazadoLibre(cC, [[0, 0], [300, 0], [300, 100]], false);
trazoDe(cC, 8);
recorteDe(cC, 0, 50, 0);
anotar("C|ELE de 300 h + 100 v = 400, recorte 0-50, grosor 8");

// ---------------------------------------------------------------- D · la ELE con desfase 25
var D = capaForma("D-ele-desfase", 400);
var cD = grupoDe(D);
trazadoLibre(cD, [[0, 0], [300, 0], [300, 100]], false);
trazoDe(cD, 8);
recorteDe(cD, 0, 50, 25);
anotar("D|la misma ELE, recorte 0-50 con desfase 25");

// ---------------------------------------------------------------- E · dos subtrazados
var E = capaForma("E-dos", 540);
var cE = grupoDe(E);
trazadoLibre(cE, [[0, 0], [140, 0]], false);
trazadoLibre(cE, [[180, 0], [320, 0]], false);
trazoDe(cE, 8);
var rE = recorteDe(cE, 0, 50, 0);
// el enum de "recortar varias formas": a la vez o cada una por su lado
var pm = null;
try { pm = rE.property("ADBE Vector Trim Type"); } catch (exT) { pm = null; }
anotar("E|dos subtrazados de 140, recorte 0-50|tipo=" + (pm ? pm.matchName + "=" + texto(pm.value) : "no existe"));

// ---------------------------------------------------------------- F · los remates
var F = capaForma("F-remates", 620);
var cF = grupoDe(F);
trazadoLibre(cF, [[0, 0], [300, 0]], false);
var tF = trazoDe(cF, 24);
var cap = null;
try { cap = tF.property("ADBE Vector Stroke Line Cap"); } catch (exC) { cap = null; }
if (cap !== null) { cap.setValue(2); }     // 1 recto, 2 redondo, 3 cuadrado — se confirma abajo
anotar("F|recta de 300 con grosor 24 y remate redondo|cap=" + (cap ? cap.matchName + "=" + texto(cap.value) : "no existe"));

// UNA CAMARA. `capturar-comp.py` elige el reproductor 2D cuando no hay camara ni capas 3D, y ese no
// dibuja formas vectoriales: la sonda medía el reproductor equivocado y daba todo en negro.
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
cam.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -1900]);

// ---------------------------------------------------------------- la estructura, para el exportador
//
// VA AL FINAL Y EN SU PROPIO try, Y NO ES UN DETALLE. Esta seccion es DIAGNOSTICO: sirve para que yo
// vea los matchName. Cuando estaba en el medio y sin blindar, dos errores distintos suyos —pedirle
// `.value` a un grupo, y usar una referencia que quedo invalida al agregar otra propiedad— mataron la
// sonda ENTERA justo antes de crear la camara. Sin camara, el capturador elige el reproductor 2D, que
// no dibuja formas vectoriales, y todo salio en negro. Dos vueltas perdidas diagnosticando el motor
// por culpa del diagnostico.
//
// UNA SECCION DE DIAGNOSTICO NO PUEDE MATAR A LA SONDA QUE DIAGNOSTICA.
try {
var muestra = grupoDe(capaForma("Z-estructura", 900));
trazadoLibre(muestra, [[0, 0], [10, 0]], false);
var tz = trazoDe(muestra, 4);
var rl = muestra.addProperty("ADBE Vector Graphic - Fill");
var k, hijos = "";
for (k = 1; k <= muestra.numProperties; k++) { hijos = hijos + muestra.property(k).matchName + ";"; }
anotar("ESTRUCTURA|contenido=" + hijos);
// PEDIRLE `.value` A UN GRUPO TIRA, y un trazo tiene uno adentro: el de los guiones. Sin el try, el
// volcado de estructura mataba la sonda ENTERA en su ultima seccion — y con ella la camara que se crea
// despues, asi que el capturador elegia el reproductor 2D y todo salia en negro. Un error al final
// puede romper algo que esta mas abajo y parecer un defecto de otra cosa.
function volcarGrupo(g, etiqueta) {
  var z, s2 = "";
  for (z = 1; z <= g.numProperties; z++) {
    var pr = g.property(z), vv = "<grupo>";
    try { vv = texto(pr.value); } catch (exVg) { vv = "<grupo>"; }
    s2 = s2 + pr.matchName + "=" + vv + ";";
  }
  anotar(etiqueta + "|" + s2);
}
volcarGrupo(tz, "TRAZO_PROPS");
volcarGrupo(rl, "RELLENO_PROPS");
volcarGrupo(recorteDe(muestra, 0, 100, 0), "RECORTE_PROPS");

} catch (exEstructura) {
  anotar("ESTRUCTURA_FALLO|" + texto(exEstructura.message ? exEstructura.message : exEstructura));
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
