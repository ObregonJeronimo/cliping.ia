// PRUEBA 3 v2, LADO AFTER EFFECTS. La que decide si el proyecto del MCP es viable.
//
//   El movimiento autorado en AE y el reproducido desde sus keyframes, ¿son el mismo movimiento?
//
// POR QUE HAY UNA v2: LA v1 TENIA UN FALSO POSITIVO DEMOSTRABLE.
//
// La v1 daba cinco OK con errores de 0,002 a 0,125 px y parecia contundente. Una critica adversarial
// del diseño encontro esto, y se comprobo numericamente antes de aceptarlo:
//
//   Cuatro de los cinco casos tenian VELOCIDAD 0 en los dos lados. Con velocidad 0, la conversion
//   `y1 = velocidad * (dt/dv) * x1` colapsa a `y1 = 0, y2 = 1` SIN IMPORTAR CUANTO VALGA dt. O sea
//   que toda la parte con unidades —la normalizacion de velocidad a pendiente, donde vive un error de
//   px/s contra px/cuadro— no se ejecutaba. El unico caso con velocidad distinta de cero tenia dt = 1,
//   que es el neutro de la multiplicacion.
//
//   Medido: una conversion a la que le falte POR COMPLETO el factor dt da 0,0000 px de diferencia en
//   los cinco casos de la v1. Con dt = 0,4 ese mismo error vale 416 px.
//
// La leccion, que vale mas que el arreglo: UN CASO QUE PASA NO ES UN CASO QUE PRUEBA. Cinco verdes con
// un poder discriminante de 686 px contra la interpolacion lineal se veian como una prueba fuerte, y
// el termino mas fragil de la formula no se habia ejecutado ni una vez.
//
// QUE CAMBIA EN LA v2
//   · dt DEJA DE SER 1 en los casos con velocidad, y hay velocidades NEGATIVAS y recorridos al reves.
//   · Se vuelca `valueAtTime` de cada cuadro. Eso separa DOS preguntas que la v1 mezclaba en un solo
//     numero: "¿mi matematica reproduce la de AE?" (prediccion contra valueAtTime) y "¿mi medicion por
//     pixeles es fiel?" (valueAtTime contra centroide). Es una linea y desbloquea todo lo demas.
//   · Se vuelcan LOS TIPOS DE INTERPOLACION y LAS TANGENTES ESPACIALES. Sin eso el formato del MCP no
//     puede representar un corte (HOLD) ni saber que una trayectoria era curva: el motor no fallaria
//     ruidosamente, daria algo PARECIDO, que es la falla que no se puede señalar.
//   · Casos nuevos: trayectoria curva (SE ESPERA QUE NO SE PUEDA CONVERTIR — es la frontera, medida en
//     vez de esquivada), tipos HOLD/LINEAL, movimiento en Y, escala con influencia DISTINTA POR EJE, y
//     un piso de ruido del instrumento.
//   · El keyframe del medio ya NO lleva ease explicito: se deja el auto-bezier que calcula AE y se lee
//     lo que guardo. Con velocidad 0 en el medio los dos tramos eran independientes y el encadenamiento
//     no se probaba; es menos codigo y prueba mucho mas.
//   · Se borra la carpeta de cada caso antes de escribir. Si `saveFrameToPng` falla mudo, un PNG de la
//     corrida anterior queda ahi, completo y con IEND, indistinguible de uno nuevo.
//
// LO QUE YA SE APRENDIO A LOS GOLPES Y SIGUE APLICADO:
//   · resolutionFactor se fuerza a [1,1]: con [2,2] el PNG sale a la mitad y la medicion entera miente.
//   · saveFrameToPng NO se puede verificar desde aca (File.exists miente recien escrito) y falla mudo
//     con un modal diferido. Verifica Node, del otro lado, mirando el contenido.
//   · Registro paso a paso y centinela al final.
//   · Nunca `"" + excepcion`: ExtendScript no convierte un Error a cadena y ese error si es fatal.

var RUTA = "C:/ae-probe/p3/datos.txt";
var DIR = "C:/ae-probe/p3";
var ANCHO = 1920, ALTO = 1080, FPS = 30, DUR = 1;
var LADO = 200;
var X0 = 300, X1 = 1600, YFIJA = 540;

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

