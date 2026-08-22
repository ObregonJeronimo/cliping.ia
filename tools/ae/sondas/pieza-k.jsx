// PIEZA-K — version propia de un aviso de lanzamiento SaaS, contra una referencia medida.
//
// ================================================================ DE DONDE SALE
//
// El usuario pidio un 1:1 de un aviso de 33 s de una agencia de animacion: mismas animaciones, misma
// coreografia y beat, mismos objetos 3D, y las unicas licencias son la tipografia y que los VIDEOS se
// reemplacen por imagenes fijas.
//
// LA REFERENCIA NO SE PUDO BAJAR. YouTube exige autenticacion para los streams y con el cliente `tv`
// contesta "This video is DRM protected"; las cookies de Chrome, Edge y Brave fallan con el cifrado
// App-Bound (yt-dlp #10927); y abrir la pagina en el panel del navegador termina en una verificacion
// anti-bot. Lo unico que se pudo bajar es el GUION GRAFICO: 36 cuadros, uno por segundo.
//
// ASI QUE LA COREOGRAFIA FINA ESTA INFERIDA, Y HAY QUE DECIRLO. A 1 cuadro por segundo un corte duro y
// un acercamiento de medio segundo se ven IGUAL — es exactamente el error que costo caro en la PIEZA-H.
// Lo que si esta medido de la referencia: la estructura (36 cuadros descritos uno por uno), los cortes
// (diferencia entre cuadros consecutivos) y el perfil de energia. Lo que rellena el resto es
// `reference/gramatica-del-genero.md`, que sale de ocho avisos medidos a 30 fps.
//
// ================================================================ CUANTO DE UN 1:1 ES ESTO
//
// ~80%, y no falla parejo. Medido contra lo que el motor puede, no estimado:
//   coreografia y beat  ~95%   la pieza es planos con textura delante de una camara, que es la tesis
//                              del motor ("TODAS LAS CAPAS SON UN PLANO CON UNA TEXTURA")
//   objetos 3D          ~85%   telefonos, tarjetas y paneles son losas: 6 planos colgados de un nulo,
//                              con 0,20%-2,26% de desvio medido contra AE
//   acabado             ~65%   y aca esta toda la perdida
//
// EL MOTOR NO TIENE NI UN DEGRADADO, NI UNA ESQUINA REDONDEADA, NI UNA SOMBRA SUAVE, NI UN DESENFOQUE
// DE CAPA, NI PARTICULAS. Verificado por grep: cero ocurrencias de cada uno en `motor/comp3d.html`.
// Todo eso se hornea en PNG con Skia y horneado se ve identico MIENTRAS NO TENGA QUE CAMBIAR.
//
// Lo que se pierde de verdad es lo que cambia en el tiempo, y hay una cosa grande: el mecanismo central
// de la referencia es el RELEVO DE NITIDEZ palabra por palabra —una borrosa que se afila mientras la
// anterior se desenfoca— y aparece en 12 de los 33 segundos. Eso es desenfoque por capa animado y no
// existe. Se reemplaza con PROFUNDIDAD DE CAMPO REAL de camara, que si desenfoca por capa: una capa de
// texto por palabra, cada una a su Z, y el foco viajando de una a otra.
//
// ================================================================ Y UNA MEDICION QUE CAMBIO EL DISENO
//
// La profundidad de campo NO PUEDE ESTAR PRENDIDA TODA LA PIEZA, y lo dijo un numero antes de que
// existiera la escena. Con apertura 90, `foco-check` reprueba el tunel de telefonos: la camara queda
// ADENTRO del anillo, o sea a 600 unidades de un plano con el foco en 2000, y el circulo de confusion
// da 210 px contra un limite de 24 — el sujeto principal, ocupando el 91% del cuadro, saldria como una
// mancha. El circulo crece con |d - enfoque| / d y eso no se arregla con gusto.
//
// Por eso la apertura SE ANIMA: alta en los tiempos de tipografia, en cero antes de entrar al tunel.
//
// ================================================================ FICHA DE ARTE
// FAMILIA      producto luminoso. Lavanda casi blanco, azul, y objetos de interfaz que se ven reales.
// PALETA       suelo #B8B1A4 no: suelo lavanda #F8F7FF -> #EFEDF7 · tinta #16181D · azul #2B7FFF
//              violeta #6E5BF0 · cian #3FC7F6 · rosa #F06BD8 (aparece UNA vez, en el confeti)
// LUZ          horneada. No hay luces en el motor: el volumen sale de degradados y sombras en los PNG.
// FORMA        esquinas MUY redondeadas, todo horneado. Nada de rectangulos rectos.
// TIPOGRAFIA   Century Gothic para titulares (en AE: "CenturyGothic", sin espacio; en Skia: CON
//              espacio — con el nombre de AE, Skia dibuja con la sustituta y no avisa).
//              Segoe UI para el texto de interfaz.
// PROFUNDIDAD  de verdad: camara con profundidad de campo, y objetos armados con planos.
// SIMBOLO      el telefono. Seis forman un anillo con la camara adentro, que es el momento mas fuerte.
//
// EL FONDO NUNCA ES UN SOLIDO PLANO. Son tres capas horneadas a distinta Z con deriva lenta, mas grano
// que cicla cada dos cuadros. Es la respuesta directa al reclamo de la pieza anterior ("esta muy vacio,
// el fondo demasiado simple"), y la condicion que el analisis marco como la que mas cambia la sensacion.
//
// ================================================================ USO
//   node tools/ae/recursos-k/fondo.mjs && node tools/ae/recursos-k/telefono.mjs && ...
//   node tools/ae/es3-check.mjs tools/ae/sondas/pieza-k.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-k.jsx
//   printf 'PIEZA-K' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/pieza-k.json

