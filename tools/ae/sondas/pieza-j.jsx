// PIEZA-J — URVID · papel y tinta
//
// ================================================================ QUE LA SEPARA DE LA PIEZA-I
//
// La PIEZA-I es cinematica oscura: negro puro, luz de borde horneada en los PNG, un acento azul frio,
// paneles muy girados y trece tiempos que van "aparece algo, se queda, se va". Salio bien y salio
// TODA de una misma receta.
//
// Esta es lo contrario en las cuatro decisiones que importan:
//   · CLARA en vez de oscura. Fondo hueso, tinta grafito, sin un solo degradado.
//   · SIN LUZ. El volumen sale del CANTO de un objeto, no de un halo. Es una impresion, no una toma.
//   · UN OBJETO que dura los 24 segundos, en vez de trece objetos que se turnan.
//   · Y por eso mismo, CADA TRANSICION ES ESE OBJETO GIRANDO — que es literalmente la regla que el
//     barrido midio en 8 de 8 avisos: la transicion es siempre un objeto que ya estaba en escena, y
//     0 de 8 usan cortinilla generica.
//
// Y usa lo que se construyo despues de la PIEZA-I, que alla no existia: animadores de texto nativos,
// mascaras con forma, trazos que se dibujan y objetos armados con planos.
//
// ================================================================ FICHA DE ARTE
// FAMILIA      papel y tinta — editorial, plano, impreso. Nada brilla.
// PALETA       suelo papel tostado #b8b1a4 · tinta #1c1a17 · UN acento naranja quemado #c14e18
//              gris de apoyo #5f584c. La tarjeta es #fbfaf8 de un lado y #26221d del otro.
// LUZ          NO HAY. El volumen lo da el canto de la tarjeta y una sombra plana, no un degradado.
//              Es la decision que mas la separa de la PIEZA-I, donde la luz era el material.
// FORMA        rectangulos con CANTO VISIBLE (la tarjeta son seis planos) y barras de 4 px que crecen
//              desde su ancla. Nada de esquinas redondeadas: es papel cortado.
// TIPOGRAFIA   CenturyGothic display (0,20% de desvio medido, la mejor de once), SegoeUI-Light para
//              lectura, SegoeUI para etiquetas. SIEMPRE FRONTAL — 8 de 8 avisos dejan el rotulo plano.
// PROFUNDIDAD  la tarjeta gira DE VERDAD en el espacio, con sus cuatro cantos. El texto va al frente,
//              plano, sin escorzo nunca.
// SIMBOLO      LA TARJETA. Entra en el cuadro 24 y se va en el 592. Todo lo demas cuelga de ella.
//
// Y LA PALETA NO ES LA QUE ESCRIBI. La primera era hueso sobre hueso sobre hueso y `escena-check` la
// desarmo en un renglon: la tarjeta contra el fondo daba 1,14:1 contra un piso de 1,8:1, y treinta
// pares por debajo. El objeto que sostiene los 24 segundos era casi invisible. Arreglarlo produjo la
// mejor idea de la pieza —la tarjeta blanca de un lado y tinta del otro, asi que cada volteo cambia el
// mundo entero (X18 gratis)— y ademas obliga al texto a elegir su color segun que cara este mirando.
//
// ================================================================ VOCABULARIO, del catalogo
//   T05  maquina de escribir            animador de texto, suavidad 0, se anima el INICIO del rango
//   T08  interletra que se cierra       animador de interletra, selector cuadrado
//   T09  ondulacion tipografica         selector triangulo con ease, desplazamiento animado
//   F01  crecer desde el borde          el contorno: cuatro barras que escalan desde su ancla
//   F02  barra que se llena             los cuatro subrayados naranjas
//   F12  squash & stretch               la sombra, que se achica cuando la tarjeta se pone de perfil
//   F13  falso extruido                 la tarjeta: cara, dorso y cuatro cantos
//   X13  volteo de tarjeta              LA transicion de la pieza: no hay ninguna otra
//   X10  tira / carrusel                seis escenas en fila que hacen clic
//   X16  destello                       tapa el corte de las seis caras en el cuadro 586
//   E05  volteo de una cara             la entrada de la tarjeta, de canto a frente
//
// NI F01 NI F02 SE HACEN CON RECORTE DE TRAZADO, aunque el catalogo los describa asi, y no es una
// eleccion: un recorte animado vive DENTRO del contenido de una capa de forma, y las formas viajan al
// motor RASTERIZADAS. El exportador rechaza esas cuatro capas por nombre —"el CONTENIDO de la forma
// esta animado y la rasterizacion lo congela"— en vez de dejarlas pasar y entregar algo PARECIDO.
// Lo que si viaja es la transformacion, asi que una barra que crece es ESCALA DESDE EL ANCLA.
//
// ================================================================ LOS NUEVE TIEMPOS
//    A    0- 24  el contorno de la tarjeta se dibuja lado por lado, sobre el suelo vacio
//    B   24- 60  la tarjeta CORTA sobre el contorno y se abre de canto (E05)
//    C   56-140  se escribe el titular letra por letra (T05) y se subraya (F02)
//    D  140-190  la tarjeta GIRA a su cara oscura: primera transicion, y son todas asi (X13)
//    E  192-292  sobre la cara oscura, un panel blanco revelado por MASCARA
//    F  296-356  "En treinta segundos" en ondulacion (T09), con su barra
//    G  360-404  la tarjeta gira otra vez, de vuelta a la cara clara
//    H  404-560  la tira de seis escenas hace cuatro clics sobre la tarjeta (X10)
//    I  474-558  "Cada escena es tuya" con la interletra cerrandose (T08)
//    J  566-600  EL GESTO GRANDE: la tarjeta empuja 1,44x hacia la camara y el destello tapa el corte
//    K  616-720  el cierre: Urvid, su subrayado y la direccion
//
// URVID, no cliping. "cliping" es el nombre viejo y sobrevive en el repo y en la PIEZA-I.
//
// ================================================================ COMO QUEDO CONTRA LAS COMPUERTAS
// marco · foco · gesto · escena · lectura · colision · selector      OK
// exportador: DOCUMENTO COMPLETO, nada queda afuera
// ritmo 4/7 — fallan M1 (1,04 contra un piso de 1,20), M3 (69%) y M6 (peor hueco 55 cuadros).
//
// Los tres huecos que M6 nombra son 474-529, 424-474 y 170-214, y en los tres HAY movimiento en
// pantalla que la metrica no puede ver. Esta medido, no supuesto:
//   · 170-214  el panel entra por una MASCARA ANIMADA. La capa esta quieta y lo que cambia es el
//              recorte, que la energia no mira.
//   · 424-474  la tira hace su segundo clic. Cada panel pesa 0,0155 del cuadro y un clic da 2,95e-4
//              por cuadro; el umbral de arranque es el 25% del pico DE SU PROPIA CAPA, y el pico de
//              esa capa es su propia salida.
//   · 474-529  se arma "Cada escena es tuya" con un ANIMADOR de interletra, que no mueve la caja de
//              la capa: aporta cero a los cuatro terminos.
// La PIEZA-I —la anterior, la que salio bien— reprueba M1, M3 y M6 tambien.
//
// LO QUE SI SE ARREGLO EN EL INSTRUMENTO, verificado contra las PIEZAS B, C, D e I (veredicto identico
// antes y despues en las cuatro): `ritmo` no veia el giro 3D y ahora lo ve (termino `dForma`), M7
// contaba como empate la cara y el dorso de un mismo objeto, `escena-check` dejaba que una capa 3D
// tapara a una 2D, y contaba como desperdicio que el dorso de un solido este atras.
//
// USO
//   node tools/ae/es3-check.mjs tools/ae/sondas/pieza-j.jsx
//   node tools/ae/llamar.mjs tools/ae/sondas/pieza-j.jsx
//   printf 'PIEZA-J' > C:/ae-probe/exportar-comp.txt
//   node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/pieza-j.json

