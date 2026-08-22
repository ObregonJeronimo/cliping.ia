// PIEZA-I — la primera pieza escrita con la gramatica MEDIDA, no con la recordada.
//
// ================================================================ QUE LA SEPARA DE LA PIEZA-H
//
// La PIEZA-H salio solida y con el movimiento del texto mal, por dos errores encadenados: estudie la
// referencia a 2 cuadros por segundo (cadencia a la que un corte duro y un acercamiento de medio
// segundo se ven IDENTICOS) y despues aplique el gesto grande de escala a los ONCE titulares.
//
// El barrido de ocho avisos lo corrigio con numeros:
//   · un rotulo entra entre 1,00x y 1,30x. Siete de ocho. Sin excepciones.
//   · la entrada tipica NI SIQUIERA ES UNA ESCALA: es traslacion corta, disolvencia a tamano casi
//     final, o entrada por foco. La escala es el recurso MENOS usado de los tres.
//   · se entra medido y SE SALE ROTO: la mediana de salida es 1,04 pero el p90 llega a 6,3.
//   · el gesto de 3x a 25x va en la TRANSICION, en la camara o en un objeto de producto. Una a tres
//     veces por pieza. Aca hay UNA (tiempo K) y esta anotada.
//   · la transicion es siempre un objeto que ya estaba en escena. Ninguno de los ocho usa cortinilla.
//   · un rotulo no dura mas de 2,5 s, y entre dos hay UN cuadro vacio.
//
// ================================================================ FICHA DE ARTE
// FAMILIA      cinematica oscura con luz de borde
// PALETA       negro puro #000 · UN SOLO ACENTO azul #5b8dff (7 de 8 avisos usan uno solo)
//              tinta #f1f3f7 · suave #9aa3b5. El cian y el violeta solo viven DENTRO de los recursos.
// LUZ          canto encendido y halo HORNEADOS en el PNG. SIN RESPLANDOR — ver la nota de abajo.
// FORMA        chasis radio 26 con trazo en degradado; pildoras de contorno encendido
// TIPOGRAFIA   CenturyGothic display (0,20% de desvio medido, la mejor de once), SegoeUI-Light lectura.
//              SIEMPRE FRONTAL: 8 de 8 avisos usan 3D para la interfaz y dejan el rotulo plano.
// PROFUNDIDAD  paneles muy girados, y ahora tambien PROFUNDIDAD DE CAMPO real
// SIMBOLO      la estrella de cuatro puntas: abre y cierra
//
// ================================================================ POR QUE NO HAY RESPLANDOR
// La fusion aditiva y el resplandor no conviven: con resplandor la escena pasa por el compositor y la
// suma ocurre en LINEAL en vez de sRGB — dos capas de 128 dan 255 sin brillo y 176 con brillo. Y la que
// coincide con AE es la de sRGB. Esta pieza usa el cometa aditivo, asi que no lleva resplandor, y el
// reproductor lo declararia si me olvidara. La luz de los cantos ya viene horneada en los recursos.
//
// ================================================================ LOS TRECE TIEMPOS
//    A    0- 66  la estrella entra POR FOCO: desenfocada y se resuelve
//    B   66-120  aparece la marca, por traslacion corta
//    C  120-190  corte: el panel en escorzo
//    D  190-290  EL COMETA ESCRIBE, letra por letra, en modo Anadir
//    E  290-350  "En treinta segundos"
//    F  350-430  el documento, con el texto entrando y la parte nueva TENIDA
//    G  430-500  REVELADO POR MASCARA: la linea sube desde detras de un borde invisible
//    H  500-580  el anillo de progreso llenandose
//    I  580-650  tres palabras a beat, con interletra
//    J  650-720  el conmutador con el cursor
//    K  720-780  EL GESTO GRANDE: la palabra atraviesa la camara. Una vez en toda la pieza.
//    L  780-850  vuelve la estrella y se arma la pildora
//    M  850-900  el cierre
//
// USO
//   node tools/ae/recursos-h.mjs
//   node tools/ae/es3-check.mjs tools/ae/sondas/pieza-i.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-i.jsx