var RUTA = "C:/ae-probe/pieza-k.txt";
var RECURSOS = "C:/ae-probe/recursos-k";

function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) {
  var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a");
  a.write(t + String.fromCharCode(10)); a.close();
}
function ac(s) {
  s = s.replace(/\{a\}/g, String.fromCharCode(225));
  s = s.replace(/\{e\}/g, String.fromCharCode(233));
  s = s.replace(/\{i\}/g, String.fromCharCode(237));
  s = s.replace(/\{o\}/g, String.fromCharCode(243));
  s = s.replace(/\{u\}/g, String.fromCharCode(250));
  s = s.replace(/\{n\}/g, String.fromCharCode(241));
  return s;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {
app.beginUndoGroup("PIEZA-K");

var NOMBRE = "PIEZA-K";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 990;

var TINTA = [0.086, 0.094, 0.114];
var TINTA2 = [0.227, 0.247, 0.290];
var GRIS = [0.541, 0.565, 0.627];
var AZUL = [0.169, 0.498, 1.000];
var AZUL_CLARO = [0.659, 0.784, 0.910];
var AZUL_HONDO = [0.039, 0.341, 0.961];
var BLANCO = [1, 1, 1];

var F_DISPLAY = "CenturyGothic";
var F_UI = "SegoeUI";

var CURVAS = {
  C1: [20, 85], C2: [10, 92], C3: [90, 15], C4: [85, 85],
  C6: [70, 70], C7: [0.1, 80], C8: [70, 20]
};

// ---------------------------------------------------------------- el andamio
function tr(c) { return c.property("ADBE Transform Group"); }
function op(c) { return tr(c).property("ADBE Opacity"); }
function pos(c) { return tr(c).property("ADBE Position"); }
function esc(c) { return tr(c).property("ADBE Scale"); }
function rotX(c) { return tr(c).property("ADBE Rotate X"); }
function rotY(c) { return tr(c).property("ADBE Rotate Y"); }
function rotZ(c) { return tr(c).property("ADBE Rotate Z"); }
function fuenteDe(c) { return c.property("ADBE Text Properties").property("ADBE Text Document"); }

// PONER UNA INFLUENCIA PROMUEVE LA CLAVE A BEZIER DE LOS DOS LADOS y pisa el tipo del tramo anterior.
// Por eso los tipos se vuelven a fijar DESPUES de las influencias. En la PIEZA-H fueron 64 tramos
// rechazados de golpe por no hacerlo.
function aplicarCurva(prop, k, k2, c) {
  var n = prop.keyOutTemporalEase(k).length;
  var sal = [], ent = [], q;
  for (q = 0; q < n; q++) { sal[q] = new KeyframeEase(0, c[0]); ent[q] = new KeyframeEase(0, c[1]); }
  var entradaDeK = prop.keyInInterpolationType(k);
  var salidaDeK2 = prop.keyOutInterpolationType(k2);
  prop.setInterpolationTypeAtKey(k, entradaDeK, KeyframeInterpolationType.BEZIER);
  prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, salidaDeK2);
  prop.setTemporalEaseAtKey(k, prop.keyInTemporalEase(k), sal);
  prop.setTemporalEaseAtKey(k2, ent, prop.keyOutTemporalEase(k2));
  prop.setInterpolationTypeAtKey(k, entradaDeK, KeyframeInterpolationType.BEZIER);
  prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, salidaDeK2);
}
function claves(prop, lista) {
  var i;
  for (i = 1; i < lista.length; i++) {
    if (lista[i][0] <= lista[i - 1][0]) {
      throw new Error("claves fuera de orden: " + lista[i - 1][0] + " -> " + lista[i][0]);
    }
  }
  for (i = 0; i < lista.length; i++) { prop.setValueAtTime(lista[i][0] / FPS, lista[i][1]); }
  for (i = 0; i < lista.length - 1; i++) {
    var c = lista[i][2];
    var k = prop.nearestKeyIndex(lista[i][0] / FPS);
    var k2 = prop.nearestKeyIndex(lista[i + 1][0] / FPS);
    if (c === "HOLD") {
      prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.HOLD);
    } else if (c === "C5") {
      prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.LINEAR);
      prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.LINEAR, prop.keyOutInterpolationType(k2));
    } else {
      aplicarCurva(prop, k, k2, CURVAS[c]);
    }
  }
}
function ejes(capa) {
  pos(capa).dimensionsSeparated = true;
  var e = { x: tr(capa).property("ADBE Position_0"), y: tr(capa).property("ADBE Position_1"), z: null };
  try { e.z = tr(capa).property("ADBE Position_2"); } catch (exZ) { e.z = null; }
  return e;
}
function plano(capa, desde, hasta) {
  capa.inPoint = desde / FPS;
  capa.outPoint = Math.min(hasta, CUADROS) / FPS;
  return capa;
}

