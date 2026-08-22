// PIEZA-D — la primera autorada con la skill puesta.
//
// La PIEZA-C saco 7/7 en ritmo y ESCENA OK, y el veredicto fue "una decepcion total". Las dos
// compuertas tenian razon: median coreografia y visibilidad, y las dos daban bien. Lo que ninguna
// media es si valia la pena mirar lo que se movia. Le habia puesto coreografia a treinta rectangulos
// de esquina dura, gris sobre negro, con contraste 1,31:1 — o sea a nada.
//
// Esta pieza se autora al reves: primero el arte, despues el vocabulario, y recien al final el ritmo.
//
// ================================================================ FICHA DE ARTE
// FAMILIA      cinematica oscura
// PALETA       fondo #05070f -> #152244 con foco arriba-izquierda y viñeta, todo horneado
//              panel #2c3c66 sobre #1d2a4c, borde #4a5f96 — contraste medido 1,86:1 (piso 1,80)
//              tinta #f2f5ff (18,5:1) · segunda #93a4cc (8,1:1)
//              acento #ff6b2c manda (7,1:1) · apoyo #35e0ff acompaña (12,7:1) — DOS, no tres
// LUZ          un foco desde arriba-izquierda, horneado en el fondo. Todo lo que brilla es del acento
//              o del apoyo, y siempre tiene AREA: halos de 640 px, nunca una linea de 5.
// FORMA        radio 16-26 px en todo panel; borde de 1,5 px; luz superior de un pixel; sombra de
//              contacto horneada bajo todo lo que flota (C14). CERO rectangulos de esquina dura.
// TIPOGRAFIA   display CenturyGothic 132 · dato FranklinGothic-Medium 96 · lectura SegoeUI-Light 42
//              etiqueta SegoeUI 26.  Las cuatro MEDIDAS: 0,20% / 0,32% / 0,28% / 0,24% de desvio
//              contra el navegador. Segoe UI Semibold da 55,79% y Bahnschrift 80,82%: no viajan.
//              LA JERARQUIA SALE DEL TAMAÑO Y EL COLOR, NO DEL PESO — el peso no viaja y ademas la
//              compuerta de tipografia mide ancho, o sea que es ciega a el.
// PROFUNDIDAD  tres planos con escala aparente distinta. Nada del mismo tamaño que otra cosa.
// SIMBOLO      LA RETICULA. Aparece en el cuadro 0, mide en el medio, y se cierra sobre el remate.
//              Es el argumento de la pieza dibujado: esto no se parece, se mide.
// TEXTURA      grano de pelicula: tres cuadros alternados con claves HOLD cada 3 (receta F11).
//
// ================================================================ VOCABULARIO (por id del catalogo)
// FORMAS   F06 ecualizador (el antidoto contra "esta muerto") · F07 ondas concentricas ·
//          F08 rafaga radial · F09 grilla que se arma · F12 squash and stretch
// TEXTO    T02 subida por caracter tras tapa · T06 golpe con sobrepaso por caracter
// ENTRADAS E01 desliz con desvanecido · E06 colapso al origen · E12 corte seco
// TRANSIC. X10 destello
// ESPACIO  C09 corte de camara · C11 multiplano · C13 escalonado en profundidad · C14 sombra
// DETALLE  D01 acuse · D04 escalonado · D06 jerarquia de escalas
//
// USO
//   node tools/ae/recursos.mjs
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-d.jsx
//   node tools/ae/ritmo.mjs && node tools/ae/escena-check.mjs
//   node tools/ae/pieza.mjs PIEZA-D --rapido --mp4 C:/ae-probe/pieza-d.mp4 --tira

var RUTA = "C:/ae-probe/pieza-d.txt";
var RECURSOS = "C:/ae-probe/recursos";

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
function ac(s) {
  s = s.replace(/\{A\}/g, String.fromCharCode(193));
  s = s.replace(/\{E\}/g, String.fromCharCode(201));
  s = s.replace(/\{I\}/g, String.fromCharCode(205));
  s = s.replace(/\{O\}/g, String.fromCharCode(211));
  s = s.replace(/\{U\}/g, String.fromCharCode(218));
  s = s.replace(/\{N\}/g, String.fromCharCode(209));
  return s;
}

var previo = new File(RUTA);
if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }

try {

app.beginUndoGroup("PIEZA-D");

var NOMBRE = "PIEZA-D";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 450;
var DUR = CUADROS / FPS;
var C1F = 144, C2F = 288;

var TINTA = [0.949, 0.960, 1.000];
var SEGUNDA = [0.576, 0.643, 0.800];
var ACENTO = [1.000, 0.420, 0.173];
var APOYO = [0.208, 0.878, 1.000];

// display / dato / lectura / etiqueta — las cuatro medidas, ninguna otra
var F_DISPLAY = "CenturyGothic";
var F_DATO = "FranklinGothic-Medium";
var F_LECTURA = "SegoeUI-Light";
var F_ETIQUETA = "SegoeUI";

var CURVAS = {
  C1: [20, 85], C2: [10, 92], C3: [90, 15], C4: [85, 85],
  C6: [70, 70], C7: [0.1, 80], C8: [70, 20]
};

function tr(c) { return c.property("ADBE Transform Group"); }

// ================================================================ LOS PARAMETROS DE LA PLANTILLA
//
// Lo que separa una pieza de una plantilla es declarar QUE se puede cambiar. AE tiene el mecanismo
// nativo —el panel de Graficos Esenciales— y se maneja por script.
//
// Y hay que guardar el mapeo aparte, porque esta medido que **una propiedad no sabe que fue
// declarada**: desde la composicion se leen los nombres publicos pero no a que propiedad va cada uno.
// El manifiesto vive en el comentario de la composicion, que es un campo real de AE y sobrevive al
// guardado; el exportador lo lee y lo COMPARA contra la lista de AE.
//
// LA TENSION QUE APARECE ACA Y HAY QUE SABER: el texto animado letra por letra es lo mejor que tiene
// esta pieza y es lo PEOR para una plantilla. Once capas de una letra cada una no se pueden exponer
// como un campo editable. Los parametros van sobre los textos que son UNA capa; lo animado por
// caracter se rehace al construir, no se rellena.
var MANIFIESTO = [];
function parametro(capa, prop, ruta, nombrePublico, tipo) {
  if (prop === null || prop === undefined) { return false; }
  var ok = false;
  try {
    if (typeof prop.addToMotionGraphicsTemplateAs === "function") {
      ok = prop.addToMotionGraphicsTemplateAs(comp, nombrePublico) ? true : false;
    }
  } catch (exPar) { ok = false; }
  if (!ok) { anotar("NOTA|0|no se pudo declarar el parametro " + nombrePublico + "|-"); return false; }
  var idc = 0;
  try { idc = capa.id; } catch (exIdc) { idc = 0; }
  MANIFIESTO[MANIFIESTO.length] = "PARAM|" + idc + "|" + ruta + "|" + nombrePublico + "|" + tipo;
  return true;
}
function fuenteDe(capa) {
  return capa.property("ADBE Text Properties").property("ADBE Text Document");
}

function aplicarCurva(prop, k, k2, c) {
  var n = prop.keyOutTemporalEase(k).length;
  var sal = [], ent = [], q;
  for (q = 0; q < n; q++) { sal[q] = new KeyframeEase(0, c[0]); ent[q] = new KeyframeEase(0, c[1]); }
  prop.setInterpolationTypeAtKey(k, prop.keyInInterpolationType(k), KeyframeInterpolationType.BEZIER);
  prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, prop.keyOutInterpolationType(k2));
  prop.setTemporalEaseAtKey(k, prop.keyInTemporalEase(k), sal);
  prop.setTemporalEaseAtKey(k2, ent, prop.keyOutTemporalEase(k2));
}
// el indice se pregunta por tiempo: una segunda llamada que agrega claves anteriores corre los indices
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
  tr(capa).property("ADBE Position").dimensionsSeparated = true;
  return {
    x: tr(capa).property("ADBE Position_0"),
    y: tr(capa).property("ADBE Position_1"),
    z: tr(capa).property("ADBE Position_2")
  };
}
// D01 — acusar: reaccionar a algo que acaba de pasar. Golpe a la ida, asentamiento a la vuelta.
function acuse(prop, cuadro, base, delta) {
  claves(prop, [[cuadro, base, "C7"], [cuadro + 3, base + delta, "C8"], [cuadro + 11, base, "C5"]]);
}
// acompañar: repartir el recorrido a lo largo de TODO el gesto al que acompaña. Un acuse se agota en
// tres cuadros y deja al gesto principal solo el resto del tiempo, que es lo que mide la dominancia.
function acompana(prop, cuadro, dur, base, delta) {
  claves(prop, [[cuadro, base, "C1"], [cuadro + Math.round(dur * 0.45), base + delta, "C1"], [cuadro + dur, base, "C5"]]);
}
// E02 — el sobrepaso NO es una curva, es una clave extra
function sobrepaso(prop, cuadro, dur, de, a, cuanto) {
  var pico = a * cuanto;
  claves(prop, [[cuadro, [de, de, 100], "C1"],
                [cuadro + Math.round(dur * 0.68), [pico, pico, 100], "C8"],
                [cuadro + dur, [a, a, 100], "C5"]]);
}

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
comp.bgColor = [0.020, 0.027, 0.059];
comp.openInViewer();