var RUTA = "C:/ae-probe/pieza-j.txt";

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
app.beginUndoGroup("PIEZA-J");

var NOMBRE = "PIEZA-J";
var ANCHO = 1920, ALTO = 1080, FPS = 30, CUADROS = 720;

// LA PALETA SE REHIZO PORQUE UNA MEDICION LA REPROBO, y la direccion de arte salio mejor.
//
// La primera version era hueso sobre hueso sobre hueso: fondo #f2efe9, tarjeta #e5e0d8, rueda #d4cec6.
// Se veia coherente escrita y `escena-check` la desarmo en un renglon: la tarjeta contra el fondo daba
// 1,14:1 con un piso de 1,8:1, y treinta pares por debajo. O sea que el objeto que sostiene los 24
// segundos de la pieza era CASI INVISIBLE contra su fondo. Es el defecto que el usuario encuentra en
// cinco segundos y yo no vi escribiendo, porque "crema sobre crema" suena a decision y es una falta de
// contraste.
//
// Lo que salio de arreglarlo es mejor que lo que habia: EL SUELO ES PAPEL TOSTADO y LA TARJETA ES
// BLANCA DE UN LADO Y TINTA DEL OTRO. Con eso cada volteo cambia el mundo entero de claro a oscuro y
// al reves — X18 · cambio de mundo, gratis, sin una capa mas — y el texto elige su color segun que
// cara este mirando. La restriccion produjo la idea.
var FONDO = [0.722, 0.694, 0.643];    // #b8b1a4  el suelo: papel tostado
var HUESO = [0.949, 0.937, 0.914];    // #f2efe9  el destello, y el texto que cae sobre la cara oscura
var TINTA = [0.110, 0.102, 0.090];    // #1c1a17
var NARANJA = [0.757, 0.306, 0.094];  // #c14e18  bajado desde #e2622a: el anterior daba 1,65:1
var GRIS = [0.373, 0.345, 0.298];     // #5f584c  apoyo, 3,29:1 contra el suelo
var CARA = [0.984, 0.980, 0.973];     // #fbfaf8  la cara clara de la tarjeta
var DORSO = [0.149, 0.133, 0.114];    // #26221d  el dorso: tinta
// EL CANTO ES #514a41 Y ESE VALOR NO SE ELIGIO: SE DESPEJO. Tiene que cumplir cuatro desigualdades a
// la vez, y el rango que queda es de un 6% de luminancia:
//   contra el dorso #26221d   L >= 1,8 · 0,0665 - 0,05 = 0,0696   o el canto no se distingue del dorso
//   contra la ficha #c14e18   L <= 0,2184 / 1,8 - 0,05 = 0,0713   o la ficha no se distingue del canto
//   contra la cara #fbfaf8    L <= 0,514                          holgado
//   contra el suelo #b8b1a4   L <= 0,224                          holgado
// #514a41 da L = 0,0703: entra por 0,0007 por arriba y 0,0010 por abajo.
//
// Antes probe #4a443c, que "se veia bien": daba 1,64:1 contra el dorso. Y antes #6e6659, que daba
// 1,18:1 contra la ficha. CON UNA PALETA DE VALOR CERRADO NO SE ELIGEN COLORES A OJO — se resuelve el
// sistema, porque el rango util es mas angosto que la diferencia que uno alcanza a ver entre dos
// grises. Dos intentos a ojo, dos fallos; el sistema despejado, uno.
//
// Y la ficha no esta encima del canto: se cruzan solo cuando la tarjeta pasa de perfil en cada
// volteo. Un canto mas oscuro ademas se lee como un papel mas fino, que es lo que la ficha de arte
// pide, asi que la restriccion no costo nada.
var CANTO = [0.318, 0.290, 0.255];    // #514a41  el canto
var RUEDA_A = [0.180, 0.165, 0.141];  // #2e2a24
var RUEDA_B = [0.522, 0.494, 0.439];  // #857e70

var F_DISPLAY = "CenturyGothic";
var F_LECTURA = "SegoeUI-Light";
var F_ETIQUETA = "SegoeUI";

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