var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, CUADROS / FPS, FPS);
comp.resolutionFactor = [1, 1];
comp.motionBlur = true;
comp.shutterAngle = 180;
comp.shutterPhase = -90;
comp.motionBlurSamplesPerFrame = 16;
comp.bgColor = [0.949, 0.945, 0.973];
comp.openInViewer();

// ---------------------------------------------------------------- recursos
// El nombre del archivo ES la clave, y `recurso()` le pega ".png": por este helper un .jpg no entra.
// Todos los recursos de la pieza son PNG horneados con Skia.
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
function img2d(archivo, nombre, x, y, escala) {
  var c = comp.layers.add(recurso(archivo));
  c.name = nombre;
  c.motionBlur = true;
  pos(c).setValue([x, y]);
  esc(c).setValue([escala, escala]);
  return c;
}
function rotulo(cadena, tam, color, fuente, x, y, z, centrado) {
  var t = comp.layers.addText(ac(cadena));
  var p = fuenteDe(t);
  var d = p.value;
  d.fontSize = tam; d.fillColor = color; d.applyFill = true;
  d.justification = centrado ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
  try { d.font = fuente; } catch (exF) {}
  p.setValue(d);
  t.threeDLayer = true;
  t.motionBlur = true;
  pos(t).setValue([x, y, z]);
  return t;
}

// ================================================================ LA CAMARA
//
// zoom = distancia, asi que el plano z=0 se dibuja 1:1 y las coordenadas 2D y las 3D coinciden.
// Auto-orientacion APAGADA: por defecto la camara gira para mirar el punto de interes, y cualquier
// deriva lateral la inclina — el defecto que corto tres paneles en la PIEZA-I.
var DIST = 2600;
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
pos(cam).setValue([ANCHO / 2, ALTO / 2, -DIST]);
cam.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
var opc = cam.property("ADBE Camera Options Group");
opc.property("ADBE Camera Zoom").setValue(DIST);
opc.property("ADBE Camera Depth of Field").setValue(1);

// EL FOCO ES EL MECANISMO DE LA PIEZA, no un adorno. La referencia hace el relevo de nitidez palabra
// por palabra con un desenfoque por capa que el motor no tiene; aca lo hace la camara, moviendo el
// plano de foco entre capas de texto que viven a distinta Z.
//
// La distancia se mide DESDE LA CAMARA: para enfocar una capa en z=Z hay que pedir Z + DIST.
var enfoque = opc.property("ADBE Camera Focus Distance");
var apertura = opc.property("ADBE Camera Aperture");

function focoEn(z) { return z + DIST; }

