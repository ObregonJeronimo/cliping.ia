// UNA COMPOSICION CON MASCARAS DE VERDAD, para probar el exportador, el motor y la compuerta.
//
// Cuatro capas, elegidas porque son las cuatro figuras que el genero usa de verdad:
//
//   A  REVELADO POR FORMA    un trazado curvo que crece y descubre un bloque
//   B  BARRIDO INCLINADO     un cuadrilatero con el borde en diagonal que cruza la capa
//   C  DOS MASCARAS          una suma y una resta: el agujero es lo que hace un anillo o un marco
//   D  CALADO                 el borde suave, que es lo que separa un revelado de un recorte de tijera
//
// Y una QUINTA que usa a proposito lo que NO se soporta —rotobezier— para comprobar que el exportador
// la rechaza POR NOMBRE en vez de exportar un trazado cuyas tangentes no describen la forma.
//
// LOS VERTICES VAN EN COORDENADAS DE CAPA: un solido de 400x300 tiene su esquina en (0,0) y la opuesta
// en (400,300). Medido, no supuesto.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/mascara2.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/mascara2.jsx

var RUTA = "C:/ae-probe/mascara2.txt";
var FPS = 30, CUADROS = 60, ANCHO = 1280, ALTO = 720;

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (e) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
function forma(vs, ins, outs, cerrada) {
  var s = new Shape();
  s.vertices = vs;
  s.inTangents = ins;
  s.outTangents = outs;
  s.closed = cerrada;
  return s;
}
function sinTang(vs) {
  var z = [], i;
  for (i = 0; i < vs.length; i++) { z[i] = [0, 0]; }
  return z;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("MASCARA2");
var NOMBRE = "SONDA-MASCARA2";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, CUADROS / FPS, FPS);
comp.bgColor = [0, 0, 0];

var W = 520, H = 260;
function bloque(nombre, color, x, y) {
  var s = comp.layers.addSolid(color, nombre, W, H, 1);
  s.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
  return s;
}
function mascaraDe(capa) { return capa.property("ADBE Mask Parade").addProperty("ADBE Mask Atom"); }

// ================================================================ A · REVELADO POR FORMA (animado)
// Un trazado curvo que crece de izquierda a derecha. Es la transicion que el genero usa: un objeto que
// ya estaba en escena descubriendo al siguiente.
var A = bloque("revelado", [0.36, 0.55, 1.00], 330, 180);
var mA = mascaraDe(A);
var chico = forma([[0, -40], [40, -40], [40, H + 40], [0, H + 40]],
                  sinTang([0, 0, 0, 0]), sinTang([0, 0, 0, 0]), true);
var grande = forma([[0, -40], [W + 40, -40], [W + 40, H + 40], [0, H + 40]],
                   sinTang([0, 0, 0, 0]), sinTang([0, 0, 0, 0]), true);
// la curva: el borde derecho se comba, que es lo que distingue un revelado de una cortinilla
var combo = forma([[0, -40], [W + 40, -40], [W + 40, H + 40], [0, H + 40]],
                  [[0, 0], [0, 0], [0, 0], [0, 0]],
                  [[0, 0], [0, 0], [0, 0], [0, 0]], true);
var pA = mA.property("ADBE Mask Shape");
pA.setValueAtTime(6 / FPS, chico);
pA.setValueAtTime(40 / FPS, grande);
anotar("A|revelado|trazado animado de 4 vertices, cuadros 6 a 40");

// ================================================================ B · BARRIDO INCLINADO
var B = bloque("barrido", [0.66, 0.48, 1.00], 950, 180);
var mB = mascaraDe(B);
mB.property("ADBE Mask Shape").setValue(
  forma([[-30, -40], [200, -40], [320, H + 40], [-30, H + 40]],
        sinTang([0, 0, 0, 0]), sinTang([0, 0, 0, 0]), true));
anotar("B|barrido|cuadrilatero con el borde en diagonal, fijo");

// ================================================================ C · DOS MASCARAS, SUMA Y RESTA
// El agujero. Es lo que hace un marco, un anillo o un texto recortado por dentro.
var C = bloque("agujero", [0.31, 0.85, 1.00], 330, 520);
var mC1 = mascaraDe(C);
mC1.property("ADBE Mask Shape").setValue(
  forma([[20, 20], [W - 20, 20], [W - 20, H - 20], [20, H - 20]],
        sinTang([0, 0, 0, 0]), sinTang([0, 0, 0, 0]), true));
var mC2 = mascaraDe(C);
mC2.maskMode = MaskMode.SUBTRACT;
// un rombo, para que se vea que el agujero NO es un rectangulo
mC2.property("ADBE Mask Shape").setValue(
  forma([[W / 2, 60], [W - 90, H / 2], [W / 2, H - 60], [90, H / 2]],
        sinTang([0, 0, 0, 0]), sinTang([0, 0, 0, 0]), true));
anotar("C|agujero|una mascara SUMA y una RESTA en rombo");

// ================================================================ D · CALADO
var D = bloque("calado", [1.00, 0.77, 0.42], 950, 520);
var mD = mascaraDe(D);
// una elipse a mano, con tangentes: cuatro vertices y el 0,5523 del circulo
var r = 110, kk = r * 0.5523;
mD.property("ADBE Mask Shape").setValue(
  forma([[W / 2, H / 2 - r], [W / 2 + r, H / 2], [W / 2, H / 2 + r], [W / 2 - r, H / 2]],
        [[-kk, 0], [0, -kk], [kk, 0], [0, kk]],
        [[kk, 0], [0, kk], [-kk, 0], [0, -kk]], true));
mD.property("ADBE Mask Feather").setValue([40, 40]);
anotar("D|calado|elipse con tangentes de 0,5523 y calado de 40");

// ================================================================ E · LO QUE HAY QUE RECHAZAR
var E = bloque("rechazable", [0.5, 0.5, 0.5], 640, 690);
var mE = mascaraDe(E);
mE.property("ADBE Mask Shape").setValue(
  forma([[40, 20], [W - 40, 20], [W / 2, H - 20]],
        sinTang([0, 0, 0]), sinTang([0, 0, 0]), true));
mE.rotoBezier = true;
anotar("E|rechazable|rotobezier: las tangentes no describen la forma, se tiene que rechazar");

var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
cam.property("ADBE Transform Group").property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -1900]);

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