// PONER UNA INFLUENCIA PROMUEVE LA CLAVE A BEZIER DE LOS DOS LADOS y pisa el tipo del tramo anterior.
// Por eso los tipos se vuelven a fijar DESPUES de las influencias.
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
function plano(capa, desde, hasta) { capa.inPoint = desde / FPS; capa.outPoint = hasta / FPS; return capa; }
function vive(capa, entra, dEnt, sale, dSal, tope) {
  if (tope === undefined) { tope = 100; }
  claves(op(capa), [[entra, 0, "C2"], [entra + dEnt, tope, "C5"], [sale - dSal, tope, "C3"], [sale, 0, "C5"]]);
  plano(capa, Math.max(0, entra - 1), Math.min(CUADROS, sale + 1));
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
comp.bgColor = [0.722, 0.694, 0.643];
comp.openInViewer();

function solido(nombre, col, w, h, x, y, z, es3D) {
  var s = comp.layers.addSolid(col, nombre, w, h, 1);
  s.motionBlur = true;
  if (es3D) { s.threeDLayer = true; pos(s).setValue([x, y, z]); }
  else { pos(s).setValue([x, y]); }
  return s;
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

// ---------------------------------------------------------------- los animadores de texto
//
// EL TECLEO SE HACE CON UN ANIMADOR, no con una capa por letra. Y dos cosas o no es un tecleo:
// la SUAVIDAD viene en 100 y hay que ponerla en 0 (a 100 cada letra se cubre a lo largo de un paso
// entero, o sea una cortina), y se anima el INICIO del rango, no el final — con [inicio, 100] en
// opacidad 0, subir el inicio descubre de izquierda a derecha.
//
// Nada de cachear propiedades del selector: cambiar las unidades invalida las referencias.
function animadorDe(capa) {
  return capa.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
}
function selDe(an) { return an.property("ADBE Text Selectors").property(1); }
function avDe(an) { return selDe(an).property("ADBE Text Range Advanced"); }
function propsDe(an) { return an.property("ADBE Text Animator Properties"); }

function tecleo(capa, desde, hasta) {
  var an = animadorDe(capa);
  an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
  propsDe(an).addProperty("ADBE Text Opacity").setValue(0);
  avDe(an).property("ADBE Text Selector Smoothness").setValue(0);
  avDe(an).property("ADBE Text Range Units").setValue(1);
  selDe(an).property("ADBE Text Percent End").setValue(100);
  claves(selDe(an).property("ADBE Text Percent Start"),
         [[desde, 0, "C5"], [hasta, 100, "C5"]]);
  return an;
}

// ================================================================ EL FONDO
//
// EL FONDO ES UN SOLIDO REAL — el fondo de la composicion no existe hasta la codificacion. Y va en 3D
// y lejos, porque hay capas 3D en escena y una capa 2D se dibuja DESPUES del mundo 3D, o sea encima.
var fondo = solido("fondo-papel", FONDO, 9000, 5200, 960, 540, 3600, true);
plano(fondo, 0, CUADROS);

// una trama de tres lineas finisimas, quietas: es papel, no vacio. Van con prefijo deco- porque no se
// leen y `lectura-check` no tiene que exigirles cuerpo.
var dl;
for (dl = 0; dl < 3; dl++) {
  var linea = solido("deco-regla-" + dl, [0.471, 0.443, 0.373], 2, 1400, 250 + dl * 700, 540, 2400, true);
  op(linea).setValue(34);
  plano(linea, 0, CUADROS);
}

// ================================================================ LA CAMARA
//
// `addCamera(nombre, [960, 540])` NO pone la camara ahi: ese argumento es el PUNTO DE INTERES y la
// posicion queda en [0, 0, -zoom]. Se centra a mano, ANTES de separar dimensiones. Con la camara a la
// altura del borde superior mirando al centro, la vista queda inclinada 17 grados y todo lo que vive
// en z>0 sube 240 px en el cuadro — asi salieron tres paneles cortados en la PIEZA-I.
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
pos(cam).setValue([ANCHO / 2, ALTO / 2, -2600]);
// EL ZOOM IGUAL A LA DISTANCIA: con la camara a -2000 y zoom 2000, el plano z=0 se dibuja 1:1 y las
// coordenadas 2D y las 3D son las mismas. Sin esto un contorno 2D de 760 px y una tarjeta 3D de 760 px
// salen de distinto tamano en el cuadro, y el contorno de la pieza es justo el contorno de la tarjeta.
// ZOOM IGUAL A LA DISTANCIA: el plano z=0 se dibuja 1:1 y las coordenadas 2D y las 3D son las mismas.
//
// Y LA DISTANCIA SUBIO DE 2000 A 2600 POR UNA CUENTA, no por gusto. La tarjeta mide 1240 de ancho, o
// sea que al girar lleva sus cantos 620 unidades hacia la camara: a 2000 eso es el 31% de la distancia
// y el canto cercano crece 1,33x. En el cuadro 30 —la tarjeta abriendose— llenaba la pantalla de
// blanco. A 2600 el mismo giro da 24% y 1,21x: sigue habiendo perspectiva y ya no hay pared.
// El objeto se agrando y la camara tuvo que retroceder; son la misma decision.
cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom").setValue(2600);
// Y SE APAGA LA AUTO-ORIENTACION. Por defecto la camara gira para mirar el punto de interes, asi que
// cualquier deriva lateral la inclina — la misma familia de defecto que corto tres paneles en la
// PIEZA-I. Esta pieza es frontal por direccion de arte: la camara traslada, no gira.
cam.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
var ejCam = ejes(cam);
claves(ejCam.z, [[0, -2600, "C4"], [190, -2540, "C4"], [470, -2580, "C4"],
                 [566, -2560, "C3"], [600, -2660, "C1"], [720, -2600, "C5"]]);
claves(ejCam.x, [[0, 960, "C4"], [290, 1000, "C4"], [560, 930, "C4"], [720, 960, "C5"]]);
claves(ejCam.y, [[0, 540, "C4"], [360, 522, "C4"], [720, 540, "C5"]]);

// ================================================================ LA TARJETA — el hilo conductor
//
// F13 · FALSO EXTRUIDO, hecho con planos: cara, dorso y cuatro cantos colgados de un nulo. Lo que hace
// que una tarjeta se lea como OBJETO y no como papel es el canto; sin el es una imagen que gira.
//
// EL PADRE VA PRIMERO Y LA POSICION DESPUES. AE, al emparentar, recalcula los valores del hijo para
// conservar su posicion en el mundo: al reves, las seis caras terminan alrededor del origen de la
// composicion. Me costo dos mediciones descubrirlo.
var TW = 1240, TH = 720, ESP = 24, ME = ESP / 2;
var eje = comp.layers.addNull();
eje.name = "eje-tarjeta";
eje.threeDLayer = true;
pos(eje).setValue([960, 520, 0]);

function cara(nombre, col, w, h, px, py, pz, rx, ry) {
  var s = comp.layers.addSolid(col, nombre, w, h, 1);
  s.threeDLayer = true;
  s.motionBlur = true;
  s.parent = eje;
  // orientacion en cero ANTES de los angulos propios: al emparentar AE la usa para compensar
  tr(s).property("ADBE Orientation").setValue([0, 0, 0]);
  tr(s).property("ADBE Rotate Z").setValue(0);
  pos(s).setValue([px, py, pz]);
  tr(s).property("ADBE Rotate X").setValue(rx);
  tr(s).property("ADBE Rotate Y").setValue(ry);
  return s;
}
var caras = [
  cara("tar-cara",    CARA, TW, TH,  0, 0, -ME,  0,   0),
  cara("tar-dorso",   DORSO, TW, TH,  0, 0,  ME,  0, 180),
  cara("tar-canto-d", CANTO, ESP, TH,  TW / 2, 0, 0, 0,  90),
  cara("tar-canto-i", CANTO, ESP, TH, -TW / 2, 0, 0, 0, -90),
  cara("tar-canto-a", CANTO, TW, ESP, 0, -TH / 2, 0,  90, 0),
  cara("tar-canto-b", CANTO, TW, ESP, 0,  TH / 2, 0, -90, 0)
];
// LAS CARAS SE APAGAN CUANDO LA TARJETA PASA LA CAMARA, en el cuadro ~592. Sin esto siguen encendidas
// DETRAS del ojo: la proyeccion las devuelve invertidas y enormes, y `marco-check` las conto —seis
// capas quietas y cortadas, hasta 2149 px afuera— aunque en el cuadro no se vea nada raro. Es un
// defecto igual: son seis capas de 760x470 que el motor dibuja para nada en los ultimos 80 cuadros,
// y cualquier medicion que pese por area las cuenta.
var ic;
// SE CORTAN, NO SE DESVANECEN. Seis capas bajando la opacidad al mismo tiempo durante 18 cuadros son
// 18 cuadros de "papilla" —nada domina, nada se lee— y ademas un objeto solido que se vuelve
// transparente delata que son planos. El destello esta en su maximo en el cuadro 586 y tapa el corte:
// es para lo que existe un destello. Un corte tapado por un fogonazo es la transicion; un desvanecido
// de seis caras es un error de armado que se ve.
// ENTRAN EN EL 24, NO EN EL 0. Al sacarles el desvanecido me quede con el punto de entrada en cero, y
// eso deja a la tarjeta VIVA desde el primer cuadro: en el cuadro 12 tapa el contorno que se esta
// dibujando, que es justo el tiempo A entero. El defecto no lo dice ninguna compuerta —la tarjeta esta
// visible, contrasta y se mueve— y salta al mirar un cuadro.
for (ic = 0; ic < caras.length; ic++) { plano(caras[ic], 24, 592); }

// LA FICHA: una pestaña naranja pegada al canto de arriba, que crece desde la izquierda en el cuadro
// 68. Va colgada del mismo nulo, asi que GIRA CON LA TARJETA — es parte del objeto, no un adorno
// encima. Y esta a z=-10, un punto delante de la cara (que esta en -9), para que no peleen el orden.
var ficha = comp.layers.addSolid(NARANJA, "ficha", 168, 18, 1);
ficha.threeDLayer = true;
ficha.motionBlur = true;
ficha.parent = eje;
tr(ficha).property("ADBE Rotate X").setValue(0);
tr(ficha).property("ADBE Rotate Y").setValue(0);
tr(ficha).property("ADBE Rotate Z").setValue(0);
tr(ficha).property("ADBE Orientation").setValue([0, 0, 0]);
tr(ficha).property("ADBE Anchor Point").setValue([0, 10, 0]);
pos(ficha).setValue([-TW / 2 + 96, -TH / 2 + 112, -14]);
claves(esc(ficha), [[68, [0, 100, 100], "C2"], [80, [100, 100, 100], "C1"], [88, [100, 100, 100], "C5"]]);
plano(ficha, 67, 592);

// LA SOMBRA: una barra plana debajo de la tarjeta que se ACHICA cuando la tarjeta se pone de perfil.
// Es F12 · squash & stretch, y esta puesta donde `ritmo` marco los dos huecos mas largos: acompaña a
// los dos volteos, que hasta ahora se movian solos. En "papel y tinta" no puede haber un halo, asi que
// el acompañamiento tiene que ser una sombra impresa — plana, gris, sin degradado.
var sombra = comp.layers.addSolid([0.490, 0.459, 0.408], "sombra-tarjeta", 1120, 12, 1);
sombra.threeDLayer = true;
sombra.motionBlur = true;
pos(sombra).setValue([960, 916, 40]);
claves(esc(sombra), [[0, [26, 100, 100], "C5"], [30, [26, 100, 100], "C2"], [56, [100, 100, 100], "C1"],
                     [140, [100, 100, 100], "C1"], [168, [9, 100, 100], "C8"], [182, [100, 100, 100], "C5"],
                     [360, [100, 100, 100], "C1"], [388, [9, 100, 100], "C8"], [402, [100, 100, 100], "C5"],
                     [566, [100, 100, 100], "C3"], [590, [148, 100, 100], "C5"]]);
claves(op(sombra), [[24, 0, "C2"], [38, 20, "C5"], [560, 20, "C3"], [580, 0, "C5"]]);
plano(sombra, 24, 582);

// EL VOLTEO ES LA TRANSICION DE TODA LA PIEZA (X13). Entra de canto (E05), se abre, y despues cada
// cambio de tiempo es ella girando media vuelta. Nunca hay un corte: 0 de 8 avisos del genero usan
// cortinilla generica, y la transicion es SIEMPRE un objeto que ya estaba en escena.
// NO SE QUEDA A 90 GRADOS EXACTOS, y no es un detalle de gusto. A -92 las dos caras estan a
// |18 · cos(92 grados)| = 0,63 unidades de profundidad: la MISMA distancia a la camara. Ahi el orden de
// dibujo no lo decide la profundidad sino el desempate, y no hay garantia de que AE y el motor
// desempaten igual. `ritmo` lo conto —149 cuadros de empate— y tenia razon: la tarjeta se quedaba 25
// cuadros parada justo en el peor angulo posible. A -104 la separacion es 4,35 y el empate desaparece.
// Ademas se ve mejor: una tarjeta inclinada muestra su canto y su cara, una de perfil no muestra nada.
//
// Y ARRANCA CON CURVA RAPIDA (C1), no con C3. El giro con C3 sale tan despacio que `ritmo` no lo lee
// como arranque: el gesto mas grande de la pieza no contaba como gesto. Un volteo tiene que SALIR
// disparado y frenar, no acelerar de a poco.
var ryEje = tr(eje).property("ADBE Rotate Y");
claves(ryEje, [[24, -97, "C2"], [48, -8, "C1"], [60, 0, "C8"],
               [140, 0, "C1"], [168, 176, "C8"], [182, 180, "C5"],
               [360, 180, "C1"], [388, 356, "C8"], [402, 360, "C5"],
               [566, 360, "C3"], [598, 382, "C5"]]);
var rxEje = tr(eje).property("ADBE Rotate X");
claves(rxEje, [[0, -3, "C4"], [290, 2, "C4"], [560, -4, "C4"], [720, 0, "C5"]]);
var ejN = ejes(eje);
claves(ejN.y, [[24, 560, "C2"], [60, 520, "C1"], [148, 534, "C1"], [176, 516, "C8"],
               [290, 512, "C4"], [368, 526, "C1"], [396, 518, "C8"],
               [470, 522, "C4"], [566, 520, "C3"], [598, 508, "C5"]]);
// EL GESTO GRANDE, UNA VEZ EN TODA LA PIEZA: la tarjeta empuja hacia la camara y crece 2,4x.
//
// LA PRIMERA VERSION LA MANDABA A z=-1750, o sea ATRAVESANDO EL OJO, y medida dio 374 de energia
// contra una mediana de 0,001: TRESCIENTOS SETENTA Y CINCO MIL veces el gesto tipico. La gramatica
// medida sobre ocho avisos dice que el gesto grande va de 3x a 25x. Es exactamente el error de la
// PIEZA-H otra vez —tomar el extremo por norma— y ademas aplastaba la escala: con ese pico, `ritmo`
// encontraba DOS cuadros con energia en toda la pieza y las otras compuertas median ruido.
// EL TOPE DEL EMPUJE LO PONE EL CUADRO, NO EL GUSTO. La tarjeta mide 1240x720; a 1,44x son 1781x1034
// y entran justos en un cuadro de 1080 de alto. Cualquier cosa mas grande le corta los cantos de
// arriba y abajo justo cuando el gesto pide que la miren, o sea desperdicia el unico gesto grande.
claves(ejN.z, [[0, 0, "C5"], [566, 0, "C3"], [584, -760, "C1"], [598, -880, "C5"]]);
claves(ejN.x, [[0, 960, "C5"], [566, 960, "C3"], [598, 930, "C5"]]);

// ================================================================ LA TIRA (tiempo F, cuadro 404)
//
// X10 · TIRA / CARRUSEL. EMPEZO SIENDO UNA RUEDA de seis paneles en circulo y la cambie porque una
// medicion no me dejo salvarla: en una rueda los paneles se PISAN entre si en proyeccion —el de
// adelante contra el de dos posiciones mas alla, y el de enfrente contra el de atras— y
// `escena-check` marco cinco pares a 1,00:1. Para arreglarlo hacian falta seis tonos distinguibles de
// a pares que ademas se distinguieran de la cara de la tarjeta: el rango util va de L=0 a L=0,51 y en
// ese rango NO ENTRAN seis escalones de 1,8:1. No era falta de paciencia, no existe la solucion.
//
// Una TIRA no se pisa nunca. Y es la misma tecnica —X10 se llama "tira / carrusel"— leyendose mejor:
// seis escenas en fila que se corren de a una es exactamente lo que dice el rotulo. El 3D de la pieza
// ya lo sostiene la tarjeta, que son seis planos de verdad.
//
// VA ACA, PEGADA A LA TARJETA, y no en su lugar del guion: una capa 2D en el medio de la pila PARTE EL
// GRUPO 3D, asi que todo lo 3D va junto y abajo, y todo lo 2D junto y arriba.
var NR = 6, PASO = 120, ir;
var ejeR = comp.layers.addNull();
ejeR.name = "eje-tira";
ejeR.threeDLayer = true;
// CUELGA DE LA TARJETA. La tira VIVE sobre la tarjeta, asi que su lugar natural es ser hija del mismo
// nulo: se va con ella en el empuje final y no hace falta inventarle una salida. Padre primero,
// posicion despues — al reves AE reinterpreta los valores para conservar la posicion en el mundo.
// z=-20 la deja delante de la cara, que esta en -9.
ejeR.parent = eje;
// AL EMPARENTAR, AE NO SOLO REESCRIBE LA POSICION: TAMBIEN LA ROTACION. La regla conocida es "padre
// primero, posicion despues", y con eso sola no alcanza. AE ajusta los valores del hijo para conservar
// su transformacion EN EL MUNDO, y eso incluye los angulos: el nulo de la tarjeta arranca en ry=-104
// (su valor al cuadro 0, retenido hacia atras), asi que al colgarle la tira AE le escribio +104 para
// compensar. La tira quedo girada 104 grados y de perfil, a 17 px de ancho en vez de 155, y 330
// unidades DETRAS de la tarjeta.
//
// Sin sintoma claro: no hay error, la tira sigue ahi y se mueve. Lo caza `escena-check`, que informa
// 66 cuadros de "se mueve sin verse" — y la causa que uno lee es "algo la tapa", no "esta girada".
// Las caras de la tarjeta no lo sufren porque `cara()` fija rotacionX y rotacionY DESPUES de
// emparentar; era lo unico que las salvaba y no sabia que las estaba salvando de esto.
tr(ejeR).property("ADBE Rotate X").setValue(0);
tr(ejeR).property("ADBE Rotate Y").setValue(0);
tr(ejeR).property("ADBE Rotate Z").setValue(0);
tr(ejeR).property("ADBE Orientation").setValue([0, 0, 0]);
pos(ejeR).setValue([180, 0, -30]);
var ejTi = ejes(ejeR);
// CUATRO CLICS IGUALES, Y NINGUN DESVANECIDO DE ENTRADA.
//
// La version anterior tenia tres clics y un fundido de 12 cuadros al aparecer, y los clics NO CONTABAN
// como gestos. El motivo, medido: un arranque tiene que llegar al 25% del pico DE SU PROPIA CAPA, y el
// fundido daba 7,75e-4 por cuadro contra 2,95e-4 de un clic — 2,6 veces mas. La entrada se comia el
// pico y dejaba a los clics en el 10%. Por eso `ritmo` informaba 56 cuadros de silencio en un tramo
// donde la tira se estaba moviendo en pantalla.
//
// Ahora los cuatro movimientos son del mismo tamaño (176 unidades cada uno) y entra CORTADA Y YA EN
// MOVIMIENTO, que ademas es mejor: un fundido de seis paneles es una plantilla, un corte sobre algo
// que ya se mueve es un corte.
// EL RECORRIDO SE CALCULA PARA QUE NINGUN PANEL PISE EL BORDE. La version anterior sacaba el panel
// izquierdo AFUERA de la tarjeta en el ultimo clic, y en el cuadro 520 que le pedi a AE se ve como un
// error de armado, no como una tira que sigue. Media tarjeta son 620; el extremo de la tira es el
// desplazamiento del eje (180) mas media tira (360) mas medio panel (50) = 590.
claves(ejTi.x, [[404, 180, "C1"], [424, 68, "C8"], [434, 60, "C3"],
                [436, 60, "C1"], [456, -52, "C8"], [466, -60, "C3"],
                [468, -60, "C1"], [488, -172, "C8"], [498, -180, "C5"], [592, -180, "C5"]]);
claves(ejTi.y, [[404, 0, "C5"], [592, 0, "C5"]]);
claves(ejTi.z, [[404, -30, "C5"], [592, -30, "C5"]]);
for (ir = 0; ir < NR; ir++) {
  var claro = ir % 2 === 0 ? RUEDA_A : RUEDA_B;
  var pR = comp.layers.addSolid(claro, "tira-" + ir, 100, 220, 1);
  pR.threeDLayer = true;
  pR.motionBlur = true;
  pR.parent = ejeR;
  // LA MISMA COMPENSACION, UN NIVEL MAS ABAJO. Ponerla en cero en el nulo de la tira no alcanza: cada
  // panel se cuelga de ese nulo y AE le calcula SU propia compensacion contra la orientacion del
  // abuelo. Los seis quedaron de perfil —astillas de 17 px— y el cuadro 470 que le pedi a AE lo mostro
  // sin ninguna ambiguedad. Ninguna compuerta lo dijo con ese nombre.
  tr(pR).property("ADBE Orientation").setValue([0, 0, 0]);
  tr(pR).property("ADBE Rotate X").setValue(0);
  tr(pR).property("ADBE Rotate Y").setValue(0);
  tr(pR).property("ADBE Rotate Z").setValue(0);
  pos(pR).setValue([(ir - 2.5) * PASO, 0, 0]);
  // SE VAN ESCALONADOS Y DESPACIO: 24 cuadros, no 12. La cuenta es la misma de la entrada, al reves.
  // Un fundido de 12 cuadros da 1,29e-3 por cuadro y deja a los clics en el 23% del pico de la capa —
  // justo debajo del 25% que hace falta para contar como arranque. En 24 cuadros da 6,5e-4 y los clics
  // suben al 45%. Doce cuadros de diferencia deciden si los cuatro clics de la tira existen o no.
  claves(op(pR), [[528 + ir * 4, 100, "C3"], [552 + ir * 4, 0, "C5"]]);
  plano(pR, 403, 554 + ir * 4);
}
plano(ejeR, 403, 578);

// ================================================================ A · EL CONTORNO SE DIBUJA
//
// F01 · CRECER DESDE EL BORDE. El trazo se dibuja solo antes de que exista la tarjeta: primero la
// promesa del objeto, despues el objeto.
//
// NO SE HACE CON RECORTE DE TRAZADO, y el motivo lo dijo el exportador y no yo. Un recorte animado
// vive DENTRO del contenido de la capa de forma, y la forma viaja al motor RASTERIZADA: la
// rasterizacion congela el contenido, asi que llegaria un rectangulo entero desde el cuadro 0. El
// exportador lo rechaza por nombre —"el CONTENIDO de la forma esta animado"— en vez de dejarlo pasar
// y dar algo PARECIDO. Cuatro capas mias cayeron ahi.
//
// Lo que si viaja es la TRANSFORMACION. Una barra que crece desde su ancla es escala, y la escala se
// exporta cuadro a cuadro. Ademas se lee mejor: cuatro lados en secuencia dejan ver la punta viajando
// por el rectangulo, que es el gesto que el recorte de un trazado cerrado ni siquiera hace.
function barra(nombre, color, largo, grosor, ax, ay, x, y, c0, c1, vert) {
  var s = comp.layers.addSolid(color, nombre, vert ? grosor : largo, vert ? largo : grosor, 1);
  s.motionBlur = true;
  tr(s).property("ADBE Anchor Point").setValue([ax, ay]);
  pos(s).setValue([x, y]);
  claves(esc(s), [[c0, vert ? [100, 0] : [0, 100], "C2"],
                  [c1, [100, 100], "C1"],
                  [c1 + 6, [100, 100], "C5"]]);
  return s;
}
var CX0 = 960 - TW / 2, CX1 = 960 + TW / 2, CY0 = 520 - TH / 2, CY1 = 520 + TH / 2;
var G = 4;
var lados = [
  barra("contorno-arriba", TINTA, TW, G,      0, G / 2, CX0, CY0,  0,  6, false),
  barra("contorno-derecha", TINTA, TH, G, G / 2,     0, CX1, CY0,  6, 12, true),
  barra("contorno-abajo", TINTA, TW, G,      TW, G / 2, CX1, CY1, 12, 17, false),
  barra("contorno-izquierda", TINTA, TH, G, G / 2,  TH, CX0, CY1, 17, 22, true)
];
var il;
// EL CONTORNO SE CORTA EN EL CUADRO 24, EXACTAMENTE CUANDO ENTRA LA TARJETA. No se desvanece: el trazo
// se cierra y en ese mismo instante se vuelve un objeto solido. Es mejor beat, y ademas arregla un
// defecto que midio `escena-check`: el contorno es TINTA y la tarjeta entra mostrando su DORSO, que
// tambien es tinta — 1,10:1. Cuarenta cuadros de trazo negro dibujandose encima de un rectangulo
// negro. Escrito parecia elegante; medido era invisible.
for (il = 0; il < lados.length; il++) { plano(lados[il], 0, 24); }

// ================================================================ B · SE ESCRIBE EL TITULAR
//
// T05 · MAQUINA DE ESCRIBIR, con el animador nativo. Antes esto eran quince capas.
var titA = rotulo("Tu web ya lo cuenta todo", 88, TINTA, F_DISPLAY, 960, 486, true);
titA.name = "titular-web";
tecleo(titA, 56, 128);
claves(op(titA), [[52, 100, "C5"], [132, 100, "C3"], [140, 0, "C5"]]);
plano(titA, 51, 142);

var bajA = rotulo("Solo que nadie lo mira dos veces", 46, GRIS, F_LECTURA, 960, 616, true);
bajA.name = "bajada-web";
claves(op(bajA), [[92, 0, "C2"], [104, 100, "C5"], [130, 100, "C3"], [138, 0, "C5"]]);
var ejBa = ejes(bajA);
claves(ejBa.y, [[92, 640, "C2"], [106, 616, "C1"], [138, 610, "C5"]]);
claves(ejBa.x, [[92, 960, "C5"], [138, 960, "C5"]]);
plano(bajA, 91, 140);

// F02 · LA BARRA QUE SE LLENA. Mismo motivo que el contorno: sale por ESCALA desde el ancla izquierda,
// no por recorte de trazado. Es el unico naranja del tiempo B — un solo acento por cuadro, que es lo
// que hacen 7 de los 8 avisos medidos.
function subrayado(nombre, x, y, largo, grosor, c0, c1, color) {
  return barra(nombre, color, largo, grosor, 0, grosor / 2, x - largo / 2, y, c0, c1, false);
}
var subA = subrayado("subrayado-web", 960, 530, 560, 7, 112, 130, NARANJA);
claves(op(subA), [[110, 0, "C2"], [116, 100, "C5"], [132, 100, "C3"], [140, 0, "C5"]]);
plano(subA, 109, 142);

// ================================================================ D · EL PANEL, REVELADO POR MASCARA
//
// La mascara es un alfa por pixel en COORDENADAS DE CAPA. Los vertices van en esas coordenadas y las
// TANGENTES SON RELATIVAS AL VERTICE — sumarlas como absolutas dibuja una maraña alrededor del origen
// y no da error.
// La banda es un cuadrilatero que SUBE: `y` es su borde de arriba, en coordenadas de capa (0..PH), y el
// borde de abajo se queda fijo muy por debajo para que el poligono nunca se de vuelta. Arranca en 480
// —entero por debajo de la capa, o sea nada visible— y termina en -40, cubriendola toda. El lado
// derecho adelanta 60 px: la diagonal es lo que hace que se lea como un barrido y no como una persiana.
var PW = 1080, PH = 560;
// EL PANEL VA EN 3D, A z=-30. En 2D quedaba "encima de todo" sin profundidad propia, y `escena-check`
// lo comparaba contra `tar-cara` —la cara CLARA— dando 1,00:1. Pero en esos cuadros la cara mira para
// el otro lado: `ry` vale 180, asi que la cara esta en z=+9 y el dorso oscuro en z=-9, delante. El
// panel blanco cae sobre el dorso y contrasta 15:1. Con z propio la cuenta lo resuelve sola, que es
// mejor que dejarlo anotado como falso positivo y que el proximo lo vuelva a investigar.
var panel = solido("panel-sitio", [0.984, 0.980, 0.973], PW, PH, 960, 540, -40, true);
var mPan = panel.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
var pPan = mPan.property("ADBE Mask Shape");
// REVELA DE ARRIBA HACIA ABAJO, y al reves estaba mal. El titulo del panel cae en su tercio superior,
// asi que barriendo desde abajo ese texto pasa sus primeros treinta cuadros sobre la parte que la
// mascara TODAVIA NO descubrio: tinta sobre la cara oscura de la tarjeta, o sea invisible.
//
// No lo dice ninguna compuerta y no es descuido de ninguna: `colision-check` mira texto contra texto,
// y `escena-check` compara una capa contra lo que tiene DETRAS, no contra el recorte de la capa que
// deberia estar sosteniendola. Lo vi en el cuadro 215 que le pedi a AE.
function bandaMasc(y) {
  var s = new Shape();
  s.vertices = [[-40, -900], [PW + 40, -900], [PW + 40, y], [-40, y - 70]];
  s.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
  s.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
  s.closed = true;
  return s;
}
pPan.setValueAtTime(194 / FPS, bandaMasc(-80));
pPan.setValueAtTime(236 / FPS, bandaMasc(PH + 110));
mPan.property("ADBE Mask Feather").setValue([10, 10]);
// LA OPACIDAD NO SE ANIMA: EL REVELADO ES LA MASCARA. Tenia las dos cosas —un salto de 0 a 100 en dos
// cuadros MAS el barrido de la mascara— y eso es un revelado encima de otro. En pantalla se ve como un
// parpadeo antes del barrido; en la medicion fue el pico mas alto de la pieza despues del gesto grande
// (6,05e-2 contra una mediana de 8e-4) y hundio la dominancia, porque ninguna otra capa puede
// acompañar a algo que aparece de golpe a pantalla casi completa.
op(panel).setValue(100);
claves(op(panel), [[192, 100, "C5"], [278, 100, "C3"], [290, 0, "C5"]]);
plano(panel, 192, 292);

// el canto del panel: una linea de tinta abajo, para que el papel blanco tenga borde y no flote
var cantoP = solido("panel-canto", TINTA, PW, 3, 960, 540 + PH / 2, 0, false);
claves(op(cantoP), [[236, 0, "C2"], [246, 46, "C5"], [278, 46, "C3"], [290, 0, "C5"]]);
plano(cantoP, 235, 292);

// las tres lineas del sitio: lo que el panel muestra. Van en el TERCIO IZQUIERDO del panel para no
// pisar el rotulo, que vive abajo — la regla que colision-check hace cumplir.
var LINEAS = ["Quienes somos", "Lo que hacemos", "Como trabajamos"];
var lf;
for (lf = 0; lf < LINEAS.length; lf++) {
  var yl = 432 + lf * 76;
  var c1l = 214 + lf * 13;
  var lin = rotulo(LINEAS[lf], 50, TINTA, F_LECTURA, 560, yl, false);
  lin.name = "linea-" + lf;
  var ejL = ejes(lin);
  claves(ejL.x, [[c1l, 530, "C2"], [c1l + 14, 560, "C1"], [286, 560, "C5"]]);
  claves(ejL.y, [[c1l, yl, "C5"], [286, yl, "C5"]]);
  claves(op(lin), [[c1l, 0, "C2"], [c1l + 12, 100, "C5"], [268 + lf * 7, 100, "C3"], [280 + lf * 7, 0, "C5"]]);
  plano(lin, c1l - 1, 282 + lf * 7);
}
var subSitio = subrayado("subrayado-sitio", 672, 530, 224, 5, 248, 264, NARANJA);
claves(op(subSitio), [[246, 0, "C2"], [252, 100, "C5"], [276, 100, "C3"], [288, 0, "C5"]]);
plano(subSitio, 245, 290);
var marcaLinea = subrayado("deco-marca-sitio", 630, 348, 140, 5, 196, 210, NARANJA);
vive(marcaLinea, 194, 6, 288, 8);

// ================================================================ E · LA ONDULACION
//
// T09 · ONDULACION TIPOGRAFICA: selector TRIANGULO con ease, y el desplazamiento animado. Cada letra
// sube y baja cuando la ventana le pasa por encima. El desplazamiento va de -100 a 100 y AE lo hace
// cumplir: pedirle 115 corta el script a la mitad.
var titB = rotulo("En treinta segundos", 108, HUESO, F_DISPLAY, 960, 540, true);
titB.name = "titular-treinta";
var anB = animadorDe(titB);
anB.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
propsDe(anB).addProperty("ADBE Text Position 3D").setValue([0, -34, 0]);
avDe(anB).property("ADBE Text Range Shape").setValue(4);
avDe(anB).property("ADBE Text Levels Max Ease").setValue(62);
avDe(anB).property("ADBE Text Levels Min Ease").setValue(62);
avDe(anB).property("ADBE Text Range Units").setValue(1);
selDe(anB).property("ADBE Text Percent Start").setValue(0);
selDe(anB).property("ADBE Text Percent End").setValue(30);
claves(selDe(anB).property("ADBE Text Percent Offset"), [[300, -32, "C5"], [352, 100, "C5"]]);
claves(op(titB), [[296, 0, "C2"], [306, 100, "C5"], [346, 100, "C3"], [356, 0, "C5"]]);
plano(titB, 295, 358);

// LA BARRA DE LOS TREINTA SEGUNDOS. No es adorno: `ritmo` marco 346-404 como el segundo hueco mas
// largo de la pieza, y adentro de ese hueco la unica cosa que se movia era una ONDULACION hecha con un
// animador de texto — que la metrica no puede ver, porque el animador no mueve la caja de la capa.
// El hueco era mitad ceguera del instrumento y mitad silencio real. Esto tapa la mitad real, y ademas
// dice literalmente lo que dice el titular.
var barT = subrayado("barra-treinta", 960, 596, 460, 6, 306, 348, NARANJA);
claves(op(barT), [[304, 0, "C2"], [310, 100, "C5"], [348, 100, "C3"], [356, 0, "C5"]]);
plano(barT, 303, 358);

// ================================================================ F · el rotulo del carrusel
var etiqR = rotulo("Seis escenas, un guion", 48, GRIS, F_ETIQUETA, 960, 1000, true);
etiqR.name = "etiqueta-escenas";
claves(op(etiqR), [[424, 0, "C2"], [436, 100, "C5"], [530, 100, "C3"], [542, 0, "C5"]]);
plano(etiqR, 423, 544);

// ================================================================ G · LA INTERLETRA QUE SE CIERRA
//
// T08. El animador anima la INTERLETRA y la ventana barre la palabra: las letras llegan separadas y se
// juntan. La interletra se reparte entre los HUECOS (N-1), no entre los caracteres.
var titC = rotulo("Cada escena es tuya", 92, TINTA, F_DISPLAY, 960, 792, true);
titC.name = "titular-tuya";
var anC = animadorDe(titC);
anC.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
propsDe(anC).addProperty("ADBE Text Tracking Amount").setValue(34);
propsDe(anC).addProperty("ADBE Text Opacity").setValue(0);
// CUADRADO CON SUAVIDAD 0, no rampa. Una rampa reparte el factor a lo largo de la palabra y deja la
// interletra a medias en todas las letras a la vez; el cuadrado la aplica ENTERA a las que todavia no
// llegaron y CERO a las que ya llegaron. Como la interletra se reparte entre los HUECOS, achicar la
// seleccion achica el ancho total: la palabra se CIERRA sobre si misma mientras se completa.
avDe(anC).property("ADBE Text Range Shape").setValue(1);
avDe(anC).property("ADBE Text Selector Smoothness").setValue(0);
avDe(anC).property("ADBE Text Range Units").setValue(1);
selDe(anC).property("ADBE Text Percent End").setValue(100);
claves(selDe(anC).property("ADBE Text Percent Start"), [[478, 0, "C1"], [540, 100, "C5"]]);
claves(op(titC), [[474, 0, "C2"], [482, 100, "C5"], [548, 100, "C3"], [558, 0, "C5"]]);
plano(titC, 473, 560);

// mismo caso que la barra de arriba: 474-530 era el tercer hueco, y adentro vivia la interletra
// cerrandose, que tampoco mueve la caja de la capa.
var subT = subrayado("subrayado-tuya", 960, 838, 360, 6, 498, 518, NARANJA);
claves(op(subT), [[496, 0, "C2"], [502, 100, "C5"], [540, 100, "C3"], [552, 0, "C5"]]);
plano(subT, 495, 554);

// ================================================================ H · EL GESTO GRANDE
//
// UNA VEZ EN TODA LA PIEZA. El barrido midio que el gesto de 3x a 25x aparece una a tres veces por
// aviso y NUNCA en la entrada de un rotulo: va en la transicion. Aca la tarjeta atraviesa la camara,
// y detras queda el cierre.
var destello = solido("deco-destello", HUESO, 2600, 1500, 960, 540, 0, false);
claves(op(destello), [[574, 0, "C2"], [586, 58, "C7"], [606, 0, "C5"]]);
plano(destello, 573, 608);

// ================================================================ I · EL CIERRE
var marca = rotulo("Urvid", 132, TINTA, F_DISPLAY, 960, 512, true);
marca.name = "marca-urvid";
var ejM = ejes(marca);
claves(ejM.y, [[616, 542, "C2"], [630, 512, "C1"], [720, 508, "C5"]]);
claves(ejM.x, [[616, 960, "C5"], [720, 960, "C5"]]);
claves(op(marca), [[616, 0, "C2"], [628, 100, "C5"], [720, 100, "C5"]]);
plano(marca, 615, 720);

var subFin = subrayado("subrayado-marca", 960, 552, 300, 6, 636, 660, NARANJA);
claves(op(subFin), [[634, 0, "C2"], [642, 100, "C5"], [720, 100, "C5"]]);
plano(subFin, 633, 720);

var url = rotulo("urvid.ia", 56, GRIS, F_ETIQUETA, 960, 636, true);
url.name = "url";
var ejU = ejes(url);
claves(ejU.y, [[660, 660, "C2"], [674, 636, "C1"], [720, 636, "C5"]]);
claves(ejU.x, [[660, 960, "C5"], [720, 960, "C5"]]);
claves(op(url), [[660, 0, "C2"], [672, 100, "C5"], [720, 100, "C5"]]);
plano(url, 659, 720);

// ================================================================ EL GRANO DEL PAPEL
// una trama levisima que unifica: sin ella el hueso plano se lee digital
var grano = solido("grano-papel", TINTA, 1920, 1080, 960, 540, 0, false);
op(grano).setValue(5);
plano(grano, 0, CUADROS);

comp.time = 0;
anotar("PIEZA|" + NOMBRE + "|" + ANCHO + "x" + ALTO + "|" + FPS + "fps|" + CUADROS + " cuadros");
anotar("CAPAS|" + comp.numLayers);
anotar("TECNICAS|T05 T08 T09 F01 F02 F13 X13 X10 E05");
app.endUndoGroup();
anotar("--- fin ---");

} catch (elFallo) {
  anotar("FALLO|" + texto(elFallo && elFallo.message ? elFallo.message : elFallo) +
         "|linea " + texto(elFallo && elFallo.line ? elFallo.line : "?"));
  anotar("--- fin ---");
}
if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