// LA APERTURA SE ANIMA, y lo decidio `foco-check` antes de que existiera el tunel: con la camara
// adentro del anillo de telefonos, una apertura de tipografia da 210 px de circulo de confusion contra
// un limite de 24. Se apaga antes de entrar y se vuelve a prender al salir.
claves(apertura, [
  // LA APERTURA TIENE QUE BAJAR ANTES DE QUE ENTRE EL TUNEL, NO DESPUES. La primera version la bajaba
  // en el cuadro 300 y el anillo arranca en el 210: noventa cuadros con los seis telefonos pidiendo mas
  // desenfoque del que el motor dibuja liso. `foco-check` conto 19 capas.
  [0, 78, "C5"], [186, 78, "C3"],       // acto I: tipografia, el foco ES el mecanismo
  [206, 2, "C5"], [700, 2, "C3"],       // el tunel y la interfaz: casi sin profundidad de campo
  [740, 46, "C5"], [860, 46, "C3"],     // la chispa vuelve a necesitarla
  [890, 70, "C5"], [990, 70, "C5"]      // el cierre
]);

var ejCam = ejes(cam);
claves(ejCam.z, [
  [0, -DIST, "C4"], [120, -DIST + 60, "C4"],
  [150, -DIST + 40, "C3"], [180, -DIST - 220, "C1"],   // baja al panel de soltar
  [210, -DIST - 180, "C4"], [240, -DIST + 90, "C1"],
  [270, -DIST + 420, "C2"], [300, -DIST + 1180, "C5"]  // el vuelo por el tunel
]);
claves(ejCam.x, [[0, 960, "C4"], [150, 986, "C4"], [240, 942, "C4"], [300, 960, "C5"]]);
claves(ejCam.y, [[0, 540, "C4"], [150, 604, "C1"], [210, 592, "C3"], [270, 540, "C5"], [300, 540, "C5"]]);

// ================================================================ EL SUELO
//
// TRES CAPAS A DISTINTA Z, no un solido. Es la respuesta directa a "el fondo es demasiado simple", y el
// analisis lo marco como la decision que mas cambia la sensacion de toda la lista. La deriva es lenta y
// distinta en cada capa: eso es lo que da paralaje cuando la camara se mueve.
// LA ESCALA DEL FONDO SE CALCULA, NO SE ELIGE. A z=5200 con la camara en -2600, la distancia es 7800 y
// el factor de proyeccion 2600/7800 = 0,333: un PNG de 4200 al 108% se dibuja 1511 px de ancho en un
// cuadro de 1920. En el cuadro 12 de AE se ve el borde del fondo con una franja mas clara alrededor.
// Para cubrir hacen falta 138%; va 200% para aguantar tambien la deriva de la capa y el viaje de camara
// del acto I, que a z=-1420 cambia el factor a 0,393.
// SE LLAMA deco- A PROPOSITO Y CON MOTIVO ESCRITO. `lectura-check` Q2 exige que una imagen tenga entre
// 2x y 4x los pixeles con los que se dibuja, y el fondo al 200% queda en 1,5x. La regla existe para que
// no se vea borroso un recorte con detalle; un DEGRADADO PURO no tiene frecuencia espacial que perder —
// medido: 34 escalones de valor en 4200 px, o sea un cambio cada 120. Estirarlo no lo degrada.
var fondo = img("fondo-base", "deco-fondo", 960, 540, 700, 100);
plano(fondo, 0, CUADROS);
var ejF = ejes(fondo);
claves(ejF.x, [[0, 900, "C5"], [495, 1020, "C5"], [990, 900, "C5"]]);
claves(ejF.y, [[0, 500, "C5"], [495, 580, "C5"], [990, 500, "C5"]]);
claves(ejF.z, [[0, 700, "C5"], [990, 700, "C5"]]);

var manchas = img("fondo-manchas", "deco-manchas", 960, 540, 400, 110);
op(manchas).setValue(76);
plano(manchas, 0, CUADROS);
var ejM = ejes(manchas);
claves(ejM.x, [[0, 1120, "C5"], [495, 820, "C5"], [990, 1140, "C5"]]);
claves(ejM.y, [[0, 470, "C5"], [495, 640, "C5"], [990, 450, "C5"]]);
claves(ejM.z, [[0, 400, "C5"], [990, 400, "C5"]]);

var resp = img("fondo-resplandor-cian", "deco-resplandor", 420, 860, 520, 62);
resp.blendingMode = BlendingMode.ADD;
claves(op(resp), [[0, 0, "C5"], [330, 0, "C2"], [380, 54, "C5"], [700, 54, "C3"], [760, 0, "C5"]]);
plano(resp, 0, CUADROS);

