// OBJETOS 3D SIN EL MOTOR DE CINEMA 4D: armados con PLANOS.
//
// POR QUE ESTE CAMINO Y NO EL OTRO. El motor Cinema 4D de AE se puede activar por script y expone
// extrusion, biseles y materiales — pero al renderizar TIRA: "Cinema 4D: Error de procesamiento
// (5070 :: 0)", medido en esta maquina. Escribio el cuadro del motor clasico y no el suyo.
//
// Y aunque anduviera, reproducirlo en three.js exigiria sacar los contornos de los glifos de la fuente,
// triangular, extruir, biselar, y ademas portar el modelo de luces y materiales — con las luces
// rechazadas hoy por el exportador. Es un proyecto entero para una funcion que el genero casi no usa.
//
// LA OBSERVACION QUE CAMBIA EL PROBLEMA: en los ocho avisos de referencia, casi todo lo que parece un
// objeto 3D son PLANOS ARMADOS EN EL ESPACIO. Una caja son seis planos. Una tarjeta con espesor es un
// plano y sus cantos. Un carrusel es una rueda de paneles. Y eso el 3D CLASICO lo previsualiza exacto,
// el exportador ya lo lleva, y el motor ya lo dibuja — sin una linea nueva.
//
// Esta sonda lo prueba de punta a punta con las tres figuras que el genero usa de verdad:
//   A  CAJA          seis planos, girando: el objeto solido
//   B  TARJETA CON ESPESOR   la cara y sus cuatro cantos, que es lo que da el peso
//   C  RUEDA DE PANELES      ocho paneles en circulo mirando al centro: el carrusel
//
// Y de paso deja la composicion de prueba anterior en el motor CLASICO, que es donde tiene que estar.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/objeto3d.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/objeto3d.jsx
//   node tools/ae/cuadro-ae.mjs SONDA-OBJETO3D 0,20,40

var RUTA = "C:/ae-probe/objeto3d.txt";
var ANCHO = 1280, ALTO = 720, FPS = 30, CUADROS = 60;

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
app.beginUndoGroup("OBJETO3D");

// primero: dejar la sonda anterior en el motor clasico, que el de Cinema 4D tira al renderizar
var q, arreglada = "no estaba";
for (q = 1; q <= app.project.numItems; q++) {
  var itx = app.project.item(q);
  if (itx instanceof CompItem && itx.name === "SONDA-EXTRUSION") {
    try { itx.renderer = "ADBE Advanced 3d"; arreglada = "vuelta a clasico"; }
    catch (exA) { arreglada = "FALLO " + texto(exA.message ? exA.message : exA); }
  }
}
anotar("LIMPIEZA|SONDA-EXTRUSION|" + arreglada);

var NOMBRE = "SONDA-OBJETO3D";
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, CUADROS / FPS, FPS);
comp.bgColor = [0, 0, 0];
comp.motionBlur = true;
anotar("MOTOR|" + texto(comp.renderer));

function tr(c) { return c.property("ADBE Transform Group"); }
// EL PADRE VA PRIMERO, Y LA POSICION DESPUES. No es estilo: AE, al emparentar, RECALCULA los valores
// del hijo para conservar su posicion EN EL MUNDO. Si uno pone la posicion pensandola relativa al padre
// y despues emparenta, AE la reinterpreta y la deja donde estaba — o sea alrededor del origen de la
// composicion, que es la esquina superior izquierda.
//
// Asi salio la primera version de esta sonda: las seis caras de la caja quedaron apiladas en la esquina
// en vez de alrededor de su nulo, y al cuadro 0 la unica tinta del cuadro estaba en `y 0..21`. Gaste
// dos mediciones buscando un defecto de orden de dibujo en el motor que no existia.
function cara(nombre, col, w, h, px, py, pz, rx, ry, rz, padre) {
  var s = comp.layers.addSolid(col, nombre, w, h, 1);
  s.threeDLayer = true;
  s.motionBlur = true;
  if (padre) { s.parent = padre; }
  tr(s).property("ADBE Position").setValue([px, py, pz]);
  tr(s).property("ADBE Rotate X").setValue(rx);
  tr(s).property("ADBE Rotate Y").setValue(ry);
  tr(s).property("ADBE Rotate Z").setValue(rz);
  return s;
}
function nulo(nombre, px, py, pz) {
  var nn = comp.layers.addNull();
  nn.name = nombre;
  nn.threeDLayer = true;
  tr(nn).property("ADBE Position").setValue([px, py, pz]);
  return nn;
}