var cache = {};
function recurso(archivo) {
  if (cache[archivo]) { return cache[archivo]; }
  var f = new File(RECURSOS + "/" + archivo + ".png");
  if (!f.exists) { throw new Error("falta el recurso " + archivo); }
  cache[archivo] = app.project.importFile(new ImportOptions(f));
  return cache[archivo];
}
function plano(capa, desde, hasta) {
  capa.inPoint = desde / FPS;
  capa.outPoint = hasta / FPS;
  return capa;
}
function img(archivo, nombre, x, y, z, escala) {
  var c = comp.layers.add(recurso(archivo));
  c.name = nombre;
  c.threeDLayer = true;
  c.motionBlur = true;
  tr(c).property("ADBE Position").setValue([x, y, z]);
  if (escala !== undefined) { tr(c).property("ADBE Scale").setValue([escala, escala, escala]); }
  return c;
}
function rotulo(cadena, tam, color, fuente, x, y, z, just) {
  var t = comp.layers.addText(ac(cadena));
  var p = t.property("ADBE Text Properties").property("ADBE Text Document");
  var d = p.value;
  d.fontSize = tam; d.fillColor = color; d.applyFill = true;
  d.justification = just || ParagraphJustification.CENTER_JUSTIFY;
  try { d.font = fuente; } catch (exF) {}
  p.setValue(d);
  t.threeDLayer = true;
  t.motionBlur = true;
  tr(t).property("ADBE Position").setValue([x, y, z]);
  return t;
}
// X02 · TAPA VISIBLE — el revelado que funciona sobre CUALQUIER fondo.
//
// El revelado por tapa invisible esconde el texto tras un rectangulo del color del fondo. Eso vale
// mientras el fondo sea plano; con un degradado con foco y viñeta ese rectangulo ya no coincide con
// nada y se ve como un recuadro que aparece antes del texto y despues desaparece. Es el defecto que
// el usuario encontro en la PIEZA-D, y lo causo la MEJORA del fondo: la tecnica y el arte nuevo eran
// incompatibles y el catalogo lo dice bajo F03 ("fondo plano; sobre degradado -> B4").
//
// La salida no es esconder mejor, es dejar de esconder: un bloque de color de marca que se RETRAE y va
// destapando el texto. Se ve a proposito, no depende del fondo, y ademas se lee mas caro.
//
// El anclaje va en el borde DERECHO: al escalar en X hacia cero, el bloque se recoge hacia la derecha y
// el texto aparece de izquierda a derecha, que es como se lee.
function bloqueDe(archivo, nombre, ancho, alto, x, y, z, desde, hasta, arranca, dur) {
  var b = plano(img(archivo, nombre, x + ancho / 2, y, z), desde, hasta);
  tr(b).property("ADBE Anchor Point").setValue([ancho + 4, alto / 2 + 2, 0]);
  tr(b).property("ADBE Position").setValue([x + ancho / 2, y, z]);
  claves(tr(b).property("ADBE Scale"), [[arranca, [100, 100, 100], "C3"],
                                        [arranca + dur, [0, 100, 100], "C5"]]);
  return b;
}
// el espacio no tiene tinta y sourceRectAtTime mide tinta: su ancho se mide aparte y se le suma solo
// al caracter que le sigue
function porCaracter(cadena, tam, color, fuente, x0, base, z) {
  cadena = ac(cadena);
  var medidor = comp.layers.addText(cadena);
  var pm = medidor.property("ADBE Text Properties").property("ADBE Text Document");
  var dm = pm.value;
  dm.fontSize = tam; dm.fillColor = color; dm.applyFill = true;
  dm.justification = ParagraphJustification.LEFT_JUSTIFY;
  try { dm.font = fuente; } catch (exF2) {}
  pm.setValue(dm);

  var bordes = [0], i;
  for (i = 1; i <= cadena.length; i++) {
    var d2 = pm.value; d2.text = cadena.substring(0, i); pm.setValue(d2);
    var caja = medidor.sourceRectAtTime(0, false);
    bordes[i] = caja.left + caja.width;
  }
  var d3 = pm.value; d3.text = "nn"; pm.setValue(d3);
  var sinEsp = medidor.sourceRectAtTime(0, false).width;
  d3 = pm.value; d3.text = "n n"; pm.setValue(d3);
  var anchoEspacio = medidor.sourceRectAtTime(0, false).width - sinEsp;
  var donde = [0];
  for (i = 1; i <= cadena.length; i++) {
    donde[i] = (cadena.charAt(i - 1) === " ") ? donde[i - 1] + anchoEspacio : bordes[i];
  }
  var anchoTotal = donde[cadena.length];
  medidor.remove();

  var letras = [];
  for (i = 0; i < cadena.length; i++) {
    var ch = cadena.charAt(i);
    if (ch === " ") { continue; }
    var t = comp.layers.addText(ch);
    var p = t.property("ADBE Text Properties").property("ADBE Text Document");
    var d = p.value;
    d.fontSize = tam; d.fillColor = color; d.applyFill = true;
    d.justification = ParagraphJustification.LEFT_JUSTIFY;
    try { d.font = fuente; } catch (exF3) {}
    p.setValue(d);
    t.threeDLayer = true; t.motionBlur = true;
    t.name = "letra-" + i;
    // cada letra a su propia profundidad: a la misma Z, dos letras vecinas cuyas cajas se rozan quedan
    // empatadas y el orden lo decide un desempate que no tiene por que coincidir con el de AE
    tr(t).property("ADBE Position").setValue([x0 - anchoTotal / 2 + donde[i], base, z - i * 2]);
    letras[letras.length] = t;
  }
  anotar("LETRAS|" + cadena + "|" + letras.length + "|ancho=" + anchoTotal.toFixed(1));
  return letras;
}

// ================================================================ EL FONDO (LEY 4)
var fondo = img("fondo", "fondo", ANCHO / 2, ALTO / 2, 3200, 118);
var ejF = ejes(fondo);

// ================================================================ PLANO 1 · la reticula aparece
// 0 · MACRO — el simbolo entra con sobrepaso y girando. Es lo primero que se ve y lo que hay que
// recordar: todo lo demas de la pieza va a pasar adentro o alrededor de el.
var reti = plano(img("reticula", "reticula", 960, 470, -80, 8), 0, CUADROS);
var ejR = ejes(reti);
var escR = tr(reti).property("ADBE Scale");
var rotR = tr(reti).property("ADBE Rotate Z");
sobrepaso(escR, 0, 18, 8, 62, 1.12);
claves(rotR, [[0, -55, "C1"], [18, 0, "C5"]]);
claves(tr(reti).property("ADBE Opacity"), [[0, 0, "C1"], [10, 100, "C5"]]);

// F07 · ONDAS CONCENTRICAS — tres aros del mismo PNG, escalonados 8, escala C1 y opacidad C5.
// Nacen del centro de la reticula: son la primera medicion de la pieza.
var ondas = [];
var oi;
for (oi = 0; oi < 3; oi++) {
  var on = plano(img("aro-fino", "onda-" + oi, 960, 470, -70 - oi * 4, 20), 0, C1F);
  var eo = tr(on).property("ADBE Scale"), oo = tr(on).property("ADBE Opacity");
  var a0 = oi * 8;
  claves(eo, [[a0, [20, 20, 100], "C1"], [a0 + 26, [190, 190, 100], "C5"]]);
  claves(oo, [[a0, 0, "C1"], [a0 + 6, 78, "C1"], [a0 + 26, 0, "C5"]]);
  ondas[oi] = on;
}