// EL GRANO CICLA CADA DOS CUADROS. Con uno solo el grano queda congelado y se lee como suciedad de la
// lente en vez de como grano de pelicula. Van tres y se alternan con claves HOLD.
var ig, granos = [];
for (ig = 0; ig < 3; ig++) {
  var gr = img2d("grano-0" + (ig + 1), "grano-" + ig, 960, 540, 100);
  op(gr).setValue(0);
  plano(gr, 0, CUADROS);
  granos.push(gr);
}
var ic2;
for (ic2 = 0; ic2 < 3; ic2++) {
  var lista = [], cu;
  for (cu = 0; cu < CUADROS; cu += 6) {
    lista.push([cu, (cu / 2) % 3 === ic2 ? 34 : 0, "HOLD"]);
    if (cu + 2 < CUADROS) { lista.push([cu + 2, ((cu + 2) / 2) % 3 === ic2 ? 34 : 0, "HOLD"]); }
    if (cu + 4 < CUADROS) { lista.push([cu + 4, ((cu + 4) / 2) % 3 === ic2 ? 34 : 0, "HOLD"]); }
  }
  claves(op(granos[ic2]), lista);
}

// EL LIMITE DE 24 px MANDA SOBRE LA PROFUNDIDAD DEL DECORADO, y es un costo real de este motor: con la
// apertura que el relevo de foco necesita, NADA puede vivir mas alla de z=719 sin pasarse. El paralaje
// de fondo pierde recorrido; a cambio se conserva el mecanismo central de la pieza. Cuando haya que
// elegir entre los dos, gana el mecanismo.
var marcaAgua = img("marca-agua", "deco-marca-agua", 250, 132, 600, 30);
op(marcaAgua).setValue(64);
plano(marcaAgua, 0, CUADROS);

// ================================================================ ACTO I · LA TIPOGRAFIA
//
// El relevo de nitidez: cada palabra es SU PROPIA CAPA, a su propia Z, y el foco viaja entre ellas.
// La que esta en el plano de foco se lee nitida; la otra se ablanda sin que nadie la haya tocado.
//
// SEPARACION MINIMA EN Z DE 300 UNIDADES entre dos palabras de la misma linea. Con menos, el foco no
// las distingue —el circulo de confusion crece con |d - enfoque| / d y a 100 unidades la diferencia es
// de un pixel— y ademas dos capas 3D a menos de 1 unidad de profundidad se pisan en el orden de dibujo.
var Z_CERCA = 340, Z_LEJOS = -300;

function palabra(cadena, tam, color, x, y, z, entra, sale) {
  var t = rotulo(cadena, tam, color, F_DISPLAY, x, y, z, true);
  t.name = "pal-" + cadena.replace(/[^A-Za-z0-9]/g, "");
  // LA ENTRADA Y LA SALIDA SE ADAPTAN A LO QUE DURA LA PALABRA. Con 8 y 10 cuadros fijos, una palabra
  // de vida corta pone la clave de salida ANTES que la de entrada y `claves()` tira "claves fuera de
  // orden". Paso con "Instantly", que dura 14 cuadros: 248+8=256 contra 262-10=252.
  //
  // Se reparte: nunca mas del 30% de la vida para entrar y del 22% para salir, y la salida dura el 60%
  // de la entrada, que es la regla del genero (invertirlo es la causa mas comun de que una pieza se
  // sienta lenta).
  var vida = sale - entra;
  var dEnt = Math.max(3, Math.min(8, Math.floor(vida * 0.30)));
  var dSal = Math.max(2, Math.min(10, Math.floor(vida * 0.22)));
  claves(op(t), [[entra, 0, "C2"], [entra + dEnt, 100, "C5"], [sale - dSal, 100, "C3"], [sale, 0, "C5"]]);
  plano(t, entra - 1, sale + 1);
  return t;
}

// --- tiempo A (0-59) · "Turn" entra fuera de foco y se afila
var pTurn = palabra("Turn", 150, AZUL, 700, 560, Z_CERCA, 4, 118);
var ejT = ejes(pTurn);
claves(ejT.x, [[4, 700, "C5"], [30, 700, "C1"], [58, 775, "C8"], [118, 775, "C5"]]);
claves(ejT.y, [[4, 566, "C1"], [30, 560, "C5"], [118, 560, "C5"]]);
claves(ejT.z, [[4, Z_CERCA, "C5"], [30, Z_CERCA, "C1"], [58, Z_CERCA, "C5"], [118, Z_CERCA, "C5"]]);
claves(esc(pTurn), [[4, [104, 104, 104], "C1"], [30, [100, 100, 100], "C3"],
                    [58, [70, 70, 70], "C8"], [118, [70, 70, 70], "C5"]]);