function tresDigitos(n) {
  if (n < 10) { return "00" + n; }
  if (n < 100) { return "0" + n; }
  return "" + n;
}

function comoLista(v) {
  if (v === null || v === undefined) { return ""; }
  if (typeof v.length === "number") { return v.join(";"); }
  return "" + v;
}

var carpeta = new Folder(DIR);
if (!carpeta.exists) { carpeta.create(); }
var viejo = new File(RUTA);
if (viejo.exists) { viejo.remove(); }
anotar("VERSION|AE " + app.version);

// LOS VALORES DE LOS ENUMS SE VUELCAN, NO SE ADIVINAN DEL OTRO LADO.
// KeyframeInterpolationType.HOLD es un numero, y hardcodearlo en el lector es la clase de dato que se
// vuelve falso en silencio cuando cambia la version. Se pregunta y se manda.
anotar("ENUM|LINEAL|" + KeyframeInterpolationType.LINEAR +
       "|BEZIER|" + KeyframeInterpolationType.BEZIER +
       "|HOLD|" + KeyframeInterpolationType.HOLD);

// LAS DOS CAPAS PARA QUE UN FALLO NO ABRA UNA VENTANA MODAL.
// Un cartel de AE bloquea la aplicacion entera hasta que una persona toca Aceptar, y el texto del
// error vive en la pantalla y en ningun archivo. Con nadie delante de la maquina eso congela el
// trabajo Y pierde la unica copia de lo que salio mal.
//   · beginSuppressDialogs tapa los avisos que AE genera por su cuenta.
//   · el try de abajo convierte cualquier error de script en una LINEA DEL BUZON, con numero de
//     linea — que es mas informacion que la que da la ventana.
// La tercera capa vive afuera: tools/ae/guardian.ps1, que lee y cierra lo que se escape.
if (typeof app.beginSuppressDialogs === "function") {
  app.beginSuppressDialogs();
  anotar("DIALOGOS|suprimidos");
}