// 16 · el titulo sube letra por letra tras su tapa (T02). Va a z=200, DETRAS de las tarjetas, para que
// su tapa (z=180) no le tape nada mas — es la ley que costo un render entero.
var titulo = porCaracter("MEDIDO", 132, TINTA, F_DISPLAY, 960, 830, 200);
var tapaT = bloqueDe("bloque-titulo", "bloque-titulo", 760, 190, 580, 818, 168, 14, 40, 18, 15);
var li;
for (li = 0; li < titulo.length; li++) {
  plano(titulo[li], 16, C1F);
  var ejL = ejes(titulo[li]);
  claves(ejL.y, [[16 + li * 2, 830 + 70, "C1"], [16 + li * 2 + 13, 830, "C5"]]);
}

// 32 · F08 · RAFAGA RADIAL — ocho rayos que salen del centro de la reticula. Escalonado 1 (barrido),
// desvanecido en el ultimo 40%.
var rayos = [];
var ry;
for (ry = 0; ry < 8; ry++) {
  // cada rayo a su propia profundidad: ocho capas que se pisan en el centro a la misma Z es un empate
  // y el orden lo decide un desempate que no tiene por que coincidir con el de AE
  var rr = plano(img("rayo", "rayo-" + ry, 960, 470, -60 - ry * 3, 0), 32, 64);
  tr(rr).property("ADBE Anchor Point").setValue([0, 5, 0]);
  tr(rr).property("ADBE Rotate Z").setValue(ry * 45 + 22);
  var er = tr(rr).property("ADBE Scale"), orr = tr(rr).property("ADBE Opacity");
  claves(er, [[32 + ry, [0, 100, 100], "C1"], [32 + ry + 11, [100, 100, 100], "C5"]]);
  // LAS DOS MITADES CON LA MISMA FAMILIA DE CURVA. Mezclar C5 (lineal) con C1 (bezier) deja la clave
  // del medio con entrada lineal y salida bezier, y el exportador la rechaza: su modelo de tramos no
  // puede representar una clave asi. Rechazarla es lo correcto — dieciseis capas de esta pieza se
  // quedaban afuera del documento por esto, y el video habria salido "parecido".
  claves(orr, [[32 + ry, 90, "C1"], [32 + ry + 7, 90, "C1"], [32 + ry + 14, 0, "C5"]]);
  rayos[ry] = rr;
}

// 48 · el panel llega desde el fondo (C13) con su sombra de contacto (C14). Sin la sombra, dos planos
// a distinta profundidad se ven como dos rectangulos pegados.
var sombraH = plano(img("sombra-heroe", "sombra-heroe", 660, 700, 160, 62), 48, C1F);
var heroe = plano(img("panel-heroe", "panel-heroe", 660, 430, 520, 62), 48, C1F);
var ejH = ejes(heroe);
claves(ejH.z, [[48, 520, "C1"], [66, 150, "C5"]]);
claves(tr(heroe).property("ADBE Opacity"), [[48, 0, "C1"], [60, 100, "C5"]]);
claves(tr(sombraH).property("ADBE Opacity"), [[48, 0, "C1"], [62, 85, "C5"]]);
acompana(ejR.x, 48, 16, 960, 90);

// 64 · F06 · ECUALIZADOR — el antidote directo contra "esta muerto". Ocho barras con FASE distinta,
// golpe en 2-3 cuadros y caida en 8-12: esa asimetria ES lo que se lee como beat.
var eq = [];
var eb;
for (eb = 0; eb < 8; eb++) {
  var bb = plano(img("barra-eq", "eq-" + eb, 420 + eb * 62, 720, 120, 100), 64, C1F);
  tr(bb).property("ADBE Anchor Point").setValue([20, 206, 0]);
  var ee = tr(bb).property("ADBE Scale");
  // fase escrita, no sorteada: el motor tiene que ser determinista
  var fase = eb * 0.9;
  var pasos = [[64, [100, 4, 100], "C7"]];
  var ec;
  for (ec = 0; ec < 6; ec++) {
    // EN LA GRILLA. Los golpes cada 12 cuadros caian en 70, 82, 94: ninguno es multiplo de 8 ni de 15,
    // asi que el ecualizador —que es lo que se lee COMO beat— estaba fuera del beat.
    var t0 = 64 + ec * 16;
    var alto = 26 + Math.round(48 * Math.abs(Math.sin(fase + ec * 1.3)));
    pasos[pasos.length] = [t0, [100, alto, 100], "C1"];
    pasos[pasos.length] = [t0 + 9, [100, 14, 100], "C7"];
  }
  pasos[pasos.length] = [143, [100, 4, 100], "C5"];
  claves(ee, pasos);
  claves(tr(bb).property("ADBE Opacity"), [[64, 0, "C1"], [72, 90, "C5"]]);
  eq[eb] = bb;
}

// 80 · la cifra, con golpe por caracter (T06). El dato pesa MAS que el titular: 96 contra 132 de
// display pero en la fuente de datos y en el acento, o sea que manda igual.
var cifra = porCaracter("0,014 px", 96, ACENTO, F_DATO, 1420, 470, -20);
var ci;
for (ci = 0; ci < cifra.length; ci++) {
  plano(cifra[ci], 80, C1F);
  var ec2 = tr(cifra[ci]).property("ADBE Scale");
  var a80 = 80 + ci * 2;
  claves(ec2, [[a80, [0, 0, 100], "C1"], [a80 + 6, [114, 114, 100], "C8"], [a80 + 11, [100, 100, 100], "C5"]]);
}
var haloC = plano(img("halo-calido", "halo-cifra", 1420, 470, 60, 0), 80, C1F);
claves(tr(haloC).property("ADBE Scale"), [[80, [40, 40, 100], "C1"], [96, [110, 110, 100], "C5"]]);
claves(tr(haloC).property("ADBE Opacity"), [[80, 0, "C1"], [92, 70, "C5"]]);