// --- tiempo B (30-118) · entra "Books" nitida y "Turn" pierde el foco
var pBooks = palabra("Books", 150, TINTA, 1120, 560, Z_LEJOS, 32, 118);
var ejB = ejes(pBooks);
claves(ejB.x, [[32, 1190, "C1"], [58, 1080, "C8"], [118, 1080, "C5"]]);
claves(ejB.y, [[32, 560, "C5"], [118, 560, "C5"]]);
claves(ejB.z, [[32, Z_LEJOS, "C5"], [118, Z_LEJOS, "C5"]]);
claves(esc(pBooks), [[32, [112, 112, 112], "C1"], [58, [70, 70, 70], "C8"], [118, [70, 70, 70], "C5"]]);

// EL RELEVO. El foco arranca lejos —"Turn" entra blanda—, se posa en "Turn", y en el cuadro 34 viaja a
// "Books". Ninguna capa se toca: lo unico que se mueve es el plano de foco de la camara.
claves(enfoque, [
  // EL DESENFOQUE DE ENTRADA ESTA LIMITADO POR EL MOTOR, no por gusto. El circulo de confusion es
  // apertura * |d - enfoque| / d; con apertura 78 y la capa a 2940 de la camara, un foco a +1500 daria
  // 39,8 px y el motor solo dibuja liso hasta 24 (`foco-check`). A +860 da 22,8 y entra.
  // CONSECUENCIA HONESTA: la entrada de la referencia es MAS borrosa que esto. Su desenfoque sale de una
  // gaussiana sobre los glifos, sin techo; el de aca es un circulo de confusion con 48 muestras. Se
  // parece, no es igual, y es una de las razones por las que esto es ~80% y no 100%.
  [0, focoEn(Z_CERCA) + 860, "C1"], [22, focoEn(Z_CERCA), "C8"],
  [34, focoEn(Z_CERCA), "C1"], [56, focoEn(Z_LEJOS), "C8"],
  [122, focoEn(Z_LEJOS), "C1"], [140, focoEn(Z_CERCA), "C8"],
  [178, focoEn(Z_CERCA), "C1"], [196, focoEn(Z_LEJOS), "C8"],
  [244, focoEn(Z_LEJOS), "C1"], [262, focoEn(Z_CERCA), "C8"],
  [300, focoEn(0), "C5"], [700, focoEn(0), "C1"],
  [760, focoEn(Z_CERCA), "C8"], [860, focoEn(Z_CERCA), "C1"],
  [890, focoEn(Z_LEJOS), "C8"], [990, focoEn(Z_LEJOS), "C5"]
]);

// --- tiempo C (120-178) · "Audio", el mismo estado de entrada que el cuadro 0
var pAudio = palabra("Audio", 158, AZUL, 960, 566, Z_CERCA, 124, 176);
var ejA = ejes(pAudio);
claves(ejA.x, [[124, 960, "C5"], [176, 960, "C5"]]);
claves(ejA.y, [[124, 574, "C1"], [150, 566, "C5"], [176, 566, "C5"]]);
claves(ejA.z, [[124, Z_CERCA, "C5"], [176, Z_CERCA, "C5"]]);
claves(esc(pAudio), [[124, [106, 106, 106], "C1"], [150, [100, 100, 100], "C5"], [176, [100, 100, 100], "C5"]]);

// --- tiempo D (180-242) · "Any language"
var pAny = palabra("Any", 96, AZUL_CLARO, 700, 560, Z_CERCA, 182, 232);
var pLang = palabra("language", 96, TINTA2, 1110, 560, Z_LEJOS, 186, 232);
var ejL = ejes(pLang);
claves(ejL.x, [[186, 1160, "C1"], [208, 1110, "C8"], [232, 1110, "C5"]]);
claves(ejL.y, [[186, 560, "C5"], [232, 560, "C5"]]);
claves(ejL.z, [[186, Z_LEJOS, "C5"], [232, Z_LEJOS, "C5"]]);