try {

app.beginUndoGroup("prueba 3 v2");

var CASOS = ["P3-A", "P3-B", "P3-C", "P3-D", "P3-E", "P3-F", "P3-G", "P3-H", "P3-I", "P3-J"];

// borrar composiciones viejas
var n = app.project.numItems;
while (n > 0) {
  var itm = app.project.item(n);
  if (itm instanceof CompItem) {
    var j;
    for (j = 0; j < CASOS.length; j++) {
      if (itm.name === CASOS[j]) { itm.remove(); break; }
    }
  }
  n = n - 1;
}

// Y BORRAR LOS PNG VIEJOS. Si saveFrameToPng falla mudo en un cuadro, el archivo de la corrida
// anterior queda ahi entero, con su IEND, y ningun verificador lo puede distinguir de uno nuevo.
var b;
for (b = 0; b < CASOS.length; b++) {
  var sub = new Folder(DIR + "/" + CASOS[b]);
  if (sub.exists) {
    var previos = sub.getFiles("*.png");
    var p;
    for (p = 0; p < previos.length; p++) { previos[p].remove(); }
  }
}
anotar("LIMPIEZA|ok");

// ---------------------------------------------------------------- utilidades
function nuevaComp(nombre) {
  // media segundo de cola: una comp de 1 s tiene los cuadros 0 a 29, o sea que t=1.0 —justo donde
  // esta el ultimo keyframe— cae AFUERA y AE devuelve un cuadro vacio sin quejarse.
  var c = app.project.items.addComp(nombre, ANCHO, ALTO, 1, DUR + 0.5, FPS);
  c.resolutionFactor = [1, 1];
  c.motionBlur = false;
  return c;
}

function nuevoSolido(comp, ancho, alto) {
  var s = comp.layers.addSolid([1, 0, 0], "ROJO", ancho || LADO, alto || LADO, 1);
  s.motionBlur = false;
  return s;
}

// Volcar TODO lo que AE guarda de una propiedad: eases, tipos de interpolacion, tangentes espaciales y
// banderas de continuidad. Lo que no se vuelca, el motor web no lo puede saber — y no va a fallar
// ruidosamente, va a dar algo parecido.
function volcarKeys(caso, prop, etiqueta) {
  var expr = "no";
  try { expr = prop.expressionEnabled ? "SI" : "no"; } catch (exExpr) { expr = "?"; }
  anotar("PROP|" + caso + "|" + etiqueta + "|keys=" + prop.numKeys + "|expresion=" + expr);

  var k;
  for (k = 1; k <= prop.numKeys; k++) {
    var ein = prop.keyInTemporalEase(k);
    var eout = prop.keyOutTemporalEase(k);
    var partes = ["KEY", caso, etiqueta, k, prop.keyTime(k), comoLista(prop.keyValue(k)), ein.length];
    var q;
    for (q = 0; q < ein.length; q++) { partes[partes.length] = ein[q].speed + ";" + ein[q].influence; }
    for (q = 0; q < eout.length; q++) { partes[partes.length] = eout[q].speed + ";" + eout[q].influence; }
    anotar(partes.join("|"));

    // tipos de interpolacion por lado: AE permite entrada de un tipo y salida de otro
    var tin = "?", tout = "?", rov = "?", cont = "?", auto = "?";
    try { tin = prop.keyInInterpolationType(k); } catch (e1) { tin = "err"; }
    try { tout = prop.keyOutInterpolationType(k); } catch (e2) { tout = "err"; }
    try { rov = prop.keyRoving(k) ? "SI" : "no"; } catch (e3) { rov = "na"; }
    try { cont = prop.keyTemporalContinuous(k) ? "SI" : "no"; } catch (e4) { cont = "na"; }
    try { auto = prop.keyTemporalAutoBezier(k) ? "SI" : "no"; } catch (e5) { auto = "na"; }
    anotar("TIPO|" + caso + "|" + etiqueta + "|" + k + "|" + tin + "|" + tout + "|" + rov + "|" + cont + "|" + auto);

    // TANGENTES ESPACIALES: el dato sin el cual una trayectoria curva se convierte en una recta
    // "parecida". Solo existen en propiedades espaciales; en las demas la llamada tira y se anota na.
    var sin = "na", sout = "na", sauto = "na";
    try { sin = comoLista(prop.keyInSpatialTangent(k)); } catch (e6) { sin = "na"; }
    try { sout = comoLista(prop.keyOutSpatialTangent(k)); } catch (e7) { sout = "na"; }
    try { sauto = prop.keySpatialAutoBezier(k) ? "SI" : "no"; } catch (e8) { sauto = "na"; }
    anotar("ESPACIAL|" + caso + "|" + etiqueta + "|" + k + "|" + sin + "|" + sout + "|" + sauto);
  }
}

// GUARDAR LOS CUADROS Y, EN LA MISMA PASADA, EL VALOR QUE AE DICE QUE TIENE LA PROPIEDAD.
// Esa segunda columna es lo mas barato de toda la sonda y lo que mas devuelve: separa "mi matematica
// contra la de AE" de "mi medicion por pixeles contra el render de AE". Con un solo numero, un error
// de conversion y un sesgo del instrumento son indistinguibles — y si se compensaran, el resultado
// saldria MEJOR de lo que la conversion merece.
function guardarCuadros(caso, comp, prop) {
  var sub = new Folder(DIR + "/" + caso);
  if (!sub.exists) { sub.create(); }
  var total = Math.round(DUR * FPS);
  var k;
  for (k = 0; k <= total; k++) {
    var t = k * comp.frameDuration;
    comp.saveFrameToPng(t, new File(DIR + "/" + caso + "/f" + tresDigitos(k) + ".png"));
    anotar("CUADRO|" + caso + "|" + k + "|" + t + "|" + caso + "/f" + tresDigitos(k) + ".png");
    if (prop) { anotar("VALOR|" + caso + "|" + k + "|" + comoLista(prop.valueAtTime(t, false))); }
  }
  anotar("CUADROS_PEDIDOS|" + caso + "|" + (total + 1));
}

function bezierEnTodos(prop) {
  var k;
  for (k = 1; k <= prop.numKeys; k++) {
    prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
  }
}

anotar("MUNDO|" + ANCHO + "|" + ALTO + "|" + FPS + "|" + DUR + "|" + LADO);

// ================================================================ A — el caso base
var cA = nuevaComp("P3-A");
var pA = nuevoSolido(cA).property("ADBE Transform Group").property("ADBE Position");
pA.setValueAtTime(0, [X0, YFIJA]);
pA.setValueAtTime(DUR, [X1, YFIJA]);
bezierEnTodos(pA);
var suave = new KeyframeEase(0, 33.333333);
pA.setTemporalEaseAtKey(1, [suave], [suave]);
pA.setTemporalEaseAtKey(2, [suave], [suave]);
anotar("CASO|P3-A|posicion 2D, Easy Ease simetrico, dt=1|pos|x|ok");
volcarKeys("P3-A", pA, "pos");
guardarCuadros("P3-A", cA, pA);

// ================================================================ B — asimetrico CON velocidad
// La v1 tenia B con velocidad 0 de los dos lados. Ahora la salida tiene velocidad, asi que el termino
// que la v1 nunca ejecutaba se ejecuta tambien aca, y con influencias muy distintas de cada lado.
var cB = nuevaComp("P3-B");
var pB = nuevoSolido(cB).property("ADBE Transform Group").property("ADBE Position");
pB.setValueAtTime(0, [X0, YFIJA]);
pB.setValueAtTime(DUR, [X1, YFIJA]);
bezierEnTodos(pB);
pB.setTemporalEaseAtKey(1, [new KeyframeEase(0, 80)], [new KeyframeEase(650, 80)]);
pB.setTemporalEaseAtKey(2, [new KeyframeEase(0, 15)], [new KeyframeEase(0, 15)]);
anotar("CASO|P3-B|posicion 2D, influencia 80 contra 15, velocidad de salida 650|pos|x|ok");
volcarKeys("P3-B", pB, "pos");
guardarCuadros("P3-B", cB, pB);

// ================================================================ C — sobrepaso CON dt = 0.4
// EL ARREGLO DEL FALSO POSITIVO. El segundo keyframe cae en t=0.4, asi que dt deja de ser el neutro
// multiplicativo. Una conversion sin el factor dt da 416 px de error aca — y daba 0,0000 en la v1.
// Sobre una posicion 2D el sobrepaso es geometricamente imposible (el ease gobierna el avance por
// largo de arco y el arco no puede exceder el segmento): hay que separar dimensiones.
var cC = nuevaComp("P3-C");
var sC = nuevoSolido(cC);
var trC = sC.property("ADBE Transform Group");
var sepC = false;
try { trC.property("ADBE Position").dimensionsSeparated = true; sepC = true; }
catch (exSepC) { anotar("NOTA|P3-C|no se pudieron separar dimensiones: " + texto(exSepC)); }
anotar("SEPARADAS|P3-C|" + sepC);
var xC = sepC ? trC.property("ADBE Position_0") : trC.property("ADBE Position");
if (sepC) { trC.property("ADBE Position_1").setValue(YFIJA); }
xC.setValueAtTime(0, X0);
xC.setValueAtTime(DUR * 0.4, X1);
bezierEnTodos(xC);
// recorrido 1300 px en 0,4 s => velocidad media 3250 px/s. Con 9750 (el triple) e influencia 40,
// y1 = 9750*(0.4/1300)*0.4 = 1.2: la manija se va arriba del destino. Sobrepaso de verdad.
xC.setTemporalEaseAtKey(1, [new KeyframeEase(0, 40)], [new KeyframeEase(9750, 40)]);
xC.setTemporalEaseAtKey(2, [new KeyframeEase(0, 60)], [new KeyframeEase(0, 60)]);
anotar("CASO|P3-C|X separada, sobrepaso, dt=0.4 (el termino que la v1 nunca ejecuto)|pos|x|ok");
volcarKeys("P3-C", xC, "posX");
guardarCuadros("P3-C", cC, xC);

// ================================================================ D — al reves, velocidad NEGATIVA
// dv < 0 y velocidad < 0. Un Math.abs de mas, o un dv calculado como distancia (que nunca es
// negativa), pasa desapercibido en todos los casos que van de izquierda a derecha.
var cD = nuevaComp("P3-D");
var sD = nuevoSolido(cD);
var trD = sD.property("ADBE Transform Group");
var sepD = false;
try { trD.property("ADBE Position").dimensionsSeparated = true; sepD = true; }
catch (exSepD) { anotar("NOTA|P3-D|no se pudieron separar dimensiones: " + texto(exSepD)); }
anotar("SEPARADAS|P3-D|" + sepD);
var xD = sepD ? trD.property("ADBE Position_0") : trD.property("ADBE Position");
if (sepD) { trD.property("ADBE Position_1").setValue(YFIJA); }
xD.setValueAtTime(0, X1);
xD.setValueAtTime(DUR * 0.6, X0);
bezierEnTodos(xD);
xD.setTemporalEaseAtKey(1, [new KeyframeEase(0, 45)], [new KeyframeEase(-4300, 45)]);
xD.setTemporalEaseAtKey(2, [new KeyframeEase(0, 25)], [new KeyframeEase(0, 25)]);
anotar("CASO|P3-D|X separada AL REVES (1600->300) con velocidad negativa, dt=0.6|pos|x|ok");
volcarKeys("P3-D", xD, "posX");
guardarCuadros("P3-D", cD, xD);

// ================================================================ E — tres keyframes, el del medio SIN ease
// La v1 le ponia Easy Ease al keyframe del medio, o sea velocidad 0: el objeto se detenia ahi y los
// dos tramos quedaban independientes. La conversion de a pares era trivialmente correcta y el
// encadenamiento no se probaba. Dejando el auto-bezier que AE calcula solo, el keyframe del medio
// tiene velocidad distinta de cero y la MISMA velocidad en unidades/s se normaliza distinto de cada
// lado, porque dt y dv cambian. Es menos codigo y prueba mucho mas.
var cE = nuevaComp("P3-E");
var pE = nuevoSolido(cE).property("ADBE Transform Group").property("ADBE Position");
pE.setValueAtTime(0, [X0, YFIJA]);
pE.setValueAtTime(DUR * 0.35, [X0 + 300, YFIJA]);
pE.setValueAtTime(DUR, [X1, YFIJA]);
bezierEnTodos(pE);
pE.setTemporalEaseAtKey(1, [suave], [suave]);
pE.setTemporalEaseAtKey(3, [suave], [suave]);
// el keyframe 2 NO se toca: queda con lo que AE calculo
anotar("CASO|P3-E|tres keyframes, el del medio con el auto-bezier de AE|pos|x|ok");
volcarKeys("P3-E", pE, "pos");
guardarCuadros("P3-E", cE, pE);

// ================================================================ F — escala con influencia DISTINTA POR EJE
// La v1 aplicaba los tres eases IDENTICOS, asi que leer siempre el indice 0 —que es exactamente lo que
// el codigo hace— era invisible. Con 70 en X y 20 en Y, si el lector confunde los indices se ve.
// Y se mide ancho y alto por separado, porque sqrt(area) promedia los dos ejes por construccion.
var cF = nuevaComp("P3-F");
var sF = nuevoSolido(cF);
var trF = sF.property("ADBE Transform Group");
trF.property("ADBE Position").setValue([ANCHO / 2, ALTO / 2]);
var escF = trF.property("ADBE Scale");
escF.setValue([100, 100, 100]);
try { escF.dimensionsSeparated = false; } catch (exNoSep) { /* la escala no siempre lo permite */ }
escF.setValueAtTime(0, [40, 40, 100]);
escF.setValueAtTime(DUR, [340, 340, 100]);
bezierEnTodos(escF);
escF.setTemporalEaseAtKey(1,
  [new KeyframeEase(0, 70), new KeyframeEase(0, 20), new KeyframeEase(0, 70)],
  [new KeyframeEase(0, 70), new KeyframeEase(0, 20), new KeyframeEase(0, 70)]);
escF.setTemporalEaseAtKey(2,
  [new KeyframeEase(0, 20), new KeyframeEase(0, 70), new KeyframeEase(0, 20)],
  [new KeyframeEase(0, 20), new KeyframeEase(0, 70), new KeyframeEase(0, 20)]);
anotar("CASO|P3-F|escala 40->340 con influencia DISTINTA por eje (70/20 contra 20/70)|escala|xy|ok");
volcarKeys("P3-F", escF, "escala");
guardarCuadros("P3-F", cF, escF);

// ================================================================ G — movimiento en Y
// Ningun caso de la v1 se movia en Y, y el veredicto cubria el eje Y. El origen de AE esta arriba a la
// izquierda y crece hacia abajo; el motor destino puede tener el origen centrado, Y hacia arriba, o
// unidades de mundo. Es el bug de portacion mas clasico que existe y salia verde por no probarse.
var cG = nuevaComp("P3-G");
var sG = nuevoSolido(cG);
var trG = sG.property("ADBE Transform Group");
var sepG = false;
try { trG.property("ADBE Position").dimensionsSeparated = true; sepG = true; }
catch (exSepG) { anotar("NOTA|P3-G|no se pudieron separar dimensiones: " + texto(exSepG)); }
anotar("SEPARADAS|P3-G|" + sepG);
var yG = sepG ? trG.property("ADBE Position_1") : trG.property("ADBE Position");
if (sepG) { trG.property("ADBE Position_0").setValue(ANCHO / 2); }
yG.setValueAtTime(0, 200);
yG.setValueAtTime(DUR * 0.7, 880);
bezierEnTodos(yG);
yG.setTemporalEaseAtKey(1, [new KeyframeEase(0, 55)], [new KeyframeEase(1600, 55)]);
yG.setTemporalEaseAtKey(2, [new KeyframeEase(0, 30)], [new KeyframeEase(0, 30)]);
anotar("CASO|P3-G|Y separada, 200->880, dt=0.7, velocidad 1600|pos|y|ok");
volcarKeys("P3-G", yG, "posY");
guardarCuadros("P3-G", cG, yG);

// ================================================================ H — TRAYECTORIA CURVA (la frontera)
// SE ESPERA QUE NO SE PUEDA CONVERTIR. Tres keyframes con y distinta: AE aplica auto-bezier ESPACIAL
// por defecto y la trayectoria sale curva sin que nadie la pida. Ahi el ease temporal no gobierna cada
// eje: gobierna el avance por LARGO DE ARCO sobre la curva, y convertir eje por eje da otra cosa.
//
// El criterio de exito de este caso NO es que el error sea chico: es que el lector DETECTE que las
// tangentes espaciales no son nulas y SE NIEGUE a convertir. Negarse es barato; "salio parecido" no se
// puede señalar. Medir la frontera vale mas que esquivarla.
var cH = nuevaComp("P3-H");
var pH = nuevoSolido(cH).property("ADBE Transform Group").property("ADBE Position");
pH.setValueAtTime(0, [300, 800]);
pH.setValueAtTime(DUR * 0.5, [900, 300]);
pH.setValueAtTime(DUR, [1600, 700]);
bezierEnTodos(pH);
pH.setTemporalEaseAtKey(1, [suave], [suave]);
pH.setTemporalEaseAtKey(3, [suave], [suave]);

// HAY QUE PEDIR LA CURVA A MANO, Y ESO ES UN HALLAZGO EN SI MISMO.
// La primera version de este caso solo ponia tres keyframes con y distinta esperando que AE aplicara
// su auto-bezier espacial, como hace en la interfaz. NO LO HACE: el volcado devolvio tangentes
// 0;0;0 y keySpatialAutoBezier = no. O sea que UN KEYFRAME CREADO POR SCRIPT NACE CON INTERPOLACION
// ESPACIAL LINEAL, no con la que se ve al animar a mano.
//
// Importa mucho mas alla de esta prueba: el MCP va a autorar por script, asi que sus trayectorias van
// a ser rectas por defecto y NO se van a parecer a lo que un animador obtiene haciendo lo mismo en la
// interfaz. Es una diferencia silenciosa entre "lo que hace Claude" y "lo que hace una persona".
var h;
for (h = 1; h <= pH.numKeys; h++) {
  try { pH.setSpatialAutoBezierAtKey(h, true); }
  catch (exCurva) { anotar("NOTA|P3-H|no se pudo pedir auto-bezier espacial: " + texto(exCurva)); }
}
anotar("CASO|P3-H|TRAYECTORIA CURVA: se espera que el lector se NIEGUE a convertir|pos|xy|frontera");
volcarKeys("P3-H", pH, "pos");
guardarCuadros("P3-H", cH, pH);

// ================================================================ I — tipos HOLD y LINEAL
// El formato de la v1 no tenia campo para el tipo de interpolacion. Un keyframe HOLD exporta un ease
// igual (AE devuelve algo en keyOutTemporalEase) y el motor lo reproduce como una rampa suave: un
// corte seco se convierte en un barrido. Y el HOLD es de lo primero que usa cualquier animador.
var cI = nuevaComp("P3-I");
var sI = nuevoSolido(cI);
var trI = sI.property("ADBE Transform Group");
var sepI = false;
try { trI.property("ADBE Position").dimensionsSeparated = true; sepI = true; }
catch (exSepI) { anotar("NOTA|P3-I|no se pudieron separar dimensiones: " + texto(exSepI)); }
anotar("SEPARADAS|P3-I|" + sepI);
var xI = sepI ? trI.property("ADBE Position_0") : trI.property("ADBE Position");
if (sepI) { trI.property("ADBE Position_1").setValue(YFIJA); }
xI.setValueAtTime(0, 300);
xI.setValueAtTime(DUR * 0.3, 800);
xI.setValueAtTime(DUR * 0.6, 1000);
xI.setValueAtTime(DUR, 1600);
try {
  xI.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.HOLD);
  xI.setInterpolationTypeAtKey(2, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.LINEAR);
  xI.setInterpolationTypeAtKey(3, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.BEZIER);
  xI.setInterpolationTypeAtKey(4, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
  xI.setTemporalEaseAtKey(4, [new KeyframeEase(0, 75)], [new KeyframeEase(0, 75)]);
} catch (exTipos) {
  anotar("NOTA|P3-I|no se pudieron poner los tipos: " + texto(exTipos));
}
anotar("CASO|P3-I|tramos HOLD, LINEAL y BEZIER encadenados|pos|x|ok");
volcarKeys("P3-I", xI, "posX");
guardarCuadros("P3-I", cI, xI);

// ================================================================ J — el piso de ruido del instrumento
// Cuanto error mide el centroide cuando el objeto esta QUIETO en una posicion fraccionaria. Sin este
// numero no se sabe cuanto de los 0,010 px es la conversion y cuanto es como AE rasteriza un borde.
// Y sin el, un umbral de regresion no se puede fijar: hoy el umbral de 1 px esta 70x por encima de lo
// medido, o sea que el error podria multiplicarse por setenta y seguir dando verde.
var cJ = nuevaComp("P3-J");
var sJ = nuevoSolido(cJ);
var posJ = sJ.property("ADBE Transform Group").property("ADBE Position");
var subJ = new Folder(DIR + "/P3-J");
if (!subJ.exists) { subJ.create(); }
var FRAC = [300, 300.25, 300.37, 300.5, 300.63, 300.75, 301];
anotar("CASO|P3-J|piso de ruido: el solido QUIETO en posiciones fraccionarias|piso|x|piso");
var w;
for (w = 0; w < FRAC.length; w++) {
  posJ.setValue([FRAC[w], YFIJA]);
  cJ.saveFrameToPng(0, new File(DIR + "/P3-J/f" + tresDigitos(w) + ".png"));
  anotar("CUADRO|P3-J|" + w + "|0|P3-J/f" + tresDigitos(w) + ".png");
  anotar("VALOR|P3-J|" + w + "|" + FRAC[w] + ";" + YFIJA + ";0");
}
anotar("CUADROS_PEDIDOS|P3-J|" + FRAC.length);

app.endUndoGroup();

} catch (exTodo) {
  // EL ERROR LLEGA COMO DATO, NO COMO VENTANA. Con numero de linea, que la ventana tambien da, pero
  // ademas queda escrito: se puede leer despues, desde otra maquina, y sin que nadie saque una foto.
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) { anotar("ERROR|no se pudo cerrar el grupo de deshacer"); }
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  // EL CENTINELA SE ESCRIBE SIEMPRE, tambien cuando hubo error. Si solo se escribiera al terminar
  // bien, el que espera del otro lado no puede distinguir "fallo" de "todavia esta trabajando", y se
  // queda esperando el tiempo maximo por nada. Fallar rapido tambien es informacion.
  anotar("--- fin ---");
}