var RUTA = "C:/ae-probe/pieza-i.txt";
var RECURSOS = "C:/ae-probe/recursos-h";

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
function ac(s) {
  s = s.replace(/\{a\}/g, String.fromCharCode(225));
  s = s.replace(/\{e\}/g, String.fromCharCode(233));
  s = s.replace(/\{i\}/g, String.fromCharCode(237));
  s = s.replace(/\{o\}/g, String.fromCharCode(243));
  s = s.replace(/\{u\}/g, String.fromCharCode(250));
  s = s.replace(/\{n\}/g, String.fromCharCode(241));
  s = s.replace(/\{A\}/g, String.fromCharCode(193));
  return s;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("PIEZA-I");

var NOMBRE = "PIEZA-I";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 900;

var TINTA = [0.945, 0.953, 0.969];
var SUAVE = [0.604, 0.639, 0.710];
var AZUL = [0.357, 0.553, 1.000];
var AZUL2 = [0.541, 0.706, 1.000];

var F_DISPLAY = "CenturyGothic";
var F_LECTURA = "SegoeUI-Light";
var F_ETIQUETA = "SegoeUI";
var K2 = 2, K3 = 3;

var CURVAS = {
  C1: [20, 85], C2: [10, 92], C3: [90, 15], C4: [85, 85],
  C6: [70, 70], C7: [0.1, 80], C8: [70, 20]
};

// ---------------------------------------------------------------- el andamio
function tr(c) { return c.property("ADBE Transform Group"); }
function op(c) { return tr(c).property("ADBE Opacity"); }
function pos(c) { return tr(c).property("ADBE Position"); }
function esc(c) { return tr(c).property("ADBE Scale"); }
function fuenteDe(c) { return c.property("ADBE Text Properties").property("ADBE Text Document"); }

// PONER UNA INFLUENCIA PROMUEVE LA CLAVE A BEZIER DE LOS DOS LADOS, y eso pisa el tipo del tramo
// anterior. Por eso los tipos se vuelven a fijar DESPUES de las influencias. Sesenta y cuatro tramos
// rechazados costo descubrirlo.
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
// TODAS LAS CLAVES DE UNA PROPIEDAD EN UNA SOLA LLAMADA: es la unica forma de que cada TRAMO quede con
// el mismo tipo en sus dos extremos.
function claves(prop, lista) {
  var i;
  // LA LISTA TIENE QUE VENIR CRECIENTE, Y HAY QUE COMPROBARLO.
  //
  // `setValueAtTime` no se entera del orden, pero despues `nearestKeyIndex` devuelve los indices REALES
  // —ordenados por tiempo— y las curvas se aplican a los tramos equivocados. El resultado es un tramo
  // con salida bezier y entrada lineal, que el exportador rechaza con "tipos mezclados" a doscientas
  // lineas de distancia del error. Paso aca: un escalonado `368 + lf*20` cruzo por encima de un cuadro
  // fijo en el tercer paso, y solo en el tercero.
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
var _s = 20260815;
function azar() { _s = (_s * 1103515245 + 12345) % 2147483648; return _s / 2147483648; }

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
comp.bgColor = [0, 0, 0];
comp.openInViewer();

var cache = {};
function recurso(archivo) {
  if (cache[archivo]) { return cache[archivo]; }
  var f = new File(RECURSOS + "/" + archivo + ".png");
  if (!f.exists) { throw new Error("falta el recurso " + archivo); }
  cache[archivo] = app.project.importFile(new ImportOptions(f));
  return cache[archivo];
}
function plano(capa, desde, hasta) { capa.inPoint = desde / FPS; capa.outPoint = hasta / FPS; return capa; }
function img(archivo, nombre, x, y, z, escala) {
  var c = comp.layers.add(recurso(archivo));
  c.name = nombre;
  c.threeDLayer = true;
  c.motionBlur = true;
  pos(c).setValue([x, y, z]);
  if (escala !== undefined) { esc(c).setValue([escala, escala, escala]); }
  return c;
}
function img2d(archivo, nombre, x, y, escala) {
  var c = comp.layers.add(recurso(archivo));
  c.name = nombre;
  c.threeDLayer = false;
  c.motionBlur = true;
  pos(c).setValue([x, y]);
  if (escala !== undefined) { esc(c).setValue([escala, escala]); }
  return c;
}
function rotulo(cadena, tam, color, fuente, x, y, centrado, track) {
  var t = comp.layers.addText(ac(cadena));
  var p = fuenteDe(t);
  var d = p.value;
  d.fontSize = tam; d.fillColor = color; d.applyFill = true;
  d.justification = centrado ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
  if (track) { d.tracking = track; }
  try { d.font = fuente; } catch (exF) {}
  p.setValue(d);
  t.threeDLayer = false;
  t.motionBlur = true;
  pos(t).setValue([x, y]);
  return t;
}
function vive(capa, entra, dEnt, sale, dSal, tope) {
  if (tope === undefined) { tope = 100; }
  claves(op(capa), [[entra, 0, "C2"], [entra + dEnt, tope, "C5"], [sale - dSal, tope, "C3"], [sale, 0, "C5"]]);
  plano(capa, Math.max(0, entra - 1), Math.min(CUADROS, sale + 1));
  return capa;
}

// ---------------------------------------------------------------- EL MEDIDOR
var medidor = null;
function medirCon(cadena, tam, fuente, track) {
  if (medidor === null) {
    medidor = comp.layers.addText("n");
    medidor.name = "deco-medidor";
  }
  var p = fuenteDe(medidor);
  var d = p.value;
  d.fontSize = tam;
  d.tracking = track || 0;
  try { d.font = fuente; } catch (exM) {}
  d.text = cadena;
  p.setValue(d);
  return medidor.sourceRectAtTime(0, false);
}
function anchoTexto(cadena, tam, fuente, track) {
  if (cadena === "") { return 0; }
  var base = medirCon("n", tam, fuente, track).width;
  return medirCon(cadena + "n", tam, fuente, track).width - base;
}

// ---------------------------------------------------------------- EL TITULAR, CON LA FORMA MEDIDA
//
// Entra frenando, se queda QUIETO, y sale acelerando. Los tres tramos y sus proporciones salen de medir
// la referencia a 30 fps: entrada 45% del tiempo, quieto 48%, salida 7%.
//
// Y LA ENTRADA NO ES UNA ESCALA: es una TRASLACION corta de 0,11 del alto de cuadro (Notion), que es la
// forma mas usada del genero. La escala entra apenas —1,00x a 1,30x— y en la mayoria de los tiempos ni
// eso. Poner el gesto grande en cada titular es lo que hizo que la PIEZA-H se leyera como un tic.
//
// EL QUIETO ES QUIETO DE VERDAD. En la PIEZA-H le habia puesto una deriva lenta "para que el cuadro no
// este muerto"; la referencia NO la tiene, y el contraste entre la entrada violenta y la quietud es
// justamente lo que da el ritmo. Lo que nunca para es el fondo.
var SUBE = Math.round(ALTO * 0.11);
function titular(cadena, tam, color, y, c0, dur, modo, track) {
  var t = rotulo(cadena, tam, color, F_DISPLAY, ANCHO / 2, y, true, track);
  t.name = "titular-" + cadena;
  var quieto = Math.round(dur * 0.48);
  var cEnt = c0 + Math.round(dur * 0.45);
  var cSal = cEnt + quieto;
  var ej = ejes(t);
  if (modo === "escala") {
    // el unico modo que usa escala, y se queda en 1,15x — dentro de la banda medida (1,00-1,30)
    claves(esc(t), [[c0, [115, 115], "C2"], [c0 + 7, [102, 102], "C4"], [cEnt, [100, 100], "C5"],
                    [cSal, [100, 100], "C3"], [c0 + dur, [146, 146], "C5"]]);
    claves(ej.y, [[c0, y, "C5"], [c0 + dur, y, "C5"]]);
  } else {
    // TRASLACION: sube 0,11 del alto frenando fuerte, se queda, y se va acelerando hacia arriba
    claves(ej.y, [[c0, y + SUBE, "C2"], [c0 + 7, y + 9, "C4"], [cEnt, y, "C5"],
                  [cSal, y, "C3"], [c0 + dur, y - 46, "C5"]]);
    claves(esc(t), [[c0, [100, 100], "C5"], [c0 + dur, [100, 100], "C5"]]);
  }
  claves(ej.x, [[c0, ANCHO / 2, "C5"], [c0 + dur, ANCHO / 2, "C5"]]);
  // se va de golpe al final: entre dos titulares hay UN cuadro vacio, medido en la referencia
  claves(op(t), [[c0, 0, "C2"], [c0 + 8, 100, "C5"], [c0 + dur - 6, 100, "C3"], [c0 + dur - 1, 0, "C5"]]);
  plano(t, c0 - 1, c0 + dur);
  return t;
}

// ---------------------------------------------------------------- EL ESPACIO
var fondoNegro = comp.layers.addSolid([0, 0, 0], "fondo-negro", 12000, 7000, 1);
fondoNegro.threeDLayer = true;
fondoNegro.motionBlur = false;
pos(fondoNegro).setValue([ANCHO / 2, ALTO / 2, 3900]);

// DECLARADAS FUERA DE FOCO. Viven a 4400 de la camara, o sea 70 px de circulo de confusion — mas de
// lo que este motor dibuja liso. En un degradado radial sin bordes eso no se ve, pero la unica forma
// honesta de decirlo es DECLARARLO en la capa, no que la compuerta lo adivine por el nombre.
var manchaA = img("luz-azul", "deco-luz-azul", 480, 420, 2700, 172);
manchaA.comment = "FUERADEFOCO — degradado radial sin bordes: el grano del desenfoque no se ve";
var manchaB = img("luz-violeta", "deco-luz-violeta", 1500, 720, 2500, 162);
manchaB.comment = "FUERADEFOCO — degradado radial sin bordes: el grano del desenfoque no se ve";
var ejMA = ejes(manchaA), ejMB = ejes(manchaB);
// el fondo NUNCA para: es lo que permite que la figura se quede quieta sin que el cuadro se muera
claves(ejMA.x, [[0, 300, "C4"], [220, 700, "C4"], [470, 260, "C4"], [700, 760, "C4"], [900, 380, "C5"]]);
claves(ejMA.y, [[0, 420, "C4"], [280, 700, "C4"], [600, 320, "C4"], [900, 560, "C5"]]);
claves(ejMB.x, [[0, 1700, "C4"], [250, 1200, "C4"], [540, 1780, "C4"], [900, 1320, "C5"]]);
claves(ejMB.y, [[0, 720, "C4"], [330, 340, "C4"], [680, 740, "C4"], [900, 420, "C5"]]);
claves(op(manchaA), [[0, 0, "C2"], [30, 74, "C4"], [500, 92, "C4"], [900, 70, "C5"]]);
claves(op(manchaB), [[0, 0, "C2"], [40, 58, "C4"], [560, 84, "C4"], [900, 60, "C5"]]);

// LA CAMARA, con PROFUNDIDAD DE CAMPO. El plano de foco viaja: es lo que hace la entrada del tiempo A.
//
// ================================================================ CENTRARLA A MANO NO ES OPCIONAL
// `addCamera(nombre, [960, 540])` NO pone la camara en [960, 540]: ese argumento es el PUNTO DE
// INTERES. La posicion queda en [0, 0, -zoom]. Medido en `sondas/ejes-prueba.jsx`:
//     JUN|4-camara-recien-creada|0,0,-2666.6666666
//     POI|4-camara-recien-creada|960,540,0
// Con la camara en y=0 mirando a y=540 la vista queda INCLINADA 17,1 grados hacia abajo, y todo lo que
// vive en z>0 sube en el cuadro. En esta pieza subio 240 px: los tres paneles salieron cortados por el
// borde de arriba y los tres estaban centrados en y=0,26 del cuadro en vez de 0,50.
//
// Y LO PEOR ES COMO SOBREVIVIO. Le puse claves a X y a Z, y esas claves PISARON el valor equivocado en
// esos dos ejes — o sea que arreglaron dos tercios del defecto sin querer y escondieron el tercio que
// quedaba. El unico eje que quedo roto fue el unico que no anime. Un error que se tapa solo en las
// partes que tocas es el que mas dura.
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
pos(cam).setValue([ANCHO / 2, ALTO / 2, -1900]);   // ANTES de separar dimensiones
var ejCam = ejes(cam);
claves(ejCam.z, [[0, -1900, "C4"], [120, -1760, "C4"], [430, -1700, "C4"], [720, -1640, "C3"],
                 [780, -1300, "C2"], [850, -1820, "C1"], [900, -1900, "C5"]]);
claves(ejCam.x, [[0, 960, "C4"], [190, 1030, "C4"], [500, 910, "C4"], [900, 960, "C5"]]);
var opc = cam.property("ADBE Camera Options Group");
opc.property("ADBE Camera Depth of Field").setValue(1);
opc.property("ADBE Camera Aperture").setValue(120);
// EL FOCO ARRANCA LEJOS Y LLEGA A LA ESTRELLA: la estrella entra desenfocada y se resuelve. Es una de
// las cuatro formas de entrada del genero —la de Linear— y es la unica que no se podia hacer hasta hoy.
// EL FOCO SIGUE AL SUJETO. La version anterior dejaba el plano en 1900 los 900 cuadros, y como los
// paneles viven en z=700-900 con la camara en z=-1700, sus distancias reales son 2450-2600: los TRES
// paneles estaban fuera de foco durante todo su tiempo, cada uno siendo el sujeto del suyo. No se veia
// como un error de foco sino como "el panel se ve raro".
//
// Lo encontro `foco-check.mjs` sin renderizar, y los numeros de abajo salen de ahi: distancia = z de la
// capa + |z de la camara| en ese cuadro. La estrella vive en z=300, asi que entre tiempo y tiempo el
// foco vuelve a ~2000, que es donde esta ella.
claves(opc.property("ADBE Camera Focus Distance"),
  // EL ARRANQUE ES 2600, NO 3400. Con 3400 la estrella pedia 60 px de circulo de confusion, o sea mas
  // del doble de lo que el motor dibuja liso — y la entrada por foco es JUSTO el caso que declare que
  // el motor si sabe hacer. Pedirle 60 px a la funcion cuya limitacion escribi yo mismo es la misma
  // costumbre que este archivo denuncia. Con 2600 el desenfoque de salida es 22 px, que sobre una
  // estrella de cuatro puntas ya es un halo enorme.
  [[0, 2600, "C2"], [40, 2250, "C4"], [66, 2134, "C5"],
   [112, 2100, "C1"], [140, 2453, "C5"],        // C · el panel de "Hola, Thiago" (z=700)
   [196, 2453, "C1"], [224, 2025, "C5"],        // D · vuelve a la estrella mientras escribe el cometa
   [344, 2025, "C1"], [374, 2600, "C5"],        // F · el documento (z=900)
   [438, 2600, "C1"], [464, 1997, "C5"],
   [496, 1997, "C1"], [526, 2586, "C5"],        // H · la linea de tiempo (z=900)
   [584, 2586, "C1"], [606, 1968, "C5"],
   [716, 1940, "C5"], [780, 1600, "C4"],        // K · la camara se adelanta y la estrella se acerca
   [850, 2120, "C4"], [900, 2200, "C5"]]);

// ================================================================ A+B · LA ESTRELLA Y LA MARCA
var estrella = img("estrella", "estrella", 960, 470, 300, 22);
var ejEs = ejes(estrella);
claves(esc(estrella), [[0, [26, 26, 26], "C4"], [66, [24, 24, 24], "C4"], [120, [18, 18, 18], "C1"],
                       [780, [13, 13, 13], "C2"], [812, [26, 26, 26], "C1"], [850, [11, 11, 11], "C3"],
                       [900, [11, 11, 11], "C5"]]);
claves(ejEs.y, [[0, 470, "C4"], [66, 470, "C1"], [120, 430, "C1"], [780, 430, "C2"],
                [812, 470, "C1"], [850, 500, "C3"], [900, 500, "C5"]]);
claves(ejEs.x, [[0, 960, "C5"], [812, 960, "C1"], [850, 700, "C3"], [900, 700, "C5"]]);
claves(op(estrella), [[0, 0, "C2"], [14, 100, "C5"], [150, 100, "C3"], [166, 0, "HOLD"],
                      [780, 0, "C2"], [792, 100, "C5"], [880, 100, "C3"], [896, 0, "C5"]]);
plano(estrella, 0, 900);

var marca = rotulo("cliping", 96, TINTA, F_DISPLAY, 960, 596, true);
marca.name = "marca";
var ejMc = ejes(marca);
claves(ejMc.y, [[66, 596 + 44, "C2"], [78, 596, "C4"], [150, 596, "C3"], [166, 574, "C5"]]);
claves(ejMc.x, [[66, 960, "C5"], [166, 960, "C5"]]);
vive(marca, 66, 12, 166, 14);

// ================================================================ C · EL PANEL EN ESCORZO
var panelA = img("panel-hola", "panel-hola", 1180, 520, 700, 48);
claves(tr(panelA).property("ADBE Rotate Y"), [[120, -36, "C1"], [190, -29, "C4"], [232, -27, "C5"]]);
tr(panelA).property("ADBE Rotate Z").setValue(-2.5);
var ejPA = ejes(panelA);
claves(ejPA.x, [[120, 2400, "C2"], [172, 1140, "C1"], [232, 1200, "C5"]]);
claves(ejPA.y, [[120, 600, "C2"], [172, 520, "C1"], [232, 505, "C5"]]);
// SE VA ANTES DE QUE EL COMETA EMPIECE A ESCRIBIR (206). Compartir cuadro con el titular hacia que el
// panel quedara cortado abajo y el texto encima de el: la compuerta de colision daba verde porque el
// titular caia sobre la parte VACIA del panel, y aun asi se veia desprolijo. Es la regla que el barrido
// midio en 8 de 8: el rotulo grande no comparte instante con una interfaz.
// SE VA ANTES DE QUE EL COMETA EMPIECE A ESCRIBIR (cuadro 206), no "casi antes". La version anterior
// decia 232 y yo lo habia anotado como si 232 fuera menor que 206: con la camara torcida el panel
// estaba tan arriba que las letras pasaban por debajo y no se notaba. Al enderezar la camara el panel
// bajo a su lugar y la compuerta de colision encontro el solape en el acto.
vive(panelA, 120, 12, 200, 18);

// ================================================================ D · EL COMETA ESCRIBE
//
// ESTO ERAN QUINCE CAPAS Y AHORA ES UNA.
//
// La version anterior falseaba el tecleo con UNA CAPA POR CARACTER: quince rotulos con la opacidad en
// HOLD, cada uno encendiendose cuando el cometa pasaba por su x, mas una medicion de prefijos para
// ubicarlos. Funcionaba y costaba quince capas por frase — y ese costo es la razon de fondo por la que
// las piezas salian ralas: mientras cada gesto cuesta una capa, nadie escribe una pieza densa. El
// barrido midio la escritura por caracter en 8 de 8 referencias del genero.
//
// Ahora lo hace un ANIMADOR DE TEXTO nativo, que el exportador vuelca y el motor reproduce con la
// cuenta del selector medida contra AE (`selector-check.mjs`, 88 configuraciones, desvio 4,9e-5) y
// verificada cuadro a cuadro contra `sourceRectAtTime` (`animador-check.mjs`, peor desvio 0,73%).
//
// DOS COSAS QUE HAY QUE SABER PARA QUE ESTO SEA UN TECLEO Y NO UNA CORTINA:
//
//   · LA SUAVIDAD VIENE EN 100 Y HAY QUE PONERLA EN 0. A 100 la forma cuadrada mezcla cada caracter a
//     lo largo de un paso entero, asi que las letras se desvanecen en vez de aparecer. El corte seco
//     NO es lo que sale de fabrica.
//   · SE ANIMA EL INICIO, NO EL FINAL. Con el rango [inicio, 100] en opacidad 0, subir el inicio
//     descubre las letras de izquierda a derecha. Animando el final se descubren al reves.
var FRASE = "Tu marca, en video";
var TAM_FRASE = 104;
var anchoFrase = anchoTexto(ac(FRASE), TAM_FRASE, F_DISPLAY, 0);
var x0Frase = (ANCHO - anchoFrase) / 2;
var yFrase = 560;
var C_ESCRIBE = 206, C_ESCRITA = 206 + ac(FRASE).length * 3;

var frase = rotulo(FRASE, TAM_FRASE, TINTA, F_DISPLAY, ANCHO / 2, yFrase, true);
frase.name = "frase-escrita";
var anFr = frase.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
anFr.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
anFr.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);
function selFr() { return anFr.property("ADBE Text Selectors").property(1); }
function avFr() { return selFr().property("ADBE Text Range Advanced"); }
avFr().property("ADBE Text Range Units").setValue(1);              // 1 = porcentaje
avFr().property("ADBE Text Selector Smoothness").setValue(0);      // el corte seco
selFr().property("ADBE Text Percent End").setValue(100);
claves(selFr().property("ADBE Text Percent Start"),
       [[C_ESCRIBE, 0, "C5"], [C_ESCRITA, 100, "C5"]]);
claves(op(frase), [[190, 100, "C5"], [278, 100, "C3"], [290, 0, "C5"]]);
plano(frase, 189, 292);

// EL COMETA VA EN MODO ANADIR. Un cometa de luz SUMA luz; en modo normal el mismo PNG se lee como
// pintura blanca, que es el defecto que se veia en la PIEZA-H. Y su x ya no sale de medir prefijos:
// sale del MISMO numero que descubre las letras, o sea la fraccion del rango. Van clavados por
// construccion en vez de por coincidencia de dos mediciones.
var cometa = img2d("cometa", "cometa", x0Frase, yFrase - 26, 46);
cometa.blendingMode = BlendingMode.ADD;
var ejCo = ejes(cometa);
claves(ejCo.x, [[C_ESCRIBE, x0Frase + 18, "C5"], [C_ESCRITA, x0Frase + anchoFrase + 18, "C5"]]);
claves(ejCo.y, [[C_ESCRIBE, yFrase - 26, "C5"], [C_ESCRITA, yFrase - 26, "C5"]]);
claves(op(cometa), [[C_ESCRIBE - 8, 0, "C2"], [C_ESCRIBE, 100, "C5"],
                    [C_ESCRITA - 4, 100, "C3"], [C_ESCRITA + 10, 0, "C5"]]);
plano(cometa, C_ESCRIBE - 10, C_ESCRITA + 12);

// ================================================================ E · EN TREINTA SEGUNDOS
titular("En treinta segundos", 96, TINTA, 540, 292, 56, "sube");

// ================================================================ F · EL DOCUMENTO
// AL 58% Y EN z=620 ESTE PANEL OCUPABA EL 99% DEL CUADRO Y SOBRESALIA 226 px POR ARRIBA Y POR ABAJO.
// Dos cosas distintas lo causaban y hacia falta arreglar las dos: la camara descentrada lo subia
// (arreglado arriba, valia 240 px) y ademas era DEMASIADO GRANDE — el borde CERCANO de un plano
// girado 27 grados se proyecta 1,35x, asi que un panel de 1114 unidades de alto se dibuja de 1503 px
// en un cuadro de 1080. Achicar sin mirar el borde cercano deja el panel corto y cortado igual.
//
// Y SE CORRE A LA DERECHA para dejarle a las lineas de estado su propio negro. Con la camara derecha
// el panel quedo centrado y las lineas —que antes caian sobre su parte vacia— pasaron a caer sobre su
// contenido: cuatro choques que la compuerta de colision encontro sola. Interfaz de un lado, texto del
// otro es ademas lo que el barrido midio en 8 de 8.
var panelDoc = img("panel-doc", "panel-documento", 1330, 520, 900, 44);
claves(tr(panelDoc).property("ADBE Rotate Y"), [[350, -34, "C1"], [420, -27, "C4"], [436, -26, "C5"]]);
tr(panelDoc).property("ADBE Rotate Z").setValue(-2);
var ejPDo = ejes(panelDoc);
claves(ejPDo.x, [[350, 1900, "C2"], [392, 1310, "C1"], [436, 1345, "C5"]]);
vive(panelDoc, 350, 12, 436, 18);

// las lineas que entran, con la ULTIMA TENIDA DE ACENTO y asentandose a tinta un cuadro despues: es la
// mitad del efecto de "esto se esta generando", medido en la referencia
var LINEAS = ["Gui{o}n listo", "Cortes elegidos", "M{u}sica al beat"];
var lf;
for (lf = 0; lf < LINEAS.length; lf++) {
  var yl = 430 + lf * 66;
  var c1 = 368 + lf * 16;
  var caliente = rotulo(LINEAS[lf], 44, AZUL2, F_LECTURA, 470, yl, false);
  caliente.name = "linea-caliente-" + lf;
  claves(op(caliente), [[c1, 0, "C2"], [c1 + 4, 100, "C5"], [c1 + 10, 100, "C3"], [c1 + 18, 0, "C5"]]);
  plano(caliente, c1 - 1, c1 + 20);
  var fria = rotulo(LINEAS[lf], 44, TINTA, F_LECTURA, 470, yl, false);
  fria.name = "linea-" + lf;
  claves(op(fria), [[c1 + 10, 0, "C2"], [c1 + 18, 100, "C5"], [428, 100, "C3"], [436, 0, "C5"]]);
  plano(fria, c1 + 9, 438);
}

// ================================================================ G · REVELADO POR MASCARA
//
// El texto sube desde DETRAS de un borde invisible. La matte va ARRIBA de la capa que recorta, y las dos
// son 2D y coplanares — que es el unico caso que el motor sabe hacer y el exportador rechaza el resto.
var txtRevela = rotulo("Sin abrir un editor", 88, TINTA, F_DISPLAY, 960, 560, true);
txtRevela.name = "titular-revelado";
var ejRe = ejes(txtRevela);
claves(ejRe.y, [[438, 560 + 96, "C2"], [452, 566, "C4"], [478, 560, "C5"],
                [488, 560, "C3"], [500, 512, "C5"]]);
claves(ejRe.x, [[438, 960, "C5"], [500, 960, "C5"]]);
claves(op(txtRevela), [[438, 100, "HOLD"], [494, 100, "C3"], [499, 0, "C5"]]);
plano(txtRevela, 437, 500);
var matteRevela = comp.layers.addSolid([1, 1, 1], "matte-revelado", 1300, 116, 1);
pos(matteRevela).setValue([960, 542]);
txtRevela.trackMatteType = TrackMatteType.ALPHA;

// ================================================================ H · EL ANILLO DE PROGRESO
var panelLinea = img("panel-linea", "panel-linea", 700, 520, 900, 50);
claves(tr(panelLinea).property("ADBE Rotate Y"), [[502, 30, "C1"], [560, 23, "C5"]]);
var ejPL = ejes(panelLinea);
claves(ejPL.x, [[502, 260, "C2"], [546, 700, "C1"], [576, 730, "C5"]]);
vive(panelLinea, 502, 12, 580, 16, 62);

// EL ANILLO ERA UN TRAZO PELADO Y SE VEIA COMO UN TRAZO PELADO.
//
// La primera version era una sola elipse recortada: un arco azul plano, sin cama, sin cabeza y sin
// nada que se moviera salvo su propio largo. Un anillo de progreso sin su CAMA no se lee como un
// anillo llenandose sino como un circulo roto — falta la referencia contra la cual el llenado
// significa algo. Son cuatro capas y ninguna necesita una funcion nueva del motor:
//
//   cama     el aro completo al 16%: dice cuanto falta
//   progreso el llenado, ahora LINEAL (ver abajo)
//   fino     un aro exterior mas delgado, un segmento corto, girando al reves
//   cabeza   un punto de luz en modo ANADIR pegado a la punta del llenado
//
// POR QUE EL LLENADO PASO A SER LINEAL. La cabeza se pega a la punta con claves propias, y para que
// vayan clavadas las dos curvas tienen que ser la misma. Emparejar una bezier con influencias 85/85
// exigiria resolver esa bezier en ES3 y muestrearla; con el llenado lineal, la punta es una funcion
// lineal del cuadro y las claves salen de un coseno. Ademas un progreso que se llena lineal es lo
// correcto: la aceleracion la ponen la entrada y el remate, no la barra.
var CX_ARCO = 1480, CY_ARCO = 520, R_ARCO = 130;
var C_LLENA = 506, C_LLENO = 566;

function anillo(nombre, diam, grosor, color, alfa) {
  var L = comp.layers.addShape();
  L.name = nombre;
  // EL DESENFOQUE DE MOVIMIENTO, que `img()`, `img2d()` y `rotulo()` encienden y este helper no
  // encendia. El anillo era la UNICA capa animada visible de las 48 sin arrastre, y encima es el borde
  // mas rapido de la pieza: la punta del llenado recorre 817 px en 60 cuadros, con un pico de 47,6
  // px/cuadro — 2,4 veces su propio grosor de trazo en un solo cuadro. Sin arrastre eso no se lee como
  // "plano", se lee como ESTROBOSCOPIO, y era una parte de por que el anillo "quedaba feo".
  L.motionBlur = true;
  var raiz = L.property("ADBE Root Vectors Group");
  var gru = raiz.addProperty("ADBE Vector Group");
  var cont = gru.property("ADBE Vectors Group");
  var el = cont.addProperty("ADBE Vector Shape - Ellipse");
  el.property("ADBE Vector Ellipse Size").setValue([diam, diam]);
  var tz = cont.addProperty("ADBE Vector Graphic - Stroke");
  tz.property("ADBE Vector Stroke Color").setValue(color);
  tz.property("ADBE Vector Stroke Width").setValue(grosor);
  var rc = cont.addProperty("ADBE Vector Filter - Trim");
  rc.property("ADBE Vector Trim Start").setValue(0);
  rc.property("ADBE Vector Trim End").setValue(100);
  pos(L).setValue([CX_ARCO, CY_ARCO]);
  if (alfa !== undefined) { op(L).setValue(alfa); }
  return { capa: L, recorte: rc };
}

var cama = anillo("arco-cama", 260, 20, [0.357, 0.553, 1, 1], 16);
plano(cama.capa, 504, 584);

var prog = anillo("arco-progreso", 260, 20, [0.357, 0.553, 1, 1]);
claves(prog.recorte.property("ADBE Vector Trim End"),
  [[C_LLENA, 0, "C5"], [C_LLENO, 100, "C5"], [580, 100, "C5"]]);
vive(prog.capa, 504, 10, 582, 12);

// EL ARO FINO GIRA AL REVES, y gira por DESFASE DEL RECORTE, no por rotacion de la capa: el motor lee
// `ADBE Vector Trim Offset` y lo aplica en el fragmento, asi que el segmento viaja por el aro sin que
// la capa se mueva. Un aro que rota entero delataria su costura; este no tiene.
var fino = anillo("arco-fino", 330, 4, [0.310, 0.847, 1, 1], 62);
fino.recorte.property("ADBE Vector Trim End").setValue(17);
claves(fino.recorte.property("ADBE Vector Trim Offset"), [[504, 0, "C5"], [584, -430, "C5"]]);
vive(fino.capa, 504, 14, 582, 14, 62);

// LA CABEZA, pegada a la punta del llenado. Va en ANADIR: un punto de luz SUMA luz, y en modo normal
// el mismo PNG se lee como pintura celeste. Una clave cada dos cuadros: el error de cuerda de un
// poligono de 31 lados sobre un radio de 130 es 0,7 px, invisible bajo un degradado radial.
var cabeza = img2d("punto-azul", "cabeza-arco", CX_ARCO, CY_ARCO - R_ARCO, 26);
cabeza.blendingMode = BlendingMode.ADD;
var ejCab = ejes(cabeza);
var kcx = [], kcy = [], cH, pH, aH;
for (cH = C_LLENA; cH <= C_LLENO; cH = cH + 2) {
  pH = (cH - C_LLENA) / (C_LLENO - C_LLENA);
  aH = pH * 2 * Math.PI;
  kcx[kcx.length] = [cH, CX_ARCO + R_ARCO * Math.sin(aH), "C5"];
  kcy[kcy.length] = [cH, CY_ARCO - R_ARCO * Math.cos(aH), "C5"];
}
claves(ejCab.x, kcx);
claves(ejCab.y, kcy);
// al completarse el aro la cabeza revienta y se apaga: es el remate que la barra lineal no da
claves(esc(cabeza), [[C_LLENA, [16, 16], "C2"], [C_LLENA + 8, [26, 26], "C5"],
                     [C_LLENO - 4, [26, 26], "C1"], [C_LLENO + 6, [64, 64], "C3"],
                     [C_LLENO + 18, [10, 10], "C5"]]);
claves(op(cabeza), [[C_LLENA, 0, "C2"], [C_LLENA + 5, 100, "C5"], [C_LLENO, 100, "C3"],
                    [C_LLENO + 16, 0, "C5"]]);
plano(cabeza, C_LLENA - 1, C_LLENO + 20);

var etiqArco = rotulo("listo", 52, TINTA, F_ETIQUETA, 1480, 538, true);
etiqArco.name = "etiqueta-listo";
claves(op(etiqArco), [[560, 0, "C2"], [570, 100, "C5"], [574, 100, "C3"], [582, 0, "C5"]]);
plano(etiqArco, 559, 584);

// ================================================================ I · TRES PALABRAS A BEAT
// con INTERLETRA, que hasta hoy se dibujaba con las ultimas letras cortadas
var PALS = ["guiones", "cortes", "m{u}sica"];
var pi;
for (pi = 0; pi < PALS.length; pi++) {
  var cp = 584 + pi * 22;
  var pal = rotulo(PALS[pi], 92, pi === 1 ? AZUL2 : TINTA, F_DISPLAY, 960, 540, true, 120);
  pal.name = "titular-" + PALS[pi];
  var ejP = ejes(pal);
  claves(ejP.y, [[cp, 540 + 40, "C2"], [cp + 6, 540, "C4"], [cp + 18, 540, "C3"], [cp + 22, 520, "C5"]]);
  claves(ejP.x, [[cp, 960, "C5"], [cp + 22, 960, "C5"]]);
  claves(op(pal), [[cp, 0, "C2"], [cp + 5, 100, "C5"], [cp + 17, 100, "C3"], [cp + 21, 0, "C5"]]);
  plano(pal, cp - 1, cp + 23);
}

// ================================================================ J · EL CONMUTADOR
// EL CONMUTADOR TIENE QUE CONMUTAR.
//
// La version anterior era UN PNG con la pastilla ya puesta sobre "Vista". El cursor entraba, hacia el
// gesto del click y no pasaba nada, porque el estado final estaba horneado desde el primer cuadro. La
// interaccion estaba MIMADA. Y no habia forma de arreglarlo animando: un mapa de bits plano no tiene
// dos estados, asi que el defecto era de ESTRUCTURA DEL RECURSO, no de coreografia.
//
// Ahora son cuatro capas: la pista se queda, la perilla se desliza, y los dos rotulos se turnan el
// color. Los tres rotulos y la pista comparten lienzo y coordenadas —se dibujan en el mismo tamano en
// `recursos-h.mjs`— asi que alinearlos no es una cuenta sino la misma posicion y la misma escala.
//
// Y LA PISTA YA NO ESCALA AL ENTRAR. La escala animada obligaba a que el recorrido de la perilla
// escalara con ella, que es justo el tipo de acoplamiento que se rompe callado. Ademas el barrido
// midio que la entrada tipica del genero no es una escala: entra subiendo, que es lo que hace ahora.
var CONMU_ESC = 60 / K3;                              // 20% de un recurso 3x = 0,60 del diseno
var DESLIZ = 174 * 3 * CONMU_ESC / 100;               // 174 unidades de diseno -> 104,4 px
var Y_CONMU = 560;

function entraSubiendo(capa, yBase, c0) {
  var e = ejes(capa);
  claves(e.y, [[c0, yBase + 26, "C2"], [c0 + 16, yBase, "C4"], [722, yBase, "C5"]]);
  return e;
}

var pista = img2d("conmu-pista", "conmu-pista", 960, Y_CONMU, CONMU_ESC);
entraSubiendo(pista, Y_CONMU, 652);
vive(pista, 652, 12, 722, 14);

var perilla = img2d("conmu-perilla", "conmu-perilla", 960 - DESLIZ, Y_CONMU, CONMU_ESC);
var ejPer = entraSubiendo(perilla, Y_CONMU, 652);
// EL DESLIZAMIENTO ARRANCA DOS CUADROS DESPUES DEL CLICK (el cursor hunde su escala en el 700) y pasa
// de largo 9 px antes de acomodarse: es el rebote corto que el barrido midio en los conmutadores de
// las referencias, no un adorno.
claves(ejPer.x, [[652, 960 - DESLIZ, "C5"], [702, 960 - DESLIZ, "C1"],
                 [714, 960 + DESLIZ + 9, "C3"], [722, 960 + DESLIZ, "C5"]]);
vive(perilla, 652, 12, 722, 14);

var rotCod = img2d("conmu-codigo", "conmu-codigo", 960, Y_CONMU, CONMU_ESC);
entraSubiendo(rotCod, Y_CONMU, 652);
claves(op(rotCod), [[652, 0, "C2"], [664, 100, "C5"], [702, 100, "C3"], [710, 0, "C5"]]);
plano(rotCod, 651, 723);

var rotVis = img2d("conmu-vista", "conmu-vista", 960, Y_CONMU, CONMU_ESC);
entraSubiendo(rotVis, Y_CONMU, 652);
claves(op(rotVis), [[652, 0, "C5"], [706, 0, "C2"], [716, 100, "C5"], [722, 100, "C5"]]);
plano(rotVis, 651, 723);
var cursor = img2d("cursor", "cursor", 1180, 700, 62);
var ejCu = ejes(cursor);
claves(ejCu.x, [[656, 1420, "C2"], [686, 1128, "C1"], [702, 1124, "C5"], [716, 1170, "C5"]]);
claves(ejCu.y, [[656, 820, "C2"], [686, 606, "C1"], [702, 602, "C5"], [716, 636, "C5"]]);
claves(esc(cursor), [[656, [62, 62], "C2"], [694, [62, 62], "C3"], [700, [51, 51], "C1"], [712, [62, 62], "C5"]]);
vive(cursor, 656, 8, 718, 10);

var etiqJ = rotulo("Vos elegis el tono", 44, SUAVE, F_ETIQUETA, 960, 730, true);
etiqJ.name = "etiqueta-tono";
claves(op(etiqJ), [[664, 0, "C2"], [678, 100, "C5"], [706, 100, "C3"], [718, 0, "C5"]]);
plano(etiqJ, 663, 720);

// ================================================================ K · EL GESTO GRANDE
//
// LA UNICA VEZ EN TODA LA PIEZA. El barrido midio que el gesto de 3x a 25x aparece una a tres veces por
// aviso, y NUNCA en la entrada de un rotulo: va en una transicion. Aca es la salida — la palabra
// atraviesa la camara y detras queda la estrella.
var gesto = rotulo("Listo", 132, TINTA, F_DISPLAY, 960, 540, true);
gesto.name = "titular-Listo";
claves(esc(gesto), [[724, [96, 96], "C2"], [736, [104, 104], "C4"], [752, [104, 104], "C3"],
                    [780, [760, 760], "C7"]]);
claves(op(gesto), [[724, 0, "C2"], [732, 100, "C5"], [766, 100, "C3"], [779, 0, "C5"]]);
plano(gesto, 723, 781);

// ================================================================ L+M · EL CIERRE
var pildoraFin = img2d("pildora-ancha", "pildora-final", 1010, 540, 4 / K2);
claves(esc(pildoraFin), [[812, [4 / K2, 4 / K2], "C2"], [836, [62 / K2, 62 / K2], "C1"],
                         [850, [58 / K2, 58 / K2], "C5"], [896, [58 / K2, 58 / K2], "C5"]]);
claves(op(pildoraFin), [[812, 0, "C2"], [828, 100, "C5"], [880, 100, "C3"], [896, 0, "C5"]]);
plano(pildoraFin, 811, 898);
var etiqFin = rotulo("Prob{a} cliping", 46, TINTA, F_ETIQUETA, 1010, 556, true);
etiqFin.name = "etiqueta-proba";
claves(op(etiqFin), [[822, 0, "C2"], [834, 100, "C5"], [880, 100, "C3"], [896, 0, "C5"]]);
plano(etiqFin, 821, 898);

var url = rotulo("cliping.ia", 76, AZUL2, F_DISPLAY, 960, 700, true);
url.name = "url";
var ejU = ejes(url);
claves(ejU.y, [[856, 700 + 40, "C2"], [868, 700, "C4"], [900, 700, "C5"]]);
claves(ejU.x, [[856, 960, "C5"], [900, 960, "C5"]]);
claves(op(url), [[856, 0, "C2"], [870, 100, "C5"], [900, 100, "C5"]]);
plano(url, 855, 900);

// ================================================================ EL GRANO
var grano = img2d("grano1", "grano", 960, 540, 100);
op(grano).setValue(14);
plano(grano, 0, 900);

anotar("PIEZA|" + NOMBRE + "|" + ANCHO + "x" + ALTO + "|" + FPS + "fps|" + CUADROS + " cuadros");
anotar("CAPAS|" + comp.numLayers);
anotar("LETRAS|el tecleo lo hace UN animador, no 18 capas");
anotar("MEDIDO|ancho de la frase = " + anchoFrase.toFixed(1) + " px");
if (medidor !== null) { medidor.remove(); }
comp.time = 0;
app.endUndoGroup();
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
