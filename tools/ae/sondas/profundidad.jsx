// COMO ORDENA AFTER EFFECTS DOS CAPAS 3D: ¿por distancia al ojo, o por distancia al EJE de la camara?
//
// La pregunta parece un detalle y no lo es. Un rotulo puesto seis unidades delante de su tarjeta, pero
// mas abajo en el cuadro, esta mas LEJOS DEL OJO que la tarjeta. Con distancia euclidea se dibuja
// DETRAS de su propia tarjeta: desaparece. Con distancia al eje esta delante siempre, que es lo que
// uno esperaria de "esta seis unidades adelante".
//
// LA PRUEBA ANTERIOR NO PODIA CONTESTAR ESTO. En B0-PROF las dos capas estaban sobre el eje, y ahi las
// dos definiciones dan el mismo orden: paso con 0,01 de 255 sin distinguir nada. Una prueba que las dos
// hipotesis pasan no es una prueba, es una ilusion de cobertura.
//
// ESTE CASO ESTA CONSTRUIDO PARA QUE LAS TRES RESPUESTAS POSIBLES DEN COLORES DISTINTOS:
//
//   camara en (960, 540, -2000), de un nodo, mirando por su +Z
//   NARANJA en (960,  540, 300)  ->  eje 2300 · ojo 2300
//   AZUL    en (960, 1500, 250)  ->  eje 2250 · ojo 2446
//
//   por EJE       gana el AZUL   (2250 < 2300)
//   por OJO       gana el NARANJA (2300 < 2446)
//   por APILADO   gana el NARANJA (esta arriba en la lista)
//
// Las dos hipotesis que no son se descartan con el mismo cuadro. Y se deja el apilado del lado de la
// euclidea a proposito: si el resultado fuera naranja quedarian dos explicaciones vivas, asi que el
// unico resultado limpio —azul— es tambien el que refuta mi implementacion vieja.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/profundidad.jsx
//   node tools/ae/pieza.mjs B0-EJE --comparar

var RUTA = "C:/ae-probe/profundidad.txt";

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

app.beginUndoGroup("profundidad");

var NOMBRE = "B0-EJE";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 10 / 30;

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
comp.resolutionFactor = [1, 1];
comp.motionBlur = false;
comp.bgColor = [0.05, 0.05, 0.07];

// se crean de abajo hacia arriba: el ultimo creado queda en el indice 1, o sea arriba del apilado
var azul = comp.layers.addSolid([0.16, 0.55, 0.95], "AZUL-mas-cerca-del-eje", 1600, 1600, 1);
azul.threeDLayer = true;
azul.property("ADBE Transform Group").property("ADBE Position").setValue([960, 1500, 250]);

var naranja = comp.layers.addSolid([0.96, 0.36, 0.12], "NARANJA-mas-cerca-del-ojo", 1600, 1600, 1);
naranja.threeDLayer = true;
naranja.property("ADBE Transform Group").property("ADBE Position").setValue([960, 540, 300]);

var fondo = comp.layers.addSolid([0.05, 0.05, 0.07], "fondo", ANCHO, ALTO, 1);
fondo.moveToEnd();

var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
camara.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
camara.property("ADBE Transform Group").property("ADBE Position").setValue([960, 540, -2000]);

anotar("CASO|B0-EJE|naranja=" + naranja.index + "|azul=" + azul.index +
       "|eje: azul 2250 < naranja 2300|ojo: naranja 2300 < azul 2446|apilado: naranja");
anotar("MIRAR|(960,900) cae dentro de los dos: azul => manda el EJE, naranja => manda el OJO o el APILADO");

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