// 96 · la etiqueta sobre su pastilla
var chip = plano(img("chip", "chip-geo", 1420, 590, -10, 100), 96, C1F);
var chipT = plano(rotulo("GEOMETR{I}A", 26, SEGUNDA, F_ETIQUETA, 1420, 600, -30), 96, C1F);
claves(tr(chip).property("ADBE Scale"), [[96, [0, 100, 100], "C1"], [106, [100, 100, 100], "C5"]]);
claves(tr(chipT).property("ADBE Opacity"), [[100, 0, "C1"], [110, 100, "C5"]]);
parametro(chipT, fuenteDe(chipT), "ADBE Text Properties/ADBE Text Document", "Rotulo del dato", "texto");
acompana(ejH.y, 96, 14, 430, 12);

// 112 · la reticula se achica y se corre: deja de ser el centro y pasa a ser el testigo
claves(escR, [[112, [62, 62, 100], "C1"], [126, [30, 30, 100], "C5"]]);
claves(ejR.x, [[112, 960, "C1"], [126, 300, "C5"]]);
claves(ejR.y, [[112, 470, "C1"], [126, 210, "C5"]]);

// 120 · MACRO — F12 · SQUASH AND STRETCH sobre el panel, y el acompañamiento de todo el plano
claves(tr(heroe).property("ADBE Scale"), [[120, [62, 62, 62], "C7"], [124, [66, 57, 62], "C8"],
                                          [134, [62, 62, 62], "C5"]]);
acompana(ejH.y, 120, 16, 430, -22);
acompana(tr(reti).property("ADBE Rotate Z"), 120, 16, 0, 14);

// 128 · una segunda etiqueta, que ademas cierra el hueco de 24 cuadros que quedaba hasta el corte
var chip2 = plano(img("chip", "chip-tipo", 660, 900, -10, 100), 128, C1F);
var chip2T = plano(rotulo("AUTORADO EN AE", 26, APOYO, F_ETIQUETA, 660, 910, -30), 128, C1F);
claves(tr(chip2).property("ADBE Scale"), [[128, [0, 100, 100], "C1"], [138, [100, 100, 100], "C5"]]);
claves(tr(chip2T).property("ADBE Opacity"), [[130, 0, "C1"], [140, 100, "C5"]]);
parametro(chip2T, fuenteDe(chip2T), "ADBE Text Properties/ADBE Text Document", "Rotulo de origen", "texto");
// (paralaje sacado del cuadro 128: con el fondo moviendose casi siempre, todo quedaba en papilla)

// 136 · E06 · salida por colapso. La salida dura el 60% de la entrada.
var ek;
for (ek = 0; ek < 8; ek++) {
  claves(tr(eq[ek]).property("ADBE Opacity"), [[136, 90, "C3"], [143, 0, "C5"]]);
}

// ================================================================ PLANO 2 · la grilla y las tarjetas
// 144 · corte. F09 · GRILLA QUE SE ARMA, escalonada EN DIAGONAL: se lee como ola, no como lista.
var grilla = [];
var gf, gc;
for (gf = 0; gf < 3; gf++) {
  for (gc = 0; gc < 5; gc++) {
    var gx = 380 + gc * 300, gy = 250 + gf * 300;
    var gz = 880 + (gf * 5 + gc) * 7;
    var gp = plano(img("panel-nube", "grilla-" + gf + "" + gc, gx, gy, gz, 76), C1F, C2F);
    var eg = ejes(gp);
    var ag = 144 + (gf + gc) * 2;
    claves(eg.z, [[ag, gz + 620, "C1"], [ag + 13, gz, "C5"]]);
    claves(tr(gp).property("ADBE Opacity"), [[ag, 0, "C1"], [ag + 10, 100, "C5"]]);
    grilla[grilla.length] = { capa: gp, ejes: eg, y: gy };
  }
}

// 168 / 176 / 184 · tres tarjetas entran deslizando (E01), escalonadas 8 = medio beat
var DATOS = [["TIPOGRAF{I}A", "0,94 %", "panel-tarjeta"],
             ["IMAGEN", "1:1", "panel-tarjeta-acento"],
             ["FORMA", "0,10", "panel-tarjeta"]];