// ================================================================ A · LA CAJA
//
// Seis planos colgados de un nulo. Las caras van a MEDIO LADO del centro y giradas para mirar afuera;
// el nulo gira y se lleva la caja entera. Los seis colores son distintos a proposito: si el motor se
// equivoca en el orden de dibujo o en una rotacion, se ve de una cual cara quedo donde no va.
var L = 150, M = L / 2;
var ejeCaja = nulo("eje-caja", 300, 240, 0);
cara("caja-frente",   [0.36, 0.55, 1.00], L, L, 0, 0, -M,   0,   0, 0, ejeCaja);
cara("caja-atras",    [0.20, 0.30, 0.60], L, L, 0, 0,  M,   0, 180, 0, ejeCaja);
cara("caja-derecha",  [0.66, 0.48, 1.00], L, L, M, 0,  0,   0,  90, 0, ejeCaja);
cara("caja-izquierda",[0.40, 0.28, 0.70], L, L,-M, 0,  0,   0, -90, 0, ejeCaja);
cara("caja-arriba",   [0.31, 0.85, 1.00], L, L, 0,-M,  0,  90,   0, 0, ejeCaja);
cara("caja-abajo",    [0.18, 0.50, 0.62], L, L, 0, M,  0, -90,   0, 0, ejeCaja);
var ryCaja = tr(ejeCaja).property("ADBE Rotate Y");
ryCaja.setValueAtTime(0, 0);
ryCaja.setValueAtTime(CUADROS / FPS, 360);
ryCaja.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
ryCaja.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
var rxCaja = tr(ejeCaja).property("ADBE Rotate X");
rxCaja.setValue(-22);
anotar("A|caja|6 planos de " + L + " colgados de un nulo que gira 360 en " + CUADROS + " cuadros");

// ================================================================ B · LA TARJETA CON ESPESOR
//
// Lo que hace que una tarjeta se vea como un OBJETO y no como un papel es el canto. Son la cara, la
// contracara y cuatro tiras finas. Es la figura mas util de las tres: en el genero, cada panel de
// interfaz que se ve solido es esto.
var TW = 260, TH = 170, E = 14, ME = E / 2;
var ejeTar = nulo("eje-tarjeta", 640, 560, 0);
cara("tar-cara",   [0.95, 0.96, 0.98], TW, TH,  0, 0, -ME,  0,   0, 0, ejeTar);
cara("tar-dorso",  [0.55, 0.58, 0.66], TW, TH,  0, 0,  ME,  0, 180, 0, ejeTar);
cara("tar-canto-d",[0.75, 0.78, 0.86],  E, TH, TW / 2, 0, 0, 0,  90, 0, ejeTar);
cara("tar-canto-i",[0.75, 0.78, 0.86],  E, TH,-TW / 2, 0, 0, 0, -90, 0, ejeTar);
cara("tar-canto-a",[0.82, 0.85, 0.92], TW,  E, 0,-TH / 2, 0, 90,  0, 0, ejeTar);
cara("tar-canto-b",[0.82, 0.85, 0.92], TW,  E, 0, TH / 2, 0,-90,  0, 0, ejeTar);
var ryTar = tr(ejeTar).property("ADBE Rotate Y");
ryTar.setValueAtTime(0, -40);
ryTar.setValueAtTime(CUADROS / FPS, 40);
ryTar.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
ryTar.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
anotar("B|tarjeta|cara + dorso + 4 cantos de " + E + " px, girando de -40 a 40");

// ================================================================ C · LA RUEDA DE PANELES
//
// Ocho paneles en circulo mirando afuera. Es el carrusel que el usuario marco en la referencia de
// Notion, y no necesita nada mas que planos y un nulo.
var R = 190, N8 = 8, i;
var ejeRueda = nulo("eje-rueda", 980, 240, 0);
tr(ejeRueda).property("ADBE Rotate X").setValue(-14);
for (i = 0; i < N8; i++) {
  var ang = i * 360 / N8;
  var rad = ang * Math.PI / 180;
  var claro = 0.30 + 0.06 * (i % 4);
  cara("rueda-" + i, [claro, claro * 1.5, 1.0], 110, 150,
       Math.sin(rad) * R, 0, -Math.cos(rad) * R, 0, ang, 0, ejeRueda);
}
var ryRueda = tr(ejeRueda).property("ADBE Rotate Y");
ryRueda.setValueAtTime(0, 0);
ryRueda.setValueAtTime(CUADROS / FPS, 180);
ryRueda.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
ryRueda.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
anotar("C|rueda|" + N8 + " paneles a radio " + R + ", girando 180");

var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
tr(cam).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2, -2400]);   // lejos, para que las tres figuras entren enteras

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