// --- tiempo E (244-300) · "Instantly" entra por la derecha
var pInst = palabra("Instantly", 118, AZUL, 1320, 560, Z_CERCA, 248, 262);
var ejI = ejes(pInst);
claves(ejI.x, [[248, 1520, "C1"], [258, 1330, "C8"], [262, 1330, "C5"]]);
claves(ejI.y, [[248, 560, "C5"], [262, 560, "C5"]]);
claves(ejI.z, [[248, Z_CERCA, "C5"], [262, Z_CERCA, "C5"]]);


// ================================================================ ACTO II · EL TUNEL DE TELEFONOS
//
// Seis telefonos formando un anillo hexagonal CON LA CAMARA ADENTRO, todos mirando al eje. Es el
// momento mas fuerte de la referencia y lo que el usuario pidio explicitamente ("algun objeto 3d como
// un celular"). Y es lo que el motor sabe hacer mejor: planos en el espacio.
//
// LA CONSTRUCCION, que no es obvia. Un plano de AE mira hacia -Z. Para que mire al eje del tunel desde
// afuera hay que componer DOS giros, y el orden importa porque la matriz es Ori · Rx · Ry · Rz:
//   rotZ 90   pone el telefono de costado: lo que era su ALTO pasa a ser horizontal
//   rotY 90   lo para contra el eje: ese alto queda ahora a lo largo de Z, o sea a lo largo del tunel
// y despues un NULO POR TELEFONO, girado theta en Z, lo lleva a su lugar del anillo. Sin el nulo habria
// que resolver seno y coseno a mano en tres propiedades y el resultado no se puede leer.
//
// EMPARENTAR PRIMERO, Y DESPUES PONER ORIENTACION Y LAS TRES ROTACIONES EN CERO. AE reescribe los
// angulos del hijo para conservar su transformacion en el mundo, y en la PIEZA-J eso dejo una tira
// entera girada 104 grados sin ningun error.
//
// LA PANTALLA VA DETRAS DEL CHASIS. El chasis tiene el agujero de la pantalla transparente y su marco
// es opaco; la captura se escala a lo ALTO y sobra 68 px por lado, que el bisel tapa. Escalarla a lo
// ancho dejaria 136 px de hueco arriba y abajo, que no tapa nada.
// EL RADIO SE CALCULA CONTRA LA CIRCUNFERENCIA, no se elige. Con R=620 la circunferencia es 3895 y
// seis telefonos de 364 de ancho cubren el 56%: se ve un anillo de carteles sueltos, no un tubo. Con
// R=380 la circunferencia baja a 2388 y seis de 420 dan 2520, o sea que se tocan y el tunel se cierra.
var R_TUNEL = 380, N_TEL = 6, ESC_TEL = 30, ESC_PAN = 28.6;
var PANTALLAS = ["tel-articulo-1", "tel-chat", "tel-articulo-foto",
                 "tel-articulo-2", "tel-video", "tel-articulo-3"];

var ejeTunel = comp.layers.addNull();
ejeTunel.name = "eje-tunel";
ejeTunel.threeDLayer = true;
pos(ejeTunel).setValue([960, 540, 0]);
var ejTu = ejes(ejeTunel);
// EL TUNEL VIENE DE LEJOS Y PASA DE LARGO. La camara casi no se mueve: lo que viaja es el tunel, que es
// mas barato de controlar y da el mismo cuadro. A z=1900 el anillo esta delante y chico; a z=-900 ya
// dejo la camara atras.
// EL TUNEL FRENA ANTES DE PASAR LA CAMARA. Con la camara en -1420 al final del viaje, un anillo que
// siga hasta z=-1500 queda DETRAS del ojo: se proyecta invertido, pide un circulo de confusion enorme
// —crece con 1/distancia— y `marco-check` lo cuenta como miles de px fuera de cuadro. Ya costo un
// render entero en la PIEZA-J. Frena en -420, que deja 1000 unidades de aire.
claves(ejTu.z, [[210, 2600, "C2"], [252, 1180, "C1"], [268, 900, "C4"],
                [300, 240, "C5"], [316, -420, "C5"]]);
claves(ejTu.x, [[210, 960, "C5"], [316, 960, "C5"]]);
claves(ejTu.y, [[210, 540, "C5"], [316, 540, "C5"]]);
// gira despacio: es lo que hace que el tunel se lea como un tubo y no como seis carteles
claves(rotZ(ejeTunel), [[210, -14, "C2"], [300, 16, "C5"], [316, 22, "C5"]]);
plano(ejeTunel, 208, 318);