var tarjetas = [];
var ti;
for (ti = 2; ti >= 0; ti--) {
  var D = DATOS[ti];
  var tx = 480 + ti * 480, tz = (ti === 1) ? 54 : (ti === 0 ? 130 : 96);
  var sb = plano(img("sombra-tarjeta", "sombra-t" + ti, tx, 700, tz + 2, 100), C1F, C2F);
  var tj = plano(img(D[2], "tarjeta-" + ti, tx, 560, tz, 100), C1F, C2F);
  var et = ejes(tj);
  // en el beat de 16: la entrada de las tarjetas es uno de los gestos que mandan
  var at = 176 + (2 - ti) * 8;
  claves(et.x, [[at, tx - 90, "C1"], [at + 14, tx, "C5"]]);
  claves(tr(tj).property("ADBE Opacity"), [[at, 0, "C1"], [at + 10, 100, "C5"]]);
  claves(tr(sb).property("ADBE Opacity"), [[at, 0, "C1"], [at + 12, 75, "C5"]]);
  sb.parent = tj;

  var lb = plano(rotulo(D[0], 26, SEGUNDA, F_ETIQUETA, tx, 500, tz - 14), C1F, C2F);
  var vl = plano(rotulo(D[1], 96, TINTA, F_DATO, tx, 610, tz - 26), C1F, C2F);
  lb.parent = tj; vl.parent = tj;
  claves(tr(lb).property("ADBE Opacity"), [[at, 0, "C1"], [at + 11, 100, "C5"]]);
  claves(tr(vl).property("ADBE Opacity"), [[at, 0, "C1"], [at + 14, 100, "C5"]]);
  tarjetas[ti] = { capa: tj, ejes: et, x: tx, z: tz, lb: lb, vl: vl };
  // cada tarjeta expone su etiqueta y su cifra: es el dato que cambia de cliente a cliente
  parametro(lb, fuenteDe(lb), "ADBE Text Properties/ADBE Text Document", "Etiqueta " + (ti + 1), "texto");
  parametro(vl, fuenteDe(vl), "ADBE Text Properties/ADBE Text Document", "Cifra " + (ti + 1), "texto");
}

// 200 · la reticula vuelve y se posa sobre la tarjeta del medio: el simbolo MIDE
claves(ejR.x, [[200, 300, "C1"], [216, 960, "C5"]]);
claves(ejR.y, [[200, 210, "C1"], [216, 560, "C5"]]);
claves(escR, [[200, [30, 30, 100], "C1"], [216, [56, 56, 100], "C5"]]);
acompana(tarjetas[1].ejes.y, 200, 16, 560, -18);

// 216 · F07 otra vez, ahora desde la tarjeta medida
var ondas2 = [];
for (oi = 0; oi < 2; oi++) {
  var o2 = plano(img("aro-medio", "onda2-" + oi, 960, 560, -66 - oi * 4, 20), 216, C2F);
  var a2 = 216 + oi * 8;
  claves(tr(o2).property("ADBE Scale"), [[a2, [20, 20, 100], "C1"], [a2 + 24, [230, 230, 100], "C5"]]);
  claves(tr(o2).property("ADBE Opacity"), [[a2, 0, "C1"], [a2 + 5, 82, "C1"], [a2 + 24, 0, "C5"]]);
  ondas2[oi] = o2;
}

// 232 · la cifra de la tarjeta medida crece (D06: la jerarquia manda)
claves(tr(tarjetas[1].vl).property("ADBE Scale"), [[232, [100, 100, 100], "C1"], [246, [138, 138, 100], "C5"]]);
// EL ACOMPAÑAMIENTO TERMINA ANTES DE QUE ARRANQUE EL GESTO SIGUIENTE. Corriendo hasta el 246 le
// tapaba al colapso del 240 los seis cuadros de quietud que necesita para leerse como algo nuevo.
acompana(tarjetas[0].ejes.y, 216, 14, 560, 16);
acompana(tarjetas[2].ejes.y, 216, 14, 560, 16);

// 240 · MACRO — las otras dos colapsan (E06) y la medida se acerca
var tk;
for (tk = 0; tk < 3; tk = tk + 2) {
  claves(tr(tarjetas[tk].capa).property("ADBE Scale"), [[240, [100, 100, 100], "C3"], [249, [0, 0, 100], "C5"]]);
}
claves(tarjetas[1].ejes.z, [[240, 54, "C1"], [258, 10, "C5"]]);
claves(tr(tarjetas[1].capa).property("ADBE Scale"), [[240, [100, 100, 100], "C1"], [258, [126, 126, 100], "C5"]]);

// 256 · la barra se llena bajo la tarjeta
var barra = plano(img("barra-apoyo", "barra-medida", 660, 760, -40, 100), 256, C2F);
tr(barra).property("ADBE Anchor Point").setValue([3, 10, 0]);
claves(tr(barra).property("ADBE Scale"), [[256, [0, 100, 100], "C1"], [272, [100, 100, 100], "C5"]]);

// 272 · X10 · DESTELLO: opacidad 0-100-0 con el pico en el tercer cuadro
var flash = plano(img("halo-frio", "destello", 960, 560, 40, 0), 272, C2F);
claves(tr(flash).property("ADBE Scale"), [[272, [78, 78, 100], "C7"], [286, [104, 104, 100], "C5"]]);
// UN DESTELLO ES UN ACENTO, NO EL GESTO QUE MANDA. Con opacidad 85 sobre un halo de 640 px se
// llevaba la escala entera de la pieza: era el unico gesto "macro" y caia en el cuadro 272, que no
// es del beat. Bajarlo no lo hace mas debil — lo pone en su lugar.
claves(tr(flash).property("ADBE Opacity"), [[272, 0, "C7"], [276, 34, "C3"], [286, 0, "C5"]]);
acompana(ejR.y, 272, 14, 560, -20);

// ================================================================ PLANO 3 · el remate
// 288 · corte. La nube llega desde el fondo, escalonada 3, y se abre alrededor del centro.
var nube = [];
var ni;
for (ni = 0; ni < 8; ni++) {
  var ang = ni * Math.PI * 2 / 8 + 0.39;
  var sn = Math.sin(ang);
  var sep = Math.abs(sn) < 0.62 ? (sn < 0 ? -0.62 : 0.62) : sn;
  var nx = 960 + Math.cos(ang) * 720, ny = 540 + sep * 600;
  var nz = 900 + ni * 9;
  var np = plano(img("panel-nube", "nube-" + ni, nx, ny, nz, 82), C2F, CUADROS);
  var en = ejes(np);
  var an = 288 + ni * 3;
  claves(en.z, [[an, nz + 680, "C1"], [an + 14, nz, "C5"]]);
  claves(tr(np).property("ADBE Opacity"), [[an, 0, "C1"], [an + 11, 100, "C5"]]);
  nube[ni] = { capa: np, ejes: en, y: ny, z: nz };
}
// 304 · acuse en cascada desde el centro
var nk;
for (nk = 0; nk < 8; nk++) { acompana(nube[nk].ejes.y, 304 + (nk % 4) * 2, 18, nube[nk].y, nk < 4 ? -26 : 26); }

