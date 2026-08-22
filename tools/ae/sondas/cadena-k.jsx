// LA CADENA DE LA PIEZA-K, PROBADA ANTES DE CONSTRUIR 120 CAPAS ENCIMA.
//
// La PIEZA-K descansa en algo que las piezas anteriores casi no usaban: TODO su acabado son PNG
// horneados. Degradados, esquinas redondeadas, sombras, resplandores — nada de eso existe en el motor
// (cero ocurrencias de gradient, roundRect, shadowBlur y blur en `motor/comp3d.html`) y todo entra como
// imagen. Si el camino AE -> documento -> navegador deforma las imagenes, la pieza entera esta mal y me
// entero al final, con cuarenta y dos recursos hechos.
//
// Asi que primero pasa el PATRON, que esta disenado para delatar. Una fotografia esconde cuatro de los
// cinco modos de fallar (cuaderno :1918 y :1971): con una foto, un espacio de color mal convertido se
// ve como "quedo un poco mas oscura" y se acepta.
//
// LO QUE ESTA SONDA PONE A PRUEBA, y por que cada caso:
//   A  imagen 3D frontal y quieta        el caso base: color, alfa, recorte, orientacion
//   B  imagen 3D girada 34 grados        escorzo y filtrado: casi todos los recursos de la pieza viven girados
//   C  imagen 3D con la camara DENTRO    el anillo de telefonos es esto, y es el momento mas fuerte
//   D  imagen 2D                         los recursos de interfaz que van planos al frente
//   E  imagen 3D FUERA de foco           la profundidad de campo es el reemplazo del desenfoque por capa,
//                                        y ninguna pieza anterior la uso sobre una IMAGEN
//
// USO
//   node tools/ae/patron.mjs C:/ae-probe/recursos-k/patron-verificacion.png 1200 800
//   node tools/ae/es3-check.mjs tools/ae/sondas/cadena-k.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/cadena-k.jsx
//   printf 'SONDA-CADENA-K' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/cadena-k.json
//   node tools/ae/cuadro-ae.mjs SONDA-CADENA-K 0,20,40
//   node tools/ae/mascara-check.mjs C:/ae-probe/cadena-k.json C:/ae-probe/ae-cuadros/SONDA-CADENA-K 0,20,40

var RUTA = "C:/ae-probe/cadena-k.txt";
var RECURSOS = "C:/ae-probe/recursos-k";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 60;

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("CADENA-K");

var NOMBRE = "SONDA-CADENA-K";
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
comp.bgColor = [0.95, 0.94, 0.97];
comp.openInViewer();

function tr(c) { return c.property("ADBE Transform Group"); }
function pos(c) { return tr(c).property("ADBE Position"); }
function esc(c) { return tr(c).property("ADBE Scale"); }

// EL NOMBRE DEL ARCHIVO ES LA CLAVE, y `recurso()` le pega ".png" a mano: por ese helper un .jpg no
// entra. Todos los recursos de esta pieza son PNG, asi que alcanza.
var cache = {};
function recurso(archivo) {
  if (cache[archivo]) { return cache[archivo]; }
  var f = new File(RECURSOS + "/" + archivo + ".png");
  if (!f.exists) { throw new Error("falta el recurso " + archivo + " en " + RECURSOS); }
  var itm = app.project.importFile(new ImportOptions(f));
  cache[archivo] = itm;
  return itm;
}
function img(archivo, nombre, x, y, z, escala) {
  var c = comp.layers.add(recurso(archivo));
  c.name = nombre;
  c.threeDLayer = true;
  c.motionBlur = true;
  pos(c).setValue([x, y, z]);
  esc(c).setValue([escala, escala, escala]);
  return c;
}

// ---------------------------------------------------------------- la camara
// zoom igual a la distancia: el plano z=0 se dibuja 1:1 y las coordenadas 2D y las 3D coinciden.
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
pos(cam).setValue([ANCHO / 2, ALTO / 2, -2000]);
cam.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
var opc = cam.property("ADBE Camera Options Group");
opc.property("ADBE Camera Zoom").setValue(2000);
// LA PROFUNDIDAD DE CAMPO PRENDIDA, que es lo que en la pieza reemplaza al desenfoque por capa.
// El plano de foco se queda en z=0: lo que este ahi sale nitido y lo demas no.
opc.property("ADBE Camera Depth of Field").setValue(1);
opc.property("ADBE Camera Focus Distance").setValue(2000);
// LA APERTURA VA EN 10 Y NO EN 90, Y LO DECIDIO UNA MEDICION.
//
// Con 90, `foco-check` reprueba: el caso C —la camara ADENTRO del anillo, que es el momento mas fuerte
// de la pieza— pide 210 px de circulo de confusion contra un limite de 24, y ademas ocupa el 91% del
// cuadro. O sea que el sujeto principal sale como una mancha. El motivo es geometrico y no se arregla
// con gusto: el circulo crece con |d - enfoque| / d, y una capa a 600 de la camara con el foco en 2000
// da un factor de 2,33.
//
// CONSECUENCIA PARA LA PIEZA, y es una decision de arte forzada por un numero: la profundidad de campo
// NO puede estar prendida toda la pieza. Va alta en los tiempos de tipografia —donde el relevo de foco
// palabra por palabra ES el mecanismo— y baja a cero antes de meterse en el tunel de telefonos.
// `apertura` se exporta por cuadro (exportar.jsx:701), asi que se anima como cualquier otra propiedad.
opc.property("ADBE Camera Aperture").setValue(10);

// ---------------------------------------------------------------- A · frontal y quieta
var a = img("patron-verificacion", "A-frontal", 420, 300, 0, 34);

// ---------------------------------------------------------------- B · girada
var b = img("patron-verificacion", "B-girada", 1180, 300, 0, 34);
tr(b).property("ADBE Rotate Y").setValue(34);

// ---------------------------------------------------------------- C · la camara ADENTRO
// El anillo de telefonos de la pieza es exactamente esto: un plano por delante del ojo mirando hacia
// atras. Si el motor no lo dibuja igual que AE, ese momento —el mas fuerte de la pieza— sale mal.
var c = img("patron-verificacion", "C-cerca", 420, 800, -1400, 34);
tr(c).property("ADBE Rotate Y").setValue(-58);

// ---------------------------------------------------------------- D · en 2D
var d = comp.layers.add(recurso("patron-verificacion"));
d.name = "D-plana";
d.motionBlur = true;
pos(d).setValue([1180, 800]);
esc(d).setValue([26, 26]);

// ---------------------------------------------------------------- E · fuera de foco
// A z=+900 con el foco en 2000 y apertura 10, el circulo da 3,1 px: poco, pero es desenfoque de
// verdad sobre una IMAGEN, que es lo que ninguna pieza anterior probo.
var e = img("patron-verificacion", "E-fuera-de-foco", 960, 550, 900, 34);

// una capa que se mueve, para que el obturador tambien entre en la prueba
var f = img("patron-verificacion", "F-movida", 960, 120, 0, 14);
var px = tr(f).property("ADBE Position");
px.setValueAtTime(0, [560, 120, 0]);
px.setValueAtTime(CUADROS / FPS, [1360, 120, 0]);
px.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
px.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);

comp.time = 0;
anotar("SONDA|" + NOMBRE + "|" + ANCHO + "x" + ALTO + "|" + CUADROS + " cuadros");
anotar("CAPAS|" + comp.numLayers);
anotar("RECURSOS|" + RECURSOS);
anotar("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
