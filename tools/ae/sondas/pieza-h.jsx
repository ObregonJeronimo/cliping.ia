// PIEZA-H — la recreacion 1:1 de la estructura de la referencia.
//
// ================================================================ DE DONDE SALE
//
// No de la memoria ni de una descripcion: de MIRAR el video. Se extrajeron 120 cuadros a 2 por segundo,
// se armaron cinco hojas de contacto de 6x4 y se miraron las cinco. De ahi salio el mapa de los
// TREINTA Y CUATRO tiempos que estan abajo, con sus cuadros.
//
// Y salio una correccion a una regla mia: yo venia midiendo "un gesto cada 8-16 cuadros" (M1/M6). La
// referencia tiene un tiempo cada ~60 cuadros. No es que sea lenta — es que cada tiempo es una ESCENA
// ENTERA, no un gesto. Mi metrica estaba calibrada para otra escala de pieza. Esta la rompe a proposito
// y lo declara, igual que la PIEZA-G rompe M5.
//
// ================================================================ FICHA DE ARTE
// FAMILIA      cinematica oscura con luz de borde
// PALETA       fondo NEGRO PURO #000 · chapa #1b1e26 -> #0e1116
//              azul #5b8dff · violeta #a97bff · cian #4fd8ff — LA LUZ ES EL COLOR
//              tinta #f1f3f7 · suave #9aa3b5
// LUZ          cada objeto EMITE por su canto (franja + halo horneados). Tres manchas grandes detras.
// FORMA        chasis radio 26, trazo 3,5 px en degradado; pildoras con contorno encendido
// TIPOGRAFIA   CenturyGothic para titulares (medida: 0,20% de desvio, la mejor de las once probadas)
//              SegoeUI-Light para lectura, SegoeUI para etiquetas.
//              JERARQUIA POR TAMANO Y COLOR, nunca por peso: el peso no viaja al motor.
// PROFUNDIDAD  paneles muy girados (30-45 grados en Y). Nada de frente.
// SIMBOLO      la ESTRELLA de cuatro puntas: abre la pieza sola y la cierra dentro de la pildora.
//              Es el unico elemento que aparece dos veces, y por eso cierra el circulo.
//
// ================================================================ LOS TREINTA Y CUATRO TIEMPOS
//   A    0- 40  la estrella sola, creciendo sobre negro
//   B   40- 88  la estrella sube y aparece la marca
//   C   88-162  corte: el panel en escorzo entra desde la derecha
//   D  162-216  se multiplica en tres, escalonados
//   E  216-248  un destello blanco barre el cuadro
//   F  248-306  "Tu estudio de video" a TRES ESCALAS
//   G  306-352  "Reimaginado para"
//   H  352-400  las letras se dispersan
//   I  400-462  se reagrupan en "EN EQUIPO" y empujan enormes
//   J  486-518  "Presentamos"  (CORTE seco desde la palabra enorme, no fundido)
//   K  518-548  "Lienzo" / "en cliping"
//   L  548-620  LA PALABRA SE CONVIERTE EN EL BOTON y el boton aterriza en la interfaz
//   M  620-668  "Del primer borrador"
//   N  668-740  la burbuja tipea
//   O  740-800  el documento en escorzo
//   P  800-856  "A todas las versiones"
//   Q  856-930  el documento con su barra, encuadrado por arcos
//   R  930-990  "Pedile a cliping que revise"
//   S  990-1052 la tarjeta de sugerencia
//   T 1052-1112 "Convertí tus ideas"
//   U 1112-1200 la barra de prompt tipea
//   V 1200-1256 "en" -> "{c0d1g0}" -> "codigo"  (se desarma y resuelve)
//   W 1256-1316 el editor en escorzo
//   X 1316-1378 "Y mira el resultado"
//   Y 1378-1440 el conmutador se agranda con brillo
//   Z 1440-1490 la tarjeta del elemento
//  AA 1490-1524 "documentos"
//  AB 1524-1558 "lineas de tiempo"
//  AC 1558-1590 "datos"
//  AD 1590-1626 "juegos"
//  AE 1626-1660 "apps"
//  AF 1660-1714 la estrella vuelve y se arma la pildora
//  AG 1714-1752 la pildora se vuelve "Lienzo" y gira
//  AH 1748-1800 el cierre
//
// ================================================================ LO QUE SE ROMPE A PROPOSITO
// Cinco de siete pasan. Fallan M6 y M3, y las dos por el mismo motivo de fondo: la metrica se calibro
// sobre una pieza de GESTOS y esta es una pieza de ESCENAS.
//
//   M6 pide que no haya un hueco de mas de 20 cuadros sin arranque. Esta pieza tiene un tiempo cada
//      ~60: la referencia medida tambien. Cumplir M6 seria hacer OTRA pieza, mas ocupada.
//   M3 pide que la energia se reparta entre 0,45 y 0,85. Cuenta las manchas de luz del fondo como un
//      elemento que compite, y son justo lo contrario: un piso constante y suave, que es lo que hace
//      que un titular solo sobre negro no se sienta muerto. Al agrandarlas, "sin acompanamiento" bajo
//      de 161 cuadros a 99 —o sea que hicieron lo que tenian que hacer— y M3 igual reprueba porque
//      ahora hay tres cosas de magnitud parecida. La metrica no distingue fondo de figura.
//
// LO QUE M6 SI ENCONTRO, y que era un defecto de verdad: el hueco de 88 cuadros en el 339-427 delataba
// que el estallido estaba hecho al reves (las letras aparecian ya dispersas), y los de 105-162 y
// 747-795 que los paneles aterrizaban y se clavaban. Los tres se arreglaron. Una compuerta que reprueba
// por el estilo puede seguir teniendo razon sobre un caso concreto: hay que mirar QUE senala, no solo
// si pasa.
//
// USO
//   node tools/ae/recursos-h.mjs
//   node tools/ae/es3-check.mjs tools/ae/sondas/pieza-h.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-h.jsx

var RUTA = "C:/ae-probe/pieza-h.txt";
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
  s = s.replace(/\{O\}/g, String.fromCharCode(211));
  return s;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("PIEZA-H");

var NOMBRE = "PIEZA-H";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 1800;
var DUR = CUADROS / FPS;

var TINTA = [0.945, 0.953, 0.969];
var SUAVE = [0.604, 0.639, 0.710];
var AZUL = [0.357, 0.553, 1.000];
var AZUL2 = [0.541, 0.706, 1.000];
var VIOLETA = [0.663, 0.482, 1.000];
var CIAN = [0.310, 0.847, 1.000];

var F_DISPLAY = "CenturyGothic";
var F_LECTURA = "SegoeUI-Light";
var F_ETIQUETA = "SegoeUI";