// 320 · la rafaga vuelve, ahora en el centro
var rayos2 = [];
for (ry = 0; ry < 8; ry++) {
  var r2 = plano(img("rayo", "rayo2-" + ry, 960, 470, -56 - ry * 3, 0), 320, 352);
  tr(r2).property("ADBE Anchor Point").setValue([0, 5, 0]);
  tr(r2).property("ADBE Rotate Z").setValue(ry * 45);
  claves(tr(r2).property("ADBE Scale"), [[320 + ry, [0, 100, 100], "C1"], [320 + ry + 12, [140, 140, 100], "C5"]]);
  claves(tr(r2).property("ADBE Opacity"), [[320 + ry, 85, "C1"], [320 + ry + 6, 85, "C1"], [320 + ry + 14, 0, "C5"]]);
  rayos2[ry] = r2;
}

// 336 · la reticula vuelve al centro, grande: el simbolo cierra donde abrio
claves(ejR.x, [[336, 960, "C5"]]);
claves(ejR.y, [[336, 470, "C1"], [352, 430, "C5"]]);
claves(escR, [[336, [56, 56, 100], "C1"], [352, [96, 96, 100], "C5"]]);
claves(rotR, [[336, 14, "C1"], [352, -8, "C5"]]);

// 352 · una onda mas, la ultima medicion
var ondaF = plano(img("aro-fino", "onda-final", 960, 430, -50, 20), 352, CUADROS);
claves(tr(ondaF).property("ADBE Scale"), [[352, [24, 24, 100], "C1"], [384, [260, 260, 100], "C5"]]);
claves(tr(ondaF).property("ADBE Opacity"), [[352, 0, "C1"], [358, 80, "C1"], [384, 0, "C5"]]);

// 360 · MACRO — el remate sube letra por letra, y la nube se va al fondo para dejarle el cuadro
for (nk = 0; nk < 8; nk++) {
  claves(nube[nk].ejes.z, [[352, nube[nk].z, "C2"], [372, nube[nk].z + 700, "C5"]]);
}
var remate = porCaracter("MISMO CUADRO", 132, TINTA, F_DISPLAY, 960, 780, 200);
var tapaR = bloqueDe("bloque-remate", "bloque-remate", 1280, 190, 320, 767, 168, 350, 386, 354, 16);
for (li = 0; li < remate.length; li++) {
  plano(remate[li], 352, CUADROS);
  var ejM = ejes(remate[li]);
  claves(ejM.y, [[352 + li * 2, 780 + 70, "C1"], [352 + li * 2 + 13, 780, "C5"]]);
}

// 384 · una regla de acento crece bajo el remate. Cierra el hueco entre el remate y la bajada, y de
// paso subraya la palabra que la pieza vino a decir.
var reglaR = plano(img("barra-acento", "regla-remate", 660, 812, -46, 100), 384, CUADROS);
tr(reglaR).property("ADBE Anchor Point").setValue([3, 10, 0]);
claves(tr(reglaR).property("ADBE Scale"), [[384, [0, 100, 100], "C1"], [396, [100, 100, 100], "C5"]]);
acompana(ejR.y, 384, 14, 430, 20);

// 392 · la bajada, un beat despues: acento, no cascada
var bajada = plano(rotulo("no parecido: medido", 42, SEGUNDA, F_LECTURA, 960, 880, 190), 400, CUADROS);
var ejB = ejes(bajada);
var tapaB = bloqueDe("bloque-bajada", "bloque-bajada", 600, 96, 660, 884, 170, 398, 422, 402, 12);
claves(ejB.y, [[400, 880 + 40, "C1"], [414, 880, "C5"]]);
parametro(bajada, fuenteDe(bajada), "ADBE Text Properties/ADBE Text Document", "Bajada del remate", "texto");

// 408 · la reticula se cierra sobre el remate. Es el ultimo gesto y el argumento de la pieza.
claves(escR, [[416, [96, 96, 100], "C1"], [432, [124, 124, 100], "C5"]]);
claves(tr(reti).property("ADBE Opacity"), [[416, 100, "C1"], [434, 34, "C5"]]);
acompana(ejB.y, 416, 16, 880, -10);

// ================================================================ LA CAMARA
// Tres planos con CORTE, deriva lenta, un contragolpe, y balanceo. Aporta ~1-2% de la energia.
var camara = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
camara.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
var trC = tr(camara);
trC.property("ADBE Position").dimensionsSeparated = true;
var cx = trC.property("ADBE Position_0"), cy = trC.property("ADBE Position_1"), cz = trC.property("ADBE Position_2");
claves(cx, [[0, 940, "C5"], [143, 958, "HOLD"], [144, 1000, "C5"], [287, 980, "HOLD"], [288, 946, "C5"], [449, 966, "C5"]]);
claves(cy, [[0, 560, "C5"], [143, 548, "HOLD"], [144, 500, "C5"], [287, 512, "HOLD"], [288, 560, "C5"], [449, 550, "C5"]]);
claves(cz, [[0, -2320, "C5"], [143, -2356, "HOLD"],
            [144, -2180, "C7"], [152, -2192, "C8"], [163, -2180, "C5"], [287, -2214, "HOLD"],
            [288, -2420, "C5"], [449, -2452, "C5"]]);