var itel;
for (itel = 0; itel < N_TEL; itel++) {
  var th = itel * 360 / N_TEL;

  var brazo = comp.layers.addNull();
  brazo.name = "brazo-tel-" + itel;
  brazo.threeDLayer = true;
  brazo.parent = ejeTunel;
  tr(brazo).property("ADBE Orientation").setValue([0, 0, 0]);
  rotX(brazo).setValue(0); rotY(brazo).setValue(0); rotZ(brazo).setValue(th);
  pos(brazo).setValue([0, 0, 0]);
  plano(brazo, 208, 318);

  // la pantalla primero, para que quede DETRAS del chasis en la pila (AE agrega arriba)
  var pan = comp.layers.add(recurso(PANTALLAS[itel]));
  pan.name = "tel-pantalla-" + itel;
  pan.threeDLayer = true;
  pan.motionBlur = true;
  pan.parent = brazo;
  tr(pan).property("ADBE Orientation").setValue([0, 0, 0]);
  rotX(pan).setValue(0); rotY(pan).setValue(90); rotZ(pan).setValue(90);
  pos(pan).setValue([R_TUNEL + 6, 0, 0]);
  esc(pan).setValue([ESC_PAN, ESC_PAN, ESC_PAN]);
  claves(op(pan), [[210, 0, "C2"], [224 + itel * 3, 100, "C5"], [304, 100, "C3"], [316, 0, "C5"]]);
  plano(pan, 208, 318);

  var chas = comp.layers.add(recurso("tel-chasis"));
  chas.name = "tel-chasis-" + itel;
  chas.threeDLayer = true;
  chas.motionBlur = true;
  chas.parent = brazo;
  tr(chas).property("ADBE Orientation").setValue([0, 0, 0]);
  rotX(chas).setValue(0); rotY(chas).setValue(90); rotZ(chas).setValue(90);
  pos(chas).setValue([R_TUNEL, 0, 0]);
  esc(chas).setValue([ESC_TEL, ESC_TEL, ESC_TEL]);
  claves(op(chas), [[210, 0, "C2"], [224 + itel * 3, 100, "C5"], [304, 100, "C3"], [316, 0, "C5"]]);
  plano(chas, 208, 318);
}

// --- los titulares del tunel, que viven en el centro vacio del anillo
var pDrop = palabra("Just drop", 84, AZUL, 960, 546, -180, 236, 300);
var pAndGo = palabra("and go", 84, TINTA, 960, 546, -180, 252, 300);
var ejDg = ejes(pAndGo);
claves(ejDg.x, [[252, 1320, "C1"], [268, 1218, "C8"], [300, 1218, "C5"]]);
claves(ejDg.y, [[252, 546, "C5"], [300, 546, "C5"]]);
claves(ejDg.z, [[252, -180, "C5"], [300, -180, "C5"]]);
var ejDr = ejes(pDrop);
claves(ejDr.x, [[236, 960, "C5"], [250, 960, "C1"], [268, 812, "C8"], [300, 812, "C5"]]);
claves(ejDr.y, [[236, 552, "C1"], [250, 546, "C5"], [300, 546, "C5"]]);
claves(ejDr.z, [[236, -180, "C5"], [300, -180, "C5"]]);

var pBooksAudio = palabra("Books. Audio.", 78, AZUL, 960, 552, -180, 304, 330);
var pAllInOne = palabra("All In One Platform", 84, TINTA, 960, 552, -180, 300, 326);
var ejAio = ejes(pAllInOne);
claves(ejAio.x, [[300, 960, "C5"], [326, 960, "C5"]]);
claves(ejAio.y, [[300, 552, "C5"], [326, 552, "C5"]]);
// FRENA EN -900, NO EN -1400. A -1400 el titular queda a 21 unidades de la camara y pide 250 px de
// circulo de confusion: el motor dibuja liso hasta 24. Un texto que atraviesa el ojo no es un gesto,
// es una capa que se olvidaron de apagar.
claves(ejAio.z, [[300, -180, "C1"], [326, -900, "C5"]]);

comp.time = 0;
anotar("PIEZA|" + NOMBRE + "|" + ANCHO + "x" + ALTO + "|" + FPS + "fps|" + CUADROS + " cuadros");
anotar("CAPAS|" + comp.numLayers);
anotar("ACTO|I (0-300) tipografia con relevo de foco · II (196-330) el tunel de telefonos");
anotar("--- fin ---");
app.endUndoGroup();
} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