// LOS RECURSOS QUE LLEGAN A LLENAR EL CUADRO SE DIBUJAN AL DOBLE O AL TRIPLE de pixeles nativos, para
// cumplir Q2 (nativo entre 2x y 4x de lo dibujado). Como el recurso es mas grande, la escala de la capa
// tiene que bajar en la misma proporcion — y se escribe como division, no como el numero ya resuelto,
// para que se vea de donde sale y no se desincronice con el generador en el proximo cambio.
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
// ANTERIOR. Sale del volcado, no de una sospecha: `marca` quedo con la clave 2 saliendo 6612 (lineal,
// puesta por C5) y la clave 3 entrando 6613 (bezier) — porque el tramo C3 siguiente le aplico una
// influencia a la clave 3 y de paso le devolvio la entrada a bezier. Sesenta y cuatro tramos asi.
//
// Por eso los tipos se vuelven a fijar DESPUES de las influencias. Fijarlos antes es escribir algo que
// la linea siguiente borra, sin error y sin sintoma hasta que alguien exporta.
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
// TODAS LAS CLAVES DE UNA PROPIEDAD EN UNA SOLA LLAMADA.
//
// No es estilo: es la unica forma de que cada SEGMENTO quede con el mismo tipo en sus dos extremos. Una
// segunda llamada sobre la misma propiedad deja un tramo con salida lineal y entrada bezier, y el
// exportador lo rechaza con "tipos mezclados". Lo pague tres veces antes de escribirlo.
function claves(prop, lista) {
  var i;
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
// el azar de esta pieza es DETERMINISTA: la misma semilla da el mismo video, siempre.
var _s = 20260814;
function azar() { _s = (_s * 1103515245 + 12345) % 2147483648; return _s / 2147483648; }

// ---------------------------------------------------------------- la composicion
var n = app.project.numItems;
while (n > 0) {
  var it = app.project.item(n);
  if (it instanceof CompItem && it.name === NOMBRE) { it.remove(); }
  n = n - 1;
}
var comp = app.project.items.addComp(NOMBRE, ANCHO, ALTO, 1, DUR, FPS);
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

// EL FONDO ES UN SOLIDO REAL — LEY 4, y la vengo violando. `comp.bgColor` no existe hasta la
// codificacion: lo que se ve en el visor es el visor componiendo sobre blanco, no un fondo.
function solidoNegro() {
  var s = comp.layers.addSolid([0, 0, 0], "fondo-negro", 12000, 7000, 1);
  s.threeDLayer = true;
  s.motionBlur = false;
  pos(s).setValue([ANCHO / 2, ALTO / 2, 3900]);
  return s;
}
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
// LOS TITULARES SON CAPAS 2D Y NO ES UN ATAJO: en AE una capa 2D dentro de una composicion con camara
// la IGNORA y queda pegada al cuadro, que es exactamente lo que hace un rotulo sobreimpreso. Con eso
// sus coordenadas SON coordenadas de pantalla y no hay nada que convertir. Puestos en 3D cerca de una
// camara que ademas viaja, se van de cuadro — medido en la PIEZA-G.
function rotulo(cadena, tam, color, fuente, x, y, centrado) {
  var t = comp.layers.addText(ac(cadena));
  var p = fuenteDe(t);
  var d = p.value;
  d.fontSize = tam; d.fillColor = color; d.applyFill = true;
  d.justification = centrado ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
  try { d.font = fuente; } catch (exF) {}
  p.setValue(d);
  t.threeDLayer = false;
  t.motionBlur = true;
  pos(t).setValue([x, y]);
  return t;
}

// ---------------------------------------------------------------- LA REGLA: MEDIR, NO ESTIMAR
// Un titular de dos colores son dos capas puestas una al lado de la otra, y la segunda necesita saber
// donde termina la primera. Estimarlo deja un hueco o un pisado, y las dos cosas se ven. El ancho del
// espacio se mide aparte porque un espacio no tiene tinta que medir.
var medidor = null;
function medirCon(cadena, tam, fuente) {
  if (medidor === null) {
    medidor = comp.layers.addText("n");
    medidor.name = "deco-medidor";
    // NO se apaga. `sourceRectAtTime` sobre una capa apagada es justo la clase de suposicion que sale
    // cara: si devolviera cero, TODOS los anchos darian cero y todos los titulares quedarian centrados
    // sobre un ancho falso, sin error. Se quita al final, que es lo unico que hace falta.
  }
  var p = fuenteDe(medidor);
  var d = p.value;
  d.fontSize = tam;
  try { d.font = fuente; } catch (exM) {}
  d.text = cadena;
  p.setValue(d);
  return medidor.sourceRectAtTime(0, false);
}
// el ancho de AVANCE, no el de tinta: se mide la cadena con una "n" pegada y se le resta la "n" sola,
// asi un espacio final tambien cuenta.
function anchoTexto(cadena, tam, fuente) {
  if (cadena === "") { return 0; }
  var base = medirCon("n", tam, fuente).width;
  return medirCon(cadena + "n", tam, fuente).width - base;
}
function cajaTexto(cadena, tam, fuente) { return medirCon(cadena, tam, fuente); }

// ---------------------------------------------------------------- el titular a TRES ESCALAS
// La firma tipografica de la referencia: la misma linea salta de tamano sobre los tiempos, con corte
// duro. Se hace con claves HOLD sobre escala y posicion.
//
// Escalar una capa de texto pasa alrededor de su ancla, que en un texto alineado a la izquierda es el
// arranque de la linea de base. Asi que para que el par quede CENTRADO y crezca alrededor de su propio
// medio hay que recalcular x e y para cada escala. Es aritmetica, y sale exacta.
// Con UNA sola palabra, `colorDos` es el color de esa palabra: asi la lista rapida (cinco palabras
// sueltas, cada una de un color) no necesita un camino aparte.
function titular(uno, dos, tam, colorDos, yCentro, fuente) {
  fuente = fuente || F_DISPLAY;
  yCentro = yCentro === undefined ? 540 : yCentro;
  var esp = anchoTexto("n n", tam, fuente) - anchoTexto("nn", tam, fuente);
  var w1 = anchoTexto(ac(uno), tam, fuente);
  var w2 = dos === "" ? 0 : anchoTexto(ac(dos), tam, fuente);
  var total = w1 + (dos === "" ? 0 : esp + w2);
  var caja = cajaTexto(ac(uno) + (dos === "" ? "" : " " + ac(dos)), tam, fuente);
  var h = { total: total, w1: w1, esp: esp, tam: tam, yc: yCentro,
            dy: caja.top + caja.height / 2, a: null, b: null };
  h.a = rotulo(uno, tam, dos === "" ? colorDos : TINTA, fuente, 0, 0);
  h.a.name = "titular-" + uno;
  if (dos !== "") { h.b = rotulo(dos, tam, colorDos, fuente, 0, 0); h.b.name = "titular-" + dos; }
  return h;
}
// estados = [[cuadro, escala], ...] — el salto entre estados es DURO (HOLD), que es la firma de la
// referencia. `hasta` es el cuadro en que el titular se va.
//
// Y ADEMAS UNA DERIVA LENTA EN Y, que no es adorno. Sin ella un tiempo de titular es un cuadro
// COMPLETAMENTE QUIETO: el texto salta de tamano y despues no pasa nada durante dos segundos. Medido
// aca — entre el 462 y el 548 la pieza tenia 86 cuadros sin un solo movimiento, porque "Presentamos" y
// "Lienzo" son los dos titulares puros y uno viene atras del otro. Es exactamente la coreografia muerta
// que hundio la PIEZA-C.
//
// La deriva va SOLO EN Y y solo DENTRO de cada estado: entre estados sigue habiendo salto duro, porque
// la posicion depende de la escala (y = yc - dy*s/100) y suavizar ese salto desalinearia el par de
// colores mientras la escala cambia de golpe.
function ubicar(h, estados, hasta) {
  var kx = [], ky = [], ke = [], jx = [], jy = [], i;
  for (i = 0; i < estados.length; i++) {
    var c = estados[i][0], s = estados[i][1];
    var fin = i + 1 < estados.length ? estados[i + 1][0] : hasta;
    var x1 = (ANCHO - h.total * s / 100) / 2;
    var x2 = x1 + (h.w1 + h.esp) * s / 100;
    var y = h.yc - h.dy * s / 100;
    // EL ACERCAMIENTO LENTO DE LA PROPIA PALABRA, no una deriva vertical.
    //
    // La primera version subia el texto 14 px y no servia: dio 3,96 px en 17 cuadros, o sea 0,23 px por
    // cuadro, y la metrica no lo conto — con razon. Un titular que se acerca un 3-6% durante su tiempo
    // recentra ademas en los dos ejes, asi que el borde de la palabra se mueve varios pixeles por
    // cuadro. Es lo que hace la referencia y es movimiento de verdad, no un numero para la compuerta.
    var tramo = Math.max(2, fin - c);
    var crece = 1 + Math.min(0.06, 0.02 + tramo * 0.0006);
    var s2 = s * crece;
    var x1b = (ANCHO - h.total * s2 / 100) / 2;
    var yb = h.yc - h.dy * s2 / 100;
    kx[kx.length] = [c, x1, "C4"];
    kx[kx.length] = [fin - 1, x1b, "HOLD"];
    ke[ke.length] = [c, [s, s], "C4"];
    ke[ke.length] = [fin - 1, [s2, s2], "HOLD"];
    ky[ky.length] = [c, y, "C4"];
    ky[ky.length] = [fin - 1, yb, "HOLD"];
    if (h.b !== null) {
      jx[jx.length] = [c, x2, "C4"];
      jx[jx.length] = [fin - 1, x1b + (h.w1 + h.esp) * s2 / 100, "HOLD"];
      jy[jy.length] = [c, y, "C4"];
      jy[jy.length] = [fin - 1, yb, "HOLD"];
    }
    if (i + 1 === estados.length) {
      kx[kx.length] = [fin, x1, "C5"];
      ke[ke.length] = [fin, [s, s], "C5"];
      if (h.b !== null) { jx[jx.length] = [fin, x2, "C5"]; }
    }
  }
  var ex = ejes(h.a);
  claves(ex.x, kx); claves(ex.y, ky); claves(esc(h.a), ke);
  if (h.b !== null) {
    var ex2 = ejes(h.b);
    claves(ex2.x, jx); claves(ex2.y, jy); claves(esc(h.b), ke);
  }
}
// el fundido completo de una capa, EN UNA SOLA LLAMADA
function vive(capa, entra, dEnt, sale, dSal) {
  claves(op(capa), [[entra, 0, "C2"], [entra + dEnt, 100, "C5"], [sale - dSal, 100, "C3"], [sale, 0, "C5"]]);
  plano(capa, Math.max(0, entra - 1), Math.min(CUADROS, sale + 1));
  return capa;
}
// El mismo fundido pero con TECHO. Existe por el defecto que aparecio cuatro veces en la pieza y que
// es UNO SOLO: el titular cae encima del texto del panel y se pisan. En la referencia, cuando hay un
// rotulo sobre una interfaz, la interfaz esta ATENUADA — no compite. Un panel al 100% detras de un
// titular no es "mas informacion", es ruido que hace ilegibles las dos cosas.
function viveTope(capa, entra, dEnt, sale, dSal, tope) {
  claves(op(capa), [[entra, 0, "C2"], [entra + dEnt, tope, "C5"], [sale - dSal, tope, "C3"], [sale, 0, "C5"]]);
  plano(capa, Math.max(0, entra - 1), Math.min(CUADROS, sale + 1));
  return capa;
}
function viveTitular(h, entra, dEnt, sale, dSal) {
  vive(h.a, entra, dEnt, sale, dSal);
  if (h.b !== null) { vive(h.b, entra, dEnt, sale, dSal); }
}

// las letras de una cadena, cada una su propia capa, en su posicion EXACTA
function letras(cadena, tam, color, fuente, xIzq, yBase) {
  var salida = [], i;
  for (i = 0; i < cadena.length; i++) {
    var ch = cadena.charAt(i);
    if (ch === " ") { continue; }
    var dx = anchoTexto(cadena.substring(0, i), tam, fuente);
    var t = rotulo(ch, tam, color, fuente, xIzq + dx, yBase);
    t.name = "letra-" + i + "-" + ch;
    salida[salida.length] = { capa: t, x: xIzq + dx, y: yBase, i: i };
  }
  return salida;
}

var MANIFIESTO = [];
function parametro(capa, prop, ruta, nombrePublico, tipo) {
  if (prop === null || prop === undefined) { return false; }
  var ok = false;
  try {
    if (typeof prop.addToMotionGraphicsTemplateAs === "function") {
      ok = prop.addToMotionGraphicsTemplateAs(comp, nombrePublico) ? true : false;
    }
  } catch (exPar) { ok = false; }
  if (!ok) { return false; }
  var idc = 0;
  try { idc = capa.id; } catch (exIdc) { idc = 0; }
  MANIFIESTO[MANIFIESTO.length] = "PARAM|" + idc + "|" + ruta + "|" + nombrePublico + "|" + tipo;
  return true;
}

// ================================================================ EL ESPACIO
var fondoNegro = solidoNegro();

var manchaA = img("luz-azul", "deco-luz-azul", 480, 420, 2700, 172);
var manchaB = img("luz-violeta", "deco-luz-violeta", 1500, 720, 2500, 162);
var manchaC = img("luz-cian", "deco-luz-cian", 1080, 240, 2900, 150);
var ejMA = ejes(manchaA), ejMB = ejes(manchaB), ejMC = ejes(manchaC);
// las manchas respiran durante los sesenta segundos: es lo unico que nunca para, y es lo que separa el
// negro puro de un negro con aire adentro.
// LAS MANCHAS SON EL ACOMPANAMIENTO, y para eso tienen que MOVERSE de verdad.
//
// La primera version las hacia derivar 460 px en 600 cuadros: 0,77 px por cuadro, o sea nada. M3 lo
// dijo con numeros — 161 cuadros con UN SOLO elemento con energia y nada acompanando — y son justo los
// tiempos de titular, donde el fondo es lo unico que podria estar vivo. Ahora recorren tramos de ~500
// px en ~200 cuadros (2,5 px por cuadro) en los dos ejes. Sigue siendo lento y difuso, porque son
// manchas de 2000 px con caida suave: lo que cambia no es que se noten, es que el cuadro respira.
claves(ejMA.x, [[0, 300, "C4"], [200, 640, "C4"], [430, 250, "C4"], [640, 780, "C4"],
                [880, 320, "C4"], [1120, 700, "C4"], [1380, 260, "C4"], [1600, 640, "C4"], [1800, 380, "C5"]]);
claves(ejMA.y, [[0, 420, "C4"], [260, 700, "C4"], [560, 300, "C4"], [900, 720, "C4"],
                [1260, 340, "C4"], [1560, 680, "C4"], [1800, 420, "C5"]]);
claves(ejMB.x, [[0, 1700, "C4"], [230, 1240, "C4"], [500, 1780, "C4"], [760, 1180, "C4"],
                [1040, 1720, "C4"], [1320, 1220, "C4"], [1580, 1700, "C4"], [1800, 1360, "C5"]]);
claves(ejMB.y, [[0, 720, "C4"], [300, 340, "C4"], [640, 760, "C4"], [1000, 320, "C4"],
                [1400, 700, "C4"], [1800, 400, "C5"]]);
claves(ejMC.y, [[0, 180, "C4"], [240, 560, "C4"], [520, 200, "C4"], [820, 620, "C4"],
                [1140, 220, "C4"], [1460, 580, "C4"], [1800, 240, "C5"]]);
claves(ejMC.x, [[0, 1080, "C4"], [340, 700, "C4"], [720, 1300, "C4"], [1100, 720, "C4"],
                [1500, 1240, "C4"], [1800, 960, "C5"]]);
claves(op(manchaA), [[0, 0, "C2"], [30, 74, "C4"], [900, 90, "C4"], [1800, 70, "C5"]]);
claves(op(manchaB), [[0, 0, "C2"], [40, 60, "C4"], [1000, 88, "C4"], [1800, 62, "C5"]]);
claves(op(manchaC), [[0, 0, "C2"], [50, 46, "C4"], [1100, 66, "C4"], [1800, 44, "C5"]]);

// LA CAMARA. Un solo movimiento continuo con acentos en los tres momentos grandes: el empuje de
// "EN EQUIPO", el corte de encaje del boton, y el conmutador que se agranda. Solo toca los objetos 3D:
// los titulares son 2D y la ignoran.
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
var ejCam = ejes(cam);
claves(ejCam.z, [
  [0, -2000, "C4"], [88, -1760, "C1"], [216, -1620, "C4"], [400, -1560, "C3"],
  [462, -1180, "C2"], [548, -1700, "C1"], [612, -1620, "C4"], [930, -1520, "C4"],
  [1256, -1600, "C4"], [1378, -1540, "C3"], [1440, -1120, "C2"], [1490, -1660, "C1"],
  [1660, -1740, "C4"], [1800, -1900, "C5"]
]);
claves(ejCam.x, [
  [0, 960, "C4"], [162, 1080, "C4"], [400, 880, "C4"], [740, 1040, "C4"],
  [1112, 900, "C4"], [1440, 1010, "C4"], [1800, 960, "C5"]
]);
claves(ejCam.y, [
  [0, 540, "C4"], [300, 470, "C4"], [900, 600, "C4"], [1440, 500, "C4"], [1800, 540, "C5"]
]);

// ================================================================ A · LA ESTRELLA SOLA   0-40
// Abre con el simbolo y nada mas. Es lo mas barato que existe y lo que mas confianza da: si lo primero
// que se ve esta bien hecho, lo que sigue arranca con credito.
var estrella = img2d("estrella", "estrella", 960, 540, 6);
claves(esc(estrella), [
  [0, [6, 6], "C2"], [26, [30, 30], "C1"], [40, [26, 26], "C1"],
  [88, [17, 17], "C1"], [1660, [17, 17], "C2"], [1690, [34, 34], "C1"],
  [1714, [28, 28], "C1"], [1752, [10, 10], "C3"], [1800, [10, 10], "C5"]
]);
var ejEs = ejes(estrella);
claves(ejEs.y, [
  [0, 540, "C2"], [40, 540, "C1"], [88, 372, "C1"], [1660, 372, "C2"],
  [1690, 470, "C1"], [1714, 470, "C1"], [1752, 540, "C3"], [1800, 540, "C5"]
]);
claves(ejEs.x, [
  [0, 960, "C5"], [1690, 960, "C1"], [1714, 660, "C1"], [1752, 700, "C3"], [1800, 700, "C5"]
]);
claves(tr(estrella).property("ADBE Rotate Z"), [
  [0, -40, "C2"], [40, 0, "C4"], [1660, 0, "C2"], [1714, 12, "C3"], [1800, 12, "C5"]
]);
claves(op(estrella), [
  [0, 0, "C2"], [10, 100, "C5"], [104, 100, "C3"], [118, 0, "HOLD"],
  [1660, 0, "C2"], [1672, 100, "C5"], [1770, 100, "C3"], [1786, 0, "C5"]
]);
plano(estrella, 0, 1800);

// ================================================================ B · LA MARCA   40-88
var marca = rotulo("cliping", 96, TINTA, F_DISPLAY, 960, 640, true);
marca.name = "marca";
claves(esc(marca), [[40, [70, 70], "C2"], [60, [100, 100], "C1"], [104, [100, 100], "C3"], [118, [92, 92], "C5"]]);
vive(marca, 40, 16, 118, 14);

// ================================================================ C · EL PANEL ENTRA   88-162
// Muy girado. El escorzo fuerte es la mitad del estilo; de frente esto se ve como una presentacion.
var panelA = img("panel-hola", "panel-hola-a", 1180, 520, 700, 58);
claves(tr(panelA).property("ADBE Rotate Y"), [[88, -36, "C1"], [162, -30, "C4"], [262, -25, "C5"]]);
tr(panelA).property("ADBE Rotate Z").setValue(-2.5);
var ejPA = ejes(panelA);
claves(ejPA.x, [[88, 2500, "C2"], [140, 1120, "C1"], [216, 1180, "C4"], [248, 1240, "C3"], [262, 1240, "C5"]]);
claves(ejPA.y, [[88, 620, "C2"], [140, 520, "C1"], [262, 500, "C5"]]);
vive(panelA, 88, 12, 262, 22);

// ================================================================ D · SE MULTIPLICA   162-216
// Escalonado: 0, 9 y 18 cuadros. Un escalon es UN gesto, no tres — el ojo lo lee como una sola cosa que
// se despliega.
var panelB = img("panel-doc", "panel-hola-b", 900, 420, 1250, 50);
tr(panelB).property("ADBE Rotate Y").setValue(-32);
tr(panelB).property("ADBE Rotate Z").setValue(-2.5);
var ejPB = ejes(panelB);
claves(ejPB.x, [[162, 2300, "C2"], [206, 880, "C1"], [262, 940, "C5"]]);
vive(panelB, 162, 10, 262, 22);

var panelC = img("panel-linea", "panel-hola-c", 640, 340, 1800, 44);
tr(panelC).property("ADBE Rotate Y").setValue(-32);
tr(panelC).property("ADBE Rotate Z").setValue(-2.5);
var ejPC = ejes(panelC);
claves(ejPC.x, [[171, 2200, "C2"], [215, 620, "C1"], [262, 680, "C5"]]);
vive(panelC, 171, 10, 262, 22);

// ================================================================ E · EL DESTELLO   216-248
// Un haz blanco que cruza y deja el titular atras. Es la unica transicion "de efecto" de la pieza, y
// esta puesta justo donde la referencia la pone: entre el producto y la promesa.
var destello = img2d("destello", "deco-destello", -600, 540, 90);
tr(destello).property("ADBE Rotate Z").setValue(-14);
var ejDe = ejes(destello);
claves(ejDe.x, [[216, -700, "C7"], [248, 2600, "C5"]]);
claves(esc(destello), [[216, [70, 70], "C2"], [232, [116, 116], "C3"], [248, [70, 70], "C5"]]);
claves(op(destello), [[216, 0, "C2"], [224, 100, "C3"], [248, 0, "C5"]]);
plano(destello, 215, 250);

// ================================================================ F · TU ESTUDIO DE VIDEO   248-306
// A TRES ESCALAS, con salto duro. Es la firma tipografica de la referencia y cuesta tres claves HOLD.
var tF = titular("Tu estudio de", "video", 88, AZUL2);
ubicar(tF, [[248, 78], [272, 112], [292, 92]], 306);
viveTitular(tF, 248, 8, 306, 12);

// ================================================================ G+H · LA PALABRA ESTALLA   306-396
// LA QUE ESTALLA ES LA QUE YA ESTABA ESCRITA, no una nueva que aparece desarmada.
//
// La primera version lo hacia al reves —las letras aparecian ya dispersas y despues derivaban hacia su
// lugar— y la metrica lo caso sin que yo lo viera: 88 cuadros seguidos (339-427) sin un solo arranque,
// el hueco mas largo de la pieza. Tenia sentido: un grupo que aparece quieto y despues se acomoda no
// tiene estallido en ninguna parte. La referencia hace lo otro y por eso funciona — la palabra escrita
// SE ROMPE, y el gesto esta en la rotura.
var PAL1 = "Reimaginado";
var TAM1 = 112;
var anchoP1 = anchoTexto(PAL1, TAM1, F_DISPLAY);
var grupo1 = letras(PAL1, TAM1, TINTA, F_DISPLAY, (ANCHO - anchoP1) / 2, 580);
var g1;
for (g1 = 0; g1 < grupo1.length; g1++) {
  var L1 = grupo1[g1];
  var r1 = g1 * 2;
  // las esquirlas se quedan DENTRO del cuadro: `escena-check` marca como defecto un gesto que pasa con
  // menos del 25% visible, y ademas una letra que se va de cuadro no se lee como rotura sino como que
  // alguien la saco. Por eso el destino se recorta contra el ancho en vez de sortearse libre.
  var vx = (azar() - 0.5) * 1500;
  var vy = (azar() - 0.5) * 900;
  var destX = Math.max(90, Math.min(ANCHO - 90, L1.x + vx));
  var destY = Math.max(150, Math.min(ALTO - 90, L1.y + vy));
  var giro1 = (azar() - 0.5) * 190;
  var ej1 = ejes(L1.capa);
  claves(ej1.x, [[306 + r1, L1.x, "C4"], [352, L1.x, "C3"], [392, destX, "C5"]]);
  claves(ej1.y, [[306 + r1, L1.y + 46, "C2"], [322 + r1, L1.y, "C4"], [352, L1.y, "C3"], [392, destY, "C5"]]);
  claves(tr(L1.capa).property("ADBE Rotate Z"), [[352, 0, "C3"], [392, giro1, "C5"]]);
  claves(esc(L1.capa), [
    [306 + r1, [82, 82], "C2"], [322 + r1, [100, 100], "C4"],
    [352, [100, 100], "C3"], [392, [138, 138], "C5"]
  ]);
  claves(op(L1.capa), [
    [306 + r1, 0, "C2"], [320 + r1, 100, "C5"], [356, 100, "C3"], [390, 0, "C5"]
  ]);
  plano(L1.capa, 305, 394);
}

// ================================================================ I · SE REAGRUPAN EN OTRA PALABRA   380-478
// Las esquirlas todavia estan volando cuando estas ya entran: el cruce de 12 cuadros es lo que hace que
// se lea como UNA transformacion y no como dos cosas seguidas.
var PALABRA = "EN EQUIPO";
var tamPal = 138;
var anchoPal = anchoTexto(PALABRA, tamPal, F_DISPLAY);
var grupo = letras(PALABRA, tamPal, TINTA, F_DISPLAY, (ANCHO - anchoPal) / 2, 600);
var gi;
for (gi = 0; gi < grupo.length; gi++) {
  var L = grupo[gi];
  var retardo = gi * 3;
  var dx = (azar() - 0.5) * 1160;
  var dy = (azar() - 0.5) * 600;
  var desdeX = Math.max(90, Math.min(ANCHO - 90, L.x + dx));
  var desdeY = Math.max(150, Math.min(ALTO - 90, L.y + dy));
  var giro = (azar() - 0.5) * 150;
  var ejL = ejes(L.capa);
  // AL EMPUJAR, LAS LETRAS SE ABREN DESDE EL CENTRO. Escalar cada letra alrededor de su propia ancla
  // las agranda SIN separarlas, asi que al 170% se pisan unas con otras — se ve en el cuadro 490. La
  // palabra tiene que crecer como palabra: cada letra se aleja del centro en la misma proporcion.
  claves(ejL.x, [
    [380, desdeX, "C2"], [412 + retardo, L.x + (desdeX - L.x) * 0.34, "C1"],
    [444 + retardo, L.x, "C1"], [452, L.x, "C2"],
    [478, 960 + (L.x - 960) * 1.62, "C1"], [486, 960 + (L.x - 960) * 1.62, "C5"]
  ]);
  claves(ejL.y, [
    [380, desdeY, "C2"], [412 + retardo, L.y + (desdeY - L.y) * 0.34, "C1"],
    [444 + retardo, L.y, "C1"], [486, L.y, "C5"]
  ]);
  claves(tr(L.capa).property("ADBE Rotate Z"), [
    [380, giro, "C2"], [444 + retardo, 0, "C1"], [486, 0, "C5"]
  ]);
  claves(esc(L.capa), [
    [380, [62, 62], "C2"], [444 + retardo, [100, 100], "C1"],
    [452, [100, 100], "C2"], [478, [162, 162], "C1"], [486, [162, 162], "C5"]
  ]);
  // Y SE VA DE GOLPE, no con un fundido. La referencia CORTA de la palabra enorme al titular siguiente;
  // cruzarlos deja treinta cuadros con dos titulares encimados, que es lo que pasaba en el cuadro 490.
  claves(op(L.capa), [
    [380, 0, "C2"], [396, 100, "C5"], [484, 100, "HOLD"], [486, 0, "C5"]
  ]);
  plano(L.capa, 379, 488);
}
// NOTA: el empuje final (escala 100 -> 172) esta en la escala de las letras y no en la camara, porque
// son capas 2D y la camara no las toca. En la referencia el empuje SI es de camara, pero ahi la palabra
// es un objeto en el espacio. Elegido asi porque un titular en 3D cerca de la camara se va de cuadro —
// medido en la PIEZA-G, no supuesto.

// ================================================================ J · PRESENTAMOS   462-500
var tJ = titular("Presentamos", "", 68, TINTA);
ubicar(tJ, [[486, 84], [502, 100]], 518);
viveTitular(tJ, 486, 6, 518, 6);

// ================================================================ K · LIENZO   518-548
var tK = titular("Lienzo", "en cliping", 128, AZUL2);
ubicar(tK, [[518, 88], [532, 110]], 552);
claves(op(tK.a), [[518, 0, "C2"], [526, 100, "C5"], [548, 100, "C3"], [556, 0, "C5"]]);
claves(op(tK.b), [[518, 0, "C2"], [530, 100, "C5"], [542, 100, "C3"], [552, 0, "C5"]]);
plano(tK.a, 517, 558); plano(tK.b, 517, 554);

// ================================================================ L · LA PALABRA SE VUELVE EL BOTON   548-612
// EL CORTE DE ENCAJE, que es la firma de la referencia: la palabra escrita grande se achica hasta ser
// la etiqueta del boton, y el boton se va a su lugar en la interfaz. Se sostiene si las dos cosas estan
// en el mismo sitio en el cuadro del cambio — o sea, si esta MEDIDO.
var pastilla = img2d("pildora-vacia", "pildora-lienzo", 960, 540, 8);
claves(esc(pastilla), [
  [548, [8 / K2, 8 / K2], "C2"], [576, [92 / K2, 92 / K2], "C1"], [592, [84 / K2, 84 / K2], "C1"],
  [606, [30 / K2, 30 / K2], "C3"], [620, [26 / K2, 26 / K2], "C5"]
]);
var ejPa = ejes(pastilla);
claves(ejPa.x, [[548, 960, "C4"], [592, 960, "C3"], [620, 470, "C5"]]);
claves(ejPa.y, [[548, 540, "C4"], [592, 540, "C3"], [620, 810, "C5"]]);
claves(op(pastilla), [[548, 0, "C2"], [562, 100, "C5"], [616, 100, "C3"], [630, 0, "C5"]]);
plano(pastilla, 547, 632);

var etiqPastilla = rotulo("Lienzo", 60, TINTA, F_ETIQUETA, 960, 560, true);
etiqPastilla.name = "etiqueta-lienzo";
claves(esc(etiqPastilla), [
  [548, [200, 200], "C2"], [576, [100, 100], "C1"], [592, [92, 92], "C1"],
  [606, [33, 33], "C3"], [620, [29, 29], "C5"]
]);
var ejEt = ejes(etiqPastilla);
claves(ejEt.x, [[548, 960, "C4"], [592, 960, "C3"], [620, 470, "C5"]]);
claves(ejEt.y, [[548, 560, "C4"], [592, 560, "C3"], [620, 822, "C5"]]);
claves(op(etiqPastilla), [[548, 0, "C2"], [556, 100, "C5"], [616, 100, "C3"], [630, 0, "C5"]]);
plano(etiqPastilla, 547, 632);

// la interfaz aparece DETRAS mientras el boton baja: por eso el boton "encuentra su lugar"
var panelD = img("panel-hola", "panel-lugar", 1000, 470, 900, 54);
claves(tr(panelD).property("ADBE Rotate Y"), [[584, -30, "C1"], [634, -22, "C5"]]);
var ejPD = ejes(panelD);
claves(ejPD.x, [[584, 1180, "C2"], [622, 1000, "C1"], [634, 1020, "C5"]]);
viveTope(panelD, 584, 20, 634, 16, 72);

// ================================================================ M · DEL PRIMER BORRADOR   612-668
var tM = titular("Del primer", "borrador", 92, AZUL2);
ubicar(tM, [[620, 82], [642, 106]], 668);
viveTitular(tM, 620, 8, 668, 10);

// ================================================================ N · LA BURBUJA TIPEA   668-740
// El tipeo es UNA CAPA POR CARACTER con opacidad en HOLD. No hay animadores de texto en este motor: no
// viajan. Una capa por letra si, y ademas deja hacer cosas que un animador no hace.
var burbuja = img2d("burbuja", "burbuja-prompt", 960, 540, 74 / K2);
claves(esc(burbuja), [[668, [66 / K2, 66 / K2], "C2"], [690, [76 / K2, 76 / K2], "C1"], [740, [74 / K2, 74 / K2], "C5"]]);
vive(burbuja, 668, 12, 748, 16);

var FRASE = "Un gui{o}n de 5 minutos";
var tamFr = 54;
var anchoFr = anchoTexto(ac(FRASE), tamFr, F_LECTURA);
var tecleo = letras(ac(FRASE), tamFr, TINTA, F_LECTURA, (ANCHO - anchoFr) / 2, 558);
var ti;
for (ti = 0; ti < tecleo.length; ti++) {
  var T = tecleo[ti];
  var cuandoT = 682 + T.i * 2;
  claves(op(T.capa), [[668, 0, "HOLD"], [cuandoT, 100, "HOLD"], [740, 100, "C3"], [752, 0, "C5"]]);
  plano(T.capa, 667, 754);
}
// el cursor: salta de letra en letra con HOLD, que es como se mueve un cursor de verdad
var cursorT = comp.layers.addSolid([0.88, 0.92, 1], "cursor-tecleo", 4, 62, 1);
cursorT.threeDLayer = false;
// se recorre la cadena YA CONVERTIDA: `{o}` son tres caracteres antes de `ac()` y uno despues, asi que
// usar la longitud cruda pasa dos pasos de largo.
var FRASE_AC = ac(FRASE);
var listaCur = [], ci;
for (ci = 0; ci <= FRASE_AC.length; ci++) {
  listaCur[ci] = [682 + ci * 2, (ANCHO - anchoFr) / 2 + anchoTexto(FRASE_AC.substring(0, ci), tamFr, F_LECTURA) + 8, "HOLD"];
}
listaCur[listaCur.length] = [740, (ANCHO - anchoFr) / 2 + anchoFr + 8, "C5"];
var ejCu = ejes(cursorT);
claves(ejCu.x, listaCur);
claves(ejCu.y, [[668, 540, "C5"], [740, 540, "C5"]]);
claves(op(cursorT), [
  [668, 0, "HOLD"], [682, 100, "HOLD"], [740, 100, "HOLD"], [748, 0, "C5"]
]);
plano(cursorT, 667, 750);

// ================================================================ O · EL DOCUMENTO   740-800
var panelDoc = img("panel-doc", "panel-documento", 1080, 500, 620, 60);
claves(tr(panelDoc).property("ADBE Rotate Y"), [[740, -34, "C1"], [800, -27, "C4"], [812, -26, "C5"]]);
tr(panelDoc).property("ADBE Rotate Z").setValue(-2);
var ejPDo = ejes(panelDoc);
claves(ejPDo.x, [[740, 1560, "C2"], [782, 1060, "C1"], [800, 1080, "C5"]]);
claves(ejPDo.y, [[740, 560, "C2"], [782, 500, "C1"], [800, 494, "C5"]]);
vive(panelDoc, 740, 12, 812, 18);

// ================================================================ P · A TODAS LAS VERSIONES   800-856
var tP = titular("A todas las", "versiones", 92, VIOLETA);
ubicar(tP, [[800, 80], [822, 104], [842, 88]], 856);
viveTitular(tP, 800, 8, 856, 10);

// ================================================================ Q · EL DOCUMENTO CON SU BARRA   856-930
// Encuadrado por arcos arriba y abajo, que es lo que hace la referencia en el tramo de comentarios: da
// la sensacion de estar mirando A TRAVES de algo, y cuesta dos capas.
var arcoArriba = img2d("arcos", "deco-arco-arriba", 960, 210, 78);
tr(arcoArriba).property("ADBE Rotate Z").setValue(180);
var arcoAbajo = img2d("arcos", "deco-arco-abajo", 960, 880, 78);
// Mas grandes y mas tenues: al 82% la curvatura entraba entera en el cuadro y se leian como dos
// elipses concentricas cruzando el medio, no como un encuadre. Al 118% solo entra el arco.
claves(esc(arcoArriba), [[856, [100, 100], "C2"], [890, [118, 118], "C1"], [990, [122, 122], "C5"]]);
claves(esc(arcoAbajo), [[856, [100, 100], "C2"], [896, [118, 118], "C1"], [990, [122, 122], "C5"]]);
viveTope(arcoArriba, 856, 18, 998, 20, 44);
viveTope(arcoAbajo, 862, 18, 998, 20, 44);

var panelBarra = img("panel-doc-barra", "panel-documento-barra", 900, 520, 560, 62);
claves(tr(panelBarra).property("ADBE Rotate Y"), [[856, 32, "C1"], [930, 24, "C4"], [940, 23, "C5"]]);
tr(panelBarra).property("ADBE Rotate Z").setValue(2);
var ejPB2 = ejes(panelBarra);
claves(ejPB2.x, [[856, 420, "C2"], [900, 900, "C1"], [930, 930, "C5"]]);
vive(panelBarra, 856, 12, 940, 18);

var cursorQ = img2d("cursor", "cursor-barra", 1380, 700, 70);
var ejCQ = ejes(cursorQ);
claves(ejCQ.x, [[880, 1500, "C2"], [906, 1310, "C1"], [922, 1296, "C1"], [936, 1330, "C5"]]);
claves(ejCQ.y, [[880, 820, "C2"], [906, 620, "C1"], [922, 612, "C1"], [936, 640, "C5"]]);
claves(esc(cursorQ), [[880, [70, 70], "C2"], [918, [70, 70], "C3"], [924, [58, 58], "C1"], [936, [70, 70], "C5"]]);
vive(cursorQ, 880, 8, 940, 12);

// ================================================================ R · PEDILE QUE REVISE   930-990
var tR = titular("Pedile a cliping", "que revise", 76, AZUL2);
ubicar(tR, [[930, 88], [954, 108]], 990);
viveTitular(tR, 930, 8, 990, 10);

// ================================================================ S · LA TARJETA DE SUGERENCIA   990-1052
var tarjeta = img("tarjeta-sugerencia", "tarjeta-sugerencia", 1080, 560, 380, 62 / K2);
tr(tarjeta).property("ADBE Rotate Y").setValue(-18);
var ejTa = ejes(tarjeta);
claves(ejTa.y, [[990, 760, "C2"], [1026, 545, "C1"], [1052, 560, "C5"]]);
claves(esc(tarjeta), [[990, [50 / K2, 50 / K2], "C2"], [1026, [66 / K2, 66 / K2], "C1"], [1052, [62 / K2, 62 / K2], "C5"]]);
vive(tarjeta, 990, 12, 1060, 16);

var estrellita = img2d("estrella", "estrella-tarjeta", 470, 330, 8);
claves(esc(estrellita), [[1002, [2, 2], "C2"], [1024, [11, 11], "C1"], [1040, [9, 9], "C5"]]);
claves(tr(estrellita).property("ADBE Rotate Z"), [[1002, -60, "C2"], [1040, 0, "C4"], [1060, 0, "C5"]]);
vive(estrellita, 1002, 10, 1058, 12);

// ================================================================ T · CONVERTI TUS IDEAS   1052-1112
var tT = titular("Convert{i} tus", "ideas", 92, CIAN);
ubicar(tT, [[1052, 82], [1076, 106]], 1112);
viveTitular(tT, 1052, 8, 1112, 10);

// ================================================================ U · LA BARRA TIPEA   1112-1200
var barra = img2d("barra-prompt", "barra-prompt", 960, 560, 80 / K2);
claves(esc(barra), [[1112, [70 / K2, 70 / K2], "C2"], [1140, [82 / K2, 82 / K2], "C1"], [1200, [80 / K2, 80 / K2], "C5"]]);
vive(barra, 1112, 12, 1210, 16);

var FRASE2 = "Quiero armar una pieza";
var anchoF2 = anchoTexto(FRASE2, tamFr, F_LECTURA);
var tecleo2 = letras(FRASE2, tamFr, TINTA, F_LECTURA, (ANCHO - anchoF2) / 2, 566);
var ui;
for (ui = 0; ui < tecleo2.length; ui++) {
  var U = tecleo2[ui];
  var cuandoU = 1128 + U.i * 2;
  claves(op(U.capa), [[1112, 0, "HOLD"], [cuandoU, 100, "HOLD"], [1196, 100, "C3"], [1208, 0, "C5"]]);
  plano(U.capa, 1111, 1210);
}

// ================================================================ V · EN CODIGO   1200-1256
// La palabra se desarma y se resuelve. Cuatro estados con HOLD: es un corte, no una transicion, y por
// eso se lee como un fallo de la maquina y no como un efecto.
var yV = 560;
var estados = ["en", "e{n}", "{e}n c0d1", "en c0d1g0", "en c{o}digo"];
var capasV = [], vi;
for (vi = 0; vi < estados.length; vi++) {
  var cv2 = rotulo(estados[vi], 116, vi === estados.length - 1 ? AZUL2 : TINTA, F_DISPLAY, 960, yV, true);
  cv2.name = "estado-" + vi;
  capasV[vi] = cv2;
}
var CUANDO_V = [1200, 1216, 1224, 1232, 1244];
for (vi = 0; vi < capasV.length; vi++) {
  var desde = CUANDO_V[vi];
  var ultimo = vi === capasV.length - 1;
  var listaV = [];
  // el primer estado ya arranca visible: poner una clave en 0 y otra en 100 EN EL MISMO CUADRO deja una
  // sola clave (la segunda pisa a la primera) y despues `nearestKeyIndex` devuelve el mismo indice para
  // los dos extremos del tramo. Sin error, y con la curva aplicada al tramo equivocado.
  if (desde > 1200) { listaV[listaV.length] = [1200, 0, "HOLD"]; }
  listaV[listaV.length] = [desde, 100, "HOLD"];
  if (ultimo) {
    listaV[listaV.length] = [1258, 100, "C3"];
    listaV[listaV.length] = [1270, 0, "C5"];
    claves(op(capasV[vi]), listaV);
    claves(esc(capasV[vi]), [[1244, [90, 90], "C2"], [1258, [112, 112], "C1"], [1270, [106, 106], "C5"]]);
    plano(capasV[vi], 1199, 1272);
  } else {
    listaV[listaV.length] = [CUANDO_V[vi + 1], 0, "HOLD"];
    claves(op(capasV[vi]), listaV);
    plano(capasV[vi], 1199, CUANDO_V[vi + 1] + 2);
  }
}

// ================================================================ W · EL EDITOR   1256-1316
var panelCod = img("panel-codigo", "panel-codigo", 860, 500, 540, 60);
claves(tr(panelCod).property("ADBE Rotate Y"), [[1256, 30, "C1"], [1316, 22, "C4"], [1330, 21, "C5"]]);
tr(panelCod).property("ADBE Rotate Z").setValue(2);
var ejPCo = ejes(panelCod);
claves(ejPCo.x, [[1256, 340, "C2"], [1300, 860, "C1"], [1316, 890, "C5"]]);
vive(panelCod, 1256, 12, 1330, 18);

var pastillaW = img2d("pildora-ancha", "pildora-pedile", 1420, 830, 40 / K2);
var etiqW = rotulo("Pedile a cliping", 40, TINTA, F_ETIQUETA, 1420, 844, true);
etiqW.name = "etiqueta-pedile";
claves(esc(pastillaW), [[1282, [22 / K2, 22 / K2], "C2"], [1306, [44 / K2, 44 / K2], "C1"], [1322, [40 / K2, 40 / K2], "C5"]]);
claves(esc(etiqW), [[1282, [50, 50], "C2"], [1306, [106, 106], "C1"], [1322, [100, 100], "C5"]]);
vive(pastillaW, 1282, 10, 1330, 12);
vive(etiqW, 1286, 10, 1330, 12);

// ================================================================ X · Y MIRA EL RESULTADO   1316-1378
var tX = titular("Y mir{a} el", "resultado", 92, AZUL2);
ubicar(tX, [[1316, 80], [1340, 104], [1360, 88]], 1378);
viveTitular(tX, 1316, 8, 1378, 10);

// ================================================================ Y · EL CONMUTADOR SE AGRANDA   1378-1440
// El acento mas grande de la pieza: un objeto chico de la interfaz se vuelve el cuadro entero. La
// referencia lo hace con el conmutador de Codigo/Vista y funciona porque el objeto ya se habia visto
// chico — o sea, porque hay algo que reconocer.
var luzY = img2d("luz-violeta", "deco-luz-conmutador", 960, 540, 60);
claves(esc(luzY), [[1390, [40, 40], "C2"], [1432, [130, 130], "C1"], [1470, [136, 136], "C5"]]);
claves(op(luzY), [[1378, 0, "C2"], [1400, 68, "C4"], [1436, 60, "C3"], [1454, 0, "C5"]]);
plano(luzY, 1377, 1456);

var conmu = img2d("conmutador", "conmutador", 1180, 700, 22 / K3);
claves(esc(conmu), [
  [1378, [18 / K3, 18 / K3], "C2"], [1400, [24 / K3, 24 / K3], "C1"], [1414, [24 / K3, 24 / K3], "C3"],
  [1440, [122 / K3, 122 / K3], "C1"], [1470, [116 / K3, 116 / K3], "C5"]
]);
var ejCo = ejes(conmu);
claves(ejCo.x, [[1378, 1300, "C2"], [1400, 1180, "C1"], [1414, 1180, "C3"], [1440, 960, "C5"], [1470, 960, "C5"]]);
claves(ejCo.y, [[1378, 760, "C2"], [1400, 700, "C1"], [1414, 700, "C3"], [1440, 540, "C5"], [1470, 540, "C5"]]);
vive(conmu, 1378, 10, 1452, 14);

var cursorY = img2d("cursor", "cursor-conmutador", 1300, 800, 62);
var ejCY = ejes(cursorY);
claves(ejCY.x, [[1382, 1420, "C2"], [1408, 1236, "C1"], [1424, 1232, "C5"]]);
claves(ejCY.y, [[1382, 860, "C2"], [1408, 730, "C1"], [1424, 728, "C5"]]);
claves(esc(cursorY), [[1382, [62, 62], "C2"], [1414, [62, 62], "C3"], [1420, [50, 50], "C1"], [1430, [62, 62], "C5"]]);
vive(cursorY, 1382, 8, 1434, 8);

// ================================================================ Z · LA TARJETA DEL ELEMENTO   1440-1490
var tarjHg = img("tarjeta-hg", "tarjeta-elemento", 700, 540, 300, 68 / K2);
claves(tr(tarjHg).property("ADBE Rotate Y"), [[1448, -26, "C1"], [1496, -17, "C5"]]);
var ejHg = ejes(tarjHg);
claves(ejHg.x, [[1448, 460, "C2"], [1478, 700, "C1"], [1496, 720, "C5"]]);
claves(esc(tarjHg), [[1448, [50 / K2, 50 / K2], "C2"], [1478, [72 / K2, 72 / K2], "C1"], [1496, [68 / K2, 68 / K2], "C5"]]);
vive(tarjHg, 1448, 10, 1498, 12);

var tarjDet = img("tarjeta-sugerencia", "tarjeta-detalle", 1380, 560, 260, 46 / K2);
tr(tarjDet).property("ADBE Rotate Y").setValue(-22);
var ejDet = ejes(tarjDet);
claves(ejDet.x, [[1458, 1620, "C2"], [1486, 1380, "C1"], [1496, 1360, "C5"]]);
vive(tarjDet, 1458, 10, 1498, 12);

// ================================================================ AA-AE · LA LISTA RAPIDA   1490-1660
// Cinco palabras con su interfaz detras, una cada ~35 cuadros. Es el tramo mas veloz de la pieza y el
// que demuestra alcance: no dice "sirve para todo", muestra cinco cosas distintas.
var LISTA = [
  ["documentos", "panel-doc", 1490, 1524, -26, AZUL2],
  ["l{i}neas de tiempo", "panel-linea", 1524, 1558, 24, CIAN],
  ["datos", "panel-mapa", 1558, 1590, -22, VIOLETA],
  ["juegos", "panel-juego", 1590, 1626, 22, AZUL2],
  ["apps", "panel-cruci", 1626, 1660, -20, VIOLETA]
];
var li;
for (li = 0; li < LISTA.length; li++) {
  var fila = LISTA[li];
  var pl = img(fila[1], "lista-" + li + "-" + fila[1], 960, 520, 780, 52);
  tr(pl).property("ADBE Rotate Y").setValue(fila[4]);
  var ejPl = ejes(pl);
  var lado = fila[4] < 0 ? 1 : -1;
  claves(ejPl.x, [[fila[2], 960 + lado * 420, "C2"], [fila[2] + 20, 960, "C1"], [fila[3], 960 - lado * 60, "C5"]]);
  claves(esc(pl), [[fila[2], [46, 46], "C2"], [fila[2] + 22, [54, 54], "C1"], [fila[3], [52, 52], "C5"]]);
  viveTope(pl, fila[2], 7, fila[3] + 4, 7, 58);

  var pal = titular(fila[0], "", 116, fila[5]);
  ubicar(pal, [[fila[2], 86], [fila[2] + 14, 112]], fila[3] + 4);
  viveTitular(pal, fila[2], 6, fila[3] + 4, 6);
}

// ================================================================ AF+AG · VUELVE LA ESTRELLA Y SE ARMA LA PILDORA   1660-1752
// Cierra el circulo: el mismo simbolo con el que abrio. Es lo unico que aparece dos veces en sesenta
// segundos, y por eso se lee como firma y no como relleno.
var pildoraFin = img2d("pildora-ancha", "pildora-final", 960, 540, 4 / K2);
claves(esc(pildoraFin), [
  [1690, [4 / K2, 4 / K2], "C2"], [1714, [64 / K2, 64 / K2], "C1"], [1730, [60 / K2, 60 / K2], "C1"],
  [1752, [40 / K2, 40 / K2], "C3"], [1786, [36 / K2, 36 / K2], "C5"]
]);
var ejPf = ejes(pildoraFin);
claves(ejPf.x, [[1690, 960, "C4"], [1730, 960, "C3"], [1752, 1010, "C5"], [1786, 1010, "C5"]]);
claves(ejPf.y, [[1690, 470, "C4"], [1730, 470, "C3"], [1752, 540, "C5"], [1786, 540, "C5"]]);
claves(op(pildoraFin), [[1690, 0, "C2"], [1706, 100, "C5"], [1770, 100, "C3"], [1786, 0, "C5"]]);
plano(pildoraFin, 1689, 1788);

var etiqFin = rotulo("Todo en un solo lugar", 44, TINTA, F_ETIQUETA, 1010, 556, true);
etiqFin.name = "etiqueta-todo";
claves(esc(etiqFin), [[1700, [80, 80], "C2"], [1720, [100, 100], "C1"], [1746, [100, 100], "C3"], [1752, [0.1, 0.1], "HOLD"], [1786, [0.1, 0.1], "C5"]]);
var ejEf = ejes(etiqFin);
claves(ejEf.x, [[1700, 960, "C4"], [1730, 960, "C3"], [1752, 1010, "C5"], [1786, 1010, "C5"]]);
claves(ejEf.y, [[1700, 486, "C4"], [1730, 486, "C3"], [1752, 556, "C5"], [1786, 556, "C5"]]);
claves(op(etiqFin), [[1700, 0, "C2"], [1712, 100, "C5"], [1746, 100, "C3"], [1752, 0, "HOLD"], [1786, 0, "C5"]]);
plano(etiqFin, 1699, 1788);

var etiqFin2 = rotulo("Lienzo", 48, AZUL2, F_ETIQUETA, 1010, 556, true);
etiqFin2.name = "etiqueta-lienzo-final";
claves(op(etiqFin2), [[1690, 0, "HOLD"], [1752, 100, "C5"], [1770, 100, "C3"], [1786, 0, "C5"]]);
var ejEf2 = ejes(etiqFin2);
claves(ejEf2.x, [[1752, 1010, "C5"], [1786, 1010, "C5"]]);
claves(ejEf2.y, [[1752, 556, "C5"], [1786, 556, "C5"]]);
plano(etiqFin2, 1689, 1788);

// ================================================================ AH · EL CIERRE   1748-1800
var panelFin = img("panel-hola", "panel-cierre", 960, 400, 1150, 52);
tr(panelFin).property("ADBE Rotate Y").setValue(-18);
var ejPfi = ejes(panelFin);
claves(ejPfi.x, [[1748, 1220, "C2"], [1786, 960, "C1"], [1800, 950, "C5"]]);
claves(esc(panelFin), [[1748, [44, 44], "C2"], [1786, [52, 52], "C1"], [1800, [52, 52], "C5"]]);
claves(op(panelFin), [[1748, 0, "C2"], [1770, 34, "C4"], [1800, 30, "C5"]]);
plano(panelFin, 1747, 1800);

// EL CIERRE SE REPARTE EN ALTURA: el panel arriba, el titular abajo. Encimados, "Hola, Jero" del
// panel se leia a traves de "Proba Lienzo" y no se entendia ninguno de los dos.
var tCierre = titular("Prob{a} Lienzo", "en cliping", 84, AZUL2, 742);
ubicar(tCierre, [[1770, 84], [1786, 100]], 1800);
claves(op(tCierre.a), [[1770, 0, "C2"], [1784, 100, "C5"], [1800, 100, "C5"]]);
claves(op(tCierre.b), [[1774, 0, "C2"], [1788, 100, "C5"], [1800, 100, "C5"]]);
plano(tCierre.a, 1769, 1800); plano(tCierre.b, 1769, 1800);

var url = rotulo("cliping.ia/lienzo", 38, SUAVE, F_ETIQUETA, 960, 826, true);
url.name = "url";
claves(op(url), [[1782, 0, "C2"], [1794, 100, "C5"], [1800, 100, "C5"]]);
plano(url, 1781, 1800);

// ================================================================ EL GRANO
// UNA sola capa, fija, al 16%. La receta pide tres cuadros alternados, y aca seria una clave HOLD cada
// dos cuadros durante mil ochocientos: no lo vale. Un grano fijo sobre una imagen que se mueve no se
// lee como suciedad pegada, y esta declarado como simplificacion, no vendido como la receta completa.
var grano = img2d("grano1", "grano", 960, 540, 100);
op(grano).setValue(16);
plano(grano, 0, 1800);

// ================================================================ LOS PARAMETROS EDITABLES
// Lo que un usuario del sitio va a poder cambiar sin abrir AE. La lista de AE se lee 1-BASED Y AL
// REVES, y una propiedad NO SABE que fue declarada (36 propiedades reflejadas, ninguna lo dice). Por eso
// el manifiesto se escribe aca y viaja en comp.comment: es el unico registro confiable.
parametro(tF.a, fuenteDe(tF.a), "texto", "Titular 1", "texto");
parametro(tF.b, fuenteDe(tF.b), "texto", "Titular 1 destacado", "texto");
parametro(tK.a, fuenteDe(tK.a), "texto", "Nombre del producto", "texto");
parametro(tCierre.a, fuenteDe(tCierre.a), "texto", "Cierre", "texto");
parametro(url, fuenteDe(url), "texto", "URL", "texto");
parametro(marca, fuenteDe(marca), "texto", "Marca", "texto");

comp.comment = MANIFIESTO.join(String.fromCharCode(10));

// ================================================================ EL INFORME
anotar("PIEZA|" + NOMBRE + "|" + ANCHO + "x" + ALTO + "|" + FPS + "fps|" + CUADROS + " cuadros");
anotar("CAPAS|" + comp.numLayers);
anotar("PARAMETROS|" + MANIFIESTO.length);
anotar("LETRAS|dispersion=" + grupo.length + "|tecleo1=" + tecleo.length + "|tecleo2=" + tecleo2.length);
anotar("MEDIDO|ancho de " + PALABRA + " a " + tamPal + "px = " + anchoPal.toFixed(1));
if (medidor !== null) { medidor.remove(); }

comp.time = 0;
app.endUndoGroup();
// EL CENTINELA ES ESTA CADENA EXACTA. `llamar.mjs` espera `--- fin ---` y nada mas; poner "OK" hace que
// la llamada corra bien, escriba todo, y despues se quede cinco minutos esperando una firma que nunca
// va a llegar. Paso: la pieza se construyo en 20 segundos y la llamada informo fracaso a los 300.
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