claves(trC.property("ADBE Rotate Z"), [[0, 0, "HOLD"], [143, 0, "HOLD"], [144, -1.8, "C5"],
                                       [287, -1.3, "HOLD"], [288, 1.0, "C5"], [449, 0.3, "C5"]]);

// paralaje del fondo en los gestos grandes: es lo unico que puede acompañar a algo de pantalla completa
acompana(ejF.y, 0, 18, ALTO / 2, 65);
// (paralaje sacado del cuadro 48: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 120: con el fondo moviendose casi siempre, todo quedaba en papilla)
acompana(ejF.y, 144, 20, ALTO / 2, -60);
// (paralaje sacado del cuadro 200: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 240: con el fondo moviendose casi siempre, todo quedaba en papilla)
acompana(ejF.x, 288, 20, ANCHO / 2, -65);
// (paralaje sacado del cuadro 336: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 16: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 32: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 64: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 80: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 96: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 168: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 184: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 216: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 256: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 272: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 320: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 400: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (paralaje sacado del cuadro 416: con el fondo moviendose casi siempre, todo quedaba en papilla)
acompana(ejR.y, 168, 14, 210, 26);
acompana(ejR.y, 184, 14, 210, -26);
acompana(ejR.y, 192, 14, 210, 22);
// (paralaje sacado del cuadro 176: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

acompana(ejF.y, 288, 18, ALTO / 2, 55);
// (paralaje sacado del cuadro 304: con el fondo moviendose casi siempre, todo quedaba en papilla)
// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

// (paralaje sacado del cuadro 384: con el fondo moviendose casi siempre, todo quedaba en papilla)
acompana(ejR.y, 256, 14, 560, 22);
acompana(ejR.y, 288, 16, 470, 26);
// acompañamientos entre elementos: cada gesto suelto se lleva uno o dos companeros del mismo plano
// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

// (sacado: pisaba el gesto real de la reticula en el 112, sobre el mismo eje)
acompana(ejH.y, 128, 14, 430, -20);
// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

acompana(ejR.y, 336, 14, 430, 22);
acompana(rotR, 8, 14, 0, -7);
acompana(tarjetas[1].ejes.y, 224, 14, 560, -18);
acompana(ejR.y, 232, 14, 560, 18);
acompana(tarjetas[1].ejes.y, 256, 14, 560, 18);
acompana(tarjetas[2].ejes.y, 272, 14, 560, -18);
acompana(nube[1].ejes.y, 352, 14, nube[1].y, 24);
acompana(nube[5].ejes.y, 352, 14, nube[5].y, -24);
acompana(ejH.y, 64, 14, 430, 18);
acompana(ejH.y, 80, 14, 430, -18);
acompana(ejH.y, 112, 14, 430, 20);
acompana(tarjetas[2].ejes.y, 216, 14, 560, 20);
acompana(nube[3].ejes.y, 336, 14, nube[3].y, 22);
acompana(nube[7].ejes.y, 336, 14, nube[7].y, -22);
acompana(ejR.y, 416, 16, 430, 22);
// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

// (sacado: un gesto chico no necesita dos compañeros — daba papilla)

acompana(ejF.x, 352, 20, ANCHO / 2, 65);

// ================================================================ EL GRANO (F11 aplicado a textura)
// Tres cuadros alternados con claves HOLD cada 3. Va en 2D y arriba de todo: en una composicion con
// camara, una capa 2D vive pegada al cuadro, que es exactamente lo que una textura de pelicula tiene
// que hacer. Se excluye de las dos compuertas por nombre: es textura, no gesto.
var gr = [];
var gi;
for (gi = 0; gi < 3; gi++) {
  var gg = comp.layers.add(recurso("grano-" + gi));
  gg.name = "grano-" + gi;
  tr(gg).property("ADBE Position").setValue([ANCHO / 2, ALTO / 2]);
  var og = tr(gg).property("ADBE Opacity");
  var pasosG = [], pg;
  for (pg = 0; pg * 9 < CUADROS; pg++) {
    pasosG[pasosG.length] = [pg * 9 + gi * 3, 20, "HOLD"];
    pasosG[pasosG.length] = [pg * 9 + gi * 3 + 3, 0, "HOLD"];
  }
  claves(og, pasosG);
  gr[gi] = gg;
}

fondo.moveToEnd();

// el manifiesto va al comentario de la composicion: es la unica forma de que el exportador sepa a que
// propiedad corresponde cada nombre publico
// se une con String.fromCharCode(10) y no con un "\n" escrito: este archivo se genera y se edita con
// herramientas que interpretan los escapes, y un salto de linea REAL dentro de una cadena de
// ExtendScript es "Constante de cadena incompleta" — un error de parseo que no corre nada y sale como
// cartel modal. Por codigo no hay escape que se pueda malinterpretar.
comp.comment = MANIFIESTO.join(String.fromCharCode(10));
anotar("PARAMETROS|" + MANIFIESTO.length + " declarados");

anotar("PIEZA-D|" + comp.numLayers + " capas|" + DUR + " s|" + CUADROS + " cuadros");

app.endUndoGroup();

} catch (exTodo) {
  anotar("ERROR|" + texto(exTodo) + "|linea " + (exTodo.line !== undefined ? exTodo.line : "?"));
  try { app.endUndoGroup(); } catch (exFin) {}
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
